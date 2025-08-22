import { useState, useCallback, useEffect } from 'react';

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

export const useToast = () => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setToast(options);
    setIsVisible(true);

    // Auto-dismiss after duration (default: 5 seconds)
    const duration = options.duration || 5000;
    const id = setTimeout(() => {
      setIsVisible(false);
      // Wait for animation to complete before removing from DOM
      setTimeout(() => setToast(null), 300);
    }, duration);

    setTimeoutId(id);
    
    // Return cleanup function
    return () => {
      clearTimeout(id);
      setIsVisible(false);
      setToast(null);
    };
  }, [timeoutId]);

  const dismissToast = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => setToast(null), 300);
  }, [timeoutId]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return {
    toast,
    isVisible,
    showToast,
    dismissToast,
  };
};

export default useToast;
