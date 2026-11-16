// ADR-0182 phần A — Đ1: công nợ đại lý = Σ giá đại lý (thành tiền − hoa hồng, bản chụp lúc xác nhận) − tiền Tour Đảo đã nhận (đã xác nhận). Số nợ Trả sau (hạn mức,
// danh sách nợ) đọc ĐÚNG công thức này; số KHÔNG đổi khi qua «Khách đã trả đủ» (bản cũ đổi giữa chừng — Bối cảnh ADR-0182). Khung thử thật (tests/audit/xac-nhan-khung.mjs).
// Tên người, SĐT là GIẢ.
// ĐỔI CÓ CHỦ ĐÍCH 15/11 (phí đưa đón Đợt C, Task 5; ADR-0203 ĐB3, chủ chọn 14/11 «có, cộng vào số đại lý nợ»; sổ vàng SV-PD-25): bài «Đ1 mục 9» trước khoá «tổng công nợ trùng
// `phanThuongMaiCuaDon` từng đơn»; nay đơn có dòng phí đưa đón nên khoá thành «trùng `phanThuongMaiCuaDon` + Σ phí đón hiện hành của đơn» (`phiDon` riêng, hoa hồng không tính trên phí;
// đơn đã sửa số khách: phí theo khách tính lại cùng hàm với chi tiết đơn). Lý do: tổng công nợ phải gồm phí, mà các dòng dịch vụ (hoa hồng) không được nhận phí vào.
// ĐỔI CÓ CHỦ ĐÍCH 16/11 (ADR-0214, Task 4): mức phí do văn phòng chọn, không tra bảng — đơn Đối tác có lượt đón Gửi đơn ⇒ nhánh A, văn phòng chọn 20.000 ở Còn vé (cùng số bảng cũ cho
// ra); đơn văn phòng lập mang mức trong thân. Bỏ phần gieo bảng mức (không còn tác dụng với đơn). Số tiền khẳng định giữ nguyên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, seedStaff } from "../tests/audit/harness.mjs";
import { tinhDongDoiTac } from "./shared/hoa-hong-dong.ts";
import { A, ACC, ADM, SUP, inDays, leg, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";

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
async function donDaiLy(w: W, giam = 0, legs: unknown[] = []): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3), legs)], paymentTerm: "CREDIT", discount: giam } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: DT, body: {} });
  if (legs.length === 0) {
    assert.equal(g.status, 200, g.text);
    return id;
  }
  // ADR-0214: nháp Đối tác không mang mức ⇒ nhánh A; văn phòng chọn mức ở Còn vé, xác nhận trong cùng lô.
  assert.equal(g.status, 201, g.text);
  const v = (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json;
  const phiDon = v.order.services.flatMap((s: { legs: { id: string }[] }) => s.legs.map((l) => ({ legId: l.id, muc: MUC_20K })));
  const c = await w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: ADM, body: { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt, phiDon } });
  assert.equal(c.status, 200, c.text);
  return id;
}
const MUC_20K = { loai: "DANH_SACH", soTien: 20_000 };
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

/** Phí đưa đón áp từ hôm nay (ngày bắt đầu áp — công tắc của pricing). Mức do văn phòng chọn trên đơn (ADR-0214): 20.000 đ/khách. */
async function batPhiDon(w: W): Promise<void> {
  const tuLuc = (await w.call("GET", "/api/pricing/phi-don", { as: ADM })).json.batDauAp.tuLuc;
  const b = await w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as: ADM, body: { ngay: inDays(0), tuLucDaDoc: tuLuc } });
  assert.equal(b.status, 200, b.text);
}

test("Đ1 mục 9: giá đại lý đọc NHIỀU đơn một lượt trùng từng đơn (`phanThuongMaiCuaDon` + `tinhDongDoiTac`) + Σ phí đón, kể cả đơn đã sửa số khách và đơn văn phòng lập cho đối tác", async () => {
  const w = dung();
  await hanMuc(w, true);
  await batPhiDon(w);
  const a = await donDaiLy(w, GIAM);
  const b = await donDaiLy(w, 0, [leg(inDays(3), "06:30")]);
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Ba", customerPhone: "0912345670", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3), [{ ...leg(inDays(3), "06:30"), phiDon: MUC_20K }]), svc("ZA1", inDays(3))] } });
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
    // Phí đón HIỆN HÀNH của đơn (chi tiết đơn đã áp dòng điều chỉnh) = `phiDon`; tổng = Σ giá đại lý dịch vụ + phí.
    const phiDon = ((await w.call("GET", `/api/orders/${id}`, { as: ACC })).json.order.phiDuaDon?.dong ?? []).reduce((t: number, d: { lineTotal: number }) => t + d.lineTotal, 0);
    assert.equal(g.phiDon, phiDon, `đơn ${id}: phí đón trùng chi tiết đơn`);
    assert.equal(g.tong, motDon.reduce((t: number, d: { giaDaiLy: number }) => t + d.giaDaiLy, 0) + phiDon, `đơn ${id}: tổng = Σ giá đại lý + phí đón`);
    assert.equal(g.laDonDaiLy, true, "bên đặt mang vai được hưởng");
  }
  assert.deepEqual([nhieu.get(a).phiDon, nhieu.get(c).phiDon], [0, 40_000], "đơn không lượt đón: 0; đơn văn phòng lập: 20.000 × 2");
  assert.equal(nhieu.get(b).phiDon, 60_000, "đơn sửa thành 3 người lớn: phí theo khách tính lại 20.000 × 3");
  assert.equal(nhieu.get(b).tong, 3 * 300_000 - 3 * 50_000 + 60_000, "đơn sửa thành 3 người lớn: tính theo số hiện hành, gồm phí");
});

// ---- Đ2 mục 2: phiếu công nợ với Tour Đảo (route `GET /api/orders/:id/cong-no-dai-ly`) ----
const SA = "77777777-7777-4777-8777-777777777777"; // = SUP của khung
const ADM_ = "33333333-3333-4333-8333-333333333333";
const DT_KHAC = "88888888-8888-4888-8888-888888888809";
const phieu = (w: W, id: string, as: string, duoi = "") => w.call("GET", `/api/orders/${id}/cong-no-dai-ly${duoi}`, { as });
async function caiTaiKhoan(w: W): Promise<void> {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const r = await w.call("PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { as: SA, body: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null } });
  assert.equal(r.status, 200, r.text);
}

test("Đ2 mục 2: phiếu theo giá đại lý có QR = Công nợ còn lại do máy chủ tính (không nhận số từ đường dẫn), nội dung có tiền tố DL; trả dư thì «Tour Đảo nợ đại lý», không QR", async () => {
  const w = dung();
  await hanMuc(w, true);
  await caiTaiKhoan(w);
  const id = await donDaiLy(w, GIAM);
  const r = await phieu(w, id, DT, "?soTien=1000&conLai=1");
  assert.equal(r.status, 200, r.text);
  const p = r.json.phieu;
  assert.deepEqual([p.tong, p.daThu, p.conLai], [500_000, 0, 500_000]);
  assert.deepEqual(p.dong.map((d: { giaDaiLy: number; thieuMuc: boolean }) => [d.giaDaiLy, d.thieuMuc]), [[500_000, false]]);
  assert.ok(p.hanTra, "đơn Trả sau có hạn trả");
  assert.equal(p.qr.soTien, 500_000, "số trên QR = Công nợ còn lại, không phải ?soTien");
  assert.match(p.qr.noiDung, /^DL/, "nội dung chuyển khoản có tiền tố DL");
  assert.equal(Object.hasOwn(p.dong[0], "hoaHong"), false, "phiếu không kèm số hoa hồng / tỷ lệ (chỉ giá đại lý)");
  assert.equal((await congTyThu(w, id, 300_000)).status, 201);
  assert.equal((await congTyThu(w, id, 250_000)).status, 201);
  const du = (await phieu(w, id, DT)).json.phieu;
  assert.deepEqual([du.daThu, du.conLai, du.qr], [550_000, -50_000, null], "Tour Đảo nhận dư: còn lại âm, không QR");
});

test("Đ2 mục 2: chỉ đơn đã xác nhận; có QR bất kể công tắc ADR-0178 (dấu Tắt); không phải đơn đại lý thì không có phiếu", async () => {
  const w = dung();
  await hanMuc(w, true);
  await caiTaiKhoan(w);
  const nhap = await w.call("POST", "/api/orders", { as: DT, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], paymentTerm: "CREDIT" } });
  const chua = await phieu(w, nhap.json.order.id, DT);
  assert.deepEqual([chua.status, chua.json.error.code, chua.json.error.message], [409, "phieu_requires_confirmed", "Phiếu công nợ có sau khi đơn được xác nhận."]);
  const tat = await w.call("POST", "/api/kenh-thu-doi-tac", { as: SA, body: { congTyThu: false } }); // công tắc «Khách của đối tác trả cho Công ty» = Tắt TRƯỚC khi lập (dấu chụp lúc lập)
  assert.equal(tat.status, 200, tat.text);
  const id = await donDaiLy(w);
  assert.equal(w.q("SELECT company_collects_snapshot AS d FROM orders WHERE id = ?", id)[0].d, 0, "đơn mang dấu Tắt");
  const r = await phieu(w, id, DT);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.phieu.qr?.soTien, TONG - HOA_HONG, "tiền đại lý nộp, không phải tiền khách: có QR bất kể công tắc");
  const le = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Lẻ", customerPhone: "0912345671", services: [svc("ZB1", inDays(3))] } });
  assert.equal((await w.call("POST", `/api/orders/${le.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  const k = await phieu(w, le.json.order.id, ACC);
  assert.deepEqual([k.status, k.json.error?.code], [409, "khong_phai_don_dai_ly"], k.text);
});

test("Đ2 mục 2 / Đ3 dòng «Xem phiếu»: đại lý chủ đơn, Kế toán, Quản trị, Toàn quyền xem được; Bán hàng, đại lý khác không", async () => {
  const w = dung();
  seedStaff(w.sqlite, { id: DT_KHAC, phone: "0900000029", name: "Đối Tác Khác", perms: ["PARTNER"] });
  await hanMuc(w, true);
  const id = await donDaiLy(w);
  for (const ai of [DT, ACC, ADM_, SA]) assert.equal((await phieu(w, id, ai)).status, 200, `${ai} xem được`);
  // Bán hàng lập đơn cho đại lý: vẫn KHÔNG xem phiếu (xem đơn được nhưng không có ô xem công nợ).
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Ba", customerPhone: "0912345670", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  assert.equal((await phieu(w, r.json.order.id, A)).status, 403);
  assert.equal((await phieu(w, r.json.order.id, ACC)).status, 200);
  const khac = await phieu(w, id, DT_KHAC);
  assert.ok([403, 404].includes(khac.status), `đại lý khác: ${khac.status}`);
  assert.doesNotMatch(khac.text, /tong|conLai|payload/);
});

test("Đ1 mục 2: hoa hồng lớn hơn thành tiền ⇒ giá đại lý ÂM, không kẹp về 0 (khớp sổ ghi hoa hồng theo số gốc)", async () => {
  const w = dung();
  await hanMuc(w, false);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: ACC, body: { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 400_000, tuNgay: "2026-01-01" } });
  assert.equal(m.status, 201, m.text);
  const id = await donDaiLy(w);
  const g = (await app.giaDaiLyNhieuDon(w.env.DB, [id])).get(id);
  assert.equal(g.tong, TONG - 2 * 400_000, "600.000 − 800.000 = −200.000, không kẹp");
  assert.equal(await noDon(w, id), 0, "số dùng cho hạn mức kẹp ≥ 0 từng đơn (Đ1 mục 8)");
  const p = (await phieu(w, id, ACC)).json.phieu;
  assert.deepEqual([p.tong, p.conLai, p.qr], [-200_000, -200_000, null], "phiếu hiện số âm (Tour Đảo nợ đại lý), không QR");
});
