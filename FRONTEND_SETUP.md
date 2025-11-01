# Frontend Setup Guide

## Quick Start (Copy-Paste Ready)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Deploy Smart Contract (if not already deployed)
```bash
cd ../contracts
cargo build --target wasm32-unknown-unknown --release
```

### 3. Deploy to Testnet
Replace `YOUR_ACCOUNT_NAME` with your Stellar account identity:
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/time_token.wasm \
  --source YOUR_ACCOUNT_NAME \
  --network testnet
```

**Save the Contract ID from output!** It will look like:
```
CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
```

### 4. Initialize Contract
Replace `YOUR_CONTRACT_ID` with the ID from step 3:
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_ACCOUNT_NAME \
  --network testnet \
  -- \
  initialize
```

### 5. Update Frontend Configuration
Edit `frontend/src/app.js` line 4:
```javascript
// BEFORE:
const CONFIG = {
    contractId: 'YOUR_CONTRACT_ID_HERE',
    // ...
};

// AFTER:
const CONFIG = {
    contractId: 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K', // Your actual contract ID
    // ...
};
```

### 6. Install Freighter Wallet
1. Go to https://www.freighter.app/
2. Install the browser extension
3. Create or import a wallet
4. Switch to Testnet in Freighter settings

### 7. Fund Your Testnet Account
```bash
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

Or visit: https://laboratory.stellar.org/#account-creator?network=test

### 8. Run Frontend
```bash
cd frontend
npm run dev
```

Open browser to: http://localhost:3000

## Usage

### Connect Wallet
1. Click "Connect Freighter" button
2. Approve connection in Freighter popup

### Mint Time Token
1. Fill in:
   - Hourly Rate (in stroops, 1 XLM = 10,000,000 stroops)
   - Hours Available
   - Description
2. Click "Mint Token"
3. Approve transaction in Freighter

### View Your Tokens
1. Click "Load My Tokens"
2. Manage your tokens (Update hours, Delete)

### Browse Marketplace
1. Click "Refresh Marketplace"
2. View all available tokens
3. Click "Purchase" to buy hours

## Troubleshooting

### "Freighter wallet not found"
- Install Freighter: https://www.freighter.app/
- Refresh the page after installation

### "Failed to connect wallet"
- Make sure Freighter is unlocked
- Check that you're on Testnet in Freighter settings

### "Transaction failed"
- Ensure your account has testnet XLM
- Check contract ID is correct in app.js
- Verify contract is initialized

### "Failed to load tokens"
- Check browser console for errors
- Verify contract ID is correct
- Make sure you're connected to testnet

## Contract Functions Available

- `mint_time_token` - Create new time token
- `get_token` - Get token details
- `purchase_token` - Buy hours from a token
- `update_availability` - Update your token's hours
- `delete_token` - Remove your token
- `get_seller_tokens` - Get all your tokens
- `get_token_count` - Get total tokens in marketplace

## Network Configuration

Current configuration (testnet):
- RPC URL: https://soroban-testnet.stellar.org
- Network: Test SDF Network ; September 2015

## Development

### Project Structure
```
frontend/
├── src/
│   ├── index.html    # Main HTML
│   ├── app.js        # Main application logic
│   └── styles.css    # Styles
├── package.json      # Dependencies
└── vite.config.js    # Vite configuration
```

### Key Files to Edit
- `src/app.js` - Update CONTRACT_ID after deployment
- `src/styles.css` - Customize styling (optional)
- `src/index.html` - Modify UI layout (optional)

## Production Deployment

For mainnet:
1. Deploy contract to mainnet
2. Update CONFIG in app.js:
   ```javascript
   const CONFIG = {
       contractId: 'YOUR_MAINNET_CONTRACT_ID',
       networkPassphrase: StellarSdk.Networks.PUBLIC,
       rpcUrl: 'https://soroban-mainnet.stellar.org'
   };
   ```
3. Build: `npm run build`
4. Deploy `dist/` folder to hosting service

## Support

- Stellar Docs: https://developers.stellar.org/
- Soroban Docs: https://soroban.stellar.org/
- Freighter Docs: https://docs.freighter.app/
