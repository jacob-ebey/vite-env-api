import type {
  MiddlewareContext,
  MiddlewareFunction,
} from "framework/router/server";

export const COOKIE_SECRET = "COOKIE_SECRET" as const;
export const GROQ_API_KEY = "GROQ_API_KEY" as const;

declare global {
  interface ServerContext {
    [COOKIE_SECRET]?: string;
    [GROQ_API_KEY]?: string;
  }
}

export const configureSecretsMiddleware: MiddlewareFunction = (c, next) => {
  configureSecret(c, COOKIE_SECRET);
  configureSecret(c, GROQ_API_KEY, false);

  return next();
};

function configureSecret(
  { get, set }: MiddlewareContext,
  key: keyof ServerContext,
  required?: false
) {
  const existingSecret = get(key);
  if (existingSecret) return;

  const secret = process.env[key];
  if (!secret && required) {
    throw new Error(`Missing required secret: ${key}`);
  }

  set(key, secret);
}
