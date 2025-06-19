// components/ui/card.tsx
import React from "react";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border bg-white p-4 shadow dark:bg-zinc-900 ${className}`}>
    {children}
  </div>
);

export default Card;
