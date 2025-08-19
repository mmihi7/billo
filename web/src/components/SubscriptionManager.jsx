import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { ArrowLeft, Crown, Check, X, CreditCard, Smartphone, Calendar, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  SUBSCRIPTION_PLANS, 
  PAYMENT_METHODS, 
  getUserSubscription, 
  processSubscriptionPayment, 
  cancelSubscription,
  formatSubscriptionPrice,
  isSubscriptionExpiringSoon
} from '../lib/subscription'

function SubscriptionManager({ onBack }) {
  const { user } = useAuth()
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentDetails, setPaymentDetails] = useState({
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    email: ''
  })

  useEffect(() => {
    loadSubscription()
  }, [user])

  const loadSubscription = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const subscription = await getUserSubscription(user.uid)
      setCurrentSubscription(subscription)
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!user || !paymentMethod) return

    setUpgrading(true)
    try {
      const result = await processSubscriptionPayment(
        user.uid, 
        'ad_free', 
        paymentMethod, 
        paymentDetails
      )

      if (result.success) {
        alert('Subscription upgraded successfully! You now have ad-free access.')
        await loadSubscription()
        setShowUpgrade(false)
        setPaymentMethod('')
        setPaymentDetails({
          phone: '',
          cardNumber: '',
          expiryDate: '',
          cvv: '',
          email: ''
        })
      } else {
        alert(`Payment failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('An error occurred while processing your payment. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  const handleCancel = async () => {
    if (!user || !confirm('Are you sure you want to cancel your subscription? You will lose ad-free access at the end of your billing period.')) {
      return
    }

    try {
      const result = await cancelSubscription(user.uid)
      if (result.success) {
        alert('Subscription cancelled. You will retain ad-free access until the end of your billing period.')
        await loadSubscription()
      } else {
        alert(`Error cancelling subscription: ${result.error}`)
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('An error occurred while cancelling your subscription.')
    }
  }

  const isExpiringSoon = currentSubscription && isSubscriptionExpiringSoon(currentSubscription)
  const isAdFree = currentSubscription?.planId === SUBSCRIPTION_PLANS.AD_FREE.id && 
                   currentSubscription?.status === 'active'

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading subscription...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showUpgrade) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowUpgrade(false)}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Upgrade to Ad-Free</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-yellow-600 mr-2" />
                <div>
                  <CardTitle>Ad-Free Plan</CardTitle>
                  <CardDescription>
                    {formatSubscriptionPrice(SUBSCRIPTION_PLANS.AD_FREE)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SUBSCRIPTION_PLANS.AD_FREE.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PAYMENT_METHODS.MPESA}>
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 mr-2" />
                        M-Pesa
                      </div>
                    </SelectItem>
                    <SelectItem value={PAYMENT_METHODS.CARD}>
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Credit/Debit Card
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === PAYMENT_METHODS.MPESA && (
                <div>
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={paymentDetails.phone}
                    onChange={(e) => setPaymentDetails({...paymentDetails, phone: e.target.value})}
                    placeholder="+254 700 000 000"
                  />
                </div>
              )}

              {paymentMethod === PAYMENT_METHODS.CARD && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        value={paymentDetails.expiryDate}
                        onChange={(e) => setPaymentDetails({...paymentDetails, expiryDate: e.target.value})}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        value={paymentDetails.cvv}
                        onChange={(e) => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ad-Free Plan (3 months)</span>
                  <span>$4.50</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Equivalent to $1.50/month</span>
                  <span>Billed quarterly</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>$4.50</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleUpgrade} 
            className="w-full" 
            disabled={!paymentMethod || upgrading}
          >
            {upgrading ? 'Processing...' : 'Complete Payment'}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By completing this purchase, you agree to our terms of service. 
            Your subscription will auto-renew every 3 months unless cancelled.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold">Subscription</h1>
        </div>

        {/* Current Plan */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isAdFree ? (
                  <Crown className="w-6 h-6 text-yellow-600 mr-2" />
                ) : (
                  <div className="w-6 h-6 bg-gray-200 rounded mr-2" />
                )}
                <div>
                  <CardTitle>{currentSubscription?.planName || 'Free Plan'}</CardTitle>
                  <CardDescription>
                    {currentSubscription ? formatSubscriptionPrice(
                      Object.values(SUBSCRIPTION_PLANS).find(p => p.id === currentSubscription.planId)
                    ) : 'Free forever'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={isAdFree ? "default" : "secondary"}>
                {currentSubscription?.status || 'active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isExpiringSoon && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Subscription Expiring Soon</p>
                  <p className="text-yellow-700">
                    Your subscription expires on {new Date(currentSubscription.expiresAt.toDate()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(currentSubscription ? 
                Object.values(SUBSCRIPTION_PLANS).find(p => p.id === currentSubscription.planId)?.features || [] :
                SUBSCRIPTION_PLANS.FREE.features
              ).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {currentSubscription?.expiresAt && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {currentSubscription.status === 'cancelled' ? 'Expires' : 'Renews'} on{' '}
                    {new Date(currentSubscription.expiresAt.toDate()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {!isAdFree && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-yellow-600 mr-2" />
                <div>
                  <CardTitle className="text-yellow-800">Remove Ads</CardTitle>
                  <CardDescription className="text-yellow-700">
                    Enjoy an ad-free experience for just $1.50/month
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  {SUBSCRIPTION_PLANS.AD_FREE.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="text-2xl font-bold text-yellow-800 mb-1">$4.50</div>
                  <div className="text-sm text-yellow-700">
                    Billed every 3 months • $1.50/month
                  </div>
                </div>
                <Button 
                  onClick={() => setShowUpgrade(true)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Comparison */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {plan.adFree ? (
                        <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                      ) : (
                        <div className="w-5 h-5 bg-gray-200 rounded mr-2" />
                      )}
                      <span className="font-semibold">{plan.name}</span>
                    </div>
                    <span className="font-bold">{formatSubscriptionPrice(plan)}</span>
                  </div>
                  <div className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        {feature.includes('No') || feature.includes('Priority') ? (
                          <Check className="w-3 h-3 text-green-600 mr-2" />
                        ) : feature.includes('With ads') ? (
                          <X className="w-3 h-3 text-red-600 mr-2" />
                        ) : (
                          <Check className="w-3 h-3 text-green-600 mr-2" />
                        )}
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cancel Subscription */}
        {isAdFree && currentSubscription?.status === 'active' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Cancel Subscription</CardTitle>
              <CardDescription>
                You will retain ad-free access until the end of your billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleCancel} className="w-full">
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default SubscriptionManager

