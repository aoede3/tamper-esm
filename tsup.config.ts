import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // Encoder entry points
    "encoders/js/index": "encoders/js/index.ts",
    "encoders/js/env/browser": "encoders/js/env/browser.ts",
    "encoders/js/env/node": "encoders/js/env/node.ts",

    // Decoder entry point
    "clients/js/src/tamper": "clients/js/src/tamper.ts",

    // Core modules
    "encoders/js/core/createEncoder": "encoders/js/core/createEncoder.ts",
    "encoders/js/core/utils": "encoders/js/core/utils.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  treeshake: true,
  minify: false,
  keepNames: true,
});
