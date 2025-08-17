import { useState, useEffect } from 'react';
import { createWaiter, subscribeToWaiters, deleteWaiter, subscribeToTabs } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, User, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

function WaiterManager({ restaurant }) {
  console.log('WaiterManager rendered with restaurant:', restaurant);
  const [waiters, setWaiters] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWaiter, setNewWaiter] = useState({ name: '', pin: '' });
  const [error, setError] = useState('');
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Check if we have a valid restaurant object
  if (!restaurant || !restaurant.id) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Restaurant Information Required</h3>
        <p className="text-muted-foreground mb-4">
          Unable to load waiter information. Please ensure you're logged in and have selected a restaurant.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Page
        </Button>
      </div>
    );
  }

  useEffect(() => {
    console.log('useEffect triggered with restaurant:', restaurant);

    if (!restaurant?.id) {
      console.error('No restaurant ID available');
      setError('No restaurant selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    console.log('Subscribing to waiters and tabs for restaurant:', restaurant.id);

    let unsubscribeWaiters = () => {};
    let unsubscribeTabs = () => {};

    const setupSubscriptions = async () => {
      try {
        // Subscribe to waiters
        unsubscribeWaiters = subscribeToWaiters(restaurant.id, (waitersData) => {
          console.log('Received waiters data:', waitersData);
          setWaiters(waitersData);
          setInitialLoad(false);
          setLoading(false);
        });

        // Subscribe to tabs to get waiter stats
        unsubscribeTabs = subscribeToTabs(restaurant.id, (tabsData) => {
          console.log('Received tabs data:', tabsData);
          setTabs(tabsData);
        });
      } catch (err) {
        console.error('Error setting up subscriptions:', err);
        setError('Failed to load data. Please refresh the page.');
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      console.log('Cleaning up subscriptions');
      try {
        if (typeof unsubscribeWaiters === 'function') unsubscribeWaiters();
        if (typeof unsubscribeTabs === 'function') unsubscribeTabs();
      } catch (err) {
        console.error('Error cleaning up subscriptions:', err);
      }
    };
  }, [restaurant?.id]);

  // Calculate waiter statistics
  const getWaiterStats = (waiterId) => {
    const waiterTabs = tabs.filter(tab => tab.waiterId === waiterId);
    const activeTabs = waiterTabs.filter(tab => tab.status === 'active');
    const completedTabs = waiterTabs.filter(tab => tab.status === 'completed');

    const totalSales = waiterTabs.reduce((sum, tab) => sum + (tab.total || 0), 0);
    const totalPaid = completedTabs.reduce((sum, tab) => sum + (tab.total || 0), 0);
    const totalOutstanding = activeTabs.reduce((sum, tab) => sum + (tab.total || 0), 0);

    return {
      totalTabs: waiterTabs.length,
      activeTabs: activeTabs.length,
      completedTabs: completedTabs.length,
      totalSales,
      totalPaid,
      totalOutstanding
    };
  };

  const handleAddWaiter = async () => {
    if (!newWaiter.name.trim() || !/^\d{4}$/.test(newWaiter.pin)) {
      setError('Please enter a name and a 4-digit PIN.')
      return
    }
    setError('')
    try {
      await createWaiter({
        ...newWaiter,
        restaurantId: restaurant.id,
      })
      setNewWaiter({ name: '', pin: '' })
      setShowAddForm(false)
    } catch (err) {
      setError('Failed to add waiter. Please try again.')
    }
  }

  const handleDeleteWaiter = async (waiterId) => {
    if (window.confirm('Are you sure you want to delete this waiter? This action cannot be undone.')) {
      try {
        await deleteWaiter(waiterId);
      } catch (err) {
        setError('Failed to delete waiter. Please try again.');
      }
    }
  }

  // Calculate overall stats
  const totalWaiters = waiters.length;
  const totalActiveTabs = tabs.filter(tab => tab.status === 'active').length;
  const totalCompletedTabs = tabs.filter(tab => tab.status === 'completed').length;
  const totalSales = tabs.reduce((sum, tab) => sum + (tab.total || 0), 0);
  const totalPaid = tabs.filter(tab => tab.status === 'completed')
    .reduce((sum, tab) => sum + (tab.total || 0), 0);
  const totalOutstanding = tabs.filter(tab => tab.status !== 'completed')
    .reduce((sum, tab) => sum + (tab.total || 0), 0);

  console.log('WaiterManager state:', {
    loading,
    initialLoad,
    waitersCount: waiters.length,
    tabsCount: tabs.length
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading waiter data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalWaiters}</p>
                <p className="text-sm text-muted-foreground">Total Waiters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-amber-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalActiveTabs}</p>
                <p className="text-sm text-muted-foreground">Active Tabs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">Ksh {totalSales.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CreditCard className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-red-600">Ksh {totalOutstanding.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waiters List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Waiters</CardTitle>
              <CardDescription>Manage your waitstaff and view their performance</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              {showAddForm ? 'Cancel' : 'Add Waiter'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Waiter</CardTitle>
                <CardDescription>Create a new waiter account with a unique PIN</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="waiterName">Waiter Name</Label>
                    <Input
                      id="waiterName"
                      value={newWaiter.name}
                      onChange={(e) => setNewWaiter({ ...newWaiter, name: e.target.value })}
                      placeholder="e.g., John Doe"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waiterPin">4-Digit PIN</Label>
                    <Input
                      id="waiterPin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newWaiter.pin}
                      onChange={(e) => setNewWaiter({ ...newWaiter, pin: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g., 1234"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddWaiter}
                    disabled={!newWaiter.name || newWaiter.pin.length !== 4}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Waiter
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {waiters.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <h3 className="text-lg font-medium text-gray-900">No waiters yet</h3>
              <p className="text-sm text-gray-500 mb-4">Get started by adding your first waiter</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Waiter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waiters.map((waiter) => {
                const stats = getWaiterStats(waiter.id);
                
                return (
                  <Card key={waiter.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="p-4 border-b">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{waiter.name}</h3>
                              <p className="text-sm text-muted-foreground">PIN: {waiter.pin}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteWaiter(waiter.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-sm font-medium">Tabs</p>
                            <p className="text-lg font-bold">{stats.totalTabs}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Active</p>
                            <p className="text-lg font-bold text-amber-600">{stats.activeTabs}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Completed</p>
                            <p className="text-lg font-bold text-green-600">{stats.completedTabs}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Sales</span>
                            <span className="font-medium">Ksh {stats.totalSales.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Paid</span>
                            <span className="text-green-600 font-medium">Ksh {stats.totalPaid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-medium">
                            <span className="text-muted-foreground">Outstanding</span>
                            <span className="text-red-600">Ksh {stats.totalOutstanding.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WaiterManager