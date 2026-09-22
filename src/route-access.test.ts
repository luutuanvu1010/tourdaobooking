// LƯỚI CHỐNG HỒI QUY MỨC TRUY CÁP (public/staff/office/admin) — KHÔNG PHẢI TRỌNG TÀI ĐÚNG/SAI (ADR-0002 điều 8.2/8.5: mặc định từ chối).
// Mảng SNAPSHOT dưới đây là ảnh chụp mức truy cập của TOÀN BỘ route hiện có, ĐÃ DUYỆT tại thời điểm viết bài kiểm này (2026-09-22).
// Bất kỳ thay đổi THẬT nào về "ai được gọi route nào" — thêm route, bớt route, hay đổi `access` — PHẢI sửa SNAPSHOT trong CÙNG một lần sửa,
// không thì bài kiểm này đỏ. Người rà soát PR: một diff vào tệp này là cờ báo "quyền truy cập vừa đổi" — đọc kỹ SNAPSHOT thay đổi ở đâu
// trước khi duyệt, đừng chỉ chạy `npm test` rồi cho qua.
//
// Trước bài kiểm này, không có bài kiểm tự động nào đọc TRỰC TIẾP `access` thật mà route khai (C-2, người kiểm độc lập 2026-09-22): một tay
// gõ nhầm "admin" thành "staff" (hay ngược lại) ở `route(method, path, access, handler)` không bị bất kỳ bài kiểm nào bắt.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";

interface RouteSnapshot {
  method: string;
  path: string;
  access: string;
}

/**
 * Gói MỘT module bằng esbuild rồi nạp qua `data:` URL — như `src/modules/accounts/patch-staff.test.ts` và
 * `src/modules/dispatch/service.test.ts` đã làm: mã nguồn của module import module khác bằng đường dẫn KHÔNG đuôi
 * (`../staff`, `../audit`…) — đúng cho `tsc`/wrangler nhưng bộ giải ESM của Node thì không giải được, nên không import
 * thẳng `index.ts` vào bài kiểm `node --test` được. Gói bằng esbuild (đúng công cụ dự án dùng để build) rồi nạp bản gói:
 * vẫn là MÃ THẬT của route (kể cả `access` khai trong đó), không phải bản chép tay.
 */
async function loadModule(entry: string): Promise<Record<string, AppModule>> {
  const built = await esbuild.build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Record<string, AppModule>;
}

/** 11 module có route, đúng tên tệp + tên export như `src/index.ts` (gốc lắp ráp) dùng. */
const MODULES: readonly { entry: string; exportName: string }[] = [
  { entry: "./modules/accounts/index.ts", exportName: "accountsModule" },
  { entry: "./modules/audit/index.ts", exportName: "auditModule" },
  { entry: "./modules/auth/index.ts", exportName: "authModule" },
  { entry: "./modules/catalog/index.ts", exportName: "catalogModule" },
  { entry: "./modules/company/index.ts", exportName: "companyModule" },
  { entry: "./modules/dispatch/index.ts", exportName: "dispatchModule" },
  { entry: "./modules/feedback/index.ts", exportName: "feedbackModule" },
  { entry: "./modules/locations/index.ts", exportName: "locationsModule" },
  { entry: "./modules/maintenance/index.ts", exportName: "maintenanceModule" },
  { entry: "./modules/orders/index.ts", exportName: "ordersModule" },
  { entry: "./modules/parties/index.ts", exportName: "partiesModule" },
];

/** Sắp xếp tất định: theo `path` rồi theo `method` (so sánh chuỗi thường, không qua `localeCompare`). */
function sortRoutes(routes: RouteSnapshot[]): RouteSnapshot[] {
  return [...routes].sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    if (a.method !== b.method) return a.method < b.method ? -1 : 1;
    return 0;
  });
}

async function collectRealRoutes(): Promise<RouteSnapshot[]> {
  const out: RouteSnapshot[] = [];
  for (const m of MODULES) {
    const loaded = await loadModule(m.entry);
    const appModule = loaded[m.exportName];
    assert.ok(appModule && Array.isArray(appModule.routes), `không nạp được "${m.exportName}" (có .routes) từ ${m.entry}`);
    for (const r of appModule.routes) out.push({ method: r.method, path: r.path, access: r.access });
  }
  return sortRoutes(out);
}

// Ảnh chụp ĐÃ DUYỆT — lấy bằng `grep -n 'route(' src/modules/*/index.ts` ngày 2026-09-22, đọc từng dòng để chắc đúng (không đoán).
// 55 route trên 11 module — đếm lại bằng `grep -c 'route(' src/modules/*/index.ts` khi nghi ngờ con số này lệch.
const SNAPSHOT: RouteSnapshot[] = sortRoutes([
  { method: "POST", path: "/api/account/change-pin", access: "staff" },
  { method: "GET", path: "/api/audit", access: "admin" },
  { method: "GET", path: "/api/auth/config", access: "public" },
  { method: "POST", path: "/api/auth/login", access: "public" },
  { method: "POST", path: "/api/auth/logout", access: "public" },
  { method: "GET", path: "/api/auth/me", access: "staff" },
  { method: "GET", path: "/api/catalog", access: "office" },
  { method: "PATCH", path: "/api/catalog/:code", access: "admin" },
  { method: "POST", path: "/api/catalog/:code/ack", access: "admin" },
  { method: "DELETE", path: "/api/catalog/:code/override", access: "admin" },
  { method: "GET", path: "/api/catalog/admin", access: "admin" },
  { method: "POST", path: "/api/catalog/sync", access: "admin" },
  { method: "GET", path: "/api/company", access: "public" },
  { method: "GET", path: "/api/dispatch/assignees", access: "office" },
  { method: "GET", path: "/api/dispatch/handlers", access: "office" },
  { method: "GET", path: "/api/feedback", access: "admin" },
  { method: "POST", path: "/api/feedback", access: "staff" },
  { method: "GET", path: "/api/feedback/:id", access: "staff" },
  { method: "PATCH", path: "/api/feedback/:id", access: "admin" },
  { method: "POST", path: "/api/feedback/:id/messages", access: "staff" },
  { method: "GET", path: "/api/feedback/badge", access: "staff" },
  { method: "GET", path: "/api/feedback/mine", access: "staff" },
  { method: "GET", path: "/api/locations", access: "staff" },
  { method: "POST", path: "/api/locations", access: "admin" },
  { method: "PUT", path: "/api/locations/:id", access: "admin" },
  { method: "GET", path: "/api/maintenance", access: "admin" },
  { method: "PUT", path: "/api/maintenance", access: "admin" },
  { method: "GET", path: "/api/orders", access: "office" },
  { method: "POST", path: "/api/orders", access: "office" },
  { method: "GET", path: "/api/orders/:id", access: "office" },
  { method: "PUT", path: "/api/orders/:id", access: "office" },
  { method: "PUT", path: "/api/orders/:id/booker", access: "office" },
  { method: "PUT", path: "/api/orders/:id/handler", access: "office" }, // module dispatch, không phải orders
  { method: "POST", path: "/api/orders/:id/status", access: "office" },
  { method: "PUT", path: "/api/orders/:id/trip", access: "office" },
  { method: "GET", path: "/api/parties", access: "office" },
  { method: "POST", path: "/api/parties", access: "office" },
  { method: "GET", path: "/api/parties/:id", access: "office" },
  { method: "PUT", path: "/api/parties/:id", access: "office" },
  { method: "POST", path: "/api/parties/:id/contacts", access: "office" },
  { method: "POST", path: "/api/parties/:id/contacts/:cid/end", access: "office" },
  { method: "POST", path: "/api/parties/:id/relationships", access: "admin" },
  { method: "POST", path: "/api/parties/:id/relationships/:rid/end", access: "admin" },
  { method: "POST", path: "/api/parties/:id/roles", access: "admin" },
  { method: "POST", path: "/api/parties/:id/roles/:rid/end", access: "admin" },
  { method: "GET", path: "/api/parties/lookup", access: "office" },
  { method: "GET", path: "/api/parties/meta", access: "office" },
  { method: "GET", path: "/api/staff", access: "admin" },
  { method: "POST", path: "/api/staff", access: "admin" },
  { method: "PATCH", path: "/api/staff/:id", access: "admin" },
  { method: "PUT", path: "/api/staff/:id/permissions", access: "admin" },
  { method: "POST", path: "/api/staff/:id/reset-pin", access: "admin" },
  { method: "POST", path: "/api/staff/:id/unlock", access: "admin" },
  { method: "GET", path: "/api/staff/sheet", access: "admin" },
  { method: "POST", path: "/api/staff/sheet/apply", access: "admin" },
]);

test("mức truy cập của 55 route hiện có khớp ảnh chụp đã duyệt (đổi access/thêm/bớt route phải tự tay sửa SNAPSHOT)", async () => {
  const actual = await collectRealRoutes();
  assert.equal(actual.length, 55, "số route thực tế lệch 55 — có route mới chưa vào SNAPSHOT hoặc route bị xoá còn sót trong SNAPSHOT");
  assert.equal(SNAPSHOT.length, 55, "SNAPSHOT phải có đúng 55 dòng (khớp `grep -c 'route(' src/modules/*/index.ts` cộng lại)");
  assert.deepEqual(actual, SNAPSHOT);
});
