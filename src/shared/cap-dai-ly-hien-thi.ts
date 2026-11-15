// Chữ và luật lọc THUẦN của màn «Cấp độ đại lý» (đặc tả docs/superpowers/specs/2026-11-04-man-cap-dai-ly.md) — web/cap-dai-ly.ts. Cấp và nguồn cấp do máy chủ trả; ở đây chỉ lọc và dịch ra chữ.
import type { CapDaiLyDongDto } from "./contracts.ts";
import { khoaTen } from "./khoa-ten.ts";

export const CHU_MAN = {
  tieuDe: "Cấp độ đại lý",
  moTa: "Đặt cấp cho mọi đối tác đang được hưởng hoa hồng, gồm cả hồ sơ chưa có tài khoản.",
  chiMoDuoc: "Trang này chỉ dành cho Kế toán, Quản trị và Toàn quyền.",
  khongCoCap: "Chưa có cấp độ đại lý nào đang bật nên chưa đặt được cấp. Tạo tên cấp ở trang",
  trangHoaHong: "Hoa hồng đối tác",
  rong: "Chưa có hồ sơ nào đang mang vai trò được hưởng hoa hồng.",
  khongKhop: "Không có hồ sơ nào khớp.",
  xemThem: "Xem thêm",
  nhanVaiTro: "Vai trò",
} as const;

/** Số dòng vẽ mỗi lần: hàng nghìn đối tác vẫn lọc trong bộ nhớ, nhưng chỉ dựng DOM cho phần đang xem («Xem thêm» vẽ tiếp). */
export const SO_DONG_MOI_LAN = 100;

export const nhanLoaiHoSo = (k: CapDaiLyDongDto["loaiHoSo"]): string => (k === "PERSON" ? "Cá nhân" : "Tổ chức");
export const nhanTaiKhoan = (co: boolean): string => (co ? "Có tài khoản" : "Chưa có tài khoản");
export const nhanVaiTro = (d: Pick<CapDaiLyDongDto, "vaiTro">): string => d.vaiTro.map((v) => v.ten).join(", ");
export const cauDem = (hien: number, tong: number): string => (hien === tong ? `${tong} hồ sơ` : `${hien} / ${tong} hồ sơ`);

/** Ô có được mở bảng đặt cấp không. Hết cấp đang bật thì hồ sơ chưa có cấp riêng không có gì để làm ở bảng; hồ sơ đang có cấp riêng vẫn mở để «Dùng cấp theo vai trò». */
export const suaDuocDong = (coCapBat: boolean, d: Pick<CapDaiLyDongDto, "cap">): boolean => coCapBat || d.cap.rieng !== null;

/** Tìm theo tên (bỏ dấu, không phân biệt hoa thường) và lọc «Chưa có cấp». «Hai vai trò khác cấp» không tính là chưa có cấp: ô đó vẫn nói rõ riêng. */
export function locDong(ds: readonly CapDaiLyDongDto[], loc: { tim: string; chiChuaCoCap: boolean }): CapDaiLyDongDto[] {
  const tim = khoaTen(loc.tim);
  return ds.filter((d) => (!loc.chiChuaCoCap || d.cap.nguon === "CHUA_CO") && (tim === "" || khoaTen(d.ten).includes(tim)));
}
