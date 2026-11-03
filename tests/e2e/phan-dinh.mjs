// Phân định trách nhiệm (ADR-0116; migration 0135) và cảnh báo khoản thu giống nhau (ADR-0092 Đ6a) trên D1 local THẬT (wrangler dev): kiểm lô ghi `db.batch()` và trigger ở môi trường D1 thật mà khung thử SQLite không thay được.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SUP = await session(ACCOUNTS.superAdmin);
const F = await session(ACCOUNTS.field);
const fld = (await call(F, "GET", "/api/auth/me")).body.staff;
const hdv = (await sqlRows(`SELECT party_id AS p FROM staff WHERE id = '${fld.id}'`))[0].p;
const ma = (r) => r.body?.error?.code;
const ok = (r, s = 201) => assert.equal(r.status, s, JSON.stringify(r.body));

/** Đơn đã giao, khách đã trả đủ cho công ty. */
async function donDaGiao() {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(0) })] }), handlerStaffId: fld.id });
  ok(r);
  const id = r.body.order.id;
  ok(await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200);
  const t = (await call(ACC, "GET", `/api/orders/${id}/payments`)).body;
  ok(await call(ACC, "POST", `/api/orders/${id}/payments`, { soTien: t.phaiThu, hinhThuc: "CASH", nguoiThu: "cong_ty" }));
  ok(await call(F, "POST", `/api/orders/${id}/delivered`, {}), 200);
  return { id, phaiThu: t.phaiThu };
}

// Có tiền ra: đề nghị → phân định → ghi một lô, I1 đúng.
{
  const { id, phaiThu } = await donDaGiao();
  const cu = await call(ACC, "POST", "/api/ledger/refunds", { orderId: id, soTien: 1000, hinhThuc: "CASH", nguoiTra: "cong_ty" });
  assert.equal(ma(cu), "refund_after_delivered");
  assert.match(cu.body.error.message, /Phân định trách nhiệm/);
  const q = await call(ACC, "POST", "/api/ledger/phan-dinh", { orderId: id, soTien: 1000, lyDo: "Khách phản ánh HDV quên đón" });
  ok(q);
  assert.equal((await call(A, "POST", `/api/ledger/phan-dinh/${q.body.id}/quyet`, {})).status, 403);
  const r = await call(ADM, "POST", `/api/ledger/phan-dinh/${q.body.id}/quyet`, { truongHop: "T6", benChiuPartyId: hdv, soTien: 1000, coTienRa: true, lyDo: "Đã nghe hai bên trình bày" });
  ok(r);
  assert.equal((await call(ADM, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, { hinhThuc: "CASH" })).status, 403, "Quản trị không ghi sổ");
  ok(await call(ACC, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, { hinhThuc: "CASH", nguoiTra: "cong_ty" }));
  const t = (await call(ACC, "GET", `/api/orders/${id}/payments`)).body;
  assert.deepEqual([t.phaiThu, t.giamTru, t.daThu, t.conLai], [phaiThu - 1000, 1000, phaiThu - 1000, 0]);
  const toi = (await call(F, "GET", "/api/ledger/phan-dinh-cua-toi")).body.khoan;
  assert.ok(toi.some((k) => k.soTien === 1000), "bên chịu thấy khoản của mình");
  const tin = (await call(F, "GET", "/api/thong-bao")).body.tin;
  assert.ok(tin.some((x) => /phân định trách nhiệm/.test(x.cau)), "bên chịu có tin");
}

// Người ghi = người phân định: máy chủ chặn; I1 không lệch.
{
  const { id } = await donDaGiao();
  const q = await call(ACC, "POST", "/api/ledger/phan-dinh", { orderId: id, soTien: 500, lyDo: "Khách phản ánh thiếu dịch vụ" });
  const r = await call(SUP, "POST", `/api/ledger/phan-dinh/${q.body.id}/quyet`, { truongHop: "T10", soTien: 500, coTienRa: true, lyDo: "Bão, hoàn một phần cho khách" });
  ok(r);
  assert.equal(ma(await call(SUP, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, { hinhThuc: "CASH" })), "attribution_same_person");
  ok(await call(ACC, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, { hinhThuc: "CASH" }));
  ok(await call(ACC, "POST", `/api/orders/${id}/completed`, {}), 200);
}

// T4: sổ còn ghi đủ ⇒ từ chối; kèm sửa khoản thu trong cùng lô ⇒ qua, lô Thay chạy thật trên D1.
{
  const { id, phaiThu } = await donDaGiao();
  const q = await call(ACC, "POST", "/api/ledger/phan-dinh", { orderId: id, soTien: 2000, lyDo: "Ghi nhầm, khách chưa trả đủ" });
  const r = await call(ADM, "POST", `/api/ledger/phan-dinh/${q.body.id}/quyet`, { truongHop: "T4", benChiuPartyId: hdv, soTien: 2000, coTienRa: false, lyDo: "Người ghi sổ nhầm số tiền" });
  ok(r);
  assert.equal(ma(await call(ACC, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, {})), "attribution_i1");
  const cu = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${id}' AND kind_code = 'CUSTOMER_PAYMENT'`))[0].id;
  ok(await call(ACC, "POST", `/api/ledger/phan-dinh/${r.body.id}/ghi`, { thay: { cu: [cu], moi: [{ soTien: phaiThu - 2000, hinhThuc: "CASH", nguoiThu: "cong_ty" }], lyDo: "Khách thật sự chỉ trả ngần này" } }));
  const t = (await call(ACC, "GET", `/api/orders/${id}/payments`)).body;
  assert.deepEqual([t.phaiThu, t.daThu], [phaiThu - 2000, phaiThu - 2000]);
}

// Đ6a: khoản thu tiền mặt giống nhau ⇒ cảnh báo, không ghi; lý do ⇒ ghi, có nhật ký.
{
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(0) })] }), handlerStaffId: fld.id });
  const id = r.body.order.id;
  ok(await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200);
  const body = { soTien: 1000, hinhThuc: "CASH", nguoiThu: "cong_ty" };
  ok(await call(ACC, "POST", `/api/orders/${id}/payments`, body));
  const trung = await call(ACC, "POST", `/api/orders/${id}/payments`, body);
  assert.equal(ma(trung), "co_the_trung");
  assert.equal(trung.body.error.canhBao.ma, "lan_thu_tien_mat");
  ok(await call(ACC, "POST", `/api/orders/${id}/payments`, { ...body, boQuaTrung: { ma: "lan_thu_tien_mat", lyDo: "Khách trả hai lần thật" } }));
  const nk = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${id}' AND action = 'ledger_duplicate_overridden'`);
  assert.equal(nk.length, 1);
}
console.log("phan-dinh: OK");
