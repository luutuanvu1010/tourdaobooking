// ADR-0090 đ3 + đ4 bổ sung (chủ đồng ý 2026-10-02, câu (f)): ngưng một tài khoản có quyền tiền (Kế toán) → tin vào "Của tôi" của Toàn quyền, vì việc ngưng làm
// đứt người duyệt tiền. Nguồn = view v_aud_account_event (migration 0075, chỉ khoá). Chạy CẢ ứng dụng trên SQLite thật (khung thử tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const QT = "0c000000-0000-4000-8000-000000000001"; // Quản trị
const KT = "0c000000-0000-4000-8000-000000000002"; // Kế toán
const BH = "0c000000-0000-4000-8000-000000000003"; // Bán hàng
const TQ = "0c000000-0000-4000-8000-000000000004"; // Toàn quyền
const TQ2 = "0c000000-0000-4000-8000-000000000005"; // Toàn quyền thứ hai
const NS = "0c000000-0000-4000-8000-000000000006"; // Nhân sự

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: QT, phone: "0902000001", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: "0902000002", name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: BH, phone: "0902000003", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: TQ, phone: "0902000004", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: TQ2, phone: "0902000005", name: "Toàn Quyền Hai", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: NS, phone: "0902000006", name: "Nhân Sự", perms: ["HR"] });
  return w;
}
type Tin = { loai: string; cau: string; lienKet: string | null; cuaToi: boolean };
const cuaToi = async (w: ReturnType<typeof world>, as: string): Promise<Tin[]> => {
  const r = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return r.json.tin as Tin[];
};
const tinTk = (ds: Tin[]) => ds.filter((t) => t.loai === "tai_khoan");

test("v_aud_account_event: đúng 5 cột khoá, không detail; chỉ dòng staff_suspended", async () => {
  const w = setup();
  const cot = w.q("SELECT name FROM pragma_table_info('v_aud_account_event')").map((x: any) => x.name);
  assert.deepEqual(cot, ["id", "account_id", "staff_id", "action", "created_at"]);
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: QT, body: { fullName: "Kế Toán Đổi" } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: QT, body: { active: false } })).status, 200);
  assert.deepEqual(w.q("SELECT account_id, staff_id, action FROM v_aud_account_event").map((x: any) => ({ ...x })), [{ account_id: KT, staff_id: QT, action: "staff_suspended" }]);
});

test("ADR-0090 đ3: Quản trị ngưng tài khoản Kế toán → MỌI Toàn quyền có tin ở 'Của tôi' (có tên người làm + tài khoản, liên kết /staff); Quản trị, Kế toán, Bán hàng không", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: QT, body: { active: false } })).status, 200);
  for (const tq of [TQ, TQ2]) {
    const ds = tinTk(await cuaToi(w, tq));
    assert.equal(ds.length, 1, `Toàn quyền ${tq}: ${JSON.stringify(ds)}`);
    assert.equal(ds[0]!.cau, "Quản Trị vừa ngưng tài khoản giữ tiền Kế Toán");
    assert.equal(ds[0]!.lienKet, "/staff");
    assert.equal(ds[0]!.cuaToi, true);
  }
  for (const khac of [QT, BH, NS]) assert.deepEqual(tinTk(await cuaToi(w, khac)), [], khac);
  // Tóm tắt (số đỏ) của Toàn quyền tính cả tin này.
  const tt = await w.call("GET", "/api/thong-bao/tom-tat", { as: TQ });
  assert.equal(tt.status, 200, tt.text);
  assert.ok(tt.json.soChuaDoc >= 1, JSON.stringify(tt.json));
});

test("ADR-0090 đ3: Nhân sự ngưng Kế toán cũng có tin (đứt người duyệt tiền); ngưng Bán hàng → không tin; Toàn quyền tự ngưng → chỉ Toàn quyền KHÁC nhận", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", `/api/staff/${BH}`, { as: QT, body: { active: false } })).status, 200);
  assert.deepEqual(tinTk(await cuaToi(w, TQ)), [], "ngưng tài khoản không giữ tiền: không tin");
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: NS, body: { active: false } })).status, 200);
  assert.equal(tinTk(await cuaToi(w, TQ)).length, 1, "Nhân sự ngưng Kế toán");
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: TQ, body: { active: true } })).status, 200);
  assert.equal((await w.call("PATCH", `/api/staff/${KT}`, { as: TQ, body: { active: false } })).status, 200);
  assert.equal(tinTk(await cuaToi(w, TQ)).length, 1, "Toàn quyền không nhận tin về việc chính mình làm");
  assert.equal(tinTk(await cuaToi(w, TQ2)).length, 2, "Toàn quyền khác nhận cả hai lần ngưng");
});
