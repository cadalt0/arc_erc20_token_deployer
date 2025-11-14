'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useWallet } from '@/contexts/wallet-context'
import { Copy, ExternalLink, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { fetchTokenDetails, fetchTokenDetailsRPC, type TokenDetails } from '@/lib/fetch-token-details'
import { cn } from '@/lib/utils'
import { ARC_TESTNET } from '@/lib/wallet-deploy'
import { MintDialog } from '@/components/mint-dialog'

export default function TokenDetailsPage() {
  const { isConnected, address: userAddress } = useWallet()
  const params = useParams()
  const tokenAddress = params.address as string
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mintDialogOpen, setMintDialogOpen] = useState(false)

  const loadTokenDetails = useCallback(async () => {
    if (!tokenAddress) return

    setLoading(true)
    setError(null)

    try {
      let details: TokenDetails
      // Try with wallet first, fallback to RPC if no wallet
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          details = await fetchTokenDetails(tokenAddress, userAddress || undefined)
        } catch (walletError) {
          // Fallback to RPC if wallet fails
          console.log('Wallet fetch failed, trying RPC:', walletError)
          details = await fetchTokenDetailsRPC(tokenAddress)
        }
      } else {
        // No wallet, use RPC
        details = await fetchTokenDetailsRPC(tokenAddress)
      }
      setTokenDetails(details)
    } catch (err: any) {
      console.error('Failed to fetch token details:', err)
      setError(err.message || 'Failed to load token details')
      setTokenDetails(null)
    } finally {
      setLoading(false)
    }
  }, [tokenAddress, userAddress])

  useEffect(() => {
    loadTokenDetails()
  }, [loadTokenDetails])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getMintAuthorityLabel = () => {
    if (!tokenDetails) return 'Unknown'
    switch (tokenDetails.mintAuthorityType) {
      case 'owner':
        return 'Owner'
      case 'anyone':
        return 'Anyone'
      case 'specific':
        return 'Specific Address'
      default:
        return 'Unknown'
    }
  }

  const getMintAuthorityDescription = () => {
    if (!tokenDetails) return ''
    switch (tokenDetails.mintAuthorityType) {
      case 'owner':
        return 'Only the owner address can mint new tokens'
      case 'anyone':
        return 'Anyone can mint new tokens'
      case 'specific':
        return `Only ${tokenDetails.mintAuthority.slice(0, 6)}...${tokenDetails.mintAuthority.slice(-4)} can mint`
      default:
        return ''
    }
  }

  const getBalancePercentage = () => {
    if (!tokenDetails || !tokenDetails.balance || !tokenDetails.totalSupply) return '0'
    const balance = parseFloat(tokenDetails.balance)
    const supply = parseFloat(tokenDetails.totalSupply)
    if (supply === 0) return '0'
    return ((balance / supply) * 100).toFixed(2)
  }

  const explorerUrl = `https://testnet.arcscan.app/token/${tokenAddress}`
  
  // Exception address that allows any connected wallet to perform actions
  const EXCEPTION_MINT_AUTHORITY = '0xA93E963Af221e9fe5215C18Ee14588C8119266FE'
  
  // Check if actions are allowed for the connected wallet
  const canPerformActions = () => {
    if (!tokenDetails) return false
    
    // If mint authority is ZeroAddress (Anyone), allow anyone to mint
    if (tokenDetails.mintAuthority === '0x0000000000000000000000000000000000000000' || 
        tokenDetails.mintAuthorityType === 'anyone') {
      return true
    }
    
    // If not connected, only allow if mint authority is Anyone
    if (!isConnected || !userAddress) return false
    
    // Exception: if mint authority is the exception address, allow any connected wallet
    if (tokenDetails.mintAuthority.toLowerCase() === EXCEPTION_MINT_AUTHORITY.toLowerCase()) {
      return true
    }
    
    // Otherwise, only allow if user's address matches mint authority
    return userAddress.toLowerCase() === tokenDetails.mintAuthority.toLowerCase()
  }
  
  const actionsAllowed = canPerformActions()

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-background to-card relative">
        {/* Loading overlay with blur */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="w-8 h-8 text-emerald-400" />
              <p className="text-sm text-muted-foreground">Loading token details...</p>
            </div>
          </div>
        )}

        <div className={cn('container mx-auto px-4 py-8 md:py-16', loading && 'blur-sm pointer-events-none')}>
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-bold">Token Details</h1>
              <Button variant="outline" onClick={loadTokenDetails} disabled={loading} className="gap-2">
                <Spinner className={cn('w-4 h-4', !loading && 'hidden')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Card className="bg-destructive/10 border-destructive/50 backdrop-blur mb-8">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {tokenDetails && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Token Information */}
                <Card className="bg-white/5 border border-white/20 backdrop-blur shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)]">
                  <CardHeader>
                    <CardTitle>Token Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Name</p>
                        <p className="text-lg font-semibold">{tokenDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Symbol</p>
                        <p className="text-lg font-semibold">{tokenDetails.symbol}</p>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Address</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm flex-1 break-all">{tokenAddress}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => copyToClipboard(tokenAddress)}
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => window.open(explorerUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-6 grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Decimals</p>
                        <p className="text-lg font-semibold">{tokenDetails.decimals}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Total Supply</p>
                        <p className="text-lg font-semibold">
                          {parseFloat(tokenDetails.totalSupply).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{' '}
                          {tokenDetails.symbol}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Max Supply</p>
                      <p className="text-lg font-semibold">
                        {tokenDetails.maxSupply === 'Unlimited'
                          ? 'Unlimited'
                          : `${parseFloat(tokenDetails.maxSupply).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })} ${tokenDetails.symbol}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>

              {/* Actions */}
              <Card className="bg-white/5 border border-white/20 backdrop-blur shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)]">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  {!actionsAllowed && (!tokenDetails || tokenDetails.mintAuthorityType !== 'anyone') ? (
                    <div className="space-y-3">
                      {!isConnected ? (
                        <div className="p-4 rounded-lg bg-muted/50 border border-muted">
                          <p className="text-sm text-muted-foreground text-center">
                            Connect your wallet to perform actions
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                          <p className="text-sm text-destructive text-center">
                            Only the mint authority address can perform actions
                          </p>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Your address: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                          </p>
                        </div>
                      )}
                      <Button className="w-full gap-2" variant="outline" disabled>
                        <ArrowRight className="w-4 h-4" />
                        Mint Tokens
                      </Button>
                      <Button className="w-full gap-2" variant="outline" disabled>
                        <ArrowRight className="w-4 h-4" />
                        Update Authority
                      </Button>
                    </div>
                  ) : !actionsAllowed && tokenDetails?.mintAuthorityType === 'anyone' ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <p className="text-sm text-emerald-400">
                            Anyone can mint tokens
                          </p>
                        </div>
                      </div>
                      <Button className="w-full gap-2" variant="outline" onClick={() => setMintDialogOpen(true)}>
                        <ArrowRight className="w-4 h-4" />
                        Mint Tokens
                      </Button>
                      <Button className="w-full gap-2" variant="outline" disabled>
                        <ArrowRight className="w-4 h-4" />
                        Update Authority
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <p className="text-sm text-emerald-400">
                            You have permission to perform actions
                          </p>
                        </div>
                      </div>
                      <Button className="w-full gap-2" variant="outline" onClick={() => setMintDialogOpen(true)}>
                        <ArrowRight className="w-4 h-4" />
                        Mint Tokens
                      </Button>
                      <Button className="w-full gap-2" variant="outline">
                        <ArrowRight className="w-4 h-4" />
                        Update Authority
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {isConnected && userAddress && (
                  <Card className="bg-white/5 border border-white/20 backdrop-blur shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)]">
                    <CardHeader>
                      <CardTitle className="text-base">Your Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {tokenDetails.balance
                          ? parseFloat(tokenDetails.balance).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : '0'}{' '}
                        {tokenDetails.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {getBalancePercentage()}% of total supply
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-white/5 border border-white/20 backdrop-blur shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)]">
                  <CardHeader>
                    <CardTitle className="text-base">Mint Authority</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={cn(
                        'inline-block px-2 py-1 rounded border',
                        tokenDetails.mintAuthorityType === 'owner' &&
                          'bg-emerald-500/10 border-emerald-500/30',
                        tokenDetails.mintAuthorityType === 'anyone' &&
                          'bg-blue-500/10 border-blue-500/30',
                        tokenDetails.mintAuthorityType === 'specific' &&
                          'bg-yellow-500/10 border-yellow-500/30'
                      )}
                    >
                      <p
                        className={cn(
                          'text-xs font-medium',
                          tokenDetails.mintAuthorityType === 'owner' && 'text-emerald-400',
                          tokenDetails.mintAuthorityType === 'anyone' && 'text-blue-400',
                          tokenDetails.mintAuthorityType === 'specific' && 'text-yellow-400'
                        )}
                      >
                        {getMintAuthorityLabel()}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{getMintAuthorityDescription()}</p>
                    <div className="border-t border-white/20 pt-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Mint Authority Address</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs flex-1 break-all text-foreground">
                          {tokenDetails.mintAuthorityType === 'anyone'
                            ? '0x0000000000000000000000000000000000000000 (Anyone)'
                            : tokenDetails.mintAuthority}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2 h-6 px-2"
                          onClick={() => copyToClipboard(tokenDetails.mintAuthority)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border border-white/20 backdrop-blur shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)]">
                  <CardHeader>
                    <CardTitle className="text-base">Network</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Chain</p>
                      <p className="text-sm mt-1">{ARC_TESTNET.chainName}</p>
                    </div>
                    <div className="border-t border-border/50 pt-4">
                      <p className="text-xs text-muted-foreground">Chain ID</p>
                      <p className="text-sm mt-1">{ARC_TESTNET.chainId}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mint Dialog */}
      {tokenDetails && (
        <MintDialog
          open={mintDialogOpen}
          onOpenChange={setMintDialogOpen}
          tokenAddress={tokenAddress}
          tokenSymbol={tokenDetails.symbol}
          tokenDecimals={tokenDetails.decimals}
          mintAuthority={tokenDetails.mintAuthority}
          onSuccess={() => {
            // Reload token details after successful mint
            loadTokenDetails()
          }}
        />
      )}
    </>
  )
}
