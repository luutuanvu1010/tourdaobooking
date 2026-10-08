// Ánh xạ bản chụp thương mại ↔ dòng bảng ord_service_terms (đặc tả §5), dựng HAI DTO của phần thương mại (văn phòng / Đối tác), kiểm thân ghi mức tay (§6). Thuần — câu SQL ở thuong-mai-repo.ts.
// Không nhập `../pricing` bằng giá trị (index.ts của nó kéo `../audit` không đuôi — node không giải được): phép tính tiền dòng ở src/shared/hoa-hong-dong.ts (pricing tái xuất).
import type { ThuongMaiDongVanPhong, ThuongMaiResponse } from "../../shared/contracts.ts";
import { tinhDongDoiTac, type BanChup, type LyDoThieu } from "../../shared/hoa-hong-dong.ts";
import { NHAN_LY_DO_THIEU, nhanMuc, nhanTyLeBp } from "../../shared/so-dai-ly-nhan.ts";
import { hasLongDigitRun, maskLongDigits, PHONE_IN_TEXT_MESSAGE } from "../../shared/text-guards.ts";

export interface DongGhiChup {
  id: string; orderId: string; serviceId: string; beneficiaryPartyId: string | null;
  commissionStatus: "NONE" | "SET" | "MISSING"; missingReason: LyDoThieu | null; commissionKind: "RATE" | "PER_PAX" | null; rateBp: number | null; perPax: number | null; ruleId: string | null;
  supplyStatus: "SET" | "MISSING"; sellerPartyId: string | null; supplierPartyId: string | null; costRateBp: number | null; termId: string | null;
  source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null; capturedDate: string; at: string; by: string;
}
export function dongGhiTuChup(c: BanChup, v: { id: string; orderId: string; ngay: string; at: string; by: string; source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null }): DongGhiChup {
  const h = c.hoaHong;
  const cu = c.cungUng;
  return {
    id: v.id, orderId: v.orderId, serviceId: c.serviceId, beneficiaryPartyId: c.beneficiaryPartyId,
    commissionStatus: h.status, missingReason: h.status === "MISSING" ? h.reason : null,
    commissionKind: h.status === "SET" ? h.kind : null, rateBp: h.status === "SET" ? h.rateBp : null, perPax: h.status === "SET" ? h.perPax : null, ruleId: h.status === "SET" ? h.ruleId : null,
    supplyStatus: cu.status, sellerPartyId: cu.status === "SET" ? cu.sellerPartyId : null, supplierPartyId: cu.status === "SET" ? cu.supplierPartyId : null,
    costRateBp: cu.status === "SET" ? cu.costRateBp : null, termId: cu.status === "SET" ? cu.termId : null,
    source: v.source, reason: v.reason, supersedesId: v.supersedesId, capturedDate: v.ngay, at: v.at, by: v.by,
  };
}
export interface TermRowDb {
  id: string; order_service_id: string; beneficiary_party_id: string | null; commission_status: "NONE" | "SET" | "MISSING"; missing_reason: LyDoThieu | null;
  commission_kind: "RATE" | "PER_PAX" | null; commission_rate_bp: number | null; commission_per_pax: number | null; commission_rule_id: string | null;
  supply_status: "SET" | "MISSING"; seller_party_id: string | null; supplier_party_id: string | null; cost_rate_bp: number | null; supply_term_id: string | null;
  source: "AUTO" | "MANUAL"; captured_date: string;
}
export function banChupTuDb(r: TermRowDb): BanChup {
  return {
    serviceId: r.order_service_id, beneficiaryPartyId: r.beneficiary_party_id,
    hoaHong: r.commission_status === "NONE" ? { status: "NONE" } : r.commission_status === "MISSING" ? { status: "MISSING", reason: r.missing_reason! }
      : { status: "SET", kind: r.commission_kind!, rateBp: r.commission_rate_bp, perPax: r.commission_per_pax, ruleId: r.commission_rule_id },
    cungUng: r.supply_status === "SET" ? { status: "SET", termId: r.supply_term_id, sellerPartyId: r.seller_party_id!, supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp } : { status: "MISSING" },
  };
}
/** Mô tả bản chụp cho nhật ký: chỉ đếm dòng — không tỷ lệ, không tiền (nhật ký đơn đọc được ở nhiều nơi). */
export function moTaChup(chup: readonly BanChup[]): string {
  if (chup.every((c) => c.hoaHong.status === "NONE")) return "không người hưởng";
  const co = chup.filter((c) => c.hoaHong.status === "SET").length;
  return `${chup.length} dòng: ${co} có mức, ${chup.length - co} thiếu mức`;
}

// ===== Phần thương mại của đơn: hai DTO, kiểm thân ghi mức tay, áp ghi tay, mô tả nhật ký (Task 5; đặc tả §6) =====

/**
 * Một đơn đã đọc xong, CHƯA phân quyền: `phanThuongMaiCuaDon` (orders/index.ts) trả cái này; `dungThuongMai` chọn DTO theo người xem. Số tiền / số khách của dòng là
 * số HIỆN HÀNH (đã áp dòng điều chỉnh, `loadOrderView`); mức là mức ĐÃ CHỤP (A-2). Đợt 2 (billing) dùng lại.
 */
export interface PhanThuongMai {
  /** Đơn nháp: bản TÍNH THỬ theo bảng hôm nay, chưa lưu. */
  duKien: boolean;
  /** Đơn đã xác nhận mà chưa có bản chụp nào (xác nhận trước đợt 1) — mọi dòng "Đơn xác nhận trước khi có bảng mức". */
  chuaChup: boolean;
  chup: readonly BanChup[];
  dichVu: readonly { id: string; name: string; thanhTien: number; soKhachTinh: number }[];
  ten: ReadonlyMap<string, string>;
  congTyChuId: string | null;
  /** Mã dịch vụ mà bản chụp hiện hành là bản GHI TAY (cột `source = 'MANUAL'`); vắng = không dòng nào. */
  ghiTay?: ReadonlySet<string>;
}
const HO_SO_KHONG_CON = "Hồ sơ không còn";
/** Dòng của đơn xác nhận trước đợt 1 (hoặc dòng không có bản chụp): thiếu mức vì "chưa chụp" — KHÔNG bao giờ lặng lẽ 0. */
export const chuaCoBanChup = (serviceId: string): BanChup => ({ serviceId, beneficiaryPartyId: null, hoaHong: { status: "MISSING", reason: "NOT_CAPTURED" }, cungUng: { status: "MISSING" } });

/**
 * Dựng DTO phần thương mại. `laDoiTac` (= `holdsPartner(staff)`, KỂ CẢ tài khoản lai — "có quyền Đối tác là áp") → DTO HẸP: chỉ số tiền hoa hồng của mình và giá đại lý, KHÔNG tỷ lệ,
 * không đ/khách, không giá vốn, không mã nguồn (C9 = A). Hai nhánh dựng đối tượng MỚI bằng chép từng trường (danh sách trắng) — không trải `...` từ kiểu rộng. Tiền từng dòng qua
 * MỘT công thức `tinhDongDoiTac`; tổng hoa hồng / giá đại lý = null khi còn dòng thiếu mức (không cộng nửa vời, không tự lấy 0).
 */
export function dungThuongMai(v: { laDoiTac: boolean; xemNguoiBan: boolean } & PhanThuongMai): ThuongMaiResponse {
  const theoDichVu = new Map(v.chup.map((c) => [c.serviceId, c] as const));
  const dong = v.dichVu.map((dv) => {
    const c = theoDichVu.get(dv.id) ?? chuaCoBanChup(dv.id);
    return { dv, c, t: tinhDongDoiTac(c, { thanhTien: dv.thanhTien, soKhachTinh: dv.soKhachTinh }) };
  });
  const conThieu = dong.some((d) => d.t.hoaHong === null);
  const tong = {
    thanhTien: dong.reduce((s, d) => s + d.dv.thanhTien, 0),
    hoaHong: conThieu ? null : dong.reduce((s, d) => s + (d.t.hoaHong ?? 0), 0),
    giaDaiLy: conThieu ? null : dong.reduce((s, d) => s + (d.t.giaDaiLy ?? 0), 0),
  };
  if (v.laDoiTac) {
    return {
      doiTac: {
        duKien: v.duKien,
        choCongTyCaiMuc: conThieu,
        dong: dong.map((d) => ({ serviceId: d.dv.id, ten: d.dv.name, thanhTien: d.dv.thanhTien, hoaHong: d.t.hoaHong, giaDaiLy: d.t.giaDaiLy })),
        tong,
      },
    };
  }
  const nguoiHuongId = v.chup.find((c) => c.beneficiaryPartyId !== null)?.beneficiaryPartyId ?? null;
  return {
    vanPhong: {
      duKien: v.duKien,
      chuaChup: v.chuaChup,
      nguoiHuong: nguoiHuongId === null ? null : { ten: v.ten.get(nguoiHuongId) ?? HO_SO_KHONG_CON },
      dong: dong.map(({ dv, c, t }): ThuongMaiDongVanPhong => {
        const h = c.hoaHong;
        const cu = c.cungUng;
        const d: ThuongMaiDongVanPhong = {
          serviceId: dv.id, ten: dv.name, thanhTien: dv.thanhTien, soKhachTinh: dv.soKhachTinh,
          muc: h.status === "SET" ? nhanMuc({ kind: h.kind, rateBp: h.rateBp, perPax: h.perPax }) : null,
          hoaHong: t.hoaHong, giaDaiLy: t.giaDaiLy, ghiTay: v.ghiTay?.has(dv.id) ?? false,
          thieu: h.status === "MISSING" ? NHAN_LY_DO_THIEU[h.reason] : null,
          nguoiBan: cu.status === "SET" ? { ten: v.ten.get(cu.sellerPartyId) ?? HO_SO_KHONG_CON, laCongTy: v.congTyChuId !== null && cu.sellerPartyId === v.congTyChuId } : null,
        };
        // Tỷ lệ mua lại và giá vốn của nhà cung cấp: chỉ người có `supply.terms.view` (Bán hàng KHÔNG).
        if (v.xemNguoiBan && cu.status === "SET" && cu.supplierPartyId !== null && cu.costRateBp !== null && t.giaVon !== null) d.nhaCungCap = { tyLeMua: nhanTyLeBp(cu.costRateBp), giaVon: t.giaVon };
        return d;
      }),
      tong,
    },
  };
}

type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
/** Thân `POST /api/orders/:id/thuong-mai/:serviceId`: lý do bắt buộc + ít nhất một trong hai phần; phần không gửi chép từ bản hiện hành (`apGhiTay`). */
export interface ThanGhiTay {
  lyDo: string;
  hoaHong?: { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number };
  nguoiBan?: { partyId: string; tyLeMuaBp?: number };
}
const MA_HO_SO_RE = /^[A-Za-z0-9-]{1,64}$/;
const laPhanVan = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 10_000;
const coGiaTri = (x: unknown): boolean => x !== undefined && x !== null;
function docHoaHongTay(raw: unknown): Ket<NonNullable<ThanGhiTay["hoaHong"]>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Mức hoa hồng không hợp lệ." };
  const b = raw as Record<string, unknown>;
  if (b.kieu === "RATE") {
    if (coGiaTri(b.moiKhach)) return { ok: false, message: "Mức theo tỷ lệ thì không kèm số tiền mỗi khách." };
    if (!laPhanVan(b.tyLeBp)) return { ok: false, message: "Nhập tỷ lệ hoa hồng từ 0% tới 100% (tối đa hai chữ số thập phân)." };
    return { ok: true, value: { kieu: "RATE", tyLeBp: b.tyLeBp } };
  }
  if (b.kieu === "PER_PAX") {
    if (coGiaTri(b.tyLeBp)) return { ok: false, message: "Mức theo số tiền mỗi khách thì không kèm tỷ lệ." };
    if (typeof b.moiKhach !== "number" || !Number.isInteger(b.moiKhach) || b.moiKhach < 0 || b.moiKhach > 100_000_000) return { ok: false, message: "Nhập số tiền mỗi khách không âm, tối đa 100.000.000đ." };
    return { ok: true, value: { kieu: "PER_PAX", moiKhach: b.moiKhach } };
  }
  return { ok: false, message: "Chọn kiểu mức: tỷ lệ phần trăm hoặc số tiền mỗi khách." };
}
function docNguoiBanTay(raw: unknown): Ket<NonNullable<ThanGhiTay["nguoiBan"]>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Người bán không hợp lệ." };
  const b = raw as Record<string, unknown>;
  if (typeof b.partyId !== "string" || !MA_HO_SO_RE.test(b.partyId)) return { ok: false, message: "Chọn người bán." };
  if (!coGiaTri(b.tyLeMuaBp)) return { ok: true, value: { partyId: b.partyId } };
  if (!laPhanVan(b.tyLeMuaBp)) return { ok: false, message: "Tỷ lệ mua lại phải từ 0% tới 100%." };
  return { ok: true, value: { partyId: b.partyId, tyLeMuaBp: b.tyLeMuaBp } };
}
/** Kiểm DẠNG thân ghi tay (thuần, chưa biết bản chụp hay công ty chủ — việc đó của `kiemGhiTayVoiBanChup`). Lý do cắt khoảng trắng, 10–300 ký tự, không dãy số dài (khuôn `hasLongDigitRun`, Q-N). */
export function kiemThanGhiTay(raw: unknown): Ket<ThanGhiTay> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin mức cần ghi." };
  const b = raw as Record<string, unknown>;
  const lyDo = typeof b.lyDo === "string" ? b.lyDo.trim() : "";
  if (lyDo.length < 10) return { ok: false, message: "Ghi lý do (ít nhất 10 ký tự)." };
  if (lyDo.length > 300) return { ok: false, message: "Lý do tối đa 300 ký tự." };
  if (hasLongDigitRun(lyDo)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
  const than: ThanGhiTay = { lyDo };
  if (coGiaTri(b.hoaHong)) {
    const h = docHoaHongTay(b.hoaHong);
    if (!h.ok) return h;
    than.hoaHong = h.value;
  }
  if (coGiaTri(b.nguoiBan)) {
    const n = docNguoiBanTay(b.nguoiBan);
    if (!n.ok) return n;
    than.nguoiBan = n.value;
  }
  if (!than.hoaHong && !than.nguoiBan) return { ok: false, message: "Gửi ít nhất một phần: mức hoa hồng hoặc người bán." };
  return { ok: true, value: than };
}

const CAU_TY_LE_MUA_LAI = "Tour Đảo bán thì không ghi tỷ lệ mua lại; nhà cung cấp bán thì phải ghi.";
/**
 * Kiểm thân ghi tay VỚI bản chụp hiện hành và công ty chủ (thuần) — những tổ hợp mà CSDL chặn bằng CHECK (lỗi không có mã, người dùng sẽ thấy 500) phải bị chặn TRƯỚC ở đây bằng câu tiếng Việt:
* (a) hoa hồng cho đơn không có người hưởng (bản chụp `NONE`, CHECK `beneficiary_party_id` bắt buộc khi khác NONE) ⇒ 409; (b) người bán là nhà cung cấp mà thiếu a%, hoặc công ty mà có a% ⇒ 400.
 */
export function kiemGhiTayVoiBanChup(truoc: BanChup, than: ThanGhiTay, congTyChuId: string | null): { ok: true } | { ok: false; status: 400 | 409; message: string } {
  if (than.hoaHong && truoc.beneficiaryPartyId === null) return { ok: false, status: 409, message: "Đơn này không có người hưởng hoa hồng (khách lẻ hoặc bên đặt là Tour Đảo) — không ghi mức hoa hồng." };
  const nb = than.nguoiBan;
  if (nb) {
    const laCongTy = congTyChuId !== null && nb.partyId === congTyChuId;
    if (laCongTy === (nb.tyLeMuaBp !== undefined)) return { ok: false, status: 400, message: CAU_TY_LE_MUA_LAI };
  }
  return { ok: true };
}

/**
 * Bản chụp MỚI sau khi ghi tay (thuần): phần không gửi chép từ `truoc`; hoa hồng gửi lên ⇒ `SET` với `ruleId: null` (ghi tay); người bán là công ty ⇒ không nhà cung cấp, không a%, không mã
 * điều khoản; người bán khác ⇒ nhà cung cấp = người bán, a% bắt buộc. Nơi gọi đã qua `kiemGhiTayVoiBanChup` — thiếu a% ở đây là lỗi lập trình (không bao giờ tự lấy 0).
 */
export function apGhiTay(truoc: BanChup, than: ThanGhiTay, congTyChuId: string | null): BanChup {
  const h = than.hoaHong;
  const hoaHong: BanChup["hoaHong"] = !h ? truoc.hoaHong
    : h.kieu === "RATE" ? { status: "SET", kind: "RATE", rateBp: h.tyLeBp, perPax: null, ruleId: null }
    : { status: "SET", kind: "PER_PAX", rateBp: null, perPax: h.moiKhach, ruleId: null };
  const nb = than.nguoiBan;
  let cungUng: BanChup["cungUng"] = truoc.cungUng;
  if (nb) {
    if (congTyChuId !== null && nb.partyId === congTyChuId) cungUng = { status: "SET", termId: null, sellerPartyId: nb.partyId, supplierPartyId: null, costRateBp: null };
    else {
      if (nb.tyLeMuaBp === undefined) throw new Error("apGhiTay: nhà cung cấp thiếu tyLeMuaBp — phải qua kiemGhiTayVoiBanChup trước");
      cungUng = { status: "SET", termId: null, sellerPartyId: nb.partyId, supplierPartyId: nb.partyId, costRateBp: nb.tyLeMuaBp };
    }
  }
  return { serviceId: truoc.serviceId, beneficiaryPartyId: truoc.beneficiaryPartyId, hoaHong, cungUng };
}

const nhanHoaHongBan = (h: BanChup["hoaHong"]): string => (h.status === "NONE" ? "không người hưởng" : h.status === "MISSING" ? "thiếu mức" : nhanMuc({ kind: h.kind, rateBp: h.rateBp, perPax: h.perPax }));
/**
 * Dòng nhật ký `order_terms_manual` (một dòng cho một lần ghi): "Vé Hòn Tằm: thiếu mức → 15%" / "…: 10% → 15%" / "…: người bán Tour Đảo → i-resort" (nối bằng "; " khi đổi cả hai).
 * KHÔNG tiền khách, KHÔNG tỷ lệ mua lại (a% chỉ người có `supply.terms.view` được xem), KHÔNG lý do (nằm ở bản chụp). Tên hồ sơ lấy từ `ten`; thiếu thì "một hồ sơ khác".
 * Lịch sử đơn lọc bỏ dòng này khi người xem giữ quyền Đối tác.
 */
export function moTaGhiTay(truoc: BanChup, sau: BanChup, tenDichVu: string, ten: ReadonlyMap<string, string> = new Map()): string {
  const tenBen = (id: string): string => ten.get(id) ?? "một hồ sơ khác";
  const phan: string[] = [];
  const a = nhanHoaHongBan(truoc.hoaHong);
  const b = nhanHoaHongBan(sau.hoaHong);
  if (a !== b) phan.push(`${a} → ${b}`);
  const cu = truoc.cungUng;
  const moi = sau.cungUng;
  if (cu.status === "SET" && moi.status === "SET" && cu.sellerPartyId === moi.sellerPartyId) {
    if (cu.costRateBp !== moi.costRateBp) phan.push(`đổi tỷ lệ mua lại của ${tenBen(moi.sellerPartyId)}`);
  } else if (!(cu.status === "MISSING" && moi.status === "MISSING")) {
    phan.push(`người bán ${cu.status === "SET" ? tenBen(cu.sellerPartyId) : "chưa có"} → ${moi.status === "SET" ? tenBen(moi.sellerPartyId) : "chưa có"}`);
  }
  const noiDung = phan.length > 0 ? phan.join("; ") : `${sau.hoaHong.status === "SET" ? b : "giữ nguyên"} (đánh dấu ghi tay)`;
  return `${maskLongDigits(tenDichVu)}: ${noiDung}`;
}
