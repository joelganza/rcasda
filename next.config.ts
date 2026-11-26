import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep tracing inside this application. A parent workspace lockfile exists
  // above the project and must not become the inferred deployment root.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
