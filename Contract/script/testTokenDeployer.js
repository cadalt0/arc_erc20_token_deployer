#!/usr/bin/env node
/**
 * Quick JS harness to deploy and exercise the TokenDeployer + Token contracts.
 *
 * Requirements:
 *   - npm install ethers dotenv
 *   - forge build (to generate artifacts in /out)
 *
 * Env vars:
 *   - ARC_TESTNET_RPC_URL  (or any RPC URL)
 *   - PRIVATE_KEY          (EOA private key)
 *   - TOKEN_DEPLOYER_ADDRESS (optional: reuse existing factory)
 */
require("dotenv").config();
const { ethers } = require("ethers");

const deployerArtifact = require("../out/TokenDeployer.sol/TokenDeployer.json");
const tokenArtifact = require("../out/Token.sol/Token.json");

async function main() {
  const { PRIVATE_KEY } = process.env;
  const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
  const TOKEN_DEPLOYER_ADDRESS = "0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf";
  if (!ARC_TESTNET_RPC_URL) {
    throw new Error("ARC_TESTNET_RPC_URL is missing");
  }
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing");
  }

  // Check artifact structure
  if (!deployerArtifact || !deployerArtifact.abi) {
    console.error("Deployer artifact structure:", Object.keys(deployerArtifact || {}));
    throw new Error("Failed to load deployer artifact ABI");
  }

  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`Using deployer wallet: ${wallet.address}`);

  console.log(`Using TokenDeployer at ${TOKEN_DEPLOYER_ADDRESS}`);
  const deployer = new ethers.Contract(TOKEN_DEPLOYER_ADDRESS, deployerArtifact.abi, wallet);
  
  // Verify contract is connected
  if (!deployer || typeof deployer.deployTokenSimple !== "function") {
    console.error("Available methods:", Object.keys(deployer || {}));
    throw new Error("Contract not properly initialized - deployTokenSimple method not found");
  }

  const tokenParams = {
    name: "ArcSampleToken",
    symbol: "ARCX",
    decimals: 18,
    initialSupply: ethers.parseUnits("1000000", 18), // 1,000,000
    maxSupply: ethers.parseUnits("10000000", 18), // 10,000,000
    mintAuthorityType: 0, // 0=OWNER, 1=ANYONE, 2=SPECIFIC
    specificMintAuthority: ethers.ZeroAddress,
  };

  console.log("Simulating deployTokenSimple...");
  try {
    const predictedTokenAddress = await deployer.deployTokenSimple.staticCall(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      tokenParams.initialSupply,
      tokenParams.maxSupply,
      tokenParams.mintAuthorityType,
      tokenParams.specificMintAuthority,
    );
    console.log(`Predicted token address: ${predictedTokenAddress}`);
  } catch (err) {
    console.log("Note: Could not predict token address (this is okay):", err.message);
  }

  console.log("Sending deployment transaction...");
  const tx = await deployer.deployTokenSimple(
    tokenParams.name,
    tokenParams.symbol,
    tokenParams.decimals,
    tokenParams.initialSupply,
    tokenParams.maxSupply,
    tokenParams.mintAuthorityType,
    tokenParams.specificMintAuthority,
  );
  const receipt = await tx.wait();
  console.log(`Token deployed! tx hash: ${tx.hash}`);
  
  // Get token address from event
  let tokenAddress;
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsedLog = deployer.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "TokenDeployed") {
          tokenAddress = parsedLog.args.token;
          console.log(`Token address from event: ${tokenAddress}`);
          break;
        }
      } catch (err) {
        // Not our event, continue
      }
    }
  }
  
  // Fallback: try to get from return value
  if (!tokenAddress) {
    try {
      tokenAddress = await deployer.deployTokenSimple.staticCall(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.decimals,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.mintAuthorityType,
        tokenParams.specificMintAuthority,
      );
      console.log(`Token address from static call: ${tokenAddress}`);
    } catch (err) {
      throw new Error("Could not determine token address. Check transaction receipt manually.");
    }
  }

  const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);
  const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority, balance] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.maxSupply(),
    token.mintAuthority(),
    token.balanceOf(wallet.address),
  ]);

  console.log("Token metadata:");
  console.log(`  Name / Symbol : ${name} / ${symbol}`);
  console.log(`  Decimals      : ${decimals}`);
  console.log(`  Total Supply  : ${ethers.formatUnits(totalSupply, decimals)}`);
  console.log(
    `  Max Supply    : ${
      maxSupply === 0n ? "Unlimited" : ethers.formatUnits(maxSupply, decimals)
    }`,
  );
  console.log(`  Mint Authority: ${mintAuthority}`);
  console.log(`  Your Balance  : ${ethers.formatUnits(balance, decimals)}`);

  console.log("Minting an additional 100 tokens to self...");
  const mintTx = await token.mint(wallet.address, ethers.parseUnits("100", decimals));
  await mintTx.wait();
  const newSupply = await token.totalSupply();
  console.log(`Mint tx hash: ${mintTx.hash}`);
  console.log(`New total supply: ${ethers.formatUnits(newSupply, decimals)}`);
}

// Helper function to query deployed tokens for an address
async function queryDeployedTokens(address) {
  const { PRIVATE_KEY } = process.env;
  const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
  const TOKEN_DEPLOYER_ADDRESS = "0xdB07D0EC6D29519aF2989C22Fe9B473e7a4303f1";
  
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing");
  }

  const deployerArtifact = require("../out/TokenDeployer.sol/TokenDeployer.json");
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const deployer = new ethers.Contract(TOKEN_DEPLOYER_ADDRESS, deployerArtifact.abi, wallet);
  
  console.log(`Querying tokens deployed by: ${address}`);
  const tokens = await deployer.getDeployedTokens(address);
  
  console.log(`\nTotal tokens deployed: ${tokens.length}`);
  if (tokens.length > 0) {
    console.log("\nToken addresses:");
    tokens.forEach((tokenAddr, index) => {
      console.log(`  ${index + 1}. ${tokenAddr}`);
    });
  } else {
    console.log("  No tokens found for this address.");
  }
  
  return tokens;
}

// Helper function to query all details for a specific token
async function queryTokenDetails(tokenAddress) {
  const { PRIVATE_KEY } = process.env;
  const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
  
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing");
  }

  const tokenArtifact = require("../out/Token.sol/Token.json");
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);
  
  console.log(`\nQuerying token details for: ${tokenAddress}\n`);
  
  try {
    const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.mintAuthority(),
    ]);
    
    console.log("═══════════════════════════════════════════════════");
    console.log("TOKEN METADATA");
    console.log("═══════════════════════════════════════════════════");
    console.log(`Name              : ${name}`);
    console.log(`Symbol            : ${symbol}`);
    console.log(`Decimals          : ${decimals}`);
    console.log(`Total Supply      : ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Max Supply        : ${maxSupply === 0n ? "Unlimited" : ethers.formatUnits(maxSupply, decimals) + " " + symbol}`);
    console.log(`Mint Authority    : ${mintAuthority}`);
    
    // Determine mint authority type
    let mintAuthType = "Unknown";
    if (mintAuthority === ethers.ZeroAddress) {
      mintAuthType = "Anyone can mint";
    } else {
      mintAuthType = `Specific address: ${mintAuthority}`;
    }
    console.log(`Mint Auth Type    : ${mintAuthType}`);
    
    console.log("═══════════════════════════════════════════════════");
    
    return {
      name,
      symbol,
      decimals,
      totalSupply,
      maxSupply,
      mintAuthority,
    };
  } catch (err) {
    console.error(`Error querying token: ${err.message}`);
    throw err;
  }
}

// Helper function to mint tokens
async function mintTokens(tokenAddress, recipientAddress, amount) {
  const { PRIVATE_KEY } = process.env;
  const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
  
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing");
  }

  const tokenArtifact = require("../out/Token.sol/Token.json");
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);
  
  console.log(`\nMinting tokens...`);
  console.log(`Token Address     : ${tokenAddress}`);
  console.log(`Recipient Address : ${recipientAddress}`);
  console.log(`Your Address      : ${wallet.address}`);
  
  // Get token info first
  try {
    const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.mintAuthority(),
    ]);
    
    console.log(`Token Name        : ${name} (${symbol})`);
    console.log(`Current Supply    : ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Max Supply        : ${maxSupply === 0n ? "Unlimited" : ethers.formatUnits(maxSupply, decimals) + " " + symbol}`);
    console.log(`Mint Authority    : ${mintAuthority === ethers.ZeroAddress ? "Anyone" : mintAuthority}`);
    
    // Check if caller is authorized
    if (mintAuthority !== ethers.ZeroAddress && mintAuthority !== wallet.address) {
      throw new Error(`You are not authorized to mint. Mint authority is: ${mintAuthority}`);
    }
    
    // Parse amount
    const amountToMint = ethers.parseUnits(amount, decimals);
    console.log(`Amount to Mint    : ${amount} ${symbol}`);
    
    // Check max supply
    if (maxSupply > 0n) {
      const newSupply = totalSupply + amountToMint;
      if (newSupply > maxSupply) {
        throw new Error(`Minting would exceed max supply. Current: ${ethers.formatUnits(totalSupply, decimals)}, Max: ${ethers.formatUnits(maxSupply, decimals)}, Attempting: ${ethers.formatUnits(amountToMint, decimals)}`);
      }
    }
    
    console.log(`\nSending mint transaction...`);
    const tx = await token.mint(recipientAddress, amountToMint);
    console.log(`Transaction hash  : ${tx.hash}`);
    console.log(`Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✓ Transaction confirmed!`);
    console.log(`  Block number    : ${receipt.blockNumber}`);
    console.log(`  Gas used        : ${receipt.gasUsed.toString()}`);
    
    // Get updated supply
    const newTotalSupply = await token.totalSupply();
    const recipientBalance = await token.balanceOf(recipientAddress);
    
    console.log(`\nUpdated Token Info:`);
    console.log(`  New Total Supply: ${ethers.formatUnits(newTotalSupply, decimals)} ${symbol}`);
    console.log(`  Recipient Balance: ${ethers.formatUnits(recipientBalance, decimals)} ${symbol}`);
    
    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      newTotalSupply,
      recipientBalance,
    };
  } catch (err) {
    console.error(`\n✗ Mint failed: ${err.message}`);
    throw err;
  }
}

// Check if script is being called with a query argument
if (process.argv[2] === "query" && process.argv[3]) {
  queryDeployedTokens(process.argv[3])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Query failed:", err);
      process.exit(1);
    });
} else if (process.argv[2] === "details" && process.argv[3]) {
  queryTokenDetails(process.argv[3])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Query failed:", err);
      process.exit(1);
    });
} else if (process.argv[2] === "mint" && process.argv[3] && process.argv[4] && process.argv[5]) {
  // Usage: node script/testTokenDeployer.js mint <tokenAddress> <recipientAddress> <amount>
  mintTokens(process.argv[3], process.argv[4], process.argv[5])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Mint failed:", err);
      process.exit(1);
    });
} else {
  main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
}

