// Kiểm toán bất biến (scripts/audit-invariants.mjs): chạy CHÍNH các câu SQL của script — lấy từ scripts/audit-checks.mjs, cùng một nguồn với lần chạy trên D1 —
// trên SQLite thật (node:sqlite) với schema dựng từ TOÀN BỘ migrations/*.sql. Trước đây các câu này chỉ được thử tay trên D1 tạm; ở đây R-DSP-1/2a/2b/3 có ca đỏ và ca xanh.
// Ngoài phạm vi: cơ chế gọi wrangler và mã thoát (1 = vi phạm, 2 = không chạy được, vd D1 chưa có bảng dsp_*) — do e2e (bước cuối của tests/e2e/run.mjs) kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { demSietTheoTap } from "./modules/auth/repository.ts";
import { allowedFactors, isInternal } from "./modules/auth/mfa-rules.ts";
import { EXTERNAL_PERMISSIONS, PERMISSION_CODES } from "./shared/permissions.ts";
import { OWNER_COMPANY_ROLE } from "./shared/cong-ty-chu.ts";
import { vnToday } from "./shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts — hàm gieo DÙNG CHUNG mốc giờ hẹn (ADR-0051)
import { gieoMocXep } from "../tests/audit/gieo-vc.mjs";
import { gieoLyDoHuy } from "../tests/audit/huy-don.mjs";
import { gieoDongTienKhop } from "../tests/audit/dong-tien.mjs";
import { gieoBanChup } from "../tests/audit/gieo-ban-chup.mjs";

interface Check {
  code: string;
  what: string;
  sql: string;
  level: "fail" | "warn-unless-strict" | "warn";
  mode?: "rows";
  note?: string;
  dem?: (rows: unknown[]) => number;
}
const { CHECKS, COT_N3_NHAT_KY, demViPham } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as {
  CHECKS: Check[];
  COT_N3_NHAT_KY: Record<string, { kiem: string; chuanHoa?: boolean }>;
  demViPham: (c: Check, rows: unknown[]) => number;
};

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
/** Số vi phạm của một kiểm — CÙNG hàm `demViPham` mà scripts/audit-invariants.mjs dùng (sổ đại lý đợt 2: kiểm có hàm đếm `dem`). */
function violations(db: DatabaseSync, check: Check): number {
  return demViPham(check, db.prepare(check.sql.replace(/\s+/g, " ").trim()).all());
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
  // Sổ đại lý đợt 2: script nạp ĐỘNG (`await import("./audit-checks.mjs")`, nạp hỏng ⇒ thoát 2) — vẫn một nguồn.
  assert.match(script, /(from |import\()"\.\/audit-checks\.mjs"/, "script phải lấy danh sách kiểm từ audit-checks.mjs");
  assert.doesNotMatch(script, /FROM dsp_assignment|FROM staff/i, "không được chép câu SQL vào script (test sẽ không kiểm đúng cái script chạy)");

  assert.deepEqual(
    CHECKS.filter((c) => c.code.startsWith("R-DSP")).map((c) => [c.code, c.level]),
    [["R-DSP-1", "fail"], ["R-DSP-2a", "warn-unless-strict"], ["R-DSP-2b", "warn"], ["R-DSP-3", "fail"], ["R-DSP-4", "warn-unless-strict"], ["R-DSP-5", "fail"], ["R-DSP-6", "warn-unless-strict"], ["R-DSP-7", "fail"]],
    "2a (không tài khoản/mất quyền) đỏ khi --strict; 2b (tài khoản đã ngưng) chỉ cảnh báo; R-DSP-3 (chồng lấn) là vi phạm thật; R-DSP-4 (LC-8 mới) cảnh báo trước",
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
// R-AUT-MFA-1/2/3 (ADR-0074, kế hoạch Phần B Task 8): lưới dữ liệu của bảo mật hai lớp. Đường API giữ cả ba (ân hạn khi tạo/kích hoạt lại/lên nội bộ,
// cửa sổ 24 giờ khi tắt lớp hai; chỉ mục aut_mfa_factor_one_live; lô ngưng thu hồi máy tin) — chỉ dữ liệu sửa tay / chỉ mục mất mới đỏ.
// ---------------------------------------------------------------------------------------------------------------------
function addFactor(db: DatabaseSync, o: { id: string; staffId: string; kind?: "TOTP" | "EMAIL"; to?: string | null }): void {
  const kind = o.kind ?? "TOTP";
  db.prepare(
    `INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, NULL)`,
  ).run(o.id, o.staffId, kind, kind === "TOTP" ? "v1.iv.ct" : null, kind === "EMAIL" ? "a@b.vn" : null, T1, o.to ?? null, T1, T1);
}
function addTrusted(db: DatabaseSync, o: { id: string; staffId: string; revoked?: boolean; expires?: string }): void {
  db.prepare(
    `INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, created_by, updated_at, updated_by, last_used_at, expires_at, revoked_at, revoke_reason)
     VALUES (?, ?, ?, 'iPhone', ?, NULL, ?, NULL, ?, ?, ?, ?)`,
  ).run(o.id, o.staffId, `bam-${o.id}`, T1, T1, T1, o.expires ?? XA, o.revoked ? T2 : null, o.revoked ? "ngung" : null);
}
const boHan = (db: DatabaseSync, id: string) => db.prepare("UPDATE staff SET mfa_grace_until = NULL, mfa_enroll_until = NULL WHERE id = ?").run(id);

test("R-AUT-MFA-1/2/3/4: đúng một kiểm mỗi mã, mức fail", () => {
  for (const c of ["R-AUT-MFA-1", "R-AUT-MFA-2", "R-AUT-MFA-3", "R-AUT-MFA-4"]) assert.equal(one(c).level, "fail", c);
});

// R-AUT-MFA-4 (ADR-0074 điều 7; Phần C Task 4): tài khoản giữ Quản trị / Toàn quyền / Kế toán không có yếu tố EMAIL sống. Đường API giữ (409 khi bật; lô đổi
// quyền / vai kết thúc email) — chỉ dữ liệu sửa tay mới đỏ.
const quyenThem = (db: DatabaseSync, staffId: string, code: string) =>
  db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`p-${staffId}-${code}`, staffId, code, T1, T1, T1);

test("R-AUT-MFA-4: yếu tố EMAIL sống của tài khoản giữ ADMIN / SUPER_ADMIN / ACCOUNTING là vi phạm (đếm theo tài khoản, kể cả đã ngưng); TOTP, email đã kết thúc, quyền đã đóng, quyền thường không tính", () => {
  const db = build();
  addFactor(db, { id: "e-an", staffId: "s-an", kind: "EMAIL" }); // Bán hàng có email → đúng luật
  addFactor(db, { id: "t-admin", staffId: "s-admin" }); // Quản trị có TOTP → đúng luật
  addFactor(db, { id: "e-admin-cu", staffId: "s-admin", kind: "EMAIL", to: T2 }); // email đã kết thúc (lô đổi quyền) → không tính
  assert.equal(violations(db, one("R-AUT-MFA-4")), 0);
  addFactor(db, { id: "e-admin", staffId: "s-admin", kind: "EMAIL" });
  assert.equal(violations(db, one("R-AUT-MFA-4")), 1, "Quản trị có email sống");
  quyenThem(db, "s-an", "ACCOUNTING");
  assert.equal(violations(db, one("R-AUT-MFA-4")), 2, "được cấp Kế toán bằng SQL tay mà email còn sống");
  db.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE id = 'p-s-an-ACCOUNTING'").run(T2);
  assert.equal(violations(db, one("R-AUT-MFA-4")), 1, "quyền Kế toán đã đóng không tính");
  addFactor(db, { id: "e-binh", staffId: "s-binh", kind: "EMAIL" });
  quyenThem(db, "s-binh", "SUPER_ADMIN");
  assert.equal(violations(db, one("R-AUT-MFA-4")), 2, "tài khoản đã ngưng vẫn tính: kích hoạt lại sẽ mang dòng lệch về");
  quyenThem(db, "s-admin", "ACCOUNTING");
  assert.equal(violations(db, one("R-AUT-MFA-4")), 2, "đếm theo tài khoản, không theo dòng quyền");
});

test("R-AUT-MFA-4: danh sách quyền trong SQL khớp ĐÚNG các quyền mà allowedFactors không cho EMAIL (thêm quyền lớn mới mà quên kiểm này → đỏ)", () => {
  const m = one("R-AUT-MFA-4").sql.match(/permission_code IN \(([^)]*)\)/);
  assert.ok(m, "kiểm phải liệt kê quyền lớn bằng permission_code IN (…)");
  const khongEmail = PERMISSION_CODES.filter((p) => !allowedFactors([p]).includes("EMAIL"));
  assert.ok(khongEmail.length >= 3, "chống rỗng");
  assert.deepEqual(m[1]!.split(",").map((x) => x.trim().replace(/'/g, "")).sort(), [...khongEmail].sort());
});

test("R-AUT-MFA-1: tài khoản NỘI BỘ đang hoạt động không yếu tố sống, không ân hạn, không cửa sổ bật lại là vi phạm; có một trong ba thì không", () => {
  const db = build(); // migration 0101 đặt ân hạn cho s-admin, s-an, s-cuu, s-lai (đang hoạt động, có quyền nội bộ)
  assert.equal(violations(db, one("R-AUT-MFA-1")), 0);
  boHan(db, "s-an");
  assert.equal(violations(db, one("R-AUT-MFA-1")), 1);
  db.prepare("UPDATE staff SET mfa_enroll_until = ? WHERE id = 's-an'").run(T2);
  assert.equal(violations(db, one("R-AUT-MFA-1")), 0, "cửa sổ bật lại 24 giờ");
  boHan(db, "s-an");
  addFactor(db, { id: "f-an-cu", staffId: "s-an", to: T2 });
  assert.equal(violations(db, one("R-AUT-MFA-1")), 1, "yếu tố đã kết thúc không tính");
  addFactor(db, { id: "f-an", staffId: "s-an" });
  assert.equal(violations(db, one("R-AUT-MFA-1")), 0, "yếu tố sống");
  db.prepare("UPDATE staff SET mfa_grace_until = ? WHERE id = 's-cuu'").run("2020-01-01T00:00:00.000Z");
  assert.equal(violations(db, one("R-AUT-MFA-1")), 0, "ân hạn ĐÃ QUA vẫn là 'có hạn' (cổng đăng nhập chặn 403 — đúng luật, không phải lỗi dữ liệu)");
});

test("R-AUT-MFA-1: tài khoản đã ngưng, tài khoản chỉ quyền bên ngoài, tài khoản không còn quyền nào KHÔNG tính (khớp isInternal của auth)", () => {
  const db = build();
  boHan(db, "s-binh"); // đã ngưng
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
           ('s-dt', '', '0901000009', 'x', 'sales', 1, '${T1}'), ('s-tx', '', '0901000011', 'x', 'sales', 1, '${T1}'), ('s-rong', '', '0901000010', 'x', 'sales', 1, '${T1}')`);
  db.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES
           ('p-dt', 's-dt', 'PARTNER', '${T1}', '${T1}', '${T1}'), ('p-tx', 's-tx', 'DRIVER_PARTNER', '${T1}', '${T1}', '${T1}')`);
  assert.equal(violations(db, one("R-AUT-MFA-1")), 0);
  // Lai (SALES + PARTNER) là nội bộ: isInternal = có một quyền KHÔNG phải bên ngoài.
  assert.equal(isInternal(["SALES", "PARTNER"]), true);
  assert.equal(isInternal(["PARTNER", "DRIVER_PARTNER"]), false);
  assert.equal(isInternal([]), false);
  boHan(db, "s-lai");
  assert.equal(violations(db, one("R-AUT-MFA-1")), 1);
});

test("R-AUT-MFA-1: danh sách quyền bên ngoài trong SQL khớp ĐÚNG EXTERNAL_PERMISSIONS (thêm quyền bên ngoài mới mà quên kiểm này → đỏ)", () => {
  const m = one("R-AUT-MFA-1").sql.match(/NOT IN \(([^)]*)\)/);
  assert.ok(m, "kiểm phải liệt kê quyền bên ngoài bằng NOT IN (…)");
  assert.deepEqual(m[1]!.split(",").map((x) => x.trim().replace(/'/g, "")).sort(), [...EXTERNAL_PERMISSIONS].sort());
});

test("R-AUT-MFA-2: hai yếu tố SỐNG cùng loại của một người (chỉ mục aut_mfa_factor_one_live đã mất) là MỘT vi phạm; khác loại / đã kết thúc không tính", () => {
  const db = build();
  addFactor(db, { id: "f1", staffId: "s-an" });
  addFactor(db, { id: "f2", staffId: "s-an", kind: "EMAIL" });
  addFactor(db, { id: "f3", staffId: "s-an", to: T2 });
  assert.equal(violations(db, one("R-AUT-MFA-2")), 0);
  db.exec("DROP INDEX aut_mfa_factor_one_live");
  addFactor(db, { id: "f4", staffId: "s-an" });
  addFactor(db, { id: "f5", staffId: "s-an" });
  assert.equal(violations(db, one("R-AUT-MFA-2")), 1, "đếm theo (người, loại), không theo dòng");
});

test("R-AUT-MFA-3: máy được tin chưa thu hồi của tài khoản đã ngưng là vi phạm (kể cả đã quá hạn); đã thu hồi / tài khoản đang hoạt động không tính", () => {
  const db = build();
  addTrusted(db, { id: "t-an", staffId: "s-an" });
  addTrusted(db, { id: "t-binh-cu", staffId: "s-binh", revoked: true });
  assert.equal(violations(db, one("R-AUT-MFA-3")), 0);
  addTrusted(db, { id: "t-binh", staffId: "s-binh", expires: T2 });
  assert.equal(violations(db, one("R-AUT-MFA-3")), 1, "lô ngưng thu hồi mọi máy chưa thu hồi, không lọc hạn");
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
  db.exec("DROP TRIGGER pty_person_document_next_ins"); // 0108 chặn cùng lỗi ở trigger; bài dựng dữ liệu vi phạm nên gỡ cả hai
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

test("R-PD-1 + COT_N3_NHAT_KY (Hiến chương 5.20): tập khoá = mọi cột BẢNG hạng N3 của sổ dữ liệu; kiểm được giao có thật; cột giao R-PD-1 có trong câu SQL", () => {
  const sd = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8")) as { tables: { name: string }[]; hangDuLieu: Record<string, Record<string, string>> };
  const bang = new Set(sd.tables.map((t) => t.name));
  const n3 = Object.entries(sd.hangDuLieu)
    .filter(([o]) => bang.has(o))
    .flatMap(([o, c]) => Object.entries(c).filter(([, h]) => h === "N3").map(([k]) => `${o}.${k}`))
    .sort();
  assert.deepEqual(Object.keys(COT_N3_NHAT_KY).sort(), n3, "cột N3 mới phải có dòng ở COT_N3_NHAT_KY (scripts/audit-checks.mjs)");
  const pd = one("R-PD-1");
  assert.equal(pd.level, "warn-unless-strict");
  assert.match(pd.note ?? "", /dữ liệu cá nhân/);
  for (const [cot, v] of Object.entries(COT_N3_NHAT_KY)) {
    one(v.kiem);
    if (v.kiem !== "R-PD-1") continue;
    const [b, c] = cot.split(".");
    assert.ok(pd.sql.includes(`FROM ${b} x WHERE x.${c} IS NOT NULL`), `${cot} chưa có trong câu R-PD-1`);
  }
});

test("R-PD-1: nơi cấp giấy tờ người lọt nhật ký → 1; nhật ký chỉ có tên loại, ngày → 0", () => {
  const c = one("R-PD-1");
  const db = build();
  const id = giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  db.prepare("UPDATE pty_person_document SET issued_place = ? WHERE id = ?").run("NOI CAP DANH DAU 77", id);
  const log = (lid: string, detail: string) =>
    db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_document_added', 'party', 'pty-s-an', ?, ?)").run(lid, detail, T1);
  log("l-1", "Căn cước công dân (CCCD), hết hạn 2030-01-01");
  assert.equal(violations(db, c), 0);
  log("l-2", "nơi cấp NOI CAP DANH DAU 77");
  assert.equal(violations(db, c), 1);
});

function toChucMoi(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, T1, T1);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, T1, T1);
  return id;
}
function giayToToChuc(db: DatabaseSync, o: { id: string; party: string; type?: string; key?: string | null; truoc?: string }): string {
  const type = o.type ?? "GPKD";
  const key = o.key === undefined ? `42000${o.id.length}0000` : o.key;
  db.prepare(
    `INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, previous_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(o.id, o.party, type, key, key, o.truoc ?? null, T1, T1);
  return o.id;
}

test("R-PD-1: số GPKD của tổ chức viết cách quãng (dấu cách, gạch, chấm) lọt nhật ký → 1; nhật ký chỉ có tên loại → 0 (chuanHoa của number_key)", () => {
  const c = one("R-PD-1");
  const db = build();
  const o = toChucMoi(db, "o-pd1");
  giayToToChuc(db, { id: "gpd-1", party: o, key: "4201234567" });
  const log = (lid: string, detail: string) =>
    db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES (?, 'party_document_added', 'party', 'o-pd1', ?, ?)").run(lid, detail, T1);
  log("pd1-a", "Giấy chứng nhận đăng ký kinh doanh (GPKD), hết hạn 2030-01-01");
  assert.equal(violations(db, c), 0);
  log("pd1-b", "số 420 123-4567");
  assert.equal(violations(db, c), 1);
});

test("R-PTY-7 (ADR-0122 đ2): một số GPKD thuộc đúng một tổ chức — gia hạn cùng số của chính tổ chức → 0; hai tổ chức cùng số (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-7");
  assert.equal(c.level, "fail");
  const db = build();
  const a = toChucMoi(db, "o-a");
  const b = toChucMoi(db, "o-b");
  const a1 = giayToToChuc(db, { id: "ga-1", party: a, key: "4201234567" });
  giayToToChuc(db, { id: "ga-2", party: a, key: "4201234567", truoc: a1 });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_organization_document_gpkd_one_org_ins");
  giayToToChuc(db, { id: "gb-1", party: b, key: "4201234567" });
  assert.equal(violations(db, c), 1);
});

test("R-PTY-8 (ADR-0122 đ2): dòng gia hạn giấy tờ tổ chức cùng tổ chức, cùng loại; tối đa một dòng gia hạn chưa huỷ — nối lệch (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-8");
  assert.equal(c.level, "fail");
  const db = build();
  const a = toChucMoi(db, "o-a");
  const b = toChucMoi(db, "o-b");
  const a1 = giayToToChuc(db, { id: "ga-1", party: a, type: "TRANSPORT", key: null });
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_organization_document_renew_ins");
  giayToToChuc(db, { id: "gb-1", party: b, type: "TRANSPORT", key: null, truoc: a1 });
  assert.equal(violations(db, c), 1);
});

test("R-PTY-9 (ADR-0122 đ3): mỗi dòng xác minh trỏ đúng dòng của đúng hồ sơ — đúng → 0; trỏ giấy tờ của hồ sơ khác (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-9");
  assert.equal(c.level, "fail");
  const db = build();
  const gd = giayToNguoi(db, { party: "pty-s-an", key: "079888777666" });
  const v = (id: string, party: string) =>
    db.prepare(
      "INSERT INTO pty_verification (id, party_id, target_kind, target_id, outcome, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'PERSON_DOCUMENT', ?, 'DA_XAC_MINH', ?, 's-admin', ?, 's-admin')",
    ).run(id, party, gd, T1, T1);
  v("v-1", "pty-s-an");
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_verification_target_ins");
  v("v-2", "pty-xa");
  assert.equal(violations(db, c), 1);
});

test("R-PTY-10 (ADR-0122 đ1): liên hệ ADDRESS chỉ ở hồ sơ cá nhân — người → 0; tổ chức (trigger bị gỡ) → 1", () => {
  const c = one("R-PTY-10");
  assert.equal(c.level, "fail");
  const db = build();
  const o = toChucMoi(db, "o-dc");
  const lh = (id: string, party: string) =>
    db.prepare(
      "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, 'ADDRESS', '12 Trần Phú', '12 trần phú', 1, '2026-10-16', ?, ?)",
    ).run(id, party, T1, T1);
  lh("dc-1", "pty-s-an");
  assert.equal(violations(db, c), 0);
  db.exec("DROP TRIGGER pty_contact_point_address_person_ins");
  lh("dc-2", o);
  assert.equal(violations(db, c), 1);
});

const NGUOI_T = (db: DatabaseSync, id: string) => {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, T1, T1);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, T1, T1);
};
const TEP_T = (db: DatabaseSync, id: string, party: string, k: number, createdAt = T1) =>
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 10, ?, ?, 's', ?, 's')`).run(id, party, `pty/${String(k).padStart(32, "0")}`, "c".repeat(64), createdAt, createdAt);

test("R-PTY-11 (ADR-0123 đ4): mỗi tệp hồ sơ có ít nhất một dòng nối — có nối → 0; tệp mồ côi → 1", () => {
  const c = one("R-PTY-11");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-tep");
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES ('g-tep', 'p-tep', 'HEALTH_CHECK', 'SKTEP1', 'SKTEP1', ?, ?)`).run(T1, T1);
  TEP_T(db, "t1", "p-tep", 1);
  db.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES ('t1', 'PERSON_DOCUMENT', 'g-tep', ?, 's', ?, 's')").run(T1, T1);
  assert.equal(violations(db, c), 0);
  TEP_T(db, "t2", "p-tep", 2);
  assert.equal(violations(db, c), 1);
});

test("R-PTY-12 (ADR-0123 đ6, Hiến chương 5.16): tệp chờ xoá khỏi kho hoặc tải dở dang quá 1 giờ — mức warn (thấy được, không chặn phát hành)", () => {
  const c = one("R-PTY-12");
  assert.equal(c.level, "warn");
  const db = build();
  NGUOI_T(db, "p-tep");
  const xaRoi = new Date(Date.now() - 2 * 3600e3).toISOString();
  TEP_T(db, "t-moi", "p-tep", 1, new Date().toISOString()); // tải dở dang VỪA tạo — chưa tính
  assert.equal(violations(db, c), 0);
  TEP_T(db, "t-do-dang", "p-tep", 2, xaRoi);                 // tải dở dang quá 1 giờ
  assert.equal(violations(db, c), 1);
  db.prepare("UPDATE pty_attachment SET stored_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 1, "chờ xoá khỏi kho");
  db.prepare("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0);
});

test("R-PTY-12 vòng đời 'tải lỗi': quyết xoá khi stored_at còn rỗng, rồi r2_deleted_at đã đặt → không còn cảnh báo", () => {
  const c = one("R-PTY-12");
  const db = build();
  NGUOI_T(db, "p-loi");
  const xaRoi = new Date(Date.now() - 2 * 3600e3).toISOString();
  TEP_T(db, "t-loi", "p-loi", 7, xaRoi);
  assert.equal(violations(db, c), 1, "dở dang quá 1 giờ");
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 't-loi'").run(xaRoi);
  assert.equal(violations(db, c), 1, "chờ xoá khỏi kho (stored_at vẫn rỗng)");
  db.prepare("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = 't-loi'").run(xaRoi);
  assert.equal(violations(db, c), 0, "đã xoá khỏi kho — hết cảnh báo dù stored_at rỗng");
});

test("R-FBK-1 (ADR-0144 đ5, Hiến chương 5.16): tệp kèm vé chờ xoá khỏi kho hoặc tải dở dang quá 1 giờ — mức warn; đã lưu / đã xoá khỏi kho / vừa tạo ⇒ không tính", () => {
  const c = one("R-FBK-1");
  assert.equal(c.level, "warn");
  const db = build();
  db.prepare(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at, team_id)
    VALUES ('v-tep', 1, 'QUESTION', 'NEW', 't', '{}', 's-an', '99999999-9999-4999-8999-999999999999', ?, ?, ?, 'fbk-team-ky-thuat')`).run(T1, T1, T1);
  db.prepare("INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at, team_id) VALUES ('m-tep', 'v-tep', 's-an', 'x', 0, ?, ?, 'fbk-team-ky-thuat')").run(T1, T1);
  const tep = (id: string, n: number, at: string) =>
    db.prepare(`INSERT INTO fbk_attachment (id, message_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'm-tep', ?, 'png', 3, ?, ?, 's-an', ?, 's-an')`).run(id, `fbk/${String(n).repeat(32)}`, String(n).repeat(64), at, at);
  const xaRoi = new Date(Date.now() - 2 * 3600e3).toISOString();
  tep("t-moi", 1, new Date().toISOString()); // tải dở dang VỪA tạo — chưa tính
  assert.equal(violations(db, c), 0);
  tep("t-do-dang", 2, xaRoi);
  assert.equal(violations(db, c), 1, "dở dang quá 1 giờ");
  db.prepare("UPDATE fbk_attachment SET stored_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0, "đã lưu");
  db.prepare("UPDATE fbk_attachment SET purged_at = ?, purge_reason = 'GO_TEP', content_hash = NULL WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 1, "đã gỡ, kho chưa xoá");
  db.prepare("UPDATE fbk_attachment SET r2_deleted_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0, "đã xoá khỏi kho");
});

test("R-PTY-13 (ADR-0124 đ3, Hiến chương 5.21): phiếu tự khai ĐANG CHỜ của người đã rút / chưa từng đồng ý phiên bản ghi trên phiếu — fail", () => {
  const c = one("R-PTY-13");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-tk");
  const at = "2026-10-17T03:00:00.000Z";
  db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol-tk', 1, 'thử', 'thử', ?, ?, 's', ?, 's')").run(at, at, at);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c1', 'p-tk', 'pol-tk', 'DONG_Y', ?, 's', ?, 's')").run(at, at);
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph1', 'p-tk', 'NGAY_SINH', 'pol-tk', '1990-01-01', 'CHO_XAC_MINH', ?, 's', ?, 's')`).run(at, at);
  assert.equal(violations(db, c), 0);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c2', 'p-tk', 'pol-tk', 'RUT', '2026-10-17T03:05:00.000Z', 's', '2026-10-17T03:05:00.000Z', 's')").run();
  assert.equal(violations(db, c), 1, "rút đồng ý mà phiếu vẫn chờ (route phải rút phiếu cùng lô)");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = '2026-10-17T03:05:00.000Z', decided_by = 's', updated_at = '2026-10-17T03:05:00.000Z' WHERE id = 'ph1'").run();
  assert.equal(violations(db, c), 0, "phiếu đã rút không tính");
});

test("R-PTY-13 hai chính sách: đồng ý phiên bản CŨ không cứu phiếu ghi phiên bản MỚI (và ngược lại đồng ý đúng phiên bản của phiếu thì sạch)", () => {
  const c = one("R-PTY-13");
  const db = build();
  NGUOI_T(db, "p-2c");
  const at = "2026-10-17T03:00:00.000Z";
  const at2 = "2026-10-17T03:05:00.000Z";
  for (const [id, v, t] of [["pol-1", 1, at], ["pol-2", 2, at2]] as const)
    db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'thử', 'thử', ?, ?, 's', ?, 's')").run(id, v, t, t, t);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c1', 'p-2c', 'pol-1', 'DONG_Y', ?, 's', ?, 's')").run(at, at);
  db.exec("DROP TRIGGER pty_self_submission_consent_ins"); // dựng trạng thái lỗi mà trigger đồng ý vẫn chặn được ở đường ghi thật
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph2', 'p-2c', 'NGAY_SINH', 'pol-2', '1990-01-01', 'CHO_XAC_MINH', ?, 's', ?, 's')`).run(at2, at2);
  assert.equal(violations(db, c), 1, "phiếu ghi pol-2 nhưng chỉ đồng ý pol-1");
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c2', 'p-2c', 'pol-2', 'DONG_Y', ?, 's', ?, 's')").run(at2, at2);
  assert.equal(violations(db, c), 0, "đã đồng ý đúng pol-2");
});

test("R-PTY-13 + trigger consent_ins (vòng sửa 2, M-4): hai quyết định CÙNG mili-giây — 'mới nhất' phân định bằng rowid (dòng chèn sau thắng), cả hai chiều", () => {
  const c = one("R-PTY-13");
  const db = build();
  NGUOI_T(db, "p-ms");
  // Chỉ mục pty_consent_party_ix (party_id, created_at) mang sẵn rowid và bị duyệt ngược, nên KHI CÓ nó, hoà mili-giây đã tự ra rowid giảm dần — bỏ vế rowid DESC
  // không bài nào thấy. Gỡ chỉ mục trong DB thử để thứ tự chỉ còn dựa vào ORDER BY của chính câu (đổi / bỏ chỉ mục sau này không làm lệch "mới nhất").
  db.exec("DROP INDEX pty_consent_party_ix");
  const at = "2026-10-17T03:00:00.000Z";
  db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol-ms', 1, 'thử', 'thử', ?, ?, 's', ?, 's')").run(at, at, at);
  const quyetDinh = (id: string, d: string) => db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, 'p-ms', 'pol-ms', ?, ?, 's', ?, 's')").run(id, d, at, at);
  const phieu = (id: string) => db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'p-ms', 'NGAY_SINH', 'pol-ms', '1990-01-01', 'CHO_XAC_MINH', ?, 's', ?, 's')`).run(id, at, at);
  quyetDinh("z-dong-y", "DONG_Y"); // mã chữ "z…" lớn hơn "a…" — bài không dựa vào thứ tự mã
  phieu("ph-ms");
  assert.equal(violations(db, c), 0);
  quyetDinh("a-rut", "RUT"); // CÙNG created_at với dòng đồng ý, chèn SAU ⇒ là quyết định mới nhất
  assert.equal(violations(db, c), 1, "rút cùng mili-giây, chèn sau ⇒ phiếu chờ là vi phạm");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's', updated_at = ? WHERE id = 'ph-ms'").run(at, at);
  assert.throws(() => phieu("ph-ms-2"), /self_submission_no_consent/, "trigger: rút cùng mili-giây, chèn sau ⇒ chặn phiếu mới");
  quyetDinh("m-dong-y-lai", "DONG_Y"); // đồng ý lại, vẫn cùng mili-giây ⇒ đồng ý thắng
  phieu("ph-ms-3");
  assert.equal(violations(db, c), 0, "đồng ý lại cùng mili-giây, chèn sau ⇒ phiếu chờ hợp lệ");
});

// ---- R-PTY-14/15/16 (ADR-0125, lát H-4 Gói 2): xác minh hồ sơ. Người khai = tài khoản s-an; người xác minh = s-admin (hai tài khoản có thật vì audit_log.staff_id có khoá ngoại).
const XM_AT = "2026-10-17T03:00:00.000Z";
const XM_AT2 = "2026-10-17T03:05:00.000Z";
/** Hồ sơ + chính sách + đồng ý + MỘT phiếu ngày sinh đang chờ do s-an khai. */
function phieuCho(db: DatabaseSync, party: string, id: string, gui = XM_AT): void {
  NGUOI_T(db, party);
  db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol-xm', 1, 'thử', 'thử', ?, ?, 's', ?, 's')").run(gui, gui, gui);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'pol-xm', 'DONG_Y', ?, 's', ?, 's')").run(`c-${id}`, party, gui, gui);
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'NGAY_SINH', 'pol-xm', '1990-01-01', 'CHO_XAC_MINH', ?, 's-an', ?, 's-an')`).run(id, party, gui, gui);
}
const chapNhan = (db: DatabaseSync, id: string, by: string, at = XM_AT2) =>
  db.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = ?, updated_at = ? WHERE id = ?").run(at, by, at, id);
const xacMinh = (db: DatabaseSync, id: string, party: string, by: string, cham: 0 | 1, at = XM_AT2) =>
  db.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, verifier_touched_account, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'ATTRIBUTE', 'NGAY_SINH', 'DA_XAC_MINH', ?, ?, ?, ?, ?)`).run(id, party, cham, at, by, at, by);
const nhatKyXm = (db: DatabaseSync, id: string, actor: string, action: string, at: string) =>
  db.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, 'staff', 's-an', NULL, ?)").run(id, actor, action, at);

test("R-PTY-14 (ADR-0125, ruling R3 kế hoạch H-4): phiếu ĐÃ CHẤP NHẬN thiếu dòng xác minh khớp (mã, kết quả, người, lúc) — fail", () => {
  const c = one("R-PTY-14");
  assert.equal(c.level, "fail");
  const db = build();
  phieuCho(db, "p-14", "ph-14");
  assert.equal(violations(db, c), 0, "phiếu còn chờ không tính");
  chapNhan(db, "ph-14", "s-admin");
  assert.equal(violations(db, c), 1, "chấp nhận mà không ghi dòng xác minh");
  xacMinh(db, "ph-14", "p-14", "s-admin", 0, "2026-10-17T03:06:00.000Z");
  assert.equal(violations(db, c), 1, "dòng xác minh lệch lúc");
  const db2 = build();
  phieuCho(db2, "p-14", "ph-14");
  chapNhan(db2, "ph-14", "s-admin");
  xacMinh(db2, "ph-14", "p-14", "s-admin", 0);
  assert.equal(violations(db2, c), 0, "khớp mã, người, lúc");
  const lech = (ten: string, nguoi: string, ketQua: string) => {
    const d = build();
    phieuCho(d, "p-14", "ph-14");
    chapNhan(d, "ph-14", "s-admin");
    d.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
      VALUES ('ph-14', 'p-14', 'ATTRIBUTE', 'NGAY_SINH', ?, ?, 0, ?, ?, ?, ?)`).run(ketQua, ketQua === "TU_CHOI" ? "KHONG_KHOP" : null, XM_AT2, nguoi, XM_AT2, nguoi);
    assert.equal(violations(d, c), 1, ten);
  };
  lech("dòng xác minh của người KHÁC người quyết", "s-binh", "DA_XAC_MINH");
  lech("dòng xác minh có kết quả TU_CHOI", "s-admin", "TU_CHOI");
  lech("dòng xác minh có kết quả CAN_XAC_MINH_LAI", "s-admin", "CAN_XAC_MINH_LAI");
});

test("R-PTY-15 (ADR-0125 đ5 vế a): phiếu chấp nhận / từ chối bởi CHÍNH người khai — fail (dựng bằng cách gỡ trigger trong DB thử)", () => {
  const c = one("R-PTY-15");
  assert.equal(c.level, "fail");
  const db = build();
  phieuCho(db, "p-15", "ph-15");
  assert.equal(violations(db, c), 0);
  assert.throws(() => chapNhan(db, "ph-15", "s-an"), /self_submission_decider_is_author/, "đường ghi thật bị trigger chặn");
  db.exec("DROP TRIGGER pty_self_submission_decider_not_author");
  chapNhan(db, "ph-15", "s-an");
  assert.equal(violations(db, c), 1);
  // TU_CHOI bởi chính người khai (phiếu thứ hai, loại khác để không vướng "một phiếu chờ")
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, address_value, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph-15b', 'p-15', 'DIA_CHI', 'pol-xm', '1 Đường Thử', 'CHO_XAC_MINH', ?, 's-an', ?, 's-an')`).run(XM_AT, XM_AT);
  db.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_KHOP_GIAY_TO', decided_at = ?, decided_by = 's-an', updated_at = ? WHERE id = 'ph-15b'").run(XM_AT2, XM_AT2);
  assert.equal(violations(db, c), 2, "từ chối bởi chính người khai cũng tính");
  // người KHÁC quyết thì không tính
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, document_type_code, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph-15c', 'p-15', 'GIAY_TO', 'pol-xm', 'HEALTH_CHECK', 'CHO_XAC_MINH', ?, 's-an', ?, 's-an')`).run(XM_AT, XM_AT);
  db.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_KHOP_GIAY_TO', decided_at = ?, decided_by = 's-admin', updated_at = ? WHERE id = 'ph-15c'").run(XM_AT2, XM_AT2);
  assert.equal(violations(db, c), 2, "người khác từ chối: không thêm vi phạm");
});

test("R-PTY-16 (ADR-0125 đ5 vế b, c): dòng xác minh KHÔNG mang cờ mà người xác minh từng tạo / chạm tài khoản người khai — fail; chạm SAU lúc xác minh thì sạch", () => {
  const c = one("R-PTY-16");
  assert.equal(c.level, "fail");
  const dung = (): DatabaseSync => { const d = build(); phieuCho(d, "p-16", "ph-16"); chapNhan(d, "ph-16", "s-admin"); return d; };
  // sạch: không có sự kiện nào
  let db = dung(); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 0, "không chạm tài khoản");
  // lách: đặt lại PIN TRƯỚC lúc xác minh mà cờ 0
  db = dung(); nhatKyXm(db, "n1", "s-admin", "pin_reset", XM_AT); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 1, "đặt lại PIN trước, cờ 0");
  // đúng cờ 1 thì sạch
  db = dung(); nhatKyXm(db, "n1", "s-admin", "pin_reset", XM_AT); xacMinh(db, "ph-16", "p-16", "s-admin", 1);
  assert.equal(violations(db, c), 0, "đã mang cờ");
  // ca bắt buộc: cùng người đặt lại PIN SAU lúc xác minh ⇒ không đỏ giả
  db = dung(); xacMinh(db, "ph-16", "p-16", "s-admin", 0); nhatKyXm(db, "n2", "s-admin", "pin_reset", "2026-10-17T04:00:00.000Z");
  assert.equal(violations(db, c), 0, "đặt lại PIN SAU khi đã xác minh không biến dòng cũ thành lách");
  // người KHÁC chạm thì không tính
  db = dung(); nhatKyXm(db, "n3", "s-binh", "pin_reset", XM_AT); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 0, "người khác chạm");
  // cửa sổ 30 ngày: chạm trong 30 ngày trước lúc gửi phiếu ⇒ đỏ; chạm cũ hơn 30 ngày ⇒ sạch; tạo tài khoản (vĩnh viễn) cũ vẫn đỏ
  db = dung(); nhatKyXm(db, "n4", "s-admin", "passkey_removed", "2026-10-01T00:00:00.000Z"); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 1, "chạm tầng 30 ngày, trong cửa sổ");
  db = dung(); nhatKyXm(db, "n5", "s-admin", "passkey_removed", "2026-08-01T00:00:00.000Z"); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 0, "chạm tầng 30 ngày, quá cũ");
  db = dung(); nhatKyXm(db, "n6", "s-admin", "staff_created", "2026-01-01T00:00:00.000Z"); xacMinh(db, "ph-16", "p-16", "s-admin", 0);
  assert.equal(violations(db, c), 1, "tạo tài khoản là vĩnh viễn");
  // ---- vòng sửa 1 (I-1): ghim "vĩnh viễn", biên 30 ngày, mốc là LÚC GỬI phiếu. Phiếu gửi G, xác minh V = G + 10 ngày.
  const G = "2026-10-07T03:00:00.000Z";
  const V = "2026-10-17T03:05:00.000Z";
  const ms = (iso: string, deltaMs: number) => new Date(Date.parse(iso) + deltaMs).toISOString();
  const NGAY = 86_400_000;
  const xa = (): DatabaseSync => { const d = build(); phieuCho(d, "p-16", "ph-16", G); chapNhan(d, "ph-16", "s-admin", V); return d; };
  db = xa(); nhatKyXm(db, "v1", "s-admin", "pin_reset", ms(G, -400 * NGAY)); xacMinh(db, "ph-16", "p-16", "s-admin", 0, V);
  assert.equal(violations(db, c), 1, "đặt lại PIN 400 ngày trước lúc gửi vẫn là VĨNH VIỄN");
  db = xa(); nhatKyXm(db, "v2", "s-admin", "login_unlocked", ms(G, -30 * NGAY)); xacMinh(db, "ph-16", "p-16", "s-admin", 0, V);
  assert.equal(violations(db, c), 1, "đúng biên G-30 ngày: vẫn trong cửa sổ");
  db = xa(); nhatKyXm(db, "v3", "s-admin", "login_unlocked", ms(G, -30 * NGAY - 1)); xacMinh(db, "ph-16", "p-16", "s-admin", 0, V);
  assert.equal(violations(db, c), 0, "sớm hơn biên 1 mili-giây: ngoài cửa sổ");
  db = xa(); nhatKyXm(db, "v4", "s-admin", "login_unlocked", ms(G, -25 * NGAY)); xacMinh(db, "ph-16", "p-16", "s-admin", 0, V);
  assert.equal(violations(db, c), 1, "sự kiện giữa G-30 và V-30: mốc cửa sổ là lúc GỬI (G), không phải lúc xác minh (V)");
  // vòng sửa 1, m-9 (ruling Q2): kích hoạt lại tài khoản là tầng CUA_SO_30 — xác minh cờ 0 trong cửa sổ là lách
  db = xa(); nhatKyXm(db, "v5", "s-admin", "staff_reactivated", ms(G, -5 * NGAY)); xacMinh(db, "ph-16", "p-16", "s-admin", 0, V);
  assert.equal(violations(db, c), 1, "kích hoạt lại trong 30 ngày trước lúc gửi, cờ 0");
});

// ---- R-PTY-17..20 (ADR-0126 đ3, đ7, đ8; lát H-5 Gói 2): xoá / ẩn danh hoá. Dòng vi phạm dựng bằng INSERT thẳng (trigger ẩn danh chỉ chặn UPDATE).
const XA_AT = "2026-10-17T03:00:00.000Z";
const XA_QUYET = "2026-10-17T05:00:00.000Z";
const dauXoa = (id: string) => "XOA" + id.replace(/-/g, "").toUpperCase();
function giayToXa(db: DatabaseSync, id: string, party: string, x: { so?: string | null; khoa?: string | null; noi?: string | null; erased?: string | null; at?: string } = {}): void {
  const so = x.so === undefined ? dauXoa(id) : x.so;
  const khoa = x.khoa === undefined ? so : x.khoa;
  db.exec("DROP TRIGGER IF EXISTS pty_person_document_erased_ins"); // dựng dòng VI PHẠM: 0108 chặn INSERT mang sẵn erased_at, bài cần dòng như vậy để thử bất biến
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, erased_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CCCD', ?, ?, ?, ?, ?, 's', ?, 's')`).run(id, party, so, khoa, x.noi ?? null, x.erased === undefined ? XA_QUYET : x.erased, x.at ?? XA_AT, x.at ?? XA_AT);
}
function phieuXoaXong(db: DatabaseSync, id: string, party: string, offsite: string | null = null, quyet = XA_QUYET): void {
  // Phiếu mới luôn ở CHO_XU_LY (trigger), nên dựng đúng đường: gửi rồi người KHÁC thực hiện.
  db.prepare(`INSERT INTO pty_erasure_request (id, party_id, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CHO_XU_LY', ?, 's-an', ?, 's-an')`).run(id, party, XA_AT, XA_AT);
  db.prepare(`UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN', decided_at = ?, decided_by = 's-admin', name_kept = 0, retained_codes = 'HOA_DON', offsite_at = ?, updated_at = ? WHERE id = ?`)
    .run(quyet, offsite, quyet, id);
}
/** Chính sách + đồng ý để chèn được phiếu tự khai của hồ sơ. */
function dongYXa(db: DatabaseSync, party: string): void {
  if (!db.prepare("SELECT 1 FROM pty_privacy_policy WHERE id = 'pol-xa'").get())
    db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol-xa', 1, 'thử', 'thử', ?, ?, 's', ?, 's')").run(XA_AT, XA_AT, XA_AT);
  db.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'pol-xa', 'DONG_Y', ?, 's', ?, 's')").run(`cx-${party}`, party, XA_AT, XA_AT);
}

test("R-PTY-17 (ADR-0126 đ3, Hiến chương 5.24): dòng đã ẩn danh mà số không phải dấu hoặc còn nơi cấp / ngày sinh / địa chỉ thật — fail", () => {
  const c = one("R-PTY-17");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-17");
  assert.equal(violations(db, c), 0, "chưa có dòng");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a1", "p-17");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a2", "p-17", { so: "079000000111", erased: null }); // CHƯA ẩn danh: số thật là bình thường
  assert.equal(violations(db, c), 0, "dòng đã ẩn danh đúng dạng + dòng chưa ẩn danh");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a3", "p-17", { so: "079000000222" });
  assert.equal(violations(db, c), 1, "đã ẩn danh mà còn số thật");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a4", "p-17", { noi: "Nơi cấp thật" });
  assert.equal(violations(db, c), 2, "đã ẩn danh mà còn nơi cấp");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a5", "p-17", { so: dauXoa("0b1e5c2a-0000-4000-8000-0000000000a1") });
  assert.equal(violations(db, c), 3, "dấu của DÒNG KHÁC không phải dấu của dòng này");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000a6", "p-17", { khoa: "079000000444" });
  assert.equal(violations(db, c), 4, "số đúng dấu nhưng khoá số (N3) còn thật");
  // phiếu tự khai
  const db2 = build();
  // Phiếu mới luôn ở CHO_XAC_MINH; cột erased_at đặt thẳng lúc chèn (trigger ẩn danh chỉ chặn UPDATE) — R-PTY-17 không xét trạng thái.
  // Mỗi phiếu một hồ sơ riêng (luật một phiếu chờ mỗi loại).
  const phieuXa = (id: string, cot: string, giaTri: string, kind: string) => {
    NGUOI_T(db2, `p-${id}`);
    dongYXa(db2, `p-${id}`);
    db2.exec("DROP TRIGGER IF EXISTS pty_self_submission_erased_ins"); // dựng dòng VI PHẠM (xem giayToXa)
    db2.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, ${cot}, status, erased_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, 'pol-xa', ?, 'CHO_XAC_MINH', ?, ?, 's-an', ?, 's-an')`).run(id, `p-${id}`, kind, giaTri, XA_QUYET, XA_AT, XA_AT);
  };
  phieuXa("ph-ok-1", "birth_date", "1900-01-01", "NGAY_SINH");
  phieuXa("ph-ok-2", "address_value", "Đã xoá", "DIA_CHI");
  assert.equal(violations(db2, c), 0, "phiếu đã ẩn danh đúng dạng");
  phieuXa("ph-bad-1", "birth_date", "1990-05-06", "NGAY_SINH");
  assert.equal(violations(db2, c), 1, "phiếu đã ẩn danh còn ngày sinh thật");
  phieuXa("ph-bad-2", "address_value", "1 Đường Thật", "DIA_CHI");
  assert.equal(violations(db2, c), 2, "phiếu đã ẩn danh còn địa chỉ thật");
  {
    NGUOI_T(db2, "p-gt");
    dongYXa(db2, "p-gt");
    const gt = "0b1e5c2a-0000-4000-8000-0000000000a7";
    db2.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, document_type_code, document_number, number_key, status, erased_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'p-gt', 'GIAY_TO', 'pol-xa', 'CCCD', ?, '079000000555', 'CHO_XAC_MINH', ?, ?, 's-an', ?, 's-an')`).run(gt, dauXoa(gt), XA_QUYET, XA_AT, XA_AT);
    assert.equal(violations(db2, c), 3, "phiếu giấy tờ đã ẩn danh: số đúng dấu nhưng khoá số còn thật");
  }
});

test("R-PTY-18 (ADR-0126 đ3): phiếu ĐÃ THỰC HIỆN mà hồ sơ (và hồ sơ đã gộp vào nó) còn dữ liệu tạo TRƯỚC lúc thực hiện chưa ẩn danh — fail", () => {
  const c = one("R-PTY-18");
  assert.equal(c.level, "fail");
  const sach = (): DatabaseSync => { const d = build(); NGUOI_T(d, "p-18"); phieuXoaXong(d, "e-18", "p-18"); return d; };
  let db = sach();
  assert.equal(violations(db, c), 0, "hồ sơ không còn dữ liệu nào");
  // phiếu CHƯA thực hiện không tính
  db = build(); NGUOI_T(db, "p-18");
  db.prepare("INSERT INTO pty_erasure_request (id, party_id, status, created_at, created_by, updated_at, updated_by) VALUES ('e-cho', 'p-18', 'CHO_XU_LY', ?, 's-an', ?, 's-an')").run(XA_AT, XA_AT);
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b1", "p-18", { so: "079000000111", erased: null });
  assert.equal(violations(db, c), 0, "phiếu đang chờ");
  // giấy tờ chưa ẩn danh, tạo trước lúc thực hiện
  db = sach(); giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b2", "p-18", { so: "079000000111", erased: null });
  assert.equal(violations(db, c), 1, "giấy tờ tạo trước, chưa ẩn danh");
  db = sach(); giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b3", "p-18"); // đã ẩn danh
  assert.equal(violations(db, c), 0, "giấy tờ đã ẩn danh");
  db = sach(); giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b4", "p-18", { so: "079000000111", erased: null, at: "2026-10-17T06:00:00.000Z" });
  assert.equal(violations(db, c), 0, "giấy tờ khai SAU lúc thực hiện: không tính");
  // giấy tờ của hồ sơ đã gộp vào hồ sơ có phiếu
  // Trigger 0108 chặn gộp vào hồ sơ đã có phiếu, nên gộp TRƯỚC khi phiếu được thực hiện (đúng thứ tự thật: phiếu chỉ đến sau khi đã gộp).
  db = build(); NGUOI_T(db, "p-18"); NGUOI_T(db, "p-phu");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b5", "p-phu", { so: "079000000111", erased: null });
  phieuXoaXong(db, "e-18", "p-18");
  assert.equal(violations(db, c), 0, "hồ sơ phụ chưa gộp: không thuộc phiếu");
  db = build(); NGUOI_T(db, "p-18"); NGUOI_T(db, "p-phu");
  giayToXa(db, "0b1e5c2a-0000-4000-8000-0000000000b5", "p-phu", { so: "079000000111", erased: null });
  db.prepare("UPDATE pty_party SET merged_into_id = 'p-18', merged_at = ?, active = 0 WHERE id = 'p-phu'").run(XA_AT);
  phieuXoaXong(db, "e-18", "p-18");
  assert.equal(violations(db, c), 1, "hồ sơ phụ đã gộp vào hồ sơ có phiếu mà giấy tờ chưa ẩn danh");
  // ngày sinh của hồ sơ phụ đã gộp vào hồ sơ có phiếu (I-3)
  db = build(); NGUOI_T(db, "p-18"); NGUOI_T(db, "p-phu");
  db.prepare("UPDATE pty_person SET birth_date = '1990-05-06', updated_at = ? WHERE party_id = 'p-phu'").run(XA_AT);
  db.prepare("UPDATE pty_party SET merged_into_id = 'p-18', merged_at = ?, active = 0 WHERE id = 'p-phu'").run(XA_AT);
  phieuXoaXong(db, "e-18", "p-18");
  assert.equal(violations(db, c), 1, "ngày sinh của hồ sơ phụ đã gộp, chưa xoá");
  // liên hệ
  db = sach();
  const lienHe = (v: string, vn: string, den: string | null) =>
    db.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
      VALUES (?, 'p-18', 'PHONE', ?, ?, '2026-01-01', ?, ?, 's', ?, 's')`).run(`lh-${++n18}`, v, vn, den, XA_AT, XA_AT);
  lienHe("Đã xoá", "XOA", "2026-10-17");
  assert.equal(violations(db, c), 0, "liên hệ đã ẩn danh đúng dạng và đã đóng");
  lienHe("0901000009", "XOA", "2026-10-17");
  assert.equal(violations(db, c), 1, "liên hệ còn giá trị thật");
  lienHe("Đã xoá", "0901000009", "2026-10-17");
  assert.equal(violations(db, c), 1, "một phiếu chỉ đếm một lần dù nhiều dòng sai");
  db = sach(); lienHe("Đã xoá", "XOA", null);
  assert.equal(violations(db, c), 1, "liên hệ ẩn danh nhưng còn mở");
  // ngày sinh
  db = sach();
  db.prepare("UPDATE pty_person SET birth_date = '1990-05-06', updated_at = ? WHERE party_id = 'p-18'").run(XA_AT);
  assert.equal(violations(db, c), 1, "ngày sinh còn, cập nhật trước lúc thực hiện");
  db.prepare("UPDATE pty_person SET updated_at = ? WHERE party_id = 'p-18'").run("2026-10-17T06:00:00.000Z");
  assert.equal(violations(db, c), 0, "ngày sinh khai SAU lúc thực hiện: không tính");
  // ảnh
  db = sach(); TEP_T(db, "t-18", "p-18", 18, XA_AT);
  assert.equal(violations(db, c), 1, "ảnh chưa quyết xoá");
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'YEU_CAU_XOA', content_hash = NULL, updated_at = ? WHERE id = 't-18'").run(XA_QUYET, XA_QUYET);
  assert.equal(violations(db, c), 0, "ảnh đã quyết xoá");
  // phiếu tự khai
  db = sach();
  dongYXa(db, "p-18");
  db.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, status, created_at, created_by, updated_at, updated_by)
    VALUES ('ph-18', 'p-18', 'NGAY_SINH', 'pol-xa', '1900-01-01', 'CHO_XAC_MINH', ?, 's-an', ?, 's-an')`).run(XA_AT, XA_AT);
  assert.equal(violations(db, c), 1, "phiếu tự khai chưa ẩn danh");
  db.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = 's-an', updated_at = ? WHERE id = 'ph-18'").run(XA_QUYET, XA_QUYET);
  assert.equal(violations(db, c), 1, "rút phiếu chưa phải ẩn danh");
  db.prepare("UPDATE pty_self_submission SET erased_at = ?, updated_at = ? WHERE id = 'ph-18'").run(XA_QUYET, XA_QUYET);
  assert.equal(violations(db, c), 0, "phiếu tự khai đã ẩn danh");
});
let n18 = 0;

test("R-PTY-19 (ADR-0126 đ7; Hiến chương 5.16): phiếu đã thực hiện quá 1 giờ mà chưa chép bản ngoài D1 — cảnh báo, không chặn", () => {
  const c = one("R-PTY-19");
  assert.equal(c.level, "warn");
  const db = build();
  NGUOI_T(db, "p-19");
  const gio = (ph: number) => new Date(Date.now() - ph * 3_600_000).toISOString();
  const them = (id: string, party: string, decided: string, offsite: string | null) => { NGUOI_T(db, party); phieuXoaXong(db, id, party, offsite, decided); };
  assert.equal(violations(db, c), 0);
  them("e-moi", "p-19a", gio(0.2), null);
  assert.equal(violations(db, c), 0, "mới thực hiện, chưa quá 1 giờ");
  them("e-cu", "p-19b", gio(2), null);
  assert.equal(violations(db, c), 1, "quá 1 giờ chưa chép bản ngoài");
  them("e-da", "p-19c", gio(2), gio(1));
  assert.equal(violations(db, c), 1, "đã chép bản ngoài thì không tính");
});

test("R-PTY-20 (ADR-0126 đ8): phiên của tài khoản gắn hồ sơ có phiếu ĐÃ THỰC HIỆN, cấp trước lúc thực hiện, còn IP hoặc User-Agent — fail", () => {
  const c = one("R-PTY-20");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-20");
  db.prepare("UPDATE staff SET party_id = 'p-20' WHERE id = 's-an'").run();
  const phien = (id: string, ip: string | null, ua: string | null, at: string) =>
    db.prepare(`INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, last_seen_at, expires_at, updated_at)
      VALUES (?, 's-an', 'PIN', 0, 'Máy thử', ?, ?, ?, ?, ?, ?)`).run(id, ua, ip, at, at, "2027-01-01T00:00:00.000Z", at);
  phien("ss-1", "203.0.113.9", "UA thử", XA_AT);
  assert.equal(violations(db, c), 0, "chưa có phiếu thực hiện");
  phieuXoaXong(db, "e-20", "p-20");
  assert.equal(violations(db, c), 1, "phiên cũ còn IP và UA");
  db.prepare("UPDATE aut_session SET ip = NULL WHERE id = 'ss-1'").run();
  assert.equal(violations(db, c), 1, "còn User-Agent là đủ để đỏ");
  db.prepare("UPDATE aut_session SET user_agent = NULL WHERE id = 'ss-1'").run();
  assert.equal(violations(db, c), 0, "đã ẩn danh");
  phien("ss-2", "203.0.113.9", "UA thử", "2026-10-17T06:00:00.000Z");
  assert.equal(violations(db, c), 0, "phiên cấp SAU lúc thực hiện: không tính");
  // phiếu BỊ TỪ CHỐI cũng có decided_at nhưng không phải thực hiện: phiên của chủ phiếu đó còn IP là bình thường
  NGUOI_T(db, "p-20b");
  db.prepare("UPDATE staff SET party_id = 'p-20b' WHERE id = 's-binh'").run();
  db.prepare("INSERT INTO pty_erasure_request (id, party_id, status, created_at, created_by, updated_at, updated_by) VALUES ('e-20b', 'p-20b', 'CHO_XU_LY', ?, 's-binh', ?, 's-binh')").run(XA_AT, XA_AT);
  db.prepare("UPDATE pty_erasure_request SET status = 'TU_CHOI', decided_at = ?, decided_by = 's-admin', reason_code = 'KHONG_DU_DIEU_KIEN', updated_at = ? WHERE id = 'e-20b'").run(XA_QUYET, XA_QUYET);
  db.prepare(`INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, last_seen_at, expires_at, updated_at)
    VALUES ('ss-3', 's-binh', 'PIN', 0, 'Máy thử', 'UA', '203.0.113.9', ?, ?, '2027-01-01T00:00:00.000Z', ?)`).run(XA_AT, XA_AT, XA_AT);
  assert.equal(violations(db, c), 0, "phiếu bị từ chối: không ẩn danh phiên");
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

test("S10 / NT-12 (ADR-0104 Đ2.9): R-VC-6 phủ hành động mới trip_order_synced — khúc máy có sự kiện ALLOCATION_ORDER_SYNCED cùng id → 0; nhật ký không sự kiện → 1", () => {
  const c = one("R-VC-6");
  const db = tho();
  const t = chuyenTho(db);
  suKienTho(db, { trip: t, kind: "ALLOCATION_ORDER_SYNCED", nhatKy: "trip_order_synced" });
  assert.equal(violations(db, c), 0, "khúc máy đúng khuôn");
  db.prepare("INSERT INTO audit_log (id, action, target_type, target_id, detail, created_at) VALUES ('l-may-mo-coi', 'trip_order_synced', 'trip', ?, 'x', ?)").run(t, T2);
  assert.equal(violations(db, c), 1, "nhật ký máy đồng bộ không có sự kiện cùng id");
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
  // ADR-0129 Q4: tài xế công ty (đang mở vai DRIVER_INTERNAL) lái xe nhà xe thuê không bị báo là «tài xế đã thôi».
  const db2 = tho();
  db2.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-nx', 'ORGANIZATION', 'Nhà xe', 1, '${T1}', '${T1}')`);
  db2.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-nx', 'p-nx', 'CARRIER', '2026-09-01', '${T1}', '${T1}')`);
  const t2 = chuyenTho(db2, { carrier: "p-nx" });
  laiTho(db2, t2, "pty-xa");
  assert.equal(violations(db2, c), 1, "tài xế không thuộc nhà xe, chưa có vai tài xế công ty");
  db2.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ct', 'pty-xa', 'DRIVER_INTERNAL', '2026-09-01', '${T1}', '${T1}')`);
  assert.equal(violations(db2, c), 0, "tài xế công ty lái xe nhà xe thuê: ca chéo được phép");
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
  gieoBanChup(db, id); // 0112 (sổ đại lý đợt 2): máy chủ chụp lúc xác nhận — thiếu bản chụp thì trigger bil_posting_delivered_terms chặn phiếu Đã giao
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

// ĐẢO BÀI CÓ CHỦ ĐÍCH (sổ đại lý đợt 2, Task 10; ADR-0079 «Bất biến», đặc tả P9): R-BIL-2, R-BIL-5 nay là câu kiểm thật (bài riêng ở src/kiem-dinh-ky-so-dai-ly.test.ts),
// không còn ở danh sách «chưa áp dụng»; chỉ R-BIL-7 (= R-PTY-1) còn là ghi chú.
test("R-BIL-*: đủ kiểm lượt 1, mức fail; R-BIL-2/5 là câu kiểm thật (đợt 2); chỉ R-BIL-7 = R-PTY-1 ở danh sách ghi chú (không kiểm trùng, không in 'đạt')", async () => {
  for (const c of ["R-BIL-1", "R-BIL-3a", "R-BIL-3b", "R-BIL-4a", "R-BIL-4b", "R-BIL-6", "R-BIL-S9", "R-BIL-M1", "R-BIL-M2", "R-BIL-2", "R-BIL-5"]) assert.equal(bil(c).level, "fail", c);
  assert.equal(CHECKS.filter((c) => /^R-BIL-7\b/.test(c.code)).length, 0, "R-BIL-7 không phải câu kiểm");
  const { GHI_CHU } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { GHI_CHU: { code: string; text: string }[] };
  assert.deepEqual(GHI_CHU.map((g) => g.code), ["R-BIL-7"]);
  assert.doesNotMatch(GHI_CHU.map((g) => g.text).join(" "), /chưa áp dụng/);
  assert.match(GHI_CHU[0]!.text, /R-PTY-1/);
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

test("R-BIL-S9 (NT-S9): lần thu ghi TRƯỚC mốc 0112 'thu cho' KHÔNG phải công ty chủ → vi phạm; lần thu ghi TỪ mốc không thuộc R-BIL-S9 nữa (đảo có chủ đích — R-BIL-12)", () => {
  const db = build();
  donBil(db, "o-s");
  lanThuBil(db, { id: "rs9", order: "o-s", amount: 1000 });
  assert.equal(violations(db, bil("R-BIL-S9")), 0);
  lanThuBil(db, { id: "rs9b", order: "o-s", amount: 1000, forParty: "pty-s-an" });
  assert.equal(violations(db, bil("R-BIL-S9")), 1);
  // Sổ đại lý đợt 2 (ADR-0078 điều 9): từ 0112 "thu cho" được là người bán của phần tiền — cùng lần thu ghi SAU mốc không còn là vi phạm R-BIL-S9; nó là vi phạm
  // R-BIL-12 vì hồ sơ này không bán dòng nào của đơn (không đếm hai mã).
  lanThuBil(db, { id: "rs9c", order: "o-s", amount: 1000, forParty: "pty-s-an", at: new Date().toISOString() });
  assert.deepEqual([violations(db, bil("R-BIL-S9")), violations(db, bil("R-BIL-12"))], [1, 1]);
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

// R-ORD-16w (ADR-0114 D3, điều khoản 3): đơn ĐÃ XÁC NHẬN không còn người đi kèm (người lớn + người cao tuổi, mọi dịch vụ, số khách HIỆU LỰC) — chỉ cảnh báo, thoát 0.
// Khung thử: đơn nháp + dịch vụ rồi mới chuyển trạng thái (trigger `orders_confirm_requires_trip` chỉ đòi tổng khách ≥ 1 nên đơn chỉ-trẻ-em xác nhận được như đơn cũ trên production).
type KhachDv = { adult?: number; child?: number; senior?: number; infant?: number; nhapTay?: boolean };
function donKhach(db: DatabaseSync, dichVu: KhachDv[], status: "draft" | "confirmed" | "cancelled" = "confirmed"): { order: string; dv: string[] } {
  const n = ++soVc;
  const order = `o16-${n}`;
  db.prepare("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's-an', 'draft', 'K', '0900000009', ?, ?)").run(order, `TD16-${n}`, T1, T1);
  const dv = dichVu.map((d, i) => {
    const id = `sv16-${n}-${i}`;
    db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date) VALUES (?, ?, ?, ?, 'Tour', ?, ?, ?, ?, ?, '2026-10-05')")
      .run(id, order, i, d.nhapTay ? null : "ZH1", d.nhapTay ? "manual" : "perPax", d.adult ?? 0, d.child ?? 0, d.senior ?? 0, d.infant ?? 0);
    return id;
  });
  if (status !== "draft") db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(order);
  if (status === "cancelled") {
    gieoLyDoHuy(db, order);
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order);
  }
  return { order, dv };
}
const dieuChinhKhach = (db: DatabaseSync, order: string, seq: number, pax: { serviceId: string; pax: { adult: number; child: number; senior: number; infant: number } }[]) =>
  db.prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', ?, 0, 0)").run(`adj16-${order}-${seq}`, order, seq, JSON.stringify(pax));

test("R-ORD-16w (ADR-0114 D3): đơn xác nhận chỉ còn trẻ em / em bé → 1 (warn, thoát 0); có người lớn, chỉ người cao tuổi, hay nhập tay mang ô số khách → 0; đơn nháp / huỷ không đếm; đếm theo số khách HIỆU LỰC (sau dòng điều chỉnh)", () => {
  const c = one("R-ORD-16w");
  assert.equal(c.level, "warn", "mức cảnh báo vĩnh viễn: thoát 1 sẽ dừng trien-khai (ADR-0114 D3 điều khoản 3), và e2e chạy --strict");
  assert.ok(c.sql.includes("pax_adult + s.pax_senior") && !c.sql.includes("pax_child"), "chỉ cộng người lớn + người cao tuổi, dùng CHUNG đoạn số khách hiệu lực");
  const db = tho();
  assert.equal(violations(db, c), 0, "chưa đơn nào");
  donKhach(db, [{ adult: 2, child: 1 }]);
  donKhach(db, [{ senior: 2 }]); // đơn toàn người cao tuổi: có người đi kèm (điều khoản 1)
  donKhach(db, [{ child: 2 }, { adult: 1 }]); // tổng tính trên cả đơn: dịch vụ khác có người lớn
  donKhach(db, [{ child: 1 }, { nhapTay: true, adult: 2 }]); // nhập tay: ô số khách nằm ở `adult` (điều khoản 2)
  assert.equal(violations(db, c), 0, "các đơn có người đi kèm → 0");
  donKhach(db, [{ child: 2, infant: 1 }], "draft");
  const huy = donKhach(db, [{ child: 1 }], "cancelled");
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = ?").get(huy.order)?.status, "cancelled");
  assert.equal(violations(db, c), 0, "đơn nháp và đơn huỷ chỉ-trẻ-em không đếm");
  const a = donKhach(db, [{ child: 2, infant: 1 }]);
  assert.equal(violations(db, c), 1, "đơn xác nhận chỉ trẻ em + em bé → 1");
  donKhach(db, [{ infant: 1 }]);
  assert.equal(violations(db, c), 2, "đơn xác nhận chỉ em bé → thêm 1");
  // Số HIỆU LỰC: dòng điều chỉnh gần nhất thắng số đã lưu — sửa xuống 0 người lớn từ trước ADR (đếm số đã lưu thì sót), rồi sửa lại có người lớn (đơn hết bị đếm).
  const b = donKhach(db, [{ adult: 1, child: 1 }]);
  assert.equal(violations(db, c), 2);
  dieuChinhKhach(db, b.order, 1, [{ serviceId: b.dv[0]!, pax: { adult: 0, child: 1, senior: 0, infant: 0 } }]);
  assert.equal(violations(db, c), 3, "đã lưu 1 người lớn nhưng dòng điều chỉnh gần nhất còn 0 → đếm");
  dieuChinhKhach(db, b.order, 2, [{ serviceId: b.dv[0]!, pax: { adult: 1, child: 1, senior: 0, infant: 0 } }]);
  assert.equal(violations(db, c), 2, "lần sửa sau cùng trả lại người lớn → hết đếm (dòng seq lớn nhất thắng)");
  dieuChinhKhach(db, a.order, 1, [{ serviceId: a.dv[0]!, pax: { adult: 1, child: 2, senior: 0, infant: 1 } }]);
  assert.equal(violations(db, c), 1, "đơn chỉ-trẻ-em được sửa thêm người lớn → hết đếm");
  // Đơn xác nhận không dịch vụ nào (chèn thẳng bằng SQL) cũng không có người đi kèm → đếm (nghĩa "tổng = 0").
  const rong = ++soVc;
  db.prepare("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's-an', 'draft', 'K', '0900000009', ?, ?)").run(`o16-${rong}`, `TD16-${rong}`, T1, T1);
  db.exec("DROP TRIGGER IF EXISTS orders_confirm_requires_trip");
  db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = ?").run(`o16-${rong}`);
  assert.equal(violations(db, c), 2, "đơn xác nhận không dịch vụ → đếm");
});

test("R-ORD-16w: sửa chung đoạn số khách hiệu lực KHÔNG đổi chữ của các kiểm cũ (mặc định bốn loại khách, từng byte): R-ORD-9, R-ORD-14, R-VC-3, R-VC-7 vẫn có đoạn bốn loại", () => {
  for (const code of ["R-ORD-9", "R-ORD-14", "R-VC-3", "R-VC-7"]) {
    const sql = one(code).sql;
    assert.ok(sql.includes("json_extract(je.value, '$.pax.adult') + json_extract(je.value, '$.pax.child') + json_extract(je.value, '$.pax.senior') + json_extract(je.value, '$.pax.infant')"), `${code}: đoạn JSON bốn loại`);
    assert.ok(sql.includes("pax_adult + s.pax_child + s.pax_senior + s.pax_infant"), `${code}: đoạn cột bốn loại`);
  }
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
  // Khung DRIVER (ADR-0053 D9 — 0092 đã mở, lý do gieo BTX_*) không khớp theo xe.
  khung("kb-tx", goc + 8 * H, goc + 17 * H, { subject: "DRIVER", xe: null, taiXe: "p-cty", lyDo: "BTX_OM" });
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

// ADR-0097 "Hệ quả" (gói A1 — 0085): R-VC-SUA-1 — lưới thứ hai của lô điều chỉnh (đóng REMOVED + suất thay thế trỏ về + bản chốt) và lô thu hồi xuất bến
// (chỉ khi chưa có tiến độ sau DEPARTED cuối). Dữ liệu thô (trigger đã gỡ) để dựng được cả ca hỏng.
test("R-VC-SUA-1 (ADR-0097): điều chỉnh đủ suất thay thế + bản chốt → 0; thiếu / thừa / khác điểm / thiếu bản chốt / suất trỏ lạ / thu hồi sau tiến độ → đếm (fail)", () => {
  const c = one("R-VC-SUA-1");
  assert.equal(c.level, "fail");
  const db = tho();
  const chay = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const dieuChinh = (o: { key?: string | null; moSo?: number; khacDiem?: boolean; chot?: boolean } = {}) => {
    const key = o.key === undefined ? `pk-${++soVc}` : o.key;
    const cu = suatTho(db, { trip: chay, key, status: "BOARDED" });
    const cmd = suKienTho(db, { trip: chay, kind: "CORRECTION", alloc: cu, nhatKy: "trip_allocation_corrected" });
    db.prepare("UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED', closed_cmd_id = ? WHERE id = ?").run(T2, cmd, cu);
    for (let i = 0; i < (o.moSo ?? 1); i++) {
      const moi = `al-${++soVc}`;
      db.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, passenger_key, board_stop_id, status, valid_from_at, added_after_departure, opened_cmd_id, corrects_allocation_id,
          created_at, updated_at) SELECT ?, trip_id, kind, leg_id, passenger_key, CASE WHEN ? THEN 'st-khac' ELSE board_stop_id END, 'NO_SHOW', ?, 1, ?, id, ?, ? FROM vc_trip_allocation WHERE id = ?`)
        .run(moi, o.khacDiem ? 1 : 0, T2, cmd, T2, T2, cu);
      if (o.chot !== false && key !== null) {
        db.prepare("INSERT INTO vc_trip_manifest (id, trip_id, check_id, allocation_id, passenger_row_id, added_after_departure, created_at, updated_at) VALUES (?, ?, NULL, ?, 'row-1', 1, ?, ?)")
          .run(`mf-${++soVc}`, chay, moi, T2, T2);
      }
    }
  };
  dieuChinh();
  dieuChinh({ key: null }); // suất chưa tên: không cần bản chốt
  assert.equal(violations(db, c), 0, "lô điều chỉnh đúng hình");
  dieuChinh({ moSo: 0 });
  assert.equal(violations(db, c), 1, "đóng mà không mở suất thay thế");
  dieuChinh({ key: null, moSo: 2 });
  assert.equal(violations(db, c), 2, "hai suất thay thế");
  dieuChinh({ khacDiem: true });
  assert.equal(violations(db, c), 3, "suất thay thế khác điểm lên");
  dieuChinh({ chot: false });
  assert.equal(violations(db, c), 4, "suất có tên thiếu bản chốt thêm sau xuất bến");
  const la = suatTho(db, { trip: chay, key: "pk-9" });
  db.prepare("UPDATE vc_trip_allocation SET corrects_allocation_id = ? WHERE id = ?").run(la, suatTho(db, { trip: chay, key: "pk-8" }));
  assert.equal(violations(db, c), 5, "suất trỏ corrects mà không do lô CORRECTION mở");
  // Thu hồi xuất bến: ngay sau DEPARTED (kể cả lần thứ hai) → không đếm; có STOP_ARRIVED xen giữa → đếm; không có DEPARTED trước → đếm.
  const t2 = chuyenTho(db, { status: "PLANNED" });
  suKienTho(db, { trip: t2, kind: "ALLOCATED" });
  suKienTho(db, { trip: t2, kind: "DEPARTED", nhatKy: "trip_departed" });
  suKienTho(db, { trip: t2, kind: "DEPARTURE_REVOKED", nhatKy: "trip_departure_revoked" });
  suKienTho(db, { trip: t2, kind: "DEPARTED", nhatKy: "trip_departed" });
  suKienTho(db, { trip: t2, kind: "DEPARTURE_REVOKED", nhatKy: "trip_departure_revoked" });
  assert.equal(violations(db, c), 5, "thu hồi hai lần, mỗi lần ngay sau xuất bến: hợp lệ");
  suKienTho(db, { trip: t2, kind: "DEPARTED", nhatKy: "trip_departed" });
  suKienTho(db, { trip: t2, kind: "STOP_ARRIVED", nhatKy: "trip_stop_arrived" });
  suKienTho(db, { trip: t2, kind: "DEPARTURE_REVOKED", nhatKy: "trip_departure_revoked" });
  assert.equal(violations(db, c), 6, "thu hồi sau khi đã có tiến độ");
  suKienTho(db, { trip: chuyenTho(db), kind: "DEPARTURE_REVOKED", nhatKy: "trip_departure_revoked" });
  assert.equal(violations(db, c), 7, "thu hồi không có xuất bến trước");
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0053 D8, D9 (kế hoạch A4 T11): lưới thứ hai của trigger Từ chối (tc82_, tc83_), khung bận tài xế (B9.2, B9.3) và hạn theo cặp (D8.1) — R-VC-26…30.
// ---------------------------------------------------------------------------------------------------------------------
const dongLaiTho = (db: DatabaseSync, o: { trip: string; party: string; ly?: "REFUSED" | "REASSIGNED"; by?: string | null; luc?: string }) =>
  db.prepare(`INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, valid_to_at, close_reason, refuse_reason_code, closed_by_party_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`dr-${++soVc}`, o.trip, o.party, T1, o.luc ?? T2, o.ly ?? "REFUSED", (o.ly ?? "REFUSED") === "REFUSED" ? "TCC_BAN_LICH_KHAC" : null,
    o.by === undefined ? o.party : o.by, T1, T2);
const hanTho = (db: DatabaseSync, trip: string, party: string, han = NOW_MS) =>
  db.prepare(`INSERT INTO vc_refuse_deadline (trip_id, driver_party_id, deadline_ms, lead_minutes, created_at, updated_at) VALUES (?, ?, ?, 720, ?, ?)`).run(trip, party, han, T1, T1);

test("R-VC-26 (ADR-0053 B8.2): dòng lái REFUSED mà người đóng ≠ chính tài xế → vi phạm (fail); REFUSED đúng người / REASSIGNED → không đếm", () => {
  const c = one("R-VC-26");
  assert.equal(c.level, "fail");
  const db = tho();
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong" });
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong", ly: "REASSIGNED", by: null });
  assert.equal(violations(db, c), 0);
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong", by: "p-khac" });
  assert.equal(violations(db, c), 1, "người khác đóng thay");
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong", by: null });
  assert.equal(violations(db, c), 2, "REFUSED không có người đóng");
});

test("R-VC-27 (ADR-0053 B8.3): REFUSED ghi lúc/sau giờ xuất bến thật của chuyến → vi phạm (fail); trước xuất bến / chuyến chưa chạy → không đếm", () => {
  const c = one("R-VC-27");
  assert.equal(c.level, "fail");
  const db = tho();
  const xb = Date.parse(T3);
  dongLaiTho(db, { trip: chuyenTho(db, { status: "RUNNING", departed: xb }), party: "p-dong", luc: T2 });
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong", luc: T4 });
  assert.equal(violations(db, c), 0);
  dongLaiTho(db, { trip: chuyenTho(db, { status: "RUNNING", departed: xb, xe: "xe-2" }), party: "p-dong", luc: T4 }); // một xe chỉ một chuyến đang chạy
  assert.equal(violations(db, c), 1, "từ chối sau khi xe đã lăn bánh");
  dongLaiTho(db, { trip: chuyenTho(db, { status: "ENDED", departed: xb, ended: xb + H }), party: "p-dong", luc: T3 });
  assert.equal(violations(db, c), 2, "đúng giờ xuất bến cũng tính");
});

test("R-VC-28 (ADR-0053 B9.2, B9.3): khung bận DRIVER còn hiệu lực chồng chuyến chưa kết thúc đang xếp CHO NGƯỜI ĐÓ → đếm (warn); người khác / khung rút / chuyến xong → không", () => {
  const c = one("R-VC-28");
  assert.equal(c.level, "warn");
  const db = tho();
  const goc = Math.floor(NOW_MS / 60_000) * 60_000 + 24 * H;
  db.prepare(`INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
    VALUES ('kb-d', 'DRIVER', NULL, 'p-dong', ?, ?, ?, ?, 'BTX_OM', ?, ?)`).run(goc + 8 * H, goc + 12 * H, isoMs(goc + 8 * H), isoMs(goc + 12 * H), T1, T1);
  laiTho(db, chuyenTho(db, { tu: goc + 9 * H, den: goc + 10 * H }), "p-khac");
  laiTho(db, chuyenTho(db, { tu: goc + 12 * H, den: goc + 13 * H }), "p-dong"); // chạm mép — nửa mở
  laiTho(db, chuyenTho(db, { tu: goc + 9 * H, den: goc + 10 * H, status: "ENDED", departed: goc + 9 * H, ended: goc + 10 * H }), "p-dong");
  dongLaiTho(db, { trip: chuyenTho(db, { tu: goc + 10 * H, den: goc + 11 * H }), party: "p-dong" }); // đã từ chối — dòng đóng
  assert.equal(violations(db, c), 0);
  laiTho(db, chuyenTho(db, { tu: goc + 11 * H, den: goc + 13 * H }), "p-dong");
  assert.equal(violations(db, c), 1, "chuyến đang xếp cho người bận");
  db.prepare("UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's', version = 2, updated_at = ?, updated_by = 's' WHERE id = 'kb-d'").run(T2, T2);
  assert.equal(violations(db, c), 0, "khung đã rút");
});

test("R-VC-29 (ADR-0053 D8.1): dòng lái ĐANG MỞ thiếu dòng hạn của cặp (tài xế, chuyến) → vi phạm (fail); dòng đóng không xét", () => {
  const c = one("R-VC-29");
  assert.equal(c.level, "fail");
  const db = tho();
  const t = chuyenTho(db);
  laiTho(db, t, "p-dong");
  hanTho(db, t, "p-dong");
  dongLaiTho(db, { trip: chuyenTho(db), party: "p-dong", ly: "REASSIGNED", by: null });
  assert.equal(violations(db, c), 0);
  const t2 = chuyenTho(db);
  laiTho(db, t2, "p-dong");
  hanTho(db, t2, "p-khac"); // hạn của NGƯỜI KHÁC không tính
  assert.equal(violations(db, c), 1);
});

test("R-VC-30 (ADR-0053 D8, cảnh báo): chuyến chưa chạy xuất bến trong 48 giờ tới mà chưa có tài xế → đếm (warn); có tài xế / ngoài 48 giờ / đã qua giờ / đã huỷ → không", () => {
  const c = one("R-VC-30");
  assert.equal(c.level, "warn");
  const db = tho();
  laiTho(db, chuyenTho(db, { tu: NOW_MS + 3 * H }), "p-dong");
  chuyenTho(db, { tu: NOW_MS + 50 * H });
  chuyenTho(db, { tu: NOW_MS - 2 * H });
  const huy = chuyenTho(db, { tu: NOW_MS + 5 * H });
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(huy);
  assert.equal(violations(db, c), 0);
  dongLaiTho(db, { trip: chuyenTho(db, { tu: NOW_MS + 20 * H }), party: "p-dong" });
  assert.equal(violations(db, c), 1, "tài xế đã từ chối, chưa xếp người khác");
});

// Chuyển khách giữa hai xe (ADR-0111, ADR-0052 D4 / D5c — gói A5 T11; mã do điều phối cấp — ĐỔI từ R-VC-26…30 thành R-VC-31…35 khi nhập nền A4, vì A4 đã dùng R-VC-26…30): lưới THỨ HAI sau trigger của 0093 (cân đóng = mở
// không có trigger theo dòng — R-VC-31 là lưới duy nhất, "phát hiện, không chặn"). Dựng thô: gỡ thêm trigger của bảng vc_transfer_*. Mọi tên / số GIẢ.
// ---------------------------------------------------------------------------------------------------------------------
function thoCk(): DatabaseSync {
  const db = tho();
  for (const t of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name LIKE 'vc\\_transfer%' ESCAPE '\\'").all() as { name: string }[]) {
    db.exec(`DROP TRIGGER ${t.name}`);
  }
  return db;
}
const uuidTho = (dau: string, n: number) => `${dau}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Đề nghị thô đúng các CHECK của bảng: cột quyết định theo trạng thái; `cmd` = dấu lệnh quyết / đóng. */
function deNghiTho(db: DatabaseSync, o: { from: string; to: string; scope?: "STOP" | "ONBOARD"; stop?: string; status?: string; mode?: "MAY" | "NGUOI"; cmd?: string }): { id: string; cmd: string } {
  const n = ++soVc;
  const id = uuidTho("f", n);
  const cmd = o.cmd ?? uuidTho("c", n);
  const status = o.status ?? "PENDING";
  const scope = o.scope ?? "STOP";
  const quyet = ["CONFIRMED", "ESCALATED", "DECLINED", "REJECTED"].includes(status);
  const mode = status === "CONFIRMED" ? (o.mode ?? "MAY") : null;
  db.prepare(`INSERT INTO vc_transfer_request (id, from_trip_id, to_trip_id, scope, from_stop_id, meet_place_text, pax_count, proposed_by_party_id, proposed_by_staff_id, proposed_at,
      status, decided_mode, decided_by, decided_at, decided_cmd_id, decided_by_party_id, closed_cmd_id, policy_id, decline_reason_code, override_reason_code, reject_reason_code,
      request_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 2, 'pty-xa', 's-an', ?, ?, ?, ?, ?, ?, ?, ?, 'pol', ?, ?, ?, ?, ?, ?)`)
    .run(id, o.from, o.to, scope, scope === "STOP" ? (o.stop ?? "st-x") : null, scope === "ONBOARD" ? "Cây xăng" : null, T1, status, mode, quyet ? "s-admin" : null,
      quyet ? T2 : null, quyet ? cmd : null, quyet ? "pty-xa" : null, ["PENDING", "ESCALATED"].includes(status) ? null : cmd,
      status === "DECLINED" ? "TU_CHOI_DAY_CHO" : null, mode === "NGUOI" ? "PHA_LE_SU_CO" : null, status === "REJECTED" ? "TU_CHOI_KHAC" : null, `r${id.slice(1)}`, T1, T1);
  return { id, cmd };
}
const kiemTho = (db: DatabaseSync, o: { transfer: string; cmd: string; rule: string; tier: string; ketQua: string }) =>
  db.prepare(`INSERT INTO vc_transfer_check (id, transfer_id, cmd_id, rule_code, rule_tier, ket_qua, gia_tri, gioi_han, policy_row_id, checked_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'pol', ?, ?, 's-an', ?, 's-an')`).run(`kt-${++soVc}`, o.transfer, o.cmd, o.rule, o.tier, o.ketQua, T2, T2, T2);
/** Suất nguồn đóng vì chuyển (TRANSFERRED + closed_transfer_id — CHECK của 0093 đòi hai cột đi cùng). */
const dongChuyenTho = (db: DatabaseSync, trip: string, r: string) => {
  const a = suatTho(db, { trip });
  db.prepare("UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'TRANSFERRED', closed_transfer_id = ? WHERE id = ?").run(T2, r, a);
  return a;
};
const moChuyenTho = (db: DatabaseSync, trip: string, r: string, o: { status?: string; board?: string } = {}) => {
  const a = suatTho(db, { trip, status: o.status, board: o.board });
  db.prepare("UPDATE vc_trip_allocation SET transfer_id = ? WHERE id = ?").run(r, a);
  return a;
};

test("R-VC-31…35: đúng năm kiểm, mức fail", () => {
  for (const code of ["R-VC-31", "R-VC-32", "R-VC-33", "R-VC-34", "R-VC-35"]) assert.equal(one(code).level, "fail", code);
});

test("R-VC-31 (Đ3 a): đề nghị CONFIRMED đóng bao nhiêu suất thì mở bấy nhiêu → 0; lệch (đóng thừa / mở thiếu) → đếm theo đề nghị; đề nghị chưa xác nhận không xét", () => {
  const c = one("R-VC-31");
  const db = thoCk();
  const a = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const b = chuyenTho(db, { status: "RUNNING", departed: NOW_MS, xe: "xe-2" });
  const r = deNghiTho(db, { from: a, to: b, status: "CONFIRMED" }).id;
  for (let i = 0; i < 2; i++) {
    dongChuyenTho(db, a, r);
    moChuyenTho(db, b, r);
  }
  deNghiTho(db, { from: a, to: b, status: "VOID" });
  assert.equal(violations(db, c), 0, "đóng 2 mở 2");
  dongChuyenTho(db, a, r);
  assert.equal(violations(db, c), 1, "đóng 3 mở 2");
  const r2 = deNghiTho(db, { from: a, to: b, status: "CONFIRMED" }).id;
  moChuyenTho(db, b, r2);
  assert.equal(violations(db, c), 2, "mở mà không đóng");
});

test("R-VC-32 (Đ3 a): suất TRANSFERRED / suất mở vì chuyển trỏ đề nghị CONFIRMED → 0; trỏ đề nghị chưa xác nhận → đếm", () => {
  const c = one("R-VC-32");
  const db = thoCk();
  const a = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const b = chuyenTho(db, { status: "RUNNING", departed: NOW_MS, xe: "xe-2" });
  const r = deNghiTho(db, { from: a, to: b, status: "CONFIRMED" }).id;
  dongChuyenTho(db, a, r);
  moChuyenTho(db, b, r);
  assert.equal(violations(db, c), 0);
  dongChuyenTho(db, a, deNghiTho(db, { from: a, to: b, status: "ESCALATED" }).id);
  assert.equal(violations(db, c), 1, "đóng TRANSFERRED theo đề nghị đang leo thang");
  moChuyenTho(db, b, deNghiTho(db, { from: a, to: b }).id);
  assert.equal(violations(db, c), 2, "mở suất theo đề nghị đang chờ");
  // (TRANSFERRED mà thiếu closed_transfer_id: CHECK của bảng chặn ngay cả khi gỡ trigger — câu kiểm vẫn phủ, phòng lần dựng lại bảng làm mất CHECK.)
});

test("R-VC-33 (Đ1 + D4): đề nghị CONFIRMED mà dòng kiểm của LẦN QUYẾT có điều kiện tầng LOI không đạt → đếm (cả MAY lẫn NGUOI); CAU_HINH không đạt / dòng của lần bấm cũ không xét", () => {
  const c = one("R-VC-33");
  const db = thoCk();
  const a = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const b = chuyenTho(db);
  const n1 = deNghiTho(db, { from: a, to: b, status: "CONFIRMED", mode: "NGUOI" });
  kiemTho(db, { transfer: n1.id, cmd: n1.cmd, rule: "MOC_TOI_THIEU", tier: "CAU_HINH", ketQua: "KHONG_DAT" });
  kiemTho(db, { transfer: n1.id, cmd: n1.cmd, rule: "SUC_CHUA_DICH", tier: "LOI", ketQua: "DAT" });
  kiemTho(db, { transfer: n1.id, cmd: uuidTho("b", ++soVc), rule: "GIAY_TO_DICH", tier: "LOI", ketQua: "KHONG_DAT" }); // lần Nhận cũ (đã leo thang), sau đó giấy tờ được bổ sung
  assert.equal(violations(db, c), 0, "phá lệ được điều kiện cấu hình; dòng kiểm cũ không tính");
  kiemTho(db, { transfer: n1.id, cmd: n1.cmd, rule: "GIAY_TO_DICH", tier: "LOI", ketQua: "KHONG_DAT" });
  assert.equal(violations(db, c), 1, "người duyệt vượt điều kiện tầng LOI");
  const m = deNghiTho(db, { from: a, to: b, status: "CONFIRMED", mode: "MAY" });
  kiemTho(db, { transfer: m.id, cmd: m.cmd, rule: "SUC_CHUA_DICH", tier: "LOI", ketQua: "KHONG_DAT" });
  assert.equal(violations(db, c), 2, "máy tự xác nhận khi có điều kiện LOI không đạt");
  const bac = deNghiTho(db, { from: a, to: b, status: "REJECTED" });
  kiemTho(db, { transfer: bac.id, cmd: bac.cmd, rule: "SUC_CHUA_DICH", tier: "LOI", ketQua: "KHONG_DAT" });
  assert.equal(violations(db, c), 2, "đề nghị bị bác không xét");
});

test("R-VC-34 (Đ1): tầng của dòng kiểm khớp danh mục → 0; lệch tầng / mã ngoài danh mục → đếm", () => {
  const c = one("R-VC-34");
  const db = thoCk();
  const n = deNghiTho(db, { from: chuyenTho(db, { status: "RUNNING", departed: NOW_MS }), to: chuyenTho(db), status: "ESCALATED" });
  kiemTho(db, { transfer: n.id, cmd: n.cmd, rule: "SUC_CHUA_DICH", tier: "LOI", ketQua: "DAT" });
  kiemTho(db, { transfer: n.id, cmd: n.cmd, rule: "MOC_TOI_THIEU", tier: "CAU_HINH", ketQua: "KHONG_DAT" });
  assert.equal(violations(db, c), 0);
  kiemTho(db, { transfer: n.id, cmd: n.cmd, rule: "GIAY_TO_DICH", tier: "CAU_HINH", ketQua: "KHONG_DAT" });
  assert.equal(violations(db, c), 1, "điều kiện LOI ghi thành CAU_HINH (người duyệt sẽ phá lệ được)");
  kiemTho(db, { transfer: n.id, cmd: n.cmd, rule: "MA_LA", tier: "LOI", ketQua: "DAT" });
  assert.equal(violations(db, c), 2, "mã ngoài danh mục");
});

test("R-VC-35 (MQ-09): đề nghị đang chờ / leo thang mà điểm nguồn hết PENDING, xe nhờ hết chạy, hoặc xe nhận hết PLANNED / RUNNING → đếm; đề nghị đã đóng không xét", () => {
  const c = one("R-VC-35");
  const db = thoCk();
  const a = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const b = chuyenTho(db);
  const d1 = diemTho(db, { trip: a });
  const d2 = diemTho(db, { trip: a, seq: 2 });
  deNghiTho(db, { from: a, to: b, stop: d1 });
  deNghiTho(db, { from: a, to: b, stop: d1, status: "ESCALATED" });
  deNghiTho(db, { from: a, to: b, scope: "ONBOARD" });
  deNghiTho(db, { from: a, to: b, stop: d2, status: "VOID" });
  db.prepare("UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?").run(T2, d2);
  assert.equal(violations(db, c), 0, "đề nghị đóng ở điểm đã tới: không xét");
  db.prepare("UPDATE vc_trip_stop SET status = 'ARRIVED', arrived_at = ? WHERE id = ?").run(T2, d1);
  assert.equal(violations(db, c), 2, "hai đề nghị chờ / leo thang của điểm đã tới");
  const a2 = chuyenTho(db, { status: "ENDED", departed: NOW_MS, ended: NOW_MS + H });
  deNghiTho(db, { from: a2, to: b, scope: "ONBOARD" });
  assert.equal(violations(db, c), 3, "xe nhờ đã kết thúc");
  const b2 = chuyenTho(db);
  db.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(b2);
  deNghiTho(db, { from: a, to: b2, scope: "ONBOARD" });
  assert.equal(violations(db, c), 4, "xe nhận đã huỷ");
});

test("R-VC-16 nới N3 (ADR-0052 :72, D5c): suất chuyển theo đề nghị ONBOARD lên ở NƠI GẶP (điểm danh mục khác nơi đón của chặng) → không báo; suất thường cùng hình → vẫn báo", () => {
  const c = one("R-VC-16");
  const db = thoCk();
  const d = donTho(db, { loc: "loc-1" });
  const a = chuyenTho(db, { status: "ENDED", departed: NOW_MS, ended: NOW_MS + H });
  const b = chuyenTho(db, { status: "RUNNING", departed: NOW_MS });
  const gap = diemTho(db, { trip: b, loc: "loc-gap" });
  const r = deNghiTho(db, { from: a, to: b, scope: "ONBOARD", status: "CONFIRMED" }).id;
  db.prepare("UPDATE vc_transfer_request SET meet_place_text = NULL, meet_location_id = 'loc-gap' WHERE id = ?").run(r);
  const s = moChuyenTho(db, b, r, { status: "BOARDED", board: gap });
  db.prepare("UPDATE vc_trip_allocation SET leg_id = ? WHERE id = ?").run(d.leg, s);
  assert.equal(violations(db, c), 0, "nơi gặp của cứu hộ không phải nơi hẹn đã đổi");
  suatTho(db, { trip: b, leg: d.leg, board: gap });
  assert.equal(violations(db, c), 1, "suất không do chuyển mà lên ở điểm khác nơi đón: vẫn báo");
});

test("R-VC-SUA-1 (c) theo trigger thu hồi mới của 0093 (ADR-0111 Đ5): đề nghị chưa thành ở chuyến không là tiến độ → không đếm; xe đã nhận khách (TRANSFER_CONFIRMED ở chuyến) hoặc đã giao khách (TRANSFER_CONFIRMED trỏ chuyến) → đếm", () => {
  const c = one("R-VC-SUA-1");
  const db = thoCk();
  const t = chuyenTho(db);
  for (const kind of ["DEPARTED", "TRANSFER_SENT", "TRANSFER_ESCALATED", "TRANSFER_REJECTED", "DEPARTURE_REVOKED"]) suKienTho(db, { trip: t, kind, nhatKy: null });
  assert.equal(violations(db, c), 0, "xe nhận thu hồi xuất bến khi chỉ có đề nghị chưa thành");
  const nhan = chuyenTho(db, { xe: "xe-2" });
  for (const kind of ["DEPARTED", "TRANSFER_CONFIRMED", "DEPARTURE_REVOKED"]) suKienTho(db, { trip: nhan, kind, nhatKy: null });
  assert.equal(violations(db, c), 1, "xe nhận đã nhận khách rồi thu hồi");
  const nho = chuyenTho(db, { xe: "xe-3" });
  suKienTho(db, { trip: nho, kind: "DEPARTED", nhatKy: null });
  const xn = suKienTho(db, { trip: chuyenTho(db, { xe: "xe-4" }), kind: "TRANSFER_CONFIRMED", nhatKy: null });
  db.prepare("UPDATE vc_trip_event SET related_trip_id = ? WHERE id = ?").run(nho, xn);
  suKienTho(db, { trip: nho, kind: "DEPARTURE_REVOKED", nhatKy: null });
  assert.equal(violations(db, c), 2, "xe nhờ đã giao khách rồi thu hồi");
});

// ---------------------------------------------------------------------------------------------------------------------
// Sổ đại lý đợt 1 (đặc tả 2026-10-08 §9, kế hoạch Task 9): R-PRC-1…5, R-ORD-T1, R-ORD-T1w, R-ORD-T2, R-KY-1, R-KY-2 — lưới THỨ HAI sau trigger / CHECK của
// migration 0090. Mỗi mã có ca xanh (dữ liệu do đúng luồng sinh ra) và ca đỏ; ca đỏ hoặc gỡ ĐÚNG trigger đang chặn việc tạo vi phạm, hoặc bật tạm
// `ignore_check_constraints` (R-ORD-T2: ràng buộc nằm ở CHECK, không ở trigger), hoặc đi đường thật (tắt vai, đổi nhóm, đổi công ty chủ) — như SQL gõ tay trên D1.
// "Hôm nay" của các kiểm có hạn ngày là giờ Việt Nam: bài dùng `vnNgay` (= date('now', '+7 hours')).
// ---------------------------------------------------------------------------------------------------------------------
const SDL_MUC: [string, string][] = [
  ["R-PRC-1", "fail"], ["R-PRC-2", "fail"], ["R-PRC-3", "fail"], ["R-PRC-4", "fail"], ["R-PRC-5", "warn"],
  ["R-ORD-T1", "fail"], ["R-ORD-T1w", "warn"], ["R-ORD-T2", "fail"], ["R-KY-1", "fail"], ["R-KY-2", "fail"],
];

test("Sổ đại lý đợt 1: đủ mười kiểm, đúng mức đã chốt (chỉ R-PRC-5 và R-ORD-T1w là cảnh báo VĨNH VIỄN — không 'warn-unless-strict'); R-ORD-T1w liệt kê dòng; kiểm nào cũng có ghi chú trỏ đặc tả", () => {
  assert.deepEqual(SDL_MUC.map(([code]) => [code, one(code).level]), SDL_MUC);
  assert.equal(one("R-ORD-T1w").mode, "rows");
  for (const [code] of SDL_MUC) {
    if (code !== "R-ORD-T1w") assert.equal(one(code).mode, undefined, `${code}: kiểm đếm, không liệt kê`);
    assert.match(one(code).note ?? "", /§9/, `${code}: note trỏ đặc tả §9`);
    assert.ok(one(code).what.length > 20, `${code}: what nói rõ hỏng gì`);
  }
  // "Hôm nay" giờ VN: cùng chữ với R-PTY-6 (date('now') trần là UTC — lệch 7 giờ quanh nửa đêm).
  for (const code of ["R-PRC-2", "R-PRC-3", "R-PRC-4", "R-PRC-5"]) assert.match(one(code).sql, /date\('now', '\+7 hours'\)/, `${code}: hôm nay theo giờ Việt Nam`);
  // MỘT hằng ân hạn cho cả lỗi và cảnh báo: hai câu không thể lệch nhau về chỗ chia vùng.
  for (const code of ["R-ORD-T1", "R-ORD-T1w"]) assert.match(one(code).sql, /'\+60 minutes'/, `${code}: ân hạn 60 phút`);
});

// ---- Dựng dữ liệu chung ----
/** Hồ sơ TỔ CHỨC `id`, tuỳ chọn mang một vai (đang mở từ 2026-01-01). */
function toChucSdl(db: DatabaseSync, id: string, vai?: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, id, T1, T1);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, T1, T1);
  if (vai) vaiSdl(db, id, vai);
  return id;
}
function vaiSdl(db: DatabaseSync, party: string, vai: string): void {
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`vai-${party}-${vai}`, party, vai, T1, T1);
}
/** Đóng vai đang mở (như Quản trị bấm "Kết thúc vai") — đường THẬT làm một dòng mức / điều khoản cũ mất chỗ dựa. */
const dongVaiSdl = (db: DatabaseSync, party: string, vai: string, ngay = vnNgay(-1)) =>
  db.prepare("UPDATE pty_party_role SET valid_to_date = ?, updated_at = ? WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL").run(ngay, T2, party, vai);
interface MucSdl { id: string; party?: string | null; role?: string | null; scope?: "SERVICE" | "GROUP" | "ALL"; catalog?: string | null; group?: string | null; tu?: string; den?: string | null; rate?: number }
function mucSdl(db: DatabaseSync, o: MucSdl): void {
  const scope = o.scope ?? "ALL";
  db.prepare(
    `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
       created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, 'RATE', ?, NULL, ?, ?, NULL, ?, NULL, ?, NULL)`,
  ).run(o.id, o.party ?? null, o.role ?? null, scope, scope === "SERVICE" ? (o.catalog ?? "S1") : null, scope === "GROUP" ? (o.group ?? "TDA") : null, o.rate ?? 1000, o.tu ?? "2026-01-01", o.den ?? null, T1, T1);
}
/** Đóng dòng mức / điều khoản (đường THẬT: chỉ đặt valid_to_date, đúng trigger close_only). */
const dongDongSdl = (db: DatabaseSync, bang: "prc_commission_rule" | "prc_supply_term", id: string, den = vnNgay(-1)) =>
  db.prepare(`UPDATE ${bang} SET valid_to_date = ?, updated_at = ? WHERE id = ?`).run(den, T2, id);
interface DieuKhoanSdl { id: string; seller: string; cost?: number | null; scope?: "SERVICE" | "GROUP" | "ALL"; catalog?: string | null; group?: string | null; tu?: string; den?: string | null }
function dieuKhoanSdl(db: DatabaseSync, o: DieuKhoanSdl): void {
  const scope = o.scope ?? "SERVICE";
  const cost = o.cost ?? null;
  db.prepare(
    `INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, NULL)`,
  ).run(o.id, scope, scope === "SERVICE" ? (o.catalog ?? "S1") : null, scope === "GROUP" ? (o.group ?? "TDA") : null, o.seller, cost === null ? null : o.seller, cost, o.tu ?? "2026-01-01", o.den ?? null, T1, T1);
}

// ---------------------------------------------------------------------------------------------------------------------
test("R-PRC-1: hai dòng mức cùng (đối tượng, phạm vi, mã) chồng hiệu lực → vi phạm (gỡ trigger prc_commission_rule_overlap); khác đối tượng / phạm vi / mã, hoặc nối tiếp không chồng → 0", () => {
  const c = one("R-PRC-1");
  const db = build();
  const dl = toChucSdl(db, "dl-1", "TRAVEL_AGENCY");
  toChucSdl(db, "dl-2", "TRAVEL_AGENCY");
  assert.equal(violations(db, c), 0, "chưa dòng nào");
  mucSdl(db, { id: "m-1", party: "dl-1", scope: "ALL", tu: "2026-01-01", den: "2026-03-31" });
  mucSdl(db, { id: "m-2", party: "dl-1", scope: "ALL", tu: "2026-04-01" }); // nối tiếp ngay ngày sau: không chồng
  mucSdl(db, { id: "m-3", party: "dl-2", scope: "ALL" }); // đối tượng khác
  mucSdl(db, { id: "m-4", party: dl, scope: "GROUP", group: "TDA" }); // phạm vi khác
  mucSdl(db, { id: "m-5", party: dl, scope: "SERVICE", catalog: "S1" });
  mucSdl(db, { id: "m-6", party: dl, scope: "SERVICE", catalog: "S2" }); // mã khác
  mucSdl(db, { id: "m-7", role: "TAXI_DRIVER", scope: "ALL" }); // vai, không phải hồ sơ
  assert.equal(violations(db, c), 0, "ca xanh: đủ kiểu khác nhau, không cặp nào chồng");
  assert.throws(() => mucSdl(db, { id: "m-x", party: "dl-1", scope: "ALL", tu: "2026-06-01" }), /prc_overlap/, "trigger chặn trước");
  db.exec("DROP TRIGGER prc_commission_rule_overlap");
  mucSdl(db, { id: "m-x", party: "dl-1", scope: "ALL", tu: "2026-06-01" }); // chồng m-2 (mở)
  assert.equal(violations(db, c), 1, "cùng hồ sơ, cùng phạm vi ALL, chồng");
  mucSdl(db, { id: "m-y", role: "TAXI_DRIVER", scope: "ALL", tu: "2026-02-01" }); // chồng m-7 (cùng vai)
  assert.equal(violations(db, c), 2, "cùng vai, cùng phạm vi, chồng");
  mucSdl(db, { id: "m-z", party: "dl-1", scope: "SERVICE", catalog: "S1", tu: "2026-01-01", den: "2026-01-31" }); // chồng m-5 (cùng mã)
  assert.equal(violations(db, c), 3, "cùng mã dịch vụ, chồng");
});

test("R-PRC-2: dòng mức theo vai mà vai KHÔNG còn trong danh sách đang bật → vi phạm; dòng đã hết hạn (đóng) thì không tính; vai bật lại → 0", () => {
  const c = one("R-PRC-2");
  const db = build();
  mucSdl(db, { id: "m-vai", role: "TAXI_DRIVER", scope: "ALL" });
  mucSdl(db, { id: "m-vai2", role: "COLLABORATOR", scope: "ALL" });
  mucSdl(db, { id: "m-hs", party: toChucSdl(db, "dl-1", "TRAVEL_AGENCY"), scope: "ALL" }); // theo hồ sơ — không thuộc kiểm này
  assert.equal(violations(db, c), 0, "mọi vai đang bật");
  const tat = (vai: string, active: 0 | 1) => db.prepare("UPDATE prc_beneficiary_role SET active = ?, updated_at = ? WHERE role_type_code = ?").run(active, T2, vai);
  tat("TAXI_DRIVER", 0); // đường THẬT (đặc tả: tắt vai = active 0, dòng mức cũ vẫn giữ)
  assert.equal(violations(db, c), 1, "vai bị tắt, dòng mức còn hiệu lực");
  tat("COLLABORATOR", 0);
  assert.equal(violations(db, c), 2);
  dongDongSdl(db, "prc_commission_rule", "m-vai", vnNgay(0));
  assert.equal(violations(db, c), 2, "dòng đóng với ngày kết thúc = HÔM NAY vẫn còn hiệu lực hôm nay");
  dongDongSdl(db, "prc_commission_rule", "m-vai2", vnNgay(-1));
  assert.equal(violations(db, c), 1, "Kế toán đóng dòng mức (hết hạn từ hôm qua) → hết báo — bản cũ nằm lại làm lịch sử, không báo mãi");
  tat("TAXI_DRIVER", 1);
  assert.equal(violations(db, c), 0, "bật lại vai");
});

// ---- ADR-0117 lần 2 (migration 0096 + 0097): đích thứ ba của dòng mức là MỨC TA; bảng gắn loại ↔ mức theo ngày. ----
const mucTaSdl = (db: DatabaseSync, code: string, active: 0 | 1 = 1) =>
  db.prepare("INSERT INTO prc_rate_tier (code, name, name_key, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(code, code, code.toLowerCase(), active, T1, T1);
function dongMucTaSdl(db: DatabaseSync, o: { id: string; tier: string; scope?: "SERVICE" | "ALL"; tu?: string; den?: string | null }): void {
  const scope = o.scope ?? "ALL";
  db.prepare(
    `INSERT INTO prc_commission_rule (id, target_tier_code, scope, catalog_code, kind, rate_bp, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'RATE', 300, ?, ?, ?, ?)`,
  ).run(o.id, o.tier, scope, scope === "SERVICE" ? "S1" : null, o.tu ?? "2026-01-01", o.den ?? null, T1, T1);
}
const ganMucSdl = (db: DatabaseSync, o: { id: string; role: string; tier: string; tu?: string; den?: string | null }) =>
  db.prepare("INSERT INTO prc_role_tier (id, role_type_code, tier_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(o.id, o.role, o.tier, o.tu ?? "2026-01-01", o.den ?? null, T1, T1);

test("R-PRC-1 (ADR-0117 lần 2): khoá chồng ngày có ĐÍCH MỨC — hai mức khác nhau cùng có dòng «mọi dịch vụ» → 0; cùng mức cùng phạm vi chồng → vi phạm; bảng gắn loại ↔ mức chồng ngày cùng loại → vi phạm", () => {
  const c = one("R-PRC-1");
  const db = build();
  mucTaSdl(db, "TA1");
  mucTaSdl(db, "TA2");
  dongMucTaSdl(db, { id: "u-1", tier: "TA1" });
  dongMucTaSdl(db, { id: "u-2", tier: "TA2" }); // khác mức, cùng ALL, cùng ngày: hợp lệ
  dongMucTaSdl(db, { id: "u-3", tier: "TA1", scope: "SERVICE" }); // cùng mức, khác phạm vi
  mucSdl(db, { id: "m-vai", role: "TRAVEL_AGENCY", scope: "ALL" }); // vai cùng ALL: khác loại đích
  ganMucSdl(db, { id: "g-1", role: "TRAVEL_AGENCY", tier: "TA1", tu: "2026-01-01", den: "2026-06-30" });
  ganMucSdl(db, { id: "g-2", role: "TRAVEL_AGENCY", tier: "TA2", tu: "2026-07-01" }); // đổi mức = nối tiếp
  ganMucSdl(db, { id: "g-3", role: "TAXI_DRIVER", tier: "TA1" }); // loại khác
  assert.equal(violations(db, c), 0, "ca xanh: mọi dòng đích mức / gắn khác khoá hoặc không chồng");
  db.exec("DROP TRIGGER prc_commission_rule_overlap");
  dongMucTaSdl(db, { id: "u-x", tier: "TA1", tu: "2026-05-01" }); // chồng u-1
  assert.equal(violations(db, c), 1, "cùng mức, cùng ALL, chồng");
  db.exec("DROP TRIGGER prc_role_tier_overlap");
  ganMucSdl(db, { id: "g-x", role: "TRAVEL_AGENCY", tier: "TA1", tu: "2026-08-01" }); // chồng g-2 (mở) — cùng loại, khác cả mức
  assert.equal(violations(db, c), 2, "một loại mang hai mức cùng ngày");
});

test("R-PRC-1 (ADR-0138): bảng mức TA gắn RIÊNG — một hồ sơ hai mức riêng chồng ngày (trigger bị gỡ) → vi phạm; nối tiếp / hồ sơ khác → 0", () => {
  const c = one("R-PRC-1");
  const db = build();
  mucTaSdl(db, "TA1");
  mucTaSdl(db, "TA2");
  const P = "pty-hs-rieng";
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Hồ Sơ Riêng', 1, ?, ?)").run(P, T1, T1);
  db.exec("DROP TRIGGER prc_party_tier_party_ok"); // bài chỉ về chồng ngày, không về loại được hưởng
  const ganRiengSdl = (id: string, tier: string, tu: string, den: string | null = null, party = P) =>
    db.prepare("INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, party, tier, tu, den, T1, T1);
  ganRiengSdl("r-1", "TA1", "2026-01-01", "2026-06-30");
  ganRiengSdl("r-2", "TA2", "2026-07-01"); // nối tiếp
  assert.equal(violations(db, c), 0, "ca xanh");
  db.exec("DROP TRIGGER prc_party_tier_overlap");
  ganRiengSdl("r-x", "TA1", "2026-08-01"); // chồng r-2
  assert.equal(violations(db, c), 1, "một hồ sơ hai mức riêng cùng ngày");
});

test("R-PRC-2 (ADR-0117 lần 2): dòng đích mức trỏ mức KHÔNG TỒN TẠI → vi phạm; mức đã TẮT mà dòng còn hiệu lực → 0 (tắt mức chỉ chặn thêm mới, dòng đang áp vẫn áp); dòng đã hết hạn → 0", () => {
  const c = one("R-PRC-2");
  const db = build();
  mucTaSdl(db, "TA1");
  mucTaSdl(db, "TA2");
  dongMucTaSdl(db, { id: "u-1", tier: "TA1" });
  dongMucTaSdl(db, { id: "u-2", tier: "TA2" });
  assert.equal(violations(db, c), 0, "mọi mức đang bật");
  db.prepare("UPDATE prc_rate_tier SET active = 0, updated_at = ? WHERE code = 'TA1'").run(T2); // đường THẬT: tắt mức
  assert.equal(violations(db, c), 0, "mức đã tắt, dòng đang áp vẫn áp — không báo (N-23)");
  // Mức không tồn tại: chỉ lọt được khi gỡ trigger + tắt khoá ngoại (SQL gõ tay).
  db.exec("DROP TRIGGER prc_commission_rule_target_tier");
  db.exec("PRAGMA foreign_keys = OFF");
  dongMucTaSdl(db, { id: "u-ma", tier: "KHONG_CO", scope: "SERVICE" });
  db.exec("PRAGMA foreign_keys = ON");
  assert.equal(violations(db, c), 1, "mức không tồn tại");
  dongDongSdl(db, "prc_commission_rule", "u-ma", vnNgay(-1));
  assert.equal(violations(db, c), 0, "Kế toán đóng dòng (hết hạn từ hôm qua) → hết báo");
});

test("R-PRC-3: điều khoản cung ứng — có tỷ lệ mà người bán là công ty chủ; người bán khác mà không mang vai Nhà cung cấp; người bán khác mà không có tỷ lệ → vi phạm (đủ ba nhánh, mỗi dòng đếm MỘT lần); chỉ xét dòng còn hiệu lực", () => {
  const c = one("R-PRC-3");
  const db = build();
  const chu = chuCongTy(db);
  const ncc = toChucSdl(db, "ncc-1", "SUPPLIER");
  assert.equal(violations(db, c), 0, "dòng gieo sẵn: công ty chủ bán mọi dịch vụ, không tỷ lệ");
  dieuKhoanSdl(db, { id: "t-ok", seller: ncc, cost: 7000, catalog: "S1" }); // nhà cung cấp mang vai + có tỷ lệ
  dieuKhoanSdl(db, { id: "t-ok2", seller: chu, catalog: "S9" }); // công ty chủ bán một dịch vụ, không tỷ lệ
  assert.equal(violations(db, c), 0, "ca xanh");

  // Nhánh 1 — công ty chủ MÀ có tỷ lệ mua lại (trigger supplier_iff chặn).
  assert.throws(() => dieuKhoanSdl(db, { id: "t-1", seller: chu, cost: 5000, catalog: "S2" }), /prc_supplier_mismatch/, "trigger chặn trước");
  db.exec("DROP TRIGGER prc_supply_term_supplier_iff");
  dieuKhoanSdl(db, { id: "t-1", seller: chu, cost: 5000, catalog: "S2" });
  assert.equal(violations(db, c), 1, "nhánh 1: công ty chủ mà ghi tỷ lệ mua lại");

  // Nhánh 2 — người bán khác, có tỷ lệ, nhưng vai Nhà cung cấp đã đóng sau đó (đường thật).
  const ncc2 = toChucSdl(db, "ncc-2", "SUPPLIER");
  dieuKhoanSdl(db, { id: "t-2", seller: ncc2, cost: 6000, catalog: "S3" });
  assert.equal(violations(db, c), 1, "đang mang vai → sạch");
  dongVaiSdl(db, ncc2, "SUPPLIER");
  assert.equal(violations(db, c), 2, "nhánh 2: nhà cung cấp thôi vai mà điều khoản còn mở");

  // Nhánh 3 — người bán khác, mang vai, nhưng không có tỷ lệ (trigger supplier_iff đã gỡ ở trên).
  dieuKhoanSdl(db, { id: "t-3", seller: ncc, catalog: "S4" });
  assert.equal(violations(db, c), 3, "nhánh 3: nhà cung cấp mà không có tỷ lệ");

  // Một dòng sai cả hai vế (không vai, không tỷ lệ) vẫn chỉ đếm MỘT.
  const ncc3 = toChucSdl(db, "ncc-3");
  db.exec("DROP TRIGGER prc_supply_term_seller_role");
  dieuKhoanSdl(db, { id: "t-23", seller: ncc3, catalog: "S5" });
  assert.equal(violations(db, c), 4, "một dòng sai hai vế đếm một lần");

  // Đóng dòng sai → hết báo (dòng cũ nằm lại làm lịch sử; đóng là cách sửa duy nhất vì bảng chỉ-thêm).
  for (const id of ["t-1", "t-2", "t-3", "t-23"]) dongDongSdl(db, "prc_supply_term", id);
  assert.equal(violations(db, c), 0, "đã đóng hết");
});

test("R-PRC-3 + đổi công ty chủ (đặc tả §13, N17): dòng ALL gieo sẵn trỏ công ty cũ → ĐỎ; đóng dòng cũ, mở dòng ALL cho công ty mới → XANH (dòng đóng không báo mãi)", () => {
  const c = one("R-PRC-3");
  const db = build();
  toChucSdl(db, "pty-org-moi");
  assert.equal(violations(db, c), 0);
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-org-moi', 'pty-org-moi', '${OWNER_COMPANY_ROLE}', '2026-09-21', '${T1}', '${T1}')`);
  assert.equal(congTyChu(db), "pty-org-moi", "công ty chủ đã đổi (trigger pty_party_role_owner_company_switch)");
  assert.equal(violations(db, c), 1, "dòng ALL gieo sẵn: người bán không còn là công ty chủ và không có tỷ lệ");
  dongDongSdl(db, "prc_supply_term", "prc-st-goc-all", vnNgay(-1));
  dieuKhoanSdl(db, { id: "t-moi", seller: "pty-org-moi", scope: "ALL", tu: vnNgay(0) });
  assert.equal(violations(db, c), 0, "đóng dòng cũ + mở dòng mới cho công ty mới → hết đỏ");
});

test("R-PRC-4: điều khoản có tỷ lệ mua lại cho nhóm Thuê xe (TXE) hoặc mã đang thuộc nhóm đó → vi phạm (gỡ trigger X3); mã đổi nhóm SAU khi ghi cũng bị bắt; không tỷ lệ / nhóm khác / dòng đóng → 0", () => {
  const c = one("R-PRC-4");
  const db = build();
  const chu = chuCongTy(db);
  const ncc = toChucSdl(db, "ncc-1", "SUPPLIER");
  const dv = (code: string) => db.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, 'Dịch vụ thử', 'perPax', 100000, 1, ?, ?)").run(code, T1, T1);
  const gan = (code: string, seq: number, nhom: string | null) =>
    db.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(`g-${code}-${seq}`, code, nhom, seq, T1, T1, T1);
  dv("ZH1"); gan("ZH1", 1, "TDA");
  dv("XE1"); gan("XE1", 1, "TXE");
  dieuKhoanSdl(db, { id: "t-ok", seller: ncc, cost: 7000, catalog: "ZH1" }); // có tỷ lệ, dịch vụ thường
  dieuKhoanSdl(db, { id: "t-ok-nhom", seller: ncc, cost: 7000, scope: "GROUP", group: "TDA" }); // có tỷ lệ, cả nhóm thường
  dieuKhoanSdl(db, { id: "t-chu-ma", seller: chu, catalog: "XE1" }); // công ty chủ bán mã Thuê xe — không tỷ lệ
  assert.equal(violations(db, c), 0, "ca xanh: tỷ lệ chỉ ở dịch vụ / nhóm thường; Thuê xe chỉ do công ty chủ bán, không tỷ lệ");

  assert.throws(() => dieuKhoanSdl(db, { id: "t-x", seller: ncc, cost: 5000, scope: "GROUP", group: "TXE" }), /prc_transfer_no_supplier/, "trigger X3 chặn trước");
  db.exec("DROP TRIGGER prc_supply_term_x3");
  dieuKhoanSdl(db, { id: "t-a", seller: ncc, cost: 5000, scope: "GROUP", group: "TXE" });
  assert.equal(violations(db, c), 1, "tỷ lệ cho CẢ nhóm TXE");
  dv("XE2"); gan("XE2", 1, "TXE");
  dieuKhoanSdl(db, { id: "t-b", seller: ncc, cost: 5000, catalog: "XE2" });
  assert.equal(violations(db, c), 2, "tỷ lệ cho mã đang thuộc nhóm TXE (qua v_ctl_service_group)");
  // Đổi nhóm SAU khi ghi (trigger X3 chỉ chạy lúc chèn điều khoản): ZH1 chuyển sang TXE → dòng t-ok trở thành sai; chuyển về → hết.
  gan("ZH1", 2, "TXE");
  assert.equal(violations(db, c), 3, "mã bị chuyển sang TXE sau khi đã ghi tỷ lệ");
  gan("ZH1", 3, "TDA");
  assert.equal(violations(db, c), 2, "nhóm hiện hành = dòng seq lớn nhất: chuyển về TDA → hết");
  dongDongSdl(db, "prc_supply_term", "t-a");
  dongDongSdl(db, "prc_supply_term", "t-b");
  assert.equal(violations(db, c), 0, "đóng hai dòng sai → hết");
});

test("R-PRC-5: dòng mức còn hiệu lực hôm nay theo hồ sơ mà hồ sơ không còn vai được hưởng nào (đóng vai / vai bị tắt) → vi phạm; còn vai khác / dòng đã hết hạn / chưa tới ngày hiệu lực / theo vai → 0", () => {
  const c = one("R-PRC-5");
  const db = build();
  toChucSdl(db, "dl-1", "TRAVEL_AGENCY");
  mucSdl(db, { id: "m-1", party: "dl-1", scope: "ALL" });
  mucSdl(db, { id: "m-vai", role: "TAXI_DRIVER", scope: "ALL" }); // theo vai: không thuộc kiểm này (R-PRC-2 lo)
  assert.equal(violations(db, c), 0, "hồ sơ còn vai Công ty lữ hành");
  vaiSdl(db, "dl-1", "COLLABORATOR");
  dongVaiSdl(db, "dl-1", "TRAVEL_AGENCY");
  assert.equal(violations(db, c), 0, "đóng một vai nhưng còn vai được hưởng khác → vẫn được hưởng");
  dongVaiSdl(db, "dl-1", "COLLABORATOR");
  assert.equal(violations(db, c), 1, "đóng hết vai được hưởng");
  vaiSdl(db, "dl-1", "GUIDE_FREELANCE");
  assert.equal(violations(db, c), 0, "mở lại một vai được hưởng → hết");
  db.prepare("UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'GUIDE_FREELANCE'").run(T2);
  assert.equal(violations(db, c), 1, "vai còn mở nhưng đã bị gỡ khỏi danh sách được hưởng");
  dongDongSdl(db, "prc_commission_rule", "m-1", vnNgay(-1));
  assert.equal(violations(db, c), 0, "dòng mức đã hết hạn hôm qua → không còn hiệu lực hôm nay");
  toChucSdl(db, "dl-2", "TRAVEL_AGENCY");
  mucSdl(db, { id: "m-2", party: "dl-2", scope: "ALL", tu: vnNgay(1) }); // bắt đầu NGÀY MAI — chưa còn hiệu lực hôm nay
  mucSdl(db, { id: "m-3", party: "dl-2", scope: "SERVICE", catalog: "S1", tu: "2026-01-01", den: vnNgay(0) }); // hết hạn HÔM NAY — còn hiệu lực hôm nay
  dongVaiSdl(db, "dl-2", "TRAVEL_AGENCY"); // hồ sơ thôi hợp tác SAU khi mức đã ghi
  assert.equal(violations(db, c), 1, "ngày kết thúc = hôm nay vẫn còn hiệu lực; dòng bắt đầu ngày mai chưa tính");
});

test("R-PRC-5 (ADR-0138): mức TA gắn RIÊNG còn hiệu lực hôm nay trên hồ sơ đã thôi mọi vai được hưởng → cảnh báo; còn vai / gắn đã đóng / chưa tới ngày → 0", () => {
  const c = one("R-PRC-5");
  const db = build();
  mucTaSdl(db, "TA2");
  toChucSdl(db, "dl-r", "TRAVEL_AGENCY");
  const ganRiengSdl = (id: string, tu: string, den: string | null = null) =>
    db.prepare("INSERT INTO prc_party_tier (id, party_id, tier_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, 'dl-r', 'TA2', ?, ?, ?, ?)").run(id, tu, den, T1, T1);
  ganRiengSdl("g-1", "2026-01-01", vnNgay(-1)); // đã đóng hôm qua
  ganRiengSdl("g-2", vnNgay(1)); // bắt đầu ngày mai
  assert.equal(violations(db, c), 0, "hồ sơ còn vai được hưởng");
  dongVaiSdl(db, "dl-r", "TRAVEL_AGENCY");
  assert.equal(violations(db, c), 0, "gắn đã đóng / chưa tới ngày: không tính");
  db.exec("DROP TRIGGER prc_party_tier_overlap");
  db.exec("DROP TRIGGER prc_party_tier_party_ok"); // gắn mới trên hồ sơ đã thôi vai chỉ đi được bằng SQL tay — đúng thứ kiểm này bắt
  ganRiengSdl("g-3", "2026-02-01", vnNgay(0)); // hết hạn HÔM NAY — còn hiệu lực
  assert.equal(violations(db, c), 1, "hồ sơ thôi vai mà mức riêng còn hiệu lực hôm nay");
});

test("R-PRC-6 (ADR-0117 lần 1): hồ sơ mang loại đối tác còn vai/quyền nội bộ, hoặc danh sách được hưởng chứa vai nội bộ / OTHER không nhãn → vi phạm; dữ liệu đi đường thật → 0", () => {
  const c = one("R-PRC-6");
  assert.equal(c.level, "fail");
  const db = build();
  assert.equal(violations(db, c), 0, "CSDL khoẻ");
  db.prepare("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('NHAN_A', 'Loại nhãn A', 40, 'OTHER', 1)").run();
  db.prepare("INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, updated_at) VALUES ('NHAN_A', 1, ?, ?)").run(T1, T1);
  toChucSdl(db, "dt-1", "NHAN_A");
  assert.equal(violations(db, c), 0, "hồ sơ chỉ mang loại nhãn; loại nhãn nằm trong danh sách được hưởng");
  // Nhánh (i-a): vai nội bộ lọt vào hồ sơ mang nhãn (gỡ trigger để dựng ca lậu như SQL gõ tay).
  db.exec("DROP TRIGGER pty_party_role_partner_label_conflict_ins");
  vaiSdl(db, "dt-1", "SALES_STAFF");
  assert.equal(violations(db, c), 1, "vai nhóm INTERNAL đang mở cùng loại nhãn");
  dongVaiSdl(db, "dt-1", "SALES_STAFF");
  assert.equal(violations(db, c), 0, "đóng vai nội bộ → hết");
  vaiSdl(db, "dt-1", "STAFF");
  assert.equal(violations(db, c), 1, "vai cũ STAFF (nhóm OTHER nhưng tính là nội bộ, như trigger) cùng loại nhãn");
  dongVaiSdl(db, "dt-1", "STAFF");
  // Nhánh (i-b): tài khoản của hồ sơ mang nhãn giữ quyền nội bộ.
  db.exec("DROP TRIGGER adr0117_permission_partner_label_internal");
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s-dt', '', '0901000099', 'x', 'sales', 1, ?, 'dt-1')").run(T1);
  const quyen = (id: string, ma: string) => db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, 's-dt', ?, ?, ?, ?)").run(id, ma, T1, T1, T1);
  quyen("stp-dt-p", "PARTNER");
  assert.equal(violations(db, c), 0, "tài khoản chỉ giữ quyền Đối tác");
  quyen("stp-dt-s", "SALES");
  assert.equal(violations(db, c), 1, "tài khoản của hồ sơ mang nhãn giữ quyền Bán hàng (một hồ sơ chỉ đếm MỘT lần dù nhiều dấu hiệu)");
  vaiSdl(db, "dt-1", "DIRECTOR");
  assert.equal(violations(db, c), 1, "cả vai lẫn quyền nội bộ vẫn là một hồ sơ");
  db.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE id = 'stp-dt-s'").run(T2);
  dongVaiSdl(db, "dt-1", "DIRECTOR");
  assert.equal(violations(db, c), 0, "đóng quyền và vai nội bộ → hết");
  // Nhánh (ii): danh sách được hưởng chứa vai nội bộ / vai OTHER không phải loại nhãn.
  db.exec("DROP TRIGGER prc_beneficiary_role_kind");
  db.prepare("INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, updated_at) VALUES ('SALES_STAFF', 0, ?, ?)").run(T1, T1);
  assert.equal(violations(db, c), 1, "vai nội bộ trong danh sách (kể cả dòng đang tắt — bật lại bằng UPDATE là xong)");
  db.prepare("INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, updated_at) VALUES ('CUSTOMER', 1, ?, ?)").run(T1, T1);
  assert.equal(violations(db, c), 2, "vai nhóm OTHER không phải loại nhãn");
  db.exec("DROP TRIGGER prc_beneficiary_role_no_delete"); // dọn dòng lậu bằng SQL tay (đường thường chỉ tắt được active, và kiểm này đếm cả dòng tắt)
  db.prepare("DELETE FROM prc_beneficiary_role WHERE role_type_code IN ('SALES_STAFF', 'CUSTOMER')").run();
  assert.equal(violations(db, c), 0, "gỡ hai dòng sai → hết; năm vai EXTERNAL gieo sẵn và loại nhãn không bị tính");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-ORD-T1 / R-ORD-T1w / R-ORD-T2 — bản chụp thương mại của đơn (đặc tả §5, §9). Mốc của R-ORD-T1 = ord_audit_cutoff 'R-ORD-T1' = LÚC ÁP MIGRATION, tức lúc
// bài chạy: bài đọc mốc từ CSDL rồi dựng giờ xác nhận tương đối (trước mốc, trong ân hạn, sát ngưỡng, sau ân hạn) — không viết cứng ngày.
// ---------------------------------------------------------------------------------------------------------------------
const PHUT_MS = 60_000;
const mocT1Ms = (db: DatabaseSync): number => Date.parse(String((db.prepare("SELECT cutoff_at FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'").get() as { cutoff_at: string }).cutoff_at));
/** Đơn `id` ở trạng thái xác nhận lúc `luc` (null = không có mốc xác nhận, như đơn chèn thẳng bằng SQL) với `n` dòng dịch vụ; trả mã các dòng dịch vụ. `tao` = ngày tạo đơn. */
function donXacNhanSdl(db: DatabaseSync, id: string, luc: string | null, n = 1, tao = T1): string[] {
  db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 's-an', 'draft', 'K', '0900000009', ?, ?)`).run(id, `TD-${id}`, tao, tao);
  const dv: string[] = [];
  for (let i = 1; i <= n; i++) {
    dv.push(`sv-${id}-${i}`);
    // ngày khởi hành + số khách: trigger `incomplete_trip` đòi hai thứ này mới cho đơn sang 'confirmed'
    db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, 'S1', 'Tour', 'perPax', 1, '2026-09-30')").run(dv[i - 1], id, i);
  }
  db.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(luc, id);
  return dv;
}
let soBanChup = 0;
interface BanChupSdl { dv: string; supersedes?: string | null; manual?: { reason: string | null; rate?: number | null; perPax?: number | null; kind?: "RATE" | "PER_PAX" } }
/**
 * Bản chụp của dòng dịch vụ `dv` (đơn phải đã xác nhận). Không `manual` = bản AUTO gọn nhất (không hoa hồng, chưa có người bán); có `manual` = bản MANUAL ghi
 * mức hoa hồng tay (cần hồ sơ 'dl-bc' làm người hưởng). Trả mã bản chụp.
 */
function banChupSdl(db: DatabaseSync, o: BanChupSdl): string {
  const id = `bc-${++soBanChup}`;
  const order = (db.prepare("SELECT order_id FROM order_service WHERE id = ?").get(o.dv) as { order_id: string }).order_id;
  const m = o.manual;
  db.prepare(
    `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
       commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date,
       created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, 'MISSING', NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(id, order, o.dv, m ? "dl-bc" : null, m ? "SET" : "NONE", m ? (m.kind ?? "RATE") : null, m?.rate ?? null, m?.perPax ?? null, m ? "MANUAL" : "AUTO", m ? m.reason : null, o.supersedes ?? null, vnNgay(0), T1, T1);
  return id;
}
/** Chạy `f` với CHECK tắt (R-ORD-T2: ràng buộc bị phá nằm ở CHECK, không ở trigger — chỉ SQL tay lách được). */
function boCheck<T>(db: DatabaseSync, f: () => T): T {
  db.exec("PRAGMA ignore_check_constraints = ON");
  try {
    return f();
  } finally {
    db.exec("PRAGMA ignore_check_constraints = OFF");
  }
}

test("R-ORD-T1 + R-ORD-T1w: đơn trước mốc / trong ân hạn thiếu chụp ⇒ chỉ CẢNH BÁO (T1w liệt kê mã đơn); sát ngưỡng vẫn là ân hạn; từ ngưỡng (mốc + 60 phút) thiếu chụp ⇒ LỖI; đủ chụp ⇒ xanh", () => {
  const t1 = one("R-ORD-T1");
  const w = one("R-ORD-T1w");
  const db = build();
  const moc = mocT1Ms(db);
  const luc = (phut: number) => isoMs(moc + phut * PHUT_MS);
  const dem = () => [violations(db, t1), violations(db, w)];
  assert.deepEqual(dem(), [0, 0], "chưa đơn nào");

  donXacNhanSdl(db, "o-truoc", luc(-24 * 60)); // xác nhận bằng bản cũ, từ trước migration
  assert.deepEqual(dem(), [0, 1], "trước mốc, thiếu chụp ⇒ không lỗi, có cảnh báo");
  donXacNhanSdl(db, "o-anha", luc(30)); // khoảng migration → deploy
  assert.deepEqual(dem(), [0, 2], "trong ân hạn, thiếu chụp ⇒ không lỗi, có cảnh báo");
  donXacNhanSdl(db, "o-sat", isoMs(moc + 60 * PHUT_MS - 1)); // 1 mili-giây trước hết ân hạn
  assert.deepEqual(dem(), [0, 3], "sát ngưỡng vẫn là ân hạn");
  donXacNhanSdl(db, "o-nguong", luc(60)); // đúng ngưỡng: "≥ mốc + 60 phút"
  assert.deepEqual(dem(), [1, 3], "đúng ngưỡng ⇒ lỗi");
  donXacNhanSdl(db, "o-sau", luc(120));
  assert.deepEqual(dem(), [2, 3], "sau ân hạn, thiếu chụp ⇒ LỖI (và không còn nằm trong danh sách cảnh báo)");
  const [dvDu1, dvDu2] = donXacNhanSdl(db, "o-du", luc(120), 2);
  banChupSdl(db, { dv: dvDu1! });
  banChupSdl(db, { dv: dvDu2! });
  assert.deepEqual(dem(), [2, 3], "sau ân hạn, ĐỦ chụp (cả hai dòng dịch vụ) ⇒ xanh");
  const [dvNua1] = donXacNhanSdl(db, "o-nua", luc(180), 2);
  banChupSdl(db, { dv: dvNua1! });
  assert.deepEqual(dem(), [3, 3], "đơn hai dịch vụ mới chụp một dòng ⇒ đếm theo DÒNG dịch vụ còn thiếu (1)");

  // Chụp bù về sau (đợt 2) làm cảnh báo hết — mỗi ca cũ hết khi dòng dịch vụ có bản chụp hiện hành.
  banChupSdl(db, { dv: "sv-o-truoc-1" });
  banChupSdl(db, { dv: "sv-o-anha-1" });
  assert.deepEqual(dem(), [3, 1], "hai đơn được chụp bù ⇒ T1w còn đúng một đơn (o-sat)");
  const hang = db.prepare(w.sql.replace(/\s+/g, " ").trim()).all() as Record<string, unknown>[];
  assert.deepEqual(hang.map((r) => Object.values(r)), [["TD-o-sat"]], "T1w liệt kê MÃ ĐƠN (order_code), mỗi đơn một dòng");
});

test("R-ORD-T1 + R-ORD-T1w: chỉ đơn ĐÃ XÁC NHẬN; T1w bỏ đơn đã Đã giao; mốc xác nhận thiếu lấy ngày tạo (như R-ORD-15); hai bản hiện hành hoặc thiếu hẳn đều là lỗi, bản MANUAL thay AUTO vẫn đúng một", () => {
  const t1 = one("R-ORD-T1");
  const w = one("R-ORD-T1w");
  const db = build();
  toChucSdl(db, "dl-bc");
  const moc = mocT1Ms(db);
  const luc = (phut: number) => isoMs(moc + phut * PHUT_MS);
  const dem = () => [violations(db, t1), violations(db, w)];

  // đơn nháp có dịch vụ (kể cả tạo sau ân hạn) không xét
  addOrder(db, "o-nhap");
  db.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult) VALUES ('sv-nhap', 'o-nhap', 0, 'S1', 'Tour', 'perPax', 1)").run();
  assert.deepEqual(dem(), [0, 0], "đơn nháp không phải đối tượng của kiểm này");

  // đơn Đã giao thiếu chụp trong ân hạn: không vào danh sách cảnh báo (việc chụp bù chỉ làm cho đơn chưa giao); sau ân hạn vẫn là lỗi
  donXacNhanSdl(db, "o-giao-anha", luc(10));
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-giao-anha'").run(luc(20));
  assert.deepEqual(dem(), [0, 0], "đơn đã Đã giao, trong ân hạn ⇒ không cảnh báo");
  donXacNhanSdl(db, "o-giao-sau", luc(100));
  db.prepare("UPDATE orders SET delivered_at = ?, delivered_by = 's-an' WHERE id = 'o-giao-sau'").run(luc(110));
  assert.deepEqual(dem(), [1, 0], "đơn Đã giao sau ân hạn thiếu chụp ⇒ vẫn là lỗi");

  // đơn không có mốc xác nhận (chèn thẳng): lấy ngày tạo — cũ ⇒ cảnh báo; tạo sau ân hạn ⇒ lỗi
  donXacNhanSdl(db, "o-khong-moc-cu", null);
  assert.deepEqual(dem(), [1, 1], "không mốc xác nhận, tạo từ trước ⇒ cảnh báo (đơn cũ)");
  donXacNhanSdl(db, "o-khong-moc-moi", null, 1, luc(300));
  assert.deepEqual(dem(), [2, 1], "không mốc xác nhận, tạo sau ân hạn ⇒ lỗi");

  // bản MANUAL thay bản AUTO: vẫn đúng MỘT bản hiện hành
  const [dv] = donXacNhanSdl(db, "o-chuoi", luc(120));
  const goc = banChupSdl(db, { dv: dv! });
  banChupSdl(db, { dv: dv!, supersedes: goc, manual: { reason: "Kế toán chỉnh theo hợp đồng", rate: 1000 } });
  assert.deepEqual(dem(), [2, 1], "chuỗi AUTO → MANUAL có đúng một bản hiện hành ⇒ xanh");
  // hai bản gốc cùng một dòng dịch vụ (chỉ tạo được khi gỡ trigger one_current): hai bản hiện hành ⇒ lỗi
  assert.throws(() => banChupSdl(db, { dv: dv! }), /terms_one_current/, "trigger chặn trước");
  db.exec("DROP TRIGGER ord_service_terms_one_current");
  banChupSdl(db, { dv: dv! });
  assert.deepEqual(dem(), [3, 1], "hai bản hiện hành ⇒ lỗi (không phải đúng một)");
});

test("R-ORD-T1 không tự tắt: mốc ord_audit_cutoff 'R-ORD-T1' mất (chỉ khi bỏ trigger chặn xoá) ⇒ LỖI — cách cũ 'bản chụp đầu + 15 phút' im lặng xanh khi không ai chụp (N4)", () => {
  const t1 = one("R-ORD-T1");
  const db = build();
  assert.equal(violations(db, t1), 0);
  assert.throws(() => db.exec("DELETE FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'"), /terms_append_only/, "trigger chặn trước");
  db.exec("DROP TRIGGER ord_audit_cutoff_no_delete");
  db.exec("DELETE FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'");
  assert.equal(violations(db, t1), 1, "không còn mốc ⇒ không thể phân vùng ⇒ báo lỗi, không im lặng");
});

test("R-ORD-T2: bản MANUAL có lý do rỗng (NULL / trống / chỉ khoảng trắng), bản SET không có ĐÚNG MỘT trong tỷ lệ / đ mỗi khách → vi phạm (CHECK bị tắt tạm); bản hợp lệ → 0; mỗi dòng đếm một lần", () => {
  const c = one("R-ORD-T2");
  const db = build();
  toChucSdl(db, "dl-bc");
  const moc = mocT1Ms(db);
  let n = 0;
  /** Một đơn có bản AUTO gốc + một bản MANUAL thay thế do `manual` mô tả (chèn dưới CHECK tắt nếu `lach`). */
  const chuoi = (manual: NonNullable<BanChupSdl["manual"]>, lach: boolean): void => {
    const [dv] = donXacNhanSdl(db, `o-t2-${++n}`, isoMs(moc - 3_600_000));
    const goc = banChupSdl(db, { dv: dv! });
    if (lach) boCheck(db, () => banChupSdl(db, { dv: dv!, supersedes: goc, manual }));
    else banChupSdl(db, { dv: dv!, supersedes: goc, manual });
  };
  chuoi({ reason: "Kế toán ghi mức tay có lý do", rate: 1250 }, false);
  chuoi({ reason: "Kế toán ghi mức tay có lý do", kind: "PER_PAX", perPax: 50000 }, false);
  assert.equal(violations(db, c), 0, "ca xanh: MANUAL có lý do, SET đúng một trong hai");

  assert.throws(() => chuoi({ reason: "", rate: 1250 }, false), /CHECK constraint/, "CHECK chặn trước");
  chuoi({ reason: "", rate: 1250 }, true);
  assert.equal(violations(db, c), 1, "lý do trống");
  chuoi({ reason: null, rate: 1250 }, true);
  assert.equal(violations(db, c), 2, "lý do NULL");
  chuoi({ reason: "     ", rate: 1250 }, true);
  assert.equal(violations(db, c), 3, "lý do chỉ có khoảng trắng");
  chuoi({ reason: "Kế toán ghi mức tay có lý do", rate: 1250, perPax: 50000 }, true);
  assert.equal(violations(db, c), 4, "SET mang CẢ tỷ lệ lẫn đ mỗi khách");
  chuoi({ reason: "Kế toán ghi mức tay có lý do" }, true);
  assert.equal(violations(db, c), 5, "SET không mang số nào");
  chuoi({ reason: "", rate: 1250, perPax: 50000 }, true);
  assert.equal(violations(db, c), 6, "một dòng sai hai vế vẫn đếm một lần");
});

// ---------------------------------------------------------------------------------------------------------------------
// R-KY-1 / R-KY-2 — khoá tháng (đặc tả §8, §9; ADR-0080 D1). Trigger `*_period_closed` chặn ghi vào tháng đã khoá; kiểm này là lưới cho dòng lọt qua (trigger bị gỡ /
// SQL tay). Mọi dòng ở đây có ngày phát sinh trong tháng 2026-09.
// ---------------------------------------------------------------------------------------------------------------------
const KHOA_08 = "2026-09-05T00:00:00.000Z";
const KHOA_09 = "2026-10-02T00:00:00.000Z";
const SAU_KHOA_09 = "2026-10-03T00:00:00.000Z";
function khoaThangSdl(db: DatabaseSync, period: string, luc: string): void {
  db.prepare("INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 's-an', NULL, ?, NULL, ?, NULL)").run(period, luc, luc, luc);
}

test("R-KY-1 (sổ tiền): lần thu / phiếu sổ / hoàn ngoài ghi SAU lúc khoá tháng của ngày phát sinh → vi phạm (gỡ đúng trigger *_period_closed của bảng); ghi trước khi khoá, ghi vào tháng mở, ghi đúng lúc khoá → 0", () => {
  const c = one("R-KY-1");
  const db = build();
  donBil(db, "o-ky");
  // Ba trigger của luồng hoàn ngoài hệ thống (đơn huỷ cũ, một dòng, trong số còn giữ) không liên quan tới kiểm này — gỡ để dựng dòng thô.
  for (const t of ["bil_outside_refund_legacy", "bil_outside_refund_once", "bil_outside_refund_record_within"]) db.exec(`DROP TRIGGER ${t}`);
  const hoanNgoai = (id: string, ngay: string, luc: string) =>
    db.prepare(`INSERT INTO bil_outside_refund (id, order_id, kind_code, amount, reason, target_id, occurred_date, created_at, created_by, updated_at, updated_by)
                VALUES (?, 'o-ky', 'RECORD', 1000, 'Đã hoàn ngoài hệ thống', NULL, ?, ?, 's-an', ?, 's-an')`).run(id, ngay, luc, luc);
  assert.equal(violations(db, c), 0, "chưa tháng nào khoá");

  // Ghi TRƯỚC khi khoá (hợp lệ): tháng 2026-09, ghi lúc 2026-09-30.
  lanThuBil(db, { id: "r-ky-1", order: "o-ky", amount: 1000, at: BIL_AT });
  phieuBil(db, { id: "p-ky-1", order: "o-ky", kind: "RECEIPT", at: BIL_AT });
  hoanNgoai("ro-ky-1", "2026-09-30", BIL_AT);
  khoaThangSdl(db, "2026-08", KHOA_08); // tháng 8 khoá sớm hơn — chứng tỏ câu kiểm so ĐÚNG tháng của dòng, không so với mốc khoá nào đó
  khoaThangSdl(db, "2026-09", KHOA_09);
  assert.equal(violations(db, c), 0, "ghi lúc 2026-09-30, khoá 2026-10-02 ⇒ hợp lệ (và lúc ghi lớn hơn mốc khoá của tháng 8 vẫn không sao)");
  hoanNgoai("ro-ky-thang10", "2026-10-05", SAU_KHOA_09); // tháng 10 đang mở: ghi sau mốc khoá tháng 9 là bình thường
  assert.equal(violations(db, c), 0, "ghi vào tháng đang mở sau lúc khoá tháng trước ⇒ hợp lệ");

  // Mỗi bảng: trigger chặn trước; gỡ ĐÚNG trigger của bảng đó, chèn dòng thuộc tháng 9 mà ghi sau lúc khoá ⇒ đếm.
  assert.throws(() => lanThuBil(db, { id: "r-ky-2", order: "o-ky", amount: 1000, at: SAU_KHOA_09 }), /period_closed/, "trigger lần thu chặn trước");
  db.exec("DROP TRIGGER bil_payment_receipt_period_closed");
  lanThuBil(db, { id: "r-ky-2", order: "o-ky", amount: 1000, at: KHOA_09 }); // ghi ĐÚNG lúc khoá (không lớn hơn)
  assert.equal(violations(db, c), 0, "ghi đúng lúc khoá ⇒ chưa vi phạm (so lớn hơn hẳn)");
  lanThuBil(db, { id: "r-ky-3", order: "o-ky", amount: 1000, at: SAU_KHOA_09 });
  assert.equal(violations(db, c), 1, "lần thu ghi sau khoá");
  assert.throws(() => phieuBil(db, { id: "p-ky-2", order: "o-ky", kind: "RECEIPT", at: SAU_KHOA_09 }), /period_closed/, "trigger phiếu chặn trước");
  db.exec("DROP TRIGGER bil_posting_period_closed");
  phieuBil(db, { id: "p-ky-2", order: "o-ky", kind: "RECEIPT", at: SAU_KHOA_09 });
  assert.equal(violations(db, c), 2, "phiếu sổ ghi sau khoá");
  assert.throws(() => hoanNgoai("ro-ky-2", "2026-09-30", SAU_KHOA_09), /period_closed/, "trigger hoàn ngoài chặn trước");
  db.exec("DROP TRIGGER bil_outside_refund_period_closed");
  hoanNgoai("ro-ky-2", "2026-09-30", SAU_KHOA_09);
  assert.equal(violations(db, c), 3, "hoàn ngoài ghi sau khoá");
});

test("R-KY-1 (chi phí xe): dòng chi phí chuyến ghi SAU lúc khoá tháng của ngày phát sinh → vi phạm; ghi trước khoá / đúng lúc khoá → 0", () => {
  const c = one("R-KY-1");
  const db = tho(); // dựng thô: đã gỡ trigger của vc_trip_cost_line (kể cả vc_trip_cost_line_period_closed) — như SQL gõ tay trên D1
  const trip = chuyenTho(db);
  cpTho(db, { trip, kind: "AGREED", amount: 1_350_000, at: T2 }); // phát sinh 2026-09-21, ghi 2026-09-21
  khoaThangSdl(db, "2026-09", KHOA_09);
  assert.equal(violations(db, c), 0, "ghi trước khi khoá");
  cpTho(db, { trip, kind: "ADJUSTMENT", amount: 5000, at: KHOA_09 });
  assert.equal(violations(db, c), 0, "ghi đúng lúc khoá");
  cpTho(db, { trip, kind: "ADJUSTMENT", amount: 5000, at: SAU_KHOA_09 });
  assert.equal(violations(db, c), 1, "chi phí xe ghi sau khoá tháng của ngày phát sinh");
});

test("R-KY-2: các tháng đã khoá liền nhau (kể cả qua năm) → 0; có tháng hở (chỉ tạo được khi gỡ trigger ky_period_close_adjacent) → đếm tháng đứng sau chỗ hở", () => {
  const c = one("R-KY-2");
  const db = build();
  assert.equal(violations(db, c), 0, "chưa tháng nào khoá");
  khoaThangSdl(db, "2025-12", "2026-01-02T00:00:00.000Z");
  assert.equal(violations(db, c), 0, "một tháng");
  khoaThangSdl(db, "2026-01", "2026-02-02T00:00:00.000Z"); // qua năm: 2025-12 → 2026-01
  khoaThangSdl(db, "2026-02", "2026-03-02T00:00:00.000Z");
  assert.equal(violations(db, c), 0, "ba tháng liền nhau, qua ranh giới năm");
  assert.throws(() => khoaThangSdl(db, "2026-04", "2026-05-02T00:00:00.000Z"), /period_not_adjacent/, "trigger chặn trước");
  db.exec("DROP TRIGGER ky_period_close_adjacent");
  khoaThangSdl(db, "2026-04", "2026-05-02T00:00:00.000Z"); // hở: thiếu 2026-03
  assert.equal(violations(db, c), 1, "2026-04 đứng sau chỗ hở");
  khoaThangSdl(db, "2026-05", "2026-06-02T00:00:00.000Z"); // nối tiếp 2026-04: không thêm vi phạm
  assert.equal(violations(db, c), 1, "tháng nối tiếp tháng sau chỗ hở không bị tính thêm");
  khoaThangSdl(db, "2026-08", "2026-09-02T00:00:00.000Z"); // hở thứ hai: thiếu 06, 07
  assert.equal(violations(db, c), 2, "chỗ hở thứ hai");
});

// ---------------------------------------------------------------------------------------------------------------------
// Hàng rào «tách câu của wrangler» (Task 9, vòng sửa 1, I-1). `scripts/audit-invariants.mjs` gộp MỌI câu kiểm vào MỘT chuỗi `--command` rồi `wrangler d1 execute` tách chuỗi đó
// lại bằng `splitSqlQuery` (src/d1/splitter.ts của wrangler). Bộ tách coi ` CASE ` / ` BEGIN ` (có khoảng trắng phía trước) là chỗ MỞ một khối và chỉ nhận ` END ` /
// ` END;` (sau END là khoảng trắng hoặc dấu chấm phẩy) là chỗ ĐÓNG — `END)` KHÔNG đóng, nên mọi dấu `;` phía sau bị nuốt, số kết quả ít hơn số kiểm, script thoát mã 2
// «Kết quả không khớp số kiểm» (lỗi thật bắt được ở R-ORD-T1: `… THEN 0 ELSE 1 END)`). Bài chạy CHÍNH hàm tách đó và so với `CHECKS.length`.
// Chọn dùng hàm tách THẬT của wrangler (xuất công khai là `unstable_splitSqlQuery`, kiểm ở wrangler-dist/cli.js: `exports.unstable_splitSqlQuery = splitSqlQuery`) thay vì mô phỏng hai
// biểu thức chính quy `isCompoundStatementStart` / `isCompoundStatementEnd`: mô phỏng có thể lệch khi wrangler đổi; hàm thật thì bài luôn kiểm đúng cái wrangler sẽ làm.
// ---------------------------------------------------------------------------------------------------------------------
test("tách câu của wrangler: chuỗi `--command` mà script gửi tách ra ĐÚNG bằng số kiểm, từng câu nguyên vẹn (không ` CASE … END)` / ` BEGIN … END)` nuốt dấu ;)", async () => {
  // Dựng lại ĐÚNG cách script nối câu — và khoá để script không đổi cách nối mà bài không hay.
  const GHEP = 'CHECKS.map(({ sql }) => `${sql.replace(/\\s+/g, " ").trim()};`).join(" ")';
  const script = readFileSync(new URL("../scripts/audit-invariants.mjs", import.meta.url), "utf8");
  assert.ok(script.includes(`"--command", ${GHEP}`), "script phải nối câu đúng cách bài này dựng lại — đổi cách nối thì sửa cả bài này");
  const chuoi = CHECKS.map(({ sql }) => `${sql.replace(/\s+/g, " ").trim()};`).join(" ");

  const { unstable_splitSqlQuery: tach } = (await import("wrangler")) as unknown as { unstable_splitSqlQuery: (sql: string) => string[] };
  assert.equal(typeof tach, "function", "wrangler phải xuất hàm tách câu (unstable_splitSqlQuery) — nếu đổi tên thì cập nhật bài này");
  const cau = tach(chuoi);
  if (cau.length !== CHECKS.length) {
    // chỉ ra kiểm đầu tiên bị nuốt dấu ; : câu tách ra thứ i không còn là câu kiểm thứ i
    const lech = cau.findIndex((c, i) => c !== CHECKS[i]!.sql.replace(/\s+/g, " ").trim());
    assert.fail(`wrangler tách ${cau.length} câu, phải đúng ${CHECKS.length} (một câu kiểm một kết quả); lệch đầu tiên ở kiểm ${CHECKS[lech]?.code ?? "?"} — kiểm tra ' CASE ' / ' BEGIN ' mà phần đóng là 'END)' (viết 'END )' hoặc bỏ CASE)`);
  }
  CHECKS.forEach((c, i) => assert.equal(cau[i], c.sql.replace(/\s+/g, " ").trim(), `câu tách thứ ${i} (${c.code}) phải là nguyên câu kiểm`));
});

// ---------------------------------------------------------------------------------------------------------------------
// R-DSP-4 (LC-8 mới, ADR-0030 điều 1 + điều 4): đơn từng có người phụ trách mà nay không có ai phải do chính người phụ trách Từ chối — dòng HANDLE đóng
// cuối cùng (theo `updated_at` = mốc lệnh, KHÔNG `valid_to_at` vì `max(at, valid_from_at)`) có dòng nhật ký `order_handler_refused` CÙNG mốc.
// ---------------------------------------------------------------------------------------------------------------------
function lc8(dung: (db: DatabaseSync) => void): number {
  const db = build();
  addOrder(db, "o-1");
  dung(db);
  return violations(db, one("R-DSP-4"));
}
const dongLuc = (db: DatabaseSync, id: string, at: string) => db.prepare("UPDATE dsp_assignment SET valid_to_at = max(?, valid_from_at), updated_at = ? WHERE id = ?").run(at, at, id);
const nhatKyTuChoi = (db: DatabaseSync, at: string, order = "o-1") =>
  db.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 's-an', 'order_handler_refused', 'order', ?, 'Bận lịch khác', ?)").run(`l-${order}-${at}`, order, order, at);

test("R-DSP-4: (a) đơn có dòng HANDLE đã đóng, không dòng mở, không có Từ chối ở lần đóng cuối → 1 (đóng ngoài đường Từ chối)", () => {
  assert.equal(lc8((db) => { addRow(db, { id: "h1", order: "o-1", party: "pty-s-an", from: T1, to: null }); dongLuc(db, "h1", T2); }), 1);
  // Từ chối ở lần đóng TRƯỚC, rồi được giao lại và lần đóng CUỐI không phải Từ chối → vẫn 1.
  assert.equal(lc8((db) => {
    addRow(db, { id: "h1", order: "o-1", party: "pty-s-an", from: T1, to: null }); dongLuc(db, "h1", T2); nhatKyTuChoi(db, T2);
    addRow(db, { id: "h2", order: "o-1", party: "pty-s-admin", from: T3, to: null }); dongLuc(db, "h2", T4);
  }), 1);
});

test("R-DSP-4: (b) Từ chối cùng mốc lần đóng cuối → 0 (kể cả khi đồng hồ lệch làm valid_to_at = valid_from_at > mốc lệnh)", () => {
  assert.equal(lc8((db) => { addRow(db, { id: "h1", order: "o-1", party: "pty-s-an", from: T1, to: null }); dongLuc(db, "h1", T2); nhatKyTuChoi(db, T2); }), 0);
  assert.equal(lc8((db) => { addRow(db, { id: "h1", order: "o-1", party: "pty-s-an", from: T3, to: null }); dongLuc(db, "h1", T2); nhatKyTuChoi(db, T2); }), 0, "đồng hồ lệch");
});

test("R-DSP-4: (c) đơn chưa từng có HANDLE → 0; (d) đơn đang có dòng mở → 0; việc khác (PICKUP) đóng không tính", () => {
  assert.equal(lc8(() => {}), 0);
  assert.equal(lc8((db) => { addRow(db, { id: "h1", order: "o-1", party: "pty-s-an", from: T1, to: T2 }); addRow(db, { id: "h2", order: "o-1", party: "pty-s-admin", from: T2, to: null }); }), 0);
  assert.equal(lc8((db) => { addRow(db, { id: "p1", order: "o-1", party: "pty-s-an", from: T1, to: null, kind: "PICKUP" }); dongLuc(db, "p1", T2); }), 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// R-DSP-5/6/7 (ADR-0032; kế hoạch 2026-10-23 mục 7): sổ sự kiện phân công. MỐC PHÁT HÀNH = created_at của dòng gieo `gieo-han-muc` (lúc áp migration —
// trong bài là lúc chạy bài). Mốc «sau phát hành» dùng năm 2099, «trước» dùng T1 (2026-09-21).
// ---------------------------------------------------------------------------------------------------------------------
const SAU = "2099-01-01T01:00:00.000Z";
const SAU2 = "2099-01-01T02:00:00.000Z";
function suKienDsp(db: DatabaseSync, x: { party: string; order: string | null; kind: string; at: string }): void {
  db.prepare(`INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by)
    SELECT ?, coalesce(max(seq), 0) + 1, ?, ?, ?, ?, ?, ?, NULL, ?, NULL FROM dsp_release_event`).run(crypto.randomUUID(), x.party, x.order, x.kind, x.kind === "REFUSE" ? "BAN_LICH" : null, x.at, x.at, x.at);
}
function dsp(dung: (db: DatabaseSync) => void): { r5: number; r6: number; r7: number } {
  const db = build();
  addOrder(db, "o-1");
  dung(db);
  return { r5: violations(db, one("R-DSP-5")), r6: violations(db, one("R-DSP-6")), r7: violations(db, one("R-DSP-7")) };
}

test("R-DSP-5: (a) REFUSE không có CLAIM/ASSIGN trước, dòng phụ trách mở SAU mốc → 1; (b) có CLAIM trước → 0; (c) dòng phụ trách mở TRƯỚC mốc → 0 (miễn trừ); (d) CLAIM có seq LỚN hơn REFUSE → 1", () => {
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: SAU2 }); suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "REFUSE", at: SAU2 }); }).r5, 1);
  assert.equal(dsp((db) => {
    addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: SAU2 });
    suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "CLAIM", at: SAU });
    suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "REFUSE", at: SAU2 });
  }).r5, 0);
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: T1, to: SAU2 }); suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "REFUSE", at: SAU2 }); }).r5, 0);
  assert.equal(dsp((db) => {
    addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: SAU2 });
    suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "REFUSE", at: SAU2 });
    suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "CLAIM", at: SAU });
  }).r5, 1);
  // CLAIM của NGƯỜI KHÁC / ĐƠN KHÁC không tính.
  assert.equal(dsp((db) => {
    addOrder(db, "o-2");
    addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: SAU2 });
    suKienDsp(db, { party: "pty-s-admin", order: "o-1", kind: "CLAIM", at: SAU });
    suKienDsp(db, { party: "pty-s-an", order: "o-2", kind: "CLAIM", at: SAU });
    suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "REFUSE", at: SAU2 });
  }).r5, 1);
});

test("R-DSP-6: (a) dòng phụ trách mở sau mốc không có sự kiện → 1; (b) có ASSIGN cùng người, cùng đơn, cùng mốc → 0; (c) dòng mở TRƯỚC mốc → 0; sự kiện lệch mốc / lệch người → 1", () => {
  assert.equal(dsp((db) => addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: null })).r6, 1);
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: null }); suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "ASSIGN", at: SAU }); }).r6, 0);
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: null }); suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "CLAIM", at: SAU }); }).r6, 0);
  assert.equal(dsp((db) => addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: T1, to: null })).r6, 0);
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: null }); suKienDsp(db, { party: "pty-s-an", order: "o-1", kind: "ASSIGN", at: SAU2 }); }).r6, 1);
  assert.equal(dsp((db) => { addRow(db, { id: "h", order: "o-1", party: "pty-s-an", from: SAU, to: null }); suKienDsp(db, { party: "pty-s-admin", order: "o-1", kind: "ASSIGN", at: SAU }); }).r6, 1);
  assert.equal(dsp((db) => addRow(db, { id: "p", order: "o-1", party: "pty-s-an", from: SAU, to: null, kind: "PICKUP" })).r6, 0, "việc khác HANDLE không tính");
});

test("R-DSP-7: dòng gieo `gieo-han-muc` còn → 0; mất (gỡ trigger chỉ-thêm trong bài để xoá) → 1, và R-DSP-5/6 không lặng lẽ ra 0 nhờ mốc NULL bị bỏ qua", () => {
  assert.equal(dsp(() => {}).r7, 0);
  const r = dsp((db) => {
    db.exec("DROP TRIGGER dsp_refuse_policy_no_delete");
    db.exec("DELETE FROM dsp_refuse_policy WHERE id = 'gieo-han-muc'");
  });
  assert.equal(r.r7, 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0148 Đ1 (migration 0126): dấu huỷ ở ba bảng mức. R-PRC-7 = mọi bản chụp AUTO trỏ dòng mức CHƯA HUỶ chứa ngày chụp; R-PRC-1/2/5 bỏ qua dòng huỷ.
// Ca đỏ của R-PRC-7 đi đường mà trigger CHO PHÉP (rút ngắn / huỷ dòng mức là quyết định của máy chủ — CSDL không biết «đã chụp»): đúng lỗ mà kiểm này canh.
// ---------------------------------------------------------------------------------------------------------------------
/** Bản chụp AUTO hoa hồng SET tỷ lệ 1000 trỏ dòng mức `rule`, người hưởng `ben`, ngày chụp `ngay`; `manual` = bản MANUAL (ghi tay chỉ đổi người bán vẫn chép mã dòng). */
function chupMucSdl(db: DatabaseSync, o: { dv: string; rule: string; ben: string; ngay: string; supersedes?: string | null; manual?: boolean }): string {
  const id = `bc-${++soBanChup}`;
  const order = (db.prepare("SELECT order_id FROM order_service WHERE id = ?").get(o.dv) as { order_id: string }).order_id;
  db.prepare(
    `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
       commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date,
       created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 'SET', NULL, 'RATE', 1000, NULL, ?, 'MISSING', NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
  ).run(id, order, o.dv, o.ben, o.rule, o.manual ? "MANUAL" : "AUTO", o.manual ? "Đổi người bán sang nhà cung cấp" : null, o.supersedes ?? null, o.ngay, T1, T1);
  return id;
}
const huySdl = (db: DatabaseSync, bang: string, id: string) =>
  db.prepare(`UPDATE ${bang} SET voided_at = ?, voided_by = 'kt', updated_at = ?, updated_by = 'kt' WHERE id = ?`).run(T2, T2, id);

test("R-PRC-7: bản chụp AUTO trong khoảng ngày dòng mức → 0; rút ngắn dòng qua ngày chụp → vi phạm; huỷ dòng đã chụp → vi phạm; bản đã bị thay vẫn tính; bản MANUAL không tính", () => {
  const c = one("R-PRC-7");
  assert.equal(c.level, "fail");
  const db = build();
  toChucSdl(db, "dl-7", "TRAVEL_AGENCY");
  mucSdl(db, { id: "m7-a", party: "dl-7", scope: "SERVICE", catalog: "S1", tu: vnNgay(-30) });
  mucSdl(db, { id: "m7-b", party: "dl-7", scope: "SERVICE", catalog: "S2", tu: vnNgay(-30) });
  const [dv1] = donXacNhanSdl(db, "o-r7-1", T1);
  const [dv2] = donXacNhanSdl(db, "o-r7-2", T1);
  const bc1 = chupMucSdl(db, { dv: dv1!, rule: "m7-a", ben: "dl-7", ngay: vnNgay(-5) });
  chupMucSdl(db, { dv: dv2!, rule: "m7-b", ben: "dl-7", ngay: vnNgay(-5) });
  assert.equal(violations(db, c), 0, "ca xanh: hai bản chụp nằm trong khoảng ngày");
  chupMucSdl(db, { dv: dv1!, rule: "m7-a", ben: "dl-7", ngay: vnNgay(0), supersedes: bc1, manual: true });
  dongDongSdl(db, "prc_commission_rule", "m7-a", vnNgay(-3)); // đóng lùi: bản MANUAL hôm nay nằm ngoài, bản AUTO (đã bị thay) ngày −5 vẫn trong
  assert.equal(violations(db, c), 0, "bản MANUAL không xét (ngày chụp của nó là ngày ghi tay)");
  dongDongSdl(db, "prc_commission_rule", "m7-a", vnNgay(-6)); // rút ngắn tiếp: trigger cho (rút ngắn), nhưng bản AUTO ngày −5 nay nằm ngoài
  assert.equal(violations(db, c), 1, "rút ngắn qua ngày chụp — bản đã bị thay vẫn tính");
  huySdl(db, "prc_commission_rule", "m7-b");
  assert.equal(violations(db, c), 2, "huỷ dòng đã có bản chụp");
});

test("R-PRC-1 / R-PRC-2 / R-PRC-5 bỏ qua dòng đã huỷ (ADR-0148): dòng huỷ chồng ngày, trỏ vai đã tắt, hay trỏ hồ sơ đã thôi vai đều không báo", () => {
  const db = build();
  toChucSdl(db, "dl-h", "TRAVEL_AGENCY");
  mucSdl(db, { id: "mh-1", party: "dl-h", scope: "ALL" });
  huySdl(db, "prc_commission_rule", "mh-1");
  mucSdl(db, { id: "mh-2", party: "dl-h", scope: "ALL" }); // trigger cho chồng với dòng huỷ
  assert.equal(violations(db, one("R-PRC-1")), 0, "R-PRC-1: dòng huỷ không giữ chỗ");
  mucSdl(db, { id: "mh-3", role: "TAXI_DRIVER", scope: "ALL" });
  db.prepare("UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'TAXI_DRIVER'").run(T2);
  assert.equal(violations(db, one("R-PRC-2")), 1, "R-PRC-2: dòng chưa huỷ theo vai đã tắt vẫn báo");
  huySdl(db, "prc_commission_rule", "mh-3");
  assert.equal(violations(db, one("R-PRC-2")), 0, "R-PRC-2: dòng huỷ theo vai đã tắt không báo");
  dongVaiSdl(db, "dl-h", "TRAVEL_AGENCY");
  assert.equal(violations(db, one("R-PRC-5")), 1, "R-PRC-5: dòng chưa huỷ theo hồ sơ đã thôi vai vẫn báo");
  huySdl(db, "prc_commission_rule", "mh-2");
  assert.equal(violations(db, one("R-PRC-5")), 0, "R-PRC-5: dòng huỷ theo hồ sơ đã thôi vai không báo");
});
