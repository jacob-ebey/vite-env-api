import * as stream from "node:stream";

import type { AdapterRequestContext } from "@hattip/core";
import * as ReactDOM from "react-dom/server";

import { renderServerResponse } from "framework/router/prerender";

export default async function handler(
  { request }: AdapterRequestContext,
  {
    bootstrapModules,
    bootstrapScripts,
    bootstrapScriptContent,
    callServer,
    cssFiles,
  }: {
    bootstrapModules?: string[];
    bootstrapScripts?: string[];
    bootstrapScriptContent?: string;
    callServer: (request: Request) => Promise<Response>;
    cssFiles?: string[];
  }
) {
  try {
    const serverResponse = await callServer(request);

    return await renderServerResponse(serverResponse, {
      headers: request.headers,
      renderToReadableStream: (element) => {
        const pipeable = ReactDOM.renderToPipeableStream(
          <>
            {cssFiles?.map((href) => (
              <link key={href} rel="stylesheet" href={href} />
            ))}
            {element}
          </>,
          {
            bootstrapModules,
            bootstrapScripts,
            bootstrapScriptContent,
          }
        );

        return stream.Readable.toWeb(
          pipeable.pipe(new stream.PassThrough())
        ) as ReadableStream<Uint8Array>;
      },
    });
  } catch (reason) {
    console.error(reason);
    return new Response("Internal Server Error", { status: 500 });
  }
}
