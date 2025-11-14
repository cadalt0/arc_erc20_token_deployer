'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useWallet } from '@/contexts/wallet-context'
import { AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'
import { fetchDeployedTokens, type TokenInfo } from '@/lib/fetch-tokens'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { isConnected, address } = useWallet()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    if (!address) return

    setLoading(true)
    setError(null)

    try {
      const fetchedTokens = await fetchDeployedTokens(address, address)
      setTokens(fetchedTokens)
    } catch (err: any) {
      console.error('Failed to fetch tokens:', err)
      setError(err.message || 'Failed to load tokens')
      setTokens([])
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      loadTokens()
    } else {
      setTokens([])
    }
  }, [isConnected, address, loadTokens])

  if (!isConnected) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gradient-to-b from-background to-card">
          <div className="container mx-auto px-4 py-20">
            <Card className="bg-card/50 border-destructive/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <CardTitle>Wallet Not Connected</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Please connect your wallet to view your tokens.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    )
  }

  // Calculate stats
  const totalSupply = tokens.reduce((sum, token) => {
    return sum + parseFloat(token.totalSupply || '0')
  }, 0)

  const totalBalance = tokens.reduce((sum, token) => {
    return sum + parseFloat(token.balance || '0')
  }, 0)

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-background to-card relative">
        {/* Loading overlay with blur */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="w-8 h-8 text-emerald-400" />
              <p className="text-sm text-muted-foreground">Loading your tokens...</p>
            </div>
          </div>
        )}

        <div className={cn('container mx-auto px-4 py-8 md:py-16', loading && 'blur-sm pointer-events-none')}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Tokens</h1>
              <p className="text-muted-foreground mt-2">Manage and monitor your deployed tokens</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadTokens} disabled={loading} className="gap-2">
                <Spinner className={cn('w-4 h-4', !loading && 'hidden')} />
                Refresh
              </Button>
              <Link href="/deploy">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Deploy New Token
                </Button>
              </Link>
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

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-card/50 border-border/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{tokens.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Supply</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {totalSupply > 0 ? totalSupply.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Your Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {totalBalance > 0 ? totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Empty State */}
          {!loading && tokens.length === 0 ? (
            <Card className="bg-card/50 border-border/50 backdrop-blur">
              <CardContent className="py-20 text-center">
                <div className="space-y-4">
                  <p className="text-lg text-muted-foreground">No tokens deployed yet</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Get started by deploying your first token
                  </p>
                  <Link href="/deploy">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Deploy Your First Token
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {tokens.map((token) => (
                <Card
                  key={token.address}
                  className="bg-card/50 border-border/50 backdrop-blur hover:border-emerald-500/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{token.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                          {token.symbol} • {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </CardDescription>
                      </div>
                      <Link href={`/token/${token.address}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Supply</p>
                        <p className="text-sm mt-1 font-medium">
                          {parseFloat(token.totalSupply).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Supply</p>
                        <p className="text-sm mt-1 font-medium">{token.maxSupply}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Your Balance</p>
                        <p className="text-sm mt-1 font-medium">
                          {parseFloat(token.balance).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Decimals</p>
                        <p className="text-sm mt-1 font-medium">{token.decimals}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
