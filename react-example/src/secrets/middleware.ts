import type {
	MiddlewareContext,
	MiddlewareFunction,
} from "framework/router/server";

import { Secrets } from "./server";

declare global {
	interface ServerContext {
		[Secrets.COOKIE_SECRET]?: string;
		[Secrets.DB_PATH]?: string;
		[Secrets.GROQ_API_KEY]?: string;
	}
}

export const configureSecretsMiddleware: MiddlewareFunction = (c, next) => {
	configureSecret(c, Secrets.COOKIE_SECRET);
	configureSecret(c, Secrets.DB_PATH, import.meta.env.PROD);
	configureSecret(c, Secrets.GROQ_API_KEY, false);

	return next();
};

function configureSecret(
	{ get, set }: MiddlewareContext,
	key: keyof ServerContext,
	required = true,
) {
	const existingSecret = get(key);
	if (existingSecret) return;

	const secret = process.env[key];
	if (!secret && required) {
		throw new Error(`Missing required secret: ${key}`);
	}

	set(key, secret);
}
