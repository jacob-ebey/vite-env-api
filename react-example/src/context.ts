import { AsyncLocalStorage } from "node:async_hooks";

type Context = {
  request: Request;
};

const asyncLocalStorage = new AsyncLocalStorage<Context>();

export function runWithContext<R>(context: Context, fn: () => R) {
  return asyncLocalStorage.run(context, fn);
}

export function getURL() {
  const context = asyncLocalStorage.getStore();
  if (!context) throw new Error("No context");
  return new URL(context.request.url);
}
