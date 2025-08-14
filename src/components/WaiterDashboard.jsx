import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock, Utensils, AlertCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  writeBatch, 
  doc, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const WaiterDashboard = ({ waiter }) => {
  console.log('WaiterDashboard mounted with waiter:', waiter);
  
  // All hooks must be declared at the top level, before any conditional returns
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Order form state - modified to include category in each item
  const [orderItems, setOrderItems] = useState([
    { menuItemId: '', quantity: 1, notes: '', category: '' }
  ]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Menu items state
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  
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
  
  // State for managing subscriptions
  const [tabsUnsub, setTabsUnsub] = useState(null);
  const ordersUnsubsRef = useRef([]);
  
  // Debug function - moved to top level
  const debugCheckTabs = useCallback(async () => {
    try {
      console.log('=== DEBUG: Checking Firestore tabs ===');
      const tabsSnapshot = await getDocs(collection(db, 'tabs'));
      tabsSnapshot.forEach(doc => {
        console.log(`Tab ${doc.id}:`, doc.data());
      });
      
      // Also check if we have any active tabs in state
      console.log('Active tabs in state:', activeTabs);
    } catch (error) {
      console.error('Debug check failed:', error);
    }
  }, [activeTabs]);

  // Calculate order total
  const calculateOrderTotal = useCallback((items) => {
    if (!items || !Array.isArray(items)) return 0;
    const total = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
    return total;
  }, []);
  
  // Format time duration
  const formatDuration = useCallback((startTime) => {
    const diff = Math.floor((new Date() - new Date(startTime)) / 1000 / 60);
    return `${diff} min`;
  }, []);
  
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
    setIsLoading(true);
    
    const setupRealtimeTabsAndOrders = () => {
      console.log('Setting up tabs query for restaurant:', restaurantId);
      const tabsQuery = query(
        collection(db, 'tabs'),
        where('restaurantId', '==', restaurantId),
        where('status', 'in', ['active', 'inactive'])
      );
      
      // Set up tabs listener
      const tabsUnsub = onSnapshot(
        tabsQuery, 
        (tabsSnapshot) => {
          try {
            console.log('Tabs snapshot received:', {
              size: tabsSnapshot.size,
              empty: tabsSnapshot.empty,
              docs: tabsSnapshot.docs.map(doc => ({
                id: doc.id,
                exists: doc.exists(),
                data: doc.data()
              }))
            });
            
            const tabs = [];
            tabsSnapshot.forEach(doc => {
              try {
                const data = doc.data();
                console.log(`Processing tab ${doc.id}:`, data);
                
                if (!data) {
                  console.warn(`Tab ${doc.id} has no data`);
                  return;
                }
                
                tabs.push({
                  id: doc.id,
                  ...data,
                  referenceNumber: data.referenceNumber || data.tableNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`,
                  total: typeof data.total === 'number' ? data.total : 0,
                  waiterName: data.waiterName || 'Unassigned',
                  _updatedAt: new Date().toISOString()
                });
              } catch (error) {
                console.error(`Error processing tab ${doc.id}:`, error);
              }
            });
            
            console.log('Processed Active Tabs:', tabs);
            setActiveTabs(tabs);
            
            // Set up orders listeners for each tab
            setupOrdersListeners(tabs);
          } catch (error) {
            console.error('Error in tabs snapshot handler:', error);
            setError(`Error processing tabs: ${error.message}`);
          }
        },
        (error) => {
          console.error('Error in tabs listener:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          setError(`Error loading tabs: ${error.message}`);
        }
      );
      
      // Store the tabs unsubscribe function
      setTabsUnsub(() => tabsUnsub);
      
      // Initial setup complete
      setIsLoading(false);
    };
    
    // Set up orders listeners for tabs
    const setupOrdersListeners = (tabs) => {
      // Clear previous orders
      setActiveOrders([]);
      
      // Clear previous orders listeners
      ordersUnsubsRef.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      
      // Reset orders unsubs array
      ordersUnsubsRef.current = [];
      
      // For each tab, listen for its orders
      const allOrders = [];
      
      tabs.forEach(tab => {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('tabId', '==', tab.id)
        );
        
        const unsub = onSnapshot(
          ordersQuery, 
          (ordersSnapshot) => {
            try {
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
              
              // Update all orders for this tab
              const updatedOrders = allOrders
                .filter(o => o.tabId !== tab.id)
                .concat(tabOrders);
              
              // Update state with the new orders
              setActiveOrders([...updatedOrders]);
              
              // Update local allOrders array for the next iteration
              allOrders.length = 0;
              allOrders.push(...updatedOrders);
            } catch (error) {
              console.error('Error processing orders:', error);
              setError(`Error processing orders: ${error.message}`);
            }
          },
          (error) => {
            console.error('Error in orders listener:', {
              code: error.code,
              message: error.message,
              stack: error.stack
            });
            setError(`Error loading orders: ${error.message}`);
          }
        );
        
        // Store the unsubscribe function
        ordersUnsubsRef.current.push(unsub);
      });
    };
    
    setupRealtimeTabsAndOrders();
    
    // Cleanup listeners on unmount
    return () => {
      if (tabsUnsub) tabsUnsub();
      // Clean up any order listeners
      ordersUnsubsRef.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      ordersUnsubsRef.current = [];
      if (menuUnsub) menuUnsub();
    };
  }, [waiterData, currentUser]);
  
  // Call debug function on mount
  useEffect(() => {
    const runDebug = async () => {
      await debugCheckTabs();
    };
    runDebug();
  }, [debugCheckTabs]);

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
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={debugCheckTabs}
            >
              Debug Tabs
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  console.log('Creating test tab...');
                  const tabRef = await addDoc(collection(db, 'tabs'), {
                    restaurantId: restaurantId,
                    status: 'active',
                    referenceNumber: `TAB-${Math.floor(1000 + Math.random() * 9000)}`,
                    total: 0,
                    createdAt: new Date(),
                    waiterId: waiterData.id || currentUser?.uid,
                    waiterName: waiterData.name || 'Test Waiter'
                  });
                  console.log('Test tab created:', tabRef.id);
                  debugCheckTabs();
                } catch (error) {
                  console.error('Error creating test tab:', error);
                }
              }}
            >
              Create Test Tab
            </Button>
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
                  <CardContent className="flex flex-col items-center justify-center p-2 w-full">
                    <div className="flex justify-between w-full items-center mb-1">
                      <span className="text-xs text-gray-500">Tab {tab.referenceNumber}</span>
                      {tab.waiterName && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {tab.waiterName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-lg">
                      ${tab.total ? tab.total.toFixed(2) : '0.00'}
                    </div>
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
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Tab {tabNumber}</h3>
                      {/* Replaced Badge component with a simple span */}
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {tabOrders.length} {tabOrders.length === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
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
                    </div>
                    
                    <div className="mt-auto pt-2 border-t border-gray-100">
                      <div className="flex justify-between font-medium">
                        <span>Tab Total</span>
                        <span>${calculateOrderTotal(tabOrders.flatMap(order => order.items || [])).toFixed(2)}</span>
                      </div>
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
                      // Get the selected tab
                      const selectedTab = activeTabs.find(tab => tab.id === selectedTabId);
                      if (!selectedTab) {
                        throw new Error('Selected tab not found');
                      }

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

                      // Calculate order total
                      const orderTotal = itemsWithDetails.reduce(
                        (sum, item) => sum + (item.price * item.quantity), 
                        0
                      );
                      
                      // Create order data
                      const newOrder = {
                        tabId: selectedTabId,
                        tabReferenceNumber: selectedTab.referenceNumber,
                        items: itemsWithDetails,
                        status: 'preparing',
                        createdAt: new Date(),
                        waiterId: waiterData.id || currentUser?.uid,
                        waiterName: waiterData.name || 'Unknown Waiter',
                        restaurantId: restaurantId,
                        total: orderTotal,
                        notes: orderNotes,
                      };
                      
                      try {
                        console.log('Starting batch write with order data:', newOrder);
                        
                        // Start a batch write to update both the order and tab
                        const batch = writeBatch(db);
                        
                        // Add the order
                        const orderRef = doc(collection(db, 'orders'));
                        console.log('Adding order to batch:', orderRef.id, newOrder);
                        batch.set(orderRef, newOrder);
                        
                        // Update the tab's total
                        const tabRef = doc(db, 'tabs', selectedTabId);
                        const tabUpdate = {
                          total: increment(orderTotal),
                          updatedAt: new Date(),
                          status: 'active',
                          waiterId: waiterData.id || currentUser?.uid,
                          waiterName: waiterData.name || 'Unknown Waiter'
                        };
                        
                        console.log('Updating tab in batch:', selectedTabId, tabUpdate);
                        batch.update(tabRef, tabUpdate);
                        
                        // Commit the batch
                        console.log('Committing batch...');
                        await batch.commit();
                        console.log('Batch committed successfully');
                        
                        // Force refresh of tabs data
                        const tabsSnapshot = await getDocs(query(
                          collection(db, 'tabs'),
                          where('restaurantId', '==', restaurantId),
                          where('status', '==', 'active')
                        ));
                        
                        const updatedTabs = tabsSnapshot.docs.map(doc => ({
                          id: doc.id,
                          ...doc.data(),
                          referenceNumber: doc.data().referenceNumber || doc.data().tableNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`
                        }));
                        
                        console.log('Refreshed tabs after update:', updatedTabs);
                        setActiveTabs(updatedTabs);
                        
                      } catch (batchError) {
                        console.error('Error in batch operation:', batchError);
                        console.error('Batch error details:', {
                          code: batchError.code,
                          message: batchError.message,
                          stack: batchError.stack
                        });
                        throw batchError;
                      }
                      
                      // Reset form
                      setShowOrderForm(false);
                      setOrderItems([{ menuItemId: '', quantity: 1, notes: '', category: '' }]);
                      setOrderNotes('');
                      setSelectedMenuItem('');
                      setSelectedTabId('');
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