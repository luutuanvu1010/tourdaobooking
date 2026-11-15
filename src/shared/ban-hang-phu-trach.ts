// Luật THUẦN «Bán hàng phụ trách» (ADR-0142): đồng hồ giờ hành chính, lời mời có ưu tiên, ai nhận được, ai thấy thẻ cảnh báo, ô nào được giao.
// Một nguồn cho máy chủ (orders, dispatch) và giao diện. Không I/O, không đọc Date.now() (đồng hồ do nơi gọi tiêm), không import module.
// Test cạnh tệp: ban-hang-phu-trach.test.ts.
import type { OperationCode, PermissionHolder } from "./permissions.ts";

const PHUT = 60_000;
const NGAY = 24 * 60 * PHUT;
const LECH_VN = 7 * 60 * PHUT; // giờ Việt Nam UTC+7, không đổi giờ mùa hè

/** Khung giờ hành chính và chính sách đang hiệu lực (một dòng của `dsp_sales_policy`, thêm `mocPhatHanh` của view `v_dsp_sales_policy_current`). */
export interface KhungGioHanhChinh {
  /** Số phút ưu tiên của người được mời (đồng hồ chạy trong giờ hành chính). */
  phutUuTien: number;
  /** Phút trong ngày (giờ Việt Nam) bắt đầu giờ hành chính, ví dụ 420 = 07:00. */
  tuPhut: number;
  /** Phút trong ngày kết thúc giờ hành chính, ví dụ 1020 = 17:00. */
  denPhut: number;
  /** ISO UTC: mốc phát hành tính năng (đơn ghi nhận trước mốc này không vào thẻ cảnh báo). */
  mocPhatHanh: string;
}

type KhungDongHo = Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">;

/**
 * Khung 07:00–17:00 mà ADR-0142 Đ5 chốt. TẠM: Task 5 đổi các nơi đang dùng hằng này sang đọc chính sách (`v_dsp_sales_policy_current`).
 */
export const KHUNG_MAC_DINH: KhungDongHo = { tuPhut: 420, denPhut: 1020 };

function kiemKhung(khung: KhungDongHo): void {
  if (!(Number.isInteger(khung.tuPhut) && Number.isInteger(khung.denPhut) && khung.tuPhut >= 0 && khung.tuPhut < khung.denPhut && khung.denPhut <= 1440)) {
    throw new Error("khung giờ hành chính không hợp lệ");
  }
}

function docMoc(iso: string, ten: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`${ten}: mốc thời gian không hợp lệ`);
  return ms;
}

/**
 * Cộng `phut` phút GIỜ HÀNH CHÍNH vào một mốc (mọi ngày trong tuần, kể cả Chủ nhật). Ngoài khung thì đồng hồ bắt đầu chạy từ `tuPhut` (cùng ngày nếu còn
 * sớm hơn, hôm sau nếu đã từ `denPhut` trở đi); hết khung thì phần còn lại sang `tuPhut` hôm sau. Giữ phần giây của mốc gốc khi mốc nằm trong khung.
 * Trả ISO UTC.
 */
export function congPhutGioHanhChinh(mocIso: string, phut: number, khung: KhungDongHo): string {
  kiemKhung(khung);
  if (!Number.isFinite(phut) || phut < 0) throw new Error("congPhutGioHanhChinh: số phút không hợp lệ");
  let cur = docMoc(mocIso, "congPhutGioHanhChinh") + LECH_VN;
  let conLai = phut * PHUT;
  const tu = khung.tuPhut * PHUT;
  const den = khung.denPhut * PHUT;
  for (;;) {
    const dauNgay = Math.floor(cur / NGAY) * NGAY;
    const t = cur - dauNgay;
    if (t < tu) { cur = dauNgay + tu; continue; }
    if (t >= den) { cur = dauNgay + NGAY + tu; continue; }
    const choTrong = den - t;
    if (conLai <= choTrong) return new Date(cur + conLai - LECH_VN).toISOString();
    conLai -= choTrong;
    cur = dauNgay + den;
  }
}

/** Số phút giờ hành chính từ `nowIso` đến `hanIso`, làm tròn LÊN, không âm (đã quá hạn ⇒ 0). */
export function phutGioHanhChinhConLai(nowIso: string, hanIso: string, khung: KhungDongHo): number {
  kiemKhung(khung);
  const now = docMoc(nowIso, "phutGioHanhChinhConLai") + LECH_VN;
  const han = docMoc(hanIso, "phutGioHanhChinhConLai") + LECH_VN;
  const tu = khung.tuPhut * PHUT;
  const den = khung.denPhut * PHUT;
  let tong = 0;
  let cur = now;
  while (cur < han) {
    const dauNgay = Math.floor(cur / NGAY) * NGAY;
    const dau = Math.max(cur, dauNgay + tu);
    const cuoi = Math.min(han, dauNgay + den);
    if (cuoi > dau) tong += cuoi - dau;
    cur = dauNgay + NGAY;
  }
  return Math.ceil(tong / PHUT);
}

/** Cách một lời mời khép (cột `outcome` của `dsp_sales_invite`; tập đóng, khớp CHECK ở migration). */
export type KetQuaLoiMoi = "NHAN" | "TU_CHOI" | "NGUOI_KHAC" | "HUY_DON" | "RUT_LAI";

/**
 * Trạng thái một lời mời: đã khép; còn ưu tiên (người được mời còn hợp lệ và chưa quá hạn); hoặc hết ưu tiên (quá hạn, hay người được mời mất quyền).
 * `nowMs` do nơi gọi tiêm. Đúng hạn vẫn còn ưu tiên (giống `quaHanXacNhan`: chỉ quá khi SAU hạn).
 */
export function trangThaiLoiMoi(i: { hanIso: string; nowMs: number; xConHopLe: boolean; daKhep: boolean }): "UU_TIEN" | "HET_UU_TIEN" | "DA_KHEP" {
  if (i.daKhep) return "DA_KHEP";
  if (!i.xConHopLe) return "HET_UU_TIEN";
  return i.nowMs > docMoc(i.hanIso, "trangThaiLoiMoi") ? "HET_UU_TIEN" : "UU_TIEN";
}

export type LyDoKhongNhan = "da_co_nguoi" | "don_huy" | "qua_ngay_di" | "don_cu" | "dang_cho_nguoi_khac" | "khong_du_quyen" | "tai_khoan_lai" | "don_nhap";

/**
 * Ai nhận được đơn làm Bán hàng phụ trách. Thứ tự kiểm cố định (lý do trả về là lý do đầu tiên gặp): đơn nháp; tài khoản lai (giữ quyền Đối tác, kể cả
 * Quản trị lai); không đủ quyền (cần Bán hàng, hoặc Quản trị / Toàn quyền); đơn huỷ; quá ngày đi; đơn cũ (trước mốc phát hành); đã có người; đang trong
 * ưu tiên của người khác (X và Quản trị / Toàn quyền được qua). `uuTienCuaNguoiKhac` = đang có lời mời còn ưu tiên mà người được mời không phải người gọi.
 */
export function duocNhanBanHang(i: {
  giuBanHang: boolean; laQuanTriHoacToanQuyen: boolean; giuDoiTac: boolean; laX: boolean; uuTienCuaNguoiKhac: boolean;
  daCoNguoi: boolean; donHuy: boolean; quaNgayDi: boolean; laDonCu: boolean; laNhap: boolean;
}): { ok: true } | { ok: false; lyDo: LyDoKhongNhan } {
  if (i.laNhap) return { ok: false, lyDo: "don_nhap" };
  if (i.giuDoiTac) return { ok: false, lyDo: "tai_khoan_lai" };
  if (!i.giuBanHang && !i.laQuanTriHoacToanQuyen) return { ok: false, lyDo: "khong_du_quyen" };
  if (i.donHuy) return { ok: false, lyDo: "don_huy" };
  if (i.quaNgayDi) return { ok: false, lyDo: "qua_ngay_di" };
  if (i.laDonCu) return { ok: false, lyDo: "don_cu" };
  if (i.daCoNguoi) return { ok: false, lyDo: "da_co_nguoi" };
  if (i.uuTienCuaNguoiKhac && !i.laX && !i.laQuanTriHoacToanQuyen) return { ok: false, lyDo: "dang_cho_nguoi_khac" };
  return { ok: true };
}

/**
 * Đơn có vào thẻ cảnh báo «chưa có Bán hàng phụ trách» không: đã ghi nhận (gửi xác nhận / xác nhận) SAU mốc phát hành, chưa có Bán hàng phụ trách, đơn
 * chưa huỷ, chưa qua ngày đi, chưa giao, chưa hoàn thành, và đã trôi đủ `phutUuTien` phút giờ hành chính kể từ lúc ghi nhận.
 */
export function vaoTheCanhBao(i: {
  ghiNhanLuc: string | null; nowMs: number; khung: KhungGioHanhChinh; coBanHang: boolean; donHuy: boolean; quaNgayDi: boolean; daGiao: boolean; hoanThanh: boolean;
}): boolean {
  if (i.ghiNhanLuc === null || i.coBanHang || i.donHuy || i.quaNgayDi || i.daGiao || i.hoanThanh) return false;
  const ghiNhan = docMoc(i.ghiNhanLuc, "vaoTheCanhBao");
  if (ghiNhan < docMoc(i.khung.mocPhatHanh, "vaoTheCanhBao")) return false;
  const han = Date.parse(congPhutGioHanhChinh(i.ghiNhanLuc, i.khung.phutUuTien, i.khung));
  return i.nowMs >= han;
}

/**
 * Người đọc thẻ cảnh báo thấy gì thay cho thẻ: `day_du` (mở được đơn), `chi_so` (chỉ thấy con số), `khong`. Bán hàng / Quản trị / Toàn quyền: đầy đủ;
 * người lập: đầy đủ với đơn của mình; Kế toán: đầy đủ với đơn đã xác nhận, chỉ con số với đơn còn chờ; người khác: không.
 */
export function cachThayTheCanhBao(w: PermissionHolder, don: { laNguoiLap: boolean; choXacNhan: boolean }): "day_du" | "chi_so" | "khong" {
  const giu = (p: PermissionHolder["permissions"][number]) => w.permissions.includes(p);
  if (giu("SALES") || giu("ADMIN") || giu("SUPER_ADMIN")) return "day_du";
  if (don.laNguoiLap) return "day_du";
  if (giu("ACCOUNTING")) return don.choXacNhan ? "chi_so" : "day_du";
  return "khong";
}

/** Danh sách trắng ô thao tác mà Bán hàng phụ trách được cộng như «người phụ trách». KHÔNG có `order.modify` (Bán hàng phụ trách chưa được huỷ). */
export const QUYEN_DUOC_GIAO_BAN_HANG = ["order.history.view", "order.trip.edit", "order.passenger.write", "dispatch.assign", "trip.call_ack"] as const;

/** Có "được giao" cho ô `op` không: người phụ trách (HDV…) mọi ô; Bán hàng phụ trách chỉ các ô trong danh sách trắng. */
export function duocGiaoTheoO(op: OperationCode, i: { laNguoiPhuTrach: boolean; laBanHangPhuTrach: boolean }): boolean {
  return i.laNguoiPhuTrach || (i.laBanHangPhuTrach && (QUYEN_DUOC_GIAO_BAN_HANG as readonly string[]).includes(op));
}

/** Tập hành động nhật ký gác lô của Bán hàng phụ trách (view `v_aud_order_ban_hang`; migration so tập với hằng này). */
export const HANH_DONG_GAC_BAN_HANG = ["confirmed", "order_confirm_requested", "order_confirm_withdrawn", "cancelled", "order_cancelled_by_field"] as const;

/** Lỗi va chỉ mục «một dòng mở mỗi đơn» của `dsp_sales_owner` (khuôn `isOpenHandlerCollision`). Lỗi khác ⇒ false, để không nuốt lỗi thật. */
export const laVaChamOBanHang = (e: unknown): boolean => e instanceof Error && /UNIQUE constraint failed: dsp_sales_owner\.order_id/.test(e.message);
