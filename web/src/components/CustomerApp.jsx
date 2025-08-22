import { useState, useEffect } from 'react';
import { useSearchParams, Link, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { createTab, getRestaurantById, subscribeToTabUpdates, subscribeToTabOrders } from '../lib/database';
import { db } from '../lib/firebase';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Separator } from "@/components/ui/separator.jsx";
import { ArrowLeft, CheckCircle, Clock, QrCode, Receipt } from 'lucide-react';
import CustomerHome from './customer/CustomerHome';
import QRCodeScanner from './customer/QRCodeScanner';
import CustomerDashboard from './customer/CustomerDashboard';
import CustomerNameInput from './CustomerNameInput';
import { useAuth } from '../contexts/AuthContext';

// Layout component for customer section
function CustomerLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Redirect to customer login if not authenticated
  if (!currentUser) {
    return <Navigate to="/customer/signin" state={{ from: location }} replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}

// Component for handling the tab view
function TabView() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('loading'); // 'loading', 'scan', 'tab', 'error'
  const [tab, setTab] = useState(null);
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState('');
  const [billAccepted, setBillAccepted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const restaurantId = searchParams.get('restaurantId');
    const tabIdFromStorage = sessionStorage.getItem(`tabId-${restaurantId}`);

    if (!restaurantId) {
      setView('scan');
      return;
    }

    const initializeTab = async () => {
      try {
        const restaurantData = await getRestaurantById(restaurantId);
        if (!restaurantData) {
          setError('Restaurant not found. The QR code may be invalid.');
          setView('error');
          return;
        }
        setRestaurant(restaurantData);

        let existingTab = null;
        if (tabIdFromStorage) {
          // Fetch the tab from Firestore
          const { getDoc, doc } = await import('firebase/firestore');
          const tabDoc = await getDoc(doc(db, 'tabs', tabIdFromStorage));
          if (tabDoc.exists()) {
            existingTab = { id: tabDoc.id, ...tabDoc.data() };
          }
        }

        // If tab exists and is active or pending, use it
        if (existingTab && (existingTab.status === 'active' || existingTab.status === 'pending')) {
          setTab(existingTab);
          setView('tab');
          return;
        }

        // Otherwise, create a new tab
        const newTab = await createTab({
          restaurantId: restaurantData.id,
          restaurantName: restaurantData.name,
        });
        setTab(newTab);
        sessionStorage.setItem(`tabId-${restaurantId}`, newTab.id);
        setView('tab');
      } catch (err) {
        console.error(err);
        setError('Failed to create a new tab. Please try again.');
        setView('error');
      }
    };

    initializeTab();
  }, [searchParams]);

  useEffect(() => {
    if (!tab?.id) return;

    const unsubscribeTab = subscribeToTabUpdates(tab.id, setTab);
    const unsubscribeOrders = subscribeToTabOrders(tab.id, setOrders);

    return () => {
      unsubscribeTab();
      unsubscribeOrders();
    };
  }, [tab?.id]);

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Opening Your Tab...</p>
        </div>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-sm text-center border-red-500">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Link to="/">
              <Button className="w-full mt-4">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'scan') {
    // This view is shown when the user navigates to /customer directly
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Open a Tab</h1>
          </div>
          <Card className="text-center">
            <CardHeader>
              <QrCode className="w-24 h-24 text-primary mx-auto mb-4" />
              <CardTitle>Scan a Restaurant's QR Code</CardTitle>
              <CardDescription>
                To open a tab, please scan the QR code provided by the restaurant.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (view === 'tab' && tab) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/customer">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Your Tab</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{restaurant?.name}</CardTitle>
              <CardDescription>
                Your tab is open! Show this number to your waiter to add orders.
              </CardDescription>
              <div className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Your Tab Number</p>
                <p className="text-4xl font-bold tracking-widest text-primary bg-muted p-4 rounded-lg">
                  {tab.referenceNumber}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Your Orders</h2>
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  <Clock className="w-4 h-4 mr-1" />
                  {tab.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                {orders.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Your orders will appear here once added by the waiter.
                  </p>
                )}
                {orders.map((order) => (
                  <div key={order.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{order.itemName} (x{order.quantity})</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}
                      </p>
                    </div>
                    <p>${(order.price * order.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg">
                  <p>Total</p>
                  <p>${tab.total.toFixed(2)}</p>
                </div>
              </div>

              <Button className="w-full mt-4" disabled={tab.status !== 'pending_acceptance'}>
                <Receipt className="w-4 h-4 mr-2" />
                Proceed to Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null; // Fallback
}

function CustomerApp() {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<CustomerHome />} />
        <Route path="tab" element={<TabView />} />
        <Route path="scan" element={<QRCodeScanner />} />
        <Route path="saved" element={<div>Saved Restaurants</div>} />
        <Route path="billing" element={<div>Billing</div>} />
        <Route path="help" element={<div>Help</div>} />
        <Route path="restaurant/:restaurantId/start" element={<CustomerNameInput />} />
        <Route path="restaurant/:restaurantId/menu" element={<CustomerDashboard />} />
      </Route>
    </Routes>
  );
}

export default CustomerApp
