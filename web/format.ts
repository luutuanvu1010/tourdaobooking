import { AUDIT_ACTIONS } from "../src/shared/audit-actions";
import type { AuditAction, DepositMethod, OrderStatus } from "./api";

const nf = new Intl.NumberFormat("vi-VN");

/** 1350000 → "1.350.000 ₫" */
export const vnd = (n: number): string => `${nf.format(n)} ₫`;
export const grouped = (n: number): string => nf.format(n);

/** "1.350.000 đ" / "1350000" → 1350000; rỗng → 0. */
export function parseMoney(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export const dateTime = (iso: string): string =>
  new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STATUS_LABEL: Record<OrderStatus, string> = { draft: "Nháp", confirmed: "Đã xác nhận", cancelled: "Đã huỷ" };

export const METHOD_LABEL: Record<DepositMethod, string> = { cash: "Tiền mặt", bank_transfer: "Chuyển khoản", other: "Khác" };

/** Nhãn hành động nhật ký — lấy từ nguồn duy nhất src/shared/audit-actions.ts. Hành động lạ (bản mới hơn giao diện) hiện mã thô. */
export const actionLabel = (a: AuditAction): string => AUDIT_ACTIONS[a]?.label ?? a;

/** "Hoàng Gia Huy" → "HH": chữ cái đầu của họ và tên (từ đầu + từ cuối); một từ thì lấy chữ đầu. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("vi-VN");
}
