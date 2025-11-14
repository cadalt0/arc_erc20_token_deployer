import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// Token ABI - for minting
const TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function mintAuthority() external view returns (address)',
  'function balanceOf(address account) external view returns (uint256)',
  'function mint(address to, uint256 amount) external',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenAddress, recipientAddress, amount } = body

    // Validation
    if (!tokenAddress || !recipientAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenAddress, recipientAddress, amount' },
        { status: 400 }
      )
    }

    // Validate addresses
    if (!ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid token address' },
        { status: 400 }
      )
    }

    if (!ethers.isAddress(recipientAddress)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      )
    }

    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      )
    }

    // Get environment variables
    const PRIVATE_KEY = process.env.PRIVATE_KEY
    const ARC_TESTNET_RPC_URL = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network'

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
    console.log(`Token Address: ${tokenAddress}`)
    console.log(`Recipient Address: ${recipientAddress}`)
    console.log(`Amount: ${amount}`)

    // Connect to token contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet)

    // Get token info first
    const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.mintAuthority(),
    ])

    console.log(`Token Name: ${name} (${symbol})`)
    console.log(`Current Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`)
    console.log(`Max Supply: ${maxSupply === 0n ? 'Unlimited' : ethers.formatUnits(maxSupply, decimals)} ${symbol}`)
    console.log(`Mint Authority: ${mintAuthority === ethers.ZeroAddress ? 'Anyone' : mintAuthority}`)

    // Check if caller is authorized
    if (mintAuthority !== ethers.ZeroAddress && mintAuthority.toLowerCase() !== wallet.address.toLowerCase()) {
      return NextResponse.json(
        { error: `You are not authorized to mint. Mint authority is: ${mintAuthority}` },
        { status: 403 }
      )
    }

    // Parse amount
    const amountToMint = ethers.parseUnits(amount, decimals)
    console.log(`Amount to Mint: ${amount} ${symbol} (${amountToMint.toString()} wei)`)

    // Check max supply
    if (maxSupply > 0n) {
      const newSupply = totalSupply + amountToMint
      if (newSupply > maxSupply) {
        return NextResponse.json(
          {
            error: `Minting would exceed max supply. Current: ${ethers.formatUnits(totalSupply, decimals)}, Max: ${ethers.formatUnits(maxSupply, decimals)}, Attempting: ${amount}`,
          },
          { status: 400 }
        )
      }
    }

    // Send mint transaction
    console.log('Sending mint transaction...')
    const tx = await token.mint(recipientAddress, amountToMint)
    console.log(`Transaction hash: ${tx.hash}`)
    console.log('Waiting for confirmation...')

    const receipt = await tx.wait()
    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }

    console.log(`✓ Transaction confirmed in block: ${receipt.blockNumber}`)

    // Get updated supply and recipient balance
    const newTotalSupply = await token.totalSupply()
    const recipientBalance = await token.balanceOf(recipientAddress)

    console.log(`New Total Supply: ${ethers.formatUnits(newTotalSupply, decimals)} ${symbol}`)
    console.log(`Recipient Balance: ${ethers.formatUnits(recipientBalance, decimals)} ${symbol}`)

    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals),
      recipientBalance: ethers.formatUnits(recipientBalance, decimals),
    })
  } catch (error: any) {
    console.error('Mint error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Token minting failed',
        details: error.reason || error.code,
      },
      { status: 500 }
    )
  }
}

