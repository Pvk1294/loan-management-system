'use client';

import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-line-strong bg-white pr-9 pl-10 text-sm text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-faint hover:border-ink-faint focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-ink-faint hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
