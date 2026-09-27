// BẢNG TIN (ADR-0022) — hàm thuần dùng chung server ↔ web/: nhãn (tag) của một kết nối/sự kiện (Task 1). Không I/O, không API
// Worker/Node — chỉ import ./permissions.ts (điều 3 ADR-0022: nhóm nhận suy từ ô `order.view`/`dispatch.claim` hiện hành, không đặt luật
// quyền mới ở đây). Sự kiện chỉ gồm đúng 5 khoá của điều 4 (không tiền, không SĐT, không tên người) — thêm trường = đổi ADR.

import { can, hasPermission, isOffice, type PermissionHolder } from "./permissions.ts";

/** 9 loại thay đổi một đơn có thể phát (điều 4 + điều 7). */
export const THAY_DOI = ["tao", "tao_cho_nhan", "nhan", "giao", "xac_nhan", "huy", "sua", "chuyen", "tien"] as const;
export type ThayDoiDon = (typeof THAY_DOI)[number];

/** Sự kiện phát cho mọi màn hình đang mở — ĐÚNG 5 khoá, không hơn (điều 4). `maDon` = `orders.order_code`. */
export interface SuKienDon {
  loai: "don";
  orderId: string;
  maDon: string;
  thayDoi: ThayDoiDon;
  luc: string;
}

/** Trạng thái người phụ trách dùng để tính nhãn/loại thay đổi. `coNguoi`: đơn có dòng phụ trách đang mở; `staffId`: null khi chưa ai hoặc người phụ trách là hồ sơ không có tài khoản. */
export interface TrangThaiPhuTrach {
  coNguoi: boolean;
  staffId: string | null;
}

/**
 * Nhãn của một kết nối (ai nhận được tin gì) — NT-1. Luôn có `nguoi:<id>`; thêm `tat-ca` nếu xem được mọi đơn (`order.view`, không ngữ
 * cảnh = ô `any`); thêm `cho-nhan` nếu nhận được đơn chưa có người (`dispatch.claim`). Không luật quyền viết tay ngoài hai lời gọi `can()` này.
 */
export function nhanKetNoi(staff: PermissionHolder): string[] {
  const nhan = new Set<string>([`nguoi:${staff.id}`]);
  if (can(staff, "order.view")) nhan.add("tat-ca");
  if (can(staff, "dispatch.claim")) nhan.add("cho-nhan");
  return [...nhan].sort();
}

/**
 * Nhãn của một sự kiện đơn (ai được gửi tin) — NT-2. Luôn có `tat-ca` + `nguoi:<người lập>`; thêm `nguoi:<người phụ trách trước/sau>` khi
 * người đó có tài khoản (`staffId !== null`); thêm `cho-nhan` khi và chỉ khi SAU thay đổi đơn không còn ai phụ trách (`!handlerSau.coNguoi`) —
 * người phụ trách là hồ sơ không tài khoản thì đơn CÓ người (không gắn `cho-nhan`) nhưng không có nhãn `nguoi:` cho người đó. Không trùng lặp.
 */
export function nhanSuKien(input: {
  ownerId: string;
  handlerTruoc: TrangThaiPhuTrach;
  handlerSau: TrangThaiPhuTrach;
}): string[] {
  const { ownerId, handlerTruoc, handlerSau } = input;
  const nhan = new Set<string>(["tat-ca", `nguoi:${ownerId}`]);
  if (handlerTruoc.staffId !== null) nhan.add(`nguoi:${handlerTruoc.staffId}`);
  if (handlerSau.staffId !== null) nhan.add(`nguoi:${handlerSau.staffId}`);
  if (!handlerSau.coNguoi) nhan.add("cho-nhan");
  return [...nhan].sort();
}

/**
 * `nhan` khi người gọi tự đặt mình vào một đơn CHƯA có người phụ trách (`!handlerTruoc.coNguoi` và người phụ trách sau đổi là chính người gọi);
 * còn lại (đổi người phụ trách của đơn đã có người, hoặc gán cho người khác) là `giao`. Route `PUT /api/orders/:id/handler` dùng để chọn `thayDoi`.
 */
export function thayDoiCuaHandler(input: {
  nguoiGoi: string;
  handlerTruoc: TrangThaiPhuTrach;
  handlerSau: TrangThaiPhuTrach;
}): "nhan" | "giao" {
  const { nguoiGoi, handlerTruoc, handlerSau } = input;
  return !handlerTruoc.coNguoi && handlerSau.staffId === nguoiGoi ? "nhan" : "giao";
}

/**
 * Chờ nối lại (TD-2): lần `lan` (0, 1, 2…) → cơ số tăng gấp đôi `1000 * 2^lan`, trần 30000ms. Dưới trần: ngẫu nhiên đầy đủ (cơ số → 2×cơ số) để
 * lần 0 nằm trong [1000, 2000). Đã tới trần: chỉ thêm tối đa 20% (30000 → 36000) để không dồn mọi trình duyệt nối lại cùng lúc mà vẫn không vượt
 * 36 giây. `ngauNhien` là một số ĐÃ SINH trong [0, 1) (bên gọi truyền `Math.random()`) — tham số hoá để test tất định.
 */
export function choNoiLai(lan: number, ngauNhien: number): number {
  const coSo = Math.min(1000 * 2 ** lan, 30000);
  const heSoNgauNhien = coSo === 30000 ? 0.2 : 1;
  // floor (không round): ngauNhien ∈ [0,1) — round có thể đẩy một giá trị rất gần biên trên vượt qua biên (2000, 36000).
  return Math.floor(coSo + coSo * heSoNgauNhien * ngauNhien);
}

/** Thông báo nổi (TD-4): câu tiếng Việt đủ dấu (không mã thô) + đường dẫn mở khi bấm vào. */
export interface ThongBaoNoi {
  cau: string;
  lienKet: string;
}

/** Chỉ 4 loại thay đổi hiện thông báo nổi (TD-4) — `tao`, `tao_cho_nhan` (ADR-0045: lưu nháp không báo), `sua`, `chuyen`, `tien` chỉ làm mới màn hình, không nổi. */
const CAU_THONG_BAO: { [K in ThayDoiDon]?: (maDon: string) => string } = {
  nhan: (maDon) => `Đơn ${maDon} vừa có người nhận`,
  giao: (maDon) => `Đơn ${maDon} vừa đổi người phụ trách`,
  xac_nhan: (maDon) => `Đơn ${maDon} đã được xác nhận`,
  huy: (maDon) => `Đơn ${maDon} đã bị huỷ`,
};

/**
 * Tài khoản có được thấy tin về đơn không (TD-4, dùng chung cho thông báo nổi và hộp thông báo — ADR-0034 điều 3). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ (Q-C ADR-0022, điều 12 ADR-0014). Tin "chờ nhận" chỉ cho ai nhận được đơn chưa có người.
 */
export function duocThayTinDon(staff: PermissionHolder, choNhan: boolean): boolean {
  const vanPhong = isOffice(staff);
  if (!vanPhong && !hasPermission(staff, "FIELD")) return false;
  return !choNhan || can(staff, "dispatch.claim"); // ADR-0030 Task 1.4 đã lên main → `(can(staff, "dispatch.claim") && !holdsPartner(staff))`
}

/**
 * Có hiện thông báo nổi cho tài khoản `staff` khi nhận sự kiện `suKien` không, và nếu có thì câu gì + bấm vào đi đâu (TD-4). Đối tác/Thực tập
 * (không văn phòng, không Hướng dẫn viên) không bao giờ hiện (Q-C ADR-0022, điều 12 ADR-0014: chỉ chấm đếm, không thông báo nổi). `tao_cho_nhan`
 * chỉ hiện cho ai nhận được đơn chưa có người (`dispatch.claim`). Hướng dẫn viên bấm vào mở `/account` (hôm nay không mở được `/order`).
 */
export function thongBaoNoi(staff: PermissionHolder, suKien: SuKienDon): ThongBaoNoi | null {
  if (!duocThayTinDon(staff, suKien.thayDoi === "tao_cho_nhan")) return null;
  const dungCau = CAU_THONG_BAO[suKien.thayDoi];
  if (!dungCau) return null;
  return { cau: dungCau(suKien.maDon), lienKet: isOffice(staff) ? `/order?id=${suKien.orderId}` : "/account" };
}

const KHOA_SU_KIEN_HOP_LE = ["loai", "orderId", "maDon", "thayDoi", "luc"] as const;

/** Tin nhận được từ WebSocket có đúng hình dạng một `SuKienDon` không — trình duyệt bỏ qua tin lạ (khoá thừa hoặc `thayDoi` không thuộc `THAY_DOI`). */
export function laSuKienHopLe(x: unknown): x is SuKienDon {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const khoa = Object.keys(x);
  if (khoa.length !== KHOA_SU_KIEN_HOP_LE.length) return false;
  if (!KHOA_SU_KIEN_HOP_LE.every((k) => khoa.includes(k))) return false;
  const v = x as Record<string, unknown>;
  return (
    v.loai === "don" &&
    typeof v.orderId === "string" &&
    typeof v.maDon === "string" &&
    typeof v.luc === "string" &&
    (THAY_DOI as readonly string[]).includes(v.thayDoi as string)
  );
}
