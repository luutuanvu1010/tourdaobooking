// Trang "Loại giấy tờ người" (/loai-giay-to-nguoi — ADR-0040 D2): loại giấy tờ của người + hạng giấy phép lái xe. Danh mục CHUNG của Danh bạ ("giấy tờ thuộc
// về người" — nhân viên, tài xế, sau này thẻ hướng dẫn viên, bằng thuyền trưởng…). Tách khỏi trang "Danh mục giấy tờ" cũ ngày 2026-09-28 theo chủ dự án
// ("Tách theo chủ dữ liệu"): lối vào là mục trong nhóm QUẢN TRỊ ngay sau "Địa điểm" (máy tính) và dòng sau "Địa điểm" ở trang Tôi (điện thoại). Đường dẫn
// cũ /danh-muc-giay-to chuyển về đây. Khối dùng chung: web/danh-muc-giay-to-khoi.ts. Ô admin.manage.
import { type Api, api } from "./api";
import { KHOI_HANG, KHOI_NGUOI, moTrangDanhMuc } from "./danh-muc-giay-to-khoi";

await moTrangDanhMuc([KHOI_NGUOI, KHOI_HANG], async () => {
  const m = await api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta");
  return [m.types, m.classes];
});
