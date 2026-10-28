// Luật chọn thẻ "Việc của bạn" trên Trang chủ máy tính — hàm THUẦN, một nơi (chưa vẽ giao diện; web/home.ts dùng sau).
// Chỉ `web/home.ts` và bài kiểm được import tệp này: KHÔNG import từ muc-giao-dien.ts / shell.ts (gói web/orders.ts sát trần byte).
// Đợt 1: bốn vai văn phòng. Thẻ "Đề nghị chuyển khách" bỏ (đặc tả §9.3). Thẻ "Cọc cần chi hoàn" bỏ vì CHƯA có trang web nào
// dùng GET /api/ledger/coc để làm đích cho nút (nợ ở docs/BACKLOG.md). Không vẽ số giả: số lấy từ nguồn đã có.
import { vndShort } from "./money.ts";
import type { PHAM_VI_O_TRANG_CHU } from "./pham-vi-so.ts";
import { can, holdsPartner, seesAllOrders } from "./permissions.ts";
import type { PermissionHolder } from "./permissions.ts";

export type KhoaThe = "xemLai" | "dieuChinh" | "nhap" | "conThieu" | "chuaPhuTrach" | "chuyenHomNay" | "gopY" | "donCho";

/** Số đã tải; `null` = nguồn lỗi (thẻ hiện "—" + Thử lại), KHÔNG phải 0. Khoá vắng = người này không dùng nguồn đó. */
export interface NguonSo {
  /** Tổng `catalogConflict + expiringDocs` của bảng cảnh báo; KHÔNG cộng `feedbackQueue` (thẻ `gopY` đã có, tránh đếm trùng). `0` = không có việc. */
  readonly xemLai?: number | null;
  readonly dieuChinh?: number | null;
  readonly nhap?: number | null;
  readonly conThieu?: { count: number; total: number } | null;
  readonly chuaPhuTrach?: number | null;
  readonly chuyenHomNay?: number | null;
  /** Lấy từ trường `queue` của `GET /api/feedback/badge` (không phải `mine`). */
  readonly gopY?: number | null;
  /** ADR-0136 Đ9: đơn đang chờ xác nhận (`GET /api/orders/cho-xac-nhan`) — `quaHan` chỉ để cảnh báo, không tự huỷ. */
  readonly donCho?: { count: number; quaHan: number } | null;
}

export interface TheViec {
  readonly khoa: KhoaThe;
  readonly nhan: string;
  readonly so: number | null;
  readonly phu: string;
  readonly nut: string;
  readonly href: string;
  readonly tone: "xanh" | "cat";
  readonly chot: boolean;
}

const TOI_DA = 4;

/** Khoá thẻ → khoá phạm vi trong `PHAM_VI_O_TRANG_CHU` (bảng chung; CHANGE-GUIDE bẫy 59(3): ô số khác phạm vi đứng cạnh nhau phải mang nhãn "Toàn công ty" / "Của tôi"). */
export const KHOA_PHAM_VI: Readonly<Record<KhoaThe, keyof typeof PHAM_VI_O_TRANG_CHU>> = {
  xemLai: "xemLai", dieuChinh: "dieuChinh", nhap: "donNhap", conThieu: "conThieu", chuaPhuTrach: "chuaPhuTrach", chuyenHomNay: "chuyenHomNay", gopY: "gopY", donCho: "donCho",
};

interface MoTa {
  readonly khoa: KhoaThe;
  /** Càng nhỏ càng đứng trước; phụ thuộc người xem (Quản trị: điều chỉnh công nợ và đơn còn thiếu tiền xếp sau — đặc tả §9.3). */
  readonly uuTien: (who: PermissionHolder) => number;
  readonly hien: (who: PermissionHolder) => boolean;
  readonly nhan: string;
  readonly nut: (who: PermissionHolder) => string;
  readonly href: string;
  readonly tone: "xanh" | "cat";
  readonly chot: (who: PermissionHolder) => boolean;
  readonly phu: (nguon: NguonSo) => string;
}

// Mọi thẻ cần số toàn công ty (đơn, tiền, chuyến) chỉ hiện cho người xem được MỌI đơn (ô order.view = any, không ngữ cảnh).
const xemDon = (who: PermissionHolder): boolean => seesAllOrders(who);
const quanTri = (who: PermissionHolder): boolean => can(who, "admin.manage");
const khong = (): boolean => false;

/**
 * Hai ô «Của tôi» ở Trang chủ — «Doanh thu của tôi» (máy tính + điện thoại) và «Đơn nháp» (điện thoại) — chỉ đếm đơn do CHÍNH người xem lập
 * (`revenueWeek`, `countDrafts` theo `staff_id`). Ai không lập được đơn (Kế toán, Hướng dẫn viên…) thì hai số luôn 0 ⇒ không hiện (chủ chọn 28/10).
 */
export const coOSoCuaToi = (who: PermissionHolder): boolean => can(who, "order.create");

const THE: readonly MoTa[] = [
  { khoa: "xemLai", uuTien: () => 1, hien: quanTri, nhan: "Cần xem lại", nut: () => "Xem lại", href: "#dash-review", tone: "cat", chot: khong,
    phu: () => "Những điều Nền tảng đang nhắc Quản trị" },
  // ADR-0136 Đ9: người giữ ô xét duyệt — KHÔNG đòi xem được mọi đơn (hướng dẫn viên chưa phụ trách cũng kiểm vé); đứng sau "Cần xem lại" vì là việc có hạn 15 phút.
  { khoa: "donCho", uuTien: () => 1.5, hien: (w) => can(w, "order.confirm.review"), nhan: "Đơn chờ xác nhận", nut: () => "Kiểm vé", href: "/cho-xac-nhan", tone: "cat", chot: khong,
    phu: (n) => (n.donCho && n.donCho.quaHan > 0 ? `${n.donCho.quaHan} đơn quá hạn — hạn 15 phút` : "Đơn đã gửi, chờ kiểm vé") },
  { khoa: "dieuChinh", uuTien: (w) => (quanTri(w) ? 8 : 2), hien: (w) => can(w, "ledger.adjust.approve") && !holdsPartner(w), nhan: "Điều chỉnh công nợ chờ duyệt", nut: () => "Duyệt",
    href: "/dieu-chinh-cong-no", tone: "xanh", chot: khong, phu: () => "Yêu cầu đang chờ bạn duyệt" },
  // Số đơn nháp là của CHÍNH người xem (ADR-0135 Đ3: nháp là vùng riêng của người lập): nút chốt (san hô) "Xác nhận đơn" cho người xác nhận được mọi đơn; vai khác "Xem đơn nháp".
  { khoa: "nhap", uuTien: () => 3, hien: xemDon, nhan: "Đơn nháp", nut: (w) => (xacNhanDuocMoiDon(w) ? "Xác nhận đơn" : "Xem đơn nháp"), href: "/orders", tone: "xanh", chot: xacNhanDuocMoiDon,
    phu: () => "Đơn nháp của bạn, chưa xác nhận" },
  { khoa: "conThieu", uuTien: (w) => (quanTri(w) ? 9 : 4), hien: xemDon, nhan: "Đơn còn thiếu tiền", nut: (w) => (can(w, "ledger.write") ? "Ghi thu" : "Xem đơn"), href: "/orders",
    tone: "cat", chot: khong, phu: (n) => (n.conThieu ? `Còn phải thu ${vndShort(n.conThieu.total)} ₫` : "Chưa tải được số tiền còn thu") },
  { khoa: "chuaPhuTrach", uuTien: () => 5, hien: (w) => xemDon(w) && (can(w, "order.create") || quanTri(w)), nhan: "Đơn chưa có người phụ trách",
    nut: (w) => (quanTri(w) ? "Phân công" : "Nhận phụ trách"), href: "/orders", tone: "xanh", chot: khong, phu: () => "Chưa ai nhận chăm sóc khách" },
  { khoa: "chuyenHomNay", uuTien: () => 6, hien: xemDon, nhan: "Đơn đi hôm nay", nut: () => "Xem đơn", href: "#dash-today", tone: "xanh", chot: khong,
    phu: () => "Các đơn có ngày đi hôm nay" },
  { khoa: "gopY", uuTien: () => 10, hien: (w) => can(w, "feedback.triage"), nhan: "Góp ý chờ xử lý", nut: () => "Xử lý", href: "/feedback", tone: "xanh", chot: khong,
    phu: () => "Góp ý có tin mới chưa đọc" },
];

function suaDon(who: PermissionHolder): boolean {
  return can(who, "order.modify", { ownerId: who.id });
}

function xacNhanDuocMoiDon(who: PermissionHolder): boolean {
  return quanTri(who) && suaDon(who);
}

const theoUuTien = (who: PermissionHolder): MoTa[] => [...THE].sort((a, b) => a.uuTien(who) - b.uuTien(who));

/** Số của thẻ từ nguồn: `undefined` = chưa có nguồn (không thẻ); `null` = nguồn lỗi; còn lại là số thật. */
function soCua(khoa: KhoaThe, nguon: NguonSo): number | null | undefined {
  if (khoa === "donCho") return nguon.donCho === undefined ? undefined : nguon.donCho === null ? null : nguon.donCho.count;
  if (khoa === "conThieu") return nguon.conThieu === undefined ? undefined : nguon.conThieu === null ? null : nguon.conThieu.count;
  return nguon[khoa];
}

/** Chọn tối đa 4 thẻ theo ưu tiên; `conLai` = số thẻ còn việc nhưng không đủ chỗ. */
export function viecCuaBan(who: PermissionHolder, nguon: NguonSo): { the: TheViec[]; conLai: number; conLaiThe: TheViec[] } {
  const du: TheViec[] = [];
  for (const m of theoUuTien(who)) {
    if (!m.hien(who)) continue;
    const so = soCua(m.khoa, nguon);
    if (so === undefined || so === 0) continue;
    du.push({ khoa: m.khoa, nhan: m.nhan, so, phu: m.phu(nguon), nut: m.nut(who), href: m.href, tone: m.tone, chot: m.chot(who) });
  }
  return { the: du.slice(0, TOI_DA), conLai: Math.max(0, du.length - TOI_DA), conLaiThe: du.slice(TOI_DA) };
}

/** Thẻ nào người này cần tải số — để trang không gọi route thừa (nhất là route chỉ-quản-trị). */
export function nguonCanTai(who: PermissionHolder): readonly KhoaThe[] {
  return theoUuTien(who).filter((m) => m.hien(who)).map((m) => m.khoa);
}

/** Số cho thẻ `xemLai` từ bảng "Cần xem lại": dịch vụ lệch giá Sheet + giấy tờ sắp hết hạn. KHÔNG cộng góp ý (thẻ `gopY` đã có — tránh đếm trùng). Không có bảng = 0 (không việc). */
export function soXemLai(alerts: { catalogConflict: { moreCount: number } | null; expiringDocs: { count: number } | null } | null, loi = false): number | null {
  if (loi) return null; // một nguồn của bảng không tải được: "chưa biết", KHÔNG phải 0 (thẻ hiện "—" + Thử lại)
  if (!alerts) return 0;
  return (alerts.catalogConflict ? 1 + alerts.catalogConflict.moreCount : 0) + (alerts.expiringDocs ? alerts.expiringDocs.count : 0);
}

/** Dòng tóm tắt dưới lời chào khi có thẻ: "Có N việc chờ bạn — gấp nhất: <nhãn thường> (<số>)." (N gồm cả việc dồn ở "Còn N việc nữa"); số chưa tải thì bỏ phần "(số)". Không thẻ → `null` (giữ câu cũ). */
export function cauTomTatViec(the: readonly TheViec[], conLai: number): string | null {
  const dau = the[0];
  if (!dau) return null;
  return `Có ${the.length + conLai} việc chờ bạn — gấp nhất: ${dau.nhan.toLocaleLowerCase("vi-VN")}${dau.so === null ? "" : ` (${dau.so})`}.`;
}

/** Kết quả một lời gọi `Promise.allSettled` → số của thẻ: thành công → số (`undefined` = nguồn người này không dùng, thẻ vắng); lỗi → `null` (thẻ "—" + Thử lại), không bao giờ 0. */
export function soTuKetQua(r: PromiseSettledResult<number | undefined>): number | null | undefined {
  return r.status === "fulfilled" ? r.value : null;
}

/** Dòng dưới lưới thẻ khi còn việc không đủ chỗ: "Còn N việc nữa: <nhãn thường> (<số>)." — nói thẳng việc gấp nhất bị dồn (Quản trị/Toàn quyền: không khối nào bên dưới hiện nó). */
export function cauConLai(conLai: number, conLaiThe: readonly TheViec[]): string | null {
  const dau = conLaiThe[0];
  if (conLai <= 0 || !dau) return null;
  return `Còn ${conLai} việc nữa: ${dau.nhan.toLocaleLowerCase("vi-VN")}${dau.so === null ? "" : ` (${dau.so})`}.`;
}
