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

/** 14 module có route, đúng tên tệp + tên export như `src/index.ts` (gốc lắp ráp) dùng. */
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
  { entry: "./modules/thongbao/index.ts", exportName: "thongbaoModule" },
  { entry: "./modules/van-chuyen/index.ts", exportName: "vanChuyenModule" }, // ADR-0040 D1
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
// 73 route trên 12 module (55 gốc + 2 route ADR-0014 Phase B: handler-cancel, handler-money-edit + 1 route "việc của tôi": dispatch/mine
// + 1 route Trang chủ mới 2026-09-23: GET /api/orders/dashboard + 2 route passkey công khai 2026-09-23 (ADR-0016): đăng nhập bằng Face ID
// + 8 route passkey tự phục vụ/quản trị 2026-09-23 (ADR-0016): bật/gỡ Face ID, đặt PIN bằng Face ID
// + 2 route vai 2026-09-24 (ADR-0018) + 1 route bắt tay Bảng tin 2026-09-26 (ADR-0022): GET /api/bang-tin, module bangtin
// + 1 route 2026-09-27 (ADR-0033): GET /api/catalog/for-order — danh mục cho người lập đơn)
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
  { method: "GET", path: "/api/catalog", access: "office" }, // ADR-0033 (2026-09-27): về cổng office như ADR-0019 điều 1 — đảo có chủ đích bản 1.15 (ADR-0028 điều 1: orders)
  { method: "GET", path: "/api/catalog/for-order", access: "orders" }, // ADR-0033: danh mục cho form lập đơn (Đối tác, Thực tập); chốt chặn thật là can(order.create) trong thân
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
  { method: "GET", path: "/api/orders/pool", access: "orders" }, // hàng chờ nhận (phần hẹp) — ADR-0030 S23-1/S23-2: thân hỏi can(order.pool.view) + !holdsPartner trước mọi đọc
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
  { method: "GET", path: "/api/parties/documents/mine", access: "staff" }, // ADR-0040 D2 (Ruling R4, R5): giấy tờ của CHÍNH MÌNH, số che — mọi nhân viên nội bộ; thân hỏi party.document.view (Đối tác 403)
  { method: "GET", path: "/api/parties/documents/meta", access: "office" }, // ADR-0040 D2: danh mục loại giấy tờ của người + hạng GPLX; thân hỏi party.document.write / admin.manage
  { method: "GET", path: "/api/parties/:id/documents", access: "office" }, // ADR-0040 D2: giấy tờ (số che) của một người; thân hỏi party.document.write (party.view KHÔNG mở giấy tờ)
  { method: "POST", path: "/api/parties/:id/documents", access: "office" }, // ADR-0040 D2: thêm giấy tờ; thân hỏi party.document.write + cấp bậc (Ruling R8)
  { method: "POST", path: "/api/parties/:id/documents/:did/renew", access: "office" }, // gia hạn = dòng mới (không gửi số thì chép số cũ); như trên
  { method: "POST", path: "/api/parties/:id/documents/:did/correct", access: "office" }, // sửa sai có lý do / huỷ dòng nhập nhầm; như trên
  { method: "POST", path: "/api/parties/:id/documents/:did/reveal", access: "office" }, // "xem đủ số" — route DUY NHẤT trả số đầy đủ; thân hỏi party.document.reveal + cấp bậc, ghi nhật ký TRƯỚC
  { method: "POST", path: "/api/parties/document-types", access: "admin" }, // ADR-0040 D2: danh mục loại giấy tờ của người — admin.manage viết thẳng (luật 4)
  { method: "PUT", path: "/api/parties/document-types/:code", access: "admin" }, // như trên; CCCD/GPLX không ngưng được (409 fixed_type)
  { method: "POST", path: "/api/parties/license-classes", access: "admin" }, // ADR-0040 D2: danh mục hạng giấy phép lái xe — admin.manage
  { method: "PUT", path: "/api/parties/license-classes/:code", access: "admin" }, // như trên
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
  { method: "GET", path: "/api/thong-bao", access: "staff" }, // hộp thông báo (ADR-0034)
  { method: "GET", path: "/api/thong-bao/tom-tat", access: "staff" }, // chuông: số chưa đọc + tin quan trọng chưa "Đã hiểu"
  { method: "POST", path: "/api/account/thong-bao/da-doc", access: "staff" }, // tự phục vụ: đặt mốc đã đọc của chính mình
  { method: "POST", path: "/api/account/thong-bao/:id/da-hieu", access: "staff" }, // tự phục vụ: xác nhận đã hiểu tin quan trọng
  { method: "POST", path: "/api/thong-bao", access: "admin" }, // Toàn quyền gửi tin thủ công (ADR-0034 điều 7; notice.send)
  { method: "GET", path: "/api/thong-bao/da-gui", access: "admin" }, // Toàn quyền xem danh sách tin đã gửi
  { method: "GET", path: "/api/thong-bao/:id/nguoi-da-hieu", access: "admin" }, // Toàn quyền xem ai đã hiểu một tin
  { method: "POST", path: "/api/thong-bao/:id/thu-hoi", access: "admin" }, // Toàn quyền thu hồi một tin đã gửi
  { method: "GET", path: "/api/thong-bao/moi-nhat", access: "staff" }, // Web Push (ADR-0036): SW hỏi câu của tin chưa đọc mới nhất
  { method: "GET", path: "/api/account/thong-bao/may", access: "staff" }, // Web Push: khoá công khai (nếu có) + số máy đang bật của chính mình
  { method: "POST", path: "/api/account/thong-bao/may", access: "staff" }, // Web Push: tự phục vụ đăng ký một máy
  { method: "POST", path: "/api/account/thong-bao/may/huy", access: "staff" }, // Web Push: tự phục vụ tắt một máy hoặc mọi máy
  { method: "GET", path: "/api/van-chuyen/xe", access: "office" }, // ADR-0040 D1: danh sách xe (cảnh báo giấy tờ); thân hỏi vehicle.manage — Quản trị + Toàn quyền
  { method: "POST", path: "/api/van-chuyen/xe", access: "office" }, // thêm xe (chủ xe = công ty chủ); như trên
  { method: "GET", path: "/api/van-chuyen/xe/:id", access: "office" }, // một xe + giấy tờ xe; như trên
  { method: "PUT", path: "/api/van-chuyen/xe/:id", access: "office" }, // sửa / ngừng / dùng lại xe (R15); như trên
  { method: "POST", path: "/api/van-chuyen/xe/:id/giay-to", access: "office" }, // ADR-0040 D1: thêm giấy tờ xe (xe đã ngừng → 409); thân hỏi vehicle.manage
  { method: "POST", path: "/api/van-chuyen/xe/:id/giay-to/:did/gia-han", access: "office" }, // gia hạn = dòng mới (không gửi số thì chép số cũ); như trên
  { method: "POST", path: "/api/van-chuyen/xe/:id/giay-to/:did/sua-sai", access: "office" }, // sửa sai có lý do (chỉ lý do dùng cho xe) / huỷ dòng; như trên
  { method: "GET", path: "/api/van-chuyen/meta", access: "office" }, // loại giấy tờ xe + ngưỡng; thân hỏi vehicle.manage / admin.manage
  { method: "POST", path: "/api/van-chuyen/loai-giay-to-xe", access: "admin" }, // danh mục loại giấy tờ xe — admin.manage viết thẳng (luật 4)
  { method: "PUT", path: "/api/van-chuyen/loai-giay-to-xe/:code", access: "admin" }, // như trên
  { method: "POST", path: "/api/van-chuyen/nguong-het-han", access: "admin" }, // ngưỡng "sắp hết hạn" (dòng chính sách mới) — CHỈ settings.ops (Toàn quyền), viết thẳng (luật 4)
  { method: "GET", path: "/api/van-chuyen/sap-het-han", access: "office" }, // danh sách giấy tờ sắp hết hạn (xe + tài xế, KHÔNG số) + count (R15); thân hỏi vehicle.manage
  // ADR-0049 D2, D3 (kế hoạch mục 1.7 route 9–18): chính sách điều phối, điều kiện xuất bến, hạng bằng — cổng office, thân hỏi settings.ops (chỉ Toàn quyền);
  // danh mục lý do — cổng admin, thân hỏi admin.manage viết thẳng (luật 4).
  { method: "GET", path: "/api/van-chuyen/chinh-sach-dieu-phoi", access: "office" }, // bản đang hiệu lực + lịch sử; thân hỏi settings.ops
  { method: "POST", path: "/api/van-chuyen/chinh-sach-dieu-phoi", access: "office" }, // thêm bản mới (hiệu lực ngay, không nhận ngày hiệu lực); như trên
  { method: "GET", path: "/api/van-chuyen/dieu-kien", access: "office" }, // điều kiện xuất bến theo cỡ xe; thân hỏi settings.ops
  { method: "POST", path: "/api/van-chuyen/dieu-kien", access: "office" }, // thêm điều kiện; như trên
  { method: "POST", path: "/api/van-chuyen/dieu-kien/:id/dong", access: "office" }, // đóng hiệu lực một lần; như trên
  { method: "GET", path: "/api/van-chuyen/hang-bang", access: "office" }, // hạng bằng → số khách (đang hiệu lực + lịch sử); thân hỏi settings.ops
  { method: "POST", path: "/api/van-chuyen/hang-bang", access: "office" }, // thêm dòng mới cho một hạng; như trên
  { method: "GET", path: "/api/van-chuyen/ly-do", access: "admin" }, // danh mục lý do điều phối — admin.manage viết thẳng (luật 4)
  { method: "POST", path: "/api/van-chuyen/ly-do", access: "admin" }, // thêm lý do; như trên
  { method: "PUT", path: "/api/van-chuyen/ly-do/:code", access: "admin" }, // sửa nhãn / thứ tự / ngưng (khoá lạc quan); như trên
]);

// Lưới cho chính danh sách MODULES ở trên: nếu ai thêm một module mới có khai `export const xModule: AppModule` (tức có route) mà quên
// đưa vào MODULES, route của nó không được canh mức truy cập gì cả — bài kiểm chính bên dưới vẫn xanh vì nó chỉ thấy 13 module đã liệt kê,
// không tự phát hiện module thứ 14. Bài kiểm này quét THƯ MỤC thật (không hardcode số 13) để bắt đúng tình huống đó.
test("MODULES liệt kê ĐỦ mọi thư mục module có khai `...Module: AppModule` (module mới có route không được lặng lẽ thoát khỏi bài kiểm)", () => {
  const dirs = readdirSync(join(SRC_DIR, "modules")).filter((d) => statSync(join(SRC_DIR, "modules", d)).isDirectory());
  const routedDirs = dirs
    .filter((d) => /export const \w+Module\s*:\s*AppModule/.test(readFileSync(join(SRC_DIR, "modules", d, "index.ts"), "utf8")))
    .sort();
  const listed = MODULES.map((m) => m.entry.split("/")[2]!).sort();
  assert.deepEqual(routedDirs, listed, "có thư mục module khai AppModule nhưng chưa có trong MODULES của bài kiểm route-access này — thêm vào MODULES và SNAPSHOT");
});

test("mức truy cập của 119 route hiện có khớp ảnh chụp đã duyệt (đổi access/thêm/bớt route phải tự tay sửa SNAPSHOT)", async () => {
  const actual = await collectRealRoutes();
  // deepEqual TRƯỚC: khi có route mới/bị xoá, thông báo của nó chỉ ra ĐÚNG route lệch — hai assert.equal độ dài bên dưới chỉ để phòng hờ
  // (không bao giờ tự chạy tới nếu deepEqual đã trượt) và tài liệu hoá con số 86 để đối chiếu nhanh bằng mắt.
  // (Cập nhật 2026-09-22: 55 gốc + 2 route ADR-0014 Phase B (handler-cancel, handler-money-edit) + 1 route "việc của tôi" (dispatch/mine) = 58;
  // 2026-09-23: + 1 route Trang chủ mới (GET /api/orders/dashboard) = 59; + 2 route passkey công khai (đăng nhập bằng Face ID, ADR-0016) = 61;
  // + 8 route passkey tự phục vụ/quản trị (bật/gỡ Face ID, đặt PIN bằng Face ID, ADR-0016) = 69;
  // 2026-09-24: + 2 route vai (GET/PUT /api/staff/:id/roles, ADR-0018) = 71;
  // 2026-09-26: + 1 route bắt tay Bảng tin (GET /api/bang-tin, module bangtin, ADR-0022) = 72;
  // 2026-09-27: + 1 route danh mục cho người lập đơn (GET /api/catalog/for-order, ADR-0033) = 73;
  // + 1 route hàng chờ nhận (GET /api/orders/pool, ADR-0030 S23-1) = 74;
  // + 4 route module thongbao đọc (ADR-0034): GET /api/thong-bao, GET /api/thong-bao/tom-tat, POST /api/account/thong-bao/da-doc,
  // POST /api/account/thong-bao/:id/da-hieu = 78; + 4 route Toàn quyền (ADR-0034 điều 7: gửi, xem đã gửi, xem ai đã hiểu, thu hồi) = 82;
  // + 4 route Web Push màn hình khoá (ADR-0036, Task 1): GET /api/thong-bao/moi-nhat, GET/POST /api/account/thong-bao/may,
  // POST /api/account/thong-bao/may/huy = 86.
  // 2026-09-28 (ADR-0040, Vận chuyển 1a): + 3 route đọc giấy tờ của người (GET /api/parties/documents/mine, /documents/meta, /:id/documents) = 89;
  // + 3 route ghi giấy tờ của người (POST /api/parties/:id/documents, …/renew, …/correct) = 92; + 1 route "xem đủ số" (…/reveal) = 93;
  // + 4 route danh mục giấy tờ của người (POST/PUT /api/parties/document-types, POST/PUT /api/parties/license-classes) = 97;
  // + 4 route xe của module mới van-chuyen (GET/POST /api/van-chuyen/xe, GET/PUT /api/van-chuyen/xe/:id) = 101;
  // + 3 route giấy tờ xe (POST …/xe/:id/giay-to, …/gia-han, …/sua-sai) = 104;
  // + 5 route danh mục loại giấy tờ xe, ngưỡng, danh sách sắp hết hạn (GET /api/van-chuyen/meta, POST/PUT …/loai-giay-to-xe, POST …/nguong-het-han,
  // GET …/sap-het-han) = 109.
  // 2026-09-29 (ADR-0049 lát 1.1, nhánh song song từ main): + 7 route chính sách điều phối / điều kiện xuất bến / hạng bằng (cổng office, settings.ops)
  // + 3 route danh mục lý do (cổng admin, admin.manage) = 119. Khi gộp với hai nền ADR-0047 (+5) và ADR-0048 (+1) con số thành 125.)
  assert.deepEqual(actual, SNAPSHOT);
  assert.equal(actual.length, 119, "số route thực tế lệch 119 — có route mới chưa vào SNAPSHOT hoặc route bị xoá còn sót trong SNAPSHOT");
  assert.equal(SNAPSHOT.length, 119, "SNAPSHOT phải có đúng 119 dòng (khớp `grep -c 'route(' src/modules/*/index.ts` cộng lại)");
});
