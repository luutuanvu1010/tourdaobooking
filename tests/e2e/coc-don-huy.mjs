// Đơn huỷ và cọc (ADR-0089; năm lỗi tiền Đợt 1 — migration 0078 lý do huỷ, 0079 cọc đơn huỷ) trên D1 local THẬT (wrangler dev): trigger đọc view công bố của
// orders (`v_ord_order_state`, `v_ord_cancel_state`) và view riêng `v_bil_coc_don`; lô HAI đơn của lệnh chuyển là một giao dịch; RAISE của trigger huỷ cả lô.
// Kế hoạch docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md NT-1, NT-L*, NT-H*, NT-N*, NT-B2; sổ thi công
// docs/superpowers/plans/2026-10-05-nam-loi-tien-thi-cong-nhat-ky.md. Dùng salesA, admin, accountant, superAdmin, field (không đổi tài khoản dùng chung).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const ADM = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const SA = await session(ACCOUNTS.superAdmin);
const F = await session(ACCOUNTS.field);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);
const fldParty = (await sqlRows(`SELECT party_id AS p FROM staff WHERE id = '${fld.id}'`))[0].p;

/** Đơn đã xác nhận 300.000 (3 người lớn × 100.000, đi sau `ngay` ngày) do salesA lập, người phụ trách = HDV field. */
async function donXacNhan(ngay = 20) {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(ngay) })] }), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await call(A, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return r.body.order;
}
const tien = async (cookie, id) => (await call(cookie, "GET", `/api/orders/${id}/payments`)).body;

// ---- 1) Huỷ có lý do; còn lại = 0; lần thu lên đơn huỷ chỉ Kế toán
{
  const o = await donXacNhan();
  assert.equal((await call(ACC, "POST", `/api/orders/${o.id}/payments`, { soTien: 100000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "E2ECD0001", soThucChuyen: 100000 })).status, 201); // Kế toán ghi CK – Công ty thu ⇒ đòi mã (ADR-0092 Đ6)
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 400, "thiếu lý do → 400");
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "THOI_TIET" })).status, 403, "Bán hàng chọn Công ty huỷ → 403");
  const h = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
  assert.equal(h.status, 200, JSON.stringify(h.body));
  const p = await tien(A, o.id);
  assert.deepEqual([p.conLai, p.du, p.coc.daTra, p.coc.conGiu, p.coc.nhom], [0, 0, 100000, 100000, "KHACH_HUY"]);
  assert.equal(p.coc.nguoiGiu, null, "Bán hàng không thấy tên người giữ tiền");
  assert.equal((await call(A, "GET", `/api/orders/${o.id}/receipt`)).body.receipt.conLai, 0, "biên nhận: không còn nợ");
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/payments`, { soTien: 1000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 403, "Bán hàng ghi thu đơn huỷ → 403");
  const row = (await sqlRows(`SELECT group_code, reason_code FROM ord_cancel_reason WHERE order_id = '${o.id}'`))[0];
  assert.deepEqual([row.group_code, row.reason_code], ["KHACH_HUY", "KHACH_DOI_Y"]);
  // Trigger trên D1 thật: huỷ thiếu lý do bằng SQL tay bị chặn.
  const o2 = await donXacNhan();
  await assert.rejects(() => sql(`UPDATE orders SET status = 'cancelled' WHERE id = '${o2.id}'`), /cancel_reason_required/);
  console.log("✓ huỷ bắt buộc lý do (400/403), còn lại 0 ở trang đơn + biên nhận, lần thu lên đơn huỷ chỉ Kế toán, trigger lý do chặn SQL tay (D1 local)");

  // ---- 2) Duyệt (Quản trị) → chi (Kế toán); tách người; trả dư tự do bị chặn; đảo lần thu khi đã duyệt bị chặn
  const d = await call(ADM, "POST", `/api/orders/${o.id}/coc/duyet`, { loai: "hoan", soTien: 60000, lyDo: "Khách xin lại một phần" });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  assert.equal((await call(ADM, "POST", `/api/orders/${o.id}/coc/duyet`, { loai: "hoan", soTien: 40001, lyDo: "Vượt" })).body.error.code, "coc_exceeds_paid");
  assert.equal((await call(ACC, "POST", "/api/ledger/refunds", { orderId: o.id, soTien: 1000, hinhThuc: "CASH", nguoiTra: "cong_ty" })).body.error.code, "coc_needs_approval");
  const thuId = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${o.id}' AND kind_code = 'CUSTOMER_PAYMENT'`))[0].id;
  const dao = await call(ACC, "POST", "/api/ledger/adjustments", { loai: "dao_lan_thu", receiptId: thuId, lyDo: "Ghi nhầm đơn" });
  assert.equal(dao.status, 409, JSON.stringify(dao.body));
  assert.equal(dao.body.error.code, "coc_paid_below_approved");
  const c = await call(ACC, "POST", `/api/orders/${o.id}/coc/chi`, { duyetId: d.body.duyetId, soTien: 60000, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const sau = (await tien(ACC, o.id)).coc;
  assert.deepEqual([sau.daDuyet, sau.daChi, sau.conGiu, sau.choChi], [60000, 60000, 40000, 0]);
  console.log("✓ duyệt (Quản trị) → chi (Kế toán), vượt tiền còn giữ 409, trả dư tự do 409, đảo lần thu khi đã duyệt 409 (trigger trên D1 thật)");
}

// ---- 3) Công ty huỷ + chuyển tiền HDV giữ sang đơn mới — MỘT lô hai đơn trên D1 thật
{
  const a = await donXacNhan();
  assert.equal((await call(F, "POST", `/api/orders/${a.id}/payments`, { soTien: 150000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.equal((await call(ADM, "POST", `/api/orders/${a.id}/status`, { status: "cancelled", lyDo: "THOI_TIET" })).status, 200);
  const b = await donXacNhan(25);
  // Kiểm độc lập vòng 2 CAO-1 — cơ chế THẬT (không cài trigger giả): đơn nhận bị huỷ SAU lúc duyệt chuyển → "Chuyển" 409, không nửa nào được lưu.
  const c = await donXacNhan(26);
  const dc = await call(ADM, "POST", `/api/orders/${a.id}/coc/duyet`, { loai: "chuyen", soTien: 1, lyDo: "Dời lịch thử đơn nhận hỏng", donNhan: c.orderCode });
  assert.equal(dc.status, 201, JSON.stringify(dc.body));
  assert.equal((await call(ADM, "POST", `/api/orders/${c.id}/status`, { status: "cancelled", lyDo: "THOI_TIET" })).status, 200);
  const hong = await call(ACC, "POST", `/api/orders/${a.id}/coc/chuyen`, { duyetId: dc.body.duyetId, soTien: 1, nguoiGiu: { partyId: fldParty } });
  assert.equal(hong.body?.error?.code, "coc_transfer_target_invalid", `${hong.status} ${JSON.stringify(hong.body)}`);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_payment_receipt WHERE approval_id = '${dc.body.duyetId}'`))[0].n, 0, "nửa chi KHÔNG được lưu");
  assert.equal((await call(ADM, "POST", `/api/orders/${a.id}/coc/duyet/${dc.body.duyetId}/huy`, { soTien: 1, lyDo: "Đơn nhận đã huỷ" })).status, 201, "huỷ khoản duyệt hỏng");
  const d = await call(ADM, "POST", `/api/orders/${a.id}/coc/duyet`, { loai: "chuyen", soTien: 150000, lyDo: "Dời lịch do thời tiết", donNhan: b.orderCode });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  const r = await call(ACC, "POST", `/api/orders/${a.id}/coc/chuyen`, { duyetId: d.body.duyetId, soTien: 150000, nguoiGiu: { partyId: fldParty } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual([(await tien(ACC, a.id)).coc.conGiu, (await tien(ACC, b.id)).daThu], [0, 150000]);
  const giu = await sqlRows(`SELECT order_id, balance FROM v_bil_party_balance WHERE party_id = '${fldParty}' AND order_id IN ('${a.id}', '${b.id}')
    AND counterparty_id IN (SELECT party_id FROM v_pty_owner_company) ORDER BY order_id = '${b.id}'`);
  assert.deepEqual(giu.map((x) => x.balance), [0, 150000], "HDV giữ trên đơn huỷ 0, trên đơn mới 150.000");
  // Kiểm độc lập vòng 2 CAO-2: không đảo riêng một nửa của lệnh chuyển đã xong (trigger + máy chủ trên D1 thật).
  const ra = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE approval_id = '${d.body.duyetId}' AND reverses_id IS NULL`))[0].id;
  const dao = await call(ACC, "POST", "/api/ledger/adjustments", { loai: "dao_lan_thu", receiptId: ra, lyDo: "đảo thử nửa chi của lệnh chuyển" });
  assert.equal(dao.body?.error?.code, "coc_transfer_locked", `${dao.status} ${JSON.stringify(dao.body)}`);
  await assert.rejects(sql(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, created_at, updated_at)
    SELECT 'e2e-dao-${ra}', order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, created_at, updated_at FROM bil_payment_receipt WHERE id = '${ra}'`), /coc_transfer_locked/, "SQL tay đảo nửa chi bị trigger chặn");
  console.log("✓ công ty huỷ → duyệt chuyển → chuyển một lô hai đơn; đơn nhận huỷ sau duyệt → 409 không nửa nào lưu; không đảo riêng một nửa (D1 local); tổng HDV giữ không đổi");
}

// ---- 4) Đơn huỷ CŨ (dòng lý do legacy, như câu gieo 0078): đối chiếu → Toàn quyền ghi hoàn ngoài → Quản trị xác nhận
{
  const o = await donXacNhan();
  assert.equal((await call(ACC, "POST", `/api/orders/${o.id}/payments`, { soTien: 80000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  await sql(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by)
    VALUES ('e2e-legacy-${o.id}', '${o.id}', 'LEGACY', 'CHUA_KET_LUAN', NULL, '2026-09-01', NULL, 1, '2026-09-01T00:00:00.000Z', 'he-thong', '2026-09-01T00:00:00.000Z', 'he-thong')`);
  await sql(`UPDATE orders SET status = 'cancelled' WHERE id = '${o.id}'`);
  const dc = await call(ACC, "GET", "/api/ledger/coc/doi-chieu");
  assert.ok(dc.body.don.some((x) => x.orderId === o.id && x.conGiu === 80000), JSON.stringify(dc.body));
  assert.equal((await call(ADM, "POST", `/api/orders/${o.id}/coc/hoan-ngoai`, { soTien: 80000, lyDo: "Đã trả tay khách" })).status, 403);
  assert.equal((await call(SA, "POST", `/api/orders/${o.id}/coc/hoan-ngoai`, { soTien: 80000, lyDo: "Đã trả tay khách" })).status, 201);
  const ghiId = (await tien(SA, o.id)).coc.hoanNgoaiDong[0].id;
  assert.equal((await call(SA, "POST", `/api/orders/${o.id}/coc/hoan-ngoai/${ghiId}/xac-nhan`, { dongY: true })).body.error.code, "coc_same_person");
  assert.equal((await call(ADM, "POST", `/api/orders/${o.id}/coc/hoan-ngoai/${ghiId}/xac-nhan`, { dongY: true })).status, 201);
  assert.equal((await tien(ADM, o.id)).coc.conGiu, 0);
  const dem = await call(ACC, "GET", "/api/ledger/coc/dem");
  assert.equal(dem.status, 200);
  assert.equal((await call(A, "GET", "/api/ledger/coc/dem")).status, 403);
  console.log("✓ đơn huỷ cũ: đối chiếu → Toàn quyền ghi đã hoàn ngoài → tự xác nhận 409 → Quản trị xác nhận → còn giữ 0; ô đếm chỉ Kế toán");
}
console.log("E2E CỌC ĐƠN HUỶ OK");
