// ADR-0218 Đ3.4 — kế hoạch 2026-11-18 Task 5: công tắc «Hiện riêng phí đưa đón trên biên nhận khách lẻ». `GET`/`POST /api/cai-dat/phi-don-bien-nhan`: GHI chỉ ô `settings.ops` (Toàn quyền),
// MỘT lô dòng chỉ-thêm + nhật ký; mặc định Tắt (gộp); va mốc ⇒ 409 `stale`. Khuôn gio-don-cai-dat-route.test.ts. Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, H, INTERN, PARTNER, SUP, setup } from "../../../tests/audit/xac-nhan-khung.mjs";
import { hienRiengPhiDonBienNhan } from "./xac-nhan-repo.ts";

const URL = "/api/cai-dat/phi-don-bien-nhan";
type W = ReturnType<typeof setup>;
const dat = (w: W, as: string, hienRieng: unknown, headers: Record<string, unknown> = {}) => w.call("POST", URL, { as, body: { hienRieng }, headers });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDong = (w: W) => dem(w, "SELECT count(*) AS n FROM ord_receipt_fee_display_policy");
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'receipt_fee_display_changed'");

test("mặc định Tắt; Quản trị, Bán hàng, Thực tập, Đối tác, Kế toán, HDV POST ⇒ 403; Toàn quyền Bật ⇒ 200 + MỘT nhật ký không gắn đơn; GET đọc lại; gửi đúng trạng thái ⇒ không ghi", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", URL, { as: SUP })).json, { hienRieng: false, doiDuoc: true });
  for (const ai of [ADM, A, INTERN, PARTNER, ACC, H]) assert.equal((await dat(w, ai, true)).status, 403, `POST ${ai}`);
  assert.equal(soDong(w), 1);
  assert.equal(soNhatKy(w), 0);
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { hienRieng: true, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type FROM audit_log WHERE action = 'receipt_fee_display_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id ?? null, null);
  assert.equal(nk[0].target_type, "system");
  assert.equal((await w.call("GET", URL, { as: SUP })).json.hienRieng, true);
  assert.equal(soDong(w), 2);
  assert.equal((await dat(w, SUP, true)).status, 200);
  assert.equal(soDong(w), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(soNhatKy(w), 1);
  assert.equal((await dat(w, SUP, false)).json.hienRieng, false);
  assert.equal(soDong(w), 3, "chỉ-thêm");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
});

test("GET: Quản trị, Bán hàng, Đối tác doiDuoc = false; Kế toán, HDV (không lập đơn) ⇒ 403", async () => {
  const w = setup();
  for (const ai of [ADM, A, PARTNER]) assert.deepEqual((await w.call("GET", URL, { as: ai })).json, { hienRieng: false, doiDuoc: false }, `GET ${ai}`);
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", URL, { as: ai })).status, 403, `GET ${ai}`);
});

test("thiếu header Origin ⇒ 403, không ghi gì", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, true, { origin: null })).status, 403);
  assert.equal(soDong(w), 1);
});

test("hai lần đổi trùng mốc ⇒ 409 stale, không ghi gì", async () => {
  const w = setup();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_receipt_fee_display_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const cau = stmts.find((s) => /INSERT INTO ord_receipt_fee_display_policy/.test(s.sql))!;
      const at = cau.args[2] as string;
      w.sqlite.prepare("INSERT INTO ord_receipt_fee_display_policy (id, show_separate, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 1, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, true);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2);
  assert.equal(soNhatKy(w), 0);
});

test("hienRiengPhiDonBienNhan theo mốc giờ: trước mọi dòng ⇒ gộp (false); sau dòng Bật ⇒ true; mốc cũ vẫn false", async () => {
  const w = setup();
  const db = w.env.DB;
  assert.equal(await hienRiengPhiDonBienNhan(db, "2000-01-01T00:00:00.000Z"), false, "trước ngày gieo: không có dòng ⇒ gộp");
  assert.equal(await hienRiengPhiDonBienNhan(db, new Date().toISOString()), false);
  await dat(w, SUP, true);
  const sau = new Date(Date.now() + 5000).toISOString();
  assert.equal(await hienRiengPhiDonBienNhan(db, sau), true);
  assert.equal(await hienRiengPhiDonBienNhan(db, "2000-01-01T00:00:00.000Z"), false);
});
