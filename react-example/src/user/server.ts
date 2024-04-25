import * as framework from "framework";

import { USER_ID_KEY } from "./shared";

declare global {
  interface ServerContext {
    [USER_ID_KEY]?: string;
  }
  interface ServerClientContext {
    [USER_ID_KEY]?: string;
  }
}

export function actionRequiresUserId() {
  const userId = framework.get(USER_ID_KEY);

  if (!userId) {
    const url = framework.getURL();
    return framework.actionRedirects(
      `/?${new URLSearchParams({ redirectTo: url.pathname }).toString()}`
    );
  }

  return userId;
}

export function getUserId() {
  return framework.get(USER_ID_KEY);
}
