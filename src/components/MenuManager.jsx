import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileText, Loader2, Edit, RefreshCw, Sheet, Code, ClipboardList, Copy } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { createMenuItem, deleteMenuItem, updateMenuItem } from "@/lib/database";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';

// Ensure this array is properly defined and not being overridden
const CATEGORIES = Object.freeze([
  { value: 'food', label: 'Food' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'appetizers', label: 'Appetizers' },
  { value: 'desserts', label: 'Desserts' }
]);

console.log('Available categories:', CATEGORIES);

function MenuManager({ restaurant }) {
  console.log('MenuManager rendering with restaurant:', restaurant);
  const [menuItems, setMenuItems] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logInWithGoogle } = useAuth()
  const [newItem, setNewItem] = useState({ 
    name: '', 
    price: '', 
    category: 'food',
    description: '',
    available: true,
    imageUrl: ''
  })

  useEffect(() => {
    console.log('Restaurant ID changed:', restaurant?.id);
    if (!restaurant?.id) {
      console.log('No restaurant ID, skipping subscription');
      setMenuItems([]);
      setIsLoading(false);
      setError('No restaurant selected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    console.log('Setting up menu subscription for restaurant:', restaurant.id);
    
    // Try with composite index first
    const tryWithIndex = async () => {
      try {
        console.log('Trying with composite index...');
        const q = query(
          collection(db, 'menuItems'),
          where('restaurantId', '==', restaurant.id),
          orderBy('category', 'asc'),
          orderBy('name', 'asc')
        );
        
        return onSnapshot(q, 
          (snapshot) => {
            const items = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log('Received menu items (with index):', items);
            setMenuItems(items);
            setIsLoading(false); // Set loading to false when data is received
          },
          (error) => {
            console.error('Error with composite index query:', error);
            if (error.code === 'failed-precondition') {
              console.log('Composite index missing, trying without ordering...');
              // Fallback to simpler query without ordering
              const simpleQ = query(
                collection(db, 'menuItems'),
                where('restaurantId', '==', restaurant.id)
              );
              
              return onSnapshot(simpleQ, 
                (snapshot) => {
                  const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  console.log('Received menu items (simple query):', items);
                  setMenuItems(items);
                  setIsLoading(false); // Set loading to false when data is received
                },
                (simpleError) => {
                  console.error('Error with simple query:', simpleError);
                  setError('Failed to load menu items');
                  setIsLoading(false); // Set loading to false on error
                }
              );
            }
          }
        );
      } catch (error) {
        console.error('Error setting up menu subscription:', error);
        return () => {}; // Return no-op function
      }
    };
    
    const unsubscribe = tryWithIndex();
    
    return () => {
      console.log('Cleaning up menu subscription');
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then(unsubFn => unsubFn && unsubFn());
      } else if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [restaurant?.id]);

  const handleAddItem = async () => {
    console.log('handleAddItem called with newItem:', newItem);
    
    if (!newItem.name.trim() || !newItem.price) {
      console.log('Validation failed - missing name or price');
      return;
    }
    
    try {
      console.log('Attempting to create menu item...');
      const menuItemData = {
        name: newItem.name.trim(),
        description: (newItem.description || '').trim(),
        price: parseFloat(newItem.price),
        category: newItem.category || 'food',
        available: true,
        restaurantId: restaurant.id,
        // Add timestamps that will be overridden by server timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Calling createMenuItem with data:', menuItemData);
      const result = await createMenuItem(menuItemData);
      console.log('createMenuItem result:', result);
      
      // Reset form
      setNewItem({ 
        name: '', 
        price: '', 
        category: 'food',
        description: '',
        available: true,
        imageUrl: ''
      });
      
      setShowAddForm(false);
      console.log('Form reset and hidden');
      
    } catch (error) {
      console.error('Error in handleAddItem:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        restaurantId: restaurant?.id
      });
      alert(`Failed to add menu item: ${error.message}`);
    }
  }
  
  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || '',
      available: item.available !== false,
      imageUrl: item.imageUrl || ''
    });
    setShowAddForm(true);
  };

  const handleDuplicateItem = (item) => {
    setNewItem({
      name: `${item.name} (Copy)`,
      price: item.price,
      category: item.category,
      description: item.description || '',
      available: true, // Default to available when duplicating
      imageUrl: item.imageUrl || ''
    });
    setShowAddForm(true);
    setEditingItem(null);
    // Scroll to the form
    setTimeout(() => {
      const formElement = document.querySelector('form, [role="form"]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.name.trim() || !newItem.price) {
      console.log('Validation failed - missing name, price, or editing item');
      return;
    }
    
    try {
      console.log('Attempting to update menu item:', editingItem.id);
      const updatedData = {
        name: newItem.name.trim(),
        description: (newItem.description || '').trim(),
        price: parseFloat(newItem.price),
        category: newItem.category || 'food',
        available: newItem.available,
        updatedAt: new Date().toISOString()
      };
      
      console.log('Updating menu item with data:', updatedData);
      await updateMenuItem(editingItem.id, updatedData);
      
      // Reset form and editing state
      setNewItem({ 
        name: '', 
        price: '', 
        category: 'food',
        description: '',
        available: true,
        imageUrl: ''
      });
      setEditingItem(null);
      setShowAddForm(false);
      
      console.log('Menu item updated successfully');
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert(`Failed to update menu item: ${error.message}`);
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await deleteMenuItem(itemId)
    }
  }

  const handleGoogleSheetImport = async () => {
    try {
      const result = await logInWithGoogle();
      // The user is now authenticated and has granted permission.
      // The next step would be to use the access token from the result
      // to make a call to the Google Sheets API.
      alert(`Successfully connected to Google as ${result.user.displayName}. Ready to import from Sheets! (API call to be implemented)`);
    } catch (error) {
      console.error("Google Sheets connection error:", error);
      alert("Failed to connect to Google. Please try again.");
    }
  };

  if (!restaurant) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading restaurant data...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading menu items...</span>
      </div>
    );
  }

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Add New Item Form - Only shown when showAddForm is true */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Menu Item</CardTitle>
            <CardDescription>Enter the details for the new menu item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name *</Label>
                <Input
                  id="itemName"
                  placeholder="e.g., Spaghetti Carbonara"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 12.99"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Short description (optional)"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setNewItem({ 
                    name: '', 
                    price: '', 
                    category: 'food',
                    description: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddItem}
                disabled={!newItem.name.trim() || !newItem.price}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:border-primary" onClick={() => setShowAddForm(true)}>
          <CardHeader className="items-center text-center">
            <ClipboardList className="w-8 h-8 text-primary mb-2" />
            <CardTitle>Manual Entry</CardTitle>
            <CardDescription className="text-xs">Add items one by one using a form.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer h-full hover:border-primary" onClick={handleGoogleSheetImport}>
          <CardHeader className="items-center text-center">
            <Sheet className="w-8 h-8 text-green-600 mb-2" />
            <CardTitle>Google Sheet</CardTitle>
            <CardDescription className="text-xs">Connect and import from a Google Sheet.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-not-allowed bg-muted/50">
          <CardHeader className="items-center text-center">
            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
            <CardTitle className="text-muted-foreground">Upload PDF (AI)</CardTitle>
            <CardDescription className="text-xs">Auto-extract items from a PDF menu. (Coming soon)</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-not-allowed bg-muted/50">
          <CardHeader className="items-center text-center">
            <Code className="w-8 h-8 text-muted-foreground mb-2" />
            <CardTitle className="text-muted-foreground">API Sync</CardTitle>
            <CardDescription className="text-xs">Connect to your POS system. (Coming soon)</CardDescription>
          </CardHeader>
        </Card>
      </div>

{/* Add/Edit Form */}
      {(showAddForm || editingItem) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</CardTitle>
            <CardDescription>
              {editingItem ? 'Update the menu item details' : 'Enter the details for the new menu item'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name *</Label>
                <Input 
                  id="itemName"
                  placeholder="e.g., Margherita Pizza"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input 
                  id="price"
                  type="number"
                  placeholder="e.g., 12.99"
                  value={newItem.price}
                  onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newItem.category}
                    onChange={(e) => {
                      console.log('Selected category:', e.target.value);
                      setNewItem({...newItem, category: e.target.value});
                    }}
                  >
                    <option value="">-- Select a category --</option>
                    <option value="food">Food</option>
                    <option value="drinks">Drinks</option>
                    <option value="appetizers">Appetizers</option>
                    <option value="desserts">Desserts</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Current: {newItem.category || 'None selected'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description"
                  placeholder="Short description (optional)" 
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setNewItem({
                    name: '',
                    price: '',
                    category: 'food',
                    description: '',
                    available: true,
                    imageUrl: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                disabled={!newItem.name.trim() || !newItem.price}
                className={editingItem ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                {editingItem ? (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update Item
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Current Menu</h3>
          <div className="text-sm text-muted-foreground">
            {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'} in menu
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-;oiuy6ghhgtdfhregeteueiueueueyeyeyeyeueueueueieieeieureytythr3393i5uyuhyy86869797iu9uuiu979797iu679u6809u75790iii----====////////////''''';=-04 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {menuItems.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No menu items yet</h3>
            <p className="text-muted-foreground mb-4">Get started by adding your first menu item</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Menu Item
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Price</th>
                  <th className="text-center p-3 font-medium">Category</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium">
                      <div className="flex items-center">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover mr-3"
                          />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground max-w-xs">
                      <p className="line-clamp-2">{item.description || '—'}</p>
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${parseFloat(item.price).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditItem(item)}
                          title="Edit item"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                          onClick={() => handleDuplicateItem(item)}
                          title="Duplicate item"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MenuManager;