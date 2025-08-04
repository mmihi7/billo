import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function TableNumberInput({ restaurantId, onTableNumberSet }) {
  const [tableNumber, setTableNumber] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tableNumber.trim()) {
      localStorage.setItem(`table-${restaurantId}`, tableNumber);
      onTableNumberSet(tableNumber);
      navigate(`/restaurant/${restaurantId}/menu`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
      <p className="mb-6 text-gray-600">Please enter your table number to continue</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Table Number
          </label>
          <Input
            id="tableNumber"
            type="number"
            min="1"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g., 5"
            className="w-full"
            required
          />
        </div>
        
        <Button type="submit" className="w-full">
          Continue to Menu
        </Button>
      </form>
    </div>
  );
}
