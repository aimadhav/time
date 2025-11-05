import { useWallet } from '@/context/WalletContext';
import { CONFIG, server } from '@/lib/stellar';
import { useCallback, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

export interface TransactionResult {
  hash: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  returnValue?: any;
  error?: string;
}

export const useTransaction = () => {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signAndSend = useCallback(
    async (
      operation: (contract: StellarSdk.Contract) => any,
      waitForConfirmation = true
    ): Promise<TransactionResult | null> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        const account = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        // Build transaction
        let tx = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: CONFIG.networkPassphrase,
        })
          .addOperation(operation(contract))
          .setTimeout(30)
          .build();

        // Prepare transaction
        tx = await server.prepareTransaction(tx);
        const xdr = tx.toXDR();

        // Sign with Freighter
        const signResult = await window.freighterApi.signTransaction(xdr, {
          networkPassphrase: CONFIG.networkPassphrase,
        });

        if (signResult.error) {
          throw new Error(signResult.error);
        }

        // Submit transaction
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);

        if (!waitForConfirmation) {
          return {
            hash: result.hash,
            status: result.status as 'PENDING' | 'SUCCESS' | 'FAILED',
          };
        }

        // Poll for confirmation
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const response = await server.getTransaction(result.hash);

          if (response.status === 'SUCCESS') {
            return {
              hash: result.hash,
              status: 'SUCCESS',
              returnValue: response.returnValue,
            };
          } else if (response.status === 'FAILED') {
            throw new Error('Transaction failed on blockchain');
          }

          attempts++;
        }

        throw new Error('Transaction confirmation timeout');
      } catch (err: any) {
        const message = err.message || 'Transaction failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey]
  );

  return { signAndSend, isLoading, error };
};

// Simulate contract call (read-only)
export const useContractRead = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (operation: (contract: StellarSdk.Contract) => any): Promise<any> => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        // Use a dummy account for simulation
        const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

        const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: CONFIG.networkPassphrase,
        })
          .addOperation(operation(contract))
          .setTimeout(30)
          .build();

        const prepared = await server.prepareTransaction(tx);
        const result = await server.simulateTransaction(prepared);

        if (result.result?.retval) {
          return StellarSdk.scValToNative(result.result.retval);
        }

        return null;
      } catch (err: any) {
        const message = err.message || 'Contract call failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { call, isLoading, error };
};
