// ĐIỀU CHỈNH CÔNG NỢ CẦN NGƯỜI THỨ HAI DUYỆT (ADR-0115 đợt 1; migration 0094). Đọc → luật thuần (`rules.ts`: `kiemDieuChinh` — MỘT hàm trần cộng dồn, `hetHanYeuCau`) → MỘT `db.batch()`
// mỗi lệnh (ADR-0094 V1). Lệnh `dieu_chinh` của `POST /api/ledger/adjustments` KHÔNG đổi số dư: nó tạo một YÊU CẦU CHỜ DUYỆT (bảng chỉ-thêm `bil_adjustment_request`). Chỉ lúc DUYỆT
// (người có ô `ledger.adjust.approve`, KHÁC người tạo) mới sinh phiếu ADJUSTMENT + dòng nợ — trong CÙNG lô với dòng quyết định; máy chủ kiểm lại mọi giới hạn theo số dư lúc đó, lô
// kèm lính gác CSDL cho tổng tăng nợ / số dư (hai lệnh duyệt gần nhau không cùng vượt). Hết hạn 7 ngày tính lúc đọc, không bao giờ tự duyệt.
// Route (index.ts) hỏi `can()` TRƯỚC rồi mới gọi các hàm ở đây. Không SQL thô (module nghiêm).
import { auditStatement } from "../audit";
import { phaiThuNhieuDon } from "../orders";
import type { TrangThaiYeuCauDieuChinh, YeuCauDieuChinhDto, YeuCauDieuChinhListResponse } from "../../shared/contracts";
import { UUID_RE } from "../../shared/http";
import {
  duyetChenStatement, phieuChenStatement, quyetDinhChenStatement, taiKhoanCuaHoSo, tangDaCo, tangDangCho, yeuCauChenStatement, yeuCauChoDuyet, yeuCauGanDay, yeuCauTheoId, type YeuCauDbRow,
} from "./dieu-chinh-repo";
import { lineIfPostingStatement, linesOfOrder, orderOwners, orderState, ownerCompanyId, partyLabels, receiptsOfOrder } from "./repository";
import { HAN_YEU_CAU_NGAY, LY_DO_DIEU_CHINH_TOI_THIEU, conLai, dong, hetHanYeuCau, kiemDieuChinh, soDuCap, type DebtKind } from "./rules";
import { PARTY_ID_RE, docLyDo, docNgay, docSoTien, layKyDaKhoa, lineOf, loi, loiKhoaKy, loiTrigger, toLineRow, toReceiptRow, type KetQua, type NguoiGoi } from "./service";

// Sổ đại lý đợt 2 (Task 6; ADR-0079 7b1, đặc tả P6): điều chỉnh có duyệt nhận thêm ba loại dòng thương mại — Kế toán bổ sung giá vốn / sửa hoa hồng sau «Đã giao»
// (ví dụ D-3 «đại lý → công ty 20.000 loại hoa hồng»). Cùng mọi giới hạn của `kiemDieuChinh` (không đổi dấu, trần cộng dồn), không nới.
const LOAI_DONG_NHAN: Record<DebtKind, string> = {
  HELD: "Tiền chưa nộp về công ty", SETTLEMENT: "Quyết toán (nộp / trả)", REFUND: "Hoàn khách", HOA_HONG: "Hoa hồng", GIAM_GIA_BEN_DAT: "Giảm giá bên đặt chịu", GIA_VON: "Giá vốn",
};
const LOAI_THUONG_MAI: ReadonlySet<string> = new Set<DebtKind>(["HOA_HONG", "GIAM_GIA_BEN_DAT", "GIA_VON"]);
const laLoaiDong = (x: unknown): x is DebtKind => typeof x === "string" && Object.hasOwn(LOAI_DONG_NHAN, x);
const TOI_DA_DANH_SACH = 200;
const MOT_NGAY_MS = 86_400_000;

/** Mốc tạo sớm nhất mà yêu cầu CÒN HẠN lúc `bayGio` (yêu cầu tạo từ mốc này trở đi chưa hết hạn). */
export const mocConHan = (bayGio: string): string => new Date(Date.parse(bayGio) - HAN_YEU_CAU_NGAY * MOT_NGAY_MS).toISOString();
const hetHanLuc = (taoLuc: string): string => new Date(Date.parse(taoLuc) + HAN_YEU_CAU_NGAY * MOT_NGAY_MS).toISOString();

/** Trạng thái của một yêu cầu LÚC ĐỌC: đã có quyết định thì theo quyết định; chưa có thì còn hạn hay hết hạn (ADR-0115 điều 1). */
export function trangThaiYeuCau(r: Pick<YeuCauDbRow, "created_at" | "decision_kind">, bayGio: string): TrangThaiYeuCauDieuChinh {
  if (r.decision_kind === "APPROVE") return "da_duyet";
  if (r.decision_kind === "REJECT") return "tu_choi";
  if (r.decision_kind === "WITHDRAW") return "da_rut";
  return hetHanYeuCau(r.created_at, bayGio) ? "het_han" : "cho_duyet";
}

const CAU_DA_QUYET: Record<string, string> = {
  da_duyet: "Yêu cầu này đã được duyệt.",
  tu_choi: "Yêu cầu này đã bị từ chối.",
  da_rut: "Yêu cầu này đã được người tạo rút.",
};
const CAU_HET_HAN = `Yêu cầu đã quá ${HAN_YEU_CAU_NGAY} ngày không ai duyệt nên hết hạn — người tạo tạo lại yêu cầu mới.`;
/** Trạng thái không còn quyết được → câu 409 (null = còn chờ duyệt). */
const khongQuyetDuoc = (t: TrangThaiYeuCauDieuChinh): { ok: false; res: Response } | null =>
  t === "cho_duyet" ? null : t === "het_han" ? loi(409, "adjreq_expired", CAU_HET_HAN) : loi(409, "adjreq_decided", CAU_DA_QUYET[t]!);

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Số liệu của đơn để kiểm (lúc tạo và lúc duyệt dùng CHUNG một đường đọc)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
async function kiemTheoSoLieuHienTai(
  db: D1Database,
  y: { orderId: string; benNo: string; benDuocNo: string; soTien: number; boId: string; loaiDong: string },
  bayGio: string,
): Promise<{ ok: true; kiem: Extract<ReturnType<typeof kiemDieuChinh>, { ok: true }>; dongSo: ReturnType<typeof toLineRow>[] } | { ok: false; res: Response }> {
  const [dongDon, cacLanThu, base, daCo, dangCho, congTyId] = await Promise.all([
    linesOfOrder(db, y.orderId), receiptsOfOrder(db, y.orderId), phaiThuNhieuDon(db, [y.orderId]), tangDaCo(db, y.orderId), tangDangCho(db, y.orderId, y.boId, mocConHan(bayGio)), ownerCompanyId(db),
  ]);
  // Ruling R-P15 (người kiểm Task 6): loại dòng thương mại chỉ cho đơn ĐÃ «Đã giao» — trước đó lô «Đã giao» còn tự sinh dòng gốc, điều chỉnh sớm thành TRÙNG
  // (đơn đại lý: yêu cầu hoa hồng 100.000 duyệt trước rồi «Đã giao» ⇒ Tour Đảo nợ 200.000). Kiểm ở cả lúc tạo lẫn lúc duyệt (cùng hàm này).
  if (LOAI_THUONG_MAI.has(y.loaiDong) && !(await orderState(db, y.orderId))?.delivered_at) {
    return loi(409, "commercial_before_delivered", "Đơn chưa Đã giao — chưa bổ sung được khoản này; chờ Đã giao rồi tạo yêu cầu.");
  }
  const dongSo = dongDon.map(toLineRow);
  const bo = base.get(y.orderId);
  const phaiThu = bo?.phaiThu ?? 0;
  const kiem = kiemDieuChinh({
    nguoc: soDuCap(dongSo, y.benDuocNo, y.benNo), soTien: y.soTien, phaiThu, daThu: conLai(cacLanThu.map(toReceiptRow), phaiThu, bo?.status ?? "confirmed").daThu, tangDaCo: daCo, tangDangCho: dangCho,
    quyetToanVoiCongTy: y.loaiDong === "SETTLEMENT" && (y.benNo === congTyId || y.benDuocNo === congTyId),
  });
  return kiem.ok ? { ok: true, kiem, dongSo } : loi(409, kiem.ma, kiem.cau);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Tạo yêu cầu — thay cho lệnh `dieu_chinh` ghi ngay (ADR-0092 Đ5 → ADR-0115)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
/** Thân: `{ loai: "dieu_chinh", orderId, benNo, benDuocNo, soTien, loaiDong, lyDo, ngayPhatSinh? }` — như trước; kết quả là yêu cầu CHỜ DUYỆT, số dư không đổi. */
export async function taoYeuCau(db: D1Database, input: { raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ yeuCauId: string; orderId: string }>> {
  const b = (input.raw ?? {}) as Record<string, unknown>;
  const lyDo = docLyDo(b.lyDo, true);
  if (!lyDo.ok) return lyDo;
  const ngay = docNgay(b.ngayPhatSinh, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  if (typeof b.orderId !== "string" || !UUID_RE.test(b.orderId)) return loi(400, "invalid_input", "Mã đơn không hợp lệ.");
  if (typeof b.benNo !== "string" || typeof b.benDuocNo !== "string" || !PARTY_ID_RE.test(b.benNo) || !PARTY_ID_RE.test(b.benDuocNo) || b.benNo === b.benDuocNo) {
    return loi(400, "invalid_input", "Chọn bên nợ và bên được nợ (khác nhau).");
  }
  if (!laLoaiDong(b.loaiDong)) return loi(400, "invalid_input", "Chọn loại dòng sổ.");
  const so = docSoTien(b.soTien);
  if (!so.ok) return so;
  const [ben, owners] = await Promise.all([partyLabels(db, [b.benNo, b.benDuocNo]), orderOwners(db, [b.orderId])]);
  if (!ben.get(b.benNo) || !ben.get(b.benDuocNo)) return loi(400, "invalid_input", "Không tìm thấy bên nợ / bên được nợ.");
  if (!owners.has(b.orderId)) return loi(404, "not_found", "Không tìm thấy đơn.");
  // ADR-0092 Đ5c: lý do ≥ 10 ký tự (trigger 0094 `bil_adjustment_request_reason_short` + 0082 ở phiếu).
  if ((lyDo.value ?? "").trim().length < LY_DO_DIEU_CHINH_TOI_THIEU) return loi(400, "invalid_input", `Lý do điều chỉnh tối thiểu ${LY_DO_DIEU_CHINH_TOI_THIEU} ký tự.`);
  const at = new Date().toISOString();
  const yeuCauId = crypto.randomUUID();
  const k = await kiemTheoSoLieuHienTai(db, { orderId: b.orderId, benNo: b.benNo, benDuocNo: b.benDuocNo, soTien: so.value, boId: yeuCauId, loaiDong: b.loaiDong }, at);
  if (!k.ok) return k;
  const huong = k.kiem.huong;
  try {
    await db.batch([
      yeuCauChenStatement(db, {
        id: yeuCauId, orderId: b.orderId, debtorPartyId: b.benNo, creditorPartyId: b.benDuocNo, amount: so.value, lineKind: b.loaiDong, occurredDate: ngay.value, direction: huong,
        reason: lyDo.value!, at, by: input.ai.staffId,
      }),
      auditStatement(db, {
        orderId: b.orderId, staffId: input.ai.staffId, action: "ledger_adjustment_requested", at, targetType: "ledger", targetId: yeuCauId,
        detail: `${lyDo.value} · ${huong === "INCREASE" ? "tăng nợ" : "giảm nợ"}`,
      }, "changes() > 0"),
    ]);
  } catch (e) {
    if (loiTrigger(e, "adjreq_reason_short")) return loi(400, "invalid_input", `Lý do điều chỉnh tối thiểu ${LY_DO_DIEU_CHINH_TOI_THIEU} ký tự.`);
    throw e;
  }
  return { ok: true, value: { yeuCauId, orderId: b.orderId } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Duyệt — MỘT lô: dòng quyết định (lính gác) → nhật ký → phiếu ADJUSTMENT → dòng nợ → nhật ký số dư → tin "đổi số dư của bạn"
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function duyetYeuCau(db: D1Database, input: { yeuCauId: string; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.yeuCauId)) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  const y = await yeuCauTheoId(db, input.yeuCauId);
  if (!y) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  const at = new Date().toISOString();
  const cho = khongQuyetDuoc(trangThaiYeuCau(y, at));
  if (cho) return cho;
  // Hiến chương hệ thống 4.2: người duyệt khác người tạo (so theo tài khoản). Lớp CSDL: trigger bil_adjustment_request_same_person.
  if (y.created_by === input.ai.staffId) return loi(409, "adjreq_same_person", "Bạn là người tạo yêu cầu này — cần một người khác duyệt (tách nhiệm vụ).");
  // Ngày phát sinh phải thuộc tháng còn mở LÚC DUYỆT (điều 5); lớp CSDL: trigger khoá tháng trên phiếu (0090).
  const ngay = docNgay(y.occurred_date, await layKyDaKhoa(db));
  if (!ngay.ok) return ngay;
  const k = await kiemTheoSoLieuHienTai(db, { orderId: y.order_id, benNo: y.debtor_party_id, benDuocNo: y.creditor_party_id, soTien: y.amount, boId: y.id, loaiDong: y.line_kind_code }, at);
  if (!k.ok) return k;
  // Hướng đã chốt lúc tạo không được đổi lúc duyệt: số dư về 0 giữa chừng làm một yêu cầu GIẢM nợ bị đọc thành TĂNG nợ (và trượt qua trần) hoặc ngược lại.
  if (k.kiem.huong !== y.direction) {
    return y.direction === "DECREASE"
      ? loi(409, "adjustment_flips_sign", "Khoản nợ cần giảm không còn đủ trên đơn (số dư đã đổi từ lúc gửi yêu cầu) — từ chối yêu cầu này và gửi lại nếu cần.")
      : loi(409, "stale", "Số dư của đơn đã đổi từ lúc gửi yêu cầu (nay là khoản nợ ngược chiều) — từ chối yêu cầu này và gửi lại nếu cần.");
  }
  const [congTyId, taiKhoan] = await Promise.all([ownerCompanyId(db), taiKhoanCuaHoSo(db, [y.debtor_party_id, y.creditor_party_id])]);
  // Số dư trước / sau của bên KHÔNG phải công ty chủ với bên kia (ADR-0092 Đ5d, phần nhật ký) — tính theo sổ LÚC DUYỆT.
  const benDoi = y.debtor_party_id === congTyId ? y.creditor_party_id : y.debtor_party_id;
  const benKia = benDoi === y.debtor_party_id ? y.creditor_party_id : y.debtor_party_id;
  const truoc = soDuCap(k.dongSo, benDoi, benKia);
  const sau = truoc + (benDoi === y.debtor_party_id ? y.amount : -y.amount);
  const chiTiet = `${y.reason} · số dư trước ${dong(truoc)} → sau ${dong(sau)}`;
  const quyetId = crypto.randomUUID();
  const phieuId = crypto.randomUUID();
  const by = input.ai.staffId;
  const stmts = [
    // CỔNG: dòng APPROVE (lính gác CSDL — tổng tăng nợ / số dư; trigger: hết hạn, khác người tạo). Chèn 0 dòng ⇒ các câu sau không áp.
    duyetChenStatement(db, {
      id: quyetId, orderId: y.order_id, direction: k.kiem.huong, requestId: y.id, capSnapshot: k.kiem.huong === "INCREASE" ? k.kiem.tran : null, at, by,
      tangDaCoToiDa: k.kiem.tangDaCoToiDa, soTien: y.amount, benDuocNo: y.creditor_party_id, benNo: y.debtor_party_id,
    }),
    // NHẬT KÝ ngay sau cổng; đồng thời là nguồn tin cho người tạo (khoá người nhận = người tạo).
    auditStatement(db, { orderId: y.order_id, staffId: by, action: "ledger_adjustment_approved", at, targetType: "staff", targetId: y.created_by, detail: y.reason }, "changes() > 0"),
    phieuChenStatement(db, { id: phieuId, orderId: y.order_id, reason: y.reason, occurredDate: y.occurred_date, requestId: y.id, at, by, decisionId: quyetId }),
    lineIfPostingStatement(db, lineOf({ debtorPartyId: y.debtor_party_id, creditorPartyId: y.creditor_party_id, amount: y.amount, kind: y.line_kind_code, reversesLineId: null }, phieuId, y.order_id, null, at, by)),
    // Dòng ghi SỐ DƯ trước / sau (như lệnh điều chỉnh cũ) — chỉ khi dòng nợ đã chèn.
    auditStatement(db, { orderId: y.order_id, staffId: by, action: "ledger_adjustment", at, detail: chiTiet }, "changes() > 0"),
  ];
  // Tin "điều chỉnh đổi số dư của bạn" (đóng ADR-0092 Đ5d): bên bị đổi là nhân viên có tài khoản, không phải công ty chủ, không phải người tạo (đã có tin "đã duyệt").
  const bi = [y.debtor_party_id, y.creditor_party_id].flatMap((p) => (p !== congTyId && taiKhoan.has(p) && taiKhoan.get(p) !== y.created_by ? [taiKhoan.get(p)!] : []));
  for (const nv of [...new Set(bi)]) {
    stmts.push(auditStatement(db, { orderId: y.order_id, staffId: by, action: "ledger_adjustment_affected", at, targetType: "staff", targetId: nv, detail: "Số dư của bạn trên đơn vừa được điều chỉnh" }, "changes() > 0"));
  }
  let kq: D1Result[];
  try {
    kq = await db.batch(stmts);
  } catch (e) {
    const kh = await loiKhoaKy(db, e, [y.occurred_date]);
    if (kh) return kh;
    if (loiTrigger(e, "settlement_sign_flip")) return loi(409, "adjustment_flips_sign", "Số dư của đơn vừa thay đổi nên quyết toán này sẽ làm số dư đổi dấu — tải lại, từ chối yêu cầu này và gửi lại nếu cần.");
    if (loiTrigger(e, "adjreq_expired")) return loi(409, "adjreq_expired", CAU_HET_HAN);
    if (loiTrigger(e, "adjreq_same_person")) return loi(409, "adjreq_same_person", "Bạn là người tạo yêu cầu này — cần một người khác duyệt (tách nhiệm vụ).");
    if (/UNIQUE constraint failed: bil_adjustment_request\.target_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "adjreq_decided", "Yêu cầu này vừa được người khác xử lý — tải lại.");
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) {
    // Lính gác CSDL chặn: sổ đổi giữa lúc kiểm và lúc ghi (một lệnh duyệt khác vừa ghi). Đọc lại để trả đúng câu; không còn lệch thì coi như "vừa thay đổi".
    const lai = await kiemTheoSoLieuHienTai(db, { orderId: y.order_id, benNo: y.debtor_party_id, benDuocNo: y.creditor_party_id, soTien: y.amount, boId: y.id, loaiDong: y.line_kind_code }, new Date().toISOString());
    return lai.ok ? loi(409, "stale", "Số dư của đơn vừa thay đổi — tải lại rồi duyệt lại.") : lai;
  }
  return { ok: true, value: { orderId: y.order_id } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Từ chối (lý do bắt buộc) và rút (chỉ người tạo, khi chưa ai quyết)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export async function tuChoiYeuCau(db: D1Database, input: { yeuCauId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.yeuCauId)) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  const lyDo = docLyDo(((input.raw ?? {}) as Record<string, unknown>).lyDo, true);
  if (!lyDo.ok) return lyDo;
  const y = await yeuCauTheoId(db, input.yeuCauId);
  if (!y) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  const at = new Date().toISOString();
  const cho = khongQuyetDuoc(trangThaiYeuCau(y, at));
  if (cho) return cho;
  if (y.created_by === input.ai.staffId) return loi(409, "adjreq_same_person", "Bạn là người tạo yêu cầu này — muốn bỏ thì bấm “Rút yêu cầu”.");
  try {
    await db.batch([
      quyetDinhChenStatement(db, { id: crypto.randomUUID(), kind: "REJECT", orderId: y.order_id, targetId: y.id, reason: lyDo.value, at, by: input.ai.staffId }),
      auditStatement(db, { orderId: y.order_id, staffId: input.ai.staffId, action: "ledger_adjustment_rejected", at, targetType: "staff", targetId: y.created_by, detail: lyDo.value ?? undefined }, "changes() > 0"),
    ]);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_adjustment_request\.target_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "adjreq_decided", "Yêu cầu này vừa được người khác xử lý — tải lại.");
    if (loiTrigger(e, "adjreq_same_person")) return loi(409, "adjreq_same_person", "Bạn là người tạo yêu cầu này — muốn bỏ thì bấm “Rút yêu cầu”.");
    throw e;
  }
  return { ok: true, value: { orderId: y.order_id } };
}

export async function ruYeuCau(db: D1Database, input: { yeuCauId: string; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>> {
  if (!UUID_RE.test(input.yeuCauId)) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  const y = await yeuCauTheoId(db, input.yeuCauId);
  if (!y) return loi(404, "not_found", "Không tìm thấy yêu cầu điều chỉnh.");
  if (y.created_by !== input.ai.staffId) return loi(403, "forbidden", "Chỉ người tạo mới rút được yêu cầu của mình.");
  const at = new Date().toISOString();
  const cho = khongQuyetDuoc(trangThaiYeuCau(y, at));
  if (cho) return cho;
  try {
    await db.batch([
      quyetDinhChenStatement(db, { id: crypto.randomUUID(), kind: "WITHDRAW", orderId: y.order_id, targetId: y.id, reason: null, at, by: input.ai.staffId }),
      // Khoá người nhận = ('ledger', mã yêu cầu): người có ô duyệt (đã nhận tin "có yêu cầu mới") biết yêu cầu không còn.
      auditStatement(db, { orderId: y.order_id, staffId: input.ai.staffId, action: "ledger_adjustment_withdrawn", at, targetType: "ledger", targetId: y.id }, "changes() > 0"),
    ]);
  } catch (e) {
    if (/UNIQUE constraint failed: bil_adjustment_request\.target_id/.test(e instanceof Error ? e.message : String(e))) return loi(409, "adjreq_decided", "Yêu cầu này vừa được người khác xử lý — tải lại.");
    throw e;
  }
  return { ok: true, value: { orderId: y.order_id } };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Danh sách (GET) — hai khối của màn: "Yêu cầu của tôi" (ledger.write) và "Chờ duyệt" (ledger.adjust.approve)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
export function yeuCauDto(r: YeuCauDbRow, v: { staffId: string; coTheDuyetO: boolean; coTheTaoO: boolean; bayGio: string }): YeuCauDieuChinhDto {
  const trangThai = trangThaiYeuCau(r, v.bayGio);
  const laCuaToi = r.created_by === v.staffId;
  const cho = trangThai === "cho_duyet";
  return {
    id: r.id, orderId: r.order_id, maDon: r.order_code, benNo: r.debtor_label ?? "—", benDuocNo: r.creditor_label ?? "—", soTien: r.amount, loaiDong: r.line_kind_code,
    loaiDongNhan: LOAI_DONG_NHAN[r.line_kind_code] ?? "—", ngayPhatSinh: r.occurred_date, lyDo: r.reason, huong: r.direction === "INCREASE" ? "tang" : "giam", taoLuc: r.created_at,
    hetHanLuc: hetHanLuc(r.created_at), nguoiTao: r.created_by_label ?? "—", trangThai, quyetLuc: r.decision_at, nguoiQuyet: r.decision_by_label,
    lyDoQuyet: r.decision_kind === "REJECT" ? r.decision_reason : null, laCuaToi,
    coTheDuyet: cho && v.coTheDuyetO && !laCuaToi, coTheTuChoi: cho && v.coTheDuyetO && !laCuaToi, coTheRut: cho && v.coTheTaoO && laCuaToi,
  };
}

/** `xemDayDu` = người xem có `ledger.view` không ngữ cảnh (Kế toán, Toàn quyền): thấy cả yêu cầu đã quyết. Người chỉ có ô duyệt (Quản trị) chỉ thấy yêu cầu CHỜ DUYỆT. */
export async function danhSachYeuCau(
  db: D1Database,
  v: { staffId: string; xemDayDu: boolean; coTheDuyetO: boolean; coTheTaoO: boolean },
): Promise<YeuCauDieuChinhListResponse> {
  const bayGio = new Date().toISOString();
  // Yêu cầu chờ duyệt lọc Ở SQL (không lọc sau khi cắt 200 yêu cầu mới nhất); người xem cả sổ còn có các yêu cầu đã quyết gần đây. Gộp theo mã, mới nhất trước.
  const [cho, gan] = await Promise.all([yeuCauChoDuyet(db, mocConHan(bayGio), TOI_DA_DANH_SACH), v.xemDayDu ? yeuCauGanDay(db, TOI_DA_DANH_SACH) : Promise.resolve([] as YeuCauDbRow[])]);
  const rows = [...new Map([...cho, ...gan].map((r) => [r.id, r])).values()].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const dto = rows.map((r) => yeuCauDto(r, { staffId: v.staffId, coTheDuyetO: v.coTheDuyetO, coTheTaoO: v.coTheTaoO, bayGio }));
  const hien = v.xemDayDu ? dto : dto.filter((x) => x.trangThai === "cho_duyet");
  return { yeuCau: hien, choDuyetChoToi: hien.filter((x) => x.coTheDuyet).length, xemDayDu: v.xemDayDu, coTheTao: v.coTheTaoO };
}
