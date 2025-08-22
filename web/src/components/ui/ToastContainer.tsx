import React from 'react';
import { Toast } from './toast';
import { useToast } from './use-toast';

export const ToastContainer: React.FC = () => {
  const { toast, isVisible, dismissToast } = useToast();

  if (!toast) return null;

  return (
    <Toast
      title={toast.title}
      description={toast.description}
      variant={toast.variant}
      onDismiss={dismissToast}
      className={isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
    />
  );
};
