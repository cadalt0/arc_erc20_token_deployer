import { ethers } from 'ethers'
import { ARC_TESTNET } from './wallet-deploy'

// TokenDeployer contract address
const TOKEN_DEPLOYER_ADDRESS = '0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf'

// TokenDeployer ABI - includes getDeployedTokens
const TOKEN_DEPLOYER_ABI = [
  'function getDeployedTokens(address deployer) external view returns (address[] memory)',
  'event TokenDeployed(address indexed token, address indexed deployer, string name, string symbol)',
]

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

export interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: string
  maxSupply: string
  mintAuthority: string
  balance: string
}

export interface TokenDetails extends Omit<TokenInfo, 'balance'> {
  balance?: string
  mintAuthorityType: 'owner' | 'anyone' | 'specific'
}

/**
 * Fetch deployed tokens for a given address
 */
export async function fetchDeployedTokens(
  deployerAddress: string,
  userAddress?: string
): Promise<TokenInfo[]> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  // Get provider
  const provider = new ethers.BrowserProvider(window.ethereum)

  // Connect to TokenDeployer contract
  const deployer = new ethers.Contract(TOKEN_DEPLOYER_ADDRESS, TOKEN_DEPLOYER_ABI, provider)

  console.log(`Fetching tokens deployed by: ${deployerAddress}`)

  // Get deployed token addresses
  const tokenAddresses: string[] = await deployer.getDeployedTokens(deployerAddress)

  console.log(`Found ${tokenAddresses.length} tokens`)

  if (tokenAddresses.length === 0) {
    return []
  }

  // Fetch details for each token
  const tokenPromises = tokenAddresses.map(async (tokenAddress) => {
    try {
      const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

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

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        maxSupply:
          maxSupply === 0n ? 'Unlimited' : ethers.formatUnits(maxSupply, decimals),
        mintAuthority,
        balance: userAddress ? ethers.formatUnits(balance, decimals) : '0',
      }
    } catch (error) {
      console.error(`Error fetching token ${tokenAddress}:`, error)
      // Return minimal info if we can't fetch details
      return {
        address: tokenAddress,
        name: 'Unknown',
        symbol: 'UNK',
        decimals: 18,
        totalSupply: '0',
        maxSupply: 'Unlimited',
        mintAuthority: ethers.ZeroAddress,
        balance: '0',
      }
    }
  })

  const tokens = await Promise.all(tokenPromises)

  return tokens
}

/**
 * Fetch deployed tokens using RPC provider (for server-side or without wallet)
 */
export async function fetchDeployedTokensRPC(
  deployerAddress: string,
  rpcUrl: string = ARC_TESTNET.rpcUrls[0]
): Promise<TokenInfo[]> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)

  // Connect to TokenDeployer contract
  const deployer = new ethers.Contract(TOKEN_DEPLOYER_ADDRESS, TOKEN_DEPLOYER_ABI, provider)

  console.log(`Fetching tokens deployed by: ${deployerAddress}`)

  // Get deployed token addresses
  const tokenAddresses: string[] = await deployer.getDeployedTokens(deployerAddress)

  console.log(`Found ${tokenAddresses.length} tokens`)

  if (tokenAddresses.length === 0) {
    return []
  }

  // Fetch details for each token
  const tokenPromises = tokenAddresses.map(async (tokenAddress) => {
    try {
      const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider)

      const [name, symbol, decimals, totalSupply, maxSupply, mintAuthority] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.maxSupply(),
        token.mintAuthority(),
      ])

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        maxSupply:
          maxSupply === 0n ? 'Unlimited' : ethers.formatUnits(maxSupply, decimals),
        mintAuthority,
        balance: '0', // Can't get balance without user address
      }
    } catch (error) {
      console.error(`Error fetching token ${tokenAddress}:`, error)
      // Return minimal info if we can't fetch details
      return {
        address: tokenAddress,
        name: 'Unknown',
        symbol: 'UNK',
        decimals: 18,
        totalSupply: '0',
        maxSupply: 'Unlimited',
        mintAuthority: ethers.ZeroAddress,
        balance: '0',
      }
    }
  })

  const tokens = await Promise.all(tokenPromises)

  return tokens
}
