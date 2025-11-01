const StellarSdk = require('stellar-sdk');
const fs = require('fs');
const path = require('path');

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
const keypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET);
const contractPath = path.join(__dirname, '../contracts/time_token.rs');

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function deploy() {
  console.log('🚀 Deploying Time Token Smart Contract to Stellar...\n');

  try {
    // Step 1: Build the contract
    console.log('📦 Building contract...');
    execSync('cargo build --target wasm32-unknown-unknown --release', {
      cwd: path.join(__dirname, '../contracts'),
      stdio: 'inherit'
    });

    // Step 2: Optimize the WASM
    console.log('\n✨ Optimizing WASM...');
    const wasmPath = path.join(__dirname, '../target/wasm32-unknown-unknown/release/time_token.wasm');
    
    if (!fs.existsSync(wasmPath)) {
      throw new Error('WASM file not found. Build may have failed.');
    }

    execSync(`soroban contract optimize --wasm ${wasmPath}`, {
      stdio: 'inherit'
    });

    // Step 3: Deploy to testnet
    console.log('\n🌐 Deploying to Stellar Testnet...');
    const output = execSync(
      `soroban contract deploy --wasm ${wasmPath} --source ACCOUNT_NAME --network testnet`,
      { encoding: 'utf-8' }
    );

    const contractId = output.trim();
    console.log('\n✅ Contract deployed successfully!');
    console.log(`📝 Contract ID: ${contractId}`);

    // Save contract ID to a file
    const contractInfo = {
      contractId,
      deployedAt: new Date().toISOString(),
      network: 'testnet'
    };

    fs.writeFileSync(
      path.join(__dirname, '../contract-id.json'),
      JSON.stringify(contractInfo, null, 2)
    );

    console.log('\n💾 Contract ID saved to contract-id.json');

    // Step 4: Initialize the contract
    console.log('\n🔧 Initializing contract...');
    execSync(
      `soroban contract invoke --id ${contractId} --source ACCOUNT_NAME --network testnet -- initialize`,
      { stdio: 'inherit' }
    );

    console.log('\n🎉 Deployment complete!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
