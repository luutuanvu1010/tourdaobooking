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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";

const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));

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

/** 12 module có route, đúng tên tệp + tên export như `src/index.ts` (gốc lắp ráp) dùng. */
const MODULES: readonly { entry: string; exportName: string }[] = [
  { entry: "./modules/accounts/index.ts", exportName: "accountsModule" },
  { entry: "./modules/audit/index.ts", exportName: "auditModule" },
  { entry: "./modules/auth/index.ts", exportName: "authModule" },
  { entry: "./modules/bangtin/index.ts", exportName: "bangtinModule" },
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
// 72 route trên 12 module (55 gốc + 2 route ADR-0014 Phase B: handler-cancel, handler-money-edit + 1 route "việc của tôi": dispatch/mine
// + 1 route Trang chủ mới 2026-09-23: GET /api/orders/dashboard + 2 route passkey công khai 2026-09-23 (ADR-0016): đăng nhập bằng Face ID
// + 8 route passkey tự phục vụ/quản trị 2026-09-23 (ADR-0016): bật/gỡ Face ID, đặt PIN bằng Face ID
// + 2 route vai 2026-09-24 (ADR-0018) + 1 route bắt tay Bảng tin 2026-09-26 (ADR-0022): GET /api/bang-tin, module bangtin)
// — đếm lại bằng `grep -c 'route(' src/modules/*/index.ts` khi nghi ngờ con số này lệch.
const SNAPSHOT: RouteSnapshot[] = sortRoutes([
  { method: "POST", path: "/api/account/change-pin", access: "staff" },
  { method: "GET", path: "/api/audit", access: "admin" },
  { method: "GET", path: "/api/auth/config", access: "public" },
  { method: "GET", path: "/api/bang-tin", access: "staff" }, // bắt tay WebSocket Bảng tin (ADR-0022) — mọi tài khoản đăng nhập; nhãn nhận tin tính ở máy chủ bằng can()
  { method: "POST", path: "/api/auth/login", access: "public" },
  { method: "POST", path: "/api/auth/logout", access: "public" },
  { method: "GET", path: "/api/auth/me", access: "staff" },
  { method: "POST", path: "/api/auth/passkey/login", access: "public" }, // đăng nhập bằng Face ID (ADR-0016) — tự gọi maintenanceBlock, không qua cổng bảo trì của router
  { method: "POST", path: "/api/auth/passkey/options", access: "public" }, // xin thách thức WebAuthn để đăng nhập
  { method: "GET", path: "/api/catalog", access: "orders" }, // Đối tác + Thực tập xem danh mục chỉ-đọc (chủ dự án chọn A, 2026-09-26)
  { method: "PATCH", path: "/api/catalog/:code", access: "admin" },
  { method: "POST", path: "/api/catalog/:code/ack", access: "admin" },
  { method: "DELETE", path: "/api/catalog/:code/override", access: "admin" },
  { method: "GET", path: "/api/catalog/admin", access: "admin" },
  { method: "POST", path: "/api/catalog/sync", access: "admin" },
  { method: "GET", path: "/api/company", access: "public" },
  { method: "GET", path: "/api/dispatch/assignees", access: "office" },
  { method: "GET", path: "/api/dispatch/handlers", access: "orders" }, // ADR-0019 điều 1: màn đơn; thân hỏi can(order.view) không ngữ cảnh
  { method: "GET", path: "/api/dispatch/mine", access: "staff" }, // "việc của tôi" (FIELD) — ADR-0014 điều 6/11, tự khoanh phạm vi bằng staff.id
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
  { method: "GET", path: "/api/orders", access: "orders" },
  { method: "POST", path: "/api/orders", access: "orders" },
  { method: "GET", path: "/api/orders/:id", access: "orders" },
  { method: "PUT", path: "/api/orders/:id", access: "orders" },
  { method: "PUT", path: "/api/orders/:id/booker", access: "orders" },
  { method: "PUT", path: "/api/orders/:id/handler", access: "orders" }, // module dispatch, không phải orders; ADR-0019 điều 1: màn đơn, thân hỏi dispatch.claim/dispatch.assign trước mọi thứ
  { method: "POST", path: "/api/orders/:id/handler-cancel", access: "staff" }, // module dispatch, ADR-0014 điều 11 — FIELD đang phụ trách, tự kiểm can() bên trong
  { method: "POST", path: "/api/orders/:id/handler-money-edit", access: "staff" }, // module dispatch, ADR-0014 điều 6 — FIELD đang phụ trách, tự kiểm can() bên trong
  { method: "POST", path: "/api/orders/:id/status", access: "orders" },
  { method: "PUT", path: "/api/orders/:id/trip", access: "orders" },
  { method: "GET", path: "/api/orders/dashboard", access: "orders" }, // Trang chủ — ADR-0019 điều 1: màn đơn; Đối tác/Thực tập vẫn 403 nhờ can(order.view/money.view/contact.view) không ngữ cảnh trong thân
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
  { method: "GET", path: "/api/staff/:id/roles", access: "admin" }, // vai + chỉnh tay của một tài khoản (ADR-0018)
  { method: "PUT", path: "/api/staff/:id/roles", access: "admin" }, // gán vai — quyền sinh từ vai (ADR-0018)
  { method: "POST", path: "/api/staff/:id/passkeys/remove-all", access: "admin" }, // quản trị viên gỡ mọi Face ID của một tài khoản (ADR-0016 điều 6/8)
  { method: "POST", path: "/api/staff/:id/reset-pin", access: "admin" },
  { method: "POST", path: "/api/staff/:id/unlock", access: "admin" },
  { method: "GET", path: "/api/staff/sheet", access: "admin" },
  { method: "POST", path: "/api/staff/sheet/apply", access: "admin" },
  { method: "GET", path: "/api/account/passkeys", access: "staff" }, // danh sách Face ID của chính mình
  { method: "POST", path: "/api/account/passkeys", access: "staff" }, // hoàn tất đăng ký một Face ID mới
  { method: "POST", path: "/api/account/passkeys/options", access: "staff" }, // xin thách thức "register" (yêu cầu PIN hiện tại trước)
  { method: "POST", path: "/api/account/passkeys/remove-all", access: "staff" }, // gỡ mọi Face ID của chính mình, đăng xuất mọi máy khác
  { method: "DELETE", path: "/api/account/passkeys/:id", access: "staff" }, // gỡ một Face ID, đăng xuất mọi máy khác
  { method: "POST", path: "/api/account/pin-by-passkey", access: "staff" }, // đặt PIN mới bằng Face ID, không cần PIN cũ (ADR-0016 điều 2b)
  { method: "POST", path: "/api/account/pin-by-passkey/options", access: "staff" }, // xin thách thức "pin" riêng
]);

// Lưới cho chính danh sách MODULES ở trên: nếu ai thêm một module mới có khai `export const xModule: AppModule` (tức có route) mà quên
// đưa vào MODULES, route của nó không được canh mức truy cập gì cả — bài kiểm chính bên dưới vẫn xanh vì nó chỉ thấy 12 module đã liệt kê,
// không tự phát hiện module thứ 13. Bài kiểm này quét THƯ MỤC thật (không hardcode số 12) để bắt đúng tình huống đó.
test("MODULES liệt kê ĐỦ mọi thư mục module có khai `...Module: AppModule` (module mới có route không được lặng lẽ thoát khỏi bài kiểm)", () => {
  const dirs = readdirSync(join(SRC_DIR, "modules")).filter((d) => statSync(join(SRC_DIR, "modules", d)).isDirectory());
  const routedDirs = dirs
    .filter((d) => /export const \w+Module\s*:\s*AppModule/.test(readFileSync(join(SRC_DIR, "modules", d, "index.ts"), "utf8")))
    .sort();
  const listed = MODULES.map((m) => m.entry.split("/")[2]!).sort();
  assert.deepEqual(routedDirs, listed, "có thư mục module khai AppModule nhưng chưa có trong MODULES của bài kiểm route-access này — thêm vào MODULES và SNAPSHOT");
});

test("mức truy cập của 72 route hiện có khớp ảnh chụp đã duyệt (đổi access/thêm/bớt route phải tự tay sửa SNAPSHOT)", async () => {
  const actual = await collectRealRoutes();
  // deepEqual TRƯỚC: khi có route mới/bị xoá, thông báo của nó chỉ ra ĐÚNG route lệch — hai assert.equal độ dài bên dưới chỉ để phòng hờ
  // (không bao giờ tự chạy tới nếu deepEqual đã trượt) và tài liệu hoá con số 72 để đối chiếu nhanh bằng mắt.
  // (Cập nhật 2026-09-22: 55 gốc + 2 route ADR-0014 Phase B (handler-cancel, handler-money-edit) + 1 route "việc của tôi" (dispatch/mine) = 58;
  // 2026-09-23: + 1 route Trang chủ mới (GET /api/orders/dashboard) = 59; + 2 route passkey công khai (đăng nhập bằng Face ID, ADR-0016) = 61;
  // + 8 route passkey tự phục vụ/quản trị (bật/gỡ Face ID, đặt PIN bằng Face ID, ADR-0016) = 69;
  // 2026-09-24: + 2 route vai (GET/PUT /api/staff/:id/roles, ADR-0018) = 71;
  // 2026-09-26: + 1 route bắt tay Bảng tin (GET /api/bang-tin, module bangtin, ADR-0022) = 72.)
  assert.deepEqual(actual, SNAPSHOT);
  assert.equal(actual.length, 72, "số route thực tế lệch 72 — có route mới chưa vào SNAPSHOT hoặc route bị xoá còn sót trong SNAPSHOT");
  assert.equal(SNAPSHOT.length, 72, "SNAPSHOT phải có đúng 72 dòng (khớp `grep -c 'route(' src/modules/*/index.ts` cộng lại)");
});
