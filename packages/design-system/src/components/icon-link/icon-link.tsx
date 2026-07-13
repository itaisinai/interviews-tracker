import type { ReactNode } from "react";

import { MaterialIcon } from "../material-icon/material-icon";

export interface IconLinkProps {
  href: string;
  icon?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  target?: string;
  rel?: string;
}

/**
 * IconLink - A link with an icon that stays on one line and doesn't wrap
 * Perfect for "View X", "Open Y", "Edit Z" type links
 */
export function IconLink({
  href,
  icon = "open_in_new",
  children,
  onClick,
  className = "",
  target,
  rel,
}: IconLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
      className={`inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary ${className}`}
    >
      <MaterialIcon name={icon} className="text-xs" />
      <span className="border-b border-transparent transition-colors hover:border-primary">{children}</span>
    </a>
  );
}
