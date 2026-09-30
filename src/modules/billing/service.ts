// Điều phối nhiều bước có I/O của billing (sổ tiền lượt 1): đọc → luật thuần (rules.ts) → gộp câu CHƯA CHẠY của orders / dispatch / audit + câu của billing
// vào MỘT db.batch() (ADR-0024 điều 4, ADR-0002 quy tắc 3). Route (index.ts) hỏi quyền TRƯỚC rồi mới gọi các hàm ở đây. Không SQL thô (module nghiêm).
import { auditStatement } from "../audit";
import { cauBaoVeNguoiPhuTrach } from "../dispatch";
import { datGiaoStatement, hoanThanhStatement, phaiThuNhieuDon, thongTinGiaoDon, type ThongTinGiaoDon } from "../orders";
import type { LanThuDto, LanThuInput, LyDoGiuDonDto, OrderPaymentsResponse, SoCongNoResponse, SoCuaToiResponse } from "../../shared/contracts";
import { UUID_RE, error } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";
import {
  balancesWithOwner, lineById, lineIfPostingStatement, lineReversed, linesOfOrder, linesOfParty, linesOfReceipt, orderOwners, orderState, ownerCompanyId, partyLabels,
  pendingCompany, postingIfCompletedAtStatement, postingIfDeliveredAtStatement, postingIfReceiptStatement, postingPlainStatement, receiptAtDeliveryStatement,
  receiptBeforeDeliveredStatement, receiptById, receiptRefundStatement, receiptReversalStatement, receiptsOfOrder, receiptsOfOrders, unknownReceipts, type LineDbRow,
  type NewLine, type NewReceipt, type ReceiptDbRow,
} from "./repository";
import {
  METHOD_CODES, conLai, lyDoChuaGiaoDuoc, lyDoChuaHoanThanh, ngayPhatSinh, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan, sinhDongXacNhanCongTy,
  soDuTheoBen, type LineDraft, type MethodCode, type ReceiptRow, type SoTienDon,
} from "./rules";

export const MAX_SO_TIEN = 10_000_000_000;
const PARTY_ID_RE = /^[0-9A-Za-z_-]{1,64}$/;

const HINH_THUC: Record<string, string> = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", OTHER: "Khác" };
const GIAI_DOAN: Record<string, string> = { PREPAID: "Trả trước", AT_DELIVERY: "Lúc Đã giao" };

export const toReceiptRow = (r: Pick<ReceiptDbRow, "id" | "kind_code" | "amount" | "collector_role_code" | "collector_party_id" | "reverses_id">): ReceiptRow => ({
  id: r.id, kind: r.kind_code, amount: r.amount, collectorRole: r.collector_role_code, collectorPartyId: r.collector_party_id, reversesId: r.reverses_id,
});
const toLineRow = (l: LineDbRow) => ({
  id: l.id, debtorPartyId: l.debtor_party_id, creditorPartyId: l.creditor_party_id, amount: l.amount, kind: l.kind_code, orderId: l.order_id, receiptId: l.receipt_id,
  reversesLineId: l.reverses_line_id,
});

/** Người gọi (đã qua `can()` ở route). `laKeToan` = có ô `ledger.write` (Kế toán, Toàn quyền) — ghi được người thu là người khác, chọn ngày phát sinh. */
export interface NguoiGoi {
  staffId: string;
  partyId: string | null;
  laKeToan: boolean;
}

export type KetQua<T> = { ok: true; value: T } | { ok: false; res: Response };
const loi = (status: number, code: string, message: string): { ok: false; res: Response } => ({ ok: false, res: error(status, code, message) });

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc thân lần thu
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export interface LanThuHopLe {
  soTien: number;
  hinhThuc: MethodCode;
  collectorRole: "COMPANY" | "STAFF";
  collectorPartyId: string;
  ngayPhatSinh: string;
  ghiChu: string | null;
}

/** Kiểm thân lần thu (ADR-0026 đ2): người không phải Kế toán/Toàn quyền chỉ ghi người thu = chính mình hoặc Công ty (NT-Q4 → 400). */
export async function docLanThu(db: D1Database, raw: unknown, ai: NguoiGoi, congTyId: string): Promise<KetQua<LanThuHopLe>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return loi(400, "invalid_input", "Thiếu thông tin lần thu.");
  const b = raw as Partial<Record<keyof LanThuInput, unknown>>;
  const soTien = b.soTien;
  if (typeof soTien !== "number" || !Number.isInteger(soTien) || soTien <= 0 || soTien > MAX_SO_TIEN) return loi(400, "invalid_input", "Số tiền phải là số nguyên dương (đồng).");
  if (typeof b.hinhThuc !== "string" || !(METHOD_CODES as readonly string[]).includes(b.hinhThuc)) return loi(400, "invalid_input", "Chọn hình thức thu (tiền mặt, chuyển khoản hoặc khác).");
  let collectorRole: "COMPANY" | "STAFF";
  let collectorPartyId: string;
  if (b.nguoiThu === "cong_ty") {
    // "Công ty thu" do người không phải Kế toán khai ⇒ giữ hộ trên NGƯỜI KHAI tới khi Kế toán xác nhận (H3) — cần hồ sơ người khai.
    if (!ai.laKeToan && !ai.partyId) return loi(400, "invalid_input", "Tài khoản chưa có hồ sơ nên không khai được khoản công ty thu.");
    collectorRole = "COMPANY";
    collectorPartyId = congTyId;
  } else if (b.nguoiThu === "toi") {
    if (!ai.partyId) return loi(400, "invalid_input", "Tài khoản chưa có hồ sơ nên không ghi được mình là người thu.");
    collectorRole = "STAFF";
    collectorPartyId = ai.partyId;
  } else if (b.nguoiThu && typeof b.nguoiThu === "object" && typeof (b.nguoiThu as { partyId?: unknown }).partyId === "string") {
    const pid = (b.nguoiThu as { partyId: string }).partyId;
    if (!ai.laKeToan && pid !== ai.partyId) return loi(400, "invalid_input", "Chỉ ghi được người thu là chính bạn hoặc Công ty. Kế toán ghi thay người khác.");
    if (!PARTY_ID_RE.test(pid)) return loi(400, "invalid_input", "Người thu không hợp lệ.");
    if (pid === congTyId) {
      collectorRole = "COMPANY";
    } else {
      const nhan = (await partyLabels(db, [pid])).get(pid);
      if (!nhan || !nhan.active) return loi(400, "invalid_input", "Không tìm thấy người thu (hồ sơ đang hoạt động).");
      collectorRole = "STAFF";
    }
    collectorPartyId = pid;
  } else {
    return loi(400, "invalid_input", "Chọn người thu tiền.");
  }
  const ngay = ngayPhatSinh({ chon: b.ngayPhatSinh, homNay: vnToday(new Date()), laKeToan: ai.laKeToan });
  if (!ngay.ok) return loi(400, "invalid_input", ngay.message);
  let ghiChu: string | null = null;
  if (b.ghiChu !== undefined && b.ghiChu !== null && b.ghiChu !== "") {
    if (typeof b.ghiChu !== "string" || b.ghiChu.length > 500) return loi(400, "invalid_input", "Ghi chú tối đa 500 ký tự.");
    if (/\d{8,}/.test(b.ghiChu.replace(/[\s.-]/g, ""))) return loi(400, "invalid_input", "Ghi chú không được chứa số điện thoại / số tài khoản.");
    ghiChu = b.ghiChu.trim() || null;
  }
  return { ok: true, value: { soTien, hinhThuc: b.hinhThuc as MethodCode, collectorRole, collectorPartyId, ngayPhatSinh: ngay.value, ghiChu } };
}

/** Câu lệnh của MỘT lần thu: lần thu (lính gác do `receiptStmt`), nhật ký (chỉ khi lần thu đã chèn), phiếu RECEIPT + dòng giữ hộ (nếu có). */
function cauLanThu(
  db: D1Database,
  input: { orderId: string; lt: LanThuHopLe; stage: "PREPAID" | "AT_DELIVERY"; ai: NguoiGoi; congTyId: string; at: string },
  receiptStmt: (r: NewReceipt) => D1PreparedStatement,
): D1PreparedStatement[] {
  const receiptId = crypto.randomUUID();
  const r: NewReceipt = {
    id: receiptId, orderId: input.orderId, kind: "CUSTOMER_PAYMENT", amount: input.lt.soTien, collectorPartyId: input.lt.collectorPartyId, collectorRole: input.lt.collectorRole,
    method: input.lt.hinhThuc, stage: input.stage, occurredDate: input.lt.ngayPhatSinh, note: input.lt.ghiChu, at: input.at, by: input.ai.staffId,
  };
  const dong = sinhDongLanThu({
    kind: "CUSTOMER_PAYMENT", amount: r.amount, collectorRole: r.collectorRole, collectorPartyId: r.collectorPartyId, nguoiGhiPartyId: input.ai.partyId ?? congTyNeuKeToan(input.ai, input.congTyId),
    nguoiGhiLaKeToan: input.ai.laKeToan, congTyId: input.congTyId,
  });
  const out = [
    receiptStmt(r),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "payment_recorded", at: input.at, detail: input.stage === "AT_DELIVERY" ? "lúc Đã giao" : "trả trước" }, "changes() > 0"),
  ];
  if (dong.length > 0) {
    const postingId = crypto.randomUUID();
    out.push(postingIfReceiptStatement(db, { id: postingId, kind: "RECEIPT", orderId: input.orderId, reason: null, reversesPostingId: null, occurredDate: input.lt.ngayPhatSinh, dueSnapshot: null, at: input.at, by: input.ai.staffId }, receiptId));
    for (const d of dong) out.push(lineIfPostingStatement(db, lineOf(d, postingId, input.orderId, receiptId, input.at, input.ai.staffId)));
  }
  return out;
}

/** Kế toán không hồ sơ ghi "Công ty thu" ⇒ không dòng nào (sinhDongLanThu trả rỗng khi người ghi là Kế toán) — id công ty chỉ để đủ kiểu. */
const congTyNeuKeToan = (ai: NguoiGoi, congTyId: string): string => (ai.laKeToan ? congTyId : "");

export const lineOf = (d: LineDraft, postingId: string, orderId: string, receiptId: string | null, at: string, by: string): NewLine => ({
  id: crypto.randomUUID(), postingId, debtorPartyId: d.debtorPartyId, creditorPartyId: d.creditorPartyId, amount: d.amount, kind: d.kind, orderId, receiptId,
  reversesLineId: d.reversesLineId, at, by,
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Tiền của một đơn (màn đơn — NT-F11)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
function lanThuDto(rows: readonly ReceiptDbRow[]): LanThuDto[] {
  const biDao = new Set(rows.flatMap((r) => (r.reverses_id ? [r.reverses_id] : [])));
  return rows.map((r) => ({
    id: r.id,
    traLai: r.kind_code === "CUSTOMER_REFUND",
    soTien: r.amount,
    hinhThuc: HINH_THUC[r.method_code] ?? "Khác",
    nguoiThu: r.collector_role_code === "UNKNOWN" ? "Chưa rõ" : r.collector_role_code === "COMPANY" ? "Công ty" : (r.collector_label ?? "—"),
    nguoiThuChuaRo: r.collector_role_code === "UNKNOWN",
    giaiDoan: GIAI_DOAN[r.stage_code] ?? "",
    ngayPhatSinh: r.occurred_date,
    daDao: biDao.has(r.id),
    laDongDao: r.reverses_id !== null,
    nguoiGhi: r.created_by === "he-thong" ? "Hệ thống (chuyển cọc cũ)" : r.created_by_label,
    ghiChu: r.note,
    ghiLuc: r.created_at,
  }));
}

export interface QuyenXemTien {
  coTheGhiThu: boolean;
  coTheBamGiao: boolean;
  coTheBamHoanThanh: boolean;
}

/** Dựng `OrderPaymentsResponse` cho người xem (đơn `info` đã đọc; quyền đã hỏi ở route). */
export async function tienCuaDon(db: D1Database, info: ThongTinGiaoDon, ai: NguoiGoi, quyen: QuyenXemTien): Promise<OrderPaymentsResponse> {
  const [receipts, lines, congTyId] = await Promise.all([receiptsOfOrder(db, info.orderId), linesOfOrder(db, info.orderId), ownerCompanyId(db)]);
  const so = conLai(receipts.map(toReceiptRow), info.phaiThu);
  const lyGiao = lyDoChuaGiaoDuoc({ status: info.status, deliveredAt: info.deliveredAt, homNay: vnToday(new Date()), ngayDi: info.ngayDi, dichVuThieuNgay: info.dichVuThieuNgay, coNguoiHuong: info.coNguoiHuong, so });
  const soDu = congTyId ? soDuTheoBen(lines.map(toLineRow), congTyId) : new Map<string, number>();
  const ten = await partyLabels(db, [...soDu.keys()]);
  const lyHoan = lyDoChuaHoanThanh({ deliveredAt: info.deliveredAt, completedAt: info.completedAt, soDu, tenBen: (id) => ten.get(id)?.label ?? "Một người" });
  return {
    phaiThu: info.phaiThu,
    daThu: so.daThu,
    conLai: so.conLai,
    du: so.du,
    chuaRo: so.chuaRo,
    lanThu: lanThuDto(receipts),
    deliveredAt: info.deliveredAt,
    completedAt: info.completedAt,
    lyDoChuaGiao: info.deliveredAt ? null : (lyGiao as LyDoGiuDonDto | null),
    lyDoChuaHoanThanh: info.deliveredAt && !info.completedAt ? (lyHoan as LyDoGiuDonDto | null) : null,
    banDangGiu: ai.partyId ? Math.max(0, soDu.get(ai.partyId) ?? 0) : 0,
    coTheGhiThu: quyen.coTheGhiThu && info.deliveredAt === null,
    coTheGiao: quyen.coTheBamGiao && info.deliveredAt === null && lyGiao === null,
    coTheHoanThanh: quyen.coTheBamHoanThanh && info.deliveredAt !== null && info.completedAt === null && lyHoan === null,
    laKeToan: ai.laKeToan,
  };
}

/** Tiền của NHIỀU đơn (danh sách, Trang chủ, "Việc của tôi") — cùng hàm `conLai`. */
export async function tienNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, SoTienDon & { phaiThu: number; daGiao: boolean; hoanThanh: boolean }>> {
  const [base, receipts] = await Promise.all([phaiThuNhieuDon(db, orderIds), receiptsOfOrders(db, orderIds)]);
  const theoDon = new Map<string, ReceiptRow[]>();
  for (const r of receipts) theoDon.set(r.order_id, [...(theoDon.get(r.order_id) ?? []), toReceiptRow(r)]);
  const out = new Map<string, SoTienDon & { phaiThu: number; daGiao: boolean; hoanThanh: boolean }>();
  for (const [id, b] of base) out.set(id, { ...conLai(theoDon.get(id) ?? [], b.phaiThu), phaiThu: b.phaiThu, daGiao: b.deliveredAt !== null, hoanThanh: b.completedAt !== null });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi lần thu trước "Đã giao" (ADR-0026 đ2, đ4; NT-S3)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const DA_GIAO = () => loi(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ: không ghi thêm lần thu. Sai sót thì Kế toán ghi điều chỉnh trong sổ.");
const CHUA_CO_CONG_TY = () => loi(503, "owner_company_missing", "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống.");

export async function ghiLanThu(db: D1Database, input: { orderId: string; deliveredAt: string | null; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  if (input.deliveredAt) return DA_GIAO();
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const lt = await docLanThu(db, input.raw, input.ai, congTyId);
  if (!lt.ok) return lt;
  const at = new Date().toISOString();
  const stmts = cauLanThu(db, { orderId: input.orderId, lt: lt.value, stage: "PREPAID", ai: input.ai, congTyId, at }, (r) => receiptBeforeDeliveredStatement(db, r));
  const kq = await db.batch(stmts);
  if ((kq[0]!.meta.changes ?? 0) === 0) return DA_GIAO(); // đơn vừa "Đã giao" giữa lúc đọc và lúc ghi (lính gác của câu lần thu)
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// "Đã giao – đã thu đủ" (ADR-0025 điều 3–4; kế hoạch §3.3 — MỘT lô: [câu bảo vệ dispatch] → câu orders → [lần thu] → phiếu Đã giao (trigger kiểm tiền) → nhật ký)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const loiTrigger = (e: unknown, ma: string): boolean => new RegExp(`\\b${ma}:`).test(e instanceof Error ? e.message : String(e));

export async function daGiao(
  db: D1Database,
  input: { orderId: string; info: ThongTinGiaoDon; ai: NguoiGoi; canCauBaoVe: boolean; rawLanThu: unknown },
): Promise<KetQua<null>> {
  const { info, ai } = input;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  let lt: LanThuHopLe | null = null;
  if (input.rawLanThu !== undefined && input.rawLanThu !== null) {
    const doc = await docLanThu(db, input.rawLanThu, ai, congTyId);
    if (!doc.ok) return doc;
    lt = doc.value;
  }
  // Kiểm TRƯỚC lô (để trả câu dễ hiểu) — tính cả lần thu nhập ở bước này. Máy chủ vẫn kiểm lại TRONG lô (câu orders + trigger billing).
  const receipts = (await receiptsOfOrder(db, input.orderId)).map(toReceiptRow);
  if (lt) receipts.push({ id: "moi", kind: "CUSTOMER_PAYMENT", amount: lt.soTien, collectorRole: lt.collectorRole, collectorPartyId: lt.collectorPartyId, reversesId: null });
  const homNay = vnToday(new Date());
  const ly = lyDoChuaGiaoDuoc({ status: info.status, deliveredAt: info.deliveredAt, homNay, ngayDi: info.ngayDi, dichVuThieuNgay: info.dichVuThieuNgay, coNguoiHuong: info.coNguoiHuong, so: conLai(receipts, info.phaiThu) });
  if (ly) return loi(409, ly.ma === "already_delivered" ? "order_delivered" : "not_deliverable", ly.cau);
  if (input.canCauBaoVe && !ai.partyId) return loi(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới bấm được Đã giao.");

  const at = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  if (input.canCauBaoVe) stmts.push(cauBaoVeNguoiPhuTrach(db, input.orderId, ai.partyId!));
  stmts.push(datGiaoStatement(db, { orderId: input.orderId, at, by: ai.staffId, expectedUpdatedAt: info.updatedAt, expectedAdjSeq: info.adjSeq, homNay, sauCauBaoVe: input.canCauBaoVe }));
  if (lt) stmts.push(...cauLanThu(db, { orderId: input.orderId, lt, stage: "AT_DELIVERY", ai, congTyId, at }, (r) => receiptAtDeliveryStatement(db, r, at)));
  stmts.push(postingIfDeliveredAtStatement(db, { id: crypto.randomUUID(), kind: "DELIVERED", orderId: input.orderId, reason: null, reversesPostingId: null, occurredDate: homNay, dueSnapshot: info.phaiThu, at, by: ai.staffId }, at));
  // Nhật ký LUÔN sau câu orders và NGAY sau phiếu Đã giao: chỉ ghi khi phiếu (có lính gác mốc của chính lô) đã chèn — bên thua không để lại dòng nào.
  stmts.push(auditStatement(db, { orderId: input.orderId, staffId: ai.staffId, action: "order_delivered", at }, "changes() > 0"));
  try {
    await db.batch(stmts);
  } catch (e) {
    if (loiTrigger(e, "delivered_not_paid")) return loi(409, "not_deliverable", "Số tiền đã thu vừa thay đổi — tải lại màn hình rồi thử lại.");
    if (loiTrigger(e, "order_delivered")) return loi(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ.");
    throw e;
  }
  const sau = await thongTinGiaoDon(db, input.orderId);
  if (sau?.deliveredAt === at) return { ok: true, value: null };
  // Lô không áp (thua khoá lạc quan / không còn là người phụ trách / vừa đổi ngày hay bên đặt): đọc lại để trả đúng lý do.
  if (sau && sau.deliveredAt) return loi(409, "order_delivered", "Đơn vừa được người khác bấm Đã giao.");
  return loi(409, "stale", "Đơn vừa thay đổi (số khách, người phụ trách, ngày đi…) — tải lại màn hình rồi thử lại.");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// "Hoàn thành" (ADR-0025 điều 6–7; khuôn V1: câu orders đầu → phiếu Hoàn thành (trigger kiểm còn ai nợ công ty) → nhật ký)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function hoanThanh(db: D1Database, input: { orderId: string; info: ThongTinGiaoDon; ai: NguoiGoi }): Promise<KetQua<null>> {
  const { info, ai } = input;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const lines = (await linesOfOrder(db, input.orderId)).map(toLineRow);
  const soDu = soDuTheoBen(lines, congTyId);
  const ten = await partyLabels(db, [...soDu.keys()]);
  const ly = lyDoChuaHoanThanh({ deliveredAt: info.deliveredAt, completedAt: info.completedAt, soDu, tenBen: (id) => ten.get(id)?.label ?? "Một người" });
  if (ly) return loi(409, ly.ma === "already_completed" ? "order_completed" : "not_completable", ly.cau);
  const at = new Date().toISOString();
  const stmts = [
    hoanThanhStatement(db, input.orderId, at, ai.staffId),
    postingIfCompletedAtStatement(db, { id: crypto.randomUUID(), kind: "COMPLETED", orderId: input.orderId, reason: null, reversesPostingId: null, occurredDate: vnToday(new Date()), dueSnapshot: null, at, by: ai.staffId }, at),
    auditStatement(db, { orderId: input.orderId, staffId: ai.staffId, action: "order_completed", at }, "changes() > 0"),
  ];
  try {
    await db.batch(stmts);
  } catch (e) {
    if (loiTrigger(e, "completed_unsettled")) return loi(409, "not_completable", "Còn người giữ tiền của công ty vì đơn này — tải lại màn hình để xem.");
    if (loiTrigger(e, "order_completed")) return loi(409, "order_completed", "Đơn đã Hoàn thành.");
    throw e;
  }
  const sau = await thongTinGiaoDon(db, input.orderId);
  if (sau?.completedAt === at) return { ok: true, value: null };
  if (sau?.completedAt) return loi(409, "order_completed", "Đơn vừa được người khác bấm Hoàn thành.");
  return loi(409, "stale", "Đơn vừa thay đổi — tải lại màn hình rồi thử lại.");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Sổ của Kế toán (ADR-0026 điều 5, 8 — Kế toán / Toàn quyền ghi; "thận trọng": khoản chưa được Kế toán ghi thì chưa coi là đã nộp / đã trả)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const docLyDo = (raw: unknown, batBuoc: boolean): KetQua<string | null> => {
  if (raw === undefined || raw === null || raw === "") return batBuoc ? loi(400, "invalid_input", "Cần ghi lý do.") : { ok: true, value: null };
  if (typeof raw !== "string" || raw.trim().length === 0) return batBuoc ? loi(400, "invalid_input", "Cần ghi lý do.") : { ok: true, value: null };
  if (raw.length > 500) return loi(400, "invalid_input", "Lý do / ghi chú tối đa 500 ký tự.");
  if (/\d{8,}/.test(raw.replace(/[\s.-]/g, ""))) return loi(400, "invalid_input", "Lý do / ghi chú không được chứa số điện thoại / số tài khoản.");
  return { ok: true, value: raw.trim() };
};
const docSoTien = (raw: unknown): KetQua<number> =>
  typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= MAX_SO_TIEN ? { ok: true, value: raw } : loi(400, "invalid_input", "Số tiền phải là số nguyên dương (đồng).");
const docNgay = (raw: unknown): KetQua<string> => {
  const n = ngayPhatSinh({ chon: raw, homNay: vnToday(new Date()), laKeToan: true });
  return n.ok ? { ok: true, value: n.value } : loi(400, "invalid_input", n.message);
};

/** "Công ty đã nhận" (H3): Kế toán xác nhận khoản "Công ty thu" do người khác khai — phiếu COMPANY_RECEIVED = dòng đảo của dòng giữ hộ trên người khai. */
export async function xacNhanCongTyNhan(db: D1Database, input: { receiptId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  const rc = await receiptById(db, input.receiptId);
  if (!rc) return loi(404, "not_found", "Không tìm thấy lần thu.");
  if (rc.collector_role_code !== "COMPANY") return loi(409, "invalid_state", "Lần thu này không phải khoản Công ty thu.");
  const cho = [];
  for (const l of await linesOfReceipt(db, rc.id)) if (l.kind_code === "HELD" && l.reverses_line_id === null && !(await lineReversed(db, l.id))) cho.push(l);
  if (cho.length === 0) return loi(409, "invalid_state", "Khoản này không còn chờ xác nhận.");
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const ngay = docNgay(b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const at = new Date().toISOString();
  const postingId = crypto.randomUUID();
  const stmts = [
    postingPlainStatement(db, { id: postingId, kind: "COMPANY_RECEIVED", orderId: rc.order_id, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }),
    ...cho.map((l) => lineIfPostingStatement(db, lineOf(sinhDongXacNhanCongTy(toLineRow(l)), postingId, rc.order_id, rc.id, at, input.ai.staffId))),
    auditStatement(db, { orderId: rc.order_id, staffId: input.ai.staffId, action: "ledger_company_received", at }),
  ];
  try {
    await db.batch(stmts);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_debt_line\.reverses_line_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Khoản này vừa được xác nhận.");
    throw e;
  }
  return { ok: true, value: { orderId: rc.order_id } };
}

/**
 * Nộp / trả (ADR-0026 điều 5), phân bổ theo đơn: `chieu: "nop"` = người đó nộp tiền đang giữ về công ty (dòng quyết toán công ty → người đó);
 * `chieu: "tra"` = công ty trả người đó khoản công ty còn nợ (dòng quyết toán người đó → công ty). Một phiếu, nhiều dòng (mỗi đơn một dòng).
 */
export async function ghiQuyetToan(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderIds: string[] }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (b.chieu !== "nop" && b.chieu !== "tra") return loi(400, "invalid_input", "Chọn nộp về công ty hay công ty trả.");
  if (typeof b.partyId !== "string" || !PARTY_ID_RE.test(b.partyId)) return loi(400, "invalid_input", "Chọn người nộp / người nhận.");
  if (!Array.isArray(b.phanBo) || b.phanBo.length === 0 || b.phanBo.length > 100) return loi(400, "invalid_input", "Chọn đơn và số tiền của từng đơn (tối đa 100 đơn).");
  const phanBo: { orderId: string; amount: number }[] = [];
  for (const p of b.phanBo as unknown[]) {
    const x = (p ?? {}) as Record<string, unknown>;
    if (typeof x.orderId !== "string" || !UUID_RE.test(x.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
    const so = docSoTien(x.soTien);
    if (!so.ok) return so;
    if (phanBo.some((y) => y.orderId === x.orderId)) return loi(400, "invalid_input", "Mỗi đơn chỉ ghi một dòng.");
    phanBo.push({ orderId: x.orderId, amount: so.value });
  }
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  if (b.partyId === congTyId) return loi(400, "invalid_input", "Người nộp / người nhận không thể là công ty.");
  const [nhan, owners] = await Promise.all([partyLabels(db, [b.partyId]), orderOwners(db, phanBo.map((p) => p.orderId))]);
  if (!nhan.get(b.partyId)) return loi(400, "invalid_input", "Không tìm thấy người nộp / người nhận.");
  if (phanBo.some((p) => !owners.has(p.orderId))) return loi(404, "not_found", "Không tìm thấy đơn.");
  const ngay = docNgay(b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const ghiChu = docLyDo(b.ghiChu, false);
  if (!ghiChu.ok) return ghiChu;
  const at = new Date().toISOString();
  const postingId = crypto.randomUUID();
  const drafts = b.chieu === "nop"
    ? sinhDongQuyetToan({ nguoiNopPartyId: b.partyId, congTyId, phanBo })
    : phanBo.map((p) => ({ debtorPartyId: b.partyId as string, creditorPartyId: congTyId, amount: p.amount, kind: "SETTLEMENT" as const, reversesLineId: null, orderId: p.orderId }));
  const stmts = [
    postingPlainStatement(db, { id: postingId, kind: "SETTLEMENT", orderId: phanBo.length === 1 ? phanBo[0]!.orderId : null, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }),
    ...drafts.map((d) => lineIfPostingStatement(db, lineOf(d, postingId, d.orderId, null, at, input.ai.staffId))),
    auditStatement(db, { staffId: input.ai.staffId, action: "ledger_settlement", at, targetType: "party", targetId: b.partyId, detail: `${b.chieu === "nop" ? "nộp về công ty" : "công ty trả"} · ${phanBo.length} đơn` }),
  ];
  await db.batch(stmts);
  return { ok: true, value: { orderIds: phanBo.map((p) => p.orderId) } };
}

/** Hoàn khách (ADR-0026 điều 5, M2): lần thu "trả lại khách" + (người trả không phải công ty) dòng hoàn khách công ty → người trả. Không hoàn quá số đã thu. */
export async function ghiHoanKhach(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !UUID_RE.test(b.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  if (typeof b.hinhThuc !== "string" || !(METHOD_CODES as readonly string[]).includes(b.hinhThuc)) return loi(400, "invalid_input", "Chọn hình thức hoàn (tiền mặt, chuyển khoản hoặc khác).");
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  let nguoiTra: string;
  if (b.nguoiTra === "cong_ty") nguoiTra = congTyId;
  else if (b.nguoiTra && typeof b.nguoiTra === "object" && typeof (b.nguoiTra as { partyId?: unknown }).partyId === "string" && PARTY_ID_RE.test((b.nguoiTra as { partyId: string }).partyId)) {
    nguoiTra = (b.nguoiTra as { partyId: string }).partyId;
    if (nguoiTra !== congTyId && !(await partyLabels(db, [nguoiTra])).get(nguoiTra)) return loi(400, "invalid_input", "Không tìm thấy người trả.");
  } else return loi(400, "invalid_input", "Chọn người trả tiền cho khách (Công ty hoặc người đang giữ tiền).");
  const [state, receipts] = await Promise.all([orderState(db, b.orderId), receiptsOfOrder(db, b.orderId)]);
  if (!state) return loi(404, "not_found", "Không tìm thấy đơn.");
  const daThu = conLai(receipts.map(toReceiptRow), 0).daThu;
  if (so.value > daThu) return loi(400, "invalid_input", "Không hoàn quá số khách đã trả.");
  const ngay = docNgay(b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const ghiChu = docLyDo(b.ghiChu, false);
  if (!ghiChu.ok) return ghiChu;
  const at = new Date().toISOString();
  const receiptId = crypto.randomUUID();
  const stmts: D1PreparedStatement[] = [
    receiptRefundStatement(db, {
      id: receiptId, orderId: b.orderId, kind: "CUSTOMER_REFUND", amount: so.value, collectorPartyId: nguoiTra, collectorRole: nguoiTra === congTyId ? "COMPANY" : "STAFF",
      method: b.hinhThuc, stage: state.delivered_at ? "AT_DELIVERY" : "PREPAID", occurredDate: ngay.value, note: ghiChu.value, at, by: input.ai.staffId,
    }),
    auditStatement(db, { orderId: b.orderId, staffId: input.ai.staffId, action: "ledger_refund", at }),
  ];
  const dong = sinhDongHoanKhach({ nguoiTraPartyId: nguoiTra, congTyId, so: so.value });
  if (dong.length > 0) {
    const postingId = crypto.randomUUID();
    stmts.push(postingIfReceiptStatement(db, { id: postingId, kind: "REFUND", orderId: b.orderId, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }, receiptId));
    for (const d of dong) stmts.push(lineIfPostingStatement(db, lineOf(d, postingId, b.orderId, receiptId, at, input.ai.staffId)));
  }
  await db.batch(stmts);
  return { ok: true, value: { orderId: b.orderId } };
}

/**
 * Điều chỉnh / đảo (ADR-0026 điều 8, Q6 — lý do BẮT BUỘC):
 *  - `{ loai: "dao_lan_thu", receiptId }` — đảo một lần thu (vd cọc cũ "chưa rõ") + đảo các dòng nợ còn hiệu lực của nó, một phiếu REVERSAL;
 *  - `{ loai: "dao_dong", lineId }` — đảo một dòng nợ;
 *  - `{ loai: "dieu_chinh", orderId, benNo, benDuocNo, soTien, loaiDong }` — một dòng mới (phiếu ADJUSTMENT) Kế toán chọn hai bên + loại dòng.
 */
export async function ghiDieuChinh(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string | null }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const ngay = docNgay(b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const postingId = crypto.randomUUID();
  if (b.loai === "dao_lan_thu") {
    if (typeof b.receiptId !== "string" || !UUID_RE.test(b.receiptId)) return loi(400, "invalid_input", "Mã lần thu không hợp lệ.");
    const rc = await receiptById(db, b.receiptId);
    if (!rc) return loi(404, "not_found", "Không tìm thấy lần thu.");
    if (rc.reverses_id) return loi(409, "invalid_state", "Không đảo dòng đảo.");
    const dong = [];
    for (const l of await linesOfReceipt(db, rc.id)) if (l.reverses_line_id === null && !(await lineReversed(db, l.id))) dong.push(l);
    const stmts = [
      receiptReversalStatement(db, { id: crypto.randomUUID(), occurredDate: ngay.value, note: lyDo.value, at, by, reversesId: rc.id }),
      auditStatement(db, { orderId: rc.order_id, staffId: by, action: "ledger_reversal", at, detail: lyDo.value ?? undefined }),
    ];
    if (dong.length > 0) {
      stmts.push(postingPlainStatement(db, { id: postingId, kind: "REVERSAL", orderId: rc.order_id, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }));
      for (const l of dong) stmts.push(lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), postingId, rc.order_id, rc.id, at, by)));
    }
    try {
      await db.batch(stmts);
    } catch (e) {
      if (/UNIQUE constraint failed: bil_(payment_receipt\.reverses_id|debt_line\.reverses_line_id)/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Lần thu này đã được đảo.");
      throw e;
    }
    return { ok: true, value: { orderId: rc.order_id } };
  }
  if (b.loai === "dao_dong") {
    if (typeof b.lineId !== "string" || !UUID_RE.test(b.lineId)) return loi(400, "invalid_input", "Mã dòng không hợp lệ.");
    const l = await lineById(db, b.lineId);
    if (!l) return loi(404, "not_found", "Không tìm thấy dòng sổ.");
    if (l.reverses_line_id) return loi(409, "invalid_state", "Không đảo dòng đảo.");
    if (!l.order_id) return loi(409, "invalid_state", "Dòng không gắn đơn.");
    const stmts = [
      postingPlainStatement(db, { id: postingId, kind: "REVERSAL", orderId: l.order_id, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }),
      lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), postingId, l.order_id, l.receipt_id, at, by)),
      auditStatement(db, { orderId: l.order_id, staffId: by, action: "ledger_reversal", at, detail: lyDo.value ?? undefined }),
    ];
    try {
      await db.batch(stmts);
    } catch (e) {
      if (/UNIQUE constraint failed: bil_debt_line\.reverses_line_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Dòng này đã được đảo.");
      throw e;
    }
    return { ok: true, value: { orderId: l.order_id } };
  }
  if (b.loai === "dieu_chinh") {
    if (typeof b.orderId !== "string" || !UUID_RE.test(b.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
    if (typeof b.benNo !== "string" || typeof b.benDuocNo !== "string" || !PARTY_ID_RE.test(b.benNo) || !PARTY_ID_RE.test(b.benDuocNo) || b.benNo === b.benDuocNo) {
      return loi(400, "invalid_input", "Chọn bên nợ và bên được nợ (khác nhau).");
    }
    if (b.loaiDong !== "HELD" && b.loaiDong !== "SETTLEMENT" && b.loaiDong !== "REFUND") return loi(400, "invalid_input", "Chọn loại dòng sổ.");
    const so = docSoTien(b.soTien);
    if (!so.ok) return so;
    const [ben, owners] = await Promise.all([partyLabels(db, [b.benNo, b.benDuocNo]), orderOwners(db, [b.orderId])]);
    if (!ben.get(b.benNo) || !ben.get(b.benDuocNo)) return loi(400, "invalid_input", "Không tìm thấy bên nợ / bên được nợ.");
    if (!owners.has(b.orderId)) return loi(404, "not_found", "Không tìm thấy đơn.");
    const stmts = [
      postingPlainStatement(db, { id: postingId, kind: "ADJUSTMENT", orderId: b.orderId, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }),
      lineIfPostingStatement(db, lineOf({ debtorPartyId: b.benNo, creditorPartyId: b.benDuocNo, amount: so.value, kind: b.loaiDong, reversesLineId: null }, postingId, b.orderId, null, at, by)),
      auditStatement(db, { orderId: b.orderId, staffId: by, action: "ledger_adjustment", at, detail: lyDo.value ?? undefined }),
    ];
    await db.batch(stmts);
    return { ok: true, value: { orderId: b.orderId } };
  }
  return loi(400, "invalid_input", "Chọn loại: đảo lần thu, đảo dòng sổ hoặc điều chỉnh.");
}

const LOAI_DONG: Record<string, string> = {
  RECEIPT: "Lần thu", DELIVERED: "Đã giao", COMPLETED: "Hoàn thành", COMPANY_RECEIVED: "Công ty đã nhận", SETTLEMENT: "Nộp / trả", REFUND: "Hoàn khách",
  ADJUSTMENT: "Điều chỉnh", REVERSAL: "Đảo",
};

/** "Sổ của tôi" (ADR-0026 điều 7): nợ của CHÍNH hồ sơ mình với công ty — mã đơn, ngày, loại, số tiền, số dư; không tên/SĐT khách (NT-S2). */
export async function soCuaToi(db: D1Database, partyId: string | null): Promise<SoCuaToiResponse> {
  const congTyId = await ownerCompanyId(db);
  if (!partyId || !congTyId) return { dangGiu: 0, dong: [] };
  let du = 0;
  const dong: SoCuaToiResponse["dong"] = [];
  for (const l of await linesOfParty(db, partyId)) {
    const so = l.debtor_party_id === partyId && l.creditor_party_id === congTyId ? l.amount : l.creditor_party_id === partyId && l.debtor_party_id === congTyId ? -l.amount : 0;
    if (so === 0) continue;
    du += so;
    dong.push({ maDon: l.order_code, ngay: l.occurred_date, loai: LOAI_DONG[l.posting_kind] ?? "Khác", soTien: so, soDu: du });
  }
  return { dangGiu: du, dong };
}

/** Màn sổ của Kế toán (ADR-0026 điều 7): số dư mọi bên, khoản "Công ty thu" chờ xác nhận, lần thu chưa rõ người thu. */
export async function soCongNo(db: D1Database): Promise<SoCongNoResponse> {
  const [soDu, cho, chuaRo] = await Promise.all([balancesWithOwner(db), pendingCompany(db), unknownReceipts(db)]);
  return {
    soDu: soDu.map((r) => ({ partyId: r.party_id, ten: r.label ?? "—", dangGiu: r.balance })),
    choXacNhan: cho.map((r) => ({ receiptId: r.receipt_id, orderId: r.order_id, maDon: r.order_code, soTien: r.amount, ngay: r.occurred_date, nguoiKhai: r.nguoi_khai ?? "—" })),
    chuaRo: chuaRo.map((r) => ({ receiptId: r.receipt_id, orderId: r.order_id, maDon: r.order_code, soTien: r.amount, ngay: r.occurred_date })),
  };
}
