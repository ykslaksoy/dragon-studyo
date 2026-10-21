import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transformers.js / ORT are browser-only; keep them out of the Node bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  turbopack: {},
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
