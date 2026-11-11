// ADR-0193 câu (ii) — kế hoạch 2026-11-08 Task 5B.3: lượt đón CHƯA giờ mà ngày đón đã vào hạn chốt ⇒ không xác nhận được tới khi có giờ (409 `chua_gio_sat_ngay`), ở MỌI cửa xác nhận
// (`/status`, nhánh B của Gửi đơn, Còn vé), mọi người lập. Câu hỏi chủ số 2 theo phương án (a): xét MỌI lượt còn mở, kể cả chiều về. Kiểm TRƯỚC khi dựng lô (ruling R6: lô không lui khi
// `ORDER_CONFIRM` đổi 0 dòng) — trạng thái SAU lệnh (ngày đi mới, giờ vừa điền). Vế SQL mới của `ORDER_CONFIRM` là lớp chặn cuối, khoá hai phía với hàm thuần ở cuối tệp.
// Chạy CẢ ứng dụng trên SQLite thật; mốc là mốc THẬT 360 phút của khung thử ⇒ lượt chưa giờ đón HÔM NAY luôn vào hạn chốt; cách 3 ngày thì không bao giờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { changChuaGioVaoHanChot, nguongMocVn } from "../../shared/moc-toi-thieu.ts";
import { legFillDateOnConfirm, orderConfirm } from "./chang-hanh-khach-repo.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, B, PARTNER, SUP, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const HOM_NAY = () => inDays(0);
const XA = () => inDays(3);
const RET = (d: string | null, t: string | null) => ({ ...leg(d, t), direction: "RETURN" });
const trangThai = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const changCua = (w: any, id: string) => w.q("SELECT pickup_date d, pickup_time t FROM ord_transfer_leg WHERE order_id = ? ORDER BY direction, id", id).map((r: any) => ({ ...r }));
const soNhatKy = (w: any, id: string) => Number(w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", id)[0].n);
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
  assert.ok(Array.isArray(r.json.error.legs) && r.json.error.legs.length > 0, "kèm danh sách lượt để giao diện chỉ chỗ");
};
async function congTacTat(w: any) {
  assert.equal((await w.call("POST", "/api/cai-dat/bat-buoc-gio-don", { as: SUP, body: { bat: false } })).status, 200);
}

test("/status (Bán hàng): lượt chưa giờ đón hôm nay ⇒ 409 chua_gio_sat_ngay, đơn nháp, không ghi gì; cách 3 ngày ⇒ xác nhận được như hôm nay", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  const truoc = { chang: changCua(w, o.id), nk: soNhatKy(w, o.id) };
  la409(await status(w, o.id, A));
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(changCua(w, o.id), truoc.chang);
  assert.equal(soNhatKy(w, o.id), truoc.nk, "không dòng nhật ký nào");
  const xa = await lap(w, A, [svc("ZB1", XA(), [leg(XA(), null)])]);
  const r = await status(w, xa.id, A);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, xa.id), "confirmed");
});

test("/status: lượt trống NGÀY đón (dịch vụ đi hôm nay) ⇒ lấy ngày đi ⇒ 409; ngày đón KHÔNG bị điền (kiểm trước khi dựng lô)", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(null, null)])]);
  const truoc = changCua(w, o.id);
  la409(await status(w, o.id, A));
  assert.deepEqual(changCua(w, o.id), truoc);
});

test("câu hỏi 2 (a): CHIỀU VỀ chưa giờ đón hôm nay (chiều đi ngày mai 23:30 — luôn ngoài mốc 6 giờ) cũng chặn; chiều về cách 4 ngày thì không", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(1), [leg(inDays(1), "23:30"), RET(HOM_NAY(), null)])]);
  la409(await status(w, o.id, A));
  assert.equal(trangThai(w, o.id), "draft");
  const ok = await lap(w, A, [svc("ZB1", XA(), [leg(XA(), "07:30"), RET(inDays(4), null)])]);
  assert.equal((await status(w, ok.id, A)).status, 200);
});

test("điền giờ rồi xác nhận lại ⇒ không còn chua_gio_sat_ngay, đi cổng hạn chốt như thường (giờ đã qua ⇒ đơn thuộc diện đặt gấp: /status trả confirm_request_required)", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  la409(await status(w, o.id, A));
  const doc = (await w.call("GET", `/api/orders/${o.id}`, { as: A })).json.order;
  const s = doc.services[0];
  const put = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: doc.updatedAt, services: [{ ...svc("ZB1", HOM_NAY(), [{ ...leg(HOM_NAY(), "00:00"), id: s.legs[0].id }]), id: s.id }] } });
  assert.equal(put.status, 200, put.text);
  const r = await status(w, o.id, A);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "confirm_request_required", "lượt có giờ dưới hạn chốt: phải Gửi kiểm vé để đặt gấp, như hôm nay");
});

test("Gửi đơn nhánh B (Toàn quyền gửi nháp của mình, Đón chưa giờ hôm nay) ⇒ 409 chua_gio_sat_ngay, không mở yêu cầu, đơn nháp", async () => {
  const w = setup();
  const o = await lap(w, SUP, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  la409(await guiDon(w, o.id, SUP));
  assert.equal(trangThai(w, o.id), "draft");
  assert.equal(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ?", o.id)[0].n, 0);
});

test("Còn vé (công tắc Tắt, cờ = 0): Đối tác gửi đơn chưa giờ đón hôm nay ⇒ nhánh A; Còn vé không giờ ⇒ 409 chua_gio_sat_ngay, không ghi gì, yêu cầu còn mở; đổi ngày đi sang cách 3 ngày ⇒ 200 (xét trạng thái SAU lệnh)", async () => {
  const w = setup();
  await congTacTat(w);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.nhanh, "A");
  const truoc = { chang: changCua(w, o.id), nk: soNhatKy(w, o.id) };
  la409(await qd(w, o.id, B));
  assert.equal(trangThai(w, o.id), "draft");
  assert.deepEqual(changCua(w, o.id), truoc.chang);
  assert.equal(soNhatKy(w, o.id), truoc.nk);
  assert.equal(w.q("SELECT count(*) n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0].n, 1, "yêu cầu còn mở");
  const r = await qd(w, o.id, B, { ngayDi: XA() });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, o.id), "confirmed");
});

test("Còn vé: người xét ghi giờ cho lượt chưa giờ ⇒ hết chua_gio_sat_ngay, đi cổng hạn chốt (giờ đã qua ⇒ short_notice_required)", async () => {
  const w = setup();
  await congTacTat(w);
  const o = await lap(w, PARTNER, [svc("ZB1", HOM_NAY(), [leg(HOM_NAY(), null)])]);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 201);
  const r = await qd(w, o.id, B, { gioDon: [{ legId: o.services[0].legs[0].id, pickupTime: "00:00" }] });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "short_notice_required");
});

test("ĐUA: lượt bị đổi thành chưa giờ, đón hôm nay ngay trước lô /status ⇒ vế SQL chặn (lớp cuối), đơn nháp, chẩn đoán trả đúng chua_gio_sat_ngay (không phải stale)", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", XA(), [leg(XA(), "07:30")])]);
  w.chenTruocLo(
    (stmts: { sql: string }[]) => stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql)),
    () => { w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_time = NULL, pickup_date = ? WHERE order_id = ?").run(HOM_NAY(), o.id); },
  );
  la409(await status(w, o.id, A));
  assert.equal(trangThai(w, o.id), "draft");
});

// ---- Khoá hai phía: hàm thuần ↔ vế SQL của `ORDER_CONFIRM` (cùng ca có giây lẻ của moc-toi-thieu.test.ts) -----------------------------------------------------------
const DIR = new URL("../../../migrations/", import.meta.url);
const MIG = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const AT = "2026-11-01T00:00:00.000Z";
/** Bắt câu SQL và tham số mà hàm dựng câu thật trả ra (không chép tay SQL vào bài). */
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
/** Chạy [điền ngày đón] → [xác nhận] trong một giao dịch rồi lui; trả `true` khi câu xác nhận đổi một dòng. */
function sqlXacNhanDuoc(d: DatabaseSync, c: { pickupDate: string | null; pickupTime: string | null; departDate: string; closed: boolean }, nowMs: number, phut: number): boolean {
  d.exec("BEGIN");
  try {
    d.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-o1', 's1', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
    d.prepare("INSERT INTO order_service (id, order_id, sort_order, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date, pickup_choice) VALUES ('sv1', 'o1', 0, 'Tour', 'perPax', 2, 0, 0, 0, ?, 'DON')").run(c.departDate);
    d.prepare("INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, dropoff_place, closed_at, close_reason_code, created_at, updated_at) VALUES ('l1', 'o1', 'sv1', 'OUT', ?, ?, 'Nơi đón', NULL, ?, ?, ?, ?)")
      .run(c.pickupDate, c.pickupTime, c.closed ? AT : null, c.closed ? "REMOVED" : null, AT, AT);
    const at = "2026-11-01T00:00:00.001Z";
    const fill = legFillDateOnConfirm(bat, "o1", at) as unknown as { sql: string; args: unknown[] };
    d.prepare(fill.sql).run(...(fill.args as never[]));
    const xn = orderConfirm(bat, "o1", at, "2000-01-01", "2999-12-31", nguongMocVn(nowMs, phut), AT, null) as unknown as { sql: string; args: unknown[] };
    return Number(d.prepare(xn.sql).run(...(xn.args as never[])).changes) === 1;
  } finally {
    d.exec("ROLLBACK");
  }
}

test("khoá hai phía (câu ii): cùng bộ ca — có giây lẻ, trống ngày đón, có giờ, lượt đã đóng — hàm thuần và vế SQL của ORDER_CONFIRM cho CÙNG kết quả", () => {
  const d = dbMau();
  const ca = [
    ...[["2026-11-12", null], [null, null], ["2026-11-13", null], ["2026-11-11", null]].map(([p, t]) => ({ pickupDate: p, pickupTime: t, departDate: "2026-11-12", closed: false })),
    { pickupDate: "2026-11-12", pickupTime: null, departDate: "2026-11-12", closed: true },
  ];
  const nows = ["2026-11-11T15:00:00.000Z", "2026-11-11T15:59:00.000Z", "2026-11-11T15:59:30.000Z", "2026-11-11T16:00:00.000Z", "2026-11-11T16:00:01.000Z", "2026-11-11T16:30:00.000Z", "2026-11-12T01:00:00.000Z"].map(Date.parse);
  let so = 0;
  let chan = 0;
  for (const now of nows) {
    for (const phut of [60, 360, 1440]) {
      for (const c of ca) {
        const thuan = !c.closed && changChuaGioVaoHanChot(c, now, phut);
        const sql = !sqlXacNhanDuoc(d, c, now, phut);
        assert.equal(sql, thuan, `now=${new Date(now).toISOString()} mốc=${phut} ca=${JSON.stringify(c)}`);
        so++;
        if (thuan) chan++;
      }
    }
  }
  assert.ok(so >= 100 && chan > 10 && chan < so - 10, `đủ ca hai phía: ${so} ca, ${chan} chặn`);
  // Ranh giới đúng như moc-toi-thieu.test.ts: ngày đón 12/11, hạn chốt 60 phút — 23:00:00.000 VN (16:00Z) chưa chặn, 23:00:01 thì chặn, ở CẢ câu SQL.
  const c = { pickupDate: "2026-11-12", pickupTime: null, departDate: "2026-11-12", closed: false };
  assert.equal(sqlXacNhanDuoc(d, c, Date.parse("2026-11-11T16:00:00.000Z"), 60), true);
  assert.equal(sqlXacNhanDuoc(d, c, Date.parse("2026-11-11T16:00:01.000Z"), 60), false);
  // Lượt có giờ không bị vế mới xét (vế mốc cũ lo).
  assert.equal(sqlXacNhanDuoc(d, { ...c, pickupTime: "23:30" }, Date.parse("2026-11-11T15:00:00.000Z"), 60), true);
});
