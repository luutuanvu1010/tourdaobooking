// Nội dung màn bảo trì (bản mẫu 2c của chủ dự án 13/11/2026; ADR-0202; migration 0162) — kiểm MỨC ROUTE trên cả ứng dụng, SQLite thật (khung tests/audit/harness.mjs):
// chỉ Toàn quyền sửa; máy chủ kiểm đầu vào (đường dẫn javascript: bị chặn); lưu không bật/tắt; 503 + câu báo + config + /me dùng nội dung đã lưu; nhật ký chỉ tên ô.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { MAINTENANCE_CONTENT_DEFAULT as ND } from "../../shared/maintenance.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const MOI = { ...ND, tieuDe: "Nâng cấp bảng giá", sdt: "0905 123 456", zalo: "https://zalo.me/0905123456", hienWeb: false };
const MOI_LUU = { ...MOI, sdt: "0905123456" };
const ENDS = () => new Date(Date.now() + 2 * 24 * 3600_000).toISOString();

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const daLuu = (w: any) => w.q("SELECT content_json FROM mnt_setting WHERE id = 'default'")[0].content_json;

test("chưa lưu: GET /api/maintenance và thân 503 mang nội dung mặc định; câu báo dùng SĐT mặc định", async () => {
  const w = setup();
  const g = await w.call("GET", "/api/maintenance", { as: SUP });
  assert.deepEqual(g.json.content, ND);
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${ENDS()}' WHERE id = 'default'`);
  const r = await w.call("GET", "/api/auth/me", { as: SALES });
  assert.equal(r.status, 503, r.text);
  assert.deepEqual(r.json.error.content, ND);
  assert.ok(r.json.error.message.endsWith(`(${ND.sdt}).`), r.json.error.message);
});

test("PUT /api/maintenance/content: Bán hàng, Quản trị → 403 không ghi; Toàn quyền → 200, không đổi bật/tắt", async () => {
  const w = setup();
  for (const who of [SALES, ADM]) assert.equal((await w.call("PUT", "/api/maintenance/content", { as: who, body: MOI })).status, 403, who);
  assert.equal(daLuu(w), null);
  const r = await w.call("PUT", "/api/maintenance/content", { as: SUP, body: MOI });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { on: false, endsAt: null, canToggle: true, content: MOI_LUU });
  assert.deepEqual(JSON.parse(daLuu(w)), MOI_LUU);
  assert.equal(w.q("SELECT enabled FROM mnt_setting")[0].enabled, 0, "lưu nội dung không bật bảo trì");
});

test("PUT /api/maintenance/content: đầu vào sai → 400 tiếng Việt, không ghi (kể cả đường dẫn javascript:)", async () => {
  const w = setup();
  for (const body of [{ ...MOI, zalo: "javascript:alert(1)" }, { ...MOI, website: "javascript:alert(1)" }, { ...MOI, sdt: "123" }, { ...MOI, loiNhan: "" }, null]) {
    const r = await w.call("PUT", "/api/maintenance/content", { as: SUP, body });
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal(daLuu(w), null);
});

test("đã lưu + đang bật: người bị chặn nhận đúng nội dung; câu báo, config công khai, /me của Toàn quyền dùng SĐT đã lưu", async () => {
  const w = setup();
  assert.equal((await w.call("PUT", "/api/maintenance/content", { as: SUP, body: MOI })).status, 200);
  assert.equal((await w.call("PUT", "/api/maintenance", { as: SUP, body: { on: true, endsAt: ENDS() } })).status, 200);
  const r = await w.call("GET", "/api/orders", { as: SALES });
  assert.equal(r.status, 503);
  assert.deepEqual(r.json.error.content, MOI_LUU);
  assert.ok(r.json.error.message.endsWith("(0905123456)."), r.json.error.message);
  const cfg = await w.call("GET", "/api/auth/config");
  assert.deepEqual(cfg.json.maintenance.content, MOI_LUU);
  const me = await w.call("GET", "/api/auth/me", { as: SUP });
  assert.deepEqual(me.json.maintenance.content, MOI_LUU);
  assert.equal((await w.call("PUT", "/api/maintenance", { as: SUP, body: { on: false } })).status, 200);
  assert.equal((await w.call("GET", "/api/auth/config")).json.maintenance.content, undefined, "tắt thì không gửi nội dung");
});

test("nội dung sửa tay sai trong CSDL (đường dẫn lạ) → máy chủ dùng mặc định, không chở đường dẫn ra ngoài", async () => {
  const w = setup();
  w.sqlite.exec(`UPDATE mnt_setting SET enabled = 1, ends_at = '${ENDS()}', content_json = '${JSON.stringify({ ...MOI_LUU, zalo: "javascript:alert(1)" })}' WHERE id = 'default'`);
  const r = await w.call("GET", "/api/auth/me", { as: SALES });
  assert.deepEqual(r.json.error.content, ND);
});

test("nhật ký: một dòng maintenance_changed liệt kê TÊN ô đã đổi, không chép giá trị (SĐT)", async () => {
  const w = setup();
  assert.equal((await w.call("PUT", "/api/maintenance/content", { as: SUP, body: MOI })).status, 200);
  const rows = w.q("SELECT detail, staff_id FROM audit_log WHERE action = 'maintenance_changed'");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].detail, "Sửa nội dung màn bảo trì: tiêu đề, số điện thoại hỗ trợ, liên kết Zalo, hiện thẻ website");
  assert.equal(rows[0].staff_id, SUP);
  assert.doesNotMatch(rows[0].detail, /\d{9,}/);
});

test("cấu hình công khai luôn mang SĐT hỗ trợ đã lưu (dòng «Hỗ trợ kỹ thuật» ở trang đăng nhập), kể cả khi bảo trì đang TẮT; chưa lưu → mặc định", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/auth/config")).json.supportPhone, ND.sdt);
  assert.equal((await w.call("PUT", "/api/maintenance/content", { as: SUP, body: MOI })).status, 200);
  const cfg = await w.call("GET", "/api/auth/config");
  assert.equal(cfg.json.maintenance.on, false);
  assert.equal(cfg.json.supportPhone, "0905123456");
});
