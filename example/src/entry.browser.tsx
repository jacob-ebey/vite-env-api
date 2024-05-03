import * as React from "react";
import * as ReactDOM from "react-dom/client";

import { BrowserRouter, getInitialPayload } from "framework/browser";
import "@framework/vite/browser";

import "./global.css";

declare global {
	interface Window {
		__payloadPromise: ReturnType<typeof getInitialPayload> | undefined;
		__reactRoot: ReactDOM.Root | undefined;
	}
}

hydrate().catch((reason) => console.error(reason));

async function hydrate() {
	if (!window.__payloadPromise) {
		window.__payloadPromise = getInitialPayload();
	}
	const payload = await window.__payloadPromise;
	React.startTransition(() => {
		const element = (
			<React.StrictMode>
				<BrowserRouter initialPayload={payload} />
			</React.StrictMode>
		);

		if (window.__reactRoot) {
			window.__reactRoot.render(element);
		} else {
			window.__reactRoot = ReactDOM.hydrateRoot(document, element, {
				formState: payload.formState,
				onRecoverableError(error, errorInfo) {
					console.error("RECOVERABLE ERROR", error, errorInfo);
				},
				onCaughtError(error, errorInfo) {
					console.error("CAUGHT ERROR", error, errorInfo);
				},
				onUncaughtError(error, errorInfo) {
					console.error("UNCAUGHT ERROR", error, errorInfo);
				},
			});
		}
	});
}

if (import.meta.hot) {
	import.meta.hot.accept();
}
