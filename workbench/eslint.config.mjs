import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Local Blob URLs and canvas previews are not served by the image optimizer.
  { rules: { "@next/next/no-img-element": "off" } },
  { files: ["*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  globalIgnores([".next/**", "next-env.d.ts", "out/**"]),
]);
