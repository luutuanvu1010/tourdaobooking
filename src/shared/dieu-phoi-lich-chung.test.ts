// Lịch chung ngày D — HÌNH CHIẾU dựng lúc đọc, không bảng riêng (ADR-0049 D1; [TK] §1.3; MQ-04, MQ-05 phần lượt 1; kế hoạch Task A4). Một hàm thuần gom:
// chặng + trạng thái, chuyến + tải + lý do giữ (chính `kiemXuatBen`, dự phóng "xuất bến đúng giờ"), cảnh báo, đơn nháp dưới mốc chờ Quản trị duyệt đặt gấp.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChangVao, ChinhSachVao, ChuyenVao, HangBangVao, KhungChuyen, SuatVao, TaiXeVao, XeVao } from "./dieu-phoi-kieu.ts";
import { dungLichChung, type LichChungVao } from "./dieu-phoi-lich-chung.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const CS: ChinhSachVao = { id: "cs-1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false };
const HB: HangBangVao[] = [{ classCode: "D1", maxPassengers: 16 }, { classCode: "D2", maxPassengers: 29 }];
const xe = (v: Partial<XeVao> = {}): XeVao => ({ id: "xe-a", bienSo: "79B-123.45", soCho: 15, trangThai: "active", chuXePartyId: "cty", chuLaCongTy: true, giayTo: [], ...v });
const tx = (v: Partial<TaiXeVao> = {}): TaiXeVao => ({ partyId: "tx-an", displayName: "Tài xế An", loai: "CONG_TY", carrierPartyIds: [], giayTo: [{ rowId: "g-an", typeCode: "GPLX", classCode: "D1", expiryDate: null }], ...v });
const chang = (legId: string, v: Partial<ChangVao> = {}): ChangVao => ({
  legId, orderId: `don-${legId}`, orderCode: `ĐH-${legId}`, chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true,
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: 2, nguoiCuaDon: [`${legId}-p1`, `${legId}-p2`], datGap: false, ...v,
});
const suat = (id: string, legId: string, tripId: string, v: Partial<SuatVao> = {}): SuatVao => ({
  id, tripId, loai: "PASSENGER", legId, personKey: null, crewPartyId: null, boardStopId: "d1", alightStopId: "d9", trangThai: "WAITING", mo: true, ...v,
});
const chuyen = (id: string, v: Partial<ChuyenVao> = {}): ChuyenVao => ({
  id, ma: `CX-${id}`, ngayChay: "2026-09-30", batDauMs: ms("2026-09-30", "06:00"), ketThucMs: ms("2026-09-30", "08:30"), ketThucThatMs: null, trangThai: "PLANNED",
  xe: xe(), taiXe: tx(), nghiChup: 30, nghiPhaLe: false, ...v,
});
const BAY_GIO = ms("2026-09-29", "20:00");
function vao(v: Partial<LichChungVao> = {}): LichChungVao {
  return { chang: [], nhap: [], chuyen: [], suat: [], chuyenKhac: [], chinhSach: CS, hangBang: HB, dieuKien: [], bayGioMs: BAY_GIO, ...v };
}

test("dungLichChung: chuyến đủ điều kiện (tải, không giữ); chặng xếp đủ 'Đã xếp'; chặng chưa xếp 'Chưa xếp'", () => {
  const r = dungLichChung(vao({
    chang: [chang("a"), chang("b")],
    chuyen: [chuyen("07")],
    suat: [suat("s1", "a", "07", { personKey: "a-p1" }), suat("s2", "a", "07", { personKey: "a-p2" })],
  }));
  assert.deepEqual(r.chuyen, [{ id: "07", ma: "CX-07", trangThai: "PLANNED", tai: 2, soCho: 15, lyDoGiu: [] }]);
  assert.deepEqual(r.chang.map((c) => [c.chang.legId, c.trangThai.trangThai]), [["a", "DA_XEP"], ["b", "CHUA_XEP"]]);
  assert.deepEqual(r.canhBao, []);
  assert.equal(r.soNhap, 0);
});

test("MQ-05 giữ: thiếu tên, chưa có tài xế — lý do + ai xử lý đi kèm chuyến; và có cảnh báo 'chuyến bị giữ'", () => {
  const r = dungLichChung(vao({
    chang: [chang("a", { nguoiCuaDon: ["a-p1"] })],
    chuyen: [chuyen("07"), chuyen("04", { taiXe: null, xe: xe({ id: "xe-b", bienSo: "79B-678.90", soCho: 29 }) })],
    suat: [suat("s1", "a", "07"), suat("s2", "a", "07")],
  }));
  assert.deepEqual(r.chuyen.map((c) => [c.id, c.lyDoGiu.map((l) => `${l.ma}:${l.aiXuLy}`)]), [["07", ["THIEU_TEN:VAN_PHONG"]], ["04", ["CHUA_CO_TAI_XE:VAN_PHONG"]]]);
  assert.deepEqual(r.canhBao.filter((c) => c.loai === "CHUYEN_GIU").map((c) => c.tripId), ["07", "04"]);
});

test("MQ-04 cảnh báo lượt 1: chặng quá mốc / sát mốc chưa xếp, xếp một phần (thiếu suất), thừa suất, đơn huỷ còn khách (giữ), giờ hẹn nằm ngoài giờ chuyến", () => {
  const bayGio = ms("2026-09-30", "02:00"); // chặng 06:30 → còn 4 giờ 30 (quá mốc 6 giờ); chặng 09:00 → còn 7 giờ (sát mốc: < 6 + 2 giờ)
  const r = dungLichChung(vao({
    bayGioMs: bayGio,
    chang: [
      chang("qua"),
      chang("sat", { gioDon: "09:00" }),
      chang("motphan", { soNguoi: 3, nguoiCuaDon: ["m1", "m2", "m3"], gioDon: "12:00" }),
      chang("thua", { soNguoi: 1, nguoiCuaDon: ["t1"], gioDon: "12:00" }),
      chang("huy", { donDaHuy: true, gioDon: "12:00" }),
      chang("lech", { gioDon: "12:00" }),
    ],
    chuyen: [chuyen("07", { batDauMs: ms("2026-09-30", "11:30"), ketThucMs: ms("2026-09-30", "13:30") }), chuyen("09", { xe: xe({ id: "xe-b" }), taiXe: tx({ partyId: "tx-b" }), batDauMs: ms("2026-09-30", "14:00"), ketThucMs: ms("2026-09-30", "15:00") })],
    suat: [
      suat("m1", "motphan", "07"),
      suat("t1", "thua", "07"), suat("t2", "thua", "07"),
      suat("h1", "huy", "07"),
      suat("l1", "lech", "09"), suat("l2", "lech", "09"),
    ],
  }));
  const cb = r.canhBao.filter((c) => c.loai !== "CHUYEN_GIU").map((c) => `${c.loai}:${c.orderCode}`);
  assert.deepEqual(cb, ["CHANG_QUA_MOC:ĐH-qua", "CHANG_SAT_MOC:ĐH-sat", "THIEU_SUAT:ĐH-motphan", "THUA_SUAT:ĐH-thua", "CHANG_GIU:ĐH-huy", "GIO_HEN_NGOAI_CHUYEN:ĐH-lech"]);
  assert.equal(r.chang.find((c) => c.chang.legId === "huy")!.trangThai.trangThai, "GIU");
});

test("I11 đơn nháp: chỉ đếm; nháp có chặng dưới mốc CHƯA đặt gấp → danh sách chờ Quản trị duyệt đặt gấp (route quyết ai được thấy); chính sách rỗng → cảnh báo, không đoán", () => {
  const bayGio = ms("2026-09-30", "02:00");
  const r = dungLichChung(vao({
    bayGioMs: bayGio,
    nhap: [
      { legId: "n1", orderId: "dn1", orderCode: "ĐH-N1", ngayDon: "2026-09-30", gioDon: "06:30", datGap: false },
      { legId: "n2", orderId: "dn2", orderCode: "ĐH-N2", ngayDon: "2026-09-30", gioDon: "06:30", datGap: true },
      { legId: "n3", orderId: "dn3", orderCode: "ĐH-N3", ngayDon: "2026-09-30", gioDon: "12:00", datGap: false },
      { legId: "n4", orderId: "dn4", orderCode: "ĐH-N4", ngayDon: "2026-09-30", gioDon: null, datGap: false },
    ],
  }));
  assert.equal(r.soNhap, 4);
  assert.deepEqual(r.nhapChoDatGap.map((n) => n.orderCode), ["ĐH-N1"]);
  assert.deepEqual(r.canhBao.map((c) => `${c.loai}:${c.orderCode}`), ["NHAP_CHO_DAT_GAP:ĐH-N1"]);
  const rong = dungLichChung(vao({ chinhSach: null, nhap: [{ legId: "n1", orderId: "dn1", orderCode: "ĐH-N1", ngayDon: "2026-09-30", gioDon: "06:30", datGap: false }] }));
  assert.deepEqual(rong.canhBao.map((c) => c.loai), ["CHINH_SACH_RONG"]);
  assert.deepEqual(rong.nhapChoDatGap, []);
});

test("giữ là dự phóng 'xuất bến đúng giờ': chuyến trước của cùng xe vừa kết thúc THẬT 10 phút trước, chuyến sau còn 3 giờ nữa mới chạy → KHÔNG giữ vì nghỉ", () => {
  const bayGio = ms("2026-09-30", "03:00");
  const truoc: KhungChuyen = { id: "cx-truoc", ma: "CX-truoc", xeId: "xe-a", taiXePartyId: "tx-khac", batDauMs: ms("2026-09-30", "01:00"), ketThucMs: ms("2026-09-30", "02:40"), ketThucThatMs: bayGio - 10 * PHUT, trangThai: "ENDED" };
  const r = dungLichChung(vao({ bayGioMs: bayGio, chuyen: [chuyen("07")], chuyenKhac: [truoc] }));
  assert.deepEqual(r.chuyen[0]!.lyDoGiu, []);
  // Chuyến chạy ngay bây giờ (giờ bắt đầu đã tới) thì nghỉ tính tới BÂY GIỜ → giữ.
  const r2 = dungLichChung(vao({ bayGioMs: bayGio, chuyen: [chuyen("07", { batDauMs: bayGio - PHUT, ketThucMs: bayGio + 3600e3 })], chuyenKhac: [truoc] }));
  assert.deepEqual(r2.chuyen[0]!.lyDoGiu.map((l) => l.ma), ["NGHI_THIEU"]);
});
