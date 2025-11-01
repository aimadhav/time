import { StellarWallet } from 'stellar-wallet-sdk';

let wallet;

export const connectWallet = async () => {
    try {
        wallet = await StellarWallet.connect();
        console.log('Wallet connected:', wallet);
    } catch (error) {
        console.error('Failed to connect wallet:', error);
    }
};

export const getAccountBalance = async () => {
    if (!wallet) {
        console.error('Wallet not connected');
        return;
    }
    try {
        const balance = await wallet.getBalance();
        console.log('Account balance:', balance);
        return balance;
    } catch (error) {
        console.error('Failed to fetch account balance:', error);
    }
};

export const disconnectWallet = () => {
    if (wallet) {
        wallet.disconnect();
        wallet = null;
        console.log('Wallet disconnected');
    } else {
        console.log('No wallet to disconnect');
    }
};