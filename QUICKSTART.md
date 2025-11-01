# 🚀 Quick Start Guide

## Prerequisites Checklist
- [ ] Rust installed
- [ ] Soroban CLI installed
- [ ] Node.js and npm installed
- [ ] Freighter wallet extension installed
- [ ] Testnet XLM funded account

## Step-by-Step Setup (5 minutes)

### 1️⃣ Build Smart Contract
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```
✅ Should see: `test result: ok. 9 passed`

### 2️⃣ Setup Stellar Account
```bash
# Generate new identity
soroban keys generate deployer --network testnet --global

# Or import existing
soroban keys add deployer --secret-key YOUR_SECRET_KEY --network testnet --global

# Configure network
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 3️⃣ Deploy Contract
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/time_token.wasm \
  --source deployer \
  --network testnet
```
📋 **SAVE THE CONTRACT ID!** Example: `CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K`

### 4️⃣ Initialize Contract
```bash
# Replace YOUR_CONTRACT_ID with the ID from step 3
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize
```

### 5️⃣ Update Frontend Config
Edit `frontend/src/app.js` - Line 4:
```javascript
const CONFIG = {
    contractId: 'YOUR_CONTRACT_ID', // <- Paste your contract ID here
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org'
};
```

### 6️⃣ Install Freighter Wallet
1. Visit: https://www.freighter.app/
2. Install browser extension
3. Create/import wallet
4. **Important:** Switch to **Testnet** in settings

### 7️⃣ Fund Your Account
```bash
# Get your public key from Freighter
# Then fund it:
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

Or use: https://laboratory.stellar.org/#account-creator?network=test

### 8️⃣ Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 9️⃣ Run Frontend
```bash
npm run dev
```
🌐 Open: http://localhost:3000

---

## ✅ You're Done! Now You Can:

1. **Connect Wallet** - Click "Connect Freighter"
2. **Mint Token** - Create your time token listing
3. **View Tokens** - See your tokens or browse marketplace
4. **Purchase** - Buy hours from any token
5. **Manage** - Update or delete your tokens

---

## 🎯 Test the Full Flow

### As a Seller:
```
1. Connect Freighter
2. Fill mint form:
   - Rate: 1000000 (0.1 XLM per hour)
   - Hours: 40
   - Description: "Web Development Services"
3. Click "Mint Token"
4. Approve in Freighter
5. Wait for confirmation
6. Click "Load My Tokens" to see it
```

### As a Buyer:
```
1. Connect Freighter (different account)
2. Click "Refresh Marketplace"
3. Find a token you want
4. Click "Purchase"
5. Enter hours to buy
6. Approve in Freighter
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Freighter not found" | Install Freighter extension and refresh page |
| "Transaction failed" | Check you have testnet XLM (run friendbot again) |
| "Contract not found" | Verify CONTRACT_ID in app.js matches deployed contract |
| "Authorization failed" | Make sure Freighter is unlocked and on Testnet |
| Build errors | Run `rustup target add wasm32-unknown-unknown` |

---

## 📝 Quick Commands Reference

```bash
# Build contract
cargo build --target wasm32-unknown-unknown --release

# Test contract
cargo test

# Deploy contract
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/time_token.wasm --source deployer --network testnet

# Initialize contract
soroban contract invoke --id CONTRACT_ID --source deployer --network testnet -- initialize

# Run frontend
cd frontend && npm run dev

# Get testnet XLM
curl "https://friendbot.stellar.org?addr=PUBLIC_KEY"
```

---

## 🎉 Success Checklist

- [ ] Contract built successfully
- [ ] All 9 tests pass
- [ ] Contract deployed to testnet
- [ ] Contract initialized
- [ ] Frontend config updated with contract ID
- [ ] Freighter installed and on Testnet
- [ ] Account funded with testnet XLM
- [ ] Frontend running on localhost:3000
- [ ] Successfully connected wallet
- [ ] Successfully minted a token

---

## 📚 Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment info
- Read [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) for frontend details
- Check [README.md](./README.md) for full documentation

---

**Need Help?**
- Stellar Docs: https://developers.stellar.org/
- Soroban Docs: https://soroban.stellar.org/
- Freighter: https://docs.freighter.app/
