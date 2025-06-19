// components/ui/label.tsx
import clsx from "clsx";
import { ReactNode } from "react";

type LabelProps = {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
};

export default function Label({ children, htmlFor, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx("block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", className)}
    >
      {children}
    </label>
  );
}
