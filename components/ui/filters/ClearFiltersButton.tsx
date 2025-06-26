import Button from "../button";

export default function ClearFiltersButton({
  onClick,
  label = "🧹",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      onClick={onClick}
      className="hover:animate-pulse-slow rounded-md bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-800 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
    >
      {label}
    </Button>
  );
}
