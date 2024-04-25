"use client";

import * as React from "react";

import { redirect } from "framework/client";

export function ClientRedirect({ to }: { to: string }) {
  const ref = React.useRef(false);
  const [redirectTo, setRedirectTo] = React.useState<string>(to);
  if (to !== redirectTo) {
    setRedirectTo(to);
  }

  React.useEffect(() => {
    if (!ref.current) {
      ref.current = true;
      redirect(redirectTo);
    }
  }, [redirectTo]);

  return null;
}
