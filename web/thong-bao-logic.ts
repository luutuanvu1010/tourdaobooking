// Logic hiển thị THUẦN của chuông/hộp thông báo (ADR-0034) — tách khỏi DOM để test bằng node --test.
import type { TinDto } from "../src/shared/contracts.ts";
import { ngayNgan } from "../src/shared/vn-date.ts";

const VN = 7 * 3600000;
const ngayVN = (iso: string) => new Date(Date.parse(iso) + VN).toISOString().slice(0, 10);
/** Giờ:phút tuyệt đối theo giờ Việt Nam (không rút gọn thành "x phút trước" như `thoiGian`) — dùng ở hộp đọc tin thủ công (dòng "… gửi hôm nay lúc HH:mm"). */
export const gioVN = (iso: string) => new Date(Date.parse(iso) + VN).toISOString().slice(11, 16);
const homQua = (ymd: string) => new Date(Date.parse(ymd + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

export const nhanSo = (n: number): string => (n <= 0 ? "" : n > 9 ? "9+" : String(n));
export function thoiGian(luc: string, now: string): string {
  const phut = Math.floor((Date.parse(now) - Date.parse(luc)) / 60000);
  if (phut >= 0 && phut < 60) return `${Math.max(phut, 1)} phút trước`;
  const d = ngayVN(luc), hn = ngayVN(now);
  if (d === hn) return gioVN(luc);
  if (d === homQua(hn)) return `Hôm qua ${gioVN(luc)}`;
  return `${ngayNgan(d, hn)} ${gioVN(luc)}`;
}
export function nhomTheoNgay(tin: TinDto[], now: string): { nhan: string; tin: TinDto[] }[] {
  const hn = ngayVN(now), out: { nhan: string; tin: TinDto[] }[] = [];
  for (const t of tin) {
    const d = ngayVN(t.luc);
    const nhan = d === hn ? "Hôm nay" : d === homQua(hn) ? "Hôm qua" : ngayNgan(d, hn);
    const cuoi = out[out.length - 1];
    if (cuoi?.nhan === nhan) cuoi.tin.push(t); else out.push({ nhan, tin: [t] });
  }
  return out;
}
