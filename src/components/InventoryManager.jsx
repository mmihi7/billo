import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Plus, Edit, Trash2, Package, DollarSign, AlertTriangle, Crown } from 'lucide-react'

function InventoryManager() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState(['Drinks', 'Food', 'Appetizers', 'Desserts'])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    description: '',
    available: true,
    stockLevel: '',
    minStock: '',
    unit: 'piece'
  })

  // Mock data for demonstration
  useEffect(() => {
    const mockItems = [
      {
        id: 1,
        name: 'Craft Beer',
        category: 'Drinks',
        price: 8.50,
        cost: 3.00,
        description: 'Local craft beer on tap',
        available: true,
        stockLevel: 45,
        minStock: 10,
        unit: 'pint',
        profit: 5.50,
        margin: 64.7
      },
      {
        id: 2,
        name: 'Buffalo Wings',
        category: 'Food',
        price: 12.00,
        cost: 4.50,
        description: 'Spicy buffalo wings with ranch',
        available: true,
        stockLevel: 8,
        minStock: 5,
        unit: 'order',
        profit: 7.50,
        margin: 62.5
      },
      {
        id: 3,
        name: 'Nachos',
        category: 'Appetizers',
        price: 9.50,
        cost: 2.75,
        description: 'Loaded nachos with cheese and jalapeños',
        available: false,
        stockLevel: 0,
        minStock: 3,
        unit: 'order',
        profit: 6.75,
        margin: 71.1
      }
    ]
    setItems(mockItems)
  }, [])

  const handleAddItem = () => {
    if (newItem.name && newItem.category && newItem.price) {
      const price = parseFloat(newItem.price)
      const cost = parseFloat(newItem.cost) || 0
      const profit = price - cost
      const margin = cost > 0 ? ((profit / price) * 100) : 0

      const item = {
        id: Date.now(),
        ...newItem,
        price,
        cost,
        profit: profit.toFixed(2),
        margin: margin.toFixed(1),
        stockLevel: parseInt(newItem.stockLevel) || 0,
        minStock: parseInt(newItem.minStock) || 0
      }

      setItems([...items, item])
      setNewItem({
        name: '',
        category: '',
        price: '',
        cost: '',
        description: '',
        available: true,
        stockLevel: '',
        minStock: '',
        unit: 'piece'
      })
      setShowAddForm(false)
    }
  }

  const handleEditItem = (item) => {
    setEditingItem(item.id)
    setNewItem({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      cost: item.cost.toString(),
      description: item.description,
      available: item.available,
      stockLevel: item.stockLevel.toString(),
      minStock: item.minStock.toString(),
      unit: item.unit
    })
    setShowAddForm(true)
  }

  const handleUpdateItem = () => {
    if (newItem.name && newItem.category && newItem.price) {
      const price = parseFloat(newItem.price)
      const cost = parseFloat(newItem.cost) || 0
      const profit = price - cost
      const margin = cost > 0 ? ((profit / price) * 100) : 0

      const updatedItem = {
        id: editingItem,
        ...newItem,
        price,
        cost,
        profit: profit.toFixed(2),
        margin: margin.toFixed(1),
        stockLevel: parseInt(newItem.stockLevel) || 0,
        minStock: parseInt(newItem.minStock) || 0
      }

      setItems(items.map(item => item.id === editingItem ? updatedItem : item))
      setEditingItem(null)
      setNewItem({
        name: '',
        category: '',
        price: '',
        cost: '',
        description: '',
        available: true,
        stockLevel: '',
        minStock: '',
        unit: 'piece'
      })
      setShowAddForm(false)
    }
  }

  const handleDeleteItem = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const toggleAvailability = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ))
  }

  const getStockStatus = (item) => {
    if (item.stockLevel === 0) return { status: 'out', color: 'bg-red-100 text-red-800' }
    if (item.stockLevel <= item.minStock) return { status: 'low', color: 'bg-yellow-100 text-yellow-800' }
    return { status: 'good', color: 'bg-green-100 text-green-800' }
  }

  const lowStockItems = items.filter(item => item.stockLevel <= item.minStock)
  const outOfStockItems = items.filter(item => item.stockLevel === 0)

  return (
    <div className="space-y-6">
      {/* Header with Subscription Upsell */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Manage your menu items and stock levels</p>
        </div>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Free Tier</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Manual inventory management. Upgrade for auto-sync with POS systems.
            </p>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  ${items.reduce((sum, item) => sum + (item.profit * item.stockLevel), 0).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Potential Profit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{outOfStockItems.length}</p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Menu Items</TabsTrigger>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Add Item Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Menu Items</h3>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      placeholder="e.g., Craft Beer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="price">Selling Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost Price ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={newItem.cost}
                      onChange={(e) => setNewItem({...newItem, cost: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stockLevel">Current Stock</Label>
                    <Input
                      id="stockLevel"
                      type="number"
                      value={newItem.stockLevel}
                      onChange={(e) => setNewItem({...newItem, stockLevel: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStock">Minimum Stock</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={newItem.minStock}
                      onChange={(e) => setNewItem({...newItem, minStock: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Item description..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddForm(false)
                    setEditingItem(null)
                    setNewItem({
                      name: '',
                      category: '',
                      price: '',
                      cost: '',
                      description: '',
                      available: true,
                      stockLevel: '',
                      minStock: '',
                      unit: 'piece'
                    })
                  }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items List */}
          <div className="space-y-4">
            {items.map((item) => {
              const stockStatus = getStockStatus(item)
              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge className={stockStatus.color}>
                            {stockStatus.status === 'out' ? 'Out of Stock' : 
                             stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                          </Badge>
                          {!item.available && (
                            <Badge variant="destructive">Unavailable</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price: </span>
                            <span className="font-medium">${item.price}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost: </span>
                            <span className="font-medium">${item.cost}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stock: </span>
                            <span className="font-medium">{item.stockLevel} {item.unit}s</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin: </span>
                            <span className="font-medium">{item.margin}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAvailability(item.id)}
                        >
                          {item.available ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <h3 className="text-lg font-semibold">Stock Alerts</h3>
          
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Out of Stock Items</CardTitle>
                <CardDescription>These items are completely out of stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {outOfStockItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="destructive">0 {item.unit}s</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800">Low Stock Items</CardTitle>
                <CardDescription>These items are running low</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <span className="font-medium">{item.name}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {item.stockLevel} {item.unit}s (min: {item.minStock})
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">All Good!</h3>
                <p className="text-muted-foreground">No stock alerts at this time.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Inventory Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Profit Margins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin))
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <Badge className="bg-green-100 text-green-800">
                          {item.margin}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map(category => {
                    const categoryItems = items.filter(item => item.category === category)
                    const totalValue = categoryItems.reduce((sum, item) => sum + (item.price * item.stockLevel), 0)
                    return (
                      <div key={category} className="flex justify-between items-center">
                        <span className="font-medium">{category}</span>
                        <div className="text-right">
                          <div className="font-semibold">${totalValue.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{categoryItems.length} items</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InventoryManager

