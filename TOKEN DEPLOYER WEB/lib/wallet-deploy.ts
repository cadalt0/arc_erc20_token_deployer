import { ethers } from 'ethers'

// Arc Testnet configuration
export const ARC_TESTNET = {
  chainId: 5042002,
  chainName: 'Arc Testnet',
  rpcUrls: ['https://rpc.testnet.arc.network'],
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
}

// TokenDeployer contract address
const TOKEN_DEPLOYER_ADDRESS = '0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf'

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

export interface DeployTokenParams {
  tokenName: string
  tokenSymbol: string
  decimals: number
  initialSupply: string
  maxSupply: string
  mintAuthority: 'owner' | 'anyone' | 'specific'
  specificAddress?: string
}

export interface DeployTokenResult {
  tokenAddress: string
  transactionHash: string
  blockNumber: number
  tokenInfo: {
    name: string
    symbol: string
    decimals: number
    totalSupply: string
    maxSupply: string
    mintAuthority: string
  }
}

/**
 * Switch to Arc Testnet if not already connected
 */
export async function switchToArcTestnet(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  try {
    // Check current chain
    const currentChainId = await window.ethereum.request({
      method: 'eth_chainId',
    })

    const currentChainIdNum = parseInt(currentChainId, 16)

    // If already on Arc Testnet, return
    if (currentChainIdNum === ARC_TESTNET.chainId) {
      return
    }

    // Switch to Arc Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${ARC_TESTNET.chainId.toString(16)}` }],
    })
  } catch (switchError: any) {
    // If chain doesn't exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${ARC_TESTNET.chainId.toString(16)}`,
              chainName: ARC_TESTNET.chainName,
              rpcUrls: ARC_TESTNET.rpcUrls,
              nativeCurrency: ARC_TESTNET.nativeCurrency,
            },
          ],
        })
      } catch (addError) {
        throw new Error('Failed to add Arc Testnet to wallet')
      }
    } else {
      throw new Error('Failed to switch to Arc Testnet')
    }
  }
}

/**
 * Deploy token using connected wallet
 */
export async function deployTokenWithWallet(
  params: DeployTokenParams
): Promise<DeployTokenResult> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }

  // Switch to Arc Testnet
  await switchToArcTestnet()

  // Get provider and signer
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const signerAddress = await signer.getAddress()

  console.log(`Deploying with wallet: ${signerAddress}`)
  console.log(`Using TokenDeployer at ${TOKEN_DEPLOYER_ADDRESS}`)

  // Connect to TokenDeployer contract
  const deployer = new ethers.Contract(
    TOKEN_DEPLOYER_ADDRESS,
    TOKEN_DEPLOYER_ABI,
    signer
  )

  // Parse mint authority type
  // Enum mapping: 0=OWNER, 1=ANYONE, 2=SPECIFIC
  let mintAuthorityType = 1 // Default to ANYONE
  let specificMintAuthority = ethers.ZeroAddress

  if (params.mintAuthority === 'owner') {
    mintAuthorityType = 0 // OWNER
    // For owner, use the signer's address
    specificMintAuthority = signerAddress
  } else if (params.mintAuthority === 'specific') {
    mintAuthorityType = 2 // SPECIFIC
    if (!params.specificAddress || !ethers.isAddress(params.specificAddress)) {
      throw new Error('Invalid specific address for mint authority')
    }
    specificMintAuthority = params.specificAddress
  } else {
    // ANYONE
    mintAuthorityType = 1
    specificMintAuthority = ethers.ZeroAddress
  }

  // Parse supply values
  const decimalsNum = params.decimals || 18
  const initialSupplyWei = ethers.parseUnits(params.initialSupply, decimalsNum)
  const maxSupplyWei = params.maxSupply
    ? ethers.parseUnits(params.maxSupply, decimalsNum)
    : ethers.parseUnits('0', decimalsNum) // 0 means unlimited

  console.log('Deploying token with params:', {
    name: params.tokenName,
    symbol: params.tokenSymbol,
    decimals: decimalsNum,
    initialSupply: params.initialSupply,
    maxSupply: params.maxSupply || 'Unlimited',
    mintAuthorityType,
    specificMintAuthority,
  })

  // Predict token address
  let predictedTokenAddress: string
  try {
    predictedTokenAddress = await deployer.deployTokenSimple.staticCall(
      params.tokenName.trim(),
      params.tokenSymbol.trim().toUpperCase(),
      decimalsNum,
      initialSupplyWei,
      maxSupplyWei,
      mintAuthorityType,
      specificMintAuthority
    )
    console.log(`Predicted token address: ${predictedTokenAddress}`)
  } catch (err: any) {
    console.log('Note: Could not predict token address:', err.message)
    predictedTokenAddress = ''
  }

  // Deploy token (this will trigger wallet to sign)
  console.log('Sending deployment transaction...')
  const tx = await deployer.deployTokenSimple(
    params.tokenName.trim(),
    params.tokenSymbol.trim().toUpperCase(),
    decimalsNum,
    initialSupplyWei,
    maxSupplyWei,
    mintAuthorityType,
    specificMintAuthority
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
        params.tokenName.trim(),
        params.tokenSymbol.trim().toUpperCase(),
        decimalsNum,
        initialSupplyWei,
        maxSupplyWei,
        mintAuthorityType,
        specificMintAuthority
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
      maxSupplyResult === 0n ? 'Unlimited' : ethers.formatUnits(maxSupplyResult, tokenDecimals)
    }`
  )
  console.log(`  Mint Authority: ${mintAuthorityResult}`)

  return {
    tokenAddress,
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    tokenInfo: {
      name,
      symbol,
      decimals: Number(tokenDecimals),
      totalSupply: ethers.formatUnits(totalSupply, tokenDecimals),
      maxSupply:
        maxSupplyResult === 0n ? 'Unlimited' : ethers.formatUnits(maxSupplyResult, tokenDecimals),
      mintAuthority: mintAuthorityResult,
    },
  }
}

