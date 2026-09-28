// ADR-0046 (sửa ADR-0036 điều 6): tự tắt thông báo điện thoại chỉ ĐÚNG máy khi đăng xuất; đổi vai/quyền KHÔNG tắt; thao tác bảo mật (ngưng tài
// khoản, đổi SĐT, đổi/đặt lại PIN, gỡ Face ID) vẫn tắt MỌI máy. Chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs.
// `ctx.dongBangTin` là bắn-và-quên (exec.waitUntil của khung thử không chờ) → đợi một nhịp trước khi đọc bảng ntf_push_sub.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
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
const diaChi = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
async function batMay(w: any, as: string): Promise<string> {
  const ep = diaChi();
  const r = await w.call("POST", "/api/account/thong-bao/may", { as, body: { endpoint: ep, thietBi: "Máy thử" } });
  assert.equal(r.status, 200, r.text);
  return ep;
}
const dong = (w: any, ep: string) => w.q("SELECT revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = ?", ep)[0];
const dangBat = (w: any, staffId: string): number => w.q("SELECT count(*) n FROM ntf_push_sub WHERE staff_id = ? AND revoked_at IS NULL", staffId)[0].n;
const choMotNhip = () => new Promise((r) => setTimeout(r, 30));

test("ADR-0046 điểm 1: đăng xuất ({ endpoint, dangXuat: true }) chỉ tắt ĐÚNG máy đó (lý do dang-xuat); máy kia của cùng tài khoản vẫn bật", async () => {
  const w = setup();
  const may1 = await batMay(w, SALES);
  const may2 = await batMay(w, SALES);
  const r = await w.call("POST", "/api/account/thong-bao/may/huy", { as: SALES, body: { endpoint: may1, dangXuat: true } });
  assert.equal(r.status, 200, r.text);
  assert.ok(dong(w, may1).revoked_at, "máy đăng xuất phải hết hiệu lực");
  assert.equal(dong(w, may1).revoke_reason, "dang-xuat", "lý do phải là dang-xuat (không phải tu-tat)");
  assert.equal(dong(w, may2).revoked_at, null, "máy khác của cùng tài khoản vẫn bật");
});

test("ADR-0046 điểm 1: đăng xuất không đụng máy của NGƯỜI KHÁC dù gửi đúng địa chỉ của họ", async () => {
  const w = setup();
  const mayAdm = await batMay(w, ADM);
  const r = await w.call("POST", "/api/account/thong-bao/may/huy", { as: SALES, body: { endpoint: mayAdm, dangXuat: true } });
  assert.equal(r.status, 200, r.text);
  assert.equal(dong(w, mayAdm).revoked_at, null, "địa chỉ thuộc tài khoản khác → không đổi");
});

test("ADR-0046 điểm 2: Quản trị ĐỔI QUYỀN của một tài khoản có máy bật → máy vẫn bật", async () => {
  const w = setup();
  const may = await batMay(w, SALES);
  const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: ADM, body: { permissions: ["SALES", "ACCOUNTING"] } });
  assert.equal(r.status, 200, r.text);
  await choMotNhip();
  assert.equal(dong(w, may).revoked_at, null, "đổi quyền KHÔNG tắt máy");
  assert.equal(dangBat(w, SALES), 1);
});

test("ADR-0046 điểm 2: Toàn quyền ĐỔI VAI (gán vai IT) của một tài khoản có máy bật → máy vẫn bật", async () => {
  const w = setup();
  const may = await batMay(w, SALES);
  const r = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["IT"] } });
  assert.equal(r.status, 200, r.text);
  await choMotNhip();
  assert.equal(dong(w, may).revoked_at, null, "đổi vai KHÔNG tắt máy");
});

test("ADR-0046 điểm 3: thao tác bảo mật vẫn tắt MỌI máy (lý do tai-khoan-doi) — ngưng tài khoản, đổi SĐT đăng nhập", async () => {
  const w = setup();
  const a1 = await batMay(w, SALES);
  const a2 = await batMay(w, SALES);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { phone: "0900000099" } })).status, 200);
  await choMotNhip();
  for (const ep of [a1, a2]) assert.equal(dong(w, ep).revoke_reason, "tai-khoan-doi", "đổi SĐT → mọi máy tắt");
  // Ngưng một tài khoản KHÔNG phải quản trị viên cuối cùng (luật "còn ít nhất một quản trị viên" chặn 409 nếu ngưng ADM).
  const ACC = "55555555-5555-4555-8555-555555555555";
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  const b = await batMay(w, ACC);
  assert.equal((await w.call("PATCH", `/api/staff/${ACC}`, { as: ADM, body: { active: false } })).status, 200);
  await choMotNhip();
  assert.equal(dong(w, b).revoke_reason, "tai-khoan-doi", "ngưng tài khoản → mọi máy tắt");
});

test("ADR-0046 tiêu chí 4: web/shell.ts — đăng xuất gửi địa chỉ CỦA MÁY NÀY kèm dangXuat, không còn gửi tatCa: true", () => {
  const src = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const than = src.slice(src.indexOf("async function tatThongBaoMayNay"), src.indexOf("export async function logout"));
  assert.ok(than.length > 0, "không tìm thấy hàm tatThongBaoMayNay");
  assert.doesNotMatch(than, /tatCa\s*:\s*true/, "đăng xuất không được tắt mọi máy của tài khoản");
  assert.match(than, /dangXuat\s*:\s*true/, "đăng xuất phải gửi cờ dangXuat cho đúng máy này");
});
