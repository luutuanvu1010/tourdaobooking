// Luật thuần của sổ công nợ lượt 1 (src/modules/billing/rules.ts — kế hoạch Task 5; NT-S1, NT-S4, NT-S8, NT-F1 phần lý do, NT-R9 phần "một hàm").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  HAN_YEU_CAU_NGAY, canDoiChieu, conLai, dong, hetHanYeuCau, hieuLuc, khoanChoXacNhan, khoanMoiDoiChieu, kiemDieuChinh, lyDoChuaGiaoDuoc, lyDoChuaHoanThanh, ngayPhatSinh, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan,
  sinhDongXacNhanCongTy, sinhPhieuDaGiao, soDuTheoBen, type LineDraft, type LineRow, type ReceiptRow,
} from "./rules.ts";

const CT = "cong-ty";
const HDV = "hdv-nam";
const HDV_B = "hdv-binh";
let n = 0;
const rc = (p: Partial<ReceiptRow> & { amount: number }): ReceiptRow => ({ id: `r${++n}`, kind: "CUSTOMER_PAYMENT", collectorRole: "STAFF", collectorPartyId: HDV, reversesId: null, ...p });
const ghi = (ds: LineDraft[], rows: LineRow[] = []): LineRow[] => [...rows, ...ds.map((d) => ({ ...d, id: `l${++n}`, orderId: "o1", receiptId: null }))];

test("conLai: đủ, thiếu, dư; hoàn khách trừ đã thu; cặp gốc/đảo bỏ; lần thu chưa rõ đếm riêng", () => {
  assert.deepEqual(conLai([], 1_000_000, "confirmed"), { daThu: 0, conLai: 1_000_000, du: 0, chuaRo: 0 });
  const a = rc({ amount: 600_000 });
  assert.deepEqual(conLai([a], 1_000_000, "confirmed"), { daThu: 600_000, conLai: 400_000, du: 0, chuaRo: 0 });
  const u = rc({ amount: 400_000, collectorRole: "UNKNOWN", collectorPartyId: null });
  assert.deepEqual(conLai([a, u], 1_000_000, "confirmed"), { daThu: 1_000_000, conLai: 0, du: 0, chuaRo: 1 });
  const ud = rc({ amount: 400_000, collectorRole: "UNKNOWN", collectorPartyId: null, reversesId: u.id });
  assert.deepEqual(conLai([a, u, ud], 1_000_000, "confirmed"), { daThu: 600_000, conLai: 400_000, du: 0, chuaRo: 0 }, "đảo lần thu chưa rõ: cặp bỏ khỏi đã thu");
  assert.deepEqual(conLai([a, rc({ amount: 500_000 })], 1_000_000, "confirmed"), { daThu: 1_100_000, conLai: 0, du: 100_000, chuaRo: 0 }, "khách trả dư (M2)");
  assert.deepEqual(conLai([a, rc({ amount: 500_000 }), rc({ amount: 100_000, kind: "CUSTOMER_REFUND" })], 1_000_000, "confirmed"), { daThu: 1_000_000, conLai: 0, du: 0, chuaRo: 0 });
  assert.deepEqual(hieuLuc([a, u, ud]).map((r) => r.id), [a.id]);
});

test("NT-S1 (luật thuần, ADR-0120): HDV thu 1.000.000 tiền mặt → giữ 1.000.000; khai 'Công ty thu – CK' 500.000 → KHÔNG giữ thêm (đang đối chiếu); Kế toán ghi đã nộp → về 0", () => {
  let lines = ghi(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 1_000_000, collectorRole: "STAFF", collectorPartyId: HDV, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }));
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_000_000);
  const ck = { kind: "CUSTOMER_PAYMENT", amount: 500_000, collectorRole: "COMPANY", collectorPartyId: CT, method: "BANK_TRANSFER", nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT } as const;
  assert.deepEqual(sinhDongLanThu(ck), [], "khoản công ty thu do HDV khai không sinh dòng giữ hộ");
  assert.equal(canDoiChieu(ck), true, "mà là khoản đang đối chiếu");
  assert.equal(canDoiChieu({ ...ck, nguoiGhiLaKeToan: true }), false, "Kế toán tự ghi: đã về công ty, không đối chiếu");
  assert.equal(canDoiChieu({ ...ck, nguoiGhiPartyId: CT }), false);
  assert.equal(canDoiChieu({ ...ck, collectorRole: "STAFF" }), false, "người thu là nhân viên: đi đường giữ hộ");
  // Chủ chốt 2026-10-15: CHỈ chuyển khoản. Tiền mặt "Công ty thu" do người khác khai giữ luật H3 cũ: dòng giữ hộ trên người khai, không đối chiếu.
  const mat = { ...ck, method: "CASH" } as const;
  assert.equal(canDoiChieu(mat), false);
  assert.equal(canDoiChieu({ ...ck, method: "OTHER" }), false);
  assert.deepEqual(sinhDongLanThu(mat), [{ debtorPartyId: HDV, creditorPartyId: CT, amount: 500_000, kind: "HELD", reversesLineId: null }]);
  assert.deepEqual(sinhDongLanThu({ ...mat, nguoiGhiLaKeToan: true }), [], "Kế toán tự ghi tiền mặt Công ty thu: không dòng");
  assert.equal(canDoiChieu({ ...ck, kind: "CUSTOMER_REFUND" }), false);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_000_000, "nợ HDV không tăng");
  lines = ghi(sinhDongQuyetToan({ nguoiNopPartyId: HDV, congTyId: CT, phanBo: [{ orderId: "o1", amount: 1_000_000 }] }), lines);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 0);
});

test("khoanChoXacNhan (ADR-0120): khoản MỚI = DECLARED chưa CONFIRMED, lần thu chưa bị đảo; khoản CŨ vẫn theo dòng giữ hộ", () => {
  const rc = [{ id: "m", collectorRole: "COMPANY" as const }, { id: "c", collectorRole: "COMPANY" as const }, { id: "x", collectorRole: "STAFF" as const }];
  const held = [{ id: "l1", kind: "HELD" as const, receiptId: "c", reversesLineId: null, debtorPartyId: HDV, creditorPartyId: CT, amount: 100 }];
  assert.deepEqual([...khoanChoXacNhan(rc, held, [{ receiptId: "m", kind: "DECLARED" }])].sort(), ["c", "m"]);
  assert.deepEqual([...khoanChoXacNhan(rc, held, [{ receiptId: "m", kind: "DECLARED" }, { receiptId: "m", kind: "CONFIRMED" }])], ["c"], "đã xác nhận thì hết chờ");
  assert.deepEqual([...khoanChoXacNhan([...rc, { id: "d", collectorRole: "COMPANY", reversesId: "m" }], [], [{ receiptId: "m", kind: "DECLARED" }])], [], "lần thu đã bị đảo thì hết chờ");
  assert.deepEqual([...khoanMoiDoiChieu(rc, [{ receiptId: "x", kind: "DECLARED" }])], [], "chỉ lần thu vai Công ty");
  assert.deepEqual([...khoanMoiDoiChieu(rc, [{ receiptId: "m", kind: "DECLARED" }])], ["m"], "khoản cũ không nằm trong 'mới'");
});

test("sinhDongLanThu: Kế toán tự ghi 'Công ty thu' → không dòng; chưa rõ → không dòng; trả lại khách không đi đường này", () => {
  assert.deepEqual(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 5, collectorRole: "COMPANY", collectorPartyId: CT, nguoiGhiPartyId: "ke-toan", nguoiGhiLaKeToan: true, congTyId: CT }), []);
  assert.deepEqual(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 5, collectorRole: "UNKNOWN", collectorPartyId: null, nguoiGhiPartyId: "he-thong", nguoiGhiLaKeToan: false, congTyId: CT }), []);
  assert.deepEqual(sinhDongLanThu({ kind: "CUSTOMER_REFUND", amount: 5, collectorRole: "STAFF", collectorPartyId: HDV, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }), []);
  // Kế toán ghi thay: người thu là HDV B (không phải người ghi) → nợ trên HDV B.
  assert.deepEqual(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 7, collectorRole: "STAFF", collectorPartyId: HDV_B, nguoiGhiPartyId: "ke-toan", nguoiGhiLaKeToan: true, congTyId: CT }),
    [{ debtorPartyId: HDV_B, creditorPartyId: CT, amount: 7, kind: "HELD", reversesLineId: null }]);
});

test("NT-S4 (luật thuần): dòng đảo cùng số, đổi chỗ hai bên, trỏ gốc; số dư về 0", () => {
  const goc = ghi(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 250_000, collectorRole: "STAFF", collectorPartyId: HDV, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }));
  const dao = sinhDongDao(goc[0]!);
  assert.deepEqual(dao, { debtorPartyId: CT, creditorPartyId: HDV, amount: 250_000, kind: "HELD", reversesLineId: goc[0]!.id });
  assert.equal(soDuTheoBen(ghi([dao], goc), CT).get(HDV), 0);
});

test("hoàn khách: công ty tự trả → không dòng; HDV trả bằng tiền đang giữ → công ty nợ HDV đúng số đó (bù phần giữ hộ)", () => {
  assert.deepEqual(sinhDongHoanKhach({ nguoiTraPartyId: CT, congTyId: CT, so: 100_000 }), []);
  let lines = ghi(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 1_100_000, collectorRole: "STAFF", collectorPartyId: HDV, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }));
  lines = ghi(sinhDongHoanKhach({ nguoiTraPartyId: HDV, congTyId: CT, so: 100_000 }), lines);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_000_000);
});

test("phiếu Đã giao lượt 1 không có dòng thương mại; số dư: công ty còn nợ một bên = âm (không chặn Hoàn thành)", () => {
  assert.deepEqual(sinhPhieuDaGiao(), []);
  const lines = ghi(sinhDongHoanKhach({ nguoiTraPartyId: HDV, congTyId: CT, so: 20_000 }));
  assert.equal(soDuTheoBen(lines, CT).get(HDV), -20_000);
});

const base = { status: "confirmed" as const, deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-09", "2026-10-10"], dichVuThieuNgay: [], coNguoiHuong: false, soKhoanDoiChieu: 0 };
const du = (daThu: number, phaiThu: number, chuaRo = 0) => ({ ...conLai([], phaiThu, "confirmed"), daThu, conLai: Math.max(0, phaiThu - daThu), du: Math.max(0, daThu - phaiThu), chuaRo });

test("lyDoChuaGiaoDuoc (NT-F1, NT-F6c, M1 = A): thứ tự lý do cố định, câu tiếng Việt + ai xử lý; đủ điều kiện → null", () => {
  assert.equal(lyDoChuaGiaoDuoc({ ...base, so: du(1_000_000, 1_000_000) }), null);
  assert.equal(lyDoChuaGiaoDuoc({ ...base, status: "draft", so: du(0, 1) })!.ma, "not_confirmed");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, status: "cancelled", so: du(0, 1) })!.ma, "cancelled");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, deliveredAt: "x", so: du(0, 1) })!.ma, "already_delivered");
  const thieuNgay = lyDoChuaGiaoDuoc({ ...base, ngayDi: ["2026-10-09", null], dichVuThieuNgay: ["Vé Hòn Tằm"], so: du(1, 1) })!;
  assert.deepEqual([thieuNgay.ma, thieuNgay.cau, thieuNgay.aiXuLy], ["missing_date", "Dịch vụ Vé Hòn Tằm chưa có ngày đi — sửa đơn trước.", "Người lập đơn"]);
  const som = lyDoChuaGiaoDuoc({ ...base, homNay: "2026-10-09", so: du(1, 1) })!;
  assert.deepEqual([som.ma, som.cau], ["before_departure", "Chưa tới ngày đi (10/10/2026) — bấm từ ngày đi trở đi."], "ngày đi MUỘN NHẤT");
  const doiTac = lyDoChuaGiaoDuoc({ ...base, coNguoiHuong: true, so: du(1, 1) })!;
  assert.deepEqual([doiTac.ma, doiTac.cau, doiTac.aiXuLy], ["booker_partner", "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới bản cập nhật sổ đại lý.", "Văn phòng"], "sổ đại lý đợt 1 đổi chữ (N5); luật chặn giữ nguyên");
  const doiChieu = lyDoChuaGiaoDuoc({ ...base, soKhoanDoiChieu: 1, so: du(1_000_000, 1_000_000) })!;
  assert.deepEqual([doiChieu.ma, doiChieu.aiXuLy], ["reconciling", "Kế toán"], "ADR-0120: còn khoản Công ty thu đang đối chiếu ⇒ chưa Đã giao");
  const chuaRo = lyDoChuaGiaoDuoc({ ...base, so: du(1_000_000, 1_000_000, 1) })!;
  assert.deepEqual([chuaRo.ma, chuaRo.aiXuLy], ["unknown_collector", "Kế toán"]);
  const thieu = lyDoChuaGiaoDuoc({ ...base, so: du(600_000, 1_000_000) })!;
  assert.deepEqual([thieu.ma, thieu.cau, thieu.aiXuLy], ["underpaid", "Còn thiếu 400.000 ₫ — ghi thêm khoản thu hoặc sửa đơn trước.", "Hướng dẫn viên"]);
  const thua = lyDoChuaGiaoDuoc({ ...base, so: du(1_050_000, 1_000_000) })!;
  assert.deepEqual([thua.ma, thua.cau, thua.aiXuLy], ["overpaid", "Khách đã trả dư 50.000 ₫ — chờ Kế toán hoàn.", "Kế toán"]);
  assert.equal(lyDoChuaGiaoDuoc({ ...base, ngayDi: [], so: du(0, 0) })!.ma, "missing_date", "đơn không dịch vụ nào");
});

test("lyDoChuaHoanThanh: chưa Đã giao; đã Hoàn thành; còn bên nợ công ty (tên, số — không SĐT); công ty còn nợ bên khác không chặn", () => {
  const ten = (id: string) => ({ [HDV]: "HDV Nam" } as Record<string, string>)[id] ?? id;
  assert.equal(lyDoChuaHoanThanh({ deliveredAt: null, completedAt: null, soDu: new Map(), tenBen: ten })!.ma, "not_delivered");
  assert.equal(lyDoChuaHoanThanh({ deliveredAt: "x", completedAt: "y", soDu: new Map(), tenBen: ten })!.ma, "already_completed");
  const r = lyDoChuaHoanThanh({ deliveredAt: "x", completedAt: null, soDu: new Map([[HDV, 400_000]]), tenBen: ten })!;
  assert.equal(r.cau, "Còn người giữ tiền của công ty: HDV Nam đang giữ 400.000 ₫ — ghi nộp tiền / xác nhận công ty đã nhận trước.");
  assert.equal(lyDoChuaHoanThanh({ deliveredAt: "x", completedAt: null, soDu: new Map([[HDV, -20_000]]), tenBen: ten }), null);
});

test("NT-S8: ngày phát sinh — mặc định hôm nay; Kế toán chọn ngày khác (không sau hôm nay); người khác chọn ngày khác → từ chối; sai dạng → từ chối", () => {
  assert.deepEqual(ngayPhatSinh({ chon: undefined, homNay: "2026-10-10", laKeToan: false, kyDaKhoa: () => false }), { ok: true, value: "2026-10-10" });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-10", homNay: "2026-10-10", laKeToan: false, kyDaKhoa: () => false }), { ok: true, value: "2026-10-10" });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-10", laKeToan: true, kyDaKhoa: () => false }), { ok: true, value: "2026-10-01" });
  assert.equal(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-10", laKeToan: false, kyDaKhoa: () => false }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "2026-10-11", homNay: "2026-10-10", laKeToan: true, kyDaKhoa: () => false }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "2026-02-30", homNay: "2026-10-10", laKeToan: true, kyDaKhoa: () => false }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "10/10/2026", homNay: "2026-10-10", laKeToan: true, kyDaKhoa: () => false }).ok, false);
});

test("ngayPhatSinh: Kế toán chọn ngày thuộc tháng đã khoá ⇒ lỗi khoa với câu cauKyKhoa", () => {
  const kyDaKhoa = (n: string) => n.startsWith("2026-09");
  const r = ngayPhatSinh({ chon: "2026-09-30", homNay: "2026-10-08", laKeToan: true, kyDaKhoa });
  assert.deepEqual(r, { ok: false, message: "Tháng 09/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)", khoa: true });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-08", laKeToan: true, kyDaKhoa }), { ok: true, value: "2026-10-01" });
  assert.deepEqual(ngayPhatSinh({ chon: undefined, homNay: "2026-10-08", laKeToan: false, kyDaKhoa }), { ok: true, value: "2026-10-08" });
});

test("dong(): định dạng tiền không phụ thuộc máy", () => {
  assert.equal(dong(0), "0 ₫");
  assert.equal(dong(1_350_000), "1.350.000 ₫");
  assert.equal(dong(999), "999 ₫");
});

// Đối chiếu HAI NƠI cùng định nghĩa "đã thu ròng / còn hiệu lực / chưa rõ": hàm `conLai` (mã) và view `v_bil_order_paid` + trigger `bil_posting_delivered_paid`
// (migration) trên CÙNG dữ liệu mẫu — lệch một bên là đỏ.
test("đối chiếu conLai ↔ v_bil_order_paid ↔ trigger bil_posting_delivered_paid trên cùng dữ liệu mẫu", () => {
  const dir = new URL("../../../migrations/", import.meta.url);
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF"); // chỉ cần bảng bil_ và orders; không dựng hồ sơ/khách
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const AT = "2026-09-30T00:00:00.000Z";
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's', 'confirmed', 'K', '0', '${AT}', '${AT}')`);
  const mau: ReceiptRow[] = [];
  const them = (r: ReceiptRow) => {
    mau.push(r);
    db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, created_at, updated_at) VALUES (?, 'o1', ?, ?, ?, ?, 'CASH', 'ct', 'PREPAID', '2026-09-30', ?, ?, ?)`)
      .run(r.id, r.kind, r.amount, r.collectorPartyId, r.collectorRole, r.reversesId, AT, AT);
  };
  const u = rc({ amount: 300_000, collectorRole: "UNKNOWN", collectorPartyId: null });
  them(u);
  them(rc({ amount: 900_000 }));
  them(rc({ amount: 300_000, collectorRole: "UNKNOWN", collectorPartyId: null, reversesId: u.id }));
  them(rc({ amount: 300_000 }));
  // Hoàn do CÔNG TY trả (0082 Đ3: người khác trả phải đang giữ tiền trên đơn — dữ liệu mẫu này không có dòng nợ).
  them(rc({ amount: 200_000, kind: "CUSTOMER_REFUND", collectorRole: "COMPANY", collectorPartyId: String((db.prepare("SELECT party_id FROM v_pty_owner_company").get() as { party_id: string }).party_id) }));
  const ma = conLai(mau, 1_000_000, "confirmed");
  const view = db.prepare("SELECT paid_net, unknown_count FROM v_bil_order_paid WHERE order_id = 'o1'").get() as { paid_net: number; unknown_count: number };
  assert.deepEqual([view.paid_net, view.unknown_count], [ma.daThu, ma.chuaRo]);
  const phieu = (due: number) => db.prepare(`INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, due_snapshot, created_at, updated_at) VALUES (?, 'DELIVERED', 'o1', '2026-09-30', ?, ?, ?)`)
    .run(`p${++n}`, due, AT, AT);
  assert.throws(() => phieu(ma.daThu + 1), /delivered_not_paid:/);
  assert.equal(ma.daThu, 1_000_000);
  phieu(ma.daThu); // khớp đúng số hàm tính → trigger cho qua
});

// ---- ADR-0115 đợt 1: điều chỉnh công nợ cần duyệt — trần cộng dồn (MỘT hàm), hết hạn 7 ngày ----
test("kiemDieuChinh: giảm nợ ≤ số đang nợ (Đ5a, không đổi dấu); vượt → adjustment_flips_sign; hướng = DECREASE", () => {
  const ok = kiemDieuChinh({ nguoc: 300_000, soTien: 300_000, phaiThu: 500_000, daThu: 0 });
  assert.deepEqual(ok.ok && ok.huong, "DECREASE");
  const bad = kiemDieuChinh({ nguoc: 300_000, soTien: 300_001, phaiThu: 500_000, daThu: 0 });
  assert.equal(bad.ok, false);
  assert.equal(!bad.ok && bad.ma, "adjustment_flips_sign");
});

test("kiemDieuChinh: tăng nợ ≤ trần = max(phải thu, đã thu ròng) một lệnh — như ADR-0092 Đ5b — và hướng = INCREASE", () => {
  const ok = kiemDieuChinh({ nguoc: 0, soTien: 500_000, phaiThu: 500_000, daThu: 300_000 });
  assert.equal(ok.ok && ok.huong, "INCREASE");
  assert.equal(ok.ok && ok.tran, 500_000);
  assert.equal(kiemDieuChinh({ nguoc: 0, soTien: 500_001, phaiThu: 500_000, daThu: 300_000 }).ok, false);
  assert.equal(kiemDieuChinh({ nguoc: -50_000, soTien: 700_000, phaiThu: 500_000, daThu: 800_000 }).ok, true, "đã thu lớn hơn phải thu: trần theo đã thu");
});

test("ADR-0115 điều 4 (C-2): trần tính CỘNG DỒN — điều chỉnh tăng nợ đã có + yêu cầu tăng nợ đang chờ + lệnh mới ≤ trần", () => {
  const dau = { nguoc: 0, phaiThu: 500_000, daThu: 300_000 };
  // Lệnh đầu 500.000 (trần 500.000) qua; lệnh hai 500.000 khi lệnh đầu đang CHỜ → chặn lúc tạo.
  assert.equal(kiemDieuChinh({ ...dau, soTien: 500_000, tangDaCo: 0, tangDangCho: 0 }).ok, true);
  const hai = kiemDieuChinh({ ...dau, soTien: 500_000, tangDaCo: 0, tangDangCho: 500_000 });
  assert.equal(hai.ok, false);
  assert.equal(!hai.ok && hai.ma, "adjustment_exceeds_cap");
  // Lệnh đầu đã duyệt (còn hiệu lực) thì lệnh hai bị chặn như nhau.
  assert.equal(kiemDieuChinh({ ...dau, soTien: 1, tangDaCo: 500_000, tangDangCho: 0 }).ok, false);
  // Vừa khít trần cộng dồn thì qua; thêm 1 đồng thì chặn.
  assert.equal(kiemDieuChinh({ ...dau, soTien: 200_000, tangDaCo: 200_000, tangDangCho: 100_000 }).ok, true);
  assert.equal(kiemDieuChinh({ ...dau, soTien: 200_001, tangDaCo: 200_000, tangDangCho: 100_000 }).ok, false);
  // Giảm nợ không đếm vào trần cộng dồn (kiểm theo số dư lúc duyệt).
  assert.equal(kiemDieuChinh({ nguoc: 300_000, soTien: 300_000, phaiThu: 500_000, daThu: 0, tangDaCo: 500_000, tangDangCho: 500_000 }).ok, true);
});

test("kiemDieuChinh trả sẵn số cho lính gác của lô duyệt (tangDaCoToiDa = trần − lệnh − yêu cầu đang chờ), cùng MỘT công thức", () => {
  const k = kiemDieuChinh({ nguoc: 0, soTien: 200_000, phaiThu: 500_000, daThu: 0, tangDaCo: 100_000, tangDangCho: 50_000 });
  assert.equal(k.ok && k.tangDaCoToiDa, 500_000 - 200_000 - 50_000);
});

test("hết hạn: quá 7 ngày kể từ lúc tạo thì hết (đúng 7 ngày còn duyệt được); tính lúc đọc, không Cron", () => {
  assert.equal(HAN_YEU_CAU_NGAY, 7);
  const tao = "2026-10-01T03:00:00.000Z";
  assert.equal(hetHanYeuCau(tao, "2026-10-08T03:00:00.000Z"), false);
  assert.equal(hetHanYeuCau(tao, "2026-10-08T03:00:00.001Z"), true);
  assert.equal(hetHanYeuCau(tao, "2026-10-02T00:00:00.000Z"), false);
});

test("hằng 7 ngày của rules.ts và trigger bil_adjustment_request_expired (migration 0094) cùng một số", () => {
  const dir = new URL("../../../migrations/", import.meta.url);
  const f = readdirSync(dir).find((x) => x.endsWith("_bil_dieu_chinh_duyet.sql"))!;
  assert.match(readFileSync(new URL(f, dir), "utf8"), new RegExp(`julianday\\(\\(SELECT g\\.created_at[^\\n]*\\) > ${HAN_YEU_CAU_NGAY}\\b`));
});
