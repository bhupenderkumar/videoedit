import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for tiny Docker images (Hugging Face Spaces)
  output: "standalone",
  serverExternalPackages: ["sharp"],
  // Increase max body size for video uploads (default is 4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
