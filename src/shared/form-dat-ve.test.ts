import { test } from "node:test";
import assert from "node:assert/strict";
import { GOI_Y_GHI_CHU_DOI_TAC, GOI_Y_GIAM_GIA_DOI_TAC, MAX_GHI_CHU_DICH_VU, NHAN_GHI_CHU_DOI_TAC, formGonDoiTac, ghiChuMotDong } from "./form-dat-ve.ts";

test("formGonDoiTac: mọi tài khoản có quyền Đối tác (kể cả lai Bán hàng + Đối tác) dùng form gọn; tài khoản không có quyền Đối tác thì không", () => {
  assert.equal(formGonDoiTac({ permissions: ["PARTNER"] }), true);
  assert.equal(formGonDoiTac({ permissions: ["SALES", "PARTNER"] }), true);
  for (const quyen of [["SALES"], ["INTERN"], ["ADMIN"], ["SUPER_ADMIN"]] as const) {
    assert.equal(formGonDoiTac({ permissions: [...quyen] }), false, `không gọn với ${quyen.join("+")}`);
  }
});

test("chữ của form gọn đúng từng ký tự theo bản thiết kế; trần ghi chú bằng trần của máy chủ (validateTrip: 1000)", () => {
  assert.equal(GOI_Y_GIAM_GIA_DOI_TAC, "Giảm giá cho khách");
  assert.equal(NHAN_GHI_CHU_DOI_TAC, "Ghi chú");
  assert.equal(GOI_Y_GHI_CHU_DOI_TAC, "Thời gian đón");
  assert.equal(MAX_GHI_CHU_DICH_VU, 1000);
});

test("ghiChuMotDong: ô một dòng không được làm «Đón 7h\\n30 khách» liền thành «Đón 7h30 khách» — mỗi cụm xuống dòng (kể cả khoảng trắng hai bên, \\r\\n) thành «, »", () => {
  assert.equal(ghiChuMotDong("Đón 7h\n30 khách"), "Đón 7h, 30 khách");
  assert.equal(ghiChuMotDong("Đón 7h\r\n30 khách"), "Đón 7h, 30 khách");
  assert.equal(ghiChuMotDong("Đón 7h  \n  30 khách"), "Đón 7h, 30 khách");
  assert.equal(ghiChuMotDong("a\n\n\nb"), "a, b", "nhiều dòng trống liền nhau chỉ thành một dấu phẩy");
  assert.equal(ghiChuMotDong("a\rb"), "a, b", "xuống dòng kiểu Mac cũ");
  assert.equal(ghiChuMotDong("một\nhai\nba"), "một, hai, ba");
});

test("ghiChuMotDong: chuỗi không có xuống dòng giữ NGUYÊN (kể cả khoảng trắng đầu cuối, chuỗi rỗng, dấu phẩy sẵn có)", () => {
  for (const s of ["", "Đón 7h30 khách", "  đón sớm  ", "đón sớm, khách già", "a  b"]) assert.equal(ghiChuMotDong(s), s, JSON.stringify(s));
});
