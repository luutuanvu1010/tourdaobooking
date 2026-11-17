// Lượt Cron 15 phút «7 giờ sáng giờ Việt Nam» (00:00–00:14 UTC; giờ VN không đổi theo mùa) — Đợt 2 sau kiểm toán. MỘT nguồn cho soát tiền hằng ngày
// (src/modules/audit/soat-tien-hang-ngay.ts) và thư báo việc tự động lỗi (src/bao-loi-dinh-gio.ts).
export function laLuotBayGioSang(scheduledTime: number): boolean {
  const d = new Date(scheduledTime);
  return d.getUTCHours() === 0 && d.getUTCMinutes() < 15;
}
