// Trang "Loại giấy tờ xe" (/loai-giay-to-xe — danh mục loại giấy tờ của XE, thuộc phân hệ Vận chuyển; ADR-0040 D1). Tách khỏi trang "Danh mục giấy tờ" cũ
// ngày 2026-09-28 theo chủ dự án ("Tách theo chủ dữ liệu"): lối vào là mục con dưới "Vận chuyển" (máy tính) và dòng trong nhóm VẬN CHUYỂN của trang Tôi
// (điện thoại). Khối dùng chung: web/danh-muc-giay-to-khoi.ts. Ô admin.manage; GET /api/van-chuyen/meta (máy chủ nhận vehicle.manage HOẶC admin.manage).
import { type Api, api } from "./api";
import { KHOI_XE, moTrangDanhMuc } from "./danh-muc-giay-to-khoi";
import { datCrumb } from "./giay-to-ui";

await moTrangDanhMuc(
  [KHOI_XE],
  async () => [(await api<Api.VanChuyenMetaResponse>("/api/van-chuyen/meta")).documentTypes],
  () => datCrumb("Vận chuyển", "Loại giấy tờ xe"),
);
