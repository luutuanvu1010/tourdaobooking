// ADR-0156 phía máy chủ qua ứng dụng THẬT (tests/audit/harness.mjs): chặn trùng theo dấu vân tệp (Đ2), vé chưa từng phát ra nhập lại được, lệnh Bỏ lô, trần lô do Toàn quyền đặt (Đ3).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), SUPER = U(2), KT = U(3), ADMIN = U(5);
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const AT = new Date().toISOString();
const QR = (n: number) => String(n).padStart(36, "1");

function setup() {
  const w = world();
  for (const [id, phone, perms] of [[SALES, "0900000001", ["SALES"]], [SUPER, "0900000002", ["SUPER_ADMIN"]], [KT, "0900000003", ["ACCOUNTING"]], [ADMIN, "0900000005", ["ADMIN"]]] as [string, string, string[]][]) {
    seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-2)}`, perms });
  }
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('V2D', 'Vinwonders 2 ngày', 'perPax', 100000, 1, 1, '${AT}', '${AT}')`);
  return w;
}
const taoLo = (w: any, over: Record<string, unknown> = {}) => w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "V2D", nhomKhach: "ADULT", tenSanPham: "Vé mẫu", ...over } });
const them = (w: any, loId: string, ve: unknown[]) => w.call("POST", `/api/ve/lo/${loId}/ve`, { as: SALES, body: { ve } });
const ve = (n: number, over: Record<string, unknown> = {}) => ({ noiDung: b64(PNG(n)), maVe: QR(n), tuNgay: "2026-10-24", denNgay: "2026-11-23", ...over });
const bo = (w: any, loId: string, as = SALES) => w.call("POST", `/api/ve/lo/${loId}/bo`, { as, body: {} });
const xacNhan = (w: any, loId: string) => w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} });
const giuCho = (w: any, loId: string) => {
  const t = w.q("SELECT id FROM vdt_ticket WHERE batch_id = ? LIMIT 1", loId)[0].id;
  w.sqlite.exec(`UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = '${t}'`);
  w.sqlite.exec(`INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('a-${t}', '${t}', 'o', 's', 'ADULT', 1, '${AT}', '${AT}', '${AT}')`);
  return t;
};

// ---- Đ2: dấu vân tệp chặn thật ------------------------------------------------------------------------------------------------------------------------
test("cùng byte ảnh, khác mã vé: bị loại vì đã có trong kho", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1)]);
  const r = await them(w, loId, [ve(1, { maVe: QR(9) })]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 0);
  assert.match(r.json.loai[0].lyDo, /Ảnh này đã có trong kho/);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket")[0].n, 1);
});

test("cùng byte ảnh trong một đợt: giữ ảnh đầu, ảnh sau bị loại; không có lỗi 500", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  const r = await them(w, loId, [ve(1), ve(1, { maVe: QR(9) }), ve(2)]);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.themDuoc, 2);
  assert.deepEqual(r.json.loai.map((x: any) => x.thuTu), [1]);
});

test("chỉ mục ở cơ sở dữ liệu chặn hai vé trùng băm hoặc trùng mã khi chèn thẳng", () => {
  const w = setup();
  const lo = `${U(8)}`;
  w.sqlite.exec(`INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, updated_at) VALUES ('${lo}', 'V2D', 'ADULT', 'x', 'PENDING', '${AT}', '${AT}')`);
  const chen = (id: string, ma: string, bam: string) => w.sqlite.exec(`INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, created_at, updated_at) VALUES ('${id}', '${lo}', '${ma}', '2026-10-01', '2026-11-01', 'vdt/${id}', 'image/png', 1, '${bam}', 'AVAILABLE', '${AT}', '${AT}')`);
  chen("t1", "M1", "B1");
  assert.throws(() => chen("t2", "M2", "B1"), /UNIQUE/);
  assert.throws(() => chen("t3", "M1", "B3"), /UNIQUE/);
});

// ---- Đ2: vé chưa từng phát ra nhập lại được ---------------------------------------------------------------------------------------------------------------
test("kho R2 lỗi một lần rồi gửi lại đúng ảnh đó: vé vào kho", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  const goc = w.r2VeDienTu.put;
  const err = console.error; console.error = () => {};
  w.r2VeDienTu.put = async () => { throw new Error("r2 hỏng"); };
  const hong = await them(w, loId, [ve(1)]);
  w.r2VeDienTu.put = goc;
  console.error = err;
  assert.equal(hong.json.chuaLuuVaoKho, 1);
  const lai = await them(w, loId, [ve(1)]);
  assert.equal(lai.json.themDuoc, 1, lai.text);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE withdrawn_at IS NOT NULL")[0].n, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE withdrawn_at IS NULL AND stored_at IS NOT NULL")[0].n, 1);
});

test("trigger: không đánh dấu rút cho vé từng có phân bổ, vé chưa VOID, hoặc đặt dấu lần hai; không chèn sẵn dấu", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1), ve(2)]);
  await xacNhan(w, loId);
  const giu = giuCho(w, loId);
  assert.throws(() => w.sqlite.exec(`UPDATE vdt_ticket SET status = 'VOID', withdrawn_at = '${AT}' WHERE id = '${giu}'`), /vdt_one_way/);
  const khac = w.q(`SELECT id FROM vdt_ticket WHERE id <> '${giu}'`)[0].id;
  assert.throws(() => w.sqlite.exec(`UPDATE vdt_ticket SET withdrawn_at = '${AT}' WHERE id = '${khac}'`), /vdt_one_way/, "vé chưa VOID");
  w.sqlite.exec(`UPDATE vdt_ticket SET status = 'VOID', withdrawn_at = '${AT}' WHERE id = '${khac}'`);
  assert.throws(() => w.sqlite.exec(`UPDATE vdt_ticket SET withdrawn_at = NULL WHERE id = '${khac}'`), /vdt_one_way/, "gỡ dấu");
  assert.throws(() => w.sqlite.exec(`INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, withdrawn_at, created_at, updated_at) VALUES ('x', '${loId}', 'M9', '2026-10-01', '2026-11-01', 'vdt/x', 'image/png', 1, 'B9', 'AVAILABLE', '${AT}', '${AT}', '${AT}')`), /vdt_one_way/);
});

test("vé VOID vì đã lộ cho khách không mang dấu rút, nên không nhập lại được", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1)]);
  await xacNhan(w, loId);
  const t = giuCho(w, loId);
  w.sqlite.exec(`UPDATE vdt_allocation SET revealed_at = '${AT}' WHERE ticket_id = '${t}'`);
  w.sqlite.exec(`UPDATE vdt_ticket SET status = 'VOID' WHERE id = '${t}'`);
  const lo2 = (await taoLo(w)).json.loId;
  const r = await them(w, lo2, [ve(1)]);
  assert.equal(r.json.themDuoc, 0);
  assert.equal(r.json.loai.length, 1);
});

// ---- Đ2: lệnh Bỏ lô ------------------------------------------------------------------------------------------------------------------------------------
test("Bỏ lô đang dở: lô VOID, ảnh được xoá khỏi kho, nhập lại đúng các ảnh được; nhật ký không chứa mã", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1), ve(2)]);
  const khoa = w.q("SELECT storage_key FROM vdt_ticket").map((x: any) => x.storage_key);
  const r = await bo(w, loId);
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT status FROM vdt_batch")[0].status, "VOID");
  assert.ok(khoa.every((k: string) => !w.r2VeDienTu.co(k)), "đã xoá khỏi kho");
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE r2_deleted_at IS NOT NULL AND withdrawn_at IS NOT NULL AND status = 'VOID'")[0].n, 2);
  const lo2 = (await taoLo(w)).json.loId;
  const lai = await them(w, lo2, [ve(1), ve(2)]);
  assert.equal(lai.json.themDuoc, 2, lai.text);
  const nk = w.q("SELECT detail, target_id FROM audit_log WHERE action = 've_bo_lo'");
  assert.equal(nk.length, 1);
  assert.ok(!JSON.stringify(nk).includes(QR(1)));
});

test("Bỏ lô đã xác nhận mà chưa vé nào được giữ chỗ: được; kho không còn vé của lô đó", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1)]);
  await xacNhan(w, loId);
  assert.equal((await bo(w, loId)).status, 200);
  assert.deepEqual((await w.call("GET", "/api/ve/kho", { as: SALES })).json.kho, []);
});

test("Bỏ lô đã có vé từng được giữ chỗ (kể cả đã trả): 409, lô và vé giữ nguyên", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  await them(w, loId, [ve(1), ve(2)]);
  await xacNhan(w, loId);
  const t = giuCho(w, loId);
  assert.equal((await bo(w, loId)).status, 409);
  w.sqlite.exec(`UPDATE vdt_allocation SET released_at = '${AT}', release_reason = 'THU_HOI' WHERE ticket_id = '${t}'`);
  assert.equal((await bo(w, loId)).status, 409, "đã trả vẫn là từng giữ chỗ");
  assert.equal(w.q("SELECT status FROM vdt_batch")[0].status, "ACTIVE");
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE withdrawn_at IS NOT NULL")[0].n, 0);
});

test("Bỏ lô: bỏ lần hai 409; Kế toán 403; mã lạ 404", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  assert.equal((await bo(w, loId, KT)).status, 403);
  assert.equal((await bo(w, U(9))).status, 404);
  assert.equal((await bo(w, loId)).status, 200);
  assert.equal((await bo(w, loId)).status, 409);
});

test("danh sách lô bỏ được: có lô đang dở và lô chưa giữ chỗ; không có lô đã giữ chỗ, lô đã bỏ; không lộ mã, khoá kho", async () => {
  const w = setup();
  const dangDo = (await taoLo(w, { tenSanPham: "Lô dở" })).json.loId;
  await them(w, dangDo, [ve(1)]);
  const chuaGiu = (await taoLo(w, { tenSanPham: "Lô chưa giữ" })).json.loId;
  await them(w, chuaGiu, [ve(2)]);
  await xacNhan(w, chuaGiu);
  const daGiu = (await taoLo(w, { tenSanPham: "Lô đã giữ" })).json.loId;
  await them(w, daGiu, [ve(3)]);
  await xacNhan(w, daGiu);
  giuCho(w, daGiu);
  const daBo = (await taoLo(w, { tenSanPham: "Lô đã bỏ" })).json.loId;
  await bo(w, daBo);
  const r = await w.call("GET", "/api/ve/lo", { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.lo.map((x: any) => x.tenSanPham).sort(), ["Lô chưa giữ", "Lô dở"]);
  const mot = r.json.lo.find((x: any) => x.loId === dangDo);
  assert.deepEqual([mot.tenDichVu, mot.nhomKhach, mot.trangThai, mot.soVe], ["Vinwonders 2 ngày", "ADULT", "PENDING", 1]);
  assert.doesNotMatch(r.text, /vdt\/[0-9a-f]{32}/);
  assert.ok(!r.text.includes(QR(1)));
  assert.equal((await w.call("GET", "/api/ve/lo", { as: KT })).status, 403);
});

// ---- Đ3: trần lô ---------------------------------------------------------------------------------------------------------------------------------------
test("mặc định trần 50: tạo lô dự kiến 51 vé bị 400 và không tạo lô; 50 thì được; GET kho báo trần cho trang nhập", async () => {
  const w = setup();
  const qua = await taoLo(w, { soVeDuKien: 51 });
  assert.equal(qua.status, 400, qua.text);
  assert.match(qua.json.error.message, /tối đa 50/);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_batch")[0].n, 0);
  assert.equal((await taoLo(w, { soVeDuKien: 50 })).status, 201);
  assert.equal((await taoLo(w, { soVeDuKien: 0 })).status, 400);
  assert.equal((await taoLo(w, { soVeDuKien: "9" })).status, 400);
  assert.equal((await w.call("GET", "/api/ve/kho", { as: SALES })).json.tranLo, 50);
});

test("thêm vé vượt trần (gọi thẳng, không khai dự kiến): 400, không thêm; vé đã rút không tính vào trần", async () => {
  const w = setup();
  const cai = await w.call("GET", "/api/ve/cai-dat", { as: SUPER });
  await w.call("PUT", "/api/ve/cai-dat", { as: SUPER, body: { tranLo: 2, version: cai.json.version } });
  const loId = (await taoLo(w)).json.loId;
  const goc = w.r2VeDienTu.put;
  const err = console.error; console.error = () => {};
  w.r2VeDienTu.put = async () => { throw new Error("r2 hỏng"); };
  await them(w, loId, [ve(1)]);
  w.r2VeDienTu.put = goc;
  console.error = err;
  assert.equal((await them(w, loId, [ve(1), ve(2)])).json.themDuoc, 2, "vé rút không chiếm chỗ");
  const qua = await them(w, loId, [ve(3)]);
  assert.equal(qua.status, 400, qua.text);
  assert.match(qua.json.error.message, /tối đa 2/);
  assert.equal(w.q("SELECT count(*) AS n FROM vdt_ticket WHERE withdrawn_at IS NULL")[0].n, 2);
});

test("Toàn quyền đổi trần 50 → 30: lô mới theo 30; nhật ký có số cũ, số mới; version tăng", async () => {
  const w = setup();
  const cu = await w.call("GET", "/api/ve/cai-dat", { as: SUPER });
  assert.deepEqual(cu.json, { tranLo: 50, version: 1 });
  const r = await w.call("PUT", "/api/ve/cai-dat", { as: SUPER, body: { tranLo: 30, version: 1 } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { tranLo: 30, version: 2 });
  assert.equal((await taoLo(w, { soVeDuKien: 31 })).status, 400);
  assert.equal((await taoLo(w, { soVeDuKien: 30 })).status, 201);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 've_doi_tran_lo'");
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /50/);
  assert.match(nk[0].detail, /30/);
});

test("trần lô: Quản trị, Bán hàng, Kế toán không đọc không đổi được; số ngoài khoảng 400; phiên bản cũ 409", async () => {
  const w = setup();
  for (const as of [ADMIN, SALES, KT]) {
    assert.equal((await w.call("PUT", "/api/ve/cai-dat", { as, body: { tranLo: 30, version: 1 } })).status, 403, `PUT ${as}`);
    assert.equal((await w.call("GET", "/api/ve/cai-dat", { as })).status, 403, `GET ${as}`);
  }
  for (const tranLo of [0, 201, 1.5, "30"]) assert.equal((await w.call("PUT", "/api/ve/cai-dat", { as: SUPER, body: { tranLo, version: 1 } })).status, 400, String(tranLo));
  assert.equal((await w.call("PUT", "/api/ve/cai-dat", { as: SUPER, body: { tranLo: 30 } })).status, 400);
  assert.equal((await w.call("PUT", "/api/ve/cai-dat", { as: SUPER, body: { tranLo: 30, version: 9 } })).status, 409);
  assert.equal(w.q("SELECT batch_limit FROM vdt_setting")[0].batch_limit, 50);
});

test("phản hồi và nhật ký không chứa chuỗi QR 36 số đầy đủ", async () => {
  const w = setup();
  const loId = (await taoLo(w)).json.loId;
  const r = await them(w, loId, [ve(7)]);
  assert.equal(r.status, 200, r.text);
  assert.ok(!r.text.includes(QR(7)));
  assert.match(r.text, new RegExp(`…${QR(7).slice(-4)}`));
  await xacNhan(w, loId);
  const trung = await them(w, (await taoLo(w)).json.loId, [ve(7, { noiDung: b64(PNG(99)) })]);
  assert.ok(!trung.text.includes(QR(7)), "câu loại trùng không lặp lại mã");
  const nk = JSON.stringify(w.q("SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'"));
  assert.ok(!nk.includes(QR(7)));
});
