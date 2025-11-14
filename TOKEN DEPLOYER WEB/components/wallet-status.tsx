'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/contexts/wallet-context'
import { switchToArcTestnet, ARC_TESTNET } from '@/lib/wallet-deploy'
import { Copy, Zap, AlertCircle, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function WalletStatus() {
  const { address, chainId, disconnectWallet, isConnected } = useWallet()
  const [copied, setCopied] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getNetworkName = (chainId: number | null) => {
    const networks: Record<number, string> = {
      1: 'Ethereum',
      11155111: 'Sepolia',
      42161: 'Arbitrum One',
      534352: 'Scroll',
      84532: 'Base Sepolia',
      5042002: 'Arc Testnet',
    }
    return networks[chainId || 0] || 'Unknown'
  }

  const isArcTestnet = chainId === ARC_TESTNET.chainId
  const showNetworkWarning = isConnected && !isArcTestnet

  // Fetch USDC balance when connected to Arc Testnet
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address || !isArcTestnet || typeof window === 'undefined' || !window.ethereum) {
        setUsdcBalance(null)
        return
      }

      setLoadingBalance(true)
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(address)
        const formattedBalance = ethers.formatUnits(balance, 18) // USDC has 18 decimals on Arc Testnet
        setUsdcBalance(formattedBalance)
      } catch (error) {
        console.error('Failed to fetch USDC balance:', error)
        setUsdcBalance(null)
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [isConnected, address, isArcTestnet])

  const handleSwitchNetwork = async () => {
    try {
      setSwitching(true)
      await switchToArcTestnet()
      // Wait a moment for the chain change to be detected
      // The wallet context listener should pick it up automatically
      // But we'll also manually check after a short delay
      setTimeout(async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            const newChainId = await window.ethereum.request({
              method: 'eth_chainId',
            })
            const newChainIdNum = parseInt(newChainId, 16)
            // If still not updated, force a page refresh
            if (newChainIdNum !== ARC_TESTNET.chainId) {
              window.location.reload()
            }
          } catch (err) {
            // If check fails, reload to ensure state is correct
            window.location.reload()
          }
        }
      }, 1500)
    } catch (error: any) {
      console.error('Failed to switch network:', error)
      alert(error.message || 'Failed to switch to Arc Testnet')
      setSwitching(false)
    }
  }

  return (
    <Card className="bg-card/50 border-emerald-500/30 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          Wallet Connected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Address</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs flex-1 bg-muted/50 p-2 rounded">{address}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyAddress}
              className="gap-1"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-400 mt-1">Copied!</p>
          )}
        </div>

        <div className="border-t border-border/50 pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Network</p>
          
          {isArcTestnet ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-6 w-16">
                  <Image 
                    src="/arclogo.svg" 
                    alt="ARC logo" 
                    fill 
                    className="object-contain" 
                  />
                </span>
                <span className="text-sm font-medium">Testnet</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
              </div>
              <p className="text-xs text-emerald-400">✓ Connected to Arc Testnet</p>
            </div>
          ) : showNetworkWarning ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-destructive">Network Not Supported</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {getNetworkName(chainId)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSwitchNetwork}
                disabled={switching}
                size="sm"
                variant="outline"
                className="w-full gap-2"
              >
                {switching ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Switch to Arc Testnet
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm">{getNetworkName(chainId)}</p>
          )}
        </div>

        {/* USDC Balance - Only show on Arc Testnet */}
        {isArcTestnet && isConnected && address && (
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">USDC Balance</p>
            {loadingBalance ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : usdcBalance !== null ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {parseFloat(usdcBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  USDC
                </p>
                {parseFloat(usdcBalance) <= 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-400 mb-2">
                      You have no USDC. Get testnet USDC from the faucet:
                    </p>
                    <a
                      href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 underline"
                    >
                      Get USDC from Faucet
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to fetch balance</p>
            )}
          </div>
        )}

        <Button
          onClick={disconnectWallet}
          variant="outline"
          size="sm"
          className="w-full mt-4"
        >
          Disconnect
        </Button>
      </CardContent>
    </Card>
  )
}
