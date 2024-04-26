import * as stream from "node:stream";
import type * as streamWeb from "node:stream/web";

// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/client";
import { injectRSCPayload } from "rsc-html-stream/server";

import { RenderRoute, RouteProvider } from "./client";
import type { ServerPayload } from "./server";

export const REDIRECT_SYMBOL = Symbol("context.redirect");

export async function renderServerResponse(
	response: Response,
	{
		requestHeaders: headers,
		renderToReadableStream,
	}: {
		requestHeaders: Headers;
		renderToReadableStream: (
			node: React.ReactNode,
			headers: Headers,
		) => Promise<ReadableStream>;
	},
) {
	if (!response.body) throw new Error("No body");

	if (headers.get("RSC-Refresh") === "1" || headers.get("Rsc-Action")) {
		return response;
	}

	const [bodyA, bodyB] = response.body.tee();
	const payload = (await ReactServerDOM.createFromNodeStream(
		stream.Readable.fromWeb(bodyA as streamWeb.ReadableStream<Uint8Array>),
		__vite_client_manifest__,
	)) as ServerPayload;

	if (payload.redirect) {
		const responseHeaders = new Headers(response.headers);
		responseHeaders.set("Location", payload.redirect);

		return new Response(payload.redirect, {
			status: 302,
			headers: responseHeaders,
		});
	}

	if (!payload.tree) {
		throw new Error("No elements rendered on the server");
	}

	const responseHeaders = new Headers({
		"Content-Type": "text/html",
		Vary: "Accept",
	});
	const html = (
		await renderToReadableStream(
			<RouteProvider
				clientContext={payload.clientContext}
				rendered={payload.tree.rendered}
			>
				<RenderRoute id={payload.tree.matched[0]} />
			</RouteProvider>,
			headers,
		)
	).pipeThrough(injectRSCPayload(bodyB));

	return new Response(html, {
		headers: responseHeaders,
	});
}
