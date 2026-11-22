// ADR-0221 Đ1 — kế hoạch 2026-11-21: công tắc «Đối tác không nhập nơi đón». `GET`/`POST /api/cai-dat/noi-don-doi-tac`: GHI chỉ ô `settings.ops` (Toàn quyền),
// MỘT lô dòng chỉ-thêm + nhật ký; thua mốc ⇒ 409 `stale`, không ghi gì; gửi đúng trạng thái đang có ⇒ 200, không ghi; thiếu `Origin` ⇒ 403. Khuôn `gio-don-cai-dat-route.test.ts`. Gieo TẮT; `apChoToi` = bật VÀ người gọi giữ quyền Đối tác (kể cả tài khoản lai).
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, LAI, PARTNER, SUP, setup } from "../../../tests/audit/xac-nhan-khung.mjs";
import { docKhongNhapNoiDon } from "./xac-nhan-repo.ts";

const URL = "/api/cai-dat/noi-don-doi-tac";
type W = ReturnType<typeof setup>;
const dat = (w: W, as: string, bat: unknown, headers: Record<string, unknown> = {}) => w.call("POST", URL, { as, body: { bat }, headers });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDong = (w: W) => dem(w, "SELECT count(*) AS n FROM ord_partner_pickup_place_policy");
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'pickup_place_policy_changed'");

test("cổng: Quản trị, Bán hàng, Thực tập, Đối tác, Kế toán, HDV POST ⇒ 403, không ghi; Toàn quyền Bật ⇒ 200 + MỘT nhật ký không gắn đơn; GET đọc lại; gửi đúng trạng thái đang có ⇒ 200, không ghi", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { bat: false, apChoToi: false, doiDuoc: true }, "mặc định Tắt (migration gieo 0)");
  for (const ai of [ADM, A, INTERN, PARTNER, LAI, ACC, H]) assert.equal((await dat(w, ai, true)).status, 403, `POST ${ai}`);
  assert.equal(soDong(w), 1, "từ chối thì không ghi");
  assert.equal(soNhatKy(w), 0);
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { bat: true, apChoToi: false, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type FROM audit_log WHERE action = 'pickup_place_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].detail, "Bật đối tác không nhập nơi đón");
  assert.equal(nk[0].order_id ?? null, null, "không gắn đơn");
  assert.equal(nk[0].target_type, "system");
  assert.equal((await w.call("GET", URL, { as: SUP })).json.bat, true);
  assert.equal(soDong(w), 2);
  assert.equal((await dat(w, SUP, true)).status, 200);
  assert.equal(soDong(w), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(soNhatKy(w), 1, "cũng không thêm nhật ký");
  assert.equal((await dat(w, SUP, false)).json.bat, false);
  assert.equal(soDong(w), 3, "chỉ-thêm: dòng cũ còn nguyên");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
});

test("GET: `apChoToi` = bật VÀ giữ quyền Đối tác (Đối tác, tài khoản lai); Bán hàng, Quản trị, Toàn quyền không bị áp; Kế toán, HDV (không lập đơn) ⇒ 403", async () => {
  const w = setup();
  for (const ai of [ADM, A, PARTNER, LAI]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { bat: false, apChoToi: false, doiDuoc: false }, `Tắt, GET ${ai}`);
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
  assert.equal((await dat(w, SUP, true)).status, 200);
  for (const ai of [PARTNER, LAI]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { bat: true, apChoToi: true, doiDuoc: false }, `Bật, GET ${ai}`);
  for (const ai of [ADM, A, INTERN]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { bat: true, apChoToi: false, doiDuoc: false }, `Bật, GET ${ai}`);
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { bat: true, apChoToi: false, doiDuoc: true });
});

test("thiếu header Origin ⇒ 403, không ghi gì", async () => {
  const w = setup();
  const r = await dat(w, SUP, true, { origin: null });
  assert.equal(r.status, 403, r.text);
  assert.equal(soDong(w), 1);
  assert.equal(soNhatKy(w), 0);
});

test("hai lần đổi trùng mốc ⇒ 409 stale, KHÔNG ghi gì (không dòng của lô thua, không nhật ký)", async () => {
  const w = setup();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_partner_pickup_place_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const cau = stmts.find((s) => /INSERT INTO ord_partner_pickup_place_policy/.test(s.sql))!;
      const at = cau.args[2] as string; // ?3 = valid_from_at của chính lô này
      w.sqlite.prepare("INSERT INTO ord_partner_pickup_place_policy (id, khong_nhap, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 1, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2, "gieo + dòng của người chen; không dòng của lô thua");
  assert.equal(soNhatKy(w), 0, "lô thua không để lại nhật ký");
});

test("docKhongNhapNoiDon: dòng mới nhất có valid_from_at ≤ lúc xét; dòng hẹn tương lai chưa áp; KHÔNG có dòng nào ⇒ Tắt", async () => {
  const w = setup();
  assert.equal(await docKhongNhapNoiDon(w.env.DB, new Date().toISOString()), false);
  w.sqlite.prepare("INSERT INTO ord_partner_pickup_place_policy (id, khong_nhap, valid_from_at, created_at, updated_at) VALUES ('tl', 1, '2999-01-01T00:00:00.000Z', 'x', 'x')").run();
  assert.equal(await docKhongNhapNoiDon(w.env.DB, new Date().toISOString()), false, "dòng tương lai chưa áp");
  assert.equal(await docKhongNhapNoiDon(w.env.DB, "2999-01-01T00:00:00.000Z"), true, "tới đúng mốc thì áp");
  assert.equal(await docKhongNhapNoiDon(w.env.DB, "2000-01-01T00:00:00.000Z"), false, "trước dòng gieo: không có dòng nào ⇒ Tắt");
});
