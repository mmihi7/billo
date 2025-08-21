import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LogIn, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper function to validate phone number
const validatePhoneNumber = (phone) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid phone number (between 10-15 digits)
  return /^\d{10,15}$/.test(digits);
};

const CustomerAuthPage = ({ mode = 'signin' }) => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const { login, signup, loginWithGoogle, loginAnonymously } = useAuth();
  const navigate = useNavigate();
  const isSignIn = mode === 'signin';
  const restaurantId = searchParams.get('restaurantId');
  const redirectTo = searchParams.get('redirect') || (restaurantId ? `/customer/restaurant/${restaurantId}/menu` : '/customer');
  const isGuestFlow = searchParams.get('guest') === 'true';

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Format phone number as user types
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format as (123) 456-7890
    if (value.length > 3 && value.length <= 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    }
    
    setFormData(prev => ({
      ...prev,
      phone: value
    }));
    
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }
    
    // Name validation (only for signup)
    if (!isSignIn && !formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isSignIn) {
        await login(formData.email || formData.phone, formData.password);
      } else {
        await signup(formData.email || formData.phone, formData.password, formData.name);
      }
      
      // Redirect to the specified URL or default
      navigate(redirectTo);
    } catch (error) {
      console.error('Authentication error:', error);
      setErrors({ submit: error.message || 'Failed to authenticate. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle guest access
  const handleGuestAccess = async () => {
    try {
      await loginAnonymously();
      navigate(redirectTo);
    } catch (error) {
      console.error('Guest access error:', error);
      setErrors({ submit: 'Failed to continue as guest. Please try again.' });
    }
  };

  // Auto-handle guest flow on component mount
  useEffect(() => {
    if (isGuestFlow) {
      handleGuestAccess();
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      navigate(redirectTo);
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrors({ submit: error.message || 'Failed to sign in with Google' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div 
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignIn ? 'Welcome Back!' : 'Join Billo'}
          </h1>
          <p className="text-gray-600">
            {isSignIn ? 'Sign in to continue to your account' : 'Create your customer account'}
          </p>
        </div>

        {errors.form && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
            <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSignIn && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                {errors.name && (
                  <span className="text-xs text-red-600">{errors.name}</span>
                )}
              </div>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full ${errors.name ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              {errors.email && (
                <span className="text-xs text-red-600">{errors.email}</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`w-full pl-10 ${errors.email ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              {errors.phone && (
                <span className="text-xs text-red-600">{errors.phone}</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Smartphone className={`h-4 w-4 ${errors.phone ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(123) 456-7890"
                className={`pl-10 w-full ${errors.phone ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                maxLength={15}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isSignIn ? 'Sign In' : 'Create Account'}
            </Button>
            
            {isSignIn && (
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGuestAccess}
                disabled={isSubmitting}
              >
                Continue as Guest
              </Button>
            )}
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-4"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
        </Button>

        <div className="mt-6 text-center text-sm">
          {isSignIn ? (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/customer/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/customer/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
