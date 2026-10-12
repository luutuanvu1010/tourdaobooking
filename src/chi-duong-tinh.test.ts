// HÀNG RÀO TĨNH "CHỈ ĐƯỜNG" (ADR-0105 bài kiểm 5; kế hoạch `docs/superpowers/plans/2026-10-08-adr-0105-ke-hoach.md` T5, T6 — NT-11).
// Nút "Chỉ đường" chỉ là LIÊN KẾT `<a>` mang một chuỗi đích sang Google Maps / Apple Maps khi tài xế bấm. Bài này canh bốn điều:
//   (1) trang không đọc vị trí: không tệp `web/**/*.ts` hay `public/*.html` nào nhắc `geolocation` (ngoài chú thích);
//   (2) `public/_headers` vẫn tự cấm vị trí (`geolocation=()`), CSP không mở miền bản đồ nào (không nhúng bản đồ, không gọi từ trang), vẫn `form-action 'self'`;
//   (3) hai địa chỉ gốc bản đồ chỉ được viết ở MỘT chỗ — `src/shared/chi-duong.ts` (hàm `lienKetChiDuong`); không `maps.googleapis.com`, không `mapkit`;
//   (4) mọi liên kết bản đồ ở `web/` (`h("a", { …, "data-ban-do": … })`) mở tab mới với `rel: "noreferrer noopener"`; chỉ màn tài xế gọi `nutChiDuongCuaDiem(`.
// Quét trên mã ĐÃ CHE CHÚ THÍCH (giữ chuỗi — địa chỉ gốc là chuỗi). Giới hạn: canh QUÊN, không canh CỐ Ý — không bắt liên kết dựng bằng biến trung gian / nối chuỗi
// động, không bắt `window.open`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
function tepTs(thuMuc: string, boTest: boolean): string[] {
  const ra: string[] = [];
  for (const f of readdirSync(thuMuc)) {
    const p = join(thuMuc, f);
    if (statSync(p).isDirectory()) ra.push(...tepTs(p, boTest));
    else if (f.endsWith(".ts") && !f.endsWith(".d.ts") && !(boTest && f.endsWith(".test.ts"))) ra.push(p);
  }
  return ra;
}
const WEB = tepTs(join(ROOT, "web"), true);
const SRC = tepTs(join(ROOT, "src"), true);
const HTML = readdirSync(join(ROOT, "public")).filter((f) => f.endsWith(".html")).map((f) => join(ROOT, "public", f));
const maTs = (p: string) => maskSource(readFileSync(p, "utf8"), { strings: false, comments: true });
const maHtml = (p: string) => readFileSync(p, "utf8").replace(/<!--[\s\S]*?-->/g, "");
const dem = (s: string, can: string) => s.split(can).length - 1;

test("chỉ đường (1): không tệp web/**/*.ts hay public/*.html nào đọc vị trí (`geolocation`, ngoài chú thích)", () => {
  assert.ok(WEB.length + HTML.length >= 30, `chống bài rỗng: quét ${WEB.length + HTML.length} tệp`);
  const loi = [...WEB.filter((p) => maTs(p).includes("geolocation")), ...HTML.filter((p) => maHtml(p).includes("geolocation"))].map(rel);
  assert.deepEqual(loi, [], "trang đọc vị trí tài xế — ADR-0105 mục 4: Nền tảng không gửi vị trí, giữ `geolocation=()`");
});

test("chỉ đường (2): public/_headers vẫn cấm vị trí, CSP không mở miền bản đồ (default/connect/script/frame/img), vẫn form-action 'self'", () => {
  const h = readFileSync(join(ROOT, "public/_headers"), "utf8");
  const pp = h.split("\n").find((l) => /^\s*Permissions-Policy:/.test(l));
  assert.ok(pp, "thiếu dòng Permissions-Policy");
  assert.match(pp!, /geolocation=\(\)/, "Permissions-Policy phải giữ geolocation=()");
  const csp = h.split("\n").find((l) => /^\s*Content-Security-Policy:/.test(l));
  assert.ok(csp, "thiếu dòng Content-Security-Policy");
  const chiThi = new Map(csp!.replace(/^\s*Content-Security-Policy:\s*/, "").split(";").map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map((x) => [x[0]!, x.slice(1)]));
  for (const ten of ["default-src", "connect-src", "script-src", "frame-src", "img-src"]) {
    const lo = (chiThi.get(ten) ?? []).filter((t) => /google|apple|mapkit/i.test(t));
    assert.deepEqual(lo, [], `${ten} mở miền bản đồ — ADR-0105 mục 4: không nhúng bản đồ, không gọi từ trang`);
  }
  assert.deepEqual(chiThi.get("form-action"), ["'self'"], "form-action phải giữ 'self' (nút là liên kết, không phải form)");
});

test("chỉ đường (3): hai địa chỉ gốc bản đồ chỉ ở src/shared/chi-duong.ts (mỗi chuỗi đúng một lần); không maps.googleapis.com, không mapkit", () => {
  const tep = [...SRC, ...WEB].map((p) => ({ f: rel(p), m: maTs(p) })).concat(HTML.map((p) => ({ f: rel(p), m: maHtml(p) })));
  for (const can of ["google.com/maps", "maps.apple.com"]) {
    const noi = tep.flatMap((t) => Array.from({ length: dem(t.m, can) }, () => t.f));
    assert.deepEqual(noi, ["src/shared/chi-duong.ts"], `${can} xuất hiện ${noi.length} lần (${noi.join(", ") || "không chỗ nào"}) — chỉ được một lần, ở src/shared/chi-duong.ts`);
  }
  for (const cam of ["maps.googleapis.com", "mapkit"]) {
    const noi = tep.filter((t) => t.m.toLowerCase().includes(cam)).map((t) => t.f);
    assert.deepEqual(noi, [], `${cam} không được xuất hiện (ADR-0105: không khoá dịch vụ, không nhúng bản đồ)`);
  }
});

/** Tách đối số của lời gọi bắt đầu ngay sau dấu "(" ở vị trí `mo` (đếm ngoặc) — khuôn `doiSo` của src/hanh-khach-khong-lo-ten.test.ts. */
function doiSo(code: string, mo: number): string[] {
  const ra: string[] = [];
  let sau = 0;
  let dau = mo;
  for (let i = mo; i < code.length; i++) {
    const c = code[i]!;
    if (c === "(" || c === "[" || c === "{") sau++;
    else if (c === ")" || c === "]" || c === "}") {
      if (sau === 0) {
        ra.push(code.slice(dau, i).trim());
        return ra;
      }
      sau--;
    } else if (c === "," && sau === 0) {
      ra.push(code.slice(dau, i).trim());
      dau = i + 1;
    }
  }
  throw new Error("không đóng ngoặc");
}

test("chỉ đường (4): mọi liên kết bản đồ ở web/ (h(\"a\", { …\"data-ban-do\"… })) có target _blank + rel noreferrer noopener; chỉ web/cuoc-chuyen.ts gọi nutChiDuongCuaDiem(", () => {
  const loi: string[] = [];
  let soLienKet = 0;
  const goiNut = new Set<string>();
  for (const p of WEB) {
    const code = maTs(p);
    const f = rel(p);
    if (/\bnutChiDuongCuaDiem\(/.test(code)) goiNut.add(f);
    for (const m of code.matchAll(/\bh\(\s*"a"\s*,/g)) {
      const thuocTinh = doiSo(code, code.indexOf("(", m.index!) + 1)[1] ?? "";
      if (!thuocTinh.includes('"data-ban-do"')) continue;
      soLienKet++;
      if (!/\brel:\s*"noreferrer noopener"/.test(thuocTinh)) loi.push(`${f}: liên kết bản đồ thiếu rel: "noreferrer noopener"`);
      if (!/\btarget:\s*"_blank"/.test(thuocTinh)) loi.push(`${f}: liên kết bản đồ thiếu target: "_blank"`);
    }
  }
  assert.ok(soLienKet >= 1, "không có liên kết bản đồ nào ở web/ (chống bài rỗng — nhóm Chỉ đường của màn tài xế)");
  assert.deepEqual(loi, []);
  assert.deepEqual([...goiNut].sort(), ["web/cuoc-chuyen.ts"], "chỉ màn tài xế dựng nút chỉ đường");
});
