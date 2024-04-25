"use server";

import type { SubmissionResult } from "@conform-to/dom";
import { parseWithZod } from "@conform-to/zod";
import { compare, hash } from "bcrypt";
import { sign } from "cookie-signature";
import { serialize } from "cookie";

import * as framework from "framework";

import { password, user } from "@/db/schema";
import { getDB } from "@/db/server";
import { Secrets } from "@/secrets/server";
import { loginFormSchema, signupFormSchema } from "./schema";
import { USER_ID_KEY } from "./shared";
import { desc, eq } from "drizzle-orm";

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

  return framework.actionRedirects(redirectTo);
}

const GENERIC_ERROR = "Invalid email or password";

export async function login(
  formData: FormData
): Promise<SubmissionResult | undefined> {
  const url = framework.getURL();
  const headers = framework.getSetHeaders();
  const secret = framework.get(Secrets.COOKIE_SECRET, true);
  const db = getDB();

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
      const { username: email, password: inputPassword } = parsed.value;

      const dbUser = await db.query.user.findFirst({
        where: eq(user.email, email),
        columns: {
          id: true,
        },
      });
      const dbPassword =
        dbUser &&
        (await db.query.password.findFirst({
          where: eq(password.userId, dbUser.id),
          orderBy: desc(password.createdAt),
          columns: {
            password: true,
          },
        }));
      const passwordMatch =
        !!dbPassword && (await compare(inputPassword, dbPassword.password));

      if (!passwordMatch) {
        return parsed.reply({
          fieldErrors: { password: [GENERIC_ERROR] },
          hideFields: ["password"],
          resetForm: false,
        });
      }

      const userId = dbUser.id;

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

      return framework.actionRedirects("/chat");
    }
  }
}

export async function signup(
  formData: FormData
): Promise<SubmissionResult | undefined> {
  const url = framework.getURL();
  const headers = framework.getSetHeaders();
  const secret = framework.get(Secrets.COOKIE_SECRET, true);
  const db = getDB();

  const parsed = await parseWithZod(formData, {
    schema: signupFormSchema,
  });

  switch (parsed.status) {
    case "error": {
      return parsed.reply({ hideFields: ["password", "verifyPassword"] });
    }
    case "success": {
      // username is actually email, but for accessibility reasons we're
      // using username as the field name in the form.
      const {
        displayName,
        username: email,
        fullName,
        password: inputPassword,
      } = parsed.value;

      let dbUser = await db.query.user.findFirst({
        where: eq(user.email, email),
        columns: {
          id: true,
        },
      });

      if (dbUser) {
        return parsed.reply({
          fieldErrors: { password: [GENERIC_ERROR] },
          hideFields: ["password", "verifyPassword"],
          resetForm: false,
        });
      }

      const hashedPassword = await hash(inputPassword, 11);

      dbUser = await db.transaction(async (tx) => {
        const insertedUsers = await tx
          .insert(user)
          .values({
            displayName,
            email,
            fullName,
          })
          .returning({ id: user.id });
        const createdUser = insertedUsers[0];

        if (!createdUser) {
          tx.rollback();
          return;
        }

        const insertedPasswords = await tx
          .insert(password)
          .values({
            userId: createdUser.id,
            password: hashedPassword,
          })
          .returning({ id: password.id });
        const createdPassword = insertedPasswords[0];

        if (!createdPassword) {
          tx.rollback();
          return;
        }

        return createdUser;
      });

      if (!dbUser) {
        return parsed.reply({
          fieldErrors: { password: [GENERIC_ERROR] },
          hideFields: ["password", "verifyPassword"],
          resetForm: false,
        });
      }

      const userId = dbUser.id;

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

      return framework.actionRedirects("/chat");
    }
  }
}
