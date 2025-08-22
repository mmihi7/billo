import React from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';

const ToastExample = () => {
  const { showToast, showSuccess, showError } = useToast();

  const handleDefaultToast = () => {
    showToast({
      title: 'Default Toast',
      description: 'This is a default toast message.',
      variant: 'default',
    });
  };

  const handleSuccessToast = () => {
    showSuccess('Operation completed successfully!', 'Success!');
  };

  const handleErrorToast = () => {
    showError('Something went wrong! Please try again.', 'Error');
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Toast Examples</h2>
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleDefaultToast}
          variant="outline"
        >
          Show Default Toast
        </Button>
        
        <Button 
          onClick={handleSuccessToast}
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Show Success Toast
        </Button>
        
        <Button 
          onClick={handleErrorToast}
          variant="destructive"
        >
          Show Error Toast
        </Button>
      </div>
    </div>
  );
};

export default ToastExample;
