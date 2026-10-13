// ADR-0115 đợt 1 — điều chỉnh công nợ CẦN NGƯỜI THỨ HAI DUYỆT, qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch).
// Tiêu chí nghiệm thu 1–7 của phụ lục (docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-hc-4-2.md mục 3); tiêu chí 2 (phần CSDL) ở
// src/migrations-dieu-chinh-duyet.test.ts, tiêu chí 8–9 ở các bài đã sửa và src/audit-invariants.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
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
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vnNgay(10));
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
