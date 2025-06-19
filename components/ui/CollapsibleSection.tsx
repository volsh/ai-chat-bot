"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  icon,
  actions,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={clsx("rounded-xl border border-gray-300 p-3", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2 text-left text-sm font-medium text-gray-800">
          {icon && <span className="text-gray-500">{icon}</span>}
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>{title}</span>
        </div>
        {actions && <div className="ml-2 flex items-center gap-2">{actions}</div>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mt-3 space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
