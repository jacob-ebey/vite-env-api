import { createRoutes } from "framework";

import { configureDBMiddleware } from "./db/server";
import { configureSecretsMiddleware } from "./secrets/middleware";
import {
	parseUserIdMiddleware,
	redirectIfLoggedInMiddleware,
	requireUserIdMiddleware,
} from "./user/middleware";

export const routes = createRoutes([
	{
		id: "shell",
		middleware: [
			configureSecretsMiddleware,
			configureDBMiddleware,
			parseUserIdMiddleware,
		],
		import: () => import("./routes/shell/route"),
		children: [
			{
				id: "signup",
				index: true,
				middleware: [redirectIfLoggedInMiddleware("/chat")],
				import: () => import("./routes/login/route"),
			},
			{
				id: "signup",
				path: "signup",
				index: true,
				import: () => import("./routes/signup/route"),
			},
			{
				id: "chat",
				path: "chat",
				import: () => import("./routes/chat/route"),
				children: [
					{
						id: "chat.detail",
						path: ":chatId?",
						middleware: [requireUserIdMiddleware],
						import: () => import("./routes/chat.detail/route"),
					},
				],
			},
			{
				id: "chats",
				path: "chats",
				middleware: [requireUserIdMiddleware],
				import: () => import("./routes/chats/route"),
			},
		],
	},
]);
