# Firebase Setup Guide for Bill-O App

This guide will help you configure Firebase for the Bill-O tab management app.

## Prerequisites

- A Google account
- Access to the Firebase Console (https://console.firebase.google.com)

## Step 1: Create Firebase Project

1. Go to the Firebase Console
2. Click "Create a project" or "Add project"
3. Enter project name: `bill-o-tab-manager` (or your preferred name)
4. Choose whether to enable Google Analytics (optional for this app)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project console, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can change this later)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In the Firebase console, click the gear icon (Project settings)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter app nickname: `bill-o-web-app`
5. Check "Also set up Firebase Hosting" if you want to deploy later
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 4: Update App Configuration

1. Open `src/lib/firebase.js` in your project
2. Replace the `firebaseConfig` object with your actual configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "your-actual-app-id"
}
```

## Step 5: Set Up Firestore Security Rules

1. In the Firebase console, go to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with the content from `firestore.rules` file
4. Click "Publish"

## Step 6: Create Initial Data Structure

The app will automatically create the necessary collections when you start using it:

- `tabs` - Customer tab information
- `orders` - Individual order items
- `payments` - Payment records
- `restaurants` - Restaurant information
- `menuItems` - Menu items 

## Step 7: Optional - Set Up Authentication

For production use, you should enable authentication:

1. In Firebase console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable desired sign-in providers (Email/Password recommended)
5. Update the security rules to require authentication

## Step 8: Optional - Set Up Firebase Hosting

To deploy your app:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize hosting: `firebase init hosting`
4. Build your app: `npm run build`
5. Deploy: `firebase deploy`

## Environment Variables (Optional)

For better security, you can use environment variables:

1. Create a `.env` file in your project root
2. Add your Firebase config:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=your-app-id
```

3. Update `firebase.js` to use environment variables:

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}
```

## Testing the Setup

1. Start your development server: `npm run dev`
2. Open the app in your browser
3. Try creating a tab and adding orders
4. Check the Firestore console to see if data is being created

## Troubleshooting

### Common Issues:

1. **Permission denied errors**: Check your Firestore security rules
2. **Configuration errors**: Verify your Firebase config object
3. **Network errors**: Ensure your Firebase project is active and billing is set up if needed

### Debug Mode:

To enable Firebase debug logging, add this to your app:

```javascript
import { connectFirestoreEmulator } from 'firebase/firestore'

// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  // Uncomment to use local emulator
  // connectFirestoreEmulator(db, 'localhost', 8080)
}
```

## Production Considerations

1. **Security Rules**: Implement proper authentication-based rules
2. **Indexes**: Create composite indexes for complex queries
3. **Billing**: Set up billing alerts and quotas
4. **Backup**: Enable automatic backups
5. **Monitoring**: Set up error reporting and performance monitoring

## Support

For Firebase-specific issues, refer to:
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support

For app-specific issues, check the app documentation or contact the development team.

