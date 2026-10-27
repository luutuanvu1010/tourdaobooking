// Chữ thời gian và thiết bị cho trang Hỗ trợ (PR 3). THUẦN: không I/O, đồng hồ do người gọi đưa vào; bài ở thoi-gian-tuong-doi.test.ts.
// Giờ dân sự theo giờ Việt Nam (UTC+7, không có giờ mùa hè).

const VN_MS = 7 * 3_600_000;
const NGAY_MS = 86_400_000;

/** Dời mốc sang "giờ treo tường VN" để đọc bằng hàm getUTC*. */
const vn = (ms: number): Date => new Date(ms + VN_MS);
const hai = (n: number): string => String(n).padStart(2, "0");
/** Số ngày (nguyên) kể từ mốc 1970 theo lịch VN — so ngày với nhau không bị lệch múi giờ. */
const soNgay = (ms: number): number => Math.floor((ms + VN_MS) / NGAY_MS);

/**
 * «vừa xong» (< 1 phút) · «N phút trước» (< 60 phút) · «HH:mm» (cùng ngày VN) · «hôm qua» · «dd/mm» (cùng năm) · «dd/mm/yyyy» (khác năm).
 * Mốc ở tương lai (đồng hồ lệch) coi như «vừa xong».
 */
export function thoiGianTuongDoi(iso: string, now: Date): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const cach = now.getTime() - ms;
  if (cach < 60_000) return "vừa xong";
  if (cach < 3_600_000) return `${Math.floor(cach / 60_000)} phút trước`;
  const d = vn(ms);
  const nay = vn(now.getTime());
  const lech = soNgay(now.getTime()) - soNgay(ms);
  if (lech <= 0) return `${hai(d.getUTCHours())}:${hai(d.getUTCMinutes())}`;
  if (lech === 1) return "hôm qua";
  const dm = `${hai(d.getUTCDate())}/${hai(d.getUTCMonth() + 1)}`;
  return d.getUTCFullYear() === nay.getUTCFullYear() ? dm : `${dm}/${d.getUTCFullYear()}`;
}

/** «iPhone · Safari»… từ chuỗi trình duyệt; rỗng hoặc lạ ⇒ «Thiết bị khác». Thứ tự nhận: Edg trước Chrome; CriOS/FxiOS là Chrome/Firefox trên iOS. */
export function tomTatThietBi(ua: string | null): string {
  const s = ua ?? "";
  if (!s.trim()) return "Thiết bị khác";
  const iOS = /iPhone|iPad|iPod/.test(s);
  const may = /iPad/.test(s) ? "iPad" : /iPhone|iPod/.test(s) ? "iPhone" : /Android/.test(s) ? "Android" : /Macintosh|Mac OS X/.test(s) ? "Mac" : /Windows/.test(s) ? "Windows" : "";
  if (!may) return "Thiết bị khác";
  let trinhDuyet = "";
  if (/Edg(e|A|iOS)?\//.test(s)) trinhDuyet = "Edge";
  else if (/Firefox\/|FxiOS\//.test(s)) trinhDuyet = "Firefox";
  else if (/CriOS\/|Chrome\//.test(s)) trinhDuyet = "Chrome";
  else if (/Safari\//.test(s) || iOS) trinhDuyet = "Safari"; // Nền tảng đã cài lên iPhone không còn chữ Safari/ trong chuỗi
  return trinhDuyet ? `${may} · ${trinhDuyet}` : "Thiết bị khác";
}
