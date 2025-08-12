import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, Clock, Utensils, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const WaiterDashboardNew = ({ waiter }) => {
  // Hooks must be called unconditionally at the top level
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Core state
  const [isLoading, setIsLoading] = useState(true);
  // Removed tables state
  const [activeOrders, setActiveOrders] = useState([]);
  const [error, setError] = useState('');
  const restaurantId = 'ojKj5ydoUmNzfx5pfcm2'; // Hardcoded for testing
  
  // Use the waiter prop or fallback to location state
  const waiterData = React.useMemo(() => {
    return waiter || location.state?.waiter || {};
  }, [waiter, location.state]);
  // Load tables and active orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        // Load active orders (in a real app, this would come from your database)
        const activeOrdersData = [
          {
            id: 'order-1',
            tableNumber: 5,
            status: 'preparing',
            items: [
              { name: 'Margherita Pizza', quantity: 1, price: 12.99 },
              { name: 'Caesar Salad', quantity: 2, price: 8.99 }
            ],
            startTime: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
          },
          {
            id: 'order-2',
            tableNumber: 8,
            status: 'ready',
            items: [
              { name: 'Pasta Carbonara', quantity: 1, price: 14.99 },
              { name: 'Garlic Bread', quantity: 2, price: 4.99 },
              { name: 'Tiramisu', quantity: 1, price: 6.99 }
            ],
            startTime: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
          }
        ];
        setActiveOrders(activeOrdersData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, []);
  
  // Calculate order total
  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };
  
  // Format time duration
  const formatDuration = (startTime) => {
    const diff = Math.floor((new Date() - new Date(startTime)) / 1000 / 60); // in minutes
    return `${diff} min`;
  };
  
  // Handle table click
  // Removed table click handler
  
  // Handle order action
  const handleOrderAction = (order, action) => {
    console.log(`${action} order:`, order.id);
    // In a real app, this would update the order status in the database
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }
  
  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
            {waiterData.name ? (
              <p className="text-sm text-gray-500">Welcome back, {waiterData.name}!</p>
            ) : (
              <p className="text-sm text-gray-500">Waiter Dashboard</p>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/waiterhome')}
          >
            Switch Waiter
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Active Orders Only */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Active Orders</h2>
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                activeOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 px-4 py-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Table {order.tableNumber}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {formatDuration(order.startTime)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <div className="flex items-center">
                              <span className="font-medium">{item.quantity}x</span>
                              <span className="ml-2">{item.name}</span>
                            </div>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>${calculateOrderTotal(order.items)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <div>
                          {order.status === 'preparing' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Utensils className="w-3 h-3 mr-1" />
                              Preparing
                            </span>
                          )}
                          {order.status === 'ready' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ready to Serve
                            </span>
                          )}
                        </div>
                        <div className="space-x-2">
                          {order.status === 'ready' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleOrderAction(order, 'serve')}
                            >
                              Mark as Served
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Utensils className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No active orders</h3>
                    <p className="text-gray-500">New orders will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-3"
                  onClick={() => navigate('/new-order')}
                >
                  <div className="text-left">
                    <div className="font-medium">New Order</div>
                    <div className="text-xs text-gray-500">Start a new table order</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-3"
                  onClick={() => navigate('/menu')}
                >
                  <div className="text-left">
                    <div className="font-medium">View Menu</div>
                    <div className="text-xs text-gray-500">Browse menu items</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default WaiterDashboardNew;
