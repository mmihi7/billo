import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, Clock, Utensils, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const WaiterDashboardNew = ({ waiter }) => {
  // Order form state
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  // Menu items state
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  // Hooks must be called unconditionally at the top level
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeTabs, setActiveTabs] = useState([]);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState('');
  const restaurantId = 'me3tspMt9QdBX37A4Xco'; // Updated to match Firestore
  
  // Use the waiter prop or fallback to location state
  const waiterData = React.useMemo(() => {
    return waiter || location.state?.waiter || {};
  }, [waiter, location.state]);
  // Load tables and active orders on component mount
  useEffect(() => {
    // Load menu items and categories for the restaurant
    const loadMenuItems = async () => {
      try {
        const menuQuery = query(
          collection(db, 'menuItems'),
          where('restaurantId', '==', restaurantId)
        );
        const { onSnapshot } = await import('firebase/firestore');
        onSnapshot(menuQuery, (menuSnapshot) => {
          const items = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMenuItems(items);
          const uniqueCategories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);
          setCategories(uniqueCategories);
        });
      } catch (err) {
        console.error('Error loading menu items:', err);
      }
    };
    loadMenuItems();

    let tabsUnsub = null;
    let ordersUnsubs = [];
    setIsLoading(true);
    const setupRealtimeTabsAndOrders = async () => {
      const { onSnapshot, query, collection, where } = await import('firebase/firestore');
      const tabsQuery = query(
        collection(db, 'tabs'),
        where('restaurantId', '==', restaurantId),
        where('status', '==', 'active')
      );
      tabsUnsub = onSnapshot(tabsQuery, (tabsSnapshot) => {
        const tabs = tabsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveTabs(tabs);
        // Unsubscribe previous orders listeners
        ordersUnsubs.forEach(unsub => unsub && unsub());
        ordersUnsubs = [];
        // For each tab, listen for its orders
        let allOrders = [];
        tabs.forEach(tab => {
          const ordersQuery = query(
            collection(db, 'orders'),
            where('tabId', '==', tab.id)
          );
          const unsub = onSnapshot(ordersQuery, (ordersSnapshot) => {
            const tabOrders = ordersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              tableNumber: tab.tableNumber,
              tabStatus: tab.status,
              startTime: tab.createdAt?.toDate ? tab.createdAt.toDate() : new Date()
            }));
            // Merge orders for all tabs
            allOrders = allOrders.filter(o => o.tabId !== tab.id).concat(tabOrders);
            setActiveOrders([...allOrders]);
          });
          ordersUnsubs.push(unsub);
        });
      });
      setIsLoading(false);
    };
    setupRealtimeTabsAndOrders();
    // Cleanup listeners on unmount
    return () => {
      if (tabsUnsub) tabsUnsub();
      ordersUnsubs.forEach(unsub => unsub && unsub());
    };
  }, [waiterData, currentUser]);
  
  // Calculate order total
  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };
  
  // Format time duration
  const formatDuration = (startTime) => {
    const diff = Math.floor((new Date() - new Date(startTime)) / 1000 / 60); // in minutes
    return `${diff} min`;
  };
  
  // Handle table click
  // Removed table click handler
  
  // Handle order action
  const handleOrderAction = (order, action) => {
    console.log(`${action} order:`, order.id);
    // In a real app, this would update the order status in the database
  };
  
  // Render loading state
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
  
  // Render error state
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
  
  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
            {waiterData.name ? (
              <p className="text-sm text-gray-500">Welcome back, {waiterData.name}!</p>
            ) : (
              <p className="text-sm text-gray-500">Waiter Dashboard</p>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/waiterhome')}
          >
            Switch Waiter
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Active Tabs as Micro Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Tabs</h2>
          <div className="flex flex-wrap gap-3">
            {activeTabs.length > 0 ? (
              activeTabs.map(tab => (
                <Card
                  key={tab.id}
                  className="w-32 h-20 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg border border-gray-200"
                  onClick={() => {
                    setSelectedTabId(tab.id);
                    setShowOrderForm(true);
                  }}
                >
                  <CardContent className="flex flex-col items-center justify-center p-2">
                    <span className="text-xs text-gray-500">Tab</span>
                    <span className="font-bold text-lg">{tab.referenceNumber}</span>
                  </CardContent>
                </Card>
              ))
            ) : (
              <span className="text-gray-500">No active tabs</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Active Orders Only */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Active Orders</h2>
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                activeOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 px-4 py-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Table {order.tableNumber}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {formatDuration(order.startTime)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {(order.items || []).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <div className="flex items-center">
                              <span className="font-medium">{item.quantity}x</span>
                              <span className="ml-2">{item.name}</span>
                            </div>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>${calculateOrderTotal(order.items || [])}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <div>
                          {order.status === 'preparing' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Utensils className="w-3 h-3 mr-1" />
                              Preparing
                            </span>
                          )}
                          {order.status === 'ready' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ready to Serve
                            </span>
                          )}
                        </div>
                        <div className="space-x-2">
                          {order.status === 'ready' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleOrderAction(order, 'serve')}
                            >
                              Mark as Served
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Utensils className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No active orders</h3>
                    <p className="text-gray-500">New orders will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-3">
      {/* New Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create New Order</h2>
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!selectedTabId || !selectedMenuItem || !orderQuantity) return;
                try {
                  // Find selected menu item details
                  const menuItem = menuItems.find(item => item.id === selectedMenuItem);
                  // Create order object
                  const newOrder = {
                    tabId: selectedTabId,
                    items: [
                      {
                        menuItemId: selectedMenuItem,
                        name: menuItem?.name || '',
                        quantity: Number(orderQuantity),
                        notes: orderNotes,
                        price: menuItem?.price || 0,
                      }
                    ],
                    status: 'preparing',
                    createdAt: new Date(),
                    waiterId: waiterData.id || currentUser?.uid,
                  };
                  const { addDoc } = await import('firebase/firestore');
                  await addDoc(collection(db, 'orders'), newOrder);
                  setShowOrderForm(false);
                  setOrderQuantity(1);
                  setOrderNotes('');
                  setSelectedMenuItem('');
                  setSelectedCategory('');
                  // Reload orders
                  if (typeof loadOrdersAndTabs === 'function') {
                    await loadOrdersAndTabs();
                  } else {
                    window.location.reload();
                  }
                } catch (err) {
                  console.error('Error creating order:', err);
                  alert('Failed to create order. Please try again.');
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setSelectedMenuItem('');
                  }}
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={selectedMenuItem}
                  onChange={e => setSelectedMenuItem(e.target.value)}
                  required
                  disabled={!selectedCategory}
                >
                  <option value="">-- Select Menu Item --</option>
                  {menuItems.filter(item => item.category === selectedCategory).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                  value={orderQuantity}
                  onChange={e => setOrderQuantity(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows="2"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowOrderForm(false)}>Cancel</Button>
                <Button type="submit" disabled={!selectedTabId || !selectedMenuItem}>Create Order</Button>
              </div>
            </form>
          </div>
        </div>
      )}
                <Button 
                  variant="outline" 
                  className="h-auto py-3"
                  onClick={() => navigate('/menu')}
                >
                  <div className="text-left">
                    <div className="font-medium">View Menu</div>
                    <div className="text-xs text-gray-500">Browse menu items</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default WaiterDashboardNew;
