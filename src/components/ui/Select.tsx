import React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, id, options, children, ...props }, ref) => {
    const reactGeneratedId = React.useId();
    const selectId = id || reactGeneratedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-slate-700 tracking-tight"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded border bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors",
            "border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error ? (
          <p className="text-[11px] text-rose-600 leading-tight">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
