// HÀNG RÀO KHO TỆP VÉ HỖ TRỢ (ADR-0144; Hiến chương 5.22; khuôn src/kho-tep-ho-so.test.ts của ADR-0123). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/feedback/ (không kể *.test.ts) nhắc tới binding HO_TRO;
//   (2) tải xuống: hỏi quyền (quyenPhieu) → ghi nhật ký → MỚI đọc kho; trong feedback chỉ MỘT chỗ đọc kho;
//   (3) gửi tin kèm tệp (hai route): chặn Content-Length TRƯỚC khi đọc thân; lô D1 TRƯỚC khi đặt kho; trong feedback chỉ MỘT chỗ đặt kho;
//   (4) gỡ tệp: hỏi ô feedback.triage → lô D1 quyết xoá → MỚI xoá kho.
// Không có đường dẫn ký sẵn: đã canh cho TOÀN src/ ở src/kho-tep-ho-so.test.ts (2); chỗ đặt kho ngoài parties / feedback: (6) của bài đó.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (đổi tên biến, gọi qua hàm trung gian ở tệp khác của feedback vẫn qua) — đọc mã vẫn là việc của người kiểm.
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
const FEEDBACK = TEP.filter((f) => f.p.startsWith("modules/feedback/"));

test("(1) binding HO_TRO chỉ được nhắc trong src/modules/feedback/", () => {
  const ngoai = TEP.filter((f) => /\bHO_TRO\b/.test(f.src) && !f.p.startsWith("modules/feedback/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài feedback chạm kho tệp vé hỗ trợ");
  assert.ok(FEEDBACK.some((f) => /\benv\.HO_TRO\b/.test(f.src)), "chống bài rỗng: feedback có dùng binding");
});

// Thân route: chỉ bỏ dòng chú thích TOÀN DÒNG (chú thích nhắc "kho.get(" bằng chữ không được tính).
const INDEX = readFileSync(new URL("./modules/feedback/index.ts", import.meta.url), "utf8");
function thanRoute(method: string, path: string): string {
  const dau = INDEX.indexOf(`route("${method}", "${path}"`);
  assert.ok(dau !== -1, `không thấy route ${method} ${path}`);
  const sau = INDEX.indexOf("route(\"", dau + 10);
  return INDEX.slice(dau, sau === -1 ? undefined : sau).split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");
}
const vt = (s: string, x: string) => s.indexOf(x);
const dem = (re: RegExp) => FEEDBACK.reduce((n, f) => n + (f.src.match(re)?.length ?? 0), 0);

test("(2) tải xuống: quyenPhieu → ghi nhật ký → MỚI đọc kho; trong feedback chỉ MỘT chỗ đọc kho", () => {
  const s = thanRoute("GET", "/api/feedback/:id/tep/:tid");
  const [q, nk, doc] = [vt(s, "quyenPhieu("), vt(s, "auditStatement("), vt(s, "kho.get(")];
  assert.ok(q !== -1 && nk !== -1 && doc !== -1, "thiếu một trong ba mốc");
  assert.ok(q < nk && nk < doc, `thứ tự sai: quyền=${q}, nhật ký=${nk}, đọc kho=${doc}`);
  assert.equal(dem(/\bkho\.get\(/g), 1, "đường đọc kho thứ hai trong feedback — phải đi qua cùng cổng nhật ký");
});

test("(3) gửi tin kèm tệp: chặn Content-Length TRƯỚC khi đọc thân; lô D1 TRƯỚC khi đặt kho; trong feedback chỉ MỘT chỗ đặt kho", () => {
  for (const [m, p] of [["POST", "/api/feedback"], ["POST", "/api/feedback/:id/messages"]] as const) {
    const s = thanRoute(m, p);
    assert.ok(vt(s, "TOI_DA_THAN_TIN_CO_TEP") !== -1 && vt(s, "TOI_DA_THAN_TIN_CO_TEP") < vt(s, "readJson("), `${p}: chặn cỡ phải đứng trước đọc thân`);
    assert.ok(vt(s, "env.DB.batch(") !== -1 && vt(s, "datTepCuaTin(") !== -1 && vt(s, "env.DB.batch(") < vt(s, "datTepCuaTin("), `${p}: lô D1 phải đứng trước đặt kho`);
  }
  assert.equal(dem(/\bkho\.put\(/g), 1, "chỗ đặt kho thứ hai trong feedback — phải có tên ở đây");
});

test("(4) gỡ tệp: ô feedback.triage → lô D1 quyết xoá → MỚI xoá kho; trong feedback chỉ MỘT chỗ xoá kho", () => {
  const s = thanRoute("POST", "/api/feedback/:id/tep/:tid/go");
  const [o, lo, xoa] = [vt(s, 'can(staff, "feedback.triage")'), vt(s, "env.DB.batch("), vt(s, "xoaKhoiKho(")];
  assert.ok(o !== -1 && lo !== -1 && xoa !== -1, "thiếu một trong ba mốc");
  assert.ok(o < lo && lo < xoa, `thứ tự sai: ô=${o}, lô=${lo}, xoá kho=${xoa}`);
  assert.equal(dem(/\bkho\.delete\(/g), 1);
});
