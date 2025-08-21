// Authentication service with Google Sign-In
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

// Google Auth Provider
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  WAITER: 'waiter',
  ADMIN: 'admin'
}

// Sign in with Google
export const signInWithGoogle = async (role = USER_ROLES.CUSTOMER) => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    // Create or update user profile in Firestore
    await createUserProfile(user, role)
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role
      }
    }
  } catch (error) {
    console.error('Google sign-in error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Sign in anonymously (for customers who don't want to create account)
export const signInAnonymous = async () => {
  try {
    const result = await signInAnonymously(auth)
    const user = result.user
    
    // Create anonymous user profile
    await createUserProfile(user, USER_ROLES.CUSTOMER, true)
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: null,
        displayName: 'Anonymous User',
        photoURL: null,
        role: USER_ROLES.CUSTOMER,
        isAnonymous: true
      }
    }
  } catch (error) {
    console.error('Anonymous sign-in error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Sign in with email and password (phone is used as password for now)
export const signInWithEmail = async (email, phone, role = USER_ROLES.CUSTOMER) => {
  try {
    // In a production app, you would implement proper phone authentication
    // For now, we'll use a simple approach where phone is used as password
    const password = phone || 'defaultPassword';
    
    const result = await firebaseSignInWithEmailAndPassword(auth, email, password)
    const user = result.user
    
    // Get user profile to check role
    const userProfile = await getUserProfile(user.uid)
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        phone: phone,
        displayName: user.displayName || userProfile?.displayName,
        photoURL: user.photoURL,
        role: userProfile?.role || role
      }
    }
  } catch (error) {
    console.error('Email sign-in error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Create account with email and phone (phone is used as password for now)
export const createAccount = async (email, phone, displayName, role = USER_ROLES.CUSTOMER) => {
  try {
    console.log('Starting account creation for:', email);
    
    // 1. Create user in Firebase Auth
    // In a production app, you would implement proper phone authentication
    // For now, we'll use a simple approach where phone is used as password
    const password = phone || 'defaultPassword';
    
    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    console.log('User created with UID:', user.uid);
    
    // 2. Update user profile with display name
    try {
      console.log('Updating profile with display name:', displayName);
      await updateProfile(user, { displayName });
      console.log('Profile updated successfully');
    } catch (profileError) {
      console.error('Error updating profile:', profileError);
      // Continue even if profile update fails
    }
    
    // 3. Send email verification
    try {
      console.log('Sending email verification...');
      await sendEmailVerification(user, {
        url: `${window.location.origin}/restaurant`, // Redirect URL after verification
        handleCodeInApp: true
      });
      console.log('Verification email sent successfully');
    } catch (verificationError) {
      console.error('Error sending verification email:', verificationError);
      // Don't fail the whole registration if email sending fails
      // The user can request a new verification email later
    }
    
    // 4. Create user profile in Firestore
    try {
      console.log('Creating user profile in Firestore...');
      await createUserProfile(user, role, false, displayName);
      console.log('User profile created in Firestore');
    } catch (firestoreError) {
      console.error('Error creating user profile in Firestore:', firestoreError);
      // Continue even if Firestore update fails
    }
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        phone: phone,
        emailVerified: user.emailVerified,
        displayName: displayName,
        photoURL: user.photoURL,
        role
      },
      message: 'Account created successfully! ' + 
        (user.emailVerified 
          ? 'Your email has been verified.' 
          : 'Please check your email to verify your account. If you don\'t see it, please check your spam folder.')
    }
  } catch (error) {
    console.error('Account creation error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Sign-out error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Create or update user profile in Firestore
export const createUserProfile = async (user, role, isAnonymous = false, customDisplayName = null) => {
  try {
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    
    const userData = {
      uid: user.uid,
      email: user.email,
      // Store phone if available (passed from createAccount or signInWithEmail)
      phone: user.phone || null,
      displayName: customDisplayName || user.displayName || (isAnonymous ? 'Anonymous User' : 'User'),
      photoURL: user.photoURL,
      role,
      isAnonymous,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    if (!userDoc.exists()) {
      // Create new user profile
      userData.createdAt = serverTimestamp()
      await setDoc(userRef, userData)
    } else {
      // Update existing user profile
      await setDoc(userRef, userData, { merge: true })
    }
    
    return userData
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
  try {
    console.log('Getting user profile for UID:', uid);
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('Retrieved user data:', { ...userData, uid: userDoc.id });
      return { ...userData, uid: userDoc.id }; // Include the document ID as uid
    } else {
      console.log('No user profile found for UID:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Auth state observer
export const onAuthStateChange = (callback) => {
  return firebaseOnAuthStateChanged(auth, async (user) => {
    if (user) {
      // Get user profile from Firestore
      const userProfile = await getUserProfile(user.uid)
      
      callback({
        uid: user.uid,
        email: user.email,
        phone: user.phone || userProfile?.phone || null,
        displayName: user.displayName || userProfile?.displayName,
        photoURL: user.photoURL,
        role: userProfile?.role || USER_ROLES.CUSTOMER,
        isAnonymous: user.isAnonymous || userProfile?.isAnonymous || false
      })
    } else {
      callback(null)
    }
  })
}

// Check if user has specific role
export const hasRole = (user, role) => {
  return user && user.role === role
}

// Check if user is authenticated
export const isAuthenticated = (user) => {
  return user !== null
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser
}

