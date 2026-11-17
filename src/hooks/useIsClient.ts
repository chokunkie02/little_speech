import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during server render and hydration, true afterwards — without a setState-in-effect re-render. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
