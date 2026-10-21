import type { NextConfig } from "next";

// dev.local must be listed here so Next.js 16.3.8 allows cross-origin dev
// resources (HMR WebSocket) when the dev server is opened via https://dev.local.
const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.local"],
  // Dev-tools indicator off at the user's request; runtime error overlays still show (no config switch).
  devIndicators: false,
  // output: "export" produces the out/ directory of static HTML/CSS/JS.
  // trailingSlash makes every route route/index.html, which plain static servers
  // (npx serve, python -m http.server) resolve for /route/ without rewrite rules.
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
