'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { useWallet } from '@/contexts/wallet-context'
import { CheckCircle2, XCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { mintTokenWithWallet } from '@/lib/wallet-mint'
import { cn } from '@/lib/utils'

interface MintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  mintAuthority: string
  onSuccess?: () => void
}

type RecipientMode = 'connected' | 'other'
type MintMode = 'wallet' | 'backend'

export function MintDialog({
  open,
  onOpenChange,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  mintAuthority,
  onSuccess,
}: MintDialogProps) {
  const { isConnected, address: userAddress } = useWallet()
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('connected')
  const [mintMode, setMintMode] = useState<MintMode>('wallet')
  const [otherAddress, setOtherAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    txHash: string
    blockNumber: number
    newTotalSupply: string
    recipientBalance: string
  } | null>(null)

  // Exception address that should only allow backend minting
  const EXCEPTION_MINT_AUTHORITY = '0xA93E963Af221e9fe5215C18Ee14588C8119266FE'
  const isExceptionAddress = mintAuthority.toLowerCase() === EXCEPTION_MINT_AUTHORITY.toLowerCase()
  const isAnyoneMint = mintAuthority === '0x0000000000000000000000000000000000000000' || 
                       mintAuthority === ethers.ZeroAddress

  // Initialize mint mode based on wallet connection and mint authority
  useEffect(() => {
    if (open) {
      // If exception address, force backend mode
      if (isExceptionAddress) {
        setMintMode('backend')
      } else {
        setMintMode(isConnected ? 'wallet' : 'backend')
      }
      setRecipientMode(isConnected ? 'connected' : 'other')
    }
  }, [open, isConnected, isExceptionAddress])

  const inputClasses =
    'border border-white/20 bg-white/5 focus-visible:border-white/60 focus-visible:ring-[3px] focus-visible:ring-white/30 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.9)]'

  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const recipientAddress = recipientMode === 'connected' ? userAddress : otherAddress

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      setError('Please enter a valid recipient address')
      return
    }

    if (mintMode === 'wallet' && !isConnected) {
      setError('Please connect your wallet to mint with wallet')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mintMode === 'wallet') {
        // Mint using connected wallet
        const result = await mintTokenWithWallet({
          tokenAddress,
          recipientAddress,
          amount,
        })
        setSuccess(result)
        if (onSuccess) onSuccess()
      } else {
        // Mint using backend API
        const response = await fetch('/api/mint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokenAddress,
            recipientAddress,
            amount,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Minting failed')
        }

        setSuccess({
          txHash: data.transactionHash,
          blockNumber: data.blockNumber,
          newTotalSupply: data.newTotalSupply,
          recipientBalance: data.recipientBalance,
        })
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      console.error('Mint error:', err)
      setError(err.message || 'Failed to mint tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(null)
      setAmount('')
      setOtherAddress('')
      setRecipientMode('connected')
      setMintMode(isConnected ? 'wallet' : 'backend')
      onOpenChange(false)
    }
  }

  const explorerUrl = `https://testnet.arcscan.app/tx/${success?.txHash}`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mint Tokens</DialogTitle>
          <DialogDescription>
            Mint new {tokenSymbol} tokens to a recipient address
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">Mint Successful!</p>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Transaction Hash:</p>
                  <p className="font-mono text-xs break-all">{success.txHash}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Block Number:</p>
                  <p>{success.blockNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">New Total Supply:</p>
                  <p>{parseFloat(success.newTotalSupply).toLocaleString()} {tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recipient Balance:</p>
                  <p>{parseFloat(success.recipientBalance).toLocaleString()} {tokenSymbol}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </Button>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recipient Address Selection */}
            <div className="space-y-3">
              <Label>Recipient Address</Label>
              <RadioGroup
                value={recipientMode}
                onValueChange={(value) => setRecipientMode(value as RecipientMode)}
                disabled={loading}
                className="space-y-3"
              >
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50',
                    !isConnected && 'opacity-40 pointer-events-none',
                  )}
                >
                  <RadioGroupItem
                    value="connected"
                    id="connected"
                    disabled={!isConnected || loading}
                    className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                  <Label htmlFor="connected" className="cursor-pointer font-normal flex-1">
                    Connected Wallet Address
                    {isConnected && userAddress && (
                      <span className="block text-xs text-muted-foreground font-mono mt-1">
                        {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                      </span>
                    )}
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50">
                  <RadioGroupItem
                    value="other"
                    id="other"
                    disabled={loading}
                    className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                  <Label htmlFor="other" className="cursor-pointer font-normal">
                    Another Address
                  </Label>
                </div>
              </RadioGroup>

              {recipientMode === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherAddress">Recipient Address</Label>
                  <Input
                    id="otherAddress"
                    placeholder="0x..."
                    value={otherAddress}
                    onChange={(e) => setOtherAddress(e.target.value)}
                    disabled={loading}
                    className={inputClasses}
                  />
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({tokenSymbol})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className={inputClasses}
                min="0"
                step="0.000000000000000001"
              />
            </div>

            {/* Mint Method Selection */}
            <div className="space-y-3">
              <Label>Mint Method</Label>
              <RadioGroup
                value={mintMode}
                onValueChange={(value) => setMintMode(value as MintMode)}
                disabled={loading}
                className="space-y-3"
              >
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50',
                    (!isConnected || isExceptionAddress) && 'opacity-40 pointer-events-none',
                  )}
                >
                  <RadioGroupItem
                    value="wallet"
                    id="wallet"
                    disabled={!isConnected || loading || isExceptionAddress}
                    className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                  <Label htmlFor="wallet" className="cursor-pointer font-normal">
                    Use my connected wallet
                    {isExceptionAddress && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        Not available for this token
                      </span>
                    )}
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50">
                  <RadioGroupItem
                    value="backend"
                    id="backend"
                    disabled={loading}
                    className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                  <Label htmlFor="backend" className="cursor-pointer font-normal">
                    Deploy without wallet (Token Deployer key)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMint}
                disabled={loading || !amount}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Minting...
                  </>
                ) : (
                  'Mint Tokens'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

