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

// ---- Route 4–6: ghi giấy tờ của người — thêm, gia hạn (dòng mới), sửa sai có lý do, huỷ dòng nhập nhầm (Task A8; Ruling R8 = luật cấp bậc) ----------------------
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;
const soGiayTo = (w: any): number => w.q("SELECT count(*) n FROM pty_person_document")[0].n;
const nhatKyCuoi = (w: any, action: string) => w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1", action)[0];
const them = (w: any, as: string, party: string, body: unknown) => w.call("POST", `/api/parties/${party}/documents`, { as, body });
const giaHan = (w: any, as: string, party: string, did: string, body: unknown = {}) => w.call("POST", `/api/parties/${party}/documents/${did}/renew`, { as, body });
const suaSai = (w: any, as: string, party: string, did: string, body: unknown) => w.call("POST", `/api/parties/${party}/documents/${did}/correct`, { as, body });
const dong = (w: any, did: string) => w.q("SELECT * FROM pty_person_document WHERE id = ?", did)[0];
async function hoSoKhac(w: any, name = "Người Khác"): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: name, contacts: [] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
/** Không chữ số nào của số (≥ 4 chữ số liền) trong câu/chi tiết. */
const khongSo = (s: string, label: string) => assert.doesNotMatch(s, /\d{4,}/, `${label}: ${s}`);

test("route 4–6 quyền: Bán hàng, Kế toán → 403 ĐÚNG câu của ô, không ghi, không nhật ký; Hướng dẫn viên, tài xế → 403 ở cổng office", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  // Hồ sơ KHÔNG gắn tài khoản: luật cấp bậc không chặn ở đây, nên chỉ lời hỏi ô party.document.write mới chặn được Bán hàng/Kế toán (phép đột biến
  // bỏ lời hỏi ô phải đỏ — trên hồ sơ gắn tài khoản, luật cấp bậc cũng trả 403 cùng câu và sẽ che lỗ).
  const kTk = await hoSoKhac(w, "Người Không Tài Khoản");
  const kTkDoc = gieo(w, { party: kTk, type: "HEALTH_CHECK", het: "2027-01-01" });
  const [n0, g0] = [soNhatKy(w), soGiayTo(w)];
  for (const as of [SALES, ACC]) {
    for (const [ten, goi] of [
      ["thêm (hồ sơ có tài khoản)", () => them(w, as, pty(DRIVER), { typeCode: "HEALTH_CHECK" })],
      ["gia hạn (hồ sơ có tài khoản)", () => giaHan(w, as, pty(DRIVER), g.gplx, { expiryDate: "2031-01-01" })],
      ["sửa sai (hồ sơ có tài khoản)", () => suaSai(w, as, pty(DRIVER), g.cccd, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: AT })],
      ["thêm (hồ sơ không tài khoản)", () => them(w, as, kTk, { typeCode: "HEALTH_CHECK" })],
      ["gia hạn (hồ sơ không tài khoản)", () => giaHan(w, as, kTk, kTkDoc, { expiryDate: "2031-01-01" })],
      ["sửa sai (hồ sơ không tài khoản)", () => suaSai(w, as, kTk, kTkDoc, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: AT })],
    ] as const) {
      const r = await goi();
      assert.equal(r.status, 403, `${as} ${ten}: ${r.text}`);
      assert.match(r.json.error.message, CAU_O_GIAY_TO, `${as} ${ten}`);
    }
  }
  for (const as of [FIELD, DRIVER]) {
    const r = await them(w, as, pty(DRIVER), { typeCode: "HEALTH_CHECK" });
    assert.equal(r.status, 403, r.text);
    assert.match(r.json.error.message, CAU_CONG_OFFICE);
  }
  assert.deepEqual([soNhatKy(w), soGiayTo(w)], [n0, g0], "không ghi gì, không nhật ký");
});

test("route 4 thêm: Quản trị thêm CCCD → 201, danh sách mới số che; nhật ký party_document_added không có số; CCCD trùng người khác → 409 cccd_taken, câu không số", async () => {
  const w = setup();
  const r = await them(w, ADM, pty(DRIVER), { typeCode: "CCCD", number: "079 123 456 789", issuedDate: "2021-01-01", issuedPlace: "Cục Cảnh sát", expiryDate: "2030-01-01" });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.documents.map((d: any) => [d.typeCode, d.maskedNumber, d.current]), [["CCCD", "••••6789", true]]);
  khongLoSo(r, "thân 201");
  const nk = nhatKyCuoi(w, "party_document_added");
  assert.deepEqual({ ...nk }, { target_type: "party", target_id: pty(DRIVER), detail: "Căn cước công dân (CCCD), hết hạn 2030-01-01" });
  const khac = await hoSoKhac(w);
  const g0 = soGiayTo(w);
  const t = await them(w, ADM, khac, { typeCode: "CCCD", number: SO_CCCD, expiryDate: "2031-01-01" });
  assert.equal(t.status, 409, t.text);
  assert.equal(t.json.error.code, "cccd_taken");
  khongSo(t.json.error.message, "câu báo trùng");
  khongLoSo(t, "thân 409");
  assert.equal(soGiayTo(w), g0, "không dòng mới");
});

test("route 4 đầu vào sai → 400: CCCD 11 số, GPLX thiếu hạng, khám sức khoẻ kèm hạng, loại lạ, loại không hạn kèm ngày hết hạn, loại đã ngưng, hồ sơ tổ chức", async () => {
  const w = setup();
  w.sqlite.exec(`INSERT INTO pty_person_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES ('KHONG_HAN_THU', 'Loại không hạn (thử)', 0, 9, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person_document_type (code, name, has_expiry, sort_order, active, created_at, updated_at) VALUES ('DA_NGUNG_THU', 'Loại đã ngưng (thử)', 1, 10, 0, '${AT}', '${AT}')`);
  const g0 = soGiayTo(w);
  for (const [ten, body] of [
    ["CCCD 11 số", { typeCode: "CCCD", number: "07912345678" }],
    ["GPLX thiếu hạng", { typeCode: "GPLX", number: SO_GPLX }],
    ["khám sức khoẻ kèm hạng", { typeCode: "HEALTH_CHECK", classCode: "B" }],
    ["loại lạ", { typeCode: "KHONG_CO" }],
    ["không hạn kèm ngày hết hạn", { typeCode: "KHONG_HAN_THU", expiryDate: "2030-01-01" }],
    ["loại đã ngưng", { typeCode: "DA_NGUNG_THU" }],
  ] as const) {
    const r = await them(w, ADM, pty(DRIVER), body);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", ten);
    khongLoSo(r, ten);
  }
  const org = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Tổ chức Thử" } });
  const o = await them(w, ADM, org.json.party.id, { typeCode: "HEALTH_CHECK" });
  assert.equal(o.status, 400, `hồ sơ tổ chức: ${o.text}`);
  assert.equal(soGiayTo(w), g0);
});

test("route 5 gia hạn: KHÔNG gửi số → 201, dòng mới mang số cũ (SQL), dòng cũ thành lịch sử; nhật ký party_document_renewed không số; gia hạn dòng cũ lần nữa → 409 document_not_current", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  const r = await giaHan(w, ADM, pty(DRIVER), g.gplx, { issuedDate: "2026-09-20", expiryDate: "2036-09-20" });
  assert.equal(r.status, 201, r.text);
  khongLoSo(r, "thân gia hạn");
  const moi = r.json.documents.find((d: any) => d.previousId === g.gplx);
  assert.ok(moi && moi.current, "có dòng mới hiện hành nối dòng cũ");
  assert.equal(r.json.documents.find((d: any) => d.id === g.gplx).current, false, "dòng cũ thành lịch sử");
  assert.deepEqual([dong(w, moi.id).number_key, dong(w, moi.id).document_number, dong(w, moi.id).license_class_code], [SO_GPLX, SO_GPLX, "D2"], "chép số + hạng dòng trước");
  const nk = nhatKyCuoi(w, "party_document_renewed");
  assert.equal(nk.detail, "Giấy phép lái xe hạng D2: gia hạn, hết hạn 2026-11-05 → 2036-09-20");
  khongSo(nk.detail.replace(/\d{4}-\d{2}-\d{2}/g, ""), "nhật ký gia hạn");
  for (const cu of [g.gplx, g.gplxCu]) {
    const x = await giaHan(w, ADM, pty(DRIVER), cu, { expiryDate: "2040-01-01" });
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "document_not_current", "lớp route (không phải lớp CSDL document_changed)");
  }
  const la = await giaHan(w, ADM, pty(DRIVER), "99999999-9999-4999-8999-999999999999", {});
  assert.equal(la.status, 404, la.text);
  const nguoiKhac = await giaHan(w, ADM, pty(SALES), g.cccd, {});
  assert.equal(nguoiKhac.status, 404, `giấy tờ của hồ sơ khác: ${nguoiKhac.text}`);
});

test("route 6 sửa sai: dòng cũ → 409 document_not_current; ngày hết hạn → 200 + nhật ký trước→sau; số → nhật ký chỉ 'Nhập sai số'; số của người khác → 409 cccd_taken; mốc cũ → 409 stale", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  let r = await suaSai(w, ADM, pty(DRIVER), g.gplxCu, { reason: "SAI_NGAY_HET_HAN", value: "2026-02-05", expectedUpdatedAt: AT });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "document_not_current");
  r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "SAI_NGAY_HET_HAN", value: "2038-03-12", expectedUpdatedAt: AT });
  assert.equal(r.status, 200, r.text);
  assert.equal(nhatKyCuoi(w, "party_document_corrected").detail, "Căn cước công dân (CCCD): Nhập sai ngày hết hạn (2037-03-12 → 2038-03-12)");
  const moc = dong(w, g.cccd).updated_at;
  r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "SAI_SO", value: "079 123 456 780", expectedUpdatedAt: moc });
  assert.equal(r.status, 200, r.text);
  khongLoSo(r, "thân sửa số");
  assert.equal(dong(w, g.cccd).number_key, "079123456780");
  assert.equal(nhatKyCuoi(w, "party_document_corrected").detail, "Căn cước công dân (CCCD): Nhập sai số");
  // Người khác giữ số 079000000001; sửa số của tài xế thành số đó → 409 cccd_taken, không đổi.
  const khac = await hoSoKhac(w);
  assert.equal((await them(w, ADM, khac, { typeCode: "CCCD", number: "079000000001" })).status, 201);
  const moc2 = dong(w, g.cccd).updated_at;
  r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "SAI_SO", value: "079000000001", expectedUpdatedAt: moc2 });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "cccd_taken");
  khongSo(r.json.error.message, "câu báo");
  assert.equal(dong(w, g.cccd).number_key, "079123456780");
  r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "SAI_NGAY_CAP", value: "2021-01-01", expectedUpdatedAt: AT });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale", "mốc cũ");
  r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "SAI_SO", value: "079 123 456 780", expectedUpdatedAt: dong(w, g.cccd).updated_at });
  assert.equal(r.status, 400, `giá trị không đổi: ${r.text}`);
  // Mọi dòng nhật ký giấy tờ: không chứa chữ số của các số đã dùng.
  for (const x of w.q("SELECT detail FROM audit_log WHERE action LIKE 'party_document_%'")) khongSo(String(x.detail).replace(/\d{4}-\d{2}-\d{2}/g, ""), "nhật ký");
});

test("route 6 'Nhập nhầm cả dòng' → 200: dòng bị huỷ (voided), vẫn còn trong danh sách; số CCCD của dòng đó rảnh cho người khác", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  const truoc = soGiayTo(w);
  const r = await suaSai(w, ADM, pty(DRIVER), g.cccd, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: AT });
  assert.equal(r.status, 200, r.text);
  const d = r.json.documents.find((x: any) => x.id === g.cccd);
  assert.deepEqual([d.voided, d.current], [true, false]);
  assert.equal(nhatKyCuoi(w, "party_document_corrected").detail, "Căn cước công dân (CCCD): Nhập nhầm cả dòng (huỷ dòng này)");
  assert.equal(soGiayTo(w), truoc, "không xoá dòng nào");
  const khac = await hoSoKhac(w);
  const t = await them(w, ADM, khac, { typeCode: "CCCD", number: SO_CCCD });
  assert.equal(t.status, 201, `số đã rảnh: ${t.text}`);
});

test("R8 (Q1): Quản trị ghi giấy tờ cho hồ sơ gắn tài khoản Quản trị khác hoặc Toàn quyền → 403; Toàn quyền ghi cho chính mình → 201; Quản trị ghi cho hồ sơ không tài khoản → 201", async () => {
  const w = setup();
  const ADM2 = "99999999-9999-4999-8999-999999999990";
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000009", name: "Quản trị Hai", perms: ["ADMIN"] });
  const n0 = soNhatKy(w);
  for (const tren of [SUP, ADM2]) {
    const r = await them(w, ADM, pty(tren), { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" });
    assert.equal(r.status, 403, `${tren}: ${r.text}`);
    assert.match(r.json.error.message, CAU_O_GIAY_TO);
  }
  assert.equal(soNhatKy(w), n0);
  assert.equal((await them(w, SUP, pty(SUP), { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" })).status, 201, "Toàn quyền ghi cho chính mình");
  assert.equal((await them(w, ADM, pty(ADM), { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" })).status, 201, "Quản trị ghi cho chính mình");
  const khac = await hoSoKhac(w);
  assert.equal((await them(w, ADM, khac, { typeCode: "HEALTH_CHECK", expiryDate: "2027-01-01" })).status, 201, "hồ sơ không tài khoản");
  const g = gieo(w, { party: pty(SUP), type: "HEALTH_CHECK", het: "2028-01-01" });
  assert.equal((await giaHan(w, ADM, pty(SUP), g, { expiryDate: "2029-01-01" })).status, 403, "gia hạn trên cấp trên");
  assert.equal((await suaSai(w, ADM, pty(SUP), g, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: AT })).status, 403, "sửa sai trên cấp trên");
});

// ---- Route 7: "xem đủ số" (ô party.document.reveal) — ghi nhật ký TRƯỚC rồi mới trả số; nhật ký không kèm số (Task A9; R15 điểm 5) ------------------------
const xemSo = (w: any, as: string, party: string, did: string) => w.call("POST", `/api/parties/${party}/documents/${did}/reveal`, { as });
const soDongXem = (w: any): number => w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_document_number_viewed'")[0].n;

test("route 7: Bán hàng, Kế toán → 403 ĐÚNG câu, không dòng nhật ký (cả hồ sơ không tài khoản); Hướng dẫn viên, tài xế → 403 ở cổng", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  const kTk = await hoSoKhac(w, "Người Không Tài Khoản");
  const kTkDoc = gieo(w, { party: kTk, type: "CCCD", so: "079000000002", het: "2030-01-01" });
  const n0 = soNhatKy(w);
  for (const as of [SALES, ACC]) {
    for (const [party, did] of [[pty(DRIVER), g.cccd], [kTk, kTkDoc]] as const) {
      const r = await xemSo(w, as, party, did);
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.match(r.json.error.message, /xem đủ số/, `${as}: 403 của ô trong thân`);
      khongLoSo(r, `${as} xem số`);
      assert.ok(!r.text.includes("079000000002"));
    }
  }
  for (const as of [FIELD, DRIVER]) {
    const r = await xemSo(w, as, pty(DRIVER), g.cccd);
    assert.equal(r.status, 403, r.text);
    assert.match(r.json.error.message, CAU_CONG_OFFICE);
  }
  assert.equal(soNhatKy(w), n0, "không dòng nhật ký nào");
});

test("route 7: Quản trị, Toàn quyền → 200 { number } ĐÚNG số và ĐÚNG MỘT dòng nhật ký party_document_number_viewed (đối tượng = hồ sơ, chi tiết = tên loại, không số)", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  for (const as of [ADM, SUP]) {
    const truoc = soDongXem(w);
    const r = await xemSo(w, as, pty(DRIVER), g.cccd);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(r.json, { number: SO_CCCD });
    assert.equal(soDongXem(w), truoc + 1, `${as}: đúng một dòng nhật ký`);
    const nk = w.q("SELECT staff_id, target_type, target_id, detail FROM audit_log WHERE action = 'party_document_number_viewed' ORDER BY rowid DESC LIMIT 1")[0];
    assert.deepEqual({ ...nk }, { staff_id: as, target_type: "party", target_id: pty(DRIVER), detail: "Căn cước công dân (CCCD)" });
  }
  const gplx = await xemSo(w, ADM, pty(DRIVER), g.gplx);
  assert.deepEqual(gplx.json, { number: SO_GPLX });
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'party_document_number_viewed' ORDER BY rowid DESC LIMIT 1")[0].detail, "Giấy phép lái xe");
  for (const x of w.q("SELECT detail FROM audit_log WHERE action = 'party_document_number_viewed'")) assert.doesNotMatch(String(x.detail), /\d/, "chi tiết không có chữ số");
});

test("route 7: giấy tờ của hồ sơ khác → 404; giấy không có số → 409 no_number; Quản trị xem số trên hồ sơ gắn tài khoản Toàn quyền → 403 (R8), không nhật ký", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  const n0 = soNhatKy(w);
  assert.equal((await xemSo(w, ADM, pty(SALES), g.cccd)).status, 404, "did thuộc hồ sơ khác");
  const r = await xemSo(w, ADM, pty(DRIVER), g.suckhoe);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "no_number");
  const sup = gieo(w, { party: pty(SUP), type: "CCCD", so: "079000000003", het: "2030-01-01" });
  const t = await xemSo(w, ADM, pty(SUP), sup);
  assert.equal(t.status, 403, t.text);
  assert.ok(!t.text.includes("079000000003"));
  assert.equal(soNhatKy(w), n0, "không dòng nhật ký nào");
  assert.equal((await xemSo(w, SUP, pty(SUP), sup)).status, 200, "Toàn quyền xem số của chính mình");
});

test("route 7: ghi nhật ký LỖI thì KHÔNG trả số (ghi trước, trả sau)", async () => {
  const w = setup();
  const g = gieoTaiXe(w);
  w.sqlite.exec("ALTER TABLE audit_log RENAME TO audit_log_tam");
  try {
    const r = await xemSo(w, ADM, pty(DRIVER), g.cccd);
    assert.equal(r.status, 500, r.text);
    khongLoSo(r, "thân 500");
  } finally {
    w.sqlite.exec("ALTER TABLE audit_log_tam RENAME TO audit_log");
  }
});

// ---- Route 8–11: danh mục loại giấy tờ của người + hạng GPLX (ô admin.manage; khuôn loc_location: dấu vết, active, khoá lạc quan, nhật ký cùng lô — R7) ----
const loaiMoi = (w: any, as: string, body: unknown) => w.call("POST", "/api/parties/document-types", { as, body });
const suaLoai = (w: any, as: string, code: string, body: unknown) => w.call("PUT", `/api/parties/document-types/${code}`, { as, body });
const hangMoi = (w: any, as: string, body: unknown) => w.call("POST", "/api/parties/license-classes", { as, body });
const suaHang = (w: any, as: string, code: string, body: unknown) => w.call("PUT", `/api/parties/license-classes/${code}`, { as, body });
const mocLoai = (w: any, code: string): string => w.q("SELECT updated_at FROM pty_person_document_type WHERE code = ?", code)[0].updated_at;
const mocHang = (w: any, code: string): string => w.q("SELECT updated_at FROM pty_license_class WHERE code = ?", code)[0].updated_at;
const doiMiliGiay = () => new Promise((r) => setTimeout(r, 5));
const nhatKyDanhMuc = (w: any): string[] => w.q("SELECT detail FROM audit_log WHERE action = 'party_document_catalog_changed' ORDER BY rowid").map((r: any) => r.detail);

test("route 8–11 quyền: Bán hàng, Kế toán, Hướng dẫn viên, tài xế → 403 ở cổng quản trị; không ghi, không nhật ký", async () => {
  const w = setup();
  const n0 = soNhatKy(w);
  for (const as of [SALES, ACC, FIELD, DRIVER]) {
    for (const r of [
      await loaiMoi(w, as, { code: "THE_HDV", name: "Thẻ hướng dẫn viên" }),
      await suaLoai(w, as, "HEALTH_CHECK", { name: "Khám", hasExpiry: true, sortOrder: 3, active: false, expectedUpdatedAt: mocLoai(w, "HEALTH_CHECK") }),
      await hangMoi(w, as, { code: "C1", name: "Hạng C1" }),
      await suaHang(w, as, "B", { name: "Hạng B", sortOrder: 1, active: false, expectedUpdatedAt: mocHang(w, "B") }),
    ]) {
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.match(r.json.error.message, /Chỉ quản trị viên/);
    }
  }
  assert.equal(soNhatKy(w), n0);
  assert.equal(w.q("SELECT count(*) n FROM pty_person_document_type")[0].n, 4);
});

test("route 8, 9 loại giấy tờ: thêm → 201 (mã trùng 409 code_taken, mã sai khuôn 400); sửa có mốc → 200, mốc cũ → 409 stale; nhật ký 'loại giấy tờ: <mã> — <tên>'", async () => {
  const w = setup();
  let r = await loaiMoi(w, ADM, { code: "THE_HDV", name: "Thẻ hướng dẫn viên", hasExpiry: true, sortOrder: 5 });
  assert.equal(r.status, 201, r.text);
  assert.ok(r.json.types.some((t: any) => t.code === "THE_HDV" && t.name === "Thẻ hướng dẫn viên" && t.hasExpiry && t.active && t.sortOrder === 5));
  assert.equal(w.q("SELECT created_by FROM pty_person_document_type WHERE code = 'THE_HDV'")[0].created_by, ADM, "dấu vết người tạo");
  r = await loaiMoi(w, ADM, { code: "THE_HDV", name: "Trùng" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "code_taken");
  assert.equal((await loaiMoi(w, ADM, { code: "the hdv", name: "Sai" })).status, 400);
  const moc = mocLoai(w, "THE_HDV");
  await doiMiliGiay(); // khoá lạc quan so mốc theo mili-giây: lần sửa đầu phải mang mốc KHÁC mốc tạo
  r = await suaLoai(w, ADM, "THE_HDV", { name: "Thẻ HDV", hasExpiry: true, sortOrder: 6, active: true, expectedUpdatedAt: moc });
  assert.equal(r.status, 200, r.text);
  r = await suaLoai(w, ADM, "THE_HDV", { name: "Thẻ HDV cũ", hasExpiry: true, sortOrder: 6, active: true, expectedUpdatedAt: moc });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal((await suaLoai(w, ADM, "KHONG_CO", { name: "x", hasExpiry: true, sortOrder: 0, active: true, expectedUpdatedAt: moc })).status, 404);
  assert.deepEqual(nhatKyDanhMuc(w), ["loại giấy tờ: THE_HDV — Thẻ hướng dẫn viên", "loại giấy tờ: THE_HDV — Thẻ HDV"], "một dòng mỗi lần ghi thật (không dòng cho 409)");
});

test("route 9: ngưng CCCD / GPLX → 409 fixed_type (hệ thống cần dùng), không đổi; ngưng Khám sức khoẻ → 200, rồi thêm giấy tờ loại đó → 400", async () => {
  const w = setup();
  for (const code of ["CCCD", "GPLX"]) {
    const r = await suaLoai(w, SUP, code, { name: "Tên", hasExpiry: true, sortOrder: 1, active: false, expectedUpdatedAt: mocLoai(w, code) });
    assert.equal(r.status, 409, `${code}: ${r.text}`);
    assert.equal(r.json.error.code, "fixed_type");
    assert.match(r.json.error.message, /không ngưng được/);
    assert.equal(w.q("SELECT active FROM pty_person_document_type WHERE code = ?", code)[0].active, 1);
  }
  const r = await suaLoai(w, ADM, "HEALTH_CHECK", { name: "Khám sức khoẻ", hasExpiry: true, sortOrder: 3, active: false, expectedUpdatedAt: mocLoai(w, "HEALTH_CHECK") });
  assert.equal(r.status, 200, r.text);
  const t = await them(w, ADM, pty(DRIVER), { typeCode: "HEALTH_CHECK" });
  assert.equal(t.status, 400, t.text);
});

test("route 10, 11 hạng: thêm → 201 (trùng 409 code_taken); sửa có mốc → 200 (mốc cũ 409 stale); ngưng một hạng → thêm GPLX hạng đó → 400; nhật ký 'hạng: <mã> — <tên>'", async () => {
  const w = setup();
  let r = await hangMoi(w, ADM, { code: "C1", name: "Hạng C1", sortOrder: 9 });
  assert.equal(r.status, 201, r.text);
  assert.ok(r.json.classes.some((c: any) => c.code === "C1" && c.name === "Hạng C1" && c.active));
  assert.equal((await hangMoi(w, ADM, { code: "C1", name: "Trùng" })).json.error.code, "code_taken");
  assert.equal((await hangMoi(w, ADM, { code: "c1", name: "Sai" })).status, 400);
  const moc = mocHang(w, "D1");
  await doiMiliGiay();
  r = await suaHang(w, ADM, "D1", { name: "Hạng D1", sortOrder: 2, active: false, expectedUpdatedAt: moc });
  assert.equal(r.status, 200, r.text);
  assert.equal((await suaHang(w, ADM, "D1", { name: "Hạng D1", sortOrder: 2, active: true, expectedUpdatedAt: moc })).json.error.code, "stale");
  const t = await them(w, ADM, pty(DRIVER), { typeCode: "GPLX", number: SO_GPLX, classCode: "D1" });
  assert.equal(t.status, 400, t.text);
  assert.deepEqual(nhatKyDanhMuc(w), ["hạng: C1 — Hạng C1", "hạng: D1 — Hạng D1"]);
});
