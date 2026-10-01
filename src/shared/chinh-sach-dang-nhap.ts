// Luật THUẦN của chính sách đăng nhập (ADR-0085; đặc tả docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md §2, §4.2, §5). Dùng chung máy chủ
// (kiểm thân gửi lên, mô tả nhật ký) và giao diện (tính thay đổi, cảnh báo). Không I/O.
import type { SessionPolicyChange, SessionPolicyRowDto } from "./contracts.ts";
import { PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";

/** Quyền đặt được = 9 mã quyền app trừ SUPER_ADMIN (Toàn quyền luôn nhiều máy — khoá cứng). Thứ tự = PERMISSION_CODES. */
export const QUYEN_DAT_DUOC = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"] as const satisfies readonly PermissionCode[];
export type QuyenDatDuoc = (typeof QUYEN_DAT_DUOC)[number];
export const isQuyenDatDuoc = (v: unknown): v is QuyenDatDuoc => typeof v === "string" && (QUYEN_DAT_DUOC as readonly string[]).includes(v);

/** ADR-0085 điều 10: cảnh báo khi quyền bên ngoài đặt Nhiều máy (chưa bắt bảo mật hai lớp). */
const QUYEN_BEN_NGOAI: readonly QuyenDatDuoc[] = ["PARTNER", "DRIVER_PARTNER"];
export const CANH_BAO_NHIEU_MAY_BEN_NGOAI =
  "Nhiều máy: nếu ai đó biết PIN, họ đăng nhập song song mà chủ tài khoản không bị đẩy ra để nhận biết. Quyền Đối tác gồm cả lữ hành, HDV độc lập, lễ tân, taxi, cộng tác viên — không chọn riêng được từng loại.";
export const canCanhBaoBenNgoai = (chon: ReadonlyMap<QuyenDatDuoc, boolean>): boolean => QUYEN_BEN_NGOAI.some((c) => chon.get(c) === true);

const SAI = (message: string) => ({ ok: false as const, message });

/** Thân `PUT /api/sessions/policy`: 1–9 thay đổi, mỗi mã một lần, mã thuộc 9 mã đặt được, `multi` boolean, `banDangXem` chuỗi ≤ 64 ký tự hoặc null. */
export function kiemThayDoiChinhSach(v: unknown): { ok: true; value: SessionPolicyChange[] } | { ok: false; message: string } {
  if (!Array.isArray(v) || v.length === 0 || v.length > QUYEN_DAT_DUOC.length) return SAI("Chưa có thay đổi nào để lưu.");
  const out: SessionPolicyChange[] = [];
  for (const x of v as unknown[]) {
    const o = (x ?? {}) as Record<string, unknown>;
    if (o.permissionCode === "SUPER_ADMIN") return SAI("Toàn quyền luôn được nhiều máy — không đặt được.");
    if (!isQuyenDatDuoc(o.permissionCode)) return SAI("Quyền không hợp lệ.");
    if (typeof o.multi !== "boolean") return SAI("Lựa chọn Một máy / Nhiều máy không hợp lệ.");
    if (!(o.banDangXem === null || (typeof o.banDangXem === "string" && o.banDangXem.length > 0 && o.banDangXem.length <= 64))) return SAI("Thiếu phiên bản chính sách đang xem — tải lại trang.");
    if (out.some((y) => y.permissionCode === o.permissionCode)) return SAI("Một quyền chỉ được đổi một lần mỗi lần lưu.");
    out.push({ permissionCode: o.permissionCode, multi: o.multi, banDangXem: o.banDangXem });
  }
  return { ok: true, value: out };
}

/** Tham số `nhieuMay` của xem trước: danh sách phẩy (rỗng = không quyền nào Nhiều máy). Trả theo thứ tự QUYEN_DAT_DUOC. */
export function docTapNhieuMayThamSo(raw: string | null): { ok: true; value: QuyenDatDuoc[] } | { ok: false; message: string } {
  if (raw === null) return SAI("Thiếu tập quyền cần xem trước.");
  const parts = raw === "" ? [] : raw.split(",");
  if (parts.includes("SUPER_ADMIN")) return SAI("Toàn quyền luôn được nhiều máy — không đặt được.");
  if (!parts.every(isQuyenDatDuoc)) return SAI("Quyền không hợp lệ.");
  return { ok: true, value: QUYEN_DAT_DUOC.filter((c) => parts.includes(c)) };
}

/** Tập quyền "Nhiều máy" sau khi áp các thay đổi lên chính sách hiện hành. */
export function tapNhieuMaySau(rows: readonly { permissionCode: PermissionCode; multi: boolean }[], thayDoi: readonly SessionPolicyChange[]): QuyenDatDuoc[] {
  const cuoi = new Map<PermissionCode, boolean>(rows.map((r) => [r.permissionCode, r.multi]));
  for (const t of thayDoi) cuoi.set(t.permissionCode, t.multi);
  return QUYEN_DAT_DUOC.filter((c) => cuoi.get(c) === true);
}

/** Giao diện: chỉ gửi quyền có lựa chọn khác bản đang xem, kèm id dòng đang xem (kiểm phiên bản). */
export const thayDoiChinhSach = (rows: readonly SessionPolicyRowDto[], chon: ReadonlyMap<QuyenDatDuoc, boolean>): SessionPolicyChange[] =>
  rows.flatMap((r) => {
    const c = isQuyenDatDuoc(r.permissionCode) ? chon.get(r.permissionCode) : undefined;
    return c === undefined || c === r.multi ? [] : [{ permissionCode: r.permissionCode, multi: c, banDangXem: r.banId }];
  });

/** Chi tiết nhật ký `session_policy_changed` (ADR-0085 điều 9): quyền đổi + giá trị mới + số máy/số người — không tên, SĐT, IP. */
export const moTaThayDoiChinhSach = (thayDoi: readonly SessionPolicyChange[], dem: { soPhien: number; soNguoi: number }): string =>
  [...thayDoi.map((t) => `${PERMISSION_LABEL[t.permissionCode]} → ${t.multi ? "Nhiều máy" : "Một máy"}`), `đăng xuất ${dem.soPhien} máy của ${dem.soNguoi} người`].join("; ");
