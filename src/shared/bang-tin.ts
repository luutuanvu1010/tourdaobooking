// BẢNG TIN (ADR-0022) — hàm thuần dùng chung server ↔ web/: nhãn (tag) của một kết nối/sự kiện (Task 1). Không I/O, không API
// Worker/Node — chỉ import ./permissions.ts (điều 3 ADR-0022: nhóm nhận suy từ ô `order.view`/`dispatch.claim` hiện hành, không đặt luật
// quyền mới ở đây). Sự kiện chỉ gồm đúng 5 khoá của điều 4 (không tiền, không SĐT, không tên người) — thêm trường = đổi ADR.

import { can, type PermissionHolder } from "./permissions.ts";

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
