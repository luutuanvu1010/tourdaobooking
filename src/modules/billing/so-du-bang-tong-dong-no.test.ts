// Bất biến sổ công nợ (kiểm độc lập 24/10, docs/superpowers/specs/2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md mục 7.3):
// «số dư từng bên với công ty chủ mà Kế toán thấy (view v_bil_party_balance → balancesWithOwner → GET /api/ledger.soDu)
//  = tổng các dòng nợ chỉ-thêm của MỌI đơn, tính lại độc lập từ bil_debt_line».
// «Độc lập» = bài tự cộng từng dòng bằng vòng lặp riêng (KHÔNG gọi soDuTheoBen, KHÔNG đi qua view) rồi so với cả ba nơi đọc.
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs); khuôn setup / đơn / lần thu theo ben-kia.test.ts. Tên người / hồ sơ là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { balancesWithOwner } from "./repository.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // đại lý A — vai TRAVEL_AGENCY, hoa hồng 10%
const NCC = "pty-ncc"; // i-resort — nhà cung cấp, tỷ lệ mua lại 80% (giá vốn)
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `96969696-9696-4969-8969-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function setup(): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-sd-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-sd-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return { w, ct: String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id) };
}

interface DvNhap { ten: string; catalog: string | null; khach: number; donGia: number }
const HT = { ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 1_000_000 };
const IR = { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 };
function nhap(w: W, o: { owner?: string; booker?: string | null; dichVu?: DvNhap[]; giam?: number } = {}): string {
  const id = uuid();
  const dichVu = o.dichVu ?? [HT];
  const sub = dichVu.reduce((t, d) => t + d.khach * d.donGia, 0);
  const tong = sub - (o.giam ?? 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-SD-${seq}`, o.owner ?? SALES, sub, o.giam ?? 0, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
  dichVu.forEach((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, 'perPax', ?, ?)`).run(s, id, i, d.catalog, d.ten, d.khach, vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', ?, ?, ?, ?)`)
      .run(`${s}-i`, id, s, d.catalog, d.khach, d.donGia, d.donGia, d.khach * d.donGia);
  });
  return id;
}
async function donXacNhan(w: W, o: Parameters<typeof nhap>[1] = {}): Promise<string> {
  const id = nhap(w, o);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SUPER, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const mat = (soTien: number, nguoiThu: unknown) => ({ soTien, hinhThuc: "CASH", nguoiThu });
const giao = (w: W, id: string) => w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
const cuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const daoLanThu = (w: W, receiptId: string) => w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId, lyDo: "kiểm bất biến sổ" } });

interface Dong { id: string; no: string; co: string; so: number; dao: string | null; donId: string }
const docDong = (w: W): Dong[] => w.q("SELECT id, debtor_party_id AS no, creditor_party_id AS co, amount AS so, reverses_line_id AS dao, order_id AS donId FROM bil_debt_line ORDER BY rowid")
  .map((r: any) => ({ ...r }));

/** Cộng độc lập: dương = bên đó còn NỢ công ty; âm = công ty còn nợ bên đó. Không dùng soDuTheoBen, không dùng view. Số 0 bị bỏ (khuôn HAVING <> 0 của màn sổ). */
function tuCong(dong: readonly Dong[], ct: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of dong) {
    if (l.co === ct) out.set(l.no, (out.get(l.no) ?? 0) + l.so);
    if (l.no === ct) out.set(l.co, (out.get(l.co) ?? 0) - l.so);
  }
  for (const [k, v] of [...out]) if (v === 0) out.delete(k);
  return out;
}
const mapTu = (rows: readonly { party_id: string; balance: number }[]): Map<string, number> => new Map(rows.map((r) => [r.party_id, r.balance]));

/**
 * Bất biến chính. Trả về số dư độc lập để bài gọi còn khẳng định thêm số cụ thể.
 * (1) số dư = tổng dòng nợ (qua balancesWithOwner = view; qua route GET /api/ledger — màn Kế toán);
 * (2) chỉ-thêm: mọi dòng đảo trỏ đúng một dòng có thật, cùng đơn, cùng số, ngược chiều; mỗi dòng bị đảo tối đa một lần;
 * (3) phương trình cân: trên MỌI đơn, tổng số dư mọi bên (kể cả công ty) = 0 — mỗi dòng nợ cộng một lần, trừ một lần.
 */
async function kiemBatBien(w: W, ct: string, nhan: string): Promise<Map<string, number>> {
  const dong = docDong(w);
  const mong = tuCong(dong, ct);
  const view = mapTu(await balancesWithOwner(w.env.DB));
  assert.deepEqual([...view].sort(), [...mong].sort(), `${nhan}: balancesWithOwner (view) ≠ tổng dòng nợ tính độc lập`);
  const res = await w.call("GET", "/api/ledger", { as: KT });
  assert.equal(res.status, 200, res.text);
  const route = new Map<string, number>((res.json.soDu as { partyId: string; dangGiu: number }[]).map((r) => [r.partyId, r.dangGiu]));
  assert.deepEqual([...route].sort(), [...mong].sort(), `${nhan}: GET /api/ledger.soDu ≠ tổng dòng nợ tính độc lập`);
  const theoId = new Map(dong.map((l) => [l.id, l]));
  const daBiDao = new Set<string>();
  for (const l of dong) {
    assert.ok(l.so > 0, `${nhan}: dòng ${l.id} có số không dương`);
    if (l.dao === null) continue;
    const goc = theoId.get(l.dao);
    assert.ok(goc, `${nhan}: dòng đảo ${l.id} trỏ dòng không có thật`);
    assert.deepEqual([l.donId, l.no, l.co, l.so], [goc.donId, goc.co, goc.no, goc.so], `${nhan}: dòng đảo ${l.id} không là ảnh ngược đúng của dòng gốc`);
    assert.ok(!daBiDao.has(l.dao), `${nhan}: dòng ${l.dao} bị đảo hai lần`);
    daBiDao.add(l.dao);
  }
  for (const donId of new Set(dong.map((l) => l.donId))) {
    const rong = new Map<string, number>();
    for (const l of dong.filter((x) => x.donId === donId)) {
      rong.set(l.no, (rong.get(l.no) ?? 0) + l.so);
      rong.set(l.co, (rong.get(l.co) ?? 0) - l.so);
    }
    assert.equal([...rong.values()].reduce((a, b) => a + b, 0), 0, `${nhan}: đơn ${donId} không cân`);
  }
  return mong;
}

test("bất biến sổ: DB mới chưa có dòng nợ nào ⇒ mọi nơi đọc đều rỗng (chống bài rỗng ở các ca sau: chúng khẳng định số cụ thể ≠ 0)", async () => {
  const { w, ct } = await setup();
  const so = await kiemBatBien(w, ct, "trống");
  assert.equal(so.size, 0);
  assert.equal(docDong(w).length, 0);
});

test("bất biến sổ: đối tác giữ hộ + hoa hồng (đại lý thu 300.000 của đơn Hòn Tằm 1.000.000, hoa hồng 10%) — nhiều đơn của cùng một đối tác cộng dồn", async () => {
  const { w, ct } = await setup();
  const a = await donXacNhan(w, { owner: PT });
  const b = await donXacNhan(w, { owner: PT, dichVu: [{ ...HT, donGia: 500_000 }] });
  assert.equal((await thu(w, PT, a, mat(300_000, "toi"))).status, 201);
  assert.equal((await thu(w, PT, b, mat(500_000, "toi"))).status, 201);
  let so = await kiemBatBien(w, ct, "đại lý giữ hộ hai đơn");
  assert.equal(so.get(`pty-${PT}`), 800_000, "đại lý giữ hộ 300.000 + 500.000 (chưa Đã giao ⇒ chưa có hoa hồng)");
  assert.equal((await thu(w, HDV, a, mat(700_000, "toi"))).status, 201);
  assert.equal((await giao(w, a)).status, 200);
  so = await kiemBatBien(w, ct, "sau Đã giao đơn a");
  assert.equal(so.get(`pty-${PT}`), 800_000 - 100_000, "hoa hồng 10% của 1.000.000 = 100.000 công ty nợ đại lý");
  assert.equal(so.get(`pty-${HDV}`), 700_000, "HDV cầm 700.000 của công ty");
});

test("bất biến sổ: giá vốn nhà cung cấp (vé i-resort 600.000, mua lại 80%) + giảm giá bên đặt chịu — khách trả tại quầy", async () => {
  const { w, ct } = await setup();
  const id = await donXacNhan(w, { owner: PT, dichVu: [IR], giam: 20_000 });
  assert.equal((await thu(w, KT, id, mat(580_000, { partyId: NCC }))).status, 201);
  await kiemBatBien(w, ct, "quầy nhận trước Đã giao");
  assert.equal((await giao(w, id)).status, 200);
  const so = await kiemBatBien(w, ct, "sau Đã giao đơn i-resort");
  assert.ok(so.size > 0, "có dòng nợ thật");
  assert.ok(so.has(NCC) && so.has(`pty-${PT}`), "nhà cung cấp và đại lý đều có số dư");
});

test("bất biến sổ: đơn trộn Hòn Tằm + i-resort giảm 60.000 (tối đa bằng hoa hồng) — nhiều bên cùng một đơn", async () => {
  const { w, ct } = await setup();
  const id = await donXacNhan(w, { owner: PT, dichVu: [{ ...HT, donGia: 100_000 }, IR], giam: 60_000 });
  assert.equal((await thu(w, PT, id, mat(100_000, "toi"))).status, 201);
  assert.equal((await thu(w, HDV, id, mat(540_000, "toi"))).status, 201);
  await kiemBatBien(w, ct, "đơn trộn trước giao");
  assert.equal((await giao(w, id)).status, 200);
  const so = await kiemBatBien(w, ct, "đơn trộn sau giao");
  assert.ok(so.size >= 2);
});

test("bất biến sổ: đảo lần thu (trước Đã giao) và thay lần thu (sau Đã giao) — dòng đảo triệt tiêu đúng dòng gốc, số dư vẫn bằng tổng dòng", async () => {
  const { w, ct } = await setup();
  const a = await donXacNhan(w, { owner: PT });
  assert.equal((await thu(w, PT, a, mat(300_000, "toi"))).status, 201);
  const r = cuoi(w, a);
  assert.equal((await kiemBatBien(w, ct, "trước đảo")).get(`pty-${PT}`), 300_000);
  assert.equal((await daoLanThu(w, r)).status, 201);
  const sau = await kiemBatBien(w, ct, "sau đảo");
  assert.equal(sau.get(`pty-${PT}`) ?? 0, 0, "đảo xong đại lý hết giữ hộ");
  assert.equal(docDong(w).filter((l) => l.dao !== null).length, 1, "có đúng một dòng đảo (chống bài rỗng)");
  const b = await donXacNhan(w, { owner: PT });
  assert.equal((await thu(w, PT, b, mat(400_000, "toi"))).status, 201);
  assert.equal((await thu(w, HDV, b, mat(600_000, "toi"))).status, 201);
  assert.equal((await giao(w, b)).status, 200);
  const rb = cuoi(w, b);
  const t = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: b, cu: [rb], moi: [mat(600_000, { partyId: `pty-${PT}` })], lyDo: "kiểm bất biến sổ" } });
  assert.equal(t.status, 201, t.text); // «Thay lần thu» sau Đã giao = đảo lần thu cũ + ghi lần thu mới
  await kiemBatBien(w, ct, "thay lần thu sau Đã giao");
});

test("bất biến sổ: đơn bị huỷ có tiền đang giữ hộ — số dư vẫn bằng tổng dòng nợ (không dòng mồ côi sau huỷ)", async () => {
  const { w, ct } = await setup();
  const id = await donXacNhan(w, { owner: PT });
  assert.equal((await thu(w, PT, id, mat(300_000, "toi"))).status, 201);
  await kiemBatBien(w, ct, "trước huỷ");
  const h = await w.call("POST", `/api/orders/${id}/status`, { as: SUPER, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(h.status, 200, h.text); // luật hiện hành: huỷ được, tiền giữ hộ ở lại sổ (nếu luật đổi thành 409 thì bài đỏ để người sửa chọn lại ca)
  const so = await kiemBatBien(w, ct, "sau huỷ");
  assert.equal(so.get(`pty-${PT}`), 300_000, "đại lý vẫn giữ hộ 300.000 trên đơn đã huỷ");
});
