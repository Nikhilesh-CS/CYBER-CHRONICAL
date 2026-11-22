import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/CYBER-CHRONICAL";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  ...(process.platform === "win32" ? { experimental: { workerThreads: true, cpus: 1 } } : {}),
};

export default nextConfig;
