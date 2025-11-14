'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useWallet } from '@/contexts/wallet-context'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navigation() {
  const { isConnected, address, connectWallet, disconnectWallet } = useWallet()
  const [isOpen, setIsOpen] = useState(false)

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 font-bold text-2xl">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-emerald-500/10">
              <Image
                src="/logo.png"
                alt="Token Deployer logo"
                fill
                className="object-contain p-1.5"
                priority
              />
            </div>
            <span className="hidden sm:inline">Token Deployer</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-lg">
            {isConnected && (
              <>
                <Link href="/deploy" className="hover:text-emerald-400 transition-colors">
                  Deploy
                </Link>
                <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Wallet Button */}
          <div className="hidden md:flex">
            {isConnected ? (
              <Button
                onClick={disconnectWallet}
                variant="outline"
                size="sm"
              >
                {truncateAddress(address!)}
              </Button>
            ) : (
              <Button
                onClick={connectWallet}
                size="sm"
                className="px-6 py-3 text-base"
              >
                Connect Wallet
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 space-y-4 pb-4">
            {isConnected && (
              <>
                <Link href="/deploy" className="block text-lg font-semibold hover:text-emerald-400 transition-colors">
                  Deploy
                </Link>
                <Link href="/dashboard" className="block text-lg font-semibold hover:text-emerald-400 transition-colors">
                  Dashboard
                </Link>
              </>
            )}
            <div className="pt-4 border-t border-border/50">
              {isConnected ? (
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {truncateAddress(address!)}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  size="sm"
                  className="w-full px-6 py-3 text-base"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
