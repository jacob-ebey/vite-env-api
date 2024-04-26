import { AsyncLocalStorage } from "node:async_hooks";
import * as stream from "node:stream";

import type { HattipHandler } from "@hattip/core";
import type * as React from "react";
import type { ReactFormState } from "react-dom/client";
// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/server";

import { getOrCreateGlobal } from "../shared.js";
import { RenderRoute } from "./client.js";
import type { IndexRouteConfig, Node, NonIndexRouteConfig } from "./trie.js";
import { createTrie, matchTrie } from "./trie.js";

declare global {
	var __diy_server_manifest__: {
		resolveClientReferenceMetadata(clientReference: {
			$$id: string;
		}): [string, string];
		resolveServerReference(id: string): {
			preloadModule(): Promise<void>;
			requireModule(): unknown;
		};
	};
	var __diy_client_manifest__: {
		_cache?: Map<string, unknown>;
		resolveClientReference([id, exportName]: [string, string]): {
			preloadModule(): Promise<void>;
			requireModule(): unknown;
		};
	};
}

export type MiddlewareContext = {
	get<Key extends keyof ServerContext>(
		key: Key,
		truthy: true,
	): NonNullable<ServerContext[Key]>;
	get<Key extends keyof ServerContext>(
		key: Key,
		truthy?: false,
	): undefined | ServerContext[Key];
	get<Key extends keyof ServerContext>(
		key: Key,
	): undefined | ServerContext[Key];
	headers: Headers;
	redirect(to: string): never;
	set<Key extends keyof ServerContext>(
		key: Key,
		value: ServerContext[Key],
	): void;
	setClient<Key extends keyof ServerClientContext>(
		key: Key,
		value: ServerClientContext[Key],
	): void;
};

export type MiddlewareFunction = (
	c: MiddlewareContext,
	next: () => Promise<void>,
) => void | Promise<void>;

export type RouteModule = {
	default?: (props: { children?: React.ReactNode }) => React.ReactNode;
	middleware?: MiddlewareFunction[];
};

export type RouteConfig = (IndexRouteConfig | NonIndexRouteConfig) &
	RouteModule & {
		children?: RouteConfig[];
		import?: () => Promise<RouteModule>;
	};

export type RouterContext = {
	action?: {
		actionId: string;
		returnValue: unknown;
	};
	get<Key extends keyof ServerContext>(
		key: Key,
		truthy: true,
	): NonNullable<ServerContext[Key]>;
	get<Key extends keyof ServerContext>(
		key: Key,
		truthy?: false,
	): undefined | ServerContext[Key];
	get<Key extends keyof ServerContext>(
		key: Key,
	): undefined | ServerContext[Key];
	redirect?: string;
	request: Request;
	set<Key extends keyof ServerContext>(
		key: Key,
		value: ServerContext[Key],
	): void;
	setClient<Key extends keyof ServerClientContext>(
		key: Key,
		value: ServerClientContext[Key],
	): void;
	setHeaders: Headers;
};

export type ServerPayload = {
	clientContext?: Record<string, unknown>;
	formState?: ReactFormState;
	redirect?: string;
	returnValue?: unknown;
	tree?: {
		matched: string[];
		rendered: Record<string, React.ReactNode>;
	};
	url: {
		href: string;
	};
};

export const REDIRECT_SYMBOL = Symbol("context.redirect");

getOrCreateGlobal("__asyncLocalStorage", () => new AsyncLocalStorage());

export const asyncLocalStorage = global.__asyncLocalStorage;

export function runWithContext<R>(context: RouterContext, fn: () => R) {
	return asyncLocalStorage.run(context, fn);
}

export function createHandler(handler: HattipHandler) {
	return handler;
}

export function createRoutes(routes: RouteConfig[]) {
	return createTrie<RouteConfig>(routes);
}

export async function runRoutes(
	routes: Node<RouteConfig>,
	request: Request,
): Promise<Response> {
	const contextValues: Partial<
		Record<keyof ServerContext, ServerContext[keyof ServerContext]>
	> = {};
	const clientContextValues: Partial<
		Record<keyof ServerContext, ServerContext[keyof ServerContext]>
	> = {};
	const context: RouterContext = {
		get(key, truthy = false) {
			const value = contextValues[key];
			if (truthy && !value) {
				throw new Error(`Expected context key "${key}" to be truthy`);
			}
			return value as NonNullable<ServerContext[typeof key]>;
		},
		request,
		set(key, value) {
			contextValues[key] = value;
		},
		setClient(key, value) {
			clientContextValues[key] = value;
		},
		setHeaders: new Headers(),
	};
	const url = new URL(request.url);
	const matched = matchTrie(routes, url.pathname);
	const matches: Array<Omit<RouteConfig, "children"> & RouteModule> =
		matched?.length
			? await Promise.all(
					matched.map(async (match) => {
						const imported = await match.import?.();
						const importedMiddleware = imported?.middleware || [];
						return {
							...match,
							...imported,
							middleware: match.middleware
								? [...match.middleware, ...importedMiddleware]
								: importedMiddleware,
						};
					}),
				)
			: [
					{
						id: "not-found",
						path: "*",
						default: () => (
							<html lang="en">
								<head>
									<meta charSet="utf-8" />
									<title>Not Found</title>
								</head>
								<body>
									<h1>Not Found</h1>
								</body>
							</html>
						),
					},
				];

	const middlewareContext: MiddlewareContext = {
		get(key, truthy = false) {
			const value = contextValues[key];
			if (truthy && !value) {
				throw new Error(`Expected context key "${key}" to be truthy`);
			}
			return value as NonNullable<ServerContext[typeof key]>;
		},
		headers: request.headers,
		redirect(to) {
			context.redirect = to;
			throw REDIRECT_SYMBOL;
		},
		set(key, value) {
			contextValues[key] = value;
		},
		setClient(key, value) {
			clientContextValues[key] = value;
		},
	};
	let runMiddleware = () => Promise.resolve();
	// run middleware top down with a "next" function for each to call.
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		if (match.middleware) {
			for (let j = match.middleware.length - 1; j >= 0; j--) {
				const middleware = match.middleware[j];
				const next = runMiddleware;
				runMiddleware = async () =>
					await runWithContext(context, () =>
						middleware(middlewareContext, next),
					);
			}
		}
	}

	try {
		await runWithContext(context, runMiddleware);
	} catch (reason) {
		if (reason !== REDIRECT_SYMBOL) {
			throw reason;
		}
	}

	let revalidate: boolean | string[] = true;
	const toRender: ServerPayload = {
		url: { href: request.url },
	};
	if (request.method === "POST") {
		const actionId = request.headers.get("RSC-Action");
		if (actionId) {
			const revalidateHeader = request.headers.get("RSC-Revalidate");
			revalidate =
				revalidateHeader === "no"
					? false
					: revalidateHeader
						? JSON.parse(revalidateHeader)
						: true;
			if (typeof revalidate !== "boolean" && !Array.isArray(revalidate)) {
				revalidate = true;
			}
			const serverReference =
				__diy_server_manifest__.resolveServerReference(actionId);
			const [serverAction, args] = await Promise.all([
				serverReference
					.preloadModule()
					.then(() => serverReference.requireModule()),
				ReactServerDOM.decodeReply(
					await request.formData(),
					__diy_server_manifest__,
				),
			]);

			try {
				const returnValue = await runWithContext(context, async () => {
					return await serverAction(...args);
				});
				context.action = {
					actionId,
					returnValue,
				};

				toRender.returnValue = returnValue;
			} catch (reason) {
				if (reason !== REDIRECT_SYMBOL) {
					throw reason;
				}
			}
		} else {
			const formData = await request.formData();
			const action = await ReactServerDOM.decodeAction(
				formData,
				__diy_server_manifest__,
			);
			try {
				const returnValue = await runWithContext(context, action);
				context.action = {
					actionId: action.$$id,
					returnValue,
				};
				const formState = ReactServerDOM.decodeFormState(
					returnValue,
					formData,
					__diy_server_manifest__,
				);

				toRender.formState = formState;
			} catch (reason) {
				if (reason !== REDIRECT_SYMBOL) {
					throw reason;
				}
			}
		}
	}

	if (context.redirect) {
		toRender.redirect = context.redirect;
	} else if (revalidate) {
		const matched: string[] = [];
		const rendered: Record<string, React.ReactNode> = {};
		let lastId: string | null = null;
		for (let i = matches.length - 1; i >= 0; i--) {
			const match = matches[i];
			const Route = match.default;
			if (Route) {
				matched.unshift(match.id);
				const children = lastId ? <RenderRoute id={lastId} /> : null;
				rendered[match.id] = <Route>{children}</Route>;
				lastId = match.id;
			}
		}
		toRender.tree = { matched, rendered };
	}

	if (!context.redirect) {
		toRender.clientContext = clientContextValues;
	}

	const pipeable = runWithContext(context, () =>
		ReactServerDOM.renderToPipeableStream(toRender, __diy_server_manifest__),
	);

	const headers = new Headers(context.setHeaders);
	headers.set("Content-Type", "text/x-component");
	headers.set("Vary", "Accept");

	return new Response(
		stream.Readable.toWeb(
			pipeable.pipe(new stream.PassThrough()),
		) as ReadableStream<Uint8Array>,
		{
			status: context.redirect ? 202 : 200,
			headers,
		},
	);
}
