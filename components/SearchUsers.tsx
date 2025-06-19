// components/SearchUsers.tsx
import { useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { debounce } from "lodash-es";

export interface UserOption {
  label: string;
  value: string;
  __isNew__?: boolean; // marks custom email entries
}

interface SearchUsersProps {
  onSelect: (user: UserOption | null) => void;
  value?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export default function SearchUsers({
  onSelect,
  value,
  label,
  placeholder = "Search users by email...",
  disabled,
  allowCustom = false,
}: SearchUsersProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<string | undefined>(value);

  useEffect(() => {
    if (value !== selected) {
      setSelected(value);
    }
  }, [value]);

  const search = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q.trim()) return;

        const res = await fetch(`/api/search-users?query=${encodeURIComponent(q)}&limit=10`);
        const { users } = await res.json();

        const options: UserOption[] = users.map((u: any) => ({
          label: u.email,
          value: u.id,
        }));

        // If allowed and query is a valid email and not in results, add as custom
        if (
          allowCustom &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q) &&
          !options.some((o) => o.label.toLowerCase() === q.toLowerCase())
        ) {
          options.unshift({
            label: q,
            value: q,
            __isNew__: true,
          });
        }

        setResults(options);
      }, 400),
    [allowCustom]
  );

  useEffect(() => {
    if (query.length >= 2) {
      search(query);
    } else {
      setResults([]);
    }
  }, [query, search]);

  const handleSelect = (value: string) => {
    const option = results.find((r) => r.value === value) || {
      label: value,
      value,
      __isNew__: true,
    };
    setSelected(value);
    onSelect(option);
  };

  return (
    <div className="w-full space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
        disabled={disabled}
      />
      {results.length > 0 && (
        <Select
          options={results}
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}
