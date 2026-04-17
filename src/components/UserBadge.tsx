// @ts-nocheck
import React from "react";

export default function UserBadge({ user }: { user: any }) {
  if (!user) return null;
  return (
    <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-xs text-neutral-300">
      {user.displayName || user.username}
    </span>
  );
}
