import * as React from "react";
import clsx from "clsx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "error" | "compact";
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      showCount = false,
      maxLength,
      autoResize = false,
      label,
      ...props
    },
    ref
  ) => {
    const [text, setText] = React.useState(props.defaultValue?.toString() || "");
    const localRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      if (ref) typeof ref === "function" ? ref(node) : (ref.current = node);
      (localRef as React.MutableRefObject<HTMLTextAreaElement>).current = node;
    };

    React.useEffect(() => {
      if (autoResize && localRef.current) {
        localRef.current.style.height = "auto";
        localRef.current.style.height = `${localRef.current.scrollHeight}px`;
      }
    }, [text, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      props.onChange?.(e);
    };

    const variantClasses = {
      default: "border-zinc-300 focus:border-blue-500 focus:ring-blue-500",
      error: "border-red-500 focus:border-red-500 focus:ring-red-500",
      compact: "py-1 text-sm",
    };

    const sizeClasses = {
      sm: "text-sm px-2 py-1",
      md: "text-base px-3 py-2",
      lg: "text-lg px-4 py-3",
    };

    return (
      <div className="relative w-full">
        {label && <label className="text-sm">{label}</label>}
        <textarea
          ref={combinedRef}
          maxLength={maxLength}
          className={clsx(
            "w-full rounded-md border bg-white shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900 dark:text-white",
            variantClasses[variant],
            sizeClasses[size],
            className
          )}
          value={text}
          onChange={handleChange}
          {...props}
        />
        {showCount && maxLength && (
          <div className="absolute bottom-1 right-2 text-xs text-zinc-500">
            {text.length}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export default Textarea;
