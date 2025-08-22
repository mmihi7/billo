import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../contexts/CustomerAuthContext';
import { Loader2 } from 'lucide-react';

const CustomerLayout = ({ requireAuth = true }) => {
  const { currentUser, loading } = useCustomerAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to login if auth is required but user is not logged in
  if (requireAuth && !currentUser) {
    return <Navigate to="/customer/auth" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if user is logged in and tries to access auth pages
  if (!requireAuth && currentUser) {
    const from = location.state?.from?.pathname || '/customer/dashboard';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};

export default CustomerLayout;
