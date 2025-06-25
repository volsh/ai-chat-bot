import { Loader2 } from "lucide-react";

export default function Spinner({
  size = 20,
  className = "",
  overlay = false,
}: {
  size?: number;
  className?: string;
  overlay?: boolean;
}) {
  if (overlay) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
        <div className="animate-spin text-zinc-500 dark:text-zinc-300">
          <Loader2 size={size} />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-block animate-spin text-zinc-500 dark:text-zinc-300 ${className}`}>
      <Loader2 size={size} />
    </div>
  );
}
