import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, error, placeholder = 'DD/MM/AAAA' }: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent transition-colors',
            error && 'border-red-500 focus-visible:ring-red-500'
          )}
        />
        <CalendarIcon className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400" />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
