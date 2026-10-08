// Điều phối CỌC ĐƠN HUỶ của billing (ADR-0089 đ2, đ4, đ5, đ6, đ9, đ11, đ15, đ16, X-1…X-4; kế hoạch Đợt 1 Task 8–10). Đọc → luật thuần (`rules.ts`: một nơi
// định nghĩa tiền cọc) → MỘT `db.batch()` mỗi lệnh (ADR-0094 V1). Lớp CSDL (trigger 0079) kiểm lại mọi luật tiền; lỗi trigger dịch sang câu tiếng Việt.
// Route (index.ts) hỏi `can()` TRƯỚC rồi mới gọi các hàm ở đây. Không SQL thô (module nghiêm).
import { auditStatement } from "../audit";
import type { CocDemResponse, CocDoiChieuResponse, CocDonDto, CocListResponse, HoanNgoaiDto, KhoanDuyetDto, ReceiptDto } from "../../shared/contracts";
import { UUID_RE } from "../../shared/http";
import { nhanLyDoHuy, nhanNhomHuy, type NhomHuy } from "../../shared/ly-do-huy";
import { nhanTienDaTra } from "../../shared/nhan-tien";
import { vnToday } from "../../shared/vn-date";
import {
  approvalInsertStatement, approvalsOfOrder, approvalsOpen, approvalVoidStatement, cancelledHolders, cancelStateOf, cocCancelledOrders, orderByCode, outsideDecideStatement,
  outsideOfOrder, outsideRecordStatement, receiptPayoutStatement, receiptTransferInStatement, type ApprovalDbRow, type CancelStateRow, type OutsideDbRow,
} from "./coc-repo";
import { linesOfOrder, orderState, ownerCompanyId, partyLabels, postingIfReceiptStatement, receiptsOfOrder, lineIfPostingStatement } from "./repository";
import {
  conLaiCuaKhoan, hoanNgoaiTrangThai, kiemChi, kiemDuyet, kiemGhiHoanNgoai, kiemHuyDuyet, kiemXacNhanHoanNgoai, METHOD_CODES, nhacCoc, sinhDongHoanKhach, sinhDongLanThu,
  soDuTheoBen, soTienCoc, type DuyetRow, type HoanNgoaiRow, type KiemCoc, type SoTienCoc,
} from "./rules";
import { CHUA_CO_CONG_TY, PARTY_ID_RE, docLyDo, docNgay, docSoTien, layKyDaKhoa, lineOf, loi, loiKhoaKy, toLineRow, toReceiptRow, type KetQua, type NguoiGoi } from "./service";

/** Kiểm độc lập vòng 2 CAO-1: đơn nhận đổi trạng thái giữa lúc duyệt chuyển và lúc chuyển. */
const CAU_DON_NHAN_HONG = "Đơn nhận đã huỷ hoặc đã giao — huỷ khoản duyệt chuyển rồi duyệt lại sang đơn khác.";

const toDuyetRow = (a: ApprovalDbRow): DuyetRow => ({
  id: a.id, kind: a.kind_code, amount: a.amount, voidsId: a.voids_id, targetOrderId: a.target_order_id, createdBy: a.created_by, approvedDate: a.approved_date,
});
const toHoanNgoaiRow = (g: OutsideDbRow): HoanNgoaiRow => ({ id: g.id, kind: g.kind_code, amount: g.amount, targetId: g.target_id, createdBy: g.created_by });

/** Câu tiếng Việt cho lỗi trigger 0079 / 0045 (mã có tiền tố trong thông báo RAISE) — không lộ mã thô. */
const CAU_TRIGGER: [string, string][] = [
  ["coc_not_cancelled", "Đơn chưa huỷ — không duyệt hoàn cọc được."],
  ["coc_unclassified", "Lý do huỷ chưa được phân loại — Quản trị phân loại lý do trước khi duyệt hoàn cọc."],
  ["coc_deadline", "Đã quá hạn hoàn cọc."],
  ["coc_exceeds_paid", "Vượt số tiền còn giữ của đơn — số tiền vừa thay đổi, tải lại rồi thử lại."],
  ["coc_bad_target", "Đơn nhận phải còn hiệu lực và chưa Đã giao."],
  ["coc_void_exceeds_unspent", "Chỉ huỷ được phần chưa chi của khoản duyệt — tải lại rồi thử lại."],
  ["coc_void_mismatch", "Khoản duyệt không thuộc đơn này."],
  ["coc_needs_approval", "Đơn huỷ: hoàn qua “Duyệt hoàn cọc” rồi “Ghi chi hoàn”."],
  ["coc_bad_approval", "Khoản duyệt không thuộc đơn này."],
  ["coc_exceeds_approved", "Vượt phần đã duyệt còn lại — tải lại rồi thử lại."],
  ["coc_same_person", "Người duyệt không tự chi / chuyển / xác nhận khoản này — cần một người khác (tách nhiệm vụ)."],
  ["coc_transfer_mismatch", "Lệnh chuyển không khớp đơn nhận, số tiền hoặc người giữ tiền."],
  ["coc_transfer_target_invalid", CAU_DON_NHAN_HONG],
  ["coc_paid_below_approved", "Đơn đã duyệt hoàn cọc — huỷ duyệt phần chưa chi trước khi đảo lần thu."],
  ["coc_outside_not_legacy", "Chỉ ghi được cho đơn huỷ trước khi có lệnh hoàn cọc trong Nền tảng."],
  ["coc_outside_once", "Đơn này đã có một dòng đã hoàn ngoài hệ thống đang hiệu lực."],
  ["coc_outside_exceeds", "Vượt số tiền còn giữ của đơn — tải lại rồi thử lại."],
  ["coc_outside_mismatch", "Dòng đã hoàn ngoài hệ thống không thuộc đơn này."],
  ["refund_exceeds_paid", "Không hoàn quá số khách đã trả — số đã thu vừa thay đổi, tải lại rồi thử lại."],
];
function dichLoiTrigger(e: unknown): { ok: false; res: Response } | null {
  const msg = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: bil_(deposit_approval\.voids_id|outside_refund\.target_id|payment_receipt\.transfer_of_id)/.test(msg)) {
    return loi(409, "stale", "Khoản này vừa được người khác xử lý — tải lại rồi thử lại.");
  }
  for (const [ma, cau] of CAU_TRIGGER) if (new RegExp(`\\b${ma}:`).test(msg)) return loi(409, ma, cau);
  return null;
}
/** MỘT lô ghi của cọc. `ngays` = các ngày phát sinh mà lô ghi vào bốn bảng có khoá tháng (lỗi trigger `period_closed:` dịch ra câu của tháng đầu tiên đã khoá). */
async function chayLo(db: D1Database, stmts: D1PreparedStatement[], ngays: readonly string[]): Promise<{ ok: true; kq: D1Result[] } | { ok: false; res: Response }> {
  try {
    return { ok: true, kq: await db.batch(stmts) };
  } catch (e) {
    const k = await loiKhoaKy(db, e, ngays);
    if (k) return k;
    const l = dichLoiTrigger(e);
    if (l) return l;
    throw e;
  }
}
const tuChoi = (k: KiemCoc): { ok: false; res: Response } | null => (k.ok ? null : loi(409, k.ma, k.cau));

interface DuLieuCoc {
  huy: CancelStateRow;
  coc: SoTienCoc;
  duyet: DuyetRow[];
  duyetRows: ApprovalDbRow[];
  hoanNgoai: HoanNgoaiRow[];
  hoanNgoaiRows: OutsideDbRow[];
  receipts: ReturnType<typeof toReceiptRow>[];
  soDu: Map<string, number>;
  congTyId: string | null;
}
/** Đọc đủ dữ liệu cọc của MỘT đơn huỷ (null = đơn chưa huỷ / không có dòng lý do). */
async function docCoc(db: D1Database, orderId: string): Promise<DuLieuCoc | null> {
  const huy = await cancelStateOf(db, orderId);
  if (!huy) return null;
  const [receiptsDb, linesDb, duyetRows, hoanNgoaiRows, congTyId] = await Promise.all([
    receiptsOfOrder(db, orderId), linesOfOrder(db, orderId), approvalsOfOrder(db, orderId), outsideOfOrder(db, orderId), ownerCompanyId(db),
  ]);
  const receipts = receiptsDb.map(toReceiptRow);
  const lines = linesDb.map(toLineRow);
  const duyet = duyetRows.map(toDuyetRow);
  const hoanNgoai = hoanNgoaiRows.map(toHoanNgoaiRow);
  return {
    huy, coc: soTienCoc({ receipts, lines, duyet, hoanNgoai }), duyet, duyetRows, hoanNgoai, hoanNgoaiRows, receipts,
    soDu: congTyId ? soDuTheoBen(lines, congTyId) : new Map(), congTyId,
  };
}

export interface CoCoc {
  coThePhanLoai: boolean;
  coTheDuyet: boolean;
  coTheChi: boolean;
  coTheChuyen: boolean;
  coTheGhiHoanNgoai: boolean;
  coTheXacNhanHoanNgoai: boolean;
  xemNguoiGiu: boolean;
}
/** Khối `coc` của `GET /api/orders/:id/payments` cho đơn huỷ (null = đơn chưa huỷ). Cờ đã tính ở route bằng `can()`. */
export async function cocCuaDon(db: D1Database, orderId: string, co: CoCoc): Promise<CocDonDto | null> {
  const d = await docCoc(db, orderId);
  if (!d) return null;
  const homNay = vnToday(new Date());
  const nhom = d.huy.group_code as NhomHuy;
  const nh = nhanTienDaTra({ status: "cancelled", deliveredAt: null, nhom, han: d.huy.refund_deadline, homNay });
  const goc = d.duyetRows.filter((a) => a.voids_id === null);
  const khoanDuyet: KhoanDuyetDto[] = goc.map((a) => ({
    id: a.id, loai: a.kind_code === "TRANSFER" ? "chuyen" : "hoan", soTien: a.amount, conLai: conLaiCuaKhoan(a.id, d.duyet, d.receipts),
    daHuy: d.duyetRows.filter((v) => v.voids_id === a.id).reduce((s, v) => s + v.amount, 0), lyDo: a.reason, ngayDuyet: a.approved_date, nguoiDuyet: a.created_by_label,
    donNhan: a.target_order_code,
  }));
  const quyetDinh = new Map(d.hoanNgoaiRows.filter((g) => g.kind_code !== "RECORD").map((g) => [g.target_id, g.kind_code]));
  const hoanNgoaiDong: HoanNgoaiDto[] = d.hoanNgoaiRows.filter((g) => g.kind_code === "RECORD").map((g) => ({
    id: g.id, soTien: g.amount ?? 0, lyDo: g.reason, nguoiGhi: g.created_by_label, ngay: g.occurred_date,
    trangThai: quyetDinh.get(g.id) === "CONFIRM" ? "da_xac_nhan" : quyetDinh.get(g.id) === "REJECT" ? "tu_choi" : "cho_xac_nhan",
  }));
  let nguoiGiu: CocDonDto["nguoiGiu"] = null;
  if (co.xemNguoiGiu) {
    const giu = [...d.soDu].filter(([, v]) => v > 0);
    const ten = await partyLabels(db, giu.map(([id]) => id));
    nguoiGiu = giu.map(([id, soTien]) => ({ ten: ten.get(id)?.label ?? "Một người", soTien }));
  }
  const coHieuLuc = hoanNgoaiTrangThai(d.hoanNgoai).dangHieuLuc;
  const choXacNhan = coHieuLuc.some((g) => !d.hoanNgoai.some((x) => x.kind === "CONFIRM" && x.targetId === g.id));
  return {
    nhom, nhomNhan: nhanNhomHuy(nhom), lyDoNhan: nhanLyDoHuy(d.huy.reason_code), ngayHuy: d.huy.cancelled_date, han: d.huy.refund_deadline,
    quaHan: nhom === "KHACH_HUY" && homNay > d.huy.refund_deadline, legacy: d.huy.legacy === 1, nhan: nh.nhan, nhanPhu: nh.phu,
    daTra: d.coc.daTra, dangDoiChieu: d.coc.dangDoiChieu, daDuyet: d.coc.daDuyet, daChi: d.coc.daChi, daChuyen: d.coc.daChuyen, hoanNgoai: d.coc.hoanNgoai,
    conGiu: d.coc.conGiu, choChi: d.coc.choChi, khoanDuyet, hoanNgoaiDong, nguoiGiu,
    coThePhanLoai: co.coThePhanLoai && nhom === "CHUA_KET_LUAN",
    coTheDuyet: co.coTheDuyet && nhom !== "CHUA_KET_LUAN" && d.coc.conGiuLucHuy - d.coc.daDuyet > 0 && !(nhom === "KHACH_HUY" && homNay > d.huy.refund_deadline),
    coTheChi: co.coTheChi && khoanDuyet.some((k) => k.loai === "hoan" && k.conLai > 0),
    coTheChuyen: co.coTheChuyen && khoanDuyet.some((k) => k.loai === "chuyen" && k.conLai > 0),
    coTheGhiHoanNgoai: co.coTheGhiHoanNgoai && d.huy.legacy === 1 && coHieuLuc.length === 0 && d.coc.conGiu > 0,
    coTheXacNhanHoanNgoai: co.coTheXacNhanHoanNgoai && choXacNhan,
  };
}

/** Khối `huy` của biên nhận (ADR-0089 đ9a — danh sách trắng): null với đơn chưa huỷ. */
export async function cocChoBienNhan(db: D1Database, orderId: string): Promise<ReceiptDto["huy"]> {
  const d = await docCoc(db, orderId);
  if (!d) return null;
  return {
    nhom: d.huy.group_code as NhomHuy, daTra: d.coc.daTra, dangDoiChieu: d.coc.dangDoiChieu, daDuyet: d.coc.daDuyet, daChi: d.coc.daChi, daChuyen: d.coc.daChuyen,
    daDuyetChuyen: d.coc.daDuyetChuyen, han: d.huy.refund_deadline,
  };
}

const DON_CHUA_HUY = () => loi(409, "coc_not_cancelled", "Đơn chưa huỷ — không có tiền cọc để xử lý.");
const KHOAN_KHONG_CO = () => loi(404, "not_found", "Không tìm thấy khoản duyệt của đơn này.");

/** Đọc "người trả / người giữ": "cong_ty" hoặc { partyId } của một hồ sơ có thật. */
async function docBen(db: D1Database, raw: unknown, congTyId: string, cauThieu: string): Promise<KetQua<string>> {
  if (raw === "cong_ty") return { ok: true, value: congTyId };
  if (raw && typeof raw === "object" && typeof (raw as { partyId?: unknown }).partyId === "string" && PARTY_ID_RE.test((raw as { partyId: string }).partyId)) {
    const id = (raw as { partyId: string }).partyId;
    if (id !== congTyId && !(await partyLabels(db, [id])).get(id)) return loi(400, "invalid_input", "Không tìm thấy người này.");
    return { ok: true, value: id };
  }
  return loi(400, "invalid_input", cauThieu);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Duyệt hoàn / duyệt chuyển (đ4a, đ6, X-1) — Quản trị, Toàn quyền
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function ghiDuyet(db: D1Database, input: { orderId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ duyetId: string; donNhanId: string | null }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (b.loai !== "hoan" && b.loai !== "chuyen") return loi(400, "invalid_input", "Chọn duyệt hoàn hay duyệt chuyển sang đơn mới.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  let donNhanId: string | null = null;
  if (b.loai === "chuyen") {
    if (typeof b.donNhan !== "string" || b.donNhan.trim() === "" || b.donNhan.length > 40) return loi(400, "invalid_input", "Nhập mã đơn nhận tiền.");
    const nhan = await orderByCode(db, b.donNhan.trim());
    if (!nhan) return loi(400, "invalid_input", "Không tìm thấy đơn nhận tiền.");
    if (nhan.id === input.orderId || nhan.status === "cancelled" || nhan.delivered_at) return loi(409, "coc_bad_target", "Đơn nhận phải là đơn khác, còn hiệu lực và chưa Đã giao.");
    donNhanId = nhan.id;
  }
  const homNay = vnToday(new Date());
  const tc = tuChoi(kiemDuyet({ coc: d.coc, nhom: d.huy.group_code as NhomHuy, han: d.huy.refund_deadline, homNay, soTien: so.value }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const duyetId = crypto.randomUUID();
  const lo = await chayLo(db, [
    approvalInsertStatement(db, { id: duyetId, orderId: input.orderId, kind: b.loai === "chuyen" ? "TRANSFER" : "REFUND", amount: so.value, targetOrderId: donNhanId, reason: lyDo.value!, approvedDate: homNay, at, by: input.ai.staffId }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: b.loai === "chuyen" ? "deposit_transfer_approved" : "deposit_refund_approved", at, detail: lyDo.value! }, "changes() > 0"),
  ], [homNay]);
  if (!lo.ok) return lo;
  return { ok: true, value: { duyetId, donNhanId } };
}

/** Huỷ duyệt phần chưa chi (đ4c) — lý do bắt buộc, mỗi khoản một lần. */
export async function ghiHuyDuyet(db: D1Database, input: { orderId: string; duyetId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  if (!UUID_RE.test(input.duyetId)) return KHOAN_KHONG_CO();
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  const goc = d.duyet.find((x) => x.id === input.duyetId && x.voidsId === null);
  if (!goc) return KHOAN_KHONG_CO();
  if (d.duyet.some((x) => x.voidsId === goc.id)) return loi(409, "stale", "Khoản duyệt này đã được huỷ duyệt một lần.");
  const tc = tuChoi(kiemHuyDuyet({ conLaiKhoan: conLaiCuaKhoan(goc.id, d.duyet, d.receipts), soTien: so.value }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const lo = await chayLo(db, [
    approvalVoidStatement(db, { id: crypto.randomUUID(), voidsId: goc.id, orderId: input.orderId, amount: so.value, reason: lyDo.value!, date: vnToday(new Date()), at, by: input.ai.staffId }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "deposit_approval_voided", at, detail: lyDo.value! }, "changes() > 0"),
  ], [vnToday(new Date())]);
  if (!lo.ok) return lo;
  if ((lo.kq[0]!.meta.changes ?? 0) === 0) return KHOAN_KHONG_CO();
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Chi hoàn theo khoản duyệt (đ4b, đ4c) — Kế toán, Toàn quyền
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function ghiChiHoan(db: D1Database, input: { orderId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.duyetId !== "string" || !UUID_RE.test(b.duyetId)) return loi(400, "invalid_input", "Chọn khoản duyệt cần chi.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  if (typeof b.hinhThuc !== "string" || !(METHOD_CODES as readonly string[]).includes(b.hinhThuc)) return loi(400, "invalid_input", "Chọn hình thức hoàn (tiền mặt, chuyển khoản hoặc khác).");
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const ghiChu = docLyDo(b.ghiChu, false);
  if (!ghiChu.ok) return ghiChu;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  if (!d.congTyId) return CHUA_CO_CONG_TY();
  const goc = d.duyet.find((x) => x.id === b.duyetId && x.voidsId === null);
  if (!goc) return KHOAN_KHONG_CO();
  if (goc.kind !== "REFUND") return loi(409, "invalid_state", "Khoản này là duyệt chuyển — dùng “Chuyển tiền sang đơn mới”.");
  const tra = await docBen(db, b.nguoiTra, d.congTyId, "Chọn người trả tiền cho khách (Công ty hoặc người đang giữ tiền).");
  if (!tra.ok) return tra;
  const tc = tuChoi(kiemChi({
    conLaiKhoan: conLaiCuaKhoan(goc.id, d.duyet, d.receipts), soTien: so.value, nguoiChi: input.ai.staffId, nguoiDuyet: goc.createdBy,
    nguoiTraDangGiu: tra.value === d.congTyId ? null : Math.max(0, d.soDu.get(tra.value) ?? 0),
  }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const receiptId = crypto.randomUUID();
  const stmts: D1PreparedStatement[] = [
    receiptPayoutStatement(db, {
      id: receiptId, orderId: input.orderId, amount: so.value, collectorPartyId: tra.value, collectorRole: tra.value === d.congTyId ? "COMPANY" : "STAFF", method: b.hinhThuc,
      occurredDate: ngay.value, note: ghiChu.value, at, by: input.ai.staffId, approvalId: goc.id,
    }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "deposit_refund_paid", at }, "changes() > 0"),
  ];
  const dong = sinhDongHoanKhach({ nguoiTraPartyId: tra.value, congTyId: d.congTyId, so: so.value });
  if (dong.length > 0) {
    const postingId = crypto.randomUUID();
    stmts.push(postingIfReceiptStatement(db, { id: postingId, kind: "REFUND", orderId: input.orderId, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }, receiptId));
    for (const x of dong) stmts.push(lineIfPostingStatement(db, lineOf(x, postingId, input.orderId, receiptId, at, input.ai.staffId)));
  }
  const lo = await chayLo(db, stmts, [ngay.value]);
  if (!lo.ok) return lo;
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Chuyển tiền sang đơn mới (đ6) — Kế toán, Toàn quyền; MỘT lô HAI đơn: chi khỏi đơn huỷ (gắn khoản TRANSFER) + thu vào đơn nhận (trỏ nửa chi), cùng số,
// cùng người đang giữ; nhật ký trên cả hai đơn.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function ghiChuyen(db: D1Database, input: { orderId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ donNhanId: string }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.duyetId !== "string" || !UUID_RE.test(b.duyetId)) return loi(400, "invalid_input", "Chọn khoản duyệt chuyển.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  if (!d.congTyId) return CHUA_CO_CONG_TY();
  const goc = d.duyet.find((x) => x.id === b.duyetId && x.voidsId === null);
  if (!goc) return KHOAN_KHONG_CO();
  if (goc.kind !== "TRANSFER" || !goc.targetOrderId) return loi(409, "invalid_state", "Khoản này là duyệt hoàn — dùng “Ghi chi hoàn”.");
  // Kiểm độc lập vòng 2 CAO-1: đơn nhận có thể đã huỷ / Đã giao sau lúc duyệt (lớp CSDL: trigger coc_transfer_target_invalid huỷ cả lô).
  const nhan = await orderState(db, goc.targetOrderId);
  if (!nhan || nhan.status === "cancelled" || nhan.delivered_at !== null) return loi(409, "coc_transfer_target_invalid", CAU_DON_NHAN_HONG);
  const giu = await docBen(db, b.nguoiGiu, d.congTyId, "Chọn người đang giữ khoản tiền này (Công ty hoặc nhân viên).");
  if (!giu.ok) return giu;
  const tc = tuChoi(kiemChi({
    conLaiKhoan: conLaiCuaKhoan(goc.id, d.duyet, d.receipts), soTien: so.value, nguoiChi: input.ai.staffId, nguoiDuyet: goc.createdBy,
    nguoiTraDangGiu: giu.value === d.congTyId ? null : Math.max(0, d.soDu.get(giu.value) ?? 0),
  }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const role = giu.value === d.congTyId ? "COMPANY" : "STAFF";
  const raId = crypto.randomUUID();
  const vaoId = crypto.randomUUID();
  const stmts: D1PreparedStatement[] = [
    receiptPayoutStatement(db, { id: raId, orderId: input.orderId, amount: so.value, collectorPartyId: giu.value, collectorRole: role, method: "OTHER", occurredDate: ngay.value, note: "Chuyển sang đơn mới", at, by: input.ai.staffId, approvalId: goc.id }),
    receiptTransferInStatement(db, { id: vaoId, orderId: goc.targetOrderId, amount: so.value, collectorPartyId: giu.value, collectorRole: role, method: "OTHER", occurredDate: ngay.value, note: "Chuyển từ đơn huỷ", at, by: input.ai.staffId, transferOfId: raId }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "deposit_transferred_out", at }, "changes() > 0"),
    auditStatement(db, { orderId: goc.targetOrderId, staffId: input.ai.staffId, action: "deposit_transferred_in", at }, "changes() > 0"),
  ];
  // Người giữ là nhân viên: ở đơn huỷ công ty bù phần giữ hộ (dòng REFUND), ở đơn nhận người đó giữ hộ lại đúng số (dòng HELD) — tổng người đó giữ không đổi.
  const ra = sinhDongHoanKhach({ nguoiTraPartyId: giu.value, congTyId: d.congTyId, so: so.value });
  if (ra.length > 0) {
    const p = crypto.randomUUID();
    stmts.push(postingIfReceiptStatement(db, { id: p, kind: "REFUND", orderId: input.orderId, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }, raId));
    for (const x of ra) stmts.push(lineIfPostingStatement(db, lineOf(x, p, input.orderId, raId, at, input.ai.staffId)));
  }
  const vao = sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: so.value, collectorRole: role, collectorPartyId: giu.value, nguoiGhiPartyId: input.ai.partyId ?? d.congTyId, nguoiGhiLaKeToan: true, congTyId: d.congTyId });
  if (vao.length > 0) {
    const p = crypto.randomUUID();
    stmts.push(postingIfReceiptStatement(db, { id: p, kind: "RECEIPT", orderId: goc.targetOrderId, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }, vaoId));
    for (const x of vao) stmts.push(lineIfPostingStatement(db, lineOf(x, p, goc.targetOrderId, vaoId, at, input.ai.staffId)));
  }
  const lo = await chayLo(db, stmts, [ngay.value]);
  if (!lo.ok) return lo;
  if ((lo.kq[1]!.meta.changes ?? 0) === 0) {
    // Nửa thu không chèn được (đơn nhận vừa huỷ / Đã giao) mà nửa chi đã chèn — không được để lệch: lỗi lập trình nếu tới đây; lô vẫn đã ghi ⇒ báo rõ.
    throw new Error("coc_transfer_half: đơn nhận không nhận được tiền nhưng nửa chi đã ghi");
  }
  return { ok: true, value: { donNhanId: goc.targetOrderId } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// "Đã hoàn ngoài hệ thống" (đ16, X-3, X-4, lời chủ (b)) — Toàn quyền ghi; Quản trị / Toàn quyền khác xác nhận hoặc từ chối
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function ghiHoanNgoai(db: D1Database, input: { orderId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  const tc = tuChoi(kiemGhiHoanNgoai({ legacy: d.huy.legacy === 1, coDongHieuLuc: hoanNgoaiTrangThai(d.hoanNgoai).dangHieuLuc.length > 0, coc: d.coc, soTien: so.value }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const lo = await chayLo(db, [
    outsideRecordStatement(db, { id: crypto.randomUUID(), orderId: input.orderId, amount: so.value, reason: lyDo.value!, occurredDate: ngay.value, at, by: input.ai.staffId }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: "deposit_outside_recorded", at, detail: lyDo.value! }, "changes() > 0"),
  ], [ngay.value]);
  if (!lo.ok) return lo;
  return { ok: true, value: null };
}

export async function xacNhanHoanNgoai(db: D1Database, input: { orderId: string; ghiId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  if (!UUID_RE.test(input.ghiId)) return loi(404, "not_found", "Không tìm thấy dòng đã hoàn ngoài hệ thống.");
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.dongY !== "boolean") return loi(400, "invalid_input", "Chọn xác nhận hay từ chối.");
  const lyDo = docLyDo(b.lyDo, !b.dongY);
  if (!lyDo.ok) return lyDo;
  const d = await docCoc(db, input.orderId);
  if (!d) return DON_CHUA_HUY();
  const ghi = d.hoanNgoai.find((g) => g.id === input.ghiId && g.kind === "RECORD");
  if (!ghi) return loi(404, "not_found", "Không tìm thấy dòng đã hoàn ngoài hệ thống.");
  if (d.hoanNgoai.some((x) => x.targetId === ghi.id)) return loi(409, "stale", "Dòng này đã được xác nhận hoặc từ chối.");
  const tc = tuChoi(kiemXacNhanHoanNgoai({ nguoiXacNhan: input.ai.staffId, nguoiGhi: ghi.createdBy, xacNhan: b.dongY, coc: d.coc, soTien: ghi.amount ?? 0 }));
  if (tc) return tc;
  const at = new Date().toISOString();
  const lo = await chayLo(db, [
    outsideDecideStatement(db, { id: crypto.randomUUID(), orderId: input.orderId, recordId: ghi.id, kind: b.dongY ? "CONFIRM" : "REJECT", reason: lyDo.value, occurredDate: vnToday(new Date()), at, by: input.ai.staffId }),
    auditStatement(db, { orderId: input.orderId, staffId: input.ai.staffId, action: b.dongY ? "deposit_outside_confirmed" : "deposit_outside_rejected", at, detail: lyDo.value ?? undefined }, "changes() > 0"),
  ], [vnToday(new Date())]);
  if (!lo.ok) return lo;
  if ((lo.kq[0]!.meta.changes ?? 0) === 0) return loi(404, "not_found", "Không tìm thấy dòng đã hoàn ngoài hệ thống.");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Danh sách + ô đếm cho Kế toán (đ5 nhắc, đ9c, đ11, đ16) — chỉ `ledger.view` any
// ---------------------------------------------------------------------------------------------------------------------------------------------------
async function tongHop(db: D1Database): Promise<CocListResponse> {
  const homNay = vnToday(new Date());
  const [dons, mo, giu] = await Promise.all([cocCancelledOrders(db), approvalsOpen(db), cancelledHolders(db)]);
  const ten = await partyLabels(db, [...new Set(giu.map((g) => g.party_id))]);
  const maDon = new Map(dons.map((x) => [x.order_id, x.order_code ?? "—"]));
  const moc7 = new Date(Date.parse(`${homNay}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
  return {
    canChi: mo.map((k) => ({
      duyetId: k.id, orderId: k.order_id, maDon: k.order_code ?? "—", loai: k.kind_code === "TRANSFER" ? "chuyen" : "hoan", conLai: k.con_lai, ngayDuyet: k.approved_date,
      qua7Ngay: k.approved_date < moc7, donNhan: k.target_order_code,
    })),
    donHuyGiuCoc: dons.filter((x) => x.con_giu > 0).map((x) => {
      const coc = { conGiu: x.con_giu } as SoTienCoc;
      return {
        orderId: x.order_id, maDon: x.order_code ?? "—", nhom: x.group_code, nhomNhan: nhanNhomHuy(x.group_code), conGiu: x.con_giu, han: x.refund_deadline, legacy: x.legacy === 1,
        sapHetHan: nhacCoc({ nhom: x.group_code as NhomHuy, han: x.refund_deadline, homNay, coc, khoanChuaChi: [] }).sapHetHan,
      };
    }),
    conNguoiGiu: giu.map((g) => ({ orderId: g.order_id, maDon: maDon.get(g.order_id) ?? "—", nguoi: ten.get(g.party_id)?.label ?? "Một người", soTien: g.balance })),
  };
}
export const danhSachCoc = (db: D1Database): Promise<CocListResponse> => tongHop(db);

export async function demCoc(db: D1Database): Promise<CocDemResponse> {
  const t = await tongHop(db);
  return {
    canChi: t.canChi.length,
    duyetQua7Ngay: t.canChi.filter((k) => k.qua7Ngay).length,
    sapHetHan: t.donHuyGiuCoc.filter((x) => x.sapHetHan).length,
    conNguoiGiu: new Set(t.conNguoiGiu.map((x) => x.orderId)).size,
  };
}

export async function doiChieuCoc(db: D1Database): Promise<CocDoiChieuResponse> {
  const dons = (await cocCancelledOrders(db)).filter((x) => x.legacy === 1 && x.con_giu > 0);
  const out: CocDoiChieuResponse["don"] = [];
  for (const x of dons) {
    const ds = (await outsideOfOrder(db, x.order_id)).map(toHoanNgoaiRow);
    out.push({ orderId: x.order_id, maDon: x.order_code ?? "—", ngayHuy: x.cancelled_date, daTra: x.da_tra, conGiu: x.con_giu, coDongHieuLuc: hoanNgoaiTrangThai(ds).dangHieuLuc.length > 0 });
  }
  return { don: out };
}
