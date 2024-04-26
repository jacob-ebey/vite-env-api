import { createHandler, runRoutes } from "framework";

import { routes } from "./routes";

export default createHandler(async ({ request }) => {
	try {
		return await runRoutes(routes, request);
	} catch (reason) {
		console.error(reason);
		return new Response("Internal Server Error", { status: 500 });
	}
});
