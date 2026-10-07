// C14 (đánh giá ERP 2026-10-07, đã kiểm phản biện): "Đổi sang chặng khác" ở bảng "Sửa đưa đón" từng gửi HAI lệnh rời — bỏ chặng (không xét mốc 6 giờ)
// rồi thêm chặng (có xét mốc). Sát giờ, Bán hàng bỏ được mà thêm bị 409 ⇒ đơn đã xác nhận còn 0 chặng. Route mới `POST /api/orders/:id/legs/:legId/replace`
// đóng chặng cũ (lý do REPLACED) VÀ thêm chặng mới trong MỘT lô, MỘT khoá lạc quan (mốc ĐƠN); xét mốc như lệnh SỬA chặng — min(giờ chặng cũ, giờ chặng
// mới) — TRƯỚC khi ghi: bị chặn thì chặng cũ KHÔNG bị đóng. Chạy CẢ ứng dụng trên SQLite thật, mốc 6 giờ THẬT (không mốc giả), đồng hồ giả của khung điều phối (06:00 giờ VN ngày NGAY).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, FIELD, LOC, NGAY, PARTNER, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { legCloseReplaceChecked } from "./chang-hanh-khach-repo.ts";

const NO_SUCH = "00000000-0000-4000-8000-000000000000";
const MOI = { direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" };
const DAT_GAP = { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: null };

const lay = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order;
const thay = (w: any, id: string, legId: string, as: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${id}/legs/${legId}/replace`, { as, body });
const dongLeg = (w: any, legId: string) => w.q("SELECT closed_at, close_reason_code FROM ord_transfer_leg WHERE id = ?", legId)[0];
const soNhatKy = (w: any, id: string) => w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", id)[0].n as number;
const nhatKy = (w: any, id: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY rowid", id, action).map((r: any) => r.detail as string);
const banSao = (w: any, id: string) => w.q("SELECT pickup_time, pickup_place FROM order_service WHERE order_id = ?", id).map((r: any) => ({ ...r }));

/** Không ghi gì: chặng cũ còn mở, đơn giữ mốc, không thêm dòng nhật ký, không thêm dòng chặng. */
function khongGhiGi(w: any, d: { id: string; legId: string }, truoc: { updatedAt: string; nhatKy: number; soDong: number }) {
  assert.equal(dongLeg(w, d.legId).closed_at, null, "chặng cũ vẫn mở");
  assert.equal(w.q("SELECT updated_at FROM orders WHERE id = ?", d.id)[0].updated_at, truoc.updatedAt, "mốc đơn không đổi");
  assert.equal(soNhatKy(w, d.id), truoc.nhatKy, "không thêm nhật ký");
  assert.equal(w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ?", d.id)[0].n, truoc.soDong, "không thêm dòng chặng");
}
const chup = async (w: any, d: { id: string }) => ({
  updatedAt: (await lay(w, d.id)).updatedAt as string, nhatKy: soNhatKy(w, d.id), soDong: w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ?", d.id)[0].n as number,
});

test("(a) C14: Bán hàng thay chặng dưới mốc (08:00, đón 13:00) → 409 short_notice_required; chặng cũ VẪN MỞ, không ghi gì; Bán hàng kèm datGap → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    denGio("08:00");
    const truoc = await chup(w, d);
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "short_notice_required");
    khongGhiGi(w, d, truoc);
    const o = await lay(w, d.id);
    assert.deepEqual(o.services[0].legs.map((l: any) => l.id), [d.legId], "đơn đã xác nhận còn đúng chặng cũ");
    const gap = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI, datGap: DAT_GAP });
    assert.equal(gap.status, 403, gap.text);
    khongGhiGi(w, d, truoc);
  } finally {
    tat();
  }
});

test("(k) mốc xét CẢ chặng cũ (giống PUT …/legs/:legId — ADR-0049 D2): Bán hàng thay chặng ĐANG dưới mốc sang giờ trên mốc → 409, không ghi gì; Quản trị kèm datGap → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    denGio("08:00"); // chặng cũ còn 5 giờ — dưới mốc; chặng mới 16:00 còn 8 giờ — trên mốc
    const truoc = await chup(w, d);
    const sau = { ...MOI, pickupTime: "16:00" };
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: sau });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "short_notice_required");
    khongGhiGi(w, d, truoc);
    const q = await thay(w, d.id, d.legId, ADM, { expectedUpdatedAt: truoc.updatedAt, leg: sau, datGap: DAT_GAP });
    assert.equal(q.status, 200, q.text);
    assert.equal(dongLeg(w, d.legId).close_reason_code, "REPLACED");
    assert.deepEqual(q.json.order.services[0].legs.map((l: any) => [l.pickupTime, l.pickupLabel, l.datGap !== null]), [["16:00", "Khách sạn Mới", true]]);
  } finally {
    tat();
  }
});

test("(b) Quản trị kèm datGap dưới mốc → 200 { order }; chặng cũ đóng REPLACED, chặng mới mở mang dấu đặt gấp; đúng 2 dòng nhật ký trong cùng lô; ghi kép = nơi mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    denGio("08:00");
    const truoc = await chup(w, d);
    const r = await thay(w, d.id, d.legId, ADM, { expectedUpdatedAt: truoc.updatedAt, leg: MOI, datGap: DAT_GAP });
    assert.equal(r.status, 200, r.text);
    const legs = r.json.order.services[0].legs;
    assert.equal(legs.length, 1);
    assert.notEqual(legs[0].id, d.legId);
    assert.equal(legs[0].pickupLabel, "Khách sạn Mới");
    assert.ok(legs[0].datGap, "chặng mới mang dấu đặt gấp");
    assert.notEqual(r.json.order.updatedAt, truoc.updatedAt, "đẩy mốc đơn");
    const cu = dongLeg(w, d.legId);
    assert.ok(cu.closed_at);
    assert.equal(cu.close_reason_code, "REPLACED");
    const moi = w.q("SELECT closed_at, short_notice_reason, short_notice_by, created_by FROM ord_transfer_leg WHERE id = ?", legs[0].id)[0];
    assert.deepEqual({ ...moi }, { closed_at: null, short_notice_reason: "KHACH_DOAN_GOI_GAP", short_notice_by: ADM, created_by: ADM });
    assert.equal(soNhatKy(w, d.id), truoc.nhatKy + 2, "đúng hai dòng nhật ký: bỏ + thêm");
    assert.deepEqual(nhatKy(w, d.id, "order_leg_closed"), ["Chiều đi · Tour đảo: bỏ — Đổi sang chặng khác"]);
    const them = nhatKy(w, d.id, "order_leg_added");
    assert.equal(them.length, 1);
    assert.match(them[0]!, /^Chiều đi · Tour đảo: thêm — ngày đón 2027-03-11, giờ đón 13:00, nơi đón Khách sạn Mới, /);
    assert.match(them[0]!, / · đặt gấp: /);
    const cung = w.q("SELECT DISTINCT created_at FROM audit_log WHERE order_id = ? AND action IN ('order_leg_closed', 'order_leg_added')", d.id);
    assert.equal(cung.length, 1, "hai dòng cùng một mốc (cùng lô)");
    assert.deepEqual(banSao(w, d.id), [{ pickup_time: "13:00", pickup_place: "Khách sạn Mới" }]);
  } finally {
    tat();
  }
});

test("(c) trên mốc (06:00, đón 13:00) → Bán hàng thay được, không dấu đặt gấp; thân thừa serviceId của dịch vụ khác bị bỏ qua (dịch vụ = của chặng cũ)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    const truoc = await chup(w, d);
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, serviceId: NO_SUCH, leg: { ...MOI, pickupTime: "13:30" } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.order.services[0].legs.map((l: any) => [l.pickupTime, l.pickupLabel, l.datGap]), [["13:30", "Khách sạn Mới", null]]);
    assert.equal(dongLeg(w, d.legId).close_reason_code, "REPLACED");
    assert.equal(soNhatKy(w, d.id), truoc.nhatKy + 2);
    assert.deepEqual(banSao(w, d.id), [{ pickup_time: "13:30", pickup_place: "Khách sạn Mới" }]);
  } finally {
    tat();
  }
});

test("(d) khoá lạc quan: mốc đơn cũ → 409 stale, không ghi gì; chặng đã bỏ → 409 leg_closed; chặng lạ / của đơn khác → 404; khác chiều / thân hỏng → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00" });
    const truoc = await chup(w, d);
    const cu = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: "2020-01-01T00:00:00.000Z", leg: MOI });
    assert.equal(cu.status, 409, cu.text);
    assert.equal(cu.json.error.code, "stale");
    khongGhiGi(w, d, truoc);
    const thieu = await thay(w, d.id, d.legId, SALES, { leg: MOI });
    assert.equal(thieu.status, 400, thieu.text);
    const chieu = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: { ...MOI, direction: "RETURN" } });
    assert.equal(chieu.status, 400, chieu.text);
    assert.match(chieu.json.error.message, /cùng chiều/);
    const khac = await don(w, { gio: "13:00" });
    const nf = await thay(w, d.id, khac.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
    assert.equal(nf.status, 404, nf.text);
    assert.equal(nf.json.error.code, "leg_not_found");
    assert.equal((await thay(w, d.id, NO_SUCH, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI })).status, 404);
    assert.equal((await thay(w, d.id, "khong-phai-uuid", SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI })).status, 404);
    khongGhiGi(w, d, truoc);
    // Hai lần thay cùng mốc đơn: lần đầu thắng, lần sau (mốc cũ, chặng cũ đã đóng) → 409, không thêm chặng thứ hai.
    const r1 = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
    assert.equal(r1.status, 200, r1.text);
    const r2 = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: { ...MOI, pickupPlace: "Khách sạn Khác" } });
    assert.equal(r2.status, 409, r2.text);
    assert.equal(r2.json.error.code, "leg_closed");
    assert.equal((await lay(w, d.id)).services[0].legs.length, 1, "chỉ một chặng mở");
  } finally {
    tat();
  }
});

test("(e) đơn nháp → 409 use_order_form; đơn huỷ → 409 not_editable; Kế toán, Đối tác, Hướng dẫn viên không phụ trách → 403; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const r = await w.call("POST", "/api/orders", {
      as: SALES,
      body: { customerName: "Khách Nháp", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, legs: [MOI] }] },
    });
    assert.equal(r.status, 201, r.text);
    const nhap = r.json.order;
    const n = await thay(w, nhap.id, nhap.services[0].legs[0].id, SALES, { expectedUpdatedAt: nhap.updatedAt, leg: MOI });
    assert.equal(n.status, 409, n.text);
    assert.equal(n.json.error.code, "use_order_form");

    const d = await don(w, { gio: "13:00" });
    const truoc = await chup(w, d);
    for (const as of [ACC, PARTNER, FIELD]) {
      const x = await thay(w, d.id, d.legId, as, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
      assert.equal(x.status, 403, `${as}: ${x.text}`);
    }
    khongGhiGi(w, d, truoc);

    assert.equal((await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    const huy = await lay(w, d.id);
    const h = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: huy.updatedAt, leg: MOI });
    assert.equal(h.status, 409, h.text);
    assert.equal(h.json.error.code, "not_editable");
    assert.equal(dongLeg(w, d.legId).closed_at, null);
  } finally {
    tat();
  }
});

test("(f) dịch vụ đã đủ 10 chặng mở: thay một chặng vẫn được (trần đếm SAU khi bỏ chặng cũ); còn đúng 10 chặng mở", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00" });
    let o = await lay(w, d.id);
    for (let i = 0; i < 9; i++) {
      const r = await w.call("POST", `/api/orders/${d.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: { ...MOI, direction: "RETURN", pickupTime: "17:00" } } });
      assert.equal(r.status, 201, r.text);
      o = r.json.order;
    }
    assert.equal(o.services[0].legs.length, 10);
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: o.updatedAt, leg: MOI });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.order.services[0].legs.length, 10);
    assert.ok(!r.json.order.services[0].legs.some((l: any) => l.id === d.legId));
  } finally {
    tat();
  }
});

test("(g) chặng cũ đang có khách trên chuyến: thay xong chuyến bị giữ CHANG_DA_DONG — y như bỏ chặng hôm nay (orders không đụng van-chuyen)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, c, d, 2);
    const o = await lay(w, d.id);
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: o.updatedAt, leg: MOI });
    assert.equal(r.status, 200, r.text);
    const ct = await chiTiet(w, c.chuyen.id);
    assert.ok(ct.chuyen.lyDoGiu.some((l: any) => l.ma === "CHANG_DA_DONG"), JSON.stringify(ct.chuyen.lyDoGiu));
  } finally {
    tat();
  }
});

test("(h) câu ĐẦU lô thay chặng tự đóng + khoá: chặng đã bị bỏ ở lệnh khác mà mốc đơn chưa đẩy → 0 dòng (lô thua, không thêm chặng); sai mốc / đơn huỷ → 0; đúng → đóng REPLACED", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const chay = async (legId: string, orderId: string, mocDon: string) =>
      (await legCloseReplaceChecked(w.env.DB, legId, orderId, "REPLACED", new Date().toISOString(), SALES, mocDon).run()).meta.changes;
    const d = await don(w, { gio: "13:00" });
    const moc = (await lay(w, d.id)).updatedAt;
    assert.equal(await chay(d.legId, d.id, "2020-01-01T00:00:00.000Z"), 0, "sai mốc đơn");
    // Trạng thái "đua": chặng đã đóng (lệnh bỏ chặng khác) nhưng mốc đơn vẫn y nguyên.
    w.sqlite.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED', updated_at = ? WHERE id = ?").run("2027-03-10T00:00:00.000Z", "2027-03-10T00:00:00.000Z", d.legId);
    assert.equal(await chay(d.legId, d.id, moc), 0, "chặng đã đóng → không thắng");
    assert.equal(dongLeg(w, d.legId).close_reason_code, "NOT_NEEDED", "giữ lý do của lệnh trước");
    const d2 = await don(w, { gio: "13:00" });
    const moc2 = (await lay(w, d2.id)).updatedAt;
    assert.equal(await chay(d2.legId, d.id, moc2), 0, "chặng của đơn khác");
    assert.equal(await chay(d2.legId, d2.id, moc2), 1);
    assert.equal(dongLeg(w, d2.legId).close_reason_code, "REPLACED");
    const d3 = await don(w, { gio: "13:00" });
    assert.equal((await w.call("POST", `/api/orders/${d3.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    assert.equal(await chay(d3.legId, d3.id, (await lay(w, d3.id)).updatedAt), 0, "đơn huỷ");
  } finally {
    tat();
  }
});

test("(i) ĐUA qua route: lệnh bỏ chặng khác đóng chặng cũ NGAY TRƯỚC lô thay (mốc đơn chưa đẩy) → 409 leg_closed; không thêm chặng, không nhật ký, lý do cũ giữ nguyên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00" });
    const truoc = await chup(w, d);
    // Bọc LÔ GHI (khuôn chenTruocLo — src/modules/billing/sau-da-giao.test.ts T-1; lô ĐỌC của bước lập kế hoạch đi qua nguyên): "người khác" bỏ chặng mà
    // không đẩy mốc đơn, ngay trước lô thay.
    const goc = w.env.DB.batch;
    let daChen = false;
    w.env.DB.batch = async (stmts: { sql: string }[]) => {
      if (!stmts.some((s) => /^\s*UPDATE ord_transfer_leg SET closed_at/.test(s.sql))) return goc(stmts);
      w.env.DB.batch = goc;
      daChen = true;
      w.sqlite.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED', updated_at = ? WHERE id = ?").run("2027-03-10T00:00:00.000Z", "2027-03-10T00:00:00.000Z", d.legId);
      return goc(stmts);
    };
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
    assert.equal(daChen, true, "route đi qua db.batch (ca đua thật sự xảy ra)");
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "leg_closed");
    assert.equal(dongLeg(w, d.legId).close_reason_code, "NOT_NEEDED", "giữ lý do của lệnh trước");
    assert.equal(soNhatKy(w, d.id), truoc.nhatKy, "không nhật ký");
    assert.equal(w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ?", d.id)[0].n, truoc.soDong, "không thêm chặng");
    assert.equal(w.q("SELECT updated_at FROM orders WHERE id = ?", d.id)[0].updated_at, truoc.updatedAt, "mốc đơn không đổi");
  } finally {
    tat();
  }
});

test("(j) ĐUA lúc lập kế hoạch: chặng bị bỏ ở lệnh khác ngay ở lô đầu tiên của yêu cầu (lô đọc dịch vụ) → 409 leg_closed, không 500; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { gio: "13:00" });
    const truoc = await chup(w, d);
    const goc = w.env.DB.batch;
    let daChen = false;
    w.env.DB.batch = async (stmts: unknown[]) => {
      w.env.DB.batch = goc;
      daChen = true;
      w.sqlite.prepare("UPDATE ord_transfer_leg SET closed_at = ?, close_reason_code = 'NOT_NEEDED', updated_at = ? WHERE id = ?").run("2027-03-10T00:00:00.000Z", "2027-03-10T00:00:00.000Z", d.legId);
      return goc(stmts);
    };
    const r = await thay(w, d.id, d.legId, SALES, { expectedUpdatedAt: truoc.updatedAt, leg: MOI });
    assert.equal(daChen, true, "yêu cầu có đi qua db.batch");
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "leg_closed");
    assert.equal(soNhatKy(w, d.id), truoc.nhatKy, "không nhật ký");
    assert.equal(w.q("SELECT count(*) n FROM ord_transfer_leg WHERE order_id = ?", d.id)[0].n, truoc.soDong, "không thêm chặng");
  } finally {
    tat();
  }
});
