import * as React from 'react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantClasses = {
  primary:
    'bg-[#1E3A8A] text-white hover:bg-[#1e40af] focus:ring-[#1E3A8A]',
  secondary:
    'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 focus:ring-zinc-400',
  outline:
    'border border-[#1E3A8A] bg-transparent text-[#1E3A8A] hover:bg-[#1E3A8A]/10 focus:ring-[#1E3A8A]',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 focus:ring-zinc-400',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
