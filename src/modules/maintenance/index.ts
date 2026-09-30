// Module maintenance — chế độ bảo trì của RIÊNG chủ dự án (docs/HANDOFF-CHE-DO-BAO-TRI.md). Sở hữu bảng `mnt_setting` (singleton). Route: /api/maintenance (chỉ ADMIN).
// Luật thuần (ai bị chặn, thông điệp, kiểm đầu vào) ở src/shared/maintenance.ts — dùng chung với giao diện. Module này chỉ đọc/ghi dòng cài đặt và dựng phản hồi 503.
// NƠI ÉP nằm ở máy chủ và đi qua ba chỗ, đều dùng hàm ở đây: (1) router — mọi route cần đăng nhập (gốc lắp ráp tiêm `maintenanceBlock`), (2) `POST /api/auth/login`
// (module auth, sau Turnstile và TRƯỚC khi kiểm PIN), (3) `GET /api/auth/config` (banner ở trang đăng nhập). Phụ thuộc: chỉ `audit` (ghi nhật ký `maintenance_changed`).
import { auditStatement } from "../audit";
import type { MaintenanceErrorBody, MaintenanceResponse, MaintenanceStatusDto } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { MAINTENANCE_CODE, checkMaintenanceInput, isAllowedPhone, isBlocked, maintenanceMessage, stateFromRow, type MaintenanceState } from "../../shared/maintenance";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnDateTimeText } from "../../shared/vn-date";
import { findSetting, updateSettingStatement } from "./repository";

export type { MaintenanceState };

/** Trạng thái có hiệu lực LÚC NÀY từ D1 (một truy vấn). Chưa có dòng cài đặt → TẮT; đã qua giờ dự kiến hoàn tất → TẮT (tự tắt, `stateFromRow`). */
export async function getMaintenanceState(db: D1Database): Promise<MaintenanceState> {
  return stateFromRow(await findSetting(db), Date.now());
}

/** Phần công khai của trạng thái (KHÔNG có danh sách được phép). */
export const toStatus = (s: MaintenanceState): MaintenanceStatusDto => ({ on: s.on, endsAt: s.endsAt });

/** 503 `maintenance`: cùng một thân cho mọi người bị chặn; `endsAt` nằm trong `error` để giao diện dựng đồng hồ đếm ngược mà không gọi thêm. */
export function maintenanceResponse(endsAt: string | null, now = Date.now()): Response {
  const body: { error: MaintenanceErrorBody } = { error: { code: MAINTENANCE_CODE, message: maintenanceMessage(endsAt, now), endsAt } };
  return json(body, 503);
}

/** Phản hồi chặn nếu `phone` bị chặn LÚC NÀY, hoặc null nếu được qua (chế độ tắt, hoặc SĐT được phép). Mỗi lần gọi là MỘT truy vấn D1, không đệm — hiệu lực ngay khi bật. */
export async function maintenanceBlock(db: D1Database, phone: string): Promise<Response | null> {
  const state = await getMaintenanceState(db);
  return isBlocked(state, phone) ? maintenanceResponse(state.endsAt) : null;
}

export const maintenanceModule: AppModule = {
  name: "maintenance",
  routes: [
    // `canToggle`: chính người gọi có được bật/tắt không (nằm trong danh sách được phép). Không trả danh sách.
    // ADR-0019: chốt chặn của GET là `admin.manage`; `canToggle` (Toàn quyền VÀ SĐT trong danh sách) chỉ để giao diện ẩn/hiện nút — KHÔNG phải chốt chặn (chốt chặn bật/tắt là PUT).
    route("GET", "/api/maintenance", "admin", async ({ env, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được xem cài đặt bảo trì.");
      const state = await getMaintenanceState(env.DB);
      return json({ ...toStatus(state), canToggle: can(staff, "settings.ops") && isAllowedPhone(state, staff.phone) } satisfies MaintenanceResponse);
    }),

    route("PUT", "/api/maintenance", "admin", async ({ request, env, staff, dongBangTin }) => {
      // ADR-0019: phải giữ Toàn quyền (ô `settings.ops`) RỒI mới xét SĐT trong danh sách được phép — cả hai điều kiện đều phải đúng; 403 đứng trước đọc thân.
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ chủ dự án được bật/tắt chế độ bảo trì.");
      const db = env.DB;
      const state = await getMaintenanceState(db);
      if (!isAllowedPhone(state, staff.phone)) return error(403, "forbidden", "Chỉ chủ dự án được bật/tắt chế độ bảo trì.");
      const input = checkMaintenanceInput(await readJson(request), Date.now());
      if (!input.ok) return error(400, "invalid_input", input.message);
      const at = new Date().toISOString();
      // Nhật ký KHÔNG ghi SĐT: chỉ người thao tác (id), thao tác và giờ dự kiến hoàn tất (giờ Việt Nam cho dễ đọc).
      const detail = input.on ? `Bật chế độ bảo trì, dự kiến hoàn tất lúc ${vnDateTimeText(input.endsAt!)}` : "Tắt chế độ bảo trì";
      await db.batch([
        updateSettingStatement(db, { enabled: input.on, endsAt: input.endsAt, at, by: staff.id }),
        auditStatement(db, { staffId: staff.id, action: "maintenance_changed", at, targetType: "system", targetId: "maintenance", detail }),
      ]);
      // BẢNG TIN (KN-2): BẬT bảo trì → đóng MỌI kết nối đang mở (kết nối lại của tài khoản không được phép sẽ nhận 503 ở lần bắt tay kế).
      if (input.on) dongBangTin("tat-ca");
      return json({ on: input.on, endsAt: input.endsAt, canToggle: true } satisfies MaintenanceResponse);
    }),
  ],
};
