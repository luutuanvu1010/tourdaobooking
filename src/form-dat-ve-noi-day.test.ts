// HÀNG RÀO "NỐI DÂY" của form Tạo đơn gọn cho Đối tác (đặt vé của đối tác, lượt 1, Task 1). Luật thuần (src/shared/form-dat-ve.ts) chỉ chứng minh RẰNG luật đúng;
// không ai kiểm được nó có được GỌI. Bài này quét mã nguồn giao diện (đã che chú thích, giữ chuỗi) và đỏ khi một dây bị đứt: form lập đơn không còn hỏi luật thuần xem
// có dùng form gọn không, thẻ dịch vụ không còn ẩn "Thông tin chuyến" / không còn dựng dòng Ghi chú, ô giảm giá không còn đổi chữ gợi ý.
// Giới hạn: canh QUÊN, không canh CỐ Ý; không chứng minh giao diện chạy đúng (cần Chrome thật — kịch bản doi-tac-lap-don-smoke.mjs, chạy ở Task 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const doc = (tep: string): string => maskSource(readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8"), { strings: false, comments: true });

test("form lập đơn hỏi luật thuần formGonDoiTac(staff) và truyền cờ vào thẻ dịch vụ", () => {
  const form = doc("web/order-form.ts");
  assert.match(form, /formGonDoiTac\(staff\)/, "order-form.ts gọi formGonDoiTac(staff)");
  assert.match(form, /createServiceCard\(\{[\s\S]*?formGonDoiTac:/, "order-form.ts truyền formGonDoiTac vào createServiceCard");
});

test("thẻ dịch vụ: ẩn khối Thông tin chuyến theo cờ và dựng dòng Ghi chú với chữ gợi ý của luật thuần", () => {
  const the = doc("web/service-card.ts");
  assert.match(the, /tripDetails\.hidden\s*=\s*o\.formGonDoiTac/, "tripDetails.hidden đặt theo o.formGonDoiTac");
  assert.match(the, /GOI_Y_GHI_CHU_DOI_TAC/, "thẻ dùng GOI_Y_GHI_CHU_DOI_TAC");
  assert.match(the, /"data-trip-gon":\s*"note"/, "ô ghi chú gọn có data-trip-gon=note (kịch bản Chrome dựa vào)");
});

test("ô giảm giá của form lập đơn dùng chữ gợi ý của luật thuần", () => {
  assert.match(doc("web/order-form.ts"), /GOI_Y_GIAM_GIA_DOI_TAC/, "order-form.ts dùng GOI_Y_GIAM_GIA_DOI_TAC");
});
