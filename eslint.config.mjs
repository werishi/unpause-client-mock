import coreWebVitals from "eslint-config-next/core-web-vitals";

// Reused in the domain-purity block below.
// Flat config is last-write-wins per rule ID, so combining both invariants into one
// config object for lib/domain/ is required — a separate object would silently drop these.
const dataAccessPatterns = [
  {
    group: ["@/data", "@/data/*", "@/data/**"],
    message: "Access data only via @/lib/repo/ — direct @/data/ imports bypass the repo layer.",
  },
  {
    group: [
      "../data", "../data/*", "../data/**",
      "../../data", "../../data/*", "../../data/**",
      "../../../data", "../../../data/*", "../../../data/**",
      "../../../../data", "../../../../data/*", "../../../../data/**",
    ],
    message: "Access data only via @/lib/repo/ — relative imports into data/ bypass the repo layer.",
  },
];

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Globally ignore build output. .next/ and out/ are produced by next build.
  // Do not delete these folders; ignore them.
  { ignores: ["out/**", ".next/**"] },
  ...coreWebVitals,

  // Profile invariant (targets/unpause-client-mock/PROJECT_PROFILE.md): pages/components access
  // data only via lib/repo/; direct imports bypass it.
  // lib/domain/ is excluded here because flat config overrides by rule id — the combined block
  // below handles both invariants for that subtree so neither is silently dropped.
  {
    ignores: ["lib/repo/**", "lib/domain/**", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: dataAccessPatterns }],
    },
  },

  // Profile invariant: lib/domain/ is pure TS — no React, Next, or data-layer deps.
  // Pure domain keeps Vitest (Node env) able to load domain functions without a browser.
  // Data-access patterns are re-applied here (see note above on flat-config override behaviour).
  {
    files: ["lib/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "lib/domain/ must be pure TS — no React." },
            { name: "react-dom", message: "lib/domain/ must be pure TS — no React." },
            { name: "next", message: "lib/domain/ must be pure TS — no Next.js." },
          ],
          patterns: [
            { group: ["next/*"], message: "lib/domain/ must be pure TS — no Next.js." },
            { group: ["@/lib/store/*"], message: "lib/domain/ must be pure TS — no store." },
            { group: ["@/lib/repo/*"], message: "lib/domain/ must be pure TS — no repo layer." },
            ...dataAccessPatterns,
          ],
        },
      ],
    },
  },
];
export default config;
