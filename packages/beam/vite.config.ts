/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ["**/*.test.ts"],
    }),
  ],
  test: {
    globals: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "beam",
      formats: ["es", "umd"],
      fileName: (format) => `beam.${format}.js`,
    },
  },
});
