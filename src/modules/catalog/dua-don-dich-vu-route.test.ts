// ADR-0149 Đ1 (kế hoạch docs/superpowers/plans/2026-10-29-adr-0149-dua-don-theo-dich-vu-ke-hoach.md Task 3): ô «Được đón không» của từng dịch vụ —
// `PUT /api/catalog/:code/transfer-rule`, DTO quản trị `transferRule`, DTO form `transferEnabled`, và hệ quả ở đơn hàng (cổng `orders` đọc view, không sửa).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) — cùng khuôn với dua-don-nhom-route.test.ts / orders/dua-don-nhom-tat.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const AT = "2026-09-01T00:00:00.000Z";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  // ZA1, ZB2 cùng nhóm Hòn Tằm (HTA, gieo ở 0055); ZC3 Chưa phân loại.
  for (const [c, ten] of [["ZA1", "Tour đảo"], ["ZB2", "Vé cáp treo"], ["ZC3", "Lặn biển"]]) {
    w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('${c}', '${ten}', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')`);
  }
  let n = 0;
  for (const c of ["ZA1", "ZB2"]) w.sqlite.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HTA', 1, ?, ?, ?)").run(`g-${++n}`, c, AT, AT, AT);
  return w;
}
const datQuyTac = (w: any, code: string, transferRule: unknown, expectedTransferRule: unknown, as = ADM) =>
  w.call("PUT", `/api/catalog/${code}/transfer-rule`, { as, body: { transferRule, expectedTransferRule } });
const nhatKy = (w: any) => w.q("SELECT target_id, detail FROM audit_log WHERE action = 'catalog_service_transfer_set' ORDER BY rowid").map((r: any) => ({ ...r }));
const dongMo = (w: any, code: string) => w.q("SELECT mode FROM ctl_service_transfer_rule WHERE service_code = ? AND valid_to_at IS NULL", code).map((r: any) => r.mode as string);
const choForm = async (w: any): Promise<Record<string, boolean>> =>
  Object.fromEntries((await w.call("GET", "/api/catalog/for-order", { as: SALES })).json.items.map((i: any) => [i.code, i.transferEnabled]));

test("PUT transfer-rule: Theo nhóm → Không đón → Luôn đón → Theo nhóm; mỗi lần đổi một dòng nhật ký «cũ → mới» gắn mã dịch vụ; trả dịch vụ kèm `transferRule`", async () => {
  const w = setup();
  const a = await datQuyTac(w, "ZA1", "NEVER", "GROUP");
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.item.transferRule, "NEVER");
  assert.deepEqual(dongMo(w, "ZA1"), ["NEVER"]);
  const b = await datQuyTac(w, "ZA1", "ALWAYS", "NEVER", SUP);
  assert.equal(b.status, 200, b.text);
  assert.deepEqual(dongMo(w, "ZA1"), ["ALWAYS"]);
  const c = await datQuyTac(w, "ZA1", "GROUP", "ALWAYS");
  assert.equal(c.status, 200, c.text);
  assert.equal(c.json.item.transferRule, "GROUP");
  assert.deepEqual(dongMo(w, "ZA1"), [], "«Theo nhóm» = không còn dòng mở");
  assert.equal(w.q("SELECT COUNT(*) AS n FROM ctl_service_transfer_rule WHERE service_code = 'ZA1'")[0].n, 2, "lịch sử giữ đủ, không xoá");
  assert.deepEqual(nhatKy(w), [
    { target_id: "ZA1", detail: "Theo nhóm → Không đón" },
    { target_id: "ZA1", detail: "Không đón → Luôn đón" },
    { target_id: "ZA1", detail: "Luôn đón → Theo nhóm" },
  ]);
  const admin = await w.call("GET", "/api/catalog/admin", { as: ADM });
  assert.equal(admin.status, 200, admin.text);
  assert.deepEqual(Object.fromEntries(admin.json.items.map((i: any) => [i.code, i.transferRule])), { ZA1: "GROUP", ZB2: "GROUP", ZC3: "GROUP" });
});

test("PUT transfer-rule: giá trị lạ / thiếu lựa chọn đang có → 400; lựa chọn đang có lệch → 409 stale, không ghi; trùng giá trị → 200 không ghi, không nhật ký; mã không có → 404", async () => {
  const w = setup();
  for (const sai of ["BOTH", "", null, 1, true, "group"]) {
    const r = await datQuyTac(w, "ZA1", sai, "GROUP");
    assert.equal(r.status, 400, `${JSON.stringify(sai)}: ${r.text}`);
  }
  const thieu = await w.call("PUT", "/api/catalog/ZA1/transfer-rule", { as: ADM, body: { transferRule: "NEVER" } });
  assert.equal(thieu.status, 400, thieu.text);
  const lech = await datQuyTac(w, "ZA1", "ALWAYS", "NEVER");
  assert.equal(lech.status, 409, lech.text);
  assert.equal(lech.json.error.code, "stale");
  assert.deepEqual(dongMo(w, "ZA1"), []);
  const trung = await datQuyTac(w, "ZA1", "GROUP", "GROUP");
  assert.equal(trung.status, 200, trung.text);
  assert.equal(trung.json.item.transferRule, "GROUP");
  assert.deepEqual(nhatKy(w), [], "không đổi gì → không nhật ký");
  const khong = await datQuyTac(w, "KHONGCO", "NEVER", "GROUP");
  assert.equal(khong.status, 404, khong.text);
});

test("PUT transfer-rule (tiêu chí 6): Bán hàng, Kế toán, Hướng dẫn viên, Đối tác, Thực tập → 403, không ghi, không nhật ký; Quản trị và Toàn quyền → 200", async () => {
  const w = setup();
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN]) {
    const r = await datQuyTac(w, "ZA1", "NEVER", "GROUP", as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.deepEqual(dongMo(w, "ZA1"), []);
  assert.deepEqual(nhatKy(w), []);
  assert.equal((await datQuyTac(w, "ZA1", "NEVER", "GROUP", ADM)).status, 200);
  assert.equal((await datQuyTac(w, "ZA1", "GROUP", "NEVER", SUP)).status, 200);
});

test("GET for-order: `transferEnabled` theo ô riêng — nhóm bật + Không đón → false (dịch vụ khác cùng nhóm vẫn true); nhóm tắt + Luôn đón → true; Chưa phân loại + Không đón → false", async () => {
  const w = setup();
  assert.deepEqual(await choForm(w), { ZA1: true, ZB2: true, ZC3: true });
  await datQuyTac(w, "ZA1", "NEVER", "GROUP");
  await datQuyTac(w, "ZC3", "NEVER", "GROUP");
  assert.deepEqual(await choForm(w), { ZA1: false, ZB2: true, ZC3: false });
  w.sqlite.exec("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = 'HTA'");
  await datQuyTac(w, "ZB2", "ALWAYS", "GROUP");
  assert.deepEqual(await choForm(w), { ZA1: false, ZB2: true, ZC3: false });
});

// ---- Hệ quả ở đơn hàng (tiêu chí 1–3) ---------------------------------------------------------------------------------------------------------
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" };
const svc = (code: string, legs: unknown[] = [OUT]) => ({ kind: "catalog", catalogCode: code, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D, legs });
const lapDon = (w: any, services: unknown[]) => w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services } });
const xacNhan = (w: any, id: string) => {
  w.sqlite.prepare("UPDATE order_service SET pickup_choice = CASE WHEN EXISTS (SELECT 1 FROM ord_transfer_leg l WHERE l.order_service_id = order_service.id AND l.closed_at IS NULL) THEN 'DON' ELSE 'KHONG_DON' END WHERE order_id = ?").run(id);
  return w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
};

test("tiêu chí 1: nhóm BẬT + dịch vụ «Không đón» → lập đơn có chặng 409 transfer_disabled, câu nói ô của DỊCH VỤ (không nói nhóm tắt); dịch vụ khác cùng nhóm lập được", async () => {
  const w = setup();
  await datQuyTac(w, "ZA1", "NEVER", "GROUP");
  const r = await lapDon(w, [svc("ZA1")]);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "transfer_disabled");
  assert.match(r.json.error.message, /“Tour đảo”/);
  assert.match(r.json.error.message, /«Không đón»/);
  assert.doesNotMatch(r.json.error.message, /Nhóm dịch vụ đã tắt/, "nhóm Hòn Tằm đang BẬT — câu không được đổ lỗi cho nhóm");
  assert.equal(w.q("SELECT COUNT(*) AS c FROM orders")[0].c, 0);
  const khac = await lapDon(w, [svc("ZB2")]);
  assert.equal(khac.status, 201, khac.text);
  const khongChang = await lapDon(w, [svc("ZA1", [])]);
  assert.equal(khongChang.status, 201, khongChang.text);
});

test("tiêu chí 1 (câu ghép): một đơn vừa có dịch vụ «Không đón» vừa có dịch vụ ở nhóm tắt → một câu nêu đủ hai lý do; chỉ do nhóm thì câu GIỮ NGUYÊN như ADR-0118", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = 'HTA'");
  await datQuyTac(w, "ZC3", "NEVER", "GROUP");
  const r = await lapDon(w, [svc("ZB2"), svc("ZC3")]);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /^Nhóm dịch vụ đã tắt đưa đón nên không ghi được lượt đưa đón cho: “Vé cáp treo” \(nhóm “Hòn Tằm”\)\./);
  assert.match(r.json.error.message, /“Lặn biển”/);
  assert.match(r.json.error.message, /«Không đón»/);
  const chiNhom = await lapDon(w, [svc("ZB2")]);
  assert.equal(chiNhom.json.error.message, "Nhóm dịch vụ đã tắt đưa đón nên không ghi được lượt đưa đón cho: “Vé cáp treo” (nhóm “Hòn Tằm”). Bỏ lượt đưa đón của dịch vụ đó khỏi đơn rồi lưu lại.");
});

test("tiêu chí 2–3: nhóm TẮT + dịch vụ «Luôn đón» → lập đơn có chặng 201 và xác nhận 200; về «Theo nhóm» → lại bị từ chối như nhóm", async () => {
  const w = setup();
  w.sqlite.exec("UPDATE ctl_group SET transfer_enabled = 0 WHERE code = 'HTA'");
  assert.equal((await lapDon(w, [svc("ZA1")])).status, 409);
  await datQuyTac(w, "ZA1", "ALWAYS", "GROUP");
  const r = await lapDon(w, [svc("ZA1")]);
  assert.equal(r.status, 201, r.text);
  const xn = await xacNhan(w, r.json.order.id);
  assert.equal(xn.status, 200, xn.text);
  await datQuyTac(w, "ZA1", "GROUP", "ALWAYS");
  const lai = await lapDon(w, [svc("ZA1")]);
  assert.equal(lai.status, 409, lai.text);
  assert.match(lai.json.error.message, /^Nhóm dịch vụ đã tắt/);
});

test("tiêu chí 5: đồng bộ Sheet không ghi bảng quy tắc — không câu SQL nào của đồng bộ (repository.ts, service.ts, sheet.ts) nhắc `ctl_service_transfer_rule`; chỉ nhom-repo.ts nhắc", () => {
  const goc = new URL("./", import.meta.url);
  for (const f of ["repository.ts", "service.ts", "sheet.ts", "rules.ts"]) {
    assert.doesNotMatch(readFileSync(new URL(f, goc), "utf8"), /ctl_service_transfer_rule/, f);
  }
  assert.match(readFileSync(new URL("nhom-repo.ts", goc), "utf8"), /ctl_service_transfer_rule/);
});
