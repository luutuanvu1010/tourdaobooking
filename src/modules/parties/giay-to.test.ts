// Luật thuần giấy tờ của người (ADR-0040 D2): chuẩn hoá và che số, kiểm thêm / gia hạn / sửa sai, dựng chi tiết nhật ký KHÔNG số.
// Mọi số ở đây là số GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_SUA_SAI, type LyDoSuaSai } from "../../shared/giay-to.ts";
import { cheSo, chiTietNhatKy, chuanHoaSo, kiemGiaHan, kiemHangMoi, kiemSuaHang, kiemSuaSai, kiemThemGiayTo, type DanhMucGiayTo, type GiayToNhap } from "./giay-to.ts";

const DM: DanhMucGiayTo = {
  loai: new Map([
    ["CCCD", { hasExpiry: true, active: true }],
    ["GPLX", { hasExpiry: true, active: true }],
    ["HEALTH_CHECK", { hasExpiry: true, active: true }],
    ["KHONG_HAN", { hasExpiry: false, active: true }],
    ["DA_NGUNG", { hasExpiry: true, active: false }],
  ]),
  hang: new Map([["B", { active: true }], ["D2", { active: true }], ["C_OLD", { active: false }]]),
  homNay: "2026-09-28",
};
const SO = "079123456789"; // số GIẢ
const ok = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(r.ok, r.ok ? "" : r.message);
  return (r as { ok: true; value: T }).value;
};
const loi = (r: { ok: boolean; message?: string }): string => {
  assert.equal(r.ok, false, "phải bị từ chối");
  return (r as { message: string }).message;
};

test("chuanHoaSo: NFC, chữ HOA, bỏ khoảng trắng . - /", () => {
  assert.equal(chuanHoaSo("079 123.456-789"), "079123456789");
  assert.equal(chuanHoaSo(" ab-12/34 "), "AB1234");
});

test("cheSo: '••••' + 4 ký tự cuối khi số chuẩn hoá dài ≥ 8; ngắn hơn chỉ '••••'; null → null", () => {
  assert.equal(cheSo("079123456789"), "••••6789");
  assert.equal(cheSo("12345678"), "••••5678");
  assert.equal(cheSo("1234567"), "••••");
  assert.equal(cheSo("AB12"), "••••");
  assert.equal(cheSo(null), null);
});

test("kiemThemGiayTo: loại phải có trong danh mục và đang dùng", () => {
  assert.match(loi(kiemThemGiayTo({ typeCode: "KHONG_CO" }, DM)), /Loại giấy tờ/);
  assert.match(loi(kiemThemGiayTo({ typeCode: "DA_NGUNG" }, DM)), /Loại giấy tờ/);
  assert.match(loi(kiemThemGiayTo(null, DM)), /không hợp lệ/);
  ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK" }, DM));
});

test("kiemThemGiayTo: số — CCCD đúng 12 chữ số sau chuẩn hoá; GPLX 5–20 ký tự [0-9A-Z]; loại khác không bắt buộc, có thì 1–40; câu báo KHÔNG nhắc số", () => {
  const v = ok(kiemThemGiayTo({ typeCode: "CCCD", number: "079 123.456-789" }, DM));
  assert.deepEqual([v.number, v.numberKey], ["079 123.456-789", SO]);
  for (const bad of ["07912345678", "0791234567890", "07912345678A", "", null]) {
    const m = loi(kiemThemGiayTo({ typeCode: "CCCD", number: bad }, DM));
    assert.doesNotMatch(m, /\d{4,}/, `câu báo không chứa dãy số: ${m}`);
  }
  ok(kiemThemGiayTo({ typeCode: "GPLX", number: "790000000001", classCode: "D2" }, DM));
  ok(kiemThemGiayTo({ typeCode: "GPLX", number: "AB123", classCode: "B" }, DM));
  for (const bad of ["AB12", "A".repeat(21), "79-00*01", null]) loi(kiemThemGiayTo({ typeCode: "GPLX", number: bad, classCode: "D2" }, DM));
  assert.equal(ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK" }, DM)).number, null);
  assert.equal(ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", number: "SK-2026/01" }, DM)).numberKey, "SK202601");
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", number: "số#1" }, DM));
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", number: "1".repeat(41) }, DM));
});

test("kiemThemGiayTo: hạng bắt buộc với GPLX và phải đang dùng; loại khác không được có hạng", () => {
  assert.match(loi(kiemThemGiayTo({ typeCode: "GPLX", number: "790000000001" }, DM)), /hạng/);
  assert.match(loi(kiemThemGiayTo({ typeCode: "GPLX", number: "790000000001", classCode: "C_OLD" }, DM)), /hạng/);
  assert.match(loi(kiemThemGiayTo({ typeCode: "GPLX", number: "790000000001", classCode: "Z9" }, DM)), /hạng/);
  assert.match(loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", classCode: "B" }, DM)), /hạng/);
  assert.match(loi(kiemThemGiayTo({ typeCode: "CCCD", number: SO, classCode: "B" }, DM)), /hạng/);
  assert.equal(ok(kiemThemGiayTo({ typeCode: "GPLX", number: "790000000001", classCode: "D2" }, DM)).classCode, "D2");
});

test("kiemThemGiayTo: ngày cấp hợp lệ, không sau hôm nay; ngày hết hạn hợp lệ, không trước ngày cấp; loại không hạn thì không có ngày hết hạn; nơi cấp 1–200 ký tự", () => {
  ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedDate: "2026-09-28", expiryDate: "2027-09-28", issuedPlace: "  Sở Y tế   Khánh Hoà " }, DM));
  assert.equal(ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedPlace: "  Sở Y tế   Khánh Hoà " }, DM)).issuedPlace, "Sở Y tế Khánh Hoà");
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedDate: "2026-09-29" }, DM)); // sau hôm nay
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedDate: "2026-02-30" }, DM)); // sai lịch
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", expiryDate: "2026-13-01" }, DM));
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedDate: "2026-09-10", expiryDate: "2026-09-09" }, DM));
  assert.match(loi(kiemThemGiayTo({ typeCode: "KHONG_HAN", expiryDate: "2030-01-01" }, DM)), /không có ngày hết hạn/);
  ok(kiemThemGiayTo({ typeCode: "KHONG_HAN" }, DM));
  loi(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedPlace: "x".repeat(201) }, DM));
  assert.equal(ok(kiemThemGiayTo({ typeCode: "HEALTH_CHECK", issuedPlace: "   " }, DM)).issuedPlace, null);
});

test("kiemGiaHan: KHÔNG gửi số ⇒ chép số (và hạng) của dòng trước — số đầy đủ không phải ra trình duyệt; gửi số mới thì kiểm như thêm", () => {
  const truoc = { typeCode: "GPLX", number: "79 0000 000 001", classCode: "D2" };
  const v = ok(kiemGiaHan({ expiryDate: "2031-01-01" }, truoc, DM));
  assert.deepEqual([v.typeCode, v.number, v.numberKey, v.classCode, v.expiryDate], ["GPLX", "79 0000 000 001", "790000000001", "D2", "2031-01-01"]);
  assert.equal(ok(kiemGiaHan({ number: null }, truoc, DM)).numberKey, "790000000001");
  assert.equal(ok(kiemGiaHan({ number: "790000000009", classCode: "B" }, truoc, DM)).classCode, "B");
  loi(kiemGiaHan({ number: "AB" }, truoc, DM));
  loi(kiemGiaHan({ issuedDate: "2026-09-10", expiryDate: "2026-09-01" }, truoc, DM));
  assert.match(loi(kiemGiaHan({}, { typeCode: "DA_NGUNG", number: null, classCode: null }, DM)), /Loại giấy tờ/, "loại đã ngưng không gia hạn (thêm dòng mới) được");
  assert.match(loi(kiemGiaHan({}, { typeCode: "GPLX", number: "790000000001", classCode: "C_OLD" }, DM)), /hạng/, "hạng cũ đã ngưng → phải chọn hạng mới khi gia hạn");
});

const HIEN_HANH: GiayToNhap = { typeCode: "CCCD", number: SO, numberKey: SO, classCode: null, issuedDate: "2021-01-01", issuedPlace: "Cục Cảnh sát", expiryDate: "2030-01-01" };
const GPLX_HH: GiayToNhap = { typeCode: "GPLX", number: "790000000001", numberKey: "790000000001", classCode: "D2", issuedDate: "2024-01-01", issuedPlace: null, expiryDate: "2029-01-01" };

test("kiemSuaSai: lý do thuộc danh sách đóng; bắt buộc mốc cập nhật; mỗi lý do sửa đúng một trường; giá trị mới phải khác và qua luật của trường", () => {
  assert.deepEqual(ok(kiemSuaSai({ reason: "SAI_NGAY_HET_HAN", value: "2031-01-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), {
    lyDo: "SAI_NGAY_HET_HAN", huy: false, truong: "expiryDate", giaTri: "2031-01-01", expectedUpdatedAt: "t1",
  });
  assert.match(loi(kiemSuaSai({ reason: "KHAC", value: "x", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /Lý do/);
  assert.match(loi(kiemSuaSai({ value: "2031-01-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /Lý do/);
  assert.match(loi(kiemSuaSai({ reason: "SAI_NGAY_HET_HAN", value: "2031-01-01" }, HIEN_HANH, DM)), /mốc cập nhật/);
  assert.match(loi(kiemSuaSai({ reason: "SAI_NGAY_HET_HAN", value: "2030-01-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /giống/, "giá trị không đổi");
  assert.match(loi(kiemSuaSai({ reason: "SAI_NGAY_HET_HAN", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /giá trị mới/, "thiếu giá trị");
  loi(kiemSuaSai({ reason: "SAI_NGAY_HET_HAN", value: "2020-01-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)); // trước ngày cấp
  loi(kiemSuaSai({ reason: "SAI_NGAY_CAP", value: "2030-06-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)); // sau ngày hết hạn (và sau hôm nay)
  assert.equal(ok(kiemSuaSai({ reason: "SAI_NGAY_CAP", value: "2021-02-01", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)).truong, "issuedDate");
  // Số: CCCD không được xoá số; giá trị mới qua luật của loại; câu báo không nhắc số.
  const soMoi = ok(kiemSuaSai({ reason: "SAI_SO", value: "079 123 456 780", expectedUpdatedAt: "t1" }, HIEN_HANH, DM));
  assert.deepEqual([soMoi.truong, soMoi.huy === false && soMoi.giaTri], ["number", "079 123 456 780"]);
  loi(kiemSuaSai({ reason: "SAI_SO", value: null, expectedUpdatedAt: "t1" }, HIEN_HANH, DM));
  assert.match(loi(kiemSuaSai({ reason: "SAI_SO", value: "079 123 456 789", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /giống/, "cùng số (khác cách viết) = không đổi");
  // Hạng: chỉ GPLX.
  assert.match(loi(kiemSuaSai({ reason: "SAI_HANG", value: "B", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), /hạng/);
  assert.equal(ok(kiemSuaSai({ reason: "SAI_HANG", value: "B", expectedUpdatedAt: "t1" }, GPLX_HH, DM)).truong, "classCode");
  loi(kiemSuaSai({ reason: "SAI_HANG", value: null, expectedUpdatedAt: "t1" }, GPLX_HH, DM));
  // Nơi cấp.
  assert.equal(ok(kiemSuaSai({ reason: "SAI_NOI_CAP", value: "Cục Cảnh sát QLHC", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)).truong, "issuedPlace");
});

test("kiemSuaSai: 'Nhập nhầm cả dòng' = huỷ dòng, không nhận giá trị", () => {
  assert.deepEqual(ok(kiemSuaSai({ reason: "NHAP_NHAM_DONG", expectedUpdatedAt: "t1" }, HIEN_HANH, DM)), { lyDo: "NHAP_NHAM_DONG", huy: true, expectedUpdatedAt: "t1" });
  loi(kiemSuaSai({ reason: "NHAP_NHAM_DONG", value: "x", expectedUpdatedAt: "t1" }, HIEN_HANH, DM));
});

test("chiTietNhatKy: đủ sáu lý do — KHÔNG BAO GIỜ chứa số (kể cả lỡ truyền vào), chỉ tên loại, hạng, ngày dạng YYYY-MM-DD, lý do", () => {
  assert.equal(chiTietNhatKy({ loai: "Căn cước công dân (CCCD)", hetHan: "2030-01-01" }), "Căn cước công dân (CCCD), hết hạn 2030-01-01");
  assert.equal(chiTietNhatKy({ loai: "Khám sức khoẻ", hetHan: null }), "Khám sức khoẻ, không hạn");
  assert.equal(chiTietNhatKy({ loai: "Giấy phép lái xe", hang: "Hạng D2", hetHan: "2031-01-01" }), "Giấy phép lái xe hạng D2, hết hạn 2031-01-01");
  assert.equal(chiTietNhatKy({ loai: "Giấy phép lái xe", hang: "Hạng D2", giaHan: true, truoc: "2029-01-01", sau: "2031-01-01" }), "Giấy phép lái xe hạng D2: gia hạn, hết hạn 2029-01-01 → 2031-01-01");
  assert.equal(chiTietNhatKy({ loai: "Căn cước công dân (CCCD)", lyDo: "SAI_NGAY_HET_HAN", truoc: "2030-01-01", sau: "2031-01-01" }), "Căn cước công dân (CCCD): Nhập sai ngày hết hạn (2030-01-01 → 2031-01-01)");
  for (const lyDo of Object.keys(LY_DO_SUA_SAI) as LyDoSuaSai[]) {
    // Người gọi LỠ truyền số / nơi cấp vào truoc/sau: hàm phải tự bỏ (chỉ nhận ngày YYYY-MM-DD hoặc tên hạng cho đúng lý do).
    const d = chiTietNhatKy({ loai: "Căn cước công dân (CCCD)", lyDo, truoc: SO, sau: "079 123 456 780" });
    assert.doesNotMatch(d, /079123456789|123456789|079 123 456 780|456/, `${lyDo}: ${d}`);
    assert.ok(d.includes(LY_DO_SUA_SAI[lyDo].nhan), `${lyDo}: có nhãn lý do — ${d}`);
  }
  assert.equal(chiTietNhatKy({ loai: "Căn cước công dân (CCCD)", lyDo: "SAI_SO", truoc: SO, sau: SO }), "Căn cước công dân (CCCD): Nhập sai số");
  assert.equal(chiTietNhatKy({ loai: "Căn cước công dân (CCCD)", lyDo: "SAI_NOI_CAP", truoc: "Nơi A", sau: "Nơi B" }), "Căn cước công dân (CCCD): Nhập sai nơi cấp");
  assert.equal(chiTietNhatKy({ loai: "Giấy phép lái xe", lyDo: "SAI_HANG", truoc: "Hạng D2", sau: "Hạng B" }), "Giấy phép lái xe: Nhập sai hạng (Hạng D2 → Hạng B)");
});

test("kiemHangMoi / kiemSuaHang: danh mục hạng giấy phép lái xe — mã chữ HOA/số 1–20 (khớp CHECK), tên 1–60, thứ tự; sửa cần mốc cập nhật và trạng thái", () => {
  assert.deepEqual(kiemHangMoi({ code: "C1", name: " Hạng  C1 ", sortOrder: 9 }), { ok: true, value: { code: "C1", name: "Hạng C1", sortOrder: 9 } });
  assert.deepEqual(kiemHangMoi({ code: "BE", name: "Hạng BE" }), { ok: true, value: { code: "BE", name: "Hạng BE", sortOrder: 0 } });
  for (const bad of [null, { code: "c1", name: "x" }, { code: "", name: "x" }, { code: "A".repeat(21), name: "x" }, { code: "C 1", name: "x" }, { code: "C1", name: "x".repeat(61) }, { code: "C1", name: "x", sortOrder: "1" }]) {
    assert.equal(kiemHangMoi(bad as Record<string, unknown> | null).ok, false, JSON.stringify(bad));
  }
  assert.deepEqual(kiemSuaHang({ name: "Hạng C1 (mới)", sortOrder: 3, active: false, expectedUpdatedAt: "t1" }), { ok: true, value: { name: "Hạng C1 (mới)", sortOrder: 3, active: false, expectedUpdatedAt: "t1" } });
  assert.equal(kiemSuaHang({ name: "x", sortOrder: 3, active: true }).ok, false, "thiếu mốc cập nhật");
  assert.equal(kiemSuaHang({ name: "x", sortOrder: 3, expectedUpdatedAt: "t1" }).ok, false, "thiếu trạng thái");
});
