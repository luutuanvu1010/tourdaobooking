// ADR-0117 lần 2, Task 4 — MỨC TA dùng chung: Kế toán / Quản trị / Toàn quyền tạo mức (bộ hoa hồng có tên), thêm dòng cho mức, gắn loại đối tác vào mức theo ngày (route /api/pricing/muc-ta*);
// «Thử tra» và lúc Xác nhận đơn chọn mức ở bậc 7–9 (cùng MỘT `chonMuc`). Tiêu chí N-12, N-13, N-17, N-19, N-23, N-24 và ca vàng SV-TA-06 của kế hoạch
// docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Khuôn: loai-doi-tac.test.ts (lần 1).
import { mock, test } from "node:test";
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
for (const [ten, as] of [["Kế toán", KT], ["Quản trị", ADM], ["Toàn quyền", SA]] as const) {
  test(`N-12: ${ten} tạo mức «TA1» ⇒ 201, mã máy sinh, đúng một dòng prc_rate_tier có khoá tên, một dòng nhật ký prc_rate_tier_added (chỉ tên)`, async () => {
    const w = setup();
    const r = await ok(themMuc(w, "  TA1  ", as), 201);
    assert.match(r.json.muc.code, /^MT_[A-Z]{8}$/);
    assert.deepEqual(r.json.muc, { code: r.json.muc.code, ten: "TA1", dangBat: true, dong: [], gan: [] });
    assert.equal(r.headers.get("location"), "/hoa-hong");
    const hang = w.q("SELECT code, name, name_key, active, created_by FROM prc_rate_tier");
    assert.deepEqual(hang.map((x: object) => ({ ...x })), [{ code: r.json.muc.code, name: "TA1", name_key: "ta1", active: 1, created_by: as }]);
    const nk = nhatKy(w, "prc_rate_tier_added");
    assert.deepEqual(nk.map((x) => x.detail), ["TA1"]);
    assert.equal(nk[0]!.staff_id, as);
  });
}

test("N-12: thêm dòng cho mức (dịch vụ 12%, mọi dịch vụ 10%), gắn loại ⇒ «Thử tra» bậc 7 rồi bậc 9 kèm TÊN mức; bản chụp lúc Xác nhận trỏ đúng dòng đích mức; GET liệt kê mức, dòng, gắn", async (t) => {
  // Đồng hồ giả 10:00 giờ VN: đơn chụp hôm nay thì dòng / gắn chỉ đóng được từ hôm nay (ADR-0148 Q4) — phần đóng chạy vào HÔM SAU.
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2027-03-10T03:00:00.000Z") });
  t.after(() => mock.timers.reset());
  const w = setup();
  const loai = await themLoai(w, "Lễ tân khách sạn nhỏ");
  await ganHoSo(w, ORG, loai);
  const ta1 = await taoMuc(w, "TA1");
  const dAll = await ok(themDong(w, ta1, { tyLeBp: 1000 }), 201);
  assert.deepEqual(dAll.json.dong.doiTuong, { loai: "MUC", code: ta1, ten: "TA1" });
  assert.equal(dAll.json.dong.tyLeBp, 1000);
  const dDv = await dongTyLe(w, ta1, 1200, { phamVi: "SERVICE", catalogCode: "ZA1" });
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_commission_rule WHERE target_tier_code = ? AND target_role_code IS NULL AND target_party_id IS NULL", ta1), 2);
  const nkDong = nhatKy(w, "prc_commission_rule_added").map((x) => x.detail);
  assert.ok(nkDong.every((d) => d.startsWith("chính sách TA1 · ")), nkDong.join(" | "));

  // Chưa gắn ⇒ loại không có mức nào ⇒ thiếu mức.
  const t0 = await thuTra(w, ORG);
  assert.deepEqual(t0.ketQua.trangThai, "MISSING");

  const g = await ganOk(w, loai, ta1);
  assert.deepEqual(g.json.dongRieng, [], "loại sạch ⇒ không cảnh báo");
  assert.deepEqual({ ...g.json.gan, id: "x" }, { id: "x", loai: { code: loai, ten: "Lễ tân khách sạn nhỏ" }, muc: { code: ta1, ten: "TA1" }, tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true, daHuy: false, thayCho: null, lyDoSua: null });
  assert.deepEqual(nhatKy(w, "prc_role_tier_set").map((x) => x.detail), ["Lễ tân khách sạn nhỏ → TA1 · từ 2026-01-01"]);

  const t7 = await thuTra(w, ORG);
  assert.equal(t7.ketQua.trangThai, "SET");
  assert.equal(t7.ketQua.bac, 7, "dòng dịch vụ của mức TA");
  assert.equal(t7.ketQua.muc.id, dDv);
  assert.deepEqual(t7.ketQua.muc.doiTuong, { loai: "MUC", code: ta1, ten: "TA1" });
  const t9 = await thuTra(w, ORG, "KHAC");
  assert.equal(t9.ketQua.bac, 9, "dòng mọi dịch vụ của mức TA");
  assert.equal(t9.ketQua.muc.id, dAll.json.dong.id);

  const id = await xacNhan(w, ORG);
  const c = chup(w, id);
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].commission_status, c[0].commission_kind, c[0].commission_rate_bp, c[0].commission_rule_id, c[0].beneficiary_party_id], ["SET", "RATE", 1200, dDv, ORG]);
  assert.equal(await hoaHongVanPhong(w, id), 240_000);

  const ds = await ok(w.call("GET", "/api/pricing/muc-ta", { as: SALES }), 200);
  assert.equal(ds.json.homNay, vnHomNay());
  assert.equal(ds.json.muc.length, 1);
  assert.equal(ds.json.muc[0].code, ta1);
  assert.deepEqual(ds.json.muc[0].dong.map((d: { id: string }) => d.id).sort(), [dAll.json.dong.id, dDv].sort());
  assert.deepEqual(ds.json.muc[0].gan.map((x: { id: string }) => x.id), [g.json.gan.id]);
  assert.ok(ds.json.loai.some((x: { code: string; ten: string }) => x.code === loai && x.ten === "Lễ tân khách sạn nhỏ"), "danh sách loại để gắn");
  assert.ok(!JSON.stringify(ds.json).includes("name_key") && !JSON.stringify(ds.json).includes("\"ta1\""), "khoá tên không hiển thị");
  // Bảng mức chung cũng thấy dòng của mức, gắn nhãn đúng đối tượng.
  const hh = await ok(w.call("GET", "/api/pricing/hoa-hong", { as: SALES }), 200);
  assert.deepEqual(hh.json.dong.find((d: { id: string }) => d.id === dDv).doiTuong, { loai: "MUC", code: ta1, ten: "TA1" });

  // Hôm sau — đóng dòng dịch vụ của mức (route đóng dòng chung) tới hôm qua ⇒ «Thử tra» rơi về bậc 9; nhật ký ghi tên mức, không «đối tác null».
  mock.timers.tick(86_400_000);
  await ok(dongDong(w, dDv, inDays(-1)), 200, "đóng dòng của mức");
  assert.match(nhatKy(w, "prc_commission_rule_closed")[0]!.detail, /^chính sách TA1 · dịch vụ ZA1 · 12% · đến \d{4}-\d{2}-\d{2}$/);
  assert.equal((await thuTra(w, ORG)).ketQua.bac, 9);
  // Kết thúc gắn ⇒ loại không còn mức ở hôm nay ⇒ thiếu mức (không bao giờ 0).
  await ok(ketThucGan(w, g.json.gan.id, inDays(-1)), 200, "kết thúc gắn");
  assert.match(nhatKy(w, "prc_role_tier_closed")[0]!.detail, /^Lễ tân khách sạn nhỏ → TA1 · đến \d{4}-\d{2}-\d{2}$/);
  const tHet = await thuTra(w, ORG);
  assert.equal(tHet.ketQua.trangThai, "MISSING");
  assert.deepEqual(chup(w, id), c, "đơn đã chụp không đổi");
});

test("N-12: kiểm đầu vào ⇒ 400 / 404 / 409 rõ nghĩa tiếng Việt, không bao giờ 500, không ghi gì", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const ta1 = await taoMuc(w, "TA1");
  await dongTyLe(w, ta1, 1000);
  const g = await ganOk(w, loai, ta1);
  const bang = () => [dem(w, "SELECT count(*) AS n FROM prc_rate_tier"), dem(w, "SELECT count(*) AS n FROM prc_role_tier"), dem(w, "SELECT count(*) AS n FROM prc_commission_rule"), dem(w, "SELECT count(*) AS n FROM audit_log")];
  const truoc = bang();
  const ca: [string, () => Promise<Res>, number, RegExp][] = [
    ["dòng cho mức không có", () => themDong(w, "MT_KHONGCOO", { tyLeBp: 1000 }), 404, /Không tìm thấy cấp đại lý/],
    ["dòng mã sai dạng", () => themDong(w, "khong-hop-le", { tyLeBp: 1000 }), 404, /Không tìm thấy cấp đại lý/],
    ["dòng thiếu mức", () => themDong(w, ta1, {}), 400, /Mức phải là tỷ lệ/],
    ["dòng tỷ lệ quá 100%", () => themDong(w, ta1, { tyLeBp: 10_001 }), 400, /Mức phải là tỷ lệ/],
    ["dòng dịch vụ không có", () => themDong(w, ta1, { tyLeBp: 1000, phamVi: "SERVICE", catalogCode: "KHONGCO" }), 400, /Không có dịch vụ này/],
    ["dòng chồng ngày (mọi dịch vụ đã có)", () => themDong(w, ta1, { tyLeBp: 1500, tuNgay: "2026-06-01" }), 409, /Đã có mức/],
    ["dòng ghi chú có số điện thoại", () => themDong(w, ta1, { tyLeBp: 1000, phamVi: "SERVICE", catalogCode: "ZA1", ghiChu: "gọi 0901234567" }), 400, /số điện thoại/],
    ["gắn mức không có", () => gan(w, loai, "MT_KHONGCOO", "2027-01-01"), 404, /Không tìm thấy cấp đại lý/],
    ["gắn loại không được hưởng", () => gan(w, "CUSTOMER", ta1), 400, /không nằm trong danh sách được hưởng/],
    ["gắn loại không có", () => gan(w, "LD_KHONGCOGI", ta1), 400, /không nằm trong danh sách được hưởng/],
    ["gắn chồng ngày", () => gan(w, loai, ta1, "2026-05-01"), 409, /đã theo một cấp đại lý trong khoảng ngày này/],
    ["gắn thiếu ngày", () => w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc: ta1 } }), 400, /Ngày bắt đầu/],
    ["gắn ngày kết thúc trước ngày bắt đầu", () => gan(w, loai, ta1, "2027-02-01", KT, "2027-01-01"), 400, /Ngày kết thúc/],
    ["gắn thân rỗng", () => w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: {} }), 400, /Chọn loại đối tác và cấp đại lý/],
    ["kết thúc gắn không có", () => ketThucGan(w, "khong-co-gan", vnHomNay()), 404, /Không tìm thấy/],
    ["kết thúc gắn trước ngày bắt đầu", () => ketThucGan(w, g.json.gan.id, "2025-12-31"), 400, /Ngày kết thúc/],
    ["tắt mức không có", () => w.call("POST", "/api/pricing/muc-ta/MT_KHONGCOO/tat", { as: KT, body: {} }), 404, /Không tìm thấy cấp đại lý/],
    ["bật mức đang bật", () => w.call("POST", `/api/pricing/muc-ta/${ta1}/bat`, { as: KT, body: {} }), 409, /đang mở rồi/],
  ];
  for (const [ten, p, ma, cau] of ca) {
    const r = await p();
    assert.equal(r.status, ma, `${ten}: ${r.status} ${r.text}`);
    assert.match(r.json.error.message, cau, ten);
  }
  assert.deepEqual(bang(), truoc, "không ghi dòng nào, không nhật ký");
  // Kết thúc gắn hai lần cùng ngày: ADR-0148 cho rút ngắn, nên lần hai (tuần tự) là 400 «phải sớm hơn»; 409 «vừa được đóng» chỉ còn cho cuộc đua thật.
  await ok(ketThucGan(w, g.json.gan.id, "2026-12-31"), 200);
  const lai = await ketThucGan(w, g.json.gan.id, "2026-12-31");
  assert.equal(lai.status, 400, lai.text);
  assert.equal(lai.json.error.message, "Ngày kết thúc mới phải sớm hơn ngày kết thúc hiện tại (31/12/2026).");
  assert.equal(nhatKy(w, "prc_role_tier_closed").length, 1);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-24 — tên trùng (không phân biệt dấu / hoa thường) ⇒ 409; hai lần thêm đồng thời ⇒ một thắng, một 409, không 500; tên không hợp lệ ⇒ 400
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-24: tên trùng khác dấu / hoa thường / khoảng trắng ⇒ 409 muc_trung; tên rỗng, quá ngắn, quá dài, có số điện thoại / email, không phải chữ ⇒ 400; không ghi gì", async () => {
  const w = setup();
  await taoMuc(w, "Mức Đặc biệt");
  const truoc = [dem(w, "SELECT count(*) AS n FROM prc_rate_tier"), dem(w, "SELECT count(*) AS n FROM audit_log")];
  for (const ten of ["muc dac biet", "MỨC   ĐẶC BIỆT", " Mức Đặc Biệt "]) {
    const r = await themMuc(w, ten);
    assert.equal(r.status, 409, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "muc_trung");
    assert.equal(r.json.error.message, "Đã có cấp đại lý với tên này.");
  }
  for (const x of ["", "   ", "x", "x".repeat(61), null, 5, ["TA"], "Gọi 0901 234 567", "ta@spa.vn", "̀̀"]) {
    const r = await themMuc(w, x);
    assert.equal(r.status, 400, `${JSON.stringify(x)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal((await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: {} })).status, 400);
  assert.deepEqual([dem(w, "SELECT count(*) AS n FROM prc_rate_tier"), dem(w, "SELECT count(*) AS n FROM audit_log")], truoc);
  assert.equal((await themMuc(w, "x".repeat(60))).status, 201, "60 ký tự được");
});

test("N-24: hai lần thêm ĐỒNG THỜI cùng tên (khác hoa thường) ⇒ đúng một 201, một 409 muc_trung, không 500; đúng một dòng mức, một dòng nhật ký", async () => {
  const w = setup();
  const kq = await Promise.all([themMuc(w, "TA Biển"), themMuc(w, "ta biển", ADM)]);
  assert.deepEqual(kq.map((r) => r.status).sort(), [201, 409], kq.map((r) => r.text).join(" | "));
  assert.equal(kq.find((r) => r.status === 409)!.json.error.code, "muc_trung");
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_rate_tier"), 1);
  assert.equal(nhatKy(w, "prc_rate_tier_added").length, 1);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-23 — tắt mức: chặn gắn mới và thêm dòng mới; dòng và gắn đang áp VẪN áp; bật lại được
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-23: tắt mức ⇒ 200 dangBat false, nhật ký; gắn mới và thêm dòng mới ⇒ 409 rõ nghĩa; dòng và gắn đang có vẫn áp (thử tra + bản chụp); tắt lần hai 409; bật lại ⇒ gắn được", async () => {
  const w = setup();
  const l1 = await themLoai(w, "Lễ tân");
  const l2 = await themLoai(w, "Hướng dẫn tự do mới");
  await ganHoSo(w, ORG, l1);
  const ta1 = await taoMuc(w, "TA1");
  const dong = await dongTyLe(w, ta1, 1000);
  await ganOk(w, l1, ta1);
  const t = await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT, body: {} }), 200);
  assert.deepEqual({ ...t.json.muc, dong: t.json.muc.dong.length, gan: t.json.muc.gan.length }, { code: ta1, ten: "TA1", dangBat: false, dong: 1, gan: 1 });
  assert.deepEqual(nhatKy(w, "prc_rate_tier_off").map((x) => x.detail), ["TA1"]);
  assert.equal(dem(w, "SELECT active AS n FROM prc_rate_tier WHERE code = ?", ta1), 0);

  const g2 = await gan(w, l2, ta1);
  assert.equal(g2.status, 409, g2.text);
  assert.equal(g2.json.error.code, "muc_tat");
  assert.match(g2.json.error.message, /Cấp đại lý này đang khoá/);
  const d2 = await themDong(w, ta1, { tyLeBp: 1500, phamVi: "SERVICE", catalogCode: "ZA1" });
  assert.equal(d2.status, 409, d2.text);
  assert.equal(d2.json.error.code, "muc_tat");

  const tt = await thuTra(w, ORG);
  assert.equal(tt.ketQua.trangThai, "SET", "dòng và gắn đang có của mức đã tắt vẫn áp (giả định kế hoạch, N-23)");
  assert.equal(tt.ketQua.muc.id, dong);
  const id = await xacNhan(w, ORG);
  assert.deepEqual([chup(w, id)[0].commission_status, chup(w, id)[0].commission_rule_id], ["SET", dong]);

  const lai = await w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT, body: {} });
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "stale");
  assert.equal(nhatKy(w, "prc_rate_tier_off").length, 1, "bên thua không ghi nhật ký");

  const b = await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/bat`, { as: ADM, body: {} }), 200);
  assert.equal(b.json.muc.dangBat, true);
  assert.deepEqual(nhatKy(w, "prc_rate_tier_on").map((x) => x.detail), ["TA1"]);
  await ganOk(w, l2, ta1);
  await ok(themDong(w, ta1, { tyLeBp: 1500, phamVi: "SERVICE", catalogCode: "ZA1" }), 201);
});

test("khoá cấp đang khoá / mở lại cấp đang mở ⇒ 409 đúng câu (§6.1 :221)", async () => {
  const w = setup();
  const ta1 = await taoMuc(w, "TA1");
  const bat1 = await w.call("POST", `/api/pricing/muc-ta/${ta1}/bat`, { as: KT, body: {} });
  assert.equal(bat1.status, 409, bat1.text);
  assert.equal(bat1.json.error.code, "stale");
  assert.equal(bat1.json.error.message, "Cấp này đang mở rồi — tải lại.");
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT, body: {} }), 200);
  const tat2 = await w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT, body: {} });
  assert.equal(tat2.status, 409, tat2.text);
  assert.equal(tat2.json.error.code, "stale");
  assert.equal(tat2.json.error.message, "Cấp này đã khoá rồi — tải lại.");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-17 — cảnh báo (không chặn): gắn mức cho loại còn dòng riêng đang hiệu lực ⇒ 201 kèm danh sách; xét MỌI loại mà hồ sơ mang loại này đang mang (Ruling điều phối)
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-17: loại còn dòng riêng ⇒ 201 kèm đúng các dòng riêng còn hiệu lực trong khoảng gắn (dòng đã đóng trước đó không kể); dòng riêng thắng TA (bậc 6) tới khi đóng thì «Thử tra» ra bậc TA", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  await ganHoSo(w, ORG, loai);
  const rieng = (await mucVai(w, loai, 1000)).json.dong.id as string;
  // một dòng riêng khác đã đóng TRƯỚC khoảng gắn — không cảnh báo
  const cu = (await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: loai }, phamVi: "SERVICE", catalogCode: "ZA1", kieu: "RATE", tyLeBp: 900, tuNgay: "2025-01-01", denNgay: "2025-12-31" } }), 201)).json.dong.id;
  const ta1 = await taoMuc(w, "TA1");
  await dongTyLe(w, ta1, 1500);
  const g = await ganOk(w, loai, ta1, "2026-02-01");
  assert.deepEqual(g.json.dongRieng.map((d: { id: string }) => d.id), [rieng], "đúng dòng riêng còn hiệu lực");
  assert.ok(!g.json.dongRieng.some((d: { id: string }) => d.id === cu));
  assert.deepEqual(g.json.dongRieng[0].doiTuong, { loai: "VAI", code: loai, ten: "Lễ tân" });
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_role_tier"), 1, "cảnh báo không chặn");
  const t6 = await thuTra(w, ORG);
  assert.deepEqual([t6.ketQua.bac, t6.ketQua.muc.id], [6, rieng], "dòng riêng của loại (bậc 6) thắng dòng TA (bậc 9)");
  await ok(dongDong(w, rieng, inDays(-1)), 200);
  const t9 = await thuTra(w, ORG);
  assert.deepEqual([t9.ketQua.bac, t9.ketQua.muc.doiTuong.ten, t9.ketQua.muc.tyLeBp], [9, "TA1", 1500]);
});

test("N-17 (Ruling): hồ sơ mang HAI loại — gắn mức cho loại sạch vẫn cảnh báo dòng riêng của loại kia, vì dòng đó thắng TA cho hồ sơ ấy; loại không ai mang chung ⇒ danh sách rỗng", async () => {
  const w = setup();
  const sach = await themLoai(w, "Lễ tân");
  const khac = await themLoai(w, "Nhân viên spa");
  const doc = await themLoai(w, "Tài xế taxi mới");
  await ganHoSo(w, ORG, sach);
  await ganHoSo(w, ORG, khac);
  await ganHoSo(w, ORG2, doc);
  const riengKhac = (await mucVai(w, khac, 800)).json.dong.id as string;
  const ta1 = await taoMuc(w, "TA1");
  await dongTyLe(w, ta1, 1500);
  const g = await ganOk(w, sach, ta1);
  assert.deepEqual(g.json.dongRieng.map((d: { id: string }) => d.id), [riengKhac]);
  assert.deepEqual(g.json.dongRieng[0].doiTuong, { loai: "VAI", code: khac, ten: "Nhân viên spa" });
  const t = await thuTra(w, ORG);
  assert.deepEqual([t.ketQua.bac, t.ketQua.muc.id], [6, riengKhac], "«Thử tra» xét dòng riêng của MỌI loại hồ sơ mang");
  const g2 = await ganOk(w, doc, ta1);
  assert.deepEqual(g2.json.dongRieng, [], "loại chỉ ORG2 mang, không dòng riêng ⇒ không cảnh báo");
  assert.deepEqual([(await thuTra(w, ORG2)).ketQua.bac], [9]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-13 — đổi mức của loại hoặc sửa số mức ⇒ đơn đã chụp giữ số (so bản chụp bằng SQL trước / sau); đơn sau theo mức mới (ca vàng SV-TA-03)
// ---------------------------------------------------------------------------------------------------------------------------------------------
// ADR-0148 Q4: dòng / gắn đã có đơn chụp HÔM NAY chỉ đổi được từ NGÀY MAI (bản chụp phải nằm trong khoảng ngày dòng của nó) — nên ba đơn A, B, C xác nhận ở
// BA NGÀY liên tiếp (đồng hồ giả `mock.timers`, 10:00 giờ VN), đổi chính sách / sửa số áp từ ngày hôm sau. Ý của ca vàng giữ nguyên.
test("N-13 / SV-TA-03: đơn A xác nhận khi loại gắn TA1 (10%); hôm sau đổi sang TA3 (12%) ⇒ đơn B 240.000đ, A giữ 10%; hôm sau nữa sửa số TA3 (đóng dòng, thêm 15%) ⇒ đơn C 15%, A và B giữ nguyên", async (t) => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2027-03-10T03:00:00.000Z") });
  t.after(() => mock.timers.reset());
  const sangHomSau = () => mock.timers.tick(86_400_000);
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  await ganHoSo(w, ORG, loai);
  const ta1 = await taoMuc(w, "TA1");
  const ta3 = await taoMuc(w, "TA3");
  const d1 = await dongTyLe(w, ta1, 1000);
  const d3 = await dongTyLe(w, ta3, 1200);
  const g1 = await ganOk(w, loai, ta1);
  const a = await xacNhan(w, ORG);
  const chupA = chup(w, a);
  assert.deepEqual([chupA[0].commission_rate_bp, chupA[0].commission_rule_id], [1000, d1]);
  assert.equal(await hoaHongVanPhong(w, a), 200_000);

  // Hôm sau — đổi mức: đóng gắn cũ tới hôm qua (ngày đơn A chụp), mở gắn mới từ hôm nay.
  sangHomSau();
  await ok(ketThucGan(w, g1.json.gan.id, inDays(-1)), 200);
  await ganOk(w, loai, ta3, vnHomNay());
  const b = await xacNhan(w, ORG);
  const chupB = chup(w, b);
  assert.deepEqual([chupB[0].commission_rate_bp, chupB[0].commission_rule_id], [1200, d3]);
  assert.equal(await hoaHongVanPhong(w, b), 240_000, "SV-TA-03: đơn B 240.000đ");
  assert.deepEqual(chup(w, a), chupA, "đơn A giữ nguyên bản chụp (SQL trước / sau)");
  assert.equal(await hoaHongVanPhong(w, a), 200_000, "đơn A vẫn 10%");

  // Hôm sau nữa — sửa số mức = đóng dòng cũ tới hôm qua (ngày đơn B chụp), thêm dòng mới từ hôm nay.
  sangHomSau();
  await ok(dongDong(w, d3, inDays(-1)), 200);
  const d3b = await dongTyLe(w, ta3, 1500, { tuNgay: vnHomNay() });
  const c = await xacNhan(w, ORG);
  assert.deepEqual([chup(w, c)[0].commission_rate_bp, chup(w, c)[0].commission_rule_id], [1500, d3b]);
  assert.deepEqual(chup(w, a), chupA, "A giữ sau khi sửa số");
  assert.deepEqual(chup(w, b), chupB, "B giữ sau khi sửa số");
  assert.equal(await hoaHongVanPhong(w, b), 240_000);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// SV-TA-06 — hồ sơ mang hai loại gắn hai mức KHÁC SỐ ở cùng bậc ⇒ thiếu mức (RULE_CONFLICT), đơn bị giữ; cùng số thì không xung đột
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("SV-TA-06: hai loại → hai mức khác số cùng bậc ⇒ bản chụp MISSING / RULE_CONFLICT, không 0, «Đã giao» bị giữ; đối chứng hai mức cùng số ⇒ SET", async () => {
  const w = setup();
  const l1 = await themLoai(w, "Lễ tân");
  const l2 = await themLoai(w, "Nhân viên spa");
  await ganHoSo(w, ORG, l1);
  await ganHoSo(w, ORG, l2);
  const ta1 = await taoMuc(w, "TA1");
  const ta2 = await taoMuc(w, "TA2");
  await dongTyLe(w, ta1, 1000);
  await dongTyLe(w, ta2, 1200);
  await ganOk(w, l1, ta1);
  await ganOk(w, l2, ta2);
  const t = await thuTra(w, ORG);
  assert.equal(t.ketQua.trangThai, "MISSING");
  const id = await xacNhan(w, ORG);
  const c = chup(w, id);
  assert.deepEqual([c[0].commission_status, c[0].missing_reason, c[0].commission_rate_bp, c[0].beneficiary_party_id], ["MISSING", "RULE_CONFLICT", null, ORG]);
  await ok(w.call("POST", `/api/orders/${id}/payments`, { as: SA, body: { soTien: 2_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } }), 201, "thu đủ");
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SA, body: {} });
  assert.equal(g.status, 409, g.text);
  assert.match(g.text, /not_deliverable/);

  // Đối chứng: hồ sơ khác mang hai loại gắn hai mức CÙNG số ⇒ SET 10%.
  const l3 = await themLoai(w, "Lễ tân ba");
  const l4 = await themLoai(w, "Lễ tân bốn");
  await ganHoSo(w, ORG2, l3);
  await ganHoSo(w, ORG2, l4);
  const ta4 = await taoMuc(w, "TA4");
  const ta5 = await taoMuc(w, "TA5");
  await dongTyLe(w, ta4, 1000);
  await dongTyLe(w, ta5, 1000);
  await ganOk(w, l3, ta4);
  await ganOk(w, l4, ta5);
  const id2 = await xacNhan(w, ORG2);
  assert.deepEqual([chup(w, id2)[0].commission_status, chup(w, id2)[0].commission_rate_bp], ["SET", 1000]);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// N-19 — tập con quyền: Kế toán, Quản trị, Toàn quyền ghi; Bán hàng chỉ xem; HDV, Nhân sự, Đối tác, Tài xế, Tài xế đối tác, tài khoản lai ⇒ 403; không ai bị 403 làm đổi dữ liệu
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("N-19: route mức TA — Bán hàng GET 200, mọi lệnh ghi 403; HDV, Nhân sự, Đối tác, Tài xế, Tài xế đối tác, tài khoản lai Kế toán + Đối tác 403 cả xem lẫn ghi (thân hợp lệ, mã thật); không đổi dữ liệu", async () => {
  const w = setup();
  const l1 = await themLoai(w, "Lễ tân");
  const l2 = await themLoai(w, "Nhân viên spa");
  const ta1 = await taoMuc(w, "TA1");
  const ta2 = await taoMuc(w, "TA2");
  const dong = await dongTyLe(w, ta1, 1000);
  const g = await ganOk(w, l1, ta1);
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT, body: {} }), 200);
  await ganHoSo(w, ORG, l1);
  const lenh: [string, string, unknown][] = [
    ["POST", "/api/pricing/muc-ta", { ten: "TA mới của người không quyền" }],
    ["POST", "/api/pricing/muc-ta/gan", { loai: l2, muc: ta1, tuNgay: "2026-01-01" }],
    ["POST", `/api/pricing/muc-ta/gan/${g.json.gan.id}/ket-thuc`, { denNgay: "2026-12-31" }],
    ["POST", `/api/pricing/muc-ta/${ta1}/dong`, { phamVi: "SERVICE", catalogCode: "ZA1", kieu: "RATE", tyLeBp: 1300, tuNgay: "2026-01-01" }],
    ["POST", `/api/pricing/hoa-hong/${dong}/dong`, { denNgay: "2026-12-31" }],
    ["POST", `/api/pricing/muc-ta/${ta1}/tat`, {}],
    ["POST", `/api/pricing/muc-ta/${ta2}/bat`, {}],
  ];
  const doc: [string, string][] = [["GET", "/api/pricing/muc-ta"], ["GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=ZA1&ngay=${vnHomNay()}`]];
  const anh = () => [w.q("SELECT * FROM prc_rate_tier ORDER BY code"), w.q("SELECT * FROM prc_role_tier ORDER BY id"), w.q("SELECT * FROM prc_commission_rule ORDER BY id"), dem(w, "SELECT count(*) AS n FROM audit_log")];
  const truoc = anh();
  for (const [p, d] of doc) assert.equal((await w.call(p, d, { as: SALES })).status, 200, `Bán hàng ${d}`);
  for (const [p, d, b] of lenh) assert.equal((await w.call(p, d, { as: SALES, body: b })).status, 403, `Bán hàng ${d}`);
  for (const as of [HDV, HR, DT, DRV, DP, KP]) {
    for (const [p, d] of doc) {
      const r = await w.call(p, d, { as });
      assert.equal(r.status, 403, `xem ${as} ${d}: ${r.text}`);
      assert.ok(!r.text.includes("TA1") && !r.text.includes("Lễ tân"), `thân 403 không lộ tên mức / loại (${as})`);
    }
    for (const [p, d, b] of lenh) assert.equal((await w.call(p, d, { as, body: b })).status, 403, `ghi ${as} ${d}`);
  }
  assert.deepEqual(anh(), truoc, "không lời gọi 403 nào đổi dữ liệu hay để lại nhật ký");
  // Có răng: cùng các lệnh do Kế toán, Quản trị, Toàn quyền gọi thì tới logic (không 403, không 5xx).
  const ten = { [KT]: "Kế toán", [ADM]: "Quản trị", [SA]: "Toàn quyền" } as Record<string, string>;
  for (const as of [KT, ADM, SA]) {
    for (const [p, d] of doc) assert.equal((await w.call(p, d, { as })).status, 200, `${ten[as]} xem ${d}`);
    const r = await w.call("POST", "/api/pricing/muc-ta", { as, body: { ten: `TA của ${ten[as]}` } });
    assert.equal(r.status, 201, `${ten[as]} tạo mức: ${r.text}`);
  }
  const trangThai: string[] = [];
  for (const [p, d, b] of lenh.slice(1)) {
    const r = await w.call(p, d, { as: ADM, body: b });
    trangThai.push(`${r.status} ${d}`);
    assert.ok(r.status !== 403 && r.status < 500, `Quản trị ${d}: ${r.status} ${r.text}`);
  }
  assert.ok(trangThai.every((x) => /^20[01] /.test(x)), trangThai.join(" | "));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Vòng sửa 1 (người kiểm độc lập, Important 1): HAI đường chụp mức còn lại ở orders — chụp lại khi đổi bên đặt (PUT /api/orders/:id/booker) và bản tính thử đơn nháp
// (GET /api/orders/:id/thuong-mai) — mỗi đường một ca đỏ khi mất `gan` (typecheck không bắt `gan: []`).
// ---------------------------------------------------------------------------------------------------------------------------------------------
test("Đổi bên đặt đơn ĐÃ XÁC NHẬN sang hồ sơ có loại gắn mức TA ⇒ bản chụp mới SET đúng dòng đích mức (trỏ bản cũ), bản cũ còn nguyên", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  const loaiKhac = await themLoai(w, "Nhân viên spa");
  await ganHoSo(w, ORG, loai);
  await ganHoSo(w, ORG2, loaiKhac); // ORG2 mang loại không gắn mức nào ⇒ bản chụp đầu MISSING / NO_RULE
  const ta1 = await taoMuc(w, "TA1");
  const dong = await dongTyLe(w, ta1, 1000);
  await ganOk(w, loai, ta1);
  const id = await xacNhan(w, ORG2);
  const cu = chup(w, id);
  assert.deepEqual([cu.length, cu[0].commission_status, cu[0].missing_reason], [1, "MISSING", "NO_RULE"]);
  const moc = String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at);
  await ok(w.call("PUT", `/api/orders/${id}/booker`, { as: SALES, body: { customerName: "Khách Giả", customerPhone: "0900000099", bookerPartyId: ORG, expectedUpdatedAt: moc } }), 200, "đổi bên đặt");
  const moi = w.q("SELECT * FROM ord_service_terms WHERE order_id = ? AND supersedes_id IS NOT NULL", id);
  assert.equal(moi.length, 1, "chụp lại đúng một bản mới");
  assert.deepEqual([moi[0].supersedes_id, moi[0].commission_status, moi[0].commission_rate_bp, moi[0].commission_rule_id, moi[0].beneficiary_party_id], [cu[0].id, "SET", 1000, dong, ORG]);
  assert.deepEqual(w.q("SELECT * FROM ord_service_terms WHERE id = ?", cu[0].id), cu, "bản cũ còn nguyên");
  assert.equal(await hoaHongVanPhong(w, id), 200_000);
});

test("Bản tính thử đơn NHÁP (phần thương mại) với bên đặt có loại gắn mức TA ⇒ ra đúng số theo mức TA, không «thiếu mức», không ghi bản chụp", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lễ tân");
  await ganHoSo(w, ORG, loai);
  const ta1 = await taoMuc(w, "TA1");
  await dongTyLe(w, ta1, 1200);
  await ganOk(w, loai, ta1);
  const id = nhap(w, ORG);
  const r = await ok(w.call("GET", `/api/orders/${id}/thuong-mai`, { as: SALES }), 200, "thương mại đơn nháp"); // ADR-0135: nháp chỉ người lập đọc
  assert.equal(r.json.vanPhong.duKien, true, "đơn nháp ⇒ bản tính thử");
  const d = r.json.vanPhong.dong[0];
  assert.deepEqual([d.muc, d.hoaHong, d.thieu], ["12%", 240_000, null]);
  assert.equal(chup(w, id).length, 0, "tính thử không ghi bản chụp");
});
