// ADR-0161 Đ3 (kế hoạch 2026-11-03-chinh-sach-chiet-khau-bon-truc, Task 1) — luật thuần «giới hạn nhập mức hoa hồng»: trần phần trăm, bước số tiền; số 0 luôn được nhận.
// Task 2 thêm vế «vượt giá bán» (`mucVuotGiaBan`) vào cùng tệp luật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemThanGioiHan, mucVuotGiaBan, viPhamGioiHanNhap } from "./gioi-han-nhap-muc.ts";

const GH = { tranTyLeBp: 5000, buocTien: 1000 };

test("phần trăm: bằng trần nhận, quá trần từ chối bằng câu có số trần", () => {
  assert.equal(viPhamGioiHanNhap({ tyLeBp: 5000, soTien: [] }, GH), null);
  assert.match(viPhamGioiHanNhap({ tyLeBp: 5100, soTien: [] }, GH)!, /Phần trăm không quá 50%/);
  assert.equal(viPhamGioiHanNhap({ tyLeBp: 5001, soTien: [] }, GH), "Phần trăm không quá 50%.");
  assert.equal(viPhamGioiHanNhap({ tyLeBp: 5001, soTien: [] }, { tranTyLeBp: 5025, buocTien: 1000 }), null, "trần có phần thập phân: 50,25%");
  assert.equal(viPhamGioiHanNhap({ tyLeBp: 5026, soTien: [] }, { tranTyLeBp: 5025, buocTien: 1000 }), "Phần trăm không quá 50,25%.");
});

test("số tiền: phải chia hết cho bước, số 0 luôn nhận, một số lẻ trong ba số là đủ để từ chối", () => {
  assert.equal(viPhamGioiHanNhap({ tyLeBp: null, soTien: [50000, 0, 0] }, GH), null);
  assert.match(viPhamGioiHanNhap({ tyLeBp: null, soTien: [123456] }, GH)!, /chia hết cho 1\.000đ/);
  assert.equal(viPhamGioiHanNhap({ tyLeBp: null, soTien: [123456] }, GH), "Số tiền phải chia hết cho 1.000đ (không trả thì gõ 0).");
  assert.match(viPhamGioiHanNhap({ tyLeBp: null, soTien: [50000, 30500, 0] }, GH)!, /chia hết/, "số lẻ ở ô thứ hai");
  assert.equal(viPhamGioiHanNhap({ tyLeBp: null, soTien: [] }, GH), null, "không có số nào thì không vi phạm");
});

test("số 0 luôn được nhận dù giới hạn lạ", () => {
  assert.equal(viPhamGioiHanNhap({ tyLeBp: 0, soTien: [] }, { tranTyLeBp: 1, buocTien: 7 }), null);
  assert.equal(viPhamGioiHanNhap({ tyLeBp: null, soTien: [0, 0, 0] }, { tranTyLeBp: 1, buocTien: 7 }), null);
});

test("thân đổi giới hạn: trần 1…10000, bước 1…1.000.000, số nguyên, tuLuc bắt buộc", () => {
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 0, buocTien: 1000, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 10001, buocTien: 1000, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 0, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 1_000_001, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000.5, buocTien: 500, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: "6000", buocTien: 500, tuLuc: "x" }).ok, false);
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 500 }).ok, false, "thiếu tuLuc");
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 500, tuLuc: "" }).ok, false, "tuLuc rỗng");
  assert.equal(kiemThanGioiHan(null).ok, false);
  assert.equal(kiemThanGioiHan([]).ok, false);
  assert.deepEqual(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 500, tuLuc: "2026-11-03T00:00:00.000Z" }), { ok: true, value: { tranTyLeBp: 6000, buocTien: 500, tuLuc: "2026-11-03T00:00:00.000Z" } });
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 1, buocTien: 1, tuLuc: "x" }).ok, true, "biên dưới");
  assert.equal(kiemThanGioiHan({ tranTyLeBp: 10000, buocTien: 1_000_000, tuLuc: "x" }).ok, true, "biên trên");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Task 2 — «Hoa hồng không vượt thành tiền» lúc nhập (ADR-0161 Đ4): dòng phạm vi MỘT dịch vụ tính bằng số tiền so với giá bán lẻ hiệu lực của dịch vụ
// ---------------------------------------------------------------------------------------------------------------------------------------------
const G = { adult: 1000000, child: 0, senior: null };
const v = (o: Record<string, unknown>) => mucVuotGiaBan({ unit: "perPax", gia: G, ten: "Vé A", theoLoai: null, moiKhach: 0, ...o } as Parameters<typeof mucVuotGiaBan>[0]);

test("«Mọi khách như nhau» so với giá CAO NHẤT trong các loại có giá: không vướng trẻ em 0 đ, quá giá cao nhất thì báo", () => {
  assert.equal(v({ moiKhach: 100000 }), null, "trẻ em 0 đ không cản dịch vụ có người lớn 1.000.000 đ");
  assert.equal(v({ moiKhach: 1000000 }), null, "bằng giá thì nhận");
  assert.equal(v({ moiKhach: 1000001 }), "Hoa hồng 1.000.001đ lớn hơn giá bán cao nhất 1.000.000đ của «Vé A».");
  assert.match(v({ moiKhach: 1000001 })!, /giá bán cao nhất 1\.000\.000đ/);
  assert.equal(v({ moiKhach: 600000, gia: { adult: 500000, child: null, senior: 900000 } }), null, "giá cao nhất là người cao tuổi 900.000 đ");
  assert.match(v({ moiKhach: 900001, gia: { adult: 500000, child: null, senior: 900000 } })!, /giá bán cao nhất 900\.000đ/);
});

test("«Riêng từng loại khách»: mỗi số so với giá của loại đó; 0 đ là có giá, null thì bỏ qua; báo loại đầu tiên vượt", () => {
  assert.match(v({ moiKhach: 100000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 999999 } })!, /trẻ em/, "trẻ em có giá 0 đ nên 30.000 đ là vượt");
  assert.equal(v({ moiKhach: 100000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 999999 } }), "Hoa hồng 30.000đ của trẻ em lớn hơn giá bán 0đ của «Vé A».");
  assert.equal(v({ moiKhach: 100000, theoLoai: { treEm: 0, nguoiCaoTuoi: 999999 } }), null, "người cao tuổi chưa có giá thì bỏ qua");
  assert.equal(v({ moiKhach: 1000001, theoLoai: { treEm: 0, nguoiCaoTuoi: 0 } }), "Hoa hồng 1.000.001đ của người lớn lớn hơn giá bán 1.000.000đ của «Vé A».");
  assert.match(v({ moiKhach: 100000, gia: { adult: 500000, child: 400000, senior: 300000 }, theoLoai: { treEm: 400000, nguoiCaoTuoi: 300001 } })!, /người cao tuổi lớn hơn giá bán 300\.000đ/);
  assert.equal(v({ moiKhach: 500000, gia: { adult: 500000, child: 400000, senior: 300000 }, theoLoai: { treEm: 400000, nguoiCaoTuoi: 300000 } }), null, "đúng bằng giá từng loại thì nhận");
});

test("dịch vụ tính theo nhóm / lượt: chỉ so số mỗi lượt với giá mỗi lượt, bỏ qua số theo loại; đơn vị lạ và dịch vụ chưa có giá thì bỏ qua", () => {
  const nhom = { adult: 800000, child: null, senior: null };
  assert.equal(mucVuotGiaBan({ unit: "per5Pax", gia: nhom, moiKhach: 800000, theoLoai: { treEm: 9, nguoiCaoTuoi: 9 }, ten: "Phao" }), null);
  assert.match(mucVuotGiaBan({ unit: "per5Pax", gia: nhom, moiKhach: 800001, theoLoai: null, ten: "Phao" })!, /mỗi lượt/);
  assert.equal(mucVuotGiaBan({ unit: "per5Pax", gia: nhom, moiKhach: 800001, theoLoai: null, ten: "Phao" }), "Hoa hồng 800.001đ của mỗi lượt lớn hơn giá bán 800.000đ của «Phao».");
  assert.equal(mucVuotGiaBan({ unit: "per5Pax", gia: nhom, moiKhach: 800001, theoLoai: { treEm: 0, nguoiCaoTuoi: 0 }, ten: "Phao" })?.includes("mỗi lượt"), true, "đi theo lượt dù có khai theo loại");
  assert.equal(mucVuotGiaBan({ unit: "lạ", gia: G, moiKhach: 9000000, theoLoai: null, ten: "X" }), null, "đơn vị chưa hỗ trợ");
  assert.equal(mucVuotGiaBan({ unit: "per1Pax", gia: G, moiKhach: 9000000, theoLoai: null, ten: "X" }), null, "nhóm 1 khách không phải đơn vị hợp lệ");
  assert.equal(mucVuotGiaBan({ unit: "perPax", gia: { adult: null, child: null, senior: null }, moiKhach: 9000000, theoLoai: null, ten: "X" }), null, "chưa có giá nào");
  assert.equal(mucVuotGiaBan({ unit: "per5Pax", gia: { adult: null, child: null, senior: null }, moiKhach: 9000000, theoLoai: null, ten: "X" }), null, "nhóm chưa có giá");
});
