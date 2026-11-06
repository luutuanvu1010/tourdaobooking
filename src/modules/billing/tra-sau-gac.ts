// Câu gác và câu tăng dòng phiên bản hạn mức (ADR-0168 Đ2 mục 4). Tách ra để cả `tra-sau.ts` (cổng xác nhận) lẫn `tra-sau-tang.ts` (đường đảo / sửa khoản thu) dùng chung mà không vòng nhập.
import { guardChenStatement, guardGacStatement, guardTangStatement } from "./tra-sau-repo";

/** Câu gác phiên bản cho lô xác nhận: tạo dòng phiên bản nếu chưa có, rồi chỉ tăng được khi phiên bản vẫn là số đã đọc (sai thì trigger huỷ cả lô — `credit_version_stale`). */
export const cauGacPhienBan = (db: D1Database, partyId: string, version: number, at: string): D1PreparedStatement[] =>
  [guardChenStatement(db, partyId, at), guardGacStatement(db, partyId, version, at)];
/** Câu tăng phiên bản cho đường làm nợ thay đổi mà không cần đọc trước (đảo, sửa khoản thu, đổi hạn mức): lệnh đang chờ xác nhận sẽ thua. */
export const cauTangPhienBan = (db: D1Database, partyId: string, at: string): D1PreparedStatement[] =>
  [guardChenStatement(db, partyId, at), guardTangStatement(db, partyId, at)];
