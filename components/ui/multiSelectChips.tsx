import React, { useEffect, useState } from "react";
import Select from "react-select";

interface OptionType {
  label: string;
  value: string;
}

interface MultiSelectChipsProps {
  label?: string;
  options: string[] | OptionType[];
  values: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  scrollable?: boolean;
  isLoading?: boolean;
}

const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  label,
  options,
  values,
  onChange,
  searchable = true,
  scrollable = true,
  isLoading = false,
}) => {
  const mappedOptions: OptionType[] =
    Array.isArray(options) && typeof options[0] === "string"
      ? (options as string[]).map((o) => ({ label: o, value: o }))
      : (options as OptionType[]);

  const selectedOptions = mappedOptions.filter((o) => values.includes(o.value));

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minWidth: 150 }} className="transition-all duration-200 ease-in-out">
      {label && (
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {label}
        </label>
      )}
      <Select
        isMulti
        options={mappedOptions}
        value={selectedOptions}
        onChange={(selected) => onChange((selected as OptionType[]).map((o) => o.value))}
        isSearchable={searchable}
        classNamePrefix="react-select"
        isLoading={isLoading}
        isDisabled={isLoading}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 34,
            borderRadius: 6,
            backgroundColor: isDark ? "#1f2937" : state.isDisabled ? "#f3f4f6" : "#fff",
            borderColor: state.isFocused ? "#3b82f6" : isDark ? "#4b5563" : "#d1d5db",
            boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.3)" : "none",
            fontSize: "0.875rem",
            color: isDark ? "#f9fafb" : "#111827",
            transition: "all 0.2s ease-in-out",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 30,
            backgroundColor: isDark ? "#1f2937" : "#fff",
            color: isDark ? "#f9fafb" : "#111827",
            maxHeight: scrollable ? 180 : undefined,
            overflowY: scrollable ? "auto" : undefined,
            WebkitOverflowScrolling: "touch",
            paddingRight: 0,
          }),
          menuList: (base) => ({
            ...base,
            paddingRight: 0,
            marginRight: 0,
            overflowY: scrollable ? "auto" : undefined,
            maxHeight: scrollable ? 180 : undefined,
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: isDark ? "#334155" : "#e0f2fe",
            borderRadius: 4,
            padding: "2px 6px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.2s ease",
            animation: "fadeIn 0.2s ease-in-out",
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: isDark ? "#bae6fd" : "#0369a1",
            fontSize: "0.8rem",
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: isDark ? "#38bdf8" : "#0284c7",
            cursor: "pointer",
            ":hover": {
              backgroundColor: isDark ? "#1e3a8a" : "#bae6fd",
              color: isDark ? "#e0f2fe" : "#075985",
            },
          }),
          singleValue: (base) => ({
            ...base,
            color: isDark ? "#f9fafb" : "#111827",
            fontSize: "0.875rem",
          }),
        }}
        theme={(theme) => ({
          ...theme,
          borderRadius: 6,
          colors: {
            ...theme.colors,
            primary25: isDark ? "#1e40af" : "#e0f2fe",
            primary: "#3b82f6",
            neutral0: isDark ? "#1f2937" : "#fff",
            neutral5: isDark ? "#374151" : "#f9fafb",
            neutral10: isDark ? "#4b5563" : "#f3f4f6",
            neutral20: isDark ? "#6b7280" : "#d1d5db",
            neutral30: isDark ? "#9ca3af" : "#9ca3af",
            neutral80: isDark ? "#f9fafb" : "#111827",
          },
        })}
      />
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default MultiSelectChips;
