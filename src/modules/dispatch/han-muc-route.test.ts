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
