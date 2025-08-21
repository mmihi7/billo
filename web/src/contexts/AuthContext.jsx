import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  createAccount, 
  signOutUser, 
  onAuthStateChange, 
  getCurrentUser,
  getUserProfile,
  USER_ROLES 
} from '../lib/auth';

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
    
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('Auth state changed. User:', user ? user.email : 'No user');
      
      if (user) {
        console.log('User found, updating profile...');
        try {
          await updateUserProfile(user);
          console.log('User profile updated');
        } catch (error) {
          console.error('Error updating user profile:', error);
          setCurrentUser(null);
        }
      } else {
        console.log('No user, resetting state');
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Auth functions
  const signup = async (email, password, displayName, role = USER_ROLES.CUSTOMER) => {
    try {
      const result = await createAccount(email, password, displayName, role);
      if (result.success) {
        await updateUserProfile(auth.currentUser);
      }
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, phone) => {
    try {
      // For now, we'll use email/password for both email and phone login
      // In a production app, you would implement phone authentication separately
      const result = await signInWithEmail(email, phone);
      if (result.success) {
        await updateUserProfile(auth.currentUser);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async (role = USER_ROLES.CUSTOMER) => {
    try {
      const result = await signInWithGoogle(role);
      if (result.success) {
        await updateUserProfile(auth.currentUser);
      }
      return result;
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { success: false, error: error.message };
    }
  };

  const loginAnonymously = async () => {
    try {
      const userCredential = await signInAnonymous(auth);
      return await updateUserProfile(userCredential.user);
    } catch (error) {
      console.error('Anonymous login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    login,
    signup,
    loginWithGoogle,
    loginAnonymously,
    logout: signOutUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}