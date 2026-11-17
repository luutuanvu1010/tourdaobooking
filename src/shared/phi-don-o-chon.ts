// Ô «Phí đưa đón» của một lượt đón (ADR-0214, Task 6): giá trị ô ↔ mức gửi lên máy chủ. Thuần, dùng ở biểu mẫu đơn và bảng Còn vé. KHÔNG tính tiền (số tiền trên đơn là số
// máy chủ trả sau khi lưu). Kiểm bằng ĐÚNG `kiemMucChon` của máy chủ nên câu báo giống hệt câu 400 (điểm dễ hỏng 5).
import { CAU_KHONG_HOP_LE_PHI_DON, CAU_VUOT_TRAN_PHI_DON, DANH_SACH_PHI_DON, kiemMucChon, type MucChon } from "./phi-don-chon.ts";
import { CHU_MIEN_PHI, soTien } from "./phi-don-hien-thi.ts";

/** Chữ lựa chọn cuối của ô (ADR-0214 Đ1). */
export const NHAN_SO_KHAC = "Số khác";
/** Giá trị `<option>` của «Số khác» (mọi lựa chọn khác là số tiền dạng chữ số). */
export const CHON_SO_KHAC = "khac";
/** Dòng đầu của ô khi lượt chưa chọn phí (ADR-0214 Đ3: chưa chọn ≠ Miễn phí). */
export const NHAN_CHUA_CHON_PHI = "Chưa chọn";

/** Giá trị ô: `chon` = "" (chưa chọn) | chữ số của một mức trong danh sách | `CHON_SO_KHAC`; `khac` = chữ người gõ ở ô «Số khác». */
export interface OPhiDon {
  chon: string;
  khac: string;
}
export const O_PHI_TRONG: OPhiDon = { chon: "", khac: "" };

export const nhanMucPhi = (n: number): string => (n === 0 ? CHU_MIEN_PHI : `${soTien(n)} đ`);

/** Các lựa chọn của ô theo thứ tự hiện: mọi mức của danh sách dùng chung (Miễn phí đầu), «Số khác» cuối. */
export const LUA_CHON_PHI_DON: readonly { giaTri: string; nhan: string }[] = [
  ...DANH_SACH_PHI_DON.map((n) => ({ giaTri: String(n), nhan: nhanMucPhi(n) })),
  { giaTri: CHON_SO_KHAC, nhan: NHAN_SO_KHAC },
];

/**
 * Đọc chữ ô «Số khác»: chỉ chữ số trần («70000») hoặc ngăn nghìn bằng dấu chấm đúng nhóm ba («70.000», «6.000.000»). Dấu chấm thập phân («70.5»), chữ, dấu trừ, dấu phẩy ⇒ null
 * (không được bỏ dấu chấm rồi đọc: «70.5» sẽ thành 705).
 */
export function docSoKhac(s: string): number | null {
  const t = s.trim();
  if (!/^(\d{1,3}(\.\d{3})+|\d{1,15})$/.test(t)) return null;
  const n = Number(t.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

/** Ô → mức gửi lên: chưa chọn ⇒ `null` (bỏ chọn — máy chủ ghi «chưa chọn»); sai ⇒ câu báo của máy chủ. */
export function mucTuO(o: OPhiDon): { ok: true; muc: MucChon | null } | { ok: false; cau: string } {
  if (o.chon === "") return { ok: true, muc: null };
  const v = o.chon === CHON_SO_KHAC ? { loai: "SO_KHAC", soTien: docSoKhac(o.khac) ?? Number.NaN } : { loai: "DANH_SACH", soTien: /^\d+$/.test(o.chon) ? Number(o.chon) : Number.NaN };
  const k = kiemMucChon(v);
  if (k.ok) return { ok: true, muc: k.muc };
  return { ok: false, cau: k.loi === "VUOT_TRAN" ? CAU_VUOT_TRAN_PHI_DON : CAU_KHONG_HOP_LE_PHI_DON };
}

/** Mức đã lưu → ô (nạp lại đơn nháp). Vắng ⇒ chưa chọn. */
export function oTuMuc(m: MucChon | undefined): OPhiDon {
  if (!m) return O_PHI_TRONG;
  return m.loai === "DANH_SACH" ? { chon: String(m.soTien), khac: "" } : { chon: CHON_SO_KHAC, khac: soTien(m.soTien) };
}

/**
 * Mức đã lưu theo id lượt, đọc từ dòng phí của đơn (`OrderDto.phiDuaDon.dong`): CHỈ dòng do văn phòng chọn (`loaiChon` khác null); dòng bảng phí cũ của Đợt C = chưa chọn (ruling P6).
 * Cùng luật với `mucDaLuuTheoChang` của máy chủ — sai ở đây thì lần lưu sau gửi `null` và xoá mất mức đã lưu.
 */
export function mucDaLuuTheoLuot(dong: readonly { legId: string; loaiChon: "DANH_SACH" | "SO_KHAC" | null; unitPrice: number }[]): Map<string, MucChon> {
  const out = new Map<string, MucChon>();
  for (const d of dong) {
    if (d.loaiChon === null) continue;
    const k = kiemMucChon({ loai: d.loaiChon, soTien: d.unitPrice });
    if (k.ok) out.set(d.legId, k.muc);
  }
  return out;
}
