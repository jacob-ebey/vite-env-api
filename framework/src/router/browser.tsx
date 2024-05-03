import * as React from "react";
// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/client";

import { setGlobal } from "../shared.js";
import { RenderRoute, RouteProvider } from "./client.js";
import type { ServerPayload } from "./server.js";

type StartNavigation = (
	location: string,
	controller: AbortController,
	callback: (
		completeNavigation: (payload: ServerPayload) => void,
		aborted: () => boolean,
	) => Promise<void>,
) => Promise<void>;

declare global {
	var __startNavigation: StartNavigation;
	var __callServer: typeof callServer;
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
		...__diy_client_manifest__,
		callServer,
	}) as Promise<ServerPayload>;
}

async function callServer(id: string, args: unknown[]) {
	let revalidateHeader: string | null = null;
	if (typeof args[0] === "object" && args[0] instanceof FormData) {
		const revalidate = args[0].get("RSC-Revalidate");
		if (revalidate && typeof revalidate === "string") {
			if (revalidate !== "no") {
				JSON.parse(revalidate);
			}
			revalidateHeader = revalidate;
		}
	}

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
			...__diy_client_manifest__,
			callServer,
		}),
	);

	const controller = new AbortController();
	__startNavigation(href, controller, async (completeNavigation, aborted) => {
		let payload = await payloadPromise;
		if (payload.redirect) {
			payload = await navigate(
				payload.redirect,
				controller.signal,
				revalidateHeader,
			);
		}
		if (window.location.href !== payload.url.href && !aborted()) {
			window.history.pushState(null, "", payload.url.href);
			if (!aborted()) {
				scrollToTop();
			}
		}
		completeNavigation(payload);
	});

	const payload = await payloadPromise;
	return payload.returnValue;
}

if (typeof document !== "undefined") {
	setGlobal("__callServer", callServer);
}

export async function navigate(
	to: string,
	signal: AbortSignal,
	revalidate?: string | null,
): Promise<ServerPayload> {
	const url = new URL(to, window.location.href);
	const responsePromise = fetch(url, {
		headers: {
			Accept: "text/x-component",
			"RSC-Refresh": "1",
			"RSC-Revalidate": revalidate ?? "true",
		},
		signal,
	});

	const payload = (await ReactServerDOM.createFromFetch(responsePromise, {
		...__diy_client_manifest__,
		callServer,
	})) as ServerPayload;

	if (payload.redirect) {
		return navigate(payload.redirect, signal, revalidate);
	}

	return payload;
}

export function BrowserRouter({
	initialPayload,
}: {
	initialPayload: ServerPayload;
}) {
	const navigationStateRef = React.useRef<{
		id: number;
		previousNavigationControllers: {
			id: number;
			controller: AbortController;
		}[];
	}>({
		id: 0,
		previousNavigationControllers: [],
	});
	const [isPending, startTransition] = React.useTransition();
	const [pendingState, setPendingState] = React.useState<null | {
		id: number;
		location: string;
	}>(null);
	const [_state, setState] = React.useState<{
		id: number;
		payload: ServerPayload;
	}>({
		id: 0,
		payload: initialPayload,
	});
	const state = React.useDeferredValue(_state);
	// const [state, setOptimisticState] = React.useOptimistic(_state);

	startNavigation = React.useCallback<StartNavigation>(
		async (location, controller, callback) => {
			navigationStateRef.current.id++;
			const id = navigationStateRef.current.id;
			navigationStateRef.current.previousNavigationControllers.push({
				id,
				controller,
			});

			startTransition(async () => {
				setPendingState({
					id,
					location,
				});

				await callback(
					(newPayload) => {
						navigationStateRef.current.previousNavigationControllers =
							navigationStateRef.current.previousNavigationControllers.filter(
								(previous) => {
									if (previous.id >= id) {
										return true;
									}
									previous.controller.abort(new Error("Navigation aborted"));
									return false;
								},
							);
						if (id < navigationStateRef.current.id) {
							const error = new Error("Navigation aborted");
							controller.abort(error);
							return;
						}
						startTransition(() => {
							setState((existingState) => {
								const existingTree = existingState.payload.tree ?? {
									matched: [],
									rendered: {},
								};
								const matched =
									newPayload.tree?.matched ?? existingTree.matched;
								return {
									id,
									payload: {
										...newPayload,
										clientContext: {
											...existingState.payload.clientContext,
											...newPayload.clientContext,
										},
										tree: {
											matched,
											rendered: Object.fromEntries(
												matched.map((id) => [
													id,
													newPayload.tree?.rendered[id] ??
														existingTree.rendered[id],
												]),
											),
										},
									} satisfies ServerPayload,
								};
							});
						});
					},
					() => id < navigationStateRef.current.id,
				);
			});
		},
		[],
	);
	setGlobal("__startNavigation", startNavigation);

	const navigation: Navigation =
		pendingState && (pendingState.id > state.id || isPending)
			? {
					href: pendingState.location,
					pending: true,
				}
			: {
					pending: false,
				};

	React.useEffect(() => {
		const handlePopState = (event: PopStateEvent) => {
			event.preventDefault();

			const to = window.location.href;
			const controller = new AbortController();
			__startNavigation(to, controller, async (completeNavigation, aborted) => {
				const payload = await navigate(to, controller.signal);
				if (window.location.href !== payload.url.href && !aborted()) {
					window.history.replaceState(null, "", payload.url.href);
				}
				if (!aborted()) {
					scrollToTop();
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

			const revalidate = anchor.getAttribute("data-revalidate");

			event.preventDefault();
			const controller = new AbortController();
			__startNavigation(
				href,
				controller,
				async (completeNavigation, aborted) => {
					const payload = await navigate(href, controller.signal, revalidate);
					if (window.location.href !== payload.url.href && !aborted()) {
						window.history.pushState(null, "", payload.url.href);
					}
					if (!aborted()) {
						scrollToTop();
					}
					completeNavigation(payload);
				},
			);
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

	// if (state.promise) {
	// 	React.use(state.promise);
	// }

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

export function scrollToTop() {
	window.scrollTo({ top: 0, behavior: "smooth" });
	const scrollTargets = document.querySelectorAll("[data-scroll-to-top]");
	for (const target of scrollTargets) {
		target.scrollTo({ top: 0, behavior: "smooth" });
	}
}
