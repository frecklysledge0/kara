import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "demo";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "sm",
  ...props
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-mono font-medium rounded tracking-wide uppercase select-none";

  const variants = {
    default: "bg-slate-100 text-slate-800 border border-slate-200",
    secondary: "bg-sky-50 text-sky-900 border border-sky-200",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    destructive: "bg-rose-50 text-rose-800 border border-rose-200",
    outline: "bg-white text-slate-700 border border-slate-300",
    demo: "bg-amber-100 text-amber-900 border border-amber-300 font-semibold",
  };

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
