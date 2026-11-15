// ADR-0210 (vòng sửa 1 Task 10, I-1): kế hoạch truy vấn của view `v_pty_verification_facts` trên CSDL có NHIỀU căn cước chưa chạy ANALYZE (như bản thật) phải đi bằng hai chỉ mục ghép của 0171,
// không rơi vào `pty_person_document_number_ix` / `pty_verification_target_ix` (quét cả loại cho mỗi hồ sơ ⇒ bình phương). Phá thử: bỏ một trong hai chỉ mục khỏi 0171 ⇒ bài đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { openDb } from "../tests/audit/harness.mjs";

const N = 400;
function dung() {
  const db = openDb();
  db.exec("BEGIN");
  const t = "2026-11-01T00:00:00.000Z";
  const hoSo = db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Người', 1, ?, ?)");
  const nguoi = db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'N', ?, ?)");
  const gt = db.prepare("INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES (?, ?, 'CCCD', ?, ?, ?, ?)");
  const xm = db.prepare(`INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'DA_XAC_MINH', ?, 'ng', ?, 'ng')`);
  for (let i = 0; i < N; i++) {
    const p = `p${i}`;
    hoSo.run(p, t, t); nguoi.run(p, t, t);
    gt.run(`d${i}`, p, `0790${String(i).padStart(8, "0")}`, `0790${String(i).padStart(8, "0")}`, t, t);
    xm.run(`xa${i}`, p, "ATTRIBUTE", null, "HO_TEN", t, t);
    xm.run(`xb${i}`, p, "PERSON_DOCUMENT", `d${i}`, null, t, t);
  }
  db.exec("COMMIT");
  return db;
}
const SQL = "SELECT * FROM v_pty_verification_facts WHERE party_id IN (SELECT value FROM json_each(?))";

test("view dữ kiện: truy vấn con theo từng hồ sơ dùng chỉ mục ghép, KHÔNG dùng chỉ mục số giấy tờ hay chỉ mục theo loại đích", () => {
  const db = dung();
  const ids = JSON.stringify(Array.from({ length: N }, (_, i) => `p${i}`));
  const kh = (db.prepare(`EXPLAIN QUERY PLAN ${SQL}`).all(ids) as { detail: string }[]).map((r) => r.detail).join("\n");
  assert.ok(!/pty_person_document_number_ix/.test(kh), `kế hoạch còn dùng pty_person_document_number_ix:\n${kh}`);
  assert.ok(!/pty_verification_target_ix/.test(kh), `kế hoạch còn dùng pty_verification_target_ix:\n${kh}`);
  assert.match(kh, /pty_person_document_party_type_ix/);
  assert.match(kh, /pty_verification_party_target_ix/);
  assert.equal((db.prepare(SQL).all(ids) as unknown[]).length, N * 3, "mỗi hồ sơ ba mục bắt buộc");
});
