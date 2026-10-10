import path from "node:path";
import type { NextConfig } from "next";

// This app is one folder of a repository that also holds the API, each with its
// own lockfile. Pinning the root here stops Next.js from guessing it.
const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
