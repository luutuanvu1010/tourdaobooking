// Luật thuần của điều phối (ADR-0049 D1, D2; kế hoạch Task A4; TC-17, TC-18): kiểm tạo / sửa chuyến (LC-03, CH-02, LC-12, LC-13, mốc lúc xếp), kiểm xếp
// (LC-01, LC-02, LC-09, LC-10, L-D1, I13, mốc), cổng xuất bến (sàn cứng GPLX, điều kiện đang hiệu lực, đủ tên, đơn huỷ, chặng đóng, sức chứa, nghỉ đủ, nơi
// trả, xe đang dùng, LC-13, hợp đồng khoá 0), kết thúc (LC-16), "trong ngày chạy". Mỗi ca ra ĐÚNG mã `LyDoGiu` và ĐÚNG "ai xử lý". Chính sách rỗng hoặc
// hạng lạ → CHẶN (không đoán).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChangVao, ChinhSachVao, ChuyenVao, DiemVao, DieuKienVao, HangBangVao, KhungBanVao, KhungChuyen, SuatVao, TaiXeVao, XeVao } from "./dieu-phoi-kieu.ts";
import { changXetTheoDon, khoaNguoiRanh, kiemKetThuc, lyDoNoiTra, lyDoThieuTen, kiemTaoSuaChuyen, kiemXep, kiemXuatBen, noiLechCuaSuat, suatKhachDaDoi, tenLucXep, trongNgayChay, type KiemTaoSuaChuyenVao, type KiemXuatBenVao } from "./dieu-phoi-kiem.ts";
import { MA_GIU, NUT_CAP_NHAT_KHACH, type LyDoGiu } from "./ly-do-giu.ts";
import { MA_LUAT_PHA_LE } from "./dieu-phoi-kieu.ts";
import { batDauSomNhatSauDoiGio } from "./moc-toi-thieu.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const CS: ChinhSachVao = { id: "cs-1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720 };
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
  assert.deepEqual(kiemTaoSuaChuyen(tao()), { ok: true, chan: [], canPhaLe: [], nhacGioLai: [], camKet: null });
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
    lenh: "SUA", cu: { batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-an", trangThai: "PLANNED" }, taiTrenChuyen: 9,
  });
  assert.deepEqual(ai(kiemTaoSuaChuyen(sua).chan), ["VUOT_SO_CHO:VAN_PHONG"]);
});

test("mốc lúc xếp (Q2 = (a)): TẠO trong mốc không cần phá lệ; SỬA đổi xe / đổi tài xế trong mốc → cần phá lệ; sửa chuyến đã chạy → chặn", () => {
  const trongMoc = BAT_DAU - 200 * PHUT;
  assert.equal(kiemTaoSuaChuyen(tao({}, [], { bayGioMs: trongMoc })).ok, true, "tạo chuyến trong 6 giờ");
  const cu = { batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-cu", trangThai: "PLANNED" as const };
  const doiTaiXe = kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu, bayGioMs: trongMoc }));
  assert.deepEqual(ai(doiTaiXe.canPhaLe), ["MOC_TOI_THIEU:VAN_PHONG"]);
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
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: 4, nguoiCuaDon: ["p1", "p2", "p3", "p4"], datGap: false,
  khoaNoiDon: "L:noi-don-1", khoaNoiTra: "L:noi-tra-9", xeRieng: false, choToiThieu: null, ...v, // khoá so sánh nơi GIẢ (ADR-0050 VK1-B) — khớp placeKey của điểm d-1 / d-9
});
const suat = (v: Partial<SuatVao>): SuatVao => ({
  id: "s-x", tripId: "cx-07", loai: "PASSENGER", legId: "leg-1", personKey: null, crewPartyId: null, boardStopId: "d-1", alightStopId: "d-9", trangThai: "WAITING", mo: true,
  moTuMs: Date.parse("2026-09-29T00:00:00.000Z"), ...v, // giờ ghi nhận mở suất GIẢ (ADR-0050 VK1-A vế 5)
});
const CX = { id: "cx-07", ma: "CX-3009-07", trangThai: "PLANNED" as const, batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, soCho: 15, tai: 0 };
const xep = (them: Parameters<typeof kiemXep>[0]["them"], v: Partial<Parameters<typeof kiemXep>[0]> = {}) => kiemXep({ chuyen: CX, them, changTrenChuyen: [], xeId: "xe-a", camKetPhaLeKhoa: null, chinhSach: CS, bayGioMs: HOM_TRUOC, ...v });

test("kiemXep: xếp 4 người (2 có tên, 2 chưa tên) của chặng đã xác nhận vào xe 15 chỗ → đạt", () => {
  assert.deepEqual(xep([{ chang: chang(), soSuatMoi: 4, personKeys: ["p1", "p2"], suatMoCuaChang: [] }]), { ok: true, chan: [], canPhaLe: [], canhBao: [], camKet: { viPham: [], khoa: null, daPhaLe: false, coXeRieng: false, lyDo: [] } });
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
  assert.deepEqual(ai(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { bayGioMs: trongMoc }).canPhaLe), ["MOC_TOI_THIEU:VAN_PHONG"]);
  assert.equal(xep([{ chang: chang({ datGap: true }), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { bayGioMs: trongMoc }).ok, true);
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chuyen: { ...CX, trangThai: "RUNNING" } }).chan), ["CHUYEN_KHONG_CON_LEN_KE_HOACH"]);
  assert.deepEqual(ai(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chinhSach: null }).chan), ["CHINH_SACH_RONG:TOAN_QUYEN"]);
});

test("R-P6 khoá DÍNH — tái hiện chuỗi lách 3 bước (Q-A4-1, người kiểm giữa chừng): dời giờ xuất bến ra xa → đổi tài xế / xếp / rút / dời / huỷ có khách → dời về: bước 2 PHẢI bị chặn", () => {
  const trongMoc = BAT_DAU - 200 * PHUT; // 02:30, chuyến 05:50 đã vào vùng 6 giờ
  const doiRa = BAT_DAU + 8 * 3600e3; // 13:50
  const goc = { batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-an", trangThai: "PLANNED" as const };
  // Bước 1: CHỈ dời giờ xuất bến ra xa — vẫn làm được (chủ: "Bán hàng vẫn dời giờ được").
  const b1 = kiemTaoSuaChuyen(tao({ batDauMs: doiRa, ketThucMs: KET_THUC + 8 * 3600e3 }, [], { lenh: "SUA", cu: goc, bayGioMs: trongMoc }));
  assert.equal(b1.ok, true, JSON.stringify(b1));
  // Sau bước 1 (lúc sửa chuyến ĐANG trong vùng khoá) giờ sớm nhất giữ 05:50 — R-P7, cùng hàm câu SQL của A12 sẽ dùng.
  const somNhat = batDauSomNhatSauDoiGio(goc, doiRa, trongMoc, CS.minLeadMinutes);
  assert.equal(somNhat, BAT_DAU);
  const sauDoi = { ...goc, batDauMs: doiRa, batDauSomNhatMs: somNhat };
  // Bước 2a: đổi tài xế khi giờ HIỆN TẠI đã ở xa → vẫn cần phá lệ.
  const b2 = kiemTaoSuaChuyen(tao({ batDauMs: doiRa, ketThucMs: KET_THUC + 8 * 3600e3, taiXe: taiXe("D1", null, { partyId: "tx-moi" }) }, [], { lenh: "SUA", cu: sauDoi, bayGioMs: trongMoc }));
  assert.deepEqual(ai(b2.canPhaLe), ["MOC_TOI_THIEU:VAN_PHONG"], "đổi tài xế sau khi dời giờ ra xa vẫn bị khoá");
  // Bước 2b: đổi xe — như trên.
  const b2x = kiemTaoSuaChuyen(tao({ batDauMs: doiRa, ketThucMs: KET_THUC + 8 * 3600e3, xe: xe({ id: "xe-khac" }) }, [], { lenh: "SUA", cu: sauDoi, bayGioMs: trongMoc }));
  assert.deepEqual(ma(b2x.canPhaLe), ["MOC_TOI_THIEU"]);
  // Bước 2c: xếp chặng CHƯA đặt gấp (và dời vào) vào chuyến đã dời ra xa → vẫn cần phá lệ; chặng đặt gấp vẫn qua.
  const cxDoi = { ...CX, batDauMs: doiRa, batDauSomNhatMs: BAT_DAU };
  for (const lenh of ["XEP", "DOI_DEN"] as const) {
    assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chuyen: cxDoi, bayGioMs: trongMoc, lenh }).canPhaLe), ["MOC_TOI_THIEU"], lenh);
  }
  assert.equal(xep([{ chang: chang({ datGap: true }), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chuyen: cxDoi, bayGioMs: trongMoc }).ok, true);
  // Bước 3: dời giờ về lại — việc dời giờ không bị khoá (không có khoá mới nào cần).
  const b3 = kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu: { ...sauDoi, taiXePartyId: "tx-an" }, bayGioMs: trongMoc }));
  assert.equal(b3.ok, true, JSON.stringify(b3));
  // Đối chứng: chuyến CHƯA BAO GIỜ vào vùng (giờ sớm nhất cũng 13:50) → đổi tài xế, xếp đều không cần phá lệ.
  const xaTuDau = { ...goc, batDauMs: doiRa, batDauSomNhatMs: doiRa };
  assert.equal(kiemTaoSuaChuyen(tao({ batDauMs: doiRa, ketThucMs: KET_THUC + 8 * 3600e3, taiXe: taiXe("D1", null, { partyId: "tx-moi" }) }, [], { lenh: "SUA", cu: xaTuDau, bayGioMs: trongMoc })).ok, true);
  assert.equal(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { chuyen: { ...CX, batDauMs: doiRa, batDauSomNhatMs: doiRa }, bayGioMs: trongMoc }).ok, true);
});

// ---- kiemXuatBen --------------------------------------------------------------------------------------------------------------------------------------------
const chuyenVao = (v: Partial<ChuyenVao> = {}): ChuyenVao => ({
  id: "cx-07", ma: "CX-3009-07", ngayChay: "2026-09-30", batDauMs: BAT_DAU, ketThucMs: KET_THUC, ketThucThatMs: null, trangThai: "PLANNED",
  xe: xe(), taiXe: taiXe(), nghiChup: 30, nghiPhaLe: false, thue: false, coNguonGia: false, camKetPhaLeKhoa: null, ...v,
});
const BON_SUAT = [suat({ id: "s1", personKey: "p1" }), suat({ id: "s2", personKey: "p2" }), suat({ id: "s3" }), suat({ id: "s4" })];
const LUC_XUAT_BEN = BAT_DAU - 5 * PHUT;
/** Điểm của chuyến — khoá so sánh nơi GIẢ khớp khung `chang()` (L:noi-don-1 / L:noi-tra-9 — ADR-0050 VK1-B). */
const diemVao = (id: string, loai: "PICKUP" | "DROPOFF", placeKey: string, v: Partial<DiemVao> = {}): DiemVao => ({
  id, tripId: "cx-07", seq: loai === "PICKUP" ? 1 : 9, loai, trangThai: "PENDING", placeKey, gioXeToiMs: null, ...v,
});
const DIEM = [diemVao("d-1", "PICKUP", "L:noi-don-1"), diemVao("d-9", "DROPOFF", "L:noi-tra-9")];
function xb(v: Partial<KiemXuatBenVao> = {}): KiemXuatBenVao {
  return {
    chuyen: chuyenVao(), suat: BON_SUAT, chang: [chang()], suatMoCuaChang: BON_SUAT, diem: DIEM, chuyenKhac: [], chinhSach: CS, hangBang: HB, dieuKien: [],
    bayGioMs: LUC_XUAT_BEN, xuatBenMs: LUC_XUAT_BEN, ...v,
  };
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
  const diem = (trangThai: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED", id = "d") => ({ id, tripId: "cx-07", seq: 1, loai: "PICKUP" as const, trangThai, placeKey: `L:${id}`, gioXeToiMs: null });
  const xong = [suat({ id: "a", trangThai: "DROPPED" }), suat({ id: "b", trangThai: "NO_SHOW" }), suat({ id: "c", trangThai: "CANCELLED_AT_STOP" }), suat({ id: "d", trangThai: "WAITING", mo: false })];
  assert.deepEqual(kiemKetThuc({ suat: xong, diem: [diem("DONE"), diem("SKIPPED", "e"), diem("MOVED", "f")] }), { duoc: true });
  assert.deepEqual(kiemKetThuc({ suat: [...xong, suat({ id: "w", trangThai: "WAITING" }), suat({ id: "x", trangThai: "BOARDED" })], diem: [diem("ARRIVED")] }), {
    duoc: false, goiY: "KET_THUC_GIAN_DOAN", conSuat: 2, conDiem: 1,
  });
});

test("TC-18 trongNgayChay: hôm nay = ngày chạy → có; hôm qua + đang chạy (qua nửa đêm) → có; ngày mai → không; hôm qua đã kết thúc → không", () => {
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "PLANNED" }, "2026-09-30"), true);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-29", trangThai: "RUNNING", xuatBenMs: Date.parse("2026-09-29T23:20:00+07:00") }, "2026-09-30"), true);
  assert.equal(trongNgayChay({ ngayChay: "2026-10-01", trangThai: "PLANNED" }, "2026-09-30"), false);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-29", trangThai: "ENDED" }, "2026-09-30"), false);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "ENDED" }, "2026-09-30"), true, "đã kết thúc trong ngày chạy vẫn là ngày chạy");
});

// Q-L3-B (ADR-0053 D7.2, câu thay ADR-0049 D3; kẽ G3-9): "đang chạy" chỉ tính khi ĐÃ XUẤT BẾN TỪ NGÀY CHẠY TRỞ ĐI (ngày VN của giờ xuất bến ≥ ngày chạy).
// Bấm Xuất bến tối hôm trước KHÔNG mở tên / SĐT khách sớm — một luật cho mọi tài xế.
test("TC-18 / Q-L3-B trongNgayChay: xuất bến SỚM (tối hôm trước, chuyến RUNNING) → KHÔNG trong ngày chạy tới 00:00 ngày chạy; qua nửa đêm (xuất bến trong ngày chạy) → có", () => {
  const ms = (ngay: string, gio: string) => Date.parse(`${ngay}T${gio}:00+07:00`);
  // chuyến 06:00 ngày 01/10, bấm Xuất bến 18:30 ngày 30/9 → lúc 23:00 ngày 30/9 vắng; 00:05 ngày 01/10 có (hôm nay là ngày chạy)
  assert.equal(trongNgayChay({ ngayChay: "2026-10-01", trangThai: "RUNNING", xuatBenMs: ms("2026-09-30", "18:30") }, "2026-09-30"), false, "xuất bến sớm không mở tên khách");
  assert.equal(trongNgayChay({ ngayChay: "2026-10-01", trangThai: "RUNNING", xuatBenMs: ms("2026-09-30", "18:30") }, "2026-10-01"), true);
  // xuất bến 23:59 ngày hôm trước (sát nửa đêm) vẫn là trước ngày chạy
  assert.equal(trongNgayChay({ ngayChay: "2026-10-01", trangThai: "RUNNING", xuatBenMs: ms("2026-09-30", "23:59") }, "2026-09-30"), false);
  // chuyến 23:30 ngày 30/9 qua nửa đêm: xuất bến 23:20 ngày 30/9, 00:30 ngày 01/10 còn RUNNING → có; xuất bến đúng 00:00 ngày chạy cũng tính
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "RUNNING", xuatBenMs: ms("2026-09-30", "23:20") }, "2026-10-01"), true);
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "RUNNING", xuatBenMs: ms("2026-09-30", "00:00") }, "2026-10-01"), true);
  // xuất bến sớm hôm trước rồi chạy qua ngày chạy sang hôm sau: vẫn không (không có ngày VN xuất bến ≥ ngày chạy, hôm nay ≠ ngày chạy)
  assert.equal(trongNgayChay({ ngayChay: "2026-09-30", trangThai: "RUNNING", xuatBenMs: ms("2026-09-29", "22:00") }, "2026-10-01"), false);
  // RUNNING mà thiếu giờ xuất bến (không xảy ra — CHECK của vc_trip) → không (không đoán)
  assert.equal(trongNgayChay({ ngayChay: "2026-09-29", trangThai: "RUNNING", xuatBenMs: null }, "2026-09-30"), false);
});

// ---- ADR-0050 VK1-B (TC-48, luật thuần — khoá GIẢ): giữ NOI_HEN_DOI khi nơi hẹn đổi sau khi xếp; VK1-A (TC-47, I37): nghỉ đo từ giờ XẢY RA xuất bến -------
test("TC-48 noiLechCuaSuat: khoá nơi của chặng so với placeKey của điểm lên / điểm xuống; chặng có nơi trả mà suất chưa có điểm xuống → lệch (I41); thiếu khoá → lệch (không đoán)", () => {
  const s = suat({ id: "s-1" });
  const [len, xuong] = DIEM;
  assert.deepEqual(noiLechCuaSuat(s, len, xuong, chang()), { don: false, tra: false });
  assert.deepEqual(noiLechCuaSuat(s, len, xuong, chang({ khoaNoiDon: "L:noi-khac" })), { don: true, tra: false });
  assert.deepEqual(noiLechCuaSuat(s, len, xuong, chang({ khoaNoiTra: "T:" + "a".repeat(64) })), { don: false, tra: true });
  assert.deepEqual(noiLechCuaSuat(suat({ alightStopId: null }), len, undefined, chang()), { don: false, tra: true }, "có nơi trả, suất chưa có điểm xuống");
  assert.deepEqual(noiLechCuaSuat(suat({ alightStopId: null }), len, undefined, chang({ khoaNoiTra: null, coNoiTra: false })), { don: false, tra: false }, "chặng chưa có nơi trả: không so (CHUA_CO_NOI_TRA lo)");
  assert.deepEqual(noiLechCuaSuat(s, undefined, xuong, chang()), { don: true, tra: false }, "không thấy điểm lên → lệch");
  const thieuKhoa = { ...chang() } as Partial<ChangVao>;
  delete thieuKhoa.khoaNoiDon;
  delete thieuKhoa.khoaNoiTra;
  assert.deepEqual(noiLechCuaSuat(s, len, xuong, thieuKhoa as ChangVao), { don: true, tra: true }, "dữ liệu vào thiếu khoá (undefined) → lệch, không 'khớp' im lặng");
});

test("TC-48 kiemXuatBen: đổi nơi ĐÓN sau khi xếp → giữ NOI_HEN_DOI (văn phòng); đổi nơi TRẢ → giữ; chặng có nơi trả mà suất chưa có điểm xuống → giữ; khoá khớp → không giữ", () => {
  const ca: [string, Partial<KiemXuatBenVao>][] = [
    ["đổi nơi đón (Sheraton → Amiana)", { chang: [chang({ khoaNoiDon: "L:noi-khac" })] }],
    ["đổi nơi trả", { chang: [chang({ khoaNoiTra: "L:noi-tra-khac" })] }],
    ["chặng có nơi trả, suất chưa có điểm xuống", { suat: BON_SUAT.map((x) => ({ ...x, alightStopId: null })), suatMoCuaChang: BON_SUAT.map((x) => ({ ...x, alightStopId: null })) }],
  ];
  for (const [ten, v] of ca) {
    const r = kiemXuatBen(xb(v));
    assert.equal(r.dat, false, ten);
    assert.deepEqual(ai(r.lyDo), ["NOI_HEN_DOI:VAN_PHONG"], ten);
    assert.match(r.lyDo[0]!.loiNhan, /ĐH-1024/, `${ten}: câu có mã đơn`);
    assert.doesNotMatch(r.lyDo[0]!.loiNhan, /L:|T:/, `${ten}: câu không lộ khoá nơi`);
  }
  assert.equal(kiemXuatBen(xb()).dat, true, "khoá khớp → không giữ");
  // Nhiều suất của CÙNG chặng lệch → MỘT lý do cho chặng đó.
  assert.equal(kiemXuatBen(xb({ chang: [chang({ khoaNoiDon: "L:noi-khac" })] })).lyDo.length, 1);
});

test("TC-47 (I37) kiemXuatBen: khoảng nghỉ đo từ giờ XẢY RA xuất bến — chuyến trước kết thúc thật 7:50, xuất bến khai 8:10 (bấm 8:45), nghỉ 30 → NGHI_THIEU; khai 8:20 → đạt", () => {
  const bd = ms("2026-09-30", "08:10");
  const kt = ms("2026-09-30", "10:00");
  const c = chuyenVao({ batDauMs: bd, ketThucMs: kt });
  const truoc = khung({ id: "cx-truoc", xeId: "xe-a", taiXePartyId: "tx-khac", batDauMs: ms("2026-09-30", "06:00"), ketThucMs: ms("2026-09-30", "07:50"), ketThucThatMs: ms("2026-09-30", "07:50"), trangThai: "ENDED" });
  const bam = ms("2026-09-30", "08:45");
  const thieu = kiemXuatBen(xb({ chuyen: c, chuyenKhac: [truoc], bayGioMs: bam, xuatBenMs: ms("2026-09-30", "08:10") }));
  assert.deepEqual(ai(thieu.lyDo), ["NGHI_THIEU:QUAN_TRI"]);
  assert.equal(kiemXuatBen(xb({ chuyen: c, chuyenKhac: [truoc], bayGioMs: bam, xuatBenMs: ms("2026-09-30", "08:20") })).dat, true);
  // đo từ lúc BẤM (8:45) thì đủ nghỉ 55 phút — sai: chính là lỗ khai lùi của ADR-0050
  assert.equal(kiemXuatBen(xb({ chuyen: c, chuyenKhac: [truoc], bayGioMs: bam, xuatBenMs: bam })).dat, true);
});

test("I38 (R-P9): chặng có suất trên chuyến mà RƠI khỏi lichChungChang → lý do CỤ THỂ theo cờ view (đơn đã huỷ / chặng đã bỏ / ngày đón ra ngoài khoảng đọc), không lý do chung; đơn huỷ / chặng bỏ KHÔNG kèm NOI_HEN_DOI", () => {
  const ngoai = (lyDo: "DON_DA_HUY" | "CHANG_DA_DONG" | "GIO_HEN_NGOAI_CHUYEN") => xb({ chang: [], changNgoai: [{ legId: "leg-1", orderCode: "ĐH-1024", lyDo }] });
  assert.deepEqual(ai(kiemXuatBen(ngoai("DON_DA_HUY")).lyDo), ["DON_DA_HUY:VAN_PHONG"]);
  assert.deepEqual(ai(kiemXuatBen(ngoai("CHANG_DA_DONG")).lyDo), ["CHANG_DA_DONG:VAN_PHONG"]);
  assert.deepEqual(ai(kiemXuatBen(ngoai("GIO_HEN_NGOAI_CHUYEN")).lyDo), ["GIO_HEN_NGOAI_CHUYEN:VAN_PHONG"]);
  assert.match(kiemXuatBen(ngoai("GIO_HEN_NGOAI_CHUYEN")).lyDo[0]!.loiNhan, /ĐH-1024/);
  // chặng CÓ trong dữ liệu vào nhưng đơn huỷ + khoá nơi lệch → chỉ DON_DA_HUY (không NOI_HEN_DOI — không bắt văn phòng "cập nhật điểm" cho khách đã huỷ)
  assert.deepEqual(ai(kiemXuatBen(xb({ chang: [chang({ donDaHuy: true, khoaNoiDon: "L:noi-khac" })] })).lyDo), ["DON_DA_HUY:VAN_PHONG"]);
  assert.deepEqual(ai(kiemXuatBen(xb({ chang: [chang({ changMo: false, khoaNoiDon: "L:noi-khac" })] })).lyDo), ["CHANG_DA_DONG:VAN_PHONG"]);
});

// ---- I19 — MỘT luật "khoá người rảnh" cho lúc xếp (a) và lúc xuất bến (b) (K2c VỪA-1: làm bù I19(a)) ---------------------------------------------------
const sv = (o: Partial<SuatVao> & { id: string }): SuatVao => ({
  tripId: "t", loai: "PASSENGER", legId: "L", personKey: null, crewPartyId: null, boardStopId: null, alightStopId: null, trangThai: "WAITING", mo: true, moTuMs: 0, ...o,
});
test("I19 khoaNguoiRanh: hành khách hiện hành của đơn − khoá có suất MỞ ở CHẶNG ĐÓ (mọi chuyến), theo thứ tự khoá người", () => {
  const nguoi = ["p3", "p1", "p2", "p4"];
  assert.deepEqual(khoaNguoiRanh({ legId: "L", nguoiCuaDon: nguoi, suatMoCuaChang: [] }), ["p1", "p2", "p3", "p4"], "sắp theo khoá người");
  const mo = [
    sv({ id: "a", personKey: "p2" }), // mở, chặng L → đã dùng
    sv({ id: "b", personKey: "p3", mo: false }), // suất đã đóng (rút) → tên dùng lại được
    sv({ id: "c", personKey: "p4", legId: "L2" }), // chặng khác → không tính
    sv({ id: "d", personKey: null }), // chưa tên → không tính
  ];
  assert.deepEqual(khoaNguoiRanh({ legId: "L", nguoiCuaDon: nguoi, suatMoCuaChang: mo }), ["p1", "p3", "p4"]);
  assert.deepEqual(khoaNguoiRanh({ legId: "L", nguoiCuaDon: [], suatMoCuaChang: [] }), []);
});
test("I19(a) tenLucXep: khoá thân gửi đứng trước, phần còn lại lấp bằng khoá rảnh (không lặp khoá thân gửi), hết khoá rảnh → null", () => {
  assert.deepEqual(tenLucXep({ soSuat: 3, personKeys: [], ranh: ["p1", "p2", "p3", "p4"] }), ["p1", "p2", "p3"], "không gửi tên → máy chọn theo thứ tự");
  assert.deepEqual(tenLucXep({ soSuat: 4, personKeys: [], ranh: ["p1", "p2"] }), ["p1", "p2", null, null], "thiếu tên → phần thiếu null");
  assert.deepEqual(tenLucXep({ soSuat: 3, personKeys: ["p3"], ranh: ["p1", "p2", "p3"] }), ["p3", "p1", "p2"], "gửi một phần → lấp phần còn lại, không lặp p3");
  assert.deepEqual(tenLucXep({ soSuat: 3, personKeys: ["p1"], ranh: ["p1", "p2", "p3"] }), ["p1", "p2", "p3"], "khoá đã gửi nằm đầu danh sách rảnh → không lặp p1");
  assert.deepEqual(tenLucXep({ soSuat: 2, personKeys: ["p2", "p1"], ranh: ["p1", "p2", "p3"] }), ["p2", "p1"], "gửi đủ → đúng như gửi");
  assert.deepEqual(tenLucXep({ soSuat: 0, personKeys: [], ranh: ["p1"] }), []);
});
test("I19(b) kiemXuatBen dùng CHUNG khoaNguoiRanh: khoá đã có suất mở ở chặng (chuyến khác) không được gắn lại; suất đã đóng trả khoá về", () => {
  // Hai suất chưa tên trên chuyến này; đơn có p1, p2, p3; p1 đang ở chuyến khác (mở) → gắn p2, p3.
  const suat = [sv({ id: "s1" }), sv({ id: "s2" })];
  const khac = sv({ id: "x", tripId: "t2", personKey: "p1" });
  const kq = khoaNguoiRanh({ legId: "L", nguoiCuaDon: ["p1", "p2", "p3"], suatMoCuaChang: [...suat, khac] });
  assert.deepEqual(kq, ["p2", "p3"]);
});

// ---- R-P29 (chủ lần 16): KHACH_DA_DOI — suất mang khoá người không còn trong đơn → giữ; MỘT định nghĩa (`suatKhachDaDoi`) cho cổng và lệnh cập nhật -------
test("R-P29 suatKhachDaDoi: suất khách MỞ của chặng mang khoá KHÔNG còn trong đơn; bỏ suất đã đóng, suất chưa tên, người đi kèm, chặng khác", () => {
  const ds = [
    suat({ id: "a", personKey: "p1" }),
    suat({ id: "b", personKey: "px" }), // khoá không còn trong đơn → đã đổi
    suat({ id: "c", personKey: "py", mo: false }), // đã đóng → không tính
    suat({ id: "d", personKey: null }), // chưa tên → không tính (THIEU_TEN / I19b lo)
    suat({ id: "e", personKey: "pz", legId: "leg-khac" }), // chặng khác
    suat({ id: "f", loai: "CREW", personKey: null, legId: null }),
  ];
  assert.deepEqual(suatKhachDaDoi({ legId: "leg-1", nguoiCuaDon: ["p1", "p2"], suat: ds }).map((s) => s.id), ["b"]);
  assert.deepEqual(suatKhachDaDoi({ legId: "leg-1", nguoiCuaDon: ["p1", "px"], suat: ds }), []);
  assert.equal(changXetTheoDon(chang()), true);
  assert.equal(changXetTheoDon(chang({ donDaHuy: true })), false);
  assert.equal(changXetTheoDon(chang({ changMo: false })), false);
  assert.equal(changXetTheoDon(chang({ donDaXacNhan: false })), false);
});
test("R-P29 kiemXuatBen: suất mang khoá không còn trong đơn → giữ KHACH_DA_DOI (văn phòng, câu có mã đơn + chữ nút, không khoá người); chuyến đang chạy / đơn huỷ → không (lý do riêng)", () => {
  // Đơn thay p2 bằng p5 sau khi xếp (số người giữ 4): suất s2 còn mang p2.
  const doi = kiemXuatBen(xb({ chang: [chang({ nguoiCuaDon: ["p1", "p3", "p4", "p5"] })] }));
  assert.equal(doi.dat, false);
  assert.deepEqual(ai(doi.lyDo), ["KHACH_DA_DOI:VAN_PHONG"]);
  assert.equal(doi.lyDo[0]!.loiNhan, `Khách trong xe không còn trong đơn — bấm ${NUT_CAP_NHAT_KHACH}: ĐH-1024`);
  assert.doesNotMatch(JSON.stringify(doi.lyDo), /p1|p2|p5/);
  // Đơn huỷ → DON_DA_HUY, KHÔNG thêm KHACH_DA_DOI (không bắt văn phòng cập nhật khách không còn đi).
  assert.ok(!ma(kiemXuatBen(xb({ chang: [chang({ nguoiCuaDon: ["p1", "p3", "p4", "p5"], donDaHuy: true })] })).lyDo).includes("KHACH_DA_DOI"));
  // Chuyến đang chạy → không giữ theo đơn (bản chốt đã trỏ dòng lúc xuất bến).
  assert.ok(!ma(kiemXuatBen(xb({ chuyen: chuyenVao({ trangThai: "RUNNING" }), chang: [chang({ nguoiCuaDon: ["p1", "p3", "p4", "p5"] })] })).lyDo).includes("KHACH_DA_DOI"));
  assert.equal(kiemXuatBen(xb()).dat, true, "khoá còn trong đơn → không giữ");
});

// ---- Cảnh báo sớm lúc xếp (lời chủ 1/10 "có cảnh báo sớm, chỉ cảnh báo, không chặn" — kế hoạch 2026-10-01-giao-dien-dua-don-hanh-khach.md) -------------
test("kiemXep cảnh báo: chặng chưa có nơi trả / thiếu tên → XẾP ĐƯỢC (ok, không vào chan, không vào canPhaLe) và có canhBao đúng mã + câu", () => {
  const khongNoiTra = xep([{ chang: chang({ coNoiTra: false, khoaNoiTra: null }), soSuatMoi: 4, personKeys: [], suatMoCuaChang: [] }]);
  assert.equal(khongNoiTra.ok, true);
  assert.deepEqual(khongNoiTra.chan, []);
  assert.deepEqual(khongNoiTra.canPhaLe, []);
  assert.deepEqual(khongNoiTra.canhBao.map((x) => `${x.ma}:${x.loiNhan}`), ["CHUA_CO_NOI_TRA:Chặng chưa có nơi trả: ĐH-1024"]);
  const thieuTen = xep([{ chang: chang({ nguoiCuaDon: ["p1"] }), soSuatMoi: 4, personKeys: [], suatMoCuaChang: [] }]);
  assert.equal(thieuTen.ok, true);
  assert.deepEqual(thieuTen.canhBao.map((x) => `${x.ma}:${x.loiNhan}`), ["THIEU_TEN:Chưa đủ tên khách: ĐH-1024 thiếu 3 tên"]);
  const ca2 = xep([{ chang: chang({ coNoiTra: false, khoaNoiTra: null, nguoiCuaDon: [] }), soSuatMoi: 2, personKeys: [], suatMoCuaChang: [] }]);
  assert.deepEqual(ma(ca2.canhBao), ["CHUA_CO_NOI_TRA", "THIEU_TEN"]);
  // Cùng nghĩa cổng xuất bến: chính sách KHÔNG bắt danh sách → không cảnh báo tên (xe vẫn chạy được); nơi trả vẫn cảnh báo.
  assert.deepEqual(ma(xep([{ chang: chang({ coNoiTra: false, khoaNoiTra: null, nguoiCuaDon: [] }), soSuatMoi: 2, personKeys: [], suatMoCuaChang: [] }], { chinhSach: { ...CS, requireManifest: false } }).canhBao), ["CHUA_CO_NOI_TRA"]);
  // Đủ nơi trả + đủ tên → không cảnh báo; cảnh báo không làm đổi chan của lệnh bị chặn.
  assert.deepEqual(xep([{ chang: chang(), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }]).canhBao, []);
  const biChan = xep([{ chang: chang({ gioDon: null, coNoiTra: false, khoaNoiTra: null }), soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }]);
  assert.deepEqual(ma(biChan.chan), ["CHUA_CO_GIO"]);
  assert.deepEqual(ma(biChan.canhBao), ["CHUA_CO_NOI_TRA"]);
});

test("MỘT luật hai nơi: cảnh báo lúc xếp TRÙNG ĐÚNG lý do CHUA_CO_NOI_TRA / THIEU_TEN mà cổng xuất bến sẽ giữ cho cùng chặng sau khi xếp", () => {
  const ca: [string, Partial<ChangVao>, { soSuat: number; personKeys: string[] }, ChinhSachVao][] = [
    ["chưa có nơi trả, đủ tên", { coNoiTra: false, khoaNoiTra: null }, { soSuat: 4, personKeys: [] }, CS],
    ["đủ nơi trả, đơn có 1 tên cho 4 người", { nguoiCuaDon: ["p1"] }, { soSuat: 4, personKeys: [] }, CS],
    ["đơn chưa có tên nào, gửi kèm 0 khoá", { nguoiCuaDon: [] }, { soSuat: 4, personKeys: [] }, CS],
    ["2 tên, gửi kèm 1 khoá, chưa nơi trả", { nguoiCuaDon: ["p1", "p2"], coNoiTra: false, khoaNoiTra: null }, { soSuat: 4, personKeys: ["p2"] }, CS],
    ["thiếu tên nhưng chính sách không bắt danh sách", { nguoiCuaDon: ["p1"] }, { soSuat: 4, personKeys: [] }, { ...CS, requireManifest: false }],
    ["đủ hết", {}, { soSuat: 4, personKeys: ["p1", "p2"] }, CS],
  ];
  const haiMa = (xs: LyDoGiu[]) => xs.filter((x) => x.ma === "CHUA_CO_NOI_TRA" || x.ma === "THIEU_TEN").map((x) => `${x.ma}:${x.loiNhan}`);
  for (const [ten, c, lenh, cs] of ca) {
    const ch = chang(c);
    const kq = xep([{ chang: ch, soSuatMoi: lenh.soSuat, personKeys: lenh.personKeys, suatMoCuaChang: [] }], { chinhSach: cs });
    assert.equal(kq.ok, true, ten);
    // Trạng thái SAU khi xếp — đúng như route: tên gắn lúc xếp = tenLucXep(khoá gửi kèm + khoá rảnh).
    const ranh = khoaNguoiRanh({ legId: ch.legId, nguoiCuaDon: ch.nguoiCuaDon, suatMoCuaChang: [] });
    const sau = tenLucXep({ soSuat: lenh.soSuat, personKeys: lenh.personKeys, ranh }).map((p, i) => suat({ id: `m${i}`, personKey: p, alightStopId: ch.coNoiTra ? "d-9" : null }));
    const xb2 = kiemXuatBen(xb({ chang: [ch], suat: sau, suatMoCuaChang: sau, chinhSach: cs }));
    assert.deepEqual(haiMa(kq.canhBao), haiMa(xb2.lyDo), ten);
  }
});

test("lyDoNoiTra / lyDoThieuTen — hai hàm dùng chung của cổng xuất bến và cảnh báo lúc xếp", () => {
  assert.equal(lyDoNoiTra(chang()), null);
  assert.deepEqual(lyDoNoiTra(chang({ coNoiTra: false })), { ma: "CHUA_CO_NOI_TRA", loiNhan: "Chặng chưa có nơi trả: ĐH-1024", aiXuLy: "VAN_PHONG" });
  assert.equal(lyDoThieuTen(chang(), true), null);
  assert.equal(lyDoThieuTen(chang({ nguoiCuaDon: [] }), false), null, "chính sách không bắt danh sách");
  assert.equal(lyDoThieuTen(chang({ nguoiCuaDon: ["p1", "p2"] }), true)?.loiNhan, "Chưa đủ tên khách: ĐH-1024 thiếu 2 tên");
  assert.equal(lyDoThieuTen(chang(), true, { chuaTen: 3, ranh: 1 })?.loiNhan, "Chưa đủ tên khách: ĐH-1024 thiếu 2 tên", "suất chưa tên trên chuyến nhiều hơn khoá rảnh");
});

test("ADR-0057 C5: kiemXuatBen — chuyến xe thuê không nguồn giá → giữ THIEU_GIA (Quản trị); có nguồn giá hoặc không thuê → không; KHÔNG trong MA_LUAT_PHA_LE", () => {
  const vao = xb();
  assert.deepEqual(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: true, coNguonGia: false } }).lyDo.map((l) => l.ma), ["THIEU_GIA"]);
  assert.equal(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: true, coNguonGia: true } }).dat, true);
  assert.equal(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: false, coNguonGia: false } }).dat, true);
  assert.equal(MA_GIU.THIEU_GIA.aiXuLy, "QUAN_TRI");
  assert.match(MA_GIU.THIEU_GIA.loiNhan, /Kế toán/);
  assert.ok(!(MA_LUAT_PHA_LE as readonly string[]).includes("THIEU_GIA"));
});

// ---- Khung bận (ADR-0055 VK2-A A2 (i); ADR-0053 D9 B9.3 — kế hoạch Đợt 3 Task 2) ------------------------------------------------------------------------
test("VK2-A A2 (i) lớp máy chủ: tạo / dời giờ / đổi xe vào khung bận còn hiệu lực của xe → chặn TRUNG_GIO_XE kèm chi tiết 'lịch xe bận'; khung xe khác → không", () => {
  const kb: KhungBanVao = { id: "kb1", doiTuong: "VEHICLE", xeId: "xe-a", taiXePartyId: null, batDauMs: ms("2026-09-30", "05:00"), ketThucMs: ms("2026-09-30", "17:00"), lyDoNhan: "Bảo dưỡng" };
  const kq = kiemTaoSuaChuyen(tao({}, [], { khungBan: [kb] }));
  assert.equal(kq.ok, false);
  assert.ok(kq.chan.some((l) => l.ma === "TRUNG_GIO_XE" && /lịch xe bận: Bảo dưỡng 05:00 30\/09 → 17:00 30\/09/.test(l.loiNhan)), JSON.stringify(kq.chan));
  const khac = kiemTaoSuaChuyen(tao({}, [], { khungBan: [{ ...kb, xeId: "xe-khac" }] }));
  assert.equal(khac.chan.some((l) => l.ma === "TRUNG_GIO_XE"), false);
  // Nửa mở: khung kết thúc đúng lúc chuyến bắt đầu → không chặn.
  const mep = kiemTaoSuaChuyen(tao({}, [], { khungBan: [{ ...kb, batDauMs: ms("2026-09-30", "03:00"), ketThucMs: BAT_DAU }] }));
  assert.equal(mep.chan.some((l) => l.ma === "TRUNG_GIO_XE"), false);
  // Đổi xe (SUA) sang xe đang có khung → chặn.
  const doiXe = kiemTaoSuaChuyen(tao({ id: "cx-1" }, [], { lenh: "SUA", cu: { batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, xeId: "xe-b", taiXePartyId: "tx-an", trangThai: "PLANNED" }, khungBan: [kb] }));
  assert.ok(doiXe.chan.some((l) => l.ma === "TRUNG_GIO_XE" && /lịch xe bận/.test(l.loiNhan)));
});

// Kế hoạch A4 G-A4-9 (lời chủ 6.2 — SIẾT có tên): câu chặn khung TÀI XẾ không còn kèm lý do (trước: "lịch tài xế bận: <lý do> <giờ>"); kể cả khi đầu vào
// lỡ mang nhãn lý do, câu không in nhãn đó.
test("D9 B9.3 (MỘT hàm cho xe và tài xế): khung DRIVER của tài xế được gán → chặn TRUNG_GIO_TAI_XE, câu '<Tên> bận từ … đến …. Chọn tài xế khác hoặc đổi giờ chuyến.' KHÔNG lý do", () => {
  const kb: KhungBanVao = { id: "kb2", doiTuong: "DRIVER", xeId: null, taiXePartyId: "tx-an", batDauMs: ms("2026-09-30", "05:00"), ketThucMs: ms("2026-09-30", "12:00"), lyDoNhan: "Việc riêng" };
  const kq = kiemTaoSuaChuyen(tao({}, [], { khungBan: [kb] }));
  const l = kq.chan.find((x) => x.ma === "TRUNG_GIO_TAI_XE");
  assert.ok(l, JSON.stringify(kq.chan));
  assert.match(l.loiNhan, / bận từ 05:00 30\/09 đến 12:00 30\/09\. Chọn tài xế khác hoặc đổi giờ chuyến\.$/);
  assert.doesNotMatch(l.loiNhan, /Việc riêng/);
});

test("VK2-B B3: kiemTaoSuaChuyen trả nhacGioLai cho CHÍNH chuyến đang tạo/gán (không đổi ok); chuyến mới 4 giờ 30 + chuyến khác 4 giờ → CHUYEN_DAI_CAN_NGHI + GIO_LAI_VUOT", () => {
  const khac = [khung({ id: "k1", ma: "CX-1", xeId: "xe-khac", taiXePartyId: "tx-an", batDauMs: ms("2026-09-30", "00:30"), ketThucMs: ms("2026-09-30", "04:30") })];
  const kq = kiemTaoSuaChuyen(tao({ batDauMs: ms("2026-09-30", "10:00"), ketThucMs: ms("2026-09-30", "14:30") }, khac));
  assert.equal(kq.ok, true, JSON.stringify(kq));
  assert.deepEqual(kq.nhacGioLai.map((x) => x.loai).sort(), ["CHUYEN_DAI_CAN_NGHI", "GIO_LAI_VUOT"]);
  assert.equal(kq.nhacGioLai.every((x) => x.tripId === "__moi__"), true, "chỉ gắn chuyến đang tạo");
  // Không tài xế → không nhắc giờ lái.
  assert.deepEqual(kiemTaoSuaChuyen(tao({ taiXe: null, batDauMs: ms("2026-09-30", "10:00"), ketThucMs: ms("2026-09-30", "14:30") }, khac)).nhacGioLai, []);
});

test("VK2-B B1 + B3 (vòng vá 1): ngưỡng giờ lái của lệnh tạo / sửa lấy TỪ CHÍNH SÁCH — dutyDayMaxMinutes = 300, tài xế tổng 5 giờ 30 → GIO_LAI_VUOT, không chặn", () => {
  const cs5: ChinhSachVao = { ...CS, dutyDayMaxMinutes: 300 };
  // Chuyến khác của tài xế 00:30–04:30 (4 giờ) + chuyến đang xét 10:00–11:30 (1 giờ 30) = 5 giờ 30 > 5 giờ, < 8 giờ mặc định.
  const khac = [khung({ id: "k1", ma: "CX-1", xeId: "xe-khac", taiXePartyId: "tx-an", batDauMs: ms("2026-09-30", "00:30"), ketThucMs: ms("2026-09-30", "04:30") })];
  const than = { batDauMs: ms("2026-09-30", "10:00"), ketThucMs: ms("2026-09-30", "11:30") };
  const tao5 = kiemTaoSuaChuyen(tao(than, khac, { chinhSach: cs5 }));
  assert.equal(tao5.ok, true, JSON.stringify(tao5));
  assert.deepEqual(tao5.nhacGioLai.map((x) => [x.loai, x.tongPhut]), [["GIO_LAI_VUOT", 330]]);
  const sua5 = kiemTaoSuaChuyen(tao({ id: "cx-1", ...than }, khac, {
    lenh: "SUA", chinhSach: cs5, cu: { batDauMs: than.batDauMs, batDauSomNhatMs: than.batDauMs, xeId: "xe-a", taiXePartyId: "tx-an", trangThai: "PLANNED" },
  }));
  assert.equal(sua5.ok, true, JSON.stringify(sua5));
  assert.deepEqual(sua5.nhacGioLai.map((x) => [x.loai, x.tripId]), [["GIO_LAI_VUOT", "cx-1"]]);
  // Đối chứng: chính sách 8 giờ → cùng dữ liệu không nhắc.
  assert.deepEqual(kiemTaoSuaChuyen(tao(than, khac)).nhacGioLai, []);
});

test("Đợt 5 D5.1 kiemXep THEM_KHI_CHAY: chuyến RUNNING không bị chặn; xe đang chạy LUÔN trong mốc (kể cả giờ dự kiến còn xa) — đặt gấp qua, chặng thường cần phá lệ; PLANNED / ENDED → chặn", () => {
  const dangChay = { ...CX, trangThai: "RUNNING" as const };
  const sauXuatBen = BAT_DAU + 30 * PHUT;
  const mot = (c = chang()) => [{ chang: c, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }];
  assert.deepEqual(ai(xep(mot(), { chuyen: dangChay, bayGioMs: sauXuatBen, lenh: "THEM_KHI_CHAY" }).canPhaLe), ["MOC_TOI_THIEU:VAN_PHONG"]);
  assert.equal(xep(mot(chang({ datGap: true })), { chuyen: dangChay, bayGioMs: sauXuatBen, lenh: "THEM_KHI_CHAY" }).ok, true);
  // Xuất bến sớm: giờ dự kiến còn 10 tiếng nữa — vẫn tính là trong mốc (ADR-0052 D5.1).
  const somXa = BAT_DAU - 10 * 3600e3;
  assert.deepEqual(ma(xep(mot(), { chuyen: dangChay, bayGioMs: somXa, lenh: "THEM_KHI_CHAY" }).canPhaLe), ["MOC_TOI_THIEU"]);
  for (const trangThai of ["PLANNED", "ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const) {
    assert.deepEqual(ma(xep(mot(chang({ datGap: true })), { chuyen: { ...CX, trangThai }, bayGioMs: sauXuatBen, lenh: "THEM_KHI_CHAY" }).chan), ["CHUYEN_KHONG_CON_LEN_KE_HOACH"], trangThai);
  }
  assert.deepEqual(ma(xep([{ chang: chang(), soSuatMoi: 5, personKeys: [], suatMoCuaChang: [] }], { chuyen: dangChay, bayGioMs: sauXuatBen, lenh: "THEM_KHI_CHAY" }).chan), ["VUOT_SO_NGUOI_CHANG"]);
});

// ---- Đợt 7 (ADR-0056 VK3-A): cam kết xe riêng / số chỗ tối thiểu — MỘT luật (`kiemCamKet`) ở xếp, sửa chuyến (đổi xe), cổng xuất bến ----------------
/** Chặng một khách của đơn `don` (khoá người `p-<legId>`) — khớp khung điểm d-1 / d-9. */
const changCK = (legId: string, don: string, v: Partial<ChangVao> = {}): ChangVao =>
  chang({ legId, orderId: `don-${don}`, orderCode: `ĐH-${don.toUpperCase()}`, soNguoi: 1, nguoiCuaDon: [`p-${legId}`], ...v });
/** Suất khách mở (có tên) cho mỗi chặng — trạng thái trên chuyến cx-07. */
const suatCK = (ds: readonly ChangVao[]): SuatVao[] => ds.map((c) => suat({ id: `s-${c.legId}`, legId: c.legId, personKey: `p-${c.legId}` }));
const xbCK = (ds: ChangVao[], v: Partial<ChuyenVao> = {}) => {
  const s = suatCK(ds);
  return kiemXuatBen(xb({ chuyen: chuyenVao(v), chang: ds, suat: s, suatMoCuaChang: s }));
};
const coCamKet = (xs: LyDoGiu[]) => xs.some((l) => l.ma === "CAM_KET");

test("Đợt 7 kiemXep — tiêu chí 1 (ADR-0128 Q2): chặng xe riêng của đơn A trên chuyến, xếp thêm đơn B → CHẶN CỨNG (CAM_KET trong chan, không canPhaLe); khoá lưu khớp cũng không che được", () => {
  const a = changCK("leg-a", "a", { xeRieng: true });
  const b = changCK("leg-b", "b");
  const r = xep([{ chang: b, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { changTrenChuyen: [a] });
  assert.deepEqual(r.canPhaLe, [], "không còn đường phá lệ cho xe riêng");
  assert.deepEqual(ma(r.chan), ["CAM_KET", "CAM_KET"]);
  assert.equal(r.ok, false);
  assert.equal(r.camKet.coXeRieng, true);
  const voiKhoa = xep([{ chang: b, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { changTrenChuyen: [a], camKetPhaLeKhoa: r.camKet.khoa });
  assert.equal(voiKhoa.camKet.daPhaLe, false, "khoá khớp không bao giờ che xe riêng");
  assert.equal(voiKhoa.ok, false);
  assert.deepEqual(ma(voiKhoa.chan), ["CAM_KET", "CAM_KET"]);
  // Số chỗ tối thiểu (R-CX) vẫn phá lệ được: chặng cần ≥ 20 chỗ xếp vào xe 15 chỗ → canPhaLe; khoá khớp → hết CAM_KET.
  const can20 = changCK("leg-c", "c", { choToiThieu: 20 });
  const cx = xep([{ chang: can20, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }]);
  assert.deepEqual(ai(cx.canPhaLe), ["CAM_KET:QUAN_TRI"]);
  assert.deepEqual(cx.chan, []);
  const daPhaLe = xep([{ chang: can20, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { camKetPhaLeKhoa: cx.camKet.khoa });
  assert.equal(daPhaLe.camKet.daPhaLe, true);
  assert.equal(coCamKet(daPhaLe.canPhaLe), false);
  assert.equal(daPhaLe.ok, true);
  // Xếp thêm suất của CHÍNH đơn A (chặng đã có trên chuyến) → không vi phạm, không đếm chặng hai lần.
  const cungDon = xep([{ chang: a, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }], { changTrenChuyen: [a] });
  assert.equal(cungDon.ok, true, JSON.stringify(cungDon.canPhaLe));
});

test("Đợt 7 kiemXep — tiêu chí 2: chặng cần ≥ 15 chỗ xếp vào xe 7 chỗ → CAM_KET; lệnh DOI_DEN cũng xét; THEM_KHI_CHAY cũng xét", () => {
  const can15 = changCK("leg-a", "a", { choToiThieu: 15 });
  const vao = [{ chang: can15, soSuatMoi: 1, personKeys: [], suatMoCuaChang: [] }];
  const r = xep(vao, { chuyen: { ...CX, soCho: 7 }, xeId: "xe-7" });
  assert.deepEqual(ma(r.canPhaLe), ["CAM_KET"]);
  assert.match(r.canPhaLe[0]!.loiNhan, /ĐH-A cần ≥ 15 chỗ, xe 7 chỗ/);
  assert.equal(xep(vao, { chuyen: { ...CX, soCho: 15 } }).ok, true);
  assert.deepEqual(ma(xep(vao, { chuyen: { ...CX, soCho: 7 }, xeId: "xe-7", lenh: "DOI_DEN" }).canPhaLe), ["CAM_KET"]);
  const chay = xep(vao, { chuyen: { ...CX, soCho: 7, trangThai: "RUNNING" }, xeId: "xe-7", lenh: "THEM_KHI_CHAY", bayGioMs: BAT_DAU + 10 * PHUT });
  assert.ok(coCamKet(chay.canPhaLe), JSON.stringify(chay.canPhaLe));
});

test("Đợt 7 kiemTaoSuaChuyen: đổi sang xe 7 chỗ khi chặng trên chuyến cần ≥ 15 → CAM_KET; không đổi xe → camKet === null; đã phá lệ xe riêng rồi đổi xe → cần phá lệ lại", () => {
  const cu = { batDauMs: BAT_DAU, batDauSomNhatMs: BAT_DAU, xeId: "xe-a", taiXePartyId: "tx-an", trangThai: "PLANNED" as const };
  const can15 = changCK("leg-a", "a", { choToiThieu: 15 });
  const doi = kiemTaoSuaChuyen(tao({ xe: xe({ id: "xe-7", soCho: 7 }) }, [], { lenh: "SUA", cu, camKet: { changTrenChuyen: [can15], khoaDaPhaLe: null } }));
  assert.deepEqual(ai(doi.canPhaLe), ["CAM_KET:QUAN_TRI"]);
  assert.notEqual(doi.camKet, null);
  const khongDoi = kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu, camKet: { changTrenChuyen: [can15], khoaDaPhaLe: null } }));
  assert.equal(khongDoi.camKet, null);
  assert.equal(khongDoi.ok, true);
  assert.equal(kiemTaoSuaChuyen(tao({ xe: xe({ id: "xe-7", soCho: 7 }) })).camKet, null, "TẠO chuyến: không xét (chưa có khách)");
  // Số chỗ tối thiểu (R-CX) đã phá lệ trên xe-a; đổi sang xe-b (cùng vi phạm) → khoá có id xe mới ⇒ khác ⇒ cần phá lệ lại (một luật với cổng xuất bến).
  const ab = [changCK("leg-a", "a", { choToiThieu: 20 })];
  const khoaCu = xbCK(ab).camKet.khoa;
  assert.notEqual(khoaCu, null);
  const sangXeB = kiemTaoSuaChuyen(tao({ xe: xe({ id: "xe-b" }) }, [], { lenh: "SUA", cu, camKet: { changTrenChuyen: ab, khoaDaPhaLe: khoaCu } }));
  assert.ok(coCamKet(sangXeB.canPhaLe));
  assert.equal(kiemTaoSuaChuyen(tao({}, [], { lenh: "SUA", cu: { ...cu, xeId: "xe-a" }, camKet: { changTrenChuyen: ab, khoaDaPhaLe: khoaCu } })).camKet, null);
  // ADR-0128 Q2: đổi sang xe khi chuyến có đơn khác ghép vào xe riêng → chặn cứng, khoá lưu không cứu.
  const xr = [changCK("leg-a", "a", { xeRieng: true }), changCK("leg-b", "b")];
  const khoaXr = xbCK(xr).camKet.khoa;
  const doiXr = kiemTaoSuaChuyen(tao({ xe: xe({ id: "xe-b" }) }, [], { lenh: "SUA", cu, camKet: { changTrenChuyen: xr, khoaDaPhaLe: khoaXr } }));
  assert.ok(coCamKet(doiXr.chan));
  assert.equal(coCamKet(doiXr.canPhaLe), false);
});

test("Đợt 7 kiemXuatBen — tiêu chí 3 / 3b / 3c: giữ CAM_KET bằng lời khi vi phạm chưa phá lệ hoặc khoá đã lưu không khớp; khoá khớp → đạt", () => {
  const a = changCK("leg-a", "a", { xeRieng: true });
  const b = changCK("leg-b", "b");
  // 3: bật xe riêng sau khi đã ghép A + B.
  const giu = xbCK([a, b]);
  assert.equal(giu.dat, false);
  assert.deepEqual(ai(giu.lyDo), ["CAM_KET:QUAN_TRI", "CAM_KET:QUAN_TRI"]);
  assert.ok(giu.lyDo.some((l) => /ĐH-A xe riêng/.test(l.loiNhan)));
  // ADR-0128 Q2: khoá lưu khớp cũng KHÔNG cứu xe riêng — vẫn giữ (chỉ gỡ khi đơn khác rời chuyến hoặc cờ xe riêng tắt).
  const khoa = giu.camKet.khoa;
  const van = xbCK([a, b], { camKetPhaLeKhoa: khoa });
  assert.equal(van.dat, false, JSON.stringify(van.lyDo));
  assert.equal(van.camKet.daPhaLe, false);
  assert.ok(coCamKet(van.lyDo));
  assert.ok(coCamKet(xbCK([a, b, changCK("leg-c", "c")], { camKetPhaLeKhoa: khoa }).lyDo));
  // 3c: đã phá lệ số chỗ trên xe 7 chỗ; đổi sang xe nhỏ hơn (id khác) / tăng số chỗ tối thiểu → giữ.
  const can15 = changCK("leg-a", "a", { choToiThieu: 15 });
  const xe7 = xe({ id: "xe-7", soCho: 7 });
  const khoaCX = xbCK([can15], { xe: xe7 }).camKet.khoa;
  assert.equal(xbCK([can15], { xe: xe7, camKetPhaLeKhoa: khoaCX }).dat, true);
  assert.ok(coCamKet(xbCK([can15], { xe: xe({ id: "xe-6", soCho: 6 }), camKetPhaLeKhoa: khoaCX }).lyDo));
  assert.ok(coCamKet(xbCK([changCK("leg-a", "a", { choToiThieu: 16 })], { xe: xe7, camKetPhaLeKhoa: khoaCX }).lyDo));
  // Chặng có suất đã ĐÓNG trên chuyến không tính (chỉ suất khách mở).
  const s = suatCK([a, b]).map((x) => (x.legId === "leg-b" ? { ...x, mo: false } : x));
  assert.equal(coCamKet(kiemXuatBen(xb({ chang: [a, b], suat: s, suatMoCuaChang: s.filter((x) => x.mo) })).lyDo), false);
});

test("Đợt 7 MỘT luật hai nơi: cùng trạng thái sau lệnh, khoá cam kết lúc xếp === khoá cổng xuất bến (xe riêng; số chỗ)", () => {
  const a = changCK("leg-a", "a", { xeRieng: true });
  const b = changCK("leg-b", "b");
  const luocXep = xep([{ chang: b, soSuatMoi: 1, personKeys: ["p-leg-b"], suatMoCuaChang: [] }], { changTrenChuyen: [a] });
  const luocXuatBen = xbCK([a, b]);
  assert.notEqual(luocXep.camKet.khoa, null);
  assert.equal(luocXep.camKet.khoa, luocXuatBen.camKet.khoa);
  assert.deepEqual(luocXep.camKet.lyDo, luocXuatBen.camKet.lyDo);
  const can15 = changCK("leg-a", "a", { choToiThieu: 15 });
  const xep7 = xep([{ chang: can15, soSuatMoi: 1, personKeys: ["p-leg-a"], suatMoCuaChang: [] }], { chuyen: { ...CX, soCho: 7 }, xeId: "xe-7" });
  assert.equal(xep7.camKet.khoa, xbCK([can15], { xe: xe({ id: "xe-7", soCho: 7 }) }).camKet.khoa);
});

// ---- ADR-0096 Đ1 (LC-19), Đ2 (LC-20) — gói A1 (2026-10-08) ---------------------------------------------------------------------------------------------------
test("ADR-0096 Đ1.2 kiemXuatBen LC-19: suất CHỜ LÊN có điểm trả đứng trước / BẰNG số điểm đón → giữ TRA_TRUOC_DON (văn phòng), câu có mã đơn + số thứ tự điểm, không tên", () => {
  const dao = [diemVao("d-1", "PICKUP", "L:noi-don-1", { seq: 2 }), diemVao("d-9", "DROPOFF", "L:noi-tra-9", { seq: 1 })];
  const r = kiemXuatBen(xb({ diem: dao }));
  assert.equal(r.dat, false);
  assert.deepEqual(ai(r.lyDo), ["TRA_TRUOC_DON:VAN_PHONG"], "một lý do mỗi đơn, không lặp theo suất");
  assert.match(r.lyDo[0]!.loiNhan, /ĐH-1024/);
  assert.match(r.lyDo[0]!.loiNhan, /điểm trả số 1/);
  assert.match(r.lyDo[0]!.loiNhan, /điểm đón số 2/);
  assert.doesNotMatch(r.lyDo[0]!.loiNhan, /L:noi|p1|Tài xế An/, "không lộ khoá nơi / khoá người / tên");
  // Bằng số → vẫn giữ (nghiêm ngặt).
  assert.deepEqual(ma(kiemXuatBen(xb({ diem: [diemVao("d-1", "PICKUP", "L:noi-don-1", { seq: 3 }), diemVao("d-9", "DROPOFF", "L:noi-tra-9", { seq: 3 })] })).lyDo), ["TRA_TRUOC_DON"]);
  // Chỉ xét suất MỞ đang CHỜ LÊN: đã lên / vắng / huỷ tại điểm / đã đóng → không giữ vì thứ tự.
  for (const doi of [{ trangThai: "BOARDED" as const }, { trangThai: "NO_SHOW" as const }, { trangThai: "CANCELLED_AT_STOP" as const }, { mo: false }]) {
    const s = BON_SUAT.map((x) => ({ ...x, ...doi }));
    assert.ok(!ma(kiemXuatBen(xb({ diem: dao, suat: s })).lyDo).includes("TRA_TRUOC_DON"), JSON.stringify(doi));
  }
  assert.equal(MA_LUAT_PHA_LE.includes("TRA_TRUOC_DON" as never), false, "không phá lệ");
});

test("ADR-0096 Đ2 kiemXuatBen LC-20: xuất bến 13 giờ trước giờ dự kiến → giữ NGOAI_CUA_SO_XUAT_BEN; 11 giờ / đúng 12 giờ → không; cửa sổ 24 giờ → 13 giờ không giữ", () => {
  const truoc = (gio: number) => BAT_DAU - gio * 3600e3;
  const r = kiemXuatBen(xb({ bayGioMs: truoc(13), xuatBenMs: truoc(13) }));
  assert.deepEqual(ai(r.lyDo), ["NGOAI_CUA_SO_XUAT_BEN:VAN_PHONG"]);
  assert.equal(r.lyDo[0]!.loiNhan, "Chưa tới giờ được xuất bến: chuyến khởi hành lúc 05:50 ngày 30/09, được xuất bến từ 17:50 ngày 29/09. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến.");
  assert.equal(kiemXuatBen(xb({ bayGioMs: truoc(11), xuatBenMs: truoc(11) })).dat, true);
  assert.equal(kiemXuatBen(xb({ bayGioMs: truoc(12), xuatBenMs: truoc(12) })).dat, true, "đúng mốc mở cửa sổ (≥) → được");
  assert.equal(kiemXuatBen(xb({ bayGioMs: truoc(13), xuatBenMs: truoc(13), chinhSach: { ...CS, departureWindowMinutes: 1440 } })).dat, true);
  assert.equal(MA_LUAT_PHA_LE.includes("NGOAI_CUA_SO_XUAT_BEN" as never), false, "không phá lệ");
});

test("ADR-0096 Đ2.5 kiemXuatBen LC-20: màn đọc (dự phóng giờ xuất bến) xét cửa sổ theo GIỜ THẬT `cuaSoXetMs`; năm khác năm hiện tại thì câu có năm; chính sách thiếu cửa sổ → giữ CHINH_SACH_RONG (không đoán)", () => {
  const bayGio = BAT_DAU - 3 * 24 * 3600e3;
  // Dự phóng: xuatBenMs = giờ bắt đầu (luôn trong cửa sổ) nhưng giờ thật 3 ngày trước → giữ.
  assert.deepEqual(ma(kiemXuatBen(xb({ bayGioMs: bayGio, xuatBenMs: BAT_DAU, cuaSoXetMs: bayGio })).lyDo), ["NGOAI_CUA_SO_XUAT_BEN"]);
  assert.equal(kiemXuatBen(xb({ bayGioMs: bayGio, xuatBenMs: BAT_DAU })).dat, true, "không truyền cuaSoXetMs → xét theo xuatBenMs");
  const namSau = ms("2027-01-01", "06:00");
  const r = kiemXuatBen(xb({ chuyen: chuyenVao({ batDauMs: namSau, ketThucMs: namSau + 2 * 3600e3, ngayChay: "2027-01-01" }), bayGioMs: ms("2026-12-30", "06:00"), xuatBenMs: ms("2026-12-30", "06:00") }));
  assert.match(r.lyDo.find((x) => x.ma === "NGOAI_CUA_SO_XUAT_BEN")!.loiNhan, /06:00 ngày 01\/01\/2027, được xuất bến từ 18:00 ngày 31\/12\./);
  const thieu = { ...CS } as Partial<ChinhSachVao>;
  delete thieu.departureWindowMinutes;
  assert.deepEqual(ai(kiemXuatBen(xb({ chinhSach: thieu as ChinhSachVao })).lyDo), ["CHINH_SACH_RONG:TOAN_QUYEN"]);
});
