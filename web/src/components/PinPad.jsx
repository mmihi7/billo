import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Delete } from 'lucide-react';

export function PinPad({ onVerify, onClose, waiterName }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      onVerify(pin);
    } else {
      setError('Please enter a 4-digit PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Enter PIN for {waiterName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-center items-center space-x-2 mb-2">
            {[1, 2, 3, 4].map((_, index) => (
              <div 
                key={index}
                className={`w-4 h-4 rounded-full border-2 ${index < pin.length ? 'bg-primary border-primary' : 'border-gray-300'}`}
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <Button
              key={num}
              variant="outline"
              className="h-14 text-lg"
              onClick={() => handleNumberClick(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-14"
            onClick={handleDelete}
          >
            <Delete className="w-5 h-5" />
          </Button>
          <Button
            className="h-14 bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
          >
            Enter
          </Button>
        </div>
      </div>
    </div>
  );
}
