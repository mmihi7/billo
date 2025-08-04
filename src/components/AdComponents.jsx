// Google AdSense Advertisement Components with Subscription Support
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isUserAdFree } from '../lib/subscription'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Crown, X } from 'lucide-react'

const adClient = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;

// Custom hook for ad management with subscription support
export const useAdManager = () => {
  const { user } = useAuth()

  const isAdBlockerActive = () => {
    try {
      return !window.adsbygoogle || window.adsbygoogle.length === 0
    } catch {
      return true
    }
  }

  const refreshAds = () => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('Error refreshing ads:', error)
    }
  }

  const shouldShowAds = async () => {
    if (!user) return true // Show ads for non-logged in users
    
    try {
      const adFree = await isUserAdFree(user.uid)
      return !adFree
    } catch (error) {
      console.error('Error checking ad-free status:', error)
      return true // Default to showing ads on error
    }
  }

  return {
    isAdBlockerActive,
    refreshAds,
    shouldShowAds
  }
}

// Ad-Free Upgrade Prompt Component
const AdFreePrompt = ({ onUpgrade, className = "" }) => (
  <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
    <CardContent className="p-4 text-center">
      <Crown className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
      <h3 className="font-semibold text-yellow-800 mb-1">Remove Ads</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Upgrade to ad-free for just $1.50/month
      </p>
      <Button 
        size="sm" 
        onClick={onUpgrade}
        className="bg-yellow-600 hover:bg-yellow-700"
      >
        Upgrade Now
      </Button>
    </CardContent>
  </Card>
)

// Higher-order component for conditional ad rendering with subscription check
export const withSubscriptionAds = (AdComponent, adProps = {}) => {
  return function WithSubscriptionAdsComponent({ onUpgrade, showUpgradePrompt = false, ...props }) {
    const { user } = useAuth()
    const { shouldShowAds } = useAdManager()
    const [showAds, setShowAds] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const checkAdStatus = async () => {
        const show = await shouldShowAds()
        setShowAds(show)
        setLoading(false)
      }
      
      checkAdStatus()
    }, [user])

    if (loading) {
      return <div className="h-20 bg-gray-100 animate-pulse rounded" />
    }

    if (!showAds) {
      return null // Don't show anything for ad-free users
    }

    if (showUpgradePrompt && Math.random() < 0.3) { // Show upgrade prompt 30% of the time
      return <AdFreePrompt onUpgrade={onUpgrade} className="my-4" />
    }

    return (
      <div className="relative">
        <AdComponent {...adProps} />
        {onUpgrade && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 p-0 bg-white/80 hover:bg-white"
            onClick={onUpgrade}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    )
  }
}

// Banner Ad Component (728x90 or responsive)
export const BannerAd = ({ 
  adSlot = "1234567890", 
  adFormat = "auto", 
  fullWidthResponsive = true,
  className = "" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null; // Don't render if no client ID is set

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  )
}

// Square Ad Component (300x250)
export const SquareAd = ({ 
  adSlot = "1234567891", 
  className = "" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null;

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '300px', height: '250px' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
      />
    </div>
  )
}

// Mobile Banner Ad Component (320x50)
export const MobileBannerAd = ({ 
  adSlot = "1234567892", 
  className = "" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null;

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'inline-block', width: '320px', height: '50px' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
      />
    </div>
  )
}

// Responsive Ad Component
export const ResponsiveAd = ({ 
  adSlot = "1234567893", 
  className = "",
  minHeight = "200px" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null;

  return (
    <div className={`ad-container ${className}`} style={{ minHeight }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

// In-feed Ad Component (for content feeds)
export const InFeedAd = ({ 
  adSlot = "1234567894", 
  className = "" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null;

  return (
    <div className={`ad-container in-feed-ad ${className}`}>
      <div className="text-xs text-gray-500 mb-1 text-center">Advertisement</div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w" // Replace with your layout key
        data-ad-client={adClient}
        data-ad-slot={adSlot}
      />
    </div>
  )
}

// Sticky Bottom Ad Component (for mobile)
export const StickyBottomAd = ({ 
  adSlot = "1234567895", 
  className = "" 
}) => {
  const adRef = useRef(null)

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [])

  if (!adClient) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg ${className}`}>
      <div className="text-xs text-gray-500 text-center py-1">Advertisement</div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

// Ad Placeholder Component (for development/testing)
export const AdPlaceholder = ({ 
  width = "300px", 
  height = "250px", 
  className = "",
  label = "Advertisement" 
}) => {
  return (
    <div 
      className={`border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center ${className}`}
      style={{ width, height, minHeight: height }}
    >
      <div className="text-center text-gray-500">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs">{width} × {height}</div>
      </div>
    </div>
  )
}
