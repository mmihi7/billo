// Firebase configuration and initialization
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'

// Firebase configuration object loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Platform-specific configurations
  ...(Capacitor.isNativePlatform() ? {
    // Mobile-specific Firebase config overrides can go here
  } : {
    // Web-specific Firebase config overrides
  })
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const db = getFirestore(app)
export const auth = getAuth(app)

// Add Google Sheets read-only scope to the provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  // This prompts the user to select an account every time, which can help
  // resolve authentication state issues in some browser environments.
  prompt: 'select_account'
});
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

// Connect to Firebase emulators in development mode
if (import.meta.env.DEV) {
  try {
    // Use 10.0.2.2 for Android emulator to connect to localhost
    const host = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' 
      ? '10.0.2.2' 
      : 'localhost';
    
    connectFirestoreEmulator(db, host, 8080);
    connectAuthEmulator(auth, `http://${host}:9099`);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
  }
}

export default app
