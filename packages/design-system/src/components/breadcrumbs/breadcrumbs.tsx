import type { ReactNode } from "react";

import { MaterialIcon } from "../material-icon";

export type BreadcrumbItem = {
  label: string;
  element?: ReactNode; // Allow consumer to pass custom element (e.g., Link from react-router)
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <MaterialIcon name="chevron_right" className="text-[16px] text-on-surface-variant" />}
            {item.element ? (
              item.element
            ) : (
              <span className={isLast ? "font-medium text-on-surface" : "font-medium text-on-surface-variant"}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
