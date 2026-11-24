// HÀNG RÀO KHO ẢNH BÀN GIAO (ADR-0232 Đ3, Đ5–Đ7; Hiến chương 5.22; khuôn src/kho-tep-bien-lai.test.ts). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/anh-ban-giao/ (không kể *.test.ts) nhắc binding ANH_BAN_GIAO — trừ ĐÚNG MỘT dòng của gốc lắp ráp src/index.ts truyền kho cho
//       hàm xoá kho theo phiếu (biến thể 7B); chỉ repository.ts của module ghi bảng abg_photo / abg_erasure_request;
//   (2) xem ảnh lớn và danh sách ảnh nhỏ: hỏi ô order.photo.view → ghi nhật ký → MỚI đọc kho; trong module chỉ MỘT chỗ đọc kho (kho-anh.ts);
//   (3) tải: chặn Content-Length TRƯỚC khi đọc thân; ô order.photo.upload trước lô; lô D1 TRƯỚC khi đặt kho; chỉ MỘT tệp đặt kho (kho-anh.ts);
//   (4) xoá: hỏi ô order.photo.purge → lô D1 quyết gỡ → MỚI xoá kho; chỉ MỘT chỗ xoá kho (kho-anh.ts); không lệnh nào bật khoá giữ (bucket lock) của R2.
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
const TEP = tepTs(SRC).map((p) => ({ p: relative(SRC, p).replaceAll("\\", "/"), src: readFileSync(p, "utf8") }));
const MOD = TEP.filter((f) => f.p.startsWith("modules/anh-ban-giao/"));
const boChuThich = (s: string) => s.split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");

test("(1) binding ANH_BAN_GIAO chỉ ở module anh-ban-giao (+ đúng một dòng của gốc lắp ráp); chỉ repository.ts ghi bảng abg_*", () => {
  const ngoai = TEP.filter((f) => /\bANH_BAN_GIAO\b/.test(boChuThich(f.src)) && !f.p.startsWith("modules/anh-ban-giao/")).map((f) => f.p);
  assert.deepEqual(ngoai, ["index.ts"], "tệp ngoài module chạm kho Ảnh bàn giao");
  const goc = boChuThich(TEP.find((f) => f.p === "index.ts")!.src).split("\n").filter((d) => /\bANH_BAN_GIAO\b/.test(d));
  assert.equal(goc.length, 1, "gốc lắp ráp chỉ truyền kho cho đúng một hàm");
  assert.match(goc[0]!, /xoaKhoAnhTheoPhieu\(env\.DB, env\.ANH_BAN_GIAO, phieuId\)/);
  assert.ok(MOD.some((f) => /\benv\.ANH_BAN_GIAO\b/.test(f.src)), "chống bài rỗng");
  const ghi = TEP.filter((f) => /\b(INSERT\s+INTO|UPDATE)\s+abg_(photo|erasure_request)\b/.test(f.src)).map((f) => f.p);
  assert.deepEqual(ghi, ["modules/anh-ban-giao/repository.ts"]);
});

const INDEX = readFileSync(new URL("./modules/anh-ban-giao/index.ts", import.meta.url), "utf8");
function thanRoute(method: string, path: string): string {
  const dau = INDEX.indexOf(`route("${method}", "${path}"`);
  assert.ok(dau !== -1, `không thấy route ${method} ${path}`);
  const sau = INDEX.indexOf('route("', dau + 10);
  return boChuThich(INDEX.slice(dau, sau === -1 ? undefined : sau));
}
const vt = (s: string, x: string) => s.indexOf(x);
const dem = (re: RegExp) => MOD.reduce((n, f) => n + (boChuThich(f.src).match(re)?.length ?? 0), 0);
const tepCo = (re: RegExp) => MOD.filter((f) => re.test(boChuThich(f.src))).map((f) => f.p);

test("(2) xem: ô order.photo.view → ghi nhật ký → MỚI đọc kho (ảnh lớn và danh sách ảnh nhỏ); chỉ MỘT chỗ đọc kho (kho-anh.ts)", () => {
  for (const path of ["/api/anh-ban-giao/anh/:anhId", "/api/anh-ban-giao/don/:orderId"]) {
    const s = thanRoute("GET", path);
    const [o, nk, doc] = [vt(s, 'can(staff, "order.photo.view"'), vt(s, "auditStatement("), vt(s, "docAnh(")];
    assert.ok(o !== -1 && nk !== -1 && doc !== -1, `${path}: thiếu một trong ba mốc`);
    assert.ok(o < nk && nk < doc, `${path}: thứ tự sai: ô=${o}, nhật ký=${nk}, đọc kho=${doc}`);
  }
  // Mọi `.get(` trừ đọc header và tra bảng tên trong bộ nhớ (Map) — bất kể tên biến kho (bài học kiểm độc lập 28/10 C1).
  const GET_KHO = /(?<!headers|ten)\.get\(/g;
  assert.equal(dem(GET_KHO), 1, "chỗ đọc kho thứ hai trong module — phải đi qua cùng cổng nhật ký");
  assert.deepEqual(tepCo(/(?<!headers|ten)\.get\(/), ["modules/anh-ban-giao/kho-anh.ts"]);
});

test("(3) tải: chặn cỡ TRƯỚC đọc thân; ô order.photo.upload TRƯỚC lô; lô D1 TRƯỚC đặt kho; chỉ kho-anh.ts đặt kho", () => {
  const s = thanRoute("POST", "/api/anh-ban-giao/don/:orderId");
  const [co, than, o, lo, dat] = [vt(s, "TOI_DA_THAN_ANH_BAN_GIAO"), vt(s, "readJson("), vt(s, 'can(staff, "order.photo.upload"'), vt(s, "env.DB.batch("), vt(s, "datAnh(")];
  assert.ok([co, than, o, lo, dat].every((x) => x !== -1), "thiếu mốc");
  assert.ok(co < than && o < lo && lo < dat, `thứ tự sai: cỡ=${co}, thân=${than}, ô=${o}, lô=${lo}, đặt=${dat}`);
  assert.deepEqual(tepCo(/\.put\(/), ["modules/anh-ban-giao/kho-anh.ts"]);
});

test("(4) xoá: ô order.photo.purge → lô D1 → MỚI xoá kho; chỉ kho-anh.ts xoá kho; không chỗ nào bật khoá giữ R2", () => {
  const s = thanRoute("POST", "/api/anh-ban-giao/anh/:anhId/xoa");
  const [o, lo, xoa] = [vt(s, 'can(staff, "order.photo.purge")'), vt(s, "env.DB.batch("), vt(s, "xoaAnhKhoiKho(")];
  assert.ok(o !== -1 && lo !== -1 && xoa !== -1, "thiếu một trong ba mốc");
  assert.ok(o < lo && lo < xoa, `thứ tự sai: ô=${o}, lô=${lo}, xoá kho=${xoa}`);
  assert.deepEqual(tepCo(/\.delete\(/), ["modules/anh-ban-giao/kho-anh.ts"]);
  const cauHinh = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.ok(!/bucket[ _-]?lock|lock_rules|retention/i.test(cauHinh.split("\n").filter((d) => !d.trim().startsWith("//")).join("\n")), "ADR-0232 Đ3: không bật khoá giữ R2");
});
