// Luật thuần phiếu tự khai (ADR-0124; lát H-3 Gói 2). Câu báo lỗi tiếng Việt, KHÔNG nhắc lại giá trị khai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_KHONG_GUI, kiemChinhSach, kiemPhieuTuKhai, lyDoKhongGhi, lyDoKhongGui } from "./tu-khai.ts";
import type { DanhMucGiayTo } from "./giay-to.ts";

const DM: DanhMucGiayTo = {
  loai: new Map([["CCCD", { hasExpiry: true, active: true }], ["GPLX", { hasExpiry: true, active: true }], ["HEALTH_CHECK", { hasExpiry: true, active: true }], ["CU", { hasExpiry: false, active: false }]]),
  hang: new Map([["B", { active: true }], ["D2", { active: true }]]),
  homNay: "2026-10-17",
};
const loi = (r: { ok: boolean; message?: string }) => (r.ok ? null : (r as { message: string }).message);

test("NGAY_SINH: hợp lệ (kể cả hôm nay); trống / sai khuôn / tương lai / trước 1900 / không phải chuỗi bị từ chối", () => {
  assert.deepEqual(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "1990-05-06" }, DM), { ok: true, value: { loai: "NGAY_SINH", ngaySinh: "1990-05-06" } });
  assert.equal(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "2026-10-17" }, DM).ok, true);
  for (const v of [undefined, null, "", "06/05/1990", "2026-10-18", "1899-12-31", 19900506]) assert.equal(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: v }, DM).ok, false, String(v));
  assert.equal(loi(kiemPhieuTuKhai({ loai: "NGAY_SINH" }, DM)), "Nhập ngày sinh.");
});

test("DIA_CHI: NFC + gộp khoảng trắng; trống / quá 200 ký tự bị từ chối; câu lỗi không chép địa chỉ", () => {
  const r = kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "  12   Trần Phú,  Nha Trang " }, DM);
  assert.deepEqual(r, { ok: true, value: { loai: "DIA_CHI", diaChi: "12 Trần Phú, Nha Trang" } });
  assert.equal(loi(kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "   " }, DM)), "Nhập địa chỉ.");
  const dai = kiemPhieuTuKhai({ loai: "DIA_CHI", diaChi: "9".repeat(201) }, DM);
  assert.equal(dai.ok, false);
  assert.doesNotMatch(loi(dai)!, /9{8}/);
});

test("GIAY_TO: dùng nguyên luật thêm giấy tờ — CCCD 12 số (khoảng trắng bỏ), GPLX cần hạng, loại ngưng dùng bị từ chối; câu lỗi không nhắc số", () => {
  const r = kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "079 000 000 111", issuedDate: "2020-01-01", expiryDate: "2035-01-01" } }, DM);
  assert.equal(r.ok, true);
  if (r.ok && r.value.loai === "GIAY_TO") assert.equal(r.value.giayTo.numberKey, "079000000111");
  const sai = kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "07900000011" } }, DM);
  assert.equal(loi(sai), "Số căn cước công dân phải đủ 12 chữ số.");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "GPLX", number: "790000000111" } }, DM).ok, false, "GPLX thiếu hạng");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "GPLX", number: "790000000111", classCode: "B" } }, DM).ok, true);
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "CU" } }, DM).ok, false, "loại đã ngưng");
  assert.equal(kiemPhieuTuKhai({ loai: "GIAY_TO", giayTo: { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" } }, DM).ok, true, "loại không bắt buộc số");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "GIAY_TO" }, DM)), "Nhập thông tin giấy tờ.");
});

test("loại lạ / thân rỗng / khai hai loại một lần bị từ chối", () => {
  assert.equal(loi(kiemPhieuTuKhai(null, DM)), "Dữ liệu không hợp lệ.");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "HO_TEN" }, DM)), "Chọn thông tin muốn khai: ngày sinh, địa chỉ hoặc giấy tờ.");
  assert.equal(loi(kiemPhieuTuKhai({ loai: "NGAY_SINH", ngaySinh: "1990-05-06", diaChi: "1 Đường Thử" }, DM)), "Mỗi lần chỉ khai một loại thông tin.");
});

test("kiemChinhSach: chuẩn hoá NFC + bỏ khoảng trắng hai đầu; rỗng / quá dài bị từ chối", () => {
  assert.deepEqual(kiemChinhSach({ mucDich: " Xác minh ", noiDung: " Toàn văn " }), { ok: true, value: { mucDich: "Xác minh", noiDung: "Toàn văn", hanXuLyXoaNgay: null, hanGiuPhienNgay: null } });
  assert.equal(kiemChinhSach({ mucDich: "", noiDung: "x" }).ok, false);
  assert.equal(kiemChinhSach({ mucDich: "x", noiDung: "y".repeat(20001) }).ok, false);
  assert.equal(kiemChinhSach({ mucDich: "x".repeat(2001), noiDung: "y" }).ok, false);
  assert.equal(kiemChinhSach(null).ok, false);
});

test("kiemChinhSach (ADR-0126 đ2, đ8): hai số ngày tuỳ chọn — vắng / null ⇒ null; số nguyên ≥ 1 ⇒ giữ; 0, âm, thập phân, chuỗi, quá lớn ⇒ từ chối", () => {
  const cs = (x: Record<string, unknown>) => kiemChinhSach({ mucDich: "a", noiDung: "b", ...x });
  assert.deepEqual(cs({ hanXuLyXoaNgay: 7, hanGiuPhienNgay: 30 }), { ok: true, value: { mucDich: "a", noiDung: "b", hanXuLyXoaNgay: 7, hanGiuPhienNgay: 30 } });
  assert.deepEqual(cs({ hanXuLyXoaNgay: null }), { ok: true, value: { mucDich: "a", noiDung: "b", hanXuLyXoaNgay: null, hanGiuPhienNgay: null } });
  for (const khoa of ["hanXuLyXoaNgay", "hanGiuPhienNgay"]) {
    for (const xau of [0, -1, 1.5, "7", true, [], NaN, 100000]) assert.equal(cs({ [khoa]: xau }).ok, false, `${khoa}=${JSON.stringify(xau)}`);
  }
});

test("lyDoKhongGui: đúng thứ tự hồ sơ → loại → gộp → chính sách → đồng ý; lyDoKhongGhi chỉ ba lý do đầu", () => {
  const du = { coHoSo: true, laCaNhan: true, daGop: false, coChinhSach: true, daDongY: true };
  assert.equal(lyDoKhongGui(du), null);
  assert.deepEqual(lyDoKhongGui({ ...du, coHoSo: false, laCaNhan: false }), { code: "no_party", message: CAU_KHONG_GUI.chuaHoSo });
  assert.deepEqual(lyDoKhongGui({ ...du, laCaNhan: false }), { code: "self_person_only", message: CAU_KHONG_GUI.toChuc });
  assert.deepEqual(lyDoKhongGui({ ...du, daGop: true, coChinhSach: false }), { code: "party_merged", message: CAU_KHONG_GUI.daGop });
  assert.deepEqual(lyDoKhongGui({ ...du, coChinhSach: false, daDongY: false }), { code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach });
  assert.deepEqual(lyDoKhongGui({ ...du, daDongY: false }), { code: "consent_required", message: CAU_KHONG_GUI.chuaDongY });
  assert.equal(lyDoKhongGhi({ coHoSo: true, laCaNhan: true, daGop: false }), null);
  assert.equal(CAU_KHONG_GUI.chuaChinhSach, "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.");
});
