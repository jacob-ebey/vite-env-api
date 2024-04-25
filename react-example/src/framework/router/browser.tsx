import * as React from "react";
// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/client";

import { setGlobal } from "../shared";

import type { ServerPayload } from "./server";

import { RenderRoute, RouteProvider } from "./client";

type StartNavigation = (
  location: string,
  callback: (
    completeNavigation: (payload: ServerPayload) => void,
    aborted: () => boolean
  ) => Promise<void>
) => Promise<void>;

declare global {
  var __startNavigation: StartNavigation;
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

// let navigationId = 0;
// let setPayloadURL: (url: { href: string }) => void;
// let updatePayload: (payload: ServerPayload) => void;
let startNavigation: StartNavigation;

export async function getInitialPayload() {
  const { rscStream } = await import("rsc-html-stream/client");
  return ReactServerDOM.createFromReadableStream(rscStream, {
    ...__vite_client_manifest__,
    callServer,
  }) as Promise<ServerPayload>;
}

async function callServer(id: string, args: unknown[]) {
  let revalidateHeader: string | null = null;
  if (typeof args[0] === "object" && args[0] instanceof FormData) {
    const revalidate = args[0].get("RSC-Revalidate");
    if (revalidate) {
      let invalid = false;
      if (revalidate !== "no") {
        try {
          if (
            typeof revalidate === "object" ||
            !Array.isArray(JSON.parse(String(revalidate)))
          ) {
            invalid = true;
          }
        } catch {
          invalid = true;
        }
      }
      if (invalid) {
        throw new Error("Invalid RSC-Revalidate input value");
      }
      revalidateHeader = String(revalidate);
    }
  }
  // const callId = ++navigationId;
  const href = window.location.href;
  const headers = new Headers({
    Accept: "text/x-component",
    "rsc-action": id,
  });
  if (revalidateHeader) {
    headers.set("RSC-Revalidate", revalidateHeader);
  }
  const responsePromise = fetch(window.location.href, {
    method: "POST",
    headers,
    body: await ReactServerDOM.encodeReply(args),
  });

  const payloadPromise = Promise.resolve<ServerPayload>(
    ReactServerDOM.createFromFetch(responsePromise, {
      ...__vite_client_manifest__,
      callServer,
    })
  );

  if (revalidateHeader !== "no") {
    startNavigation(href, async (completeNavigation, aborted) => {
      let payload = await payloadPromise;
      if (payload.redirect) {
        payload = await navigate(payload.redirect);
      }
      if (window.location.href !== payload.url.href && !aborted()) {
        window.history.pushState(null, "", payload.url.href);
      }
      completeNavigation(payload);
    });
  }

  const payload = await payloadPromise;
  return payload.returnValue;
}

export async function navigate(to: string): Promise<ServerPayload> {
  const url = new URL(to, window.location.href);
  const responsePromise = fetch(url, {
    headers: {
      Accept: "text/x-component",
      "RSC-Refresh": "1",
    },
  });

  const payload = (await ReactServerDOM.createFromFetch(responsePromise, {
    ...__vite_client_manifest__,
    callServer,
  })) as ServerPayload;

  if (payload.redirect) {
    return navigate(payload.redirect);
  }

  return payload;
}

export function BrowserRouter({
  initialPayload,
}: {
  initialPayload: ServerPayload;
}) {
  const navigationStateRef = React.useRef({
    id: 0,
  });
  const [isPending, startTransition] = React.useTransition();
  const [pendingState, setPendingState] = React.useState<null | {
    id: number;
    location: string;
  }>(null);
  const [state, setState] = React.useState({
    id: 0,
    payload: initialPayload,
  });
  const deferredState = React.useDeferredValue(state);

  startNavigation = React.useCallback<StartNavigation>(
    async (location, callback) => {
      navigationStateRef.current.id++;
      const id = navigationStateRef.current.id;
      setPendingState({ id, location });
      await callback(
        (payload) => {
          if (id < navigationStateRef.current.id) {
            return;
          }
          startTransition(() => {
            setState({
              id,
              payload,
            });
          });
        },
        () => id < navigationStateRef.current.id
      );
    },
    []
  );
  setGlobal("__startNavigation", startNavigation);

  const navigation: Navigation =
    pendingState && pendingState.id > state.id
      ? {
          href: pendingState.location,
          pending: true,
        }
      : isPending
      ? {
          href: deferredState.payload.url.href,
          pending: true,
        }
      : {
          pending: false,
        };

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();

      const to = window.location.href;

      startNavigation(to, async (completeNavigation, aborted) => {
        const payload = await navigate(to);
        if (window.location.href !== payload.url.href && !aborted()) {
          window.history.replaceState(null, "", payload.url.href);
        }
        completeNavigation(payload);
      });
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      let target = event.target as HTMLElement | null;
      while (target && target.nodeName !== "A") {
        target = target.parentElement;
      }

      if (!target) return;

      const anchor = target as HTMLAnchorElement;
      if (anchor.target || anchor.hasAttribute("download")) return;

      const href = anchor.href;
      // if it's not a location on the same domain
      if (!href || href.indexOf(window.location.origin) !== 0) return;

      event.preventDefault();
      startNavigation(href, async (completeNavigation, aborted) => {
        const payload = await navigate(href);
        if (window.location.href !== payload.url.href && !aborted()) {
          window.history.pushState(null, "", payload.url.href);
        }
        completeNavigation(payload);
      });
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("click", handleLinkClick);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("click", handleLinkClick);
    };
  }, []);

  if (!state.payload.tree) {
    throw new Error("No elements rendered on the server");
  }

  return (
    <NavigationContext.Provider value={navigation}>
      <RouteProvider
        clientContext={state.payload.clientContext}
        rendered={state.payload.tree.rendered}
      >
        <RenderRoute id={state.payload.tree.matched[0]} />
      </RouteProvider>
    </NavigationContext.Provider>
  );
}

if (import.meta.hot) {
  // TODO: figure out what's causing full page reloads on server updates
  import.meta.hot.on("react-server:update", async (payload) => {
    startNavigation(window.location.href, async (completeNavigation) => {
      const responsePromise = fetch(window.location.href, {
        headers: {
          Accept: "text/x-component",
          "RSC-Refresh": "1",
        },
      });

      let payload = (await ReactServerDOM.createFromFetch(responsePromise, {
        ...__vite_client_manifest__,
        callServer,
      })) as ServerPayload;
      if (payload.redirect) {
        payload = await navigate(payload.redirect);
      }

      completeNavigation(payload);
    });
  });
}
