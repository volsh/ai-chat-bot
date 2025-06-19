import { useAppStore } from "@/state";
import Sidebar from "./Sidebar";
import Header from "./Header";

// components/navigation/UserLayout.tsx
export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useAppStore();

  return (
    <div className="relative min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-white">
      <Header text="User App" />
      {isSidebarOpen && (
        <div className="absolute top-15 left-0">
          <Sidebar />
        </div>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}
