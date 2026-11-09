// Cổng Trả sau của `orders` (ADR-0168 Đ2): hình thức thanh toán nằm trên đơn, còn HẠN MỨC và SỐ NỢ thuộc `billing` — `orders` chỉ nhận hàm do gốc lắp ráp tiêm vào `ctx`
// (khuôn `cocChoXacNhan`, ADR-0159). Hai cửa: `congTraSauKhiLuu` (lưu đơn — báo sớm) và `traSauChoXacNhan` (lô xác nhận — chốt thật, kèm câu gác phiên bản và hạn trả).
// KHÔNG tự kiểm quyền người gọi (route đã làm). Không nhắc bảng `bil_`, không import `billing` (bài src/architecture.test.ts, src/dat-coc-noi-goi.test.ts).
import { chanVeDaMoTrongLo, laLoiVeDaMoTrongLo } from "../../shared/chan-doi-tac-huy";
import { error } from "../../shared/http";
import { dongTien, hanTraTu, hetAnHanTu, ngayCuaMoc, type HinhThucThanhToan, type KetQuaKiemTraSau } from "../../shared/tra-sau";

/** Phần «câu gác phiên bản và hạn trả» của lô xác nhận. Nơi gọi chỉ lấy từ `traSauChoXacNhan` (bài src/tra-sau-duong-ghi.test.ts). */
export type KemTraSau = (i: { at: string; auditId: string }) => D1PreparedStatement[];
/** Chỉ bài kiểm và đơn Trả trước (`traSauChoXacNhan`) dùng. */
export const KHONG_TRA_SAU: KemTraSau = () => [];

/** Hai hàm do gốc lắp ráp tiêm (xem `ctx.kiemTraSau`, `ctx.cauGacPhienBanTraSau` ở src/shared/router.ts). */
export interface HamTraSau {
  kiemTraSau: (i: { benDat: string; soTienDon: number; boQuaDon?: string; loai?: "sua_tang" }) => Promise<KetQuaKiemTraSau | null>;
  cauGacPhienBanTraSau: (partyId: string, version: number, at: string) => D1PreparedStatement[];
}

export const CAU_TRA_SAU_KHONG_COC = "Đơn trả sau không nhận tiền khách đặt cọc trước. Hãy để trống ô đặt cọc hoặc chọn thanh toán ngay.";
export const CAU_TRA_SAU_THIEU_BEN_DAT = "Đơn trả sau cần chọn bên đặt là đối tác có hạn mức trả sau.";
/**
 * Lô huỷ phải mang câu bảo vệ «vé vừa mở» mà gốc lắp ráp không soạn được câu trả vé (`ctx.traVeKhiHuy` trả null) ⇒ không chạy lô, 503 (kế hoạch 2026-11-05 Task 5 việc B).
 * Cờ có thể đến từ người giữ quyền Đối tác (đơn Trả trước) nên câu chỉ nói chuyện vé, không nói hạn mức.
 */
export const VE_CHUA_SOAN_DUOC = () => error(503, "tra_sau_chua_dung_duoc", "Chưa kiểm được vé của đơn nên chưa huỷ được. Thử lại sau ít phút.");
const CHUA_DUNG_DUOC = () => error(503, "tra_sau_chua_dung_duoc", "Chưa kiểm được hạn mức trả sau nên chưa dùng được hình thức này — báo người phụ trách hệ thống.");

/** Đơn đủ thông tin cho cổng. `declaredDeposit` là số SẼ LƯU / đang lưu của lời khai đặt cọc. */
export interface DonTraSau { id: string | null; paymentTerm: HinhThucThanhToan; bookerPartyId: string | null; total: number; declaredDeposit: number }

async function kiemDon(h: Pick<HamTraSau, "kiemTraSau">, d: DonTraSau): Promise<{ loi: Response } | { benDat: string; kq: Extract<KetQuaKiemTraSau, { ok: true }> }> {
  if (d.declaredDeposit > 0) return { loi: error(409, "tra_sau_khong_nhan_coc", CAU_TRA_SAU_KHONG_COC) };
  if (d.bookerPartyId === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_TRA_SAU_THIEU_BEN_DAT) };
  const kq = await h.kiemTraSau({ benDat: d.bookerPartyId, soTienDon: d.total, ...(d.id ? { boQuaDon: d.id } : {}) });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, kq.cau) };
  return { benDat: d.bookerPartyId, kq };
}

/** Lưu đơn (lập mới, lưu nháp): chỉ kiểm để BÁO SỚM — chốt thật ở lô xác nhận. Đơn Trả trước không tốn một câu đọc. `null` = qua. */
export async function congTraSauKhiLuu(h: Pick<HamTraSau, "kiemTraSau">, d: DonTraSau): Promise<Response | null> {
  if (d.paymentTerm !== "CREDIT") return null;
  const r = await kiemDon(h, d);
  return "loi" in r ? r.loi : null;
}

/**
 * Xác nhận đơn: cổng hạn mức + câu của lô. Đơn Trả trước ⇒ `KHONG_TRA_SAU` (không câu nào, lô không đổi một câu). Đơn Trả sau ⇒ kiểm lại hạn mức NGAY LÚC XÁC NHẬN rồi trả câu:
 * gác phiên bản của bên đặt (đã đọc trước khi tính nợ — hai lệnh cùng lúc chỉ một lệnh qua, lệnh thua cả lô huỷ `credit_version_stale`) và chụp HAI MỐC GIỜ (ADR-0172 Đ3 mục 2):
 * hạn trả = `at` của CHÍNH lô (bằng `confirmed_at`) + thời hạn trả; hết ân hạn = hạn trả + ân hạn. Cột ngày cũ `credit_due_date` vẫn ghi (ngày VN của hạn trả) để lùi bản an toàn.
 * Chỉ ghi khi dòng nhật ký `confirmed` của CHÍNH lô đã ghi (lính gác `auditId`, khuôn câu khoản thu đặt cọc).
 */
export async function traSauChoXacNhan(h: HamTraSau, db: D1Database, i: { order: DonTraSau & { id: string } }): Promise<{ loi: Response } | { traSau: KemTraSau }> {
  if (i.order.paymentTerm !== "CREDIT") return { traSau: KHONG_TRA_SAU };
  const r = await kiemDon(h, i.order);
  if ("loi" in r) return r;
  const { gioTra, gioAnHan } = r.kq.hanMuc;
  return {
    traSau: ({ at, auditId }) => {
      const han = hanTraTu(at, gioTra);
      return [
        ...h.cauGacPhienBanTraSau(r.benDat, r.kq.version, at),
        db.prepare(
          "UPDATE orders SET credit_due_at = ?1, credit_grace_until = ?2, credit_due_date = ?3 WHERE id = ?4 AND payment_term = 'CREDIT' AND EXISTS (SELECT 1 FROM audit_log WHERE id = ?5)",
        ).bind(han, hetAnHanTu(han, gioAnHan), ngayCuaMoc(han), i.order.id, auditId),
      ];
    },
  };
}

// ---- Đường làm TĂNG hoặc TRƯỢT nợ sau xác nhận (ADR-0168 Đ2 mục 5–6, Đ3 mục 3; kế hoạch 2026-11-05 Task 2, 3) --------------------------------------------------------------
//
// BA KIỂU MANG NHÃN (`unique symbol` chỉ khai trong tệp này): `QuaCongHuy`, `QuaCongDoiBen`, `QuaCongSuaTang`. Hàm soạn câu ghi (`soanHuyDon`, `changeBooker`, `insertMoneyAdjustment`)
// BẮT BUỘC nhận kiểu tương ứng, mà chỉ cổng ở đây tạo được giá trị mang nhãn ⇒ quên gọi cổng thì `npm run typecheck` đỏ. GIỚI HẠN: chặn NHẦM / QUÊN, không chặn ép kiểu `as` cố ý
// (docs/SO-HANG-RAO.md). Không nhãn nào mở thêm quyền: kết quả cổng chỉ mang câu gác của chính lô.
declare const NHAN_HUY: unique symbol;
declare const NHAN_DOI_BEN: unique symbol;
declare const NHAN_SUA_TANG: unique symbol;
/** Qua cổng huỷ. `chanVeDaMo`: lô huỷ phải mang câu bảo vệ «vé vừa mở» (đơn Trả sau còn nợ, vé CHƯA mở lúc kiểm); `no` để dịch lỗi câu bảo vệ; `kem(at)`: câu gác phiên bản bên đặt (khi hết nợ lúc kiểm). */
export type QuaCongHuy = { readonly [NHAN_HUY]: true; readonly chanVeDaMo: boolean; readonly no: number; readonly kem: (at: string) => D1PreparedStatement[] };
/** Qua cổng đổi bên đặt. `kem(at)`: câu gác phiên bản của bên đặt CŨ (đơn Trả sau đã xác nhận hết nợ). */
export type QuaCongDoiBen = { readonly [NHAN_DOI_BEN]: true; readonly kem: (at: string) => D1PreparedStatement[] };
/** Qua cổng sửa số khách. `kem`: câu gác phiên bản (chỉ khi đơn Trả sau đã xác nhận mà tiền TĂNG). */
export type QuaCongSuaTang = { readonly [NHAN_SUA_TANG]: true; readonly kem: D1PreparedStatement[] };
const quaHuy = (q: { chanVeDaMo: boolean; no: number; kem: (at: string) => D1PreparedStatement[] }) => ({ qua: q as QuaCongHuy });
const quaDoiBen = (kem: (at: string) => D1PreparedStatement[]) => ({ qua: { kem } as QuaCongDoiBen });
const quaSuaTang = (kem: D1PreparedStatement[]) => ({ qua: { kem } as QuaCongSuaTang });
const KHONG_CAU = (): D1PreparedStatement[] => [];

/** Hai hàm do gốc lắp ráp tiêm cho huỷ đơn, đổi bên đặt, sửa tăng (xem `ctx.traSauCuaDon`, `ctx.veDaMoCuaDon` ở src/shared/router.ts). Không tiêm ⇒ hàm trả null ⇒ cổng chặn 503 (không đoán). */
export interface HamNoTraSau {
  traSauCuaDon: (orderId: string) => Promise<{ hanTra: string | null; hetAnHan?: string | null; no: number; benDat?: string | null; version?: number } | null>;
  /** ADR-0175 Đ2.6: cổng huỷ Trả sau còn nợ chỉ tính vé HÃNG NGOÀI đã mở (`ctx.veHangNgoaiDaMoCuaDon`); hai luật chặn đối tác vẫn đọc `veDaMoCuaDon` (mọi loại vé). */
  veHangNgoaiDaMoCuaDon: (orderId: string) => Promise<boolean | null>;
}

/**
 * Sửa số khách (văn phòng và hướng dẫn viên — MỘT hàm `soanSuaSoKhach`): chỉ đơn Trả sau ĐÃ xác nhận mà tiền TĂNG mới qua cổng hạn mức; giảm hoặc y nguyên thì không gác.
 * Nợ mới của đơn = nợ hiện tại CỦA ĐƠN + phần tăng (Task 3, nợ 3: không coi cả tổng mới là nợ, phần đã về công ty vẫn được tính). Cổng so PHẦN TĂNG với phần hạn mức còn được dùng
 * của bên đặt (gồm cả nợ của chính đơn này), câu báo nói đúng hai số đó. Gác phiên bản bằng số `traSauCuaDon` đọc TRƯỚC khi tính nợ: có ai làm nợ đổi sau lúc đọc thì lô thua.
 */
export async function congSuaTangTraSau(
  h: HamTraSau & Pick<HamNoTraSau, "traSauCuaDon">,
  order: { id: string; paymentTerm: HinhThucThanhToan; status: string; bookerPartyId: string | null; total: number },
  tongMoi: number,
): Promise<{ loi: Response } | { qua: QuaCongSuaTang }> {
  if (order.paymentTerm !== "CREDIT" || order.status !== "confirmed" || tongMoi <= order.total) return quaSuaTang([]);
  if (order.bookerPartyId === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_TRA_SAU_THIEU_BEN_DAT) };
  const t = await h.traSauCuaDon(order.id);
  if (!t || t.version === undefined || t.benDat !== order.bookerPartyId) return { loi: CHUA_DUNG_DUOC() };
  const kq = await h.kiemTraSau({ benDat: order.bookerPartyId, soTienDon: tongMoi - order.total, loai: "sua_tang" });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, kq.cau) };
  return quaSuaTang(h.cauGacPhienBanTraSau(order.bookerPartyId, t.version, new Date().toISOString()));
}

export const CAU_HUY_CON_NO = (no: number): string => `Đơn trả sau còn nợ ${dongTien(no)} mà vé đã mở cho khách nên chưa huỷ được. Hãy thu đủ tiền, hoặc nhờ Kế toán xử lý.`;
export const CAU_DOI_BEN_CON_NO = (no: number): string => `Đơn trả sau còn nợ ${dongTien(no)} nên chưa đổi được bên đặt. Hãy thu đủ tiền trước.`;

/**
 * Huỷ đơn (mọi nơi gọi `soanHuyDon`): đơn Trả sau ĐÃ xác nhận còn nợ mà đã có vé HÃNG NGOÀI mở thì 409 (ADR-0175 Đ2.6: vé Tour Đảo đã mở không tính — huỷ thì vé chết, hết nợ). Còn nợ, vé chưa mở ⇒ qua với `chanVeDaMo` (lô mang câu bảo vệ: vé mở chen giữa lúc kiểm
 * và lúc ghi làm cả lô lui — Task 2, nợ 2). Hết nợ ⇒ qua với câu gác phiên bản bên đặt (khoản thu bị đảo chen giữa làm nợ lại có thì lô thua). Đơn khác ⇒ qua, không câu nào.
 */
export async function congHuyTraSau(
  h: Pick<HamNoTraSau, "traSauCuaDon" | "veHangNgoaiDaMoCuaDon"> & Pick<HamTraSau, "cauGacPhienBanTraSau">,
  d: { id: string; paymentTerm: HinhThucThanhToan; status: string },
): Promise<{ loi: Response } | { qua: QuaCongHuy }> {
  if (d.paymentTerm !== "CREDIT" || d.status !== "confirmed") return quaHuy({ chanVeDaMo: false, no: 0, kem: KHONG_CAU });
  const t = await h.traSauCuaDon(d.id);
  if (!t) return { loi: CHUA_DUNG_DUOC() };
  if (t.no <= 0) {
    if (t.benDat === undefined || t.version === undefined) return { loi: CHUA_DUNG_DUOC() };
    const { benDat, version } = t;
    return quaHuy({ chanVeDaMo: false, no: 0, kem: benDat === null ? KHONG_CAU : (at) => h.cauGacPhienBanTraSau(benDat, version, at) });
  }
  const mo = await h.veHangNgoaiDaMoCuaDon(d.id);
  if (mo === null) return { loi: CHUA_DUNG_DUOC() };
  if (mo) return { loi: error(409, "tra_sau_con_no_da_mo_ve", CAU_HUY_CON_NO(t.no)) };
  return quaHuy({ chanVeDaMo: true, no: t.no, kem: KHONG_CAU });
}

/**
 * Lô huỷ thua vì câu bảo vệ «vé vừa mở» hoặc câu gác phiên bản: dịch ra câu cho người bấm. Người giữ quyền Đối tác ⇒ câu của ADR-0170 Đ3 (luật của họ rộng hơn: đã mở vé là không tự huỷ);
 * văn phòng ⇒ câu Trả sau còn nợ (cùng câu với lúc kiểm). `null` ⇒ không phải lỗi của hai câu này, nơi gọi ném tiếp.
 */
export function dichLoiLoHuy(e: unknown, qua: QuaCongHuy, laDoiTac: boolean): Response | null {
  if (laLoiVeDaMoTrongLo(e)) return laDoiTac || !qua.chanVeDaMo ? chanVeDaMoTrongLo() : error(409, "tra_sau_con_no_da_mo_ve", CAU_HUY_CON_NO(qua.no));
  return dichLoiTraSau(e);
}

/** Đổi bên đặt (mọi nơi gọi `changeBooker`): đơn Trả sau ĐÃ xác nhận còn nợ thì 409; chỉ xét khi bên đặt ĐỔI THẬT. */
export async function congDoiBenDatTraSau(
  h: Pick<HamNoTraSau, "traSauCuaDon"> & Pick<HamTraSau, "cauGacPhienBanTraSau">,
  d: { id: string; paymentTerm: HinhThucThanhToan; status: string; doiThat: boolean },
): Promise<{ loi: Response } | { qua: QuaCongDoiBen }> {
  if (!d.doiThat || d.paymentTerm !== "CREDIT" || d.status !== "confirmed") return quaDoiBen(KHONG_CAU);
  const t = await h.traSauCuaDon(d.id);
  if (!t || t.benDat === undefined || t.version === undefined) return { loi: CHUA_DUNG_DUOC() };
  if (t.no > 0) return { loi: error(409, "tra_sau_con_no_doi_ben_dat", CAU_DOI_BEN_CON_NO(t.no)) };
  // Hết nợ lúc kiểm: gác phiên bản của bên đặt CŨ trong chính lô đổi — khoản thu đảo chen giữa (làm nợ lại có) thì lô thua cả lô, nợ không dời sang bên mới.
  const { benDat, version } = t;
  return quaDoiBen(benDat === null ? KHONG_CAU : (at) => h.cauGacPhienBanTraSau(benDat, version, at));
}

/** Lô có câu gác phiên bản mà thua (có lệnh khác vừa làm tăng nợ của cùng bên đặt) ⇒ cả lô huỷ; dịch thành 409 cho mọi đường sửa. */
export function dichLoiTraSau(e: unknown): Response | null {
  const loi = e instanceof Error ? e.message : String(e);
  return /\bcredit_version_stale:/.test(loi) ? error(409, "credit_version_stale", "Hạn mức vừa thay đổi, mở lại đơn rồi thử lại.") : null;
}
