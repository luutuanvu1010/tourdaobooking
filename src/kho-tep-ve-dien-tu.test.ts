// HÀNG RÀO KHO TỆP VÉ ĐIỆN TỬ (ADR-0153 Đ1 mục 7 — ĐỀ XUẤT chờ chủ duyệt; Hiến chương 5.22; khuôn src/kho-tep-ho-tro.test.ts). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/ve-dien-tu/ (không kể *.test.ts) nhắc tới binding VE_DIEN_TU;
//   (2) trong ve-dien-tu chỉ MỘT chỗ đặt kho và MỘT chỗ xoá kho; đặt kho chỉ sau khi ĐỌC LẠI dòng vé có thật từ D1 (khoá kho lấy từ D1, không từ đầu vào);
//   (3) không có đường dẫn ký sẵn nào (đã canh cho toàn src/ ở src/kho-tep-ho-so.test.ts).
// Task 6 (route xem ảnh) khi thêm đường ĐỌC kho phải thêm vào đây bài «hỏi quyền → ghi nhật ký → mới đọc kho» như (2) của src/kho-tep-ho-tro.test.ts.
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
const VE = TEP.filter((f) => f.p.startsWith("modules/ve-dien-tu/"));
/** Bỏ dòng chú thích TOÀN DÒNG (chú thích nhắc tên hàm kho bằng chữ không được tính). */
const maChay = (s: string) => s.split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");
const dem = (re: RegExp) => VE.reduce((n, f) => n + (maChay(f.src).match(re)?.length ?? 0), 0);

test("(1) binding VE_DIEN_TU không được nhắc ngoài src/modules/ve-dien-tu/", () => {
  const ngoai = TEP.filter((f) => /\bVE_DIEN_TU\b/.test(f.src) && !f.p.startsWith("modules/ve-dien-tu/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài ve-dien-tu chạm kho vé điện tử");
  assert.ok(VE.length > 0, "chống bài rỗng: đọc được tệp của module");
});

test("(2) trong ve-dien-tu chỉ MỘT chỗ đặt kho, MỘT chỗ xoá kho; đặt kho chỉ sau khi đọc lại dòng vé từ D1", () => {
  assert.equal(dem(/\.put\(/g), 1, "chỗ đặt kho thứ hai — phải có tên ở đây");
  assert.equal(dem(/\bkho\.delete\(/g), 1);
  const kho = maChay(VE.find((f) => f.p === "modules/ve-dien-tu/kho-tep.ts")!.src);
  const [doc, dat] = [kho.indexOf("listVeChoDat("), kho.indexOf("kho.put(")];
  assert.ok(doc !== -1 && dat !== -1 && doc < dat, `đặt kho phải đứng sau đọc lại D1: đọc=${doc}, đặt=${dat}`);
});

test("(3) không URL ký sẵn / đường dẫn công khai tới kho trong ve-dien-tu", () => {
  assert.equal(dem(/createPresignedUrl|getSignedUrl|presign/gi), 0);
});
