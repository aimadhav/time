import { StellarSdk } from 'stellar-sdk';

const server = new StellarSdk.Server('https://horizon.stellar.org');

export const mintToken = async (issuerSecretKey, amount) => {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    const transaction = new StellarSdk.TransactionBuilder(issuerKeypair.publicKey())
        .addOperation(StellarSdk.Operation.payment({
            destination: issuerKeypair.publicKey(),
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
        }))
        .setTimeout(30)
        .build();

    transaction.sign(issuerKeypair);
    return await server.submitTransaction(transaction);
};

export const transferToken = async (sourceSecretKey, destinationPublicKey, amount) => {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const account = await server.loadAccount(sourceKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account)
        .addOperation(StellarSdk.Operation.payment({
            destination: destinationPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString(),
        }))
        .setTimeout(30)
        .build();

    transaction.sign(sourceKeypair);
    return await server.submitTransaction(transaction);
};