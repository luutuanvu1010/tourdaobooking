// ADR-0213 Đ3, Đ4 (mốc B1 đợt 2 đăng ký, Task 11) qua route thật (tests/audit/harness.mjs — cả ứng dụng trên SQLite thật dựng từ migrations/). Mọi giá trị là GIẢ.
// Ví dụ của chủ (16/11): anh Nam, lễ tân khách sạn Sunrise, lập đơn «Lễ tân» (đơn của anh) hoặc «Khách sạn Sunrise» (đơn của khách sạn, giá theo cấp độ đại lý của khách sạn).
// «Tư cách» chỉ quyết bên đặt của đơn đang lập; bên đặt chốt lúc lập (lưu nháp gửi bên đặt khác ⇒ 409); liên kết đóng ⇒ 403; nhật ký mang tổ chức (audit_log.acting_party_id)
// chỉ ở đơn thay mặt tổ chức; ba đường cùng một đơn (văn phòng lập cho tổ chức; người quản lý thay mặt) ⇒ cùng dòng tiền tới từng đồng (so dòng tiền, không so bản chụp).
// Sổ vàng: luật tính không đổi — chỉ «ai là bên đặt» đổi. Ở B1 tư cách tổ chức chỉ có ở người quản lý CÓ HIỆU LỰC (ruling R4); thành viên mở ở B2 (Task 16).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const NAM = "66666666-6666-4666-8666-666666666601"; // lễ tân: hồ sơ cá nhân mang vai đối tác riêng + người quản lý của Sunrise
const CHI = "66666666-6666-4666-8666-666666666602"; // chỉ làm cho tổ chức: hồ sơ không vai riêng, người quản lý của Biển Xanh
const TV = "66666666-6666-4666-8666-666666666603"; // thành viên Sunrise (B1: chưa thay mặt được)
const SUNRISE = "dda00000-0000-4000-8000-0000000000a1";
const BIEN_XANH = "dda00000-0000-4000-8000-0000000000a2";
const KHAC = "dda00000-0000-4000-8000-0000000000a3"; // tổ chức đối tác Nam KHÔNG gắn
const KHACH = "dda00000-0000-4000-8000-0000000000a4"; // khách lẻ
const AT = "2026-10-01T00:00:00.000Z";
const CAU_KHONG_CON = "Bạn không còn thay mặt tổ chức này";
const CAU_KHOA = "Đơn đã lập theo một tư cách nên không đổi bên đặt được. Hãy lập đơn mới.";

type W = ReturnType<typeof world>;
function toChuc(w: W, id: string, ten: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${id}`, id, AT, AT);
}
function lienKet(w: W, person: string, org: string, loai: "MANAGER_OF" | "MEMBER_OF"): string {
  const id = `lk-${person}-${org}`;
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-10-01', ?, ?)")
    .run(id, person, org, loai, AT, AT);
  return id;
}
const muc = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", ...body } });
async function setup(): Promise<W> {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: NAM, phone: "0900000021", name: "Nam Lễ Tân", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: CHI, phone: "0900000022", name: "Chi Biển Xanh", perms: ["PARTNER"], kieuCu: true });
  seedStaff(w.sqlite, { id: TV, phone: "0900000023", name: "Tú Thành Viên", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  toChuc(w, SUNRISE, "Khách sạn Sunrise");
  toChuc(w, BIEN_XANH, "Khách sạn Biển Xanh");
  toChuc(w, KHAC, "Đại lý Khác");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Khách Lẻ', 1, ?, ?)").run(KHACH, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Khách Lẻ', ?, ?)").run(KHACH, AT, AT);
  lienKet(w, `pty-${NAM}`, SUNRISE, "MANAGER_OF");
  lienKet(w, `pty-${CHI}`, BIEN_XANH, "MANAGER_OF");
  lienKet(w, `pty-${TV}`, SUNRISE, "MEMBER_OF");
  // Sổ vàng: mức chung của Công ty lữ hành 10%; mức riêng của Sunrise 15% (mức theo đối tác — ADR-0161) — đơn «Sunrise» phải đi theo cấp của Sunrise, đơn «Lễ tân» theo cấp của anh Nam.
  assert.equal((await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).status, 201);
  assert.equal((await muc(w, { doiTuong: { loai: "DOI_TAC", partyId: SUNRISE }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1500 })).status, 201);
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const NGAY = inDays(4);
const thanDon = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: NGAY }],
  ...extra,
});
const lap = (w: W, as: string, extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: thanDon(extra) });
const mocCua = (w: W, id: string): string => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u as string;
const luu = (w: W, as: string, id: string, extra: Record<string, unknown> = {}) => w.call("PUT", `/api/orders/${id}`, { as, body: thanDon({ expectedUpdatedAt: mocCua(w, id), ...extra }) });
const don = (w: W, id: string) => ({ ...w.q("SELECT booker_party_id AS b, acting_party_id AS a, acting_link_kind AS k FROM orders WHERE id = ?", id)[0] }) as { b: string | null; a: string | null; k: string | null };
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const nhatKyThayMat = (w: W, id: string): (string | null)[] => [...new Set(w.q("SELECT acting_party_id AS a FROM audit_log WHERE order_id = ?", id).map((r: { a: string | null }) => r.a))];
/** Dòng tiền của một đơn đã xác nhận: tiền đơn, dòng tiền, bản chụp người hưởng / hoa hồng — KHÔNG có mã, người lập, giờ (khác nhau là đúng). */
function dongTien(w: W, id: string) {
  return {
    don: w.q("SELECT subtotal, discount, total, remaining_amount, booker_party_id, payment_term, status FROM orders WHERE id = ?", id),
    dong: w.q("SELECT description, quantity, unit_price, line_total, catalog_code, catalog_price, pax_code, line_kind FROM order_item WHERE order_id = ? ORDER BY sort_order, pax_code", id),
    chup: w.q(`SELECT beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax, commission_rule_id, supply_status, seller_party_id,
                      supplier_party_id, cost_rate_bp, supply_term_id, source, captured_date FROM ord_service_terms WHERE order_id = ?`, id),
  };
}

test("GET /api/to-chuc/cua-toi: cá nhân (nếu hồ sơ mang vai riêng) + tổ chức mình là người quản lý có hiệu lực hoặc thành viên (B2, Task 16 — P30); văn phòng rỗng", async () => {
  const w = await setup();
  const nam = await w.call("GET", "/api/to-chuc/cua-toi", { as: NAM });
  assert.equal(nam.status, 200, nam.text);
  assert.deepEqual(nam.json, { tuCach: [{ partyId: `pty-${NAM}`, ten: "Nam Lễ Tân", laToChuc: false }, { partyId: SUNRISE, ten: "Khách sạn Sunrise", laToChuc: true }] });
  assert.deepEqual((await w.call("GET", "/api/to-chuc/cua-toi", { as: CHI })).json, { tuCach: [{ partyId: BIEN_XANH, ten: "Khách sạn Biển Xanh", laToChuc: true }] }, "Đ3.3: không vai riêng ⇒ không tư cách cá nhân");
  assert.deepEqual((await w.call("GET", "/api/to-chuc/cua-toi", { as: TV })).json, { tuCach: [{ partyId: `pty-${TV}`, ten: "Tú Thành Viên", laToChuc: false }, { partyId: SUNRISE, ten: "Khách sạn Sunrise", laToChuc: true }] }, "B2 (Task 16): thành viên có tư cách tổ chức (R4 hết hiệu lực)");
  assert.deepEqual((await w.call("GET", "/api/to-chuc/cua-toi", { as: SALES })).json, { tuCach: [] });
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-10-02' WHERE id = ?").run(`r-${SUNRISE}`);
  assert.deepEqual((await w.call("GET", "/api/to-chuc/cua-toi", { as: NAM })).json.tuCach.map((t: { partyId: string }) => t.partyId), [`pty-${NAM}`], "tổ chức thôi vai được hưởng ⇒ không ai thay mặt (Đ1)");
});

test("ví dụ của chủ: anh Nam lập hai đơn «Lễ tân» và «Khách sạn Sunrise» ⇒ bên đặt, tư cách, cấp hoa hồng đúng từng đơn; nhật ký mang Sunrise chỉ ở đơn Sunrise", async () => {
  const w = await setup();
  const leTan = await lap(w, NAM, {});
  assert.equal(leTan.status, 201, leTan.text);
  const sunrise = await lap(w, NAM, { tuCach: SUNRISE, bookerPartyId: KHAC });
  assert.equal(sunrise.status, 201, sunrise.text);
  const a = leTan.json.order.id as string;
  const b = sunrise.json.order.id as string;
  assert.deepEqual(don(w, a), { b: `pty-${NAM}`, a: `pty-${NAM}`, k: "CA_NHAN" }, "vắng tư cách ⇒ tư cách cá nhân (Đ3.1)");
  assert.deepEqual(don(w, b), { b: SUNRISE, a: SUNRISE, k: "MANAGER" }, "tư cách quyết bên đặt — bên đặt thân gửi bị bỏ qua như hôm nay");
  for (const id of [a, b]) assert.equal((await w.xacNhanDon(id, NAM)).status, 200);
  assert.deepEqual(w.q("SELECT beneficiary_party_id AS b, commission_rate_bp AS r FROM ord_service_terms WHERE order_id = ?", a).map((x: object) => ({ ...x })), [{ b: `pty-${NAM}`, r: 1000 }]);
  assert.deepEqual(w.q("SELECT beneficiary_party_id AS b, commission_rate_bp AS r FROM ord_service_terms WHERE order_id = ?", b).map((x: object) => ({ ...x })), [{ b: SUNRISE, r: 1500 }], "cấp độ đại lý của Sunrise");
  assert.deepEqual(nhatKyThayMat(w, b), [SUNRISE], "mọi dòng nhật ký của đơn Sunrise (lập, gửi, xác nhận) mang tổ chức");
  assert.deepEqual(nhatKyThayMat(w, a), [null], "đơn cá nhân: không thay mặt ai");
  const vp = await lap(w, SALES, { bookerPartyId: SUNRISE });
  assert.equal(vp.status, 201, vp.text);
  assert.deepEqual(don(w, vp.json.order.id), { b: SUNRISE, a: null, k: null }, "đơn văn phòng: không tư cách");
  assert.deepEqual(nhatKyThayMat(w, vp.json.order.id), [null]);
});

test("Đ4.2 sổ vàng: cùng một đơn Trả sau — văn phòng lập cho Sunrise / người quản lý thay mặt Sunrise ⇒ cùng dòng tiền, cùng hoa hồng, cùng công nợ đại lý tới từng đồng; nợ ghi cho Sunrise", async () => {
  const w = await setup();
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: SUNRISE, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 12, lyDo: "thử" } })).status, 201);
  const vp = await lap(w, SALES, { bookerPartyId: SUNRISE, paymentTerm: "CREDIT" });
  assert.equal(vp.status, 201, vp.text);
  assert.equal((await w.xacNhanDon(vp.json.order.id, SALES)).status, 200);
  const ql = await lap(w, NAM, { tuCach: SUNRISE, paymentTerm: "CREDIT" });
  assert.equal(ql.status, 201, ql.text);
  assert.equal((await w.xacNhanDon(ql.json.order.id, NAM)).status, 200);
  const x = dongTien(w, vp.json.order.id);
  const y = dongTien(w, ql.json.order.id);
  assert.equal(x.chup.length, 1, "chống bài rỗng: có bản chụp");
  assert.equal(x.chup[0].beneficiary_party_id, SUNRISE);
  assert.equal(x.don[0].total, 1_000_000);
  assert.equal(x.don[0].payment_term, "CREDIT");
  assert.deepEqual(y, x);
  // Công nợ đại lý (ADR-0182: giá đại lý = thành tiền − hoa hồng chụp lúc xác nhận): cùng phiếu (trừ mã đơn).
  const phieu = async (id: string) => {
    const r = await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as: SUP });
    assert.equal(r.status, 200, r.text);
    const { maDon: _m, hanTra, ...con } = r.json.phieu; // mã đơn, hạn trả (theo giờ xác nhận) khác nhau là đúng — không phải tiền
    assert.ok(hanTra, "đơn Trả sau có hạn trả");
    return con;
  };
  const px = await phieu(vp.json.order.id);
  assert.equal(px.tong, 850_000, "1.000.000 − 15% hoa hồng của Sunrise");
  assert.deepEqual(await phieu(ql.json.order.id), px);
  // Nợ Trả sau ghi cho hồ sơ bên đặt Sunrise (cả hai đơn), không cho anh Nam.
  const noCua = async (party: string) => {
    const r = await w.call("GET", `/api/tra-sau/han-muc/${party}/don`, { as: SUP });
    assert.equal(r.status, 200, r.text);
    return (r.json.don as { orderId: string; no: number }[]).map((d) => [d.orderId, d.no]).sort();
  };
  assert.deepEqual(await noCua(SUNRISE), [[vp.json.order.id, 850_000], [ql.json.order.id, 850_000]].sort());
  assert.deepEqual(await noCua(`pty-${NAM}`), []);
  // B2 (Task 16, ADR-0213 Đ4.3): đường thứ ba — thành viên thay mặt Sunrise lập, gửi người quản lý, người quản lý gửi lên ⇒ cùng dòng tiền, cùng phiếu, nợ cho Sunrise; người lập vẫn là thành viên.
  const tv = await lap(w, TV, { tuCach: SUNRISE, paymentTerm: "CREDIT" });
  assert.equal(tv.status, 201, tv.text);
  const tvId = tv.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${tvId}/gui-quan-ly`, { as: TV, body: {} })).status, 201);
  const gl = await w.call("POST", `/api/orders/${tvId}/gui-don`, { as: NAM, body: {} });
  assert.equal(gl.status, 200, gl.text);
  assert.equal(w.q("SELECT staff_id AS s, acting_link_kind AS k FROM orders WHERE id = ?", tvId)[0].s, TV);
  assert.deepEqual(dongTien(w, tvId), x);
  assert.deepEqual(await phieu(tvId), px);
  assert.deepEqual(await noCua(SUNRISE), [[vp.json.order.id, 850_000], [ql.json.order.id, 850_000], [tvId, 850_000]].sort());
  assert.deepEqual(await noCua(`pty-${TV}`), []);
});

test("Review Focus 5 (Task 16): thành viên bị gỡ khi nháp đang chờ người quản lý ⇒ không dòng tiền nào sinh ra (gỡ, lưu thử, rút thử); người quản lý gửi lên ⇒ tiền như đơn thường của tổ chức", async () => {
  const w = await setup();
  const r = await lap(w, TV, { tuCach: SUNRISE });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-quan-ly`, { as: TV, body: {} })).status, 201);
  const tien = () => ({ ...w.q("SELECT (SELECT count(*) FROM bil_payment_receipt) AS thu, (SELECT count(*) FROM bil_posting) AS but, (SELECT count(*) FROM bil_debt_line) AS no, (SELECT count(*) FROM ord_service_terms WHERE order_id = ?) AS chup", id)[0] });
  const truoc = tien();
  assert.equal((await w.call("POST", `/api/to-chuc/${SUNRISE}/go-thanh-vien`, { as: NAM, body: { personPartyId: `pty-${TV}` } })).status, 200);
  assert.notEqual((await luu(w, TV, id)).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/rut-gui-quan-ly`, { as: TV, body: {} })).status, 403);
  assert.deepEqual(tien(), truoc, "không dòng tiền, không bản chụp mới");
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} })).status, 200);
  assert.equal(tien().chup, 1, "gửi lên mới chụp (một dịch vụ)");
});

test("Đ3.2: tư cách tổ chức không gắn ⇒ 403, không tạo đơn; người chỉ làm cho tổ chức không chọn ⇒ 400; thành viên (B2) chọn tổ chức không gắn ⇒ 403", async () => {
  const w = await setup();
  const truoc = dem(w, "SELECT count(*) AS n FROM orders");
  const r = await lap(w, NAM, { tuCach: KHAC });
  assert.equal(r.status, 403, r.text);
  assert.deepEqual(r.json.error, { code: "not_acting_for_org", message: CAU_KHONG_CON });
  const tv = await lap(w, TV, { tuCach: KHAC });
  assert.equal(tv.status, 403, tv.text);
  assert.equal(tv.json.error.code, "not_acting_for_org");
  const chi = await lap(w, CHI, {});
  assert.equal(chi.status, 400, chi.text);
  assert.equal(chi.json.error.message, "Hãy chọn tư cách");
  assert.equal(dem(w, "SELECT count(*) AS n FROM orders"), truoc, "không đơn nào được tạo");
  const ok = await lap(w, CHI, { tuCach: BIEN_XANH });
  assert.equal(ok.status, 201, ok.text);
  assert.deepEqual(don(w, ok.json.order.id), { b: BIEN_XANH, a: BIEN_XANH, k: "MANAGER" });
});

test("Đ3.4: lưu nháp — gửi bên đặt khác hay hồ sơ mới ⇒ 409, bên đặt không đổi; thân cũ không khoá bên đặt, gửi trùng, gửi rỗng ⇒ giữ", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  for (const extra of [{ bookerPartyId: KHAC }, { bookerPartyId: `pty-${NAM}` }, { newBooker: { fullName: "Người Lạ", phone: "0933333333" } }]) {
    const k = await luu(w, NAM, id, extra);
    assert.equal(k.status, 409, `${JSON.stringify(extra)} ${k.text}`);
    assert.deepEqual(k.json.error, { code: "booker_locked", message: CAU_KHOA });
    assert.deepEqual(don(w, id), { b: SUNRISE, a: SUNRISE, k: "MANAGER" });
  }
  for (const extra of [{}, { bookerPartyId: SUNRISE }, { bookerPartyId: null }]) {
    const k = await luu(w, NAM, id, extra);
    assert.equal(k.status, 200, `${JSON.stringify(extra)} ${k.text}`);
    assert.deepEqual(don(w, id), { b: SUNRISE, a: SUNRISE, k: "MANAGER" });
  }
  // Đơn cá nhân cũng chốt (Đ3.4 — mọi đơn do Đối tác lập theo một tư cách).
  const c = await lap(w, NAM, {});
  const k = await luu(w, NAM, c.json.order.id, { bookerPartyId: KHAC });
  assert.equal(k.status, 409, k.text);
});

test("Đ3.4, Đ5: liên kết đóng rồi lưu nháp cũ ⇒ 403; gửi đơn cũng không được (đơn ở lại nháp, không bản chụp, không nhật ký); đơn văn phòng và đơn lập trước B1 (tư cách NULL) giữ hành vi hôm nay", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  // Tổ chức còn thành viên thì không đóng được người quản lý một mình (Đ2.4) — gỡ thành viên trước, rồi anh Nam rời Sunrise.
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${TV}-${SUNRISE}`);
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${NAM}-${SUNRISE}`);
  const k = await luu(w, NAM, id, {});
  assert.equal(k.status, 403, k.text);
  assert.deepEqual(k.json.error, { code: "not_acting_for_org", message: CAU_KHONG_CON });
  const nkTruoc = dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id);
  const gui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.equal(gui.status, 403, gui.text);
  assert.equal(gui.json.error.code, "not_acting_for_org");
  assert.equal(w.q("SELECT status AS s FROM orders WHERE id = ?", id)[0].s, "draft");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), 0, "không bản chụp");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", id), 0, "không mở yêu cầu");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id), nkTruoc, "không nhật ký mới");
  // Nháp lập trước B1: tư cách NULL ⇒ ép bên đặt như hôm nay (hồ sơ được hưởng của chính tài khoản), không 409.
  const cu = await lap(w, NAM, {});
  const cid = cu.json.order.id as string;
  w.sqlite.prepare("UPDATE orders SET acting_party_id = NULL, acting_link_kind = NULL, booker_party_id = NULL WHERE id = ?").run(cid);
  const l = await luu(w, NAM, cid, { bookerPartyId: KHAC });
  assert.equal(l.status, 200, l.text);
  assert.deepEqual(don(w, cid), { b: `pty-${NAM}`, a: null, k: null });
});

test("PF10 «Đổi khách» của văn phòng: đổi bên đặt thật ⇒ xoá tư cách trong cùng câu; nhật ký đổi khách không mang tổ chức; sau đó đơn chạy như đơn thường", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  assert.equal((await w.xacNhanDon(id, NAM)).status, 200); // văn phòng chỉ đổi khách trên nháp của chính mình hoặc đơn đã gửi (ADR-0135 Đ2)
  const doiKhach = (bookerPartyId: string, customerName = "Khách Thử") =>
    w.call("PUT", `/api/orders/${id}/booker`, { as: SUP, body: { customerName, customerPhone: "0912345678", bookerPartyId, expectedUpdatedAt: mocCua(w, id) } });
  // Chỉ sửa tên khách (bên đặt giữ nguyên) ⇒ tư cách giữ nguyên; dòng nhật ký vẫn mang tổ chức (thuộc tính của đơn).
  const ten = await doiKhach(SUNRISE, "Khách Đổi Tên");
  assert.equal(ten.status, 200, ten.text);
  assert.deepEqual(don(w, id), { b: SUNRISE, a: SUNRISE, k: "MANAGER" });
  const doi = await doiKhach(KHACH);
  assert.equal(doi.status, 200, doi.text);
  assert.deepEqual(don(w, id), { b: KHACH, a: null, k: null });
  assert.deepEqual(w.q("SELECT acting_party_id AS a FROM audit_log WHERE order_id = ? AND action = 'booker_changed' ORDER BY created_at, rowid", id).map((x: { a: string | null }) => x.a), [SUNRISE, null],
    "nhật ký đổi khách đứng SAU câu xoá tư cách");
  // Đơn thường (tư cách NULL): mọi dòng nhật ký sau đó không mang tổ chức; Đối tác gọi đổi khách bị luật quyền hôm nay chặn (403 forbidden), không phải bên đặt chốt (409).
  const lai = await doiKhach(KHACH, "Khách Lần Ba");
  assert.equal(lai.status, 200, lai.text);
  assert.equal(w.q("SELECT acting_party_id AS a FROM audit_log WHERE order_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", id)[0].a, null);
  const dt = await w.call("PUT", `/api/orders/${id}/booker`, { as: NAM, body: { customerName: "X", customerPhone: "0912345678", bookerPartyId: null, expectedUpdatedAt: mocCua(w, id) } });
  assert.equal(dt.status, 403, dt.text);
  assert.equal(dt.json.error.code, "forbidden");
});

test("Đ3.6 (Hiến chương 5.28): tư cách không đổi bộ quyền — /api/auth/me giống hệt trước và sau khi lập đơn thay mặt tổ chức", async () => {
  const w = await setup();
  const truoc = await w.call("GET", "/api/auth/me", { as: NAM });
  assert.equal((await lap(w, NAM, { tuCach: SUNRISE })).status, 201);
  const sau = await w.call("GET", "/api/auth/me", { as: NAM });
  assert.deepEqual(sau.json.staff.permissions, truoc.json.staff.permissions);
  assert.deepEqual(sau.json, truoc.json, "phiên không mang tư cách (chọn theo từng đơn, không lưu ở phiên)");
});

test("Đ4.5 TU_DAT_TRA_SAU: người đặt hạn mức không bật / ngừng Trả sau cho tổ chức mình đang gắn (người quản lý hay thành viên)", async () => {
  const w = await setup();
  for (const loai of ["MANAGER_OF", "MEMBER_OF"] as const) {
    const org = loai === "MANAGER_OF" ? KHAC : BIEN_XANH;
    lienKet(w, `pty-${SUP}`, org, loai);
    const r = await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: org, hanMuc: 5_000_000, gioTra: 24, gioAnHan: 0 } });
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json.error.code, "tu_dat_tra_sau");
    const n = await w.call("POST", `/api/tra-sau/han-muc/${org}/ngung`, { as: SUP });
    assert.equal(n.status, 403, n.text);
    assert.equal(n.json.error.code, "tu_dat_tra_sau");
  }
  const ok = await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: SUNRISE, hanMuc: 5_000_000, gioTra: 24, gioAnHan: 0 } });
  assert.equal(ok.status, 201, `chống bài rỗng: tổ chức không gắn thì đặt được — ${ok.text}`);
});

// ---- Task 11 vòng sửa 1 (người kiểm độc lập + ruling điều phối, 16/11) ----

test("vòng sửa 1 (Important 2): người quản lý MẤT HIỆU LỰC (hồ sơ đã gộp) mà liên kết còn mở ⇒ lập đơn tư cách tổ chức 403; lưu nháp cũ 403", async () => {
  const w = await setup();
  const cu = await lap(w, NAM, { tuCach: SUNRISE });
  assert.equal(cu.status, 201, cu.text);
  // Đ2.8: hồ sơ của người quản lý đã gộp vào hồ sơ khác ⇒ không còn người quản lý có hiệu lực; liên kết MANAGER_OF vẫn mở, tổ chức vẫn còn vai (chỉ điều kiện «có hiệu lực» quyết).
  w.sqlite.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(KHACH, AT, `pty-${NAM}`);
  const moi = await lap(w, NAM, { tuCach: SUNRISE });
  assert.equal(moi.status, 403, moi.text);
  assert.deepEqual(moi.json.error, { code: "not_acting_for_org", message: CAU_KHONG_CON });
  const k = await luu(w, NAM, cu.json.order.id, {});
  assert.equal(k.status, 403, k.text);
  assert.equal(k.json.error.code, "not_acting_for_org");
});

test("vòng sửa 1 (ruling Đ3.4): mọi route ghi nháp qua MỘT cổng — người đã rời tổ chức huỷ / ghi nháp tổ chức qua route khác cũng 403", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${TV}-${SUNRISE}`);
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${NAM}-${SUNRISE}`);
  const huy = await w.call("POST", `/api/orders/${id}/status`, { as: NAM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 403, huy.text);
  assert.equal(huy.json.error.code, "not_acting_for_org");
  assert.equal(w.q("SELECT status AS s FROM orders WHERE id = ?", id)[0].s, "draft");
  // Nháp cá nhân của anh Nam không bị cổng này đụng.
  const caNhan = await lap(w, NAM, {});
  assert.equal((await w.call("POST", `/api/orders/${caNhan.json.order.id}/status`, { as: NAM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status === 403, false);
});

test("vòng sửa 1 (Important 1): người quản lý xem phiếu công nợ đại lý của đơn tổ chức DO CHÍNH MÌNH lập; Đối tác lạ 403", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  assert.equal((await w.xacNhanDon(id, NAM)).status, 200);
  const p = await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as: NAM });
  assert.equal(p.status, 200, p.text);
  assert.equal((await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as: TV })).status, 403);
});

test("vòng sửa 1 (Đ3.2): con-duoc-dung — Đối tác gửi bên đặt ngoài tư cách của mình ⇒ 403; tư cách của mình / vắng ⇒ 200", async () => {
  const w = await setup();
  const ngoai = await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${KHAC}`, { as: NAM });
  assert.equal(ngoai.status, 403, ngoai.text);
  assert.equal(ngoai.json.error.code, "not_acting_for_org");
  assert.equal((await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${SUNRISE}`, { as: NAM })).status, 200);
  assert.equal((await w.call("GET", "/api/tra-sau/con-duoc-dung", { as: NAM })).status, 200);
  assert.equal((await w.call("GET", `/api/tra-sau/con-duoc-dung?benDat=${KHAC}`, { as: SALES })).status, 200, "văn phòng chọn bên đặt tự do như hôm nay");
});

test("vòng sửa 1 Task 12: người đã thôi thay mặt tổ chức không «Rút lại» được đơn tổ chức đang chờ (rut-xac-nhan đi qua cổng chung)", async () => {
  const w = await setup();
  const r = await lap(w, NAM, { tuCach: SUNRISE });
  const id = r.json.order.id as string;
  w.sqlite.prepare("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`yc-${id}`, id, AT, NAM, "2099-01-01T00:00:00.000Z", AT, AT);
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${TV}-${SUNRISE}`);
  w.sqlite.prepare("UPDATE pty_party_relationship SET valid_to_date = '2026-10-02' WHERE id = ?").run(`lk-pty-${NAM}-${SUNRISE}`);
  const rut = await w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as: NAM, body: {} });
  assert.equal(rut.status, 403, rut.text);
  assert.equal(rut.json.error.code, "not_acting_for_org");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id), 1, "yêu cầu vẫn mở");
});
