// "Thay lần thu" (ADR-0088 đ2 — TNV-G3): Kế toán / Toàn quyền thay N lần thu cũ bằng M lần thu mới trong MỘT lô ghi, thứ tự cố định (A-B5c):
//   1. ghi các lần thu mới (kèm phiếu RECEIPT + dòng giữ hộ nếu có — cùng `sinhDongLanThu` của lần thu thường);
//   2. đảo các lần thu cũ cùng dòng nợ còn hiệu lực của chúng (phiếu REVERSAL);
//   3. ghi phiếu đánh dấu REPLACEMENT — trigger 0083 kiểm I1 (đơn đã Đã giao: đã thu ròng = phải thu lúc giao − giảm trừ đã phân định; giảm trừ = 0 tới đ9);
//   4. ghi nhật ký `changes() > 0` (số trước / sau).
// Ghi mới TRƯỚC, đảo SAU ⇒ không có trạng thái âm thoáng qua chạm trigger "đã thu ròng ≥ 0" (ADR-0092 Đ1). Dùng được trước Đã giao và sau Hoàn thành.
// CHƯA làm (chờ chủ): tin báo người thu cũ / người thu mới (đ2 "Kiểm soát", ADR-0034 điều 1, 4).
import { auditStatement } from "../audit";
import { UUID_RE } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";
import { transferInOf } from "./coc-repo";
import { lineIfPostingStatement, linesOfReceipt, lineReversed, orderState, ownerCompanyId, postingIfReceiptStatement, postingPlainStatement, receiptsOfOrder } from "./repository";
import { conLai, dong, sinhDongDao, sinhDongLanThu } from "./rules";
import { CHUA_CO_CONG_TY, docLanThu, docLyDo, docNgay, lineOf, loi, loiTrigger, toLineRow, toReceiptRow, type KetQua, type LanThuHopLe, type NguoiGoi } from "./service";
import { phaiThuLucGiao, receiptThayDaoStatement, receiptThayMoiStatement } from "./thay-lan-thu-repo";

/** ADR-0088 đ2: lý do tối thiểu (ký tự, bỏ khoảng trắng hai đầu) — trigger 0083 ép cùng số. */
export const LY_DO_THAY_TOI_THIEU = 10;
const TOI_DA = 10;

/** Ngày phát sinh của lô Thay (Hiến chương 5.14, A-B12): trong tháng đang mở = tháng hiện tại giờ VN; ngày thật ghi ở ghi chú. */
export function kiemNgayThay(ngay: string, homNay: string): { ok: true } | { ok: false; cau: string } {
  const dauThang = `${homNay.slice(0, 8)}01`;
  if (ngay < dauThang || ngay > homNay) return { ok: false, cau: "Ngày phát sinh của lệnh Thay phải trong tháng đang mở (tháng này) — ngày thật ghi ở ghi chú." };
  return { ok: true };
}

/** I1 sau khi thay (đơn đã Đã giao): đã thu ròng mới phải bằng phải thu lúc giao. */
export function kiemI1SauThay(input: { daThuTruoc: number; tongCu: number; tongMoi: number; phaiThuLucGiao: number | null }): { ok: true } | { ok: false; cau: string } {
  if (input.phaiThuLucGiao === null) return { ok: true };
  const sau = input.daThuTruoc - input.tongCu + input.tongMoi;
  if (sau !== input.phaiThuLucGiao) {
    return { ok: false, cau: `Sau khi thay, số đã thu (${dong(sau)}) phải bằng phải thu của đơn lúc Đã giao (${dong(input.phaiThuLucGiao)}).` };
  }
  return { ok: true };
}

export async function ghiThayLanThu(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !UUID_RE.test(b.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
  const orderId = b.orderId;
  const cu = Array.isArray(b.cu) ? b.cu : [];
  const moiRaw = Array.isArray(b.moi) ? b.moi : [];
  if (cu.length < 1 || cu.length > TOI_DA || !cu.every((x) => typeof x === "string" && UUID_RE.test(x)) || new Set(cu).size !== cu.length) {
    return loi(400, "invalid_input", `Chọn từ 1 đến ${TOI_DA} lần thu cần thay.`);
  }
  if (moiRaw.length < 1 || moiRaw.length > TOI_DA) return loi(400, "invalid_input", `Nhập từ 1 đến ${TOI_DA} lần thu đúng.`);
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  if ((lyDo.value ?? "").trim().length < LY_DO_THAY_TOI_THIEU) return loi(400, "invalid_input", `Lý do thay lần thu tối thiểu ${LY_DO_THAY_TOI_THIEU} ký tự.`);
  const ngay = docNgay(b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const homNay = vnToday(new Date());
  const kn = kiemNgayThay(ngay.value, homNay);
  if (!kn.ok) return loi(400, "invalid_input", kn.cau);
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const [st, receipts, due] = await Promise.all([orderState(db, orderId), receiptsOfOrder(db, orderId), phaiThuLucGiao(db, orderId)]);
  if (!st) return loi(404, "not_found", "Không tìm thấy đơn.");
  if (st.status === "cancelled") return loi(409, "invalid_state", "Đơn đã huỷ — tiền của đơn huỷ đi qua “Duyệt hoàn cọc” / “Chuyển tiền sang đơn mới”.");
  const cuRows = [];
  for (const id of cu as string[]) {
    const r = receipts.find((x) => x.id === id);
    if (!r) return loi(404, "not_found", "Không tìm thấy lần thu cần thay trên đơn này.");
    if (r.reverses_id || receipts.some((x) => x.reverses_id === r.id)) return loi(409, "invalid_state", "Lần thu cần thay đã bị đảo hoặc là dòng đảo.");
    if (r.kind_code !== "CUSTOMER_PAYMENT") return loi(409, "invalid_state", "Lệnh Thay chỉ dùng cho lần thu của khách (không cho lần hoàn).");
    if (r.approval_id || r.transfer_of_id || (await transferInOf(db, r.id)).length > 0) return loi(409, "coc_transfer_locked", "Lần thu thuộc lệnh chuyển tiền giữa hai đơn — không thay được.");
    cuRows.push(r);
  }
  const moi: LanThuHopLe[] = [];
  for (const m of moiRaw) {
    const lt = await docLanThu(db, { ...(m as object), ngayPhatSinh: ngay.value }, input.ai, congTyId);
    if (!lt.ok) return lt;
    moi.push(lt.value);
  }
  const daThuTruoc = conLai(receipts.map(toReceiptRow), 0, st.status).daThu;
  const tongCu = cuRows.reduce((s, r) => s + r.amount, 0);
  const tongMoi = moi.reduce((s, m) => s + m.soTien, 0);
  const i1 = kiemI1SauThay({ daThuTruoc, tongCu, tongMoi, phaiThuLucGiao: due });
  if (!i1.ok) return loi(409, "replacement_i1", i1.cau);

  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const markerId = crypto.randomUUID();
  const stage = due === null ? "PREPAID" : "AT_DELIVERY";
  const stmts: D1PreparedStatement[] = [];
  // 1. lần thu mới (+ phiếu RECEIPT + dòng giữ hộ)
  for (const m of moi) {
    const rid = crypto.randomUUID();
    stmts.push(receiptThayMoiStatement(db, {
      id: rid, orderId, amount: m.soTien, collectorPartyId: m.collectorPartyId, collectorRole: m.collectorRole, method: m.hinhThuc, stage, occurredDate: ngay.value,
      note: m.ghiChu, at, by, replacementId: markerId,
    }));
    const dongMoi = sinhDongLanThu({
      kind: "CUSTOMER_PAYMENT", amount: m.soTien, collectorRole: m.collectorRole, collectorPartyId: m.collectorPartyId, nguoiGhiPartyId: input.ai.partyId ?? congTyId,
      nguoiGhiLaKeToan: input.ai.laKeToan, congTyId,
    });
    if (dongMoi.length > 0) {
      const p = crypto.randomUUID();
      stmts.push(postingIfReceiptStatement(db, { id: p, kind: "RECEIPT", orderId, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }, rid));
      for (const d of dongMoi) stmts.push(lineIfPostingStatement(db, lineOf(d, p, orderId, rid, at, by)));
    }
  }
  // 2. đảo lần thu cũ (dòng đảo lần thu TRƯỚC dòng đảo giữ hộ — trigger ADR-0092 Đ4 / 0082)
  for (const r of cuRows) {
    stmts.push(receiptThayDaoStatement(db, { id: crypto.randomUUID(), occurredDate: ngay.value, note: lyDo.value, at, by, reversesId: r.id, replacementId: markerId }));
    const song = [];
    for (const l of await linesOfReceipt(db, r.id)) if (l.reverses_line_id === null && !(await lineReversed(db, l.id))) song.push(l);
    if (song.length > 0) {
      const p = crypto.randomUUID();
      stmts.push(postingPlainStatement(db, { id: p, kind: "REVERSAL", orderId, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }));
      for (const l of song) stmts.push(lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), p, orderId, r.id, at, by)));
    }
  }
  // 3. phiếu đánh dấu (trigger kiểm I1) — 4. nhật ký (chỉ khi phiếu đã chèn)
  stmts.push(postingPlainStatement(db, { id: markerId, kind: "REPLACEMENT", orderId, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }));
  const chiTiet = `thay ${cuRows.length} lần thu (${dong(tongCu)}) bằng ${moi.length} lần thu (${dong(tongMoi)}) · đã thu trước ${dong(daThuTruoc)} → sau ${dong(daThuTruoc - tongCu + tongMoi)} · ${lyDo.value ?? ""}`;
  stmts.push(auditStatement(db, { orderId, staffId: by, action: "ledger_receipt_replaced", at, detail: chiTiet }, "changes() > 0"));
  try {
    await db.batch(stmts);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_(payment_receipt\.reverses_id|debt_line\.reverses_line_id)/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Lần thu cần thay vừa bị đảo — tải lại rồi thử lại.");
    if (loiTrigger(e, "replacement_i1")) return loi(409, "replacement_i1", "Sau khi thay, số đã thu phải bằng phải thu của đơn — số vừa thay đổi, tải lại rồi thử lại.");
    if (loiTrigger(e, "held_already_settled")) return loi(409, "held_already_settled", "Khoản giữ hộ của lần thu cũ đã được ghi nộp — đảo lần nộp trước rồi thay.");
    throw e;
  }
  return { ok: true, value: { orderId } };
}
