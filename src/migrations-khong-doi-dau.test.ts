// Kiểm migration *_bil_khong_doi_dau.sql (ADR-0092 Đ2, Đ2b; TNV-VP01, KT04 của TNV-G4; lộ trình V2.4). Chèn THẲNG bằng SQL — chứng minh khoá ở CSDL:
// (a) dòng quyết toán gốc không làm số dư cặp (bên, công ty chủ) trên đơn đổi dấu; (b) dòng đảo giữ hộ chỉ khi người giữ hộ còn nợ ≥ số dòng gốc.
// Khoá ngoại TẮT (không dựng hồ sơ người); công ty chủ lấy từ view công bố. Tên ở đây là GIẢ.
// Phiếu "chỗ chứa" nhiều dòng nợ tuỳ ý là SETTLEMENT (trước migration 0094 là ADJUSTMENT — từ 0094 phiếu ADJUSTMENT cần yêu cầu đã duyệt, ADR-0115; loại phiếu không là điều kiện của luật nào ở đây).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_khong_doi_dau.sql"));
const AT = "2026-10-05T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(list = files): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  let ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string } | undefined)?.party_id;
  if (!ct) {
    // CSDL rỗng chưa có công ty chủ (dữ liệu gieo từ company_profile) — dựng một hồ sơ + vai OWNER_COMPANY.
    run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('ct', 'ORGANIZATION', 'Tour Đảo', 1, ?, ?)", AT, AT);
    run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_at, created_at, updated_at) VALUES ('ct-r', 'ct', 'OWNER_COMPANY', ?, ?, ?)", AT, AT, AT);
    ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  }
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o', 'TD-o', 's1', 'confirmed', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, AT, AT);
  run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES ('p', 'SETTLEMENT', 'o', 'khung thử sổ tiền', '2026-10-05', ?, ?)", AT, AT);
  return { db, ct };
}
let n = 0;
const dong = (db: DatabaseSync, o: { debtor: string; creditor: string; amount: number; kind: string; reverses?: string | null }) => {
  const id = `l${++n}`;
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, 'p', ?, ?, ?, ?, 'o', NULL, ?, ?, ?)`, id, o.debtor, o.creditor, o.amount, o.kind, o.reverses ?? null, AT, AT);
  return id;
};

test("migration không đổi dấu tồn tại đúng một tệp", () => {
  assert.ok(FILE, "thiếu migrations/*_bil_khong_doi_dau.sql");
});

test("(a) Đ2: nộp vượt số đang giữ / nộp cho người không giữ / trả vượt số công ty đang nợ → CSDL chặn; trong giới hạn → qua; trước migration thì không chặn", () => {
  const truoc = moi(files.filter((f) => f < FILE!));
  dong(truoc.db, { debtor: truoc.ct, creditor: "hdv", amount: 1, kind: "SETTLEMENT" }); // luật cũ: không chặn
  const { db, ct } = moi();
  dong(db, { debtor: "hdv", creditor: ct, amount: 400_000, kind: "HELD" });
  assert.throws(() => dong(db, { debtor: ct, creditor: "hdv", amount: 400_001, kind: "SETTLEMENT" }), /settlement_sign_flip:/);
  dong(db, { debtor: ct, creditor: "hdv", amount: 150_000, kind: "SETTLEMENT" });
  dong(db, { debtor: ct, creditor: "hdv", amount: 250_000, kind: "SETTLEMENT" });
  assert.throws(() => dong(db, { debtor: ct, creditor: "hdv", amount: 1, kind: "SETTLEMENT" }), /settlement_sign_flip:/, "đã nộp hết");
  assert.throws(() => dong(db, { debtor: ct, creditor: "nguoi-khac", amount: 1, kind: "SETTLEMENT" }), /settlement_sign_flip:/, "người không giữ");
  // Công ty nợ người ứng tiền hoàn khách (dòng REFUND) — trả trong giới hạn được, vượt thì chặn (âm hợp lệ, không đổi dấu).
  dong(db, { debtor: ct, creditor: "nv-ung", amount: 200_000, kind: "REFUND" });
  assert.throws(() => dong(db, { debtor: "nv-ung", creditor: ct, amount: 200_001, kind: "SETTLEMENT" }), /settlement_sign_flip:/);
  dong(db, { debtor: "nv-ung", creditor: ct, amount: 200_000, kind: "SETTLEMENT" });
  // Dòng ĐẢO một dòng quyết toán (sửa sai "nhầm Nộp") không bị luật (a) chặn.
  const nop = (db.prepare("SELECT id FROM bil_debt_line WHERE kind_code = 'SETTLEMENT' AND creditor_party_id = 'hdv' AND amount = 250000").get() as { id: string }).id;
  dong(db, { debtor: "hdv", creditor: ct, amount: 250_000, kind: "SETTLEMENT", reverses: nop });
});

test("(b) Đ2b (VP-01): đảo dòng giữ hộ khi người khai đã nộp bù → CSDL chặn; chưa nộp → qua; đảo lần nộp trước rồi đảo giữ hộ → qua", () => {
  const { db, ct } = moi();
  const held = dong(db, { debtor: "hdv", creditor: ct, amount: 1_000_000, kind: "HELD" });
  const nop = dong(db, { debtor: ct, creditor: "hdv", amount: 1_000_000, kind: "SETTLEMENT" });
  assert.throws(() => dong(db, { debtor: ct, creditor: "hdv", amount: 1_000_000, kind: "HELD", reverses: held }), /held_already_settled:/);
  dong(db, { debtor: "hdv", creditor: ct, amount: 1_000_000, kind: "SETTLEMENT", reverses: nop }); // đảo lần nộp nhầm
  dong(db, { debtor: ct, creditor: "hdv", amount: 1_000_000, kind: "HELD", reverses: held }); // "Công ty đã nhận"
  const sd = db.prepare(`SELECT balance FROM v_bil_party_balance WHERE party_id = 'hdv' AND order_id = 'o' AND counterparty_id = ?`).get(ct) as { balance: number };
  assert.equal(sd.balance, 0, "số dư người khai về 0, không âm");
});

test("mốc kiểm R-BIL-13: một dòng, chỉ-thêm", () => {
  const { db } = moi();
  const r = db.prepare("SELECT code, cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-13'").all() as { code: string; cutoff_at: string }[];
  assert.deepEqual(r.map((x) => x.code), ["R-BIL-13"]);
  assert.match(r[0]!.cutoff_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.throws(() => db.exec("UPDATE bil_audit_cutoff SET cutoff_at = 'x'"), /bil_append_only:/);
  assert.throws(() => db.exec("DELETE FROM bil_audit_cutoff"), /bil_append_only:/);
});
