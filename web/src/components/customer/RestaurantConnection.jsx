import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { getRestaurantById } from '../../lib/database';

const RestaurantConnection = () => {
  const { restaurantId } = useParams();
  const { search } = useLocation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const restaurantData = await getRestaurantById(restaurantId);
        if (!restaurantData) {
          throw new Error('Restaurant not found');
        }
        setRestaurant(restaurantData);
      } catch (err) {
        setError('Failed to load restaurant information');
        console.error('Error fetching restaurant:', err);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId]);

  const handleContinueAsGuest = async () => {
    try {
      // If user is not authenticated, redirect to sign-in with guest option
      if (!currentUser) {
        navigate(`/customer/signin?redirect=/customer/restaurant/${restaurantId}/menu&guest=true`);
        return;
      }
      // If already authenticated, go to menu
      navigate(`/customer/restaurant/${restaurantId}/menu`);
    } catch (error) {
      console.error('Error in guest flow:', error);
      setError('Failed to continue as guest. Please try again.');
    }
  };
  
  // Build authentication URLs with redirect to the menu
  const getAuthUrl = (mode) => {
    const params = new URLSearchParams();
    params.append('restaurantId', restaurantId);
    params.append('redirect', `/customer/restaurant/${restaurantId}/menu`);
    return `/customer/${mode}?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Restaurant Not Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find the restaurant you're looking for. The QR code might be invalid or expired.</p>
          <Button onClick={() => navigate('/customer')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Avatar className="h-16 w-16 mx-auto">
              <AvatarImage src={restaurant.logo} />
              <AvatarFallback className="text-2xl">
                {restaurant.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>Welcome to {restaurant.name}</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to view your bill and order history
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to={getAuthUrl('signin')}>Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={getAuthUrl('signup')}>Create Account</Link>
            </Button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <Button variant="ghost" className="w-full" onClick={handleContinueAsGuest}>
            Continue as Guest
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantConnection;
