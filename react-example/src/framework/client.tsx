import * as React from "react";

declare global {
  var __navigationContext: React.Context<Navigation>;
}

export type Navigation =
  | {
      pending: true;
      href: string;
    }
  | { pending: false };

export const NavigationContext = React.createContext<Navigation>({
  pending: false,
});

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
