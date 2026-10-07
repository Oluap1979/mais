import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export function LoadingSpinner({ size = 'md', fullScreen = false, message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses} rounded-full border-blue-600 border-t-transparent animate-spin`}
        role="status"
        aria-label="Carregando"
      />
      {message && <p className="text-sm font-medium text-blue-900 animate-pulse">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-xs transition-opacity">
        <div className="rounded-2xl bg-white p-6 shadow-xl border border-blue-100 flex flex-col items-center gap-3">
          {spinner}
          <span className="text-xs text-gray-500 font-medium">Mais Igreja · Atualizando dados...</span>
        </div>
      </div>
    );
  }

  return spinner;
}
