import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "subtle";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";

    const variants = {
      primary:
        "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900 border border-transparent shadow-sm",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400 border border-slate-200 shadow-xs",
      outline:
        "bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 focus-visible:ring-slate-400 shadow-xs",
      ghost:
        "text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
      subtle:
        "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60 focus-visible:ring-sky-500",
      destructive:
        "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600 border border-transparent shadow-sm",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 h-8 gap-1.5",
      md: "text-sm px-3.5 py-2 h-9 gap-2",
      lg: "text-sm px-5 py-2.5 h-11 gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
