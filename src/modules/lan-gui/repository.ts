// SQL của bảng vé `lg_lan_gui` (ADR-0094, migration 0074). Câu tĩnh qua defineSql (module nghiêm). KHÔNG có câu xoá (R-N1-9; đường dọn theo thời hạn là
// ngoại lệ có tên của bản sau — A-11). Phạm vi mọi câu: một tài khoản (`staff_id`) + một vé (`khoa`).
import type { DongVe } from "../../shared/lan-gui-luat.ts";
import { defineSql } from "../../shared/sql-registry.ts";

const TRA = defineSql("lan-gui", "tra", "SELECT van_tay, ma_tra, ma_loi, ket_qua, created_at FROM lg_lan_gui WHERE staff_id = ?1 AND khoa = ?2");
const CHEN = defineSql(
  "lan-gui",
  "chen_ve",
  "INSERT INTO lg_lan_gui (staff_id, khoa, van_tay, duong, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?1, ?5, ?1)",
);
// Chỉ ghi kết quả LẦN ĐẦU (ma_tra còn NULL): lần cập nhật trễ của một yêu cầu không đè kết quả đã có.
const CAP_NHAT = defineSql(
  "lan-gui",
  "cap_nhat_ket_qua",
  "UPDATE lg_lan_gui SET ma_tra = ?3, ma_loi = ?4, ket_qua = ?5, updated_at = ?6, updated_by = ?1 WHERE staff_id = ?1 AND khoa = ?2 AND ma_tra IS NULL",
);
// A-1: đếm số lần bị gửi lặp. Không đổi updated_at (cột đó là "lúc có kết quả").
const TANG_LAP = defineSql("lan-gui", "tang_lap", "UPDATE lg_lan_gui SET so_lan_lap = so_lan_lap + 1 WHERE staff_id = ?1 AND khoa = ?2");

export const traVe = (db: D1Database, staffId: string, khoa: string): Promise<DongVe | null> => db.prepare(TRA).bind(staffId, khoa).first<DongVe>();

/** Câu chèn vé (CHƯA chạy) — bộ bọc nối vào CUỐI lô ghi đầu tiên của lệnh (ADR-0094 đ2). */
export const cauChenVe = (db: D1Database, v: { staffId: string; khoa: string; vanTay: string; duong: string; at: string }): D1PreparedStatement =>
  db.prepare(CHEN).bind(v.staffId, v.khoa, v.vanTay, v.duong, v.at);

export const capNhatKetQua = async (
  db: D1Database,
  v: { staffId: string; khoa: string; maTra: number; maLoi: string | null; ketQua: string | null; at: string },
): Promise<void> => {
  await db.prepare(CAP_NHAT).bind(v.staffId, v.khoa, v.maTra, v.maLoi, v.ketQua, v.at).run();
};

export const tangLap = async (db: D1Database, staffId: string, khoa: string): Promise<void> => {
  await db.prepare(TANG_LAP).bind(staffId, khoa).run();
};
