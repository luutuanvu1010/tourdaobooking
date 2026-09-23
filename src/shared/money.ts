// Định dạng tiền VNĐ rút gọn — logic thuần, không I/O, một nguồn cho server và giao diện (đúng quy ước src/shared/).

/**
 * Tiền rút gọn cho khổ điện thoại hẹp (Trang chủ mới, Đợt D): 0 → "0", 900.000 → "900k", 1.200.000 → "1,2tr",
 * 8.780.000 → "8,78tr", 24.150.000 → "24,15tr". KHÔNG bao giờ làm tròn LÊN (luôn cắt bớt phần dư) — số hiển thị không
 * bao giờ lớn hơn số thật. Không tự thêm " ₫", gọi nơi dùng tự nối nếu cần (giống bản mẫu: có chỗ có "₫", có chỗ không).
 */
export function vndShort(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}${abs}`;
  if (abs < 1_000_000) return `${sign}${Math.floor(abs / 1000)}k`;
  const hundredths = Math.floor(abs / 10_000); // 1 triệu = 100 đơn vị "phần trăm triệu"; cắt bớt, không làm tròn lên
  const trieu = Math.floor(hundredths / 100);
  const le = hundredths % 100;
  const decimal = le === 0 ? "" : le % 10 === 0 ? `,${le / 10}` : `,${String(le).padStart(2, "0")}`;
  return `${sign}${trieu}${decimal}tr`;
}
