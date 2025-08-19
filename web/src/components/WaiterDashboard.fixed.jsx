import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Clock, Utensils, AlertCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  doc, 
  updateDoc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// Tab Card Component
const TabCard = ({ tab, onClick, isActive }) => {
  const total = typeof tab.total === 'number' ? tab.total : 0;
  const orderCount = tab.orderCount || 0;
  const isInactive = tab.status === 'inactive';
  
  return (
    <Card
      className={`w-32 h-20 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow ${
        isActive 
          ? 'border-l-4 border-l-green-500 bg-green-50' 
          : isInactive
            ? 'border-l-4 border-l-yellow-500 bg-yellow-50'
            : 'border-l-4 border-l-gray-300 bg-gray-50'
      }`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-2 w-full">
        <div className="flex justify-between w-full items-center mb-1">
          <div className="flex items-center">
            <span className="text-xs text-gray-700 font-medium">
              {tab.referenceNumber || `TAB-${tab.id?.substring(0, 4).toUpperCase()}`}
            </span>
            <span className={`ml-1 w-2 h-2 rounded-full ${
              isActive ? 'bg-green-500' : isInactive ? 'bg-yellow-500' : 'bg-gray-400'
            }`}></span>
          </div>
          {orderCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              isActive 
                ? 'bg-green-100 text-green-800' 
                : isInactive
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {orderCount} {orderCount === 1 ? 'order' : 'orders'}
            </span>
          )}
        </div>
        <div className={`font-bold text-lg ${
          isActive ? 'text-gray-900' : isInactive ? 'text-yellow-800' : 'text-gray-600'
        }`}>
          ${total.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
};

const WaiterDashboard = ({ waiter }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTabs, setActiveTabs] = useState([]);
  const [inactiveTabs, setInactiveTabs] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  // Refs
  const ordersUnsubsRef = useRef([]);
  
  // Constants
  const restaurantId = 'me3tspMt9QdBX37A4Xco';
  
  // Get waiter data from props or location state
  const waiterData = React.useMemo(() => ({
    id: waiter?.id || location.state?.waiter?.id || currentUser?.uid,
    name: waiter?.name || location.state?.waiter?.name || currentUser?.displayName || 'Waiter'
  }), [waiter, location.state, currentUser]);

  // Load all tabs for the restaurant
  const loadTabs = useCallback(() => {
    const tabsQuery = query(
      collection(db, 'tabs'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(tabsQuery, (snapshot) => {
      const active = [];
      const inactive = [];
      
      snapshot.forEach(doc => {
        const tabData = {
          id: doc.id,
          ...doc.data(),
          referenceNumber: doc.data().referenceNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`,
          total: typeof doc.data().total === 'number' ? doc.data().total : 0,
          orderCount: doc.data().orderCount || 0,
        };

        if (tabData.status === 'active') {
          active.push(tabData);
        } else {
          inactive.push(tabData);
        }
      });

      setActiveTabs(active);
      setInactiveTabs(inactive);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading tabs:', error);
      setError('Failed to load tabs. Please refresh the page.');
      setIsLoading(false);
    });
  }, []);

  // Load menu items
  const loadMenuItems = useCallback(() => {
    const menuQuery = query(
      collection(db, 'menuItems'),
      where('restaurantId', '==', restaurantId)
    );
    
    return onSnapshot(menuQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenuItems(items);
    });
  }, []);

  // Handle order submission
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTabId || !selectedItems.length) {
      toast.error('Please select a tab and at least one item');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get the current tab data
      const tabDoc = await getDoc(doc(db, 'tabs', selectedTabId));
      if (!tabDoc.exists()) {
        throw new Error('Tab not found');
      }
      
      const tabData = tabDoc.data();
      const isNewTab = tabData.status === 'inactive';
      
      // Create a new order
      const orderRef = doc(collection(db, 'orders'));
      const orderTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const newOrder = {
        id: orderRef.id,
        tabId: selectedTabId,
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          notes: item.notes || ''
        })),
        status: 'pending',
        total: orderTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
        waiterId: waiterData.id,
        waiterName: waiterData.name
      };

      // Use a batch to ensure atomic updates
      const batch = writeBatch(db);
      
      // Add the new order
      batch.set(orderRef, newOrder);
      
      // Update the tab
      const tabUpdate = {
        status: 'active',
        waiterId: waiterData.id,
        waiterName: waiterData.name,
        orderCount: (tabData.orderCount || 0) + 1,
        updatedAt: new Date()
      };
      
      // Only update total if it's not a new tab to avoid overwriting
      if (!isNewTab) {
        tabUpdate.total = (tabData.total || 0) + orderTotal;
      }
      
      batch.update(doc(db, 'tabs', selectedTabId), tabUpdate);
      
      // Commit the batch
      await batch.commit();
      
      // Update the tab total based on all orders if it's a new tab
      if (isNewTab) {
        await updateTabTotal(selectedTabId);
      }
      
      // Reset form
      setSelectedItems([]);
      setSelectedTabId('');
      setShowOrderForm(false);
      
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update tab total based on all orders
  const updateTabTotal = async (tabId) => {
    try {
      const ordersSnapshot = await getDocs(query(
        collection(db, 'orders'),
        where('tabId', '==', tabId)
      ));
      
      let total = 0;
      let orderCount = 0;
      let itemCount = 0;
      
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        if (order.items && Array.isArray(order.items)) {
          const orderTotal = order.items.reduce((sum, item) => {
            return sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1));
          }, 0);
          total += orderTotal;
          orderCount++;
          itemCount += order.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
        }
      });
      
      await updateDoc(doc(db, 'tabs', tabId), {
        total,
        orderCount,
        itemCount,
        updatedAt: new Date()
      });
      
      return total;
    } catch (error) {
      console.error(`Error updating tab ${tabId} total:`, error);
      throw error;
    }
  };

  // Load data on mount
  useEffect(() => {
    const tabsUnsubscribe = loadTabs();
    const menuUnsubscribe = loadMenuItems();
    
    return () => {
      tabsUnsubscribe();
      menuUnsubscribe();
      ordersUnsubsRef.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [loadTabs, loadMenuItems]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
              <p className="text-gray-600">Welcome, {waiterData.name}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/waiterhome')}
            >
              Exit
            </Button>
          </div>
        </header>

        {/* Active Tabs Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Active Tabs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeTabs.length > 0 ? (
              activeTabs.map(tab => (
                <TabCard 
                  key={tab.id}
                  tab={tab}
                  isActive={selectedTabId === tab.id}
                  onClick={() => {
                    setSelectedTabId(tab.id);
                    setShowOrderForm(true);
                  }}
                />
              ))
            ) : (
              <p className="text-gray-500">No active tabs</p>
            )}
          </div>
        </section>

        {/* Inactive Tabs Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Available Tables</h2>
            <span className="text-sm text-gray-500">Click to take an order</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {inactiveTabs.length > 0 ? (
              inactiveTabs.map(tab => (
                <TabCard 
                  key={tab.id}
                  tab={tab}
                  isActive={false}
                  onClick={() => {
                    setSelectedTabId(tab.id);
                    setShowOrderForm(true);
                  }}
                />
              ))
            ) : (
              <p className="text-gray-500">No available tables</p>
            )}
          </div>
        </section>

        {/* Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">New Order</h3>
                  <button 
                    onClick={() => setShowOrderForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleOrderSubmit}>
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Table: {selectedTabId ? (activeTabs.find(t => t.id === selectedTabId)?.referenceNumber || `TAB-${selectedTabId.substring(0, 4).toUpperCase()}`) : 'N/A'}</h4>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Order Items</h4>
                    <div className="space-y-4">
                      {menuItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItems(prev => {
                                  const existing = prev.find(i => i.id === item.id);
                                  if (existing) {
                                    return prev.map(i => 
                                      i.id === item.id 
                                        ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                        : i
                                    ).filter(i => i.quantity > 0);
                                  }
                                  return prev;
                                });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span>
                              {selectedItems.find(i => i.id === item.id)?.quantity || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItems(prev => {
                                  const existing = prev.find(i => i.id === item.id);
                                  if (existing) {
                                    return prev.map(i => 
                                      i.id === item.id 
                                        ? { ...i, quantity: i.quantity + 1 } 
                                        : i
                                    );
                                  }
                                  return [...prev, { ...item, quantity: 1 }];
                                });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowOrderForm(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={selectedItems.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterDashboard;
