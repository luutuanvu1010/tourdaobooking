// SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO của chuyến xe (ADR-0097 Đ2, Đ3 — gói A1, V3-B). Hai lệnh CHỈ văn phòng bấm (cổng office, ô trip.progress không ngữ cảnh —
// route kiểm; tài xế không có route — Đ2.1, Đ3.1), nên KHÔNG ở dieu-phoi-tien-do.ts (tệp đó chỉ giữ hàm dùng chung cho CẶP route tài xế ↔ văn phòng — bài
// tien-do-mot-luat.test.ts, R-P1). Luật lõi ở CẢ máy chủ (dưới đây — câu tiếng Việt chỉ đường) lẫn trigger 0085 (lớp thứ hai). Giờ ghi = lúc bấm (không khai
// giờ — MỘT mốc giờ mỗi request). Không gọi hàm hẹp của orders: dòng hành khách (`hk`) do thân route đọc sau `can()`.
import type { ChangChoChuyen } from "../orders";
import { cauDieuChinh, coTienDoSauXuatBen, kiemDieuChinh } from "../../shared/dieu-chinh-suat";
import { error } from "../../shared/http";
import { legFlags, lyDoDangDung, type TripRow } from "./chuyen-repo";
import { loChoChayThieu, loDieuChinh, loThuHoiXuatBen, type LenhChung } from "./dieu-phoi";
import type { NenChuyen } from "./dieu-phoi-doc";
import { chayLo, loi409 } from "./dieu-phoi-route";
import type { DieuChinhSuatThan, ThuHoiXuatBenThan } from "./dieu-phoi-than";
import type { NguoiBam } from "./dieu-phoi-tien-do";
import { chinhSachHienHanh } from "./repository";
import { lyDoGiu } from "../../shared/ly-do-giu";
import { giayToXeConThieu } from "../../shared/dieu-phoi-kiem";
import { kiemChoChayThieu, MA_LY_DO_THIEU_GIAY_KHAC, NHOM_LY_DO_THIEU_GIAY, sapTheoThuTuLoai } from "../../shared/cho-chay-thieu-giay";
import { msToVnLocal, ngayDayDu } from "../../shared/vn-date";
import { boSungXe, docChung, xeVao } from "./dieu-phoi-doc";
import { CAU_CHI_TOAN_QUYEN_GIAY_TO } from "./rules";
import { listVehicleDocumentTypes } from "./repository";
import type { ChoChayThieuThan } from "./dieu-phoi-than";

const lenh = (requestId: string, nguoi: NguoiBam, bayGioMs: number): LenhChung => ({ cmd: crypto.randomUUID(), requestId, lucIso: new Date(bayGioMs).toISOString(), nguoiId: nguoi.id });
const KHONG_CO_SUAT = () => error(404, "not_found", "Không tìm thấy khách này trên chuyến.");
/** Chưa có chính sách (không có kẹp lùi) → chặn, không đoán (khuôn CHUA_CO_KEP của lệnh tiến độ). */
const CHUA_CO_KEP = () => loi409("chinh_sach_rong", [lyDoGiu("CHINH_SACH_RONG")]);

/** Chuyến phải ĐANG CHẠY: chưa xuất bến → không có gì để sửa / thu hồi; đã kết thúc / huỷ → chứng cứ đã đóng (LC-06). */
function dangChayDieuChinh(t: TripRow, chuaChay: string): Response | null {
  if (t.status === "RUNNING") return null;
  if (t.status === "PLANNED") return loi409("chua_xuat_ben", [], {}, chuaChay);
  return loi409("chuyen_da_ket_thuc", [], {}, "Chuyến đã kết thúc hoặc đã huỷ — kết quả đã chốt, không điều chỉnh được.");
}
/** Lý do điều chỉnh: mã ĐANG DÙNG của nhóm DIEU_CHINH (Đ2.5 — danh sách đóng). */
async function lyDoDieuChinh(db: D1Database, ma: string): Promise<{ code: string; label: string } | null> {
  return (await lyDoDangDung(db)).find((r) => r.code === ma && r.reason_group === "DIEU_CHINH") ?? null;
}
const LY_DO_DIEU_CHINH_SAI = () => error(400, "invalid_input", "Lý do điều chỉnh không có trong danh mục.");

/**
 * Đ2 — điều chỉnh kết quả MỘT suất khách (HT-04). `hk` (dòng hành khách hiện hành — `rowId` cho bản chốt dòng thêm sau xuất bến) do thân route đọc sau `can()`.
 * Kiểm: chuyến đang chạy; suất khách mở của chuyến (không có → 404; người đi kèm → 409); lý do nhóm DIEU_CHINH (400); bảng Đ2.4 + điều kiện "điểm chưa xong"
 * (`kiemDieuChinh` — 409 câu tiếng Việt); đơn còn hiệu lực (LC-09: đơn huỷ giữa chuyến → 409 chỉ luồng huỷ); người còn trong đơn (LC-10).
 */
export async function lenhDieuChinhSuat(
  db: D1Database, nen: NenChuyen, hk: readonly ChangChoChuyen[], suatId: string, b: DieuChinhSuatThan, nguoi: NguoiBam, bayGioMs: number,
): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChayDieuChinh(t, "Xe chưa chạy — chưa có kết quả nào để điều chỉnh.");
  if (chan) return chan;
  const a = nen.allocs.find((x) => x.id === suatId && x.valid_to_at === null);
  if (!a) return KHONG_CO_SUAT();
  if (a.kind !== "PASSENGER") return loi409("chi_suat_khach");
  const lyDo = await lyDoDieuChinh(db, b.lyDo);
  if (!lyDo) return LY_DO_DIEU_CHINH_SAI();
  const trangThaiDiem = (id: string | null) => (id === null ? null : (nen.stops.find((s) => s.id === id)?.status ?? null));
  const kd = kiemDieuChinh(a.status, b.trangThai, { diemLen: trangThaiDiem(a.board_stop_id) ?? "PENDING", diemXuong: trangThaiDiem(a.alight_stop_id) });
  if (kd) return loi409(kd.ma === "ngoai_bang" ? "dieu_chinh_ngoai_bang" : "diem_da_xong", [], {}, kd.cau);
  const co = a.leg_id ? (await legFlags(db, [a.leg_id]))[0] : undefined;
  if (!co || co.is_open !== 1 || co.is_confirmed !== 1 || co.is_cancelled !== 0) return loi409("don_khong_con");
  let passengerRowId: string | null = null;
  if (a.passenger_key !== null) {
    passengerRowId = hk.find((c) => c.legId === a.leg_id)?.nguoi.find((p) => p.personKey === a.passenger_key)?.rowId ?? null;
    if (passengerRowId === null) return loi409("khach_khong_thuoc_don", [], {}, "Khách này không còn trong đơn — xử lý theo đơn (Cập nhật khách theo đơn), không điều chỉnh được.");
  }
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const lo = loDieuChinh(db, {
    ...l, tripId: t.id, version: b.version, suatId: a.id, suatMoiId: crypto.randomUUID(), trangThaiMoi: b.trangThai, lyDo: lyDo.code, passengerRowId,
    diemXet: [...new Set([a.board_stop_id, a.alight_stop_id].filter((d): d is string => d !== null))],
    detail: `${t.code}: ${co.order_code ?? "khách"} — ${cauDieuChinh(a.status, b.trangThai, lyDo.label)}${nguoi.bamThay ? " · văn phòng bấm thay" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

/** "180 phút" → "3 giờ" (chia hết cho 60), không thì số phút. */
const khoangPhut = (m: number): string => (m % 60 === 0 ? `${m / 60} giờ` : `${m} phút`);
/**
 * Đ3 — thu hồi xuất bến nhầm (HT-03). Đủ ba điều kiện (Đ3.2): chuyến đang chạy; CHƯA có sự kiện tiến độ nào của chuyến sau sự kiện DEPARTED cuối (không tính
 * DEPARTED / DEPARTURE_REVOKED — cùng luật trigger vc_trip_revoke_no_progress); giờ bấm ≤ giờ xuất bến + kẹp lùi của chính sách HIỆN HÀNH. Quá điều kiện → 409
 * chỉ đường: sửa từng khách (Điều chỉnh…) hoặc Kết thúc gián đoạn.
 */
export async function lenhThuHoiXuatBen(db: D1Database, nen: NenChuyen, b: ThuHoiXuatBenThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChayDieuChinh(t, "Xe chưa chạy — không có gì để thu hồi.");
  if (chan) return chan;
  const lyDo = await lyDoDieuChinh(db, b.lyDo);
  if (!lyDo) return LY_DO_DIEU_CHINH_SAI();
  if (coTienDoSauXuatBen(nen.events.map((e) => ({ loai: e.kind, chuyenKhac: e.trip_id !== t.id })))) return loi409("da_co_tien_do");
  const cs = await chinhSachHienHanh(db);
  if (!cs) return CHUA_CO_KEP();
  if (t.departed_ms === null || bayGioMs > t.departed_ms + cs.proxy_backdate_max_minutes * 60_000) {
    return loi409("qua_gio_thu_hoi", [], {}, `Đã quá ${khoangPhut(cs.proxy_backdate_max_minutes)} từ giờ xe chạy nên không thu hồi được — sửa từng khách bằng "Điều chỉnh…", hoặc "Kết thúc gián đoạn" nếu xe thật sự không chạy tiếp.`);
  }
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const lo = loThuHoiXuatBen(db, {
    ...l, tripId: t.id, version: b.version, lyDo: lyDo.code, detail: `${t.code}: thu hồi lệnh cho xe chạy — ${lyDo.label}${nguoi.bamThay ? " · văn phòng bấm thay" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

/** "2027-03-11" → "11/03/2027" (chỉ để ghi nhật ký). */
const ngayVn = ngayDayDu;
/**
 * ADR-0184 — «Cho chạy dù thiếu giấy tờ». Văn phòng (Quản trị: `trip.override`; Toàn quyền: thêm `trip.override.giay_to_cung` = `coOToanQuyen`) cấp dòng cho phép
 * cho chuyến CHƯA chạy. Kiểm: chuyến PLANNED (409); thiếu tính LẠI lúc lệnh chạy bằng `giayToXeConThieu` của xe HIỆN TẠI (cùng định nghĩa với cổng xuất bến);
 * `kiemChoChayThieu` (mã → 403 / 400 / 409); loại đã có dòng cho phép chưa dùng cùng xe → 409. Ghi chú tự do chỉ ở dòng cho phép, KHÔNG vào nhật ký (P5).
 */
export async function lenhChoChayThieu(
  db: D1Database, nen: NenChuyen, b: ChoChayThieuThan, nguoi: NguoiBam, bayGioMs: number, coOToanQuyen: boolean,
): Promise<Response | null> {
  const t = nen.trip;
  if (t.status !== "PLANNED") {
    return loi409(t.status === "RUNNING" ? "da_xuat_ben" : "chuyen_da_ket_thuc", [], {}, t.status === "RUNNING" ? "Xe đã chạy rồi — không cho chạy dù thiếu giấy tờ nữa." : "Chuyến đã kết thúc hoặc đã huỷ.");
  }
  const chung = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  await boSungXe(db, chung, [t.vehicle_id]);
  const xeRow = chung.xe.find((x) => x.id === t.vehicle_id);
  if (!xeRow) return loi409("chuyen_da_ket_thuc", [], {}, "Không tìm thấy xe của chuyến — tải lại trang.");
  const xe = xeVao(xeRow, chung.giayToXe);
  const thieu = giayToXeConThieu(xe, chung.dieuKien, t.planned_end_ms);
  const lyDoDanhMuc = b.lyDo === null ? null : (chung.lyDo.find((r) => r.code === b.lyDo && r.reason_group === NHOM_LY_DO_THIEU_GIAY) ?? null);
  const kq = kiemChoChayThieu({ thieu, yeuCau: b.loaiGiayTo, coOToanQuyen, lyDo: b.lyDo, lyDoHopLe: lyDoDanhMuc !== null, ghiChu: b.ghiChu });
  const ten = new Map((await listVehicleDocumentTypes(db)).map((r) => [r.code, r.name]));
  const tenLoai = (code: string) => ten.get(code) ?? code;
  if (!kq.ok) {
    switch (kq.ma) {
      case "chi_toan_quyen": return error(403, "forbidden", CAU_CHI_TOAN_QUYEN_GIAY_TO);
      case "thieu_ly_do": return error(400, "invalid_input", "Chọn lý do cho chạy dù thiếu giấy tờ.");
      case "ly_do_sai_nhom": return error(400, "invalid_input", "Lý do không có trong danh mục lý do cho chạy dù thiếu giấy tờ.");
      case "thieu_ghi_chu": return error(400, "invalid_input", b.lyDo === MA_LY_DO_THIEU_GIAY_KHAC ? "Lý do «Khác» cần ghi chú từ 10 đến 200 ký tự." : "Ghi chú dài từ 10 đến 200 ký tự.");
      case "trong": return error(400, "invalid_input", "Chọn loại giấy tờ cho chạy.");
      case "giay_to_khong_thieu": return loi409("giay_to_khong_thieu", [], {}, "Xe không còn thiếu loại giấy này — tải lại trang.");
    }
  }
  for (const code of b.loaiGiayTo) {
    if (chung.choPhepThieu.some((w) => w.tripId === t.id && w.xeId === t.vehicle_id && w.documentTypeCode === code)) {
      return loi409("da_cho_chay_thieu", [], {}, `Chuyến này đã được cho chạy dù thiếu ${tenLoai(code)}.`);
    }
  }
  const dong = sapTheoThuTuLoai(b.loaiGiayTo, (code) => code, chung.thuTuLoai).map((code) => ({ id: crypto.randomUUID(), documentTypeCode: code, expiryDate: thieu.find((x) => x.documentTypeCode === code)?.expiryDate ?? null }));
  const loai = dong.map((d) => `${tenLoai(d.documentTypeCode)} (${d.documentTypeCode}, hạn ${d.expiryDate === null ? "chưa có" : ngayVn(d.expiryDate)})`).join(", ");
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const lo = loChoChayThieu(db, {
    ...l, tripId: t.id, version: b.version, xeId: t.vehicle_id, dong, lyDo: b.lyDo, ghiChu: kq.ghiChu,
    detail: `${t.code}: cho chạy dù thiếu giấy tờ · xe ${xe.bienSo} · ${loai} · lý do ${lyDoDanhMuc ? lyDoDanhMuc.label : "không nêu lý do"}${kq.ghiChu !== null ? " · có ghi chú" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}
