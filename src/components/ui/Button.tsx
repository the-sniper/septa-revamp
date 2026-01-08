'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-septa-gold text-septa-blue-dark
    hover:bg-septa-gold-light
    active:bg-septa-gold-dark
    focus-visible:ring-2 focus-visible:ring-septa-gold focus-visible:ring-offset-2
  `,
  secondary: `
    bg-septa-blue text-white
    hover:bg-septa-blue-light
    active:bg-septa-blue-dark
    focus-visible:ring-2 focus-visible:ring-septa-blue focus-visible:ring-offset-2
  `,
  ghost: `
    bg-transparent text-foreground
    hover:bg-background-subtle
    active:bg-border
    focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2
  `,
  danger: `
    bg-alert-red text-white
    hover:bg-alert-red/90
    active:bg-alert-red/80
    focus-visible:ring-2 focus-visible:ring-alert-red focus-visible:ring-offset-2
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg
          transition-colors duration-150
          disabled:opacity-50 disabled:pointer-events-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export function IconButton({
  children,
  variant = 'ghost',
  className = '',
  ...props
}: Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon'>) {
  return (
    <Button variant={variant} size="icon" className={className} {...props}>
      {children}
    </Button>
  );
}

