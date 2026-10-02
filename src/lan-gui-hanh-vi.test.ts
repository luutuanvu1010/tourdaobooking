// HÀNG RÀO H1 (ADR-0094) — lớp chống ghi trùng qua ROUTER THẬT trên SQLite thật (tests/audit/harness.mjs, D1 giả chế độ nghiêm). Đây là bài HỒI QUY của
// redteam R1/R2 (tests/audit/redteam.test.mjs nằm ngoài npm test): gửi lại CÙNG VÉ không ghi lần hai. Kịch bản KHÔNG vé vẫn ra 2 bản ghi ở giai đoạn 1
// (ca j — T14); chỉ bản siết mới chặn.
// Ca theo kế hoạch L5: (a) gửi lại tuần tự, (b) khác thân ⇒ 422, (c) đồng thời, (d) lỗi kiểm dữ liệu ⇒ không vé, (e) handler nuốt lỗi đụng vé, (f) lô thua mà
// vẫn ghi vé, (g) T13 bất biến lô (hai chiều), (h) T16 không dữ liệu cá nhân, (i) R2 newBooker, (j) T14 thiếu vé. Thêm: vé sai dạng ⇒ 400.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // SALES
const ADM = "33333333-3333-4333-8333-333333333333"; // ADMIN
const ADM2 = "44444444-4444-4444-8444-444444444444"; // ADMIN thứ hai (ca f)
const SUP = "77777777-7777-4777-8777-777777777777"; // SUPER_ADMIN

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Một", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  ...extra,
});
const veMoi = () => crypto.randomUUID();
const goi = (w: any, method: string, path: string, o: { as: string; body?: unknown; ve?: string }) =>
  w.call(method, path, { as: o.as, body: o.body, headers: o.ve === undefined ? {} : { "idempotency-key": o.ve } });
const soDon = (w: any): number => w.q("SELECT count(*) AS n FROM orders")[0].n;
const dongVe = (w: any, khoa: string) => w.q("SELECT * FROM lg_lan_gui WHERE khoa = ?", khoa)[0] ?? null;
const laPhatLai = (r: any) => r.status === 200 && r.json?.da_ghi_truoc_do === true && r.headers.get("idempotent-replayed") === "true";

test("(a) T2: POST /api/orders hai lần CÙNG vé (tuần tự) ⇒ 1 đơn; lần 2 trả 200 da_ghi_truoc_do + Idempotent-Replayed; đếm lặp", async () => {
  const w = setup();
  const ve = veMoi();
  const r1 = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve });
  assert.equal(r1.status, 201, r1.text);
  await w.choNen();
  const r2 = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve });
  assert.ok(laPhatLai(r2), `${r2.status} ${r2.text}`);
  assert.ok(r2.json.ket_qua === null || typeof r2.json.ket_qua === "string");
  assert.equal(soDon(w), 1);
  await w.choNen();
  const d = dongVe(w, ve);
  assert.equal(d.ma_tra, 201);
  assert.equal(d.so_lan_lap, 1, "A-1: đếm một lần gửi lặp");
});

test("(b) cùng vé, KHÁC thân ⇒ 422 ma_lan_gui_khac_noi_dung, không ghi thêm", async () => {
  const w = setup();
  const ve = veMoi();
  assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })).status, 201);
  await w.choNen();
  const r = await goi(w, "POST", "/api/orders", { as: A, body: orderBody({ customerName: "Khách Hai" }), ve });
  assert.equal(r.status, 422, r.text);
  assert.equal(r.json?.error?.code, "ma_lan_gui_khac_noi_dung");
  assert.equal(soDon(w), 1);
});

test("(c) gửi ĐỒNG THỜI cùng vé ⇒ 1 đơn; bên thua nhận 'đã ghi' hoặc 409 dang_xu_ly; gửi lại sau đó ⇒ phát lại", async () => {
  const w = setup();
  const ve = veMoi();
  await w.token(A); // phiên dựng TRƯỚC: khung thử tạo phiên ở lần gọi đầu — hai lần đồng thời sẽ đụng chỉ mục phiên một máy (lỗi của khung thử, không của lớp)
  w.raoTraVe(2);
  const [r1, r2] = await Promise.all([1, 2].map(() => goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })));
  assert.equal(soDon(w), 1, `${r1.status} ${r2.status}`);
  const thua = r1.status === 201 ? r2 : r1;
  assert.ok(laPhatLai(thua) || (thua.status === 409 && thua.json?.error?.code === "dang_xu_ly"), `${thua.status} ${thua.text}`);
  await w.choNen();
  assert.ok(laPhatLai(await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })));
  assert.equal(soDon(w), 1);
});

test("(d) lỗi kiểm dữ liệu (400) ⇒ KHÔNG có vé; gửi lại thân đúng CÙNG vé chạy như mới", async () => {
  const w = setup();
  const ve = veMoi();
  const r1 = await goi(w, "POST", "/api/orders", { as: A, body: orderBody({ customerName: "" }), ve });
  assert.equal(r1.status, 400, r1.text);
  await w.choNen();
  assert.equal(dongVe(w, ve), null);
  const r2 = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve });
  assert.equal(r2.status, 201, r2.text);
  assert.equal(soDon(w), 1);
});

test("(e) handler NUỐT lỗi UNIQUE (POST /api/staff, phone_taken) — hai lần ĐỒNG THỜI cùng vé ⇒ 1 tài khoản; bên thua KHÔNG nhận phone_taken", async () => {
  const w = setup();
  const ve = veMoi();
  const body = { fullName: "Người Mới", phone: "0909999999", permissions: ["SALES"], taoHoSoMoi: true };
  await w.token(SUP);
  w.raoTraVe(2);
  const kq = await Promise.all([1, 2].map(() => goi(w, "POST", "/api/staff", { as: SUP, body, ve })));
  assert.equal(w.q("SELECT count(*) AS n FROM staff WHERE phone = '0909999999'")[0].n, 1);
  assert.equal(kq.filter((r: any) => r.status === 201).length, 1, kq.map((r: any) => `${r.status} ${r.text}`).join(" | "));
  const thua = kq.find((r: any) => r.status !== 201);
  assert.notEqual(thua.json?.error?.code, "phone_taken", thua.text);
  assert.ok(laPhatLai(thua) || (thua.status === 409 && thua.json?.error?.code === "dang_xu_ly"), `${thua.status} ${thua.text}`);
  assert.ok(!thua.text.includes('"pin"'), "phát lại không hiện lại PIN (ADR-0094 đ6)");
});

test("(f) lô thua mà vẫn ghi vé (LAST_ADMIN) ⇒ gửi lại nhận ĐÚNG 409 + mã lỗi cũ + câu cố định", async () => {
  const w = setup();
  const [v1, v2] = [veMoi(), veMoi()];
  await w.token(SUP);
  w.raoTraVe(2);
  const [r1, r2] = await Promise.all([
    goi(w, "PUT", `/api/staff/${ADM}/permissions`, { as: SUP, body: { permissions: ["SALES"] }, ve: v1 }),
    goi(w, "PUT", `/api/staff/${ADM2}/permissions`, { as: SUP, body: { permissions: ["SALES"] }, ve: v2 }),
  ]);
  const thua = r1.status === 409 ? { r: r1, ve: v1, id: ADM } : r2.status === 409 ? { r: r2, ve: v2, id: ADM2 } : null;
  assert.ok(thua, `cần một bên thua LAST_ADMIN: ${r1.status} ${r1.text} | ${r2.status} ${r2.text}`);
  assert.equal(thua.r.json?.error?.code, "account_rule");
  await w.choNen();
  const r = await goi(w, "PUT", `/api/staff/${thua.id}/permissions`, { as: SUP, body: { permissions: ["SALES"] }, ve: thua.ve });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json?.error?.code, "account_rule");
  assert.equal(r.json?.error?.message, "Lần gửi trước đã bị từ chối, tải lại để xem.");
  assert.equal(r.headers.get("idempotent-replayed"), "true");
});

test("(g) T13: lô nghiệp vụ hỏng (trigger RAISE) ⇒ không vé; gửi lại cùng vé chạy như mới", async () => {
  const w = setup();
  const ve = veMoi();
  w.sqlite.exec("CREATE TRIGGER thu_chan_don BEFORE INSERT ON orders BEGIN SELECT RAISE(ABORT, 'thu_chan_don'); END");
  const r1 = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve });
  assert.equal(r1.status, 500, r1.text);
  await w.choNen();
  assert.equal(dongVe(w, ve), null);
  w.sqlite.exec("DROP TRIGGER thu_chan_don");
  assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })).status, 201);
  assert.equal(soDon(w), 1);
});

test("(g2) T13 chiều kia: câu vé hỏng ⇒ KHÔNG có dữ liệu nghiệp vụ (cùng lô)", async () => {
  const w = setup();
  w.sqlite.exec("CREATE TRIGGER thu_chan_ve BEFORE INSERT ON lg_lan_gui BEGIN SELECT RAISE(ABORT, 'thu_chan_ve'); END");
  const r = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve: veMoi() });
  assert.equal(r.status, 500, r.text);
  assert.equal(soDon(w), 0);
});

test("(h) T16: dòng vé không chứa thân, SĐT, tên; duong là MẪU route", async () => {
  const w = setup();
  const ve = veMoi();
  assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })).status, 201);
  await w.choNen();
  const d = dongVe(w, ve);
  assert.ok(d, "phải có dòng vé");
  assert.equal(d.duong, "POST /api/orders");
  assert.equal(d.staff_id, A);
  assert.match(d.van_tay, /^[0-9a-f]{64}$/);
  const chu = JSON.stringify(d);
  for (const x of ["0912345678", "Khách Một", "ZA1", "500000"]) assert.ok(!chu.includes(x), `dòng vé lộ "${x}"`);
  const pin = await goi(w, "PUT", `/api/staff/${ADM}/permissions`, { as: SUP, body: { permissions: ["ADMIN", "SALES"] }, ve: veMoi() });
  assert.equal(pin.status, 200, pin.text);
  await w.choNen();
  assert.deepEqual(w.q("SELECT duong FROM lg_lan_gui WHERE staff_id = ?", SUP).map((r: any) => r.duong), ["PUT /api/staff/:id/permissions"], "mẫu route, không id");
});

test("(i) R2: POST /api/orders có newBooker hai lần cùng vé ⇒ 1 hồ sơ khách", async () => {
  const w = setup();
  const ve = veMoi();
  const body = orderBody({ newBooker: { fullName: "Trần Khách", phone: "0912345678" } });
  assert.equal((await goi(w, "POST", "/api/orders", { as: A, body, ve })).status, 201);
  await w.choNen();
  await goi(w, "POST", "/api/orders", { as: A, body, ve });
  assert.equal(w.q("SELECT count(DISTINCT party_id) AS n FROM pty_contact_point WHERE value_normalized = '0912345678'")[0].n, 1);
  assert.equal(soDon(w), 1);
});

test("(j) T14: THIẾU vé ⇒ giai đoạn 1 cho qua (2 đơn) và ghi đúng một dòng log thieu_ma_lan_gui mỗi lần, chỉ mẫu route", async () => {
  const w = setup();
  const log: string[] = [];
  const goc = console.warn;
  console.warn = (...a: unknown[]) => void log.push(a.map(String).join(" "));
  try {
    assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody() })).status, 201);
    assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody() })).status, 201);
  } finally {
    console.warn = goc;
  }
  assert.equal(soDon(w), 2);
  const dong = log.filter((l) => l.includes("thieu_ma_lan_gui"));
  assert.equal(dong.length, 2, log.join("\n"));
  assert.deepEqual(JSON.parse(dong[0]!), { event: "thieu_ma_lan_gui", duong: "POST /api/orders" });
  assert.equal(w.q("SELECT count(*) AS n FROM lg_lan_gui")[0].n, 0);
});

test("vé sai dạng ⇒ 400 ma_lan_gui_sai_dang, không chạy handler", async () => {
  const w = setup();
  for (const ve of ["ngan", "co dau cach 1234567890", "x".repeat(65)]) {
    const r = await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve });
    assert.equal(r.status, 400, `${ve}: ${r.text}`);
    assert.equal(r.json?.error?.code, "ma_lan_gui_sai_dang");
  }
  assert.equal(soDon(w), 0);
});

test("phạm vi vé là TÀI KHOẢN: cùng vé, tài khoản khác ⇒ chạy như mới", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: "22222222-2222-4222-8222-222222222222", phone: "0900000002", name: "Bình", perms: ["SALES"] });
  const ve = veMoi();
  assert.equal((await goi(w, "POST", "/api/orders", { as: A, body: orderBody(), ve })).status, 201);
  assert.equal((await goi(w, "POST", "/api/orders", { as: "22222222-2222-4222-8222-222222222222", body: orderBody(), ve })).status, 201);
  assert.equal(soDon(w), 2);
});
