#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function setup() {
  console.log('🛠️  Setting up Stellar Time Marketplace Project\n');

  try {
    // Check if Rust is installed
    console.log('📋 Checking prerequisites...');
    try {
      execSync('rustc --version', { stdio: 'pipe' });
      console.log('✅ Rust is installed');
    } catch {
      console.error('❌ Rust is not installed. Please install from https://rustup.rs/');
      process.exit(1);
    }

    // Check if Soroban CLI is installed
    try {
      execSync('soroban --version', { stdio: 'pipe' });
      console.log('✅ Soroban CLI is installed');
    } catch {
      console.log('📦 Installing Soroban CLI...');
      execSync('cargo install --locked soroban-cli --features opt', { stdio: 'inherit' });
    }

    // Add wasm32 target
    runCommand(
      'rustup target add wasm32-unknown-unknown',
      '🎯 Adding wasm32 target'
    );

    // Install frontend dependencies
    if (fs.existsSync(path.join(__dirname, '../frontend/package.json'))) {
      console.log('\n📦 Installing frontend dependencies...');
      execSync('npm install', {
        cwd: path.join(__dirname, '../frontend'),
        stdio: 'inherit'
      });
      console.log('✅ Frontend dependencies installed');
    }

    // Install root dependencies
    runCommand(
      'npm install',
      '📦 Installing root dependencies'
    );

    // Build the contract
    console.log('\n🔨 Building smart contract...');
    execSync('cargo build --target wasm32-unknown-unknown --release', {
      cwd: path.join(__dirname, '../contracts'),
      stdio: 'inherit'
    });
    console.log('✅ Smart contract built successfully');

    // Run tests
    console.log('\n🧪 Running tests...');
    execSync('cargo test', {
      cwd: path.join(__dirname, '../contracts'),
      stdio: 'inherit'
    });
    console.log('✅ All tests passed');

    // Create .env.example if it doesn't exist
    const envExample = path.join(__dirname, '../.env.example');
    if (!fs.existsSync(envExample)) {
      const envContent = `# Stellar Network Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Contract Configuration
CONTRACT_ID=

# Account Configuration (for deployment)
ACCOUNT_NAME=
SECRET_KEY=
`;
      fs.writeFileSync(envExample, envContent);
      console.log('\n✅ Created .env.example');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy .env.example to .env and fill in your values');
    console.log('2. Configure your Stellar account for testnet');
    console.log('3. Run `node scripts/deploy.js` to deploy the contract');
    console.log('4. Run `npm run dev` in the frontend folder to start the UI');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();