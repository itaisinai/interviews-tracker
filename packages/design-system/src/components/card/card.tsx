import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={["rounded-xl border border-outline-variant bg-surface-container-lowest shadow-none", className].join(
        " "
      )}
      {...props}
    >
      {children}
    </div>
  );
}
