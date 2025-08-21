import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRestaurantById, getMenuItems } from '../../lib/database';
import { useAuth } from '../../contexts/AuthContext';

const RestaurantMenu = () => {
  const { restaurantId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch restaurant data
        const restaurantData = await getRestaurantById(restaurantId);
        if (!restaurantData) {
          throw new Error('Restaurant not found');
        }
        setRestaurant(restaurantData);
        
        // Fetch menu items
        const items = await getMenuItems(restaurantId);
        setMenuItems(items);
        
      } catch (err) {
        console.error('Error loading restaurant data:', err);
        setError('Failed to load restaurant menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchData();
    }
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading menu...</p>
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
          <h2 className="text-xl font-semibold mb-2">Menu Not Available</h2>
          <p className="text-gray-600 mb-6">{error || 'The restaurant menu could not be loaded.'}</p>
          <Button onClick={() => navigate('/customer')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </Button>
        <h1 className="text-2xl font-bold">{restaurant.name} Menu</h1>
      </div>

      <div className="grid gap-6">
        {menuItems.length > 0 ? (
          menuItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <div className="h-48 w-full md:w-48 bg-gray-200 flex items-center justify-center text-gray-400">
                    {item.imageUrl ? (
                      <img className="h-full w-full object-cover" src={item.imageUrl} alt={item.name} />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold">{item.name}</h2>
                  <p className="mt-2 text-gray-600">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
                    <Button>Add to Order</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No menu items available at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenu;
