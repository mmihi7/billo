import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LogIn, Mail, Smartphone, AlertCircle, ArrowLeft, Loader2, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '../ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';

// Helper function to validate phone number
const validatePhoneNumber = (phone) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid phone number (between 10-15 digits)
  return /^\d{10,15}$/.test(digits);
};

const CustomerAuthPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    currentUser 
  } = useCustomerAuth();
  const navigate = useNavigate();
  
  // Get redirect URL from location state or search params
  const from = location.state?.from?.pathname || '/';
  const restaurantId = searchParams.get('restaurantId');
  const redirectTo = searchParams.get('redirect') || 
                    (restaurantId ? `/customer/restaurant/${restaurantId}` : from);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate(redirectTo, { replace: true });
    }
  }, [currentUser, navigate, redirectTo]);

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
  
  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    
    if (activeTab === 'signup' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      if (activeTab === 'signin') {
        await signInWithEmail(formData.email, formData.password);
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
      } else {
        await signUpWithEmail(formData.email, formData.password, formData.name);
        toast({
          title: 'Account created!',
          description: 'Your account has been created successfully.',
        });
      }
      
      // Navigation is handled by the useEffect that watches currentUser
    } catch (error) {
      console.error('Authentication error:', error);
      
      let errorMessage = 'An error occurred during authentication';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          setActiveTab('signin');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Authentication failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: 'Signed in with Google',
        description: 'You have successfully signed in.',
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: 'Google sign in failed',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-auto h-auto p-0 mb-2 -ml-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <CardTitle className="text-2xl font-bold">
            {activeTab === 'signin' ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'signin' 
              ? 'Sign in to access your bills and saved restaurants' 
              : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="text"
                    placeholder="(123) 456-7890"
                    className="pl-10"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  {activeTab === 'signin' && (
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={activeTab === 'signin' ? '••••••••' : 'At least 6 characters'}
                    className="pl-10"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {activeTab === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : activeTab === 'signin' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                type="button" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" width="24" height="24">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path
                      fill="#4285F4"
                      d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.049 -9.21677 56.159 -10.0802 56.866 L -10.0736 56.866 L -6.016 60.366 C -4.784 61.566 -3.264 62.389 -1.514 62.689 C 0.235 62.989 1.986 62.789 3.616 62.089 C 6.976 60.579 9.236 57.399 9.236 53.469 C 9.236 52.959 9.19596 52.469 9.14596 51.989 C 8.98596 50.549 8.465 49.209 7.695 48.069 L -3.26396 51.509 L -3.264 51.509 Z"
                    />
                    <path
                      fill="#34A853"
                      d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.816 60.366 L -10.0736 56.866 C -11.2336 57.866 -12.754 58.419 -14.754 58.419 C -17.444 58.419 -19.834 56.909 -20.814 54.539 L -24.991 54.539 L -29.015 58.029 C -27.105 61.839 -23.234 63.239 -14.754 63.239 Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M -20.814 54.539 C -21.194 53.419 -21.404 52.219 -21.404 50.999 C -21.404 49.779 -21.194 48.589 -20.814 47.469 L -20.814 43.509 L -24.991 43.509 C -26.231 46.159 -26.234 49.839 -24.991 52.489 L -20.814 54.539 Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M -14.754 43.579 C -12.444 43.579 -10.394 44.509 -8.784 46.119 L -5.464 42.799 C -8.454 39.909 -12.954 39.239 -14.754 39.239 C -23.234 39.239 -27.105 44.159 -29.015 47.969 L -20.814 54.539 C -19.834 52.169 -17.444 50.659 -14.754 50.659 C -12.754 50.659 -11.234 51.259 -10.024 52.339 L -6.816 48.659 C -8.804 46.869 -11.514 45.799 -14.754 45.799 C -13.554 45.799 -12.404 45.989 -11.324 46.329 L -14.754 43.579 Z"
                    />
                  </g>
                </svg>
                Google
              </Button>
            </div>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            By {activeTab === 'signin' ? 'signing in' : 'creating an account'}, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>.
          </p>
          
          {activeTab === 'signin' ? (
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button 
                type="button" 
                className="text-primary hover:underline"
                onClick={() => setActiveTab('signup')}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button 
                type="button"
                className="text-primary hover:underline"
                onClick={() => setActiveTab('signin')}
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

// Google Sign-In button component
const GoogleSignInButton = ({ onClick, disabled }) => (
  <Button 
    variant="outline" 
    type="button" 
    className="w-full"
    onClick={onClick}
    disabled={disabled}
  >
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" width="24" height="24">
      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.049 -9.21677 56.159 -10.0802 56.866 L -10.0736 56.866 L -6.016 60.366 C -4.784 61.566 -3.264 62.389 -1.514 62.689 C 0.235 62.989 1.986 62.789 3.616 62.089 C 6.976 60.579 9.236 57.399 9.236 53.469 C 9.236 52.959 9.19596 52.469 9.14596 51.989 C 8.98596 50.549 8.465 49.209 7.695 48.069 L -3.26396 51.509 L -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.816 60.366 L -10.0736 56.866 C -11.2336 57.866 -12.754 58.419 -14.754 58.419 C -17.444 58.419 -19.834 56.909 -20.814 54.539 L -24.991 54.539 L -29.015 58.029 C -27.105 61.839 -23.234 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -20.814 54.539 C -21.194 53.419 -21.404 52.219 -21.404 50.999 C -21.404 49.779 -21.194 48.589 -20.814 47.469 L -20.814 43.509 L -24.991 43.509 C -26.231 46.159 -26.234 49.839 -24.991 52.489 L -20.814 54.539 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 43.579 C -12.444 43.579 -10.394 44.509 -8.784 46.119 L -5.464 42.799 C -8.454 39.909 -12.954 39.239 -14.754 39.239 C -23.234 39.239 -27.105 44.159 -29.015 47.969 L -20.814 54.539 C -19.834 52.169 -17.444 50.659 -14.754 50.659 C -12.754 50.659 -11.234 51.259 -10.024 52.339 L -6.816 48.659 C -8.804 46.869 -11.514 45.799 -14.754 45.799 C -13.554 45.799 -12.404 45.989 -11.324 46.329 L -14.754 43.579 Z"
              />
            </g>
          </svg>
          Google
        </Button>
      </div>
    </Tabs>
  </CardContent>
  
  <CardFooter className="flex flex-col items-center space-y-4">
    <p className="text-sm text-muted-foreground text-center">
      By {activeTab === 'signin' ? 'signing in' : 'creating an account'}, you agree to our{' '}
      <Link to="/terms" className="text-primary hover:underline">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link to="/privacy" className="text-primary hover:underline">
        Privacy Policy
      </Link>.
    </p>
    
    {activeTab === 'signin' ? (
      <p className="text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button 
          type="button" 
          className="text-primary hover:underline"
          onClick={() => setActiveTab('signup')}
        >
          Sign up
        </button>
      </p>
    ) : (
      <p className="text-gray-600">
        Already have an account?{' '}
        <Link to="/customer/signin" className="text-blue-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    )}
  </CardFooter>
</Card>
</div>
);
};

export default CustomerAuthPage;
