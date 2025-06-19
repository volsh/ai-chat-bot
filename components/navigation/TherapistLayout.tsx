// components/navigation/TherapistLayout.tsx

import { useAppStore } from "@/state";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function TherapistLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useAppStore();
  return (
    <div className="min-h-screen bg-gray-50 text-white dark:bg-black">
      {isSidebarOpen && <Sidebar />}
      <Header text="Therapist Panel"></Header>
      <main className="p-6">{children}</main>
    </div>
  );
}
