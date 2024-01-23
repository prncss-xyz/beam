/* v8 ignore start  */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  ignorePatterns: ["coverage", "dist"],
  incremental: true,
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
    prioritizePerformanceOverAccuracy: true,
  },
};
export default config;
