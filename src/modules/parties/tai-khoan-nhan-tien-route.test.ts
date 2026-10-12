// Route "Tài khoản nhận tiền" (ADR-0108 đ2; đặc tả QR §4.1, §8.2) trên khung thử — ô company.legal.write (chỉ Toàn quyền), chỉ hồ sơ đang là công ty chủ,
// đóng + mở + nhật ký MỘT lô, nhật ký không chép số tài khoản, khoá lạc quan `truocDo`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-10-08T01:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  return { w, ct };
}
const url = (id: string) => `/api/parties/${id}/tai-khoan-nhan-tien`;
const THAN = { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "Công ty TNHH Tour Đảo", truocDo: null };

test("Toàn quyền cài rồi đổi: đúng một dòng mở, dòng cũ có valid_to, mỗi lần một dòng nhật ký KHÔNG chứa số tài khoản", async () => {
  const { w, ct } = setup();
  let r = await w.call("GET", url(ct), { as: SA });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.hienTai, null);
  assert.ok(r.json.nganHang.some((b: { ma: string }) => b.ma === "VCB"));
  r = await w.call("PUT", url(ct), { as: SA, body: THAN });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(
    { ...r.json.hienTai, id: "x", tuLuc: "x" },
    { id: "x", maNganHang: "VCB", nganHang: "Vietcombank", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", tuLuc: "x" },
  );
  const id1 = r.json.hienTai.id;
  r = await w.call("PUT", url(ct), { as: SA, body: { maNganHang: "MB", soTaiKhoan: "1234567890", chuTaiKhoan: "TOUR DAO", truocDo: id1 } });
  assert.equal(r.status, 200, r.text);
  const dong = w.q("SELECT id, valid_to FROM pty_bank_account WHERE party_id = ? ORDER BY created_at, rowid", ct);
  assert.equal(dong.length, 2);
  assert.ok(dong[0].valid_to, "dòng cũ đã đóng");
  assert.equal(dong[1].valid_to, null, "dòng mới mở");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'party_bank_account_changed' AND target_id = ? ORDER BY created_at, rowid", ct);
  assert.equal(nk.length, 2);
  // Khẳng định HÌNH DẠNG (chữ cố định), không quét \d{8,} trên chuỗi có thể chứa mã ngẫu nhiên.
  assert.deepEqual(nk.map((x: { detail: string }) => x.detail), ["cài tài khoản nhận tiền", "đổi tài khoản nhận tiền"]);
  for (const x of nk) assert.doesNotMatch(String(x.detail), /0011001234567|1234567890/, "nhật ký không chép số tài khoản");
});

test("khoá lạc quan: truocDo cũ / null khi đã có tài khoản ⇒ 409 stale, không ghi gì", async () => {
  const { w, ct } = setup();
  const r1 = await w.call("PUT", url(ct), { as: SA, body: THAN });
  assert.equal(r1.status, 200, r1.text);
  const n = w.q("SELECT count(*) AS n FROM pty_bank_account")[0].n;
  for (const truocDo of [null, "khong-phai-dong-mo"]) {
    const r = await w.call("PUT", url(ct), { as: SA, body: { ...THAN, truocDo } });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "stale");
  }
  assert.equal(w.q("SELECT count(*) AS n FROM pty_bank_account")[0].n, n);
});

test("Kế toán, Quản trị, Bán hàng ⇒ 403 cả đọc lẫn ghi; hồ sơ không phải công ty chủ ⇒ 409; thân sai ⇒ 400; ngân hàng không có ⇒ 400", async () => {
  const { w, ct } = setup();
  for (const as of [KT, ADM, SALES]) {
    assert.equal((await w.call("GET", url(ct), { as })).status, 403, `${as} đọc`);
    assert.equal((await w.call("PUT", url(ct), { as, body: THAN })).status, 403, `${as} ghi`);
  }
  // Mã hồ sơ phải đúng dạng PARTY_ID_RE (src/shared/party-id.ts) — sai dạng thì route trả 404 trước khi tới kiểm "công ty chủ".
  const DAI_LY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý', 1, ?, ?)").run(DAI_LY, AT, AT);
  const khac = await w.call("PUT", url(DAI_LY), { as: SA, body: THAN });
  assert.equal(khac.status, 409, khac.text);
  assert.equal(khac.json.error.code, "not_owner_company");
  assert.equal((await w.call("PUT", url(ct), { as: SA, body: { ...THAN, soTaiKhoan: "12AB" } })).status, 400);
  assert.equal((await w.call("PUT", url(ct), { as: SA, body: { ...THAN, maNganHang: "KHONGCO" } })).status, 400);
});
