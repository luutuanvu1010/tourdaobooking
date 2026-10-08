// Phần thương mại của đơn qua route thật (sổ đại lý đợt 1 — Task 5; đặc tả 2026-10-08 §6, §12; ADR-0077 điều 10–11). Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs.
// Hai route: `GET /api/orders/:id/thuong-mai` (văn phòng thấy mức, Đối tác — kể cả tài khoản lai — chỉ thấy số tiền hoa hồng của mình) và
// `POST /api/orders/:id/thuong-mai/:serviceId` (Kế toán / Quản trị / Toàn quyền ghi mức tay có lý do; bản chụp cũ giữ nguyên, bản mới trỏ về bản cũ).
// Thấy chặn thật (P16): xem bảng ở nhật ký thi công Task 5 (docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const FIELD = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const KT2 = "44444444-4444-4444-8444-444444444445";
const SUP = "55555555-5555-4555-8555-555555555555";
const DT_A = "88888888-8888-4888-8888-88888888888a";
const DT_B = "88888888-8888-4888-8888-88888888888b";
const TXC = "66666666-6666-4666-8666-666666666661"; // DRIVER
const TXDT = "66666666-6666-4666-8666-666666666662"; // DRIVER_PARTNER
const NS = "66666666-6666-4666-8666-666666666663"; // HR
const LAI_BAN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"; // SALES + PARTNER
const LAI_KT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2"; // ACCOUNTING + PARTNER
const AT = "2026-10-01T00:00:00.000Z";
// Ngày đi = hôm nay (giờ VN): cửa sổ xác nhận chỉ nhận dịch vụ có ngày đi từ hôm nay trở đi.
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [FIELD, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]], [KT2, "0900000005", "Mai Kế Toán", ["ACCOUNTING"]], [SUP, "0900000006", "Chủ", ["SUPER_ADMIN"]],
    [DT_A, "0900000007", "Đại Lý A", ["PARTNER"]], [DT_B, "0900000008", "Đại Lý B", ["PARTNER"]],
    [TXC, "0900000009", "Tài Xế Công Ty", ["DRIVER"]], [TXDT, "0900000010", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]], [NS, "0900000011", "Hà Nhân Sự", ["HR"]],
    [LAI_BAN, "0900000012", "Sơn Lai Bán", ["SALES", "PARTNER"]], [LAI_KT, "0900000013", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  // Vai bên ngoài chèn SAU quyền (trigger LC-1 chặn quyền nội bộ trên hồ sơ đã mang vai bên ngoài). Tài khoản lai KHÔNG mang vai ngoài.
  for (const [r, p] of [["r-dta", DT_A], ["r-dtb", DT_B]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(r, `pty-${p}`, AT, AT);
  }
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý C', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 0, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const congTyChu = (w: W): string => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
/** Đơn NHÁP của `chu`, bên đặt `booker`, các dịch vụ [mã | null (nhập tay), thành tiền]. */
function nhap(w: W, chu: string, booker: string | null, dv: [string | null, number][]): string {
  const id = uuid();
  const tong = dv.reduce((s, [, t]) => s + t, 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, chu, tong, tong, tong, booker, AT, AT);
  dv.forEach(([code, t], i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`).run(s, id, i, code, `DV ${i}`, code ? "perPax" : "manual", vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`)
      .run(`${s}-i`, id, s, code, code ? "adult" : null, t, code ? t : null, t);
  });
  return id;
}
const dv = (id: string, i = 0) => `${id}-s${i}`;
const xacNhan = (w: W, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
/** Đơn đã xác nhận (có bản chụp) của SALES. */
async function daXacNhan(w: W, booker: string | null, dvs: [string | null, number][], chu = SALES): Promise<string> {
  const id = nhap(w, chu, booker, dvs);
  const r = await xacNhan(w, id, chu);
  assert.equal(r.status, 200, r.text);
  return id;
}
const muc = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", ...body } });
const mucVai = (tyLeBp = 1000) => ({ doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp });
const xem = (w: W, id: string, as: string) => w.call("GET", `/api/orders/${id}/thuong-mai`, { as });
const ghi = (w: W, id: string, serviceId: string, as: string, body: unknown) => w.call("POST", `/api/orders/${id}/thuong-mai/${serviceId}`, { as, body });
const LY_DO = "thoả thuận miệng với CTV Lan";
const tay15 = { lyDo: LY_DO, hoaHong: { kieu: "RATE", tyLeBp: 1500 } };
const bangChup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY created_at, id", id);
const dongHienHanh = (w: W, id: string) => w.q(`SELECT * FROM ord_service_terms t WHERE t.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`, id);
const nhatKy = (w: W, id: string, action: string) => w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ?", id, action);
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác ghi giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}
function chenTruocLoCho(w: W, re: RegExp, truoc: () => Promise<void>): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; await truoc(); }
    return goc(stmts);
  };
}
/** Mọi khoá (đệ quy) của một giá trị JSON. */
const khoaCua = (x: unknown): string[] => (Array.isArray(x) ? x.flatMap(khoaCua) : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => [k, ...khoaCua(v)]) : []);

// ---- (1) tỷ lệ mua lại của nhà cung cấp: chỉ người có supply.terms.view ----

test("(1) Kế toán thấy tỷ lệ mua lại 80% và giá vốn; Bán hàng thấy mức hoa hồng nhưng KHÔNG thấy a% hay giá vốn (trong cả thân phản hồi)", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  w.sqlite.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'HONTAM', 'pty-ncc', 'pty-ncc', 8000, '2026-01-01', ?, ?)`).run(AT, AT);
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 2_000_000]]);
  for (const as of [KT, ADM, SUP]) {
    const r = await xem(w, id, as);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    const d = r.json.vanPhong.dong[0];
    assert.equal(d.nhaCungCap.tyLeMua, "80%", as);
    assert.equal(d.nhaCungCap.giaVon, 1_600_000, as);
    assert.equal(d.muc, "10%");
    assert.equal(d.hoaHong, 200_000);
    assert.equal(d.giaDaiLy, 1_800_000);
    assert.deepEqual(d.nguoiBan, { ten: "i-resort", laCongTy: false });
  }
  const b = await xem(w, id, SALES);
  assert.equal(b.status, 200, b.text);
  const d = b.json.vanPhong.dong[0];
  assert.equal(d.muc, "10%");
  assert.equal(d.hoaHong, 200_000);
  assert.equal("nhaCungCap" in d, false);
  assert.doesNotMatch(b.text, /nhaCungCap|giaVon|tyLeMua|80%|\b8000\b|\b1600000\b|1\.600\.000/, "Bán hàng không thấy a% / giá vốn ở bất cứ chỗ nào trong thân");
});

// ---- (2) đơn nháp: tính thử, không ghi ----

test("(2) đơn nháp ⇒ duKien = true, tính theo bảng hôm nay, KHÔNG ghi bản chụp và KHÔNG ghi nhật ký", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  const id = nhap(w, SALES, "pty-dla", [["HONTAM", 2_000_000], [null, 300_000]]);
  const nhatKyTruoc = Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n);
  const r = await xem(w, id, KT);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.vanPhong.duKien, true);
  assert.equal(r.json.vanPhong.chuaChup, false);
  assert.equal(r.json.vanPhong.dong[0].hoaHong, 200_000);
  assert.equal(r.json.vanPhong.dong[1].hoaHong, null, "dòng nhập tay: thiếu mức, không tự lấy 0");
  assert.equal(r.json.vanPhong.tong.hoaHong, null, "còn dòng thiếu mức ⇒ tổng không cộng nửa vời");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id)[0].n), 0, "xem đơn nháp không ghi bản chụp");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ?", id)[0].n), nhatKyTruoc, "xem đơn nháp không ghi nhật ký");
});

// ---- (3) Đối tác ----

test("(3) Đối tác xem đơn của mình ⇒ DTO hẹp `doiTac` (số tiền hoa hồng, không tỷ lệ); đơn của đại lý khác ⇒ cùng mã lỗi với trang chi tiết đơn", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  const cuaA = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", 2_000_000]], DT_A);
  const cuaB = await daXacNhan(w, `pty-${DT_B}`, [["HONTAM", 1_000_000]], DT_B);
  const r = await xem(w, cuaA, DT_A);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["doiTac"]);
  assert.equal(r.json.doiTac.dong[0].hoaHong, 200_000);
  assert.equal(r.json.doiTac.dong[0].giaDaiLy, 1_800_000);
  assert.equal(r.json.doiTac.tong.hoaHong, 200_000);
  assert.equal(r.json.doiTac.choCongTyCaiMuc, false);
  assert.doesNotMatch(r.text, /%|đ\/khách|nhaCungCap|giaVon|tyLe|rule|source/i, "Đối tác không thấy tỷ lệ, đ/khách, giá vốn, nguồn");
  const chiTiet = await w.call("GET", `/api/orders/${cuaB}`, { as: DT_A });
  const thuongMai = await xem(w, cuaB, DT_A);
  assert.notEqual(chiTiet.status, 200);
  assert.equal(thuongMai.status, chiTiet.status, "cùng mã lỗi với trang chi tiết đơn (không dò được đơn của người khác)");
  assert.equal(thuongMai.json.error.code, chiTiet.json.error.code);
});

test("(3b) tài khoản lai Bán hàng + Đối tác ⇒ DTO hẹp; ghi mức tay 403; lịch sử đơn không còn dòng order_terms_*; Kế toán vẫn thấy dòng đó", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 2_000_000]], LAI_BAN); // đơn của chính tài khoản lai ⇒ lịch sử đơn hiện cho họ (order.history.view = ownOrAssigned)
  assert.equal((await ghi(w, id, dv(id), KT, tay15)).status, 200);
  const r = await xem(w, id, LAI_BAN);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["doiTac"], "có quyền Đối tác là áp DTO hẹp, dù còn quyền Bán hàng");
  assert.equal(r.json.doiTac.dong[0].hoaHong, 300_000, "số tiền hoa hồng theo mức tay 15% của 2.000.000");
  assert.doesNotMatch(r.text, /%|đ\/khách|nhaCungCap|giaVon|tyLe/);
  const truocGhi = bangChup(w, id).length;
  assert.equal((await ghi(w, id, dv(id), LAI_BAN, tay15)).status, 403);
  assert.equal(bangChup(w, id).length, truocGhi, "403 không ghi gì");
  const lai = await w.call("GET", `/api/orders/${id}`, { as: LAI_BAN });
  assert.equal(lai.status, 200, lai.text);
  assert.ok(lai.json.history.length > 0, "lịch sử vẫn có các dòng khác");
  assert.equal(lai.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")).length, 0);
  const ketoan = await w.call("GET", `/api/orders/${id}`, { as: KT });
  assert.ok(ketoan.json.history.some((e: { action: string }) => e.action === "order_terms_manual"), "văn phòng vẫn thấy dòng ghi mức tay");
  assert.ok(ketoan.json.history.some((e: { action: string }) => e.action === "order_terms_captured"));
});

test("(3d) GHIM HIỆN TRẠNG: tài khoản lai Bán hàng + Đối tác mở được phần đối tác của đơn đại lý KHÁC (ô order.view của Bán hàng = mọi đơn) và chỉ nhận DTO hẹp — số tiền, không tỷ lệ (cần chủ xác nhận phạm vi)", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  const cuaB = await daXacNhan(w, `pty-${DT_B}`, [["HONTAM", 2_000_000]], DT_B);
  const r = await xem(w, cuaB, LAI_BAN);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["doiTac"]);
  assert.equal(r.json.doiTac.dong[0].hoaHong, 200_000);
  assert.doesNotMatch(r.text, /%|đ\/khách|nhaCungCap|giaVon|tyLe/);
  assert.equal((await xem(w, cuaB, DT_A)).status, 403, "Đối tác thuần thì không mở được đơn của đại lý khác");
});

test("(3c) tài khoản lai Kế toán + Đối tác ⇒ POST ghi mức tay 403, không bản chụp mới, không nhật ký", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const truoc = bangChup(w, id).length;
  const nhatKyTruoc = nhatKy(w, id, "order_terms_manual").length;
  const r = await ghi(w, id, dv(id), LAI_KT, tay15);
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "forbidden");
  assert.equal(bangChup(w, id).length, truoc);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, nhatKyTruoc);
  const doc = await xem(w, id, LAI_KT);
  assert.deepEqual(Object.keys(doc.json), ["doiTac"], "đọc cũng chỉ thấy DTO hẹp");
});

// ---- (4) vai ngoài phạm vi ----

test("(4) Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 ở cả đọc lẫn ghi, không ghi gì", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const truoc = bangChup(w, id).length;
  for (const as of [TXC, TXDT, NS]) {
    const doc = await xem(w, id, as);
    assert.equal(doc.status, 403, `${as}: ${doc.text}`);
    const ghiTay = await ghi(w, id, dv(id), as, tay15);
    assert.equal(ghiTay.status, 403, `${as}: ${ghiTay.text}`);
  }
  assert.equal(bangChup(w, id).length, truoc);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0);
});

// ---- (5) A-4: CTV, thiếu mức → Kế toán ghi tay ----

test("(5) A-4: dòng thiếu mức ⇒ Kế toán ghi tay 15% ⇒ hoa hồng 150.000; bản cũ giữ nguyên, bản mới là MANUAL trỏ về bản cũ, đúng một dòng nhật ký", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]); // không có mức nào cho đại lý ⇒ thiếu
  const truoc = await xem(w, id, KT);
  assert.equal(truoc.status, 200, truoc.text);
  assert.equal(truoc.json.vanPhong.dong[0].hoaHong, null);
  assert.equal(truoc.json.vanPhong.dong[0].muc, null);
  assert.ok(truoc.json.vanPhong.dong[0].thieu, "có câu tiếng Việt báo thiếu mức");
  assert.equal(truoc.json.vanPhong.tong.hoaHong, null);
  const [cu] = dongHienHanh(w, id);
  assert.equal(cu.commission_status, "MISSING");

  const r = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(r.status, 200, r.text);
  const d = r.json.vanPhong.dong[0];
  assert.equal(d.hoaHong, 150_000);
  assert.equal(d.giaDaiLy, 850_000);
  assert.equal(d.muc, "15%");
  assert.equal(d.ghiTay, true);
  assert.equal(d.thieu, null);
  assert.equal(r.json.vanPhong.tong.hoaHong, 150_000);

  const ds = bangChup(w, id);
  assert.equal(ds.length, 2, "bản chụp cũ còn nguyên, bản mới thêm vào");
  const moi = ds.find((x: { source: string }) => x.source === "MANUAL")!;
  assert.equal(moi.supersedes_id, cu.id);
  assert.equal(moi.commission_status, "SET");
  assert.equal(moi.commission_kind, "RATE");
  assert.equal(moi.commission_rate_bp, 1500);
  assert.equal(moi.commission_rule_id, null);
  assert.equal(moi.reason, LY_DO);
  assert.equal(moi.beneficiary_party_id, cu.beneficiary_party_id, "người hưởng giữ nguyên");
  assert.equal(moi.created_by, KT);
  const cuSauGhi = ds.find((x: { id: string }) => x.id === cu.id)!;
  assert.equal(cuSauGhi.commission_status, "MISSING", "bản cũ không bị sửa");
  assert.equal(dongHienHanh(w, id).length, 1);
  assert.equal(dongHienHanh(w, id)[0].id, moi.id);

  const nk = nhatKy(w, id, "order_terms_manual");
  assert.equal(nk.length, 1);
  assert.doesNotMatch(String(nk[0].detail), /thoả thuận|CTV|0\d{8}/, "nhật ký không chép lý do tự do");
  assert.match(String(nk[0].detail), /15%/);
  // Xem lại bằng route đọc: cùng con số, cờ ghi tay.
  const lai = await xem(w, id, KT);
  assert.equal(lai.json.vanPhong.dong[0].hoaHong, 150_000);
  assert.equal(lai.json.vanPhong.dong[0].ghiTay, true);
});

test("(5b) ghi tay lần hai trên cùng dòng ⇒ chuỗi bản chụp nối tiếp (bản MANUAL thứ hai trỏ bản MANUAL thứ nhất), vẫn đúng một bản hiện hành", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  assert.equal((await ghi(w, id, dv(id), KT, tay15)).status, 200);
  const r = await ghi(w, id, dv(id), ADM, { lyDo: "Quản trị sửa lại theo hợp đồng", hoaHong: { kieu: "PER_PAX", moiKhach: 40_000 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.vanPhong.dong[0].hoaHong, 40_000, "1 khách × 40.000");
  assert.equal(r.json.vanPhong.dong[0].muc, "40.000đ/khách");
  assert.equal(bangChup(w, id).length, 3);
  assert.equal(dongHienHanh(w, id).length, 1);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 2);
});

// ---- (6) kiểm hợp lệ ----

test("(6) kiểm hợp lệ: thiếu lý do 400; đơn nháp 409; đã giao 409; Bán hàng / HDV / Đối tác 403; đơn xác nhận trước đợt 1 ⇒ 409 chờ chụp bù; dịch vụ lạ 404", async () => {
  const w = setup();
  await muc(w, mucVai(1000));
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const truoc = bangChup(w, id).length;

  for (const [ten, than] of [["không có lý do", { hoaHong: { kieu: "RATE", tyLeBp: 1500 } }], ["lý do quá ngắn", { lyDo: "ngắn", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }],
    ["không có phần nào để ghi", { lyDo: LY_DO }], ["lý do chứa số điện thoại", { lyDo: "gọi 0905 123 456 để chốt", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }],
    ["tỷ lệ quá 100%", { lyDo: LY_DO, hoaHong: { kieu: "RATE", tyLeBp: 10_001 } }]] as const) {
    const r = await ghi(w, id, dv(id), KT, than);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", ten);
  }
  assert.equal((await w.call("POST", `/api/orders/${id}/thuong-mai/${dv(id)}`, { as: KT, body: "không phải JSON" })).status, 400);

  for (const as of [SALES, FIELD, DT_A, DT_B]) {
    const r = await ghi(w, id, dv(id), as, tay15);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(bangChup(w, id).length, truoc, "400 và 403 không ghi gì");
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0);

  const khongPhaiUuid = await ghi(w, "khong-phai-uuid", dv(id), KT, tay15);
  assert.equal(khongPhaiUuid.status, 404);

  // dịch vụ lạ trong đơn có bản chụp ⇒ 404
  const la = await ghi(w, id, `${id}-khong-co`, KT, tay15);
  assert.equal(la.status, 404, la.text);

  // đơn nháp
  const nhapId = nhap(w, SALES, "pty-dla", [["HONTAM", 1_000_000]]);
  const n = await ghi(w, nhapId, dv(nhapId), KT, tay15);
  assert.equal(n.status, 409, n.text);
  assert.equal(n.json.error.code, "not_confirmed");

  // đơn xác nhận trước khi có bảng mức (không có dòng bản chụp nào)
  const cu = nhap(w, SALES, "pty-dla", [["HONTAM", 1_000_000]]);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, cu);
  const c = await ghi(w, cu, dv(cu), KT, tay15);
  assert.equal(c.status, 409, c.text);
  assert.equal(c.json.error.code, "chua_chup");
  assert.equal(c.json.error.message, "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", cu)[0].n), 0);
  const xemCu = await xem(w, cu, KT);
  assert.equal(xemCu.status, 200, xemCu.text);
  assert.equal(xemCu.json.vanPhong.chuaChup, true);
  assert.equal(xemCu.json.vanPhong.duKien, false);
  assert.equal(xemCu.json.vanPhong.dong[0].hoaHong, null, "chưa chụp ⇒ không bao giờ lặng lẽ 0");
  assert.ok(xemCu.json.vanPhong.dong[0].thieu);

  // đã giao
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?").run(AT, SUP, AT, id);
  const g = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "order_delivered");
  assert.match(g.json.error.message, /^Đơn đã Đã giao – đã thu đủ/);
  assert.equal(bangChup(w, id).length, truoc);
});

test("(6b) đơn đã huỷ ⇒ đọc 404 (không có phần thương mại để xem); ghi 409 không phải đơn đã xác nhận", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  assert.equal((await xem(w, id, KT)).status, 404);
  assert.equal((await ghi(w, id, dv(id), KT, tay15)).status, 409);
});

test("(6c) Quản trị và Toàn quyền ghi mức tay được; chỉ-HDV không phụ trách đơn đọc 404 như đơn không tồn tại", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000], ["HONTAM", 500_000]]);
  assert.equal((await ghi(w, id, dv(id, 0), ADM, tay15)).status, 200);
  assert.equal((await ghi(w, id, dv(id, 1), SUP, tay15)).status, 200);
  const hdv = await xem(w, id, FIELD);
  assert.equal(hdv.status, 404, hdv.text);
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: FIELD })).status, 404, "cùng mã với trang chi tiết đơn");
});

// ---- Người hưởng và người bán ----

test("(6d) đơn không có người hưởng (khách lẻ): ghi hoa hồng ⇒ 409 `khong_nguoi_huong` (không 500, không dòng thừa); đổi người bán cùng đơn thì được", async () => {
  const w = setup();
  const id = await daXacNhan(w, null, [["HONTAM", 1_000_000]]);
  assert.equal(dongHienHanh(w, id)[0].commission_status, "NONE");
  const truoc = bangChup(w, id).length;
  const r = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "khong_nguoi_huong");
  assert.equal(bangChup(w, id).length, truoc, "không dòng thừa");
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0);

  const ok = await ghi(w, id, dv(id), KT, { lyDo: "mua lại từ i-resort theo hợp đồng", nguoiBan: { partyId: "pty-ncc", tyLeMuaBp: 8000 } });
  assert.equal(ok.status, 200, ok.text);
  const moi = dongHienHanh(w, id)[0];
  assert.equal(moi.source, "MANUAL");
  assert.equal(moi.commission_status, "NONE");
  assert.equal(moi.seller_party_id, "pty-ncc");
  assert.equal(moi.supplier_party_id, "pty-ncc");
  assert.equal(moi.cost_rate_bp, 8000);
  assert.equal(ok.json.vanPhong.dong[0].nhaCungCap.tyLeMua, "80%");
});

test("(6e) người bán ghi tay: nhà cung cấp thiếu a% 400; công ty chủ kèm a% 400; hồ sơ không phải nhà cung cấp 400 — không dòng thừa", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const truoc = bangChup(w, id).length;
  const ly = "đổi người bán theo hợp đồng mới";
  const ca: [string, unknown][] = [
    ["nhà cung cấp không kèm a%", { lyDo: ly, nguoiBan: { partyId: "pty-ncc" } }],
    ["công ty chủ kèm a%", { lyDo: ly, nguoiBan: { partyId: congTyChu(w), tyLeMuaBp: 8000 } }],
    ["hồ sơ không phải nhà cung cấp", { lyDo: ly, nguoiBan: { partyId: "pty-dla", tyLeMuaBp: 8000 } }],
  ];
  for (const [ten, than] of ca) {
    const r = await ghi(w, id, dv(id), KT, than);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", ten);
  }
  assert.equal(bangChup(w, id).length, truoc);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0);
  // công ty chủ không kèm a% ⇒ được
  const ok = await ghi(w, id, dv(id), KT, { lyDo: ly, nguoiBan: { partyId: congTyChu(w) } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.vanPhong.dong[0].nguoiBan.laCongTy, true);
});

// ---- (7) hai người cùng ghi ----

test("(7a) hai Kế toán ghi cùng một dòng cùng lúc ⇒ không 500; mỗi lệnh thắng thêm đúng một bản + một dòng nhật ký; luôn đúng một bản hiện hành", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  await w.token(KT); // mở phiên trước: khung thử chưa chịu hai lời gọi ĐẦU TIÊN của cùng tài khoản chèn phiên đồng thời
  await w.token(KT2);
  const [a, b] = await Promise.all([ghi(w, id, dv(id), KT, tay15), ghi(w, id, dv(id), KT2, { lyDo: "Kế toán hai nhập 20%", hoaHong: { kieu: "RATE", tyLeBp: 2000 } })]);
  const mã = [a.status, b.status].sort();
  assert.ok(mã.every((s) => s === 200 || s === 409), `chỉ 200 hoặc 409, không 500: ${a.text} | ${b.text}`);
  const thang = mã.filter((s) => s === 200).length;
  assert.ok(thang >= 1, "ít nhất một lệnh thắng");
  assert.equal(bangChup(w, id).length, 1 + thang);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, thang);
  assert.equal(dongHienHanh(w, id).length, 1);
  // Khung thử chạy hai lời gọi gần như nối tiếp (lệnh sau đọc SAU khi lệnh trước ghi xong) nên thường ra [200, 200]; ca va chạm thật do 7b/7d ép xác định.
});

test("(7b) xác định: người khác ghi tay xong NGAY TRƯỚC lô của lệnh này ⇒ 409, không 500, đúng 2 bản, một bản hiện hành, KHÔNG dòng nhật ký của lệnh thua", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const [cu] = dongHienHanh(w, id);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare(`INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp,
      commission_per_pax, commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    SELECT 'chen-1', order_id, order_service_id, beneficiary_party_id, 'SET', NULL, 'RATE', 2000, NULL, NULL, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id,
      'MANUAL', 'người khác ghi trước', id, captured_date, created_at, ?, updated_at, ? FROM ord_service_terms WHERE id = ?`).run(KT2, KT2, cu.id));
  const r = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(bangChup(w, id).length, 2, "bản gốc + bản người kia chèn; lệnh thua không để lại dòng");
  assert.equal(dongHienHanh(w, id).length, 1);
  assert.equal(dongHienHanh(w, id)[0].id, "chen-1");
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0, "lệnh thua không ghi nhật ký");
});

test("(7c) xác định: đơn chuyển sang Đã giao ngay trước lô ⇒ 409, không dòng, không nhật ký", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const truoc = bangChup(w, id).length;
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?").run(AT, SUP, AT, id));
  const r = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(r.status, 409, r.text);
  assert.equal(bangChup(w, id).length, truoc);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 0);
});

test("(7d) xác định: một lệnh ghi tay THẬT chạy trọn vẹn giữa lúc lệnh này đọc và ghi ⇒ lệnh này 409, lệnh chen vào thắng", async () => {
  const w = setup();
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", 1_000_000]]);
  let chen: { status: number } | null = null;
  chenTruocLoCho(w, /INSERT INTO ord_service_terms/, async () => { chen = await ghi(w, id, dv(id), KT2, { lyDo: "Kế toán hai nhập 20%", hoaHong: { kieu: "RATE", tyLeBp: 2000 } }); });
  const r = await ghi(w, id, dv(id), KT, tay15);
  assert.equal(chen!.status, 200);
  assert.equal(r.status, 409, r.text);
  assert.equal(bangChup(w, id).length, 2);
  assert.equal(dongHienHanh(w, id)[0].commission_rate_bp, 2000);
  assert.equal(nhatKy(w, id, "order_terms_manual").length, 1);
});

// ---- (8) A-2: mức theo đầu khách, số khách đổi sau xác nhận ----

test("(8) A-2: mức 50.000đ/khách, 2 người lớn + 1 trẻ em + 1 em bé ⇒ 150.000; HDV sửa còn 3 người lớn + 1 trẻ em ⇒ 200.000; bản chụp KHÔNG đổi (mức giữ, số khách theo đơn hiện hành)", async () => {
  const w = setup();
  assert.equal((await muc(w, { ...mucVai(), kieu: "PER_PAX", tyLeBp: undefined, moiKhach: 50_000 })).status, 201);
  const tao = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678",
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 1, senior: 0, infant: 1 }, catalogPriceSeen: { adult: 500000, child: 300000, infant: 0 }, departDate: vnDay(3) }],
    },
  });
  assert.equal(tao.status, 201, tao.text);
  const id = tao.json.order.id as string;
  const sid = tao.json.order.services[0].id as string;
  // Lập đơn qua API chưa gắn được đại lý làm bên đặt (việc khác của đợt 1) — gắn thẳng ở bản nháp, rồi xác nhận bằng route thật.
  w.sqlite.prepare("UPDATE orders SET booker_party_id = 'pty-dla' WHERE id = ? AND status = 'draft'").run(id);
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
  const dau = await xem(w, id, KT);
  assert.equal(dau.status, 200, dau.text);
  assert.equal(dau.json.vanPhong.dong[0].muc, "50.000đ/khách");
  assert.equal(dau.json.vanPhong.dong[0].soKhachTinh, 3, "em bé không tính hoa hồng");
  assert.equal(dau.json.vanPhong.dong[0].hoaHong, 150_000);
  const truoc = bangChup(w, id);
  assert.equal(truoc.length, 1);

  const sua = await w.call("POST", `/api/orders/${id}/handler-money-edit`, { as: FIELD, body: { reason: "Khách thêm một người lớn", services: [{ id: sid, pax: { adult: 3, child: 1, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, sua.text);
  const sau = await xem(w, id, KT);
  assert.equal(sau.json.vanPhong.dong[0].soKhachTinh, 4);
  assert.equal(sau.json.vanPhong.dong[0].hoaHong, 200_000, "mức đã chụp × số khách hiện hành");
  assert.equal(sau.json.vanPhong.dong[0].thanhTien, 3 * 500_000 + 300_000);
  assert.deepEqual(bangChup(w, id), truoc, "bản chụp nguyên văn, không thêm không sửa");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_terms_captured'", id)[0].n), 1);
});
