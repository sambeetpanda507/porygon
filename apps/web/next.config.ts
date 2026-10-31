import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@p0rygon/icons", "@p0rygon/canvas", "@p0rygon/simulator", "@p0rygon/ui"],
};

export default nextConfig;
