// Bài của luật thuần chuyển khách giữa hai xe (ADR-0052 D4; ADR-0111 Đ1–Đ6; kế hoạch A5 T3). Mười tình huống của chủ chạy ở src/chuyen-khach-ca-mau.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  MA_LUAT_CHUYEN, MIEN_DAT_GAP_KHI_CHUYEN, NHAN_LUAT_CHUYEN, TANG_LUAT, chuanNoiGap, daHetHan, deNghiHuyKhi, deNghiTuHuyKhiXacNhan, hetHanLucMs, hopDuyet,
  NHAN_TRANG_THAI_DE_NGHI, TRANG_THAI_DE_NGHI, keHoachDiem, kiemChuyen, kiemGui, quyetDinhSauKiem, suatCuaDeNghi, trangThaiLucDoc, type DeNghiGon, type KiemChuyenVao,
} from "./chuyen-khach.ts";
import type { ChangVao, SuatVao, TaiXeVao, XeVao } from "./dieu-phoi-kieu.ts";

const PHUT = 60_000;
const T0 = Date.UTC(2026, 8, 29, 23, 20); // 06:20 giờ VN ngày 30/9
const chang = (legId: string, o: Partial<ChangVao> = {}): ChangVao => ({
  legId, orderId: `don-${legId}`, orderCode: `ĐH-${legId}`, chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true, donDaXacNhan: true, donDaHuy: false,
  changMo: true, soNguoi: 3, nguoiCuaDon: [], datGap: false, khoaNoiDon: `L:${legId}`, khoaNoiTra: "L:cang", xeRieng: false, choToiThieu: null, ...o,
});
const suat = (id: string, o: Partial<SuatVao> = {}): SuatVao => ({
  id, tripId: "a", loai: "PASSENGER", legId: "mt", personKey: null, crewPartyId: null, boardStopId: "d-mt", alightStopId: "d-cang", trangThai: "WAITING", mo: true, moTuMs: T0 - 60 * PHUT, ...o,
});
const xe = (id: string, soCho: number, o: Partial<XeVao> = {}): XeVao => ({ id, bienSo: `79B-${id}`, soCho, trangThai: "active", chuXePartyId: "cty", chuLaCongTy: true, giayTo: [], ...o });
const taiXe = (partyId: string, hang: string, o: Partial<TaiXeVao> = {}): TaiXeVao => ({
  partyId, displayName: partyId, loai: "CONG_TY", carrierPartyIds: [], giayTo: [{ rowId: `g-${partyId}`, typeCode: "GPLX", classCode: hang, expiryDate: null }], ...o,
});
const DANH_MUC = MA_LUAT_CHUYEN.map((code) => ({ code, tier: TANG_LUAT[code], active: true }));
const CHINH_SACH = {
  id: "cs", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240,
  departureWindowMinutes: 720,
};
/** Nền TH01: xe A 14/15 nhờ xe B 22/29 (đang chạy) đón 3 khách Mường Thanh. */
function nen(o: Partial<KiemChuyenVao> = {}): KiemChuyenVao {
  return {
    phamVi: "STOP",
    nguon: { id: "a", soCho: 15, tai: 14 },
    diemNguon: { id: "d-mt", trangThai: "PENDING" },
    dich: { id: "b", ma: "CX-B", trangThai: "RUNNING", batDauMs: T0 - 20 * PHUT, batDauSomNhatMs: T0 - 20 * PHUT, ketThucMs: T0 + 130 * PHUT, ketThucThatMs: null,
      xe: xe("b", 29), taiXe: taiXe("tx-b", "D2"), camKetPhaLeKhoa: null },
    taiDich: 22,
    suatChuyen: [suat("s1"), suat("s2"), suat("s3")],
    changChuyen: [chang("mt")],
    changTrenDich: [chang("hc", { soNguoi: 20 })],
    chuyenKhac: [],
    chinhSach: CHINH_SACH,
    hangBang: [{ classCode: "D1", maxPassengers: 16 }, { classCode: "D2", maxPassengers: 29 }],
    dieuKien: [],
    danhMuc: DANH_MUC,
    bayGioMs: T0 + 2 * PHUT,
    ...o,
  };
}
const ket = (v: KiemChuyenVao) => Object.fromEntries(kiemChuyen(v).dong.map((d) => [d.ma, d.ketQua]));
const dong = (v: KiemChuyenVao, ma: string) => kiemChuyen(v).dong.find((d) => d.ma === ma);

test("TANG_LUAT, NHAN_LUAT_CHUYEN khớp đúng 12 dòng gieo của migration 0093 (11, NT-A5-1) và 0110 (XE_RIENG_DICH, ADR-0128 Q2) — mã, tầng, nhãn, thứ tự", () => {
  const khoiCua = (tep: string) => {
    const sql = readFileSync(new URL(`../../migrations/${tep}`, import.meta.url), "utf8");
    return sql.slice(sql.indexOf("INSERT INTO vc_transfer_rule"), sql.indexOf(";", sql.indexOf("INSERT INTO vc_transfer_rule")));
  };
  const khoi = khoiCua("0093_chuyen_khach_giua_xe.sql") + khoiCua("0110_dieu_kien_chuyen_khach_xe_rieng.sql");
  // Nhãn đổi chữ về sau bằng câu UPDATE (0111 — rà soát ngôn ngữ lượt 2): nhãn hiện hành = nhãn của câu UPDATE cuối cùng.
  const doiNhan = new Map<string, string>();
  for (const tep of readdirSync(new URL("../../migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(new URL(`../../migrations/${tep}`, import.meta.url), "utf8").replace(/--.*$/gm, "");
    for (const m of sql.matchAll(/UPDATE vc_transfer_rule SET label = '([^']+)' WHERE code = '([A-Z_]+)'/g)) doiNhan.set(m[2]!, m[1]!);
  }
  const gieo = [...khoi.matchAll(/\('([A-Z_]+)', '([^']+)', '(LOI|CAU_HINH)', (\d+),/g)].map((m) => ({ code: m[1], label: m[2], tier: m[3], sort: Number(m[4]) }));
  assert.equal(gieo.length, 12);
  assert.deepEqual(gieo.map((g) => g.code), [...MA_LUAT_CHUYEN]);
  for (const g of gieo) {
    assert.equal(TANG_LUAT[g.code as keyof typeof TANG_LUAT], g.tier, g.code);
    assert.equal(NHAN_LUAT_CHUYEN[g.code as keyof typeof NHAN_LUAT_CHUYEN], doiNhan.get(g.code) ?? g.label, g.code);
  }
});

test("kiemChuyen: TH01 — mọi điều kiện đạt, đúng một dòng mỗi điều kiện đang dùng với tầng của danh mục; số liệu sức chứa 25/29 và 11/15", () => {
  const r = kiemChuyen(nen());
  assert.deepEqual(r.dong.map((d) => d.ma), [...MA_LUAT_CHUYEN]);
  for (const d of r.dong) {
    assert.equal(d.ketQua, "DAT", d.ma);
    assert.equal(d.tang, TANG_LUAT[d.ma as keyof typeof TANG_LUAT]);
  }
  assert.deepEqual([dong(nen(), "SUC_CHUA_DICH")?.giaTri, dong(nen(), "SUC_CHUA_DICH")?.gioiHan], [25, 29]);
  assert.deepEqual([dong(nen(), "SUC_CHUA_NGUON")?.giaTri, dong(nen(), "SUC_CHUA_NGUON")?.gioiHan], [11, 15]);
  assert.equal(quyetDinhSauKiem(r.dong, true), "CONFIRMED");
  assert.equal(quyetDinhSauKiem(r.dong, false), "ESCALATED", "công tắc tắt ⇒ luôn chờ Quản trị");
});

test("kiemChuyen: danh mục — điều kiện tắt không có dòng; mã lạ đang dùng ⇒ KHONG_DAT tầng của danh mục (không lặng lẽ DAT)", () => {
  const tat = DANH_MUC.map((d) => (d.code === "SUC_CHUA_NGUON" ? { ...d, active: false } : d));
  assert.ok(!kiemChuyen(nen({ danhMuc: tat })).dong.some((d) => d.ma === "SUC_CHUA_NGUON"));
  const la = kiemChuyen(nen({ danhMuc: [...DANH_MUC, { code: "LUAT_MOI", tier: "CAU_HINH" as const, active: true }] })).dong.find((d) => d.ma === "LUAT_MOI");
  assert.deepEqual(la, { ma: "LUAT_MOI", tang: "CAU_HINH", ketQua: "KHONG_DAT", giaTri: null, gioiHan: null });
  // Tầng lấy theo danh mục, không theo hằng trong mã.
  const doiTang = DANH_MUC.map((d) => (d.code === "KHONG_CHEO" ? { ...d, tier: "CAU_HINH" as const } : d));
  assert.equal(kiemChuyen(nen({ danhMuc: doiTang })).dong.find((d) => d.ma === "KHONG_CHEO")?.tang, "CAU_HINH");
});

test("SUC_CHUA_DICH đếm mọi suất chuyển đang chiếm chỗ, gồm người đi kèm (LC-02); vượt ⇒ KHONG_DAT tầng LOI ⇒ chỉ Bác", () => {
  const crew = suat("c1", { loai: "CREW", legId: null, crewPartyId: "hdv", boardStopId: null, alightStopId: null, trangThai: "BOARDED" });
  const v = nen({ phamVi: "ONBOARD", diemNguon: null, dich: { ...nen().dich, xe: xe("c", 16), taiXe: taiXe("tx-c", "D1") }, taiDich: 6,
    suatChuyen: [...Array.from({ length: 8 }, (_, i) => suat(`k${i}`, { trangThai: i < 5 ? "BOARDED" : "WAITING" })), crew] });
  assert.deepEqual([dong(v, "SUC_CHUA_DICH")?.giaTri, dong(v, "SUC_CHUA_DICH")?.gioiHan, dong(v, "SUC_CHUA_DICH")?.ketQua], [15, 16, "DAT"]);
  const vuot = nen({ taiDich: 27 });
  assert.equal(ket(vuot).SUC_CHUA_DICH, "KHONG_DAT");
  assert.equal(hopDuyet(kiemChuyen(vuot).dong), "CHI_BAC");
  // Suất đã đóng hoặc đã có kết quả cuối không chiếm chỗ.
  assert.equal(dong(nen({ suatChuyen: [suat("s1"), suat("s2", { mo: false }), suat("s3", { trangThai: "NO_SHOW" })] }), "SUC_CHUA_DICH")?.giaTri, 23);
});

test("MOC_TOI_THIEU: xe nhận đang chạy ⇒ DAT; chưa chạy dưới mốc ⇒ KHONG_DAT (18/360), đặt gấp KHÔNG miễn (Đ6 = (1)); ngoài mốc ⇒ DAT", () => {
  const plan = { ...nen().dich, trangThai: "PLANNED" as const, batDauMs: T0 + 20 * PHUT, batDauSomNhatMs: T0 + 20 * PHUT };
  assert.equal(ket(nen()).MOC_TOI_THIEU, "DAT");
  const d = dong(nen({ dich: plan }), "MOC_TOI_THIEU");
  assert.deepEqual([d?.ketQua, d?.giaTri, d?.gioiHan, d?.tang], ["KHONG_DAT", 18, 360, "CAU_HINH"]);
  assert.equal(MIEN_DAT_GAP_KHI_CHUYEN, false);
  assert.equal(ket(nen({ dich: plan, changChuyen: [chang("mt", { datGap: true })] })).MOC_TOI_THIEU, "KHONG_DAT", "chặng đặt gấp vẫn chờ Quản trị (ADR-0111 Đ6)");
  assert.equal(hopDuyet(kiemChuyen(nen({ dich: plan })).dong), "DUYET_HOAC_BAC");
  // Khoá dính R-P6: giờ xét = giờ sớm nhất từng có.
  assert.equal(ket(nen({ dich: { ...plan, batDauMs: T0 + 400 * PHUT, batDauSomNhatMs: T0 + 20 * PHUT } })).MOC_TOI_THIEU, "KHONG_DAT");
  assert.equal(ket(nen({ dich: { ...plan, batDauMs: T0 + 400 * PHUT, batDauSomNhatMs: T0 + 400 * PHUT } })).MOC_TOI_THIEU, "DAT");
});

test("KHOANG_NGHI_DICH chỉ CANH_BAO (máy không biết đường đi — ADR-0052:75): chuyến kế của tài xế xe nhận trong 2 × khoảng nghỉ", () => {
  const ke = { id: "k", ma: "CX-K", xeId: "khac", taiXePartyId: "tx-b", batDauMs: T0 + 170 * PHUT, ketThucMs: T0 + 300 * PHUT, ketThucThatMs: null, trangThai: "PLANNED" as const };
  const d = dong(nen({ chuyenKhac: [ke] }), "KHOANG_NGHI_DICH");
  assert.deepEqual([d?.ketQua, d?.giaTri, d?.gioiHan], ["CANH_BAO", 40, 60]);
  assert.equal(ket(nen({ chuyenKhac: [{ ...ke, batDauMs: T0 + 200 * PHUT }] })).KHOANG_NGHI_DICH, "DAT");
  assert.equal(ket(nen({ chuyenKhac: [{ ...ke, trangThai: "CANCELLED" }] })).KHOANG_NGHI_DICH, "DAT");
  assert.equal(quyetDinhSauKiem(kiemChuyen(nen({ chuyenKhac: [ke] })).dong, true), "CONFIRMED", "CANH_BAO không chặn máy tự đồng ý");
});

test("TRUNG_GIO_DICH (LC-03): chuyến khác của xe hoặc tài xế xe nhận chồng giờ ⇒ KHONG_DAT; chuyến huỷ không tính", () => {
  const k = { id: "k", ma: "CX-K", xeId: "b", taiXePartyId: "tx-x", batDauMs: T0 + 100 * PHUT, ketThucMs: T0 + 200 * PHUT, ketThucThatMs: null, trangThai: "PLANNED" as const };
  assert.equal(ket(nen({ chuyenKhac: [k] })).TRUNG_GIO_DICH, "KHONG_DAT");
  assert.equal(ket(nen({ chuyenKhac: [{ ...k, xeId: "x", taiXePartyId: "tx-b" }] })).TRUNG_GIO_DICH, "KHONG_DAT");
  assert.equal(ket(nen({ chuyenKhac: [{ ...k, trangThai: "CANCELLED" }] })).TRUNG_GIO_DICH, "DAT");
  assert.equal(ket(nen({ chuyenKhac: [{ ...k, id: "b" }] })).TRUNG_GIO_DICH, "DAT", "chính chuyến nhận không tính");
});

test("HANG_BANG_DICH / GIAY_TO_DICH / KHONG_CHEO dùng lại kiemLai, conHanToiHet, khongCheo (LC-12, LC-13)", () => {
  assert.equal(ket(nen({ dich: { ...nen().dich, taiXe: taiXe("tx-b", "D1") } })).HANG_BANG_DICH, "KHONG_DAT", "D1 (16) lái xe 29 chỗ");
  const hetHan = taiXe("tx-b", "D2", { giayTo: [{ rowId: "g", typeCode: "GPLX", classCode: "D2", expiryDate: "2026-09-29" }] });
  assert.deepEqual([ket(nen({ dich: { ...nen().dich, taiXe: hetHan } })).GIAY_TO_DICH, ket(nen({ dich: { ...nen().dich, taiXe: hetHan } })).HANG_BANG_DICH], ["KHONG_DAT", "DAT"]);
  const dk = [{ id: "dk", minCapacity: 16, subject: "VEHICLE" as const, documentTypeCode: "KIEM_DINH" }];
  assert.equal(ket(nen({ dieuKien: dk })).GIAY_TO_DICH, "KHONG_DAT", "xe 29 chỗ thiếu giấy kiểm định");
  const coGiay = { ...nen().dich, xe: xe("b", 29, { giayTo: [{ rowId: "kd", typeCode: "KIEM_DINH", expiryDate: "2026-12-31" }] }) };
  const g = dong(nen({ dieuKien: dk, dich: coGiay }), "GIAY_TO_DICH");
  assert.deepEqual([g?.ketQua, g?.giaTri, g?.gioiHan], ["DAT", 20261231, 20260930]);
  assert.equal(ket(nen({ dich: { ...nen().dich, taiXe: taiXe("tx-b", "D2", { loai: "NHA_XE", carrierPartyIds: ["nx"] }) } })).KHONG_CHEO, "KHONG_DAT");
  assert.deepEqual([ket(nen({ dich: { ...nen().dich, taiXe: null } })).HANG_BANG_DICH, ket(nen({ dich: { ...nen().dich, taiXe: null } })).KHONG_CHEO], ["KHONG_DAT", "KHONG_DAT"]);
});

test("DIEM_CHUA_TOI: STOP — điểm nguồn còn Chờ ⇒ DAT, đã tới ⇒ KHONG_DAT; ONBOARD không có điểm nguồn ⇒ DAT", () => {
  assert.equal(ket(nen({ diemNguon: { id: "d-mt", trangThai: "ARRIVED" } })).DIEM_CHUA_TOI, "KHONG_DAT");
  assert.equal(ket(nen({ phamVi: "ONBOARD", diemNguon: null })).DIEM_CHUA_TOI, "DAT");
  assert.equal(ket(nen({ diemNguon: null })).DIEM_CHUA_TOI, "KHONG_DAT", "STOP mà không thấy điểm ⇒ không đoán");
});

test("CAM_KET_DICH / XE_RIENG_DICH gọi kiemCamKet trên chuyến nhận SAU chuyển (R-XR cả hai chiều, R-CX); ADR-0128 Q2: xe riêng ⇒ XE_RIENG_DICH tầng LOI ⇒ chỉ Bác, khoá lưu không cứu; số chỗ tối thiểu vẫn duyệt được, đã phá lệ đúng khoá ⇒ DAT", () => {
  const xr = nen({ changTrenDich: [chang("hc", { soNguoi: 20, xeRieng: true })] });
  // ADR-0128 Q2 — migration 0110: xe riêng tách sang XE_RIENG_DICH (tầng LOI của danh mục); CAM_KET_DICH chỉ còn số chỗ tối thiểu.
  assert.equal(ket(xr).XE_RIENG_DICH, "KHONG_DAT");
  assert.equal(ket(xr).CAM_KET_DICH, "DAT", "chỉ có vi phạm xe riêng");
  assert.equal(hopDuyet(kiemChuyen(xr).dong), "CHI_BAC", "xe riêng không duyệt được");
  assert.equal(dong(xr, "XE_RIENG_DICH")?.tang, "LOI");
  assert.equal(ket(nen({ changChuyen: [chang("mt", { xeRieng: true })] })).XE_RIENG_DICH, "KHONG_DAT", "đưa đoàn xe riêng vào xe đang chở khách khác");
  const cx = nen({ changChuyen: [chang("mt", { choToiThieu: 30 })] });
  assert.equal(ket(cx).CAM_KET_DICH, "KHONG_DAT", "xe 29 chỗ < tối thiểu 30");
  assert.equal(hopDuyet(kiemChuyen(cx).dong), "DUYET_HOAC_BAC", "số chỗ tối thiểu vẫn duyệt được");
  assert.equal(dong(cx, "CAM_KET_DICH")?.tang, "CAU_HINH");
  const khoaXr = kiemChuyen(xr).camKet.khoa;
  assert.ok(khoaXr);
  assert.equal(ket(nen({ changTrenDich: [chang("hc", { soNguoi: 20, xeRieng: true })], dich: { ...nen().dich, camKetPhaLeKhoa: khoaXr } })).XE_RIENG_DICH, "KHONG_DAT", "khoá lưu khớp vẫn không che xe riêng");
  const khoaCx = kiemChuyen(cx).camKet.khoa;
  assert.ok(khoaCx);
  assert.equal(ket(nen({ changChuyen: [chang("mt", { choToiThieu: 30 })], dich: { ...nen().dich, camKetPhaLeKhoa: khoaCx } })).CAM_KET_DICH, "DAT");
  // Người đi kèm không có chặng ⇒ không vào R-XR.
  const crew = suat("c1", { loai: "CREW", legId: null, crewPartyId: "hdv", boardStopId: null, alightStopId: null, trangThai: "BOARDED" });
  assert.equal(ket(nen({ suatChuyen: [crew], changChuyen: [], changTrenDich: [chang("hc", { xeRieng: true })] })).XE_RIENG_DICH, "DAT");
});

test("CHANG_KHACH_HIEU_LUC: đơn huỷ / chặng đóng / đơn chưa xác nhận / không thấy chặng ⇒ KHONG_DAT tầng LOI ⇒ chỉ Bác (NT-A5-29); người đi kèm không xét", () => {
  for (const o of [{ donDaHuy: true }, { changMo: false }, { donDaXacNhan: false }]) {
    const v = nen({ changChuyen: [chang("mt", o)] });
    assert.equal(ket(v).CHANG_KHACH_HIEU_LUC, "KHONG_DAT", JSON.stringify(o));
    assert.equal(hopDuyet(kiemChuyen(v).dong), "CHI_BAC");
  }
  assert.equal(dong(nen({ changChuyen: [] }), "CHANG_KHACH_HIEU_LUC")?.giaTri, 3, "ba suất khách không thấy chặng");
  const crew = suat("c1", { loai: "CREW", legId: null, crewPartyId: "hdv", boardStopId: null, alightStopId: null, trangThai: "BOARDED" });
  assert.equal(ket(nen({ suatChuyen: [crew], changChuyen: [] })).CHANG_KHACH_HIEU_LUC, "DAT");
});

test("hopDuyet xét MỌI dòng kiểm của đề nghị (mọi lần kiểm — ADR-0052:80, TH10-10B-5)", () => {
  const lan1 = [{ tang: "LOI" as const, ketQua: "KHONG_DAT" as const }];
  const lan2 = [{ tang: "LOI" as const, ketQua: "DAT" as const }];
  assert.equal(hopDuyet([...lan1, ...lan2]), "CHI_BAC");
  assert.equal(hopDuyet([{ tang: "CAU_HINH", ketQua: "KHONG_DAT" }, { tang: "LOI", ketQua: "CANH_BAO" }]), "DUYET_HOAC_BAC");
});

test("hết giờ chờ (MQ-08): tính lúc đọc; biên ≥ khớp trigger ck_han_cho — 1 ms trước hạn còn chờ, đúng hạn là hết", () => {
  const han = hetHanLucMs(T0, 10);
  assert.equal(han, T0 + 10 * PHUT);
  assert.equal(daHetHan(T0, 10, han - 1), false);
  assert.equal(daHetHan(T0, 10, han), true);
});

test("chuanNoiGap: đúng MỘT trong hai (địa điểm / chữ); chữ bỏ ký tự điều khiển, che dãy ≥ 8 chữ số, tối đa 200 ký tự", () => {
  assert.deepEqual(chuanNoiGap({ diaDiemId: "loc-1", chu: null }), { ok: true, diaDiemId: "loc-1", chu: null });
  assert.deepEqual(chuanNoiGap({ diaDiemId: null, chu: "  Cây xăng Phước Đồng, QL1A  " }), { ok: true, diaDiemId: null, chu: "Cây xăng Phước Đồng, QL1A" });
  assert.equal((chuanNoiGap({ diaDiemId: null, chu: "Gọi 0905123456 ở cây xăng" }) as { chu: string }).chu, "Gọi •••••••••• ở cây xăng");
  assert.equal(chuanNoiGap({ diaDiemId: "loc-1", chu: "x" }).ok, false);
  assert.equal(chuanNoiGap({ diaDiemId: null, chu: "   " }).ok, false);
  assert.equal(chuanNoiGap({}).ok, false);
  assert.equal(chuanNoiGap({ diaDiemId: null, chu: "a".repeat(201) }).ok, false);
});

test("suatCuaDeNghi: STOP = suất mở đón tại điểm; ONBOARD = mọi suất mở Chờ + Đã lên, gồm người đi kèm", () => {
  const ds = [
    suat("w1"), suat("w2"), suat("b1", { boardStopId: "d-sh", trangThai: "BOARDED" }), suat("x", { mo: false }), suat("n", { boardStopId: "d-sh", trangThai: "NO_SHOW" }),
    suat("c1", { loai: "CREW", legId: null, crewPartyId: "hdv", boardStopId: null, alightStopId: null, trangThai: "BOARDED" }),
  ];
  assert.deepEqual(suatCuaDeNghi("STOP", ds, "d-mt").map((s) => s.id), ["w1", "w2"]);
  assert.deepEqual(suatCuaDeNghi("ONBOARD", ds, null).map((s) => s.id), ["w1", "w2", "b1", "c1"]);
});

test("kiemGui (LC-14 lớp máy chủ): đủ ca chặn của NT-A5-4 + vế Đ4 (cứu hộ chỉ sang xe đang chạy)", () => {
  const ok = {
    phamVi: "STOP" as const, nguon: { trangThai: "RUNNING" as const, ngayChay: "2026-09-30", taiXePartyId: "tx-a" }, dich: { trangThai: "RUNNING" as const, ngayChay: "2026-09-30", taiXePartyId: "tx-b" },
    diem: { tripId: "a", loai: "PICKUP" as const, trangThai: "PENDING" as const }, suatTaiDiem: [suat("s1")], nguonId: "a", dichId: "b",
  };
  assert.equal(kiemGui(ok), null);
  assert.equal(kiemGui({ ...ok, dich: { ...ok.dich, trangThai: "PLANNED" } }), null);
  assert.equal(kiemGui({ ...ok, nguon: { ...ok.nguon, trangThai: "PLANNED" } }), "ck_nguon_khong_chay");
  assert.equal(kiemGui({ ...ok, dich: { ...ok.dich, trangThai: "ENDED" } }), "ck_dich_khong_hop_le");
  assert.equal(kiemGui({ ...ok, dichId: "a" }), "ck_dich_khong_hop_le");
  assert.equal(kiemGui({ ...ok, dich: { ...ok.dich, ngayChay: "2026-10-01" } }), "ck_khac_ngay");
  assert.equal(kiemGui({ ...ok, dich: { ...ok.dich, taiXePartyId: "tx-a" } }), "ck_cung_tai_xe");
  assert.equal(kiemGui({ ...ok, dich: { ...ok.dich, taiXePartyId: null } }), "ck_dich_chua_co_tai_xe");
  assert.equal(kiemGui({ ...ok, diem: { ...ok.diem, trangThai: "ARRIVED" } }), "ck_diem_khong_cho");
  assert.equal(kiemGui({ ...ok, diem: { ...ok.diem, loai: "DROPOFF" } }), "ck_diem_khong_cho");
  assert.equal(kiemGui({ ...ok, diem: { ...ok.diem, tripId: "b" } }), "ck_diem_khong_cho");
  assert.equal(kiemGui({ ...ok, diem: null }), "ck_diem_khong_cho");
  assert.equal(kiemGui({ ...ok, suatTaiDiem: [] }), "ck_khong_co_khach");
  assert.equal(kiemGui({ ...ok, suatTaiDiem: [suat("s1"), suat("s2", { trangThai: "BOARDED" })] }), "ck_suat_khong_cho");
  const cuuHo = { ...ok, phamVi: "ONBOARD" as const, diem: null };
  assert.equal(kiemGui(cuuHo), null);
  assert.equal(kiemGui({ ...cuuHo, dich: { ...cuuHo.dich, trangThai: "PLANNED" } }), "ck_cuu_ho_chi_xe_dang_chay");
  assert.equal(kiemGui({ ...cuuHo, suatTaiDiem: [] }), "ck_khong_co_khach");
});

test("deNghiTuHuyKhiXacNhan (P4, MQ-09): STOP huỷ đề nghị chờ khác cùng điểm + ONBOARD chờ của nguồn; ONBOARD huỷ mọi đề nghị chờ khác của nguồn", () => {
  const dn = (id: string, o: Partial<DeNghiGon> = {}): DeNghiGon => ({ id, tuChuyen: "a", denChuyen: "b", phamVi: "STOP", diemId: "d-mt", trangThai: "PENDING", ...o });
  const ds = [
    dn("r"), dn("c", { denChuyen: "c" }), dn("leo", { denChuyen: "d", trangThai: "ESCALATED" }), dn("khac-diem", { diemId: "d-x" }), dn("onb", { phamVi: "ONBOARD", diemId: null, denChuyen: "c" }),
    dn("xong", { denChuyen: "c", trangThai: "DECLINED" }), dn("nguoc", { tuChuyen: "b", denChuyen: "a", diemId: "d-al" }),
  ];
  assert.deepEqual(deNghiTuHuyKhiXacNhan(ds[0]!, ds), ["c", "leo", "onb"]);
  assert.deepEqual(deNghiTuHuyKhiXacNhan(ds[4]!, ds), ["r", "c", "leo", "khac-diem"]);
});

test("deNghiHuyKhi (MQ-09): điểm nguồn đổi ⇒ đề nghị STOP của điểm; chuyến kết thúc / huỷ / thu hồi ⇒ mọi đề nghị chờ có chuyến đó là nguồn hoặc đích", () => {
  const ds: DeNghiGon[] = [
    { id: "s", tuChuyen: "a", denChuyen: "b", phamVi: "STOP", diemId: "d1", trangThai: "PENDING" },
    { id: "s2", tuChuyen: "a", denChuyen: "c", phamVi: "STOP", diemId: "d2", trangThai: "ESCALATED" },
    { id: "o", tuChuyen: "c", denChuyen: "b", phamVi: "ONBOARD", diemId: null, trangThai: "PENDING" },
    { id: "x", tuChuyen: "a", denChuyen: "b", phamVi: "STOP", diemId: "d1", trangThai: "CONFIRMED" },
  ];
  assert.deepEqual(deNghiHuyKhi({ diemId: "d1" }, ds), ["s"]);
  assert.deepEqual(deNghiHuyKhi({ chuyenId: "b" }, ds), ["s", "o"]);
  assert.deepEqual(deNghiHuyKhi({ chuyenId: "a" }, ds), ["s", "s2"]);
});

test("keHoachDiem: STOP ghép / thêm theo khoá nơi (cùng loại, còn Chờ); cứu hộ — suất đã lên lên ở nơi gặp MỚI; người đi kèm không điểm giữ không điểm", () => {
  const nguon = [
    { id: "a-sh", seq: 1, loai: "PICKUP" as const, trangThai: "DONE" as const, placeKey: "L:sh" },
    { id: "a-mt", seq: 4, loai: "PICKUP" as const, trangThai: "PENDING" as const, placeKey: "L:mt" },
    { id: "a-cang", seq: 5, loai: "DROPOFF" as const, trangThai: "PENDING" as const, placeKey: "L:cang" },
    { id: "a-ben", seq: 6, loai: "DROPOFF" as const, trangThai: "PENDING" as const, placeKey: "L:ben" },
  ];
  const dich = [
    { id: "b-ben", loai: "DROPOFF" as const, trangThai: "PENDING" as const, placeKey: "L:ben" },
    { id: "b-cang-xong", loai: "DROPOFF" as const, trangThai: "DONE" as const, placeKey: "L:cang" },
    { id: "b-mt-tra", loai: "DROPOFF" as const, trangThai: "PENDING" as const, placeKey: "L:mt" },
  ];
  const k = keHoachDiem({ suatChuyen: [suat("s1", { boardStopId: "a-mt", alightStopId: "a-cang" }), suat("s2", { boardStopId: "a-mt", alightStopId: "a-ben" })], diemNguon: nguon, diemDich: dich, noiGapPlaceKey: null });
  assert.deepEqual(k.them, [{ khoa: "moi:1", loai: "PICKUP", placeKey: "L:mt", noiGap: false }, { khoa: "moi:2", loai: "DROPOFF", placeKey: "L:cang", noiGap: false }]);
  assert.deepEqual(k.ghep, ["b-ben"]);
  assert.deepEqual(k.gan, [{ suatId: "s1", len: "moi:1", xuong: "moi:2" }, { suatId: "s2", len: "moi:1", xuong: "b-ben" }]);
  const crew = suat("c1", { loai: "CREW", legId: null, crewPartyId: "hdv", boardStopId: null, alightStopId: null, trangThai: "BOARDED" });
  const cuuHo = keHoachDiem({ suatChuyen: [suat("b1", { boardStopId: "a-sh", alightStopId: "a-cang", trangThai: "BOARDED" }), suat("w1", { boardStopId: "a-mt", alightStopId: "a-cang" }), crew], diemNguon: nguon, diemDich: dich, noiGapPlaceKey: "L:sh" });
  assert.deepEqual(cuuHo.them.map((t) => [t.loai, t.placeKey, t.noiGap]), [["PICKUP", "L:sh", true], ["PICKUP", "L:mt", false], ["DROPOFF", "L:cang", false]]);
  assert.deepEqual(cuuHo.gan.find((g) => g.suatId === "b1"), { suatId: "b1", len: "moi:1", xuong: "moi:3" });
  assert.deepEqual(cuuHo.gan.find((g) => g.suatId === "c1"), { suatId: "c1", len: null, xuong: null });
  assert.throws(() => keHoachDiem({ suatChuyen: [suat("b1", { trangThai: "BOARDED" })], diemNguon: nguon, diemDich: dich, noiGapPlaceKey: null }));
});

test("trangThaiLucDoc: PENDING quá hạn hiện 'Hết giờ chờ' mà không đổi CSDL; leo thang không hết hạn; mọi trạng thái có nhãn", () => {
  assert.equal(trangThaiLucDoc({ trangThai: "PENDING", guiLucMs: T0, phutCho: 10 }, T0 + 10 * PHUT - 1), "PENDING");
  assert.equal(trangThaiLucDoc({ trangThai: "PENDING", guiLucMs: T0, phutCho: 10 }, T0 + 10 * PHUT), "HET_GIO");
  assert.equal(trangThaiLucDoc({ trangThai: "ESCALATED", guiLucMs: T0, phutCho: 10 }, T0 + 99 * PHUT), "ESCALATED", "ADR-0052:61");
  for (const t of [...TRANG_THAI_DE_NGHI, "HET_GIO" as const]) assert.ok(NHAN_TRANG_THAI_DE_NGHI[t]);
});
