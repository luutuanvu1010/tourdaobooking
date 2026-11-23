import { test } from "node:test";
import assert from "node:assert/strict";
import { O_TEP_TO_CHUC, nhanOTep, oBatBuocThieu, oCuaPhieu, oNgoaiPhieu, oTheoVai, type DongOTep } from "./dang-ky-o-tep.ts";

// Gieo của migration 0191 (giữ hành vi trước ADR-0233 + hai ô «Tệp khác»).
const GIEO: DongOTep[] = [
  { phan: "CA_NHAN", vai: "", o: "CCCD_MAT_TRUOC", cach: "TUY_CHON", thuTu: 10 },
  { phan: "CA_NHAN", vai: "", o: "CCCD_MAT_SAU", cach: "TUY_CHON", thuTu: 20 },
  { phan: "CA_NHAN", vai: "", o: "TEP_KHAC", cach: "TUY_CHON", thuTu: 90 },
  { phan: "TO_CHUC", vai: "", o: "GPKD", cach: "BAT_BUOC", thuTu: 10 },
  { phan: "TO_CHUC", vai: "", o: "GIAY_PHEP_THEM", cach: "TUY_CHON", thuTu: 20 },
  { phan: "TO_CHUC", vai: "", o: "TEP_KHAC_TO_CHUC", cach: "TUY_CHON", thuTu: 90 },
];
const ma = (ds: { o: string }[]) => ds.map((x) => x.o);

test("vai cá nhân: chỉ ô căn cước và «Tệp khác» (khi chính sách mở)", () => {
  assert.deepEqual(ma(oTheoVai(GIEO, "CA_NHAN", "TAXI_DRIVER", { tepKhacMo: true })), ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU", "TEP_KHAC"]);
  assert.deepEqual(ma(oTheoVai(GIEO, "CA_NHAN", "TAXI_DRIVER", { tepKhacMo: false })), ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]);
});

test("vai tổ chức: GPKD bắt buộc, giấy phép thêm tuỳ chọn, «Tệp khác của tổ chức»", () => {
  const o = oTheoVai(GIEO, "TO_CHUC", "TRAVEL_AGENCY", { tepKhacMo: true });
  assert.deepEqual(ma(o), ["GPKD", "GIAY_PHEP_THEM", "TEP_KHAC_TO_CHUC"]);
  assert.deepEqual(o.map((x) => x.batBuoc), [true, false, false]);
});

test("dòng theo vai thắng dòng «mọi vai»; AN bỏ ô; vai khác không bị ảnh hưởng", () => {
  const dong: DongOTep[] = [...GIEO,
    { phan: "CA_NHAN", vai: "GUIDE_FREELANCE", o: "CCCD_MAT_TRUOC", cach: "BAT_BUOC", thuTu: 10 },
    { phan: "CA_NHAN", vai: "GUIDE_FREELANCE", o: "CCCD_MAT_SAU", cach: "AN", thuTu: 20 }];
  const hdv = oTheoVai(dong, "CA_NHAN", "GUIDE_FREELANCE", { tepKhacMo: false });
  assert.deepEqual(hdv.map((x) => [x.o, x.batBuoc]), [["CCCD_MAT_TRUOC", true]]);
  assert.deepEqual(ma(oTheoVai(dong, "CA_NHAN", "TAXI_DRIVER", { tepKhacMo: false })), ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]);
  // Thứ tự dòng trong mảng không đổi kết quả.
  assert.deepEqual(oTheoVai([...dong].reverse(), "CA_NHAN", "GUIDE_FREELANCE", { tepKhacMo: false }), hdv);
});

test("đóng khi không rõ: mã ô lạ, ô sai phần bị bỏ", () => {
  const dong: DongOTep[] = [
    { phan: "CA_NHAN", vai: "", o: "O_LA", cach: "TUY_CHON", thuTu: 1 },
    { phan: "CA_NHAN", vai: "", o: "GPKD", cach: "TUY_CHON", thuTu: 2 },
    { phan: "TO_CHUC", vai: "", o: "CCCD_MAT_TRUOC", cach: "TUY_CHON", thuTu: 3 },
  ];
  assert.deepEqual(oTheoVai(dong, "CA_NHAN", "", { tepKhacMo: true }), []);
  assert.deepEqual(oTheoVai(dong, "TO_CHUC", "", { tepKhacMo: true }), []);
});

test("oCuaPhieu: phần tổ chức chỉ khi phiếu có phần đó; vai rỗng dùng dòng «mọi vai»", () => {
  assert.deepEqual(ma(oCuaPhieu(GIEO, { vaiCaNhan: "", vaiToChuc: null, coToChuc: false, tepKhacMo: false })), ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]);
  assert.deepEqual(ma(oCuaPhieu(GIEO, { vaiCaNhan: "", vaiToChuc: null, coToChuc: true, tepKhacMo: false })), ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU", "GPKD", "GIAY_PHEP_THEM"]);
});

test("oBatBuocThieu / oNgoaiPhieu", () => {
  const o = oCuaPhieu(GIEO, { vaiCaNhan: "X", vaiToChuc: "Y", coToChuc: true, tepKhacMo: false });
  assert.deepEqual(ma(oBatBuocThieu(o, [])), ["GPKD"]);
  assert.deepEqual(ma(oBatBuocThieu(o, [{ slot: "GPKD", daLuu: false }])), ["GPKD"], "tệp chưa lưu không tính");
  assert.deepEqual(oBatBuocThieu(o, [{ slot: "GPKD", daLuu: true }]), []);
  assert.deepEqual(oNgoaiPhieu(o, [{ slot: "CCCD_MAT_TRUOC" }, { slot: "TEP_KHAC" }, { slot: "TEP_KHAC" }]), ["TEP_KHAC"], "«Tệp khác» đóng ⇒ tệp ở đó nằm ngoài phiếu");
});

test("ô của phần tổ chức (lô duyệt dùng) và tên hiện", () => {
  assert.deepEqual([...O_TEP_TO_CHUC].sort(), ["GIAY_PHEP_THEM", "GPKD", "TEP_KHAC_TO_CHUC"]);
  assert.equal(nhanOTep("TEP_KHAC"), "Tệp khác");
  assert.equal(nhanOTep("LA"), "LA");
});

test("tệp Word (chủ 21/11: không nhận): nhận ra .doc (OLE) và .docx (ZIP) để báo «hãy lưu thành PDF»; PDF, ảnh không bị nhầm", async () => {
  const { giongTepWord } = await import("./dang-ky-o-tep.ts");
  assert.equal(giongTepWord(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0])), true);
  assert.equal(giongTepWord(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0])), true);
  assert.equal(giongTepWord(new TextEncoder().encode("%PDF-1.7")), false);
  assert.equal(giongTepWord(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), false);
  assert.equal(giongTepWord(new Uint8Array([0x50, 0x4b])), false, "quá ngắn");
});
