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
  const [selectedItems, setSelectedItems] = useState([{ menuItemId: '', quantity: 1, notes: '', category: '' }]);
  const [orderNotes, setOrderNotes] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTabs, setAllTabs] = useState([]); // All tabs for the restaurant
  const [myActiveTabs, setMyActiveTabs] = useState([]); // Tabs assigned to this waiter
  const [myOrders, setMyOrders] = useState([]); // Orders for myActiveTabs
  const [selectedTabId, setSelectedTabId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  
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

  // --- EFFECT: Listen for ALL Tabs (for Inactive Tabs) ---
  useEffect(() => {
    if (!restaurantId) return;

    console.log("[All Tabs Effect] Setting up listener for all tabs in restaurant:", restaurantId);
    const tabsQuery = query(
      collection(db, 'tabs'),
      where('restaurantId', '==', restaurantId)
      // No status filter here to get all tabs
    );

    const unsubscribe = onSnapshot(tabsQuery, (tabsSnapshot) => {
      console.log("[All Tabs Listener] Snapshot received. Size:", tabsSnapshot.size);
      const tabs = [];
      tabsSnapshot.forEach((doc) => {
        const data = doc.data();
        tabs.push({
          id: doc.id,
          ...data,
          referenceNumber: data.referenceNumber || data.tableNumber || `TAB-${doc.id.substring(0, 4).toUpperCase()}`,
          total: typeof data.total === 'number' ? data.total : 0,
          waiterName: data.waiterName || 'Unassigned',
        });
      });
      setAllTabs(tabs);
      console.log("[All Tabs Effect] All tabs updated:", tabs.length);
    }, (error) => {
       console.error("[All Tabs Listener] Error:", error);
       setError(`Error loading tabs: ${error.message}`);
    });

    allTabsUnsubRef.current = unsubscribe;

    return () => {
      console.log("[All Tabs Effect] Cleaning up all tabs listener");
      if (allTabsUnsubRef.current) allTabsUnsubRef.current();
    };
  }, [restaurantId]);

  // --- EFFECT: Listen for MY Active Tabs ---
  useEffect(() => {
    if (!waiterData.id || !restaurantId) return;

    console.log("[My Active Tabs Effect] Setting up listener for active tabs assigned to waiter:", waiterData.id);
    const myActiveTabsQuery = query(
      collection(db, 'tabs'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'active'), // Only active tabs
      where('waiterId', '==', waiterData.id) // Only assigned to me
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

  const handleOrderSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedTabId || !selectedItems.some(item => item.menuItemId)) {
      toast.error('Please select a tab and at least one valid menu item');
      return;
    }
    try {
      setIsSubmitting(true);
      
      // Determine if the selected tab is currently inactive
      const selectedTab = allTabs.find(tab => tab.id === selectedTabId);
      if (!selectedTab) {
        throw new Error('Selected tab not found');
      }
      
      // Prepare order items
      const itemsWithDetails = selectedItems
        .filter(item => item.menuItemId)
        .map(item => {
          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
          return {
            menuItemId: item.menuItemId,
            name: menuItem?.name || 'Unknown Item',
            price: parseFloat(menuItem?.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            notes: item.notes || ''
          };
        });

      if (itemsWithDetails.length === 0) {
          toast.error('No valid items to order.');
          return;
      }

      const orderTotal = itemsWithDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // --- Firestore Batch Write ---
      const batch = writeBatch(db);
      
      // 1. Create new order document
      const newOrderRef = doc(collection(db, 'orders'));
      const newOrder = {
        id: newOrderRef.id,
        tabId: selectedTabId,
        tabReferenceNumber: selectedTab.referenceNumber,
        items: itemsWithDetails,
        status: 'pending',
        total: orderTotal,
        createdAt: new Date(),
        updatedAt: new Date(),
        waiterId: waiterData.id,
        waiterName: waiterData.name,
        restaurantId: restaurantId,
        notes: orderNotes,
      };
      batch.set(newOrderRef, newOrder);
      
      // 2. Update the tab document to make it active and assign to waiter
      const tabRef = doc(db, 'tabs', selectedTabId);
      const tabUpdate = {
        status: 'active', // Activate the tab
        waiterId: waiterData.id, // Assign waiter
        waiterName: waiterData.name,
        updatedAt: new Date()
        // total will be updated below
      };
      batch.update(tabRef, tabUpdate);
      
      // 3. Commit the batch
      console.log('[Order Submit] Committing batch write for new order...');
      await batch.commit();
      console.log('[Order Submit] Batch write successful.');
      
      // 4. Update tab total *after* successful commit
      await updateTabTotal(selectedTabId);
      
      // 5. Reset form state
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
  }, [selectedTabId, selectedItems, allTabs, menuItems, waiterData, restaurantId, orderNotes, updateTabTotal]);

  // --- Derived State for Rendering ---
  // Inactive tabs are those from allTabs that are NOT active
  const inactiveTabs = allTabs.filter(tab => tab.status !== 'active');

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
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs Section */}
        <div className="space-y-6 mb-8">
          {/* Active Tabs - Only tabs assigned to this waiter */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Active Tabs</h2>
            <div className="flex flex-wrap gap-3">
              {myActiveTabs.length > 0 ? (
                myActiveTabs.map(tab => (
                  <TabCard 
                    key={tab.id} 
                    tab={tab} 
                    onClick={() => {
                      setSelectedTabId(tab.id);
                      setShowOrderForm(true);
                    }}
                    isActive={true}
                  />
                ))
              ) : (
                <div className="w-full text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  No active tabs assigned to you
                </div>
              )}
            </div>
          </div>
          
          {/* Inactive Tabs - All tabs that are not active (visible to all waiters) */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Inactive Tabs</h2>
            <div className="flex flex-wrap gap-3">
              {inactiveTabs.length > 0 ? (
                inactiveTabs.map(tab => (
                  <TabCard 
                    key={tab.id} 
                    tab={tab} 
                    onClick={() => {
                      setSelectedTabId(tab.id);
                      setShowOrderForm(true);
                    }}
                    isActive={false}
                  />
                ))
              ) : (
                <div className="w-full text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  No inactive tabs available
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Orders Section - Only orders for tabs assigned to this waiter */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Tabs Orders</h2>
          {myOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Group orders by tabId */}
              {Object.entries(
                myOrders.reduce((acc, order) => {
                  const tabId = order.tabId || 'Unknown';
                  if (!acc[tabId]) {
                    acc[tabId] = [];
                  }
                  acc[tabId].push(order);
                  return acc;
                }, {})
              ).map(([tabId, tabOrders]) => {
                 const tab = myActiveTabs.find(t => t.id === tabId); // Find tab details from myActiveTabs
                 const tabReference = tab ? (tab.referenceNumber || tab.id?.substring(0, 4)) : 'Unknown Tab';
                 return (
                  <Card key={`tab-orders-${tabId}`} className="overflow-hidden flex flex-col h-full">
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Tab {tabReference}</h3>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {tabOrders.length} {tabOrders.length === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
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
                    </CardContent>
                  </Card>
                 );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Utensils className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No orders for your tabs</h3>
                <p className="text-gray-500">Orders will appear here once you place them</p>
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
      </main>
    </div>
  );
};

export default WaiterDashboard;