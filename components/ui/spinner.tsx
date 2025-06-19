import { Loader2 } from "lucide-react";

export default function Spinner({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`animate-spin text-zinc-500 dark:text-zinc-300 ${className}`}>
      <Loader2 size={size} />
    </div>
  );
}
