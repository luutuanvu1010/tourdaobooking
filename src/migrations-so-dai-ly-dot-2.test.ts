// Kiểm migration *_so_dai_ly_dot_2.sql (sổ đại lý đợt 2 — ADR-0079 điều 2, 5, 6; ADR-0132; đặc tả docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md
// P1, P3, P4, P10). SQL chạy THẲNG trên khung thử `world()` (SQLite thật, KHOÁ NGOẠI BẬT, đủ mọi migration) — không qua máy chủ: chứng minh lớp CSDL chặn được
// SQL chạy tay và lần ghi chen giữa. Mỗi trigger một ca chặn (khẳng định TIỀN TỐ MÃ của câu RAISE — route dịch theo `loiTrigger`, cần `\bmã:`) và ca miễn đúng
// chỗ. Mỗi ca chặn chỉ phạm ĐÚNG MỘT luật (thứ tự chạy của nhiều trigger BEFORE INSERT không được dựa vào): đơn có bản chụp (`gieoBanChup`), đã thu = phải thu.
// Tên người / hồ sơ ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";
import { chenPhieuDieuChinh } from "../tests/audit/dieu-chinh-lib.mjs";
import { soTienCoc, type DebtKind, type ReceiptRow } from "./modules/billing/rules.ts";

const FILES = readdirSync(new URL("../migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort();
const FILE = FILES.find((f) => f.endsWith("_so_dai_ly_dot_2.sql"));
const HDV = "22222222-2222-4222-8222-222222222222";
const KT = "44444444-4444-4444-8444-444444444444";
const DAI_LY = "pty-dai-ly-a";
const IRESORT = "pty-i-resort";
const NGAY = "2026-10-10";
const AT = "2026-10-10T03:00:00.000Z";
type W = ReturnType<typeof world>;
type V = string | number | null;
let seq = 0;
const ma = (p: string) => `${p}-${++seq}`;
const run = (w: W, sql: string, ...a: V[]) => w.sqlite.prepare(sql).run(...a);
const so = (w: W, sql: string, ...a: V[]) => Number((w.sqlite.prepare(sql).get(...a) as { n: number | null } | undefined)?.n ?? 0);

/** Thế giới thử: HDV, Kế toán, một đại lý (người hưởng) và một nhà cung cấp (i-resort) — hồ sơ THẬT vì khoá ngoại bật. `ct` = hồ sơ công ty chủ. */
function khung(): { w: W; ct: string } {
  const w = world();
  seedStaff(w.sqlite, { id: HDV, phone: "0900000002", name: "Nam HDV", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  for (const [id, ten] of [[DAI_LY, "Đại lý A"], [IRESORT, "i-resort"]]) {
    run(w, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)", id, ten, AT, AT);
  }
  return { w, ct: String((w.sqlite.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id) };
}
const pHDV = `pty-${HDV}`;

/** Đơn ĐÃ XÁC NHẬN: mỗi dịch vụ một dòng tiền `gia` (nhapTay = dòng nhập tay, không mã danh mục). KHÔNG gieo bản chụp — bài tự gọi `gieoBanChup`. */
function don(w: W, dichVu: { gia: number; nhapTay?: boolean; maDm?: string }[], giam = 0): { id: string; dv: string[] } {
  const id = ma("don");
  const tong = dichVu.reduce((t, d) => t + d.gia, 0);
  run(w, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`, id, `TD-${id}`, HDV, tong, giam, tong - giam, tong - giam, AT, AT);
  const dv = dichVu.map((d, i) => {
    const s = `${id}-dv${i}`;
    const code = d.nhapTay ? null : (d.maDm ?? "TOUR_DAO");
    run(w, `INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      s, id, i, code, d.nhapTay ? "Dịch vụ nhập tay" : "Tour đảo", d.nhapTay ? "manual" : "perPax", NGAY);
    run(w, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total, sort_order, catalog_code) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?, ?, ?)`,
      `${s}-i`, id, s, d.gia, d.gia, i, code);
    return s;
  });
  run(w, "UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?", AT, AT, id);
  return { id, dv };
}
interface Thu { order: string; amount: number; role: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; collector: string; method?: "CASH" | "BANK_TRANSFER"; reverses?: string; replacement?: string; kind?: string }
/** Lần thu của khách. `created_at` = giờ THẬT (sau mốc R-BIL-D6 vừa áp) để luật mã giao dịch có hiệu lực. */
function thu(w: W, ct: string, t: Thu): string {
  const id = ma("lt");
  const luc = new Date().toISOString();
  run(w, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PREPAID', ?, ?, NULL, ?, ?, ?, ?, ?)`,
    id, t.order, t.kind ?? "CUSTOMER_PAYMENT", t.amount, t.collector, t.role, t.method ?? "CASH", ct, NGAY, t.reverses ?? null, luc, KT, luc, KT, t.replacement ?? null);
  return id;
}
interface Phieu { kind: string; order: string | null; due?: number | null; gross?: number | null; reason?: string | null; id?: string }
function phieu(w: W, p: Phieu): string {
  const id = p.id ?? ma("ph");
  run(w, `INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, due_snapshot, gross_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, p.kind, p.order, p.reason ?? null, NGAY, p.due ?? null, p.gross ?? null, AT, KT, AT, KT);
  return id;
}
interface Dong { posting: string; debtor: string; creditor: string; amount: number; kind: string; order: string; service?: string | null; receipt?: string | null; reverses?: string | null }
function dong(w: W, d: Dong): string {
  const id = ma("dn");
  run(w, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, order_service_id, receipt_id, reverses_line_id,
      created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, d.posting, d.debtor, d.creditor, d.amount, d.kind, d.order, d.service ?? null, d.receipt ?? null, d.reverses ?? null, AT, KT, AT, KT);
  return id;
}
/** Lần thu do Kế toán ghi thẳng cho người cầm tiền ≠ công ty ⇒ phiếu RECEIPT + dòng giữ hộ người cầm → công ty (luật ADR-0026 điều 4). Trả [lần thu, dòng giữ hộ]. */
function thuGiuHo(w: W, ct: string, t: Thu): [string, string] {
  const r = thu(w, ct, t);
  return [r, dong(w, { posting: phieu(w, { kind: "RECEIPT", order: t.order }), debtor: t.collector, creditor: ct, amount: t.amount, kind: "HELD", order: t.order, receipt: r })];
}
const dau = (w: W, receipt: string, kind: "DECLARED" | "CONFIRMED") =>
  run(w, "INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ma("dc"), receipt, kind, NGAY, AT, KT, AT, KT);
/** Số dư cặp trên đơn: dương = `ben` nợ `chu` (gộp mọi loại dòng, kể cả dòng đảo — v_bil_party_balance của 0045). */
const soDu = (w: W, order: string, ben: string, chu: string) =>
  so(w, "SELECT balance AS n FROM v_bil_party_balance WHERE order_id = ? AND party_id = ? AND counterparty_id = ?", order, ben, chu);

/**
 * Lô «Thay lần thu» dựng tay đúng thứ tự của `billing/thay-lan-thu.ts` (ADR-0088 đ2): (1) lần thu mới mang dấu nối + phiếu RECEIPT + dòng giữ hộ; (2) dòng đảo
 * lần thu cũ (dấu nối) rồi phiếu REVERSAL + dòng đảo giữ hộ; (3) phiếu đánh dấu REPLACEMENT (kiểm I1). Đổi người thu cũ sang `moi`.
 */
function thayLanThu(w: W, ct: string, o: { order: string; cu: string; dongGiuHoCu: string; soTien: number; nguoiCu: string; moi: Thu }) {
  const m = ma("thay");
  const rMoi = thu(w, ct, { ...o.moi, replacement: m });
  dong(w, { posting: phieu(w, { kind: "RECEIPT", order: o.order }), debtor: o.moi.collector, creditor: ct, amount: o.soTien, kind: "HELD", order: o.order, receipt: rMoi });
  const goc = w.q("SELECT collector_role_code AS role, collector_party_id AS ai FROM bil_payment_receipt WHERE id = ?", o.cu)[0] as { role: Thu["role"]; ai: string };
  thu(w, ct, { order: o.order, amount: o.soTien, role: goc.role, collector: goc.ai, reverses: o.cu, replacement: m }); // dòng đảo chép người thu của lần thu gốc
  dong(w, { posting: phieu(w, { kind: "REVERSAL", order: o.order, reason: "Thay lần thu ghi nhầm người thu" }), debtor: ct, creditor: o.nguoiCu, amount: o.soTien, kind: "HELD", order: o.order, receipt: o.cu, reverses: o.dongGiuHoCu });
  phieu(w, { id: m, kind: "REPLACEMENT", order: o.order, reason: "Thay lần thu ghi nhầm người thu" });
}

test("migration sổ đại lý đợt 2 tồn tại đúng một tệp, sau migration đối chiếu (0099) và sổ đại lý đợt 1 (0090)", () => {
  assert.ok(FILE, "thiếu migrations/*_so_dai_ly_dot_2.sql");
  assert.equal(FILES.filter((f) => f.endsWith("_so_dai_ly_dot_2.sql")).length, 1);
  assert.ok(FILE! > FILES.find((f) => f.endsWith("_bil_doi_chieu_khoan_cong_ty_thu.sql"))!);
  assert.ok(FILE! > FILES.find((f) => f.endsWith("_so_dai_ly_dot_1.sql"))!);
});

test("bảng tra cứu và mốc: ba loại dòng thương mại, phiếu «Bên kia đã nhận», người thu Nhà cung cấp bật, cột gross_snapshot, năm mốc kiểm định kỳ", () => {
  const { w } = khung();
  const loai = w.q("SELECT code, name, active FROM bil_debt_kind WHERE code IN ('HOA_HONG', 'GIAM_GIA_BEN_DAT', 'GIA_VON') ORDER BY sort_order");
  assert.deepEqual(loai.map((r) => [r.code, r.name, r.active]), [["HOA_HONG", "Hoa hồng", 1], ["GIAM_GIA_BEN_DAT", "Giảm giá bên đặt chịu", 1], ["GIA_VON", "Giá vốn nhà cung cấp", 1]]);
  assert.deepEqual(w.q("SELECT name, active FROM bil_posting_kind WHERE code = 'COUNTERPARTY_CONFIRMED'").map((r) => [r.name, r.active]), [["Bên kia đã nhận", 1]]);
  assert.equal(so(w, "SELECT active AS n FROM bil_collector_role WHERE code = 'SUPPLIER'"), 1);
  assert.ok((w.q("PRAGMA table_info(bil_posting)") as { name: string }[]).some((c) => c.name === "gross_snapshot"));
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  for (const code of ["R-BIL-2", "R-BIL-5", "R-BIL-12", "R-BIL-16"]) assert.match(String(w.q("SELECT cutoff_at FROM bil_audit_cutoff WHERE code = ?", code)[0]?.cutoff_at), iso, code);
  assert.match(String(w.q("SELECT cutoff_at FROM ord_audit_cutoff WHERE code = 'R-ORD-DC1'")[0]?.cutoff_at), iso);
});

test("gross_snapshot (Ruling R-1): chỉ phiếu Đã giao mang, không âm; phiếu Đã giao cũ / NULL vẫn hợp lệ", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 1_000_000 }]);
  gieoBanChup(w.sqlite, o.id);
  thu(w, ct, { order: o.id, amount: 1_000_000, role: "COMPANY", collector: ct });
  assert.throws(() => phieu(w, { kind: "RECEIPT", order: o.id, gross: 1_000_000 }), /CHECK constraint failed/);
  assert.throws(() => phieu(w, { kind: "DELIVERED", order: o.id, due: 1_000_000, gross: -1 }), /CHECK constraint failed/);
  phieu(w, { kind: "DELIVERED", order: o.id, due: 1_000_000, gross: null });
});

test("lớp 2 «Đã giao» (ADR-0079 điều 5): đơn có dòng chưa chụp (v_ord_terms_uncaptured) hoặc bản chụp thiếu người bán (v_ord_terms_missing) ⇒ delivered_terms; đủ bản chụp ⇒ qua", () => {
  const { w, ct } = khung();
  const a = don(w, [{ gia: 600_000 }, { gia: 400_000 }]);
  thu(w, ct, { order: a.id, amount: 1_000_000, role: "COMPANY", collector: ct });
  assert.deepEqual(w.q("SELECT order_id, order_service_id FROM v_ord_terms_uncaptured WHERE order_id = ? ORDER BY order_service_id", a.id).map((r) => [r.order_id, r.order_service_id]),
    a.dv.map((s) => [a.id, s]));
  assert.throws(() => phieu(w, { kind: "DELIVERED", order: a.id, due: 1_000_000, gross: 1_000_000 }), /delivered_terms:/);
  gieoBanChup(w.sqlite, a.id);
  assert.equal(so(w, "SELECT count(*) AS n FROM v_ord_terms_uncaptured WHERE order_id = ?", a.id), 0);
  phieu(w, { kind: "DELIVERED", order: a.id, due: 1_000_000, gross: 1_000_000 });
  // Dòng nhập tay chưa ai ghi tay người bán (A-14): bản chụp thiếu người bán ⇒ giữ.
  const b = don(w, [{ gia: 500_000, nhapTay: true }]);
  gieoBanChup(w.sqlite, b.id, { nhapTay: "thieu" });
  thu(w, ct, { order: b.id, amount: 500_000, role: "COMPANY", collector: ct });
  assert.equal(so(w, "SELECT count(*) AS n FROM v_ord_terms_missing WHERE order_id = ?", b.id), 1);
  assert.equal(so(w, "SELECT count(*) AS n FROM v_ord_terms_uncaptured WHERE order_id = ?", b.id), 0);
  assert.throws(() => phieu(w, { kind: "DELIVERED", order: b.id, due: 500_000, gross: 500_000 }), /delivered_terms:/);
  // Đơn nháp không nằm trong view «chưa chụp».
  run(w, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('don-nhap', 'TD-NHAP', ?, 'draft', 'Khách Giả', '0900000099', 1, 1, 1, ?, ?)`, HDV, AT, AT);
  run(w, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('don-nhap-dv', 'don-nhap', 'Tour', 'perPax', 1, ?)", NGAY);
  assert.equal(so(w, "SELECT count(*) AS n FROM v_ord_terms_uncaptured WHERE order_id = 'don-nhap'"), 0);
});

/** Đơn đủ điều kiện «Đã giao» (bản chụp, đã thu = phải thu) cùng phiếu Đã giao `gross`/`due` — nơi bài chèn dòng thương mại. */
function daGiao(w: W, ct: string, dichVu: { gia: number }[], giam = 0, gross: number | null = dichVu.reduce((t, d) => t + d.gia, 0)) {
  const o = don(w, dichVu, giam);
  gieoBanChup(w.sqlite, o.id);
  const due = dichVu.reduce((t, d) => t + d.gia, 0) - giam;
  thu(w, ct, { order: o.id, amount: due, role: "COMPANY", collector: ct });
  return { ...o, p: phieu(w, { kind: "DELIVERED", order: o.id, due, gross }) };
}

test("(i) HOA_HONG / GIA_VON gốc của phiếu Đã giao bắt buộc dòng dịch vụ; mỗi (phiếu, dòng dịch vụ) tối đa một HOA_HONG và một GIA_VON", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 1_000_000 }, { gia: 1_000_000 }]);
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 100_000, kind: "HOA_HONG", order: g.id }), /commercial_service_required:/);
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 100_000, kind: "GIA_VON", order: g.id }), /commercial_service_required:/);
  dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 100_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] });
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 50_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] }), /UNIQUE constraint failed: bil_debt_line/);
  dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 300_000, kind: "GIA_VON", order: g.id, service: g.dv[0] }); // khác loại: được
  dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 100_000, kind: "HOA_HONG", order: g.id, service: g.dv[1] }); // khác dòng dịch vụ: được
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 1, kind: "GIA_VON", order: g.id, service: g.dv[0] }), /UNIQUE constraint failed: bil_debt_line/);
});

test("(ii) chiều đúng: HOA_HONG, GIA_VON do công ty chủ nợ; GIAM_GIA_BEN_DAT công ty chủ là bên được nợ", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 5_000_000 }], 250_000);
  assert.throws(() => dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 500_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] }), /commercial_wrong_direction:/);
  assert.throws(() => dong(w, { posting: g.p, debtor: IRESORT, creditor: ct, amount: 480_000, kind: "GIA_VON", order: g.id, service: g.dv[0] }), /commercial_wrong_direction:/);
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", order: g.id }), /commercial_wrong_direction:/);
  assert.throws(() => dong(w, { posting: g.p, debtor: DAI_LY, creditor: IRESORT, amount: 1, kind: "HOA_HONG", order: g.id, service: g.dv[0] }), /commercial_wrong_direction:/, "hai bên đều không phải công ty chủ");
  dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 500_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] });
  dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", order: g.id });
});

test("(iii) Σ HOA_HONG + GIA_VON gốc trên phiếu Đã giao ≤ gross_snapshot (bằng thì được)", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 600_000 }, { gia: 400_000 }]);
  dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 100_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] });
  dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 480_000, kind: "GIA_VON", order: g.id, service: g.dv[0] });
  dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 420_000, kind: "GIA_VON", order: g.id, service: g.dv[1] }); // tổng = 1.000.000 = gross
  assert.throws(() => dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 1, kind: "HOA_HONG", order: g.id, service: g.dv[1] }), /commercial_exceeds_gross:/);
});

test("(iv) GIAM_GIA_BEN_DAT gốc = gross_snapshot − due_snapshot đúng từng đồng", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 5_000_000 }], 250_000);
  assert.throws(() => dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 249_999, kind: "GIAM_GIA_BEN_DAT", order: g.id }), /commercial_discount_mismatch:/);
  assert.throws(() => dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 250_001, kind: "GIAM_GIA_BEN_DAT", order: g.id }), /commercial_discount_mismatch:/);
  dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", order: g.id });
});

test("miễn đúng chỗ: dòng đảo một HOA_HONG; phiếu điều chỉnh (GIA_VON không dòng dịch vụ, ví dụ D-3 «A → TĐ 20.000 loại hoa hồng»); phiếu Đã giao cũ gross NULL", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 1_000_000 }]);
  const hh = dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 100_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] });
  const dao = phieu(w, { kind: "REVERSAL", order: g.id, reason: "Kế toán đảo dòng hoa hồng ghi nhầm" });
  dong(w, { posting: dao, debtor: DAI_LY, creditor: ct, amount: 100_000, kind: "HOA_HONG", order: g.id, service: g.dv[0], reverses: hh }); // đổi chỗ hai bên: (ii) không áp
  // (iii) chỉ cộng dòng GỐC của chính phiếu Đã giao: 100.000 + 900.000 = gross ⇒ được.
  dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 900_000, kind: "GIA_VON", order: g.id, service: g.dv[0] });
  // Phiếu điều chỉnh có người thứ hai duyệt (ADR-0115): một dòng GIA_VON không gắn dòng dịch vụ (đơn «Đã giao» lượt 1, M1 = A).
  const a1 = chenPhieuDieuChinh(w.sqlite, { id: ma("dc-gv"), orderId: g.id, reason: "Bổ sung giá vốn i-resort cho đơn cũ", occurredDate: NGAY, at: AT, debtor: ct, creditor: IRESORT, amount: 480_000, kind: "GIA_VON" });
  dong(w, { posting: a1.postingId, debtor: ct, creditor: IRESORT, amount: 480_000, kind: "GIA_VON", order: g.id });
  const a2 = chenPhieuDieuChinh(w.sqlite, { id: ma("dc-hh"), orderId: g.id, reason: "Ví dụ D-3: đại lý hoàn 20.000 hoa hồng", occurredDate: NGAY, at: AT, debtor: DAI_LY, creditor: ct, amount: 20_000, kind: "HOA_HONG" });
  dong(w, { posting: a2.postingId, debtor: DAI_LY, creditor: ct, amount: 20_000, kind: "HOA_HONG", order: g.id });
  // Phiếu Đã giao trước mốc (gross NULL): (ii)–(iv) không áp — sai chiều, vượt phải thu, giảm giá lệch đều qua; (i) VẪN áp.
  const cu = daGiao(w, ct, [{ gia: 300_000 }], 0, null);
  dong(w, { posting: cu.p, debtor: DAI_LY, creditor: ct, amount: 9_000_000, kind: "HOA_HONG", order: cu.id, service: cu.dv[0] });
  dong(w, { posting: cu.p, debtor: ct, creditor: DAI_LY, amount: 7, kind: "GIAM_GIA_BEN_DAT", order: cu.id });
  assert.throws(() => dong(w, { posting: cu.p, debtor: ct, creditor: IRESORT, amount: 1, kind: "GIA_VON", order: cu.id }), /commercial_service_required:/);
});

test("chống thoái lui (ii), (iii) — ghi chú điều phối 10(c): dòng đảo một HOA_HONG nằm NGAY trên phiếu Đã giao vẫn chèn được; (iii) không cộng dòng đảo", () => {
  const { w, ct } = khung();
  const g = daGiao(w, ct, [{ gia: 1_000_000 }]);
  const hh = dong(w, { posting: g.p, debtor: ct, creditor: DAI_LY, amount: 400_000, kind: "HOA_HONG", order: g.id, service: g.dv[0] });
  // (ii): dòng đảo đổi chỗ hai bên (bên nợ = đại lý) — vế `NEW.reverses_line_id IS NULL` của bil_debt_line_commercial_direction miễn nó.
  dong(w, { posting: g.p, debtor: DAI_LY, creditor: ct, amount: 400_000, kind: "HOA_HONG", order: g.id, service: g.dv[0], reverses: hh });
  // (iii): cộng dồn chỉ dòng GỐC (vế `l.reverses_line_id IS NULL`): 400.000 + 600.000 = gross ⇒ được (tính cả dòng đảo thì 1.400.000 > gross).
  dong(w, { posting: g.p, debtor: ct, creditor: IRESORT, amount: 600_000, kind: "GIA_VON", order: g.id, service: g.dv[0] });
});

test("cọc, vế khoản cũ (ghi chú điều phối 10(b)): lần thu bên đặt ghi thẳng có dòng giữ hộ, không dấu ⇒ KHÔNG đang đối chiếu; khoản bên đặt CONFIRMED + dòng giữ hộ của «Bên kia đã nhận» ⇒ đã trả; view = soTienCoc", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 1_000_000 }]);
  thuGiuHo(w, ct, { order: o.id, amount: 300_000, role: "BOOKER", collector: DAI_LY }); // Đối tác / Kế toán ghi thẳng: nợ ngay, không dấu
  const bk = thu(w, ct, { order: o.id, amount: 200_000, role: "BOOKER", collector: DAI_LY });
  dau(w, bk, "DECLARED");
  dau(w, bk, "CONFIRMED");
  dong(w, { posting: phieu(w, { kind: "COUNTERPARTY_CONFIRMED", order: o.id }), debtor: DAI_LY, creditor: ct, amount: 200_000, kind: "HELD", order: o.id, receipt: bk });
  assert.deepEqual({ ...w.q("SELECT da_tra, dang_doi_chieu FROM v_bil_coc_don WHERE order_id = ?", o.id)[0] }, { da_tra: 500_000, dang_doi_chieu: 0 });
  const receipts: ReceiptRow[] = w.q("SELECT id, kind_code, amount, collector_role_code, collector_party_id, reverses_id FROM bil_payment_receipt WHERE order_id = ?", o.id)
    .map((r: { id: string; kind_code: ReceiptRow["kind"]; amount: number; collector_role_code: ReceiptRow["collectorRole"]; collector_party_id: string; reverses_id: string | null }) =>
      ({ id: r.id, kind: r.kind_code, amount: r.amount, collectorRole: r.collector_role_code, collectorPartyId: r.collector_party_id, reversesId: r.reverses_id }));
  const lines = w.q("SELECT id, kind_code, receipt_id, reverses_line_id, debtor_party_id, creditor_party_id, amount FROM bil_debt_line WHERE order_id = ?", o.id)
    .map((l: { id: string; kind_code: DebtKind; receipt_id: string | null; reverses_line_id: string | null; debtor_party_id: string; creditor_party_id: string; amount: number }) =>
      ({ id: l.id, kind: l.kind_code, receiptId: l.receipt_id, reversesLineId: l.reverses_line_id, debtorPartyId: l.debtor_party_id, creditorPartyId: l.creditor_party_id, amount: l.amount }));
  const doiChieu = w.q("SELECT receipt_id, kind_code FROM bil_receipt_recon WHERE receipt_id = ?", bk).map((d: { receipt_id: string; kind_code: "DECLARED" | "CONFIRMED" }) => ({ receiptId: d.receipt_id, kind: d.kind_code }));
  const tinh = soTienCoc({ receipts, lines, duyet: [], hoanNgoai: [], doiChieu });
  assert.deepEqual([tinh.daTra, tinh.dangDoiChieu], [500_000, 0], "hàm TS cùng số với view");
});

test("đối chiếu (ADR-0132 điều 1, 4): DECLARED nhận người thu bên đặt / nhà cung cấp mọi hình thức; mã giao dịch chỉ đòi cho người thu Công ty", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 5_000_000 }]);
  dau(w, thu(w, ct, { order: o.id, amount: 300_000, role: "BOOKER", collector: DAI_LY }), "DECLARED"); // tiền mặt: được
  dau(w, thu(w, ct, { order: o.id, amount: 200_000, role: "SUPPLIER", collector: IRESORT, method: "BANK_TRANSFER" }), "DECLARED");
  assert.throws(() => dau(w, thu(w, ct, { order: o.id, amount: 100_000, role: "STAFF", collector: pHDV }), "DECLARED"), /recon_receipt_invalid:/);
  assert.throws(() => dau(w, thu(w, ct, { order: o.id, amount: 100_000, role: "COMPANY", collector: ct }), "DECLARED"), /recon_receipt_invalid:/, "Công ty thu tiền mặt vẫn theo luật giữ hộ cũ");
  const bk = thu(w, ct, { order: o.id, amount: 300_000, role: "BOOKER", collector: DAI_LY, method: "BANK_TRANSFER" });
  dau(w, bk, "DECLARED");
  dau(w, bk, "CONFIRMED"); // tiền vào tài khoản đại lý: công ty không có mã giao dịch
  const cty = thu(w, ct, { order: o.id, amount: 300_000, role: "COMPANY", collector: ct, method: "BANK_TRANSFER" });
  dau(w, cty, "DECLARED");
  assert.throws(() => dau(w, cty, "CONFIRMED"), /bank_txn_required:/);
});

test("đối chiếu: còn DECLARED vai bên đặt chưa CONFIRMED ⇒ phiếu Đã giao bị delivered_reconciling; Kế toán xác nhận ⇒ qua", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 1_000_000 }]);
  gieoBanChup(w.sqlite, o.id);
  const r = thu(w, ct, { order: o.id, amount: 1_000_000, role: "BOOKER", collector: DAI_LY });
  dau(w, r, "DECLARED");
  assert.throws(() => phieu(w, { kind: "DELIVERED", order: o.id, due: 1_000_000, gross: 1_000_000 }), /delivered_reconciling:/);
  dau(w, r, "CONFIRMED");
  phieu(w, { kind: "DELIVERED", order: o.id, due: 1_000_000, gross: 1_000_000 });
});

/** Huỷ đơn: dòng lý do (Công ty huỷ — không có hạn hoàn) rồi đổi trạng thái, như lô huỷ thật. */
function huy(w: W, order: string) {
  run(w, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'X', 'CONG_TY_HUY', NULL, ?, NULL, 0, ?, ?, ?, ?)`, ma("huy"), order, NGAY, AT, HDV, AT, HDV);
  run(w, "UPDATE orders SET status = 'cancelled' WHERE id = ?", order);
}
const duyet = (w: W, order: string, amount: number) =>
  run(w, `INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'REFUND', ?, NULL, 'Hoàn cọc đơn huỷ', ?, NULL, ?, 'qt', ?, 'qt')`, ma("duyet"), order, amount, NGAY, AT, AT);

test("cọc đơn huỷ (ADR-0132 Hệ quả): lần thu bên đặt / nhà cung cấp còn chờ Kế toán là «đang đối chiếu» trong v_bil_coc_don; đảo nó qua trigger cọc như khoản Công ty chờ hôm nay", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 1_500_000 }]);
  thu(w, ct, { order: o.id, amount: 500_000, role: "COMPANY", collector: ct }); // Kế toán ghi Công ty thu — đã trả
  const bk = thu(w, ct, { order: o.id, amount: 300_000, role: "BOOKER", collector: DAI_LY });
  dau(w, bk, "DECLARED");
  const sp = thu(w, ct, { order: o.id, amount: 100_000, role: "SUPPLIER", collector: IRESORT });
  dau(w, sp, "DECLARED");
  const ck = thu(w, ct, { order: o.id, amount: 200_000, role: "COMPANY", collector: ct, method: "BANK_TRANSFER" });
  dau(w, ck, "DECLARED");
  const v = () => w.q("SELECT da_tra, dang_doi_chieu, con_giu_luc_huy FROM v_bil_coc_don WHERE order_id = ?", o.id)[0];
  assert.deepEqual({ ...v() }, { da_tra: 500_000, dang_doi_chieu: 600_000, con_giu_luc_huy: 500_000 });
  huy(w, o.id);
  duyet(w, o.id, 500_000); // duyệt đúng bằng phần đã trả
  thu(w, ct, { order: o.id, amount: 300_000, role: "BOOKER", collector: DAI_LY, reverses: bk }); // đảo khoản đang đối chiếu: không đụng trần
  thu(w, ct, { order: o.id, amount: 200_000, role: "COMPANY", collector: ct, method: "BANK_TRANSFER", reverses: ck }); // như vai Công ty hôm nay
  assert.deepEqual({ ...v() }, { da_tra: 500_000, dang_doi_chieu: 100_000, con_giu_luc_huy: 500_000 });
  // Lần thu bên đặt ĐÃ được Kế toán xác nhận thì là «đã trả»: đảo nó làm đã trả dưới tổng duyệt ⇒ chặn.
  const o2 = don(w, [{ gia: 1_000_000 }]);
  const bk2 = thu(w, ct, { order: o2.id, amount: 400_000, role: "BOOKER", collector: DAI_LY });
  dau(w, bk2, "DECLARED");
  dau(w, bk2, "CONFIRMED");
  assert.deepEqual({ ...w.q("SELECT da_tra, dang_doi_chieu FROM v_bil_coc_don WHERE order_id = ?", o2.id)[0] }, { da_tra: 400_000, dang_doi_chieu: 0 });
  huy(w, o2.id);
  duyet(w, o2.id, 400_000);
  assert.throws(() => thu(w, ct, { order: o2.id, amount: 400_000, role: "BOOKER", collector: DAI_LY, reverses: bk2 }), /coc_paid_below_approved:/);
});

test("phiếu «Bên kia đã nhận» (COUNTERPARTY_CONFIRMED) là phiếu một đơn: thiếu order_id ⇒ bil_order_required", () => {
  const { w } = khung();
  const o = don(w, [{ gia: 300_000 }]);
  assert.throws(() => phieu(w, { kind: "COUNTERPARTY_CONFIRMED", order: null }), /bil_order_required:/);
  phieu(w, { kind: "COUNTERPARTY_CONFIRMED", order: o.id });
});

test("P10 KT04: giữ hộ 3.000.000 → «Nộp» 3.000.000 → đảo dòng giữ hộ ⇒ held_already_settled (vẫn chặn)", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 3_000_000 }]);
  const [r, g] = thuGiuHo(w, ct, { order: o.id, amount: 3_000_000, role: "STAFF", collector: pHDV });
  dong(w, { posting: phieu(w, { kind: "SETTLEMENT", order: o.id }), debtor: ct, creditor: pHDV, amount: 3_000_000, kind: "SETTLEMENT", order: o.id });
  thu(w, ct, { order: o.id, amount: 3_000_000, role: "STAFF", collector: pHDV, reverses: r });
  assert.throws(() => dong(w, { posting: phieu(w, { kind: "REVERSAL", order: o.id, reason: "Đảo lần thu ghi nhầm" }), debtor: ct, creditor: pHDV, amount: 3_000_000, kind: "HELD", order: o.id, receipt: r, reverses: g }),
    /held_already_settled:/);
});

/** Ví dụ C-1 (ADR-0079): tour 5.000.000, đại lý giảm 250.000; đại lý thu cọc 3.000.000 (BOOKER), HDV thu 1.750.000; «Đã giao»: hoa hồng 500.000, giảm giá bên đặt 250.000. */
function viDuC1(w: W, ct: string) {
  const o = don(w, [{ gia: 5_000_000 }], 250_000);
  gieoBanChup(w.sqlite, o.id);
  const [rDaiLy, gDaiLy] = thuGiuHo(w, ct, { order: o.id, amount: 3_000_000, role: "BOOKER", collector: DAI_LY });
  thuGiuHo(w, ct, { order: o.id, amount: 1_750_000, role: "STAFF", collector: pHDV });
  const p = phieu(w, { kind: "DELIVERED", order: o.id, due: 4_750_000, gross: 5_000_000 });
  dong(w, { posting: p, debtor: ct, creditor: DAI_LY, amount: 500_000, kind: "HOA_HONG", order: o.id, service: o.dv[0] });
  dong(w, { posting: p, debtor: DAI_LY, creditor: ct, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", order: o.id });
  return { o, rDaiLy, gDaiLy };
}

test("P10 C-1: đại lý giữ 3.000.000 + hoa hồng 500.000 + giảm giá 250.000 → «Nộp» 2.750.000 → «Thay lần thu» đổi người thu khỏi đại lý ⇒ held_already_settled", () => {
  const { w, ct } = khung();
  const { o, rDaiLy, gDaiLy } = viDuC1(w, ct);
  assert.equal(soDu(w, o.id, DAI_LY, ct), 2_750_000);
  dong(w, { posting: phieu(w, { kind: "SETTLEMENT", order: o.id }), debtor: ct, creditor: DAI_LY, amount: 2_750_000, kind: "SETTLEMENT", order: o.id });
  assert.throws(() => thayLanThu(w, ct, { order: o.id, cu: rDaiLy, dongGiuHoCu: gDaiLy, soTien: 3_000_000, nguoiCu: DAI_LY, moi: { order: o.id, amount: 3_000_000, role: "STAFF", collector: pHDV } }),
    /held_already_settled:/);
});

test("P10 C-1 chưa nộp: «Thay lần thu» sau «Đã giao» đổi người thu khỏi đại lý ⇒ được; số dư đại lý −250.000 (Tour Đảo nợ hoa hồng trừ giảm giá)", () => {
  const { w, ct } = khung();
  const { o, rDaiLy, gDaiLy } = viDuC1(w, ct);
  thayLanThu(w, ct, { order: o.id, cu: rDaiLy, dongGiuHoCu: gDaiLy, soTien: 3_000_000, nguoiCu: DAI_LY, moi: { order: o.id, amount: 3_000_000, role: "STAFF", collector: pHDV } });
  assert.equal(soDu(w, o.id, DAI_LY, ct), -250_000);
  assert.equal(soDu(w, o.id, pHDV, ct), 4_750_000);
});

test("P10 SV-HT-03: quầy i-resort giữ 400.000, giá vốn 480.000 → «Thay lần thu» đổi người thu khỏi quầy ⇒ được; Tour Đảo nợ i-resort 480.000", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 600_000, maDm: "IRESORT" }]);
  gieoBanChup(w.sqlite, o.id);
  const [rQuay, gQuay] = thuGiuHo(w, ct, { order: o.id, amount: 400_000, role: "SUPPLIER", collector: IRESORT });
  thuGiuHo(w, ct, { order: o.id, amount: 200_000, role: "STAFF", collector: pHDV });
  const p = phieu(w, { kind: "DELIVERED", order: o.id, due: 600_000, gross: 600_000 });
  dong(w, { posting: p, debtor: ct, creditor: IRESORT, amount: 480_000, kind: "GIA_VON", order: o.id, service: o.dv[0] });
  assert.equal(soDu(w, o.id, IRESORT, ct), -80_000);
  thayLanThu(w, ct, { order: o.id, cu: rQuay, dongGiuHoCu: gQuay, soTien: 400_000, nguoiCu: IRESORT, moi: { order: o.id, amount: 400_000, role: "STAFF", collector: pHDV } });
  assert.equal(soDu(w, o.id, IRESORT, ct), -480_000);
});

// Người kiểm Task 2, Minor 5 (sửa ở Task 14): vế `r.reverses_id IS NULL AND r.transfer_of_id IS NULL` của `bil_receipt_recon_declared` (tạo lại ở migration sổ đại lý
// đợt 2) chưa có bài canh. Mỗi ca chỉ vi phạm MỘT vế; cùng bài có đối chứng dương (lần thu gốc cùng vai thì đánh dấu được).
test("đối chiếu: dòng ĐẢO một lần thu bên đặt / nhà cung cấp không mang dấu DECLARED (vế reverses_id IS NULL) — lần thu gốc thì được", () => {
  const { w, ct } = khung();
  const o = don(w, [{ gia: 2_000_000 }]);
  for (const [role, collector] of [["BOOKER", DAI_LY], ["SUPPLIER", IRESORT]] as const) {
    const goc = thu(w, ct, { order: o.id, amount: 300_000, role, collector });
    dau(w, goc, "DECLARED"); // đối chứng dương: lần thu gốc cùng vai
    const daoLai = thu(w, ct, { order: o.id, amount: 300_000, role, collector, reverses: goc });
    assert.throws(() => dau(w, daoLai, "DECLARED"), /recon_receipt_invalid:/, `${role}: dòng đảo không được đánh dấu đối chiếu`);
  }
});

test("đối chiếu: nửa THU của lệnh chuyển cọc (transfer_of_id) không mang dấu DECLARED dù là chuyển khoản – Công ty thu (vế transfer_of_id IS NULL)", () => {
  const { w, ct } = khung();
  const a = don(w, [{ gia: 1_000_000 }]); // đơn sẽ huỷ, còn tiền
  const nhan = don(w, [{ gia: 1_000_000 }]); // đơn nhận, còn hiệu lực
  const ghi = (o: { order: string; amount: number; kind: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND"; approval?: string; transferOf?: string }): string => {
    const id = ma("lt");
    const luc = new Date().toISOString();
    run(w, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
        occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, approval_id, transfer_of_id)
      VALUES (?, ?, ?, ?, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
      id, o.order, o.kind, o.amount, ct, ct, NGAY, luc, KT, luc, KT, o.approval ?? null, o.transferOf ?? null);
    return id;
  };
  ghi({ order: a.id, amount: 300_000, kind: "CUSTOMER_PAYMENT" });
  huy(w, a.id);
  const d = ma("duyet");
  run(w, `INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'TRANSFER', 100000, ?, 'Chuyển cọc sang đơn mới', ?, NULL, ?, 'qt', ?, 'qt')`, d, a.id, nhan.id, NGAY, AT, AT);
  const chi = ghi({ order: a.id, amount: 100_000, kind: "CUSTOMER_REFUND", approval: d });
  const nuaThu = ghi({ order: nhan.id, amount: 100_000, kind: "CUSTOMER_PAYMENT", transferOf: chi });
  assert.throws(() => dau(w, nuaThu, "DECLARED"), /recon_receipt_invalid:/);
  dau(w, ghi({ order: nhan.id, amount: 100_000, kind: "CUSTOMER_PAYMENT" }), "DECLARED"); // đối chứng dương: lần thu thường cùng đơn, cùng hình thức
});
