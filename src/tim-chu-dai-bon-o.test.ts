// Bốn ô tìm còn lại cùng lỗi với danh sách đơn (xem src/modules/orders/tim-chu-dai.test.ts): chữ tìm làm mẫu LIKE > 50 byte ⇒ D1 từ chối ⇒ 500.
// Chạy CẢ ứng dụng trên khung thử đã bắt chước giới hạn đó (`kiemMauLike`): hồ sơ, nhật ký, tìm người hưởng (bảng giá), lịch sử trợ lý.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SUP = "77777777-7777-4777-8777-777777777777";
const SALES = "11111111-1111-4111-8111-111111111111";
const CHU_DAI = ["ệ".repeat(17), "x".repeat(60), "1".repeat(60), "%".repeat(60), "Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm"];

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}

for (const [ten, duong, as] of [
  ["hồ sơ (parties)", "/api/parties?q=", SUP],
  ["nhật ký (audit)", "/api/audit?q=", SUP],
  ["tìm người hưởng (pricing)", "/api/pricing/nguoi-huong?q=", SALES],
  ["lịch sử trợ lý (tro-ly)", "/api/tro-ly/lich-su?q=", SUP],
] as const) {
  test(`ô tìm ${ten}: chữ tìm dài (có dấu, số, ký tự thoát) → 200, không 500`, async () => {
    const w = setup();
    for (const q of CHU_DAI) {
      const r = await w.call("GET", duong + encodeURIComponent(q), { as });
      assert.equal(r.status, 200, `q = ${q.slice(0, 12)}… : ${r.text}`);
    }
  });
}

test("hồ sơ: tìm bằng tên dài vẫn thấy hồ sơ có tên đó (tìm theo phần đầu)", async () => {
  const w = setup();
  const ten = "Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm";
  const r0 = await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", displayName: ten, givenName: ten } });
  assert.equal(r0.status, 201, r0.text);
  const r = await w.call("GET", "/api/parties?q=" + encodeURIComponent(ten), { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.parties.some((p: any) => p.displayName === ten));
});
