// ADR-0118 Đ4, Đ6 (Đợt 2 lượt 1, Task 4; kế hoạch N-14…N-16): thứ tự «Chọn nhanh» của địa điểm — `GET /api/locations` mang `quickPickOrder` cho mọi tài khoản đăng nhập,
// `PUT /api/locations/:id` nhận `quickPickOrder` (số 1–99 hoặc null = bỏ; KHOÁ VẮNG = giữ giá trị đang lưu — Ruling R-G), kiểm đầu vào ở 400, ghi chỉ Quản trị / Toàn quyền (ô admin.manage).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { validateLocationUpdate } from "./rules.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const NAME: Record<string, string> = { [SALES]: "Bán hàng", [ADM]: "Quản trị", [FIELD]: "Hướng dẫn viên", [ACC]: "Kế toán", [SUP]: "Toàn quyền", [PARTNER]: "Đối tác", [INTERN]: "Thực tập" };

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  return w;
}
const lay = async (w: any, as = ADM) => (await w.call("GET", "/api/locations", { as })).json.locations as any[];
const diem = async (w: any, code: string, as = ADM) => (await lay(w, as)).find((l) => l.code === code);
/** Thân PUT đầy đủ như màn Địa điểm gửi (KHÔNG có `quickPickOrder` nếu `them` không nêu). */
const thanPut = (l: any, them: Record<string, unknown> = {}) => ({
  name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt, ...them,
});
const put = (w: any, l: any, as: string, them: Record<string, unknown> = {}) => w.call("PUT", `/api/locations/${l.id}`, { as, body: thanPut(l, them) });
const nhatKy = (w: any) => w.q("SELECT target_id, detail FROM audit_log WHERE action = 'location_updated' ORDER BY rowid").map((r: any) => ({ ...r }));

test("N-14: GET /api/locations — MỌI tài khoản đăng nhập thấy `quickPickOrder`; hai điểm gieo = 1 (Bến cảng Vinpearl) và 2 (Bến tàu du lịch Nha Trang), còn lại null", async () => {
  const w = setup();
  for (const as of [SALES, ADM, FIELD, ACC, SUP, PARTNER, INTERN]) {
    const ls = await lay(w, as);
    assert.ok(ls.length >= 8, NAME[as]);
    for (const l of ls) assert.ok(l.quickPickOrder === null || Number.isInteger(l.quickPickOrder), `${NAME[as]} ${l.code}`);
    const co = ls.filter((l) => l.quickPickOrder !== null).map((l) => [l.code, l.quickPickOrder]).sort((a, b) => a[1] - b[1]);
    assert.deepEqual(co, [["CANG_VINPEARL", 1], ["BEN_TAU_NHA_TRANG", 2]], NAME[as]);
  }
  const r = await w.call("GET", "/api/locations", { as: SALES });
  assert.ok("quickPickOrder" in r.json.locations[0], "khoá có mặt ở mọi địa điểm kể cả null");
});

test("N-15: PUT nhận quickPickOrder 1–99 hoặc null → lưu, trả DTO mới, ghi `location_updated`; 0, 100, 1.5, '3', true → 400, không ghi gì", async () => {
  const w = setup();
  let l = await diem(w, "QUAY_VE_01");
  assert.equal(l.quickPickOrder, null);
  const dat = await put(w, l, ADM, { quickPickOrder: 5 });
  assert.equal(dat.status, 200, dat.text);
  assert.equal(dat.json.location.quickPickOrder, 5);
  assert.equal((await diem(w, "QUAY_VE_01")).quickPickOrder, 5);
  assert.equal(nhatKy(w).length, 1);
  l = dat.json.location;
  for (const sai of [0, 100, -1, 1.5, "3", true, [], {}]) {
    const r = await put(w, l, ADM, { quickPickOrder: sai });
    assert.equal(r.status, 400, `${JSON.stringify(sai)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    assert.match(r.json.error.message, /chọn nhanh/i);
  }
  assert.equal((await diem(w, "QUAY_VE_01")).quickPickOrder, 5, "đầu vào sai không ghi");
  assert.equal(nhatKy(w).length, 1);
  for (const hop of [1, 99]) {
    const r = await put(w, l, ADM, { quickPickOrder: hop });
    assert.equal(r.status, 200, `${hop}: ${r.text}`);
    l = r.json.location;
  }
  const bo = await put(w, l, SUP, { quickPickOrder: null });
  assert.equal(bo.status, 200, bo.text);
  assert.equal(bo.json.location.quickPickOrder, null, "null = bỏ chọn nhanh");
});

test("N-15 (Ruling R-G): khoá `quickPickOrder` VẮNG = GIỮ giá trị đang lưu (màn Địa điểm bản cũ trong bộ nhớ đệm không xoá lặng lẽ hai điểm gieo); `null` tường minh mới bỏ", async () => {
  const w = setup();
  let vin = await diem(w, "CANG_VINPEARL");
  assert.equal(vin.quickPickOrder, 1);
  const doiTen = await put(w, vin, ADM, { name: "Bến cảng Vinpearl (sửa tên)" }); // KHÔNG khoá quickPickOrder
  assert.equal(doiTen.status, 200, doiTen.text);
  assert.equal(doiTen.json.location.quickPickOrder, 1, "khoá vắng → giữ 1");
  vin = doiTen.json.location;
  const ngung = await put(w, vin, ADM, { active: false });
  assert.equal(ngung.json.location.quickPickOrder, 1, "ngưng dùng cũng không làm mất số (DTO vẫn mang số; giao diện lọc theo active — N-16)");
  const bo = await put(w, ngung.json.location, ADM, { quickPickOrder: null });
  assert.equal(bo.json.location.quickPickOrder, null);
  const vang = await put(w, bo.json.location, ADM, { name: "Bến cảng Vinpearl" });
  assert.equal(vang.json.location.quickPickOrder, null, "đã bỏ thì khoá vắng giữ null");
});

test("N-15: Bán hàng, Kế toán, Hướng dẫn viên, Đối tác, Thực tập → 403 khi đặt quickPickOrder (thân hợp lệ), không ghi gì; Quản trị và Toàn quyền → 200", async () => {
  const w = setup();
  const l = await diem(w, "QUAY_VE_02");
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN]) {
    const r = await put(w, l, as, { quickPickOrder: 7 });
    assert.equal(r.status, 403, `${NAME[as]}: ${r.text}`);
  }
  assert.equal((await diem(w, "QUAY_VE_02")).quickPickOrder, null);
  assert.deepEqual(nhatKy(w), []);
  const a = await put(w, l, ADM, { quickPickOrder: 7 });
  assert.equal(a.status, 200, a.text);
  const s = await put(w, a.json.location, SUP, { quickPickOrder: 8 });
  assert.equal(s.status, 200, s.text);
});

test("N-15: nhật ký `location_updated` khi đổi chọn nhanh ghi mã điểm + «chọn nhanh: A → B» (không tên khách, không SĐT); mốc lạc quan vẫn chặn (409 stale) và bên thua không để lại dòng", async () => {
  const w = setup();
  const l = await diem(w, "QUAY_VE_03");
  const r = await put(w, l, ADM, { quickPickOrder: 3 });
  assert.equal(r.status, 200, r.text);
  const cu = await put(w, l, ADM, { quickPickOrder: 4 }); // mốc cũ
  assert.equal(cu.status, 409, cu.text);
  assert.equal(cu.json.error.code, "stale");
  assert.equal((await diem(w, "QUAY_VE_03")).quickPickOrder, 3);
  const log = nhatKy(w);
  assert.equal(log.length, 1, "bên thua không để lại dòng");
  assert.match(log[0].detail, /^QUAY_VE_03/);
  assert.match(log[0].detail, /chọn nhanh: chưa có → 3/);
  assert.doesNotMatch(log[0].detail, /\d{7,}|@/);
  const bo = await put(w, r.json.location, ADM, { quickPickOrder: null });
  assert.equal(bo.status, 200, bo.text);
  assert.match(nhatKy(w)[1].detail, /chọn nhanh: 3 → bỏ/);
});

test("N-16: địa điểm NGƯNG DÙNG vẫn mang số ở DTO (giao diện lọc theo `active` — nút chọn nhanh không hiện điểm ngưng); số trùng nhau giữa hai điểm được phép (xếp theo số rồi tên)", async () => {
  const w = setup();
  const tau = await diem(w, "BEN_TAU_NHA_TRANG");
  const ng = await put(w, tau, ADM, { active: false });
  assert.equal(ng.status, 200, ng.text);
  const ls = await lay(w, SALES);
  const t = ls.find((x) => x.code === "BEN_TAU_NHA_TRANG");
  assert.deepEqual([t.active, t.quickPickOrder], [false, 2]);
  const q1 = await diem(w, "QUAY_VE_01");
  const trung = await put(w, q1, ADM, { quickPickOrder: 1 });
  assert.equal(trung.status, 200, "trùng số với Bến cảng Vinpearl (1) vẫn lưu được — thứ tự phụ theo tên");
});

test("rules: validateLocationUpdate — quickPickOrder vắng → undefined (giữ); null → null; 1–99 → số; ngoài khoảng / không nguyên / kiểu khác → lỗi nêu «chọn nhanh»", () => {
  const goc = { name: "Quầy", locationTypeCode: "TICKET_COUNTER", active: true, expectedUpdatedAt: "x" };
  const v = (extra: Record<string, unknown>) => validateLocationUpdate({ ...goc, ...extra });
  const dau = (r: ReturnType<typeof v>) => (r.ok ? r.value.quickPickOrder : r.message);
  assert.equal(dau(v({})), undefined);
  assert.equal(dau(v({ quickPickOrder: null })), null);
  assert.equal(dau(v({ quickPickOrder: 1 })), 1);
  assert.equal(dau(v({ quickPickOrder: 99 })), 99);
  for (const sai of [0, 100, 1.5, "3", "", true, NaN, [], {}]) assert.match(String(dau(v({ quickPickOrder: sai }))), /chọn nhanh/i, JSON.stringify(sai));
});
