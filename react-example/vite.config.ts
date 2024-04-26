import * as path from "node:path";

import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { rscClientPlugin, rscServerPlugin } from "unplugin-rsc";
import type { DevEnvironment, Plugin, UserConfig, ViteDevServer } from "vite";
import {
	createNodeDevEnvironment,
	createServerModuleRunner,
	defineConfig,
	loadEnv,
} from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import packageJSON from "./package.json" assert { type: "json" };

declare global {
	var clientModules: Set<string>;
	var serverModules: Set<string>;
	var __vite_server_manifest__: {
		resolveClientReferenceMetadata(clientReference: {
			$$id: string;
		}): [string, string];
		resolveServerReference(id: string): {
			preloadModule(): Promise<void>;
			requireModule(): unknown;
		};
	};
	var __vite_client_manifest__: {
		_cache?: Map<string, unknown>;
		resolveClientReference([id, exportName]: [string, string]): {
			preloadModule(): Promise<void>;
			requireModule(): unknown;
		};
	};
}

global.clientModules = global.clientModules || new Set<string>();
global.serverModules = global.serverModules || new Set<string>();

export default defineConfig({
	builder: reactServerBuilder({ serverModules }),
	build: {
		emptyOutDir: true,
		assetsInlineLimit: 0,
	},
	environments: {
		client: {
			build: {
				outDir: "dist/browser",
				rollupOptions: {
					input: {
						index: "/src/entry.browser.tsx",
					},
					plugins: [
						visualizer({
							template: "flamegraph",
							filename: ".stats/client.html",
						}),
					],
				},
			},
		},
		ssr: {
			build: {
				outDir: "dist/prerender",
				rollupOptions: {
					input: {
						index: "/src/entry.prerender.tsx",
					},
					plugins: [
						visualizer({
							template: "flamegraph",
							filename: ".stats/ssr.html",
						}),
					],
				},
			},
			resolve: {
				noExternal: packageJSON.bundlePrerender,
			},
		},
		server: {
			build: {
				outDir: "dist/server",
				rollupOptions: {
					input: {
						index: "/src/entry.server.tsx",
					},
					plugins: [
						visualizer({
							template: "flamegraph",
							filename: ".stats/server.html",
						}),
					],
				},
			},
			dev: {
				optimizeDeps: {
					exclude: ["@conform-to/zod"],
				},
			},
			resolve: {
				external: packageJSON.doNotBundleServer,
			},
		},
	},
	plugins: [
		tsconfigPaths(),
		react(),
		reactServerPlugin({ clientModules, serverModules }),
		hattipRSCDevServer({
			createPrerenderEnvironment: createNodeDevEnvironment,
			createServerEnvironment: createNodeDevEnvironment,
		}),
	],
});

function hash(str: string, type: "use client" | "use server") {
	return `/${path.relative(process.cwd(), str)}`;
}

function reactServerBuilder({
	serverModules,
}: {
	serverModules: Set<string>;
}): UserConfig["builder"] {
	return {
		async buildEnvironments(builder, build) {
			async function doBuildRecursive() {
				const ogServerModulesCount = serverModules.size;
				await build(builder.environments.server);
				let serverNeedsRebuild = serverModules.size > ogServerModulesCount;

				await Promise.all([
					build(builder.environments.ssr),
					build(builder.environments.client),
				]);
				if (serverModules.size > ogServerModulesCount) {
					serverNeedsRebuild = true;
				}

				if (serverNeedsRebuild) {
					await doBuildRecursive();
				}
			}
			await doBuildRecursive();
		},
	};
}

function reactServerPlugin({
	clientModules,
	serverModules,
}: {
	clientModules: Set<string>;
	serverModules: Set<string>;
}): Plugin {
	const clientPlugin: Plugin = rscClientPlugin.vite({
		include: ["**/*"],
		transformModuleId: hash,
		useServerRuntime: {
			function: "createServerReference",
			module: "framework/runtime.client",
		},
		onModuleFound(id, type) {
			switch (type) {
				case "use server":
					serverModules.add(id);
					break;
			}
		},
	}) as Plugin;
	const prerenderPlugin: Plugin = rscClientPlugin.vite({
		include: ["**/*"],
		transformModuleId: hash,
		useServerRuntime: {
			function: "createServerReference",
			module: "framework/runtime.client",
		},
		onModuleFound(id, type) {
			switch (type) {
				case "use server":
					serverModules.add(id);
					break;
			}
		},
	}) as Plugin;
	const serverPlugin = rscServerPlugin.vite({
		include: ["**/*"],
		transformModuleId: hash,
		useClientRuntime: {
			function: "registerClientReference",
			module: "react-server-dom-diy/server",
		},
		useServerRuntime: {
			function: "registerServerReference",
			module: "react-server-dom-diy/server",
		},
		onModuleFound(id, type) {
			switch (type) {
				case "use client":
					clientModules.add(id);
					break;
				case "use server":
					serverModules.add(id);
					break;
			}
		},
	}) as Plugin;

	let browserEntry: string;
	let devBase: string;

	return {
		name: "react-server",
		configEnvironment(name, env) {
			let ssr = false;
			let manifest = false;
			const input: Record<string, string> = {};
			let dev: (typeof env)["dev"] = undefined;
			let resolve: (typeof env)["resolve"] = undefined;

			switch (name) {
				case "client":
					ssr = false;
					input["_client-references"] = "virtual:client-references";
					manifest = true;
					browserEntry = (
						env.build?.rollupOptions?.input as Record<string, string>
					)?.index;
					break;
				case "ssr":
					ssr = true;
					input["_client-references"] = "virtual:client-references";
					resolve = {
						noExternal: ["react-server-dom-diy/client"],
					};
					break;
				case "server":
					ssr = true;
					input["_server-references"] = "virtual:server-references";
					dev = {
						optimizeDeps: {
							include: [
								"react",
								"react/jsx-runtime",
								"react/jsx-dev-runtime",
								"react-server-dom-diy/server",
							],
						},
					};
					resolve = {
						externalConditions: ["react-server", "..."],
						conditions: ["react-server", "..."],
						noExternal: true,
					};
					break;
			}

			return {
				build: {
					ssr,
					manifest,
					emitAssets: !ssr,
					copyPublicDir: !ssr,
					rollupOptions: {
						preserveEntrySignatures: "exports-only",
						input,
					},
				},
				dev,
				resolve,
			};
		},
		configResolved(config) {
			devBase = config.base;
		},
		transform(...args) {
			if (this.environment?.name === "server") {
				// biome-ignore lint/complexity/noBannedTypes: bla bla bla
				return (serverPlugin.transform as Function).apply(this, args);
			}

			if (this.environment?.name === "ssr") {
				// biome-ignore lint/complexity/noBannedTypes: bla bla bla
				return (prerenderPlugin.transform as Function).apply(this, args);
			}

			// biome-ignore lint/complexity/noBannedTypes: bla bla bla
			return (clientPlugin.transform as Function).apply(this, args);
		},
		resolveId(source) {
			if (
				source === "virtual:client-references" ||
				source === "virtual:server-references" ||
				source === "virtual:browser-entry" ||
				source === "virtual:react-preamble"
			) {
				return `\0${source}`;
			}
		},
		load(id) {
			if (id === "\0virtual:client-references") {
				let result = "export default {";
				for (const clientModule of clientModules) {
					result += `${JSON.stringify(
						hash(clientModule, "use client"),
					)}: () => import(${JSON.stringify(clientModule)}),`;
				}
				return `${result}\};`;
			}

			if (id === "\0virtual:server-references") {
				let result = "export default {";
				for (const serverModule of serverModules) {
					result += `${JSON.stringify(
						hash(serverModule, "use server"),
					)}: () => import(${JSON.stringify(serverModule)}),`;
				}
				return `${result}\};`;
			}

			if (id === "\0virtual:browser-entry") {
				return `
          import "virtual:react-preamble";
          import ${JSON.stringify(browserEntry)};
        `;
			}

			if (id === "\0virtual:react-preamble") {
				return react.preambleCode.replace("__BASE__", devBase);
			}
		},
	};
}

function hattipRSCDevServer({
	createPrerenderEnvironment,
	createServerEnvironment,
}: {
	createPrerenderEnvironment?: (
		server: ViteDevServer,
		name: string,
	) => DevEnvironment | Promise<DevEnvironment>;
	createServerEnvironment: (
		server: ViteDevServer,
		name: string,
	) => DevEnvironment | Promise<DevEnvironment>;
}): Plugin {
	const runners = {} as Record<
		"ssr" | "server",
		ReturnType<typeof createServerModuleRunner>
	>;

	type CachedPromise<T> = Promise<T> & {
		status: "pending" | "fulfilled" | "rejected";
		value?: unknown;
		reason?: unknown;
	};
	const serverModulePromiseCache = new Map<string, CachedPromise<unknown>>();
	const clientModulePromiseCache = new Map<string, CachedPromise<unknown>>();

	return {
		name: "hattip-rsc-dev-server",
		configEnvironment(name, env) {
			switch (name) {
				case "ssr":
					return {
						dev: {
							createEnvironment: createPrerenderEnvironment,
						},
					};
				case "server":
					return {
						dev: {
							createEnvironment: createServerEnvironment,
						},
					};
			}
		},
		config(c, env) {
			process.env = { ...process.env, ...loadEnv(env.mode, process.cwd(), "") };
		},
		async configureServer(server) {
			runners.ssr = createServerModuleRunner(server.environments.ssr);
			runners.server = createServerModuleRunner(server.environments.server);

			const prerenderInput = server.environments.ssr.options.build.rollupOptions
				.input as Record<string, string>;
			const prerenderEntry = prerenderInput.index;
			if (!prerenderEntry) {
				throw new Error(
					"No entry file found for ssr environment, please specify one in vite.config.ts under environments.ssr.build.rollupOptions.input.index",
				);
			}

			const serverInput = server.environments.server.options.build.rollupOptions
				.input as Record<string, string>;
			const serverEntry = serverInput.index;
			if (!serverEntry) {
				throw new Error(
					"No entry file found for server environment, please specify one in vite.config.ts under environments.server.build.rollupOptions.input.index",
				);
			}

			const { createMiddleware } = await import("@hattip/adapter-node");

			global.__vite_server_manifest__ = {
				resolveClientReferenceMetadata(clientReference) {
					const id = clientReference.$$id;
					const idx = id.lastIndexOf("#");
					const exportName = id.slice(idx + 1);
					const fullURL = id.slice(0, idx);
					return [fullURL, exportName];
				},
				resolveServerReference(_id: string) {
					const idx = _id.lastIndexOf("#");
					const exportName = _id.slice(idx + 1);
					const id = _id.slice(0, idx);
					return {
						preloadModule() {
							if (serverModulePromiseCache.has(id)) {
								return serverModulePromiseCache.get(id) as CachedPromise<void>;
							}
							const promise = runners.server
								.import(id)
								.then((mod) => {
									promise.status = "fulfilled";
									promise.value = mod;
								})
								.catch((res) => {
									promise.status = "rejected";
									promise.reason = res;
									throw res;
								}) as CachedPromise<void>;
							promise.status = "pending";
							serverModulePromiseCache.set(id, promise);
							return promise;
						},
						requireModule() {
							const cached = serverModulePromiseCache.get(id);
							if (!cached) throw new Error(`Module ${id} not found`);
							if (cached.reason) throw cached.reason;
							return (cached.value as Record<string, unknown>)[exportName];
						},
					};
				},
			};

			global.__vite_client_manifest__ = {
				resolveClientReference([id, exportName]) {
					return {
						preloadModule() {
							if (clientModulePromiseCache.has(id)) {
								return clientModulePromiseCache.get(id) as CachedPromise<void>;
							}
							const promise = runners.ssr
								.import(id)
								.then((mod) => {
									promise.status = "fulfilled";
									promise.value = mod;
								})
								.catch((res) => {
									promise.status = "rejected";
									promise.reason = res;
									throw res;
								}) as CachedPromise<void>;
							promise.status = "pending";
							clientModulePromiseCache.set(id, promise);
							return promise;
						},
						requireModule() {
							const cached = clientModulePromiseCache.get(id);
							if (!cached) throw new Error(`Module ${id} not found`);
							if (cached.reason) throw cached.reason;
							return (cached.value as Record<string, unknown>)[exportName];
						},
					};
				},
			};

			return () => {
				server.middlewares.use(async (req, res, next) => {
					try {
						const { ssr: prerender, server } = runners;

						const [prerenderMod, serverMod] = await Promise.all([
							prerender.import(prerenderEntry),
							server.import(serverEntry),
						]);

						const middleware = createMiddleware(
							(c) => {
								const callServer = (request: Request) => {
									return serverMod.default({ ...c, request });
								};

								return prerenderMod.default(c, {
									bootstrapModules: [
										"/@vite/client",
										"/@id/virtual:browser-entry",
									],
									bootstrapScriptContent: `
                    window.__vite_client_manifest__ = {
                      _cache: new Map(),
                      resolveClientReference([id, exportName]) {
                        return {
                          preloadModule() {
                            if (window.__vite_client_manifest__._cache.has(id)) {
                              return window.__vite_client_manifest__._cache.get(id);
                            }
                            const promise = import(id)
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
									callServer,
								});
							},
							{
								alwaysCallNext: false,
							},
						);

						if (req.originalUrl !== req.url) {
							req.url = req.originalUrl;
						}
						await middleware(req, res, next);
					} catch (reason) {
						next(reason);
					}
				});
			};
		},
		hotUpdate(ctx) {
			const ids: string[] = [];
			const cwd = process.cwd();
			for (const mod of ctx.modules) {
				if (mod.id) {
					ids.push(mod.id);
					const toDelete = `/${path.relative(cwd, mod.id)}`;
					clientModulePromiseCache.delete(toDelete);
					serverModulePromiseCache.delete(toDelete);
				}
			}

			if (ids.length > 0) {
				switch (ctx.environment.name) {
					case "server":
						for (const id of ids) {
							if (ctx.environment.moduleGraph.getModuleById(id)) {
								runners.server.moduleCache.invalidateDepTree([id]);
							}
						}
						break;
					case "ssr":
						for (const id of ids) {
							if (ctx.environment.moduleGraph.getModuleById(id)) {
								runners.ssr.moduleCache.invalidateDepTree([id]);
							}
						}
						break;
				}
			}

			if (
				ctx.environment.name === "client" &&
				ids.some(
					(id) =>
						!!ctx.server.environments.server.moduleGraph.getModuleById(id),
				)
			) {
				ctx.environment.hot.send("react-server:update", {
					ids,
				});
				return [];
			}
		},
	};
}
