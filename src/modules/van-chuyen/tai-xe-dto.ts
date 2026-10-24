// DTO TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.8; ruling R-P11, R-P17 — Task A15). Dựng MỚI TỪNG KHOÁ (khuôn `pool.ts` — không trải đối tượng nguồn): danh sách
// trắng. Họ tên + năm sinh khách, liên hệ (tên + SĐT người liên hệ của đơn), chuỗi đích "Chỉ đường" của điểm (ADR-0105 — chỉ GET chi tiết) CHỈ trong ngày
// chạy — ngoài ngày chạy các khoá đó VẮNG MẶT. KHÔNG BAO GIỜ: tiền,
// dịch vụ khác, ghi chú đơn, người lập, người phụ trách, số giấy tờ, hạn GPLX, khoá so sánh nơi (`L:…` / `T:…`), id người bấm, SĐT người bấm.
// Tên người đi kèm (HDV — nhân viên, không phải khách): mọi lúc, chỉ tên. ADR-0139: tài xế CÔNG TY trong ngày chạy, GET chi tiết — thêm SĐT người đi kèm
// (số liên hệ chính của hồ sơ) và tên dịch vụ của suất khách; tài xế đối tác không bao giờ.
// Kế hoạch A4 T3 (ADR-0053 D7.2, D8.6; G-A4-7, G-A4-17): "trong ngày chạy" nay là KHUNG XEM KHÁCH của người gọi (`KhungTaiXe` — một hàm `khungCuaNguoiGoi`).
// Người có VẾ HẠN (`han !== undefined`) ngoài khung: `suat[].maDon` VẮNG MẶT; tài xế công ty giữ mã đơn mọi lúc. Khoá thêm: `tuChoiDuoc` (mọi tài xế),
// `hanTuChoi` (chỉ vế hạn, có hạn), `chanTuChoi` (ADR-0113 Đ3 — chỉ khi chuyến còn hạn mà có khách chuyển vào), `thayKhachTu` (ngoài khung, mốc ở tương lai), `lyDoTuChoi` (chỉ khi `tuChoiDuoc`), `sdtVanPhong` (khi chính sách có số).
import type { LienHeTaiXe } from "../orders";
import type { CuocChiTietResponse, CuocCuaToiItemDto, DieuKienConThieuDto, DiemChuyenDto, SuatChuyenDto } from "../../shared/contracts";
import { MA_GIU, type LyDoGiu } from "../../shared/ly-do-giu";
import type { AllocRow, StopRow, TripRow, XeDieuPhoiRow } from "./chuyen-repo";
import { NHAN_TRANG_THAI_CHUYEN, gioVn, mocTienDo } from "./dieu-phoi-dto";

/** Khung xem khách + vế hạn Từ chối của NGƯỜI GỌI trên một chuyến — chỉ dựng ở `khungCuaNguoiGoi` (van-chuyen/index.ts). */
export interface KhungTaiXe {
  trongKhung: boolean;
  /** `undefined` = không có vế hạn (tài xế công ty); `null` = có vế hạn mà thiếu dòng hạn (ngoài khung); số = hạn Từ chối (ms) của cặp. */
  han: number | null | undefined;
  /** Đang lái + có vế hạn + chuyến PLANNED + bây giờ ≤ hạn (G-A4-16 — nút "Từ chối chuyến" chỉ theo cờ này). */
  tuChoiDuoc: boolean;
  /** ADR-0113 Đ3: `"KHACH_CHUYEN_VAO"` khi Từ chối chỉ còn bị chặn vì chuyến có khách chuyển vào (còn hạn, PLANNED, nhưng `tuChoiDuoc` = false); ngược lại `null`. Không tên, không số. */
  chanTuChoi: "KHACH_CHUYEN_VAO" | null;
  /** Mốc khung mở (ms) khi đang NGOÀI khung và mốc ở tương lai; `null` = không kèm. */
  thayKhachTuMs: number | null;
}
import type { EventRow } from "./chuyen-repo";

/**
 * `chiCauGoc` (kế hoạch A4 — phiếu tư vấn 9/10, G-A4-7 mở rộng): chi tiết của lý do giữ có thể mang MÃ ĐƠN (`THIEU_TEN` "<mã> thiếu N tên", `CHUA_CO_NOI_TRA`,
 * chặng ngoài…). Người có vế hạn Từ chối ngoài khung (và ở danh sách Cuốc) chỉ nhận CÂU GỐC của mã — không chi tiết.
 */
export const dieuKienConThieuDto = (l: LyDoGiu, chiCauGoc: boolean): DieuKienConThieuDto => ({ ma: l.ma, loiNhan: chiCauGoc ? MA_GIU[l.ma].loiNhan : l.loiNhan, aiXuLy: l.aiXuLy });
const suKienCuoi = (events: readonly EventRow[], tripId: string, loai: readonly string[]): EventRow | undefined =>
  [...events].reverse().find((e) => e.trip_id === tripId && loai.includes(e.kind));

/** Route 19 — một chuyến của "Cuốc của tôi" (R-P17): mã, giờ xuất bến dự kiến, trạng thái, biển số, số khách, số điểm đón / trả, điều kiện còn thiếu. */
export function cuocCuaToiItem(t: TripRow, v: { xe: XeDieuPhoiRow | undefined; stops: readonly StopRow[]; allocs: readonly AllocRow[]; conThieu: readonly LyDoGiu[]; chiCauGoc: boolean }): CuocCuaToiItemDto {
  const diemCon = v.stops.filter((s) => s.trip_id === t.id && s.status !== "SKIPPED" && s.status !== "MOVED");
  return {
    id: t.id,
    ma: t.code,
    gioXuatBen: gioVn(t.planned_start_ms),
    trangThai: t.status,
    trangThaiNhan: NHAN_TRANG_THAI_CHUYEN[t.status],
    bienSo: v.xe?.plate_number ?? "",
    soKhach: v.allocs.filter((a) => a.trip_id === t.id && a.valid_to_at === null && a.kind === "PASSENGER").length,
    soDiemDon: diemCon.filter((s) => s.kind === "PICKUP").length,
    soDiemTra: diemCon.filter((s) => s.kind === "DROPOFF").length,
    dieuKienConThieu: v.conThieu.map((l) => dieuKienConThieuDto(l, v.chiCauGoc)),
  };
}

/**
 * Route 20 (và phản hồi lệnh tiến độ của tài xế). `diem` / `suat` lấy từ DTO văn phòng rồi CHỌN TỪNG KHOÁ (một chỗ tính giờ hẹn, mốc) — không trải. Trong ngày
 * chạy: `suat[].hoTen/namSinh` (khi có tên) + `lienHe` (khi route đọc — chỉ GET chi tiết) + `diem[].diaChiChiDuong` (khi route truyền `chiDuong` — chỉ GET
 * chi tiết, ADR-0105, tự áp G18-B). Ngoài ngày chạy: các khoá đó vắng mặt.
 */
export function cuocChiTietDto(v: {
  trip: TripRow;
  xe: XeDieuPhoiRow | undefined;
  events: readonly EventRow[];
  diem: readonly DiemChuyenDto[];
  suat: readonly SuatChuyenDto[];
  lienHe: readonly LienHeTaiXe[] | null;
  conThieu: readonly LyDoGiu[];
  lyDo: readonly { code: string; label: string }[];
  nhan: ReadonlyMap<string, string> | null;
  trongNgay: boolean;
  /** ADR-0105: id điểm → chuỗi đích chỉ đường; `null` = không kèm (ngoài ngày chạy, phản hồi lệnh). */
  chiDuong: ReadonlyMap<string, string> | null;
  khung: KhungTaiXe;
  /** Lý do Từ chối đang dùng (nhóm TU_CHOI_CHUYEN) — chỉ kèm khi `khung.tuChoiDuoc`. */
  lyDoTuChoi: readonly { code: string; label: string }[];
  sdtVanPhong: string | null;
  /** ADR-0139: id suất → SĐT người đi kèm / tên dịch vụ — `null` trừ tài xế công ty, trong ngày chạy, GET chi tiết (route quyết, DTO chỉ chép). */
  themCongTy: { sdtDiKem: ReadonlyMap<string, string>; tenDichVu: ReadonlyMap<string, string> } | null;
}): CuocChiTietResponse {
  const t = v.trip;
  const anMaDon = v.khung.han !== undefined && !v.khung.trongKhung; // G-A4-7: mã đơn theo khung với người có vế hạn
  const maDonCuaSuat = new Set(v.suat.flatMap((s) => (s.maDon ? [s.maDon] : [])));
  return {
    chuyen: {
      id: t.id,
      ma: t.code,
      bienSo: v.xe?.plate_number ?? "",
      soCho: v.xe?.passenger_capacity ?? 0,
      gioBatDau: gioVn(t.planned_start_ms),
      gioKetThuc: gioVn(t.planned_end_ms),
      trangThai: t.status,
      trangThaiNhan: NHAN_TRANG_THAI_CHUYEN[t.status],
      xuatBen: t.departed_at === null ? null : mocTienDo(suKienCuoi(v.events, t.id, ["DEPARTED"]), v.nhan), // ADR-0097 Đ3: thu hồi xuất bến → chưa xuất bến
      ketThucThat: mocTienDo(suKienCuoi(v.events, t.id, ["ENDED", "ENDED_INTERRUPTED"]), v.nhan),
    },
    diem: v.diem.map((d) => ({
      id: d.id, thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, gioXeToi: d.gioXeToi, trangThai: d.trangThai, soNguoi: d.soNguoi, daToi: d.daToi,
      themKhiChay: d.themKhiChay,
      ...(v.trongNgay && v.chiDuong ? { diaChiChiDuong: v.chiDuong.get(d.id) ?? d.tenNoi } : {}),
    })),
    suat: v.suat.map((s) => ({
      id: s.id, loai: s.loai, ...(anMaDon ? {} : { maDon: s.maDon }), diemLen: s.diemLen, diemXuong: s.diemXuong, trangThai: s.trangThai, daDon: s.daDon, daTra: s.daTra, soHieuChuyenBay: s.soHieuChuyenBay,
      vanPhongBaoHuy: s.vanPhongBaoHuy === null ? null : { luc: s.vanPhongBaoHuy.luc, lyDoNhan: s.vanPhongBaoHuy.lyDoNhan }, // giờ + lý do, không người bấm
      ...(v.trongNgay && s.hoTen !== undefined && s.namSinh !== undefined ? { hoTen: s.hoTen, namSinh: s.namSinh } : {}),
      ...(s.tenNguoiDiKem !== undefined ? { tenNguoiDiKem: s.tenNguoiDiKem } : {}), // tên HDV đi kèm — mọi lúc, chỉ tên (lời chủ 2026-10-01; T-5)
      ...(v.themCongTy?.sdtDiKem.has(s.id) ? { sdtNguoiDiKem: v.themCongTy.sdtDiKem.get(s.id)! } : {}), // ADR-0139
      ...(v.themCongTy?.tenDichVu.has(s.id) ? { tenDichVu: v.themCongTy.tenDichVu.get(s.id)! } : {}), // ADR-0139
    })),
    ...(v.trongNgay && v.lienHe !== null
      ? { lienHe: v.lienHe.filter((x) => maDonCuaSuat.has(x.orderCode)).map((x) => ({ maDon: x.orderCode, tenLienHe: x.tenLienHe, sdtLienHe: x.sdtLienHe })) }
      : {}),
    dieuKienConThieu: v.conThieu.map((l) => dieuKienConThieuDto(l, anMaDon)),
    lyDo: v.lyDo.map((r) => ({ code: r.code, nhan: r.label })),
    trongNgayChay: v.trongNgay,
    tuChoiDuoc: v.khung.tuChoiDuoc,
    ...(v.khung.chanTuChoi ? { chanTuChoi: v.khung.chanTuChoi } : {}), // ADR-0113 Đ3: khoá tuỳ chọn, chỉ khi bị chặn vì khách chuyển vào
    ...(typeof v.khung.han === "number" ? { hanTuChoi: gioVn(v.khung.han) } : {}),
    ...(v.khung.thayKhachTuMs !== null ? { thayKhachTu: gioVn(v.khung.thayKhachTuMs) } : {}),
    ...(v.khung.tuChoiDuoc ? { lyDoTuChoi: v.lyDoTuChoi.map((r) => ({ code: r.code, nhan: r.label })) } : {}),
    ...(v.sdtVanPhong ? { sdtVanPhong: v.sdtVanPhong } : {}),
  };
}
