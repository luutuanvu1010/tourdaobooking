// Gốc lắp ráp: danh sách module + nối auth vào router + Cron. Thêm module mới = thêm một dòng vào `modules`.
// Đây cũng là nơi TIÊM hàm nối chéo module (ADR-0007 điều 4(b)): `orders` cần biết "người dùng có phải người phụ trách đơn" và có câu "đặt người phụ trách mặc định
// cho đơn mới" nhưng KHÔNG được import `dispatch` (dispatch → orders là chiều được phép, chiều ngược lại sẽ thành vòng). Router chỉ chuyển chúng vào `ctx`.
import { accountsModule } from "./modules/accounts";
import { auditModule } from "./modules/audit";
import { authModule, checkAuthConfig, currentStaff } from "./modules/auth";
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { companyModule } from "./modules/company";
import { defaultHandlerStatement, dispatchModule, isOrderHandler } from "./modules/dispatch";
import { locationsModule } from "./modules/locations";
import { feedbackModule } from "./modules/feedback";
import { maintenanceBlock, maintenanceModule } from "./modules/maintenance";
import { partiesModule } from "./modules/parties";
import { ordersModule } from "./modules/orders";
import { createApp } from "./shared/router";

const app = createApp({
  modules: [authModule, accountsModule, ordersModule, dispatchModule, catalogModule, auditModule, locationsModule, partiesModule, companyModule, maintenanceModule, feedbackModule],
  currentStaff,
  checkConfig: checkAuthConfig,
  injected: {
    isAssigned: (env, staffId, orderId) => isOrderHandler(env.DB, staffId, orderId),
    defaultHandlerStatement: (env, staff, orderId, at) => defaultHandlerStatement(env.DB, staff, orderId, at),
    maintenanceBlock: (env, staff) => maintenanceBlock(env.DB, staff.phone),
  },
});

export default {
  fetch: app.fetch,
  // Cron Trigger (wrangler.jsonc "triggers.crons"): tự đồng bộ danh mục dịch vụ từ Google Sheet.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledSync(env));
  },
} satisfies ExportedHandler<Env>;
