// @ts-nocheck
import React from "react";
import { cls } from "../lib/cls";

export function Menu({
  button,
  align = "right", // "left" | "right"
  children,
}: {
  button: React.ReactNode;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
      >
        {button}
      </button>
      {open && (
        <div
          className={cls(
            "absolute z-50 mt-2 min-w-[220px] rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cls(
        "w-full text-left px-3 py-2 rounded-lg text-sm",
        disabled
          ? "text-neutral-500 cursor-not-allowed"
          : "hover:bg-neutral-800",
        danger ? "text-red-300 hover:bg-red-900/30" : "text-neutral-200"
      )}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-neutral-800" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-neutral-500">
      {children}
    </div>
  );
}