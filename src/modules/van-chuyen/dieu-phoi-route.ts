// PHẦN DÙNG CHUNG của các route chuyến xe (Task A13 / A15) — KHÔNG gọi hàm hẹp của orders (bài src/orders-cong-bo.test.ts): dữ liệu chặng (`lichChungChang`) và
// tên khách (`hanhKhachChoChuyen`) do THÂN ROUTE đọc sau `can()` rồi truyền vào. Gồm: mã lỗi 409 từ lý do của luật thuần, chạy lô + đổi lỗi CSDL, dựng chi
// tiết chuyến, chuỗi `detail` nhật ký (danh sách TRẮNG — mục 1.1), dựng điểm từ chặng (I40).
import type { ChangChoChuyen, ChangLichChung, LienHeTaiXe } from "../orders";
import type { ChuyenChiTietResponse, CuocChiTietResponse, CuocCuaToiItemDto, GoiBaoChangDto, LenhChuyenLoiBody } from "../../shared/contracts";
import { docGoiBao, goiBaoChang, nguoiBamGoiBao, type QuyenGoiBao } from "./goi-bao-lenh";
import { kiemXuatBen, type KiemXuatBenVao } from "../../shared/dieu-phoi-kiem";
import type { KetQuaKiem, LoaiSuKienChuyen, MaLuatPhaLe, TrangThaiChuyen } from "../../shared/dieu-phoi-kieu";
import { dungLichChung } from "../../shared/dieu-phoi-lich-chung";
import { error, json } from "../../shared/http";
import { lyDoGiu, lyDoTheoMoc, type LyDoGiu, type MaGiu } from "../../shared/ly-do-giu";
import { chuyenDuoiMoc, duQuyen, lopCanCho, lopCuaLuat, lopVuotMoc, lopVuotNghiCamKet, type LenhVuotMoc, type LopVuot } from "../../shared/moc-toi-thieu";
import { maskLongDigits } from "../../shared/text-guards";
import { daoMoiSauDoi, diemDonChuaToiCuaDiemTra, sapDonTruocTra } from "../../shared/thu-tu-diem";
import { msToVnLocal, ngayNgan } from "../../shared/vn-date";
import { findRoute } from "./tien-xe-repo";
import {
  allocsByTrips, banChupCuoi, eventByRequest, eventsByTrips, legFlags, stopsByTrips, tenNguoiDiKem, type AllocRow, type StopRow, type SuKienYeuCauRow, type TripRow,
} from "./chuyen-repo";
import type { CauCoNhan, DiemMoi, SuKienCuaLo } from "./dieu-phoi";
import {
  banChupDto, canhBaoDto, chuoiDichCuaDiem, chuyenTomTat, diemChuyenDto, lyDoDangDung, lyDoGiuCuaChuyen, lyDoGiuDto, nhatKyChuyenDto, suatChuyenDto, taiXeChon, xeChon,
} from "./dieu-phoi-dto";
import { boSungXe, chinhSachVao, docChung, docNguCanh, type DuLieuChung, type NenChuyen, type NguCanhChuyen } from "./dieu-phoi-doc";
import { gioSomNhatKhaiDto, ketThucTruoc } from "./dieu-phoi-gio";
import { cuocChiTietDto, cuocCuaToiItem } from "./tai-xe-dto";
import { loiRangBuocChuyen } from "./rules";

// ---- Lỗi ----------------------------------------------------------------------------------------------------------------------------------------------------
export const CAN_XEM_CHUYEN = () => error(403, "forbidden", "Tài khoản này không xem được lịch xe.");
export const CAN_DIEU_PHOI = () => error(403, "forbidden", "Tài khoản này không xếp xe được.");
/**
 * 403 khi người gọi gửi cờ vượt luật mà không có ô của LỚP (ADR-0104 Đ1 mục 2): QUAN_TRI giữ nguyên câu cũ ("Phá lệ" — khoảng nghỉ, cam kết khi chuyến
 * ngoài mốc); KHAN_CAP câu "điều chỉnh khẩn cấp". Ô `trip.urgent_adjust` bằng `trip.dispatch` (bài ghim ⊆) nên câu KHAN_CAP hôm nay không ai chạm tới được
 * (người không xếp xe đã bị 403 `CAN_DIEU_PHOI` trước) — giữ để tách lớp sau không thiếu câu.
 */
const CAU_CAN_VUOT: Record<LopVuot, string> = {
  QUAN_TRI: "Chỉ Quản trị hoặc Toàn quyền phá lệ được.",
  KHAN_CAP: "Chỉ Bán hàng, Quản trị, Toàn quyền điều chỉnh khẩn cấp được.",
};
export const canVuot = (lop: LopVuot) => error(403, "forbidden", CAU_CAN_VUOT[lop]);
export const KHONG_CO_CHUYEN = () => error(404, "not_found", "Không tìm thấy chuyến.");
export const CHUYEN_CU = () => error(409, "stale", "Chuyến vừa được người khác sửa, tải lại.");
const THONG_BAO_409: Record<string, string> = {
  nguoi_da_o_chuyen_khac: "Khách này đang ở một chuyến khác.",
  vuot_so_nguoi_chang: "Xếp quá số khách của chặng.",
  vuot_so_cho: "Vượt số chỗ của xe.",
  trung_gio_xe: "Xe trùng giờ với chuyến khác.",
  trung_gio_tai_xe: "Tài xế trùng giờ với chuyến khác.",
  khong_du_dieu_kien_lai: "Tài xế chưa đủ điều kiện lái xe này.",
  chang_khong_hop_le: "Chặng chưa xếp được.",
  khach_khong_thuoc_don: "Khách không thuộc đơn của chặng.",
  cheo_xe_tai_xe: "Tài xế không thuộc chủ của xe này.",
  chuyen_da_ket_thuc: "Chuyến đã kết thúc hoặc đã huỷ.",
  xe_dang_chay: "Xe đang chạy — không đổi kế hoạch được.",
  chua_gian_doan: "Chỉ tạo chuyến cứu hộ sau khi xe đã Kết thúc gián đoạn.", // Đợt 5 D5c (cứu hộ đơn giản)
  suat_da_co_ten: "Khách này đã có tên — tải lại chuyến.", // Đợt 5 D5b (tài xế bổ sung tên)
  don_du_ten: "Đơn đã đủ tên khách — gọi văn phòng nếu cần đổi tên.", // Đợt 5 D5b
  xe_khong_dung: "Xe đang bảo dưỡng hoặc đã ngừng dùng.",
  gio_chuyen_khong_hop_le: "Giờ kết thúc phải sau giờ bắt đầu và chuyến không quá 24 giờ.",
  chinh_sach_rong: "Chưa có chính sách điều phối đang hiệu lực — báo người phụ trách hệ thống.",
  // Ba câu dưới là lớp QUAN_TRI ("Phá lệ" — ADR-0104 Đ1); lớp KHAN_CAP dùng `THONG_BAO_KHAN_CAP`. Mã lỗi (code) không đổi theo lớp.
  can_pha_le: "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ.",
  chua_du_nghi: "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ.",
  can_pha_le_cam_ket: "Chuyến trái cam kết xe riêng / số chỗ của khách — cần Quản trị phá lệ kèm lý do.", // ADR-0056 VK3-A (kế hoạch Đợt 7 C9)
  con_khach_chua_xong: "Còn khách hoặc điểm chưa xong.",
  chua_du_dieu_kien_xuat_ben: "Chuyến chưa đủ điều kiện xuất bến.",
  // Lệnh tiến độ (A15)
  da_xuat_ben: "Chuyến đã xuất bến.",
  chua_xuat_ben: "Chuyến chưa xuất bến — lệnh này chỉ dùng khi xe đang chạy (đổi thứ tự khi chưa chạy: sửa chuyến).",
  // C38 (báo cáo ERP 2026-10-07): mã lệnh (requestId) đã thuộc sự kiện của chuyến / loại lệnh / suất / điểm khác.
  request_id_reused: "Mã lệnh đã dùng cho thao tác khác — tải lại trang rồi thử lại.",
  diem_da_toi: "Điểm đã tới hoặc đã bỏ qua.",
  diem_chua_toi: "Xe chưa tới điểm của khách này — bấm \"Đã tới\" trước.",
  suat_da_co_ket_qua: "Khách này đã có kết quả — không đổi được.",
  // ADR-0096 Đ1 (gói A1): HT-16 — "Đã trả" khách chưa lên xe; Đ1.4 (HT-02) — "Đã tới" điểm trả khi còn khách chưa đón sẽ xuống ở đó (câu cụ thể dựng ở
  // `cauConKhachChuaDon`); Đ1.3c — lệnh đổi thứ tự làm khách chờ lên bị đảo mới (lý do TRA_TRUOC_DON kèm đơn + số điểm).
  khach_chua_len: "Khách chưa lên xe — bấm \"Đã đón\" ở điểm đón trước.",
  con_khach_chua_don: "Còn khách chưa đón sẽ xuống ở điểm này — tới điểm đón trước.",
  thu_tu_dao: "Thứ tự này đưa điểm trả lên trước điểm đón của khách chờ lên — chọn thứ tự khác.",
  // Xe đang chạy (Đợt 5 — ADR-0052 D5)
  chuyen_chua_chay: "Chuyến chưa xuất bến — dùng Xếp khách / Rút khách.",
  da_bao_huy: "Khách này đã được báo huỷ.",
  // ADR-0097 (gói A1, V3-B): điều chỉnh kết quả một khách / thu hồi xuất bến — câu cụ thể của bảng Đ2.4 dựng ở `kiemDieuChinh` (src/shared/dieu-chinh-suat.ts).
  chi_suat_khach: "Chỉ điều chỉnh được kết quả của khách — người đi kèm không có kết quả đón / trả.",
  dieu_chinh_ngoai_bang: "Kết quả này không điều chỉnh được theo cách này.",
  diem_da_xong: "Điểm đã xong nên không đưa khách về trạng thái chờ được.",
  don_khong_con: "Đơn của khách này đã huỷ hoặc chặng không còn hiệu lực — không điều chỉnh được; xử lý theo luồng huỷ đơn.",
  da_co_tien_do: "Chuyến đã có tiến độ sau xuất bến nên không thu hồi được — sửa từng khách bằng \"Điều chỉnh…\", hoặc \"Kết thúc gián đoạn\" nếu xe thật sự không chạy tiếp.",
  qua_gio_thu_hoi: "Đã quá thời gian được thu hồi xuất bến.",
};
/** ADR-0104 Đ1: câu 409 khi mọi luật đang thiếu thuộc lớp KHAN_CAP (chuyến dưới mốc) — người xếp xe tự điều chỉnh khẩn cấp kèm lý do. */
const THONG_BAO_KHAN_CAP: Record<"can_pha_le" | "chua_du_nghi" | "can_pha_le_cam_ket", string> = {
  can_pha_le: "Trong mốc tối thiểu trước giờ xuất bến — cần điều chỉnh khẩn cấp kèm lý do.",
  chua_du_nghi: "Chưa đủ khoảng nghỉ giữa hai chuyến — cần điều chỉnh khẩn cấp kèm lý do.",
  can_pha_le_cam_ket: "Chuyến trái cam kết xe riêng / số chỗ của khách — cần điều chỉnh khẩn cấp kèm lý do.",
};
const MA_LOI_THEO_GIU: Partial<Record<MaGiu, string>> = {
  NGUOI_DA_O_CHUYEN_KHAC: "nguoi_da_o_chuyen_khac", VUOT_SO_NGUOI_CHANG: "vuot_so_nguoi_chang", VUOT_SO_CHO: "vuot_so_cho", TRUNG_GIO_XE: "trung_gio_xe",
  TRUNG_GIO_TAI_XE: "trung_gio_tai_xe", GPLX_THIEU: "khong_du_dieu_kien_lai", GPLX_THIEU_HANG: "khong_du_dieu_kien_lai", GPLX_HET_HAN: "khong_du_dieu_kien_lai",
  HANG_BANG_KHONG_DU: "khong_du_dieu_kien_lai", KHONG_CO_HANG_BANG: "khong_du_dieu_kien_lai", CHANG_KHONG_HOP_LE: "chang_khong_hop_le", CHUA_CO_GIO: "chang_khong_hop_le",
  DON_DA_HUY: "chang_khong_hop_le", CHANG_DA_DONG: "chang_khong_hop_le", GIO_HEN_NGOAI_CHUYEN: "chang_khong_hop_le", KHACH_KHONG_THUOC_DON: "khach_khong_thuoc_don",
  CHEO_XE_TAI_XE: "cheo_xe_tai_xe", XE_KHONG_DUNG: "xe_khong_dung", GIO_CHUYEN_KHONG_HOP_LE: "gio_chuyen_khong_hop_le", CHINH_SACH_RONG: "chinh_sach_rong",
};
export function loi409(code: string, lyDo: readonly LyDoGiu[] = [], extra: Omit<LenhChuyenLoiBody["error"], "code" | "message" | "lyDo"> = {}, thongBao?: string): Response {
  return json({ error: { code, message: thongBao ?? THONG_BAO_409[code] ?? "Lệnh chưa làm được.", lyDo: lyDo.map(lyDoGiuDto), ...extra } } satisfies LenhChuyenLoiBody, 409);
}
/** Route đổi lớp ra ô bằng chữ viết thẳng (ADR-0104 Đ1 mục 2; bài lop-vuot.test.ts) rồi truyền hàm này xuống lệnh. */
export type QuyenVuot = (lop: LopVuot) => boolean;
/**
 * Ngữ cảnh lớp của MỘT lệnh (ADR-0104 Đ1 mục 0, 2): `duoiMoc` = chuyến dưới mốc theo định nghĩa của lệnh (`chuyenDuoiMoc`); `conPhut` = số phút (làm tròn
 * xuống) từ lúc lệnh chạy tới giờ xét mốc của lệnh, null = xe đang chạy — chỉ để ghi nhật ký (mục 4); `lenhMoc` = lệnh bị khoá theo mốc mà request này làm
 * (rỗng = lệnh không sinh luật mốc); `quyenVuot` = hàm của route.
 */
export interface VuotLenh {
  duoiMoc: boolean;
  conPhut: number | null;
  lenhMoc: readonly LenhVuotMoc[];
  quyenVuot: QuyenVuot;
}
/** Dựng `VuotLenh` từ giờ xét mốc của lệnh — MỘT chỗ tính "dưới mốc" và "còn N phút" (không có chính sách → ngoài mốc, `chuyenDuoiMoc`). */
export function vuotLenh(
  c: { dangChay: boolean; gioXetMs: number }, bayGioMs: number, phut: number | null, lenhMoc: readonly LenhVuotMoc[], quyenVuot: QuyenVuot,
): VuotLenh {
  return { duoiMoc: chuyenDuoiMoc(c, bayGioMs, phut), conPhut: c.dangChay ? null : Math.floor((c.gioXetMs - bayGioMs) / 60000), lenhMoc, quyenVuot };
}
/**
 * Cờ vượt người gọi GỬI (`phaLe` → luật mốc; `nghiPhaLe` / `camKetPhaLe` → khoảng nghỉ, cam kết) mà thiếu ô của lớp → 403, kiểm TRƯỚC luật (ADR-0104 Đ1
 * mục 2). Chạy sau khi lệnh đọc chuyến + chính sách (cần "dưới mốc"). Thứ tự HIỆN TRẠNG (ghim ở `dieu-chinh-khan-cap.test.ts` — phiếu D1 THẤP-2, THẤP-3):
 * 403 ô xếp xe, 400 đọc thân, 404 chuyến, lệnh lặp (LC-11: gửi lại mã lệnh cũ kèm cờ → 200, không ghi — kể cả người thiếu ô) luôn đi TRƯỚC 403 này; xếp,
 * rút, dời, huỷ, thêm khi chạy còn đặt 409 trạng thái chuyến trước nó (rút, dời thêm 400 "suất không thuộc chuyến"; xếp thêm 409 người đi kèm). Sửa chuyến và
 * route tạo chuyến đặt 403 này TRƯỚC mọi 400 ngữ nghĩa (lý do ngoài nhóm, xe / tuyến không có, điểm lạ), và sửa chuyến đặt nó trước 409 chuyến hết kế hoạch
 * (luật thuần chặn sau cổng).
 */
export function chanCoVuot(co: { moc: boolean; nghiCamKet: boolean }, v: VuotLenh): Response | null {
  if (co.moc && !v.quyenVuot(lopVuotMoc(...v.lenhMoc))) return canVuot(lopVuotMoc(...v.lenhMoc));
  if (co.nghiCamKet && !v.quyenVuot(lopVuotNghiCamKet(v.duoiMoc))) return canVuot(lopVuotNghiCamKet(v.duoiMoc));
  return null;
}
/**
 * Kết quả luật thuần → 409 (kế hoạch mục 1.1 bảng mã lỗi — lớp ROUTE): `chan` → mã theo lý do ĐẦU (mọi lý do đi kèm); chỉ `canPhaLe` còn thiếu → `can_pha_le`
 * (mốc) > `chua_du_nghi` (khoảng nghỉ) > `can_pha_le_cam_ket` (cam kết xe riêng / số chỗ — ADR-0056 VK3-A; thứ tự ưu tiên C6), danh sách lý do mang ĐỦ mọi mã
 * còn thiếu. ADR-0104 Đ1: kèm `lop` (KHAN_CAP / QUAN_TRI — `lopCanCho`, hộp xác nhận chọn chữ) và `canQuyen` = người gọi đủ ô cho MỌI luật đang thiếu theo
 * lớp (`duQuyen`); câu theo lớp. `co.*` = lệnh đã có cờ cho luật đó (lệnh không thể sinh luật đó: true). `null` = cho qua.
 */
export function loiKiem(
  kq: KetQuaKiem, v: VuotLenh, trangThai: TrangThaiChuyen | null, co: { moc: boolean; nghi: boolean; camKet: boolean }, thongBaoMoc?: string,
): Response | null {
  if (kq.chan.length > 0) {
    const dau = kq.chan[0]!.ma;
    const code = dau === "CHUYEN_KHONG_CON_LEN_KE_HOACH" ? (trangThai === "RUNNING" ? "xe_dang_chay" : "chuyen_da_ket_thuc") : (MA_LOI_THEO_GIU[dau] ?? "chang_khong_hop_le");
    return loi409(code, kq.chan);
  }
  const thieu = kq.canPhaLe.filter((l) => (l.ma === "MOC_TOI_THIEU" && !co.moc) || (l.ma === "KHOANG_NGHI" && !co.nghi) || (l.ma === "CAM_KET" && !co.camKet));
  if (thieu.length === 0) return null;
  const luat = [...new Set(thieu.map((l) => l.ma as MaLuatPhaLe))];
  const moc = luat.includes("MOC_TOI_THIEU");
  const code = moc ? "can_pha_le" : luat.includes("KHOANG_NGHI") ? "chua_du_nghi" : "can_pha_le_cam_ket";
  const lop = lopCanCho(luat, v.duoiMoc, v.lenhMoc);
  const cau = lop === "QUAN_TRI" ? undefined : moc && thongBaoMoc ? thongBaoMoc : THONG_BAO_KHAN_CAP[code];
  // Đ1 mục 9 ★: lý do kèm theo cùng lớp với câu — dưới mốc thì khoảng nghỉ / cam kết do người xếp xe điều chỉnh khẩn cấp (`lyDoTheoMoc`).
  return loi409(code, thieu.map((l) => lyDoTheoMoc(l, v.duoiMoc)), { canQuyen: duQuyen(luat, v.duoiMoc, v.lenhMoc, v.quyenVuot), lop }, cau);
}
// ---- Thứ tự điểm (ADR-0096 Đ1, gói A1) -----------------------------------------------------------------------------------------------------------------
/**
 * Đ1.3c — lệnh đổi số thứ tự điểm (`doi`: id → seq mới) làm suất MỞ đang CHỜ LÊN bị đảo MỚI (trả trước / bằng đón; `daoMoiSauDoi`) → 409 `thu_tu_dao` kèm
 * lý do TRA_TRUOC_DON mỗi đơn (mã đơn + số điểm SAU lệnh). Suất đảo từ trước không chặn (sửa dần bằng ↑ ↓ — diễn giải ghi ở báo cáo A1). null = cho qua.
 * Dùng chung: đổi thứ tự khi đang chạy (tài xế, văn phòng bấm thay) và sửa điểm của chuyến kế hoạch (nút ↑ ↓ của văn phòng).
 */
export async function chanDaoMoi(db: D1Database, stops: readonly StopRow[], allocs: readonly AllocRow[], doi: readonly { id: string; seq: number }[]): Promise<Response | null> {
  const cho = allocs.filter((a) => a.valid_to_at === null && a.status === "WAITING");
  const moi = daoMoiSauDoi(stops.map((s) => ({ id: s.id, seq: s.seq })), doi, cho.map((a) => ({ diemLen: a.board_stop_id, diemXuong: a.alight_stop_id })));
  if (moi.length === 0) return null;
  const sau = new Map(stops.map((s) => [s.id, s.seq]));
  for (const d of doi) sau.set(d.id, d.seq);
  const ma = new Map((await legFlags(db, [...new Set(moi.map((i) => cho[i]!.leg_id).filter((x): x is string => x !== null))])).map((f) => [f.id, f.order_code]));
  const lyDo: LyDoGiu[] = [];
  const daCo = new Set<string>();
  for (const i of moi) {
    const a = cho[i]!;
    const don = (a.leg_id ? ma.get(a.leg_id) : null) ?? (a.kind === "CREW" ? "người đi kèm" : "khách");
    if (daCo.has(don)) continue;
    daCo.add(don);
    lyDo.push(lyDoGiu("TRA_TRUOC_DON", `${don} (điểm trả số ${sau.get(a.alight_stop_id!)} đứng trước điểm đón số ${sau.get(a.board_stop_id!)})`));
  }
  return loi409("thu_tu_dao", lyDo);
}
/**
 * Đ1.4 (HT-02) — "Đã tới" ở một điểm TRẢ khi còn suất CHỜ LÊN xuống ở đó mà điểm đón chưa tới → câu 409 cụ thể: "Còn khách chưa đón ở điểm đón số N
 * (tên danh mục) sẽ xuống ở đây — tới điểm đón trước." Nơi chữ tự do chỉ hiện số (có thể chứa tên / SĐT khách — LC-18). null = cho qua.
 */
export function chanToiDiemTra(stops: readonly StopRow[], allocs: readonly AllocRow[], diemTraId: string): Response | null {
  const don = diemDonChuaToiCuaDiemTra(
    diemTraId,
    stops.map((s) => ({ id: s.id, trangThai: s.status })),
    allocs.map((a) => ({ diemLen: a.board_stop_id, diemXuong: a.alight_stop_id, trangThai: a.status, mo: a.valid_to_at === null })),
  );
  if (don.length === 0) return null;
  const ten = don.map((id) => {
    const s = stops.find((x) => x.id === id)!;
    return `điểm đón số ${s.seq}${s.location_name ? ` (${s.location_name})` : ""}`;
  });
  return loi409("con_khach_chua_don", [], {}, `Còn khách chưa đón ở ${ten.join(", ")} sẽ xuống ở đây — tới điểm đón trước.`);
}

/** Mã lý do phá lệ / huỷ hợp lệ: đang dùng, đúng nhóm. */
export const lyDoHopLe = (chung: DuLieuChung, code: string, nhom: string): boolean => chung.lyDo.some((r) => r.code === code && r.reason_group === nhom);
export const nhanLyDo = (chung: DuLieuChung, code: string): string => chung.lyDo.find((r) => r.code === code)?.label ?? code;

// ---- Lệnh lặp (LC-11) — mã lệnh dùng lại (C38) ------------------------------------------------------------------------------------------------------------
/** 409 khi mã lệnh (requestId) đã thuộc sự kiện của một thao tác KHÁC — không ghi gì. */
export const MA_LENH_DUNG_LAI = () => loi409("request_id_reused");
/**
 * Lệnh đang gửi, để so với sự kiện đã mang cùng request_id (C38 — báo cáo ERP 2026-10-07): `tripId` = chuyến mà sự kiện của lệnh GHI vào (`trip_id`; lệnh
 * dời: chuyến ĐÍCH; null: lệnh tạo — chưa có chuyến); `nguonId` = chuyến liên quan (`related_trip_id`; chỉ lệnh dời: chuyến NGUỒN; vắng = sự kiện không có
 * chuyến liên quan); `loai` = các loại sự kiện lệnh này sinh ra (mỗi lệnh hôm nay sinh đúng MỘT loại — đọc ở các hàm `lo*` của dieu-phoi.ts); `suatId` /
 * `diemId` = suất / điểm mà lệnh nhắm (đường dẫn `:aid` / `:sid`, thân `suatId`) — vắng = không so.
 */
export interface LenhCanLap {
  tripId: string | null;
  nguonId?: string;
  loai: readonly LoaiSuKienChuyen[];
  suatId?: string;
  diemId?: string;
}
/**
 * Sự kiện `ev` (cùng request_id) có phải của CHÍNH lệnh `k` không: đúng CẶP chuyến (`trip_id` = `tripId`, `related_trip_id` = `nguonId` — lệnh dời P→Q chỉ
 * khớp sự kiện ghi ở Q có nguồn P; dời ngược Q→P hay P→Z cùng mã đều lệch), đúng loại, đúng suất / điểm khi lệnh nhắm một suất / điểm. Hàm thuần.
 */
export function khopLenhLap(ev: SuKienYeuCauRow, k: LenhCanLap): boolean {
  if (k.tripId !== null && ev.trip_id !== k.tripId) return false;
  if (ev.related_trip_id !== (k.nguonId ?? null)) return false;
  if (!(k.loai as readonly string[]).includes(ev.kind)) return false;
  if (k.suatId !== undefined && ev.allocation_id !== k.suatId) return false;
  if (k.diemId !== undefined && ev.stop_id !== k.diemId) return false;
  return true;
}
/**
 * Tra lệnh lặp trước khi chạy lệnh (route): `null` = mã mới → chạy lệnh; dòng sự kiện = lệnh lặp ĐÚNG lệnh này → trả kết quả hiện tại (không ghi); `Response`
 * 409 `request_id_reused` = mã đã thuộc thao tác khác (trước đây trả 200 mà không làm gì).
 */
export async function traLenhLap(db: D1Database, requestId: string, k: LenhCanLap): Promise<SuKienYeuCauRow | null | Response> {
  const ev = await eventByRequest(db, requestId);
  if (!ev) return null;
  return khopLenhLap(ev, k) ? ev : MA_LENH_DUNG_LAI();
}
/**
 * Lệnh của một lô, suy từ câu `SU_KIEN` (khoá dựng cùng câu ghi — `suKien` / `suKienTienDo`): đúng chuyến, loại, điểm, suất mà lô định ghi. Lệnh tạo chuyến
 * không so chuyến — id chuyến mới sinh riêng mỗi request, nên lần gửi lặp đồng thời mang id khác. Lô không có câu sự kiện → null (giữ cách cũ).
 */
function lenhCuaLo(lo: readonly CauCoNhan[]): LenhCanLap | null {
  const sk: SuKienCuaLo | undefined = lo.find((c) => c.suKien)?.suKien;
  if (!sk) return null;
  return {
    tripId: sk.loai === "CREATED" ? null : sk.tripId, ...(sk.relatedTripId !== null ? { nguonId: sk.relatedTripId } : {}), loai: [sk.loai],
    ...(sk.allocationId !== null ? { suatId: sk.allocationId } : {}), ...(sk.stopId !== null ? { diemId: sk.stopId } : {}),
  };
}

// ---- Chạy lô -----------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chạy MỘT lô (`db.batch` — nguyên tử). Câu cổng thua (câu 0; lệnh dời: cả câu 1) → lệnh lặp cùng requestId (LC-11) thì coi như đã làm, không thì 409 stale.
 * Lỗi ràng buộc CSDL (lớp thứ hai) → 409 `trip_rule`; UNIQUE request_id → lệnh lặp. Lỗi lạ ném lên. "Lệnh lặp" chỉ khi sự kiện đã có khớp lệnh của lô
 * (`khopLenhLap` với `lenhCuaLo`) — mã lệnh của thao tác khác gửi đồng thời → 409 `request_id_reused` (C38).
 */
export async function chayLo(db: D1Database, lo: readonly CauCoNhan[], requestId: string, soCong = 1): Promise<{ ok: true } | { ok: false; res: Response }> {
  const lap = async (): Promise<{ ok: true } | { ok: false; res: Response } | null> => {
    const ev = await eventByRequest(db, requestId);
    if (!ev) return null;
    const k = lenhCuaLo(lo);
    return k === null || khopLenhLap(ev, k) ? { ok: true } : { ok: false, res: MA_LENH_DUNG_LAI() };
  };
  try {
    const kq = await db.batch(lo.map((c) => c.stmt));
    for (let i = 0; i < soCong; i++) {
      if ((kq[i]?.meta.changes ?? 0) === 0) return (await lap()) ?? { ok: false, res: CHUYEN_CU() };
    }
    return { ok: true };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: vc_trip_event\.request_id/.test(m)) {
      const r = await lap();
      if (r) return r;
    }
    const r = loiRangBuocChuyen(m);
    if (r) return { ok: false, res: error(r.status, r.code, r.message) };
    throw e;
  }
}

// ---- Dựng điểm từ chặng (I40): gộp theo khoá so sánh nơi, không theo chữ đã che ---------------------------------------------------------------------------
/** Điểm (chưa tới) của chuyến có đúng khoá nơi + loại — dùng lại; không có thì dựng điểm MỚI (thứ tự cuối). Trả id điểm. */
export function diemChoKhoa(
  stops: readonly StopRow[], moi: DiemMoi[], tripId: string, loai: "PICKUP" | "DROPOFF", khoa: string, diemDanhMuc: string | null, chu: string | null,
): string {
  const co = stops.find((s) => s.trip_id === tripId && s.kind === loai && s.place_key === khoa && s.status === "PENDING") ?? moi.find((d) => d.tripId === tripId && d.loai === loai && d.placeKey === khoa);
  if (co) return co.id;
  const seq = Math.max(0, ...stops.filter((s) => s.trip_id === tripId).map((s) => s.seq), ...moi.filter((d) => d.tripId === tripId).map((d) => d.seq)) + 1;
  const id = crypto.randomUUID();
  moi.push({ id, tripId, seq, loai, locationId: diemDanhMuc, placeText: diemDanhMuc ? null : maskLongDigits(chu ?? ""), placeKey: khoa });
  return id;
}
/**
 * HT-01 (kiểm theo vai 2/10 — V1.2): sau khi dựng điểm bằng `diemChoKhoa` (điểm trả DÙNG LẠI theo khoá nơi có thể đứng trước điểm đón MỚI), sắp lại điểm
 * CHƯA TỚI của chuyến để mọi điểm đón của một suất đứng trước điểm trả của suất đó, giữ thứ tự tương đối còn lại (MỘT luật: `sapDonTruocTra`). `suat` =
 * suất còn mở SAU lệnh (cũ + mới). Điểm MỚI: đổi `seq` ngay trong `moi` (chèn đúng số); điểm ĐÃ CÓ: trả `{ id, seq }` để lô đổi thứ tự (`STOP_SET_SEQ`).
 * `boQua`: điểm lô này sẽ bỏ qua (I20) — không xét, giữ số. Chỉ sắp, không chặn: chặn "trả trước đón" ở cổng xuất bến chờ ADR-0096.
 */
export function sapLaiDiem(
  stops: readonly StopRow[], moi: DiemMoi[], tripId: string, suat: readonly { board: string | null; alight: string | null }[], boQua: readonly string[] = [],
): { id: string; seq: number }[] {
  const bo = new Set(boQua);
  const cu = stops.filter((s) => s.trip_id === tripId && s.status === "PENDING" && !bo.has(s.id));
  const mMoi = moi.filter((d) => d.tripId === tripId);
  const doi = sapDonTruocTra(
    [...cu.map((s) => ({ id: s.id, seq: s.seq, dangCho: true })), ...mMoi.map((d) => ({ id: d.id, seq: d.seq, dangCho: true }))],
    suat.map((x) => ({ diemLen: x.board, diemXuong: x.alight })),
  );
  for (const d of mMoi) d.seq = doi.get(d.id) ?? d.seq;
  return cu.flatMap((s) => (doi.has(s.id) ? [{ id: s.id, seq: doi.get(s.id)! }] : []));
}
/** Điểm chưa tới (PENDING) không còn suất mở nào (lên hoặc xuống) sau lệnh → bỏ qua `BO_QUA_KHONG_CON_KHACH` (I20). */
export function diemKhongConKhach(stops: readonly StopRow[], tripId: string, conMo: readonly { board: string | null; alight: string | null }[]): string[] {
  return stops.filter((s) => s.trip_id === tripId && s.status === "PENDING" && !conMo.some((a) => a.board === s.id || a.alight === s.id)).map((s) => s.id);
}

// ---- Chuỗi nhật ký (danh sách TRẮNG — kế hoạch mục 1.1: mã chuyến, mã đơn, biển số, con số, nhãn lý do, mã luật phá lệ, chiều, tên nơi danh mục) -----------
/** "HH:MM dd/mm" (năm khi khác năm của lúc lệnh chạy `bayGioMs` — Kiểu D, một hàm `ngayNgan`). */
export const gioNgan = (ms: number, bayGioMs: number): string => {
  const { date, time } = msToVnLocal(ms);
  return `${time} ${ngayNgan(date, msToVnLocal(bayGioMs).date)}`;
};
const TEN_LUAT_PHA_LE: Record<MaLuatPhaLe, string> = { MOC_TOI_THIEU: "mốc tối thiểu", KHOANG_NGHI: "khoảng nghỉ", CAM_KET: "cam kết" };
/**
 * Đuôi nhật ký của MỘT luật bị vượt (ADR-0104 Đ1 mục 4) — lớp quyết LÚC GHI theo luật (`lopCuaLuat`): `KHAN_CAP` " · điều chỉnh khẩn cấp <luật>: <lý do>",
 * `QUAN_TRI` " · phá lệ <luật>: <lý do>". Số phút còn lại đi riêng, một lần mỗi lô (`gioKhanCapNhatKy`). Chỉ tên luật + nhãn lý do (LC-18).
 */
export const phaLeNhatKy = (luat: MaLuatPhaLe, nhan: string, v: Pick<VuotLenh, "duoiMoc" | "lenhMoc">): string =>
  ` · ${lopCuaLuat(luat, v.duoiMoc, v.lenhMoc) === "KHAN_CAP" ? "điều chỉnh khẩn cấp" : "phá lệ"} ${TEN_LUAT_PHA_LE[luat]}: ${nhan}`;
/**
 * ADR-0104 Đ1 mục 4: "cộng số phút còn lại tới giờ xuất bến" — MỘT lần mỗi lô, khi lô ghi ít nhất một luật lớp `KHAN_CAP` (`luatDaGhi` = các luật lô này ghi
 * đuôi). " · còn N phút" (N = `conPhut`, giờ xét mốc của lệnh); quá giờ mà xe chưa chạy " · quá giờ xuất bến N phút"; xe đang chạy " · xe đang chạy".
 */
export function gioKhanCapNhatKy(luatDaGhi: readonly (MaLuatPhaLe | null | undefined)[], v: Pick<VuotLenh, "duoiMoc" | "lenhMoc" | "conPhut">): string {
  if (!luatDaGhi.some((l) => l && lopCuaLuat(l, v.duoiMoc, v.lenhMoc) === "KHAN_CAP")) return "";
  if (v.conPhut === null) return " · xe đang chạy";
  return v.conPhut >= 0 ? ` · còn ${v.conPhut} phút` : ` · quá giờ xuất bến ${-v.conPhut} phút`;
}
export const maDonGon = (codes: readonly string[]): string => [...new Set(codes)].sort().join(", ");

// ---- Chi tiết chuyến ---------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chi tiết MỘT chuyến cho văn phòng (GET /chuyen/:id và phản hồi mọi lệnh ghi). `lich` (chặng quanh ngày chạy) và `hk` (tên khách) do thân route đọc sau
 * `can(trip.view)` — R-P1: `trip.view = any` ⇒ `contact.view = any`. Nhãn người bấm qua hàm tiêm (R-P20 — một lần cho cả danh sách id).
 */
export async function chiTietChuyen(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], kemTen: boolean,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, quyenGoiBao: QuyenGoiBao, bayGioMs: number, chung?: DuLieuChung,
): Promise<ChuyenChiTietResponse> {
  const nowIso = new Date(bayGioMs).toISOString();
  const c = chung ?? (await docChung(db, nowIso, msToVnLocal(bayGioMs).date));
  const nc: NguCanhChuyen = await docNguCanh(db, nen, lich, c, [], bayGioMs);
  const t = nen.trip;
  const cs = chinhSachVao(c.chinhSach);
  const lyDoGiu = lyDoGiuDuPhong(t, nc, c, bayGioMs, true);
  const lichRa = dungLichChung({
    chang: [...nc.chang.values()], changNgoai: nc.changNgoai, nhap: [], chuyen: [nc.chuyen], suat: [...nc.suat, ...nc.suatMoCuaChang.filter((s) => s.tripId !== t.id)],
    diem: nc.diem, chuyenKhac: nc.chuyenKhac, chinhSach: cs, hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs,
  });
  const legCua = new Set(nen.legIds);
  const canhBao = lichRa.canhBao.filter((x) => x.tripId === t.id || (x.legId !== null && legCua.has(x.legId) && x.loai !== "CHUYEN_GIU"));
  // ADR-0051: mốc giờ hẹn của các chặng trên chuyến (khối goiBao) — nhãn người bấm "Đã gọi báo" lấy CHUNG lời gọi nhãn (R-P20: một lần mỗi request).
  const dGoiBao = await docGoiBao(db, nen.legIds);
  const nguoiIds = [...new Set([...nen.events.flatMap((e) => (e.created_by ? [e.created_by] : [])), ...nguoiBamGoiBao(dGoiBao)])];
  const nhan = await nhanNhanVien(nguoiIds);
  const tenDiKem = nen.allocs.some((a) => a.kind === "CREW" && a.valid_to_at === null) ? await tenNguoiDiKem(db, nen.trip.id) : undefined;
  const ten = new Map<string, { fullName: string; birthYear: number }>();
  // Họ tên + năm sinh CHỈ ở GET /chuyen/:id (kế hoạch mục 1.8, TC-39 — "đúng hai route van-chuyen trả tên"): phản hồi lệnh ghi không kèm tên (màn tải lại chi tiết).
  if (kemTen) for (const ch of hk) for (const n of ch.nguoi) ten.set(n.personKey, { fullName: n.fullName, birthYear: n.birthYear });
  const lyDoNhan = new Map(c.lyDo.map((r) => [r.code, r.label]));
  const xeRow = c.xe.find((x) => x.id === t.vehicle_id);
  // Đợt 4 G3: TÊN tuyến (kể cả đã ngưng dùng) để form sửa chuyến điền sẵn — chỉ tên, không giá.
  const tuyenRow = t.route_code ? await findRoute(db, t.route_code) : null;
  return {
    chuyen: {
      ...chuyenTomTat(t, {
        xe: xeRow, chung: c, stops: nen.stops, allocs: nen.allocs, events: nen.events, lyDoGiu, nhan, bayGioMs,
        legDonHuy: new Set(nc.changNgoai.filter((x) => x.lyDo === "DON_DA_HUY").map((x) => x.legId)), // ADR-0104 Đ2.7 — cùng nguồn lý do giữ DON_DA_HUY
      }),
      nghiPhaLe: t.rest_override_reason_code !== null,
      lyDoHuy: t.cancel_reason_code ? (lyDoNhan.get(t.cancel_reason_code) ?? null) : null,
      lyDoKetThuc: t.end_reason_code ? (lyDoNhan.get(t.end_reason_code) ?? null) : null,
      tuyen: t.route_code ? { ma: t.route_code, ten: tuyenRow?.name ?? t.route_code } : null,
    },
    diem: nen.stops.map((s) => diemChuyenDto(s, { allocs: nen.allocs, chang: nc.chang, stops: nen.stops, events: nen.events, nhan })),
    suat: nen.allocs.filter((a) => a.valid_to_at === null).map((a) => suatChuyenDto(a, { changLich: nc.changLich, changNgoai: nc.changNgoai, ten, events: nen.events, nhan, tenDiKem, lyDoNhan })),
    canhBao: canhBao.map(canhBaoDto),
    nhatKy: nhatKyChuyenDto(nen.events, nhan, lyDoNhan),
    banChup: banChupDto(await banChupCuoi(db, t.id)),
    lyDo: lyDoDangDung(c),
    xe: xeChon(c),
    taiXe: taiXeChon(c),
    mocToiThieuPhut: c.chinhSach?.min_lead_minutes ?? null,
    canhBaoPhut: c.chinhSach?.warn_lead_minutes ?? null,
    gioSomNhatKhai: gioSomNhatKhaiDto(
      { events: nen.events, kepLuiPhut: c.chinhSach?.proxy_backdate_max_minutes ?? null, truoc: ketThucTruoc(nc.chuyenKhacRow, t), bayGioMs }, t, nen.stops, nen.allocs,
    ),
    goiBao: (await Promise.all(nen.legIds.map((id) => goiBaoChang(id, hk, dGoiBao, quyenGoiBao, nhan)))).filter((x): x is GoiBaoChangDto => x !== null),
  };
}

/**
 * Lý do GIỮ dự phóng "xuất bến đúng giờ" của chuyến chưa chạy (cổng xuất bến — cùng một hàm với lệnh xuất bến); chuyến khác trạng thái: rỗng. `xetCuaSo` (ADR-0096
 * Đ2.5): màn CHI TIẾT (văn phòng, tài xế) xét cửa sổ xuất bến theo GIỜ THẬT để lý do hiện ngay khi đọc; danh sách cuốc thì không (dự phóng luôn trong cửa sổ).
 */
function lyDoGiuDuPhong(t: TripRow, nc: NguCanhChuyen, c: DuLieuChung, bayGioMs: number, xetCuaSo: boolean): LyDoGiu[] {
  if (t.status !== "PLANNED") return [];
  const vao: KiemXuatBenVao = {
    chuyen: nc.chuyen, suat: nc.suat, chang: [...nc.chang.values()], changNgoai: nc.changNgoai, suatMoCuaChang: nc.suatMoCuaChang, diem: nc.diem, chuyenKhac: nc.chuyenKhac,
    chinhSach: chinhSachVao(c.chinhSach), hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs: Math.max(bayGioMs, t.planned_start_ms), xuatBenMs: Math.max(bayGioMs, t.planned_start_ms),
    ...(xetCuaSo ? { cuaSoXetMs: bayGioMs } : {}),
  };
  return kiemXuatBen(vao).lyDo;
}

// ---- DTO TÀI XẾ (route 19, 20 và phản hồi lệnh tiến độ của tài xế — Task A15) ---------------------------------------------------------------------------------
/**
 * Chi tiết một chuyến tài xế đang lái. `lich` (chặng — mã đơn, giờ hẹn, điều kiện còn thiếu), `hk` (tên khách — rỗng ngoài ngày chạy), `lienHe` (chỉ GET
 * chi tiết trong ngày chạy; null ở chỗ khác) do THÂN ROUTE đọc sau `can(trip.view / trip.progress, { assigned })`. Nhãn người văn phòng khai giờ qua hàm tiêm
 * (R-P11 / R-P20 — một lần mỗi request). `kemChiDuong` (ADR-0105, tự áp G18-B): chữ `true` CHỈ ở GET chi tiết — trong ngày chạy mọi điểm có chuỗi đích "Chỉ
 * đường"; phản hồi lệnh truyền chữ `false` (bài 3 của src/hanh-khach-khong-lo-ten.test.ts quét mã).
 */
export async function cuocChiTiet(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], lienHe: readonly LienHeTaiXe[] | null,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, bayGioMs: number, trongNgay: boolean, kemChiDuong: boolean,
): Promise<CuocChiTietResponse> {
  const c = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  const nc = await docNguCanh(db, nen, lich, c, [], bayGioMs);
  const t = nen.trip;
  const nhan = await nhanNhanVien([...new Set(nen.events.flatMap((e) => (e.created_by && e.occurred_source === "VAN_PHONG_KHAI" ? [e.created_by] : [])))]);
  const tenDiKem = nen.allocs.some((a) => a.kind === "CREW" && a.valid_to_at === null) ? await tenNguoiDiKem(db, nen.trip.id) : undefined;
  const ten = new Map<string, { fullName: string; birthYear: number }>();
  const lyDoNhan = new Map(c.lyDo.map((r) => [r.code, r.label]));
  if (trongNgay) for (const ch of hk) for (const n of ch.nguoi) ten.set(n.personKey, { fullName: n.fullName, birthYear: n.birthYear });
  const chiDuong = trongNgay && kemChiDuong ? new Map(nen.stops.map((s) => [s.id, chuoiDichCuaDiem(s)])) : null;
  return cuocChiTietDto({
    trip: t, xe: c.xe.find((x) => x.id === t.vehicle_id), events: nen.events,
    diem: nen.stops.map((s) => diemChuyenDto(s, { allocs: nen.allocs, chang: nc.chang, stops: nen.stops, events: nen.events, nhan })),
    suat: nen.allocs.filter((a) => a.valid_to_at === null).map((a) => suatChuyenDto(a, { changLich: nc.changLich, changNgoai: nc.changNgoai, ten, events: nen.events, nhan, tenDiKem, lyDoNhan })),
    lienHe, conThieu: lyDoGiuCuaChuyen(t, lyDoGiuDuPhong(t, nc, c, bayGioMs, true), bayGioMs, c.chinhSach?.min_lead_minutes ?? null), lyDo: c.lyDo.filter((r) => r.reason_group === "KET_THUC_GIAN_DOAN"), nhan, trongNgay,
    chiDuong,
  });
}
/** "Cuốc của tôi" (route 19, R-P17): mỗi chuyến — không tên, không SĐT; điều kiện còn thiếu = lý do giữ dự phóng (chuyến chưa chạy). */
export async function danhSachCuoc(db: D1Database, trips: readonly TripRow[], lich: readonly ChangLichChung[], bayGioMs: number): Promise<CuocCuaToiItemDto[]> {
  if (trips.length === 0) return [];
  const c = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  const ids = trips.map((t) => t.id);
  const [stops, allocs, events] = await Promise.all([stopsByTrips(db, ids), allocsByTrips(db, ids), eventsByTrips(db, ids)]);
  await boSungXe(db, c, trips.map((t) => t.vehicle_id));
  const ra: CuocCuaToiItemDto[] = [];
  for (const t of trips) {
    const a = allocs.filter((x) => x.trip_id === t.id);
    const nen: NenChuyen = {
      trip: t, stops: stops.filter((x) => x.trip_id === t.id), allocs: a, events: events.filter((e) => e.trip_id === t.id || e.related_trip_id === t.id),
      legIds: [...new Set(a.flatMap((x) => (x.kind === "PASSENGER" && x.leg_id !== null ? [x.leg_id] : [])))], tu: "", den: "",
    };
    const conThieu = t.status === "PLANNED"
      ? lyDoGiuCuaChuyen(t, lyDoGiuDuPhong(t, await docNguCanh(db, nen, lich, c, [], bayGioMs), c, bayGioMs, false), bayGioMs, c.chinhSach?.min_lead_minutes ?? null)
      : [];
    ra.push(cuocCuaToiItem(t, { xe: c.xe.find((x) => x.id === t.vehicle_id), stops: nen.stops, allocs: a, conThieu }));
  }
  return ra;
}
