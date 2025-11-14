import { ethers } from 'ethers'
import { ARC_TESTNET } from './wallet-deploy'

// Token ABI - for fetching token details
const TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function maxSupply() external view returns (uint256)',
  'function mintAuthority() external view returns (address)',
  'function balanceOf(address account) external view returns (uint256)',
]

export interface TokenDetails {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  maxSupply: string
  mintAuthority: string
  balance?: string
  mintAuthorityType: 'owner' | 'anyone' | 'specific'
}

/**
 * Fetch detailed information for a specific token address
 */
export async function fetchTokenDetails(
  tokenAddress: string,
  userAddress?: string
): Promise<TokenDetails> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  // Get provider
  const provider = new ethers.BrowserProvider(window.ethereum)

  // Connect to token contract
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

  console.log(`Fetching token details for: ${tokenAddress}`)

  try {
    const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority, balance] =
      await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.maxSupply(),
        token.mintAuthority(),
        userAddress ? token.balanceOf(userAddress) : Promise.resolve(0n),
      ])

    // Determine mint authority type
    let mintAuthorityType: 'owner' | 'anyone' | 'specific' = 'anyone'
    if (mintAuthority === ethers.ZeroAddress) {
      mintAuthorityType = 'anyone'
    } else {
      // Check if it's the owner (user's address) or a specific address
      if (userAddress && mintAuthority.toLowerCase() === userAddress.toLowerCase()) {
        mintAuthorityType = 'owner'
      } else {
        mintAuthorityType = 'specific'
      }
    }

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      maxSupply: maxSupply === 0n ? 'Unlimited' : ethers.formatUnits(maxSupply, decimals),
      mintAuthority,
      balance: userAddress ? ethers.formatUnits(balance, decimals) : undefined,
      mintAuthorityType,
    }
  } catch (error) {
    console.error(`Error fetching token details:`, error)
    throw new Error(`Failed to fetch token details: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetch token details using RPC provider (for server-side or without wallet)
 */
export async function fetchTokenDetailsRPC(
  tokenAddress: string,
  rpcUrl: string = ARC_TESTNET.rpcUrls[0]
): Promise<TokenDetails> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)

  // Connect to token contract
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

  console.log(`Fetching token details for: ${tokenAddress}`)

  try {
    const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.mintAuthority(),
    ])

    // Determine mint authority type
    let mintAuthorityType: 'owner' | 'anyone' | 'specific' = 'anyone'
    if (mintAuthority === ethers.ZeroAddress) {
      mintAuthorityType = 'anyone'
    } else {
      mintAuthorityType = 'specific'
    }

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      maxSupply: maxSupply === 0n ? 'Unlimited' : ethers.formatUnits(maxSupply, decimals),
      mintAuthority,
      mintAuthorityType,
    }
  } catch (error) {
    console.error(`Error fetching token details:`, error)
    throw new Error(`Failed to fetch token details: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

