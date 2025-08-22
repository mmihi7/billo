import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';
import { Button } from './components/ui/button';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';

// Pages
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import AuthPage from './components/auth/AuthPage';
import WaiterDashboardNew from './components/WaiterDashboard';
import RestaurantDashboard from './components/RestaurantDashboard';

// Customer Components
import CustomerAuthPage from './components/customer/CustomerAuthPage';
import RestaurantEntryPage from './pages/RestaurantEntryPage';
import CustomerDashboard from './components/customer/CustomerDashboard';
import SavedRestaurants from './components/customer/SavedRestaurants';
import { ToastContainer } from './components/ui/ToastContainer';
import ToastExample from './components/examples/ToastExample';
import './App.css'

// Protected route component for waiter dashboard
const WaiterRoute = ({ children }) => {
  const location = useLocation();
  const [waiterData, setWaiterData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Check for waiter data in location state or fetch it
    if (location.state?.waiter) {
      setWaiterData(location.state.waiter);
      setLoading(false);
    } else {
      // If no waiter data in location state, show the login/retry UI
      setLoading(false);
    }
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading waiter dashboard...</p>
        </div>
      </div>
    );
  }

  // If we have waiter data, render the protected content
  if (waiterData) {
    const childrenWithProps = React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { 
          waiter: waiterData,
          key: waiterData.id || 'waiter-dashboard'
        });
      }
      return child;
    });
    
    return <>{childrenWithProps}</>;
  }

  // Show login/retry UI if no waiter data
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Access Denied</h2>
        <p className="text-gray-600 mb-6">Please log in to access the waiter dashboard.</p>
        <div className="space-y-4">
          <Button 
            onClick={() => window.location.href = '/landing'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
}

// Protected route component for customer section
const CustomerRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/customer/signin" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        {/* Toast Container for showing notifications */}
        <ToastContainer />
        
        <Routes>
              {/* Public Routes */}
              <Route index element={<HomePage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Waiter Routes */}
              <Route 
                path="/waiter/:waiterId" 
                element={
                  <WaiterRoute>
                    <WaiterDashboardNew />
                  </WaiterRoute>
                } 
              />
              
              {/* Redirect old waiter route */}
              <Route path="/restaurant/waiter" element={<Navigate to="/waiter" replace />} />

              {/* Restaurant Dashboard */}
              <Route path="/restaurant" element={<RestaurantDashboard />} />

              {/* Customer Routes */}
              <Route element={<CustomerLayout requireAuth={false} />}>
                <Route path="/customer/auth" element={<CustomerAuthPage />} />
              </Route>

              <Route element={<CustomerLayout requireAuth={true} />}>
                <Route path="/customer/connect" element={<RestaurantEntryPage />} />
                <Route path="/customer/dashboard" element={<Navigate to="/customer/saved" replace />} />
                <Route path="/customer/restaurant/:restaurantIdentifier" element={<CustomerDashboard />} />
                <Route path="/customer/restaurant/:restaurantIdentifier/tab/:tabReference" element={<CustomerDashboard />} />
                <Route path="/customer/saved" element={<SavedRestaurants />} />
                <Route path="/customer-auth" element={<CustomerAuthPage />} />
                <Route path="/examples/toast" element={<ToastExample />} />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App
