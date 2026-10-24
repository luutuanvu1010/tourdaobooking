// Điều phối của module dispatch: dựng các câu lệnh (chưa chạy) của MỘT lần đặt/đổi người phụ trách. Tách khỏi route để bài kiểm chạy đúng các câu
// này trên SQLite thật (service.test.ts) — chỗ tranh chấp song song nằm ở đây, không ở HTTP.
import { auditStatement } from "../audit";
import { closeHandlerSauChotStatement, closeHandlerStatement, insertHandlerAfterCloseStatement, insertHandlerIfNoneStatement, insertHandlerStatement } from "./repository";
import { describeHandlerChange } from "./rules";
import { chenSuKienSauStatement, chenTuChoiStatement } from "./han-muc-repo";
import { nhanLyDoTuChoi, type MaLyDoTuChoi } from "../../shared/ly-do-tu-choi";

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
 *  - đổi người:   [đóng dòng cũ (chốt), mở dòng mới nếu chốt thắng, nhật ký nếu dòng mới đã chèn, sự kiện ASSIGN nếu nhật ký đã chèn (ADR-0032)];
 *  - nhận đơn chưa có người: [mở dòng mới nếu vẫn chưa có (chốt), nhật ký nếu đã chèn, sự kiện CLAIM/ASSIGN nếu nhật ký đã chèn].
 * Thứ tự là hợp đồng: `changes() > 0` luôn nói về câu NGAY TRƯỚC nó (docs/CHANGE-GUIDE.md công thức f, bẫy).
 */
export function handlerChangeStatements(db: D1Database, c: HandlerChange): D1PreparedStatement[] {
  const row = newRow(c);
  const audit = handlerAudit(db, c);
  const suKien = suKienMo(db, c);
  return c.from
    ? [closeHandlerStatement(db, c.orderId, c.from.partyId, c.at, c.actorId), insertHandlerAfterCloseStatement(db, row), audit, suKien]
    : [insertHandlerIfNoneStatement(db, row), audit, suKien];
}

/**
 * Các câu mở người phụ trách do người lập CHỌN cho đơn MỚI (ADR-0030 S20-4, ADR-0020 điều 1, Q-C), gộp vào `db.batch()` tạo đơn NGAY SAU câu INSERT đơn
 * và dòng nhật ký `created` (`orders/repository.ts` `createOrder`): [mở dòng `HANDLE` (INSERT thường — đơn vừa tạo trong CHÍNH lô này nên chưa thể có
 * dòng nào), nhật ký `order_handler_changed` "từ chưa có người phụ trách sang <tên>" (chỉ khi câu ngay trước đã chèn — `changes() > 0`), sự kiện ASSIGN
 * của ADR-0032 (chỉ khi nhật ký đã chèn)].
 * `at` là mốc của CHÍNH lần thử của lô, do `createOrder` đưa vào — hàm này KHÔNG đọc đồng hồ: `valid_from_at` của dòng HANDLE, `created_at` của dòng
 * nhật ký này và `created_at` của dòng `created` BẰNG NHAU tuyệt đối (hệ thống Thông báo so hai mốc đó để biết đơn có người ngay lúc lập hay không).
 * Id dòng sinh MỖI LẦN GỌI (createOrder gọi lại với id đơn + mốc mới khi thử lại vì trùng mã).
 */
export function newOrderHandlerStatements(db: D1Database, c: Omit<HandlerChange, "from">): D1PreparedStatement[] {
  const change: HandlerChange = { ...c, from: null };
  return [insertHandlerStatement(db, newRow(change)), handlerAudit(db, change), suKienMo(db, change)];
}

/**
 * Sự kiện phân công của MỘT lần mở dòng phụ trách (ADR-0032 điều 1; kế hoạch 2026-10-23 mục 1, 4a–4b): CLAIM khi người gọi tự nhận đơn chưa có người
 * (`tuNhan`), ASSIGN cho mọi đường khác (giao, đổi người, chọn lúc lập đơn — kể cả chọn chính mình). Người bị GỠ (đổi người) không có sự kiện. Câu đứng
 * CUỐI lô, ngay sau câu nhật ký `changes() > 0` ⇒ chỉ chèn khi lô thắng; mốc = `c.at` = `valid_from_at` của dòng vừa mở (kiểm R-DSP-6 dựa vào đẳng thức này).
 */
const suKienMo = (db: D1Database, c: HandlerChange): D1PreparedStatement =>
  chenSuKienSauStatement(db, { id: crypto.randomUUID(), partyId: c.to.partyId, orderId: c.orderId, loai: c.tuNhan ? "CLAIM" : "ASSIGN", at: c.at, actorId: c.actorId });

const newRow = (c: HandlerChange) => ({ id: crypto.randomUUID(), orderId: c.orderId, partyId: c.to.partyId, at: c.at, actorId: c.actorId });

/** Dòng nhật ký `order_handler_changed` (CHỈ TÊN) — chỉ ghi khi câu NGAY TRƯỚC nó (mở dòng mới) đã áp dụng. */
const handlerAudit = (db: D1Database, c: HandlerChange): D1PreparedStatement =>
  auditStatement(
    db,
    { staffId: c.actorId, action: c.tuNhan ? "order_claimed" : "order_handler_changed", at: c.at, orderId: c.orderId, detail: describeHandlerChange(c.from?.name ?? null, c.to.name) },
    "changes() > 0",
  );

/** Một lần «Từ chối» (ADR-0030 điều 1): người phụ trách `partyId` (= hồ sơ của CHÍNH người gọi) tự trả đơn. */
export interface Refusal {
  orderId: string;
  partyId: string;
  /** Người bấm (tài khoản) — cột WHO của dòng đóng, của sự kiện và `staff_id` của nhật ký. */
  actorId: string;
  /** Mốc của lệnh (UTC): `valid_to_at` của dòng đóng = `created_at` của nhật ký = `occurred_at` của sự kiện REFUSE. */
  at: string;
  /** Mã lý do (danh sách đóng `ly-do-tu-choi.ts` — hợp đồng với `dsp_release_event.reason_code`). Nhật ký chỉ ghi NHÃN (Q2 (a)). */
  lyDo: MaLyDoTuChoi;
  /** Đầu tuần dân sự VN (ISO UTC) của lúc lệnh — vế «mỗi tuần» của hạn mức (ADR-0032 điều 4). */
  dauTuan: string;
  /** Người gọi thuộc nhóm bị hạn mức chặn (ADR-0032 điều 2 — `biGioiHanTuChoi` trên bộ quyền của phiên). */
  biGioiHan: boolean;
  /**
   * Chế độ «Chỉ đo» và số đọc trước lô cho thấy LẼ RA bị chặn (ADR-0032 điều 6): `detail` của dòng `refuse_limit_hit` «chỉ đo» — câu nhật ký đó đi CUỐI CHÍNH
   * lô này (`changes() > 0` sau nhật ký Từ chối) để mỗi lệnh chỉ ghi MỘT lần (ADR-0094 đ3, H5; Hiến chương 1.2). Không có ⇒ null.
   */
  chiDo?: string | null;
}

/**
 * Các câu của một lần Từ chối, để chạy trong MỘT `db.batch()` (ADR-0032 điều 5; kế hoạch 2026-10-23 mục 4d):
 *  [0] CHÈN sự kiện REFUSE — CÂU CHỐT: chỉ chèn khi người gọi ĐANG có dòng phụ trách mở của đơn VÀ hạn mức không chặn (chế độ Chặn + người bị giới hạn +
 *      chuỗi/tuần đã đủ ⇒ không chèn). Không chèn ⇒ cả lô không đổi gì (không có lần Từ chối «ma»);
 *  [1] đóng dòng `HANDLE` đang mở MANG `party_id` của người gọi khi câu ngay trước đã chèn (`close_handler_sau_chot` — `… AND changes() > 0`);
 *  [2] nhật ký `order_handler_refused` (chỉ nhãn lý do) khi câu ngay trước đã đóng được;
 *  [3] (chỉ khi `chiDo`) nhật ký `refuse_limit_hit` «Chỉ đo (không chặn)» khi câu ngay trước đã chèn — cùng lô, để lệnh ghi đúng MỘT lần (H5).
 * KHÔNG có câu mở dòng mới: đơn về «Chờ nhận».
 */
export function refuseStatements(db: D1Database, r: Refusal): D1PreparedStatement[] {
  return [
    chenTuChoiStatement(db, { id: crypto.randomUUID(), partyId: r.partyId, orderId: r.orderId, dauTuan: r.dauTuan, at: r.at, lyDo: r.lyDo, actorId: r.actorId, biGioiHan: r.biGioiHan }),
    closeHandlerSauChotStatement(db, r.orderId, r.partyId, r.at, r.actorId),
    auditStatement(db, { staffId: r.actorId, action: "order_handler_refused", at: r.at, orderId: r.orderId, detail: nhanLyDoTuChoi(r.lyDo) }, "changes() > 0"),
    ...(r.chiDo ? [auditStatement(db, { staffId: r.actorId, action: "refuse_limit_hit", at: r.at, orderId: r.orderId, detail: r.chiDo }, "changes() > 0")] : []),
  ];
}

/** Lô Từ chối đã THẮNG chưa — route chỉ hỏi hàm này, không đọc thẳng chỉ số (khuôn `daHuy`): câu đóng dòng (thứ 2) đổi một dòng. */
export const tuChoiThang = (kq: readonly D1Result[]): boolean => (kq[1]?.meta.changes ?? 0) > 0;
