// Database service functions for Firebase Firestore
import { RestaurantModel, WaiterModel, MenuItemModel } from './models'
import { 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction
} from 'firebase/firestore'
import { db } from './firebase'

// Collections
const TABS_COLLECTION = 'tabs'
const ORDERS_COLLECTION = 'orders'
const PAYMENTS_COLLECTION = 'payments'
const RESTAURANTS_COLLECTION = 'restaurants'
const WAITERS_COLLECTION = 'waiters'
const MENU_ITEMS_COLLECTION = 'menuItems'

// Tab subscription function used by WaiterManager
const subscribeToTabs = (restaurantId, callback) => {
  if (!restaurantId) return () => {};
  
  const q = query(
    collection(db, TABS_COLLECTION),
    where('restaurantId', '==', restaurantId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const tabs = [];
    querySnapshot.forEach((doc) => {
      tabs.push({ id: doc.id, ...doc.data() });
    });
    callback(tabs);
  });
};

// Tab Management Functions
const createTab = async (tabData) => {
  const restaurantRef = doc(db, RESTAURANTS_COLLECTION, tabData.restaurantId);
  const tabsCollectionRef = collection(db, TABS_COLLECTION);

  // For QR code scans, waiter assignment is not required initially
  // Waiter will be assigned when the first order is placed
  const isQrCodeScan = tabData.createdBy === 'customer';
  
  // Only validate waiter assignment if this is not a QR code scan
  if (!isQrCodeScan && (!tabData.waiterName || !tabData.waiterId)) {
    throw new Error('Waiter assignment is required for manual tab creation.');
  }

  try {
    // Use a transaction to atomically update the counter and create the tab.
    const newTabDocData = await runTransaction(db, async (transaction) => {
      const restaurantDoc = await transaction.get(restaurantRef);
      if (!restaurantDoc.exists()) {
        throw new Error("Restaurant not found!");
      }

      const restaurantData = restaurantDoc.data();
      let counter = restaurantData.dailyTabCounter || 0;
      const lastReset = restaurantData.lastTabReset?.toDate();
      const now = new Date();

      // Check if the counter needs to be reset (new day).
      if (!lastReset || lastReset.toDateString() !== now.toDateString()) {
        counter = 1;
      } else {
        counter++;
      }

      // Create the new tab document within the transaction.
      const newTabRef = doc(tabsCollectionRef); // Create a new ref with an auto-generated ID
      
      // Force status to 'inactive' for QR code scans
      // and ensure orderCount is set to 0 for new tabs
      const tabStatus = isQrCodeScan ? 'inactive' : 'active';
      
      transaction.set(newTabRef, {
        ...tabData,
        status: tabStatus,
        total: 0,
        orderCount: 0, // Initialize order count to 0
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        referenceNumber: String(counter),
        // Clear waiter info for QR code scans
        waiterName: isQrCodeScan ? '' : (tabData.waiterName || ''),
        waiterId: isQrCodeScan ? '' : (tabData.waiterId || '')
      });

      // Update the restaurant's counter and reset date within the transaction.
      transaction.update(restaurantRef, {
        dailyTabCounter: counter,
        lastTabReset: now,
      });

      return { id: newTabRef.id };
    });

    // After the transaction, fetch the full document to get server-generated timestamps.
    const finalTabRef = doc(db, TABS_COLLECTION, newTabDocData.id);
    const finalDocSnap = await getDoc(finalTabRef);
    if (finalDocSnap.exists()) {
      return { id: finalDocSnap.id, ...finalDocSnap.data() };
    }
    // This should not happen if the transaction succeeded.
    throw new Error('Could not retrieve newly created tab after transaction.');
  } catch (error) {
    console.error('Error creating tab in transaction:', error)
    throw error
  }
}

const getTabByReference = async (referenceNumber) => {
  try {
    const q = query(
      collection(db, TABS_COLLECTION), 
      where('referenceNumber', '==', referenceNumber)
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const doc = querySnapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  } catch (error) {
    console.error('Error getting tab:', error)
    throw error
  }
}

/**
 * Activates an inactive tab when a waiter is ready to take the first order
 * @param {string} tabId - The ID of the tab to activate
 * @param {object} waiterData - Object containing waiter information
 * @param {string} waiterData.id - The waiter's ID
 * @param {string} waiterData.name - The waiter's name
 */
const activateTab = async (tabId, waiterData) => {
  if (!waiterData || !waiterData.id || !waiterData.name) {
    throw new Error('Waiter information is required to activate a tab');
  }

  const tabRef = doc(db, TABS_COLLECTION, tabId);
  
  return runTransaction(db, async (transaction) => {
    const tabDoc = await transaction.get(tabRef);
    if (!tabDoc.exists()) {
      throw new Error('Tab not found');
    }
    
    const tabData = tabDoc.data();
    
    // Only allow activating inactive tabs
    if (tabData.status !== 'inactive') {
      throw new Error('Only inactive tabs can be activated');
    }
    
    // Update tab with waiter information and mark as active
    transaction.update(tabRef, {
      status: 'active',
      waiterId: waiterData.id,
      waiterName: waiterData.name,
      orderCount: 0, // Initialize order count to 0
      updatedAt: serverTimestamp()
    });
  });
};

const updateTabStatus = async (tabId, status) => {
  try {
    const tabRef = doc(db, TABS_COLLECTION, tabId);
    const tabDoc = await getDoc(tabRef);
    
    if (!tabDoc.exists()) {
      throw new Error('Tab not found');
    }
    
    const tabData = tabDoc.data();
    
    // Prevent setting status to 'active' without proper validation
    if (status === 'active') {
      // Allow activation only if we have a waiter and at least one order
      if (!tabData.waiterId || (tabData.orderCount || 0) < 1) {
        throw new Error('Cannot activate tab: Waiter and at least one order are required');
      }
    }
    
    await updateDoc(tabRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating tab status:', error);
    throw error;
  }
}

const getActiveTabs = async (restaurantId) => {
  try {
    const q = query(
      collection(db, TABS_COLLECTION),
      where('restaurantId', '==', restaurantId),
      where('status', 'in', ['active', 'pending_acceptance', 'bill_accepted']),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting active tabs:', error)
    throw error
  }
}

// Order Management Functions
const addOrderToTab = async (tabId, orderData, waiterData = null) => {
  try {
    const tabRef = doc(db, TABS_COLLECTION, tabId);
    const ordersCollectionRef = collection(db, ORDERS_COLLECTION);
    
    // Get the current tab data to check its status
    const tabDoc = await getDoc(tabRef);
    if (!tabDoc.exists()) {
      throw new Error('Tab not found');
    }
    
    const tabData = tabDoc.data();
    
    // Check if this is the first order (tab is inactive)
    const isFirstOrder = tabData.status === 'inactive';
    
    // If it's the first order, we need waiter data
    if (isFirstOrder && !waiterData) {
      throw new Error('Waiter information is required for the first order on a new tab');
    }

    // Start a batch write to ensure atomic updates
    const batch = writeBatch(db);

    // 1. Add the new order
    const orderRef = doc(ordersCollectionRef);
    const newOrder = {
      ...orderData,
      tabId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(orderRef, newOrder);

    // 2. Update the tab's total and status
    const updateData = {
      total: increment(orderData.total),
      updatedAt: serverTimestamp(),
    };
    
    // If this is the first order (tab is inactive), activate the tab
    if (isFirstOrder) {
      updateData.status = 'active';
      updateData.waiterName = waiterData.name;
      updateData.waiterId = waiterData.id;
      updateData.orderCount = 1; // Initialize order count
    } else {
      // For subsequent orders, just increment the order count
      updateData.orderCount = increment(1);
    }
    
    batch.update(tabRef, updateData);

    await batch.commit();

    return { 
      id: orderRef.id, 
      ...newOrder,
      tabUpdated: {
        wasInactive: isFirstOrder,
        newStatus: 'active',
        waiterAssigned: isFirstOrder && !!waiterData
      }
    };
  } catch (error) {
    console.error('Error adding order to tab:', error);
    throw error;
  }
}

const updateOrderStatus = async (orderId, status, waiterId) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    
    await updateDoc(orderRef, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: waiterId ? doc(db, WAITERS_COLLECTION, waiterId) : null
    });
    
    // Get the order to return updated data
    const orderDoc = await getDoc(orderRef);
    return { id: orderDoc.id, ...orderDoc.data() };
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

const getTabOrders = async (tabId) => {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('tabId', '==', tabId),
      orderBy('createdAt', 'asc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting tab orders:', error)
    throw error
  }
}

// Payment Management Functions
const createPayment = async (paymentData) => {
  // Prevent payment if tab has no orders
  const tabId = paymentData.tabId;
  if (!tabId) {
    throw new Error('Tab ID is required for payment.');
  }
  // Query orders for this tab
  const ordersQuery = query(collection(db, ORDERS_COLLECTION), where('tabId', '==', tabId));
  const ordersSnapshot = await getDocs(ordersQuery);
  if (ordersSnapshot.empty) {
    throw new Error('Cannot initiate payment: No orders found for this tab.');
  }

  // Differentiate initiator by payment method
  let initiator = 'customer';
  if (paymentData.method === 'cash') {
    initiator = 'manager';
  }

  try {
    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
      ...paymentData,
      status: 'pending',
      createdAt: serverTimestamp(),
      initiator
    });
    return { id: docRef.id, ...paymentData, initiator };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

const updatePaymentStatus = async (paymentId, status) => {
  try {
    const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId)
    await updateDoc(paymentRef, {
      status,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
}

const getPaymentHistory = async (limit = 50) => {
  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting payment history:', error)
    throw error
  }
}

// Real-time listeners
const subscribeToTabUpdates = (tabId, callback) => {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  return onSnapshot(tabRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    }
  })
}

const subscribeToTabOrders = (tabId, callback) => {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('tabId', '==', tabId),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (querySnapshot) => {
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(orders)
  })
}

const subscribeToActiveTabs = (restaurantId, callback) => {
  if (!restaurantId) {
    console.error("subscribeToActiveTabs: restaurantId is required");
    callback([]);
    return () => {}; // Return dummy unsubscribe function
  }

  console.log(`[subscribeToActiveTabs] Setting up listener for active tabs in restaurant: ${restaurantId}`);

  // Query for ALL active tabs in the restaurant
  const q = query(
    collection(db, TABS_COLLECTION),
    where('restaurantId', '==', restaurantId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    console.log(`[subscribeToActiveTabs] Received ${querySnapshot.size} active tabs`);
    const tabs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tabs);
  }, (error) => {
    console.error('[subscribeToActiveTabs] Error:', error);
    console.error('Error in subscribeToActiveTabs:', error);
    // Return empty array on error to prevent UI issues
    callback([]);
  });
}

// Restaurant Management
const createRestaurant = async (restaurantData) => {
  try {
    // Add timestamps and default values
    const restaurantWithMeta = {
      ...restaurantData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      dailyTabCounter: 0,
      lastTabReset: serverTimestamp()
    };

    const docRef = await addDoc(
      collection(db, RESTAURANTS_COLLECTION),
      restaurantWithMeta
    );

    return { id: docRef.id, ...restaurantWithMeta };
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw new Error('Failed to create restaurant');
  }
};

const getRestaurantByOwner = async (ownerId) => {
  try {
    const q = query(
      collection(db, RESTAURANTS_COLLECTION),
      where('ownerId', '==', ownerId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting restaurant by owner:', error);
    throw error;
  }
};

const getRestaurantById = async (restaurantId) => {
  try {
    const docRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting restaurant by ID:', error);
    throw error;
  }
};

// Connection test
const testFirestoreConnection = async () => {
  try {
    console.log('Testing Firestore connection...');
    const testDocRef = doc(db, 'connectionTest', 'test');
    await setDoc(testDocRef, { timestamp: new Date().toISOString() }, { merge: true });
    console.log('Firestore connection successful');
    return true;
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    return false;
  }
};

// Waiter Management
const checkWaitersCollection = async () => {
  try {
    console.log('[checkWaitersCollection] Fetching all waiters...');
    const waitersRef = collection(db, WAITERS_COLLECTION);
    const snapshot = await getDocs(waitersRef);
    
    const waiters = [];
    snapshot.forEach(doc => {
      console.log(`[checkWaitersCollection] Found waiter ${doc.id}:`, doc.data());
      waiters.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`[checkWaitersCollection] Returning ${waiters.length} waiters`);
    return waiters;
  } catch (error) {
    console.error('[checkWaitersCollection] Error:', error);
    throw error;
  }
};

const getWaiterByPin = async (restaurantId, pin) => {
  try {
    if (!restaurantId || pin === undefined || pin === null) {
      console.error('Missing required parameters for getWaiterByPin');
      return null;
    }

    // Ensure pin is a string for consistent comparison
    const pinStr = pin.toString();
    console.log(`Looking for waiter with PIN: ${pinStr} (type: ${typeof pinStr})`);

    const q = query(
      collection(db, WAITERS_COLLECTION),
      where('restaurantId', '==', restaurantId),
      where('pin', '==', pinStr), // Ensure we're comparing strings
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No waiter found with the provided PIN');
      // For debugging, let's log all waiters to check their PINs
      const allWaitersQuery = query(
        collection(db, WAITERS_COLLECTION),
        where('restaurantId', '==', restaurantId)
      );
      const allWaiters = await getDocs(allWaitersQuery);
      console.log('All waiters in this restaurant:');
      allWaiters.forEach(doc => {
        console.log(`- ${doc.data().name}: PIN='${doc.data().pin}' (type: ${typeof doc.data().pin})`);
      });
      return null;
    }

    // Return the first matching waiter
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting waiter by PIN:', error);
    throw error;
  }
};

const getWaiterById = async (waiterId) => {
  try {
    if (!waiterId) {
      console.error('No waiter ID provided');
      return null;
    }

    const docRef = doc(db, WAITERS_COLLECTION, waiterId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('No waiter found with ID:', waiterId);
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('Error getting waiter by ID:', error);
    throw error;
  }
};

const getWaiters = async (restaurantId) => {
  console.log(`[getWaiters] Starting to fetch waiters for restaurant: ${restaurantId}`);
  
  if (!restaurantId) {
    console.error('[getWaiters] No restaurantId provided');
    throw new Error('Restaurant ID is required to fetch waiters');
  }

  try {
    console.log(`[getWaiters] Querying waiters for restaurant: ${restaurantId}`);
    const q = query(
      collection(db, WAITERS_COLLECTION),
      where('restaurantId', '==', restaurantId),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`[getWaiters] Found ${querySnapshot.docs.length} waiters for restaurant ${restaurantId}`);
    
    const waiters = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[getWaiters] Waiter ${doc.id}:`, data);
      return {
        id: doc.id,
        ...data
      };
    });
    
    return waiters;
  } catch (error) {
    console.error('[getWaiters] Error in main query:', error);
    
    // Fallback: Try to get all waiters and filter client-side
    try {
      console.log('[getWaiters] Falling back to client-side filtering');
      const allWaiters = await checkWaitersCollection();
      console.log(`[getWaiters] Found ${allWaiters.length} total waiters in collection`);
      
      const filteredWaiters = allWaiters.filter(waiter => waiter.restaurantId === restaurantId);
      console.log(`[getWaiters] Filtered to ${filteredWaiters.length} waiters for restaurant ${restaurantId}`);
      
      return filteredWaiters;
    } catch (fallbackError) {
      console.error('[getWaiters] Error in fallback query:', fallbackError);
      throw new Error(`Failed to load waiters: ${fallbackError.message}`);
    }
  }
};

const createWaiter = async (waiterData) => {
  try {
    const newWaiterData = {
      ...WaiterModel.create(waiterData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, WAITERS_COLLECTION), newWaiterData);
    return { id: docRef.id, ...newWaiterData };
  } catch (error) {
    console.error('Error creating waiter:', error);
    throw error;
  }
};

const subscribeToWaiters = (restaurantId, callback) => {
  console.log('subscribeToWaiters called with restaurantId:', restaurantId);
  
  try {
    const q = query(
      collection(db, WAITERS_COLLECTION),
      where('restaurantId', '==', restaurantId),
      orderBy('name', 'asc')
    );
    
    console.log('Query created, setting up snapshot listener...');
    
    return onSnapshot(q, 
      (querySnapshot) => {
        console.log('Received waiters snapshot with', querySnapshot.size, 'documents');
        const waiters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Mapped waiters:', waiters);
        callback(waiters);
      },
      (error) => {
        console.error('Error in waiters snapshot listener:', error);
        // Still call the callback with empty array to prevent UI from hanging
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error in subscribeToWaiters:', error);
    // Ensure callback is called even if there's an error
    callback([]);
    // Re-throw the error to be handled by the caller if needed
    throw error;
  }
};

const deleteWaiter = async (waiterId) => {
  try {
    await deleteDoc(doc(db, WAITERS_COLLECTION, waiterId));
  } catch (error) {
    console.error('Error deleting waiter:', error);
    throw error;
  }
};

// Menu Management
const createMenuItem = async (itemData) => {
  try {
    console.log('Creating menu item with data:', itemData);
    const newItemData = {
      ...MenuItemModel.create(itemData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    console.log('Processed menu item data:', newItemData);
    
    const docRef = await addDoc(collection(db, MENU_ITEMS_COLLECTION), newItemData);
    console.log('Menu item created with ID:', docRef.id);
    
    return { id: docRef.id, ...newItemData };
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw error;
  }
};

const subscribeToMenu = (restaurantId, callback) => {
  console.log('Setting up menu subscription for restaurant:', restaurantId);
  
  try {
    const q = query(
      collection(db, MENU_ITEMS_COLLECTION),
      where('restaurantId', '==', restaurantId),
      orderBy('category', 'asc'),
      orderBy('name', 'asc')
    );
    
    console.log('Firestore query created, setting up onSnapshot listener...');
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const menuItems = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to plain objects for debugging
          createdAt: doc.data().createdAt?.toDate()?.toISOString(),
          updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
        }));
        
        console.log('Received menu items update:', {
          count: menuItems.length,
          items: menuItems
        });
        
        callback(menuItems);
      },
      (error) => {
        console.error('Error in menu subscription:', error);
      }
    );
    
    console.log('Menu subscription active, returning unsubscribe function');
    return unsubscribe;
    
  } catch (error) {
    console.error('Error setting up menu subscription:', error);
    // Return a no-op function to prevent errors when trying to unsubscribe
    return () => {};
  }
};

const updateMenuItem = async (itemId, itemData) => {
  try {
    console.log('Updating menu item:', itemId, 'with data:', itemData);
    const itemRef = doc(db, MENU_ITEMS_COLLECTION, itemId);
    const updateData = {
      ...itemData,
      updatedAt: serverTimestamp()
    };
    console.log('Final update data with timestamp:', updateData);
    
    await updateDoc(itemRef, updateData);
    console.log('Menu item updated successfully');
    
    // Return the updated document
    const updatedDoc = await getDoc(itemRef);
    if (updatedDoc.exists()) {
      return { id: updatedDoc.id, ...updatedDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error in updateMenuItem:', {
      error,
      itemId,
      itemData,
      errorMessage: error.message,
      errorStack: error.stack
    });
    throw error;
  }
};

const deleteMenuItem = async (itemId) => {
  try {
    await deleteDoc(doc(db, MENU_ITEMS_COLLECTION, itemId));
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};

// Utility functions
const generateQRCodeData = (restaurantId, tableNumber) => {
  return {
    restaurantId,
    tableNumber,
    timestamp: Date.now()
  }
}

const parseQRCodeData = (qrData) => {
  try {
    return JSON.parse(qrData)
  } catch (error) {
    console.error('Error parsing QR code data:', error)
    return null
  }
}

export {
  // Tab Management
  createTab,
  getTabByReference,
  activateTab,
  updateTabStatus,
  getActiveTabs,
  
  // Order Management
  addOrderToTab,
  updateOrderStatus,
  getTabOrders,
  
  // Payment Management
  createPayment,
  updatePaymentStatus,
  getPaymentHistory,
  
  // Real-time Listeners
  subscribeToTabUpdates,
  subscribeToTabOrders,
  subscribeToActiveTabs,
  subscribeToTabs,
  
  // Restaurant Management
  createRestaurant,
  getRestaurantByOwner,
  getRestaurantById,
  
  // Connection Test
  testFirestoreConnection,
  
  // Waiter Management
  checkWaitersCollection,
  getWaiterByPin,
  getWaiterById,
  getWaiters,
  createWaiter,
  subscribeToWaiters,
  deleteWaiter,
  
  // Menu Management
  createMenuItem,
  subscribeToMenu,
  updateMenuItem,
  deleteMenuItem,
  
  // Utility Functions
  generateQRCodeData,
  parseQRCodeData
}
