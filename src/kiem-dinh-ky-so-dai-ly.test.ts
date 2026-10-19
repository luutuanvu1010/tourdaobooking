// Sổ đại lý đợt 2, Task 10 — kiểm định kỳ của phần thương mại (scripts/audit-checks.mjs; ADR-0079 «Bất biến», điều 7a, 9; ADR-0078 R-BIL-5, R-BIL-12; đặc tả
// docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md P9; ghi chú điều phối Task 10). Dữ liệu SẠCH do CHÍNH ứng dụng ghi (tests/audit/harness.mjs: cả Worker trên
// SQLite đủ migration — mốc `bil_audit_cutoff` / `ord_audit_cutoff` của 0112 = lúc dựng khung, nên mọi thứ route ghi đều «sau mốc»); dữ liệu VI PHẠM dựng bằng SQL tay
// sau khi gỡ đúng trigger chặn nó (kiểm định kỳ là lưới cho SQL chạy tay / trigger bị gỡ). «Trước mốc» = lùi `created_at` / `confirmed_at` về trước lúc áp 0112.
// Mỗi kiểm: ca vi phạm cố ý + ca sạch; đếm bằng `demViPham` — CÙNG hàm script audit-invariants.mjs dùng. Tên người / hồ sơ ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { chenPhieuDieuChinh } from "../tests/audit/dieu-chinh-lib.mjs";

interface Check { code: string; what: string; sql: string; level: string; mode?: string }
const AC = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as {
  CHECKS: Check[]; GHI_CHU: { code: string; text: string }[]; demViPham: (c: Check, rows: unknown[]) => number;
};
const one = (code: string): Check => {
  const c = AC.CHECKS.filter((x) => x.code === code);
  assert.equal(c.length, 1, `phải có đúng một kiểm ${code}`);
  return c[0]!;
};

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // tài khoản Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY (đại lý A, mức 10%)
const NCC = "pty-kd-ncc"; // i-resort — hồ sơ tổ chức, vai SUPPLIER, Tour Đảo mua lại 80%
const AT = "2026-10-01T00:00:00.000Z"; // trước mốc 0112 (mốc = lúc dựng khung)
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `97979797-9797-4979-8979-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

/** Số vi phạm của kiểm `code` trên CSDL của khung — đúng cách scripts/audit-invariants.mjs đọc (câu gộp khoảng trắng, `demViPham`). */
const vp = (w: W, code: string): number => {
  const c = one(code);
  return AC.demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all());
};
const MOI = ["R-BIL-2", "R-BIL-2w", "R-BIL-5", "R-BIL-5w", "R-BIL-12", "R-BIL-16", "R-BIL-17", "R-BIL-18", "R-BIL-19", "R-BIL-19w", "R-BIL-S9", "R-ORD-DC1", "R-ORD-DC1w"];
const tatCaMoi = (w: W) => Object.fromEntries(MOI.map((c) => [c, vp(w, c)]));
const KHONG = Object.fromEntries(MOI.map((c) => [c, 0]));
/** Gỡ MỌI trigger trên `bang` (chỉ trong khung thử) để SQL tay đi qua — đúng loại dữ liệu mà kiểm định kỳ phải bắt. */
const goTrigger = (w: W, ...bang: string[]) => {
  for (const b of bang) for (const r of w.q("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?", b)) w.sqlite.exec(`DROP TRIGGER "${String(r.name)}"`);
};

async function setup(): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-kd-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-kd-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return { w, ct: String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id) };
}

interface DvNhap { ten: string; catalog: string | null; khach: number; donGia: number }
const HONTAM = (khach: number, donGia: number): DvNhap => ({ ten: "Vé Hòn Tằm", catalog: "HONTAM", khach, donGia });
const IRESORT = (khach: number): DvNhap => ({ ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach, donGia: 300_000 });
/** Đơn NHÁP bằng SQL (ngày đi = hôm nay); `booker` mặc định = đại lý A (null = khách lẻ). */
function nhap(w: W, o: { booker?: string | null; dichVu?: DvNhap[]; giam?: number } = {}): { id: string; svc: string[] } {
  const id = uuid();
  const dichVu = o.dichVu ?? [HONTAM(1, 5_000_000)];
  const sub = dichVu.reduce((t, d) => t + d.khach * d.donGia, 0);
  const tong = sub - (o.giam ?? 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-KD-${seq}`, SALES, sub, o.giam ?? 0, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
  const svc = dichVu.map((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, 'perPax', ?, ?)").run(s, id, i, d.catalog, d.ten, d.khach, vnHomNay());
    w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', ?, ?, ?, ?)")
      .run(`${s}-i`, id, s, d.catalog, d.khach, d.donGia, d.donGia, d.khach * d.donGia);
    return s;
  });
  return { id, svc };
}
async function xacNhan(w: W, id: string): Promise<void> {
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SUPER, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
}
const phaiThu = async (w: W, id: string): Promise<number> => {
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as: KT });
  assert.equal(r.status, 200, r.text);
  return Number(r.json.phaiThu);
};
/** Công ty thu đủ phải thu (Toàn quyền ghi — không lời khai) rồi «Đã giao». */
async function giaoDu(w: W, id: string): Promise<void> {
  const so = await phaiThu(w, id);
  if (so > 0) {
    const t = await w.call("POST", `/api/orders/${id}/payments`, { as: SUPER, body: { soTien: so, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
    assert.equal(t.status, 201, t.text);
  }
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUPER, body: {} });
  assert.equal(g.status, 200, g.text);
}
async function donDaGiao(w: W, o: Parameters<typeof nhap>[1] = {}): Promise<{ id: string; svc: string[] }> {
  const d = nhap(w, o);
  await xacNhan(w, d.id);
  await giaoDu(w, d.id);
  return d;
}
const phieuGiao = (w: W, id: string) => String(w.q("SELECT id FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0].id);
const lui = (w: W, bang: string, cot: string, where: string, ...a: unknown[]) => {
  goTrigger(w, bang);
  w.sqlite.prepare(`UPDATE ${bang} SET ${cot} = '${AT}' WHERE ${where}`).run(...a);
};
/** Chèn một dòng nợ bằng SQL tay (gỡ trigger dòng nợ trước nếu `goTruoc`). */
function chenDong(w: W, d: { posting: string; orderId: string; no: string; co: string; so: number; loai: string; dv?: string | null; receipt?: string | null }): void {
  w.sqlite.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
      created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, 'sql-tay', ?, 'sql-tay')`)
    .run(uuid(), d.posting, d.no, d.co, d.so, d.loai, d.orderId, d.dv ?? null, d.receipt ?? null, new Date().toISOString(), new Date().toISOString());
}

test("mã và mức: R-BIL-2/5/16/17/18/19, R-ORD-DC1 lỗi; nửa trước mốc (…w) cảnh báo; R-BIL-12 lỗi; danh sách «chưa áp dụng» chỉ còn R-BIL-7 (đảo bài có chủ đích)", () => {
  for (const c of ["R-BIL-2", "R-BIL-5", "R-BIL-12", "R-BIL-16", "R-BIL-17", "R-BIL-18", "R-BIL-19", "R-BIL-S9", "R-ORD-DC1"]) assert.equal(one(c).level, "fail", c);
  for (const c of ["R-BIL-2w", "R-BIL-5w", "R-BIL-19w", "R-ORD-DC1w"]) assert.equal(one(c).level, "warn", c);
  assert.deepEqual(AC.GHI_CHU.map((g) => g.code), ["R-BIL-7"], "R-BIL-2, R-BIL-5 đã chạy thật — không còn «chưa áp dụng»");
});

test("dữ liệu do CHÍNH mã ghi ⇒ mọi kiểm mới 0: C-1 (đại lý, giảm 250.000), C-4 (đơn trộn có giá vốn), khách lẻ có dịch vụ làm đại lý, bớt khách làm hoa hồng < giảm giá, D-3 điều chỉnh hoa hồng, đảo lần thu, thu cho nhà cung cấp", async () => {
  const { w, ct } = await setup();
  const c1 = await donDaGiao(w, { giam: 250_000 });
  await donDaGiao(w, { dichVu: [HONTAM(1, 1_000_000), IRESORT(2)] });
  await donDaGiao(w, { booker: null, dichVu: [IRESORT(2)] });
  // Review Focus 4 / SV-SK-04 dạng ngắn: bớt khách sau xác nhận ⇒ hoa hồng 100.000 < giảm giá 150.000 — KHÔNG chặn ⇒ R-ORD-DC1 không được báo.
  const bot = nhap(w, { dichVu: [HONTAM(2, 1_000_000)], giam: 150_000 });
  await xacNhan(w, bot.id);
  const sua = await w.call("POST", `/api/orders/${bot.id}/handler-money-edit`, { as: HDV, body: { reason: "Khách bớt người", services: [{ id: bot.svc[0], pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, sua.text);
  await giaoDu(w, bot.id);
  // D-3 (ADR-0080): mức đúng là 9% chứ không 10% — Kế toán điều chỉnh có người duyệt «đại lý → Tour Đảo 50.000 loại hoa hồng»; bản chụp vẫn 10% (đóng băng).
  const d3 = chenPhieuDieuChinh(w.sqlite, { id: uuid(), orderId: c1.id, reason: "mức Hòn Tằm của đại lý A là 9% theo hợp đồng", occurredDate: vnHomNay(), at: new Date().toISOString(), debtor: `pty-${PT}`, creditor: ct, amount: 50_000, kind: "HOA_HONG" });
  chenDong(w, { posting: d3.postingId, orderId: c1.id, no: `pty-${PT}`, co: ct, so: 50_000, loai: "HOA_HONG" });
  // Đảo lần thu đúng đường (Kế toán): dòng giữ hộ của HDV bị đảo cùng lô.
  const mo = nhap(w, { booker: null, dichVu: [HONTAM(1, 300_000)] });
  await xacNhan(w, mo.id);
  const t = await w.call("POST", `/api/orders/${mo.id}/payments`, { as: HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(t.status, 201, t.text);
  const r = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", mo.id)[0].id);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r, lyDo: "ghi nhầm số tiền khách đưa" } });
  assert.equal(dao.status, 201, dao.text);
  // Thu cho nhà cung cấp (Kế toán chọn hồ sơ i-resort ⇒ người thu SUPPLIER, thu cho chính i-resort) — trước Task 10, R-BIL-S9 báo nhầm ca này.
  const le = nhap(w, { booker: null, dichVu: [IRESORT(2)] });
  await xacNhan(w, le.id);
  const ncc = await w.call("POST", `/api/orders/${le.id}/payments`, { as: KT, body: { soTien: 600_000, hinhThuc: "CASH", nguoiThu: { partyId: NCC } } });
  assert.equal(ncc.status, 201, ncc.text);
  assert.equal(String(w.q("SELECT collected_for_party_id AS c FROM bil_payment_receipt WHERE order_id = ?", le.id)[0].c), NCC);
  assert.deepEqual(tatCaMoi(w), KHONG);
  const dem = (c: Check) => AC.demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all());
  assert.deepEqual(AC.CHECKS.filter((c) => c.code.startsWith("R-BIL") || c.code.startsWith("R-ORD-DC")).map((c) => [c.code, dem(c)]).filter((x) => x[1] !== 0), [], "mọi kiểm sổ tiền (cũ và mới) sạch trên dữ liệu do mã ghi");
});

test("R-BIL-2: dòng hoa hồng lệch 1 đồng ⇒ 1 (lỗi); phiếu «Đã giao» trước mốc ⇒ 0 lỗi, 1 cảnh báo (R-BIL-2w); thiếu dòng giá vốn ⇒ 1", async () => {
  const { w } = await setup();
  const a = await donDaGiao(w, { dichVu: [HONTAM(1, 1_000_000), IRESORT(2)] });
  assert.deepEqual([vp(w, "R-BIL-2"), vp(w, "R-BIL-2w")], [0, 0]);
  goTrigger(w, "bil_debt_line");
  w.sqlite.prepare("UPDATE bil_debt_line SET amount = amount - 1 WHERE order_id = ? AND kind_code = 'HOA_HONG' AND order_service_id = ?").run(a.id, a.svc[0]);
  assert.deepEqual([vp(w, "R-BIL-2"), vp(w, "R-BIL-2w")], [1, 0], "lệch 1 đồng sau mốc ⇒ lỗi");
  lui(w, "bil_posting", "created_at", "id = ?", phieuGiao(w, a.id));
  assert.deepEqual([vp(w, "R-BIL-2"), vp(w, "R-BIL-2w")], [0, 1], "trước mốc ⇒ chỉ cảnh báo");
  const b = await donDaGiao(w, { booker: null, dichVu: [IRESORT(2)] });
  w.sqlite.prepare("DELETE FROM bil_debt_line WHERE order_id = ? AND kind_code = 'GIA_VON'").run(b.id);
  assert.equal(vp(w, "R-BIL-2"), 1, "thiếu dòng giá vốn (đơn khách lẻ có dịch vụ làm đại lý) ⇒ lỗi");
});

test("R-BIL-2w (M1 = A): đơn khách lẻ «Đã giao» TRƯỚC mốc thiếu giá vốn ⇒ cảnh báo; Kế toán bổ sung giá vốn bằng phiếu điều chỉnh ⇒ hết cảnh báo", async () => {
  const { w, ct } = await setup();
  const b = await donDaGiao(w, { booker: null, dichVu: [IRESORT(2)] });
  goTrigger(w, "bil_debt_line");
  w.sqlite.prepare("DELETE FROM bil_debt_line WHERE order_id = ? AND kind_code = 'GIA_VON'").run(b.id);
  lui(w, "bil_posting", "created_at", "id = ?", phieuGiao(w, b.id));
  w.sqlite.prepare("UPDATE bil_posting SET gross_snapshot = NULL WHERE id = ?").run(phieuGiao(w, b.id)); // phiếu lượt 1 không có cột này
  assert.deepEqual([vp(w, "R-BIL-2"), vp(w, "R-BIL-2w")], [0, 1]);
  const p = chenPhieuDieuChinh(w.sqlite, { id: uuid(), orderId: b.id, reason: "bổ sung giá vốn i-resort cho đơn giao ở lượt 1", occurredDate: vnHomNay(), at: new Date().toISOString(), debtor: ct, creditor: NCC, amount: 480_000, kind: "GIA_VON" });
  chenDong(w, { posting: p.postingId, orderId: b.id, no: ct, co: NCC, so: 480_000, loai: "GIA_VON" });
  assert.deepEqual([vp(w, "R-BIL-2"), vp(w, "R-BIL-2w")], [0, 0], "đã bổ sung đúng 80% × 600.000");
});

test("R-BIL-5: đơn «Đã giao» có dòng dịch vụ không có người bán (bản chụp hiện hành thiếu người bán) ⇒ lỗi sau mốc, cảnh báo trước mốc; R-BIL-2 không đếm trùng", async () => {
  const { w } = await setup();
  const a = await donDaGiao(w, { booker: null, dichVu: [HONTAM(1, 300_000)] });
  assert.deepEqual([vp(w, "R-BIL-5"), vp(w, "R-BIL-5w")], [0, 0]);
  goTrigger(w, "ord_service_terms");
  w.sqlite.prepare("UPDATE ord_service_terms SET supply_status = 'MISSING', seller_party_id = NULL, supply_term_id = NULL WHERE order_service_id = ?").run(a.svc[0]);
  assert.deepEqual([vp(w, "R-BIL-5"), vp(w, "R-BIL-5w"), vp(w, "R-BIL-2")], [1, 0, 0]);
  lui(w, "bil_posting", "created_at", "id = ?", phieuGiao(w, a.id));
  assert.deepEqual([vp(w, "R-BIL-5"), vp(w, "R-BIL-5w"), vp(w, "R-BIL-2w")], [0, 1, 0]);
});

test("R-BIL-16: đơn có người hưởng, thành tiền trước giảm − phải thu > 0 mà không có / có hai dòng giảm giá bên đặt ⇒ lỗi; đơn khách lẻ có dòng ⇒ lỗi; thành tiền < phải thu ⇒ lỗi (M-4)", async () => {
  const { w, ct } = await setup();
  const a = await donDaGiao(w, { giam: 250_000 });
  assert.equal(vp(w, "R-BIL-16"), 0);
  goTrigger(w, "bil_debt_line", "bil_posting");
  w.sqlite.prepare("DELETE FROM bil_debt_line WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(a.id);
  assert.equal(vp(w, "R-BIL-16"), 1, "thiếu dòng");
  chenDong(w, { posting: phieuGiao(w, a.id), orderId: a.id, no: `pty-${PT}`, co: ct, so: 250_000, loai: "GIAM_GIA_BEN_DAT" });
  assert.equal(vp(w, "R-BIL-16"), 0, "đủ một dòng đúng số");
  // I-3 (người kiểm Task 10+11): MỘT dòng, lệch 1 đồng ⇒ lỗi (vế «tổng ≠ giảm» — phép đột biến B).
  w.sqlite.prepare("UPDATE bil_debt_line SET amount = 249999 WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(a.id);
  assert.equal(vp(w, "R-BIL-16"), 1, "một dòng lệch 1 đồng");
  w.sqlite.prepare("UPDATE bil_debt_line SET amount = 250000 WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(a.id);
  // I-2 (người kiểm Task 10+11; Ruling R-110): dòng đúng số mà ghi sai BÊN NỢ (hồ sơ nhân viên thay người hưởng của bản chụp) ⇒ lỗi; bên có không phải công ty chủ ⇒ lỗi.
  w.sqlite.prepare("UPDATE bil_debt_line SET debtor_party_id = ? WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(`pty-${SALES}`, a.id);
  assert.equal(vp(w, "R-BIL-16"), 1, "bên nợ là hồ sơ nhân viên, không phải người hưởng");
  w.sqlite.prepare("UPDATE bil_debt_line SET debtor_party_id = ?, creditor_party_id = ? WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(`pty-${PT}`, `pty-${SALES}`, a.id);
  assert.equal(vp(w, "R-BIL-16"), 1, "bên có không phải công ty chủ");
  w.sqlite.prepare("UPDATE bil_debt_line SET creditor_party_id = ? WHERE order_id = ? AND kind_code = 'GIAM_GIA_BEN_DAT'").run(ct, a.id);
  assert.equal(vp(w, "R-BIL-16"), 0, "trả về đúng hai bên");
  chenDong(w, { posting: phieuGiao(w, a.id), orderId: a.id, no: `pty-${PT}`, co: ct, so: 250_000, loai: "GIAM_GIA_BEN_DAT" });
  assert.equal(vp(w, "R-BIL-16"), 1, "hai dòng");
  const b = await donDaGiao(w, { booker: null, dichVu: [HONTAM(1, 300_000)], giam: 50_000 });
  assert.equal(vp(w, "R-BIL-16"), 1, "đơn khách lẻ giảm giá: Tour Đảo chịu, không dòng — chưa thêm gì");
  chenDong(w, { posting: phieuGiao(w, b.id), orderId: b.id, no: `pty-${SALES}`, co: ct, so: 50_000, loai: "GIAM_GIA_BEN_DAT" });
  assert.equal(vp(w, "R-BIL-16"), 2, "đơn khách lẻ mang dòng giảm giá bên đặt");
  const c = await donDaGiao(w, { dichVu: [HONTAM(1, 400_000)] });
  w.sqlite.prepare("UPDATE bil_posting SET gross_snapshot = due_snapshot - 1 WHERE id = ?").run(phieuGiao(w, c.id));
  assert.equal(vp(w, "R-BIL-16"), 3, "thành tiền trước giảm < phải thu đã chụp (dữ liệu lệch R-27)");
});

test("R-BIL-12 / R-BIL-S9 (đổi nghĩa — đảo bài có chủ đích): thu cho nhà cung cấp của đơn sau mốc ⇒ sạch; thu cho hồ sơ lạ ⇒ R-BIL-12; người thu «nhà cung cấp» không phải nhà cung cấp của đơn ⇒ R-BIL-12; lần thu TRƯỚC mốc không thu cho công ty chủ ⇒ R-BIL-S9", async () => {
  const { w, ct } = await setup();
  const le = nhap(w, { booker: null, dichVu: [IRESORT(2)] });
  await xacNhan(w, le.id);
  assert.equal((await w.call("POST", `/api/orders/${le.id}/payments`, { as: KT, body: { soTien: 300_000, hinhThuc: "CASH", nguoiThu: { partyId: NCC } } })).status, 201);
  const r = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ?", le.id)[0].id);
  assert.deepEqual([vp(w, "R-BIL-12"), vp(w, "R-BIL-S9")], [0, 0], "thu cho nhà cung cấp của dòng — hợp lệ từ đợt 2 (lượt 1 R-BIL-S9 báo 1)");
  goTrigger(w, "bil_payment_receipt");
  w.sqlite.prepare("UPDATE bil_payment_receipt SET collected_for_party_id = ? WHERE id = ?").run(`pty-${SALES}`, r);
  assert.deepEqual([vp(w, "R-BIL-12"), vp(w, "R-BIL-S9")], [1, 0], "thu cho hồ sơ không phải công ty chủ, không phải người bán");
  w.sqlite.prepare("UPDATE bil_payment_receipt SET collected_for_party_id = ?, collector_party_id = ? WHERE id = ?").run(ct, ct, r);
  assert.deepEqual([vp(w, "R-BIL-12"), vp(w, "R-BIL-S9")], [1, 0], "người thu vai «nhà cung cấp» là hồ sơ không phải nhà cung cấp của dòng nào (thu cho công ty chủ — vế «thu cho» đạt)");
  w.sqlite.prepare("UPDATE bil_payment_receipt SET collector_party_id = ?, collected_for_party_id = ?, created_at = ? WHERE id = ?").run(NCC, NCC, AT, r);
  assert.deepEqual([vp(w, "R-BIL-12"), vp(w, "R-BIL-S9")], [0, 1], "lần thu trước mốc 0112: lượt 1 luôn thu cho công ty chủ");
});

test("R-ORD-DC1: đơn có người hưởng giảm giá > tổng hoa hồng (cả lúc xác nhận lẫn hiện hành) ⇒ lỗi sau mốc, cảnh báo trước mốc; bằng đúng trần ⇒ sạch", async () => {
  const { w } = await setup();
  const a = nhap(w, { dichVu: [HONTAM(1, 1_000_000)], giam: 100_000 });
  await xacNhan(w, a.id);
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [0, 0], "giảm 100.000 = hoa hồng 10% × 1.000.000");
  goTrigger(w, "ord_service_terms");
  w.sqlite.prepare("UPDATE ord_service_terms SET commission_rate_bp = 999 WHERE order_service_id = ?").run(a.svc[0]);
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [1, 0], "hoa hồng 99.900 < giảm 100.000");
  lui(w, "orders", "confirmed_at", "id = ?", a.id);
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [0, 1], "xác nhận trước mốc ⇒ chỉ cảnh báo");
});

test("R-ORD-DC1 (I-1 người kiểm Task 10+11; Ruling R-P25): Kế toán hạ mức tay SAU Xác nhận (ví dụ D-3) ⇒ không báo — so với bản chụp tự động gần nhất, không với bản ghi tay; vượt thật vẫn bắt", async () => {
  const { w } = await setup();
  const a = nhap(w, { dichVu: [HONTAM(1, 1_000_000)], giam: 100_000 });
  await xacNhan(w, a.id);
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [0, 0], "giảm 100.000 = hoa hồng 10% lúc Xác nhận");
  const tay = await w.call("POST", `/api/orders/${a.id}/thuong-mai/${a.svc[0]}`, { as: KT, body: { lyDo: "mức đúng theo hợp đồng là 5%", hoaHong: { kieu: "RATE", tyLeBp: 500 } } });
  assert.equal(tay.status, 200, tay.text);
  assert.equal(w.q("SELECT count(*) n FROM ord_service_terms WHERE order_service_id = ? AND source = 'MANUAL'", a.svc[0])[0].n, 1, "đã có bản ghi tay 5%");
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [0, 0], "ghi tay sau Xác nhận không biến đơn thành vi phạm vĩnh viễn");
  // Vượt thật: bản chụp tự động (gốc) bị sửa bằng SQL tay xuống 9,99% ⇒ vẫn bắt, dù bản hiện hành là bản ghi tay.
  goTrigger(w, "ord_service_terms");
  w.sqlite.prepare("UPDATE ord_service_terms SET commission_rate_bp = 999 WHERE order_service_id = ? AND source = 'AUTO'").run(a.svc[0]);
  assert.deepEqual([vp(w, "R-ORD-DC1"), vp(w, "R-ORD-DC1w")], [1, 0], "giảm vượt hoa hồng của bản chụp tự động");
});

test("R-BIL-17 (Ruling R-P8): phiếu «Đã giao» ghi sau mốc mà thiếu thành tiền trước giảm ⇒ lỗi; phiếu trước mốc ⇒ không báo", async () => {
  const { w } = await setup();
  const a = await donDaGiao(w, { booker: null, dichVu: [HONTAM(1, 300_000)] });
  assert.equal(vp(w, "R-BIL-17"), 0);
  goTrigger(w, "bil_posting");
  w.sqlite.prepare("UPDATE bil_posting SET gross_snapshot = NULL WHERE id = ?").run(phieuGiao(w, a.id));
  assert.equal(vp(w, "R-BIL-17"), 1);
  w.sqlite.prepare("UPDATE bil_posting SET created_at = ? WHERE id = ?").run(AT, phieuGiao(w, a.id));
  assert.equal(vp(w, "R-BIL-17"), 0);
});

test("R-BIL-18: dòng hoa hồng / giảm giá bên đặt / giá vốn GỐC chỉ nằm trên phiếu «Đã giao» hoặc phiếu điều chỉnh ⇒ dòng trên phiếu khác là lỗi; dòng đảo và phiếu điều chỉnh sạch", async () => {
  const { w, ct } = await setup();
  const a = await donDaGiao(w, { booker: null, dichVu: [HONTAM(1, 300_000)] });
  const p = chenPhieuDieuChinh(w.sqlite, { id: uuid(), orderId: a.id, reason: "bổ sung giá vốn vé Hòn Tằm theo hợp đồng", occurredDate: vnHomNay(), at: new Date().toISOString(), debtor: ct, creditor: NCC, amount: 10_000, kind: "GIA_VON" });
  chenDong(w, { posting: p.postingId, orderId: a.id, no: ct, co: NCC, so: 10_000, loai: "GIA_VON" });
  assert.equal(vp(w, "R-BIL-18"), 0, "phiếu điều chỉnh có duyệt");
  const khac = uuid();
  w.sqlite.prepare("INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, 'SETTLEMENT', ?, NULL, ?, ?, 'sql-tay', ?, 'sql-tay')")
    .run(khac, a.id, vnHomNay(), new Date().toISOString(), new Date().toISOString());
  chenDong(w, { posting: khac, orderId: a.id, no: ct, co: NCC, so: 10_000, loai: "GIA_VON" });
  assert.equal(vp(w, "R-BIL-18"), 1, "giá vốn trên phiếu quyết toán");
});

test("R-BIL-19 (người kiểm Task 5, I-1): dòng giữ hộ gốc còn sống của lần thu ĐÃ bị đảo ⇒ lỗi sau mốc, cảnh báo trước mốc; đảo đúng đường (cả dòng giữ hộ) ⇒ sạch", async () => {
  const { w } = await setup();
  const a = nhap(w, { booker: null, dichVu: [HONTAM(1, 300_000)] });
  await xacNhan(w, a.id);
  assert.equal((await w.call("POST", `/api/orders/${a.id}/payments`, { as: HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const r = w.q("SELECT * FROM bil_payment_receipt WHERE order_id = ?", a.id)[0];
  assert.equal(vp(w, "R-BIL-19"), 0);
  // Đảo RIÊNG lần thu bằng SQL tay (như lô thua đua «Bên kia đã nhận» × «đảo lần thu» trước vá R-42): dòng giữ hộ của HDV còn sống.
  const x = uuid();
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
      reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'sql-tay', ?, 'sql-tay')`)
    .run(x, a.id, r.kind_code, r.amount, r.collector_party_id, r.collector_role_code, r.method_code, r.collected_for_party_id, r.stage_code, r.occurred_date, r.id, new Date().toISOString(), new Date().toISOString());
  assert.deepEqual([vp(w, "R-BIL-19"), vp(w, "R-BIL-19w")], [1, 0]);
  lui(w, "bil_payment_receipt", "created_at", "id = ?", x);
  assert.deepEqual([vp(w, "R-BIL-19"), vp(w, "R-BIL-19w")], [0, 1], "đảo ghi trước mốc 0112 (dữ liệu cũ) ⇒ cảnh báo kèm danh sách");
});

// ---- Nợ nhỏ của người kiểm Task 3+4 gom vào Task 10 (ghi chú điều phối điểm 5). M-1 là bài kiểu (typecheck — quan sát chặn ở sổ thi công); M-2 chưa làm (tệp
// billing/rules.ts đang do Task 8+9 giữ — ghi ở Nợ); M-4 do R-BIL-16 bắt ở tầng dữ liệu (bài trên, «thành tiền < phải thu»).
test("M-3: thuongMaiCuaDon(null) — đơn không đọc được phần thương mại ⇒ đóng an toàn: không bao giờ «đủ» / «không người hưởng», không dòng, trước giảm 0", async () => {
  const esbuild = await import("esbuild");
  const built = await esbuild.build({
    stdin: { contents: 'export { thuongMaiCuaDon } from "./src/modules/billing/service";', resolveDir: new URL("../", import.meta.url).pathname, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
  });
  const { thuongMaiCuaDon } = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as {
    thuongMaiCuaDon: (p: null) => { dong: unknown[]; tinhTrang: { trangThai: string }; gross: number };
  };
  const kq = thuongMaiCuaDon(null);
  // Chỉ khoá tính chất «đóng an toàn» (Ruling R-20), không khoá tên tình trạng: tình trạng KHÔNG BAO GIỜ là «đủ» / «không người hưởng» (hai tình trạng duy nhất cho «Đã giao»
  // đi tiếp tới sinh dòng), không dòng thương mại, trước giảm 0.
  assert.ok(!["DU", "KHONG_NGUOI_HUONG"].includes(kq.tinhTrang.trangThai), `tình trạng ${kq.tinhTrang.trangThai} cho phép «Đã giao» đi tiếp`);
  assert.deepEqual([kq.dong, kq.gross], [[], 0]);
});

test("M-6: bên đặt NAY mang vai bên ngoài nhưng bản chụp lúc xác nhận là «không người hưởng» (NONE) ⇒ «Đã giao» được, không dòng hoa hồng / giảm giá bên đặt; kiểm định kỳ sạch", async () => {
  const { w } = await setup();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-kd-khach', 'PERSON', 'Khách Quen', 1, ?, ?)").run(AT, AT);
  const d = nhap(w, { booker: "pty-kd-khach", dichVu: [HONTAM(1, 400_000)], giam: 20_000 });
  await xacNhan(w, d.id);
  assert.deepEqual(w.q("SELECT commission_status AS s, beneficiary_party_id AS b FROM ord_service_terms WHERE order_id = ?", d.id).map((r: object) => ({ ...r })), [{ s: "NONE", b: null }]);
  // Sau xác nhận, hồ sơ khách được gắn vai đại lý (bản chụp đã chụp không đổi — ADR-0077 điều 9).
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-kd-khach-dl', 'pty-kd-khach', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  await giaoDu(w, d.id);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON')", d.id)[0].n), 0, "giảm giá do Tour Đảo chịu như đơn khách lẻ");
  assert.deepEqual(tatCaMoi(w), KHONG);
});
