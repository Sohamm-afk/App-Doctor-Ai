import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle hover:text-text transition-colors border border-transparent hover:border-border"
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.6, opacity: 0, rotate: -45 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {theme === 'light' ? (
          <Sun size={18} className="text-amber-500 hover:text-amber-600 transition-colors" />
        ) : theme === 'dark' ? (
          <Moon size={18} className="text-violet-400 hover:text-violet-500 transition-colors" />
        ) : (
          <Monitor size={18} className="text-emerald-500 hover:text-emerald-600 transition-colors" />
        )}
      </motion.div>
    </motion.button>
  );
}
