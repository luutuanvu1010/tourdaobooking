// Công tắc «Bắt buộc giờ đón cho đơn đối tác» (ADR-0193): phần GHI và luật THUẦN của cờ. SQL ở `xac-nhan-repo.ts` (tệp nửa nghiêm) — tệp này không có câu SQL riêng.
import { auditStatement } from "../audit";
import { cauThemGioDon } from "./xac-nhan-repo";

/**
 * MỘT lô đổi công tắc: dòng chính sách mới (chỉ-thêm, `valid_from_at = at`) rồi nhật ký `pickup_time_policy_changed` không gắn đơn. Câu chèn hoặc chèn được hoặc NÉM lỗi UNIQUE
 * (không có đường «đổi 0 dòng») và lô D1 lui trọn khi một câu ném lỗi, nên thua mốc thì không để lại nhật ký.
 */
export function lenhGhiBatBuocGioDon(db: D1Database, v: { bat: boolean; at: string; by: string }): D1PreparedStatement[] {
  return [
    cauThemGioDon(db, { id: crypto.randomUUID(), bat: v.bat, at: v.at, by: v.by }),
    auditStatement(db, { staffId: v.by, action: "pickup_time_policy_changed", at: v.at, targetType: "system", detail: v.bat ? "Bật bắt buộc giờ đón cho đơn đối tác" : "Tắt bắt buộc giờ đón cho đơn đối tác" }),
  ];
}

/**
 * ADR-0193 câu (i): cờ «cần chốt giờ» chụp vào yêu cầu xác nhận (`pickup_time_required`) và lý do `CHOT_GIO` = «đi nhánh A vì thiếu giờ» (`canChotGioCuaNguoiLap`) VÀ công tắc Bật.
 * Công tắc KHÔNG đổi nhánh: Tắt thì đơn Đối tác chưa giờ vẫn qua văn phòng xét (nhánh A), chỉ không bị đòi giờ ở Còn vé.
 */
export const coChotGio = (diNhanhAViThieuGio: boolean, batBuoc: boolean): boolean => diNhanhAViThieuGio && batBuoc;
