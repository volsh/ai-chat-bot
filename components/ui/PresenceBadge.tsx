import React from "react";
import clsx from "clsx";

interface Props {
  name: string;
  activity?: string;
  avatar?: string;
  status?: "online" | "offline";
}

export default function PresenceBadge({ name, activity, avatar, status = "online" }: Props) {
  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img src={avatar} className="h-5 w-5 rounded-full" alt="avatar" />
      ) : (
        <div className="h-5 w-5 rounded-full bg-gray-400" />
      )}
      <span className="flex items-center gap-1">
        {status === "online" && <span className="h-2 w-2 rounded-full bg-green-500" />}
        <strong>{name}</strong>
        {activity && <span className="text-xs text-gray-500">– {activity}</span>}
      </span>
    </div>
  );
}
