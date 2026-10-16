// Nhãn tiếng Việt của loại liên hệ (ADR-0122 đ6: thêm ADDRESS) — MỘT nguồn cho máy chủ (xem trước gộp hồ sơ) và giao diện (bảng liên hệ Danh bạ). Thuần, không I/O.
import type { ContactPointDto } from "./contracts.ts";

export const NHAN_LOAI_LIEN_HE: Record<ContactPointDto["kind"], string> = { PHONE: "Điện thoại", EMAIL: "Email", ADDRESS: "Địa chỉ" };
export const nhanLoaiLienHe = (kind: string): string => (NHAN_LOAI_LIEN_HE as Record<string, string>)[kind] ?? "Liên hệ";
