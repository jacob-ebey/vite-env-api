// @ts-expect-error - no types
import RSD from "react-server-dom-diy/client";
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { rscStream } from "rsc-html-stream/client";

hydrate();

async function callServer(id: string, args: unknown[]) {
  const responsePromise = fetch(window.location.href, {
    method: "POST",
    headers: {
      Accept: "text/x-component",
      "rsc-action": id,
    },
    body: await RSD.encodeReply(args),
  });

  const { returnValue, root } = await RSD.createFromFetch(responsePromise, {
    callServer,
  });

  React.startTransition(() => {
    updateRoot(root);
  });
  return returnValue;
}

let updateRoot: (root: React.ReactNode) => void;
function Root({ initialRoot }: { initialRoot: React.ReactNode }) {
  const [root, setRoot] = React.useState(initialRoot);
  updateRoot = setRoot;
  return root;
}

async function hydrate() {
  const payload = await RSD.createFromReadableStream(rscStream, {
    ...__vite_client_manifest__,
    callServer,
  });
  React.startTransition(() => {
    hydrateRoot(document, <Root initialRoot={payload.root} />);
  });
}
