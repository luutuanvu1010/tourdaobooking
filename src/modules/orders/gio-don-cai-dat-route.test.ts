// ADR-0193 mục 1 — kế hoạch 2026-11-08 Task 5B.1: công tắc «Bắt buộc giờ đón cho đơn đối tác». `GET`/`POST /api/cai-dat/bat-buoc-gio-don`: GHI chỉ ô `settings.ops` (Toàn quyền),
// MỘT lô dòng chỉ-thêm + nhật ký; thua mốc ⇒ 409 `stale`, không ghi gì; gửi đúng trạng thái đang có ⇒ 200, không ghi; thiếu `Origin` ⇒ 403. Khuôn `an-khach-route.test.ts`.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, PARTNER, SUP, setup } from "../../../tests/audit/xac-nhan-khung.mjs";
import { docBatBuocGioDon } from "./xac-nhan-repo.ts";

const URL = "/api/cai-dat/bat-buoc-gio-don";
type W = ReturnType<typeof setup>;
const dat = (w: W, as: string, bat: unknown, headers: Record<string, unknown> = {}) => w.call("POST", URL, { as, body: { bat }, headers });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDong = (w: W) => dem(w, "SELECT count(*) AS n FROM ord_pickup_time_policy");
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'pickup_time_policy_changed'");

test("cổng: Quản trị, Bán hàng, Thực tập, Đối tác, Kế toán, HDV POST ⇒ 403, không ghi; Toàn quyền Tắt ⇒ 200 + MỘT nhật ký không gắn đơn; GET đọc lại; gửi đúng trạng thái đang có ⇒ 200, không ghi", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { bat: true, doiDuoc: true }, "mặc định Bật (migration gieo 1)");
  for (const ai of [ADM, A, INTERN, PARTNER, ACC, H]) assert.equal((await dat(w, ai, false)).status, 403, `POST ${ai}`);
  assert.equal(soDong(w), 1, "từ chối thì không ghi");
  assert.equal(soNhatKy(w), 0);
  const r = await dat(w, SUP, false);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { bat: false, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type FROM audit_log WHERE action = 'pickup_time_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id ?? null, null, "không gắn đơn");
  assert.equal(nk[0].target_type, "system");
  assert.equal((await w.call("GET", URL, { as: SUP })).json.bat, false);
  assert.equal(soDong(w), 2);
  assert.equal((await dat(w, SUP, false)).status, 200);
  assert.equal(soDong(w), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(soNhatKy(w), 1, "cũng không thêm nhật ký");
  assert.equal((await dat(w, SUP, true)).json.bat, true);
  assert.equal(soDong(w), 3, "chỉ-thêm: dòng cũ còn nguyên");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
});

test("GET: Toàn quyền doiDuoc = true; Quản trị, Bán hàng, Đối tác doiDuoc = false; Kế toán, HDV (không lập đơn) ⇒ 403", async () => {
  const w = setup();
  for (const ai of [ADM, A, PARTNER]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { bat: true, doiDuoc: false }, `GET ${ai}`);
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
});

test("thiếu header Origin ⇒ 403, không ghi gì", async () => {
  const w = setup();
  const r = await dat(w, SUP, false, { origin: null });
  assert.equal(r.status, 403, r.text);
  assert.equal(soDong(w), 1);
  assert.equal(soNhatKy(w), 0);
});

test("hai lần đổi trùng mốc ⇒ 409 stale, KHÔNG ghi gì (không dòng của lô thua, không nhật ký)", async () => {
  const w = setup();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_pickup_time_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const cau = stmts.find((s) => /INSERT INTO ord_pickup_time_policy/.test(s.sql))!;
      const at = cau.args[2] as string; // ?3 = valid_from_at của chính lô này
      w.sqlite.prepare("INSERT INTO ord_pickup_time_policy (id, required, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 0, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, false);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2, "gieo + dòng của người chen; không dòng của lô thua");
  assert.equal(soNhatKy(w), 0, "lô thua không để lại nhật ký");
});

test("docBatBuocGioDon: dòng mới nhất có valid_from_at ≤ lúc xét; dòng hẹn tương lai chưa áp; KHÔNG có dòng nào ⇒ Bật", async () => {
  const w = setup();
  assert.equal(await docBatBuocGioDon(w.env.DB, new Date().toISOString()), true);
  w.sqlite.prepare("INSERT INTO ord_pickup_time_policy (id, required, valid_from_at, created_at, updated_at) VALUES ('tl', 0, '2999-01-01T00:00:00.000Z', 'x', 'x')").run();
  assert.equal(await docBatBuocGioDon(w.env.DB, new Date().toISOString()), true, "dòng tương lai chưa áp");
  assert.equal(await docBatBuocGioDon(w.env.DB, "2999-01-01T00:00:00.000Z"), false, "tới đúng mốc thì áp");
  assert.equal(await docBatBuocGioDon(w.env.DB, "2000-01-01T00:00:00.000Z"), true, "trước dòng gieo: không có dòng nào ⇒ Bật");
});
