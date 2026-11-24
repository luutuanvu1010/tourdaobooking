// Bảng «động từ → cấp nút» (ADR-0234 Đ4, nguyên tắc 7: cùng một động từ thì cùng một cấp nút ở mọi màn). Cạnh bộ thành phần chung `.nut[data-cap]`.
// Cấp: "chinh" = nền đặc biển đậm (việc chính của màn, tối đa một nút đặc mỗi màn); "phu" = nền trắng viền mảnh; "loi" = lối chữ; "nguy-hiem" = viền đỏ
// (nền đặc đỏ chỉ trong hộp xác nhận). Nút chốt san hô (`data-tong="san-ho"`) không theo bảng này: tối đa một mỗi màn, do màn quyết.
// Khoá theo TỪ ĐẦU của chữ trên nút. Điểm khởi đầu 24/11/2026: theo cách dùng chiếm đa số và nghĩa của từ; các đợt khung gốc A tới F đưa nút về đúng bảng,
// bài `src/cap-nut.test.ts` khoá số nút còn lệch (trần chỉ được hạ). Đổi một dòng của bảng là đổi diện mạo nhiều màn: ghi lý do ở lần lưu.
export type CapNut = "chinh" | "phu" | "loi" | "nguy-hiem";

export const CAP_THEO_DONG_TU: Readonly<Record<string, CapNut>> = {
  Lưu: "chinh", Gửi: "chinh", Tạo: "chinh", Thêm: "chinh",
  Sửa: "phu", Đổi: "phu", Nhận: "phu", Gán: "phu", Quét: "phu", Về: "phu",
  Huỷ: "loi", Bỏ: "loi",
  Ngừng: "nguy-hiem", Xoá: "nguy-hiem",
};

/** Cấp nút đúng bảng cho chữ trên nút; `null` khi động từ đầu không có trong bảng. */
export function capTheoChu(chu: string): CapNut | null {
  const tu = chu.trim().split(/\s+/)[0] ?? "";
  return CAP_THEO_DONG_TU[tu] ?? null;
}
