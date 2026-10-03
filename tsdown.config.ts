import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { index: "src/index.ts" },
	outDir: "dist",
	format: "esm",
	platform: "node",
	dts: false,
	// Actions runs dist/index.mjs with no node_modules, so the detector is inlined.
	deps: {
		alwaysBundle: ["@unveil/interlinked"],
		onlyBundle: ["@unveil/interlinked"],
	},
});
