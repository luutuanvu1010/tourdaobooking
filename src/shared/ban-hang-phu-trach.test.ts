// Luật thuần «Bán hàng phụ trách» (ADR-0142): đồng hồ giờ hành chính 07–17, lời mời, ai nhận, ai thấy thẻ cảnh báo, ô được giao.
// Đồng hồ TIÊM (`nowMs`), hàm không đọc Date.now().
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  congPhutGioHanhChinh, phutGioHanhChinhConLai, trangThaiLoiMoi, duocNhanBanHang, vaoTheCanhBao, cachThayTheCanhBao, duocGiaoTheoO, laVaChamOBanHang,
  QUYEN_DUOC_GIAO_BAN_HANG, HANH_DONG_GAC_BAN_HANG, KHUNG_MAC_DINH, type KhungGioHanhChinh,
} from "./ban-hang-phu-trach.ts";

/** Giờ Việt Nam "YYYY-MM-DDTHH:MM[:SS]" → ISO UTC (trừ 7 giờ). */
const vn = (s: string): string => new Date(Date.parse(`${s.length === 16 ? `${s}:00` : s}Z`) - 7 * 3600_000).toISOString();
const doiVn = (iso: string): string => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 19);
const K = { tuPhut: 420, denPhut: 1020 };
const KHUNG: KhungGioHanhChinh = { phutUuTien: 15, tuPhut: 420, denPhut: 1020, mocPhatHanh: vn("2026-11-01T00:00") };

test("KHUNG_MAC_DINH là 07:00–17:00", () => assert.deepEqual(KHUNG_MAC_DINH, K));

test("đồng hồ: 16:55 + 15 phút ⇒ 07:10 hôm sau", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T16:55"), 15, K)), "2026-10-28T07:10:00"));
test("đồng hồ: 06:00 ⇒ 07:15 · 10:00 ⇒ 10:15 · 17:00 đúng ⇒ 07:15 hôm sau · 07:00 đúng ⇒ 07:15", () => {
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T06:00"), 15, K)), "2026-10-27T07:15:00");
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T10:00"), 15, K)), "2026-10-27T10:15:00");
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T17:00"), 15, K)), "2026-10-28T07:15:00");
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T07:00"), 15, K)), "2026-10-27T07:15:00");
});
test("đồng hồ: 16:45 + 15 ⇒ đúng 17:00 (hạn rơi đúng biên, không sang hôm sau)", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T16:45"), 15, K)), "2026-10-27T17:00:00"));
test("đồng hồ: giữ phần giây của mốc gốc", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T10:00:30"), 15, K)), "2026-10-27T10:15:30"));
test("đồng hồ: Chủ nhật vẫn tính (2026-11-01 là Chủ nhật)", () => {
  assert.equal(new Date(Date.parse(vn("2026-11-01T10:00")) + 7 * 3600_000).getUTCDay(), 0);
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-11-01T10:00"), 15, K)), "2026-11-01T10:15:00");
  assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-11-01T16:55"), 15, K)), "2026-11-02T07:10:00");
});
test("đồng hồ: kết quả là ISO UTC (đuôi Z)", () => assert.match(congPhutGioHanhChinh(vn("2026-10-27T10:00"), 15, K), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/));
test("đồng hồ: cộng nhiều hơn một ngày làm việc (600 phút = đúng một ngày 07–17)", () => assert.equal(doiVn(congPhutGioHanhChinh(vn("2026-10-27T07:00"), 600, K)), "2026-10-27T17:00:00"));

test("còn lại tính phút hành chính: 17:30 với hạn 07:10 hôm sau ⇒ 10", () => assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T17:30"), vn("2026-10-28T07:10"), K), 10));
test("còn lại: cùng ngày, làm tròn lên, đã quá hạn ⇒ 0", () => {
  assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T10:00"), vn("2026-10-27T10:15"), K), 15);
  assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T10:00:10"), vn("2026-10-27T10:15"), K), 15);
  assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T10:00:50"), vn("2026-10-27T10:15"), K), 15);
  assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T10:00:50"), vn("2026-10-27T10:14:10"), K), 14);
  assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T11:00"), vn("2026-10-27T10:15"), K), 0);
});
test("còn lại: 16:55 với hạn 07:10 hôm sau ⇒ 15 (5 phút cuối ngày + 10 phút đầu ngày)", () => assert.equal(phutGioHanhChinhConLai(vn("2026-10-27T16:55"), vn("2026-10-28T07:10"), K), 15));
test("còn lại khớp đồng hồ cộng: cộng 15 phút rồi đếm lại ⇒ 15, ở nhiều giờ trong ngày", () => {
  for (const g of ["05:00", "07:00", "09:37", "16:50", "16:59", "17:00", "23:59"]) {
    const m = vn(`2026-10-27T${g}`);
    assert.equal(phutGioHanhChinhConLai(m, congPhutGioHanhChinh(m, 15, K), K), 15, g);
  }
});

const BAY_GIO = Date.parse("2026-11-05T03:00:00.000Z");
const SAU_10P = new Date(BAY_GIO + 10 * 60_000).toISOString();
const TRUOC_10P = new Date(BAY_GIO - 10 * 60_000).toISOString();

test("lời mời: X còn hợp lệ, còn hạn ⇒ UU_TIEN; quá hạn ⇒ HET_UU_TIEN; đã khép ⇒ DA_KHEP", () => {
  assert.equal(trangThaiLoiMoi({ hanIso: SAU_10P, nowMs: BAY_GIO, xConHopLe: true, daKhep: false }), "UU_TIEN");
  assert.equal(trangThaiLoiMoi({ hanIso: TRUOC_10P, nowMs: BAY_GIO, xConHopLe: true, daKhep: false }), "HET_UU_TIEN");
  assert.equal(trangThaiLoiMoi({ hanIso: SAU_10P, nowMs: BAY_GIO, xConHopLe: true, daKhep: true }), "DA_KHEP");
});
test("X mất quyền ⇒ HET_UU_TIEN ngay", () => assert.equal(trangThaiLoiMoi({ hanIso: SAU_10P, nowMs: BAY_GIO, xConHopLe: false, daKhep: false }), "HET_UU_TIEN"));
test("đã khép thắng mọi điều kiện khác", () => assert.equal(trangThaiLoiMoi({ hanIso: TRUOC_10P, nowMs: BAY_GIO, xConHopLe: false, daKhep: true }), "DA_KHEP"));

const CO_SO = {
  giuBanHang: true, laQuanTriHoacToanQuyen: false, giuDoiTac: false, laX: false, uuTienCuaNguoiKhac: false,
  daCoNguoi: false, donHuy: false, quaNgayDi: false, laDonCu: false, laNhap: false,
};
test("duocNhanBanHang: Bán hàng bình thường ⇒ ok", () => assert.deepEqual(duocNhanBanHang(CO_SO), { ok: true }));
test("Quản trị nhận thay trong ưu tiên ⇒ ok", () => assert.deepEqual(duocNhanBanHang({ ...CO_SO, giuBanHang: false, laQuanTriHoacToanQuyen: true, uuTienCuaNguoiKhac: true }), { ok: true }));
test("X nhận trong ưu tiên của mình ⇒ ok", () => assert.deepEqual(duocNhanBanHang({ ...CO_SO, laX: true }), { ok: true }));
test("Bán hàng khác trong ưu tiên của X ⇒ dang_cho_nguoi_khac", () => assert.deepEqual(duocNhanBanHang({ ...CO_SO, uuTienCuaNguoiKhac: true }), { ok: false, lyDo: "dang_cho_nguoi_khac" }));
test("giữ quyền Đối tác ⇒ tai_khoan_lai (kể cả Quản trị lai)", () => {
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, giuDoiTac: true }), { ok: false, lyDo: "tai_khoan_lai" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, giuBanHang: false, laQuanTriHoacToanQuyen: true, giuDoiTac: true }), { ok: false, lyDo: "tai_khoan_lai" });
});
test("không đủ quyền; đã có người; đơn huỷ; quá ngày đi; đơn cũ; đơn nháp", () => {
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, giuBanHang: false }), { ok: false, lyDo: "khong_du_quyen" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, daCoNguoi: true }), { ok: false, lyDo: "da_co_nguoi" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, donHuy: true }), { ok: false, lyDo: "don_huy" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, quaNgayDi: true }), { ok: false, lyDo: "qua_ngay_di" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, laDonCu: true }), { ok: false, lyDo: "don_cu" });
  assert.deepEqual(duocNhanBanHang({ ...CO_SO, laNhap: true }), { ok: false, lyDo: "don_nhap" });
});

const NHAN_LUC = vn("2026-11-05T09:00");
const THE = { ghiNhanLuc: NHAN_LUC, nowMs: Date.parse(vn("2026-11-05T09:20")), khung: KHUNG, coBanHang: false, donHuy: false, quaNgayDi: false, daGiao: false, hoanThanh: false };
test("thẻ cảnh báo: đủ mọi điều kiện ⇒ vào thẻ", () => assert.equal(vaoTheCanhBao(THE), true));
test("thẻ cảnh báo: mỗi điều kiện loại một ca", () => {
  assert.equal(vaoTheCanhBao({ ...THE, coBanHang: true }), false);
  assert.equal(vaoTheCanhBao({ ...THE, donHuy: true }), false);
  assert.equal(vaoTheCanhBao({ ...THE, quaNgayDi: true }), false);
  assert.equal(vaoTheCanhBao({ ...THE, daGiao: true }), false);
  assert.equal(vaoTheCanhBao({ ...THE, hoanThanh: true }), false);
  assert.equal(vaoTheCanhBao({ ...THE, ghiNhanLuc: null }), false);
  assert.equal(vaoTheCanhBao({ ...THE, ghiNhanLuc: vn("2026-10-31T09:00") }), false, "ghi nhận trước mốc phát hành");
  assert.equal(vaoTheCanhBao({ ...THE, nowMs: Date.parse(vn("2026-11-05T09:14")) }), false, "chưa đủ 15 phút");
  assert.equal(vaoTheCanhBao({ ...THE, nowMs: Date.parse(vn("2026-11-05T09:15")) }), true, "đủ 15 phút đúng");
});
test("thẻ cảnh báo: 15 phút là phút hành chính (ghi nhận 16:55, 07:09 hôm sau chưa đủ, 07:10 đủ)", () => {
  const t = { ...THE, ghiNhanLuc: vn("2026-11-05T16:55") };
  assert.equal(vaoTheCanhBao({ ...t, nowMs: Date.parse(vn("2026-11-06T07:09")) }), false);
  assert.equal(vaoTheCanhBao({ ...t, nowMs: Date.parse(vn("2026-11-06T07:10")) }), true);
});

const nguoi = (...permissions: string[]) => ({ id: "x", permissions: permissions as never });
test("cachThayTheCanhBao", () => {
  const cho = { laNguoiLap: false, choXacNhan: true };
  const xong = { laNguoiLap: false, choXacNhan: false };
  assert.equal(cachThayTheCanhBao(nguoi("SALES"), cho), "day_du");
  assert.equal(cachThayTheCanhBao(nguoi("ADMIN"), cho), "day_du");
  assert.equal(cachThayTheCanhBao(nguoi("SUPER_ADMIN"), cho), "day_du");
  assert.equal(cachThayTheCanhBao(nguoi("ACCOUNTING"), cho), "chi_so");
  assert.equal(cachThayTheCanhBao(nguoi("ACCOUNTING"), xong), "day_du");
  assert.equal(cachThayTheCanhBao(nguoi("FIELD"), cho), "khong");
  assert.equal(cachThayTheCanhBao(nguoi("PARTNER"), { laNguoiLap: true, choXacNhan: true }), "day_du");
  assert.equal(cachThayTheCanhBao(nguoi("PARTNER"), cho), "khong");
});

test("ô được giao: danh sách trắng đúng năm ô, không có order.modify", () => {
  assert.deepEqual([...QUYEN_DUOC_GIAO_BAN_HANG], ["order.history.view", "order.trip.edit", "order.passenger.write", "dispatch.assign", "trip.call_ack"]);
});
test("order.modify không cộng Bán hàng phụ trách (chưa cho huỷ)", () => assert.equal(duocGiaoTheoO("order.modify", { laNguoiPhuTrach: false, laBanHangPhuTrach: true }), false));
test("order.money.edit không cộng; trip.call_ack cộng; người phụ trách cũ giữ nguyên mọi ô", () => {
  assert.equal(duocGiaoTheoO("order.money.edit" as never, { laNguoiPhuTrach: false, laBanHangPhuTrach: true }), false);
  assert.equal(duocGiaoTheoO("trip.call_ack", { laNguoiPhuTrach: false, laBanHangPhuTrach: true }), true);
  assert.equal(duocGiaoTheoO("order.modify", { laNguoiPhuTrach: true, laBanHangPhuTrach: false }), true);
  assert.equal(duocGiaoTheoO("trip.call_ack", { laNguoiPhuTrach: false, laBanHangPhuTrach: false }), false);
});

test("HANH_DONG_GAC_BAN_HANG đúng năm hành động", () => {
  assert.deepEqual([...HANH_DONG_GAC_BAN_HANG].sort(), ["cancelled", "confirmed", "order_cancelled_by_field", "order_confirm_requested", "order_confirm_withdrawn"]);
});

test("laVaChamOBanHang: chỉ nhận UNIQUE của dsp_sales_owner.order_id", () => {
  assert.equal(laVaChamOBanHang(new Error("D1_ERROR: UNIQUE constraint failed: dsp_sales_owner.order_id: SQLITE_CONSTRAINT")), true);
  assert.equal(laVaChamOBanHang(new Error("UNIQUE constraint failed: dsp_assignment.order_id")), false);
  assert.equal(laVaChamOBanHang(new Error("CHECK constraint failed: outcome")), false);
  assert.equal(laVaChamOBanHang("UNIQUE constraint failed: dsp_sales_owner.order_id"), false);
  assert.equal(laVaChamOBanHang(null), false);
});
