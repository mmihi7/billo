import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { 
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmail, 
  createAccount, 
  signOutUser, 
  onAuthStateChange, 
  getCurrentUser,
  getUserProfile,
  USER_ROLES,
  getRedirectResult
} from '../lib/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
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

  // Handle redirect result
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User just signed in with redirect
          const user = result.user;
          const token = await user.getIdToken();
          const userProfile = await updateUserProfile(user);
          
          // Use the updated currentUser state for role check
          if (currentUser?.role === 'admin') {
            navigate('/restaurant');
          } else {
            navigate('/customer/dashboard');
          }
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
      }
    };

    handleRedirect();
  }, [navigate, currentUser]); // Only include stable dependencies

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

  const login = async (email, password, role = USER_ROLES.CUSTOMER) => {
    try {
      const result = await signInWithEmail(email, password, role);
      if (result.success) {
        const user = await updateUserProfile(auth.currentUser);
        return user;
      }
      throw new Error(result.error?.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Check if user has accepted terms
  const checkTermsAccepted = async (userId) => {
    if (!userId) return false;
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().acceptedTerms : false;
  };

  // Update terms acceptance
  const updateTermsAcceptance = async (userId, accepted = true) => {
    if (!userId) return;
    await setDoc(doc(db, 'users', userId), 
      { acceptedTerms: accepted },
      { merge: true }
    );
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      // This will trigger the redirect flow
      const result = await firebaseSignInWithGoogle();
      if (result.pending) {
        // The redirect will be handled by the redirect handler
        return null;
      }
      return result?.user || null;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error('Google sign-in failed');
    } finally {
      setLoading(false);
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