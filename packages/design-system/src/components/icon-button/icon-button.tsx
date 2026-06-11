import type { ButtonHTMLAttributes } from "react";
import { MaterialIcon } from "../material-icon/index.js";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  iconFilled?: boolean;
  label: string;
};

export function IconButton({
  icon,
  iconFilled = false,
  label,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-all hover:bg-surface-container-low",
        className,
      ].join(" ")}
      {...props}
    >
      <MaterialIcon name={icon} filled={iconFilled} className="text-[18px]" />
    </button>
  );
}
