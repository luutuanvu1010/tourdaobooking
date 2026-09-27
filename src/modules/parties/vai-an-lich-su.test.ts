// ADR-0044 (chủ chọn 28/9 "Ẩn vai đã kết thúc của bạn"): hồ sơ gắn tài khoản Toàn quyền (vai ẩn) — người xem không giữ Toàn quyền chỉ thấy
// vai ĐANG MỞ ở GET /api/parties/:id (không thấy "Giám đốc (đã kết thúc)" cạnh "IT"); Toàn quyền thấy đủ lịch sử; hồ sơ người khác không đổi.
// Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["ADMIN", "SUPER_ADMIN"] });
  const role = (id: string, party: string, code: string, from: string, to: string | null) =>
    w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at)
      VALUES ('${id}', '${party}', '${code}', '${from}', ${to ? `'${to}'` : "NULL"}, '${NOW}', '${NOW}')`);
  role("r-sup-dir", `pty-${SUP}`, "DIRECTOR", "2026-01-01", "2026-09-01");
  role("r-sup-it", `pty-${SUP}`, "IT", "2026-09-02", null);
  role("r-sup-future", `pty-${SUP}`, "OPERATIONS_MANAGER", "2099-01-01", null); // chưa hiệu lực — không phải vai đang mở
  role("r-adm-op-old", `pty-${ADM}`, "SALES_STAFF", "2026-01-01", "2026-09-01");
  role("r-adm-op", `pty-${ADM}`, "OPERATIONS_MANAGER", "2026-09-02", null);
  return w;
}
const codes = (r: any): string[] => r.json.party.roles.map((x: any) => x.roleTypeCode).sort();

test("ADR-0044: người không giữ Toàn quyền xem hồ sơ Toàn quyền → chỉ vai đang mở (IT), không thấy Giám đốc đã kết thúc", async () => {
  const w = setup();
  for (const who of [SALES, ADM]) {
    const r = await w.call("GET", `/api/parties/pty-${SUP}`, { as: who });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(codes(r), ["IT"]);
    assert.ok(!r.text.includes("DIRECTOR"));
  }
});

test("ADR-0044: Toàn quyền xem hồ sơ của mình → đủ lịch sử; hồ sơ người khác vẫn hiện lịch sử như cũ với mọi người", async () => {
  const w = setup();
  assert.deepEqual(codes(await w.call("GET", `/api/parties/pty-${SUP}`, { as: SUP })), ["DIRECTOR", "IT", "OPERATIONS_MANAGER"]);
  assert.deepEqual(codes(await w.call("GET", `/api/parties/pty-${ADM}`, { as: SALES })), ["OPERATIONS_MANAGER", "SALES_STAFF"]);
});
