import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, QrCode, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getRestaurantByName, createTab } from '@/lib/database';

const RestaurantConnect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  // Check for restaurant name in URL params on mount
  useEffect(() => {
    const name = searchParams.get('name');
    if (name) {
      setRestaurantName(name);
    }
  }, [searchParams]);

  const handleNameChange = (e) => {
    // Auto-capitalize first letter of each word
    const value = e.target.value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    setRestaurantName(value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!restaurantName.trim()) {
      setError('Please enter a restaurant name');
      return;
    }
    handleCodeSubmit(restaurantName.trim());
  };

  const handleCodeSubmit = async (name) => {
    if (!name || name.length < 3) {
      setError('Please enter a valid restaurant name (at least 3 characters)');
      return;
    }

    setStatus('loading');
    try {
      // Convert to lowercase to match nameSlug format
      const nameSlug = name.toLowerCase().trim();
      
      // Find restaurant by name
      const restaurant = await getRestaurantByName(nameSlug);
      
      if (!restaurant) {
        setError('Restaurant not found. Please check the name and try again.');
        setStatus('error');
        return;
      }

      // Navigate to the customer dashboard for this restaurant
      navigate(`/customer/restaurant/${restaurant.id}`);
    } catch (err) {
      console.error('Error connecting to restaurant:', err);
      setError('Error connecting to restaurant. Please try again.');
      setStatus('error');
    }
  };

  const handleScanClick = () => {
    navigate('/customer/scan');
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connected!</h2>
          <p className="text-gray-600 mb-6">Taking you to the restaurant's menu...</p>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-blue-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Connect to a Restaurant</h1>
              <p className="text-sm text-blue-100">Enter the 6-character code or scan a QR code</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="restaurantCode" className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name or Code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="restaurantCode"
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="Enter restaurant name or code"
                    className="text-center text-lg py-6 px-4"
                    autoFocus
                  />
                  {code && (
                    <button
                      type="button"
                      onClick={() => {
                        setCode('');
                        setError('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={!isValid || isLoading || status === 'loading'}
                  className="h-14 px-6 text-base font-medium"
                  size="lg"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-character code provided by the restaurant
              </p>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleScanClick}
            className="w-full h-14 text-base font-medium flex items-center justify-center gap-2"
            size="lg"
          >
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </Button>
        </div>

        {/* Help Text */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Need help?</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Ask restaurant staff for assistance or scan the QR code at your table.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantConnect;
