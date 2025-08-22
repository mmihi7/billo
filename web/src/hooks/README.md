# Toast Notifications

This directory contains the toast notification system for the application.

## Available Hooks

### `useToast`

A custom hook that provides methods for showing toast notifications.

```javascript
import { useToast } from './hooks/use-toast';

function MyComponent() {
  const { showToast, showSuccess, showError } = useToast();

  // Basic usage
  const handleClick = () => {
    showToast({
      title: 'Title',
      description: 'This is a toast message',
      variant: 'default' | 'destructive',
      duration: 5000, // Optional, defaults to 5000ms
    });
  };

  // Success helper
  const handleSuccess = () => {
    showSuccess('Operation completed successfully!');
  };

  // Error helper
  const handleError = () => {
    showError('Something went wrong!');
  };

  // ...
}
```

## Toast Container

The `ToastContainer` component must be added to your application's root component (usually `App.jsx` or similar) for the toast notifications to work.

```jsx
import { ToastContainer } from './components/ui/ToastContainer';

function App() {
  return (
    <>
      {/* Your app content */}
      <ToastContainer />
    </>
  );
}
```

## Styling

Toast notifications are styled using Tailwind CSS. You can customize their appearance by modifying the `Toast` component in `src/components/ui/toast.tsx`.

## Types

- `ToastOptions`:
  - `title?: string` - The title of the toast
  - `description?: string` - The message to display
  - `variant?: 'default' | 'destructive'` - The visual style of the toast
  - `duration?: number` - How long the toast should be visible (in milliseconds)

## Best Practices

- Use `showSuccess` for successful operations
- Use `showError` for error messages
- Keep toast messages concise and clear
- Use appropriate durations (shorter for success, longer for errors)
- Avoid showing too many toasts in quick succession
