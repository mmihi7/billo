import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { QrCode, BarChart3 } from 'lucide-react'

const BillOPhotoAd = () => (
  <div className="my-4 rounded-lg border border-border overflow-hidden relative aspect-[16/9] md:aspect-[21/9] group cursor-pointer">
    <img 
      src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1200&auto=format&fit=crop" 
      alt="A modern bar interior with warm lighting"
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
    <div className="relative h-full flex flex-col justify-end items-center text-center p-6 text-white">
      <h4 className="text-2xl md:text-3xl font-bold tracking-tight whitespace-nowrap">Modernize Your Bar with Bill-O</h4>
      <p className="text-sm md:text-base text-white/90 mt-1">Effortless tabs, faster payments, happier customers.</p>
    </div>
  </div>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Bill-O</h1>
          <p className="text-muted-foreground">User Centered Tab Management</p>
        </div>

        <BillOPhotoAd />

        <div className="space-y-4">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <QrCode className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle>Customer</CardTitle>
              <CardDescription>Open a tab and manage your bill</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/customer/auth" className="w-full">
                <Button className="w-full">
                  Start Tab
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle>Restaurant</CardTitle>
              <CardDescription>Monitor tabs and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth?role=admin" className="w-full">
                <Button variant="outline" className="w-full">
                  Admin Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}