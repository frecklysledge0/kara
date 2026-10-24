import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, helperText, error, id, ...props }, ref) => {
    const reactGeneratedId = React.useId();
    const inputId = id || reactGeneratedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 tracking-tight"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded border bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
            "border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-[11px] text-rose-600 leading-tight">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
