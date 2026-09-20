#!/usr/bin/env python3
"""Kiểm N1 theo pha expand–contract (đặc tả N1 §9): chứng minh
  (1) sau 0009…0012 (mở rộng) MÃ CŨ vẫn chạy: INSERT staff không có party_id, đổi role, ngưng tài khoản;
  (2) 0013 (siết) = backfill lặp lại CHỈ cho party_id IS NULL (idempotent) + ba nhóm trigger;
  (3) schema cuối của lộ trình hai pha GIỐNG HỆT schema của tệp tham chiếu gộp một lần (không mất/thừa gì).
Chạy: python3 docs/superpowers/specs/2026-09-20-n1-schema-verify-phased.py   (từ gốc repo; thoát 1 nếu có ✗)
"""
import glob, re, sqlite3, sys

REF = "docs/superpowers/specs/2026-09-20-n1-schema-reference.sql"
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"  ✓ {name}")
    else:
        fail += 1
        print(f"  ✗ {name} {extra}")


def new_db():
    db = sqlite3.connect(":memory:")
    db.isolation_level = None
    db.execute("PRAGMA foreign_keys = ON")
    for f in sorted(glob.glob("migrations/*.sql")):
        db.executescript(open(f, encoding="utf-8").read())
    return db


def raises(db, sql, needle):
    try:
        db.execute(sql)
    except sqlite3.Error as e:
        return needle in str(e)
    return False


ref = open(REF, encoding="utf-8").read()
CONTRACT_NAMES = "stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required_ins|staff_party_required_upd"
trig_re = re.compile(rf"CREATE TRIGGER (?:{CONTRACT_NAMES})\b.*?\bEND;", re.S)
contract_triggers = trig_re.findall(ref)
contract_sql = "\n".join(trig_re.findall(ref))
expand_sql = trig_re.sub("", ref)
check("tách được đúng 4 trigger 'siết' từ tệp tham chiếu", len(contract_triggers) == 4, str(len(contract_triggers)))

# 0013, phần backfill lặp lại: CHỈ dòng chưa có hồ sơ / chưa có quyền (idempotent).
NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
BACKFILL_AGAIN = f"""
INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT 'pty-' || s.id, 'PERSON', trim(s.full_name), s.active, {NOW}, {NOW} FROM staff s WHERE s.party_id IS NULL;
INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at)
SELECT 'pty-' || t.id,
       CASE WHEN instr(t.head, ' ') > 0 THEN substr(t.head, 1, instr(t.head, ' ') - 1) ELSE NULLIF(t.head, '') END,
       CASE WHEN instr(t.head, ' ') > 0 THEN NULLIF(trim(substr(t.head, instr(t.head, ' ') + 1)), '') END,
       t.given, {NOW}, {NOW}
FROM (SELECT s.id AS id,
             trim(substr(trim(s.full_name), length(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) AS head
      FROM staff s WHERE s.party_id IS NULL) t;
INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT 'ptr-' || s.id, 'pty-' || s.id, 'STAFF', NULL, date(s.created_at, '+7 hours'), {NOW}, {NOW} FROM staff s WHERE s.party_id IS NULL;
INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
SELECT 'stp-' || s.id, s.id, CASE s.role WHEN 'admin' THEN 'ADMIN' ELSE 'SALES' END, {NOW}, {NOW}, {NOW}
FROM staff s WHERE NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id);
UPDATE staff SET party_id = 'pty-' || id WHERE party_id IS NULL;
"""

print("── Pha 1: mở rộng (0009…0012 = tệp tham chiếu trừ 4 trigger siết) ──")
db = new_db()
for sid, name, role in (("s1", "Trần Văn Bình", "sales"), ("s2", "Nguyễn Tuyên Phong", "admin")):
    db.execute("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES (?, ?, ?, 'x', ?, 1, '2026-09-01T02:00:00Z')",
               (sid, name, "09000000" + sid[1:] + "0", role))
db.executescript(expand_sql)
check("sau mở rộng: mọi tài khoản có sẵn đã có party_id", db.execute("SELECT count(*) FROM staff WHERE party_id IS NULL").fetchone()[0] == 0)

# MÃ CŨ chạy trên schema mới (mô phỏng đúng câu SQL của staff/index.ts:60 và :77-79):
old_insert = ("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) "
              "VALUES ('s3', 'Lê Thị Hoa', '0900000030', 'x', 'admin', 1, '2026-09-20T01:00:00Z')")
try:
    db.execute(old_insert)
    check("mã cũ: INSERT staff (không party_id, role='admin') vẫn chạy sau mở rộng", True)
except sqlite3.Error as e:
    check("mã cũ: INSERT staff (không party_id) vẫn chạy sau mở rộng", False, str(e))
check("mã cũ: đổi role / full_name / ngưng tài khoản vẫn chạy",
      not raises(db, "UPDATE staff SET role = 'sales', full_name = 'Lê Hoa' WHERE id = 's3'", "")
      and not raises(db, "UPDATE staff SET role = 'admin' WHERE id = 's3'", "")
      and not raises(db, "UPDATE staff SET active = 0 WHERE id = 's1'", "")
      and not raises(db, "UPDATE staff SET active = 1 WHERE id = 's1'", ""))
check("mã cũ: SELECT * FROM staff vẫn đọc được (thêm cột party_id không phá)", len(db.execute("SELECT * FROM staff").fetchall()) == 3)
check("khoảng giữa: tài khoản do mã cũ tạo chưa có party_id/quyền (đúng dự kiến)",
      db.execute("SELECT party_id FROM staff WHERE id='s3'").fetchone()[0] is None
      and db.execute("SELECT count(*) FROM stf_permission WHERE staff_id='s3'").fetchone()[0] == 0)
check("FK sạch sau pha 1", db.execute("PRAGMA foreign_key_check").fetchall() == [])
# Cửa sổ triển khai (C5 của rà soát): tài khoản chưa có party_id KHÔNG được biến mất khỏi view nhãn → đơn của họ vẫn hiện.
db.execute("INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, deposit_amount, remaining_amount, created_at, updated_at) "
           "VALUES ('o3', 'TD-WIN-1', 's3', 'draft', 'K', '0900000099', 0, 0, 0, 0, 0, '2026-09-20T02:00:00Z', '2026-09-20T02:00:00Z')")
row = db.execute("SELECT o.order_code, s.label FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id WHERE o.id = 'o3'").fetchone()
check("cửa sổ: đơn của tài khoản chưa có hồ sơ VẪN hiện qua v_stf_staff_label (LEFT JOIN), nhãn dự phòng rõ ràng", row == ("TD-WIN-1", "(chưa có hồ sơ)"), str(row))
check("cửa sổ: tài khoản chưa có hồ sơ vẫn nằm trong danh sách nhân sự của view", db.execute("SELECT count(*) FROM v_stf_staff_label").fetchone()[0] == 3)
# M1 của rà soát lại: đường SẮP XẾP danh sách nhân sự (staff → view công bố của parties, LEFT JOIN) cũng không được làm rơi họ.
ordered = [r[0] for r in db.execute("SELECT s.id FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id "
                                     "ORDER BY s.active DESC, pl.sort_key COLLATE NOCASE, s.created_at").fetchall()]
check("cửa sổ: truy vấn sắp xếp danh sách nhân sự vẫn trả đủ 3 tài khoản (kể cả chưa có hồ sơ)", sorted(ordered) == ["s1", "s2", "s3"], str(ordered))


print("── Pha 2: siết (0013) ──")
db.executescript(BACKFILL_AGAIN)
check("0013: backfill lặp lại → 0 tài khoản thiếu party_id", db.execute("SELECT count(*) FROM staff WHERE party_id IS NULL").fetchone()[0] == 0)
# Mã cũ đã đổi full_name của s3 thành 'Lê Hoa' (2 từ: họ + tên, không có tên đệm) → backfill phải theo tên HIỆN TẠI.
check("0013: tài khoản 'khoảng giữa' có hồ sơ, tên tách theo tên hiện tại (Lê / NULL / Hoa)",
      db.execute("SELECT family_name, middle_name, given_name FROM pty_person WHERE party_id='pty-s3'").fetchone() == ("Lê", None, "Hoa"))
check("0013: display_name hồ sơ = tên hiện tại của tài khoản", db.execute("SELECT display_name FROM pty_party WHERE id='pty-s3'").fetchone() == ("Lê Hoa",))
check("0013: quyền cấp từ role của dòng chưa có quyền (s3 admin → ADMIN)",
      db.execute("SELECT permission_type_code FROM stf_permission WHERE staff_id='s3' AND valid_to_at IS NULL").fetchall() == [("ADMIN",)])
check("0013: dòng đã backfill ở 0012 không bị nhân đôi (mỗi tài khoản đúng 1 quyền mở, 1 vai STAFF)",
      db.execute("SELECT count(*) FROM (SELECT staff_id FROM stf_permission GROUP BY staff_id HAVING count(*) <> 1)").fetchone()[0] == 0
      and db.execute("SELECT count(*) FROM pty_party_role WHERE role_type_code='STAFF'").fetchone()[0] == 3)
before = [db.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("pty_party", "pty_person", "pty_party_role", "stf_permission")]
db.executescript(BACKFILL_AGAIN)
after = [db.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("pty_party", "pty_person", "pty_party_role", "stf_permission")]
check("0013: chạy lại lần hai không đổi gì (idempotent)", before == after, f"{before} → {after}")
db.executescript(contract_sql)
check("0013: trigger chặn INSERT staff thiếu party_id", raises(db, old_insert.replace("'s3'", "'s4'").replace("0900000030", "0900000040"), "staff_party"))
check("0013: trigger chặn UPDATE đặt party_id NULL", raises(db, "UPDATE staff SET party_id = NULL WHERE id = 's1'", "staff_party"))
check("0013: ngưng admin thứ nhất được (còn s3)", not raises(db, "UPDATE staff SET active = 0 WHERE id = 's2'", ""))
check("0013: ngưng admin cuối bị chặn (last_admin)", raises(db, "UPDATE staff SET active = 0 WHERE id = 's3'", "last_admin"))
check("0013: thu hồi quyền ADMIN cuối bị chặn (last_admin)",
      raises(db, "UPDATE stf_permission SET valid_to_at = '2026-09-21T00:00:00Z' WHERE staff_id = 's3' AND permission_type_code = 'ADMIN'", "last_admin"))
check("FK sạch sau pha 2", db.execute("PRAGMA foreign_key_check").fetchall() == [])

print("── Đối chiếu: schema hai pha == schema tệp tham chiếu gộp ──")
db2 = new_db()
db2.executescript(ref)


def shape(d):
    objs = sorted((t, n) for t, n in d.execute("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").fetchall())
    cols = {}
    for (n,) in d.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall():
        cols[n] = [tuple(r[1:]) for r in d.execute(f"PRAGMA table_info({n})").fetchall()]
    return objs, cols


s1, s2 = shape(db), shape(db2)
check("cùng tập đối tượng (bảng, chỉ mục, trigger, view)", s1[0] == s2[0], f"khác: {set(s1[0]) ^ set(s2[0])}")
check("cùng cột (tên, kiểu, notnull, default, pk) ở mọi bảng", s1[1] == s2[1])

print(f"\n{ok} đạt, {fail} hỏng")
sys.exit(1 if fail else 0)
