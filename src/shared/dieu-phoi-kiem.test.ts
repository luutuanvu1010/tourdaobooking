// Luật thuần của điều phối (ADR-0049 D1, D2; kế hoạch Task A4; TC-17, TC-18): kiểm tạo / sửa chuyến (LC-03, CH-02, LC-12, LC-13, mốc lúc xếp), kiểm xếp
// (LC-01, LC-02, LC-09, LC-10, L-D1, I13, mốc), cổng xuất bến (sàn cứng GPLX, điều kiện đang hiệu lực, đủ tên, đơn huỷ, chặng đóng, sức chứa, nghỉ đủ, nơi
// trả, xe đang dùng, LC-13, hợp đồng khoá 0), kết thúc (LC-16), "trong ngày chạy". Mỗi ca ra ĐÚNG mã `LyDoGiu` và ĐÚNG "ai xử lý". Chính sách rỗng hoặc
// hạng lạ → CHẶN (không đoán).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChangVao, ChinhSachVao, ChuyenVao, DieuKienVao, HangBangVao, KhungChuyen, SuatVao, TaiXeVao, XeVao } from "./dieu-phoi-kieu.ts";
import { kiemKetThuc, kiemTaoSuaChuyen, kiemXep, kiemXuatBen, trongNgayChay, type KiemTaoSuaChuyenVao, type KiemXuatBenVao } from "./dieu-phoi-kiem.ts";
import type { LyDoGiu } from "./ly-do-giu.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const CS: ChinhSachVao = { id: "cs-1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false };
const HB: HangBangVao[] = [
  { classCode: "B", maxPassengers: 8 }, { classCode: "D1", maxPassengers: 16 }, { classCode: "D2", maxPassengers: 29 }, { classCode: "D", maxPassengers: null },
  { classCode: "B2_OLD", maxPassengers: 8 }, { classCode: "C_OLD", maxPassengers: 8 }, { classCode: "D_OLD", maxPassengers: 29 }, { classCode: "E_OLD", maxPassengers: null },
];
const xe = (v: Partial<XeVao> = {}): XeVao => ({ id: "xe-a", bienSo: "79B-123.45", soCho: 15, trangThai: "active", chuXePartyId: "cty", chuLaCongTy: true, giayTo: [], ...v });
const taiXe = (hang: string | null = "D1", het: string | null = "2027-12-31", v: Partial<TaiXeVao> = {}): TaiXeVao => ({
  partyId: "tx-an", displayName: "Tài xế An", loai: "CONG_TY", carrierPartyIds: [],
  giayTo: [{ rowId: "gplx-an", typeCode: "GPLX", classCode: hang, expiryDate: het }], ...v,
});
const ma = (xs: LyDoGiu[]) => xs.map((x) => x.ma);
const ai = (xs: LyDoGiu[]) => xs.map((x) => `${x.ma}:${x.aiXuLy}`);

// ---- kiemTaoSuaChuyen ---------------------------------------------------------------------------------------------------------------------------------------
const BAT_DAU = ms("2026-09-30", "05:50");
const KET_THUC = ms("2026-09-30", "08:30");
const HOM_TRUOC = ms("2026-09-29", "20:00"); // bây giờ: tối hôm trước, ngoài mốc 6 giờ của chuyến 05:50
function tao(v: Partial<KiemTaoSuaChuyenVao["chuyen"]> = {}, khac: KhungChuyen[] = [], extra: Partial<KiemTaoSuaChuyenVao> = {}): KiemTaoSuaChuyenVao {
  return { lenh: "TAO", chuyen: { id: null, batDauMs: BAT_DAU, ketThucMs: KET_THUC, xe: xe(), taiXe: taiXe(), nghiPhaLe: false, ...v }, chuyenKhac: khac, chinhSach: CS, hangBang: HB, bayGioMs: HOM_TRUOC, ...extra };
}
const khung = (v: Partial<KhungChuyen>): KhungChuyen => ({ id: "cx-khac", ma: "CX-3009-11", xeId: "xe-a", taiXePartyId: "tx-khac", batDauMs: BAT_DAU, ketThucMs: KET_THUC, ketThucThatMs: null, trangThai: "PLANNED", ...v });

test("kiemTaoSuaChuyen: xe 15 chỗ + tài xế hạng D1 còn hạn, không trùng, không mốc → đạt", () => {
  assert.deepEqual(kiemTaoSuaChuyen(tao()), { ok: true, chan: [], canPhaLe: [] });
});

test("TC-17 LC-12 lúc gán tài xế: hạng B với xe 15 chỗ; GPLX hết hạn TRƯỚC giờ kết thúc (kể cả chuyến qua nửa đêm); chưa có GPLX; GPLX chưa ghi hạng; không dòng hạng bằng", () => {
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({ taiXe: taiXe("B") })).chan), ["HANG_BANG_KHONG_DU:VAN_PHONG"]);
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({ taiXe: taiXe("D1", "2026-09-29") })).chan), ["GPLX_HET_HAN:QUAN_TRI"]);
  assert.equal(kiemTaoSuaChuyen(tao({ taiXe: taiXe("D1", "2026-09-30") })).ok, true, "hạn ghi 30/09 = còn dùng hết ngày 30/09 (giờ VN)");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ ketThucMs: ms("2026-10-01", "01:00"), taiXe: taiXe("D1", "2026-09-30") })).chan), ["GPLX_HET_HAN"], "chuyến 23:00 → 01:00 hôm sau");
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({ taiXe: taiXe("D1", null, { giayTo: [] }) })).chan), ["GPLX_THIEU:QUAN_TRI"]);
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({ taiXe: taiXe(null) })).chan), ["GPLX_THIEU_HANG:QUAN_TRI"]);
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({}, [], { hangBang: HB.filter((h) => h.classCode !== "D1") })).chan), ["KHONG_CO_HANG_BANG:TOAN_QUYEN"], "không đoán số khách của hạng lạ");
  assert.equal(kiemTaoSuaChuyen(tao({ taiXe: taiXe("D") })).ok, true, "hạng D: không giới hạn");
  assert.equal(kiemTaoSuaChuyen(tao({ xe: xe({ soCho: 29 }), taiXe: taiXe("D2") })).ok, true);
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ xe: xe({ soCho: 30 }), taiXe: taiXe("D2") })).chan), ["HANG_BANG_KHONG_DU"]);
  // Hai GPLX: một hết hạn, một còn hạn đủ hạng → đạt (chọn cái dùng được).
  const hai = taiXe("B", "2026-01-01", { giayTo: [{ rowId: "g1", typeCode: "GPLX", classCode: "B", expiryDate: "2026-01-01" }, { rowId: "g2", typeCode: "GPLX", classCode: "D2", expiryDate: null }] });
  assert.equal(kiemTaoSuaChuyen(tao({ taiXe: hai })).ok, true);
});

test("TC-17 chính sách rỗng → CHẶN (Toàn quyền xử lý), không đoán khoảng nghỉ / mốc", () => {
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({}, [], { chinhSach: null })).chan), ["CHINH_SACH_RONG:TOAN_QUYEN"]);
});

test("LC-03 trùng giờ (I22 nửa mở, chuyến huỷ không tính, chuyến đã kết thúc sớm tính tới giờ kết thúc THẬT) và CH-02 khoảng nghỉ (cần phá lệ)", () => {
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({}, [khung({ xeId: "xe-a" })])).chan), ["TRUNG_GIO_XE:VAN_PHONG"]);
  assert.match(kiemTaoSuaChuyen(tao({}, [khung({ xeId: "xe-a" })])).chan[0]!.loiNhan, /CX-3009-11/);
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({}, [khung({ xeId: "xe-b", taiXePartyId: "tx-an" })])).chan), ["TRUNG_GIO_TAI_XE"]);
  assert.equal(kiemTaoSuaChuyen(tao({}, [khung({ trangThai: "CANCELLED" })])).ok, true, "chuyến đã huỷ không chiếm giờ");
  // Nối đuôi (kết thúc = bắt đầu) → không trùng, nhưng nghỉ 0 < 30 phút → cần phá lệ khoảng nghỉ.
  const noiDuoi = kiemTaoSuaChuyen(tao({}, [khung({ batDauMs: BAT_DAU - 2 * 3600e3, ketThucMs: BAT_DAU })]));
  assert.deepEqual(noiDuoi.chan, []);
  assert.deepEqual(ai(noiDuoi.canPhaLe), ["KHOANG_NGHI:QUAN_TRI"]);
  assert.equal(kiemTaoSuaChuyen(tao({ nghiPhaLe: true }, [khung({ batDauMs: BAT_DAU - 2 * 3600e3, ketThucMs: BAT_DAU })])).ok, true, "đã có phá lệ khoảng nghỉ");
  assert.equal(kiemTaoSuaChuyen(tao({}, [khung({ batDauMs: BAT_DAU - 3 * 3600e3, ketThucMs: BAT_DAU - 30 * PHUT })])).ok, true, "nghỉ đúng 30 phút → đạt");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({}, [khung({ batDauMs: BAT_DAU - 3 * 3600e3, ketThucMs: BAT_DAU - 29 * PHUT })])).canPhaLe), ["KHOANG_NGHI"]);
  // Chuyến sau cũng tính khoảng nghỉ.
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({}, [khung({ batDauMs: KET_THUC + 10 * PHUT, ketThucMs: KET_THUC + 3600e3 })])).canPhaLe), ["KHOANG_NGHI"]);
  // I22: chuyến trước kế hoạch tới 06:30 nhưng đã KẾT THÚC THẬT lúc 05:00 → khoảng từ 05:00, không trùng, nghỉ 50 phút đủ.
  const ketThucSom = khung({ batDauMs: BAT_DAU - 3 * 3600e3, ketThucMs: BAT_DAU + 40 * PHUT, ketThucThatMs: BAT_DAU - 50 * PHUT, trangThai: "ENDED" });
  assert.equal(kiemTaoSuaChuyen(tao({}, [ketThucSom])).ok, true);
});

test("TC-18 giờ chuyến: 23:00 → 01:00 hôm sau hợp lệ; quá 24 giờ, kết thúc trước / bằng bắt đầu → chặn", () => {
  assert.equal(kiemTaoSuaChuyen(tao({ batDauMs: ms("2026-09-30", "23:00"), ketThucMs: ms("2026-10-01", "01:00") })).ok, true);
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ batDauMs: BAT_DAU, ketThucMs: BAT_DAU + 24 * 3600e3 + PHUT })).chan), ["GIO_CHUYEN_KHONG_HOP_LE"]);
  assert.equal(kiemTaoSuaChuyen(tao({ batDauMs: BAT_DAU, ketThucMs: BAT_DAU + 24 * 3600e3 })).ok, true, "đúng 24 giờ được");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ ketThucMs: BAT_DAU })).chan), ["GIO_CHUYEN_KHONG_HOP_LE"]);
});

test("LC-13 không chéo xe – tài xế (lớp máy chủ): xe công ty ↔ tài xế công ty không thuộc nhà xe nào; xe nhà xe X ↔ tài xế của X", () => {
  const nhaXeX = xe({ id: "xe-x", chuXePartyId: "nx-x", chuLaCongTy: false });
  const txX = taiXe("D1", null, { partyId: "tx-x", loai: "NHA_XE", carrierPartyIds: ["nx-x"] });
  const txY = taiXe("D1", null, { partyId: "tx-y", loai: "NHA_XE", carrierPartyIds: ["nx-y"] });
  assert.deepEqual(ai(kiemTaoSuaChuyen(tao({ taiXe: txX })).chan), ["CHEO_XE_TAI_XE:VAN_PHONG"], "tài xế nhà xe lái xe công ty");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ xe: nhaXeX })).chan), ["CHEO_XE_TAI_XE"], "tài xế công ty lái xe nhà xe");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ xe: nhaXeX, taiXe: txY })).chan), ["CHEO_XE_TAI_XE"], "tài xế nhà xe Y lái xe nhà xe X");
  assert.equal(kiemTaoSuaChuyen(tao({ xe: nhaXeX, taiXe: txX })).ok, true);
  // T-2: vừa là tài xế công ty vừa "Tài xế của" nhà xe X → không lái xe công ty (khớp lớp CSDL), lái được xe của X.
  const hai = taiXe("D1", null, { loai: "CONG_TY", carrierPartyIds: ["nx-x"] });
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ taiXe: hai })).chan), ["CHEO_XE_TAI_XE"]);
  assert.equal(kiemTaoSuaChuyen(tao({ xe: nhaXeX, taiXe: hai })).ok, true);
});

test("xe: ngừng dùng → chặn; bảo dưỡng → cho lên kế hoạch (bị GIỮ lúc xuất bến, [TK] §5.9); đổi sang xe ít chỗ hơn tải đang xếp → vượt chỗ", () => {
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({ xe: xe({ trangThai: "retired" }) })).chan), ["XE_KHONG_DUNG"]);
  assert.equal(kiemTaoSuaChuyen(tao({ xe: xe({ trangThai: "maintenance" }) })).ok, true);
  const sua = tao({ xe: xe({ id: "xe-nho", soCho: 7 }), taiXe: taiXe("B") }, [], {
    lenh: "SUA", cu: { batDauMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-an", trangThai: "PLANNED" }, taiTrenChuyen: 9,
  });
  assert.deepEqual(ai(kiemTaoSuaChuyen(sua).chan), ["VUOT_SO_CHO:VAN_PHONG"]);
});

test("mốc lúc xếp (Q2 = (a)): TẠO trong mốc không cần phá lệ; SỬA đổi xe / đổi tài xế trong mốc → cần phá lệ; sửa chuyến đã chạy → chặn", () => {
  const trongMoc = BAT_DAU - 200 * PHUT;
  assert.equal(kiemTaoSuaChuyen(tao({}, [], { bayGioMs: trongMoc })).ok, true, "tạo chuyến trong 6 giờ");
  const cu = { batDauMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-cu", trangThai: "PLANNED" as const };
  const doiTaiXe = kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu, bayGioMs: trongMoc }));
  assert.deepEqual(ai(doiTaiXe.canPhaLe), ["MOC_TOI_THIEU:QUAN_TRI"]);
  const doiXe = kiemTaoSuaChuyen(tao({ taiXe: taiXe() }, [], { lenh: "SUA", cu: { ...cu, xeId: "xe-cu", taiXePartyId: "tx-an" }, bayGioMs: trongMoc }));
  assert.deepEqual(ma(doiXe.canPhaLe), ["MOC_TOI_THIEU"]);
  const khongDoi = kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu: { ...cu, taiXePartyId: "tx-an" }, bayGioMs: trongMoc }));
  assert.equal(khongDoi.ok, true, "không đổi xe, không đổi tài xế (vd chỉ đổi thứ tự điểm) → không khoá");
  assert.deepEqual(ma(kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu: { ...cu, taiXePartyId: "tx-an", trangThai: "RUNNING" } })).chan), ["CHUYEN_KHONG_CON_LEN_KE_HOACH"]);
  // Đổi giờ xuất bến + đổi tài xế cùng lệnh: xét theo giờ SỚM HƠN của cũ / mới (không lách mốc bằng cách dời giờ trong cùng lệnh).
  const doiGioVaTaiXe = kiemTaoSuaChuyen(tao({ batDauMs: BAT_DAU + 8 * 3600e3, ketThucMs: KET_THUC + 8 * 3600e3 }, [], { lenh: "SUA", cu, bayGioMs: trongMoc }));
  assert.deepEqual(ma(doiGioVaTaiXe.canPhaLe), ["MOC_TOI_THIEU"]);
});

// ---- kiemXep ------------------------------------------------------------------------------------------------------------------------------------------------
const chang = (v: Partial<ChangVao> = {}): ChangVao => ({
  legId: "leg-1", orderId: "don-1", orderCode: "ĐH-1024", chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true,
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: 4, nguoiCuaDon: ["p1", "p2", "p3", "p4"], datGap: false, ...v,
});
const suat = (v: Partial<SuatVao>): SuatVao => ({
  id: "s-x", tripId: "cx-07", loai: "PASSENGER", legId: "leg-1", personKey: null, crewPartyId: null, boardStopId: "d-1", alightStopId: "d-9", trangThai: "WAITING", mo: true, ...v,
});
const CX = { id: "cx-07", ma: "CX-3009-07", trangThai: "PLANNED" as const, batDauMs: BAT_DAU, soCho: 15, tai: 0 };
const xep = (them: Parameters<typeof kiemXep>[0]["them"], v: Partial<Parameters<typeof kiemXep>[0]> = {}) => kiemXep({ chuyen: CX, them, chinhSach: CS, bayGioMs: HOM_TRUOC, ...v });

test("kiemXep: xếp 4 người (2 có tên, 2 chưa tên) của chặng đã xác nhận vào xe 15 chỗ → đạt", () => {
  assert.deepEqual(xep([{ chang: chang(), soSuatMoi: 4, personKeys: ["p1", "p2"], suatMoCuaChang: [] }]), { ok: true, chan: [], canPhaLe: [] });
});

test("TC-17 kiemXep LC-09: đơn đã huỷ, đơn nháp, chặng đã bỏ → chặn; I13 chặng chưa có giờ → chặn", () => {
  for (const c of [chang({ donDaHuy: true }), chang({ donDaXacNhan: false }), chang({ changMo: false })]) {
    assert.deepEqual(ai(xep([{ chang: c, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }]).chan), ["CHANG_KHONG_HOP_LE:VAN_PHONG"]);
  }
  assert.deepEqual(ai(xep([{ chang: chang({ gioDon: null }), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }]).chan), ["CHUA_CO_GIO:VAN_PHONG"]);
});

test("kiemXep L-D1 (số suất mở + mới ≤ số người của chặng), LC-02 (tải + mới ≤ số chỗ, kể cả người đi kèm), LC-10, LC-01 theo tên", () => {
  const coSan = [suat({ id: "s1" }), suat({ id: "s2", tripId: "cx-04" }), suat({ id: "s3" })];
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 2, personKeys: [], suatMoCuaChang: coSan }]).chan), ["VUOT_SO_NGUOI_CHANG"]);
  assert.equal(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: coSan }]).ok, true);
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 3, personKeys: [], suatMoCuaChang: [] }], { chuyen: { ...CX, tai: 13 } }).chan), ["VUOT_SO_CHO"]);
  assert.equal(xep([{ chang: chang(), soSuatMoi: 2, personKeys: [], suatMoCuaChang: [] }], { chuyen: { ...CX, tai: 13 } }).ok, true, "13 + 2 = 15 chỗ");
  assert.deepEqual(ma(xep([], { chuyen: { ...CX, tai: 15 }, soNguoiDiKemMoi: 1 }).chan), ["VUOT_SO_CHO"], "người đi kèm chiếm chỗ như khách (G9)");
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 1, personKeys: ["p-don-khac"], suatMoCuaChang: [] }]).chan), ["KHACH_KHONG_THUOC_DON"]);
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 1, personKeys: ["p1"], suatMoCuaChang: [suat({ id: "s9", tripId: "cx-04", personKey: "p1" })] }]).chan), ["NGUOI_DA_O_CHUYEN_KHAC"]);
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 2, personKeys: ["p1", "p1"], suatMoCuaChang: [] }]).chan), ["NGUOI_DA_O_CHUYEN_KHAC"]);
});

test("kiemXep mốc (ĐP2(ii), Q2 = (a)): trong 6 giờ, chặng chưa đặt gấp → cần phá lệ; chặng đặt gấp → qua; chuyến đã chạy → chặn; chính sách rỗng → chặn", () => {
  const trongMoc = BAT_DAU - 200 * PHUT;
  assert.deepEqual(ai(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { bayGioMs: trongMoc }).canPhaLe), ["MOC_TOI_THIEU:QUAN_TRI"]);
  assert.equal(xep([{ chang: chang({ datGap: true }), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { bayGioMs: trongMoc }).ok, true);
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chuyen: { ...CX, trangThai: "RUNNING" } }).chan), ["CHUYEN_KHONG_CON_LEN_KE_HOACH"]);
  assert.deepEqual(ai(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chinhSach: null }).chan), ["CHINH_SACH_RONG:TOAN_QUYEN"]);
});

// ---- kiemXuatBen --------------------------------------------------------------------------------------------------------------------------------------------
const chuyenVao = (v: Partial<ChuyenVao> = {}): ChuyenVao => ({
  id: "cx-07", ma: "CX-3009-07", ngayChay: "2026-09-30", batDauMs: BAT_DAU, ketThucMs: KET_THUC, ketThucThatMs: null, trangThai: "PLANNED",
  xe: xe(), taiXe: taiXe(), nghiChup: 30, nghiPhaLe: false, ...v,
});
const BON_SUAT = [suat({ id: "s1", personKey: "p1" }), suat({ id: "s2", personKey: "p2" }), suat({ id: "s3" }), suat({ id: "s4" })];
const LUC_XUAT_BEN = BAT_DAU - 5 * PHUT;
function xb(v: Partial<KiemXuatBenVao> = {}): KiemXuatBenVao {
  return { chuyen: chuyenVao(), suat: BON_SUAT, chang: [chang()], suatMoCuaChang: BON_SUAT, chuyenKhac: [], chinhSach: CS, hangBang: HB, dieuKien: [], bayGioMs: LUC_XUAT_BEN, ...v };
}

test("kiemXuatBen đạt: đủ điều kiện → dat, không lý do; gắn 2 tên còn thiếu theo thứ tự khoá người (I19b); bản chụp có GPLX (khoá + hạng + hạn), không số", () => {
  const r = kiemXuatBen(xb());
  assert.equal(r.dat, true, JSON.stringify(r.lyDo));
  assert.deepEqual(r.lyDo, []);
  assert.deepEqual(r.ganTen, [{ suatId: "s3", personKey: "p3" }, { suatId: "s4", personKey: "p4" }]);
  assert.deepEqual(r.chup, {
    policyId: "cs-1", xeId: "xe-a", bienSo: "79B-123.45", soCho: 15, chuXePartyId: "cty", taiXePartyId: "tx-an", nghiDaDung: 30,
    muc: [{ loai: "GPLX", vehicleDocumentId: null, personDocumentId: "gplx-an", documentTypeCode: "GPLX", licenseClassCode: "D1", expiryDate: "2027-12-31", ruleId: null }],
  });
});

test("TC-17 kiemXuatBen: mỗi ca giữ ra đúng mã và đúng 'ai xử lý'", () => {
  const ca: [string, Partial<KiemXuatBenVao>, string[]][] = [
    ["thiếu tên (đơn chỉ có 3 tên cho 4 người)", { chang: [chang({ nguoiCuaDon: ["p1", "p2", "p3"] })] }, ["THIEU_TEN:VAN_PHONG"]],
    ["GPLX hết hạn trước giờ kết thúc", { chuyen: chuyenVao({ taiXe: taiXe("D1", "2026-09-29") }) }, ["GPLX_HET_HAN:QUAN_TRI"]],
    ["hạng B với xe 15 chỗ", { chuyen: chuyenVao({ taiXe: taiXe("B") }) }, ["HANG_BANG_KHONG_DU:VAN_PHONG"]],
    ["chính sách rỗng", { chinhSach: null }, ["CHINH_SACH_RONG:TOAN_QUYEN"]],
    ["không dòng hạng bằng cho hạng của tài xế", { hangBang: HB.filter((h) => h.classCode !== "D1") }, ["KHONG_CO_HANG_BANG:TOAN_QUYEN"]],
    ["đơn đã huỷ", { chang: [chang({ donDaHuy: true })] }, ["DON_DA_HUY:VAN_PHONG"]],
    ["chặng đã bỏ", { chang: [chang({ changMo: false })] }, ["CHANG_DA_DONG:VAN_PHONG"]],
    ["thiếu suất (chặng 5 người, mới xếp 4)", { chang: [chang({ soNguoi: 5, nguoiCuaDon: ["p1", "p2", "p3", "p4", "p5"] })] }, ["THIEU_SUAT:VAN_PHONG"]],
    ["thừa suất (chặng còn 3 người, đang xếp 4)", { chang: [chang({ soNguoi: 3 })] }, ["THUA_SUAT:VAN_PHONG"]],
    ["chưa có tài xế", { chuyen: chuyenVao({ taiXe: null }) }, ["CHUA_CO_TAI_XE:VAN_PHONG"]],
    ["chặng chưa có nơi trả", { chang: [chang({ coNoiTra: false })] }, ["CHUA_CO_NOI_TRA:VAN_PHONG"]],
    ["chặng chưa có giờ", { chang: [chang({ gioDon: null })] }, ["CHUA_CO_GIO:VAN_PHONG"]],
    ["xe bảo dưỡng", { chuyen: chuyenVao({ xe: xe({ trangThai: "maintenance" }) }) }, ["XE_KHONG_DUNG:VAN_PHONG"]],
    ["nghỉ thiếu (chuyến trước của xe kết thúc THẬT 10 phút trước)", {
      chuyenKhac: [khung({ id: "cx-truoc", xeId: "xe-a", taiXePartyId: "tx-khac", batDauMs: BAT_DAU - 4 * 3600e3, ketThucMs: BAT_DAU - 2 * 3600e3, ketThucThatMs: LUC_XUAT_BEN - 10 * PHUT, trangThai: "ENDED" })],
    }, ["NGHI_THIEU:QUAN_TRI"]],
    ["xe đang chạy chuyến khác", { chuyenKhac: [khung({ id: "cx-dang", xeId: "xe-a", trangThai: "RUNNING" })] }, ["TRUNG_GIO_XE:VAN_PHONG"]],
    ["tài xế đang chạy chuyến khác", { chuyenKhac: [khung({ id: "cx-dang", xeId: "xe-b", taiXePartyId: "tx-an", trangThai: "RUNNING" })] }, ["TRUNG_GIO_TAI_XE:VAN_PHONG"]],
    ["vượt số chỗ (xe còn 3 chỗ sau khi giảm)", { chuyen: chuyenVao({ xe: xe({ soCho: 3 }), taiXe: taiXe("B") }) }, ["VUOT_SO_CHO:VAN_PHONG"]],
    ["chéo xe – tài xế", { chuyen: chuyenVao({ taiXe: taiXe("D1", null, { loai: "NHA_XE", carrierPartyIds: ["nx-x"] }) }) }, ["CHEO_XE_TAI_XE:VAN_PHONG"]],
    ["chính sách đòi hợp đồng (khoá 0 ở CSDL — vẫn chặn nếu lọt)", { chinhSach: { ...CS, requireContract: true } }, ["HOP_DONG:TOAN_QUYEN"]],
    ["suất trỏ chặng không có trong dữ liệu vào → không đoán, giữ", { chang: [] }, ["CHANG_DA_DONG:VAN_PHONG"]],
  ];
  for (const [ten, v, mong] of ca) {
    const r = kiemXuatBen(xb(v));
    assert.equal(r.dat, false, ten);
    assert.deepEqual(ai(r.lyDo), mong, ten);
  }
});

test("kiemXuatBen: nghỉ đủ tính từ giờ kết thúc THẬT; đã phá lệ khoảng nghỉ → không giữ; không bắt đủ danh sách → không giữ vì tên (vẫn gắn tên có sẵn)", () => {
  const truoc = khung({ id: "cx-truoc", xeId: "xe-a", taiXePartyId: "tx-khac", batDauMs: BAT_DAU - 4 * 3600e3, ketThucMs: BAT_DAU, ketThucThatMs: LUC_XUAT_BEN - 30 * PHUT, trangThai: "ENDED" });
  assert.equal(kiemXuatBen(xb({ chuyenKhac: [truoc] })).dat, true, "kết thúc thật 30 phút trước (kế hoạch thì nối đuôi) → nghỉ đủ");
  const sat = { ...truoc, ketThucThatMs: LUC_XUAT_BEN - 29 * PHUT };
  assert.equal(kiemXuatBen(xb({ chuyenKhac: [sat], chuyen: chuyenVao({ nghiPhaLe: true }) })).dat, true);
  const r = kiemXuatBen(xb({ chinhSach: { ...CS, requireManifest: false }, chang: [chang({ nguoiCuaDon: ["p1", "p2", "p3"] })] }));
  assert.equal(r.dat, true);
  assert.deepEqual(r.ganTen, [{ suatId: "s3", personKey: "p3" }], "gắn được bao nhiêu gắn bấy nhiêu");
});

test("kiemXuatBen điều kiện đang hiệu lực (theo cỡ xe): giấy tờ xe / tài xế còn hạn tới hết chuyến → vào bản chụp kèm mã điều kiện; thiếu → giữ, Quản trị xử lý", () => {
  const dk: DieuKienVao[] = [
    { id: "dk-xe", minCapacity: 10, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" },
    { id: "dk-tx", minCapacity: 10, subject: "DRIVER", documentTypeCode: "HEALTH_CHECK" },
    { id: "dk-lon", minCapacity: 16, subject: "VEHICLE", documentTypeCode: "DRIVER_CAMERA" },
  ];
  const thieu = kiemXuatBen(xb({ dieuKien: dk }));
  assert.deepEqual(ai(thieu.lyDo), ["DIEU_KIEN_GIAY_TO_XE:QUAN_TRI", "DIEU_KIEN_GIAY_TO_TAI_XE:QUAN_TRI"], "điều kiện xe từ 16 chỗ không áp cho xe 15");
  assert.deepEqual(thieu.chup.muc.filter((m) => m.loai === "DIEU_KIEN").map((m) => m.ruleId), ["dk-xe", "dk-tx"]);
  const du = kiemXuatBen(xb({
    dieuKien: dk,
    chuyen: chuyenVao({
      xe: xe({ giayTo: [{ rowId: "gx-1", typeCode: "CONTRACT_BADGE", expiryDate: "2026-09-30" }] }),
      taiXe: taiXe("D1", "2027-12-31", { giayTo: [...taiXe().giayTo, { rowId: "gk-1", typeCode: "HEALTH_CHECK", classCode: null, expiryDate: null }] }),
    }),
  }));
  assert.equal(du.dat, true, JSON.stringify(du.lyDo));
  assert.deepEqual(du.chup.muc.map((m) => [m.loai, m.ruleId, m.vehicleDocumentId ?? m.personDocumentId]), [["GPLX", null, "gplx-an"], ["GIAY_TO_XE", "dk-xe", "gx-1"], ["GIAY_TO_NGUOI", "dk-tx", "gk-1"]]);
  const hetHan = kiemXuatBen(xb({ dieuKien: dk.slice(0, 1), chuyen: chuyenVao({ ketThucMs: ms("2026-10-01", "01:00"), xe: xe({ giayTo: [{ rowId: "gx-1", typeCode: "CONTRACT_BADGE", expiryDate: "2026-09-30" }] }) }) }));
  assert.deepEqual(ma(hetHan.lyDo), ["DIEU_KIEN_GIAY_TO_XE"], "hết hạn trước giờ kết thúc (chuyến qua nửa đêm)");
});

test("kiemXuatBen: câu lý do không bao giờ chứa tên tài xế / khoá người; chỉ mã đơn, mã chuyến, biển số, con số", () => {
  const r = kiemXuatBen(xb({ chang: [chang({ nguoiCuaDon: ["p1"] })], chuyen: chuyenVao({ taiXe: taiXe("B", "2026-01-01") }) }));
  const text = JSON.stringify(r.lyDo);
  assert.doesNotMatch(text, /Tài xế An|p1|p2|p3|p4|gplx-an/);
  assert.match(text, /ĐH-1024/);
});

// ---- kiemKetThuc, trongNgayChay ------------------------------------------------------------------------------------------------------------------------------
test("kiemKetThuc (LC-16): mọi suất mở đã có kết quả cuối và mọi điểm đã xong / bỏ qua / chuyển → được; còn thì gợi ý 'Kết thúc gián đoạn'", () => {
  const diem = (trangThai: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED", id = "d") => ({ id, tripId: "cx-07", seq: 1, loai: "PICKUP" as const, trangThai });
  const xong = [suat({ id: "a", trangThai: "DROPPED" }), suat({ id: "b", trangThai: "NO_SHOW" }), suat({ id: "c", trangThai: "CANCELLED_AT_STOP" }), suat({ id: "d", trangThai: "WAITING", mo: false })];
  assert.deepEqual(kiemKetThuc({ suat: xong, diem: [diem("DONE"), diem("SKIPPED", "e"), diem("MOVED", "f")] }), { duoc: true });
  assert.deepEqual(kiemKetThuc({ suat: [...xong, suat({ id: "w", trangThai: "WAITING" }), suat({ id: "x", trangThai: "BOARDED" })], diem: [diem("ARRIVED")] }), {
    duoc: false, goiY: "KET_THUC_GIAN_DOAN", conSuat: 2, conDiem: 1,
  });
});

test("TC-18 trongNgayChay: hôm nay = ngày chạy → có; hôm qua + đang chạy (qua nửa đêm) → có; ngày mai → không; hôm qua đã kết thúc → không", () => {
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "PLANNED" }, "2026-09-30"), true);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-29", trangThai: "RUNNING" }, "2026-09-30"), true);
  assert.equal(trongNgayChay({ ngayChay: "2026-10-01", trangThai: "PLANNED" }, "2026-09-30"), false);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-29", trangThai: "ENDED" }, "2026-09-30"), false);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "ENDED" }, "2026-09-30"), true, "đã kết thúc trong ngày chạy vẫn là ngày chạy");
});
