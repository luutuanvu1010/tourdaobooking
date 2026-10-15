// ADR-0075 điều 6(c): điều kiện "chính lô gỡ vừa kết thúc phiên" của câu `trusted_revoke_of_session` (mfa-repo.ts). Bài hành vi qua route
// (accounts/thu-hoi-may-tin.test.ts) KHÔNG bắt được điều kiện này, vì nhánh 409 của route trả về TRƯỚC lô — đây là lúc hai lệnh gỡ đua nhau: lô chạy trên
// phiên đã bị kết thúc ngay trước đó. Bài chạy đúng LÔ của route (câu kết thúc một phiên → câu thu hồi máy tin) trên SQLite thật (tests/audit/harness.mjs).
// Nguồn: bài nháp của người kiểm độc lập cuối (2026-10-15), đưa vào kho ở vòng sửa 2.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { endSessionStatement } from "./repository.ts";
import { trustedRevokeOfSessionStatement } from "./mfa-repo.ts";

const BH = "0e000000-0000-4000-8000-000000000001"; // chủ phiên
const QT = "0e000000-0000-4000-8000-000000000002"; // tài khoản khác (dữ liệu hỏng: máy tin của QT gắn vào phiên của BH)
const TQ = "0e000000-0000-4000-8000-000000000003"; // Toàn quyền gỡ
const TQ2 = "0e000000-0000-4000-8000-000000000004"; // Toàn quyền khác

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: BH, phone: "0904000001", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: QT, phone: "0904000002", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: TQ, phone: "0904000003", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: TQ2, phone: "0904000004", name: "Toàn Quyền Hai", perms: ["SUPER_ADMIN"] });
  return w;
}
type W = ReturnType<typeof setup>;

/** Gieo một máy tin `td-<sid>` (chủ `chuMay`) và một phiên PIN_TRUSTED `sid` của BH gắn với nó; phiên kết thúc sẵn nếu có `endedAt`. */
function gieo(w: W, sid: string, kt: { endedAt: string; reason: string; by: string } | null, chuMay = BH) {
  const at = new Date(Date.now() - 60_000).toISOString();
  const het = new Date(Date.now() + 86_400_000).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_trusted_device (id, staff_id, token_hash, label, created_at, created_by, updated_at, updated_by, last_used_at, expires_at, revoked_at, revoke_reason) VALUES (?, ?, ?, 'iPhone', ?, ?, ?, ?, ?, ?, NULL, NULL)",
  ).run(`td-${sid}`, chuMay, `h-${sid}`, at, chuMay, at, chuMay, at, het);
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, updated_at) VALUES (?, ?, 'PIN_TRUSTED', 0, ?, 'iPhone', ?, ?, ?, ?, ?, ?, ?)",
  ).run(sid, BH, `td-${sid}`, at, at, het, kt?.endedAt ?? null, kt?.reason ?? null, kt?.by ?? null, at);
}
/** Đúng lô của POST /api/sessions/:id/revoke (bỏ câu nhật ký — không ảnh hưởng điều kiện): kết thúc phiên 'bi_go' → thu hồi máy tin của phiên. */
const loGo = (w: W, sid: string, at: string, by = TQ) =>
  w.env.DB.batch([endSessionStatement(w.env.DB, sid, "bi_go", at, by), trustedRevokeOfSessionStatement(w.env.DB, sid, at, by)]);
const mayTin = (w: W, sid: string) => w.q("SELECT revoke_reason AS l, revoked_at AS r, updated_by AS b FROM aut_trusted_device WHERE id = ?", `td-${sid}`)[0];

test("trusted_revoke_of_session: phiên CÒN SỐNG → lô gỡ kết thúc phiên (changes 1) và thu hồi máy tin của nó 'bi_go', người làm = người gỡ", async () => {
  const w = setup();
  gieo(w, "s-song", null);
  gieo(w, "s-khac", null); // máy tin của phiên khác không đụng
  const at = new Date().toISOString();
  const r = await loGo(w, "s-song", at);
  assert.equal(r[0].meta.changes, 1);
  assert.equal(r[1].meta.changes, 1);
  assert.deepEqual({ ...mayTin(w, "s-song") }, { l: "bi_go", r: at, b: TQ });
  assert.equal(mayTin(w, "s-khac").l, null);
});

test("trusted_revoke_of_session: phiên ĐÃ kết thúc lý do 'dang_xuat' → câu kết thúc changes 0, máy tin giữ nguyên", async () => {
  const w = setup();
  gieo(w, "s-dx", { endedAt: new Date(Date.now() - 5_000).toISOString(), reason: "dang_xuat", by: BH });
  const r = await loGo(w, "s-dx", new Date().toISOString());
  assert.equal(r[0].meta.changes, 0);
  assert.equal(r[1].meta.changes, 0);
  assert.equal(mayTin(w, "s-dx").l, null);
});

test("trusted_revoke_of_session: phiên đã bị gỡ 'bi_go' ở MỐC GIỜ KHÁC (lần gỡ trước) → changes 0, máy tin giữ nguyên", async () => {
  const w = setup();
  gieo(w, "s-go-truoc", { endedAt: new Date(Date.now() - 5_000).toISOString(), reason: "bi_go", by: TQ });
  const r = await loGo(w, "s-go-truoc", new Date().toISOString());
  assert.equal(r[0].meta.changes, 0);
  assert.equal(r[1].meta.changes, 0);
  assert.equal(mayTin(w, "s-go-truoc").l, null);
});

test("trusted_revoke_of_session: phiên đã bị Toàn quyền KHÁC gỡ cùng mốc giờ → máy tin giữ nguyên (khớp cả người gỡ)", async () => {
  const w = setup();
  const at = new Date().toISOString();
  gieo(w, "s-dua", { endedAt: at, reason: "bi_go", by: TQ2 });
  const r = await loGo(w, "s-dua", at, TQ);
  assert.equal(r[0].meta.changes, 0);
  assert.equal(r[1].meta.changes, 0);
  assert.equal(mayTin(w, "s-dua").l, null);
});

test("trusted_revoke_of_session: phiên gắn máy tin của tài khoản KHÁC (dữ liệu hỏng) → không thu hồi máy của người khác", async () => {
  const w = setup();
  gieo(w, "s-lech", null, QT);
  const r = await loGo(w, "s-lech", new Date().toISOString());
  assert.equal(r[0].meta.changes, 1);
  assert.equal(r[1].meta.changes, 0);
  assert.equal(mayTin(w, "s-lech").l, null);
});
