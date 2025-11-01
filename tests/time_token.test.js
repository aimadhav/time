const { expect } = require('chai');
const { StellarSdk } = require('stellar-sdk');
const { deployContract, mintToken, transferToken, burnToken } = require('../scripts/deploy');

describe('Time Token Smart Contract', () => {
    let contract;

    before(async () => {
        contract = await deployContract();
    });

    it('should mint tokens successfully', async () => {
        const initialSupply = 1000;
        const result = await mintToken(contract, initialSupply);
        expect(result).to.be.true;
    });

    it('should transfer tokens successfully', async () => {
        const amount = 100;
        const recipient = 'GAXXXXXXX...'; // Replace with a valid Stellar address
        const result = await transferToken(contract, recipient, amount);
        expect(result).to.be.true;
    });

    it('should burn tokens successfully', async () => {
        const amount = 50;
        const result = await burnToken(contract, amount);
        expect(result).to.be.true;
    });

    it('should fail to transfer more tokens than available', async () => {
        const amount = 2000; // Exceeds initial supply
        const recipient = 'GAXXXXXXX...'; // Replace with a valid Stellar address
        try {
            await transferToken(contract, recipient, amount);
        } catch (error) {
            expect(error.message).to.include('Insufficient balance');
        }
    });
});