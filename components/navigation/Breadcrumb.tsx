"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function formatSegment(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
      <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        return (
          <span key={href}>
            {" / "}
            {isLast ? (
              <span>{formatSegment(seg)}</span>
            ) : (
              <Link href={href} className="text-blue-600 hover:underline dark:text-blue-400">
                {formatSegment(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
