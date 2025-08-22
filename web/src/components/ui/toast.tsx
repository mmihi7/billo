import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'default' | 'destructive';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  className?: string;
}

const variantStyles = {
  default: 'bg-white text-gray-900 border border-gray-200',
  destructive: 'bg-red-500 text-white',
};

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  variant = 'default',
  onDismiss,
  className,
}) => {
  React.useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-full max-w-xs rounded-lg p-4 shadow-lg transition-all',
        variantStyles[variant],
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-1">
          {title && (
            <h3 className="mb-1 text-sm font-medium">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm opacity-90">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-4 inline-flex h-5 w-5 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};

export const ToastViewport: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('fixed bottom-0 right-0 z-50 p-4', className)}>
      {/* Toast will be rendered here */}
    </div>
  );
};

// Re-export for backward compatibility
export const ToastTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({
  children,
  className,
}) => {
  return <h3 className={cn('text-sm font-medium', className)}>{children}</h3>;
};

export const ToastDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({
  children,
  className,
}) => {
  return <p className={cn('text-sm opacity-90', className)}>{children}</p>;
};

export const ToastClose: React.FC<{ onClick: () => void; className?: string }> = ({
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none',
        className
      )}
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
};

export const ToastAction: React.FC<{
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mt-2 inline-flex h-8 items-center justify-center rounded-md bg-black/10 px-3 text-sm font-medium transition-colors hover:bg-black/20',
        className
      )}
    >
      {children}
    </button>
  );
};
