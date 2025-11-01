# Deployment Guide

## Prerequisites Checklist
- [x] Rust installed (`rustc --version`)
- [x] Soroban CLI installed (`cargo install --locked soroban-cli`)
- [x] wasm32 target added (`rustup target add wasm32-unknown-unknown`)
- [ ] Stellar testnet account created
- [ ] Testnet XLM funded

## Step 1: Create Stellar Testnet Account

1. Visit https://laboratory.stellar.org/#account-creator?network=test
2. Generate a keypair
3. Fund the account with testnet XLM using the friendbot
4. Save your Secret Key securely

## Step 2: Configure Soroban Identity

```bash
# Create a new identity for deployment
soroban keys generate --global deployer --network testnet

# Or import existing key
soroban keys add deployer --secret-key YOUR_SECRET_KEY --global --network testnet
```

## Step 3: Configure Network

```bash
# Add testnet network
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

## Step 4: Build Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM will be at:
`target/wasm32-unknown-unknown/release/time_token.wasm`

## Step 5: Deploy Contract

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/time_token.wasm \
  --source deployer \
  --network testnet
```

Save the returned CONTRACT_ID.

## Step 6: Initialize Contract

```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize
```

## Step 7: Test Contract Functions

### Mint a Time Token
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  mint_time_token \
  --seller YOUR_PUBLIC_KEY \
  --hourly_rate 100 \
  --hours_available 40 \
  --description "Software Development Services"
```

### Get Token Details
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  get_token \
  --token_id 1
```

### Get Token Count
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  get_token_count
```

## Troubleshooting

### Build Errors
- Ensure wasm32 target is installed: `rustup target add wasm32-unknown-unknown`
- Clean build: `cargo clean && cargo build --target wasm32-unknown-unknown --release`

### Deployment Errors
- Check account has sufficient XLM balance
- Verify network configuration
- Ensure Soroban CLI is up to date: `cargo install --locked soroban-cli --force`

### Authorization Errors
- Make sure the correct identity is being used
- Verify the account has proper permissions

## Production Deployment

For mainnet deployment:

1. Use mainnet network configuration
2. Ensure sufficient XLM for fees
3. Audit smart contract code
4. Test thoroughly on testnet first
5. Consider using multi-sig for contract ownership

```bash
# Add mainnet network
soroban network add \
  --global mainnet \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

## Next Steps

1. Update frontend with deployed CONTRACT_ID
2. Test all contract functions
3. Document any custom configurations
4. Set up monitoring for contract interactions
