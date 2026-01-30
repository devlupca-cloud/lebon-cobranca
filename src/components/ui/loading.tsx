import * as React from 'react'

export interface LoadingProps {
  /** Tamanho: sm (24px), md (40px), lg (56px) */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-2',
  lg: 'h-14 w-14 border-[3px]',
}

export function Loading({ size = 'md', className = '' }: LoadingProps) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-zinc-300 border-t-[#1E3A8A] ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Carregando"
    />
  )
}

export function LoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
      <Loading size="lg" />
      {message && <p className="text-sm text-zinc-600">{message}</p>}
    </div>
  )
}
