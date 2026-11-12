// ADR-0182 phần A — Đ1: công nợ đại lý = Σ giá đại lý (thành tiền − hoa hồng, bản chụp lúc xác nhận) − tiền Tour Đảo đã nhận (đã xác nhận). Số nợ Trả sau (hạn mức,
// danh sách nợ) đọc ĐÚNG công thức này; số KHÔNG đổi khi qua «Khách đã trả đủ» (bản cũ đổi giữa chừng — Bối cảnh ADR-0182). Khung thử thật (tests/audit/xac-nhan-khung.mjs).
// Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../tests/audit/harness.mjs";
import { tinhDongDoiTac } from "./shared/hoa-hong-dong.ts";
import { A, ACC, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const TONG = 600_000; // ZB1: 2 người lớn × 300.000
const HOA_HONG = 100_000; // 50.000 / khách × 2
const GIAM = 40_000; // đại lý nhường khách một phần hoa hồng (≤ hoa hồng)
type W = ReturnType<typeof setup>;

function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  return w;
}
async function hanMuc(w: W, coMuc: boolean): Promise<void> {
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 12, lyDo: "thử" } })).status, 201);
  if (!coMuc) return;
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 50_000, tuNgay: "2026-01-01" } });
  assert.equal(m.status, 201, m.text);
}
async function donDaiLy(w: W, giam = 0): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], paymentTerm: "CREDIT", discount: giam } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: DT, body: {} });
  assert.equal(g.status, 200, g.text);
  return id;
}
const toiThu = (w: W, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: DT, body: { soTien, hinhThuc: "CASH", nguoiThu: "toi" } });
const congTyThu = (w: W, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const nop = (w: W, id: string, soTien: number) => w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: BEN, phanBo: [{ orderId: id, soTien }] } });
const noDon = async (w: W, id: string): Promise<number> =>
  ((await w.call("GET", `/api/tra-sau/han-muc/${BEN}/don`, { as: ACC })).json.don as { orderId: string; no: number }[]).find((d) => d.orderId === id)?.no ?? 0;
const dangNo = async (w: W) => ((await w.call("GET", "/api/tra-sau/han-muc", { as: ACC })).json.danhSach as { partyId: string; dangNo: number }[]).find((d) => d.partyId === BEN)?.dangNo;
async function xongVaDuTien(w: W, id: string): Promise<void> {
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id); // «Khách đã trả đủ» chỉ từ ngày đi
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 200, g.text);
}

test("Đ1: nợ = giá đại lý ngay từ lúc xác nhận; giảm giá không đổi nợ; nộp một phần trừ đúng; qua «Khách đã trả đủ» số KHÔNG đổi; nộp đủ thì 0", async () => {
  const w = dung();
  await hanMuc(w, true);
  const id = await donDaiLy(w, GIAM);
  const giaDaiLy = TONG - HOA_HONG; // 500.000 — giảm giá là đại lý nhường hoa hồng của mình, không đổi nợ (Đ1 mục 5)
  assert.equal(await noDon(w, id), giaDaiLy, "vừa xác nhận: nợ = giá đại lý (bản cũ: giá lẻ trừ giảm giá = 560.000)");
  assert.equal(await dangNo(w), giaDaiLy, "hạn mức đã dùng cùng số");
  assert.equal((await toiThu(w, id, TONG - GIAM)).status, 201, "đại lý ghi «Tôi thu» đủ phải thu");
  assert.equal(await noDon(w, id), giaDaiLy, "«Tôi thu» là khoản đại lý tự khai: không tính vào Đã thu (Đ1 mục 6)");
  assert.equal((await nop(w, id, 200_000)).status, 201);
  const truoc = await noDon(w, id);
  assert.equal(truoc, giaDaiLy - 200_000, "nộp qua quyết toán: trừ đúng số nộp");
  await xongVaDuTien(w, id);
  assert.equal(await noDon(w, id), truoc, "qua «Khách đã trả đủ» số nợ không đổi (không trừ hoa hồng hai lần)");
  assert.equal((await nop(w, id, truoc)).status, 201);
  assert.equal(await noDon(w, id), 0, "nộp đủ giá đại lý thì hết nợ");
  assert.equal(await dangNo(w), 0);
});

test("Đ1 mục 3: dòng thiếu mức hoa hồng lúc xác nhận ⇒ tính theo giá bán lẻ", async () => {
  const w = dung();
  await hanMuc(w, false);
  const id = await donDaiLy(w);
  assert.equal(await noDon(w, id), TONG);
});

test("Đ1 mục 6a: khách trả thẳng công ty (Kế toán ghi) tính vào Đã thu; khách trả nhiều hơn giá đại lý thì nợ của đơn không âm trong hạn mức", async () => {
  const w = dung();
  await hanMuc(w, true);
  const id = await donDaiLy(w);
  assert.equal((await congTyThu(w, id, 300_000)).status, 201);
  assert.equal(await noDon(w, id), TONG - HOA_HONG - 300_000);
  const r2 = await congTyThu(w, id, 250_000); // số khác lần trước (bộ chống ghi trùng tiền mặt)
  assert.equal(r2.status, 201, r2.text);
  assert.equal(await noDon(w, id), 0, "Tour Đảo nhận 550.000 > giá đại lý 500.000: đơn không còn nợ (không bù cho đơn khác — Đ1 mục 8)");
  assert.equal(await dangNo(w), 0);
});

test("Đ1 mục 9: giá đại lý đọc NHIỀU đơn một lượt trùng từng đơn (`phanThuongMaiCuaDon` + `tinhDongDoiTac`), kể cả đơn đã sửa số khách và đơn văn phòng lập cho đối tác", async () => {
  const w = dung();
  await hanMuc(w, true);
  const a = await donDaiLy(w, GIAM);
  const b = await donDaiLy(w);
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Ba", customerPhone: "0912345670", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3)), svc("ZA1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const c = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${c}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const dv = w.q("SELECT id FROM order_service WHERE order_id = ? ORDER BY sort_order", b)[0].id as string;
  const sua = await w.call("POST", `/api/orders/${b}/money-edit`, { as: ACC, body: { lyDo: "THEM_NGUOI", services: [{ id: dv, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, sua.text);
  const nhieu = await app.giaDaiLyNhieuDon(w.env.DB, [a, b, c]);
  for (const id of [a, b, c]) {
    const p = await app.phanThuongMaiCuaDon(w.env.DB, id);
    const motDon = p.dichVu.map((d: { id: string; thanhTien: number; soKhachTinh: number; pax: unknown }) => {
      const t = tinhDongDoiTac(p.chup.find((x: { serviceId: string }) => x.serviceId === d.id), d as never);
      return { serviceId: d.id, thanhTien: t.thanhTien, hoaHong: t.hoaHong, giaDaiLy: t.giaDaiLy ?? t.thanhTien };
    });
    const g = nhieu.get(id);
    assert.ok(g, `đơn ${id} có trong kết quả`);
    assert.deepEqual(g.dong.map(({ serviceId, thanhTien, hoaHong, giaDaiLy }: Record<string, unknown>) => ({ serviceId, thanhTien, hoaHong, giaDaiLy })), motDon);
    assert.equal(g.laDonDaiLy, true, "bên đặt mang vai được hưởng");
  }
  assert.equal(nhieu.get(b).tong, 3 * 300_000 - 3 * 50_000, "đơn sửa thành 3 người lớn: tính theo số hiện hành");
});
