import { ethers } from 'ethers'
import { ARC_TESTNET, switchToArcTestnet } from './wallet-deploy'

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

export interface MintTokenParams {
  tokenAddress: string
  recipientAddress: string
  amount: string // Amount in human-readable format (e.g., "100")
}

export interface MintTokenResult {
  transactionHash: string
  blockNumber: number
  newTotalSupply: string
  recipientBalance: string
}

/**
 * Mint tokens using connected wallet
 */
export async function mintTokenWithWallet(
  params: MintTokenParams
): Promise<MintTokenResult> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  // Switch to Arc Testnet
  await switchToArcTestnet()

  // Get provider and signer
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const signerAddress = await signer.getAddress()

  console.log(`Minting with wallet: ${signerAddress}`)
  console.log(`Token Address: ${params.tokenAddress}`)
  console.log(`Recipient Address: ${params.recipientAddress}`)
  console.log(`Amount: ${params.amount}`)

  // Connect to token contract
  const token = new ethers.Contract(params.tokenAddress, TOKEN_ABI, signer)

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
  if (mintAuthority !== ethers.ZeroAddress && mintAuthority.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`You are not authorized to mint. Mint authority is: ${mintAuthority}`)
  }

  // Parse amount
  const amountToMint = ethers.parseUnits(params.amount, decimals)
  console.log(`Amount to Mint: ${params.amount} ${symbol} (${amountToMint.toString()} wei)`)

  // Check max supply
  if (maxSupply > 0n) {
    const newSupply = totalSupply + amountToMint
    if (newSupply > maxSupply) {
      throw new Error(
        `Minting would exceed max supply. Current: ${ethers.formatUnits(totalSupply, decimals)}, Max: ${ethers.formatUnits(maxSupply, decimals)}, Attempting: ${params.amount}`
      )
    }
  }

  // Send mint transaction
  console.log('Sending mint transaction...')
  const tx = await token.mint(params.recipientAddress, amountToMint)
  console.log(`Transaction hash: ${tx.hash}`)
  console.log('Waiting for confirmation...')

  const receipt = await tx.wait()
  if (!receipt) {
    throw new Error('Transaction receipt not found')
  }

  console.log(`✓ Transaction confirmed in block: ${receipt.blockNumber}`)

  // Get updated supply and recipient balance
  const newTotalSupply = await token.totalSupply()
  const recipientBalance = await token.balanceOf(params.recipientAddress)

  console.log(`New Total Supply: ${ethers.formatUnits(newTotalSupply, decimals)} ${symbol}`)
  console.log(`Recipient Balance: ${ethers.formatUnits(recipientBalance, decimals)} ${symbol}`)

  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    newTotalSupply: ethers.formatUnits(newTotalSupply, decimals),
    recipientBalance: ethers.formatUnits(recipientBalance, decimals),
  }
}

