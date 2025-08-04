import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

export default function TableTabsView() {
  const { tableId } = useParams();
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tableId) return;

    const q = query(
      collection(db, 'tabs'),
      where('tableId', '==', tableId),
      where('status', '==', 'open')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tabsData = [];
      snapshot.forEach((doc) => {
        tabsData.push({ id: doc.id, ...doc.data() });
      });
      setTabs(tabsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tableId]);

  const closeTab = async (tabId) => {
    try {
      await updateDoc(doc(db, 'tabs', tabId), {
        status: 'closed',
        closedAt: new Date()
      });
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  };

  const calculateTotal = (orders) => {
    return orders.reduce((sum, order) => {
      return sum + (order.items?.reduce((orderSum, item) => 
        orderSum + (item.price * (item.quantity || 1)), 0) || 0);
    }, 0);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading tabs...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Table {tableId} - Active Tabs</h1>
      
      {tabs.length === 0 ? (
        <p>No active tabs for this table</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map((tab) => (
            <Card key={tab.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{tab.customerName}</CardTitle>
                    <p className="text-sm text-gray-500">Tab #{tab.id.slice(-4)}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {tab.orders?.length || 0} {tab.orders?.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 mb-4">
                  {tab.orders?.map((order, index) => (
                    <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="font-medium">Order #{order.id?.slice(-4) || index + 1}</p>
                      <ul className="text-sm text-gray-600 mt-1">
                        {order.items?.map((item, i) => (
                          <li key={i} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold mb-3">
                    <span>Tab Total:</span>
                    <span>${calculateTotal(tab.orders || []).toFixed(2)}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        // View tab details or print receipt
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => closeTab(tab.id)}
                    >
                      Close Tab
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
