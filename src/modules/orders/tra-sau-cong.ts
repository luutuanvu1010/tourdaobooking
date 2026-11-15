// Cổng Trả sau của `orders` (ADR-0168 Đ2): hình thức thanh toán nằm trên đơn, còn HẠN MỨC và SỐ NỢ thuộc `billing` — `orders` chỉ nhận hàm do gốc lắp ráp tiêm vào `ctx`
// (khuôn `cocChoXacNhan`, ADR-0159). Hai cửa: `congTraSauKhiLuu` (lưu đơn — báo sớm) và `traSauChoXacNhan` (lô xác nhận — chốt thật, kèm câu gác phiên bản và hạn trả).
// KHÔNG tự kiểm quyền người gọi (route đã làm). Không nhắc bảng `bil_`, không import `billing` (bài src/architecture.test.ts, src/dat-coc-noi-goi.test.ts).
import { chanVeDaDungTrongLo, chanVeDaMoTrongLo, laLoiVeDaDungTrongLo, laLoiVeDaMoTrongLo } from "../../shared/chan-doi-tac-huy";
import { error } from "../../shared/http";
import { cauKhongTraSauChoNguoiGui, dongTien, hanTraTu, hetAnHanTu, laLoiPhienBanTraSau, ngayCuaMoc, type HinhThucThanhToan, type KetQuaKiemTraSau, type MaKhongTraSau } from "../../shared/tra-sau";

/** Phần «câu gác phiên bản và hạn trả» của lô xác nhận. Nơi gọi chỉ lấy từ `traSauChoXacNhan` (bài src/tra-sau-duong-ghi.test.ts). */
export type KemTraSau = (i: { at: string; auditId: string }) => D1PreparedStatement[];
/** Chỉ bài kiểm và đơn Trả trước (`traSauChoXacNhan`) dùng. */
export const KHONG_TRA_SAU: KemTraSau = () => [];

/** Hai hàm do gốc lắp ráp tiêm (xem `ctx.kiemTraSau`, `ctx.cauGacPhienBanTraSau` ở src/shared/router.ts). */
export interface HamTraSau {
  kiemTraSau: (i: { benDat: string; soTienDon: number; boQuaDon?: string; loai?: "sua_tang" | "doi_ben" }) => Promise<KetQuaKiemTraSau | null>;
  cauGacPhienBanTraSau: (partyId: string, version: number, at: string) => D1PreparedStatement[];
}
/**
 * ADR-0198 Đ1.4: người GỬI lệnh có phải đối tác (`laDoiTacTraSau` — giữ Đối tác, không giữ Kế toán). Đối tác bị chặn vì vượt hạn mức nhận câu không số; mã lỗi giữ nguyên.
 * Bắt buộc ở mọi cổng trả câu `vuot_han_muc` (quên truyền ⇒ typecheck đỏ).
 */
export interface NguoiGuiTraSau { nguoiGuiLaDoiTac: boolean }

export const CAU_TRA_SAU_THIEU_BEN_DAT = "Đơn trả sau cần chọn bên đặt là đối tác có hạn mức trả sau.";
/**
 * Lô huỷ phải mang câu bảo vệ «vé vừa mở» mà gốc lắp ráp không soạn được câu trả vé (`ctx.traVeKhiHuy` trả null) ⇒ không chạy lô, 503 (kế hoạch 2026-11-05 Task 5 việc B).
 * Cờ có thể đến từ người giữ quyền Đối tác (đơn Trả trước) nên câu chỉ nói chuyện vé, không nói hạn mức.
 */
export const VE_CHUA_SOAN_DUOC = () => error(503, "tra_sau_chua_dung_duoc", "Chưa kiểm được vé của đơn nên chưa huỷ được. Thử lại sau ít phút.");
const CHUA_DUNG_DUOC = () => error(503, "tra_sau_chua_dung_duoc", "Chưa kiểm được hạn mức trả sau nên chưa dùng được hình thức này — báo người phụ trách hệ thống.");

/**
 * Đơn đủ thông tin cho cổng. ADR-0197 Đ2, Đ3: đơn Trả sau NHẬN lời khai đặt cọc (bỏ 409 chặn cọc của ADR-0168); cọc ở tay Đối tác nên hạn mức kiểm trên TOÀN BỘ `total`,
 * không trừ cọc — cổng không cần biết số khai.
 */
export interface DonTraSau { id: string | null; paymentTerm: HinhThucThanhToan; bookerPartyId: string | null; total: number }

async function kiemDon(h: Pick<HamTraSau, "kiemTraSau"> & NguoiGuiTraSau, d: DonTraSau): Promise<{ loi: Response } | { benDat: string; kq: Extract<KetQuaKiemTraSau, { ok: true }> }> {
  if (d.bookerPartyId === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_TRA_SAU_THIEU_BEN_DAT) };
  const kq = await h.kiemTraSau({ benDat: d.bookerPartyId, soTienDon: d.total, ...(d.id ? { boQuaDon: d.id } : {}) });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, cauKhongTraSauChoNguoiGui(kq, h.nguoiGuiLaDoiTac)) };
  return { benDat: d.bookerPartyId, kq };
}

/** Lưu đơn (lập mới, lưu nháp): chỉ kiểm để BÁO SỚM — chốt thật ở lô xác nhận. Đơn Trả trước không tốn một câu đọc. `null` = qua. */
export async function congTraSauKhiLuu(h: Pick<HamTraSau, "kiemTraSau"> & NguoiGuiTraSau, d: DonTraSau): Promise<Response | null> {
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
export async function traSauChoXacNhan(h: HamTraSau & NguoiGuiTraSau, db: D1Database, i: { order: DonTraSau & { id: string } }): Promise<{ loi: Response } | { traSau: KemTraSau }> {
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
/** Qua cổng đổi bên đặt. `kem(at)`: câu gác phiên bản của bên đặt CŨ và bên đặt MỚI (đơn Trả sau đã xác nhận hết nợ — ADR-0188 mục 2). */
export type QuaCongDoiBen = { readonly [NHAN_DOI_BEN]: true; readonly kem: (at: string) => D1PreparedStatement[] };
/** Qua cổng sửa số khách. `kem`: câu gác phiên bản (chỉ khi đơn Trả sau đã xác nhận mà tiền TĂNG). */
export type QuaCongSuaTang = { readonly [NHAN_SUA_TANG]: true; readonly kem: D1PreparedStatement[] };
const quaHuy = (q: { chanVeDaMo: boolean; no: number; kem: (at: string) => D1PreparedStatement[] }) => ({ qua: q as QuaCongHuy });
const quaDoiBen = (kem: (at: string) => D1PreparedStatement[]) => ({ qua: { kem } as QuaCongDoiBen });
const quaSuaTang = (kem: D1PreparedStatement[]) => ({ qua: { kem } as QuaCongSuaTang });
const KHONG_CAU = (): D1PreparedStatement[] => [];

/** Hai hàm do gốc lắp ráp tiêm cho huỷ đơn, đổi bên đặt, sửa tăng (xem `ctx.traSauCuaDon`, `ctx.veDaMoCuaDon` ở src/shared/router.ts). Không tiêm ⇒ hàm trả null ⇒ cổng chặn 503 (không đoán). */
export interface HamNoTraSau {
  traSauCuaDon: (orderId: string) => Promise<{ hanTra: string | null; hetAnHan?: string | null; no: number; cocConGiu?: number; benDat?: string | null; version?: number } | null>;
  /** ADR-0175 Đ2.6: cổng huỷ Trả sau còn nợ chỉ tính vé HÃNG NGOÀI đã mở (`ctx.veHangNgoaiDaMoCuaDon`); hai luật chặn đối tác vẫn đọc `veDaMoCuaDon` (mọi loại vé). */
  veHangNgoaiDaMoCuaDon: (orderId: string) => Promise<boolean | null>;
}

/**
 * Sửa số khách (văn phòng và hướng dẫn viên — MỘT hàm `soanSuaSoKhach`): chỉ đơn Trả sau ĐÃ xác nhận mà tiền TĂNG mới qua cổng hạn mức; giảm hoặc y nguyên thì không gác.
 * Nợ mới của đơn = nợ hiện tại CỦA ĐƠN + phần tăng (Task 3, nợ 3: không coi cả tổng mới là nợ, phần đã về công ty vẫn được tính). Cổng so PHẦN TĂNG với phần hạn mức còn được dùng
 * của bên đặt (gồm cả nợ của chính đơn này), câu báo nói đúng hai số đó. Gác phiên bản bằng số `traSauCuaDon` đọc TRƯỚC khi tính nợ: có ai làm nợ đổi sau lúc đọc thì lô thua.
 */
export async function congSuaTangTraSau(
  h: HamTraSau & Pick<HamNoTraSau, "traSauCuaDon"> & NguoiGuiTraSau,
  order: { id: string; paymentTerm: HinhThucThanhToan; status: string; bookerPartyId: string | null; total: number },
  tongMoi: number,
): Promise<{ loi: Response } | { qua: QuaCongSuaTang }> {
  if (order.paymentTerm !== "CREDIT" || order.status !== "confirmed" || tongMoi <= order.total) return quaSuaTang([]);
  if (order.bookerPartyId === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_TRA_SAU_THIEU_BEN_DAT) };
  const t = await h.traSauCuaDon(order.id);
  if (!t || t.version === undefined || t.benDat !== order.bookerPartyId) return { loi: CHUA_DUNG_DUOC() };
  const kq = await h.kiemTraSau({ benDat: order.bookerPartyId, soTienDon: tongMoi - order.total, loai: "sua_tang" });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, cauKhongTraSauChoNguoiGui(kq, h.nguoiGuiLaDoiTac)) };
  return quaSuaTang(h.cauGacPhienBanTraSau(order.bookerPartyId, t.version, new Date().toISOString()));
}

export const CAU_HUY_CON_NO = (no: number): string => `Đơn trả sau còn nợ ${dongTien(no)} mà vé đã mở cho khách nên chưa huỷ được. Hãy thu đủ tiền, hoặc nhờ Kế toán xử lý.`;
/** ADR-0197 Đ4 phương án (c1), chủ duyệt 2026-11-11. */
export const CAU_HUY_CON_COC = "Đơn trả sau còn tiền cọc của khách ở tay bạn nên bạn chưa tự huỷ được. Hãy nhờ Quản trị huỷ.";
export const CAU_DOI_BEN_CON_NO = (no: number): string => `Đơn trả sau còn nợ ${dongTien(no)} nên chưa đổi được bên đặt. Hãy thu đủ tiền trước.`;

/**
 * Huỷ đơn (mọi nơi gọi `soanHuyDon`): đơn Trả sau ĐÃ xác nhận còn nợ mà đã có vé HÃNG NGOÀI mở thì 409 (ADR-0175 Đ2.6: vé Tour Đảo đã mở không tính — huỷ thì vé chết, hết nợ). Còn nợ, vé chưa mở ⇒ qua với `chanVeDaMo` (lô mang câu bảo vệ: vé mở chen giữa lúc kiểm
 * và lúc ghi làm cả lô lui — Task 2, nợ 2). Hết nợ ⇒ qua với câu gác phiên bản bên đặt (khoản thu bị đảo chen giữa làm nợ lại có thì lô thua). Đơn khác ⇒ qua, không câu nào.
 * ADR-0197 Đ4 (c1): người huỷ giữ quyền Đối tác (`laDoiTac` — cùng vị từ `holdsPartner` của lớp chặn ADR-0170) mà cọc còn ở tay người thu (`cocConGiu` > 0, billing tính bằng
 * CÙNG lượt với nợ) ⇒ 409; người của Công ty huỷ như cũ. Luật vé hãng ngoài đứng TRƯỚC. Đối tác mà không đọc được số cọc ⇒ 503 (không đoán); văn phòng không phụ thuộc số này.
 */
export async function congHuyTraSau(
  h: Pick<HamNoTraSau, "traSauCuaDon" | "veHangNgoaiDaMoCuaDon"> & Pick<HamTraSau, "cauGacPhienBanTraSau">,
  d: { id: string; paymentTerm: HinhThucThanhToan; status: string; laDoiTac: boolean },
): Promise<{ loi: Response } | { qua: QuaCongHuy }> {
  if (d.paymentTerm !== "CREDIT" || d.status !== "confirmed") return quaHuy({ chanVeDaMo: false, no: 0, kem: KHONG_CAU });
  const t = await h.traSauCuaDon(d.id);
  if (!t) return { loi: CHUA_DUNG_DUOC() };
  const mo = t.no > 0 ? await h.veHangNgoaiDaMoCuaDon(d.id) : false;
  if (mo === null) return { loi: CHUA_DUNG_DUOC() };
  if (mo) return { loi: error(409, "tra_sau_con_no_da_mo_ve", CAU_HUY_CON_NO(t.no)) };
  if (d.laDoiTac) {
    if (t.cocConGiu === undefined) return { loi: CHUA_DUNG_DUOC() };
    if (t.cocConGiu > 0) return { loi: error(409, "tra_sau_con_coc_o_doi_tac", CAU_HUY_CON_COC) };
  }
  if (t.no <= 0) {
    if (t.benDat === undefined || t.version === undefined) return { loi: CHUA_DUNG_DUOC() };
    const { benDat, version } = t;
    return quaHuy({ chanVeDaMo: false, no: 0, kem: benDat === null ? KHONG_CAU : (at) => h.cauGacPhienBanTraSau(benDat, version, at) });
  }
  return quaHuy({ chanVeDaMo: true, no: t.no, kem: KHONG_CAU });
}

/**
 * Lô huỷ thua vì câu bảo vệ «vé vừa mở» hoặc câu gác phiên bản: dịch ra câu cho người bấm. Người giữ quyền Đối tác ⇒ câu của ADR-0170 Đ3 (luật của họ rộng hơn: đã mở vé là không tự huỷ);
 * văn phòng ⇒ câu Trả sau còn nợ (cùng câu với lúc kiểm). `null` ⇒ không phải lỗi của hai câu này, nơi gọi ném tiếp.
 */
export function dichLoiLoHuy(e: unknown, qua: QuaCongHuy, laDoiTac: boolean): Response | null {
  if (laLoiVeDaDungTrongLo(e)) return chanVeDaDungTrongLo(); // ADR-0175 Đ3 mục 3: đứng trước, mọi người gọi
  if (laLoiVeDaMoTrongLo(e)) return laDoiTac || !qua.chanVeDaMo ? chanVeDaMoTrongLo() : error(409, "tra_sau_con_no_da_mo_ve", CAU_HUY_CON_NO(qua.no));
  return dichLoiTraSau(e);
}

// ADR-0188 mục 3: câu riêng của đường đổi bên đặt. KHÔNG dùng `kq.cau` của billing — câu đó bảo «chọn thanh toán ngay», việc không làm được sau xác nhận (hình thức đã khoá).
export const CAU_DOI_BEN_KHONG_HAN_MUC = "Đơn trả sau đã xác nhận chỉ đổi được sang bên đặt có hạn mức trả sau còn hiệu lực. Nhờ Quản trị hoặc Toàn quyền cấp hạn mức cho bên mới, hoặc giữ bên đặt cũ.";
export const CAU_DOI_BEN_QUA_HAN = "Bên đặt mới còn đơn trả sau quá hạn chưa thanh toán nên chưa nhận thêm đơn trả sau.";
export const CAU_DOI_BEN_KHACH_LE = "Đơn trả sau đã xác nhận phải có bên đặt là đối tác có hạn mức trả sau — không đổi sang khách lẻ được.";
/** Mã không đạt của `kiemTraSau` → câu của đường đổi bên. `vuot_han_muc` không xảy ra với `soTienDon: 0` (ADR-0188 mục 1.2); nếu có, bên mới cũng không nhận thêm được ⇒ câu a. */
const CAU_DOI_BEN: Record<MaKhongTraSau, string> = { khong_co_han_muc: CAU_DOI_BEN_KHONG_HAN_MUC, co_don_qua_han: CAU_DOI_BEN_QUA_HAN, vuot_han_muc: CAU_DOI_BEN_KHONG_HAN_MUC };

/**
 * Đổi bên đặt (mọi nơi gọi `changeBooker`): chỉ xét khi bên đặt ĐỔI THẬT, đơn Trả sau ĐÃ xác nhận. Thứ tự (ADR-0168 Đ2 mục 6, ADR-0188 mục 1): còn nợ ⇒ 409; bên mới rỗng
 * (khách lẻ) ⇒ 409 câu c; bên mới không qua cổng hạn mức (`soTienDon: 0` — đơn đã hết nợ) ⇒ 409 mã của billing, câu a / b; không kiểm được ⇒ 503.
 */
export async function congDoiBenDatTraSau(
  h: Pick<HamNoTraSau, "traSauCuaDon"> & HamTraSau,
  d: { id: string; paymentTerm: HinhThucThanhToan; status: string; doiThat: boolean; benMoi: string | null },
): Promise<{ loi: Response } | { qua: QuaCongDoiBen }> {
  if (!d.doiThat || d.paymentTerm !== "CREDIT" || d.status !== "confirmed") return quaDoiBen(KHONG_CAU);
  const t = await h.traSauCuaDon(d.id);
  if (!t || t.benDat === undefined || t.version === undefined) return { loi: CHUA_DUNG_DUOC() };
  if (t.no > 0) return { loi: error(409, "tra_sau_con_no_doi_ben_dat", CAU_DOI_BEN_CON_NO(t.no)) };
  if (d.benMoi === null) return { loi: error(409, "tra_sau_thieu_ben_dat", CAU_DOI_BEN_KHACH_LE) };
  const benMoi = d.benMoi;
  const kq = await h.kiemTraSau({ benDat: benMoi, soTienDon: 0, loai: "doi_ben" });
  if (!kq) return { loi: CHUA_DUNG_DUOC() };
  if (!kq.ok) return { loi: error(409, kq.ma, CAU_DOI_BEN[kq.ma]) };
  // Hai câu gác trong chính lô đổi (ADR-0188 mục 2): bên CŨ bằng số `traSauCuaDon` đọc trước khi tính nợ (khoản thu đảo chen giữa làm nợ lại có ⇒ lô thua, nợ không dời sang bên mới);
  // bên MỚI bằng đúng số `kiemTraSau` vừa đọc (hạn mức / nợ của bên mới đổi chen giữa ⇒ lô thua). Mỗi bên tăng đúng một phiên bản khi lô qua.
  const { benDat, version } = t;
  return quaDoiBen((at) => [...(benDat === null ? [] : h.cauGacPhienBanTraSau(benDat, version, at)), ...h.cauGacPhienBanTraSau(benMoi, kq.version, at)]);
}

/** Lô có câu gác phiên bản mà thua (có lệnh khác vừa làm tăng nợ của cùng bên đặt) ⇒ cả lô huỷ; dịch thành 409 cho mọi đường sửa. */
export function dichLoiTraSau(e: unknown): Response | null {
  return laLoiPhienBanTraSau(e) ? error(409, "credit_version_stale", "Hạn mức vừa thay đổi, mở lại đơn rồi thử lại.") : null;
}
