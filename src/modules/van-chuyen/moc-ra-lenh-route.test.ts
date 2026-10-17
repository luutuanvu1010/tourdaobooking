// MỐC RA LỆNH do Quản trị đặt (ADR-0128 Q1, chủ duyệt 2026-10-17): route hẹp `GET|POST /api/van-chuyen/moc-ra-lenh` cho ô `dispatch.policy.lead` (Quản trị, Toàn quyền)
// chỉ đổi HAI con số (mốc tối thiểu, cảnh báo sát mốc); mọi cột khác của chính sách (khoảng nghỉ, danh sách khách, giờ lái, cửa sổ xuất bến…) vẫn chỉ Toàn quyền
// (ô `settings.ops`, route chinh-sach-dieu-phoi). Chạy CẢ ứng dụng trên SQLite thật. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "55555555-5555-4555-8555-555555555555";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "22222222-2222-4222-8222-222222222222";
const PARTNER = "44444444-4444-4444-8444-444444444444";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const INTERN = "88888888-8888-4888-8888-888888888881";
const URL = "/api/van-chuyen/moc-ra-lenh";
const URL_DAY_DU = "/api/van-chuyen/chinh-sach-dieu-phoi";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000002", name: "Hướng dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000004", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000008", name: "Thực tập", perms: ["INTERN"] });
  return w;
}
const soDong = (w: any): number => w.q("SELECT count(*) n FROM vc_dispatch_policy")[0].n;
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log WHERE action = 'dispatch_policy_changed'")[0].n;
const hienHanh = (w: any) => ({ ...w.q("SELECT * FROM vc_dispatch_policy ORDER BY valid_from_at DESC LIMIT 1")[0] });

test("ADR-0128 Q1: Quản trị và Toàn quyền đọc được mốc; mọi vai khác 403", async () => {
  const w = setup();
  for (const as of [ADM, SUP]) {
    const r = await w.call("GET", URL, { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(Object.keys(r.json).sort(), ["minLeadMinutes", "warnLeadMinutes"]);
    assert.equal(r.json.minLeadMinutes, 360, "dòng gieo 0041");
    assert.equal(r.json.warnLeadMinutes, 120);
  }
  for (const as of [SALES, ACC, FIELD, PARTNER, DRIVER, INTERN]) assert.equal((await w.call("GET", URL, { as })).status, 403, as);
});

test("ADR-0128 Q1: Quản trị đặt mốc 30 phút → dòng chính sách MỚI chép nguyên mọi cột khác, một dòng nhật ký, hiệu lực ngay", async () => {
  const w = setup();
  const truoc = hienHanh(w);
  const n0 = soDong(w);
  const r = await w.call("POST", URL, { as: ADM, body: { minLeadMinutes: 30, warnLeadMinutes: 15 } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { minLeadMinutes: 30, warnLeadMinutes: 15 });
  assert.equal(soDong(w), n0 + 1, "chỉ thêm dòng, không sửa dòng cũ");
  const sau = hienHanh(w);
  assert.equal(sau.min_lead_minutes, 30);
  assert.equal(sau.warn_lead_minutes, 15);
  for (const c of Object.keys(truoc).filter((k) => !["id", "min_lead_minutes", "warn_lead_minutes", "valid_from_at", "created_at", "created_by", "updated_at", "updated_by"].includes(k))) {
    assert.equal(sau[c], truoc[c], `cột ${c} phải giữ nguyên`);
  }
  assert.equal(sau.created_by, ADM);
  assert.equal(soNhatKy(w), 1);
  const nk = w.q("SELECT staff_id, detail FROM audit_log WHERE action = 'dispatch_policy_changed'")[0];
  assert.equal(nk.staff_id, ADM);
  assert.match(nk.detail, /30/);
  // Toàn quyền thấy bản mới ở route đầy đủ.
  const day = await w.call("GET", URL_DAY_DU, { as: SUP });
  assert.equal(day.json.current.minLeadMinutes, 30);
});

test("ADR-0128 Q1: Quản trị KHÔNG chạm được chính sách đầy đủ; Toàn quyền vẫn đặt được mốc qua route hẹp", async () => {
  const w = setup();
  assert.equal((await w.call("GET", URL_DAY_DU, { as: ADM })).status, 403);
  const n0 = soDong(w);
  const post = await w.call("POST", URL_DAY_DU, { as: ADM, body: { minLeadMinutes: 30 } });
  assert.equal(post.status, 403, post.text);
  assert.equal(soDong(w), n0);
  const r = await w.call("POST", URL, { as: SUP, body: { minLeadMinutes: 45, warnLeadMinutes: 60 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(hienHanh(w).min_lead_minutes, 45);
});

test("ADR-0128 Q1: vai khác 403, thân sai 400, không ghi gì", async () => {
  const w = setup();
  const n0 = soDong(w);
  for (const as of [SALES, ACC, FIELD, PARTNER, DRIVER, INTERN]) {
    assert.equal((await w.call("POST", URL, { as, body: { minLeadMinutes: 30, warnLeadMinutes: 15 } })).status, 403, as);
  }
  for (const body of [
    {}, { minLeadMinutes: 30 }, { warnLeadMinutes: 15 }, { minLeadMinutes: 0, warnLeadMinutes: 15 }, { minLeadMinutes: 2881, warnLeadMinutes: 15 },
    { minLeadMinutes: 30, warnLeadMinutes: -1 }, { minLeadMinutes: 30, warnLeadMinutes: 1441 }, { minLeadMinutes: "30", warnLeadMinutes: 15 }, { minLeadMinutes: 30.5, warnLeadMinutes: 15 },
    { minLeadMinutes: 30, warnLeadMinutes: 15, restMinutes: 0 },
  ]) {
    const r = await w.call("POST", URL, { as: ADM, body });
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(soDong(w), n0);
  assert.equal(soNhatKy(w), 0);
});
