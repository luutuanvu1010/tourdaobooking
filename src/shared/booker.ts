// Người đặt (hồ sơ khách) gắn vào đơn — N2 lát 1 (docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md), ADR-0011.
// Thuần, dùng chung server (orders/rules.ts kiểm đầu vào, orders/service.ts ghi nhật ký) ↔ web (form đơn, bảng đổi khách): một nguồn cho dạng dữ liệu và câu chữ.
import type { PartyListItemDto } from "./contracts.ts";
import { PARTY_ID_RE } from "./party-id.ts";
import { normalizePhone } from "./phone.ts";

/** Đầu vào đã kiểm: không gắn / gắn hồ sơ có sẵn / tạo hồ sơ cá nhân mới cùng batch với đơn (ADR-0011 điều 1). `phone` đã chuẩn hoá 0xxxxxxxxx. */
export type BookerInput = { kind: "none" } | { kind: "existing"; partyId: string } | { kind: "new"; fullName: string; phone: string };

/** Lựa chọn trên giao diện (chưa gửi): hồ sơ có sẵn mang theo tên để hiển thị. */
export type BookerChoice = { kind: "none" } | { kind: "existing"; partyId: string; name: string } | { kind: "new" };

/**
 * ADR-0077 điều 3 (i), THU HẸP theo lời chủ (đặc tả sổ đại lý đợt 1 §7): tài khoản Đối tác mà hồ sơ cá nhân đang mang vai được hưởng ⇒ bên đặt = chính hồ sơ đó,
 * bỏ qua bên đặt trình duyệt gửi. Đối tác khác (hồ sơ không mang vai được hưởng, chưa gắn hồ sơ) và tài khoản không giữ quyền Đối tác giữ điều thân gửi — riêng việc
 * Đối tác CHỌN một đại lý / cộng tác viên khác thì bị `benDatDoiTacBiCam` chặn. (Tài khoản lai thường không có vai được hưởng trên hồ sơ của nó: chặn ở TẦNG ỨNG DỤNG —
 * route vai của `parties` trả 409 `role_via_account` cho vai nhóm nội bộ / bên ngoài (`isAccountGroup`), `src/shared/roles.ts` xếp quyền theo nhóm vai — và kiểm định kỳ
 * `R-LC-1`; KHÔNG có trigger CSDL nào chặn vai bên ngoài trên hồ sơ của tài khoản lai, trigger LC-1 chỉ canh lúc cấp quyền.)
 * `laDoiTac` = giữ mã quyền Đối tác (`holdsPartner`); `laNguoiHuong` = hồ sơ của tài khoản đang mang vai được hưởng (máy chủ tính, `laNguoiHuong` của pricing).
 */
export function benDatChoTaiKhoan(v: { laDoiTac: boolean; partyId: string | null; laNguoiHuong: boolean; guiLen: BookerInput }): BookerInput {
  return v.laDoiTac && v.partyId !== null && v.laNguoiHuong ? { kind: "existing", partyId: v.partyId } : v.guiLen;
}

/**
 * Lời chủ 2026-10-09 (K1): tài khoản giữ quyền Đối tác — kể cả tài khoản lai Bán hàng + Đối tác — KHÔNG chọn được một đại lý / cộng tác viên KHÁC đang được hưởng
 * hoa hồng làm bên đặt; đơn qua đại lý do văn phòng lập hộ. MỘT luật cho cả ba đường gửi bên đặt (`POST /api/orders`, `PUT /api/orders/:id`, `PUT /api/orders/:id/booker`).
 * Bị cấm khi bên đặt gửi lên là hồ sơ CÓ SẴN đang được hưởng (cá nhân hay tổ chức) VÀ khác hồ sơ của chính tài khoản VÀ khác bên đặt đang lưu trên đơn (văn phòng đã
 * gắn rồi thì Đối tác lưu lại nháp / sửa tên khách không bị chặn; đơn mới: `benDatDangLuu` = null). `guiLaNguoiHuong` do máy chủ tính (`laNguoiHuong` của pricing).
 * Thứ tự ở đường lập đơn / lưu nháp: ép bên đặt (`benDatChoTaiKhoan`) → 409 chưa gắn hồ sơ → luật này.
 */
export function benDatDoiTacBiCam(v: { laDoiTac: boolean; partyId: string | null; guiLen: BookerInput; guiLaNguoiHuong: boolean; benDatDangLuu: string | null }): boolean {
  return v.laDoiTac && v.guiLen.kind === "existing" && v.guiLaNguoiHuong && v.guiLen.partyId !== v.partyId && v.guiLen.partyId !== v.benDatDangLuu;
}

export const NO_BOOKER_TEXT = "Chưa gắn hồ sơ khách";
const MAX_NAME = 200;

type Parsed = { ok: true; value: BookerInput } | { ok: false; message: string };
const absent = (v: unknown): boolean => v === undefined || v === null || v === "";

/** Kiểm hai trường `bookerPartyId` / `newBooker` của thân yêu cầu. Vắng cả hai = không gắn (câu hỏi A của đặc tả: được bỏ qua). */
export function parseBooker(bookerPartyId: unknown, newBooker: unknown): Parsed {
  const hasExisting = !absent(bookerPartyId);
  const hasNew = newBooker !== undefined && newBooker !== null;
  if (hasExisting && hasNew) return { ok: false, message: "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới." };
  if (hasExisting) {
    if (typeof bookerPartyId !== "string" || !PARTY_ID_RE.test(bookerPartyId)) return { ok: false, message: "Hồ sơ khách không hợp lệ." };
    return { ok: true, value: { kind: "existing", partyId: bookerPartyId } };
  }
  if (!hasNew) return { ok: true, value: { kind: "none" } };
  if (typeof newBooker !== "object" || Array.isArray(newBooker)) return { ok: false, message: "Thông tin tạo hồ sơ khách không hợp lệ." };
  const b = newBooker as Record<string, unknown>;
  const fullName = typeof b.fullName === "string" ? b.fullName.trim().replace(/\s+/g, " ") : "";
  if (!fullName) return { ok: false, message: "Cần tên khách để tạo hồ sơ." };
  if (fullName.length > MAX_NAME) return { ok: false, message: `Tên khách tối đa ${MAX_NAME} ký tự.` };
  const phone = typeof b.phone === "string" ? normalizePhone(b.phone) : null;
  if (!phone) return { ok: false, message: "Tạo hồ sơ khách cần số điện thoại Việt Nam 10 số (bắt đầu bằng 0 hoặc +84)." };
  return { ok: true, value: { kind: "new", fullName, phone } };
}

type MatchLike = Pick<PartyListItemDto, "kind" | "active">;

/** Hồ sơ trong danh sách trùng số chọn làm người đặt được không: chỉ cá nhân đang hoạt động (đại lý/tổ chức để lát sau — đặc tả §8 mục 2). */
export const canPickMatch = (m: MatchLike): boolean => m.kind === "PERSON" && m.active;

/**
 * Lý do một hồ sơ không chọn được (hiện cạnh tên); null = chọn được.
 * `coODatQuaDoiTac`: người đọc CÓ ô «Đặt qua đối tác» không (`coODatQuaDoiTac(staff)` ở phan-doi-tac-hien-thi.ts — người lập đơn không giữ quyền Đối tác). Không có ô thì câu không được trỏ tới nó
 * (Đối tác và tài khoản lai nhìn thấy câu này mà không có ô nào để chọn). Tham số BẮT BUỘC để không nơi gọi nào lặng lẽ rơi về câu cũ.
 */
export function matchNote(m: MatchLike, coODatQuaDoiTac: boolean): string | null {
  if (!m.active) return "đã ngưng";
  // sổ đại lý đợt 1 (Task 11): tổ chức được hưởng gắn vào đơn được, nhưng qua ô riêng (đặc tả §7), không qua ô tra SĐT
  if (m.kind !== "PERSON") return coODatQuaDoiTac ? "tổ chức — đại lý thì chọn ở ô “Đặt qua đối tác”" : "tổ chức — do văn phòng gắn bên đặt";
  return null;
}

/** SĐT đã đủ để tra hồ sơ chưa — cùng chuẩn với máy chủ (`GET /api/parties/lookup` chỉ nhận số Việt Nam 10 số). */
export const lookupReady = (phone: string): boolean => normalizePhone(phone) !== null;

/** Lựa chọn trên giao diện → trường gửi kèm đơn / bảng đổi khách. Hồ sơ mới lấy tên + SĐT đang gõ ở hai ô của đơn. */
export function bookerPayload(choice: BookerChoice, name: string, phone: string): { bookerPartyId: string | null } | { newBooker: { fullName: string; phone: string } } {
  if (choice.kind === "existing") return { bookerPartyId: choice.partyId };
  if (choice.kind === "new") return { newBooker: { fullName: name.trim(), phone: phone.trim() } };
  return { bookerPartyId: null };
}

/** Mẩu nhật ký khi người đặt đổi — CHỈ tên hiển thị, không SĐT (CLAUDE.md §5). null = không đổi. */
export function describeBookerChange(before: { id: string | null; name: string | null }, after: { id: string | null; name: string | null }): string | null {
  if (before.id === after.id) return null;
  const q = (n: string | null): string => `“${n ?? "?"}”`;
  if (before.id === null) return `gắn hồ sơ khách ${q(after.name)}`;
  if (after.id === null) return `bỏ gắn hồ sơ khách ${q(before.name)}`;
  return `đổi hồ sơ khách ${q(before.name)} → ${q(after.name)}`;
}
