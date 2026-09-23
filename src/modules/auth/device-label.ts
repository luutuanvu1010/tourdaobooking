// Tên máy hiện trong danh sách passkey (ADR-0016 điều 8: không chứa SĐT). Chỉ đoán loại máy từ User-Agent. THUẦN.
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/.test(ua)) return "Máy Mac";
  if (/Windows/.test(ua)) return "Máy Windows";
  return "Thiết bị khác";
}
