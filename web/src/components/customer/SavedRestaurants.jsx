import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { MapPin, Clock, ArrowRight, Star } from 'lucide-react';

const SavedRestaurants = () => {
  const { savedRestaurants, removeSavedRestaurant } = useCustomerAuth();
  const navigate = useNavigate();

  const handleRemoveRestaurant = async (restaurantId) => {
    await removeSavedRestaurant(restaurantId);
  };

  const handleConnect = (restaurantId) => {
    navigate(`/customer/restaurant/${restaurantId}`);
  };

  if (savedRestaurants.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No Saved Restaurants</h2>
          <p className="text-muted-foreground mb-6">
            You haven't saved any restaurants yet. Connect to a restaurant to get started.
          </p>
          <Button onClick={() => navigate('/customer/connect')}>
            Connect to a Restaurant
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Saved Restaurants</h1>
        <p className="text-muted-foreground">Your favorite places to dine</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {savedRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {restaurant.address || 'No address provided'}
                  </CardDescription>
                </div>
                <div className="flex items-center bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {restaurant.rating?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {restaurant.hours || 'Hours not specified'}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleRemoveRestaurant(restaurant.id)}
              >
                Remove
              </Button>
              <Button 
                size="sm"
                onClick={() => handleConnect(restaurant.id)}
                className="flex items-center"
              >
                View Menu <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedRestaurants;
