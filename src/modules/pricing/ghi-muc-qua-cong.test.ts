// ADR-0161 Đ3, Đ4 (kế hoạch 2026-11-03-chinh-sach-chiet-khau-bon-truc, Task 2) — RÀO QUÉT CHỮ canh QUÊN GỌI cổng: mọi route (và hàm trợ giúp) của `pricing` có nhắc một trong ba câu ghi dòng mức mới
// (`insertRuleStatement`, `cauDoiMuc`, `cauSuaMuc` — ở repository.ts) PHẢI có chữ `kiemSoMucMoi(` trong cùng thân route. Thêm một route ghi mức mới mà QUÊN gọi cổng ⇒ đỏ ngay.
// Bài này CHỈ canh quên gọi. Nó KHÔNG kiểm: lời gọi đứng TRƯỚC câu ghi, kết quả cổng có được dùng để dừng (`if (chanSo) return chanSo`), cổng được gọi với đúng đối số, hay một lời gọi nằm trong nhánh
// không bao giờ chạy. Những điều đó dựa vào bài hành vi qua route thật (`gioi-han-nhap.test.ts`) và người đọc mã. Chú thích hay chuỗi nhắc `kiemSoMucMoi(` không đánh lừa được (chú thích bị che,
// định nghĩa hàm không tính là lời gọi). Cách quét: chữ nguồn, tách theo `route("`, mỗi khúc là thân MỘT route (khúc đầu = phần trước route đầu tiên: hàm trợ giúp). Tệp không có `route("`
// mà nhắc các câu ghi thì cả tệp phải có lời gọi cổng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { maskSource } from "../../../scripts/source-mask-lib.mjs";

const THU_MUC = fileURLToPath(new URL(".", import.meta.url));
const CAU_GHI_MUC = ["insertRuleStatement(", "cauDoiMuc(", "cauSuaMuc("] as const;
const CONG = "kiemSoMucMoi(";

/** Bỏ chú thích (giữ chuỗi để còn tách theo `route("`) và bỏ chỗ ĐỊNH NGHĨA hàm cổng — chỉ lời GỌI mới tính. */
const sach = (nguon: string): string => (maskSource(nguon, { strings: false }) as string).replace(/function\s+kiemSoMucMoi\s*\(/g, "function");

/** Trả danh sách chỗ ghi mức thiếu cổng: mỗi phần tử mô tả khúc vi phạm. Rỗng = sạch. */
export function choGhiThieuCong(nguon: string, tenTep: string): string[] {
  const text = sach(nguon);
  const co = (t: string) => CAU_GHI_MUC.some((c) => t.includes(c));
  if (!text.includes('route("')) return co(text) && !text.includes(CONG) ? [`${tenTep}: nhắc câu ghi mức mà cả tệp không gọi ${CONG}`] : [];
  const loi: string[] = [];
  text.split('route("').forEach((khuc, i) => {
    if (!co(khuc) || khuc.includes(CONG)) return;
    const m = /^([A-Z]+)", "([^"]+)"/.exec(khuc);
    const nhan = i === 0 || !m ? "phần trước route đầu tiên (hàm trợ giúp)" : `route ${m[1]} ${m[2]}`;
    loi.push(`${tenTep}: ${nhan} gọi câu ghi mức mà không gọi ${CONG}`);
  });
  return loi;
}

test("mọi route ghi mức của pricing có lời gọi cổng kiemSoMucMoi (giới hạn nhập + vượt giá bán) — chỉ canh quên gọi", () => {
  const tep = readdirSync(THU_MUC).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "repository.ts").sort();
  assert.ok(tep.includes("index.ts"), "phải quét được index.ts của pricing");
  const nguonIndex = readFileSync(join(THU_MUC, "index.ts"), "utf8");
  // Có răng ở chỗ thật: index.ts hôm nay có đủ bốn route ghi mức, mỗi route một lời gọi cổng (số lời GỌI = số route ghi mức).
  const soCauGhi = sach(nguonIndex).split('route("').filter((k, i) => i > 0 && CAU_GHI_MUC.some((c) => k.includes(c))).length;
  assert.ok(soCauGhi >= 4, `index.ts phải có ít nhất 4 route ghi mức (thấy ${soCauGhi}) — bài quét không được mù`);
  const loi = tep.flatMap((f) => choGhiThieuCong(readFileSync(join(THU_MUC, f), "utf8"), f));
  assert.deepEqual(loi, [], "route ghi mức nào cũng phải đi qua kiemSoMucMoi — thêm lời gọi ngay trước lô ghi");
});

test("bài quét có răng: khúc ghi mức thiếu cổng, hàm trợ giúp thiếu cổng, tệp không có route thiếu cổng ⇒ báo; có cổng, chú thích, tên định nghĩa hàm ⇒ không tính", () => {
  const dung = 'const a = 1;\nroute("POST", "/x", "office", async () => { const c = await kiemSoMucMoi(db, m, pv); const r = insertRuleStatement(db); });\n';
  assert.deepEqual(choGhiThieuCong(dung, "x.ts"), []);
  const thieu = 'route("POST", "/x", "office", async () => { const r = cauDoiMuc(db); });\nroute("POST", "/y", "office", async () => { await kiemSoMucMoi(); cauSuaMuc(); });\n';
  const b = choGhiThieuCong(thieu, "x.ts");
  assert.equal(b.length, 1, b.join(" | "));
  assert.match(b[0]!, /\/x/);
  assert.equal(choGhiThieuCong('// kiemSoMucMoi( chỉ là chú thích\nroute("POST", "/x", "office", async () => { cauSuaMuc(db); });\n', "x.ts").length, 1, "chú thích nhắc cổng không tính");
  assert.equal(choGhiThieuCong('async function kiemSoMucMoi(db) {}\nroute("POST", "/x", "office", async () => { cauSuaMuc(db); });\n', "x.ts").length, 1, "định nghĩa hàm cổng không phải lời gọi");
  assert.equal(choGhiThieuCong('async function themTay(db) { insertRuleStatement(db); }\nasync function kiemSoMucMoi(db) {}\nroute("GET", "/z", "office", async () => 1);\n', "x.ts").length, 1, "hàm trợ giúp ngoài route thiếu cổng");
  assert.equal(choGhiThieuCong("export const f = () => cauSuaMuc(db);\n", "y.ts").length, 1, "tệp không có route mà nhắc câu ghi mức");
  assert.deepEqual(choGhiThieuCong("export const f = () => { kiemSoMucMoi(db); return cauSuaMuc(db); };\n", "y.ts"), []);
  assert.deepEqual(choGhiThieuCong("export const g = 1; // cauSuaMuc( trong chú thích\n", "y.ts"), [], "chú thích nhắc câu ghi không tính là chỗ ghi");
});
