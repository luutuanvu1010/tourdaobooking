// Module ve-dien-tu — KHO VÉ ĐIỆN TỬ (ADR-0153, ĐỀ XUẤT chờ chủ duyệt). Sở hữu `vdt_*`. Khung ban đầu: CHƯA có route (route nhập lô / xem / giao ở các task sau, sau khi ADR được duyệt).
// Phụ thuộc: audit (nhật ký — chỉ số lượng, không bao giờ mã vé). Cạnh tới staff / thongbao / catalog / orders (chỉ đọc view công bố) xin duyệt ở ADR-0153 Đ1 mục 2, CHƯA khai.
// Chiều orders → ve-dien-tu KHÔNG có cạnh: gốc lắp ráp (src/index.ts) tiêm hàm cấp / trả vé vào ctx. Module khác CHỈ import từ file này.
import type { AppModule } from "../../shared/router";

export { demVeTheoTrangThai } from "./repository.ts";

export const veDienTuModule: AppModule = { name: "ve-dien-tu", routes: [] };
