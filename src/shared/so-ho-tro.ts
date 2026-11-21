// Luật THUẦN «Hotline trên vé» của vé Tour Đảo (ADR-0231): một nguồn cho máy chủ (ô theo dịch vụ, lô vé) và giao diện (màn Dịch vụ & giá, form Tạo vé).
// Khác `normalizePhone` (src/shared/phone.ts — chỉ số di động 10 chữ số dùng đăng nhập): số in trên vé còn được là số bàn (02… 11 chữ số) và tổng đài 1900/1800.
// Không I/O, không import module. Số KHÔNG BAO GIỜ vào nhật ký (CLAUDE.md §7). Test cạnh tệp: so-ho-tro.test.ts.

export type KqSoHoTro = { ok: true; so: string } | { ok: false; cau: string };

/** Câu lỗi chung (không nhắc lại số người dùng gõ). */
export const CAU_SO_HO_TRO_SAI = "Hotline trên vé phải là số di động hoặc số bàn bắt đầu bằng 0, hoặc tổng đài 1900, 1800.";

/** Số dạng chuẩn để lưu: chỉ chữ số. Di động `0` + 9 số; số bàn `02` + 9 số; tổng đài `1900`/`1800` + 4 hoặc 6 số. */
export const DANG_SO_HO_TRO = /^(?:0[1-9]\d{8}|02\d{9}|1[89]00(?:\d{4}|\d{6}))$/;

/** Bỏ khoảng trắng, chấm, gạch, ngoặc; `+84`/`84` đầu số thành `0`. Sai dạng → câu lỗi tiếng Việt. */
export function chuanHoaSoHoTro(vao: string): KqSoHoTro {
  let p = vao.replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = `0${p.slice(3)}`;
  else if (/^84\d{9,10}$/.test(p)) p = `0${p.slice(2)}`;
  return DANG_SO_HO_TRO.test(p) ? { ok: true, so: p } : { ok: false, cau: CAU_SO_HO_TRO_SAI };
}

/** Cách in số dạng chuẩn cho dễ đọc: «0905 123 456», «0258 3812 345», «1900 1234», «1900 123 456». Chuỗi không đúng dạng chuẩn thì trả nguyên. */
export function inSoHoTro(so: string): string {
  if (!DANG_SO_HO_TRO.test(so)) return so;
  if (/^1[89]00/.test(so)) return so.length === 8 ? `${so.slice(0, 4)} ${so.slice(4)}` : `${so.slice(0, 4)} ${so.slice(4, 7)} ${so.slice(7)}`;
  if (so.length === 11) return `${so.slice(0, 4)} ${so.slice(4, 8)} ${so.slice(8)}`;
  return `${so.slice(0, 4)} ${so.slice(4, 7)} ${so.slice(7)}`;
}

/** Số điền sẵn ở form Tạo vé: số của dịch vụ nếu có, không thì hotline công ty (chuẩn hoá được thì chuẩn hoá, không thì để nguyên cho người tạo sửa). */
export function soDienSan(soDichVu: string | null, hotlineCongTy: string): string {
  if (soDichVu) return inSoHoTro(soDichVu);
  const c = chuanHoaSoHoTro(hotlineCongTy);
  return c.ok ? inSoHoTro(c.so) : hotlineCongTy.trim();
}
