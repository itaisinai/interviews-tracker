import type { ButtonHTMLAttributes } from "react";

import { MaterialIcon } from "../material-icon/index.js";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  iconFilled?: boolean;
  label: string;
  variant?: "default" | "ghost";
};

export function IconButton({
  icon,
  iconFilled = false,
  label,
  variant = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  const baseStyles = "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all";
  const variantStyles =
    variant === "ghost"
      ? "text-on-surface-variant hover:bg-primary/10 hover:text-primary"
      : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low";

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[baseStyles, variantStyles, className].join(" ")}
      {...props}
    >
      <MaterialIcon name={icon} filled={iconFilled} className="text-[18px]" />
    </button>
  );
}
