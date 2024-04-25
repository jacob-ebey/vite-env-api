import { unsign } from "cookie-signature";
import { parse } from "cookie";

import type { MiddlewareFunction } from "framework/router/server";

import { Secrets } from "@/secrets/server";

import { USER_ID_KEY } from "./shared";

export const parseUserIdMiddleware: MiddlewareFunction = (
  { get, headers, set, setClient },
  next
) => {
  const secret = get(Secrets.COOKIE_SECRET, true);
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

  set(USER_ID_KEY, userId ?? undefined);
  setClient(USER_ID_KEY, userId ?? undefined);

  return next();
};

export const redirectIfLoggedInMiddleware =
  (to: string): MiddlewareFunction =>
  ({ get, redirect }, next) => {
    const userId = get(USER_ID_KEY);

    if (userId) {
      return redirect("/chat");
    }

    return next();
  };

export const requireUserIdMiddleware: MiddlewareFunction = (
  { get, redirect },
  next
) => {
  const userId = get(USER_ID_KEY);

  if (!userId) {
    return redirect("/");
  }

  return next();
};
