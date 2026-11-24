// Ngôn ngữ thị giác — máy canh trong `npm test` (ADR-0234 Đ5a). Đếm GIÁ TRỊ viết thẳng trong tệp kiểu: màu ở token gốc, màu viết thẳng ngoài `:root`,
// cỡ chữ, bo góc, kiểu bóng. Mỗi con số có trần, TRẦN CHỈ ĐƯỢC HẠ (khuôn ADR-0222 Đ7a, bài `src/khung-goc.test.ts`). Cấm `color-mix()`.
// Phép đếm: `scripts/giao-dien/dem-thi-giac.mjs`. Thứ trình duyệt vẽ ra (chữ đậm, nút nền đặc, màu tiền, bóng trên khối) do `npm run do-khung` đo (Đ5b).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demThiGiac } from "../scripts/giao-dien/dem-thi-giac.mjs";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const so = demThiGiac(css);

/** TRẦN CHỈ ĐƯỢC HẠ. Màn cần giá trị mới thì sửa bộ chung ở `:root` (đổi giá trị một token đang có), không thêm màu, cỡ chữ, bo góc, bóng cho một màn.
 *  Đo trên mã trước đợt gốc, 24/11/2026: 60 · 3 · 13 · 12 · 23. Sau đợt gốc (cùng ngày): 45 · 1 · 7 · 10 · 22. */
const TRAN = { mauToken: 45, mauNgoaiRoot: 1, coChu: 7, boGoc: 10, bong: 22 };
/** Thang chữ sáu cỡ đã duyệt (ADR-0234 «Ghi lúc chép» mục 1). Mọi bậc --fs-step-* phải là một trong sáu cỡ này. */
const THANG_CHU = ["12px", "14px", "16px", "18px", "24px", "32px"];
const NHAC = "Trần chỉ được hạ, không nâng (ADR-0234 Đ2, Đ5a). Dùng token có sẵn ở :root; cần giá trị mới thì đổi bộ chung, không thêm cho một màn.";

test("số màu viết thẳng ở token gốc không vượt trần", () => {
  assert.ok(so.mauToken <= TRAN.mauToken, `${so.mauToken} màu khác nhau ở token :root > trần ${TRAN.mauToken}. ${NHAC}`);
});

test("số chỗ viết thẳng màu NGOÀI :root không vượt trần", () => {
  assert.ok(so.mauNgoaiRoot <= TRAN.mauNgoaiRoot, `${so.mauNgoaiRoot} chỗ viết thẳng màu ngoài :root > trần ${TRAN.mauNgoaiRoot}:\n${so.mauNgoaiMau.join("\n")}\nDùng var(--c-…). ${NHAC}`);
});

test("số cỡ chữ không vượt trần", () => {
  assert.ok(so.coChu <= TRAN.coChu, `${so.coChu} cỡ chữ (${so.coChuGiaTri.join(" ")}) > trần ${TRAN.coChu}. Dùng --fs-step-* hay token cỡ chữ có sẵn. ${NHAC}`);
});

test("số kiểu bo góc không vượt trần", () => {
  assert.ok(so.boGoc <= TRAN.boGoc, `${so.boGoc} kiểu bo góc (${so.boGocGiaTri.join(" ")}) > trần ${TRAN.boGoc}. Dùng --radius-sm, --radius-md, --radius-pill. ${NHAC}`);
});

test("số kiểu bóng không vượt trần", () => {
  assert.ok(so.bong <= TRAN.bong, `${so.bong} kiểu bóng viết thẳng > trần ${TRAN.bong}. Khối phẳng: viền --ring-card; lớp nổi: --shadow-overlay, --shadow-float. ${NHAC}`);
});

test("không dùng color-mix()", () => {
  assert.equal(so.colorMix, 0, "color-mix() không chạy trên trình duyệt cũ (đặc tả 2/10, ADR-0234): dùng một token màu có sẵn.");
});

test("mọi bậc --fs-step-* thuộc thang sáu cỡ 12 · 14 · 16 · 18 · 24 · 32", () => {
  const ngoai = Object.entries(so.thangChu).filter(([, v]) => !THANG_CHU.includes(String(v)));
  assert.ok(Object.keys(so.thangChu).length >= 6, "phép đếm hỏng: không thấy thang --fs-step-*");
  assert.deepEqual(ngoai, [], `bậc ngoài thang sáu cỡ (ADR-0234): ${ngoai.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
});
