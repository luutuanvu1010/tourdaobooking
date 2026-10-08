// Kiểm migration *_bil_ma_giao_dich.sql (ADR-0092 Đ6 + ADR-0108 đ4; đặc tả QR §5, §6). Chèn THẲNG bằng SQL — khoá ở CSDL. Khoá ngoại TẮT (không dựng hồ sơ người).
// Mốc cắt 'R-BIL-D6' = lúc áp migration, nên lần thu "sau mốc" dùng SAU (2099), "trước mốc" dùng TRUOC (2000). Mỗi ca chỉ vi phạm MỘT luật (thứ tự trigger không cố định).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { kiemMaGiaoDich, type DongMa } from "./modules/billing/ma-giao-dich.ts";
import { gieoDongTienKhop } from "../tests/audit/dong-tien.mjs";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_ma_giao_dich.sql"));
const SAU = "2099-01-01T00:00:00.000Z";
const TRUOC = "2000-01-01T00:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(list = files): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  for (const o of ["o1", "o2", "o3"]) {
    run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
      VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, o, `TD-${o}`, SAU, SAU); // trạng thái không ảnh hưởng trigger sổ tiền
  }
  return { db, ct };
}
let n = 0;
function lanThu(db: DatabaseSync, ct: string, o: { order: string; amount: number; method?: string; role?: "COMPANY" | "STAFF"; at?: string; replacement?: string | null }): string {
  const id = `r${++n}`;
  const role = o.role ?? "COMPANY";
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id)
    VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, ?, ?, ?, ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt', ?)`,
    id, o.order, o.amount, role === "COMPANY" ? ct : "hdv", role, o.method ?? "BANK_TRANSFER", ct, o.at ?? SAU, o.at ?? SAU, o.replacement ?? null);
  return id;
}
function dao(db: DatabaseSync, goc: string, replacement: string | null = null): string {
  const id = `r${++n}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id)
    SELECT ?, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, 'đảo thử',
      ?, 'kt', ?, 'kt', ? FROM bil_payment_receipt WHERE id = ?`, id, SAU, SAU, replacement, goc);
  return id;
}
const gan = (db: DatabaseSync, receipt: string, ma: string, so: number) =>
  run(db, `INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')`,
    `t${++n}`, receipt, ma, so, SAU, SAU);
/** Cùng câu với `bankTxnOfCode` của billing/repository.ts (vị từ hieuLuc). */
const daCo = (db: DatabaseSync, ma: string): DongMa[] =>
  (db.prepare(`SELECT t.receipt_id, r.order_id, r.amount, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
     WHERE t.txn_code = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`).all(ma) as
    { receipt_id: string; order_id: string; amount: number; transferred_amount: number }[]).map((x) => ({ receiptId: x.receipt_id, orderId: x.order_id, soTien: x.amount, soThucChuyen: x.transferred_amount }));

test("migration mã giao dịch có đúng một tệp; mốc cắt 'R-BIL-D6' đúng một dòng", () => {
  assert.ok(FILE, "thiếu migrations/*_bil_ma_giao_dich.sql");
  const { db } = moi();
  assert.equal((db.prepare("SELECT count(*) AS n FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'").get() as { n: number }).n, 1);
});

test("(a) chỉ gắn vào lần thu của khách, gốc, còn hiệu lực, Công ty thu, chuyển khoản, không phải nửa chuyển cọc", () => {
  const { db, ct } = moi();
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o1", amount: 100, method: "CASH" }), "MA0001", 100), /bank_txn_receipt_invalid:/, "tiền mặt");
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o1", amount: 100, role: "STAFF" }), "MA0002", 100), /bank_txn_receipt_invalid:/, "nhân viên thu");
  const g = lanThu(db, ct, { order: "o1", amount: 100 });
  const d = dao(db, g);
  assert.throws(() => gan(db, d, "MA0003", 100), /bank_txn_receipt_invalid:/, "dòng đảo");
  assert.throws(() => gan(db, g, "MA0004", 100), /bank_txn_receipt_invalid:/, "đã bị đảo");
  gan(db, lanThu(db, ct, { order: "o1", amount: 100 }), "MA0005", 100);
});

test("(b)(c)(d) ba luật chặn; dòng nối của lần thu đã đảo rơi khỏi kiểm; mỗi ca trigger và hàm thuần cho CÙNG kết luận", () => {
  const { db, ct } = moi();
  const ca: { mo: string; ma: string; so: number; r: () => string; mong: string | null }[] = [];
  const r1 = lanThu(db, ct, { order: "o1", amount: 400 });
  gan(db, r1, "XMA1", 800);
  ca.push({ mo: "trùng mã cùng đơn", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o1", amount: 100 }), mong: "bank_txn_duplicate" });
  ca.push({ mo: "lệch số thực chuyển", ma: "XMA1", so: 700, r: () => lanThu(db, ct, { order: "o2", amount: 100 }), mong: "bank_txn_amount_mismatch" });
  ca.push({ mo: "vượt số thực chuyển", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o2", amount: 401 }), mong: "bank_txn_over" });
  ca.push({ mo: "đúng: đơn khác, cùng số, trong trần", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o2", amount: 400 }), mong: null });
  for (const c of ca) {
    const rid = c.r();
    const lt = db.prepare("SELECT amount, order_id FROM bil_payment_receipt WHERE id = ?").get(rid) as { amount: number; order_id: string };
    const thuan = kiemMaGiaoDich({ soThucChuyen: c.so, soTien: lt.amount, orderId: lt.order_id, daCo: daCo(db, c.ma) });
    let csdl: string | null = null;
    try {
      gan(db, rid, c.ma, c.so);
    } catch (e) {
      csdl = /(bank_txn_[a-z_]+):/.exec(String(e))?.[1] ?? String(e);
    }
    assert.equal(thuan.ok ? null : thuan.ma, c.mong, `${c.mo} — hàm thuần`);
    assert.equal(csdl, c.mong, `${c.mo} — trigger`);
  }
  // Đảo lần thu có mã ⇒ dòng nối rơi khỏi kiểm ⇒ ghi lại cùng mã với số thực chuyển KHÁC được, khi không còn lần thu nào khác giữ mã.
  const { db: d2, ct: c2 } = moi();
  const a = lanThu(d2, c2, { order: "o1", amount: 500 });
  gan(d2, a, "ZMA1", 500);
  dao(d2, a);
  gan(d2, lanThu(d2, c2, { order: "o1", amount: 600 }), "ZMA1", 600);
});

test("(e) đường 1: dòng 'Công ty đã nhận' của lần thu CK – Công ty thu ghi SAU mốc mà chưa có mã ⇒ chặn; tiền mặt / trước mốc / đã có mã ⇒ qua; trước migration ⇒ không chặn", () => {
  const xacNhan = (db: DatabaseSync, ct: string, r: string) => {
    const p = `p${++n}`;
    const held = `l${++n}`;
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'RECEIPT', 'o1', NULL, '2026-10-08', ?, ?)", p, SAU, SAU);
    run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
      VALUES (?, ?, 'hdv', ?, 100, 'HELD', 'o1', ?, NULL, ?, ?)`, held, p, ct, r, SAU, SAU);
    const pc = `p${++n}`;
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'COMPANY_RECEIVED', 'o1', NULL, '2026-10-08', ?, ?)", pc, SAU, SAU);
    run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
      VALUES (?, ?, ?, 'hdv', 100, 'HELD', 'o1', ?, ?, ?, ?)`, `l${++n}`, pc, ct, r, held, SAU, SAU);
  };
  const { db, ct } = moi();
  assert.throws(() => xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100 })), /bank_txn_required:/);
  xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100, method: "CASH" }));
  xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100, at: TRUOC }));
  const coMa = lanThu(db, ct, { order: "o1", amount: 100 });
  gan(db, coMa, "EMA1", 100);
  xacNhan(db, ct, coMa);
  const truoc = moi(files.filter((f) => f < FILE!));
  xacNhan(truoc.db, truoc.ct, lanThu(truoc.db, truoc.ct, { order: "o1", amount: 100 }));
});

test("(f) đường 3: phiếu REPLACEMENT có lần thu mới CK – Công ty thu chưa có mã ⇒ chặn; gắn mã (sau dòng đảo) ⇒ qua, kể cả CÙNG mã với lần thu cũ", () => {
  const thay = (db: DatabaseSync, ct: string, coMa: boolean) => {
    const cu = lanThu(db, ct, { order: "o1", amount: 300 });
    gan(db, cu, "FMA1", 300);
    const m = `m${++n}`;
    const moiR = lanThu(db, ct, { order: "o1", amount: 300, replacement: m });
    dao(db, cu, m);
    if (coMa) gan(db, moiR, "FMA1", 300);
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'REPLACEMENT', 'o1', 'thay vì ghi nhầm người thu', '2026-10-08', ?, ?)", m, SAU, SAU);
  };
  const a = moi();
  assert.throws(() => thay(a.db, a.ct, false), /bank_txn_required:/);
  const b = moi();
  thay(b.db, b.ct, true);
});

test("(g) chỉ-thêm: không sửa, không xoá dòng nối; (h) CHECK mã đã chuẩn hoá 4–40 [A-Z0-9], số thực chuyển > 0; receipt_id duy nhất", () => {
  const { db, ct } = moi();
  const r = lanThu(db, ct, { order: "o1", amount: 100 });
  gan(db, r, "GMA1", 100);
  assert.throws(() => run(db, "UPDATE bil_receipt_bank_txn SET transferred_amount = 999"), /bil_append_only:/);
  assert.throws(() => run(db, "DELETE FROM bil_receipt_bank_txn"), /bil_append_only:/);
  assert.throws(() => gan(db, r, "GMA2", 100), /UNIQUE constraint failed: bil_receipt_bank_txn\.receipt_id/);
  for (const ma of ["ab12", "AB1", "AB-12", "Đ123", "X".repeat(41)]) assert.throws(() => gan(db, lanThu(db, ct, { order: "o3", amount: 1 }), ma, 1), /CHECK constraint failed/, ma);
  // Số thực chuyển 0: trigger BEFORE INSERT chạy TRƯỚC CHECK của SQLite, nên luật "vượt" (1 > 0) có thể báo trước — chấp nhận một trong hai, miễn là bị chặn.
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o3", amount: 1 }), "HMA1", 0), /CHECK constraint failed|bank_txn_over:/);
});

// ---- Bổ sung của người thi công Task 6 (P16 mức mệnh đề; KHÔNG có trong bài gốc của kế hoạch). Xoá thử từng mệnh đề của trigger (a), (e), (f) cho thấy bài (a)(e)(f)
// ở trên không khoá: loại lần thu khác "thu của khách", nửa thu của lệnh chuyển cọc, đường ĐẢO lần thu (phiếu REVERSAL cũng mang receipt_id), và Thay bằng tiền mặt.
// Mỗi bài dưới đây bắt đúng một mệnh đề (mỗi ca chỉ vi phạm MỘT luật). Số liệu ghi ở nhật ký thi công, mục "Quan sát chặn thật".

/** Lần thu có thêm cột: loại (thu / trả lại khách), khoản duyệt, nửa chi mà nó là nửa thu. Người ghi mặc định 'kt' (khác người duyệt 'qt' — luật tách người của 0079). */
function lanThuKhac(db: DatabaseSync, ct: string, o: { order: string; amount: number; kind: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND"; approval?: string | null; transferOf?: string | null }): string {
  const id = `r${++n}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, approval_id, transfer_of_id)
    VALUES (?, ?, ?, ?, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt', ?, ?)`,
    id, o.order, o.kind, o.amount, ct, ct, SAU, SAU, o.approval ?? null, o.transferOf ?? null);
  return id;
}

test("(i1) (a) kind_code: lần TRẢ LẠI khách (CK – Công ty trả) không phải lần thu của khách ⇒ không gắn mã", () => {
  const { db, ct } = moi();
  lanThu(db, ct, { order: "o1", amount: 500 });
  const hoan = lanThuKhac(db, ct, { order: "o1", amount: 100, kind: "CUSTOMER_REFUND" });
  assert.throws(() => gan(db, hoan, "IMA0001", 100), /bank_txn_receipt_invalid:/);
});

test("(i2) (a) transfer_of_id: nửa THU của lệnh chuyển cọc (CK – Công ty) không gắn mã; nửa thu thường cùng đơn thì gắn được", () => {
  const { db, ct } = moi();
  // Đơn huỷ 'a' có tiền, duyệt chuyển 100 sang đơn 'o2' (còn hiệu lực), ghi nửa chi rồi nửa thu — đúng khuôn của src/migrations-billing-coc.test.ts.
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('a', 'TD-a', 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, SAU, SAU);
  run(db, "INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('a-s', 'a', 'Tour', 'perPax', 1, '2099-11-10')");
  gieoDongTienKhop(db, "a");
  run(db, "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = 'a'", SAU);
  run(db, `INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('lydo-a', 'a', 'X', 'CONG_TY_HUY', NULL, '2099-01-02', NULL, 0, ?, 's1', ?, 's1')`, SAU, SAU);
  run(db, "UPDATE orders SET status = 'cancelled' WHERE id = 'a'");
  lanThuKhac(db, ct, { order: "a", amount: 300, kind: "CUSTOMER_PAYMENT" });
  run(db, `INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by)
    VALUES ('d1', 'a', 'TRANSFER', 100, 'o2', 'lý do', '2099-01-03', NULL, ?, 'qt', ?, 'qt')`, SAU, SAU);
  const chi = lanThuKhac(db, ct, { order: "a", amount: 100, kind: "CUSTOMER_REFUND", approval: "d1" });
  const nuaThu = lanThuKhac(db, ct, { order: "o2", amount: 100, kind: "CUSTOMER_PAYMENT", transferOf: chi });
  assert.throws(() => gan(db, nuaThu, "IMA0002", 100), /bank_txn_receipt_invalid:/);
  gan(db, lanThu(db, ct, { order: "o2", amount: 100 }), "IMA0003", 100);
});

test("(i3) (e) kind COMPANY_RECEIVED: ĐẢO lần thu CK – Công ty thu (phiếu REVERSAL, dòng đảo mang receipt_id của lần thu gốc) KHÔNG đòi mã, dù ghi sau mốc", () => {
  const { db, ct } = moi();
  const r = lanThu(db, ct, { order: "o1", amount: 100 }); // người không có ledger.write khai CK – Công ty thu: có dòng giữ hộ, chưa mã
  const p = `p${++n}`;
  const held = `l${++n}`;
  run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'RECEIPT', 'o1', NULL, '2026-10-08', ?, ?)", p, SAU, SAU);
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, 'hdv', ?, 100, 'HELD', 'o1', ?, NULL, ?, ?)`, held, p, ct, r, SAU, SAU);
  dao(db, r); // đúng thứ tự service.ts `dao_lan_thu`: dòng đảo lần thu TRƯỚC, rồi phiếu REVERSAL + dòng đảo giữ hộ
  const pd = `p${++n}`;
  run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'REVERSAL', 'o1', 'ghi nhầm người thu', '2026-10-08', ?, ?)", pd, SAU, SAU);
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, ?, 'hdv', 100, 'HELD', 'o1', ?, ?, ?, ?)`, `l${++n}`, pd, ct, r, held, SAU, SAU);
});

test("(i4) (f) phạm vi: chỉ lô Thay CÓ lần thu mới CK – Công ty thu sau mốc mới đòi mã — tiền mặt, nhân viên thu, trước mốc, và một lần thu chưa mã không liên quan ở đơn khác đều KHÔNG chặn", () => {
  const { db, ct } = moi();
  lanThu(db, ct, { order: "o2", amount: 50 }); // lần thu CK – Công ty thu chưa mã của đơn KHÁC: không được kéo lô Thay này vào luật
  const thay = (o: { method?: string; role?: "COMPANY" | "STAFF"; at?: string }) => {
    const cu = lanThu(db, ct, { order: "o1", amount: 300 });
    gan(db, cu, `JMA${++n}`, 300);
    const m = `m${++n}`;
    lanThu(db, ct, { order: "o1", amount: 300, replacement: m, ...o });
    dao(db, cu, m);
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'REPLACEMENT', 'o1', 'thay vì ghi nhầm hình thức', '2026-10-08', ?, ?)", m, SAU, SAU);
  };
  thay({ method: "CASH" });
  thay({ role: "STAFF" });
  thay({ at: TRUOC });
});
