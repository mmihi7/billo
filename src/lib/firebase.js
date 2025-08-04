// Firebase configuration and initialization
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth'

// Firebase configuration object
// Loaded from environment variables for security and flexibility
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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

// For development, you can use Firebase emulators
// Uncomment these lines if you want to use local emulators
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080)
//   connectAuthEmulator(auth, 'http://localhost:9099')
// }

export default app
