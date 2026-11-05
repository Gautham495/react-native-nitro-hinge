import type { ChangeSubscription, Hinge, HingeState } from './Hinge.nitro';

export type HingeSource = Pick<Hinge, 'getState' | 'addChangeListener'>;

export interface HingeStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => HingeState;
}

/**
 * Shares one native listener among all subscribers. A new snapshot reuses
 * the previous reference for every field whose value didn't change, so
 * selectors compared with `Object.is` stay stable.
 */
export function createHingeStore(source: HingeSource): HingeStore {
  const listeners = new Set<() => void>();
  let snapshot: HingeState | undefined;
  let native: ChangeSubscription | undefined;

  const update = (next: HingeState): boolean => {
    const shared = snapshot ? shareUnchanged(snapshot, next) : next;
    if (shared === snapshot) return false;
    snapshot = shared;
    return true;
  };

  const notify = () => {
    for (const listener of Array.from(listeners)) listener();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (native === undefined) {
        native = source.addChangeListener((next) => {
          if (update(next)) notify();
        });
        // Catch up on changes made while nothing was subscribed.
        if (update(source.getState())) notify();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && native !== undefined) {
          native.remove();
          native = undefined;
        }
      };
    },
    getSnapshot() {
      if (native !== undefined && snapshot !== undefined) return snapshot;
      const next = source.getState();
      snapshot = snapshot ? shareUnchanged(snapshot, next) : next;
      return snapshot;
    },
  };
}

function shareUnchanged(prev: HingeState, next: HingeState): HingeState {
  let changed = false;
  const shared = { ...next };
  const keep = <K extends keyof HingeState>(key: K) => {
    shared[key] = prev[key];
  };
  for (const key of Object.keys(next) as (keyof HingeState)[]) {
    if (deepEqual(prev[key], next[key])) keep(key);
    else changed = true;
  }
  if (!changed && Object.keys(prev).length === Object.keys(next).length) {
    return prev;
  }
  return shared;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
  );
}
