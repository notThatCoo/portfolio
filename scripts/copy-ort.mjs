// Copies the ONNX Runtime Web wasm binary into public/ under a versioned path,
// so it's self-hosted (no CDN) and can be cached as immutable.
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// package.json isn't in the exports map; resolve a public file and walk up from dist/.
const pkgDir = dirname(dirname(require.resolve("onnxruntime-web/ort-wasm-simd-threaded.wasm")));
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const outRoot = join(process.cwd(), "public", "ort");
const out = join(outRoot, version);

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  copyFileSync(join(pkgDir, "dist", file), join(out, file));
}
console.log(`onnxruntime-web ${version} → public/ort/${version}/`);
