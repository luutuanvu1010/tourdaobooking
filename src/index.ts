import { accountsModule } from "./modules/accounts";
import { auditModule } from "./modules/audit";
import { authModule } from "./modules/auth";
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { ordersModule } from "./modules/orders";
import { staffModule } from "./modules/staff";
import { error, type AppModule } from "./shared/http";

// Mỗi module tự sở hữu route + dữ liệu của mình; thêm module mới = thêm một dòng ở đây.
const modules: AppModule[] = [authModule, staffModule, accountsModule, ordersModule, catalogModule, auditModule];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    for (const mod of modules) {
      const response = await mod.handle(request, env);
      if (response) return response;
    }
    return error(404, "not_found", "Không tìm thấy.");
  },
  // Cron Trigger (wrangler.jsonc "triggers.crons"): tự đồng bộ danh mục dịch vụ từ Google Sheet.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledSync(env));
  },
} satisfies ExportedHandler<Env>;
