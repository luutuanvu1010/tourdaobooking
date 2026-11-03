// ADR-0161 Đ3 (kế hoạch 2026-11-03-chinh-sach-chiet-khau-bon-truc, Task 1) — luật thuần «giới hạn nhập mức hoa hồng»: trần phần trăm, bước số tiền; số 0 luôn được nhận.
// Task 2 thêm vế «vượt giá bán» (`mucVuotGiaBan`) vào cùng tệp luật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kiemThanGioiHan, viPhamGioiHanNhap } from "./gioi-han-nhap-muc.ts";

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
