// @ts-expect-error - no types
import ReactServerDOM from "react-server-dom-diy/client";

import { navigate } from "framework/client";

if (import.meta.hot) {
	import.meta.hot.on("react-server:update", async () => {
		const controller = new AbortController();
		__startNavigation(
			window.location.href,
			controller,
			async (completeNavigation) => {
				const responsePromise = fetch(window.location.href, {
					headers: {
						Accept: "text/x-component",
						"RSC-Refresh": "1",
					},
					signal: controller.signal,
				});

				let payload = await ReactServerDOM.createFromFetch(responsePromise, {
					...__diy_client_manifest__,
					__callServer,
				});
				if (payload.redirect) {
					payload = await navigate(payload.redirect, controller.signal);
				}

				completeNavigation(payload);
			},
		);
	});
}
