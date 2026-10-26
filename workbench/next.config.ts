import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  basePath: "/workbench",
  poweredByHeader: false,
  turbopack: { root: path.resolve(process.cwd(), "..") },
};

export default config;
