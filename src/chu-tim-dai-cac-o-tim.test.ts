// CHỮ TÌM DÀI Ở BỐN Ô TÌM CÒN LẠI (thăm dò 2026-10-13, nối tiếp bản sửa danh sách đơn — mẫu: src/modules/orders/tim-chu-dai.test.ts):
// D1 từ chối mẫu LIKE dài hơn 50 BYTE ⇒ route 500 `internal`. Khung thử (tests/audit/harness.mjs, `kiemMauLike`) ném đúng lỗi đó, nên trước khi sửa
// các bài dưới ĐỎ bằng 500. Bốn route: hồ sơ (`/api/parties?q=`, cả mẫu tên lẫn mẫu số điện thoại), nhật ký (`/api/audit?q=`), tìm người hưởng
// (`/api/pricing/nguoi-huong?q=`), lịch sử trợ lý (`/api/tro-ly/lich-su?q=`).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
// Chữ nào cũng phải 200: tiếng Việt nhiều dấu (3 byte/chữ), chữ thường, emoji (4 byte), ký tự đại diện LIKE, dấu thoát. Dài hơn mức trần 100 của route.
const CHU_DAI = ["Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm", "ệ".repeat(100), "x".repeat(100), "😀".repeat(30), "%".repeat(60), "_".repeat(60), "\\".repeat(60)];
const SO_DAI = "0123456789".repeat(10); // toàn chữ số: mẫu số điện thoại `%…%` của hồ sơ

for (const [ten, duong, as] of [
  ["hồ sơ (tên)", (q: string) => `/api/parties?q=${encodeURIComponent(q)}`, ADM],
  ["hồ sơ (số điện thoại: chữ số dài)", (q: string) => `/api/parties?q=${encodeURIComponent(q)}`, ADM],
  ["nhật ký", (q: string) => `/api/audit?q=${encodeURIComponent(q)}`, SUP],
  ["tìm người hưởng", (q: string) => `/api/pricing/nguoi-huong?q=${encodeURIComponent(q)}`, SALES],
  ["lịch sử trợ lý", (q: string) => `/api/tro-ly/lich-su?q=${encodeURIComponent(q)}`, SUP],
] as const) {
  test(`${ten}: chữ tìm dài/lạ → 200, không 500`, async () => {
    const w = setup();
    for (const q of ten.includes("số điện thoại") ? [SO_DAI] : CHU_DAI) {
      const r = await w.call("GET", duong(q), { as });
      assert.equal(r.status, 200, `q = ${q.slice(0, 12)}… : ${r.text}`);
    }
  });
}

test("hồ sơ: tìm ngắn vẫn đúng như cũ (theo tên và theo số điện thoại)", async () => {
  const w = setup();
  const r = await w.call("GET", `/api/parties?q=${encodeURIComponent("Quản trị")}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.parties.some((p: any) => p.displayName === "Quản trị"), "thấy hồ sơ có tên khớp");
  const r2 = await w.call("GET", `/api/parties?q=${encodeURIComponent("Zzz không có")}`, { as: ADM });
  assert.deepEqual(r2.json.parties, []);
});

test("hồ sơ: tên dài hơn giới hạn thì tìm theo PHẦN ĐẦU — vẫn thấy hồ sơ cần tìm (chỉ rộng hơn, không mất)", async () => {
  const w = setup();
  const ten = "Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm"; // 52 byte
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dai', 'PERSON', '${ten}', 1, '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-dai', 'Tâm', '2026-01-01', '2026-01-01')`);
  const r = await w.call("GET", `/api/parties?q=${encodeURIComponent(`${ten} (đại lý)`)}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.parties.some((p: any) => p.displayName === ten), "phải thấy hồ sơ khớp phần đầu");
});
