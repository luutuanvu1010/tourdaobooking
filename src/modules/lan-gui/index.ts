// Module lan-gui — LỚP CHỐNG GHI TRÙNG CHUNG (ADR-0094). Sở hữu `lg_lan_gui` (vé) và `lg_chinh_sach_giu` (thời hạn giữ vé). KHÔNG có route ở bản mở
// rộng (màn "Thời hạn giữ vé" + Cron dọn: bản sau, A-11) ⇒ không nằm trong mảng `modules` của src/index.ts. Router (src/shared/router.ts) dùng module này
// qua phần tiêm `injected.lanGui` do gốc lắp ráp nối — router không import module. Không phụ thuộc module nào.
import type { LanGuiNoi } from "../../shared/lan-gui-luat.ts";
import { kiemCauHinhLanGui, vanTay } from "./rules.ts";
import { capNhatKetQua, cauChenVe, tangLap, traVe } from "./repository.ts";

export { MIN_LAN_GUI_SECRET } from "./rules.ts";

/** Kiểm cấu hình bắt buộc của lan-gui (gốc lắp ráp gộp với checkAuthConfig): thiếu / ngắn khoá ⇒ mọi API 500 (ADR-0094 đ4, T15). */
export const checkLanGuiConfig = (env: Env): string | null => kiemCauHinhLanGui(env.LAN_GUI_SECRET);

/** Bản thật của phần tiêm `injected.lanGui`. */
export const lanGuiNoi: LanGuiNoi = {
  vanTay: (env, method, duong, than) => vanTay(env.LAN_GUI_SECRET, method, duong, than),
  tra: traVe,
  cauChenVe,
  capNhatKetQua,
  tangLap,
};
