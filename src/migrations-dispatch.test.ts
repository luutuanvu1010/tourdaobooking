// Kiểm migration 0014 (module dispatch: dsp_task_kind, dsp_assignment_status, dsp_assignment, v_dsp_order_handler + backfill người phụ trách)
// trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql — cùng cách src/migrations-n1.test.ts; e2e xác nhận lại trên D1 local.
// Đặt ở src/ (KHÔNG ở src/modules/dispatch/): architecture.test.ts lấy danh sách module từ thư mục trên đĩa, mà thư mục module do task 6 tạo cùng repository.ts.
// Mọi schema ở đây dựng "ĐẾN 0014" (không dựng đủ bộ): migration siết B5 (`staff_party_required`, lấy số sau 0014) chặn tài khoản không party_id,
// mà ca "người lập chưa có hồ sơ" của backfill cần đúng trạng thái đang chạy trên production.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const upTo = (prefix: string): string[] => files.filter((f) => f.slice(0, 4) <= prefix);
const sqlOf = (prefix: string): string => {
  const f = files.find((n) => n.startsWith(prefix));
  assert.ok(f, `thiếu migrations/${prefix}_*.sql`);
  return readFileSync(new URL(f, DIR), "utf8");
};

function open(list: string[]): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args).map((r) => ({ ...r }));
const one = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => Object.values(db.prepare(sql).get(...args) ?? {})[0];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

/**
 * Trạng thái production TRƯỚC 0014 (0001…0013): hai tài khoản có hồ sơ (một đã ngưng), một tài khoản do mã cũ tạo SAU 0012 nên chưa có `party_id`
 * (B5 chưa áp nên hợp lệ), và đơn đủ ba trạng thái. Ngày tạo đơn khác nhau để kiểm `valid_from_at` của backfill.
 */
function beforeDispatch(): DatabaseSync {
  const db = open(upTo("0011"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-01T00:00:00.000Z'),
    ('s-b', 'Trần Thị Bình', '0901000002', 'x', 'sales', 0, '2026-09-01T00:00:00.000Z')`);
  db.exec(sqlOf("0012")); // sinh hồ sơ 'pty-s-a', 'pty-s-b' và quyền
  db.exec(sqlOf("0013"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s-orphan', 'Chưa Hồ Sơ', '0901000003', 'x', 'sales', 1, '2026-09-10T00:00:00.000Z')`);
  addOrder(db, "o-draft", "s-a", "draft", "2026-09-02T03:00:00.000Z");
  addOrder(db, "o-conf", "s-a", "confirmed", "2026-09-03T03:00:00.000Z");
  addOrder(db, "o-canc", "s-b", "cancelled", "2026-09-04T03:00:00.000Z");
  addOrder(db, "o-orphan", "s-orphan", "draft", "2026-09-11T03:00:00.000Z");
  return db;
}
function addOrder(db: DatabaseSync, id: string, staffId: string, status = "draft", at = NOW): void {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', '${staffId}', '${status}', 'K', '0900000009', '${at}', '${at}')`);
}
function addService(db: DatabaseSync, id: string, orderId: string): void {
  db.exec(`INSERT INTO order_service (id, order_id, name, unit) VALUES ('${id}', '${orderId}', 'Tour', 'perPax')`);
}
const applied = (): DatabaseSync => {
  const db = beforeDispatch();
  db.exec(sqlOf("0014"));
  return db;
};

type Cell = string | number | null;
const q = (v: Cell): string => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replaceAll("'", "''")}'`);
/** Câu INSERT một dòng `dsp_assignment`; mặc định là dòng HANDLE hạt đơn của 'o-orphan' (đơn chưa có người phụ trách sau backfill). */
function insertSql(over: Record<string, Cell> = {}): string {
  const row: Record<string, Cell> = {
    id: "a1", order_id: "o-orphan", order_service_id: null, task_kind_code: "HANDLE", party_id: "pty-s-a",
    status_code: "PENDING", valid_from_at: NOW, valid_to_at: null, created_at: NOW, updated_at: NOW,
    ...over,
  };
  const cols = Object.keys(row);
  return `INSERT INTO dsp_assignment (${cols.join(", ")}) VALUES (${cols.map((c) => q(row[c]!)).join(", ")})`;
}
const put = (db: DatabaseSync, over: Record<string, Cell> = {}): void => db.exec(insertSql(over));

// ---------------------------------------------------------------------------------------------------------------------
// Chỉ THÊM
// ---------------------------------------------------------------------------------------------------------------------
test("0014 chỉ THÊM: mọi đối tượng cũ giữ nguyên câu lệnh tạo; đối tượng mới đúng danh sách (không trigger)", () => {
  const db = beforeDispatch();
  const snapshot = () => rows(db, "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name");
  const before = snapshot();
  db.exec(sqlOf("0014"));
  const after = snapshot();
  const key = (r: { type: unknown; name: unknown }) => `${r.type}:${r.name}`;
  for (const b of before) assert.deepEqual(after.find((a) => key(a) === key(b)), b, `${key(b)} bị đổi bởi 0014`);
  assert.deepEqual(after.filter((a) => !before.some((b) => key(b) === key(a))).map(key), [
    "index:dsp_assignment_handler_open_uq",
    "index:dsp_assignment_order_ix",
    "index:dsp_assignment_party_ix",
    "index:dsp_assignment_service_ix",
    "table:dsp_assignment",
    "table:dsp_assignment_status",
    "table:dsp_task_kind",
    "view:v_dsp_order_handler",
  ]);
});

test("0014 trên DB chưa có đơn nào: chạy sạch, không dòng phân công", () => {
  const db = open(upTo("0014"));
  assert.equal(one(db, "SELECT count(*) FROM dsp_assignment"), 0);
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Hạt giống và bảng tra cứu
// ---------------------------------------------------------------------------------------------------------------------
test("0014: hạt giống dsp_task_kind (4 loại) và dsp_assignment_status (chỉ PENDING, DONE)", () => {
  const db = applied();
  assert.deepEqual(rows(db, "SELECT code, name FROM dsp_task_kind ORDER BY sort_order"), [
    { code: "HANDLE", name: "Phụ trách" },
    { code: "PICKUP", name: "Đón khách" },
    { code: "DROPOFF", name: "Tiễn khách" },
    { code: "BOAT", name: "Lái cano" },
  ]);
  assert.deepEqual(rows(db, "SELECT code FROM dsp_assignment_status ORDER BY sort_order").map((r) => r.code), ["PENDING", "DONE"]);
  // Bảng tra cứu khoá mã viết hoa (ADR-0003 điều 1, 3); thêm loại = thêm dòng, không sửa schema.
  fails(db, "INSERT INTO dsp_task_kind (code, name) VALUES ('escort', 'Hộ tống')", /CHECK/);
  fails(db, "INSERT INTO dsp_task_kind (code, name) VALUES ('HANDLE', 'Trùng')", /UNIQUE|PRIMARY/);
  fails(db, "INSERT INTO dsp_assignment_status (code, name, active) VALUES ('BAD', 'x', 2)", /CHECK/);
  db.exec("INSERT INTO dsp_task_kind (code, name, sort_order) VALUES ('ESCORT', 'Hộ tống', 5)");
  put(db, { id: "esc", task_kind_code: "ESCORT", order_id: "o-orphan" }); // loại mới dùng được ngay, khoá ngoại tới dòng vừa thêm
  assert.equal(one(db, "SELECT count(*) FROM dsp_assignment WHERE task_kind_code = 'ESCORT'"), 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// Backfill
// ---------------------------------------------------------------------------------------------------------------------
test("0014 backfill: mọi đơn có người lập CÓ hồ sơ được đúng một HANDLE đang mở — mọi trạng thái, kể cả người lập đã ngưng; đơn của tài khoản chưa có hồ sơ không làm migration hỏng", () => {
  const db = applied(); // không ném lỗi dù 'o-orphan' có người lập party_id IS NULL
  assert.deepEqual(
    rows(db, `SELECT o.id AS order_id, count(a.id) AS n FROM orders o
              LEFT JOIN dsp_assignment a ON a.order_id = o.id AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL
              GROUP BY o.id ORDER BY o.id`),
    [{ order_id: "o-canc", n: 1 }, { order_id: "o-conf", n: 1 }, { order_id: "o-draft", n: 1 }, { order_id: "o-orphan", n: 0 }],
    "đơn nào cũng đúng một người phụ trách, riêng đơn của tài khoản không hồ sơ thì tạm chưa có (đơn không người phụ trách là trạng thái hợp lệ: nhận qua `dispatch.claim`)",
  );
  assert.deepEqual(
    rows(db, `SELECT id, order_id, order_service_id, task_kind_code, party_id, role_type_code, location_id, place_text, scheduled_date, scheduled_time,
                     status_code, done_at, valid_from_at, valid_to_at, created_by, updated_by
              FROM dsp_assignment WHERE order_id = 'o-conf'`),
    [{
      id: "dsp-h-o-conf", order_id: "o-conf", order_service_id: null, task_kind_code: "HANDLE", party_id: "pty-s-a", role_type_code: null, location_id: null,
      place_text: null, scheduled_date: null, scheduled_time: null, status_code: "PENDING", done_at: null,
      valid_from_at: "2026-09-03T03:00:00.000Z", valid_to_at: null, created_by: null, updated_by: null, // hiệu lực từ lúc lập đơn; NULL = hệ thống
    }],
  );
  assert.equal(one(db, "SELECT party_id FROM dsp_assignment WHERE order_id = 'o-canc'"), "pty-s-b", "người lập đã ngưng vẫn là người phụ trách lịch sử");
  assert.equal(one(db, "SELECT count(*) FROM dsp_assignment WHERE valid_to_at IS NOT NULL OR order_service_id IS NOT NULL OR task_kind_code <> 'HANDLE'"), 0);
  assert.equal(one(db, "SELECT count(*) FROM dsp_assignment WHERE created_at IS NULL OR updated_at IS NULL"), 0);
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Người phụ trách: chỉ mục duy nhất một phần
// ---------------------------------------------------------------------------------------------------------------------
test("0014: tối đa MỘT HANDLE đang mở mỗi đơn; đóng rồi mở dòng mới hợp lệ (đổi người ngay cùng một thời điểm), lịch sử giữ nguyên", () => {
  const db = applied();
  put(db, { id: "h1", order_id: "o-orphan", party_id: "pty-s-a", valid_from_at: "2026-09-21T01:00:00.000Z" });
  fails(db, insertSql({ id: "h2", order_id: "o-orphan", party_id: "pty-s-b" }), /UNIQUE/); // hai HANDLE đang mở cùng đơn
  fails(db, insertSql({ id: "h3", order_id: "o-draft", party_id: "pty-s-b" }), /UNIQUE/); // đơn đã backfill cũng vậy

  // Đổi người = đóng dòng cũ + mở dòng mới trong MỘT khối, cùng một thời điểm (ADR-0006 điều 3): chỉ mục không chặn.
  const T1 = "2026-09-21T02:00:00.000Z";
  db.exec("BEGIN");
  db.exec(`UPDATE dsp_assignment SET valid_to_at = '${T1}', updated_at = '${T1}' WHERE id = 'h1'`);
  put(db, { id: "h2", order_id: "o-orphan", party_id: "pty-s-b", valid_from_at: T1 });
  db.exec("COMMIT");
  const T2 = "2026-09-21T03:00:00.000Z";
  db.exec("BEGIN");
  db.exec(`UPDATE dsp_assignment SET valid_to_at = '${T2}', updated_at = '${T2}' WHERE id = 'h2'`);
  put(db, { id: "h4", order_id: "o-orphan", party_id: "pty-s-a", valid_from_at: T2 }); // đổi lại về người đầu: dòng mới, không sửa dòng cũ
  db.exec("COMMIT");
  assert.deepEqual(rows(db, "SELECT id, party_id, valid_from_at, valid_to_at FROM dsp_assignment WHERE order_id = 'o-orphan' ORDER BY valid_from_at"), [
    { id: "h1", party_id: "pty-s-a", valid_from_at: "2026-09-21T01:00:00.000Z", valid_to_at: T1 },
    { id: "h2", party_id: "pty-s-b", valid_from_at: T1, valid_to_at: T2 },
    { id: "h4", party_id: "pty-s-a", valid_from_at: T2, valid_to_at: null },
  ]);
  fails(db, insertSql({ id: "h5", order_id: "o-orphan", party_id: "pty-s-b" }), /UNIQUE/); // vẫn chỉ một dòng đang mở

  // Chỉ mục chỉ ràng HANDLE: đơn khác độc lập; loại việc khác cùng đơn không bị giới hạn.
  addOrder(db, "o-other", "s-a");
  put(db, { id: "h6", order_id: "o-other", party_id: "pty-s-b" });
  put(db, { id: "p1", order_id: "o-other", task_kind_code: "PICKUP", party_id: "pty-s-a" });
  put(db, { id: "p2", order_id: "o-other", task_kind_code: "PICKUP", party_id: "pty-s-b" });
  assert.equal(one(db, "SELECT count(*) FROM dsp_assignment WHERE order_id = 'o-other' AND valid_to_at IS NULL"), 3);
});

// ---------------------------------------------------------------------------------------------------------------------
// CHECK và khoá ngoại
// ---------------------------------------------------------------------------------------------------------------------
test("0014: CHECK hạt — đúng MỘT trong order_id / order_service_id; HANDLE chỉ ở hạt đơn; nhiệm vụ hạt dịch vụ nhiều dòng mở", () => {
  const db = applied();
  addOrder(db, "o-n", "s-a");
  addService(db, "sv1", "o-n");
  fails(db, insertSql({ id: "c1", order_id: null, order_service_id: null, task_kind_code: "PICKUP" }), /CHECK/); // không hạt nào
  fails(db, insertSql({ id: "c2", order_id: "o-n", order_service_id: "sv1", task_kind_code: "PICKUP" }), /CHECK/); // cả hai hạt
  put(db, { id: "c3", order_id: null, order_service_id: "sv1", task_kind_code: "PICKUP" }); // hạt dịch vụ: hợp lệ
  put(db, { id: "c4", order_id: null, order_service_id: "sv1", task_kind_code: "PICKUP", party_id: "pty-s-b" }); // nhiều việc đang mở trên một dịch vụ (điều 4)
  put(db, { id: "c5", order_id: null, order_service_id: "sv1", task_kind_code: "BOAT" });
  // Người phụ trách = dòng hạt ĐƠN (điều 3): HANDLE hạt dịch vụ có order_id NULL nên lọt chỉ mục duy nhất — bị CHECK chặn từ gốc.
  fails(db, insertSql({ id: "c6", order_id: null, order_service_id: "sv1", task_kind_code: "HANDLE" }), /CHECK/);
});

test("0014: CHECK cột — giờ HH:MM, ngày đúng lịch, điểm tự do không rỗng, hiệu lực không đảo, cờ NOT NULL; khoá ngoại tới mọi bảng cha", () => {
  const db = applied();
  addOrder(db, "o-n", "s-a");
  addService(db, "sv1", "o-n");
  const pickup = (id: string, over: Record<string, Cell> = {}) => insertSql({ id, order_id: null, order_service_id: "sv1", task_kind_code: "PICKUP", ...over });
  const vinpearl = one(db, "SELECT id FROM loc_location WHERE code = 'CANG_VINPEARL'") as string;
  db.exec(pickup("ok1", { role_type_code: "DRIVER", location_id: vinpearl, place_text: "Khách sạn Sao Biển", scheduled_date: "2026-09-25", scheduled_time: "06:40" }));
  db.exec(pickup("ok2", { place_text: null, scheduled_date: null, scheduled_time: null, status_code: "DONE", done_at: "2026-09-25T00:10:00.000Z", location_id: null, role_type_code: null }));
  for (const bad of ["25:00", "6:40", "06:60", "0640", "06:40:00"]) fails(db, pickup("t", { scheduled_time: bad }), /CHECK/);
  for (const bad of ["2026-02-30", "25/09/2026", "2026-9-25"]) fails(db, pickup("d", { scheduled_date: bad }), /CHECK/);
  fails(db, pickup("pl", { place_text: "   " }), /CHECK/);
  fails(db, pickup("v", { valid_from_at: "2026-09-21T05:00:00.000Z", valid_to_at: "2026-09-21T04:00:00.000Z" }), /CHECK/);
  fails(db, pickup("n1", { created_at: null }), /NOT NULL/);
  fails(db, pickup("n2", { updated_at: null }), /NOT NULL/);
  fails(db, pickup("n3", { valid_from_at: null }), /NOT NULL/);
  fails(db, pickup("n4", { party_id: null }), /NOT NULL/);
  // Tập mở là bảng tra cứu có khoá ngoại (ADR-0003 điều 3); trạng thái chỉ PENDING/DONE, huỷ = đóng dòng (ADR-0006 điều 2).
  fails(db, pickup("k1", { task_kind_code: "KHONG_CO" }), /FOREIGN KEY/);
  fails(db, pickup("k2", { status_code: "CANCELLED" }), /FOREIGN KEY/);
  fails(db, pickup("k3", { party_id: "khong-co" }), /FOREIGN KEY/);
  fails(db, pickup("k4", { role_type_code: "KHONG_CO" }), /FOREIGN KEY/);
  fails(db, pickup("k5", { location_id: "khong-co" }), /FOREIGN KEY/);
  fails(db, pickup("k6", { order_service_id: "khong-co" }), /FOREIGN KEY/);
  fails(db, insertSql({ id: "k7", order_id: "khong-co" }), /FOREIGN KEY/);
  // Cột WHO (created_by/updated_by) là TEXT NULL không khoá ngoại (ADR-0003 điều 6): id lạ vẫn nhận.
  db.exec(pickup("who", { created_by: "khong-phai-staff", updated_by: "khong-phai-staff" }));
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

test("0014: khoá ngoại NO ACTION — không xoá được đơn/dịch vụ đang có phân công; xoá-rồi-chèn-lại dịch vụ của đơn chỉ có HANDLE hạt đơn vẫn chạy", () => {
  const db = applied();
  for (const fk of rows(db, "SELECT \"table\" AS parent, \"from\" AS col, on_delete FROM pragma_foreign_key_list('dsp_assignment')")) assert.equal(fk.on_delete, "NO ACTION", `${fk.col} → ${fk.parent}`);
  assert.deepEqual(rows(db, "SELECT \"from\" AS col FROM pragma_foreign_key_list('dsp_assignment') ORDER BY \"from\"").map((r) => r.col), [
    "location_id", "order_id", "order_service_id", "party_id", "role_type_code", "status_code", "task_kind_code",
  ]);
  fails(db, "DELETE FROM orders WHERE id = 'o-draft'", /FOREIGN KEY/); // đơn còn người phụ trách: chặn xoá (ADR-0006 Hệ quả)

  // `updateDraftOrder` xoá hết dịch vụ rồi chèn lại mỗi lần lưu nháp. An toàn ở bản này CHỈ VÌ chưa dòng nào ghi hạt dịch vụ — chốt lại bằng test:
  // nếu ai bắt đầu ghi order_service_id trước khi N2 đổi sang so khớp theo id, test này (và dòng dưới) đỏ.
  addService(db, "sv-a", "o-draft");
  db.exec("DELETE FROM order_item WHERE order_id = 'o-draft'");
  db.exec("DELETE FROM order_service WHERE order_id = 'o-draft'");
  assert.equal(one(db, "SELECT count(*) FROM order_service WHERE order_id = 'o-draft'"), 0);
  addService(db, "sv-b", "o-draft");
  put(db, { id: "pk", order_id: null, order_service_id: "sv-b", task_kind_code: "PICKUP" });
  fails(db, "DELETE FROM order_service WHERE order_id = 'o-draft'", /FOREIGN KEY/); // đã có nhiệm vụ: phải chặn ở tầng ứng dụng (ADR-0006 điều 1)
});

// ---------------------------------------------------------------------------------------------------------------------
// View công bố
// ---------------------------------------------------------------------------------------------------------------------
test("0014: v_dsp_order_handler — năm cột, chỉ HANDLE đang mở, nhãn/tài khoản qua view công bố; người phụ trách không có tài khoản → staff_id NULL", () => {
  const db = applied();
  assert.deepEqual(db.prepare("PRAGMA table_info(v_dsp_order_handler)").all().map((c) => c.name), ["order_id", "party_id", "staff_id", "label", "since"]);
  assert.deepEqual(rows(db, "SELECT * FROM v_dsp_order_handler ORDER BY order_id"), [
    { order_id: "o-canc", party_id: "pty-s-b", staff_id: "s-b", label: "Trần Thị Bình", since: "2026-09-04T03:00:00.000Z" },
    { order_id: "o-conf", party_id: "pty-s-a", staff_id: "s-a", label: "Nguyễn Văn An", since: "2026-09-03T03:00:00.000Z" },
    { order_id: "o-draft", party_id: "pty-s-a", staff_id: "s-a", label: "Nguyễn Văn An", since: "2026-09-02T03:00:00.000Z" },
  ], "đơn o-orphan chưa có người phụ trách nên không có dòng");

  // Đổi người: view chỉ trả người hiện tại; dòng đã đóng và việc khác (PICKUP) không lọt vào.
  const T = "2026-09-21T02:00:00.000Z";
  db.exec(`UPDATE dsp_assignment SET valid_to_at = '${T}' WHERE id = 'dsp-h-o-draft'`);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('pty-ext', 'PERSON', 'Lê Văn Xa', '${NOW}', '${NOW}')`);
  put(db, { id: "h-new", order_id: "o-draft", party_id: "pty-ext", valid_from_at: T }); // hồ sơ không gắn tài khoản nào
  addService(db, "sv1", "o-draft"); // đơn nháp (đơn đã xác nhận bị trigger đóng băng chặn chèn dịch vụ)
  put(db, { id: "pk", order_id: null, order_service_id: "sv1", task_kind_code: "PICKUP", party_id: "pty-s-b" });
  assert.deepEqual(rows(db, "SELECT order_id, party_id, staff_id, label, since FROM v_dsp_order_handler WHERE order_id IN ('o-draft', 'o-conf') ORDER BY order_id"), [
    { order_id: "o-conf", party_id: "pty-s-a", staff_id: "s-a", label: "Nguyễn Văn An", since: "2026-09-03T03:00:00.000Z" },
    { order_id: "o-draft", party_id: "pty-ext", staff_id: null, label: "Lê Văn Xa", since: T },
  ]);
  assert.equal(one(db, "SELECT count(*) FROM v_dsp_order_handler WHERE order_id = 'o-draft'"), 1, "mỗi đơn tối đa một dòng (không nhân đôi qua JOIN)");
});
