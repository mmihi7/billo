import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getRestaurantByName, createTab, getExistingTab } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

const RestaurantEntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill from URL if available
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

  const checkExistingTab = async (userId, restaurantId) => {
    if (!userId || !restaurantId) {
      console.log('Missing userId or restaurantId in checkExistingTab');
      return null;
    }
    
    try {
      console.log(`Checking for existing tab for user ${userId} at restaurant ${restaurantId}`);
      const existingTab = await getExistingTab(restaurantId, userId);
      console.log('Existing tab found:', existingTab ? 'Yes' : 'No');
      return existingTab;
    } catch (error) {
      console.error('Error checking for existing tab:', {
        error: error.message,
        userId,
        restaurantId,
        stack: error.stack
      });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = restaurantName.trim();
    if (!trimmedName) {
      setError('Please enter a restaurant name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('=== Starting restaurant lookup ===');
      console.log('Input name:', trimmedName);
      
      try {
        const restaurant = await getRestaurantByName(trimmedName);
        console.log('Restaurant lookup result:', restaurant ? 'Found' : 'Not found', restaurant);
        
        if (!restaurant) {
          console.log('Restaurant not found with name:', trimmedName);
          setError('Restaurant not found. Please check the name and try again.');
          return;
        }
        
        console.log('Found restaurant:', {
          id: restaurant.id,
          name: restaurant.name,
          nameSlug: restaurant.nameSlug
        });
        console.log('Current user:', currentUser?.email || 'No user');

        // Check if user already has a tab at this restaurant (active or inactive)
        if (currentUser?.uid) {
          try {
            console.log('Checking for existing tab...');
            const existingTab = await checkExistingTab(currentUser.uid, restaurant.id);
            
            if (existingTab) {
              console.log('User already has a tab:', existingTab);
              
              // Show a brief message before redirecting
              setError('You already have a tab at this restaurant. Redirecting...');
              
              // Small delay to show the message
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Navigate to existing tab
              const targetUrl = `/customer/restaurant/${restaurant.id}/tab/${existingTab.referenceNumber}`;
              console.log('Redirecting to existing tab:', targetUrl);
              navigate(targetUrl);
              return;
            }
            console.log('No existing tab found');
          } catch (tabCheckError) {
            console.error('Error checking for existing tab:', tabCheckError);
            // Continue with tab creation if there was an error checking
          }
        }

        // Prepare tab data
        const tabData = {
          restaurantId: restaurant.id,
          createdBy: currentUser ? 'customer' : 'guest',
          status: 'inactive',
          customerId: currentUser?.uid || null,
          customerName: currentUser?.displayName || 'Guest',
          tableNumber: null,
          createdAt: new Date().toISOString()
        };
        
        console.log('Creating tab with data:', tabData);
        
        try {
          // Create a new tab for the user
          console.log('Calling createTab...');
          const newTab = await createTab(tabData);
          console.log('New tab created:', newTab);
          
          if (!newTab) {
            throw new Error('createTab returned null or undefined');
          }
          
          if (!newTab.referenceNumber) {
            console.error('Tab created but missing referenceNumber:', newTab);
            throw new Error('Failed to create tab: Missing reference number');
          }

          // Navigate to the customer dashboard for this restaurant
          const targetUrl = `/customer/restaurant/${restaurant.id}/tab/${newTab.referenceNumber}`;
          console.log('Navigation URL:', targetUrl);
          
          // Double check the URL format
          if (!targetUrl.match(/\/customer\/restaurant\/[^\/]+\/tab\/\d+/)) {
            console.error('Invalid navigation URL format:', targetUrl);
            throw new Error('Invalid navigation URL format');
          }
          
          console.log('Navigating to customer dashboard...');
          navigate(targetUrl);
          return; // Success, exit the function
          
        } catch (tabError) {
          console.error('Error creating tab:', {
            error: tabError.message,
            stack: tabError.stack,
            tabData
          });
          throw new Error(`Failed to create tab: ${tabError.message}`);
        }
        
      } catch (lookupError) {
        console.error('Error in restaurant lookup:', {
          error: lookupError.message,
          stack: lookupError.stack,
          nameSlug
        });
        throw new Error(`Error finding restaurant: ${lookupError.message}`);
      }
      
    } catch (err) {
      console.error('Error in handleSubmit:', {
        error: err.message,
        stack: err.stack,
        restaurantName,
        hasUser: !!currentUser,
        userId: currentUser?.uid
      });
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center">Enter Restaurant Name</h1>
          <p className="text-muted-foreground text-center mt-2">
            Type the name exactly as shown on the restaurant's poster
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              value={restaurantName}
              onChange={handleNameChange}
              placeholder="e.g. Carnivore, Java House, etc."
              className="text-center text-lg py-6"
              autoFocus
              disabled={isLoading}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full py-6 text-lg"
            disabled={isLoading || !restaurantName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Finding Restaurant...
              </>
            ) : (
              'Continue to Restaurant'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantEntryPage;
