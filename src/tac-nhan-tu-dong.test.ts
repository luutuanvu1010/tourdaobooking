// ADR-0186 (đóng HC-5.11): ba việc định giờ chạy dưới TÁC NHÂN tự động có định danh riêng, quyền riêng, đi qua cùng cổng `can()`; dòng nhật ký của
// tác nhân mang `audit_log.agent_code`, không bao giờ rỗng người làm. Quản lý bán hàng được «Đồng bộ ngay từ Google Sheet» (lời chủ 8/11).
// Tiêu chí N1, N2, N4, N7 của đặc tả docs/superpowers/specs/2026-11-08-tac-nhan-dong-bo-danh-muc.md. N5 ở src/tra-sau-don-da-xong.test.ts, N6 ở
// src/modules/ve-dien-tu/adr-0156.test.ts. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); Google Sheet là bản giả trong bộ nhớ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as P from "./shared/permissions.ts";
import { maskSource } from "../scripts/source-mask-lib.mjs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../tests/audit/harness.mjs";

// Đọc qua `any`: trước khi có mã của ADR-0186 các tên này chưa tồn tại — bài phải ĐỎ ở từng ca, không chết cả tệp lúc nạp.
const Q = P as any;
const MA = ["DONG_BO_DANH_MUC", "NHAC_HAN_TRA_SAU", "DON_ANH_VE"] as const;
const O_CUA = { DONG_BO_DANH_MUC: ["catalog.sync"], NHAC_HAN_TRA_SAU: ["credit.due.remind"], DON_ANH_VE: ["ve.kho.purge"] } as const;

test("N7: ba tác nhân, mỗi tác nhân đúng một ô; ô có trong bản đồ quyền; không ô ghi tiền, không admin.manage", () => {
  assert.deepEqual(Q.MA_TAC_NHAN, MA);
  assert.deepEqual(Q.QUYEN_TAC_NHAN, O_CUA);
  for (const [ma, ops] of Object.entries(Q.QUYEN_TAC_NHAN as Record<string, string[]>)) {
    for (const op of ops) {
      assert.ok(op in P.MATRIX, `${ma}: ô "${op}" không có trong bản đồ quyền`);
      assert.ok(!(P.O_GHI_TIEN as readonly string[]).includes(op), `${ma}: tác nhân không bao giờ giữ ô ghi tiền (Hiến chương 5.15)`);
      assert.notEqual(op, "admin.manage", `${ma}: tác nhân không giữ admin.manage`);
    }
  }
});

test("N7: can(tác nhân, ô) đúng ở ô của nó, sai ở mọi ô khác; tác nhân không qua cổng router nào", () => {
  for (const ma of MA) {
    const t = Q.tacNhan(ma);
    assert.deepEqual(t.permissions, [], `${ma}: tác nhân không giữ mã quyền nào của người`);
    for (const op of Object.keys(P.MATRIX) as P.OperationCode[]) {
      assert.equal(P.can(t, op, { ownerId: t.id, assigned: true }), (O_CUA[ma] as readonly string[]).includes(op), `${ma} × ${op}`);
    }
    for (const cong of [P.passesAdminGate, P.passesAccountsGate, P.isOffice, P.canAccessOrders]) assert.equal(cong(t), false, `${ma}: cổng ${cong.name}`);
  }
});

test("N7: đối tượng tự dựng mang mã tác nhân lạ không qua can()", () => {
  const gia = { id: "GIA", permissions: [], tacNhan: "GIA" } as unknown as P.PermissionHolder;
  for (const op of ["catalog.sync", "credit.due.remind", "ve.kho.purge", "admin.manage"]) assert.equal(P.can(gia, op as P.OperationCode), false, op);
});

test("ô catalog.sync với người: Quản lý bán hàng, Quản trị, Toàn quyền được; mọi quyền khác không (lời chủ 8/11)", () => {
  const duoc = new Set(["SALES_MANAGER", "ADMIN", "SUPER_ADMIN"]);
  for (const p of P.PERMISSION_CODES) {
    const perms: P.PermissionCode[] = p === "SALES_MANAGER" ? ["SALES", "SALES_MANAGER"] : [p]; // ADR-0169: Quản lý bán hàng luôn đi kèm Bán hàng
    assert.equal(P.can({ id: "u", permissions: perms }, "catalog.sync" as P.OperationCode), duoc.has(p), p);
  }
});

// ---- Hàng rào chỗ dùng: chỉ ba việc định giờ (và đồng bộ lần đầu) dựng tác nhân ----------------------------------------------------------------------
const SRC = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(SRC, "..");
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const CHO_DUNG_TAC_NHAN = ["src/modules/billing/tra-sau-nhac.ts", "src/modules/catalog/index.ts", "src/modules/ve-dien-tu/index.ts", "src/shared/permissions.ts"];

test("N7: chỉ ba việc định giờ dựng tác nhân — không route, không trang giao diện nào dựng được", () => {
  const co = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]
    .filter((f) => /\btacNhan\s*\(/.test(maskSource(readFileSync(f, "utf8"), { strings: true, comments: true })))
    .map((f) => relative(ROOT, f).split("\\").join("/"))
    .sort();
  assert.deepEqual(co, CHO_DUNG_TAC_NHAN);
});

// ---- Chạy thật trên khung thử ---------------------------------------------------------------------------------------------------------------------------
const SHEET = "1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s"; // dạng id hợp lệ; không gọi mạng — fetch bị thay bằng Sheet giả
const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
const csv = (giaNguoiLon: number) => [HEADER, `TD101,Tour 3 đảo,k,d,perPax,${giaNguoiLon},595000,,850000,,0,,`, "TD208,Vé Vinwonders,k,d,perPax,1190000,855000,,1000000,,0,,"].join("\n");

async function voiSheetGia<T>(noiDung: string, viec: () => Promise<T>): Promise<T> {
  const goc = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL) => {
    assert.match(String(url), /^https:\/\/docs\.google\.com\/spreadsheets\/d\//, "chỉ được gọi Google Sheet");
    return new Response(noiDung, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
  }) as typeof fetch;
  try {
    return await viec();
  } finally {
    globalThis.fetch = goc;
  }
}

/** Gọi đúng `scheduled` của Worker (cả ba việc định giờ) và chờ mọi việc đã gửi vào `waitUntil`. */
async function chayDinhGio(env: unknown): Promise<void> {
  const cho: Promise<unknown>[] = [];
  await app.default.scheduled({ cron: "*/15 * * * *", scheduledTime: Date.now() }, env, { waitUntil: (p: Promise<unknown>) => void cho.push(p), passThroughOnException() {} });
  await Promise.all(cho);
}

const dongDongBo = (w: any): Record<string, unknown>[] => w.q("SELECT * FROM audit_log WHERE action = 'catalog_synced' ORDER BY rowid");

test("N1: Cron 15 phút đồng bộ danh mục dưới tác nhân DONG_BO_DANH_MUC — nhật ký không rỗng người làm", async () => {
  const w = world();
  await voiSheetGia(csv(850000), () => chayDinhGio({ ...w.env, SERVICES_SHEET_ID: SHEET }));
  assert.deepEqual(w.q("SELECT code FROM catalog_item ORDER BY code").map((r: { code: string }) => r.code), ["TD101", "TD208"], "đồng bộ vẫn chạy như cũ");
  const nk = dongDongBo(w);
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.agent_code, "DONG_BO_DANH_MUC", "dòng nhật ký mang mã tác nhân");
  assert.equal(nk[0]!.staff_id, null, "không mang mã người nào");
});

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "22222222-2222-4222-8222-222222222222";
const SM = "33333333-3333-4333-8333-333333333333";
const ADM = "44444444-4444-4444-8444-444444444444";
const SUP = "55555555-5555-4555-8555-555555555555";

test("N2: đồng bộ lần đầu do một người mở trang lập đơn — nhật ký mang tác nhân, không mang mã người đọc", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000101", name: "Bán Hàng", perms: ["SALES"] });
  w.env.SERVICES_SHEET_ID = SHEET;
  // Khung thử dựng sẵn dấu «đã đồng bộ» để bài khác không gọi Sheet; ca này cần đúng trạng thái «chưa từng đồng bộ».
  w.sqlite.exec("UPDATE catalog_sync SET last_attempt_at = NULL, last_success_at = NULL WHERE id = 'default'");
  const r = await voiSheetGia(csv(850000), () => w.call("GET", "/api/catalog/for-order", { as: SALES }));
  assert.equal(r.status, 200, r.text);
  const nk = dongDongBo(w);
  assert.equal(nk.length, 1, "lần đọc đầu tự đồng bộ");
  assert.equal(nk[0]!.agent_code, "DONG_BO_DANH_MUC");
  assert.equal(nk[0]!.staff_id, null, "không dùng mã người đọc cho việc ghi do máy làm");
});

test("N4: «Đồng bộ ngay» — Quản lý bán hàng, Quản trị, Toàn quyền làm được, nhật ký mang mã người; Bán hàng thường, Kế toán 403 và không ghi gì", async () => {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000101", ["SALES"]], [KT, "0900000102", ["ACCOUNTING"]], [SM, "0900000103", ["SALES", "SALES_MANAGER"]], [ADM, "0900000104", ["ADMIN"]], [SUP, "0900000105", ["SUPER_ADMIN"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-3)}`, perms });
  }
  w.env.SERVICES_SHEET_ID = SHEET;
  const trangThaiTruoc = w.q("SELECT * FROM catalog_sync WHERE id = 'default'");
  for (const as of [SALES, KT]) {
    const r = await voiSheetGia(csv(850000), () => w.call("POST", "/api/catalog/sync", { as, body: {} }));
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM catalog_item")[0].n, 0, "bị từ chối thì không ghi danh mục");
  assert.deepEqual(w.q("SELECT * FROM catalog_sync WHERE id = 'default'"), trangThaiTruoc, "bị từ chối thì không ghi cả trạng thái đồng bộ");
  assert.equal(dongDongBo(w).length, 0);

  for (const [as, gia] of [[SM, 850000], [ADM, 860000], [SUP, 870000]] as [string, number][]) {
    const r = await voiSheetGia(csv(gia), () => w.call("POST", "/api/catalog/sync", { as, body: {} }));
    assert.equal(r.status, 200, `${as}: ${r.text}`);
  }
  const nk = dongDongBo(w);
  assert.deepEqual(nk.map((d) => d.staff_id), [SM, ADM, SUP], "mỗi lần bấm một dòng, mang mã người bấm");
  assert.deepEqual(nk.map((d) => d.agent_code ?? null), [null, null, null], "lệnh của người không mang mã tác nhân");
});

// ---- Cổng nằm trong CHÍNH hàm lệnh (ADR-0186 Đ3), không chỉ ở route: gọi thẳng hàm bằng bên không giữ ô ⇒ từ chối trước khi đọc Sheet hay ghi ----------
// N3: bên không giữ ô — người thường, hoặc tác nhân của việc KHÁC (y như một tác nhân bị bỏ ô của mình) — không ghi gì vào dữ liệu nghiệp vụ, không ném ra.
const KHONG_GIU_DONG_BO: [string, unknown][] = [["Bán hàng", { id: SALES, permissions: ["SALES"] }], ["tác nhân nhắc hạn", Q.tacNhan("NHAC_HAN_TRA_SAU")], ["tác nhân dọn ảnh", Q.tacNhan("DON_ANH_VE")]];

test("N3, N7: hàm lệnh đồng bộ tự hỏi cổng — gọi thẳng bằng bên không giữ catalog.sync ⇒ từ chối, không gọi Sheet, không ghi danh mục; lý do vào trạng thái đồng bộ", async () => {
  for (const [ten, ben] of KHONG_GIU_DONG_BO) {
    const w = world();
    w.env.SERVICES_SHEET_ID = SHEET;
    let goiSheet = 0;
    const goc = globalThis.fetch;
    globalThis.fetch = (async () => {
      goiSheet++;
      return new Response(csv(850000), { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } });
    }) as typeof fetch;
    let kq: { ok: boolean; code?: string };
    try {
      kq = await app.syncCatalog(w.env, ben); // không ném ra
    } finally {
      globalThis.fetch = goc;
    }
    assert.deepEqual([kq.ok, kq.code], [false, "forbidden"], ten);
    assert.equal(goiSheet, 0, `${ten}: bị từ chối thì không gọi Google Sheet`);
    assert.equal(w.q("SELECT count(*) AS n FROM catalog_item")[0].n, 0, `${ten}: không ghi danh mục`);
    assert.equal(dongDongBo(w).length, 0, `${ten}: không ghi nhật ký đồng bộ`);
    assert.equal(w.q("SELECT last_error_code FROM catalog_sync WHERE id = 'default'")[0].last_error_code, "forbidden", `${ten}: ADR-0186 Đ6 — bị từ chối thì ghi vào trạng thái đồng bộ`);
  }
});

test("N3, N7: hàm nhắc hạn trả sau tự hỏi cổng — bên không giữ credit.due.remind ⇒ từ chối trước khi chạm cơ sở dữ liệu", async () => {
  const chamCsdl = () => {
    throw new Error("chạm cơ sở dữ liệu trước cổng quyền");
  };
  const dbCanh = { prepare: chamCsdl, batch: chamCsdl, exec: chamCsdl };
  for (const ben of [{ id: KT, permissions: ["ACCOUNTING"] }, Q.tacNhan("DONG_BO_DANH_MUC"), Q.tacNhan("DON_ANH_VE")]) {
    await assert.rejects(app.nhacHanTraSau(dbCanh, ben, new Date().toISOString()), (e: Error) => e.name === "TuChoiQuyen", JSON.stringify(ben));
  }
});

test("ADR-0186 Đ4: câu ghi nhật ký từ chối mã tác nhân lạ và dòng có cả người lẫn tác nhân", () => {
  const w = world();
  const at = new Date().toISOString();
  assert.throws(() => app.auditStatement(w.env.DB, { agentCode: "GIA", action: "catalog_synced", at, targetType: "catalog" }), /Mã tác nhân nhật ký không hợp lệ/);
  assert.throws(() => app.auditStatement(w.env.DB, { staffId: SALES, agentCode: "DONG_BO_DANH_MUC", action: "catalog_synced", at, targetType: "catalog" }), /chỉ có một người làm/);
  assert.doesNotThrow(() => app.auditStatement(w.env.DB, { agentCode: "DONG_BO_DANH_MUC", action: "catalog_synced", at, targetType: "catalog" }));
});
