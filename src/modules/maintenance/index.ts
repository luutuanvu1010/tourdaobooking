// Module maintenance — chế độ bảo trì của RIÊNG Toàn quyền (docs/HANDOFF-CHE-DO-BAO-TRI.md, ADR-0071 điều 3). Sở hữu bảng `mnt_setting` (singleton). Route: /api/maintenance
// (cổng admin + ô settings.ops = chỉ Toàn quyền).
// Luật thuần (ai bị chặn, thông điệp, kiểm đầu vào) ở src/shared/maintenance.ts — dùng chung với giao diện. Module này chỉ đọc/ghi dòng cài đặt và dựng phản hồi 503.
// NƠI ÉP nằm ở máy chủ và đi qua ba chỗ, đều dùng hàm ở đây: (1) router — mọi route cần đăng nhập (gốc lắp ráp tiêm `maintenanceBlock`), (2) `POST /api/auth/login`
// (module auth, sau Turnstile và TRƯỚC khi kiểm PIN — auth tra tài khoản theo SĐT rồi đưa BỘ QUYỀN vào đây), (3) `GET /api/auth/config` (banner ở trang đăng nhập).
// Miễn trừ: tài khoản giữ Toàn quyền (ADR-0071 điều 3a) — không theo SĐT. Phụ thuộc: chỉ `audit` (ghi nhật ký `maintenance_changed`).
import { auditStatement } from "../audit";
import type { MaintenanceErrorBody, MaintenanceResponse, MaintenanceStatusDto } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { MAINTENANCE_CODE, checkMaintenanceInput, isBlocked, maintenanceMessage, stateFromRow, type MaintenanceState } from "../../shared/maintenance";
import { can, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnDateTimeText } from "../../shared/vn-date";
import { findSetting, updateSettingStatement } from "./repository";

export type { MaintenanceState };

/** Trạng thái có hiệu lực LÚC NÀY từ D1 (một truy vấn). Chưa có dòng cài đặt → TẮT; đã qua giờ dự kiến hoàn tất → TẮT (tự tắt, `stateFromRow`). */
export async function getMaintenanceState(db: D1Database): Promise<MaintenanceState> {
  return stateFromRow(await findSetting(db), Date.now());
}

/** Phần công khai của trạng thái. */
export const toStatus = (s: MaintenanceState): MaintenanceStatusDto => ({ on: s.on, endsAt: s.endsAt });

/** 503 `maintenance`: cùng một thân cho mọi người bị chặn; `endsAt` nằm trong `error` để giao diện dựng đồng hồ đếm ngược mà không gọi thêm. */
export function maintenanceResponse(endsAt: string | null, now = Date.now()): Response {
  const body: { error: MaintenanceErrorBody } = { error: { code: MAINTENANCE_CODE, message: maintenanceMessage(endsAt, now), endsAt } };
  return json(body, 503);
}

/**
 * Phản hồi chặn nếu tài khoản có bộ quyền do `permissions` trả bị chặn LÚC NÀY, hoặc null nếu được qua (chế độ tắt, hoặc giữ Toàn quyền — ADR-0071 điều 3a).
 * `permissions` là HÀM lười: chỉ gọi khi chế độ đang BẬT (đăng nhập không tra tài khoản theo SĐT lúc bình thường); trả `null` = không có tài khoản đang hoạt
 * động → bị chặn, cùng thân 503 với mọi người khác. Mỗi lần gọi là MỘT truy vấn D1 trạng thái (cộng truy vấn của hàm lười khi bật), không đệm.
 */
export async function maintenanceBlock(
  db: D1Database,
  permissions: () => Promise<readonly PermissionCode[] | null> | readonly PermissionCode[] | null,
): Promise<Response | null> {
  const state = await getMaintenanceState(db);
  if (!state.on) return null;
  return isBlocked(state, await permissions()) ? maintenanceResponse(state.endsAt) : null;
}

export const maintenanceModule: AppModule = {
  name: "maintenance",
  routes: [
    // ADR-0071 điều 3c (sửa ADR-0019): GET và PUT chỉ hỏi `settings.ops` (Toàn quyền); bỏ điều kiện SĐT trong danh sách. `canToggle` luôn true khi qua chốt
    // (giữ trường để giao diện không phải đổi hợp đồng).
    route("GET", "/api/maintenance", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt bảo trì.");
      return json({ ...toStatus(await getMaintenanceState(env.DB)), canToggle: true } satisfies MaintenanceResponse);
    }),

    route("PUT", "/api/maintenance", "admin", async ({ request, env, staff, dongBangTin }) => {
      // ADR-0071 điều 3c: chỉ ô `settings.ops` (Toàn quyền) — không còn điều kiện SĐT; 403 đứng trước đọc thân.
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được bật/tắt chế độ bảo trì.");
      const db = env.DB;
      const input = checkMaintenanceInput(await readJson(request), Date.now());
      if (!input.ok) return error(400, "invalid_input", input.message);
      const at = new Date().toISOString();
      // Nhật ký KHÔNG ghi SĐT: chỉ người thao tác (id), thao tác và giờ dự kiến hoàn tất (giờ Việt Nam cho dễ đọc).
      const detail = input.on ? `Bật chế độ bảo trì, dự kiến hoàn tất lúc ${vnDateTimeText(input.endsAt!)}` : "Tắt chế độ bảo trì";
      await db.batch([
        updateSettingStatement(db, { enabled: input.on, endsAt: input.endsAt, at, by: staff.id }),
        auditStatement(db, { staffId: staff.id, action: "maintenance_changed", at, targetType: "system", targetId: "maintenance", detail }),
      ]);
      // BẢNG TIN (KN-2): BẬT bảo trì → đóng MỌI kết nối đang mở (kết nối lại của tài khoản không giữ Toàn quyền sẽ nhận 503 ở lần bắt tay kế).
      if (input.on) dongBangTin("tat-ca");
      return json({ on: input.on, endsAt: input.endsAt, canToggle: true } satisfies MaintenanceResponse);
    }),
  ],
};
