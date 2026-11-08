// ADR-0159: «Khách đặt cọc trước» — chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên, SĐT là GIẢ.
// Ghim: nháp không có dòng sổ; ba đường xác nhận mỗi đường đúng một khoản thu + một dòng giữ hộ trên NGƯỜI LẬP, không dấu chờ đối chiếu; thua khoá thì không có gì;
// BOOKER / STAFF theo bản chụp của chính lô; chặn lúc lưu / xác nhận; khoá cột; không hồ sơ; người xét thấy số; đơn huỷ để lập lại không tính hai lần.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";
import { A, ACC, ADM, PARTNER, SUP, datCo, inDays, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT_HUONG = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này ⇒ BOOKER
const DT_KHONG_HO_SO = "88888888-8888-4888-8888-888888888802";
// Đối tác kiểu cũ (hồ sơ không vai trò đối tác — ADR-0185): nháp không bên đặt ⇒ vai STAFF. Gửi đơn của nó bị cổng chặn nên ca STAFF đi đường «đã thôi quyền Đối tác».
const DT_CU = "88888888-8888-4888-8888-888888888803";

function dung(tuyChon: Record<string, unknown> = {}) {
  const w = setup(tuyChon);
  seedStaff(w.sqlite, { id: DT_HUONG, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT_KHONG_HO_SO, phone: "0900000022", name: "Đối Tác Không Hồ Sơ", perms: ["PARTNER"] });
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(DT_KHONG_HO_SO);
  seedStaff(w.sqlite, { id: DT_CU, phone: "0900000023", name: "Đối Tác Kiểu Cũ", perms: ["PARTNER"], kieuCu: true });
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
/** Thôi quyền Đối tác, nhận quyền Bán hàng: đơn nháp còn số khai, người lập đi đường xác nhận thường. */
const thoiDoiTac = (w: any, id: string) => w.sqlite.prepare("UPDATE stf_permission SET permission_type_code = 'SALES' WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(id);
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
test("(b1) Gửi đơn nhánh B: đúng một khoản thu, một dòng giữ hộ, không dấu chờ; vai BOOKER — Đối tác gửi được đơn thì là bên đặt được hưởng (ADR-0185; vai STAFF ở b3, b5)", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  const g = await guiDon(w, o.id, PARTNER);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.nhanh, "B");
  assert.equal(status(w, o.id), "confirmed");
  dungMotKhoan(w, o.id, 200000, PARTNER, "BOOKER");
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

test("(b3) POST /status của tài khoản đã thôi giữ quyền Đối tác khi đơn còn nháp: đúng một khoản thu trên người lập; vai STAFF (nháp không bên đặt)", async () => {
  const w = dung();
  const o = await lapCoc(w, DT_CU, 250000);
  thoiDoiTac(w, DT_CU);
  const r = await w.call("POST", `/api/orders/${o.id}/status`, { as: DT_CU, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
  dungMotKhoan(w, o.id, 250000, DT_CU, "STAFF");
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
  for (const [nguoi, vai] of [[DT_CU, "STAFF"], [DT_HUONG, "BOOKER"]] as const) {
    const w = dung();
    const o = await lapCoc(w, nguoi, 600000, [svc("ZB1", inDays(0))]);
    assert.equal(o.total, 600000);
    // Ca STAFF đi đường của b3 (Đối tác chưa có vai trò không Gửi đơn được — ADR-0185); xacNhanDon chọn Gửi đơn hay /status theo quyền đang mở.
    if (vai === "STAFF") thoiDoiTac(w, nguoi);
    const g = await w.xacNhanDon(o.id, nguoi);
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
  // Người lập là bên đặt được hưởng (ADR-0185) ⇒ trần giảm giá = hoa hồng của đơn: mức 15% (150.000 ₫) để khoản giảm 100.000 ₫ qua được trần, chỉ còn lời khai vượt tổng.
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { tuNgay: "2026-01-01", doiTuong: { loai: "DOI_TAC", partyId: `pty-${PARTNER}` }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1500 } });
  assert.equal(muc.status, 201, muc.text);
  const { order, xacNhan } = await moYeuCau(w, PARTNER, 950000);
  assert.throws(() => w.sqlite.prepare("UPDATE orders SET discount = 100000, total = 900000, remaining_amount = 900000 WHERE id = ?").run(order.id), /declared_deposit_exceeds_total/);
  // Mô phỏng tổng đã thấp hơn lời khai vì một đường khác: gỡ lớp CSDL để chạm đúng cổng máy chủ.
  w.sqlite.exec("DROP TRIGGER orders_declared_deposit_within_total");
  w.sqlite.prepare("UPDATE orders SET discount = 100000, total = 900000, remaining_amount = 900000 WHERE id = ?").run(order.id);
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

test("ADR-0089 đ7: cọc CHUYỂN sang: đơn mới đã có khoản khai (đơn cũ huỷ SAU khi đơn mới xác nhận) ⇒ duyệt chuyển và lệnh chuyển đều 409, nên không tính hai lần; đơn không có khoản khai vẫn nhận được", async () => {
  const w = dung();
  const cu = await lapCoc(w, PARTNER, 200000);
  assert.equal((await guiDon(w, cu.id, PARTNER)).status, 200);
  const moi = await lapCoc(w, PARTNER, 200000);
  assert.equal((await guiDon(w, moi.id, PARTNER)).status, 200, "đơn cũ chưa huỷ nên chưa bị cổng lập lại chặn");
  const trong = await lapCoc(w, PARTNER, 0);
  assert.equal((await guiDon(w, trong.id, PARTNER)).status, 200);
  const h = await w.call("POST", `/api/orders/${cu.id}/status`, { as: PARTNER, body: { status: "cancelled", lyDo: "SAI_THONG_TIN" } });
  assert.equal(h.status, 200, h.text);
  const duyet = (donNhan: string) => w.call("POST", `/api/orders/${cu.id}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien: 200000, lyDo: "Lập lại đơn cho khách", donNhan } });
  const chan = await duyet(moi.orderCode);
  assert.equal(chan.status, 409, chan.text);
  assert.equal(chan.json.error.code, "coc_target_has_declared_deposit");
  assert.equal(khoanThu(w, moi.id).length, 1);
  const duoc = await duyet(trong.orderCode);
  assert.ok(duoc.status === 200 || duoc.status === 201, duoc.text);
  // Lớp hai: đã duyệt rồi đơn nhận mới có khoản khai (gieo thẳng cùng dấu) ⇒ lệnh chuyển cũng dừng, không ghi nửa nào.
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by)
    SELECT 'gieo-khai', ?, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, NULL, note, created_at, created_by, updated_at, updated_by FROM bil_payment_receipt WHERE order_id = ?`).run(trong.id, moi.id);
  const chuyen = await w.call("POST", `/api/orders/${cu.id}/coc/chuyen`, { as: ACC, body: { duyetId: duoc.json.duyetId, soTien: 200000, ngayPhatSinh: inDays(0), nguoiGiu: { partyId: `pty-${PARTNER}` } } });
  assert.equal(chuyen.status, 409, chuyen.text);
  assert.equal(chuyen.json.error.code, "coc_target_has_declared_deposit");
  assert.equal(khoanThu(w, trong.id).length, 1, "lệnh chuyển không ghi thêm");
  const noMoi = dongNo(w, moi.id).filter((d: any) => d.kind_code === "HELD");
  assert.equal(noMoi.length, 1, "đơn có khoản khai chỉ có đúng một dòng giữ hộ");
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

// ---- Bất biến R-BIL-DC* -----------------------------------------------------------------------------------------------------------------------------------------
const viPham = (w: any, ma: string) => { const c = (CHECKS as any[]).find((x) => x.code === ma); return demViPham(c, w.q(c.sql.replace(/\s+/g, " ").trim()).map((r: any) => ({ ...r }))); };
test("Bất biến R-BIL-DC1…DC4: dữ liệu khoẻ 0; mỗi lỗi dựng thẳng (gỡ trigger) thì bắt được", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 200000);
  const n = await lapCoc(w, PARTNER, 100000);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 200);
  for (const ma of ["R-BIL-DC1", "R-BIL-DC2", "R-BIL-DC3", "R-BIL-DC4"]) assert.equal(viPham(w, ma), 0, ma);
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by)
    SELECT 'sai', ?, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, NULL, note, created_at, created_by, updated_at, updated_by FROM bil_payment_receipt WHERE order_id = ?`).run(n.id, o.id);
  assert.equal(viPham(w, "R-BIL-DC1"), 1);
  w.sqlite.exec("DROP TRIGGER orders_declared_deposit_locked");
  w.sqlite.prepare("UPDATE orders SET declared_deposit = 1000 WHERE id = ?").run(o.id);
  assert.equal(viPham(w, "R-BIL-DC2"), 1);
  w.sqlite.exec("DROP TRIGGER orders_declared_deposit_within_total");
  w.sqlite.prepare("UPDATE orders SET declared_deposit = 99999999 WHERE id = ?").run(n.id);
  assert.equal(viPham(w, "R-BIL-DC4"), 1);
  const r = w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ?", o.id)[0].id;
  for (const t of w.q("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'bil_receipt_recon'")) w.sqlite.exec(`DROP TRIGGER ${t.name}`);
  w.sqlite.prepare("INSERT INTO bil_receipt_recon (id, receipt_id, kind_code, occurred_date, created_at, created_by, updated_at, updated_by) VALUES ('d', ?, 'DECLARED', '2026-11-02', ?, ?, ?, ?)").run(r, AT, ACC, AT, ACC);
  assert.equal(viPham(w, "R-BIL-DC3"), 1);
});

// ---- Dấu nhận khoản khai là chữ ghi chú nên phải là chữ người dùng KHÔNG gõ được ------------------------------------------------------------------------------
test("Khoản thu tay không được dùng đúng ghi chú dành riêng của khoản khai; ghi chú có thêm chữ khác vẫn được; chuyển cọc không bị chặn nhầm", async () => {
  const w = dung();
  const o = await lapCoc(w, PARTNER, 0);
  assert.equal((await guiDon(w, o.id, PARTNER)).status, 200);
  const thu = (ghiChu: string, soTien = 10_000) => w.call("POST", `/api/orders/${o.id}/payments`, { as: PARTNER, body: { soTien, hinhThuc: "CASH", nguoiThu: "toi", ghiChu } });
  for (const g of ["Khách đặt cọc trước", "  Khách đặt cọc trước  "]) {
    const r = await thu(g);
    assert.equal(r.status, 400, r.text);
    assert.match(r.json.error.message, /dành riêng/);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", o.id)[0].n, 0);
  const duoc = await thu("Khách đặt cọc trước bằng tiền mặt");
  assert.equal(duoc.status, 201, duoc.text);
  assert.equal(viPham(w, "R-BIL-DC3"), 0);
});
test("Dấu khoản khai chỉ áp cho khoản khách trả: phiếu trả lại khách trùng chữ không làm đơn thành «có khoản khai» (ghi chú phiếu trả lại là chữ tự do)", () => {
  const sql = readFileSync(new URL("./coc-repo.ts", import.meta.url), "utf8");
  assert.match(sql, /r\.kind_code = 'CUSTOMER_PAYMENT' AND r\.note = \?2/);
  for (const ma of ["R-BIL-DC1", "R-BIL-DC2", "R-BIL-DC3"]) assert.match((CHECKS as any[]).find((c) => c.code === ma).sql, /kind_code = 'CUSTOMER_PAYMENT'/, ma);
});

// ---- Vòng sửa sau kiểm độc lập (ADR-0159 Đ2) ------------------------------------------------------------------------------------------------------------------
test("I-1: người xét bấm Còn vé mà người lập đang bị chặn khai lại: câu nói việc họ làm được, không bảo «để trống ô», không lộ đơn huỷ; người lập giữ câu cũ", async () => {
  const w = dung();
  const xem = await moYeuCau(w, PARTNER, 100000);
  const cu = await donHuyConTien(w, PARTNER, 200000);
  const r = await w.call("POST", `/api/orders/${xem.order.id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "declared_deposit_reissue_held");
  const cau = r.json.error.message as string;
  assert.doesNotMatch(cau, /để trống/);
  for (const chu of [/Hết vé/, /Rút lại/, /Kế toán/]) assert.match(cau, chu);
  assert.ok(!cau.includes(cu.orderCode), "người xét không cần biết đơn khác của đối tác");
  assert.ok(!cau.includes("200.000"), "không lộ số tiền đơn khác");
  assert.equal(status(w, xem.order.id), "draft");
  const nguoiLap = await w.call("POST", "/api/orders", { as: PARTNER, body: than(1000) });
  assert.equal(nguoiLap.status, 409, nguoiLap.text);
  assert.match(nguoiLap.json.error.message, /để trống/);
  assert.ok(nguoiLap.json.error.message.includes(cu.orderCode));
});

// ADR-0159 Đ2 mục 2: số khai chưa nộp về công ty không tính là thu đủ để mở vé. Tổng đơn của khung thử 600.000 ₫.
const veDon = async (w: any, id: string) => { const r = await w.call("GET", `/api/ve/don/${id}`, { as: ADM }); assert.equal(r.status, 200, r.text); return r.json; };
const nop = (w: any, id: string, soTien: number, ben: string = PARTNER) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: `pty-${ben}`, phanBo: [{ orderId: id, soTien }] } });
const moDon = async (w: any, as: string, coc: number, dv?: unknown[]) => { const o = await lapCoc(w, as, coc, dv); assert.equal((await guiDon(w, o.id, as)).status, 200); return o; };

test("I-4: khai đủ chưa nộp thì khoá và báo chờ đối tác nộp; nộp một phần vẫn khoá; nộp đủ thì mở; «đã thu» hiển thị không đổi", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 600000);
  let v = await veDon(w, o.id);
  assert.equal(v.thuDu, false, "khai đủ chưa nộp: khoá");
  assert.equal(v.choDoiTacNop, true);
  assert.equal((await w.call("GET", `/api/orders/${o.id}/payments`, { as: ACC })).json.daThu, 600000, "số đã thu hiển thị giữ nguyên");
  const chan = await w.call("POST", "/api/ve/duong-dan", { as: ADM, body: { orderId: o.id } });
  assert.equal(chan.status, 403, chan.text);
  assert.equal(chan.json.error.code, "chua_thu_du");
  assert.match(chan.json.error.message, /nộp tiền về công ty/);
  assert.equal((await nop(w, o.id, 200000)).status, 201);
  v = await veDon(w, o.id);
  assert.equal(v.thuDu, false, "nộp một phần: vẫn khoá");
  assert.equal(v.choDoiTacNop, true);
  assert.equal((await nop(w, o.id, 400000)).status, 201);
  v = await veDon(w, o.id);
  assert.equal(v.thuDu, true, "nộp đủ: mở");
  assert.equal(v.choDoiTacNop, false);
});

// Đổi CÓ CHỦ Ý (ADR-0170 Đ2, mở rộng ADR-0159 Đ2 mục 2): bản cũ nói «Tôi thu» đủ tiền thì vé mở ngay. Nay đơn do người giữ quyền Đối tác lập chỉ mở khi tiền ĐÃ VỀ công ty,
// nên «Tôi thu» của chính họ khoá tới khi nộp (đơn do nhân viên văn phòng lập vẫn mở ngay: doi-tac-mo-ve.test.ts).
test("I-4 (đổi theo ADR-0170): «Tôi thu» đủ tiền của đối tác khoá tới khi nộp về công ty", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 0);
  const t = await w.call("POST", `/api/orders/${o.id}/payments`, { as: PARTNER, body: { soTien: 600000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(t.status, 201, t.text);
  let v = await veDon(w, o.id);
  assert.equal(v.thuDu, false);
  assert.equal(v.choDoiTacNop, true);
  assert.equal((await nop(w, o.id, 600000)).status, 201);
  v = await veDon(w, o.id);
  assert.equal(v.thuDu, true);
  assert.equal(v.choDoiTacNop, false);
});

test("I-4: khai một phần cộng khoản văn phòng thu: khoá tới khi nộp phần khai; thiếu tiền thật thì câu vẫn là chưa thu đủ", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 200000);
  let v = await veDon(w, o.id);
  assert.equal(v.thuDu, false);
  assert.equal(v.choDoiTacNop, false, "khách còn thiếu tiền thật: chưa phải ca chờ nộp");
  const t = await w.call("POST", `/api/orders/${o.id}/payments`, { as: ACC, body: { soTien: 400000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(t.status, 201, t.text);
  v = await veDon(w, o.id);
  assert.equal(v.thuDu, false, "đủ trên sổ nhưng 200.000 ₫ khai chưa nộp");
  assert.equal(v.choDoiTacNop, true);
  assert.equal((await nop(w, o.id, 200000)).status, 201);
  assert.equal((await veDon(w, o.id)).thuDu, true);
});

test("I-4 Tự quyết: cùng người vừa khai vừa «Tôi thu», sổ không nói tiền nộp thuộc khoản nào ⇒ coi tiền nộp trả khoản kia trước", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 200000);
  const t = await w.call("POST", `/api/orders/${o.id}/payments`, { as: PARTNER, body: { soTien: 400000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(t.status, 201, t.text);
  assert.equal((await veDon(w, o.id)).thuDu, false);
  assert.equal((await nop(w, o.id, 200000)).status, 201);
  assert.equal((await veDon(w, o.id)).thuDu, false, "đang giữ 400.000 ₫ nên 200.000 ₫ khai chưa coi là đã nộp");
  assert.equal((await nop(w, o.id, 400000)).status, 201);
  assert.equal((await veDon(w, o.id)).thuDu, true);
});

test("I-4 Tự quyết: hoa hồng đã cấn trừ lúc Đã giao tính là đã nộp phần đó, không khoá vé vĩnh viễn", async () => {
  const w = dung();
  const o = await moDon(w, DT_HUONG, 600000, [svc("ZB1", inDays(0))]);
  const don = (await w.call("GET", `/api/orders/${o.id}`, { as: ACC })).json.order;
  const m = await w.call("POST", `/api/orders/${o.id}/thuong-mai/${don.services[0].id}`, { as: ACC, body: { lyDo: "Khung thử ghi mức tay", hoaHong: { kieu: "RATE", tyLeBp: 1000 } } });
  assert.equal(m.status, 200, m.text);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/delivered`, { as: ADM, body: {} })).status, 200);
  assert.equal((await veDon(w, o.id)).thuDu, false, "còn nợ 540.000 ₫");
  assert.equal((await nop(w, o.id, 540000, DT_HUONG)).status, 201);
  assert.equal((await veDon(w, o.id)).thuDu, true, "đã hết nợ");
});

// ADR-0159 K7c: «Sửa khoản thu» không được làm mất dấu khoản khai.
const sua = (w: any, id: string, cu: string, moi: Record<string, unknown>) => w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu: [cu], moi: [moi], lyDo: "Kế toán sửa khoản đã ghi", ...(moi.ngayPhatSinh ? { ngayPhatSinh: moi.ngayPhatSinh } : {}) } });
const khoanSong = (w: any, id: string) => w.q("SELECT r.* FROM bil_payment_receipt r WHERE r.order_id = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt y WHERE y.reverses_id = r.id)", id);
async function haiDonRoiSua(w: any, moi: Record<string, unknown>) {
  const cu = await moDon(w, PARTNER, 200000);
  const nhan = await moDon(w, PARTNER, 200000);
  const s = await sua(w, nhan.id, khoanThu(w, nhan.id)[0].id, moi);
  assert.equal(s.status, 201, s.text);
  const don = (await w.call("GET", `/api/orders/${cu.id}`, { as: PARTNER })).json.order;
  assert.equal((await w.call("POST", `/api/orders/${cu.id}/status`, { as: PARTNER, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: don.updatedAt } })).status, 200);
  return { cu, nhan, duyet: () => w.call("POST", `/api/orders/${cu.id}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien: 200000, lyDo: "Lập lại đơn cho khách", donNhan: nhan.orderCode } }) };
}
const NGUOI_CU = { partyId: `pty-${PARTNER}` };

test("I-3 (K7c): sửa khoản khai cùng số, cùng người thu: dấu được chép sang khoản mới, chuyển cọc vẫn 409, không tính hai lần", async () => {
  const w = dung();
  const { nhan, duyet } = await haiDonRoiSua(w, { soTien: 200000, hinhThuc: "CASH", nguoiThu: NGUOI_CU });
  const song = khoanSong(w, nhan.id);
  assert.equal(song.length, 1);
  assert.equal(song[0].note, "Khách đặt cọc trước");
  assert.equal(song[0].collector_party_id, `pty-${PARTNER}`);
  const d = await duyet();
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "coc_target_has_declared_deposit");
});

test("I-3: chỉ sửa ngày hoặc hình thức: dấu giữ nguyên, sổ vẫn đúng một khoản sống; vé vẫn đợi nộp", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 600000);
  const ngay = await sua(w, o.id, khoanThu(w, o.id)[0].id, { soTien: 600000, hinhThuc: "CASH", nguoiThu: NGUOI_CU, ngayPhatSinh: inDays(-1) });
  assert.equal(ngay.status, 201, ngay.text);
  let song = khoanSong(w, o.id);
  assert.equal(song.length, 1);
  assert.equal(song[0].note, "Khách đặt cọc trước");
  assert.equal(song[0].occurred_date, inDays(-1));
  const ht = await sua(w, o.id, song[0].id, { soTien: 600000, hinhThuc: "BANK_TRANSFER", nguoiThu: NGUOI_CU });
  assert.equal(ht.status, 201, ht.text);
  song = khoanSong(w, o.id);
  assert.equal(song.length, 1);
  assert.equal(song[0].note, "Khách đặt cọc trước");
  assert.equal(song[0].method_code, "BANK_TRANSFER");
  assert.equal((await veDon(w, o.id)).thuDu, false);
});

test("I-3 Tự quyết: đổi người thu: khoản mới vẫn mang dấu nên chuyển cọc vẫn 409; tiền đã về Công ty thì vé mở", async () => {
  const w = dung();
  const { nhan, duyet } = await haiDonRoiSua(w, { soTien: 200000, hinhThuc: "CASH", nguoiThu: "cong_ty" });
  const song = khoanSong(w, nhan.id);
  assert.equal(song[0].collector_role_code, "COMPANY");
  assert.equal(song[0].note, "Khách đặt cọc trước");
  const d = await duyet();
  assert.equal(d.status, 409, d.text);
  assert.equal(d.json.error.code, "coc_target_has_declared_deposit");
  const w2 = dung();
  const o = await moDon(w2, PARTNER, 600000);
  assert.equal((await sua(w2, o.id, khoanThu(w2, o.id)[0].id, { soTien: 600000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await veDon(w2, o.id)).thuDu, true);
});

test("I-3: sửa khoản KHÔNG mang dấu thì không tự sinh dấu; gõ tay chữ dấu vẫn 400", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 0);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/payments`, { as: PARTNER, body: { soTien: 100000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const id = khoanThu(w, o.id)[0].id;
  const go = await sua(w, o.id, id, { soTien: 100000, hinhThuc: "CASH", nguoiThu: NGUOI_CU, ghiChu: "Khách đặt cọc trước" });
  assert.equal(go.status, 400, go.text);
  assert.equal((await sua(w, o.id, id, { soTien: 100000, hinhThuc: "CASH", nguoiThu: NGUOI_CU, ghiChu: "Sửa số" })).status, 201);
  assert.equal(khoanSong(w, o.id)[0].note, "Sửa số");
});

// ---- I-5: khoản chuyển có nguồn là khoản khai cũng là số khai chưa nộp (ADR-0159 Đ2 mục 2) --------------------------------------------------------------------
async function huyDon(w: any, id: string) {
  const don = (await w.call("GET", `/api/orders/${id}`, { as: PARTNER })).json.order;
  const h = await w.call("POST", `/api/orders/${id}/status`, { as: PARTNER, body: { status: "cancelled", lyDo: "SAI_THONG_TIN", updatedAt: don.updatedAt } });
  assert.equal(h.status, 200, h.text);
}
async function chuyenCoc(w: any, tu: any, den: any, soTien: number) {
  const d = await w.call("POST", `/api/orders/${tu.id}/coc/duyet`, { as: ADM, body: { loai: "chuyen", soTien, lyDo: "Lập lại đơn cho khách", donNhan: den.orderCode } });
  assert.ok(d.status === 200 || d.status === 201, d.text);
  const c = await w.call("POST", `/api/orders/${tu.id}/coc/chuyen`, { as: ACC, body: { duyetId: d.json.duyetId, soTien, ngayPhatSinh: inDays(0), nguoiGiu: { partyId: `pty-${PARTNER}` } } });
  assert.ok(c.status === 200 || c.status === 201, c.text);
}

test("I-5 (V9): khai đủ, huỷ, chuyển cọc sang đơn mới: vé đơn nhận khoá tới khi đối tác nộp đủ", async () => {
  const w = dung();
  const cu = await moDon(w, PARTNER, 600000);
  await huyDon(w, cu.id);
  const nhan = await moDon(w, PARTNER, 0);
  await chuyenCoc(w, cu, nhan, 600000);
  let v = await veDon(w, nhan.id);
  assert.equal(v.thuDu, false, "tiền vẫn ở tay đối tác: khoá");
  assert.equal(v.choDoiTacNop, true);
  assert.equal((await w.call("GET", `/api/orders/${nhan.id}/payments`, { as: ACC })).json.daThu, 600000, "đã thu hiển thị không đổi");
  assert.equal((await nop(w, nhan.id, 300000)).status, 201);
  assert.equal((await veDon(w, nhan.id)).thuDu, false, "nộp một phần vẫn khoá");
  assert.equal((await nop(w, nhan.id, 300000)).status, 201);
  v = await veDon(w, nhan.id);
  assert.equal(v.thuDu, true, "nộp đủ thì vé đơn nhận mở");
  assert.equal(v.choDoiTacNop, false);
});

test("I-5: chuyển hai lần vẫn truy về khoản khai", async () => {
  const w = dung();
  const a = await moDon(w, PARTNER, 600000);
  await huyDon(w, a.id);
  const b = await moDon(w, PARTNER, 0);
  await chuyenCoc(w, a, b, 600000);
  await huyDon(w, b.id);
  const c = await moDon(w, PARTNER, 0);
  await chuyenCoc(w, b, c, 600000);
  assert.equal((await veDon(w, c.id)).thuDu, false);
  assert.equal((await nop(w, c.id, 600000)).status, 201);
  assert.equal((await veDon(w, c.id)).thuDu, true);
});

// Đổi CÓ CHỦ Ý (ADR-0170 Đ2): tiền «Tôi thu» của đối tác chuyển sang đơn mới vẫn nằm ở tay đối tác (dòng giữ hộ trên họ), nên vé đơn nhận khoá tới khi nộp.
test("I-5 (đổi theo ADR-0170): cọc «Tôi thu» chuyển sang đơn mới vẫn ở tay đối tác, vé khoá tới khi nộp", async () => {
  const w = dung();
  const cu = await moDon(w, PARTNER, 0);
  assert.equal((await w.call("POST", `/api/orders/${cu.id}/payments`, { as: PARTNER, body: { soTien: 600000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  await huyDon(w, cu.id);
  const nhan = await moDon(w, PARTNER, 0);
  await chuyenCoc(w, cu, nhan, 600000);
  let v = await veDon(w, nhan.id);
  assert.equal(v.thuDu, false);
  assert.equal((await nop(w, nhan.id, 600000)).status, 201);
  v = await veDon(w, nhan.id);
  assert.equal(v.thuDu, true);
  assert.equal(v.choDoiTacNop, false);
});

test("I-5 Tự quyết: đơn huỷ vừa có khoản khai vừa có «Tôi thu», sổ không tách phần chuyển: phần chuyển lấy từ khoản khai trước", async () => {
  const w = dung();
  const cu = await moDon(w, PARTNER, 200000);
  assert.equal((await w.call("POST", `/api/orders/${cu.id}/payments`, { as: PARTNER, body: { soTien: 400000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  await huyDon(w, cu.id);
  const nhan = await moDon(w, PARTNER, 0);
  await chuyenCoc(w, cu, nhan, 600000);
  assert.equal((await veDon(w, nhan.id)).thuDu, false);
  assert.equal((await nop(w, nhan.id, 600000)).status, 201);
  assert.equal((await veDon(w, nhan.id)).thuDu, true);
});

// ---- Sửa gộp và ghi chú gõ kèm ---------------------------------------------------------------------------------------------------------------------------------
const suaGop = (w: any, id: string, cu: string[], moi: Record<string, unknown>[]) => w.call("POST", "/api/ledger/receipt-replacements", { as: ACC, body: { orderId: id, cu, moi, lyDo: "Kế toán sửa khoản đã ghi" } });
async function donKhaiVaToiThu(w: any) {
  const o = await moDon(w, PARTNER, 200000);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/payments`, { as: PARTNER, body: { soTien: 400000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  return { o, ids: khoanThu(w, o.id).map((r: any) => r.id) as string[] };
}
const mo = (soTien: number, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "CASH", nguoiThu: NGUOI_CU, ...them });

test("Sửa gộp khoản khai với khoản thường: tách được thì chỉ phần khai mang dấu", async () => {
  const w = dung();
  const { o, ids } = await donKhaiVaToiThu(w);
  const s = await suaGop(w, o.id, ids, [mo(200000), mo(400000, { ghiChu: "Khách đưa thêm" })]);
  assert.equal(s.status, 201, s.text);
  const song = khoanSong(w, o.id);
  assert.equal(song.find((r: any) => r.amount === 200000).note, "Khách đặt cọc trước");
  assert.equal(song.find((r: any) => r.amount === 400000).note, "Khách đưa thêm");
});

test("Sửa gộp Tự quyết: gộp thành một khoản, sổ không tách được: khoản đó mang dấu", async () => {
  const w = dung();
  const { o, ids } = await donKhaiVaToiThu(w);
  assert.equal((await suaGop(w, o.id, ids, [mo(600000)])).status, 201);
  const song = khoanSong(w, o.id);
  assert.equal(song.length, 1);
  assert.equal(song[0].note, "Khách đặt cọc trước");
});

test("Ghi chú Kế toán gõ cho khoản mang dấu: báo rõ 400, không âm thầm bỏ, không ghi gì; gõ đúng chữ dấu thì không mất gì nên được", async () => {
  const w = dung();
  const o = await moDon(w, PARTNER, 200000);
  const id = khoanThu(w, o.id)[0].id;
  const r = await suaGop(w, o.id, [id], [mo(200000, { ghiChu: "Sửa ngày" })]);
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /lý do sửa/);
  assert.equal(khoanSong(w, o.id)[0].id, id, "khoản cũ còn nguyên");
  assert.equal((await suaGop(w, o.id, [id], [mo(200000, { ghiChu: "Khách đặt cọc trước" })])).status, 201);
  assert.equal(khoanSong(w, o.id)[0].note, "Khách đặt cọc trước");
});
