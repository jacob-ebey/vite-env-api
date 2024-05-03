import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { createNodeDevEnvironment, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import {
	createReactServerOptions,
	reactServerBuilder,
	reactServerDevServer,
	reactServerPlugin,
} from "@framework/vite";

import packageJSON from "./package.json" assert { type: "json" };

const options = createReactServerOptions();

export default defineConfig({
	builder: reactServerBuilder(options),
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
		reactServerPlugin(options),
		reactServerDevServer({
			...options,
			createPrerenderEnvironment: createNodeDevEnvironment,
			createServerEnvironment: createNodeDevEnvironment,
		}),
	],
});
