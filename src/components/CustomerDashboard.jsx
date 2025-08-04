import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CustomerDashboard() {
  const { restaurantId } = useParams();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const navigate = useNavigate();

  // Load customer data from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem('customerName');
    const storedId = localStorage.getItem('customerId');
    
    if (!storedName || !storedId) {
      // Redirect to name input if not set
      navigate(`/restaurant/${restaurantId}/start`);
    } else {
      setCustomerName(storedName);
      setCustomerId(storedId);
    }
  }, [restaurantId, navigate]);

  // Fetch menu items
  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      
      try {
        const q = query(
          collection(db, 'menuItems'),
          where('restaurantId', '==', restaurantId),
          where('available', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setMenuItems(items);
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  const addToCart = (item) => {
    setCart([...cart, { ...item, cartId: Date.now().toString() }]);
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      const orderData = {
        restaurantId,
        customerId,
        customerName,
        items: cart.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })),
        status: 'pending',
        createdAt: serverTimestamp(),
        tableId: 'table-1', // This would come from QR code or table selection
        total: cart.reduce((sum, item) => sum + item.price, 0)
      };

      await addDoc(collection(db, 'orders'), orderData);
      setOrderPlaced(true);
      setCart([]);
      
      // Show success message for 3 seconds
      setTimeout(() => setOrderPlaced(false), 3000);
      
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading menu...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {customerName}!</h1>
        <Button 
          variant="outline" 
          onClick={() => {
            localStorage.removeItem('customerName');
            localStorage.removeItem('customerId');
            navigate(`/restaurant/${restaurantId}/start`);
          }}
        >
          Change Name
        </Button>
      </div>

      {orderPlaced && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Order placed successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">${item.price.toFixed(2)}</span>
                    <Button 
                      size="sm" 
                      onClick={() => addToCart(item)}
                    >
                      Add to Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Order</h2>
          <Card>
            <CardContent className="p-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
              ) : (
                <>
                  <ul className="space-y-2 mb-4">
                    {cart.map((item) => (
                      <li key={item.cartId} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFromCart(item.cartId)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold mb-4">
                      <span>Total:</span>
                      <span>${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={placeOrder}
                    >
                      Place Order
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
