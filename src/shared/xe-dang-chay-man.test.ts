// Luật hiển thị THUẦN của "Xe đang chạy" (Vận chuyển Đợt 5, ADR-0052 D5; bản vẽ V11, V6 bổ sung) — src/shared/xe-dang-chay-man.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cauCapNhatDiem, chipDiemChay, chonThemDiem, chuyenDangChay, demNguoc, diemMoiChuaXem, dongDeNghiVanPhong, dongXeNhan, hopDuyetDeNghi, khachDangCho, nhacXeDangChay, nhoDonDuoc, suatCuaKhach, theCuuHo,
  theGuiDi, theGuiToi, theXeDangChay,
} from "./xe-dang-chay-man.ts";
import { CAU_NHAC_XE_DANG_CHAY } from "./dong-bo-chuyen.ts";
import type { ChangLichDto, ChuyenTomTatDto, CuuHoResponse, DeNghiDto } from "./contracts.ts";
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

test("ADR-0104 Đ2.7 (T2.16): dòng nhắc trên thẻ xe đang chạy = ĐÚNG câu cố định của máy khi chuyến có khách chờ đón của đơn huỷ; không thì không dòng", () => {
  const c = (o: Partial<ChuyenTomTatDto>) => ({ trangThai: "RUNNING", coKhachDonHuy: false, ...o }) as unknown as ChuyenTomTatDto;
  assert.equal(nhacXeDangChay(c({ coKhachDonHuy: true })), CAU_NHAC_XE_DANG_CHAY);
  assert.equal(nhacXeDangChay(c({})), null);
  assert.equal(nhacXeDangChay(c({ coKhachDonHuy: true, trangThai: "ENDED" })), null, "chỉ xe đang chạy");
  assert.equal(CAU_NHAC_XE_DANG_CHAY, "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ");
});

// ---- Chuyển khách giữa hai xe (ADR-0111, ADR-0052 D4; bản vẽ V8, V9, V10 — gói A5 T13 / T14) ----------------------------------------------------------------
const deNghi = (o: Partial<DeNghiDto> = {}): DeNghiDto => ({
  id: "dn-1", tuChuyenId: "A", tuMaChuyen: "CX-A", denChuyenId: "B", denMaChuyen: "CX-B", phamVi: "STOP", soKhach: 3, diemId: "d-1", tenDiem: "Khách sạn Dò Tìm",
  noiGap: null, trangThai: "PENDING", nhanTrangThai: "Đang chờ trả lời", guiLuc: "2026-10-05T01:00:00.000Z", hanLuc: "2026-10-05T01:10:00.000Z", quyetLuc: null, lyDo: null, ...o,
});
const MS0 = Date.parse("2026-10-05T01:00:00.000Z");

test("demNguoc: phút:giây còn lại tới hạn máy chủ gửi; hết hạn → null (không đếm âm)", () => {
  assert.equal(demNguoc("2026-10-05T01:10:00.000Z", MS0), "10:00");
  assert.equal(demNguoc("2026-10-05T01:10:00.000Z", MS0 + 9 * 60_000 + 58_500), "00:02", "làm tròn LÊN giây còn lại");
  assert.equal(demNguoc("2026-10-05T01:10:00.000Z", MS0 + 10 * 60_000), null);
  assert.equal(demNguoc("2026-10-05T01:10:00.000Z", MS0 + 11 * 60_000), null);
});

test("nhoDonDuoc (V8 1): chỉ xe ĐANG CHẠY, điểm ĐÓN CHƯA TỚI, có khách và mọi suất mở ở điểm là khách CHỜ (khớp luật gửi của máy chủ)", () => {
  const d = diem("d-1", 1);
  const ss = [suat("s1", "d-1"), suat("s2", "d-1")];
  assert.equal(nhoDonDuoc("RUNNING", d, ss), true);
  assert.equal(nhoDonDuoc("PLANNED", d, ss), false, "chưa xuất bến");
  assert.equal(nhoDonDuoc("RUNNING", { ...d, trangThai: "ARRIVED" }, ss), false, "đã tới");
  assert.equal(nhoDonDuoc("RUNNING", { ...d, loai: "DROPOFF" }, ss), false, "điểm trả");
  assert.equal(nhoDonDuoc("RUNNING", d, []), false, "không khách");
  assert.equal(nhoDonDuoc("RUNNING", d, [suat("s1", "d-1"), suat("s2", "d-1", { trangThai: "BOARDED" })]), false, "có khách đã lên ở điểm");
  assert.equal(nhoDonDuoc("RUNNING", d, [suat("s1", "d-1"), suat("s9", "d-9")]), true, "suất điểm khác không xét");
});

test("theGuiDi (V8 4, 5): Chờ → đếm ngược + Rút lại; Hết giờ / Hết hạn / Không nhận / Văn phòng không duyệt → 'Nhờ xe khác đón' lại; Đã nhận; Chờ duyệt KHÔNG rút (máy chủ chặn); chữ không mã thô", () => {
  const cho = theGuiDi(deNghi());
  assert.deepEqual([cho.tieuDe, cho.tone, cho.demNguoc, cho.coRut, cho.coNhoLai], ["Đang chờ CX-B nhận", "info", true, true, false]);
  assert.deepEqual(cho.dong, [["Điểm đón", "Khách sạn Dò Tìm"], ["Số khách", "3"]]);
  assert.deepEqual(theGuiDi(deNghi({ phamVi: "ONBOARD", diemId: null, tenDiem: null, noiGap: "Cây xăng" })).dong, [["Nơi gặp", "Cây xăng"], ["Số khách", "3"]]);
  for (const tt of ["HET_GIO", "EXPIRED"] as const) {
    const x = theGuiDi(deNghi({ trangThai: tt }));
    assert.deepEqual([x.tieuDe, x.coRut, x.coNhoLai, x.demNguoc], ["Đề nghị đã hết hạn", false, true, false], tt);
  }
  const khong = theGuiDi(deNghi({ trangThai: "DECLINED", lyDo: "Không kịp giờ" }));
  assert.deepEqual([khong.tieuDe, khong.tone, khong.coNhoLai], ["CX-B không nhận", "bad", true]);
  assert.match(khong.cau!, /Lý do: Không kịp giờ\. Điểm vẫn thuộc chuyến của bạn\./);
  const nhan = theGuiDi(deNghi({ trangThai: "CONFIRMED" }));
  assert.deepEqual([nhan.tieuDe, nhan.tone, nhan.coRut, nhan.coNhoLai], ["CX-B đã nhận", "ok", false, false]);
  const leo = theGuiDi(deNghi({ trangThai: "ESCALATED" }));
  assert.deepEqual([leo.tieuDe, leo.tone, leo.coRut], ["Chờ văn phòng duyệt", "warn", false]);
  assert.equal(theGuiDi(deNghi({ trangThai: "REJECTED", lyDo: "Khác" })).coNhoLai, true);
  assert.equal(theGuiDi(deNghi({ trangThai: "VOID" })).tieuDe, "Đề nghị đã tự huỷ");
  assert.equal(theGuiDi(deNghi({ trangThai: "WITHDRAWN" })).tieuDe, "Đã rút đề nghị");
  for (const tt of ["PENDING", "HET_GIO", "WITHDRAWN", "DECLINED", "EXPIRED", "VOID", "CONFIRMED", "ESCALATED", "REJECTED"] as const) {
    const x = theGuiDi(deNghi({ trangThai: tt, lyDo: "Khác" }));
    assert.doesNotMatch(JSON.stringify([x.tieuDe, x.cau ?? "", x.dong]), /PENDING|ESCALATED|CONFIRMED|VOID|STOP|ONBOARD|null|undefined/, tt);
  }
});

test("theGuiToi (V9 1, 3): Chờ (chưa quá hạn) → Nhận / Không nhận + đếm ngược; mọi trạng thái khác KHÔNG có nút; chữ không mã thô", () => {
  const cho = theGuiToi(deNghi());
  assert.deepEqual([cho.tieuDe, cho.coNhan, cho.demNguoc], ["Đề nghị gửi tới bạn", true, true]);
  assert.deepEqual(cho.dong, [["Chuyến nhờ", "CX-A"], ["Điểm đón", "Khách sạn Dò Tìm"], ["Số khách", "3"]]);
  assert.equal(theGuiToi(deNghi({ trangThai: "HET_GIO" })).coNhan, false, "quá hạn: lần bấm sẽ ghi Hết hạn — không mời bấm");
  const nhan = theGuiToi(deNghi({ trangThai: "CONFIRMED" }));
  assert.deepEqual([nhan.tieuDe, nhan.tone], ["Đã nhận — khách đã vào chuyến của bạn", "ok"]);
  assert.equal(theGuiToi(deNghi({ trangThai: "ESCALATED" })).tieuDe, "Chờ văn phòng duyệt");
  for (const tt of ["PENDING", "HET_GIO", "WITHDRAWN", "DECLINED", "EXPIRED", "VOID", "CONFIRMED", "ESCALATED", "REJECTED"] as const) {
    const x = theGuiToi(deNghi({ trangThai: tt, lyDo: "Khác" }));
    if (tt !== "PENDING") assert.equal(x.coNhan, false, tt);
    assert.doesNotMatch(JSON.stringify([x.tieuDe, x.cau ?? "", x.dong]), /PENDING|ESCALATED|CONFIRMED|VOID|STOP|ONBOARD|null|undefined/, tt);
  }
});

test("dongXeNhan (V8 2): mã chuyến · tài xế, điểm sắp tới, chỗ trống; thiếu chỗ cho số khách → khoá chọn", () => {
  const x = { tripId: "B", maChuyen: "CX-B", tenTaiXe: "Tài Xế Hai", choTrong: 6, diemSapToi: "Chợ Đầm" };
  assert.deepEqual(dongXeNhan(x, 3), { nhan: "CX-B · Tài Xế Hai", phu: "Sắp tới: Chợ Đầm", cho: "Còn 6 chỗ", du: true });
  assert.deepEqual(dongXeNhan({ ...x, choTrong: 2, diemSapToi: null }, 3), { nhan: "CX-B · Tài Xế Hai", phu: "Chưa có điểm sắp tới", cho: "Còn 2 chỗ", du: false });
});

test("hopDuyetDeNghi (V10): Leo thang + hộp DUYET_HOAC_BAC → Duyệt và Bác; CHI_BAC → chỉ Bác + câu vì sao; trạng thái khác → không nút; dòng kiểm không đạt / cảnh báo đứng đầu", () => {
  const kiem = [
    { ma: "SUC_CHUA_DICH", nhan: "Xe nhận còn đủ chỗ", tang: "LOI" as const, ketQua: "DAT" as const, giaTri: 12, gioiHan: 16 },
    { ma: "MOC_TOI_THIEU", nhan: "Còn đủ mốc tối thiểu", tang: "CAU_HINH" as const, ketQua: "KHONG_DAT" as const, giaTri: null, gioiHan: null },
  ];
  const duoc = hopDuyetDeNghi(deNghi({ trangThai: "ESCALATED", hop: "DUYET_HOAC_BAC", kiem }));
  assert.deepEqual([duoc.coDuyet, duoc.coBac, duoc.cauChiBac], [true, true, null]);
  assert.deepEqual(duoc.kiem.map((k) => [k.nhan, k.tang, k.ketQua]), [["Còn đủ mốc tối thiểu", "Cấu hình", "Không đạt"], ["Xe nhận còn đủ chỗ", "Bắt buộc", "Đạt"]]);
  const chiBac = hopDuyetDeNghi(deNghi({ trangThai: "ESCALATED", hop: "CHI_BAC", kiem }));
  assert.deepEqual([chiBac.coDuyet, chiBac.coBac], [false, true]);
  assert.match(chiBac.cauChiBac!, /điều kiện bắt buộc/);
  const xong = hopDuyetDeNghi(deNghi({ trangThai: "CONFIRMED", kiem }));
  assert.deepEqual([xong.coDuyet, xong.coBac], [false, false]);
});

test("dongDeNghiVanPhong (V10 danh sách, Chi tiết chuyến): 'CX-A → CX-B', chip theo trạng thái, phạm vi bằng lời, giờ gửi giờ VN, lý do khi có; không mã thô", () => {
  const x = dongDeNghiVanPhong(deNghi({ trangThai: "ESCALATED", nhanTrangThai: "Chờ văn phòng duyệt" }), "2026-10-05");
  assert.equal(x.tieuDe, "CX-A → CX-B");
  assert.deepEqual(x.chip, { nhan: "Chờ văn phòng duyệt", tone: "warn" });
  assert.deepEqual(x.dong, [["Loại", "Nhờ đón một điểm"], ["Điểm đón", "Khách sạn Dò Tìm"], ["Số khách", "3"], ["Gửi lúc", "08:00"]]);
  assert.equal(x.canDuyet, true);
  const cuu = dongDeNghiVanPhong(deNghi({ phamVi: "ONBOARD", diemId: null, tenDiem: null, noiGap: "Cây xăng", trangThai: "DECLINED", nhanTrangThai: "Không nhận", lyDo: "Không kịp giờ" }), "2026-10-04");
  assert.deepEqual(cuu.dong, [["Loại", "Cứu hộ cả xe"], ["Nơi gặp", "Cây xăng"], ["Số khách", "3"], ["Gửi lúc", "08:00 05/10"], ["Lý do", "Không kịp giờ"]]);
  assert.deepEqual([cuu.chip.tone, cuu.canDuyet], ["danger", false]);
  for (const [tt, tone] of [["PENDING", "unit"], ["HET_GIO", "muted"], ["CONFIRMED", "ok"], ["VOID", "muted"], ["REJECTED", "danger"], ["WITHDRAWN", "muted"], ["EXPIRED", "muted"]] as const) {
    assert.equal(dongDeNghiVanPhong(deNghi({ trangThai: tt }), "2026-10-05").chip.tone, tone, tt);
  }
});
