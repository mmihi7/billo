# Bill-O - Tab Manager & Payment System

A complete Android-compatible MVP for bar bill organization and payment processing.

## 🚀 Features

### Customer Experience
- **QR Code Tab Opening**: Customers scan QR codes at tables to open tabs
- **Real-time Order Tracking**: View all orders with timestamps and prices
- **Bill Acceptance**: Customers must accept bills before checkout
- **Multiple Payment Options**: M-Pesa mobile money and cash payments
- **Digital Receipts**: Automatic receipt generation after payment
- **Ad-Free Subscription**: Optional $1.50/month subscription (billed quarterly)

### Waiter Interface
- **Simple Login**: Name-based authentication system
- **Tab Search**: Find customer tabs by reference number
- **Order Management**: Add new orders to customer tabs
- **Real-time Updates**: Live synchronization with customer apps

### Restaurant Dashboard
- **Tab Monitoring**: Real-time overview of all active tabs
- **Payment Tracking**: Monitor bill acceptances and payments
- **Analytics**: Subscription and revenue analytics
- **Inventory Management**: Manual item input for free tier

### Technical Features
- **Firebase Integration**: Real-time database and authentication
- **Google Sign-in**: Quick customer registration
- **Google AdSense**: Revenue generation through advertisements
- **Responsive Design**: Works on mobile and desktop
- **Clean UI**: Blue/white theme with minimal design

## 🛠 Technology Stack

- **Frontend**: React 18 with Vite
- **Backend**: Firebase (Firestore, Authentication)
- **Styling**: Tailwind CSS with custom components
- **Payment**: Mock integration (ready for real payment gateways)
- **Ads**: Google AdSense integration
- **Authentication**: Firebase Auth with Google provider

## 📱 User Flow

1. **Customer opens tab**: Scans QR code at table
2. **Waiter adds orders**: Uses reference number to find tab and add items
3. **Customer reviews bill**: Sees real-time updates of orders
4. **Customer accepts bill**: Confirms the total amount
5. **Customer pays**: Chooses M-Pesa or cash payment
6. **Receipt generated**: Digital receipt sent to customer
7. **Tab closed**: System resets for next customer

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+ and pnpm
- Firebase project with Firestore and Authentication enabled
- Google AdSense account (optional)

### Installation
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Configure Firebase (see FIREBASE_SETUP.md)
4. Configure AdSense (see ADSENSE_SETUP.md)
5. Start development server: `pnpm run dev`

### Firebase Configuration
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database and Authentication
3. Add Google as a sign-in provider
4. Copy your Firebase config to `src/lib/firebase.js`
5. Deploy Firestore security rules from `firestore.rules`

### AdSense Configuration
1. Apply for Google AdSense approval
2. Get your AdSense publisher ID
3. Update the AdSense script in `index.html`
4. Replace ad slot IDs in ad components

## 💰 Monetization

### Free Tier
- Basic tab management
- Manual order entry
- Includes advertisements
- All core functionality

### Ad-Free Subscription
- $1.50 per month (billed quarterly at $4.50)
- No advertisements
- Priority support
- Same core functionality

### Future Premium Features
- Automatic POS system integration
- Advanced analytics
- Multi-location support
- Custom branding

## 🔒 Security

- Firebase security rules protect user data
- Authentication required for sensitive operations
- Payment processing uses secure mock implementation
- User data encryption in transit and at rest

## 📊 Analytics

The system tracks:
- Active tabs and customer engagement
- Payment success rates
- Subscription conversion rates
- Revenue metrics
- User behavior patterns

## 🚀 Deployment

### Development
```bash
pnpm run dev
```

### Production Build
```bash
pnpm run build
```

### Firebase Deployment
```bash
firebase deploy
```

## 📞 Support

For technical support or feature requests, please refer to the documentation or contact the development team.

## 📄 License

This project is proprietary software developed for bar and restaurant management.

