"use client";

import * as React from "react";

const RouteProviderContext = React.createContext<
  | {
      clientContext?: Record<string, unknown>;
      rendered: Record<string, React.ReactNode>;
    }
  | undefined
>(undefined);

export function RouteProvider({
  children,
  clientContext,
  rendered,
}: {
  children: React.ReactNode;
  clientContext?: Record<string, unknown>;
  rendered: Record<string, React.ReactNode>;
}) {
  return (
    <RouteProviderContext.Provider value={{ clientContext, rendered }}>
      {children}
    </RouteProviderContext.Provider>
  );
}

export function RenderRoute({ id }: { id: string }) {
  const context = React.useContext(RouteProviderContext);
  if (!context) {
    throw new Error("Route must be used inside a RouteProvider");
  }

  return context.rendered[id];
}

type UseServerContextFunction = (<Key extends keyof ServerClientContext>(
  key: Key,
  truthy: true
) => NonNullable<ServerClientContext[Key]>) &
  (<Key extends keyof ServerClientContext>(
    key: Key,
    truthy?: false
  ) => undefined | ServerClientContext[Key]) &
  (<Key extends keyof ServerClientContext>(
    key: Key,
    truthy?: boolean
  ) => undefined | ServerClientContext[Key]);

export const useServerContext: UseServerContextFunction = <
  Key extends keyof ServerClientContext
>(
  key: Key,
  truthy = false
) => {
  const context = React.useContext(RouteProviderContext);
  if (!context) {
    throw new Error("useServerContext must be used inside a RouteProvider");
  }

  const value = context.clientContext?.[key];
  if (truthy && !value) {
    throw new Error(`Server context value ${key} is missing`);
  }

  return value as NonNullable<ServerContext[Key]>;
};
