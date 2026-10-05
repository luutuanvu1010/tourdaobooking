// Module giao-dien — giao diện công ty do Toàn quyền chỉnh (ADR-0087). Sở hữu `gd_setting`. Luật thuần ở src/shared/giao-dien.ts (dùng chung màn chỉnh).
// Route: GET/PUT /api/giao-dien (cổng admin + ô settings.ops = chỉ Toàn quyền); GET /giao-dien.css (+ đường cũ /api/giao-dien.css; ADR-0102) (CÔNG KHAI — trang Đăng nhập cần trước khi có phiên;
// chỉ chứa màu/phông/cỡ, không dữ liệu cá nhân). Phụ thuộc: chỉ `audit`.
import { auditStatement } from "../audit";
import type { GiaoDienDto } from "../../shared/contracts";
import { docTokensDaLuu, dungCss, kiemGiaoDien } from "../../shared/giao-dien";
import { css, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { chiTietDoi } from "./rules";
import { findGiaoDien, updateGiaoDienStatement } from "./repository";

async function phucVuCss({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const row = await findGiaoDien(env.DB);
  const version = row?.version ?? 0;
  const etag = `"v${version}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag, "cache-control": "no-cache" } });
  return css(dungCss(row ? docTokensDaLuu(row.tokens) : {}), 200, { etag });
}

export const giaoDienModule: AppModule = {
  name: "giao-dien",
  routes: [
    // ADR-0102: đường MỚI `/giao-dien.css` (ngoài /api) để service worker đệm "dùng ngay, làm mới ở nền" — trang không còn chờ mạng + D1 trước khi vẽ. Đường cũ
    // `/api/giao-dien.css` GIỮ nguyên thân cho trang đã đệm từ trước khi đổi (service worker không bao giờ đệm /api/*).
    route("GET", "/giao-dien.css", "public", async (c) => {
      return phucVuCss(c);
    }),
    route("GET", "/api/giao-dien.css", "public", async (c) => {
      return phucVuCss(c);
    }),

    route("GET", "/api/giao-dien", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt giao diện.");
      const row = await findGiaoDien(env.DB);
      return json({ tokens: row ? docTokensDaLuu(row.tokens) : {}, version: row?.version ?? 0 } satisfies GiaoDienDto);
    }),

    route("PUT", "/api/giao-dien", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được đổi giao diện.");
      const body = await readJson(request);
      const version = body?.version;
      if (!body || !Number.isInteger(version)) return error(400, "invalid_input", "Thiếu phiên bản giao diện đang xem — tải lại trang.");
      const loi = kiemGiaoDien(body.tokens);
      if (loi.length > 0) return json({ error: { code: "invalid_input", message: loi.map((l) => l.message).join(" "), loi } }, 400);
      const tokens = body.tokens as Record<string, string>;
      const db = env.DB;
      const cu = await findGiaoDien(db);
      if (!cu || cu.version !== version) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      const at = new Date().toISOString();
      const [upd] = await db.batch([
        updateGiaoDienStatement(db, { tokens: JSON.stringify(tokens), at, by: staff.id, version: version as number }),
        auditStatement(db, { staffId: staff.id, action: "giao_dien_changed", at, targetType: "system", targetId: "giao-dien", detail: chiTietDoi(docTokensDaLuu(cu.tokens), tokens) }, "changes() > 0"),
      ]);
      if (!upd || upd.meta.changes === 0) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      return json({ tokens, version: (version as number) + 1 } satisfies GiaoDienDto);
    }),
  ],
};
