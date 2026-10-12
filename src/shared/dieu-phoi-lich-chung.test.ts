// Lịch chung ngày D — HÌNH CHIẾU dựng lúc đọc, không bảng riêng (ADR-0049 D1; [TK] §1.3; MQ-04, MQ-05 phần lượt 1; kế hoạch Task A4). Một hàm thuần gom:
// chặng + trạng thái, chuyến + tải + lý do giữ (chính `kiemXuatBen`, dự phóng "xuất bến đúng giờ"), cảnh báo, đơn nháp dưới mốc chờ Quản trị duyệt đặt gấp.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ChangVao, ChinhSachVao, ChuyenVao, DiemVao, HangBangVao, KhungChuyen, SuatVao, TaiXeVao, XeVao } from "./dieu-phoi-kieu.ts";
import { LOAI_CANH_BAO_LICH, NHAN_CANH_BAO_LICH, dungLichChung, type LichChungVao } from "./dieu-phoi-lich-chung.ts";
import { vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;
const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
const CS: ChinhSachVao = { id: "cs-1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720 };
const HB: HangBangVao[] = [{ classCode: "D1", maxPassengers: 16 }, { classCode: "D2", maxPassengers: 29 }];
const xe = (v: Partial<XeVao> = {}): XeVao => ({ id: "xe-a", bienSo: "79B-123.45", soCho: 15, trangThai: "active", chuXePartyId: "cty", chuLaCongTy: true, giayTo: [], ...v });
const tx = (v: Partial<TaiXeVao> = {}): TaiXeVao => ({ partyId: "tx-an", displayName: "Tài xế An", loai: "CONG_TY", carrierPartyIds: [], giayTo: [{ rowId: "g-an", typeCode: "GPLX", classCode: "D1", expiryDate: null }], ...v });
const chang = (legId: string, v: Partial<ChangVao> = {}): ChangVao => ({
  legId, orderId: `don-${legId}`, orderCode: `ĐH-${legId}`, chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true,
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: 2, nguoiCuaDon: [`${legId}-p1`, `${legId}-p2`], datGap: false,
  khoaNoiDon: "L:noi-d1", khoaNoiTra: "L:noi-d9", xeRieng: false, choToiThieu: null, ...v, // khoá so sánh nơi GIẢ (ADR-0050 VK1-B)
});
const suat = (id: string, legId: string, tripId: string, v: Partial<SuatVao> = {}): SuatVao => ({
  id, tripId, loai: "PASSENGER", legId, personKey: null, crewPartyId: null, boardStopId: "d1", alightStopId: "d9", trangThai: "WAITING", mo: true,
  moTuMs: Date.parse("2026-09-29T00:00:00.000Z"), ...v, // giờ ghi nhận mở suất GIẢ (ADR-0050 VK1-A vế 5)
});
const chuyen = (id: string, v: Partial<ChuyenVao> = {}): ChuyenVao => ({
  id, ma: `CX-${id}`, ngayChay: "2026-09-30", batDauMs: ms("2026-09-30", "06:00"), ketThucMs: ms("2026-09-30", "08:30"), ketThucThatMs: null, trangThai: "PLANNED",
  xe: xe(), taiXe: tx(), nghiChup: 30, nghiPhaLe: false, thue: false, coNguonGia: false, camKetPhaLeKhoa: null, ...v,
});
const BAY_GIO = ms("2026-09-29", "20:00");
/** Điểm mặc định của một chuyến: d1 (đón) / d9 (trả) với khoá so sánh nơi GIẢ khớp khung `chang()` (ADR-0050 VK1-B). */
function diemMacDinh(tripId: string): DiemVao[] {
  return [
    { id: "d1", tripId, seq: 1, loai: "PICKUP", trangThai: "PENDING", placeKey: "L:noi-d1", gioXeToiMs: null },
    { id: "d9", tripId, seq: 9, loai: "DROPOFF", trangThai: "PENDING", placeKey: "L:noi-d9", gioXeToiMs: null },
  ];
}
function vao(v: Partial<LichChungVao> = {}): LichChungVao {
  const diem = (v.chuyen ?? []).flatMap((c) => diemMacDinh(c.id));
  return { chang: [], nhap: [], chuyen: [], suat: [], diem, chuyenKhac: [], chinhSach: CS, hangBang: HB, dieuKien: [], bayGioMs: BAY_GIO, ...v };
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

test("LOAI_CANH_BAO_LICH có hai cảnh báo K-02 của bản soi Kernel (ADR-0050): NOI_HEN_KHAC_DIEM, GIO_XE_TOI_MUON_HON_HEN; MỌI loại có nhãn tiếng Việt (không lộ mã)", () => {
  assert.ok((LOAI_CANH_BAO_LICH as readonly string[]).includes("NOI_HEN_KHAC_DIEM"));
  assert.ok((LOAI_CANH_BAO_LICH as readonly string[]).includes("GIO_XE_TOI_MUON_HON_HEN"));
  assert.deepEqual(Object.keys(NHAN_CANH_BAO_LICH).sort(), [...LOAI_CANH_BAO_LICH].sort());
  for (const k of LOAI_CANH_BAO_LICH) {
    assert.ok(NHAN_CANH_BAO_LICH[k].trim().length > 0, k);
    assert.doesNotMatch(NHAN_CANH_BAO_LICH[k], /[A-Z]{2,}_/, `${k}: nhãn không lộ mã`);
  }
});

// ---- [SOI] K-02 (ADR-0050; TC-53): cảnh báo trên bảng — cùng hàm noiLechCuaSuat với lý do giữ NOI_HEN_DOI (I47) --------------------------------------------
const diemK = (id: string, tripId: string, loai: "PICKUP" | "DROPOFF", placeKey: string, v: Partial<DiemVao> = {}): DiemVao => ({
  id, tripId, seq: loai === "PICKUP" ? 1 : 9, loai, trangThai: "PENDING", placeKey, gioXeToiMs: null, ...v,
});
const vaoK02 = (v: Partial<LichChungVao>): LichChungVao => ({
  chang: [chang("a")], nhap: [], chuyen: [chuyen("t1")], suat: [suat("s1", "a", "t1", { personKey: "a-p1" }), suat("s2", "a", "t1", { personKey: "a-p2" })],
  diem: [diemK("d1", "t1", "PICKUP", "L:noi-d1"), diemK("d9", "t1", "DROPOFF", "L:noi-d9")],
  chuyenKhac: [], chinhSach: CS, hangBang: HB, dieuKien: [], bayGioMs: ms("2026-09-29", "20:00"), ...v,
});
const loaiCb = (r: ReturnType<typeof dungLichChung>, loai: string) => r.canhBao.filter((c) => c.loai === loai).map((c) => `${c.tripId}:${c.orderCode}`);

test("TC-53 NOI_HEN_KHAC_DIEM: chuyến chưa chạy lệch nơi → vừa cảnh báo vừa giữ NOI_HEN_DOI; chuyến ĐANG CHẠY lệch → CHỈ cảnh báo; khớp → không; chuyến đã kết thúc → không", () => {
  assert.deepEqual(loaiCb(dungLichChung(vaoK02({})), "NOI_HEN_KHAC_DIEM"), []);
  const lech = dungLichChung(vaoK02({ chang: [chang("a", { khoaNoiDon: "L:noi-khac" })] }));
  assert.deepEqual(loaiCb(lech, "NOI_HEN_KHAC_DIEM"), ["t1:ĐH-a"], "một cảnh báo cho một chặng lệch");
  assert.ok(lech.chuyen[0]!.lyDoGiu.some((x) => x.ma === "NOI_HEN_DOI"), "chuyến chưa chạy bị giữ");
  const chay = dungLichChung(vaoK02({ chang: [chang("a", { khoaNoiTra: "L:noi-khac" })], chuyen: [chuyen("t1", { trangThai: "RUNNING" })] }));
  assert.deepEqual(loaiCb(chay, "NOI_HEN_KHAC_DIEM"), ["t1:ĐH-a"], "xe đang chạy: vẫn báo để văn phòng gọi tài xế");
  assert.deepEqual(chay.chuyen[0]!.lyDoGiu, [], "xe đang chạy không có 'giữ'");
  const xong = dungLichChung(vaoK02({ chang: [chang("a", { khoaNoiDon: "L:noi-khac" })], chuyen: [chuyen("t1", { trangThai: "ENDED", ketThucThatMs: ms("2026-09-30", "08:00") })] }));
  assert.deepEqual(loaiCb(xong, "NOI_HEN_KHAC_DIEM"), []);
  // xe đang chạy, khách ĐÃ LÊN xe: nơi ĐÓN đổi không còn ý nghĩa → không báo; nơi TRẢ đổi → báo
  const daLen = [suat("s1", "a", "t1", { personKey: "a-p1", trangThai: "BOARDED" }), suat("s2", "a", "t1", { personKey: "a-p2", trangThai: "BOARDED" })];
  assert.deepEqual(loaiCb(dungLichChung(vaoK02({ chang: [chang("a", { khoaNoiDon: "L:noi-khac" })], chuyen: [chuyen("t1", { trangThai: "RUNNING" })], suat: daLen })), "NOI_HEN_KHAC_DIEM"), []);
  assert.deepEqual(loaiCb(dungLichChung(vaoK02({ chang: [chang("a", { khoaNoiTra: "L:noi-khac" })], chuyen: [chuyen("t1", { trangThai: "RUNNING" })], suat: daLen })), "NOI_HEN_KHAC_DIEM"), ["t1:ĐH-a"]);
});

test("TC-53 GIO_XE_TOI_MUON_HON_HEN: điểm đón có giờ xe tới ghi đè MUỘN hơn giờ hẹn sớm nhất của các chặng đón tại điểm → cảnh báo; bằng / sớm hơn / không ghi đè → không", () => {
  const voiGio = (hhmm: string | null) => vaoK02({ diem: [diemK("d1", "t1", "PICKUP", "L:noi-d1", { gioXeToiMs: hhmm ? ms("2026-09-30", hhmm) : null }), diemK("d9", "t1", "DROPOFF", "L:noi-d9")] });
  assert.deepEqual(loaiCb(dungLichChung(voiGio("06:40")), "GIO_XE_TOI_MUON_HON_HEN"), ["t1:ĐH-a"], "hẹn 06:30, xe tới 06:40");
  assert.deepEqual(loaiCb(dungLichChung(voiGio("06:30")), "GIO_XE_TOI_MUON_HON_HEN"), []);
  assert.deepEqual(loaiCb(dungLichChung(voiGio("06:20")), "GIO_XE_TOI_MUON_HON_HEN"), []);
  assert.deepEqual(loaiCb(dungLichChung(voiGio(null)), "GIO_XE_TOI_MUON_HON_HEN"), []);
});

test("I38 (R-P9): lịch chung truyền `changNgoai` xuống cổng xuất bến — chuyến có suất của chặng rơi khỏi lichChungChang bị giữ ĐÚNG lý do (đơn đã huỷ), không lý do chung", () => {
  const r = dungLichChung(vao({
    chuyen: [chuyen("07")],
    suat: [suat("s1", "x", "07")],
    changNgoai: [{ legId: "x", orderCode: "ĐH-x", lyDo: "DON_DA_HUY" }],
  }));
  assert.deepEqual(r.chuyen[0]!.lyDoGiu.map((l) => l.ma), ["DON_DA_HUY"]);
  assert.match(r.chuyen[0]!.lyDoGiu[0]!.loiNhan, /ĐH-x/);
});

// ---- Giờ lái (ADR-0055 VK2-B B3 — kế hoạch Đợt 3 Task 4) ------------------------------------------------------------------------------------------------
/** Ba chuyến của tài xế An cùng ngày 30/09: 05:00–08:00, 09:00–12:00 (lịch), 13:00–15:10 (chuyenKhac — phải gộp, khử trùng id) = 8 giờ 10 phút. */
function vaoVoi3ChuyenCungTaiXe(): LichChungVao {
  return vao({
    chuyen: [
      chuyen("t1", { batDauMs: ms("2026-09-30", "05:00"), ketThucMs: ms("2026-09-30", "08:00") }),
      chuyen("t2", { batDauMs: ms("2026-09-30", "09:00"), ketThucMs: ms("2026-09-30", "12:00"), xe: xe({ id: "xe-b", bienSo: "79B-678.90" }) }),
    ],
    chuyenKhac: [{ id: "t3", ma: "CX-t3", xeId: "xe-c", taiXePartyId: "tx-an", batDauMs: ms("2026-09-30", "13:00"), ketThucMs: ms("2026-09-30", "15:10"), ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null },
      // trùng id với chuyến của lịch — không cộng hai lần
      { id: "t1", ma: "CX-t1", xeId: "xe-a", taiXePartyId: "tx-an", batDauMs: ms("2026-09-30", "05:00"), ketThucMs: ms("2026-09-30", "08:00"), ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null }],
  });
}
test("VK2-B B3: tài xế ba chuyến tổng 8 giờ 10 phút cùng ngày → GIO_LAI_VUOT gắn từng chuyến chưa kết thúc của tài xế; lyDoGiu (kiemXuatBen) KHÔNG đổi", () => {
  const ra = dungLichChung(vaoVoi3ChuyenCungTaiXe());
  const gl = ra.canhBao.filter((w) => w.loai === "GIO_LAI_VUOT").map((w) => w.tripId).sort();
  assert.deepEqual(gl, ["t1", "t2"], "chuyến ở chuyenKhac góp vào tổng nhưng không sinh mục (không thuộc lịch ngày)");
  const truoc = dungLichChung({ ...vaoVoi3ChuyenCungTaiXe(), chinhSach: { ...CS, dutyDayMaxMinutes: 1440 } });
  assert.deepEqual(truoc.canhBao.filter((w) => w.loai === "GIO_LAI_VUOT"), [], "ngưỡng 24 giờ → không cảnh báo");
  assert.deepEqual(ra.chuyen.map((c) => c.lyDoGiu), truoc.chuyen.map((c) => c.lyDoGiu), "chỉ cảnh báo — không đổi giữ");
});
test("VK2-B B3: chuyến dự kiến 4 giờ 30 phút → CHUYEN_DAI_CAN_NGHI; đúng 4 giờ → không", () => {
  const ra = dungLichChung(vao({ chuyen: [chuyen("dai", { batDauMs: ms("2026-09-30", "06:00"), ketThucMs: ms("2026-09-30", "10:30") }), chuyen("bon", { batDauMs: ms("2026-09-30", "11:00"), ketThucMs: ms("2026-09-30", "15:00"), xe: xe({ id: "xe-b" }), taiXe: tx({ partyId: "tx-binh" }) })] }));
  assert.deepEqual(ra.canhBao.filter((w) => w.loai === "CHUYEN_DAI_CAN_NGHI").map((w) => w.tripId), ["dai"]);
});
test("nhãn hai loại mới có chữ, không lộ mã", () => {
  for (const l of ["GIO_LAI_VUOT", "CHUYEN_DAI_CAN_NGHI"] as const) {
    assert.ok(NHAN_CANH_BAO_LICH[l].length > 0);
    assert.doesNotMatch(NHAN_CANH_BAO_LICH[l], /[A-Z]{2,}_/);
  }
});

test("HT-01 TRA_TRUOC_DON: suất CHỜ ĐÓN có điểm xuống đứng trước điểm lên → cảnh báo (một mục mỗi chặng) VÀ — từ ADR-0096 Đ1.2 (gói A1) — lý do GIỮ của chuyến chưa chạy; đúng thứ tự / đã lên xe / chuyến đã kết thúc → không", () => {
  // Tái hiện: 1 Đón Mường Thanh → 2 Trả Bến tàu → 3 Đón Novotel; đoàn Novotel xuống ở điểm 2.
  const diem = (tripId: string): DiemVao[] => [
    { id: "d1", tripId, seq: 1, loai: "PICKUP", trangThai: "PENDING", placeKey: "L:noi-d1", gioXeToiMs: null },
    { id: "d9", tripId, seq: 2, loai: "DROPOFF", trangThai: "PENDING", placeKey: "L:noi-d9", gioXeToiMs: null },
    { id: "d3", tripId, seq: 3, loai: "PICKUP", trangThai: "PENDING", placeKey: "L:noi-d3", gioXeToiMs: null },
  ];
  const ca = (trangThai: ChuyenVao["trangThai"], sTrangThai: SuatVao["trangThai"] = "WAITING") => dungLichChung(vao({
    chang: [chang("a", { nguoiCuaDon: ["a-p1"], soNguoi: 1 }), chang("b", { nguoiCuaDon: ["b-p1", "b-p2"], khoaNoiDon: "L:noi-d3" })],
    chuyen: [chuyen("07", { trangThai })],
    diem: diem("07"),
    suat: [suat("s1", "a", "07", { personKey: "a-p1" }), suat("s2", "b", "07", { personKey: "b-p1", boardStopId: "d3", trangThai: sTrangThai }), suat("s3", "b", "07", { personKey: "b-p2", boardStopId: "d3", trangThai: sTrangThai })],
  }));
  const r = ca("PLANNED");
  assert.deepEqual(r.canhBao.filter((c) => c.loai === "TRA_TRUOC_DON"), [{ loai: "TRA_TRUOC_DON", legId: "b", tripId: "07", orderCode: "ĐH-b" }]);
  assert.deepEqual(r.chuyen[0]!.lyDoGiu.map((l) => [l.ma, l.aiXuLy, l.loiNhan]), [
    ["TRA_TRUOC_DON", "VAN_PHONG", "Điểm trả đứng trước điểm đón — đổi thứ tự điểm rồi xuất bến: ĐH-b (điểm trả số 2 đứng trước điểm đón số 3)"],
  ], "ADR-0096 Đ1.2: thành lý do giữ (cổng xuất bến, MỘT luật với lệnh xuất bến)");
  assert.equal(r.canhBao.filter((c) => c.loai === "CHUYEN_GIU").length, 1);
  assert.equal(ca("RUNNING").canhBao.filter((c) => c.loai === "TRA_TRUOC_DON").length, 1, "đang chạy: vẫn báo để văn phòng gọi tài xế");
  assert.equal(ca("RUNNING", "BOARDED").canhBao.filter((c) => c.loai === "TRA_TRUOC_DON").length, 0, "khách đã lên xe: không còn 'trả trước đón'");
  assert.equal(ca("ENDED").canhBao.filter((c) => c.loai === "TRA_TRUOC_DON").length, 0);
  // Đúng thứ tự (điểm mặc định d1 → d9) → không.
  const dung = dungLichChung(vao({ chang: [chang("a", { nguoiCuaDon: ["a-p1"], soNguoi: 1 })], chuyen: [chuyen("07")], suat: [suat("s1", "a", "07", { personKey: "a-p1" })] }));
  assert.equal(dung.canhBao.filter((c) => c.loai === "TRA_TRUOC_DON").length, 0);
  assert.ok(NHAN_CANH_BAO_LICH.TRA_TRUOC_DON.length > 0);
});

test("Đợt 7 (ADR-0056 VK3-A, Review Focus 3): chuyến chưa chạy vi phạm cam kết xe riêng, không phá lệ → lịch chung hiện 'giữ' CAM_KET (Quản trị) bằng lời; khoá phá lệ khớp → không giữ", () => {
  const ds = [chang("a", { xeRieng: true, soNguoi: 1, nguoiCuaDon: ["a-p1"] }), chang("b", { soNguoi: 1, nguoiCuaDon: ["b-p1"] })];
  const suatAB = [suat("s1", "a", "07", { personKey: "a-p1" }), suat("s2", "b", "07", { personKey: "b-p1" })];
  const giu = dungLichChung(vao({ chang: ds, chuyen: [chuyen("07")], suat: suatAB }));
  const c = giu.chuyen[0]!;
  assert.deepEqual(c.lyDoGiu.map((l) => `${l.ma}:${l.aiXuLy}`), ["CAM_KET:QUAN_TRI", "CAM_KET:QUAN_TRI"]);
  assert.ok(c.lyDoGiu.some((l) => /xe riêng/.test(l.loiNhan) && /ĐH-a/.test(l.loiNhan)));
  assert.deepEqual(giu.canhBao.filter((x) => x.loai === "CHUYEN_GIU").map((x) => x.tripId), ["07"]);
  // Khoá đúng tập vi phạm (xe-a + hai dòng XR — C5) → đã phá lệ, không giữ.
  const khoa = "xe:xe-a|a:XR:1:-|b:XR:0:-";
  const daPhaLe = dungLichChung(vao({ chang: ds, chuyen: [chuyen("07", { camKetPhaLeKhoa: khoa })], suat: suatAB }));
  assert.deepEqual(daPhaLe.chuyen[0]!.lyDoGiu, []);
});
