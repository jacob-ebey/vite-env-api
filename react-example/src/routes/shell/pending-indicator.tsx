"use client";

import { useNavigation } from "framework/client";

export function PendingIndicator() {
  const navigation = useNavigation();

  if (!navigation.pending) {
    return null;
  }

  return <progress className="fixed z-50 top-0 left-0 right-0 progress h-1" />;
}
