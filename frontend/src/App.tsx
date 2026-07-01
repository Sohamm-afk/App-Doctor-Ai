import { AppRouter }    from '@/routes';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/hooks/useTheme';

/**
 * Application root.
 * Wraps the router with global providers.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </ThemeProvider>
  );
}
