import * as stream from "node:stream";
import type * as streamWeb from "node:stream/web";

import type { AdapterRequestContext } from "@hattip/core";
// @ts-expect-error - no types
import RSD from "react-server-dom-diy/client";
import * as HTML from "react-dom/server";
import { injectRSCPayload } from "rsc-html-stream/server";

export default async function handler(
  { request }: AdapterRequestContext,
  {
    bootstrapModules,
    bootstrapScripts,
    bootstrapScriptContent,
    callServer,
  }: {
    bootstrapModules?: string[];
    bootstrapScripts?: string[];
    bootstrapScriptContent?: string;
    callServer: (request: Request) => Promise<Response>;
  }
) {
  const response = await callServer(request);
  if (!response.body) throw new Error("No body");

  if (request.headers.get("RSC-Refresh") === "1") {
    return response;
  }

  const [bodyA, bodyB] = response.body.tee();
  const payload = await RSD.createFromNodeStream(
    stream.Readable.fromWeb(bodyA as streamWeb.ReadableStream<Uint8Array>),
    __vite_client_manifest__
  );

  const pipeable = HTML.renderToPipeableStream(payload.root, {
    bootstrapModules,
    bootstrapScripts,
    bootstrapScriptContent,
  });
  const html = (
    stream.Readable.toWeb(
      pipeable.pipe(new stream.PassThrough())
    ) as ReadableStream<Uint8Array>
  ).pipeThrough(injectRSCPayload(bodyB));

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      Vary: "Accept",
    },
  });
}
