"use server";

import type { SubmissionResult } from "@conform-to/dom";
import { parseWithZod } from "@conform-to/zod";
import { sign } from "cookie-signature";
import { serialize } from "cookie";

import * as framework from "framework";

import { COOKIE_SECRET } from "../secrets/server";
import { loginFormSchema } from "./schema";
import { USER_ID_KEY } from "./server";

export function logout(formData: FormData) {
  const url = framework.getURL();
  const headers = framework.getSetHeaders();
  const redirectToInput = String(formData.get("redirectTo"));
  const redirectTo =
    redirectToInput.startsWith("/") && !redirectToInput.startsWith("//")
      ? redirectToInput
      : "/";

  framework.set(USER_ID_KEY, undefined);
  headers.append(
    "Set-Cookie",
    serialize("userId", "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: 0,
    })
  );

  return framework.redirect(redirectTo);
}

export async function login(
  formData: FormData
): Promise<SubmissionResult | undefined> {
  const url = framework.getURL();
  const headers = framework.getSetHeaders();
  const secret = framework.get(COOKIE_SECRET, true);

  const parsed = await parseWithZod(formData, {
    schema: loginFormSchema,
  });

  switch (parsed.status) {
    case "error": {
      return parsed.reply({ hideFields: ["password"] });
    }
    case "success": {
      // username is actually email, but for accessibility reasons we're
      // using username as the field name in the form.

      // TODO: Login logic here
      const { username, password } = parsed.value;
      const userId = username;

      framework.set(USER_ID_KEY, userId);
      const cookie = serialize("userId", userId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: url.protocol === "https:",
        encode(value) {
          return sign(value, secret);
        },
      });
      headers.append("Set-Cookie", cookie);

      return framework.redirect("/chat");
    }
  }
}
