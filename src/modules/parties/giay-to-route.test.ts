// Route giấy tờ của người (ADR-0040 D2; Ruling R4, R5, R8, R15 của điều phối) — chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua
// tests/audit/harness.mjs. Mọi ca từ chối khẳng định ĐÚNG MÃ và ĐÚNG CÂU (403 của cổng khác 403 của ô trong thân): lớp CSDL cũng chặn nên "không 2xx"
// chung chung sẽ che một lỗ ở route (Review Focus 1 của kế hoạch). Số giấy tờ ở đây là số GIẢ; mọi thân trả về (trừ "xem đủ số") không được chứa số.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "55555555-5555-4555-8555-555555555555";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "22222222-2222-4222-8222-222222222222";
const PARTNER = "44444444-4444-4444-8444-444444444444";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const pty = (id: string) => `pty-${id}`;
const SO_CCCD = "079123456789"; // số GIẢ
const SO_GPLX = "790000000001"; // số GIẢ
const AT = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000002", name: "Hướng dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000004", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  return w;
}
let n = 0;
/** Gieo một dòng giấy tờ THẲNG bằng SQL (route ghi thử ở các task sau). `so` là số GIẢ; number_key = số chuẩn hoá. */
function gieo(w: any, o: { party: string; type: string; so?: string; cls?: string; het?: string | null; noi?: string; truoc?: string; huy?: boolean }): string {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const key = o.so ? o.so.toUpperCase().replace(/[\s.\-/]/g, "") : null;
  w.sqlite
    .prepare(
      `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_date, issued_place, expiry_date,
         previous_id, voided_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, o.party, o.type, o.so ?? null, key, o.cls ?? null, o.noi ?? null, o.het ?? null, o.truoc ?? null, o.huy ? AT : null, AT, AT);
  return id;
}
/** Tài xế: CCCD (hạn xa), GPLX hạng D2 đã gia hạn (dòng cũ + dòng mới), khám sức khoẻ không hạn, một dòng tập huấn đã huỷ. */
function gieoTaiXe(w: any) {
  const cccd = gieo(w, { party: pty(DRIVER), type: "CCCD", so: SO_CCCD, het: "2037-03-12", noi: "Cục Cảnh sát" });
  const gplxCu = gieo(w, { party: pty(DRIVER), type: "GPLX", so: SO_GPLX, cls: "D2", het: "2026-01-05" });
  const gplx = gieo(w, { party: pty(DRIVER), type: "GPLX", so: SO_GPLX, cls: "D2", het: "2026-11-05", truoc: gplxCu });
  const suckhoe = gieo(w, { party: pty(DRIVER), type: "HEALTH_CHECK", het: null });
  const huy = gieo(w, { party: pty(DRIVER), type: "TRANSPORT_TRAINING", het: "2026-10-01", huy: true });
  return { cccd, gplxCu, gplx, suckhoe, huy };
}
/** Thân trả về không được chứa số đầy đủ (kể cả phần giữa), không có khoá số thô. */
function khongLoSo(r: { text: string }, label: string) {
  for (const so of [SO_CCCD, "123456789", SO_GPLX, "900000000"]) assert.ok(!r.text.includes(so), `${label}: lộ số ${so}`);
  for (const k of ["document_number", "number_key", "documentNumber", "numberKey"]) assert.ok(!r.text.includes(k), `${label}: lộ khoá ${k}`);
}
const CAU_CONG_OFFICE = /chỉ dùng cho việc được giao/;
const CAU_O_GIAY_TO = /giấy tờ của người khác/;

// ---- Route 1: GET /api/parties/documents/mine (Ruling R4, R5; R15 điểm 6) ---------------------------------------------------------------------------------

test("route 1 (R4, R5): tài xế xem giấy tờ của CHÍNH MÌNH — chỉ dòng hiện hành, số che, xếp ngày hết hạn tăng dần (không hạn cuối) — R15 điểm 6", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  const r = await w.call("GET", "/api/parties/documents/mine", { as: DRIVER });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.documents.map((d: any) => d.id), [g.gplx, g.cccd, g.suckhoe], "chỉ dòng hiện hành; GPLX (2026-11-05) → CCCD (2037) → không hạn");
  const cccd = r.json.documents.find((d: any) => d.typeCode === "CCCD");
  assert.equal(cccd.maskedNumber, "••••6789");
  assert.equal(cccd.typeName, "Căn cước công dân (CCCD)");
  assert.equal(cccd.current, true);
  const gplx = r.json.documents.find((d: any) => d.typeCode === "GPLX");
  assert.deepEqual([gplx.classCode, gplx.className, gplx.previousId, gplx.maskedNumber], ["D2", "Hạng D2", g.gplxCu, "••••0001"]);
  assert.equal(typeof gplx.daysLeft, "number");
  assert.equal(r.json.documents.find((d: any) => d.typeCode === "HEALTH_CHECK").daysLeft, null, "không hạn");
  assert.deepEqual(Object.keys(cccd).sort(), ["classCode", "className", "current", "daysLeft", "expiryDate", "id", "issuedDate", "issuedPlace", "maskedNumber", "previousId", "typeCode", "typeName", "updatedAt", "voided"]);
  khongLoSo(r, "route 1 tài xế");
});

test("route 1 (R5 'Mọi nhân viên'): mọi tài khoản nội bộ → 200 (chỉ của mình); Đối tác → 403 ĐÚNG MÃ (R4); tài khoản không có hồ sơ → 200 rỗng", async () => {
  const w = setup();
  gieoTaiXe(w);
  for (const as of [SALES, ACC, ADM, SUP, FIELD]) {
    const r = await w.call("GET", "/api/parties/documents/mine", { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(r.json.documents, [], `${as}: chỉ giấy tờ của chính mình (tài khoản này không có giấy tờ)`);
  }
  const r = await w.call("GET", "/api/parties/documents/mine", { as: PARTNER });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "forbidden");
  const KHONG_HO_SO = "88888888-8888-4888-8888-888888888888";
  w.sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${KHONG_HO_SO}', '', '0900000008', 'x', 'sales', 1, '${AT}', NULL)`);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${KHONG_HO_SO}-D', '${KHONG_HO_SO}', 'DRIVER', '${AT}', '${AT}', '${AT}')`);
  const khong = await w.call("GET", "/api/parties/documents/mine", { as: KHONG_HO_SO });
  assert.equal(khong.status, 200, khong.text);
  assert.deepEqual(khong.json.documents, []);
});

// ---- Route 3: GET /api/parties/:id/documents (người ghi giấy tờ xem danh sách của người khác, số che) -------------------------------------------------------

test("route 3: Bán hàng, Kế toán → 403 ĐÚNG câu của ô (party.view KHÔNG mở giấy tờ); Hướng dẫn viên, tài xế, Đối tác → 403 ở cổng office", async () => {
  const w = setup();
  gieoTaiXe(w);
  for (const as of [SALES, ACC]) {
    const r = await w.call("GET", `/api/parties/${pty(DRIVER)}/documents`, { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
    assert.match(r.json.error.message, CAU_O_GIAY_TO, `${as}: 403 của ô trong thân, không phải của cổng`);
    khongLoSo(r, `route 3 ${as}`);
  }
  for (const as of [FIELD, DRIVER, PARTNER]) {
    const r = await w.call("GET", `/api/parties/${pty(DRIVER)}/documents`, { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.match(r.json.error.message, CAU_CONG_OFFICE, `${as}: chặn ở cổng office`);
  }
});

test("route 3: Quản trị, Toàn quyền → 200 đủ dòng (kể cả lịch sử và dòng đã huỷ), hiện hành trước theo ngày hết hạn; số che; id lạ → 404; hồ sơ tổ chức → 200 rỗng", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  for (const as of [ADM, SUP]) {
    const r = await w.call("GET", `/api/parties/${pty(DRIVER)}/documents`, { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    const ids = r.json.documents.map((d: any) => d.id);
    assert.deepEqual(ids.slice(0, 3), [g.gplx, g.cccd, g.suckhoe], "dòng hiện hành trước, ngày hết hạn tăng dần, không hạn cuối");
    assert.deepEqual(new Set(ids.slice(3)), new Set([g.gplxCu, g.huy]), "dòng lịch sử (đã thay, đã huỷ) sau");
    const cu = r.json.documents.find((d: any) => d.id === g.gplxCu);
    assert.deepEqual([cu.current, cu.voided], [false, false]);
    const huy = r.json.documents.find((d: any) => d.id === g.huy);
    assert.deepEqual([huy.current, huy.voided], [false, true]);
    assert.equal(r.json.documents.find((d: any) => d.id === g.cccd).issuedPlace, "Cục Cảnh sát", "nơi cấp hiện ở danh sách (không phải số), nhưng không bao giờ ở nhật ký");
    khongLoSo(r, `route 3 ${as}`);
  }
  const la = await w.call("GET", "/api/parties/99999999-9999-4999-8999-999999999999/documents", { as: ADM });
  assert.equal(la.status, 404, la.text);
  const org = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Tổ chức Thử" } });
  assert.equal(org.status, 201, org.text);
  const r = await w.call("GET", `/api/parties/${org.json.party.id}/documents`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.documents, []);
});

// ---- Route 2: GET /api/parties/documents/meta ------------------------------------------------------------------------------------------------------------------

test("route 2: Quản trị → 200, 4 loại giấy tờ của người + 8 hạng; Bán hàng → 403 ĐÚNG câu của ô; tài xế → 403 ở cổng", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/parties/documents/meta", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.types.map((t: any) => t.code), ["CCCD", "GPLX", "HEALTH_CHECK", "TRANSPORT_TRAINING"]);
  assert.deepEqual(r.json.types[0], { code: "CCCD", name: "Căn cước công dân (CCCD)", hasExpiry: true, sortOrder: 1, active: true, updatedAt: "2026-09-28T00:00:00.000Z" });
  assert.deepEqual(r.json.classes.map((c: any) => c.code), ["B", "D1", "D2", "D", "B2_OLD", "C_OLD", "D_OLD", "E_OLD"]);
  const s = await w.call("GET", "/api/parties/documents/meta", { as: SALES });
  assert.equal(s.status, 403, s.text);
  assert.match(s.json.error.message, CAU_O_GIAY_TO);
  const d = await w.call("GET", "/api/parties/documents/meta", { as: DRIVER });
  assert.equal(d.status, 403, d.text);
  assert.match(d.json.error.message, CAU_CONG_OFFICE);
});
