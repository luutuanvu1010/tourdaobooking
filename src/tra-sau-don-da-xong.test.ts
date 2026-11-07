// ADR-0181 Đ1: đơn Trả sau đã tới bước «Khách đã trả đủ» mà còn nợ (đối tác đã ghi đủ tiền nhưng chưa nộp về công ty — ADR-0177) vẫn được NHẮC hạn trả và được «Ân hạn».
// Đơn dựng bằng đường thật: đối tác gửi đơn Trả sau, ghi «Tôi thu» đủ, có mức hoa hồng, ngày đi hôm nay, Toàn quyền bấm «Xác nhận khách đã trả đủ». Khung thử thật
// (tests/audit/xac-nhan-khung.mjs). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../tests/audit/harness.mjs";
import { A, ACC, ADM, PARTNER, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const TONG = 600_000; // ZB1: 2 người lớn × 300.000
const HOA_HONG = 100_000; // 50.000 / khách × 2
type W = ReturnType<typeof setup>;

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DT}`, BEN, AT, AT);
  return w;
}
async function chuanBi(w: W): Promise<void> {
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 12, lyDo: "thử" } })).status, 201);
  // Bên đặt mang vai được hưởng nên «Khách đã trả đủ» đòi có mức hoa hồng (bản chụp lúc xác nhận) — đặt TRƯỚC khi xác nhận.
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01" } });
  assert.equal(m.status, 201, m.text);
}
const xongVaDuTien = async (w: W, id: string): Promise<void> => {
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id); // «Khách đã trả đủ» chỉ từ ngày đi
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 200, g.text);
};
/** Đối tác gửi đơn Trả sau, ghi «Tôi thu» đủ (tiền ở tay đối tác), rồi «Khách đã trả đủ» ⇒ đơn đã xong còn nợ (phần đối tác giữ trừ hoa hồng của họ — ADR-0177). */
async function donDaXongConNo(w: W): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], paymentTerm: "CREDIT" } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: DT, body: {} })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: DT, body: { soTien: TONG, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  await xongVaDuTien(w, id);
  return id;
}
/** Văn phòng lập đơn Trả sau cho đối tác, Kế toán ghi Công ty thu đủ, rồi «Khách đã trả đủ» ⇒ đơn đã xong HẾT nợ. */
async function donDaXongHetNo(w: W): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Hai", customerPhone: "0912345679", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: TONG, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  await xongVaDuTien(w, id);
  return id;
}
const noDon = async (w: W): Promise<[string, number][]> =>
  ((await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: ACC })).json.don as { orderId: string; no: number }[]).map((d) => [d.orderId, d.no]);
const moc = (w: W, id: string) => w.q("SELECT credit_due_at AS h, credit_grace_until AS g, delivered_at AS d FROM orders WHERE id = ?", id)[0] as { h: string; g: string; d: string | null };
const congGio = (iso: string, gio: number) => new Date(Date.parse(iso) + gio * 3_600_000).toISOString();
const anHan = (w: W, as: string, id: string, body: unknown) => w.call("POST", `/api/tra-sau/don/${id}/an-han`, { as, body });
const nhacHanTraSau = (db: unknown, bayGio: string): Promise<number> => app.nhacHanTraSau(db, bayGio);
const tinNhac = async (w: W, as: string): Promise<string[]> =>
  ((await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as })).json.tin as { cau: string }[]).map((t) => t.cau).filter((c) => /trả sau/.test(c));

test("ADR-0181 tiêu chí 1: đơn đã tới bước Khách đã trả đủ còn nợ — trước hạn 6 giờ đúng một tin, lúc quá hạn đúng một tin (Kế toán cũng nhận); đơn đã xong hết nợ không có tin", async () => {
  const w = dung();
  await chuanBi(w);
  const id = await donDaXongConNo(w);
  const het = await donDaXongHetNo(w);
  assert.ok(moc(w, id).d && moc(w, het).d, "cả hai đơn đã ở bước Khách đã trả đủ");
  assert.deepEqual(await noDon(w), [[id, TONG - HOA_HONG]], "đơn đã xong còn nợ phần đối tác giữ trừ hoa hồng; đơn kia hết nợ");
  const han = moc(w, id).h;
  assert.ok(moc(w, het).h >= han, "hạn của đơn hết nợ không sớm hơn — nếu bị nhắc thì lượt dưới đây đếm 2");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -7)), 0, "chưa tới mốc 6 giờ");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -5)), 1, "trước hạn 6 giờ: đúng một tin (đơn hết nợ không nhắc)");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, -4)), 0, "không gửi lặp");
  const maDon = w.q("SELECT order_code AS m FROM orders WHERE id = ?", id)[0].m as string;
  assert.deepEqual(await tinNhac(w, DT), [`Đơn trả sau ${maDon} còn nợ, sắp tới hạn trả (còn dưới 6 giờ). Hãy thanh toán cho công ty trước hạn.`]);
  assert.deepEqual(await tinNhac(w, ACC), [], "Kế toán không nhận tin trước hạn");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, 1)), 1, "lúc quá hạn: đúng một tin");
  assert.equal(await nhacHanTraSau(w.env.DB, congGio(han, 30)), 0, "không gửi lặp tin quá hạn");
  assert.equal((await tinNhac(w, DT)).length, 2);
  assert.deepEqual(await tinNhac(w, ACC), [`Đơn trả sau ${maDon} đã quá hạn trả mà còn nợ.`], "Kế toán nhận tin quá hạn");
  assert.deepEqual(await tinNhac(w, PARTNER), [], "đối tác khác không nhận");
  assert.deepEqual(w.q("SELECT order_id FROM bil_credit_reminder").map((r: { order_id: string }) => r.order_id), [id, id], "sổ nhắc chỉ có đơn còn nợ");
});

test("ADR-0181 tiêu chí 2: «Ân hạn» đơn đã tới bước Khách đã trả đủ còn nợ — 200, nhật ký có mốc cũ, mốc mới, lý do; giữ số giờ ân hạn; mọi cột khác giữ nguyên; màn đơn có nút cho Quản trị", async () => {
  const w = dung();
  await chuanBi(w);
  const id = await donDaXongConNo(w);
  const xem = (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.traSau;
  assert.deepEqual(xem, { no: TONG - HOA_HONG, trangThai: "trong_han", coQuyenAnHan: true }, "màn đơn đã xong vẫn gửi cờ «Ân hạn» cho Quản trị");
  assert.equal((await w.call("GET", `/api/orders/${id}`, { as: ACC })).json.traSau.coQuyenAnHan, false, "Kế toán không có nút");
  const cu = moc(w, id);
  const hang = (): Record<string, unknown> => {
    const { credit_due_at, credit_grace_until, credit_due_date, updated_at, ...con } = w.q("SELECT * FROM orders WHERE id = ?", id)[0];
    return con;
  };
  const truoc = hang();
  const r = await anHan(w, ADM, id, { hanMoi: congGio(cu.h, 24), lyDo: "Đối tác hẹn nộp tiền thứ hai" });
  assert.equal(r.status, 200, r.text);
  const moi = moc(w, id);
  assert.deepEqual([moi.h, moi.g], [congGio(cu.h, 24), congGio(cu.g, 24)], "hết ân hạn tính lại theo hạn mới, giữ 12 giờ ân hạn");
  assert.deepEqual(hang(), truoc, "chỉ ba cột hạn trả (và giờ sửa) đổi");
  const nk = w.q("SELECT staff_id, detail, order_id FROM audit_log WHERE action = 'credit_due_extended'");
  assert.equal(nk.length, 1);
  assert.equal(nk[0]!.staff_id, ADM);
  assert.ok(String(nk[0]!.detail).includes(cu.h) && String(nk[0]!.detail).includes(moi.h), "mốc cũ và mốc mới");
  assert.match(String(nk[0]!.detail), /Đối tác hẹn nộp tiền thứ hai/);
  // Rút ngắn vẫn bị chặn (luật ADR-0173 Đ1 mục 3 áp nguyên cho đơn đã xong).
  const ngan = await anHan(w, SUP, id, { hanMoi: congGio(moi.h, -1), lyDo: "nhầm" });
  assert.deepEqual([ngan.status, ngan.json.error.code], [409, "han_moi_khong_sau_han_cu"]);
  for (const as of [ACC, A, DT]) assert.equal((await anHan(w, as, id, { hanMoi: congGio(moi.h, 24), lyDo: "x" })).status, 403, as);
});

test("ADR-0181 tiêu chí 2: «Ân hạn» đơn đã tới bước Khách đã trả đủ hết nợ ⇒ 409 da_het_no, hạn không đổi", async () => {
  const w = dung();
  await chuanBi(w);
  const het = await donDaXongHetNo(w);
  const cu = moc(w, het);
  const r = await anHan(w, ADM, het, { hanMoi: congGio(cu.h, 24), lyDo: "x" });
  assert.deepEqual([r.status, r.json.error.code], [409, "da_het_no"], r.text);
  assert.deepEqual(moc(w, het), cu);
});

test("ADR-0181 tiêu chí 2 (lớp CSDL, khung thử thật): đơn đã tới bước Khách đã trả đủ — đổi cột khác bị chặn; đổi hạn trả kèm một cột khác bị chặn; lùi hạn về trước bị chặn", async () => {
  const w = dung();
  await chuanBi(w);
  const id = await donDaXongConNo(w);
  const cu = moc(w, id);
  const sai = (sql: string, re: RegExp, ...a: unknown[]) => assert.throws(() => w.sqlite.prepare(sql).run(...a), re, sql);
  sai("UPDATE orders SET customer_note = 'x' WHERE id = ?", /order_delivered/, id);
  sai("UPDATE orders SET total = 1 WHERE id = ?", /order_delivered|order_money_frozen/, id);
  sai("UPDATE orders SET credit_due_at = ?, credit_grace_until = ?, customer_note = 'x' WHERE id = ?", /order_delivered/, congGio(cu.h, 48), congGio(cu.g, 48), id);
  sai("UPDATE orders SET credit_due_date = '2099-01-01' WHERE id = ?", /order_delivered/, id);
  sai("UPDATE orders SET credit_due_at = ?, credit_grace_until = ? WHERE id = ?", /credit_due_forward_only/, congGio(cu.h, -1), congGio(cu.g, -1), id);
  assert.deepEqual(moc(w, id), cu, "không câu nào lọt");
  // Đối chứng: đúng ba cột hạn trả, đi về sau, giữ khoảng ân hạn ⇒ CSDL nhận.
  w.sqlite.prepare("UPDATE orders SET credit_due_at = ?, credit_grace_until = ?, updated_at = ? WHERE id = ?").run(congGio(cu.h, 2), congGio(cu.g, 2), new Date().toISOString(), id);
  assert.equal(moc(w, id).h, congGio(cu.h, 2));
});
