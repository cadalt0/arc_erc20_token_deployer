'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface WalletContextType {
  isConnected: boolean
  address: string | null
  chainId: number | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        })
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        })

        setAddress(accounts[0])
        setChainId(parseInt(chainId, 16))
        setIsConnected(true)

        // Listen for account changes
        window.ethereum.on?.('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setAddress(accounts[0])
          } else {
            setIsConnected(false)
            setAddress(null)
            setChainId(null)
          }
        })

        // Listen for chain changes
        window.ethereum.on?.('chainChanged', (chainId: string) => {
          setChainId(parseInt(chainId, 16))
        })
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setIsConnected(false)
    setAddress(null)
    setChainId(null)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
