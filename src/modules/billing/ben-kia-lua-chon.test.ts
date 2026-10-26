// Sổ đại lý đợt 2, Task 12 — `OrderPaymentsResponse.benKia`: hai lựa chọn người thu tiền mới của form «Ghi khoản thu» (khách trả cho đại lý / tại quầy nhà cung cấp).
// Máy chủ tính bằng CÙNG `benDatHuong` / `nhaCungCapCuaDon` của lệnh ghi (giao diện không tự suy); null với tài khoản giữ quyền Đối tác (kể cả lai — không tên nhà cung cấp,
// ADR-0081 điều 4, Ruling R-91, R-P12), đơn nháp, đơn khách lẻ không có quầy nhà cung cấp. Bài nối: giá trị DTO gửi lại nguyên văn thì lệnh ghi nhận (201).
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs). Tên người / hồ sơ ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const LAI = "55555555-5555-4555-8555-555555555555"; // Bán hàng + Đối tác
const PT = "66666666-6666-4666-8666-666666666666"; // Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY («Đại Lý A»)
const NCC = "pty-ncc";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `96969696-9696-4969-8969-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function setup(): Promise<W> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [LAI, "0900000006", "Lai Bán", ["SALES", "PARTNER"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-lc-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-lc-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return w;
}

/** Đơn NHÁP bằng SQL: dòng tour + dòng i-resort; `booker` mặc định = đại lý A. */
function nhap(w: W, o: { owner?: string; booker?: string | null; iresort?: boolean } = {}): string {
  const id = uuid();
  const dv = [{ ten: "Tour đảo", catalog: "HONTAM" }, ...(o.iresort === false ? [] : [{ ten: "Vé tắm bùn i-resort", catalog: "IRESORT" }])];
  const sub = dv.length * 300_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, 0, ?, ?, ?, ?, ?)`).run(id, `TD-LC-${seq}`, o.owner ?? SALES, sub, sub, sub, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
  dv.forEach((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, 'perPax', 1, ?)`).run(s, id, i, d.catalog, d.ten, vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', 1, 300000, 300000, 300000)`)
      .run(`${s}-i`, id, s, d.catalog);
  });
  return id;
}
async function xacNhan(w: W, id: string): Promise<void> {
  const xn = await w.xacNhanDon(id, String((w.sqlite.prepare("SELECT staff_id AS s FROM orders WHERE id = ?").get(id) as any).s)); // ADR-0135: người lập xác nhận
  assert.equal(xn.status, 200, xn.text);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
}
const tien = async (w: W, id: string, as: string) => {
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as });
  assert.equal(r.status, 200, r.text);
  return r;
};

test("Task 12: HDV / Kế toán trên đơn đại lý có quầy nhà cung cấp ⇒ benKia nêu đại lý và quầy; gửi lại nguyên giá trị DTO thì lệnh ghi nhận (201)", async () => {
  const w = await setup();
  const id = nhap(w);
  await xacNhan(w, id);
  for (const as of [HDV, KT, SUPER]) {
    const t = (await tien(w, id, as)).json;
    assert.deepEqual(t.benKia, { benDat: { ten: "Đại Lý A" }, nhaCungCap: [{ partyId: NCC, ten: "i-resort" }] }, as);
  }
  const t = (await tien(w, id, HDV)).json;
  const a = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "ben_dat" } });
  assert.equal(a.status, 201, a.text);
  const b = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: { nhaCungCapPartyId: t.benKia.nhaCungCap[0].partyId } } });
  assert.equal(b.status, 201, b.text);
  const c = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "toi", thuChoNhaCungCapPartyId: t.benKia.nhaCungCap[0].partyId } });
  assert.equal(c.status, 201, c.text);
  // Phần i-resort 300.000: đã 100.000 tại quầy + 100.000 «thu cho» ⇒ còn 100.000; 150.000 vượt trần ⇒ 400 (id đúng hồ sơ, chỉ số vượt).
  const d = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 150_000, hinhThuc: "CASH", nguoiThu: "toi", thuChoNhaCungCapPartyId: t.benKia.nhaCungCap[0].partyId } });
  assert.equal(d.status, 400, d.text);
  assert.match(d.text, /phần còn chưa thu cho nhà cung cấp/);
});

test("Task 12: đơn khách lẻ — có quầy nhà cung cấp ⇒ chỉ quầy (không đại lý); không có quầy ⇒ null; đơn nháp ⇒ null", async () => {
  const w = await setup();
  const kl = nhap(w, { booker: null });
  await xacNhan(w, kl);
  assert.deepEqual((await tien(w, kl, HDV)).json.benKia, { benDat: null, nhaCungCap: [{ partyId: NCC, ten: "i-resort" }] });
  const kl2 = nhap(w, { booker: null, iresort: false });
  await xacNhan(w, kl2);
  assert.equal((await tien(w, kl2, HDV)).json.benKia, null);
  const nh = nhap(w);
  assert.equal((await tien(w, nh, SALES)).json.benKia, null, "đơn nháp: máy chủ từ chối hai lựa chọn mới");
});

test("Task 12: tài khoản giữ quyền Đối tác (thuần, và lai Bán hàng + Đối tác) ⇒ benKia null; JSON không có tên nhà cung cấp", async () => {
  const w = await setup();
  for (const as of [PT, LAI]) {
    const id = nhap(w, { owner: as });
    await xacNhan(w, id);
    const r = await tien(w, id, as);
    assert.equal(r.json.benKia, null, as);
    assert.ok(!r.text.includes("i-resort"), `${as}: JSON có tên nhà cung cấp`);
    assert.ok(!r.text.includes(NCC), `${as}: JSON có mã hồ sơ nhà cung cấp`);
  }
});

test("Task 12: đơn đã giao ⇒ benKia null (form ghi khoản thu không còn)", async () => {
  const w = await setup();
  const id = nhap(w, { iresort: false });
  await xacNhan(w, id);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: { lanThu: { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "toi" } } });
  assert.equal(g.status, 200, g.text);
  assert.equal((await tien(w, id, KT)).json.benKia, null);
});
