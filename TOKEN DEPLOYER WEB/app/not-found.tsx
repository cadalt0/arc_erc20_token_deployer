import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'
import Navigation from '@/components/navigation'

export default function NotFound() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-background to-card relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* 404 Number */}
            <div className="space-y-4">
              <h1 className="text-9xl md:text-[12rem] font-bold bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-transparent leading-none">
                404
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-emerald-600 mx-auto rounded-full" />
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                Page Not Found
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved. 
                Let's get you back on track.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </Link>
              <Link href="/deploy">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4" />
                  Deploy Token
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  <Search className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Decorative Elements */}
            <div className="pt-12 space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-px w-16 bg-border" />
                <span>or</span>
                <div className="h-px w-16 bg-border" />
              </div>
              <p className="text-sm text-muted-foreground">
                If you believe this is an error, please check the URL or contact support.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

