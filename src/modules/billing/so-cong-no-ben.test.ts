// Màn «Sổ công nợ theo đối tác» (P1 kế hoạch docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach-thi-cong.md; bản vẽ docs/design/so-cong-no-2026-10-25/ bản 2a):
// route chỉ ĐỌC `GET /api/ledger/ben/:partyId` — chi tiết một bên: từng đơn chia hai nhóm «đang giữ» / «công ty nợ», phép tính X − Y, số dư lấy từ view (cùng nguồn
// GET /api/ledger) và cờ LỆCH khi cộng các đơn ≠ số dư. Mọi phép tính ở máy chủ (trang chỉ định dạng). Ô quyền `ledger.view` không ngữ cảnh (Kế toán, Toàn quyền).
// Khung thử thật (tests/audit/harness.mjs); khuôn setup theo so-du-bang-tong-dong-no.test.ts. Tên người / hồ sơ là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { nhomDonCuaBen } from "./rules.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // đại lý A — vai TRAVEL_AGENCY, hoa hồng 10%
const NCC = "pty-ncc"; // i-resort — nhà cung cấp, tỷ lệ mua lại 80% (giá vốn)
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `97979797-9797-4979-8979-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function setup(): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-sb-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-sb-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
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
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-SB-${seq}`, o.owner ?? SALES, sub, o.giam ?? 0, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
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
  const xn = await w.xacNhanDon(id, String((w.sqlite.prepare("SELECT staff_id AS s FROM orders WHERE id = ?").get(id) as any).s)); // ADR-0135: người lập xác nhận
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

const ADMIN = "77777777-7777-4777-8777-777777777777";
const INTERN = "88888888-8888-4888-8888-888888888888";
const ben = (w: W, partyId: string, as = KT) => w.call("GET", `/api/ledger/ben/${encodeURIComponent(partyId)}`, { as });
const soCongNo = async (w: W) => (await w.call("GET", "/api/ledger", { as: KT })).json.soDu as { partyId: string; dangGiu: number }[];

/** Kịch bản dùng chung: đại lý A giữ hộ trên hai đơn (một đơn Đã giao có hoa hồng ⇒ công ty nợ phần hoa hồng), HDV giữ một khoản, quầy i-resort (giá vốn). */
async function kichBan() {
  const { w, ct } = await setup();
  for (const [id, phone, name, perms] of [[ADMIN, "0900000010", "Quản Trị", ["ADMIN"]], [INTERN, "0900000011", "Thực Tập", ["INTERN"]]] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  const a = await donXacNhan(w, { owner: PT });
  assert.equal((await thu(w, PT, a, mat(300_000, "toi"))).status, 201);
  const b = await donXacNhan(w, { owner: PT, booker: null, dichVu: [{ ...HT, donGia: 500_000 }] });
  assert.equal((await thu(w, HDV, b, mat(500_000, "toi"))).status, 201);
  assert.equal((await giao(w, b)).status, 200);
  const c = await donXacNhan(w, { owner: PT });
  assert.equal((await thu(w, HDV, c, mat(1_000_000, "toi"))).status, 201);
  assert.equal((await giao(w, c)).status, 200); // đại lý không thu ⇒ công ty nợ hoa hồng 100.000 trên đơn c
  const d = await donXacNhan(w, { owner: PT, dichVu: [IR] });
  assert.equal((await thu(w, KT, d, mat(600_000, { partyId: NCC }))).status, 201);
  assert.equal((await giao(w, d)).status, 200);
  return { w, ct, a, b, c, d };
}

test("chi tiết một bên: với MỌI bên ở GET /api/ledger, cộng các đơn = số dư, không lệch; X − Y = cộng các đơn; nhóm đúng dấu", async () => {
  const { w } = await kichBan();
  const ds = await soCongNo(w);
  const toan = (await w.call("GET", "/api/ledger", { as: KT })).json;
  assert.equal(toan.tongDangGiu, ds.filter((p) => p.dangGiu > 0).reduce((t, p) => t + p.dangGiu, 0), "ô tổng «đang giữ» tính ở máy chủ");
  assert.equal(toan.tongCongTyNo, ds.filter((p) => p.dangGiu < 0).reduce((t, p) => t - p.dangGiu, 0), "ô tổng «công ty nợ» tính ở máy chủ");
  assert.ok(toan.tongDangGiu > 0, "chống bài rỗng");
  assert.ok(ds.length >= 3, `chống bài rỗng: ${JSON.stringify(ds)}`);
  for (const p of ds) {
    const r = await ben(w, p.partyId);
    assert.equal(r.status, 200, r.text);
    const j = r.json;
    assert.equal(j.soDu, p.dangGiu, `${p.partyId}: số dư chi tiết = số dư ở danh sách`);
    assert.equal(j.dangGiu.tong, j.dangGiu.don.reduce((s: number, o: { soTien: number }) => s + o.soTien, 0));
    assert.equal(j.congTyNo.tong, j.congTyNo.don.reduce((s: number, o: { soTien: number }) => s + o.soTien, 0));
    assert.equal(j.congCacDon, j.dangGiu.tong - j.congTyNo.tong, "X − Y");
    assert.equal(j.lech, 0, `${p.partyId}: không lệch`);
    for (const o of [...j.dangGiu.don, ...j.congTyNo.don]) assert.ok(o.soTien > 0, "số tiền trong nhóm luôn dương (dấu nói bằng tên nhóm)");
  }
});

test("đại lý A: đơn a (giữ hộ 300.000) ở nhóm «đang giữ», đơn c (hoa hồng 100.000) và đơn d (hoa hồng 60.000) ở nhóm «công ty nợ»; số dư 140.000; đơn không gắn bên khác không lẫn vào", async () => {
  const { w, a, c, d } = await kichBan();
  const j = (await ben(w, `pty-${PT}`)).json;
  assert.deepEqual(j.dangGiu.don.map((o: { orderId: string; soTien: number }) => [o.orderId, o.soTien]), [[a, 300_000]]);
  assert.deepEqual(j.congTyNo.don.map((o: { orderId: string; soTien: number }) => [o.orderId, o.soTien]), [[c, 100_000], [d, 60_000]], "hoa hồng 10% đơn c (1.000.000) và đơn d (vé i-resort 600.000); số lớn trước");
  assert.deepEqual([j.dangGiu.tong, j.congTyNo.tong, j.congCacDon, j.soDu, j.lech], [300_000, 160_000, 140_000, 140_000, 0]);
  assert.equal(j.ten, "Đại Lý A");
  assert.match(j.dangGiu.don[0].maDon, /^TD-SB-/);
  assert.equal(j.dangGiu.don[0].trangThai, "Đã xác nhận", "nhãn tiếng Việt, không mã thô");
  assert.equal(j.congTyNo.don[0].trangThai, "Đã giao – đã thu đủ");
});

test("HDV: dòng mà bên kia KHÔNG phải công ty không được tính (chỉ dòng giữa bên và công ty — cùng bộ lọc với số dư)", async () => {
  const { w } = await kichBan();
  const j = (await ben(w, `pty-${HDV}`)).json;
  assert.equal(j.lech, 0);
  assert.equal(j.soDu, 1_500_000, "HDV giữ 500.000 (đơn b) + 1.000.000 (đơn c)");
  assert.equal(j.dangGiu.don.length, 2);
  assert.equal(j.congTyNo.don.length, 0);
});

test("đơn đã huỷ còn tiền giữ hộ ⇒ nhãn «Đã huỷ — cọc còn giữ», vẫn tính vào số dư", async () => {
  const { w, a } = await kichBan();
  const h = await w.call("POST", `/api/orders/${a}/status`, { as: SUPER, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(h.status, 200, h.text);
  const j = (await ben(w, `pty-${PT}`)).json;
  const o = j.dangGiu.don.find((x: { orderId: string }) => x.orderId === a);
  assert.ok(o, JSON.stringify(j));
  assert.equal(o.trangThai, "Đã huỷ — cọc còn giữ");
  assert.equal(o.daHuy, true);
  assert.ok([...j.dangGiu.don, ...j.congTyNo.don].filter((x: { orderId: string }) => x.orderId !== a).every((x: { daHuy: boolean }) => x.daHuy === false));
  assert.equal(j.soDu, 140_000);
  assert.equal(j.lech, 0);
});

test("đơn đã đảo hết (cộng = 0) KHÔNG hiện trong nhóm nào", async () => {
  const { w, a } = await kichBan();
  assert.equal((await daoLanThu(w, cuoi(w, a))).status, 201);
  const j = (await ben(w, `pty-${PT}`)).json;
  assert.ok(![...j.dangGiu.don, ...j.congTyNo.don].some((o: { orderId: string }) => o.orderId === a), "đơn số 0 bị ẩn");
  assert.deepEqual([j.soDu, j.lech], [-160_000, 0]);
  const toan = (await w.call("GET", "/api/ledger", { as: KT })).json;
  assert.ok(toan.tongCongTyNo >= 160_000, "ô tổng «công ty nợ» gồm 160.000 công ty nợ đại lý A");
  assert.equal(toan.tongCongTyNo, (toan.soDu as { dangGiu: number }[]).filter((p) => p.dangGiu < 0).reduce((t, p) => t - p.dangGiu, 0));
});

test("quyền: Kế toán, Toàn quyền 200; Bán hàng, HDV, Quản trị, Thực tập, Đối tác 403 (hoặc cổng chặn) — không lộ số", async () => {
  const { w } = await kichBan();
  for (const as of [KT, SUPER]) assert.equal((await ben(w, `pty-${PT}`, as)).status, 200);
  for (const as of [SALES, HDV, ADMIN, INTERN, PT]) {
    const r = await ben(w, `pty-${PT}`, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.doesNotMatch(r.text, /300000|140000|Đại Lý A/);
  }
});

test("bên không tồn tại / không có dòng ⇒ 404; mã bên dạng lạ ⇒ 404 (không chạm CSDL với chuỗi lạ)", async () => {
  const { w } = await kichBan();
  assert.equal((await ben(w, "pty-khong-co")).status, 404);
  assert.equal((await ben(w, "x".repeat(200))).status, 404);
  assert.equal((await ben(w, "a b;c")).status, 404);
});

test("luật thuần nhomDonCuaBen: dòng giữa bên và một bên THỨ BA (không phải công ty) bị bỏ; dòng đảo triệt tiêu; đơn cộng 0 bị bỏ; dòng không gắn đơn gom một mục; ngày gần nhất", () => {
  const CT = "pty-ct", P = "pty-p", K = "pty-khac";
  const l = (orderId: string | null, no: string, co: string, amount: number, ngay = "2026-10-01") => ({ orderId, maDon: orderId && `TD-${orderId}`, ngay, debtorPartyId: no, creditorPartyId: co, amount });
  const r = nhomDonCuaBen([
    l("o1", P, CT, 300_000), l("o1", P, K, 999_999), l("o1", K, P, 777_777), // dòng với bên thứ ba: không tính
    l("o2", CT, P, 100_000, "2026-10-05"), l("o2", CT, P, 20_000, "2026-10-09"),
    l("o3", P, CT, 50_000), l("o3", CT, P, 50_000), // đảo hết ⇒ bỏ
    l(null, P, CT, 10_000), l(null, P, CT, 5_000),
  ], P, CT);
  assert.deepEqual(r.dangGiu.map((d) => [d.orderId, d.soTien]), [["o1", 300_000], [null, 15_000]]);
  assert.deepEqual(r.congTyNo.map((d) => [d.orderId, d.soTien, d.ngayGanNhat]), [["o2", 120_000, "2026-10-09"]]);
  assert.deepEqual([r.x, r.y], [315_000, 120_000]);
});
