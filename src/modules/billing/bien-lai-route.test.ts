// ADR-0196 qua ROUTE THẬT (tests/audit/harness.mjs + kho R2 giả `w.r2BienLai`): Đối tác ghi «Công ty thu, chuyển khoản» phải kèm MỘT ảnh biên lai; ảnh đi CÙNG khoản thu
// trong một yêu cầu — lô D1 (khoản thu, dấu DECLARED, dòng ảnh chưa lưu, nhật ký chỉ mã) TRƯỚC, đặt kho SAU; phần sau lô không ném, không 5xx. Xem ảnh qua Worker,
// nhật ký trước; gỡ chỉ Toàn quyền. Mục «Bài kiểm» của ADR: route ghi, route xem, route gỡ, R2 giả lỗi + hàng chờ, DTO không khoá kho. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";
const demBL1 = (w: W): number => {
  const c = CHECKS.find((x: any) => x.code === "R-BIL-BL1");
  assert.ok(c, "có luật kiểm R-BIL-BL1");
  return demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all());
};
import { TOI_DA_THAN_KHOAN_THU_CO_ANH } from "../../shared/bien-lai.ts";
import { TEP_MOI_GIO } from "../../shared/tep-dinh-kem.ts";

const DT = "71717171-7171-4171-8171-717171717171";
const DT2 = "72727272-7272-4272-8272-727272727272";
const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-11-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `96969696-9696-4696-8696-${String(++seq).padStart(12, "0")}`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const anh = (u: Uint8Array = PNG) => ({ noiDung: b64(u) });

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [DT, "0900000071", "Đối Tác Một", ["PARTNER"]], [DT2, "0900000072", "Đối Tác Hai", ["PARTNER"]], [SALES, "0900000001", "An Bán", ["SALES"]],
    [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000005", "Quản Trị", ["ADMIN"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN `tong` đồng của người lập `owner`, ngày đi hôm nay. */
function don(w: W, owner = DT, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, owner, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id);
  return id;
}
const ck = (soTien: number, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...them });
const thu = (w: W, as: string, orderId: string, body: unknown, headers: Record<string, string> = {}) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body, headers });
const xem = (w: W, as: string, orderId: string, rid: string, headers: Record<string, string> = {}) => w.call("GET", `/api/orders/${orderId}/payments/${rid}/bien-lai`, { as, headers });
const go = (w: W, as: string, orderId: string, rid: string, body: unknown = { lyDo: "Gửi nhầm ảnh khác" }) => w.call("POST", `/api/orders/${orderId}/payments/${rid}/bien-lai/go`, { as, body });
const n = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const soKhoan = (w: W, orderId: string) => n(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", orderId);
const soAnh = (w: W) => n(w, "SELECT count(*) AS n FROM bil_receipt_proof");
const soNhatKy = (w: W, action: string) => n(w, "SELECT count(*) AS n FROM audit_log WHERE action = ?", action);
const khoanCuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const tien = async (w: W, as: string, orderId: string) => (await w.call("GET", `/api/orders/${orderId}/payments`, { as })).json;
const MA = (so: number, ma = "BL0001") => ({ maGiaoDich: ma, soThucChuyen: so });

// ---- Route ghi --------------------------------------------------------------------------------------------------------------------------------------------------
test("Đối tác «Công ty, chuyển khoản» THIẾU ảnh ⇒ 400 bien_lai_required; không khoản thu, không dấu, không nhật ký", async () => {
  const w = setup();
  const id = don(w);
  const r = await thu(w, DT, id, ck(400_000));
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "bien_lai_required");
  assert.equal(soKhoan(w, id), 0);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon"), 0);
  assert.equal(soNhatKy(w, "payment_recorded"), 0);
  assert.equal(soAnh(w), 0);
});

test("Đối tác kèm PNG ⇒ 201; MỘT lô: khoản thu + dấu DECLARED + dòng ảnh bln/<32 hex> đã lưu; kho có đúng byte; nhật ký chỉ mã; DTO chỉ trạng thái", async () => {
  const w = setup();
  const id = don(w);
  const r = await thu(w, DT, id, ck(400_000, { bienLai: anh() }));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.bienLaiChuaTaiXong, undefined);
  const rid = khoanCuoi(w, id);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ? AND kind_code = 'DECLARED'", rid), 1, "vẫn là khoản đang đối chiếu — ảnh không làm tiền đã về");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0, "không dòng giữ hộ");
  const d = w.q("SELECT * FROM bil_receipt_proof")[0];
  assert.equal(d.receipt_id, rid);
  assert.match(d.storage_key, /^bln\/[0-9a-f]{32}$/);
  assert.match(d.content_hash, /^[0-9a-f]{64}$/);
  assert.equal(d.content_kind, "png");
  assert.equal(d.created_by, DT);
  assert.ok(d.stored_at && d.purged_at === null);
  assert.ok(w.r2BienLai.co(d.storage_key));
  for (const k of [w.r2, w.r2HoTro, w.r2VeDienTu]) assert.equal(k.soLan.put, 0, "kho khác KHÔNG nhận ảnh biên lai");
  const lay = await w.env.BIEN_LAI.get(d.storage_key);
  assert.deepEqual(new Uint8Array(await new Response(lay.body).arrayBuffer()), PNG);
  assert.equal(lay.httpMetadata.contentType, "image/png");
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'payment_proof_added'").map((x: any) => x.detail), [`ảnh ${d.id.slice(0, 8)}`]);
  for (const as of [DT, KT, SA]) {
    const t = await w.call("GET", `/api/orders/${id}/payments`, { as });
    assert.equal(t.status, 200, t.text);
    assert.equal(t.json.lanThu.find((l: any) => l.id === rid).bienLai, "CO", as);
    assert.doesNotMatch(t.text, /bln\/[0-9a-f]{32}|[0-9a-f]{64}/, "DTO không khoá kho, không băm");
  }
  const qt = await tien(w, ADM, id);
  assert.equal("bienLai" in qt.lanThu.find((l: any) => l.id === rid), false, "Quản trị không có ô xem ảnh ⇒ không khoá bienLai");
  assert.equal((await tien(w, DT, id)).bienLaiKhiCongTyCk, true);
  assert.equal((await tien(w, KT, id)).bienLaiKhiCongTyCk, false);
});

test("PDF được; sai loại (HTML đổi đuôi) ⇒ 415; quá cỡ ⇒ 413 (thân lớn chặn trước khi đọc; tệp > 10 MB); hai tệp / mảng ⇒ 400 — không khoản thu nào", async () => {
  const w = setup();
  const id = don(w);
  const sai = await thu(w, DT, id, ck(100_000, { bienLai: anh(HTML) }));
  assert.equal(sai.status, 415, sai.text);
  assert.equal(sai.json.error.code, "unsupported_file_type");
  const lon = new Uint8Array(10 * 1024 * 1024 + 1);
  lon.set(PNG);
  const qua = await thu(w, DT, id, ck(100_000, { bienLai: anh(lon) }));
  assert.equal(qua.status, 413, qua.text);
  assert.equal(qua.json.error.code, "file_too_large");
  const than = await thu(w, DT, id, ck(100_000, { bienLai: anh() }), { "content-length": String(TOI_DA_THAN_KHOAN_THU_CO_ANH + 1) });
  assert.equal(than.status, 413, than.text);
  for (const bl of [[anh(), anh()], [anh()], "abc"]) {
    const r = await thu(w, DT, id, ck(100_000, { bienLai: bl }));
    assert.equal(r.status, 400, r.text);
  }
  assert.equal(soKhoan(w, id), 0);
  assert.equal(soAnh(w), 0);
  assert.equal((await thu(w, DT, id, ck(100_000, { bienLai: anh(PDF) }))).status, 201);
  assert.equal(w.q("SELECT content_kind FROM bil_receipt_proof")[0].content_kind, "pdf");
});

test("không đòi ảnh: Đối tác tiền mặt «Công ty», Đối tác «Tôi thu» (cả chuyển khoản); Kế toán, Bán hàng ghi «Công ty – chuyển khoản» — ảnh gửi kèm khoản không cần ⇒ 400", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, DT, id, { soTien: 50_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await thu(w, DT, id, { soTien: 60_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi" })).status, 201);
  const kt = await thu(w, KT, id, ck(70_000, MA(70_000)));
  assert.equal(kt.status, 201, kt.text);
  const idSales = don(w, SALES);
  assert.equal((await thu(w, SALES, idSales, ck(80_000))).status, 201, "Bán hàng không bị đòi ảnh (câu (a))");
  assert.equal(soAnh(w), 0);
  const thua = await thu(w, DT, id, { soTien: 10_000, hinhThuc: "CASH", nguoiThu: "cong_ty", bienLai: anh() });
  assert.equal(thua.status, 400, thua.text);
  const thuaSales = await thu(w, SALES, idSales, ck(10_000, { bienLai: anh() }));
  assert.equal(thuaSales.status, 400, thuaSales.text);
  assert.equal(soAnh(w), 0);
  assert.equal(w.r2BienLai.soLan.put, 0);
});

test(`vượt trần ${TEP_MOI_GIO} ảnh / giờ ⇒ 429, câu nói khoản thu CHƯA được ghi; không khoản thu, không dòng ảnh, không đặt kho`, async () => {
  const w = setup();
  const id = don(w);
  for (let i = 0; i < TEP_MOI_GIO; i++) assert.equal((await thu(w, DT, id, ck(1_000 + i, { bienLai: anh() }))).status, 201);
  const put = w.r2BienLai.soLan.put;
  const truoc = soKhoan(w, id);
  const r = await thu(w, DT, id, ck(9_999, { bienLai: anh() }));
  assert.equal(r.status, 429, r.text);
  assert.match(r.json.error.message, /chưa được ghi/);
  assert.equal(soKhoan(w, id), truoc);
  assert.equal(soAnh(w), TEP_MOI_GIO);
  assert.equal(w.r2BienLai.soLan.put, put);
  // Tài khoản khác không bị trần của tài khoản này.
  const id2 = don(w, DT2);
  assert.equal((await thu(w, DT2, id2, ck(5_000, { bienLai: anh() }))).status, 201);
});

test("trần chạm TRONG lô (lần gửi khác chen vào sau lúc đếm trước): trigger huỷ CẢ lô ⇒ 429, KHÔNG có khoản thu thiếu ảnh", async () => {
  const w = setup();
  const id = don(w);
  for (let i = 0; i < TEP_MOI_GIO - 1; i++) assert.equal((await thu(w, DT, id, ck(1_000 + i, { bienLai: anh() }))).status, 201);
  const truoc = soKhoan(w, id);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO bil_receipt_proof/.test(s.sql)), async () => {
    const rid = uuid();
    const at = new Date().toISOString();
    const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
    w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 1, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?)`)
      .run(rid, id, ct, ct, vnHomNay(), at, DT, at, DT);
    w.sqlite.prepare(`INSERT INTO bil_receipt_proof (id, receipt_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, 'png', 1, ?, ?, ?, ?, ?)`).run(uuid(), rid, `bln/${"c".repeat(32)}`, "d".repeat(64), at, DT, at, DT);
  });
  const r = await thu(w, DT, id, ck(9_999, { bienLai: anh() }));
  assert.equal(r.status, 429, r.text);
  assert.equal(soKhoan(w, id), truoc + 1, "chỉ khoản chen vào — khoản của lô thua không có");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_payment_receipt r WHERE r.amount = 9999"), 0);
});

test("đơn vừa «Khách đã trả đủ» xen giữa ⇒ 409 (không 5xx); không khoản thu, không dòng ảnh mồ côi, không đặt kho", async () => {
  const w = setup();
  const id = don(w);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /INSERT INTO bil_receipt_proof/.test(s.sql)), async () => {
    w.sqlite.prepare("UPDATE orders SET delivered_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  });
  const r = await thu(w, DT, id, ck(300_000, { bienLai: anh() }));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "order_delivered");
  assert.equal(soKhoan(w, id), 0);
  assert.equal(soAnh(w), 0);
  assert.equal(w.r2BienLai.soLan.put, 0);
});

test("kho ảnh chưa bật (thiếu binding) mà khoản cần ảnh ⇒ 503, không khoản thu; khoản không cần ảnh vẫn ghi được", async () => {
  const w = setup();
  const id = don(w);
  w.env.BIEN_LAI = undefined;
  const r = await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  assert.equal(r.status, 503, r.text);
  assert.equal(soKhoan(w, id), 0);
  assert.equal((await thu(w, DT, id, { soTien: 1_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
});

test("R2 giả lỗi khi đặt ⇒ 201, khoản thu VẪN ghi, dòng ảnh «tải dở dang» (Kế toán thấy CHUA_TAI_XONG); R-BIL-BL1 đếm được; chạy lại ⇒ quyết xoá, khoản thành «Chưa có biên lai»", async () => {
  const w = setup();
  const id = don(w);
  w.r2BienLai.hong.put = true;
  const r = await thu(w, DT, id, ck(200_000, { bienLai: anh() }));
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.bienLaiChuaTaiXong, true);
  w.r2BienLai.hong.put = false;
  const rid = khoanCuoi(w, id);
  const d = w.q("SELECT * FROM bil_receipt_proof")[0];
  assert.deepEqual([d.stored_at, d.purged_at], [null, null], "ở lại tải dở dang — KHÔNG quyết xoá ngay (khác khuôn feedback)");
  assert.equal((await tien(w, KT, id)).lanThu.find((l: any) => l.id === rid).bienLai, "CHUA_TAI_XONG");
  assert.equal((await xem(w, KT, id, rid)).status, 404, "chưa lưu thì không mở được");
  // Già hoá dòng (bài gỡ trigger định danh trong CSDL thử — giả lập «đã qua hơn 1 giờ»).
  w.sqlite.exec("DROP TRIGGER bil_receipt_proof_identity");
  const cu = new Date(Date.now() - 2 * 3600_000).toISOString();
  w.sqlite.prepare("UPDATE bil_receipt_proof SET created_at = ? WHERE id = ?").run(cu, d.id);
  assert.equal(demBL1(w), 1);
  const ds = await w.call("GET", "/api/ledger/bien-lai-cho-xoa", { as: SA });
  assert.equal(ds.status, 200, ds.text);
  assert.deepEqual(ds.json.anh.map((x: any) => [x.id, x.orderId, x.trangThai]), [[d.id, id, "TAI_DO_DANG"]]);
  assert.doesNotMatch(ds.text, /bln\//);
  for (const as of [KT, ADM, DT]) assert.equal((await w.call("GET", "/api/ledger/bien-lai-cho-xoa", { as })).status, 403, as);
  const lai = await w.call("POST", "/api/ledger/bien-lai-cho-xoa/chay-lai", { as: SA, body: {} });
  assert.equal(lai.status, 200, lai.text);
  assert.deepEqual(lai.json, { daXoa: 1, conLai: 0 });
  const sau = w.q("SELECT * FROM bil_receipt_proof")[0];
  assert.equal(sau.purge_reason, "TAI_LEN_DO_DANG");
  assert.ok(sau.purged_at && sau.r2_deleted_at && sau.content_hash === null);
  assert.equal(demBL1(w), 0, "chạy lại thì xong");
  assert.equal((await tien(w, KT, id)).lanThu.find((l: any) => l.id === rid).bienLai, "CHUA_CO");
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", rid), 1, "khoản thu và dấu đối chiếu không đổi");
});

test("nhật ký không chứa khoá kho / băm của ảnh biên lai (cả đường xem, gỡ, hỏng)", async () => {
  const w = setup();
  const id = don(w);
  await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  const rid = khoanCuoi(w, id);
  assert.equal((await xem(w, KT, id, rid)).status, 200);
  assert.equal((await go(w, SA, id, rid)).status, 200);
  w.r2BienLai.hong.put = true;
  await thu(w, DT, id, ck(110_000, { bienLai: anh(PDF) }));
  const ds = doNhatKyHang(w.sqlite, ["bil_receipt_proof.content_hash", "bil_receipt_proof.storage_key"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
});

// ---- Route xem --------------------------------------------------------------------------------------------------------------------------------------------------
test("xem: Bán hàng 403, Quản trị 403, Đối tác khác 403; Đối tác chính chủ 200, Kế toán 200, Toàn quyền 200; header no-store, nosniff, CSP sandbox; ảnh khoản đơn khác ⇒ 404", async () => {
  const w = setup();
  const id = don(w);
  await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  const rid = khoanCuoi(w, id);
  for (const as of [SALES, ADM, DT2]) assert.equal((await xem(w, as, id, rid)).status, 403, as);
  for (const as of [DT, KT, SA]) {
    const r = await xem(w, as, id, rid);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.match(r.headers.get("content-security-policy") ?? "", /sandbox/);
  }
  const khac = don(w);
  assert.equal((await xem(w, DT, khac, rid)).status, 404, "khoản thu không thuộc đơn trên đường dẫn");
  assert.equal((await xem(w, KT, khac, rid)).status, 404);
  assert.equal((await xem(w, KT, id, uuid())).status, 404);
  assert.equal((await xem(w, KT, id, rid, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal(soNhatKy(w, "payment_proof_viewed"), 3, "mỗi lần mở một dòng; lần bị từ chối không ghi");
});

test("xem: nhật ký có TRƯỚC khi đọc kho; kho thiếu đối tượng ⇒ 404 (không lộ gì)", async () => {
  const w = setup();
  const id = don(w);
  await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  const rid = khoanCuoi(w, id);
  let luc = -1;
  w.r2BienLai.khiGet = () => (luc = soNhatKy(w, "payment_proof_viewed"));
  assert.equal((await xem(w, KT, id, rid)).status, 200);
  assert.equal(luc, 1, "dòng nhật ký đã ghi khi route đọc kho");
  w.r2BienLai.khiGet = null;
  await w.env.BIEN_LAI.delete(w.q("SELECT storage_key FROM bil_receipt_proof")[0].storage_key);
  assert.equal((await xem(w, KT, id, rid)).status, 404);
});

// ---- Route gỡ ---------------------------------------------------------------------------------------------------------------------------------------------------
test("gỡ: chỉ Toàn quyền (Kế toán, Quản trị, Đối tác 403); thiếu lý do 400; gỡ ⇒ GO_TEP + xoá kho, khoản thu và dấu không đổi, DTO «DA_GO», xem 404; gỡ lần hai 409", async () => {
  const w = setup();
  const id = don(w);
  await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  const rid = khoanCuoi(w, id);
  for (const as of [KT, ADM, DT]) assert.equal((await go(w, as, id, rid)).status, 403, as);
  assert.equal((await go(w, SA, id, rid, {})).status, 400);
  assert.equal((await go(w, SA, id, rid, { lyDo: "  " })).status, 400);
  const key = w.q("SELECT storage_key FROM bil_receipt_proof")[0].storage_key;
  const r = await go(w, SA, id, rid);
  assert.equal(r.status, 200, r.text);
  const d = w.q("SELECT * FROM bil_receipt_proof")[0];
  assert.equal(d.purge_reason, "GO_TEP");
  assert.equal(d.updated_by, SA);
  assert.ok(d.purged_at && d.r2_deleted_at && d.content_hash === null);
  assert.equal(w.r2BienLai.co(key), false);
  assert.equal(soKhoan(w, id), 1);
  assert.equal(n(w, "SELECT count(*) AS n FROM bil_receipt_recon WHERE receipt_id = ?", rid), 1);
  assert.equal((await tien(w, KT, id)).lanThu.find((l: any) => l.id === rid).bienLai, "DA_GO");
  assert.equal((await xem(w, KT, id, rid)).status, 404);
  assert.equal(soNhatKy(w, "payment_proof_purged"), 1);
  const lan2 = await go(w, SA, id, rid);
  assert.equal(lan2.status, 409, lan2.text);
  assert.equal(soNhatKy(w, "payment_proof_purged"), 1);
});

test("gỡ khi kho hỏng xoá ⇒ 200, dòng ở lại «chờ xoá» (R-BIL-BL1 đếm), chạy lại ⇒ xoá xong", async () => {
  const w = setup();
  const id = don(w);
  await thu(w, DT, id, ck(100_000, { bienLai: anh() }));
  const rid = khoanCuoi(w, id);
  w.r2BienLai.hong.delete = true;
  assert.equal((await go(w, SA, id, rid)).status, 200);
  w.r2BienLai.hong.delete = false;
  const d = w.q("SELECT * FROM bil_receipt_proof")[0];
  assert.ok(d.purged_at && d.r2_deleted_at === null);
  assert.equal(demBL1(w), 1);
  const ds = await w.call("GET", "/api/ledger/bien-lai-cho-xoa", { as: SA });
  assert.deepEqual(ds.json.anh.map((x: any) => x.trangThai), ["CHO_XOA"]);
  assert.deepEqual((await w.call("POST", "/api/ledger/bien-lai-cho-xoa/chay-lai", { as: SA, body: {} })).json, { daXoa: 1, conLai: 0 });
  assert.equal(demBL1(w), 0);
});
