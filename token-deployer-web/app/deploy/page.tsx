'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import DeploymentForm from '@/components/deployment-form'
import WalletStatus from '@/components/wallet-status'
import { cn } from '@/lib/utils'

export default function DeployPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timeout = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(timeout)
  }, [])

  const animationClass = cn(
    'transform-gpu transition-all duration-700 ease-out',
    mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95',
  )

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-background to-card">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className={cn('grid gap-8 lg:grid-cols-3', animationClass)}>
            {/* Form Section */}
            <div className="lg:col-span-2">
              <Card className="bg-background/80 border-emerald-400/60 shadow-[0_10px_60px_-30px_rgba(16,185,129,0.8)] ring-1 ring-emerald-500/30 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle>Deploy New Token</CardTitle>
                  <CardDescription>
                    Create a custom ERC20 token with your specified parameters. Choose how you want the deployment to be authorized directly within the form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <DeploymentForm />
                  <p className="text-xs text-muted-foreground">
                    Note: Selecting the Token Deployer key will deploy automatically using the platform signer even if no wallet is connected.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <WalletStatus />

              <Card className="bg-background/70 border-emerald-500/30 shadow-[0_20px_50px_-25px_rgba(16,185,129,0.5)] ring-1 ring-emerald-500/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-base">Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Token Name</p>
                    <p className="text-xs text-muted-foreground">Full name of your token (e.g., "MyToken")</p>
                  </div>
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Symbol</p>
                    <p className="text-xs text-muted-foreground">Ticker symbol, typically 3-5 characters (e.g., "MTK")</p>
                  </div>
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Decimals</p>
                    <p className="text-xs text-muted-foreground">Standard is 18 (same as Ethereum)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
