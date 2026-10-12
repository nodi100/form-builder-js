import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm"],
  dts: true,
  sourcemap: true,
  target: "es2022",
  external: ["react", "react-hook-form", "@hookform/resolvers", "zod"],
};

export default defineConfig([
  // core: no React, must NOT be marked "use client" so servers can call it
  {
    ...shared,
    entry: { index: "src/index.ts" },
  },
  // React entry gets "use client" so Next.js server components can render it
  {
    ...shared,
    entry: { "react/index": "src/react/index.ts" },
    banner: { js: '"use client";' },
  },
]);
