// Ô tệp của phiếu đăng ký theo vai (ADR-0233). THUẦN, dùng chung máy chủ (`dang-ky` kiểm cổng, `parties` lọc ô của phần tổ chức lúc duyệt) và giao diện (vẽ ô).
// NGHĨA của từng ô (phần, tên hiện, có phải «Tệp khác») là MÃ ở đây; VAI NÀO THẤY Ô NÀO, BẮT BUỘC HAY KHÔNG là DỮ LIỆU (`dk_role_slot`, migration 0191).
// Ô mới có nghĩa mới = thêm vào `O_TEP` + dòng dữ liệu; đổi vai thấy ô cũ = chỉ thêm dòng.

export type PhanO = "CA_NHAN" | "TO_CHUC";
export type CachHien = "BAT_BUOC" | "TUY_CHON" | "AN";
export const CACH_HIEN: readonly CachHien[] = ["BAT_BUOC", "TUY_CHON", "AN"];

interface MoTaOTep { readonly phan: PhanO; readonly nhan: string; readonly tepKhac: boolean }
/** Mọi ô máy biết. Bốn ô đầu giữ đúng tên, nghĩa, nơi nối lúc duyệt của ADR-0208 Đ2 / ADR-0212 Đ4. «Tệp khác» chỉ mở khi chính sách riêng tư hiện hành có dấu (ADR-0233 Đ3). */
export const O_TEP: Readonly<Record<string, MoTaOTep>> = {
  CCCD_MAT_TRUOC: { phan: "CA_NHAN", nhan: "Ảnh mặt trước căn cước", tepKhac: false },
  CCCD_MAT_SAU: { phan: "CA_NHAN", nhan: "Ảnh mặt sau căn cước", tepKhac: false },
  TEP_KHAC: { phan: "CA_NHAN", nhan: "Tệp khác", tepKhac: true },
  GPKD: { phan: "TO_CHUC", nhan: "Ảnh giấy chứng nhận đăng ký kinh doanh", tepKhac: false },
  GIAY_PHEP_THEM: { phan: "TO_CHUC", nhan: "Ảnh giấy phép thêm", tepKhac: false },
  TEP_KHAC_TO_CHUC: { phan: "TO_CHUC", nhan: "Tệp khác của tổ chức", tepKhac: true },
};

export const laMaOTep = (s: unknown): s is string => typeof s === "string" && Object.hasOwn(O_TEP, s);
export const phanCuaO = (o: string): PhanO | null => (laMaOTep(o) ? O_TEP[o]!.phan : null);
/** Tên hiện của ô; mã lạ ⇒ chính mã (không bao giờ rỗng). */
export const nhanOTep = (o: string): string => (laMaOTep(o) ? O_TEP[o]!.nhan : o);
/** Ô của phần tổ chức — lô duyệt chuyển chúng sang hồ sơ TỔ CHỨC, không bao giờ về hồ sơ người. */
export const O_TEP_TO_CHUC: readonly string[] = Object.keys(O_TEP).filter((o) => O_TEP[o]!.phan === "TO_CHUC");

/** Một dòng `dk_role_slot` đang hiệu lực. `vai` rỗng = mọi vai của phần đó. */
export interface DongOTep { phan: PhanO; vai: string; o: string; cach: CachHien; thuTu: number }
export interface OCuaPhieu { o: string; phan: PhanO; batBuoc: boolean; nhan: string }

/**
 * Ô hiện ra cho MỘT phần của phiếu với vai `vai` (rỗng = chưa chọn vai): dòng có đúng mã vai THẮNG dòng «mọi vai» cùng ô; `AN` bỏ ô; mã ô máy chưa biết, ô sai phần, dòng sai phần
 * bị bỏ (đóng khi không rõ); ô «Tệp khác» chỉ khi `tepKhacMo`. Thứ tự: `thuTu` rồi mã ô.
 */
export function oTheoVai(dong: readonly DongOTep[], phan: PhanO, vai: string, dk: { tepKhacMo: boolean }): OCuaPhieu[] {
  const chon = new Map<string, DongOTep>();
  for (const d of dong) {
    if (d.phan !== phan || !laMaOTep(d.o) || O_TEP[d.o]!.phan !== phan) continue;
    if (d.vai !== "" && d.vai !== vai) continue;
    const cu = chon.get(d.o);
    if (!cu || (cu.vai === "" && d.vai !== "")) chon.set(d.o, d);
  }
  return [...chon.values()]
    .filter((d) => d.cach !== "AN" && (dk.tepKhacMo || !O_TEP[d.o]!.tepKhac))
    .sort((a, b) => a.thuTu - b.thuTu || (a.o < b.o ? -1 : a.o > b.o ? 1 : 0))
    .map((d) => ({ o: d.o, phan, batBuoc: d.cach === "BAT_BUOC", nhan: O_TEP[d.o]!.nhan }));
}

/** Mọi ô của phiếu: phần cá nhân (vai cá nhân, rỗng được), cộng phần tổ chức khi phiếu có phần đó. */
export function oCuaPhieu(dong: readonly DongOTep[], v: { vaiCaNhan: string; vaiToChuc: string | null; coToChuc: boolean; tepKhacMo: boolean }): OCuaPhieu[] {
  const dk = { tepKhacMo: v.tepKhacMo };
  return [...oTheoVai(dong, "CA_NHAN", v.vaiCaNhan, dk), ...(v.coToChuc ? oTheoVai(dong, "TO_CHUC", v.vaiToChuc ?? "", dk) : [])];
}

/** Ô bắt buộc chưa có tệp ĐÃ LƯU, theo thứ tự ô. */
export const oBatBuocThieu = (o: readonly OCuaPhieu[], tep: readonly { slot: string; daLuu: boolean }[]): OCuaPhieu[] =>
  o.filter((x) => x.batBuoc && !tep.some((t) => t.slot === x.o && t.daLuu));

// ---- Tệp Word (chủ dự án 21/11, Việc 14: «còn lại áp dụng như khuyến nghị» — KHÔNG nhận) ----
/** Câu khi người đăng ký chọn tệp Word: phiếu chỉ nhận bốn loại (ADR-0208 Đ2); Word có thể chứa macro nên không nhận. */
export const CAU_TEP_WORD = "Tệp Word: hãy lưu thành PDF rồi gửi.";
/** Đầu tệp giống Word: .doc (khuôn OLE `D0 CF 11 E0 A1 B1 1A E1`) hoặc .docx (khuôn ZIP `PK 03 04`). Chỉ để chọn CÂU báo — tệp vẫn bị từ chối như mọi loại ngoài bốn loại. */
export function giongTepWord(dau: Uint8Array): boolean {
  const bat = (sig: readonly number[]) => dau.length >= sig.length && sig.every((x, i) => dau[i] === x);
  return bat([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) || bat([0x50, 0x4b, 0x03, 0x04]);
}

/** Ô đang có tệp mà không thuộc danh sách ô của phiếu (đổi vai, ô bị tắt, «Tệp khác» bị đóng) — người đăng ký phải gỡ trước khi gửi. */
export const oNgoaiPhieu = (o: readonly OCuaPhieu[], tep: readonly { slot: string }[]): string[] =>
  [...new Set(tep.map((t) => t.slot))].filter((s) => !o.some((x) => x.o === s));
