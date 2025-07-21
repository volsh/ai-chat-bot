"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { AppSettings } from "@/types";
import Toggle from "@/components/ui/toggle";
import Input from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import { toast } from "react-hot-toast";
import { useAppStore } from "@/state";

const settingDescriptions: Record<string, string> = {
  enable_invites: "Enable therapist invites",
  default_language: "Default language",
  max_retry_count: "Max retry count for failed invites",
  show_beta_features: "Enable beta features for all users",
};

const booleanKeys = ["enable_invites", "show_beta_features"];
const groupedSettings: Record<string, string[]> = {
  General: ["default_language", "show_beta_features"],
  ['Access Control']: ["enable_invites", "max_retry_count"],
};

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<AppSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("*");
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleValueChange = async (key: string, value: string) => {
    setSavingKey(key);
    const userId = useAppStore.getState().userProfile?.id;
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_by: userId })
      .eq("key", key);

    if (error) toast.error("Failed to save setting");
    else toast.success("Setting saved");

    await load();
    setSavingKey(null);
  };

  const renderInput = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    const value = setting?.value || "";

    if (booleanKeys.includes(key)) {
      return (
        <Toggle
          checked={value === "true"}
          onChange={(checked) => handleValueChange(key, checked.toString())}
        />
      );
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleValueChange(key, e.target.value)}
        className="w-60"
      />
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Admin Settings</h2>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([group, keys]) => (
            <div key={group}>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">{group}</h3>
              <div className="mt-2 space-y-3">
                {keys.map((key) => (
                  <div key={key} className="flex items-center gap-4">
                    <label className="w-60 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {settingDescriptions[key] || key}
                    </label>
                    {savingKey === key ? <Spinner size={10} /> : renderInput(key)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
