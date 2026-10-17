// Bài migration 0107 (ADR-0125 đ5; lát H-4 Gói 2). Tìm tệp theo ĐUÔI. Phá thử: bỏ 'pin_reset' khỏi tầng VINH_VIEN của view → (b) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIG = new URL("../migrations/", import.meta.url);
const FILES = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const FILE = FILES.find((f) => f.endsWith("_xac_minh_ho_so.sql"))!;
function db(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = OFF"); // audit_log.staff_id có khoá ngoại tới staff; bài chỉ thử hình chiếu khoá nên không dựng tài khoản
  for (const f of FILES) d.exec(readFileSync(new URL(f, MIG), "utf8"));
  return d;
}
const T = "2026-10-17T00:00:00.000Z";
const T2 = "2026-10-17T00:05:00.000Z";
function ghiNhatKy(d: DatabaseSync, v: { id: string; actor: string | null; action: string; target: string; at: string; detail?: string; targetType?: string }) {
  d.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)")
    .run(v.id, v.actor, v.action, v.targetType ?? "staff", v.target, v.detail ?? null, v.at);
}

test("(a) tệp 0107 có, đứng sau 0105, chỉ THÊM (không DROP, không ALTER, không INSERT)", () => {
  assert.ok(FILE, "thiếu migrations/*_xac_minh_ho_so.sql");
  assert.ok(FILES.indexOf(FILE) > FILES.findIndex((f) => f.endsWith("_ho_so_tu_khai.sql")));
  const sql = readFileSync(new URL(FILE, MIG), "utf8").replace(/--.*$/gm, "");
  assert.doesNotMatch(sql, /\b(DROP|ALTER|INSERT|DELETE|UPDATE\s+\w+\s+SET)\b/i);
});

test("(b) view phân tầng đúng: tạo → TAO; đặt lại PIN, tắt lớp hai, hai sự kiện ADR-0121 → VINH_VIEN; sáu hành động (kể cả kích hoạt lại tài khoản) + đổi SĐT → CUA_SO_30; còn lại không vào", () => {
  const d = db();
  const A = "acc-1", X = "actor-1";
  const vao: [string, string | undefined, string | null][] = [
    ["staff_created", undefined, "TAO"], ["pin_reset", undefined, "VINH_VIEN"], ["mfa_reset", undefined, "VINH_VIEN"],
    ["mfa_grace_reopened", undefined, "VINH_VIEN"], ["mfa_exception_set", undefined, "VINH_VIEN"],
    ["passkey_removed", undefined, "CUA_SO_30"], ["login_unlocked", undefined, "CUA_SO_30"], ["permission_changed", undefined, "CUA_SO_30"],
    ["account_roles_changed", undefined, "CUA_SO_30"], ["staff_role_changed", undefined, "CUA_SO_30"],
    ["staff_reactivated", undefined, "CUA_SO_30"], // vòng sửa 1, m-9 (ruling Q2, hướng siết)
    ["staff_updated", 'tên "A" → "B"; đổi SĐT đăng nhập', "CUA_SO_30"],
    ["staff_updated", 'tên "A" → "B"', null], ["staff_suspended", undefined, null], ["session_revoked", undefined, null], ["pin_changed", undefined, null],
  ];
  vao.forEach(([action, detail], i) => ghiNhatKy(d, { id: `a${i}`, actor: X, action, target: A, at: T, detail }));
  ghiNhatKy(d, { id: "sync", actor: null, action: "staff_created", target: A, at: T }); // đồng bộ Sheet: không có người tạo
  ghiNhatKy(d, { id: "khac", actor: X, action: "pin_reset", target: "pty-1", at: T, targetType: "party" }); // không phải tài khoản
  // m-2: dòng target_type 'party' có target_id TRÙNG mã tài khoản cũng không được vào view (bỏ điều kiện target_type = 'staff' thì đỏ)
  ghiNhatKy(d, { id: "trung", actor: X, action: "pin_reset", target: A, at: T, targetType: "party" });
  const rows = d.prepare("SELECT loai, COUNT(*) AS n FROM v_aud_cham_tai_khoan WHERE account_id = ? AND actor_id = ? GROUP BY loai ORDER BY loai").all(A, X);
  assert.deepEqual(rows.map((r) => [r.loai, Number(r.n)]), [["CUA_SO_30", 7], ["TAO", 1], ["VINH_VIEN", 4]]);
  assert.equal(Number(d.prepare("SELECT COUNT(*) AS n FROM v_aud_cham_tai_khoan WHERE actor_id IS NULL").get()!.n), 0);
});

test("(c) view chỉ có bốn cột khoá — không detail (khuôn v_aud_account_event)", () => {
  const cols = db().prepare("SELECT name FROM pragma_table_info('v_aud_cham_tai_khoan')").all().map((r) => r.name);
  assert.deepEqual(cols, ["actor_id", "account_id", "loai", "at"]);
});

test("(d) chỉ mục idx_audit_target có và được dùng cho lính gác", () => {
  const plan = db().prepare("EXPLAIN QUERY PLAN SELECT 1 FROM v_aud_cham_tai_khoan WHERE account_id = ? AND actor_id = ?").all("a", "b");
  assert.ok(plan.some((r) => String(r.detail).includes("idx_audit_target")), JSON.stringify(plan));
});

test("(e) trigger: người khai không tự chấp nhận / tự từ chối phiếu của mình; RUT của chính mình vẫn được", () => {
  const d = db();
  d.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p1', 'PERSON', 'Người p1', 1, ?, ?)").run(T, T);
  d.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p1', 'Người p1', ?, ?)").run(T, T);
  d.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('pol-1', 1, 'Mục đích thử', 'Toàn văn thử', ?, ?, 's-sup', ?, 's-sup')`).run(T, T, T);
  d.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-1', 'p1', 'pol-1', 'DONG_Y', ?, 's-1', ?, 's-1')").run(T, T);
  // Ba phiếu khác loại (mỗi loại một phiếu chờ) để không vướng luật "một phiếu chờ".
  const phieu = (id: string, kind: string, birth: string | null, addr: string | null) => d.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, birth_date, address_value, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'p1', ?, 'pol-1', ?, ?, 'CHO_XAC_MINH', ?, 's-1', ?, 's-1')`).run(id, kind, birth, addr, T, T);
  phieu("f1", "NGAY_SINH", "1990-05-06", null);
  phieu("f2", "DIA_CHI", null, "1 Đường Thử");
  d.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, document_type_code, status, created_at, created_by, updated_at, updated_by)
    VALUES ('f3', 'p1', 'GIAY_TO', 'pol-1', 'HEALTH_CHECK', 'CHO_XAC_MINH', ?, 's-1', ?, 's-1')`).run(T, T);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = created_by WHERE id = 'f1'").run(T2), /self_submission_decider_is_author/);
  assert.throws(() => d.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', reason_code = 'KHONG_KHOP_GIAY_TO', decided_at = ?, decided_by = created_by WHERE id = 'f2'").run(T2), /self_submission_decider_is_author/);
  d.prepare("UPDATE pty_self_submission SET status = 'RUT', decided_at = ?, decided_by = created_by WHERE id = 'f3'").run(T2);
  d.prepare("UPDATE pty_self_submission SET status = 'DA_CHAP_NHAN', decided_at = ?, decided_by = 's-2' WHERE id = 'f1'").run(T2); // người khác: được
  assert.equal(d.prepare("SELECT status FROM pty_self_submission WHERE id = 'f1'").get()!.status, "DA_CHAP_NHAN");
});
