// components/ui/badge.tsx
import clsx from "clsx";

export default function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "gray" | "green" | "red" | "yellow" | "outline";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-zinc-100 text-zinc-700",
        variant === "gray" && "bg-zinc-200 text-zinc-800",
        variant === "green" && "bg-green-100 text-green-800",
        variant === "red" && "bg-red-100 text-red-800",
        variant === "yellow" && "bg-yellow-100 text-yellow-800",
        variant === "outline" && "border border-zinc-400 bg-transparent text-zinc-700",
        className
      )}
    >
      {children}
    </span>
  );
}
