import type { ButtonHTMLAttributes, ReactNode } from "react";

import { MaterialIcon } from "../material-icon/index.js";

export type ButtonVariant = "primary" | "secondary" | "outlined" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: string;
  leadingIconFilled?: boolean;
  trailingIcon?: string;
  children?: ReactNode;
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label-md",
  md: "h-10 px-4 text-body-md",
  lg: "h-12 px-5 text-body-md",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-primary text-on-primary shadow-none hover:brightness-110",
  secondary:
    "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low",
  outlined:
    "border border-primary bg-transparent text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
  ghost: "border border-transparent bg-transparent text-on-surface-variant hover:bg-surface-container-low",
  danger: "border border-error bg-error-container text-on-error-container hover:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  leadingIcon,
  leadingIconFilled = false,
  trailingIcon,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-body-md font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : leadingIcon ? (
        <MaterialIcon name={leadingIcon} filled={leadingIconFilled} className="text-[18px]" />
      ) : null}
      <span className="whitespace-nowrap">{loading ? (loadingLabel ?? children) : children}</span>
      {!loading && trailingIcon ? <MaterialIcon name={trailingIcon} className="text-[18px]" /> : null}
    </button>
  );
}
