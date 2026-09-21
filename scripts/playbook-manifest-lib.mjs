// Bản ghim playbook/ (ADR-0012): liệt kê tệp và sinh manifest băm. Hàm thuần — dùng cho scripts/pin-playbook-manifest.mjs (ghi)
// và src/standards.test.ts (kiểm), cùng mẫu với scripts/data-dictionary-lib.mjs.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const MANIFEST_NAME = ".PINNED_SHA256";

/** Mọi tệp thường trong `dir` (đường dẫn tương đối, dấu `/`), trừ `.DS_Store` và chính manifest ở gốc; sắp theo byte. Gặp symlink/mục lạ thì ném lỗi. */
export function listPinnedFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        if (e.name !== ".DS_Store" && !(d === dir && e.name === MANIFEST_NAME)) out.push(relative(dir, p).split(sep).join("/"));
      } else throw new Error(`Mục không phải tệp thường trong bản ghim: ${p}`);
    }
  };
  walk(dir);
  return out.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

export const sha256Of = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Nội dung manifest theo định dạng `shasum -a 256 -c`: `<64 hex>␠␠<đường dẫn>` mỗi dòng, kết thúc bằng xuống dòng. */
export function renderManifest(dir) {
  return listPinnedFiles(dir).map((f) => `${sha256Of(join(dir, f))}  ${f}\n`).join("");
}
