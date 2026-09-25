import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the root: a stray package-lock.json in the home directory otherwise
  // makes Next infer the wrong workspace root.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
