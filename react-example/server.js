import { createMiddleware } from "@hattip/adapter-node";
import compression from "compression";
import express from "express";

import browserViteManifest from "./dist/browser/.vite/manifest.json" assert {
	type: "json",
};
import clientReferences from "./dist/prerender/_client-references.js";
import prerenderHandler from "./dist/prerender/index.js";
import serverReferences from "./dist/server/_server-references.js";
import serverHandler from "./dist/server/index.js";

const serverModulePromiseCache = new Map();
global.__vite_server_manifest__ = {
	resolveClientReferenceMetadata(clientReference) {
		const id = clientReference.$$id;
		const idx = id.lastIndexOf("#");
		const exportName = id.slice(idx + 1);
		const fullURL = id.slice(0, idx);
		return [fullURL, exportName];
	},
	resolveServerReference(_id) {
		const idx = _id.lastIndexOf("#");
		const exportName = _id.slice(idx + 1);
		const id = _id.slice(0, idx);
		return {
			preloadModule() {
				if (serverModulePromiseCache.has(id)) {
					return serverModulePromiseCache.get(id);
				}
				const promise = /**
          @type {Promise<unknown> & {
            status: "pending" | "fulfilled" | "rejected";
            value?: unknown;
            reason?: unknown;
          }}
          */ (
					serverReferences[/** @type {keyof typeof serverReferences} */ (id)]()
						.then((mod) => {
							promise.status = "fulfilled";
							promise.value = mod;
						})
						.catch((res) => {
							promise.status = "rejected";
							promise.reason = res;
							throw res;
						})
				);
				promise.status = "pending";
				serverModulePromiseCache.set(id, promise);
				return promise;
			},
			requireModule() {
				const cached = serverModulePromiseCache.get(id);
				if (!cached) throw new Error(`Module ${id} not found`);
				if (cached.reason) throw cached.reason;
				return cached.value[exportName];
			},
		};
	},
};

const clientModulePromiseCache = new Map();
global.__vite_client_manifest__ = {
	resolveClientReference([id, exportName]) {
		return {
			preloadModule() {
				if (clientModulePromiseCache.has(id)) {
					return clientModulePromiseCache.get(id);
				}
				const promise = /**
          @type {Promise<unknown> & {
            status: "pending" | "fulfilled" | "rejected";
            value?: unknown;
            reason?: unknown;
          }}
          */ (
					clientReferences[/** @type {keyof typeof clientReferences} */ (id)]()
						.then((mod) => {
							promise.status = "fulfilled";
							promise.value = mod;
						})
						.catch((res) => {
							promise.status = "rejected";
							promise.reason = res;
							throw res;
						})
				);
				promise.status = "pending";
				clientModulePromiseCache.set(id, promise);
				return promise;
			},
			requireModule() {
				const cached = clientModulePromiseCache.get(id);
				if (!cached) throw new Error(`Module ${id} not found`);
				if (cached.reason) throw cached.reason;
				return cached.value[exportName];
			},
		};
	},
};

start();

async function start() {
	const app = express();

	app.use(compression());

	app.use(express.static("dist/browser"));

	app.use(
		createMiddleware((c) => {
			return prerenderHandler(c, {
				callServer:
					/**
					 * @param {Request} request
					 */
					(request) => serverHandler({ ...c, request }),
				bootstrapModules: [
					`/${browserViteManifest["src/entry.browser.tsx"].file}`,
				],
				bootstrapScripts: [],
				bootstrapScriptContent: `
          window.__vite_client_manifest__ = {
            _cache: new Map(),
            resolveClientReference([id, exportName]) {
              return {
                preloadModule() {
                  if (window.__vite_client_manifest__._cache.has(id)) {
                    return window.__vite_client_manifest__._cache.get(id);
                  }
                  const promise = import("/"+${JSON.stringify(
										browserViteManifest["virtual:client-references"].file,
									)})
                    .then(({default:mods}) => mods[id]())
                    .then((mod) => {
                      promise.status = "fulfilled";
                      promise.value = mod;
                    })
                    .catch((res) => {
                      promise.status = "rejected";
                      promise.reason = res;
                      throw res;
                    });
                  promise.status = "pending";
                  window.__vite_client_manifest__._cache.set(id, promise);
                  return promise;
                },
                requireModule() {
                  const cached = window.__vite_client_manifest__._cache.get(id);
                  if (!cached) throw new Error(\`Module \${id} not found\`);
                  if (cached.reason) throw cached.reason;
                  return cached.value[exportName];
                },
              };
            },
          };
        `,
				cssFiles: browserViteManifest["src/entry.browser.tsx"].css.map(
					(f) => `/${f}`,
				),
			});
		}),
	);

	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		console.log(`Server started on http://localhost:${port}`);
	});
}
