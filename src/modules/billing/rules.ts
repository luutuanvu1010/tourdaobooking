// Luật THUẦN của sổ công nợ lượt 1 (module billing — ADR-0026 điều 4, 5, 8, 12; ADR-0025 điều 3, 7). Không I/O: repository đọc dòng, route gọi luật,
// luật trả câu lệnh cần ghi (dạng dữ liệu) và lời giải thích tiếng Việt. Kế hoạch Task 5.
//
// MỘT NGUỒN (Hiến chương 5.4, NT-R9): `conLai` là hàm DUY NHẤT tính "đã thu / còn lại / dư chờ hoàn" của một đơn — màn đơn, danh sách, Trang chủ,
// "Việc của tôi", biên nhận đều lấy số qua route của billing, không bề mặt nào tự trừ. Cùng định nghĩa "còn hiệu lực" với view `v_bil_order_paid` và
// trigger `bil_posting_delivered_paid` (migration 0045) — bài đối chiếu ở rules.test.ts.
// "Phải thu hiện hành" KHÔNG tính ở đây: `orders` công bố nó (một hàm tính tiền của đơn — `effectiveMoney`), billing nhận số.

import type { NhomHuy } from "../../shared/ly-do-huy.ts";

export type ReceiptKind = "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND";
export type CollectorRole = "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER" | "UNKNOWN";
export type DebtKind = "HELD" | "SETTLEMENT" | "REFUND";
export type MethodCode = "CASH" | "BANK_TRANSFER" | "OTHER";

export const METHOD_CODES: readonly MethodCode[] = ["CASH", "BANK_TRANSFER", "OTHER"];
/** Vai người thu ghi MỚI được (UNKNOWN chỉ cho cọc cũ chuyển sang; SUPPLIER từ lượt 2; BOOKER — người hưởng — chờ lượt 2 cùng M1). */
export const COLLECTOR_ROLES_GHI_MOI: readonly CollectorRole[] = ["COMPANY", "STAFF"];

export interface ReceiptRow {
  id: string;
  kind: ReceiptKind;
  amount: number;
  collectorRole: CollectorRole;
  collectorPartyId: string | null;
  reversesId: string | null;
  /** Khoản duyệt hoàn cọc mà lần trả lại khách này thuộc về (ADR-0089 đ4 — lần chi hoàn / nửa "chi" của lệnh chuyển). Không có = trả dư tự do / hoàn trước huỷ. */
  approvalId?: string | null;
}

export interface LineRow {
  id: string;
  debtorPartyId: string;
  creditorPartyId: string;
  amount: number;
  kind: DebtKind;
  orderId: string | null;
  receiptId: string | null;
  reversesLineId: string | null;
}

/** Dòng nợ CẦN GHI (chưa có id) — repository thêm id, phiếu, mốc. */
export interface LineDraft {
  debtorPartyId: string;
  creditorPartyId: string;
  amount: number;
  kind: DebtKind;
  reversesLineId: string | null;
}

/** Lần thu CÒN HIỆU LỰC: không phải dòng đảo và chưa bị đảo (bỏ cặp gốc/đảo). */
export function hieuLuc<T extends Pick<ReceiptRow, "id" | "reversesId">>(receipts: readonly T[]): T[] {
  const biDao = new Set(receipts.flatMap((r) => (r.reversesId ? [r.reversesId] : [])));
  return receipts.filter((r) => r.reversesId === null && !biDao.has(r.id));
}

export interface SoTienDon {
  /** Đã thu ròng = thu của khách − trả lại khách (lần thu còn hiệu lực). */
  daThu: number;
  /** Còn phải thu (≥ 0). */
  conLai: number;
  /** Khách đã trả dư, chờ Kế toán hoàn (≥ 0) — M2 (chủ 29/9 "Không chặn, chờ hoàn"). */
  du: number;
  /** Số lần thu còn hiệu lực có người thu "chưa rõ" (cọc cũ). */
  chuaRo: number;
}

/**
 * HÀM DUY NHẤT tính đã thu / còn lại / dư của một đơn (NT-R9). `phaiThu` = tổng khách phải trả hiện hành do `orders` công bố.
 * `trangThai` BẮT BUỘC (ADR-0089 đ1, đ14 — hàng rào H-C8): đơn ĐÃ HUỶ thì "còn lại" = 0 (khách không còn nợ) và "dư chờ hoàn" = 0 (cọc mặc định giữ —
 * hoàn chỉ qua khoản duyệt, xem `soTienCoc`). Tham số bắt buộc để mọi nơi gọi phải tự trả lời "đơn này huỷ chưa" — không có mặc định đoán.
 */
export function conLai(receipts: readonly ReceiptRow[], phaiThu: number, trangThai: "draft" | "confirmed" | "cancelled"): SoTienDon {
  const con = hieuLuc(receipts);
  const daThu = con.reduce((s, r) => s + (r.kind === "CUSTOMER_REFUND" ? -r.amount : r.amount), 0);
  const huy = trangThai === "cancelled";
  return {
    daThu,
    conLai: huy ? 0 : Math.max(0, phaiThu - daThu),
    du: huy ? 0 : Math.max(0, daThu - phaiThu),
    chuaRo: con.filter((r) => r.collectorRole === "UNKNOWN").length,
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đơn huỷ và cọc (ADR-0089 đ2, đ4, đ5, đ15, đ16, X-2…X-4) — MỘT NƠI định nghĩa đã trả / đang đối chiếu / còn giữ / đã duyệt / đã chi / đã chuyển / chờ chi.
// Câu SQL của trigger và view `v_bil_coc_don` (migration Đợt 1 Phần B) theo ĐÚNG định nghĩa này — bài đối chiếu hai nơi ở rules.test.ts.
// ---------------------------------------------------------------------------------------------------------------------------------------------------

/** Số người `ben` đang nợ `chu` trên tập dòng (của MỘT đơn): dương = `ben` còn nợ; âm = `chu` còn nợ `ben`. */
export function soDuCap(lines: readonly Pick<LineRow, "debtorPartyId" | "creditorPartyId" | "amount">[], ben: string, chu: string): number {
  let so = 0;
  for (const l of lines) {
    if (l.debtorPartyId === ben && l.creditorPartyId === chu) so += l.amount;
    else if (l.debtorPartyId === chu && l.creditorPartyId === ben) so -= l.amount;
  }
  return so;
}

/**
 * Lần thu "Công ty thu – CK" CHỜ XÁC NHẬN (MỘT định nghĩa — dùng cho `choXacNhan` của màn đơn VÀ cho "đang đối chiếu" của đơn huỷ; view `v_bil_coc_don`
 * và trigger đảo của 0079 theo đúng định nghĩa này): lần thu vai COMPANY còn dòng giữ hộ (HELD, dòng gốc) chưa bị đảo, VÀ người khai còn nợ công ty trên đơn
 * ≥ số của dòng giữ hộ (ADR-0092 Đ2b — khoản đã được tất toán bằng "Nộp" không còn chờ xác nhận; một dòng giữ hộ chỉ tất toán MỘT lần). `lines` = dòng của
 * MỘT đơn. Trả tập id lần thu.
 */
export function khoanChoXacNhan(
  receipts: readonly Pick<ReceiptRow, "id" | "collectorRole">[],
  lines: readonly Pick<LineRow, "id" | "kind" | "receiptId" | "reversesLineId" | "debtorPartyId" | "creditorPartyId" | "amount">[],
): Set<string> {
  const daoDong = new Set(lines.flatMap((l) => (l.reversesLineId ? [l.reversesLineId] : [])));
  const congTyThu = new Set(receipts.filter((r) => r.collectorRole === "COMPANY").map((r) => r.id));
  return new Set(
    lines
      .filter((l) => l.kind === "HELD" && l.reversesLineId === null && !daoDong.has(l.id) && l.receiptId !== null && congTyThu.has(l.receiptId)
        && soDuCap(lines, l.debtorPartyId, l.creditorPartyId) >= l.amount)
      .map((l) => l.receiptId!),
  );
}

/**
 * Nộp / trả không đổi dấu số dư (ADR-0092 Đ2): `soDu` = số bên đó đang nợ công ty trên đơn. Nộp ≤ số đang nợ; trả ≤ số công ty đang nợ bên đó.
 * Lớp CSDL: trigger `bil_debt_line_settlement_no_flip` (0080).
 */
export function kiemQuyetToan(input: { chieu: "nop" | "tra"; soDu: number; soTien: number; maDon: string }): { ok: true } | { ok: false; ma: string; cau: string } {
  if (input.chieu === "nop" && input.soTien > Math.max(0, input.soDu)) {
    return { ok: false, ma: "settlement_exceeds_held", cau: `Số tiền nộp vượt số người này đang giữ cho đơn ${input.maDon} (đang giữ ${dong(Math.max(0, input.soDu))}).` };
  }
  if (input.chieu === "tra" && input.soTien > Math.max(0, -input.soDu)) {
    return { ok: false, ma: "settlement_exceeds_owed", cau: `Số tiền trả vượt số công ty đang nợ người này cho đơn ${input.maDon} (đang nợ ${dong(Math.max(0, -input.soDu))}).` };
  }
  return { ok: true };
}

/** Câu chỉ đường khi "Công ty đã nhận" bị từ chối vì khoản đã được ghi nộp (ADR-0092 Đ2b — nguyên văn ví dụ của ADR). */
export const CAU_DA_NOP = "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản công ty thì đảo lần nộp trước rồi xác nhận.";

export type LoaiDuyet = "REFUND" | "TRANSFER";
/** Một dòng của sổ khoản duyệt (`bil_deposit_approval`): dòng gốc (`voidsId` null) hoặc dòng huỷ duyệt (trỏ gốc, `amount` = phần huỷ). */
export interface DuyetRow {
  id: string;
  kind: LoaiDuyet;
  amount: number;
  voidsId: string | null;
  targetOrderId: string | null;
  createdBy: string | null;
  approvedDate: string;
}
/** Một dòng "đã hoàn ngoài hệ thống" (đ16, X-4): RECORD (Toàn quyền ghi) → CONFIRM (Quản trị xác nhận) hoặc REJECT (từ chối — ghi lại được, lời chủ (b)). */
export interface HoanNgoaiRow {
  id: string;
  kind: "RECORD" | "CONFIRM" | "REJECT";
  amount: number | null;
  targetId: string | null;
  createdBy: string | null;
}
export type { NhomHuy };

export interface SoTienCoc {
  /** Đã trả = Σ lần thu của khách còn hiệu lực, ĐÃ XÁC NHẬN (bỏ khoản "Công ty thu – CK" chờ xác nhận — đ2). */
  daTra: number;
  /** Phần khách khai chuyển khoản chưa xác nhận (chưa tính vào đã trả). */
  dangDoiChieu: number;
  /** Lần trả lại khách còn hiệu lực KHÔNG gắn khoản duyệt = hoàn trước khi huỷ (sau phát hành, đơn huỷ chỉ hoàn qua khoản duyệt — H-C7). */
  hoanTruocHuy: number;
  /** Tiền còn giữ lúc huỷ = đã trả − hoàn trước khi huỷ: TRẦN của tổng duyệt (đ4a, đ15; lời chủ (c)). */
  conGiuLucHuy: number;
  /** Tổng duyệt (hoàn + chuyển) − phần huỷ duyệt + dòng hoàn ngoài ĐÃ xác nhận (X-4). */
  daDuyet: number;
  /** Đã chi hoàn (lần trả lại khách gắn khoản duyệt REFUND) + dòng hoàn ngoài đã xác nhận (X-4). */
  daChi: number;
  /** Đã chuyển sang đơn mới (lần trả lại khách gắn khoản duyệt TRANSFER — nửa "chi" của lệnh chuyển). */
  daChuyen: number;
  /** Phần hoàn ngoài hệ thống ĐÃ xác nhận (tính trong cả daDuyet lẫn daChi). */
  hoanNgoai: number;
  /** Còn giữ = đã trả − đã hoàn (trước huỷ + chi) − đã chuyển − hoàn ngoài (đ2). */
  conGiu: number;
  /** Chờ chi = đã duyệt − đã chi − đã chuyển. */
  choChi: number;
}

/** Số còn lại của MỘT khoản duyệt gốc = số duyệt − phần huỷ duyệt − phần đã chi/chuyển (lần trả lại khách còn hiệu lực gắn khoản đó). */
export function conLaiCuaKhoan(duyetId: string, duyet: readonly DuyetRow[], receipts: readonly ReceiptRow[]): number {
  const goc = duyet.find((d) => d.id === duyetId && d.voidsId === null);
  if (!goc) return 0;
  const huy = duyet.filter((d) => d.voidsId === duyetId).reduce((s, d) => s + d.amount, 0);
  const chi = hieuLuc(receipts).filter((r) => r.kind === "CUSTOMER_REFUND" && r.approvalId === duyetId).reduce((s, r) => s + r.amount, 0);
  return goc.amount - huy - chi;
}

/** Dòng hoàn ngoài RECORD đã được xác nhận (có CONFIRM trỏ tới), và RECORD còn "đang hiệu lực" (chưa bị từ chối). */
export function hoanNgoaiTrangThai(rows: readonly HoanNgoaiRow[]): { daXacNhan: HoanNgoaiRow[]; dangHieuLuc: HoanNgoaiRow[] } {
  const xacNhan = new Set(rows.filter((r) => r.kind === "CONFIRM").map((r) => r.targetId));
  const tuChoi = new Set(rows.filter((r) => r.kind === "REJECT").map((r) => r.targetId));
  const ghi = rows.filter((r) => r.kind === "RECORD");
  return { daXacNhan: ghi.filter((r) => xacNhan.has(r.id)), dangHieuLuc: ghi.filter((r) => !tuChoi.has(r.id)) };
}

/** HÀM DUY NHẤT tính tiền cọc của một đơn (ADR-0089 đ2, đ15). Dùng cho đơn huỷ; với đơn không huỷ các khoản duyệt/hoàn ngoài luôn rỗng. */
export function soTienCoc(input: {
  receipts: readonly ReceiptRow[];
  lines: readonly Pick<LineRow, "id" | "kind" | "receiptId" | "reversesLineId" | "debtorPartyId" | "creditorPartyId" | "amount">[];
  duyet: readonly DuyetRow[];
  hoanNgoai: readonly HoanNgoaiRow[];
}): SoTienCoc {
  const cho = khoanChoXacNhan(input.receipts, input.lines);
  const con = hieuLuc(input.receipts);
  const thu = con.filter((r) => r.kind === "CUSTOMER_PAYMENT");
  const daTra = thu.filter((r) => !cho.has(r.id)).reduce((s, r) => s + r.amount, 0);
  const dangDoiChieu = thu.filter((r) => cho.has(r.id)).reduce((s, r) => s + r.amount, 0);
  const loai = new Map(input.duyet.filter((d) => d.voidsId === null).map((d) => [d.id, d.kind]));
  const tra = con.filter((r) => r.kind === "CUSTOMER_REFUND");
  const hoanTruocHuy = tra.filter((r) => !r.approvalId).reduce((s, r) => s + r.amount, 0);
  const chiThat = tra.filter((r) => r.approvalId && loai.get(r.approvalId) === "REFUND").reduce((s, r) => s + r.amount, 0);
  const daChuyen = tra.filter((r) => r.approvalId && loai.get(r.approvalId) === "TRANSFER").reduce((s, r) => s + r.amount, 0);
  const hoanNgoai = hoanNgoaiTrangThai(input.hoanNgoai).daXacNhan.reduce((s, r) => s + (r.amount ?? 0), 0);
  const duyetGoc = input.duyet.filter((d) => d.voidsId === null).reduce((s, d) => s + d.amount, 0);
  const huyDuyet = input.duyet.filter((d) => d.voidsId !== null).reduce((s, d) => s + d.amount, 0);
  const daDuyet = duyetGoc - huyDuyet + hoanNgoai;
  const daChi = chiThat + hoanNgoai;
  const conGiuLucHuy = daTra - hoanTruocHuy;
  return { daTra, dangDoiChieu, hoanTruocHuy, conGiuLucHuy, daDuyet, daChi, daChuyen, hoanNgoai, conGiu: conGiuLucHuy - daChi - daChuyen, choChi: daDuyet - daChi - daChuyen };
}

const congNgay = (iso: string, ngay: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + ngay * 86_400_000).toISOString().slice(0, 10);

/** Hạn hoàn cọc (đ5): ngày khởi hành MUỘN NHẤT + 60 ngày; đơn chưa có ngày đi nào thì ngày huỷ + 60. Cùng biểu thức với trigger (`date(…, '+60 days')`). */
export function hanHoanCoc(input: { ngayDi: readonly (string | null)[]; ngayHuy: string }): string {
  const co = input.ngayDi.filter((d): d is string => d !== null).sort();
  return congNgay(co.at(-1) ?? input.ngayHuy, 60);
}

export type KiemCoc = { ok: true } | { ok: false; ma: string; cau: string };
const sai = (ma: string, cau: string): KiemCoc => ({ ok: false, ma, cau });

/** Duyệt hoàn / duyệt chuyển (đ4a, đ5, X-2): nhóm chưa kết luận → chặn; khách huỷ quá hạn → chặn; tổng duyệt vượt tiền còn giữ lúc huỷ → chặn. */
export function kiemDuyet(input: { coc: SoTienCoc; nhom: NhomHuy; han: string; homNay: string; soTien: number }): KiemCoc {
  if (input.nhom === "CHUA_KET_LUAN") return sai("coc_unclassified", "Lý do huỷ chưa được phân loại — Quản trị phân loại lý do trước khi duyệt hoàn cọc.");
  if (input.nhom === "KHACH_HUY" && input.homNay > input.han) return sai("coc_deadline", `Đã quá hạn hoàn cọc (hạn: ${ngayVn(input.han)}).`);
  const conDuyetDuoc = input.coc.conGiuLucHuy - input.coc.daDuyet;
  if (input.soTien > conDuyetDuoc) return sai("coc_exceeds_paid", `Vượt số tiền còn giữ của đơn — còn duyệt được tối đa ${dong(Math.max(0, conDuyetDuoc))}.`);
  return { ok: true };
}

/**
 * Bất biến đ15 — đúng MỌI LÚC (kể cả sau đảo lần thu / "Thay lần thu"): chi + chuyển ≤ duyệt ≤ tiền còn giữ lúc huỷ. Trả lỗi khi số SAU một lệnh vỡ bất
 * biến (máy chủ kiểm trước khi ghi; trigger lần thu là lớp CSDL — `coc_paid_below_approved`).
 */
export function kiemBatBien(sau: SoTienCoc): KiemCoc {
  if (sau.daDuyet > sau.conGiuLucHuy) {
    return sai("coc_paid_below_approved", `Đơn đã duyệt hoàn ${dong(sau.daDuyet)} — huỷ duyệt phần chưa chi trước khi đảo lần thu.`);
  }
  if (sau.daChi + sau.daChuyen > sau.daDuyet) return sai("coc_exceeds_approved", "Số đã chi / đã chuyển vượt số đã duyệt.");
  return { ok: true };
}

/** Huỷ duyệt (đ4c): chỉ phần CHƯA chi của khoản gốc. */
export function kiemHuyDuyet(input: { conLaiKhoan: number; soTien: number }): KiemCoc {
  if (input.soTien > input.conLaiKhoan) return sai("coc_void_exceeds_unspent", `Chỉ huỷ được phần chưa chi của khoản duyệt (còn ${dong(Math.max(0, input.conLaiKhoan))}).`);
  return { ok: true };
}

/**
 * Chi hoàn / chuyển theo khoản duyệt (đ4b, đ4c, đ6): người chi khác người duyệt; không vượt phần còn lại của khoản; người trả không phải công ty thì không vượt
 * số người đó đang giữ trên đơn.
 */
export function kiemChi(input: { conLaiKhoan: number; soTien: number; nguoiChi: string; nguoiDuyet: string | null; nguoiTraDangGiu: number | null }): KiemCoc {
  if (input.nguoiDuyet !== null && input.nguoiChi === input.nguoiDuyet) return sai("coc_same_person", "Người duyệt không tự chi / chuyển khoản này — cần một người khác (tách nhiệm vụ).");
  if (input.soTien > input.conLaiKhoan) return sai("coc_exceeds_approved", `Vượt phần đã duyệt còn lại (${dong(Math.max(0, input.conLaiKhoan))}).`);
  if (input.nguoiTraDangGiu !== null && input.soTien > input.nguoiTraDangGiu) {
    return sai("coc_exceeds_held", `Người trả chỉ đang giữ ${dong(Math.max(0, input.nguoiTraDangGiu))} của đơn này.`);
  }
  return { ok: true };
}

/** Ghi "đã hoàn ngoài hệ thống" (đ16, X-3): chỉ đơn huỷ cũ; một dòng đang hiệu lực; số ≤ còn giữ. Không bị hạn chặn. */
export function kiemGhiHoanNgoai(input: { legacy: boolean; coDongHieuLuc: boolean; coc: SoTienCoc; soTien: number }): KiemCoc {
  if (!input.legacy) return sai("coc_outside_not_legacy", "Chỉ ghi được cho đơn huỷ trước khi có lệnh hoàn cọc trong Nền tảng — đơn này hoàn qua Duyệt hoàn cọc.");
  if (input.coDongHieuLuc) return sai("coc_outside_once", "Đơn này đã có một dòng đã hoàn ngoài hệ thống đang hiệu lực.");
  if (input.soTien > input.coc.conGiu) return sai("coc_outside_exceeds", `Vượt số tiền còn giữ của đơn (${dong(Math.max(0, input.coc.conGiu))}).`);
  return { ok: true };
}

/** Xác nhận / từ chối dòng hoàn ngoài (X-4): người xác nhận khác người ghi; xác nhận thì số vẫn ≤ còn giữ và ≤ phần còn duyệt được. */
export function kiemXacNhanHoanNgoai(input: { nguoiXacNhan: string; nguoiGhi: string | null; xacNhan: boolean; coc: SoTienCoc; soTien: number }): KiemCoc {
  if (input.nguoiGhi !== null && input.nguoiXacNhan === input.nguoiGhi) return sai("coc_same_person", "Người ghi không tự xác nhận dòng này — cần Quản trị khác (tách nhiệm vụ).");
  if (input.xacNhan && (input.soTien > input.coc.conGiu || input.soTien > input.coc.conGiuLucHuy - input.coc.daDuyet)) {
    return sai("coc_outside_exceeds", "Số tiền của dòng này nay vượt số còn giữ của đơn — từ chối và ghi lại.");
  }
  return { ok: true };
}

/** Nhắc Kế toán (đ5 — chỉ nhắc, không đẩy tin): khoản duyệt chưa chi quá 7 ngày (mọi nhóm); còn ≤ 10 ngày tới hạn (chỉ khách huỷ, còn giữ > 0). */
export function nhacCoc(input: { nhom: NhomHuy; han: string; homNay: string; coc: SoTienCoc; khoanChuaChi: readonly { approvedDate: string; conLai: number }[] }): {
  duyetQua7Ngay: number;
  sapHetHan: boolean;
} {
  const moc7 = congNgay(input.homNay, -7);
  return {
    duyetQua7Ngay: input.khoanChuaChi.filter((k) => k.conLai > 0 && k.approvedDate < moc7).length,
    sapHetHan: input.nhom === "KHACH_HUY" && input.coc.conGiu > 0 && input.homNay <= input.han && congNgay(input.homNay, 10) >= input.han,
  };
}

/**
 * Dòng nợ sinh NGAY khi ghi một lần thu của khách (ADR-0026 điều 4 gạch 1–2):
 *  - người thu không phải Công ty (nhân viên, bên đặt) ⇒ *tiền đang giữ hộ*: người thu nợ công ty đúng số đó;
 *  - người thu = Công ty mà người GHI không phải Kế toán/Toàn quyền (H3 — "Công ty thu – CK" do HDV khai) ⇒ *giữ hộ* trên NGƯỜI KHAI tới khi Kế toán bấm
 *    "Công ty đã nhận" (dòng đảo của dòng đó — `sinhDongXacNhanCongTy`);
 *  - Kế toán/Toàn quyền tự ghi "Công ty thu" ⇒ không dòng; người thu "chưa rõ" (cọc cũ) ⇒ không dòng (không biết ai nợ).
 * Trả lại khách (CUSTOMER_REFUND) không đi đường này — xem `sinhDongHoanKhach`.
 */
export function sinhDongLanThu(input: {
  kind: ReceiptKind;
  amount: number;
  collectorRole: CollectorRole;
  collectorPartyId: string | null;
  nguoiGhiPartyId: string;
  nguoiGhiLaKeToan: boolean;
  congTyId: string;
}): LineDraft[] {
  if (input.kind !== "CUSTOMER_PAYMENT" || input.collectorRole === "UNKNOWN") return [];
  if (input.collectorRole === "COMPANY") {
    if (input.nguoiGhiLaKeToan || input.nguoiGhiPartyId === input.congTyId) return [];
    return [{ debtorPartyId: input.nguoiGhiPartyId, creditorPartyId: input.congTyId, amount: input.amount, kind: "HELD", reversesLineId: null }];
  }
  if (!input.collectorPartyId || input.collectorPartyId === input.congTyId) return [];
  return [{ debtorPartyId: input.collectorPartyId, creditorPartyId: input.congTyId, amount: input.amount, kind: "HELD", reversesLineId: null }];
}

/** Dòng ĐẢO của một dòng nợ (ADR-0026 điều 3): cùng số, đổi chỗ hai bên, cùng loại, trỏ gốc. */
export function sinhDongDao(goc: Pick<LineRow, "id" | "debtorPartyId" | "creditorPartyId" | "amount" | "kind">): LineDraft {
  return { debtorPartyId: goc.creditorPartyId, creditorPartyId: goc.debtorPartyId, amount: goc.amount, kind: goc.kind, reversesLineId: goc.id };
}

/** "Công ty đã nhận" (H3): phiếu xác nhận = dòng đảo của dòng giữ hộ trên người khai. */
export const sinhDongXacNhanCongTy = (dongGiuHo: Pick<LineRow, "id" | "debtorPartyId" | "creditorPartyId" | "amount" | "kind">): LineDraft => sinhDongDao(dongGiuHo);

/** "X đã nộp Y về công ty" (ADR-0026 điều 5): dòng *quyết toán* NGƯỢC chiều giữ hộ, phân bổ theo đơn (một lần nộp nhiều đơn = nhiều dòng). */
export function sinhDongQuyetToan(input: { nguoiNopPartyId: string; congTyId: string; phanBo: readonly { orderId: string; amount: number }[] }): (LineDraft & { orderId: string })[] {
  return input.phanBo.map((p) => ({ debtorPartyId: input.congTyId, creditorPartyId: input.nguoiNopPartyId, amount: p.amount, kind: "SETTLEMENT" as const, reversesLineId: null, orderId: p.orderId }));
}

/**
 * "Đã hoàn khách Y (người trả: X)" (ADR-0026 điều 5, M2): lần thu loại *trả lại khách* (giảm đã thu ròng) + nếu người trả KHÔNG phải công ty (trả bằng tiền mình
 * đang giữ) thì dòng *hoàn khách* công ty → X bù phần giữ hộ đó. Công ty tự trả ⇒ không dòng.
 */
export function sinhDongHoanKhach(input: { nguoiTraPartyId: string; congTyId: string; so: number }): LineDraft[] {
  if (input.nguoiTraPartyId === input.congTyId) return [];
  return [{ debtorPartyId: input.congTyId, creditorPartyId: input.nguoiTraPartyId, amount: input.so, kind: "REFUND", reversesLineId: null }];
}

/** Phiếu "Đã giao" lượt 1: KHÔNG có dòng thương mại (đơn khách lẻ, Tour Đảo bán — ADR-0026 điều 4 gạch 3; lượt 2 sinh từ số đã chụp lúc Xác nhận). */
export function sinhPhieuDaGiao(): LineDraft[] {
  return [];
}

/** Số dư từng bên với công ty chủ: dương = bên đó còn NỢ công ty; âm = công ty còn nợ bên đó (gộp mọi dòng kể cả đảo). */
export function soDuTheoBen(lines: readonly Pick<LineRow, "debtorPartyId" | "creditorPartyId" | "amount">[], congTyId: string): Map<string, number> {
  const out = new Map<string, number>();
  const cong = (ben: string, so: number) => out.set(ben, (out.get(ben) ?? 0) + so);
  for (const l of lines) {
    if (l.creditorPartyId === congTyId) cong(l.debtorPartyId, l.amount);
    else if (l.debtorPartyId === congTyId) cong(l.creditorPartyId, -l.amount);
  }
  return out;
}

/** 1000000 → "1.000.000 ₫" (không phụ thuộc bảng ngôn ngữ của máy chạy). */
export const dong = (n: number): string => `${String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₫`;
const ngayVn = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Ai phải xử lý (Hiến chương 5.7 — giữ đối tượng khi thiếu điều kiện: nói rõ lý do + ai làm tiếp). */
export type AiXuLy = "Kế toán" | "Hướng dẫn viên" | "Người lập đơn" | "Văn phòng";
export type MaLyDo =
  | "not_confirmed" | "cancelled" | "already_delivered" | "missing_date" | "before_departure" | "booker_partner" | "unknown_collector" | "underpaid" | "overpaid";
export interface LyDoGiu {
  ma: MaLyDo;
  cau: string;
  aiXuLy: AiXuLy;
}

/**
 * Vì sao đơn CHƯA bấm "Đã giao – đã thu đủ" được (ADR-0025 điều 3; M1 = A; NT-F6c) — lý do ĐẦU TIÊN theo thứ tự cố định, hoặc null khi đủ điều kiện.
 * Máy chủ vẫn kiểm lại TRONG lô (câu `orders` + trigger billing) — hàm này để trả câu dễ hiểu và để màn đơn hiện "đang giữ vì…" (NT-F11).
 */
export function lyDoChuaGiaoDuoc(input: {
  status: "draft" | "confirmed" | "cancelled";
  deliveredAt: string | null;
  homNay: string;
  /** Ngày đi của từng dịch vụ (null = chưa có ngày). */
  ngayDi: readonly (string | null)[];
  /** Tên dịch vụ thiếu ngày đi (để câu báo). */
  dichVuThieuNgay: readonly string[];
  /** Bên đặt mang vai nhóm bên ngoài đang mở (người hưởng — M1 = A: chờ lượt 2). */
  coNguoiHuong: boolean;
  so: SoTienDon;
}): LyDoGiu | null {
  if (input.deliveredAt) return { ma: "already_delivered", cau: "Đơn đã Đã giao – đã thu đủ.", aiXuLy: "Văn phòng" };
  if (input.status === "cancelled") return { ma: "cancelled", cau: "Đơn đã huỷ.", aiXuLy: "Văn phòng" };
  if (input.status !== "confirmed") return { ma: "not_confirmed", cau: "Đơn chưa xác nhận — xác nhận đơn trước.", aiXuLy: "Người lập đơn" };
  if (input.dichVuThieuNgay.length > 0 || input.ngayDi.length === 0 || input.ngayDi.some((d) => d === null)) {
    const ten = input.dichVuThieuNgay.length ? `Dịch vụ ${input.dichVuThieuNgay.join(", ")}` : "Có dịch vụ";
    return { ma: "missing_date", cau: `${ten} chưa có ngày đi — sửa đơn trước.`, aiXuLy: "Người lập đơn" };
  }
  const muonNhat = [...(input.ngayDi as string[])].sort().at(-1)!;
  if (input.homNay < muonNhat) {
    return { ma: "before_departure", cau: `Chưa tới ngày đi (${ngayVn(muonNhat)}) — bấm từ ngày đi trở đi.`, aiXuLy: "Hướng dẫn viên" };
  }
  if (input.coNguoiHuong) {
    return { ma: "booker_partner", cau: "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới khi có phần hoa hồng.", aiXuLy: "Văn phòng" };
  }
  if (input.so.chuaRo > 0) {
    return { ma: "unknown_collector", cau: "Còn tiền trả trước chưa rõ người thu — Kế toán xác nhận lại người thu trước.", aiXuLy: "Kế toán" };
  }
  if (input.so.conLai > 0) {
    return { ma: "underpaid", cau: `Còn thiếu ${dong(input.so.conLai)} — ghi thêm lần thu hoặc sửa đơn trước.`, aiXuLy: "Hướng dẫn viên" };
  }
  if (input.so.du > 0) return { ma: "overpaid", cau: `Khách đã trả dư ${dong(input.so.du)} — chờ Kế toán hoàn.`, aiXuLy: "Kế toán" };
  return null;
}

export type MaLyDoHoanThanh = "not_delivered" | "already_completed" | "unsettled";
/** Vì sao chưa "Hoàn thành" được (ADR-0025 điều 7): chưa Đã giao, đã Hoàn thành, hoặc còn bên nợ công ty. `tenBen` đổi id hồ sơ → tên (không SĐT). */
export function lyDoChuaHoanThanh(input: {
  deliveredAt: string | null;
  completedAt: string | null;
  soDu: ReadonlyMap<string, number>;
  tenBen: (partyId: string) => string;
}): { ma: MaLyDoHoanThanh; cau: string; aiXuLy: AiXuLy } | null {
  if (!input.deliveredAt) return { ma: "not_delivered", cau: "Đơn chưa Đã giao – đã thu đủ.", aiXuLy: "Hướng dẫn viên" };
  if (input.completedAt) return { ma: "already_completed", cau: "Đơn đã Hoàn thành.", aiXuLy: "Kế toán" };
  const no = [...input.soDu.entries()].filter(([, so]) => so > 0);
  if (no.length > 0) {
    const ds = no.map(([ben, so]) => `${input.tenBen(ben)} đang giữ ${dong(so)}`).join("; ");
    return { ma: "unsettled", cau: `Còn người giữ tiền của công ty: ${ds} — ghi nộp tiền / xác nhận công ty đã nhận trước.`, aiXuLy: "Kế toán" };
  }
  return null;
}

/** Ngày phát sinh (Hiến chương 5.14): mặc định hôm nay giờ VN; chỉ Kế toán/Toàn quyền chọn ngày khác (NT-S8). Trả lỗi tiếng Việt nếu không được. */
export function ngayPhatSinh(input: { chon: unknown; homNay: string; laKeToan: boolean }): { ok: true; value: string } | { ok: false; message: string } {
  if (input.chon === undefined || input.chon === null || input.chon === "") return { ok: true, value: input.homNay };
  if (typeof input.chon !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.chon) || Number.isNaN(Date.parse(`${input.chon}T00:00:00Z`))) {
    return { ok: false, message: "Ngày phát sinh không hợp lệ." };
  }
  if (new Date(`${input.chon}T00:00:00Z`).toISOString().slice(0, 10) !== input.chon) return { ok: false, message: "Ngày phát sinh không hợp lệ." };
  if (input.chon !== input.homNay && !input.laKeToan) return { ok: false, message: "Chỉ Kế toán chọn được ngày phát sinh khác hôm nay." };
  if (input.chon > input.homNay) return { ok: false, message: "Ngày phát sinh không được sau hôm nay." };
  return { ok: true, value: input.chon };
}
