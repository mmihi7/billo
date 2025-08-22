import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const CustomerAuthContext = createContext();

export function CustomerAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [savedRestaurants, setSavedRestaurants] = useState([]);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'customers', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userDoc.data().displayName,
            photoURL: user.photoURL,
            ...userDoc.data()
          });
          
          // Load saved restaurants
          if (userDoc.data().savedRestaurants) {
            setSavedRestaurants(userDoc.data().savedRestaurants);
          }
        }
      } else {
        setCurrentUser(null);
        setSavedRestaurants([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up with email/password
  const signUp = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'customers', user.uid), {
        uid: user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        savedRestaurants: []
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'customers', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(doc(db, 'customers', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          savedRestaurants: []
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Sign out
  const logOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setRestaurantId(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Save restaurant to user's saved restaurants
  const saveRestaurant = async (restaurantData) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    
    try {
      const userRef = doc(db, 'customers', currentUser.uid);
      const updatedRestaurants = [
        ...savedRestaurants.filter(r => r.id !== restaurantData.id),
        restaurantData
      ];
      
      await setDoc(
        userRef,
        {
          savedRestaurants: updatedRestaurants,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      
      setSavedRestaurants(updatedRestaurants);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Remove restaurant from saved restaurants
  const removeSavedRestaurant = async (restaurantId) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    
    try {
      const userRef = doc(db, 'customers', currentUser.uid);
      const updatedRestaurants = savedRestaurants.filter(r => r.id !== restaurantId);
      
      await setDoc(
        userRef,
        {
          savedRestaurants: updatedRestaurants,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      
      setSavedRestaurants(updatedRestaurants);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Set current restaurant context
  const setCurrentRestaurant = (id) => {
    setRestaurantId(id);
  };

  const value = {
    currentUser,
    restaurantId,
    savedRestaurants,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    saveRestaurant,
    removeSavedRestaurant,
    setCurrentRestaurant
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {!loading && children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}
