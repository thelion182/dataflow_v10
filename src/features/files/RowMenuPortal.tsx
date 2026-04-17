// @ts-nocheck
import React from "react";
import { createPortal } from "react-dom";

export function RowMenuPortal({
  anchorRect,
  onClose,
  children,
  width = 256,
}: {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const margin = 8;
  const top = Math.round(anchorRect.bottom + 8);
  const left = Math.round(Math.min(Math.max(margin, anchorRect.right - width), window.innerWidth - width - margin));
  const maxH = Math.max(140, window.innerHeight - top - margin);

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div style={{ position: "fixed", top, left, width, zIndex: 9999, pointerEvents: "auto" }}>
      <div
        ref={menuRef}
        className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-2"
        style={{ maxHeight: maxH, overflowY: "auto" }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
