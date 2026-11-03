// ADR-0154 Đ1.6 — kế hoạch lượt 2 Task 1.4, các bài (p), (p2), (p3), (p4): người xét duyệt (không phải người lập) mở đơn ĐANG CHỜ của ĐỐI TÁC thì ghi chú của từng dịch vụ đi qua `maskLongDigits`
// (đối tác hay dán số điện thoại khách vào ô ghi chú); đơn do nhân viên Bán hàng lập đang chờ thì giữ nguyên văn (đó là chữ của nhân viên công ty); người lập tự xem đơn của mình luôn nguyên văn.
// «Người lập là đối tác» = người lập HIỆN GIỮ quyền Đối tác (`nguoiLapGiuDoiTac`, câu đã áp số 3; khác R-ORD-17w, dùng «từng giữ» — câu số 4). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, B, H, LAI, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc, vnSau } from "../../../tests/audit/xac-nhan-khung.mjs";

const GHI_CHU = "Gọi 0987654321";
const GHI_CHU_CHE = "Gọi ••••••••••";
const NGAY = () => inDays(3);
const guiDon = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
const guiXN = (w: any, id: string, as: string) => w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as, body: {} });
const chiTiet = (w: any, id: string, as: string) => w.call("GET", `/api/orders/${id}`, { as });

/** Đơn Đối tác có ghi chú dịch vụ chứa số điện thoại, lượt đón chưa giờ → đã Gửi đơn → đang chờ (mang cờ chốt giờ). */
async function donDoiTacCho(w: any) {
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)], { note: GHI_CHU })]);
  const r = await guiDon(w, o.id, PARTNER);
  assert.equal(r.status, 201, r.text);
  return o;
}
/** Đơn Bán hàng có ghi chú dịch vụ chứa số điện thoại, dịch vụ cờ «cần xác nhận» → đã Gửi xác nhận → đang chờ. */
async function donBanHangCho(w: any) {
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), "09:00")], { note: GHI_CHU })]);
  const r = await guiXN(w, o.id, A);
  assert.equal(r.status, 201, r.text);
  return o;
}

test("(p) đơn Đối tác đang chờ: người xét (Kế toán, HDV, Bán hàng khác, Quản trị, Toàn quyền, tài khoản lai) nhận tên, SĐT, email rỗng và ghi chú dịch vụ ĐÃ CHE; sau Còn vé Kế toán có ô liên hệ thấy số trên đơn", async () => {
  const w = setup();
  const o = await donDoiTacCho(w);
  for (const ai of [ACC, H, B, ADM, SUP, LAI]) {
    const r = await chiTiet(w, o.id, ai);
    assert.equal(r.status, 200, `${ai}: ${r.text}`);
    const d = r.json.order;
    assert.equal(d.customerName, "");
    assert.equal(d.customerPhone, "");
    assert.equal(d.customerEmail, null);
    assert.equal(d.services[0].note, GHI_CHU_CHE, `${ai}: ghi chú dịch vụ phải che số`);
    assert.ok(!r.text.includes("0987654321"), `${ai}: lộ số trong ghi chú`);
    assert.ok(!r.text.includes("0912345678"), `${ai}: lộ SĐT khách`);
  }
  // bản lưu trong CSDL KHÔNG đổi: che chỉ ở lớp xem
  assert.equal(w.q("SELECT note FROM order_service WHERE order_id = ?", o.id)[0].note, GHI_CHU);
  // Kế toán điền giờ → Còn vé → đơn đã xác nhận: người có ô liên hệ thấy số khách và ghi chú nguyên văn trên đơn
  const legId = o.services[0].legs[0].id as string;
  const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0].u;
  const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0];
  const qd = await w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: ACC, body: { yeuCauId: y.id, updatedAt: moc, ketQua: "CON_VE", gioDon: [{ legId, pickupTime: "09:00" }] } });
  assert.equal(qd.status, 200, qd.text);
  const sau = await chiTiet(w, o.id, ACC);
  assert.equal(sau.status, 200, sau.text);
  assert.equal(sau.json.order.status, "confirmed");
  assert.equal(sau.json.order.customerPhone, "0912345678");
  assert.equal(sau.json.order.services[0].note, GHI_CHU, "đơn đã xác nhận: không còn là «đơn đang chờ», xem như mọi đơn");
});

test("(p2) đơn Bán hàng đang chờ: người xét thấy ghi chú dịch vụ NGUYÊN VĂN (chữ của nhân viên công ty), vẫn không thấy SĐT, tên, email khách", async () => {
  const w = setup();
  const o = await donBanHangCho(w);
  for (const ai of [ACC, H, B, ADM, SUP]) {
    const r = await chiTiet(w, o.id, ai);
    assert.equal(r.status, 200, `${ai}: ${r.text}`);
    const d = r.json.order;
    assert.equal(d.services[0].note, GHI_CHU, `${ai}: ghi chú của nhân viên giữ nguyên`);
    assert.equal(d.customerName, "");
    assert.equal(d.customerPhone, "");
    assert.equal(d.customerEmail, null);
  }
});

test("(p3) người lập Đối tác xem đơn đang chờ CỦA MÌNH: ghi chú nguyên văn (không che chữ của chính mình)", async () => {
  const w = setup();
  const o = await donDoiTacCho(w);
  const r = await chiTiet(w, o.id, PARTNER);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.services[0].note, GHI_CHU);
});

// HỆ QUẢ CHẤP NHẬN (câu đã áp số 3 của kế hoạch): lớp che hỏi «người lập HIỆN GIỮ quyền Đối tác» (view `v_stf_quyen_mo`, chỉ dòng còn hiệu lực), không thêm cột «người lập là đối tác» vào đơn.
// Người lập đã thôi quyền thì ghi chú đơn chờ của họ không còn bị che. Bài ghim hành vi này để ai đổi sang «từng giữ» (khi có ADR) phải đổi bài có chủ đích. Kiểm định kỳ R-ORD-17w thì dùng «từng giữ» (câu số 4).
test("(p3b) HỆ QUẢ CHẤP NHẬN: người lập đã thôi quyền Đối tác (dòng đã đóng) → ghi chú đơn chờ của họ không còn che; còn quyền → che", async () => {
  const w = setup();
  const o = await donDoiTacCho(w);
  assert.equal((await chiTiet(w, o.id, ACC)).json.order.services[0].note, GHI_CHU_CHE, "còn quyền: che");
  w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = valid_from_at WHERE staff_id = '${PARTNER}' AND permission_type_code = 'PARTNER'`);
  const r = await chiTiet(w, o.id, ACC);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.services[0].note, GHI_CHU, "đã thôi quyền: không còn che (hệ quả đã chấp nhận)");
  assert.equal(r.json.order.customerPhone, "", "nhưng tên / SĐT / email khách vẫn bị cắt cho mọi đơn chờ");
});

test("(p4) phản hồi POST short-notice của người xét trên đơn đang chờ: Đối tác → ghi chú ĐÃ CHE, tên/SĐT rỗng; Bán hàng → ghi chú nguyên văn", async () => {
  const w = setup();
  const g = vnSau(60);
  const doiTac = await lap(w, PARTNER, [svc("ZB1", g.date, [leg(g.date, g.time)], { note: GHI_CHU })]);
  assert.equal((await guiDon(w, doiTac.id, PARTNER)).status, 201);
  const r = await w.call("POST", `/api/orders/${doiTac.id}/legs/${doiTac.services[0].legs[0].id}/short-notice`, { as: B, body: { lyDo: "KHACH_DOAN_GOI_GAP" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.services[0].note, GHI_CHU_CHE);
  assert.equal(r.json.order.customerPhone, "");
  assert.ok(!r.text.includes("0987654321"));
  // đối chứng: đơn Bán hàng đang chờ vì dưới mốc (dịch vụ cờ) → phản hồi giữ ghi chú nguyên văn
  datCo(w, "SERVICE", "ZA1", true);
  const vp = await lap(w, A, [svc("ZA1", g.date, [leg(g.date, g.time)], { note: GHI_CHU })]);
  assert.equal((await guiXN(w, vp.id, A)).status, 201);
  const r2 = await w.call("POST", `/api/orders/${vp.id}/legs/${vp.services[0].legs[0].id}/short-notice`, { as: B, body: { lyDo: "KHACH_DOAN_GOI_GAP" } });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(r2.json.order.services[0].note, GHI_CHU);
  assert.equal(r2.json.order.customerPhone, "");
});
