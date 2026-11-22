// Route dấu «Trả sau theo dịch vụ» (ADR-0178 Đ2 mục 1, Đ3; ADR-0230 Đ1 mục 1): GET / POST /api/tra-sau/dich-vu, POST /api/tra-sau/dich-vu/go.
// Chạy CẢ ứng dụng trên khung thử thật (tests/audit/harness.mjs: SQLite với đủ migration, gốc lắp ráp thật nên hàm danh mục tiêm từ src/index.ts được chạy). Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const PT = "66666666-6666-4666-8666-666666666666";
const SM = "77777777-7777-4777-8777-777777777777";
const AT = "2026-10-01T00:00:00.000Z";
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]], [SM, "0900000009", "Quản Lý Bán", ["SALES_MANAGER", "SALES"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  const s = w.sqlite;
  for (const [code, name] of [["T3D", "Tour 3 đảo"], ["HN", "Vé hãng ngoài"], ["KV", "Dịch vụ không vé"]]) {
    s.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 300000, 1, ?, ?)").run(code, name, AT, AT);
  }
  s.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('NTD', 'Nhóm thử vé đảo', 1, 1, ?, ?)").run(AT, AT);
  s.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES ('NTAT', 'Nhóm thử đã tắt', 2, 0, ?, ?)").run(AT, AT);
  // T3D, HN thuộc nhóm NTD; KV chưa phân loại.
  s.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES ('g1', 'T3D', 'NTD', 1, ?, ?, ?)").run(AT, AT, AT);
  s.prepare("INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, updated_at) VALUES ('g2', 'HN', 'NTD', 1, ?, ?, ?)").run(AT, AT, AT);
  // Nhóm NTD «Có vé»; T3D vé Tour Đảo (dòng riêng), HN không dòng nguồn ⇒ vé hãng ngoài.
  s.prepare("INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, updated_at) VALUES ('f1', 'GROUP', 'NTD', 1, ?, ?, ?)").run(AT, AT, AT);
  s.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES ('s1', 'T3D', 'TOUR_DAO', ?, ?, ?)").run(AT, AT, AT);
  return w;
}

const dat = (w: W, as: string, body: Record<string, unknown>) => w.call("POST", "/api/tra-sau/dich-vu", { as, body });
const go = (w: W, as: string, body: Record<string, unknown>) => w.call("POST", "/api/tra-sau/dich-vu/go", { as, body });
const xem = (w: W, as: string) => w.call("GET", "/api/tra-sau/dich-vu", { as });
const ma = (r: { json: any }) => r.json?.error?.code;
const dongMo = (w: W, kind: string, code: string) => w.q("SELECT due_hours, grace_hours FROM bil_service_credit_rule WHERE target_kind = ? AND target_code = ? AND valid_to IS NULL", kind, code);
const tatCa = (w: W, kind: string, code: string) => w.q("SELECT due_hours, valid_to FROM bil_service_credit_rule WHERE target_kind = ? AND target_code = ? ORDER BY rowid", kind, code);
const nhatKy = (w: W, action: string) => w.q("SELECT staff_id, target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY rowid", action);

test("Toàn quyền đặt dấu dịch vụ: 200, một dòng mở, nhật ký service_credit_rule_set chỉ loại đích, mã, số giờ; GET thấy tên và không cảnh báo", async () => {
  const w = setup();
  const r = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 24, gioAnHan: 6 });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => [x.due_hours, x.grace_hours]), [[24, 6]]);
  const nk = nhatKy(w, "service_credit_rule_set");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, SUPER);
  assert.equal(nk[0].detail, "SERVICE T3D: trả 24 giờ, ân hạn 6 giờ");
  const g = await xem(w, SUPER);
  assert.equal(g.status, 200, g.text);
  const d = g.json.dau.find((x: any) => x.targetCode === "T3D");
  assert.equal(d.ten, "Tour 3 đảo");
  assert.equal(d.targetKind, "SERVICE");
  assert.equal(d.gioTra, 24);
  assert.equal(d.gioAnHan, 6);
  assert.equal(typeof d.tuLuc, "string");
  assert.equal(d.canhBao, null);
});

test("đổi giờ: đóng dòng cũ, mở dòng mới — đúng một dòng mở; gửi lại đúng giá trị đang mở: 200 không ghi", async () => {
  const w = setup();
  assert.equal((await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 24, gioAnHan: 6 })).status, 200);
  const r = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 48, gioAnHan: 0 });
  assert.equal(r.status, 200, r.text);
  const ds = tatCa(w, "SERVICE", "T3D");
  assert.equal(ds.length, 2);
  assert.notEqual(ds[0].valid_to, null);
  assert.equal(ds[1].valid_to, null);
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => x.due_hours), [48]);
  const lap = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 48, gioAnHan: 0 });
  assert.equal(lap.status, 200, lap.text);
  assert.equal(tatCa(w, "SERVICE", "T3D").length, 2);
  assert.equal(nhatKy(w, "service_credit_rule_set").length, 2);
});

test("gỡ: đóng dòng mở + nhật ký service_credit_rule_removed; gỡ lần nữa (không còn dấu mở) → 404 không ghi", async () => {
  const w = setup();
  assert.equal((await dat(w, SUPER, { targetKind: "GROUP", targetCode: "NTD", gioTra: 12, gioAnHan: 0 })).status, 200);
  const r = await go(w, SUPER, { targetKind: "GROUP", targetCode: "NTD" });
  assert.equal(r.status, 200, r.text);
  assert.equal(dongMo(w, "GROUP", "NTD").length, 0);
  const nk = nhatKy(w, "service_credit_rule_removed");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].detail, "GROUP NTD");
  const lai = await go(w, SUPER, { targetKind: "GROUP", targetCode: "NTD" });
  assert.deepEqual([lai.status, ma(lai)], [404, "not_found"], lai.text);
  assert.equal(nhatKy(w, "service_credit_rule_removed").length, 1);
  assert.deepEqual((await xem(w, SUPER)).json.dau, []);
});

test("Quản trị, Kế toán xem được nhưng đặt / gỡ → 403; Quản lý bán hàng, Đối tác, Bán hàng xem → 403", async () => {
  const w = setup();
  assert.equal((await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 24, gioAnHan: 0 })).status, 200);
  for (const as of [ADM, KT]) {
    const g = await xem(w, as);
    assert.equal(g.status, 200, g.text);
    assert.equal(g.json.dau.length, 1);
    const d = await dat(w, as, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 12, gioAnHan: 0 });
    assert.deepEqual([d.status, ma(d)], [403, "forbidden"], d.text);
    const x = await go(w, as, { targetKind: "SERVICE", targetCode: "T3D" });
    assert.deepEqual([x.status, ma(x)], [403, "forbidden"], x.text);
  }
  for (const as of [SM, PT, SALES]) {
    const g = await xem(w, as);
    assert.equal(g.status, 403, `${as}: ${g.text}`);
    const d = await dat(w, as, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 12, gioAnHan: 0 });
    assert.equal(d.status, 403, `${as}: ${d.text}`);
  }
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => x.due_hours), [24]);
});

test("giờ ngoài khoảng (trả 0 / 8761, ân hạn -1 / 8761 / số lẻ) → 400 không ghi", async () => {
  const w = setup();
  for (const [gioTra, gioAnHan] of [[0, 0], [8761, 0], [24, -1], [24, 8761], [1.5, 0], ["24", 0]]) {
    const r = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra, gioAnHan });
    assert.deepEqual([r.status, ma(r)], [400, "invalid_input"], `${gioTra}/${gioAnHan}: ${r.text}`);
  }
  assert.equal((await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 8760, gioAnHan: 8760 })).status, 200);
  assert.equal(tatCa(w, "SERVICE", "T3D").length, 1);
});

test("đích không có trong danh mục, nhóm đã tắt, loại đích sai → 400 không ghi", async () => {
  const w = setup();
  for (const body of [
    { targetKind: "SERVICE", targetCode: "KHONGCO", gioTra: 24, gioAnHan: 0 },
    { targetKind: "GROUP", targetCode: "KHONGCO", gioTra: 24, gioAnHan: 0 },
    { targetKind: "GROUP", targetCode: "NTAT", gioTra: 24, gioAnHan: 0 },
    { targetKind: "GROUP", targetCode: "T3D", gioTra: 24, gioAnHan: 0 },
    { targetKind: "KHAC", targetCode: "T3D", gioTra: 24, gioAnHan: 0 },
  ]) {
    const r = await dat(w, SUPER, body);
    assert.deepEqual([r.status, ma(r)], [400, "invalid_input"], `${JSON.stringify(body)}: ${r.text}`);
  }
  assert.equal(Number(w.q("SELECT count(*) AS n FROM bil_service_credit_rule")[0].n), 0);
});

test("cảnh báo: dịch vụ vé hãng ngoài, dịch vụ không «Có vé», nhóm có dịch vụ vé hãng ngoài — dấu vẫn lưu được", async () => {
  const w = setup();
  for (const body of [
    { targetKind: "SERVICE", targetCode: "HN", gioTra: 24, gioAnHan: 0 },
    { targetKind: "SERVICE", targetCode: "KV", gioTra: 24, gioAnHan: 0 },
    { targetKind: "GROUP", targetCode: "NTD", gioTra: 24, gioAnHan: 0 },
  ]) assert.equal((await dat(w, SUPER, body)).status, 200);
  const g = await xem(w, KT);
  assert.equal(g.status, 200, g.text);
  const theo = new Map(g.json.dau.map((x: any) => [`${x.targetKind}:${x.targetCode}`, x]));
  for (const k of ["SERVICE:HN", "SERVICE:KV", "GROUP:NTD"]) {
    const d: any = theo.get(k);
    assert.ok(d, k);
    assert.equal(typeof d.canhBao, "string", k);
    assert.ok(d.canhBao.length > 0, k);
  }
  assert.equal((theo.get("GROUP:NTD") as any).ten, "Nhóm thử vé đảo");
});

// Hai tab: tab kia ghi xen giữa lúc route đọc dòng mở và lúc chạy lô (khung thử `chenTruocLo` chạy SQL ngay trước db.batch của route).
const laLoDau = (stmts: { sql: string }[]) => stmts.some((s) => /bil_service_credit_rule/.test(s.sql));
const tabKiaDoi = (w: W, gio: number) => () => {
  const at = new Date().toISOString();
  w.sqlite.prepare("UPDATE bil_service_credit_rule SET valid_to = ?, updated_at = ?, updated_by = ? WHERE target_kind = 'SERVICE' AND target_code = 'T3D' AND valid_to IS NULL").run(at, at, SUPER);
  w.sqlite.prepare("INSERT INTO bil_service_credit_rule (id, target_kind, target_code, due_hours, grace_hours, valid_from, created_at, created_by, updated_at, updated_by) VALUES (?, 'SERVICE', 'T3D', ?, 0, ?, ?, ?, ?, ?)")
    .run(`tab-kia-${gio}`, gio, at, at, SUPER, at, SUPER);
};

test("hai tab đổi cùng lúc: tab thua (dòng mở đã bị tab kia đóng và mở lại) → 409 stale, giữ dòng của tab kia, không thêm nhật ký", async () => {
  const w = setup();
  assert.equal((await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 24, gioAnHan: 0 })).status, 200);
  w.chenTruocLo(laLoDau, tabKiaDoi(w, 36));
  const r = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 48, gioAnHan: 0 });
  assert.deepEqual([r.status, ma(r)], [409, "stale"], r.text);
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => x.due_hours), [36]);
  assert.equal(nhatKy(w, "service_credit_rule_set").length, 1);
});

test("hai tab cùng đặt lần đầu (chưa có dòng mở): tab thua va chỉ mục một dòng mở → 409 stale", async () => {
  const w = setup();
  w.chenTruocLo(laLoDau, tabKiaDoi(w, 36));
  const r = await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 48, gioAnHan: 0 });
  assert.deepEqual([r.status, ma(r)], [409, "stale"], r.text);
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => x.due_hours), [36]);
  assert.equal(nhatKy(w, "service_credit_rule_set").length, 0);
});

test("gỡ khi tab kia vừa đổi (dòng đã đọc bị đóng) → 409 stale, dòng mới của tab kia còn mở, không ghi nhật ký gỡ", async () => {
  const w = setup();
  assert.equal((await dat(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D", gioTra: 24, gioAnHan: 0 })).status, 200);
  w.chenTruocLo(laLoDau, tabKiaDoi(w, 36));
  const r = await go(w, SUPER, { targetKind: "SERVICE", targetCode: "T3D" });
  assert.deepEqual([r.status, ma(r)], [409, "stale"], r.text);
  assert.deepEqual(dongMo(w, "SERVICE", "T3D").map((x: any) => x.due_hours), [36]);
  assert.equal(nhatKy(w, "service_credit_rule_removed").length, 0);
});
