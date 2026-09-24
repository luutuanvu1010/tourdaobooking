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

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-5 (Đợt E — lưới thứ hai cho "after_json của điều chỉnh gần nhất liệt kê ĐÚNG tập dịch vụ từ danh mục của đơn", cùng tinh thần R-ORD-4:
// lớp ứng dụng (parseMoneyEditInput) đã ép bất biến này lúc GHI, đây là kiểm dữ liệu cho trường hợp một đường ghi khác lỡ bỏ qua nó).
// ---------------------------------------------------------------------------------------------------------------------
function addService(db: DatabaseSync, s: { id: string; orderId: string; catalogCode?: string | null; sortOrder?: number }): void {
  db.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult) VALUES (?, ?, ?, ?, 'Dịch vụ', 'perPax', 1)`)
    .run(s.id, s.orderId, s.sortOrder ?? 0, s.catalogCode ?? null);
}
function addAdjustmentAfter(db: DatabaseSync, o: { id: string; orderId: string; seq: number; after: { serviceId: string; pax?: object }[] }): void {
  db.prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', ?, 0, 0)`)
    .run(o.id, o.orderId, o.seq, JSON.stringify(o.after));
}

test("R-ORD-5: after_json liệt kê ĐÚNG tập dịch vụ từ danh mục của đơn → hợp lệ (dịch vụ nhập tay không cần liệt kê)", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addService(db, { id: "sv-manual", orderId: "o-1", catalogCode: null }); // nhập tay — KHÔNG cần có trong after_json
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [{ serviceId: "sv1", pax: { adult: 2, child: 0, senior: 0, infant: 0 } }] });
  assert.equal(violations(db, one("R-ORD-5")), 0);
});

test("R-ORD-5: after_json THIẾU một dịch vụ từ danh mục của đơn → vi phạm (chính loại lỗi Đợt E, do dữ liệu hỏng thay vì do mã đọc sai)", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addService(db, { id: "sv2", orderId: "o-1", catalogCode: "ZH2" });
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [{ serviceId: "sv1", pax: { adult: 2, child: 0, senior: 0, infant: 0 } }] }); // thiếu sv2
  assert.equal(violations(db, one("R-ORD-5")), 1);
});

test("R-ORD-5: after_json THỪA một serviceId không thuộc dịch vụ-từ-danh-mục của đơn (id lạ, hoặc trỏ nhầm dịch vụ nhập tay) → vi phạm", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [{ serviceId: "sv1", pax: {} }, { serviceId: "sv-la", pax: {} }] });
  assert.equal(violations(db, one("R-ORD-5")), 1);
});

// Đợt E task 7 — SIẾT R-ORD-5: bản đếm-số-lượng-suông trước đây (chỉ so SỐ LƯỢNG phần tử với số dịch vụ danh mục của đơn) bỏ lọt ca "TRÙNG một
// serviceId, LẤP CHỖ một dịch vụ khác đang thiếu" — đúng SỐ LƯỢNG (2 phần tử, đơn có 2 dịch vụ danh mục) nên không bị bắt là THIẾU hay THỪA, dù
// sv2 hoàn toàn không được nhắc tới. Không tăng rủi ro báo oan: `parseMoneyEditInput` đã chặn trùng khi GHI (thân yêu cầu không cho liệt kê hai
// lần), nên chỉ dữ liệu hỏng NGOÀI TẦM KIỂM mới tạo ra được ca này — không có đường ghi hợp lệ nào tự nhiên trùng serviceId.
test("R-ORD-5: after_json TRÙNG một serviceId (lấp chỗ một dịch vụ khác đang THIẾU) → vi phạm — đúng SỐ LƯỢNG phần tử nhưng có trùng, không phải mỗi dịch vụ một phần tử", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addService(db, { id: "sv2", orderId: "o-1", catalogCode: "ZH2" });
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [{ serviceId: "sv1", pax: {} }, { serviceId: "sv1", pax: {} }] }); // 2 phần tử = 2 dịch vụ danh mục, nhưng CẢ HAI là sv1 — sv2 vắng mặt
  assert.equal(violations(db, one("R-ORD-5")), 1);
});

test("R-ORD-5: chỉ xét dòng điều chỉnh GẦN NHẤT của mỗi đơn — dòng cũ hỏng đã bị ghi đè bởi dòng mới đúng thì KHÔNG tính", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [] }); // seq=1 hỏng (thiếu sv1) — đã cũ, không còn là dòng gần nhất
  addAdjustmentAfter(db, { id: "a2", orderId: "o-1", seq: 2, after: [{ serviceId: "sv1", pax: {} }] }); // seq=2 đúng, gần nhất
  assert.equal(violations(db, one("R-ORD-5")), 0, "chỉ dòng gần nhất được xét, không cộng dồn lỗi của các dòng cũ");
});

test("R-ORD-5: đơn chưa có điều chỉnh nào không bị tính là vi phạm", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  assert.equal(violations(db, one("R-ORD-5")), 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-5 — Lỗi 3 (kiểm độc lập Đợt E vòng 2): after_json HỎNG NẶNG (không phải JSON hợp lệ, hoặc JSON hợp lệ nhưng không phải mảng) từng làm
// `json_each`/`json_extract` NÉM LỖI THẬT ở tầng SQL — vì audit-invariants.mjs gộp MỌI kiểm vào MỘT lệnh `wrangler d1 execute`, một dòng hỏng như
// vậy làm CẢ ĐỢT rà soát thoát mã 2 ("không chạy được"), khoảng 30 quy tắc khác KHÔNG được kiểm. Test này chứng minh bằng CHÍNH câu SQL của kiểm
// (`violations()`, giống hệt cách audit-invariants.mjs đọc kết quả) — không ném lỗi, và TRẢ ĐÚNG 1 vi phạm cho đơn có dòng hỏng.
// ---------------------------------------------------------------------------------------------------------------------
function addAdjustmentAfterRaw(db: DatabaseSync, o: { id: string; orderId: string; seq: number; afterJson: string }): void {
  db.prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', ?, 0, 0)`).run(
    o.id, o.orderId, o.seq, o.afterJson,
  );
}

test("R-ORD-5: after_json KHÔNG PHẢI JSON hợp lệ (cú pháp hỏng) → 1 vi phạm, KHÔNG ném lỗi SQL (Lỗi 3 độc lập — trước bản sửa này làm CẢ ĐỢT rà soát thoát mã 2)", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addAdjustmentAfterRaw(db, { id: "a1", orderId: "o-1", seq: 1, afterJson: "{không phải json" });
  assert.doesNotThrow(() => violations(db, one("R-ORD-5")));
  assert.equal(violations(db, one("R-ORD-5")), 1);
});

test("R-ORD-5: after_json là JSON hợp lệ nhưng KHÔNG PHẢI mảng (object) → 1 vi phạm, không ném lỗi", () => {
  const db = build();
  addOrder(db, "o-1");
  addService(db, { id: "sv1", orderId: "o-1", catalogCode: "ZH1" });
  addAdjustmentAfterRaw(db, { id: "a1", orderId: "o-1", seq: 1, afterJson: JSON.stringify({ sv1: { adult: 2 } }) });
  assert.equal(violations(db, one("R-ORD-5")), 1);
});

test("R-ORD-5: dòng KHÁC của MỘT đơn khác (khoẻ) vẫn kiểm ĐÚNG khi có một đơn có after_json hỏng nặng ở đơn kia — cô lập theo từng đơn", () => {
  const db = build();
  addOrder(db, "o-broken");
  addService(db, { id: "sv-broken", orderId: "o-broken", catalogCode: "ZH1" });
  addAdjustmentAfterRaw(db, { id: "a-broken", orderId: "o-broken", seq: 1, afterJson: "hỏng nặng không phải JSON" });

  addOrder(db, "o-healthy");
  addService(db, { id: "sv-healthy", orderId: "o-healthy", catalogCode: "ZH2" });
  addAdjustmentAfter(db, { id: "a-healthy", orderId: "o-healthy", seq: 1, after: [{ serviceId: "sv-healthy", pax: { adult: 2, child: 0, senior: 0, infant: 0 } }] });

  assert.equal(violations(db, one("R-ORD-5")), 1, "đúng MỘT vi phạm (đơn hỏng), đơn khoẻ không bị cuốn theo");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-6a/6b (Đợt E task 9 — kiểm độc lập chỉ ra "còn cửa cho lần thứ NĂM": mọi khẳng định e2e D1–D6 cũ đo BỀ MẶT ĐỌC, đã ngừng tin cột
// subtotal_before/subtotal_after từ Task 7, nên một đột biến làm NƠI GHI hồi quy về đúng lỗi cũ không còn cổng dữ liệu nào bắt được). Hai kiểm
// này CHỦ Ý chỉ so hai con số ĐÃ LƯU với nhau (orders.subtotal, và chuỗi subtotal_after→subtotal_before giữa hai dòng liên tiếp) — KHÔNG tính lại
// effectiveSubtotal bằng SQL (tránh tạo bản sao thứ hai của chính hàm đó — xem chú thích đầy đủ ở scripts/audit-checks.mjs). Mức "warn" — không
// "fail" — vì tính năng sửa tiền đã sống trên production TỪ TRƯỚC bản vá Task 7 (xem lý do đầy đủ ở audit-checks.mjs): các test dưới đây kiểm
// ĐÚNG câu SQL, không kiểm mức (đã có test riêng "danh sách kiểm" ở đầu tệp này quét mọi mã bắt đầu bằng R-ORD nếu cần mở rộng).
// ---------------------------------------------------------------------------------------------------------------------
/** Đơn có `subtotal` (và `total`/`remaining_amount` khớp — trigger `orders_money_insert` ép) tự chọn, KHÔNG cọc/giảm giá (để subtotal = total = remaining_amount, đơn giản cho test). */
function addOrderWithSubtotal(db: DatabaseSync, id: string, subtotal: number, staffId = "s-an"): void {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', '${staffId}', 'draft', 'K', '0900000009', ${subtotal}, ${subtotal}, ${subtotal}, '${T1}', '${T1}')`);
}
function addAdjustmentMoney(db: DatabaseSync, o: { id: string; orderId: string; seq: number; before: number; after: number }): void {
  db.prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', '[]', ?, ?)`).run(
    o.id, o.orderId, o.seq, o.before, o.after,
  );
}

test("R-ORD-6a/6b: đúng hai kiểm, mức warn (lý do đầy đủ ở scripts/audit-checks.mjs: tính năng đã sống trên production trước bản vá Task 7, bảng chỉ-thêm — không tự nâng lên fail được)", () => {
  assert.equal(one("R-ORD-6a").level, "warn");
  assert.equal(one("R-ORD-6b").level, "warn");
});

test("R-ORD-6a: dòng ĐẦU TIÊN (seq=1) có subtotal_before khớp orders.subtotal → hợp lệ", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  assert.equal(violations(db, one("R-ORD-6a")), 0);
});

test("R-ORD-6a: dòng ĐẦU TIÊN có subtotal_before LỆCH orders.subtotal → vi phạm — ĐÚNG ca lỗi Task 7 (nơi ghi hồi quy, bỏ sót dịch vụ nhập tay: orders.subtotal=800.000 nhưng subtotal_before lưu thiếu 600.000)", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 600000, after: 900000 }); // đúng số nơi ghi cũ (lỗi) sẽ lưu cho D3 (Task 7)
  assert.equal(violations(db, one("R-ORD-6a")), 1);
});

test("R-ORD-6a: chỉ xét dòng seq=1 — dòng seq=2 lệch orders.subtotal KHÔNG bị 6a tính (đó là việc của 6b, so với dòng trước, không so với orders.subtotal)", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  addAdjustmentMoney(db, { id: "a2", orderId: "o-1", seq: 2, before: 999999, after: 1200000 }); // before của seq=2 KHÁC orders.subtotal — không phải việc của 6a
  assert.equal(violations(db, one("R-ORD-6a")), 0, "6a chỉ xét seq=1; seq=2 sai (999999 ≠ subtotal_after của seq=1 = 1100000) là việc của 6b");
});

test("R-ORD-6a: đơn CHƯA có điều chỉnh nào (không có dòng seq=1) không bị tính là vi phạm", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  assert.equal(violations(db, one("R-ORD-6a")), 0);
});

test("R-ORD-6a: nhiều đơn — một đơn lệch, một đơn khoẻ → đúng 1 vi phạm, đơn khoẻ không bị cuốn theo", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-broken", 800000);
  addAdjustmentMoney(db, { id: "a-broken", orderId: "o-broken", seq: 1, before: 600000, after: 900000 });
  addOrderWithSubtotal(db, "o-healthy", 200000);
  addAdjustmentMoney(db, { id: "a-healthy", orderId: "o-healthy", seq: 1, before: 200000, after: 200000 });
  assert.equal(violations(db, one("R-ORD-6a")), 1);
});

test("R-ORD-6a: đơn ĐÃ HUỶ (status cancelled) vẫn kiểm bình thường — orders.subtotal đứng yên, không phải trường hợp đặc biệt", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 200000);
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'o-1'`); // draft → cancelled là chuyển hợp lệ (0017), không cần qua 'confirmed'
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 200000, after: 200000 });
  assert.equal(violations(db, one("R-ORD-6a")), 0, "huỷ đơn không đụng orders.subtotal — vẫn khớp bình thường");
});

test("R-ORD-6b: dòng SAU (seq=2) có subtotal_before khớp subtotal_after của dòng NGAY TRƯỚC (seq=1) → hợp lệ", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  addAdjustmentMoney(db, { id: "a2", orderId: "o-1", seq: 2, before: 1100000, after: 1400000 });
  assert.equal(violations(db, one("R-ORD-6b")), 0);
});

test("R-ORD-6b: dòng SAU có subtotal_before LỆCH subtotal_after của dòng trước → vi phạm — chuỗi tiền đứt quãng", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  addAdjustmentMoney(db, { id: "a2", orderId: "o-1", seq: 2, before: 900000, after: 1400000 }); // 900.000 ≠ 1.100.000 (subtotal_after của seq=1)
  assert.equal(violations(db, one("R-ORD-6b")), 1);
});

test("R-ORD-6b: chuỗi BA dòng, chỉ MỘT mắt xích đứt (seq2→seq3) → đúng 1 vi phạm, mắt xích đúng (seq1→seq2) không bị tính", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  addAdjustmentMoney(db, { id: "a2", orderId: "o-1", seq: 2, before: 1100000, after: 1400000 }); // khớp seq=1 — mắt xích lành
  addAdjustmentMoney(db, { id: "a3", orderId: "o-1", seq: 3, before: 1500000, after: 1600000 }); // 1.500.000 ≠ 1.400.000 (subtotal_after của seq=2) — đứt
  assert.equal(violations(db, one("R-ORD-6b")), 1);
});

test("R-ORD-6b: đơn chỉ có MỘT dòng (seq=1, không có dòng trước) không bị tính là vi phạm", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  assert.equal(violations(db, one("R-ORD-6b")), 0);
});

test("R-ORD-6b: nhiều đơn — seq đánh số lại từ 1 ở mỗi đơn, KHÔNG bắt cặp nhầm giữa hai đơn khác nhau", () => {
  const db = build();
  addOrderWithSubtotal(db, "o-1", 800000);
  addAdjustmentMoney(db, { id: "a1", orderId: "o-1", seq: 1, before: 800000, after: 1100000 });
  addOrderWithSubtotal(db, "o-2", 500000);
  addAdjustmentMoney(db, { id: "a2", orderId: "o-2", seq: 1, before: 500000, after: 700000 }); // seq=1 của o-2, KHÔNG được ghép với seq=1 của o-1 (prev.seq = a.seq - 1 CÙNG order_id)
  assert.equal(violations(db, one("R-ORD-6b")), 0, "hai đơn khác nhau, mỗi đơn tự seq=1 riêng — không có 'dòng trước' nào để so, không phải vi phạm");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-AUT-1 (ADR-0016 điều 6/8 — lưới dữ liệu cho "tài khoản đã ngưng không còn Face ID hiệu lực"). Đỏ trên D1 thật là LỖI THẬT, không nới kiểm.
// Đường API ngưng tài khoản gỡ passkey trong cùng lô ghi (8b — test ở src/modules/accounts/patch-staff.test.ts), nên chỉ dữ liệu lọt lưới mới đỏ.
// ---------------------------------------------------------------------------------------------------------------------
function addPasskey(db: DatabaseSync, o: { id: string; staffId: string; from?: string; to?: string | null }): void {
  const from = o.from ?? T1;
  db.prepare(
    `INSERT INTO aut_passkey (id, staff_id, credential_id, public_key, algorithm, user_handle, sign_count, label, last_used_at, valid_from_at, valid_to_at, created_at, updated_at)
     VALUES (?, ?, ?, 'pubkey-spki-der-base64url', -7, ?, 0, 'Máy thử', NULL, ?, ?, ?, ?)`,
  ).run(o.id, o.staffId, `${o.id}-credential-0000000000`, `${o.id}-userhandle-00000000`, from, o.to ?? null, from, from);
}

test("R-AUT-1: đúng một kiểm, mức fail (dữ liệu KHÔNG được gỡ passkey khi ngưng tài khoản — lưới, không phải đường chặn đăng nhập)", () => {
  assert.equal(one("R-AUT-1").level, "fail");
});

test("R-AUT-1: Face ID còn hiệu lực (valid_to_at NULL) của tài khoản đã ngưng (active = 0) là vi phạm", () => {
  const db = build();
  addPasskey(db, { id: "pk-binh", staffId: "s-binh" }); // s-binh: active = 0 trong build()
  assert.equal(violations(db, one("R-AUT-1")), 1);
});

test("R-AUT-1: Face ID đã gỡ (valid_to_at có giá trị) của tài khoản đã ngưng KHÔNG tính là vi phạm", () => {
  const db = build();
  addPasskey(db, { id: "pk-binh", staffId: "s-binh", to: T2 });
  assert.equal(violations(db, one("R-AUT-1")), 0);
});

test("R-AUT-1: Face ID còn hiệu lực của tài khoản ĐANG hoạt động KHÔNG tính là vi phạm", () => {
  const db = build();
  addPasskey(db, { id: "pk-an", staffId: "s-an" }); // s-an: active = 1 trong build()
  assert.equal(violations(db, one("R-AUT-1")), 0);
});
