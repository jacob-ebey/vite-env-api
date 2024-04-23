"use client";

import * as React from "react";

const RouteProviderContext = React.createContext<
  Record<string, React.ReactNode> | undefined
>(undefined);

export function RouteProvider({
  children,
  rendered,
}: {
  children: React.ReactNode;
  rendered: Record<string, React.ReactNode>;
}) {
  return (
    <RouteProviderContext.Provider value={rendered}>
      {children}
    </RouteProviderContext.Provider>
  );
}

export function RenderRoute({ id }: { id: string }) {
  const rendered = React.useContext(RouteProviderContext);
  if (!rendered) {
    throw new Error("Route must be used inside a RouteProvider");
  }

  return rendered[id];
}
