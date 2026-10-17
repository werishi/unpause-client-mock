import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/**/*.test.ts"],
    // Node environment: domain tests have no DOM dependency; jsdom is not installed.
    environment: "node",
    // Globals off: injected ambient types conflict with next build's type check (which
    // includes tests/). Tests must import describe/it/expect from "vitest" directly.
    globals: false,
    // Exit zero when no test files exist; the scaffold has no tests yet.
    passWithNoTests: true,
  },
});
