import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded border border-dashed border-slate-300 bg-slate-50/50",
        className
      )}
    >
      <div className="w-10 h-10 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
