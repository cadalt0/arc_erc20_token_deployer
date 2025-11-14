import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { WalletProvider } from '@/contexts/wallet-context'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export const metadata: Metadata = {
  title: 'Token Deployer - Deploy Custom ERC20 Tokens',
  description: 'Create and manage your own ERC20 tokens on the blockchain. Easy deployment, full control over parameters.',
  icons: {
    icon: [
      {
        url: '/logo.png',
        type: 'image/png',
      },
    ],
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <WalletProvider>
          {children}
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  )
}
