// Hướng dẫn người dùng theo vai (đặc tả docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md). Thuần, không I/O.
// MỘT NGUỒN cho trang Trợ giúp (web/help.ts) và bản đọc ngoài app (scripts/xuat-huong-dan.mjs → Google Docs).
// Nội dung ở các tệp huong-dan-*.ts, viết bằng tập con markdown nhỏ (xem phanTich). Luật chủ duyệt 30/9: chữ hướng dẫn nằm trên
// mọi máy (ADR-0035) nên CHỈ ghi tên nút và cách làm — không giá, không số liệu, không tên / SĐT thật; huong-dan.test.ts canh.
import type { PermissionCode } from "./permissions.ts";
import { EMAIL_TRONG_CHU } from "./text-guards.ts";
import { HD_CHUNG } from "./huong-dan-chung.ts";
import { HD_QUAN_TRI } from "./huong-dan-quan-tri.ts";
import { HD_BAN_HANG } from "./huong-dan-ban-hang.ts";
import { HD_KE_TOAN } from "./huong-dan-ke-toan.ts";
import { HD_HDV } from "./huong-dan-hdv.ts";
import { HD_DOI_TAC } from "./huong-dan-doi-tac.ts";
import { HD_TAI_XE } from "./huong-dan-tai-xe.ts";
import { HD_NHAN_SU } from "./huong-dan-nhan-su.ts";

export interface MucHuongDan { readonly tieuDe: string; readonly noiDung: string }
export interface NhomHuongDan {
  readonly id: string;
  readonly tieuDe: string;
  /** Quyền thấy nhóm này; rỗng = mọi người (Phần chung). */
  readonly quyen: readonly PermissionCode[];
  /** Một câu: bạn là ai, làm gì trong app. */
  readonly gioiThieu: string;
  /** Các bước làm được ngay trong 5 phút đầu — hiện mở sẵn. */
  readonly batDauNhanh: string;
  readonly muc: readonly MucHuongDan[];
}

/** Thứ tự trong bản đọc ngoài app (Phần chung đầu). Trang Trợ giúp đặt nhóm vai của người xem trước Phần chung (web/help.ts). */
export const HUONG_DAN: readonly NhomHuongDan[] = [HD_CHUNG, HD_BAN_HANG, HD_HDV, HD_KE_TOAN, HD_DOI_TAC, HD_TAI_XE, HD_NHAN_SU, HD_QUAN_TRI];

/** Các nhóm tài khoản này thấy (Phần chung + nhóm có quyền giao nhau), đúng thứ tự HUONG_DAN. */
export function nhomCuaToi(perms: readonly PermissionCode[]): NhomHuongDan[] {
  return HUONG_DAN.filter((n) => n.quyen.length === 0 || n.quyen.some((q) => perms.includes(q)));
}

// ---------------------------------------------------------------- tập con markdown

export type DoanChu = { readonly k: "chu"; readonly t: string } | { readonly k: "dam"; readonly t: string } | { readonly k: "nut"; readonly t: string };
export type Khoi =
  | { readonly k: "tieuDe"; readonly t: readonly DoanChu[] }
  | { readonly k: "doan"; readonly t: readonly DoanChu[] }
  | { readonly k: "ghiChu"; readonly t: readonly DoanChu[] }
  | { readonly k: "dsSo"; readonly muc: readonly (readonly DoanChu[])[] }
  | { readonly k: "dsCham"; readonly muc: readonly (readonly DoanChu[])[] };

/** `**đậm**` và `[[Tên nút]]` trong một dòng. Dấu mở không đóng thì để nguyên là chữ. */
export function phanTichDong(s: string): DoanChu[] {
  const out: DoanChu[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ k: "chu", t: s.slice(last, m.index) });
    out.push(m[1] !== undefined ? { k: "dam", t: m[1] } : { k: "nut", t: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ k: "chu", t: s.slice(last) });
  return out;
}

const SO = /^\s*\d+[.)]\s+/;
const CHAM = /^\s*[-*]\s+/;

/** Dòng → khối: `### ` tiêu đề nhỏ, `1. ` danh sách số, `- ` danh sách chấm, `> ` ghi chú / ví dụ, còn lại gộp thành đoạn (dòng trống ngắt). */
export function phanTich(md: string): Khoi[] {
  const out: Khoi[] = [];
  let doan: string[] = [];
  let ghiChu: string[] = [];
  let ds: { k: "dsSo" | "dsCham"; muc: DoanChu[][] } | null = null;
  const dong = (): void => {
    if (doan.length) out.push({ k: "doan", t: phanTichDong(doan.join(" ")) });
    if (ghiChu.length) out.push({ k: "ghiChu", t: phanTichDong(ghiChu.join(" ")) });
    if (ds) out.push(ds);
    doan = [];
    ghiChu = [];
    ds = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { dong(); continue; }
    if (line.startsWith("### ")) { dong(); out.push({ k: "tieuDe", t: phanTichDong(line.slice(4).trim()) }); continue; }
    if (line.startsWith(">")) {
      if (!ghiChu.length) dong();
      ghiChu.push(line.replace(/^>\s?/, ""));
      continue;
    }
    const kieu = SO.test(line) ? "dsSo" : CHAM.test(line) ? "dsCham" : null;
    if (kieu) {
      // Mục con thụt lề của danh sách số (vd "   - …") gộp vào danh sách đang mở, không mở danh sách mới.
      const thutLe = /^\s+/.test(line);
      if (!ds || (ds.k !== kieu && !thutLe)) { dong(); ds = { k: kieu, muc: [] }; }
      ds.muc.push(phanTichDong(line.replace(kieu === "dsSo" ? SO : CHAM, "")));
      continue;
    }
    if (ds && /^\s+/.test(line)) { const cuoi = ds.muc[ds.muc.length - 1]; cuoi?.push({ k: "chu", t: " " }, ...phanTichDong(line.trim())); continue; }
    if (ds || ghiChu.length) dong();
    doan.push(line.trim());
  }
  dong();
  return out;
}

// ---------------------------------------------------------------- đo và kiểm

/** Mọi đoạn chữ thô của một nhóm (để đếm chữ, kiểm luật nội dung). */
export function chuCuaNhom(n: NhomHuongDan): string[] {
  return [n.tieuDe, n.gioiThieu, n.batDauNhanh, ...n.muc.flatMap((m) => [m.tieuDe, m.noiDung])];
}

export const soChu = (s: string): number => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Phút đọc ở 150 chữ/phút (người đọc chậm, vừa đọc vừa bấm thử), làm tròn lên. */
export const phutDoc = (n: NhomHuongDan): number => Math.max(1, Math.ceil(chuCuaNhom(n).reduce((a, s) => a + soChu(s), 0) / 150));

/** Mọi `[[Tên nút]]` của một nhóm. */
export function nutCuaNhom(n: NhomHuongDan): string[] {
  const out: string[] = [];
  for (const s of chuCuaNhom(n)) for (const m of s.matchAll(/\[\[(.+?)\]\]/g)) out.push(m[1] ?? "");
  return out;
}

/**
 * Luật nội dung chủ duyệt 30/9 cho MỘT chuỗi: không số tiền, không chuỗi giống SĐT, không email. Trả `{ luat, khop }` của luật đầu tiên vi phạm, hoặc null.
 * MỘT nguồn cho hướng dẫn (`viPhamNoiDung`), sơ đồ trang tự sinh và kho tri thức của trợ lý Hỗ trợ (ADR-0066 điều 3 — mọi chữ gửi đi phải qua luật này).
 */
export function viPhamChu(s: string): { luat: string; khop: string } | null {
  const luat: readonly [RegExp, string][] = [
    [/\d{1,3}(?:[.,]\d{3})+\s*(?:đ(?!\p{L})|₫|VNĐ|vnđ|đồng)/u, "số tiền"],
    [/\b\d+\s*(?:₫|VNĐ|vnđ)/u, "số tiền"],
    [/\d[\d .]{8,}\d/, "chuỗi số dài (giống số điện thoại)"],
    [new RegExp(EMAIL_TRONG_CHU.source), "địa chỉ email"],
  ];
  for (const [re, ten] of luat) {
    const m = s.match(re);
    if (m) return { luat: ten, khop: m[0] };
  }
  return null;
}

/** Luật nội dung chủ duyệt 30/9 trên mọi chữ của một nhóm. Trả các dòng vi phạm. */
export function viPhamNoiDung(n: NhomHuongDan): string[] {
  const out: string[] = [];
  for (const s of chuCuaNhom(n)) {
    const v = viPhamChu(s);
    if (v) out.push(`${n.id}: ${v.luat} "${v.khop}"`);
  }
  return out;
}
