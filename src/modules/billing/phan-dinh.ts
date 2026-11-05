// PHÂN ĐỊNH TRÁCH NHIỆM VÀ HOÀN TIỀN SAU "ĐÃ GIAO" (ADR-0116 thi hành ADR-0088 đ9; đặc tả docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-adr-0088-d9.md; migration 0135).
// Đề nghị → Phân định → Ghi sổ MỘT lô. Route (index.ts) hỏi `can()` TRƯỚC rồi mới gọi ở đây. Không SQL thô. Thứ tự lô ghi: dòng chuỗi (đã tính vào "giảm trừ") → [lô Thay] / [lần trả khách + dòng hoàn của người trả]
// → phiếu ATTRIBUTION (trigger kiểm I1) → dòng nợ → nhật ký + tin. Lần trả khách đứng TRƯỚC dòng nợ mới để trigger "đang giữ" không tính nhầm. Mọi trigger RAISE ⇒ cả lô huỷ.
// I1: `phaiThuHienHanh` (view v_bil_phai_thu_hien_hanh) là MỘT nguồn; R-BIL-1 và trigger đọc cùng view.
import { auditStatement } from "../audit";
import type { PhanThuongMai } from "../orders";
import type { DanhSachPhanDinhResponse, KhoanTrachNhiemDto, PhieuPhanDinhDto } from "../../shared/contracts";
import { UUID_RE } from "../../shared/http";
import { LY_DO_PHAN_DINH_TOI_THIEU, NGAY_LAM_VIEC_PHAN_HOI, TRUONG_HOP, congNgayLamViec, laMaTruongHop, quaHanNhac, quaHanT11, type MaTruongHop, type TrangThaiPhieu } from "../../shared/phan-dinh";
import { vnToday } from "../../shared/vn-date";
import { taiKhoanCuaHoSo, taiKhoanDangDungCuaHoSo } from "./dieu-chinh-repo";
import { chenPhanDinhStatement, dongGiuHoCacDon, dsPhanDinh, hoanPhanDinhStatement, phanDinhCuaBenChiu, phanDinhTheoDon, phanDinhTheoId, thongTinBenChiu, type DongGiuHo, type DongPhanDinh } from "./phan-dinh-repo";
import { lineIfPostingStatement, linesOfOrder, orderOwners, ownerCompanyId, partyLabels, postingIfReceiptStatement, postingPlainStatement, receiptsOfOrder } from "./repository";
import { CAU_DA_NOP_PHAN_DINH, CAU_KHACH_CHUA_TRA_DONG_NAO, METHOD_CODES, conLai, dong, kiemHoanNguoiGiu, kiemLoPhanDinh, sinhDongHoanKhach, soDaNopKhoanPhanDinh, soDuGiuHo } from "./rules";
import { CHUA_CO_CONG_TY, PARTY_ID_RE, docLyDo, docNgay, docSoTien, layKyDaKhoa, lineOf, loi, loiKhoaKy, loiTrigger, toLineRow, toReceiptRow, type KetQua, type NguoiGoi } from "./service";
import { chuanBiLoThay, kiemNgayThay, loiLoThay, phaiThuSauThay } from "./thay-lan-thu";
import { phaiThuHienHanh } from "./thay-lan-thu-repo";

const NOT_FOUND = () => loi(404, "not_found", "Không tìm thấy phiếu phân định.");
const CUNG_NGUOI = () => loi(409, "attribution_same_person", "Bạn là người đã phân định khoản này — cần một người khác ghi sổ (tách nhiệm vụ).");
const DA_NOP = () => loi(409, "attribution_da_nop", CAU_DA_NOP_PHAN_DINH);
const LOI_I1 = () => loi(409, "attribution_i1", `Sau lần ghi, số đã thu phải bằng phải thu của đơn trừ giảm trừ. Khách chỉ trả thiếu thì sửa khoản thu đã ghi trong chính lần ghi này. ${CAU_KHACH_CHUA_TRA_DONG_NAO}`);

/** Lý do bắt buộc ≥ 10 ký tự, không dãy số dài (cùng luật `docLyDo`). */
function docLyDoDai(raw: unknown): KetQua<string> {
  const l = docLyDo(raw, true);
  if (!l.ok) return l;
  const v = (l.value ?? "").trim();
  if (v.length < LY_DO_PHAN_DINH_TOI_THIEU) return loi(400, "invalid_input", `Lý do tối thiểu ${LY_DO_PHAN_DINH_TOI_THIEU} ký tự.`);
  return { ok: true, value: v };
}

/** Bên chịu (không phải công ty) đã nộp một phần trở lên vào khoản trên đơn này? Lớp CSDL: `bil_attribution_da_nop`. */
const daNopKhoan = async (db: D1Database, orderId: string, ben: string | null, congTyId: string): Promise<boolean> =>
  !!ben && ben !== congTyId && soDaNopKhoanPhanDinh((await linesOfOrder(db, orderId)).map(toLineRow), ben, congTyId) > 0;

/** Hiện trạng một khoản đã ghi (dòng POSTED gốc): số còn hiệu lực, bên chịu hiện tại, phân định đổi bên chịu đang mở. Đọc từ các dòng của đơn. */
export function khoanCua(dongDon: readonly DongPhanDinh[], goc: DongPhanDinh): { conHieuLuc: number; benChiu: string | null; benChiuLabel: string | null; truongHop: string | null; ruLucPhanDinh: string; dangDoi: DongPhanDinh | null; cuoi: DongPhanDinh } {
  const con = dongDon.filter((d) => d.root_id === goc.id);
  const daDao = con.filter((d) => d.step_code === "REVERSAL").reduce((s, d) => s + (d.amount ?? 0), 0);
  const doi = con.filter((d) => d.step_code === "REASSIGNED");
  const cuoi = doi.length > 0 ? doi[doi.length - 1]! : goc;
  const dangDoi = con.find((d) => d.step_code === "RULING" && !doi.some((x) => x.target_id === d.id)) ?? null;
  const rulingCuoi = dongDon.find((d) => d.id === cuoi.target_id);
  return { conHieuLuc: (goc.amount ?? 0) - daDao, benChiu: cuoi.liable_party_id, benChiuLabel: cuoi.liable_label, truongHop: cuoi.case_code, ruLucPhanDinh: rulingCuoi?.created_at ?? goc.created_at, dangDoi, cuoi };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đề nghị
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function taoDeNghi(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ id: string; orderId: string }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (typeof b.orderId !== "string" || !UUID_RE.test(b.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const lyDo = docLyDoDai(b.lyDo);
  if (!lyDo.ok) return lyDo;
  const owners = await orderOwners(db, [b.orderId]);
  if (!owners.has(b.orderId)) return loi(404, "not_found", "Không tìm thấy đơn.");
  if ((await phaiThuHienHanh(db, b.orderId)) === null) return loi(409, "not_delivered", "Đơn chưa tới bước Xong và đủ tiền — trước bước Xong và đủ tiền, khoản thu và hoàn khách đi đường thường.");
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  await db.batch([
    chenPhanDinhStatement(db, { id, orderId: b.orderId, buoc: "REQUEST", targetId: null, rootId: null, caseCode: null, liable: null, amount: so.value, moneyOut: null, reason: lyDo.value, postingId: null, at, by: input.ai.staffId }),
    auditStatement(db, { orderId: b.orderId, staffId: input.ai.staffId, action: "attribution_requested", at, targetType: "ledger", targetId: id, detail: `${dong(so.value)} · ${lyDo.value}` }),
  ]);
  return { ok: true, value: { id, orderId: b.orderId } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Phân định (đầu hoặc đổi bên chịu)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
/** Bên chịu hợp lệ theo trường hợp. `"cong_ty"` ⇒ công ty chủ. Hồ sơ phải có thật, đang hoạt động, không phải khách thuần, và có vai khác khách hoặc có tài khoản. */
async function docBenChiu(db: D1Database, raw: unknown, truongHop: MaTruongHop, congTyId: string): Promise<KetQua<string>> {
  if (TRUONG_HOP[truongHop].benChiu === "cong_ty") return { ok: true, value: congTyId };
  if (typeof raw !== "string" || !PARTY_ID_RE.test(raw)) return loi(400, "invalid_input", "Chọn bên chịu trách nhiệm.");
  if (raw === congTyId) return loi(400, "invalid_input", "Trường hợp này bên chịu không phải công ty — chọn đúng người hoặc đơn vị đã gây ra, hoặc chọn «Bất khả kháng» / «Chưa xác định».");
  const t = await thongTinBenChiu(db, raw);
  if (!t || !t.active) return loi(400, "invalid_input", "Không tìm thấy hồ sơ bên chịu (hồ sơ đang hoạt động).");
  if (t.la_khach) return loi(400, "liable_is_customer", "Khách không bao giờ là bên chịu trách nhiệm.");
  if (!t.co_vai && !(await taiKhoanCuaHoSo(db, [raw])).has(raw)) return loi(400, "invalid_input", "Hồ sơ này không phải nhân viên, nhà xe, nhà cung cấp hay đại lý.");
  return { ok: true, value: raw };
}

export async function phanDinh(db: D1Database, input: { requestId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ id: string; orderId: string }>> {
  if (!UUID_RE.test(input.requestId)) return NOT_FOUND();
  const q = await phanDinhTheoId(db, input.requestId);
  if (!q || q.step_code !== "REQUEST") return NOT_FOUND();
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (!laMaTruongHop(b.truongHop)) return loi(400, "invalid_input", "Chọn trường hợp.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  if (typeof b.coTienRa !== "boolean") return loi(400, "invalid_input", "Chọn có trả tiền cho khách hay không.");
  if (b.coTienRa && !TRUONG_HOP[b.truongHop].tienRaDuoc) return loi(400, "invalid_input", "Trường hợp ghi nhầm (khách thật sự chưa trả) không có tiền trả khách.");
  const lyDo = docLyDoDai(b.lyDo);
  if (!lyDo.ok) return lyDo;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const ben = await docBenChiu(db, b.benChiuPartyId, b.truongHop, congTyId);
  if (!ben.ok) return ben;
  const [hh, receipts] = await Promise.all([phaiThuHienHanh(db, q.order_id), receiptsOfOrder(db, q.order_id)]);
  if (hh === null) return loi(409, "not_delivered", "Đơn chưa tới bước Xong và đủ tiền.");
  // Trần báo sớm cho người phân định; lúc ghi kiểm lại theo số khi đó.
  if (so.value > hh) return loi(409, "attribution_over_due", `Số giảm trừ vượt phải thu còn lại của đơn (${dong(hh)}).`);
  // Chủ quyết 2026-11-02 (BL-PD-T4-TOAN-PHAN): chặn ngay ở đây để phiếu không nằm chờ ghi mãi; bước ghi vẫn kiểm vì số có thể đổi sau đó.
  if (!b.coTienRa && so.value === hh && conLai(receipts.map(toReceiptRow), 0, "confirmed").daThu > 0) return loi(409, "attribution_i1", CAU_KHACH_CHUA_TRA_DONG_NAO);
  if (b.coTienRa && so.value > conLai(receipts.map(toReceiptRow), 0, "confirmed").daThu) return loi(409, "refund_exceeds_paid", "Số trả khách vượt số khách đã trả cho đơn.");
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const stmts = [
    chenPhanDinhStatement(db, { id, orderId: q.order_id, buoc: "RULING", targetId: q.id, rootId: null, caseCode: b.truongHop, liable: ben.value, amount: so.value, moneyOut: b.coTienRa ? 1 : 0, reason: lyDo.value, postingId: null, at, by }),
    // Nguồn tin cho người có ô ghi sổ (khoá 'ledger', lọc ở thong-bao.ts).
    auditStatement(db, { orderId: q.order_id, staffId: by, action: "attribution_ruled", at, targetType: "ledger", targetId: id, detail: `${b.truongHop} · ${dong(so.value)} · ${lyDo.value}` }),
  ];
  if (q.created_by && q.created_by !== by) stmts.push(auditStatement(db, { orderId: q.order_id, staffId: by, action: "attribution_ruled", at, targetType: "staff", targetId: q.created_by, detail: "Đề nghị của bạn đã được phân định" }));
  try {
    await db.batch(stmts);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_attribution\.target_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Đề nghị này vừa được phân định — tải lại.");
    if (loiTrigger(e, "attribution_ruling_invalid")) return loi(409, "attribution_ruling_invalid", "Phân định không hợp lệ (bên chịu hoặc số tiền vừa thay đổi) — tải lại rồi thử lại.");
    throw e;
  }
  return { ok: true, value: { id, orderId: q.order_id } };
}

/** "Phân định mới": đổi bên chịu của một khoản đã ghi (T11 đã rõ ai chịu; phân định nhầm người). Giảm trừ và tiền đã trả khách không đổi. Cần một người khác ghi. */
export async function doiBenChiu(db: D1Database, input: { rootId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ id: string; orderId: string }>> {
  if (!UUID_RE.test(input.rootId)) return NOT_FOUND();
  const goc = await phanDinhTheoId(db, input.rootId);
  if (!goc || goc.step_code !== "POSTED") return NOT_FOUND();
  const b = (input.raw ?? {}) as Record<string, unknown>;
  if (!laMaTruongHop(b.truongHop) || b.truongHop === "T11") return loi(400, "invalid_input", "Chọn trường hợp mới.");
  const lyDo = docLyDoDai(b.lyDo);
  if (!lyDo.ok) return lyDo;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const ben = await docBenChiu(db, b.benChiuPartyId, b.truongHop, congTyId);
  if (!ben.ok) return ben;
  const k = khoanCua(await phanDinhTheoDon(db, goc.order_id), goc);
  if (k.conHieuLuc <= 0) return loi(409, "invalid_state", "Khoản này đã được huỷ hết.");
  if (k.dangDoi) return loi(409, "stale", "Khoản này đang có một phân định đổi bên chịu chờ ghi.");
  if (k.benChiu === ben.value) return loi(400, "invalid_input", "Bên chịu mới trùng bên chịu hiện tại.");
  if (await daNopKhoan(db, goc.order_id, k.benChiu, congTyId)) return DA_NOP();
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  try {
    await db.batch([
      chenPhanDinhStatement(db, { id, orderId: goc.order_id, buoc: "RULING", targetId: k.cuoi.id, rootId: goc.id, caseCode: b.truongHop, liable: ben.value, amount: k.conHieuLuc, moneyOut: 0, reason: lyDo.value, postingId: null, at, by: input.ai.staffId }),
      auditStatement(db, { orderId: goc.order_id, staffId: input.ai.staffId, action: "attribution_ruled", at, targetType: "ledger", targetId: id, detail: `đổi bên chịu · ${b.truongHop} · ${dong(k.conHieuLuc)} · ${lyDo.value}` }),
    ]);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_attribution\.target_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Khoản này vừa có phân định mới — tải lại.");
    if (loiTrigger(e, "attribution_ruling_invalid")) return loi(409, "attribution_ruling_invalid", "Phân định không hợp lệ (số của khoản vừa thay đổi) — tải lại rồi thử lại.");
    throw e;
  }
  return { ok: true, value: { id, orderId: goc.order_id } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi sổ theo phân định — MỘT lô
// ---------------------------------------------------------------------------------------------------------------------------------------------------
/** Dòng nợ của khoản: bên chịu → công ty (công ty chịu ⇒ không dòng). `nguoc` = dòng ngược chiều (đổi bên chịu / đảo). */
const dongNo = (ben: string | null, congTyId: string, soTien: number, nguoc: boolean) =>
  !ben || ben === congTyId ? [] : [{ debtorPartyId: nguoc ? congTyId : ben, creditorPartyId: nguoc ? ben : congTyId, amount: soTien, kind: "ATTRIBUTION" as const, reversesLineId: null }];

/** Tin riêng cho một hồ sơ có tài khoản (không phải công ty, không phải người đang làm). */
async function cauTinBenChiu(db: D1Database, ben: readonly (string | null)[], cty: string, v: { orderId: string; by: string; at: string; detail: string; action?: "attribution_posted" | "attribution_reassigned" | "attribution_reversed" }): Promise<D1PreparedStatement[]> {
  const ids = [...new Set(ben.filter((x): x is string => !!x && x !== cty))];
  const tk = await taiKhoanCuaHoSo(db, ids);
  return [...new Set(ids.flatMap((p) => (tk.has(p) && tk.get(p) !== v.by ? [tk.get(p)!] : [])))].map((nv) =>
    auditStatement(db, { orderId: v.orderId, staffId: v.by, action: v.action ?? "attribution_posted", at: v.at, targetType: "staff", targetId: nv, detail: v.detail }));
}

function loiLoGhi(e: unknown): { ok: false; res: Response } | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: bil_attribution\.target_id|UNIQUE constraint failed: bil_payment_receipt\.attribution_id/.test(m)) return loi(409, "stale", "Phân định này vừa được ghi sổ — tải lại.");
  if (loiTrigger(e, "attribution_same_person")) return CUNG_NGUOI();
  if (loiTrigger(e, "attribution_da_nop")) return DA_NOP();
  if (loiTrigger(e, "attribution_over_due")) return loi(409, "attribution_over_due", "Giảm trừ cộng dồn vượt phải thu của đơn — số vừa thay đổi, tải lại.");
  if (loiTrigger(e, "attribution_i1")) return LOI_I1();
  if (loiTrigger(e, "refund_exceeds_paid")) return loi(409, "refund_exceeds_paid", "Số trả khách vượt số khách đã trả cho đơn — số vừa thay đổi, tải lại.");
  if (loiTrigger(e, "refund_exceeds_held")) return loi(409, "refund_exceeds_held", "Số hoàn vượt số người này chưa nộp về công ty của đơn — số vừa thay đổi, tải lại.");
  if (loiTrigger(e, "attribution_post_invalid")) return loi(409, "stale", "Số của khoản vừa thay đổi — tải lại rồi thử lại.");
  return null;
}

/** Ngày phát sinh: trong tháng đang mở (Hiến chương 5.14, cùng luật "Sửa khoản thu đã ghi"); ngày thật đi vào ghi chú của phiếu. */
async function docNgayGhi(db: D1Database, raw: unknown): Promise<KetQua<string>> {
  const ngay = docNgay(raw, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const kn = kiemNgayThay(ngay.value, vnToday(new Date()));
  return kn.ok ? ngay : loi(400, "invalid_input", "Ngày phát sinh phải trong tháng đang mở (tháng này) — ngày thật ghi ở ô «Ngày thật».");
}
/** Ghi chú phiếu: lý do + ngày thật (đã kiểm dạng) khi khác ngày phát sinh. */
function ghiChuPhieu(lyDo: string, ngayThat: unknown): KetQua<string> {
  if (ngayThat === undefined || ngayThat === null || ngayThat === "") return { ok: true, value: lyDo };
  if (typeof ngayThat !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ngayThat)) return loi(400, "invalid_input", "Ngày thật không hợp lệ.");
  return { ok: true, value: `${lyDo} · ngày thật ${ngayThat}`.slice(0, 500) };
}

/**
 * `rulingId`: phân định đầu ⇒ lô POSTED (giảm trừ + nợ + có thể trả khách); phân định đổi bên chịu ⇒ lô REASSIGNED (nợ cũ → nợ mới; giảm trừ không đổi). `quyenHoan` do route hỏi (`payment.refund`).
 * Khách thật sự chưa trả (không tiền ra): nếu sổ còn ghi đủ, thân phải kèm `thay` để sửa khoản thu TRONG CHÍNH lô này — I1 đúng ở mọi trạng thái đã ghi (Tự quyết, xem báo cáo). `phan` do route đọc sau `can(`.
 */
export async function ghiTheoPhanDinh(db: D1Database, input: { rulingId: string; phan: PhanThuongMai | null; raw: unknown; ai: NguoiGoi; quyenHoan: boolean }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.rulingId)) return NOT_FOUND();
  const r = await phanDinhTheoId(db, input.rulingId);
  if (!r || r.step_code !== "RULING") return NOT_FOUND();
  if (r.created_by === input.ai.staffId) return CUNG_NGUOI();
  const dongDon = await phanDinhTheoDon(db, r.order_id);
  if (dongDon.some((d) => d.target_id === r.id && (d.step_code === "POSTED" || d.step_code === "REASSIGNED"))) return loi(409, "stale", "Phân định này đã được ghi sổ.");
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const ngay = await docNgayGhi(db, b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const ghiChu = ghiChuPhieu(r.reason ?? "", b.ngayThat);
  if (!ghiChu.ok) return ghiChu;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const postingId = crypto.randomUUID();
  const amount = r.amount!;
  const dauTien = dongDon.find((d) => d.id === r.target_id)?.step_code === "REQUEST";

  if (!dauTien) {
    // Đổi bên chịu: dòng ngược cho bên cũ + dòng mới cho bên mới, cùng số; I1 không đổi.
    const goc = dongDon.find((d) => d.id === r.root_id)!;
    const k = khoanCua(dongDon, goc);
    if (k.conHieuLuc !== amount) return loi(409, "stale", "Số của khoản vừa thay đổi — cần phân định lại.");
    if (await daNopKhoan(db, r.order_id, k.benChiu, congTyId)) return DA_NOP();
    const stmts = [
      chenPhanDinhStatement(db, { id: crypto.randomUUID(), orderId: r.order_id, buoc: "REASSIGNED", targetId: r.id, rootId: r.root_id, caseCode: r.case_code, liable: r.liable_party_id, amount, moneyOut: 0, reason: r.reason, postingId, at, by }),
      postingPlainStatement(db, { id: postingId, kind: "ATTRIBUTION", orderId: r.order_id, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }),
      ...[...dongNo(k.benChiu, congTyId, amount, true), ...dongNo(r.liable_party_id, congTyId, amount, false)].map((d) => lineIfPostingStatement(db, lineOf(d, postingId, r.order_id, null, at, by))),
      auditStatement(db, { orderId: r.order_id, staffId: by, action: "attribution_posted", at, targetType: "ledger", targetId: r.root_id ?? r.id, detail: `đổi bên chịu · ${r.case_code} · ${dong(amount)}` }),
      ...await cauTinBenChiu(db, [k.benChiu], congTyId, { orderId: r.order_id, by, at, detail: "Bạn không còn chịu khoản này", action: "attribution_reassigned" }),
      ...await cauTinBenChiu(db, [r.liable_party_id], congTyId, { orderId: r.order_id, by, at, detail: "Bạn được phân định chịu một khoản trên đơn" }),
    ];
    return chayLo(db, stmts, ngay.value, r.order_id);
  }

  const moneyOut = r.money_out === 1;
  if (moneyOut && !input.quyenHoan) return loi(403, "forbidden", "Lần ghi này có trả tiền cho khách — cần quyền ghi hoàn khách.");
  if (moneyOut && b.thay) return loi(400, "invalid_input", "Lần ghi có trả tiền cho khách không kèm sửa khoản thu.");
  const [hh, receipts, lines] = await Promise.all([phaiThuHienHanh(db, r.order_id), receiptsOfOrder(db, r.order_id), linesOfOrder(db, r.order_id)]);
  if (hh === null) return loi(409, "not_delivered", "Đơn chưa tới bước Xong và đủ tiền.");
  const daThu = conLai(receipts.map(toReceiptRow), 0, "confirmed").daThu;
  if (!moneyOut && amount === hh && daThu > 0) return loi(409, "attribution_i1", CAU_KHACH_CHUA_TRA_DONG_NAO);
  // Lô Thay (khách thật sự chưa trả — T4): câu lệnh của "Sửa khoản thu đã ghi", cùng một hàm, I1 đích = phải thu hiện hành − số giảm trừ của lô này.
  const thayRaw = !moneyOut && b.thay && typeof b.thay === "object" ? (b.thay as Record<string, unknown>) : null;
  const thay = thayRaw
    ? await chuanBiLoThay(db, { orderId: r.order_id, phan: input.phan, raw: { ...thayRaw, ngayPhatSinh: ngay.value }, ai: input.ai, phaiThuDich: hh - amount })
    : null;
  if (thay && !thay.ok) return thay;
  const k = kiemLoPhanDinh({ soTien: amount, phaiThuHienHanh: hh, daThu, coTienRa: moneyOut, daThuSauThay: thay?.ok ? phaiThuSauThay(thay.value) : null });
  if (!k.ok) return loi(409, k.ma, k.cau);

  const attrId = crypto.randomUUID();
  const stmts: D1PreparedStatement[] = [
    chenPhanDinhStatement(db, { id: attrId, orderId: r.order_id, buoc: "POSTED", targetId: r.id, rootId: null, caseCode: r.case_code, liable: r.liable_party_id, amount, moneyOut: r.money_out, reason: r.reason, postingId, at, by }),
  ];
  if (thay?.ok) stmts.push(...thay.value.stmts);
  if (moneyOut) {
    if (typeof b.hinhThuc !== "string" || !(METHOD_CODES as readonly string[]).includes(b.hinhThuc)) return loi(400, "invalid_input", "Chọn hình thức trả khách (tiền mặt, chuyển khoản hoặc khác).");
    let nguoiTra = congTyId;
    if (b.nguoiTra && typeof b.nguoiTra === "object" && typeof (b.nguoiTra as { partyId?: unknown }).partyId === "string") {
      nguoiTra = (b.nguoiTra as { partyId: string }).partyId;
      if (!PARTY_ID_RE.test(nguoiTra) || (nguoiTra !== congTyId && !(await partyLabels(db, [nguoiTra])).get(nguoiTra))) return loi(400, "invalid_input", "Không tìm thấy người trả.");
    } else if (b.nguoiTra !== undefined && b.nguoiTra !== "cong_ty") return loi(400, "invalid_input", "Chọn người trả tiền cho khách (Công ty hoặc người chưa nộp tiền về công ty).");
    if (nguoiTra !== congTyId) {
      // ADR-0092 Đ3: người trả không phải công ty chỉ trả trong số họ đang giữ cho đơn. Khoản nợ theo phân định KHÔNG phải tiền đang giữ.
      const giu = kiemHoanNguoiGiu({ dangGiu: soDuGiuHo(lines.map(toLineRow), nguoiTra, congTyId), soTien: amount });
      if (!giu.ok) return loi(409, giu.ma, giu.cau);
    }
    const rid = crypto.randomUUID();
    stmts.push(hoanPhanDinhStatement(db, { id: rid, orderId: r.order_id, amount, nguoiTra, vai: nguoiTra === congTyId ? "COMPANY" : "STAFF", method: b.hinhThuc, ngay: ngay.value, note: null, at, by, attributionId: attrId }));
    const dongHoan = sinhDongHoanKhach({ nguoiTraPartyId: nguoiTra, congTyId, so: amount });
    if (dongHoan.length > 0) {
      const p = crypto.randomUUID();
      stmts.push(postingIfReceiptStatement(db, { id: p, kind: "REFUND", orderId: r.order_id, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }, rid));
      for (const d of dongHoan) stmts.push(lineIfPostingStatement(db, lineOf(d, p, r.order_id, rid, at, by)));
    }
  }
  stmts.push(postingPlainStatement(db, { id: postingId, kind: "ATTRIBUTION", orderId: r.order_id, reason: ghiChu.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }));
  for (const d of dongNo(r.liable_party_id, congTyId, amount, false)) stmts.push(lineIfPostingStatement(db, lineOf(d, postingId, r.order_id, null, at, by)));
  stmts.push(auditStatement(db, { orderId: r.order_id, staffId: by, action: "attribution_posted", at, targetType: "ledger", targetId: attrId, detail: `${r.case_code} · giảm trừ ${dong(amount)}${moneyOut ? " · có trả khách" : ""}` }));
  stmts.push(...await cauTinBenChiu(db, [r.liable_party_id], congTyId, { orderId: r.order_id, by, at, detail: "Bạn được phân định chịu một khoản trên đơn" }));
  return chayLo(db, stmts, ngay.value, r.order_id);
}

async function chayLo(db: D1Database, stmts: D1PreparedStatement[], ngay: string, orderId: string): Promise<KetQua<{ orderId: string }>> {
  try {
    await db.batch(stmts);
  } catch (e) {
    const kh = await loiKhoaKy(db, e, [ngay]);
    if (kh) return kh;
    const l = loiLoGhi(e) ?? loiLoThay(e);
    if (l) return l;
    throw e;
  }
  return { ok: true, value: { orderId } };
}

/**
 * Đảo (ADR-0116 quy tắc 6b): đòi được khách ⇒ lần thu mới + đảo giảm trừ + đảo nợ trong CÙNG lô (qua lô Thay N = 0). Đảo được một phần: số ≤ số còn hiệu lực. Khác người đã phân định khoản gốc.
 * `moi` = thân khoản thu như lệnh sửa; I1 ép tổng khoản thu mới = số đảo.
 */
export async function daoKhoan(db: D1Database, input: { rootId: string; phan: PhanThuongMai | null; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.rootId)) return NOT_FOUND();
  const goc = await phanDinhTheoId(db, input.rootId);
  if (!goc || goc.step_code !== "POSTED") return NOT_FOUND();
  const dongDon = await phanDinhTheoDon(db, goc.order_id);
  if (dongDon.find((d) => d.id === goc.target_id)?.created_by === input.ai.staffId) return CUNG_NGUOI();
  const k = khoanCua(dongDon, goc);
  if (k.dangDoi) return loi(409, "stale", "Khoản này đang có một phân định đổi bên chịu chờ ghi — ghi xong rồi mới huỷ.");
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  if (so.value > k.conHieuLuc) return loi(409, "attribution_reversal_invalid", `Số huỷ vượt số còn hiệu lực của khoản (${dong(k.conHieuLuc)}).`);
  const lyDo = docLyDoDai(b.lyDo);
  if (!lyDo.ok) return lyDo;
  const ngay = await docNgayGhi(db, b.ngayPhatSinh);
  if (!ngay.ok) return ngay;
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  if (await daNopKhoan(db, goc.order_id, k.benChiu, congTyId)) return DA_NOP();
  const hh = await phaiThuHienHanh(db, goc.order_id);
  if (hh === null) return loi(409, "not_delivered", "Đơn chưa tới bước Xong và đủ tiền.");
  const thay = await chuanBiLoThay(db, { orderId: goc.order_id, phan: input.phan, raw: { cu: [], moi: b.moi, lyDo: lyDo.value, ngayPhatSinh: ngay.value, boQuaTrung: b.boQuaTrung }, ai: input.ai, phaiThuDich: hh + so.value });
  if (!thay.ok) return thay;
  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const postingId = crypto.randomUUID();
  return chayLo(db, [
    chenPhanDinhStatement(db, { id: crypto.randomUUID(), orderId: goc.order_id, buoc: "REVERSAL", targetId: goc.id, rootId: goc.id, caseCode: null, liable: k.benChiu, amount: so.value, moneyOut: 0, reason: lyDo.value, postingId, at, by }),
    ...thay.value.stmts,
    postingPlainStatement(db, { id: postingId, kind: "ATTRIBUTION", orderId: goc.order_id, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by }),
    ...dongNo(k.benChiu, congTyId, so.value, true).map((d) => lineIfPostingStatement(db, lineOf(d, postingId, goc.order_id, null, at, by))),
    auditStatement(db, { orderId: goc.order_id, staffId: by, action: "attribution_posted", at, targetType: "ledger", targetId: goc.id, detail: `huỷ khoản ${dong(so.value)} · ${lyDo.value}` }),
    ...await cauTinBenChiu(db, [k.benChiu], congTyId, { orderId: goc.order_id, by, at, detail: "Khoản bạn chịu trên đơn vừa được huỷ hoặc giảm", action: "attribution_reversed" }),
  ], ngay.value, goc.order_id);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Bên chịu phản hồi (ADR-0088 đ9 bước 3): chỉ-thêm, không chặn theo hạn
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function phanHoi(db: D1Database, input: { rootId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.rootId)) return NOT_FOUND();
  const goc = await phanDinhTheoId(db, input.rootId);
  if (!goc || goc.step_code !== "POSTED" || !input.ai.partyId) return NOT_FOUND();
  const dongDon = await phanDinhTheoDon(db, goc.order_id);
  const k = khoanCua(dongDon, goc);
  // 404 chứ không 403: người ngoài không dò được phiếu có tồn tại không.
  if (k.benChiu !== input.ai.partyId) return NOT_FOUND();
  const lyDo = docLyDo(((input.raw ?? {}) as Record<string, unknown>).noiDung, true);
  if (!lyDo.ok) return lyDo;
  const at = new Date().toISOString();
  const nguoiQuyet = dongDon.find((d) => d.id === k.cuoi.target_id)?.created_by ?? null;
  await db.batch([
    chenPhanDinhStatement(db, { id: crypto.randomUUID(), orderId: goc.order_id, buoc: "RESPONSE", targetId: goc.id, rootId: goc.id, caseCode: null, liable: null, amount: null, moneyOut: null, reason: lyDo.value, postingId: null, at, by: input.ai.staffId }),
    auditStatement(db, { orderId: goc.order_id, staffId: input.ai.staffId, action: "attribution_responded", at, ...(nguoiQuyet ? { targetType: "staff" as const, targetId: nguoiQuyet } : { targetType: "ledger" as const, targetId: goc.id }), detail: lyDo.value ?? undefined }),
  ]);
  return { ok: true, value: { orderId: goc.order_id } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export interface QuyenPhanDinh { deNghi: boolean; quyet: boolean; ghi: boolean; hoan: boolean; xemHet: boolean }

const hanPhanHoi = (ghiLuc: string): string => congNgayLamViec(vnToday(new Date(ghiLuc)), NGAY_LAM_VIEC_PHAN_HOI);

/** Phần bên chịu đã nộp. Cùng công thức với chặn đổi / huỷ. */
function daNopCua(ben: string | null, cty: string | null, dong: readonly DongGiuHo[]): number {
  if (!ben || !cty || ben === cty) return 0;
  return soDaNopKhoanPhanDinh(dong.map((l) => ({ kind: l.kind_code as "HELD", debtorPartyId: l.debtor_party_id, creditorPartyId: l.creditor_party_id, amount: l.amount })), ben, cty);
}

function dungPhieu(q: DongPhanDinh, dongDon: readonly DongPhanDinh[], ai: NguoiGoi, quyen: QuyenPhanDinh, bayGio: string, cty: string | null, giuHo: readonly DongGiuHo[], coTaiKhoan: ReadonlySet<string>): PhieuPhanDinhDto {
  const ruling = dongDon.find((d) => d.target_id === q.id && d.step_code === "RULING") ?? null;
  const goc = ruling ? dongDon.find((d) => d.target_id === ruling.id && d.step_code === "POSTED") ?? null : null;
  const k = goc ? khoanCua(dongDon, goc) : null;
  const trangThai: TrangThaiPhieu = !ruling ? "cho_phan_dinh" : !goc ? "cho_ghi" : k!.conHieuLuc > 0 ? "da_ghi" : "da_dao";
  const chuaXong = trangThai === "cho_phan_dinh" || trangThai === "cho_ghi";
  const dang = k?.dangDoi ?? null;
  const moneyOut = ruling?.money_out === 1;
  const daNop = k ? daNopCua(k.benChiu, cty, giuHo) : 0;
  // ADR-0155 Đ1.5: bên chịu hiện tại là hồ sơ không có tài khoản ĐANG HOẠT ĐỘNG (chưa có, hoặc đã ngưng — đều không nhận được tin) ⇒ không nhận được tin, không phản hồi được trên Nền tảng — văn phòng báo trực tiếp.
  const benHienTai = k ? k.benChiu : (ruling?.liable_party_id ?? null);
  const benChiuKhongTaiKhoan = benHienTai !== null && benHienTai !== cty && !coTaiKhoan.has(benHienTai);
  return {
    benChiuKhongTaiKhoan,
    id: q.id, orderId: q.order_id, maDon: q.order_code ?? "", trangThai, soTienDeNghi: q.amount ?? 0, lyDoDeNghi: q.reason ?? "", nguoiDeNghi: q.created_by_label ?? "—", luc: q.created_at,
    quaHanNhac: chuaXong && q.ngay_giao !== null && quaHanNhac(q.ngay_giao, vnToday(new Date(bayGio))),
    phanDinh: ruling ? {
      id: ruling.id, truongHop: ruling.case_code ?? "", benChiu: k?.benChiuLabel ?? ruling.liable_label ?? "—", soTien: ruling.amount ?? 0, coTienRa: moneyOut, lyDo: ruling.reason ?? "", nguoiPhanDinh: ruling.created_by_label ?? "—", luc: ruling.created_at,
    } : null,
    ghi: goc && k ? { id: goc.id, conHieuLuc: k.conHieuLuc, truongHopHienTai: k.truongHop ?? "", nguoiGhi: goc.created_by_label ?? "—", luc: goc.created_at, daNop } : null,
    t11QuaHan: k !== null && k.conHieuLuc > 0 && k.truongHop === "T11" && !dang && quaHanT11(k.ruLucPhanDinh, bayGio),
    dangDoiBenChiu: dang ? { id: dang.id, truongHop: dang.case_code ?? "", benChiu: dang.liable_label ?? "—", lyDo: dang.reason ?? "", nguoiPhanDinh: dang.created_by_label ?? "—" } : null,
    phanHoi: goc ? dongDon.filter((d) => d.root_id === goc.id && d.step_code === "RESPONSE").map((d) => ({ noiDung: d.reason ?? "", nguoi: d.created_by_label ?? "—", luc: d.created_at })) : [],
    coThePhanDinh: quyen.quyet && !ruling,
    coTheGhi: quyen.ghi && !!ruling && !goc && ruling.created_by !== ai.staffId && (!moneyOut || quyen.hoan),
    coTheGhiDoi: quyen.ghi && !!dang && dang.created_by !== ai.staffId,
    coTheDoiBenChiu: quyen.quyet && !!k && k.conHieuLuc > 0 && !dang && daNop === 0,
    coTheHuy: quyen.ghi && !!k && k.conHieuLuc > 0 && !dang && ruling?.created_by !== ai.staffId && daNop === 0,
  };
}

/** Danh sách theo người xem (đặc tả trang ghép (2)): người xem cả sổ thấy hết; còn lại thấy phiếu chờ và phiếu mình mở, mình phân định. Không tên / SĐT khách. */
export async function danhSachPhanDinh(db: D1Database, input: { ai: NguoiGoi; quyen: QuyenPhanDinh }): Promise<DanhSachPhanDinhResponse> {
  const rows = await dsPhanDinh(db);
  const bayGio = new Date().toISOString();
  const [cty, giuHo] = await Promise.all([ownerCompanyId(db), dongGiuHoCacDon(db, [...new Set(rows.filter((r) => r.step_code === "POSTED").map((r) => r.order_id))])]);
  const theoDon = new Map<string, DongPhanDinh[]>();
  for (const r of rows) theoDon.set(r.order_id, [...(theoDon.get(r.order_id) ?? []), r]);
  const coTaiKhoan = await taiKhoanDangDungCuaHoSo(db, [...new Set(rows.flatMap((r) => (r.liable_party_id ? [r.liable_party_id] : [])))]);
  const phieu = rows.filter((r) => r.step_code === "REQUEST").map((q) => dungPhieu(q, theoDon.get(q.order_id) ?? [], input.ai, input.quyen, bayGio, cty, giuHo.filter((l) => l.order_id === q.order_id), coTaiKhoan));
  const cuaMinh = (p: PhieuPhanDinhDto): boolean => {
    const ds = theoDon.get(p.orderId) ?? [];
    return ds.some((d) => (d.id === p.id || d.id === p.phanDinh?.id) && d.created_by === input.ai.staffId);
  };
  const thay = phieu.filter((p) => input.quyen.xemHet || p.trangThai === "cho_phan_dinh" || cuaMinh(p));
  thay.reverse();
  return { phieu: thay, choPhanDinh: phieu.filter((p) => p.trangThai === "cho_phan_dinh").length, choGhi: phieu.filter((p) => p.trangThai === "cho_ghi" || p.dangDoiBenChiu !== null).length };
}

/** Khoản của CHÍNH hồ sơ người xem (bên chịu): số còn hiệu lực, hạn phản hồi, các phản hồi. Không tên người phân định. */
export async function khoanCuaToi(db: D1Database, partyId: string | null): Promise<KhoanTrachNhiemDto[]> {
  if (!partyId) return [];
  const rows = await phanDinhCuaBenChiu(db, partyId);
  const theoDon = new Map<string, DongPhanDinh[]>();
  for (const r of rows) theoDon.set(r.order_id, [...(theoDon.get(r.order_id) ?? []), r]);
  const out: KhoanTrachNhiemDto[] = [];
  for (const goc of rows.filter((r) => r.step_code === "POSTED")) {
    const dongDon = theoDon.get(goc.order_id) ?? [];
    const k = khoanCua(dongDon, goc);
    if (k.benChiu !== partyId || k.conHieuLuc <= 0) continue;
    out.push({
      id: goc.id, maDon: goc.order_code ?? "", soTien: k.conHieuLuc, truongHop: k.truongHop ?? "", lyDo: k.cuoi.reason ?? "", luc: k.cuoi.created_at, hanPhanHoi: hanPhanHoi(k.cuoi.created_at),
      phanHoi: dongDon.filter((d) => d.root_id === goc.id && d.step_code === "RESPONSE").map((d) => ({ noiDung: d.reason ?? "", luc: d.created_at })),
    });
  }
  return out.reverse();
}
