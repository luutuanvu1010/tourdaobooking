// Điều chỉnh công nợ CẦN NGƯỜI THỨ HAI DUYỆT (ADR-0115 đợt 1; migration 0094) trên D1 local THẬT (wrangler dev): kiểm lô duyệt `db.batch` (cổng → nhật ký → phiếu → dòng nợ) và trigger
// ở môi trường D1 giả của wrangler — nơi khung thử SQLite của `src/modules/billing/dieu-chinh-duyet-route.test.ts` không thay được.
// Dùng accountant (người gửi) / admin (Quản trị — có ô duyệt) / superAdmin (người duyệt) / field (HDV giữ hộ) / salesA (không có quyền). Không đổi tài khoản dùng chung, không khoá tháng.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SUP = await session(ACCOUNTS.superAdmin);
const F = await session(ACCOUNTS.field);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);
const maLoi = (r) => r.body?.error?.code;
const congTy = (await sqlRows("SELECT party_id FROM v_pty_owner_company"))[0].party_id;
const hdv = (await sqlRows(`SELECT party_id AS p FROM staff WHERE id = '${fld.id}'`))[0].p;

/** Đơn đã xác nhận 300.000 do HDV `fld` phụ trách; HDV giữ hộ `giu` đồng. */
async function donCoGiuHo(giu) {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(0) })] }), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.order.id;
  assert.equal((await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" })).status, 200);
  if (giu > 0) assert.equal((await call(F, "POST", `/api/orders/${id}/payments`, { soTien: giu, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  return id;
}
const soDu = async (orderId) =>
  Number((await sqlRows(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = '${hdv}' AND creditor_party_id = '${congTy}' THEN amount
    WHEN debtor_party_id = '${congTy}' AND creditor_party_id = '${hdv}' THEN -amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = '${orderId}'`))[0].n);
const giam = (orderId, soTien) => call(ACC, "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId, benNo: congTy, benDuocNo: hdv, loaiDong: "SETTLEMENT", soTien, lyDo: "bù trừ phần HDV đã chi hộ khách" });
const tang = (orderId, soTien) => call(ACC, "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId, benNo: hdv, benDuocNo: congTy, loaiDong: "HELD", soTien, lyDo: "khách gửi thêm tiền qua HDV" });

// ---- 1) Gửi yêu cầu giảm nợ ⇒ 201 chờ duyệt, số dư KHÔNG đổi; người tạo tự duyệt ⇒ 409; Bán hàng ⇒ 403; Quản trị duyệt ⇒ 201, số dư đổi đúng, nhật ký có số trước / sau
{
  const id = await donCoGiuHo(100000);
  assert.equal(await soDu(id), 100000);
  let r = await giam(id, 100000);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.choDuyet, true);
  assert.equal(r.headers.get("location"), "/dieu-chinh-cong-no");
  const y = r.body.yeuCauId;
  assert.equal(await soDu(id), 100000, "chờ duyệt: số dư chưa đổi");
  assert.equal((await call(ACC, "POST", `/api/ledger/adjustment-requests/${y}/approve`)).status, 409, "người tạo tự duyệt");
  r = await call(ACC, "POST", `/api/ledger/adjustment-requests/${y}/approve`);
  assert.equal(maLoi(r), "adjreq_same_person");
  assert.equal((await call(A, "POST", `/api/ledger/adjustment-requests/${y}/approve`)).status, 403, "Bán hàng không duyệt");
  assert.equal((await call(F, "GET", "/api/ledger/adjustment-requests")).status, 403, "HDV không xem danh sách");
  const ds = await call(ADM, "GET", "/api/ledger/adjustment-requests");
  assert.equal(ds.status, 200, JSON.stringify(ds.body));
  assert.equal(ds.body.xemDayDu, false, "Quản trị chỉ thấy yêu cầu chờ duyệt");
  assert.ok(ds.body.yeuCau.some((x) => x.id === y && x.coTheDuyet));
  assert.equal((await call(ADM, "GET", "/api/ledger")).status, 403, "ledger.view của Quản trị không đổi");
  r = await call(ADM, "POST", `/api/ledger/adjustment-requests/${y}/approve`);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(await soDu(id), 0);
  const nk = await sqlRows(`SELECT action, detail FROM audit_log WHERE order_id = '${id}' AND action LIKE 'ledger_adjustment%' ORDER BY created_at, rowid`);
  assert.deepEqual(nk.map((x) => x.action), ["ledger_adjustment_requested", "ledger_adjustment_approved", "ledger_adjustment", "ledger_adjustment_affected"]);
  assert.match(nk[2].detail, /trước 100\.000 ₫ → sau 0 ₫/);
  assert.equal((await call(SUP, "POST", `/api/ledger/adjustment-requests/${y}/approve`)).body?.error?.code, "adjreq_decided", "quyết định lần hai");
  console.log("✓ 1) gửi ⇒ 201 chờ duyệt (số dư giữ nguyên); tự duyệt 409; Bán hàng / HDV 403; Quản trị duyệt ⇒ số dư 0, nhật ký trước/sau; duyệt lần hai 409");
}

// ---- 2) Hai yêu cầu giảm cùng khoản nợ: duyệt cái đầu về 0, cái sau bị chặn «không đổi dấu» (kiểm lại lúc duyệt), yêu cầu sau còn chờ
{
  const id = await donCoGiuHo(100000);
  const a = (await giam(id, 100000)).body.yeuCauId;
  const b = (await giam(id, 100000)).body.yeuCauId;
  assert.equal((await call(SUP, "POST", `/api/ledger/adjustment-requests/${a}/approve`)).status, 201);
  const r = await call(ADM, "POST", `/api/ledger/adjustment-requests/${b}/approve`);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(maLoi(r), "adjustment_flips_sign");
  assert.equal(await soDu(id), 0);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_posting WHERE kind_code = 'ADJUSTMENT' AND order_id = '${id}'`))[0].n, 1);
  console.log("✓ 2) hai yêu cầu giảm 100.000 trên nợ 100.000: duyệt cái đầu ⇒ 0; cái sau ⇒ 409 adjustment_flips_sign; chỉ một phiếu");
}

// ---- 3) Trần cộng dồn (lỗ C-2): đơn 300.000, tăng nợ 300.000 chờ duyệt ⇒ tăng nợ thứ hai bị chặn NGAY; rút yêu cầu đầu ⇒ trả hạn mức; từ chối phải có lý do
{
  const id = await donCoGiuHo(0);
  let r = await tang(id, 300000);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const a = r.body.yeuCauId;
  r = await tang(id, 1);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(maLoi(r), "adjustment_exceeds_cap");
  assert.equal((await call(SUP, "POST", `/api/ledger/adjustment-requests/${a}/reject`, {})).status, 400, "từ chối thiếu lý do");
  assert.equal((await call(SUP, "POST", `/api/ledger/adjustment-requests/${a}/withdraw`)).status, 403, "người khác không rút (Toàn quyền có ô gửi nhưng không phải người tạo)");
  assert.equal((await call(ACC, "POST", `/api/ledger/adjustment-requests/${a}/withdraw`)).status, 201);
  r = await tang(id, 300000);
  assert.equal(r.status, 201, "đã rút ⇒ hết chiếm hạn mức");
  assert.equal((await call(SUP, "POST", `/api/ledger/adjustment-requests/${r.body.yeuCauId}/reject`, { lyDo: "số tiền chưa khớp biên nhận" })).status, 201);
  assert.equal(await soDu(id), 0);
  console.log("✓ 3) tăng nợ cộng dồn vượt trần bị chặn ngay lúc tạo; rút trả hạn mức; từ chối cần lý do; số dư không đổi");
}

// ---- 4) CSDL thật: chèn thẳng phiếu ADJUSTMENT không qua duyệt bị trigger chặn (lưới cuối khi mã bị lách)
{
  const id = await donCoGiuHo(0);
  let chan = null;
  try {
    await sql(`INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, created_by, updated_at, updated_by)
      VALUES ('e2e-dc-lach', 'ADJUSTMENT', '${id}', 'gõ tay ngoài hệ thống', '${vnDate(0)}', '2099-01-01T00:00:00.000Z', 'x', '2099-01-01T00:00:00.000Z', 'x')`);
  } catch (e) {
    chan = String(e?.message ?? e);
  }
  assert.ok(chan && /adjustment_needs_approval/.test(chan), `trigger phải chặn phiếu ADJUSTMENT không có yêu cầu: ${chan}`);
  console.log("✓ 4) chèn thẳng phiếu ADJUSTMENT không có yêu cầu đã duyệt ⇒ trigger D1 chặn (adjustment_needs_approval)");
}
