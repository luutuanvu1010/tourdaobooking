// Cài đặt Trả sau (ADR-0172 Đ1, Đ2, tiêu chí 1–3; ADR-0173 Đ1 mục 1, Đ3 mục 3, tiêu chí 1, 7). Khung thử thật (tests/audit/harness.mjs). Tên người, hồ sơ, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { addDays, vnToday } from "./shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // đại lý A
const PT2 = "66666666-6666-4666-8666-666666666667"; // đại lý B
const ADMIN = "77777777-7777-4777-8777-777777777777";
const HR = "99999999-9999-4999-8999-999999999999";
const SM = "99999999-9999-4999-8999-999999999998"; // Quản lý bán hàng
const ADMIN_DL = "77777777-7777-4777-8777-777777777778"; // Quản trị có hồ sơ mang vai đại lý được hưởng
const AT = "2026-10-01T00:00:00.000Z";
let seq = 0;
const uuid = () => `97979797-9797-4979-8979-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [PT, "0900000008", "Đại Lý A", ["PARTNER"]], [PT2, "0900000018", "Đại Lý B", ["PARTNER"]], [ADMIN, "0900000010", "Quản Trị", ["ADMIN"]],
    [HR, "0900000012", "Nhân Sự", ["HR"]], [SM, "0900000013", "Quản Lý Bán", ["SALES_MANAGER", "SALES"]], [ADMIN_DL, "0900000014", "Quản Trị Kiêm Đại Lý", ["ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  for (const p of [PT, PT2, ADMIN_DL]) {
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`ptr-${p}`, `pty-${p}`, AT, AT);
  }
  return w;
}
const bat = (w: W, as: string, partyId: string, hanMuc: number, gioTra = 36, gioAnHan = 0) =>
  w.call("POST", "/api/tra-sau/han-muc", { as, body: { partyId, hanMuc, gioTra, gioAnHan } });
const mucToiDa = (w: W, as: string, so: number) => w.call("POST", "/api/tra-sau/muc-toi-da", { as, body: { so } });
const hoSo = async (w: W, partyId: string, as = KT) => (await w.call("GET", `/api/tra-sau/han-muc/${partyId}`, { as })).json;

/** Đơn Trả sau `tong` đồng của PT, đi qua cổng xác nhận thật; trả status của lệnh xác nhận. */
async function donTraSau(w: W, tong: number): Promise<{ id: string; status: number; text: string }> {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, payment_term, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, 0, ?, ?, ?, 'CREDIT', ?, ?)`).run(id, `TD-CD-${seq}`, SALES, tong, tong, tong, `pty-${PT}`, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Tour đảo', 'perPax', 1, ?)`).run(`${id}-s`, id, addDays(vnToday(new Date()), 30));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`)
    .run(`${id}-i`, id, `${id}-s`, tong, tong, tong);
  const xn = await w.xacNhanDon(id, SALES);
  return { id, status: xn.status, text: xn.text };
}

test("ADR-0172 tiêu chí 1: Quản trị, Toàn quyền bật được; Kế toán, Bán hàng, Quản lý bán hàng, Nhân sự, Đối tác 403", async () => {
  const w = setup();
  assert.equal((await mucToiDa(w, SUPER, 100_000_000)).status, 201);
  assert.equal((await bat(w, ADMIN, `pty-${PT}`, 50_000_000)).status, 201, "Quản trị bật");
  assert.equal((await bat(w, SUPER, `pty-${PT2}`, 50_000_000)).status, 201, "Toàn quyền bật");
  for (const as of [KT, SALES, SM, HR, PT]) {
    const r = await bat(w, as, `pty-${PT2}`, 1_000_000);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${PT2}/ngung`, { as, body: {} })).status, 403, `ngừng: ${as}`);
  }
  assert.equal((await hoSo(w, `pty-${PT2}`)).hanMuc, 50_000_000, "không ai trong số bị từ chối đổi được số");
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${PT}/ngung`, { as: ADMIN, body: {} })).status, 200, "Quản trị ngừng được");
  const nk = w.q("SELECT staff_id, detail FROM audit_log WHERE action = 'credit_limit_set' ORDER BY rowid");
  assert.deepEqual(nk.map((x) => x.staff_id), [ADMIN, SUPER], "nhật ký ghi người đặt");
  assert.match(String(nk[0]!.detail), /50\.000\.000/, "nhật ký ghi số tiền");
});

test("ADR-0173 tiêu chí 1: mức tối đa 100.000.000 — Quản trị đặt 100.000.000 được, 100.000.001 thì 403 kèm câu rõ; Toàn quyền đặt được; chưa có mức tối đa thì Quản trị 403", async () => {
  const w = setup();
  const chua = await bat(w, ADMIN, `pty-${PT}`, 1_000_000);
  assert.deepEqual([chua.status, chua.json.error.code], [403, "chua_co_muc_toi_da"], chua.text);
  assert.match(chua.json.error.message, /chưa đặt mức tối đa/);
  assert.equal((await mucToiDa(w, ADMIN, 100_000_000)).status, 403, "Quản trị không tự đặt mức tối đa");
  assert.equal((await mucToiDa(w, KT, 100_000_000)).status, 403);
  assert.equal((await mucToiDa(w, SUPER, 0)).status, 400);
  assert.equal((await mucToiDa(w, SUPER, 100_000_000)).status, 201);
  assert.equal((await bat(w, ADMIN, `pty-${PT}`, 100_000_000)).status, 201, "đúng bằng mức tối đa");
  const vuot = await bat(w, ADMIN, `pty-${PT2}`, 100_000_001);
  assert.deepEqual([vuot.status, vuot.json.error.code], [403, "vuot_muc_toi_da"], vuot.text);
  assert.match(vuot.json.error.message, /100\.000\.001.*100\.000\.000/);
  assert.equal((await bat(w, SUPER, `pty-${PT2}`, 500_000_000)).status, 201, "Toàn quyền không bị mức tối đa giới hạn");
  // Mức tối đa chỉ thêm dòng: hạ xuống thì lần đặt sau của Quản trị theo số mới, hạn mức đã bật giữ nguyên.
  assert.equal((await mucToiDa(w, SUPER, 10_000_000)).status, 201);
  assert.equal((await bat(w, ADMIN, `pty-${PT}`, 20_000_000)).status, 403);
  assert.equal((await hoSo(w, `pty-${PT}`)).hanMuc, 100_000_000);
  const ds = (await w.call("GET", "/api/tra-sau/han-muc", { as: ADMIN })).json;
  assert.deepEqual([ds.mucToiDa, ds.coQuyenDatMucToiDa, ds.coQuyenSua], [10_000_000, false, true]);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_credit_setting")[0].n, 2);
});

test("ADR-0172 «Chỗ dễ nhầm»: tài khoản Quản trị cũng là đại lý được hưởng không tự bật, đổi hay ngừng Trả sau cho mình; người khác thì được", async () => {
  const w = setup();
  assert.equal((await mucToiDa(w, SUPER, 100_000_000)).status, 201);
  const tu = await bat(w, ADMIN_DL, `pty-${ADMIN_DL}`, 1_000_000);
  assert.deepEqual([tu.status, tu.json.error.code], [403, "tu_dat_tra_sau"], tu.text);
  assert.equal((await bat(w, ADMIN, `pty-${ADMIN_DL}`, 1_000_000)).status, 201, "Quản trị khác bật được");
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${ADMIN_DL}/ngung`, { as: ADMIN_DL, body: {} })).status, 403, "không tự ngừng");
  assert.equal((await hoSo(w, `pty-${ADMIN_DL}`, ADMIN_DL)).coQuyenSua, false, "ô của chính mình hiện chỉ đọc");
  assert.equal((await hoSo(w, `pty-${PT}`, ADMIN_DL)).coQuyenSua, true);
});

test("ADR-0172 tiêu chí 2, Đ2: số gợi ý theo cấp không cho ai Trả sau; bật thì điền sẵn được; đổi số gợi ý không đổi Trả sau đã bật", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO prc_rate_tier (code, name, name_key, created_at, updated_at) VALUES ('TA1', 'TA1', 'ta1', ?, ?)").run(AT, AT);
  const goi = (as: string, cap: string, body: unknown) => w.call("PUT", `/api/tra-sau/goi-y/${cap}`, { as, body });
  assert.equal((await goi(KT, "TA1", { hanMuc: 50_000_000, gioTra: 36, gioAnHan: 0 })).status, 403, "Kế toán không đặt số gợi ý");
  assert.equal((await goi(SUPER, "KHONG_CO", { hanMuc: 50_000_000, gioTra: 36, gioAnHan: 0 })).status, 404);
  assert.equal((await goi(SUPER, "TA1", { hanMuc: 50_000_000, gioTra: 0, gioAnHan: 0 })).status, 400);
  assert.equal((await goi(ADMIN, "TA1", { hanMuc: 50_000_000, gioTra: 36, gioAnHan: 0 })).status, 200);
  const g = (await w.call("GET", "/api/tra-sau/goi-y", { as: KT })).json;
  assert.deepEqual(g.goiY, [{ cap: "TA1", hanMuc: 50_000_000, gioTra: 36, gioAnHan: 0 }]);
  assert.equal(g.coQuyenSua, false);
  // Có số gợi ý mà chưa bật ⇒ không dùng được Trả sau.
  const r = await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=pty-${PT}`, { as: SALES });
  assert.deepEqual([r.json.coHanMuc, r.json.conDuocDung], [false, 0]);
  const chua = await donTraSau(w, 1_000_000);
  assert.equal(chua.status, 409, "đại lý TA1 chưa bật: không xác nhận được đơn Trả sau");
  // Bật với số gợi ý (giao diện điền sẵn), rồi đổi số gợi ý: Trả sau đã bật không đổi.
  assert.equal((await bat(w, SUPER, `pty-${PT}`, 50_000_000, 36, 0)).status, 201);
  assert.equal((await goi(SUPER, "TA1", { hanMuc: 80_000_000, gioTra: 72, gioAnHan: 12 })).status, 200);
  const hs = await hoSo(w, `pty-${PT}`);
  assert.deepEqual([hs.hanMuc, hs.gioTra, hs.gioAnHan], [50_000_000, 36, 0]);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_credit_tier_default")[0].n, 1, "sửa số gợi ý = sửa dòng, không thêm dòng");
});

test("ADR-0172 tiêu chí 3, ADR-0173 Đ1 mục 2: hạn mức 50.000.000, nợ 45.000.000 — đơn 6.000.000 bị chặn, đơn 5.000.000 được; không có ngoại lệ theo đơn", async () => {
  const w = setup();
  assert.equal((await bat(w, SUPER, `pty-${PT}`, 50_000_000)).status, 201);
  assert.equal((await donTraSau(w, 45_000_000)).status, 200);
  const sau = await donTraSau(w, 6_000_000);
  assert.equal(sau.status, 409, sau.text);
  assert.match(sau.text, /vuot_han_muc/);
  assert.equal((await donTraSau(w, 5_000_000)).status, 200);
  assert.equal((await hoSo(w, `pty-${PT}`)).conDuocDung, 0);
});

test("ADR-0173 Đ3 mục 3, tiêu chí 7: đại lý xem đủ Trả sau của mình; đại lý A không xem được nợ của B bằng mọi đường", async () => {
  const w = setup();
  assert.equal((await bat(w, SUPER, `pty-${PT}`, 10_000_000, 36, 12)).status, 201);
  assert.equal((await bat(w, SUPER, `pty-${PT2}`, 20_000_000)).status, 201);
  const d = await donTraSau(w, 4_000_000);
  assert.equal(d.status, 200, d.text);
  const cua = (as: string, q = "") => w.call("GET", `/api/tra-sau/cua-toi${q}`, { as });
  const a = await cua(PT);
  assert.equal(a.status, 200, a.text);
  assert.deepEqual([a.json.coHanMuc, a.json.hanMuc, a.json.gioTra, a.json.gioAnHan, a.json.dangNo, a.json.conDuocDung], [true, 10_000_000, 36, 12, 4_000_000, 6_000_000]);
  assert.equal(a.json.don.length, 1);
  assert.deepEqual([a.json.don[0].orderId, a.json.don[0].no, a.json.don[0].trangThai], [d.id, 4_000_000, "trong_han"]);
  assert.match(a.json.don[0].hanTra, /T/, "kèm hạn trả có giờ");
  // B không thấy gì của A: tham số lạ bị bỏ qua, số là của B.
  const b = await cua(PT2, `?partyId=pty-${PT}&benDat=pty-${PT}`);
  assert.deepEqual([b.status, b.json.hanMuc, b.json.dangNo, b.json.don.length], [200, 20_000_000, 0, 0]);
  assert.doesNotMatch(b.text, new RegExp(d.id));
  // Đường văn phòng đều 403 với tài khoản Đối tác.
  for (const duong of ["/api/tra-sau/han-muc", `/api/tra-sau/han-muc/pty-${PT}`, `/api/tra-sau/han-muc/pty-${PT}/don`, "/api/tra-sau/goi-y"]) {
    assert.equal((await w.call("GET", duong, { as: PT2 })).status, 403, duong);
  }
  // Văn phòng không có mục «Trả sau của tôi».
  for (const as of [SALES, KT, ADMIN]) assert.equal((await cua(as)).status, 403, as);
});
