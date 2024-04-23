import { createRoutes } from "framework/router/server";

import { configureSecretsMiddleware } from "./middleware/secrets/server";
import {
  parseUserIdMiddleware,
  requireUserIdMiddleware,
} from "./middleware/user/server";

export const routes = createRoutes([
  {
    id: "root",
    middleware: [configureSecretsMiddleware, parseUserIdMiddleware],
    import: () => import("./routes/shell/route"),
    children: [
      {
        id: "home",
        path: "/",
        index: true,
        import: () => import("./routes/home/route"),
      },
      {
        id: "chat",
        path: "/chat",
        middleware: [requireUserIdMiddleware],
        import: () => import("./routes/chat/route"),
      },
    ],
  },
]);
