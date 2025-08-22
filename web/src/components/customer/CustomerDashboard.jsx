import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Loader2, CheckCircle, CreditCard, Clock, AlertCircle, ArrowLeft, MapPin, Star, RefreshCw, LogOut, History as HistoryIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { format } from 'date-fns';

const CustomerDashboard = () => {
  const { toast } = useToast();
  const { restaurantIdentifier, tabReference } = useParams();
  const { currentUser, signOut, saveRestaurant, savedRestaurants } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [bills, setBills] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [restaurantId, setRestaurantId] = useState(null);
  const [currentTab, setCurrentTab] = useState(null);
  const [unsubscribeFns, setUnsubscribeFns] = useState({
    activeOrders: null,
    pastOrders: null,
    bills: null
  });
  
  const isRestaurantSaved = savedRestaurants?.some(r => r.id === restaurantId);

  // Load tab data if we have a tab reference
  const loadTabData = async (reference) => {
    try {
      const tabsRef = collection(db, 'tabs');
      const q = query(tabsRef, where('referenceNumber', '==', reference));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const tabDoc = querySnapshot.docs[0];
        const tabData = { id: tabDoc.id, ...tabDoc.data() };
        setCurrentTab(tabData);
        
        // Set the restaurant ID from the tab data
        if (tabData.restaurantId) {
          setRestaurantId(tabData.restaurantId);
          return tabData.restaurantId;
        }
      }
      return null;
    } catch (err) {
      console.error('Error loading tab data:', err);
      return null;
    }
  };

  // Fetch restaurant by name, ID, or nameSlug
  const fetchRestaurantByIdentifier = async (identifier) => {
    if (!identifier) {
      console.error('No identifier provided to fetchRestaurantByIdentifier');
      return null;
    }

    console.log(`Looking up restaurant with identifier: ${identifier}`);
    
    try {
      // Try to get by ID first (for backward compatibility)
      console.log('Trying to find restaurant by ID...');
      const docRef = doc(db, 'restaurants', identifier);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('Found restaurant by ID:', docSnap.id);
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      // If not found by ID, try to find by nameSlug (case insensitive)
      console.log('Not found by ID, trying by nameSlug...');
      const q = query(
        collection(db, 'restaurants'),
        where('nameSlug', '==', identifier.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log('Found restaurant by nameSlug:', doc.id);
        return { id: doc.id, ...doc.data() };
      }
      
      // If still not found, try to find by name (case insensitive)
      console.log('Not found by nameSlug, trying by name...');
      const nameQuery = query(
        collection(db, 'restaurants'),
        where('name', '>=', identifier),
        where('name', '<=', identifier + '\uf8ff')
      );
      
      const nameQuerySnapshot = await getDocs(nameQuery);
      if (!nameQuerySnapshot.empty) {
        const doc = nameQuerySnapshot.docs[0];
        console.log('Found restaurant by name:', doc.id);
        return { id: doc.id, ...doc.data() };
      }
      
      console.log('No restaurant found with identifier:', identifier);
      return null;
    } catch (error) {
      console.error('Error in fetchRestaurantByIdentifier:', {
        error,
        identifier,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  };

  // Load restaurant and its data
  useEffect(() => {
    if (!restaurantIdentifier || !currentUser) {
      if (!restaurantIdentifier) {
        navigate('/customer/saved');
      }
      return;
    }

    const loadRestaurantData = async () => {
      if (!currentUser || !restaurantIdentifier) return;

      setLoading(true);
      setError(null);
      
      try {
        // Look up the restaurant
        const restaurant = await fetchRestaurantByIdentifier(restaurantIdentifier);
        if (!restaurant) {
          setError('Restaurant not found');
          setLoading(false);
          return;
        }

        setRestaurant(restaurant);
        
        // Initialize unsubscribers object
        const unsubscribers = {
          activeOrders: null,
          pastOrders: null,
          bills: null
        };

        try {
          // Set up real-time listeners for orders in the root collection
          unsubscribers.activeOrders = onSnapshot(
            query(
              collection(db, 'orders'),
              where('customerId', '==', currentUser.uid),
              where('restaurantId', '==', restaurant.id),
              where('status', 'in', ['pending', 'preparing', 'ready']),
              orderBy('createdAt', 'desc')
            ),
            (snapshot) => {
              const orders = [];
              snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
              });
              setActiveOrders(orders);
            },
            (error) => {
              console.error('Error fetching active orders:', error);
              setError('Failed to load active orders');
            }
          );

          unsubscribers.pastOrders = onSnapshot(
            query(
              collection(db, 'orders'),
              where('customerId', '==', currentUser.uid),
              where('restaurantId', '==', restaurant.id),
              where('status', 'in', ['completed', 'cancelled']),
              orderBy('createdAt', 'desc')
            ),
            (snapshot) => {
              const orders = [];
              snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
              });
              setPastOrders(orders);
            },
            (error) => {
              console.error('Error fetching past orders:', error);
              setError('Failed to load order history');
            }
          );

          try {
            // First, try to query with the correct index
            unsubscribers.bills = onSnapshot(
              query(
                collection(db, 'bills'),
                where('restaurantId', '==', restaurant.id),
                where('customerId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
              ),
              (snapshot) => {
                const bills = [];
                snapshot.forEach((doc) => {
                  bills.push({ id: doc.id, ...doc.data() });
                });
                setBills(bills);
              },
              (error) => {
                console.error('Error fetching bills:', error);
                // If the error is about missing index, provide a helpful message
                if (error.code === 'failed-precondition') {
                  console.error('Firestore index missing. Please create a composite index for this query.');
                  console.error('Index required for: bills collection with fields: restaurantId, customerId, createdAt');
                }
                setError('Failed to load bills. Please try again later.');
              }
            );
          } catch (error) {
            console.error('Error setting up bills listener:', error);
            setError('Failed to set up bills listener');
          }

          // Save the unsubscribe functions
          setUnsubscribeFns(unsubscribers);

          // Update URL to use nameSlug if it's not already in the URL
          if (restaurant.nameSlug && restaurant.nameSlug !== restaurantIdentifier) {
            navigate(`/customer/restaurant/${restaurant.nameSlug}`, { 
              replace: true, 
              state: location.state 
            });
            return;
          }

          // Save restaurant to user's list if coming from connect flow
          if (location.state?.fromConnect && !isRestaurantSaved) {
            await handleSaveRestaurant(restaurant);
          }
        } catch (error) {
          console.error('Error setting up listeners:', error);
          setError('Failed to set up real-time updates');
          // Clean up any listeners that were created
          Object.values(unsubscribers).forEach(unsubscribe => {
            if (unsubscribe && typeof unsubscribe === 'function') {
              unsubscribe();
            }
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading restaurant data:', error);
        setError('Failed to load restaurant data. Please try again.');
        setLoading(false);
      } 
    };

    loadRestaurantData();

    // Cleanup function
    return () => {
      // Clean up any active listeners
      if (unsubscribeFns.activeOrders && typeof unsubscribeFns.activeOrders === 'function') {
        unsubscribeFns.activeOrders();
      }
      if (unsubscribeFns.pastOrders && typeof unsubscribeFns.pastOrders === 'function') {
        unsubscribeFns.pastOrders();
      }
      if (unsubscribeFns.bills && typeof unsubscribeFns.bills === 'function') {
        unsubscribeFns.bills();
      }
    };
  }, [restaurantIdentifier, currentUser, navigate, location.state, isRestaurantSaved]);

  const handleSaveRestaurant = async (restaurantData) => {
    if (!currentUser || !restaurantData) return;
    
    setSaving(true);
    try {
      await saveRestaurant({
        id: restaurantData.id,
        name: restaurantData.name,
        address: restaurantData.address,
        image: restaurantData.logoUrl || '/restaurant-placeholder.jpg',
        lastVisited: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        nameSlug: restaurantData.nameSlug || restaurantData.name.toLowerCase().replace(/\s+/g, '-')
      });
      
      toast({
        title: 'Restaurant saved!',
        description: `${restaurantData.name} has been added to your saved restaurants.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving restaurant:', error);
      toast({
        title: 'Error',
        description: 'Failed to save restaurant. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptBill = async (billId) => {
    // Implementation for accepting a bill
  };

  const handlePayBill = async (bill) => {
    // Implementation for paying a bill
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return format(timestamp.toDate(), 'MMM d, yyyy h:mm a');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading restaurant data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Error Loading Restaurant</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => navigate('/customer/saved')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Saved Restaurants
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/customer/saved')}
              className="text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {restaurant?.name || 'Restaurant Dashboard'}
              </h1>
              {restaurant?.address && (
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  {typeof restaurant.address === 'object' 
                    ? [
                        restaurant.address.street,
                        restaurant.address.city,
                        restaurant.address.state,
                        restaurant.address.postalCode
                      ].filter(Boolean).join(', ')
                    : restaurant.address
                  }
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isRestaurantSaved && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => restaurant && handleSaveRestaurant(restaurant)}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Star className="mr-2 h-4 w-4" />
                )}
                Save Restaurant
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Number Display */}
        {tabReference && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h2 className="text-lg font-semibold text-blue-800">Your Tab Number</h2>
            <div className="mt-2 text-4xl font-bold text-blue-600">
              {tabReference}
            </div>
            <p className="mt-2 text-sm text-blue-700">
              Please show this number to your waiter when ordering
            </p>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active">
              <Clock className="h-4 w-4 mr-2" />
              Active Orders
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon className="h-4 w-4 mr-2" />
              Order History
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="active">
            <div className="space-y-4">
              {activeOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
                  <p className="mt-1 text-sm text-gray-500">Your active orders will appear here.</p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Order #{order.referenceNumber}</p>
                          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>${order.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Order History Tab */}
          <TabsContent value="history">
            <div className="space-y-4">
              {pastOrders.length === 0 ? (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No order history</h3>
                  <p className="mt-1 text-sm text-gray-500">Your past orders will appear here.</p>
                </div>
              ) : (
                pastOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Order #{order.referenceNumber}</p>
                          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {order.items?.slice(0, 2).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <p className="text-sm text-gray-500">+{order.items.length - 2} more items</p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>${order.total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CustomerDashboard;
