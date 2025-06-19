"use client";
import { useTheme } from "@/context/themeContext";
import Button from "./ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const nextTheme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";

  const label = nextTheme === "dark" ? "🌙 Dark" : nextTheme === "light" ? "☀ Light" : "🖥 System";

  return (
    <Button onClick={() => setTheme(nextTheme)} className="text-sm underline">
      {label}
    </Button>
  );
}
