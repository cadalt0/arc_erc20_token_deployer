import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// TokenDeployer ABI - minimal interface for deployTokenSimple
const TOKEN_DEPLOYER_ABI = [
  'function deployTokenSimple(string memory name, string memory symbol, uint8 decimals, uint256 initialSupply, uint256 maxSupply, uint8 mintAuthorityType, address specificMintAuthority) external returns (address token)',
  'event TokenDeployed(address indexed token, address indexed deployer, string name, string symbol)',
]

// Token ABI - for verification
const TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function mintAuthority() external view returns (address)',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tokenName,
      tokenSymbol,
      decimals,
      initialSupply,
      maxSupply,
      mintAuthority,
      specificAddress,
      deploymentMode,
    } = body

    // Validation
    if (!tokenName || !tokenSymbol || !initialSupply) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenName, tokenSymbol, initialSupply' },
        { status: 400 }
      )
    }

    // Get environment variables
    const PRIVATE_KEY = process.env.PRIVATE_KEY
    const ARC_TESTNET_RPC_URL = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'
    const TOKEN_DEPLOYER_ADDRESS =
      process.env.TOKEN_DEPLOYER_ADDRESS || '0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf'

    if (!PRIVATE_KEY) {
      console.error('PRIVATE_KEY is missing from environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: PRIVATE_KEY not set' },
        { status: 500 }
      )
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

    console.log(`Using deployer wallet: ${wallet.address}`)
    console.log(`Using TokenDeployer at ${TOKEN_DEPLOYER_ADDRESS}`)

    // Connect to contract
    const deployer = new ethers.Contract(TOKEN_DEPLOYER_ADDRESS, TOKEN_DEPLOYER_ABI, wallet)

    // Parse mint authority type
    // 0 = OWNER, 1 = ANYONE, 2 = SPECIFIC
    // Note: When deploying without wallet (token-deployer mode), owner option should not be available
    // but we validate it here as a safety check
    if (deploymentMode === 'token-deployer' && mintAuthority === 'owner') {
      return NextResponse.json(
        { error: 'Owner mint authority is only available when deploying with a connected wallet' },
        { status: 400 }
      )
    }

    let mintAuthorityType = 1 // Default to ANYONE
    let specificMintAuthority = ethers.ZeroAddress

    // Enum mapping: 0=OWNER, 1=ANYONE, 2=SPECIFIC
    if (mintAuthority === 'owner') {
      mintAuthorityType = 0 // OWNER
      // For owner, use the deployer wallet address
      specificMintAuthority = wallet.address
    } else if (mintAuthority === 'specific') {
      mintAuthorityType = 2 // SPECIFIC
      if (!specificAddress || !ethers.isAddress(specificAddress)) {
        return NextResponse.json(
          { error: 'Invalid specific address for mint authority' },
          { status: 400 }
        )
      }
      specificMintAuthority = specificAddress
    } else {
      // ANYONE
      mintAuthorityType = 1
      specificMintAuthority = ethers.ZeroAddress
    }

    // Parse supply values
    const decimalsNum = parseInt(decimals) || 18
    const initialSupplyWei = ethers.parseUnits(initialSupply.toString(), decimalsNum)
    const maxSupplyWei = maxSupply
      ? ethers.parseUnits(maxSupply.toString(), decimalsNum)
      : ethers.parseUnits('0', decimalsNum) // 0 means unlimited

    // Prepare token parameters
    const tokenParams = {
      name: tokenName.trim(),
      symbol: tokenSymbol.trim().toUpperCase(),
      decimals: decimalsNum,
      initialSupply: initialSupplyWei,
      maxSupply: maxSupplyWei,
      mintAuthorityType,
      specificMintAuthority,
    }

    console.log('Deploying token with params:', {
      name: tokenParams.name,
      symbol: tokenParams.symbol,
      decimals: tokenParams.decimals,
      initialSupply: initialSupply,
      initialSupplyWei: tokenParams.initialSupply.toString(),
      maxSupply: maxSupply || 'Unlimited',
      maxSupplyWei: tokenParams.maxSupply.toString(),
      mintAuthorityType,
      specificMintAuthority,
      mintAuthority, // Original form value
    })

    // Predict token address
    let predictedTokenAddress: string
    try {
      predictedTokenAddress = await deployer.deployTokenSimple.staticCall(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.decimals,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.mintAuthorityType,
        tokenParams.specificMintAuthority
      )
      console.log(`Predicted token address: ${predictedTokenAddress}`)
    } catch (err: any) {
      console.log('Note: Could not predict token address:', err.message)
      predictedTokenAddress = ''
    }

    // Deploy token
    console.log('Sending deployment transaction...')
    const tx = await deployer.deployTokenSimple(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      tokenParams.initialSupply,
      tokenParams.maxSupply,
      tokenParams.mintAuthorityType,
      tokenParams.specificMintAuthority
    )

    console.log(`Transaction sent: ${tx.hash}`)
    const receipt = await tx.wait()

    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }

    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)

    // Extract token address from event
    let tokenAddress = predictedTokenAddress

    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = deployer.interface.parseLog(log)
          if (parsedLog && parsedLog.name === 'TokenDeployed') {
            tokenAddress = parsedLog.args.token
            console.log(`Token address from event: ${tokenAddress}`)
            break
          }
        } catch (err) {
          // Not our event, continue
        }
      }
    }

    // Fallback: try static call again if we don't have address
    if (!tokenAddress || tokenAddress === '') {
      try {
        tokenAddress = await deployer.deployTokenSimple.staticCall(
          tokenParams.name,
          tokenParams.symbol,
          tokenParams.decimals,
          tokenParams.initialSupply,
          tokenParams.maxSupply,
          tokenParams.mintAuthorityType,
          tokenParams.specificMintAuthority
        )
        console.log(`Token address from static call: ${tokenAddress}`)
      } catch (err: any) {
        throw new Error(`Could not determine token address: ${err.message}`)
      }
    }

    // Verify token deployment by reading contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)
    const [name, symbol, tokenDecimals, totalSupply, maxSupplyResult, mintAuthorityResult] =
      await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.maxSupply(),
        token.mintAuthority(),
      ])

    console.log('Token verified:')
    console.log(`  Name: ${name}`)
    console.log(`  Symbol: ${symbol}`)
    console.log(`  Decimals: ${tokenDecimals}`)
    console.log(`  Total Supply: ${ethers.formatUnits(totalSupply, tokenDecimals)}`)
    console.log(
      `  Max Supply: ${
        maxSupplyResult === BigInt(0) ? 'Unlimited' : ethers.formatUnits(maxSupplyResult, tokenDecimals)
      }`
    )
    console.log(`  Mint Authority: ${mintAuthorityResult}`)

    return NextResponse.json({
      success: true,
      tokenAddress,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      tokenInfo: {
        name,
        symbol,
        decimals: Number(tokenDecimals),
        totalSupply: ethers.formatUnits(totalSupply, tokenDecimals),
        maxSupply:
          maxSupplyResult === BigInt(0) ? 'Unlimited' : ethers.formatUnits(maxSupplyResult, tokenDecimals),
        mintAuthority: mintAuthorityResult,
      },
    })
  } catch (error: any) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Token deployment failed',
        details: error.reason || error.code,
      },
      { status: 500 }
    )
  }
}

