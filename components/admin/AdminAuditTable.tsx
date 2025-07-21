"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { format } from "date-fns";
import { AdminAuditLog } from "@/types/AdminAuditLog";
import { ArrowDown, ArrowUp, RefreshCcw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import Select from "@/components/ui/select";
import DateRangePicker from "@/components/ui/dateRangePicker";
import PaginationControls from "@/components/ui/PaginationControls";
import { useAppStore } from "@/state";

export type AdminAuditTableHandle = {
  refresh: () => void;
};

const DEFAULT_PAGE_SIZE = 20;

const AdminAuditTable = forwardRef<AdminAuditTableHandle, {}>((_, ref) => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof AdminAuditLog>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    actor: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  const actors = useAppStore(useShallow((s) => s.actors || []));

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action))).map((action) => ({
      label: action,
      value: action,
    }));
  }, [logs]);

  const load = useMemo(
    () => async () => {
      setRefreshing(true);

      let query = supabase.from("admin_audit_logs").select("*", {
        count: "exact",
      });

      if (filters.actor) query = query.eq("actor", filters.actor);
      if (filters.action) query = query.eq("action", filters.action);
      if (filters.startDate)
        query = query.gte("created_at", new Date(filters.startDate).toISOString());
      if (filters.endDate) query = query.lte("created_at", new Date(filters.endDate).toISOString());

      query = query.order(sortBy, { ascending: sortAsc });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count } = await query;
      setLogs(data || []);
      setTotalCount(count || 0);
      setRefreshing(false);
    },
    [filters, sortBy, sortAsc, page, pageSize]
  );

  useEffect(() => {
    setLoading(true);
    load()?.finally(() => setLoading(false));
  }, [load]);

  useImperativeHandle(ref, () => ({
    refresh: () => load(),
  }));

  const handleSort = (key: keyof AdminAuditLog) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
    setPage(1); // Reset page on sort change
  };

  const SortIcon = ({ active }: { active: boolean }) =>
    active ? (
      sortAsc ? (
        <ArrowUp className="inline h-4 w-4" />
      ) : (
        <ArrowDown className="inline h-4 w-4" />
      )
    ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
        <Select
          label="Actor"
          options={[
            { label: "All", value: "" },
            ...actors.map((u) => ({
              label: u.email || u.full_name || u.id,
              value: u.id,
            })),
          ]}
          value={filters.actor}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, actor: e.target.value }));
          }}
        />
        <Select
          label="Action"
          options={[{ label: "All", value: "" }, ...actions]}
          value={filters.action}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, action: e.target.value }));
          }}
        />
        <DateRangePicker
          value={{ from: filters.startDate, to: filters.endDate }}
          onChange={({ from, to }) => {
            setPage(1);
            setFilters((f) => ({ ...f, startDate: from, endDate: to }));
          }}
        />
        {refreshing && <RefreshCcw className="ml-2 mt-6 h-4 w-4 animate-spin" />}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300 text-sm dark:divide-zinc-700">
          <thead>
            <tr className="text-left font-semibold text-zinc-700 dark:text-white">
              <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("created_at")}>
                Timestamp <SortIcon active={sortBy === "created_at"} />
              </th>
              <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("actor")}>
                Actor <SortIcon active={sortBy === "actor"} />
              </th>
              <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("action")}>
                Action <SortIcon active={sortBy === "action"} />
              </th>
              <th className="px-4 py-2">Details</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-zinc-800 dark:divide-zinc-800 dark:text-zinc-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-2">
                  {format(new Date(log.created_at), "yyyy-MM-dd HH:mm")}
                </td>
                <td className="px-4 py-2">{log.actor}</td>
                <td className="px-4 py-2 font-semibold">{log.action}</td>
                <td className="whitespace-pre-wrap px-4 py-2">{log.details}</td>
                <td className="px-4 py-2">{log.note ? <span title={log.note}>📝</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
});

AdminAuditTable.displayName = "AdminAuditTable";
export default AdminAuditTable;
