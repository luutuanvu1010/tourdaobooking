// Bộ lọc danh sách đơn nhiều điều kiện chọn đồng thời (góp ý T4 / YC-0008, YC-0012 — kế hoạch docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md §7.2).
// Đọc tham số của `GET /api/orders` thành một bộ lọc đã kiểm; máy chủ AND bộ lọc này với PHẠM VI XEM của vai (route quyết phạm vi, không phải ở đây).
//  - `tu` / `den`: khoảng NGÀY ĐI (YYYY-MM-DD, ngày dân sự giờ Việt Nam — so thẳng với `order_service.depart_date`), mỗi đầu tuỳ chọn.
//  - `dichVu` (lặp): mã danh mục; `status` (lặp, giữ tên cũ): trạng thái đơn; `nguoiLap`: mã tài khoản người lập.
//  - Ô trống (`?tu=`) = không lọc ô đó; mục trùng bị bỏ. "Người phụ trách" CHƯA có (nằm ở dispatch — lượt sau).
// Thuần, không I/O — dùng lại được cho màn lọc ở web/ sau khi chủ duyệt ảnh phác.
import { CATALOG_CODE_RE } from "./order-lines.ts";
import { STATUS_LABEL } from "./order-status-label.ts";
import { addDays, isISODate, ngayNgan, vnWeekRange } from "./vn-date.ts";
import { normName } from "./assignee-pick.ts";
import type { NguoiLapDto, OrderStatus } from "./contracts.ts";
import { LOC_NHAP_TOI_DA_NGAY, soNgayKhoang } from "./nhap-ke-toan.ts";

export const LOC_DON_TOI_DA_DICH_VU = 20;
const TRANG_THAI: readonly OrderStatus[] = ["draft", "confirmed", "cancelled"];
/** Mã tài khoản: UUID ở dữ liệu hiện có; nới cho mọi mã chữ-số-gạch (chỉ để chặn rác — giá trị luôn đi vào SQL dạng tham số). */
const MA_NGUOI_RE = /^[A-Za-z0-9-]{1,64}$/;

export interface LocDon {
  tu: string | null;
  den: string | null;
  dichVu: string[];
  trangThai: OrderStatus[];
  nguoiLap: string | null;
}

const khacRong = (p: URLSearchParams, k: string): string[] => [...new Set(p.getAll(k).map((v) => v.trim()).filter((v) => v !== ""))];

export function docLocDon(p: URLSearchParams): { ok: true; loc: LocDon } | { ok: false; message: string } {
  const [tu = null] = khacRong(p, "tu");
  const [den = null] = khacRong(p, "den");
  if ((tu !== null && !isISODate(tu)) || (den !== null && !isISODate(den))) return { ok: false, message: "Ngày đi lọc không hợp lệ (dạng năm-tháng-ngày)." };
  if (tu !== null && den !== null && tu > den) return { ok: false, message: "Từ ngày không được sau Đến ngày." };

  const trangThai = khacRong(p, "status");
  if (!trangThai.every((s) => (TRANG_THAI as readonly string[]).includes(s))) return { ok: false, message: "Trạng thái lọc không hợp lệ." };

  const dichVu = khacRong(p, "dichVu");
  if (dichVu.length > LOC_DON_TOI_DA_DICH_VU) return { ok: false, message: `Chỉ lọc được tối đa ${LOC_DON_TOI_DA_DICH_VU} dịch vụ một lúc.` };
  if (!dichVu.every((c) => CATALOG_CODE_RE.test(c))) return { ok: false, message: "Mã dịch vụ lọc không hợp lệ." };

  const nguoi = khacRong(p, "nguoiLap");
  if (nguoi.length > 1) return { ok: false, message: "Chỉ lọc được một người lập một lúc." };
  if (nguoi.length === 1 && !MA_NGUOI_RE.test(nguoi[0]!)) return { ok: false, message: "Người lập lọc không hợp lệ." };

  return { ok: true, loc: { tu, den, dichVu, trangThai: trangThai as OrderStatus[], nguoiLap: nguoi[0] ?? null } };
}

// ---- Phía màn Đơn hàng (chủ duyệt ảnh phác a, 30/9) -----------------------------------------------------------------------
/**
 * Bộ lọc như màn giữ và nhớ trên máy. `nguoiLap` = mã tài khoản người lập (ADR-0067: chọn từng người, chỉ người xem mọi đơn), hoặc dấu
 * `NGUOI_LAP_TOI_CU` khi đọc bộ lọc "Đơn tôi lập" nhớ từ bản cũ (lúc đó chưa biết mã người xem — `chotLocDon` đổi thành mã chính mình).
 */
export interface LocDonMan {
  tu: string | null;
  den: string | null;
  dichVu: string[];
  trangThai: OrderStatus[];
  nguoiLap: string | null;
  /** ADR-0060: "đã / chưa nhập phần mềm kế toán" — chỉ người có ô xem dấu không ngữ cảnh; bắt buộc kèm khoảng ngày (`kiemLocNhapKeToan`). */
  nhapKeToan: "da" | "chua" | null;
}
export const LOC_TRONG: LocDonMan = { tu: null, den: null, dichVu: [], trangThai: [], nguoiLap: null, nhapKeToan: null };
/** Dấu "Đơn tôi lập" của bộ lọc nhớ từ bản ≤ 1.45 (`cuaToi: true`). Không khớp dạng mã tài khoản nên không bao giờ trùng một người thật. */
export const NGUOI_LAP_TOI_CU = ":toi";
export type KhoaDieuKien = "ngay" | "dichVu" | "trangThai" | "nguoiLap" | "nhapKeToan";

/** ADR-0060 A-6 (cùng luật máy chủ): lọc theo dấu kế toán phải có Từ ngày + Đến ngày, tối đa 92 ngày tính cả hai đầu. null = hợp lệ. */
export function kiemLocNhapKeToan(loc: Pick<LocDonMan, "tu" | "den" | "nhapKeToan">): string | null {
  if (loc.nhapKeToan === null) return null;
  if (!loc.tu || !loc.den) return "Lọc theo nhập phần mềm kế toán phải chọn Từ ngày và Đến ngày.";
  if (soNgayKhoang(loc.tu, loc.den) > LOC_NHAP_TOI_DA_NGAY) return `Lọc theo nhập phần mềm kế toán chỉ trong tối đa ${LOC_NHAP_TOI_DA_NGAY} ngày.`;
  return null;
}

/** Tham số `GET /api/orders` của bộ lọc màn (máy chủ đọc lại bằng `docLocDon`). */
export function thamSoLocDon(loc: LocDonMan, toiId: string): [string, string][] {
  const p: [string, string][] = [];
  if (loc.tu) p.push(["tu", loc.tu]);
  if (loc.den) p.push(["den", loc.den]);
  for (const c of loc.dichVu) p.push(["dichVu", c]);
  for (const t of loc.trangThai) p.push(["status", t]);
  if (loc.nguoiLap) p.push(["nguoiLap", loc.nguoiLap === NGUOI_LAP_TOI_CU ? toiId : loc.nguoiLap]);
  if (loc.nhapKeToan) p.push(["nhapKeToan", loc.nhapKeToan]);
  return p;
}


/**
 * Chip "đang lọc" ở đầu danh sách — mỗi nhóm điều kiện một chip. `tenDv`: mã → tên dịch vụ (thiếu tên thì hiện mã). `nguoi`: mã người xem + mã → tên
 * người lập (ADR-0067): chính mình → "Đơn tôi lập"; thiếu tên (danh sách chưa tải / người không còn trong danh sách) → "Người lập đã chọn", không mã thô.
 */
export function chipLocDon(
  loc: LocDonMan,
  tenDv: ReadonlyMap<string, string>,
  nguoi: { toiId: string; ten: ReadonlyMap<string, string> } = { toiId: "", ten: new Map() },
  /** Kiểu D (V1.5b): hôm nay (giờ VN) — ngày khác năm hiện kèm năm (`ngayNgan`). */
  homNay?: string,
): { khoa: KhoaDieuKien; nhan: string }[] {
  const out: { khoa: KhoaDieuKien; nhan: string }[] = [];
  if (loc.tu || loc.den) {
    const nhan = loc.tu && loc.den ? (loc.tu === loc.den ? `Ngày đi ${ngayNgan(loc.tu, homNay)}` : `Ngày đi ${ngayNgan(loc.tu, homNay)} – ${ngayNgan(loc.den, homNay)}`)
      : loc.tu ? `Ngày đi từ ${ngayNgan(loc.tu, homNay)}` : `Ngày đi đến ${ngayNgan(loc.den!, homNay)}`;
    out.push({ khoa: "ngay", nhan });
  }
  if (loc.dichVu.length) {
    const dau = tenDv.get(loc.dichVu[0]!) ?? loc.dichVu[0]!;
    out.push({ khoa: "dichVu", nhan: loc.dichVu.length > 1 ? `${dau} +${loc.dichVu.length - 1}` : dau });
  }
  if (loc.trangThai.length) out.push({ khoa: "trangThai", nhan: loc.trangThai.map((t) => STATUS_LABEL[t]).join(", ") });
  if (loc.nguoiLap) {
    const toi = loc.nguoiLap === NGUOI_LAP_TOI_CU || (nguoi.toiId !== "" && loc.nguoiLap === nguoi.toiId);
    out.push({ khoa: "nguoiLap", nhan: toi ? "Đơn tôi lập" : (nguoi.ten.get(loc.nguoiLap) ?? "Người lập đã chọn") });
  }
  if (loc.nhapKeToan) out.push({ khoa: "nhapKeToan", nhan: loc.nhapKeToan === "da" ? "Đã nhập PM kế toán" : "Chưa nhập PM kế toán" });
  return out;
}

export const soDieuKienLoc = (loc: LocDonMan): number => chipLocDon(loc, new Map()).length;

export function boDieuKien(loc: LocDonMan, khoa: KhoaDieuKien): LocDonMan {
  // Bỏ khoảng ngày thì bỏ luôn lọc dấu kế toán (không có khoảng ngày thì máy chủ từ chối lọc đó — A-6).
  if (khoa === "ngay") return { ...loc, tu: null, den: null, nhapKeToan: null };
  if (khoa === "nhapKeToan") return { ...loc, nhapKeToan: null };
  if (khoa === "dichVu") return { ...loc, dichVu: [] };
  if (khoa === "trangThai") return { ...loc, trangThai: [] };
  return { ...loc, nguoiLap: null };
}

/**
 * Chốt bộ lọc đã nhớ SAU khi biết người xem (ADR-0067): dấu "Đơn tôi lập" của bản cũ → mã chính mình; người KHÔNG xem mọi đơn (ô "Người lập" không
 * hiện — thường là bộ nhớ của tài khoản khác trên cùng máy) → bỏ ô người lập. Máy chủ vẫn AND bộ lọc với phạm vi xem, đây chỉ để màn không lọc ngầm.
 */
export function chotLocDon(loc: LocDonMan, toiId: string, xemMoiDon: boolean): LocDonMan {
  if (loc.nguoiLap === null) return loc;
  if (!xemMoiDon) return { ...loc, nguoiLap: null };
  return loc.nguoiLap === NGUOI_LAP_TOI_CU ? { ...loc, nguoiLap: toiId } : loc;
}

/**
 * Danh sách người lập cho ô chọn (ADR-0067): bỏ chính người xem (đã có lối tắt "Đơn tôi lập"), giữ thứ tự máy chủ (đơn gần nhất trước), lọc theo chữ gõ
 * (không dấu cũng khớp — `normName`). Tên trùng trong danh sách (kể cả nhiều "(chưa có hồ sơ)") → kèm ngày đơn gần nhất để phân biệt (A-7).
 */
export function dsNguoiLapChon(ds: readonly NguoiLapDto[], toiId: string, tim: string, homNay?: string): { id: string; nhan: string }[] {
  const khac = ds.filter((x) => x.id !== toiId);
  const dem = new Map<string, number>();
  for (const x of khac) dem.set(x.ten, (dem.get(x.ten) ?? 0) + 1);
  const kim = normName(tim.trim());
  return khac
    .filter((x) => !kim || normName(x.ten).includes(kim))
    .map((x) => ({ id: x.id, nhan: (dem.get(x.ten) ?? 0) > 1 ? `${x.ten} · đơn gần nhất ${ngayNgan(x.ganNhat, homNay)}` : x.ten }));
}

export type KhoangNhanh = "hom-nay" | "ngay-mai" | "3-ngay" | "tuan-nay";
export const KHOANG_NHANH: readonly { khoa: KhoangNhanh; nhan: string }[] = [
  { khoa: "hom-nay", nhan: "Hôm nay" }, { khoa: "ngay-mai", nhan: "Ngày mai" }, { khoa: "3-ngay", nhan: "3 ngày tới" }, { khoa: "tuan-nay", nhan: "Tuần này" },
];
/** Nút chọn nhanh ngày đi; `homNay` = ngày giờ Việt Nam (`vnToday`). "3 ngày tới" = hôm nay → ngày kia; "Tuần này" = thứ Hai → Chủ nhật. */
export function khoangNhanh(k: KhoangNhanh, homNay: string): { tu: string; den: string } {
  if (k === "hom-nay") return { tu: homNay, den: homNay };
  if (k === "ngay-mai") return { tu: addDays(homNay, 1), den: addDays(homNay, 1) };
  if (k === "3-ngay") return { tu: homNay, den: addDays(homNay, 2) };
  const w = vnWeekRange(homNay);
  return { tu: w.from, den: w.to };
}

/** Bộ lọc đã nhớ trên máy (chuỗi JSON từ bộ nhớ trình duyệt). Kiểm lại bằng CÙNG luật máy chủ (`docLocDon`); hỏng / sai dạng → không lọc. */
export function docLocDaNho(raw: string | null): LocDonMan {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return LOC_TRONG;
    const o = v as Record<string, unknown>;
    const chuoi = (x: unknown): string | null => (typeof x === "string" && x !== "" ? x : null);
    const mang = (x: unknown): string[] | null => (x === undefined ? [] : Array.isArray(x) && x.every((y) => typeof y === "string") ? (x as string[]) : null);
    const dichVu = mang(o.dichVu);
    const trangThai = mang(o.trangThai);
    if (!dichVu || !trangThai) return LOC_TRONG;
    const nhapKeToan = o.nhapKeToan === "da" || o.nhapKeToan === "chua" ? o.nhapKeToan : null;
    // Bản ≤ 1.45 nhớ "Đơn tôi lập" là `cuaToi: true` (chưa có khoá `nguoiLap`) → dấu NGUOI_LAP_TOI_CU, chốt thành mã chính mình ở `chotLocDon`.
    const nguoiLap = chuoi(o.nguoiLap) ?? (o.cuaToi === true ? NGUOI_LAP_TOI_CU : null);
    const loc: LocDonMan = { tu: chuoi(o.tu), den: chuoi(o.den), dichVu, trangThai: trangThai as OrderStatus[], nguoiLap, nhapKeToan };
    return docLocDon(new URLSearchParams(thamSoLocDon(loc, "x"))).ok && kiemLocNhapKeToan(loc) === null ? loc : LOC_TRONG;
  } catch {
    return LOC_TRONG;
  }
}
