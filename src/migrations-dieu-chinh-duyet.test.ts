// Kiểm migration *_bil_dieu_chinh_duyet.sql (ADR-0115 — điều chỉnh sổ tiền cần người thứ hai duyệt; đợt 1: công nợ). Chèn THẲNG bằng SQL — chứng minh khoá ở CSDL:
// (a) bảng yêu cầu chỉ-thêm, mỗi yêu cầu đúng một quyết định, người duyệt / từ chối ≠ người tạo, chỉ người tạo mới rút, hết hạn 7 ngày không duyệt được;
// (b) phiếu ADJUSTMENT chỉ được chèn khi có yêu cầu ĐÃ DUYỆT do người KHÁC tạo (cột request_id), đúng đơn, đúng ngày; mỗi yêu cầu một phiếu;
// (c) dòng nợ của phiếu ADJUSTMENT khớp yêu cầu, đúng một dòng.
// Mỗi trigger mới được chứng minh CHẶN THẬT: gỡ nó (DROP TRIGGER) thì cùng câu chèn lọt (khuôn src/modules/van-chuyen/dieu-chinh-csdl.test.ts). Khoá ngoại TẮT;
// tên ở đây là GIẢ. Hạn 7 ngày = HAN_YEU_CAU_NGAY (src/modules/billing/rules.ts) — bài rules.test.ts đối chiếu hai nơi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_dieu_chinh_duyet.sql"));
const AT = "2026-10-13T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(list = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o', 'TD-o', 's1', 'confirmed', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, AT, AT);
  run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES ('o2', 'TD-o2', 's1', 'confirmed', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, AT, AT);
  return db;
}

interface Yc { id: string; by?: string; at?: string; order?: string; debtor?: string; creditor?: string; amount?: number; kind?: string; date?: string; reason?: string }
function yeuCau(db: DatabaseSync, o: Yc): string {
  run(db, `INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id, cap_snapshot,
      created_at, created_by, updated_at, updated_by)
    VALUES (?, 'REQUEST', ?, ?, ?, ?, ?, ?, 'INCREASE', ?, NULL, NULL, ?, ?, ?, ?)`,
  o.id, o.order ?? "o", o.debtor ?? "hdv", o.creditor ?? "ct", o.amount ?? 300_000, o.kind ?? "HELD", o.date ?? "2026-10-13", o.reason ?? "HDV nhận thêm tiền khách gửi", o.at ?? AT, o.by ?? "tao", o.at ?? AT, o.by ?? "tao");
  return o.id;
}
function quyetDinh(db: DatabaseSync, o: { id: string; kind: "APPROVE" | "REJECT" | "WITHDRAW"; target: string; by: string; at?: string; order?: string; reason?: string | null }): string {
  const apr = o.kind === "APPROVE";
  run(db, `INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  o.id, o.kind, o.order ?? "o", apr ? "INCREASE" : null, o.reason === undefined ? (o.kind === "REJECT" ? "Số tiền chưa đúng" : null) : o.reason, o.target, apr ? 1_000_000 : null, o.at ?? AT, o.by, o.at ?? AT, o.by);
  return o.id;
}
let n = 0;
function phieu(db: DatabaseSync, o: { id?: string; request?: string | null; by?: string | null; order?: string; date?: string; kind?: string }): string {
  const id = o.id ?? `p${++n}`;
  run(db, `INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, request_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'HDV nhận thêm tiền khách gửi', ?, ?, ?, ?, ?, ?)`, id, o.kind ?? "ADJUSTMENT", o.order ?? "o", o.date ?? "2026-10-13", o.request ?? null, AT, o.by === undefined ? "duyet" : o.by, AT, o.by === undefined ? "duyet" : o.by);
  return id;
}
function dong(db: DatabaseSync, o: { posting: string; debtor?: string; creditor?: string; amount?: number; kind?: string; order?: string; reverses?: string | null }): string {
  const id = `l${++n}`;
  run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`, id, o.posting, o.debtor ?? "hdv", o.creditor ?? "ct", o.amount ?? 300_000, o.kind ?? "HELD", o.order ?? "o", o.reverses ?? null, AT, AT);
  return id;
}
/** Yêu cầu đã duyệt hợp lệ: Tạo bởi "tao", duyệt bởi "duyet". */
function daDuyet(db: DatabaseSync, id: string, o: Partial<Yc> = {}): string {
  yeuCau(db, { id, ...o });
  quyetDinh(db, { id: `${id}-a`, kind: "APPROVE", target: id, by: "duyet", order: o.order });
  return id;
}

test("migration điều chỉnh cần duyệt tồn tại đúng một tệp", () => {
  assert.ok(FILE, "thiếu migrations/*_bil_dieu_chinh_duyet.sql");
});

test("(a) bảng yêu cầu: chỉ-thêm; REQUEST đủ trường; lý do ≥ 10 ký tự; từ chối phải có lý do", () => {
  const db = moi();
  yeuCau(db, { id: "y1" });
  assert.throws(() => run(db, "UPDATE bil_adjustment_request SET amount = 1 WHERE id = 'y1'"), /bil_append_only:/);
  assert.throws(() => run(db, "DELETE FROM bil_adjustment_request WHERE id = 'y1'"), /bil_append_only:/);
  assert.throws(() => yeuCau(db, { id: "y2", reason: "ngắn" }), /adjreq_reason_short:/);
  assert.throws(() => yeuCau(db, { id: "y3", amount: 0 }), /CHECK constraint failed/);
  assert.throws(() => yeuCau(db, { id: "y4", debtor: "ct", creditor: "ct" }), /CHECK constraint failed/);
  assert.throws(() => run(db, `INSERT INTO bil_adjustment_request (id, kind_code, order_id, created_at, created_by, updated_at, updated_by) VALUES ('y5', 'REQUEST', 'o', ?, 'tao', ?, 'tao')`, AT, AT), /CHECK constraint failed/, "thiếu trường");
  assert.throws(() => quyetDinh(db, { id: "q1", kind: "REJECT", target: "y1", by: "duyet", reason: null }), /CHECK constraint failed/, "từ chối không lý do");
  assert.throws(() => run(db, `INSERT INTO bil_adjustment_request (id, kind_code, order_id, created_at, created_by, updated_at, updated_by) VALUES ('y6', 'REQUEST', 'o', ?, NULL, ?, NULL)`, AT, AT), /CHECK constraint failed/, "không có người tạo");
});

test("(a) mỗi yêu cầu đúng một quyết định; quyết định phải trỏ yêu cầu CÙNG đơn", () => {
  const db = moi();
  yeuCau(db, { id: "y1" });
  assert.throws(() => quyetDinh(db, { id: "q0", kind: "APPROVE", target: "khong-co", by: "duyet" }), /adjreq_mismatch:/);
  assert.throws(() => quyetDinh(db, { id: "q0b", kind: "APPROVE", target: "y1", by: "duyet", order: "o2" }), /adjreq_mismatch:/, "khác đơn");
  quyetDinh(db, { id: "q1", kind: "REJECT", target: "y1", by: "duyet" });
  assert.throws(() => quyetDinh(db, { id: "q2", kind: "APPROVE", target: "y1", by: "duyet2" }), /UNIQUE constraint failed: bil_adjustment_request\.target_id/);
  assert.throws(() => quyetDinh(db, { id: "q3", kind: "WITHDRAW", target: "y1", by: "tao" }), /UNIQUE constraint failed: bil_adjustment_request\.target_id/);
  yeuCau(db, { id: "y9" });
  assert.throws(() => quyetDinh(db, { id: "q4", kind: "APPROVE", target: "q1", by: "duyet3" }), /adjreq_mismatch:/, "quyết định chỉ trỏ dòng REQUEST");
});

test("(a) người duyệt / từ chối ≠ người tạo; chỉ người tạo mới rút", () => {
  const db = moi();
  yeuCau(db, { id: "y1", by: "tao" });
  assert.throws(() => quyetDinh(db, { id: "q1", kind: "APPROVE", target: "y1", by: "tao" }), /adjreq_same_person:/);
  assert.throws(() => quyetDinh(db, { id: "q2", kind: "REJECT", target: "y1", by: "tao" }), /adjreq_same_person:/);
  assert.throws(() => quyetDinh(db, { id: "q3", kind: "WITHDRAW", target: "y1", by: "nguoi-la" }), /adjreq_not_creator:/);
  quyetDinh(db, { id: "q4", kind: "WITHDRAW", target: "y1", by: "tao" });
  yeuCau(db, { id: "y2", by: "tao" });
  quyetDinh(db, { id: "q5", kind: "APPROVE", target: "y2", by: "duyet" });
});

test("(a) hết hạn 7 ngày: duyệt ngày thứ 8 bị chặn; ngày thứ 7 còn được", () => {
  const db = moi();
  yeuCau(db, { id: "y1", at: "2026-10-01T03:00:00.000Z" });
  assert.throws(() => quyetDinh(db, { id: "q1", kind: "APPROVE", target: "y1", by: "duyet", at: "2026-10-08T03:00:00.001Z" }), /adjreq_expired:/);
  quyetDinh(db, { id: "q2", kind: "APPROVE", target: "y1", by: "duyet", at: "2026-10-08T03:00:00.000Z" });
});

test("(b) phiếu ADJUSTMENT: thiếu yêu cầu / yêu cầu chưa duyệt / bị từ chối / bị rút / do chính người tạo ghi / sai đơn / sai ngày → CSDL chặn", () => {
  const db = moi();
  assert.throws(() => phieu(db, { request: null }), /adjustment_needs_approval:/, "không request_id");
  assert.throws(() => phieu(db, { request: "khong-co" }), /adjustment_needs_approval:/, "request_id ma");
  yeuCau(db, { id: "y1" });
  assert.throws(() => phieu(db, { request: "y1" }), /adjustment_needs_approval:/, "chưa duyệt");
  yeuCau(db, { id: "y2" });
  quyetDinh(db, { id: "q2", kind: "REJECT", target: "y2", by: "duyet" });
  assert.throws(() => phieu(db, { request: "y2" }), /adjustment_needs_approval:/, "bị từ chối");
  yeuCau(db, { id: "y3" });
  quyetDinh(db, { id: "q3", kind: "WITHDRAW", target: "y3", by: "tao" });
  assert.throws(() => phieu(db, { request: "y3" }), /adjustment_needs_approval:/, "bị rút");
  daDuyet(db, "y4");
  assert.throws(() => phieu(db, { request: "y4", by: "tao" }), /adjustment_needs_approval:/, "người tạo tự ghi phiếu");
  assert.throws(() => phieu(db, { request: "y4", by: "nguoi-khac" }), /adjustment_needs_approval:/, "không phải người đã duyệt");
  assert.throws(() => phieu(db, { request: "y4", by: null }), /adjustment_needs_approval:/, "không người ghi");
  assert.throws(() => phieu(db, { request: "y4", order: "o2" }), /adjustment_needs_approval:/, "sai đơn");
  assert.throws(() => phieu(db, { request: "y4", date: "2026-10-12" }), /adjustment_needs_approval:/, "sai ngày phát sinh");
  phieu(db, { request: "y4" });
  assert.throws(() => phieu(db, { request: "y4" }), /UNIQUE constraint failed: bil_posting\.request_id/, "mỗi yêu cầu một phiếu");
});

test("(b) request_id chỉ dành cho phiếu ADJUSTMENT; phiếu loại khác không mang yêu cầu", () => {
  const db = moi();
  daDuyet(db, "y1");
  assert.throws(() => phieu(db, { request: "y1", kind: "REFUND" }), /adjustment_request_only:/);
  phieu(db, { request: null, kind: "REFUND" });
});

test("(c) dòng nợ của phiếu ADJUSTMENT: khớp yêu cầu; đúng một dòng; không dòng đảo", () => {
  const db = moi();
  daDuyet(db, "y1");
  const p = phieu(db, { request: "y1" });
  assert.throws(() => dong(db, { posting: p, amount: 300_001 }), /adjustment_line_mismatch:/, "sai số tiền");
  assert.throws(() => dong(db, { posting: p, debtor: "khac" }), /adjustment_line_mismatch:/, "sai bên nợ");
  assert.throws(() => dong(db, { posting: p, creditor: "khac" }), /adjustment_line_mismatch:/, "sai bên được nợ");
  assert.throws(() => dong(db, { posting: p, kind: "SETTLEMENT" }), /adjustment_line_mismatch:/, "sai loại dòng");
  assert.throws(() => dong(db, { posting: p, order: "o2" }), /adjustment_line_mismatch:/, "sai đơn");
  dong(db, { posting: p });
  assert.throws(() => dong(db, { posting: p }), /adjustment_line_mismatch:/, "dòng thứ hai của cùng phiếu");
});

test("trước migration thì không chặn (luật cũ); phiếu ADJUSTMENT cũ vẫn đọc được", () => {
  const truoc = moi(files.filter((f) => f < FILE!));
  run(truoc, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES ('cu', 'ADJUSTMENT', 'o', 'điều chỉnh từ trước khi có luật duyệt', '2026-10-05', ?, ?)", AT, AT);
});

test("mốc kiểm định kỳ R-BIL-14 có đúng một dòng, chỉ-thêm", () => {
  const db = moi();
  const r = db.prepare("SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-14'").all();
  assert.equal(r.length, 1);
  assert.throws(() => run(db, "UPDATE bil_audit_cutoff SET cutoff_at = 'x' WHERE code = 'R-BIL-14'"), /bil_append_only:/);
});

// ---- Chứng minh từng trigger mới CHẶN THẬT: gỡ nó thì cùng câu chèn lọt ----
const TRIGGER_BIEN_CHUNG: { ten: string; chen: (db: DatabaseSync) => unknown }[] = [
  { ten: "bil_adjustment_request_no_update", chen: (db) => run(db, "UPDATE bil_adjustment_request SET amount = 1 WHERE id = 'y1'") },
  { ten: "bil_adjustment_request_no_delete", chen: (db) => run(db, "DELETE FROM bil_adjustment_request WHERE id = 'y1'") },
  { ten: "bil_adjustment_request_reason_short", chen: (db) => yeuCau(db, { id: "y2", reason: "ngắn" }) },
  { ten: "bil_adjustment_request_match", chen: (db) => quyetDinh(db, { id: "q1", kind: "APPROVE", target: "khong-co", by: "duyet" }) },
  { ten: "bil_adjustment_request_same_person", chen: (db) => quyetDinh(db, { id: "q1", kind: "APPROVE", target: "y1", by: "tao" }) },
  { ten: "bil_adjustment_request_withdraw_by_creator", chen: (db) => quyetDinh(db, { id: "q1", kind: "WITHDRAW", target: "y1", by: "nguoi-la" }) },
  { ten: "bil_adjustment_request_expired", chen: (db) => quyetDinh(db, { id: "q1", kind: "APPROVE", target: "y1", by: "duyet", at: "2026-12-01T00:00:00.000Z" }) },
  { ten: "bil_posting_adjustment_approved", chen: (db) => phieu(db, { request: null }) },
  { ten: "bil_posting_adjustment_request_only", chen: (db) => { daDuyet(db, "yy"); phieu(db, { request: "yy", kind: "REFUND" }); } },
];
for (const t of TRIGGER_BIEN_CHUNG) {
  test(`trigger ${t.ten} chặn thật: có trigger → ném lỗi; gỡ trigger → câu chèn lọt`, () => {
    const co = moi();
    yeuCau(co, { id: "y1", by: "tao" });
    assert.throws(() => t.chen(co));
    const gỡ = moi();
    yeuCau(gỡ, { id: "y1", by: "tao" });
    gỡ.exec(`DROP TRIGGER ${t.ten}`);
    assert.doesNotThrow(() => t.chen(gỡ));
  });
}

test("trigger bil_debt_line_adjustment_match chặn thật: gỡ thì dòng sai số tiền lọt", () => {
  const co = moi();
  daDuyet(co, "y1");
  const p = phieu(co, { request: "y1" });
  assert.throws(() => dong(co, { posting: p, amount: 999_999 }));
  const go = moi();
  daDuyet(go, "y1");
  const p2 = phieu(go, { request: "y1" });
  go.exec("DROP TRIGGER bil_debt_line_adjustment_match");
  assert.doesNotThrow(() => dong(go, { posting: p2, amount: 999_999 }));
});

test("chỉ mục duy nhất bil_posting.request_id chặn thật: gỡ thì phiếu thứ hai lọt (trigger duyệt vẫn đúng)", () => {
  const go = moi();
  daDuyet(go, "y1");
  phieu(go, { request: "y1" });
  go.exec("DROP INDEX bil_posting_request_uq");
  assert.doesNotThrow(() => phieu(go, { request: "y1" }));
});
