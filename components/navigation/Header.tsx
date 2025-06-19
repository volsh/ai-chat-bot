import { useAppStore } from "@/state";
import { ThemeToggle } from "../ThemeToggle";

// components/navigation/Header.tsx
export default function Header({ text = "Mental Health AI Dashboard" }) {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="flex h-12 items-center bg-zinc-200 px-4 text-sm font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-white">
      <button onClick={() => toggleSidebar()}>☰</button>
      <ThemeToggle />
    </header>
  );
}
