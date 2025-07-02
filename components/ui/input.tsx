// components/ui/input.tsx
import { InputHTMLAttributes, forwardRef, useState } from "react";
import clsx from "clsx";
import Label from "./label";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: "default" | "error" | "compact";
  size?: "sm" | "md" | "lg";
  showPasswordToggle?: boolean;
  label?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      type = "text",
      showPasswordToggle = false,
      label,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType =
      showPasswordToggle && type === "password" ? (showPassword ? "text" : "password") : type;

    return (
      <div className="relative">
        {label && <Label>{label}</Label>}
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            "rounded-md border bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900",
            {
              "border-zinc-300 dark:border-zinc-700": variant === "default",
              "border-red-500 focus:ring-red-500": variant === "error",
              "px-2 py-1 text-xs": variant === "compact" || size === "sm",
              "text-sm": size === "md",
              "px-4 py-3 text-base": size === "lg",
            },
            className
          )}
          {...props}
        />
        {showPasswordToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:underline"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
