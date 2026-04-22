import { create } from "zustand";

interface BeardyDrawerState {
  open: boolean;
  /** User manually toggled while in Sessions — don't auto-restore when they leave. */
  userPinnedClosed: boolean;
  /** True when a page-level detail sheet is open in the right slot. Beardy
   *  renders only when false so the two don't collide. */
  detailSheetOpen: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  setAutoCollapsed: (collapsed: boolean) => void;
  setDetailSheetOpen: (next: boolean) => void;
}

export const useBeardyDrawerStore = create<BeardyDrawerState>((set) => ({
  open: true,
  userPinnedClosed: false,
  detailSheetOpen: false,
  setOpen: (next) =>
    set({
      open: next,
      userPinnedClosed: !next,
    }),
  toggle: () =>
    set((state) => ({
      open: !state.open,
      userPinnedClosed: state.open,
    })),
  setAutoCollapsed: (collapsed) =>
    set((state) => {
      if (collapsed) {
        return state.userPinnedClosed ? state : { ...state, open: false };
      }
      return state.userPinnedClosed ? state : { ...state, open: true };
    }),
  setDetailSheetOpen: (next) => set({ detailSheetOpen: next }),
}));
