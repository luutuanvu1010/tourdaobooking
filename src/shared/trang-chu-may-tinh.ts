// Luật thuần của Trang chủ MÁY TÍNH (≥641px) — bản vẽ "Trang chu may tinh v2.dc.html" (Claude Design 2026-10-02, lệnh
// docs/superpowers/specs/2026-10-02-trang-chu-may-tinh-lenh-claude-design.md). Không I/O, có test cạnh tệp; web/home.ts dựng giao diện.
// Ba việc: số cột của từng nhóm ô trong dải chào, lời chào theo buổi, dòng thời gian của khối Chuyến đón.
import { vnHour } from "./vn-date.ts";

/** Ô rộng tối thiểu (bản vẽ: "ô rộng ≥ 88px"), khe giữa hai ô, và phần một nhóm (trừ nhóm đầu) chiếm thêm: khe 16 + vạch 1 + đệm 16. */
const O_MIN = 88;
const O_KHE = 4;
const NHOM_THEM = 33;
/** Bản vẽ: "giữ tối đa 2–3 hàng" — quá ba hàng thì xếp chồng nhóm (như khổ 768 của bản vẽ). */
const HANG_TOI_DA = 3;

/**
 * Số cột của từng nhóm khi các nhóm đứng thành MỘT hàng ngang (bản vẽ 1280/1440), hoặc `null` = không vừa → xếp chồng nhóm (bản vẽ 768).
 * Thử từ ít hàng tới nhiều: với r hàng, nhóm n ô có max(⌈n/r⌉, min(n, 2)) cột (nhóm 3 ô vẫn 2 cột như bản vẽ, không dồn một cột cao). Chọn r nhỏ nhất
 * mà mọi ô ≥ 88px khi chia bề rộng như CSS chia (`flex: <số cột> 1 0` — phần còn lại sau khe/đệm chia theo tỉ lệ số cột). Tái tạo đúng bảng LCOLS
 * của bản vẽ (bài test); khổ bản vẽ không vẽ (900–1279px) theo cùng một luật.
 */
export function cotNhom(soO: readonly number[], rong: number): number[] | null {
  if (soO.length === 0 || !(rong > 0)) return null;
  const W = rong - NHOM_THEM * (soO.length - 1);
  for (let r = 1; r <= HANG_TOI_DA; r++) {
    const c = soO.map((n) => Math.max(Math.ceil(n / r), Math.min(n, 2)));
    const tong = c.reduce((a, b) => a + b, 0);
    if (c.every((ci) => (W * ci) / tong - O_KHE * (ci - 1) >= O_MIN * ci)) return c;
  }
  return null;
}

/** Phút trong ngày theo giờ Việt Nam. Lệch UTC+7 là số giờ chẵn nên phút giữ nguyên phút UTC. */
export function phutVN(now: Date): number {
  return vnHour(now) * 60 + now.getUTCMinutes();
}

/**
 * Lời chào đầu dải (bản vẽ: "Chào buổi sáng, <tên>"). Bản vẽ chỉ vẽ buổi sáng; mốc các buổi là GIẢ ĐỊNH của phiên thi công (ghi ở báo cáo):
 * 04:00–10:59 sáng, 11:00–12:59 trưa, 13:00–17:59 chiều, còn lại tối.
 */
export function loiChao(phut: number): string {
  if (phut >= 240 && phut < 660) return "Chào buổi sáng";
  if (phut >= 660 && phut < 780) return "Chào buổi trưa";
  if (phut >= 780 && phut < 1080) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/** "còn 15 phút" / "còn 1 giờ 15 phút" / "đến giờ đón" — viên "Sắp tới · …" của chuyến kế tiếp. */
export function conLai(phut: number): string {
  if (phut <= 0) return "đến giờ đón";
  const gio = Math.floor(phut / 60);
  const p = phut % 60;
  if (gio === 0) return `còn ${p} phút`;
  return p === 0 ? `còn ${gio} giờ` : `còn ${gio} giờ ${p} phút`;
}

const hhmm = (phut: number): string => `${String(Math.floor(phut / 60)).padStart(2, "0")}:${String(phut % 60).padStart(2, "0")}`;
const docGio = (s: string | null): number | null => {
  const m = s ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export type LoaiChuyen = "qua" | "toi" | "sau";

export interface DongThoiGian {
  /** Đầu, cuối khoảng (phút trong ngày): giờ chẵn trước chuyến sớm nhất → giờ chẵn sau chuyến muộn nhất. */
  dau: number;
  cuoi: number;
  /** Vạch mỗi giờ; `nhan` null = vạch không nhãn (khoảng dài thì thưa nhãn để chữ không chồng nhau, tối đa 7 nhãn). `tiLe` 0…1 theo bề ngang. */
  vach: { tiLe: number; nhan: string | null }[];
  /** Chấm từng chuyến, cùng thứ tự danh sách; `null` = chuyến không có giờ đón (không có chấm). */
  diem: ({ tiLe: number } | null)[];
  /** Loại từng chuyến (cùng thứ tự): đã qua (giờ xám, chấm rỗng), sắp tới (chuyến đầu tiên có giờ ≥ bây giờ), sau. `null` = không có giờ đón. */
  loai: (LoaiChuyen | null)[];
  /** Chỉ số chuyến sắp tới, −1 nếu không có. */
  toi: number;
  /** Số phút tới chuyến sắp tới (`null` nếu không có). */
  conLaiPhut: number | null;
  /** Vạch "Bây giờ HH:MM" — chỉ hôm nay VÀ khi bây giờ nằm trong khoảng; ngoài khoảng thì ẩn (không ghim ở mép gây hiểu sai). */
  bayGio: { tiLe: number; nhan: string } | null;
}

/**
 * Dòng thời gian của khối Chuyến đón (bản vẽ v2, chỉ máy tính). `bayGio` = phút hiện tại theo giờ VN khi đang xem HÔM NAY, `null` với Ngày mai / Ngày kia
 * (không chuyến nào "đã qua" hay "sắp tới"). Không có chuyến nào có giờ đón → `null` (không vẽ dòng thời gian).
 */
export function dongThoiGian(gioDon: readonly (string | null)[], bayGio: number | null): DongThoiGian | null {
  const phut = gioDon.map(docGio);
  const co = phut.filter((p): p is number => p !== null);
  if (co.length === 0) return null;
  const dau = Math.floor(Math.min(...co) / 60) * 60;
  const cuoi = Math.ceil((Math.max(...co) + 1) / 60) * 60;
  const tiLe = (p: number): number => (p - dau) / (cuoi - dau);
  const soGio = (cuoi - dau) / 60;
  const buoc = Math.max(1, Math.ceil(soGio / 6));
  const vach: DongThoiGian["vach"] = [];
  for (let m = dau, i = 0; m <= cuoi; m += 60, i++) vach.push({ tiLe: tiLe(m), nhan: i % buoc === 0 ? hhmm(m) : null });
  // Chuyến sắp tới = giờ sớm nhất từ bây giờ trở đi (trùng giờ: chuyến đứng trước trong danh sách) — không dựa vào thứ tự danh sách.
  let toi = -1;
  if (bayGio !== null) for (const [i, p] of phut.entries()) if (p !== null && p >= bayGio && (toi === -1 || p < phut[toi]!)) toi = i;
  const loai = phut.map((p, i): LoaiChuyen | null => (p === null ? null : i === toi ? "toi" : bayGio !== null && p < bayGio ? "qua" : "sau"));
  return {
    dau,
    cuoi,
    vach,
    diem: phut.map((p) => (p === null ? null : { tiLe: tiLe(p) })),
    loai,
    toi,
    conLaiPhut: toi === -1 || bayGio === null ? null : phut[toi]! - bayGio,
    bayGio: bayGio !== null && bayGio >= dau && bayGio <= cuoi ? { tiLe: tiLe(bayGio), nhan: `Bây giờ ${hhmm(bayGio)}` } : null,
  };
}
