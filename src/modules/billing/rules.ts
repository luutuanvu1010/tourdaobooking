// Luật THUẦN của sổ công nợ lượt 1 (module billing — ADR-0026 điều 4, 5, 8, 12; ADR-0025 điều 3, 7). Không I/O: repository đọc dòng, route gọi luật,
// luật trả câu lệnh cần ghi (dạng dữ liệu) và lời giải thích tiếng Việt. Kế hoạch Task 5.
//
// MỘT NGUỒN (Hiến chương 5.4, NT-R9): `conLai` là hàm DUY NHẤT tính "đã thu / còn lại / dư chờ hoàn" của một đơn — màn đơn, danh sách, Trang chủ,
// "Việc của tôi", biên nhận đều lấy số qua route của billing, không bề mặt nào tự trừ. Cùng định nghĩa "còn hiệu lực" với view `v_bil_order_paid` và
// trigger `bil_posting_delivered_paid` (migration 0045) — bài đối chiếu ở rules.test.ts.
// "Phải thu hiện hành" KHÔNG tính ở đây: `orders` công bố nó (một hàm tính tiền của đơn — `effectiveMoney`), billing nhận số.

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

/** HÀM DUY NHẤT tính đã thu / còn lại / dư của một đơn (NT-R9). `phaiThu` = tổng khách phải trả hiện hành do `orders` công bố. */
export function conLai(receipts: readonly ReceiptRow[], phaiThu: number): SoTienDon {
  const con = hieuLuc(receipts);
  const daThu = con.reduce((s, r) => s + (r.kind === "CUSTOMER_REFUND" ? -r.amount : r.amount), 0);
  return {
    daThu,
    conLai: Math.max(0, phaiThu - daThu),
    du: Math.max(0, daThu - phaiThu),
    chuaRo: con.filter((r) => r.collectorRole === "UNKNOWN").length,
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
