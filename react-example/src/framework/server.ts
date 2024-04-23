import { AsyncLocalStorage } from "node:async_hooks";

import { getOrCreateGlobal } from "./shared";
import type { RouterContext } from "./router/server";
import { REDIRECT_SYMBOL } from "./router/server";

declare global {
  // biome-ignore lint/suspicious/noEmptyInterface: <explanation>
  interface ServerContext {}
}

declare global {
  var __asyncLocalStorage: AsyncLocalStorage<RouterContext>;
}

const asyncLocalStorage = getOrCreateGlobal(
  "__asyncLocalStorage",
  () => new AsyncLocalStorage()
);

export function runWithContext<R>(context: RouterContext, fn: () => R) {
  return asyncLocalStorage.run(context, fn);
}

export function get(
  key: keyof ServerContext,
  truthy: true
): NonNullable<ServerContext[typeof key]>;
export function get(
  key: keyof ServerContext,
  truthy?: false
): undefined | ServerContext[typeof key];
export function get(
  key: keyof ServerContext
): undefined | ServerContext[typeof key] {
  // biome-ignore lint/style/noArguments: <explanation>
  const truthy = arguments.length === 2 ? arguments[1] : false;
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  if (truthy) return context.get(key, truthy);
  return context.get(key, truthy);
}

export function set(
  key: keyof ServerContext,
  value: ServerContext[typeof key]
) {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  context.set(key, value);
}

export function getAction<T>(
  action: T
  // biome-ignore lint/suspicious/noExplicitAny: needed for type inference
): T extends (...args: any) => infer R
  ? { ran: boolean; result: Awaited<R> }
  : { ran: boolean; result: unknown } {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  const actionRef = action as { $$id?: string };
  const id = actionRef.$$id;
  if (!id) throw new Error("Invalid action reference");
  if (context.action && context.action.actionId === id) {
    // biome-ignore lint/suspicious/noExplicitAny: needed for type inference
    return { ran: true, result: context.action.returnValue } as any;
  }
  // biome-ignore lint/suspicious/noExplicitAny: needed for type inference
  return { ran: false, result: undefined } as any;
}

export function getSetHeaders(): Headers {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  return context.setHeaders;
}

export function redirect(to: string): never {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");

  context.redirect = to;
  throw REDIRECT_SYMBOL;
}

export function getURL() {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  return new URL(context.request.url);
}
