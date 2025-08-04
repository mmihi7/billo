import React, { useState, useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AlertCircle } from 'lucide-react'
import CustomerApp from './components/CustomerApp'
import WaiterDashboard from './components/WaiterDashboard'
import WaiterDashboardNew from './components/WaiterDashboardNew'
import RestaurantDashboard from './components/RestaurantDashboard'
import HomePage from './components/HomePage'
import LandingPage from './components/LandingPage'
import CustomerNameInput from './components/CustomerNameInput'
import CustomerDashboard from './components/CustomerDashboard'
import QRCodeScanner from './components/QRCodeScanner'
import WaiterHome from './components/WaiterHome'
import { Button } from './components/ui/button'
import './App.css'

// Protected route component for waiter dashboard
const WaiterRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [showError, setShowError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [waiterData, setWaiterData] = useState(null)
  
  // Use the children prop or default to WaiterDashboardNew
  const content = children || <WaiterDashboardNew />

  useEffect(() => {
    console.log('WaiterRoute - Auth state changed:', { user, loading })
    
    // Check if we have waiter data in location state (passed during navigation)
    if (location.state?.waiter) {
      console.log('Waiter data found in location state:', location.state.waiter)
      setWaiterData(location.state.waiter)
      setShowError('')
      setIsCheckingAuth(false)
      return
    }
    
    // If no user in auth context and not loading, show error
    if (!loading && !user) {
      console.error('No authenticated user found')
      setShowError('You need to be logged in to access this page')
      setIsCheckingAuth(false)
    } else if (user) {
      console.log('User authenticated:', user.email)
      setShowError('')
      setIsCheckingAuth(false)
    }
  }, [user, loading, location.state])

  if (loading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading waiter dashboard...</p>
        </div>
      </div>
    )
  }

  if (showError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{showError}</p>
          <Button 
            onClick={() => window.location.href = '/landing'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Login
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // If we have waiter data, render the content with waiter data
  if (waiterData || user) {
    // Clone the children and pass the waiter data as a prop
    const childrenWithProps = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { 
          waiter: waiterData || { id: user?.uid, email: user?.email } 
        });
      }
      return child;
    });
    
    return <>{childrenWithProps}</>;
  }
  
  // Show loading state while checking auth or loading data
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading waiter dashboard...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/customer" element={<CustomerApp />}>
            <Route index element={<QRCodeScanner />} />
            <Route path="restaurant/:restaurantId/start" element={<CustomerNameInput />} />
            <Route path="restaurant/:restaurantId/menu" element={<CustomerDashboard />} />
          </Route>
          
          {/* Restaurant Dashboard */}
          <Route path="/restaurant" element={<RestaurantDashboard />} />
          
          {/* Waiter Home - Lists all waiters */}
          <Route path="/waiterhome" element={<WaiterHome />} />
          
          {/* Individual Waiter Dashboard */}
          <Route 
            path="/waiter/:waiterId" 
            element={
              <WaiterRoute>
                <WaiterDashboardNew />
              </WaiterRoute>
            } 
          />
          
          {/* Redirect old waiter route to new one */}
          <Route path="/restaurant/waiter" element={<Navigate to="/waiter" replace />} />
          
          {/* Legacy waiter dashboard routes have been removed */}
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
