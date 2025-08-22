import { useCallback } from 'react';
import { useToast as useToastHook } from '../components/ui/use-toast';

export const useToast = () => {
  const { showToast } = useToastHook();

  const showSuccess = useCallback((message, title = 'Success') => {
    showToast({
      title,
      description: message,
      variant: 'default',
      duration: 3000,
    });
  }, [showToast]);

  const showError = useCallback((message, title = 'Error') => {
    showToast({
      title,
      description: message,
      variant: 'destructive',
      duration: 5000,
    });
  }, [showToast]);

  return {
    showToast,
    showSuccess,
    showError,
  };
};

export default useToast;
