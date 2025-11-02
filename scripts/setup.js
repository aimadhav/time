const StellarSdk = require('stellar-sdk');
const { Server, TransactionBuilder, Networks, Keypair } = StellarSdk;

// Initialize the Stellar server
const server = new Server('https://horizon-testnet.stellar.org');

// Function to create an initial token
async function createInitialToken(tokenName, issuerKeypair, amount) {
    const account = await server.loadAccount(issuerKeypair.publicKey());
    
    const transaction = new TransactionBuilder(account, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: Networks.TESTNET,
    })
    .addOperation(StellarSdk.Operation.changeTrust({
        asset: new StellarSdk.Asset(tokenName, issuerKeypair.publicKey()),
        limit: amount,
    }))
    .setTimeout(30)
    .build();

    transaction.sign(issuerKeypair);
    
    try {
        const result = await server.submitTransaction(transaction);
        console.log('Token created successfully:', result);
    } catch (error) {
        console.error('Error creating token:', error);
    }
}

// Main setup function
async function setupMarketplace() {
    const issuerKeypair = Keypair.fromSecret('YOUR_ISSUER_SECRET_KEY'); // Replace with your issuer secret key
    const tokenName = 'TIME'; // Name of the token
    const initialAmount = '1000000'; // Initial amount of tokens

    await createInitialToken(tokenName, issuerKeypair, initialAmount);
}

// Run the setup
setupMarketplace();