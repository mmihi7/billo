import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getUserProfile, USER_ROLES } from '../lib/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to update user profile from Firestore
  const updateUserProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setCurrentUser(null);
      setLoading(false);
      return null;
    }

    try {
      const userProfile = await getUserProfile(firebaseUser.uid);
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName || userProfile?.displayName,
        photoURL: firebaseUser.photoURL,
        role: userProfile?.role || USER_ROLES.CUSTOMER,
        isAdmin: userProfile?.role === USER_ROLES.ADMIN,
        requiresVerification: !firebaseUser.emailVerified && userProfile?.role === USER_ROLES.ADMIN
      };
      
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error('Error updating user profile:', error);
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: USER_ROLES.CUSTOMER,
        isAdmin: false
      };
      setCurrentUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed. User:', user ? user.email : 'No user');
      
      if (user) {
        console.log('User found, updating profile...');
        try {
          await updateUserProfile(user);
          console.log('User profile updated:', currentUser);
        } catch (error) {
          console.error('Error updating user profile:', error);
        }
      } else {
        console.log('No user, resetting state');
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Auth functions
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.isAdmin || false,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}