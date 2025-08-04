import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function CustomerNameInput({ onNameSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Generate a unique customer ID for this session
    const customerId = `cust-${Date.now()}`;
    
    // Store in localStorage
    localStorage.setItem('customerName', name);
    localStorage.setItem('customerId', customerId);
    
    onNameSubmit(name, customerId);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
      <p className="mb-6 text-gray-600">Please enter your name to start your tab</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <Input
            id="customerName"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., John"
            className="w-full"
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        
        <Button type="submit" className="w-full">
          Start My Tab
        </Button>
      </form>
    </div>
  );
}
