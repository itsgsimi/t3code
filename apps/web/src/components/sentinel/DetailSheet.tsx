import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { useBeardyDrawerStore } from "../../sentinel/beardyDrawerStore";

/**
 * DetailSheet — right-side panel that takes the same slot as the Beardy
 * drawer. Mutually exclusive: Beardy auto-hides while a DetailSheet is
 * open, restoring when it closes (unless the user manually closed Beardy).
 *
 * Pages use a simple pattern:
 *   const [selected, setSelected] = useState<T | null>(null);
 *   ...
 *   <DetailSheet open={!!selected} onClose={() => setSelected(null)} title="…">
 *     {selected ? <SelectedDetail item={selected} /> : null}
 *   </DetailSheet>
 *
 * Esc closes the sheet. Close button receives focus on open; previously
 * focused element is restored on close. Pass `persist` to sync the sheet
 * id into the URL via `?sheet=<key>:<value>` for bookmark/share.
 */
export function DetailSheet({
  open,
  title,
  eyebrow,
  onClose,
  children,
  width = 440,
  footer,
  persist,
}: {
  open: boolean;
  title: string;
  eyebrow?: string | undefined;
  onClose: () => void;
  children: ReactNode;
  width?: number | undefined;
  footer?: ReactNode | undefined;
  persist?: { key: string; value: string | null };
}) {
  const setDetailOpen = useBeardyDrawerStore((s) => s.setDetailSheetOpen);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setDetailOpen(open);
    return () => {
      setDetailOpen(false);
    };
  }, [open, setDetailOpen]);

  // Focus management: remember trigger element, focus close button, restore.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // URL persistence via ?sheet=<key>:<value>.
  useDetailSheetUrlPersist(persist);

  if (!open) return null;

  return (
    <aside
      aria-label={title}
      role="dialog"
      aria-modal="false"
      className="flex h-full shrink-0 flex-col"
      style={{
        width,
        background: "var(--canvas-1)",
        borderLeft: "1px solid var(--border-soft)",
      }}
    >
      <header
        className="flex shrink-0 items-center gap-3"
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex min-w-0 flex-col">
          {eyebrow ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {eyebrow}
            </span>
          ) : null}
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--fg-1)",
              margin: 0,
              lineHeight: 1.25,
              wordBreak: "break-all",
            }}
          >
            {title}
          </h2>
        </div>
        <div className="flex-1" />
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="cursor-pointer border-0 bg-transparent p-1"
          style={{ color: "var(--fg-3)" }}
        >
          <X size={16} />
        </button>
      </header>
      <div
        className="flex-1 overflow-auto"
        style={{ padding: 16 }}
      >
        {children}
      </div>
      {footer ? (
        <footer
          className="shrink-0"
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          {footer}
        </footer>
      ) : null}
    </aside>
  );
}

/**
 * URL persistence via `?sheet=<key>:<value>`. Bypasses TanStack Router
 * so we don't have to teach every route schema about this param. Reads
 * and writes through the browser History API directly.
 */
function useDetailSheetUrlPersist(persist: { key: string; value: string | null } | undefined) {
  useEffect(() => {
    if (!persist) return;
    const desired = persist.value ? `${persist.key}:${persist.value}` : null;
    const url = new URL(window.location.href);
    const current = url.searchParams.get("sheet");
    if (current === desired) return;
    if (desired === null) {
      url.searchParams.delete("sheet");
    } else {
      url.searchParams.set("sheet", desired);
    }
    window.history.replaceState(window.history.state, "", url.toString());
  }, [persist]);
}

/**
 * Read the current `?sheet=<key>:<value>` and return the value for this
 * key, or null if not present. Use at the view level to reopen a sheet
 * on mount / deep-link. Listens to popstate so back/forward updates UI.
 */
export function useDetailSheetParam(key: string): string | null {
  const [raw, setRaw] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URL(window.location.href).searchParams.get("sheet");
  });

  useEffect(() => {
    const onPop = () => {
      setRaw(new URL(window.location.href).searchParams.get("sheet"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!raw) return null;
  const [k, v] = raw.split(":", 2);
  return k === key && v ? v : null;
}
