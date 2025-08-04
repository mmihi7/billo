import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { ArrowLeft, Search, Plus, Check, User, Clock } from 'lucide-react'

function WaiterDashboard() {
  const [currentView, setCurrentView] = useState('login') // login, search, tab, addOrder
  const [waiterName, setWaiterName] = useState('')
  const [searchRef, setSearchRef] = useState('')
  const [selectedTab, setSelectedTab] = useState(null)
  const [newOrder, setNewOrder] = useState({ item: '', price: '', quantity: 1 })

  // Mock data
  const mockTabs = {
    'TAB-2024-001': {
      referenceNumber: 'TAB-2024-001',
      customerName: 'John Doe',
      tableNumber: '12',
      status: 'active',
      orders: [
        { id: 1, item: 'Craft Beer', price: 8.50, quantity: 2, time: '7:30 PM', waiter: 'Sarah' },
        { id: 2, item: 'Buffalo Wings', price: 12.00, quantity: 1, time: '7:45 PM', waiter: 'Mike' }
      ]
    }
  }

  const menuItems = [
    { name: 'Craft Beer', price: 8.50 },
    { name: 'Buffalo Wings', price: 12.00 },
    { name: 'Nachos', price: 9.50 },
    { name: 'Burger', price: 15.00 },
    { name: 'Caesar Salad', price: 11.00 },
    { name: 'Fish & Chips', price: 16.50 }
  ]

  const handleLogin = () => {
    if (waiterName.trim()) {
      setCurrentView('search')
    }
  }

  const handleSearch = () => {
    const tab = mockTabs[searchRef]
    if (tab) {
      setSelectedTab(tab)
      setCurrentView('tab')
    } else {
      alert('Tab not found. Please check the reference number.')
    }
  }

  const handleAddOrder = () => {
    if (newOrder.item && newOrder.price) {
      const order = {
        id: Date.now(),
        item: newOrder.item,
        price: parseFloat(newOrder.price),
        quantity: newOrder.quantity,
        time: new Date().toLocaleTimeString(),
        waiter: waiterName
      }
      
      setSelectedTab(prev => ({
        ...prev,
        orders: [...prev.orders, order]
      }))
      
      setNewOrder({ item: '', price: '', quantity: 1 })
      setCurrentView('tab')
      
      // Show confirmation
      alert('Order added successfully!')
    }
  }

  const selectMenuItem = (item) => {
    setNewOrder(prev => ({
      ...prev,
      item: item.name,
      price: item.price.toString()
    }))
  }

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/'}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Waiter Login</h1>
          </div>

          <Card>
            <CardHeader className="text-center">
              <User className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Enter your name to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="waiterName">Waiter Name</Label>
                <Input
                  id="waiterName"
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  placeholder="Enter your name"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full" disabled={!waiterName.trim()}>
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentView === 'search') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('login')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Find Tab</h1>
              <p className="text-sm text-muted-foreground">Welcome, {waiterName}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Search className="w-5 h-5 text-primary mr-2" />
                <CardTitle>Search Tab</CardTitle>
              </div>
              <CardDescription>
                Enter the customer's tab reference number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="searchRef">Tab Reference Number</Label>
                <Input
                  id="searchRef"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="e.g., TAB-2024-001"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} className="w-full" disabled={!searchRef.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Find Tab
              </Button>
            </CardContent>
          </Card>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Demo:</strong> Try searching for "TAB-2024-001"
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'tab') {
    const total = selectedTab.orders.reduce((sum, order) => sum + (order.price * order.quantity), 0)

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('search')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Tab Details</h1>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedTab.customerName}</CardTitle>
                  <CardDescription>Table {selectedTab.tableNumber}</CardDescription>
                </div>
                <Badge variant="secondary">
                  {selectedTab.referenceNumber}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Current Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTab.orders.map((order) => (
                <div key={order.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{order.item}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {order.quantity} • {order.time} • by {order.waiter}
                      </p>
                    </div>
                    <p className="font-semibold">${(order.price * order.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setCurrentView('addOrder')} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add New Order
          </Button>
        </div>
      </div>
    )
  }

  if (currentView === 'addOrder') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentView('tab')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Add Order</h1>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Quick Select</CardTitle>
              <CardDescription>Choose from menu items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between h-auto p-3"
                    onClick={() => selectMenuItem(item)}
                  >
                    <span>{item.name}</span>
                    <span className="font-semibold">${item.price.toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="item">Item Name</Label>
                <Input
                  id="item"
                  value={newOrder.item}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, item: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newOrder.price}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleAddOrder} 
            className="w-full" 
            disabled={!newOrder.item || !newOrder.price}
          >
            <Check className="w-4 h-4 mr-2" />
            Add to Tab
          </Button>
        </div>
      </div>
    )
  }

  return null
}

export default WaiterDashboard

