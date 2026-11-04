// Cổng Trả sau của `orders` (ADR-0168 Đ2): hình thức thanh toán nằm trên đơn, còn HẠN MỨC và SỐ NỢ thuộc `billing` — `orders` chỉ nhận hàm do gốc lắp ráp tiêm vào `ctx`
// (khuôn `cocChoXacNhan`, ADR-0159). Hai cửa: `congTraSauKhiLuu` (lưu đơn — báo sớm) và `traSauChoXacNhan` (lô xác nhận — chốt thật, kèm câu gác phiên bản và hạn trả).
// KHÔNG tự kiểm quyền người gọi (route đã làm). Không nhắc bảng `bil_`, không import `billing` (bài src/architecture.test.ts, src/dat-coc-noi-goi.test.ts).
import { error } from "../../shared/http";
import { hanTraTu, type HinhThucThanhToan, type KetQuaKiemTraSau } from "../../shared/tra-sau";

/** Phần «câu gác phiên bản và hạn trả» của lô xác nhận. Nơi gọi chỉ lấy từ `traSauChoXacNhan` (bài src/tra-sau-duong-ghi.test.ts). */
export type KemTraSau = (i: { at: string; auditId: string }) => D1PreparedStatement[];
/** Chỉ bài kiểm và đơn Trả trước (`traSauChoXacNhan`) dùng. */
export const KHONG_TRA_SAU: KemTraSau = () => [];

/** Hai hàm do gốc lắp ráp tiêm (xem `ctx.kiemTraSau`, `ctx.cauGacPhienBanTraSau` ở src/shared/router.ts). */
export interface HamTraSau {
  kiemTraSau: (i: { benDat: string; soTienDon: number; boQuaDon?: string }) => Promise<KetQuaKiemTraSau | null>;
  cauGacPhienBanTraSau: (partyId: string, version: number, at: string) => D1PreparedStatement[];
}

export const CAU_TRA_SAU_KHONG_COC = "Đơn trả sau không nhận tiền khách đặt cọc trước. Hãy để trống ô đặt cọc hoặc chọn trả trước.";
export const CAU_TRA_SAU_THIEU_BEN_DAT = "Đơn trả sau cần chọn bên đặt là đối tác có hạn mức trả sau.";
const CHUA_DUNG_DUOC = () => error(503, "tra_sau_chua_dung_duoc", "Chưa kiểm được hạn mức trả sau nên chưa dùng được hình thức này — báo người phụ trách hệ thống.");

/** Đơn đủ thông tin cho cổng. `declaredDeposit` là số SẼ LƯU / đang lưu của lời khai đặt cọc. */
export interface DonTraSau { id: string | null; paymentTerm: HinhThucThanhToan; bookerPartyId: string | null; total: number; declaredDeposit: number }

async function kiemDon(h: Pick<HamTraSau, "kiemTraSau">, d: DonTraSau): Promise<{ loi: Response } | { benDat: string; kq: Extract<KetQuaKiemTraSau, { ok: true }> }> {
  if (d.declaredDeposit > 0) return { loi: error(409, "tra_sau_khong_nhan_coc", CAU_TRA_SAU_KHONG_COC) };
  if (d.bookerPartyId === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_TRA_SAU_THIEU_BEN_DAT) };
  const kq = await h.kiemTraSau({ benDat: d.bookerPartyId, soTienDon: d.total, ...(d.id ? { boQuaDon: d.id } : {}) });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, kq.cau) };
  return { benDat: d.bookerPartyId, kq };
}

/** Lưu đơn (lập mới, lưu nháp): chỉ kiểm để BÁO SỚM — chốt thật ở lô xác nhận. Đơn Trả trước không tốn một câu đọc. `null` = qua. */
export async function congTraSauKhiLuu(h: Pick<HamTraSau, "kiemTraSau">, d: DonTraSau): Promise<Response | null> {
  if (d.paymentTerm !== "CREDIT") return null;
  const r = await kiemDon(h, d);
  return "loi" in r ? r.loi : null;
}

/**
 * Xác nhận đơn: cổng hạn mức + câu của lô. Đơn Trả trước ⇒ `KHONG_TRA_SAU` (không câu nào, lô không đổi một câu). Đơn Trả sau ⇒ kiểm lại hạn mức NGAY LÚC XÁC NHẬN rồi trả câu:
 * gác phiên bản của bên đặt (đã đọc trước khi tính nợ — hai lệnh cùng lúc chỉ một lệnh qua, lệnh thua cả lô huỷ `credit_version_stale`) và ghi hạn trả = ngày xác nhận + số ngày đang áp,
 * chỉ khi dòng nhật ký `confirmed` của CHÍNH lô đã ghi (lính gác `auditId`, khuôn câu khoản thu đặt cọc).
 */
export async function traSauChoXacNhan(h: HamTraSau, db: D1Database, i: { order: DonTraSau & { id: string }; today: string }): Promise<{ loi: Response } | { traSau: KemTraSau }> {
  if (i.order.paymentTerm !== "CREDIT") return { traSau: KHONG_TRA_SAU };
  const r = await kiemDon(h, i.order);
  if ("loi" in r) return r;
  const han = hanTraTu(i.today, r.kq.hanMuc.soNgay);
  return {
    traSau: ({ at, auditId }) => [
      ...h.cauGacPhienBanTraSau(r.benDat, r.kq.version, at),
      db.prepare("UPDATE orders SET credit_due_date = ?1 WHERE id = ?2 AND payment_term = 'CREDIT' AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?3)").bind(han, i.order.id, auditId),
    ],
  };
}
