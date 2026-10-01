// Vị trí và cỡ khung "Hỗ trợ" (kế hoạch docs/superpowers/plans/2026-10-01-khung-tro-ly-keo-doi-co.md): mặc định góc phải dưới, kéo bằng thanh tiêu đề,
// đổi cỡ bằng tay nắm góc TRÊN-TRÁI (góc phải dưới đứng yên), luôn kẹp trong khung nhìn đang thấy (visualViewport — bàn phím ảo làm khung nhìn co).
// Thuần, KHÔNG import gì: web/tro-ly.ts nạp ở mọi trang. Đơn vị: điểm ảnh CSS của trình duyệt, toạ độ theo khung nhìn bố cục (position: fixed).
// Vị trí LƯU theo khoảng cách tới mép PHẢI và mép DƯỚI (không theo x/y) để xoay máy / đổi cỡ cửa sổ khung vẫn bám góc phải dưới.

/** Khung nhìn đang thấy: x/y = offsetLeft/offsetTop của visualViewport, w/h = bề rộng / chiều cao. */
export interface KhungNhin { x: number; y: number; w: number; h: number }
/** Vùng an toàn (env(safe-area-inset-*), đo lúc chạy). */
export interface VungAnToan { tren: number; phai: number; duoi: number; trai: number }
/** Hộp đang vẽ: toạ độ góc trên-trái + cỡ. */
export interface Hop { x: number; y: number; w: number; h: number }
/** Vị trí lưu trong máy: khoảng cách mép phải khung → mép phải khung nhìn, mép dưới → mép dưới; cỡ. */
export interface ViTri { phai: number; day: number; w: number; h: number }

/** Lề tối thiểu giữa khung và mép khung nhìn. */
export const LE = 8;
/** Cỡ nhỏ nhất: vẫn đọc được một câu trả lời ngắn và ô gõ. Khung nhìn nhỏ hơn thế (bàn phím mở ở máy nhỏ) thì cỡ lớn nhất thắng. */
export const CO_NHO = { w: 260, h: 300 } as const;
/** Cỡ mặc định: rộng 360, cao tối đa 460 và không quá nửa chiều cao khung nhìn. */
export const CO_MAC_DINH = { w: 360, h: 460 } as const;
const TRAN = 10000;

interface Bien { trai: number; tren: number; phai: number; duoi: number }

function bien(kn: KhungNhin, at: VungAnToan): Bien {
  return {
    trai: kn.x + Math.max(LE, at.trai),
    tren: kn.y + Math.max(LE, at.tren),
    phai: kn.x + kn.w - Math.max(LE, at.phai),
    duoi: kn.y + kn.h - Math.max(LE, at.duoi),
  };
}

const kepSo = (v: number, nho: number, lon: number): number => Math.max(nho, Math.min(v, lon));
/** Cỡ trong [nhỏ nhất, chỗ có]; chỗ có nhỏ hơn cỡ nhỏ nhất thì lấy chỗ có. */
const kepCo = (v: number, nho: number, co: number): number => Math.min(Math.max(v, nho), Math.max(0, co));

/** Kẹp hộp trong khung nhìn (chừa lề và vùng an toàn): cỡ trước, vị trí sau. */
export function kep(hop: Hop, kn: KhungNhin, at: VungAnToan): Hop {
  const b = bien(kn, at);
  const w = Math.round(kepCo(hop.w, CO_NHO.w, b.phai - b.trai));
  const h = Math.round(kepCo(hop.h, CO_NHO.h, b.duoi - b.tren));
  return { x: Math.round(kepSo(hop.x, b.trai, b.phai - w)), y: Math.round(kepSo(hop.y, b.tren, b.duoi - h)), w, h };
}

/** Vị trí mặc định: góc phải dưới; `chuaDay` = khoảng chừa ở đáy (nút "Hỗ trợ" + khe hở), `chuaPhai` = khoảng cách mép phải của nút tới mép khung nhìn. */
export function macDinh(kn: KhungNhin, at: VungAnToan, chuaDay: number, chuaPhai: number): ViTri {
  const phai = Math.max(LE, at.phai, chuaPhai);
  // Máy hẹp: lề trái bằng lề phải (không dính mép trái).
  const w = Math.max(CO_NHO.w, Math.min(CO_MAC_DINH.w, kn.w - 2 * phai));
  const h = Math.max(CO_NHO.h, Math.min(CO_MAC_DINH.h, Math.floor(kn.h / 2)));
  return { phai, day: Math.max(LE, at.duoi, chuaDay), w, h };
}

/** Vị trí lưu → hộp vẽ trong khung nhìn hiện tại (đã kẹp). */
export function hopTuViTri(v: ViTri, kn: KhungNhin, at: VungAnToan): Hop {
  const b = bien(kn, at);
  // Cỡ kẹp trước để mép phải / mép dưới giữ đúng khoảng cách đã lưu khi còn chỗ.
  const w = kepCo(v.w, CO_NHO.w, b.phai - b.trai);
  const h = kepCo(v.h, CO_NHO.h, b.duoi - b.tren);
  return kep({ x: kn.x + kn.w - v.phai - w, y: kn.y + kn.h - v.day - h, w, h }, kn, at);
}

/** Hộp vẽ → vị trí lưu. */
export function viTriTuHop(hop: Hop, kn: KhungNhin): ViTri {
  return { phai: Math.round(kn.x + kn.w - hop.x - hop.w), day: Math.round(kn.y + kn.h - hop.y - hop.h), w: Math.round(hop.w), h: Math.round(hop.h) };
}

/** Kéo bằng thanh tiêu đề: dời (dx, dy) từ hộp lúc bắt đầu kéo, rồi kẹp. */
export function keo(hop0: Hop, dx: number, dy: number, kn: KhungNhin, at: VungAnToan): Hop {
  return kep({ ...hop0, x: hop0.x + dx, y: hop0.y + dy }, kn, at);
}

/** Đổi cỡ bằng tay nắm góc trên-trái: góc phải dưới đứng yên; cỡ trong [nhỏ nhất, chỗ còn tới mép trái / mép trên]. */
export function doiCo(hop0: Hop, dx: number, dy: number, kn: KhungNhin, at: VungAnToan): Hop {
  const b = bien(kn, at);
  const phai = Math.min(hop0.x + hop0.w, b.phai);
  const duoi = Math.min(hop0.y + hop0.h, b.duoi);
  const w = kepCo(hop0.w - dx, CO_NHO.w, phai - b.trai);
  const h = kepCo(hop0.h - dy, CO_NHO.h, duoi - b.tren);
  return kep({ x: phai - w, y: duoi - h, w, h }, kn, at);
}

const soHopLe = (v: unknown, nho: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= nho && v <= TRAN;

/** Đọc vị trí đã lưu; hỏng / thiếu / ngoài khoảng ⇒ null (dùng mặc định). */
export function docViTri(raw: string | null): ViTri | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const { phai, day, w, h } = o as Record<string, unknown>;
  if (!soHopLe(phai, 0) || !soHopLe(day, 0) || !soHopLe(w, 1) || !soHopLe(h, 1)) return null;
  return { phai, day, w, h };
}

export function ghiViTri(v: ViTri): string {
  return JSON.stringify({ phai: v.phai, day: v.day, w: v.w, h: v.h });
}

/**
 * Mã cuộc trò chuyện (ADR-0073 N1): UUID v4 dựng từ ĐÚNG 16 byte ngẫu nhiên do nơi gọi đưa (crypto.getRandomValues) — dùng được cả trang mở bằng http://<IP LAN>
 * khi thử iPhone (crypto.randomUUID chỉ có trong ngữ cảnh an toàn — R5). Máy chủ kiểm bằng UUID_RE (src/shared/http.ts). Không sửa mảng đầu vào.
 */
export function taoMaCuoc(b: Uint8Array): string {
  if (b.length !== 16) throw new Error("Cần đúng 16 byte ngẫu nhiên.");
  const x = Uint8Array.from(b);
  x[6] = (x[6]! & 0x0f) | 0x40;
  x[8] = (x[8]! & 0x3f) | 0x80;
  const hex = [...x].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
