// Sổ đại lý đợt 2, Task 5 — người thu là BÊN ĐẶT (đại lý của đơn) / QUẦY NHÀ CUNG CẤP; khoản «khách trả bên kia» do người không phải Kế toán khai chờ Kế toán
// «Bên kia đã nhận», KHÔNG tạo nợ (ADR-0132 quyết định 1–5, tiêu chí 1–5; ADR-0078 điều 7, 9; đặc tả docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md
// P4, P10; trang-ghep.md §1, §2). Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs: SQLite với đủ migration; lô `db.batch()` là một giao dịch như D1).
// Tên người / hồ sơ ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
// Đọc qua không gian tên: thiếu tên công bố (trước khi cài) thì từng bài đỏ riêng, không đỏ cả tệp lúc nạp.
import * as R from "./rules.ts";
const { soDuTheoBen } = R;

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // tài khoản Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY («Đại Lý A», cũng là lễ tân bên đặt của SV-HT-03)
const NCC = "pty-ncc"; // i-resort — hồ sơ tổ chức, vai SUPPLIER, không tài khoản
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const lui = (ngay: number) => new Date(Date.parse(`${vnHomNay()}T00:00:00Z`) - ngay * 86_400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `95959595-9595-4959-8959-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

/** Năm tài khoản; đại lý A (vai TRAVEL_AGENCY) hưởng 10% mọi dịch vụ; nhà cung cấp i-resort bán IRESORT, tỷ lệ mua lại 80% (route thật của Kế toán). */
async function setup(): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-bk-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NCC, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-bk-ncc', ?, 'SUPPLIER', '2026-01-01', ?, ?)").run(NCC, AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return { w, ct: String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id) };
}

interface DvNhap { ten: string; catalog: string | null; khach: number; donGia: number }
/** Đơn NHÁP bằng SQL (ngày đi = hôm nay); `booker` mặc định = đại lý A; `owner` mặc định Bán hàng. */
function nhap(w: W, o: { owner?: string; booker?: string | null; dichVu?: DvNhap[]; giam?: number } = {}): { id: string; svc: string[] } {
  const id = uuid();
  const dichVu = o.dichVu ?? [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 300_000 }];
  const sub = dichVu.reduce((t, d) => t + d.khach * d.donGia, 0);
  const tong = sub - (o.giam ?? 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-BK-${seq}`, o.owner ?? SALES, sub, o.giam ?? 0, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
  const svc = dichVu.map((d, i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, 'perPax', ?, ?)`).run(s, id, i, d.catalog, d.ten, d.khach, vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, 'adult', 'Người lớn', ?, ?, ?, ?)`)
      .run(`${s}-i`, id, s, d.catalog, d.khach, d.donGia, d.donGia, d.khach * d.donGia);
    return s;
  });
  return { id, svc };
}
async function xacNhan(w: W, id: string): Promise<void> {
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SUPER, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
}
const phanCong = (w: W, id: string) => w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
  VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
/** Đơn ĐÃ XÁC NHẬN qua route (máy chủ chụp bản chụp), HDV phụ trách. */
async function donXacNhan(w: W, o: Parameters<typeof nhap>[1] = {}): Promise<{ id: string; svc: string[] }> {
  const d = nhap(w, o);
  await xacNhan(w, d.id);
  phanCong(w, d.id);
  return d;
}
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const mat = (soTien: number, nguoiThu: unknown, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "CASH", nguoiThu, ...them });
const benKia = (w: W, receiptId: string, body: unknown = {}, as = KT) => w.call("POST", `/api/ledger/counterparty-receipts/${receiptId}/confirm`, { as, body });
const giao = (w: W, id: string, body: Record<string, unknown> = {}, as = HDV) => w.call("POST", `/api/orders/${id}/delivered`, { as, body });
const thay = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body });
const tien = async (w: W, id: string, as = KT) => {
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const cuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const n = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const lanThu = (w: W, rid: string): { vai: string; nguoi: string; cho: string } =>
  ({ ...(w.q("SELECT collector_role_code AS vai, collector_party_id AS nguoi, collected_for_party_id AS cho FROM bil_payment_receipt WHERE id = ?", rid)[0] as { vai: string; nguoi: string; cho: string }) });
const dongCua = (w: W, orderId: string) => w.q(`SELECT l.kind_code AS loai, l.debtor_party_id AS no, l.creditor_party_id AS co, l.amount AS so, l.receipt_id AS lt, l.reverses_line_id AS dao, p.kind_code AS phieu
  FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? ORDER BY l.rowid`, orderId).map((r: object) => ({ ...r }));
const soDu = (w: W, orderId: string, ct: string) =>
  soDuTheoBen(w.q("SELECT debtor_party_id AS debtorPartyId, creditor_party_id AS creditorPartyId, amount FROM bil_debt_line WHERE order_id = ?", orderId), ct);
const choSo = async (w: W) => (await w.call("GET", "/api/ledger", { as: KT })).json.choXacNhan as { receiptId: string; loai: string; benKia: string | null; nguoiKhai: string }[];
const choCoc = async (w: W) => (await w.call("GET", "/api/ledger/coc", { as: KT })).json.doiChieu as { receiptId: string; loai: string; benKia: string | null }[];
const daoLanThu = (w: W, receiptId: string) => w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId, lyDo: "đại lý báo không nhận" } });
/** Chạy `truoc()` (bất đồng bộ) đúng một lần ngay trước lô đầu tiên có câu khớp `re` — «người khác ghi giữa lúc route đọc và lúc route ghi» (khuôn khoa-thang.test.ts). */
function chenTruocLo(w: W, re: RegExp, truoc: () => Promise<void>): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) {
      w.env.DB.batch = goc;
      await truoc();
    }
    return goc(stmts);
  };
}
/**
 * Chạy `truoc()` đúng một lần ngay trước câu ĐỌC đầu tiên có SQL khớp `re` (móc `prepare`: lần `.all()` / `.first()` của câu đó chờ `truoc()` xong mới chạy) —
 * ghim khe GIỮA hai lần đọc của một route (người kiểm Task 5 vòng 2). Chỉ dùng cho câu đọc (câu bọc không vào được `batch` của D1 giả nghiêm).
 */
function chenTruocDoc(w: W, re: RegExp, truoc: () => Promise<void>): void {
  const goc = w.env.DB.prepare;
  w.env.DB.prepare = (sql: string) => {
    const s = goc(sql);
    if (!re.test(sql)) return s;
    w.env.DB.prepare = goc;
    const cho = <T>(f: () => Promise<T>) => async () => { await truoc(); return f(); };
    return { ...s, bind: (...a: unknown[]) => { const b = s.bind(...a); return { ...b, all: cho(b.all), first: cho(b.first) }; } };
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Khai và xác nhận (ADR-0132 tiêu chí 1–3)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0132 tiêu chí 1–2: HDV khai «khách trả cho đại lý» 300.000 ⇒ 201, không dòng giữ hộ, có DECLARED, bạn đang giữ không đổi, chờ Kế toán ở cả hai danh sách; «Đã giao» 409 nêu «khách trả cho Đại Lý A»; Kế toán «Bên kia đã nhận» ⇒ một phiếu, một HELD đại lý → cty mang receipt_id gốc; «Đã giao» được", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w);
  const giuTruoc = (await tien(w, id, HDV)).banDangGiu;
  const k = await thu(w, HDV, id, mat(300_000, "ben_dat"));
  assert.equal(k.status, 201, k.text);
  const r = cuoi(w, id);
  assert.deepEqual(lanThu(w, r), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct }, "người thu = bên đặt; thu cho mặc định Tour Đảo");
  assert.deepEqual(dongCua(w, id), [], "lời khai KHÔNG sinh dòng giữ hộ cho ai (ADR-0132 điều 1)");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'DECLARED'", r), 1);
  const t = await tien(w, id, HDV);
  assert.equal(t.banDangGiu, giuTruoc, "HDV không cầm đồng nào");
  assert.equal(t.lyDoChuaGiao?.ma, "reconciling");
  assert.match(t.lyDoChuaGiao?.cau ?? "", /khách trả cho Đại Lý A/);
  const kt = await tien(w, id, KT);
  assert.deepEqual([kt.keToan.choBenKia, kt.keToan.choXacNhan], [[r], []], "khoản bên kia tách khỏi «Công ty đã nhận» trên màn đơn");
  assert.deepEqual((await choSo(w)).map((x) => [x.receiptId, x.loai, x.benKia]), [[r, "ben_dat", "Đại Lý A"]], "danh sách chờ của Kế toán (PENDING_COMPANY)");
  assert.deepEqual((await choCoc(w)).map((x) => [x.receiptId, x.loai, x.benKia]), [[r, "ben_dat", "Đại Lý A"]]);
  const g = await giao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "not_deliverable");
  assert.match(g.json.error.message, /khách trả cho Đại Lý A/);
  const banHang = await benKia(w, r, {}, SALES);
  assert.equal(banHang.status, 403, "ô ledger.write: Bán hàng qua cổng văn phòng nhưng không xác nhận được");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r), 0);
  const x = await benKia(w, r);
  assert.equal(x.status, 200, x.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'COUNTERPARTY_CONFIRMED'", id), 1, "một phiếu");
  assert.deepEqual(dongCua(w, id), [{ loai: "HELD", no: `pty-${PT}`, co: ct, so: 300_000, lt: r, dao: null, phieu: "COUNTERPARTY_CONFIRMED" }], "một dòng giữ hộ đại lý → Tour Đảo mang receipt_id gốc");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r), 1);
  assert.equal(n(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_counterparty_confirmed'", id), 1);
  assert.deepEqual(await choSo(w), [], "đơn rời danh sách chờ");
  assert.deepEqual((await tien(w, id, KT)).keToan.choBenKia, []);
  assert.equal((await tien(w, id, HDV)).banDangGiu, giuTruoc, "xác nhận không đổi nợ của HDV");
  const g2 = await giao(w, id);
  assert.equal(g2.status, 200, g2.text);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 300_000 - 30_000, "đại lý giữ 300.000, Tour Đảo nợ hoa hồng 30.000");
  assert.equal((await benKia(w, r)).status, 409, "xác nhận lần hai ⇒ 409");
});

test("ADR-0132 tiêu chí 3 + Review Focus 3: đảo lời khai trước xác nhận ⇒ hết chờ, không dòng sót; khai lại ⇒ chờ lại; đảo SAU xác nhận (đơn chưa giao) ⇒ HELD trên đại lý được đảo", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w);
  assert.equal((await thu(w, HDV, id, mat(300_000, "ben_dat"))).status, 201);
  const r1 = cuoi(w, id);
  const d1 = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r1, lyDo: "đại lý báo không nhận" } });
  assert.equal(d1.status, 201, d1.text);
  assert.deepEqual(await choSo(w), [], "đảo ⇒ hết chờ");
  assert.deepEqual((await tien(w, id, KT)).keToan.choBenKia, []);
  assert.deepEqual(dongCua(w, id), [], "không dòng sót");
  assert.equal((await benKia(w, r1)).status, 409, "khoản đã đảo không xác nhận được");
  assert.equal((await thu(w, HDV, id, mat(300_000, "ben_dat"))).status, 201, "khai lại");
  const r2 = cuoi(w, id);
  assert.deepEqual((await choSo(w)).map((x) => x.receiptId), [r2], "chờ lại đúng khoản mới");
  assert.equal((await tien(w, id, HDV)).lyDoChuaGiao?.ma, "reconciling");
  assert.equal((await benKia(w, r2)).status, 200);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 300_000);
  const d2 = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: r2, lyDo: "đại lý trả lại tiền khách" } });
  assert.equal(d2.status, 201, d2.text);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`) ?? 0, 0, "dòng giữ hộ trên đại lý được đảo đủ");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND reverses_line_id IS NOT NULL", id), 1);
  assert.deepEqual(await choSo(w), []);
});

test("đua (người kiểm Task 5 I-1): «đảo lần thu» đọc lời khai chưa xác nhận, Kế toán khác bấm «Bên kia đã nhận» chen giữa ⇒ đảo 409 stale, lần thu còn hiệu lực, dòng giữ hộ đại lý khớp (không mồ côi), không nhật ký; chiều ngược: xác nhận đọc xong, đảo chen giữa ⇒ xác nhận 409, không dòng nào", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w);
  assert.equal((await thu(w, HDV, id, mat(300_000, "ben_dat"))).status, 201);
  const r = cuoi(w, id);
  chenTruocLo(w, /INSERT INTO bil_payment_receipt[\s\S]*FROM bil_payment_receipt g WHERE g\.id = \?6/, async () => {
    const x = await benKia(w, r);
    assert.equal(x.status, 200, x.text);
  });
  const d = await daoLanThu(w, r);
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "stale");
  assert.equal(d.json.error.message, "Khoản này vừa được Kế toán xác nhận — tải lại rồi huỷ khoản thu lại.");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE reverses_id = ?", r), 0, "lần thu không bị đảo");
  assert.equal(n(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_reversal'", id), 0, "lệnh không áp thì không nhật ký");
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 300_000, "đại lý giữ 300.000 — khớp lần thu còn hiệu lực");
  assert.equal((await tien(w, id)).daThu, 300_000);
  const d2 = await daoLanThu(w, r);
  assert.equal(d2.status, 201, d2.text);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`) ?? 0, 0, "tải lại rồi đảo: đảo cả dòng giữ hộ");
  assert.equal((await thu(w, HDV, id, mat(200_000, "ben_dat"))).status, 201);
  const r2 = cuoi(w, id);
  chenTruocLo(w, /INSERT INTO bil_receipt_recon/, async () => {
    const y = await daoLanThu(w, r2);
    assert.equal(y.status, 201, y.text);
  });
  const x2 = await benKia(w, r2);
  assert.equal(x2.status, 409, x2.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r2), 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'COUNTERPARTY_CONFIRMED'", id), 1, "chỉ phiếu của lần xác nhận đầu");
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`) ?? 0, 0, "không dòng giữ hộ nào cho khoản đã đảo");
});

test("đua giữa HAI lần đọc của «đảo lần thu» (người kiểm Task 5 vòng 2): xác nhận chen ngay trước câu đọc dấu ⇒ đảo đủ cả dòng giữ hộ (201, đại lý 0); chen ngay trước câu đọc dòng giữ hộ ⇒ 409 stale, không ghi gì, đại lý giữ 300.000 — không ngả nào để lại dòng mồ côi", async () => {
  const { w, ct } = await setup();
  const RECON = /FROM bil_receipt_recon WHERE receipt_id = \?1/;
  const DONG = /WHERE l\.receipt_id = \?1 ORDER BY l\.rowid/;
  const kich = async (re: RegExp) => {
    const { id } = await donXacNhan(w);
    assert.equal((await thu(w, HDV, id, mat(300_000, "ben_dat"))).status, 201);
    const r = cuoi(w, id);
    chenTruocDoc(w, re, async () => {
      const x = await benKia(w, r);
      assert.equal(x.status, 200, x.text);
    });
    return { id, r, d: await daoLanThu(w, r) };
  };
  const a = await kich(RECON);
  assert.equal(a.d.status, 201, a.d.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE reverses_id = ?", a.r), 1);
  assert.equal(soDu(w, a.id, ct).get(`pty-${PT}`) ?? 0, 0, "xác nhận xong TRƯỚC khi đọc dấu ⇒ đọc dòng sau đó thấy dòng giữ hộ ⇒ đảo cả nó (không mồ côi)");
  assert.equal((await tien(w, a.id)).daThu, 0);
  const b = await kich(DONG);
  assert.equal(b.d.status, 409, b.d.text);
  assert.equal(b.d.json.error.code, "stale");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE reverses_id = ?", b.r), 0, "lần thu không bị đảo");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'REVERSAL'", b.id), 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_reversal'", b.id), 0);
  assert.equal(soDu(w, b.id, ct).get(`pty-${PT}`), 300_000, "dòng giữ hộ khớp lần thu còn hiệu lực");
  assert.equal((await tien(w, b.id)).daThu, 300_000);
});

test("KIEM-C (người kiểm Task 5 vòng 2): lần thu BOOKER Kế toán ghi thẳng (có dòng giữ hộ, không dấu) + DECLARED/CONFIRMED chèn bằng SQL ngay trước lô đảo ⇒ 409, phiếu REVERSAL +0, dòng đảo +0, nhật ký +0 (phiếu đảo bám dòng đảo lần thu)", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w);
  assert.equal((await thu(w, KT, id, mat(300_000, "ben_dat"))).status, 201);
  const r = cuoi(w, id);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", r), 0, "ghi thẳng: không dấu");
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 300_000);
  const dem = () => [
    n(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'REVERSAL'", id),
    n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND reverses_line_id IS NOT NULL", id),
    n(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_reversal'", id),
    n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE reverses_id = ?", r),
  ];
  const truoc = dem();
  chenTruocLo(w, /INSERT INTO bil_payment_receipt[\s\S]*FROM bil_payment_receipt g WHERE g\.id = \?6/, async () => {
    const chen = w.sqlite.prepare("INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    chen.run(uuid(), r, "DECLARED", vnHomNay(), AT, KT, AT, KT);
    chen.run(uuid(), r, "CONFIRMED", vnHomNay(), AT, KT, AT, KT);
  });
  const d = await daoLanThu(w, r);
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "stale");
  assert.deepEqual(dem(), truoc, "phiếu REVERSAL, dòng đảo, nhật ký, dòng đảo lần thu: không thêm gì");
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 300_000);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Ghi trực tiếp (ADR-0132 quyết định 3, tiêu chí 5)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0132 tiêu chí 5: Đối tác ghi «tôi» trên đơn mình là bên đặt ⇒ BOOKER, dòng giữ hộ sinh ngay trên chính họ, không dấu chờ; Kế toán chọn hồ sơ đại lý ⇒ BOOKER, giữ hộ ngay", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 1_000_000 }] });
  const a = await thu(w, PT, id, mat(400_000, "toi"));
  assert.equal(a.status, 201, a.text);
  const ra = cuoi(w, id);
  assert.deepEqual(lanThu(w, ra), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct });
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", ra), 0, "không dấu chờ");
  assert.deepEqual(dongCua(w, id).map((d: { loai: string; no: string; so: number; phieu: string }) => [d.loai, d.no, d.so, d.phieu]), [["HELD", `pty-${PT}`, 400_000, "RECEIPT"]]);
  const b = await thu(w, KT, id, mat(100_000, { partyId: `pty-${PT}` }));
  assert.equal(b.status, 201, b.text);
  const rb = cuoi(w, id);
  assert.deepEqual(lanThu(w, rb), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct });
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", rb), 0);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 500_000);
  assert.deepEqual(await choSo(w), [], "ghi thẳng không vào danh sách chờ");
  const c = await thu(w, KT, id, mat(50_000, "ben_dat"));
  assert.equal(c.status, 201, c.text);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", cuoi(w, id)), 0, "Kế toán chọn «khách trả cho đại lý» ⇒ ghi thẳng, không lời khai");
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), 550_000);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Từ chối
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("từ chối: «khách trả cho đại lý» trên đơn khách lẻ ⇒ 400; nhà cung cấp không bán dòng nào ⇒ 400; vượt phần chưa thu ⇒ 400; lần thu kèm «Đã giao» với hai lựa chọn mới ⇒ 400; đơn nháp ⇒ 400; HDV ghi tên đại lý làm người thu ⇒ 400", async () => {
  const { w } = await setup();
  const le = await donXacNhan(w, { booker: null });
  const a = await thu(w, HDV, le.id, mat(100_000, "ben_dat"));
  assert.equal(a.status, 400, a.text);
  assert.equal(a.json.error.message, "Đơn này không có đại lý đặt.");
  const { id } = await donXacNhan(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 1_000_000 }, { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 }] });
  assert.equal((await thu(w, HDV, id, mat(100_000, { nhaCungCapPartyId: `pty-${SALES}` }))).status, 400, "hồ sơ không phải nhà cung cấp của dòng nào trên đơn");
  const vuot = await thu(w, HDV, id, mat(600_001, { nhaCungCapPartyId: NCC }));
  assert.equal(vuot.status, 400, vuot.text);
  assert.match(vuot.json.error.message, /600\.000 ₫/, "nói phần còn chưa thu");
  assert.equal((await thu(w, HDV, id, mat(400_000, { nhaCungCapPartyId: NCC }))).status, 201);
  assert.equal((await thu(w, HDV, id, mat(200_001, { nhaCungCapPartyId: NCC }))).status, 400, "lời khai đang chờ cũng tính là đã thu cho nhà cung cấp");
  const CAU_GIAO = "Ghi khoản khách trả cho đại lý / tại quầy trước, chờ Kế toán xác nhận rồi mới Đã giao.";
  for (const nguoiThu of ["ben_dat", { nhaCungCapPartyId: NCC }]) {
    const g = await giao(w, id, { lanThu: mat(100_000, nguoiThu) });
    assert.equal(g.status, 400, g.text);
    assert.equal(g.json.error.message, CAU_GIAO);
  }
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 1, "không ghi gì thêm");
  const nh = nhap(w);
  assert.equal((await thu(w, SALES, nh.id, mat(100_000, "ben_dat"))).status, 400, "đơn nháp: chưa có bản chụp chốt bên đặt");
  const ten = await thu(w, HDV, id, mat(100_000, { partyId: `pty-${PT}` }));
  assert.equal(ten.status, 400, "người không phải Kế toán chỉ ghi chính mình / Công ty / hai lựa chọn khai");
});

test("Đối tác chỉ tự ghi chính mình (người kiểm Task 5 I-2; Ruling R-P12 — ADR-0132 Hệ quả): «khách trả tại quầy» ⇒ 400; «khách trả cho đại lý» khi bên đặt không phải chính mình (khách lẻ / đại lý khác) ⇒ 400 CÙNG một câu, không lộ ai; bên đặt là chính mình ⇒ như «tôi» (BOOKER, giữ hộ ngay, không dấu chờ); tài khoản lai Bán hàng + Đối tác y hệt", async () => {
  const { w, ct } = await setup();
  const LAI = "88888888-8888-4888-8888-888888888888";
  seedStaff(w.sqlite, { id: LAI, phone: "0900000012", name: "Sơn Lai Bán", perms: ["SALES", "PARTNER"] });
  const DLB = "pty-dl-b";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại Lý B', 1, ?, ?)").run(DLB, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-bk-dlb', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(DLB, AT, AT);
  const CAU = "Tài khoản đối tác chỉ ghi được khoản do chính mình thu.";
  const hai = [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 1_000_000 }, { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 }];
  const tuChoi = async (as: string, orderId: string, nguoiThu: unknown, ten: string) => {
    const truoc = n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", orderId);
    const r = await thu(w, as, orderId, mat(100_000, nguoiThu));
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.message, CAU, ten);
    assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", orderId), truoc, `${ten}: không ghi lần thu`);
  };
  const minh = await donXacNhan(w, { owner: PT, dichVu: hai });
  await tuChoi(PT, minh.id, { nhaCungCapPartyId: NCC }, "Đối tác chọn quầy nhà cung cấp");
  await tuChoi(PT, minh.id, { nhaCungCapPartyId: `pty-${SALES}` }, "hồ sơ không bán dòng nào: CÙNG câu — 400 không dò được ai là nhà cung cấp");
  const le = await donXacNhan(w, { owner: PT, booker: null });
  await tuChoi(PT, le.id, "ben_dat", "đơn khách lẻ");
  const khac = await donXacNhan(w, { owner: PT, booker: DLB });
  await tuChoi(PT, khac.id, "ben_dat", "bên đặt là đại lý khác");
  const ok = await thu(w, PT, minh.id, mat(300_000, "ben_dat"));
  assert.equal(ok.status, 201, ok.text);
  const r = cuoi(w, minh.id);
  assert.deepEqual(lanThu(w, r), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct }, "bên đặt là chính mình ⇒ như «tôi»");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", r), 0, "không dấu chờ");
  assert.equal(soDu(w, minh.id, ct).get(`pty-${PT}`), 300_000, "giữ hộ ngay trên chính đại lý");
  const lai = await donXacNhan(w, { owner: LAI, dichVu: hai });
  await tuChoi(LAI, lai.id, { nhaCungCapPartyId: NCC }, "tài khoản lai chọn quầy nhà cung cấp");
  await tuChoi(LAI, lai.id, "ben_dat", "tài khoản lai, bên đặt là Đại Lý A");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0, "không lời khai nào của tài khoản giữ quyền Đối tác");
  assert.equal((await thu(w, HDV, lai.id, mat(100_000, "ben_dat"))).status, 201, "HDV vẫn khai được như cũ");
  // Miễn `!laKeToan` (người kiểm vòng 2 (b)): tài khoản Kế toán + Đối tác giữ `ledger.write` ⇒ ghi thẳng như Kế toán (201, không DECLARED, nợ ngay).
  const KTDT = "99999999-9999-4999-8999-999999999999";
  seedStaff(w.sqlite, { id: KTDT, phone: "0900000013", name: "Hà Kế Toán Lai", perms: ["ACCOUNTING", "PARTNER"] });
  const kd = await donXacNhan(w, { dichVu: hai });
  const kb = await thu(w, KTDT, kd.id, mat(100_000, "ben_dat"));
  assert.equal(kb.status, 201, kb.text);
  const rkb = cuoi(w, kd.id);
  assert.deepEqual(lanThu(w, rkb), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct });
  const kn = await thu(w, KTDT, kd.id, mat(200_000, { nhaCungCapPartyId: NCC }));
  assert.equal(kn.status, 201, kn.text);
  const rkn = cuoi(w, kd.id);
  assert.deepEqual(lanThu(w, rkn), { vai: "SUPPLIER", nguoi: NCC, cho: NCC });
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id IN (?, ?)", rkb, rkn), 0, "ghi thẳng, không lời khai");
  assert.deepEqual([soDu(w, kd.id, ct).get(`pty-${PT}`), soDu(w, kd.id, ct).get(NCC)], [100_000, 200_000], "nợ giữ hộ sinh ngay");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// «Thu cho ai» (collected_for_party_id — ADR-0078 điều 9)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("«Thu cho ai»: SUPPLIER ⇒ luôn nhà cung cấp đó (lời khai chờ xác nhận); lễ tân «tôi» + thu cho i-resort ⇒ thu cho i-resort; không chọn ⇒ công ty chủ; chọn sai ⇒ 400", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, dichVu: [{ ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 }] });
  assert.equal((await thu(w, HDV, id, mat(300_000, { nhaCungCapPartyId: NCC }))).status, 201);
  const rq = cuoi(w, id);
  assert.deepEqual(lanThu(w, rq), { vai: "SUPPLIER", nguoi: NCC, cho: NCC });
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'DECLARED'", rq), 1);
  assert.deepEqual((await choSo(w)).map((x) => [x.loai, x.benKia]), [["nha_cung_cap", "i-resort"]]);
  assert.match((await tien(w, id, HDV)).lyDoChuaGiao?.cau ?? "", /khách trả tại quầy i-resort/);
  // Ghi chú điều phối 8: người xem giữ quyền Đối tác nhận cụm chung — không tên nhà cung cấp.
  const cauDoiTac = (await tien(w, id, PT)).lyDoChuaGiao?.cau ?? "";
  assert.match(cauDoiTac, /khách trả tại quầy nhà cung cấp/);
  assert.doesNotMatch(cauDoiTac, /i-resort/);
  // Sửa 3 sau rà soát 24/10 (Ruling R-155): tài khoản giữ quyền Đối tác không gửi «thu cho» ⇒ lễ tân báo, Kế toán ghi giúp (người thu = hồ sơ lễ tân, thu cho i-resort).
  assert.equal((await thu(w, PT, id, mat(200_000, "toi", { thuChoNhaCungCapPartyId: NCC }))).status, 403);
  assert.equal((await thu(w, KT, id, mat(200_000, { partyId: `pty-${PT}` }, { thuChoNhaCungCapPartyId: NCC }))).status, 201);
  assert.deepEqual(lanThu(w, cuoi(w, id)), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: NCC });
  assert.equal((await thu(w, PT, id, mat(50_000, "toi"))).status, 201);
  assert.deepEqual(lanThu(w, cuoi(w, id)), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct });
  assert.equal((await thu(w, HDV, id, mat(10_000, "toi", { thuChoNhaCungCapPartyId: `pty-${SALES}` }))).status, 400, "thu cho hồ sơ không bán dòng nào");
  assert.equal((await thu(w, KT, id, mat(100_001, { partyId: `pty-${PT}` }, { thuChoNhaCungCapPartyId: NCC }))).status, 400, "thu cho nhà cung cấp quá phần chưa thu (600.000 − 300.000 − 200.000)");
  assert.equal((await thu(w, HDV, id, mat(10_000, { nhaCungCapPartyId: NCC }, { thuChoNhaCungCapPartyId: ct }))).status, 400, "quầy nhà cung cấp thu thì thu cho chính nhà cung cấp");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Mã giao dịch (ADR-0132 điều 4, tiêu chí 4)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0132 tiêu chí 4: BOOKER chuyển khoản — Kế toán «Bên kia đã nhận» không mã ⇒ 200 (gửi mã ⇒ 400); SQL tay chèn CONFIRMED không mã: BOOKER qua, COMPANY bị chặn", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w);
  assert.equal((await thu(w, HDV, id, { soTien: 100_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "ben_dat" })).status, 201);
  const r = cuoi(w, id);
  for (const than of [{ maGiaoDich: "FT0001", soThucChuyen: 100_000 }, { maGiaoDich: "FT0001" }, { soThucChuyen: 100_000 }]) {
    const coMa = await benKia(w, r, than);
    assert.equal(coMa.status, 400, `tiền vào tài khoản bên kia — công ty không có mã (${JSON.stringify(than)})`);
  }
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'CONFIRMED'", r), 0);
  const x = await benKia(w, r);
  assert.equal(x.status, 200, x.text);
  // SQL chạy tay (lớp CSDL): cặp đối chứng trên khoản còn DECLARED.
  const don2 = await donXacNhan(w);
  assert.equal((await thu(w, HDV, don2.id, { soTien: 100_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "ben_dat" })).status, 201);
  const rb = cuoi(w, don2.id);
  assert.equal((await thu(w, HDV, don2.id, { soTien: 100_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const rc = cuoi(w, don2.id);
  const confirm = (rid: string) => w.sqlite.prepare(`INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)`).run(uuid(), rid, vnHomNay(), AT, KT, AT, KT);
  assert.doesNotThrow(() => confirm(rb), "BOOKER chuyển khoản không mã: không bị chặn");
  assert.throws(() => confirm(rc), /bank_txn_required/, "COMPANY chuyển khoản không mã: vẫn bị chặn");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Kế toán chọn hồ sơ (đặc tả P4 «Kế toán / Toàn quyền»)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("Kế toán chọn hồ sơ: hồ sơ khách trên đơn khách lẻ ⇒ STAFF, không BOOKER; nhà cung cấp của dòng ⇒ SUPPLIER ghi thẳng (thu cho NCC); vượt phần chưa thu ⇒ 400", async () => {
  const { w, ct } = await setup();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-khach-le', 'PERSON', 'Khách Lẻ', 1, ?, ?)").run(AT, AT);
  const le = await donXacNhan(w, { booker: "pty-khach-le", dichVu: [{ ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 }] });
  assert.equal((await thu(w, KT, le.id, mat(100_000, { partyId: "pty-khach-le" }))).status, 201);
  assert.deepEqual(lanThu(w, cuoi(w, le.id)), { vai: "STAFF", nguoi: "pty-khach-le", cho: ct }, "khách lẻ không thành BOOKER");
  assert.equal((await thu(w, KT, le.id, mat(100_000, "ben_dat"))).status, 400, "đơn khách lẻ không có đại lý đặt");
  assert.equal((await thu(w, KT, le.id, mat(600_001, { partyId: NCC }))).status, 400, "nhà cung cấp vượt phần chưa thu (600.000; 100.000 thu cho Tour Đảo không tính)");
  const ok = await thu(w, KT, le.id, mat(600_000, { partyId: NCC }));
  assert.equal(ok.status, 201, ok.text);
  const r = cuoi(w, le.id);
  assert.deepEqual(lanThu(w, r), { vai: "SUPPLIER", nguoi: NCC, cho: NCC });
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", r), 0, "Kế toán ghi thẳng: không lời khai");
  assert.equal(soDu(w, le.id, ct).get(NCC), 600_000, "giữ hộ ngay trên quầy nhà cung cấp");
  assert.equal((await thu(w, KT, le.id, mat(1, { partyId: NCC }))).status, 400, "đã thu đủ phần của nhà cung cấp");
});

test("Sửa 3 sau rà soát (Ruling R-155): tài khoản giữ quyền Đối tác gửi «thu cho» ⇒ 403 MỘT câu cho nhà cung cấp thật, hồ sơ khác, mã sai — không tên, không mã, không ghi gì; «tôi» vẫn được; Bán hàng / Kế toán vẫn dùng «thu cho»", async () => {
  const { w, ct } = await setup();
  const KTDT = "99999999-9999-4999-8999-999999999999";
  seedStaff(w.sqlite, { id: KTDT, phone: "0900000013", name: "Hà Kế Toán Lai", perms: ["ACCOUNTING", "PARTNER"] });
  const { id } = await donXacNhan(w, { owner: PT, dichVu: [VE_HT, VE_IR] });
  const CAU = "Tài khoản có quyền Đối tác không ghi được «thu cho» — báo Kế toán ghi giúp.";
  const tuChoi = async (as: string, nguoiThu: unknown, thuCho: unknown, ten: string) => {
    const truoc = n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id);
    const r = await thu(w, as, id, mat(1_000, nguoiThu, { thuChoNhaCungCapPartyId: thuCho }));
    assert.equal(r.status, 403, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden", ten);
    assert.equal(r.json.error.message, CAU, ten);
    assert.doesNotMatch(r.text, /i-resort|pty-/, `${ten}: không tên, không mã hồ sơ`);
    assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), truoc, `${ten}: không ghi khoản thu`);
  };
  await tuChoi(PT, "toi", NCC, "Đối tác, nhà cung cấp thật của đơn, số nhỏ (khe M-3)");
  await tuChoi(PT, "toi", `pty-${SALES}`, "Đối tác, hồ sơ không bán dòng nào");
  await tuChoi(PT, "toi", "không hợp lệ!", "Đối tác, mã sai dạng");
  await tuChoi(PT, "toi", 12345, "Đối tác, không phải chuỗi");
  await tuChoi(PT, "cong_ty", NCC, "Đối tác, Công ty thu + thu cho");
  await tuChoi(KTDT, { partyId: NCC }, NCC, "tài khoản lai Kế toán + Đối tác");
  assert.equal((await thu(w, PT, id, mat(100_000, "toi", { thuChoNhaCungCapPartyId: "" }))).status, 201, "ô trống = không chọn ⇒ «tôi» như cũ");
  assert.deepEqual(lanThu(w, cuoi(w, id)), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: ct });
  assert.equal((await thu(w, PT, id, mat(100_000, "toi"))).status, 201, "Đối tác tự ghi «tôi»");
  assert.equal((await thu(w, KTDT, id, mat(100_000, { nhaCungCapPartyId: NCC }))).status, 201, "tài khoản lai chọn người thu là quầy (không gửi «thu cho») vẫn như cũ");
  const cuaSales = await donXacNhan(w, { dichVu: [VE_HT, VE_IR] });
  assert.equal((await thu(w, SALES, cuaSales.id, mat(100_000, "toi", { thuChoNhaCungCapPartyId: NCC }))).status, 201, "Bán hàng thuần dùng «thu cho» trên đơn mình");
  assert.deepEqual(lanThu(w, cuoi(w, cuaSales.id)), { vai: "STAFF", nguoi: `pty-${SALES}`, cho: NCC });
  assert.equal((await thu(w, HDV, id, mat(100_000, "toi", { thuChoNhaCungCapPartyId: NCC }))).status, 201, "HDV phụ trách dùng «thu cho»");
  assert.deepEqual(lanThu(w, cuoi(w, id)), { vai: "STAFF", nguoi: `pty-${HDV}`, cho: NCC });
  assert.equal((await thu(w, KT, id, mat(100_000, { partyId: `pty-${PT}` }, { thuChoNhaCungCapPartyId: NCC }))).status, 201, "Kế toán ghi giúp");
  assert.deepEqual(lanThu(w, cuoi(w, id)), { vai: "BOOKER", nguoi: `pty-${PT}`, cho: NCC });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Trần phần của quầy nhà cung cấp tính SAU giảm giá — cùng hàm chia với biên nhận (sửa sau rà soát 24/10, Ruling R-154; ADR-0078 ví dụ B-5; R-81)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const VE_IR = { ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 };
const VE_HT = { ten: "Vé Hòn Tằm", catalog: "HONTAM", khach: 1, donGia: 1_000_000 };
/** Phần của quầy i-resort trên biên nhận: còn phải trả = tong − daTra (số máy chủ chia — `chiaPhanBienNhan`). */
const conTaiQuay = async (w: W, id: string): Promise<number> => {
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: KT });
  assert.equal(r.status, 200, r.text);
  const p = (r.json.receipt.phan as { nguoiBan: string; tong: number; daTra: number }[]).find((x) => x.nguoiBan === "i-resort");
  assert.ok(p, r.text);
  return p.tong - p.daTra;
};

test("B-5 (a) ADR-0078: đơn chỉ vé i-resort 600.000 giảm 20.000 ⇒ quầy ghi 600.000 bị từ chối (nói 580.000 ₫), 580.000 được; biên nhận phần i-resort còn 0, không «trả dư»", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w, { dichVu: [VE_IR], giam: 20_000 });
  assert.equal(await conTaiQuay(w, id), 580_000, "hai nơi: trần = phần còn phải trả trên biên nhận");
  const qua = await thu(w, KT, id, mat(600_000, { partyId: NCC }));
  assert.equal(qua.status, 400, qua.text);
  assert.match(qua.json.error.message, /580\.000 ₫/, "nói phần còn chưa thu sau giảm giá");
  assert.doesNotMatch(qua.text, /480\.000|giá vốn|80%/, "không lộ giá vốn");
  const khai = await thu(w, HDV, id, mat(580_001, { nhaCungCapPartyId: NCC }));
  assert.equal(khai.status, 400, "lời khai của HDV cùng trần");
  assert.equal((await thu(w, KT, id, mat(580_000, { partyId: NCC }))).status, 201);
  assert.equal(await conTaiQuay(w, id), 0);
  const bn = (await w.call("GET", `/api/orders/${id}/receipt`, { as: KT })).json.receipt;
  assert.deepEqual([bn.daTra, bn.conLai], [580_000, 0], "không trả dư");
});

test("B-5 (b) ADR-0078: bên đặt tự thu trước 200.000 (thu cho Tour Đảo) ⇒ quầy vẫn còn trần 580.000; 380.000 được", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, dichVu: [VE_IR], giam: 20_000 });
  assert.equal((await thu(w, PT, id, mat(200_000, "toi"))).status, 201);
  assert.equal(await conTaiQuay(w, id), 380_000, "biên nhận chuyển phần dư của Tour Đảo sang quầy");
  assert.equal((await thu(w, HDV, id, mat(380_000, { nhaCungCapPartyId: NCC }))).status, 201);
  assert.equal((await thu(w, KT, id, mat(200_001, { partyId: NCC }))).status, 400, "trần quầy còn 580.000 − 380.000 = 200.000");
});

test("đơn trộn Hòn Tằm 1.000.000 + i-resort 600.000 giảm 20.000 ⇒ giảm trừ vào phần Tour Đảo, trần quầy vẫn 600.000", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w, { dichVu: [VE_HT, VE_IR], giam: 20_000 });
  assert.equal(await conTaiQuay(w, id), 600_000);
  assert.equal((await thu(w, KT, id, mat(600_001, { partyId: NCC }))).status, 400);
  assert.equal((await thu(w, KT, id, mat(600_000, { partyId: NCC }))).status, 201);
});

test("giảm giá lớn hơn phần Tour Đảo (khách lẻ: Hòn Tằm 100.000 + i-resort 600.000, giảm 150.000) ⇒ phần dư 50.000 trừ vào quầy, trần 550.000 (cùng biên nhận)", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w, { booker: null, dichVu: [{ ...VE_HT, donGia: 100_000 }, VE_IR], giam: 150_000 });
  assert.equal(await conTaiQuay(w, id), 550_000);
  const qua = await thu(w, KT, id, mat(550_001, { partyId: NCC }));
  assert.equal(qua.status, 400, qua.text);
  assert.match(qua.json.error.message, /550\.000 ₫/);
  assert.equal((await thu(w, HDV, id, mat(550_000, "toi", { thuChoNhaCungCapPartyId: NCC }))).status, 201, "«thu cho» của HDV cùng trần");
  assert.equal(await conTaiQuay(w, id), 0);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Danh sách chờ khớp màn đơn (đặc tả P4 «nhánh khoản cũ của PENDING_COMPANY kiểm số dư như khoanChoXacNhan»)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("danh sách chờ = màn đơn: khoản «Công ty thu» tiền mặt cũ đã «Nộp» đủ ⇒ không còn trong PENDING_COMPANY lẫn khoanChoXacNhan; khoản BOOKER khai quá 3 ngày ⇒ bộ đếm nhắc", async () => {
  const { w } = await setup();
  const { id } = await donXacNhan(w, { booker: null });
  assert.equal((await thu(w, HDV, id, mat(300_000, "cong_ty"))).status, 201);
  const r = cuoi(w, id);
  assert.deepEqual((await choSo(w)).map((x) => x.receiptId), [r], "trước khi nộp: chờ ở cả hai nơi");
  assert.deepEqual((await tien(w, id)).keToan.choXacNhan, [r]);
  const nop = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 300_000 }] } });
  assert.equal(nop.status, 201, nop.text);
  assert.deepEqual((await tien(w, id)).keToan.choXacNhan, [], "màn đơn: đã nộp đủ thì hết chờ");
  assert.deepEqual(await choSo(w), [], "danh sách chờ của Kế toán khớp màn đơn");
  assert.deepEqual(await choCoc(w), []);
  // Bộ đếm «quá 3 ngày» của Kế toán gộp khoản loại mới (ADR-0132 Hệ quả).
  const d2 = await donXacNhan(w);
  assert.equal((await thu(w, HDV, d2.id, mat(100_000, "ben_dat"))).status, 201);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const rid = uuid();
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
    reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 50000, ?, 'BOOKER', 'CASH', ?, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?)`)
    .run(rid, d2.id, `pty-${PT}`, ct, lui(4), AT, HDV, AT, HDV);
  w.sqlite.prepare("INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'DECLARED', ?, ?, ?, ?, ?)")
    .run(uuid(), rid, lui(4), AT, HDV, AT, HDV);
  assert.equal((await w.call("GET", "/api/ledger/coc/dem", { as: KT })).json.doiChieuQua3Ngay, 1);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// P10 — «Thay lần thu» và «Công ty đã nhận» sau «Đã giao» không bị hàng rào giữ hộ chặn nhầm vì dòng thương mại
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("P10 C-1: Thay lần thu sau «Đã giao» đổi người thu 3.000.000 từ đại lý sang HDV ⇒ 201; đại lý −250.000, HDV 1.750.000 + 3.000.000", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, giam: 250_000, dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 5_000_000 }] });
  assert.equal((await thu(w, PT, id, mat(3_000_000, "toi"))).status, 201);
  const rDl = cuoi(w, id);
  assert.equal(lanThu(w, rDl).vai, "BOOKER");
  assert.equal((await thu(w, HDV, id, mat(1_750_000, "toi"))).status, 201);
  assert.equal((await giao(w, id)).status, 200);
  assert.deepEqual([soDu(w, id, ct).get(`pty-${PT}`), soDu(w, id, ct).get(`pty-${HDV}`)], [2_750_000, 1_750_000]);
  const r = await thay(w, { orderId: id, cu: [rDl], moi: [mat(3_000_000, { partyId: `pty-${HDV}` })], lyDo: "Khách đưa tiền cho HDV, không phải đại lý" });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual([soDu(w, id, ct).get(`pty-${PT}`), soDu(w, id, ct).get(`pty-${HDV}`)], [-250_000, 4_750_000]);
});

test("P10 SV-HT-03: HDV khai «khách trả tại quầy i-resort» 400.000 ⇒ Kế toán «Bên kia đã nhận» ⇒ «Đã giao» ⇒ Tour Đảo nợ i-resort 80.000; Thay lần thu đổi 400.000 sang lễ tân ⇒ 201", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, dichVu: [{ ten: "Vé tắm bùn i-resort", catalog: "IRESORT", khach: 2, donGia: 300_000 }] });
  assert.equal((await thu(w, PT, id, mat(200_000, "toi"))).status, 201, "lễ tân (bên đặt) thu trước 200.000");
  assert.equal((await thu(w, HDV, id, mat(400_000, { nhaCungCapPartyId: NCC }))).status, 201);
  const rq = cuoi(w, id);
  assert.equal((await tien(w, id, KT)).keToan.choBenKia.length, 1, "đơn trong ô chờ đối chiếu của Kế toán");
  assert.equal((await giao(w, id)).status, 409, "đang đối chiếu");
  assert.equal((await benKia(w, rq)).status, 200);
  assert.equal((await giao(w, id)).status, 200);
  assert.equal(soDu(w, id, ct).get(NCC), 400_000 - 480_000, "Tour Đảo nợ i-resort 80.000");
  const r = await thay(w, { orderId: id, cu: [rq], moi: [mat(400_000, { partyId: `pty-${PT}` })], lyDo: "Khách trả lễ tân, không trả tại quầy" });
  assert.equal(r.status, 201, r.text);
  assert.equal(soDu(w, id, ct).get(NCC), -480_000);
});

test("P10 «Công ty đã nhận» sau «Đã giao»: tài khoản đại lý khai «Công ty thu» tiền mặt 3.000.000 (H3), «Đã giao», Kế toán xác nhận ⇒ 200; đại lý −250.000", async () => {
  const { w, ct } = await setup();
  const { id } = await donXacNhan(w, { owner: PT, giam: 250_000, dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 5_000_000 }] });
  assert.equal((await thu(w, PT, id, mat(3_000_000, "cong_ty"))).status, 201);
  const r = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, mat(1_750_000, "toi"))).status, 201);
  assert.equal((await giao(w, id)).status, 200);
  assert.deepEqual((await tien(w, id)).keToan.choXacNhan, [r], "màn đơn vẫn coi là khoản chờ (số dư giữ hộ chỉ cộng HELD / SETTLEMENT / REFUND)");
  const x = await w.call("POST", `/api/ledger/company-receipts/${r}/confirm`, { as: KT, body: {} });
  assert.equal(x.status, 200, x.text);
  assert.equal(soDu(w, id, ct).get(`pty-${PT}`), -250_000);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Hai nơi khớp nhau (mã ↔ SQL): đọc tập từ migration SỐ LỚN NHẤT đang tạo đối tượng và từ hằng TS — sửa một nơi mà quên nơi kia thì đỏ.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const MIG_DIR = new URL("../../../migrations/", import.meta.url);
const MIGS = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
/** Định nghĩa của đối tượng `ten` ở migration số lớn nhất có câu tạo nó (`CREATE TRIGGER|VIEW <ten>` tới câu kết thúc). */
function dinhNghiaMoiNhat(loai: "TRIGGER" | "VIEW", ten: string): string {
  const mo = new RegExp(`CREATE ${loai} ${ten}\\b`);
  const tep = [...MIGS].reverse().find((f) => mo.test(readFileSync(new URL(f, MIG_DIR), "utf8")));
  assert.ok(tep, `không thấy migration tạo ${ten}`);
  const sql = readFileSync(new URL(tep, MIG_DIR), "utf8");
  const tu = sql.search(mo);
  const het = loai === "TRIGGER" ? sql.indexOf("END;", tu) + 4 : sql.indexOf(";", tu) + 1;
  return sql.slice(tu, het);
}
/** Mọi tập chữ trong `IN ('A', 'B', …)` đứng sau `cot` trong `sql`. */
const tapSau = (sql: string, cot: string): string[][] =>
  [...sql.matchAll(new RegExp(`${cot.replace(/\./g, "\\.")}\\s+IN\\s*\\(([^)]*)\\)`, "g"))].map((m) => [...m[1]!.matchAll(/'([A-Z_]+)'/g)].map((x) => x[1]!).sort());

test("hai nơi (P10): soDuGiuHo cộng ĐÚNG tập loại dòng của trigger bil_debt_line_held_once (migration mới nhất) và của nhánh khoản cũ PENDING_COMPANY", () => {
  const trig = tapSau(dinhNghiaMoiNhat("TRIGGER", "bil_debt_line_held_once"), "l.kind_code");
  assert.deepEqual(trig, [["HELD", "REFUND", "SETTLEMENT"]], "trigger có đúng một tập loại dòng");
  assert.deepEqual([...(R.LOAI_DONG_GIU_HO ?? [])].sort(), trig[0], "hằng TS = tập của trigger");
  const repo = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  const pending = repo.slice(repo.indexOf('"pending_company"'), repo.indexOf("export const pendingCompany"));
  assert.deepEqual(tapSau(pending, "b.kind_code"), [trig[0]], "PENDING_COMPANY cùng tập");
  // Mẫu hành vi: dòng thương mại không kéo số dư giữ hộ xuống; dòng quyết toán thì có.
  const dong = [
    { kind: "HELD" as const, debtorPartyId: "dl", creditorPartyId: "ct", amount: 3_000_000 },
    { kind: "HOA_HONG" as const, debtorPartyId: "ct", creditorPartyId: "dl", amount: 500_000 },
    { kind: "GIAM_GIA_BEN_DAT" as const, debtorPartyId: "dl", creditorPartyId: "ct", amount: 250_000 },
    { kind: "GIA_VON" as const, debtorPartyId: "ct", creditorPartyId: "dl", amount: 1 },
  ];
  assert.equal(R.soDuGiuHo(dong, "dl", "ct"), 3_000_000);
  assert.equal(R.soDuGiuHo([...dong, { kind: "SETTLEMENT", debtorPartyId: "ct", creditorPartyId: "dl", amount: 2_750_000 }], "dl", "ct"), 250_000, "KT04: đã nộp số ròng ⇒ còn dưới số dòng giữ hộ");
});

test("hai nơi (ADR-0132 Hệ quả): VAI_DOI_CHIEU của khoanMoiDoiChieu = tập vai «đang đối chiếu» của view v_bil_coc_don và trigger bil_payment_receipt_coc_reversal (migration mới nhất)", () => {
  const view = tapSau(dinhNghiaMoiNhat("VIEW", "v_bil_coc_don"), "r.collector_role_code");
  const trig = tapSau(dinhNghiaMoiNhat("TRIGGER", "bil_payment_receipt_coc_reversal"), "g.collector_role_code");
  assert.equal(view.length, 2, "hai cột (tra, doi_chieu) mỗi cột một vế «đang đối chiếu»");
  assert.equal(trig.length, 1);
  for (const t of [...view, ...trig]) assert.deepEqual([...(R.VAI_DOI_CHIEU ?? [])].sort(), t);
});
