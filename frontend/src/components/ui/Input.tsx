import { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/utils';

// ─── Base Input ───────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  hint?:      string;
  error?:     string;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const inputBase =
  'w-full rounded-input border bg-white text-text text-body-sm placeholder:text-text-subtle ' +
  'px-3 py-2.5 transition-all duration-150 outline-none ' +
  'focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-primary-400 ' +
  'disabled:bg-bg-muted disabled:cursor-not-allowed disabled:opacity-60 ' +
  'border-border hover:border-secondary-300';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, fullWidth = true, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-body-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-text-subtle pointer-events-none">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputBase,
              error  && 'border-danger focus:ring-danger/30',
              leftIcon  && 'pl-9',
              rightIcon && 'pr-9',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {rightIcon && (
            <span className="absolute right-3 text-text-subtle">{rightIcon}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-caption text-danger">{error}</p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-caption text-text-muted">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ─── Password Input ───────────────────────────────────────────────

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightIcon'>>(
  ({ ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-text-muted hover:text-text transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

// ─── Textarea ─────────────────────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:     string;
  hint?:      string;
  error?:     string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, fullWidth = true, className, id, ...rest }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className="text-body-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            inputBase,
            'resize-y min-h-[100px]',
            error && 'border-danger focus:ring-danger/30',
            className,
          )}
          aria-invalid={!!error}
          {...rest}
        />
        {error && <p className="text-caption text-danger">{error}</p>}
        {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// ─── Toggle ───────────────────────────────────────────────────────

interface ToggleProps {
  checked:    boolean;
  onChange:   (checked: boolean) => void;
  label?:     string;
  disabled?:  boolean;
  size?:      'sm' | 'md';
  id?:        string;
}

export function Toggle({ checked, onChange, label, disabled, size = 'md', id }: ToggleProps) {
  const toggleId = id ?? 'toggle-' + Math.random().toString(36).slice(2);
  const trackSize = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const thumbSize = size === 'sm' ? 'w-3 h-3'  : 'w-4 h-4';
  const translate = checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0.5';
  return (
    <label htmlFor={toggleId} className={cn('inline-flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        role="switch"
        id={toggleId}
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          trackSize,
          checked ? 'bg-primary-500' : 'bg-secondary-300',
        )}
      >
        <span
          className={cn(
            'absolute rounded-full bg-white shadow-sm transition-transform duration-200',
            thumbSize,
            translate,
          )}
        />
      </button>
      {label && <span className="text-body-sm font-medium text-text">{label}</span>}
    </label>
  );
}

// ─── Repository URL Input ─────────────────────────────────────────

interface RepoInputProps extends Omit<InputProps, 'type'> {
  onValidate?: (valid: boolean) => void;
}

export function RepoInput({ onValidate, onChange, ...props }: RepoInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    if (onValidate) {
      const valid = /^(https?:\/\/)?(github|gitlab|bitbucket)\.com\/.+/.test(e.target.value);
      onValidate(valid);
    }
  };

  return (
    <Input
      type="url"
      placeholder="https://github.com/your-org/your-repo"
      onChange={handleChange}
      hint="Supports GitHub, GitLab, and Bitbucket repositories"
      {...props}
    />
  );
}

// ─── Select Component ─────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, fullWidth = true, className, ...props }, ref) => {
    const selectId = props.id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={selectId} className="text-body-sm font-medium text-text">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              inputBase,
              'appearance-none pr-10 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]',
              error && 'border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
            <ChevronDown size={16} />
          </div>
        </div>
        {error && <p className="text-caption text-danger">{error}</p>}
        {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ─── MultiSelect Component ────────────────────────────────────────

export interface MultiSelectProps {
  label?: string;
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function MultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  error,
  hint,
  fullWidth = true,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div className={cn('relative flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && <label className="text-body-sm font-medium text-text">{label}</label>}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            inputBase,
            'flex flex-wrap items-center gap-1.5 pr-10 cursor-pointer min-h-[42px]',
            error && 'border-danger focus:ring-danger/30'
          )}
        >
          {selectedValues.length === 0 ? (
            <span className="text-text-subtle">{placeholder}</span>
          ) : (
            selectedValues.map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-caption font-medium px-2 py-0.5 rounded-full border border-primary-100"
                >
                  {opt?.label ?? val}
                  <button
                    type="button"
                    onClick={(e) => removeValue(val, e)}
                    className="hover:text-primary-900 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-xl shadow-dropdown z-dropdown max-h-60 overflow-y-auto p-1.5">
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-body-sm hover:bg-bg-subtle transition-colors',
                    isSelected && 'bg-primary-50/50 text-primary-700 font-medium'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="text-primary-500" />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="text-caption text-danger">{error}</p>}
      {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

// ─── Checkbox Component ───────────────────────────────────────────

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, ...props }, ref) => {
    const checkboxId = props.id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={checkboxId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              'w-4.5 h-4.5 rounded border-border text-primary-500 focus:ring-primary-500 accent-primary-500 transition-colors',
              className
            )}
            {...props}
          />
          <span className="text-body-sm text-text font-medium">{label}</span>
        </label>
        {error && <p className="text-caption text-danger pl-7">{error}</p>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ─── Radio Group Component ────────────────────────────────────────

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  label?: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inline?: boolean;
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
  inline = false,
}: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-body-sm font-medium text-text">{label}</span>}
      <div className={cn('flex gap-4', inline ? 'flex-row items-center' : 'flex-col')}>
        {options.map((opt) => {
          const radioId = `${name}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={radioId}
              className="inline-flex items-center gap-2.5 cursor-pointer select-none"
            >
              <input
                type="radio"
                id={radioId}
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="w-4.5 h-4.5 text-primary-500 focus:ring-primary-500 accent-primary-500"
              />
              <span className="text-body-sm text-text font-medium">{opt.label}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}

// ─── Slider Component ─────────────────────────────────────────────

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChangeValue: (value: number) => void;
  error?: string;
  hint?: string;
}

export function Slider({
  label,
  value,
  onChangeValue,
  min = 0,
  max = 100,
  step = 1,
  error,
  hint,
  className,
  ...props
}: SliderProps) {
  const sliderId = props.id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        {label && <label htmlFor={sliderId} className="text-body-sm font-medium text-text">{label}</label>}
        <span className="text-body-sm font-semibold text-text">{value}</span>
      </div>
      <input
        type="range"
        id={sliderId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChangeValue(Number(e.target.value))}
        className={cn(
          'w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none',
          className
        )}
        {...props}
      />
      {error && <p className="text-caption text-danger">{error}</p>}
      {hint && !error && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}
