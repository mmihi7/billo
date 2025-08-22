import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';

// Pages
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import AuthPage from './components/auth/AuthPage';
import WaiterDashboard from './components/WaiterDashboard';
import RestaurantDashboard from './components/RestaurantDashboard';

// Customer Components
import CustomerAuthPage from './components/customer/CustomerAuthPage';
import RestaurantConnect from './components/customer/RestaurantConnect';
import CustomerDashboard from './components/customer/CustomerDashboard.old';
import SavedRestaurants from './components/customer/SavedRestaurants';

// Protected route component for waiter dashboard
const WaiterRoute = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CustomerAuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Waiter Routes */}
            <Route 
              path="/waiter/:waiterId" 
              element={
                <WaiterRoute>
                  <WaiterDashboard />
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
              <Route path="/customer/connect" element={<RestaurantConnect />} />
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/restaurant/:restaurantId" element={<CustomerDashboard />} />
              <Route path="/customer/saved" element={<SavedRestaurants />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CustomerAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
