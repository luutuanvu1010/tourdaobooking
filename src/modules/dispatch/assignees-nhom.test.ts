// Nhãn nhóm `roleLabel` của `GET /api/dispatch/assignees` (Task 1.8 phần b ADR-0030 — bảng chọn người phụ trách trong form lập đơn gom người theo nhóm
// "Hướng dẫn viên" / "Bán hàng" / "Quản trị" như bản thiết kế). Hành vi API thật trên SQLite thật qua khung tests/audit/harness.mjs (cùng khuôn
// nhan-don.test.ts). Luật nhãn thuần + thứ tự ưu tiên: src/shared/assignee-pick.test.ts; tệp này kiểm ĐÚNG route gắn nhãn đó cho từng người, và việc
// thêm nhãn KHÔNG đổi ai có mặt trong danh sách (vẫn chỉ `checkAssignee`).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const GHEP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // SALES + FIELD (tài khoản ghép, không lai Đối tác)
const LAI = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // FIELD + PARTNER (tài khoản lai — không đủ điều kiện, S20-5)
const SA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // SALES + ADMIN

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: GHEP, phone: "0900000010", name: "Ghép Đôi", perms: ["SALES", "FIELD"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Lai Đôi", perms: ["FIELD", "PARTNER"] });
  seedStaff(w.sqlite, { id: SA, phone: "0900000012", name: "Bán Quản", perms: ["SALES", "ADMIN"] });
  return w;
}

test("assignees: mỗi người có roleLabel — chỉ FIELD “Hướng dẫn viên”, chỉ SALES “Bán hàng”, ADMIN / SUPER_ADMIN “Quản trị”; ghép SALES+FIELD → “Hướng dẫn viên”, SALES+ADMIN → “Quản trị” (ưu tiên Hướng dẫn viên > Quản trị > Bán hàng)", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/dispatch/assignees", { as: SALES });
  assert.equal(r.status, 200, r.text);
  const byId = new Map(r.json.assignees.map((a: any) => [a.staffId, a]));
  const label = (id: string) => (byId.get(id) as any)?.roleLabel;
  assert.equal(label(FIELD), "Hướng dẫn viên");
  assert.equal(label(SALES), "Bán hàng");
  assert.equal(label(ADM), "Quản trị");
  assert.equal(label(SUP), "Quản trị");
  assert.equal(label(GHEP), "Hướng dẫn viên", "tài khoản ghép SALES+FIELD nằm ở nhóm Hướng dẫn viên");
  assert.equal(label(SA), "Quản trị", "tài khoản ghép SALES+ADMIN nằm ở nhóm Quản trị");
});

test("assignees: thêm nhãn KHÔNG đổi ai có mặt — vẫn đúng tập checkAssignee nhận (không kế toán, Đối tác, Thực tập, tài khoản lai); mỗi phần tử đúng bốn khoá, không SĐT", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/dispatch/assignees", { as: ADM });
  assert.equal(r.status, 200, r.text);
  const ids = r.json.assignees.map((a: any) => a.staffId).sort();
  assert.deepEqual(ids, [SALES, ADM, FIELD, SUP, GHEP, SA].sort());
  for (const a of r.json.assignees) assert.deepEqual(Object.keys(a).sort(), ["name", "partyId", "roleLabel", "staffId"], JSON.stringify(a));
  assert.doesNotMatch(r.text, /(?<![0-9a-f-])09\d{8}(?!\d)/, "không lộ SĐT");
  for (const id of [ACC, PARTNER, INTERN, LAI]) assert.ok(!ids.includes(id), id);
});
