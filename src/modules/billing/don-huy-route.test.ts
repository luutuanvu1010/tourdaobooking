// Đơn huỷ và cọc (ADR-0089) — hành vi qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, lô `db.batch()` là một giao dịch).
// Kế hoạch Đợt 1: NT-1 (bốn bề mặt "còn lại" = 0), NT-5 (biên nhận không đoán), NT-L* (lý do huỷ), NT-H10 (lần thu lên đơn huỷ), NT-H*/N* (duyệt, chi, chuyển,
// hoàn ngoài — Phần B).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const KT2 = "77777777-7777-4777-8777-777777777777";
const QTKT = "88888888-8888-4888-8888-888888888888";
const AT = "2026-09-01T00:00:00.000Z";
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
export function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADMIN, "0900000004", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]],
    [KT2, "0900000008", "Mai Kế Toán", ["ACCOUNTING"]], [QTKT, "0900000009", "Kiêm Hai Việc", ["ADMIN", "ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN (tổng `total`, một dịch vụ ngày đi `depart`) của Bán hàng, người phụ trách = HDV. */
function donDaXacNhan(w: W, o: { total?: number; depart?: string | null } = {}): string {
  const id = uuid();
  const total = o.total ?? 2_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, total, total, total, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, o.depart === undefined ? vnNgay(30) : o.depart);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, total, total);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const thu = (w: W, as: string, orderId: string, soTien: number, nguoiThu: unknown = "toi") =>
  w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu } });
const huy = (w: W, as: string, orderId: string, lyDo: unknown = "KHACH_DOI_Y", ghiChu?: string) =>
  w.call("POST", `/api/orders/${orderId}/status`, { as, body: { status: "cancelled", lyDo, ...(ghiChu === undefined ? {} : { ghiChu }) } });

test("NT-1 (đ1, H-C8): đơn 2.000.000, thu 500.000, huỷ → 'còn lại' = 0 ở trang đơn, danh sách nhiều đơn và biên nhận (không còn 1.500.000)", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, id, 500_000)).status, 201);
  const h = await huy(w, SALES, id);
  assert.equal(h.status, 200, h.text);
  const p = await w.call("GET", `/api/orders/${id}/payments`, { as: SALES });
  assert.equal(p.status, 200, p.text);
  assert.deepEqual([p.json.conLai, p.json.du], [0, 0], "trang đơn");
  const b = await w.call("POST", "/api/ledger/balances", { as: SALES, body: { orderIds: [id] } });
  assert.equal(b.status, 200, b.text);
  assert.deepEqual([b.json.balances[id].conLai, b.json.balances[id].du], [0, 0], "danh sách / Trang chủ / Việc của tôi");
  const r = await w.call("GET", `/api/orders/${id}/receipt`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.receipt.conLai, 0, "biên nhận gửi khách");
});

const lyDoHienHanh = (w: W, orderId: string) => {
  const r = w.q(`SELECT group_code, reason_code, note, legacy FROM ord_cancel_reason r WHERE order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_cancel_reason x WHERE x.reclassifies_id = r.id)`, orderId)[0];
  return r ? ({ ...r } as { group_code: string; reason_code: string; note: string | null; legacy: number }) : undefined;
};

test("NT-L1 (đ8): huỷ thiếu lý do → 400; lý do lạ → 400; 'Khác' thiếu ghi chú → 400; ghi chú có SĐT → 400; đơn không đổi", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  for (const [lyDo, ghiChu] of [[undefined, undefined], ["BLA", undefined], ["OTHER", undefined], ["OTHER", "gọi 0912345678"]] as const) {
    const r = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "cancelled", ...(lyDo ? { lyDo } : {}), ...(ghiChu ? { ghiChu } : {}) } });
    assert.equal(r.status, 400, `${lyDo}/${ghiChu}: ${r.text}`);
  }
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0]!.status, "confirmed");
  assert.equal(lyDoHienHanh(w, id), undefined, "không dòng lý do nào");
});

test("NT-L2 (Đ-2, H-C4): nhóm 'Công ty huỷ' — Bán hàng → 403; Quản trị, Toàn quyền → được; dòng lý do lưu đúng nhóm; nhật ký ghi nhãn", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  const r403 = await huy(w, SALES, a, "THOI_TIET");
  assert.equal(r403.status, 403, r403.text);
  assert.match(r403.json.error.message, /Quản trị hoặc Toàn quyền/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", a)[0]!.status, "confirmed");
  assert.equal((await huy(w, ADMIN, a, "THOI_TIET")).status, 200);
  assert.deepEqual(lyDoHienHanh(w, a), { group_code: "CONG_TY_HUY", reason_code: "THOI_TIET", note: null, legacy: 0 });
  const b = donDaXacNhan(w);
  assert.equal((await huy(w, SA, b, "HET_CHO")).status, 200);
  assert.equal(lyDoHienHanh(w, b)!.group_code, "CONG_TY_HUY");
  const c = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, c, "SAI_THONG_TIN")).status, 200, "Bán hàng chọn được 'lập lại'");
  assert.equal(lyDoHienHanh(w, c)!.group_code, "LAP_LAI");
  const nk = w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'cancelled'", c)[0] as { detail: string };
  assert.equal(nk.detail, "Sai thông tin — lập lại đơn (Huỷ để lập lại / trùng đơn)", "nhật ký ghi nhãn, không mã thô");
});

test("NT-L4 (lời chủ (a)): HDV huỷ 'Không liên hệ được với khách' → nhóm khách huỷ; 'Khác' → chưa kết luận, ghi chú lưu; nhật ký giữ nguyên văn", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  const r = await w.call("POST", `/api/orders/${a}/handler-cancel`, { as: HDV, body: { reason: "not_reachable" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(lyDoHienHanh(w, a), { group_code: "KHACH_HUY", reason_code: "KHONG_LIEN_HE", note: null, legacy: 0 });
  const b = donDaXacNhan(w);
  assert.equal((await w.call("POST", `/api/orders/${b}/handler-cancel`, { as: HDV, body: { reason: "other", note: "Khách ốm nặng" } })).status, 200);
  assert.deepEqual(lyDoHienHanh(w, b), { group_code: "CHUA_KET_LUAN", reason_code: "OTHER", note: "Khách ốm nặng", legacy: 0 });
  assert.equal((w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_cancelled_by_field'", b)[0] as { detail: string }).detail, "Khách ốm nặng");
});

test("NT-L5/L6 (X-2): phân loại — Bán hàng, Kế toán → 403; đơn chưa huỷ → 409; chưa kết luận → Quản trị phân loại 201 + Location; lần hai / đã kết luận → 409", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  const pl = (as: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${id}/cancel-reason`, { as, body });
  assert.equal((await pl(ADMIN, { nhom: "KHACH_HUY", lyDo: "Đã gọi khách" })).status, 409, "đơn chưa huỷ");
  assert.equal((await huy(w, SALES, id, "OTHER", "Khách ốm")).status, 200);
  assert.equal((await pl(SALES, { nhom: "KHACH_HUY", lyDo: "x" })).status, 403);
  assert.equal((await pl(KT, { nhom: "KHACH_HUY", lyDo: "x" })).status, 403);
  assert.equal((await pl(ADMIN, { nhom: "CHUA_KET_LUAN", lyDo: "x" })).status, 400);
  assert.equal((await pl(ADMIN, { nhom: "KHACH_HUY" })).status, 400, "lý do bắt buộc");
  const ok = await pl(ADMIN, { nhom: "CONG_TY_HUY", lyDo: "Tàu hỏng — lỗi nhà cung cấp" });
  assert.equal(ok.status, 201, ok.text);
  assert.equal(ok.headers.get("location"), `/order?id=${id}`);
  assert.equal(lyDoHienHanh(w, id)!.group_code, "CONG_TY_HUY");
  assert.equal((await pl(SA, { nhom: "KHACH_HUY", lyDo: "Đổi ý" })).status, 409, "đã kết luận → không đổi nhóm lần nữa (NT-L6)");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_cancel_reason_classified'", id)[0]!.n, 1);
  const khac = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, khac, "KHACH_DOI_Y")).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${khac}/cancel-reason`, { as: ADMIN, body: { nhom: "CONG_TY_HUY", lyDo: "x" } })).status, 409, "khách huỷ đã kết luận");
});

test("NT-H10 (đ13, H-C9): lần thu lên đơn ĐÃ HUỶ — Bán hàng, HDV → 403 (cờ ghi thu tắt); Kế toán, Toàn quyền → 201", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await huy(w, SALES, id)).status, 200);
  assert.equal((await thu(w, SALES, id, 100_000)).status, 403);
  assert.equal((await thu(w, HDV, id, 100_000)).status, 403);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: SALES })).json.coTheGhiThu, false);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json.coTheGhiThu, true);
  assert.equal((await thu(w, KT, id, 100_000, "cong_ty")).status, 201);
  assert.equal((await thu(w, SA, id, 50_000, "cong_ty")).status, 201);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Phần B — duyệt, chi, chuyển, hoàn ngoài (kế hoạch Task 8–10)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
const tien = async (w: W, as: string, id: string) => (await w.call("GET", `/api/orders/${id}/payments`, { as })).json;
const duyet = (w: W, as: string, id: string, body: Record<string, unknown>, ve?: string) =>
  w.call("POST", `/api/orders/${id}/coc/duyet`, { as, body, headers: ve ? { "idempotency-key": ve } : {} });
const chi = (w: W, as: string, id: string, body: Record<string, unknown>, ve?: string) =>
  w.call("POST", `/api/orders/${id}/coc/chi`, { as, body: { hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty", ...body }, headers: ve ? { "idempotency-key": ve } : {} });
/** Đơn 2.000.000, Kế toán ghi Công ty thu `so`, rồi huỷ với `lyDo` bởi `nguoiHuy`. */
async function donHuyCoTien(w: W, o: { so?: number; lyDo?: string; nguoiHuy?: string; ghiChu?: string; depart?: string | null } = {}): Promise<string> {
  const id = donDaXacNhan(w, { depart: o.depart });
  if ((o.so ?? 500_000) > 0) assert.equal((await thu(w, KT, id, o.so ?? 500_000, "cong_ty")).status, 201);
  const h = await huy(w, o.nguoiHuy ?? SALES, id, o.lyDo ?? "KHACH_DOI_Y", o.ghiChu);
  assert.equal(h.status, 200, h.text);
  return id;
}

test("NT-H1/H2 (đ4a): duyệt hoàn — Quản trị, Toàn quyền 201 + Location; Kế toán, Bán hàng, HDV → 403; lý do bắt buộc; nhiều lần một phần; vượt tiền còn giữ → 409", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  for (const as of [KT, SALES, HDV]) assert.equal((await duyet(w, as, id, { loai: "hoan", soTien: 1, lyDo: "x" })).status, 403);
  assert.equal((await duyet(w, ADMIN, id, { loai: "hoan", soTien: 100_000 })).status, 400, "lý do bắt buộc");
  const r = await duyet(w, ADMIN, id, { loai: "hoan", soTien: 200_000, lyDo: "Khách xin lại một phần" });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), `/order?id=${id}`);
  assert.equal((await duyet(w, SA, id, { loai: "hoan", soTien: 300_000, lyDo: "Thêm phần còn lại" })).status, 201);
  const vuot = await duyet(w, ADMIN, id, { loai: "hoan", soTien: 1, lyDo: "quá" });
  assert.equal(vuot.status, 409, vuot.text);
  assert.equal(vuot.json.error.code, "coc_exceeds_paid");
  const c = (await tien(w, KT, id)).coc;
  assert.deepEqual([c.daTra, c.daDuyet, c.choChi, c.conGiu, c.khoanDuyet.length], [500_000, 500_000, 500_000, 500_000, 2]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'deposit_refund_approved'", id)[0]!.n, 2);
});

test("NT-H3/H6 + SV-DH-02/09 (đ4b, đ4c): chi hoàn — Kế toán; vượt khoản → 409; tài khoản kiêm Quản trị + Kế toán tự chi khoản mình duyệt → 409; Kế toán khác → 201; huỷ duyệt chỉ phần chưa chi", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  const d = await duyet(w, QTKT, id, { loai: "hoan", soTien: 200_000, lyDo: "Hoàn một phần cho khách" });
  assert.equal(d.status, 201, d.text);
  const duyetId = d.json.duyetId;
  assert.equal((await chi(w, ADMIN, id, { duyetId, soTien: 1 })).status, 403, "Quản trị không chi (payment.refund)");
  const cung = await chi(w, QTKT, id, { duyetId, soTien: 100_000 });
  assert.equal(cung.status, 409, cung.text);
  assert.equal(cung.json.error.code, "coc_same_person");
  assert.equal((await chi(w, KT, id, { duyetId, soTien: 150_000 })).status, 201);
  const vuot = await chi(w, KT2, id, { duyetId, soTien: 50_001 });
  assert.equal(vuot.status, 409);
  assert.equal(vuot.json.error.code, "coc_exceeds_approved");
  const huy1 = await w.call("POST", `/api/orders/${id}/coc/duyet/${duyetId}/huy`, { as: ADMIN, body: { soTien: 50_001, lyDo: "Bớt" } });
  assert.equal(huy1.status, 409, huy1.text);
  assert.equal(huy1.json.error.code, "coc_void_exceeds_unspent");
  assert.equal((await w.call("POST", `/api/orders/${id}/coc/duyet/${duyetId}/huy`, { as: ADMIN, body: { soTien: 50_000, lyDo: "Khách không lấy nữa" } })).status, 201);
  const c = (await tien(w, KT, id)).coc;
  assert.deepEqual([c.daDuyet, c.daChi, c.conGiu, c.choChi], [150_000, 150_000, 350_000, 0]);
  assert.equal((await tien(w, KT, id)).conLai, 0);
});

test("NT-H5 (H-C7): trả dư tự do (POST /api/ledger/refunds) trên đơn HUỶ → 409 chỉ đường; đơn không huỷ trả dư như cũ", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  const r = await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_needs_approval");
  const x = donDaXacNhan(w, { total: 100_000 });
  assert.equal((await thu(w, KT, x, 150_000, "cong_ty")).status, 201);
  assert.equal((await w.call("POST", "/api/ledger/refunds", { as: KT, body: { orderId: x, soTien: 50_000, hinhThuc: "CASH", nguoiTra: "cong_ty" } })).status, 201);
});

test("NT-D2/D3 (đ5, H-C3): khách huỷ — duyệt sau hạn → 409 'Đã quá hạn hoàn cọc'; công ty huỷ sau hạn → 201; nhóm chưa kết luận → 409 tới khi Quản trị phân loại (SV-DH-11)", async () => {
  const w = setup();
  const qua = await donHuyCoTien(w, { depart: vnNgay(-70) });
  const r = await duyet(w, ADMIN, qua, { loai: "hoan", soTien: 100_000, lyDo: "trễ" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_deadline");
  assert.match(r.json.error.message, /^Đã quá hạn hoàn cọc \(hạn: \d{2}\/\d{2}\/\d{4}\)\.$/);
  assert.equal((await tien(w, ADMIN, qua)).coc.coTheDuyet, false);
  const ct = await donHuyCoTien(w, { depart: vnNgay(-70), lyDo: "THOI_TIET", nguoiHuy: ADMIN });
  assert.equal((await duyet(w, ADMIN, ct, { loai: "hoan", soTien: 500_000, lyDo: "Công ty huỷ — hoàn toàn bộ" })).status, 201, "SV-DH-04");
  const ck = await donHuyCoTien(w, { lyDo: "OTHER", ghiChu: "Khách ốm" });
  const r2 = await duyet(w, ADMIN, ck, { loai: "hoan", soTien: 100_000, lyDo: "x" });
  assert.equal(r2.json.error.code, "coc_unclassified");
  assert.equal((await tien(w, ADMIN, ck)).coc.coThePhanLoai, true);
  assert.equal((await w.call("POST", `/api/orders/${ck}/cancel-reason`, { as: ADMIN, body: { nhom: "KHACH_HUY", lyDo: "Đã gọi khách — khách đổi ý" } })).status, 201);
  assert.equal((await duyet(w, ADMIN, ck, { loai: "hoan", soTien: 100_000, lyDo: "Hoàn một phần" })).status, 201);
});

test("NT-H7/H8/H9 + SV-DH-05 (đ6): duyệt chuyển + chuyển một lô hai đơn — tiền HDV giữ chuyển sang đơn mới, tổng HDV giữ không đổi; người chuyển = người duyệt → 409; nhật ký cả hai đơn; đơn nhận huỷ → 409", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, a, 500_000)).status, 201);
  assert.equal((await huy(w, ADMIN, a, "THOI_TIET")).status, 200);
  const b = donDaXacNhan(w);
  const maB = (w.q("SELECT order_code FROM orders WHERE id = ?", b)[0] as { order_code: string }).order_code;
  const daHuy = await donHuyCoTien(w, { so: 0 });
  const maHuy = (w.q("SELECT order_code FROM orders WHERE id = ?", daHuy)[0] as { order_code: string }).order_code;
  assert.equal((await duyet(w, ADMIN, a, { loai: "chuyen", soTien: 500_000, lyDo: "Dời lịch", donNhan: maHuy })).json.error.code, "coc_bad_target");
  const d = await duyet(w, QTKT, a, { loai: "chuyen", soTien: 500_000, lyDo: "Dời lịch do thời tiết", donNhan: maB });
  assert.equal(d.status, 201, d.text);
  const nguoiGiu = { partyId: `pty-${HDV}` };
  const cung = await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: QTKT, body: { duyetId: d.json.duyetId, soTien: 500_000, nguoiGiu } });
  assert.equal(cung.json.error.code, "coc_same_person");
  assert.equal((await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: SALES, body: { duyetId: d.json.duyetId, soTien: 500_000, nguoiGiu } })).status, 403);
  const r = await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body: { duyetId: d.json.duyetId, soTien: 500_000, nguoiGiu } });
  assert.equal(r.status, 201, r.text);
  const ca = (await tien(w, KT, a)).coc;
  assert.deepEqual([ca.daChuyen, ca.conGiu, ca.choChi], [500_000, 0, 0]);
  const tb = await tien(w, KT, b);
  assert.equal(tb.daThu, 500_000, "đơn mới đã trả 500.000");
  const giuA = w.q("SELECT balance FROM v_bil_party_balance WHERE party_id = ? AND order_id = ? AND counterparty_id IN (SELECT party_id FROM v_pty_owner_company)", `pty-${HDV}`, a)[0] as { balance: number } | undefined;
  const giuB = w.q("SELECT balance FROM v_bil_party_balance WHERE party_id = ? AND order_id = ? AND counterparty_id IN (SELECT party_id FROM v_pty_owner_company)", `pty-${HDV}`, b)[0] as { balance: number } | undefined;
  assert.deepEqual([giuA?.balance ?? 0, giuB?.balance ?? 0], [0, 500_000], "HDV giữ trên A 0, trên B 500.000 — tổng không đổi");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'deposit_transferred_out'", a)[0]!.n, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'deposit_transferred_in'", b)[0]!.n, 1);
});

/** Đơn huỷ A có 500.000 HDV giữ + đơn nhận B + khoản duyệt chuyển 500.000 A → B (Quản trị). */
async function duyetChuyen(w: W) {
  const a = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, a, 500_000)).status, 201);
  assert.equal((await huy(w, ADMIN, a, "THOI_TIET")).status, 200);
  const b = donDaXacNhan(w);
  const maB = (w.q("SELECT order_code FROM orders WHERE id = ?", b)[0] as { order_code: string }).order_code;
  const d = await duyet(w, ADMIN, a, { loai: "chuyen", soTien: 500_000, lyDo: "Dời lịch do thời tiết", donNhan: maB });
  assert.equal(d.status, 201, d.text);
  return { a, b, duyetId: d.json.duyetId as string, body: { duyetId: d.json.duyetId, soTien: 500_000, nguoiGiu: { partyId: `pty-${HDV}` } } };
}
const soLanThu = (w: W, ...ids: string[]) => Number(w.q(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id IN (${ids.map(() => "?").join(", ")})`, ...ids)[0]!.n);

test("kiểm độc lập vòng 2 CAO-1: đơn nhận bị huỷ SAU khi duyệt chuyển → 'Chuyển' trả 409 coc_transfer_target_invalid, KHÔNG ghi nửa chi (trước đây: 500, nửa chi đã ghi, tiền biến mất)", async () => {
  const w = setup();
  const { a, b, body } = await duyetChuyen(w);
  assert.equal((await huy(w, ADMIN, b, "THOI_TIET")).status, 200, "người khác huỷ đơn nhận");
  const truoc = soLanThu(w, a, b);
  const r = await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_transfer_target_invalid");
  assert.equal(soLanThu(w, a, b), truoc, "không ghi gì ở cả hai đơn");
  assert.deepEqual([(await tien(w, KT, a)).coc.daChuyen, (await tien(w, KT, a)).coc.conGiu], [0, 500_000]);
});

test("kiểm độc lập vòng 2 CAO-1 (ca đua): đơn nhận bị huỷ NGAY TRƯỚC lô 'Chuyển' (sau khi máy chủ đã đọc) → CSDL huỷ cả lô hai đơn, 409, không lệch", async () => {
  const w = setup();
  const { a, b, body } = await duyetChuyen(w);
  const truoc = soLanThu(w, a, b);
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    w.sqlite.prepare(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
      VALUES ('lydo-dua', ?, 'THOI_TIET', 'CONG_TY_HUY', NULL, '2026-10-05', NULL, 0, ?, 'x', ?, 'x')`).run(b, AT, AT);
    w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(b);
    return goc(stmts);
  };
  const r = await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_transfer_target_invalid");
  assert.equal(soLanThu(w, a, b), truoc, "lô huỷ cả hai nửa");
});

test("kiểm độc lập vòng 2 CAO-2: đảo riêng nửa chi (đơn huỷ) hoặc nửa thu (đơn nhận) của lệnh chuyển đã xong → 409 coc_transfer_locked; không ghi; không chuyển lại được lần hai", async () => {
  const w = setup();
  const { a, b, body } = await duyetChuyen(w);
  assert.equal((await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body })).status, 201);
  const ra = String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND'", a)[0]!.id);
  const vao = String(w.q("SELECT id FROM bil_payment_receipt WHERE transfer_of_id = ?", ra)[0]!.id);
  const truoc = soLanThu(w, a, b);
  for (const receiptId of [ra, vao]) {
    const r = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId, lyDo: "đảo thử một nửa lệnh chuyển" } });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "coc_transfer_locked");
  }
  assert.equal(soLanThu(w, a, b), truoc);
  assert.equal((await w.call("POST", `/api/orders/${a}/coc/chuyen`, { as: KT, body })).status, 409, "khoản duyệt đã chuyển hết");
  assert.equal((await tien(w, KT, b)).daThu, 500_000);
});

test("NT-N1–N4 (đ16, X-3, X-4, lời chủ (b)): đơn huỷ CŨ — đối chiếu liệt kê; Toàn quyền ghi (Quản trị/Kế toán 403); tự xác nhận 409; Quản trị từ chối → ghi lại; Quản trị xác nhận → còn giữ 0; đơn huỷ mới → 409", async () => {
  const w = setup();
  const cu = donDaXacNhan(w, { depart: vnNgay(-200) });
  assert.equal((await thu(w, KT, cu, 300_000, "cong_ty")).status, 201);
  // Đơn huỷ CŨ: dòng lý do legacy = 1 (như câu gieo của migration 0078).
  w.sqlite.prepare(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('lydo-cu', ?, 'LEGACY', 'CHUA_KET_LUAN', NULL, '2026-09-01', NULL, 1, ?, 'he-thong', ?, 'he-thong')`).run(cu, AT, AT);
  w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(cu);
  const dc = await w.call("GET", "/api/ledger/coc/doi-chieu", { as: KT });
  assert.equal(dc.status, 200, dc.text);
  assert.deepEqual(dc.json.don.map((x: { orderId: string; conGiu: number }) => [x.orderId, x.conGiu]), [[cu, 300_000]]);
  assert.equal((await w.call("GET", "/api/ledger/coc/doi-chieu", { as: SALES })).status, 403);
  const ghi = (as: string, soTien: number) => w.call("POST", `/api/orders/${cu}/coc/hoan-ngoai`, { as, body: { soTien, lyDo: "Đã chuyển khoản trả khách ngày 10/9" } });
  assert.equal((await ghi(ADMIN, 300_000)).status, 403);
  assert.equal((await ghi(KT, 300_000)).status, 403);
  assert.equal((await ghi(SA, 300_001)).json.error.code, "coc_outside_exceeds");
  assert.equal((await ghi(SA, 200_000)).status, 201);
  assert.equal((await ghi(SA, 1)).json.error.code, "coc_outside_once");
  let c = (await tien(w, ADMIN, cu)).coc;
  assert.deepEqual([c.conGiu, c.daDuyet, c.hoanNgoaiDong[0].trangThai, c.coTheXacNhanHoanNgoai], [300_000, 0, "cho_xac_nhan", true]);
  const g1 = c.hoanNgoaiDong[0].id;
  const xn = (as: string, ghiId: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${cu}/coc/hoan-ngoai/${ghiId}/xac-nhan`, { as, body });
  assert.equal((await xn(SA, g1, { dongY: true })).json.error.code, "coc_same_person");
  assert.equal((await xn(ADMIN, g1, { dongY: false })).status, 400, "từ chối phải có lý do");
  assert.equal((await xn(ADMIN, g1, { dongY: false, lyDo: "Sai số — phải là 300.000" })).status, 201);
  assert.equal((await ghi(SA, 300_000)).status, 201, "bị từ chối → ghi lại được");
  c = (await tien(w, ADMIN, cu)).coc;
  const g2 = c.hoanNgoaiDong.find((x: { trangThai: string }) => x.trangThai === "cho_xac_nhan").id;
  assert.equal((await xn(ADMIN, g2, { dongY: true })).status, 201);
  c = (await tien(w, ADMIN, cu)).coc;
  assert.deepEqual([c.daDuyet, c.daChi, c.hoanNgoai, c.conGiu], [300_000, 300_000, 300_000, 0]);
  const moi = await donHuyCoTien(w);
  assert.equal((await w.call("POST", `/api/orders/${moi}/coc/hoan-ngoai`, { as: SA, body: { soTien: 1, lyDo: "Không phải đơn cũ" } })).json.error.code, "coc_outside_not_legacy");
});

test("NT-B2 + SV-DH-08 (đ15 mọi lúc): đảo lần thu khi đã duyệt → 409 câu tiếng Việt; huỷ duyệt rồi đảo → 201", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  const d = await duyet(w, ADMIN, id, { loai: "hoan", soTien: 400_000, lyDo: "Hoàn phần lớn" });
  const thuId = (w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_PAYMENT'", id)[0] as { id: string }).id;
  const dao = () => w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: thuId, lyDo: "Ghi nhầm đơn" } });
  const r = await dao();
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_paid_below_approved");
  assert.equal((await w.call("POST", `/api/orders/${id}/coc/duyet/${d.json.duyetId}/huy`, { as: ADMIN, body: { soTien: 400_000, lyDo: "Huỷ để đảo lần thu" } })).status, 201);
  assert.equal((await dao()).status, 201);
});

test("NT-V6 + NT-D5 (máy chủ): danh sách / ô đếm chỉ ledger.view any (Kế toán, Toàn quyền); Quản trị, Bán hàng → 403; số đếm đúng", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  await duyet(w, ADMIN, id, { loai: "hoan", soTien: 100_000, lyDo: "Hoàn một phần" });
  w.sqlite.prepare("INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by) VALUES ('d-cu', ?, 'REFUND', 50000, NULL, 'cũ', ?, NULL, ?, ?, ?, ?)").run(id, vnNgay(-9), AT, ADMIN, AT, ADMIN);
  for (const as of [ADMIN, SALES, HDV]) assert.equal((await w.call("GET", "/api/ledger/coc/dem", { as })).status, 403);
  const dem = await w.call("GET", "/api/ledger/coc/dem", { as: KT });
  assert.equal(dem.status, 200, dem.text);
  assert.deepEqual([dem.json.canChi, dem.json.duyetQua7Ngay], [2, 1]);
  const ds = await w.call("GET", "/api/ledger/coc", { as: SA });
  assert.equal(ds.status, 200);
  assert.equal(ds.json.donHuyGiuCoc.length, 1);
  assert.equal(ds.json.donHuyGiuCoc[0].conGiu, 500_000);
});

test("ADR-0094 V3: gửi lại CÙNG vé (duyệt, chi) → không ghi lần hai, nhận Idempotent-Replayed", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  const ve = crypto.randomUUID();
  const body = { loai: "hoan", soTien: 100_000, lyDo: "Hoàn một phần" };
  assert.equal((await duyet(w, ADMIN, id, body, ve)).status, 201);
  await w.choNen();
  const lai = await duyet(w, ADMIN, id, body, ve);
  assert.equal(lai.status, 200, lai.text);
  assert.equal(lai.headers.get("idempotent-replayed"), "true");
  assert.equal(w.q("SELECT count(*) AS n FROM bil_deposit_approval WHERE order_id = ?", id)[0]!.n, 1);
  const duyetId = (w.q("SELECT id FROM bil_deposit_approval WHERE order_id = ?", id)[0] as { id: string }).id;
  const ve2 = crypto.randomUUID();
  assert.equal((await chi(w, KT, id, { duyetId, soTien: 100_000 }, ve2)).status, 201);
  await w.choNen();
  assert.equal((await chi(w, KT, id, { duyetId, soTien: 100_000 }, ve2)).headers.get("idempotent-replayed"), "true");
  assert.equal(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND approval_id IS NOT NULL", id)[0]!.n, 1);
});

test("NT-H2 ca đua: hai Quản trị cùng duyệt phần cuối (đọc trước, ghi sau) → đúng một thắng, bên thua 409 (trigger chặn), không vượt trần", async () => {
  const w = setup();
  const id = await donHuyCoTien(w);
  // Chen câu "của Quản trị kia" NGAY TRƯỚC lô của người này: cả hai đã đọc "còn duyệt được 500.000".
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    w.sqlite.prepare("INSERT INTO bil_deposit_approval (id, order_id, kind_code, amount, target_order_id, reason, approved_date, voids_id, created_at, created_by, updated_at, updated_by) VALUES ('d-chen', ?, 'REFUND', 400000, NULL, 'người kia', ?, NULL, ?, ?, ?, ?)").run(id, vnNgay(0), AT, SA, AT, SA);
    return goc(stmts);
  };
  const r = await duyet(w, ADMIN, id, { loai: "hoan", soTien: 400_000, lyDo: "Hoàn phần lớn" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "coc_exceeds_paid");
  assert.equal((await tien(w, KT, id)).coc.daDuyet, 400_000);
});
