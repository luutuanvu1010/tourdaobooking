// Luật hiển thị THUẦN của "Xe đang chạy" (Vận chuyển Đợt 5, ADR-0052 D5; bản vẽ V11, V6 bổ sung) — src/shared/xe-dang-chay-man.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauCapNhatDiem, chipDiemChay, chonThemDiem, chuyenDangChay, diemMoiChuaXem, khachDangCho, suatCuaKhach, theCuuHo, theXeDangChay } from "./xe-dang-chay-man.ts";
import type { ChangLichDto, ChuyenTomTatDto, CuuHoResponse } from "./contracts.ts";
import type { DiemVao, SuatVao } from "./tien-do-man.ts";

const N = "2026-10-05";
const g = (gio: string) => ({ ngay: N, gio });
const diem = (id: string, thuTu: number, o: Partial<DiemVao> = {}): DiemVao => ({
  id, thuTu, loai: "PICKUP", tenNoi: `Nơi ${id}`, gioHen: g("09:10"), gioXeToi: null, trangThai: "PENDING", soNguoi: 2, daToi: null, ...o,
});
const suat = (id: string, diemLen: string, o: Partial<SuatVao> = {}): SuatVao => ({
  id, loai: "PASSENGER", maDon: "TD-1", diemLen, diemXuong: "z", trangThai: "WAITING", daDon: null, daTra: null, vanPhongBaoHuy: null, ...o,
});
const BH = { luc: g("09:02"), lyDoNhan: "Khách đổi kế hoạch" };

test("chipDiemChay: 'Mới thêm' (đỏ) cho điểm thêm khi chạy còn chờ; báo huỷ theo suất: hết → câu đủ, một phần → 'x/y khách …'; không còn khách chờ → không chip báo huỷ", () => {
  const d = [diem("a", 1, { themKhiChay: true })];
  assert.deepEqual(chipDiemChay(d[0]!, [suat("s1", "a")]), [{ nhan: "Mới thêm", tone: "danger" }]);
  assert.deepEqual(chipDiemChay(d[0]!, [suat("s1", "a", { vanPhongBaoHuy: BH }), suat("s2", "a")]), [
    { nhan: "Mới thêm", tone: "danger" },
    { nhan: "1/2 khách văn phòng đã báo huỷ — vẫn tới điểm", tone: "warn" },
  ]);
  assert.deepEqual(chipDiemChay(diem("b", 2), [suat("s1", "b", { vanPhongBaoHuy: BH }), suat("s2", "b", { vanPhongBaoHuy: BH })]), [
    { nhan: "Văn phòng đã báo huỷ — vẫn tới điểm", tone: "warn" },
  ]);
  assert.deepEqual(chipDiemChay(diem("b", 2), [suat("s1", "b", { vanPhongBaoHuy: BH, trangThai: "CANCELLED_AT_STOP" })]), [], "tài xế đã xác nhận huỷ → hết chip");
  assert.deepEqual(chipDiemChay(diem("c", 3, { themKhiChay: true, trangThai: "DONE" }), []), [], "điểm đã xong → không 'Mới thêm'");
  assert.deepEqual(chipDiemChay(diem("d", 4, { loai: "DROPOFF", themKhiChay: true }), []), [{ nhan: "Mới thêm", tone: "danger" }]);
});

test("khachDangCho: chỉ suất KHÁCH đang chờ, theo thứ tự điểm đón; tên che số dài, không tên → 'Khách N'; dòng đã báo huỷ có nhãn + câu 'vẫn chiếm chỗ'", () => {
  const d = [diem("b", 2, { tenNoi: "Bến Cầu Đá" }), diem("a", 1, { tenNoi: "Khách sạn A" })];
  const s = [
    suat("s3", "b", { hoTen: "Nguyễn Văn 0905123456" }),
    suat("s1", "a", { vanPhongBaoHuy: BH }),
    suat("s2", "a", { trangThai: "BOARDED" }),
    { ...suat("k", "a"), loai: "CREW" as const },
  ];
  const r = khachDangCho(s, d, N);
  assert.deepEqual(r.map((x) => x.suatId), ["s1", "s3"]);
  assert.equal(r[0]!.ten, "Khách 1");
  assert.equal(r[0]!.noiDon, "Điểm 1 · Khách sạn A · 09:10");
  assert.deepEqual(r[0]!.baoHuy, { nhan: "Văn phòng đã báo huỷ", phu: "Vẫn chiếm chỗ cho đến khi tài xế xác nhận · 09:02 · Khách đổi kế hoạch" });
  assert.equal(r[1]!.ten.includes("0905123456"), false, "che số dài trong tên");
  assert.equal(r[1]!.baoHuy, null);
  const cungDiem = khachDangCho([suat("y", "a", { hoTen: "Bình" }), suat("x", "a", { hoTen: "An" })], d, N);
  assert.deepEqual(cungDiem.map((x) => x.suatId), ["x", "y"], "cùng điểm, cùng đơn → theo tên (thứ tự ổn định giữa các lần tải)");
});

test("diemMoiChuaXem: điểm thêm khi chạy còn chờ, chưa xem → câu 'Điểm N · nơi · giờ · N khách' (giờ đón + TỔNG khách — lời chủ 5.3)", () => {
  const d = [diem("a", 4, { themKhiChay: true, tenNoi: "Bến Cầu Đá", soNguoi: 3 }), diem("b", 5, { themKhiChay: true, gioHen: null }), diem("c", 1), diem("e", 6, { themKhiChay: true, trangThai: "ARRIVED" })];
  assert.deepEqual(diemMoiChuaXem(d, new Set(["b"]), N), [{ id: "a", cau: "Điểm 4 · Bến Cầu Đá · 09:10 · 3 khách" }]);
  assert.deepEqual(diemMoiChuaXem(d, new Set(), N).map((x) => x.cau), ["Điểm 4 · Bến Cầu Đá · 09:10 · 3 khách", "Điểm 5 · Nơi b · 2 khách"]);
});

test("chuyenDangChay: chỉ chuyến RUNNING, theo giờ bắt đầu", () => {
  const c = (id: string, trangThai: ChuyenTomTatDto["trangThai"], batDauMs: number) => ({ id, trangThai, batDauMs }) as ChuyenTomTatDto;
  assert.deepEqual(chuyenDangChay({ chuyen: [c("x", "RUNNING", 3), c("y", "PLANNED", 1), c("z", "RUNNING", 2), c("w", "ENDED", 0)] }).map((x) => x.id), ["z", "x"]);
});

test("chonThemDiem: chặng chờ xếp → nhãn, điểm đón chỉ đọc, số khách tối đa = còn lại; chặng đã xếp hết không hiện", () => {
  const ch = (legId: string, o: Partial<ChangLichDto>) => ({ legId, maDon: "TD-9", tenDichVu: "Đưa đón sân bay", gioDon: "10:00", noiDon: "Khách sạn B", soNguoi: 3, soDaXep: 0, trangThai: "CHUA_XEP", nhan: [], datGap: false, ...o }) as ChangLichDto;
  const r = chonThemDiem({ chang: [ch("l1", {}), ch("l2", { soDaXep: 3, trangThai: "DA_XEP" }), ch("l3", { soDaXep: 1, nhan: ["XEP_MOT_PHAN"], datGap: true, gioDon: "09:00" })] });
  assert.deepEqual(r, [
    { legId: "l3", nhan: "TD-9 · Đưa đón sân bay", phu: "09:00 · còn 2 người · đặt gấp", noiDon: "Khách sạn B · 09:00", conLai: 2, datGap: true },
    { legId: "l1", nhan: "TD-9 · Đưa đón sân bay", phu: "10:00 · còn 3 người", noiDon: "Khách sạn B · 10:00", conLai: 3, datGap: false },
  ]);
});

test("cauCapNhatDiem: xe đang chạy → 'Đã cập nhật N · bỏ qua M khách đã lên xe / điểm đã tới'; chuyến chưa chạy giữ câu cũ", () => {
  assert.deepEqual(cauCapNhatDiem({ daCapNhat: 2, boQua: 1 }, true), { tone: "ok", tieuDe: "Đã cập nhật 2 · bỏ qua 1 khách đã lên xe / điểm đã tới", dong: ["Chỉ dời khách còn chờ ở điểm xe chưa tới. Tài xế nhận tin ngay."] });
  assert.deepEqual(cauCapNhatDiem({ daCapNhat: 0, boQua: 0 }, true), { tone: "info", tieuDe: "Không có điểm nào cần cập nhật", dong: ["Khách còn chờ đã khớp nơi đón / trả của đơn."] });
  assert.deepEqual(cauCapNhatDiem({ daCapNhat: 0, boQua: 2 }, true).tieuDe, "Đã cập nhật 0 · bỏ qua 2 khách đã lên xe / điểm đã tới");
  assert.equal(cauCapNhatDiem({ daCapNhat: 1 }, false).tieuDe, "Đã cập nhật điểm theo đơn");
  assert.equal(cauCapNhatDiem({ daCapNhat: 0 }, false).tieuDe, "Không có điểm nào cần cập nhật");
});

test("theXeDangChay: 'mã · biển số · x/y chỗ' + tài xế, giờ xuất bến, điểm kế tiếp (điểm chưa tới đầu tiên); hết điểm chờ → 'đã tới mọi điểm'", () => {
  const c = {
    ma: "CX-01", xe: { bienSo: "79B-123.45", soCho: 16 }, tai: 7, taiXe: { ten: "Anh Tư" }, ngayChay: N,
    xuatBen: { gioXayRa: g("08:05") },
    diem: [{ thuTu: 2, tenNoi: "Bến Cầu Đá", trangThai: "PENDING" }, { thuTu: 1, tenNoi: "Khách sạn A", trangThai: "DONE" }],
  } as unknown as ChuyenTomTatDto;
  assert.deepEqual(theXeDangChay(c, N), { tieuDe: "CX-01", dong: "79B-123.45 · 7/16 chỗ", phu: "Anh Tư · xuất bến 08:05 · tiếp theo: Bến Cầu Đá" });
  const het = { ...c, taiXe: null, xuatBen: null, diem: [{ thuTu: 1, tenNoi: "A", trangThai: "DONE" }] } as unknown as ChuyenTomTatDto;
  assert.equal(theXeDangChay(het, N).phu, "Chưa có tài xế · đã tới mọi điểm");
});

test("theCuuHo (CH.2 bản đơn giản, lời chủ 5.2b): tiêu đề 'Cứu hộ <mã> · N khách cần chuyển'; chặng 'nơi · giờ · N khách · đặt gấp' theo giờ (chưa có giờ đứng cuối); xe '<mã> · tài xế' + 'Đang chạy / Chưa chạy · còn N chỗ · tiếp theo: X'; xe còn chỗ trước, trong đó xe đang chạy trước; xe hết chỗ đứng cuối", () => {
  const r: CuuHoResponse = {
    chuyenHong: { id: "t0", ma: "CX-07", ngay: N, soKhachCanChuyen: 5 },
    changChoXep: [
      { legId: "l2", soNguoi: 2, noiDon: "Khách sạn B", gioHen: "10:30", datGap: true },
      { legId: "l1", soNguoi: 3, noiDon: "Khách sạn A", gioHen: null, datGap: false },
    ],
    xeNhan: [
      { tripId: "t2", maChuyen: "CX-09", trangThai: "PLANNED", tenTaiXe: "Minh Khoa", choTrong: 0, diemSapToi: null, version: 1 },
      { tripId: "t1", maChuyen: "CX-08", trangThai: "RUNNING", tenTaiXe: "Quốc Bảo", choTrong: 8, diemSapToi: "Bến Cầu Đá", version: 4 },
      { tripId: "t3", maChuyen: "CX-10", trangThai: "PLANNED", tenTaiXe: "Hải", choTrong: 9, diemSapToi: "Khách sạn C", version: 2 },
    ],
  };
  assert.deepEqual(theCuuHo(r), {
    tieuDe: "Cứu hộ CX-07 · 5 khách cần chuyển",
    chang: ["Khách sạn B · 10:30 · 2 khách · đặt gấp", "Khách sạn A · 3 khách"],
    xe: [
      { tripId: "t1", nhan: "CX-08 · Quốc Bảo", phu: "Đang chạy · còn 8 chỗ · tiếp theo: Bến Cầu Đá" },
      { tripId: "t3", nhan: "CX-10 · Hải", phu: "Chưa chạy · còn 9 chỗ · tiếp theo: Khách sạn C" },
      { tripId: "t2", nhan: "CX-09 · Minh Khoa", phu: "Chưa chạy · hết chỗ" },
    ],
  });
  const rong = theCuuHo({ ...r, chuyenHong: { ...r.chuyenHong, soKhachCanChuyen: 0 }, changChoXep: [], xeNhan: [] });
  assert.equal(rong.tieuDe, "Cứu hộ CX-07 · không còn khách cần chuyển");
});

test("suatCuaKhach (V6 6.3 — D5b): chỉ trong ngày chạy và khi còn suất thiếu tên; 'Suất N · Điểm M · nơi', theo thứ tự điểm lên; KHÔNG trả tên; suất đã xong / người đi kèm không tính", () => {
  const d = [{ id: "p1", thuTu: 1, tenNoi: "Khách sạn A" }, { id: "p2", thuTu: 2, tenNoi: "Khách sạn B" }];
  const s = (id: string, diemLen: string, o: Record<string, unknown> = {}) => ({ id, loai: "PASSENGER", diemLen, trangThai: "WAITING", ...o });
  const suat = [s("a3", "p2"), s("a1", "p1", { hoTen: "Khách Có Tên", namSinh: 1990 }), s("a2", "p1"), s("a4", "p1", { trangThai: "DROPPED" }), { id: "c1", loai: "CREW", diemLen: null, trangThai: "WAITING" }];
  const r = suatCuaKhach({ trongNgayChay: true, diem: d, suat } as never);
  assert.deepEqual(r, {
    thieu: 2,
    dong: [
      { suatId: "a1", nhan: "Suất 1 · Điểm 1 · Khách sạn A", coTen: true },
      { suatId: "a2", nhan: "Suất 2 · Điểm 1 · Khách sạn A", coTen: false },
      { suatId: "a3", nhan: "Suất 3 · Điểm 2 · Khách sạn B", coTen: false },
    ],
  });
  assert.doesNotMatch(JSON.stringify(r), /Khách Có Tên|1990/);
  assert.equal(suatCuaKhach({ trongNgayChay: false, diem: d, suat } as never), null, "ngoài ngày chạy: không có tên để so — ẩn");
  assert.equal(suatCuaKhach({ trongNgayChay: true, diem: d, suat: [suat[1]] } as never), null, "đủ tên — ẩn");
});
