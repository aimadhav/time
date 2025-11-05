import * as StellarSdk from '@stellar/stellar-sdk';
import * as freighterApi from '@stellar/freighter-api';

// Freighter API types
interface SignTransactionResult {
  signedTxXdr: string;
  signerAddress?: string;
  error?: string | { message?: string };
}

declare global {
  interface Window {
    freighterApi?: {
      requestAccess: () => Promise<{ address: string; error?: { message?: string } }>;
      getAddress: () => Promise<{ address: string; error?: { message?: string } }>;
      signTransaction: (xdr: string, options?: { networkPassphrase?: string; address?: string }) => Promise<SignTransactionResult & { signerAddress?: string }>;
      isConnected?: () => Promise<{ isConnected: boolean; error?: { message?: string } }>;
    };
  }
}

const freighterModule = (freighterApi as any)?.default ?? freighterApi;

const getFreighterApi = () => {
  if (typeof window !== 'undefined' && window.freighterApi) {
    return window.freighterApi;
  }
  return freighterModule;
};

const formatFreighterError = (error: unknown): string => {
  if (!error) {
    return 'Unknown Freighter error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const unwrapValue = <T>(value: T | (() => T)): T => {
  if (typeof value === 'function') {
    try {
      const result = (value as () => T)();
      return unwrapValue(result);
    } catch (error) {
      console.warn('Failed to unwrap Soroban value via function call:', error);
      return value as T;
    }
  }
  return value as T;
};

const toCodeName = (code: any): string => {
  const unwrapped = unwrapValue(code);
  if (!unwrapped) {
    return 'unknown';
  }
  if (typeof unwrapped === 'object' && 'name' in unwrapped && typeof unwrapped.name === 'string') {
    return unwrapped.name;
  }
  if (typeof unwrapped === 'string') {
    return unwrapped;
  }
  if (typeof unwrapped === 'number') {
    return unwrapped.toString();
  }
  return String(unwrapped);
};

const decodeTransactionResultXdr = (resultXdr: string | undefined): string | null => {
  if (!resultXdr) {
    return null;
  }
  try {
    const txResult = StellarSdk.xdr.TransactionResult.fromXDR(resultXdr, 'base64');
    const resultAny = (txResult as any).result?.() ?? (txResult as any).result;
    const codeName = toCodeName(resultAny?.code?.() ?? resultAny?.code);
    const opResults = resultAny?.results?.() ?? resultAny?.results;
    if (Array.isArray(opResults) && opResults.length > 0) {
      const invokeResult = opResults[0]?.tr?.()?.invokeHostFunctionResult?.()?.code?.() ??
        opResults[0]?.tr?.().invokeHostFunctionResult?.().code?.() ??
        opResults[0]?.tr?.().invokeHostFunctionResult?.().code;
      if (invokeResult) {
        const invokeName = toCodeName(invokeResult);
        return `${codeName}; hostFn=${invokeName}`;
      }
    }
    return codeName;
  } catch (error) {
    console.warn('Failed to decode transaction result XDR:', error);
    return null;
  }
};

const describeSorobanFailure = (source: { status?: string; errorResult?: any; resultXdr?: string }): string => {
  const messages: string[] = [];
  if (source.status) {
    messages.push(`status=${source.status}`);
  }

  const attachXdrDetails = (resultXdr?: string) => {
    const decoded = decodeTransactionResultXdr(resultXdr);
    if (decoded) {
      messages.push(decoded);
    } else if (resultXdr) {
      messages.push(`resultXdr=${resultXdr}`);
    }
  };

  const error = unwrapValue(source.errorResult);
  if (error) {
    if (typeof error === 'string') {
      messages.push(error);
    } else if (typeof error === 'object') {
      const maybeMessage = unwrapValue((error as any).message ?? (error as any).error ?? (error as any).code);
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        messages.push(maybeMessage);
      }

      const possibleResultXdr = unwrapValue((error as any).resultXdr ?? (error as any).result_xdr);
      if (typeof possibleResultXdr === 'string') {
        attachXdrDetails(possibleResultXdr);
      }

      const diagnosticEvents = unwrapValue((error as any).diagnosticEvents ?? (error as any).diagnostic_events);
      if (Array.isArray(diagnosticEvents) && diagnosticEvents.length > 0) {
        const renderedEvents = diagnosticEvents
          .map((event, index) => {
            const unwrappedEvent = unwrapValue(event);
            if (typeof unwrappedEvent === 'string') {
              return `${index}: ${unwrappedEvent}`;
            }
            try {
              return `${index}: ${JSON.stringify(unwrappedEvent)}`;
            } catch (jsonError) {
              console.warn('Failed to stringify diagnostic event:', jsonError);
              return `${index}: ${String(unwrappedEvent)}`;
            }
          })
          .join(', ');
        messages.push(`diagnosticEvents=[${renderedEvents}]`);
      }

      const nestedError = unwrapValue((error as any).error);
      if (nestedError && nestedError !== error) {
        const nestedDescription = describeSorobanFailure({ errorResult: nestedError });
        if (nestedDescription && nestedDescription !== 'Unknown Soroban error') {
          messages.push(`inner=${nestedDescription}`);
        }
      }

      const innerResult = unwrapValue((error as any).result ?? (error as any).innerResult);
      if (innerResult && innerResult !== error) {
        const resultDescription = describeSorobanFailure({ errorResult: innerResult });
        if (resultDescription && resultDescription !== 'Unknown Soroban error') {
          messages.push(`result=${resultDescription}`);
        }
      }

      try {
        const fallback = String(error);
        if (fallback && fallback !== '[object Object]' && !messages.includes(fallback)) {
          messages.push(fallback);
        }
      } catch (stringError) {
        console.warn('Failed to stringify Soroban error object:', stringError);
      }
    }
  }

  attachXdrDetails(source.resultXdr);

  if (messages.length === 0) {
    return 'Unknown Soroban error';
  }

  return messages.join(' | ');
};

const waitForSorobanConfirmation = async (
  hash: string,
  maxAttempts = 30,
  delayMs = 1000
) => {
  let attempts = 0;
  let response: any = { status: 'NOT_FOUND' };

  while (attempts < maxAttempts) {
    try {
      response = await server.getTransaction(hash);
      if (response.status !== 'NOT_FOUND') {
        return response;
      }
    } catch (error) {
      console.warn('Soroban confirmation check failed:', error);
    }

    attempts++;
    await delay(delayMs);
  }

  try {
    response = await server.getTransaction(hash);
  } catch (error) {
    console.warn('Final Soroban confirmation check failed:', error);
  }

  return response;
};

const extractReturnValueFromMeta = (metaXdr?: string | null): unknown => {
  if (!metaXdr) {
    return null;
  }

  try {
    const meta = StellarSdk.xdr.TransactionMeta.fromXDR(metaXdr, 'base64');
    const metaAny = meta as any;
    const switchName = metaAny.switch?.()?.name ?? metaAny.switch?.name;
    if (switchName === 'txMetaV3') {
      const v3 = metaAny.v3?.() ?? metaAny.v3;
      const sorobanMeta = v3?.sorobanMeta?.() ?? v3?.sorobanMeta;
      const returnValue = sorobanMeta?.returnValue?.() ?? sorobanMeta?.returnValue;
      if (returnValue) {
        return StellarSdk.scValToNative(returnValue);
      }
    }
  } catch (error) {
    console.warn('Failed to extract return value from transaction meta:', error);
  }

  return null;
};

const coerceToNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const describeSorobanSimulation = (simulation: any): string => {
  if (!simulation) {
    return 'Unknown simulation error';
  }

  const messages: string[] = [];
  const error = unwrapValue(simulation.error);
  if (error) {
    if (typeof error === 'string') {
      messages.push(error);
    } else if (typeof error === 'object') {
      const maybeMessage = unwrapValue((error as any).message ?? (error as any).code);
      if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
        messages.push(maybeMessage);
      }
    }
  }

  const events = unwrapValue(simulation.events);
  if (Array.isArray(events) && events.length > 0) {
    const rendered = events
      .map((event, index) => {
        const unwrappedEvent = unwrapValue(event);
        if (typeof unwrappedEvent === 'string') {
          return `${index}: ${unwrappedEvent}`;
        }
        try {
          return `${index}: ${JSON.stringify(unwrappedEvent)}`;
        } catch (error) {
          return `${index}: ${String(unwrappedEvent)}`;
        }
      })
      .join(', ');
    messages.push(`events=[${rendered}]`);
  }

  const resultXdr = unwrapValue(simulation.result?.resultXdr ?? simulation.result?.result_xdr);
  if (typeof resultXdr === 'string') {
    const decoded = decodeTransactionResultXdr(resultXdr);
    if (decoded) {
      messages.push(decoded);
    } else {
      messages.push(`resultXdr=${resultXdr}`);
    }
  }

  const auth = unwrapValue(simulation.result?.auth);
  if (Array.isArray(auth) && auth.length > 0) {
    const rendered = auth
      .map((item, index) => {
        const unwrapped = unwrapValue(item);
        try {
          return `${index}: ${JSON.stringify(unwrapped)}`;
        } catch (error) {
          return `${index}: ${String(unwrapped)}`;
        }
      })
      .join(', ');
    messages.push(`auth=[${rendered}]`);
  }

  if (messages.length === 0) {
    try {
      return JSON.stringify(simulation);
    } catch (error) {
      console.warn('Failed to stringify simulation payload:', error);
      return 'Simulation failed with unknown error';
    }
  }

  return messages.join(' | ');
};

export const CONFIG = {
  contractId: 'CASAHQ6RD2FBISDFVONK52OQJ62GZPVFPENSWJENS735GBELKBKOZE4L',
  xlmTokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  networkPassphrase: StellarSdk.Networks.TESTNET,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  apiUrl: 'http://localhost:3001/api',
};

const rpc = (StellarSdk as any).rpc;

if (!rpc?.Server) {
  console.error('❌ Stellar SDK RPC module unavailable');
  throw new Error('Stellar SDK RPC module unavailable');
}

export const server = new rpc.Server(CONFIG.rpcUrl);

const HorizonServerCtor = (StellarSdk as any).Server;

let horizonServerInstance: any = null;

if (HorizonServerCtor) {
  try {
    horizonServerInstance = new HorizonServerCtor(CONFIG.horizonUrl);
  } catch (error) {
    console.warn('⚠️ Failed to initialize Horizon server from SDK, falling back to direct fetch:', error);
    horizonServerInstance = null;
  }
} else {
  console.warn('⚠️ Horizon Server constructor unavailable on this Stellar SDK build; using fetch fallback');
}

export const horizonServer = horizonServerInstance;

const STROOPS_PER_XLM = 10000000n;

const loadHorizonAccount = async (publicKey: string) => {
  if (horizonServerInstance?.loadAccount) {
    return horizonServerInstance.loadAccount(publicKey);
  }

  const response = await fetch(`${CONFIG.horizonUrl}/accounts/${publicKey}`);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Failed to load Horizon account (${response.status}): ${message || response.statusText}`);
  }

  const data = await response.json();
  if (!data?.sequence) {
    throw new Error('Horizon account response missing sequence field');
  }

  return new StellarSdk.Account(publicKey, data.sequence as string);
};

const submitHorizonTransaction = async (envelopeXdr: string) => {
  if (horizonServerInstance?.submitTransaction) {
    return horizonServerInstance.submitTransaction(envelopeXdr);
  }

  const response = await fetch(`${CONFIG.horizonUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: `tx=${encodeURIComponent(envelopeXdr)}`,
  });

  const text = await response.text().catch(() => '');

  if (!response.ok) {
    try {
      const parsed = JSON.parse(text);
      const codes = parsed?.extras?.result_codes;
      const detail = codes?.operations?.join(', ') ?? codes?.transaction ?? parsed?.detail ?? parsed?.title;
      throw new Error(detail || 'Failed to submit transaction to Horizon');
    } catch (jsonError) {
      throw new Error(text || 'Failed to submit transaction to Horizon');
    }
  }

  try {
    return JSON.parse(text);
  } catch (jsonError) {
    return { raw: text };
  }
};

// Get account balance
export async function getAccountBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.getAccount(publicKey);
    // For Soroban, we'll return the sequence number as a placeholder
    // In a production app, you'd want to implement proper balance checking
    return account.sequenceNumber().toString();
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    throw new Error('Failed to fetch account balance');
  }
}

// Disconnect wallet
export function disconnectWallet(): void {
  try {
    // Clear the session storage
    sessionStorage.removeItem('walletAddress');
    console.log('✅ Wallet disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting wallet:', error);
    throw new Error('Failed to disconnect wallet');
  }
}

const formatStroopsToAmount = (stroops: bigint): string => {
  const isNegative = stroops < 0n;
  const absolute = isNegative ? -stroops : stroops;
  const integerPart = absolute / STROOPS_PER_XLM;
  const fractionalPart = absolute % STROOPS_PER_XLM;
  const fractionalStr = fractionalPart.toString().padStart(7, '0');
  const amount = `${integerPart.toString()}.${fractionalStr}`;
  return isNegative ? `-${amount}` : amount;
};

async function sendNativePayment(
  payerAddress: string,
  destinationAddress: string,
  amountInStroops: bigint
): Promise<void> {
  if (amountInStroops <= 0n) {
    console.log('ℹ️ Payment amount is zero or negative, skipping native transfer');
    return;
  }

  const freighter = getFreighterApi();
  if (!freighter?.signTransaction) {
    throw new Error('Freighter wallet not available for payment signing');
  }

  const account = await loadHorizonAccount(payerAddress);

  const paymentTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationAddress,
        asset: StellarSdk.Asset.native(),
        amount: formatStroopsToAmount(amountInStroops),
      })
    )
    .setTimeout(180)
    .build();

  const signedPayment = await freighter.signTransaction(paymentTx.toXDR(), {
    networkPassphrase: CONFIG.networkPassphrase,
    address: payerAddress,
  });

  if (signedPayment.error) {
    throw new Error(formatFreighterError(signedPayment.error));
  }

  const paymentEnvelope = StellarSdk.TransactionBuilder.fromXDR(
    signedPayment.signedTxXdr,
    CONFIG.networkPassphrase
  );

  const submission = await submitHorizonTransaction(paymentEnvelope.toXDR());
  const paymentHash = (submission as any)?.hash ?? 'unknown';
  console.log('💸 Native payment submitted:', {
    hash: paymentHash,
    amount: formatStroopsToAmount(amountInStroops),
    from: payerAddress,
    to: destinationAddress,
  });
}

export interface TimeToken {
  seller: string;
  hourly_rate: string;
  hours_available: number;
  description: string;
}

// Connect to Freighter wallet
export async function connectWallet(): Promise<string | null> {
  try {
    const freighter = getFreighterApi();
    if (!freighter?.requestAccess || !freighter?.getAddress) {
      throw new Error('Please install Freighter wallet extension');
    }

    const accessResult = await freighter.requestAccess();
    if (accessResult?.error) {
      throw new Error(accessResult.error.message || 'Failed to request access from Freighter');
    }

    const addressResult = await freighter.getAddress();
    if (addressResult?.error || !addressResult?.address) {
      throw new Error(addressResult?.error?.message || 'Failed to retrieve Freighter address');
    }
    
    console.log('✅ Wallet connected:', addressResult.address);
    return addressResult.address;
  } catch (error: any) {
    console.error('❌ Failed to connect wallet:', error);
    throw error;
  }
}

// Check if Freighter is installed
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const freighter = getFreighterApi();
    if (!freighter?.isConnected) {
      return typeof window !== 'undefined' && !!window.freighterApi;
    }
    const result = await freighter.isConnected();
    return !!result && !result.error && !!result.isConnected;
  } catch (error) {
    console.error('Failed to check Freighter installation:', error);
    return false;
  }
}

// Verify contract is deployed
export async function verifyContractDeployed(): Promise<boolean> {
  try {
    const count = await getTokenCount();
    console.log('✅ Contract verified, token count:', count);
    return true;
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    return false;
  }
}

// Mint a new time token
export async function mintTimeToken(
  seller: string,
  hourlyRate: number,
  hoursAvailable: number,
  description: string
): Promise<number | null> {
  try {
    const account = await server.getAccount(seller);
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
    const hourlyRateStroops = Math.round(parseFloat(String(hourlyRate)) * 10000000);
    
    // Convert parameters to ScVal
    const params = [
      new StellarSdk.Address(seller).toScVal(),
      StellarSdk.nativeToScVal(hourlyRateStroops, { type: 'i128' }),
      StellarSdk.nativeToScVal(parseInt(String(hoursAvailable)), { type: 'u32' }),
      StellarSdk.nativeToScVal(description, { type: 'string' })
    ];
    
    // Build transaction
    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase
    })
    .addOperation(contract.call('mint_time_token', ...params))
    .setTimeout(30)
    .build();

    console.log('📝 Transaction built, preparing...');
    
    // Prepare transaction (simulate) - cast to Transaction type
    const preparedTransaction = await server.prepareTransaction(transaction as any);
    console.log('✅ Transaction prepared successfully');

    console.log('🧪 Simulating mint transaction...');
    const simulation = await server.simulateTransaction(preparedTransaction);
    console.log('Simulation result:', simulation);

    if ('error' in simulation && simulation.error) {
      const reason = describeSorobanSimulation(simulation);
      throw new Error(`Mint simulation failed: ${reason}`);
    }

    const preparedXDR = preparedTransaction.toXDR();
    
    // Sign with Freighter
    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(preparedXDR, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: seller,
    });
    
    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    // Submit transaction
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
    const result = await server.sendTransaction(signedTx);
    console.log('Transaction result:', result);

    if (result.status === 'ERROR') {
      const reason = describeSorobanFailure({
        status: result.status,
        errorResult: result.errorResult,
        resultXdr: unwrapValue((result as any).resultXdr ?? (result as any).result_xdr),
      });
      throw new Error(`Mint transaction failed: ${reason}`);
    }

    if (!result.hash) {
      throw new Error('Mint transaction did not return a hash');
    }

    const confirmation = await waitForSorobanConfirmation(result.hash);

    if (confirmation.status === 'SUCCESS') {
      const rawTokenId = extractReturnValueFromMeta(confirmation.resultMetaXdr);
      const tokenId = coerceToNumber(rawTokenId);
      if (tokenId !== null) {
        return tokenId;
      }
      console.warn('Mint succeeded but token id missing in return value, falling back to subsequent refresh');
      return 1;
    }

    if (confirmation.status === 'FAILED') {
      const reason = describeSorobanFailure({
        status: confirmation.status,
        resultXdr: unwrapValue((confirmation as any).resultXdr ?? (confirmation as any).result_xdr),
      });
      throw new Error(`Mint transaction failed: ${reason}`);
    }

    throw new Error(`Mint transaction not confirmed (status: ${confirmation.status})`);
  } catch (error: any) {
    console.error('❌ Failed to mint token:', error);
    throw error;
  }
}

// Get token details
export async function getToken(tokenId: number): Promise<TimeToken | null> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    const account = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_token',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(preparedTx);
    
    if ('result' in result && result.result) {
      const returnValue = result.result.retval;
      const token = StellarSdk.scValToNative(returnValue);
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

// Get total token count
export async function getTokenCount(): Promise<number> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    const account = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call('get_token_count'))
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(preparedTx);
    
    if ('result' in result && result.result) {
      const returnValue = result.result.retval;
      return StellarSdk.scValToNative(returnValue);
    }
    
    return 0;
  } catch (error) {
    console.error('Failed to get token count:', error);
    return 0;
  }
}

// Purchase time token
export async function purchaseToken(
  buyerAddress: string,
  tokenId: number,
  hours: number,
  sellerAddress: string,
  hourlyRateStroops: string
): Promise<boolean> {
  try {
    const normalizedHours = parseInt(String(hours), 10);
    if (Number.isNaN(normalizedHours) || normalizedHours <= 0) {
      throw new Error('Hours must be a positive integer');
    }

    const hourlyRate = BigInt(hourlyRateStroops);
    if (hourlyRate < 0n) {
      throw new Error('Hourly rate cannot be negative');
    }

    const totalPriceStroops = hourlyRate * BigInt(normalizedHours);
    console.log('🧮 Calculated purchase price:', {
      hourlyRate: formatStroopsToAmount(hourlyRate),
      hours: normalizedHours,
      total: formatStroopsToAmount(totalPriceStroops),
    });

    const account = await server.getAccount(buyerAddress);
    const contract = new StellarSdk.Contract(CONFIG.contractId);

    const params = [
      StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
      new StellarSdk.Address(buyerAddress).toScVal(),
      StellarSdk.nativeToScVal(normalizedHours, { type: 'u32' }),
      new StellarSdk.Address(CONFIG.xlmTokenId).toScVal(),
    ];
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call('purchase_token', ...params))
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);

    console.log('📝 Simulating purchase transaction...');
    const simulation = await server.simulateTransaction(preparedTx);
    console.log('✅ Simulation result:', simulation);

    const xdr = preparedTx.toXDR();

    console.log('🔏 Requesting signature from Freighter...');
    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: buyerAddress,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      CONFIG.networkPassphrase
    );

    console.log('📤 Sending transaction to Soroban network...');
    const result = await server.sendTransaction(signedTx);
    console.log('✅ Contract transaction submitted:', result.hash);

    const settleNativePayment = async () => {
      try {
        await sendNativePayment(buyerAddress, sellerAddress, totalPriceStroops);
      } catch (paymentError: any) {
        console.error('❌ Native payment failed after contract success:', paymentError);
        const message = paymentError?.message || 'Native payment failed after contract execution';
        throw new Error(message);
      }
    };

    if (result.status === 'PENDING') {
      console.log('⏳ Waiting for contract transaction confirmation...');
      let response = await server.getTransaction(result.hash);
      let attempts = 0;
      const maxAttempts = 30;

      while (response.status === 'NOT_FOUND' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await server.getTransaction(result.hash);
        attempts++;
      }

      if (response.status === 'SUCCESS') {
        console.log('✅ Contract execution confirmed');
        console.log('🔗 View on Stellar Expert:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
        await settleNativePayment();
        return true;
      }

      if (response.status === 'FAILED') {
        console.error('❌ Purchase contract execution failed:', response);
        throw new Error('Purchase transaction failed');
      }

      console.warn('⚠️ Contract transaction did not settle within timeout window');
      return false;
    }

    if (result.status === 'SUCCESS') {
      console.log('✅ Contract execution succeeded immediately');
      await settleNativePayment();
      return true;
    }

    console.error('❌ Unexpected contract transaction status:', result.status);
    return false;
  } catch (error: any) {
    console.error('❌ Failed to purchase token:', error);
    if (error.message?.includes('User declined')) {
      throw new Error('Transaction was cancelled');
    }
    throw new Error(error.message || 'Failed to purchase token. Please try again.');
  }
}

// Get seller tokens
export async function getSellerTokens(seller: string): Promise<number[]> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    const account = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_seller_tokens',
          StellarSdk.Address.fromString(seller).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(preparedTx);
    
    if ('result' in result && result.result) {
      const returnValue = result.result.retval;
      return StellarSdk.scValToNative(returnValue) || [];
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get seller tokens:', error);
    return [];
  }
}

// Update token availability
export async function updateTokenAvailability(
  seller: string,
  tokenId: number,
  newHours: number
): Promise<boolean> {
  try {
    const account = await server.getAccount(seller);
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'update_availability',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
          StellarSdk.Address.fromString(seller).toScVal(),
          StellarSdk.nativeToScVal(newHours, { type: 'u32' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const xdr = preparedTx.toXDR();
    
    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: seller,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      CONFIG.networkPassphrase
    );

    const result = await server.sendTransaction(signedTx);
    
    if (result.status === 'PENDING') {
      let response = await server.getTransaction(result.hash);
      let attempts = 0;
      while (response.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await server.getTransaction(result.hash);
        attempts++;
      }
      
      return response.status === 'SUCCESS';
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Failed to update availability:', error);
    throw new Error(error.message || 'Failed to update token availability');
  }
}

// Delete token
export async function deleteToken(
  seller: string,
  tokenId: number
): Promise<boolean> {
  try {
    const account = await server.getAccount(seller);
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'delete_token',
          StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
          StellarSdk.Address.fromString(seller).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const xdr = preparedTx.toXDR();
    
    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: seller,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signResult.signedTxXdr,
      CONFIG.networkPassphrase
    );

    const result = await server.sendTransaction(signedTx);
    
    if (result.status === 'PENDING') {
      let response = await server.getTransaction(result.hash);
      let attempts = 0;
      while (response.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        response = await server.getTransaction(result.hash);
        attempts++;
      }
      
      return response.status === 'SUCCESS';
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Failed to delete token:', error);
    throw new Error(error.message || 'Failed to delete token');
  }
}

// ==================== SECONDARY MARKETPLACE FUNCTIONS ====================

// Get receipt details
export async function getReceipt(receiptId: number): Promise<any> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call('get_receipt', StellarSdk.nativeToScVal(receiptId, { type: 'u64' }))
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(prepared);

    if ('result' in result && result.result?.retval) {
      return StellarSdk.scValToNative(result.result.retval);
    }
    return null;
  } catch (error) {
    console.error('Error getting receipt:', error);
    return null;
  }
}

// Get user's receipts
export async function getMyReceipts(buyer: string): Promise<number[]> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call('get_owner_receipts', StellarSdk.Address.fromString(buyer).toScVal())
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(prepared);

    if ('result' in result && result.result?.retval) {
      return StellarSdk.scValToNative(result.result.retval) || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting my receipts:', error);
    return [];
  }
}

// Get total receipt count
export async function getReceiptCount(): Promise<number> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call('get_receipt_count'))
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(prepared);

    if ('result' in result && result.result?.retval) {
      return StellarSdk.scValToNative(result.result.retval);
    }
    return 0;
  } catch (error) {
    console.error('Error getting receipt count:', error);
    return 0;
  }
}

// Get listing details
export async function getListing(receiptId: number): Promise<any> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId);
    const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call('get_listing', StellarSdk.nativeToScVal(receiptId, { type: 'u64' }))
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const result = await server.simulateTransaction(prepared);

    if ('result' in result && result.result?.retval) {
      return StellarSdk.scValToNative(result.result.retval);
    }
    return null;
  } catch (error) {
    console.error('Error getting listing:', error);
    return null;
  }
}

// List receipt for sale on secondary market
export async function listReceipt(seller: string, receiptId: number, price: number): Promise<boolean> {
  try {
    const account = await server.getAccount(seller);
    const contract = new StellarSdk.Contract(CONFIG.contractId);

    // Create i128 ScVal for price
    const priceAmount = BigInt(price);
    const i128Value = new StellarSdk.xdr.Int128Parts({
      lo: StellarSdk.xdr.Uint64.fromString((priceAmount & BigInt('0xFFFFFFFFFFFFFFFF')).toString()),
      hi: StellarSdk.xdr.Int64.fromString((priceAmount >> BigInt(64)).toString()),
    });

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'list_on_secondary',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(seller).toScVal(),
          StellarSdk.xdr.ScVal.scvI128(i128Value)
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const xdr = prepared.toXDR();

    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: seller,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
    const result = await server.sendTransaction(signedTx);

    if (result.status === 'ERROR') {
      const reason = describeSorobanFailure({
        status: result.status,
        errorResult: result.errorResult,
        resultXdr: unwrapValue((result as any).resultXdr ?? (result as any).result_xdr),
      });
      throw new Error(`Listing failed: ${reason}`);
    }

    if (!result.hash) {
      throw new Error('Listing transaction did not return a hash');
    }

    const confirmation = await waitForSorobanConfirmation(result.hash);

    if (confirmation.status === 'SUCCESS') {
      return true;
    }

    if (confirmation.status === 'FAILED') {
      const reason = describeSorobanFailure({
        status: confirmation.status,
        resultXdr: unwrapValue((confirmation as any).resultXdr ?? (confirmation as any).result_xdr),
      });
      throw new Error(`Listing failed: ${reason}`);
    }

    throw new Error(`Listing not confirmed (status: ${confirmation.status})`);
  } catch (error: any) {
    console.error('Error listing receipt:', error);
    throw new Error(error.message || 'Failed to list receipt');
  }
}

// Buy from secondary market
export async function buyFromSecondary(
  buyerAddress: string,
  receiptId: number,
  sellerAddress: string,
  priceStroops: string
): Promise<boolean> {
  try {
    const listingPrice = BigInt(priceStroops);
    if (listingPrice < 0n) {
      throw new Error('Listing price cannot be negative');
    }

    const account = await server.getAccount(buyerAddress);
    const contract = new StellarSdk.Contract(CONFIG.contractId);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: (200000).toString(),
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'buy_from_secondary',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(buyerAddress).toScVal(),
          StellarSdk.Address.fromString(CONFIG.xlmTokenId).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const xdr = prepared.toXDR();

    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
  address: buyerAddress,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
    const result = await server.sendTransaction(signedTx);

    if (result.status === 'PENDING') {
      let response = await server.getTransaction(result.hash);
      let attempts = 0;
      while (response.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = await server.getTransaction(result.hash);
        attempts++;
      }
      if (response.status === 'SUCCESS') {
        await sendNativePayment(buyerAddress, sellerAddress, listingPrice);
        return true;
      }
      return false;
    }

    if (result.status === 'SUCCESS') {
      await sendNativePayment(buyerAddress, sellerAddress, listingPrice);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('Error buying from secondary:', error);
    throw new Error(error.message || 'Failed to purchase from secondary market');
  }
}

// Redeem receipt (burn token)
export async function redeemReceipt(owner: string, receiptId: number): Promise<boolean> {
  try {
    const account = await server.getAccount(owner);
    const contract = new StellarSdk.Contract(CONFIG.contractId);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'redeem_receipt',
          StellarSdk.nativeToScVal(receiptId, { type: 'u64' }),
          StellarSdk.Address.fromString(owner).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const xdr = prepared.toXDR();

    const freighter = getFreighterApi();
    if (!freighter?.signTransaction) {
      throw new Error('Freighter wallet not available for signing');
    }

    const signResult = await freighter.signTransaction(xdr, {
      networkPassphrase: CONFIG.networkPassphrase,
      address: owner,
    });

    if (signResult.error) {
      throw new Error(formatFreighterError(signResult.error));
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
    const result = await server.sendTransaction(signedTx);

    if (result.status === 'PENDING') {
      let response = await server.getTransaction(result.hash);
      let attempts = 0;
      while (response.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = await server.getTransaction(result.hash);
        attempts++;
      }
      return response.status === 'SUCCESS';
    }

    return false;
  } catch (error: any) {
    console.error('Error redeeming receipt:', error);
    throw new Error(error.message || 'Failed to redeem receipt');
  }
}

// ==================== PROFILE & API FUNCTIONS ====================

export interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  social_links: {
    twitter?: string;
    github?: string;
  };
}

export interface MarketplaceToken {
  token_id: number;
  seller_address: string;
  hourly_rate: number;
  hours_available: number;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  view_count?: number;
}

// Get user profile from API
export async function getUserProfile(publicKey: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/profiles/${publicKey}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Save user profile to API
export async function saveUserProfile(publicKey: string, profile: UserProfile): Promise<UserProfile> {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/profiles/${publicKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error('Failed to save profile');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error saving profile:', error);
    throw new Error(error.message || 'Failed to save profile');
  }
}

// Get all tokens from API with optional filters
export async function getMarketplaceTokens(filters?: {
  search?: string;
  category?: string;
  sort?: string;
  min_price?: number;
  max_price?: number;
}): Promise<MarketplaceToken[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.min_price) params.append('min_price', filters.min_price.toString());
    if (filters?.max_price) params.append('max_price', filters.max_price.toString());

    const response = await fetch(`${CONFIG.apiUrl}/tokens?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching marketplace tokens:', error);
    return [];
  }
}
