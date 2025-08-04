import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRestaurantByOwner, createRestaurant, subscribeToActiveTabs } from '../lib/database'
import { createAccount, getUserProfile, createUserProfile } from '../lib/auth'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { sendEmailVerification } from 'firebase/auth'
import WaiterManager from './WaiterManager'
import MenuManager from './MenuManager'
import QRCodeGenerator from './QRCodeGenerator'
import { ArrowLeft, BarChart3, Users, DollarSign, Clock, CheckCircle, AlertCircle, LogOut, UserPlus, LogIn, QrCode, Utensils, ClipboardList, FileText, Plus, FileSpreadsheet, RefreshCw } from 'lucide-react'

function RestaurantDashboard({ isAdminView = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser: user, login, loginWithGoogle, logout, isAdmin, loading: authLoading } = useAuth()
  
  // State declarations - all state at the top before any effects
  const [isLoginView, setIsLoginView] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isDemoLoggedIn, setIsDemoLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [restaurant, setRestaurant] = useState(null) // Moved to top
  const [restaurantName, setRestaurantName] = useState('')
  const [tabs, setTabs] = useState([])
  const [payments, setPayments] = useState([])
  const [isQrGeneratorOpen, setIsQrGeneratorOpen] = useState(false)
  const [isGoogleSheetDialogOpen, setIsGoogleSheetDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [authMessage, setAuthMessage] = useState('')
  
  // Refs
  const emailRef = useRef()
  const passwordRef = useRef()
  const adminCodeRef = useRef()
  
  // Debug log to check the user object
  useEffect(() => {
    console.log('RestaurantDashboard - Current user:', user);
    console.log('RestaurantDashboard - isAdmin:', isAdmin);
    console.log('RestaurantDashboard - authLoading:', authLoading);
  }, [user, isAdmin, authLoading]);

  // Handle initial authentication state and route messages
  useEffect(() => {
    // Check for auth message in route state
    if (location.state?.message) {
      setAuthMessage(location.state.message);
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }

    if (authLoading) return; // Wait for auth to finish loading
    
    if (!user && !location.pathname.endsWith('/restaurant')) {
      console.log('No user found, redirecting to /restaurant');
      navigate('/restaurant', { 
        state: { 
          from: location.pathname,
          message: 'Please log in to access this page' 
        },
        replace: true 
      });
    }
  }, [user, authLoading, navigate, location]);
  
  // Check if user needs to verify email
  useEffect(() => {
    if (user && isAdmin && !user.emailVerified) {
      setError('Please verify your email to access the admin dashboard. Check your inbox for the verification link.');
    }
  }, [user, isAdmin]);

  // Redirect to login if user is not authenticated and trying to access admin dashboard
  useEffect(() => {
    if (!authLoading && !user && isAdminView) {
      navigate('/restaurant', { replace: true })
    }
  }, [user, authLoading, isAdminView, navigate])
  
  // Handle verification and redirection - moved after all state declarations
  useEffect(() => {
    if (authLoading) {
      console.log('Auth still loading, skipping verification check');
      return;
    }
    
    const verifyAndRedirect = async () => {
      console.log('Verifying user and checking redirection...');
      console.log('Current path:', window.location.pathname);
      console.log('User object:', user);
      
      if (!user) {
        console.log('No user found, showing login form');
        return;
      }

      try {
        console.log('Checking user verification status...');
        
        // If user is already on the restaurant dashboard, no need to redirect
        if (window.location.pathname === '/restaurant') {
          console.log('User is on the restaurant dashboard, no redirection needed');
          return;
        }
        
        // For authenticated users, check if they need to complete onboarding
        if (isAdmin && !isDemoMode) {
          // If we don't have restaurant data yet, wait for it to load
          if (restaurant === null) {
            console.log('Waiting for restaurant data to load...');
            return;
          }
          
          // If we have restaurant data but it's empty, user needs to complete onboarding
          if (restaurant && Object.keys(restaurant).length === 0) {
            console.log('Admin user needs to complete onboarding');
            return;
          }
        }
        
        // If user is admin and on the wrong path, redirect to /restaurant
        if (isAdmin && !window.location.pathname.startsWith('/restaurant')) {
          console.log('Admin user accessing non-restaurant path, redirecting to /restaurant');
          navigate('/restaurant', { replace: true });
        }
        
      } catch (error) {
        console.error('Error in verification check:', error);
      }
    };

    // Initial check
    verifyAndRedirect();
  }, [user, authLoading, isAdmin, navigate, restaurant, isDemoMode]);

  const [stats, setStats] = useState({
    activeTabs: 0,
    totalRevenue: 0,
    pendingBills: 0,
    completedPayments: 0
  });

  // Mock data
  const mockTabs = [
    {
      id: 'TAB-2024-001',
      customerName: 'John Doe',
      tableNumber: '12',
      status: 'bill_accepted',
      total: 38.00,
      openedAt: '7:30 PM',
      lastActivity: '8:15 PM',
      orders: 3
    },
    {
      id: 'TAB-2024-002',
      customerName: 'Jane Smith',
      tableNumber: '8',
      status: 'active',
      total: 24.50,
      openedAt: '8:00 PM',
      lastActivity: '8:20 PM',
      orders: 2
    },
    {
      id: 'TAB-2024-003',
      customerName: 'Mike Johnson',
      tableNumber: '15',
      status: 'pending_acceptance',
      total: 67.25,
      openedAt: '7:15 PM',
      lastActivity: '8:10 PM',
      orders: 5
    }
  ]

  const mockPayments = [
    {
      id: 'PAY-001',
      tabId: 'TAB-2024-001',
      customerName: 'John Doe',
      amount: 38.00,
      method: 'M-Pesa',
      status: 'completed',
      time: '8:15 PM'
    },
    {
      id: 'PAY-002',
      tabId: 'TAB-2024-004',
      customerName: 'Sarah Wilson',
      amount: 45.75,
      method: 'Cash',
      status: 'completed',
      time: '7:45 PM'
    }
  ]

  // Effect to load data based on auth state
  useEffect(() => {
    if (isDemoLoggedIn) {
      setTabs(mockTabs)
      setPayments(mockPayments)
      setIsLoadingData(false)
      return
    }

    if (user) {
      setIsLoadingData(true)
      let unsubscribeTabs = () => {}

      const fetchData = async () => {
        try {
          const userRestaurant = await getRestaurantByOwner(user.uid)
          setRestaurant(userRestaurant)

          if (userRestaurant) {
            unsubscribeTabs = subscribeToActiveTabs(userRestaurant.id, (liveTabs) => {
              setTabs(liveTabs)
            })
            // For now, payments will be empty for real users until that flow is built
            setPayments([]) 
          } else {
            setTabs([])
            setPayments([])
          }
        } catch (err) {
          setError("Could not load your restaurant data.")
        } finally {
          setIsLoadingData(false)
        }
      }

      fetchData()
      return () => unsubscribeTabs()
    }
  }, [user, isDemoLoggedIn])

  // Effect to calculate stats whenever real data changes
  useEffect(() => {
    setStats({
      activeTabs: tabs.length,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      pendingBills: tabs.filter(t => t.status === 'pending_acceptance').length,
      completedPayments: payments.length
    })
  }, [tabs, payments])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  // Handle form submission for login/signup
  // Function to handle resending verification email
  async function handleResendVerification(currentUser) {
    try {
      setError('');
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('No user is currently signed in. Please sign in again.');
      }
      
      console.log('Resending verification email to:', currentUser.email);
      
      // Force reload the user to get the latest verification status
      await currentUser.reload();
      
      // If already verified, redirect immediately
      if (currentUser.emailVerified) {
        console.log('User is already verified, redirecting to /admin');
        window.location.href = '/admin';
        return;
      }
      
      // Send verification email with redirect URL that includes a verified parameter
      const redirectUrl = `${window.location.origin}/restaurant?verified=true`;
      await sendEmailVerification(currentUser, {
        url: redirectUrl, // Redirect URL after verification
        handleCodeInApp: true
      });
      
      console.log('Verification email sent with redirect URL:', redirectUrl);
      
      setSuccess('A new verification email has been sent. Please check your inbox and spam folder.');
      
      // Set up a simple redirect after a short delay
      // This will work if the user verifies their email in another tab/window
      setTimeout(() => {
        window.location.href = '/admin';
      }, 5000); // Redirect after 5 seconds
      
    } catch (err) {
      console.error('Error in handleResendVerification:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      let errorMessage = 'Failed to resend verification email. ';
      
      // More specific error messages
      if (err.code === 'auth/too-many-requests') {
        errorMessage = 'We have blocked all requests from this device due to unusual activity. Try again later.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email. Please sign up again.';
      } else if (err.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please sign in again before requesting a new verification email.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message?.includes('auth/missing-email')) {
        errorMessage = 'Email address is required. Please enter a valid email.';
      } else {
        errorMessage += err.message || 'Please try again later or contact support if the problem persists.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Basic validation
    if (!formData.email || !formData.password) {
      return setError('Please fill in all required fields');
    }
    
    if (!isLoginView && formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('')
      setSuccess('')
      setLoading(true)
      
      if (isLoginView) {
        // Handle login - this will update the user in AuthContext
        const { user: authUser } = await login(formData.email, formData.password);
        
        if (success) {
          // Check if user is verified
          if (loggedInUser.emailVerified) {
            // If verified, check if they have a restaurant
            const userRestaurant = await getRestaurantByOwner(loggedInUser.uid)
            if (!userRestaurant) {
              // If no restaurant, show onboarding
              setShowOnboarding(true)
            } else {
              // If they have a restaurant, proceed to dashboard
              navigate('/restaurant')
            }
          } else {
            // If not verified, show verification message and log them out
            setError('Please verify your email before logging in. Check your inbox for the verification email.')
            await logout()
          }
        } else {
          setError(error || 'Failed to log in. Please check your credentials and try again.')
        }
      } else {
        // Handle signup - just create the account, we'll handle restaurant creation in onboarding
        const { success, error, user: createdUser } = await createAccount(
          formData.email, 
          formData.password,
          'User', // Temporary display name, will be updated in onboarding
          'admin'
        )
        
        if (success) {
          setSuccess(
            <div className="space-y-4">
              <p>Account created successfully! We've sent a verification email to {formData.email}.</p>
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                <p className="font-medium text-blue-800">Important:</p>
                <p className="text-sm text-blue-700 mt-1">
                  Please check your inbox and verify your email to activate your account. 
                  If you don't see the email, please check your spam folder.
                </p>
                <button
                  onClick={() => handleResendVerification(createdUser)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </button>
              </div>
            </div>
          );
          
          // Reset form but keep email for login
          setFormData({
            email: formData.email,
            password: '',
            confirmPassword: ''
          });
          setRestaurantName('');
          
          // Auto-switch to login view after a delay
          setTimeout(() => {
            setIsLoginView(true);
          }, 5000);
          
        } else {
          let errorMessage = error || 'Failed to create account. Please try again.';
          
          // More specific error messages
          if (error?.includes('email-already-in-use')) {
            errorMessage = 'This email is already registered. Please log in or use a different email.';
          } else if (error?.includes('weak-password')) {
            errorMessage = 'Password is too weak. Please use at least 6 characters.';
          } else if (error?.includes('invalid-email')) {
            errorMessage = 'Please enter a valid email address.';
          }
          
          throw new Error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      // More user-friendly error messages
      let errorMessage = err.message;
      if (errorMessage.includes('auth/email-already-in-use')) {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (errorMessage.includes('auth/weak-password')) {
        errorMessage = 'Password should be at least 6 characters';
      } else if (errorMessage.includes('auth/invalid-email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/wrong-password')) {
        errorMessage = 'Invalid email or password';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError('')
      setLoading(true)
      await loginWithGoogle()
    } catch (err) {
      const firebaseError = err.message.match(/Firebase: Error \((.*)\)\./)
      setError(firebaseError ? firebaseError[1].replace('auth/', '').replace(/-/g, ' ') : 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  function handleDemoLogin(e) {
    e.preventDefault()
    setError('')
    if (adminCodeRef.current.value === 'admin123') {
      setIsDemoLoggedIn(true)
    } else {
      setError('Invalid demo code. Try "admin123"')
      adminCodeRef.current.value = ''
    }
  }

  function handleDemoLogout() {
    setIsDemoLoggedIn(false)
    setIsDemoMode(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'pending_acceptance': return 'bg-yellow-100 text-yellow-800'
      case 'bill_accepted': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4" />
      case 'pending_acceptance': return <AlertCircle className="w-4 h-4" />
      case 'bill_accepted': return <CheckCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (!isAdminView && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isLoginView ? 'Sign in to your account' : 'Create a new account'}
            </h2>
            {authMessage && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md">
                {authMessage}
              </div>
            )}
            <p className="mt-2 text-center text-sm text-gray-600">
              {isLoginView ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setAuthMessage('');
                  setIsLoginView(!isLoginView);
                }}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                {isLoginView ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLoginView && (
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                      Forgot password?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLoginView ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder={isLoginView ? 'Enter your password' : 'Create a password (min 6 characters)'}
                  minLength={isLoginView ? undefined : 6}
                  disabled={loading}
                />
              </div>
              {!isLoginView && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    {isLoginView ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : isLoginView ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => logInWithGoogle('admin')}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isLoginView ? 'Sign in with Google' : 'Sign up with Google'}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>By {isLoginView ? 'signing in' : 'signing up'}, you agree to our</p>
            <p className="mt-1">
              <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a> and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Onboarding for new users who have signed up but have no restaurant
  if (user && !isDemoLoggedIn && !isLoadingData && !restaurant) {
    return <OnboardingSetup user={user} onRestaurantCreated={setRestaurant} />
  }

  // Main Dashboard View
  if (user || isDemoLoggedIn) {
    if (isLoadingData) {
      return (
        <div className="min-h-screen bg-background p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading Dashboard...</p>
          </div>
        </div>
      )
    }

    // Display empty state for real users with no data yet
    const showEmptyState = !isDemoLoggedIn && tabs.length === 0 && payments.length === 0;

    const EmptyState = () => (
      <Card className="mt-6">
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold">No Activity Yet</h3>
          <p className="text-muted-foreground mt-2">
            When customers open tabs using your QR codes, you'll see them here in real-time.
          </p>
          <Button className="mt-4" onClick={() => setIsQrGeneratorOpen(true)}>
            Get Your Restaurant QR Code
          </Button>
        </CardContent>
      </Card>
    );

    return (
      <div className="min-h-screen bg-background p-4">
        {/* Menu management is now handled by the MenuManager component in the main content area */}
        <GoogleSheetConnectDialog open={isGoogleSheetDialogOpen} onOpenChange={setIsGoogleSheetDialogOpen} />
        <div className="max-w-4xl mx-auto">
          <QRCodeGenerator
            open={isQrGeneratorOpen}
            onOpenChange={setIsQrGeneratorOpen}
            restaurant={restaurant}
          />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
                <p className="text-muted-foreground capitalize">
                  {isDemoLoggedIn 
                    ? 'Viewing in Demo Mode' 
                    : (restaurant?.name || 'Real-time tab and payment monitoring')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isDemoLoggedIn && restaurant && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/waiterhome')}
                    className="bg-primary/10 hover:bg-primary/20 border-primary/30"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Waiter Dashboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsQrGeneratorOpen(true)}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Get QR Code
                  </Button>
                </>
              )}

              <Button variant="outline" size="sm" onClick={user ? logout : handleDemoLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeTabs}</p>
                    <p className="text-sm text-muted-foreground">Active Tabs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Today's Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingBills}</p>
                    <p className="text-sm text-muted-foreground">Pending Bills</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats.completedPayments}</p>
                    <p className="text-sm text-muted-foreground">Completed Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="tabs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tabs">Active Tabs</TabsTrigger>
              <TabsTrigger value="menu"><Utensils className="w-4 h-4 mr-2" />Menu</TabsTrigger>
              <TabsTrigger value="waiters"><Users className="w-4 h-4 mr-2" />Waiters</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="tabs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Tabs</CardTitle>
                  <CardDescription>Monitor all active customer tabs</CardDescription>
                </CardHeader>
                <CardContent>
                  {showEmptyState ? <EmptyState /> : (
                    <div className="space-y-4">
                      {tabs.map((tab) => (
                        <div key={tab.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{tab.customerName || 'Customer'}</h3>
                              <Badge variant="outline">Table {tab.tableNumber}</Badge>
                              <Badge className={getStatusColor(tab.status)}>
                                {getStatusIcon(tab.status)}
                                <span className="ml-1 capitalize">{tab.status.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tab.id} • {tab.orders || 0} orders • Opened: {tab.openedAt || new Date(tab.createdAt?.seconds * 1000).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${tab.total.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="menu" className="space-y-6">
               {console.log('Rendering MenuManager with restaurant:', restaurant)}
               <MenuManager restaurant={restaurant} />
            </TabsContent>

            <TabsContent value="waiters" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <WaiterManager restaurant={restaurant} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Recent completed payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {showEmptyState ? <EmptyState /> : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{payment.customerName}</h3>
                              <Badge variant="outline">{payment.method}</Badge>
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Completed
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {payment.id} • {payment.tabId} • {payment.time || new Date(payment.createdAt?.seconds * 1000).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return null
}

function OnboardingSetup({ user, onRestaurantCreated }) {
  const [formData, setFormData] = useState({
    restaurantName: '',
    city: '',
    telephone: '',
    paymentTypes: {
      cash: false,
      card: false,
      mobileMoney: false
    },
    logo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          setError('Please upload an image file (JPEG, PNG, etc.)');
          return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size should be less than 5MB');
          return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
        
        setFormData(prev => ({
          ...prev,
          [name]: file
        }));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        paymentTypes: {
          ...prev.paymentTypes,
          [name]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    
    if (!formData.restaurantName.trim()) {
      setError('Restaurant name is required');
      return;
    }
    
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }
    
    if (!formData.telephone.trim()) {
      setError('Telephone number is required');
      return;
    }
    
    const selectedPaymentTypes = Object.entries(formData.paymentTypes)
      .filter(([_, value]) => value)
      .map(([key]) => key);
      
    if (selectedPaymentTypes.length === 0) {
      setError('Please select at least one payment method');
      return;
    }
    
    // Handle logo upload if present
    let logoUrl = '';
    if (formData.logo) {
      // In a real app, you would upload the file to a storage service here
      // For now, we'll just use the preview URL
      logoUrl = logoPreview;
    }
    
    setIsCreating(true);
    setError('');
    
    try {
      console.log('Creating restaurant with data:', formData);
      
      // Create the restaurant
      const newRestaurant = await createRestaurant({
        name: formData.restaurantName,
        ownerId: user.uid,
        email: user.email,
        city: formData.city,
        telephone: formData.telephone,
        paymentTypes: selectedPaymentTypes,
        logo: logoUrl, // Add the logo URL to the restaurant data
        address: {
          city: formData.city,
          // Add more address fields as needed
        },
        settings: {
          // Add any additional settings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('Restaurant created:', newRestaurant);
      
      // Update the user's profile with the restaurantId
      console.log('Updating user profile with restaurantId:', newRestaurant.id);
      await createUserProfile({
        ...user,
        restaurantId: newRestaurant.id
      }, 'admin');
      
      // Refresh the user data
      console.log('Refreshing user data...');
      const updatedUser = await getUserProfile(user.uid);
      console.log('Updated user data:', updatedUser);
      
      // Call the callback with the new restaurant
      onRestaurantCreated(newRestaurant);
    } catch (err) {
      const errorMsg = 'Failed to create restaurant. Please try again.';
      console.error(errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Bill-O!</CardTitle>
          <CardDescription>Let's set up your restaurant profile to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRestaurant} className="space-y-4">
            <div>
              <div className="space-y-4">
                <div>
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Restaurant logo preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-3.1-3.9a2 2 0 0 0-3.1.1l-3.6 4.6-1.1-1.1a2 2 0 0 0-2.9.1L3 18" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <label className="mt-2">
                      <span className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer">
                        {logoPreview ? 'Change logo' : 'Add restaurant logo (optional)'}
                      </span>
                      <input
                        type="file"
                        name="logo"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="restaurantName">Restaurant Name *</Label>
                  <Input 
                    id="restaurantName" 
                    name="restaurantName"
                    value={formData.restaurantName} 
                    onChange={handleInputChange} 
                    placeholder="e.g., The Blue Moon Bar & Grill" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input 
                    id="city" 
                    name="city"
                    value={formData.city} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Nairobi" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="telephone">Telephone *</Label>
                  <Input 
                    id="telephone" 
                    name="telephone"
                    type="tel"
                    value={formData.telephone} 
                    onChange={handleInputChange} 
                    placeholder="e.g., +254 700 123456" 
                    required 
                  />
                </div>
                
                <div>
                  <Label>Payment Methods Accepted *</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="payment-cash" 
                        name="cash"
                        checked={formData.paymentTypes.cash}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            paymentTypes: { ...prev.paymentTypes, cash: e.target.checked }
                          }))
                        }
                      />
                      <Label htmlFor="payment-cash" className="font-normal">Cash</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="payment-card" 
                        name="card"
                        checked={formData.paymentTypes.card}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            paymentTypes: { ...prev.paymentTypes, card: e.target.checked }
                          }))
                        }
                      />
                      <Label htmlFor="payment-card" className="font-normal">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="payment-mobile" 
                        name="mobileMoney"
                        checked={formData.paymentTypes.mobileMoney}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            paymentTypes: { ...prev.paymentTypes, mobileMoney: e.target.checked }
                          }))
                        }
                      />
                      <Label htmlFor="payment-mobile" className="font-normal">Mobile Money</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Restaurant'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleSheetConnectDialog({ open, onOpenChange }) {
  // Placeholder for Google Sign-In logic
  const handleConnectGoogle = () => {
    alert('Connecting to Google... (placeholder)');
    // In a real implementation, you would trigger the Google OAuth flow here.
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogDescription>
            Sign in with your Google account to link a spreadsheet for your menu.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            You will be redirected to Google to authorize access. We will provide a template for you to use.
          </p>
          <Button onClick={handleConnectGoogle} className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 60.2l-67.4 64.8C295.5 98.2 273.5 84 248 84c-73.2 0-132.3 59.2-132.3 132S174.8 388 248 388c78.2 0 110.3-57.5 114.3-87.2H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RestaurantDashboard
