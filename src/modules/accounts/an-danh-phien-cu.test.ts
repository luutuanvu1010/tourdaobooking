// ADR-0126 đ8 (lát H-5 Gói 2, việc 6): Toàn quyền bấm "ẩn danh IP và thông tin máy của phiên đã kết thúc quá hạn" — chạy CẢ ứng dụng trên SQLite thật trong bộ nhớ (tests/audit/harness.mjs).
// Thời hạn KHÔNG có số nào trong mã: số 30 dưới đây chỉ có trong bài (đăng vào chính sách thử). Chưa có số ⇒ GET trả null, POST trả 409, không đổi dòng nào.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const SALES = "11111111-1111-4111-8111-111111111111";
const HR = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const DUONG = "/api/sessions/an-danh-cu";
const MUC_DICH = "Thử: xác minh danh tính, điền sẵn hoá đơn.";
const IP_THAT = "203.0.113.77";
const UA_THAT = "Mozilla/5.0 (Thử) Máy-Của-Anh-A";
const NGAY = 86_400_000;

// biome-ignore lint/suspicious/noExplicitAny: khung thử .mjs không có khai kiểu
type W = any;
function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000006", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const Q = (w: W, sql: string, ...a: unknown[]) => w.q(sql, ...a).map((r: object) => ({ ...r }));
const dangChinhSach = (w: W, body: Record<string, unknown> = {}) =>
  w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: MUC_DICH, noiDung: "Toàn văn chính sách THỬ", ...body } });
/** Gieo phiên: `ketThuc` = null ⇒ đang sống. Mọi phiên mang IP / User-Agent. */
function gieoPhien(w: W, id: string, staffId: string, ketThuc: string | null): void {
  const now = new Date().toISOString();
  w.sqlite.prepare(
    `INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, updated_at)
     VALUES (?, ?, 'PIN', 0, 'Máy thử', ?, ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', ?, ?, ?)`,
  ).run(id, staffId, UA_THAT, IP_THAT, ketThuc, ketThuc === null ? null : "dang_xuat", now);
}
const dongPhien = (w: W, id: string) => Q(w, "SELECT ip, user_agent, ended_at, device_label FROM aut_session WHERE id = ?", id)[0];

test("(s1) chính sách chưa có số: GET hanNgay null; POST 409 chua_co_thoi_han với câu tiếng Việt, 0 dòng đổi, không nhật ký", async () => {
  const w = setup();
  gieoPhien(w, "p-cu", SALES, "2000-01-01T00:00:00.000Z");
  // Không có chính sách nào
  let g = await w.call("GET", DUONG, { as: SUP });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json, { hanNgay: null, soPhien: 0 });
  // Có chính sách nhưng không số ngày giữ phiên
  assert.equal((await dangChinhSach(w)).status, 201);
  g = await w.call("GET", DUONG, { as: SUP });
  assert.deepEqual(g.json, { hanNgay: null, soPhien: 0 });
  const p = await w.call("POST", DUONG, { as: SUP });
  assert.equal(p.status, 409);
  assert.equal(p.json.error.code, "chua_co_thoi_han");
  assert.equal(p.json.error.message, "Chính sách riêng tư chưa có thời hạn giữ phiên — chưa ẩn danh được.");
  assert.deepEqual(dongPhien(w, "p-cu"), { ip: IP_THAT, user_agent: UA_THAT, ended_at: "2000-01-01T00:00:00.000Z", device_label: "Máy thử" });
  assert.equal(Q(w, "SELECT count(*) n FROM audit_log WHERE action = 'sessions_anonymized'")[0].n, 0);
});

test("(s2) chính sách 30 ngày: GET đếm đúng; POST làm rỗng IP / User-Agent của phiên kết thúc trước mốc, phiên mới hơn và đang sống nguyên; nhật ký chỉ số đếm + mốc, không IP", async () => {
  const w = setup();
  assert.equal((await dangChinhSach(w, { hanGiuPhienNgay: 30 })).status, 201);
  const cu = new Date(Date.now() - 31 * NGAY).toISOString();
  const moi = new Date(Date.now() - 29 * NGAY).toISOString();
  gieoPhien(w, "p-cu1", SALES, cu);
  gieoPhien(w, "p-cu2", ADM, "2000-01-01T00:00:00.000Z");
  gieoPhien(w, "p-moi", SALES, moi);
  gieoPhien(w, "p-song", HR, null);
  const g = await w.call("GET", DUONG, { as: SUP });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json, { hanNgay: 30, soPhien: 2 });
  assert.equal(Q(w, "SELECT count(*) n FROM audit_log WHERE action = 'sessions_anonymized'")[0].n, 0, "đọc không ghi");
  const p = await w.call("POST", DUONG, { as: SUP });
  assert.equal(p.status, 200, p.text);
  assert.deepEqual(p.json, { daAnDanh: 2 });
  for (const id of ["p-cu1", "p-cu2"]) {
    const d = dongPhien(w, id);
    assert.equal(d.ip, null, id);
    assert.equal(d.user_agent, null, id);
    assert.equal(d.device_label, "Máy thử", "nhãn máy, mốc, lý do nguyên");
  }
  for (const id of ["p-moi", "p-song"]) assert.deepEqual([dongPhien(w, id).ip, dongPhien(w, id).user_agent], [IP_THAT, UA_THAT], id);
  const nk = Q(w, "SELECT action, staff_id, target_type, detail FROM audit_log WHERE action = 'sessions_anonymized'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, SUP);
  assert.equal(nk[0].target_type, "system");
  assert.match(nk[0].detail, /^2 phiên kết thúc trước \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
  const tatCa = JSON.stringify(Q(w, "SELECT detail FROM audit_log"));
  for (const gt of [IP_THAT, UA_THAT]) assert.ok(!tatCa.includes(gt), `nhật ký lộ "${gt}"`);
  assert.ok(!p.text.includes(IP_THAT) && !g.text.includes(UA_THAT));
});

test("(s3) Quản trị, Nhân sự, Bán hàng → 403 ở cả GET lẫn POST (ô chỉ Toàn quyền), dữ liệu nguyên", async () => {
  const w = setup();
  assert.equal((await dangChinhSach(w, { hanGiuPhienNgay: 30 })).status, 201);
  gieoPhien(w, "p-cu", SALES, "2000-01-01T00:00:00.000Z");
  for (const as of [ADM, HR, SALES]) {
    assert.equal((await w.call("GET", DUONG, { as })).status, 403, `GET ${as}`);
    assert.equal((await w.call("POST", DUONG, { as })).status, 403, `POST ${as}`);
  }
  assert.deepEqual([dongPhien(w, "p-cu").ip, dongPhien(w, "p-cu").user_agent], [IP_THAT, UA_THAT]);
  assert.equal(Q(w, "SELECT count(*) n FROM audit_log WHERE action = 'sessions_anonymized'")[0].n, 0);
});

test("(s4) chạy lần hai: daAnDanh = 0 và không thêm dòng nhật ký (không có việc thì không ghi)", async () => {
  const w = setup();
  assert.equal((await dangChinhSach(w, { hanGiuPhienNgay: 30 })).status, 201);
  gieoPhien(w, "p-cu", SALES, "2000-01-01T00:00:00.000Z");
  assert.deepEqual((await w.call("POST", DUONG, { as: SUP })).json, { daAnDanh: 1 });
  const lai = await w.call("POST", DUONG, { as: SUP });
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual(lai.json, { daAnDanh: 0 });
  assert.equal(Q(w, "SELECT count(*) n FROM audit_log WHERE action = 'sessions_anonymized'")[0].n, 1);
  assert.deepEqual((await w.call("GET", DUONG, { as: SUP })).json, { hanNgay: 30, soPhien: 0 });
});

test("(s5) bản chính sách MỚI NHẤT thắng: bản sau bỏ trống số ngày ⇒ GET lại null và POST 409 (không giữ số cũ)", async () => {
  const w = setup();
  assert.equal((await dangChinhSach(w, { hanGiuPhienNgay: 30 })).status, 201);
  assert.deepEqual((await w.call("GET", DUONG, { as: SUP })).json, { hanNgay: 30, soPhien: 0 });
  assert.equal((await dangChinhSach(w)).status, 201);
  assert.deepEqual((await w.call("GET", DUONG, { as: SUP })).json, { hanNgay: null, soPhien: 0 });
  assert.equal((await w.call("POST", DUONG, { as: SUP })).status, 409);
});
