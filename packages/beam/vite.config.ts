/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";
import TurboConsole from "unplugin-turbo-console/vite";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    TurboConsole({}),
  ],
  test: {
    globals: true,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "beam",
      formats: ["es", "umd"],
      // the proper extensions will be added
      fileName: (format) => `beam.${format}.js`,
    },
  },
});
