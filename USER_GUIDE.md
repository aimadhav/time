# Stellar Time Marketplace - User Guide

## What is This?

A decentralized marketplace on Stellar where people can tokenize and sell their time. Professionals can mint "time tokens" representing hours of their service, and buyers can purchase these hours directly on the blockchain.

## Quick Start

### Prerequisites
- **Freighter Wallet** browser extension installed
- **Testnet XLM** in your wallet (get from https://laboratory.stellar.org/#account-creator)

### Setup Steps

1. **Install Freighter Wallet**
   - Install from https://freighter.app
   - Create/import your wallet
   - Switch to Testnet network

2. **Get Testnet XLM**
   - Go to https://laboratory.stellar.org/#account-creator
   - Enter your public key
   - Click "Get test network lumens"

3. **Access the Marketplace**
   - Open http://localhost:3000 (if running locally)
   - Click "Connect ✓" button
   - Approve Freighter connection

## How to Use

### 1. Mint Your Time Token

**What is this?** Create a token representing your available hours for hire.

**Steps:**
1. Fill in the form:
   - **Hourly Rate (stroops)**: Your rate in stroops (1 XLM = 10,000,000 stroops)
     - Example: 5000000 = 0.5 XLM per hour
   - **Hours Available**: Total hours you're offering
     - Example: 40 (one work week)
   - **Service Description**: What you offer
     - Example: "Full Stack Developer", "Marketing Consultant"

2. Click **"Mint Token"**
3. Approve transaction in Freighter popup
4. Wait ~5 seconds for confirmation
5. Your token appears in "Your Tokens" section

**Cost:** ~0.01 XLM transaction fee

---

### 2. View Your Tokens

**What is this?** See all time tokens you've created.

**Steps:**
1. Click **"Load My Tokens"** button
2. Your tokens appear with:
   - Token ID
   - Description
   - Hourly rate
   - Hours available
   - Delete and Update buttons

---

### 3. Browse Marketplace

**What is this?** See all available time tokens from all sellers.

**Steps:**
1. Click **"Refresh Marketplace"** button
2. All tokens appear (including yours)
3. Tokens show:
   - Service description
   - Hourly rate
   - Available hours
   - Seller address
   - Purchase button (for others' tokens)

---

### 4. Purchase Time

**What is this?** Buy hours from someone else's token.

**Steps:**
1. Find a token in the marketplace
2. Click **"Purchase"** button
3. Enter number of hours to buy
4. Approve transaction in Freighter
5. Wait ~5 seconds
6. Token's available hours decrease

**Note:** You can't purchase your own tokens.

**Cost:** Transaction fee (~0.01 XLM)

---

### 5. Update Availability

**What is this?** Change how many hours you're offering on your token.

**Steps:**
1. Go to "Your Tokens" section
2. Find your token
3. Click **"Update Hours"**
4. Enter new hours available
5. Approve transaction in Freighter
6. Wait ~5 seconds
7. Hours updated

**Use Case:** Increase hours when you have more availability, decrease if booked.

---

### 6. Delete Token

**What is this?** Permanently remove your time token.

**Steps:**
1. Go to "Your Tokens" section
2. Find your token
3. Click **"Delete"**
4. Confirm deletion
5. Approve transaction in Freighter
6. Wait ~5 seconds
7. Token removed from blockchain

**Warning:** This is permanent and cannot be undone!

---

## Understanding Stroops

Stellar uses **stroops** as the smallest unit:
- 1 XLM = 10,000,000 stroops
- 0.1 XLM = 1,000,000 stroops
- 0.01 XLM = 100,000 stroops

**Example Pricing:**
- Entry-level: 1,000,000 stroops/hr = $0.10/hr (if XLM = $1)
- Mid-level: 10,000,000 stroops/hr = $1/hr
- Premium: 100,000,000 stroops/hr = $10/hr

---

## Smart Contract Functions

### For Developers

**Contract Address:** `CB57V4DDEMCC3YMPMYFWR4ULPCIEWSX3RPQ4DJWQBES7V57AFIPQHYLY`

**Available Functions:**
- `mint_time_token(seller, hourly_rate, hours_available, description)` - Create token
- `purchase_token(token_id, buyer, hours)` - Buy hours
- `update_availability(token_id, seller, new_hours)` - Update hours
- `delete_token(token_id, seller)` - Remove token
- `get_token(token_id)` - Get token details
- `get_seller_tokens(seller)` - Get seller's token IDs
- `get_token_count()` - Get total tokens minted

---

## Troubleshooting

### "Failed to load tokens"
- Check wallet is connected
- Refresh the page
- Try "Load My Tokens" again

### "Transaction failed"
- Ensure you have enough XLM for fees (~0.01 XLM)
- Check you're on Testnet
- Try transaction again

### "Freighter not detected"
- Install Freighter extension
- Refresh the page
- Make sure extension is enabled

### Tokens not appearing
- Wait 5-10 seconds after transaction
- Click "Load My Tokens" or "Refresh Marketplace"
- Check browser console for errors

---

## Security Notes

⚠️ **This is on Testnet** - Not real money, for testing only!

For production:
- Always verify contract addresses
- Never share your secret key
- Double-check transaction details before signing
- Only connect to trusted websites

---

## Technical Details

- **Blockchain:** Stellar Testnet
- **Smart Contract:** Soroban (Rust)
- **Frontend:** Vanilla JavaScript + Vite
- **Wallet:** Freighter
- **RPC:** https://soroban-testnet.stellar.org

---

## Support

Having issues? Check:
1. Browser console for error messages (F12)
2. Freighter is unlocked and on Testnet
3. You have testnet XLM
4. Page is fully loaded before connecting

---

## Example Use Case

**Scenario:** You're a developer offering consulting hours

1. **Mint Token**
   - Rate: 50,000,000 stroops (5 XLM/hour)
   - Hours: 20
   - Description: "Senior Full Stack Developer - React, Node.js, Stellar"

2. **Client Finds You**
   - They browse marketplace
   - See your token
   - Click Purchase

3. **Client Buys Hours**
   - Enter: 5 hours
   - Transaction confirms
   - Your available hours: 20 → 15

4. **Update Availability**
   - After booking, update to 10 hours
   - New availability reflects immediately

5. **Complete Work**
   - Off-chain: Do the work
   - Update token or delete when done

---

## What's Next?

This is a basic MVP. Future features could include:
- Payment processing (automatic XLM transfer)
- Reviews and ratings
- Calendar integration
- Escrow system
- Multi-token bundles
- Time-based pricing (peak/off-peak)
- Recurring bookings

---

**Built on Stellar | Powered by Soroban**
