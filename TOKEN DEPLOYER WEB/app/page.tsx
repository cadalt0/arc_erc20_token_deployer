'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Zap } from 'lucide-react'
import Navigation from '@/components/navigation'
import { useWallet } from '@/contexts/wallet-context'

const NeonScene = dynamic(
  () => import('@/components/ui/neon-raymarcher').then((mod) => mod.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Initializing renderer...
      </div>
    ),
  },
)

export default function Home() {
  const { isConnected, connectWallet } = useWallet()

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-background to-card">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight">
                  Deploy Zero-Code ERC20 Tokens on{' '}
                  <span className="inline-flex items-center gap-3">
                    <span className="relative inline-flex h-10 w-28 md:h-12 md:w-36">
                      <Image src="/arclogo.svg" alt="ARC logo" fill className="object-contain" priority />
                    </span>
                    Testnet
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl">
                  Launch and manage ERC20 tokens instantly using our ARC Testnet deployment flow no contracts, no coding, full control over your parameters.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {isConnected ? (
                  <>
                    <Link href="/deploy">
                      <Button size="lg" className="gap-2">
                        Deploy New Token
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button size="lg" variant="outline">
                        View My Tokens
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button
                      size="lg"
                      onClick={connectWallet}
                      className="gap-3 px-10 py-6 text-xl"
                    >
                      Connect Wallet
                      <Zap className="w-4 h-4" />
                    </Button>
                    <Link href="/deploy" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-2 px-10 py-6 text-xl"
                      >
                        Deploy Token
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-[36rem] aspect-square overflow-hidden rounded-3xl">
                <NeonScene />
              </div>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
