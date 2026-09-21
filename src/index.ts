// Gốc lắp ráp: danh sách module + nối auth vào router + Cron. Thêm module mới = thêm một dòng vào `modules`.
import { accountsModule } from "./modules/accounts";
import { auditModule } from "./modules/audit";
import { authModule, checkAuthConfig, currentStaff } from "./modules/auth";
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { companyModule } from "./modules/company";
import { locationsModule } from "./modules/locations";
import { partiesModule } from "./modules/parties";
import { ordersModule } from "./modules/orders";
import { createApp } from "./shared/router";

const app = createApp({
  modules: [authModule, accountsModule, ordersModule, catalogModule, auditModule, locationsModule, partiesModule, companyModule],
  currentStaff,
  checkConfig: checkAuthConfig,
});

export default {
  fetch: app.fetch,
  // Cron Trigger (wrangler.jsonc "triggers.crons"): tự đồng bộ danh mục dịch vụ từ Google Sheet.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledSync(env));
  },
} satisfies ExportedHandler<Env>;
