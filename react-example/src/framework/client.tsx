import * as React from "react";

import type { Navigation } from "./router/browser";
import { navigate, NavigationContext } from "./router/browser";
export { useServerContext } from "./router/client";

export type { Navigation };

declare global {
  var __navigationContext: React.Context<Navigation>;
}

export function useNavigation() {
  return React.useContext(NavigationContext);
}

const emptySubscribe = () => () => {};

export function useHydrated() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function redirect(to: string) {
  return __startNavigation(to, async (completeNavigation, aborted) => {
    const payload = await navigate(to);
    if (window.location.href !== payload.url.href && !aborted()) {
      window.history.pushState(null, "", payload.url.href);
    }
    completeNavigation(payload);
  });
}
