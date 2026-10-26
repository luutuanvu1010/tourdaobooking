// Sổ đại lý đợt 2, Task 4 (ADR-0079 điều 1–6; ADR-0078 điều 5 / A-14; đặc tả P1, P2, P3, P6; Ruling R-P8 của sổ thi công): lô «Đã giao» ghi dòng thương mại
// (HOA_HONG, GIAM_GIA_BEN_DAT, GIA_VON) và hai lớp chặn đơn thiếu bản chụp (lớp 1 = câu «Đã giao» của orders; lớp 2 = trigger `bil_posting_delivered_terms` của 0112).
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs: SQLite với đủ migration; lô `db.batch()` là một giao dịch như D1). Không mạng, không D1.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1 } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";
import { datGiaoStatement } from "./modules/orders/hoan-tat-repo.ts";
import { soDuTheoBen } from "./modules/billing/rules.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // tài khoản Đối tác — hồ sơ pty-<id> mang vai TRAVEL_AGENCY (đại lý A)
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

/** Khung chung: năm tài khoản, đại lý A (vai TRAVEL_AGENCY), mức hoa hồng 10% mọi dịch vụ cho vai đại lý (đặt qua route của Kế toán). */
async function setup(): Promise<{ w: W; ct: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-66666666-6666-4666-8666-6666666666aa', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  return { w, ct: String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id) };
}

interface DvNhap { ten: string; catalog: string | null; khach: number; donGia: number }
/** Đơn NHÁP bằng SQL (ngày đi = hôm nay), người lập `owner`, bên đặt `booker`, giảm giá cấp đơn `giam`. Trả id đơn và id từng dòng dịch vụ. */
function nhap(w: W, o: { owner?: string; booker?: string | null; dichVu?: DvNhap[]; giam?: number } = {}): { id: string; svc: string[] } {
  const id = uuid();
  const dichVu = o.dichVu ?? [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 5_000_000 }];
  const sub = dichVu.reduce((t, d) => t + d.khach * d.donGia, 0);
  const tong = sub - (o.giam ?? 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, o.owner ?? SALES, sub, o.giam ?? 0, tong, tong, o.booker === undefined ? `pty-${PT}` : o.booker, AT, AT);
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
  // ADR-0135: đơn nháp chỉ người lập ghi được (kể cả xác nhận) — xác nhận bằng CHÍNH người lập của đơn gieo.
  const nguoiLap = String(w.q("SELECT staff_id AS s FROM orders WHERE id = ?", id)[0].s);
  const xn = await w.xacNhanDon(id, nguoiLap);
  assert.equal(xn.status, 200, xn.text);
}
/** Đơn cũ (xác nhận TRƯỚC 0090): đổi trạng thái bằng SQL, KHÔNG qua route nên không có bản chụp. */
const xacNhanCu = (w: W, id: string) => w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, id);
const phanCong = (w: W, id: string, hdv = HDV) => w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
  VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${hdv}`, AT, AT, AT);
const thuCongTy = async (w: W, id: string, soTien: number) => {
  const t = await w.call("POST", `/api/orders/${id}/payments`, { as: SUPER, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(t.status, 201, t.text);
};
const daGiao = (w: W, id: string, body: Record<string, unknown> = {}, as = SUPER) => w.call("POST", `/api/orders/${id}/delivered`, { as, body });
const tien = async (w: W, id: string, as = SUPER) => {
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
type Dong = { kind_code: string; debtor_party_id: string; creditor_party_id: string; amount: number; order_service_id: string | null; reverses_line_id: string | null };
const dongThuongMai = (w: W, id: string): Dong[] => w.q(`SELECT l.kind_code, l.debtor_party_id, l.creditor_party_id, l.amount, l.order_service_id, l.reverses_line_id
  FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND p.kind_code = 'DELIVERED' ORDER BY l.rowid`, id).map((r: Dong) => ({ ...r }));
// node:sqlite trả dòng «null prototype» — chép ra đối tượng thường để so deepEqual.
const phieuGiao = (w: W, id: string): { gross_snapshot: number | null; due_snapshot: number }[] =>
  w.q("SELECT gross_snapshot, due_snapshot FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id).map((r: { gross_snapshot: number | null; due_snapshot: number }) => ({ ...r }));
const demSo = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
/** Đơn không «Đã giao»: không mốc, không phiếu Đã giao, không dòng thương mại, không nhật ký order_delivered. */
function chuaGiao(w: W, id: string): void {
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 0);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON')", id), 0);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_delivered'", id), 0);
}

test("đơn đại lý đủ bản chụp, đã thu đủ ⇒ «Đã giao» 200; sổ có HOA_HONG 500.000 công ty → đại lý, mang order_service_id; phiếu mang gross_snapshot (R-P8)", async () => {
  const { w, ct } = await setup();
  const { id, svc } = nhap(w);
  await xacNhan(w, id);
  await thuCongTy(w, id, 5_000_000);
  assert.equal((await tien(w, id)).lyDoChuaGiao, null, "màn đơn: không còn lý do giữ «đơn của đối tác»");
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongThuongMai(w, id), [{ kind_code: "HOA_HONG", debtor_party_id: ct, creditor_party_id: `pty-${PT}`, amount: 500_000, order_service_id: svc[0], reverses_line_id: null }]);
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 5_000_000, due_snapshot: 5_000_000 }]);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_delivered'", id), 1);
  assert.equal(soDuTheoBen(w.q("SELECT debtor_party_id AS debtorPartyId, creditor_party_id AS creditorPartyId, amount FROM bil_debt_line WHERE order_id = ?", id), ct).get(`pty-${PT}`), -500_000, "công ty nợ đại lý 500.000");
});

test("C-1 trọn (ADR-0079): đại lý tự ghi 3.000.000, HDV ghi 1.750.000, giảm giá 250.000 ⇒ «Đã giao»: đại lý nợ 2.750.000, HDV nợ 1.750.000; GIAM_GIA_BEN_DAT = gross − due", async () => {
  const { w, ct } = await setup();
  const { id, svc } = nhap(w, { owner: PT, giam: 250_000 });
  await xacNhan(w, id);
  phanCong(w, id);
  const dl = await w.call("POST", `/api/orders/${id}/payments`, { as: PT, body: { soTien: 3_000_000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(dl.status, 201, dl.text);
  const hdv = await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 1_750_000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(hdv.status, 201, hdv.text);
  const g = await daGiao(w, id, {}, HDV);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongThuongMai(w, id), [
    { kind_code: "HOA_HONG", debtor_party_id: ct, creditor_party_id: `pty-${PT}`, amount: 500_000, order_service_id: svc[0], reverses_line_id: null },
    { kind_code: "GIAM_GIA_BEN_DAT", debtor_party_id: `pty-${PT}`, creditor_party_id: ct, amount: 250_000, order_service_id: null, reverses_line_id: null },
  ]);
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 5_000_000, due_snapshot: 4_750_000 }]);
  const so = soDuTheoBen(w.q("SELECT debtor_party_id AS debtorPartyId, creditor_party_id AS creditorPartyId, amount FROM bil_debt_line WHERE order_id = ?", id), ct);
  assert.deepEqual([so.get(`pty-${PT}`), so.get(`pty-${HDV}`)], [2_750_000, 1_750_000]);
});

test("Review Focus 4: bớt khách sau xác nhận làm hoa hồng < giảm giá ⇒ KHÔNG chặn; GIAM_GIA_BEN_DAT = gross − due đúng từng đồng (lưới (iv) của 0112 nhận)", async () => {
  const { w, ct } = await setup();
  const { id, svc } = nhap(w, { dichVu: [{ ten: "Vé Hòn Tằm", catalog: "HONTAM", khach: 2, donGia: 1_000_000 }], giam: 150_000 });
  await xacNhan(w, id);
  phanCong(w, id);
  const sua = await w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: HDV, body: { reason: "Khách bớt người", services: [{ id: svc[0], pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, sua.text);
  const t = await tien(w, id);
  assert.equal(t.phaiThu, 850_000, "1.000.000 − 150.000");
  await thuCongTy(w, id, 850_000);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 1_000_000, due_snapshot: 850_000 }]);
  assert.deepEqual(dongThuongMai(w, id).map((d) => [d.kind_code, d.amount]), [["HOA_HONG", 100_000], ["GIAM_GIA_BEN_DAT", 150_000]], "hoa hồng 10% × 1.000.000 < giảm giá 150.000 — đại lý chịu phần chênh");
  assert.equal(soDuTheoBen(w.q("SELECT debtor_party_id AS debtorPartyId, creditor_party_id AS creditorPartyId, amount FROM bil_debt_line WHERE order_id = ?", id), ct).get(`pty-${PT}`), 50_000);
});

test("Review Focus 2: đơn đại lý có MỘT dòng nhập tay ⇒ 409, lý do terms_missing «ghi mức tay» (Kế toán); Kế toán ghi tay ⇒ «Đã giao» được", async () => {
  const { w, ct } = await setup();
  const { id, svc } = nhap(w, { dichVu: [{ ten: "Tour đảo", catalog: "HONTAM", khach: 1, donGia: 5_000_000 }, { ten: "Xe đưa đón riêng", catalog: null, khach: 1, donGia: 800_000 }] });
  await xacNhan(w, id);
  await thuCongTy(w, id, 5_800_000);
  const CAU = "Thiếu mức hoa hồng / người bán cho Xe đưa đón riêng — Kế toán ghi mức tay cho dòng này.";
  const t = await tien(w, id);
  assert.deepEqual([t.lyDoChuaGiao?.ma, t.lyDoChuaGiao?.cau, t.lyDoChuaGiao?.aiXuLy, t.coTheGiao], ["terms_missing", CAU, "Kế toán", false]);
  const g = await daGiao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.deepEqual([g.json.error.code, g.json.error.message], ["not_deliverable", CAU]);
  chuaGiao(w, id);
  // Kế toán / Toàn quyền ghi tay dòng nhập tay: Tour Đảo bán, hoa hồng 0 (route thật của orders).
  const tay = await w.call("POST", `/api/orders/${id}/thuong-mai/${svc[1]}`, { as: SUPER, body: { lyDo: "Xe riêng Tour Đảo tự chạy, không hoa hồng", nguoiBan: { partyId: ct }, hoaHong: { kieu: "RATE", tyLeBp: 0 } } });
  assert.equal(tay.status, 200, tay.text);
  const g2 = await daGiao(w, id);
  assert.equal(g2.status, 200, g2.text);
  assert.deepEqual(dongThuongMai(w, id).map((d) => [d.kind_code, d.amount, d.order_service_id]), [["HOA_HONG", 500_000, svc[0]]], "dòng nhập tay hoa hồng 0 ⇒ không dòng");
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 5_800_000, due_snapshot: 5_800_000 }]);
});

/** Nhà cung cấp i-resort bán dịch vụ IRESORT với tỷ lệ mua lại `tyLeMuaBp` (route thật của Kế toán — `prc_supply_term`). */
async function nhaCungCap(w: W, tyLeMuaBp: number): Promise<string> {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'I-Resort', 'perPax', 1000000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const r = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp, tuNgay: "2026-01-01" } });
  assert.equal(r.status, 201, r.text);
  return "pty-ncc";
}

test("dịch vụ do nhà cung cấp bán (a% = 80%) ⇒ «Đã giao» ghi GIA_VON công ty → NCC 1.600.000 cạnh HOA_HONG 200.000, cùng order_service_id", async () => {
  const { w, ct } = await setup();
  const ncc = await nhaCungCap(w, 8000);
  const { id, svc } = nhap(w, { dichVu: [{ ten: "I-Resort", catalog: "IRESORT", khach: 2, donGia: 1_000_000 }] });
  await xacNhan(w, id);
  await thuCongTy(w, id, 2_000_000);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongThuongMai(w, id), [
    { kind_code: "HOA_HONG", debtor_party_id: ct, creditor_party_id: `pty-${PT}`, amount: 200_000, order_service_id: svc[0], reverses_line_id: null },
    { kind_code: "GIA_VON", debtor_party_id: ct, creditor_party_id: ncc, amount: 1_600_000, order_service_id: svc[0], reverses_line_id: null },
  ]);
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 2_000_000, due_snapshot: 2_000_000 }]);
});

test("hoa hồng 10% + giá vốn 95% vượt giá bán ⇒ 409 terms_exceed_price có tên dịch vụ (Kế toán) — không phiếu, không dòng", async () => {
  const { w } = await setup();
  await nhaCungCap(w, 9500);
  const { id } = nhap(w, { dichVu: [{ ten: "I-Resort", catalog: "IRESORT", khach: 1, donGia: 1_000_000 }] });
  await xacNhan(w, id);
  await thuCongTy(w, id, 1_000_000);
  const CAU = "Mức hoa hồng / giá vốn cài cho I-Resort vượt giá bán — Kế toán xem lại.";
  const t = await tien(w, id);
  assert.deepEqual([t.lyDoChuaGiao?.ma, t.lyDoChuaGiao?.cau, t.lyDoChuaGiao?.aiXuLy], ["terms_exceed_price", CAU, "Kế toán"]);
  const g = await daGiao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.deepEqual([g.json.error.code, g.json.error.message], ["not_deliverable", CAU]);
  chuaGiao(w, id);
});

test("đơn đại lý xác nhận trước 0090, chưa chụp ⇒ 409 terms_missing, câu «Chụp bù» (bài 9 cũ của da-giao-khe-hoa-hong siết lại tới đây)", async () => {
  const { w } = await setup();
  const { id } = nhap(w);
  xacNhanCu(w, id);
  await thuCongTy(w, id, 5_000_000);
  const CAU = "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù.";
  assert.deepEqual([(await tien(w, id)).lyDoChuaGiao?.ma, (await tien(w, id)).lyDoChuaGiao?.cau], ["terms_missing", CAU]);
  const g = await daGiao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.message, CAU);
  chuaGiao(w, id);
});

test("đơn KHÁCH LẺ: bản chụp NONE + người bán SET ⇒ «Đã giao» như cũ, không dòng thương mại, phiếu vẫn mang gross_snapshot (R-P8); cũ đã qua b1 (bản AUTO / NONE) ⇒ cũng được", async () => {
  const { w } = await setup();
  const moi = nhap(w, { booker: null, giam: 100_000 });
  await xacNhan(w, moi.id);
  await thuCongTy(w, moi.id, 4_900_000);
  assert.equal((await daGiao(w, moi.id)).status, 200);
  assert.deepEqual(dongThuongMai(w, moi.id), [], "giảm giá đơn khách lẻ do Tour Đảo chịu — không dòng");
  assert.deepEqual(phieuGiao(w, moi.id), [{ gross_snapshot: 5_000_000, due_snapshot: 4_900_000 }]);
  // Đơn cũ đã qua b1 (0113 chụp bù: NONE + người bán công ty chủ, AUTO) — dùng hàm gieo chung (cùng hình bản chụp b1).
  const cu = nhap(w, { booker: null });
  xacNhanCu(w, cu.id);
  gieoBanChup(w.sqlite, cu.id);
  await thuCongTy(w, cu.id, 5_000_000);
  assert.equal((await daGiao(w, cu.id)).status, 200);
  assert.deepEqual(dongThuongMai(w, cu.id), []);
  assert.deepEqual(phieuGiao(w, cu.id), [{ gross_snapshot: 5_000_000, due_snapshot: 5_000_000 }]);
});

test("đơn KHÁCH LẺ có dịch vụ nhập tay chưa ai ghi tay người bán ⇒ 409 terms_missing (A-14 đã duyệt — hệ quả phải nói với người dùng)", async () => {
  const { w } = await setup();
  const { id } = nhap(w, { booker: null, dichVu: [{ ten: "Thuê ca nô riêng", catalog: null, khach: 1, donGia: 3_000_000 }] });
  await xacNhan(w, id);
  await thuCongTy(w, id, 3_000_000);
  const g = await daGiao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.message, "Thiếu mức hoa hồng / người bán cho Thuê ca nô riêng — Kế toán ghi mức tay cho dòng này.");
  assert.equal((await tien(w, id)).lyDoChuaGiao?.ma, "terms_missing");
  chuaGiao(w, id);
});

test("lần thu kèm «Đã giao» (HDV thu nốt tại cảng) ⇒ phiếu Đã giao vẫn mang gross_snapshot (R-P8) và dòng hoa hồng", async () => {
  const { w } = await setup();
  const { id } = nhap(w);
  await xacNhan(w, id);
  phanCong(w, id);
  await thuCongTy(w, id, 2_000_000);
  const g = await daGiao(w, id, { lanThu: { soTien: 3_000_000, hinhThuc: "CASH", nguoiThu: "toi" } }, HDV);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(phieuGiao(w, id), [{ gross_snapshot: 5_000_000, due_snapshot: 5_000_000 }]);
  assert.deepEqual(dongThuongMai(w, id).map((d) => [d.kind_code, d.amount]), [["HOA_HONG", 500_000]]);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND stage_code = 'AT_DELIVERY'", id), 1);
});

/** Chạy THẲNG câu «Đã giao» của orders (lớp 1), không qua bước kiểm trước của route. Trả số dòng đổi. */
async function chayCauDaGiao(w: W, id: string): Promise<number> {
  const o = w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0] as { updated_at: string };
  const kq = await datGiaoStatement(fakeD1(w.sqlite) as unknown as D1Database, {
    orderId: id, at: new Date().toISOString(), by: SUPER, expectedUpdatedAt: o.updated_at, expectedAdjSeq: 0, homNay: vnHomNay(), sauCauBaoVe: false,
  }).run();
  return (kq.meta as { changes: number }).changes;
}
type Cau = { sql: string; args: unknown[]; bind: (...a: unknown[]) => Cau };
/** Lô «Đã giao» của route (có câu đặt mốc của orders) — `chenTruocLo` của khung thử chạy NGAY TRƯỚC lô đó (lô khác của cùng request, vd lớp vé, không bị đụng). */
const laLoDaGiao = (stmts: Cau[]): boolean => stmts.some((c) => /^UPDATE orders SET delivered_at/.test(c.sql));
const chenPhieuGiaoTay = (w: W, id: string) => w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, due_snapshot, gross_snapshot, created_at, updated_at)
  VALUES (?, 'DELIVERED', ?, ?, 0, 0, ?, ?)`).run(uuid(), id, vnHomNay(), AT, AT);

test("hai lớp chặn: lớp 1 — câu «Đã giao» chạy tay cho đơn chưa chụp / bản chụp thiếu mức ⇒ 0 dòng đổi; đủ mức ⇒ 1. Lớp 2 — INSERT phiếu DELIVERED chạy tay ⇒ delivered_terms", async () => {
  const { w } = await setup();
  const chuaChup = nhap(w);
  xacNhanCu(w, chuaChup.id);
  assert.equal(await chayCauDaGiao(w, chuaChup.id), 0, "lớp 1: đơn còn dòng trong v_ord_terms_uncaptured");
  assert.throws(() => chenPhieuGiaoTay(w, chuaChup.id), /delivered_terms:/, "lớp 2: trigger bil_posting_delivered_terms");
  const nhapTay = nhap(w, { booker: null, dichVu: [{ ten: "Ca nô", catalog: null, khach: 1, donGia: 1_000_000 }] });
  await xacNhan(w, nhapTay.id);
  assert.equal(await chayCauDaGiao(w, nhapTay.id), 0, "lớp 1: đơn còn dòng trong v_ord_terms_missing (người bán MISSING)");
  assert.throws(() => chenPhieuGiaoTay(w, nhapTay.id), /delivered_terms:/);
  const du = nhap(w);
  await xacNhan(w, du.id);
  assert.equal(await chayCauDaGiao(w, du.id), 1, "đơn đại lý đủ mức: lớp 1 KHÔNG chặn (đợt 2 mở «Đã giao» cho đơn có người hưởng)");
});

test("lớp 2 + dịch lỗi: mã «quên lớp 1» (câu UPDATE không điều kiện bản chụp) và bản chụp vừa bị thay bằng bản thiếu mức ⇒ 409 lời thường, cả lô huỷ, không mã thô", async () => {
  const { w, ct } = await setup();
  const { id, svc } = nhap(w);
  await xacNhan(w, id);
  await thuCongTy(w, id, 5_000_000);
  let daChen = false;
  w.chenTruocLo(laLoDaGiao, (stmts: Cau[]) => {
    daChen = true;
    // Người khác đổi bản chụp giữa lúc route đọc và lúc ghi (bản AUTO mới thay bản hiện hành, thiếu mức) …
    const hien = w.q("SELECT id FROM ord_service_terms t WHERE t.order_service_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)", svc[0])[0].id;
    w.sqlite.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, supply_status, seller_party_id, supply_term_id, source,
      supersedes_id, captured_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'MISSING', 'NO_RULE', 'SET', ?, 'prc-st-goc-all', 'AUTO', ?, ?, ?, ?)`).run(uuid(), id, svc[0], `pty-${PT}`, ct, hien, vnHomNay(), AT, AT);
    // … và câu «Đã giao» là bản «quên lớp 1» (giả mã mới viết sai) — chỉ lớp 2 (trigger) còn canh.
    const i = stmts.findIndex((c) => /^UPDATE orders SET delivered_at/.test(c.sql));
    stmts[i] = w.env.DB.prepare("UPDATE orders SET delivered_at = ?1, delivered_by = ?2, updated_at = ?1 WHERE id = ?3").bind(stmts[i]!.args[0], stmts[i]!.args[1], stmts[i]!.args[2]);
  });
  const g = await daGiao(w, id);
  assert.ok(daChen, "đã chen đúng lô Đã giao");
  assert.equal(g.status, 409, g.text);
  assert.deepEqual([g.json.error.code, g.json.error.message], ["not_deliverable", "Thiếu mức hoa hồng / người bán cho một dịch vụ của đơn — Kế toán ghi mức tay cho dòng này."]);
  assert.doesNotMatch(g.text, /delivered_terms|SQLITE/);
  chuaGiao(w, id);
});

test("cố ý hỏng MỘT dòng trong lô (hoa hồng vượt thành tiền) ⇒ trigger (iii) huỷ CẢ lô: không mốc, không lần thu kèm, không phiếu, không dòng, không nhật ký; câu lời thường", async () => {
  const { w } = await setup();
  const { id } = nhap(w);
  await xacNhan(w, id);
  phanCong(w, id);
  await thuCongTy(w, id, 4_000_000);
  let daHong = false;
  w.chenTruocLo(laLoDaGiao, (stmts: Cau[]) => {
    const i = stmts.findIndex((c) => /^INSERT INTO bil_debt_line/.test(c.sql) && c.args[5] === "HOA_HONG");
    assert.ok(i > 0, "lô phải có dòng hoa hồng");
    const a = [...stmts[i]!.args];
    a[4] = 5_000_001; // > gross_snapshot 5.000.000
    stmts[i] = stmts[i]!.bind(...a);
    daHong = true;
  });
  const truoc = demSo(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id);
  const g = await daGiao(w, id, { lanThu: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" } }, HDV);
  assert.ok(daHong, "đã hỏng đúng lô Đã giao");
  assert.equal(g.status, 409, g.text);
  // Sổ đại lý đợt 2 Task 9 (I-1 người kiểm Task 3+4): người bấm là HDV (không `supply.terms.view`) ⇒ câu chung không nói tới giá vốn; câu đủ của Kế toán ở
  // src/so-la-doi-tac.test.ts «Task 9 (3)».
  assert.deepEqual([g.json.error.code, g.json.error.message], ["not_deliverable", "Đơn đang chờ Kế toán xem lại mức của một dịch vụ."]);
  chuaGiao(w, id);
  assert.equal(demSo(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), truoc, "lần thu kèm không được lưu");
  assert.equal(demSo(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'payment_recorded'", id), 1, "chỉ nhật ký của lần thu trước");
});

test("bên thua khoá lạc quan (đơn đổi giữa lúc đọc và lúc ghi) khi lô CÓ dòng thương mại ⇒ 409 stale, không phiếu, không dòng, không nhật ký", async () => {
  const { w } = await setup();
  const { id } = nhap(w);
  await xacNhan(w, id);
  await thuCongTy(w, id, 5_000_000);
  let daDoi = false;
  w.chenTruocLo(laLoDaGiao, () => {
    w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run("2026-10-02T00:00:00.000Z", id);
    daDoi = true;
  });
  const g = await daGiao(w, id);
  assert.ok(daDoi, "đã đổi đơn ngay trước lô Đã giao");
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "stale");
  chuaGiao(w, id);
});
