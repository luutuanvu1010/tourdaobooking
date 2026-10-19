// ADR-0115 đợt 1 — điều chỉnh công nợ CẦN NGƯỜI THỨ HAI DUYỆT, qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch).
// Tiêu chí nghiệm thu 1–7 của phụ lục (docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-hc-4-2.md mục 3); tiêu chí 2 (phần CSDL) ở
// src/migrations-dieu-chinh-duyet.test.ts, tiêu chí 8–9 ở các bài đã sửa và src/audit-invariants.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";
import { duyetChenStatement } from "./dieu-chinh-repo.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444"; // người tạo
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const KT2 = "77777777-7777-4777-8777-777777777777"; // người duyệt
const TT = "88888888-8888-4888-8888-888888888888"; // Thực tập
const TX = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // Tài xế công ty
const AT = "2026-09-01T00:00:00.000Z";
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [QT, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]],
    [KT2, "0900000008", "Mai Kế Toán", ["ACCOUNTING"]], [TT, "0900000009", "Thực Tập", ["INTERN"]], [TX, "0900000010", "Tài Xế", ["DRIVER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN `tong` đồng (ngày đi sau 10 ngày), người phụ trách = HDV. */
function don(w: W, tong = 500_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnNgay(10));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const congTy = (w: W) => String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
const hdv = `pty-${HDV}`;
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu } });
const tao = (w: W, body: Record<string, unknown>, as = KT) => w.call("POST", "/api/ledger/adjustments", { as, body: { loai: "dieu_chinh", loaiDong: "HELD", lyDo: "HDV nhận thêm tiền khách gửi", ...body } });
const duyet = (w: W, id: string, as = KT2) => w.call("POST", `/api/ledger/adjustment-requests/${id}/approve`, { as });
const tuChoi = (w: W, id: string, body: unknown, as = KT2) => w.call("POST", `/api/ledger/adjustment-requests/${id}/reject`, { as, body });
const rut = (w: W, id: string, as = KT) => w.call("POST", `/api/ledger/adjustment-requests/${id}/withdraw`, { as });
const ds = (w: W, as: string) => w.call("GET", "/api/ledger/adjustment-requests", { as });
const soDu = (w: W, orderId: string, ben: string, chu: string) => Number(w.q(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ?2 AND creditor_party_id = ?3 THEN amount
  WHEN debtor_party_id = ?3 AND creditor_party_id = ?2 THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = ?1`, orderId, ben, chu)[0].n);
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const soPhieuDieuChinh = (w: W, orderId: string) => dem(w, "SELECT count(*) AS n FROM bil_posting WHERE kind_code = 'ADJUSTMENT' AND order_id = ?", orderId);

test("TC1: Kế toán gửi điều chỉnh ⇒ 201 «chờ duyệt», số dư, biên nhận và sổ KHÔNG đổi; có đúng một dòng yêu cầu và nhật ký «gửi yêu cầu»", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201);
  const truoc = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json;
  const dongTruoc = dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id);
  const r = await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 100_000 });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.choDuyet, true);
  assert.match(r.json.yeuCauId, /^[0-9a-f-]{36}$/);
  assert.equal(r.headers.get("location"), "/dieu-chinh-cong-no");
  const sau = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json;
  assert.deepEqual([sau.daThu, sau.conLai, sau.du], [truoc.daThu, truoc.conLai, truoc.du], "đã thu / còn lại / dư không đổi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), dongTruoc, "không dòng nợ mới");
  assert.equal(soPhieuDieuChinh(w, id), 0, "không phiếu ADJUSTMENT");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ? AND kind_code = 'REQUEST'", id), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_adjustment_requested' AND staff_id = ?", id, KT), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'ledger_adjustment'", id), 0, "chưa có dòng «số dư đổi»");
});

test("TC2: người tạo tự duyệt / tự từ chối ⇒ 409 (máy chủ); chèn thẳng SQL cũng bị trigger chặn; không để lại dòng quyết định hay phiếu", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201);
  const y = (await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 100_000 })).json.yeuCauId;
  const a = await duyet(w, y, KT);
  assert.equal(a.status, 409, a.text);
  assert.equal(a.json.error.code, "adjreq_same_person");
  const b = await tuChoi(w, y, { lyDo: "tự từ chối thử" }, KT);
  assert.equal(b.status, 409, b.text);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ? AND kind_code <> 'REQUEST'", id), 0);
  assert.equal(soPhieuDieuChinh(w, id), 0);
  // Cổng CSDL: chèn thẳng phiếu ADJUSTMENT thiếu yêu cầu đã duyệt / có yêu cầu do chính người ghi tạo.
  const chenPhieu = (requestId: string | null, by: string) => w.sqlite.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, request_id, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'ADJUSTMENT', ?, 'điều chỉnh gõ tay ngoài hệ thống', ?, ?, ?, ?, ?, ?)`).run(uuid(), id, vnNgay(0), requestId, AT, by, AT, by);
  assert.throws(() => chenPhieu(null, KT), /adjustment_needs_approval:/);
  assert.throws(() => chenPhieu(y, KT), /adjustment_needs_approval:/, "yêu cầu chưa duyệt");
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'APPROVE', ?, 'INCREASE', NULL, ?, 500000, ?, ?, ?, ?)`).run(uuid(), id, y, AT, KT, AT, KT), /adjreq_same_person:/);
});

test("TC3: người khác có ô duyệt bấm duyệt ⇒ số dư đổi đúng bằng yêu cầu; nhật ký có người tạo, người duyệt, số trước / sau; yêu cầu đã duyệt không duyệt lần hai", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 200_000);
  const y = (await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 150_000, lyDo: "bù trừ phần HDV đã chi hộ khách" })).json.yeuCauId;
  assert.equal(soDu(w, id, hdv, ct), 200_000, "chờ duyệt: chưa đổi");
  const r = await duyet(w, y);
  assert.equal(r.status, 201, r.text);
  assert.equal(soDu(w, id, hdv, ct), 50_000, "200.000 − 150.000");
  const p = w.q("SELECT id, created_by, request_id, occurred_date, reason FROM bil_posting WHERE kind_code = 'ADJUSTMENT' AND order_id = ?", id);
  assert.equal(p.length, 1);
  assert.equal(p[0].created_by, KT2, "phiếu do người DUYỆT ghi");
  assert.equal(p[0].request_id, y);
  const q = w.q("SELECT kind_code, created_by FROM bil_adjustment_request WHERE order_id = ? ORDER BY rowid", id).map((x: { kind_code: string; created_by: string }) => [x.kind_code, x.created_by]);
  assert.deepEqual(q, [["REQUEST", KT], ["APPROVE", KT2]]);
  const nk = w.q("SELECT action, staff_id, detail FROM audit_log WHERE order_id = ? AND action LIKE 'ledger_adjustment%' ORDER BY created_at, rowid", id) as { action: string; staff_id: string; detail: string | null }[];
  assert.deepEqual(nk.map((x) => [x.action, x.staff_id]), [["ledger_adjustment_requested", KT], ["ledger_adjustment_approved", KT2], ["ledger_adjustment", KT2], ["ledger_adjustment_affected", KT2]]);
  assert.match(nk[2]!.detail!, /trước 200\.000 ₫ → sau 50\.000 ₫/);
  // Quyết định lần hai trên cùng yêu cầu ⇒ 409; sổ không đổi.
  const lai = await duyet(w, y, SA);
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "adjreq_decided");
  assert.equal((await rut(w, y)).status, 409);
  assert.equal(soDu(w, id, hdv, ct), 50_000);
  // Bên bị đổi số dư (HDV có tài khoản) có dòng nguồn tin; khoá người nhận = tài khoản HDV.
  const aff = w.q("SELECT target_type, target_id FROM audit_log WHERE action = 'ledger_adjustment_affected' AND order_id = ?", id);
  assert.deepEqual([aff[0].target_type, aff[0].target_id], ["staff", HDV]);
});

test("TC4 (C-2): đơn phải thu 500.000, đã thu 300.000 — yêu cầu tăng nợ 500.000 thứ nhất được tạo; yêu cầu thứ hai bị từ chối NGAY khi tạo (cộng cả yêu cầu chờ); sau duyệt thứ nhất số dư 500.000 và không vượt được", async () => {
  const w = setup();
  const id = don(w, 500_000);
  const ct = congTy(w);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201);
  const tang = (soTien: number) => tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien });
  const a = await tang(500_000);
  assert.equal(a.status, 201, a.text);
  const b = await tang(500_000);
  assert.equal(b.status, 409, b.text);
  assert.equal(b.json.error.code, "adjustment_exceeds_cap");
  assert.equal((await tang(1)).status, 409, "một đồng cũng vượt khi yêu cầu đầu còn chờ");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ? AND kind_code = 'REQUEST'", id), 1);
  assert.equal((await duyet(w, a.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 500_000);
  const c = await tang(1);
  assert.equal(c.status, 409, "đã duyệt (còn hiệu lực) thì yêu cầu mới cũng bị cộng dồn");
  assert.equal(c.json.error.code, "adjustment_exceeds_cap");
  // Chia nhỏ đúng bằng trần thì qua: hai yêu cầu 300.000 + 200.000 trên đơn khác.
  const id2 = don(w, 500_000);
  const t2 = (soTien: number) => tao(w, { orderId: id2, benNo: hdv, benDuocNo: ct, soTien });
  const x = await t2(300_000);
  assert.equal(x.status, 201);
  assert.equal((await t2(200_001)).status, 409);
  assert.equal((await t2(200_000)).status, 201, "300.000 + 200.000 = đúng trần");
});

test("TC4b: rút yêu cầu chờ trả lại hạn mức cộng dồn; yêu cầu bị từ chối cũng không còn tính", async () => {
  const w = setup();
  const id = don(w, 500_000);
  const ct = congTy(w);
  const a = (await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 500_000 })).json.yeuCauId;
  assert.equal((await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 100_000 })).status, 409);
  assert.equal((await rut(w, a)).status, 201);
  const b = await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 500_000 });
  assert.equal(b.status, 201, "đã rút ⇒ hết chiếm hạn mức");
  assert.equal((await tuChoi(w, b.json.yeuCauId, { lyDo: "số tiền chưa đúng với biên nhận" })).status, 201);
  assert.equal((await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 500_000 })).status, 201, "đã từ chối ⇒ hết chiếm hạn mức");
});

test("TC5: hai yêu cầu giảm 300.000 cùng trên khoản nợ 300.000 — duyệt cái đầu → 0; duyệt cái hai ⇒ 409 «không đổi dấu»; yêu cầu hai còn nguyên (chờ), sổ không đổi", async () => {
  const w = setup();
  const id = don(w, 1_000_000);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 300_000, "toi")).status, 201);
  const giam = () => tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 300_000, lyDo: "bù trừ phần HDV đã chi hộ khách" });
  const a = await giam();
  const b = await giam();
  assert.equal(a.status, 201, a.text);
  assert.equal(b.status, 201, "lúc tạo từng yêu cầu đều ≤ số đang nợ");
  assert.equal((await duyet(w, a.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 0);
  const r = await duyet(w, b.json.yeuCauId, SA);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "adjustment_flips_sign");
  assert.equal(soDu(w, id, hdv, ct), 0);
  assert.equal(soPhieuDieuChinh(w, id), 1);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE target_id = ?", b.json.yeuCauId), 0, "yêu cầu hai chưa có quyết định");
});

// Bài ghim dòng so hướng lúc duyệt với hướng lúc tạo (`k.kiem.huong !== y.direction` ở dieu-chinh.ts): loại SETTLEMENT với công ty đã bị nhánh «quyết toán» chặn trước, nên chỉ HELD / REFUND
// mới chạm đúng dòng đó. Bỏ dòng ấy ⇒ yêu cầu giảm thứ hai bị đọc thành TĂNG nợ, trượt qua trần và số dư thành −300.000.
for (const loaiDong of ["HELD", "REFUND"] as const) {
  test(`TC5 (${loaiDong}): hai yêu cầu giảm 300.000 cùng trên khoản nợ 300.000 — duyệt cái hai sau khi số dư về 0 ⇒ 409 «không đổi dấu», số dư vẫn 0`, async () => {
    const w = setup();
    const id = don(w, 1_000_000);
    const ct = congTy(w);
    assert.equal((await thu(w, HDV, id, 300_000, "toi")).status, 201);
    const giam = () => tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong, soTien: 300_000, lyDo: "bù trừ phần HDV đã chi hộ khách" });
    const a = await giam();
    const b = await giam();
    assert.equal(a.status, 201, a.text);
    assert.equal(b.status, 201, b.text);
    assert.equal((await duyet(w, a.json.yeuCauId)).status, 201);
    assert.equal(soDu(w, id, hdv, ct), 0);
    const r = await duyet(w, b.json.yeuCauId, SA);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "adjustment_flips_sign");
    assert.equal(soDu(w, id, hdv, ct), 0, "số dư không được âm");
    assert.equal(soPhieuDieuChinh(w, id), 1);
  });
}

test("TC6: duyệt sau 7 ngày ⇒ 409 hết hạn, số dư không đổi, danh sách ghi «hết hạn»; tháng của ngày phát sinh đã khoá lúc duyệt ⇒ 409 (tạo lại)", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  // Yêu cầu «cũ»: dòng REQUEST tạo cách đây 8 ngày (chèn thẳng, đúng khuôn route).
  const cu = uuid();
  const tam = new Date(Date.now() - 8 * 86400_000).toISOString();
  w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id, cap_snapshot,
    created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, 100000, 'SETTLEMENT', ?, 'DECREASE', 'bù trừ phần HDV đã chi hộ', NULL, NULL, ?, ?, ?, ?)`).run(cu, id, ct, hdv, vnNgay(-8), tam, KT, tam, KT);
  const r = await duyet(w, cu);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "adjreq_expired");
  assert.equal(soDu(w, id, hdv, ct), 200_000);
  const l = await ds(w, KT);
  assert.equal(l.json.yeuCau.find((x: { id: string }) => x.id === cu).trangThai, "het_han");
  assert.equal(l.json.yeuCau.find((x: { id: string }) => x.id === cu).coTheDuyet, false);
  assert.equal((await tuChoi(w, cu, { lyDo: "quá hạn rồi" })).status, 409);
  assert.equal((await rut(w, cu)).status, 409);
  // Tháng đã khoá giữa lúc tạo và lúc duyệt.
  const ngay = vnNgay(-45);
  const thang = ngay.slice(0, 7);
  const y = await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách", ngayPhatSinh: ngay });
  assert.equal(y.status, 201, y.text);
  w.sqlite.prepare(`INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'kt', NULL, ?, 'kt', ?, 'kt')`).run(thang, AT, AT, AT);
  const k = await duyet(w, y.json.yeuCauId);
  assert.equal(k.status, 409, k.text);
  assert.equal(k.json.error.code, "period_closed");
  assert.equal(soDu(w, id, hdv, ct), 200_000);
  assert.equal(soPhieuDieuChinh(w, id), 0);
  // Ngày phát sinh thuộc tháng đã khoá ngay lúc TẠO cũng bị chặn.
  assert.equal((await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, ngayPhatSinh: ngay })).status, 409);
});

test("TC7: Bán hàng, Thực tập, Đối tác, HDV, tài xế ⇒ 403 ở mọi route mới; Quản trị có ô duyệt nhưng KHÔNG tạo được và chỉ thấy yêu cầu CHỜ DUYỆT; GET /api/ledger vẫn 403 với Quản trị", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  const y = (await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" })).json.yeuCauId;
  for (const kẻ of [SALES, TT, DT, HDV, TX]) {
    assert.equal((await ds(w, kẻ)).status, 403, `GET ${kẻ}`);
    assert.equal((await duyet(w, y, kẻ)).status, 403, `duyệt ${kẻ}`);
    assert.equal((await tuChoi(w, y, { lyDo: "không có quyền" }, kẻ)).status, 403, `từ chối ${kẻ}`);
    assert.equal((await rut(w, y, kẻ)).status, 403, `rút ${kẻ}`);
    assert.equal((await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 1 }, kẻ)).status, 403, `tạo ${kẻ}`);
  }
  assert.equal((await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 1 }, QT)).status, 403, "Quản trị không tạo được (ledger.write = none)");
  assert.equal((await rut(w, y, QT)).status, 403, "Quản trị không rút");
  assert.equal(soDu(w, id, hdv, ct), 200_000);
  // Quản trị: thấy yêu cầu chờ, không thấy cả sổ.
  const q = await ds(w, QT);
  assert.equal(q.status, 200, q.text);
  assert.equal(q.json.xemDayDu, false);
  assert.equal(q.json.coTheTao, false);
  assert.equal(q.json.choDuyetChoToi, 1);
  assert.equal(q.json.yeuCau.length, 1);
  assert.equal(q.json.yeuCau[0].coTheDuyet, true);
  assert.equal(q.json.yeuCau[0].coTheRut, false);
  assert.equal((await w.call("GET", "/api/ledger", { as: QT })).status, 403, "ledger.view của Quản trị không đổi");
  // Quản trị duyệt được (ô duyệt): số dư đổi.
  assert.equal((await duyet(w, y, QT)).status, 201);
  assert.equal(soDu(w, id, hdv, ct), 100_000);
  // Sau khi duyệt, Quản trị không còn thấy yêu cầu đó (đã quyết); Kế toán thấy đủ.
  assert.equal((await ds(w, QT)).json.yeuCau.length, 0);
  const kt = await ds(w, KT);
  assert.equal(kt.json.xemDayDu, true);
  assert.equal(kt.json.yeuCau[0].trangThai, "da_duyet");
  assert.equal(kt.json.choDuyetChoToi, 0);
});

test("từ chối phải có lý do; người từ chối ≠ người tạo; sau từ chối số dư không đổi; chỉ người tạo rút và chỉ khi chưa ai quyết", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 200_000, "toi")).status, 201);
  const y = (await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" })).json.yeuCauId;
  assert.equal((await tuChoi(w, y, {})).status, 400, "thiếu lý do");
  assert.equal((await tuChoi(w, y, { lyDo: "   " })).status, 400);
  assert.equal((await tuChoi(w, y, { lyDo: "gọi 0912345678 hỏi lại" })).status, 400, "lý do không chứa dãy số dài");
  assert.equal((await rut(w, y, KT2)).status, 403, "người khác không rút được");
  const r = await tuChoi(w, y, { lyDo: "số tiền chưa khớp biên nhận" });
  assert.equal(r.status, 201, r.text);
  assert.equal(soDu(w, id, hdv, ct), 200_000);
  assert.equal(soPhieuDieuChinh(w, id), 0);
  assert.equal((await duyet(w, y)).json.error.code, "adjreq_decided");
  assert.equal((await rut(w, y)).status, 409);
  const l = (await ds(w, KT)).json.yeuCau[0];
  assert.equal(l.trangThai, "tu_choi");
  assert.equal(l.lyDoQuyet, "số tiền chưa khớp biên nhận");
  assert.equal(l.nguoiQuyet, "Mai Kế Toán");
  // Yêu cầu khác: người tạo rút được khi chưa ai quyết.
  const y2 = (await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" })).json.yeuCauId;
  assert.equal((await rut(w, y2)).status, 201);
  assert.equal((await duyet(w, y2)).json.error.code, "adjreq_decided");
  assert.equal((await ds(w, KT)).json.yeuCau.find((x: { id: string }) => x.id === y2).trangThai, "da_rut");
  // Mã lạ.
  assert.equal((await duyet(w, "khong-phai-uuid")).status, 404);
  assert.equal((await duyet(w, uuid())).status, 404);
});

test("lệnh đảo (dao_lan_thu / dao_dong) KHÔNG qua duyệt — vẫn ghi ngay như trước (ADR-0115 điều 3, dựa vào kỷ luật)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, 300_000, "cong_ty")).status, 201);
  const rc = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", id)[0].id);
  const r = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "ghi nhầm người thu" } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.choDuyet, undefined);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request"), 0);
});

test("lính gác CSDL của lô duyệt: trần tăng nợ cộng dồn và «không đổi dấu» kiểm LẠI ở chính câu ghi — lệnh duyệt sau thấy dòng của lệnh trước, 0 dòng được chèn", async () => {
  const w = setup();
  const id = don(w, 500_000);
  const ct = congTy(w);
  const y = (await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 300_000 })).json.yeuCauId;
  // Mô phỏng «lệnh duyệt khác vừa ghi 400.000 tăng nợ còn hiệu lực» NGAY SAU lúc route đọc: chèn thẳng một bộ ba hợp lệ + dòng nợ.
  const kho = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ sql, args }) }) };
  const chay = (soTienToiDa: number) => {
    const s = duyetChenStatement(kho as never, { id: uuid(), orderId: id, direction: "INCREASE", requestId: y, capSnapshot: 500_000, at: AT, by: KT2, tangDaCoToiDa: soTienToiDa, soTien: 300_000, benDuocNo: ct, benNo: hdv }) as unknown as { sql: string; args: unknown[] };
    return Number(w.sqlite.prepare(s.sql).run(...(s.args as never[])).changes);
  };
  const xep = (sql: string, ...a: unknown[]) => w.sqlite.prepare(sql).run(...(a as never[]));
  // Một điều chỉnh tăng nợ 400.000 đã duyệt và còn hiệu lực của ĐƠN (bộ ba REQUEST + APPROVE + phiếu + dòng nợ).
  const yc = uuid();
  xep(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id, cap_snapshot,
    created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, 400000, 'HELD', ?, 'INCREASE', 'đã duyệt từ trước đó', NULL, NULL, ?, ?, ?, ?)`, yc, id, hdv, ct, vnNgay(0), AT, KT, AT, KT);
  xep(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'APPROVE', ?, 'INCREASE', NULL, ?, 500000, ?, ?, ?, ?)`, uuid(), id, yc, AT, KT2, AT, KT2);
  const ph = uuid();
  xep(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, request_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'ADJUSTMENT', ?, 'đã duyệt từ trước đó', ?, ?, ?, ?, ?, ?)`, ph, id, vnNgay(0), yc, AT, KT2, AT, KT2);
  xep(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, created_at, updated_at) VALUES (?, ?, ?, ?, 400000, 'HELD', ?, ?, ?)`, uuid(), ph, hdv, ct, id, AT, AT);
  assert.equal(chay(200_000), 0, "đã có 400.000 > 200.000 cho phép ⇒ lính gác chặn (0 dòng)");
  assert.equal(chay(400_000), 1, "đúng bằng mức cho phép ⇒ chèn");
  // Giảm nợ: số bên được nợ còn nợ < số tiền ⇒ 0 dòng.
  const g = duyetChenStatement(kho as never, { id: uuid(), orderId: id, direction: "DECREASE", requestId: y, capSnapshot: null, at: AT, by: KT2, tangDaCoToiDa: 0, soTien: 400_001, benDuocNo: hdv, benNo: ct }) as unknown as { sql: string; args: unknown[] };
  assert.equal(Number(w.sqlite.prepare(g.sql).run(...(g.args as never[])).changes), 0, "HDV nợ 400.000 < 400.001");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// M-1 (người kiểm độc lập 13/10): yêu cầu loại «Quyết toán» làm số dư đổi dấu — trigger 0080 `settlement_sign_flip` chặn dòng nợ. Phải bị từ chối bằng chữ tiếng Việt ngay LÚC TẠO
// (không để lọt 201 rồi nổ 500 lúc duyệt), và nếu vẫn lọt tới lô duyệt (sổ đổi giữa chừng) thì trả 409, không 500.
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("L-3: yêu cầu chờ duyệt CŨ vẫn hiện dù sau nó đã có hơn 200 yêu cầu khác được rút (lọc chờ duyệt ở SQL, không lọc sau khi cắt 200)", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  const cu = (await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 1_000, lyDo: "yêu cầu chờ duyệt cũ nhất" })).json.yeuCauId;
  const ins = w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason, target_id,
    cap_snapshot, created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, 1000, 'HELD', ?, 'INCREASE', 'đã rút ngay lập tức', NULL, NULL, ?, ?, ?, ?)`);
  const rut = w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, direction, reason, target_id, cap_snapshot, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'WITHDRAW', ?, NULL, NULL, ?, NULL, ?, ?, ?, ?)`);
  const nay = new Date().toISOString();
  for (let i = 0; i < 205; i++) {
    ins.run(`yc-ru-${i}`, id, hdv, ct, vnNgay(0), nay, KT, nay, KT);
    rut.run(`rut-${i}`, id, `yc-ru-${i}`, nay, KT, nay, KT);
  }
  const q = await ds(w, QT); // Quản trị chỉ thấy yêu cầu chờ duyệt
  assert.equal(q.status, 200, q.text);
  assert.deepEqual(q.json.yeuCau.map((x: { id: string }) => x.id), [cu]);
  assert.equal(q.json.choDuyetChoToi, 1);
  const kt = await ds(w, KT2); // Kế toán thấy cả sổ nhưng yêu cầu chờ duyệt cũ không được rơi khỏi danh sách
  assert.ok(kt.json.yeuCau.some((x: { id: string; trangThai: string }) => x.id === cu && x.trangThai === "cho_duyet"));
  assert.equal(kt.json.choDuyetChoToi, 1);
});

test("M-1: SETTLEMENT với công ty làm số dư đổi dấu ⇒ 409 NGAY lúc tạo (chữ tiếng Việt), không còn yêu cầu mồ côi", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  // Không có nợ ngược chiều: công ty «nộp» cho HDV 100.000 sẽ làm công ty thành bên nợ ⇒ đổi dấu.
  const r = await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "adjustment_flips_sign");
  assert.match(r.json.error.message, /đổi dấu/);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ?", id), 0);
  assert.doesNotMatch(r.json.error.message, /0 ₫/, "chưa có nợ thì không nói «vượt số đang nợ (0 ₫)»");
  // Cặp ngược (HDV nợ công ty thêm) khi chưa có nợ: cũng bị chặn ngay lúc tạo.
  const nguoc = await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" });
  assert.equal(nguoc.status, 409, nguoc.text);
  assert.equal(nguoc.json.error.code, "adjustment_flips_sign");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ?", id), 0);
  // HDV giữ hộ 60.000: giảm 60.001 vượt ⇒ 409; giảm 60.000 ⇒ 201.
  assert.equal((await thu(w, HDV, id, 60_000, "toi")).status, 201);
  assert.equal((await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 60_001 })).status, 409);
  assert.equal((await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 60_000 })).status, 201);
});

test("M-1: lô duyệt gặp trigger settlement_sign_flip (sổ đổi sát lúc ghi) ⇒ 409 tiếng Việt, không 500", async () => {
  const w = setup();
  const id = don(w);
  const ct = congTy(w);
  assert.equal((await thu(w, HDV, id, 100_000, "toi")).status, 201);
  const y = (await tao(w, { orderId: id, benNo: ct, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" })).json.yeuCauId;
  const db = w.env.DB as { batch: (s: unknown[]) => Promise<unknown> };
  const goc = db.batch.bind(db);
  db.batch = async () => { throw new Error("D1_ERROR: settlement_sign_flip: nộp / trả vượt số đang nợ — số dư không được đổi dấu"); };
  try {
    const r = await duyet(w, y);
    assert.equal(r.status, 409, r.text);
    assert.notEqual(r.json.error.code, "internal");
    assert.match(r.json.error.message, /[À-ỹ]/);
  } finally {
    db.batch = goc;
  }
  assert.equal((await duyet(w, y)).status, 201, "gỡ lỗi giả ⇒ duyệt bình thường");
});

test("M-1 quét 36 tổ hợp (2 tình huống số dư × 3 loại dòng × 6 cặp bên): không bao giờ 5xx ở lúc tạo hay lúc duyệt; sổ chỉ đổi khi cả hai bước 201", async () => {
  const bens = ["ct", "hdv", "ban"] as const;
  const cap: [string, string][] = bens.flatMap((a) => bens.filter((b) => b !== a).map((b): [string, string] => [a, b]));
  assert.equal(cap.length, 6);
  let tong = 0;
  for (const giuHo of [0, 200_000]) {
    for (const loaiDong of ["HELD", "SETTLEMENT", "REFUND"] as const) {
      for (const [a, b] of cap) {
        const w = setup();
        const id = don(w);
        const ct = congTy(w);
        const ben = { ct, hdv, ban: `pty-${SALES}` };
        if (giuHo > 0) assert.equal((await thu(w, HDV, id, giuHo, "toi")).status, 201);
        const dongTruoc = dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id);
        const nhan = `giữ hộ ${giuHo} · ${loaiDong} · ${a}→${b}`;
        const r = await tao(w, { orderId: id, benNo: ben[a as keyof typeof ben], benDuocNo: ben[b as keyof typeof ben], loaiDong, soTien: 100_000, lyDo: "quét tổ hợp điều chỉnh công nợ" });
        assert.ok(r.status === 201 || (r.status >= 400 && r.status < 500), `${nhan}: tạo ra ${r.status} ${r.text}`);
        if (r.status === 201) {
          const d = await duyet(w, r.json.yeuCauId);
          assert.ok(d.status === 201 || (d.status >= 400 && d.status < 500), `${nhan}: duyệt ra ${d.status} ${d.text}`);
          assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), dongTruoc + (d.status === 201 ? 1 : 0), nhan);
        } else {
          assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), dongTruoc, nhan);
        }
        tong++;
      }
    }
  }
  assert.equal(tong, 36);
});

// =====================================================================================================================================================
// Sổ đại lý đợt 2, Task 6 — điều chỉnh có duyệt nhận BA loại dòng mới (đặc tả P6 a; trang-ghep §5; ADR-0079 điều 7a — M1 = A; ADR-0115; ADR-0092 Đ5a).
// Đơn ĐÃ «Đã giao» (nhóm a): Kế toán bổ sung giá vốn / sửa hoa hồng bằng YÊU CẦU ĐIỀU CHỈNH, người thứ hai duyệt. Luật «không đổi dấu» (Đ5a) và trigger giữ nguyên.
// =====================================================================================================================================================
const NCC = "pty-ncc-i-resort";
const DAI_LY = "pty-dai-ly-d3";
/** Hồ sơ nhà cung cấp (vai SUPPLIER) và đại lý (vai TRAVEL_AGENCY) — hồ sơ thật vì khoá ngoại bật. */
function hoSoThuongMai(w: W): void {
  for (const [id, ten, vai] of [[NCC, "i-resort", "SUPPLIER"], [DAI_LY, "Đại lý D", "TRAVEL_AGENCY"]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`r-${id}`, id, vai, AT, AT);
  }
}
/**
 * Đơn ĐÃ «Đã giao» 1.000.000 (ngày đi hôm nay): `booker` null = khách lẻ (bản chụp gieo như đơn b1 — người bán Tour Đảo, hoa hồng NONE: đúng ca b1x «nay nhà cung cấp
 * bán»); `booker` = đại lý ⇒ xác nhận qua ROUTE (máy chụp mức 10% có sẵn). `lanThu` = các lần Kế toán ghi trước «Đã giao» ([số tiền, người thu]).
 */
async function donDaGiao(w: W, lanThu: [number, unknown][], booker: string | null = null, giao = true): Promise<string> {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, booker, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'IRESORT', 'Vé i-resort', 'perPax', 1, ?)").run(`${id}-s`, id, vnNgay(0));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total)
    VALUES (?, ?, ?, 'IRESORT', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  if (booker === null) {
    w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, id);
    gieoBanChup(w.sqlite, id);
  } else {
    const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SA, body: { status: "confirmed" } });
    assert.equal(xn.status, 200, xn.text);
  }
  for (const [soTien, nguoiThu] of lanThu) assert.equal((await thu(w, KT, id, soTien, nguoiThu)).status, 201);
  if (!giao) return id; // `giao = false`: đơn đã xác nhận, CHƯA «Đã giao» (Ruling R-P15)
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SA, body: {} });
  assert.equal(g.status, 200, g.text);
  return id;
}
const dongLoai = (w: W, orderId: string, kind: string) => w.q(`SELECT l.debtor_party_id AS benNo, l.creditor_party_id AS benDuocNo, l.amount, p.kind_code AS phieu, l.order_service_id AS dv
  FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND l.kind_code = ? ORDER BY l.rowid`, orderId, kind).map((r: Record<string, unknown>) => ({ ...r }));

test("Task 6 (P6 a): yêu cầu bổ sung GIA_VON cho đơn ĐÃ «Đã giao» (Tour Đảo nợ i-resort 800.000) ⇒ 201 chờ duyệt (nhãn «Giá vốn») ⇒ người thứ hai duyệt ⇒ dòng GIA_VON trên phiếu ADJUSTMENT", async () => {
  const w = setup();
  hoSoThuongMai(w);
  const ct = congTy(w);
  const id = await donDaGiao(w, [[1_000_000, "cong_ty"]]);
  assert.deepEqual(dongLoai(w, id, "GIA_VON"), [], "đơn lượt 1 / b1x: chưa có giá vốn");
  const r = await tao(w, { orderId: id, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 800_000, lyDo: "bổ sung giá vốn i-resort bán 80%" });
  assert.equal(r.status, 201, r.text);
  const y = (await ds(w, KT)).json.yeuCau.find((x: { id: string }) => x.id === r.json.yeuCauId);
  assert.deepEqual([y.loaiDong, y.loaiDongNhan, y.huong], ["GIA_VON", "Giá vốn", "tang"]);
  assert.equal(soPhieuDieuChinh(w, id), 0, "chưa duyệt ⇒ sổ chưa đổi");
  const d = await duyet(w, r.json.yeuCauId);
  assert.equal(d.status, 201, d.text);
  assert.deepEqual(dongLoai(w, id, "GIA_VON"), [{ benNo: ct, benDuocNo: NCC, amount: 800_000, phieu: "ADJUSTMENT", dv: null }]);
  assert.equal(soDu(w, id, ct, NCC), 800_000, "Tour Đảo nợ i-resort 800.000");
});

test("Task 6 (P6 a): ví dụ D-3 (ADR-0080) «đại lý → Tour Đảo 20.000 loại hoa hồng» chạy được — giảm nợ hoa hồng Tour Đảo đang nợ đại lý (100.000 → 80.000)", async () => {
  const w = setup();
  hoSoThuongMai(w);
  const ct = congTy(w);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } })).status, 201);
  const id = await donDaGiao(w, [[1_000_000, "cong_ty"]], DAI_LY);
  assert.deepEqual(dongLoai(w, id, "HOA_HONG").map((d) => [d.benNo, d.benDuocNo, d.amount, d.phieu]), [[ct, DAI_LY, 100_000, "DELIVERED"]]);
  const r = await tao(w, { orderId: id, benNo: DAI_LY, benDuocNo: ct, loaiDong: "HOA_HONG", soTien: 20_000, lyDo: "trả lại phần hoa hồng ghi thừa" });
  assert.equal(r.status, 201, r.text);
  assert.equal((await ds(w, KT)).json.yeuCau.find((x: { id: string }) => x.id === r.json.yeuCauId).loaiDongNhan, "Hoa hồng");
  assert.equal((await duyet(w, r.json.yeuCauId)).status, 201);
  assert.deepEqual(dongLoai(w, id, "HOA_HONG").map((d) => [d.benNo, d.benDuocNo, d.amount, d.phieu]), [[ct, DAI_LY, 100_000, "DELIVERED"], [DAI_LY, ct, 20_000, "ADJUSTMENT"]]);
  assert.equal(soDu(w, id, ct, DAI_LY), 80_000);
  // Loại thứ ba (giảm giá bên đặt chịu) cũng nhận; loại lạ vẫn 400.
  const g = await tao(w, { orderId: id, benNo: DAI_LY, benDuocNo: ct, loaiDong: "GIAM_GIA_BEN_DAT", soTien: 10_000, lyDo: "đại lý chịu thêm phần giảm giá cho khách" });
  assert.equal(g.status, 201, g.text);
  assert.equal((await ds(w, KT)).json.yeuCau.find((x: { id: string }) => x.id === g.json.yeuCauId).loaiDongNhan, "Giảm giá bên đặt chịu");
  assert.equal((await tao(w, { orderId: id, benNo: DAI_LY, benDuocNo: ct, loaiDong: "XYZ", soTien: 10_000 })).status, 400);
});

test("Task 6 (P6 a — kết quả ghi ở sổ thi công): nhà cung cấp đang GIỮ tiền khách, bổ sung giá vốn làm ĐỔI DẤU số dư cặp ⇒ 409 adjustment_flips_sign lúc tạo (Đ5a, không nới); tách hai yêu cầu (giảm về 0 rồi tăng) thì ghi được; giữ ≥ giá vốn thì một yêu cầu", async () => {
  const w = setup();
  hoSoThuongMai(w);
  const ct = congTy(w);
  // (1) i-resort giữ 500.000 (khách trả một nửa tại quầy), Công ty thu 500.000; giá vốn 800.000 > 500.000 ⇒ cặp (i-resort, Tour Đảo) đổi từ «i-resort nợ 500.000» sang «Tour Đảo nợ 300.000».
  const a = await donDaGiao(w, [[500_000, { partyId: NCC }], [500_000, "cong_ty"]]);
  assert.equal(soDu(w, a, NCC, ct), 500_000, "i-resort đang giữ 500.000 của khách");
  const lat = await tao(w, { orderId: a, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 800_000, lyDo: "bổ sung giá vốn i-resort bán 80%" });
  assert.equal(lat.status, 409, lat.text);
  assert.deepEqual([lat.json.error.code, lat.json.error.message], ["adjustment_flips_sign", "Điều chỉnh giảm nợ vượt số đang nợ trên đơn (500.000 ₫) — số dư không được đổi dấu."]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ?", a), 0, "không yêu cầu nào được tạo");
  // Lối đi hôm nay (không nới luật): hai yêu cầu — 500.000 (giảm nợ về 0) rồi 300.000 (tăng nợ, trong trần cộng dồn).
  const y1 = await tao(w, { orderId: a, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 500_000, lyDo: "bổ sung giá vốn i-resort phần một" });
  assert.equal(y1.status, 201, y1.text);
  assert.equal((await duyet(w, y1.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, a, NCC, ct), 0);
  const y2 = await tao(w, { orderId: a, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 300_000, lyDo: "bổ sung giá vốn i-resort phần hai" });
  assert.equal(y2.status, 201, y2.text);
  assert.equal((await duyet(w, y2.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, a, ct, NCC), 300_000, "Tour Đảo nợ i-resort 300.000 = 800.000 giá vốn − 500.000 i-resort giữ");
  assert.deepEqual(dongLoai(w, a, "GIA_VON").map((d) => d.amount), [500_000, 300_000]);
  // (2) i-resort giữ ĐỦ 1.000.000 ≥ giá vốn 800.000 ⇒ một yêu cầu (giảm nợ, không đổi dấu): i-resort còn nợ Tour Đảo 200.000.
  const b = await donDaGiao(w, [[1_000_000, { partyId: NCC }]]);
  const y3 = await tao(w, { orderId: b, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 800_000, lyDo: "bổ sung giá vốn i-resort bán 80%" });
  assert.equal(y3.status, 201, y3.text);
  assert.equal((await duyet(w, y3.json.yeuCauId)).status, 201);
  assert.equal(soDu(w, b, NCC, ct), 200_000);
});

// ---- Vòng sửa 1 Task 6 (người kiểm): R-P15 — loại dòng thương mại chỉ cho đơn ĐÃ «Đã giao»; R-P18 — tài khoản giữ quyền Đối tác không chạm yêu cầu điều chỉnh ----
const CAU_CHUA_GIAO = "Đơn chưa Đã giao — chưa bổ sung được khoản này; chờ Đã giao rồi tạo yêu cầu.";
/** Dòng REQUEST chờ duyệt chèn thẳng (giả yêu cầu tạo TRƯỚC khi có luật R-P15) — để thử vế kiểm lúc DUYỆT. */
function yeuCauCho(w: W, orderId: string, v: { benNo: string; benDuocNo: string; loai: string; soTien: number }): string {
  const id = uuid();
  const luc = new Date().toISOString();
  w.sqlite.prepare(`INSERT INTO bil_adjustment_request (id, kind_code, order_id, debtor_party_id, creditor_party_id, amount, line_kind_code, occurred_date, direction, reason,
    created_at, created_by, updated_at, updated_by) VALUES (?, 'REQUEST', ?, ?, ?, ?, ?, ?, 'INCREASE', 'yêu cầu cũ trước luật R-P15', ?, ?, ?, ?)`)
    .run(id, orderId, v.benNo, v.benDuocNo, v.soTien, v.loai, vnNgay(0), luc, KT, luc, KT);
  return id;
}

test("Vòng sửa 1 Task 6 (R-P15): đơn đại lý ĐÃ xác nhận, CHƯA «Đã giao» — yêu cầu HOA_HONG / GIAM_GIA_BEN_DAT / GIA_VON ⇒ 409 lúc tạo; yêu cầu cũ chờ duyệt ⇒ 409 lúc duyệt; sau «Đã giao» chỉ MỘT dòng hoa hồng gốc", async () => {
  const w = setup();
  hoSoThuongMai(w);
  const ct = congTy(w);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } })).status, 201);
  const id = await donDaGiao(w, [[1_000_000, "cong_ty"]], DAI_LY, false);
  for (const [loaiDong, benNo, benDuocNo] of [["HOA_HONG", ct, DAI_LY], ["GIAM_GIA_BEN_DAT", DAI_LY, ct], ["GIA_VON", ct, NCC]] as const) {
    const r = await tao(w, { orderId: id, benNo, benDuocNo, loaiDong, soTien: 100_000, lyDo: "bổ sung khoản thương mại trước khi giao" });
    assert.equal(r.status, 409, `${loaiDong}: ${r.text}`);
    assert.deepEqual([r.json.error.code, r.json.error.message], ["commercial_before_delivered", CAU_CHUA_GIAO], loaiDong);
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ?", id), 0, "không dòng yêu cầu nào");
  // loại giữ hộ cũ vẫn tạo được trên đơn chưa giao (không đổi luật cũ)
  assert.equal((await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 50_000 })).status, 201);
  // vế DUYỆT: yêu cầu hoa hồng cũ còn chờ ⇒ 409, không phiếu, không dòng
  const cu = yeuCauCho(w, id, { benNo: ct, benDuocNo: DAI_LY, loai: "HOA_HONG", soTien: 100_000 });
  const d = await duyet(w, cu);
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "commercial_before_delivered");
  assert.equal(soPhieuDieuChinh(w, id), 0);
  // Ca người kiểm tái hiện: «Đã giao» sau đó ⇒ đúng MỘT dòng HOA_HONG 100.000 (không 200.000)
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: SA, body: {} })).status, 200);
  assert.deepEqual(dongLoai(w, id, "HOA_HONG").map((x) => [x.benNo, x.benDuocNo, x.amount, x.phieu]), [[ct, DAI_LY, 100_000, "DELIVERED"]]);
  assert.equal(soDu(w, id, ct, DAI_LY), 100_000);
  // sau «Đã giao» yêu cầu cũ duyệt được (số đúng theo sổ lúc duyệt)
  assert.equal((await duyet(w, cu)).status, 201);
});

const LAI = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // Kế toán + Đối tác (tài khoản lai)
const LAI_DUYET = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // Toàn quyền + Đối tác (lai, có ô duyệt)
test("Vòng sửa 1 Task 6 (R-P18): tài khoản giữ quyền Đối tác (lai Kế toán + Đối tác, lai Toàn quyền + Đối tác) ⇒ 403 ở danh sách, tạo, duyệt, từ chối, rút yêu cầu điều chỉnh; Kế toán thường không đổi", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Khoa Lai Kế", perms: ["ACCOUNTING", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_DUYET, phone: "0900000012", name: "Hà Lai Chủ", perms: ["SUPER_ADMIN", "PARTNER"] });
  hoSoThuongMai(w);
  const ct = congTy(w);
  const id = await donDaGiao(w, [[1_000_000, "cong_ty"]]);
  const cau = "Tài khoản có quyền Đối tác không xem, tạo hay duyệt được yêu cầu điều chỉnh công nợ.";
  const yc = await tao(w, { orderId: id, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 800_000, lyDo: "bổ sung giá vốn i-resort bán 80%" });
  assert.equal(yc.status, 201, yc.text);
  for (const as of [LAI, LAI_DUYET]) {
    const l = await ds(w, as);
    assert.deepEqual([l.status, l.json?.error?.message], [403, cau], `danh sách — ${as}`);
    const t = await tao(w, { orderId: id, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 1_000, lyDo: "thử tạo bằng tài khoản lai" }, as);
    assert.deepEqual([t.status, t.json?.error?.message], [403, cau], `tạo — ${as}`);
    assert.equal((await duyet(w, yc.json.yeuCauId, as)).status, 403, `duyệt — ${as}`);
    assert.equal((await tuChoi(w, yc.json.yeuCauId, { lyDo: "không đồng ý khoản này" }, as)).status, 403, `từ chối — ${as}`);
    assert.equal((await rut(w, yc.json.yeuCauId, as)).status, 403, `rút — ${as}`);
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_adjustment_request WHERE order_id = ?", id), 1, "chỉ yêu cầu của Kế toán thường");
  assert.equal((await ds(w, KT2)).status, 200, "Kế toán thường vẫn xem");
  assert.equal((await duyet(w, yc.json.yeuCauId)).status, 201, "Kế toán thường vẫn duyệt");
});

// ---- Đóng khe «Huỷ dòng sổ» đảo riêng dòng thương mại (BL-SDL2-DAO-DONG-TM — người kiểm toàn nhánh sổ đại lý đợt 2 xếp HIGH; chủ chọn «Chặn rồi mới đẩy» 19/10) ----
// Lệnh đảo ghi NGAY, không người thứ hai duyệt (ADR-0115 điều 3) ⇒ trước khi chặn, MỘT Kế toán xoá được hoa hồng / giá vốn / giảm giá bên đặt mà luật hai người canh, và kiểm
// định kỳ R-BIL-2 / 16 / 18 chỉ xét dòng gốc nên không thấy. Ba loại này chỉ sửa bằng yêu cầu điều chỉnh có duyệt; dòng khác (giữ hộ, nộp, trả lại) và «Huỷ khoản thu» giữ nguyên.
const CAU_DAO_THUONG_MAI = "Dòng hoa hồng, giá vốn hay giảm giá bên đặt chịu không huỷ riêng được — tạo yêu cầu điều chỉnh để người thứ hai duyệt.";
const CAU_DOI_TAC_DAO = "Tài khoản có quyền Đối tác không huỷ được khoản thu hay dòng sổ.";
const daoDong = (w: W, lineId: string, as = KT) => w.call("POST", "/api/ledger/adjustments", { as, body: { loai: "dao_dong", lineId, lyDo: "huỷ riêng dòng này thử" } });
const idDong = (w: W, orderId: string, kind: string, phieu: string) =>
  String(w.q("SELECT l.id FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND l.kind_code = ? AND p.kind_code = ? AND l.reverses_line_id IS NULL", orderId, kind, phieu)[0].id);

/** Đơn đại lý 1.000.000, giảm 250.000, mức 50% ⇒ «Đã giao» ghi HOA_HONG 500.000 (Tour Đảo → đại lý) và GIAM_GIA_BEN_DAT 250.000 (đại lý → Tour Đảo) — kịch bản người kiểm. */
async function donDaiLyGiam(w: W): Promise<string> {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 250000, 750000, 750000, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, DAI_LY, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'IRESORT', 'Vé i-resort', 'perPax', 1, ?)").run(`${id}-s`, id, vnNgay(0));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total)
    VALUES (?, ?, ?, 'IRESORT', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SA, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  assert.equal((await thu(w, KT, id, 750_000, "cong_ty")).status, 201);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SA, body: {} });
  assert.equal(g.status, 200, g.text);
  return id;
}

test("BL-SDL2-DAO-DONG-TM (a): Kế toán «Huỷ dòng sổ» riêng dòng HOA_HONG 500.000 / GIAM_GIA_BEN_DAT 250.000 của phiếu Đã giao, và dòng GIA_VON của phiếu điều chỉnh đã duyệt ⇒ 409, không ghi gì; dòng giữ hộ của phiếu điều chỉnh vẫn huỷ được", async () => {
  const w = setup();
  hoSoThuongMai(w);
  const ct = congTy(w);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 5000 } })).status, 201);
  const id = await donDaiLyGiam(w);
  assert.equal(soDu(w, id, ct, DAI_LY), 250_000, "Tour Đảo nợ đại lý 500.000 hoa hồng − 250.000 giảm giá");
  const giaVon = await tao(w, { orderId: id, benNo: ct, benDuocNo: NCC, loaiDong: "GIA_VON", soTien: 300_000, lyDo: "bổ sung giá vốn i-resort sau Đã giao" });
  assert.equal(giaVon.status, 201, giaVon.text);
  assert.equal((await duyet(w, giaVon.json.yeuCauId)).status, 201);
  const dongTruoc = dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id);
  for (const [kind, phieu] of [["HOA_HONG", "DELIVERED"], ["GIAM_GIA_BEN_DAT", "DELIVERED"], ["GIA_VON", "ADJUSTMENT"]] as const) {
    for (const as of [KT, SA]) {
      const r = await daoDong(w, idDong(w, id, kind, phieu), as);
      assert.deepEqual([r.status, r.json?.error?.code, r.json?.error?.message], [409, "commercial_line_needs_approval", CAU_DAO_THUONG_MAI], `${kind} — ${as}: ${r.text}`);
      assert.ok(!/\d{3}\.\d{3}/.test(r.text), "câu báo không nêu số tiền");
    }
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), dongTruoc, "không dòng đảo nào");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'REVERSAL'", id), 0, "không phiếu đảo");
  assert.equal(soDu(w, id, ct, DAI_LY), 250_000);
  assert.equal(soDu(w, id, ct, NCC), 300_000);
  // Dòng KHÔNG thương mại vẫn đi đường cũ: điều chỉnh giữ hộ đã duyệt rồi «Huỷ dòng sổ» ⇒ 201 (ADR-0115 điều 5 «sửa nhầm bằng đảo dòng»).
  const giu = await tao(w, { orderId: id, benNo: hdv, benDuocNo: ct, soTien: 50_000 });
  assert.equal(giu.status, 201, giu.text);
  assert.equal((await duyet(w, giu.json.yeuCauId)).status, 201);
  const r = await daoDong(w, idDong(w, id, "HELD", "ADJUSTMENT"));
  assert.equal(r.status, 201, r.text);
});

test("BL-SDL2-DAO-DONG-TM (b): tài khoản giữ quyền Đối tác (lai Kế toán + Đối tác, lai Toàn quyền + Đối tác) ⇒ 403 ở «Huỷ khoản thu» và «Huỷ dòng sổ»; Kế toán thường huỷ khoản thu hợp lệ vẫn 201", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Khoa Lai Kế", perms: ["ACCOUNTING", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_DUYET, phone: "0900000012", name: "Hà Lai Chủ", perms: ["SUPER_ADMIN", "PARTNER"] });
  hoSoThuongMai(w);
  const ct = congTy(w);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 5000 } })).status, 201);
  const daGiao = await donDaiLyGiam(w);
  const chuaGiao = don(w);
  assert.equal((await thu(w, KT, chuaGiao, 300_000, "cong_ty")).status, 201);
  const rc = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", chuaGiao)[0].id);
  const giu = await tao(w, { orderId: daGiao, benNo: hdv, benDuocNo: ct, soTien: 50_000 });
  assert.equal((await duyet(w, giu.json.yeuCauId)).status, 201);
  const dongGiu = idDong(w, daGiao, "HELD", "ADJUSTMENT");
  for (const as of [LAI, LAI_DUYET]) {
    const a = await w.call("POST", "/api/ledger/adjustments", { as, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "huỷ thử bằng tài khoản lai" } });
    assert.deepEqual([a.status, a.json?.error?.message], [403, CAU_DOI_TAC_DAO], `huỷ khoản thu — ${as}`);
    for (const lineId of [idDong(w, daGiao, "GIAM_GIA_BEN_DAT", "DELIVERED"), dongGiu]) {
      const b = await daoDong(w, lineId, as);
      assert.deepEqual([b.status, b.json?.error?.message], [403, CAU_DOI_TAC_DAO], `huỷ dòng sổ — ${as}`);
    }
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE reverses_id IS NOT NULL"), 0, "tài khoản lai không đảo được gì");
  const ok = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: rc, lyDo: "ghi nhầm người thu" } });
  assert.equal(ok.status, 201, ok.text);
});

// ---- Siết thêm cổng Đối tác (người kiểm lại a401c14a, Important I-1; chủ chọn nguyên tắc «chặn»): «Sửa khoản thu đã ghi», «Đã nộp về công ty» / «công ty trả» và «Ghi hoàn
// cho khách» cũng ghi NGAY, không người duyệt ⇒ tài khoản giữ quyền Đối tác (kể cả lai) tự làm mất khoản mình đang giữ của công ty. Kế toán thường vẫn dùng được cả ba.
const CAU_DOI_TAC_GHI_SO = "Tài khoản có quyền Đối tác không sửa khoản thu, ghi nộp tiền hay hoàn tiền khách được.";
test("Cổng Đối tác (I-1): tài khoản lai tự giữ 300.000 rồi «Sửa khoản thu» sang Công ty / ghi «Đã nộp» / «Ghi hoàn» do mình trả ⇒ 403, câu không số, số dư không đổi; Kế toán thường cả ba 201", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Khoa Lai Kế", perms: ["ACCOUNTING", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_DUYET, phone: "0900000012", name: "Hà Lai Chủ", perms: ["SUPER_ADMIN", "PARTNER"] });
  const ct = congTy(w);
  const lai = `pty-${LAI}`;
  const id = don(w);
  assert.equal((await thu(w, KT, id, 300_000, { partyId: lai })).status, 201);
  const rc = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", id)[0].id);
  assert.equal(soDu(w, id, lai, ct), 300_000, "tài khoản lai đang giữ 300.000 của công ty");
  const dongTruoc = dem(w, "SELECT count(*) AS n FROM bil_debt_line");
  for (const as of [LAI, LAI_DUYET]) {
    const loi = [
      await w.call("POST", "/api/ledger/receipt-replacements", { as, body: { orderId: id, cu: [rc], moi: [{ soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "đổi người thu sang công ty" } }),
      await w.call("POST", "/api/ledger/settlements", { as, body: { chieu: "nop", partyId: lai, phanBo: [{ orderId: id, soTien: 300_000 }] } }),
      await w.call("POST", "/api/ledger/settlements", { as, body: { chieu: "tra", partyId: lai, phanBo: [{ orderId: id, soTien: 100_000 }] } }),
      await w.call("POST", "/api/ledger/refunds", { as, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: { partyId: lai } } }),
    ];
    for (const [i, r] of loi.entries()) {
      assert.deepEqual([r.status, r.json?.error?.message], [403, CAU_DOI_TAC_GHI_SO], `lệnh ${i} — ${as}`);
      assert.doesNotMatch(r.text, /300[.,]?000|100[.,]?000/, "câu không lộ số");
    }
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_debt_line"), dongTruoc, "không thêm dòng nào");
  assert.equal(soDu(w, id, lai, ct), 300_000, "khoản giữ không mất");
  // Kế toán thường: cả ba lệnh vẫn ghi được.
  const h = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: { partyId: lai } } });
  assert.equal(h.status, 201, h.text);
  const n = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: lai, phanBo: [{ orderId: id, soTien: 200_000 }] } });
  assert.equal(n.status, 201, n.text);
  assert.equal(soDu(w, id, lai, ct), 0);
  const id2 = don(w);
  assert.equal((await thu(w, KT, id2, 300_000, { partyId: lai })).status, 201);
  const rc2 = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL", id2)[0].id);
  const s = await w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id2, cu: [rc2], moi: [{ soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "khách chuyển khoản cho công ty" } });
  assert.equal(s.status, 201, s.text);
});
