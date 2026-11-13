// HÀNG RÀO KHO ẢNH ĐẠI DIỆN DỊCH VỤ (ADR-0201 Đ3; Hiến chương 5.22; khuôn src/kho-tep-bien-lai.test.ts). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/catalog/ (không kể *.test.ts) nhắc tới binding ANH_DICH_VU; chỉ catalog/chi-tiet-repo.ts ghi bảng ctl_service_detail;
//   (2) trong catalog chỉ MỘT chỗ đặt kho và MỘT chỗ đọc kho, cùng nằm ở kho-anh.ts; catalog không xoá gì khỏi kho (ảnh cũ giữ làm lịch sử);
//   (3) tải lên: hỏi admin.manage → chặn Content-Length → đọc thân → đặt kho → lô D1 (đặt kho TRƯỚC lô — lý do ở đầu kho-anh.ts).
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý — đọc mã vẫn là việc của người kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("./", import.meta.url));
function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tepTs(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}
const boChuThich = (s: string) => s.split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");
const TEP = tepTs(SRC).map((p) => ({ p: relative(SRC, p).replaceAll("\\", "/"), src: readFileSync(p, "utf8") }));
const CATALOG = TEP.filter((f) => f.p.startsWith("modules/catalog/"));

test("(1) binding ANH_DICH_VU chỉ được nhắc trong src/modules/catalog/; chỉ chi-tiet-repo.ts ghi ctl_service_detail", () => {
  const ngoai = TEP.filter((f) => /\bANH_DICH_VU\b/.test(f.src) && !f.p.startsWith("modules/catalog/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài catalog chạm kho ảnh dịch vụ");
  assert.ok(CATALOG.some((f) => /\benv\.ANH_DICH_VU\b/.test(f.src)), "chống bài rỗng: catalog có dùng binding");
  const ghi = TEP.filter((f) => /\b(INSERT\s+INTO|UPDATE)\s+ctl_service_detail\b/.test(f.src)).map((f) => f.p);
  assert.deepEqual(ghi, ["modules/catalog/chi-tiet-repo.ts"]);
});

test("(2) trong catalog: một chỗ đặt kho, một chỗ đọc kho, đều ở kho-anh.ts; không xoá kho", () => {
  const dem = (re: RegExp) => CATALOG.map((f) => ({ p: f.p, n: boChuThich(f.src).match(re)?.length ?? 0 })).filter((x) => x.n > 0);
  assert.deepEqual(dem(/\bkho\.put\(/g), [{ p: "modules/catalog/kho-anh.ts", n: 1 }]);
  assert.deepEqual(dem(/\bkho\.get\(/g), [{ p: "modules/catalog/kho-anh.ts", n: 1 }]);
  assert.deepEqual(dem(/\.delete\(/g), [], "catalog không xoá đối tượng kho (ADR-0201 Đ3 mục 2)");
  assert.deepEqual(dem(/\.put\(/g), [{ p: "modules/catalog/kho-anh.ts", n: 1 }], "lời gọi .put( thứ hai trong catalog");
});

test("(3) tải ảnh: admin.manage → chặn Content-Length → đọc thân → đặt kho → lô D1", () => {
  const s = boChuThich(readFileSync(new URL("./modules/catalog/anh-route.ts", import.meta.url), "utf8"));
  const dau = s.indexOf('route("PUT", "/api/catalog/:code/anh"');
  const than = s.slice(dau, s.indexOf('route("GET"', dau));
  const vt = ["can(staff, \"admin.manage\")", "TOI_DA_THAN_ANH", "readJson(", "datAnh(", "env.DB.batch("].map((x) => than.indexOf(x));
  assert.ok(vt.every((x) => x !== -1), `thiếu mốc: ${vt}`);
  assert.deepEqual([...vt].sort((a, b) => a - b), vt, `thứ tự sai: ${vt}`);
});
