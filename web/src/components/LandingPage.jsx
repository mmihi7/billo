import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getRestaurantById } from '../lib/database';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Smartphone, Globe, Bell } from 'lucide-react';

function LandingPage() {
  const [searchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const restaurantId = searchParams.get('restaurantId');

  useEffect(() => {
    if (restaurantId) {
      getRestaurantById(restaurantId)
        .then(setRestaurant)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [restaurantId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center">Invalid Restaurant QR Code.</div>;
  }

  const androidAppLink = `intent://customer?restaurantId=${restaurantId}#Intent;scheme=billo;package=com.billo.app;end`;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Welcome to</CardTitle>
          <CardDescription className="text-xl font-bold text-primary">{restaurant.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>How would you like to open your tab?</p>
          <Link to={`/customer/signin?restaurantId=${restaurantId}`}>
            <Button className="w-full">
              <Globe className="w-4 h-4 mr-2" />
              Continue in Web Browser
            </Button>
          </Link>
          <a href={androidAppLink}>
            <Button variant="outline" className="w-full">
              <Smartphone className="w-4 h-4 mr-2" />
              Open in Android App
            </Button>
          </a>
          <p className="text-sm text-muted-foreground">
            Don't have the app?{' '}
            <a href="https://play.google.com/store/apps/details?id=com.billo.app" className="text-primary hover:underline">
              Download it here
            </a>
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Development Tools</p>
              <Link to="/examples/toast">
                <Button variant="outline" size="sm" className="w-full">
                  <Bell className="w-4 h-4 mr-2" />
                  Toast Example
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LandingPage;