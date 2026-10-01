// MẪU ĐƯA ĐÓN THEO DỊCH VỤ (ADR-0054 D10.1–D10.2 — kế hoạch 2026-10-01-may-chu-o-moi-chang Task 6: TC-M2, M3, M5, M6) + NƠI TRẢ MẶC ĐỊNH (ADR nháp
// docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md, chủ duyệt 1/10 Q-D = A — Task 7: tiêu chí 2, 3, 5, 6). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const VINPEARL = "ec67ff94-bb00-4546-842a-aedb5f916b0a"; // Bến cảng Vinpearl (0010)
const NGUNG = "bbbbbbbb-0000-4000-8000-000000000001";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài Xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('TD101', 'Tour 4 đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec(`INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${NGUNG}', 'BEN_CU', 'Bến cũ', 'PIER', 0, '2026-01-01', '2026-01-01')`);
  return w;
}
/** Ghi một bản mẫu. Chờ 2 ms trước mỗi lần: hai lần ghi CÙNG mili-giây → 409 `stale` (UNIQUE (code, valid_from_at) — đúng thiết kế, khuôn chính sách điều phối). */
const ghi = async (w: any, as: string, body: unknown, code = "TD101") => {
  await new Promise((r) => setTimeout(r, 2));
  return w.call("POST", `/api/van-chuyen/mau-chang/${code}`, { as, body });
};
const doc = (w: any, as: string, code = "TD101") => w.call("GET", `/api/van-chuyen/mau-chang/${code}`, { as });
const form = (w: any, as: string) => w.call("GET", "/api/van-chuyen/mau-chang", { as });
const dong = (w: any, code = "TD101") => w.q("SELECT mode, return_time_hint, default_dropoff_location_id FROM vc_leg_template WHERE code = ? ORDER BY valid_from_at", code).map((r: any) => ({ ...r }));
const nhatKy = (w: any) => w.q("SELECT detail, order_id FROM audit_log WHERE action = 'transfer_template_set' ORDER BY created_at, rowid").map((r: any) => ({ ...r }));

// ---- TC-M2 ---------------------------------------------------------------------------------------------------------------------------------------------------
test("TC-M2: Quản trị / Toàn quyền thêm bản mẫu → 201, bản cũ còn trong lịch sử; Bán hàng, Đối tác, Kế toán → 403; nhật ký transfer_template_set chế độ cũ → mới, không order_id", async () => {
  const w = setup();
  for (const as of [SALES, PARTNER, ACC]) assert.equal((await ghi(w, as, { mode: "ROUND_TRIP", returnTimeHint: "16:00" })).status, 403, as);
  for (const as of [SALES, FIELD]) assert.equal((await doc(w, as)).status, 403, as);
  const a = await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00" });
  assert.equal(a.status, 201, a.text);
  const b = await ghi(w, SUP, { mode: "ONE_WAY", returnTimeHint: null });
  assert.equal(b.status, 201, b.text);
  assert.deepEqual(b.json.lichSu.map((x: any) => [x.mode, x.returnTimeHint]), [["ONE_WAY", null], ["ROUND_TRIP", "16:00"]], "mới trước, bản cũ còn");
  assert.deepEqual([b.json.hienHanh.mode, b.json.code], ["ONE_WAY", "TD101"]);
  assert.deepEqual(dong(w).map((r: any) => r.mode), ["ROUND_TRIP", "ONE_WAY"]);
  const nk = nhatKy(w);
  assert.equal(nk.length, 2);
  assert.equal(nk[0].order_id, null);
  assert.match(nk[0].detail, /^Mẫu đưa đón TD101: \(chưa cài\) → Hai chiều; giờ về 16:00/);
  assert.match(nk[1].detail, /^Mẫu đưa đón TD101: Hai chiều → Một chiều/);
  assert.equal((await doc(w, ADM)).status, 200);
});

test("TC-M2: thân sai → 400 (thiếu mode, mode lạ, thiếu khoá returnTimeHint, giờ gợi ý khi không hai chiều, giờ sai khuôn, mang ngày hiệu lực); mã dịch vụ sai khuôn → 400", async () => {
  const w = setup();
  for (const body of [{}, { mode: "BOTH", returnTimeHint: null }, { mode: "ROUND_TRIP" }, { mode: "ONE_WAY", returnTimeHint: "16:00" }, { mode: "ROUND_TRIP", returnTimeHint: "4pm" },
    { mode: "ROUND_TRIP", returnTimeHint: null, validFromAt: "2026-01-01T00:00:00.000Z" }, null]) {
    const r = await ghi(w, ADM, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal((await ghi(w, ADM, { mode: "NONE", returnTimeHint: null }, "mã có dấu")).status, 400);
  assert.deepEqual(dong(w), []);
});

// ---- TC-M3 + NT tiêu chí 3 -----------------------------------------------------------------------------------------------------------------------------------
test("TC-M3: route form GET /api/van-chuyen/mau-chang — Bán hàng, Đối tác, Thực tập → 200; HDV, Kế toán, tài xế → 403; khoá ĐÚNG danh sách trắng; điểm đã ngưng → noiTraMacDinh null", async () => {
  const w = setup();
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('MOTO01', 'Thuê xe máy', 'perPax', 100000, 1, '2026-01-01', '2026-01-01')");
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinhId: BEN })).status, 201);
  assert.equal((await ghi(w, ADM, { mode: "NONE", returnTimeHint: null }, "MOTO01")).status, 201);
  for (const as of [FIELD, ACC, DRIVER]) assert.equal((await form(w, as)).status, 403, as);
  for (const as of [SALES, PARTNER, INTERN]) {
    const r = await form(w, as);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(Object.keys(r.json), ["mauChang"]);
    assert.deepEqual(Object.keys(r.json.mauChang).sort(), ["MOTO01", "TD101"]);
    for (const m of Object.values(r.json.mauChang) as any[]) assert.deepEqual(Object.keys(m).sort(), ["mode", "noiTraMacDinh", "returnTimeHint"]);
    assert.deepEqual(r.json.mauChang.TD101, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinh: { id: BEN, ten: "Bến tàu du lịch Nha Trang" } });
    assert.deepEqual(Object.keys(r.json.mauChang.TD101.noiTraMacDinh).sort(), ["id", "ten"]);
    assert.deepEqual(r.json.mauChang.MOTO01, { mode: "NONE", returnTimeHint: null, noiTraMacDinh: null });
  }
  w.sqlite.prepare("UPDATE loc_location SET active = 0 WHERE id = ?").run(BEN);
  assert.equal((await form(w, SALES)).json.mauChang.TD101.noiTraMacDinh, null, "điểm đã ngưng → null (form không gửi id điểm ngưng)");
});

// ---- NT tiêu chí 2 (route ghi nơi trả mặc định) ----------------------------------------------------------------------------------------------------------------
test("NT tiêu chí 2: nơi trả mặc định — điểm đang dùng → 201; điểm đã ngưng / không có → 400; NONE + điểm → 400; vắng khoá → chép bản cũ; vắng + NONE → NULL (201); null → bỏ; nhật ký tên điểm", async () => {
  const w = setup();
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: NGUNG })).status, 400);
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: "00000000-0000-4000-8000-000000000000" })).status, 400);
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: "khong-phai-uuid" })).status, 400);
  assert.equal((await ghi(w, ADM, { mode: "NONE", returnTimeHint: null, noiTraMacDinhId: BEN })).status, 400);
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinhId: BEN })).status, 201);
  assert.equal((await ghi(w, ADM, { mode: "ONE_WAY", returnTimeHint: null })).status, 201, "vắng khoá → chép");
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: VINPEARL })).status, 201);
  assert.equal((await ghi(w, ADM, { mode: "NONE", returnTimeHint: null })).status, 201, "vắng + NONE → NULL, không 400");
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: BEN })).status, 201);
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: null })).status, 201, "null tường minh = bỏ");
  assert.deepEqual(dong(w).map((r: any) => r.default_dropoff_location_id), [BEN, BEN, VINPEARL, null, BEN, null]);
  const nk = nhatKy(w).map((x: any) => x.detail as string);
  assert.match(nk[0]!, /nơi trả mặc định \(trống\) → Bến tàu du lịch Nha Trang$/);
  assert.doesNotMatch(nk[1]!, /nơi trả mặc định/, "không đổi nơi trả → không đoạn nơi trả");
  assert.match(nk[2]!, /nơi trả mặc định Bến tàu du lịch Nha Trang → Bến cảng Vinpearl$/);
  assert.match(nk[3]!, /nơi trả mặc định Bến cảng Vinpearl → \(trống\)$/);
  for (const x of nk) assert.doesNotMatch(x, /[0-9a-f]{8}-[0-9a-f]{4}/, "tên điểm, không id");
  const h = (await doc(w, ADM)).json;
  assert.deepEqual(h.lichSu[1].noiTraMacDinh, { id: BEN, ten: "Bến tàu du lịch Nha Trang", dangDung: true });
  // Bản hiện hành trỏ điểm đã ngưng: thân vắng khoá (màn cũ) → chép lại thì 400 (NT-D3 "điểm đang dùng lúc ghi") — ruling nhật ký thi công.
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinhId: BEN })).status, 201);
  w.sqlite.prepare("UPDATE loc_location SET active = 0 WHERE id = ?").run(BEN);
  const chep = await ghi(w, ADM, { mode: "ONE_WAY", returnTimeHint: null });
  assert.equal(chep.status, 400, chep.text);
  assert.match(chep.json.error.message, /ngưng/);
});

// ---- TC-M5, TC-M6, NT tiêu chí 5, 6 --------------------------------------------------------------------------------------------------------------------------
test("TC-M5 + NT-D5: máy chủ KHÔNG tạo chặng theo mẫu, KHÔNG tự điền nơi trả — lưu nháp không chặng cho dịch vụ hai chiều → 0 chặng; chặng đi không nơi trả → vẫn trống", async () => {
  const w = setup();
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinhId: BEN })).status, 201);
  const svc = (legs: unknown[]) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3), legs });
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc([])] } });
  assert.equal(r.status, 201, r.text);
  assert.equal(w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ?", r.json.order.id)[0].n, 0);
  const r2 = await w.call("POST", "/api/orders", {
    as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc([{ direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: null, pickupPlace: "KS A", dropoffLocationId: null, dropoffPlace: "" }])] },
  });
  assert.equal(r2.status, 201, r2.text);
  assert.deepEqual({ ...w.q("SELECT dropoff_location_id, dropoff_place FROM ord_transfer_leg WHERE order_id = ?", r2.json.order.id)[0] }, { dropoff_location_id: null, dropoff_place: null });
});

test("TC-M6 + NT tiêu chí 6: đổi mẫu (chế độ + nơi trả) KHÔNG đổi chặng của đơn đã có", async () => {
  const w = setup();
  assert.equal((await ghi(w, ADM, { mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinhId: BEN })).status, 201);
  const leg = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "KS A", dropoffLocationId: BEN, dropoffPlace: "" };
  const r = await w.call("POST", "/api/orders", {
    as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3), legs: [leg] }] },
  });
  assert.equal(r.status, 201, r.text);
  const truoc = w.q("SELECT * FROM ord_transfer_leg WHERE order_id = ?", r.json.order.id).map((x: any) => ({ ...x }));
  assert.equal((await ghi(w, ADM, { mode: "NONE", returnTimeHint: null })).status, 201);
  assert.equal((await ghi(w, ADM, { mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinhId: VINPEARL })).status, 201);
  assert.deepEqual(w.q("SELECT * FROM ord_transfer_leg WHERE order_id = ?", r.json.order.id).map((x: any) => ({ ...x })), truoc);
});
