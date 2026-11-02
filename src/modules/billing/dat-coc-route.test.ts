// ADR-0159: «Khách đặt cọc trước» — chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên, SĐT là GIẢ.
// Ghim: nháp không có dòng sổ; ba đường xác nhận mỗi đường đúng một khoản thu + một dòng giữ hộ trên NGƯỜI LẬP, không dấu chờ đối chiếu; thua khoá thì không có gì;
// BOOKER / STAFF theo bản chụp của chính lô; chặn lúc lưu / xác nhận; khoá cột; không hồ sơ; người xét thấy số; đơn huỷ để lập lại không tính hai lần.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, ACC, ADM, PARTNER, SUP, datCo, inDays, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT_HUONG = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này ⇒ BOOKER
const DT_KHONG_HO_SO = "88888888-8888-4888-8888-888888888802";

function dung(tuyChon: Record<string, unknown> = {}) {
  const w = setup(tuyChon);
  seedStaff(w.sqlite, { id: DT_HUONG, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT_KHONG_HO_SO, phone: "0900000022", name: "Đối Tác Không Hồ Sơ", perms: ["PARTNER"] });
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(DT_KHONG_HO_SO);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT_HUONG}`, `pty-${DT_HUONG}`, AT, AT);
  return w;
}
const than = (coc: unknown, extra: Record<string, unknown> = {}, dv: unknown[] = [svc("ZB1", inDays(3))]) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services: dv, ...(coc === undefined ? {} : { declaredDeposit: coc }), ...extra });
async function lapCoc(w: any, as: string, coc: unknown, dv?: unknown[]) {
  const r = await w.call("POST", "/api/orders", { as, body: than(coc, {}, dv) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const cot = (w: any, id: string) => Number(w.q("SELECT declared_deposit AS n FROM orders WHERE id = ?", id)[0].n);
const status = (w: any, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status;
const khoanThu = (w: any, id: string) => w.q("SELECT * FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid", id);
const dongNo = (w: any, id: string) => w.q("SELECT * FROM bil_debt_line WHERE order_id = ? ORDER BY rowid", id);
const dauCho = (w: any, id: string) => w.q("SELECT d.* FROM bil_receipt_recon d JOIN bil_payment_receipt r ON r.id = d.receipt_id WHERE r.order_id = ?", id);
const soDongSo = (w: any, id: string) => khoanThu(w, id).length + dongNo(w, id).length + Number(w.q("SELECT count(*) AS n FROM bil_posting WHERE order_id = ?", id)[0].n);
function dungMotKhoan(w: any, id: string, soTien: number, nguoiLap: string, vai: "STAFF" | "BOOKER") {
  const r = khoanThu(w, id);
  assert.equal(r.length, 1, "đúng một khoản thu");
  assert.equal(r[0].amount, soTien);
  assert.equal(r[0].kind_code, "CUSTOMER_PAYMENT");
  assert.equal(r[0].stage_code, "PREPAID");
  assert.equal(r[0].method_code, "CASH");
  assert.equal(r[0].collector_role_code, vai);
  assert.equal(r[0].collector_party_id, `pty-${nguoiLap}`, "người thu là người lập");
  assert.equal(r[0].created_by, nguoiLap, "người ghi là người lập, dù ai bấm");
  const d = dongNo(w, id);
  assert.equal(d.length, 1, "đúng một dòng giữ hộ");
  assert.equal(d[0].kind_code, "HELD");
  assert.equal(d[0].amount, soTien);
  assert.equal(d[0].debtor_party_id, `pty-${nguoiLap}`);
  assert.equal(dauCho(w, id).length, 0, "không có dấu chờ đối chiếu");
}
async function moYeuCau(w: any, as: string, coc: number) {
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lapCoc(w, as, coc, [svc("ZA1", inDays(3))]);
  const g = await guiDon(w, o.id, as);
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.nhanh, "A");
  return (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json;
}
const conVe = (w: any, as: string, o: any, yeuCauId: string) => w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as, body: { ketQua: "CON_VE", yeuCauId, updatedAt: o.updatedAt } });

// ---- (a) nháp --------------------------------------------------------------------------------------------------------------------------------------------------
test("(a) nháp có lời khai: cột lưu đúng số, KHÔNG có dòng sổ nào; thân cũ không có khoá thì giữ số; đổi số được khi còn nháp", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  assert.equal(cot(w, o.id), 200000);
  assert.equal(o.declaredDeposit, 200000, "DTO đơn nháp mang lời khai");
  assert.equal(soDongSo(w, o.id), 0);
  const sua = (coc: unknown) => w.call("PUT", `/api/orders/${o.id}`, { as: PARTNER, body: than(coc, { expectedUpdatedAt: cot2(w, o.id) }, [{ ...svc("ZB1", inDays(3)), id: w.q("SELECT id FROM order_service WHERE order_id = ?", o.id)[0].id }]) });
  const cu = await sua(undefined);
  assert.equal(cu.status, 200, cu.text);
  assert.equal(cot(w, o.id), 200000, "thân không có khoá: giữ số đang lưu");
  const moi = await sua(150000);
  assert.equal(moi.status, 200, moi.text);
  assert.equal(cot(w, o.id), 150000);
  assert.equal(soDongSo(w, o.id), 0);
});
const cot2 = (w: any, id: string) => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u;

// ---- (b) ba đường --------------------------------------------------------------------------------------------------------------------------------------------
test("(b1) Gửi đơn nhánh B: đúng một khoản thu, một dòng giữ hộ, không dấu chờ; vai STAFF khi người lập không phải bên đặt được hưởng", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.nhanh, "B");
  assert.equal(status(w, o.id), "confirmed");
  dungMotKhoan(w, o.id, 200000, PARTNER, "STAFF");
});

test("(b2) Còn vé do Quản trị bấm: người thu và người ghi vẫn là NGƯỜI LẬP; vai BOOKER theo bản chụp của chính lô; nhật ký ghi người bấm, chỉ số tiền và mã đơn", async () => {
  const w = dung();
  const { order, xacNhan } = await moYeuCau(w, DT_HUONG, 300000);
  const r = await conVe(w, ADM, order, xacNhan.yeuCau.id);
  assert.equal(r.status, 200, r.text);
  dungMotKhoan(w, order.id, 300000, DT_HUONG, "BOOKER");
  const nk = w.q("SELECT staff_id, detail FROM audit_log WHERE order_id = ? AND action = 'payment_recorded'", order.id);
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, ADM, "người bấm ghi ở nhật ký");
  assert.ok(String(nk[0].detail).includes(order.orderCode) && /300\.000/.test(String(nk[0].detail)), String(nk[0].detail));
  assert.doesNotMatch(String(nk[0].detail), /09\d{8}|Khách Thử/, "nhật ký không có tên, SĐT");
});

test("(b3) POST /status của tài khoản đã thôi giữ quyền Đối tác khi đơn còn nháp: đúng một khoản thu trên người lập", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 250000);
  // Thôi quyền Đối tác, nhận quyền Bán hàng: đơn nháp còn số khai, người lập đi đường xác nhận thường.
  w.sqlite.prepare("UPDATE stf_permission SET permission_type_code = 'SALES' WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(PARTNER);
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: PARTNER, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
  dungMotKhoan(w, o.id, 250000, PARTNER, "STAFF");
});

test("(b4) Khai 0 không sinh khoản thu ở cả đường có và không có khoá", async () => {
  const w = dung();
  for (const coc of [0, undefined]) {
    const o = await lapCoc(w, PARTNER, coc);
    const g = await guiDon(w, o.id, PARTNER);
    assert.equal(g.status, 200, g.text);
    assert.equal(soDongSo(w, o.id), 0);
  }
});

test("(b5) «Đã giao» không bị khoản này chặn: khách trả đủ theo lời khai thì đi qua, số dư nằm trên đối tác — cả người lập là bên đặt được hưởng (BOOKER) lẫn không (STAFF)", async () => {
  for (const [nguoi, vai] of [[PARTNER, "STAFF"], [DT_HUONG, "BOOKER"]] as const) {
    const w = dung();
    const o = await lapCoc(w, nguoi, 600000, [svc("ZB1", inDays(0))]);
    assert.equal(o.total, 600000);
    const g = await guiDon(w, o.id, nguoi);
    assert.equal(g.status, 200, g.text);
    dungMotKhoan(w, o.id, 600000, nguoi, vai);
    const don = (await w.call("GET", `/api/orders/${o.id}`, { as: nguoi })).json.order;
    assert.equal(don.declaredDeposit, 0, "sau xác nhận DTO không còn đọc cột");
    // Bên đặt được hưởng chưa có mức ⇒ «Đã giao» bị giữ vì THIẾU MỨC (việc khác): Kế toán ghi mức tay để ca này đi đúng tới chỗ cần xem.
    if (vai === "BOOKER") {
      const m = await w.call("POST", `/api/orders/${o.id}/thuong-mai/${don.services[0].id}`, { as: ACC, body: { lyDo: "Khung thử ghi mức tay", hoaHong: { kieu: "RATE", tyLeBp: 1000 } } });
      assert.equal(m.status, 200, m.text);
    }
    const giao = await w.call("POST", `/api/orders/${o.id}/delivered`, { as: ADM, body: {} });
    assert.equal(giao.status, 200, giao.text);
    assert.ok(w.q("SELECT delivered_at AS d FROM orders WHERE id = ?", o.id)[0].d);
    const no = dongNo(w, o.id).filter((d: any) => d.kind_code === "HELD");
    assert.equal(no.length, 1);
    assert.equal(no[0].debtor_party_id, `pty-${nguoi}`, "đối tác nợ đủ số cọc tới khi nộp");
  }
});

// ---- thua khoá ---------------------------------------------------------------------------------------------------------------------------------------------
test("Thua khoá: người lập vừa sửa đơn giữa lúc qua cổng và lúc ghi ⇒ không có khoản thu, không dòng nợ, đơn vẫn nháp", async () => {
  let w: any;
  let don = "";
  w = dung({ chenTruocLoCoc: async () => { w.sqlite.prepare("UPDATE orders SET updated_at = '2099-01-01T00:00:00.000Z' WHERE id = ?").run(don); } });
  const o = await lapCoc(w, PARTNER, 200000);
  don = o.id;
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 409, g.text);
  assert.equal(status(w, o.id), "draft");
  assert.equal(soDongSo(w, o.id), 0, "thua thì không dòng sổ nào");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'payment_recorded'", o.id)[0].n), 0);
});

test("Thua mốc 6 giờ: chặng vừa bị dời xuống dưới mốc mà mốc cập nhật không đổi ⇒ câu xác nhận không báo lỗi nhưng không có khoản thu", async () => {
  let w: any;
  let don = "";
  w = dung({ chenTruocLoCoc: async () => { w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ?, pickup_time = '00:01' WHERE order_id = ?").run(inDays(0), don); } });
  const ngay = inDays(3);
  const o = await lapCoc(w, PARTNER, 200000, [svc("ZB1", ngay, [leg(ngay, "08:00")])]);
  don = o.id;
  const g = await guiDon(w, o.id, PARTNER);
  assert.ok(g.status >= 400, g.text);
  assert.equal(status(w, o.id), "draft");
  assert.equal(soDongSo(w, o.id), 0);
});

test("Thua đua: người khác xác nhận xong đúng lúc lô này sắp ghi (cùng mốc cũ, đơn đã `confirmed`) ⇒ chỉ MỘT khoản thu — lính gác là dòng nhật ký của CHÍNH lô, không phải trạng thái hay mốc", async () => {
  let w: any;
  let don = "";
  let lan = 0;
  w = dung({ chenTruocLoCoc: async () => {
    if (++lan > 1) return; // lời gọi lồng của người thắng
    const r = await guiDon(w, don, PARTNER);
    assert.equal(r.status, 200, r.text);
  } });
  const o = await lapCoc(w, PARTNER, 200000);
  don = o.id;
  const g = await guiDon(w, o.id, PARTNER);
  assert.ok(g.status >= 400, g.text);
  assert.equal(status(w, o.id), "confirmed");
  assert.equal(khoanThu(w, o.id).length, 1, "chỉ lô thắng có khoản thu");
  assert.equal(dongNo(w, o.id).length, 1);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'payment_recorded'", o.id)[0].n), 1);
});

test("Gửi trùng cùng vé (ADR-0094): một khoản thu", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  const ve = { "x-lan-gui": "11111111-2222-4333-8444-555555555555" };
  const r1 = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {}, headers: ve });
  const r2 = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {}, headers: ve });
  assert.equal(r1.status, 200, r1.text);
  assert.ok(r2.status === 200 || r2.status === 409, r2.text);
  assert.equal(khoanThu(w, o.id).length, 1);
});

// ---- (c) không qua xác nhận ----------------------------------------------------------------------------------------------------------------------------------
test("(c) Hết vé, Huỷ, Rút lại, huỷ nháp: không có dòng sổ nào", async () => {
  for (const kq of ["HET_VE", "HUY"]) {
    const w = dung();
    const { order, xacNhan } = await moYeuCau(w, PARTNER, 100000);
    const r = await w.call("POST", `/api/orders/${order.id}/quyet-dinh`, { as: ADM, body: { ketQua: kq, yeuCauId: xacNhan.yeuCau.id, updatedAt: order.updatedAt, lyDo: "KHACH_DOI_Y" } });
    assert.equal(r.status, 200, r.text);
    assert.equal(soDongSo(w, order.id), 0, kq);
  }
  const w = dung();
  const { order } = await moYeuCau(w, PARTNER, 100000);
  const r = await w.call("POST", `/api/orders/${order.id}/rut-xac-nhan`, { as: PARTNER, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(soDongSo(w, order.id), 0);
});

// ---- (d) chặn ------------------------------------------------------------------------------------------------------------------------------------------------
test("(d1) Lời khai > tổng sau giảm: lập 409, lưu 409, không ghi; 16 giá trị sai dạng 400; trần cột", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: than(600001) });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "declared_deposit_exceeds_total");
  for (const sai of [-1, 1.5, "100", true, {}, []]) {
    const s = await w.call("POST", "/api/orders", { as: PARTNER, body: than(sai) });
    assert.equal(s.status, 400, `${JSON.stringify(sai)} ${s.text}`);
  }
  const tran = await w.call("POST", "/api/orders", { as: PARTNER, body: than(10_000_000_001) });
  assert.equal(tran.status, 400, tran.text);
  const o = await lapCoc(w, PARTNER, 0);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET declared_deposit = 10000000001, total = 20000000000, subtotal = 20000000000, remaining_amount = 20000000000 WHERE id = ?").run(o.id), /CHECK/);
  const sua = await w.call("PUT", `/api/orders/${o.id}`, { as: PARTNER, body: than(600001, { expectedUpdatedAt: o.updatedAt }, [{ ...svc("ZB1", inDays(3)), id: o.services[0].id }]) });
  assert.equal(sua.status, 409, sua.text);
  assert.equal(cot(w, o.id), 0);
});

test("(d2) Người xét: tổng trong CSDL bị hạ dưới lời khai ⇒ trigger chặn câu hạ tổng; Còn vé gặp đơn lệch (đặt thẳng, tắt trigger) ⇒ 409 nói phải trả đơn, không ghi gì, đơn ở lại nháp", async () => {
  const w = dung();
  const { order, xacNhan } = await moYeuCau(w, PARTNER, 400000);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET discount = 800000, total = 200000, remaining_amount = 200000 WHERE id = ?").run(order.id), /declared_deposit_exceeds_total/);
  // Mô phỏng tổng đã thấp hơn lời khai vì một đường khác: gỡ lớp CSDL để chạm đúng cổng máy chủ.
  w.sqlite.exec("DROP TRIGGER orders_declared_deposit_within_total");
  w.sqlite.prepare("UPDATE orders SET discount = 800000, total = 200000, remaining_amount = 200000 WHERE id = ?").run(order.id);
  const r = await conVe(w, ADM, order, xacNhan.yeuCau.id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "declared_deposit_exceeds_total");
  assert.match(r.json.error.message, /trả đơn để người lập sửa/);
  assert.equal(status(w, order.id), "draft");
  assert.equal(soDongSo(w, order.id), 0);
});

test("(d3) Tài khoản chưa gắn hồ sơ khai > 0: 409 nhờ văn phòng, không đơn; khai 0 đi bình thường", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: DT_KHONG_HO_SO, body: than(100000) });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "partner_no_party");
  assert.match(r.json.error.message, /nhờ văn phòng/);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM orders WHERE staff_id = ?", DT_KHONG_HO_SO)[0].n), 0);
  const ok = await w.call("POST", "/api/orders", { as: DT_KHONG_HO_SO, body: than(0) });
  assert.equal(ok.status, 201, ok.text);
});

test("(d4) Người không giữ quyền Đối tác gửi số > 0: 403 ở cả lập và sửa, cột không đổi", async () => {
  const w = dung();
  const r = await w.call("POST", "/api/orders", { as: A, body: than(100000) });
  assert.equal(r.status, 403, r.text);
  const o = (await w.call("POST", "/api/orders", { as: A, body: than(undefined) })).json.order;
  assert.equal(cot(w, o.id), 0);
  const s = await w.call("PUT", `/api/orders/${o.id}`, { as: A, body: than(100000, { expectedUpdatedAt: o.updatedAt }, [{ ...svc("ZB1", inDays(3)), id: o.services[0].id }]) });
  assert.equal(s.status, 403, s.text);
  assert.equal(cot(w, o.id), 0);
});

test("(d5) Khoá cột: chờ duyệt và sau xác nhận không đổi được, cả qua route lẫn thẳng CSDL", async () => {
  const w = dung();
  const { order, xacNhan } = await moYeuCau(w, PARTNER, 100000);
  const sua = await w.call("PUT", `/api/orders/${order.id}`, { as: PARTNER, body: than(50000, { expectedUpdatedAt: order.updatedAt }, [{ ...svc("ZA1", inDays(3)), id: order.services[0].id }]) });
  assert.equal(sua.status, 409, sua.text);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET declared_deposit = 50000 WHERE id = ?").run(order.id), /declared_deposit_locked/);
  const r = await conVe(w, ADM, order, xacNhan.yeuCau.id);
  assert.equal(r.status, 200, r.text);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET declared_deposit = 50000 WHERE id = ?").run(order.id), /declared_deposit_locked/);
  assert.equal(cot(w, order.id), 100000);
});

test("(d6) Gốc lắp ráp không dựng được câu ⇒ 503, không xác nhận; khai 0 không cần hàm tiêm", async () => {
  const w = dung({ khongTiemCoc: true });
  const o = await lapCoc(w, PARTNER, 100000);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 503, g.text);
  assert.equal(status(w, o.id), "draft");
  assert.equal(soDongSo(w, o.id), 0);
  const k = await lapCoc(w, PARTNER, 0);
  assert.equal((await guiDon(w, k.id, PARTNER)).status, 200);
});

// ---- Đ6 --------------------------------------------------------------------------------------------------------------------------------------------------------
test("Người xét thấy số khai trên bản đã cắt; trường khách vẫn cắt; danh sách DTO không thêm gì", async () => {
  const w = dung();
  const { order } = await moYeuCau(w, PARTNER, 123000);
  assert.equal(order.declaredDeposit, 123000);
  assert.equal(order.customerName, "");
  assert.equal(order.customerPhone, "");
  assert.equal(order.paymentNote, null);
  const ds = await w.call("GET", "/api/orders/cho-xac-nhan", { as: ADM });
  assert.equal(ds.status, 200, ds.text);
  assert.ok(!("declaredDeposit" in ds.json.don[0]));
});

// ---- ADR-0089 đ7 ---------------------------------------------------------------------------------------------------------------------------------------------
async function donHuyConTien(w: any, as: string, coc: number, lyDo = "SAI_THONG_TIN") {
  const o = await lapCoc(w, as, coc);
  assert.equal((await guiDon(w, o.id, as)).status, 200);
  const don = (await w.call("GET", `/api/orders/${o.id}`, { as })).json.order;
  const h = await w.call("POST", `/api/orders/${o.id}/status`, { as, body: { status: "cancelled", lyDo, updatedAt: don.updatedAt } });
  assert.equal(h.status, 200, h.text);
  return o;
}

test("ADR-0089 đ7: huỷ để lập lại khi cọc cũ còn giữ: khai lại ở đơn mới bị chặn (409), nên không tính hai lần; khai 0 đi được; đơn mới không có dòng sổ", async () => {
  const w = dung();
  const cu = await donHuyConTien(w, PARTNER, 200000);
  assert.equal(khoanThu(w, cu.id).length, 1);
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: than(200000) });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "declared_deposit_reissue_held");
  assert.ok(r.json.error.message.includes(cu.orderCode), r.json.error.message);
  const moi = await lapCoc(w, PARTNER, 0);
  assert.equal((await guiDon(w, moi.id, PARTNER)).status, 200);
  const no = w.q("SELECT COALESCE(SUM(CASE WHEN debtor_party_id = ? THEN amount ELSE -amount END), 0) AS n FROM bil_debt_line WHERE debtor_party_id = ? OR creditor_party_id = ?", `pty-${PARTNER}`, `pty-${PARTNER}`, `pty-${PARTNER}`)[0].n;
  assert.equal(Number(no), 200000, "đối tác chỉ nợ đúng số đang cầm, không gấp đôi");
});

test("ADR-0089 đ7: đơn nháp đã khai TRƯỚC khi đơn cũ bị huỷ để lập lại ⇒ cổng lúc xác nhận cũng chặn (Gửi đơn và Còn vé)", async () => {
  const w = dung();
  const moi = await lapCoc(w, PARTNER, 150000);
  await donHuyConTien(w, PARTNER, 200000);
  const g = await guiDon(w, moi.id, PARTNER);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "declared_deposit_reissue_held");
  assert.equal(status(w, moi.id), "draft");
  assert.equal(soDongSo(w, moi.id), 0);
});

test("Huỷ vì khách đổi ý: tiền giữ không chặn đơn khác của người đó (không phải ca lập lại)", async () => {
  const w = dung();
  await donHuyConTien(w, PARTNER, 200000, "KHACH_DOI_Y");
  const moi = await lapCoc(w, PARTNER, 100000);
  assert.equal((await guiDon(w, moi.id, PARTNER)).status, 200);
  assert.equal(khoanThu(w, moi.id).length, 1);
});

// ---- Biên nhận -------------------------------------------------------------------------------------------------------------------------------------------------
test("Biên nhận sau xác nhận: số «đã trả» lấy từ sổ, bằng lời khai", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 200);
  const r = await w.call("GET", `/api/orders/${o.id}/receipt`, { as: ACC });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.receipt.daTra, 200000, r.text);
  assert.equal(r.json.receipt.conLai, 400000, r.text);
});

test("Kỳ đã khoá: câu khoản thu rơi vì khoá tháng ⇒ 409 lời thường, đơn ở lại nháp, không 500", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  const thang = inDays(0).slice(0, 7);
  w.sqlite.exec("DROP TRIGGER ky_period_close_adjacent");
  w.sqlite.prepare("INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(thang, AT, SUP, AT, AT);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "period_closed");
  assert.equal(status(w, o.id), "draft");
});
