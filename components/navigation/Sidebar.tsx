// components/navigation/Sidebar.tsx
import { useAppStore } from "@/state";

export default function Sidebar() {
  const { userProfile } = useAppStore();
  if (!userProfile) return null;

  const role = userProfile.role;

  let links = [{ label: "Me", href: `/profile/${role}` }];

  links = links.concat(
    role === "admin"
      ? [{ label: "Admin", href: "/admin" }]
      : role === "therapist"
        ? [{ label: "Dashboard", href: "/dashboard/therapist" }]
        : [
            { label: "My Treatments", href: "/treatments" },
            { label: "Chat", href: "/chat" },
            { label: "Analytics", href: "/dashboard/user/analytics" },
          ]
  );
  return (
    <aside className="w-64 bg-zinc-100 p-4 dark:bg-zinc-900">
      <nav className="space-y-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block text-sm text-zinc-700 dark:text-zinc-200"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
