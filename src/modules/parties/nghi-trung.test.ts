// ADR-0068 Đ8, đặc tả T1 + Review Focus 4: cặp hồ sơ cá nhân đang dùng nghi trùng — cùng SĐT liên hệ mở, cùng tên chuẩn hoá (kể cả NFD), số đăng nhập của tài
// khoản trùng SĐT liên hệ của hồ sơ khác; một cặp một lần; hồ sơ ngưng / đã gộp không vào; chỉ admin.manage.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777"; // ADR-0071: người tạo tài khoản trong bài (Quản trị không tạo nữa)
const nguoi = async (w: any, fullName: string, so?: string) => {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName, contacts: so ? [{ kind: "PHONE", value: so }] : [] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
};
const cap = (x: any) => [[x.a.id, x.b.id].sort().join("|"), x.lyDo.join(",")];

test("T1: PHONE, NAME (NFD), LOGIN_PHONE; một cặp một lần; hồ sơ ngưng không vào; cờ có tài khoản đúng", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const p1 = await nguoi(w, "Nguyễn Phú Hải", "0912000111");
  const p2 = await nguoi(w, "Nguyễn Phú Hải".normalize("NFD"));
  const p3 = await nguoi(w, "Trần Văn Cường", "0912000111");
  const tk = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Lê Đăng Nhập", phone: "0900000088", roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(tk.status, 201, tk.text);
  const pL = tk.json.staff.partyId as string;
  const p4 = await nguoi(w, "Người Giữ Số", "0900000088");
  const p5 = await nguoi(w, "Nguyễn Phú Hải");
  const u5 = w.q("SELECT updated_at u FROM pty_party WHERE id = ?", p5)[0].u;
  assert.equal((await w.call("PUT", `/api/parties/${p5}`, { as: ADM, body: { fullName: "Nguyễn Phú Hải", active: false, expectedUpdatedAt: u5 } })).status, 200);

  const r = await w.call("GET", "/api/parties/duplicates", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.pairs.map(cap).sort(), [
    [[p1, p2].sort().join("|"), "NAME"],
    [[p1, p3].sort().join("|"), "PHONE"],
    [[pL, p4].sort().join("|"), "LOGIN_PHONE"],
  ].sort());
  const dongL = r.json.pairs.find((x: any) => x.a.id === pL || x.b.id === pL);
  assert.equal(dongL.a.id === pL ? dongL.aCoTaiKhoan : dongL.bCoTaiKhoan, true);
  assert.equal(r.json.conNua, false);
  assert.equal((await w.call("GET", "/api/parties/duplicates", { as: SALES })).status, 403);
});

test("T3: không có hồ sơ trùng → danh sách rỗng", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  await nguoi(w, "Một Người", "0912000111");
  assert.deepEqual((await w.call("GET", "/api/parties/duplicates", { as: ADM })).json, { pairs: [], conNua: false });
});
