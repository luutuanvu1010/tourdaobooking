// Ảnh biên lai chuyển khoản (ADR-0196): phần điều phối của billing — đọc trường `bienLai` của lệnh ghi khoản thu, quyết bắt buộc theo luật thuần `canBienLai`
// (src/shared/bien-lai.ts), dựng câu chèn dòng ảnh + nhật ký chỉ mã cho CÙNG lô với khoản thu. Việc kho R2 ở kho-bien-lai.ts (chạy SAU lô).
import { auditStatement } from "../audit";
import { bamSha256, taoKhoaNgauNhien, TEP_MOI_GIO } from "../../shared/tep-dinh-kem";
import { CAU_BIEN_LAI_BAT_BUOC, canBienLai, kiemBienLai, type BienLaiDaKiem } from "../../shared/bien-lai";
import { canDoiChieu } from "./rules";
import { chenAnhStatement, demAnhGanDay } from "./bien-lai-repo";
import { loi, type KetQua, type LanThuHopLe, type NguoiGoi } from "./service";

/** Cửa sổ trần ảnh / giờ (ADR-0196 Đ3 — cùng cách đếm với tệp kèm vé hỗ trợ: dòng tạo SAU mốc «bây giờ − 1 giờ»). */
export const dauCuaSoBienLai = (now: Date): string => new Date(now.getTime() - 60 * 60 * 1000).toISOString();

const BIEN_LAI_REQUIRED = () => loi(400, "bien_lai_required", CAU_BIEN_LAI_BAT_BUOC);
/** Giả định ghi ở nhật ký thi công 6A: ảnh gửi kèm khoản KHÔNG bắt buộc ⇒ 400 (siết — không lưu tệp ADR không cho). */
const BIEN_LAI_KHONG_CAN = () => loi(400, "invalid_input", "Khoản thu này không cần ảnh biên lai. Bỏ ảnh rồi lưu lại.");
export const KHO_BIEN_LAI_CHUA_BAT = () => loi(503, "storage_unavailable", "Chưa lưu được khoản thu vì kho ảnh biên lai chưa sẵn sàng. Hãy báo Kế toán ghi giúp, hoặc thử lại sau.");
const QUA_TRAN_BIEN_LAI = () => loi(429, "rate_limited", "Khoản thu chưa được ghi: bạn đã gửi quá 20 ảnh biên lai trong một giờ. Chờ khoảng một giờ rồi gửi lại.");

/** Ảnh đã kiểm + đã chuẩn bị khoá kho / băm — giữ trong bộ nhớ từ lúc dựng lô tới lúc đặt kho (khoá kho đọc lại từ D1 lúc đặt). */
export interface BienLaiChuanBi { anhId: string; key: string; bam: string; tep: BienLaiDaKiem }

/**
 * Sau khi đọc khoản thu (`docLanThu`): quyết có bắt buộc ảnh không (ADR-0196 Đ1 — đủ BỐN điều qua `canBienLai`), kiểm tệp (Đ2), kho có bật không, trần giờ (Đ3).
 * Không ghi gì. Trả null khi khoản không cần ảnh và không gửi ảnh.
 */
export async function docBienLai(
  db: D1Database, v: { raw: unknown; lt: LanThuHopLe; ai: NguoiGoi; congTyId: string; coKho: boolean; now: Date },
): Promise<KetQua<BienLaiChuanBi | null>> {
  const dc = canDoiChieu({
    kind: "CUSTOMER_PAYMENT", collectorRole: v.lt.collectorRole, collectorPartyId: v.lt.collectorPartyId, method: v.lt.hinhThuc,
    nguoiGhiPartyId: v.ai.partyId ?? (v.ai.laKeToan ? v.congTyId : ""), nguoiGhiLaKeToan: v.ai.laKeToan, congTyId: v.congTyId,
  });
  const batBuoc = canBienLai({ laDoiTac: v.ai.laDoiTac, laKeToan: v.ai.laKeToan, collectorRole: v.lt.collectorRole, method: v.lt.hinhThuc, canDoiChieu: dc });
  const k = kiemBienLai(v.raw);
  if (!k.ok) return loi(k.status, k.code, k.message);
  if (!k.tep) return batBuoc ? BIEN_LAI_REQUIRED() : { ok: true, value: null };
  if (!batBuoc) return BIEN_LAI_KHONG_CAN();
  if (!v.coKho) return KHO_BIEN_LAI_CHUA_BAT();
  if ((await demAnhGanDay(db, v.ai.staffId, dauCuaSoBienLai(v.now))) >= TEP_MOI_GIO) return QUA_TRAN_BIEN_LAI();
  return { ok: true, value: { anhId: crypto.randomUUID(), key: taoKhoaNgauNhien("bln"), bam: await bamSha256(k.tep.bytes), tep: k.tep } };
}

/** Câu của ảnh cho CÙNG lô với khoản thu: dòng ảnh (lính gác EXISTS khoản thu) rồi nhật ký chỉ mã (chỉ khi dòng ảnh đã chèn). Không khoá kho, không băm trong nhật ký. */
export function cauBienLai(db: D1Database, v: { orderId: string; receiptId: string; bl: BienLaiChuanBi; by: string; at: string }): D1PreparedStatement[] {
  return [
    chenAnhStatement(db, { id: v.bl.anhId, receiptId: v.receiptId, key: v.bl.key, loai: v.bl.tep.loai, kichThuoc: v.bl.tep.bytes.length, bam: v.bl.bam, by: v.by, at: v.at }),
    auditStatement(db, { orderId: v.orderId, staffId: v.by, action: "payment_proof_added", at: v.at, detail: `ảnh ${v.bl.anhId.slice(0, 8)}` }, "changes() > 0"),
  ];
}

/** Lỗi trigger của bảng ảnh (lô thua): trần giờ ⇒ 429 (không ghi gì); người tải / khoản thu không khớp, ghi đè ⇒ 409 (không 5xx). */
export function loiTriggerBienLai(e: unknown): { ok: false; res: Response } | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bproof_rate_limited:/.test(m)) return QUA_TRAN_BIEN_LAI();
  if (/\bproof_(author_mismatch|no_replace):/.test(m) || /UNIQUE constraint failed: bil_receipt_proof\./.test(m)) return loi(409, "stale", "Khoản thu vừa thay đổi — tải lại rồi thử lại.");
  return null;
}
