// HÀNG RÀO "NỐI DÂY" của form Tạo đơn gọn cho Đối tác (đặt vé của đối tác, lượt 1, Task 1). Luật thuần (src/shared/form-dat-ve.ts) chỉ chứng minh RẰNG luật đúng;
// không ai kiểm được nó có được GỌI. Bài này quét mã nguồn giao diện (đã che chú thích, giữ chuỗi) và đỏ khi một dây bị đứt: form lập đơn không còn hỏi luật thuần xem
// có dùng form gọn không, thẻ dịch vụ không còn ẩn "Thông tin chuyến" / không còn dựng dòng Ghi chú, ô giảm giá không còn đổi chữ gợi ý.
// Giới hạn: canh QUÊN, không canh CỐ Ý; QUÉT MÃ NGUỒN, không kiểm hành vi chạy (cần Chrome thật — kịch bản doi-tac-lap-don-smoke.mjs; việc giữ nguyên giá trị nháp cũ khi không gõ do bước 3g của kịch bản đó canh, ngoài `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("form lập đơn hỏi luật thuần formGonDoiTac(staff) và truyền cờ vào thẻ dịch vụ", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /\bformGon\s*=\s*formGonDoiTac\(staff\)/, "order-form.ts gán formGon = formGonDoiTac(staff)");
  assert.match(form, /createServiceCard\(\{[\s\S]*?\bformGonDoiTac:\s*formGon\s*,/, "order-form.ts truyền CHÍNH cờ formGon (không phải hằng) vào createServiceCard");
});

test("thẻ dịch vụ: ẩn khối Thông tin chuyến theo cờ và dựng dòng Ghi chú với chữ gợi ý của luật thuần", () => {
  const the = doc("web/service-card.ts");
  assert.match(the, /tripDetails\.hidden\s*=\s*o\.formGonDoiTac/, "tripDetails.hidden đặt theo o.formGonDoiTac");
  assert.match(the, /placeholder:\s*GOI_Y_GHI_CHU_DOI_TAC/, "ô ghi chú gọn đặt placeholder bằng GOI_Y_GHI_CHU_DOI_TAC (không chỉ import)");
  assert.match(the, /"data-trip-gon":\s*"note"/, "ô ghi chú gọn có data-trip-gon=note (kịch bản Chrome dựa vào)");
});

test("ô giảm giá của form lập đơn dùng chữ gợi ý của luật thuần", () => {
  assert.match(doc("web/order-form.ts"), /placeholder\s*=\s*GOI_Y_GIAM_GIA_DOI_TAC/, "ô giảm giá đặt placeholder bằng GOI_Y_GIAM_GIA_DOI_TAC (không chỉ import)");
});

// Năm chỗ bài trên từng để lọt (người kiểm độc lập, 2/11): truyền cờ là hằng, điều kiện bị thay bằng `false`, mất tên cho trình đọc màn hình của ô giảm giá, hạ trần ô Ghi chú,
// ô Ghi chú ghi đè trường khác của chuyến. Mỗi mẫu dưới đây đã được thử bằng sửa cố ý (đỏ) rồi hoàn nguyên (xanh) — xem sổ hàng rào (docs/SO-HANG-RAO.md).
test("ô giảm giá: khối chỉnh ô chạy CHỈ khi formGon, đặt cả chữ gợi ý lẫn tên cho trình đọc màn hình (aria-label) bằng chữ của luật thuần", () => {
  assert.match(
    doc("web/order-form.ts"),
    /\bif\s*\(\s*formGon\s*\)\s*\{[^}]*?\.placeholder\s*=\s*GOI_Y_GIAM_GIA_DOI_TAC\s*;[^}]*?\.setAttribute\(\s*"aria-label"\s*,\s*GOI_Y_GIAM_GIA_DOI_TAC\s*\)/,
    "khối `if (formGon) { … }` phải đặt placeholder VÀ aria-label của ô giảm giá",
  );
});

/** Phần thuộc tính của ô Ghi chú gọn trong service-card.ts: object của lời gọi `h("input", {…})` có `"data-trip-gon": "note"`. */
const thuocTinhOGhiChu = (): string => {
  const m = doc("web/service-card.ts").match(/h\("input",\s*\{([^}]*"data-trip-gon":\s*"note"[^}]*)\}/);
  assert.ok(m, "service-card.ts dựng ô Ghi chú gọn bằng h(\"input\", {…, \"data-trip-gon\": \"note\"})");
  return m[1]!;
};

test("ô Ghi chú gọn: trần độ dài là MAX_GHI_CHU_DICH_VU (một trần, bằng trần máy chủ), hiện ghiChuMotDong(note) chứ không phải chuỗi thô", () => {
  const tt = thuocTinhOGhiChu();
  assert.deepEqual(tt.match(/maxLength\s*:\s*[^,]+/g)?.map((x) => x.replace(/\s+/g, " ")), ["maxLength: MAX_GHI_CHU_DICH_VU"], "đúng MỘT maxLength và là hằng của luật thuần");
  assert.match(tt, /\bvalue\s*:\s*ghiChuMotDong\(\s*draft\.trip\.note\s*\)/, "giá trị lúc dựng đi qua ghiChuMotDong (ghi chú cũ nhiều dòng không bị gộp mất xuống dòng)");
  assert.match(doc("web/service-card.ts"), /\bsync\(\s*oGhiChuGon\s*,\s*ghiChuMotDong\(\s*d\.trip\.note\s*\)\s*\)/, "chỗ gán lại ô khi vẽ lại cũng đi qua ghiChuMotDong");
});

test("ô Ghi chú gọn: chỉ MỘT chỗ gọi commit, ở sự kiện input, và chỉ đổi trip.note (mọi trường chuyến khác giữ nguyên) — không gõ thì dữ liệu cũ không bị đụng", () => {
  const the = doc("web/service-card.ts");
  assert.match(
    the,
    /oGhiChuGon\.addEventListener\(\s*"input"\s*,\s*\(\)\s*=>\s*commit\(\s*\{\s*\.\.\.draft\s*,\s*trip\s*:\s*\{\s*\.\.\.draft\.trip\s*,\s*note\s*:\s*oGhiChuGon\.value\s*\}\s*\}\s*\)\s*\)/,
    "commit({ ...draft, trip: { ...draft.trip, note: oGhiChuGon.value } }) — không thêm, không bớt trường nào",
  );
  assert.equal(the.match(/oGhiChuGon\.addEventListener\(/g)?.length, 1, "ô Ghi chú gọn chỉ có một bộ lắng nghe sự kiện");
  assert.equal(the.match(/commit\([^)]*oGhiChuGon/g)?.length, 1, "chỉ một lời gọi commit nhắc tới ô Ghi chú gọn");
});
