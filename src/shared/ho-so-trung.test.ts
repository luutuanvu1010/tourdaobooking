import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LY_DO_KHOP, capNghiTrung, chuanHoaTen } from "./ho-so-trung.ts";

const NFD = "Nguyễn Phú Hải".normalize("NFD"); // dạng tổ hợp rời (NFD), dựng bằng mã để trình soạn thảo không chuẩn hoá lại

test("chuanHoaTen: NFC, chữ thường kiểu Việt, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa (kể cả khoảng trắng không ngắt); GIỮ dấu", () => {
  assert.notEqual(NFD, "Nguyễn Phú Hải".normalize("NFC"), "NFD phải khác NFC");
  assert.equal(chuanHoaTen("  NGUYỄN   Phú HẢI "), "nguyễn phú hải");
  assert.equal(chuanHoaTen(NFD), chuanHoaTen("Nguyễn Phú Hải"));
  assert.notEqual(chuanHoaTen("Nguyễn Phú Hai"), chuanHoaTen("Nguyễn Phú Hải"), "giữ dấu: Hai ≠ Hải");
  assert.equal(chuanHoaTen("ĐẶNG"), "đặng");
});

test("capNghiTrung: một cặp xuất hiện MỘT lần dù khớp nhiều lý do; lý do gộp và xếp PHONE, NAME, LOGIN_PHONE", () => {
  const r = capNghiTrung({
    hoSo: [{ id: "b", ten: "Nguyễn Phú Hải" }, { id: "a", ten: NFD }, { id: "c", ten: "Trần Văn C" }],
    sdtLienHe: [{ partyId: "a", so: "0901000001" }, { partyId: "b", so: "0901000001" }, { partyId: "c", so: "0902000002" }],
    sdtDangNhap: [{ partyId: "b", so: "0902000002" }],
  });
  assert.deepEqual(r.cap, [
    { aId: "a", bId: "b", lyDo: ["PHONE", "NAME"] },
    { aId: "b", bId: "c", lyDo: ["LOGIN_PHONE"] },
  ]);
  assert.equal(r.conNua, false);
});

test("capNghiTrung: SĐT / SĐT đăng nhập của hồ sơ KHÔNG nằm trong danh sách xét (đã gộp, đã ngưng, tổ chức) bị bỏ qua; một hồ sơ hai số cùng người không tự thành cặp", () => {
  const r = capNghiTrung({
    hoSo: [{ id: "a", ten: "A" }, { id: "b", ten: "B" }],
    sdtLienHe: [{ partyId: "a", so: "0901" }, { partyId: "a", so: "0901" }, { partyId: "x", so: "0901" }, { partyId: "b", so: "0902" }],
    sdtDangNhap: [{ partyId: "x", so: "0902" }, { partyId: "b", so: "0902" }],
  });
  assert.deepEqual(r.cap, []);
});

test("capNghiTrung: nhiều lý do đứng trước; cắt ở giới hạn và báo conNua", () => {
  const hoSo = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, ten: "Trùng Tên" }));
  const r = capNghiTrung({ hoSo, sdtLienHe: [{ partyId: "p3", so: "09" }, { partyId: "p4", so: "09" }], sdtDangNhap: [] }, 3);
  assert.equal(r.cap.length, 3);
  assert.deepEqual(r.cap[0], { aId: "p3", bId: "p4", lyDo: ["PHONE", "NAME"] });
  assert.equal(r.conNua, true);
});

test("NHAN_LY_DO_KHOP: đủ ba lý do, chữ tiếng Việt", () => {
  assert.deepEqual(Object.keys(NHAN_LY_DO_KHOP).sort(), ["LOGIN_PHONE", "NAME", "PHONE"]);
  for (const v of Object.values(NHAN_LY_DO_KHOP)) assert.match(v, /[à-ỹ]/);
});
