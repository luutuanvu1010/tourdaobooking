// Sổ tiền lượt 1 (ADR-0024 đ1–5, ADR-0025, ADR-0026): "Đã giao – đã thu đủ", "Hoàn thành", lần thu, sổ công nợ.
// Kế hoạch: docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md; sổ thi công: docs/superpowers/plans/2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md.
//
// CA R1 (spike, Task 6b bước đầu — rủi ro R1): "một câu hỏng (kể cả RAISE của trigger) thì CẢ lô D1 huỷ". Cách vá C1/V1 của kế hoạch dựa hoàn toàn vào
// điều này. Kịch bản TỰ cài một trigger RAISE tạm trên D1 local tạm (không móc thử nghiệm nào trong mã chạy thật) cho câu THỨ BA của lô đổi người phụ
// trách (`PUT /api/orders/:id/handler`: đóng dòng cũ → mở dòng mới → nhật ký), rồi kiểm KHÔNG câu nào được lưu, rồi gỡ trigger.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(await session(ACCOUNTS.field));
const fldB = await me(await session(ACCOUNTS.fieldB));

// ---- CA R1: RAISE ở câu thứ 3 của một db.batch() → cả lô quay lại
{
  const r = await call(A, "POST", "/api/orders", { ...orderInput(), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const orderId = r.body.order.id;
  const truoc = await sqlRows(`SELECT id, party_id, valid_to_at FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY rowid`);
  assert.equal(truoc.length, 1, "đơn có đúng một dòng HANDLE (người được chọn lúc lập)");
  const nhatKyTruoc = (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}'`))[0].n;
  await sql(`CREATE TRIGGER e2e_spike_r1 BEFORE INSERT ON audit_log WHEN NEW.action = 'order_handler_changed' AND NEW.order_id = '${orderId}'
    BEGIN SELECT RAISE(ABORT, 'e2e_spike_r1'); END`);
  try {
    const doi = await call(A, "PUT", `/api/orders/${orderId}/handler`, { staffId: fldB.id });
    assert.equal(doi.status, 500, `lô hỏng ở câu thứ 3 phải là lỗi máy chủ: ${doi.status} ${JSON.stringify(doi.body)}`);
    const sau = await sqlRows(`SELECT id, party_id, valid_to_at FROM dsp_assignment WHERE order_id = '${orderId}' ORDER BY rowid`);
    assert.deepEqual(sau, truoc, "câu 1 (đóng dòng cũ) và câu 2 (mở dòng mới) KHÔNG được lưu khi câu 3 bị trigger RAISE");
    const nhatKySau = (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}'`))[0].n;
    assert.equal(nhatKySau, nhatKyTruoc, "không dòng nhật ký nào");
  } finally {
    await sql("DROP TRIGGER IF EXISTS e2e_spike_r1");
  }
  // Gỡ trigger rồi làm lại đúng lệnh đó → thành công (chứng minh ca trên đỏ vì trigger, không vì lệnh sai).
  const lai = await call(A, "PUT", `/api/orders/${orderId}/handler`, { staffId: fldB.id });
  assert.equal(lai.status, 200, JSON.stringify(lai.body));
  console.log("✓ ca R1: RAISE của trigger ở câu thứ 3 trong db.batch() → cả lô quay lại (D1 local)");
}

// ---- LUỒNG CHÍNH trên D1 local thật (ADR-0025 đ2–7, ADR-0026 đ2–5, đ11): lập đơn + "Công ty thu – CK" do Bán hàng khai → HDV bấm Đã giao kèm lần thu
// phần còn lại → đơn khoá → biên nhận "đã trả đủ" → Hoàn thành bị giữ tới khi Kế toán xác nhận công ty nhận + ghi HDV nộp tiền → Hoàn thành.
{
  const ACC = await session(ACCOUNTS.accountant);
  const ADM = await session(ACCOUNTS.admin);
  const F = await session(ACCOUNTS.field);
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(0) })] }), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.order;
  assert.ok(!("remainingAmount" in o) && !("depositAmount" in o), "đơn không còn trường cọc cũ");
  const tong = o.total;
  assert.equal(tong, 300000);
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/payments`, { soTien: 100000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201, "Bán hàng khai Công ty thu – CK");
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);

  // Bán hàng không có nút Đã giao (ô order.handover = none); Quản trị không Hoàn thành được (order.complete = none).
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/delivered`, {})).status, 403, "Bán hàng không bấm Đã giao");
  assert.equal((await call(ADM, "POST", `/api/orders/${o.id}/completed`)).status, 403, "Quản trị không bấm Hoàn thành");

  // Chưa thu đủ → 409 kèm câu tiếng Việt, không đặt mốc.
  let d = await call(F, "POST", `/api/orders/${o.id}/delivered`, {});
  assert.equal(d.status, 409, JSON.stringify(d.body));
  assert.equal(d.body.error.code, "not_deliverable");
  let p = (await call(F, "GET", `/api/orders/${o.id}/payments`)).body;
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.deliveredAt], [tong, 100000, tong - 100000, null]);
  assert.ok(p.lyDoChuaGiao && /[À-ỹ]/.test(p.lyDoChuaGiao.cau), "lý do chưa giao được bằng tiếng Việt");

  // HDV đang phụ trách bấm Đã giao kèm lần thu phần còn lại (tiền mặt, tự giữ) → một lô.
  d = await call(F, "POST", `/api/orders/${o.id}/delivered`, { lanThu: { soTien: tong - 100000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(d.status, 200, JSON.stringify(d.body));
  p = (await call(F, "GET", `/api/orders/${o.id}/payments`)).body;
  assert.ok(p.deliveredAt, "đã đặt mốc Đã giao");
  assert.deepEqual([p.daThu, p.conLai], [tong, 0]);
  const phieu = await sqlRows(`SELECT kind_code, due_snapshot FROM bil_posting WHERE order_id = '${o.id}' AND kind_code = 'DELIVERED'`);
  assert.deepEqual(phieu.map((x) => [x.kind_code, x.due_snapshot]), [["DELIVERED", tong]], "phiếu Đã giao chụp số phải thu");

  // Đơn khoá: route ghi của orders trả 409 order_delivered; trigger CSDL cũng chặn sửa thẳng.
  const sua = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
  assert.equal(sua.status, 409, JSON.stringify(sua.body));
  assert.equal(sua.body.error.code, "order_delivered");
  await assert.rejects(sql(`UPDATE order_service SET pax_adult = 9 WHERE order_id = '${o.id}'`), /order_delivered/, "trigger 0044 chặn sửa dịch vụ sau Đã giao");

  // Biên nhận: đã trả đủ, còn lại 0, nhãn trạng thái tiếng Việt, không lộ id nội bộ.
  const bn = await call(A, "GET", `/api/orders/${o.id}/receipt`);
  assert.equal(bn.status, 200, JSON.stringify(bn.body));
  assert.deepEqual([bn.body.receipt.daTra, bn.body.receipt.conLai, bn.body.receipt.status.nhan], [tong, 0, "Đã giao – đã thu đủ"]);
  assert.ok(!JSON.stringify(bn.body).includes(o.id), "biên nhận không chứa id đơn");

  // Hoàn thành bị giữ: còn người giữ tiền của công ty.
  let h = await call(ACC, "POST", `/api/orders/${o.id}/completed`);
  assert.equal(h.status, 409, JSON.stringify(h.body));
  const soHdv = await call(F, "GET", "/api/ledger/mine");
  assert.equal(soHdv.status, 200, "HDV xem sổ của mình");
  assert.ok(soHdv.body.dangGiu >= tong - 100000, "HDV đang giữ ít nhất số vừa thu");

  // Kế toán: xác nhận "Công ty đã nhận" khoản CK, rồi ghi HDV nộp tiền mặt về công ty.
  const so = (await call(ACC, "GET", "/api/ledger")).body;
  const cho = so.choXacNhan.find((x) => x.orderId === o.id);
  assert.ok(cho, "khoản Công ty thu – CK nằm trong danh sách chờ xác nhận");
  assert.equal((await call(ACC, "POST", `/api/ledger/company-receipts/${cho.receiptId}/confirm`, {})).status, 200);
  const hdvParty = (await sqlRows(`SELECT collector_party_id AS p FROM bil_payment_receipt WHERE order_id = '${o.id}' AND collector_role_code = 'STAFF'`))[0].p;
  const nop = await call(ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: hdvParty, phanBo: [{ orderId: o.id, soTien: tong - 100000 }] });
  assert.ok([200, 201].includes(nop.status), JSON.stringify(nop.body));

  h = await call(ACC, "POST", `/api/orders/${o.id}/completed`);
  assert.equal(h.status, 200, JSON.stringify(h.body));
  p = (await call(ACC, "GET", `/api/orders/${o.id}/payments`)).body;
  assert.ok(p.completedAt, "đã đặt mốc Hoàn thành");
  const v = (await call(A, "GET", `/api/orders/${o.id}`)).body.order;
  assert.ok(v.deliveredAt && v.completedAt, "chi tiết đơn mang hai mốc");
  // Kiểm độc lập T-5: nhật ký trên D1 thật — mỗi lô ghi đúng MỘT dòng của mình, lô thua (Đã giao 409, Hoàn thành 409) không để lại dòng nào.
  const nk = async (action) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${o.id}' AND action = '${action}'`))[0].n;
  const soLanThu = (await sqlRows(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${o.id}' AND kind_code = 'CUSTOMER_PAYMENT'`))[0].n;
  assert.equal(soLanThu, 2, "hai lần thu: Công ty thu – CK + HDV thu lúc giao");
  assert.equal(await nk("payment_recorded"), soLanThu, "payment_recorded đúng bằng số lần thu");
  assert.equal(await nk("order_delivered"), 1, "order_delivered đúng MỘT dòng (lần bấm thiếu tiền bị 409 không ghi)");
  assert.equal(await nk("order_completed"), 1, "order_completed đúng MỘT dòng (lần bấm còn người giữ tiền bị 409 không ghi)");
  console.log(`✓ luồng chính (D1 local): Công ty thu – CK 100.000 + HDV thu ${(tong - 100000).toLocaleString("vi-VN")} lúc Đã giao → đơn khoá → biên nhận đủ → Hoàn thành sau khi xác nhận + nộp`);
}

// ---- TNV-VP01 / ADR-0092 Đ2, Đ2b (năm lỗi tiền V2.7) trên D1 local thật: một dòng giữ hộ tất toán MỘT lần — hai thứ tự đều bị chặn, sổ người khai không âm;
// SQL gõ tay đi vòng máy chủ cũng bị trigger 0080 chặn.
{
  const ACC = await session(ACCOUNTS.accountant);
  const F = await session(ACCOUNTS.field);
  const hdvParty = (await sqlRows(`SELECT party_id AS p FROM staff WHERE id = '${fld.id}'`))[0].p;
  for (const thuTu of ["nop-truoc", "xac-nhan-truoc"]) {
    const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 1 }, departDate: vnDate(5) })] }), handlerStaffId: fld.id });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const o = r.body.order;
    assert.equal((await call(F, "POST", `/api/orders/${o.id}/payments`, { soTien: 100000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201, "HDV khai Công ty thu – CK");
    const ck = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${o.id}' AND collector_role_code = 'COMPANY'`))[0].id;
    const nop = () => call(ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: hdvParty, phanBo: [{ orderId: o.id, soTien: 100000 }] });
    const xacNhan = () => call(ACC, "POST", `/api/ledger/company-receipts/${ck}/confirm`, {});
    if (thuTu === "nop-truoc") {
      assert.equal((await nop()).status, 201);
      const x = await xacNhan();
      assert.equal(x.status, 409, JSON.stringify(x.body));
      assert.equal(x.body.error.code, "held_already_settled");
    } else {
      assert.equal((await xacNhan()).status, 200);
      const x = await nop();
      assert.equal(x.status, 409, JSON.stringify(x.body));
      assert.equal(x.body.error.code, "settlement_exceeds_held");
    }
    const bal = await sqlRows(`SELECT balance FROM v_bil_party_balance WHERE party_id = '${hdvParty}' AND order_id = '${o.id}' AND counterparty_id IN (SELECT party_id FROM v_pty_owner_company)`);
    assert.equal(bal[0]?.balance ?? 0, 0, `${thuTu}: sổ HDV trên đơn = 0, không âm`);
    // SQL tay đi vòng máy chủ: thêm một dòng nộp nữa → trigger 0080 chặn.
    await assert.rejects(() => sql(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, created_at, updated_at)
      SELECT 'e2e-vp01-${thuTu}', p.id, (SELECT party_id FROM v_pty_owner_company LIMIT 1), '${hdvParty}', 1, 'SETTLEMENT', '${o.id}', '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z'
      FROM bil_posting p WHERE p.order_id = '${o.id}' LIMIT 1`), /settlement_sign_flip/);
  }
  console.log("✓ VP-01 (D1 local): nộp → xác nhận 409; xác nhận → nộp 409; sổ HDV = 0; SQL tay thêm dòng nộp bị trigger chặn");
}
