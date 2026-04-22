/**
 * Per-section edit state — shape used by every ConfigSection* component.
 * Kept in its own file so archetype files don't pull in the full view.
 */

export interface SectionState<T> {
  values: T;
  dirty: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export function freshSection<T>(values: T): SectionState<T> {
  return { values, dirty: {}, errors: {} };
}

export function isSectionDirty<T>(state: SectionState<T>): boolean {
  return Object.values(state.dirty).some(Boolean);
}

export function countDirty<T>(state: SectionState<T>): number {
  return Object.values(state.dirty).filter(Boolean).length;
}
