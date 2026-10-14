// Kiểm định kỳ mã giao dịch (ADR-0092 Đ6; đặc tả QR §5): R-BIL-D6a mỗi mã — các dòng còn hiệu lực cùng số thực chuyển, không trùng đơn, tổng ≤ số đó; R-BIL-D6b —
// lưới thứ hai cho đường 2 (chỉ máy chủ): lần thu CK – Công ty thu ghi TỪ mốc đã là "công ty nhận" mà không có mã. Dữ liệu vi phạm dựng bằng cách GỠ trigger
// trong CSDL thử (giả lập "trigger bị gỡ nhầm / SQL gõ tay đi vòng").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

interface Check { code: string; sql: string; level: string; mode?: "rows" }
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const one = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, `phải có đúng một kiểm ${code}`);
  return f[0]!;
};
const dem = (db: DatabaseSync, code: string): number => {
  const c = one(code);
  const rows = db.prepare(c.sql.replace(/\s+/g, " ").trim()).all();
  return c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
};
const DIR = new URL("../migrations/", import.meta.url);
const SAU = "2099-01-01T00:00:00.000Z";
function moi(): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const t of ["bil_receipt_bank_txn_duplicate", "bil_receipt_bank_txn_amount_mismatch", "bil_receipt_bank_txn_over"]) db.exec(`DROP TRIGGER ${t}`);
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  return { db, ct };
}
let n = 0;
const lanThu = (db: DatabaseSync, ct: string, order: string, amount: number) => {
  const id = `r${++n}`;
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt')`)
    .run(id, order, amount, ct, ct, SAU, SAU);
  return id;
};
const gan = (db: DatabaseSync, r: string, ma: string, so: number) =>
  db.prepare("INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`t${++n}`, r, ma, so, SAU, SAU);

test("R-BIL-D6a: sạch = 0; lệch số / trùng đơn / vượt tổng ⇒ mỗi mã một vi phạm; mức LỖI", () => {
  assert.equal(one("R-BIL-D6a").level, "fail");
  const { db, ct } = moi();
  gan(db, lanThu(db, ct, "o1", 400), "SACH", 800);
  gan(db, lanThu(db, ct, "o2", 400), "SACH", 800);
  assert.equal(dem(db, "R-BIL-D6a"), 0);
  gan(db, lanThu(db, ct, "o1", 100), "LECH", 500);
  gan(db, lanThu(db, ct, "o2", 100), "LECH", 600);
  gan(db, lanThu(db, ct, "o1", 100), "TRUNG", 500);
  gan(db, lanThu(db, ct, "o1", 100), "TRUNG", 500);
  gan(db, lanThu(db, ct, "o1", 300), "VUOT", 500);
  gan(db, lanThu(db, ct, "o2", 300), "VUOT", 500);
  assert.equal(dem(db, "R-BIL-D6a"), 3);
});

test("R-BIL-D6b: Kế toán tự ghi CK – Công ty thu sau mốc không mã ⇒ vi phạm; có mã / còn giữ hộ / nửa chuyển cọc ⇒ không; mức LỖI", () => {
  assert.equal(one("R-BIL-D6b").level, "fail");
  const { db, ct } = moi();
  gan(db, lanThu(db, ct, "o1", 100), "COMA", 100);
  assert.equal(dem(db, "R-BIL-D6b"), 0);
  lanThu(db, ct, "o1", 200);
  assert.equal(dem(db, "R-BIL-D6b"), 1);
  const giuHo = lanThu(db, ct, "o2", 300);
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p1', 'RECEIPT', 'o2', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, created_at, updated_at)
    VALUES ('l1', 'p1', 'hdv', ?, 300, 'HELD', 'o2', ?, ?, ?)`).run(ct, giuHo, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 1, "khoản còn giữ hộ chưa xác nhận không tính");
});

test("R-BIL-D6b ghim hai điều kiện then chốt: nửa thu chuyển cọc (transfer_of_id) KHÔNG tính; khoản giữ hộ ĐÃ 'Công ty đã nhận' mà không mã thì TÍNH", () => {
  const { db, ct } = moi();
  // Gỡ thêm trong CSDL thử: trigger cặp chuyển cọc (0079) để chèn nửa thu đơn lẻ; trigger (e) của 0088 để dựng "Công ty đã nhận" thiếu mã.
  for (const t of ["bil_payment_receipt_coc_transfer_pair", "bil_payment_receipt_coc_transfer_target", "bil_debt_line_company_received_txn"]) db.exec(`DROP TRIGGER ${t}`);
  const coc = lanThu(db, ct, "o3", 500);
  const nuaThu = `r${++n}`;
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, transfer_of_id) VALUES (?, 'o4', 'CUSTOMER_PAYMENT', 500, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt', ?)`)
    .run(nuaThu, ct, ct, SAU, SAU, coc);
  gan(db, coc, "COC1", 500); // lần thu gốc có mã — chỉ còn nửa thu chuyển cọc là "không mã"
  assert.equal(dem(db, "R-BIL-D6b"), 0, "nửa thu chuyển cọc không bị đòi mã");
  const giu = lanThu(db, ct, "o5", 300);
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p2', 'RECEIPT', 'o5', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, created_at, updated_at)
    VALUES ('l2', 'p2', 'hdv', ?, 300, 'HELD', 'o5', ?, ?, ?)`).run(ct, giu, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 0, "còn giữ hộ, chưa xác nhận ⇒ chưa tính");
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p3', 'COMPANY_RECEIVED', 'o5', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES ('l3', 'p3', ?, 'hdv', 300, 'HELD', 'o5', ?, 'l2', ?, ?)`).run(ct, giu, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 1, "đã 'Công ty đã nhận' mà không mã ⇒ vi phạm");
});

test("R-BIL-D6b + ADR-0118: khoản MỚI đang đối chiếu (DECLARED chưa CONFIRMED, không dòng giữ hộ) KHÔNG tính; đã CONFIRMED mà không mã THÌ TÍNH", () => {
  const { db, ct } = moi();
  db.exec("DROP TRIGGER bil_receipt_recon_confirmed_txn"); // giả lập "trigger bị gỡ nhầm" để dựng khoản đã xác nhận thiếu mã
  const r = lanThu(db, ct, "o6", 250);
  const dau = (kind: string) => db.prepare("INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, updated_at) VALUES (?, ?, ?, '2026-10-15', ?, ?)").run(`d${++n}`, r, kind, SAU, SAU);
  dau("DECLARED");
  assert.equal(dem(db, "R-BIL-D6b"), 0, "đang đối chiếu, chưa ai xác nhận ⇒ chưa đòi mã");
  dau("CONFIRMED");
  assert.equal(dem(db, "R-BIL-D6b"), 1, "đã xác nhận mà không mã ⇒ vi phạm");
  gan(db, r, "DOIC1", 250);
  assert.equal(dem(db, "R-BIL-D6b"), 0, "có mã ⇒ sạch");
});

// BỔ SUNG của người thi công (ngoài ba bài gốc của kế hoạch): xoá thử từng MỆNH ĐỀ loại trừ của hai luật cho thấy ba bài gốc không khoá chúng. Cả hai luật mức LỖI
// (`audit-invariants --db remote` thoát 1 và báo KHÔNG ĐẠT ở bước kiểm dữ liệu SAU deploy — không chặn deploy), nên một mệnh đề loại trừ bị mất là báo NHẦM dữ liệu đúng: lệnh Thay dùng lại mã, lần thu đã bị đảo, dòng đảo, lần thu cũ hơn mốc, tiền mặt,
// nhân viên thu, lần trả lại khách. Mỗi lần chèn kèm MỘT khẳng định, để mỗi mệnh đề bị xoá làm đỏ đúng một khẳng định.
interface Khac { kind?: string; role?: string; method?: string; luc?: string; dao?: string }
const lanKhac = (db: DatabaseSync, ct: string, order: string, amount: number, o: Khac = {}) => {
  const id = `r${++n}`;
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PREPAID', '2026-10-08', ?, NULL, ?, 'kt', ?, 'kt')`)
    .run(id, order, o.kind ?? "CUSTOMER_PAYMENT", amount, ct, o.role ?? "COMPANY", o.method ?? "BANK_TRANSFER", ct, o.dao ?? null, o.luc ?? SAU, o.luc ?? SAU);
  return id;
};

test("(bổ sung) R-BIL-D6a / D6b không báo nhầm: Thay dùng lại mã, lần thu đã đảo, dòng đảo, trước mốc, tiền mặt, nhân viên thu, trả lại khách", () => {
  const { db, ct } = moi();
  // Lệnh Thay (đường 3): lần thu cũ có mã → đảo → lần thu mới dùng LẠI cùng mã, cùng số thực chuyển.
  const cu = lanKhac(db, ct, "o1", 100);
  gan(db, cu, "THAY1", 100);
  lanKhac(db, ct, "o1", 100, { dao: cu });
  gan(db, lanKhac(db, ct, "o1", 100), "THAY1", 100);
  assert.equal(dem(db, "R-BIL-D6a"), 0, "D6a: lần thu cũ đã đảo rơi khỏi phép kiểm, mã dùng lại không bị tính trùng");
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: dòng đảo của lần thu CK – Công ty thu không bị đòi mã");
  // Lần thu CK – Công ty thu sót mã: tính (đối chứng) — rồi bị đảo thì thôi.
  const sot = lanKhac(db, ct, "o2", 200);
  assert.equal(dem(db, "R-BIL-D6b"), 1, "đối chứng: chưa mã, chưa đảo ⇒ tính");
  lanKhac(db, ct, "o2", 200, { dao: sot });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: lần thu chưa mã nhưng đã bị đảo ⇒ không tính nữa");
  lanKhac(db, ct, "o3", 100, { luc: "2000-01-01T00:00:00.000Z" });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: lần thu cũ hơn mốc 'R-BIL-D6' không bị đòi mã bổ sung");
  lanKhac(db, ct, "o3", 100, { method: "CASH" });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: tiền mặt không đòi mã");
  lanKhac(db, ct, "o3", 100, { role: "STAFF" });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: nhân viên thu (không phải Công ty thu) không đòi mã");
  lanKhac(db, ct, "o1", 50, { kind: "CUSTOMER_REFUND" });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "D6b: lần trả lại khách không đòi mã");
});

// Ghim ĐIỂM MỐC của D6b (người kiểm cuối 2026-10-08: đổi `>=` thành `>` ở so sánh mốc mà bài vẫn xanh vì mọi ca đều đặt `created_at` xa mốc — năm 2000 hoặc 2099).
// Chỉ D6b dùng mốc `R-BIL-D6`; câu SQL của D6a không nhắc `bil_audit_cutoff`. Mốc đọc từ chính CSDL thử (= lúc áp migration 0088), không đoán.
test("R-BIL-D6b đúng TẠI mốc: lần thu có created_at BẰNG ĐÚNG cutoff_at của 'R-BIL-D6' bị tính (>=, không phải >); sớm hơn một mili giây thì không", () => {
  const { db, ct } = moi();
  const moc = (db.prepare("SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'").get() as { cutoff_at: string }).cutoff_at;
  assert.match(moc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "mốc có dạng ISO mili giây nên so chuỗi = so thời gian");
  const truoc = new Date(Date.parse(moc) - 1).toISOString();
  assert.ok(truoc < moc);
  lanKhac(db, ct, "o1", 100, { luc: truoc });
  assert.equal(dem(db, "R-BIL-D6b"), 0, "sớm hơn mốc một mili giây ⇒ không bị đòi mã");
  lanKhac(db, ct, "o2", 100, { luc: moc });
  assert.equal(dem(db, "R-BIL-D6b"), 1, "BẰNG ĐÚNG mốc ⇒ bị tính (thiếu mã)");
});
