import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function WaiterDashboardNew() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [waiters, setWaiters] = useState([]);
  const [error, setError] = useState('');
  const restaurantId = 'ojKj5ydoUmNzfx5pfcm2'; // Hardcoded for testing
  
  // Debug function to manually check waiters
  const debugWaiters = async () => {
    try {
      console.log('1. Starting manual waiters query...');
      const q = query(
        collection(db, 'waiters'),
        where('restaurantId', '==', restaurantId)
      );
      
      console.log('2. Query created, executing...');
      const querySnapshot = await getDocs(q);
      
      console.log('3. Query completed, results:', {
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
      
      // Set the waiters state
      const waitersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setWaiters(waitersData);
      setError(waitersData.length === 0 ? 'No waiters found for this restaurant.' : '');
      
    } catch (error) {
      console.error('Error in debugWaiters:', error);
      setError('Failed to load waiters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    console.log('Component mounted, currentUser:', currentUser);
    debugWaiters();
  }, []);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p>Loading waiters...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button 
            onClick={debugWaiters} 
            variant="outline" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  // Handle waiter selection
  const handleWaiterSelect = (waiter) => {
    console.log('Waiter selected:', waiter);
    // Add your waiter selection logic here
  };

  // Render waiter list
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Select Waiter</h1>
      
      <div className="space-y-4">
        {waiters.length > 0 ? (
          waiters.map(waiter => (
            <Card 
              key={waiter.id} 
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handleWaiterSelect(waiter)}
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{waiter.name}</h3>
                  <p className="text-sm text-gray-500">{waiter.role || 'Waiter'}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No waiters found for this restaurant.</p>
            <div className="mt-4">
              <Button onClick={debugWaiters} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Debug Info:</h3>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify({
            restaurantId,
            waitersCount: waiters.length,
            currentUser: currentUser ? {
              uid: currentUser.uid,
              email: currentUser.email,
              hasRestaurantId: !!currentUser.restaurantId
            } : 'No user',
            waiters: waiters.map(w => ({
              id: w.id,
              name: w.name,
              role: w.role,
              pin: w.pin ? '***' : 'No PIN'
            }))
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  // Helper functions
  const calculateTotal = (items = []) => {
    if (!items || !Array.isArray(items)) return '0.00';
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0).toFixed(2);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'preparing':
        return <Badge variant="secondary">Preparing</Badge>;
      case 'ready':
        return <Badge className="bg-green-500 hover:bg-green-600">Ready</Badge>;
      case 'served':
        return <Badge variant="outline">Served</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Tab Detail View
  const TabDetailView = ({ tab, onBack }) => {
    const [tabOrders, setTabOrders] = useState([]);

    // Load orders for this tab
    useEffect(() => {
      if (!tab?.id) return;
      
      const unsubscribe = subscribeToTabOrders(tab.id, (orders) => {
        setTabOrders(orders);
      });
      
      return () => unsubscribe();
    }, [tab?.id]);

    const handleUpdateStatus = async (orderId, status) => {
      try {
        await updateOrderStatus(orderId, status);
        toast({
          title: 'Order updated',
          description: `Order marked as ${status}`,
        });
      } catch (error) {
        console.error('Error updating order status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update order status',
          variant: 'destructive',
        });
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
          <div className="text-right">
            <h2 className="text-xl font-semibold">
              {tab.customerName || `Table ${tab.tableNumber || 'N/A'}`}
            </h2>
            <p className="text-sm text-muted-foreground">Tab #{tab.referenceNumber}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Current Orders</CardTitle>
              <Button 
                size="sm" 
                onClick={() => {
                  setSelectedTab(tab);
                  setCurrentView('addOrder');
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tabOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{order.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.quantity} × KSh {parseFloat(order.price).toFixed(2)}
                        </div>
                        {order.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {order.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          KSh {(order.price * order.quantity).toFixed(2)}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="mt-2 pt-2 border-t flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        >
                          <Check className="w-4 h-4 mr-1" /> Mark Preparing
                        </Button>
                      </div>
                    )}
                    
                    {order.status === 'preparing' && (
                      <div className="mt-2 pt-2 border-t flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Mark Ready
                        </Button>
                      </div>
                    )}
                    
                    {order.status === 'ready' && (
                      <div className="mt-2 pt-2 border-t flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'served')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Mark as Served
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>KSh {calculateTotal(tabOrders)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Helper function to get category icon
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return <Pizza className="w-4 h-4 mr-2" />;
      case 'drink':
        return <GlassWater className="w-4 h-4 mr-2" />;
      case 'alcohol':
        return <Coffee className="w-4 h-4 mr-2" />;
      case 'dessert':
        return <IceCream className="w-4 h-4 mr-2" />;
      default:
        return <Utensils className="w-4 h-4 mr-2" />;
    }
  };

  // Get unique categories from menu items
  const categories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))];
  
  // Filter menu items based on search and category
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle adding items to order
  const handleAddToOrder = (item) => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { ...item, quantity: 1 }]
    }));
  };

  // Handle updating order item quantity
  const updateOrderItemQuantity = (index, change) => {
    const newItems = [...newOrder.items];
    const newQty = newItems[index].quantity + change;
    
    if (newQty < 1) {
      newItems.splice(index, 1);
    } else {
      newItems[index].quantity = newQty;
    }
    
    setNewOrder(prev => ({
      ...prev,
      items: newItems
    }));
  };

  // Handle submitting the order
  const handleSubmitOrder = async () => {
    if (newOrder.items.length === 0 || !selectedTab) return;
    
    setIsLoading(true);
    try {
      // Add each item as a separate order
      for (const item of newOrder.items) {
        await addOrderToTab(selectedTab.id, {
              <CardDescription>Please contact your manager to set up your waiter account.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Default return (shouldn't be reached)
  return null;
}

export default WaiterDashboardNew;
