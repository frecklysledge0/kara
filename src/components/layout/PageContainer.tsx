import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageContainer({
  title,
  description,
  actions,
  badge,
  breadcrumbs,
  children,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8", className)}
      {...props}
    >
      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500 font-sans flex-wrap">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 rounded"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "font-medium text-slate-900" : "text-slate-600"} aria-current={isLast ? "page" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

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
          {actions && <div className="flex items-center gap-2.5 shrink-0 pt-1 flex-wrap">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
