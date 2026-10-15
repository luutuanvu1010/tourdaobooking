// Điều phối nhiều bước có I/O của billing (sổ tiền lượt 1): đọc → luật thuần (rules.ts) → gộp câu CHƯA CHẠY của orders / dispatch / audit + câu của billing
// vào MỘT db.batch() (ADR-0024 điều 4, ADR-0002 quy tắc 3). Route (index.ts) hỏi quyền TRƯỚC rồi mới gọi các hàm ở đây. Không SQL thô (module nghiêm).
import { auditStatement } from "../audit";
import { cauBaoVeNguoiPhuTrach } from "../dispatch";
import { cauTriggerKhoa, kyCua, kyDaKhoaTu, ngayCuoiThang, thangDaKhoa, thangKhoaDuocKeTiep } from "../ky-so";
import { datGiaoStatement, hoanThanhStatement, phaiThuNhieuDon, thongTinGiaoDon, type ThongTinGiaoDon } from "../orders";
import type { CocDonDto, KySoResponse, LanThuDto, LanThuInput, LyDoGiuDonDto, OrderPaymentsResponse, SoCongNoResponse, SoCuaToiResponse } from "../../shared/contracts";
import { UUID_RE, error, json } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";
import {
  balancesAt, balancesWithOwner, bankTxnInsertStatement, bankTxnOfCode, bankTxnOfOrder, earliestLedgerMonth, lineById, lineIfPostingStatement, lineReversed, linesOfOrder, linesOfParty, linesOfReceipt, mocMaGiaoDich, orderOwners, orderState, ownerCompanyId, partyLabels,
  pendingCompany, postingIfCompletedAtStatement, postingIfDeliveredAtStatement, postingIfReceiptStatement, postingPlainStatement, receiptAtDeliveryStatement,
  receiptBeforeDeliveredStatement, receiptById, reconInsertStatement, reconOfOrder, reconOfReceipt, type ReconDbRow, receiptRefundStatement, receiptReversalStatement, receiptsOfOrder, receiptsOfOrders, unknownReceipts, type LineDbRow,
  type NewLine, type NewReceipt, type ReceiptDbRow,
} from "./repository";
import { transferInOf } from "./coc-repo";
import { docGiaoDich, kiemMaGiaoDich, type GiaoDich } from "./ma-giao-dich";
import { phaiThuLucGiao } from "./thay-lan-thu-repo";
import {
  CAU_DA_NOP, LY_DO_DIEU_CHINH_TOI_THIEU, METHOD_CODES, canDoiChieu, conLai, khoanMoiDoiChieu, type DoiChieuRow, dong, khoanChoXacNhan, kiemDaoLanThu, kiemDieuChinh, kiemHoanNguoiGiu, kiemQuyetToan, soDuCap, lyDoChuaGiaoDuoc, lyDoChuaHoanThanh, ngayPhatSinh, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan, sinhDongXacNhanCongTy,
  soDuTheoBen, type LineDraft, type MethodCode, type ReceiptRow, type SoTienDon,
} from "./rules";

export const MAX_SO_TIEN = 10_000_000_000;
export const PARTY_ID_RE = /^[0-9A-Za-z_-]{1,64}$/;

/** Nhãn hình thức thu gửi cho trình duyệt (`LanThuDto.hinhThuc`). Trình duyệt SO NHÃN này với `METHOD_LABEL` của `web/format.ts` (ô mã giao dịch ở "Xác nhận đã nhận") — bài `hinh-thuc-nhan.test.ts` khoá hai nơi khớp nhau. */
export const HINH_THUC: Record<string, string> = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", OTHER: "Khác" };
const GIAI_DOAN: Record<string, string> = { PREPAID: "Trả trước", AT_DELIVERY: "Lúc Đã giao" };

export const toReceiptRow = (r: Pick<ReceiptDbRow, "id" | "kind_code" | "amount" | "collector_role_code" | "collector_party_id" | "reverses_id"> & { approval_id?: string | null }): ReceiptRow => ({
  id: r.id, kind: r.kind_code, amount: r.amount, collectorRole: r.collector_role_code, collectorPartyId: r.collector_party_id, reversesId: r.reverses_id,
  approvalId: r.approval_id ?? null,
});
export const toDoiChieuRow = (r: ReconDbRow): DoiChieuRow => ({ receiptId: r.receipt_id, kind: r.kind_code, occurredDate: r.occurred_date });
export const toLineRow = (l: LineDbRow) => ({
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
export const loi = (status: number, code: string, message: string): { ok: false; res: Response } => ({ ok: false, res: error(status, code, message) });

/** Hàm "ngày này thuộc tháng đã khoá sổ chưa" (ADR-0080 D1) — đọc tập tháng đã khoá MỘT lần ở đầu mỗi lệnh ghi, rồi truyền xuống luật thuần. */
export const layKyDaKhoa = async (db: D1Database): Promise<(ngay: string) => boolean> => kyDaKhoaTu(new Set(await thangDaKhoa(db)));

/** Lỗi trigger khoá tháng (tháng vừa khoá giữa lúc kiểm và lúc ghi — Review Focus 3) ⇒ 409 đúng câu của tháng đó. Gọi ĐẦU mọi `catch` của lô ghi tiền. */
export async function loiKhoaKy(db: D1Database, e: unknown, ngays: readonly string[]): Promise<{ ok: false; res: Response } | null> {
  const cau = await cauTriggerKhoa(db, e, ngays);
  return cau ? loi(409, "period_closed", cau) : null;
}

/** Lỗi kèm trường dữ liệu trong thân `error` (giao diện đọc qua ApiError.details) — vd 409 "số thực chuyển lệch" mang số đã ghi để điền sẵn (không route tra mã). */
export const loiKem = (status: number, code: string, message: string, them: Record<string, unknown>): { ok: false; res: Response } => ({
  ok: false,
  res: json({ error: { code, message, ...them } }, status),
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Mã giao dịch ngân hàng (ADR-0092 Đ6 + ADR-0108 đ4) — ba đường ghi đòi mã (T1): "Công ty đã nhận"; Kế toán / Toàn quyền tự ghi (kể cả kèm Đã giao); lần thu
// mới trong "Thay lần thu". Lớp CSDL: trigger 0088 (đường 2 chỉ máy chủ — lưới thứ hai R-BIL-D6b).
// ---------------------------------------------------------------------------------------------------------------------------------------------------
/** T1 đường 2 + 3: lần thu CK – Công ty thu do người có `ledger.write` ghi — đúng vị từ mà `sinhDongLanThu` KHÔNG sinh dòng giữ hộ ⇒ bắt buộc mã. */
export const canMaGiaoDich = (lt: LanThuHopLe, ai: NguoiGoi): boolean => ai.laKeToan && lt.collectorRole === "COMPANY" && lt.hinhThuc === "BANK_TRANSFER";

/** Đọc mã của một lần thu MỚI (đường 2, 3). Thân `raw` là thân lần thu (có `maGiaoDich`, `soThucChuyen`). */
export function docGiaoDichCuaLanThu(raw: unknown, lt: LanThuHopLe, ai: NguoiGoi): KetQua<GiaoDich | null> {
  const b = (raw && typeof raw === "object" ? raw : {}) as { maGiaoDich?: unknown; soThucChuyen?: unknown };
  const can = canMaGiaoDich(lt, ai);
  const d = docGiaoDich(b, { choPhep: can, batBuoc: can });
  return d.ok ? d : loi(400, d.ma, d.cau);
}

/** Kiểm trước lô (lớp 1) mọi gắn mã của MỘT lệnh. `boQua` = lần thu sắp bị thay (Thay lần thu) — loại khỏi kiểm khi chúng còn hiệu lực lúc đọc. */
export async function kiemCacMa(
  db: D1Database,
  gan: readonly { gd: GiaoDich; orderId: string; soTien: number }[],
  boQua: ReadonlySet<string> = new Set(),
): Promise<KetQua<null>> {
  const trongLenh: { ma: string; receiptId: string; orderId: string; soTien: number; soThucChuyen: number }[] = [];
  for (const g of gan) {
    const daCo = [
      ...(await bankTxnOfCode(db, g.gd.ma)).filter((r) => !boQua.has(r.receipt_id)).map((r) => ({ receiptId: r.receipt_id, orderId: r.order_id, soTien: r.amount, soThucChuyen: r.transferred_amount })),
      ...trongLenh.filter((x) => x.ma === g.gd.ma),
    ];
    const k = kiemMaGiaoDich({ soThucChuyen: g.gd.soThucChuyen, soTien: g.soTien, orderId: g.orderId, daCo });
    if (!k.ok) return k.soThucChuyen !== undefined ? loiKem(409, k.ma, k.cau, { soThucChuyen: k.soThucChuyen }) : loi(409, k.ma, k.cau);
    trongLenh.push({ ma: g.gd.ma, receiptId: `moi-${trongLenh.length}`, orderId: g.orderId, soTien: g.soTien, soThucChuyen: g.gd.soThucChuyen });
  }
  return { ok: true, value: null };
}

/** Câu gắn mã + nhật ký (`changes() > 0`: chỉ ghi khi dòng nối đã chèn). Nhật ký KHÔNG chép mã. */
export function cauGanMa(db: D1Database, i: { receiptId: string; orderId: string; gd: GiaoDich; at: string; by: string }): D1PreparedStatement[] {
  const id = crypto.randomUUID();
  return [
    bankTxnInsertStatement(db, { id, receiptId: i.receiptId, ma: i.gd.ma, soThucChuyen: i.gd.soThucChuyen, at: i.at, by: i.by }),
    auditStatement(db, { orderId: i.orderId, staffId: i.by, action: "ledger_bank_txn_linked", at: i.at, targetType: "ledger", targetId: i.receiptId, detail: "gắn mã giao dịch ngân hàng" }, "changes() > 0"),
  ];
}

/** Lỗi lớp CSDL của mã (dữ liệu đổi giữa lúc kiểm và lúc ghi, hoặc hai người bấm cùng lúc) — null nếu không phải lỗi mã. */
export function loiMaTrigger(e: unknown): { ok: false; res: Response } | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: bil_receipt_bank_txn\.receipt_id/.test(m)) return loi(409, "stale", "Khoản này vừa được xác nhận — tải lại để xem.");
  if (loiTrigger(e, "bank_txn_duplicate")) return loi(409, "bank_txn_duplicate", "Mã giao dịch này vừa được gắn với một lần thu khác của đơn — tải lại để xem.");
  if (loiTrigger(e, "bank_txn_amount_mismatch")) return loi(409, "bank_txn_amount_mismatch", "Mã này vừa được ghi với số tiền thực chuyển khác — tải lại rồi thử lại.");
  if (loiTrigger(e, "bank_txn_over")) return loi(409, "bank_txn_over", "Tổng các lần thu gắn mã này vượt số tiền thực chuyển — tải lại rồi thử lại.");
  if (loiTrigger(e, "bank_txn_required")) return loi(400, "bank_txn_required", "Nhập mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê.");
  if (loiTrigger(e, "bank_txn_receipt_invalid")) return loi(409, "stale", "Lần thu vừa thay đổi — tải lại rồi thử lại.");
  return null;
}

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
  const ngay = ngayPhatSinh({ chon: b.ngayPhatSinh, homNay: vnToday(new Date()), laKeToan: ai.laKeToan, kyDaKhoa: await layKyDaKhoa(db) });
  if (!ngay.ok) return ngay.khoa ? loi(409, "period_closed", ngay.message) : loi(400, "invalid_input", ngay.message);
  let ghiChu: string | null = null;
  if (b.ghiChu !== undefined && b.ghiChu !== null && b.ghiChu !== "") {
    if (typeof b.ghiChu !== "string" || b.ghiChu.length > 500) return loi(400, "invalid_input", "Ghi chú tối đa 500 ký tự.");
    if (/\d{8,}/.test(b.ghiChu.replace(/[\s.-]/g, ""))) return loi(400, "invalid_input", "Ghi chú không được chứa số điện thoại / số tài khoản.");
    ghiChu = b.ghiChu.trim() || null;
  }
  return { ok: true, value: { soTien, hinhThuc: b.hinhThuc as MethodCode, collectorRole, collectorPartyId, ngayPhatSinh: ngay.value, ghiChu } };
}

/** Câu lệnh của MỘT lần thu: lần thu (lính gác do `receiptStmt`), nhật ký (chỉ khi lần thu đã chèn), phiếu RECEIPT + dòng giữ hộ (nếu có). */
export function cauLanThu(
  db: D1Database,
  input: { orderId: string; lt: LanThuHopLe; stage: "PREPAID" | "AT_DELIVERY"; ai: NguoiGoi; congTyId: string; at: string; giaoDich?: GiaoDich | null },
  receiptStmt: (r: NewReceipt) => D1PreparedStatement,
): D1PreparedStatement[] {
  const receiptId = crypto.randomUUID();
  const r: NewReceipt = {
    id: receiptId, orderId: input.orderId, kind: "CUSTOMER_PAYMENT", amount: input.lt.soTien, collectorPartyId: input.lt.collectorPartyId, collectorRole: input.lt.collectorRole,
    method: input.lt.hinhThuc, stage: input.stage, occurredDate: input.lt.ngayPhatSinh, note: input.lt.ghiChu, at: input.at, by: input.ai.staffId,
  };
  const dong = sinhDongLanThu({
    kind: "CUSTOMER_PAYMENT", amount: r.amount, collectorRole: r.collectorRole, collectorPartyId: r.collectorPartyId, method: input.lt.hinhThuc, nguoiGhiPartyId: input.ai.partyId ?? congTyNeuKeToan(input.ai, input.congTyId),
    nguoiGhiLaKeToan: input.ai.laKeToan, congTyId: input.congTyId,
  });
  const out = [
    receiptStmt(r),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "payment_recorded", at: input.at, detail: input.stage === "AT_DELIVERY" ? "lúc Đã giao" : "trả trước" }, "changes() > 0"),
  ];
  // ADR-0092 Đ6: dòng nối mã (lính gác "lần thu đã chèn") ngay sau nhật ký lần thu; lần thu luôn là câu ĐẦU (ghiLanThu đọc kq[0]).
  if (input.giaoDich) out.push(...cauGanMa(db, { receiptId, orderId: input.orderId, gd: input.giaoDich, at: input.at, by: input.ai.staffId }));
  // ADR-0118 Điều 1: "Công ty thu" do người không phải Kế toán khai ⇒ KHÔNG dòng giữ hộ, chỉ dấu ĐANG ĐỐI CHIẾU (lính gác "lần thu đã chèn").
  if (canDoiChieu({ kind: r.kind, collectorRole: r.collectorRole, method: input.lt.hinhThuc, nguoiGhiPartyId: input.ai.partyId ?? congTyNeuKeToan(input.ai, input.congTyId), nguoiGhiLaKeToan: input.ai.laKeToan, congTyId: input.congTyId })) {
    out.push(reconInsertStatement(db, { id: crypto.randomUUID(), receiptId, kind: "DECLARED", occurredDate: vnToday(new Date()), at: input.at, by: input.ai.staffId }));
  }
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
function lanThuDto(
  rows: readonly ReceiptDbRow[], xemNguoiThu: boolean, ma: Map<string, { ma: string; soThucChuyen: number }> | null,
  /** D-1: người xem giữ quyền Đối tác ⇒ `nguoiGhi` / `ghiChu` chỉ ở lần thu CHÍNH họ ghi (`created_by` = id người xem); lần thu của người khác: khoá VẮNG. */
  doiTac: { staffId: string } | null,
): LanThuDto[] {
  const biDao = new Set(rows.flatMap((r) => (r.reverses_id ? [r.reverses_id] : [])));
  return rows.map((r) => ({
    id: r.id,
    traLai: r.kind_code === "CUSTOMER_REFUND",
    soTien: r.amount,
    hinhThuc: HINH_THUC[r.method_code] ?? "Khác",
    nguoiThu: r.collector_role_code === "UNKNOWN" ? "Chưa rõ" : r.collector_role_code === "COMPANY" ? "Công ty" : (r.collector_label ?? "—"),
    nguoiThuPartyId: xemNguoiThu ? r.collector_party_id : null,
    nguoiThuChuaRo: r.collector_role_code === "UNKNOWN",
    giaiDoan: GIAI_DOAN[r.stage_code] ?? "",
    ngayPhatSinh: r.occurred_date,
    daDao: biDao.has(r.id),
    laDongDao: r.reverses_id !== null,
    ...(doiTac && r.created_by !== doiTac.staffId
      ? {}
      : { nguoiGhi: r.created_by === "he-thong" ? "Hệ thống (chuyển thu trước cũ)" : r.created_by_label, ghiChu: r.note }),
    ghiLuc: r.created_at,
    // ADR-0092 Đ6: chỉ người có ledger.write thấy mã + số thực chuyển — người khác KHÔNG có khoá này (không chỉ là null).
    ...(ma?.has(r.id) ? { maGiaoDich: ma.get(r.id)!.ma, soThucChuyen: ma.get(r.id)!.soThucChuyen } : {}),
  }));
}

export interface QuyenXemTien {
  /** Người xem giữ quyền Đối tác (`holdsPartner`, kể cả tài khoản lai) — D-1: bỏ người ghi / ghi chú nội bộ của lần thu do người khác ghi. */
  laDoiTac: boolean; // BẮT BUỘC (không mặc định): nơi gọi mới phải tự quyết, kẻo Đối tác nhận đủ người ghi / ghi chú nội bộ
  coTheGhiThu: boolean;
  coTheBamGiao: boolean;
  coTheBamHoanThanh: boolean;
}

/** Dựng `OrderPaymentsResponse` cho người xem (đơn `info` đã đọc; quyền đã hỏi ở route). */
export async function tienCuaDon(db: D1Database, info: ThongTinGiaoDon, ai: NguoiGoi, quyen: QuyenXemTien, coc: CocDonDto | null = null): Promise<OrderPaymentsResponse> {
  const [receipts, lines, congTyId, maDon, recon] = await Promise.all([
    receiptsOfOrder(db, info.orderId), linesOfOrder(db, info.orderId), ownerCompanyId(db), ai.laKeToan ? bankTxnOfOrder(db, info.orderId) : Promise.resolve(null), reconOfOrder(db, info.orderId),
  ]);
  const doiChieu = recon.map(toDoiChieuRow);
  const so = conLai(receipts.map(toReceiptRow), info.phaiThu, info.status);
  const lyGiao = lyDoChuaGiaoDuoc({ status: info.status, deliveredAt: info.deliveredAt, homNay: vnToday(new Date()), ngayDi: info.ngayDi, dichVuThieuNgay: info.dichVuThieuNgay, coNguoiHuong: info.coNguoiHuong, soKhoanDoiChieu: khoanMoiDoiChieu(receipts.map(toReceiptRow), doiChieu).size, so });
  const soDu = congTyId ? soDuTheoBen(lines.map(toLineRow), congTyId) : new Map<string, number>();
  const ten = await partyLabels(db, [...soDu.keys()]);
  // Lần thu "Công ty thu – CK" chờ xác nhận — MỘT định nghĩa (`khoanChoXacNhan`, dùng chung với "đang đối chiếu" của đơn huỷ — ADR-0089 đ2).
  const choXacNhan = [...khoanChoXacNhan(receipts.map(toReceiptRow), lines.map(toLineRow), doiChieu)];
  // ADR-0092 Đ2b (V2.6): phần "Công ty thu – CK" CHỜ XÁC NHẬN của từng người khai — nút "Đã nộp" không gộp phần đó (nộp nó = tất toán bằng đường nộp bù).
  const choCuaNguoi = new Map<string, number>();
  for (const l of lines) {
    if (l.kind_code === "HELD" && l.reverses_line_id === null && l.receipt_id !== null && choXacNhan.includes(l.receipt_id)) {
      choCuaNguoi.set(l.debtor_party_id, (choCuaNguoi.get(l.debtor_party_id) ?? 0) + l.amount);
    }
  }
  const lyHoan = lyDoChuaHoanThanh({
    deliveredAt: info.deliveredAt, completedAt: info.completedAt, soDu, tenBen: (id) => ten.get(id)?.label ?? "Một người", daThu: so.daThu,
    phaiThuLucGiao: info.deliveredAt ? await phaiThuLucGiao(db, info.orderId) : null,
  });
  return {
    phaiThu: info.phaiThu,
    daThu: so.daThu,
    conLai: so.conLai,
    du: so.du,
    chuaRo: so.chuaRo,
    lanThu: lanThuDto(receipts, ai.laKeToan, maDon, quyen.laDoiTac ? { staffId: ai.staffId } : null),
    deliveredAt: info.deliveredAt,
    completedAt: info.completedAt,
    lyDoChuaGiao: info.deliveredAt ? null : (lyGiao as LyDoGiuDonDto | null),
    lyDoChuaHoanThanh: info.deliveredAt && !info.completedAt ? (lyHoan as LyDoGiuDonDto | null) : null,
    banDangGiu: ai.partyId ? Math.max(0, soDu.get(ai.partyId) ?? 0) : 0,
    coTheGhiThu: quyen.coTheGhiThu && info.deliveredAt === null,
    quyenGiao: quyen.coTheBamGiao,
    coTheGiao: quyen.coTheBamGiao && info.deliveredAt === null && lyGiao === null,
    quyenHoanThanh: quyen.coTheBamHoanThanh,
    coTheHoanThanh: quyen.coTheBamHoanThanh && info.deliveredAt !== null && info.completedAt === null && lyHoan === null,
    laKeToan: ai.laKeToan,
    keToan: ai.laKeToan
      ? {
          dangGiu: [...soDu].filter(([, v]) => v > 0).map(([partyId, soTien]) => ({ partyId, ten: ten.get(partyId)?.label ?? "Một người", soTien, choXacNhan: Math.min(soTien, choCuaNguoi.get(partyId) ?? 0) })),
          choXacNhan,
        }
      : null,
    coc,
  };
}

/** Tiền của NHIỀU đơn (danh sách, Trang chủ, "Việc của tôi") — cùng hàm `conLai`. */
type TienMotDon = SoTienDon & { phaiThu: number; daGiao: boolean; hoanThanh: boolean; ngayDiSomNhat: string | null };
export async function tienNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, TienMotDon>> {
  const [base, receipts] = await Promise.all([phaiThuNhieuDon(db, orderIds), receiptsOfOrders(db, orderIds)]);
  const theoDon = new Map<string, ReceiptRow[]>();
  for (const r of receipts) theoDon.set(r.order_id, [...(theoDon.get(r.order_id) ?? []), toReceiptRow(r)]);
  const out = new Map<string, TienMotDon>();
  for (const [id, b] of base) {
    out.set(id, { ...conLai(theoDon.get(id) ?? [], b.phaiThu, b.status), phaiThu: b.phaiThu, daGiao: b.deliveredAt !== null, hoanThanh: b.completedAt !== null, ngayDiSomNhat: b.ngayDiSomNhat });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi lần thu trước "Đã giao" (ADR-0026 đ2, đ4; NT-S3)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const DA_GIAO = () => loi(409, "order_delivered", "Đơn đã Đã giao – đã thu đủ: không ghi thêm lần thu. Sai sót thì Kế toán dùng “Thay lần thu”.");
export const CHUA_CO_CONG_TY = () => loi(503, "owner_company_missing", "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống.");

export async function ghiLanThu(db: D1Database, input: { orderId: string; deliveredAt: string | null; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  if (input.deliveredAt) return DA_GIAO();
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const lt = await docLanThu(db, input.raw, input.ai, congTyId);
  if (!lt.ok) return lt;
  const gd = docGiaoDichCuaLanThu(input.raw, lt.value, input.ai);
  if (!gd.ok) return gd;
  if (gd.value) {
    const k = await kiemCacMa(db, [{ gd: gd.value, orderId: input.orderId, soTien: lt.value.soTien }]);
    if (!k.ok) return k;
  }
  const at = new Date().toISOString();
  const stmts = cauLanThu(db, { orderId: input.orderId, lt: lt.value, stage: "PREPAID", ai: input.ai, congTyId, at, giaoDich: gd.value }, (r) => receiptBeforeDeliveredStatement(db, r));
  let kq: D1Result[];
  try {
    kq = await db.batch(stmts);
  } catch (e) {
    const k = await loiKhoaKy(db, e, [lt.value.ngayPhatSinh]);
    if (k) return k;
    const m = loiMaTrigger(e);
    if (m) return m;
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return DA_GIAO(); // đơn vừa "Đã giao" giữa lúc đọc và lúc ghi (lính gác của câu lần thu)
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// "Đã giao – đã thu đủ" (ADR-0025 điều 3–4; kế hoạch §3.3 — MỘT lô: [câu bảo vệ dispatch] → câu orders → [lần thu] → phiếu Đã giao (trigger kiểm tiền) → nhật ký)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export const loiTrigger = (e: unknown, ma: string): boolean => new RegExp(`\\b${ma}:`).test(e instanceof Error ? e.message : String(e));

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
  let gd: GiaoDich | null = null;
  if (lt) {
    const d = docGiaoDichCuaLanThu(input.rawLanThu, lt, ai);
    if (!d.ok) return d;
    gd = d.value;
    if (gd) {
      const k = await kiemCacMa(db, [{ gd, orderId: input.orderId, soTien: lt.soTien }]);
      if (!k.ok) return k;
    }
  }
  // Kiểm TRƯỚC lô (để trả câu dễ hiểu) — tính cả lần thu nhập ở bước này. Máy chủ vẫn kiểm lại TRONG lô (câu orders + trigger billing).
  const receipts = (await receiptsOfOrder(db, input.orderId)).map(toReceiptRow);
  // ADR-0118 Điều 1.2: khoản "Công ty thu" đang đối chiếu (đã có + khoản đang nhập kèm nếu người bấm không phải Kế toán) chặn "Đã giao".
  const soKhoanDoiChieu = khoanMoiDoiChieu(receipts, (await reconOfOrder(db, input.orderId)).map(toDoiChieuRow)).size
    + (lt && canDoiChieu({ kind: "CUSTOMER_PAYMENT", collectorRole: lt.collectorRole, method: lt.hinhThuc, nguoiGhiPartyId: ai.partyId ?? congTyNeuKeToan(ai, congTyId), nguoiGhiLaKeToan: ai.laKeToan, congTyId }) ? 1 : 0);
  if (lt) receipts.push({ id: "moi", kind: "CUSTOMER_PAYMENT", amount: lt.soTien, collectorRole: lt.collectorRole, collectorPartyId: lt.collectorPartyId, reversesId: null });
  const homNay = vnToday(new Date());
  const ly = lyDoChuaGiaoDuoc({ status: info.status, deliveredAt: info.deliveredAt, homNay, ngayDi: info.ngayDi, dichVuThieuNgay: info.dichVuThieuNgay, coNguoiHuong: info.coNguoiHuong, soKhoanDoiChieu, so: conLai(receipts, info.phaiThu, info.status) });
  if (ly) return loi(409, ly.ma === "already_delivered" ? "order_delivered" : "not_deliverable", ly.cau);
  if (input.canCauBaoVe && !ai.partyId) return loi(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới bấm được Đã giao.");

  const at = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  if (input.canCauBaoVe) stmts.push(cauBaoVeNguoiPhuTrach(db, input.orderId, ai.partyId!));
  stmts.push(datGiaoStatement(db, { orderId: input.orderId, at, by: ai.staffId, expectedUpdatedAt: info.updatedAt, expectedAdjSeq: info.adjSeq, homNay, sauCauBaoVe: input.canCauBaoVe }));
  if (lt) stmts.push(...cauLanThu(db, { orderId: input.orderId, lt, stage: "AT_DELIVERY", ai, congTyId, at, giaoDich: gd }, (r) => receiptAtDeliveryStatement(db, r, at)));
  stmts.push(postingIfDeliveredAtStatement(db, { id: crypto.randomUUID(), kind: "DELIVERED", orderId: input.orderId, reason: null, reversesPostingId: null, occurredDate: homNay, dueSnapshot: info.phaiThu, at, by: ai.staffId }, at));
  // Nhật ký LUÔN sau câu orders và NGAY sau phiếu Đã giao: chỉ ghi khi phiếu (có lính gác mốc của chính lô) đã chèn — bên thua không để lại dòng nào.
  stmts.push(auditStatement(db, { orderId: input.orderId, staffId: ai.staffId, action: "order_delivered", at }, "changes() > 0"));
  try {
    await db.batch(stmts);
  } catch (e) {
    // Phiếu Đã giao ghi ngày hôm nay (không khoá được); lần thu nhập kèm (Kế toán / Toàn quyền ghi lùi ngày) có thể thuộc tháng vừa bị khoá.
    const k = await loiKhoaKy(db, e, [homNay, ...(lt ? [lt.ngayPhatSinh] : [])]);
    if (k) return k;
    const m = loiMaTrigger(e);
    if (m) return m;
    if (loiTrigger(e, "delivered_reconciling")) return loi(409, "not_deliverable", "Còn khoản chuyển khoản “Công ty thu” đang chờ Kế toán đối chiếu — tải lại màn hình rồi thử lại.");
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
  // ADR-0088 đ5: I1 (đã thu ròng = phải thu lúc giao − giảm trừ đã phân định; giảm trừ = 0 tới đ9) — lớp CSDL: trigger bil_posting_completed_due (0083).
  const [cacLanThu, due] = await Promise.all([receiptsOfOrder(db, input.orderId), phaiThuLucGiao(db, input.orderId)]);
  const ly = lyDoChuaHoanThanh({
    deliveredAt: info.deliveredAt, completedAt: info.completedAt, soDu, tenBen: (id) => ten.get(id)?.label ?? "Một người",
    daThu: conLai(cacLanThu.map(toReceiptRow), info.phaiThu, info.status).daThu, phaiThuLucGiao: due,
  });
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
    const k = await loiKhoaKy(db, e, [vnToday(new Date())]);
    if (k) return k;
    if (loiTrigger(e, "completed_unsettled")) return loi(409, "not_completable", "Còn người giữ tiền của công ty vì đơn này — tải lại màn hình để xem.");
    if (loiTrigger(e, "completed_due_mismatch")) return loi(409, "not_completable", "Số đã thu khác phải thu lúc Đã giao — tải lại màn hình để xem.");
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
export const docLyDo = (raw: unknown, batBuoc: boolean): KetQua<string | null> => {
  if (raw === undefined || raw === null || raw === "") return batBuoc ? loi(400, "invalid_input", "Cần ghi lý do.") : { ok: true, value: null };
  if (typeof raw !== "string" || raw.trim().length === 0) return batBuoc ? loi(400, "invalid_input", "Cần ghi lý do.") : { ok: true, value: null };
  if (raw.length > 500) return loi(400, "invalid_input", "Lý do / ghi chú tối đa 500 ký tự.");
  if (/\d{8,}/.test(raw.replace(/[\s.-]/g, ""))) return loi(400, "invalid_input", "Lý do / ghi chú không được chứa số điện thoại / số tài khoản.");
  return { ok: true, value: raw.trim() };
};
export const docSoTien = (raw: unknown): KetQua<number> =>
  typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= MAX_SO_TIEN ? { ok: true, value: raw } : loi(400, "invalid_input", "Số tiền phải là số nguyên dương (đồng).");
/** Ngày phát sinh do Kế toán chọn (đường ghi sổ): tháng đã khoá ⇒ 409 `period_closed`; `kyDaKhoa` do hàm gọi đọc một lần ở đầu lệnh (`layKyDaKhoa`). */
export const docNgay = (raw: unknown, kyDaKhoa: (ngay: string) => boolean): KetQua<string> => {
  const n = ngayPhatSinh({ chon: raw, homNay: vnToday(new Date()), laKeToan: true, kyDaKhoa });
  if (n.ok) return { ok: true, value: n.value };
  return n.khoa ? loi(409, "period_closed", n.message) : loi(400, "invalid_input", n.message);
};

/**
 * "Công ty đã nhận": Kế toán xác nhận khoản "Công ty thu" do người khác khai. Hai đường (ADR-0118 Điều 1):
 *  - khoản MỚI (có dấu DECLARED, chưa CONFIRMED): ghi dấu CONFIRMED + mã giao dịch (nếu chuyển khoản) + nhật ký — KHÔNG sinh dòng nợ nào;
 *  - khoản CŨ (đã có dòng giữ hộ trước ngày áp luật): phiếu COMPANY_RECEIVED = dòng đảo của dòng giữ hộ trên người khai (H3, ADR-0092 Đ2b) — dữ liệu cũ không đổi.
 * Phân biệt bằng DỮ LIỆU: còn dòng giữ hộ chưa bị đảo ⇒ khoản cũ; còn DECLARED chưa CONFIRMED (lần thu chưa bị đảo) ⇒ khoản mới.
 */
export async function xacNhanCongTyNhan(db: D1Database, input: { receiptId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  const rc = await receiptById(db, input.receiptId);
  if (!rc) return loi(404, "not_found", "Không tìm thấy lần thu.");
  if (rc.collector_role_code !== "COMPANY") return loi(409, "invalid_state", "Lần thu này không phải khoản Công ty thu.");
  const cho = [];
  for (const l of await linesOfReceipt(db, rc.id)) if (l.kind_code === "HELD" && l.reverses_line_id === null && !(await lineReversed(db, l.id))) cho.push(l);
  const recon = (await reconOfReceipt(db, rc.id)).map(toDoiChieuRow);
  const daDao = rc.reverses_id !== null || (await receiptsOfOrder(db, rc.order_id)).some((x) => x.reverses_id === rc.id);
  const laKhoanMoi = cho.length === 0 && !daDao && khoanMoiDoiChieu([{ id: rc.id, collectorRole: "COMPANY" }], recon).size > 0;
  if (cho.length === 0 && !laKhoanMoi) return loi(409, "invalid_state", "Khoản này không còn chờ xác nhận.");
  const dongDon = (await linesOfOrder(db, rc.order_id)).map(toLineRow);
  if (!laKhoanMoi) {
    // ADR-0092 Đ2b (TNV-VP01): một dòng giữ hộ tất toán MỘT lần — "Công ty đã nhận" chỉ khi người khai còn nợ công ty trên đơn ≥ số dòng giữ hộ (chưa bị "Nộp").
    const conNo = soDuCap(dongDon, cho[0]!.debtor_party_id, cho[0]!.creditor_party_id);
    if (conNo < cho.reduce((t, l) => t + l.amount, 0)) return loi(409, "held_already_settled", CAU_DA_NOP);
  }
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  // ADR-0092 Đ6 đường 1 + C1: khoản chuyển khoản ghi TỪ mốc cắt bắt buộc mã; khoản cũ hơn mốc không bắt buộc (nhập thì vẫn gắn và kiểm). Tiền mặt không nhận mã.
  const laCK = rc.method_code === "BANK_TRANSFER";
  const moc = laCK ? await mocMaGiaoDich(db) : null;
  const d = docGiaoDich(b, { choPhep: laCK, batBuoc: laCK && (moc === null || rc.created_at >= moc) });
  if (!d.ok) return loi(400, d.ma, d.cau);
  if (d.value) {
    const k = await kiemCacMa(db, [{ gd: d.value, orderId: rc.order_id, soTien: rc.amount }]);
    if (!k.ok) return k;
  }
  const at = new Date().toISOString();
  const ganMa = d.value ? cauGanMa(db, { receiptId: rc.id, orderId: rc.order_id, gd: d.value, at, by: input.ai.staffId }) : [];
  let stmts: D1PreparedStatement[];
  if (laKhoanMoi) {
    // Khoản MỚI: dấu CONFIRMED (trigger 0099 canh "còn chờ" và mã), nhật ký chỉ khi dấu đã chèn; không phiếu, không dòng nợ.
    stmts = [
      ...ganMa,
      reconInsertStatement(db, { id: crypto.randomUUID(), receiptId: rc.id, kind: "CONFIRMED", occurredDate: ngay.value, at, by: input.ai.staffId }),
      auditStatement(db, { orderId: rc.order_id, staffId: input.ai.staffId, action: "ledger_company_received", at }, "changes() > 0"),
    ];
  } else {
    const postingId = crypto.randomUUID();
    stmts = [
      ...ganMa,
      postingPlainStatement(db, { id: postingId, kind: "COMPANY_RECEIVED", orderId: rc.order_id, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }),
      ...cho.map((l) => lineIfPostingStatement(db, lineOf(sinhDongXacNhanCongTy(toLineRow(l)), postingId, rc.order_id, rc.id, at, input.ai.staffId))),
      auditStatement(db, { orderId: rc.order_id, staffId: input.ai.staffId, action: "ledger_company_received", at }),
    ];
  }
  try {
    await db.batch(stmts);
  } catch (e) {
    const k = await loiKhoaKy(db, e, [ngay.value]);
    if (k) return k;
    const m = loiMaTrigger(e);
    if (m) return m;
    if (/UNIQUE constraint failed: bil_debt_line\.reverses_line_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Khoản này vừa được xác nhận.");
    if (/UNIQUE constraint failed: bil_receipt_recon\./.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Khoản này vừa được xác nhận.");
    if (loiTrigger(e, "recon_not_declared")) return loi(409, "invalid_state", "Khoản này không còn chờ xác nhận.");
    if (loiTrigger(e, "held_already_settled")) return loi(409, "held_already_settled", CAU_DA_NOP);
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
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const ghiChu = docLyDo(b.ghiChu, false);
  if (!ghiChu.ok) return ghiChu;
  // ADR-0092 Đ2 (TNV-G4 KT04, TNV-VP01): nộp ≤ số người đó đang nợ công ty trên TỪNG đơn; trả ≤ số công ty đang nợ người đó. Lớp CSDL: trigger 0080.
  for (const p of phanBo) {
    const dongDon = await linesOfOrder(db, p.orderId);
    const k = kiemQuyetToan({ chieu: b.chieu, soDu: soDuCap(dongDon.map(toLineRow), b.partyId, congTyId), soTien: p.amount, maDon: dongDon[0]?.order_code ?? "này" });
    if (!k.ok) return loi(409, k.ma, k.cau);
  }
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
  try {
    await db.batch(stmts);
  } catch (e) {
    const k = await loiKhoaKy(db, e, [ngay.value]);
    if (k) return k;
    // Người khác vừa ghi nộp / xác nhận giữa lúc đọc và lúc ghi → trigger 0080 huỷ cả lô.
    if (loiTrigger(e, "settlement_sign_flip")) return loi(409, "stale", "Số tiền người này đang giữ vừa thay đổi — tải lại rồi thử lại.");
    throw e;
  }
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
  // ADR-0089 (H-C7): đơn HUỶ không trả dư tự do — hoàn qua khoản duyệt (lớp CSDL: trigger coc_needs_approval).
  if (state.status === "cancelled") return loi(409, "coc_needs_approval", "Đơn huỷ: hoàn qua “Duyệt hoàn thu trước” rồi “Ghi chi hoàn”.");
  // ADR-0088 đ4 (iv): hoàn sau Đã giao chỉ đi qua đ9 (phân định trách nhiệm) — chưa có mã ⇒ chặn (lớp CSDL: trigger bil_receipt_after_delivered, 0083).
  if (state.delivered_at) return HOAN_SAU_GIAO();
  const daThu = conLai(receipts.map(toReceiptRow), 0, state.status).daThu;
  if (so.value > daThu) return loi(400, "invalid_input", "Không hoàn quá số khách đã trả.");
  if (nguoiTra !== congTyId) {
    // ADR-0092 Đ3 (KT09): người trả không phải công ty chỉ hoàn trong số đang giữ cho đơn (lớp CSDL: trigger bil_refund_within_held, 0082).
    const giu = kiemHoanNguoiGiu({ dangGiu: soDuCap((await linesOfOrder(db, b.orderId)).map(toLineRow), nguoiTra, congTyId), soTien: so.value });
    if (!giu.ok) return loi(409, giu.ma, giu.cau);
  }
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
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
  try {
    await db.batch(stmts);
  } catch (e) {
    const k = await loiKhoaKy(db, e, [ngay.value]);
    if (k) return k;
    // Kiểm độc lập T-3: người khác vừa ghi hoàn / đảo lần thu giữa lúc đọc và lúc ghi → trigger bil_payment_receipt_refund_within_paid huỷ cả lô.
    if (loiTrigger(e, "refund_exceeds_paid")) return loi(409, "stale", "Không hoàn quá số khách đã trả — số đã thu vừa thay đổi, tải lại rồi thử lại.");
    if (loiTrigger(e, "coc_needs_approval")) return loi(409, "coc_needs_approval", "Đơn huỷ: hoàn qua “Duyệt hoàn thu trước” rồi “Ghi chi hoàn”.");
    if (loiTrigger(e, "refund_exceeds_held")) return loi(409, "refund_exceeds_held", "Số hoàn vượt số người này đang giữ cho đơn — số vừa thay đổi, tải lại rồi thử lại.");
    if (loiTrigger(e, "receipt_after_delivered")) return HOAN_SAU_GIAO();
    throw e;
  }
  return { ok: true, value: { orderId: b.orderId } };
}

/**
 * Điều chỉnh / đảo (ADR-0026 điều 8, Q6 — lý do BẮT BUỘC):
 *  - `{ loai: "dao_lan_thu", receiptId }` — đảo một lần thu (vd cọc cũ "chưa rõ") + đảo các dòng nợ còn hiệu lực của nó, một phiếu REVERSAL;
 *  - `{ loai: "dao_dong", lineId }` — đảo một dòng nợ;
 *  - `{ loai: "dieu_chinh", … }` — ADR-0115: KHÔNG ghi ở đây nữa; thành yêu cầu CHỜ DUYỆT (`taoYeuCau` trong dieu-chinh.ts), chỉ lúc người thứ hai duyệt mới có phiếu ADJUSTMENT.
 */
export async function ghiDieuChinh(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string | null }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const postingId = crypto.randomUUID();
  if (b.loai === "dao_lan_thu") {
    if (typeof b.receiptId !== "string" || !UUID_RE.test(b.receiptId)) return loi(400, "invalid_input", "Mã lần thu không hợp lệ.");
    const rc = await receiptById(db, b.receiptId);
    if (!rc) return loi(404, "not_found", "Không tìm thấy lần thu.");
    if (rc.reverses_id) return loi(409, "invalid_state", "Không đảo dòng đảo.");
    // ADR-0092 Đ1 (KT06): đảo không được làm đã thu ròng của đơn âm (lớp CSDL: trigger bil_receipt_reversal_net_paid, 0082).
    const [cacLanThu, st] = await Promise.all([receiptsOfOrder(db, rc.order_id), orderState(db, rc.order_id)]);
    if (cacLanThu.some((r) => r.reverses_id === rc.id)) return loi(409, "stale", "Lần thu này đã được đảo.");
    // ADR-0088 đ3: đơn đã Đã giao — không đảo đơn lẻ (lớp CSDL: trigger bil_receipt_after_delivered, 0083).
    if ((await phaiThuLucGiao(db, rc.order_id)) !== null) return DAO_SAU_GIAO();
    // Kiểm độc lập vòng 2 CAO-2: không đảo riêng một nửa của lệnh chuyển đã ghép đôi (lớp CSDL: trigger coc_transfer_locked).
    if (rc.transfer_of_id || (await transferInOf(db, rc.id)).length > 0) return CHUYEN_KHOA();
    if (st) {
      const rong = kiemDaoLanThu({ daThu: conLai(cacLanThu.map(toReceiptRow), 0, st.status).daThu, goc: toReceiptRow(rc) });
      if (!rong.ok) return loi(409, rong.ma, rong.cau);
    }
    const dongDao = [];
    for (const l of await linesOfReceipt(db, rc.id)) if (l.reverses_line_id === null && !(await lineReversed(db, l.id))) dongDao.push(l);
    const stmts = [
      receiptReversalStatement(db, { id: crypto.randomUUID(), occurredDate: ngay.value, note: lyDo.value, at, by, reversesId: rc.id }),
      auditStatement(db, { orderId: rc.order_id, staffId: by, action: "ledger_reversal", at, detail: lyDo.value ?? undefined }),
    ];
    if (dongDao.length > 0) {
      stmts.push(postingPlainStatement(db, { id: postingId, kind: "REVERSAL", orderId: rc.order_id, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }));
      for (const l of dongDao) stmts.push(lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), postingId, rc.order_id, rc.id, at, by)));
    }
    try {
      await db.batch(stmts);
    } catch (e) {
      const k = await loiKhoaKy(db, e, [ngay.value]);
      if (k) return k;
      if (/UNIQUE constraint failed: bil_(payment_receipt\.reverses_id|debt_line\.reverses_line_id)/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Lần thu này đã được đảo.");
      // ADR-0089 đ15 (mọi lúc — NT-B2): đảo làm đã trả dưới tổng duyệt hoàn cọc của đơn huỷ.
      if (loiTrigger(e, "coc_paid_below_approved")) return loi(409, "coc_paid_below_approved", "Đơn đã duyệt hoàn thu trước — huỷ duyệt phần chưa chi trước khi đảo lần thu.");
      // ADR-0092 Đ2b: khoản giữ hộ của lần thu đã được ghi nộp — đảo lần nộp trước (cùng thứ tự "ghi mới trước, đảo sau").
      if (loiTrigger(e, "held_already_settled")) return loi(409, "held_already_settled", "Khoản giữ hộ của lần thu này đã được ghi nộp — đảo lần nộp trước rồi đảo lần thu.");
      if (loiTrigger(e, "net_paid_negative")) return loi(409, "net_paid_negative", "Đảo lần thu này làm số đã thu của đơn âm — số vừa thay đổi, tải lại rồi thử lại.");
      if (loiTrigger(e, "coc_transfer_locked")) return CHUYEN_KHOA();
      if (loiTrigger(e, "receipt_after_delivered")) return DAO_SAU_GIAO();
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
    // ADR-0092 Đ4: không đảo riêng dòng giữ hộ khi lần thu sinh ra nó còn hiệu lực (lớp CSDL: trigger bil_held_no_single_reversal, 0082).
    if (l.kind_code === "HELD" && l.receipt_id !== null && !(await receiptsOfOrder(db, l.order_id)).some((r) => r.reverses_id === l.receipt_id)) return HELD_DON_LE();
    const stmts = [
      postingPlainStatement(db, { id: postingId, kind: "REVERSAL", orderId: l.order_id, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }),
      lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), postingId, l.order_id, l.receipt_id, at, by)),
      auditStatement(db, { orderId: l.order_id, staffId: by, action: "ledger_reversal", at, detail: lyDo.value ?? undefined }),
    ];
    try {
      await db.batch(stmts);
    } catch (e) {
      const k = await loiKhoaKy(db, e, [ngay.value]);
      if (k) return k;
      if (/UNIQUE constraint failed: bil_debt_line\.reverses_line_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Dòng này đã được đảo.");
      if (loiTrigger(e, "held_already_settled")) return loi(409, "held_already_settled", "Khoản giữ hộ này đã được ghi nộp — đảo lần nộp trước.");
      if (loiTrigger(e, "held_single_reversal")) return HELD_DON_LE();
      throw e;
    }
    return { ok: true, value: { orderId: l.order_id } };
  }
  // `dieu_chinh` (ADR-0115): không còn ghi ngay — route chuyển sang `taoYeuCau` (dieu-chinh.ts), nên không bao giờ tới đây.
  return loi(400, "invalid_input", "Chọn loại: đảo lần thu, đảo dòng sổ hoặc điều chỉnh.");
}

const DAO_SAU_GIAO = () => loi(409, "receipt_after_delivered", "Đơn đã Đã giao — không đảo riêng lần thu. Dùng “Thay lần thu”.");
/** ADR-0088 đ4 (iv) — câu nguyên văn của ADR. */
const HOAN_SAU_GIAO = () => loi(409, "refund_after_delivered", "Đơn đã Đã giao — hoàn cho khách cần phân định trách nhiệm trước; báo Quản trị.");
const CHUYEN_KHOA = () =>
  loi(409, "coc_transfer_locked", "Tiền này đã chuyển sang đơn mới — không đảo riêng một nửa của lệnh chuyển. Cần sửa thì báo Toàn quyền.");
const HELD_DON_LE = () =>
  loi(409, "held_single_reversal", "Không đảo riêng dòng giữ hộ khi lần thu còn hiệu lực — đảo lần thu, hoặc dùng “Công ty đã nhận” cho khoản chuyển khoản.");

const LOAI_DONG: Record<string, string> = {
  RECEIPT: "Lần thu", DELIVERED: "Đã giao", COMPLETED: "Hoàn thành", COMPANY_RECEIVED: "Công ty đã nhận", SETTLEMENT: "Nộp / trả", REFUND: "Hoàn khách",
  ADJUSTMENT: "Điều chỉnh", REVERSAL: "Đảo", REPLACEMENT: "Thay lần thu",
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

/**
 * Khoá sổ tháng (ADR-0080 D1): tháng đã khoá, tháng khoá được kế tiếp và bảng kiểm của tháng đó — dùng chung cho `GET /api/ledger/ky` và thân `201` của lệnh khoá.
 * Bảng kiểm chỉ có mã đơn, số tiền, ngày (không SĐT, không mã giao dịch, không người khai). `coTheKhoa` = người gọi có ô `ledger.period.close` (route hỏi) VÀ còn tháng khoá được.
 */
export async function kySoResponse(db: D1Database, v: { homNay: string; coQuyenKhoa: boolean }): Promise<KySoResponse> {
  const [daKhoa, som] = await Promise.all([thangDaKhoa(db), earliestLedgerMonth(db)]);
  const keTiep = thangKhoaDuocKeTiep({ homNay: v.homNay, daKhoa, thangSoSomNhat: som });
  if (keTiep === null) return { daKhoa, keTiep: null, coTheKhoa: false, bangKiem: null };
  const [cho, chuaRo, soDu] = await Promise.all([pendingCompany(db), unknownReceipts(db), balancesAt(db, ngayCuoiThang(keTiep))]);
  const trongThang = <T extends { occurred_date: string }>(rows: readonly T[]): T[] => rows.filter((r) => kyCua(r.occurred_date) === keTiep);
  return {
    daKhoa,
    keTiep,
    coTheKhoa: v.coQuyenKhoa,
    bangKiem: {
      thang: keTiep,
      choXacNhanCongTy: trongThang(cho).map((r) => ({ orderCode: r.order_code, amount: r.amount, ngay: r.occurred_date })),
      chuaRoNguoiThu: trongThang(chuaRo).map((r) => ({ orderCode: r.order_code, amount: r.amount, ngay: r.occurred_date })),
      soDuCuoiThang: soDu.map((r) => ({ ten: r.label ?? "—", soDu: r.balance })),
    },
  };
}
