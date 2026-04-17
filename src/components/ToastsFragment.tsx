// @ts-nocheck
import React from "react";

export default function ToastsFragment({ toasts, onDismiss }: { toasts: any[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border border-neutral-700 bg-neutral-900 p-3 shadow-2xl w-72 flex items-start gap-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{t.title}</div>
            <div className="text-xs text-neutral-400">{t.message}</div>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-neutral-500 hover:text-neutral-200 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}
