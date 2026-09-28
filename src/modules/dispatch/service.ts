// Điều phối của module dispatch: dựng các câu lệnh (chưa chạy) của MỘT lần đặt/đổi người phụ trách. Tách khỏi route để bài kiểm chạy đúng các câu
// này trên SQLite thật (service.test.ts) — chỗ tranh chấp song song nằm ở đây, không ở HTTP.
import { auditStatement } from "../audit";
import { closeHandlerStatement, insertHandlerAfterCloseStatement, insertHandlerIfNoneStatement, insertHandlerStatement } from "./repository";
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
  /** true = người thao tác tự đặt mình vào đơn CHƯA có người phụ trách (`thayDoiCuaHandler` === "nhan") — nhật ký ghi `order_claimed` thay vì
   * `order_handler_changed` (ADR-0034 §4.3, để hộp thông báo phân biệt "vừa nhận" với "giao cho người khác"). */
  tuNhan: boolean;
}

/**
 * Các câu của một lần đặt/đổi người phụ trách, để chạy trong MỘT `db.batch()`. `results[0].meta.changes > 0` ⇔ lần này THẮNG; thua (người phụ trách đã
 * đổi, hoặc đã có người nhận) thì không dòng nào thay đổi và không có dòng nhật ký.
 *  - đổi người:   [đóng dòng cũ (chốt), mở dòng mới nếu chốt thắng, nhật ký nếu dòng mới đã chèn];
 *  - nhận đơn chưa có người: [mở dòng mới nếu vẫn chưa có (chốt), nhật ký nếu đã chèn].
 * Thứ tự là hợp đồng: `changes() > 0` luôn nói về câu NGAY TRƯỚC nó (docs/CHANGE-GUIDE.md công thức f, bẫy).
 */
export function handlerChangeStatements(db: D1Database, c: HandlerChange): D1PreparedStatement[] {
  const row = newRow(c);
  const audit = handlerAudit(db, c);
  return c.from ? [closeHandlerStatement(db, c.orderId, c.from.partyId, c.at, c.actorId), insertHandlerAfterCloseStatement(db, row), audit] : [insertHandlerIfNoneStatement(db, row), audit];
}

/**
 * Các câu mở người phụ trách do người lập CHỌN cho đơn MỚI (ADR-0030 S20-4, ADR-0020 điều 1, Q-C), gộp vào `db.batch()` tạo đơn NGAY SAU câu INSERT đơn
 * và dòng nhật ký `created` (`orders/repository.ts` `createOrder`): [mở dòng `HANDLE` (INSERT thường — đơn vừa tạo trong CHÍNH lô này nên chưa thể có
 * dòng nào), nhật ký `order_handler_changed` "từ chưa có người phụ trách sang <tên>" (chỉ khi câu ngay trước đã chèn — `changes() > 0`)].
 * `at` là mốc của CHÍNH lần thử của lô, do `createOrder` đưa vào — hàm này KHÔNG đọc đồng hồ: `valid_from_at` của dòng HANDLE, `created_at` của dòng
 * nhật ký này và `created_at` của dòng `created` BẰNG NHAU tuyệt đối (hệ thống Thông báo so hai mốc đó để biết đơn có người ngay lúc lập hay không).
 * Id dòng sinh MỖI LẦN GỌI (createOrder gọi lại với id đơn + mốc mới khi thử lại vì trùng mã).
 */
export function newOrderHandlerStatements(db: D1Database, c: Omit<HandlerChange, "from">): D1PreparedStatement[] {
  const change: HandlerChange = { ...c, from: null };
  return [insertHandlerStatement(db, newRow(change)), handlerAudit(db, change)];
}

const newRow = (c: HandlerChange) => ({ id: crypto.randomUUID(), orderId: c.orderId, partyId: c.to.partyId, at: c.at, actorId: c.actorId });

/** Dòng nhật ký `order_handler_changed` (CHỈ TÊN) — chỉ ghi khi câu NGAY TRƯỚC nó (mở dòng mới) đã áp dụng. */
const handlerAudit = (db: D1Database, c: HandlerChange): D1PreparedStatement =>
  auditStatement(
    db,
    { staffId: c.actorId, action: c.tuNhan ? "order_claimed" : "order_handler_changed", at: c.at, orderId: c.orderId, detail: describeHandlerChange(c.from?.name ?? null, c.to.name) },
    "changes() > 0",
  );
