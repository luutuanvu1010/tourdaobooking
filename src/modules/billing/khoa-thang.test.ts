// Khoá sổ tháng (ADR-0080 phần D1; đặc tả 2026-10-08 §8) qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs): hai route kỳ, mọi đường ghi tiền chặn ngày thuộc
// tháng đã khoá bằng 409 tiếng Việt, và Review Focus 3 — tháng bị khoá giữa lúc route kiểm và lúc ghi ⇒ trigger chặn, lỗi dịch ra cùng câu, KHÔNG 500.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
const CAU_08 = "Tháng 08/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)";
const CAU_09 = "Tháng 09/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)";

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN `tong` đồng, ngày đi hôm nay, HDV phụ trách (khuôn ma-giao-dich-route.test.ts). */
function don(w: W, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  // Sổ đại lý đợt 2 (Task 4): máy chủ chụp lúc xác nhận; đơn dựng bằng SQL phải gieo bản chụp, kẻo bước kiểm trước của «Đã giao» giữ đơn (`terms_missing`) trước cả khoá tháng.
  gieoBanChup(w.sqlite, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const khoa = (w: W, period: string, as = KT, body: unknown = {}) => w.call("POST", `/api/ledger/ky/${period}/khoa`, { as, body });
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
/** Đếm mọi dòng của bốn bảng sổ tiền — để chứng minh lệnh bị chặn KHÔNG để lại dòng nào. */
const soDongSo = (w: W) => dem(w, "SELECT (SELECT count(*) FROM bil_payment_receipt) + (SELECT count(*) FROM bil_posting) + (SELECT count(*) FROM bil_debt_line) + (SELECT count(*) FROM bil_outside_refund) AS n");
const khoaThang = (p: string) => `INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES ('${p}', '2026-10-01T00:00:00.000Z', 'kt', NULL, '2026-10-01T00:00:00.000Z', 'kt', '2026-10-01T00:00:00.000Z', 'kt')`;

/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác ghi giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}

/** Thế giới có một lần thu tháng 8 (để tháng sổ sớm nhất = 2026-08) trên MỘT đơn; trả về đơn đó. */
async function theGioiCoThang8(): Promise<{ w: W; id: string }> {
  const w = setup();
  const id = don(w);
  const r = await thu(w, KT, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: "2026-08-15" });
  assert.equal(r.status, 201, r.text);
  return { w, id };
}

test("ca 1: khoá tháng hiện tại ⇒ 400; khoá tháng sau ⇒ 400 (chỉ khoá được tháng đã qua)", async () => {
  const { w } = await theGioiCoThang8();
  const thangNay = vnHomNay().slice(0, 7);
  const thangSau = thangNay.slice(5, 7) === "12" ? `${Number(thangNay.slice(0, 4)) + 1}-01` : `${thangNay.slice(0, 4)}-${String(Number(thangNay.slice(5, 7)) + 1).padStart(2, "0")}`;
  const a = await khoa(w, thangNay);
  assert.equal(a.status, 400, a.text);
  assert.equal(a.json.error.code, "period_not_past");
  const b = await khoa(w, thangSau);
  assert.equal(b.status, 400, b.text);
  assert.equal((await khoa(w, "2026-13")).status, 400, "tháng không hợp lệ");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ky_period_close"), 0);
});

test("ca 2: Kế toán khoá — tháng đầu phải là tháng có dòng sổ sớm nhất (409 nếu sau đó); 201 + Location + nhật ký; khoá lại ⇒ 409; Quản trị ⇒ 403; Bán hàng đọc ⇒ 403", async () => {
  const { w } = await theGioiCoThang8();
  const sai = await khoa(w, "2026-09");
  assert.equal(sai.status, 409, sai.text);
  assert.equal(sai.json.error.code, "period_not_adjacent");
  const ok = await khoa(w, "2026-08");
  assert.equal(ok.status, 201, ok.text);
  assert.equal(ok.headers.get("location"), "/khoa-thang");
  assert.deepEqual(ok.json.daKhoa, ["2026-08"]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_period_closed'"), 1);
  const lai = await khoa(w, "2026-08");
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "period_already_closed");
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_period_closed'"), 1, "lần bị chặn không để lại nhật ký");
  assert.equal((await khoa(w, "2026-09", ADM)).status, 403, "Quản trị không khoá được");
  assert.equal((await khoa(w, "2026-09", SALES)).status, 403);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ky_period_close"), 1);
  assert.equal((await w.call("GET", "/api/ledger/ky", { as: SALES })).status, 403, "Bán hàng không xem được kỳ");
  assert.equal((await w.call("GET", "/api/ledger/ky", { as: ADM })).status, 403, "Quản trị không có ô xem sổ của mọi người");
});

test("ca 2b: Toàn quyền khoá được; ghi chú ≤ 200 ký tự và không chứa dãy số dài", async () => {
  const { w } = await theGioiCoThang8();
  assert.equal((await khoa(w, "2026-08", SA, { ghiChu: "x".repeat(201) })).status, 400);
  assert.equal((await khoa(w, "2026-08", SA, { ghiChu: "gọi 0912345678 nhé" })).status, 400);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ky_period_close"), 0);
  const ok = await khoa(w, "2026-08", SA, { ghiChu: "Đã đối chiếu sổ tháng 8" });
  assert.equal(ok.status, 201, ok.text);
  assert.equal(String(w.q("SELECT note FROM ky_period_close WHERE period = '2026-08'")[0].note), "Đã đối chiếu sổ tháng 8");
});

test("ca 3: sau khi khoá 2026-08 — mọi đường ghi tiền có ngày tháng 8 ⇒ 409 cùng một câu, không ghi dòng nào", async () => {
  const { w, id } = await theGioiCoThang8();
  const hdv = don(w);
  assert.equal((await thu(w, HDV, hdv, { soTien: 400_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201, "HDV khai 'Công ty thu' (tiền mặt) để có khoản chờ xác nhận");
  const choXacNhan = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", hdv)[0].id);
  const lanThu = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND amount = 100000", id)[0].id);
  assert.equal((await khoa(w, "2026-08")).status, 201);
  const truoc = soDongSo(w);
  const N = "2026-08-20";
  const bai = async (ten: string, p: Promise<{ status: number; json: { error: { code: string; message: string } } | null; text: string }>) => {
    const r = await p;
    assert.equal(r.status, 409, `${ten}: ${r.text}`);
    assert.equal(r.json?.error.code, "period_closed", ten);
    assert.equal(r.json?.error.message, CAU_08, ten);
  };
  await bai("lần thu", thu(w, KT, id, { soTien: 50_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: N }));
  await bai("công ty đã nhận", w.call("POST", `/api/ledger/company-receipts/${choXacNhan}/confirm`, { as: KT, body: { ngayPhatSinh: N } }));
  await bai("quyết toán", w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: hdv, soTien: 100_000 }], ngayPhatSinh: N } }));
  await bai("hoàn khách", w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 50_000, hinhThuc: "CASH", nguoiTra: "cong_ty", ngayPhatSinh: N } }));
  await bai("điều chỉnh", w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: lanThu, lyDo: "Đảo thử vào tháng đã khoá", ngayPhatSinh: N } }));
  await bai("thay lần thu", w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [lanThu], moi: [{ soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Thay thử vào tháng đã khoá", ngayPhatSinh: N } }));
  await bai("cọc: chi hoàn", w.call("POST", `/api/orders/${id}/coc/chi`, { as: KT, body: { duyetId: uuid(), soTien: 10_000, hinhThuc: "CASH", nguoiTra: "cong_ty", ngayPhatSinh: N } }));
  await bai("cọc: chuyển", w.call("POST", `/api/orders/${id}/coc/chuyen`, { as: KT, body: { duyetId: uuid(), soTien: 10_000, nguoiGiu: "cong_ty", ngayPhatSinh: N } }));
  await bai("cọc: hoàn ngoài", w.call("POST", `/api/orders/${id}/coc/hoan-ngoai`, { as: SA, body: { soTien: 10_000, lyDo: "Hoàn ngoài hệ thống thử", ngayPhatSinh: N } }));
  assert.equal(soDongSo(w), truoc, "không đường nào để lại dòng sổ");
});

test("ca 4: ngày tháng 9 (chưa khoá) vẫn ghi được; ngày hôm nay luôn ghi được", async () => {
  const { w, id } = await theGioiCoThang8();
  assert.equal((await khoa(w, "2026-08")).status, 201);
  assert.equal((await thu(w, KT, id, { soTien: 50_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: "2026-09-10" })).status, 201);
  assert.equal((await thu(w, KT, id, { soTien: 50_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
});

test("ca 5 (Review Focus 3): tháng 2026-09 bị khoá GIỮA lúc route kiểm và lúc ghi ⇒ trigger chặn, 409 đúng câu của tháng 9, không 500, không dòng sổ nào", async () => {
  const w = setup();
  const id = don(w);
  const truoc = soDongSo(w);
  chenTruocLo(w, /INSERT INTO bil_payment_receipt/, () => w.sqlite.exec(khoaThang("2026-09")));
  const r = await thu(w, KT, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: "2026-09-10" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "period_closed");
  assert.equal(r.json.error.message, CAU_09);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ky_period_close"), 1, "lần chèn giả đã xảy ra đúng một lần");
  assert.equal(soDongSo(w), truoc, "lô bị huỷ cả khối");
});

test("ca 5b: 'Đã giao' kèm lần thu Toàn quyền ghi lùi ngày — tháng 2026-09 bị khoá giữa lúc kiểm và lúc ghi ⇒ 409 đúng câu của tháng 9 (không phải tháng hôm nay), không 500, đơn chưa Đã giao", async () => {
  const w = setup();
  const id = don(w, 100_000);
  const truoc = soDongSo(w);
  chenTruocLo(w, /INSERT INTO bil_payment_receipt/, () => w.sqlite.exec(khoaThang("2026-09")));
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SA, body: { lanThu: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "toi", ngayPhatSinh: "2026-09-10" } } });
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "period_closed");
  assert.equal(g.json.error.message, CAU_09);
  assert.equal(soDongSo(w), truoc);
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null, "đơn chưa Đã giao: lô huỷ cả khối");
});

test("ca 6: GET /api/ledger/ky (Kế toán) ⇒ daKhoa, keTiep, bảng kiểm của tháng kế tiếp; số dư cuối tháng chỉ tính dòng có ngày ≤ cuối tháng", async () => {
  const { w, id } = await theGioiCoThang8();
  // Hai lần thu "người thu chưa rõ" (cọc cũ chuyển sang): một ở tháng 8 (sắp khoá), một ở tháng 9 — chỉ cái của tháng 9 vào bảng kiểm.
  const chen = (ngay: string, so: number) => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, NULL, 'UNKNOWN', 'OTHER', (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', ?, NULL, NULL, ?, 'he-thong', ?, 'he-thong')`).run(uuid(), id, so, ngay, AT, AT);
  chen("2026-08-10", 60_000);
  chen("2026-09-05", 70_000);
  assert.equal((await khoa(w, "2026-08")).status, 201);
  // Kế toán ghi lùi ngày 2026-09-12: HDV đang giữ 300.000 (dòng nợ mang ngày phiếu = 2026-09-12). Lần thu sau tháng 9 (hôm nay) KHÔNG vào số dư cuối tháng 9.
  assert.equal((await thu(w, KT, id, { soTien: 300_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` }, ngayPhatSinh: "2026-09-12" })).status, 201);
  const hdv = don(w);
  assert.equal((await thu(w, HDV, hdv, { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  const r = await w.call("GET", "/api/ledger/ky", { as: KT });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.daKhoa, ["2026-08"]);
  assert.equal(r.json.keTiep, "2026-09");
  assert.equal(r.json.coTheKhoa, true);
  assert.equal(r.json.bangKiem.thang, "2026-09");
  assert.deepEqual(r.json.bangKiem.chuaRoNguoiThu.map((x: { amount: number; ngay: string }) => [x.amount, x.ngay]), [[70_000, "2026-09-05"]]);
  assert.deepEqual(r.json.bangKiem.choXacNhanCongTy, []);
  assert.deepEqual(r.json.bangKiem.soDuCuoiThang, [{ ten: "Nam HDV", soDu: 300_000 }], "chỉ dòng có ngày ≤ 30/09; khoản 200.000 của hôm nay chưa tính");
  for (const k of Object.keys(r.json.bangKiem.chuaRoNguoiThu[0])) assert.ok(["orderCode", "amount", "ngay"].includes(k), `khoá thừa trong bảng kiểm: ${k}`);
  // Toàn quyền xem được; Quản trị không; Bán hàng không.
  assert.equal((await w.call("GET", "/api/ledger/ky", { as: SA })).status, 200);
});

test("ca 6b (vòng sửa 1, I-1): mọi dòng sổ ghi lùi ngày ≤ cuối tháng ⇒ số dư cuối tháng của bảng kiểm = số dư của sổ hôm nay, từng người (ghim dấu và phép nối của BALANCES_AT)", async () => {
  const w = setup();
  const a = don(w, 1_000_000);
  const b = don(w, 1_000_000);
  const c = don(w, 1_000_000);
  const ghi = async (ten: string, p: Promise<{ status: number; text: string }>) => { const r = await p; assert.equal(r.status, 201, `${ten}: ${r.text}`); };
  // Tháng 8: HDV giữ 300.000 (đơn a), công ty giữ 150.000 (đơn a), Bán hàng giữ 200.000 (đơn b), rồi HDV nộp về công ty 100.000 (quyết toán).
  await ghi("HDV giữ", thu(w, KT, a, { soTien: 300_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${HDV}` }, ngayPhatSinh: "2026-08-10" }));
  await ghi("công ty giữ", thu(w, KT, a, { soTien: 150_000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: "2026-08-12" }));
  await ghi("Bán hàng giữ", thu(w, KT, b, { soTien: 200_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${SALES}` }, ngayPhatSinh: "2026-08-14" }));
  await ghi("quyết toán", w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: a, soTien: 100_000 }], ngayPhatSinh: "2026-08-20" } }));
  assert.equal((await khoa(w, "2026-08")).status, 201);
  // Tháng 9 (ghi lùi ngày): Bán hàng giữ thêm 90.000 (đơn c); đảo lần thu 200.000 của Bán hàng; HDV hoàn khách 50.000 từ số đang giữ.
  const lanThuBanHang = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND amount = 200000", b)[0].id);
  await ghi("Bán hàng giữ thêm", thu(w, KT, c, { soTien: 90_000, hinhThuc: "CASH", nguoiThu: { partyId: `pty-${SALES}` }, ngayPhatSinh: "2026-09-03" }));
  await ghi("đảo lần thu", w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: lanThuBanHang, lyDo: "Đảo lần thu ghi nhầm người giữ", ngayPhatSinh: "2026-09-05" } }));
  await ghi("hoàn khách", w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: a, soTien: 50_000, hinhThuc: "CASH", nguoiTra: { partyId: `pty-${HDV}` }, ngayPhatSinh: "2026-09-10" } }));
  // Không có dòng nào sau 30/09/2026 (hôm nay > 30/09): hai bên phải bằng nhau từng người — KHÔNG viết cứng số dư.
  const ky = await w.call("GET", "/api/ledger/ky", { as: KT });
  assert.equal(ky.status, 200, ky.text);
  assert.equal(ky.json.keTiep, "2026-09");
  const so = await w.call("GET", "/api/ledger", { as: KT });
  assert.equal(so.status, 200, so.text);
  const theoTen = (x: { ten: string }, y: { ten: string }) => x.ten.localeCompare(y.ten);
  const cuoiThang = [...ky.json.bangKiem.soDuCuoiThang].sort(theoTen);
  const homNay = so.json.soDu.map((x: { ten: string; dangGiu: number }) => ({ ten: x.ten, soDu: x.dangGiu })).sort(theoTen);
  assert.deepEqual(cuoiThang, homNay);
  // Không đối chiếu rỗng với rỗng: có ít nhất hai người đang giữ tiền (HDV và Bán hàng).
  assert.ok(cuoiThang.length >= 2, `số người trong bảng kiểm: ${cuoiThang.length}`);
});

test("ca 7: khoá hết các tháng đã qua ⇒ keTiep null, bangKiem null, coTheKhoa false", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/ledger/ky", { as: KT });
  assert.equal(r.status, 200, r.text);
  const thangNay = vnHomNay().slice(0, 7);
  // Chưa có dòng sổ nào: tháng kế tiếp là tháng liền trước tháng hiện tại.
  assert.notEqual(r.json.keTiep, thangNay);
  assert.equal(r.json.coTheKhoa, true);
  assert.equal(r.json.bangKiem.thang, r.json.keTiep);
  assert.equal((await khoa(w, r.json.keTiep)).status, 201);
  const sau = await w.call("GET", "/api/ledger/ky", { as: KT });
  assert.equal(sau.json.keTiep, null);
  assert.equal(sau.json.bangKiem, null);
  assert.equal(sau.json.coTheKhoa, false);
});
