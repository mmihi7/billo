import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, Utensils, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const WaiterDashboard = ({ waiter }) => {
  console.log('WaiterDashboard mounted with waiter:', waiter);
  
  // Order form state - modified to include category in each item
  const [orderItems, setOrderItems] = useState([
    { menuItemId: '', quantity: 1, notes: '', category: '' }
  ]);
  const [orderNotes, setOrderNotes] = useState('');
  // Menu items state
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  // Hooks
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
  const restaurantId = 'me3tspMt9QdBX37A4Xco';
  
  // Use the waiter prop or fallback to location state
  const waiterData = React.useMemo(() => {
    return waiter || location.state?.waiter || {};
  }, [waiter, location.state]);
  
  // Load active tabs and orders on component mount
  useEffect(() => {
    // Load menu items and categories for the restaurant
    const loadMenuItems = () => {
      try {
        const menuQuery = query(
          collection(db, 'menuItems'),
          where('restaurantId', '==', restaurantId)
        );
        const unsubscribe = onSnapshot(menuQuery, (menuSnapshot) => {
          const items = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMenuItems(items);
          const uniqueCategories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);
          setCategories(uniqueCategories);
        });
        return unsubscribe;
      } catch (err) {
        console.error('Error setting up menu items listener:', err);
        return () => {}; // Return noop function in case of error
      }
    };
    
    const menuUnsub = loadMenuItems();

    let tabsUnsub = null;
    let ordersUnsubs = [];
    setIsLoading(true);
    
    const setupRealtimeTabsAndOrders = () => {
      console.log('Setting up tabs query for restaurant:', restaurantId);
      const tabsQuery = query(
        collection(db, 'tabs'),
        where('restaurantId', '==', restaurantId),
        where('status', '==', 'active')
      );
      
      tabsUnsub = onSnapshot(tabsQuery, (tabsSnapshot) => {
        const tabs = tabsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          referenceNumber: doc.data().referenceNumber || doc.data().tableNumber
        }));
        console.log('Active Tabs (realtime):', tabs);
        setActiveTabs(tabs);
        
        // Unsubscribe previous orders listeners
        ordersUnsubs.forEach(unsub => {
          if (typeof unsub === 'function') unsub();
        });
        ordersUnsubs = [];
        
        // For each tab, listen for its orders
        let allOrders = [];
        tabs.forEach(tab => {
          const ordersQuery = query(
            collection(db, 'orders'),
            where('tabId', '==', tab.id)
          );
          const unsub = onSnapshot(ordersQuery, (ordersSnapshot) => {
            const tabOrders = ordersSnapshot.docs.map(doc => {
              const tabRef = tab.referenceNumber || tab.tableNumber;
              console.log('Processing order for tab:', { 
                tabId: tab.id, 
                tabReferenceNumber: tabRef,
                tabData: tab 
              });
              
              const orderData = {
                id: doc.id,
                ...doc.data(),
                tabNumber: tabRef,
                tabStatus: tab.status,
                startTime: tab.createdAt?.toDate ? tab.createdAt.toDate() : new Date()
              };
              console.log('Order data with tab number:', orderData);
              return orderData;
            });
            
            allOrders = allOrders.filter(o => o.tabId !== tab.id).concat(tabOrders);
            setActiveOrders([...allOrders]);
          });
          ordersUnsubs.push(unsub);
        });
      }, (error) => {
        console.error('Error in tabs listener:', error);
        setError('Failed to load tabs: ' + error.message);
        setIsLoading(false);
      });
      setIsLoading(false);
    };
    
    setupRealtimeTabsAndOrders();
    
    // Cleanup listeners on unmount
    return () => {
      if (menuUnsub && typeof menuUnsub === 'function') menuUnsub();
      if (tabsUnsub && typeof tabsUnsub === 'function') tabsUnsub();
      ordersUnsubs.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [waiterData, currentUser]);
  
  // Calculate order total
  const calculateOrderTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    const total = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
    return total;
  };
  
  // Format time duration
  const formatDuration = (startTime) => {
    const diff = Math.floor((new Date() - new Date(startTime)) / 1000 / 60);
    return `${diff} min`;
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
            Exit
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

        {/* Active Orders Section - Grouped by Tab */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Active Tabs with Orders</h2>
          {activeOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(
                activeOrders.reduce((acc, order) => {
                  const tabNumber = order.tabNumber || 'Unknown';
                  if (!acc[tabNumber]) {
                    acc[tabNumber] = [];
                  }
                  acc[tabNumber].push(order);
                  return acc;
                }, {})
              ).map(([tabNumber, tabOrders]) => (
                <Card key={`tab-${tabNumber}`} className="overflow-hidden flex flex-col h-full">
                  <CardHeader className="bg-gray-50 px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">
                          Tab {tabNumber}
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {formatDuration(tabOrders[0].startTime)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      {tabOrders.flatMap(order => 
                        (order.items || []).map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex justify-between text-sm">
                            <div className="flex items-center">
                              <span className="font-medium">{item.quantity}x</span>
                              <span className="ml-2">{item.name}</span>
                              {item.notes && (
                                <span className="ml-2 text-xs text-gray-500">({item.notes})</span>
                              )}
                            </div>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Tab Total</span>
                          <span>${calculateOrderTotal(tabOrders.flatMap(order => order.items || [])).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {tabOrders.length} {tabOrders.length === 1 ? 'order' : 'orders'} for this tab
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <Button 
              variant="outline" 
              className="h-auto py-3"
              onClick={() => setShowOrderForm(true)}
            >
              <div className="text-left">
                <div className="font-medium">New Order</div>
                <div className="text-xs text-gray-500">Create a new order</div>
              </div>
            </Button>
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

        {/* New Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg flex flex-col w-full max-w-md max-h-[90vh]">
              <div className="p-6 pb-0">
                <h2 className="text-lg font-bold mb-4">Create New Order</h2>
              </div>
              <div className="overflow-y-auto px-6 flex-1">
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!selectedTabId || orderItems.length === 0) return;
                    
                    try {
                      // Prepare order items with menu item details
                      const itemsWithDetails = orderItems.map(item => {
                        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                        return {
                          menuItemId: item.menuItemId,
                          name: menuItem?.name || 'Unknown Item',
                          quantity: Number(item.quantity) || 1,
                          notes: item.notes,
                          price: menuItem?.price || 0,
                        };
                      });
                      
                      const newOrder = {
                        tabId: selectedTabId,
                        items: itemsWithDetails,
                        status: 'preparing',
                        createdAt: new Date(),
                        waiterId: waiterData.id || currentUser?.uid,
                        notes: orderNotes,
                      };
                      
                      await addDoc(collection(db, 'orders'), newOrder);
                      
                      // Reset form
                      setShowOrderForm(false);
                      setOrderItems([{ menuItemId: '', quantity: 1, notes: '', category: '' }]);
                      setOrderNotes('');
                      setSelectedMenuItem('');
                    } catch (err) {
                      console.error('Error creating order:', err);
                      alert('Failed to create order. Please try again.');
                    }
                  }}
                >
                  <div className="space-y-4 mb-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 -mr-2">
                    {orderItems.map((item, index) => {
                      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...orderItems];
                                newItems.splice(index, 1);
                                setOrderItems(newItems);
                              }}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          )}

                          {/* Category Select - now per item */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              value={item.category}
                              onChange={e => {
                                const newItems = [...orderItems];
                                newItems[index].category = e.target.value;
                                newItems[index].menuItemId = ''; // Reset menu item when category changes
                                setOrderItems(newItems);
                              }}
                              required
                            >
                              <option value="">-- Select Category --</option>
                              {categories.map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Menu Item Select */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item</label>
                            <select
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              value={item.menuItemId}
                              onChange={e => {
                                const newItems = [...orderItems];
                                newItems[index].menuItemId = e.target.value;
                                setOrderItems(newItems);
                              }}
                              required
                              disabled={!item.category}
                            >
                              <option value="">-- Select Menu Item --</option>
                              {item.category && menuItems
                                .filter(menuItem => menuItem.category === item.category)
                                .map(menuItem => (
                                  <option key={menuItem.id} value={menuItem.id}>
                                    {menuItem.name} (${menuItem.price?.toFixed(2) || '0.00'})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Quantity & Notes */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                required
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...orderItems];
                                  newItems[index].quantity = e.target.value;
                                  setOrderItems(newItems);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                placeholder="e.g., no onions"
                                value={item.notes || ''}
                                onChange={e => {
                                  const newItems = [...orderItems];
                                  newItems[index].notes = e.target.value;
                                  setOrderItems(newItems);
                                }}
                              />
                            </div>
                          </div>

                          {/* Subtotal */}
                          {menuItem && (
                            <div className="mt-2 text-sm text-gray-500">
                              Subtotal: ${(menuItem.price * (item.quantity || 1)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setOrderItems([...orderItems, { menuItemId: '', quantity: 1, notes: '', category: '' }]);
                      }}
                    >
                      + Add Another Item
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="font-medium mb-2">Order Summary</div>
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {orderItems
                        .filter(item => item.menuItemId)
                        .map((item, index) => {
                          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                          if (!menuItem) return null;
                          return (
                            <div key={index} className="flex justify-between text-sm">
                              <div>
                                {item.quantity}x {menuItem.name}
                                {item.notes && ` (${item.notes})`}
                              </div>
                              <div>${(menuItem.price * item.quantity).toFixed(2)}</div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2 font-medium flex justify-between">
                      <span>Total:</span>
                      <span>
                        ${orderItems.reduce((total, item) => {
                          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                          return total + (menuItem?.price || 0) * (item.quantity || 1);
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (Optional)</label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      rows="2"
                      placeholder="Special instructions for the kitchen"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                    />
                  </div>
                  
                  <div className="sticky bottom-0 bg-white pt-4 pb-6 -mx-6 px-6 border-t border-gray-200">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => setShowOrderForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={!selectedTabId || !orderItems.some(item => item.menuItemId)}
                      >
                        Create Order
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default WaiterDashboard;