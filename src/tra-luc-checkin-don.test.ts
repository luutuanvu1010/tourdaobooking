// ADR-0230 Đ2 — hình thức «Trả lúc check-in»: chọn khi lập / lưu nháp (cổng máy chủ), chỉ nhận tiền mặt phía Tour Đảo (cổng billing + trigger 0187 mục 10), không QR, DTO mang cờ
// cho trang đơn và «Việc của tôi»; khách không trả ở đơn đối tác ⇒ công nợ đại lý đủ số (ADR-0182 — không mã mới). Route thật trên khung thử (tests/audit/xac-nhan-khung.mjs).
// Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, H, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN = `pty-${DT}`;
type W = ReturnType<typeof setup>;
type R = { status: number; text: string; json: any };

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  return w;
}
const than = (o: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], ...o });
const lap = (w: W, as: string, o: Record<string, unknown> = {}): Promise<R> => w.call("POST", "/api/orders", { as, body: than(o) });
const ma = (r: R) => r.json?.error?.code;
const dong = (w: W, id: string) => w.q("SELECT enabled FROM ord_checkin_payment WHERE order_id = ? ORDER BY valid_from_at", id).map((r: { enabled: number }) => r.enabled);
const xem = async (w: W, id: string, as = A) => (await w.call("GET", `/api/orders/${id}`, { as })).json.order;
const luu = async (w: W, id: string, o: Record<string, unknown>, as = A): Promise<R> => {
  const d = await xem(w, id, as);
  return w.call("PUT", `/api/orders/${id}`, { as, body: than({ expectedUpdatedAt: d.updatedAt, ...o }) });
};
const thu = (w: W, as: string, id: string, hinhThuc: string, nguoiThu: unknown = "toi", soTien = 100_000): Promise<R> =>
  w.call("POST", `/api/orders/${id}/payments`, { as, body: { soTien, hinhThuc, nguoiThu } });
async function giaoHdv(w: W, id: string) {
  const r = await w.call("PUT", `/api/orders/${id}/handler`, { as: A, body: { staffId: H } });
  assert.equal(r.status, 200, r.text);
}
const datCongTac = async (w: W, congTyThu: boolean) => {
  const r = await w.call("POST", "/api/kenh-thu-doi-tac", { as: SUP, body: { congTyThu } });
  assert.ok(r.status === 200 || r.status === 201, r.text);
};

test("văn phòng lập «Trả lúc check-in» (Thanh toán ngay) ⇒ 201, một dòng bật, DTO mang cờ; chọn kèm Trả sau ⇒ 409, không tạo đơn", async () => {
  const w = dung();
  const r = await lap(w, A, { paymentTerm: "PREPAID", traLucCheckin: true });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.order.traLucCheckin, true);
  assert.equal(r.json.order.paymentTerm, "PREPAID");
  assert.deepEqual(dong(w, r.json.order.id), [1]);
  const thuong = await lap(w, A, {});
  assert.equal(thuong.json.order.traLucCheckin, false);
  assert.deepEqual(dong(w, thuong.json.order.id), [], "không chọn ⇒ không dòng nào");
  const soDon = w.q("SELECT count(*) AS n FROM orders")[0].n;
  const sai = await lap(w, A, { paymentTerm: "CREDIT", bookerPartyId: BEN, traLucCheckin: true });
  assert.deepEqual([sai.status, ma(sai)], [409, "tra_luc_checkin_chi_thanh_toan_ngay"], sai.text);
  assert.equal(w.q("SELECT count(*) AS n FROM orders")[0].n, soDon);
  const kieu = await lap(w, A, { traLucCheckin: "co" });
  assert.equal(kieu.status, 400, kieu.text);
});

test("lưu nháp: đổi ý = dòng mới (không xoá); lưu y nguyên không thêm dòng; thân thiếu khoá giữ lựa chọn đang lưu", async () => {
  const w = dung();
  const id = (await lap(w, A, { traLucCheckin: true })).json.order.id;
  assert.equal((await luu(w, id, { traLucCheckin: true })).status, 200);
  assert.deepEqual(dong(w, id), [1], "y nguyên");
  assert.equal((await luu(w, id, {})).status, 200);
  assert.deepEqual(dong(w, id), [1], "thân cũ thiếu khoá ⇒ giữ");
  const tat = await luu(w, id, { traLucCheckin: false });
  assert.equal(tat.status, 200, tat.text);
  assert.equal(tat.json.order.traLucCheckin, false);
  assert.deepEqual(dong(w, id), [1, 0]);
  assert.equal((await luu(w, id, { traLucCheckin: true })).status, 200);
  assert.deepEqual(dong(w, id), [1, 0, 1]);
});

test("đối tác không hạn mức, công tắc Bật ⇒ được chọn; công tắc Tắt lúc lập ⇒ 409; đối tác có Trả sau dùng được ⇒ bị luật Việc 2 từ chối như Thanh toán ngay", async () => {
  const w = dung();
  const ok = await lap(w, DT, { paymentTerm: "PREPAID", traLucCheckin: true });
  assert.equal(ok.status, 201, ok.text);
  assert.equal(ok.json.order.traLucCheckin, true);
  assert.equal((await xem(w, ok.json.order.id, DT)).traLucCheckin, true, "Đối tác mở lại nháp vẫn thấy lựa chọn (form không gửi nhầm false)");
  await datCongTac(w, false);
  const tat = await lap(w, DT, { paymentTerm: "PREPAID", traLucCheckin: true });
  assert.deepEqual([tat.status, ma(tat)], [409, "tra_luc_checkin_cong_tac_tat"], tat.text);
  // nháp lập lúc Bật, lưu lại lúc Tắt: dấu chụp trên đơn (Bật) quyết ⇒ vẫn lưu được
  assert.equal((await luu(w, ok.json.order.id, { paymentTerm: "PREPAID", traLucCheckin: true }, DT)).status, 200);
  await datCongTac(w, true);
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const coTraSau = await lap(w, DT, { paymentTerm: "PREPAID", traLucCheckin: true });
  assert.deepEqual([coTraSau.status, ma(coTraSau)], [409, "tra_sau_bat_buoc_doi_tac"], coTraSau.text);
});

test("đơn văn phòng «Trả lúc check-in» đã xác nhận: HDV phụ trách ghi chuyển khoản ⇒ 409, tiền mặt ⇒ 201; Công ty chuyển khoản ⇒ 409; không QR; sổ tiền báo chỉ tiền mặt", async () => {
  const w = dung();
  const id = (await lap(w, A, { traLucCheckin: true })).json.order.id;
  assert.equal((await w.xacNhanDon(id, A)).status, 200);
  await giaoHdv(w, id);
  const soKhoan = () => w.q("SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id)[0].n;
  for (const r of [await thu(w, H, id, "BANK_TRANSFER"), await thu(w, ACC, id, "BANK_TRANSFER", "cong_ty"), await thu(w, ACC, id, "OTHER", "cong_ty")]) {
    assert.deepEqual([r.status, ma(r)], [409, "tra_luc_checkin_chi_tien_mat"], r.text);
    assert.equal(r.json.error.message, "Đơn «Trả lúc check-in» chỉ nhận tiền mặt. Không nhận chuyển khoản hay mã QR cho đơn này.");
  }
  assert.equal(soKhoan(), 0, "không khoản nào lọt");
  const tm = await thu(w, H, id, "CASH");
  assert.equal(tm.status, 201, tm.text);
  const qr = await w.call("GET", `/api/orders/${id}/qr-thanh-toan`, { as: ACC });
  assert.deepEqual([qr.status, qr.json], [200, { coQr: false }], qr.text);
  const ct = await w.call("GET", `/api/orders/${id}`, { as: H });
  assert.equal(ct.status, 200, ct.text);
  assert.equal(ct.json.order.traLucCheckin, true);
  const mine = await w.call("GET", "/api/dispatch/mine", { as: H });
  assert.equal(mine.status, 200, mine.text);
  assert.equal(mine.json.assignments.find((a: { orderId: string }) => a.orderId === id).traLucCheckin, true, "«Việc của tôi» mang cờ để nhắc thu");
  // «Khách đã trả đủ» kèm khoản chuyển khoản của HDV ⇒ 409 (cùng cổng)
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: H, body: { lanThu: { soTien: 900_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi" } } });
  assert.deepEqual([g.status, ma(g)], [409, "tra_luc_checkin_chi_tien_mat"], g.text);
});

test("đơn thường (không chọn) giữ như hôm nay: HDV ghi chuyển khoản được", async () => {
  const w = dung();
  const id = (await lap(w, A, {})).json.order.id;
  assert.equal((await w.xacNhanDon(id, A)).status, 200);
  await giaoHdv(w, id);
  const r = await thu(w, H, id, "BANK_TRANSFER");
  assert.equal(r.status, 201, r.text);
});

test("ADR-0230 Đ2 mục 4: đơn đối tác «Trả lúc check-in» khách chưa trả ⇒ công nợ đại lý đủ số (không mã mới)", async () => {
  const w = dung();
  const r = await lap(w, DT, { paymentTerm: "PREPAID", traLucCheckin: true });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.deepEqual([r.json.order.traLucCheckin, dong(w, id)], [true, [1]], "đúng là đơn «Trả lúc check-in»");
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: DT, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "confirmed");
  const p = await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as: DT });
  assert.equal(p.status, 200, p.text);
  assert.deepEqual([p.json.phieu.tong, p.json.phieu.daThu, p.json.phieu.conLai], [600_000, 0, 600_000], "chưa thu ⇒ đối tác nợ Tour Đảo đủ giá đại lý (chưa có mức hoa hồng ⇒ bằng tổng đơn)");
});

test("lưu nháp đổi «Trả sau» → «Trả lúc check-in» (và ngược lại) trong một lần lưu ⇒ 200; xác nhận được, hình thức PREPAID", async () => {
  const w = dung();
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } })).status, 201);
  const id = (await lap(w, A, { paymentTerm: "CREDIT", bookerPartyId: BEN })).json.order.id;
  const sang = await luu(w, id, { paymentTerm: "PREPAID", bookerPartyId: BEN, traLucCheckin: true });
  assert.equal(sang.status, 200, sang.text);
  assert.deepEqual([sang.json.order.paymentTerm, sang.json.order.traLucCheckin], ["PREPAID", true]);
  const ve = await luu(w, id, { paymentTerm: "CREDIT", bookerPartyId: BEN, traLucCheckin: false });
  assert.equal(ve.status, 200, ve.text);
  assert.deepEqual([ve.json.order.paymentTerm, ve.json.order.traLucCheckin], ["CREDIT", false]);
  assert.equal((await luu(w, id, { paymentTerm: "PREPAID", bookerPartyId: BEN, traLucCheckin: true })).status, 200);
  assert.equal((await w.xacNhanDon(id, A)).status, 200);
  assert.deepEqual(dong(w, id), [1, 0, 1]);
  assert.equal(w.q("SELECT payment_term FROM orders WHERE id = ?", id)[0].payment_term, "PREPAID");
});
