// Hồi quy quyền trên HỒ SƠ CÔNG TY CHỦ (ADR-0024 điều 6, 6.4, 6.5; ADR-0038 điều 7; câu trả lời của chủ 2026-09-28 "cho Super Admin đổi") — chạy CẢ ứng dụng
// (router + mọi module) trên SQLite thật qua khung tests/audit/harness.mjs. Mọi ca từ chối khẳng định ĐÚNG MÃ (403/409), không chỉ "không 2xx": lớp
// cơ sở dữ liệu cũng chặn nên "bị từ chối" chung chung sẽ che một lỗ ở route (Review Focus 1 của kế hoạch T2b).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "55555555-5555-4555-8555-555555555555";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
/** id hồ sơ công ty chủ — đọc theo mã vai (tệp test không bị R-N1-12 quét; không viết cứng id). */
const congTyChu = (w: any): string => w.q("SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL")[0].party_id;
const logCount = (w: any, partyId: string): number => w.q("SELECT count(*) n FROM audit_log WHERE target_id = ?", partyId)[0].n;
const hoSo = (w: any, id: string) =>
  w.q("SELECT p.display_name, p.active, p.updated_at, o.legal_name, o.tax_code, o.address, o.invoice_email FROM pty_party p LEFT JOIN pty_organization o ON o.party_id = p.id WHERE p.id = ?", id)[0];
const lienHe = (w: any, id: string) => w.q("SELECT id, label, valid_to_date FROM pty_contact_point WHERE party_id = ? ORDER BY id", id);

/** PUT hồ sơ tổ chức với tên gọi `ten`, còn lại giữ nguyên giá trị đang có (+ khoá lạc quan). */
function sua(w: any, as: string, id: string, ten?: string) {
  const h = hoSo(w, id);
  return w.call("PUT", `/api/parties/${id}`, {
    as,
    body: { displayName: ten ?? h.display_name, legalName: h.legal_name, taxCode: h.tax_code, address: h.address, invoiceEmail: h.invoice_email, active: h.active === 1, expectedUpdatedAt: h.updated_at },
  });
}
const themSdt = (w: any, as: string, id: string) => w.call("POST", `/api/parties/${id}/contacts`, { as, body: { kind: "PHONE", value: "0911222333", label: "Thử" } });
const dongLienHe = (w: any, as: string, id: string, cid: string) => w.call("POST", `/api/parties/${id}/contacts/${cid}/end`, { as, body: {} });

test("6.4: SALES, ACCOUNTING, ADMIN (không có company.legal.write) sửa tên / thêm liên hệ / đóng liên hệ của hồ sơ công ty chủ → ĐÚNG 403, không ghi, không nhật ký; chữ không nói 'Toàn quyền'", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const hotline = lienHe(w, CT).find((c: any) => c.label === "Hotline").id;
  const truoc = { ho: hoSo(w, CT), lh: lienHe(w, CT), log: logCount(w, CT) };
  for (const as of [SALES, ACC, ADM]) {
    for (const [ten, goi] of [["PUT", () => sua(w, as, CT, "Kẻ Mạo Danh")], ["thêm liên hệ", () => themSdt(w, as, CT)], ["đóng Hotline", () => dongLienHe(w, as, CT, hotline)]] as const) {
      const r = await goi();
      assert.equal(r.status, 403, `${as} ${ten}: ${r.text}`);
      assert.equal(r.json.error.code, "forbidden");
      assert.match(r.json.error.message, /người phụ trách hệ thống/);
      assert.doesNotMatch(r.text, /Toàn quyền/, "chữ mới không nói 'Toàn quyền' (vai ẩn — chỉ đạo D5)");
    }
  }
  assert.deepEqual({ ho: hoSo(w, CT), lh: lienHe(w, CT), log: logCount(w, CT) }, truoc);
});

test("6.4: SUPER_ADMIN (company.legal.write) sửa hồ sơ công ty chủ → 200 có nhật ký; thêm liên hệ → 201", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const log = logCount(w, CT);
  let r = await sua(w, SUP, CT);
  assert.equal(r.status, 200, r.text);
  assert.equal(logCount(w, CT), log + 1);
  assert.equal(w.q("SELECT action FROM audit_log WHERE target_id = ? ORDER BY rowid DESC LIMIT 1", CT)[0].action, "party_updated");
  r = await themSdt(w, SUP, CT);
  assert.equal(r.status, 201, r.text);
});

test("không chặn quá tay: SALES tạo và sửa một hồ sơ tổ chức thường → 201/200", async () => {
  const w = setup();
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Đại lý Thử" } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.party.id;
  r = await sua(w, SALES, id, "Đại lý Thử Mới");
  assert.equal(r.status, 200, r.text);
  assert.equal(hoSo(w, id).display_name, "Đại lý Thử Mới");
});

// ---- Vai "Công ty chủ" (6.5 (i) + câu trả lời của chủ 2026-09-28: Toàn quyền ĐỔI được bằng cách gán cho hồ sơ tổ chức khác; không kết thúc được) ----
const vaiMo = (w: any) => w.q("SELECT id, party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL");
const ganVai = (w: any, as: string, id: string, body: Record<string, unknown>) => w.call("POST", `/api/parties/${id}/roles`, { as, body });
const ketThucVai = (w: any, as: string, id: string, rid: string) => w.call("POST", `/api/parties/${id}/roles/${rid}/end`, { as, body: {} });
/** Một hồ sơ tổ chức ĐỦ thông tin cho biên nhận (tên pháp lý, MST, địa chỉ, liên hệ Hotline) — số giả, không phải của công ty. */
async function toChucDu(w: any, as: string, ten: string): Promise<string> {
  let r = await w.call("POST", "/api/parties", { as, body: { kind: "ORGANIZATION", displayName: ten, legalName: `CÔNG TY ${ten.toUpperCase()}`, taxCode: "0312345678", address: "2 Đường Thử" } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.party.id;
  r = await w.call("POST", `/api/parties/${id}/contacts`, { as, body: { kind: "PHONE", value: "0901 234 567", label: "Hotline", isPrimary: true } });
  assert.equal(r.status, 201, r.text);
  return id;
}

test("6.5 (i): ADMIN thêm/kết thúc công việc trên hồ sơ công ty chủ, hay gán 'Công ty chủ' cho hồ sơ khác → ĐÚNG 403 (không phải 409/500), không ghi, không nhật ký", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const [vai] = vaiMo(w);
  const KHAC = await toChucDu(w, SALES, "Đại lý Khác");
  const truoc = { vai: vaiMo(w), logCT: logCount(w, CT), logKhac: logCount(w, KHAC) };
  for (const [ten, goi] of [
    ["thêm Khách hàng lên công ty chủ", () => ganVai(w, ADM, CT, { roleTypeCode: "CUSTOMER" })],
    ["gán Công ty chủ cho hồ sơ khác", () => ganVai(w, ADM, KHAC, { roleTypeCode: "OWNER_COMPANY" })],
    ["kết thúc vai Công ty chủ", () => ketThucVai(w, ADM, CT, vai.id)],
  ] as const) {
    const r = await goi();
    assert.equal(r.status, 403, `${ten}: ${r.text}`);
    assert.match(r.json.error.message, /người phụ trách hệ thống/);
    assert.doesNotMatch(r.text, /Toàn quyền|SQLITE|constraint|UNIQUE/i);
  }
  assert.deepEqual({ vai: vaiMo(w), logCT: logCount(w, CT), logKhac: logCount(w, KHAC) }, truoc);
});

test("kết thúc vai 'Công ty chủ' luôn bị từ chối, kể cả SUPER_ADMIN → 409 owner_company_locked, câu tiếng Việt chỉ cách đổi; không lộ lỗi SQLite; vẫn đúng một", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const [vai] = vaiMo(w);
  const log = logCount(w, CT);
  const r = await ketThucVai(w, SUP, CT, vai.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "owner_company_locked");
  assert.match(r.json.error.message, /gán .*Công ty chủ.* cho hồ sơ tổ chức khác/);
  assert.doesNotMatch(r.text, /Toàn quyền|SQLITE|constraint|RAISE|owner_company_last_open/i);
  assert.deepEqual(vaiMo(w), [vai]);
  assert.equal(logCount(w, CT), log);
});

test("ĐỔI công ty chủ (chủ trả lời 2026-09-28): SUPER_ADMIN gán 'Công ty chủ' cho hồ sơ tổ chức khác → 201; ownerCompany, /api/company, /api/auth/config trả hồ sơ MỚI; vẫn đúng một; nhật ký ghi việc đổi, không MST/SĐT", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const MOI = await toChucDu(w, SALES, "Pháp nhân Mới");
  const logCu = logCount(w, CT);
  let r = await ganVai(w, SUP, MOI, { roleTypeCode: "OWNER_COMPANY" });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(vaiMo(w).map((x: any) => x.party_id), [MOI], "đúng một dòng mở, là hồ sơ mới");
  assert.equal(r.json.party.editable, true, "người đổi vẫn sửa được hồ sơ mới");
  r = await w.call("GET", "/api/company");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.company, { name: "CÔNG TY PHÁP NHÂN MỚI", taxCode: "0312345678", address: "2 Đường Thử", hotline: "0901 234 567", email: null });
  r = await w.call("GET", "/api/auth/config");
  assert.equal(r.json.companyName, "Pháp nhân Mới");
  assert.equal(r.json.companyTaxCode, "0312345678");
  const them = w.q("SELECT action, detail FROM audit_log WHERE target_id = ? ORDER BY rowid DESC LIMIT 1", MOI)[0];
  assert.equal(them.action, "party_role_added");
  assert.match(them.detail, /công ty chủ/i);
  assert.equal(logCount(w, CT), logCu + 1, "hồ sơ cũ có một dòng nhật ký: thôi làm công ty chủ");
  const bot = w.q("SELECT action, detail FROM audit_log WHERE target_id = ? ORDER BY rowid DESC LIMIT 1", CT)[0];
  assert.equal(bot.action, "party_role_ended");
  for (const d of [them.detail, bot.detail]) assert.doesNotMatch(d, /\d{6,}|@/, "nhật ký không ghi MST/SĐT/email");
  // Bảo vệ đi theo vai: hồ sơ mới bị khoá với Bán hàng, hồ sơ cũ thành hồ sơ tổ chức thường
  assert.equal((await sua(w, SALES, MOI, "Kẻ Mạo Danh")).status, 403);
  assert.equal((await sua(w, SALES, CT, hoSo(w, CT).display_name)).status, 200);
});

test("gán 'Công ty chủ' (SUPER_ADMIN): hồ sơ cá nhân, có nơi, có ngày kết thúc, ngày bắt đầu đã qua hoặc chưa tới → 400 câu tiếng Việt (ADR-0043 điều 2: ngày bắt đầu = hôm nay); không đổi gì, không nhật ký", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const KHAC = await toChucDu(w, SALES, "Đại lý Khác");
  const truoc = { vai: vaiMo(w), log: logCount(w, CT) + logCount(w, KHAC) };
  const nguoi = (await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Nguyễn Thử" } })).json.party.id;
  const noi = w.q("SELECT id FROM loc_location LIMIT 1")[0].id;
  for (const [ten, id, body, chu] of [
    ["hồ sơ cá nhân", nguoi, { roleTypeCode: "OWNER_COMPANY" }, /tổ chức/],
    ["có nơi", KHAC, { roleTypeCode: "OWNER_COMPANY", locationId: noi }, /nơi/],
    ["có ngày kết thúc", KHAC, { roleTypeCode: "OWNER_COMPANY", validTo: "2099-12-31" }, /ngày kết thúc/],
    ["bắt đầu ngày ĐÃ QUA (ghi lùi lịch sử)", KHAC, { roleTypeCode: "OWNER_COMPANY", validFrom: "2020-01-01" }, /hôm nay/],
    ["bắt đầu ngày CHƯA TỚI (hiện trước ngày hiệu lực)", KHAC, { roleTypeCode: "OWNER_COMPANY", validFrom: "2099-01-01" }, /hôm nay/],
  ] as const) {
    const r = await ganVai(w, SUP, id, body);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    assert.match(r.json.error.message, chu, ten);
  }
  assert.deepEqual({ vai: vaiMo(w), log: logCount(w, CT) + logCount(w, KHAC) }, truoc);
});

test("gán lại 'Công ty chủ' cho CHÍNH hồ sơ đang giữ → 409 owner_company_already 'đang là công ty chủ' (không câu chung 'trùng thời gian'); không đổi gì", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const truoc = vaiMo(w);
  const r = await ganVai(w, SUP, CT, { roleTypeCode: "OWNER_COMPANY" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "owner_company_already");
  assert.match(r.json.error.message, /đang là công ty chủ/);
  assert.doesNotMatch(r.text, /SQLITE|constraint|RAISE|trùng/i);
  assert.deepEqual(vaiMo(w), truoc);
});

test("đổi đi rồi đổi LẠI trong cùng ngày về hồ sơ vừa thôi vai (trigger chồng lấn 0011 chặn) → 409 owner_company_same_day, câu 'đổi lại vào ngày mai'; vẫn đúng một", async () => {
  const w = setup();
  const CT = congTyChu(w); // dòng gieo bắt đầu HÔM NAY (khung dựng CSDL lúc chạy) → đổi đi thì dòng đó đóng ở chính hôm nay
  const MOI = await toChucDu(w, SALES, "Pháp nhân Mới");
  assert.equal((await ganVai(w, SUP, MOI, { roleTypeCode: "OWNER_COMPANY" })).status, 201);
  const r = await ganVai(w, SUP, CT, { roleTypeCode: "OWNER_COMPANY" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "owner_company_same_day");
  assert.match(r.json.error.message, /ngày mai/);
  assert.doesNotMatch(r.text, /SQLITE|constraint|RAISE|trùng/i);
  assert.deepEqual(vaiMo(w).map((x: any) => x.party_id), [MOI]);
});

test("MỌI đường ghi vai đều qua chốt: Bán hàng, Kế toán gán/kết thúc 'Công ty chủ' → 403 (cổng quản trị); vai tài khoản không nhận 'OWNER_COMPANY' (400); tạo hồ sơ kèm 'roles' không sinh vai", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const [vai] = vaiMo(w);
  const KHAC = await toChucDu(w, SALES, "Đại lý Khác");
  const truoc = { vai: vaiMo(w), log: logCount(w, CT) + logCount(w, KHAC) };
  for (const as of [SALES, ACC]) {
    assert.equal((await ganVai(w, as, KHAC, { roleTypeCode: "OWNER_COMPANY" })).status, 403, `${as} gán`);
    assert.equal((await ketThucVai(w, as, CT, vai.id)).status, 403, `${as} kết thúc`);
  }
  // Đường vai TÀI KHOẢN (module staff) chỉ nhận mã vai của roles.ts — kể cả người giữ mọi quyền.
  const r = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["OWNER_COMPANY"], adds: [], removes: [], reason: null } });
  assert.equal(r.status, 400, r.text);
  // Tạo hồ sơ (party.write của Bán hàng) không nhận vai: trường 'roles' lạ bị bỏ qua.
  const moi = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Tổ chức Kèm Vai", roles: [{ roleTypeCode: "OWNER_COMPANY" }] } });
  assert.equal(moi.status, 201, moi.text);
  assert.deepEqual(moi.json.party.roles, []);
  assert.deepEqual({ vai: vaiMo(w), log: logCount(w, CT) + logCount(w, KHAC) }, truoc);
});

test("không chặn quá tay: ADMIN thêm 'Khách hàng' cho hồ sơ tổ chức thường → 201; 2A (chủ 2026-09-28): ADMIN thêm 'Người liên hệ của' công ty chủ → 201", async () => {
  const w = setup();
  const CT = congTyChu(w);
  const KHAC = await toChucDu(w, SALES, "Đại lý Khác");
  let r = await ganVai(w, ADM, KHAC, { roleTypeCode: "CUSTOMER" });
  assert.equal(r.status, 201, r.text);
  const nguoi = (await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Trần Liên Hệ" } })).json.party.id;
  r = await w.call("POST", `/api/parties/${CT}/relationships`, { as: ADM, body: { fromPartyId: nguoi, toPartyId: CT, relationshipTypeCode: "CONTACT_OF" } });
  assert.equal(r.status, 201, r.text);
});

test("editable của GET /api/parties/:id (hồ sơ công ty chủ): false với SALES và ADMIN, true với SUPER_ADMIN — cùng điều kiện với route ghi", async () => {
  const w = setup();
  const CT = congTyChu(w);
  for (const [as, mong] of [[SALES, false], [ADM, false], [SUP, true]] as const) {
    const r = await w.call("GET", `/api/parties/${CT}`, { as });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.party.editable, mong, as);
  }
});
