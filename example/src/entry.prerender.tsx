import * as stream from "node:stream";

import * as ReactDOM from "react-dom/server";

import { createHandler, renderServerResponse } from "framework/prerender";

export default createHandler(
	async (
		{ request },
		{
			bootstrapModules,
			bootstrapScripts,
			bootstrapScriptContent,
			callServer,
			cssFiles,
		},
	) => {
		try {
			const serverResponse = await callServer(request);

			return await renderServerResponse(serverResponse, {
				requestHeaders: request.headers,
				renderToReadableStream: async (element, headers) => {
					const bytes = crypto.getRandomValues(new Uint8Array(16));
					const nonce = btoa(String.fromCharCode(...bytes));
					headers.set("Content-Security-Policy", `script-src 'nonce-${nonce}'`);

					const readable = await new Promise<stream.Readable>(
						(resolve, reject) => {
							let sent = false;
							const html = ReactDOM.renderToPipeableStream(
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
									nonce,
									onError(error, errorInfo) {
										if (!sent) {
											sent = true;
											reject(error);
										} else {
											console.error(error);
											if (errorInfo) {
												console.error(errorInfo);
											}
										}
									},
									onShellError(error) {
										sent = true;
										reject(error);
									},
									onShellReady() {
										sent = true;
										resolve(pipeable);
									},
								},
							);
							const pipeable = html.pipe(new stream.PassThrough());
							setTimeout(() => {
								html.abort(
									new Error("HTML render took longer than 30 seconds."),
								);
							}, 30_000);
						},
					);

					return stream.Readable.toWeb(readable) as ReadableStream<Uint8Array>;
				},
			});
		} catch (reason) {
			console.error(reason);
			return new Response("Internal Server Error", { status: 500 });
		}
	},
);
