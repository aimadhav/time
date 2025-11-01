# ⏰ Stellar Time Marketplace

## Overview
A decentralized marketplace built on Stellar blockchain using Soroban smart contracts. Users can tokenize and sell their time-based services directly on-chain. Each time token represents available hours at a specified hourly rate.

## Features
- **Mint Time Tokens**: Create tokens representing your available time and hourly rate
- **Marketplace**: Browse and purchase time tokens from service providers
- **On-Chain Management**: Update availability and track all tokens on-chain
- **Secure Transactions**: Built with Soroban smart contracts following Stellar best practices

## Project Structure
```
stellar-time-marketplace
├── contracts
│   ├── time_token.rs        # Smart contract for managing time tokens
│   └── Cargo.toml           # Rust project configuration
├── frontend
│   ├── src
│   │   ├── index.html       # Main HTML file
│   │   ├── app.js           # Frontend application entry point
│   │   ├── styles.css       # Styles for the frontend
│   │   └── components       # Reusable components
│   │       ├── wallet.js    # Wallet management functions
│   │       ├── marketplace.js# Marketplace functions
│   │       └── token-manager.js # Token management functions
│   ├── package.json         # Frontend project configuration
│   └── vite.config.js       # Vite configuration for building the frontend
├── scripts
│   ├── deploy.js            # Script for deploying the smart contract
│   └── setup.js             # Script for initial marketplace setup
├── tests
│   └── time_token.test.js   # Test cases for the smart contract
├── .env.example              # Example environment variables
├── package.json             # Overall project configuration
├── todo.md                  # Project tasks and milestones
└── README.md                # Project documentation
```

## Prerequisites
- Rust (install from https://rustup.rs/)
- Soroban CLI: `cargo install --locked soroban-cli`
- Node.js and npm

## Quick Start

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd stellar-time-marketplace
   node scripts/setup.js
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Stellar account details
   ```

3. **Build and Test Smart Contract**:
   ```bash
   cd contracts
   cargo build --target wasm32-unknown-unknown --release
   cargo test
   ```

4. **Deploy to Stellar Testnet**:
   ```bash
   node scripts/deploy.js
   ```

## Smart Contract Functions

### `initialize()`
Initialize the contract storage

### `mint_time_token(seller: Address, hourly_rate: i128, hours_available: u32, description: String) -> u64`
Create a new time token listing
- Returns: Token ID

### `get_token(token_id: u64) -> Option<TimeToken>`
Retrieve token details

### `purchase_token(token_id: u64, buyer: Address, hours: u32) -> bool`
Purchase hours from a time token

### `update_availability(token_id: u64, seller: Address, new_hours: u32) -> bool`
Update available hours for a token

### `delete_token(token_id: u64, seller: Address) -> bool`
Remove a token from the marketplace

### `get_seller_tokens(seller: Address) -> Vec<u64>`
Get all token IDs for a seller

### `get_token_count() -> u64`
Get total number of tokens minted

## Testing

Run all smart contract tests:
```bash
cd contracts
cargo test
```

Expected output: `test result: ok. 9 passed`

## Frontend Setup

### Quick Start
1. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Deploy contract to testnet** (if not deployed):
   ```bash
   cd ../contracts
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/time_token.wasm \
     --source YOUR_ACCOUNT \
     --network testnet
   ```

3. **Initialize contract:**
   ```bash
   soroban contract invoke \
     --id YOUR_CONTRACT_ID \
     --source YOUR_ACCOUNT \
     --network testnet \
     -- \
     initialize
   ```

4. **Update contract ID in frontend:**
   - Edit `frontend/src/app.js` line 4
   - Replace `YOUR_CONTRACT_ID_HERE` with your actual contract ID

5. **Install Freighter wallet:**
   - Download from https://www.freighter.app/
   - Create/import wallet and switch to Testnet

6. **Fund testnet account:**
   ```bash
   curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
   ```

7. **Run frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Open http://localhost:3000

See [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) for detailed instructions.

## Project Status

✅ **Backend (Smart Contract)**: Production Ready
- 9/9 tests passing
- Complete CRUD operations
- Authorization checks implemented
- Optimized for WASM deployment

✅ **Frontend**: Fully Functional
- Freighter wallet integration
- All contract functions accessible
- Mint, purchase, update, delete operations
- View marketplace and personal tokens

## What Works

1. ✅ Mint time tokens with rate, hours, and description
2. ✅ Purchase hours from any token
3. ✅ Update token availability
4. ✅ Delete tokens
5. ✅ View all marketplace tokens
6. ✅ View personal tokens
7. ✅ Freighter wallet connection
8. ✅ Transaction signing and submission
9. ✅ Real-time status updates

## Configuration Required

Only ONE file needs updating:
- `frontend/src/app.js` - Line 4: Update `contractId` with your deployed contract ID

## Technology Stack

- **Smart Contract**: Rust + Soroban SDK 21.0.0
- **Frontend**: Vanilla JavaScript + Vite
- **Blockchain**: Stellar (Soroban)
- **Wallet**: Freighter
- **Network**: Testnet (configurable for Mainnet)

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
MIT License