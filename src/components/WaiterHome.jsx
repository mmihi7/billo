import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getWaiters, 
  getWaiterByPin, 
  getWaiterById, 
  getRestaurantByOwner,
  checkWaitersCollection, 
  testFirestoreConnection 
} from '@/lib/database';
import { User, Loader2, Bug, Wifi, WifiOff, RefreshCw, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import { PinPad } from './PinPad';

function WaiterHome() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showPinPad, setShowPinPad] = useState(false);
  const [selectedWaiter, setSelectedWaiter] = useState(null);
  
  // Load waiters for the current restaurant
  const loadWaiters = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!currentUser) {
        throw new Error('You need to be logged in to access this page');
      }
      
      // Get restaurant ID from user or fetch it
      let restaurantId = currentUser?.restaurantId;
      let restaurantData = null;
      
      if (!restaurantId && currentUser?.uid) {
        try {
          restaurantData = await getRestaurantByOwner(currentUser.uid);
          if (restaurantData) {
            restaurantId = restaurantData.id;
            // Update user context or local state with restaurant ID
            if (currentUser.updateProfile) {
              await currentUser.updateProfile({
                restaurantId: restaurantId
              });
            } else {
              currentUser.restaurantId = restaurantId;
            }
          }
        } catch (err) {
          console.error('Error fetching restaurant:', err);
          // Continue with null restaurantId to show appropriate UI
        }
      }
      
      if (!restaurantId) {
        // Don't throw error, just show empty state with message
        setWaiters([]);
        setError('No restaurant associated with this account. Please complete restaurant setup first.');
        return;
      }
      
      // Fetch waiters for the restaurant
      const waitersList = await getWaiters(restaurantId);
      setWaiters(waitersList);
    } catch (err) {
      console.error('Error loading waiters:', err);
      setError(err.message || 'Failed to load waiters');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Handle waiter click - show PIN pad
  const handleWaiterClick = (waiter) => {
    setSelectedWaiter(waiter);
    setShowPinPad(true);
  };

  // Handle PIN verification
  const handlePinVerify = async (pin) => {
    try {
      setLoading(true);
      setError('');
      
      if (!currentUser) {
        console.error('No current user found');
        throw new Error('You need to be logged in to access this page');
      }

      console.log('=== PIN Verification Debug ===');
      console.log('Current user:', {
        uid: currentUser.uid,
        email: currentUser.email,
        restaurantId: currentUser.restaurantId
      });
      console.log('Selected waiter:', selectedWaiter);
      console.log('Entered PIN:', pin, 'Type:', typeof pin);
      
      // First, get the waiter by ID to see their actual PIN
      const waiterFromDB = await getWaiterById(selectedWaiter.id);
      console.log('Waiter from DB:', waiterFromDB);
      
      if (!waiterFromDB) {
        console.error('Waiter not found in database');
        throw new Error('Waiter not found in database');
      }
      
      console.log('Waiter data:', {
        id: waiterFromDB.id,
        name: waiterFromDB.name,
        storedPIN: waiterFromDB.pin,
        pinType: typeof waiterFromDB.pin,
        restaurantId: waiterFromDB.restaurantId
      });
      
      // Normalize PINs for comparison
      const enteredPIN = pin.toString().trim();
      const storedPIN = waiterFromDB.pin ? waiterFromDB.pin.toString().trim() : '';
      
      // Direct comparison with the waiter's stored PIN
      if (storedPIN && storedPIN === enteredPIN) {
        console.log('✅ PIN verification successful');
        console.log('Navigating to waiter dashboard...');
        
        // Ensure we have the latest waiter data
        const updatedWaiter = await getWaiterById(waiterFromDB.id);
        
        // Navigate to waiter dashboard with both waiter and user info
        navigate(`/waiter/${updatedWaiter.id}`, { 
          state: { 
            waiter: updatedWaiter,
            user: currentUser,
            timestamp: new Date().toISOString()
          },
          replace: true
        });
        return;
      }
      
      // If direct comparison fails, try the database query as fallback
      console.log('Direct PIN comparison failed, trying database query...');
      const waiter = await getWaiterByPin(selectedWaiter.restaurantId, pin);
      console.log('Waiter found by PIN query:', waiter);
      
      if (waiter && waiter.id === selectedWaiter.id) {
        console.log('✅ Database PIN verification successful');
        navigate(`/waiter/${waiter.id}`, { 
          state: { 
            waiter,
            user: currentUser,
            timestamp: new Date().toISOString()
          },
          replace: true
        });
      } else {
        console.error('❌ All PIN verification methods failed');
        setError('Invalid PIN. Please try again.');
        setShowPinPad(false);
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setError('Error verifying PIN. Please try again.');
      setShowPinPad(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle debug button click
  const handleDebugClick = async () => {
    try {
      setDebugInfo('Checking waiters collection...');
      const snapshot = await checkWaitersCollection();
      setDebugInfo(`Found ${snapshot.size} waiters in collection. Check console for details.`);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo(`Error: ${error.message}`);
    }
  };

  // Test Firestore connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await testFirestoreConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Connection test error:', error);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  // Initial load
  useEffect(() => {
    if (currentUser) {
      loadWaiters();
    }
  }, [currentUser, loadWaiters]);

  // Show loading state
  if (loading && waiters.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading waiters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6 relative">
      {showPinPad && selectedWaiter && (
        <PinPad 
          onVerify={handlePinVerify}
          onClose={() => setShowPinPad(false)}
          waiterName={selectedWaiter.name}
        />
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Waiter Dashboard</h1>
              <p className="text-muted-foreground">Select a waiter to view their dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadWaiters}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Debug Tools */}
        <div className="mb-6 flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDebugClick}
            title="Debug waiters collection"
            className="gap-2"
          >
            <Bug className="h-4 w-4" />
            Debug
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              setConnectionStatus('checking');
              const isConnected = await testFirestoreConnection();
              setConnectionStatus(isConnected ? 'connected' : 'disconnected');
            }}
            title="Test Firestore connection"
            className={`gap-2 ${
              connectionStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
              connectionStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}
          >
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : connectionStatus === 'error' ? (
              <WifiOff className="h-4 w-4 text-red-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {connectionStatus === 'connected' ? 'Connected' : 
              connectionStatus === 'error' ? 'Error' : 'Connecting...'}
          </Button>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg">
            <div className="flex items-center">
              <Info className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{debugInfo}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error loading waiters</p>
                <p className="text-sm mt-1">{error}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-red-700 hover:bg-red-100"
                  onClick={loadWaiters}
                  disabled={loading}
                >
                  {loading ? 'Retrying...' : 'Try Again'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Active Waiters</h2>
              <span className="text-sm text-muted-foreground">
                {waiters.length} {waiters.length === 1 ? 'waiter' : 'waiters'} available
              </span>
            </div>

            {waiters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {waiters.map((waiter) => (
                  <Card 
                    key={waiter.id}
                    className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 border-border/60"
                    onClick={() => handleWaiterClick(waiter)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{waiter.name || 'Unnamed Waiter'}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {waiter.email || 'No email provided'}
                          </p>
                          <div className="mt-1 flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No waiters found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                  Add waiters in the admin panel to get started managing your restaurant's service team.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/restaurant')}
                >
                  Go to Admin Panel
                </Button>
              </div>
            ) : null}
          </div>
        </>

        {loading && (
          <div className="mt-8 text-center">
            <Loader2 className="inline-block w-6 h-6 text-primary animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Loading waiters...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WaiterHome;
