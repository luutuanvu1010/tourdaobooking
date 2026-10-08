// Kiểm toán bất biến (scripts/audit-invariants.mjs): chạy CHÍNH các câu SQL của script — lấy từ scripts/audit-checks.mjs, cùng một nguồn với lần chạy trên D1 —
// trên SQLite thật (node:sqlite) với schema dựng từ TOÀN BỘ migrations/*.sql. Trước đây các câu này chỉ được thử tay trên D1 tạm; ở đây R-DSP-1/2a/2b/3 có ca đỏ và ca xanh.
// Ngoài phạm vi: cơ chế gọi wrangler và mã thoát (1 = vi phạm, 2 = không chạy được, vd D1 chưa có bảng dsp_*) — do e2e (bước cuối của tests/e2e/run.mjs) kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { demSietTheoTap } from "./modules/auth/repository.ts";
import { OWNER_COMPANY_ROLE } from "./shared/cong-ty-chu.ts";
import { vnToday } from "./shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts — hàm gieo DÙNG CHUNG mốc giờ hẹn (ADR-0051)
import { gieoMocXep } from "../tests/audit/gieo-vc.mjs";
import { gieoLyDoHuy } from "../tests/audit/huy-don.mjs";
import { gieoDongTienKhop } from "../tests/audit/dong-tien.mjs";

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
 * Schema đầy đủ + dữ liệu KHOẺ: một quản trị, bốn nhân viên (An còn quyền; Bình đã ngưng nhưng còn quyền SALES; Cửu còn hoạt động nhưng chỉ còn FIELD —
 * cấp hẹp, ĐỦ điều kiện làm người phụ trách từ ADR-0014 điều 6/Phase B, không còn là ca vi phạm; Lai còn SALES nhưng THÊM quyền Đối tác (PARTNER) —
 * tài khoản LAI, không đủ điều kiện dù còn SALES, ADR-0030 S20-5), một hồ sơ không có tài khoản (Xa). Tài khoản được tạo trước 0012 để backfill sinh
 * hồ sơ/quyền như production. Chưa đơn nào, chưa người phụ trách nào.
 */
function build(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) db.exec(sqlText(f));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-admin', 'Quản Trị Viên', '0901000001', 'x', 'admin', 1, '2026-09-01T00:00:00.000Z'),
    ('s-an', 'Nguyễn Văn An', '0901000002', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z'),
    ('s-binh', 'Trần Thị Bình', '0901000003', 'x', 'sales', 0, '2026-09-01T00:00:00.000Z'),
    ('s-cuu', 'Lê Cẩm Cửu', '0901000004', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z'),
    ('s-lai', 'Lâm Lai Đôi', '0901000005', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) db.exec(sqlText(f));
  // Cửu mất quyền Bán hàng, chỉ còn Hướng dẫn viên (FIELD): cấp hẹp, đủ điều kiện làm người phụ trách (ADR-0014 điều 6) — không còn là ca vi phạm R-DSP-2a.
  // (valid_from_at của quyền backfill là giờ chạy migration nên đóng bằng chính giá trị đó, không dùng ngày cố định.)
  db.exec(`UPDATE stf_permission SET valid_to_at = valid_from_at WHERE staff_id = 's-cuu'`);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
           SELECT 'stp-cuu-field', 's-cuu', 'FIELD', valid_from_at, created_at, updated_at FROM stf_permission WHERE staff_id = 's-cuu'`);
  // Lai: còn SALES (backfill) THÊM quyền Đối tác (PARTNER) — tài khoản LAI, không đủ điều kiện làm người phụ trách dù còn SALES (ADR-0030 S20-5).
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
           SELECT 'stp-lai-partner', 's-lai', 'PARTNER', valid_from_at, created_at, updated_at FROM stf_permission WHERE staff_id = 's-lai'`);
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
    ["Lai: còn SALES nhưng THÊM quyền Đối tác (tài khoản lai) — không đủ điều kiện (ADR-0030 S20-5)", "pty-s-lai", 1, 0],
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
  gieoLyDoHuy(db, "o-1");
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

// ---------------------------------------------------------------------------------------------------------------------
// R-AUT-SESSION-1/2 (ADR-0075): lưới dữ liệu của sổ phiên. SESSION-1 không thể đỏ khi còn chỉ mục `aut_session_one_live` ⇒ ca đỏ phải bỏ chỉ mục trước.
// ---------------------------------------------------------------------------------------------------------------------
const XA = "2099-01-01T00:00:00.000Z"; // hạn còn xa (phiên còn hạn)
function addSession(db: DatabaseSync, o: { id: string; staffId: string; single?: 0 | 1; expires?: string; ended?: boolean }): void {
  db.prepare(
    `INSERT INTO aut_session (id, staff_id, method, single, device_label, created_at, last_seen_at, expires_at, ended_at, end_reason, updated_at)
     VALUES (?, ?, 'PIN', ?, 'Máy thử', ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.staffId, o.single ?? 1, T1, T1, o.expires ?? XA, o.ended ? T2 : null, o.ended ? "dang_xuat" : null, T1);
}

test("R-AUT-SESSION-1/2: đúng một kiểm mỗi mã, mức fail", () => {
  assert.equal(one("R-AUT-SESSION-1").level, "fail");
  assert.equal(one("R-AUT-SESSION-2").level, "fail");
});

test("R-AUT-SESSION-1: hai phiên sống single = 1 cùng tài khoản (chỉ mục đã mất) là MỘT vi phạm", () => {
  const db = build();
  db.exec("DROP INDEX aut_session_one_live");
  addSession(db, { id: "ss-1", staffId: "s-an" });
  addSession(db, { id: "ss-2", staffId: "s-an" });
  addSession(db, { id: "ss-3", staffId: "s-an" });
  assert.equal(violations(db, one("R-AUT-SESSION-1")), 1, "đếm theo tài khoản, không theo dòng");
});

test("R-AUT-SESSION-1: phiên đã kết thúc, phiên quá hạn, phiên miễn (single = 0) không tính", () => {
  const db = build();
  db.exec("DROP INDEX aut_session_one_live");
  addSession(db, { id: "ss-1", staffId: "s-an" });
  addSession(db, { id: "ss-2", staffId: "s-an", ended: true });
  addSession(db, { id: "ss-3", staffId: "s-an", expires: T2 });
  addSession(db, { id: "ss-4", staffId: "s-admin", single: 0 });
  addSession(db, { id: "ss-5", staffId: "s-admin", single: 0 });
  assert.equal(violations(db, one("R-AUT-SESSION-1")), 0);
});

test("R-AUT-SESSION-2: phiên chưa kết thúc của tài khoản đã ngưng là vi phạm — kể cả phiên đã quá hạn", () => {
  const db = build();
  addSession(db, { id: "ss-binh", staffId: "s-binh" }); // s-binh: active = 0 trong build()
  assert.equal(violations(db, one("R-AUT-SESSION-2")), 1);
  db.exec("UPDATE aut_session SET expires_at = '2026-09-21T02:00:00.000Z' WHERE id = 'ss-binh'");
  assert.equal(violations(db, one("R-AUT-SESSION-2")), 1, "lô ngưng kết thúc mọi dòng chưa kết thúc, không lọc hạn");
});

test("R-AUT-SESSION-2: phiên đã kết thúc của tài khoản ngưng, phiên sống của tài khoản đang hoạt động không tính", () => {
  const db = build();
  addSession(db, { id: "ss-binh", staffId: "s-binh", ended: true });
  addSession(db, { id: "ss-an", staffId: "s-an" });
  assert.equal(violations(db, one("R-AUT-SESSION-2")), 0);
});

test("R-AUT-SESSION-3 (ADR-0085 điều 8): mức warn (không đỏ ở --strict — khe đăng nhập chạy đua đã biết)", () => {
  assert.equal(one("R-AUT-SESSION-3").level, "warn");
});

/** build() có s-admin (ADMIN), s-an (SALES), s-lai (SALES + PARTNER), s-cuu (FIELD) đang hoạt động. Chính sách: Đối tác = Nhiều máy; s-admin thêm Toàn quyền. */
function buildChinhSach(): DatabaseSync {
  const db = build();
  db.exec(`INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('pol-partner', 'PARTNER', 1, '${T1}', '${T1}', '${T1}')`);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('stp-admin-sa', 's-admin', 'SUPER_ADMIN', '${T1}', '${T1}', '${T1}')`);
  addSession(db, { id: "an-1", staffId: "s-an", single: 0 }); // đăng nhập chạy đua lúc chính sách cũ → vi phạm
  addSession(db, { id: "an-2", staffId: "s-an", single: 0 });
  addSession(db, { id: "lai-1", staffId: "s-lai", single: 0 }); // một quyền (Đối tác) Nhiều máy → không
  addSession(db, { id: "lai-2", staffId: "s-lai", single: 0 });
  addSession(db, { id: "ad-1", staffId: "s-admin", single: 0 }); // Toàn quyền → không
  addSession(db, { id: "ad-2", staffId: "s-admin", single: 0 });
  addSession(db, { id: "cuu-1", staffId: "s-cuu", single: 0 }); // một phiên sống + một phiên quá hạn → không
  addSession(db, { id: "cuu-2", staffId: "s-cuu", single: 0, expires: T2 });
  return db;
}

test("R-AUT-SESSION-3: tài khoản theo chính sách HIỆN HÀNH là một máy mà có > 1 phiên sống còn hạn là MỘT vi phạm; nhiều máy (chính sách / Toàn quyền), phiên quá hạn không tính", () => {
  assert.equal(violations(buildChinhSach(), one("R-AUT-SESSION-3")), 1, "chỉ s-an; đếm theo tài khoản");
});

test("R-AUT-SESSION-3 đếm cùng tập tài khoản với xem trước khi tập Nhiều máy = chính sách hiện hành (cùng mẩu điều kiện SQL)", async () => {
  const db = buildChinhSach();
  const d1 = { prepare: (sql: string) => ({ bind: (...a: SupportedValueType[]) => ({ first: async () => ({ ...db.prepare(sql).get(...a) }) }) }) } as unknown as D1Database;
  const xemTruoc = await demSietTheoTap(d1, ["PARTNER"], new Date().toISOString());
  assert.equal(xemTruoc.soNguoi, violations(db, one("R-AUT-SESSION-3")));
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ADR13-1 (ADR-0013 điều 5, chủ dự án chọn B 2026-09-24): tài khoản đang hoạt động ⇒ hồ sơ của nó đang hoạt động. Chiều ngược lại hợp lệ ("tạm khoá").
// ---------------------------------------------------------------------------------------------------------------------
test("R-ADR13-1: tài khoản đang hoạt động mà hồ sơ bị ngưng là vi phạm (fail); tài khoản ngưng + hồ sơ hoạt động thì không", () => {
  const c = one("R-ADR13-1");
  assert.equal(c.level, "fail");
  const db = build();
  assert.equal(violations(db, c), 0);
  db.exec("UPDATE staff SET active = 0 WHERE id = 's-an'");
  assert.equal(violations(db, c), 0, "tạm khoá: tài khoản ngưng, hồ sơ vẫn hoạt động — hợp lệ");
  db.exec("UPDATE pty_party SET active = 0 WHERE id = 'pty-s-admin'");
  assert.equal(violations(db, c), 1);
  db.exec("UPDATE pty_party SET active = 0 WHERE id = 'pty-s-binh'");
  assert.equal(violations(db, c), 1, "Bình đã ngưng tài khoản nên hồ sơ ngưng không tính");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-LC-1 / R-LC-3 (ADR-0018, migration 0024 — hai trigger luật cứng LC-1/LC-3 là lưới thứ nhất, chặn lúc ghi). Các kiểm dưới đây
// là LƯỚI THỨ HAI (P21) cho dữ liệu sửa tay bằng SQL trên D1 thật (trigger có thể bị gỡ/sửa nhầm hoặc dữ liệu được ghi thẳng).
// `schemaWithoutGuards`/`guardSeed` dựng dữ liệu vi phạm bằng cách gỡ bốn trigger luật cứng trước khi chèn — mô phỏng đúng tình huống kiểm phải bắt.
// ADR-0048: LC-1 tạo lại CÙNG TÊN ở migration *_tai_xe_doi_tac (nghĩa mới: quyền bên ngoài = Đối tác hoặc Tài xế đối tác) và thêm trigger LC-1b
// (lc1b_stf_permission_driver_partner_alone — gỡ thêm để dựng được tài khoản lai).
// ---------------------------------------------------------------------------------------------------------------------
/** Schema đầy đủ NHƯNG gỡ bốn trigger luật cứng — để dựng được dữ liệu vi phạm (như dữ liệu sửa tay bằng SQL trên D1 thật) mà kiểm phải bắt. */
function schemaWithoutGuards(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES) db.exec(sqlText(f));
  db.exec("DROP TRIGGER lc1_stf_permission_external_partner_only; DROP TRIGGER pty_party_role_group_conflict_ins; DROP TRIGGER pty_party_role_group_conflict_upd;");
  db.exec("DROP TRIGGER lc1b_stf_permission_driver_partner_alone;");
  return db;
}
function guardSeed(db: DatabaseSync, id: string, roles: string[], perms: string[]): void {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(`p-${id}`, id, T1, T1);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(`p-${id}`, id, T1, T1);
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(id, `09${id.padStart(8, "0").slice(-8)}`, T1, `p-${id}`);
  roles.forEach((r, i) => db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)").run(`r-${id}-${i}`, `p-${id}`, r, T1, T1));
  perms.forEach((p) => db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`g-${id}-${p}`, id, p, T1, T1, T1));
}

test("R-LC-1 (ADR-0048 B2.1): tài khoản có vai bên ngoài mà giữ quyền KHÔNG phải quyền bên ngoài → vi phạm; Đối tác hoặc Tài xế đối tác → 0", () => {
  const db = schemaWithoutGuards();
  guardSeed(db, "11", ["COLLABORATOR"], ["PARTNER"]);
  guardSeed(db, "12", ["SALES_STAFF"], ["SALES"]);
  guardSeed(db, "14", ["DRIVER_EXTERNAL"], ["DRIVER_PARTNER"]);
  assert.equal(violations(db, one("R-LC-1")), 0, "Tài xế đối tác giữ DRIVER_PARTNER không còn là vi phạm LC-1");
  guardSeed(db, "13", ["TAXI_DRIVER"], ["PARTNER", "SALES"]);
  assert.equal(violations(db, one("R-LC-1")), 1);
  guardSeed(db, "15", ["DRIVER_EXTERNAL"], ["DRIVER"]);
  assert.equal(violations(db, one("R-LC-1")), 2, "vai bên ngoài giữ quyền tài xế CÔNG TY (DRIVER) → vi phạm");
  assert.equal(one("R-LC-1").level, "fail");
});

test("R-LC-1b (ADR-0048 B2.2, B2.3): tài khoản giữ Tài xế đối tác kèm BẤT KỲ quyền nào khác (đang mở) → vi phạm (đếm tài khoản); chỉ Tài xế đối tác → 0", () => {
  const c = one("R-LC-1b");
  assert.equal(c.level, "fail");
  const db = schemaWithoutGuards();
  guardSeed(db, "41", ["DRIVER_EXTERNAL"], ["DRIVER_PARTNER"]);
  guardSeed(db, "42", ["TAXI_DRIVER"], ["PARTNER"]);
  assert.equal(violations(db, c), 0);
  guardSeed(db, "43", ["DRIVER_EXTERNAL"], ["DRIVER_PARTNER", "PARTNER"]);
  assert.equal(violations(db, c), 1);
  guardSeed(db, "44", [], ["DRIVER_PARTNER", "SALES", "ACCOUNTING"]);
  assert.equal(violations(db, c), 2, "một tài khoản lai = MỘT vi phạm, dù kèm nhiều quyền");
  // Dòng quyền ĐÃ ĐÓNG không tính (LC-1b chỉ đếm dòng đang mở — khớp trigger).
  db.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = '43' AND permission_type_code = 'PARTNER'").run(T2);
  assert.equal(violations(db, c), 1);
});

test("R-LC-3: một hồ sơ giữ cùng lúc vai nội bộ và vai bên ngoài đang mở → vi phạm", () => {
  const db = schemaWithoutGuards();
  guardSeed(db, "21", ["SALES_STAFF", "CUSTOMER"], ["SALES"]);
  assert.equal(violations(db, one("R-LC-3")), 0);
  guardSeed(db, "22", ["SALES_STAFF", "COLLABORATOR"], ["SALES"]);
  assert.equal(violations(db, one("R-LC-3")), 1);
  assert.equal(one("R-LC-3").level, "fail");
});

test("kiểm 'thông tin' về vai của nhân sự: vai STAFF cũ HOẶC vai nội bộ/bên ngoài đang mở đều đạt", () => {
  const db = schemaWithoutGuards();
  const check = CHECKS.find((c) => c.what.startsWith("nhân sự đã có hồ sơ nhưng"))!;
  guardSeed(db, "31", ["STAFF"], ["SALES"]);
  guardSeed(db, "32", ["ACCOUNTANT"], ["ACCOUNTING"]);
  assert.equal(violations(db, check), 0);
  guardSeed(db, "33", ["CUSTOMER"], ["SALES"]);
  assert.equal(violations(db, check), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
test("R-PTY-1 (ADR-0024 điều 6): đúng một hồ sơ đang mở vai công ty chủ → 0; ĐỔI công ty chủ (trigger) vẫn 0; mất dòng mở → 1; hai dòng mở (trigger đổi bị gỡ) → 1", () => {
  const c = one("R-PTY-1");
  assert.equal(c.level, "fail");
  assert.match(c.sql, new RegExp(`'${OWNER_COMPANY_ROLE}'`), "một nguồn mã vai: câu kiểm dùng đúng mã của src/shared/cong-ty-chu.ts");
  let db = build();
  assert.equal(violations(db, c), 0);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-org-b', 'ORGANIZATION', 'Pháp nhân B', 1, '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
           VALUES ('ptr-org-b', 'pty-org-b', '${OWNER_COMPANY_ROLE}', '2026-09-21', '${T1}', '${T1}')`);
  assert.equal(violations(db, c), 0, "đổi công ty chủ (chủ trả lời 2026-09-28) vẫn đúng một");
  db = build();
  db.exec(`DELETE FROM pty_party_role WHERE role_type_code = '${OWNER_COMPANY_ROLE}'`);
  assert.equal(violations(db, c), 1, "không còn hồ sơ công ty chủ");
  db = build();
  db.exec("DROP TRIGGER pty_party_role_owner_company_switch");
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at)
           VALUES ('ptr-thu-hai', 'pty-xa', '${OWNER_COMPANY_ROLE}', '2026-09-21', '${T1}', '${T1}')`);
  assert.equal(violations(db, c), 1, "hai hồ sơ cùng mở vai");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0040 (Vận chuyển 1a, Task A17): giấy tờ của người R-PTY-2..4, xe R-VC-1..2 — lưới THỨ HAI sau trigger/chỉ mục (ca đỏ gỡ trigger/chỉ mục trước rồi chèn
// dòng vi phạm, như SQL gõ tay trên D1). Mọi số ở đây là số GIẢ.
// ---------------------------------------------------------------------------------------------------------------------
let soDong = 0;
function giayToNguoi(db: DatabaseSync, o: { id?: string; party: string; type?: string; key?: string | null; truoc?: string; huy?: boolean }): string {
  const id = o.id ?? `gtn-${++soDong}`;
  const type = o.type ?? "CCCD";
  const key = o.key === undefined ? `07900000${String(soDong).padStart(4, "0")}` : o.key;
  db.prepare(
    `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, expiry_date, previous_id, voided_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '2030-01-01', ?, ?, ?, ?)`,
  ).run(id, o.party, type, key, key, type === "GPLX" ? "D2" : null, o.truoc ?? null, o.huy ? T1 : null, T1, T1);
  return id;
}
const congTyChu = (db: DatabaseSync): string => (db.prepare(`SELECT party_id FROM pty_party_role WHERE role_type_code = '${OWNER_COMPANY_ROLE}' AND valid_to_date IS NULL`).get() as { party_id: string }).party_id;
function xe(db: DatabaseSync, id: string, bien: string, trangThai = "active"): void {
  db.prepare(
    `INSERT INTO vc_vehicle (id, plate_number, plate_key, name, passenger_capacity, owner_party_id, status, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES (?, ?, ?, 'Xe thử', 15, ?, ?, '2026-09-01', ?, ?, ?)`,
  ).run(id, bien, bien, congTyChu(db), trangThai, trangThai === "retired" ? "2026-09-20" : null, T1, T1);
}
function giayToXe(db: DatabaseSync, o: { id: string; xe: string; type?: string; truoc?: string; huy?: boolean }): void {
  db.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, previous_id, voided_at, created_at, updated_at) VALUES (?, ?, ?, '2027-01-01', ?, ?, ?, ?)`)
    .run(o.id, o.xe, o.type ?? "INSPECTION", o.truoc ?? null, o.huy ? T1 : null, T1, T1);
}

test("R-PTY-2 (ADR-0040 D2): một số CCCD thuộc đúng một người — khoẻ (khác số; chính người đó gia hạn cùng số; dòng đã huỷ không tính) → 0; hai người cùng số (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-2");
  assert.equal(c.level, "fail");
  const db = build();
  const a1 = giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  giayToNguoi(db, { party: "pty-s-an", key: "079888777666", truoc: a1 });
  giayToNguoi(db, { party: "pty-xa", key: "079888777111" });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_person_document_cccd_one_person_ins");
  giayToNguoi(db, { party: "pty-xa", key: "079888777666", huy: true });
  assert.equal(violations(db, c), 0, "dòng đã huỷ không tính");
  giayToNguoi(db, { party: "pty-xa", key: "079888777666" });
  assert.equal(violations(db, c), 1);
});

test("R-PTY-3 (ADR-0040 D2): dòng gia hạn cùng người, cùng loại với dòng trước; mỗi dòng tối đa một dòng gia hạn chưa huỷ — khoẻ → 0; nối sai / tách nhánh (trigger, chỉ mục bị gỡ) → vi phạm", () => {
  const c = one("R-PTY-3");
  assert.equal(c.level, "fail");
  let db = build();
  const a1 = giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null });
  const a2 = giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null, truoc: a1 });
  giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null, truoc: a2, huy: true });
  giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null, truoc: a2 }); // dòng gia hạn nhầm đã huỷ → gia hạn lại hợp lệ
  assert.equal(violations(db, c), 0);
  const a3 = giayToNguoi(db, { party: "pty-s-an", type: "TRANSPORT_TRAINING", key: null }); // dòng chưa có dòng gia hạn nào (chỉ mục _next_uq vẫn còn)
  db.exec("DROP TRIGGER pty_person_document_renew_ins");
  giayToNguoi(db, { party: "pty-xa", type: "TRANSPORT_TRAINING", key: null, truoc: a3 });
  assert.ok(violations(db, c) >= 1, "nối sang người khác");
  db = build();
  const b1 = giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null });
  giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null, truoc: b1 });
  db.exec("DROP INDEX pty_person_document_next_uq");
  giayToNguoi(db, { party: "pty-s-an", type: "HEALTH_CHECK", key: null, truoc: b1 });
  assert.equal(violations(db, c), 1, "tách nhánh: hai dòng gia hạn chưa huỷ cùng dòng trước");
});

test("R-PTY-4 (ADR-0040 D2): nhật ký chứa số giấy tờ của người (viết cách quãng cũng bắt) → 1; chỉ số che '••••7666' → 0; mức warn-unless-strict (nhật ký chỉ-thêm)", () => {
  const c = one("R-PTY-4");
  assert.equal(c.level, "warn-unless-strict");
  assert.match(c.note ?? "", /dữ liệu cá nhân/);
  const db = build();
  giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  giayToNguoi(db, { party: "pty-xa", type: "HEALTH_CHECK", key: "SK12" }); // số ngắn (< 8) không dò — tránh báo oan chuỗi ngắn trùng ngẫu nhiên
  const log = (id: string, detail: string) => db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_document_added', 'party', 'pty-s-an', ?, ?)").run(id, detail, T1);
  log("l-1", "Căn cước công dân (CCCD), hết hạn 2030-01-01 · ••••7666");
  log("l-2", "Khám sức khoẻ SK12");
  assert.equal(violations(db, c), 0);
  log("l-3", "Căn cước công dân (CCCD) 079 888.777-666");
  assert.equal(violations(db, c), 1);
});

test("R-VC-1 (ADR-0040 D1): biển số không trùng giữa các xe CHƯA NGỪNG — xe đã ngừng giữ biển cũ không tính → 0; hai xe đang dùng cùng biển (chỉ mục bị gỡ) → 1", () => {
  const c = one("R-VC-1");
  assert.equal(c.level, "fail");
  const db = build();
  xe(db, "xe-cu", "79B01234", "retired");
  xe(db, "xe-moi", "79B01234");
  xe(db, "xe-bd", "51F11111", "maintenance");
  assert.equal(violations(db, c), 0);
  db.exec("DROP INDEX vc_vehicle_plate_open_uq");
  xe(db, "xe-trung", "51F11111");
  assert.equal(violations(db, c), 1, "xe bảo dưỡng vẫn giữ biển");
});

test("R-VC-2 (ADR-0040 D1): dòng gia hạn giấy tờ xe cùng xe, cùng loại; không tách nhánh — khoẻ → 0; nối sang xe khác / tách nhánh (trigger, chỉ mục bị gỡ) → vi phạm", () => {
  const c = one("R-VC-2");
  assert.equal(c.level, "fail");
  let db = build();
  xe(db, "xe-a", "79B00001");
  xe(db, "xe-b", "79B00002");
  giayToXe(db, { id: "g1", xe: "xe-a" });
  giayToXe(db, { id: "g2", xe: "xe-a", truoc: "g1" });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER vc_vehicle_document_renew_ins");
  giayToXe(db, { id: "g3", xe: "xe-b", truoc: "g2" });
  assert.ok(violations(db, c) >= 1, "nối sang xe khác");
  db = build();
  xe(db, "xe-a", "79B00001");
  giayToXe(db, { id: "g1", xe: "xe-a" });
  giayToXe(db, { id: "g2", xe: "xe-a", truoc: "g1" });
  db.exec("DROP INDEX vc_vehicle_document_next_uq");
  giayToXe(db, { id: "g2b", xe: "xe-a", truoc: "g1" });
  assert.equal(violations(db, c), 1, "tách nhánh");
});

test("R-PTY-5 (ADR-0048 B1.2): quan hệ 'Tài xế của' ĐANG MỞ đi từ hồ sơ TỔ CHỨC → vi phạm; từ người → 0; đầu tới đã thôi vai Nhà xe KHÔNG là vi phạm", () => {
  const c = one("R-PTY-5");
  assert.equal(c.level, "fail");
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES) db.exec(sqlText(f));
  db.exec("DROP TRIGGER pty_relationship_drives_for_person;"); // dựng được dữ liệu vi phạm như SQL gõ tay trên D1 thật
  const party = (id: string, kind: string) =>
    db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run(id, kind, id, T1, T1);
  party("nx", "ORGANIZATION");
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-nx', 'nx', 'CARRIER', NULL, '2026-09-20', ?, ?)").run(T1, T1);
  party("nguoi", "PERSON");
  party("to-chuc", "ORGANIZATION");
  const rel = (id: string, from: string) =>
    db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'nx', 'DRIVES_FOR', '2026-09-20', ?, ?)")
      .run(id, from, T1, T1);
  rel("q1", "nguoi");
  assert.equal(violations(db, c), 0);
  rel("q2", "to-chuc");
  assert.equal(violations(db, c), 1);
  // Nhà xe thôi hợp tác (đóng vai) — quan hệ còn mở KHÔNG tự đóng và vẫn hợp lệ (ADR-0048 D1); kiểm chỉ xét đầu "từ".
  db.exec("UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE id = 'r-nx'");
  assert.equal(violations(db, c), 1);
  db.exec("UPDATE pty_party_relationship SET valid_to_date = '2026-09-28' WHERE id = 'q2'");
  assert.equal(violations(db, c), 0, "quan hệ đã đóng không tính");
});

// ---------------------------------------------------------------------------------------------------------------------
// K-01 / K-05 (đặc tả 2026-09-29 "Transportation Kernel và lỗ hệ thống", lỗ LH-04 / LH-06) — hai câu kiểm mức `warn`: chỉ PHÁT HIỆN trên dữ liệu thật
// (route vẫn nhận dòng song song / ngày kết thúc tương lai); chặn thật là việc của đề xuất sau (VK3-B cho LH-04).
// ---------------------------------------------------------------------------------------------------------------------
test("R-VC-11 (LH-04): 'hiện hành' của câu kiểm là NGUYÊN VĂN HIEN_HANH của src/modules/van-chuyen/repository.ts (một luật, không hai); mức warn, có ghi chú", () => {
  const c = one("R-VC-11");
  assert.equal(c.level, "warn");
  assert.match(c.note ?? "", /không chặn/);
  const repo = readFileSync(new URL("./modules/van-chuyen/repository.ts", import.meta.url), "utf8");
  const m = repo.match(/const HIEN_HANH = "([^"]+)";/);
  assert.ok(m, "không thấy `const HIEN_HANH = \"…\";` trong van-chuyen/repository.ts — đổi tên/khuôn thì sửa cả R-VC-11 và bài này");
  assert.ok(c.sql.includes(m[1]!), "R-VC-11 phải chứa NGUYÊN VĂN HIEN_HANH của van-chuyen/repository.ts (tránh hai luật 'hiện hành')");
});

test("R-VC-11 (LH-04): xe chưa ngừng có ≥ 2 dòng giấy tờ HIỆN HÀNH cùng loại → đếm theo cặp (xe, loại); khác loại / đã gia hạn / đã huỷ / xe đã ngừng → 0", () => {
  const c = one("R-VC-11");
  const db = build();
  db.exec("DROP TRIGGER vc_vehicle_document_one_current"); // dữ liệu CŨ có trước trigger ADR-0056 VK3-B — R-VC-11 là lưới cho đúng dữ liệu đó
  xe(db, "xe-a", "79B00001");
  giayToXe(db, { id: "a-kd", xe: "xe-a", type: "INSPECTION" });
  giayToXe(db, { id: "a-bh", xe: "xe-a", type: "TPL_INSURANCE" });
  assert.equal(violations(db, c), 0, "khác loại: mỗi loại một dòng hiện hành");
  giayToXe(db, { id: "a-kd2", xe: "xe-a", type: "INSPECTION", truoc: "a-kd" });
  assert.equal(violations(db, c), 0, "một dòng hiện hành + một dòng đã gia hạn");
  giayToXe(db, { id: "a-bh2", xe: "xe-a", type: "TPL_INSURANCE", truoc: "a-bh", huy: true });
  giayToXe(db, { id: "a-kd-huy", xe: "xe-a", type: "INSPECTION", huy: true });
  assert.equal(violations(db, c), 0, "dòng gia hạn đã huỷ (dòng trước hiện hành trở lại) và dòng đã huỷ không tính");
  xe(db, "xe-ngung", "79B00009", "retired");
  giayToXe(db, { id: "n-1", xe: "xe-ngung", type: "INSPECTION" });
  giayToXe(db, { id: "n-2", xe: "xe-ngung", type: "INSPECTION" });
  assert.equal(violations(db, c), 0, "xe đã ngừng không tính");
  // Chuỗi song song: bấm "Thêm" thay vì "Gia hạn" — dữ liệu cũ trước trigger VK3-B (LH-04).
  xe(db, "xe-b", "79B00002");
  giayToXe(db, { id: "b-1", xe: "xe-b", type: "INSPECTION" });
  giayToXe(db, { id: "b-2", xe: "xe-b", type: "INSPECTION" });
  assert.equal(violations(db, c), 1, "hai dòng hiện hành cùng loại cùng xe");
  giayToXe(db, { id: "b-3", xe: "xe-b", type: "INSPECTION" });
  assert.equal(violations(db, c), 1, "đếm CẶP (xe, loại), không đếm dòng");
  xe(db, "xe-bd", "79B00003", "maintenance");
  giayToXe(db, { id: "m-1", xe: "xe-bd", type: "REGISTRATION" });
  giayToXe(db, { id: "m-2", xe: "xe-bd", type: "REGISTRATION" });
  assert.equal(violations(db, c), 2, "xe bảo dưỡng là xe CHƯA ngừng");
});

test("R-PTY-6 (LH-06): 'hôm nay' là ngày giờ Việt Nam — câu kiểm dùng date('now', '+7 hours') (như migration), khớp vnToday; mức warn, có ghi chú", () => {
  const c = one("R-PTY-6");
  assert.equal(c.level, "warn");
  assert.match(c.note ?? "", /không chặn/);
  assert.ok(c.sql.includes("date('now', '+7 hours')"), "hôm nay theo giờ VN: date('now', '+7 hours') — date('now') là UTC, sai ngày 00:00–07:00 giờ VN");
  assert.doesNotMatch(c.sql.replaceAll("date('now', '+7 hours')", ""), /'now'/, "không có mốc 'now' nào khác (UTC)");
  const db = new DatabaseSync(":memory:");
  const truoc = vnToday(new Date());
  const sqlHomNay = (db.prepare("SELECT date('now', '+7 hours') AS d").get() as { d: string }).d;
  const sau = vnToday(new Date());
  assert.ok(sqlHomNay === truoc || sqlHomNay === sau, `date('now', '+7 hours') = ${sqlHomNay}, vnToday = ${truoc}/${sau}`);
});

test("R-PTY-6 (LH-06): vai / quan hệ hồ sơ có ngày kết thúc SAU hôm nay (giờ VN) → đếm dòng; còn mở / kết thúc hôm nay / hôm qua → 0", () => {
  const c = one("R-PTY-6");
  const db = build();
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
           VALUES ('r-xa', 'pty-xa', 'CUSTOMER', NULL, '2020-01-01', '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
           VALUES ('q-xa', 'pty-xa', 'pty-s-an', 'CONTACT_OF', '2020-01-01', '${T1}', '${T1}')`);
  assert.equal(violations(db, c), 0, "còn mở");
  const ketThuc = (bang: string, id: string, lech: string) => db.exec(`UPDATE ${bang} SET valid_to_date = date('now', '+7 hours', '${lech}') WHERE id = '${id}'`);
  ketThuc("pty_party_role", "r-xa", "-1 day");
  assert.equal(violations(db, c), 0, "vai kết thúc hôm qua");
  ketThuc("pty_party_role", "r-xa", "+0 days");
  assert.equal(violations(db, c), 0, "vai kết thúc hôm nay (route 'Kết thúc' ghi hôm nay)");
  ketThuc("pty_party_role", "r-xa", "+1 day");
  assert.equal(violations(db, c), 1, "vai kết thúc ngày mai");
  ketThuc("pty_party_relationship", "q-xa", "+0 days");
  assert.equal(violations(db, c), 1, "quan hệ kết thúc hôm nay không tính");
  ketThuc("pty_party_relationship", "q-xa", "+30 days");
  assert.equal(violations(db, c), 2, "quan hệ kết thúc sau hôm nay cũng tính (đếm dòng của cả hai bảng)");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0047 — R-ORD-7…12 (chặng đưa đón, hành khách). Tên khách là tên GIẢ có đánh dấu.
// ---------------------------------------------------------------------------------------------------------------------
const LOC_BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // "Bến tàu du lịch Nha Trang" (0010)
const vnNgay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
function dvDon(db: DatabaseSync, s: { id: string; orderId: string; time?: string | null; place?: string | null; date?: string | null; pax?: number }): void {
  db.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date, pickup_time, pickup_place) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', ?, ?, ?, ?)`)
    .run(s.id, s.orderId, s.pax ?? 2, s.date ?? vnNgay(3), s.time ?? null, s.place ?? null);
}
function chang(db: DatabaseSync, l: { id: string; orderId: string; svc: string; dir?: string; date?: string | null; time?: string | null; locId?: string | null; place?: string | null; drop?: string | null; closed?: boolean }): void {
  db.prepare(
    `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_place, closed_at, close_reason_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(l.id, l.orderId, l.svc, l.dir ?? "OUT", l.date === undefined ? vnNgay(3) : l.date, l.time ?? null, l.locId ?? null, l.locId ? null : (l.place ?? "Khách sạn A"), l.drop ?? null,
    l.closed ? T2 : null, l.closed ? "NOT_NEEDED" : null, T1, T1);
}
function khach(db: DatabaseSync, p: { id: string; orderId: string; prev?: string | null; key?: string; voided?: boolean; source?: string }): void {
  db.prepare(
    `INSERT INTO ord_passenger (id, order_id, full_name, birth_year, pax_code, previous_id, person_key, voided_at, source, created_at, updated_at) VALUES (?, ?, 'Khách Dò Tìm', 1911, NULL, ?, ?, ?, ?, ?, ?)`,
  ).run(p.id, p.orderId, p.prev ?? null, p.key ?? p.id, p.voided ? T2 : null, p.source ?? "OFFICE", T1, T1);
}
const xacNhan = (db: DatabaseSync, id: string) => db.prepare("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?").run(T3, id);

test("R-ORD-7 (ghi kép R3): cột cũ = dẫn xuất chặng chiều đi đầu → 0; lệch giờ / lệch nơi / còn cột cũ mà không chặng → vi phạm; tên điểm và chữ tạm '(chưa ghi nơi đón)' khớp", () => {
  const c = one("R-ORD-7");
  assert.equal(c.level, "warn-unless-strict");
  const db = build();
  addOrder(db, "o-1");
  dvDon(db, { id: "s1", orderId: "o-1", time: "06:30", place: "Khách sạn A" });
  chang(db, { id: "l1", orderId: "o-1", svc: "s1", time: "06:30", place: "Khách sạn A" });
  chang(db, { id: "l0", orderId: "o-1", svc: "s1", dir: "RETURN", time: "01:00", place: "Về" }); // chiều về không dẫn xuất
  dvDon(db, { id: "s2", orderId: "o-1", time: "07:00", place: "Bến tàu du lịch Nha Trang" });
  chang(db, { id: "l2", orderId: "o-1", svc: "s2", time: "07:00", locId: LOC_BEN }); // điểm danh mục → tên điểm
  dvDon(db, { id: "s3", orderId: "o-1", time: "05:00", place: null });
  chang(db, { id: "l3", orderId: "o-1", svc: "s3", time: "05:00", place: "(chưa ghi nơi đón)" }); // Q1 (a)
  dvDon(db, { id: "s4", orderId: "o-1", place: "  Sân bay  " });
  chang(db, { id: "l4", orderId: "o-1", svc: "s4", place: "Sân bay" }); // cột cũ có khoảng trắng — câu chép cắt
  dvDon(db, { id: "s5", orderId: "o-1" }); // không dữ liệu đón, không chặng
  dvDon(db, { id: "s6", orderId: "o-1" });
  chang(db, { id: "l6", orderId: "o-1", svc: "s6", time: "08:00", closed: true }); // chặng ĐÃ ĐÓNG không dẫn xuất
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE order_service SET pickup_time = '06:45' WHERE id = 's1'").run();
  assert.equal(violations(db, c), 1, "lệch giờ");
  db.prepare("UPDATE order_service SET pickup_place = 'Chỗ khác' WHERE id = 's2'").run();
  assert.equal(violations(db, c), 2, "lệch nơi");
  db.prepare("UPDATE order_service SET pickup_time = '09:00' WHERE id = 's5'").run();
  assert.equal(violations(db, c), 3, "cột cũ có mà không có chặng");
});

test("R-ORD-8: chặng mở của đơn ĐÃ XÁC NHẬN, ngày đón từ hôm nay, chưa chốt nơi trả → đếm; có nơi trả / ngày đã qua / đơn nháp / chặng đóng → không", () => {
  const c = one("R-ORD-8");
  assert.equal(c.level, "warn");
  const db = build();
  addOrder(db, "o-1");
  dvDon(db, { id: "s1", orderId: "o-1", date: vnNgay(3) });
  chang(db, { id: "l1", orderId: "o-1", svc: "s1", date: vnNgay(3) }); // thiếu nơi trả → đếm (sau xác nhận)
  chang(db, { id: "l2", orderId: "o-1", svc: "s1", date: vnNgay(3), drop: "Bến" });
  chang(db, { id: "l3", orderId: "o-1", svc: "s1", date: vnNgay(-3) }); // ngày đã qua
  chang(db, { id: "l4", orderId: "o-1", svc: "s1", date: vnNgay(3), closed: true });
  addOrder(db, "o-2");
  dvDon(db, { id: "s2", orderId: "o-2" });
  chang(db, { id: "l5", orderId: "o-2", svc: "s2" }); // đơn nháp
  assert.equal(violations(db, c), 0, "đơn chưa xác nhận: không đếm");
  xacNhan(db, "o-1");
  assert.equal(violations(db, c), 1);
});

test("R-ORD-9 (L-A1): số người có tên > số khách hiệu lực của dịch vụ ĐÔNG NHẤT → đếm; dòng điều chỉnh gần nhất được áp; người đã huỷ không tính; JSON hỏng không ném lỗi", () => {
  const c = one("R-ORD-9");
  assert.equal(c.level, "warn");
  const db = build();
  addOrder(db, "o-1");
  dvDon(db, { id: "s1", orderId: "o-1", pax: 2 });
  dvDon(db, { id: "s2", orderId: "o-1", pax: 1 });
  khach(db, { id: "p1", orderId: "o-1" });
  khach(db, { id: "p2", orderId: "o-1" });
  assert.equal(violations(db, c), 0, "2 người, dịch vụ đông nhất 2 khách");
  khach(db, { id: "p3", orderId: "o-1" });
  assert.equal(violations(db, c), 1, "3 người > 2 khách (không cộng dồn hai dịch vụ)");
  xacNhan(db, "o-1");
  addAdjustmentAfter(db, { id: "a1", orderId: "o-1", seq: 1, after: [{ serviceId: "s1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }, { serviceId: "s2", pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] });
  assert.equal(violations(db, c), 0, "số khách hiệu lực 3 (điều chỉnh gần nhất)");
  db.prepare("UPDATE ord_passenger SET voided_at = ? WHERE id = 'p3'").run(T4);
  khach(db, { id: "p4", orderId: "o-1" });
  khach(db, { id: "p5", orderId: "o-1" });
  assert.equal(violations(db, c), 1, "4 người hiện hành (p3 đã huỷ) > 3");
  // dòng điều chỉnh gần nhất HỎNG (không phải JSON — bảng chỉ-thêm nên chèn dòng mới) → không ném lỗi, lùi về số đã lưu (2) ⇒ 4 > 2 vẫn là 1 đơn
  db.prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('a2', 'o-1', 2, '[]', 'không phải json', 0, 0)`).run();
  assert.doesNotThrow(() => violations(db, c));
  assert.equal(violations(db, c), 1);
});

test("R-ORD-10: nhật ký order_passenger_changed đúng khuôn đếm → 0; lọt tên / năm sinh / chữ lạ → vi phạm (fail)", () => {
  const c = one("R-ORD-10");
  assert.equal(c.level, "fail");
  const db = build();
  addOrder(db, "o-1");
  const log = (id: string, detail: string) =>
    db.prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, detail, created_at) VALUES (?, 'o-1', 's-an', 'order_passenger_changed', ?, ?)`).run(id, detail, T1);
  log("g1", "thêm 2, sửa 0, huỷ 1 khách");
  log("g2", "thêm 10, sửa 12, huỷ 0 khách");
  assert.equal(violations(db, c), 0);
  log("b1", "thêm 1, sửa 0, huỷ 0 khách Khách Dò Tìm");
  log("b2", "thêm 1 (1911), sửa 0, huỷ 0 khách");
  log("b3", "thêm 1, sửa 0, huỷ 0 khách​");
  assert.equal(violations(db, c), 3);
});

test("R-ORD-11: chuỗi hành khách đúng → 0; dòng thay thế khác đơn / khác person_key, đầu chuỗi person_key ≠ id, dòng nguồn DRIVER → vi phạm (trigger bị gỡ)", () => {
  const c = one("R-ORD-11");
  assert.equal(c.level, "fail");
  const db = build();
  addOrder(db, "o-1");
  addOrder(db, "o-2");
  dvDon(db, { id: "s1", orderId: "o-1" });
  khach(db, { id: "a1", orderId: "o-1" });
  xacNhan(db, "o-1");
  khach(db, { id: "a2", orderId: "o-1", prev: "a1", key: "a1" });
  khach(db, { id: "b1", orderId: "o-1" });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER ord_passenger_chain_ins");
  khach(db, { id: "x1", orderId: "o-1", key: "khac" }); // đầu chuỗi person_key ≠ id
  khach(db, { id: "x2", orderId: "o-2", prev: "a2", key: "a1" }); // dòng thay thế khác đơn với dòng trước
  khach(db, { id: "x3", orderId: "o-1", prev: "b1", key: "sai" }); // dòng thay thế khác person_key với dòng trước
  assert.equal(violations(db, c), 3);
  khach(db, { id: "d1", orderId: "o-2", source: "DRIVER" });
  assert.equal(violations(db, c), 4, "dòng nguồn DRIVER mồ côi (không sự kiện PASSENGER_NAMED + suất mang khoá đó)");
});

test("R-ORD-11 (Đợt 5 A-1b — ADR-0052 D5b, chủ duyệt 5/10, đề xuất luật A-1b mục 3): dòng nguồn DRIVER CÓ sự kiện PASSENGER_NAMED trên suất mang khoá đó → 0; mồ côi / sự kiện trỏ suất khoá khác / dòng DRIVER là dòng thay thế → vi phạm", () => {
  const c = one("R-ORD-11");
  const db = tho();
  const d = donTho(db, { pax: 3, ten: 1 });
  const t = chuyenTho(db, { status: "RUNNING", departed: Date.parse(T1) });
  khach(db, { id: "drv-1", orderId: d.order, source: "DRIVER" });
  const a = suatTho(db, { trip: t, leg: d.leg, key: "drv-1" });
  suKienTho(db, { trip: t, kind: "PASSENGER_NAMED", alloc: a, nhatKy: "trip_passenger_named" });
  assert.equal(violations(db, c), 0, "dòng tài xế nhập có sự kiện + suất mang khoá");
  khach(db, { id: "drv-2", orderId: d.order, source: "DRIVER" });
  assert.equal(violations(db, c), 1, "dòng DRIVER mồ côi");
  const khac = suatTho(db, { trip: t, leg: d.leg, key: d.khach[0]! });
  suKienTho(db, { trip: t, kind: "PASSENGER_NAMED", alloc: khac, nhatKy: "trip_passenger_named" });
  assert.equal(violations(db, c), 1, "sự kiện trỏ suất mang khoá KHÁC không cứu dòng mồ côi");
  khach(db, { id: "drv-3", orderId: d.order, source: "DRIVER", prev: "drv-1", key: "drv-1" });
  assert.equal(violations(db, c), 2, "tài xế chỉ thêm đầu chuỗi — dòng thay thế nguồn DRIVER là vi phạm");
  // L5 (người kiểm Đợt 5, siết 5/10): sự kiện trên suất mang ĐÚNG khoá nhưng thuộc chặng của ĐƠN KHÁC không cứu dòng DRIVER (dữ liệu chép sai đơn).
  const d2 = donTho(db, { pax: 3, ten: 0 });
  khach(db, { id: "drv-4", orderId: d.order, source: "DRIVER" });
  const lac = suatTho(db, { trip: t, leg: d2.leg, key: "drv-4" });
  suKienTho(db, { trip: t, kind: "PASSENGER_NAMED", alloc: lac, nhatKy: "trip_passenger_named" });
  assert.equal(violations(db, c), 3, "sự kiện trên suất cùng khoá nhưng chặng của đơn khác — vẫn vi phạm");
});

test("R-ORD-12: chặng mở của đơn chưa huỷ còn nơi đón tạm '(chưa ghi nơi đón)' → đếm (cảnh báo); đơn huỷ / chặng đóng → không", () => {
  const c = one("R-ORD-12");
  assert.equal(c.level, "warn");
  const db = build();
  addOrder(db, "o-1");
  dvDon(db, { id: "s1", orderId: "o-1" });
  chang(db, { id: "l1", orderId: "o-1", svc: "s1", place: "(chưa ghi nơi đón)" });
  chang(db, { id: "l2", orderId: "o-1", svc: "s1", place: "(chưa ghi nơi đón)", closed: true });
  addOrder(db, "o-2");
  dvDon(db, { id: "s2", orderId: "o-2" });
  chang(db, { id: "l3", orderId: "o-2", svc: "s2", place: "(chưa ghi nơi đón)" });
  gieoLyDoHuy(db, "o-2");
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'o-2'").run();
  assert.equal(violations(db, c), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0051 GB1 (Task A-GB, TC-GB-10): mốc giờ hẹn R-VC-17 (suất khách mở không có mốc), R-VC-18 (chuỗi mốc hỏng) — lưới THỨ HAI: ca đỏ gỡ trigger rồi chèn thẳng
// như SQL gõ tay. Suất khách chèn qua hàm gieo DÙNG CHUNG `gieoMocXep` (tests/audit/gieo-vc.mjs) — cùng một cửa với bài migration.
// ---------------------------------------------------------------------------------------------------------------------
/** Bỏ ràng buộc chèn thẳng suất (trigger LC + khoá ngoại) — bài chỉ kiểm câu KIỂM ĐỊNH KỲ, không kiểm lớp CSDL. */
function thaTrigSuat(db: DatabaseSync, giuNeedsAppt = true): void {
  db.exec("PRAGMA foreign_keys = OFF");
  const ten = ["vc_trip_allocation_leg_open", "vc_trip_allocation_capacity_ins", "vc_trip_allocation_stop_scope", "vc_trip_allocation_person_order_ins",
    "vc_trip_running_locked_alloc_ins", "vc_trip_allocation_trip_final_ins", ...(giuNeedsAppt ? [] : ["vc_trip_allocation_needs_appt"])];
  for (const t of ten) db.exec(`DROP TRIGGER IF EXISTS ${t}`);
}
const suatThang = (db: DatabaseSync, id: string, leg: string) =>
  db.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, board_stop_id, status, valid_from_at, created_at, updated_at) VALUES (?, 'tr-x', 'PASSENGER', ?, 'st-x', 'WAITING', ?, ?, ?)`)
    .run(id, leg, T1, T1, T1);
const mocThang = (db: DatabaseSync, leg: string, seq: number, kind: string, gio: string, truoc: string | null) =>
  db.prepare(`INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, updated_at, bo_gio_hen_doi)
     VALUES (?, ?, ?, ?, '2026-10-05', ?, ?, ?, ?, ?, ?, ?)`).run(`m-${leg}-${seq}`, leg, seq, kind, gio, truoc === null ? null : "2026-10-05", truoc, kind === "XEP" ? null : `r0000000-0000-4000-8000-${leg.padStart(6, "0")}${String(seq).padStart(6, "0")}`, T1, T1,
    kind === "BO_DANH_DAU" ? "null" : null); // GA-59: dòng BO_DANH_DAU mang bản chụp (JSON null = lần đầu không còn mục)

test("R-VC-17 (ADR-0051): suất khách MỞ mà chặng không có mốc — có mốc (gieoMocXep) / suất đã đóng / suất người đi kèm → 0; chèn thẳng khi trigger bị gỡ → 1", () => {
  const c = one("R-VC-17");
  assert.equal(c.level, "fail");
  const db = build();
  thaTrigSuat(db);
  gieoMocXep(db, "leg-a");
  suatThang(db, "al-a", "leg-a");
  db.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, crew_party_id, status, valid_from_at, created_at, updated_at) VALUES ('al-crew', 'tr-x', 'CREW', 'pty-xa', 'WAITING', ?, ?, ?)`).run(T1, T1, T1);
  assert.equal(violations(db, c), 0);
  assert.throws(() => suatThang(db, "al-b", "leg-b"), /gb_needs_appt/, "lớp CSDL chặn trước");
  db.exec("DROP TRIGGER vc_trip_allocation_needs_appt");
  suatThang(db, "al-b", "leg-b");
  assert.equal(violations(db, c), 1);
  db.prepare("UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = 'al-b'").run(T2);
  assert.equal(violations(db, c), 0, "suất đã đóng không tính");
});

test("R-VC-18 (ADR-0051): chuỗi mốc hỏng — liền mạch (XEP → DA_GOI → BO_DANH_DAU) → 0; đứt đoạn / không bắt đầu từ 1 / seq 1 không phải XEP / giờ trước lệch (trigger bị gỡ) → vi phạm", () => {
  const c = one("R-VC-18");
  assert.equal(c.level, "fail");
  const db = build();
  mocThang(db, "1", 1, "XEP", "09:00", null);
  db.exec("DROP TRIGGER vc_leg_appt_ack_active"); // dòng người bấm đòi khách chờ trên xe — bài này không dựng chuyến
  mocThang(db, "1", 2, "DA_GOI", "09:15", "09:00");
  mocThang(db, "1", 3, "BO_DANH_DAU", "09:00", "09:15");
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER vc_leg_appt_ack_chain");
  mocThang(db, "1", 5, "DA_GOI", "09:30", "09:00"); // đứt đoạn (thiếu seq 4)
  assert.equal(violations(db, c), 1);
  mocThang(db, "2", 2, "DA_GOI", "09:15", "09:00"); // không bắt đầu từ 1 (+ không có dòng trước)
  assert.equal(violations(db, c), 3);
  mocThang(db, "3", 1, "XEP", "08:00", null);
  mocThang(db, "3", 2, "DA_GOI", "08:30", "07:45"); // giờ trước lệch dòng trước
  assert.equal(violations(db, c), 4);
});

// ---------------------------------------------------------------------------------------------------------------------
// ĐIỀU PHỐI XE (ADR-0049 Task A17 — TC-40; ADR-0050 + K-02 — TC-54): R-VC-3…10, R-VC-12…16. Mỗi câu: dữ liệu KHOẺ → 0; gieo lỗi (gỡ trigger + khoá ngoại —
// như SQL gõ tay trên D1) → đúng số. Dựng thô: bỏ khoá ngoại và MỌI trigger của bảng chuyến (bài kiểm CÂU KIỂM ĐỊNH KỲ, không kiểm lớp CSDL). Mọi tên / số GIẢ.
// ---------------------------------------------------------------------------------------------------------------------
function tho(): DatabaseSync {
  const db = build();
  db.exec("PRAGMA foreign_keys = OFF");
  for (const t of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND (tbl_name LIKE 'vc\\_trip%' ESCAPE '\\' OR tbl_name = 'vc_leg_appt_ack')").all() as { name: string }[]) {
    db.exec(`DROP TRIGGER ${t.name}`);
  }
  return db;
}
const NOW_MS = Date.now();
const H = 3_600_000;
const isoMs = (ms: number) => new Date(ms).toISOString();
const ngayVnMs = (ms: number) => new Date(ms + 7 * H).toISOString().slice(0, 10);
let soVc = 0;
function chuyenTho(db: DatabaseSync, o: { id?: string; xe?: string; status?: string; tu?: number; den?: number; carrier?: string; nghi?: number; departed?: number | null; ended?: number | null } = {}): string {
  const id = o.id ?? `tr-${++soVc}`;
  const tu = o.tu ?? NOW_MS + 2 * H;
  db.prepare(`INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, status,
      departed_at, departed_ms, ended_at, ended_ms, last_cmd_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, `CX-${id}`, o.xe ?? "xe-1", o.carrier ?? "p-cty", ngayVnMs(tu), tu, o.den ?? tu + 2 * H, tu, o.nghi ?? 30, o.status ?? "PLANNED",
      o.departed == null ? null : isoMs(o.departed), o.departed ?? null, o.ended == null ? null : isoMs(o.ended), o.ended ?? null, "c".repeat(36), T1, T1);
  return id;
}
const laiTho = (db: DatabaseSync, trip: string, party: string) =>
  db.prepare("INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`dr-${++soVc}`, trip, party, T1, T1, T1);
function suatTho(db: DatabaseSync, o: { trip: string; leg?: string | null; key?: string | null; kind?: string; status?: string; tu?: string; den?: string | null; board?: string | null; alight?: string | null; crew?: string | null }): string {
  const id = `al-${++soVc}`;
  const kind = o.kind ?? "PASSENGER";
  db.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, crew_party_id, board_stop_id, alight_stop_id, status, valid_from_at, valid_to_at, close_reason,
      created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, o.trip, kind, kind === "PASSENGER" ? (o.leg ?? "leg-x") : null, o.key ?? null, kind === "CREW" ? (o.crew ?? "pty-xa") : null, kind === "PASSENGER" ? (o.board ?? "st-x") : null,
      o.alight ?? null, o.status ?? "WAITING", o.tu ?? T1, o.den ?? null, o.den ? "REMOVED" : null, T1, T1);
  return id;
}
function suKienTho(db: DatabaseSync, o: { id?: string; trip: string; kind: string; stop?: string | null; alloc?: string | null; xayRa?: string; ghi?: string; nguon?: string; nhatKy?: string | null }): string {
  const id = o.id ?? `e0000000-0000-4000-8000-${String(++soVc).padStart(12, "0")}`;
  const ghi = o.ghi ?? T2;
  const xayRa = o.xayRa ?? ghi;
  const nguon = o.nguon ?? (xayRa === ghi ? "MAY_CHU" : "VAN_PHONG_KHAI");
  db.prepare(`INSERT INTO vc_trip_event (id, trip_id, kind, stop_id, allocation_id, request_id, decided_mode, policy_id, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'NGUOI', ?, ?, ?, ?, ?, ?)`).run(id, o.trip, o.kind, o.stop ?? null, o.alloc ?? null, `r${id.slice(1)}`,
    nguon === "VAN_PHONG_KHAI" ? "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0" : null, xayRa, Date.parse(xayRa), nguon, ghi, ghi);
  if (o.nhatKy !== null) db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 'trip', ?, 'x', ?)").run(id, o.nhatKy ?? "trip_edited", o.trip, ghi);
  return id;
}
function diemTho(db: DatabaseSync, o: { trip: string; seq?: number; kind?: string; loc?: string | null; status?: string; arrived?: string | null; done?: string | null }): string {
  const id = `st-${++soVc}`;
  const loc = o.loc === undefined ? "loc-1" : o.loc;
  db.prepare(`INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_text, place_key, status, arrived_at, done_at, skip_reason_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, o.trip, o.seq ?? 1, o.kind ?? "PICKUP", loc, loc ? null : "Nơi tự do", loc ? `L:${loc}` : `T:${"a".repeat(64)}`, o.status ?? "PENDING", o.arrived ?? null, o.done ?? null,
      o.status === "SKIPPED" ? "BO_QUA_KHAC" : null, T1, T1);
  return id;
}
/** Đơn xác nhận + dịch vụ `pax` người lớn + một chặng (đón `ngay gio` tại điểm `loc`) + hành khách `ten` người. */
function donTho(db: DatabaseSync, o: { pax?: number; ngay?: string; gio?: string; loc?: string | null; ten?: number } = {}): { order: string; svc: string; leg: string; khach: string[] } {
  const n = ++soVc;
  const order = `o-${n}`;
  db.prepare("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's-an', 'draft', 'K', '0900000009', ?, ?)").run(order, `TD-${n}`, T1, T1);
  db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', ?, ?)").run(`sv-${n}`, order, o.pax ?? 2, o.ngay ?? "2026-10-05");
  db.prepare(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_location_id, pickup_place, dropoff_location_id, dropoff_place, created_at, updated_at)
      VALUES (?, ?, ?, 'OUT', ?, ?, ?, ?, NULL, 'Bến', ?, ?)`).run(`leg-${n}`, order, `sv-${n}`, o.ngay ?? "2026-10-05", o.gio ?? "09:00", o.loc === undefined ? "loc-1" : o.loc, o.loc === null ? "Khách sạn" : null, T1, T1);
  const khach: string[] = [];
  for (let i = 0; i < (o.ten ?? 0); i++) {
    const k = `pax-${n}-${i}`;
    db.prepare("INSERT INTO ord_passenger (id, order_id, full_name, birth_year, person_key, created_at, updated_at) VALUES (?, ?, 'Khách Thử', 1990, ?, ?, ?)").run(k, order, k, T1, T1);
    khach.push(k);
  }
  db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(order);
  return { order, svc: `sv-${n}`, leg: `leg-${n}`, khach };
}

test("R-VC-3 (L-D1): suất khách mở của chặng ≤ số khách hiệu lực → 0; nhiều hơn → 1 (warn); dùng CHUNG đoạn số khách hiệu lực với R-ORD-9", () => {
  const c = one("R-VC-3");
  assert.equal(c.level, "warn");
  assert.ok(c.sql.includes("pax_adult + s.pax_child"), "đoạn số khách hiệu lực chung");
  assert.ok(one("R-ORD-9").sql.includes("pax_adult + s.pax_child"));
  const db = tho();
  const d = donTho(db, { pax: 2 });
  const t = chuyenTho(db);
  suatTho(db, { trip: t, leg: d.leg });
  suatTho(db, { trip: t, leg: d.leg });
  suatTho(db, { trip: t, leg: d.leg, den: T2 }); // đã đóng
  assert.equal(violations(db, c), 0);
  suatTho(db, { trip: t, leg: d.leg });
  assert.equal(violations(db, c), 1);
});

test("R-VC-4 (L-B1): bản chốt đủ dòng cho suất khách CÓ TÊN + người đi kèm mở lúc xuất bến → 0; thiếu một dòng → 1 (fail)", () => {
  const c = one("R-VC-4");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { status: "RUNNING", departed: NOW_MS - H });
  const a = suatTho(db, { trip: t, key: "pk-1" });
  const b = suatTho(db, { trip: t, kind: "CREW" });
  suatTho(db, { trip: t }); // chưa tên — không có dòng bản chốt (câu hỏi Q-A15-1)
  db.prepare(`INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id, rest_minutes_used,
      checked_at, created_at, updated_at) VALUES ('ck-1', ?, ?, 'pol', 'DAT', 'xe-1', '79B-000.01', 15, 'p-cty', 'p-tx', 30, ?, ?, ?)`).run(t, "c".repeat(36), T2, T2, T2);
  const chot = (al: string, row: string | null, crew: string | null) =>
    db.prepare(`INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, crew_party_id, created_at, updated_at) VALUES (?, ?, 'ck-1', ?, ?, ?, ?, ?)`).run(`mf-${++soVc}`, t, al, row, crew, T2, T2);
  chot(b, null, "pty-xa");
  assert.equal(violations(db, c), 1, "thiếu dòng của suất có tên");
  chot(a, "row-1", null);
  assert.equal(violations(db, c), 0);
});

test("R-VC-5a / 5b (L-B2): tài xế có GPLX còn hạn, hạng đủ chở → 0; GPLX hết hạn trước giờ kết thúc → chuyến ĐANG CHẠY 1 (fail), chuyến chưa chạy trong 48 giờ 1 (warn), ngoài 48 giờ 0", () => {
  const a = one("R-VC-5a");
  const b = one("R-VC-5b");
  assert.deepEqual([a.level, b.level], ["fail", "warn"]);
  const db = tho();
  xe(db, "xe-15", "79B09999");
  const gplx = (party: string, het: string, hang = "D1") =>
    db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, expiry_date, created_at, updated_at)
        VALUES (?, ?, 'GPLX', ?, ?, ?, ?, ?, ?)`).run(`g-${++soVc}`, party, `79${soVc}`, `79${soVc}`, hang, het, T1, T1);
  gplx("pty-s-an", "2099-12-31");
  gplx("pty-xa", "2000-01-01");
  const t1 = chuyenTho(db, { xe: "xe-15", status: "RUNNING", departed: NOW_MS - H });
  laiTho(db, t1, "pty-s-an");
  const t2 = chuyenTho(db, { xe: "xe-15", tu: NOW_MS + 5 * H });
  laiTho(db, t2, "pty-s-an");
  assert.deepEqual([violations(db, a), violations(db, b)], [0, 0]);
  xe(db, "xe-15b", "79B09998");
  const t3 = chuyenTho(db, { xe: "xe-15b", status: "RUNNING", departed: NOW_MS - H });
  laiTho(db, t3, "pty-xa");
  const t4 = chuyenTho(db, { xe: "xe-15", tu: NOW_MS + 5 * H });
  laiTho(db, t4, "pty-xa");
  const t5 = chuyenTho(db, { xe: "xe-15", tu: NOW_MS + 72 * H });
  laiTho(db, t5, "pty-xa");
  assert.deepEqual([violations(db, a), violations(db, b)], [1, 1]);
  gplx("pty-s-an", "2099-12-31", "B"); // thêm GPLX hạng B (8 chỗ) — vẫn còn D1 đạt
  assert.deepEqual([violations(db, a), violations(db, b)], [1, 1]);
});

test("R-VC-6: sự kiện ↔ nhật ký lệnh chuyến cùng id → 0; sự kiện mồ côi → 1; nhật ký trip_* của lệnh chuyến không sự kiện → 1; trip_appt_* / trip_reason_* không cần sự kiện (fail)", () => {
  const c = one("R-VC-6");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db);
  suKienTho(db, { trip: t, kind: "CREATED", nhatKy: "trip_created" });
  db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES ('l-goi', 'trip_appt_called', 'trip', ?, 'x', ?)").run(t, T2);
  db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES ('l-lydo', 'trip_reason_added', NULL, NULL, 'x', ?)").run(T2);
  assert.equal(violations(db, c), 0);
  suKienTho(db, { trip: t, kind: "UPDATED", nhatKy: null });
  assert.equal(violations(db, c), 1, "sự kiện mồ côi");
  db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES ('l-mo-coi', 'trip_departed', 'trip', ?, 'x', ?)").run(t, T2);
  assert.equal(violations(db, c), 2, "nhật ký lệnh chuyến không sự kiện");
});

test("R-VC-7: chặng đã vào mốc (6 giờ) mà chưa xếp đủ → 1 (warn); xếp đủ / chưa vào mốc / đã qua giờ đón → 0", () => {
  const c = one("R-VC-7");
  assert.equal(c.level, "warn");
  const db = tho();
  const hen = (phut: number) => {
    const iso = new Date(NOW_MS + 7 * H + phut * 60_000).toISOString();
    return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
  };
  const trong = hen(120);
  const d = donTho(db, { pax: 2, ...trong });
  donTho(db, { pax: 2, ...hen(600) }); // chưa vào mốc
  donTho(db, { pax: 2, ...hen(-120) }); // đã qua giờ đón
  assert.equal(violations(db, c), 1);
  const t = chuyenTho(db);
  suatTho(db, { trip: t, leg: d.leg });
  suatTho(db, { trip: t, leg: d.leg });
  assert.equal(violations(db, c), 0);
});

test("R-VC-8 (B1.5): chuyến của nhà xe đang hợp tác, tài xế của nhà xe đó → 0; nhà xe thôi hợp tác → 1; tài xế không còn là tài xế của nhà xe → 1 (warn)", () => {
  const c = one("R-VC-8");
  assert.equal(c.level, "warn");
  const db = tho();
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-nx', 'ORGANIZATION', 'Nhà xe', 1, '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-nx', 'p-nx', 'CARRIER', '2026-09-01', '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('q-1', 'pty-xa', 'p-nx', 'DRIVES_FOR', '2026-09-01', '${T1}', '${T1}')`);
  const t = chuyenTho(db, { carrier: "p-nx" });
  laiTho(db, t, "pty-xa");
  assert.equal(violations(db, c), 0);
  db.exec(`UPDATE pty_party_relationship SET valid_to_date = '2026-09-20' WHERE id = 'q-1'`);
  assert.equal(violations(db, c), 1, "tài xế thôi");
  db.exec(`UPDATE pty_party_role SET valid_to_date = '2026-09-20' WHERE id = 'r-nx'`);
  assert.equal(violations(db, c), 2, "nhà xe thôi (+ tài xế không còn của nhà xe)");
});

test("R-VC-9: chuyến chưa kết thúc chở đúng số chỗ, điểm khác thứ tự → 0; vượt chỗ → 1; hai điểm còn dùng trùng thứ tự → 1; điểm đã bỏ trùng thứ tự không tính (fail)", () => {
  const c = one("R-VC-9");
  assert.equal(c.level, "fail");
  const db = tho();
  db.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, name, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
      VALUES ('xe-2', '79B00002', '79B00002', 'Xe', 2, ?, 'active', '2026-09-01', ?, ?)`).run(congTyChu(db), T1, T1);
  const t = chuyenTho(db, { xe: "xe-2" });
  suatTho(db, { trip: t });
  suatTho(db, { trip: t, status: "NO_SHOW" });
  suatTho(db, { trip: t });
  diemTho(db, { trip: t, seq: 1 });
  diemTho(db, { trip: t, seq: 2, kind: "DROPOFF" });
  diemTho(db, { trip: t, seq: 2, status: "SKIPPED" });
  assert.equal(violations(db, c), 0);
  suatTho(db, { trip: t });
  assert.equal(violations(db, c), 1, "vượt chỗ");
  diemTho(db, { trip: t, seq: 1, kind: "DROPOFF" });
  assert.equal(violations(db, c), 2, "trùng thứ tự");
});

test("R-VC-10: bản chốt trỏ dòng hành khách đúng người, đúng đơn → 0; dòng của đơn khác / người khác / không có → vi phạm (fail)", () => {
  const c = one("R-VC-10");
  assert.equal(c.level, "fail");
  const db = tho();
  const d = donTho(db, { ten: 2 });
  const k = donTho(db, { ten: 1 });
  const t = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const chot = (al: string, row: string) =>
    db.prepare(`INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, created_at, updated_at) VALUES (?, ?, 'ck', ?, ?, ?, ?)`).run(`mf-${++soVc}`, t, al, row, T2, T2);
  chot(suatTho(db, { trip: t, leg: d.leg, key: d.khach[0] }), d.khach[0]!);
  assert.equal(violations(db, c), 0);
  chot(suatTho(db, { trip: t, leg: d.leg, key: d.khach[1] }), k.khach[0]!);
  assert.equal(violations(db, c), 1, "dòng của đơn khác");
  chot(suatTho(db, { trip: t, leg: d.leg, key: "pk-khac" }), "khong-co");
  assert.equal(violations(db, c), 2);
  // Cùng khoá người nhưng dòng thuộc ĐƠN KHÁC (SQL gõ tay — gỡ trigger hành khách): vẫn bắt nhờ vế "cùng đơn của chặng".
  for (const tg of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'ord_passenger'").all() as { name: string }[]) db.exec(`DROP TRIGGER ${tg.name}`);
  db.prepare("INSERT INTO ord_passenger (id, order_id, full_name, birth_year, person_key, created_at, updated_at) VALUES ('row-la', ?, 'Khách Thử', 1990, ?, ?, ?)").run(k.order, d.khach[0]!, T1, T1);
  chot(suatTho(db, { trip: t, leg: d.leg, key: d.khach[0], den: T3 }), "row-la");
  assert.equal(violations(db, c), 3, "dòng của đơn khác dù cùng khoá người");
});

// N-19 (R-P19, chủ "Trả lời lần 13": "danh sách khách của xe trỏ tới người không còn" do máy chủ VÀ kiểm định kỳ bắt) — R-VC-19 phủ hai tham chiếu logic còn lại của
// suất (R-VC-10 đã phủ bản chốt): `leg_id` → `ord_transfer_leg`, `passenger_key` → `ord_passenger` cùng đơn của chặng. GA-58: tính MỌI suất (mở lẫn đã đóng — tham
// chiếu treo làm hỏng cả lịch sử); dòng hành khách đã huỷ (`voided_at`) hay đã thay (dòng mới trỏ `previous_id`) VẪN là "người còn" (khách huỷ sau khi xếp là
// tình trạng nghiệp vụ — lý do giữ / R-VC-3 lo); chỉ đếm, không trả tên. Ca đỏ phải gỡ khoá ngoại + trigger chỉ-thêm của `ord_*` (xoá dòng đơn đã xác nhận bị
// `leg_frozen` / `passenger_frozen` chặn — nhật ký thi công §10.26).
test("R-VC-19 (N-19, R-P19): tham chiếu logic từ vận chuyển sang chặng / khách bị treo — đủ (kể cả suất đã đóng, người đã huỷ dòng, dòng thay thế, mốc giờ hẹn của chặng còn) → 0; chặng bị xoá / người bị xoá / người thuộc đơn khác / mốc giờ hẹn trỏ chặng không còn → vi phạm (fail)", () => {
  const c = one("R-VC-19");
  assert.equal(c.level, "fail");
  const db = tho();
  const d = donTho(db, { ten: 3 });
  const k = donTho(db, { ten: 1 });
  const t = chuyenTho(db);
  suatTho(db, { trip: t, leg: d.leg, key: d.khach[0] });
  suatTho(db, { trip: t, leg: d.leg, key: null }); // suất xếp theo số, chưa gắn tên
  suatTho(db, { trip: t, leg: d.leg, key: d.khach[1], den: T3 }); // suất đã đóng
  suatTho(db, { trip: t, kind: "CREW" }); // người đi kèm — không chặng, không khoá người
  gieoMocXep(db, d.leg); // mốc giờ hẹn (ADR-0051) của chặng còn — tham chiếu logic thứ tư, không treo
  db.prepare("UPDATE ord_passenger SET voided_at = ? WHERE id = ?").run(T2, d.khach[1]); // khách huỷ sau khi xếp — tình trạng nghiệp vụ, không phải tham chiếu treo
  db.prepare("INSERT INTO ord_passenger (id, order_id, full_name, birth_year, previous_id, person_key, created_at, updated_at) VALUES ('thay-0', ?, 'Khách Sửa', 1990, ?, ?, ?, ?)")
    .run(d.order, d.khach[0], d.khach[0], T2, T2); // sửa tên = dòng mới cùng person_key
  assert.equal(violations(db, c), 0, "dữ liệu khoẻ");
  // Người thuộc đơn KHÁC (cùng person_key không thuộc đơn của chặng).
  suatTho(db, { trip: t, leg: d.leg, key: k.khach[0] });
  assert.equal(violations(db, c), 1, "người thuộc đơn khác");
  // Xoá dòng của đơn đã xác nhận — chỉ làm được khi GỠ khoá ngoại + trigger chỉ-thêm (SQL gõ tay).
  for (const tg of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name IN ('ord_passenger', 'ord_transfer_leg')").all() as { name: string }[]) db.exec(`DROP TRIGGER ${tg.name}`);
  db.prepare("DELETE FROM ord_passenger WHERE person_key = ?").run(d.khach[2]!);
  suatTho(db, { trip: t, leg: d.leg, key: d.khach[2], den: T3 }); // suất ĐÃ ĐÓNG trỏ người không còn — vẫn đếm (GA-58)
  assert.equal(violations(db, c), 2, "người không còn dòng nào");
  const e = donTho(db, { ten: 1 });
  suatTho(db, { trip: t, leg: e.leg, key: null });
  suatTho(db, { trip: t, leg: e.leg, key: e.khach[0] });
  db.prepare("DELETE FROM ord_transfer_leg WHERE id = ?").run(e.leg);
  assert.equal(violations(db, c), 4, "chặng không còn — cả suất chưa tên lẫn suất có tên (mỗi suất đếm MỘT lần)");
  // Vế thứ ba (vc_leg_appt_ack.leg_id — ADR-0051): mốc giờ hẹn của một chặng bị xoá (chặng không còn suất nào) — mỗi DÒNG mốc đếm một lần.
  gieoMocXep(db, k.leg);
  db.prepare("DELETE FROM ord_transfer_leg WHERE id = ?").run(k.leg);
  assert.equal(violations(db, c), 5, "mốc giờ hẹn trỏ chặng không còn");
});

test("R-VC-12: giờ trên chuyến / điểm = giờ xảy ra của sự kiện → 0; xuất bến lệch / đã tới lệch / xong điểm không khớp sự kiện nào → vi phạm (warn)", () => {
  const c = one("R-VC-12");
  assert.equal(c.level, "warn");
  const db = tho();
  const xb = NOW_MS - 2 * H;
  const t = chuyenTho(db, { status: "RUNNING", departed: xb });
  suKienTho(db, { trip: t, kind: "DEPARTED", xayRa: isoMs(xb), ghi: isoMs(xb + 60_000) });
  const s = diemTho(db, { trip: t, status: "DONE", arrived: isoMs(xb + H), done: isoMs(xb + H + 60_000) });
  suKienTho(db, { trip: t, kind: "STOP_ARRIVED", stop: s, xayRa: isoMs(xb + H), ghi: isoMs(xb + H) });
  suKienTho(db, { trip: t, kind: "PASSENGER_BOARDED", xayRa: isoMs(xb + H + 60_000), ghi: isoMs(xb + H + 60_000) });
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE vc_trip SET departed_at = ?, departed_ms = ? WHERE id = ?").run(isoMs(xb + 1000), xb + 1000, t);
  db.prepare("UPDATE vc_trip_stop SET done_at = ? WHERE id = ?").run(isoMs(xb + 3 * H), s);
  assert.equal(violations(db, c), 2);
});

test("R-VC-13: kết thúc khai lùi > 15 phút mà chuyến kế cùng xe xuất bến trong khoảng nghỉ theo GIỜ GHI NHẬN → 1 (warn); khai lùi ít / xuất bến sau khoảng nghỉ → 0", () => {
  const c = one("R-VC-13");
  assert.equal(c.level, "warn");
  const db = tho();
  const kt = NOW_MS - 3 * H;
  const a = chuyenTho(db, { xe: "xe-1", status: "ENDED", departed: kt - H, ended: kt });
  suKienTho(db, { trip: a, kind: "ENDED", xayRa: isoMs(kt), ghi: isoMs(kt + 40 * 60_000) }); // khai lùi 40 phút
  const b = chuyenTho(db, { xe: "xe-1", status: "RUNNING", departed: kt + 35 * 60_000, nghi: 30 });
  suKienTho(db, { trip: b, kind: "DEPARTED", xayRa: isoMs(kt + 35 * 60_000), ghi: isoMs(kt + 50 * 60_000) }); // ghi 10 phút sau khi ghi kết thúc < 30
  assert.equal(violations(db, c), 1);
  const db2 = tho();
  const a2 = chuyenTho(db2, { xe: "xe-1", status: "ENDED", departed: kt - H, ended: kt });
  suKienTho(db2, { trip: a2, kind: "ENDED", xayRa: isoMs(kt), ghi: isoMs(kt + 10 * 60_000) }); // lùi 10 phút — không tính
  const b2 = chuyenTho(db2, { xe: "xe-1", status: "RUNNING", departed: kt + 35 * 60_000, nghi: 30 });
  suKienTho(db2, { trip: b2, kind: "DEPARTED", xayRa: isoMs(kt + 35 * 60_000), ghi: isoMs(kt + 36 * 60_000) });
  assert.equal(violations(db2, c), 0);
});

test("R-VC-14: xe chưa ngừng có đủ Kiểm định + Bảo hiểm hiện hành (hai điều kiện gieo) → 0; thiếu Bảo hiểm → 1; xe đã ngừng không tính (warn); dùng CHUNG HIEN_HANH_GIAY_TO_XE với R-VC-11", () => {
  const c = one("R-VC-14");
  assert.equal(c.level, "warn");
  assert.ok(c.sql.includes("n.previous_id = d.id AND n.voided_at IS NULL"), "đoạn hiện hành chung với R-VC-11");
  const db = build();
  xe(db, "xe-a", "79B10001");
  giayToXe(db, { id: "gx-1", xe: "xe-a", type: "INSPECTION" });
  giayToXe(db, { id: "gx-2", xe: "xe-a", type: "TPL_INSURANCE" });
  xe(db, "xe-cu", "79B10002", "retired");
  assert.equal(violations(db, c), 0);
  xe(db, "xe-b", "79B10003");
  giayToXe(db, { id: "gx-3", xe: "xe-b", type: "INSPECTION" });
  assert.equal(violations(db, c), 1);
});

test("R-VC-15: sự kiện suất sau lúc mở suất, 'đã tới' sau lần đổi thứ tự → 0; khai sớm hơn lúc mở suất / sớm hơn lần đổi thứ tự ghi trước → vi phạm (warn)", () => {
  const c = one("R-VC-15");
  assert.equal(c.level, "warn");
  const db = tho();
  const t = chuyenTho(db, { status: "RUNNING", departed: Date.parse(T1) });
  const a = suatTho(db, { trip: t, tu: T2 });
  suKienTho(db, { trip: t, kind: "PASSENGER_BOARDED", alloc: a, xayRa: T3, ghi: T4 });
  suKienTho(db, { trip: t, kind: "STOPS_REORDERED", ghi: T3 });
  suKienTho(db, { trip: t, kind: "STOP_ARRIVED", xayRa: T3, ghi: T4 });
  assert.equal(violations(db, c), 0);
  suKienTho(db, { trip: t, kind: "PASSENGER_NO_SHOW", alloc: a, xayRa: T1, ghi: T4 });
  suKienTho(db, { trip: t, kind: "STOP_ARRIVED", xayRa: T2, ghi: T5 });
  assert.equal(violations(db, c), 2);
});

test("R-VC-16 (K-02): điểm DANH MỤC của suất khớp nơi hiện hành của chặng → 0; chặng đổi nơi đón sang điểm khác / sang chữ tự do → 1; điểm chữ tự do không phủ (warn)", () => {
  const c = one("R-VC-16");
  assert.equal(c.level, "warn");
  const db = tho();
  const d = donTho(db, { loc: "loc-1" });
  const t = chuyenTho(db);
  const s = diemTho(db, { trip: t, loc: "loc-1" });
  suatTho(db, { trip: t, leg: d.leg, board: s });
  const d2 = donTho(db, { loc: null });
  const s2 = diemTho(db, { trip: t, loc: null });
  suatTho(db, { trip: t, leg: d2.leg, board: s2 });
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE ord_transfer_leg SET pickup_location_id = 'loc-2' WHERE id = ?").run(d.leg);
  assert.equal(violations(db, c), 1);
  db.prepare("UPDATE ord_transfer_leg SET pickup_location_id = NULL, pickup_place = 'Khách sạn mới' WHERE id = ?").run(d.leg);
  assert.equal(violations(db, c), 1, "đổi sang chữ tự do vẫn bắt");
  db.prepare("UPDATE ord_transfer_leg SET pickup_place = 'Khách sạn khác' WHERE id = ?").run(d2.leg);
  assert.equal(violations(db, c), 1, "điểm chữ tự do: KHÔNG phủ (giới hạn đã ghi)");
});

// ---------------------------------------------------------------------------------------------------------------------
// Sổ tiền lượt 1 (ADR-0026 đ7 — R-BIL-*; ADR-0025 NT 8 — hai bất biến mốc; NT-S9; kế hoạch Task 9, NT-A1). Mỗi kiểm có ca xanh (dữ liệu do đúng luồng
// sinh ra) và ca đỏ; ca đỏ phải GỠ trigger tương ứng trong DB tạm (trigger là đường chặn thứ nhất — kiểm này là lưới thứ hai cho SQL chạy tay).
const BIL_AT = "2026-09-30T03:00:00.000Z";
const BIL_SAU = "2026-09-30T04:00:00.000Z";
const chuCongTy = (db: DatabaseSync): string => String((db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id);
function donBil(db: DatabaseSync, id: string): void {
  addOrder(db, id);
  db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'ZH1', 'Tour', 'perPax', 1, '2026-09-30')").run(`sv-${id}`, id);
  db.prepare("UPDATE orders SET total = 300000, subtotal = 300000, remaining_amount = 300000 WHERE id = ?").run(id);
  gieoDongTienKhop(db, id); // 0081 (F-03): xác nhận cần tạm tính = Σ dòng tiền
  db.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(T1, id);
}
function lanThuBil(db: DatabaseSync, o: { id: string; order: string; amount: number; at?: string; role?: string; party?: string | null; kind?: string; reverses?: string | null; forParty?: string }): void {
  const role = o.role ?? "STAFF";
  db.prepare(
    `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date,
       reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, 'CASH', ?, 'PREPAID', '2026-09-30', ?, NULL, ?, 's-an', ?, 's-an')`,
  ).run(o.id, o.order, o.kind ?? "CUSTOMER_PAYMENT", o.amount, role === "UNKNOWN" ? null : (o.party ?? "pty-s-an"), role, o.forParty ?? chuCongTy(db), o.reverses ?? null, o.at ?? BIL_AT, o.at ?? BIL_AT);
}
function phieuBil(db: DatabaseSync, o: { id: string; order: string; kind: string; due?: number | null; at?: string }): void {
  db.prepare(
    `INSERT INTO bil_posting (id, kind_code, order_id, reason, reverses_posting_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, NULL, NULL, '2026-09-30', ?, ?, 's-an', ?, 's-an')`,
  ).run(o.id, o.kind, o.order, o.due ?? null, o.at ?? BIL_AT, o.at ?? BIL_AT);
}
function dongNoBil(db: DatabaseSync, o: { id: string; posting: string; order: string; debtor: string; creditor: string; amount: number; reverses?: string | null; receipt?: string | null }): void {
  db.prepare(
    `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, trip_id, order_service_id, receipt_id, reverses_line_id,
       created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'HELD', ?, NULL, NULL, ?, ?, ?, 's-an', ?, 's-an')`,
  ).run(o.id, o.posting, o.debtor, o.creditor, o.amount, o.order, o.receipt ?? null, o.reverses ?? null, BIL_AT, BIL_AT);
}
/** Đơn `o-bil` đi ĐÚNG luồng: lần thu 300.000 (An giữ) + một lần thu 50.000 đã đảo → Đã giao (phiếu chụp 300.000). Trả id công ty chủ. */
function donDaGiao(db: DatabaseSync, id = "o-bil"): string {
  const ct = chuCongTy(db);
  donBil(db, id);
  lanThuBil(db, { id: `r1-${id}`, order: id, amount: 300000 });
  phieuBil(db, { id: `pr1-${id}`, order: id, kind: "RECEIPT" });
  dongNoBil(db, { id: `l1-${id}`, posting: `pr1-${id}`, order: id, debtor: "pty-s-an", creditor: ct, amount: 300000, receipt: `r1-${id}` });
  lanThuBil(db, { id: `r2-${id}`, order: id, amount: 50000 });
  lanThuBil(db, { id: `r2d-${id}`, order: id, amount: 50000, reverses: `r2-${id}` });
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = ?").run(BIL_AT, id);
  phieuBil(db, { id: `pd-${id}`, order: id, kind: "DELIVERED", due: 300000 });
  return ct;
}
const bil = (code: string) => one(code);

test("R-BIL-*: đủ kiểm lượt 1, mức fail; R-BIL-2/5 'chưa áp dụng' và R-BIL-7 = R-PTY-1 ở danh sách ghi chú (không kiểm trùng, không in 'đạt')", async () => {
  for (const c of ["R-BIL-1", "R-BIL-3a", "R-BIL-3b", "R-BIL-4a", "R-BIL-4b", "R-BIL-6", "R-BIL-S9", "R-BIL-M1", "R-BIL-M2"]) assert.equal(bil(c).level, "fail", c);
  assert.equal(CHECKS.filter((c) => /^R-BIL-(2|5|7)\b/.test(c.code)).length, 0, "R-BIL-2/5/7 không phải câu kiểm");
  const { GHI_CHU } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { GHI_CHU: { code: string; text: string }[] };
  assert.deepEqual(GHI_CHU.map((g) => g.code), ["R-BIL-2", "R-BIL-5", "R-BIL-7"]);
  assert.match(GHI_CHU[0]!.text, /chưa áp dụng/);
  assert.match(GHI_CHU[1]!.text, /chưa áp dụng/);
  assert.match(GHI_CHU[2]!.text, /R-PTY-1/);
  const script = readFileSync(new URL("../scripts/audit-invariants.mjs", import.meta.url), "utf8");
  assert.match(script, /GHI_CHU/, "script in danh sách ghi chú");
});

test("R-BIL-*: đơn đi đúng luồng (lần thu, đảo, Đã giao, hoàn khách SAU Đã giao, Hoàn thành sau khi nộp) → mọi kiểm 0 vi phạm", () => {
  const db = build();
  const ct = donDaGiao(db);
  // ADR-0088 đ3, đ4 (iv) (0083): sau Đã giao không còn lần hoàn / đảo đơn lẻ (hoàn chờ phân định đ9; sửa sai bằng "Thay lần thu") — luồng đúng chỉ còn nộp
  // rồi Hoàn thành.
  phieuBil(db, { id: "pnop", order: "o-bil", kind: "SETTLEMENT", at: BIL_SAU });
  dongNoBil(db, { id: "l-nop", posting: "pnop", order: "o-bil", debtor: ct, creditor: "pty-s-an", amount: 300000 });
  db.prepare("UPDATE orders SET completed_at = ?, completed_by = 's-an' WHERE id = 'o-bil'").run(BIL_SAU);
  phieuBil(db, { id: "pc", order: "o-bil", kind: "COMPLETED", at: BIL_SAU });
  donBil(db, "o-chua"); // đơn chưa giao, có lần thu chưa rõ (cọc cũ) — hợp lệ
  lanThuBil(db, { id: "r-cu", order: "o-chua", amount: 100000, role: "UNKNOWN" });
  assert.deepEqual(CHECKS.filter((c) => c.code.startsWith("R-BIL")).map((c) => [c.code, violations(db, c)]).filter((r) => r[1] !== 0), []);
});

test("R-BIL-1: phiếu Đã giao chụp số KHÁC tổng lần thu còn hiệu lực tạo trước nó → vi phạm (gỡ trigger bil_posting_delivered_paid)", () => {
  const db = build();
  donDaGiao(db);
  assert.equal(violations(db, bil("R-BIL-1")), 0);
  db.exec("DROP TRIGGER bil_posting_delivered_paid");
  donBil(db, "o-sai");
  lanThuBil(db, { id: "rs", order: "o-sai", amount: 100000 });
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-sai'").run(BIL_AT);
  phieuBil(db, { id: "pds", order: "o-sai", kind: "DELIVERED", due: 300000, at: "2999-01-01T00:00:00.000Z" }); // ghi TỪ mốc 0083 ⇒ lỗi (trước mốc chỉ cảnh báo)
  assert.equal(violations(db, bil("R-BIL-1")), 1);
});

test("R-BIL-1 MỌI LÚC (ADR-0088 đ1, đ7 — bỏ 'tại mốc'): thiếu lúc Đã giao rồi bù đủ về sau → hết lệch; còn thiếu → vi phạm (từ mốc)", () => {
  const db = build();
  db.exec("DROP TRIGGER bil_posting_delivered_paid");
  db.exec("DROP TRIGGER bil_receipt_after_delivered"); // dữ liệu SQL tay: lần thu sau Đã giao ngoài lô Thay
  donBil(db, "o-x");
  lanThuBil(db, { id: "rx1", order: "o-x", amount: 200000 });
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-x'").run(BIL_AT);
  phieuBil(db, { id: "pdx", order: "o-x", kind: "DELIVERED", due: 300000, at: "2999-01-01T00:00:00.000Z" });
  assert.equal(violations(db, bil("R-BIL-1")), 1, "thiếu 100.000");
  lanThuBil(db, { id: "rx2", order: "o-x", amount: 100000, at: "2999-01-01T00:00:01.000Z" });
  assert.equal(violations(db, bil("R-BIL-1")), 0, "xét mọi lúc: đã thu nay bằng phải thu");
});

test("R-BIL-3a/3b: dòng đảo LỆCH gốc (khác số / không đổi chỗ hai bên) → vi phạm (gỡ trigger đảo)", () => {
  const db = build();
  const ct = donDaGiao(db);
  assert.equal(violations(db, bil("R-BIL-3a")), 0);
  assert.equal(violations(db, bil("R-BIL-3b")), 0);
  db.exec("DROP TRIGGER bil_payment_receipt_reversal_match");
  db.exec("DROP TRIGGER bil_debt_line_reversal_match");
  donBil(db, "o-d");
  lanThuBil(db, { id: "rg", order: "o-d", amount: 100000 });
  lanThuBil(db, { id: "rgd", order: "o-d", amount: 90000, reverses: "rg" });
  assert.equal(violations(db, bil("R-BIL-3a")), 1);
  phieuBil(db, { id: "pg", order: "o-d", kind: "RECEIPT" });
  dongNoBil(db, { id: "lg", posting: "pg", order: "o-d", debtor: "pty-s-an", creditor: ct, amount: 100000 });
  dongNoBil(db, { id: "lgd", posting: "pg", order: "o-d", debtor: "pty-s-an", creditor: ct, amount: 100000, reverses: "lg" });
  assert.equal(violations(db, bil("R-BIL-3b")), 1, "đảo không đổi chỗ hai bên");
});

test("R-BIL-4a/4b: đơn Đã giao thiếu phiếu Đã giao; phiếu Đã giao trên đơn chưa giao; Hoàn thành thiếu phiếu → vi phạm", () => {
  const db = build();
  donBil(db, "o-a");
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-a'").run(BIL_AT);
  assert.equal(violations(db, bil("R-BIL-4a")), 1, "Đã giao không phiếu");
  donBil(db, "o-b");
  phieuBil(db, { id: "pdb", order: "o-b", kind: "DELIVERED", due: 0 });
  assert.equal(violations(db, bil("R-BIL-4a")), 2, "phiếu Đã giao trên đơn chưa giao");
  db.prepare("UPDATE orders SET completed_at = ?, completed_by = 's-an' WHERE id = 'o-a'").run(BIL_SAU);
  assert.equal(violations(db, bil("R-BIL-4b")), 1, "Hoàn thành không phiếu");
  donBil(db, "o-c");
  phieuBil(db, { id: "pcc", order: "o-c", kind: "COMPLETED" });
  assert.equal(violations(db, bil("R-BIL-4b")), 2, "phiếu Hoàn thành trên đơn chưa Hoàn thành");
});

test("R-BIL-6: đơn Đã giao còn lần thu người thu chưa rõ → vi phạm; đơn chưa giao thì không", () => {
  const db = build();
  db.exec("DROP TRIGGER bil_posting_delivered_paid");
  donBil(db, "o-u");
  lanThuBil(db, { id: "ru", order: "o-u", amount: 300000, role: "UNKNOWN" });
  assert.equal(violations(db, bil("R-BIL-6")), 0, "chưa giao: hợp lệ (việc của Kế toán)");
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-u'").run(BIL_AT);
  phieuBil(db, { id: "pdu", order: "o-u", kind: "DELIVERED", due: 300000 });
  assert.equal(violations(db, bil("R-BIL-6")), 1);
});

test("R-BIL-S9 (NT-S9): lần thu 'thu cho' KHÔNG phải công ty chủ → vi phạm", () => {
  const db = build();
  donBil(db, "o-s");
  lanThuBil(db, { id: "rs9", order: "o-s", amount: 1000 });
  assert.equal(violations(db, bil("R-BIL-S9")), 0);
  lanThuBil(db, { id: "rs9b", order: "o-s", amount: 1000, forParty: "pty-s-an" });
  assert.equal(violations(db, bil("R-BIL-S9")), 1);
});

test("R-BIL-M1/M2 (ADR-0025 NT 8): Hoàn thành mà chưa Đã giao; Đã giao mà trạng thái không phải 'confirmed' → vi phạm (gỡ trigger 0044)", () => {
  const db = build();
  donDaGiao(db);
  assert.equal(violations(db, bil("R-BIL-M1")), 0);
  assert.equal(violations(db, bil("R-BIL-M2")), 0);
  db.exec("DROP TRIGGER orders_completed_after_delivered");
  donBil(db, "o-m1");
  db.prepare("UPDATE orders SET completed_at = ?, completed_by = 's-an' WHERE id = 'o-m1'").run(BIL_SAU);
  assert.equal(violations(db, bil("R-BIL-M1")), 1);
  db.exec("DROP TRIGGER orders_delivered_lock");
  gieoLyDoHuy(db, "o-bil");
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'o-bil'").run();
  assert.equal(violations(db, bil("R-BIL-M2")), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0058 (NT-A11, Task A4): R-CTL-1 — dịch vụ ĐANG HIỆN mà chưa phân loại nhóm. Mức warn: in số, không chặn.
test("R-CTL-1 (ADR-0058 NT-A11): dịch vụ đang hiện chưa có nhóm hiện hành → 1; có nhóm → 0; dòng hiện hành group_code NULL / nhóm đã tắt → vẫn 1; ẩn / rời Sheet → không đếm", () => {
  const c = one("R-CTL-1");
  assert.equal(c.level, "warn");
  assert.ok(c.note, "mức warn có ghi chú");
  const db = build();
  const dv = (code: string, inSheet = 1) =>
    db.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, 'Dịch vụ thử', 'perPax', 100000, ?, ?, ?)`).run(code, inSheet, T1, T1);
  const gan = (code: string, seq: number, nhom: string | null) =>
    db.prepare(`INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(`g-${code}-${seq}`, code, nhom, seq, T1, T1, T1);
  assert.equal(violations(db, c), 0, "danh mục trống → 0");
  dv("X1"); // đang hiện, không dòng gán
  assert.equal(violations(db, c), 1, "không dòng gán → 1");
  gan("X1", 1, "TDA");
  assert.equal(violations(db, c), 0, "có nhóm hiện hành → 0");
  gan("X1", 2, null); // đưa về "Chưa phân loại": dòng hiện hành group_code NULL
  assert.equal(violations(db, c), 1, "dòng hiện hành group_code NULL → vẫn đếm 1 (dòng cũ seq 1 không tính)");
  gan("X1", 3, "TDA");
  assert.equal(violations(db, c), 0, "gán lại → 0");
  // nhóm bị tắt SAU khi đã gán (trigger chỉ chặn GÁN vào nhóm tắt) → form đơn hiện "Chưa phân loại" → đếm
  db.prepare("UPDATE ctl_group SET active = 0 WHERE code = 'TDA'").run();
  assert.equal(violations(db, c), 1, "dòng hiện hành trỏ nhóm đang tắt → đếm 1");
  db.prepare("UPDATE ctl_group SET active = 1 WHERE code = 'TDA'").run();
  assert.equal(violations(db, c), 0);
  // ẩn / rời Sheet: không đếm
  dv("X2");
  assert.equal(violations(db, c), 1);
  db.prepare("INSERT INTO catalog_override (code, hidden, updated_at) VALUES ('X2', 1, ?)").run(T1);
  assert.equal(violations(db, c), 0, "dịch vụ bị ẩn → không đếm");
  db.prepare("UPDATE catalog_override SET hidden = 0 WHERE code = 'X2'").run();
  assert.equal(violations(db, c), 1, "override không ẩn → vẫn đếm");
  dv("X3", 0);
  assert.equal(violations(db, c), 1, "đã rời Sheet (in_sheet = 0) → không đếm");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-NT1 (ADR-0061 điều 8, A-9 — lớp bù cho lệch 5.1 thu hẹp): đơn có dịch vụ nhập tay (order_service.catalog_code NULL) mà người lập (orders.staff_id)
// đang giữ quyền PARTNER còn hiệu lực, và đơn tạo SAU mốc phát hành ADR-0061 (= created_at của dòng đầu bảng ord_manual_service_policy — dòng gieo 0052).
// Mức "warn": máy chủ đã chặn (duocNhapTay — Đối tác trước); đây là lưới cho SQL chạy tay / đường ghi quên priceGuard. Đơn cũ trước mốc không bị xét.
// ---------------------------------------------------------------------------------------------------------------------
test("R-ORD-NT1: đơn có dịch vụ nhập tay do tài khoản có quyền Đối tác lập SAU mốc phát hành ADR-0061 → cảnh báo; trước mốc / nội bộ lập → không", () => {
  const nt1 = one("R-ORD-NT1");
  assert.equal(nt1.level, "warn");
  const db = build();
  const moc = (db.prepare("SELECT MIN(created_at) AS m FROM ord_manual_service_policy").get() as { m: string }).m;
  assert.ok(moc, "dòng gieo 0052 có mặt");
  const sau = new Date(Date.parse(moc) + 60_000).toISOString();
  const don = (id: string, staffId: string, at: string, manual: boolean) => {
    db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
             VALUES ('${id}', 'TD-${id}', '${staffId}', 'draft', 'K', '0900000009', '${at}', '${at}')`);
    db.exec(`INSERT INTO order_service (id, order_id, catalog_code, name, unit, pax_adult, depart_date)
             VALUES ('sv-${id}', '${id}', ${manual ? "NULL" : "'TD101'"}, 'Xe', ${manual ? "'manual'" : "'perPax'"}, 1, '2026-10-01')`);
  };
  assert.equal(violations(db, nt1), 0, "chưa có đơn");
  don("nt-cu", "s-lai", T1, true);
  assert.equal(violations(db, nt1), 0, "đơn nhập tay của tài khoản lai Đối tác TRƯỚC mốc — không xét");
  don("nt-noibo", "s-an", sau, true);
  assert.equal(violations(db, nt1), 0, "nội bộ (SALES) lập đơn nhập tay sau mốc — hợp lệ khi công tắc bật");
  don("nt-danhmuc", "s-lai", sau, false);
  assert.equal(violations(db, nt1), 0, "tài khoản lai Đối tác lập đơn DANH MỤC — không xét");
  don("nt-lai", "s-lai", sau, true);
  assert.equal(violations(db, nt1), 1, "tài khoản lai SALES+PARTNER lập đơn nhập tay sau mốc → cảnh báo");
  db.exec(`UPDATE stf_permission SET valid_to_at = '${sau}' WHERE staff_id = 's-lai' AND permission_type_code = 'PARTNER'`);
  assert.equal(violations(db, nt1), 0, "quyền PARTNER đã đóng → không còn 'đang giữ'");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0068 G15: R-PTY-MERGE-1..5 (gộp hồ sơ). Trigger của migration *_gop_ho_so là đường chặn thứ nhất; các kiểm này là lưới cho SQL chạy tay và cho khe
// giữa lúc kiểm và lúc ghi (việc điều phối / vận chuyển giao cho hồ sơ phụ ngay trước khi gộp).
function nguoiGop(db: DatabaseSync, id: string): void {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, T1, T1);
}
/** Gộp `a` vào `b` bằng SQL (mốc T2 → ngày gộp giờ VN 2026-09-21). */
const gopThang = (db: DatabaseSync, a: string, b: string) =>
  db.prepare("UPDATE pty_party SET active = 0, merged_into_id = ?, merged_at = ? WHERE id = ?").run(b, T2, a);
const MERGE = ["R-PTY-MERGE-1", "R-PTY-MERGE-2", "R-PTY-MERGE-3", "R-PTY-MERGE-4", "R-PTY-MERGE-5"];

test("R-PTY-MERGE: đúng năm kiểm mức fail; gộp khoẻ (liên hệ, vai, quan hệ đóng ĐÚNG ngày gộp) → 0 vi phạm", () => {
  assert.deepEqual(CHECKS.filter((c) => c.code.startsWith("R-PTY-MERGE")).map((c) => [c.code, c.level]), MERGE.map((c) => [c, "fail"]));
  const db = build();
  nguoiGop(db, "pa"); nguoiGop(db, "pb");
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES ('c1', 'pa', 'PHONE', '0912', '0912', 1, '2026-09-01', '2026-09-21', ?, ?)`).run(T1, T1);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES ('r1', 'pa', 'GUIDE', '2026-09-01', '2026-09-21', ?, ?)").run(T1, T1);
  gopThang(db, "pa", "pb");
  for (const code of MERGE) assert.equal(violations(db, one(code)), 0, code);
});

test("R-PTY-MERGE-2: hồ sơ đã gộp còn liên hệ / công việc / quan hệ mở → mỗi hồ sơ một vi phạm", () => {
  const db = build();
  for (const id of ["pa", "pb", "pc", "pd", "pe", "pf"]) nguoiGop(db, id);
  db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at)
    VALUES ('c1', 'pa', 'PHONE', '0912', '0912', 1, '2026-09-01', ?, ?)`).run(T1, T1);
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r1', 'pc', 'GUIDE', '2026-09-01', ?, ?)").run(T1, T1);
  db.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('q1', 'pe', 'pd', 'CONTACT_OF', '2026-09-01', ?, ?)").run(T1, T1);
  gopThang(db, "pa", "pb");
  gopThang(db, "pc", "pb");
  gopThang(db, "pe", "pf");
  assert.equal(violations(db, one("R-PTY-MERGE-2")), 3);
});

test("R-PTY-MERGE-3: hồ sơ đã gộp gắn tài khoản → 1", () => {
  const db = build();
  nguoiGop(db, "pb");
  const cuaAn = (db.prepare("SELECT party_id p FROM staff WHERE id = 's-an'").get() as { p: string }).p;
  gopThang(db, cuaAn, "pb");
  assert.equal(violations(db, one("R-PTY-MERGE-3")), 1);
});

test("R-PTY-MERGE-1: chuỗi gộp (chỉ tạo được khi gỡ trigger pty_party_merge_target) → 1", () => {
  const db = build();
  for (const id of ["pa", "pb", "pc"]) nguoiGop(db, id);
  db.exec("DROP TRIGGER pty_party_merge_target");
  gopThang(db, "pa", "pb");
  gopThang(db, "pb", "pc");
  assert.equal(violations(db, one("R-PTY-MERGE-1")), 1);
});

test("R-PTY-MERGE-4 + 5: hồ sơ đã gộp còn phụ trách đơn chưa xong / còn là người đặt của đơn nháp → mỗi kiểm 1; đơn đã huỷ không tính", () => {
  const db = build();
  nguoiGop(db, "pa"); nguoiGop(db, "pb");
  withHandler(db, "pa", "o-1");
  db.prepare("UPDATE orders SET booker_party_id = 'pa' WHERE id = 'o-1'").run();
  addOrder(db, "o-2");
  db.prepare("UPDATE orders SET booker_party_id = 'pa' WHERE id = 'o-2'").run();
  gieoLyDoHuy(db, "o-2");
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'o-2'").run();
  gopThang(db, "pa", "pb");
  assert.equal(violations(db, one("R-PTY-MERGE-4")), 1);
  assert.equal(violations(db, one("R-PTY-MERGE-5")), 1);
});

test("R-PTY-MERGE-4: hồ sơ đã gộp còn đứng tên xe chưa ngừng → 1; xe đã ngừng không tính (cùng luật viecXeCuaNguoi ở van-chuyen/chuyen-repo.ts)", () => {
  const db = build();
  nguoiGop(db, "pa"); nguoiGop(db, "pb");
  db.exec("DROP TRIGGER IF EXISTS vc_vehicle_owner_ins"); // gieo nhanh: bài này chỉ canh luật đếm xe, không canh luật chủ xe
  const xe = (id: string, status: string, to: string | null) =>
    db.prepare(
      `INSERT INTO vc_vehicle (id, plate_number, plate_key, name, passenger_capacity, owner_party_id, status, valid_from_date, valid_to_date, created_at, updated_at)
       VALUES (?, ?, ?, 'Xe', 16, 'pa', ?, '2026-09-01', ?, ?, ?)`,
    ).run(id, id.toUpperCase(), id.toUpperCase(), status, to, T1, T1);
  xe("xe-ngung", "retired", "2026-09-10");
  gopThang(db, "pa", "pb");
  assert.equal(violations(db, one("R-PTY-MERGE-4")), 0, "xe đã ngừng: không tính");
  xe("xe-chay", "active", null);
  assert.equal(violations(db, one("R-PTY-MERGE-4")), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// Ô MỚI CỦA CHẶNG (kế hoạch 2026-10-01-may-chu-o-moi-chang Task 5.2; ADR-0054 D10.3): R-ORD-13 (fail), R-ORD-14 (warn, L-R1); R-VC-3 / R-VC-7 dùng số
// người CỦA CHẶNG (`soNguoiChangSql` — cùng nghĩa `soNguoiChang`).
// ---------------------------------------------------------------------------------------------------------------------
/** Đổi chặng của `donTho` thành chiều VỀ có số người riêng `so` (gỡ trigger danh tính — bài kiểm CÂU KIỂM ĐỊNH KỲ, không kiểm lớp CSDL). */
function thanhChangVe(db: DatabaseSync, leg: string, so: number | null) {
  db.exec("DROP TRIGGER IF EXISTS ord_transfer_leg_identity");
  db.prepare("UPDATE ord_transfer_leg SET direction = 'RETURN', pax_override = ? WHERE id = ?").run(so, leg);
}

test("R-ORD-13: chặng ĐI mang pax_override → 1 (fail); chặng về mang số / chặng đi không số → 0", () => {
  const c = one("R-ORD-13");
  assert.equal(c.level, "fail");
  const db = tho();
  const d = donTho(db, { pax: 4 });
  const v = donTho(db, { pax: 4 });
  thanhChangVe(db, v.leg, 2);
  assert.equal(violations(db, c), 0);
  // Lưới thứ hai: CHECK của 0057 chặn ghi thẳng — dựng lại bảng không CHECK là việc của SQL tay; ở đây gỡ CHECK bằng cách tắt kiểm ràng buộc.
  db.exec("PRAGMA ignore_check_constraints = ON");
  db.prepare("UPDATE ord_transfer_leg SET pax_override = 2 WHERE id = ?").run(d.leg);
  assert.equal(violations(db, c), 1);
});

test("R-ORD-14 (L-R1): chặng về có số người ≤ số khách hiệu lực → 0; vượt → 1 (warn); đơn huỷ / chặng đóng → không đếm; điều chỉnh số khách (after_json) được tính", () => {
  const c = one("R-ORD-14");
  assert.equal(c.level, "warn");
  assert.ok(c.sql.includes("pax_adult + s.pax_child"), "dùng CHUNG đoạn số khách hiệu lực");
  const db = tho();
  const a = donTho(db, { pax: 2 });
  thanhChangVe(db, a.leg, 2);
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE ord_transfer_leg SET pax_override = 3 WHERE id = ?").run(a.leg);
  assert.equal(violations(db, c), 1);
  db.prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('adj-1', ?, 1, '[]', ?, 0, 0)`)
    .run(a.order, JSON.stringify([{ serviceId: a.svc, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]));
  assert.equal(violations(db, c), 0, "số khách hiệu lực 3 (sau điều chỉnh) — không vượt");
  const b = donTho(db, { pax: 1 });
  thanhChangVe(db, b.leg, 2);
  assert.equal(violations(db, c), 1);
  gieoLyDoHuy(db, b.order);
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(b.order);
  assert.equal(violations(db, c), 0, "đơn huỷ không đếm");
});

test("R-VC-3 / R-VC-7 dùng số người CỦA CHẶNG: chặng về 1 người của dịch vụ 2 khách — 1 suất là đủ (R-VC-7 = 0), 2 suất là thừa (R-VC-3 = 1)", () => {
  const c3 = one("R-VC-3");
  const c7 = one("R-VC-7");
  const db = tho();
  const iso = new Date(NOW_MS + 7 * H + 120 * 60_000).toISOString();
  const d = donTho(db, { pax: 2, ngay: iso.slice(0, 10), gio: iso.slice(11, 16) });
  thanhChangVe(db, d.leg, 1);
  assert.equal(violations(db, c7), 1, "chưa xếp ai — thiếu");
  const t = chuyenTho(db);
  suatTho(db, { trip: t, leg: d.leg });
  assert.equal(violations(db, c7), 0, "1/1 người của chặng về — đủ");
  assert.equal(violations(db, c3), 0);
  suatTho(db, { trip: t, leg: d.leg });
  assert.equal(violations(db, c3), 1, "2 suất > 1 người của chặng về");
});

// ---------------------------------------------------------------------------------------------------------------------
// NT-D4 (ADR nháp nơi trả mặc định, đã duyệt 1/10 — kế hoạch ô mới Task 7.5): R-VC-20 — mẫu đưa đón HIỆN HÀNH trỏ điểm đã ngưng (warn).
// ---------------------------------------------------------------------------------------------------------------------
test("R-VC-20 (NT-D4): mẫu hiện hành trỏ điểm đang dùng → 0; điểm đã ngưng → 1 (warn); bản CŨ trỏ điểm ngưng (đã có bản mới) → không đếm; không điểm → 0", () => {
  const c = one("R-VC-20");
  assert.equal(c.level, "warn");
  const db = build();
  const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
  const VIN = "ec67ff94-bb00-4546-842a-aedb5f916b0a";
  const mau = (id: string, code: string, loc: string | null, at: string) =>
    db.prepare(`INSERT INTO vc_leg_template (id, code, mode, return_time_hint, default_dropoff_location_id, valid_from_at, created_at, updated_at) VALUES (?, ?, 'ONE_WAY', NULL, ?, ?, ?, ?)`)
      .run(id, code, loc, at, at, at);
  mau("m1", "TD101", BEN, T1);
  mau("m2", "TD102", null, T1);
  mau("m3", "TD103", VIN, T1);
  mau("m4", "TD103", BEN, T2);
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE loc_location SET active = 0 WHERE id = ?").run(VIN);
  assert.equal(violations(db, c), 0, "TD103 bản hiện hành đã đổi sang điểm khác");
  db.prepare("UPDATE loc_location SET active = 0 WHERE id = ?").run(BEN);
  assert.equal(violations(db, c), 2, "TD101 + TD103 (bản hiện hành) trỏ điểm đã ngưng");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0057 T1 B4 (kế hoạch Đợt 4 Task 5): R-VC-RATE-1 — dòng giá còn hiệu lực của hồ sơ đã thôi vai nhà xe (warn).
// ---------------------------------------------------------------------------------------------------------------------
test("R-VC-RATE-1 (ADR-0057 B4): nhà xe đang hợp tác có giá mở → 0; thôi vai → 1 (warn); kết thúc dòng giá → 0; dòng đã hết hạn trước hôm nay không đếm", () => {
  const c = one("R-VC-RATE-1");
  assert.equal(c.level, "warn");
  const db = build();
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-nx', 'ORGANIZATION', 'Nhà xe', 1, '${T1}', '${T1}')`);
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-nx', 'p-nx', 'CARRIER', NULL, '2026-09-01', '${T1}', '${T1}')`);
  db.exec(`INSERT INTO vc_route (code, name, created_at, updated_at) VALUES ('T001', 'Tuyến', '${T1}', '${T1}')`);
  db.exec(`INSERT INTO vc_vehicle_size (code, label, min_passengers, max_passengers, created_at, updated_at) VALUES ('S001', '10–16 khách', 10, 16, '${T1}', '${T1}')`);
  const gia = (id: string, tu: string, den: string | null) =>
    db.prepare(`INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, vehicle_size_code, amount, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, 'p-nx', 'T001', 'S001', 1000000, ?, ?, ?, ?)`)
      .run(id, tu, den, T1, T1);
  gia("g-cu", "2020-01-01", "2020-12-31");
  gia("g-mo", "2026-09-01", null);
  assert.equal(violations(db, c), 0);
  db.exec("UPDATE pty_party_role SET valid_to_date = '2026-09-30' WHERE id = 'r-nx'");
  assert.equal(violations(db, c), 1, "dòng mở của nhà xe đã thôi");
  db.exec("UPDATE vc_rental_rate SET valid_to_date = '2026-09-15' WHERE id = 'g-mo'");
  assert.equal(violations(db, c), 0, "đã kết thúc (ngày đã qua)");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0057 T2 C8 (kế hoạch Đợt 4 Task 11): R-VC-COST-1 … 6 — lưới thứ hai của chi phí chuyến xe thuê. Dựng thô (`tho()` gỡ mọi trigger vc_trip%, kể cả của
// vc_trip_cost_line) để gieo vi phạm như SQL gõ tay trên D1.
// ---------------------------------------------------------------------------------------------------------------------
let soCp = 0;
function cpTho(db: DatabaseSync, o: { trip: string; kind: string; amount: number; reverses?: string | null; reason?: string | null; at?: string; carrier?: string; cmd?: string; tay?: boolean }): string {
  // `tay`: dòng do Kế toán ghi tay — id = dấu lệnh (khuôn route chi phí; R-VC-COST-8 phân biệt đảo tay / đảo do lô lệnh).
  const id = o.tay ? crypto.randomUUID() : `cp-${++soCp}`;
  const snap = o.kind === "SNAPSHOT";
  db.prepare(`INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, rate_id, passenger_capacity_snapshot, unit_amount_snapshot, reason_code, reverses_id,
      occurred_date, cmd_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-09-21', ?, ?, ?)`)
    .run(id, o.trip, o.carrier ?? "p-nx", o.kind, o.amount, snap ? "rate-1" : null, snap ? 16 : null, snap ? o.amount : null,
      o.reason === undefined ? (snap ? null : o.kind === "AGREED" ? "CPX_GIA_THOA_THUAN" : "CPX_KHAC") : o.reason, o.reverses ?? null, o.tay ? id : (o.cmd ?? "c".repeat(36)), o.at ?? T2, o.at ?? T2);
  return id;
}
const thue = (db: DatabaseSync, trip: string) => db.prepare("UPDATE vc_trip SET rented = 1 WHERE id = ?").run(trip);

test("R-VC-COST-1 / 1b (ADR-0057 C8): chuyến xe thuê hai nguồn giá chưa đảo → 1 (fail); đảo một → 0; thiếu giá khi PLANNED → 1b (warn)", () => {
  const c1 = one("R-VC-COST-1");
  const c1b = one("R-VC-COST-1b");
  assert.deepEqual([c1.level, c1b.level], ["fail", "warn"]);
  const db = tho();
  const t = chuyenTho(db, { carrier: "p-nx" });
  thue(db, t);
  assert.deepEqual([violations(db, c1), violations(db, c1b)], [0, 1], "thiếu giá");
  const s = cpTho(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000 });
  assert.deepEqual([violations(db, c1), violations(db, c1b)], [0, 0]);
  cpTho(db, { trip: t, kind: "AGREED", amount: 1_350_000 });
  assert.equal(violations(db, c1), 1, "hai nguồn giá");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s });
  assert.equal(violations(db, c1), 0);
});

test("R-VC-COST-2: dòng đảo sai số / trỏ dòng không có / đảo dòng đảo → vi phạm (fail)", () => {
  const c = one("R-VC-COST-2");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { carrier: "p-nx" });
  const a = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 150_000 });
  const r = cpTho(db, { trip: t, kind: "REVERSAL", amount: -150_000, reverses: a });
  assert.equal(violations(db, c), 0);
  cpTho(db, { trip: t, kind: "REVERSAL", amount: 150_000, reverses: r });
  assert.equal(violations(db, c), 1, "đảo dòng đảo");
  const b = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 70_000 });
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -70_001, reverses: b });
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -5, reverses: "khong-co" });
  assert.equal(violations(db, c), 3);
});

test("R-VC-COST-3 (TC-10; ADR-0095 Q5): chuyến rented = 0 còn nguồn giá chưa đảo HOẶC tổng ≠ 0 ngoài 'Phí huỷ muộn' cho nhà xe cũ → vi phạm; đổi sang xe công ty với dòng đã đảo (tổng 0) → không; chuyến huỷ → không xét", () => {
  const c = one("R-VC-COST-3");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { carrier: "p-cty" });
  const s = cpTho(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000 });
  assert.equal(violations(db, c), 1, "nguồn giá trên chuyến không thuê");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s });
  assert.equal(violations(db, c), 0, "V13: dòng đã đảo, tổng 0");
  const ph = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON" });
  assert.equal(violations(db, c), 0, "4.7: tổng ≠ 0 CHỈ gồm phí huỷ muộn cho nhà xe cũ (p-nx ≠ p-cty) → hợp lệ");
  const kh = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 50_000, reason: "CPX_KHAC" });
  assert.equal(violations(db, c), 1, "lý do khác trên chuyến không thuê → vi phạm");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -50_000, reverses: kh, reason: "CPX_NHAP_SAI" });
  assert.equal(violations(db, c), 0, "dòng lý do khác đã đảo → tổng phần còn lại = phí huỷ");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -300_000, reverses: ph, reason: "CPX_NHAP_SAI" });
  assert.equal(violations(db, c), 0, "đảo luôn phí huỷ → tổng 0");
  const t3 = chuyenTho(db, { carrier: "p-cty" });
  const s3 = cpTho(db, { trip: t3, kind: "SNAPSHOT", amount: 1_000_000 });
  cpTho(db, { trip: t3, kind: "REVERSAL", amount: -1_000_000, reverses: s3 });
  cpTho(db, { trip: t3, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON", carrier: "p-khac" });
  assert.equal(violations(db, c), 1, "vòng sửa 3: phí huỷ mang nhà xe CHƯA TỪNG có nguồn giá trên chuyến này → vi phạm");
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(t3);
  const t2 = chuyenTho(db, { carrier: "p-cty" });
  cpTho(db, { trip: t2, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON", carrier: "p-cty" });
  assert.equal(violations(db, c), 1, "phí huỷ muộn mang CHÍNH công ty chủ (không phải nhà xe cũ) → vi phạm");
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(t2);
  cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 70_000, reason: "CPX_KHAC" });
  assert.equal(violations(db, c), 1, "tổng ≠ 0 vì lý do khác");
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(t);
  assert.equal(violations(db, c), 0, "chuyến huỷ do R-VC-COST-4 xét");
});

test("R-VC-COST-4 (vòng sửa 1 — phương án a): chuyến huỷ — tổng = cộng MỌI dòng ghi SAU lúc huỷ (ngoài lô huỷ) → 0; giá chưa đảo trong lô huỷ / dòng ghi TRƯỚC lúc huỷ còn treo → vi phạm (fail)", () => {
  const c = one("R-VC-COST-4");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { carrier: "p-nx" });
  thue(db, t);
  const s = cpTho(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, at: T1 });
  const a = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: -200_000, reason: "CPX_NHAP_SAI", at: T1 });
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(t);
  const ev = suKienTho(db, { trip: t, kind: "CANCELLED", ghi: T2, nhatKy: null });
  assert.equal(violations(db, c), 1, "huỷ mà giá chưa đảo");
  // Lô huỷ: dòng đảo CÙNG mốc giờ + CÙNG dấu lệnh với sự kiện huỷ — thuộc "trước / trong lúc huỷ".
  cpTho(db, { trip: t, kind: "REVERSAL", amount: 200_000, reverses: a, reason: "CPX_HUY_CHUYEN", at: T2, cmd: ev });
  assert.equal(violations(db, c), 1, "mới đảo một nửa");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, reason: "CPX_HUY_CHUYEN", at: T2, cmd: ev });
  assert.equal(violations(db, c), 0);
  cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON", at: T3 });
  assert.equal(violations(db, c), 0, "V8b: phí huỷ ghi sau lúc huỷ");
  cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: -100_000, reason: "CPX_NHAP_SAI", at: T3 });
  assert.equal(violations(db, c), 0, "luồng hợp lệ: phí huỷ rồi sửa sai (Nhập sai) — không báo nhầm (người kiểm V-1)");
  cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 50_000, reason: "CPX_KHAC", at: T1 }); // dòng ghi TRƯỚC lúc huỷ (như gõ tay) còn treo
  assert.equal(violations(db, c), 1, "dòng trước lúc huỷ chưa đảo");
});

test("R-VC-COST-5 (ADR tiêu chí 4c): GỠ TẠM trigger thieu_gia + insert_planned, đưa chuyến xe thuê không nguồn giá sang RUNNING → 1 (fail); khôi phục trigger trong cùng bài", () => {
  const c = one("R-VC-COST-5");
  assert.equal(c.level, "fail");
  const db = build();
  const sqlTrigger = (ten: string) => (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(ten) as { sql: string }).sql;
  const goc = { thieuGia: sqlTrigger("vc_trip_thieu_gia"), insertPlanned: sqlTrigger("vc_trip_insert_planned") };
  db.exec("PRAGMA foreign_keys = OFF");
  // Chèn thẳng RUNNING (như SQL gõ tay) — trước hết thấy trigger chặn.
  const chen = (id: string) => db.prepare(`INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms,
      rest_minutes_snapshot, status, departed_at, departed_ms, rented, last_cmd_id, created_at, updated_at) VALUES (?, ?, 'xe-1', 'p-nx', '2026-09-21', ?, ?, ?, 30, 'RUNNING', ?, ?, 1, ?, ?, ?)`)
    .run(id, `CX-${id}`, Date.parse(T2), Date.parse(T3), Date.parse(T2), T2, Date.parse(T2), "c".repeat(36), T1, T1);
  for (const t of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'vc_trip' AND name NOT IN ('vc_trip_thieu_gia', 'vc_trip_insert_planned')").all() as { name: string }[]) {
    db.exec(`DROP TRIGGER ${t.name}`); // chỉ để chèn được dòng thô; hai trigger đang xét giữ lại tới bước gỡ tạm
  }
  assert.throws(() => chen("tr-cost5-a"), /vc_trip_insert_planned/);
  db.exec("DROP TRIGGER vc_trip_thieu_gia; DROP TRIGGER vc_trip_insert_planned"); // gỡ TẠM
  chen("tr-cost5-a");
  assert.equal(violations(db, c), 1, "chuyến xe thuê đang chạy không nguồn giá");
  db.exec(goc.thieuGia + ";" + goc.insertPlanned + ";"); // khôi phục
  assert.throws(() => chen("tr-cost5-b"), /vc_trip_insert_planned/, "trigger đã khôi phục");
  assert.ok(sqlTrigger("vc_trip_thieu_gia").includes("thieu_gia"));
});

test("R-VC-COST-6 (kẽ C2a — nợ N-T1, warn): chuyến chưa huỷ rented = 0 mà chủ xe không phải công ty chủ hiện tại → 1; xe công ty chủ → 0", () => {
  const c = one("R-VC-COST-6");
  assert.equal(c.level, "warn");
  const db = tho();
  const cty = (db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string } | undefined)?.party_id;
  assert.ok(cty, "build() có công ty chủ");
  chuyenTho(db, { carrier: cty });
  assert.equal(violations(db, c), 0);
  chuyenTho(db, { carrier: "p-nx-cu" });
  assert.equal(violations(db, c), 1);
});

test("vòng sửa 3: MỘT mốc huỷ — R-VC-COST-4 và ngày huỷ mặc định của điều chỉnh (tien-xe-repo `vc_trip_cancelled_at`) cùng đọc created_at của sự kiện CANCELLED mới nhất", () => {
  const sql4 = one("R-VC-COST-4").sql.replace(/\s+/g, " ");
  assert.match(sql4, /SELECT e\.id, e\.created_at FROM vc_trip_event e WHERE e\.trip_id = t\.id AND e\.kind = 'CANCELLED' ORDER BY e\.created_at DESC LIMIT 1/);
  const repo = readFileSync(new URL("./modules/van-chuyen/tien-xe-repo.ts", import.meta.url), "utf8");
  assert.match(repo, /"vc_trip_cancelled_at", "SELECT created_at FROM vc_trip_event WHERE trip_id = \?1 AND kind = 'CANCELLED' ORDER BY created_at DESC LIMIT 1"/);
});

test("R-VC-COST-8 (ADR-0095 Q5b, warn): phí huỷ muộn của nhà xe cũ bị lô lệnh ĐẢO TỰ ĐỘNG mà chưa ghi lại cho cùng nhà xe → 1; ghi lại sau đó → 0; đảo TAY → 0", () => {
  const c = one("R-VC-COST-8");
  assert.equal(c.level, "warn");
  const db = tho();
  const L = (h: number) => `2026-09-21T${String(h).padStart(2, "0")}:00:00.000Z`;
  const t = chuyenTho(db, { carrier: "p-cty" });
  const s = cpTho(db, { trip: t, kind: "SNAPSHOT", amount: 1_200_000, at: L(1) });
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -1_200_000, reverses: s, at: L(2) });
  const ph = cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON", at: L(3), tay: true });
  assert.equal(violations(db, c), 0, "phí huỷ còn hiệu lực");
  cpTho(db, { trip: t, kind: "REVERSAL", amount: -300_000, reverses: ph, reason: "CPX_DOI_CHUYEN", at: L(4) }); // dấu lệnh ≠ id dòng ⇒ đảo do lô lệnh
  assert.equal(violations(db, c), 1, "đảo tự động, chưa ghi lại");
  cpTho(db, { trip: t, kind: "ADJUSTMENT", amount: 300_000, reason: "CPX_HUY_MUON", at: L(5), tay: true });
  assert.equal(violations(db, c), 0, "Kế toán đã ghi lại phí huỷ cho cùng nhà xe");
  const t2 = chuyenTho(db, { carrier: "p-cty" });
  const s2 = cpTho(db, { trip: t2, kind: "SNAPSHOT", amount: 1_000_000, at: L(1) });
  cpTho(db, { trip: t2, kind: "REVERSAL", amount: -1_000_000, reverses: s2, at: L(2) });
  const ph2 = cpTho(db, { trip: t2, kind: "ADJUSTMENT", amount: 200_000, reason: "CPX_HUY_MUON", at: L(3), tay: true });
  cpTho(db, { trip: t2, kind: "REVERSAL", amount: -200_000, reverses: ph2, reason: "CPX_NHAP_SAI", at: L(4), tay: true }); // đảo TAY: dấu lệnh = id dòng
  assert.equal(violations(db, c), 0, "Kế toán tự đảo (nhập sai) — không cảnh báo");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0055 VK2-A hệ quả 10 (kế hoạch Đợt 3 Task 8): R-VC-21 — chuyến chưa kết thúc chồng khung bận còn hiệu lực của xe (warn, lưới thứ hai của trigger).
// ---------------------------------------------------------------------------------------------------------------------
test("R-VC-21 (ADR-0055 hệ quả 10): chuyến chưa huỷ, CHƯA kết thúc chồng khung bận còn hiệu lực của xe → đếm (warn); chuyến đã kết thúc / khung đã rút / khung DRIVER → không đếm", () => {
  const c = one("R-VC-21");
  assert.equal(c.level, "warn");
  const db = tho(); // trigger vc_trip* đã thả — giả "lọt lưới" của vc_trip_unavailable_ins / _upd
  const goc = Math.floor(NOW_MS / 60_000) * 60_000 + 24 * H;
  const khung = (id: string, tu: number, den: number, o: { subject?: string; xe?: string | null; taiXe?: string | null; lyDo?: string } = {}) =>
    db.prepare(`INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, o.subject ?? "VEHICLE", o.xe === undefined ? "xe-1" : o.xe, o.taiXe ?? null, tu, den, isoMs(tu), isoMs(den), o.lyDo ?? "BAN_XE_BAO_DUONG", T1, T1);
  khung("kb-1", goc + 8 * H, goc + 17 * H);
  chuyenTho(db, { tu: goc + 18 * H, den: goc + 19 * H });
  chuyenTho(db, { tu: goc + 17 * H, den: goc + 18 * H }); // chạm mép — nửa mở
  assert.equal(violations(db, c), 0, "chuyến ngoài khung / chạm mép");
  const b = chuyenTho(db, { tu: goc + 9 * H, den: goc + 10 * H });
  assert.equal(violations(db, c), 1, "chuyến PLANNED lọt vào khung");
  chuyenTho(db, { tu: goc + 11 * H, den: goc + 12 * H, status: "ENDED", departed: goc + 11 * H, ended: goc + 12 * H });
  const huy = chuyenTho(db, { tu: goc + 13 * H, den: goc + 14 * H });
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(huy);
  assert.equal(violations(db, c), 1, "chuyến đã kết thúc / đã huỷ không đếm");
  // Khung DRIVER (Đợt 6 — thả trigger "chưa mở" để dựng) không khớp theo xe.
  db.exec("DROP TRIGGER vc_unavailability_driver_closed");
  db.prepare("INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES ('BAN_TAI_XE_THU', 'BAN_TAI_XE', 'Thử', 1, ?, ?)").run(T1, T1);
  khung("kb-tx", goc + 8 * H, goc + 17 * H, { subject: "DRIVER", xe: null, taiXe: "p-cty", lyDo: "BAN_TAI_XE_THU" });
  assert.equal(violations(db, c), 1, "khung DRIVER không đếm");
  db.prepare("UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's', version = 2, updated_at = ?, updated_by = 's' WHERE id = 'kb-1'").run(T2, T2);
  assert.equal(violations(db, c), 0, "khung đã rút");
  assert.ok(b);
});

// ---------------------------------------------------------------------------------------------------------------------
// Vận chuyển Đợt 5 (ADR-0052 D5 — kế hoạch Task 7): lưới thứ hai cho báo huỷ (R-VC-22), điểm thêm khi chạy (R-VC-23), cập nhật điểm khi xe chạy (R-VC-24).
// ---------------------------------------------------------------------------------------------------------------------
const diemThemTho = (db: DatabaseSync, trip: string, o: { id?: string; them?: number; luc?: string } = {}): string => {
  const id = o.id ?? `st-${++soVc}`;
  db.prepare(`INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_key, added_while_running, created_at, updated_at) VALUES (?, ?, ?, 'PICKUP', 'loc-x', 'L:loc-x', ?, ?, ?)`)
    .run(id, trip, (soVc % 400) + 1, o.them ?? 0, o.luc ?? T1, o.luc ?? T1);
  return id;
};
test("R-VC-22 (Đợt 5 D5.2): cờ báo huỷ có sự kiện cùng suất, cùng lúc, đặt khi suất còn chờ → 0; cờ không sự kiện / đặt SAU khi suất đã có kết quả → vi phạm (fail)", () => {
  const c = one("R-VC-22");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const datCo = (a: string, luc: string) =>
    db.prepare("UPDATE vc_trip_allocation SET office_cancel_at = ?, office_cancel_by = 's-admin', office_cancel_reason_code = 'BAO_HUY_KHONG_DI' WHERE id = ?").run(luc, a);
  const tot = suatTho(db, { trip: t });
  suKienTho(db, { trip: t, kind: "ALLOCATION_OFFICE_CANCELLED", alloc: tot, ghi: T3, nhatKy: null });
  datCo(tot, T3);
  // Báo nhầm: tài xế vẫn "Đã đón" SAU khi văn phòng báo huỷ — hợp lệ.
  suKienTho(db, { trip: t, kind: "PASSENGER_BOARDED", alloc: tot, ghi: T4, nhatKy: null });
  db.prepare("UPDATE vc_trip_allocation SET status = 'BOARDED' WHERE id = ?").run(tot);
  assert.equal(violations(db, c), 0, "báo huỷ khi còn chờ, đón sau → sạch");
  const khongSuKien = suatTho(db, { trip: t });
  datCo(khongSuKien, T3);
  assert.equal(violations(db, c), 1, "cờ không có sự kiện ALLOCATION_OFFICE_CANCELLED của đúng suất");
  const daDon = suatTho(db, { trip: t, status: "BOARDED" });
  suKienTho(db, { trip: t, kind: "PASSENGER_BOARDED", alloc: daDon, ghi: T2, nhatKy: null });
  suKienTho(db, { trip: t, kind: "ALLOCATION_OFFICE_CANCELLED", alloc: daDon, ghi: T3, nhatKy: null });
  datCo(daDon, T3);
  assert.equal(violations(db, c), 2, "cờ đặt SAU khi suất đã đón");
});
test("R-VC-23 (Đợt 5 D5.1): điểm mang cờ 'thêm khi xe chạy' trên chuyến đã xuất bến, tạo sau xuất bến → 0; chuyến chưa xuất bến / tạo trước xuất bến → vi phạm (fail)", () => {
  const c = one("R-VC-23");
  assert.equal(c.level, "fail");
  const db = tho();
  const chay = chuyenTho(db, { status: "RUNNING", departed: Date.parse(T2) });
  diemThemTho(db, chay, { them: 1, luc: T3 });
  diemThemTho(db, chay, { them: 0, luc: T1 });
  assert.equal(violations(db, c), 0);
  const chua = chuyenTho(db);
  diemThemTho(db, chua, { them: 1, luc: T3 });
  assert.equal(violations(db, c), 1, "chuyến chưa từng xuất bến");
  diemThemTho(db, chay, { them: 1, luc: T1 });
  assert.equal(violations(db, c), 2, "điểm tạo trước giờ xuất bến");
});
test("R-VC-24 (Đợt 5 D5.3a): suất đóng STOP_CHANGED sau xuất bến có suất mở lại cùng chặng, cùng người, cùng dấu lệnh → 0; không mở lại / khác người → vi phạm (fail); trước xuất bến không xét", () => {
  const c = one("R-VC-24");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db, { status: "RUNNING", departed: Date.parse(T2) });
  const cmd = "d0000000-0000-4000-8000-000000000001";
  const dong = (o: { leg: string; key: string | null; den: string; cmd: string | null }) => {
    const a = suatTho(db, { trip: t, leg: o.leg, key: o.key, tu: T1, den: o.den });
    db.prepare("UPDATE vc_trip_allocation SET close_reason = 'STOP_CHANGED', closed_cmd_id = ? WHERE id = ?").run(o.cmd, a);
    return a;
  };
  const mo = (o: { leg: string; key: string | null; cmd: string }) => {
    const a = suatTho(db, { trip: t, leg: o.leg, key: o.key, tu: T3 });
    db.prepare("UPDATE vc_trip_allocation SET opened_cmd_id = ?, added_after_departure = 1 WHERE id = ?").run(o.cmd, a);
  };
  dong({ leg: "leg-1", key: "pk-1", den: T3, cmd });
  mo({ leg: "leg-1", key: "pk-1", cmd });
  dong({ leg: "leg-1", key: null, den: T3, cmd });
  mo({ leg: "leg-1", key: null, cmd });
  dong({ leg: "leg-2", key: "pk-9", den: T1, cmd: null }); // đóng TRƯỚC xuất bến (lô chuyến chưa chạy) — không xét
  assert.equal(violations(db, c), 0);
  dong({ leg: "leg-3", key: "pk-3", den: T3, cmd: "d0000000-0000-4000-8000-000000000002" });
  assert.equal(violations(db, c), 1, "đóng khi xe chạy mà không mở lại");
  dong({ leg: "leg-4", key: "pk-4", den: T3, cmd: "d0000000-0000-4000-8000-000000000003" });
  mo({ leg: "leg-4", key: "pk-khac", cmd: "d0000000-0000-4000-8000-000000000003" });
  assert.equal(violations(db, c), 2, "mở lại người khác");
});

// ---------------------------------------------------------------------------------------------------------------------
// Vận chuyển Đợt 7 (ADR-0056 VK3-A — kế hoạch Task 6): R-VC-25 — chuyến đang chạy / đã chạy trái cam kết xe riêng / số chỗ tối thiểu mà không có phá lệ (warn).
// ---------------------------------------------------------------------------------------------------------------------
test("R-VC-25 (Đợt 7 VK3-A): chuyến đã xuất bến trái cam kết xe riêng / số chỗ mà KHÔNG phá lệ → đếm (warn); có phá lệ / suất CREW / suất đã đóng trước xuất bến / chuyến chưa chạy → không đếm", () => {
  const c = one("R-VC-25");
  assert.equal(c.level, "warn");
  const db = tho();
  const batCamKet = (leg: string, xeRieng: number, choToiThieu: number | null) =>
    db.prepare("UPDATE ord_transfer_leg SET exclusive_vehicle = ?, min_vehicle_seats = ? WHERE id = ?").run(xeRieng, choToiThieu, leg);
  const chup = (trip: string, soCho: number, ketQua = "DAT") =>
    db.prepare(`INSERT INTO vc_trip_departure_check (id, trip_id, cmd_id, policy_id, ket_qua, vehicle_id, plate_number, passenger_capacity, owner_party_id, driver_party_id,
        rest_minutes_used, checked_at, created_at, updated_at) VALUES (?, ?, ?, 'pol', ?, 'xe-1', '51A-12345', ?, 'p-cty', 'p-cty', 0, ?, ?, ?)`)
      .run(`ck-${++soVc}`, trip, "c".repeat(36), ketQua, soCho, T2, T2, T2);
  const phaLe = (trip: string) =>
    db.prepare("UPDATE vc_trip SET commitment_override_reason_code = 'PHA_LE_SU_CO', commitment_override_key = 'xe:xe-1|x:XR:1:-' WHERE id = ?").run(trip);
  const dep = Date.parse(T3);

  // (a) xe riêng có suất khách của đơn KHÁC trên cùng chuyến.
  const a = donTho(db, { ten: 1 });
  const b = donTho(db, { ten: 1 });
  const t1 = chuyenTho(db, { status: "RUNNING", departed: dep });
  chup(t1, 16);
  suatTho(db, { trip: t1, leg: a.leg, key: a.khach[0]! });
  batCamKet(a.leg, 1, null);
  assert.equal(violations(db, c), 0, "xe riêng một mình trên chuyến");
  suatTho(db, { trip: t1, leg: a.leg, key: "pk-cung-don" });
  assert.equal(violations(db, c), 0, "suất khác của CHÍNH đơn đó không tính");
  suatTho(db, { trip: t1, kind: "CREW" });
  assert.equal(violations(db, c), 0, "suất CREW (tài xế / phụ xe) không tính là khách đơn khác");
  suatTho(db, { trip: t1, leg: b.leg, key: b.khach[0]!, tu: T1, den: T2 }); // đã đóng TRƯỚC xuất bến
  assert.equal(violations(db, c), 0, "suất đơn khác đã đóng trước xuất bến không tính");
  suatTho(db, { trip: t1, leg: b.leg, key: b.khach[0]! });
  assert.equal(violations(db, c), 1, "đơn khác ghép vào xe riêng, không phá lệ");
  phaLe(t1);
  assert.equal(violations(db, c), 0, "có phá lệ cam kết thì sạch");

  // (b) số chỗ tối thiểu lớn hơn số chỗ trong bản chụp xuất bến.
  const d = donTho(db, { ten: 1 });
  const t2 = chuyenTho(db, { status: "ENDED", departed: dep, ended: dep + H });
  chup(t2, 7, "KHONG_DAT"); // lần kiểm KHÔNG ĐẠT không phải bản chụp xuất bến
  chup(t2, 16);
  suatTho(db, { trip: t2, leg: d.leg, key: d.khach[0]! });
  batCamKet(d.leg, 0, 16);
  assert.equal(violations(db, c), 0, "đủ chỗ (16 ≥ 16)");
  batCamKet(d.leg, 0, 17);
  assert.equal(violations(db, c), 1, "cần 17 chỗ, xe chụp 16");
  // Chuyến chưa chạy không xét (cổng xuất bến lo).
  const e = donTho(db, { ten: 1 });
  const t3 = chuyenTho(db);
  suatTho(db, { trip: t3, leg: e.leg, key: e.khach[0]! });
  batCamKet(e.leg, 0, 100);
  assert.equal(violations(db, c), 1, "chuyến PLANNED không đếm");
});

// ADR-0096 Đ1.5 (gói A1 — 0084): R-VC-THU-TU — chuyến ĐANG CHẠY có suất mở CHỜ LÊN mà điểm trả đứng trước / bằng số điểm đón (fail; lưới thứ hai của đường đổi thứ
// tự khi đang chạy — không trigger theo dòng, Đ1.6). Chuyến kế hoạch vi phạm = "đang bị giữ" hợp lệ, không đếm.
test("R-VC-THU-TU (ADR-0096 Đ1.5): chuyến đang chạy, khách chờ lên, điểm trả ≤ điểm đón → đếm (fail); đúng thứ tự / đã lên xe / suất đóng / chuyến kế hoạch → không", () => {
  const c = one("R-VC-THU-TU");
  assert.equal(c.level, "fail");
  const db = tho();
  const diem = (trip: string, kind: string, seq: number) => {
    const id = `st-${++soVc}`;
    db.prepare("INSERT INTO vc_trip_stop (id, trip_id, seq, kind, location_id, place_key, created_at, updated_at) VALUES (?, ?, ?, ?, 'loc-x', 'L:loc-x', ?, ?)").run(id, trip, seq, kind, T1, T1);
    return id;
  };
  const chay = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const don = diem(chay, "PICKUP", 1);
  const tra = diem(chay, "DROPOFF", 2);
  suatTho(db, { trip: chay, board: don, alight: tra });
  assert.equal(violations(db, c), 0, "đúng thứ tự");
  const don2 = diem(chay, "PICKUP", 3);
  suatTho(db, { trip: chay, board: don2, alight: tra, status: "BOARDED" });
  suatTho(db, { trip: chay, board: don2, alight: tra, den: T2 });
  assert.equal(violations(db, c), 0, "đã lên xe / suất đã đóng: không xét");
  suatTho(db, { trip: chay, board: don2, alight: tra });
  assert.equal(violations(db, c), 1, "khách chờ lên ở điểm 3 xuống ở điểm 2");
  const bang = diem(chay, "DROPOFF", 3);
  suatTho(db, { trip: chay, board: don2, alight: bang });
  assert.equal(violations(db, c), 2, "bằng số cũng là vi phạm");
  const keHoach = chuyenTho(db);
  suatTho(db, { trip: keHoach, board: diem(keHoach, "PICKUP", 2), alight: diem(keHoach, "DROPOFF", 1) });
  assert.equal(violations(db, c), 2, "chuyến kế hoạch: đang bị giữ, không đếm");
});
