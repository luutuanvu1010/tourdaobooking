// Chữ một dòng «người phụ trách» (ADR-0142, quyết định chủ 5/11) ở danh sách đơn và trang đơn. TỆP NHỎ, không import gì: gói trang Đơn hàng có trần dung lượng (goi-trang-nhe.test.ts).
import type { BanHangDonDto } from "./contracts.ts";

/** Dòng ở thẻ đơn: đã có người → «Phụ trách: <tên>»; đang mời → «Đang mời <X> · còn N phút»; chưa ai → «Chờ Bán hàng nhận». */
export const dongBanHangDanhSach = (d: Pick<BanHangDonDto, "banHang" | "loiMoi">): string =>
  d.banHang ? `Phụ trách: ${d.banHang.name}` : d.loiMoi ? `Đang mời ${d.loiMoi.name} · còn ${d.loiMoi.conPhut} phút` : "Chờ Bán hàng nhận";
