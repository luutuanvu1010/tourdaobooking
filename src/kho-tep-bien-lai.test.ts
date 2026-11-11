// HÀNG RÀO KHO ẢNH BIÊN LAI CHUYỂN KHOẢN (ADR-0196 Đ4, Đ6, Đ7; Hiến chương 5.22; khuôn src/kho-tep-ho-tro.test.ts của ADR-0144). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/billing/ (không kể *.test.ts) nhắc tới binding BIEN_LAI; chỉ billing ghi bảng bil_receipt_proof (bài kiến trúc lo phần tiền tố bil_);
//   (2) xem ảnh: hỏi ô payment.proof.view → ghi nhật ký → MỚI đọc kho; trong billing chỉ MỘT chỗ đọc kho ảnh;
//   (3) ghi khoản thu kèm ảnh: chặn Content-Length TRƯỚC khi đọc thân (route); lô D1 TRƯỚC khi đặt kho (ghiLanThu); trong billing chỉ MỘT chỗ đặt kho, nằm ở kho-bien-lai.ts;
//   (4) gỡ ảnh: hỏi ô payment.proof.purge → lô D1 quyết xoá → MỚI xoá kho; trong billing chỉ MỘT chỗ xoá kho, nằm ở kho-bien-lai.ts.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (đổi tên biến, gọi qua hàm trung gian ở tệp khác của billing vẫn qua) — đọc mã vẫn là việc của người kiểm.
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
const BILLING = TEP.filter((f) => f.p.startsWith("modules/billing/"));
const boChuThich = (s: string) => s.split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");

test("(1) binding BIEN_LAI chỉ được nhắc trong src/modules/billing/; chỉ billing ghi bil_receipt_proof", () => {
  const ngoai = TEP.filter((f) => /\bBIEN_LAI\b/.test(f.src) && !f.p.startsWith("modules/billing/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài billing chạm kho ảnh biên lai");
  assert.ok(BILLING.some((f) => /\benv\.BIEN_LAI\b/.test(f.src)), "chống bài rỗng: billing có dùng binding");
  const ghi = TEP.filter((f) => /\b(INSERT\s+INTO|UPDATE)\s+bil_receipt_proof\b/.test(f.src)).map((f) => f.p);
  assert.deepEqual(ghi, ["modules/billing/bien-lai-repo.ts"], "câu ghi bảng ảnh chỉ ở bien-lai-repo.ts");
});

const INDEX = readFileSync(new URL("./modules/billing/index.ts", import.meta.url), "utf8");
function thanRoute(method: string, path: string): string {
  const dau = INDEX.indexOf(`route("${method}", "${path}"`);
  assert.ok(dau !== -1, `không thấy route ${method} ${path}`);
  const sau = INDEX.indexOf("route(\"", dau + 10);
  return boChuThich(INDEX.slice(dau, sau === -1 ? undefined : sau));
}
const vt = (s: string, x: string) => s.indexOf(x);
const dem = (re: RegExp) => BILLING.reduce((n, f) => n + (boChuThich(f.src).match(re)?.length ?? 0), 0);

test("(2) xem ảnh: ô payment.proof.view → ghi nhật ký → MỚI đọc kho; trong billing chỉ MỘT chỗ đọc kho ảnh", () => {
  const s = thanRoute("GET", "/api/orders/:id/payments/:receiptId/bien-lai");
  const [o, nk, doc] = [vt(s, 'can(staff, "payment.proof.view"'), vt(s, "auditStatement("), vt(s, "kho.get(")];
  assert.ok(o !== -1 && nk !== -1 && doc !== -1, "thiếu một trong ba mốc");
  assert.ok(o < nk && nk < doc, `thứ tự sai: ô=${o}, nhật ký=${nk}, đọc kho=${doc}`);
  assert.equal(dem(/\bkho\.get\(/g), 1, "đường đọc kho ảnh thứ hai trong billing — phải đi qua cùng cổng nhật ký");
});

test("(3) ghi khoản thu kèm ảnh: chặn Content-Length TRƯỚC khi đọc thân; lô D1 TRƯỚC khi đặt kho; trong billing chỉ MỘT chỗ đặt kho (kho-bien-lai.ts)", () => {
  const s = thanRoute("POST", "/api/orders/:id/payments");
  assert.ok(vt(s, "TOI_DA_THAN_KHOAN_THU_CO_ANH") !== -1 && vt(s, "TOI_DA_THAN_KHOAN_THU_CO_ANH") < vt(s, "readJson("), "chặn cỡ phải đứng trước đọc thân");
  const svc = readFileSync(new URL("./modules/billing/service.ts", import.meta.url), "utf8");
  const ham = boChuThich(/export async function ghiLanThu\([\s\S]*?\n\}\n/.exec(svc)?.[0] ?? "");
  assert.ok(vt(ham, "db.batch(") !== -1 && vt(ham, "datBienLai(") !== -1 && vt(ham, "db.batch(") < vt(ham, "datBienLai("), "ghiLanThu: lô D1 phải đứng trước đặt kho");
  // Đếm MỌI lời gọi `.put(` trong billing, bất kể tên biến (bài học kiểm độc lập 28/10 C1).
  assert.equal(dem(/\.put\(/g), 1, "chỗ đặt kho thứ hai trong billing — phải có tên ở đây");
  assert.equal(BILLING.filter((f) => /\.put\(/.test(boChuThich(f.src))).map((f) => f.p)[0], "modules/billing/kho-bien-lai.ts");
});

test("(4) gỡ ảnh: ô payment.proof.purge → lô D1 quyết xoá → MỚI xoá kho; trong billing chỉ MỘT chỗ xoá kho (kho-bien-lai.ts)", () => {
  const s = thanRoute("POST", "/api/orders/:id/payments/:receiptId/bien-lai/go");
  const [o, lo, xoa] = [vt(s, 'can(staff, "payment.proof.purge")'), vt(s, "env.DB.batch("), vt(s, "xoaBienLaiKhoiKho(")];
  assert.ok(o !== -1 && lo !== -1 && xoa !== -1, "thiếu một trong ba mốc");
  assert.ok(o < lo && lo < xoa, `thứ tự sai: ô=${o}, lô=${lo}, xoá kho=${xoa}`);
  assert.equal(dem(/\bkho\.delete\(/g), 1);
  assert.equal(BILLING.filter((f) => /\bkho\.delete\(/.test(boChuThich(f.src))).map((f) => f.p)[0], "modules/billing/kho-bien-lai.ts");
});
