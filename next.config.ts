import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Both loopback names are used by IDE previews and local browser testing.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve("."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
