import { forwardRef } from "react";

import type { InputHTMLAttributes } from "react";

import { MaterialIcon } from "../material-icon";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, indeterminate, className = "", disabled, ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`} style={{ whiteSpace: "nowrap" }}>
        <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            {...props}
            style={{
              position: "absolute",
              width: "20px",
              height: "20px",
              opacity: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              margin: 0,
              zIndex: 10,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              border: "2px solid #ccc",
              borderRadius: "4px",
              backgroundColor: props.checked ? "#0066cc" : "#fff",
              borderColor: props.checked ? "#0066cc" : "#ccc",
              transition: "all 0.15s",
              pointerEvents: "none",
            }}
          >
            {props.checked && <MaterialIcon name="check" className="text-base text-white" />}
          </div>
        </div>
        {label && <span style={{ fontSize: "14px", flexShrink: 0 }}>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
