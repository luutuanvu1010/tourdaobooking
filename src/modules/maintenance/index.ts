// Module maintenance — chế độ bảo trì của RIÊNG Toàn quyền (docs/HANDOFF-CHE-DO-BAO-TRI.md, ADR-0071 điều 3). Sở hữu bảng `mnt_setting` (singleton). Route: /api/maintenance
// (cổng admin + ô settings.ops = chỉ Toàn quyền).
// Luật thuần (ai bị chặn, thông điệp, kiểm đầu vào) ở src/shared/maintenance.ts — dùng chung với giao diện. Module này chỉ đọc/ghi dòng cài đặt và dựng phản hồi 503.
// NƠI ÉP nằm ở máy chủ và đi qua ba chỗ, đều dùng hàm ở đây: (1) router — mọi route cần đăng nhập (gốc lắp ráp tiêm `maintenanceBlock`), (2) `POST /api/auth/login`
// (module auth, sau Turnstile và TRƯỚC khi kiểm PIN — auth tra tài khoản theo SĐT rồi đưa BỘ QUYỀN vào đây), (3) `GET /api/auth/config` (banner ở trang đăng nhập).
// Miễn trừ: tài khoản giữ Toàn quyền (ADR-0071 điều 3a) — không theo SĐT. Phụ thuộc: chỉ `audit` (ghi nhật ký `maintenance_changed`).
import { auditStatement } from "../audit";
import type { MaintenanceErrorBody, MaintenanceResponse, MaintenanceStatusDto } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { MAINTENANCE_CODE, checkMaintenanceContent, checkMaintenanceInput, contentFromStored, isBlocked, maintenanceMessage, stateFromRow, type MaintenanceState } from "../../shared/maintenance";
import { can, type PermissionCode } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnDateTimeText } from "../../shared/vn-date";
import { findSetting, updateContentStatement, updateSettingStatement } from "./repository";

export type { MaintenanceState };

/** Trạng thái có hiệu lực LÚC NÀY từ D1 (một truy vấn). Chưa có dòng cài đặt → TẮT; đã qua giờ dự kiến hoàn tất → TẮT (tự tắt, `stateFromRow`). */
export async function getMaintenanceState(db: D1Database): Promise<MaintenanceState> {
  const row = await findSetting(db);
  return { ...stateFromRow(row, Date.now()), contentJson: row?.content_json ?? null };
}

/** Phần công khai của trạng thái. Đang bật thì kèm nội dung màn bảo trì (trang đăng nhập dùng SĐT hỗ trợ trong câu báo); tắt thì không gửi. */
export const toStatus = (s: MaintenanceState): MaintenanceStatusDto => ({ on: s.on, endsAt: s.endsAt, ...(s.on ? { content: contentFromStored(s.contentJson) } : {}) });

/** SĐT hỗ trợ đã lưu (nội dung màn bảo trì, ADR-0202) — dòng «Hỗ trợ kỹ thuật» ở trang đăng nhập; đọc từ cùng trạng thái, không thêm truy vấn. */
export const supportPhoneOf = (s: MaintenanceState): string => contentFromStored(s.contentJson).sdt;

/** 503 `maintenance`: cùng một thân cho mọi người bị chặn; `endsAt` và nội dung màn bảo trì nằm trong `error` để giao diện dựng màn mà không gọi thêm (mọi API khác cũng 503). */
export function maintenanceResponse(state: MaintenanceState, now = Date.now()): Response {
  const content = contentFromStored(state.contentJson);
  const body: { error: MaintenanceErrorBody } = { error: { code: MAINTENANCE_CODE, message: maintenanceMessage(state.endsAt, now, content.sdt), endsAt: state.endsAt, content } };
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
  truoc?: MaintenanceState,
): Promise<Response | null> {
  // `truoc`: trạng thái đã đọc SONG SONG với phiên (auth `currentStaff` — bớt một chặng D1 ở mọi lời gọi); vắng thì tự đọc như cũ (đăng nhập, Face ID).
  const state = truoc ?? await getMaintenanceState(db);
  if (!state.on) return null;
  return isBlocked(state, await permissions()) ? maintenanceResponse(state) : null;
}

/** Tên ô (lời thường) cho dòng nhật ký «Sửa nội dung màn bảo trì: …» — chỉ tên, không giá trị. */
const TEN_O = {
  tieuDe: "tiêu đề", loiNhan: "lời nhắn", lyDo: "nội dung bảo trì", sdt: "số điện thoại hỗ trợ", zalo: "liên kết Zalo", website: "website", camOn: "lời cảm ơn",
  hienLyDo: "hiện nội dung bảo trì", hienGoi: "hiện nút gọi", hienZalo: "hiện nút Zalo", hienWeb: "hiện thẻ website", hienCamOn: "hiện lời cảm ơn",
} as const;

export const maintenanceModule: AppModule = {
  name: "maintenance",
  routes: [
    // ADR-0071 điều 3c (sửa ADR-0019): GET và PUT chỉ hỏi `settings.ops` (Toàn quyền); bỏ điều kiện SĐT trong danh sách. `canToggle` luôn true khi qua chốt
    // (giữ trường để giao diện không phải đổi hợp đồng).
    route("GET", "/api/maintenance", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt bảo trì.");
      const state = await getMaintenanceState(env.DB);
      return json({ on: state.on, endsAt: state.endsAt, canToggle: true, content: contentFromStored(state.contentJson) } satisfies MaintenanceResponse);
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
      const content = contentFromStored((await findSetting(db))?.content_json);
      return json({ on: input.on, endsAt: input.endsAt, canToggle: true, content } satisfies MaintenanceResponse);
    }),

    // Bản mẫu 2c (ADR-0202): Toàn quyền sửa NỘI DUNG màn bảo trì — không đổi bật/tắt. Cùng chốt settings.ops; ghi + nhật ký trong MỘT batch.
    // Nhật ký dùng lại `maintenance_changed` (đã thuộc nhóm im lặng ADR-0038) và KHÔNG chép giá trị (SĐT là N2 — §7): chỉ tên các ô đã đổi.
    route("PUT", "/api/maintenance/content", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được sửa nội dung màn bảo trì.");
      const db = env.DB;
      const input = checkMaintenanceContent(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const row = await findSetting(db);
      const cu = contentFromStored(row?.content_json);
      const doi = (Object.keys(TEN_O) as (keyof typeof TEN_O)[]).filter((k) => cu[k] !== input.content[k]).map((k) => TEN_O[k]);
      const at = new Date().toISOString();
      await db.batch([
        updateContentStatement(db, { contentJson: JSON.stringify(input.content), at, by: staff.id }),
        auditStatement(db, { staffId: staff.id, action: "maintenance_changed", at, targetType: "system", targetId: "maintenance", detail: `Sửa nội dung màn bảo trì: ${doi.length ? doi.join(", ") : "không đổi ô nào"}` }),
      ]);
      const state = stateFromRow(row, Date.now());
      return json({ on: state.on, endsAt: state.endsAt, canToggle: true, content: input.content } satisfies MaintenanceResponse);
    }),
  ],
};
