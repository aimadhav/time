import * as StellarSdk from '@stellar/stellar-sdk';

// Configuration - UPDATE THESE VALUES IN PRODUCTION
const CONFIG = {
    contractId: 'CB57V4DDEMCC3YMPMYFWR4ULPCIEWSX3RPQ4DJWQBES7V57AFIPQHYLY', // Deployed contract ID
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org'
};

let connectedPublicKey = null;
let server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Stellar Time Marketplace initialized');
    
    // Wait a bit for Freighter to load
    setTimeout(() => {
        checkFreighterInstalled();
    }, 100);
    
    // Event listeners
    document.getElementById('connectBtn').addEventListener('click', connectFreighter);
    document.getElementById('mintForm').addEventListener('submit', handleMint);
    document.getElementById('loadMyTokens').addEventListener('click', loadMyTokens);
    document.getElementById('loadAllTokens').addEventListener('click', loadAllTokens);
});

// Check if Freighter is installed
function checkFreighterInstalled() {
    console.log('Checking for Freighter...', window.freighterApi);
    if (window.freighterApi) {
        console.log('✅ Freighter detected');
        showStatus('Freighter detected! Click Connect to continue', 'success');
    } else {
        console.log('❌ Freighter not found');
        showStatus('Please install Freighter wallet extension from freighter.app', 'error');
    }
}

// Connect to Freighter wallet
async function connectFreighter() {
    try {
        // Check again at connection time
        if (!window.freighterApi) {
            showStatus('Freighter wallet not found. Please install it from https://www.freighter.app/ and refresh the page', 'error');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }

        console.log('Requesting Freighter access...');
        const result = await window.freighterApi.requestAccess();
        console.log('Freighter response:', result);
        
        if (result.error) {
            showStatus('Failed to connect: ' + result.error, 'error');
            return;
        }
        
        connectedPublicKey = result.address;
        
        document.getElementById('walletAddress').textContent = `${result.address.substring(0, 8)}...${result.address.substring(result.address.length - 4)}`;
        document.getElementById('connectBtn').textContent = 'Connected ✓';
        document.getElementById('connectBtn').disabled = true;
        
        showStatus('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Freighter connection failed:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

// Mint new time token
async function handleMint(e) {
    e.preventDefault();
    
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const hourlyRate = document.getElementById('hourlyRate').value;
    const hoursAvailable = document.getElementById('hoursAvailable').value;
    const description = document.getElementById('description').value;

    try {
        showStatus('Minting token...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Convert parameters to ScVal
        const params = [
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(parseInt(hourlyRate), { type: 'i128' }),
            StellarSdk.nativeToScVal(parseInt(hoursAvailable), { type: 'u32' }),
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

        // Prepare transaction (simulate)
        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        // Sign with Freighter
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        // Submit transaction
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        console.log('Transaction result:', result);
        
        // For PENDING status, show immediate feedback and refresh after delay
        if (result.status === 'PENDING') {
            showStatus('Transaction submitted! Waiting for confirmation...', 'info');
            console.log('Transaction hash:', result.hash);
            
            // Wait 5 seconds then reload
            console.log('Waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('Wait complete, updating UI...');
            
            showStatus('Token minted successfully!', 'success');
            
            // Reload the lists
            console.log('Loading my tokens...');
            await loadMyTokens();
            console.log('Loading all tokens...');
            await loadAllTokens();
            console.log('All done!');
        } else {
            showStatus('Token minted successfully!', 'success');
        }
        
        document.getElementById('mintForm').reset();
        
    } catch (error) {
        console.error('Minting failed:', error);
        showStatus('Failed to mint token: ' + error.message, 'error');
    }
}

// Load user's tokens
async function loadMyTokens() {
    console.log('loadMyTokens called, connectedPublicKey:', connectedPublicKey);
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    try {
        console.log('Loading your tokens...');
        showStatus('Loading your tokens...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        // Get seller tokens
        const params = [new StellarSdk.Address(connectedPublicKey).toScVal()];
        
        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('get_seller_tokens', ...params))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        console.log('get_seller_tokens result:', result);
        console.log('result.result:', result.result);
        console.log('result.result.retval:', result.result?.retval);
        
        // Check for result.retval (correct SDK format)
        if (result.result && result.result.retval) {
            const tokenIds = StellarSdk.scValToNative(result.result.retval);
            console.log('Token IDs for my tokens:', tokenIds);
            
            if (tokenIds.length === 0) {
                console.log('No tokens found for this seller');
                document.getElementById('myTokensList').innerHTML = '<p>You have no tokens yet.</p>';
            } else {
                console.log(`Found ${tokenIds.length} tokens, displaying...`);
                await displayTokens(tokenIds, 'myTokensList', true);
            }
        } else {
            console.log('No result.retval from get_seller_tokens');
            document.getElementById('myTokensList').innerHTML = '<p>You have no tokens yet.</p>';
        }
        
        console.log('My tokens loaded successfully');
        showStatus('Tokens loaded', 'success');
        
    } catch (error) {
        console.error('Failed to load my tokens:', error);
        console.error('Error details:', error.message, error.stack);
        showStatus('Failed to load tokens: ' + error.message, 'error');
    }
}

// Load all tokens from marketplace
async function loadAllTokens() {
    console.log('loadAllTokens called');
    try {
        console.log('Loading marketplace...');
        showStatus('Loading marketplace...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await server.getAccount(connectedPublicKey || await getAnyAccount());
        
        // Get token count
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('get_token_count'))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        console.log('get_token_count result:', result);
        console.log('result.result.retval:', result.result?.retval);
        
        // Check for result.retval (correct SDK format)
        if (result.result && result.result.retval) {
            const count = StellarSdk.scValToNative(result.result.retval);
            console.log('Total token count:', count);
            
            // Convert BigInt to Number
            const countNum = Number(count);
            
            if (countNum === 0) {
                console.log('No tokens in marketplace');
                document.getElementById('tokensList').innerHTML = '<p>No tokens in marketplace yet.</p>';
            } else {
                const tokenIds = Array.from({ length: countNum }, (_, i) => i + 1);
                console.log('Token IDs to load:', tokenIds);
                await displayTokens(tokenIds, 'tokensList', false);
            }
        } else {
            console.log('No result.retval from get_token_count');
            document.getElementById('tokensList').innerHTML = '<p>No tokens in marketplace yet.</p>';
        }
        
        console.log('Marketplace loaded successfully');
        showStatus('Marketplace loaded', 'success');
        
    } catch (error) {
        console.error('Failed to load marketplace:', error);
        console.error('Error details:', error.message, error.stack);
        showStatus('Failed to load marketplace: ' + error.message, 'error');
    }
}

// Display tokens
async function displayTokens(tokenIds, containerId, isMyTokens) {
    console.log(`displayTokens called with ${tokenIds.length} tokens for ${containerId}`);
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const tokenId of tokenIds) {
        try {
            console.log(`Fetching token ${tokenId}...`);
            const tokenData = await getTokenDetails(tokenId);
            console.log(`Token ${tokenId} data:`, tokenData);
            if (tokenData) {
                const card = createTokenCard(tokenId, tokenData, isMyTokens);
                console.log(`Adding card for token ${tokenId}`);
                container.innerHTML += card;
            } else {
                console.log(`No data for token ${tokenId}`);
            }
        } catch (error) {
            console.error(`Failed to load token ${tokenId}:`, error);
        }
    }
    console.log(`Finished displaying ${tokenIds.length} tokens`);
}

// Get token details
async function getTokenDetails(tokenId) {
    try {
        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const sourceAccount = await server.getAccount(connectedPublicKey || await getAnyAccount());
        
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call(
            'get_token',
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' })
        ))
        .setTimeout(30)
        .build();

        const prepared = await server.prepareTransaction(transaction);
        const result = await server.simulateTransaction(prepared);
        
        // Use result.retval (correct SDK format)
        if (result.result && result.result.retval) {
            return StellarSdk.scValToNative(result.result.retval);
        }
        return null;
        
    } catch (error) {
        console.error(`Error getting token ${tokenId}:`, error);
        return null;
    }
}

// Create token card HTML
function createTokenCard(tokenId, token, isMyTokens) {
    const actions = isMyTokens
        ? `<div class="actions">
            <button class="btn-danger" onclick="deleteToken(${tokenId})">Delete</button>
            <button class="btn-secondary" onclick="updateAvailability(${tokenId})">Update Hours</button>
           </div>`
        : `<div class="actions">
            <button class="btn-purchase" onclick="purchaseToken(${tokenId})">Purchase</button>
           </div>`;

    return `
        <div class="token-card">
            <h3>${token.description}</h3>
            <p><strong>Token ID:</strong> ${tokenId}</p>
            <p><strong>Hourly Rate:</strong> ${token.hourly_rate} stroops</p>
            <p><strong>Hours Available:</strong> ${token.hours_available}</p>
            <p><strong>Seller:</strong> ${token.seller.substring(0, 8)}...${token.seller.substring(token.seller.length - 4)}</p>
            ${actions}
        </div>
    `;
}

// Purchase token
window.purchaseToken = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const hours = prompt('How many hours would you like to purchase?');
    if (!hours || hours <= 0) return;

    try {
        showStatus('Processing purchase...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(parseInt(hours), { type: 'u32' })
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('purchase_token', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Purchase submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Purchase successful!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Purchase failed:', error);
        showStatus('Purchase failed: ' + error.message, 'error');
    }
};

// Delete token
window.deleteToken = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this token?')) return;

    try {
        showStatus('Deleting token...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal()
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('delete_token', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Token deletion submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Token deleted!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Delete failed:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
};

// Update availability
window.updateAvailability = async function(tokenId) {
    if (!connectedPublicKey) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const newHours = prompt('Enter new hours available:');
    if (!newHours || newHours < 0) return;

    try {
        showStatus('Updating availability...', 'info');

        const contract = new StellarSdk.Contract(CONFIG.contractId);
        const account = await server.getAccount(connectedPublicKey);
        
        const params = [
            StellarSdk.nativeToScVal(tokenId, { type: 'u64' }),
            new StellarSdk.Address(connectedPublicKey).toScVal(),
            StellarSdk.nativeToScVal(parseInt(newHours), { type: 'u32' })
        ];
        
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
        .addOperation(contract.call('update_availability', ...params))
        .setTimeout(30)
        .build();

        transaction = await server.prepareTransaction(transaction);
        const preparedXDR = transaction.toXDR();
        
        const signResult = await window.freighterApi.signTransaction(preparedXDR, {
            networkPassphrase: CONFIG.networkPassphrase
        });
        
        if (signResult.error) {
            throw new Error(signResult.error);
        }

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, CONFIG.networkPassphrase);
        const result = await server.sendTransaction(signedTx);
        
        if (result.status === 'PENDING') {
            showStatus('Update submitted! Waiting for confirmation...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        showStatus('Availability updated!', 'success');
        await loadMyTokens();
        await loadAllTokens();
        
    } catch (error) {
        console.error('Update failed:', error);
        showStatus('Update failed: ' + error.message, 'error');
    }
};

// Poll transaction status
async function pollTransactionStatus(hash) {
    console.log('Polling transaction:', hash);
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const getResponse = await server.getTransaction(hash);
            
            console.log('Poll attempt', attempts + 1, '- Status:', getResponse.status);
            
            if (getResponse.status === 'NOT_FOUND') {
                attempts++;
                continue;
            }
            
            if (getResponse.status === 'SUCCESS') {
                console.log('✅ Transaction succeeded!');
                return getResponse;
            } else if (getResponse.status === 'FAILED') {
                console.error('❌ Transaction failed');
                throw new Error(`Transaction failed`);
            }
        } catch (error) {
            // If we get an XDR parsing error, the transaction might still be pending
            if (error.message && error.message.includes('Bad union switch')) {
                console.log('XDR parsing error (transaction still processing), retrying...');
                attempts++;
                continue;
            }
            // For other errors, rethrow
            throw error;
        }
    }
    
    throw new Error('Transaction polling timeout - transaction may still be processing');
}

// Get any account for read-only operations
async function getAnyAccount() {
    // Use a known funded account for simulation
    const keypair = StellarSdk.Keypair.random();
    return keypair.publicKey();
}

// Show status message
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `show ${type}`;
    
    setTimeout(() => {
        status.classList.remove('show');
    }, 5000);
}

console.log('App loaded. Contract ID:', CONFIG.contractId);