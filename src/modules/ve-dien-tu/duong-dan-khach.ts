// Luật thuần của đường dẫn riêng cho khách (ADR-0153 Đ2): token ngẫu nhiên, băm, hạn, so hằng thời gian, và trang HTML công khai. Không I/O.
// Trang khách chỉ có: ảnh vé, nhãn nhóm khách, khoảng ngày dùng. KHÔNG tên khách, mã đơn, giá, dịch vụ khác, mã vé.
import { bamSha256 } from "../../shared/tep-dinh-kem.ts";
import { NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG } from "../../shared/ve-nhap-lo.ts";
import { NHAN_NHOM } from "./cap-ve.ts";
import type { Nhom } from "./rules.ts";

/** 32 byte ngẫu nhiên (256 bit) dạng base64url, 43 ký tự. Chỉ trả cho nhân viên MỘT lần lúc tạo; D1 chỉ lưu băm. */
export function taoToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export const bamToken = (token: string): Promise<string> => bamSha256(new TextEncoder().encode(token));
export const DANG_TOKEN = /^[A-Za-z0-9_-]{43,86}$/;

/** Hạn = cuối ngày (giờ Việt Nam, UTC+7) của ngày dùng cuối của vé + 7 ngày; trả ISO UTC. `denNgay` = YYYY-MM-DD. */
export function hanDuongDan(denNgayCuoi: string): string {
  const [y, m, d] = denNgayCuoi.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG + 1, 0, 0, 0, 0) - 7 * 3600 * 1000 - 1).toISOString();
}

/** So hai chuỗi băm không thoát sớm ở ký tự khác đầu tiên (độ dài khác ⇒ sai, độ dài băm không phải bí mật). */
export function soSanhHangThoiGian(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let khac = 0;
  for (let i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return khac === 0;
}

const NGAY_VN = (iso: string): string => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const THOAT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const thoat = (s: string): string => s.replace(/[&<>"']/g, (c) => THOAT[c]!);

export interface VeTrang { slot: number; nhom: Nhom; tuNgay: string; denNgay: string }

/** Trang HTML công khai. Chữ đều được thoát; ảnh trỏ về route ảnh cùng token (token ở đây chỉ gồm [A-Za-z0-9_-]). Không script. */
export function trangVeKhach(token: string, ve: readonly VeTrang[], conCho = 0): string {
  // ADR-0171 Đ2 mục 5: chỉ nói còn vé chưa sẵn sàng, KHÔNG nói chuyện tiền của đơn.
  const cho = conCho > 0 ? `<p class="cho">Còn ${Math.floor(conCho)} vé chưa sẵn sàng. Bạn liên hệ người đặt giúp.</p>` : "";
  const the = ve.map((v) => `<figure><img src="/api/ve-khach/${thoat(token)}/anh/${v.slot}" alt="Vé ${v.slot}"><figcaption>Vé ${v.slot} · ${thoat(NHAN_NHOM[v.nhom])} · dùng từ ${NGAY_VN(v.tuNgay)} đến ${NGAY_VN(v.denNgay)}</figcaption></figure>`).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Vé của bạn</title>`
    + `<style>body{margin:0;padding:16px;font:16px/1.5 system-ui,sans-serif;background:#fff;color:#111}h1{font-size:20px;margin:0 0 12px}figure{margin:0 0 20px}img{display:block;max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px}figcaption{margin-top:6px;color:#444}</style></head>`
    + `<body><h1>Vé của bạn</h1>${the}${cho}</body></html>`;
}
