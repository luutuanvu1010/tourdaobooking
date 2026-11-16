// Tập route đóng của người đăng ký (ADR-0206 Đ6): mọi tệp dưới src/ gọi `docPhienDangKy` phải nằm đúng trong danh sách này.
// Thêm route dùng cookie đăng ký ⇒ thêm tệp vào đây (có chủ ý); lọt thêm tệp lạ hoặc mất tệp ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");

/** Các tệp (ngoài phien.ts và bài kiểm) gọi docPhienDangKy. Các task sau thêm. */
const ROUTE_DANG_KY: readonly string[] = ["src/modules/dang-ky/tep-route.ts", "src/modules/dang-ky/phieu-route.ts", "src/modules/dang-ky/kich-hoat-route.ts"]; // POST /api/dang-ky/phieu/tep (ADR-0208 Đ2); GET, PUT /phieu, POST /phieu/gui, /phieu/rut (ADR-0206 Đ6); POST /phieu/dat-pin (ADR-0207 Đ7, Task 9)

function tep(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tep(p) : p.endsWith(".ts") ? [p] : [];
  });
}

test("chỉ đúng danh sách tệp khai mới gọi docPhienDangKy (ADR-0206 Đ6)", () => {
  const goi = tep(SRC)
    .map((p) => relative(ROOT, p).split(sep).join("/"))
    .filter((p) => !p.endsWith(".test.ts") && p !== "src/modules/dang-ky/phien.ts")
    .filter((p) => /\bdocPhienDangKy\b/.test(readFileSync(join(ROOT, p), "utf8")));
  assert.deepEqual(goi.sort(), [...ROUTE_DANG_KY].sort());
});

// Mọi route dùng cookie đăng ký (gọi docPhienDangKy, hoặc gọi hàm xử lý xuất từ tệp có gọi) phải khai `access: "public"`: cổng là cookie đăng ký, kiểm trong thân route; khai cổng
// khác (office, staff…) là bắt người chưa có tài khoản qua cửa nhân viên — hoặc tệ hơn, cấp quyền nhân viên bằng cookie đăng ký.
test("mọi route gọi docPhienDangKy đều khai access \"public\"", () => {
  const tepGoi = ROUTE_DANG_KY.map((p) => ({ p, src: readFileSync(join(ROOT, p), "utf8") }));
  const tenXuat = tepGoi.flatMap((t) => [...t.src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1]!));
  assert.ok(tenXuat.length > 0, "chống bài rỗng: có hàm xử lý xuất");
  const dung: string[] = [];
  const hong: string[] = [];
  for (const mod of readdirSync(join(SRC, "modules"))) {
    const f = join(SRC, "modules", mod, "index.ts");
    let text: string;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    const cac = [...text.matchAll(/route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/g)];
    cac.forEach((m, i) => {
      const than = text.slice(m.index!, cac[i + 1]?.index ?? text.length);
      if (!/\bdocPhienDangKy\b/.test(than) && !tenXuat.some((n) => new RegExp(`\\b${n}\\b`).test(than))) return;
      dung.push(`${m[1]} ${m[2]}`);
      if (m[3] !== "public") hong.push(`${m[1]} ${m[2]} khai "${m[3]}"`);
    });
  }
  assert.ok(dung.length >= 1, "chống bài rỗng: tìm thấy route dùng cookie đăng ký");
  assert.deepEqual(hong, []);
});
