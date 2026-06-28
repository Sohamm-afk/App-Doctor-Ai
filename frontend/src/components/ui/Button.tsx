import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

// ─── Variants ────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white shadow-sm hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-500',
  secondary:
    'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 active:bg-secondary-300 focus-visible:ring-secondary-400',
  outline:
    'border border-border bg-white text-text hover:bg-bg-subtle active:bg-bg-muted focus-visible:ring-primary-500',
  ghost:
    'bg-transparent text-text-muted hover:bg-bg-subtle hover:text-text active:bg-bg-muted focus-visible:ring-primary-500',
  success:
    'bg-success text-white shadow-sm hover:bg-green-600 active:bg-green-700 focus-visible:ring-green-400',
  danger:
    'bg-danger text-white shadow-sm hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7  px-2.5 text-caption gap-1',
  sm: 'h-8  px-3   text-body-sm gap-1.5',
  md: 'h-10 px-4   text-body-sm gap-2',
  lg: 'h-11 px-5   text-body-md gap-2',
  xl: 'h-12 px-6   text-body-md gap-2.5',
};

// ─── Props ────────────────────────────────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:    ButtonVariant;
  size?:       ButtonSize;
  loading?:    boolean;
  leftIcon?:   React.ReactNode;
  rightIcon?:  React.ReactNode;
  fullWidth?:  boolean;
  /** Renders as an icon-only square button */
  iconOnly?:   boolean;
}

// ─── Component ────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly  = false,
      children,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        whileHover={isDisabled ? undefined : { scale: 1.01 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-medium rounded-btn',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'select-none cursor-pointer',
          // Variant
          variantClasses[variant],
          // Size
          iconOnly
            ? sizeClasses[size].replace(/px-\S+/, '').trim() + ' aspect-square'
            : sizeClasses[size],
          // States
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          fullWidth  && 'w-full',
          className,
        )}
        disabled={isDisabled}
        aria-busy={loading}
        {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'xs' || size === 'sm' ? 14 : 16} />
        ) : (
          leftIcon
        )}
        {!iconOnly && children && (
          <span className={cn(loading && leftIcon && 'ml-1')}>{children}</span>
        )}
        {!loading && rightIcon}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';
