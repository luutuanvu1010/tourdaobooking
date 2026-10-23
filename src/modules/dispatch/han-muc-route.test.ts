// Hạn mức «Từ chối» (ADR-0032; kế hoạch 2026-10-23 mục 8 HM-1…HM-15): hành vi API THẬT trên SQLite thật qua khung tests/audit/harness.mjs (khuôn tu-choi.test.ts).
// Đọc thẳng `dsp_release_event`, `dsp_assignment`, `audit_log` để kiểm dữ liệu sau lệnh. Luật đếm thuần + bản SQL: src/shared/han-muc-tu-choi.test.ts,
// src/modules/dispatch/han-muc-sql.test.ts; lô ghi: service.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const FIELD2 = "55555555-5555-4555-8555-555555555555";
const SUP = "66666666-6666-4666-8666-666666666666";
const ACC = "77777777-7777-4777-8777-777777777777";
const ACC_FIELD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SALES_FIELD = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PARTNER = "88888888-8888-4888-8888-888888888888";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn A", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: FIELD2, phone: "0900000005", name: "Hướng Dẫn B", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000006", name: "Toàn quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000007", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ACC_FIELD, phone: "0900000012", name: "Kế Toán Kiêm", perms: ["ACCOUNTING", "FIELD"] });
  seedStaff(w.sqlite, { id: SALES_FIELD, phone: "0900000013", name: "Bán Hàng Kiêm", perms: ["SALES", "FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678", ...extra,
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
});
/** Đơn đã xác nhận, CHƯA có người phụ trách (do Bán hàng An lập). */
async function donCho(w: any): Promise<string> {
  const created = await w.call("POST", "/api/orders", { as: SALES, body: orderBody() });
  assert.equal(created.status, 201, created.text);
  const id = created.json.order.id;
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  return id;
}
const nhan = (w: any, id: string, as: string) => w.call("PUT", `/api/orders/${id}/handler`, { as, body: { staffId: as } });
const giao = (w: any, id: string, as: string, staffId: string) => w.call("PUT", `/api/orders/${id}/handler`, { as, body: { staffId } });
const suKien = (w: any, where = "1 = 1", ...a: unknown[]): any[] =>
  w.q(`SELECT party_id, order_id, kind_code, reason_code, occurred_at, created_by FROM dsp_release_event WHERE ${where} ORDER BY seq`, ...a).map((r: any) => ({ ...r }));

// ---- HM-13: mọi đường MỞ dòng phụ trách ghi sự kiện cùng lô ----
test("HM-13: lập đơn có chọn HDV → 1 ASSIGN; tự Nhận → 1 CLAIM; giao đơn chưa có người → 1 ASSIGN; đổi người A→B → 1 ASSIGN cho B, 0 cho A; nhánh thua → 0", async () => {
  const w = setup();
  const lap = await w.call("POST", "/api/orders", { as: SALES, body: orderBody({ handlerStaffId: FIELD }) });
  assert.equal(lap.status, 201, lap.text);
  const d1 = lap.json.order.id;
  const mo1 = w.q("SELECT valid_from_at FROM dsp_assignment WHERE order_id = ?", d1)[0].valid_from_at;
  assert.deepEqual(suKien(w, "order_id = ?", d1), [{ party_id: `pty-${FIELD}`, order_id: d1, kind_code: "ASSIGN", reason_code: null, occurred_at: mo1, created_by: SALES }]);

  const d2 = await donCho(w);
  assert.equal((await nhan(w, d2, FIELD)).status, 200);
  assert.equal((await nhan(w, d2, FIELD2)).status, 409, "thua: đã có người");
  assert.deepEqual(suKien(w, "order_id = ?", d2).map((e: any) => [e.party_id, e.kind_code, e.created_by]), [[`pty-${FIELD}`, "CLAIM", FIELD]]);

  const d3 = await donCho(w);
  assert.equal((await giao(w, d3, ADM, FIELD)).status, 200);
  assert.equal((await giao(w, d3, ADM, FIELD2)).status, 200, "đổi người A→B");
  assert.deepEqual(suKien(w, "order_id = ?", d3).map((e: any) => [e.party_id, e.kind_code, e.created_by]), [[`pty-${FIELD}`, "ASSIGN", ADM], [`pty-${FIELD2}`, "ASSIGN", ADM]]);
  // Mọi dòng HANDLE mở có đúng sự kiện CLAIM/ASSIGN cùng người, cùng đơn, cùng mốc (lưới R-DSP-6).
  const thieu = w.q(`SELECT count(*) n FROM dsp_assignment a WHERE a.task_kind_code = 'HANDLE' AND NOT EXISTS (SELECT 1 FROM dsp_release_event e
    WHERE e.party_id = a.party_id AND e.order_id = a.order_id AND e.kind_code IN ('CLAIM', 'ASSIGN') AND e.occurred_at = a.valid_from_at)`)[0].n;
  assert.equal(thieu, 0);
});

// ---- HM-8: HDV tự huỷ → ABORT (chỉ thống kê) ----
const huy = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/handler-cancel`, { as, body: { reason: "customer_requested" } });

test("HM-8: HDV huỷ đơn đang phụ trách (handler-cancel) → 200 + đúng MỘT ABORT (người = HDV, đơn đúng, giờ máy chủ); Toàn quyền KHÔNG phụ trách huỷ hộ → 200, 0 ABORT", async () => {
  const w = setup();
  const d1 = await donCho(w);
  assert.equal((await nhan(w, d1, FIELD)).status, 200);
  const r = await huy(w, d1, FIELD);
  assert.equal(r.status, 200, r.text);
  const ab = suKien(w, "order_id = ? AND kind_code = 'ABORT'", d1);
  assert.deepEqual(ab.map((e: any) => [e.party_id, e.created_by]), [[`pty-${FIELD}`, FIELD]]);
  assert.ok(Math.abs(Date.parse(ab[0].occurred_at) - Date.now()) < 60_000 && ab[0].occurred_at.endsWith("Z"), "giờ máy chủ, ISO UTC");

  const d2 = await donCho(w);
  assert.equal((await giao(w, d2, ADM, FIELD2)).status, 200);
  const r2 = await huy(w, d2, SUP);
  assert.equal(r2.status, 200, r2.text);
  assert.equal(suKien(w, "order_id = ? AND kind_code = 'ABORT'", d2).length, 0, "Toàn quyền huỷ hộ không phải «người phụ trách tự huỷ»");
});

test("HM-8: lô huỷ THUA khoá lạc quan (đơn vừa bị sửa giữa lúc đọc và ghi) → 409, 0 ABORT", async () => {
  const w = setup();
  const d = await donCho(w);
  assert.equal((await nhan(w, d, FIELD)).status, 200);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /dsp_release_event/.test(s.sql) && /ABORT/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(new Date(Date.now() + 1000).toISOString(), d);
  });
  const r = await huy(w, d, FIELD);
  assert.equal(r.status, 409, r.text);
  assert.equal(suKien(w, "kind_code = 'ABORT'").length, 0);
});

// ---- H6: câu đầu lô Từ chối + hạn mức ở route ----
/** Đặt cài đặt thẳng vào bảng (bài route cài đặt ở dưới, HM-7) — dòng mới hiệu lực ngay, sau dòng gieo. */
function datCaiDat(w: any, mode: "OFF" | "MEASURE" | "BLOCK", mc = 2, mw = 15): void {
  const moc = w.q("SELECT max(valid_from_at) m FROM dsp_refuse_policy")[0].m;
  const at = new Date(Math.max(Date.now() - 1000, Date.parse(moc) + 1)).toISOString();
  w.sqlite.prepare("INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)")
    .run(crypto.randomUUID(), mode, mc, mw, at, at, at);
}
const tuChoi = (w: any, id: string, as: string, lyDo = "BAN_LICH") => w.call("POST", `/api/orders/${id}/handler-refuse`, { as, body: { lyDo } });
const moDong = (w: any, id: string) => w.q("SELECT party_id FROM dsp_assignment WHERE order_id = ? AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL", id).map((r: any) => r.party_id);
const soRefuse = (w: any, staffId: string) => w.q("SELECT count(*) n FROM dsp_release_event WHERE party_id = ? AND kind_code = 'REFUSE'", `pty-${staffId}`)[0].n;
const cham = (w: any) => w.q("SELECT order_id, staff_id, detail FROM audit_log WHERE action = 'refuse_limit_hit' ORDER BY rowid").map((r: any) => ({ ...r }));
/** Nhận (hoặc được giao) một đơn mới rồi Từ chối → trả mã HTTP. */
async function nhanVaTuChoi(w: any, as: string, giaoBoi?: string): Promise<{ id: string; r: any }> {
  const id = await donCho(w);
  const g = giaoBoi ? await giao(w, id, giaoBoi, as) : await nhan(w, id, as);
  assert.equal(g.status, 200, g.text);
  return { id, r: await tuChoi(w, id, as) };
}
const CAU_HET = "Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.";

test("HM-1: Chặn 2/15 — HDV nhận–từ chối A, B → 200; đơn C → 409 refuse_limit đúng câu ADR; dòng phụ trách C vẫn mở, vẫn 2 REFUSE, đúng 1 refuse_limit_hit sạch", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const { id, r } = await nhanVaTuChoi(w, FIELD);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "refuse_limit");
  assert.equal(r.json.error.message, CAU_HET);
  assert.deepEqual(moDong(w, id), [`pty-${FIELD}`], "dòng phụ trách VẪN mở");
  assert.equal(soRefuse(w, FIELD), 2, "không có REFUSE mới");
  const c = cham(w);
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].order_id, c[0].staff_id], [id, FIELD]);
  assert.equal(c[0].detail, "Liên tiếp 2/2 · tuần 2/15 · Chặn");
  assert.ok(!/\d{8,}/.test(c[0].detail) && !c[0].detail.includes("@") && !c[0].detail.includes("Hướng Dẫn"));
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE order_id = ? AND action = 'order_handler_refused'", id)[0].n, 0);
});

test("HM-2: giữa B và C, HDV nhận K và giữ (hoặc văn phòng Giao K) → từ chối C → 200, có REFUSE thứ 3", async () => {
  for (const giaoBoi of [undefined, ADM]) {
    const w = setup();
    datCaiDat(w, "BLOCK");
    for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
    const k = await donCho(w);
    assert.equal((giaoBoi ? await giao(w, k, giaoBoi, FIELD) : await nhan(w, k, FIELD)).status, 200);
    const { r } = await nhanVaTuChoi(w, FIELD);
    assert.equal(r.status, 200, `${giaoBoi ? "được giao" : "tự nhận"} K: ${r.text}`);
    assert.equal(soRefuse(w, FIELD), 3);
  }
});

test("HM-3: (a) từ chối 2, văn phòng Giao Y rồi HDV từ chối CHÍNH Y → 409; (b) đệm K bị HDV huỷ (ABORT) mất tư cách mốc → 409", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const a = await nhanVaTuChoi(w, FIELD, ADM);
  assert.equal(a.r.status, 409, a.r.text);
  assert.equal(a.r.json.error.code, "refuse_limit");

  const w2 = setup();
  datCaiDat(w2, "BLOCK");
  assert.equal((await nhanVaTuChoi(w2, FIELD)).r.status, 200);
  const k = await donCho(w2);
  assert.equal((await nhan(w2, k, FIELD)).status, 200);
  assert.equal((await huy(w2, k, FIELD)).status, 200);
  assert.equal((await nhanVaTuChoi(w2, FIELD)).r.status, 200);
  const b = await nhanVaTuChoi(w2, FIELD);
  assert.equal(b.r.status, 409, b.r.text);
});

test("HM-5: «Chỉ đo» — lần 3 vẫn 200, dòng đóng, có REFUSE thứ 3, 1 refuse_limit_hit chữ «Chỉ đo»; «Tắt» — lần 3 → 200, 0 refuse_limit_hit; sự kiện vẫn ghi", async () => {
  const w = setup(); // dòng gieo của migration = Chỉ đo 2/15
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const { id, r } = await nhanVaTuChoi(w, FIELD);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(moDong(w, id), []);
  assert.equal(soRefuse(w, FIELD), 3);
  const c = cham(w);
  assert.deepEqual(c.map((x: any) => [x.order_id, x.detail]), [[id, "Liên tiếp 2/2 · tuần 2/15 · Chỉ đo (không chặn)"]]);

  const w2 = setup();
  datCaiDat(w2, "OFF");
  for (let i = 0; i < 3; i++) assert.equal((await nhanVaTuChoi(w2, FIELD)).r.status, 200);
  assert.equal(soRefuse(w2, FIELD), 3);
  assert.equal(cham(w2).length, 0);
});

test("HM-6: SALES, ADMIN, SUPER_ADMIN, ACCOUNTING+FIELD, SALES+FIELD đang phụ trách — Chặn 2/15, từ chối lần 3, 4 → 200; REFUSE vẫn ghi; Kế toán thuần → 403", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  for (const nguoi of [SALES, ADM, SUP, ACC_FIELD, SALES_FIELD]) {
    for (let i = 0; i < 4; i++) {
      const { r } = await nhanVaTuChoi(w, nguoi, ADM);
      assert.equal(r.status, 200, `${nguoi} lần ${i + 1}: ${r.text}`);
    }
    assert.equal(soRefuse(w, nguoi), 4, nguoi);
  }
  assert.equal(cham(w).length, 0, "người không bị giới hạn không chạm hạn mức");
  const id = await donCho(w);
  assert.equal((await tuChoi(w, id, ACC)).status, 403);
});

test("HM-12 (b): một REFUSE khác của HDV chen vào NGAY TRƯỚC lô (chuỗi 1 → 2) → câu đầu không chèn → 409 refuse_limit, dòng phụ trách vẫn mở, không REFUSE ma", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const id = await donCho(w);
  assert.equal((await nhan(w, id, FIELD)).status, 200);
  const khac = await donCho(w);
  w.chenTruocLo((stmts: any[]) => /INSERT INTO dsp_release_event[\s\S]*'REFUSE'/.test(stmts[0]?.sql ?? ""), () => {
    const s = w.q("SELECT coalesce(max(seq), 0) + 1 s FROM dsp_release_event")[0].s;
    const at = new Date().toISOString();
    w.sqlite.prepare("INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 'REFUSE', 'OTHER', ?, ?, NULL, ?, NULL)")
      .run(crypto.randomUUID(), s, `pty-${FIELD}`, khac, at, at, at);
  });
  const r = await tuChoi(w, id, FIELD);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "refuse_limit");
  assert.deepEqual(moDong(w, id), [`pty-${FIELD}`]);
  assert.equal(w.q("SELECT count(*) n FROM dsp_release_event WHERE order_id = ? AND kind_code = 'REFUSE'", id)[0].n, 0, "không REFUSE ma");
  assert.equal(cham(w).length, 1);
});

test("HM-12 (c): văn phòng đổi người đúng lúc HDV Từ chối (chen trước lô) → 409 stale, KHÔNG dòng REFUSE", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  const id = await donCho(w);
  assert.equal((await nhan(w, id, FIELD)).status, 200);
  w.chenTruocLo((stmts: any[]) => /INSERT INTO dsp_release_event[\s\S]*'REFUSE'/.test(stmts[0]?.sql ?? ""), () => {
    const at = new Date().toISOString();
    w.sqlite.prepare("UPDATE dsp_assignment SET valid_to_at = ?, updated_at = ? WHERE order_id = ? AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL").run(at, at, id);
    w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)")
      .run(crypto.randomUUID(), id, `pty-${FIELD2}`, at, at, at);
  });
  const r = await tuChoi(w, id, FIELD);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(soRefuse(w, FIELD), 0);
  assert.deepEqual(moDong(w, id), [`pty-${FIELD2}`]);
});

test("HM-12 (a): Chặn 2/15, chuỗi = 1 — HDV gửi ĐỒNG THỜI Từ chối hai đơn (5 vòng, đặt lại giữa vòng) → mỗi vòng đúng một 200 và một 409 refuse_limit; REFUSE +1/vòng", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  for (let vong = 0; vong < 5; vong++) {
    w.sqlite.prepare("INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by) SELECT ?, coalesce(max(seq), 0) + 1, ?, NULL, 'RESET', NULL, ?, ?, NULL, ?, NULL FROM dsp_release_event")
      .run(crypto.randomUUID(), `pty-${FIELD}`, new Date().toISOString(), new Date().toISOString(), new Date().toISOString());
    assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
    const a = await donCho(w), b = await donCho(w);
    assert.equal((await nhan(w, a, FIELD)).status, 200);
    assert.equal((await nhan(w, b, FIELD)).status, 200);
    const truoc = soRefuse(w, FIELD);
    const kq = await Promise.all([tuChoi(w, a, FIELD), tuChoi(w, b, FIELD)]);
    assert.deepEqual(kq.map((r) => r.status).sort(), [200, 409], `vòng ${vong}: ${kq.map((r) => r.text).join(" | ")}`);
    assert.equal(kq.find((r) => r.status === 409)!.json.error.code, "refuse_limit");
    assert.equal(soRefuse(w, FIELD), truoc + 1);
  }
});

// ---- H7: route quản trị — xem / cài đặt / đặt lại (HM-7) ----
const BASE = "/api/dispatch/han-muc-tu-choi";
const caiDatRoute = (w: any, as: string, body: unknown) => w.call("POST", `${BASE}/chinh-sach`, { as, body });
const datLai = (w: any, as: string, body: unknown) => w.call("POST", `${BASE}/dat-lai`, { as, body });
/** Đẩy HDV tới hết lượt (Chặn 2/15): hai lần nhận–từ chối, lần ba bị chặn — trả đơn thứ ba (HDV VẪN giữ; đơn đó là mốc cho đơn KHÁC, không cho chính nó). */
async function hetLuot(w: any, as: string): Promise<string> {
  for (let i = 0; i < 2; i++) assert.equal((await nhanVaTuChoi(w, as)).r.status, 200);
  const { id, r } = await nhanVaTuChoi(w, as);
  assert.equal(r.status, 409);
  return id;
}

test("HM-7 (a)(b): Toàn quyền đặt lại MỘT người → người đó Từ chối được ngay, người khác vẫn 409; «tất cả» → mỗi tài khoản FIELD đang hoạt động một RESET, một nhật ký", async () => {
  const w = setup();
  assert.equal((await caiDatRoute(w, SUP, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 })).status, 200);
  const c1 = await hetLuot(w, FIELD);
  const c2 = await hetLuot(w, FIELD2);
  const r = await datLai(w, SUP, { partyId: `pty-${FIELD}` });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { soNguoi: 1 });
  assert.equal((await tuChoi(w, c1, FIELD)).status, 200, "HDV vừa được đặt lại: Từ chối được ngay chính đơn vừa bị chặn");
  assert.equal((await tuChoi(w, c2, FIELD2)).status, 409, "HDV khác không đổi");
  const nk1 = w.q("SELECT staff_id, target_type, target_id, detail, order_id FROM audit_log WHERE action = 'refuse_counter_reset'").map((x: any) => ({ ...x }));
  assert.deepEqual(nk1, [{ staff_id: SUP, target_type: "party", target_id: `pty-${FIELD}`, detail: "Đặt lại cho một hướng dẫn viên", order_id: null }]);

  const all = await datLai(w, SUP, { tatCa: true });
  assert.equal(all.status, 200, all.text);
  const soField = w.q("SELECT count(DISTINCT s.id) n FROM staff s JOIN stf_permission p ON p.staff_id = s.id WHERE s.active = 1 AND p.permission_type_code = 'FIELD' AND p.valid_to_at IS NULL")[0].n;
  assert.equal(all.json.soNguoi, soField);
  assert.equal(soField, 4, "HDV A, HDV B, Kế Toán Kiêm, Bán Hàng Kiêm");
  assert.equal(w.q("SELECT count(*) n FROM dsp_release_event WHERE kind_code = 'RESET'")[0].n, 1 + soField);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'refuse_counter_reset'")[0].n, 2);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'refuse_counter_reset' ORDER BY rowid DESC LIMIT 1")[0].detail, `Đặt lại cho tất cả (${soField} người)`);
  assert.equal((await tuChoi(w, c2, FIELD2)).status, 200, "sau đặt lại tất cả");
});

test("HM-7 (c)(d): Quản trị đổi cài đặt / đặt lại → 403; Bán hàng, Kế toán, HDV → 403 ở cổng admin; xem số lần: Bán hàng/Kế toán/HDV 403, Quản trị 200 doiDuoc false, Toàn quyền 200 doiDuoc true", async () => {
  const w = setup();
  for (const as of [ADM, SALES, ACC, FIELD]) {
    assert.equal((await caiDatRoute(w, as, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15 })).status, 403, `chinh-sach ${as}`);
    assert.equal((await datLai(w, as, { tatCa: true })).status, 403, `dat-lai ${as}`);
  }
  for (const as of [SALES, ACC, FIELD, PARTNER]) assert.equal((await w.call("GET", BASE, { as })).status, 403, `xem ${as}`);
  const qt = await w.call("GET", BASE, { as: ADM });
  assert.equal(qt.status, 200, qt.text);
  assert.equal(qt.json.doiDuoc, false);
  const tq = await w.call("GET", BASE, { as: SUP });
  assert.equal(tq.status, 200);
  assert.equal(tq.json.doiDuoc, true);
  assert.deepEqual(tq.json.caiDat && { cheDo: tq.json.caiDat.cheDo, lienTiep: tq.json.caiDat.lienTiep, moiTuan: tq.json.caiDat.moiTuan }, { cheDo: "MEASURE", lienTiep: 2, moiTuan: 15 }, "dòng gieo");
  assert.deepEqual(tq.json.nguoi.map((n: any) => [n.ten, n.biGioiHan]), [["Bán Hàng Kiêm", false], ["Hướng Dẫn A", true], ["Hướng Dẫn B", true], ["Kế Toán Kiêm", false]]);
  assert.equal(w.q("SELECT count(*) n FROM dsp_refuse_policy")[0].n, 1, "403 không ghi gì");
});

test("HM-7 (e)(f): thân sai → 400; partyId không phải FIELD đang hoạt động → 404; đổi cài đặt ghi đúng 1 refuse_policy_changed «trước → sau»; bảng số lần đúng số", async () => {
  const w = setup();
  for (const body of [{ cheDo: "ON", lienTiep: 2, moiTuan: 15 }, { cheDo: "BLOCK", lienTiep: 0, moiTuan: 15 }, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 15, la: 1 }, null]) {
    const r = await caiDatRoute(w, SUP, body);
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  for (const body of [{ partyId: `pty-${FIELD}`, tatCa: true }, {}, { tatCa: false }, { partyId: 3 }, { partyId: `pty-${FIELD}`, la: 1 }]) assert.equal((await datLai(w, SUP, body)).status, 400, JSON.stringify(body));
  for (const p of [`pty-${SALES}`, `pty-${ADM}`, "pty-khong-co"]) {
    const r = await datLai(w, SUP, { partyId: p });
    assert.equal(r.status, 404, `${p}: ${r.text}`);
    assert.equal(r.json.error.message, "Không tìm thấy hướng dẫn viên.");
  }
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(FIELD2);
  assert.equal((await datLai(w, SUP, { partyId: `pty-${FIELD2}` })).status, 404, "đã ngưng");
  assert.equal(w.q("SELECT count(*) n FROM dsp_release_event WHERE kind_code = 'RESET'")[0].n, 0);

  const ok = await caiDatRoute(w, SUP, { cheDo: "BLOCK", lienTiep: 3, moiTuan: 15 });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual({ ...ok.json.caiDat, tuLuc: undefined }, { cheDo: "BLOCK", lienTiep: 3, moiTuan: 15, tuLuc: undefined });
  const nk = w.q("SELECT staff_id, order_id, target_type, detail FROM audit_log WHERE action = 'refuse_policy_changed'").map((x: any) => ({ ...x }));
  assert.deepEqual(nk, [{ staff_id: SUP, order_id: null, target_type: "system", detail: "Chế độ: Chỉ đo → Chặn; liên tiếp 2 → 3; mỗi tuần 15 → 15" }]);
  // Hai lần lưu liền nhau vẫn tách mốc (valid_from_at duy nhất).
  assert.equal((await caiDatRoute(w, SUP, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 3 })).status, 200);
  assert.equal(w.q("SELECT count(*) n FROM dsp_refuse_policy")[0].n, 3);

  // Bảng số lần: HDV A từ chối 1, huỷ 1.
  assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const k = await donCho(w);
  assert.equal((await nhan(w, k, FIELD)).status, 200);
  assert.equal((await huy(w, k, FIELD)).status, 200);
  const bang = await w.call("GET", BASE, { as: ADM });
  const a = bang.json.nguoi.find((n: any) => n.partyId === `pty-${FIELD}`);
  assert.deepEqual({ ...a, tuChoiCuoi: { ...a.tuChoiCuoi, luc: undefined } }, {
    partyId: `pty-${FIELD}`, ten: "Hướng Dẫn A", biGioiHan: true, tuChoiTuan: 1, huyTuan: 1, chuoi: 1, tuChoiCuoi: { luc: undefined, lyDo: "BAN_LICH" },
  });
  const txt = bang.text;
  assert.ok(!/09000000\d\d|0912345678|Khách Thử/.test(txt), "không SĐT, không tên khách");
});

test("HM-4: Chặn 2/3 bằng route — ba lần Từ chối trong tuần (xen đơn giữ) → lần thứ 4 → 409; REFUSE gieo ở tuần trước không tính", async () => {
  const w = setup();
  assert.equal((await caiDatRoute(w, SUP, { cheDo: "BLOCK", lienTiep: 2, moiTuan: 3 })).status, 200);
  // 15 REFUSE ở TUẦN TRƯỚC (đầu tuần này − 1 ms) — không tính vào tuần này.
  const { dauTuanIso } = await import("../../shared/han-muc-tu-choi.ts");
  const cu = new Date(Date.parse(dauTuanIso(new Date())) - 1).toISOString();
  const giuCu = await donCho(w);
  for (let i = 0; i < 15; i++) {
    w.sqlite.prepare("INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by) SELECT ?, coalesce(max(seq), 0) + 1, ?, ?, 'REFUSE', 'OTHER', ?, ?, NULL, ?, NULL FROM dsp_release_event")
      .run(crypto.randomUUID(), `pty-${FIELD}`, giuCu, cu, cu, cu);
  }
  for (let i = 0; i < 3; i++) {
    const k = await donCho(w);
    assert.equal((await nhan(w, k, FIELD)).status, 200, "đơn giữ xen giữa");
    assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200, `lần ${i + 1}`);
  }
  const k = await donCho(w);
  assert.equal((await nhan(w, k, FIELD)).status, 200);
  const r = (await nhanVaTuChoi(w, FIELD)).r;
  assert.equal(r.status, 409, r.text);
  assert.equal(cham(w)[0].detail, "Liên tiếp 0/2 · tuần 3/3 · Chặn");
});

test("HM-9: HDV đã hết lượt (Chặn) — văn phòng giao đơn cho HDV → 200, đơn thuộc HDV, có ASSIGN", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  await hetLuot(w, FIELD);
  const id = await donCho(w);
  const r = await giao(w, id, ADM, FIELD);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(moDong(w, id), [`pty-${FIELD}`]);
  assert.deepEqual(suKien(w, "order_id = ?", id).map((e: any) => e.kind_code), ["ASSIGN"]);
});

// ---- H8: «còn N lần» (HM-14) + bảng chọn người (HM-10) ----
const conLaiRoute = (w: any, id: string, as: string) => w.call("GET", `/api/orders/${id}/han-muc-tu-choi`, { as });
const tuChoiTruoc = (w: any, id: string, as: string) => w.call("GET", `/api/orders/${id}/tu-choi-truoc`, { as });

test("HM-14: Chặn 2/15, HDV vừa từ chối 1 → «còn» trên đơn đang giữ = {1, 14}; Chỉ đo → null; Bán hàng đang phụ trách → null; HDV không phụ trách → 403; Kế toán → 403", async () => {
  const w = setup();
  datCaiDat(w, "BLOCK");
  assert.equal((await nhanVaTuChoi(w, FIELD)).r.status, 200);
  const id = await donCho(w);
  assert.equal((await nhan(w, id, FIELD)).status, 200);
  const r = await conLaiRoute(w, id, FIELD);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { conLai: { lienTiep: 1, tuan: 14 } });
  assert.equal((await conLaiRoute(w, id, FIELD2)).status, 403, "HDV không phụ trách đơn này");
  assert.equal((await conLaiRoute(w, id, ACC)).status, 403);
  assert.equal((await conLaiRoute(w, "khong-phai-uuid", ACC)).status, 403, "sàng sớm trước 404");
  assert.equal((await conLaiRoute(w, "khong-phai-uuid", FIELD)).status, 404);
  const s = await donCho(w);
  assert.equal((await giao(w, s, ADM, SALES)).status, 200);
  assert.deepEqual((await conLaiRoute(w, s, SALES)).json, { conLai: null }, "không bị giới hạn");
  datCaiDat(w, "MEASURE");
  assert.deepEqual((await conLaiRoute(w, id, FIELD)).json, { conLai: null });
});

test("HM-10: Bán hàng (người lập) mở bảng chọn người của đơn D → thấy lần Từ chối của HDV (BAN_LICH, lúc); đơn E rỗng; HDV, Kế toán → 403; nguồn KHÔNG phải audit_log", async () => {
  const w = setup();
  const { id: d } = await nhanVaTuChoi(w, FIELD);
  const e = await donCho(w);
  const r = await tuChoiTruoc(w, d, SALES);
  assert.equal(r.status, 200, r.text);
  const luc = w.q("SELECT occurred_at FROM dsp_release_event WHERE order_id = ? AND kind_code = 'REFUSE'", d)[0].occurred_at;
  assert.deepEqual(r.json, { tuChoi: { [`pty-${FIELD}`]: { luc, lyDo: "BAN_LICH" } } });
  assert.deepEqual((await tuChoiTruoc(w, e, SALES)).json, { tuChoi: {} });
  assert.equal((await tuChoiTruoc(w, d, FIELD)).status, 403, "HDV không có dispatch.assign");
  assert.equal((await tuChoiTruoc(w, d, ACC)).status, 403);
  assert.equal((await tuChoiTruoc(w, d, ADM)).status, 200);
  // Khoá nguồn: xoá MỌI dòng nhật ký của đơn D (tắt trigger chỉ-thêm của audit_log nếu có) → kết quả không đổi.
  const trig = w.q("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'audit_log'");
  for (const t of trig) w.sqlite.exec(`DROP TRIGGER ${t.name}`);
  w.sqlite.prepare("DELETE FROM audit_log WHERE order_id = ?").run(d);
  assert.deepEqual((await tuChoiTruoc(w, d, SALES)).json, { tuChoi: { [`pty-${FIELD}`]: { luc, lyDo: "BAN_LICH" } } });
  // Từ chối lại lần hai (được giao lại rồi Từ chối, lý do khác) → hiện lần MỚI NHẤT.
  assert.equal((await giao(w, d, ADM, FIELD)).status, 200);
  assert.equal((await tuChoi(w, d, FIELD, "OM_VIEC_RIENG")).status, 200);
  assert.equal((await tuChoiTruoc(w, d, SALES)).json.tuChoi[`pty-${FIELD}`].lyDo, "OM_VIEC_RIENG");
});
