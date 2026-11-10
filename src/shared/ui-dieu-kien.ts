// Điều kiện hiển thị của bảng điều khiển giao diện (ADR-0195 Đ1): DANH SÁCH KHAI SẴN trong mã, không cho gõ tự do. Mỗi điều kiện có mã, tên tiếng Việt và một hàm THUẦN trả đúng/sai từ dữ liệu của
// MỘT dịch vụ (không I/O, không import module). Dùng chung máy chủ (tính từ GIÁ TRỊ HIỆU LỰC của dịch vụ sau `validateOrder`) ↔ giao diện (tính lại khi người dùng đổi lựa chọn đón).
//
// Khởi đầu chỉ hai điều kiện, loại trừ nhau; dịch vụ CHƯA chọn đón (`pickupChoice` null / vắng) không thoả điều kiện nào ⇒ chỉ dòng chính sách «không điều kiện» áp cho dịch vụ đó.
// Thứ tự trong `DIEU_KIEN` là thứ tự ƯU TIÊN khi (về sau) một dịch vụ thoả nhiều điều kiện. Thêm điều kiện: ADR nhỏ riêng (ADR-0195 «Ba điều chủ quyết», 1).
import type { LuaChonDon } from "./khung-gio-don.ts";

export const DIEU_KIEN = ["DICH_VU_KHONG_DON", "DICH_VU_CO_DON"] as const;
export type DieuKien = (typeof DIEU_KIEN)[number];
export const laDieuKien = (v: unknown): v is DieuKien => typeof v === "string" && (DIEU_KIEN as readonly string[]).includes(v);

/** Phần dữ liệu của một dịch vụ mà các điều kiện cần (giá trị HIỆU LỰC — nơi gọi lo việc «vắng khoá = giữ giá trị đang lưu»). */
export interface DuLieuDieuKien { pickupChoice?: LuaChonDon | null }

const HAM: Readonly<Record<DieuKien, (d: DuLieuDieuKien) => boolean>> = {
  DICH_VU_KHONG_DON: (d) => d.pickupChoice === "KHONG_DON",
  DICH_VU_CO_DON: (d) => d.pickupChoice === "DON",
};

/** Dịch vụ này thoả điều kiện nào (theo thứ tự `DIEU_KIEN`). */
export const dieuKienCuaDichVu = (d: DuLieuDieuKien): DieuKien[] => DIEU_KIEN.filter((k) => HAM[k](d));

/**
 * Tên TẠM (chờ chủ chọn — `cho-chon`, ADR-0195 «Tên chưa có trong bảng tham chiếu»; phương án khác: «Khi không đón» / «Khi có đón», «Đơn không đón» / «Đơn có đón»).
 * Chữ thật hiện ở màn chỉnh; không lộ mã.
 */
export const NHAN_DIEU_KIEN: Readonly<Record<DieuKien, string>> = { DICH_VU_KHONG_DON: "Dịch vụ không đón", DICH_VU_CO_DON: "Dịch vụ có đón" };
