// Kiểm migration hồ sơ công ty chủ (ADR-0024 điều 6, bổ sung 6.1–6.6; 6.5(ii) theo câu trả lời của chủ 2026-09-28 "cho Super Admin đổi" — cơ chế Y, nhật ký
// thi công T2b Ruling D12): hồ sơ tổ chức Tour Đảo, mã vai OWNER_COMPANY, ba trigger giữ "đúng một công ty chủ, không lúc nào trống".
// Dựng schema bằng node:sqlite từ migrations/*.sql. Tệp migration tìm theo ĐUÔI tên (không theo số — số có thể phải đổi khi nhiều nhánh
// cùng xếp hàng, chỉ đạo D1 của điều phối, nhật ký thi công T2b). Mọi giá trị riêng của công ty so với dòng company_profile đọc từ CSDL, không gõ tay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { OWNER_COMPANY_ROLE } from "./shared/cong-ty-chu.ts";
import { PARTY_ID_RE } from "./shared/party-id.ts";
import { normalizePhone } from "./shared/phone.ts";
import { ROLE_CODES } from "./shared/roles.ts";
import { vnToday } from "./shared/vn-date.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_cong_ty_chu.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const before = () => open(files.filter((f) => f < FILE));
type Row = Record<string, unknown>;
const goc = (db: DatabaseSync): Row => ({ ...(db.prepare("SELECT * FROM company_profile WHERE id = 'default'").get() as Row) });
const owners = (db: DatabaseSync): Row[] =>
  db.prepare(
    `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_by, o.legal_name, o.tax_code, o.address, o.invoice_email,
            r.id AS role_id, r.location_id, r.valid_from_date AS role_from, r.created_by AS role_created_by
     FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
     WHERE r.role_type_code = ? AND r.valid_to_date IS NULL`,
  ).all(OWNER_COMPANY_ROLE).map((r) => ({ ...r }));
const contactsOf = (db: DatabaseSync, partyId: string): Row[] =>
  db.prepare("SELECT id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date, created_by FROM pty_contact_point WHERE party_id = ? ORDER BY contact_kind_code, is_primary DESC, label")
    .all(partyId).map((r) => ({ ...r }));
/** Mọi id dòng do migration này gieo (hồ sơ, liên hệ, dòng vai) — để bài "không id cứng" quét. */
const seededIds = (db: DatabaseSync): string[] => {
  const [ho] = owners(db);
  return [String(ho!.id), String(ho!.role_id), ...contactsOf(db, String(ho!.id)).map((c) => String(c.id))];
};
const ROW_ID_RE = /^(?:ptr-)?[0-9a-f-]{36}$/; // như src/modules/parties/rules.ts: nút "Đóng"/"Kết thúc" của giao diện nhận được id này

test("migration hồ sơ công ty chủ: đúng một tệp; không phải migration siết B5; trigger (nếu có) không mang tên staff_/stf_", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_ho_so_cong_ty_chu.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/, "src/migrations-n1.test.ts nhận migration siết B5 theo tên tệp");
  assert.notEqual(FILE.slice(0, 4), "0019", "số 0019 để dành cho B5 (docs/CHANGE-GUIDE.md công thức d)");
  for (const [, name] of sqlOf(FILE).matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi)) assert.doesNotMatch(name!, /^(staff_|stf_)/i, `trigger ${name}: tên staff_/stf_ bị coi là trigger siết B5`);
});

test("mã vai OWNER_COMPANY: tên 'Công ty chủ', nhóm OTHER, ngưng gán mới (active = 0 — ẩn khỏi ô 'Thêm công việc'); không sinh quyền", () => {
  const t = { ...(all().prepare("SELECT code, name, role_group, active FROM pty_role_type WHERE code = ?").get(OWNER_COMPANY_ROLE) as Row) };
  assert.deepEqual(t, { code: OWNER_COMPANY_ROLE, name: "Công ty chủ", role_group: "OTHER", active: 0 });
  assert.equal((ROLE_CODES as readonly string[]).includes(OWNER_COMPANY_ROLE), false, "vai quyết định quyền (roles.ts) không được có mã này");
});

test("gieo ĐÚNG MỘT hồ sơ tổ chức đang mở vai công ty chủ; định danh chép từ company_profile; không gắn nơi; id hợp lệ", () => {
  const t0 = vnToday(new Date());
  const db = all();
  const t1 = vnToday(new Date());
  const src = goc(db);
  const list = owners(db);
  assert.equal(list.length, 1);
  const ho = list[0]!;
  assert.equal(ho.party_kind, "ORGANIZATION");
  assert.equal(ho.active, 1);
  assert.equal(ho.display_name, "Công ty TNHH Tour Đảo", "tên gọi = chữ đang hiện ở chân trang đăng nhập (G1, Q3 (a))");
  assert.equal(ho.legal_name, src.company_name);
  assert.equal(ho.tax_code, src.tax_code);
  assert.equal(ho.address, src.address);
  assert.equal(ho.invoice_email, null);
  assert.equal(ho.location_id, null);
  assert.equal(ho.created_by, null, "hệ thống gieo (không người sửa)");
  assert.equal(ho.role_created_by, null);
  assert.ok([t0, t1].includes(String(ho.role_from)), `ngày bắt đầu vai theo giờ Việt Nam: ${ho.role_from}`);
  assert.match(String(ho.id), PARTY_ID_RE);
  assert.match(String(ho.role_id), ROW_ID_RE);
});

test("liên hệ của hồ sơ công ty chủ: Hotline (PHONE, chính), Zalo (PHONE, phụ), email (EMAIL, chính) — giá trị và chuẩn hoá khớp nguồn", () => {
  const t0 = vnToday(new Date());
  const db = all();
  const t1 = vnToday(new Date());
  const src = goc(db);
  const [ho] = owners(db);
  const cs = contactsOf(db, String(ho!.id));
  const phones = cs.filter((c) => c.contact_kind_code === "PHONE");
  const hotline = phones.filter((c) => c.label === "Hotline");
  assert.equal(hotline.length, 1);
  assert.equal(hotline[0]!.is_primary, 1);
  assert.equal(hotline[0]!.value, String(src.hotline).trim());
  assert.equal(hotline[0]!.value_normalized, normalizePhone(String(src.hotline)));
  const zalo = phones.filter((c) => c.label === "Zalo");
  if (src.zalo_number !== null && String(src.zalo_number).trim() !== "") {
    assert.equal(zalo.length, 1);
    assert.equal(zalo[0]!.is_primary, 0);
    assert.equal(zalo[0]!.value, String(src.zalo_number).trim());
    assert.equal(zalo[0]!.value_normalized, normalizePhone(String(src.zalo_number)));
  } else assert.equal(zalo.length, 0);
  const emails = cs.filter((c) => c.contact_kind_code === "EMAIL");
  if (src.email !== null && String(src.email).trim() !== "") {
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.is_primary, 1);
    assert.equal(emails[0]!.value, String(src.email).trim());
    assert.equal(emails[0]!.value_normalized, String(src.email).trim().toLowerCase());
    assert.equal(emails[0]!.label, null);
  } else assert.equal(emails.length, 0);
  assert.equal(cs.length, phones.length + emails.length);
  assert.equal(phones.length, hotline.length + zalo.length, "không có liên hệ nào khác");
  for (const c of cs) {
    assert.match(String(c.id), ROW_ID_RE);
    assert.equal(c.valid_to_date, null);
    assert.equal(c.created_by, null);
    assert.ok([t0, t1].includes(String(c.valid_from_date)), `ngày bắt đầu liên hệ theo giờ Việt Nam: ${c.valid_from_date}`);
  }
});

test("chuẩn hoá SĐT bằng SQL khớp normalizePhone với mọi dạng viết (mẫu giả, không phải số của công ty)", () => {
  for (const mau of ["0901 234 567", "+84 901 234 567", "0901.234.567", "(0901) 234-567", "84901234567", " 0901-234-567\t"]) {
    const db = before();
    db.prepare("UPDATE company_profile SET hotline = ?, zalo_number = ? WHERE id = 'default'").run(mau, mau);
    db.exec(sqlOf(FILE));
    const [ho] = owners(db);
    const got = contactsOf(db, String(ho!.id)).filter((c) => c.contact_kind_code === "PHONE").map((c) => c.value_normalized);
    assert.deepEqual(got, [normalizePhone(mau), normalizePhone(mau)], JSON.stringify(mau));
  }
});

test("nguồn không có Zalo/email → không sinh liên hệ đó; không có dòng company_profile → không sinh hồ sơ nào (R-PTY-1 sẽ báo)", () => {
  let db = before();
  db.exec("UPDATE company_profile SET zalo_number = NULL, email = '  ' WHERE id = 'default'");
  db.exec(sqlOf(FILE));
  const [ho] = owners(db);
  assert.deepEqual(contactsOf(db, String(ho!.id)).map((c) => [c.contact_kind_code, c.label]), [["PHONE", "Hotline"]]);
  db = before();
  db.exec("DELETE FROM company_profile");
  db.exec(sqlOf(FILE));
  assert.deepEqual(owners(db), []);
  assert.equal((db.prepare("SELECT count(*) AS n FROM pty_role_type WHERE code = ?").get(OWNER_COMPANY_ROLE) as { n: number }).n, 1, "mã vai vẫn có (dữ liệu tra cứu)");
});

test("company_profile KHÔNG đổi một ô nào; tệp chỉ thêm (không DROP/ALTER/DELETE, không UPDATE company_profile)", () => {
  const db = before();
  const truoc = goc(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(goc(db), truoc);
  const code = sqlOf(FILE).replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\bDROP\b/i);
  assert.doesNotMatch(code, /\bALTER\b/i);
  assert.doesNotMatch(code, /\bDELETE\b/i);
  assert.doesNotMatch(code, /\bUPDATE\s+company_profile\b/i);
});

test("tệp không chứa SĐT/MST/email viết tay — mọi giá trị riêng của công ty CHÉP từ company_profile (luật đầu 0020 và 0024)", () => {
  const code = sqlOf(FILE).replace(/--.*$/gm, "").replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "");
  assert.doesNotMatch(code, /\d[\d .()+-]{7,}\d/, "dãy số dài giống SĐT/MST");
  assert.doesNotMatch(code, /@/, "email viết tay");
});

test("không id cứng (ADR-0024 điều 6): id các dòng gieo không xuất hiện trong mã, test, kịch bản — chỉ trong chính tệp migration", () => {
  const ids = seededIds(all());
  assert.ok(ids.length >= 3);
  const EXT = /\.(ts|mjs|js|json|html|css)$/;
  const SKIP = new Set(["node_modules", ".git", ".wrangler"]);
  const skipPath = (rel: string) => rel === "public/js" || rel.startsWith("public/js/") || rel === "public/sw.js";
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      if (SKIP.has(name)) return [];
      const p = join(dir, name);
      const rel = relative(ROOT, p).split(sep).join("/");
      if (skipPath(rel)) return [];
      if (statSync(p).isDirectory()) return walk(p);
      return EXT.test(name) ? [p] : [];
    });
  const problems: string[] = [];
  for (const top of ["src", "web", "scripts", "tests", "public", "docs/evidence"]) {
    for (const f of walk(join(ROOT, top))) {
      const text = readFileSync(f, "utf8");
      for (const id of ids) if (text.includes(id)) problems.push(`${relative(ROOT, f)}: ${id.slice(0, 8)}…`);
    }
  }
  assert.deepEqual(problems, [], "tra hồ sơ công ty chủ bằng mã vai qua hàm công bố ownerCompany, không bằng id");
});

// ---- 6.5 (ii) theo cơ chế Y (chủ trả lời 2026-09-28 "cho Super Admin đổi" — Ruling D12): ba trigger trên pty_party_role ---------------
const ACTOR = "11111111-0000-4000-8000-000000000001";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const ORG_C = "33333333-3333-4333-8333-333333333333";
const org = (db: DatabaseSync, id: string, name: string) =>
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('${id}', 'ORGANIZATION', '${name}', 'x', 'x')`);
let seq = 0;
/** Câu "đổi công ty chủ": chèn MỘT dòng vai OWNER_COMPANY đang mở cho hồ sơ `party` từ ngày `from` (như route gán vai). */
const openOwner = (db: DatabaseSync, party: string, from: string) =>
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
           VALUES ('44444444-4444-4444-8444-${String(++seq).padStart(12, "0")}', '${party}', '${OWNER_COMPANY_ROLE}', NULL, '${from}', NULL, 'x', '${ACTOR}', 'x', '${ACTOR}')`);
const ownerRows = (db: DatabaseSync): Row[] =>
  db.prepare("SELECT id, party_id, valid_from_date AS f, valid_to_date AS t, updated_by FROM pty_party_role WHERE role_type_code = ? ORDER BY id")
    .all(OWNER_COMPANY_ROLE).map((r) => ({ ...r }));
const openParties = (db: DatabaseSync): string[] => ownerRows(db).filter((r) => r.t === null).map((r) => String(r.party_id));
/** D1 dựng đủ migration; dòng công ty chủ gieo được dời về 2026-01-01 để ngày đóng khi đổi không phụ thuộc hôm nay. */
const seeded = () => {
  const db = all();
  db.exec(`UPDATE pty_party_role SET valid_from_date = '2026-01-01' WHERE role_type_code = '${OWNER_COMPANY_ROLE}'`);
  const [ho] = owners(db);
  return { db, A: String(ho!.id), vaiA: String(ho!.role_id) };
};

test("trigger (a): đổi công ty chủ = MỘT câu chèn dòng mới — dòng mở cũ tự đóng ở ngày trước ngày bắt đầu của dòng mới (T5), ghi người đổi; luôn đúng một dòng mở", () => {
  const { db, A, vaiA } = seeded();
  org(db, ORG_B, "Pháp nhân B");
  openOwner(db, ORG_B, "2026-09-28");
  assert.deepEqual(openParties(db), [ORG_B]);
  const cu = ownerRows(db).find((r) => r.id === vaiA)!;
  assert.equal(cu.party_id, A);
  assert.equal(cu.t, "2026-09-27", "valid_to_date là ngày CUỐI còn hiệu lực (bao gồm): dòng mới từ 28/9 thì dòng cũ tới 27/9");
  assert.equal(cu.updated_by, ACTOR, "ghi ai đã đổi");
  org(db, ORG_C, "Pháp nhân C");
  openOwner(db, ORG_C, "2026-10-01");
  assert.deepEqual(openParties(db), [ORG_C], "đổi lần hai: vẫn đúng một dòng mở, là dòng mới nhất");
  assert.equal(ownerRows(db).find((r) => r.party_id === ORG_B)!.t, "2026-09-30");
  assert.equal(owners(db).length, 1);
});

test("trigger (a): ngày đóng không bao giờ trước ngày bắt đầu của dòng cũ (CHECK của bảng) — dòng cũ bắt đầu cùng ngày hoặc sau → đóng ở chính ngày bắt đầu của nó", () => {
  const { db, vaiA } = seeded();
  db.exec(`UPDATE pty_party_role SET valid_from_date = '2026-09-28' WHERE id = '${vaiA}'`);
  org(db, ORG_B, "Pháp nhân B");
  openOwner(db, ORG_B, "2026-09-28");
  assert.equal(ownerRows(db).find((r) => r.id === vaiA)!.t, "2026-09-28");
  const { db: db2, vaiA: vai2 } = seeded();
  db2.exec(`UPDATE pty_party_role SET valid_from_date = '2026-12-01' WHERE id = '${vai2}'`);
  org(db2, ORG_B, "Pháp nhân B");
  openOwner(db2, ORG_B, "2026-09-28");
  assert.equal(ownerRows(db2).find((r) => r.id === vai2)!.t, "2026-12-01");
  assert.deepEqual(openParties(db2), [ORG_B]);
});

test("trigger (a) — giới hạn đã biết (T5): đổi A → B → A trong cùng ngày được; lần thứ ba sang B cùng ngày bị trigger chồng lấn 0011 chặn, không đổi gì", () => {
  const { db, A } = seeded();
  org(db, ORG_B, "Pháp nhân B");
  openOwner(db, ORG_B, "2026-09-28");
  openOwner(db, A, "2026-09-28");
  assert.deepEqual(openParties(db), [A]);
  assert.throws(() => openOwner(db, ORG_B, "2026-09-28"), /party_role_overlap/);
  assert.deepEqual(openParties(db), [A]);
});

test("trigger (b): đóng dòng công ty chủ đang mở CUỐI CÙNG bị chặn — kể cả đóng-rồi-mở trong MỘT giao dịch; mở-rồi-đóng-dòng-mới cũng bị chặn", () => {
  const { db, vaiA } = seeded();
  assert.throws(() => db.exec(`UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE id = '${vaiA}'`), /owner_company_last_open/);
  org(db, ORG_B, "Pháp nhân B");
  db.exec("BEGIN");
  assert.throws(() => {
    db.exec(`UPDATE pty_party_role SET valid_to_date = '2026-09-27' WHERE id = '${vaiA}'`);
    openOwner(db, ORG_B, "2026-09-28");
  }, /owner_company_last_open/);
  db.exec("ROLLBACK");
  db.exec("BEGIN");
  assert.throws(() => {
    openOwner(db, ORG_B, "2026-09-28");
    db.exec(`UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE role_type_code = '${OWNER_COMPANY_ROLE}' AND valid_to_date IS NULL`);
  }, /owner_company_last_open/);
  db.exec("ROLLBACK");
  assert.equal(owners(db).length, 1);
  assert.equal(ownerRows(db).find((r) => r.id === vaiA)!.t, null);
});

test("trigger (c): mở lại dòng công ty chủ đã đóng bị chặn (đổi lại = gán dòng mới, không sửa lịch sử)", () => {
  const { db, vaiA } = seeded();
  org(db, ORG_B, "Pháp nhân B");
  openOwner(db, ORG_B, "2026-09-28");
  assert.throws(() => db.exec(`UPDATE pty_party_role SET valid_to_date = NULL WHERE id = '${vaiA}'`), /owner_company_no_reopen/);
  assert.deepEqual(openParties(db), [ORG_B]);
});

test("gán vai lần hai cho CHÍNH hồ sơ đang là công ty chủ: trigger chồng lấn 0011 chặn trước — không dòng nào bị đóng", () => {
  const { db, A, vaiA } = seeded();
  assert.throws(() => openOwner(db, A, "2026-09-28"), /party_role_overlap/);
  assert.equal(ownerRows(db).find((r) => r.id === vaiA)!.t, null);
  assert.deepEqual(openParties(db), [A]);
});

test("giới hạn đã biết — Q1 (a): chèn một dòng ĐÃ ĐÓNG của vai cho hồ sơ khác KHÔNG bị chặn và không đổi công ty chủ (chỉ SQL gõ tay làm được)", () => {
  const { db, A } = seeded();
  org(db, ORG_B, "Pháp nhân B");
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at)
           VALUES ('66666666-7777-4888-8999-000000000000', '${ORG_B}', '${OWNER_COMPANY_ROLE}', '2020-01-01', '2020-12-31', 'x', 'x')`);
  assert.deepEqual(openParties(db), [A]);
});
