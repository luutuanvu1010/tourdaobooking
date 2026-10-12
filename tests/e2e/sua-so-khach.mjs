// Văn phòng sửa số khách sau xác nhận (ADR-0063 D1, chủ duyệt 2026-10-08 — gói A2): route thật `POST /api/orders/:id/money-edit` trên D1 local tạm.
// Bài đơn vị cùng hành vi: src/modules/orders/so-khach-van-phong-route.test.ts (quyền đủ 12 tài khoản, thứ tự từ chối, nhật ký, tin); sổ vàng
// golden/sua-so-khach-van-phong.json. Kịch bản này chứng minh trên wrangler thật: (1) Kế toán bớt khách sau khi khách đã trả → dư chờ hoàn, nhật ký đúng
// khuôn; (2) quyền: Bán hàng không phải người lập, HDV đang phụ trách, tài khoản lai Bán hàng + HDV đang phụ trách → 403; người lập, Quản trị, Toàn quyền
// → 200; (3) lý do chỉ từ danh sách; (4) giảm giá > tạm tính không chặn, có câu cảnh báo, phải thu kẹp 0; hoàn rồi Đã giao, Hoàn thành; chưa trả cũng Đã giao được (ADR-0109); (5) sau Đã giao → 409, và SQL chèn tay bị trigger 0044 chặn.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sqlRows, sql, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const F = await session(ACCOUNTS.field);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);
const P = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });

/** Lập đơn (Bán hàng A) `adult` người lớn ZE1 (100.000/người), giảm `discount`, HDV `fld` phụ trách; khách trả `daTra`; xác nhận. */
async function donXacNhan({ adult, discount = 0, daTra = 0, departDate = vnDate(7) }) {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult }, departDate })], discount }), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.order;
  if (daTra > 0) assert.equal((await call(A, "POST", `/api/orders/${o.id}/payments`, { soTien: daTra, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201, "khách trả trước");
  const xn = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
  assert.equal(xn.status, 200, JSON.stringify(xn.body));
  return { id: o.id, svc: o.services[0].id };
}
const sua = (cookie, don, adult, lyDo = "BOT_NGUOI") => call(cookie, "POST", `/api/orders/${don.id}/money-edit`, { lyDo, services: [{ id: don.svc, pax: P(adult) }] });
const tienDon = async (id) => (await call(ACC, "GET", `/api/orders/${id}/payments`)).body;

// ---- CA 1: Kế toán bớt khách sau khi khách đã trả đủ → tổng giảm, "khách trả dư" chờ hoàn; một dòng điều chỉnh + nhật ký đúng khuôn A3.
{
  const don = await donXacNhan({ adult: 3, daTra: 300000 });
  const xem = await call(ACC, "GET", `/api/orders/${don.id}`);
  assert.deepEqual(xem.body.suaSoKhach, [{ serviceId: don.svc, loaiKhach: ["adult"] }], "Kế toán: máy chủ gửi loại khách sửa được (nút hiện)");
  assert.equal((await call(B, "GET", `/api/orders/${don.id}`)).body.suaSoKhach, null, "Bán hàng không phải người lập: không có nút");
  const r = await sua(ACC, don, 2);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.daGhi, r.body.canhBaoTongAm, r.body.order.total], [true, null, 200000]);
  const p = await tienDon(don.id);
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [200000, 300000, 0, 100000], "dư chờ hoàn = 300.000 − 200.000");
  const dc = await sqlRows(`SELECT seq, subtotal_before, subtotal_after FROM order_money_adjustment WHERE order_id = '${don.id}'`);
  assert.deepEqual(dc, [{ seq: 1, subtotal_before: 300000, subtotal_after: 200000 }]);
  const nk = await sqlRows(`SELECT action, detail FROM audit_log WHERE order_id = '${don.id}' AND action LIKE 'order_money_adjusted%'`);
  assert.deepEqual(nk, [{ action: "order_money_adjusted", detail: "số khách: Dịch vụ thử: người lớn 3 → 2 · lý do: Khách bớt người" }]);
  // Gửi lại y nguyên → không ghi gì.
  const lai = await sua(ACC, don, 2);
  assert.equal(lai.status, 200);
  assert.equal(lai.body.daGhi, false);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = '${don.id}'`))[0].n, 1, "y nguyên → không thêm dòng");
  console.log("✓ CA 1: Kế toán bớt khách sau khi đã thu → dư chờ hoàn 100.000; một dòng điều chỉnh; nhật ký đúng khuôn; y nguyên không ghi");
}

// ---- CA 2: quyền trên route thật. Không truyền `assigned` — đang phụ trách KHÔNG mở cửa văn phòng.
{
  const don = await donXacNhan({ adult: 2 });
  const lai = await gieoTaiKhoanLai("Lai Bán hàng HDV (e2e sửa số khách)", ["SALES", "FIELD"]);
  assert.equal((await call(A, "PUT", `/api/orders/${don.id}/handler`, { staffId: lai.id })).status, 200, "giao tài khoản lai làm người phụ trách");
  for (const [ten, c] of [["Bán hàng không phải người lập", B], ["Hướng dẫn viên", F], ["lai Bán hàng + HDV đang phụ trách", lai.cookie]]) {
    const r = await sua(c, don, 3, "THEM_NGUOI");
    assert.equal(r.status, 403, `${ten}: ${r.status} ${JSON.stringify(r.body)}`);
  }
  let n = 2;
  for (const [ten, c] of [["người lập (Bán hàng)", A], ["Quản trị", ADM], ["Toàn quyền", SUPER]]) {
    const r = await sua(c, don, ++n, "THEM_NGUOI");
    assert.equal(r.status, 200, `${ten}: ${r.status} ${JSON.stringify(r.body)}`);
    assert.equal(r.body.order.total, n * 100000, ten);
  }
  // Lý do chỉ từ danh sách: chữ tự gõ hay mã lạ → 400, không ghi.
  for (const than of [{ reason: "Khách báo thêm", services: [{ id: don.svc, pax: P(9) }] }, { lyDo: "KHACH_OM", services: [{ id: don.svc, pax: P(9) }] }, { lyDo: "KHAC", ghiChu: "0905123456", services: [{ id: don.svc, pax: P(9) }] }]) {
    const r = await call(ACC, "POST", `/api/orders/${don.id}/money-edit`, than);
    assert.equal(r.status, 400, JSON.stringify(than));
  }
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = '${don.id}'`))[0].n, 3, "ba lần 200 = ba dòng; 403 / 400 không ghi");
  console.log("✓ CA 2: Bán hàng khác / HDV / lai đang phụ trách → 403; người lập, Quản trị, Toàn quyền → 200; lý do ngoài danh sách → 400");
}

// ---- CA 3: giảm giá > tạm tính sau khi bớt khách KHÔNG bị chặn; phản hồi có câu cảnh báo; phải thu KẸP 0 (ADR-0109), dư = đúng số khách đã trả.
{
  const don = await donXacNhan({ adult: 2, discount: 150000, daTra: 50000 });
  const r = await sua(ACC, don, 1);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.order.total, r.body.order.giamGiaHieuLuc, r.body.order.discount], [0, 100000, 150000]);
  assert.match(r.body.canhBaoTongAm ?? "", /Giảm giá lớn hơn tiền dịch vụ sau khi bớt khách/);
  const p = await tienDon(don.id);
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 50000, 0, 50000]);
  console.log("✓ CA 3: giảm giá 150.000 > tạm tính 100.000 vẫn lưu, có câu cảnh báo; phải thu 0, dư 50.000 = đúng số khách đã trả (ADR-0109)");
}

// ---- CA 3b (ADR-0109 bài 3): giảm giá > tạm tính sau khi bớt khách, Kế toán hoàn đúng số khách đã trả → "Đã giao" được, phiếu chụp phải thu 0 (CHECK
// due_snapshot ≥ 0 và trigger bil_posting_delivered_paid của D1 thật nhận) → "Hoàn thành" được.
{
  const don = await donXacNhan({ adult: 2, discount: 150000, departDate: vnDate(0) });
  assert.equal((await call(ACC, "POST", `/api/orders/${don.id}/payments`, { soTien: 50000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: `SSKE${Date.now()}${Math.floor(Math.random() * 1e6)}`, soThucChuyen: 50000 })).status, 201, "Kế toán ghi khách đã trả 50.000");
  const r = await sua(ACC, don, 1);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const hoan = await call(ACC, "POST", "/api/ledger/refunds", { orderId: don.id, soTien: 50000, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" });
  assert.ok([200, 201].includes(hoan.status), JSON.stringify(hoan.body));
  const p = await tienDon(don.id);
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 0, 0, 0]);
  const d = await call(F, "POST", `/api/orders/${don.id}/delivered`, {});
  assert.equal(d.status, 200, JSON.stringify(d.body));
  assert.deepEqual((await sqlRows(`SELECT due_snapshot FROM bil_posting WHERE order_id = '${don.id}' AND kind_code = 'DELIVERED'`)).map((x) => x.due_snapshot), [0]);
  const xong = await call(ACC, "POST", `/api/orders/${don.id}/completed`, {});
  assert.equal(xong.status, 200, JSON.stringify(xong.body));
  console.log("✓ CA 3b: hoàn đúng 50.000 khách đã trả → Đã giao 200 (due_snapshot 0) → Hoàn thành 200 (ADR-0109)");
}

// ---- CA 3c (ADR-0109): khách CHƯA trả đồng nào, bớt khách tới giảm giá > tạm tính → khối Thanh toán [0, 0, 0, 0], "Đã giao" được ngay (trước đây 409 overpaid).
{
  const don = await donXacNhan({ adult: 2, discount: 150000, departDate: vnDate(0) });
  assert.equal((await sua(ACC, don, 1)).status, 200);
  const p = await tienDon(don.id);
  assert.deepEqual([p.phaiThu, p.daThu, p.conLai, p.du], [0, 0, 0, 0]);
  const d = await call(F, "POST", `/api/orders/${don.id}/delivered`, {});
  assert.equal(d.status, 200, JSON.stringify(d.body));
  console.log("✓ CA 3c: chưa trả đồng nào → phải thu 0, Đã giao 200 (ADR-0109)");
}

// ---- CA 4: đơn nháp → 409 (sửa trong form); sau Đã giao → 409 order_delivered; SQL chèn tay dòng điều chỉnh bị trigger 0044 chặn (lưới cuối).
{
  const nhap = await call(A, "POST", "/api/orders", orderInput());
  assert.equal(nhap.status, 201);
  const rn = await call(ACC, "POST", `/api/orders/${nhap.body.order.id}/money-edit`, { lyDo: "KHAC", services: [{ id: nhap.body.order.services[0].id, pax: P(2) }] });
  assert.deepEqual([rn.status, rn.body.error?.code ?? rn.body.code], [409, "use_order_form"], JSON.stringify(rn.body));

  const don = await donXacNhan({ adult: 1, departDate: vnDate(0) });
  const d = await call(F, "POST", `/api/orders/${don.id}/delivered`, { lanThu: { soTien: 100000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(d.status, 200, JSON.stringify(d.body));
  const r = await sua(ACC, don, 2, "THEM_NGUOI");
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error?.code ?? r.body.code, "order_delivered");
  await assert.rejects(
    sql(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('e2e-sk-tay', '${don.id}', 1, '[]', '[]', 100000, 200000)`),
    /order_delivered: đơn đã Đã giao – không điều chỉnh số khách\/tiền/,
  );
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM order_money_adjustment WHERE order_id = '${don.id}'`))[0].n, 0);
  console.log("✓ CA 4: đơn nháp → 409; sau Đã giao → 409 order_delivered; SQL chèn tay bị trigger 0044 chặn");
}
