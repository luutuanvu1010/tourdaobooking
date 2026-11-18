// Luật thuần TÍNH PHÍ MỘT LƯỢT ĐÓN từ giá gốc Sheet (ADR-0218 Đ1.1). MỘT hàm cho lưu nháp và xác nhận (Hiến chương 5.4). Không I/O.
// Thứ tự, dừng ở bước đầu ra kết quả: (1) văn phòng đổi số có lý do; (2) chương trình miễn phí khớp ⇒ 0; (3) đi chung max(0, giá gốc − mức giảm cấp) × số khách; xe riêng giá gốc × 1.
// Cấp CHỈ xét ở bước 3 và chỉ cho đi chung. Ô giá gốc trống ⇒ THIEU (không bao giờ 0). Số lượng 0 ⇒ null (không dòng).
import { thanhTienDong } from "../../shared/order-lines.ts";
import { chuongTrinhKhop, type ChuongTrinh } from "./chuong-trinh-phi-don-rules.ts";
import type { CapCuaHoSo } from "./phi-don-rules.ts";

export type DauVaoLuotDon = {
  luotKey: string;
  /** null = dịch vụ nhập tay: không có dòng giá gốc ⇒ O_TRONG (đổi số vẫn được; chương trình «tất cả» / theo đối tác vẫn khớp). */
  catalogCode: string | null; direction: "OUT" | "RETURN"; xeRieng: boolean;
  /** Ngày đón của lượt (YYYY-MM-DD); null = nháp chưa có ngày đón ⇒ không chương trình nào khớp. */
  pickupDate: string | null; soKhachTinhTien: number; paxOverride: number | null;
  doiTay: { donGia: number; lyDo: string; nguoi: string } | null;
};
export type BoiCanh = {
  bookerPartyId: string | null; cap: CapCuaHoSo; mucGiam: number | null;
  giaGoc: ReadonlyMap<string, { moiKhach: number | null; xeRieng: number | null }>;
  chuongTrinh: readonly ChuongTrinh[];
};
export type KetQuaLuot =
  | { ketQua: "CO_PHI"; nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC"; donGia: number; soLuong: number; tien: number; kind: "PER_PAX" | "PER_TRIP";
      giaGoc: number | null; tierCode: string | null; mucGiam: number | null; chuongTrinh: { id: string; name: string } | null; lyDo: string | null; nguoi: string | null }
  | { ketQua: "THIEU"; lyDo: "O_TRONG" | "HAI_CAP" };

/** Số lượng dòng: xe riêng 1; chiều về có số người riêng ⇒ min(số đó, khách tính tiền); còn lại số khách tính tiền. */
export function soLuongLuot(l: Pick<DauVaoLuotDon, "xeRieng" | "direction" | "paxOverride" | "soKhachTinhTien">): number {
  return l.xeRieng ? 1 : l.direction === "RETURN" && l.paxOverride !== null ? Math.min(l.paxOverride, l.soKhachTinhTien) : l.soKhachTinhTien;
}

export function tinhPhiLuotDon(l: DauVaoLuotDon, b: BoiCanh): KetQuaLuot | null {
  const soLuong = soLuongLuot(l);
  if (soLuong <= 0) return null;
  const kind = l.xeRieng ? "PER_TRIP" : "PER_PAX";
  const co = (nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC", donGia: number, them: Partial<Extract<KetQuaLuot, { ketQua: "CO_PHI" }>> = {}): KetQuaLuot => ({
    ketQua: "CO_PHI", nguon, donGia, soLuong, tien: thanhTienDong({ quantity: soLuong, unitPrice: donGia }), kind,
    giaGoc: null, tierCode: null, mucGiam: null, chuongTrinh: null, lyDo: null, nguoi: null, ...them,
  });
  if (l.doiTay) return co("DOI_TAY", l.doiTay.donGia, { lyDo: l.doiTay.lyDo, nguoi: l.doiTay.nguoi });
  const ct = chuongTrinhKhop(b.chuongTrinh, { catalogCode: l.catalogCode, bookerPartyId: b.bookerPartyId, pickupDate: l.pickupDate, xeRieng: l.xeRieng });
  if (ct) return co("CHUONG_TRINH", 0, { chuongTrinh: { id: ct.id, name: ct.name } });
  const g = l.catalogCode === null ? undefined : b.giaGoc.get(l.catalogCode);
  const goc = l.xeRieng ? g?.xeRieng : g?.moiKhach;
  if (goc === undefined || goc === null) return { ketQua: "THIEU", lyDo: "O_TRONG" };
  if (l.xeRieng) return co("GIA_GOC", goc, { giaGoc: goc, tierCode: b.cap.loai === "CO_CAP" ? b.cap.tierCode : null, mucGiam: 0 });
  if (b.cap.loai === "HAI_CAP") return { ketQua: "THIEU", lyDo: "HAI_CAP" };
  const giam = b.cap.loai === "CO_CAP" ? (b.mucGiam ?? 0) : 0;
  return co("GIA_GOC", Math.max(0, goc - giam), { giaGoc: goc, tierCode: b.cap.loai === "CO_CAP" ? b.cap.tierCode : null, mucGiam: giam });
}
