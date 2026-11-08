// ADR-0178 Đ1 mục 2 (Task A3): đơn mang dấu «Khách của đối tác trả cho Công ty» = Tắt (0) — người thu của mọi khoản khách trả mới chỉ được là hồ sơ người lập đơn.
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs: SQLite với đủ migration; lô `db.batch()` là một giao dịch như D1). Tên, SĐT là GIẢ.
// Đơn dựng bằng SQL mang thẳng dấu (cột chỉ khoá ở UPDATE); đường chụp dấu lúc lập có bài riêng (src/modules/orders, Task A1) và bài Review Focus 1 ở cuối tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";
import { svc, inDays } from "../../../tests/audit/xac-nhan-khung.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const PT = "66666666-6666-4666-8666-666666666666"; // tài khoản Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY
const NCC = "pty-ncc";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `97979797-9797-4979-8979-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(tuyChon: Record<string, unknown> = {}): W {
  const w = world(tuyChon);
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-kt-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, 1, 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB1', 'Tour thường', 'perPax', 300000, 1, '2026-01-01', '2026-01-01')`);
  return w;
}
async function ganNcc(w: W) {
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
}

/** Đơn NHÁP bằng SQL (một dịch vụ IRESORT 1.000.000, ngày đi hôm nay) rồi xác nhận qua route của người lập; HDV phụ trách. `dau` = dấu kênh thu (null = không dấu). */
async function don(w: W, o: { owner?: string; booker?: string | null; dau?: 0 | 1 | null; tong?: number; xacNhan?: boolean } = {}): Promise<string> {
  const id = uuid();
  const owner = o.owner ?? PT;
  const tong = o.tong ?? 1_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, company_collects_snapshot, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-KT-${seq}`, owner, tong, tong, tong, o.booker === undefined ? `pty-${owner}` : o.booker, o.dau === undefined ? 0 : o.dau, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'IRESORT', 'Vé tắm bùn', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'IRESORT', 'adult', 'Người lớn', 1, ?, ?, ?)`)
    .run(`${id}-i`, id, `${id}-s`, tong, tong, tong);
  if (o.xacNhan !== false) {
    // ADR-0185: đơn của Đối tác cho khách lẻ (không người hưởng) không xác nhận được nữa, chỉ còn là dữ liệu cũ ⇒ Bán hàng xác nhận thay rồi trả người lập (`xacNhanDonCu`).
    const xn = o.booker === null && owner === PT ? await w.xacNhanDonCu(id, owner, SALES) : await w.xacNhanDon(id, owner);
    assert.equal(xn.status, 200, xn.text);
  }
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, nguoiThu: unknown, soTien = 100_000, them: Record<string, unknown> = {}) =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu, ...them } });
const ma = (r: { json: any }) => r.json?.error?.code;
const soKhoan = (w: W, id: string) => Number(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id)[0].n);
const lanThuId = (w: W, id: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL AND kind_code = 'CUSTOMER_PAYMENT' ORDER BY rowid DESC LIMIT 1", id)[0].id);
const CHI_NGUOI_LAP = "Đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn. Công ty không nhận tiền khách của đơn này.";
function chan(r: { status: number; text: string; json: any }, maLoi = "kenh_thu_chi_nguoi_lap") {
  assert.deepEqual([r.status, ma(r)], [409, maLoi], r.text);
}

test("ghi khoản thu trước «Khách đã trả đủ»: Công ty, quầy nhà cung cấp, nhân viên khác, hướng dẫn viên ⇒ 409; Đối tác «Tôi thu» ⇒ 201", async () => {
  const w = setup();
  await ganNcc(w);
  const id = await don(w);
  const truoc = soKhoan(w, id);
  const c = await thu(w, KT, id, "cong_ty");
  chan(c);
  assert.equal(c.json.error.message, CHI_NGUOI_LAP);
  chan(await thu(w, KT, id, { nhaCungCapPartyId: NCC }));
  chan(await thu(w, KT, id, { partyId: NCC }));
  chan(await thu(w, KT, id, { partyId: `pty-${SALES}` }));
  chan(await thu(w, HDV, id, "toi"));
  chan(await thu(w, PT, id, "cong_ty"));
  assert.equal(soKhoan(w, id), truoc, "không khoản nào lọt");
  const ok = await thu(w, PT, id, "toi");
  assert.equal(ok.status, 201, ok.text);
  const r = w.q("SELECT collector_party_id AS p, collector_role_code AS v FROM bil_payment_receipt WHERE id = ?", lanThuId(w, id))[0];
  assert.deepEqual([r.p, r.v], [`pty-${PT}`, "BOOKER"], "vai giữ như hôm nay: hồ sơ người lập là bên đặt ⇒ BOOKER");
  // Kế toán ghi thay đúng người lập: qua.
  assert.equal((await thu(w, KT, id, { partyId: `pty-${PT}` }, 120_000)).status, 201);
});

test("bên đặt là khách lẻ: Đối tác «Tôi thu» ⇒ 201 vai STAFF; Công ty ⇒ 409", async () => {
  const w = setup();
  const id = await don(w, { booker: null });
  chan(await thu(w, KT, id, "cong_ty"));
  const ok = await thu(w, PT, id, "toi");
  assert.equal(ok.status, 201, ok.text);
  assert.equal(w.q("SELECT collector_role_code AS v FROM bil_payment_receipt WHERE id = ?", lanThuId(w, id))[0].v, "STAFF");
});

test("Review Focus 2: văn phòng đổi bên đặt sau xác nhận, Đối tác «Tôi thu» vẫn 201; bất biến không đỏ", async () => {
  const w = setup();
  const id = await don(w);
  const d = (await w.call("GET", `/api/orders/${id}`, { as: SUPER })).json.order;
  const doi = await w.call("PUT", `/api/orders/${id}/booker`, { as: SUPER, body: { customerName: "Khách Giả", customerPhone: "0900000099", bookerPartyId: null, expectedUpdatedAt: d.updatedAt } });
  assert.equal(doi.status, 200, doi.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, null);
  // Khung thử dựng đơn bằng SQL nên vài bất biến không liên quan tiền đã đỏ sẵn (vd bản chụp, danh mục): so TRƯỚC / SAU lần ghi — không bất biến nào đỏ thêm.
  const viPham = () => (CHECKS as any[]).map((c) => [c.code, demViPham(c, w.q(c.sql.replace(/\s+/g, " ").trim()).map((r: any) => ({ ...r })))] as const).filter(([, n]) => n > 0);
  const truoc = viPham();
  assert.ok(!truoc.some(([c]) => String(c).startsWith("R-BIL")), JSON.stringify(truoc));
  const ok = await thu(w, PT, id, "toi");
  assert.equal(ok.status, 201, ok.text);
  chan(await thu(w, KT, id, "cong_ty", 110_000));
  assert.deepEqual(viPham(), truoc, "không bất biến nào đỏ thêm");
});

test("/delivered kèm khoản thu Công ty ⇒ 409, đơn không sang «Khách đã trả đủ», không khoản thu", async () => {
  const w = setup();
  const id = await don(w);
  const truoc = soKhoan(w, id);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: { lanThu: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } } });
  chan(g);
  assert.equal(w.q("SELECT delivered_at AS d FROM orders WHERE id = ?", id)[0].d, null);
  assert.equal(soKhoan(w, id), truoc);
  const tq = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUPER, body: { lanThu: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` } } } });
  chan(tq);
  assert.equal(w.q("SELECT delivered_at AS d FROM orders WHERE id = ?", id)[0].d, null);
});

test("Sửa khoản thu đã ghi: khoản thay sang Công ty ⇒ 409; thay đúng người lập ⇒ 201; đảo khoản thu (miễn) ⇒ chạy", async () => {
  const w = setup();
  const id = await don(w);
  assert.equal((await thu(w, PT, id, "toi", 200_000)).status, 201);
  const cu = lanThuId(w, id);
  const sai = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [cu], moi: [{ soTien: 200_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Ghi nhầm người thu tiền" } });
  chan(sai);
  const dung = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [cu], moi: [{ soTien: 150_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${PT}` } }], lyDo: "Ghi nhầm số tiền thu" } });
  assert.equal(dung.status, 201, dung.text);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: lanThuId(w, id), lyDo: "ghi nhầm người thu" } });
  assert.ok(dao.status === 200 || dao.status === 201, dao.text);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NOT NULL", id)[0].n), 2, "hai dòng đảo (lô thay + lệnh đảo)");
});

test("Khoản hoàn cho khách (miễn) ⇒ vẫn chạy ở đơn dấu Tắt", async () => {
  const w = setup();
  const id = await don(w);
  assert.equal((await thu(w, PT, id, "toi", 300_000)).status, 201);
  const h = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: { partyId: `pty-${PT}` } } });
  assert.equal(h.status, 201, h.text);
});

test("phân định «Ghi khoản thu đòi được» ở đơn dấu Tắt ⇒ 409 (đi qua cùng cổng của lô Thay)", async () => {
  const w = setup();
  // Đơn dấu Tắt, khách lẻ (không cần mức hoa hồng để giao): Đối tác thu đủ, giao, phân định giảm trừ, rồi Kế toán «Ghi khoản thu đòi được» người thu Công ty.
  const id = await don(w, { booker: null });
  assert.equal((await thu(w, PT, id, "toi", 1_000_000)).status, 201);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(g.status, 200, g.text);
  const q = await w.call("POST", "/api/ledger/phan-dinh", { as: KT, body: { orderId: id, soTien: 300_000, lyDo: "Khách phản ánh HDV quên đón" } });
  assert.equal(q.status, 201, q.text);
  const r = await w.call("POST", `/api/ledger/phan-dinh/${q.json.id}/quyet`, { as: ADM, body: { lyDo: "Đã nghe hai bên, HDV nhận lỗi", soTien: 300_000, truongHop: "T4", benChiuPartyId: `pty-${HDV}`, coTienRa: false } });
  assert.equal(r.status, 201, r.text);
  const gh = await w.call("POST", `/api/ledger/phan-dinh/${r.json.id}/ghi`, { as: KT, body: { thay: { cu: [lanThuId(w, id)], moi: [{ soTien: 700_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${PT}` } }], lyDo: "Khách thật sự chỉ trả 700.000" } } });
  assert.equal(gh.status, 201, gh.text);
  const goc = String(w.q("SELECT id FROM bil_attribution WHERE order_id = ? AND step_code = 'POSTED'", id)[0].id);
  const truoc = soKhoan(w, id);
  const doi = await w.call("POST", `/api/ledger/phan-dinh/${goc}/huy`, { as: KT, body: { soTien: 100_000, lyDo: "Đòi được khách số tiền này", moi: [{ soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }] } });
  chan(doi);
  assert.equal(soKhoan(w, id), truoc);
});

/** Đơn nguồn đã huỷ còn giữ 200.000 do `nguoiGiu` thu, có khoản duyệt chuyển sang đơn `donNhan`. */
async function nguonHuy(w: W, owner: string, donNhan: string, loai: "chuyen" | "hoan" = "chuyen"): Promise<{ cu: string; duyetId: string }> {
  const cu = await don(w, { owner, dau: null, booker: null });
  assert.equal((await thu(w, owner, cu, "toi", 200_000)).status, 201);
  const d0 = (await w.call("GET", `/api/orders/${cu}`, { as: owner })).json.order;
  const h = await w.call("POST", `/api/orders/${cu}/status`, { as: owner, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: d0.updatedAt } });
  assert.equal(h.status, 200, h.text);
  const maNhan = loai === "chuyen" ? String(w.q("SELECT order_code AS c FROM orders WHERE id = ?", donNhan)[0].c) : undefined;
  const d = await w.call("POST", `/api/orders/${cu}/coc/duyet`, { as: ADM, body: { loai, soTien: 200_000, lyDo: "Lập lại đơn cho khách", ...(maNhan ? { donNhan: maNhan } : {}) } });
  assert.ok(d.status === 200 || d.status === 201, d.text);
  return { cu, duyetId: d.json.duyetId };
}

test("/coc/chuyen vào đơn dấu Tắt: người giữ khác người lập đơn nhận ⇒ 409; người giữ là người lập ⇒ qua; /coc/chi (miễn) ⇒ chạy", async () => {
  const w = setup();
  const nhan = await don(w);
  const a = await nguonHuy(w, SALES, nhan);
  const sai = await w.call("POST", `/api/orders/${a.cu}/coc/chuyen`, { as: KT, body: { duyetId: a.duyetId, soTien: 200_000, ngayPhatSinh: vnHomNay(), nguoiGiu: { partyId: `pty-${SALES}` } } });
  chan(sai);
  const congTy = await w.call("POST", `/api/orders/${a.cu}/coc/chuyen`, { as: KT, body: { duyetId: a.duyetId, soTien: 200_000, ngayPhatSinh: vnHomNay(), nguoiGiu: "cong_ty" } });
  assert.equal(congTy.status, 409, congTy.text);
  assert.equal(soKhoan(w, nhan), 0);
  const nhan2 = await don(w);
  const b = await nguonHuy(w, PT, nhan2);
  const dung = await w.call("POST", `/api/orders/${b.cu}/coc/chuyen`, { as: KT, body: { duyetId: b.duyetId, soTien: 200_000, ngayPhatSinh: vnHomNay(), nguoiGiu: { partyId: `pty-${PT}` } } });
  assert.ok(dung.status === 200 || dung.status === 201, dung.text);
  // Chi hoàn cọc ở đơn huỷ dấu Tắt (tiền ra) ⇒ không xét người thu.
  const cuTat = await don(w);
  assert.equal((await thu(w, PT, cuTat, "toi", 200_000)).status, 201);
  const d0 = (await w.call("GET", `/api/orders/${cuTat}`, { as: PT })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${cuTat}/status`, { as: PT, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: d0.updatedAt } })).status, 200);
  const dh = await w.call("POST", `/api/orders/${cuTat}/coc/duyet`, { as: ADM, body: { loai: "hoan", soTien: 200_000, lyDo: "Hoàn tiền cho khách" } });
  assert.ok(dh.status === 200 || dh.status === 201, dh.text);
  const chi = await w.call("POST", `/api/orders/${cuTat}/coc/chi`, { as: KT, body: { duyetId: dh.json.duyetId, soTien: 200_000, hinhThuc: "CASH", nguoiTra: { partyId: `pty-${PT}` }, ngayPhatSinh: vnHomNay() } });
  assert.ok(chi.status === 200 || chi.status === 201, chi.text);
});

test("xác nhận đơn có khai cọc khi người lập chưa gắn hồ sơ ⇒ 409, đơn chưa xác nhận, không khoản thu; có hồ sơ ⇒ khoản cọc trên người lập", async () => {
  const w = setup({ kenhThuGia: async () => 0 });
  const lap = await w.call("POST", "/api/orders", { as: PT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], declaredDeposit: 200_000 } });
  assert.equal(lap.status, 201, lap.text);
  const id = lap.json.order.id;
  assert.equal(w.q("SELECT company_collects_snapshot AS d FROM orders WHERE id = ?", id)[0].d, 0);
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(PT);
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PT, body: {} });
  assert.equal(g.status, 409, g.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(soKhoan(w, id), 0);
  w.sqlite.prepare("UPDATE staff SET party_id = ? WHERE id = ?").run(`pty-${PT}`, PT);
  const g2 = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PT, body: {} });
  assert.equal(g2.status, 200, g2.text);
  assert.equal(w.q("SELECT collector_party_id AS p FROM bil_payment_receipt WHERE order_id = ?", id)[0].p, `pty-${PT}`);
});

test("QR thanh toán: đơn dấu Tắt ⇒ { coQr: false }; đơn dấu Bật và đơn không dấu giữ như hôm nay", async () => {
  const w = setup();
  const tat = await don(w);
  const r = await w.call("GET", `/api/orders/${tat}/qr-thanh-toan`, { as: PT });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { coQr: false });
  for (const dau of [1, null] as const) {
    const id = await don(w, { dau });
    const q = await w.call("GET", `/api/orders/${id}/qr-thanh-toan`, { as: PT });
    assert.deepEqual([q.status, ma(q)], [409, "bank_account_missing"], q.text); // chưa cài tài khoản nhận tiền: như hôm nay
  }
});

test("đơn dấu Bật và đơn không dấu: Công ty thu, nhân viên khác thu đều qua như hôm nay", async () => {
  const w = setup();
  for (const [owner, dau] of [[PT, 1], [SALES, null], [PT, null]] as const) {
    const id = await don(w, { owner, dau, booker: null });
    assert.equal((await thu(w, KT, id, "cong_ty", 100_000)).status, 201, `${owner} ${dau}`);
    assert.equal((await thu(w, KT, id, { partyId: `pty-${HDV}` }, 110_000)).status, 201);
    assert.equal((await thu(w, HDV, id, "toi", 120_000)).status, 201);
  }
});

test("lớp CSDL: chèn thẳng khoản thu Công ty vào đơn dấu Tắt ⇒ trigger partner_channel_collector; người lập chưa hồ sơ ⇒ mọi khoản bị chặn; đảo và hoàn miễn", async () => {
  const w = setup();
  const id = await don(w);
  assert.equal((await thu(w, PT, id, "toi")).status, 201);
  // Đảo khoản (reverses_id ≠ NULL) miễn — chép đúng người thu gốc qua đường đảo thường.
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: lanThuId(w, id), lyDo: "ghi nhầm số tiền" } });
  assert.ok(dao.status === 200 || dao.status === 201, dao.text);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const chen = (kind: string, collector: string | null, reverses: string | null = null) => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 100000, ?, 'COMPANY', 'CASH', ?, 'PREPAID', ?, ?, NULL, ?, ?, ?, ?)`).run(uuid(), id, kind, collector, ct, vnHomNay(), reverses, AT, KT, AT, KT);
  assert.throws(() => chen("CUSTOMER_PAYMENT", ct), /partner_channel_collector:/);
  assert.throws(() => chen("CUSTOMER_PAYMENT", null), /partner_channel_collector:/);
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(PT);
  assert.throws(() => chen("CUSTOMER_PAYMENT", `pty-${PT}`), /partner_channel_collector:/, "người lập chưa hồ sơ ⇒ mọi khoản bị chặn");
  w.sqlite.prepare("UPDATE staff SET party_id = ? WHERE id = ?").run(`pty-${PT}`, PT);
  chen("CUSTOMER_PAYMENT", `pty-${PT}`); // đúng người lập: qua
  chen("CUSTOMER_REFUND", ct); // tiền ra, người trả Công ty: miễn
});

test("Review Focus 1: nháp của Đối tác tạo lúc Bật, công tắc đổi Tắt, rồi gửi đơn thật ⇒ dấu vẫn 1, Công ty thu được", async () => {
  let v: 0 | 1 = 1;
  const w = setup({ kenhThuGia: async () => v });
  const lap = await w.call("POST", "/api/orders", { as: PT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))] } });
  assert.equal(lap.status, 201, lap.text);
  const id = lap.json.order.id;
  v = 0;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: PT, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.equal(w.q("SELECT status, company_collects_snapshot AS d FROM orders WHERE id = ?", id)[0].d, 1);
  assert.equal((await thu(w, KT, id, "cong_ty")).status, 201);
});
