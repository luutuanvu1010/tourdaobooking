// ADR-0182 phần B (accepted 2026-11-13) — khoản nộp của đại lý theo từng đơn, qua ỨNG DỤNG THẬT (khung thử xac-nhan-khung, SQLite tạm, kho R2 giả).
// Đơn ví dụ của ADR: ZA1 2 người lớn × 500.000 = 1.000.000 (giá lẻ), hoa hồng 100.000/khách ⇒ giá đại lý 800.000. Đơn Thanh toán ngay do tài khoản Đối tác lập, Gửi đơn nhánh B.
// Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { doNhatKyHang } from "../tests/audit/nhat-ky-hang.mjs";
import { CHECKS, demViPham } from "../scripts/audit-checks.mjs";
import { A, ACC, ADM, LAI, PARTNER, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { CAU_CO_KHOAN_CHO, CAU_QUYET_TOAN_TRUNG } from "./shared/cong-no-dai-ly.ts";

const BEN = `pty-${PARTNER}`;
const ACC2 = "45454545-4545-4545-8545-454545454545";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const anh = () => ({ noiDung: Buffer.from(PNG).toString("base64") });
const homNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = ReturnType<typeof setup>;

async function dung(coMuc = true): Promise<W> {
  const w = setup();
  seedStaff(w.sqlite, { id: ACC2, phone: "0900000045", name: "Kế toán Hai", perms: ["ACCOUNTING"] });
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const tk = await w.call("PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { as: SUP, body: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null } });
  assert.equal(tk.status, 200, tk.text);
  if (coMuc) {
    const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 100_000, tuNgay: "2026-01-01" } });
    assert.equal(m.status, 201, m.text);
  }
  return w;
}
async function donDaiLy(w: W, as = PARTNER): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))], paymentTerm: "PREPAID" } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "confirmed", "nhánh B: xác nhận ngay khi gửi");
  return id;
}
const phieu = async (w: W, id: string, as = PARTNER) => {
  const r = await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json.phieu;
};
const ghiNop = (w: W, id: string, soTien: number, khachDaTra: number, them: Record<string, unknown> = {}, as = PARTNER) =>
  w.call("POST", `/api/orders/${id}/khoan-nop`, { as, body: { soTien, ngayChuyen: homNay(), khachDaTra, bienLai: anh(), ...them } });
const nopId = (w: W, id: string): string => String(w.q("SELECT id FROM bil_agent_remittance WHERE order_id = ? ORDER BY rowid DESC", id)[0].id);
let demMa = 0;
/** Mã giao dịch riêng cho mỗi lần xác nhận, số thực chuyển = số khoản nộp (kiểm toán 14/11: xác nhận phải kèm mã). `them` ghi đè được `maGiaoDich` / `soThucChuyen` / `boQuaTrung`. */
const xacNhan = (w: W, id: string, nid: string, as = ACC, them: Record<string, unknown> = {}) => {
  const so = Number((w.q("SELECT amount FROM bil_agent_remittance WHERE id = ?", nid)[0] as { amount?: number } | undefined)?.amount ?? 1000);
  return w.call("POST", `/api/orders/${id}/khoan-nop/${nid}/xac-nhan`, { as, body: { maGiaoDich: `MAKN${String(++demMa).padStart(6, "0")}`, soThucChuyen: so, ...them } });
};
const tuChoi = (w: W, id: string, nid: string, lyDo = "Không thấy tiền về sao kê", as = ACC) => w.call("POST", `/api/orders/${id}/khoan-nop/${nid}/tu-choi`, { as, body: { lyDo } });
const veMo = async (w: W, id: string): Promise<boolean> => {
  const r = await w.call("GET", `/api/ve/don/${id}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  return r.json.thuDu as boolean;
};
const soDu = (w: W, id: string): number => {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0]?.party_id ?? "");
  let so = 0;
  for (const l of w.q("SELECT debtor_party_id d, creditor_party_id c, amount a FROM bil_debt_line WHERE order_id = ?", id) as { d: string; c: string; a: number }[]) {
    if (l.d === BEN && l.c === ct) so += l.a;
    else if (l.d === ct && l.c === BEN) so -= l.a;
  }
  return so;
};
const thuCuaDon = (w: W, id: string) =>
  (w.q("SELECT amount, collector_role_code AS vai FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid", id) as { amount: number; vai: string }[]).map((r) => ({ amount: r.amount, vai: r.vai }));

test("Ví dụ 1.000.000 / 800.000: «Đã chuyển tiền» ghi một lô (khoản chờ + «Khách đã trả bạn 1.000.000 ₫» + ảnh); Kế toán xác nhận ⇒ SETTLEMENT 800.000, nợ 0, vé mở; «Khách đã trả đủ» ⇒ hoa hồng 200.000, số dư 0", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  const p0 = await phieu(w, id);
  assert.equal(p0.tong, 800_000);
  assert.equal(p0.conLai, 800_000);
  assert.equal(p0.qr?.soTien, 800_000);
  assert.deepEqual([p0.nop.ghiDuoc, p0.nop.khachDaTra, p0.nop.tran], [true, 1_000_000, 800_000]);
  const r = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(thuCuaDon(w, id), [{ amount: 1_000_000, vai: "BOOKER" }], "khoản «Khách đã trả bạn» đi đường «Tôi thu»: người thu là đại lý");
  assert.equal(soDu(w, id), 1_000_000, "dòng giữ hộ HELD ngay trên đại lý");
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_proof WHERE stored_at IS NOT NULL")[0].n, 1, "ảnh đã lưu kho");
  const p1 = await phieu(w, id);
  assert.equal(p1.conLai, 800_000, "khoản chờ chưa tính vào Đã thu");
  assert.equal(p1.qr, null, "đang có khoản chờ ⇒ ẩn QR");
  assert.equal(p1.ghiChuQr, CAU_CO_KHOAN_CHO);
  assert.equal(p1.nop.ghiDuoc, false);
  assert.equal(p1.nop.khoan[0].trangThai, "PENDING");
  assert.equal(await veMo(w, id), false, "chưa xác nhận ⇒ vé chưa mở");
  assert.equal((await xacNhan(w, id, nopId(w, id), PARTNER)).status, 403, "đại lý không tự xác nhận");
  assert.equal((await xacNhan(w, id, nopId(w, id), ADM)).status, 403, "Quản trị không có ô xác nhận");
  const x = await xacNhan(w, id, nopId(w, id));
  assert.equal(x.status, 200, x.text);
  assert.deepEqual(w.q("SELECT l.amount, l.kind_code k FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND p.kind_code = 'SETTLEMENT'", id).map((r: any) => [r.amount, r.k]), [[800_000, "SETTLEMENT"]]);
  assert.equal(soDu(w, id), 200_000, "đại lý còn giữ 200.000 (phần hoa hồng)");
  const p2 = await phieu(w, id);
  assert.equal(p2.conLai, 0);
  assert.equal(p2.nop.khoan[0].trangThai, "CONFIRMED");
  assert.equal(await veMo(w, id), true, "B2: đủ giá đại lý đã xác nhận ⇒ vé mở");
  assert.equal((await xacNhan(w, id, nopId(w, id))).status, 409, "xác nhận lần hai ⇒ 409");
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id);
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.equal(soDu(w, id), 0, "hoa hồng 200.000 cấn đúng phần đại lý còn giữ — không trả hoa hồng hai lần");
});

test("Đại lý đã «Tôi thu» một phần: X = phần còn thiếu; gửi X cũ ⇒ 409 không ghi gì", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: PARTNER, body: { soTien: 400_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  assert.equal((await phieu(w, id)).nop.khachDaTra, 600_000);
  const sai = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(sai.status, 409, sai.text);
  assert.equal(w.q("SELECT count(*) n FROM bil_agent_remittance")[0].n, 0);
  assert.equal((await ghiNop(w, id, 800_000, 600_000)).status, 201);
  assert.deepEqual(thuCuaDon(w, id).map((t) => t.amount), [400_000, 600_000]);
});

test("Khách trả thẳng Công ty: X trừ phần đó; Công nợ còn lại và trần giảm; vượt trần ⇒ 409", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  const p = await phieu(w, id);
  assert.deepEqual([p.conLai, p.nop.tran, p.nop.khachDaTra, p.qr?.soTien], [500_000, 500_000, 700_000, 500_000]);
  assert.equal((await ghiNop(w, id, 600_000, 700_000)).status, 409);
  assert.equal((await ghiNop(w, id, 500_000, 700_000)).status, 201);
  assert.equal((await xacNhan(w, id, nopId(w, id))).status, 200);
  assert.equal((await phieu(w, id)).conLai, 0);
});

test("Khoản «Công ty thu, chuyển khoản» đối tác khai còn chờ: trần trừ khoản đó; Kế toán xác nhận khoản nộp khi còn khoản chờ ⇒ 409", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: PARTNER, body: { soTien: 200_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", bienLai: anh() } })).status, 201);
  const p = await phieu(w, id);
  assert.deepEqual([p.conLai, p.nop.congTyCho, p.nop.tran, p.qr?.soTien], [800_000, 200_000, 600_000, 600_000]);
  assert.equal((await ghiNop(w, id, 700_000, 800_000)).status, 409, "vượt trần");
  assert.equal((await ghiNop(w, id, 600_000, 800_000)).status, 201);
  const x = await xacNhan(w, id, nopId(w, id));
  assert.equal(x.status, 409, x.text);
  assert.equal(w.q("SELECT status_code s FROM bil_agent_remittance")[0].s, "PENDING", "khoản vẫn chờ");
});

test("Bấm hai lần: lần hai ⇒ 409, không thêm khoản thu, khoản nộp, ảnh", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  const lan2 = await ghiNop(w, id, 800_000, 0);
  assert.equal(lan2.status, 409, lan2.text);
  assert.equal(w.q("SELECT count(*) n FROM bil_agent_remittance")[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_proof")[0].n, 1);
  assert.equal(thuCuaDon(w, id).length, 1);
});

test("Bấm hai lần đua nhau (hai thẻ): khoản nộp chen vào ngay trước lô ⇒ chỉ mục duy nhất huỷ CẢ lô (không khoản thu kèm), 409", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /INSERT INTO bil_agent_remittance/.test(x.sql)), async () => {
    w.sqlite.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
      VALUES ('chen-truoc', ?, ?, 100, ?, 'PENDING', ?, ?, ?, ?)`).run(id, BEN, homNay(), new Date().toISOString(), PARTNER, new Date().toISOString(), PARTNER);
  });
  const r = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(r.status, 409, r.text);
  assert.equal(thuCuaDon(w, id).length, 0, "khoản thu kèm không lọt");
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_proof")[0].n, 0);
});

test("Khe đọc–ghi (kiểm độc lập THẤP-2): đơn bị huỷ ngay trước lô ⇒ khoản nộp không chèn VÀ khoản «Khách đã trả bạn» kèm cũng không (không dòng giữ hộ mồ côi), 409", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /INSERT INTO bil_agent_remittance/.test(x.sql)), async () => {
    // Giả «người khác vừa huỷ đơn»: bỏ trigger đòi dòng lý do huỷ CHỈ trên SQLite tạm của bài, rồi đổi trạng thái.
    w.sqlite.exec("DROP TRIGGER orders_cancel_requires_reason");
    w.sqlite.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  });
  const r = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(r.status, 409, r.text);
  assert.equal(w.q("SELECT count(*) n FROM bil_agent_remittance")[0].n, 0);
  assert.equal(thuCuaDon(w, id).length, 0, "khoản thu kèm không lọt");
  assert.equal(w.q("SELECT count(*) n FROM bil_debt_line WHERE order_id = ?", id)[0].n, 0, "không dòng giữ hộ mồ côi");
});

test("Ghi trùng qua quyết toán: đơn có khoản nộp chờ ⇒ quyết toán «nộp» của đại lý 409; Đối tác khai «Công ty thu» 409; xác nhận vượt Công nợ còn lại 409", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  const qt = await w.call("POST", "/api/ledger/settlements", { as: ACC, body: { chieu: "nop", partyId: BEN, phanBo: [{ orderId: id, soTien: 800_000 }] } });
  assert.equal(qt.status, 409, qt.text);
  assert.equal(qt.json.error.message, CAU_QUYET_TOAN_TRUNG);
  const ct = await w.call("POST", `/api/orders/${id}/payments`, { as: PARTNER, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(ct.status, 409, ct.text);
  // Lớp CSDL (khe đọc–ghi): trigger chặn «Công ty thu» của chính người có khoản nộp chờ dù lọt qua máy chủ.
  assert.throws(() => w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) SELECT 'x', ?, 'CUSTOMER_PAYMENT', 1, collector_party_id, 'COMPANY', 'CASH', collected_for_party_id, 'PREPAID', ?, NULL, NULL, ?, ?, ?, ?
      FROM bil_payment_receipt WHERE order_id = ? LIMIT 1`).run(id, homNay(), "t", PARTNER, "t", PARTNER, id), /remittance_pending_company/);
});

test("Xác nhận kiểm lại trần: Kế toán tăng hoa hồng sau khi đại lý ghi ⇒ Công nợ còn lại < khoản nộp ⇒ 409, khoản vẫn chờ", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  const dv = String(w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id);
  const t = await w.call("POST", `/api/orders/${id}/thuong-mai/${dv}`, { as: ACC, body: { lyDo: "thoả thuận riêng với đại lý", hoaHong: { kieu: "RATE", tyLeBp: 3000 } } });
  assert.equal(t.status, 200, t.text);
  assert.equal((await phieu(w, id)).conLai, 700_000, "Đ1 mục 4: sửa mức sau xác nhận thì nợ đổi theo");
  const x = await xacNhan(w, id, nopId(w, id));
  assert.equal(x.status, 409, x.text);
  assert.equal(w.q("SELECT status_code s FROM bil_agent_remittance")[0].s, "PENDING");
});

test("Khe phần A (Đ1 mục 4): điều chỉnh có duyệt tăng hoa hồng 50.000 SAU «Khách đã trả đủ» ⇒ Công nợ còn lại giảm 50.000 («Tour Đảo nợ đại lý 50.000»)", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  assert.equal((await xacNhan(w, id, nopId(w, id))).status, 200);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(inDays(0), id);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} })).status, 200);
  assert.equal((await phieu(w, id)).conLai, 0);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const yc = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dieu_chinh", orderId: id, benNo: ct, benDuocNo: BEN, loaiDong: "HOA_HONG", soTien: 50_000, lyDo: "thưởng thêm hoa hồng cho đại lý" } });
  assert.equal(yc.status, 201, yc.text);
  assert.equal((await w.call("POST", `/api/ledger/adjustment-requests/${yc.json.yeuCauId}/approve`, { as: ACC2 })).status, 201);
  assert.equal((await phieu(w, id)).conLai, -50_000, "hoa hồng tăng sau giao ⇒ Tour Đảo nợ đại lý 50.000");
});

test("Từ chối có lý do ⇒ đại lý thấy lý do; khoản «Khách đã trả bạn» vẫn giữ; ghi được khoản mới (X = 0)", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 400_000, 1_000_000)).status, 201);
  const nid = nopId(w, id);
  assert.equal((await tuChoi(w, id, nid, "ngắn")).status, 400, "lý do quá ngắn");
  const tc = await tuChoi(w, id, nid);
  assert.equal(tc.status, 200, tc.text);
  const p = await phieu(w, id);
  assert.equal(p.nop.khoan[0].trangThai, "REJECTED");
  assert.equal(p.nop.khoan[0].lyDoTuChoi, "Không thấy tiền về sao kê", "đại lý thấy lý do");
  assert.deepEqual(thuCuaDon(w, id), [{ amount: 1_000_000, vai: "BOOKER" }]);
  assert.equal(p.nop.ghiDuoc, true, "từ chối xong ghi được khoản mới");
  assert.equal(p.nop.khachDaTra, 0);
  assert.equal((await tuChoi(w, id, nid)).status, 409, "khoản đã quyết");
});

test("Người ghi ≠ người xác nhận: khoản do chính Kế toán ghi (ca dữ liệu) thì Kế toán đó không xác nhận / từ chối được", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  const nid = "12121212-1212-4212-8212-121212121212";
  w.sqlite.prepare(`INSERT INTO bil_agent_remittance (id, order_id, agent_party_id, amount, transfer_date, status_code, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 100, ?, 'PENDING', ?, ?, ?, ?)`).run(nid, id, BEN, homNay(), new Date().toISOString(), ACC, new Date().toISOString(), ACC);
  const x = await xacNhan(w, id, nid);
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "tach_nguoi");
  assert.equal((await tuChoi(w, id, nid)).json.error.code, "tach_nguoi");
  assert.notEqual((await xacNhan(w, id, nid, ACC2)).json?.error?.code, "tach_nguoi");
});

test("Tài khoản Đối tác không có phiếu (đơn của đại lý khác; tài khoản lai Bán hàng + Đối tác không phải bên đặt): không ghi được khoản nộp, cổng vé như cũ", async () => {
  const w = await dung();
  const DT2 = "73737373-7373-4373-8373-737373737373";
  seedStaff(w.sqlite, { id: DT2, phone: "0900000073", name: "Đối Tác Khác", perms: ["PARTNER"] });
  const id = await donDaiLy(w);
  const khac = await ghiNop(w, id, 800_000, 1_000_000, {}, DT2);
  assert.ok([403, 404].includes(khac.status), khac.text);
  const lai = await ghiNop(w, id, 800_000, 1_000_000, {}, LAI);
  assert.ok([403, 404].includes(lai.status), lai.text);
  // Đơn văn phòng lập (Bán hàng), khách lẻ: không phải đơn có phiếu của Đối tác nào.
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Lẻ", customerPhone: "0912345679", services: [svc("ZA1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const vp = r.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${vp}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.ok([403, 404].includes((await ghiNop(w, vp, 100_000, 1_000_000)).status));
  assert.equal(w.q("SELECT count(*) n FROM bil_agent_remittance")[0].n, 0);
});

test("B2: đơn Đối tác thiếu mức (giá đại lý = giá lẻ) giữ cổng cũ — nộp 800.000 chưa đủ ⇒ vé chưa mở", async () => {
  const w = await dung(false);
  const id = await donDaiLy(w);
  const p = await phieu(w, id);
  assert.equal(p.conLai, 1_000_000);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  assert.equal((await xacNhan(w, id, nopId(w, id))).status, 200);
  assert.equal(await veMo(w, id), false, "Công nợ còn lại 200.000 > 0");
});

test("Đơn chưa xác nhận (nháp) không ghi được khoản nộp; ảnh bắt buộc; ngày sau hôm nay bị chặn", async () => {
  const w = await dung();
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))], paymentTerm: "PREPAID" } });
  const nhap = r.json.order.id as string;
  assert.equal((await ghiNop(w, nhap, 100_000, 1_000_000)).status, 409);
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 100_000, 1_000_000, { bienLai: null })).status, 400);
  assert.equal((await ghiNop(w, id, 100_000, 1_000_000, { ngayChuyen: "2999-01-01" })).status, 400);
  assert.equal(w.q("SELECT count(*) n FROM bil_agent_remittance")[0].n, 0);
});

test("Ảnh biên lai khoản nộp: đại lý chủ khoản, Kế toán, Quản trị xem được (nhật ký trước); Bán hàng, đối tác khác không; Toàn quyền gỡ có lý do", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  const nid = nopId(w, id);
  for (const as of [PARTNER, ACC, ADM, SUP]) assert.equal((await w.call("GET", `/api/orders/${id}/khoan-nop/${nid}/bien-lai`, { as })).status, 200, as);
  assert.equal((await w.call("GET", `/api/orders/${id}/khoan-nop/${nid}/bien-lai`, { as: A })).status, 403);
  assert.ok(Number(w.q("SELECT count(*) n FROM audit_log WHERE action = 'agent_remittance_proof_viewed'")[0].n) >= 4);
  assert.equal((await w.call("POST", `/api/orders/${id}/khoan-nop/${nid}/bien-lai/go`, { as: ACC, body: { lyDo: "Gửi nhầm ảnh" } })).status, 403);
  assert.equal((await w.call("POST", `/api/orders/${id}/khoan-nop/${nid}/bien-lai/go`, { as: SUP, body: { lyDo: "Gửi nhầm ảnh" } })).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${id}/khoan-nop/${nid}/bien-lai`, { as: ACC })).status, 404);
  assert.equal((await phieu(w, id)).nop.khoan[0].bienLai, "DA_GO");
  const ds = doNhatKyHang(w.sqlite, ["bil_remittance_proof.content_hash", "bil_remittance_proof.storage_key"]);
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3 (khoá kho / băm ảnh khoản nộp)");
});

test("Kho hỏng khi đặt ảnh: khoản nộp vẫn ghi (ảnh «chưa tải xong»), R-BIL-BL1 thấy sau 1 giờ, hàng chờ dọn kho thấy và chạy lại được; nhật ký không lộ N3", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  w.r2BienLai.hong.put = true;
  const r = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.bienLaiChuaTaiXong, true);
  assert.equal((await phieu(w, id)).nop.khoan[0].bienLai, "CHUA_TAI_XONG");
  // Giả «đã qua 3 giờ»: bỏ trigger giữ mốc tạo CHỈ trên SQLite tạm của bài (không nới luật nào của mã).
  w.sqlite.exec("DROP TRIGGER bil_remittance_proof_identity");
  w.sqlite.prepare("UPDATE bil_remittance_proof SET created_at = ?").run(new Date(Date.now() - 3 * 3600_000).toISOString());
  const c = CHECKS.find((x: any) => x.code === "R-BIL-BL1");
  assert.equal(demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all()), 1, "R-BIL-BL1 đếm ảnh khoản nộp tải dở dang");
  const cho = await w.call("GET", "/api/ledger/bien-lai-cho-xoa", { as: SUP });
  assert.equal(cho.status, 200, cho.text);
  assert.equal(cho.json.anh.length, 1);
  w.r2BienLai.hong.put = false;
  const lai = await w.call("POST", "/api/ledger/bien-lai-cho-xoa/chay-lai", { as: SUP, body: {} });
  assert.equal(lai.status, 200, lai.text);
  assert.equal((await phieu(w, id)).nop.khoan[0].bienLai, "CHUA_CO", "tải dở quá hạn ⇒ quyết xoá, khoản thành «Chưa có biên lai»");
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_proof WHERE r2_deleted_at IS NOT NULL")[0].n, 1);
  const ds = doNhatKyHang(w.sqlite, ["bil_remittance_proof.content_hash", "bil_remittance_proof.storage_key"]);
  assert.deepEqual(ds.lo, []);
});

test("Danh sách chờ cho Kế toán: thấy khoản chờ kèm cờ «còn Công ty thu chờ»; Đối tác, Bán hàng không xem được", async () => {
  const w = await dung();
  const id = await donDaiLy(w);
  assert.equal((await ghiNop(w, id, 800_000, 1_000_000)).status, 201);
  const r = await w.call("GET", "/api/ledger/khoan-nop-cho", { as: ACC });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ds.length, 1);
  assert.equal(r.json.ds[0].soTien, 800_000);
  assert.equal(r.json.ds[0].coCongTyCho, false);
  assert.equal((await w.call("GET", "/api/ledger/khoan-nop-cho", { as: PARTNER })).status, 403);
  assert.equal((await w.call("GET", "/api/ledger/khoan-nop-cho", { as: A })).status, 403);
  assert.equal((await w.call("GET", "/api/ledger/khoan-nop-cho", { as: ACC2 })).status, 200);
});

// ---- Kiểm toán 14/11: mã giao dịch ngân hàng của khoản nộp (migration 0166), cờ ảnh trùng, khoản đã xác nhận không lệch sổ ----
const MA = (n: string) => `XNMA${n}`;
const trangThaiNop = (w: W, nid: string) => String(w.q("SELECT status_code s FROM bil_agent_remittance WHERE id = ?", nid)[0].s);
const LY_DO_TRUNG = "Một lần chuyển trả hai đơn của cùng đại lý";
/** Một đơn đại lý có khoản nộp chờ 800.000 (ví dụ ADR: giá đại lý 800.000). */
async function donCoNop(w: W): Promise<{ id: string; nid: string }> {
  const id = await donDaiLy(w);
  const r = await ghiNop(w, id, 800_000, 1_000_000);
  assert.equal(r.status, 201, r.text);
  return { id, nid: nopId(w, id) };
}

test("T1(a) xác nhận thiếu mã hoặc số thực chuyển ⇒ 400, khoản vẫn chờ, không phiếu; đủ cả hai ⇒ 200 và có dòng mã, nhật ký không chép mã", async () => {
  const w = await dung();
  const { id, nid } = await donCoNop(w);
  const goi = (body: unknown) => w.call("POST", `/api/orders/${id}/khoan-nop/${nid}/xac-nhan`, { as: ACC, body });
  for (const body of [{}, { maGiaoDich: MA("0001") }, { soThucChuyen: 800_000 }]) {
    const r = await goi(body);
    assert.equal(r.status, 400, r.text);
  }
  assert.equal((await goi({ maGiaoDich: "ab", soThucChuyen: 800_000 })).status, 400, "mã quá ngắn");
  assert.equal((await goi({ maGiaoDich: MA("0001"), soThucChuyen: 0 })).status, 400, "số thực chuyển phải > 0");
  assert.equal(trangThaiNop(w, nid), "PENDING");
  assert.equal(w.q("SELECT count(*) n FROM bil_posting WHERE kind_code = 'SETTLEMENT'")[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_bank_txn")[0].n, 0);
  const ok = await goi({ maGiaoDich: "xn ma-0001", soThucChuyen: 800_000 });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(trangThaiNop(w, nid), "CONFIRMED");
  assert.equal(w.q("SELECT txn_code c FROM bil_remittance_bank_txn WHERE remittance_id = ?", nid)[0].c, "XNMA0001", "mã được chuẩn hoá khi lưu");
  for (const d of w.q("SELECT detail FROM audit_log WHERE order_id = ?", id)) assert.doesNotMatch(String(d.detail ?? ""), /XNMA0001/);
});

test("T1(b)(c)(d) hai khoản nộp cùng mã: khác số thực chuyển ⇒ 409; tổng vượt ⇒ 409 (khoản vẫn chờ); tổng không vượt ⇒ cả hai qua (sau cảnh báo cùng mã khác đơn, gửi lại kèm lý do)", async () => {
  const w = await dung();
  const a = await donCoNop(w);
  const b = await donCoNop(w);
  const goi = (x: { id: string; nid: string }, body: Record<string, unknown>) => w.call("POST", `/api/orders/${x.id}/khoan-nop/${x.nid}/xac-nhan`, { as: ACC, body });
  const boQuaTrung = [{ ma: "ma_giao_dich_khac_don", lyDo: LY_DO_TRUNG }];
  // (d) 1.600.000 thực chuyển cho hai khoản 800.000 + 800.000: lần một qua; lần hai bị cảnh báo «khác đơn», gửi lại kèm lý do thì qua.
  assert.equal((await goi(a, { maGiaoDich: MA("0010"), soThucChuyen: 1_600_000 })).status, 200);
  const canh = await goi(b, { maGiaoDich: MA("0010"), soThucChuyen: 1_600_000 });
  assert.equal(canh.status, 409, canh.text);
  assert.equal(canh.json.error.code, "co_the_trung");
  assert.equal(trangThaiNop(w, b.nid), "PENDING");
  // (c) cùng mã, số thực chuyển khác số đã ghi ⇒ 409, kèm số đã ghi để điền sẵn
  const lech = await goi(b, { maGiaoDich: MA("0010"), soThucChuyen: 1_700_000, boQuaTrung });
  assert.equal(lech.status, 409, lech.text);
  assert.equal(lech.json.error.code, "bank_txn_amount_mismatch");
  assert.equal(lech.json.error.soThucChuyen, 1_600_000);
  assert.equal(trangThaiNop(w, b.nid), "PENDING");
  const qua = await goi(b, { maGiaoDich: MA("0010"), soThucChuyen: 1_600_000, boQuaTrung });
  assert.equal(qua.status, 200, qua.text);
  assert.equal(w.q("SELECT count(*) n FROM bil_remittance_bank_txn WHERE txn_code = ?", MA("0010"))[0].n, 2);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'ledger_duplicate_overridden'")[0].n, 1, "«vẫn ghi» vào nhật ký");
  // (b) khoản thứ ba trên mã 1.600.000 đã chia hết ⇒ tổng vượt
  const c = await donCoNop(w);
  const vuot = await goi(c, { maGiaoDich: MA("0010"), soThucChuyen: 1_600_000, boQuaTrung });
  assert.equal(vuot.status, 409, vuot.text);
  assert.equal(vuot.json.error.code, "bank_txn_over");
  assert.equal(trangThaiNop(w, c.nid), "PENDING");
  assert.equal(w.q("SELECT count(*) n FROM bil_posting WHERE kind_code = 'SETTLEMENT'")[0].n, 2, "khoản thứ ba không sinh phiếu");
});

test("T1(b) khoản nộp + một khoản «Công ty thu, chuyển khoản» cùng mã: tổng vượt số thực chuyển ⇒ 409 ở cả hai chiều", async () => {
  const w = await dung();
  const a = await donCoNop(w);
  const kt = await donDaiLy(w);
  const boQuaTrung = [{ ma: "ma_giao_dich_khac_don", lyDo: LY_DO_TRUNG }];
  const ma = MA("0020");
  // Chiều 1: khoản «Công ty thu» 300.000 gắn mã trước (số thực chuyển 1.000.000); khoản nộp 800.000 cùng mã ⇒ 1.100.000 > 1.000.000
  const thu = await w.call("POST", `/api/orders/${kt}/payments`, { as: ACC, body: { soTien: 300_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: ma, soThucChuyen: 1_000_000 } });
  assert.equal(thu.status, 201, thu.text);
  const vuot = await w.call("POST", `/api/orders/${a.id}/khoan-nop/${a.nid}/xac-nhan`, { as: ACC, body: { maGiaoDich: ma, soThucChuyen: 1_000_000, boQuaTrung } });
  assert.equal(vuot.status, 409, vuot.text);
  assert.equal(vuot.json.error.code, "bank_txn_over");
  assert.equal(trangThaiNop(w, a.nid), "PENDING");
  // Vừa đủ: số thực chuyển 1.100.000 cho cả hai ⇒ khoản «Công ty thu» đã ghi số 1.000.000 nên lệch ⇒ mismatch
  const lech = await w.call("POST", `/api/orders/${a.id}/khoan-nop/${a.nid}/xac-nhan`, { as: ACC, body: { maGiaoDich: ma, soThucChuyen: 1_100_000, boQuaTrung } });
  assert.equal(lech.status, 409, lech.text);
  assert.equal(lech.json.error.code, "bank_txn_amount_mismatch");
  // Chiều 2: khoản nộp xác nhận trước với mã mới (1.000.000), rồi «Công ty thu» 300.000 cùng mã ⇒ vượt
  const ma2 = MA("0021");
  assert.equal((await w.call("POST", `/api/orders/${a.id}/khoan-nop/${a.nid}/xac-nhan`, { as: ACC, body: { maGiaoDich: ma2, soThucChuyen: 1_000_000 } })).status, 200);
  const kt2 = await donDaiLy(w);
  const vuot2 = await w.call("POST", `/api/orders/${kt2}/payments`, { as: ACC, body: { soTien: 300_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: ma2, soThucChuyen: 1_000_000, boQuaTrung } });
  assert.equal(vuot2.status, 409, vuot2.text);
  assert.equal(vuot2.json.error.code, "bank_txn_over");
});

test("T1(e) cờ ảnh trùng: chỉ Kế toán thấy, đúng khi băm trùng khoản khác, sai khi ảnh khác; băm không lọt ra phiếu", async () => {
  const w = await dung();
  const a = await donCoNop(w);
  const b = await donCoNop(w); // cùng bytes PNG ⇒ cùng băm
  const doc = async (id: string, as: string) => (await w.call("GET", `/api/orders/${id}/cong-no-dai-ly`, { as }));
  const ra = await doc(b.id, ACC);
  assert.equal(ra.status, 200, ra.text);
  assert.equal(ra.json.phieu.nop.khoan[0].bienLaiTrung, true, "ảnh trùng ảnh khoản nộp khác");
  const bam = String(w.q("SELECT content_hash h FROM bil_remittance_proof LIMIT 1")[0].h);
  assert.ok(bam.length === 64);
  assert.ok(!ra.text.includes(bam), "băm không ra ngoài");
  assert.ok(!(await doc(a.id, ACC)).text.includes(bam));
  const dl = await doc(b.id, PARTNER);
  assert.equal(dl.status, 200, dl.text);
  assert.equal(dl.json.phieu.nop.khoan[0].bienLaiTrung, undefined, "đại lý không thấy cờ");
  assert.ok(!dl.text.includes(bam));
  // Ảnh khác ⇒ không cờ. Đổi băm của khoản b (SQLite tạm: bỏ trigger một chiều CHỈ trong bài).
  w.sqlite.exec("DROP TRIGGER bil_remittance_proof_hash_one_way");
  w.sqlite.prepare("UPDATE bil_remittance_proof SET content_hash = ? WHERE remittance_id = ?").run("c".repeat(64), b.nid);
  assert.equal((await doc(b.id, ACC)).json.phieu.nop.khoan[0].bienLaiTrung, false);
  // Trả băm của b về băm của a ⇒ lại trùng
  w.sqlite.prepare("UPDATE bil_remittance_proof SET content_hash = ? WHERE remittance_id = ?").run(String(w.q("SELECT content_hash h FROM bil_remittance_proof WHERE remittance_id = ?", a.nid)[0].h), b.nid);
  assert.equal((await doc(b.id, ACC)).json.phieu.nop.khoan[0].bienLaiTrung, true);
  // Không chặn: xác nhận khoản có cờ vẫn được
  assert.equal((await xacNhan(w, b.id, b.nid)).status, 200);
});

test("T2(a) «huỷ dòng sổ» trên dòng quyết toán của khoản nộp đã xác nhận ⇒ 409, sổ không đổi, khoản vẫn đã xác nhận", async () => {
  const w = await dung();
  const { id, nid } = await donCoNop(w);
  assert.equal((await xacNhan(w, id, nid)).status, 200);
  const dong = String(w.q("SELECT l.id i FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE p.kind_code = 'SETTLEMENT' AND l.order_id = ?", id)[0].i);
  const dem = Number(w.q("SELECT count(*) n FROM bil_debt_line")[0].n);
  const r = await w.call("POST", "/api/ledger/adjustments", { as: ACC, body: { loai: "dao_dong", lineId: dong, lyDo: "ghi nhầm dòng quyết toán" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "remittance_line_needs_approval");
  assert.equal(Number(w.q("SELECT count(*) n FROM bil_debt_line")[0].n), dem, "không dòng đảo nào được ghi");
  assert.equal(trangThaiNop(w, nid), "CONFIRMED");
});
