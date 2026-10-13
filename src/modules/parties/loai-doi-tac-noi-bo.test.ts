// ADR-0117 lần 1, điều 4 (tiêu chí N-7 a, a2, a3, a4, g, h) — chiều 1 ở Danh bạ và đường gộp hồ sơ: nhân viên nội bộ không mang loại đối tác được hưởng hoa
// hồng. Chạy CẢ ứng dụng trên SQLite thật (khung tests/audit/harness.mjs). Luật «nội bộ» phương án (a): vai INTERNAL đang mở, hoặc vai cũ STAFF/SALES đang mở,
// hoặc tài khoản có quyền không thuộc Đối tác / Tài xế đối tác. Vế 3 (tài khoản quyền nội bộ, hồ sơ không vai) KHÔNG có trigger nào canh — chỉ máy chủ.
// LƯU Ý khung: seedStaff KHÔNG tạo vai hồ sơ nào → hồ sơ của nó chỉ «nội bộ» theo vế 3.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const AT = "2026-09-01T00:00:00.000Z";
const NHAN = "LE_TAN_SPA_HOA_SEN";
const TEN_NHAN = "Lễ tân spa Hoa Sen";
const CAU = "Nhân viên nội bộ không mang loại đối tác được hưởng hoa hồng.";

function nen() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "Bán Hàng", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]],
    [PARTNER, "0900000008", "Đối Tác", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  // Loại đối tác do người dùng thêm (Task 3 làm route) — bài tự gieo: nhóm OTHER, cờ bật.
  w.sqlite.prepare("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES (?, ?, 40, 'OTHER', 1)").run(NHAN, TEN_NHAN);
  return w;
}
/** Hồ sơ cá nhân trần (không vai, không tài khoản) chèn thẳng. */
function hoSo(w: any, ten: string): string {
  const id = crypto.randomUUID();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
  return id;
}
/** Vai chèn thẳng (vai cũ đã ngưng không gán qua route được). */
const vaiTay = (w: any, partyId: string, code: string) =>
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)")
    .run(crypto.randomUUID(), partyId, code, AT, AT);
const ganNhan = (w: any, partyId: string, as = ADM) => w.call("POST", `/api/parties/${partyId}/roles`, { as, body: { roleTypeCode: NHAN } });
const soVai = (w: any, partyId: string): number => w.q("SELECT count(*) n FROM pty_party_role WHERE party_id = ?", partyId)[0].n;
const nhanMo = (w: any, partyId: string): number => w.q("SELECT count(*) n FROM v_pty_party_partner_label WHERE party_id = ?", partyId)[0].n;
function bi409(r: any, ten: string) {
  assert.equal(r.status, 409, `${ten}: ${r.status} ${r.text}`);
  assert.equal(r.json.error.code, "role_partner_label_conflict", ten);
  assert.equal(r.json.error.message, CAU, ten);
}
/** Tài khoản theo vai trên hồ sơ MỚI (Toàn quyền tạo). */
async function taiKhoan(w: any, roles: string[], phone: string, ten: string): Promise<{ staffId: string; partyId: string }> {
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: ten, phone, roles, taoHoSoMoi: true } });
  assert.equal(r.status, 201, r.text);
  return { staffId: r.json.staff.id, partyId: r.json.staff.partyId };
}

test("N-7 (a) vế 1: Quản trị gắn loại đối tác cho hồ sơ Bán hàng (vai SALES_STAFF) → 409, không ghi", async () => {
  const w = nen();
  const ban = await taiKhoan(w, ["SALES_STAFF"], "0900000101", "Nhân Viên Kinh Doanh");
  bi409(await ganNhan(w, ban.partyId), "vế 1 — vai SALES_STAFF");
  assert.equal(soVai(w, ban.partyId), 1, "không chèn vai");
  assert.equal(nhanMo(w, ban.partyId), 0);
});

test("N-7 (a) vế 3: hồ sơ KHÔNG vai nhưng tài khoản giữ quyền Bán hàng (chỉ máy chủ canh — không trigger nào) → 409, kể cả Toàn quyền gọi", async () => {
  const w = nen();
  const p = `pty-${SALES}`;
  for (const as of [ADM, SUP]) bi409(await ganNhan(w, p, as), `vế 3 — người gọi ${as}`);
  assert.equal(soVai(w, p), 0, "không chèn vai");
  assert.equal(nhanMo(w, p), 0);
});

test("N-7 (a) gắn lại: hồ sơ từng mang loại (đã kết thúc) rồi thành nhân viên Bán hàng → gắn lại loại đó → 409", async () => {
  const w = nen();
  const p = hoSo(w, "Người Từng Là Đối Tác");
  const r1 = await ganNhan(w, p);
  assert.equal(r1.status, 201, r1.text);
  const rid = r1.json.party.roles.find((r: any) => r.roleTypeCode === NHAN).id;
  assert.equal((await w.call("POST", `/api/parties/${p}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  const tk = await w.call("POST", "/api/staff", { as: SUP, body: { phone: "0900000102", roles: ["SALES_STAFF"], partyId: p } });
  assert.equal(tk.status, 201, tk.text);
  bi409(await ganNhan(w, p), "gắn lại sau khi thành nhân viên");
  assert.equal(nhanMo(w, p), 0);
});

test("N-7 (a2, a4): hồ sơ chỉ mang vai cũ STAFF hoặc SALES (đã ngưng từ 0024) → 409; vai cũ GUIDE / AGENT KHÔNG tính nội bộ → 201", async () => {
  const w = nen();
  for (const cu of ["STAFF", "SALES"]) {
    const p = hoSo(w, `Vai Cũ ${cu}`);
    vaiTay(w, p, cu);
    bi409(await ganNhan(w, p), `vai cũ ${cu}`);
    assert.equal(soVai(w, p), 1);
  }
  for (const cu of ["GUIDE", "AGENT"]) {
    const p = hoSo(w, `Vai Cũ ${cu}`);
    vaiTay(w, p, cu);
    const r = await ganNhan(w, p);
    assert.equal(r.status, 201, `vai cũ ${cu}: ${r.text}`);
    assert.equal(nhanMo(w, p), 1);
  }
});

test("N-7 (a3): đối tác thuần ĐƯỢC mang loại — tài khoản Đối tác không vai, tài khoản Lễ tân khách sạn (vai EXTERNAL), hồ sơ không tài khoản → 201", async () => {
  const w = nen();
  const r1 = await ganNhan(w, `pty-${PARTNER}`);
  assert.equal(r1.status, 201, `tài khoản Đối tác: ${r1.text}`);
  const le = await taiKhoan(w, ["HOTEL_RECEPTION"], "0900000103", "Lễ Tân");
  const r2 = await ganNhan(w, le.partyId);
  assert.equal(r2.status, 201, `Lễ tân khách sạn: ${r2.text}`);
  const r3 = await ganNhan(w, hoSo(w, "Khách Thường"));
  assert.equal(r3.status, 201, r3.text);
  // DTO meta mang cờ loại đối tác (Task 3 dùng).
  const meta = await w.call("GET", "/api/parties/meta", { as: ADM });
  assert.equal(meta.json.roleTypes.find((t: any) => t.code === NHAN).partnerLabel, true);
  assert.equal(meta.json.roleTypes.find((t: any) => t.code === "CUSTOMER").partnerLabel, false);
});

/** Hai hồ sơ cho ca gộp; trả kết quả xem trước + gộp và trạng thái trước / sau. */
async function thuGop(w: any, a: string, b: string, tenA: string) {
  const vaiTruoc = w.q("SELECT id, party_id, valid_to_date FROM pty_party_role ORDER BY id");
  const xem = await w.call("POST", `/api/parties/${a}/merge/preview`, { as: ADM, body: { intoPartyId: b } });
  const gop = await w.call("POST", `/api/parties/${a}/merge`, { as: ADM, body: { intoPartyId: b, xacNhan: tenA } });
  return { xem, gop, vaiTruoc, vaiSau: w.q("SELECT id, party_id, valid_to_date FROM pty_party_role ORDER BY id") };
}
function chanDungLyDo(w: any, k: any, a: string, ten: string) {
  assert.equal(k.gop.status, 409, `${ten} gộp: ${k.gop.status} ${k.gop.text}`);
  assert.equal(k.gop.json.error.code, "merge_partner_label_internal", `${ten} gộp (không merge_stale): ${k.gop.text}`);
  assert.equal(k.xem.status, 200, `${ten} xem trước: ${k.xem.text}`);
  const ma = k.xem.json.chan.map((c: any) => c.code);
  assert.ok(ma.includes("merge_partner_label_internal"), `${ten}: chan = ${JSON.stringify(ma)}`);
  assert.equal(k.gop.json.error.message, "Gộp xong, hồ sơ chính vừa là nhân viên nội bộ vừa mang loại đối tác — không được.");
  assert.deepEqual(k.vaiSau, k.vaiTruoc, `${ten}: không dòng vai nào đổi`);
  assert.equal(w.q("SELECT merged_into_id m FROM pty_party WHERE id = ?", a)[0].m, null, `${ten}: hồ sơ phụ chưa gộp`);
}

test("N-7 (g): gộp hồ sơ phụ MANG LOẠI vào hồ sơ chính NỘI BỘ có vai SALES_STAFF → xem trước báo lý do riêng, gộp 409 (không merge_stale), không đổi gì", async () => {
  const w = nen();
  const ban = await taiKhoan(w, ["SALES_STAFF"], "0900000104", "Chính Nội Bộ");
  const a = hoSo(w, "Phụ Mang Loại");
  assert.equal((await ganNhan(w, a)).status, 201);
  chanDungLyDo(w, await thuGop(w, a, ban.partyId, "Phụ Mang Loại"), a, "chính có vai SALES_STAFF");
});

test("N-7 (g) vế 3: gộp hồ sơ phụ MANG LOẠI vào hồ sơ chính chỉ có tài khoản quyền Bán hàng (không vai — không trigger nào canh) → lý do riêng, gộp 409, không đổi gì", async () => {
  const w = nen();
  const a = hoSo(w, "Phụ Mang Loại");
  assert.equal((await ganNhan(w, a)).status, 201);
  chanDungLyDo(w, await thuGop(w, a, `pty-${SALES}`, "Phụ Mang Loại"), a, "chính chỉ có tài khoản SALES (vế 3)");
});

test("N-7 (g) ngược: gộp hồ sơ phụ NỘI BỘ (chỉ vai cũ STAFF / SALES, không tài khoản) vào hồ sơ chính MANG LOẠI → lý do riêng, gộp 409, không đổi gì", async () => {
  const w = nen();
  for (const cu of ["STAFF", "SALES"]) {
    const b = hoSo(w, `Chính Mang Loại ${cu}`);
    assert.equal((await ganNhan(w, b)).status, 201);
    const a = hoSo(w, `Phụ Vai Cũ ${cu}`);
    vaiTay(w, a, cu);
    chanDungLyDo(w, await thuGop(w, a, b, `Phụ Vai Cũ ${cu}`), a, `phụ vai cũ ${cu}`);
  }
});

test("N-7 (g) đối chứng: gộp hồ sơ phụ mang loại vào hồ sơ chính đối tác thuần (tài khoản Đối tác) → được (không chặn nhầm)", async () => {
  const w = nen();
  const a = hoSo(w, "Phụ Đối Tác");
  assert.equal((await ganNhan(w, a)).status, 201);
  const k = await thuGop(w, a, `pty-${PARTNER}`, "Phụ Đối Tác");
  assert.deepEqual(k.xem.json.chan, []);
  assert.equal(k.gop.status, 200, k.gop.text);
  assert.equal(nhanMo(w, `pty-${PARTNER}`), 1);
});

// Kiểm độc lập (Ruling 7): loại đối tác gắn kèm NGÀY KẾT THÚC thì view / trigger / hoSoMangNhanDoiTac (chỉ đếm valid_to_date IS NULL) không thấy ⇒ chiều 2 lọt
// (tài khoản Lễ tân mang loại tới 2027 đổi được sang Nhân viên kinh doanh). Chặn ở cửa vào: loại đối tác không đặt trước ngày kết thúc — thôi thì bấm “Kết thúc”.
test("Ruling 7: gắn loại đối tác KÈM ngày kết thúc → 400, không chèn; rồi đổi tài khoản Lễ tân sang Nhân viên kinh doanh vẫn chặn được; đối chứng: không ngày → 201, CUSTOMER kèm ngày → 201", async () => {
  const w = nen();
  const le = await taiKhoan(w, ["HOTEL_RECEPTION"], "0900000105", "Lễ Tân Có Hạn");
  const r = await w.call("POST", `/api/parties/${le.partyId}/roles`, { as: ADM, body: { roleTypeCode: NHAN, validTo: "2027-06-30" } });
  assert.equal(r.status, 400, `loại kèm ngày kết thúc: ${r.status} ${r.text}`);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, "Loại đối tác không đặt trước ngày kết thúc — khi thôi thì bấm “Kết thúc”.");
  assert.equal(w.q("SELECT count(*) n FROM pty_party_role WHERE party_id = ? AND role_type_code = ?", le.partyId, NHAN)[0].n, 0, "không chèn dòng loại");
  // Đối chứng: không ngày kết thúc → 201; sau đó chiều 2 (PUT roles sang SALES_STAFF) bị chặn như thường.
  assert.equal((await ganNhan(w, le.partyId)).status, 201);
  const doi = await w.call("PUT", `/api/staff/${le.staffId}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  assert.equal(doi.status, 409, doi.text);
  // Loại KHÔNG phải nhãn vẫn nhận ngày kết thúc như cũ.
  const kh = await w.call("POST", `/api/parties/${hoSo(w, "Khách Có Hạn")}/roles`, { as: ADM, body: { roleTypeCode: "CUSTOMER", validTo: "2027-06-30" } });
  assert.equal(kh.status, 201, kh.text);
});

// Kiểm độc lập lượt 2 (Ruling 8): cùng gốc với Ruling 7 — nút “Kết thúc” (POST …/roles/:rid/end) nhận ngày TƯƠNG LAI; dòng loại có hạn không còn
// valid_to_date IS NULL nên view / trigger / hoSoMangNhanDoiTac không thấy ⇒ chiều 2 lọt. Loại đối tác chỉ kết thúc hôm nay hoặc ngày đã qua.
const ketThuc = (w: any, partyId: string, rid: string, validTo?: string) =>
  w.call("POST", `/api/parties/${partyId}/roles/${rid}/end`, { as: ADM, body: validTo === undefined ? {} : { validTo } });
const dongNhan = (w: any, partyId: string): string => w.q("SELECT id FROM pty_party_role WHERE party_id = ? AND role_type_code = ?", partyId, NHAN)[0].id;
const homNay = (): string => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

test("Ruling 8: kết thúc loại đối tác vào ngày TƯƠNG LAI → 400, dòng vẫn mở; đổi tài khoản Lễ tân sang Nhân viên kinh doanh vẫn bị chặn", async () => {
  const w = nen();
  const le = await taiKhoan(w, ["HOTEL_RECEPTION"], "0900000106", "Lễ Tân Hẹn Thôi");
  assert.equal((await ganNhan(w, le.partyId)).status, 201);
  const rid = dongNhan(w, le.partyId);
  const r = await ketThuc(w, le.partyId, rid, "2027-06-30");
  assert.equal(r.status, 400, `kết thúc tương lai: ${r.status} ${r.text}`);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, "Loại đối tác kết thúc ngay hôm nay hoặc ngày đã qua — không đặt ngày trong tương lai.");
  assert.equal(w.q("SELECT valid_to_date v FROM pty_party_role WHERE id = ?", rid)[0].v, null, "dòng loại vẫn mở");
  const doi = await w.call("PUT", `/api/staff/${le.staffId}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  assert.equal(doi.status, 409, `chiều 2: ${doi.status} ${doi.text}`);
});

test("Ruling 8 đối chứng: kết thúc loại đối tác HÔM NAY → 200, rồi đổi sang Nhân viên kinh doanh được (hết nhãn); loại CUSTOMER kết thúc ngày tương lai vẫn 200", async () => {
  const w = nen();
  const le = await taiKhoan(w, ["HOTEL_RECEPTION"], "0900000107", "Lễ Tân Thôi Hôm Nay");
  assert.equal((await ganNhan(w, le.partyId)).status, 201);
  const r = await ketThuc(w, le.partyId, dongNhan(w, le.partyId), homNay());
  assert.equal(r.status, 200, r.text);
  const doi = await w.call("PUT", `/api/staff/${le.staffId}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } });
  assert.equal(doi.status, 200, doi.text);
  const p = hoSo(w, "Khách Hẹn Thôi");
  const them = await w.call("POST", `/api/parties/${p}/roles`, { as: ADM, body: { roleTypeCode: "CUSTOMER" } });
  assert.equal(them.status, 201, them.text);
  const kh = await ketThuc(w, p, them.json.party.roles.find((x: any) => x.roleTypeCode === "CUSTOMER").id, "2027-06-30");
  assert.equal(kh.status, 200, kh.text);
});
