"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { ArrowDown, ArrowUp } from "lucide-react";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  role: string;
}

export interface UsersListRef {
  refresh: () => void;
}

const roles = [
  { label: "All Roles", value: "all" },
  { label: "Therapist", value: "therapist" },
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
];

const UsersList = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof UserRow>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const load = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("users")
      .select("id, full_name, email, created_at, role", { count: "exact" })
      .order(sortBy, { ascending: sortAsc })
      .range(from, to);

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    if (search.trim()) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setUsers(data || []);
    setTotalPages(Math.ceil((count || 0) / pageSize));
  };

  useEffect(() => {
    load();
  }, [search, roleFilter, sortBy, sortAsc, page]);

  const handleSort = (key: keyof UserRow) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
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
      <h2 className="text-xl font-bold">Users</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
          options={roles}
        />
      </div>

      <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
        <thead>
          <tr className="text-left text-sm font-semibold text-zinc-700 dark:text-white">
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("full_name")}>
              Name <SortIcon active={sortBy === "full_name"} />
            </th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("email")}>
              Email <SortIcon active={sortBy === "email"} />
            </th>
            <th className="px-4 py-2">Role</th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("created_at")}>
              Joined At <SortIcon active={sortBy === "created_at"} />
            </th>
          </tr>
        </thead>
        <tbody className="text-sm text-zinc-800 dark:text-zinc-200">
          {users.map((u) => (
            <tr key={u.id} className="border-b dark:border-zinc-700">
              <td className="px-4 py-2">{u.full_name || "—"}</td>
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2 capitalize">{u.role}</td>
              <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between pt-4 text-sm text-gray-600 dark:text-gray-300">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded bg-zinc-200 px-3 py-1 disabled:opacity-50 dark:bg-zinc-700"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded bg-zinc-200 px-3 py-1 disabled:opacity-50 dark:bg-zinc-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersList;
