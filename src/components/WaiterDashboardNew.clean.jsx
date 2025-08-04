import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function WaiterDashboardNew() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [waiters, setWaiters] = useState([]);
  const [error, setError] = useState('');
  const restaurantId = 'ojKj5ydoUmNzfx5pfcm2'; // Hardcoded for testing
  
  // Debug function to manually check waiters
  const debugWaiters = async () => {
    try {
      console.log('1. Starting manual waiters query...');
      const q = query(
        collection(db, 'waiters'),
        where('restaurantId', '==', restaurantId)
      );
      
      console.log('2. Query created, executing...');
      const querySnapshot = await getDocs(q);
      
      console.log('3. Query completed, results:', {
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
      
      // Set the waiters state
      const waitersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setWaiters(waitersData);
      setError(waitersData.length === 0 ? 'No waiters found for this restaurant.' : '');
      
    } catch (error) {
      console.error('Error in debugWaiters:', error);
      setError('Failed to load waiters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    console.log('Component mounted, currentUser:', currentUser);
    debugWaiters();
  }, []);
  
  // Handle waiter selection
  const handleWaiterSelect = (waiter) => {
    console.log('Waiter selected:', waiter);
    // Add your waiter selection logic here
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p>Loading waiters...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button 
            onClick={debugWaiters} 
            variant="outline" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Select Waiter</h1>
      
      <div className="space-y-4">
        {waiters.length > 0 ? (
          waiters.map(waiter => (
            <Card 
              key={waiter.id} 
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handleWaiterSelect(waiter)}
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{waiter.name}</h3>
                  <p className="text-sm text-gray-500">{waiter.role || 'Waiter'}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No waiters found for this restaurant.</p>
            <div className="mt-4">
              <Button onClick={debugWaiters} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Debug Info:</h3>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify({
            restaurantId,
            waitersCount: waiters.length,
            currentUser: currentUser ? {
              uid: currentUser.uid,
              email: currentUser.email,
              hasRestaurantId: !!currentUser.restaurantId
            } : 'No user',
            waiters: waiters.map(w => ({
              id: w.id,
              name: w.name,
              role: w.role,
              pin: w.pin ? '***' : 'No PIN'
            }))
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default WaiterDashboardNew;
