// components/layouts/DefaultLayout.tsx
import React from "react";
import { useAppStore } from "@/state";
import Header from "@/components/navigation/Header";
import Sidebar from "@/components/navigation/Sidebar";

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useAppStore();
  return (
    <div className="flex min-h-screen">
      {isSidebarOpen && <Sidebar />}
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
