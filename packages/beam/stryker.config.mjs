/* v8 ignore start  */
const config = {
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  ignorePatterns: ["coverage", "dist", "tmp"],
  incremental: false,
  ignoreStatic: false,
  testRunner_comment:
    "Take a look at (missing 'homepage' URL in package.json) for information about the vitest plugin.",
  coverageAnalysis: "perTest",
  plugins: [
    "@stryker-mutator/vitest-runner",
    "@stryker-mutator/typescript-checker",
  ],
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: false,
  },
};
export default config;
