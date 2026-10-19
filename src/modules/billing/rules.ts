// Luật THUẦN của sổ công nợ lượt 1 (module billing — ADR-0026 điều 4, 5, 8, 12; ADR-0025 điều 3, 7). Không I/O: repository đọc dòng, route gọi luật,
// luật trả câu lệnh cần ghi (dạng dữ liệu) và lời giải thích tiếng Việt. Kế hoạch Task 5.
//
// MỘT NGUỒN (Hiến chương 5.4, NT-R9): `conLai` là hàm DUY NHẤT tính "đã thu / còn lại / dư chờ hoàn" của một đơn — màn đơn, danh sách, Trang chủ,
// "Việc của tôi", biên nhận đều lấy số qua route của billing, không bề mặt nào tự trừ. Cùng định nghĩa "còn hiệu lực" với view `v_bil_order_paid` và
// trigger `bil_posting_delivered_paid` (migration 0045) — bài đối chiếu ở rules.test.ts.
// "Phải thu hiện hành" KHÔNG tính ở đây: `orders` công bố nó (một hàm tính tiền của đơn — `effectiveMoney`), billing nhận số.

import { cauKyKhoa, kyCua } from "../../shared/ky-khoa.ts";
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

/** Khoản thu CÒN HIỆU LỰC: không phải dòng đảo và chưa bị đảo (bỏ cặp gốc/đảo). */
export function hieuLuc<T extends Pick<ReceiptRow, "id" | "reversesId">>(receipts: readonly T[]): T[] {
  const biDao = new Set(receipts.flatMap((r) => (r.reversesId ? [r.reversesId] : [])));
  return receipts.filter((r) => r.reversesId === null && !biDao.has(r.id));
}

export interface SoTienDon {
  /** Đã thu ròng = thu của khách − trả lại khách (khoản thu còn hiệu lực). */
  daThu: number;
  /** Còn phải thu (≥ 0). */
  conLai: number;
  /** Khách đã trả dư, chờ Kế toán hoàn (≥ 0) — M2 (chủ 29/9 "Không chặn, chờ hoàn"). ≤ đã thu, vì phải thu do `orders` công bố không bao giờ âm (ADR-0109). */
  du: number;
  /** Số khoản thu còn hiệu lực có người thu "chưa rõ" (cọc cũ). */
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

/** Dấu đối chiếu của một khoản thu (bảng `bil_receipt_recon`, migration 0099 — ADR-0120 Điều 1): DECLARED = người không phải Kế toán khai "Công ty thu"; CONFIRMED = Kế toán đã bấm "Công ty đã nhận". */
export interface DoiChieuRow {
  receiptId: string;
  kind: "DECLARED" | "CONFIRMED";
  /** Ngày dân sự (giờ VN) khai khoản này — gốc tính "quá 3 ngày". */
  occurredDate?: string;
}

/**
 * Khoản thu "Công ty thu" CHỜ XÁC NHẬN / ĐANG ĐỐI CHIẾU (MỘT định nghĩa — dùng cho `choXacNhan` của màn đơn, cho "đang đối chiếu" của đơn huỷ và cho chặn "Đã giao"; view
 * `v_bil_coc_don` và trigger đảo của 0079/0099 theo đúng định nghĩa này). Hai đường:
 *  - khoản CŨ (khai trước ngày áp ADR-0120): khoản thu vai COMPANY còn dòng giữ hộ (HELD, dòng gốc) chưa bị đảo, VÀ người khai còn nợ công ty trên đơn ≥ số của
 *    dòng giữ hộ (ADR-0092 Đ2b — khoản đã được tất toán bằng "Nộp" không còn chờ; một dòng giữ hộ chỉ tất toán MỘT lần);
 *  - khoản MỚI (ADR-0120 Điều 1): có dấu DECLARED mà chưa có dấu CONFIRMED — không có dòng nợ nào.
 * `lines` = dòng của MỘT đơn. Trả tập id khoản thu. `doiChieu` mặc định rỗng (đơn không có khoản mới).
 */
export function khoanChoXacNhan(
  receipts: readonly (Pick<ReceiptRow, "id" | "collectorRole"> & { reversesId?: string | null })[],
  lines: readonly Pick<LineRow, "id" | "kind" | "receiptId" | "reversesLineId" | "debtorPartyId" | "creditorPartyId" | "amount">[],
  doiChieu: readonly DoiChieuRow[] = [],
): Set<string> {
  const daoDong = new Set(lines.flatMap((l) => (l.reversesLineId ? [l.reversesLineId] : [])));
  const congTyThu = new Set(receipts.filter((r) => r.collectorRole === "COMPANY").map((r) => r.id));
  const cu = lines
    .filter((l) => l.kind === "HELD" && l.reversesLineId === null && !daoDong.has(l.id) && l.receiptId !== null && congTyThu.has(l.receiptId)
      && soDuCap(lines, l.debtorPartyId, l.creditorPartyId) >= l.amount)
    .map((l) => l.receiptId!);
  return new Set([...cu, ...khoanMoiDoiChieu(receipts, doiChieu)]);
}

/** Khoản MỚI đang đối chiếu (ADR-0120): khoản thu Công ty còn hiệu lực (chưa bị đảo) có dấu DECLARED mà chưa có CONFIRMED. Khoản cũ (dòng giữ hộ) KHÔNG nằm ở đây. */
export function khoanMoiDoiChieu(receipts: readonly (Pick<ReceiptRow, "id" | "collectorRole"> & { reversesId?: string | null })[], doiChieu: readonly DoiChieuRow[]): Set<string> {
  const daNhan = new Set(doiChieu.filter((d) => d.kind === "CONFIRMED").map((d) => d.receiptId));
  const biDao = new Set(receipts.flatMap((r) => (r.reversesId ? [r.reversesId] : [])));
  const congTyThu = new Set(receipts.filter((r) => r.collectorRole === "COMPANY" && !r.reversesId).map((r) => r.id));
  return new Set(doiChieu.filter((d) => d.kind === "DECLARED" && !daNhan.has(d.receiptId) && !biDao.has(d.receiptId) && congTyThu.has(d.receiptId)).map((d) => d.receiptId));
}

/** Số ngày khoản đang đối chiếu để quá hạn thì nhắc Kế toán (ADR-0120 Điều 1.3 — chủ để mặc định 3 ngày). Quá = nhiều HƠN số này. */
export const SO_NGAY_NHAC_DOI_CHIEU = 3;

/** Khoản đang đối chiếu khai ngày `ngayKhai` (ngày dân sự giờ VN) có phải nhắc không: `ngayKhai` sớm hơn `homNay` hơn 3 ngày (đúng 3 ngày chưa nhắc, 4 ngày nhắc). */
export const nhacDoiChieu = (input: { homNay: string; ngayKhai: string }): boolean => input.ngayKhai < congNgay(input.homNay, -SO_NGAY_NHAC_DOI_CHIEU);

/**
 * Khoản thu này có phải KHOẢN MỚI ĐANG ĐỐI CHIẾU ngay khi ghi không (ADR-0120 Điều 1.1; chủ chốt 2026-10-15: CHỈ chuyển khoản): khoản thu của khách, người thu = Công ty,
 * hình thức CHUYỂN KHOẢN, mà người GHI không phải Kế toán/Toàn quyền (và không phải hồ sơ công ty). Khi đúng: máy chủ ghi dấu DECLARED, KHÔNG sinh dòng giữ hộ.
 * Tiền mặt (hoặc hình thức khác) ghi "Công ty thu" giữ luật H3 cũ: dòng giữ hộ trên người khai — người cầm tiền thật vẫn chịu nợ.
 */
export const canDoiChieu = (input: { kind: ReceiptKind; collectorRole: CollectorRole; method?: MethodCode; nguoiGhiPartyId: string; nguoiGhiLaKeToan: boolean; congTyId: string }): boolean =>
  input.kind === "CUSTOMER_PAYMENT" && input.collectorRole === "COMPANY" && input.method === "BANK_TRANSFER" && !input.nguoiGhiLaKeToan && input.nguoiGhiPartyId !== input.congTyId;

/**
 * Nộp / trả không đổi dấu số dư (ADR-0092 Đ2): `soDu` = số bên đó đang nợ công ty trên đơn. Nộp ≤ số đang nợ; trả ≤ số công ty đang nợ bên đó.
 * Lớp CSDL: trigger `bil_debt_line_settlement_no_flip` (0080).
 */
export function kiemQuyetToan(input: { chieu: "nop" | "tra"; soDu: number; soTien: number; maDon: string }): { ok: true } | { ok: false; ma: string; cau: string } {
  if (input.chieu === "nop" && input.soTien > Math.max(0, input.soDu)) {
    return { ok: false, ma: "settlement_exceeds_held", cau: `Số tiền nộp vượt số người này chưa nộp về công ty của đơn ${input.maDon} (còn ${dong(Math.max(0, input.soDu))} chưa nộp).` };
  }
  if (input.chieu === "tra" && input.soTien > Math.max(0, -input.soDu)) {
    return { ok: false, ma: "settlement_exceeds_owed", cau: `Số tiền trả vượt số công ty đang nợ người này cho đơn ${input.maDon} (đang nợ ${dong(Math.max(0, -input.soDu))}).` };
  }
  return { ok: true };
}

type KetQuaKiem = { ok: true } | { ok: false; ma: string; cau: string };

/**
 * ADR-0092 Đ1 (A-B16): đảo một khoản thu không được làm đã thu RÒNG của đơn < 0. `daThu` = `conLai(...).daThu` hiện tại (thu cộng, trả lại khách trừ — cùng
 * công thức trigger 0045 / 0082). Đảo một lần TRẢ LẠI KHÁCH làm đã thu tăng — luôn qua.
 */
export function kiemDaoLanThu(input: { daThu: number; goc: Pick<ReceiptRow, "kind" | "amount"> }): KetQuaKiem {
  if (input.goc.kind !== "CUSTOMER_REFUND" && input.goc.amount > input.daThu) {
    return { ok: false, ma: "net_paid_negative", cau: `Huỷ khoản thu này làm số đã thu của đơn bị âm (đang thu ${dong(Math.max(0, input.daThu))}) — huỷ khoản trả lại khách trước, rồi mới huỷ khoản thu.` };
  }
  return { ok: true };
}

/** ADR-0092 Đ3 (A-B7, KT09): người trả không phải công ty hoàn ≤ số người đó đang giữ trên đơn (`dangGiu` = `soDuCap(dòng của đơn, người trả, công ty)`). */
export function kiemHoanNguoiGiu(input: { dangGiu: number; soTien: number }): KetQuaKiem {
  if (input.soTien > Math.max(0, input.dangGiu)) {
    return {
      ok: false, ma: "refund_exceeds_held",
      cau: `Số hoàn vượt số người này chưa nộp về công ty của đơn (còn ${dong(Math.max(0, input.dangGiu))} chưa nộp). Nhân viên ứng tiền túi trả khách thì ghi người trả là Công ty.`,
    };
  }
  return { ok: true };
}

/** ADR-0092 Đ5c: lý do điều chỉnh tối thiểu (ký tự, đã bỏ khoảng trắng hai đầu). Trigger 0082 ép cùng số. */
export const LY_DO_DIEU_CHINH_TOI_THIEU = 10;

/** ADR-0115 điều 1: yêu cầu điều chỉnh tự hết hạn sau số ngày này nếu không ai duyệt (tính lúc đọc, không Cron). Trigger 0094 `bil_adjustment_request_expired` ép cùng số. */
export const HAN_YEU_CAU_NGAY = 7;
/** Yêu cầu tạo lúc `taoLuc` đã quá hạn lúc `bayGio` chưa (ISO có mili-giây; đúng 7 ngày còn duyệt được). */
export const hetHanYeuCau = (taoLuc: string, bayGio: string): boolean => Date.parse(bayGio) - Date.parse(taoLuc) > HAN_YEU_CAU_NGAY * 86_400_000;

/** Hướng của một điều chỉnh: INCREASE = tăng nợ của `benNo` (tính vào trần cộng dồn), DECREASE = giảm nợ (Đ5a). */
export type HuongDieuChinh = "INCREASE" | "DECREASE";
export type KetQuaKiemDieuChinh =
  | { ok: true; huong: HuongDieuChinh; tran: number; tangDaCoToiDa: number }
  | { ok: false; ma: string; cau: string };

/**
 * MỘT HÀM kiểm điều chỉnh (Hiến chương dự án 5.4) — ADR-0092 Đ5a, Đ5b sửa bởi ADR-0115 điều 4: dòng điều chỉnh "`benNo` nợ `benDuocNo` thêm `soTien`", kiểm lúc TẠO yêu cầu
 * và kiểm lại lúc DUYỆT (theo số dư lúc đó). `nguoc` = số `benDuocNo` đang nợ `benNo` trên đơn (`soDuCap(dòng của đơn, benDuocNo, benNo)`). Còn nợ (> 0) ⇒ đây là GIẢM NỢ
 * của `benDuocNo`: ≤ số đang nợ, không đổi dấu (Đ5a). Không còn nợ ⇒ TĂNG NỢ của `benNo`: trần = max(phải thu, đã thu ròng) của đơn — CỘNG DỒN: `tangDaCo` (Σ điều chỉnh tăng nợ
 * còn hiệu lực của đơn) + `tangDangCho` (Σ yêu cầu tăng nợ đang chờ, chưa hết hạn, KHÔNG gồm yêu cầu đang xét) + `soTien` ≤ trần (C-2: hai lệnh 500.000 trên đơn phải thu
 * 500.000 không được cùng qua). Trả thêm `tangDaCoToiDa` = số lớn nhất mà tổng `tangDaCo` được phép đạt — lô duyệt dùng làm lính gác CSDL (cùng một công thức, không tính lần hai).
 */
export function kiemDieuChinh(input: {
  nguoc: number; soTien: number; phaiThu: number; daThu: number; tangDaCo?: number; tangDangCho?: number;
  /** Dòng loại QUYẾT TOÁN (nộp / trả) mà một bên là công ty chủ: trigger 0080 `settlement_sign_flip` chỉ nhận khi số đang nợ NGƯỢC chiều ≥ số tiền (không đổi dấu). */
  quyetToanVoiCongTy?: boolean;
}): KetQuaKiemDieuChinh {
  // Chỉ nhánh «không có nợ ngược chiều»: nếu có nợ mà số tiền vượt, nhánh giảm nợ ngay dưới đã trả cùng mã `adjustment_flips_sign`.
  if (input.quyetToanVoiCongTy && input.nguoc <= 0) {
    return { ok: false, ma: "adjustment_flips_sign", cau: "Trên đơn này chưa có khoản nợ nào để quyết toán (nộp / trả) — ghi quyết toán sẽ làm số dư đổi dấu. Chọn loại dòng khác hoặc kiểm lại hai bên." };
  }
  const tran = Math.max(input.phaiThu, input.daThu);
  if (input.nguoc > 0) {
    if (input.soTien > input.nguoc) {
      return { ok: false, ma: "adjustment_flips_sign", cau: `Điều chỉnh giảm nợ vượt số đang nợ trên đơn (${dong(input.nguoc)}) — số dư không được đổi dấu.` };
    }
    return { ok: true, huong: "DECREASE", tran, tangDaCoToiDa: 0 };
  }
  const daCo = input.tangDaCo ?? 0;
  const dangCho = input.tangDangCho ?? 0;
  if (daCo + dangCho + input.soTien > tran) {
    const them = daCo + dangCho > 0 ? ` Đơn đã có ${dong(daCo)} điều chỉnh tăng nợ còn hiệu lực và ${dong(dangCho)} đang chờ duyệt.` : "";
    return { ok: false, ma: "adjustment_exceeds_cap", cau: `Điều chỉnh tăng nợ vượt trần của đơn (${dong(tran)} — số lớn hơn giữa phải thu và đã thu).${them} Kiểm lại số tiền.` };
  }
  return { ok: true, huong: "INCREASE", tran, tangDaCoToiDa: tran - input.soTien - dangCho };
}

/** Câu chỉ đường khi "Công ty đã nhận" bị từ chối vì khoản đã được ghi nộp (ADR-0092 Đ2b — nguyên văn ví dụ của ADR). */
export const CAU_DA_NOP = "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản công ty thì huỷ lần ghi nộp trước rồi xác nhận.";

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
  /** Đã trả = Σ khoản thu của khách còn hiệu lực, ĐÃ XÁC NHẬN (bỏ khoản "Công ty thu – CK" chờ xác nhận — đ2). */
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
  /** Phần của `daDuyet` là duyệt CHUYỂN (khoản TRANSFER − phần huỷ duyệt của chúng) — để biên nhận không gọi khoản chuyển chưa thực hiện là "hoàn" (kiểm độc lập vòng 2). */
  daDuyetChuyen: number;
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
  /** Dấu đối chiếu của khoản MỚI (ADR-0120) — thiếu = đơn không có khoản mới. */
  doiChieu?: readonly DoiChieuRow[];
}): SoTienCoc {
  const cho = khoanChoXacNhan(input.receipts, input.lines, input.doiChieu ?? []);
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
  const daDuyetChuyen = input.duyet.reduce((s, d) => (loai.get(d.voidsId ?? d.id) === "TRANSFER" ? s + (d.voidsId === null ? d.amount : -d.amount) : s), 0);
  const daChi = chiThat + hoanNgoai;
  const conGiuLucHuy = daTra - hoanTruocHuy;
  return { daTra, dangDoiChieu, hoanTruocHuy, conGiuLucHuy, daDuyet, daChi, daChuyen, daDuyetChuyen, hoanNgoai, conGiu: conGiuLucHuy - daChi - daChuyen, choChi: daDuyet - daChi - daChuyen };
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
  if (input.nhom === "CHUA_KET_LUAN") return sai("coc_unclassified", "Lý do huỷ chưa được phân loại — Quản trị phân loại lý do trước khi duyệt hoàn thu trước.");
  if (input.nhom === "KHACH_HUY" && input.homNay > input.han) return sai("coc_deadline", `Đã quá hạn hoàn thu trước (hạn: ${ngayVn(input.han)}).`);
  const conDuyetDuoc = input.coc.conGiuLucHuy - input.coc.daDuyet;
  if (input.soTien > conDuyetDuoc) return sai("coc_exceeds_paid", `Vượt số tiền còn giữ của đơn — còn duyệt được tối đa ${dong(Math.max(0, conDuyetDuoc))}.`);
  return { ok: true };
}

/**
 * Bất biến đ15 — đúng MỌI LÚC (kể cả sau đảo khoản thu / "Sửa khoản thu đã ghi"): chi + chuyển ≤ duyệt ≤ tiền còn giữ lúc huỷ. Trả lỗi khi số SAU một lệnh vỡ bất
 * biến (máy chủ kiểm trước khi ghi; trigger khoản thu là lớp CSDL — `coc_paid_below_approved`).
 */
export function kiemBatBien(sau: SoTienCoc): KiemCoc {
  if (sau.daDuyet > sau.conGiuLucHuy) {
    return sai("coc_paid_below_approved", `Đơn đã duyệt hoàn ${dong(sau.daDuyet)} — huỷ duyệt phần chưa chi trước khi huỷ khoản thu.`);
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
    return sai("coc_exceeds_held", `Người trả chỉ còn ${dong(Math.max(0, input.nguoiTraDangGiu))} của đơn này chưa nộp về công ty.`);
  }
  return { ok: true };
}

/** Ghi "đã hoàn ngoài hệ thống" (đ16, X-3): chỉ đơn huỷ cũ; một dòng đang hiệu lực; số ≤ còn giữ. Không bị hạn chặn. */
export function kiemGhiHoanNgoai(input: { legacy: boolean; coDongHieuLuc: boolean; coc: SoTienCoc; soTien: number }): KiemCoc {
  if (!input.legacy) return sai("coc_outside_not_legacy", "Chỉ ghi được cho đơn huỷ trước khi có lệnh hoàn thu trước trong Nền tảng — đơn này hoàn qua Duyệt hoàn thu trước.");
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
 * Dòng nợ sinh NGAY khi ghi một khoản thu của khách (ADR-0026 điều 4 gạch 1–2; ADR-0120 Điều 1 chỉ thay gạch 2 cho CHUYỂN KHOẢN):
 *  - người thu không phải Công ty (nhân viên, bên đặt) ⇒ *tiền đang giữ hộ*: người thu nợ công ty đúng số đó;
 *  - người thu = Công ty, người GHI là Kế toán/Toàn quyền ⇒ không dòng (tiền đã về công ty);
 *  - người thu = Công ty, người khác khai, hình thức CHUYỂN KHOẢN ⇒ KHÔNG dòng nào — khoản ĐANG ĐỐI CHIẾU (dấu DECLARED, `canDoiChieu`) tới khi Kế toán bấm
 *    "Công ty đã nhận"; hướng dẫn viên chỉ nợ phần tiền họ thật sự cầm;
 *  - người thu = Công ty, người khác khai, TIỀN MẶT / hình thức khác ⇒ giữ luật H3 cũ: *giữ hộ* trên NGƯỜI KHAI tới khi Kế toán bấm "Công ty đã nhận";
 *  - người thu "chưa rõ" (cọc cũ) ⇒ không dòng (không biết ai nợ).
 * `method` thiếu coi như không phải chuyển khoản (đường H3 cũ). Trả lại khách (CUSTOMER_REFUND) không đi đường này — xem `sinhDongHoanKhach`.
 */
export function sinhDongLanThu(input: {
  kind: ReceiptKind;
  amount: number;
  collectorRole: CollectorRole;
  collectorPartyId: string | null;
  method?: MethodCode;
  nguoiGhiPartyId: string;
  nguoiGhiLaKeToan: boolean;
  congTyId: string;
}): LineDraft[] {
  if (input.kind !== "CUSTOMER_PAYMENT" || input.collectorRole === "UNKNOWN") return [];
  if (input.collectorRole === "COMPANY") {
    if (input.nguoiGhiLaKeToan || input.nguoiGhiPartyId === input.congTyId || input.method === "BANK_TRANSFER") return [];
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
 * "Đã hoàn khách Y (người trả: X)" (ADR-0026 điều 5, M2): khoản thu loại *trả lại khách* (giảm đã thu ròng) + nếu người trả KHÔNG phải công ty (trả bằng tiền mình
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
  | "not_confirmed" | "cancelled" | "already_delivered" | "missing_date" | "before_departure" | "booker_partner" | "unknown_collector" | "reconciling" | "underpaid" | "overpaid";
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
  /** Số khoản "Công ty thu" ĐANG ĐỐI CHIẾU của đơn (ADR-0120 Điều 1.2) — còn khoản thì chưa "Đã giao" được. */
  soKhoanDoiChieu: number;
  so: SoTienDon;
}): LyDoGiu | null {
  if (input.deliveredAt) return { ma: "already_delivered", cau: "Đơn đã ở bước Đã giao – đã thu đủ.", aiXuLy: "Văn phòng" };
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
    return { ma: "booker_partner", cau: "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới bản cập nhật sổ đại lý.", aiXuLy: "Văn phòng" };
  }
  if (input.soKhoanDoiChieu > 0) {
    return { ma: "reconciling", cau: "Còn khoản chuyển khoản “Công ty thu” đang chờ Kế toán đối chiếu — Kế toán bấm “Xác nhận đã nhận” rồi mới bấm Đã giao được.", aiXuLy: "Kế toán" };
  }
  if (input.so.chuaRo > 0) {
    return { ma: "unknown_collector", cau: "Còn tiền trả trước chưa rõ người thu tiền — Kế toán xác nhận lại người thu tiền trước.", aiXuLy: "Kế toán" };
  }
  if (input.so.conLai > 0) {
    return { ma: "underpaid", cau: `Còn thiếu ${dong(input.so.conLai)} — ghi thêm khoản thu hoặc sửa đơn trước.`, aiXuLy: "Hướng dẫn viên" };
  }
  if (input.so.du > 0) return { ma: "overpaid", cau: `Khách đã trả dư ${dong(input.so.du)} — chờ Kế toán hoàn.`, aiXuLy: "Kế toán" };
  return null;
}

export type MaLyDoHoanThanh = "not_delivered" | "already_completed" | "unsettled" | "due_mismatch";
/** Vì sao chưa "Hoàn thành" được (ADR-0025 điều 7): chưa Đã giao, đã Hoàn thành, hoặc còn bên nợ công ty. `tenBen` đổi id hồ sơ → tên (không SĐT). */
export function lyDoChuaHoanThanh(input: {
  deliveredAt: string | null;
  completedAt: string | null;
  soDu: ReadonlyMap<string, number>;
  tenBen: (partyId: string) => string;
  /** ADR-0088 đ1, đ5: đã thu ròng hiện tại và phải thu lúc Đã giao (bản chụp phiếu DELIVERED; null = chưa có phiếu). */
  daThu: number;
  phaiThuLucGiao: number | null;
}): { ma: MaLyDoHoanThanh; cau: string; aiXuLy: AiXuLy } | null {
  if (!input.deliveredAt) return { ma: "not_delivered", cau: "Đơn chưa Đã giao – đã thu đủ.", aiXuLy: "Hướng dẫn viên" };
  if (input.completedAt) return { ma: "already_completed", cau: "Đơn đã Hoàn thành.", aiXuLy: "Kế toán" };
  const no = [...input.soDu.entries()].filter(([, so]) => so > 0);
  if (no.length > 0) {
    const ds = no.map(([ben, so]) => `${input.tenBen(ben)} còn ${dong(so)} chưa nộp`).join("; ");
    return { ma: "unsettled", cau: `Còn người chưa nộp tiền về công ty: ${ds} — ghi nộp tiền / xác nhận công ty đã nhận trước.`, aiXuLy: "Kế toán" };
  }
  if (input.phaiThuLucGiao !== null && input.daThu !== input.phaiThuLucGiao) {
    return {
      ma: "due_mismatch", aiXuLy: "Kế toán",
      cau: `Số đã thu (${dong(input.daThu)}) khác phải thu lúc Đã giao (${dong(input.phaiThuLucGiao)}) — Kế toán dùng “Sửa khoản thu đã ghi” trước khi Hoàn thành.`,
    };
  }
  return null;
}

/**
 * Ngày phát sinh (Hiến chương 5.14): mặc định hôm nay giờ VN; chỉ Kế toán/Toàn quyền chọn ngày khác (NT-S8). Trả lỗi tiếng Việt nếu không được.
 * Ngày chọn thuộc tháng ĐÃ KHOÁ sổ (ADR-0080 D1) ⇒ lỗi kèm `khoa: true` (route đổi sang 409 `period_closed`); mặc định hôm nay không cần kiểm (tháng hiện tại không khoá được).
 */
export function ngayPhatSinh(input: { chon: unknown; homNay: string; laKeToan: boolean; kyDaKhoa: (ngay: string) => boolean }): { ok: true; value: string } | { ok: false; message: string; khoa?: true } {
  if (input.chon === undefined || input.chon === null || input.chon === "") return { ok: true, value: input.homNay };
  if (typeof input.chon !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.chon) || Number.isNaN(Date.parse(`${input.chon}T00:00:00Z`))) {
    return { ok: false, message: "Ngày phát sinh không hợp lệ." };
  }
  if (new Date(`${input.chon}T00:00:00Z`).toISOString().slice(0, 10) !== input.chon) return { ok: false, message: "Ngày phát sinh không hợp lệ." };
  if (input.chon !== input.homNay && !input.laKeToan) return { ok: false, message: "Chỉ Kế toán chọn được ngày phát sinh khác hôm nay." };
  if (input.chon > input.homNay) return { ok: false, message: "Ngày phát sinh không được sau hôm nay." };
  if (input.kyDaKhoa(input.chon)) return { ok: false, message: cauKyKhoa(kyCua(input.chon)), khoa: true };
  return { ok: true, value: input.chon };
}
