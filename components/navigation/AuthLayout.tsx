// components/navigation/AuthLayout.tsx

import { useAppStore } from "@/state";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useAppStore();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      {isSidebarOpen && <Sidebar />}
      <div className="w-full max-w-md rounded bg-white p-4 shadow-md dark:bg-zinc-800">
        <Header />
        {children}
      </div>
    </div>
  );
}
