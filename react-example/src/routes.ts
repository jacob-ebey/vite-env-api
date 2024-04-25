import { createRoutes } from "framework/router/server";

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
        id: "login",
        path: "/",
        index: true,
        middleware: [redirectIfLoggedInMiddleware],
        import: () => import("./routes/login/route"),
      },
      {
        id: "signup",
        path: "/signup",
        index: true,
        import: () => import("./routes/signup/route"),
      },
      {
        id: "chat",
        path: "/chat/:chatId?",
        middleware: [requireUserIdMiddleware],
        import: () => import("./routes/chat/route"),
      },
    ],
  },
]);
