# -*- coding: utf-8 -*-
"""Kiểm chứng DDL tham chiếu N1 (2026-09-20-n1-schema-reference.sql) trên schema THẬT (migrations/0001…0008).
Chạy từ gốc repo:  python3 docs/superpowers/specs/2026-09-20-n1-schema-verify.py
Thoát mã 0 nếu mọi bất biến đúng; in từng kiểm tra. Bằng chứng theo Điều 8.2 (không phải lời khai)."""
import glob, os, sqlite3, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
REF = os.path.join(os.path.dirname(__file__), '2026-09-20-n1-schema-reference.sql')

db = sqlite3.connect(':memory:', isolation_level=None)
db.execute('PRAGMA foreign_keys = ON')
print('sqlite', sqlite3.sqlite_version)

for f in sorted(glob.glob(os.path.join(ROOT, 'migrations', '*.sql'))):
    db.executescript(open(f, encoding='utf-8').read())
print('đã áp migrations 0001…0008')

NOW = '2026-09-20T03:00:00.000Z'
# dữ liệu mẫu TRƯỚC N1: 3 tài khoản + 1 đơn tham chiếu staff
db.executemany("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES (?,?,?,?,?,?,?)", [
    ('s-admin', 'Nguyễn Tuyên Phong', '0845256256', 'x', 'admin', 1, '2026-09-19T17:30:00.000Z'),  # 00:30 ngày 20 giờ VN
    ('s-sales', 'Trần Văn Bình', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-one', 'Hương', '0901000003', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
])
db.execute("""INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, deposit_amount, remaining_amount, created_at, updated_at)
              VALUES ('o1','TD-20260920-0001','s-sales','draft','K','0900000000',0,0,0,0,0,?,?)""", (NOW, NOW))

db.executescript(open(REF, encoding='utf-8').read())
print('đã áp DDL tham chiếu N1 + backfill')

fails = []
def check(label, cond, extra=''):
    print(('  ✓ ' if cond else '  ✗ ') + label + (f'  [{extra}]' if extra and not cond else ''))
    if not cond: fails.append(label)

def raises(sql, *args):
    try:
        db.execute(sql, args)
        return None
    except sqlite3.DatabaseError as e:
        return str(e)

q = lambda sql, *a: db.execute(sql, a).fetchall()
one = lambda sql, *a: db.execute(sql, a).fetchone()[0]

print('\n[Gieo dữ liệu và backfill]')
check('8 địa điểm gieo (2 văn phòng + 4 quầy vé + bến tàu + bến cảng)', one('SELECT count(*) FROM loc_location') == 8, one('SELECT count(*) FROM loc_location'))
check('4 quyền app, 8 loại vai trò, 2 loại liên hệ, 1 loại quan hệ',
      (one('SELECT count(*) FROM stf_permission_type'), one('SELECT count(*) FROM pty_role_type'),
       one('SELECT count(*) FROM pty_contact_kind'), one('SELECT count(*) FROM pty_relationship_type')) == (4, 8, 2, 1))
check('mọi staff có party_id', one('SELECT count(*) FROM staff WHERE party_id IS NULL') == 0)
check('mọi staff có đúng một hồ sơ PERSON', one("SELECT count(*) FROM staff s JOIN pty_party p ON p.id = s.party_id AND p.party_kind='PERSON'") == 3)
rows = {r[0]: r[1:] for r in q("SELECT s.id, pe.family_name, pe.middle_name, pe.given_name FROM staff s JOIN pty_person pe ON pe.party_id = s.party_id")}
check('tách tên "Nguyễn Tuyên Phong" → họ/đệm/tên', rows['s-admin'] == ('Nguyễn', 'Tuyên', 'Phong'), rows['s-admin'])
check('tách tên "Trần Văn Bình"', rows['s-sales'] == ('Trần', 'Văn', 'Bình'), rows['s-sales'])
check('tên một từ "Hương" → họ NULL, đệm NULL, tên = Hương', rows['s-one'] == (None, None, 'Hương'), rows['s-one'])
def composed(f, m, g): return ' '.join(x for x in (f, m, g) if x)
bad = [r for r in q("SELECT p.display_name, pe.family_name, pe.middle_name, pe.given_name FROM pty_party p JOIN pty_person pe ON pe.party_id = p.id")
       if composed(r[1], r[2], r[3]) != r[0]]
check('bất biến R3: display_name = ghép họ + đệm + tên (mọi PERSON)', not bad, bad)
perms = dict(q("SELECT staff_id, permission_type_code FROM stf_permission WHERE valid_to_at IS NULL"))
check('quyền: admin → ADMIN (không kèm SALES), sales → SALES', perms == {'s-admin': 'ADMIN', 's-sales': 'SALES', 's-one': 'SALES'}, perms)
check('vai trò STAFF hiệu lực từ ngày VN của created_at (00:30 ngày 20 giờ VN, KHÔNG phải ngày 19 UTC)',
      one("SELECT valid_from_date FROM pty_party_role WHERE party_id='pty-s-admin'") == '2026-09-20')
check('KHÔNG sao chép staff.phone sang liên hệ (ADR-0001 mục 5)', one('SELECT count(*) FROM pty_contact_point') == 0)
check('PRAGMA foreign_key_check sạch', q('PRAGMA foreign_key_check') == [])
check('đơn cũ vẫn trỏ staff (orders.staff_id không bị đụng)', one("SELECT staff_id FROM orders WHERE id='o1'") == 's-sales')

print('\n[Bắt buộc party_id (ADR-0005 bước 2)]')
e = raises("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s-new','A','0900','x','sales',1,?)", NOW)
check('INSERT staff thiếu party_id bị chặn', e and 'staff_party' in e, e)
e = raises("UPDATE staff SET party_id = NULL WHERE id = 's-one'")
check('UPDATE party_id = NULL bị chặn', e and 'staff_party' in e, e)
db.execute("INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('pty-x','PERSON','X',?,?)", (NOW, NOW))
e = raises("UPDATE staff SET party_id = 'pty-s-admin' WHERE id = 's-one'")
check('hai tài khoản không được trỏ cùng một hồ sơ (chỉ mục duy nhất)', e and 'UNIQUE' in e, e)
e = raises("UPDATE staff SET party_id = 'khong-ton-tai' WHERE id = 's-one'")
check('party_id trỏ hồ sơ không tồn tại bị chặn (khoá ngoại)', e and 'FOREIGN KEY' in e, e)
db.execute("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s-ok','X','0900111222','x','sales',1,?, 'pty-x')", (NOW,))
check('INSERT staff có party_id hợp lệ được', one("SELECT count(*) FROM staff WHERE id='s-ok'") == 1)

print('\n[Quản trị viên cuối cùng]')
e = raises("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = 's-admin' AND valid_to_at IS NULL", '2026-09-21T00:00:00.000Z')
check('không được thu hồi quyền ADMIN cuối cùng', e and 'last_admin' in e, e)
e = raises("UPDATE staff SET active = 0 WHERE id = 's-admin'")
check('không được vô hiệu hoá tài khoản ADMIN cuối cùng', e and 'last_admin' in e, e)
db.execute("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('stp-2','s-sales','ADMIN',?,?,?)", (NOW, NOW, NOW))
e = raises("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = 's-admin' AND valid_to_at IS NULL", '2026-09-21T00:00:00.000Z')
check('có ADMIN thứ hai thì thu hồi ADMIN thứ nhất được', e is None, e)
e = raises("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('stp-3','s-sales','ADMIN',?,?,?)", NOW, NOW, NOW)
check('không cấp hai dòng quyền mở giống nhau (chỉ mục duy nhất)', e and 'UNIQUE' in e, e)
e = raises("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('stp-4','s-sales','KHONG_CO',?,?,?)", NOW, NOW, NOW)
check('loại quyền ngoài bảng tra cứu bị chặn (khoá ngoại thay CHECK)', e and 'FOREIGN KEY' in e, e)

print('\n[Vai trò theo nơi: mở, chồng lấn, NULL nơi]')
vp = one("SELECT id FROM loc_location WHERE code='CANG_VINPEARL'")
tp = one("SELECT id FROM loc_location WHERE code='VP_TRAN_PHU'")
P = 'pty-s-admin'
ins = lambda i, role, loc, frm, to: raises("INSERT INTO pty_party_role (id,party_id,role_type_code,location_id,valid_from_date,valid_to_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", i, P, role, loc, frm, to, NOW, NOW)
check('HDV @ Vinpearl từ 2026-09-20 (mở) được', ins('r1', 'GUIDE', vp, '2026-09-20', None) is None)
e = ins('r2', 'GUIDE', vp, '2026-10-01', None)
check('dòng mở thứ hai cùng (hồ sơ, vai, nơi) bị chặn', e is not None, e)
e = ins('r3', 'GUIDE', vp, '2026-01-01', '2026-01-31')
check('khoảng đóng KHÔNG chồng lấn (trước khi bắt đầu) được', e is None, e)
e = ins('r4', 'GUIDE', vp, '2026-01-15', '2026-02-15')
check('khoảng đóng chồng lấn khoảng đã có bị trigger chặn', e and 'party_role_overlap' in e, e)
e = ins('r5', 'GUIDE', vp, '2026-08-01', '2026-09-25')
check('khoảng đóng chồng lấn khoảng ĐANG MỞ (COALESCE 9999-12-31) bị chặn', e and 'party_role_overlap' in e, e)
check('cùng vai ở NƠI KHÁC thì độc lập (SALES @ Trần Phú)', ins('r6', 'SALES', tp, '2026-09-20', None) is None)
check('cùng vai KHÔNG gắn nơi (NULL) độc lập với vai có nơi', ins('r7', 'GUIDE', None, '2026-09-20', None) is None)
e = ins('r8', 'GUIDE', None, '2026-09-20', None)
check('hai dòng mở cùng vai, cùng NULL nơi bị chặn (IFNULL trong chỉ mục)', e is not None, e)
e = ins('r9', 'DRIVER', vp, '2026-02-30', None)   # vai chưa có dòng nào: không thể bị trigger chồng lấn chặn thay CHECK
check('ngày không tồn tại trong lịch (30/02) bị CHECK chặn', e and 'CHECK' in e, e)
e = ins('r9b', 'DRIVER', vp, '2026-09-20', '2026-09-19')
check('valid_to < valid_from bị CHECK chặn', e and 'CHECK' in e, e)
e = ins('r10', 'PHI_CONG', vp, '2026-09-20', None)
check('loại vai trò ngoài bảng tra cứu bị chặn (khoá ngoại)', e and 'FOREIGN KEY' in e, e)
e = raises("UPDATE pty_party_role SET valid_from_date = '2026-01-20' WHERE id = 'r1'")
check('UPDATE làm chồng lấn cũng bị trigger UPDATE chặn', e and 'party_role_overlap' in e, e)
e = raises("INSERT INTO pty_party_role (id,party_id,role_type_code,location_id,valid_from_date,created_at,updated_at) VALUES ('r11',?,?,'khong-co-noi','2026-09-20',?,?)", P, 'GUIDE', NOW, NOW)
check('địa điểm không tồn tại bị chặn (khoá ngoại ADR-0008)', e and 'FOREIGN KEY' in e, e)

print('\n[Liên hệ]')
mkc = lambda i, party, kind, val, norm, prim, frm='2026-09-20', to=None: raises(
    "INSERT INTO pty_contact_point (id,party_id,contact_kind_code,value,value_normalized,is_primary,valid_from_date,valid_to_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    i, party, kind, val, norm, prim, frm, to, NOW, NOW)
check('liên hệ chính đầu tiên được', mkc('c1', 'pty-s-sales', 'PHONE', '0901 234 567', '0901234567', 1) is None)
e = mkc('c2', 'pty-s-sales', 'PHONE', '0912 345 678', '0912345678', 1)
check('hai liên hệ chính đang mở cùng loại bị chặn', e and 'UNIQUE' in e, e)
check('liên hệ không chính thứ hai được', mkc('c3', 'pty-s-sales', 'PHONE', '0912 345 678', '0912345678', 0) is None)
check('SĐT dùng chung giữa hai hồ sơ ĐƯỢC PHÉP (chỉ mục tra cứu không duy nhất)', mkc('c4', 'pty-s-admin', 'PHONE', '0901 234 567', '0901234567', 0) is None)
check('tra theo SĐT chuẩn hoá trả cả hai hồ sơ', one("SELECT count(DISTINCT party_id) FROM pty_contact_point WHERE contact_kind_code='PHONE' AND value_normalized='0901234567'") == 2)
e = mkc('c5', 'pty-s-sales', 'ZALO', 'x', 'x', 0)
check('loại liên hệ ngoài bảng tra cứu bị chặn', e and 'FOREIGN KEY' in e, e)

print('\n[Quan hệ hồ sơ]')
db.execute("INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('org1','ORGANIZATION','Đại lý Sao Biển',?,?)", (NOW, NOW))
db.execute("INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('org1','Công ty TNHH Sao Biển','0312345678',?,?)", (NOW, NOW))
mkr = lambda i, f, t, frm, to=None: raises("INSERT INTO pty_party_relationship (id,from_party_id,to_party_id,relationship_type_code,valid_from_date,valid_to_date,created_at,updated_at) VALUES (?,?,?,'CONTACT_OF',?,?,?,?)", i, f, t, frm, to, NOW, NOW)
check('người liên hệ của đại lý (CONTACT_OF) được', mkr('rl1', 'pty-s-sales', 'org1', '2026-09-20') is None)
check('quan hệ với chính mình bị chặn (CHECK)', (mkr('rl2', 'org1', 'org1', '2026-09-20') or '').find('CHECK') >= 0)
e = mkr('rl3', 'pty-s-sales', 'org1', '2026-10-01')
check('quan hệ mở trùng bị chặn', e is not None, e)
e = raises("INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('pty-x','A','123',?,?)", NOW, NOW)
check('mã số thuế sai độ dài bị CHECK chặn', e and 'CHECK' in e, e)

print('\n[View công bố + truy vấn "ai giữ vai HDV ở Bến cảng Vinpearl hôm nay"]')
check('v_stf_staff_label trả tên từ hồ sơ', one("SELECT label FROM v_stf_staff_label WHERE id='s-admin'") == 'Nguyễn Tuyên Phong')
cols = [c[1] for c in q("PRAGMA table_info(v_stf_staff_label)")]
check('view chỉ chứa khoá + nhãn + cờ (không có pin_hash/role/phone)', cols == ['id', 'label', 'active', 'party_id'], cols)
pcols = [c[1] for c in q("PRAGMA table_info(v_pty_party_label)")]
check('v_pty_party_label: khoá + nhãn + loại + cờ + sort_key (không lộ cột nội bộ)', pcols == ['id', 'display_name', 'party_kind', 'active', 'sort_key'], pcols)
order = [r[0] for r in q("""SELECT s.id FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id
                           ORDER BY s.active DESC, pl.sort_key COLLATE NOCASE, s.created_at""")]
check('danh sách nhân sự theo sort_key (tên trước họ): Bình < Hương < Phong < X (s-ok thêm ở bước kiểm trigger)', order == ['s-sales', 's-one', 's-admin', 's-ok'], order)
check('sort_key một từ (Hương) = chính tên; nhiều từ = tên họ đệm',
      one("SELECT sort_key FROM v_pty_party_label WHERE id='pty-s-one'") == 'Hương'
      and one("SELECT sort_key FROM v_pty_party_label WHERE id='pty-s-admin'") == 'Phong Nguyễn Tuyên')
ocols = [c[1] for c in q("PRAGMA table_info(v_ord_order_label)")]
check('v_ord_order_label chỉ có khoá + nhãn (id, order_code)', ocols == ['id', 'order_code'], ocols)
check('v_ord_order_label trả mã đơn của đơn mẫu', len(q("SELECT id, order_code FROM v_ord_order_label")) == len(q("SELECT id FROM orders")) and len(q("SELECT id FROM orders")) >= 1)
today = '2026-09-25'
who = q("""SELECT pl.display_name FROM pty_party_role pr
           JOIN pty_role_type rt ON rt.code = pr.role_type_code
           JOIN v_loc_location_label l ON l.id = pr.location_id
           JOIN v_pty_party_label pl ON pl.id = pr.party_id
           WHERE rt.code = 'GUIDE' AND l.code = 'CANG_VINPEARL'
             AND pr.valid_from_date <= ? AND (pr.valid_to_date IS NULL OR pr.valid_to_date >= ?)""", today, today)
check('truy vấn HDV @ Vinpearl hôm nay = Nguyễn Tuyên Phong', who == [('Nguyễn Tuyên Phong',)], who)
check('hôm nay ngoài khoảng hiệu lực (trước 2026-09-20) thì không có ai', q("""SELECT 1 FROM pty_party_role pr JOIN v_loc_location_label l ON l.id = pr.location_id
      WHERE pr.role_type_code='GUIDE' AND l.code='CANG_VINPEARL' AND pr.valid_from_date <= '2026-09-10' AND (pr.valid_to_date IS NULL OR pr.valid_to_date >= '2026-09-10')""") == [])

print('\n[Toàn cục]')
check('PRAGMA foreign_key_check sạch sau toàn bộ thử nghiệm', q('PRAGMA foreign_key_check') == [])
new_tables = [r[0] for r in q("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'pty\\_%' ESCAPE '\\' OR name LIKE 'loc\\_%' ESCAPE '\\' OR name LIKE 'stf\\_%' ESCAPE '\\') ORDER BY name")]
business = [t for t in new_tables if not t.endswith('_type') and not t.endswith('_kind')]
audit_cols = {'created_at', 'created_by', 'updated_at', 'updated_by'}
missing = [t for t in business if not audit_cols <= {c[1] for c in q(f'PRAGMA table_info({t})')}]
check('mọi bảng nghiệp vụ mới có đủ 4 cột kiểm toán', not missing, missing)
who_fk = [(t, fk[3]) for t in new_tables for fk in q(f'PRAGMA foreign_key_list({t})') if fk[3] in ('created_by', 'updated_by')]
check('cột WHO created_by/updated_by KHÔNG có khoá ngoại (ADR-0003 điều 6)', not who_fk, who_fk)
cascades = [(t, fk[6]) for t in new_tables for fk in q(f'PRAGMA foreign_key_list({t})') if fk[6] == 'CASCADE' or fk[5] == 'CASCADE']
check('không có ON DELETE CASCADE trên bảng mới (ADR-0003 điều 4)', not cascades, cascades)
tlk = [t for t in new_tables if t.endswith('_type') or t.endswith('_kind')]
pks = {t: [c[1] for c in q(f'PRAGMA table_info({t})') if c[5]] for t in tlk}
check('bảng tra cứu dùng cột `code` làm khoá chính (ADR-0003 điều 1)', all(v == ['code'] for v in pks.values()), pks)
import re
def open_set_checks(t):
    sql = one("SELECT sql FROM sqlite_master WHERE name=?", t) or ''
    sql = re.sub(r'(active|is_primary) IN \(0, 1\)', '', sql)      # cờ nhị phân là tập ĐÓNG
    return re.findall(r'\bIN \(', sql)
offenders = {t: open_set_checks(t) for t in new_tables if t != 'pty_party' and open_set_checks(t)}   # pty_party.party_kind là tập đóng có chủ đích
check('không CHECK liệt kê giá trị trên tập MỞ (chỉ tập đóng: party_kind, cờ 0/1)', not offenders, offenders)
check('tập đóng duy nhất dùng CHECK là pty_party.party_kind', "party_kind IN ('PERSON', 'ORGANIZATION')" in one("SELECT sql FROM sqlite_master WHERE name='pty_party'"))

print('\n' + ('TẤT CẢ ĐẠT' if not fails else f'THẤT BẠI {len(fails)}: ' + '; '.join(fails)))
sys.exit(1 if fails else 0)
