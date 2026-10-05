// HÀNG RÀO H2 (ADR-0094 đ1, T6): mọi route GHI có đăng nhập đi qua lớp vé. Router áp lớp cho mọi route ghi `access ≠ "public"` không có trong tệp miễn
// (src/shared/lan-gui-mien.ts) — nên "lọt lớp" chỉ xảy ra qua hai cửa, bài này canh cả hai:
//   (1) đổi một route ghi sang `"public"`: tập route ghi công khai phải BẰNG ĐÚNG 5 route `auth` đã biết ∪ mục miễn `congKhai: true`;
//   (2) tệp miễn: mỗi mục phải khớp một route ghi có thật (mục ma ⇒ đỏ) và có lý do.
// Bóc route bằng cùng khuôn `route("METHOD", "path", "access"` của src/route-write-guard.test.ts; số route bóc được phải bằng số lời gọi `route(` (khuôn lạ ⇒ đỏ).
// Giới hạn: canh QUÊN, không canh CỐ Ý (vd sửa router bỏ lớp — đó là việc của H1 và người kiểm đọc mã).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { LAN_GUI_MIEN } from "./shared/lan-gui-mien.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const GHI = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CONG_KHAI_DA_BIET = ["POST /api/auth/login", "POST /api/auth/passkey/options", "POST /api/auth/passkey/login", "POST /api/auth/logout", "POST /api/auth/session-ended"];

function routes(): { method: string; path: string; access: string }[] {
  const out: { method: string; path: string; access: string }[] = [];
  for (const mod of readdirSync(join(SRC, "modules")).sort()) {
    const f = join(SRC, "modules", mod, "index.ts");
    if (!existsSync(f)) continue;
    const text = readFileSync(f, "utf8");
    const khai = (maskSource(text).match(/\broute\(/g) ?? []).length;
    const boc = [...text.matchAll(/route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/g)];
    assert.equal(boc.length, khai, `${mod}/index.ts: ${khai} lời gọi route( nhưng bóc được ${boc.length}`);
    for (const h of boc) out.push({ method: h[1]!, path: h[2]!, access: h[3]! });
  }
  return out;
}

test("H2 (1): route ghi công khai = đúng 5 route auth đã biết ∪ mục miễn congKhai — đổi route ghi sang public mà không khai ⇒ đỏ", () => {
  const congKhai = routes().filter((r) => GHI.has(r.method) && r.access === "public").map((r) => `${r.method} ${r.path}`).sort();
  const choPhep = [...CONG_KHAI_DA_BIET, ...LAN_GUI_MIEN.filter((m) => m.congKhai).map((m) => `${m.method} ${m.path}`)].sort();
  assert.deepEqual(congKhai, choPhep, "route ghi công khai không có trong danh sách — route này sẽ KHÔNG đi qua lớp chống ghi trùng");
});

test("H2 (2): mỗi mục tệp miễn khớp một route ghi có thật, có lý do; không trùng mục", () => {
  const co = new Set(routes().filter((r) => GHI.has(r.method)).map((r) => `${r.method} ${r.path}`));
  const da = new Set<string>();
  for (const m of LAN_GUI_MIEN) {
    const k = `${m.method} ${m.path}`;
    assert.ok(co.has(k), `mục miễn "${k}" không khớp route ghi nào (mục ma)`);
    assert.ok(m.lyDo.trim().length > 0, `mục miễn "${k}" thiếu lý do`);
    assert.ok(!da.has(k), `mục miễn "${k}" trùng`);
    da.add(k);
  }
});

test("H2 (3): router đọc ĐÚNG tệp miễn này và áp lớp theo access ≠ public", () => {
  const r = maskSource(readFileSync(join(SRC, "shared/router.ts"), "utf8"), { strings: false });
  assert.match(r, /import \{ laMienLanGui \} from "\.\/lan-gui-mien\.ts";/);
  assert.match(r, /if \(!WRITE_METHODS\.has\(request\.method\) \|\| !who \|\| laMienLanGui\(request\.method, hit\.r\.path\)\) return chayHandler\(env\);/);
  assert.equal(routes().filter((x) => GHI.has(x.method) && x.access !== "public").length, 143, "số route ghi có đăng nhập đổi — cập nhật số này có chủ đích (L0: 129; gộp main a6fd0a3d: +2 lịch xe bận POST …/xe/:id/ban, …/ban/:bid/rut = 131; gộp vào Đợt 4 tiền xe thuê 5/10: +10 — bang-gia, bang-gia/:id/ket-thuc, tuyen, tuyen/:code, co-xe, co-xe/:code, bốn lệnh chuyen/:id/chi-phi/* = 141; gộp Đợt 4 vào Đợt 5 (dot5-sau-dot4): +2 xe đang chạy POST …/chuyen/:id/them-diem, …/phan-bo/:aid/bao-huy = 143)");
});
