import { unsign } from "cookie-signature";
import { parse } from "cookie";

import * as framework from "framework";
import type { MiddlewareFunction } from "framework/router/server";

import { COOKIE_SECRET } from "../secrets/server";

export const USER_ID_KEY = "userId" as const;

declare global {
  interface ServerContext {
    [USER_ID_KEY]?: string;
  }
}

export function actionRequiresUserId() {
  const userId = framework.get(USER_ID_KEY);

  if (!userId) {
    const url = framework.getURL();
    return framework.redirect(
      `/?${new URLSearchParams({ redirectTo: url.pathname }).toString()}`
    );
  }

  return userId;
}

export const parseUserIdMiddleware: MiddlewareFunction = (
  { get, headers, set },
  next
) => {
  const secret = get(COOKIE_SECRET, true);

  const existingUserId = get(USER_ID_KEY);
  if (existingUserId) return next();

  const cookie = headers.get("Cookie");
  const userId =
    cookie &&
    parse(cookie, {
      decode(value) {
        const unsigned = unsign(value, secret);
        if (typeof unsigned === "boolean") return "";
        return unsigned;
      },
    }).userId;

  if (userId) {
    set(USER_ID_KEY, userId);
  }

  return next();
};

export const requireUserIdMiddleware: MiddlewareFunction = (
  { get, headers, redirect, set },
  next
) => {
  const secret = framework.get(COOKIE_SECRET, true);

  const existingUserId = get(USER_ID_KEY);
  if (existingUserId) return next();

  const cookie = headers.get("Cookie");
  const userId =
    cookie &&
    parse(cookie, {
      decode(value) {
        const unsigned = unsign(value, secret);
        if (typeof unsigned === "boolean") return "";
        return unsigned;
      },
    }).userId;

  if (!userId) {
    return redirect("/");
  }

  set(USER_ID_KEY, userId);

  return next();
};
