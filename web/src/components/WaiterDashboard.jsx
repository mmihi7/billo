import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

// --- TabCard Component ---
const TabCard = ({ tab, onClick, isActive }) => {
  const total = typeof tab.total === 'number' ? tab.total : 0;
  const orderCount = tab.orderCount || 0;
  return (
    <Card
      className={`w-32 h-20 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow ${
        isActive 
          ? 'border-l-4 border-l-green-500 bg-green-50' 
          : 'border-l-4 border-l-gray-300 bg-gray-50'
      }`}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-2 w-full">
        <div className="flex justify-between w-full items-center mb-1">
          <div className="flex items-center">
            <span className="text-xs text-gray-700 font-medium">
              Tab {tab.referenceNumber || tab.id?.substring(0, 4)}
            </span>
            <span className={`ml-1 w-2 h-2 rounded-full ${
              isActive ? 'bg-green-500' : 'bg-gray-400'
            }`}></span>
          </div>
          {orderCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {orderCount} {orderCount === 1 ? 'order' : 'orders'}
            </span>
          )}
        </div>
        <div className={`font-bold text-lg ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
          ${total.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
};

const WaiterDashboard = ({ waiter }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // --- State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([{ 
    menuItemId: '', 
    quantity: 1, 
    notes: '', 
    category: '' 
  }]);
  const [orderNotes, setOrderNotes] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTabs, setAllTabs] = useState([]);
  const [myActiveTabs, setMyActiveTabs] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  // Derived state using useMemo for better performance
  const { inactiveTabs, activeTabs, selectedTab } = useMemo(() => ({
    inactiveTabs: allTabs.filter(tab => (tab.orderCount || 0) === 0),
    activeTabs: myActiveTabs.filter(tab => (tab.orderCount || 0) > 0),
    selectedTab: allTabs.find(tab => tab.id === selectedTabId) || null
  }), [allTabs, myActiveTabs, selectedTabId]);
  
  // --- Refs for Cleanup ---
  const allTabsUnsubRef = useRef(null);
  const myActiveTabsUnsubRef = useRef(null);
  const myOrdersUnsubRef = useRef(null);
  const menuUnsubRef = useRef(null);

  // --- Waiter Data (Stable) ---
  const waiterData = {
    id: waiter?.id || currentUser?.uid || '',
    name: waiter?.name || currentUser?.displayName || 'Waiter',
    restaurantId: waiter?.restaurantId || ''
  };

  // --- Restaurant ID ---
  const restaurantId = waiterData.restaurantId;

  // --- EFFECT: Load Menu Items ---
  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }
    console.log("[Menu Effect] Setting up menu listener for restaurant:", restaurantId);
    const menuQuery = query(
      collection(db, 'menuItems'),
      where('restaurantId', '==', restaurantId)
    );
    
    const unsubscribe = onSnapshot(menuQuery, (menuSnapshot) => {
      console.log("[Menu Listener] Snapshot received. Size:", menuSnapshot.size);
      const items = menuSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: parseFloat(doc.data().price) || 0
      }));
      setMenuItems(items);
      const uniqueCategories = ['All', ...Array.from(
        new Set(items.map(item => item.category).filter(Boolean))
      ).sort()];
      setCategories(uniqueCategories);
      setIsLoading(false); // Menu loaded
    }, (error) => {
       console.error("[Menu Listener] Error:", error);
       setError(`Error loading menu: ${error.message}`);
       setIsLoading(false);
    });

    menuUnsubRef.current = unsubscribe;

    return () => {
      console.log("[Menu Effect] Cleaning up menu listener");
      if (menuUnsubRef.current) menuUnsubRef.current();
    };
  }, [restaurantId]);

  // --- EFFECT: Listen for Inactive Tabs (visible to all waiters) ---
  useEffect(() => {
    if (!restaurantId) return;

    console.log("[Inactive Tabs Effect] Setting up listener for inactive tabs in restaurant:", restaurantId);
    const inactiveTabsQuery = query(
      collection(db, 'tabs'),
      where('restaurantId', '==', restaurantId),
      where('orderCount', '==', 0) // Tabs with no orders are inactive
    );

    const unsubscribe = onSnapshot(inactiveTabsQuery, (tabsSnapshot) => {
      console.log("[Inactive Tabs Listener] Snapshot received. Size:", tabsSnapshot.size);
      const tabs = [];
      tabsSnapshot.forEach((doc) => {
        const data = doc.data();
        tabs.push({
          id: doc.id,
          ...data,
          referenceNumber: data.referenceNumber || data.tableNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`,
          total: typeof data.total === 'number' ? data.total : 0,
          status: 'inactive',
          customerName: data.customerName || '',
          waiterName: data.waiterName || 'Unassigned',
        });
      });
      // Only update inactive tabs
      setAllTabs(tabs);
      console.log("[Inactive Tabs Effect] Inactive tabs updated:", tabs.length);
    }, (error) => {
      console.error("[Inactive Tabs Listener] Error:", error);
      setError(`Error loading inactive tabs: ${error.message}`);
    });

    allTabsUnsubRef.current = unsubscribe;

    return () => {
      console.log("[All Tabs Effect] Cleaning up all tabs listener");
      if (allTabsUnsubRef.current) allTabsUnsubRef.current();
    };
  }, [restaurantId]);

  // --- EFFECT: Listen for Active Tabs (only those I've served) ---
  useEffect(() => {
    if (!waiterData.id || !restaurantId) return;

    console.log("[My Active Tabs Effect] Setting up listener for active tabs served by waiter:", waiterData.id);
    const myActiveTabsQuery = query(
      collection(db, 'tabs'),
      where('restaurantId', '==', restaurantId),
      where('orderCount', '>', 0), // Has at least one order
      where('waiterId', '==', waiterData.id) // Only tabs I've served
    );

    const unsubscribe = onSnapshot(myActiveTabsQuery, (tabsSnapshot) => {
      console.log("[My Active Tabs Listener] Snapshot received. Size:", tabsSnapshot.size);
      const tabs = [];
      tabsSnapshot.forEach((doc) => {
        const data = doc.data();
        tabs.push({
          id: doc.id,
          ...data,
          referenceNumber: data.referenceNumber || data.tableNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`,
          total: typeof data.total === 'number' ? data.total : 0,
          status: 'active',
          customerName: data.customerName || '',
          waiterName: data.waiterName || 'Unassigned',
        });
      });
      setMyActiveTabs(tabs);
      console.log("[My Active Tabs Effect] My active tabs updated:", tabs.length);
    }, (error) => {
       console.error("[My Active Tabs Listener] Error:", error);
       setError(`Error loading your active tabs: ${error.message}`);
    });

    myActiveTabsUnsubRef.current = unsubscribe;

    return () => {
      console.log("[My Active Tabs Effect] Cleaning up my active tabs listener");
      if (myActiveTabsUnsubRef.current) myActiveTabsUnsubRef.current();
    };
  }, [waiterData.id, restaurantId]);

  // --- EFFECT: Listen for Orders for MY Active Tabs ---
  useEffect(() => {
    // Only set up orders listener once we know our active tabs
    if (myActiveTabs.length === 0) {
        // Clear orders if no active tabs
        setMyOrders([]);
        return;
    }

    const activeTabIds = myActiveTabs.map(tab => tab.id);
    console.log("[My Orders Effect] Setting up listener for orders in tabs:", activeTabIds);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('tabId', 'in', activeTabIds),
      where('status', 'in', ['pending', 'preparing', 'ready'])
    );

    const unsubscribe = onSnapshot(ordersQuery, (ordersSnapshot) => {
      console.log("[My Orders Listener] Snapshot received. Size:", ordersSnapshot.size);
      const orders = [];
      ordersSnapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      setMyOrders(orders);
      console.log("[My Orders Effect] My orders updated:", orders.length);
    }, (error) => {
       console.error("[My Orders Listener] Error:", error);
       // setError(`Error loading your orders: ${error.message}`); // Log only, don't block UI
    });

    myOrdersUnsubRef.current = unsubscribe;

    return () => {
      console.log("[My Orders Effect] Cleaning up my orders listener");
      if (myOrdersUnsubRef.current) myOrdersUnsubRef.current();
    };
  }, [myActiveTabs]); // Depend on myActiveTabs array

  // --- Callbacks ---

  const updateTabTotal = useCallback(async (tabId) => {
    try {
      console.log(`[updateTabTotal] Recalculating total for tab ${tabId}`);
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
            const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
            return sum + itemTotal;
          }, 0);
          total += orderTotal;
          orderCount++;
          itemCount += order.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
        }
      });
      
      console.log(`[updateTabTotal] Tab ${tabId} - Total: $${total.toFixed(2)}, Orders: ${orderCount}, Items: ${itemCount}`);
      
      const tabRef = doc(db, 'tabs', tabId);
      await updateDoc(tabRef, {
        total: total,
        orderCount: orderCount,
        itemCount: itemCount,
        updatedAt: new Date()
      });
      console.log(`[updateTabTotal] Successfully updated tab ${tabId}`);
      return total;
    } catch (error) {
      console.error(`[updateTabTotal] Error updating tab ${tabId}:`, error);
    }
  }, []);

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedTabId || selectedItems.length === 0) {
      toast.error('Please select a tab and add items to the order');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Filter out any empty items
      const validItems = selectedItems.filter(item => item.menuItemId);
      if (validItems.length === 0) {
        toast.error('Please add at least one item to the order');
        return;
      }

      // Get tab reference and current data
      const tabRef = doc(db, 'tabs', selectedTabId);
      const tabSnap = await getDoc(tabRef);
      
      if (!tabSnap.exists()) {
        throw new Error('Tab not found');
      }
      
      const tabData = tabSnap.data();
      const currentOrderCount = tabData.orderCount || 0;
      const isNewOrder = currentOrderCount === 0;
      
      // Create order document
      const orderRef = doc(collection(db, 'orders'));
      const orderItems = validItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.name || 'Unknown Item',
          price: menuItem?.price || 0,
          quantity: item.quantity,
          notes: item.notes || '',
          status: 'pending',
          category: menuItem?.category || 'Uncategorized'
        };
      });

      // Calculate order total
      const orderTotal = orderItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      // Start batch write
      const batch = writeBatch(db);
      
      // 1. Add the order
      batch.set(orderRef, {
        tabId: selectedTabId,
        items: orderItems,
        status: 'pending',
        total: orderTotal,
        waiterId: waiterData.id,
        waiterName: waiterData.name,
        restaurantId: restaurantId,
        notes: orderNotes,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 2. Update the tab
      const tabUpdate = {
        orderCount: currentOrderCount + 1,
        total: (tabData.total || 0) + orderTotal,
        status: 'active',
        updatedAt: new Date()
      };
      
      // Only update waiter info if this is the first order
      if (isNewOrder) {
        tabUpdate.waiterId = waiterData.id;
        tabUpdate.waiterName = waiterData.name;
      }
      
      batch.update(tabRef, tabUpdate);
      
      // Commit the batch
      await batch.commit();
      
      // Reset form
      setSelectedItems([{ menuItemId: '', quantity: 1, notes: '', category: '' }]);
      setOrderNotes('');
      setSelectedTabId('');
      setShowOrderForm(false);
      
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('[Order Submit] Error placing order:', error);
      toast.error('Failed to place order: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTabId, selectedItems, menuItems, waiterData, restaurantId, orderNotes]);

  // --- New Tab Creation ---
  const handleCreateTab = useCallback(async (customerName = '') => {
    if (!restaurantId) return;
    
    try {
      setIsSubmitting(true);
      
      // Generate a reference number (e.g., TAB-1234)
      const refNumber = `TAB-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newTabRef = doc(collection(db, 'tabs'));
      await setDoc(newTabRef, {
        restaurantId,
        referenceNumber: refNumber,
        status: 'inactive',
        customerName: customerName.trim(),
        orderCount: 0,
        total: 0,
        waiterId: null, // No waiter assigned until first order
        waiterName: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      toast.success(`Created new tab ${refNumber}`);
      return newTabRef.id; // Return the new tab ID
    } catch (error) {
      console.error('Error creating tab:', error);
      toast.error(`Failed to create tab: ${error.message}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [restaurantId]);

  // --- Derived State for Rendering ---
  // Using the memoized values that were already defined above

  // --- Render Logic ---
  if (isLoading) { // Show loading only while initial data is loading
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome, {waiterData.name}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/waiterhome')}
            >
              Exit
            </Button>
          </div>
        </div>
      </header>
      
      {/* Active Tabs Section */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">My Active Tabs</h2>
            <Button 
              onClick={() => setShowOrderForm(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'New Order'}
            </Button>
          </div>
          
          {activeTabs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Utensils className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active tabs</h3>
              <p className="mt-1 text-sm text-gray-500">Create a new order to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTabs.map((tab) => {
                const tabOrders = myOrders.filter(order => order.tabId === tab.id);
                const tabReference = tab.referenceNumber || tab.id?.substring(0, 4);
                
                return (
                  <Card key={tab.id} className="flex flex-col h-full">
                    <CardContent className="flex flex-col h-full p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Tab {tabReference}</h3>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {tabOrders.length} {tabOrders.length === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      {tabOrders.length > 0 ? (
                        <>
                          <div className="space-y-2 mb-3 flex-1 overflow-y-auto">
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
                              <span>${(tabOrders.reduce((sum, order) => sum + (order.total || 0), 0)).toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-4">
                          <div>
                            <Utensils className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">No orders for this tab yet</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
                <form onSubmit={handleOrderSubmit}>
                  {/* Selected Tab Display */}
                  {selectedTabId && (
                    <div className="mb-4 p-2 bg-gray-100 rounded text-sm">
                      <strong>Selected Tab:</strong> {allTabs.find(t => t.id === selectedTabId)?.referenceNumber || selectedTabId}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2 -mr-2">
                    {selectedItems.map((item, index) => {
                      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                          {selectedItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...selectedItems];
                                newItems.splice(index, 1);
                                setSelectedItems(newItems);
                              }}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          )}
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              value={item.category}
                              onChange={e => {
                                const newItems = [...selectedItems];
                                newItems[index].category = e.target.value;
                                newItems[index].menuItemId = ''; // Reset menu item when category changes
                                setSelectedItems(newItems);
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

                          <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item</label>
                            <select
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              value={item.menuItemId}
                              onChange={e => {
                                const newItems = [...selectedItems];
                                newItems[index].menuItemId = e.target.value;
                                setSelectedItems(newItems);
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

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                required
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...selectedItems];
                                  newItems[index].quantity = parseInt(e.target.value) || 1;
                                  setSelectedItems(newItems);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                placeholder="e.g., no onions"
                                value={item.notes || ''}
                                onChange={e => {
                                  const newItems = [...selectedItems];
                                  newItems[index].notes = e.target.value;
                                  setSelectedItems(newItems);
                                }}
                              />
                            </div>
                          </div>

                          {menuItem && (
                            <div className="mt-1 text-xs text-gray-500">
                              Subtotal: ${(menuItem.price * (item.quantity || 1)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedItems([...selectedItems, { menuItemId: '', quantity: 1, notes: '', category: '' }]);
                      }}
                    >
                      + Add Another Item
                    </Button>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                    <div className="font-medium mb-2">Order Summary</div>
                    <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                      {selectedItems
                        .filter(item => item.menuItemId)
                        .map((item, index) => {
                          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                          if (!menuItem) return null;
                          return (
                            <div key={index} className="flex justify-between">
                              <div>
                                {item.quantity}x {menuItem.name}
                                {item.notes && ` (${item.notes})`}
                              </div>
                              <div>${(menuItem.price * item.quantity).toFixed(2)}</div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="border-t border-gray-200 pt-1 mt-2 font-medium flex justify-between">
                      <span>Total:</span>
                      <span>
                        ${selectedItems.reduce((total, item) => {
                          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                          return total + ((menuItem?.price || 0) * (item.quantity || 1));
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (Optional)</label>
                    <textarea
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={!selectedTabId || !selectedItems.some(item => item.menuItemId) || isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? 'Placing...' : 'Create Order'}
                      </Button>
                    </div>
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