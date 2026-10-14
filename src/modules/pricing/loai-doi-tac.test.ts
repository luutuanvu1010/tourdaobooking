// ADR-0117 lần 1, Task 3 — loại đối tác là DỮ LIỆU: Kế toán / Quản trị / Toàn quyền thêm, tắt, bật trên màn hình (route /api/pricing/loai-doi-tac*), không migration cho mỗi loại.
// Tiêu chí N-1…N-6, N-9 và Q1 (A) của kế hoạch. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). N-5 / N-5b là bài HỒI QUY trên mã «Đã giao» đã vá ở 1.92
// (src/modules/orders/hoan-tat-repo.ts, src/modules/billing/*): bài này KHÔNG sửa các tệp đó, chỉ chứng minh loại mới đi qua đúng cổng cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1 } from "../../../tests/audit/harness.mjs";
import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { ROLE_CODES } from "../../shared/roles.ts";
import { datGiaoStatement } from "../orders/hoan-tat-repo.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác (tài khoản); hồ sơ pty-<id>
const HR = "77777777-7777-4777-8777-777777777777";
const DRV = "88888888-8888-4888-8888-888888888888"; // Tài xế công ty
const DP = "99999999-9999-4999-8999-999999999991"; // Tài xế đối tác (DRIVER_PARTNER, ADR-0048): cột ma trận «none», không phải quyền Đối tác (`holdsPartner` chỉ xét PARTNER)
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai: Kế toán + Đối tác ("có quyền Đối tác là áp")
const AT = "2026-10-01T00:00:00.000Z";
const TEN = "Nhân viên spa";
const ORG = "dda00000-0000-4000-8000-0000000000a1"; // tổ chức (hồ sơ khách) — gắn loại bằng route Danh bạ
const ORG2 = "dda00000-0000-4000-8000-0000000000a2";
const NGUOI = "dda00000-0000-4000-8000-0000000000b1"; // cá nhân
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [DRV, "0900000010", "Tài Xế", ["DRIVER"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
    [DP, "0900000012", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  for (const [id, ten] of [[ORG, "Spa Hoa Sen"], [ORG2, "Spa Lá Trà"]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  }
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Chị Mai Spa', 1, ?, ?)").run(NGUOI, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Mai', ?, ?)").run(NGUOI, AT, AT);
  return w;
}
const them = (w: W, as: string, ten: unknown = TEN) => w.call("POST", "/api/pricing/loai-doi-tac", { as, body: { ten } });
/** Thêm loại bằng Kế toán, trả mã (kiểm 201). */
async function themLoai(w: W, ten = TEN): Promise<string> {
  const r = await them(w, KT, ten);
  assert.equal(r.status, 201, r.text);
  return r.json.loai.code as string;
}
const ganLoai = (w: W, partyId: string, code: string, as = ADM) => w.call("POST", `/api/parties/${partyId}/roles`, { as, body: { roleTypeCode: code } });
async function ganOk(w: W, partyId: string, code: string): Promise<string> {
  const r = await ganLoai(w, partyId, code);
  assert.equal(r.status, 201, r.text);
  return r.json.party.roles.find((x: { roleTypeCode: string }) => x.roleTypeCode === code).id as string;
}
const tat = (w: W, code: string, as = KT) => w.call("POST", `/api/pricing/loai-doi-tac/${code}/tat`, { as, body: {} });
const bat = (w: W, code: string, as = KT) => w.call("POST", `/api/pricing/loai-doi-tac/${code}/bat`, { as, body: {} });
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const hai = (w: W, code: string): { pty: number; prc: number } => ({
  pty: dem(w, "SELECT active AS n FROM pty_role_type WHERE code = ?", code), prc: dem(w, "SELECT active AS n FROM prc_beneficiary_role WHERE role_type_code = ?", code),
});
const nhatKy = (w: W, action: string): { detail: string }[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action);
const mucVai = (w: W, code: string, tyLeBp = 1500, as = KT) =>
  w.call("POST", "/api/pricing/hoa-hong", { as, body: { doiTuong: { loai: "VAI", code }, phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } });

/** Đơn nháp bằng SQL (ngày đi = hôm nay để «Đã giao» có thể bấm), rồi xác nhận qua route. */
function nhap(w: W, booker: string | null, tong = 2_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, tong, tong, tong);
  return id;
}
async function xacNhan(w: W, id: string): Promise<void> {
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
}
const thuDu = async (w: W, id: string): Promise<void> => {
  const t = await w.call("POST", `/api/orders/${id}/payments`, { as: SA, body: { soTien: 2_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(t.status, 201, t.text);
};
const daGiao = (w: W, id: string, as = SA) => w.call("POST", `/api/orders/${id}/delivered`, { as, body: {} });
const chup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY created_at, order_service_id", id);
/** Đơn còn BỊ GIỮ ở «Đã giao»: 409 not_deliverable cho cả Quản trị lẫn Toàn quyền, không mốc giao, không phiếu. */
async function conBiGiu(w: W, id: string): Promise<void> {
  for (const as of [ADM, SA]) {
    const g = await daGiao(w, id, as);
    assert.equal(g.status, 409, `đơn phải còn bị giữ (${as}): ${g.text}`);
    assert.match(g.text, /not_deliverable/);
  }
  assert.equal(w.q("SELECT delivered_at AS d FROM orders WHERE id = ?", id)[0].d, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ?", id), 0, "không được có phiếu «Đã giao»");
}
const nguoiHuongTim = async (w: W, q: string, as = SALES): Promise<string[]> => {
  const r = await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent(q)}`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json.ketQua.map((x: { partyId: string }) => x.partyId);
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-1 — thêm loại bằng route
// ---------------------------------------------------------------------------------------------------------------------------------------------
for (const [ten, as] of [["Kế toán", KT], ["Quản trị", ADM], ["Toàn quyền", SA]] as const) {
  test(`N-1: ${ten} thêm loại «${TEN}» ⇒ 201; đúng 1 dòng loại vai (OTHER, nhãn, đang dùng), 1 dòng danh sách được hưởng, 1 dòng nhật ký không số / @`, async () => {
    const w = setup();
    const truoc = dem(w, "SELECT count(*) AS n FROM pty_role_type");
    const r = await them(w, as);
    assert.equal(r.status, 201, r.text);
    assert.match(r.json.loai.code, /^LD_[A-Z]{8}$/);
    assert.deepEqual(r.json.loai, { code: r.json.loai.code, ten: TEN, coSan: false, dangBat: true });
    assert.equal(r.headers.get("location"), "/hoa-hong", "Location trỏ trang có thật (không phải /loai-doi-tac)");
    assert.equal(dem(w, "SELECT count(*) AS n FROM pty_role_type"), truoc + 1);
    const loai = w.q("SELECT code, name, role_group, is_partner_label, active FROM pty_role_type WHERE is_partner_label = 1");
    assert.equal(loai.length, 1);
    assert.deepEqual({ ...loai[0] }, { code: r.json.loai.code, name: TEN, role_group: "OTHER", is_partner_label: 1, active: 1 });
    const huong = w.q("SELECT role_type_code, active, created_by FROM prc_beneficiary_role WHERE role_type_code = ?", r.json.loai.code);
    assert.equal(huong.length, 1);
    assert.equal(huong[0].active, 1);
    assert.equal(huong[0].created_by, as);
    const nk = nhatKy(w, "prc_partner_type_added");
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.detail, TEN);
    assert.doesNotMatch(nk[0]!.detail, /\d|@/);
  });
}

test("N-1: Bán hàng GET 200 nhưng POST 403; Hướng dẫn viên, Nhân sự, Đối tác, Tài xế, Tài xế đối tác và tài khoản lai Kế toán + Đối tác 403 cả hai; không ai bị 403 làm đổi dữ liệu", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/pricing/loai-doi-tac", { as: SALES })).status, 200);
  const truoc = [dem(w, "SELECT count(*) AS n FROM pty_role_type"), dem(w, "SELECT count(*) AS n FROM prc_beneficiary_role"), dem(w, "SELECT count(*) AS n FROM audit_log")];
  assert.equal((await them(w, SALES)).status, 403);
  for (const as of [HDV, HR, DT, DRV, DP, KP]) {
    assert.equal((await w.call("GET", "/api/pricing/loai-doi-tac", { as })).status, 403, `GET ${as}`);
    assert.equal((await them(w, as)).status, 403, `POST ${as}`);
  }
  const ma = await themLoai(w, "Loại thử quyền");
  for (const as of [SALES, HDV, HR, DT, DRV, DP, KP]) {
    assert.equal((await tat(w, ma, as)).status, 403, `tắt ${as}`);
    assert.equal((await bat(w, ma, as)).status, 403, `bật ${as}`);
  }
  assert.deepEqual(hai(w, ma), { pty: 1, prc: 1 });
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM pty_role_type") - 1, dem(w, "SELECT count(*) AS n FROM prc_beneficiary_role") - 1, dem(w, "SELECT count(*) AS n FROM audit_log") - 1], truoc);
});

test("N-1: tên trùng (khác dấu, khác hoa thường) ⇒ 409 loai_trung; trùng tên loại sẵn có ⇒ 409; rỗng ⇒ 400; có số điện thoại / email ⇒ 400; không ghi gì", async () => {
  const w = setup();
  await themLoai(w);
  const truoc = [dem(w, "SELECT count(*) AS n FROM pty_role_type"), dem(w, "SELECT count(*) AS n FROM prc_beneficiary_role"), dem(w, "SELECT count(*) AS n FROM audit_log")];
  const trung = await them(w, KT, "nhan vien SPA");
  assert.equal(trung.status, 409, trung.text);
  assert.equal(trung.json.error.code, "loai_trung");
  assert.equal((await them(w, KT, "CÔNG TY LỮ HÀNH")).status, 409, "trùng loại sẵn có (không phân biệt dấu / hoa)");
  for (const x of ["", "   ", "x", "x".repeat(61), null, 5, "Gọi 0901 234 567", "lan@spa.vn"]) assert.equal((await them(w, KT, x)).status, 400, String(x));
  assert.equal((await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: {} })).status, 400);
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM pty_role_type"), dem(w, "SELECT count(*) AS n FROM prc_beneficiary_role"), dem(w, "SELECT count(*) AS n FROM audit_log")], truoc);
});

test("N-1: GET liệt kê năm vai bên ngoài có sẵn (coSan, đang bật) và loại mới (không coSan); dòng lệch một cờ báo dangBat = false (Ruling 2)", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const r = await w.call("GET", "/api/pricing/loai-doi-tac", { as: SALES });
  assert.equal(r.status, 200, r.text);
  const sanCo = r.json.loai.filter((x: { coSan: boolean }) => x.coSan);
  assert.deepEqual(sanCo.map((x: { code: string }) => x.code).sort(), ["COLLABORATOR", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "TRAVEL_AGENCY"]);
  assert.ok(sanCo.every((x: { dangBat: boolean }) => x.dangBat));
  assert.deepEqual(r.json.loai.filter((x: { coSan: boolean }) => !x.coSan), [{ code: ma, ten: TEN, coSan: false, dangBat: true }]);
  const dto = async () => (await w.call("GET", "/api/pricing/loai-doi-tac", { as: KT })).json.loai.find((x: { code: string }) => x.code === ma).dangBat;
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = ?").run(ma);
  assert.equal(await dto(), false, "chỉ cờ danh sách được hưởng tắt ⇒ lệch");
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 1 WHERE role_type_code = ?").run(ma);
  assert.equal(await dto(), true);
  w.sqlite.prepare("UPDATE pty_role_type SET active = 0 WHERE code = ?").run(ma);
  assert.equal(await dto(), false, "chỉ cờ loại vai tắt ⇒ lệch");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-2 — loại mới không sinh quyền, không là vai đăng nhập
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-2: thêm loại không đổi ROLE_CODES, không đổi quyền nào; PUT roles với mã loại mới ⇒ 400; gắn loại cho hồ sơ tài khoản Đối tác không đổi quyền", async () => {
  const w = setup();
  const quyen = () => w.q("SELECT staff_id, permission_type_code, valid_to_at FROM stf_permission ORDER BY staff_id, permission_type_code, valid_from_at");
  const truoc = quyen();
  const ma = await themLoai(w);
  assert.ok(!(ROLE_CODES as readonly string[]).includes(ma), "mã loại đối tác không phải mã vai đăng nhập");
  assert.deepEqual(quyen(), truoc, "thêm loại không chạm quyền");
  const dongQuyenVai = dem(w, "SELECT count(*) AS n FROM pty_party_role");
  const put = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: ADM, body: { roles: [ma] } });
  assert.equal(put.status, 400, put.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM pty_party_role"), dongQuyenVai, "PUT bị từ chối không ghi vai");
  assert.deepEqual(quyen(), truoc);
  const dtQuyen = w.q("SELECT permission_type_code FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", DT).map((x: { permission_type_code: string }) => x.permission_type_code);
  await ganOk(w, `pty-${DT}`, ma);
  assert.deepEqual(w.q("SELECT permission_type_code FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", DT).map((x: { permission_type_code: string }) => x.permission_type_code), dtQuyen);
  assert.deepEqual(quyen(), truoc, "gắn loại cho hồ sơ không sinh / thu quyền nào");
  assert.deepEqual(dtQuyen, ["PARTNER"]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-3 — gắn loại mới cho hồ sơ tổ chức; chọn làm bên đặt; đối chứng vai đăng nhập
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-3: Quản trị gắn loại mới cho hồ sơ tổ chức ⇒ 201; hiện ở tìm người hưởng (Bán hàng); chọn làm bên đặt khi lập đơn; đối chứng TRAVEL_AGENCY ⇒ 409 role_via_account", async () => {
  const w = setup();
  const ma = await themLoai(w);
  assert.ok(!(await nguoiHuongTim(w, "Hoa Sen")).includes(ORG), "chưa gắn loại ⇒ chưa là người hưởng");
  await ganOk(w, ORG, ma);
  assert.ok((await nguoiHuongTim(w, "Hoa Sen")).includes(ORG), "hồ sơ mang loại mới hiện ở tìm người hưởng");
  const don = await w.call("POST", "/api/orders", { as: SALES, body: {
    customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: ORG,
    services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  } });
  assert.equal(don.status, 201, don.text);
  assert.equal(don.json.order.bookerPartyId, ORG);
  assert.equal(don.json.order.bookerLaDoiTac, true);
  const cu = await ganLoai(w, ORG2, "TRAVEL_AGENCY");
  assert.equal(cu.status, 409, cu.text);
  assert.equal(cu.json.error.code, "role_via_account");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-4 — mức theo loại mới, bản chụp lúc Xác nhận
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-4: Kế toán đặt mức theo loại mới; đơn của hồ sơ mang loại, xác nhận ⇒ bản chụp SET đúng 15% và đúng người hưởng", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, ORG, ma);
  const m = await mucVai(w, ma, 1500);
  assert.equal(m.status, 201, m.text);
  assert.deepEqual(m.json.dong.doiTuong, { loai: "VAI", code: ma, ten: TEN });
  const id = nhap(w, ORG);
  await xacNhan(w, id);
  const c = chup(w, id);
  assert.equal(c.length, 1);
  assert.equal(c[0].commission_status, "SET");
  assert.equal(c[0].commission_kind, "RATE");
  assert.equal(c[0].commission_rate_bp, 1500);
  assert.equal(c[0].beneficiary_party_id, ORG);
  assert.equal(c[0].missing_reason, null);
});

test("N-4: chưa có mức theo loại ⇒ bản chụp MISSING / NO_RULE, không bao giờ 0", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, ORG, ma);
  const id = nhap(w, ORG);
  await xacNhan(w, id);
  const c = chup(w, id);
  assert.equal(c[0].commission_status, "MISSING");
  assert.equal(c[0].missing_reason, "NO_RULE");
  assert.equal(c[0].commission_rate_bp, null);
  assert.equal(c[0].commission_per_pax, null);
  assert.equal(c[0].beneficiary_party_id, ORG);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-5, N-5b — «Đã giao» (HỒI QUY trên mã đã vá ở 1.92; không sửa hoan-tat-repo.ts hay billing)
// ---------------------------------------------------------------------------------------------------------------------------------------------
/** Đơn ĐÃ xác nhận của tài khoản Đối tác DT, hồ sơ chỉ mang loại mới; đã thu đủ. */
async function donCuaLoaiMoi(w: W, coMuc = true): Promise<{ id: string; ma: string }> {
  const ma = await themLoai(w);
  if (coMuc) assert.equal((await mucVai(w, ma)).status, 201);
  await ganOk(w, `pty-${DT}`, ma);
  const id = nhap(w, `pty-${DT}`);
  await xacNhan(w, id);
  await thuDu(w, id);
  return { id, ma };
}

test("N-5: đơn có bên đặt chỉ mang loại mới KHÔNG bấm được «Đã giao» — câu ghi của orders và cờ billing (booker_partner), kể cả Quản trị / Toàn quyền bấm", async () => {
  const w = setup();
  const { id } = await donCuaLoaiMoi(w);
  assert.equal(chup(w, id)[0].commission_status, "SET");
  await conBiGiu(w, id);
  const tien = await w.call("GET", `/api/orders/${id}/payments`, { as: SA });
  assert.equal(tien.status, 200, tien.text);
  assert.equal(tien.json.lyDoChuaGiao.ma, "booker_partner", "cờ billing");
  // Lớp SQL của chính câu «Đã giao» (không qua bước kiểm trước của route): không dòng nào đổi.
  const o = w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0] as { updated_at: string };
  const kq = await datGiaoStatement(fakeD1(w.sqlite) as unknown as D1Database, {
    orderId: id, at: new Date().toISOString(), by: SA, expectedUpdatedAt: o.updated_at, expectedAdjSeq: 0, homNay: vnHomNay(), sauCauBaoVe: false,
  }).run();
  assert.equal((kq.meta as { changes: number }).changes, 0, "câu UPDATE «Đã giao» phải không đổi dòng nào");
});

test("N-5: chưa có mức (bản chụp MISSING nhưng vẫn có người hưởng) ⇒ cũng bị giữ", async () => {
  const w = setup();
  const { id } = await donCuaLoaiMoi(w, false);
  assert.equal(chup(w, id)[0].commission_status, "MISSING");
  await conBiGiu(w, id);
});

test("N-5b (a): Kế toán TẮT loại sau khi đơn đã chụp ⇒ đơn vẫn bị giữ", async () => {
  const w = setup();
  const { id, ma } = await donCuaLoaiMoi(w);
  assert.equal((await tat(w, ma)).status, 200);
  await conBiGiu(w, id);
});

test("N-5b (b): Quản trị KẾT THÚC loại của hồ sơ sau khi đơn đã chụp ⇒ đơn vẫn bị giữ", async () => {
  const w = setup();
  const { id, ma } = await donCuaLoaiMoi(w);
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? AND role_type_code = ?", `pty-${DT}`, ma)[0].id as string;
  assert.equal((await w.call("POST", `/api/parties/pty-${DT}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  await conBiGiu(w, id);
});

test("N-5b (c): PUT roles đổi tài khoản đối tác sang SALES_STAFF — khi hồ sơ còn mang loại ⇒ 409 (luật «nội bộ», mã account_rule), khi đã kết thúc loại ⇒ 200; cả hai trường hợp đơn vẫn bị giữ", async () => {
  const w = setup();
  const { id, ma } = await donCuaLoaiMoi(w);
  const chan = await w.call("PUT", `/api/staff/${DT}/roles`, { as: ADM, body: { roles: ["SALES_STAFF"] } });
  assert.equal(chan.status, 409, chan.text);
  assert.equal(chan.json.error.code, "account_rule");
  assert.match(chan.json.error.message, /không nhận thêm vai nội bộ/);
  await conBiGiu(w, id);
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? AND role_type_code = ?", `pty-${DT}`, ma)[0].id as string;
  assert.equal((await w.call("POST", `/api/parties/pty-${DT}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  const doi = await w.call("PUT", `/api/staff/${DT}/roles`, { as: ADM, body: { roles: ["SALES_STAFF"] } });
  assert.equal(doi.status, 200, doi.text);
  await conBiGiu(w, id);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Ruling 9 (kiểm toàn nhánh): loại đối tác không đặt trước ngày BẮT ĐẦU. Phía tiền đọc vai «đang mở» chỉ theo valid_to_date IS NULL (v_pty_open_role, LA_HUONG,
// VAI_MO) và bỏ qua valid_from_date, nên một dòng loại bắt đầu 30 ngày nữa thành người hưởng NGAY (bản chụp SET 15%). Chặn ở cửa vào, cạnh Ruling 7 (ngày kết thúc).
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("Ruling 9: gắn loại đối tác với ngày bắt đầu TƯƠNG LAI → 400, không chèn dòng, đơn xác nhận hôm nay KHÔNG ra người hưởng (không bản chụp SET)", async () => {
  const w = setup();
  const ma = await themLoai(w);
  assert.equal((await mucVai(w, ma)).status, 201);
  const r = await w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: ma, validFrom: inDays(30) } });
  // Bằng chứng hậu quả (đỏ trên mã trước sửa: dòng được chèn, bản chụp SET 1500 trỏ ORG).
  const id = nhap(w, ORG);
  await xacNhan(w, id);
  const c = chup(w, id);
  assert.equal(c.length, 1);
  assert.equal(c[0].commission_status, "NONE", `bản chụp không được là SET cho dòng loại chưa hiệu lực: ${c[0].commission_status} / ${c[0].commission_rate_bp} / ${c[0].beneficiary_party_id}`);
  assert.equal(r.status, 400, `ngày bắt đầu tương lai: ${r.status} ${r.text}`);
  assert.equal(r.json.error.code, "invalid_input");
  assert.equal(r.json.error.message, "Loại đối tác có hiệu lực từ hôm nay — không đặt ngày bắt đầu trong tương lai.");
  assert.equal(dem(w, "SELECT count(*) AS n FROM pty_party_role WHERE party_id = ? AND role_type_code = ?", ORG, ma), 0, "không chèn dòng loại");
});

test("Ruling 9 đối chứng: ngày bắt đầu hôm nay / quá khứ / để trống → 201; loại KHÔNG phải nhãn (CUSTOMER) vẫn nhận ngày bắt đầu tương lai", async () => {
  const w = setup();
  const ma = await themLoai(w);
  for (const [party, validFrom] of [[ORG, vnHomNay()], [ORG2, inDays(-30)], [NGUOI, undefined]] as const) {
    const r = await w.call("POST", `/api/parties/${party}/roles`, { as: ADM, body: validFrom === undefined ? { roleTypeCode: ma } : { roleTypeCode: ma, validFrom } });
    assert.equal(r.status, 201, `${party} ${validFrom}: ${r.text}`);
  }
  const kh = await w.call("POST", `/api/parties/${NGUOI}/roles`, { as: ADM, body: { roleTypeCode: "CUSTOMER", validFrom: inDays(30) } });
  assert.equal(kh.status, 201, kh.text);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-6 — tắt / bật
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-6: tắt loại đặt CẢ HAI cờ; Danh bạ gán mới ⇒ 409 role_type_inactive; tìm người hưởng không thấy; dòng mức cũ + dòng gắn đang mở giữ; đơn đã chụp không đổi; R-PRC-2 báo", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, ORG, ma);
  assert.equal((await mucVai(w, ma)).status, 201);
  const id = nhap(w, ORG);
  await xacNhan(w, id);
  const chupTruoc = chup(w, id);
  const r = await tat(w, ma);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.loai, { code: ma, ten: TEN, coSan: false, dangBat: false });
  assert.deepEqual(hai(w, ma), { pty: 0, prc: 0 });
  const gan = await ganLoai(w, ORG2, ma);
  assert.equal(gan.status, 409, gan.text);
  assert.equal(gan.json.error.code, "role_type_inactive");
  assert.ok(!(await nguoiHuongTim(w, "Hoa Sen")).includes(ORG), "hồ sơ mang loại đã tắt không còn ở tìm người hưởng");
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_commission_rule WHERE target_role_code = ? AND valid_to_date IS NULL", ma), 1, "dòng mức cũ còn");
  assert.equal(dem(w, "SELECT count(*) AS n FROM pty_party_role WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL", ORG, ma), 1, "dòng gắn đang mở giữ");
  assert.deepEqual(chup(w, id), chupTruoc, "đơn đã chụp không đổi");
  const rprc2 = CHECKS.find((c: { code: string }) => c.code === "R-PRC-2")!;
  assert.equal(Number(Object.values(w.sqlite.prepare(rprc2.sql.replace(/\s+/g, " ")).get() as object)[0]), 1, "R-PRC-2 báo dòng mức theo loại đã tắt");
  const nk = nhatKy(w, "prc_partner_type_off");
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.detail, TEN);
  // /tat lần hai: đã ở đúng trạng thái ⇒ 409 stale, không thêm nhật ký.
  const hai2 = await tat(w, ma);
  assert.equal(hai2.status, 409, hai2.text);
  assert.equal(hai2.json.error.code, "stale");
  assert.equal(nhatKy(w, "prc_partner_type_off").length, 1);
  // /bat bật lại CẢ HAI cờ.
  const b = await bat(w, ma);
  assert.equal(b.status, 200, b.text);
  assert.deepEqual(b.json.loai, { code: ma, ten: TEN, coSan: false, dangBat: true });
  assert.deepEqual(hai(w, ma), { pty: 1, prc: 1 });
  assert.ok((await nguoiHuongTim(w, "Hoa Sen")).includes(ORG));
  assert.equal(nhatKy(w, "prc_partner_type_on").length, 1);
  assert.equal((await bat(w, ma)).status, 409, "/bat lần hai ⇒ stale");
  assert.equal((await ganLoai(w, ORG2, ma)).status, 201, "bật lại ⇒ gán mới được");
});

test("N-6: /tat và /bat cho mã không phải loại đối tác — năm vai bên ngoài có sẵn, vai nội bộ, mã lạ ⇒ 404, KHÔNG đổi cờ nào", async () => {
  const w = setup();
  const truoc = [w.q("SELECT code, active FROM pty_role_type ORDER BY code"), w.q("SELECT role_type_code, active, updated_at FROM prc_beneficiary_role ORDER BY role_type_code")];
  const nk = dem(w, "SELECT count(*) AS n FROM audit_log");
  for (const ma of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "SALES_STAFF", "CUSTOMER", "LD_KHONGCOGI", "khong-hop-le"]) {
    assert.equal((await tat(w, ma)).status, 404, `tắt ${ma}`);
    assert.equal((await bat(w, ma)).status, 404, `bật ${ma}`);
  }
  assert.deepEqual([w.q("SELECT code, active FROM pty_role_type ORDER BY code"), w.q("SELECT role_type_code, active, updated_at FROM prc_beneficiary_role ORDER BY role_type_code")], truoc);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log"), nk);
});

test("N-6: lệch cờ (đặt tay chỉ một cờ) ⇒ DTO báo dangBat = false; /bat kéo loại có cờ vai tắt về đủ hai cờ; /tat khi cờ vai đã tắt ⇒ 409 và KHÔNG bật lại cờ nào", async () => {
  const w = setup();
  const ma = await themLoai(w);
  w.sqlite.prepare("UPDATE pty_role_type SET active = 0 WHERE code = ?").run(ma);
  const nk0 = dem(w, "SELECT count(*) AS n FROM audit_log");
  assert.equal((await tat(w, ma)).status, 409, "cờ loại vai đã tắt ⇒ câu cập nhật 0 dòng");
  assert.deepEqual(hai(w, ma), { pty: 0, prc: 1 }, "không chạm cờ danh sách được hưởng khi câu đầu thua");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log"), nk0, "bên thua không để lại nhật ký");
  const b = await bat(w, ma);
  assert.equal(b.status, 200, b.text);
  assert.deepEqual(hai(w, ma), { pty: 1, prc: 1 });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-9 — mỗi chỗ đọc «người hưởng» một ca chạy thật với loại OTHER
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-9: cờ bookerLaDoiTac của đơn, /api/auth/me (bên đặt máy chủ ép), thử tra, tìm người hưởng — theo loại mới, đổi theo tắt / bật", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, ORG, ma);
  await ganOk(w, `pty-${DT}`, ma);
  assert.equal((await mucVai(w, ma)).status, 201);
  const id = nhap(w, ORG);
  const co = async () => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order.bookerLaDoiTac;
  const me = async () => (await w.call("GET", "/api/auth/me", { as: DT })).json.benDatCuaToi;
  const thuTra = async () => (await w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=ZA1&ngay=${vnHomNay()}`, { as: SALES })).json;
  assert.equal(await co(), true, "bookerLaDoiTac");
  assert.deepEqual(await me(), { partyId: `pty-${DT}`, ten: "Đối Tác Một" }, "/me: tài khoản Đối tác có hồ sơ mang loại mới ⇒ báo bên đặt ép");
  const t1 = await thuTra();
  assert.equal(t1.nguoiHuong.loai, "HUONG");
  assert.deepEqual(t1.nguoiHuong.vai, [TEN]);
  assert.equal(t1.ketQua.trangThai, "SET");
  assert.ok((await nguoiHuongTim(w, "Hoa Sen")).includes(ORG));
  assert.equal((await tat(w, ma)).status, 200);
  assert.equal(await co(), false, "bookerLaDoiTac theo cờ danh sách được hưởng: loại tắt ⇒ false");
  assert.equal(await me(), null, "/me: loại tắt ⇒ máy chủ không ép");
  const t2 = await thuTra();
  assert.equal(t2.nguoiHuong.loai, "KHONG_HUONG", "Q1 (A): hồ sơ mang loại đã tắt ⇒ KHONG_HUONG");
  assert.deepEqual(t2.ketQua, { trangThai: "MISSING", lyDo: t2.ketQua.lyDo });
  assert.ok(!(await nguoiHuongTim(w, "Hoa Sen")).includes(ORG));
  assert.equal((await bat(w, ma)).status, 200);
  assert.equal(await co(), true);
  assert.deepEqual(await me(), { partyId: `pty-${DT}`, ten: "Đối Tác Một" });
});

test("N-9: trigger mức riêng cho hồ sơ — hồ sơ mang loại mới ⇒ 201; hồ sơ không mang loại hưởng nào ⇒ 400; sau khi tắt loại ⇒ 400", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, ORG, ma);
  const rieng = (partyId: string) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-01-01" } });
  assert.equal((await rieng(ORG)).status, 201);
  const khong = await rieng(ORG2);
  assert.equal(khong.status, 400, khong.text);
  assert.match(khong.json.error.message, /không mang vai được hưởng/);
  await ganOk(w, ORG2, ma);
  assert.equal((await tat(w, ma)).status, 200);
  assert.equal((await rieng(ORG2)).status, 400, "loại đã tắt ⇒ không còn là hồ sơ được hưởng");
});

test("N-9: R-PRC-5 — mức riêng theo hồ sơ mang loại mới: 0 khi loại đang bật; 1 khi hồ sơ mất loại (kết thúc) hoặc loại bị tắt", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const rid = await ganOk(w, ORG, ma);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId: ORG }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1200, tuNgay: "2026-01-01" } })).status, 201);
  const c = CHECKS.find((x: { code: string }) => x.code === "R-PRC-5")!;
  const dem5 = () => Number(Object.values(w.sqlite.prepare(c.sql.replace(/\s+/g, " ")).get() as object)[0]);
  assert.equal(dem5(), 0);
  assert.equal((await tat(w, ma)).status, 200);
  assert.equal(dem5(), 1, "loại tắt ⇒ hồ sơ không còn vai được hưởng ⇒ cảnh báo");
  assert.equal((await bat(w, ma)).status, 200);
  assert.equal(dem5(), 0);
  assert.equal((await w.call("POST", `/api/parties/${ORG}/roles/${rid}/end`, { as: ADM, body: {} })).status, 200);
  assert.equal(dem5(), 1, "hồ sơ kết thúc loại ⇒ cảnh báo");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Q1 (A) — đơn MỚI của hồ sơ mang loại đã TẮT bị giữ, không bao giờ 0
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("Q1 (A): đơn xác nhận SAU khi loại bị tắt (bên đặt là cá nhân mang loại) ⇒ bản chụp MISSING / BOOKER_NOT_BENEFICIARY có người hưởng, không 0; «Đã giao» bị giữ", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await ganOk(w, NGUOI, ma);
  assert.equal((await mucVai(w, ma)).status, 201);
  assert.equal((await tat(w, ma)).status, 200);
  const id = nhap(w, NGUOI);
  await xacNhan(w, id);
  const c = chup(w, id);
  assert.equal(c.length, 1);
  assert.equal(c[0].commission_status, "MISSING", "không NONE, không 0");
  assert.equal(c[0].missing_reason, "BOOKER_NOT_BENEFICIARY");
  assert.equal(c[0].beneficiary_party_id, NGUOI);
  assert.equal(c[0].commission_rate_bp, null);
  assert.equal(c[0].commission_per_pax, null);
  await thuDu(w, id);
  await conBiGiu(w, id);
  // Đối chứng cùng khuôn: vai OTHER KHÔNG nhãn (khách thường) vẫn NONE.
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('dda00000-0000-4000-8000-0000000000c1', 'PERSON', 'Khách Thường', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('dda00000-0000-4000-8000-0000000000c1', 'Khách', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-c1', 'dda00000-0000-4000-8000-0000000000c1', 'CUSTOMER', '2026-01-01', ?, ?)").run(AT, AT);
  const thuong = nhap(w, "dda00000-0000-4000-8000-0000000000c1");
  await xacNhan(w, thuong);
  assert.equal(chup(w, thuong)[0].commission_status, "NONE");
});
