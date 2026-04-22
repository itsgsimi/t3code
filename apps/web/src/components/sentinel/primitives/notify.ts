import { toastManager } from "~/components/ui/toast";

/**
 * Thin wrapper over the T3 `toastManager` so Sentinel code has a single
 * import for success / error / warning / info / loading notifications.
 *
 * Errors are the most important: they surface asynchronously (mutation
 * onError) and must not vanish with navigation. All helpers forward to the
 * same manager mounted at `src/routes/__root.tsx`.
 */

type NotifyOpts = {
  title: string;
  description?: string | undefined;
};

function add(type: "success" | "error" | "warning" | "info" | "loading", opts: NotifyOpts) {
  toastManager.add({
    type,
    title: opts.title,
    ...(opts.description !== undefined ? { description: opts.description } : {}),
  });
}

export const notify = {
  success(title: string, description?: string) {
    add("success", { title, description });
  },
  error(title: string, description?: string) {
    add("error", { title, description });
  },
  warning(title: string, description?: string) {
    add("warning", { title, description });
  },
  info(title: string, description?: string) {
    add("info", { title, description });
  },
  loading(title: string, description?: string) {
    add("loading", { title, description });
  },
};

export function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
