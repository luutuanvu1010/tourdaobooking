// Điều phối của module dispatch: dựng các câu lệnh (chưa chạy) của MỘT lần đặt/đổi người phụ trách. Tách khỏi route để bài kiểm chạy đúng các câu
// này trên SQLite thật (service.test.ts) — chỗ tranh chấp song song nằm ở đây, không ở HTTP.
import { auditStatement } from "../audit";
import { closeHandlerStatement, insertHandlerAfterCloseStatement, insertHandlerIfNoneStatement } from "./repository";
import { describeHandlerChange } from "./rules";

export interface HandlerChange {
  orderId: string;
  /** Người phụ trách đang mở lúc ĐỌC (null = chưa có). Câu chốt chỉ áp dụng nếu nó vẫn đúng lúc GHI. */
  from: { partyId: string; name: string } | null;
  to: { partyId: string; name: string };
  /** Người thao tác (tài khoản). */
  actorId: string;
  /** Lúc thao tác (UTC): dòng cũ đóng và dòng mới mở CÙNG thời điểm. */
  at: string;
}

/**
 * Các câu của một lần đặt/đổi người phụ trách, để chạy trong MỘT `db.batch()`. `results[0].meta.changes > 0` ⇔ lần này THẮNG; thua (người phụ trách đã
 * đổi, hoặc đã có người nhận) thì không dòng nào thay đổi và không có dòng nhật ký.
 *  - đổi người:   [đóng dòng cũ (chốt), mở dòng mới nếu chốt thắng, nhật ký nếu dòng mới đã chèn];
 *  - nhận đơn chưa có người: [mở dòng mới nếu vẫn chưa có (chốt), nhật ký nếu đã chèn].
 * Thứ tự là hợp đồng: `changes() > 0` luôn nói về câu NGAY TRƯỚC nó (docs/CHANGE-GUIDE.md công thức f, bẫy).
 */
export function handlerChangeStatements(db: D1Database, c: HandlerChange): D1PreparedStatement[] {
  const row = { id: crypto.randomUUID(), orderId: c.orderId, partyId: c.to.partyId, at: c.at, actorId: c.actorId };
  const audit = auditStatement(
    db,
    { staffId: c.actorId, action: "order_handler_changed", at: c.at, orderId: c.orderId, detail: describeHandlerChange(c.from?.name ?? null, c.to.name) },
    "changes() > 0",
  );
  return c.from ? [closeHandlerStatement(db, c.orderId, c.from.partyId, c.at, c.actorId), insertHandlerAfterCloseStatement(db, row), audit] : [insertHandlerIfNoneStatement(db, row), audit];
}
