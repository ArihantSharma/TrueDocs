#!/bin/sh
echo ""
echo "========================================================"
echo "  🚀 TrueDocs Hardhat Blockchain Node Starting..."
echo "========================================================"
echo ""

# Start the hardhat node in the background
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

echo "⏳ Waiting for Hardhat node to be ready..."
sleep 5

echo ""
echo "========================================================"
echo "  💰 COPY ONE OF THESE TEST ACCOUNTS FOR METAMASK"
echo "========================================================"
echo ""
echo "  Network Name  : Hardhat Local"
echo "  RPC URL       : http://localhost:8545"
echo "  Chain ID      : 31337"
echo "  Currency      : ETH"
echo ""
echo "  Account #0 Private Key (import into MetaMask):"
echo "  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "  Account #1 Private Key:"
echo "  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo ""
echo "  Account #2 Private Key:"  
echo "  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo "  (These are the standard Hardhat test accounts - only for local testing!)"
echo "========================================================"
echo ""

# Deploy the contract
echo "📦 Deploying TrueDocsRegistry contract..."
npx hardhat ignition deploy ignition/modules/TrueDocs.js --network localhost --reset

echo ""
echo "========================================================"
echo "  ✅ Contract Deployed!"
echo "  Contract Address : 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "  Chain ID         : 31337"
echo "  RPC URL          : http://localhost:8545 (from host)"
echo "                     http://hardhat:8545   (from other containers)"
echo "========================================================"
echo ""

# Keep the node running in the foreground
wait $NODE_PID
