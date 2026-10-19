// ADR-0075 điều 7–8 (Task 7): xem / gỡ phiên đăng nhập. Hai ô mới `auth.session.viewAll`, `auth.session.revoke` — chỉ Toàn quyền; Quản trị không giữ
// Toàn quyền → 403 trong THÂN handler (cổng "admin" của router cho Quản trị qua), Nhân sự → 403 ở cổng. Gỡ phiên ghi `session_revoked` (im lặng — ADR-0038),
// không IP. Lịch sử phiên của chính mình: chỉ dòng của người gọi, không lộ User-Agent thô. Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs.
// Route nằm ở module `accounts` (cạnh accounts → auth/audit/staff đã có); auth KHÔNG import audit (ALLOWED_EDGES) — xem nhật ký thi công Task 7.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { AUDIT_ACTIONS, SILENT_AUDIT_ACTIONS } from "../../shared/audit-actions.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const SUP2 = "55555555-5555-4555-8555-555555555555";
const HR = "44444444-4444-4444-8444-444444444444";

function seedAll(w: any) {
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: SUP2, phone: "0900000005", name: "IT Hai", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  return w;
}
const setup = () => seedAll(world());

/** Chèn một dòng phiên đã kết thúc / còn sống trực tiếp (máy khác). */
function themPhien(w: any, v: { id: string; staff: string; single?: number; createdAt?: string; endedAt?: string | null; reason?: string | null; ua?: string; ip?: string | null }) {
  const at = v.createdAt ?? new Date(Date.now() - 3600_000).toISOString();
  w.sqlite.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by, created_by, updated_at, updated_by) " +
      "VALUES (?1, ?2, 'PASSKEY', ?3, NULL, 'iPhone · Safari', ?4, ?5, ?6, ?6, ?7, ?8, ?9, NULL, ?2, ?6, NULL)",
  ).run(v.id, v.staff, v.single ?? 1, v.ua ?? "Mozilla/5.0 (iPhone) UA-THO-BI-MAT", v.ip ?? "10.1.2.3", at, new Date(Date.now() + 86400_000).toISOString(), v.endedAt ?? null, v.reason ?? null);
}
const maPhien = (token: string) => token.split(".")[2]!;
const callWith = (w: any, token: string, method: string, path: string, body?: unknown) =>
  w.call(method, path, { headers: { cookie: `td_session=${token}` }, ...(body === undefined ? {} : { body }) });

test("ADR-0075 điều 8: session_revoked có nhãn tiếng Việt và thuộc SILENT_AUDIT_ACTIONS (im lặng như pin_reset, passkey_removed)", () => {
  assert.equal(AUDIT_ACTIONS.session_revoked.label, "Đăng xuất một máy đang đăng nhập");
  assert.equal(AUDIT_ACTIONS.session_revoked.group, "staff");
  assert.ok((SILENT_AUDIT_ACTIONS as readonly string[]).includes("session_revoked"));
});

test("ADR-0075 điều 7: Quản trị (không Toàn quyền), Nhân sự, Bán hàng → 403 ở GET /api/sessions và POST /api/sessions/:id/revoke; Toàn quyền → 200", async () => {
  const w = setup();
  const tk = await w.token(SALES);
  const sid = maPhien(tk);
  for (const who of [ADM, HR, SALES]) {
    assert.equal((await w.call("GET", "/api/sessions", { as: who })).status, 403, `GET × ${who}`);
    assert.equal((await w.call("POST", `/api/sessions/${sid}/revoke`, { as: who, body: {} })).status, 403, `POST × ${who}`);
  }
  assert.equal(w.q("SELECT ended_at FROM aut_session WHERE id = ?", sid)[0].ended_at, null, "403 không kết thúc phiên");
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'session_revoked'")[0].n, 0, "403 không ghi nhật ký");
  const ok = await w.call("GET", "/api/sessions", { as: SUP });
  assert.equal(ok.status, 200, ok.text);
});

test("ADR-0075 điều 7–8: Toàn quyền gỡ phiên của Bán hàng → máy đó 401; dòng 'bi_go' + ended_by; một dòng nhật ký không IP; Bảng tin đóng đúng phiên", async () => {
  const goi: any[] = [];
  const w = seedAll(world({ ghiDe: { dongBangTin: async (_env: unknown, muc: unknown) => { goi.push(muc); } } }));
  const tk = await w.token(SALES);
  const sid = maPhien(tk);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 200);
  const r = await w.call("POST", `/api/sessions/${sid}/revoke`, { as: SUP, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal((await callWith(w, tk, "GET", "/api/auth/me")).status, 401, "máy bị gỡ → 401");
  const d = w.q("SELECT end_reason, ended_by, ended_at, updated_by FROM aut_session WHERE id = ?", sid)[0];
  assert.equal(d.end_reason, "bi_go");
  assert.equal(d.ended_by, SUP);
  assert.equal(d.updated_by, SUP);
  const logs = w.q("SELECT staff_id, target_type, target_id, detail, created_at FROM audit_log WHERE action = 'session_revoked'");
  assert.equal(logs.length, 1);
  assert.equal(logs[0].staff_id, SUP);
  assert.equal(logs[0].target_type, "staff");
  assert.equal(logs[0].target_id, SALES);
  assert.ok(String(logs[0].detail).includes(sid), "nhật ký ghi mã phiên");
  assert.ok(!/\d+\.\d+\.\d+\.\d+|Mozilla/.test(String(logs[0].detail)), "nhật ký không có IP / User-Agent");
  assert.equal(logs[0].created_at, d.ended_at, "MỘT mốc giờ cho cả lô");
  assert.deepEqual(goi, [{ staffId: SALES, sessionIds: [sid], chiPhien: true }], "dạng CHỈ phiên bị gỡ (ADR-0075 điều 6b) — không tắt máy khác của tài khoản");

  // Gỡ lần nữa → 409, không thêm nhật ký; mã không tồn tại → 404
  const lai = await w.call("POST", `/api/sessions/${sid}/revoke`, { as: SUP, body: {} });
  assert.equal(lai.status, 409);
  assert.equal(lai.json.error.code, "already_ended");
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'session_revoked'")[0].n, 1);
  assert.equal((await w.call("POST", "/api/sessions/khong-co/revoke", { as: SUP, body: {} })).status, 404);
});

test("ADR-0075 điều 6b: gỡ một phiên CHỈ tắt thông báo màn hình khoá của ĐÚNG máy đó (bi-go) — máy kia (phiên khác) của cùng tài khoản vẫn bật (nối dây thật ở gốc lắp ráp)", async () => {
  const w = setup(); // không ghiDe: dongBangTin thật của src/index.ts
  // SUP2 miễn một máy (Toàn quyền) → giữ được hai phiên sống cùng lúc. w.token dùng lại phiên sống MỚI NHẤT ⇒ chèn phiên B (mới hơn) rồi mới lấy token B.
  const tkA = await w.token(SUP2);
  themPhien(w, { id: "phien-may-b", staff: SUP2, single: 0, createdAt: new Date(Date.now() + 1000).toISOString() });
  const tkB = await w.token(SUP2);
  assert.notEqual(maPhien(tkA), maPhien(tkB), "hai máy phải là hai phiên khác nhau");
  const epA = "https://fcm.googleapis.com/fcm/send/may-a";
  const epB = "https://fcm.googleapis.com/fcm/send/may-b";
  for (const [tk, ep] of [[tkA, epA], [tkB, epB]] as const) {
    const r = await callWith(w, tk, "POST", "/api/account/thong-bao/may", { endpoint: ep, thietBi: "Máy thử" });
    assert.equal(r.status, 200, r.text);
  }
  const dong = (ep: string) => w.q("SELECT session_id, revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = ?", ep)[0];
  assert.equal(dong(epA).session_id, maPhien(tkA));
  assert.equal(dong(epB).session_id, maPhien(tkB));
  const r = await w.call("POST", `/api/sessions/${maPhien(tkA)}/revoke`, { as: SUP, body: {} });
  assert.equal(r.status, 200, r.text);
  // dongBangTin là bắn-và-quên → đợi tới khi máy A đổi (cùng MỘT câu UPDATE quyết cả hai dòng: A đổi xong thì B đã ở trạng thái cuối)
  for (let i = 0; i < 100 && !dong(epA).revoked_at; i++) await new Promise((res) => setTimeout(res, 10));
  assert.ok(dong(epA).revoked_at, "máy bị gỡ phải tắt thông báo");
  assert.equal(dong(epA).revoke_reason, "bi-go");
  assert.equal(dong(epB).revoked_at, null, "máy kia của cùng tài khoản KHÔNG bị tắt");
  assert.equal((await callWith(w, tkB, "GET", "/api/auth/me")).status, 200, "máy kia vẫn đăng nhập");
});

test("ADR-0075 điều 7: Toàn quyền tự gỡ phiên của chính mình → 409 'Dùng nút Đăng xuất'; gỡ được phiên của Toàn quyền khác (cùng cấp)", async () => {
  const w = setup();
  const mine = await w.token(SUP);
  const r = await callWith(w, mine, "POST", `/api/sessions/${maPhien(mine)}/revoke`, {});
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "self_session");
  assert.match(r.json.error.message, /Đăng xuất/);
  const other = await w.token(SUP2);
  assert.equal((await callWith(w, mine, "POST", `/api/sessions/${maPhien(other)}/revoke`, {})).status, 200);
  assert.equal((await callWith(w, other, "GET", "/api/auth/me")).status, 401);
});

test("GET /api/account/sessions: chỉ phiên của CHÍNH MÌNH, máy này đánh dấu thisDevice, không lộ User-Agent thô", async () => {
  const w = setup();
  themPhien(w, { id: "cu-cua-an", staff: SALES, endedAt: new Date(Date.now() - 1800_000).toISOString(), reason: "bi_thay" });
  themPhien(w, { id: "cua-chu", staff: SUP, single: 0 });
  const tk = await w.token(SALES);
  const r = await callWith(w, tk, "GET", "/api/account/sessions");
  assert.equal(r.status, 200, r.text);
  const ss = r.json.sessions;
  assert.deepEqual(ss.map((s: any) => s.id).sort(), ["cu-cua-an", maPhien(tk)].sort(), "không có phiên của người khác");
  const nay = ss.find((s: any) => s.id === maPhien(tk));
  assert.equal(nay.thisDevice, true);
  assert.equal(nay.live, true);
  assert.equal(nay.statusLabel, "Đang hiệu lực");
  const cu = ss.find((s: any) => s.id === "cu-cua-an");
  assert.equal(cu.thisDevice, false);
  assert.equal(cu.live, false);
  assert.equal(cu.statusLabel, "Bị thay bởi máy khác");
  assert.equal(cu.method, "PASSKEY");
  assert.equal(cu.methodLabel, "Face ID");
  assert.equal(cu.deviceLabel, "iPhone · Safari");
  assert.equal(cu.ip, "10.1.2.3");
  assert.ok(!r.text.includes("UA-THO-BI-MAT") && !r.text.includes("Mozilla"), "không trả User-Agent thô");
  assert.ok(!("userAgent" in cu) && !("user_agent" in cu));
  assert.deepEqual(Object.keys(cu).sort(), ["createdAt", "deviceLabel", "endedAt", "id", "ip", "lastSeenAt", "live", "method", "methodLabel", "statusLabel", "thisDevice"]);
});

test("GET /api/sessions (Toàn quyền): tên người, lọc theo tài khoản và 'đang hiệu lực'; phiên chết theo lưới credentials_changed_at hiện 'Đã đổi thông tin đăng nhập'", async () => {
  const w = setup();
  // Phiên của Toàn quyền khác cấp TRƯỚC lần đổi PIN gần nhất mà dòng chưa kết thúc (vd dữ liệu cũ) — DTO phải tính theo lưới, không hiện "Đang hiệu lực".
  themPhien(w, { id: "chet-theo-luoi", staff: SUP2, single: 0, createdAt: new Date(Date.now() - 7200_000).toISOString() });
  w.sqlite.prepare("UPDATE staff SET credentials_changed_at = ? WHERE id = ?").run(Date.now() - 3600_000, SUP2);
  themPhien(w, { id: "da-xong", staff: SALES, endedAt: new Date(Date.now() - 600_000).toISOString(), reason: "dang_xuat" });
  const tkAn = await w.token(SALES);
  const all = await w.call("GET", "/api/sessions", { as: SUP });
  assert.equal(all.status, 200, all.text);
  const by = new Map(all.json.sessions.map((s: any) => [s.id, s]));
  const chet: any = by.get("chet-theo-luoi");
  assert.equal(chet.live, false);
  assert.equal(chet.statusLabel, "Đã đổi thông tin đăng nhập");
  assert.equal(chet.staffId, SUP2);
  assert.equal(chet.staffName, "IT Hai");
  const an: any = by.get(maPhien(tkAn));
  assert.equal(an.staffName, "An");
  assert.equal(an.live, true);
  assert.ok(!all.text.includes("UA-THO-BI-MAT"), "không trả User-Agent thô");
  // datLaiPinDuoc (máy chủ tính, cùng luật route reset-pin: hai ô + không phải chính mình + mayManage) — nút "Gỡ phiên + đặt lại PIN" chỉ hiện khi true.
  // Hôm nay chỉ Toàn quyền xem được trang và Toàn quyền quản lý được mọi tài khoản ⇒ false CHỈ ở phiên của chính mình (canh trước cho khi ô xem mở rộng).
  const cuaToi = await w.token(SUP);
  const all2 = await w.call("GET", "/api/sessions", { as: SUP });
  const by2 = new Map(all2.json.sessions.map((s: any) => [s.id, s]));
  assert.equal((by2.get(maPhien(cuaToi)) as any).datLaiPinDuoc, false, "phiên của chính mình: máy chủ chặn tự đặt lại PIN");
  assert.equal((by2.get(maPhien(tkAn)) as any).datLaiPinDuoc, true, "Bán hàng: Toàn quyền đặt lại PIN được");
  assert.equal((by2.get("chet-theo-luoi") as any).datLaiPinDuoc, true, "Toàn quyền khác: Toàn quyền đặt lại PIN được (cùng cấp)");

  const loc = await w.call("GET", `/api/sessions?staffId=${SALES}&live=1`, { as: SUP });
  assert.equal(loc.status, 200);
  assert.deepEqual(loc.json.sessions.map((s: any) => s.id), [maPhien(tkAn)], "chỉ phiên còn sống của An");
  const locHet = await w.call("GET", `/api/sessions?staffId=${SALES}`, { as: SUP });
  assert.deepEqual(locHet.json.sessions.map((s: any) => s.id).sort(), ["da-xong", maPhien(tkAn)].sort());
  assert.equal((await w.call("GET", "/api/sessions?staffId=rac", { as: SUP })).status, 400, "mã tài khoản hỏng → 400");
});

test("ADR-0075 điều 7: gỡ phiên đã chết mà dòng chưa kết thúc (hết hạn / chết theo lưới credentials_changed_at) → 409 already_ended; không ghi đè lịch sử, không nhật ký, không gọi Bảng tin", async () => {
  const goi: any[] = [];
  const w = seedAll(world({ ghiDe: { dongBangTin: async (_env: unknown, muc: unknown) => { goi.push(muc); } } }));
  themPhien(w, { id: "het-han", staff: SALES });
  w.sqlite.prepare("UPDATE aut_session SET expires_at = ? WHERE id = 'het-han'").run(new Date(Date.now() - 60_000).toISOString());
  themPhien(w, { id: "chet-luoi", staff: SUP2, single: 0, createdAt: new Date(Date.now() - 7200_000).toISOString() });
  w.sqlite.prepare("UPDATE staff SET credentials_changed_at = ? WHERE id = ?").run(Date.now() - 3600_000, SUP2);
  for (const id of ["het-han", "chet-luoi"]) {
    const r = await w.call("POST", `/api/sessions/${id}/revoke`, { as: SUP, body: {} });
    assert.equal(r.status, 409, `${id}: ${r.text}`);
    assert.equal(r.json.error.code, "already_ended");
    const d = w.q("SELECT ended_at, end_reason FROM aut_session WHERE id = ?", id)[0];
    assert.equal(d.ended_at, null, `${id}: không ghi 'bi_go' lên phiên đã chết`);
    assert.equal(d.end_reason, null);
  }
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'session_revoked'")[0].n, 0, "không nhật ký");
  assert.deepEqual(goi, [], "không tắt thông báo / Bảng tin của tài khoản");
});
