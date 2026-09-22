// Kiểm toán bất biến (scripts/audit-invariants.mjs): chạy CHÍNH các câu SQL của script — lấy từ scripts/audit-checks.mjs, cùng một nguồn với lần chạy trên D1 —
// trên SQLite thật (node:sqlite) với schema dựng từ TOÀN BỘ migrations/*.sql. Trước đây các câu này chỉ được thử tay trên D1 tạm; ở đây R-DSP-1/2a/2b/3 có ca đỏ và ca xanh.
// Ngoài phạm vi: cơ chế gọi wrangler và mã thoát (1 = vi phạm, 2 = không chạy được, vd D1 chưa có bảng dsp_*) — do e2e (bước cuối của tests/e2e/run.mjs) kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

interface Check {
  code: string;
  what: string;
  sql: string;
  level: "fail" | "warn-unless-strict" | "warn";
  mode?: "rows";
  note?: string;
}
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };

const DIR = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlText = (f: string): string => readFileSync(new URL(f, DIR), "utf8");

const T1 = "2026-09-21T01:00:00.000Z";
const T2 = "2026-09-21T02:00:00.000Z";
const T3 = "2026-09-21T03:00:00.000Z";
const T4 = "2026-09-21T04:00:00.000Z";
const T5 = "2026-09-21T05:00:00.000Z";

const one = (code: string): Check => {
  const found = CHECKS.filter((c) => c.code === code);
  assert.equal(found.length, 1, `phải có đúng một kiểm ${code}`);
  return found[0]!;
};
/** Số vi phạm của một kiểm — đúng cách scripts/audit-invariants.mjs đọc kết quả. */
function violations(db: DatabaseSync, check: Check): number {
  const rows = db.prepare(check.sql.replace(/\s+/g, " ").trim()).all();
  return check.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
}

/**
 * Schema đầy đủ + dữ liệu KHOẺ: một quản trị, ba nhân viên (An còn quyền; Bình đã ngưng nhưng còn quyền SALES; Cửu còn hoạt động nhưng chỉ còn FIELD —
 * cấp hẹp, ĐỦ điều kiện làm người phụ trách từ ADR-0014 điều 6/Phase B, không còn là ca vi phạm),
 * một hồ sơ không có tài khoản (Xa). Tài khoản được tạo trước 0012 để backfill sinh hồ sơ/quyền như production. Chưa đơn nào, chưa người phụ trách nào.
 */
function build(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) db.exec(sqlText(f));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-admin', 'Quản Trị Viên', '0901000001', 'x', 'admin', 1, '2026-09-01T00:00:00.000Z'),
    ('s-an', 'Nguyễn Văn An', '0901000002', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z'),
    ('s-binh', 'Trần Thị Bình', '0901000003', 'x', 'sales', 0, '2026-09-01T00:00:00.000Z'),
    ('s-cuu', 'Lê Cẩm Cửu', '0901000004', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) db.exec(sqlText(f));
  // Cửu mất quyền Bán hàng, chỉ còn Hướng dẫn viên (FIELD): cấp hẹp, đủ điều kiện làm người phụ trách (ADR-0014 điều 6) — không còn là ca vi phạm R-DSP-2a.
  // (valid_from_at của quyền backfill là giờ chạy migration nên đóng bằng chính giá trị đó, không dùng ngày cố định.)
  db.exec(`UPDATE stf_permission SET valid_to_at = valid_from_at WHERE staff_id = 's-cuu'`);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
           SELECT 'stp-cuu-field', 's-cuu', 'FIELD', valid_from_at, created_at, updated_at FROM stf_permission WHERE staff_id = 's-cuu'`);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-xa', 'PERSON', 'Lê Văn Xa', 1, '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES ('pty-xa', 'Lê', 'Văn', 'Xa', '${T1}', '${T1}')`);
  return db;
}

function addOrder(db: DatabaseSync, id: string, staffId = "s-an"): void {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', '${staffId}', 'draft', 'K', '0900000009', '${T1}', '${T1}')`);
}

interface Row {
  id: string;
  order: string;
  party: string;
  from: string;
  to: string | null;
  kind?: string;
}
function addRow(db: DatabaseSync, r: Row): void {
  db.prepare(
    `INSERT INTO dsp_assignment (id, order_id, order_service_id, task_kind_code, party_id, status_code, valid_from_at, valid_to_at, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, 'PENDING', ?, ?, ?, ?)`,
  ).run(r.id, r.order, r.kind ?? "HANDLE", r.party, r.from, r.to, r.from, r.from);
}

/** Đơn `o-<n>` của An có một người phụ trách đang mở là hồ sơ `party`. */
function withHandler(db: DatabaseSync, party: string, order = "o-1"): void {
  addOrder(db, order);
  addRow(db, { id: `h-${order}`, order, party, from: T1, to: null });
}

// ---------------------------------------------------------------------------------------------------------------------
test("danh sách kiểm: một nguồn duy nhất (script import scripts/audit-checks.mjs); R-DSP-2 tách 2a/2b; mức đúng như đã chốt", () => {
  const script = readFileSync(new URL("../scripts/audit-invariants.mjs", import.meta.url), "utf8");
  assert.match(script, /from "\.\/audit-checks\.mjs"/, "script phải lấy danh sách kiểm từ audit-checks.mjs");
  assert.doesNotMatch(script, /FROM dsp_assignment|FROM staff/i, "không được chép câu SQL vào script (test sẽ không kiểm đúng cái script chạy)");

  assert.deepEqual(
    CHECKS.filter((c) => c.code.startsWith("R-DSP")).map((c) => [c.code, c.level]),
    [["R-DSP-1", "fail"], ["R-DSP-2a", "warn-unless-strict"], ["R-DSP-2b", "warn"], ["R-DSP-3", "fail"]],
    "2a (không tài khoản/mất quyền) đỏ khi --strict; 2b (tài khoản đã ngưng) chỉ cảnh báo; R-DSP-3 (chồng lấn) là vi phạm thật",
  );
  for (const c of CHECKS) {
    assert.ok(c.code && c.what && c.sql.trim(), `kiểm thiếu trường: ${JSON.stringify(c.code)}`);
    assert.ok(["fail", "warn-unless-strict", "warn"].includes(c.level), `${c.code}: mức lạ ${c.level}`);
  }
});

test("dữ liệu khoẻ: MỌI kiểm (N1 và dispatch) chạy được trên schema đầy đủ và cho 0 vi phạm — kể cả khi mọi đơn có người phụ trách hợp lệ", () => {
  const db = build();
  withHandler(db, "pty-s-an", "o-1");
  withHandler(db, "pty-s-admin", "o-2");
  assert.deepEqual(CHECKS.map((c) => [c.code, c.what, violations(db, c)]).filter((r) => r[2] !== 0), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// R-DSP-1
// ---------------------------------------------------------------------------------------------------------------------
test("R-DSP-1: hai HANDLE đang mở cùng một đơn là vi phạm (chỉ xảy ra khi chỉ mục duy nhất một phần bị gỡ); đơn khác/PICKUP không tính", () => {
  const db = build();
  addOrder(db, "o-1");
  addOrder(db, "o-2");
  addRow(db, { id: "a", order: "o-1", party: "pty-s-an", from: T1, to: null });
  addRow(db, { id: "p1", order: "o-1", party: "pty-s-an", from: T1, to: null, kind: "PICKUP" });
  addRow(db, { id: "p2", order: "o-1", party: "pty-s-admin", from: T1, to: null, kind: "PICKUP" });
  addRow(db, { id: "b", order: "o-2", party: "pty-s-admin", from: T1, to: null });
  assert.equal(violations(db, one("R-DSP-1")), 0);
  assert.throws(() => addRow(db, { id: "c", order: "o-1", party: "pty-s-admin", from: T2, to: null }), /UNIQUE/, "chỉ mục duy nhất chặn từ gốc");
  db.exec("DROP INDEX dsp_assignment_handler_open_uq");
  addRow(db, { id: "c", order: "o-1", party: "pty-s-admin", from: T2, to: null });
  assert.equal(violations(db, one("R-DSP-1")), 1, "bỏ chỉ mục thì kiểm này là lưới cuối");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-DSP-2a / 2b (tách từ R-DSP-2 cũ)
// ---------------------------------------------------------------------------------------------------------------------
test("R-DSP-2a/2b: hồ sơ không tài khoản hoặc mất hết quyền đủ điều kiện = 2a (đỏ khi --strict); tài khoản đã ngưng = 2b (chỉ cảnh báo); mỗi dòng đúng MỘT bên", () => {
  const cases: [string, string, number, number][] = [
    // [mô tả, hồ sơ người phụ trách, R-DSP-2a, R-DSP-2b]
    ["An: đang hoạt động, còn SALES", "pty-s-an", 0, 0],
    ["quản trị đang hoạt động", "pty-s-admin", 0, 0],
    ["Xa: hồ sơ không có tài khoản", "pty-xa", 1, 0],
    ["Cửu: còn hoạt động, chỉ còn FIELD — cấp hẹp vẫn đủ điều kiện (ADR-0014 điều 6)", "pty-s-cuu", 0, 0],
    ["Bình: tài khoản đã ngưng (quyền SALES còn mở)", "pty-s-binh", 0, 1],
  ];
  for (const [what, party, a, b] of cases) {
    const db = build();
    withHandler(db, party);
    assert.deepEqual([violations(db, one("R-DSP-2a")), violations(db, one("R-DSP-2b"))], [a, b], what);
  }
  // Cửu đã ngưng (dù vẫn còn quyền FIELD) → 2b, không phải 2a (khác ca "mất hết quyền" ở dưới).
  const suspendedButEligible = build();
  suspendedButEligible.exec("UPDATE staff SET active = 0 WHERE id = 's-cuu'");
  withHandler(suspendedButEligible, "pty-s-cuu");
  assert.deepEqual([violations(suspendedButEligible, one("R-DSP-2a")), violations(suspendedButEligible, one("R-DSP-2b"))], [0, 1], "ngưng nhưng còn FIELD: chỉ 2b");
  // Một tài khoản đã ngưng VÀ mất hết quyền đủ điều kiện → chỉ 2a (không đếm hai lần).
  const db = build();
  db.exec("UPDATE staff SET active = 0 WHERE id = 's-cuu'");
  db.exec("UPDATE stf_permission SET valid_to_at = valid_from_at WHERE staff_id = 's-cuu' AND permission_type_code = 'FIELD'");
  withHandler(db, "pty-s-cuu");
  assert.deepEqual([violations(db, one("R-DSP-2a")), violations(db, one("R-DSP-2b"))], [1, 0], "ngưng + mất hết quyền: chỉ 2a");
  // Nhiều đơn: cộng dồn theo từng nhóm; dòng đã đóng và đơn không có người phụ trách không tính.
  const many = build();
  withHandler(many, "pty-xa", "o-1");
  withHandler(many, "pty-s-cuu", "o-2"); // FIELD, đang hoạt động: hợp lệ, không cộng vào 2a/2b nào
  withHandler(many, "pty-s-binh", "o-3");
  withHandler(many, "pty-s-an", "o-4");
  addOrder(many, "o-5"); // chưa có người phụ trách: hợp lệ
  addOrder(many, "o-6");
  addRow(many, { id: "closed", order: "o-6", party: "pty-xa", from: T1, to: T2 }); // đã đóng: lịch sử
  assert.deepEqual([violations(many, one("R-DSP-2a")), violations(many, one("R-DSP-2b"))], [1, 1]);
});

// ---------------------------------------------------------------------------------------------------------------------
// R-DSP-3
// ---------------------------------------------------------------------------------------------------------------------
/** Số cặp chồng lấn R-DSP-3 tìm thấy trên một tập dòng của đơn `o-1`. `dropIndex`: gỡ chỉ mục duy nhất để dựng được hai dòng cùng mở. */
function overlapCount(rows: [string, string | null, string?][], dropIndex = false): number {
  const db = build();
  addOrder(db, "o-1");
  if (dropIndex) db.exec("DROP INDEX dsp_assignment_handler_open_uq");
  rows.forEach(([from, to, kind], i) => addRow(db, { id: `r${i}`, order: "o-1", party: i % 2 === 0 ? "pty-s-an" : "pty-s-admin", from, to, kind }));
  return violations(db, one("R-DSP-3"));
}

test("R-DSP-3: đóng dòng cũ và mở dòng mới CÙNG một thời điểm là HỢP LỆ (đầu mút chạm nhau, khoảng nửa mở không chồng); chuỗi đổi qua lại cũng vậy", () => {
  assert.equal(overlapCount([[T1, T2], [T2, null]]), 0, "đổi một lần");
  assert.equal(overlapCount([[T1, T2], [T2, T3], [T3, null]]), 0, "đổi hai lần (An → Admin → An)");
  assert.equal(overlapCount([[T1, T2], [T2, T3], [T3, T4], [T4, T5], [T5, null]]), 0, "đổi nhiều lần");
  assert.equal(overlapCount([[T1, null]]), 0, "một dòng mở");
  assert.equal(overlapCount([]), 0, "không dòng nào");
  assert.equal(overlapCount([[T1, T2], [T3, null]]), 0, "có khoảng trống giữa hai người: không phải chồng lấn (đơn tạm không người phụ trách)");
  // Đổi người hai lần trong cùng một mili-giây (T2 = T2): dòng giữa có độ dài 0 nhưng không chồng với hàng xóm.
  assert.equal(overlapCount([[T1, T2], [T2, T2], [T2, null]]), 0, "dòng độ dài 0 ở đầu mút");
});

test("R-DSP-3: chồng lấn THẬT bị bắt — đóng/đóng, đóng/mở, bao trùm, trùng khít, hai dòng cùng mở, dòng độ dài 0 nằm giữa; đếm theo số CẶP", () => {
  assert.equal(overlapCount([[T1, T3], [T2, T4]]), 1, "hai khoảng đã đóng gối lên nhau");
  assert.equal(overlapCount([[T1, T3], [T2, null]]), 1, "dòng mở bắt đầu TRƯỚC khi dòng cũ đóng");
  assert.equal(overlapCount([[T1, T4], [T2, T3]]), 1, "một khoảng nằm trọn trong khoảng kia");
  assert.equal(overlapCount([[T1, T2], [T1, T2]]), 1, "trùng khít");
  assert.equal(overlapCount([[T1, T4], [T2, T2]]), 1, "dòng độ dài 0 nằm GIỮA khoảng của người khác");
  assert.equal(overlapCount([[T1, null], [T2, null]], true), 1, "hai dòng cùng mở (chỉ mục duy nhất bị gỡ) — R-DSP-3 cũng bắt, cạnh R-DSP-1");
  assert.equal(overlapCount([[T1, T5], [T2, T5], [T3, T5]]), 3, "ba dòng gối nhau = ba cặp");
});

test("R-DSP-3: chỉ xét HANDLE cùng một đơn — việc khác (PICKUP) và đơn khác không liên quan", () => {
  assert.equal(overlapCount([[T1, null, "PICKUP"], [T1, null, "PICKUP"]]), 0, "nhiều việc đón cùng mở là hợp lệ");
  assert.equal(overlapCount([[T1, null, "HANDLE"], [T1, null, "PICKUP"]]), 0, "HANDLE không chồng với việc khác loại");

  const db = build();
  addOrder(db, "o-1");
  addOrder(db, "o-2");
  addRow(db, { id: "x", order: "o-1", party: "pty-s-an", from: T1, to: null });
  addRow(db, { id: "y", order: "o-2", party: "pty-s-admin", from: T1, to: null });
  assert.equal(violations(db, one("R-DSP-3")), 0, "hai đơn khác nhau cùng khoảng thời gian: đúng");
});

test("R-DSP-3: dữ liệu do CHÍNH luồng đổi người sinh ra (đóng + mở cùng thời điểm, nhiều lần) không bị kiểm này báo", () => {
  const db = build();
  withHandler(db, "pty-s-an");
  let party = "pty-s-admin";
  for (const at of [T2, T3, T4, T5]) {
    db.exec("BEGIN");
    db.prepare("UPDATE dsp_assignment SET valid_to_at = max(?, valid_from_at) WHERE order_id = 'o-1' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL").run(at);
    addRow(db, { id: `h-${at}`, order: "o-1", party, from: at, to: null });
    db.exec("COMMIT");
    party = party === "pty-s-admin" ? "pty-s-an" : "pty-s-admin";
  }
  assert.equal(violations(db, one("R-DSP-3")), 0);
  assert.equal(violations(db, one("R-DSP-1")), 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-4 (ADR-0014 điều 6, Phase B — lưới thứ hai cho khoá lạc quan của insertMoneyAdjustment)
// ---------------------------------------------------------------------------------------------------------------------
function addAdjustment(db: DatabaseSync, id: string, order: string, seq: number): void {
  db.prepare(
    `INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', '[]', 0, 0)`,
  ).run(id, order, seq);
}

test("R-ORD-4: seq liên tục từ 1 theo từng đơn là hợp lệ; nhiều đơn không ảnh hưởng nhau", () => {
  const db = build();
  addOrder(db, "o-1");
  addOrder(db, "o-2");
  addAdjustment(db, "a1", "o-1", 1);
  addAdjustment(db, "a2", "o-1", 2);
  addAdjustment(db, "a3", "o-1", 3);
  addAdjustment(db, "a4", "o-2", 1); // đơn khác, seq lại bắt đầu từ 1 — không tính chung với o-1
  assert.equal(violations(db, one("R-ORD-4")), 0);
});

test("R-ORD-4: nhảy cóc (thiếu một seq ở giữa) là vi phạm — mọi dòng SAU chỗ hụt đều bị tính (không chỉ dòng gây ra)", () => {
  const db = build();
  addOrder(db, "o-1");
  addAdjustment(db, "a1", "o-1", 1);
  addAdjustment(db, "a2", "o-1", 3); // thiếu seq=2
  assert.equal(violations(db, one("R-ORD-4")), 1, "chỉ một dòng (a2, seq=3 ≠ rn=2) lệch — a1 (seq=1=rn=1) vẫn đúng");
});

test("R-ORD-4: đơn chưa có điều chỉnh nào (không có dòng) không bị tính là vi phạm", () => {
  const db = build();
  addOrder(db, "o-1");
  assert.equal(violations(db, one("R-ORD-4")), 0);
});
