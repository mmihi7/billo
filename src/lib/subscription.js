// Subscription management service
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'forever',
    features: ['Basic tab management', 'Manual orders', 'With ads'],
    adFree: false
  },
  AD_FREE: {
    id: 'ad_free',
    name: 'Ad-Free',
    price: 4.50, // $1.5 per month, paid quarterly
    monthlyPrice: 1.50,
    interval: 'quarterly',
    intervalMonths: 3,
    features: ['Basic tab management', 'Manual orders', 'No advertisements', 'Priority support'],
    adFree: true
  }
}

// Subscription status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PENDING: 'pending'
}

// Payment methods for subscription
export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  CARD: 'card',
  PAYPAL: 'paypal'
}

// Create or update user subscription
export const createSubscription = async (userId, planId, paymentMethod, transactionId = null) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()]
    if (!plan) {
      throw new Error('Invalid subscription plan')
    }

    const now = new Date()
    const expiresAt = new Date(now)
    
    if (plan.intervalMonths) {
      expiresAt.setMonth(expiresAt.getMonth() + plan.intervalMonths)
    }

    const subscriptionData = {
      userId,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      status: transactionId ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.PENDING,
      paymentMethod,
      transactionId,
      startDate: serverTimestamp(),
      expiresAt: plan.interval === 'forever' ? null : expiresAt,
      autoRenew: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const subscriptionRef = doc(db, 'subscriptions', userId)
    await setDoc(subscriptionRef, subscriptionData)

    // Update user profile with subscription info
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      subscriptionPlan: plan.id,
      subscriptionStatus: subscriptionData.status,
      isAdFree: plan.adFree,
      updatedAt: serverTimestamp()
    })

    return {
      success: true,
      subscription: subscriptionData
    }
  } catch (error) {
    console.error('Error creating subscription:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Get user subscription
export const getUserSubscription = async (userId) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId)
    const subscriptionDoc = await getDoc(subscriptionRef)

    if (subscriptionDoc.exists()) {
      const subscription = subscriptionDoc.data()
      
      // Check if subscription is expired
      if (subscription.expiresAt && new Date() > subscription.expiresAt.toDate()) {
        await updateSubscriptionStatus(userId, SUBSCRIPTION_STATUS.EXPIRED)
        subscription.status = SUBSCRIPTION_STATUS.EXPIRED
      }

      return subscription
    }

    // Return default free subscription
    return {
      userId,
      planId: SUBSCRIPTION_PLANS.FREE.id,
      planName: SUBSCRIPTION_PLANS.FREE.name,
      price: SUBSCRIPTION_PLANS.FREE.price,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      startDate: new Date(),
      expiresAt: null,
      autoRenew: false
    }
  } catch (error) {
    console.error('Error getting user subscription:', error)
    return null
  }
}

// Update subscription status
export const updateSubscriptionStatus = async (userId, status) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId)
    await updateDoc(subscriptionRef, {
      status,
      updatedAt: serverTimestamp()
    })

    // Update user profile
    const userRef = doc(db, 'users', userId)
    const isAdFree = status === SUBSCRIPTION_STATUS.ACTIVE && 
                     (await getUserSubscription(userId))?.planId === SUBSCRIPTION_PLANS.AD_FREE.id

    await updateDoc(userRef, {
      subscriptionStatus: status,
      isAdFree,
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating subscription status:', error)
    return { success: false, error: error.message }
  }
}

// Cancel subscription
export const cancelSubscription = async (userId) => {
  try {
    await updateSubscriptionStatus(userId, SUBSCRIPTION_STATUS.CANCELLED)
    
    // Set to expire at the end of current billing period instead of immediate cancellation
    const subscription = await getUserSubscription(userId)
    if (subscription && subscription.expiresAt) {
      const subscriptionRef = doc(db, 'subscriptions', userId)
      await updateDoc(subscriptionRef, {
        autoRenew: false,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return { success: false, error: error.message }
  }
}

// Renew subscription
export const renewSubscription = async (userId, paymentMethod, transactionId) => {
  try {
    const currentSubscription = await getUserSubscription(userId)
    if (!currentSubscription) {
      throw new Error('No subscription found')
    }

    const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === currentSubscription.planId)
    if (!plan) {
      throw new Error('Invalid subscription plan')
    }

    const now = new Date()
    const newExpiresAt = new Date(now)
    
    if (plan.intervalMonths) {
      newExpiresAt.setMonth(newExpiresAt.getMonth() + plan.intervalMonths)
    }

    const subscriptionRef = doc(db, 'subscriptions', userId)
    await updateDoc(subscriptionRef, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      expiresAt: plan.interval === 'forever' ? null : newExpiresAt,
      lastRenewalDate: serverTimestamp(),
      transactionId,
      paymentMethod,
      updatedAt: serverTimestamp()
    })

    // Update user profile
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      isAdFree: plan.adFree,
      updatedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error renewing subscription:', error)
    return { success: false, error: error.message }
  }
}

// Check if user is ad-free
export const isUserAdFree = async (userId) => {
  try {
    if (!userId) return false

    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.isAdFree === true && userData.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE
    }

    return false
  } catch (error) {
    console.error('Error checking ad-free status:', error)
    return false
  }
}

// Get subscription analytics for admin
export const getSubscriptionAnalytics = async () => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions')
    const querySnapshot = await getDocs(subscriptionsRef)

    const analytics = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      expiredSubscriptions: 0,
      cancelledSubscriptions: 0,
      monthlyRevenue: 0,
      quarterlyRevenue: 0
    }

    querySnapshot.docs.forEach(doc => {
      const subscription = doc.data()
      analytics.totalSubscriptions++

      switch (subscription.status) {
        case SUBSCRIPTION_STATUS.ACTIVE:
          analytics.activeSubscriptions++
          if (subscription.planId === SUBSCRIPTION_PLANS.AD_FREE.id) {
            analytics.quarterlyRevenue += subscription.price
            analytics.monthlyRevenue += SUBSCRIPTION_PLANS.AD_FREE.monthlyPrice
          }
          break
        case SUBSCRIPTION_STATUS.EXPIRED:
          analytics.expiredSubscriptions++
          break
        case SUBSCRIPTION_STATUS.CANCELLED:
          analytics.cancelledSubscriptions++
          break
      }
    })

    return analytics
  } catch (error) {
    console.error('Error getting subscription analytics:', error)
    return null
  }
}

// Process subscription payment (mock implementation)
export const processSubscriptionPayment = async (userId, planId, paymentMethod, paymentDetails) => {
  try {
    // Mock payment processing
    // In real implementation, integrate with payment gateway (Stripe, PayPal, M-Pesa, etc.)
    
    const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()]
    if (!plan) {
      throw new Error('Invalid subscription plan')
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create subscription
    const result = await createSubscription(userId, planId, paymentMethod, transactionId)

    if (result.success) {
      // Log payment record
      const paymentRef = doc(collection(db, 'subscription_payments'))
      await setDoc(paymentRef, {
        userId,
        subscriptionId: userId,
        planId: plan.id,
        amount: plan.price,
        paymentMethod,
        transactionId,
        status: 'completed',
        paymentDetails,
        createdAt: serverTimestamp()
      })
    }

    return {
      success: true,
      transactionId,
      subscription: result.subscription
    }
  } catch (error) {
    console.error('Error processing subscription payment:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Utility functions
export const formatSubscriptionPrice = (plan) => {
  if (plan.price === 0) return 'Free'
  
  if (plan.interval === 'quarterly') {
    return `$${plan.price.toFixed(2)} every 3 months ($${plan.monthlyPrice.toFixed(2)}/month)`
  }
  
  return `$${plan.price.toFixed(2)}`
}

export const getSubscriptionFeatures = (planId) => {
  const plan = Object.values(SUBSCRIPTION_PLANS).find(p => p.id === planId)
  return plan ? plan.features : []
}

export const isSubscriptionExpiringSoon = (subscription, daysThreshold = 7) => {
  if (!subscription || !subscription.expiresAt) return false
  
  const expiryDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
  
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0
}

