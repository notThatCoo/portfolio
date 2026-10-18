import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// The wasm runtime is self-hosted under /ort/<version>/ (see scripts/copy-ort.mjs).
const require = createRequire(import.meta.url);
const ortDir = dirname(dirname(require.resolve("onnxruntime-web/ort-wasm-simd-threaded.wasm")));
const ortVersion: string = JSON.parse(readFileSync(join(ortDir, "package.json"), "utf8")).version;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  poweredByHeader: false,
  env: { NEXT_PUBLIC_ORT_VERSION: ortVersion },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The model and ONNX Runtime binaries are content-addressed by version.
        source: "/(models|ort)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

// Plugins are passed by name so Turbopack can load them (functions can't cross into Rust).
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
