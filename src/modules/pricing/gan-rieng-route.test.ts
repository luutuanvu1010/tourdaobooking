// ADR-0138 (chủ duyệt 2026-10-24) — CHẠY THẬT trên SQLite (khung tests/audit/harness.mjs): gắn mức TA RIÊNG cho từng đại lý qua route, «Thử tra», khối hồ sơ và
// BA đường chụp mức (xác nhận đơn, đổi bên đặt, tính thử đơn nháp) — mỗi đường một ca đỏ khi quên truyền `ganRieng`. Khung thử chép từ muc-ta.test.ts.
// Số tiền là ví dụ của người soạn (chưa Kế toán ký); tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const HR = "77777777-7777-4777-8777-777777777777";
const DRV = "88888888-8888-4888-8888-888888888888"; // Tài xế công ty
const DP = "99999999-9999-4999-8999-999999999991"; // Tài xế đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai: Kế toán + Đối tác ("có quyền Đối tác là áp")
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000a1";
const ORG2 = "dda00000-0000-4000-8000-0000000000a2";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any; headers: Headers };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [DRV, "0900000010", "Tài Xế", ["DRIVER"]],
    [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]], [DP, "0900000012", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  for (const [id, ten] of [[ORG, "Spa Hoa Sen"], [ORG2, "Spa Lá Trà"]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  }
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const nhatKy = (w: W, action: string): { detail: string; staff_id: string }[] => w.q("SELECT detail, staff_id FROM audit_log WHERE action = ? ORDER BY rowid", action);
/** Loại đối tác mới (route lần 1) — trả mã. */
async function themLoai(w: W, ten: string): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `thêm loại ${ten}`)).json.loai.code as string;
}
const ganHoSo = (w: W, partyId: string, code: string) => ok(w.call("POST", `/api/parties/${partyId}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, `gắn loại ${code} cho ${partyId}`);
const themMuc = (w: W, ten: unknown, as = KT) => w.call("POST", "/api/pricing/muc-ta", { as, body: { ten } });
async function taoMuc(w: W, ten: string): Promise<string> {
  return (await ok(themMuc(w, ten), 201, `tạo mức ${ten}`)).json.muc.code as string;
}
const themDong = (w: W, code: string, body: Record<string, unknown>, as = KT) =>
  w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", ...body } });
async function dongTyLe(w: W, code: string, tyLeBp: number, them: Record<string, unknown> = {}): Promise<string> {
  return (await ok(themDong(w, code, { tyLeBp, ...them }), 201, `dòng ${tyLeBp} cho ${code}`)).json.dong.id as string;
}
const gan = (w: W, loai: string, muc: string, tuNgay = "2026-01-01", as = KT, denNgay?: string) =>
  w.call("POST", "/api/pricing/muc-ta/gan", { as, body: denNgay === undefined ? { loai, muc, tuNgay } : { loai, muc, tuNgay, denNgay } });
async function ganOk(w: W, loai: string, muc: string, tuNgay = "2026-01-01"): Promise<Res> {
  return ok(gan(w, loai, muc, tuNgay), 201, `gắn ${loai} → ${muc}`);
}
const ketThucGan = (w: W, id: string, denNgay: string, as = KT) => w.call("POST", `/api/pricing/muc-ta/gan/${id}/ket-thuc`, { as, body: { denNgay } });
const dongDong = (w: W, id: string, denNgay: string, as = KT) => w.call("POST", `/api/pricing/hoa-hong/${id}/dong`, { as, body: { denNgay } });
const thuTra = async (w: W, doiTac: string, dichVu = "ZA1", as = SALES) => (await ok(w.call("GET", `/api/pricing/thu-tra?doiTac=${doiTac}&dichVu=${dichVu}&ngay=${vnHomNay()}`, { as }), 200, "thử tra")).json;
const mucVai = (w: W, code: string, tyLeBp: number) =>
  ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code }, phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng riêng loại ${code}`);

/** Đơn nháp bằng SQL (dịch vụ ZA1, 2.000.000đ, ngày đi hôm nay), rồi xác nhận qua route. */
function nhap(w: W, booker: string, tong = 2_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, tong, tong, tong);
  return id;
}
async function xacNhan(w: W, booker: string): Promise<string> {
  const id = nhap(w, booker);
  await ok(w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } }), 200, "xác nhận");
  return id;
}
const chup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY created_at, order_service_id", id);
const hoaHongVanPhong = async (w: W, id: string): Promise<number | null> => (await ok(w.call("GET", `/api/orders/${id}/thuong-mai`, { as: KT }), 200, "thương mại")).json.vanPhong.dong[0].hoaHong;

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-12 — tạo mức, thêm / đóng dòng của mức, gắn loại↔mức theo ngày, «Thử tra» có tên mức và bậc 7–9, bản chụp trỏ đúng dòng đích mức
// ---------------------------------------------------------------------------------------------------------------------------------------------

const ganRieng = (w: W, partyId: string, muc: string, tuNgay = "2026-01-01", as = KT, denNgay?: string) =>
  w.call("POST", `/api/pricing/ho-so/${partyId}/muc-rieng`, { as, body: denNgay === undefined ? { muc, tuNgay } : { muc, tuNgay, denNgay } });
const khoi = async (w: W, partyId: string, as = KT) => (await ok(w.call("GET", `/api/pricing/ho-so/${partyId}/hoa-hong`, { as }), 200, "khối hồ sơ")).json;
/** Loại «Lữ hành» gắn TA1 (10%); ORG và ORG2 cùng loại; mức TA2 12% chưa gắn cho ai. */
async function nen(w: W) {
  const loai = await themLoai(w, "Lữ hành");
  await ganHoSo(w, ORG, loai);
  await ganHoSo(w, ORG2, loai);
  const ta1 = await taoMuc(w, "TA1");
  const ta2 = await taoMuc(w, "TA2");
  const d1 = await dongTyLe(w, ta1, 1000);
  const d2 = await dongTyLe(w, ta2, 1200);
  await ganOk(w, loai, ta1);
  return { loai, ta1, ta2, d1, d2 };
}

test("TC1 ví dụ chủ: Kế toán gắn riêng TA2 cho ORG ⇒ 201 + Location hồ sơ; Thử tra ORG bậc 12 (12%), ORG2 vẫn bậc 9 (10%); khối hồ sơ hiện mức riêng; nhật ký chỉ tên mức + ngày", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  const r = await ok(ganRieng(w, ORG, ta2), 201, "gắn riêng");
  assert.equal(r.headers.get("location"), `/parties?id=${ORG}`);
  assert.deepEqual([r.json.mucRieng.muc.ten, r.json.mucRieng.tuNgay, r.json.mucRieng.denNgay, r.json.xungDot], ["TA2", "2026-01-01", null, false]);
  const a = await thuTra(w, ORG);
  assert.deepEqual([a.ketQua.trangThai, a.ketQua.bac, a.ketQua.muc.tyLeBp], ["SET", 12, 1200]);
  const b = await thuTra(w, ORG2);
  assert.deepEqual([b.ketQua.bac, b.ketQua.muc.tyLeBp], [9, 1000]);
  assert.equal((await khoi(w, ORG2)).mucRieng, null);
  assert.deepEqual(nhatKy(w, "prc_party_tier_set").map((x) => x.detail), ["mức riêng TA2 · từ 2026-01-01"]);
  assert.ok(!JSON.stringify(nhatKy(w, "prc_party_tier_set")).includes("Spa Hoa Sen"), "nhật ký không tên hồ sơ");
});

test("ĐƯỜNG XÁC NHẬN ĐƠN: đơn của ORG (gắn riêng TA2) chụp đúng dòng TA2 — 2.000.000 ⇒ hoa hồng 240.000; đơn ORG2 vẫn TA1 200.000", async () => {
  const w = setup();
  const { ta2, d1, d2 } = await nen(w);
  await ok(ganRieng(w, ORG, ta2), 201);
  const a = await xacNhan(w, ORG);
  assert.deepEqual([chup(w, a)[0].commission_status, chup(w, a)[0].commission_rule_id, chup(w, a)[0].commission_rate_bp], ["SET", d2, 1200]);
  assert.equal(await hoaHongVanPhong(w, a), 240_000);
  const b = await xacNhan(w, ORG2);
  assert.deepEqual([chup(w, b)[0].commission_rule_id, await hoaHongVanPhong(w, b)], [d1, 200_000]);
});

test("ĐƯỜNG ĐỔI BÊN ĐẶT: đơn đã xác nhận của ORG2 (TA1) đổi sang ORG (gắn riêng TA2) ⇒ bản chụp mới trỏ dòng TA2, hoa hồng 240.000", async () => {
  const w = setup();
  const { ta2, d2 } = await nen(w);
  await ok(ganRieng(w, ORG, ta2), 201);
  const id = await xacNhan(w, ORG2);
  const moc = String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at);
  await ok(w.call("PUT", `/api/orders/${id}/booker`, { as: SALES, body: { customerName: "Khách Giả", customerPhone: "0900000099", bookerPartyId: ORG, expectedUpdatedAt: moc } }), 200, "đổi bên đặt");
  const moi = w.q("SELECT * FROM ord_service_terms WHERE order_id = ? AND supersedes_id IS NOT NULL", id);
  assert.deepEqual([moi.length, moi[0].commission_rule_id, moi[0].commission_rate_bp], [1, d2, 1200]);
  assert.equal(await hoaHongVanPhong(w, id), 240_000);
});

test("ĐƯỜNG TÍNH THỬ ĐƠN NHÁP: bên đặt ORG gắn riêng TA2 ⇒ 12% / 240.000, không ghi bản chụp", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(ganRieng(w, ORG, ta2), 201);
  const id = nhap(w, ORG);
  const d = (await ok(w.call("GET", `/api/orders/${id}/thuong-mai`, { as: SALES }), 200)).json.vanPhong.dong[0]; // ADR-0135: nháp chỉ người lập đọc
  assert.deepEqual([d.muc, d.hoaHong, d.thieu], ["12%", 240_000, null]);
  assert.equal(chup(w, id).length, 0);
});

test("TC4 kết thúc mức riêng ⇒ về mức theo loại (Thử tra bậc 9); kết thúc lần hai ⇒ 400 «đã hết hạn» (ADR-0148); nhật ký; gắn lại sau khi kết thúc được", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  const r = await ok(ganRieng(w, ORG, ta2), 201);
  const id = r.json.mucRieng.id;
  const homQua = new Date(Date.now() + 7 * 3600e3 - 86400e3).toISOString().slice(0, 10);
  const k = await ok(w.call("POST", `/api/pricing/muc-rieng/${id}/ket-thuc`, { as: ADM, body: { denNgay: homQua } }), 200, "kết thúc");
  assert.equal(k.json.mucRieng, null, "đã hết hiệu lực hôm nay");
  assert.deepEqual([(await thuTra(w, ORG)).ketQua.bac, (await thuTra(w, ORG)).ketQua.muc.tyLeBp], [9, 1000]);
  const lai = await w.call("POST", `/api/pricing/muc-rieng/${id}/ket-thuc`, { as: ADM, body: { denNgay: homQua } });
  assert.deepEqual([lai.status, lai.json.error.message], [400, "Mức này đã hết hạn nên không ngừng được."]);
  assert.equal(nhatKy(w, "prc_party_tier_closed").length, 1);
  await ok(ganRieng(w, ORG, ta2, vnHomNay(), SA), 201, "gắn lại từ hôm nay (Toàn quyền)");
});

test("TC5 CSDL chặn ⇒ câu tiếng Việt, không ghi: hồ sơ không mang loại được hưởng 400; mức tắt 409; chồng ngày 409; mức không có 404; thân sai 400", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  const khongLoai = "dda00000-0000-4000-8000-0000000000a9";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Khách Lẻ Công Ty', 1, ?, ?)").run(khongLoai, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(khongLoai, AT, AT);
  const x = await ganRieng(w, khongLoai, ta2);
  assert.equal(x.status, 400, x.text);
  assert.match(x.json.error.message, /không mang vai trò được hưởng/);
  await ok(ganRieng(w, ORG, ta2), 201);
  const chong = await ganRieng(w, ORG, ta1, "2026-06-01");
  assert.deepEqual([chong.status, chong.json.error.message], [409, "Hồ sơ này đã có một mức riêng trong khoảng ngày này — ngừng mức riêng cũ trước."]);
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT }), 200, "tắt TA1");
  assert.equal((await ganRieng(w, ORG2, ta1)).status, 409, "mức tắt");
  assert.equal((await ganRieng(w, ORG2, "MT_KHONGCO")).status, 404);
  assert.equal((await ganRieng(w, ORG2, "")).status, 400);
  assert.equal((await w.call("POST", "/api/pricing/ho-so/khong-hop-le/muc-rieng", { as: KT, body: { muc: ta2, tuNgay: "2026-01-01" } })).status, 400);
  assert.equal(dem(w, "SELECT count(*) n FROM prc_party_tier"), 1, "chỉ đúng một gắn hợp lệ");
});

test("bảng chỉ-thêm (D1): CSDL chặn xoá gắn riêng, đổi mức / ngày bắt đầu, và đóng lần hai — kể cả SQL gõ tay", async () => {
  const w = setup();
  const { ta1, ta2 } = await nen(w);
  const id = (await ok(ganRieng(w, ORG, ta2), 201)).json.mucRieng.id as string;
  const loi = (sql: string, ...a: unknown[]) => assert.throws(() => w.sqlite.prepare(sql).run(...a), /prc_append_only/, sql);
  loi("DELETE FROM prc_party_tier WHERE id = ?", id);
  loi("UPDATE prc_party_tier SET tier_code = ? WHERE id = ?", ta1, id);
  loi("UPDATE prc_party_tier SET valid_from_date = '2026-02-01' WHERE id = ?", id);
  w.sqlite.prepare("UPDATE prc_party_tier SET valid_to_date = '2026-12-31', updated_at = ? WHERE id = ?").run(AT, id); // đóng lần một: được
  loi("UPDATE prc_party_tier SET valid_to_date = '2027-01-01' WHERE id = ?", id); // kéo dài: chặn
  // ADR-0148 (migration 0126) sửa câu ADR-0138 «chỉ đóng một lần»: RÚT NGẮN ngày kết thúc nay được (máy chủ giữ luật «không qua ngày đã chụp»).
  w.sqlite.prepare("UPDATE prc_party_tier SET valid_to_date = '2026-12-30', updated_at = ? WHERE id = ?").run(AT, id);
  assert.deepEqual(w.q("SELECT tier_code, valid_from_date, valid_to_date FROM prc_party_tier").map((r: object) => ({ ...r })), [{ tier_code: ta2, valid_from_date: "2026-01-01", valid_to_date: "2026-12-30" }]);
});

test("TC4 quyền (D2): Bán hàng, HDV, Nhân sự, Đối tác, Tài xế, Tài xế đối tác, lai Kế toán + Đối tác ⇒ 403 cả gắn lẫn kết thúc; Kế toán, Quản trị, Toàn quyền được", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  for (const as of [SALES, HDV, HR, DT, DRV, DP, KP]) assert.equal((await ganRieng(w, ORG, ta2, "2026-01-01", as)).status, 403, `gắn: ${as}`);
  const r = await ok(ganRieng(w, ORG, ta2, "2026-01-01", ADM), 201, "Quản trị gắn");
  for (const as of [SALES, HDV, HR, DT, DRV, DP, KP]) assert.equal((await w.call("POST", `/api/pricing/muc-rieng/${r.json.mucRieng.id}/ket-thuc`, { as, body: { denNgay: "2026-12-31" } })).status, 403, `kết thúc: ${as}`);
  assert.equal(dem(w, "SELECT count(*) n FROM prc_party_tier WHERE valid_to_date IS NOT NULL"), 0);
});

test("ĐƯỜNG CHỤP BÙ (đơn xác nhận trước khi có bản chụp): bên đặt ORG gắn riêng TA2 ⇒ bản chụp bù trỏ dòng TA2", async () => {
  const w = setup();
  const { ta2, d2 } = await nen(w);
  await ok(ganRieng(w, ORG, ta2), 201);
  const id = nhap(w, ORG);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run("2026-10-10T03:00:00.000Z", AT, id);
  await ok(w.call("POST", `/api/orders/${id}/chup-bu`, { as: KT }), 200, "chụp bù");
  assert.deepEqual([chup(w, id)[0].commission_rule_id, chup(w, id)[0].commission_rate_bp], [d2, 1200]);
});

test("ĐƯỜNG TRẦN GIẢM GIÁ khi lập đơn (ADR-0079 điều 8): bên đặt ORG gắn riêng TA2 — 1 khách × 500.000 ⇒ trần 60.000 (12%), không phải 50.000 (TA1)", async () => {
  const w = setup();
  const { ta2 } = await nen(w);
  await ok(ganRieng(w, ORG, ta2), 201);
  const r = await w.call("POST", "/api/orders", { as: SALES, body: {
    customerName: "Khách Giả", customerPhone: "0912345678", bookerPartyId: ORG, discount: 55_000,
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  } });
  assert.equal(r.status, 201, r.text);
  const qua = await w.call("POST", "/api/orders", { as: SALES, body: {
    customerName: "Khách Giả", customerPhone: "0912345678", bookerPartyId: ORG, discount: 60_001,
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  } });
  assert.deepEqual([qua.status, qua.json?.error?.message], [400, "Giảm tối đa 60.000 ₫ (bằng hoa hồng của đơn)."]);
});
