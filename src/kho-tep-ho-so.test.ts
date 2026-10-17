// HÀNG RÀO KHO TỆP HỒ SƠ (ADR-0123; Hiến chương 5.22; kế hoạch 2026-10-16-goi-2-h2-kho-tep). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/parties/ (không kể *.test.ts) nhắc tới binding HO_SO — module khác muốn tệp thì gọi hàm công bố của parties;
//   (2) không có đường dẫn ký sẵn (presign / X-Amz-) ở bất kỳ đâu trong src/ — đường dẫn ký sẵn qua mặt can() lúc tải.
// Task 4 thêm (3), (4): thứ tự trong route tải xuống / tải lên.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (đổi tên biến env, gọi qua hàm trung gian ở tệp khác của parties vẫn qua) — đọc mã vẫn là việc của người kiểm.
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

test("(1) binding HO_SO chỉ được nhắc trong src/modules/parties/", () => {
  const ngoai = TEP.filter((f) => /\bHO_SO\b/.test(f.src) && !f.p.startsWith("modules/parties/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài parties chạm kho tệp hồ sơ");
});

test("(2) không có đường dẫn ký sẵn của R2 trong src/", () => {
  const co = TEP.filter((f) => /presign|X-Amz-|createSignedUrl|signedUrl/i.test(f.src)).map((f) => f.p);
  assert.deepEqual(co, []);
});

// (3), (4): thứ tự trong THÂN route. Chỉ bỏ dòng chú thích TOÀN DÒNG (chú thích của route nhắc "kho.get(" / "env.DB.batch(" bằng chữ — không được tính).
const INDEX = readFileSync(new URL("./modules/parties/index.ts", import.meta.url), "utf8");
function thanRoute(method: string, path: string): string {
  const dau = INDEX.indexOf(`route("${method}", "${path}"`);
  assert.ok(dau !== -1, `không thấy route ${method} ${path}`);
  const sau = INDEX.indexOf("route(\"", dau + 10);
  return INDEX.slice(dau, sau === -1 ? undefined : sau).split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");
}
const vt = (s: string, x: string) => s.indexOf(x);

test("(3) tải xuống: hỏi ô → ghi nhật ký → MỚI đọc kho; trong parties chỉ MỘT chỗ đọc kho", () => {
  const s = thanRoute("GET", "/api/parties/:id/documents/:did/tep/:tid");
  const [o, nk, doc] = [vt(s, 'can(staff, "party.attachment.view")'), vt(s, "auditStatement("), vt(s, "kho.get(")];
  assert.ok(o !== -1 && nk !== -1 && doc !== -1, "thiếu một trong ba mốc");
  assert.ok(o < nk && nk < doc, `thứ tự sai: can=${o}, nhật ký=${nk}, đọc kho=${doc}`);
  const soLanDoc = TEP.filter((f) => f.p.startsWith("modules/parties/")).reduce((n, f) => n + (f.src.match(/\bkho\.get\(/g)?.length ?? 0), 0);
  assert.equal(soLanDoc, 1, "đường đọc kho thứ hai trong parties — phải đi qua cùng cổng nhật ký");
});

test("(4) tải lên: chặn Content-Length TRƯỚC khi đọc thân; lô D1 TRƯỚC khi đặt kho; trong src chỉ MỘT chỗ đặt kho", () => {
  const s = thanRoute("POST", "/api/parties/:id/documents/:did/tep");
  assert.ok(vt(s, "TOI_DA_THAN") !== -1 && vt(s, "TOI_DA_THAN") < vt(s, "readJson("), "chặn cỡ phải đứng trước đọc thân");
  assert.ok(vt(s, "env.DB.batch(") !== -1 && vt(s, "env.DB.batch(") < vt(s, "kho.put("), "lô D1 phải đứng trước đặt kho (ruling Q2)");
  const soLanDat = TEP.reduce((n, f) => n + (f.src.match(/\.put\(\s*key\b/g)?.length ?? 0), 0);
  assert.equal(soLanDat, 1);
});

// (5) ADR-0126 đ7 (lát H-5): ngoại lệ có tên duy nhất cho khoá kho ngoài `pty/` — bản ngoài D1 của phiếu xoá `xoa/<mã phiếu>.json`, ghi ở ĐÚNG một hàm (chepBanNgoai, kho-tep.ts) và chỉ chứa
// ba khoá { phieu, hoSo, luc } (mã + thời điểm, không tên / số). Tổng số chỗ ĐẶT vào kho trong src/ = 2 (tải ảnh lên + bản ngoài).
test("(5) khoá kho `xoa/` chỉ xuất hiện trong chepBanNgoai (kho-tep.ts); tổng chỗ đặt vào kho = 2; nội dung bản ngoài đúng ba khoá", () => {
  const coXoa = TEP.filter((f) => /["'`]xoa\//.test(f.src)).map((f) => f.p);
  assert.deepEqual(coXoa, ["modules/parties/kho-tep.ts"]);
  const kho = TEP.find((f) => f.p === "modules/parties/kho-tep.ts")!.src;
  const ham = /export async function chepBanNgoai\b[\s\S]*?\n\}\n/.exec(kho)?.[0] ?? "";
  assert.match(ham, /kho\.put\(`xoa\/\$\{v\.id\}\.json`, JSON\.stringify\(\{ phieu: v\.id, hoSo: v\.partyId, luc: v\.luc \}\)/, "ba khoá, không khoá nào khác");
  const soDat = TEP.reduce((n, f) => n + (f.src.match(/\b(?:kho|r2|HO_SO)\.put\(/g)?.length ?? 0), 0);
  assert.equal(soDat, 2, "chỗ đặt vào kho thứ ba trong src/ — phải có tên ở đây");
});
