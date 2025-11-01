# 📝 COPY-PASTE SETUP GUIDE

## Step 1: Deploy Contract

### Command to run:
```bash
cd contracts
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/time_token.wasm \
  --source YOUR_ACCOUNT_NAME \
  --network testnet
```

### You'll get output like:
```
CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
```

**👆 This is your CONTRACT_ID - COPY IT!**

---

## Step 2: Initialize Contract

### Command to run (replace CONTRACT_ID):
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID_FROM_STEP_1 \
  --source YOUR_ACCOUNT_NAME \
  --network testnet \
  -- \
  initialize
```

---

## Step 3: Update Frontend Config

### Open this file:
`frontend/src/app.js`

### Find line 4:
```javascript
const CONFIG = {
    contractId: 'YOUR_CONTRACT_ID_HERE',  // <- EDIT THIS LINE
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org'
};
```

### Change to (paste your CONTRACT_ID):
```javascript
const CONFIG = {
    contractId: 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K',  // <- YOUR CONTRACT_ID
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org'
};
```

---

## Step 4: Run Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Open: http://localhost:3000

---

## Step 5: Connect Wallet

1. Install Freighter: https://www.freighter.app/
2. Create/import wallet
3. Switch to **Testnet** in Freighter settings
4. Fund your account:
   ```bash
   curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
   ```
5. In the app, click "Connect Freighter"

---

## That's It! 🎉

Now you can:
- ✅ Mint time tokens
- ✅ Browse marketplace
- ✅ Purchase tokens
- ✅ Update availability
- ✅ Delete tokens

---

## Quick Test

### Mint a Token:
1. Connect wallet
2. Fill form:
   - Rate: `1000000` (0.1 XLM per hour)
   - Hours: `40`
   - Description: `Web Development`
3. Click "Mint Token"
4. Approve in Freighter

### View in Marketplace:
1. Click "Refresh Marketplace"
2. See your token listed
3. Try purchasing from another account

---

## Troubleshooting

### "Freighter not found"
→ Install Freighter extension and refresh page

### "Transaction failed"
→ Run friendbot to get testnet XLM:
```bash
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

### "Contract not found"
→ Double-check CONTRACT_ID in `frontend/src/app.js`

### "Authorization failed"
→ Make sure Freighter is:
- Unlocked
- On Testnet (not Mainnet)
- Connected to the site

---

## Full Documentation

- **QUICKSTART.md** - Complete 5-minute guide
- **FRONTEND_SETUP.md** - Detailed frontend setup
- **DEPLOYMENT.md** - Deployment instructions
- **PROJECT_COMPLETE.md** - Full project summary
- **README.md** - Complete documentation

---

**That's all you need! Just 1 value to copy-paste. 🚀**
