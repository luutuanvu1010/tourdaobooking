// NHẮC "GỌI BÁO KHÁCH" KHI GIỜ HẸN ĐỔI SAU KHI XẾP XE (ADR-0051 GB1 — accepted 29/9, "Trả lời lần 14"). Luật THUẦN một nguồn cho máy chủ và màn hình (không
// I/O, không import module; import kèm đuôi .ts). Test cạnh tệp: goi-bao.test.ts (TC-GB-3).
// "Mốc giờ hẹn đã biết" của chặng = chuỗi dòng chỉ-thêm `vc_leg_appt_ack` (0043): XEP (máy chụp lúc chặng LẦN ĐẦU lên xe), DA_GOI (người bấm "Đã gọi báo"),
// BO_DANH_DAU (dòng đảo). Mốc hiện hành = dòng seq lớn nhất. Một chặng CÓ MỤC "Giờ hẹn đổi — gọi báo khách" khi đủ bốn điều:
//   1. còn ít nhất một suất khách MỞ, trạng thái WAITING, trên chuyến PLANNED / RUNNING;
//   2. đơn chưa huỷ, chặng còn mở (giờ hẹn hiện hành đọc được — không thì lý do giữ cũ lo, không có mục);
//   3. chặng có mốc;
//   4. (ngày, giờ) hẹn HIỆN HÀNH khác (ngày, giờ) của mốc — so "IS": giờ NULL ("chưa chốt giờ") là một giá trị.
// Một mục mỗi CHẶNG (không mỗi suất): chặng tách hai xe → một mục kèm mọi mã chuyến ở điều 1.

export const GIO_HEN_DOI = "GIO_HEN_DOI" as const;
export const NHAN_GIO_HEN_DOI = "Giờ hẹn đổi — gọi báo khách";
export const AI_XU_LY_GIO_HEN_DOI = "Người phụ trách đơn";
/** Phạm vi danh sách nhắc: chuyến có ngày chạy trong [hôm nay − 1, hôm nay + NHAC_GOI_SO_NGAY] (ADR-0051 "Nơi hiện", G-GB-5 — hằng, đổi bằng mã). */
export const NHAC_GOI_SO_NGAY = 14;
/** Lệnh "Đã gọi báo" / "Bỏ đánh dấu" không làm được: không còn gì để gọi (mục đã hết) / màn đã cũ (giờ vừa đổi hoặc người khác vừa bấm). */
export const MA_TU_CHOI_GOI_BAO = ["khong_con_can_goi", "gio_hen_vua_doi"] as const;
export type MaTuChoiGoiBao = (typeof MA_TU_CHOI_GOI_BAO)[number];
export const NHAN_TU_CHOI_GOI_BAO: Readonly<Record<MaTuChoiGoiBao, string>> = {
  khong_con_can_goi: "Không còn cần gọi báo — khách đã lên xe, chuyến đã xong / huỷ, hoặc giờ hẹn đã về như cũ.",
  gio_hen_vua_doi: "Giờ hẹn vừa đổi hoặc đã có người báo — tải lại.",
};

export type LoaiMoc = "XEP" | "DA_GOI" | "BO_DANH_DAU";
export interface GioHen {
  /** Ngày hẹn "YYYY-MM-DD" (giờ VN). */
  ngay: string;
  /** Giờ hẹn "HH:MM"; null = chưa chốt giờ. */
  gio: string | null;
}
/** Một dòng mốc (`vc_leg_appt_ack`). */
export interface MocVao {
  seq: number;
  loai: LoaiMoc;
  gio: GioHen;
  /** Giờ "đã biết" TRƯỚC dòng này — null ở XEP. */
  truoc: GioHen | null;
  /** Lúc ghi (ISO) + người ghi (id tài khoản; null ở XEP gieo tay). */
  luc: string;
  nguoiId: string | null;
}
/** Một suất khách của chặng (mọi chuyến) — chỉ khoá + trạng thái. */
export interface SuatGoiBao {
  tripId: string;
  maChuyen: string;
  ngayChuyen: string;
  trangThaiChuyen: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
  trangThai: "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED_AT_STOP" | "DROPPED";
  mo: boolean;
}
/** Giờ hẹn HIỆN HÀNH của chặng (đọc theo id qua hàm hẹp của orders — chỉ chặng mở của đơn đã xác nhận, chưa huỷ); null = không đọc được (đơn huỷ / chặng đóng). */
export interface ChangGoiBao {
  legId: string;
  orderId: string;
  orderCode: string;
  chieu: "OUT" | "RETURN";
  gio: GioHen;
}
export interface MucGioHenDoi {
  legId: string;
  orderId: string;
  orderCode: string;
  chieu: "OUT" | "RETURN";
  cu: GioHen;
  moi: GioHen;
  /** seq của mốc hiện hành — màn gửi lại khi bấm (khoá lạc quan của họ lệnh này). */
  phienBan: number;
  /** Mã các chuyến đang chở khách CHỜ ĐÓN của chặng (điều 1), sắp theo ngày chuyến rồi mã. */
  maChuyen: string[];
  /** Ngày chuyến sớm nhất trong số đó. */
  ngayChuyen: string;
}

export const cungGio = (a: GioHen, b: GioHen): boolean => a.ngay === b.ngay && (a.gio ?? null) === (b.gio ?? null);
export const mocHienHanh = (dong: readonly MocVao[]): MocVao | null => dong.reduce<MocVao | null>((m, d) => (m === null || d.seq > m.seq ? d : m), null);
/** Suất làm điều 1 đúng: mở, WAITING, chuyến chưa kết thúc. */
const choDon = (s: SuatGoiBao): boolean => s.mo && s.trangThai === "WAITING" && (s.trangThaiChuyen === "PLANNED" || s.trangThaiChuyen === "RUNNING");
export const conKhachCho = (suat: readonly SuatGoiBao[]): boolean => suat.some(choDon);

/** Mục "Giờ hẹn đổi — gọi báo khách" của MỘT chặng, hoặc null (đủ bốn điều ở đầu tệp). */
export function mucGioHenDoi(v: { chang: ChangGoiBao | null; moc: readonly MocVao[]; suat: readonly SuatGoiBao[] }): MucGioHenDoi | null {
  const cho = v.suat.filter(choDon);
  if (cho.length === 0 || v.chang === null) return null;
  const m = mocHienHanh(v.moc);
  if (m === null || cungGio(m.gio, v.chang.gio)) return null;
  const chuyen = [...new Map(cho.map((s) => [s.tripId, s])).values()].sort((a, b) => (a.ngayChuyen === b.ngayChuyen ? (a.maChuyen < b.maChuyen ? -1 : 1) : a.ngayChuyen < b.ngayChuyen ? -1 : 1));
  return {
    legId: v.chang.legId, orderId: v.chang.orderId, orderCode: v.chang.orderCode, chieu: v.chang.chieu, cu: m.gio, moi: v.chang.gio, phienBan: m.seq,
    maChuyen: chuyen.map((s) => s.maChuyen), ngayChuyen: chuyen[0]!.ngayChuyen,
  };
}
/** Dấu "đã gọi báo" còn đúng: mốc hiện hành là DA_GOI và giờ hiện hành = giờ của mốc (khách còn chờ đón) — V2 hiện "đã gọi báo khách (tên, giờ)". */
export function daGoiBao(v: { chang: ChangGoiBao | null; moc: readonly MocVao[]; suat: readonly SuatGoiBao[] }): MocVao | null {
  const m = mocHienHanh(v.moc);
  if (m === null || m.loai !== "DA_GOI" || v.chang === null || !conKhachCho(v.suat) || !cungGio(m.gio, v.chang.gio)) return null;
  return m;
}
export type KetQuaGoiBao = { ok: true } | { ok: false; ma: MaTuChoiGoiBao };
/** "Đã gọi báo": phải có mục; `phienBan` + `gioMoi` màn gửi phải khớp mục hiện tại (không thì màn đã cũ). */
export function kiemDaGoiBao(v: { muc: MucGioHenDoi | null; phienBan: number; gioMoi: GioHen }): KetQuaGoiBao {
  if (v.muc === null) return { ok: false, ma: "khong_con_can_goi" };
  if (v.phienBan !== v.muc.phienBan || !cungGio(v.gioMoi, v.muc.moi)) return { ok: false, ma: "gio_hen_vua_doi" };
  return { ok: true };
}
/** "Bỏ đánh dấu": dòng cuối (seq = phienBan) là DA_GOI và chặng còn khách chờ đón. */
export function kiemBoDanhDau(v: { moc: readonly MocVao[]; phienBan: number; suat: readonly SuatGoiBao[] }): KetQuaGoiBao {
  if (!conKhachCho(v.suat)) return { ok: false, ma: "khong_con_can_goi" };
  const m = mocHienHanh(v.moc);
  if (m === null || m.seq !== v.phienBan || m.loai !== "DA_GOI" || m.truoc === null) return { ok: false, ma: "gio_hen_vua_doi" };
  return { ok: true };
}
/** Chữ "A → B" cho nhật ký / màn (G-GB-3): kèm "dd/mm" khi ngày khác; "chưa chốt giờ" khi giờ NULL. */
export function moTaDoiGio(cu: GioHen, moi: GioHen): string {
  const khacNgay = cu.ngay !== moi.ngay;
  const mot = (g: GioHen) => `${khacNgay ? `${g.ngay.slice(8, 10)}/${g.ngay.slice(5, 7)} ` : ""}${g.gio ?? "chưa chốt giờ"}`;
  return `${mot(cu)} → ${mot(moi)}`;
}
