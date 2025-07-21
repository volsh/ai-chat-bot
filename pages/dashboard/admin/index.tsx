"use client";

import { useEffect, useRef, useState } from "react";
import Tabs from "@/components/ui/tabs";
import InviteTherapistForm from "@/components/admin/InviteTherapistForm";
import InviteLogsList, { InviteLogsListHandle } from "@/components/admin/InviteLogsList";
import UsersList, { UsersListRef } from "@/components/admin/UsersList";
import AdminMetricsDashboard from "@/components/admin/analytics/AdminMetricsDashboard";
import SnapshotList from "@/components/fineTuning/SnapshotList";
import AdminAuditTable from "@/components/admin/AdminAuditTable";
import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import { useAppStore } from "@/state";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { UserProfile } from "@/types";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("invite");
  const logsRef = useRef<InviteLogsListHandle>(null);

  const setActors = useAppStore((s) => s.setActors);

  useEffect(() => {
    const loadActors = async () => {
      const { data, error } = await supabase.from("users").select("id, email, full_name, role");

      if (data) {
        setActors(data as UserProfile[]);
      } else {
        console.warn("Failed to load actors", error);
      }
    };

    loadActors();
  }, [setActors]);

  const tabs = [
    {
      id: "invite",
      title: "Invite Therapists",
      component: (
        <div className="space-y-6">
          <InviteTherapistForm
            onSuccess={() => {
              logsRef.current?.refresh();
            }}
          />
          <InviteLogsList ref={logsRef} />
        </div>
      ),
    },
    {
      id: "users",
      title: "Users",
      component: <UsersList />,
    },
    {
      id: "analytics",
      title: "Analytics",
      component: <AdminMetricsDashboard />,
    },
    {
      id: "training",
      title: "AI Training",
      component: <SnapshotList />,
    },
    {
      id: "logs",
      title: "Logs",
      component: <AdminAuditTable />,
    },
    {
      id: "settings",
      title: "Settings",
      component: <AdminSettingsPanel />,
    },
  ];

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>
      <Tabs
        tabs={tabs.map((tab) => ({ label: tab.title, value: tab.id }))}
        active={activeTab}
        onChange={setActiveTab}
      />
      <div className="mt-6">{tabs.find((tab) => tab.id === activeTab)?.component || null}</div>
    </div>
  );
}
