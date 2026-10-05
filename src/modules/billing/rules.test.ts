// Luật thuần của sổ công nợ lượt 1 (src/modules/billing/rules.ts — kế hoạch Task 5; NT-S1, NT-S4, NT-S8, NT-F1 phần lý do, NT-R9 phần "một hàm").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  conLai, dong, hieuLuc, lyDoChuaGiaoDuoc, lyDoChuaHoanThanh, ngayPhatSinh, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan,
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

test("NT-S1 (luật thuần): HDV thu 1.000.000 tiền mặt → giữ 1.000.000; khai 'Công ty thu – CK' 500.000 → giữ thêm tới khi Kế toán xác nhận; Kế toán ghi đã nộp → về 0", () => {
  let lines = ghi(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 1_000_000, collectorRole: "STAFF", collectorPartyId: HDV, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }));
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_000_000);
  lines = ghi(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: 500_000, collectorRole: "COMPANY", collectorPartyId: CT, nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT }), lines);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_500_000, "khoản công ty thu do HDV khai vẫn là nợ người khai (H3)");
  const giuCK = lines.at(-1)!;
  lines = ghi([sinhDongXacNhanCongTy(giuCK)], lines);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 1_000_000, "Kế toán bấm 'Công ty đã nhận' → hết phần đó");
  lines = ghi(sinhDongQuyetToan({ nguoiNopPartyId: HDV, congTyId: CT, phanBo: [{ orderId: "o1", amount: 1_000_000 }] }), lines);
  assert.equal(soDuTheoBen(lines, CT).get(HDV), 0);
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

const base = { status: "confirmed" as const, deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-09", "2026-10-10"], dichVuThieuNgay: [], coNguoiHuong: false };
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
  assert.equal(lyDoChuaGiaoDuoc({ ...base, coNguoiHuong: true, so: du(1, 1) })!.ma, "booker_partner");
  const chuaRo = lyDoChuaGiaoDuoc({ ...base, so: du(1_000_000, 1_000_000, 1) })!;
  assert.deepEqual([chuaRo.ma, chuaRo.aiXuLy], ["unknown_collector", "Kế toán"]);
  const thieu = lyDoChuaGiaoDuoc({ ...base, so: du(600_000, 1_000_000) })!;
  assert.deepEqual([thieu.ma, thieu.cau, thieu.aiXuLy], ["underpaid", "Còn thiếu 400.000 ₫ — ghi thêm lần thu hoặc sửa đơn trước.", "Hướng dẫn viên"]);
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
  assert.deepEqual(ngayPhatSinh({ chon: undefined, homNay: "2026-10-10", laKeToan: false }), { ok: true, value: "2026-10-10" });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-10", homNay: "2026-10-10", laKeToan: false }), { ok: true, value: "2026-10-10" });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-10", laKeToan: true }), { ok: true, value: "2026-10-01" });
  assert.equal(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-10", laKeToan: false }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "2026-10-11", homNay: "2026-10-10", laKeToan: true }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "2026-02-30", homNay: "2026-10-10", laKeToan: true }).ok, false);
  assert.equal(ngayPhatSinh({ chon: "10/10/2026", homNay: "2026-10-10", laKeToan: true }).ok, false);
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
