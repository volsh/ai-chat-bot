// hooks/useSavedFilters.ts
import { useEffect, useState } from "react";

export function useSavedFilters<T extends object>(key: string, defaults: T) {
  const [filters, setFilters] = useState<T>(defaults);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setFilters({ ...defaults, ...JSON.parse(stored) });
      } catch (_) {}
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(filters));
  }, [key, filters]);

  const setFilter = (name: keyof T, value: any) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => setFilters(defaults);

  return { filters, setFilter, resetFilters };
}
