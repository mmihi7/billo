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

// Tab Management Functions
export const createTab = async (tabData) => {
  const restaurantRef = doc(db, RESTAURANTS_COLLECTION, tabData.restaurantId);
  const tabsCollectionRef = collection(db, TABS_COLLECTION);

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
      transaction.set(newTabRef, {
        ...tabData,
        status: 'active',
        total: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        referenceNumber: String(counter), // The new, simple, memorable tab number
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

export const getTabByReference = async (referenceNumber) => {
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

export const updateTabStatus = async (tabId, status) => {
  try {
    const tabRef = doc(db, TABS_COLLECTION, tabId)
    await updateDoc(tabRef, {
      status,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating tab status:', error)
    throw error
  }
}

export const getActiveTabs = async (restaurantId) => {
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
export const addOrderToTab = async (tabId, orderData) => {
  try {
    // Add order to orders collection
    const orderRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      tabId,
      createdAt: serverTimestamp()
    })
    
    // Update tab total
    const tabRef = doc(db, TABS_COLLECTION, tabId)
    const orderTotal = orderData.price * orderData.quantity
    
    await updateDoc(tabRef, {
      total: increment(orderTotal),
      updatedAt: serverTimestamp()
    })
    
    return { id: orderRef.id, ...orderData }
  } catch (error) {
    console.error('Error adding order:', error)
    throw error
  }
}

export const updateOrderStatus = async (orderId, status, waiterId) => {
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

export const getTabOrders = async (tabId) => {
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
export const createPayment = async (paymentData) => {
  try {
    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
      ...paymentData,
      status: 'pending',
      createdAt: serverTimestamp()
    })
    
    return { id: docRef.id, ...paymentData }
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
}

export const updatePaymentStatus = async (paymentId, status) => {
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

export const getPaymentHistory = async (limit = 50) => {
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
export const subscribeToTabUpdates = (tabId, callback) => {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  return onSnapshot(tabRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    }
  })
}

export const subscribeToTabOrders = (tabId, callback) => {
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

export const subscribeToActiveTabs = (restaurantId, callback) => {
  const q = query(
    collection(db, TABS_COLLECTION),
    where('restaurantId', '==', restaurantId),
    where('status', 'in', ['active', 'pending_acceptance', 'bill_accepted']),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (querySnapshot) => {
    const tabs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(tabs)
  })
}

// Restaurant Management
export const createRestaurant = async (restaurantData) => {
  try {
    const newRestaurantData = {
      ...RestaurantModel.create(restaurantData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, RESTAURANTS_COLLECTION), newRestaurantData);
    return { id: docRef.id, ...newRestaurantData };
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
};

export const getRestaurantByOwner = async (ownerId) => {
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

export const getRestaurantById = async (restaurantId) => {
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
export const testFirestoreConnection = async () => {
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
export const checkWaitersCollection = async () => {
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

export const getWaiterByPin = async (restaurantId, pin) => {
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

export const getWaiterById = async (waiterId) => {
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

export const getWaiters = async (restaurantId) => {
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

export const createWaiter = async (waiterData) => {
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

export const subscribeToWaiters = (restaurantId, callback) => {
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

export const deleteWaiter = async (waiterId) => {
  try {
    await deleteDoc(doc(db, WAITERS_COLLECTION, waiterId));
  } catch (error) {
    console.error('Error deleting waiter:', error);
    throw error;
  }
};

// Menu Management
export const createMenuItem = async (itemData) => {
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

export const subscribeToMenu = (restaurantId, callback) => {
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

export const updateMenuItem = async (itemId, itemData) => {
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

export const deleteMenuItem = async (itemId) => {
  try {
    await deleteDoc(doc(db, MENU_ITEMS_COLLECTION, itemId));
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};

// Utility functions
export const generateQRCodeData = (restaurantId, tableNumber) => {
  return {
    restaurantId,
    tableNumber,
    timestamp: Date.now()
  }
}

export const parseQRCodeData = (qrData) => {
  try {
    return JSON.parse(qrData)
  } catch (error) {
    console.error('Error parsing QR code data:', error)
    return null
  }
}
