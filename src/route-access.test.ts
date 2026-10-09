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

/** 17 module có route, đúng tên tệp + tên export như `src/index.ts` (gốc lắp ráp) dùng. */
const MODULES: readonly { entry: string; exportName: string }[] = [
  { entry: "./modules/accounts/index.ts", exportName: "accountsModule" },
  { entry: "./modules/audit/index.ts", exportName: "auditModule" },
  { entry: "./modules/auth/index.ts", exportName: "authModule" },
  { entry: "./modules/bangtin/index.ts", exportName: "bangtinModule" },
  { entry: "./modules/billing/index.ts", exportName: "billingModule" }, // sổ tiền lượt 1 (ADR-0024 điều 1)
  { entry: "./modules/catalog/index.ts", exportName: "catalogModule" },
  { entry: "./modules/company/index.ts", exportName: "companyModule" },
  { entry: "./modules/dispatch/index.ts", exportName: "dispatchModule" },
  { entry: "./modules/feedback/index.ts", exportName: "feedbackModule" },
  { entry: "./modules/giao-dien/index.ts", exportName: "giaoDienModule" },
  { entry: "./modules/locations/index.ts", exportName: "locationsModule" },
  { entry: "./modules/maintenance/index.ts", exportName: "maintenanceModule" },
  { entry: "./modules/orders/index.ts", exportName: "ordersModule" },
  { entry: "./modules/parties/index.ts", exportName: "partiesModule" },
  { entry: "./modules/pricing/index.ts", exportName: "pricingModule" }, // sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1)
  { entry: "./modules/receipt/index.ts", exportName: "receiptModule" }, // sổ tiền lượt 1 (ADR-0024 điều 1 — hạng KHONG_BANG)
  { entry: "./modules/thongbao/index.ts", exportName: "thongbaoModule" },
  { entry: "./modules/van-chuyen/index.ts", exportName: "vanChuyenModule" }, // ADR-0040 D1
  { entry: "./modules/tro-ly/index.ts", exportName: "troLyModule" }, // ADR-0066: trợ lý Hỗ trợ
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
  { method: "POST", path: "/api/auth/session-ended", access: "public" }, // lý do máy này vừa bị đăng xuất (ADR-0075) — chỉ trả khi chữ ký token đúng
  { method: "GET", path: "/api/auth/me", access: "staff" },
  { method: "POST", path: "/api/auth/passkey/login", access: "public" }, // đăng nhập bằng Face ID (ADR-0016) — tự gọi maintenanceBlock, không qua cổng bảo trì của router
  { method: "POST", path: "/api/auth/passkey/options", access: "public" }, // xin thách thức WebAuthn để đăng nhập
  { method: "GET", path: "/api/catalog", access: "office" }, // ADR-0033 (2026-09-27): về cổng office như ADR-0019 điều 1 — đảo có chủ đích bản 1.15 (ADR-0028 điều 1: orders)
  { method: "GET", path: "/api/catalog/for-order", access: "orders" }, // ADR-0033: danh mục cho form lập đơn (Đối tác, Thực tập); chốt chặn thật là can(order.create) trong thân
  { method: "PATCH", path: "/api/catalog/:code", access: "admin" },
  { method: "POST", path: "/api/catalog/:code/ack", access: "admin" },
  { method: "DELETE", path: "/api/catalog/:code/override", access: "admin" },
  { method: "GET", path: "/api/catalog/admin", access: "admin" },
  { method: "GET", path: "/api/catalog/dem-xung-dot", access: "admin" }, // huy hiệu thanh bên: CHỈ số dịch vụ lệch giá; cùng ô admin.manage (dem-xung-dot.test.ts)
  { method: "POST", path: "/api/catalog/sync", access: "admin" },
  // ADR-0058 Đ4 (2026-09-30, Task A3): năm route nhóm dịch vụ — cổng admin + can(admin.manage) dòng đầu thân
  { method: "GET", path: "/api/catalog/groups", access: "admin" },
  { method: "POST", path: "/api/catalog/groups", access: "admin" },
  { method: "PATCH", path: "/api/catalog/groups/:code", access: "admin" },
  { method: "PUT", path: "/api/catalog/group-assignments", access: "admin" },
  { method: "GET", path: "/api/catalog/:code/group-history", access: "admin" },
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
  { method: "GET", path: "/api/giao-dien", access: "admin" }, // ADR-0087: chỉ Toàn quyền (ô settings.ops viết thẳng trong thân route)
  { method: "PUT", path: "/api/giao-dien", access: "admin" },
  { method: "GET", path: "/giao-dien.css", access: "public" }, // ADR-0102: đường MỚI (ngoài /api, service worker đệm được); cùng thân với đường cũ ngay dưới
  { method: "GET", path: "/api/giao-dien.css", access: "public" }, // CÔNG KHAI có chủ đích: trang Đăng nhập cần CSS trước khi có phiên; chỉ màu/phông/cỡ, không dữ liệu cá nhân (ADR-0087) — GIỮ làm đường cũ cho trang đã đệm trước khi đổi (ADR-0102)
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
  // Sổ tiền lượt 1 (module billing — ADR-0024/0025/0026, kế hoạch §3.4): 12 route; mỗi route tự hỏi can() với ô của MATRIX.
  { method: "GET", path: "/api/orders/:id/payments", access: "orders" }, // order.view + money.view phạm vi đơn
  { method: "POST", path: "/api/orders/:id/payments", access: "orders" }, // payment.receive { ownerId, assigned }
  { method: "GET", path: "/api/orders/:id/nhap-ke-toan", access: "orders" }, // ADR-0060: order.view + accounting.entry.view phạm vi đơn
  { method: "POST", path: "/api/orders/:id/nhap-ke-toan", access: "office" }, // ADR-0060: accounting.entry.mark (Kế toán, Toàn quyền)
  { method: "POST", path: "/api/orders/:id/delivered", access: "orders" }, // order.handover { assigned } — HDV đang phụ trách, Quản trị, Toàn quyền
  { method: "POST", path: "/api/orders/:id/completed", access: "office" }, // order.complete — Kế toán, Toàn quyền
  { method: "POST", path: "/api/ledger/balances", access: "orders" }, // POST chỉ-đọc: order.view + money.view từng đơn
  { method: "GET", path: "/api/ledger/unpaid-summary", access: "orders" }, // order.view + money.view không ngữ cảnh (khuôn Trang chủ)
  { method: "GET", path: "/api/ledger/mine", access: "staff" }, // ledger.view own — HDV không qua cổng office
  { method: "GET", path: "/api/ledger", access: "office" }, // ledger.view any
  { method: "POST", path: "/api/ledger/company-receipts/:receiptId/confirm", access: "office" }, // ledger.write
  { method: "POST", path: "/api/ledger/settlements", access: "office" }, // ledger.write
  { method: "POST", path: "/api/ledger/refunds", access: "office" }, // payment.refund
  { method: "POST", path: "/api/ledger/adjustments", access: "office" }, // ledger.write
  { method: "POST", path: "/api/ledger/receipt-replacements", access: "office" }, // ledger.write — "Thay lần thu" (ADR-0088 đ2)
  { method: "GET", path: "/api/ledger/ky", access: "office" }, // khoá sổ tháng (ADR-0080 D1): ledger.view any — tháng đã khoá, tháng khoá kế tiếp, bảng kiểm
  { method: "POST", path: "/api/ledger/ky/:period/khoa", access: "office" }, // ledger.period.close (Kế toán, Toàn quyền — Quản trị không)
  { method: "GET", path: "/api/orders/:id/receipt", access: "orders" }, // module receipt: order.view + money.view + contact.view phạm vi đơn
  { method: "GET", path: "/api/orders/:id/qr-thanh-toan", access: "orders" }, // ADR-0108 đ3, module receipt: order.view (HDV không phụ trách → 404) rồi money.view phạm vi đơn
  // Sổ đại lý đợt 1 (module pricing — ADR-0077, ADR-0078 B1): 8 route; mỗi route tự hỏi can() ở dòng đầu thân (partner.commission.*, supply.terms.*; route tìm người hưởng hỏi order.create).
  { method: "GET", path: "/api/pricing/hoa-hong", access: "office" }, // partner.commission.view
  { method: "POST", path: "/api/pricing/hoa-hong", access: "office" }, // partner.commission.write — thêm mức (chỉ thêm)
  { method: "POST", path: "/api/pricing/hoa-hong/:id/dong", access: "office" }, // partner.commission.write — đóng mức
  { method: "GET", path: "/api/pricing/thu-tra", access: "office" }, // partner.commission.view — thử tra, chỉ đọc
  { method: "GET", path: "/api/pricing/cung-ung", access: "office" }, // supply.terms.view — Bán hàng KHÔNG xem
  { method: "POST", path: "/api/pricing/cung-ung", access: "office" }, // supply.terms.write
  { method: "POST", path: "/api/pricing/cung-ung/:id/dong", access: "office" }, // supply.terms.write
  { method: "GET", path: "/api/pricing/nguoi-huong", access: "orders" }, // order.create và không phải Đối tác — tìm người hưởng theo tên cho form lập đơn
  // Sổ đại lý đợt 1 (module orders — ADR-0077 điều 10–11; đặc tả §6, Task 5): phần thương mại của đơn. Đọc: order.view + order.terms.view phạm vi đơn (Đối tác nhận DTO hẹp); ghi: order.terms.override, không bao giờ cho tài khoản có quyền Đối tác.
  { method: "GET", path: "/api/orders/:id/thuong-mai", access: "orders" },
  { method: "POST", path: "/api/orders/:id/thuong-mai/:serviceId", access: "office" }, // order.terms.override — ghi mức tay (Kế toán, Quản trị, Toàn quyền)
  { method: "POST", path: "/api/orders/:id/status", access: "orders" },
  { method: "POST", path: "/api/orders/:id/cancel-reason", access: "orders" }, // ADR-0089 đ8: phân loại lý do huỷ — tự kiểm can(order.cancel.classify) bên trong
  // ADR-0089 (cọc đơn huỷ, migration 0079): sáu lệnh ghi văn phòng (tự kiểm ô bên trong) + ba route đọc của Kế toán (ledger.view any).
  { method: "POST", path: "/api/orders/:id/coc/duyet", access: "office" },
  { method: "POST", path: "/api/orders/:id/coc/duyet/:duyetId/huy", access: "office" },
  { method: "POST", path: "/api/orders/:id/coc/chi", access: "office" },
  { method: "POST", path: "/api/orders/:id/coc/chuyen", access: "office" },
  { method: "POST", path: "/api/orders/:id/coc/hoan-ngoai", access: "office" },
  { method: "POST", path: "/api/orders/:id/coc/hoan-ngoai/:ghiId/xac-nhan", access: "office" },
  { method: "GET", path: "/api/ledger/coc", access: "office" },
  { method: "GET", path: "/api/ledger/coc/doi-chieu", access: "office" },
  { method: "GET", path: "/api/ledger/coc/dem", access: "office" },
  { method: "PUT", path: "/api/orders/:id/trip", access: "orders" },
  // ADR-0047 A1 (2026-09-29): chặng đưa đón SAU XÁC NHẬN — thân hỏi can(order.trip.edit, { ownerId, assigned }) trước khi đọc thân
  { method: "POST", path: "/api/orders/:id/legs", access: "orders" },
  { method: "PUT", path: "/api/orders/:id/legs/:legId", access: "orders" },
  { method: "POST", path: "/api/orders/:id/legs/:legId/close", access: "orders" },
  { method: "POST", path: "/api/orders/:id/legs/:legId/short-notice", access: "orders" },
  // ADR-0047 A2 (2026-09-29): danh sách hành khách — GET hỏi can(order.view) rồi can(contact.view); POST hỏi can(order.passenger.write) trước khi đọc thân
  { method: "GET", path: "/api/orders/:id/passengers", access: "orders" },
  { method: "POST", path: "/api/orders/:id/passengers", access: "orders" },
  { method: "GET", path: "/api/orders/dashboard", access: "orders" }, // Trang chủ — ADR-0019 điều 1: màn đơn; Đối tác/Thực tập vẫn 403 nhờ can(order.view/money.view/contact.view) không ngữ cảnh trong thân
  { method: "GET", path: "/api/orders/dem-nhap", access: "orders" }, // huy hiệu thanh bên: CHỈ số đơn nháp; cùng ba ô quyền với dashboard (dem-nhap.test.ts)
  { method: "GET", path: "/api/orders/pool", access: "orders" }, // hàng chờ nhận (phần hẹp) — ADR-0030 S23-1/S23-2: thân hỏi can(order.pool.view) + !holdsPartner trước mọi đọc
  { method: "GET", path: "/api/orders/nguoi-lap", access: "orders" }, // ADR-0067: thân hỏi ba ô "xem mọi đơn" (order.view/money.view/contact.view, không ngữ cảnh) trước mọi đọc
  { method: "GET", path: "/api/orders/moc-toi-thieu", access: "orders" }, // ruling R-P15 (ADR-0049 I31 cách a): thân hỏi can(order.create) trước mọi đọc; mốc qua ctx.mocToiThieu
  { method: "GET", path: "/api/cai-dat/nhap-tay", access: "orders" }, // ADR-0061 điều 6: công tắc nhập tay (module orders) — thân hỏi can(order.create); trả duocNhapTay của người gọi
  { method: "POST", path: "/api/cai-dat/nhap-tay", access: "admin" }, // ADR-0061 điều 6: bật / tắt — thân hỏi can(settings.ops) (chỉ Toàn quyền)
  { method: "GET", path: "/api/parties", access: "office" },
  { method: "POST", path: "/api/parties", access: "office" },
  { method: "GET", path: "/api/parties/:id", access: "office" },
  { method: "PUT", path: "/api/parties/:id", access: "office" },
  { method: "POST", path: "/api/parties/:id/contacts", access: "office" },
  { method: "POST", path: "/api/parties/:id/contacts/:cid/end", access: "office" },
  { method: "GET", path: "/api/parties/:id/tai-khoan-nhan-tien", access: "office" }, // ADR-0108 đ2: company.legal.write (chỉ Toàn quyền); hồ sơ phải đang là công ty chủ
  { method: "PUT", path: "/api/parties/:id/tai-khoan-nhan-tien", access: "office" }, // ADR-0108 đ2: đóng + mở + nhật ký một lô; nhật ký không chép số
  { method: "POST", path: "/api/parties/:id/relationships", access: "admin" },
  { method: "POST", path: "/api/parties/:id/relationships/:rid/end", access: "admin" },
  { method: "POST", path: "/api/parties/:id/roles", access: "admin" },
  { method: "POST", path: "/api/parties/:id/roles/:rid/end", access: "admin" },
  { method: "POST", path: "/api/parties/:id/merge/preview", access: "admin" }, // ADR-0068: xem trước gộp hồ sơ — admin.manage viết thẳng + cấp bậc
  { method: "POST", path: "/api/parties/:id/merge", access: "admin" }, // ADR-0068: gộp hồ sơ cá nhân — admin.manage + cấp bậc, một db.batch()
  { method: "GET", path: "/api/parties/lookup", access: "office" },
  { method: "GET", path: "/api/parties/duplicates", access: "admin" }, // ADR-0068 Đ8: hồ sơ nghi trùng — admin.manage, chỉ đọc
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
  // ADR-0071 điều 1b: Quản lý tài khoản sang cổng MỚI "accounts" (Quản trị, Toàn quyền, Hành chính nhân sự); thân hỏi account.view / account.create / account.edit.
  { method: "GET", path: "/api/staff", access: "accounts" },
  { method: "POST", path: "/api/staff", access: "accounts" }, // tạo tài khoản: account.create (HCNS + Toàn quyền — Quản trị KHÔNG)
  { method: "PATCH", path: "/api/staff/:id", access: "accounts" },
  { method: "PUT", path: "/api/staff/:id/permissions", access: "accounts" },
  { method: "GET", path: "/api/staff/:id/roles", access: "accounts" }, // vai + chỉnh tay của một tài khoản (ADR-0018)
  { method: "PUT", path: "/api/staff/:id/roles", access: "accounts" }, // gán vai — quyền sinh từ vai (ADR-0018)
  { method: "POST", path: "/api/staff/:id/passkeys/remove-all", access: "admin" }, // quản trị viên gỡ mọi Face ID của một tài khoản (ADR-0016 điều 6/8) — GIỮ cổng admin (ADR-0071 điều 1e: HCNS không)
  { method: "POST", path: "/api/staff/:id/reset-pin", access: "admin" },
  { method: "POST", path: "/api/staff/:id/unlock", access: "admin" },
  { method: "GET", path: "/api/account/sessions", access: "staff" }, // ADR-0075 điều 7: lịch sử phiên của CHÍNH MÌNH (tự phục vụ)
  { method: "GET", path: "/api/sessions", access: "admin" }, // ADR-0075 điều 7: sổ phiên của mọi tài khoản — thân hỏi auth.session.viewAll (chỉ Toàn quyền)
  { method: "POST", path: "/api/sessions/:id/revoke", access: "admin" }, // ADR-0075 điều 7–8: gỡ một phiên — thân hỏi auth.session.revoke (chỉ Toàn quyền), nhật ký im lặng session_revoked
  { method: "GET", path: "/api/sessions/policy", access: "admin" }, // ADR-0085: chính sách đăng nhập — thân hỏi auth.session.policy (chỉ Toàn quyền)
  { method: "GET", path: "/api/sessions/policy/preview", access: "admin" }, // ADR-0085: xem trước số máy bị đăng xuất — thân hỏi auth.session.policy
  { method: "PUT", path: "/api/sessions/policy", access: "admin" }, // ADR-0085: lưu chính sách (kiểm phiên bản, siết theo tập) — thân hỏi auth.session.policy, nhật ký im lặng session_policy_changed
  { method: "GET", path: "/api/staff/ho-so-khop", access: "accounts" }, // ADR-0068 Đ9 (C1): hồ sơ khớp khi Thêm tài khoản — account.create (ADR-0071)
  // ADR-0071 điều 2: GET /api/staff/sheet, POST /api/staff/sheet/apply (đồng bộ nhân viên từ Google Sheet) ĐÃ GỠ.
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
  { method: "GET", path: "/api/van-chuyen/xe/:id/ban", access: "office" }, // ADR-0055 A5: khung bận của xe; thân hỏi vehicle.manage
  { method: "POST", path: "/api/van-chuyen/xe/:id/ban", access: "office" }, // ghi khung (chồng chuyến → 409 khung_ban_chong_chuyen)
  { method: "POST", path: "/api/van-chuyen/xe/:id/ban/:bid/rut", access: "office" }, // rút một lần (version)
  { method: "GET", path: "/api/van-chuyen/meta", access: "office" }, // loại giấy tờ xe + ngưỡng; thân hỏi vehicle.manage / admin.manage
  { method: "POST", path: "/api/van-chuyen/loai-giay-to-xe", access: "admin" }, // danh mục loại giấy tờ xe — admin.manage viết thẳng (luật 4)
  { method: "PUT", path: "/api/van-chuyen/loai-giay-to-xe/:code", access: "admin" }, // như trên
  { method: "POST", path: "/api/van-chuyen/nguong-het-han", access: "admin" }, // ngưỡng "sắp hết hạn" (dòng chính sách mới) — CHỈ settings.ops (Toàn quyền), viết thẳng (luật 4)
  { method: "GET", path: "/api/van-chuyen/sap-het-han", access: "office" }, // danh sách giấy tờ sắp hết hạn (xe + tài xế, KHÔNG số) + count (R15); thân hỏi vehicle.manage
  { method: "GET", path: "/api/van-chuyen/nha-xe", access: "office" }, // ADR-0048 D1: nhà xe đang hợp tác + công ty chủ + số xe, số tài xế; thân hỏi vehicle.manage
  // ADR-0057 T1 (kế hoạch Đợt 4 Task 4): bảng giá thuê xe — thân hỏi transport.rate.view / transport.rate.manage; tuyến, cỡ xe: đọc trip.dispatch HOẶC rate.view.
  { method: "GET", path: "/api/van-chuyen/bang-gia", access: "office" },
  { method: "POST", path: "/api/van-chuyen/bang-gia", access: "office" },
  { method: "POST", path: "/api/van-chuyen/bang-gia/:id/ket-thuc", access: "office" },
  { method: "GET", path: "/api/van-chuyen/tuyen", access: "office" },
  { method: "POST", path: "/api/van-chuyen/tuyen", access: "office" },
  { method: "PUT", path: "/api/van-chuyen/tuyen/:code", access: "office" },
  { method: "GET", path: "/api/van-chuyen/co-xe", access: "office" },
  { method: "POST", path: "/api/van-chuyen/co-xe", access: "office" },
  { method: "PUT", path: "/api/van-chuyen/co-xe/:code", access: "office" },
  // ADR-0057 T2 (kế hoạch Đợt 4 Task 10): chi phí chuyến xe thuê + bảng kê — thân hỏi transport.cost.view / transport.cost.adjust.
  { method: "GET", path: "/api/van-chuyen/chuyen/:id/chi-phi", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/chi-phi/dao", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/chi-phi/chup-lai", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan", access: "office" },
  { method: "GET", path: "/api/van-chuyen/chi-phi", access: "office" },
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
  // ADR-0054 D10.1 (+ ADR nháp nơi trả mặc định, đã duyệt 1/10): mẫu đưa đón theo dịch vụ. Màn Danh mục: cổng admin + admin.manage đầu thân; form lập đơn: cổng orders
  // (tiền lệ /api/catalog/for-order) + can(order.create) đầu thân — chỉ mẫu hiện hành, ba khoá mỗi mã.
  { method: "GET", path: "/api/van-chuyen/mau-chang", access: "orders" },
  { method: "GET", path: "/api/van-chuyen/mau-chang/:code", access: "admin" },
  { method: "POST", path: "/api/van-chuyen/mau-chang/:code", access: "admin" },
  // ADR-0049 D1–D3 (Task A13, kế hoạch mục 1.7 route 1–8, 40): chuyến xe — văn phòng lập kế hoạch. Thân hỏi trip.view / trip.dispatch (+ trip.override khi
  // gửi phá lệ) TRƯỚC mọi đọc; hàm hẹp của orders chỉ gọi sau can() (src/orders-cong-bo.test.ts).
  { method: "GET", path: "/api/van-chuyen/lich", access: "office" },
  { method: "GET", path: "/api/van-chuyen/ban-xe", access: "office" }, // trang tuần Lịch xe bận; thân hỏi vehicle.manage (câu 3.4)
  { method: "GET", path: "/api/van-chuyen/huong-dan-vien", access: "office" }, // người đi kèm gắn được (lời chủ 2026-10-01) — ô trip.dispatch
  { method: "GET", path: "/api/van-chuyen/chuyen/:id", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen", access: "office" },
  { method: "PUT", path: "/api/van-chuyen/chuyen/:id", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/rut", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/doi", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/huy", access: "office" },
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/cap-nhat-diem", access: "office" }, // ADR-0050 VK1-B route 40
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/cap-nhat-khach", access: "office" }, // R-P29 (chủ lần 16) — "Cập nhật khách theo đơn" (khuôn route 40)
  { method: "GET", path: "/api/van-chuyen/chuyen/:id/cuu-ho", access: "office" }, // Đợt 5 ADR-0052 D5c — cứu hộ đơn giản, chỉ đọc (trip.dispatch)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/them-diem", access: "office" }, // Đợt 5 ADR-0052 D5.1 — thêm điểm khi xe đang chạy (trip.dispatch)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy", access: "office" }, // Đợt 5 ADR-0052 D5.2 — văn phòng báo khách huỷ (trip.dispatch)
  { method: "GET", path: "/api/van-chuyen/cuoc-cua-toi", access: "staff" }, // ADR-0049 Task A15 route 19 — tài xế (ô trip.view assigned)
  { method: "GET", path: "/api/van-chuyen/cuoc-cua-toi/:id", access: "staff" }, // route 20
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/hanh-khach", access: "staff" }, // Đợt 5 A-1b ADR-0052 D5b — tài xế bổ sung tên (trip.passenger.add) — chủ duyệt 5/10
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/xuat-ben", access: "staff" }, // route 21 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/diem/:sid/da-toi", access: "staff" }, // route 22 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/don", access: "staff" }, // route 23 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang", access: "staff" }, // route 24 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy", access: "staff" }, // route 25 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/tra", access: "staff" }, // route 26 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc", access: "staff" }, // route 27 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan", access: "staff" }, // route 28 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/cuoc-cua-toi/:id/thu-tu", access: "staff" }, // route 29 — tài xế (trip.progress assigned)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/xuat-ben", access: "office" }, // route 31 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/diem/:sid/da-toi", access: "office" }, // route 32 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo/:aid/don", access: "office" }, // route 33 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo/:aid/vang", access: "office" }, // route 34 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo/:aid/khach-huy", access: "office" }, // route 35 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/phan-bo/:aid/tra", access: "office" }, // route 36 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/ket-thuc", access: "office" }, // route 37 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/ket-thuc-gian-doan", access: "office" }, // route 38 — văn phòng bấm thay (R-P1)
  { method: "POST", path: "/api/van-chuyen/chuyen/:id/thu-tu", access: "office" }, // route 39 — văn phòng bấm thay (R-P1)
  { method: "GET", path: "/api/van-chuyen/nhac-goi-khach", access: "office" }, // ADR-0051 GB1 — danh sách nhắc gọi khách (trip.view)
  { method: "POST", path: "/api/van-chuyen/chang/:legId/da-goi-bao", access: "office" }, // ADR-0051 — trip.call_ack
  { method: "POST", path: "/api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao", access: "office" }, // ADR-0051 — trip.call_ack
  { method: "GET", path: "/api/van-chuyen/xe-cua-don/:orderId", access: "office" }, // ADR-0059 — xe trên chi tiết đơn (trip.view + order.view không ngữ cảnh)
  { method: "POST", path: "/api/tro-ly/hoi", access: "staff" }, // ADR-0066 điều 1 — mọi tài khoản đăng nhập, ô assistant.ask (any)
  { method: "GET", path: "/api/tro-ly/cai-dat", access: "office" }, // ADR-0066 trang ghép — chỉ Toàn quyền (settings.ops trong thân)
  { method: "POST", path: "/api/tro-ly/cai-dat", access: "office" }, // như trên
  { method: "GET", path: "/api/tro-ly/khung", access: "staff" }, // ADR-0069 điều 3, 4 — cờ được dùng + câu chào (mọi tài khoản, không dữ liệu nghiệp vụ); ADR-0084: + cách gọi / xưng của chính người gọi
  { method: "POST", path: "/api/tro-ly/vai", access: "office" }, // ADR-0069 điều 1, 3 — chỉ Toàn quyền (settings.ops trong thân)
  { method: "POST", path: "/api/tro-ly/thu-khoa", access: "office" }, // ADR-0069 điều 2 — như trên
  { method: "GET", path: "/api/tro-ly/loi-dan", access: "office" }, // ADR-0069 điều 4 — như trên
  { method: "POST", path: "/api/tro-ly/loi-dan", access: "office" }, // như trên
  { method: "GET", path: "/api/tro-ly/ngu-canh", access: "office" }, // như trên
  { method: "POST", path: "/api/tro-ly/ngu-canh", access: "office" }, // như trên
  { method: "PUT", path: "/api/tro-ly/ngu-canh/:id", access: "office" }, // như trên
  { method: "GET", path: "/api/tro-ly/lich-su", access: "office" }, // ADR-0069 điều 5 — như trên
  { method: "GET", path: "/api/tro-ly/bo-nao", access: "office" }, // ADR-0073 Đ1, Đ2 — chỉ Toàn quyền (settings.ops trong thân)
  { method: "PUT", path: "/api/tro-ly/bo-nao", access: "office" }, // như trên
  { method: "GET", path: "/api/tro-ly/bo-nao/lich-su", access: "office" }, // ADR-0073 B6 — như trên
  { method: "POST", path: "/api/tro-ly/thu", access: "office" }, // ADR-0073 Đ5 — ô thử, chỉ Toàn quyền (settings.ops trong thân)
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

test("mức truy cập của 213 route hiện có khớp ảnh chụp đã duyệt (đổi access/thêm/bớt route phải tự tay sửa SNAPSHOT)", async () => {
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
  // 2026-09-29 (ADR-0048 D1): + 1 route danh sách nhà xe đối tác (GET /api/van-chuyen/nha-xe) = 110.
  // 2026-09-29 (ADR-0049 lát 1.1, nhánh song song từ main): + 7 route chính sách điều phối / điều kiện xuất bến / hạng bằng (cổng office, settings.ops)
  // + 3 route danh mục lý do (cổng admin, admin.manage) = 120 (gộp trên nền main 1.37 = 110 route, 29/9).
  // 2026-09-29 (ADR-0047 A1, gộp nền Phần A vào nhánh ADR-0049): + 3 route chặng đưa đón sau xác nhận (POST /api/orders/:id/legs, PUT …/legs/:legId,
  // POST …/legs/:legId/close) + 2 route danh sách hành khách (GET/POST /api/orders/:id/passengers, ADR-0047 A2) = 125.
  // 2026-09-29 (ADR-0049 lát 1.4, Task A10): + 1 route đặt gấp (POST /api/orders/:id/legs/:legId/short-notice — cổng orders, ô order.leg.short_notice) = 126.
  // 2026-09-29 đêm (ruling R-P15 của điều phối): + 1 route đọc mốc (GET /api/orders/moc-toi-thieu — cổng orders, ô order.create) = 127.
  // 2026-09-29 đêm (ADR-0049 Task A13): + 9 route chuyến xe của văn phòng (route 1–8, 40 — cổng office) = 136.
  // 2026-09-30 (ADR-0049 Task A15): + 11 route tài xế (19–29 — cổng staff) + 9 route văn phòng bấm thay (31–39 — cổng office) = 156. Kế hoạch mục 1.7 ghi 155:
  // lệch MỘT vì route đọc mốc của ruling R-P15 (GET /api/orders/moc-toi-thieu) không có trong bảng kế hoạch.
  // 2026-09-30 (ADR-0051, Task A-GB): + 3 route nhắc "gọi báo khách" (GET …/nhac-goi-khach, POST …/chang/:legId/da-goi-bao, …/bo-danh-dau-goi-bao) = 159.)
  // 2026-09-30 (R-P29, chủ lần 16): + POST /api/van-chuyen/chuyen/:id/cap-nhat-khach = 160.
  // 2026-09-30 (sổ tiền lượt 1, module billing): + 12 route (/api/orders/:id/payments ×2, delivered, completed; /api/ledger ×8) = 172.
  // 2026-09-30 (sổ tiền lượt 1, module receipt): + GET /api/orders/:id/receipt = 173.
  // 2026-09-30 (ADR-0066, module tro-ly): + POST /api/tro-ly/hoi (staff), GET/POST /api/tro-ly/cai-dat (office) = 176.
  // 2026-09-30 (ADR-0059, module van-chuyen): + GET /api/van-chuyen/xe-cua-don/:orderId (office) = 177.
  // 2026-09-30 (ADR-0060, module billing): + GET/POST /api/orders/:id/nhap-ke-toan (orders / office) = 179 (gộp 1.46: nhánh ghi 178 trên nền 176).
  // 2026-09-30 (ADR-0061, module orders): + GET /api/cai-dat/nhap-tay (orders), POST /api/cai-dat/nhap-tay (admin) = 181 (gộp 1.46: nhánh ghi 178 trên nền 176).
  // 2026-09-30 (ADR-0067, module orders): + GET /api/orders/nguoi-lap (orders) = 182 (gộp 1.46: nhánh ghi 177 trên nền 176).
  // 2026-10-01 (ADR-0069, bảng điều khiển trợ lý): + GET /api/tro-ly/khung (staff) + 8 route quản lý (office, settings.ops) = 191 (gộp 1.47: nhánh ghi 185 trên nền 176).
  // 2026-09-30 (ADR-0058 Đ4, Task A3): + 5 route nhóm dịch vụ (GET/POST /api/catalog/groups, PATCH …/groups/:code, PUT …/group-assignments,
  // GET /api/catalog/:code/group-history — cổng admin) = 187 (gộp main 1.46: nhánh ghi 181 trên nền 176, main thêm 6); gộp main 1.47 (+ 9 route ADR-0069) = 196.
  // 2026-10-01 (ADR-0068, gộp hồ sơ): + 2 route (POST /api/parties/:id/merge/preview, …/merge — admin) = 198 (gộp main 1.49: nhánh ghi 193 trên nền 191).
  // 2026-10-01 (ADR-0068 Đ8): + GET /api/parties/duplicates = 199.
  // 2026-10-01 (ADR-0068 Đ9): + GET /api/staff/ho-so-khop = 200.
  // 2026-10-01 (ADR-0071 điều 2): − GET /api/staff/sheet, − POST /api/staff/sheet/apply (gỡ đồng bộ nhân viên từ Google Sheet) = 198.
  // 2026-10-01 (ADR-0054 D10.1 + nơi trả mặc định — kế hoạch ô mới của chặng Task 6): + GET /api/van-chuyen/mau-chang (orders), GET/POST …/mau-chang/:code (admin) = 201.
  // 2026-10-01 (ADR-0073, bộ não trợ lý): + GET/PUT /api/tro-ly/bo-nao, GET /api/tro-ly/bo-nao/lich-su (office, settings.ops) = 204 (gộp main 1.53: nhánh ghi 201 trên nền 198, main thêm 3).
  // 2026-10-01 (ADR-0073 Đ5): + POST /api/tro-ly/thu (office, settings.ops) = 205.
  // 2026-10-01 (ADR-0075 Task 4 + điều 7–8): + POST /api/auth/session-ended (public), GET /api/account/sessions (staff), GET /api/sessions, POST /api/sessions/:id/revoke (admin) = 209 (gộp main 1.57: nhánh ghi 205 trên nền 201, main lên 205 ⇒ 201 + 4 + 4).
  // 2026-10-01 (ADR-0085): + 3 route chính sách đăng nhập (GET/PUT /api/sessions/policy, GET /api/sessions/policy/preview — admin) = 212.
  // 2026-10-02 (Đợt 1 Task 7): + GET /api/van-chuyen/huong-dan-vien (office; người đi kèm, lời chủ 1/10) = 213.
  // 2026-10-02 (ADR-0087, module giao-dien): + GET/PUT /api/giao-dien (admin, settings.ops), GET /api/giao-dien.css (public) = 216 (gộp main 1.66: nhánh ghi 215 trên nền 212, main lên 213 ⇒ 213 + 3).
  // 2026-10-02 (ADR-0055 VK2-A, Vận chuyển Đợt 3): + GET/POST /api/van-chuyen/xe/:id/ban, POST …/ban/:bid/rut, GET /api/van-chuyen/ban-xe (office, vehicle.manage) = 220.
  // 2026-10-05 (Vận chuyển Đợt 5, ADR-0052 D5): + POST /api/van-chuyen/chuyen/:id/them-diem, POST …/phan-bo/:aid/bao-huy (office, trip.dispatch) = 222.
  // 2026-10-05 (Đợt 5 A-1b Task 15): + GET /api/van-chuyen/chuyen/:id/cuu-ho (office, trip.dispatch; chỉ đọc) = 223.
  // 2026-10-05 (Đợt 5 A-1b Task 14 — chủ duyệt 5/10): + POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach (staff, trip.passenger.add) = 224.
  assert.deepEqual(actual, SNAPSHOT);
  // 2026-10-02 (Đợt 4 Task 4, ADR-0057 T1): + 9 route bảng giá thuê xe, tuyến, cỡ xe (office) = 225 (trên nền 216 của nhánh).
  // 2026-10-02 (Đợt 4 Task 10, ADR-0057 T2): + 6 route chi phí chuyến xe thuê + bảng kê (office) = 231 trên nhánh; gộp main ffed6f1c (1.78): main 220 + 15 route Đợt 4 = 238.
  // 2026-10-05 (dot5-tang3): gộp tầng 3 Đợt 5 (POST …/cuoc-cua-toi/:id/hanh-khach) lên main 1.79 238 = 239.
  // 2026-10-05 (ADR-0102, nghiên cứu tốc độ đợt 1): + GET /giao-dien.css (public, cùng thân với /api/giao-dien.css) = 240.
  // 2026-10-05 (nghiên cứu tốc độ, đợt 1 việc 3): + GET /api/orders/dem-nhap (orders), GET /api/catalog/dem-xung-dot (admin) = 242.
  // 2026-10-06 (dựng lại nhánh năm lỗi tiền lên main đã có tốc độ đợt 1): + POST /api/orders/:id/cancel-reason (orders; ADR-0089, phân loại lý do huỷ) = 243; Phần B: + 6 lệnh cọc /api/orders/:id/coc/* + 3 route đọc /api/ledger/coc* (office) = 252; TNV-G3 (ADR-0088 đ2): + POST /api/ledger/receipt-replacements (office) = 253.
  // 2026-10-08 (ADR-0108 đ2): + GET/PUT /api/parties/:id/tai-khoan-nhan-tien (office) = 255.
  // 2026-10-08 (ADR-0108 đ3): + GET /api/orders/:id/qr-thanh-toan (orders) = 256.
  // 2026-10-08 (sổ đại lý đợt 1, module pricing — ADR-0077/0078): + 8 route /api/pricing/* (hoa-hong ×3, thu-tra, cung-ung ×3, nguoi-huong) = 264.
  // 2026-10-08 (sổ đại lý đợt 1, Task 7 — khoá sổ tháng, module billing; ADR-0080 D1): + GET /api/ledger/ky, POST /api/ledger/ky/:period/khoa (office) = HIỆU +2 trên nền 264 (= 266 nếu đứng riêng; điều phối chỉnh số tuyệt đối lúc gộp).
  // 2026-10-08 (sổ đại lý đợt 1, Task 5 — phần thương mại của đơn, module orders; ADR-0077 điều 10–11): + GET /api/orders/:id/thuong-mai (orders), POST /api/orders/:id/thuong-mai/:serviceId (office) = HIỆU +2 (tuyệt đối 268 khi cả Task 3, 5, 7 đã gộp).
  assert.equal(actual.length, 268, "số route thực tế lệch 268 — có route mới chưa vào SNAPSHOT hoặc route bị xoá còn sót trong SNAPSHOT");
  assert.equal(SNAPSHOT.length, 268, "SNAPSHOT phải có đúng 268 dòng (khớp `grep -c 'route(' src/modules/*/index.ts` cộng lại)");
});
