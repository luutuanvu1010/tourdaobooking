// SQL của công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1; migration 0144): bảng `bil_partner_channel_setting`, CHỈ THÊM, hiệu lực = dòng đang mở tại thời điểm hỏi.
// Module NGHIÊM: mọi câu qua `defineSql` (câu TĨNH, tham số ?N). Import kèm đuôi .ts (bài kiểm kiến trúc nạp tệp này thẳng bằng Node).
import { defineSql } from "../../shared/sql-registry.ts";

const KENH_THU_DOC = defineSql(
  "billing",
  "partner_channel_setting_at",
  `SELECT company_collects FROM bil_partner_channel_setting WHERE valid_from <= ?1 AND (valid_to IS NULL OR valid_to > ?1) ORDER BY valid_from DESC, rowid DESC LIMIT 1`,
);
/** `null` = chưa có dòng hiệu lực (chưa ai đổi công tắc). */
export const kenhThuTai = async (db: D1Database, at: string): Promise<number | null> =>
  (await db.prepare(KENH_THU_DOC).bind(at).first<{ company_collects: number }>())?.company_collects ?? null;
