// Bảng điều khiển giao diện của Toàn quyền (ADR-0194, đợt 1): DANH MỤC «hợp đồng hiển thị» và luật THUẦN giải chính sách cho một người. Dùng chung máy chủ
// (bỏ khoá trường ẩn, kiểm trường bắt buộc, kiểm POST) ↔ giao diện (ẩn/hiện, đánh dấu bắt buộc); không I/O, không import module.
//
// DANH SÁCH CHO PHÉP, không phải danh sách cấm (ADR-0194 ranh giới 2): chỉ trường KHAI Ở ĐÂY mới chỉnh được; trường không khai, hoặc khai mà cờ không cho
// ⇒ dòng chính sách bị BỎ QUA (không lỗi, không tác dụng). Nghi ngờ thì để `anDuoc: false`. Chính sách chỉ NỚI/THU phần hiển thị: quyền xem dữ liệu vẫn ở
// `permissions.ts`, luật nền (trigger, CHECK, `buildLines`, cổng xuất bến) không đổi.
//
// Hai bài canh (src/shared/ui-truong.test.ts): (a) mọi `truong` có thật trong interface `giaoDien` của `contracts.ts`; (b) trường máy chủ bắt buộc có mặt ở đây
// với hai cờ `false`. Thêm trường vào danh mục: `docs/CHANGE-GUIDE.md`, công thức «thêm trường vào danh mục hiển thị».
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";

/** Bốn màn của đợt 1. Mã màn là khoá lưu trong CSDL — không đổi tên khi đã có dòng chính sách. */
export const MAN_UI = ["tao-don", "danh-sach-dich-vu", "danh-sach-tai-khoan", "quan-ly-doi-tac"] as const;
export type ManUi = (typeof MAN_UI)[number];

/** Chế độ của một dòng chính sách (khớp CHECK ở migration): HIEN = như mặc định; AN; BAT_BUOC = hiện và bắt buộc; TUY_CHON = hiện và bỏ bắt buộc. */
export const CHE_DO = ["HIEN", "AN", "BAT_BUOC", "TUY_CHON"] as const;
export type CheDo = (typeof CHE_DO)[number];

export interface MucTruong {
  man: ManUi;
  /** Tên trường — phải có trong interface `giaoDien` ở `contracts.ts` (bài canh (a)). */
  truong: string;
  giaoDien: string;
  /** `nhap` = ô nhập trên form (máy chủ bỏ khoá khi ẩn, kiểm khi bắt buộc); `xem` = cột/dòng chỉ hiển thị trong danh sách (chỉ giao diện ẩn; dữ liệu vẫn theo quyền xem). */
  loai: "nhap" | "xem";
  /** Được chọn AN. Mặc định (không khai) = false. */
  anDuoc: boolean;
  /** Trường ĐANG bắt buộc ở form mà luật nền không cần ⇒ được chọn TUY_CHON. Đợt 1 không có mục nào (ca nghi ngờ để false). `true` cũng nghĩa mặc định là bắt buộc. */
  boBatBuocDuoc: boolean;
}

const nhap = (truong: string, anDuoc: boolean): MucTruong => ({ man: "tao-don", truong, giaoDien: "OrderInput", loai: "nhap", anDuoc, boBatBuocDuoc: false });
const xem = (man: ManUi, giaoDien: string, truong: string): MucTruong => ({ man, truong, giaoDien, loai: "xem", anDuoc: true, boBatBuocDuoc: false });

/**
 * Danh mục khởi đầu. Tạo đơn: bốn trường phần chủ nêu ẩn được; mọi trường còn lại khai `anDuoc: false` để bài (b) ép máy chủ-bắt-buộc nằm TRONG danh mục (tên, SĐT, dịch vụ
 * kèm ngày đi, tiền, người phụ trách, bên đặt). Ba màn còn lại: chỉ cột phụ rõ ràng an toàn; tiền, mã, tên, trạng thái không khai.
 */
export const DANH_MUC_UI: readonly MucTruong[] = [
  nhap("customerName", false), nhap("customerPhone", false), nhap("services", false), nhap("discount", false), nhap("declaredDeposit", false), nhap("paymentTerm", false),
  nhap("handlerStaffId", false), nhap("bookerPartyId", false), nhap("newBooker", false),
  nhap("customerEmail", true), nhap("customerNote", true), nhap("passengers", true), nhap("paymentNote", true),
  xem("danh-sach-dich-vu", "CatalogAdminItemDto", "groupCode"), xem("danh-sach-dich-vu", "CatalogAdminItemDto", "unit"),
  xem("danh-sach-tai-khoan", "StaffAccount", "createdAt"), xem("danh-sach-tai-khoan", "StaffAccount", "lastLoginAt"),
  xem("quan-ly-doi-tac", "PartyListItemDto", "roleCodes"),
];

export const timMuc = (man: string, truong: string): MucTruong | undefined => DANH_MUC_UI.find((m) => m.man === man && m.truong === truong);

/** Một dòng chính sách ĐANG HIỆU LỰC của một ô (màn × trường × quyền). Giá trị lạ vẫn nhận được kiểu chuỗi — luật dưới bỏ qua. */
export interface DongChinhSach { man: string; truong: string; quyen: string; cheDo: string }
/** Kết quả cho MỘT người, chỉ các trường khác mặc định. */
export interface TruongDaGiai { man: ManUi; truong: string; an: boolean; batBuoc: boolean }

/** Chế độ này áp được cho mục này không (dùng ở POST và ở luật giải). `HIEN` luôn hợp lệ cho mục có trong danh mục: là cách đặt lại mặc định. */
export function laCheDoHopLe(man: string, truong: string, cheDo: string): boolean {
  const m = timMuc(man, truong);
  if (!m || !(CHE_DO as readonly string[]).includes(cheDo)) return false;
  if (cheDo === "HIEN") return true;
  if (cheDo === "AN") return m.anDuoc;
  if (cheDo === "TUY_CHON") return m.boBatBuocDuoc;
  return m.loai === "nhap" && m.anDuoc && !m.boBatBuocDuoc; // BAT_BUOC: chỉ ô nhập tuỳ chọn mà chủ coi là phụ
}

const laQuyen = (q: string): q is PermissionCode => (PERMISSION_CODES as readonly string[]).includes(q);

/**
 * Giải chính sách cho một người giữ các quyền `quyen` (hợp của mọi ô, Hiến chương 5.28). Mỗi quyền không có dòng ⇒ mặc định (HIEN).
 *  - ẨN chỉ khi MỌI quyền của người đó chọn AN.
 *  - BẮT BUỘC: trường mặc định tuỳ chọn thì chỉ bắt buộc khi MỌI quyền chọn BAT_BUOC; trường mặc định bắt buộc (`boBatBuocDuoc`) thì chỉ bỏ bắt buộc khi MỌI quyền bỏ.
 * Dòng ngoài danh mục, màn/quyền/chế độ lạ, hoặc cờ không cho ⇒ bỏ qua. Trả về chỉ trường KHÁC mặc định; bảng rỗng ⇒ `[]`. Thứ tự: theo danh mục.
 */
export function giaiChinhSach(dong: readonly DongChinhSach[], quyen: readonly string[]): TruongDaGiai[] {
  const cua = [...new Set(quyen)].filter(laQuyen);
  if (cua.length === 0) return [];
  const ra: TruongDaGiai[] = [];
  for (const m of DANH_MUC_UI) {
    const theoQuyen = cua.map((q) => dong.find((d) => d.man === m.man && d.truong === m.truong && d.quyen === q && laCheDoHopLe(m.man, m.truong, d.cheDo))?.cheDo ?? "HIEN");
    const an = theoQuyen.every((c) => c === "AN");
    const doi = (c: string): boolean => (c === "BAT_BUOC" ? true : c === "AN" || c === "TUY_CHON" ? false : m.boBatBuocDuoc);
    const batBuoc = an ? false : m.boBatBuocDuoc ? theoQuyen.some(doi) : theoQuyen.every(doi);
    if (an || batBuoc !== m.boBatBuocDuoc) ra.push({ man: m.man, truong: m.truong, an, batBuoc });
  }
  return ra;
}
