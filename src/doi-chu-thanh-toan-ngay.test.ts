// Đổi chữ «Trả trước» → «Thanh toán ngay» (chủ chọn 8/11/2026) CHỈ ở nghĩa «hình thức thanh toán của Đối tác» (NHAN_HINH_THUC). Hai khái niệm khác giữ nguyên chữ:
//   - giai đoạn thu «Trả trước» của danh sách khoản thu (`GIAI_DOAN.PREPAID`, src/modules/billing/service.ts);
//   - «Khách hàng đã trả trước» của biên nhận (src/shared/nhan-tien.ts, order-confirmation.ts).
// Bài khoá cả hai phía + khoá việc radio của form lập đơn nhận chữ từ MỘT hằng (không gõ cứng lần nữa).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NHAN_HINH_THUC } from "./shared/tra-sau.ts";
import { nhanHinhThucDon, CAU_VE_TRA_TRUOC } from "./shared/han-muc-tra-sau-hien-thi.ts";
import { nhanTienDaTra } from "./shared/nhan-tien.ts";

const doc = (tep: string): string => readFileSync(fileURLToPath(new URL(`../${tep}`, import.meta.url)), "utf8");

test("hình thức thanh toán: PREPAID là «Thanh toán ngay» ở nhãn, câu báo và câu nhắc; không còn chữ «Trả trước» ở nghĩa này", () => {
  assert.equal(NHAN_HINH_THUC.PREPAID, "Thanh toán ngay");
  assert.equal(nhanHinhThucDon("PREPAID", null), "Thanh toán ngay");
  // Câu `CAU_TRA_SAU_KHONG_COC` đã bỏ cùng 409 `tra_sau_khong_nhan_coc` (ADR-0197 Đ2: đơn Trả sau nhận lời khai đặt cọc).
  assert.doesNotMatch(doc("src/modules/orders/tra-sau-cong.ts"), /CAU_TRA_SAU_KHONG_COC|tra_sau_khong_nhan_coc/);
  assert.doesNotMatch(CAU_VE_TRA_TRUOC, /[Tt]rả trước/, CAU_VE_TRA_TRUOC);
  assert.match(CAU_VE_TRA_TRUOC, /Thanh toán ngay/);
});

test("radio hình thức thanh toán của form lập đơn không gõ cứng chữ: HTML để chỗ trống, web/order-form.ts đổ chữ từ NHAN_HINH_THUC", () => {
  const html = doc("public/order-form.html");
  assert.match(html, /<input type="radio" name="paymentTerm" value="PREPAID"[^>]*>\s*<span data-nhan-hinh-thuc="PREPAID"><\/span>/);
  assert.doesNotMatch(html, /value="PREPAID"[^>]*>[^<]*(Trả trước|Thanh toán ngay)/, "chữ nằm ở một hằng, không ở HTML");
  const form = doc("web/order-form.ts");
  assert.match(form, /NHAN_HINH_THUC\[v\]/, "form lấy chữ radio từ hằng");
});

test("phía ngược lại KHÔNG đổi: giai đoạn thu «Trả trước» của billing và «Khách hàng đã trả trước» của biên nhận", () => {
  assert.match(doc("src/modules/billing/service.ts"), /PREPAID: "Trả trước"/);
  assert.equal(nhanTienDaTra({ status: "confirmed", deliveredAt: null }).nhan, "Khách hàng đã trả trước");
});
