import * as stream from "node:stream";
import type { AdapterRequestContext } from "@hattip/core";
// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/server";

import { App } from "./app";
import { runWithContext } from "./context";

export default async function handler(
  { request }: AdapterRequestContext,
  {
    resolveServerReference,
  }: {
    resolveServerReference: (id: string) => {
      preloadModule(): Promise<void>;
      requireModule(): unknown;
    };
  }
) {
  let toRender: unknown;
  if (request.method === "POST") {
    const actionId = request.headers.get("RSC-Action");
    if (actionId) {
      const serverReference = resolveServerReference(actionId);
      const [serverAction, args] = await Promise.all([
        serverReference
          .preloadModule()
          .then(() => serverReference.requireModule()),
        ReactServerDOM.decodeReply(
          await request.formData(),
          __vite_server_manifest__
        ),
      ]);

      const returnValue = await serverAction(...args);
      toRender = {
        returnValue,
        root: <App />,
      };
    } else {
      const formData = await request.formData();
      const action = await ReactServerDOM.decodeAction(
        formData,
        __vite_server_manifest__
      );
      const returnValue = await action();
      const formState = ReactServerDOM.decodeFormState(returnValue, formData);

      toRender = {
        formState,
        root: <App />,
      };
    }
  } else {
    toRender = { root: <App /> };
  }

  const pipeable = runWithContext({ request }, () =>
    ReactServerDOM.renderToPipeableStream(toRender, __vite_server_manifest__)
  );
  return new Response(
    stream.Readable.toWeb(
      pipeable.pipe(new stream.PassThrough())
    ) as ReadableStream<Uint8Array>,
    {
      headers: {
        "Content-Type": "text/x-component",
        Vary: "Accept",
      },
    }
  );
}
