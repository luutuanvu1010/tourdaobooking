// KHOẢN NỘP của đại lý theo từng đơn (ADR-0182 phần B, accepted 2026-11-13 — Đ2 mục 4–13). Phần điều phối của billing; route ở index.ts hỏi `can(` và vị từ «đơn có phiếu»
// (`coPhieuNopTien`, src/shared/cong-no-dai-ly.ts) TRƯỚC khi gọi tới đây. Số tiền chỉ tính ở máy chủ, từ phần «Công nợ đại lý» (cong-no-dai-ly.ts) — không công thức thứ hai.
//
// Cách ghi sổ (b1), Đ2 mục 9:
//   ghi    — MỘT lô: khoản nộp CHỜ (câu ĐẦU, lính gác đơn đã xác nhận + chưa «Khách đã trả đủ» khi có khoản thu kèm) → khoản «Khách đã trả bạn X ₫» đi ĐÚNG đường «Tôi thu»
//            (`docLanThu` / `cauLanThu`, người thu = chính đại lý, BOOKER, HELD ngay, lính gác `receiptWithRemittanceStatement` = «chưa Khách đã trả đủ» + khoản nộp của lô đã chèn) khi X > 0 → dòng ảnh biên lai → nhật ký;
//            đặt kho ảnh SAU lô (kho-bien-lai.ts, không ném).
//   xác nhận — Kế toán / Toàn quyền KHÁC người ghi: kiểm lại trần (Đ2 mục 13) → MỘT lô: phiếu SETTLEMENT (chỉ khi khoản còn chờ) → dòng `sinhDongQuyetToan` (đúng hàm của quyết toán
//            «nộp») → khoản sang CONFIRMED trỏ phiếu → nhật ký. Trigger `settlement_exceeds_held` / `settlement_sign_flip` vẫn canh.
//   từ chối — có lý do; không dòng sổ nào; khoản «Khách đã trả bạn» ghi kèm VẪN GIỮ.
import { auditStatement } from "../audit";
import type { PhanThuongMai, ThongTinGiaoDon } from "../orders";
import type { KhoanNopDto } from "../../shared/contracts";
import { vnToday } from "../../shared/vn-date";
import { CAU_BIEN_LAI_QUA_CO, kiemBienLai, trangThaiBienLai } from "../../shared/bien-lai";
import { CAU_PHIEU_CHUA_XAC_NHAN, tranNop, TEN_KHOAN_NOP } from "../../shared/cong-no-dai-ly";
import { bamSha256, taoKhoaNgauNhien, TEP_MOI_GIO } from "../../shared/tep-dinh-kem";
import { dauCuaSoBienLai, KHO_BIEN_LAI_CHUA_BAT } from "./bien-lai";
import { phieuCongNoCuaDon, type PhieuCongNo } from "./cong-no-dai-ly";
import { BANG_NOP, datBienLai } from "./kho-bien-lai";
import { kiemNguoiThuKenh } from "./kenh-thu";
import {
  chenAnhNopStatement, chenNopStatement, demAnhNopGanDay, nopCuaDon, nopTheoId, trangThaiAnhNop, tuChoiNopStatement, xacNhanNopStatement, type NopRow,
} from "./khoan-nop-repo";
import {
  lineIfPostingStatement, linesOfOrder, ownerCompanyId, postingIfRemittancePendingStatement, receiptWithRemittanceStatement, receiptsOfOrder,
} from "./repository";
import { kiemQuyetToan, sinhDongQuyetToan, soDuCap } from "./rules";
import {
  CHUA_CO_CONG_TY, MAX_SO_TIEN, cauLanThu, docLanThu, docLyDo, lineOf, loi, loiKhoaKy, loiTrigger, tienNhieuDon, toLineRow, toReceiptRow, type KetQua, type NguoiGoi,
} from "./service";

const dong = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Đơn của lệnh (route đọc sau `can(`). `bookerPartyId` từ view công bố `v_ord_order_booker`. */
export interface DonNop { id: string; maDon: string; status: ThongTinGiaoDon["status"]; deliveredAt: string | null; bookerPartyId: string | null }

const CHUA_XAC_NHAN = () => loi(409, "phieu_requires_confirmed", CAU_PHIEU_CHUA_XAC_NHAN);
const KHONG_PHAI_DAI_LY = () => loi(409, "khong_phai_don_dai_ly", "Đơn này không phải đơn đại lý, không có phiếu công nợ.");
const DANG_CHO = () => loi(409, "nop_dang_cho", "Đơn này đã có khoản nộp đang chờ Kế toán xác nhận. Chờ Kế toán xác nhận hoặc từ chối khoản đó rồi mới gửi khoản mới.");
const STALE = () => loi(409, "stale", "Số tiền của đơn vừa thay đổi — tải lại phiếu rồi gửi lại.");
const BIEN_LAI_BAT_BUOC = () => loi(400, "bien_lai_required", "Chọn ảnh biên lai chuyển khoản trước khi gửi.");
const QUA_TRAN_ANH = () => loi(429, "rate_limited", "Chưa gửi được: bạn đã gửi quá 20 ảnh biên lai trong một giờ. Chờ khoảng một giờ rồi gửi lại.");

/** Số của phiếu kèm phần khoản nộp — MỘT lượt đọc dùng cho phiếu (route receipt), lệnh ghi và lệnh xác nhận. `null` = không phải đơn đại lý. */
export interface SoNop {
  phieu: PhieuCongNo;
  hanTra: string | null;
  khoan: NopRow[];
  /** Tổng khoản nộp đang chờ (mỗi đơn tối đa một). */
  nopCho: number;
  /** Trần khoản nộp mới = số trên QR (Đ2 mục 4, 7 — `tranNop`). */
  tran: number;
  /** X của dòng «Khách đã trả bạn X ₫» (Đ2 mục 9): phải thu bán lẻ − mọi khoản thu đang hiệu lực (kể cả khoản chờ đối chiếu, kể cả khách trả thẳng Công ty). */
  khachDaTra: number;
}
export async function soNopCuaDon(db: D1Database, d: { id: string; bookerPartyId: string | null; status: string }): Promise<SoNop | null> {
  const [so, khoan, tien] = await Promise.all([phieuCongNoCuaDon(db, { id: d.id, booker_party_id: d.bookerPartyId, status: d.status }), nopCuaDon(db, d.id), tienNhieuDon(db, [d.id])]);
  if (!so) return null;
  const nopCho = khoan.filter((k) => k.status_code === "PENDING").reduce((s, k) => s + k.amount, 0);
  return {
    phieu: so.phieu, hanTra: so.hanTra, khoan, nopCho,
    tran: tranNop({ conLai: so.phieu.conLai, nopCho, congTyCho: so.phieu.congTyCho }),
    khachDaTra: Math.max(0, tien.get(d.id)?.conLai ?? 0),
  };
}

/** DTO các khoản nộp của một đơn (người xem giữ ô `dai-ly.nop.xem` — route quyết). Không khoá kho, không băm; `laNguoiGhi` để giao diện ẩn nút xác nhận (máy chủ vẫn chặn). */
export async function khoanNopDto(db: D1Database, khoan: readonly NopRow[], staffId: string): Promise<KhoanNopDto[]> {
  const anh = new Map((await trangThaiAnhNop(db, khoan.map((k) => k.id))).map((a) => [a.remittance_id, trangThaiBienLai(a)]));
  return khoan.map((k) => ({
    id: k.id, soTien: k.amount, ngayChuyen: k.transfer_date, trangThai: k.status_code, lyDoTuChoi: k.reject_reason, ghiLuc: k.created_at, quyetLuc: k.decided_at,
    bienLai: anh.get(k.id) ?? "CHUA_CO", laNguoiGhi: k.created_by === staffId,
  }));
}

/**
 * Ghi khoản nộp (Đ2 mục 4, 5, 9, 13). Route đã kiểm: ô `dai-ly.nop.ghi`, vị từ «đơn có phiếu» với người PHIÊN, cỡ thân. Thân: `{ soTien, ngayChuyen, khachDaTra, bienLai: { noiDung } }`.
 * `khachDaTra` là số X trình duyệt đã thấy — máy chủ tính lại, lệch ⇒ 409 (không nhận số X do người dùng tự gõ).
 */
export async function ghiKhoanNop(
  db: D1Database, input: { don: DonNop; phan: PhanThuongMai | null; raw: unknown; ai: NguoiGoi; kho?: R2Bucket },
): Promise<KetQua<{ id: string; bienLaiChuaTaiXong: boolean }>> {
  const { don, ai } = input;
  if (don.status !== "confirmed") return CHUA_XAC_NHAN();
  const b = (input.raw && typeof input.raw === "object" && !Array.isArray(input.raw) ? input.raw : {}) as Record<string, unknown>;
  const soTien = b.soTien;
  if (typeof soTien !== "number" || !Number.isInteger(soTien) || soTien <= 0 || soTien > MAX_SO_TIEN) return loi(400, "invalid_input", "Số tiền phải là số nguyên dương (đồng).");
  const homNay = vnToday(new Date());
  if (typeof b.ngayChuyen !== "string" || !NGAY_RE.test(b.ngayChuyen) || Number.isNaN(Date.parse(`${b.ngayChuyen}T00:00:00Z`))) return loi(400, "invalid_input", "Chọn ngày chuyển tiền.");
  if (b.ngayChuyen > homNay) return loi(400, "invalid_input", "Ngày chuyển tiền không được sau hôm nay.");
  const khachDaTra = b.khachDaTra;
  if (typeof khachDaTra !== "number" || !Number.isInteger(khachDaTra) || khachDaTra < 0) return loi(400, "invalid_input", "Thiếu số tiền khách đã trả bạn — tải lại phiếu rồi gửi lại.");
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const so = await soNopCuaDon(db, { id: don.id, bookerPartyId: don.bookerPartyId, status: don.status });
  if (!so) return KHONG_PHAI_DAI_LY();
  if (so.nopCho > 0) return DANG_CHO();
  if (soTien > so.tran) {
    return so.tran === 0
      ? loi(409, "nop_vuot_tran", so.phieu.congTyCho > 0 ? "Đơn đang có khoản «Công ty thu» chờ Kế toán xác nhận, chưa ghi thêm khoản nộp được." : "Đơn này không còn công nợ để nộp.")
      : loi(409, "nop_vuot_tran", `Số tiền vượt số còn phải nộp của đơn (còn ${dong(so.tran)}).`);
  }
  const X = don.deliveredAt ? 0 : so.khachDaTra;
  if (khachDaTra !== X) return STALE();
  // Khoản «Khách đã trả bạn X ₫» — ĐÚNG đường «Tôi thu» của tài khoản Đối tác (`ben_dat` tự ghi ⇒ BOOKER, HELD ngay, không dấu chờ). Hình thức «Khác»: đại lý không khai cách khách trả
  // (giả định của người thi công, ghi ở nhật ký thi công). Kiểm cùng cổng công tắc ADR-0178 Đ1 như lệnh ghi khoản thu.
  let lt: Awaited<ReturnType<typeof docLanThu>> | null = null;
  if (X > 0) {
    lt = await docLanThu(db, { soTien: X, hinhThuc: "OTHER", nguoiThu: "ben_dat" }, ai, congTyId, { phan: input.phan, receipts: (await receiptsOfOrder(db, don.id)).map(toReceiptRow), kemDaGiao: false });
    if (!lt.ok) return lt;
    const kenh = await kiemNguoiThuKenh(db, don.id, lt.value.collectorPartyId);
    if (kenh) return { ok: false, res: kenh };
  }
  // Ảnh biên lai BẮT BUỘC (Đ2 mục 4, 5 — khuôn ADR-0196): kiểm chữ ký thật / cỡ, kho, trần giờ TRƯỚC lô.
  const k = kiemBienLai(b.bienLai);
  if (!k.ok) return loi(k.status, k.code, k.status === 413 ? CAU_BIEN_LAI_QUA_CO : k.message);
  if (!k.tep) return BIEN_LAI_BAT_BUOC();
  if (!input.kho) return KHO_BIEN_LAI_CHUA_BAT();
  const now = new Date();
  if ((await demAnhNopGanDay(db, ai.staffId, dauCuaSoBienLai(now))) >= TEP_MOI_GIO) return QUA_TRAN_ANH();
  const at = now.toISOString();
  const id = crypto.randomUUID();
  const anhId = crypto.randomUUID();
  const key = taoKhoaNgauNhien("nop");
  const bam = await bamSha256(k.tep.bytes);
  if (!ai.partyId) return KHONG_PHAI_DAI_LY();
  const stmts: D1PreparedStatement[] = [chenNopStatement(db, { id, orderId: don.id, partyId: ai.partyId, soTien, ngayChuyen: b.ngayChuyen, by: ai.staffId, at, coThuKem: X > 0 })];
  if (lt?.ok) {
    stmts.push(...cauLanThu(db, { orderId: don.id, lt: lt.value, stage: "PREPAID", ai, congTyId, at, nhatKy: { staffId: ai.staffId, detail: `ghi kèm ${TEN_KHOAN_NOP.toLowerCase()} · ${dong(X)}` } }, (r) => receiptWithRemittanceStatement(db, r, id)));
  }
  const viTriAnh = stmts.length;
  stmts.push(
    chenAnhNopStatement(db, { id: anhId, remittanceId: id, key, loai: k.tep.loai, kichThuoc: k.tep.bytes.length, bam, by: ai.staffId, at }),
    auditStatement(db, { orderId: don.id, staffId: ai.staffId, action: "agent_remittance_recorded", at, detail: `${TEN_KHOAN_NOP.toLowerCase()} ${dong(soTien)} · ngày chuyển ${b.ngayChuyen} · ảnh ${anhId.slice(0, 8)}` }, "changes() > 0"),
  );
  let kq: D1Result[];
  try {
    kq = await db.batch(stmts);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: bil_agent_remittance\.order_id/.test(m)) return DANG_CHO();
    const khoa = await loiKhoaKy(db, e, [homNay]);
    if (khoa) return khoa;
    if (/\bproof_rate_limited:/.test(m)) return QUA_TRAN_ANH();
    if (/\bproof_(author_mismatch|no_replace):/.test(m)) return STALE();
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return loi(409, "stale", "Đơn vừa đổi trạng thái — tải lại phiếu.");
  // Khoản nộp đã chèn: câu khoản thu kèm có cùng lính gác «chưa Khách đã trả đủ» nên không thể thua riêng. Dòng ảnh không chèn (lưới phòng) ⇒ báo «chưa tải xong», không 5xx.
  if ((kq[viTriAnh]!.meta.changes ?? 0) === 0) return { ok: true, value: { id, bienLaiChuaTaiXong: true } };
  const daLuu = await datBienLai(db, input.kho, { receiptId: id, anhId, bytes: k.tep.bytes, loai: k.tep.loai, luc: () => new Date().toISOString() }, BANG_NOP);
  return { ok: true, value: { id, bienLaiChuaTaiXong: !daLuu } };
}

const DA_QUYET = () => loi(409, "nop_da_quyet", "Khoản nộp này đã được xác nhận hoặc từ chối.");
const KHONG_THAY = () => loi(404, "not_found", "Không tìm thấy khoản nộp này.");

/**
 * Kế toán xác nhận khoản nộp (Đ2 mục 8, 9, 13). Route đã kiểm ô `dai-ly.nop.xac-nhan`. Kiểm lại TẠI LÚC XÁC NHẬN: người quyết ≠ người ghi; đơn chưa huỷ; không còn khoản «Công ty thu»
 * chờ đối chiếu; số ≤ Công nợ còn lại; số ≤ số dư đại lý đang giữ ở đơn (`kiemQuyetToan` — đúng hàm của quyết toán «nộp»). Vượt / còn chờ ⇒ 409, khoản vẫn chờ.
 */
export async function xacNhanKhoanNop(db: D1Database, input: { don: DonNop; nopId: string; ai: NguoiGoi }): Promise<KetQua<null>> {
  const { don, ai } = input;
  const nop = await nopTheoId(db, don.id, input.nopId);
  if (!nop) return KHONG_THAY();
  if (nop.status_code !== "PENDING") return DA_QUYET();
  if (nop.created_by === ai.staffId) return loi(409, "tach_nguoi", "Người ghi khoản nộp không tự xác nhận được — cần một Kế toán khác.");
  if (don.status === "cancelled") return loi(409, "don_da_huy", "Đơn đã huỷ — từ chối khoản nộp này kèm lý do.");
  const congTyId = await ownerCompanyId(db);
  if (!congTyId) return CHUA_CO_CONG_TY();
  const so = await soNopCuaDon(db, { id: don.id, bookerPartyId: don.bookerPartyId, status: don.status });
  if (!so) return KHONG_PHAI_DAI_LY();
  if (so.phieu.congTyCho > 0) {
    return loi(409, "con_cong_ty_cho", "Đơn còn khoản «Công ty thu» đang chờ đối chiếu. Xử lý khoản đó trước, hoặc từ chối khoản nộp này kèm lý do.");
  }
  if (nop.amount > so.phieu.conLai) {
    return loi(409, "nop_vuot_cong_no", `Khoản nộp ${dong(nop.amount)} vượt Công nợ còn lại của đơn (${dong(Math.max(0, so.phieu.conLai))}). Từ chối khoản này kèm lý do, hoặc dùng điều chỉnh có duyệt.`);
  }
  const lines = (await linesOfOrder(db, don.id)).map(toLineRow);
  const kt = kiemQuyetToan({ chieu: "nop", soDu: soDuCap(lines, nop.agent_party_id, congTyId), soTien: nop.amount, maDon: don.maDon });
  if (!kt.ok) return loi(409, kt.ma, kt.cau);
  const at = new Date().toISOString();
  const postingId = crypto.randomUUID();
  const drafts = sinhDongQuyetToan({ nguoiNopPartyId: nop.agent_party_id, congTyId, phanBo: [{ orderId: don.id, amount: nop.amount }] });
  const stmts = [
    postingIfRemittancePendingStatement(db, { id: postingId, kind: "SETTLEMENT", orderId: don.id, reason: null, reversesPostingId: null, occurredDate: nop.transfer_date, dueSnapshot: null, at, by: ai.staffId, ghiTien: ai.ghiTien }, nop.id),
    ...drafts.map((d) => lineIfPostingStatement(db, lineOf(d, postingId, d.orderId, null, at, ai.staffId))),
    xacNhanNopStatement(db, { id: nop.id, postingId, at, by: ai.staffId }),
    auditStatement(db, { orderId: don.id, staffId: ai.staffId, action: "agent_remittance_confirmed", at, detail: `${TEN_KHOAN_NOP.toLowerCase()} ${dong(nop.amount)}` }, "changes() > 0"),
  ];
  let kq: D1Result[];
  try {
    kq = await db.batch(stmts);
  } catch (e) {
    const khoa = await loiKhoaKy(db, e, [nop.transfer_date]);
    if (khoa) return khoa;
    if (loiTrigger(e, "settlement_sign_flip") || loiTrigger(e, "settlement_exceeds_held")) return loi(409, "stale", "Số tiền đại lý đang giữ ở đơn vừa thay đổi — tải lại rồi thử lại.");
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return DA_QUYET();
  return { ok: true, value: null };
}

/** Kế toán từ chối khoản nộp, BẮT BUỘC lý do (Đ2 mục 8). Không dòng sổ; khoản «Khách đã trả bạn» ghi kèm giữ nguyên. Người quyết ≠ người ghi (CHECK của bảng là lớp sau). */
export async function tuChoiKhoanNop(db: D1Database, input: { don: DonNop; nopId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<null>> {
  const nop = await nopTheoId(db, input.don.id, input.nopId);
  if (!nop) return KHONG_THAY();
  if (nop.status_code !== "PENDING") return DA_QUYET();
  if (nop.created_by === input.ai.staffId) return loi(409, "tach_nguoi", "Người ghi khoản nộp không tự từ chối được — cần một Kế toán khác.");
  const lyDo = docLyDo((input.raw as { lyDo?: unknown } | null | undefined)?.lyDo, true);
  if (!lyDo.ok) return lyDo;
  if ((lyDo.value ?? "").length < 5) return loi(400, "invalid_input", "Lý do từ chối cần ít nhất 5 ký tự để đại lý hiểu.");
  const at = new Date().toISOString();
  const kq = await db.batch([
    tuChoiNopStatement(db, { id: nop.id, lyDo: lyDo.value!, at, by: input.ai.staffId }),
    auditStatement(db, { orderId: input.don.id, staffId: input.ai.staffId, action: "agent_remittance_rejected", at, detail: `${TEN_KHOAN_NOP.toLowerCase()} ${dong(nop.amount)} · ${lyDo.value!.slice(0, 200)}` }, "changes() > 0"),
  ]);
  if ((kq[0]!.meta.changes ?? 0) === 0) return DA_QUYET();
  return { ok: true, value: null };
}
