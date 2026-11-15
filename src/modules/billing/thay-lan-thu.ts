// "Sửa khoản thu đã ghi" (ADR-0088 đ2 — TNV-G3): Kế toán / Toàn quyền thay N khoản thu cũ bằng M khoản thu mới trong MỘT lô ghi, thứ tự cố định (A-B5c):
//   1. ghi các khoản thu mới (kèm phiếu RECEIPT + dòng giữ hộ nếu có — cùng `sinhDongLanThu` của khoản thu thường);
//   2. đảo các khoản thu cũ cùng dòng nợ còn hiệu lực của chúng (phiếu REVERSAL);
//   3. ghi phiếu đánh dấu REPLACEMENT — trigger 0135 kiểm I1 (đơn đã ở bước Đã giao: đã thu ròng = phải thu hiện hành, view v_bil_phai_thu_hien_hanh);
//   4. ghi nhật ký `changes() > 0` (số trước / sau), rồi tin báo người thu cũ và người thu mới có tài khoản (đ2 "Kiểm soát", ADR-0034 điều 1, 4).
// Ghi mới TRƯỚC, đảo SAU ⇒ không có trạng thái âm thoáng qua chạm trigger "đã thu ròng ≥ 0" (ADR-0092 Đ1). Dùng được trước Đã giao và sau Hoàn thành.
// Câu lệnh của lô do `chuanBiLoThay` dựng để lô phân định (phan-dinh.ts) gộp vào CÙNG `db.batch` — khách thật sự chưa trả (T4), đòi được khách.
import { auditStatement } from "../audit";
import { taiKhoanCuaHoSo } from "./dieu-chinh-repo";
import { UUID_RE } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";
import { NHAN_DAT_COC } from "../../shared/dat-coc-truoc";
import { CAU_CONG_TY_THU_TRUNG } from "../../shared/cong-no-dai-ly";
import { GHI_CHU_KHOAN_LOI_KHAI, transferInOf } from "./coc-repo";
import { lineIfPostingStatement, linesOfOrder, linesOfReceipt, lineReversed, orderState, ownerCompanyId, postingIfReceiptStatement, postingPlainStatement, receiptsOfOrder, reconOfOrder } from "./repository";
import type { GiaoDich } from "./ma-giao-dich";
import { conLai, dong, khoanChoXacNhan, sinhDongDao, sinhDongLanThu, type ReceiptRow, chonKhoanMangDau } from "./rules";
import type { PhanThuongMai } from "../orders";
import {
  CHUA_CO_CONG_TY, cauBoQuaTrung, cauGanMa, docGiaoDichCuaLanThu, docLanThu, docLyDo, docNgay, kiemCacMa, kiemTrungTienMat, lanThuMoiRow, layKyDaKhoa, lineOf, loi, loiKhoaKy, loiMaTrigger, loiTrigger, toDoiChieuRow, toLineRow, toReceiptRow, type KetQua,
  type LanThuHopLe, type NguoiGoi,
} from "./service";
import { phaiThuHienHanh, receiptThayDaoStatement, receiptThayMoiStatement } from "./thay-lan-thu-repo";
import { cauTangChoDon } from "./tra-sau-tang";
import { kiemNguoiThuKenh } from "./kenh-thu";

/** ADR-0088 đ2: lý do tối thiểu (ký tự, bỏ khoảng trắng hai đầu) — trigger 0083 ép cùng số. */
export const LY_DO_THAY_TOI_THIEU = 10;
const TOI_DA = 10;

/** Ngày phát sinh của lô Thay (Hiến chương 5.14, A-B12): trong tháng đang mở = tháng hiện tại giờ VN; ngày thật ghi ở ghi chú. */
export function kiemNgayThay(ngay: string, homNay: string): { ok: true } | { ok: false; cau: string } {
  const dauThang = `${homNay.slice(0, 8)}01`;
  if (ngay < dauThang || ngay > homNay) return { ok: false, cau: "Ngày phát sinh của lệnh sửa khoản thu phải trong tháng đang mở (tháng này) — ngày thật ghi ở ghi chú." };
  return { ok: true };
}

/** I1 sau khi thay (đơn đã ở bước Đã giao): đã thu ròng mới phải bằng phải thu lúc giao. */
export function kiemI1SauThay(input: { daThuTruoc: number; tongCu: number; tongMoi: number; phaiThuLucGiao: number | null }): { ok: true } | { ok: false; cau: string } {
  if (input.phaiThuLucGiao === null) return { ok: true };
  const sau = input.daThuTruoc - input.tongCu + input.tongMoi;
  if (sau !== input.phaiThuLucGiao) {
    return { ok: false, cau: `Sau khi thay, số đã thu (${dong(sau)}) phải bằng phải thu của đơn lúc xác nhận khách đã trả đủ (${dong(input.phaiThuLucGiao)}).` };
  }
  return { ok: true };
}

export interface LoThay { stmts: D1PreparedStatement[]; ngay: string; daThuSau: number }
/** Đã thu ròng sau lô Thay — để lô phân định so I1 trước khi ghi. */
export const phaiThuSauThay = (l: LoThay): number => l.daThuSau;

/**
 * `orderId` do ROUTE đọc từ thân và kiểm dạng (để đọc `phan` = phần thương mại của đơn bằng `phanThuongMaiCuaDon` SAU `can(` — sổ đại lý đợt 2 Task 5, Ruling R-22):
 * bản chụp quyết lần thu mới nào là bên đặt (`BOOKER`) / quầy nhà cung cấp (`SUPPLIER`), và trần «thu cho» nhà cung cấp.
 */
export async function ghiThayLanThu(db: D1Database, input: { orderId: string; phan: PhanThuongMai | null; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  const lo = await chuanBiLoThay(db, input);
  if (!lo.ok) return lo;
  try {
    await db.batch(lo.value.stmts);
  } catch (e) {
    const k = await loiKhoaKy(db, e, [lo.value.ngay]);
    if (k) return k;
    const l = loiLoThay(e);
    if (l) return l;
    // ADR-0182 Đ2 mục 13 (lớp CSDL): người có khoản nộp chờ của đơn không ghi «Công ty thu» — thường không tới được (lệnh này của Kế toán, khoản nộp do Đối tác ghi).
    if (loiTrigger(e, "remittance_pending_company")) return loi(409, "nop_dang_cho", CAU_CONG_TY_THU_TRUNG);
    throw e;
  }
  return { ok: true, value: { orderId: input.orderId } };
}

/** Lỗi lớp CSDL của các câu trong lô Thay (dùng chung với lô phân định) — null nếu không phải lỗi của lô Thay. */
export function loiLoThay(e: unknown): { ok: false; res: Response } | null {
  const m = loiMaTrigger(e);
  if (m) return m;
  if (/UNIQUE constraint failed: bil_(payment_receipt\.reverses_id|debt_line\.reverses_line_id)/.test(e instanceof Error ? e.message : String(e))) return loi(409, "stale", "Khoản thu cần sửa vừa bị huỷ — tải lại rồi thử lại.");
  if (loiTrigger(e, "replacement_i1")) return loi(409, "replacement_i1", "Sau khi thay, số đã thu phải bằng phải thu của đơn — số vừa thay đổi, tải lại rồi thử lại.");
  if (loiTrigger(e, "held_already_settled")) return loi(409, "held_already_settled", "Tiền của khoản thu cũ đã được ghi nộp về công ty — huỷ lần ghi nộp trước, rồi mới sửa.");
  return null;
}

/**
 * Dựng câu lệnh của lô (chưa chạy). `phaiThuDich` = phải thu mà lô phải đưa đơn tới: vắng ⇒ phải thu hiện hành; lô phân định truyền phải thu SAU khoản giảm trừ / huỷ giảm trừ của chính lô
 * (dòng chuỗi đứng TRƯỚC các câu này nên trigger đọc view đã thấy). Không chạy gì.
 */
export async function chuanBiLoThay(db: D1Database, input: { orderId: string; phan: PhanThuongMai | null; raw: unknown; ai: NguoiGoi; phaiThuDich?: number }): Promise<KetQua<LoThay>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const orderId = input.orderId;
  const cu = Array.isArray(b.cu) ? b.cu : [];
  const moiRaw = Array.isArray(b.moi) ? b.moi : [];
  // N = 0 (không khoản thu cũ) chỉ cho đơn ĐÃ Đã giao đang lệch — đường ghi bù khi mọi khoản thu đã bị đảo trước bản vá (kiểm độc lập vòng 3); I1 ép đúng số.
  if (cu.length > TOI_DA || !cu.every((x) => typeof x === "string" && UUID_RE.test(x)) || new Set(cu).size !== cu.length) {
    return loi(400, "invalid_input", `Chọn tối đa ${TOI_DA} khoản thu cần thay.`);
  }
  if (moiRaw.length < 1 || moiRaw.length > TOI_DA) return loi(400, "invalid_input", `Nhập từ 1 đến ${TOI_DA} khoản thu đúng.`);
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  if ((lyDo.value ?? "").trim().length < LY_DO_THAY_TOI_THIEU) return loi(400, "invalid_input", `Lý do sửa khoản thu đã ghi tối thiểu ${LY_DO_THAY_TOI_THIEU} ký tự.`);
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const homNay = vnToday(new Date());
  const kn = kiemNgayThay(ngay.value, homNay);
  if (!kn.ok) return loi(400, "invalid_input", kn.cau);
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const [st, receipts, hienHanh, dongDon] = await Promise.all([orderState(db, orderId), receiptsOfOrder(db, orderId), phaiThuHienHanh(db, orderId), linesOfOrder(db, orderId)]);
  const due = hienHanh === null ? null : input.phaiThuDich ?? hienHanh;
  if (!st) return loi(404, "not_found", "Không tìm thấy đơn.");
  if (cu.length === 0 && due === null) return loi(400, "invalid_input", "Đơn chưa tới bước Khách đã trả đủ — chọn khoản thu cần thay, hoặc ghi khoản thu như thường.");
  // ADR-0088 đ4 (i) + kiểm độc lập vòng 3 (CAO): khoản "Công ty thu – CK" do người khác khai còn CHỜ XÁC NHẬN thì KHÔNG đảo — dòng giữ hộ trên người khai còn
  // nguyên tới khi Kế toán xác nhận đã nhận hoặc người khai nộp (một khoản thu mới do Kế toán ghi "Công ty thu" sẽ xoá khoản người khai đang giữ).
  const choXacNhan = khoanChoXacNhan(receipts.map(toReceiptRow), dongDon.map(toLineRow), (await reconOfOrder(db, orderId)).map(toDoiChieuRow));
  if (st.status === "cancelled") return loi(409, "invalid_state", "Đơn đã huỷ — tiền của đơn huỷ đi qua “Duyệt hoàn thu trước” / “Chuyển tiền sang đơn mới”.");
  const cuRows = [];
  for (const id of cu as string[]) {
    const r = receipts.find((x) => x.id === id);
    if (!r) return loi(404, "not_found", "Không tìm thấy khoản thu cần thay trên đơn này.");
    if (r.reverses_id || receipts.some((x) => x.reverses_id === r.id)) return loi(409, "invalid_state", "Khoản thu cần sửa đã bị huỷ hoặc là một dòng huỷ.");
    if (r.kind_code !== "CUSTOMER_PAYMENT") return loi(409, "invalid_state", "Lệnh sửa khoản thu chỉ dùng cho khoản thu của khách (không cho khoản hoàn).");
    if (r.approval_id || r.transfer_of_id || (await transferInOf(db, r.id)).length > 0) return loi(409, "coc_transfer_locked", "Khoản thu thuộc lệnh chuyển tiền giữa hai đơn — không thay được.");
    if (choXacNhan.has(r.id)) {
      // Chữ chung cho mọi khoản chờ (Công ty thu, khách trả cho bên đặt / tại quầy nhà cung cấp — ADR-0132); mã lỗi giữ nguyên.
      return loi(409, "ck_cho_xac_nhan", "Khoản này đang chờ Kế toán xác nhận (“Công ty đã nhận” / “Bên kia đã nhận”) hoặc chờ người khai nộp — không thay khoản đang chờ.");
    }
    cuRows.push(r);
  }
  // ADR-0159 (K7c): sửa khoản khai đặt cọc thì khoản mới giữ dấu, chọn ở `chonKhoanMangDau`. Gõ lại đúng chữ dấu không mất gì nên không tính là gõ tay; chữ khác báo rõ ở dưới vì cột chỉ có một ô.
  const cuKhai = cuRows.filter((r) => r.note === GHI_CHU_KHOAN_LOI_KHAI).map((r) => ({ collectorPartyId: r.collector_party_id, soTien: r.amount }));
  const goDungDau = (m: unknown): boolean => { const g = (m as { ghiChu?: unknown } | null)?.ghiChu; return typeof g === "string" && (g.trim() === GHI_CHU_KHOAN_LOI_KHAI || g.trim() === NHAN_DAT_COC); }; // ADR-0197 Đ1: tên hiển thị mới cũng là «gõ đúng chữ dấu»
  const moi: { lt: LanThuHopLe; gd: GiaoDich | null }[] = [];
  const boQuaGhi: { ma: string; lyDo: string }[] = [];
  // Trần «thu cho» nhà cung cấp: lần thu cũ đang bị thay không tính; các lần thu mới ĐÃ đọc của chính lệnh này cộng dồn (đặc tả P4).
  const boQua = new Set(cu as string[]);
  const daCo: ReceiptRow[] = receipts.map(toReceiptRow);
  for (const m of moiRaw) {
    const lt = await docLanThu(db, { ...(m as object), ngayPhatSinh: ngay.value, ...(cuKhai.length > 0 && goDungDau(m) ? { ghiChu: null } : {}) }, input.ai, congTyId, { phan: input.phan, receipts: daCo, kemDaGiao: false, boQua });
    if (!lt.ok) return lt;
    // ADR-0178 Đ1 mục 2: khoản thay thế (kể cả «Ghi khoản thu đòi được» của phân định — cùng lô này) ở đơn mang dấu Tắt chỉ được là hồ sơ người lập; kiểm TRƯỚC lô.
    const kenh = await kiemNguoiThuKenh(db, orderId, lt.value.collectorPartyId);
    if (kenh) return { ok: false, res: kenh };
    daCo.push(lanThuMoiRow(lt.value, `moi-${daCo.length}`));
    // ADR-0092 Đ6a: khoản thu tiền mặt giống nhau — so với khoản còn hiệu lực trừ khoản đang bị thay, và các khoản đã đọc của chính lệnh này.
    const trung = kiemTrungTienMat({ receipts, boQua, moiDaDoc: moi.map((x) => x.lt), lt: lt.value, ai: input.ai, raw: b.boQuaTrung });
    if (!trung.ok) return trung;
    if (trung.value && !boQuaGhi.length) boQuaGhi.push(trung.value);
    const gd = docGiaoDichCuaLanThu(m, lt.value, input.ai);
    if (!gd.ok) return gd;
    moi.push({ lt: lt.value, gd: gd.value });
  }
  const mangDau = chonKhoanMangDau(moi.map((m) => ({ collectorPartyId: m.lt.collectorPartyId, soTien: m.lt.soTien })), cuKhai);
  if ([...mangDau].some((i) => moi[i]!.lt.ghiChu)) return loi(400, "invalid_input", "Khoản này là số đặt cọc đối tác khai nên giữ ghi chú riêng, không ghi chú thêm được. Hãy bỏ ghi chú và viết nội dung vào lý do sửa.");
  // ADR-0092 Đ6 (đặc tả §5 "Trong lô Thay"): máy chủ kiểm khi khoản thu cũ CÒN hiệu lực ⇒ loại các khoản thu trong `cu` khỏi kiểm trùng / lệch / tổng.
  const ganMa = moi.flatMap((m) => (m.gd ? [{ gd: m.gd, orderId, soTien: m.lt.soTien }] : []));
  if (ganMa.length > 0) {
    const k = await kiemCacMa(db, ganMa, new Set(cuRows.map((r) => r.id)), b.boQuaTrung);
    if (!k.ok) return k;
    if (k.value) boQuaGhi.push(k.value);
  }
  const daThuTruoc = conLai(receipts.map(toReceiptRow), 0, st.status).daThu;
  const tongCu = cuRows.reduce((s, r) => s + r.amount, 0);
  const tongMoi = moi.reduce((s, m) => s + m.lt.soTien, 0);
  const i1 = kiemI1SauThay({ daThuTruoc, tongCu, tongMoi, phaiThuLucGiao: due });
  if (!i1.ok) return loi(409, "replacement_i1", i1.cau);

  const at = new Date().toISOString();
  const by = input.ai.staffId;
  const markerId = crypto.randomUUID();
  const stage = due === null ? "PREPAID" : "AT_DELIVERY";
  const stmts: D1PreparedStatement[] = [];
  // 1. khoản thu mới (+ phiếu RECEIPT + dòng giữ hộ)
  const ridMoi: string[] = [];
  for (const [i, { lt: m }] of moi.entries()) {
    const rid = crypto.randomUUID();
    ridMoi.push(rid);
    stmts.push(receiptThayMoiStatement(db, {
      id: rid, orderId, amount: m.soTien, collectorPartyId: m.collectorPartyId, collectorRole: m.collectorRole, method: m.hinhThuc, stage, occurredDate: ngay.value,
      note: mangDau.has(i) ? GHI_CHU_KHOAN_LOI_KHAI : m.ghiChu, at, by, replacementId: markerId, collectedForPartyId: m.collectedForPartyId,
    }));
    const dongMoi = sinhDongLanThu({
      kind: "CUSTOMER_PAYMENT", amount: m.soTien, collectorRole: m.collectorRole, collectorPartyId: m.collectorPartyId, method: m.hinhThuc, nguoiGhiPartyId: input.ai.partyId ?? congTyId,
      nguoiGhiLaKeToan: input.ai.laKeToan, congTyId,
    });
    if (dongMoi.length > 0) {
      const p = crypto.randomUUID();
      stmts.push(postingIfReceiptStatement(db, { id: p, kind: "RECEIPT", orderId, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by, ghiTien: input.ai.ghiTien }, rid));
      for (const d of dongMoi) stmts.push(lineIfPostingStatement(db, lineOf(d, p, orderId, rid, at, by)));
    }
  }
  // 2. đảo khoản thu cũ (dòng đảo khoản thu TRƯỚC dòng đảo giữ hộ — trigger ADR-0092 Đ4 / 0082)
  for (const r of cuRows) {
    stmts.push(receiptThayDaoStatement(db, { id: crypto.randomUUID(), occurredDate: ngay.value, note: lyDo.value, at, by, reversesId: r.id, replacementId: markerId }));
    const song = [];
    for (const l of await linesOfReceipt(db, r.id)) if (l.reverses_line_id === null && !(await lineReversed(db, l.id))) song.push(l);
    if (song.length > 0) {
      const p = crypto.randomUUID();
      stmts.push(postingPlainStatement(db, { id: p, kind: "REVERSAL", orderId, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by, ghiTien: input.ai.ghiTien }));
      for (const l of song) stmts.push(lineIfPostingStatement(db, lineOf(sinhDongDao(toLineRow(l)), p, orderId, r.id, at, by)));
    }
  }
  // 2b. ADR-0092 Đ6: dòng nối mã của khoản thu MỚI — SAU dòng đảo (khoản thu cũ đã rơi khỏi hieuLuc ⇒ dùng lại cùng mã không bị luật trùng chặn), TRƯỚC phiếu
  // đánh dấu (trigger 0088 (f) đòi mã khi phiếu chèn).
  moi.forEach((m, i) => {
    if (m.gd) stmts.push(...cauGanMa(db, { receiptId: ridMoi[i]!, orderId, gd: m.gd, at, by }));
  });
  // 3. phiếu đánh dấu (trigger kiểm I1) — 4. nhật ký (chỉ khi phiếu đã chèn)
  stmts.push(postingPlainStatement(db, { id: markerId, kind: "REPLACEMENT", orderId, reason: lyDo.value, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by, ghiTien: input.ai.ghiTien }));
  // Đổi người thu (vd nhân viên → Công ty) xoá khoản người cũ đang giữ — ghi rõ trong nhật ký để Kế toán xem lại (kiểm độc lập vòng 3).
  const nguoiCu = new Set(cuRows.map((r) => r.collector_party_id));
  const doiNguoi = moi.some((m) => !nguoiCu.has(m.lt.collectorPartyId));
  const chiTiet = `thay ${cuRows.length} khoản thu (${dong(tongCu)}) bằng ${moi.length} khoản thu (${dong(tongMoi)}) · đã thu trước ${dong(daThuTruoc)} → sau ${dong(daThuTruoc - tongCu + tongMoi)}${doiNguoi && cuRows.length > 0 ? " · đổi người thu tiền" : ""} · ${lyDo.value ?? ""}`;
  stmts.push(auditStatement(db, { orderId, staffId: by, action: "ledger_receipt_replaced", at, detail: chiTiet }, "changes() > 0"));
  for (const bq of boQuaGhi) stmts.push(cauBoQuaTrung(db, { orderId, by, at, boQua: bq }));
  // ADR-0088 đ2 "Kiểm soát": người thu cũ và người thu mới có tài khoản đều nhận tin. Không gửi cho công ty, không gửi cho chính người đang làm. Tin không kèm số tiền, tên khách.
  const nguoiThu = [...new Set([...cuRows.map((r) => r.collector_party_id), ...moi.map((m) => m.lt.collectorPartyId)])].filter((x): x is string => !!x && x !== congTyId);
  const taiKhoan = await taiKhoanCuaHoSo(db, nguoiThu);
  for (const nv of new Set(nguoiThu.flatMap((p) => (taiKhoan.has(p) && taiKhoan.get(p) !== by ? [taiKhoan.get(p)!] : [])))) {
    stmts.push(auditStatement(db, { orderId, staffId: by, action: "ledger_receipt_collector_changed", at, targetType: "staff", targetId: nv, detail: "Khoản thu có bạn là người thu tiền vừa được sửa" }));
  }
  stmts.push(...(await cauTangChoDon(db, orderId, at))); // ADR-0168 Đ2 mục 4–5: sửa khoản thu KHÔNG bị chặn nhưng có thể làm nợ tăng ⇒ tăng phiên bản (chỉ đơn Trả sau)
  return { ok: true, value: { stmts, ngay: ngay.value, daThuSau: daThuTruoc - tongCu + tongMoi } };
}
