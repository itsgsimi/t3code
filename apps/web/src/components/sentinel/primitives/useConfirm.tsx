import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type PendingState = {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

/**
 * Imperative confirm dialog. Wire `<ConfirmProvider>` near the root, then
 * call `const confirm = useConfirm();` and `await confirm({...})`.
 *
 * Single dialog instance is mounted; the provider serializes calls by
 * queueing. Typical flow:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete X?", destructive: true })) {
 *     mutation.mutate();
 *   }
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const queueRef = useRef<PendingState[]>([]);

  const runNext = useCallback(() => {
    const next = queueRef.current.shift();
    setPending(next ?? null);
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        const entry: PendingState = { opts, resolve };
        if (pending === null) {
          setPending(entry);
        } else {
          queueRef.current.push(entry);
        }
      }),
    [pending],
  );

  const handleClose = useCallback(
    (ok: boolean) => {
      if (pending) {
        pending.resolve(ok);
      }
      runNext();
    },
    [pending, runNext],
  );

  const value = useMemo(() => confirm, [confirm]);

  const opts = pending?.opts;
  const destructive = opts?.destructive ?? false;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) handleClose(false);
        }}
      >
        {opts ? (
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>{opts.title}</AlertDialogTitle>
              {opts.body ? <AlertDialogDescription>{opts.body}</AlertDialogDescription> : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {opts.cancelLabel ?? "Cancel"}
              </AlertDialogClose>
              <Button
                variant={destructive ? "destructive" : "default"}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {opts.confirmLabel ?? (destructive ? "Delete" : "Confirm")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        ) : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}
