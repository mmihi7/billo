import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LogIn, Mail, Smartphone, AlertCircle, ArrowLeft, Loader2, User, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';

// Helper function to validate phone number
const validatePhoneNumber = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return /^\d{10,15}$/.test(digits);
};

const CustomerAuthPage = () => {
  const { toast } = useToast();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'signin') {
        await signInWithEmail(formData.email, formData.password);
        toast.showToast({
          title: 'Success',
          description: 'Successfully signed in!',
          variant: 'default',
        });
      } else {
        await signUpWithEmail(formData.email, formData.password, formData.name);
        toast.showToast({
          title: 'Success',
          description: 'Account created successfully!',
          variant: 'default',
        });
      }
      
      navigate(redirectTo);
    } catch (error) {
      console.error('Authentication error:', error);
      toast.showToast({
        title: 'Error',
        description: error.message || 'An error occurred during authentication',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      toast.showToast({
        title: 'Success',
        description: 'Successfully signed in with Google!',
        variant: 'default',
      });
      navigate(redirectTo);
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.showToast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'signin' 
              ? 'Enter your credentials to access your account' 
              : 'Create a new account to get started'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`mt-1 ${errors.password ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
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
              
              <Button 
                variant="outline" 
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
                      d="M -14.754 43.714 C -12.984 43.714 -11.404 44.244 -10.054 45.164 L -6.816 41.969 C -8.804 40.109 -11.514 39.189 -14.754 39.189 C -19.444 39.189 -23.444 41.899 -25.074 45.949 L -20.814 49.239 C -19.834 46.869 -17.444 45.359 -14.754 45.359 C -13.104 45.359 -11.574 45.889 -10.324 46.789 C -9.084 47.689 -8.184 49.009 -7.814 50.529 L -3.46396 47.199 C -4.364 44.629 -6.154 42.459 -8.434 41.069 C -10.714 39.679 -13.624 38.999 -14.754 38.999 Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M -3.46396 47.199 L -7.814 50.529 C -7.184 52.199 -6.014 53.619 -4.464 54.609 C -2.924 55.599 -1.014 56.149 1.106 56.149 C 1.966 56.149 2.826 56.039 3.666 55.819 L 3.666 50.529 L 8.016 50.529 C 8.016 51.689 7.836 52.849 7.476 53.949 C 6.756 56.189 5.306 58.199 3.306 59.629 L -0.0839996 62.969 C 2.816 65.719 6.476 67.239 10.356 67.239 C 15.096 67.239 19.186 65.359 21.916 62.199 C 24.646 59.039 26.006 54.909 26.006 50.529 C 26.006 49.369 25.926 48.219 25.776 47.069 L -3.46396 47.199 Z"
                    />
                  </g>
                </svg>
                Continue with Google
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="signup-email" className="text-sm font-medium">Email</label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="signup-password" className="text-sm font-medium">Password</label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`mt-1 ${errors.password ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab('signin')}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAuthPage;
