// Luật chọn thẻ "Việc của bạn" trên Trang chủ máy tính — hàm THUẦN, một nơi (chưa vẽ giao diện; web/home.ts dùng sau).
// Chỉ `web/home.ts` và bài kiểm được import tệp này: KHÔNG import từ muc-giao-dien.ts / shell.ts (gói web/orders.ts sát trần byte).
// Đợt 1: bốn vai văn phòng. Thẻ "Đề nghị chuyển khách" bỏ (đặc tả §9.3). Thẻ "Cọc cần chi hoàn" bỏ vì CHƯA có trang web nào
// dùng GET /api/ledger/coc để làm đích cho nút (nợ ở docs/BACKLOG.md). Không vẽ số giả: số lấy từ nguồn đã có.
import { vndShort } from "./money.ts";
import { can } from "./permissions.ts";
import type { PermissionHolder } from "./permissions.ts";

export type KhoaThe = "xemLai" | "dieuChinh" | "nhap" | "conThieu" | "chuaPhuTrach" | "chuyenHomNay" | "gopY";

/** Số đã tải; `null` = nguồn lỗi (thẻ hiện "—" + Thử lại), KHÔNG phải 0. Khoá vắng = người này không dùng nguồn đó. */
export interface NguonSo {
  readonly xemLai?: number | null;
  readonly dieuChinh?: number | null;
  readonly nhap?: number | null;
  readonly conThieu?: { count: number; total: number } | null;
  readonly chuaPhuTrach?: number | null;
  readonly chuyenHomNay?: number | null;
  readonly gopY?: number | null;
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

interface MoTa {
  readonly khoa: KhoaThe;
  readonly uuTien: number;
  readonly hien: (who: PermissionHolder) => boolean;
  readonly nhan: string;
  readonly nut: (who: PermissionHolder) => string;
  readonly href: string;
  readonly tone: "xanh" | "cat";
  readonly chot: boolean;
  readonly phu: (nguon: NguonSo) => string;
}

// Cả bốn vai văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền) xem được mọi đơn: dùng ô order.view.
const xemDon = (who: PermissionHolder): boolean => can(who, "order.view");

const THE: readonly MoTa[] = [
  { khoa: "xemLai", uuTien: 1, hien: (w) => can(w, "admin.manage"), nhan: "Cần xem lại", nut: () => "Xem lại", href: "#dash-review", tone: "cat", chot: false,
    phu: () => "Những điều Nền tảng đang nhắc Quản trị" },
  { khoa: "dieuChinh", uuTien: 2, hien: (w) => can(w, "ledger.adjust.approve"), nhan: "Điều chỉnh công nợ chờ duyệt", nut: () => "Duyệt", href: "/dieu-chinh-cong-no", tone: "xanh", chot: false,
    phu: () => "Yêu cầu đang chờ bạn duyệt" },
  { khoa: "nhap", uuTien: 3, hien: xemDon, nhan: "Đơn nháp", nut: () => "Xác nhận đơn", href: "/orders?status=draft", tone: "xanh", chot: true,
    phu: () => "Đơn còn ở trạng thái nháp, chưa xác nhận" },
  { khoa: "conThieu", uuTien: 4, hien: xemDon, nhan: "Đơn còn thiếu tiền", nut: () => "Ghi thu", href: "/orders", tone: "cat", chot: false,
    phu: (n) => (n.conThieu ? `Còn phải thu ${vndShort(n.conThieu.total)}` : "Chưa tải được số tiền còn thu") },
  { khoa: "chuaPhuTrach", uuTien: 5, hien: (w) => can(w, "order.create") || can(w, "admin.manage"), nhan: "Đơn chưa có người phụ trách",
    nut: (w) => (can(w, "admin.manage") ? "Phân công" : "Nhận phụ trách"), href: "/orders", tone: "xanh", chot: false,
    phu: () => "Chưa ai nhận chăm sóc khách" },
  { khoa: "chuyenHomNay", uuTien: 7, hien: xemDon, nhan: "Chuyến hôm nay", nut: () => "Xem chuyến", href: "#dash-today", tone: "xanh", chot: false,
    phu: () => "Các chuyến có ngày đi hôm nay" },
  { khoa: "gopY", uuTien: 8, hien: (w) => can(w, "feedback.triage"), nhan: "Góp ý chờ xử lý", nut: () => "Xử lý", href: "/feedback", tone: "xanh", chot: false,
    phu: () => "Góp ý từ nhân viên chưa được trả lời" },
];

/** Số của thẻ từ nguồn: `undefined` = chưa có nguồn (không thẻ); `null` = nguồn lỗi; còn lại là số thật. */
function soCua(khoa: KhoaThe, nguon: NguonSo): number | null | undefined {
  if (khoa === "conThieu") return nguon.conThieu === undefined ? undefined : nguon.conThieu === null ? null : nguon.conThieu.count;
  return nguon[khoa];
}

/** Chọn tối đa 4 thẻ theo ưu tiên; `conLai` = số thẻ còn việc nhưng không đủ chỗ. */
export function viecCuaBan(who: PermissionHolder, nguon: NguonSo): { the: TheViec[]; conLai: number } {
  const du: TheViec[] = [];
  for (const m of [...THE].sort((a, b) => a.uuTien - b.uuTien)) {
    if (!m.hien(who)) continue;
    const so = soCua(m.khoa, nguon);
    if (so === undefined || so === 0) continue;
    du.push({ khoa: m.khoa, nhan: m.nhan, so, phu: m.phu(nguon), nut: m.nut(who), href: m.href, tone: m.tone, chot: m.chot });
  }
  return { the: du.slice(0, TOI_DA), conLai: Math.max(0, du.length - TOI_DA) };
}

/** Thẻ nào người này cần tải số — để trang không gọi route thừa (nhất là route chỉ-quản-trị). */
export function nguonCanTai(who: PermissionHolder): readonly KhoaThe[] {
  return [...THE].sort((a, b) => a.uuTien - b.uuTien).filter((m) => m.hien(who)).map((m) => m.khoa);
}
