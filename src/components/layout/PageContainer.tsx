import React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageContainer({
  title,
  description,
  actions,
  badge,
  children,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8", className)}
      {...props}
    >
      {(title || description || actions || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1.5 max-w-3xl">
            {badge && <div className="mb-2">{badge}</div>}
            {title && (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2.5 shrink-0 pt-1">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
