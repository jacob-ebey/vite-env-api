import * as stream from "node:stream";
import type * as streamWeb from "node:stream/web";

// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/client";
import { injectRSCPayload } from "rsc-html-stream/server";

import { RenderRoute, RouteProvider } from "./client";
import type { ServerPayload } from "./server";

export async function renderServerResponse(
  response: Response,
  {
    headers,
    renderToReadableStream,
  }: {
    headers: Headers;
    renderToReadableStream: (node: React.ReactNode) => ReadableStream;
  }
) {
  if (!response.body) throw new Error("No body");

  if (headers.get("RSC-Refresh") === "1" || headers.get("Rsc-Action")) {
    return response;
  }

  const [bodyA, bodyB] = response.body.tee();
  const payload = (await ReactServerDOM.createFromNodeStream(
    stream.Readable.fromWeb(bodyA as streamWeb.ReadableStream<Uint8Array>),
    __vite_client_manifest__
  )) as ServerPayload;

  if (payload.redirect) {
    return new Response(payload.redirect, {
      status: 302,
      headers: {
        Location: payload.redirect,
      },
    });
  }

  if (!payload.tree) {
    throw new Error("No elements rendered on the server");
  }

  const html = renderToReadableStream(
    <RouteProvider rendered={payload.tree.rendered}>
      <RenderRoute id={payload.tree.matched[0]} />
    </RouteProvider>
  ).pipeThrough(injectRSCPayload(bodyB));

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      Vary: "Accept",
    },
  });
}
