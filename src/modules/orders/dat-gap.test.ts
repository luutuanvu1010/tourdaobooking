// ĐẶT GẤP + MỐC TỐI THIỂU LÚC ĐẶT (ADR-0049 D2 "Mốc tối thiểu 6 giờ", D3 ô `order.leg.short_notice`; kế hoạch Task A10; TC-22 … TC-26, TC-43). Chạy CẢ ứng
// dụng trên SQLite thật (tests/audit/harness.mjs) với mốc THẬT (chính sách gieo 360 phút — KHÔNG dùng mốc giả của khung thử: bài canh cuối tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const NO_SUCH = "00000000-0000-4000-8000-000000000000";
const PHUT = 60_000;
/** Ngày + giờ VN cách bây giờ `phut` phút (giờ đón của chặng). */
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * PHUT).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const leg = (date: string, time: string, over: Record<string, unknown> = {}) =>
  ({ direction: "OUT", pickupDate: date, pickupTime: time, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "", ...over });
const svc = (departDate: string, legs: unknown[], extra: Record<string, unknown> = {}) =>
  ({ kind: "catalog", pickupChoice: (legs.length > 0 ? "DON" : "KHONG_DON"), catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate, legs, ...extra });
async function nhap(w: any, as: string, gio: { date: string; time: string }) {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, gio.time)])] } });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
/** ADR-0135: đơn NHÁP chỉ người lập đọc/ghi (người khác → 404) → khi đơn còn nháp, thao tác đi bằng người lập; đã xác nhận thì giữ người gọi. */
const ai = (w: any, orderId: string, as: string): string => {
  const r = w.q("SELECT status, staff_id FROM orders WHERE id = ?", orderId)[0];
  return r && r.status === "draft" && (as === ADM || as === SUP) ? String(r.staff_id) : as; // chỉ Quản trị / Toàn quyền (nay không đọc được nháp người khác) đổi sang người lập; ca 403 của vai khác giữ nguyên người gọi
};
const datGap = (w: any, o: any, as: string, body: unknown, legId = o.services[0].legs[0].id) => w.call("POST", `/api/orders/${o.id}/legs/${legId}/short-notice`, { as: ai(w, o.id, as), body });
const cot = (w: any, legId: string) =>
  ({ ...w.q("SELECT short_notice_reason AS lyDo, short_notice_note AS ghiChu, short_notice_by AS nguoi, short_notice_at AS luc, short_notice_lead_minutes AS phut FROM ord_transfer_leg WHERE id = ?", legId)[0] });
/** Dấu CŨ đóng trước ADR-0107 trên chặng còn xa (dữ liệu có thật trên production) — API nay không tạo được, nên gieo thẳng CSDL. */
const gieoDauCu = (w: any, legId: string) =>
  w.sqlite.prepare("UPDATE ord_transfer_leg SET short_notice_reason = 'KHAC', short_notice_by = ?, short_notice_at = ?, short_notice_lead_minutes = 360 WHERE id = ?").run(ADM, new Date().toISOString(), legId);

// ---- Route đặt gấp (TC-22 phần quyền / thân; TC-28) -------------------------------------------------------------------------------------------------------
// ADR-0107 (i) — NỚI có tên (chủ Q-3 a 8/10): Bán hàng có ô, ra khỏi danh sách 403 (Bán hàng đặt gấp: dat-gap-sat-gio.test.ts bài 1).
test("TC-22 route đặt gấp: Kế toán, Thực tập, Đối tác → 403 (ô order.leg.short_notice: Bán hàng, Quản trị, Toàn quyền — ADR-0107); không ghi, không nhật ký", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  const n0 = w.q("SELECT count(*) n FROM audit_log")[0].n;
  for (const as of [ACC, INTERN, PARTNER]) {
    const r = await datGap(w, o, as, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(w.q("SELECT count(*) n FROM audit_log")[0].n, n0);
  assert.deepEqual(cot(w, o.services[0].legs[0].id), { lyDo: null, ghiChu: null, nguoi: null, luc: null, phut: null });
});

test("TC-22 route đặt gấp: Quản trị thiếu lý do / lý do lạ / ghi chú quá 120 → 400; đủ → 200, đủ năm cột (số phút = mốc hiện hành 360), ghi chú đã che dãy số; Toàn quyền cũng được", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  const legId = o.services[0].legs[0].id;
  // ADR-0135: nháp của Bán hàng — Quản trị, Toàn quyền KHÔNG ghi được (404, không ghi gì); người lập mới đặt gấp được.
  for (const as of [ADM, SUP]) assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${legId}/short-notice`, { as, body: { lyDo: "KHAC" } })).status, 404, as);
  assert.equal(cot(w, legId).lyDo, null);
  for (const body of [{}, { lyDo: "LA" }, { lyDo: "khach_dat_sat_gio" }, { lyDo: "KHAC", ghiChu: "g".repeat(121) }, { lyDo: "KHAC", ghiChu: 5 }, null]) {
    const r = await datGap(w, o, ADM, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(cot(w, legId).lyDo, null);
  const r = await datGap(w, o, ADM, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "Khách gọi lúc 5 giờ, số 0905123456" });
  assert.equal(r.status, 200, r.text);
  const c = cot(w, legId);
  assert.equal(c.lyDo, "KHACH_DOAN_GOI_GAP");
  assert.equal(c.nguoi, SALES, "nháp: người lập đóng dấu (ADR-0135)");
  assert.equal(c.phut, 360, "số phút = mốc THẬT của chính sách gieo (chụp tại mốc)");
  assert.ok(typeof c.luc === "string" && c.luc.endsWith("Z"));
  assert.ok(!String(c.ghiChu).includes("0905123456"), "ghi chú đã che dãy số");
  assert.match(String(c.ghiChu), /^Khách gọi lúc 5 giờ/);
  assert.equal((await xacNhan(w, o.id, SALES)).status, 200);
  const r2 = await datGap(w, o, SUP, { lyDo: "CHUYEN_BAY_DOI_GIO" });
  assert.equal(r2.status, 200, "đơn đã xác nhận: Toàn quyền đóng dấu lại (dấu mới thay dấu cũ — I14)");
  assert.deepEqual({ ...cot(w, legId), luc: undefined }, { lyDo: "CHUYEN_BAY_DOI_GIO", ghiChu: null, nguoi: SUP, luc: undefined, phut: 360 });
});

test("TC-28 nhật ký order_leg_short_notice: có orderId, detail = mã đơn + chiều + NHÃN lý do — không ghi chú, không dãy số, không tên khách", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(120));
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "Bí mật 0905123456 Khách Thử" })).status, 200);
  const nk = w.q("SELECT order_id, staff_id, detail FROM audit_log WHERE action = 'order_leg_short_notice'").map((x: any) => ({ ...x }));
  assert.equal(nk.length, 1);
  assert.equal(nk[0].order_id, o.id);
  assert.equal(nk[0].staff_id, SALES, "người lập (nháp — ADR-0135)");
  assert.equal(nk[0].detail, `${o.orderCode} · Chiều đi · đặt gấp: Khách đoàn gọi gấp`);
});

test("route đặt gấp: đơn / chặng lạ → 404; chặng đã đóng → 409; đơn đã huỷ → 409; khung thử KHÔNG tiêm mốc → 503 (không đoán con số)", async () => {
  const w = setup();
  const o = await nhap(w, SALES, vnSau(24 * 60 * 3));
  assert.equal((await datGap(w, { ...o, id: NO_SUCH }, ADM, { lyDo: "KHAC" })).status, 404);
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHAC" }, NO_SUCH)).status, 404);
  assert.equal((await w.xacNhanDon(o.id, SALES)).status, 200);
  const doc = (await w.call("GET", `/api/orders/${o.id}`, { as: ai(w, o.id, ADM) })).json.order;
  const l = doc.services[0].legs[0];
  assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${l.id}/close`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, reasonCode: "NOT_NEEDED" } })).status, 200);
  const dong = await datGap(w, o, ADM, { lyDo: "KHAC" }, l.id);
  assert.equal(dong.status, 409, dong.text);
  const o2 = await nhap(w, SALES, vnSau(24 * 60 * 3));
  assert.equal((await w.call("POST", `/api/orders/${o2.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  assert.equal((await datGap(w, o2, ADM, { lyDo: "KHAC" })).status, 409);
  // Khung thử KHÔNG tiêm mốc (TC-26): đơn + chặng dựng thẳng bằng SQL (lập nháp có chặng cũng bị chặn 503 ở thế giới này).
  const k = setup({ khongTiemMoc: true });
  const AT = new Date().toISOString();
  const oid = "00000000-0000-4001-8000-000000000001";
  const lid = "00000000-0000-4001-8000-000000000002";
  k.sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('${oid}', 'TD-SQL', '${SALES}', 'draft', 'Khách Giả', '0900000009', '${AT}', '${AT}')`);
  k.sqlite.exec(`INSERT INTO order_service (pickup_choice, id, order_id, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', 'sv-sql', '${oid}', 'Tour', 'perPax', 2, '${inDays(3)}')`);
  k.sqlite.exec(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at) VALUES ('${lid}', '${oid}', 'sv-sql', 'OUT', '${inDays(3)}', '06:30', 'Khách sạn A', '${AT}', '${AT}')`);
  const r = await datGap(k, { id: oid }, ADM, { lyDo: "KHAC" }, lid);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "moc_toi_thieu_chua_co");
  assert.equal(cot(k, lid).lyDo, null, "không ghi");
});

// ---- Mốc lúc ĐẶT (TC-22 phần xác nhận; TC-23; TC-26) -------------------------------------------------------------------------------------------------------
const xacNhan = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });

test("TC-22 mốc lúc đặt: lưu nháp chặng dưới mốc → 200 + canhBaoMoc (không chặn lưu); `/status` → 409 confirm_request_required (ADR-0136), Gửi xác nhận rồi Còn vé → 409 short_notice_required (kèm chặng); Quản trị đặt gấp → Còn vé 200; Thực tập, Đối tác như Bán hàng", async () => {
  const w = setup();
  for (const as of [SALES, INTERN, PARTNER]) {
    const gio = vnSau(120);
    const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, gio.time)])] } });
    assert.equal(r.status, 201, `${as}: ${r.text}`);
    assert.equal(r.json.mocToiThieuPhut, 360);
    const legId = r.json.order.services[0].legs[0].id;
    assert.equal(r.json.canhBaoMoc.length, 1, `${as}: cảnh báo mốc`);
    assert.equal(r.json.canhBaoMoc[0].legKey, legId);
    assert.ok(r.json.canhBaoMoc[0].phutConLai > 100 && r.json.canhBaoMoc[0].phutConLai <= 120, JSON.stringify(r.json.canhBaoMoc));
    // ADR-0136 Task 3.3: đơn có chặng dưới mốc chưa đặt gấp thuộc diện CẦN XÁC NHẬN — `/status` đòi Gửi xác nhận (confirm_request_required); mốc chỉ chặn ở bước Còn vé (người xét duyệt).
    const c = await xacNhan(w, r.json.order.id, as);
    assert.equal(c.status, 409, `${as}: ${c.text}`);
    // Đ13.5: người lập giữ quyền Đối tác nhận `partner_submit_required` TRƯỚC (đường xác nhận cũ đóng), phải «Gửi đơn».
    assert.equal(c.json.error.code, as === PARTNER ? "partner_submit_required" : "confirm_request_required");
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", r.json.order.id)[0].status, "draft", "không đổi trạng thái");
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'confirmed' AND order_id = ?", r.json.order.id)[0].n, 0, "không nhật ký xác nhận");
    const gui = await w.call("POST", `/api/orders/${r.json.order.id}/${as === PARTNER ? "gui-don" : "gui-xac-nhan"}`, { as, body: {} }); // Đối tác đi bằng «Gửi đơn» (nhánh A vì chặng dưới mốc)
    assert.equal(gui.status, 201, `${as}: ${gui.text}`);
    const quyet = () => {
      const o = w.q("SELECT updated_at u FROM orders WHERE id = ?", r.json.order.id)[0];
      const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", r.json.order.id)[0];
      return w.call("POST", `/api/orders/${r.json.order.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: y.id, updatedAt: o.u } });
    };
    const q1 = await quyet();
    assert.equal(q1.status, 409, `${as}: ${q1.text}`);
    assert.equal(q1.json.error.code, "short_notice_required");
    assert.deepEqual(q1.json.error.legs.map((x: any) => x.legId), [legId]);
    // Nháp ĐANG CHỜ: Quản trị (không phải người lập) đặt gấp được — ngoại lệ có tên của ADR-0135 Đ2 (ADR-0136 Đ1).
    assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/legs/${legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200, `${as}: Quản trị đặt gấp nháp đang chờ`);
    const c2 = await quyet();
    assert.equal(c2.status, 200, `${as} sau đặt gấp: ${c2.text}`);
  }
});

test("TC-23: đủ mốc (ngày mai xa hơn 6 giờ) → xác nhận 200 không cần đặt gấp; chặng KHÔNG giờ không chặn (I13); điều kiện cũ giữ nguyên (ngày đi quá khứ → 409 incomplete_trip); câu xác nhận ở tệp nửa nghiêm", async () => {
  const w = setup();
  const xa = await nhap(w, SALES, vnSau(24 * 60 + 60));
  assert.equal((await xacNhan(w, xa.id, SALES)).status, 200);
  const gio = vnSau(60);
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, "")])] } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.canhBaoMoc, [], "chặng chưa chốt giờ: không cảnh báo");
  assert.equal((await xacNhan(w, r.json.order.id, SALES)).status, 200, "chặng không giờ không chặn xác nhận");
  const src = readFileSync(new URL("./chang-hanh-khach-repo.ts", import.meta.url), "utf8");
  assert.match(src, /defineSql\(\s*"orders",\s*"order_confirm"/, "câu xác nhận đăng ký defineSql ở tệp nửa nghiêm (I15)");
  const repo = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  assert.doesNotMatch(repo, /SET status = 'confirmed'/, "repository.ts không còn câu xác nhận thô");
});

test("TC-26 hàm tiêm: lập / sửa nháp có chặng, xác nhận, đặt gấp gọi ctx.mocToiThieu ĐÚNG MỘT lần mỗi request; KHÔNG tiêm → 503 (không đoán con số), không ghi", async () => {
  const w = setup({ demMoc: true });
  const gio = vnSau(24 * 60 * 2);
  let n = w.soLanGoiMoc();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, gio.time)])] } });
  assert.equal(r.status, 201, r.text);
  assert.equal(w.soLanGoiMoc() - n, 1, "lập nháp");
  n = w.soLanGoiMoc();
  const o = r.json.order;
  const s = o.services[0];
  const sua = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: o.updatedAt, services: [svc(gio.date, [{ ...leg(gio.date, gio.time), id: s.legs[0].id }], { id: s.id })] } });
  assert.equal(sua.status, 200, sua.text);
  assert.equal(w.soLanGoiMoc() - n, 1, "sửa nháp");
  n = w.soLanGoiMoc();
  assert.equal((await xacNhan(w, o.id, SALES)).status, 200);
  assert.equal(w.soLanGoiMoc() - n, 1, "xác nhận");
  n = w.soLanGoiMoc();
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.mocToiThieuPhut, 360);
  assert.equal(w.soLanGoiMoc() - n, 1, "chi tiết đơn");
  // Không tiêm
  const k = setup({ khongTiemMoc: true });
  const truoc = k.q("SELECT count(*) n FROM orders")[0].n;
  const r2 = await k.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [leg(gio.date, gio.time)])] } });
  assert.equal(r2.status, 503, r2.text);
  assert.equal(r2.json.error.code, "moc_toi_thieu_chua_co");
  assert.equal(k.q("SELECT count(*) n FROM orders")[0].n, truoc, "không tạo đơn");
  const khongChang = await k.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [])] } });
  assert.equal(khongChang.status, 201, "nháp KHÔNG chặng không cần mốc");
  assert.equal((await k.call("GET", `/api/orders/${khongChang.json.order.id}`, { as: SALES })).json.mocToiThieuPhut, null, "chi tiết: mốc chưa có → null (đọc không bị chặn)");
  const c = await xacNhan(k, khongChang.json.order.id, SALES);
  assert.equal(c.status, 503, c.text);
  assert.equal(k.q("SELECT status FROM orders WHERE id = ?", khongChang.json.order.id)[0].status, "draft");
});

// ---- Sửa chặng đơn ĐÃ XÁC NHẬN dưới mốc (I14, TC-24; Q3 chủ: "Chỉ Quản trị, Toàn quyền") -----------------------------------------------------------
async function daXacNhanSatGio(w: any, phut = 150) {
  const gio = vnSau(phut);
  const o = await nhap(w, SALES, gio);
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHACH_DOAN_GOI_GAP" })).status, 200);
  assert.equal((await xacNhan(w, o.id, SALES)).status, 200);
  return (await w.call("GET", `/api/orders/${o.id}`, { as: ai(w, o.id, ADM) })).json.order;
}
const DAT_GAP = { lyDo: "CHUYEN_BAY_DOI_GIO" };
const suaChang = (w: any, o: any, as: string, over: Record<string, unknown>, datGapBody?: unknown) => {
  const l = o.services[0].legs[0];
  return w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, {
    as, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over }, ...(datGapBody === undefined ? {} : { datGap: datGapBody }) },
  });
};

// ADR-0107 (i) — NỚI có tên (chủ Q-3 a 8/10): "Bán hàng gửi datGap → 403" thành "Bán hàng (đơn mình lập) kèm datGap → 200, dấu của Bán hàng" (cuối bài).
test("TC-24 PUT …/legs/:legId dưới mốc: Bán hàng → 409 short_notice_required (kể cả chặng ĐÃ có dấu cũ — Q3); Quản trị KHÔNG datGap → 409; Quản trị kèm datGap → 200, dấu MỚI, nhật ký trước → sau có 'đặt gấp'; Bán hàng (đơn mình) kèm datGap → 200 (ADR-0107)", async () => {
  const w = setup();
  const o = await daXacNhanSatGio(w);
  const legId = o.services[0].legs[0].id;
  const truoc = cot(w, legId);
  const r1 = await suaChang(w, o, SALES, { pickupPlace: "Khách sạn Mới" });
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "short_notice_required");
  assert.equal((await suaChang(w, o, ADM, { pickupPlace: "Khách sạn Mới" })).status, 409);
  assert.deepEqual(cot(w, legId), truoc, "không đổi gì");
  const ok = await suaChang(w, o, ADM, { pickupPlace: "Khách sạn Mới" }, DAT_GAP);
  assert.equal(ok.status, 200, ok.text);
  const sau = cot(w, legId);
  assert.equal(sau.lyDo, "CHUYEN_BAY_DOI_GIO");
  assert.equal(sau.nguoi, ADM);
  assert.notEqual(sau.luc, truoc.luc, "dấu MỚI (lúc mới)");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'order_leg_updated' ORDER BY rowid DESC LIMIT 1")[0].detail;
  assert.match(nk, /đặt gấp: Chuyến bay đổi giờ/);
  const ban = await suaChang(w, ok.json.order, SALES, { pickupPlace: "Khách sạn Mới Hơn" }, DAT_GAP);
  assert.equal(ban.status, 200, ban.text);
  assert.equal(cot(w, legId).nguoi, SALES, "ADR-0107 (i): Bán hàng (đơn mình lập) tự đóng dấu khi sửa chặng dưới mốc");
});

test("TC-24 POST …/legs và PUT …/trip dưới mốc: Bán hàng → 409; Quản trị kèm datGap → chặng mới / chặng sửa mang dấu; chặng xa hơn mốc: Bán hàng sửa được, dấu CŨ bị bỏ (duyệt nội dung cũ — I16)", async () => {
  const w = setup();
  const o = await daXacNhanSatGio(w);
  const sid = o.services[0].id;
  const gio = vnSau(90);
  const legMoi = { direction: "RETURN", pickupDate: gio.date, pickupTime: gio.time, pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Nhà riêng" };
  const r1 = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: sid, leg: legMoi } });
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "short_notice_required");
  const r2 = await w.call("POST", `/api/orders/${o.id}/legs`, { as: ADM, body: { expectedUpdatedAt: o.updatedAt, serviceId: sid, leg: legMoi, datGap: DAT_GAP } });
  assert.equal(r2.status, 201, r2.text);
  const moi = r2.json.order.services[0].legs.find((l: any) => l.direction === "RETURN");
  assert.equal(cot(w, moi.id).lyDo, "CHUYEN_BAY_DOI_GIO");
  // PUT /trip cũ trộn giờ mới vào chiều đi đầu (dưới mốc)
  const o2 = r2.json.order;
  const tripBody = (as: string, datGapBody?: unknown) => w.call("PUT", `/api/orders/${o2.id}/trip`, {
    as, body: { expectedUpdatedAt: o2.updatedAt, services: [{ id: sid, departDate: o2.services[0].departDate, departTime: "", pickupTime: o2.services[0].legs.find((l: any) => l.direction === "OUT").pickupTime, pickupPlace: "Khách sạn Đổi", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }], ...(datGapBody === undefined ? {} : { datGap: datGapBody }) },
  });
  const t1 = await tripBody(SALES);
  assert.equal(t1.status, 409, t1.text);
  assert.equal(t1.json.error.code, "short_notice_required");
  const outId = o2.services[0].legs.find((l: any) => l.direction === "OUT").id;
  assert.equal(cot(w, outId).lyDo, "KHACH_DOAN_GOI_GAP", "trước: dấu cũ");
  const t2 = await tripBody(ADM, DAT_GAP);
  assert.equal(t2.status, 200, t2.text);
  assert.equal(cot(w, outId).lyDo, "CHUYEN_BAY_DOI_GIO", "Quản trị kèm datGap qua PUT /trip: chặng sửa mang dấu MỚI");
  assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_updated' ORDER BY rowid DESC LIMIT 1")[0].detail, /đặt gấp: Chuyến bay đổi giờ/);
  // Chặng xa hơn mốc (2 ngày): Bán hàng sửa được; dấu cũ (nếu có) bị bỏ vì nội dung đổi. Dấu cũ trên chặng còn xa nay chỉ còn là dữ liệu đóng TRƯỚC ADR-0107
  // (nút Đặt gấp trả 409 short_notice_not_needed) → gieo thẳng CSDL.
  const xa = await nhap(w, SALES, vnSau(24 * 60 * 2));
  gieoDauCu(w, xa.services[0].legs[0].id);
  assert.equal((await xacNhan(w, xa.id, SALES)).status, 200);
  const xaDoc = (await w.call("GET", `/api/orders/${xa.id}`, { as: ai(w, xa.id, ADM) })).json.order;
  const s = await suaChang(w, xaDoc, SALES, { pickupPlace: "Khách sạn Khác" });
  assert.equal(s.status, 200, s.text);
  assert.equal(cot(w, xaDoc.services[0].legs[0].id).lyDo, null, "dấu cũ duyệt nội dung cũ — sửa nơi đón thì bỏ dấu");
});

// ---- Chỉ route đặt gấp ghi năm cột (TC-25) + Q1 = (a) (TC-43) -------------------------------------------------------------------------------------------------
test("TC-25: thân lập / sửa nháp và thân sửa chặng mang shortNotice* → năm cột VẪN NULL (bộ đọc thân là danh sách trắng)", async () => {
  const w = setup();
  const gio = vnSau(24 * 60 * 2);
  const bay = { shortNoticeReason: "KHAC", shortNoticeBy: SALES, shortNoticeAt: "2026-01-01T00:00:00.000Z", shortNoticeLeadMinutes: 360, short_notice_reason: "KHAC", datGap: true };
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc(gio.date, [{ ...leg(gio.date, gio.time), ...bay }])] } });
  assert.equal(r.status, 201, r.text);
  const legId = r.json.order.services[0].legs[0].id;
  assert.equal(cot(w, legId).lyDo, null);
  const o = r.json.order;
  const s = o.services[0];
  const sua = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: o.updatedAt, services: [svc(gio.date, [{ ...leg(gio.date, gio.time), id: legId, ...bay }], { id: s.id })] } });
  assert.equal(sua.status, 200, sua.text);
  assert.equal(cot(w, legId).lyDo, null);
});

test("TC-43 (Q1 = (a)) lưu lại đơn nháp: chặng KHÔNG đổi giờ / nơi GIỮ dấu đặt gấp; đổi nơi đón → MẤT dấu (xác nhận 409); đổi giờ → MẤT dấu; hai chặng cũ giống hệt → không mang dấu", async () => {
  const w = setup();
  const gio = vnSau(120);
  const o = await nhap(w, SALES, gio);
  assert.equal((await datGap(w, o, ADM, { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "gọi lúc 5 giờ" })).status, 200);
  const dau = cot(w, o.services[0].legs[0].id);
  const doc = async () => (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  let d = await doc();
  // chỉ thêm tên khách — chặng giữ nguyên nội dung (gửi lại KHÔNG id chặng: khớp theo nội dung, không theo id)
  let r = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(gio.date, [leg(gio.date, gio.time)], { id: d.services[0].id })], passengers: [{ fullName: "Khách Dò Tìm", birthYear: 1990, paxCode: null }] } });
  assert.equal(r.status, 200, r.text);
  const moi = r.json.order.services[0].legs[0].id;
  assert.deepEqual({ ...cot(w, moi) }, { ...dau }, "chặng mới mang ĐỦ năm cột của chặng cũ (chép từ CSDL)");
  assert.deepEqual(r.json.canhBaoMoc, [], "chặng đã đặt gấp: không cảnh báo");
  // đổi nơi đón → mất dấu (cùng luật với đổi giờ / ngày / nơi trả)
  d = await doc();
  r = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(gio.date, [leg(gio.date, gio.time, { pickupPlace: "Khách sạn Khác" })], { id: d.services[0].id })] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(cot(w, r.json.order.services[0].legs[0].id).lyDo, null, "đổi nơi đón: mất dấu");
  assert.equal((await xacNhan(w, o.id, SALES)).status, 409);
  // đổi GIỜ (cùng ngày, xa mốc — chỉ đọc cột, không phụ thuộc giờ chạy bài) → mất dấu. Dấu cũ trên chặng còn xa = dữ liệu đóng TRƯỚC ADR-0107 → gieo thẳng CSDL
  // (đường chép của đơn nháp chép mọi dấu đã lưu, không xét mốc — ngoại lệ có tên của ADR-0107 mục 4).
  const xa = inDays(2);
  const o4 = await nhap(w, SALES, { date: xa, time: "05:00" });
  gieoDauCu(w, o4.services[0].legs[0].id);
  d = (await w.call("GET", `/api/orders/${o4.id}`, { as: SALES })).json.order;
  r = await w.call("PUT", `/api/orders/${o4.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(xa, [leg(xa, "05:00")], { id: d.services[0].id })] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(cot(w, r.json.order.services[0].legs[0].id).lyDo, "KHAC", "cùng giờ: giữ dấu");
  d = r.json.order;
  r = await w.call("PUT", `/api/orders/${o4.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(xa, [leg(xa, "05:10")], { id: d.services[0].id })] } });
  assert.equal(r.status, 200, r.text);
  assert.equal(cot(w, r.json.order.services[0].legs[0].id).lyDo, null, "đổi giờ 05:00 → 05:10: mất dấu");
  // hai chặng cũ giống hệt → không khớp một-một → không mang dấu (an toàn)
  const o3 = await nhap(w, SALES, gio);
  d = (await w.call("GET", `/api/orders/${o3.id}`, { as: SALES })).json.order;
  r = await w.call("PUT", `/api/orders/${o3.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(gio.date, [leg(gio.date, gio.time), leg(gio.date, gio.time, { direction: "OUT" })], { id: d.services[0].id })] } });
  assert.equal(r.status, 200, r.text);
  d = r.json.order;
  for (const l of d.services[0].legs) assert.equal((await datGap(w, d, ADM, { lyDo: "KHAC" }, l.id)).status, 200);
  d = (await w.call("GET", `/api/orders/${o3.id}`, { as: SALES })).json.order;
  r = await w.call("PUT", `/api/orders/${o3.id}`, { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", expectedUpdatedAt: d.updatedAt, services: [svc(gio.date, [leg(gio.date, gio.time), leg(gio.date, gio.time)], { id: d.services[0].id })] } });
  assert.equal(r.status, 200, r.text);
  for (const l of r.json.order.services[0].legs) assert.equal(cot(w, l.id).lyDo, null, "hai chặng giống hệt: không mang dấu");
});

// ---- Bài canh Ruling N-9 (iii): bài kiểm mốc đi đường THẬT --------------------------------------------------------------------------------------------------
test("Ruling N-9: tệp bài mốc / đặt gấp KHÔNG dùng mốc giả của khung thử — mọi thế giới ở đây chạy mốc THẬT (hoặc không tiêm cho TC-26)", () => {
  const TUY_CHON_MOC_GIA = ["mocGia", "ChoBaiKhongKiemMoc"].join("");
  const src = readFileSync(new URL("./dat-gap.test.ts", import.meta.url), "utf8");
  assert.ok(!src.includes(TUY_CHON_MOC_GIA), "bài mốc thật không được dùng mốc giả");
});

// ---- R-P15 (điều phối 29/9 đêm — đối chiếu bản vẽ; I31 cách (a)): route đọc mốc cho biểu mẫu đơn CHƯA lưu --------------------------------------------------
test("R-P15 GET /api/orders/moc-toi-thieu: người lập đơn (Bán hàng, Quản trị, Toàn quyền, Thực tập, Đối tác) → 200 { mocToiThieuPhut, canhBaoPhut } của chính sách HIỆN HÀNH; Kế toán (không lập đơn) → 403; không tiêm mốc → 503; không bị route /api/orders/:id nuốt", async () => {
  const w = setup();
  for (const as of [SALES, ADM, SUP, INTERN, PARTNER]) {
    const r = await w.call("GET", "/api/orders/moc-toi-thieu", { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(r.json, { mocToiThieuPhut: 360, canhBaoPhut: 120 }, "dòng gieo của 0041: 360 / 120");
  }
  const acc = await w.call("GET", "/api/orders/moc-toi-thieu", { as: ACC });
  assert.equal(acc.status, 403, acc.text);
  // Toàn quyền đổi chính sách (dòng mới có hiệu lực từ bây giờ) → route trả số MỚI, không cache.
  const luc = new Date(Date.now() - 1000).toISOString();
  w.sqlite.prepare(
    `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_at, updated_at)
     VALUES ('cs-rp15', 240, 45, 30, 1, 0, 180, ?, ?, ?)`,
  ).run(luc, luc, luc);
  assert.deepEqual((await w.call("GET", "/api/orders/moc-toi-thieu", { as: SALES })).json, { mocToiThieuPhut: 240, canhBaoPhut: 45 });
  const khong = setup({ khongTiemMoc: true });
  const r503 = await khong.call("GET", "/api/orders/moc-toi-thieu", { as: SALES });
  assert.equal(r503.status, 503, r503.text);
  assert.equal(r503.json.error.code, "moc_toi_thieu_chua_co");
});
