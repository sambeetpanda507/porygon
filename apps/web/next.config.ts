import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@porygon/icons", "@porygon/canvas", "@porygon/simulator", "@porygon/ui"],
};

export default nextConfig;
