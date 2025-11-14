'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useWallet } from '@/contexts/wallet-context'
import { cn } from '@/lib/utils'
import { deployTokenWithWallet } from '@/lib/wallet-deploy'

type MintAuthority = 'owner' | 'anyone' | 'specific'
type DeploymentMode = 'wallet' | 'token-deployer'

export default function DeploymentForm() {
  const { isConnected } = useWallet()
  const router = useRouter()
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    decimals: 18,
    initialSupply: '',
    maxSupply: '',
    mintAuthority: 'anyone' as MintAuthority,
    specificAddress: '',
  })
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('token-deployer')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [unlimitedSupply, setUnlimitedSupply] = useState(true)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'decimals' ? parseInt(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.tokenName.trim()) {
      setMessage({ type: 'error', text: 'Token name is required' })
      return
    }
    if (!formData.tokenSymbol.trim()) {
      setMessage({ type: 'error', text: 'Token symbol is required' })
      return
    }
    if (!formData.initialSupply) {
      setMessage({ type: 'error', text: 'Initial supply is required' })
      return
    }
    if (formData.mintAuthority === 'specific' && !formData.specificAddress.trim()) {
      setMessage({ type: 'error', text: 'Please provide a specific address for mint authority' })
      return
    }
    if (deploymentMode === 'wallet' && !isConnected) {
      setMessage({ type: 'error', text: 'Please connect your wallet or choose Deploy without wallet.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      let data: any

      if (deploymentMode === 'wallet') {
        // Deploy using connected wallet
        if (!isConnected) {
          setMessage({
            type: 'error',
            text: 'Please connect your wallet first.',
          })
          setLoading(false)
          return
        }

        data = await deployTokenWithWallet({
          tokenName: formData.tokenName.trim(),
          tokenSymbol: formData.tokenSymbol.trim(),
          decimals: formData.decimals,
          initialSupply: formData.initialSupply,
          maxSupply: unlimitedSupply ? '' : formData.maxSupply,
          mintAuthority: formData.mintAuthority,
          specificAddress: formData.specificAddress.trim() || undefined,
        })
      } else {
        // Deploy using Token Deployer key (API)
        // When deploying without wallet, force mint authority to 'anyone' if it's set to 'owner'
        // (This should already be prevented by UI, but adding as safety check)
        const finalMintAuthority = formData.mintAuthority === 'owner' 
          ? 'anyone' 
          : formData.mintAuthority

        // Call API endpoint only for token-deployer mode
        const response = await fetch('/api/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokenName: formData.tokenName.trim(),
            tokenSymbol: formData.tokenSymbol.trim(),
            decimals: formData.decimals,
            initialSupply: formData.initialSupply,
            maxSupply: unlimitedSupply ? '' : formData.maxSupply,
            mintAuthority: finalMintAuthority,
            specificAddress: formData.specificAddress.trim(),
            deploymentMode,
          }),
        })

        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Deployment failed')
        }
      }

      // Success - show token address and transaction hash
      setMessage({
        type: 'success',
        text: `Token "${data.tokenInfo.name}" (${data.tokenInfo.symbol}) deployed successfully! Redirecting to token details...`,
      })
      
      // Reset form
      setFormData({
        tokenName: '',
        tokenSymbol: '',
        decimals: 18,
        initialSupply: '',
        maxSupply: '',
        mintAuthority: 'anyone',
        specificAddress: '',
      })
      setDeploymentMode('token-deployer')
      setUnlimitedSupply(true)

      // Redirect to token details page after a short delay
      setTimeout(() => {
        router.push(`/token/${data.tokenAddress}`)
      }, 1500)
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Deployment failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    'border border-white/20 bg-white/5 focus-visible:border-white/60 focus-visible:ring-[3px] focus-visible:ring-white/30 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.9)]'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Token Name */}
      <div className="space-y-2">
        <Label htmlFor="tokenName">Token Name</Label>
        <Input
          id="tokenName"
          name="tokenName"
          placeholder="ARC"
          value={formData.tokenName}
          onChange={handleChange}
          disabled={loading}
          className={inputClasses}
        />
        <p className="text-xs text-muted-foreground">Full name of your token</p>
      </div>

      {/* Token Symbol */}
      <div className="space-y-2">
        <Label htmlFor="tokenSymbol">Token Symbol</Label>
        <Input
          id="tokenSymbol"
          name="tokenSymbol"
          placeholder="USDC"
          value={formData.tokenSymbol}
          onChange={handleChange}
          disabled={loading}
          className={cn(inputClasses, 'uppercase')}
        />
        <p className="text-xs text-muted-foreground">Ticker symbol (3-5 characters)</p>
      </div>

      {/* Decimals */}
      <div className="space-y-2">
        <Label htmlFor="decimals">Decimals</Label>
        <Input
          id="decimals"
          name="decimals"
          type="number"
          min="0"
          max="18"
          value={formData.decimals}
          onChange={handleChange}
          disabled={loading}
          className={inputClasses}
        />
        <p className="text-xs text-muted-foreground">Standard is 18 (like ETH)</p>
      </div>

      {/* Initial Supply */}
      <div className="space-y-2">
        <Label htmlFor="initialSupply">Initial Supply</Label>
        <Input
          id="initialSupply"
          name="initialSupply"
          type="number"
          placeholder="1000000"
          value={formData.initialSupply}
          onChange={handleChange}
          disabled={loading}
          className={inputClasses}
        />
        <p className="text-xs text-muted-foreground">Tokens minted at deployment</p>
      </div>

      {/* Max Supply */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="maxSupply">Max Supply (Optional)</Label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unlimitedSupply}
              onChange={(e) => {
                setUnlimitedSupply(e.target.checked)
                if (e.target.checked) {
                  setFormData(prev => ({ ...prev, maxSupply: '' }))
                }
              }}
              disabled={loading}
              className="w-4 h-4"
            />
            <span className="text-sm text-muted-foreground">Unlimited</span>
          </label>
        </div>
        {!unlimitedSupply && (
          <Input
            id="maxSupply"
            name="maxSupply"
            type="number"
            placeholder="10000000"
            value={formData.maxSupply}
            onChange={handleChange}
            disabled={loading}
            className={inputClasses}
          />
        )}
        <p className="text-xs text-muted-foreground">Maximum tokens that can exist</p>
      </div>

      {/* Mint Authority */}
      <div className="space-y-3 border-t border-border/50 pt-6">
        <Label>Mint Authority</Label>
        <RadioGroup
          value={formData.mintAuthority}
          onValueChange={(value) => {
            const newMintAuthority = value as MintAuthority
            setFormData(prev => ({ ...prev, mintAuthority: newMintAuthority }))
            // If owner is selected, switch to wallet mode (only wallet allowed for owner)
            if (newMintAuthority === 'owner' && deploymentMode === 'token-deployer') {
              setDeploymentMode('wallet')
            }
          }}
          disabled={loading}
          className="space-y-3"
        >
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50',
              !isConnected && 'opacity-40 pointer-events-none',
            )}
          >
            <RadioGroupItem value="owner" id="owner" disabled={!isConnected} className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background" />
            <Label htmlFor="owner" className="cursor-pointer font-normal">
              Owner (Only you can mint)
            </Label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50">
            <RadioGroupItem value="anyone" id="anyone" className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background" />
            <Label htmlFor="anyone" className="cursor-pointer font-normal">
              Anyone (Public minting)
            </Label>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50">
            <RadioGroupItem value="specific" id="specific" className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background" />
            <Label htmlFor="specific" className="cursor-pointer font-normal">
              Specific Address
            </Label>
          </div>
        </RadioGroup>

        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Connect your wallet to restrict minting access to the owner address.
          </p>
        )}

        {formData.mintAuthority === 'specific' && (
          <Input
            name="specificAddress"
            placeholder="0x..."
            value={formData.specificAddress}
            onChange={handleChange}
            disabled={loading}
            className={cn(inputClasses, 'mt-3')}
          />
        )}
      </div>

      {/* Deployment Method */}
      <div className="space-y-3 border-t border-border/50 pt-6">
        <Label>Deployment Method</Label>
        <RadioGroup
          value={deploymentMode}
          onValueChange={(value) => setDeploymentMode(value as DeploymentMode)}
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
              value="wallet" 
              id="wallet" 
              disabled={!isConnected || loading} 
              className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background" 
            />
            <Label htmlFor="wallet" className="cursor-pointer font-normal">
              Use my connected wallet
            </Label>
          </div>
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 shadow-[0_12px_40px_-30px_rgba(255,255,255,0.5)] transition hover:border-white/50',
              formData.mintAuthority === 'owner' && 'opacity-40 pointer-events-none',
            )}
          >
            <RadioGroupItem 
              value="token-deployer" 
              id="token-deployer" 
              disabled={formData.mintAuthority === 'owner' || loading} 
              className="border-white/40 text-white data-[state=checked]:bg-white data-[state=checked]:text-background" 
            />
            <Label htmlFor="token-deployer" className="cursor-pointer font-normal">
              Deploy without wallet (Token Deployer key)
              {formData.mintAuthority === 'owner' && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Not available for owner mint authority
                </span>
              )}
            </Label>
          </div>
        </RadioGroup>
        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Connect a wallet to deploy directly from your address, or keep the Token Deployer option selected to use the platform signer.
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-destructive/10 border border-destructive/30 text-destructive'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={loading} className="w-full gap-2" size="lg">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying...
          </>
        ) : (
          'Deploy Token'
        )}
      </Button>
    </form>
  )
}
