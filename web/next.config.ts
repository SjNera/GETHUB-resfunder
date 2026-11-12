import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Old demo URLs → the Answer / Publish structure
  async redirects() {
    return [
      { source: "/dashboard", destination: "/publish", permanent: false },
      { source: "/surveys/:id/review", destination: "/publish/:id/review", permanent: false },
      { source: "/surveys/:id/:section(log|fund|edit|review)", destination: "/publish/:id/:section", permanent: false },
      { source: "/surveys/:id", destination: "/publish/:id", permanent: false },
      { source: "/s/:id/answer", destination: "/answer/:id/q", permanent: false },
      { source: "/s/:id/r/:rid", destination: "/answer/:id/r/:rid", permanent: false },
      { source: "/s/:id", destination: "/answer/:id", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
