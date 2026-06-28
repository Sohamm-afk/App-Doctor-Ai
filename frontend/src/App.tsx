import { AppRouter }    from '@/routes';
import { ToastProvider } from '@/components/ui/Toast';

/**
 * Application root.
 * Wraps the router with global providers.
 */
export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
