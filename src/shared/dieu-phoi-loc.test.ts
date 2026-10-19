// C3 (đánh giá ERP 7/10: C32–C37) — luật thuần của bảng điều phối: src/shared/dieu-phoi-loc.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CA_DON, LOC_TRONG, NOI_TRA_CHUA_CHOT, TOI_DA_CHANG_MOT_LAN, canHienDoan, canhBaoGioHenSauXep, caCuaGio, cauDoan, cauTongKhachGhe, chuanHoaBoLoc, dangLoc, doanTaiDiem, doiChon,
  giuChonConHieuLuc, locChangChuaXep, luaChonChuyenXep, mucTai, noiTraCuaCot, tongKhachGhe, tyLeTai,
} from "./dieu-phoi-loc.ts";
import { gioHenNgoaiKhung } from "./dieu-phoi-lich-chung.ts";
import type { ChangLichDto, ChuyenTomTatDto, LichChungResponse } from "./contracts.ts";
import { vnLocalToMs } from "./vn-date.ts";

const NGAY = "2026-10-20";
const ms = (gio: string, ngay = NGAY) => vnLocalToMs(ngay, gio)!;
const g = (gio: string, ngay = NGAY) => ({ ngay, gio });
const chang = (o: Partial<ChangLichDto> = {}): ChangLichDto => ({
  legId: "l1", orderId: "o1", maDon: "TD-1", tenDichVu: "Tour", chieu: "OUT", ngayDon: NGAY, gioDon: "10:15", noiDon: "Sunrise Nha Trang", noiTra: "Ga cáp treo Vinpearl", soNguoi: 4,
  soNguoiCoTen: 4, soHieuChuyenBay: null, xeRieng: false, choToiThieu: null, datGap: false, trangThai: "CHUA_XEP", trangThaiNhan: "Chưa xếp", nhan: [], soDaXep: 0, soDaDon: 0, soDaTra: 0, soVang: 0, soKhachHuy: 0, chuyen: [], ...o,
});
const chuyen = (o: Partial<ChuyenTomTatDto> = {}): ChuyenTomTatDto => ({
  id: "t1", ma: "CX-2010-01", trangThai: "PLANNED", trangThaiNhan: "Lên kế hoạch", version: 1, ngayChay: NGAY, batDau: g("09:00"), ketThuc: g("11:00"), batDauMs: ms("09:00"), ketThucMs: ms("11:00"),
  xe: { id: "x1", bienSo: "79B-123.45", soCho: 15, chuXe: "Tour Đảo", chuLaCongTy: true }, taiXe: { partyId: "p1", ten: "Nguyễn Văn An", loai: "CONG_TY" }, tai: 3, lyDoGiu: [],
  khoaMoc: { dangKhoa: false, tuLuc: g("03:00"), tuLucMs: ms("03:00") }, xuatBen: null, ketThucThat: null, diem: [], khanCap: false, coKhachDonHuy: false, ...o,
});
const lich = (o: Partial<LichChungResponse> = {}): LichChungResponse => ({
  ngay: NGAY, mocToiThieuPhut: 360, canhBaoPhut: 120, chang: [], chuyen: [], soNhap: 0, nhapChoDatGap: [], canhBao: [], lyDo: [], xe: [], taiXe: [], khungBanXe: [], ...o,
});
const x = (c: ChangLichDto) => ({ chang: c, conLai: c.soNguoi - c.soDaXep });

test("C34: doiChon bật / tắt một chặng; đủ giới hạn thì giữ nguyên và báo vượt (không lặng lẽ bỏ)", () => {
  const a = doiChon(new Set(), "l1");
  assert.deepEqual([...a.chon], ["l1"]);
  assert.equal(a.vuotGioiHan, false);
  assert.deepEqual([...doiChon(a.chon, "l1").chon], [], "bấm lần hai = bỏ chọn");
  const day = new Set(Array.from({ length: TOI_DA_CHANG_MOT_LAN }, (_x, i) => `l${i}`));
  const them = doiChon(day, "moi");
  assert.equal(them.vuotGioiHan, true);
  assert.equal(them.chon.size, TOI_DA_CHANG_MOT_LAN);
  assert.ok(!them.chon.has("moi"));
  assert.equal(doiChon(day, "l3").chon.size, TOI_DA_CHANG_MOT_LAN - 1, "bỏ chọn khi đang đầy vẫn được");
  assert.equal(TOI_DA_CHANG_MOT_LAN, 50, "bằng giới hạn của máy chủ (docXep)");
});

test("C36: giuChonConHieuLuc — chặng vừa được xếp / bỏ / huỷ rời lựa chọn sau khi tải lại; chặng xếp một phần vẫn còn", () => {
  const L = lich({ chang: [chang({ legId: "a" }), chang({ legId: "b", trangThai: "DA_XEP", soDaXep: 4 }), chang({ legId: "c", trangThai: "DA_XEP", soDaXep: 1, nhan: ["XEP_MOT_PHAN"] }), chang({ legId: "d", trangThai: "DA_BO" })] });
  assert.deepEqual([...giuChonConHieuLuc(new Set(["a", "b", "c", "d", "ma"]), L)].sort(), ["a", "c"]);
});

test("C35: caCuaGio — sáng < 12:00, chiều 12:00–17:59, tối từ 18:00, không giờ → chưa chốt", () => {
  assert.deepEqual(["00:00", "11:59", "12:00", "17:59", "18:00", "23:59"].map(caCuaGio), ["SANG", "SANG", "CHIEU", "CHIEU", "TOI", "TOI"]);
  assert.equal(caCuaGio(null), "CHUA_CHOT");
  assert.equal(caCuaGio("sáng"), "CHUA_CHOT");
  assert.deepEqual(CA_DON.map((c) => c.ma), ["SANG", "CHIEU", "TOI", "CHUA_CHOT"]);
});

test("C35: locChangChuaXep — theo ca, chiều, nơi trả (VÀ); bộ trống giữ nguyên; thứ tự đầu vào được giữ", () => {
  const ds = [
    x(chang({ legId: "a", gioDon: "07:30", chieu: "OUT", noiTra: "Cảng A" })),
    x(chang({ legId: "b", gioDon: "13:00", chieu: "RETURN", noiTra: "Khách sạn B" })),
    x(chang({ legId: "c", gioDon: "19:00", chieu: "RETURN", noiTra: "Khách sạn B" })),
    x(chang({ legId: "d", gioDon: null, chieu: "OUT", noiTra: null })),
  ];
  const ids = (b: Partial<typeof LOC_TRONG>) => locChangChuaXep(ds, { ...LOC_TRONG, ...b }).map((v) => v.chang.legId);
  assert.deepEqual(ids({}), ["a", "b", "c", "d"]);
  assert.deepEqual(ids({ ca: "SANG" }), ["a"]);
  assert.deepEqual(ids({ ca: "CHUA_CHOT" }), ["d"]);
  assert.deepEqual(ids({ chieu: "RETURN" }), ["b", "c"]);
  assert.deepEqual(ids({ noiTra: "Khách sạn B" }), ["b", "c"]);
  assert.deepEqual(ids({ noiTra: NOI_TRA_CHUA_CHOT }), ["d"]);
  assert.deepEqual(ids({ chieu: "RETURN", ca: "TOI", noiTra: "Khách sạn B" }), ["c"]);
  assert.deepEqual(ids({ chieu: "OUT", ca: "TOI" }), []);
  assert.equal(dangLoc(LOC_TRONG), false);
  assert.equal(dangLoc({ ...LOC_TRONG, ca: "SANG" }), true);
});

test("C35: noiTraCuaCot — nơi trả khác nhau theo chữ tiếng Việt, thêm 'Nơi trả chưa chốt' khi có chặng chưa có nơi trả; chuanHoaBoLoc bỏ nơi trả đã hết chặng", () => {
  const ds = [x(chang({ legId: "a", noiTra: "Đảo Khỉ" })), x(chang({ legId: "b", noiTra: "Cảng Cầu Đá" })), x(chang({ legId: "c", noiTra: "Đảo Khỉ" })), x(chang({ legId: "d", noiTra: null }))];
  assert.deepEqual(noiTraCuaCot(ds), [{ ma: "Cảng Cầu Đá", nhan: "Cảng Cầu Đá" }, { ma: "Đảo Khỉ", nhan: "Đảo Khỉ" }, { ma: NOI_TRA_CHUA_CHOT, nhan: "Nơi trả chưa chốt" }]);
  assert.deepEqual(noiTraCuaCot([]), []);
  assert.deepEqual(chuanHoaBoLoc({ ...LOC_TRONG, noiTra: "Đảo Khỉ", ca: "SANG" }, ds), { ...LOC_TRONG, noiTra: "Đảo Khỉ", ca: "SANG" });
  assert.deepEqual(chuanHoaBoLoc({ ...LOC_TRONG, noiTra: "Đảo Khỉ", ca: "SANG" }, [ds[1]!]), { ...LOC_TRONG, noiTra: "", ca: "SANG" });
});

test("C37: tongKhachGhe — khách còn phải xếp (kể cả xếp một phần) và ghế trống CHỈ trên chuyến chưa chạy; câu nói rõ", () => {
  const L = lich({
    chang: [chang({ legId: "a", soNguoi: 4 }), chang({ legId: "b", soNguoi: 5, soDaXep: 2, trangThai: "DA_XEP", nhan: ["XEP_MOT_PHAN"] }), chang({ legId: "c", trangThai: "DA_XEP", soDaXep: 4 })],
    chuyen: [chuyen({ id: "t1", tai: 3 }), chuyen({ id: "t2", tai: 15 }), chuyen({ id: "t3", tai: 0, trangThai: "RUNNING" }), chuyen({ id: "t4", tai: 20 }), chuyen({ id: "t5", trangThai: "CANCELLED" })],
  });
  const t = tongKhachGhe(L);
  assert.deepEqual(t, { khachChuaXep: 7, gheTrong: 12 + 0 + 0, soChuyen: 3 });
  assert.equal(cauTongKhachGhe(t), "7 khách chưa xếp · 12 ghế trống ở 3 chuyến chưa chạy");
  assert.equal(cauTongKhachGhe(tongKhachGhe(lich({ chang: [chang()] }))), "4 khách chưa xếp · chưa có chuyến nào để xếp");
  assert.equal(cauTongKhachGhe(tongKhachGhe(lich())), "0 khách chưa xếp · chưa có chuyến nào để xếp");
});

test("mức tải: trống, thoáng, gần đầy (≥ 80%), đầy, quá tải; tỷ lệ kẹp 0..1", () => {
  assert.deepEqual([[0, 15], [1, 15], [11, 15], [12, 15], [14, 15], [15, 15], [16, 15], [3, 0], [0, 0]].map(([a, b]) => mucTai(a!, b!)), ["TRONG", "THOANG", "THOANG", "GAN_DAY", "GAN_DAY", "DAY", "VUOT", "VUOT", "TRONG"]);
  assert.deepEqual([[0, 15], [3, 15], [15, 15], [20, 15], [2, 0]].map(([a, b]) => tyLeTai(a!, b!)), [0, 0.2, 1, 1, 1]);
});

test("C32: gioHenNgoaiKhung — sớm hơn bắt đầu hoặc muộn hơn kết thúc; đúng biên là trong khung", () => {
  assert.equal(gioHenNgoaiKhung(ms("08:59"), ms("09:00"), ms("11:00")), true);
  assert.equal(gioHenNgoaiKhung(ms("09:00"), ms("09:00"), ms("11:00")), false);
  assert.equal(gioHenNgoaiKhung(ms("11:00"), ms("09:00"), ms("11:00")), false);
  assert.equal(gioHenNgoaiKhung(ms("11:01"), ms("09:00"), ms("11:00")), true);
});

test("C32: luaChonChuyenXep — chuyến hợp trước (theo giờ xuất bến), rồi chuyến lệch khung giờ, rồi chuyến đầy; ghi chú nói rõ; chuyến đang chạy / huỷ không có mặt", () => {
  const L = lich({
    chuyen: [
      chuyen({ id: "sang", ma: "CX-S", batDau: g("07:50"), ketThuc: g("09:00"), batDauMs: ms("07:50"), ketThucMs: ms("09:00"), tai: 2 }),
      chuyen({ id: "day", ma: "CX-D", batDau: g("14:00"), ketThuc: g("16:00"), batDauMs: ms("14:00"), ketThucMs: ms("16:00"), tai: 15 }),
      chuyen({ id: "hop", ma: "CX-H", batDau: g("14:30"), ketThuc: g("16:30"), batDauMs: ms("14:30"), ketThucMs: ms("16:30"), tai: 4 }),
      chuyen({ id: "chay", trangThai: "RUNNING" }),
      chuyen({ id: "huy", trangThai: "CANCELLED" }),
      chuyen({ id: "khoa", ma: "CX-K", batDau: g("15:00"), ketThuc: g("17:00"), batDauMs: ms("15:00"), ketThucMs: ms("17:00"), tai: 0, khoaMoc: { dangKhoa: true, tuLuc: g("09:00"), tuLucMs: ms("09:00") } }),
    ],
  });
  // Chặng 15:00 (C32: "chặng 15:00 xếp được vào chuyến 07:50–09:00; hộp chọn liệt kê cả chuyến đầy").
  const ra = luaChonChuyenXep(L, [{ chang: chang({ gioDon: "15:00" }), soKhach: 4 }]);
  assert.deepEqual(ra.map((v) => v.chuyen.id), ["hop", "khoa", "sang", "day"]);
  assert.deepEqual(ra.map((v) => [v.day, v.lechGio, v.mo]), [[false, false, false], [false, false, false], [false, true, true], [true, false, true]]);
  assert.deepEqual(ra.map((v) => v.ghiChu), [[], ["đang khoá"], ["giờ hẹn ngoài khung giờ chuyến"], ["đầy"]]);
  assert.deepEqual(ra.map((v) => v.conCho), [11, 15, 13, 0]);
  assert.ok(ra[0]!.nhan.startsWith("CX-H · 14:30–16:30"), "nhãn vẫn là nhãn của chuyenXepDuoc");
});

test("C32: luaChonChuyenXep — chỗ còn ít hơn số khách → 'chỉ còn N chỗ' (vẫn chọn được: tách đoàn); nhiều chặng → đếm chặng lệch giờ; vừa đầy vừa lệch giờ xếp cuối", () => {
  const L = lich({
    chuyen: [
      chuyen({ id: "a", ma: "CX-A", batDau: g("07:00"), ketThuc: g("09:00"), batDauMs: ms("07:00"), ketThucMs: ms("09:00"), tai: 13 }),
      chuyen({ id: "b", ma: "CX-B", batDau: g("10:00"), ketThuc: g("12:00"), batDauMs: ms("10:00"), ketThucMs: ms("12:00"), tai: 0 }),
    ],
  });
  const doi = [{ chang: chang({ legId: "1", gioDon: "08:00" }), soKhach: 2 }, { chang: chang({ legId: "2", gioDon: "11:00" }), soKhach: 2 }];
  const ra = luaChonChuyenXep(L, doi);
  assert.deepEqual(ra.map((v) => v.chuyen.id), ["b", "a"], "B: chặng 1 lệch (08:00 ngoài 10–12) nhưng chỉ lệch giờ; A: vừa đầy (4 > 2) vừa lệch");
  assert.deepEqual(ra[0]!.ghiChu, ["1/2 lượt có giờ hẹn ngoài khung giờ chuyến"]);
  assert.deepEqual(ra[1]!.ghiChu, ["chỉ còn 2 chỗ", "1/2 lượt có giờ hẹn ngoài khung giờ chuyến"]);
  // Chặng chưa chốt giờ: không lệch (chưa có giờ để so).
  assert.equal(luaChonChuyenXep(L, [{ chang: chang({ gioDon: null }), soKhach: 1 }]).every((v) => !v.lechGio), true);
  // Không chặng nào: chỉ theo giờ xuất bến.
  assert.deepEqual(luaChonChuyenXep(L, []).map((v) => v.chuyen.id), ["a", "b"]);
});

test("C32: canhBaoGioHenSauXep — chỉ cảnh báo 'giờ hẹn ngoài khung' của chặng VỪA xếp (bỏ cảnh báo cũ của đoàn khác), mỗi câu kèm mã đơn, không lặp", () => {
  const cb = [
    { loai: "GIO_HEN_NGOAI_CHUYEN", nhan: "Giờ hẹn nằm ngoài khung giờ chuyến", legId: "l1", maDon: "DH-1" },
    { loai: "GIO_HEN_NGOAI_CHUYEN", nhan: "Giờ hẹn nằm ngoài khung giờ chuyến", legId: "l1", maDon: "DH-1" },
    { loai: "GIO_HEN_NGOAI_CHUYEN", nhan: "Giờ hẹn nằm ngoài khung giờ chuyến", legId: "cu", maDon: "DH-9" },
    { loai: "THIEU_SUAT", nhan: "Chặng chưa xếp đủ", legId: "l1", maDon: "DH-1" },
    { loai: "GIO_HEN_NGOAI_CHUYEN", nhan: "Giờ hẹn nằm ngoài khung giờ chuyến", legId: null, maDon: null },
  ];
  assert.deepEqual(canhBaoGioHenSauXep(cb, ["l1", "l2"]), ["Giờ hẹn nằm ngoài khung giờ chuyến: DH-1"]);
  assert.deepEqual(canhBaoGioHenSauXep([], ["l1"]), []);
});

test("C33: doanTaiDiem — mỗi chặng một đoàn tại điểm đón, sắp theo giờ hẹn (chưa chốt cuối), bỏ suất huỷ tại điểm / người đi kèm / điểm khác; canHienDoan từ hai đoàn", () => {
  const s = (o: Record<string, unknown>) => ({ loai: "PASSENGER" as const, legId: "l1", maDon: "DH-1", gioHen: g("08:20"), diemLen: "d1", trangThai: "WAITING" as const, ...o });
  const ds = doanTaiDiem("d1", [
    s({}), s({}), s({}),
    s({ legId: "l2", maDon: "DH-2", gioHen: g("07:50") }), s({ legId: "l2", maDon: "DH-2", gioHen: g("07:50"), trangThai: "CANCELLED_AT_STOP" }),
    s({ legId: "l3", maDon: "DH-3", gioHen: null }),
    s({ legId: "l4", maDon: "DH-4", diemLen: "d2" }),
    s({ loai: "CREW", legId: null, maDon: null }),
  ]);
  assert.deepEqual(ds.map((d) => [d.maDon, d.soNguoi]), [["DH-2", 1], ["DH-1", 3], ["DH-3", 1]]);
  assert.equal(canHienDoan(ds), true);
  assert.equal(canHienDoan(ds.slice(0, 1)), false);
  assert.equal(canHienDoan([]), false);
  assert.equal(cauDoan(ds[1]!, NGAY), "DH-1 · hẹn 08:20 · 3 khách");
  assert.equal(cauDoan(ds[2]!, NGAY), "DH-3 · chưa chốt giờ hẹn · 1 khách");
  assert.equal(cauDoan({ legId: "z", maDon: "DH-5", gioHen: g("07:00", "2026-10-21"), soNguoi: 2 }, NGAY), "DH-5 · hẹn 07:00 21/10 · 2 khách");
});
