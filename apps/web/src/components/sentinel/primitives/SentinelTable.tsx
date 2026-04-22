import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export type SentinelColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: string | number;
  align?: "left" | "right" | "center";
};

export type SentinelTableProps<T> = {
  columns: readonly SentinelColumn<T>[];
  rows: readonly T[];
  loading?: boolean;
  filter?: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    /** Returns true if row matches the filter. Required when filter is set. */
    match: (row: T, query: string) => boolean;
  };
  onRefresh?: () => void;
  refreshing?: boolean;
  pageSize?: number;
  /** Shown when rows.length === 0 and filter.value is empty. */
  emptyState?: ReactNode;
  /** Shown when filtered rows are empty but data exists. */
  noResultsState?: ReactNode;
  rowKey: (row: T) => string;
  /** Optional row click handler. */
  onRowClick?: (row: T) => void;
  /** Row CSS when selected. */
  isRowSelected?: (row: T) => boolean;
};

/**
 * Sentinel table with filter + pagination + loading skeleton. T3 UI kit
 * ships no `ui/table.tsx`, so Sentinel owns this one. Uses T3 Skeleton
 * for the loading state and T3 Button for page controls.
 */
export function SentinelTable<T>({
  columns,
  rows,
  loading,
  filter,
  onRefresh,
  refreshing,
  pageSize = 50,
  emptyState,
  noResultsState,
  rowKey,
  onRowClick,
  isRowSelected,
}: SentinelTableProps<T>) {
  const filtered = useMemo(() => {
    if (!filter || filter.value.trim() === "") return rows;
    const q = filter.value.trim().toLowerCase();
    return rows.filter((row) => filter.match(row, q));
  }, [rows, filter]);

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {(filter || onRefresh) && (
        <div className="flex items-center gap-2">
          {filter ? (
            <div
              className="flex items-center gap-2"
              style={{
                background: "var(--canvas-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: 6,
                padding: "4px 8px",
                flex: 1,
                maxWidth: 320,
              }}
            >
              <Search size={13} color="var(--fg-3)" />
              <input
                type="text"
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                placeholder={filter.placeholder ?? "Filter…"}
                style={{
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  color: "var(--fg-1)",
                  fontSize: 12.5,
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          ) : null}
          <div className="flex-1" />
          {onRefresh ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
            </Button>
          ) : null}
        </div>
      )}

      <div
        style={{
          background: "var(--canvas-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12.5,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--canvas-2)",
                borderBottom: "1px solid var(--border-soft)",
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: col.align ?? "left",
                    padding: "8px 12px",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--fg-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontWeight: 500,
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(5, pageSize) }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "10px 12px",
                        borderTop: i === 0 ? 0 : "1px solid var(--border-soft)",
                      }}
                    >
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: "24px 12px", textAlign: "center", color: "var(--fg-3)" }}
                >
                  {filter && filter.value.trim() !== ""
                    ? (noResultsState ?? <span>No results for "{filter.value}".</span>)
                    : (emptyState ?? <span>No data yet.</span>)}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => {
                const selected = isRowSelected?.(row) ?? false;
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={{
                      borderTop: i === 0 ? 0 : "1px solid var(--border-soft)",
                      background: selected ? "var(--canvas-3)" : undefined,
                      cursor: onRowClick ? "pointer" : undefined,
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "10px 12px",
                          textAlign: col.align ?? "left",
                          color: "var(--fg-1)",
                          verticalAlign: "top",
                        }}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > pageSize ? (
        <div className="flex items-center gap-2" style={{ fontSize: 11.5 }}>
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", minWidth: 60, textAlign: "center" }}>
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
