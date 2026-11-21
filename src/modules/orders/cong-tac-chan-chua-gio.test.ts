// ADR-0227 (việc 7, kế hoạch 2026-11-21): công tắc «Chặn đơn chưa có giờ đón khi sát ngày đón» cho chặn câu (ii) của ADR-0193.
// `GET`/`POST /api/cai-dat/chan-chua-gio-sat-ngay`: GHI chỉ ô `settings.ops` (Toàn quyền), MỘT lô dòng chỉ-thêm + nhật ký; thua mốc ⇒ 409 `stale`; gửi đúng trạng thái đang có ⇒ 200, không ghi.
// Công tắc đọc MỘT lần mỗi request và cùng một giá trị đi vào CẢ hàm thuần `chanChuaGioSatNgay`, vế SQL của `ORDER_CONFIRM` (tham số ?8) và chẩn đoán lô thua — ba lớp không lệch nhau.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/xac-nhan-khung.mjs); mốc THẬT 360 phút ⇒ lượt chưa giờ đón HÔM NAY luôn vào hạn chốt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { nguongMocVn } from "../../shared/moc-toi-thieu.ts";
import { legFillDateOnConfirm, orderConfirm } from "./chang-hanh-khach-repo.ts";
import { docChanChuaGioSatNgay } from "./xac-nhan-repo.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, B, H, INTERN, PARTNER, SUP, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const DUONG = "/api/cai-dat/chan-chua-gio-sat-ngay";
type W = ReturnType<typeof setup>;
const HOM_NAY = () => inDays(0);
const dat = (w: W, as: string, bat: unknown, headers: Record<string, unknown> = {}) => w.call("POST", DUONG, { as, body: { bat }, headers });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDong = (w: W) => dem(w, "SELECT count(*) AS n FROM ord_pickup_deadline_policy");
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'pickup_deadline_policy_changed'");
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const status = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
function qd(w: any, id: string, as: string, extra: Record<string, unknown> = {}) {
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0];
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
  return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as, body: { yeuCauId: y?.id, updatedAt: moc.u, ketQua: "CON_VE", ...extra } });
}
const la409 = (r: any) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "chua_gio_sat_ngay");
};

// ---- Công tắc: cổng, nhật ký, chỉ-thêm ------------------------------------------------------------------------------------------------------------------------------------
test("cổng: Quản trị, Bán hàng, Thực tập, Đối tác, Kế toán, HDV POST ⇒ 403, không ghi; Toàn quyền Tắt ⇒ 200 + MỘT nhật ký không gắn đơn; gửi đúng trạng thái đang có ⇒ 200, không ghi", async () => {
  const w = setup();
  assert.deepEqual((await w.call("GET", DUONG, { as: SUP })).json, { bat: true, doiDuoc: true }, "mặc định Bật (migration gieo 1)");
  for (const ai of [ADM, A, INTERN, PARTNER, ACC, H]) assert.equal((await dat(w, ai, false)).status, 403, `POST ${ai}`);
  assert.equal(soDong(w), 1, "từ chối thì không ghi");
  assert.equal(soNhatKy(w), 0);
  const r = await dat(w, SUP, false);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { bat: false, doiDuoc: true });
  const nk = w.q("SELECT detail, order_id, target_type FROM audit_log WHERE action = 'pickup_deadline_policy_changed'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id ?? null, null, "không gắn đơn");
  assert.equal(nk[0].target_type, "system");
  assert.equal((await w.call("GET", DUONG, { as: SUP })).json.bat, false);
  assert.equal((await dat(w, SUP, false)).status, 200);
  assert.equal(soDong(w), 2, "đúng trạng thái đang có: không ghi dòng");
  assert.equal(soNhatKy(w), 1);
  assert.equal((await dat(w, SUP, true)).json.bat, true);
  assert.equal(soDong(w), 3, "chỉ-thêm: dòng cũ còn nguyên");
  for (const xau of ["co", 1, null, undefined]) assert.equal((await dat(w, SUP, xau)).status, 400, `thân sai ${String(xau)}`);
});

test("GET: chỉ Toàn quyền doiDuoc = true; Quản trị, Bán hàng, Đối tác doiDuoc = false; Kế toán, HDV ⇒ 403; thiếu Origin ⇒ 403, không ghi", async () => {
  const w = setup();
  for (const ai of [ADM, A, PARTNER]) assert.deepEqual((await w.call("GET", DUONG, { as: ai })).json, { bat: true, doiDuoc: false }, `GET ${ai}`);
  for (const ai of [ACC, H]) assert.equal((await w.call("GET", DUONG, { as: ai })).status, 403, `GET ${ai}`);
  assert.equal((await dat(w, SUP, false, { origin: null })).status, 403);
  assert.equal(soDong(w), 1);
});

test("hai lần đổi trùng mốc ⇒ 409 stale, KHÔNG ghi gì", async () => {
  const w = setup();
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO ord_pickup_deadline_policy/.test(s.sql)),
    (stmts: { sql: string; args: unknown[] }[]) => {
      const at = stmts.find((s) => /INSERT INTO ord_pickup_deadline_policy/.test(s.sql))!.args[2] as string;
      w.sqlite.prepare("INSERT INTO ord_pickup_deadline_policy (id, chan, valid_from_at, created_at, updated_at) VALUES ('nguoi-khac', 0, ?1, ?1, ?1)").run(at);
    },
  );
  const r = await dat(w, SUP, false);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soDong(w), 2);
  assert.equal(soNhatKy(w), 0);
});

test("docChanChuaGioSatNgay: dòng mới nhất có valid_from_at ≤ lúc xét; dòng hẹn tương lai chưa áp; KHÔNG có dòng nào ⇒ Bật", async () => {
  const w = setup();
  assert.equal(await docChanChuaGioSatNgay(w.env.DB, new Date().toISOString()), true);
  w.sqlite.prepare("INSERT INTO ord_pickup_deadline_policy (id, chan, valid_from_at, created_at, updated_at) VALUES ('tl', 0, '2999-01-01T00:00:00.000Z', 'x', 'x')").run();
  assert.equal(await docChanChuaGioSatNgay(w.env.DB, new Date().toISOString()), true, "dòng tương lai chưa áp");
  assert.equal(await docChanChuaGioSatNgay(w.env.DB, "2999-01-01T00:00:00.000Z"), false, "tới đúng mốc thì áp");
  assert.equal(await docChanChuaGioSatNgay(w.env.DB, "2000-01-01T00:00:00.000Z"), true, "trước dòng gieo ⇒ Bật");
});

// ---- Công tắc ở ba cửa xác nhận (xong khi của kế hoạch: tắt ⇒ được; bật lại ⇒ bị chặn với câu cũ) ---------------------------------------------------------------------------
test("/status (Bán hàng): Tắt ⇒ đơn chưa giờ đón hôm nay xác nhận được; Bật lại ⇒ đơn khác như thế bị chặn với câu cũ", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  const r = await status(w, o.id, A);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
  assert.equal(w.q("SELECT pickup_time t FROM ord_transfer_leg WHERE order_id = ?", o.id)[0].t, null, "lượt vẫn chưa giờ — điều phối chưa xếp được xe");
  assert.equal((await dat(w, SUP, true)).status, 200);
  const o2 = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  const r2 = await status(w, o2.id, A);
  la409(r2);
  assert.match(r2.json.error.message, /chưa có giờ/);
  assert.equal(trangThai(w, o2.id), "draft");
});

test("Gửi đơn nhánh B (Toàn quyền gửi nháp của mình): Tắt ⇒ tự xác nhận được dù lượt chưa giờ đón hôm nay", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, SUP, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  const g = await guiDon(w, o.id, SUP);
  assert.ok(g.status === 200 || g.status === 201, g.text);
  assert.equal(g.json.nhanh, "B");
  assert.equal(trangThai(w, o.id), "confirmed");
});

test("Còn vé (bắt buộc giờ đón đơn đối tác Tắt, chặn sát ngày Tắt): Đối tác gửi đơn chưa giờ đón hôm nay ⇒ Còn vé không giờ ⇒ xác nhận được", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/cai-dat/bat-buoc-gio-don", { as: SUP, body: { bat: false } })).status, 200);
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  const r = await qd(w, o.id, B);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
});

test("ĐUA công tắc: route đọc Tắt, Toàn quyền Bật ngay trước lô /status ⇒ lô vẫn theo giá trị route đã đọc (MỘT lần đọc mỗi request — không ghi nửa vời)", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql)),
    () => { w.sqlite.prepare("INSERT INTO ord_pickup_deadline_policy (id, chan, valid_from_at, created_at, updated_at) VALUES ('bat-lai', 1, ?1, ?1, ?1)").run(new Date(Date.now() - 1).toISOString()); },
  );
  const r = await status(w, o.id, A);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
});

// Lớp thứ ba (chẩn đoán lô thua) nhận CÙNG giá trị công tắc: công tắc Tắt, lô thua vì đơn vừa bị sửa (khoá `updated_at`) trong khi lượt vẫn chưa giờ đón hôm nay ⇒ báo `stale`
// («tải lại rồi bấm lại»), KHÔNG được báo `chua_gio_sat_ngay` (công tắc đang Tắt, người bấm điền giờ cũng vô ích). Ba cửa: /status, Gửi đơn nhánh B, Còn vé.
const suaChenNgang = (w: any, id: string) => w.chenTruocLo(
  (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql)),
  () => { w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 60_000).toISOString(), id); },
);
const laStale = (r: any) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale", "công tắc Tắt: chẩn đoán không được đổ cho chặn chưa giờ");
};

test("chẩn đoán lô thua theo công tắc Tắt — /status ⇒ stale, đơn nháp", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  suaChenNgang(w, o.id);
  laStale(await status(w, o.id, A));
  assert.equal(trangThai(w, o.id), "draft");
});

test("chẩn đoán lô thua theo công tắc Tắt — Gửi đơn nhánh B ⇒ stale, đơn nháp", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, SUP, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  suaChenNgang(w, o.id);
  laStale(await guiDon(w, o.id, SUP));
  assert.equal(trangThai(w, o.id), "draft");
});

test("chẩn đoán lô thua theo công tắc Tắt — Còn vé ⇒ stale, đơn nháp, yêu cầu còn mở", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/cai-dat/bat-buoc-gio-don", { as: SUP, body: { bat: false } })).status, 200);
  assert.equal((await dat(w, SUP, false)).status, 200);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  suaChenNgang(w, o.id);
  laStale(await qd(w, o.id, B));
  assert.equal(trangThai(w, o.id), "draft");
});

// ---- Hàm thuần + vế SQL: Tắt thì cả hai cùng bỏ chặn -------------------------------------------------------------------------------------------------------------------------
const DIR = new URL("../../../migrations/", import.meta.url);
const MIG = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-01T00:00:00.000Z";
const bat = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ sql, args }) }) } as unknown as D1Database;
function dbMau(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys = ON");
  for (const f of MIG) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  d.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-s1', 'PERSON', 'Nhân Viên', 1, '${AT}', '${AT}')`);
  d.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-s1', 'Nhân Viên', '${AT}', '${AT}')`);
  d.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('s1', '', '0900000001', 'x', 'sales', 1, '${AT}', 'pty-s1')`);
  return d;
}
function sqlXacNhanDuoc(d: DatabaseSync, pickupDate: string, nowMs: number, chanChuaGio: boolean | undefined): boolean {
  d.exec("BEGIN");
  try {
    d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-o1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
    d.prepare("INSERT INTO order_service (id, order_id, sort_order, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date, pickup_choice) VALUES ('sv1', 'o1', 0, 'Tour', 'perPax', 2, 0, 0, 0, ?, 'DON')").run(pickupDate);
    d.prepare("INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, dropoff_place, created_at, updated_at) VALUES ('l1', 'o1', 'sv1', 'OUT', ?, NULL, 'Nơi đón', NULL, ?, ?)").run(pickupDate, AT, AT);
    const at = "2026-11-01T00:00:00.001Z";
    const fill = legFillDateOnConfirm(bat, "o1", at) as unknown as { sql: string; args: unknown[] };
    d.prepare(fill.sql).run(...(fill.args as never[]));
    const xn = (chanChuaGio === undefined
      ? orderConfirm(bat, "o1", at, "2000-01-01", "2999-12-31", nguongMocVn(nowMs, 60), AT, null)
      : orderConfirm(bat, "o1", at, "2000-01-01", "2999-12-31", nguongMocVn(nowMs, 60), AT, null, chanChuaGio)) as unknown as { sql: string; args: unknown[] };
    return Number(d.prepare(xn.sql).run(...(xn.args as never[])).changes) === 1;
  } finally {
    d.exec("ROLLBACK");
  }
}

test("vế SQL ?8: Bật (và mặc định khi nơi gọi không truyền) ⇒ chặn lượt chưa giờ đã vào hạn chốt; Tắt ⇒ không chặn (hàm thuần: ba bài cửa xác nhận ở trên)", () => {
  const d = dbMau();
  const now = Date.parse("2026-11-11T16:30:00.000Z"); // 23:30 VN, ngày đón 12/11, hạn chốt 60 phút ⇒ vào hạn chốt
  assert.equal(sqlXacNhanDuoc(d, "2026-11-12", now, true), false);
  assert.equal(sqlXacNhanDuoc(d, "2026-11-12", now, undefined), false, "mặc định an toàn: nơi gọi quên truyền ⇒ vẫn chặn");
  assert.equal(sqlXacNhanDuoc(d, "2026-11-12", now, false), true);
});
