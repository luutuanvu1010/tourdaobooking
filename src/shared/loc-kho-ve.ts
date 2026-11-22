// Luật THUẦN của bộ lọc danh sách «Số vé còn» ở Kho vé điện tử (đặc tả docs/superpowers/specs/2026-11-20-sua-giao-dien-bon-y-cua-chu.md, H4).
// Chỉ lọc trên dữ liệu đã tải; không đổi dữ liệu, không gọi máy chủ. Giao diện: web/ve-kho.ts.
import { khopTen } from "./so-cong-no-hien-thi.ts";

export type NhomSoVe = "tat-ca" | "het" | "it" | "nhieu";

/** Ngưỡng «còn ít»: từ 1 tới số này. Trên số này là «Còn trên …». */
export const NGUONG_CON_IT = 5;

/** Bốn nút lọc theo số vé còn trống, theo thứ tự hiện. */
export const NHOM_SO_VE: readonly { ma: NhomSoVe; nhan: string; khop: (conTrong: number) => boolean }[] = [
  { ma: "tat-ca", nhan: "Tất cả", khop: () => true },
  { ma: "het", nhan: "Hết vé", khop: (n) => n <= 0 },
  { ma: "it", nhan: `Còn 1 đến ${NGUONG_CON_IT}`, khop: (n) => n >= 1 && n <= NGUONG_CON_IT },
  { ma: "nhieu", nhan: `Còn trên ${NGUONG_CON_IT}`, khop: (n) => n > NGUONG_CON_IT },
];

interface DongKho { catalogCode: string; tenDichVu: string | null; conTrong: number }

const khopTim = (d: DongKho, tim: string): boolean => tim.trim() === "" || khopTen(d.tenDichVu ?? d.catalogCode, tim) || khopTen(d.catalogCode, tim);

/** Các dòng khớp CẢ ô tìm (tên sản phẩm, không phân biệt dấu; hoặc mã dịch vụ) LẪN nhóm số vé còn; giữ nguyên thứ tự máy chủ trả. */
export function locKhoVe<T extends DongKho>(kho: readonly T[], loc: { tim: string; nhom: NhomSoVe }): T[] {
  const nhom = NHOM_SO_VE.find((n) => n.ma === loc.nhom) ?? NHOM_SO_VE[0]!;
  return kho.filter((d) => khopTim(d, loc.tim) && nhom.khop(d.conTrong));
}

/** Số dòng của từng nhóm, tính trên các dòng khớp ô tìm đang gõ (số ghi trên nút). */
export function demTheoNhom(kho: readonly DongKho[], tim: string): Record<NhomSoVe, number> {
  const khop = kho.filter((d) => khopTim(d, tim));
  return Object.fromEntries(NHOM_SO_VE.map((n) => [n.ma, khop.filter((d) => n.khop(d.conTrong)).length])) as Record<NhomSoVe, number>;
}
