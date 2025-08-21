import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, CreditCard, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const featureCards = [
  {
    title: 'Connect to Restaurant',
    description: 'Scan a QR code to connect to a restaurant and create your personal tab',
    icon: <QrCode className="w-8 h-8 text-blue-500" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    path: '/customer/scan',
  },
  {
    title: 'Saved Restaurants',
    description: 'Access your previously saved or visited restaurants for quick reconnection',
    icon: <CreditCard className="w-8 h-8 text-green-500" />,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    path: '/customer/saved',
  },
  {
    title: 'Easy Billing',
    description: 'View your current tab and make payments with just a few taps',
    icon: <Users className="w-8 h-8 text-purple-500" />,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    path: '/customer/billing',
  },
];

const CustomerHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
          <p className="text-gray-600">What would you like to do today?</p>
        </header>

        <div className="space-y-4">
          {featureCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${card.bgColor}`}
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${card.bgColor} ${card.textColor}`}>
                      {card.icon}
                    </div>
                    <div>
                      <CardTitle className={`text-lg ${card.textColor}`}>
                        {card.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/customer/help')}
          >
            Need Help?
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
