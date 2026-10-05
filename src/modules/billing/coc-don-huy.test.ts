// Đơn huỷ và cọc — luật thuần của billing/rules.ts (ADR-0089; kế hoạch Đợt 1 Task 2 — NT-1, NT-2, NT-D1–D5, NT-H2–H4, NT-H6, NT-H8, NT-N2–N4, NT-B1).
// Mỗi ca sổ vàng SV-DH viết lại ở mức luật thuần (đỏ → xanh ngay, không chờ Kế toán xác nhận sổ vàng — kế hoạch Task 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conLai, conLaiCuaKhoan, hanHoanCoc, khoanChoXacNhan, kiemChi, kiemDuyet, kiemGhiHoanNgoai, kiemHuyDuyet, kiemXacNhanHoanNgoai, nhacCoc, soTienCoc,
  type DuyetRow, type HoanNgoaiRow, type LineRow, type ReceiptRow,
} from "./rules.ts";

const CT = "cong-ty";
const HDV = "hdv-nam";
let n = 0;
const rc = (p: Partial<ReceiptRow> & { amount: number }): ReceiptRow => ({ id: `r${++n}`, kind: "CUSTOMER_PAYMENT", collectorRole: "STAFF", collectorPartyId: HDV, reversesId: null, ...p });
const duyetGoc = (p: Partial<DuyetRow> & { amount: number }): DuyetRow => ({ id: `d${++n}`, kind: "REFUND", voidsId: null, targetOrderId: null, createdBy: "qt", approvedDate: "2026-11-01", ...p });
const coc0 = (receipts: ReceiptRow[], duyet: DuyetRow[] = [], hoanNgoai: HoanNgoaiRow[] = [], lines: LineRow[] = []) => soTienCoc({ receipts, lines, duyet, hoanNgoai });
const ma = (r: { ok: boolean }) => (r.ok ? "" : (r as { ma: string }).ma);

test("NT-1 (đ1, H-C8): đơn HUỶ → còn lại 0, dư 0 dù đã thu một phần hay thu dư; đơn không huỷ giữ nguyên", () => {
  const coc = rc({ amount: 50_000 });
  assert.deepEqual(conLai([coc], 200_000, "cancelled"), { daThu: 50_000, conLai: 0, du: 0, chuaRo: 0 }, "kiem-lai-09: đơn 200.000, cọc 50.000, huỷ → không còn 150.000");
  assert.deepEqual(conLai([rc({ amount: 300_000 })], 200_000, "cancelled"), { daThu: 300_000, conLai: 0, du: 0, chuaRo: 0 }, "dư không thành 'chờ hoàn' — hoàn qua khoản duyệt");
  assert.deepEqual(conLai([coc], 200_000, "confirmed"), { daThu: 50_000, conLai: 150_000, du: 0, chuaRo: 0 });
  assert.deepEqual(conLai([coc], 200_000, "draft"), { daThu: 50_000, conLai: 150_000, du: 0, chuaRo: 0 });
});

test("NT-2 (đ2): đã trả chỉ gồm lần thu đã xác nhận; 'Công ty thu – CK' còn dòng giữ hộ chưa đảo là đang đối chiếu; xác nhận xong thì tính", () => {
  const ck = rc({ amount: 300_000, collectorRole: "COMPANY", collectorPartyId: CT });
  const held: LineRow = { id: "lh", debtorPartyId: HDV, creditorPartyId: CT, amount: 300_000, kind: "HELD", orderId: "o1", receiptId: ck.id, reversesLineId: null };
  const tm = rc({ amount: 200_000 });
  assert.deepEqual([...khoanChoXacNhan([ck, tm], [held])], [ck.id]);
  let s = coc0([ck, tm], [], [], [held]);
  assert.deepEqual([s.daTra, s.dangDoiChieu, s.conGiu], [200_000, 300_000, 200_000], "SV-DH-10 trước xác nhận");
  const daoHeld: LineRow = { ...held, id: "lh2", debtorPartyId: CT, creditorPartyId: HDV, reversesLineId: "lh" };
  assert.deepEqual([...khoanChoXacNhan([ck, tm], [held, daoHeld])], []);
  s = coc0([ck, tm], [], [], [held, daoHeld]);
  assert.deepEqual([s.daTra, s.dangDoiChieu], [500_000, 0], "Kế toán 'Công ty đã nhận' → tính vào đã trả");
  assert.equal(coc0([rc({ amount: 100_000, collectorRole: "COMPANY", collectorPartyId: CT })]).daTra, 100_000, "Kế toán tự ghi 'Công ty thu' (không dòng giữ hộ) → đã trả ngay");
});

test("SV-DH-01/02 (luật thuần): khách huỷ giữ cọc 500.000; duyệt 200.000 → chi 200.000 → còn giữ 300.000; chi thêm 1 → vượt khoản", () => {
  const thu = rc({ amount: 500_000, collectorRole: "COMPANY", collectorPartyId: CT });
  let s = coc0([thu]);
  assert.deepEqual([s.daTra, s.conGiu, s.daDuyet, s.choChi], [500_000, 500_000, 0, 0]);
  const d = duyetGoc({ amount: 200_000 });
  s = coc0([thu], [d]);
  assert.deepEqual([s.daDuyet, s.choChi, s.conGiu], [200_000, 200_000, 500_000]);
  const chi = rc({ amount: 200_000, kind: "CUSTOMER_REFUND", collectorRole: "COMPANY", collectorPartyId: CT, approvalId: d.id });
  s = coc0([thu, chi], [d]);
  assert.deepEqual([s.daDuyet, s.daChi, s.conGiu, s.choChi], [200_000, 200_000, 300_000, 0]);
  assert.equal(conLaiCuaKhoan(d.id, [d], [thu, chi]), 0);
  assert.equal(ma(kiemChi({ conLaiKhoan: 0, soTien: 1, nguoiChi: "kt", nguoiDuyet: "qt", nguoiTraDangGiu: null })), "coc_exceeds_approved");
});

test("NT-D1 (đ5): hạn = ngày khởi hành muộn nhất + 60; đơn chưa có ngày đi → ngày huỷ + 60 (SV-DH-12)", () => {
  assert.equal(hanHoanCoc({ ngayDi: ["2026-11-10"], ngayHuy: "2026-10-05" }), "2027-01-09");
  assert.equal(hanHoanCoc({ ngayDi: ["2026-11-10", "2026-11-12", null], ngayHuy: "2026-10-05" }), "2027-01-11", "nhiều ngày → muộn nhất");
  assert.equal(hanHoanCoc({ ngayDi: [], ngayHuy: "2026-10-05" }), "2026-12-04");
  assert.equal(hanHoanCoc({ ngayDi: [null], ngayHuy: "2026-10-05" }), "2026-12-04");
});

test("NT-D2/D3 (đ5, H-C3): khách huỷ — duyệt đúng ngày hạn được, sau hạn chặn; công ty huỷ / lập lại không bị hạn chặn; chưa kết luận bị chặn (X-2)", () => {
  const s = coc0([rc({ amount: 500_000 })]);
  const han = "2027-01-09";
  assert.deepEqual(kiemDuyet({ coc: s, nhom: "KHACH_HUY", han, homNay: "2027-01-09", soTien: 100_000 }), { ok: true }, "biên: ngày duyệt = hạn → được");
  assert.deepEqual(kiemDuyet({ coc: s, nhom: "KHACH_HUY", han, homNay: "2027-01-10", soTien: 100_000 }), { ok: false, ma: "coc_deadline", cau: "Đã quá hạn hoàn cọc (hạn: 09/01/2027)." });
  assert.deepEqual(kiemDuyet({ coc: s, nhom: "CONG_TY_HUY", han, homNay: "2027-01-20", soTien: 500_000 }), { ok: true }, "SV-DH-04");
  assert.deepEqual(kiemDuyet({ coc: s, nhom: "LAP_LAI", han, homNay: "2027-03-01", soTien: 300_000 }), { ok: true }, "SV-DH-06");
  assert.equal(ma(kiemDuyet({ coc: s, nhom: "CHUA_KET_LUAN", han, homNay: "2026-11-01", soTien: 1 })), "coc_unclassified", "SV-DH-11");
});

test("NT-H2 + đ15 (lời chủ (c)): tổng duyệt ≤ tiền còn giữ lúc huỷ = đã trả − hoàn trước huỷ (SV-DH-13: trả 1.200.000, hoàn dư 200.000 → duyệt tối đa 1.000.000)", () => {
  const thu = rc({ amount: 1_200_000 });
  const hoanDu = rc({ amount: 200_000, kind: "CUSTOMER_REFUND" });
  const s = coc0([thu, hoanDu]);
  assert.deepEqual([s.daTra, s.hoanTruocHuy, s.conGiuLucHuy, s.conGiu], [1_200_000, 200_000, 1_000_000, 1_000_000]);
  assert.deepEqual(kiemDuyet({ coc: s, nhom: "CONG_TY_HUY", han: "2099-01-01", homNay: "2026-11-01", soTien: 1_000_000 }), { ok: true });
  assert.equal(ma(kiemDuyet({ coc: s, nhom: "CONG_TY_HUY", han: "2099-01-01", homNay: "2026-11-01", soTien: 1_000_001 })), "coc_exceeds_paid");
  const s2 = coc0([thu, hoanDu], [duyetGoc({ amount: 600_000 })]);
  assert.deepEqual(kiemDuyet({ coc: s2, nhom: "CONG_TY_HUY", han: "2099-01-01", homNay: "2026-11-01", soTien: 400_001 }),
    { ok: false, ma: "coc_exceeds_paid", cau: "Vượt số tiền còn giữ của đơn — còn duyệt được tối đa 400.000 ₫." });
});

test("NT-H3/H4 (đ4b, đ4c, H-C2): người chi = người duyệt → chặn; người trả không phải công ty → ≤ số đang giữ (SV-DH-09)", () => {
  assert.equal(ma(kiemChi({ conLaiKhoan: 100_000, soTien: 100_000, nguoiChi: "kiem-ca-hai", nguoiDuyet: "kiem-ca-hai", nguoiTraDangGiu: null })), "coc_same_person");
  assert.deepEqual(kiemChi({ conLaiKhoan: 100_000, soTien: 100_000, nguoiChi: "kt-khac", nguoiDuyet: "kiem-ca-hai", nguoiTraDangGiu: null }), { ok: true });
  assert.equal(ma(kiemChi({ conLaiKhoan: 500_000, soTien: 400_000, nguoiChi: "kt", nguoiDuyet: "qt", nguoiTraDangGiu: 300_000 })), "coc_exceeds_held");
});

test("NT-H6 (đ4c): huỷ duyệt chỉ phần chưa chi; dòng huỷ duyệt làm giảm tổng duyệt và phần còn lại của khoản", () => {
  const thu = rc({ amount: 500_000 });
  const d = duyetGoc({ amount: 400_000 });
  const chi = rc({ amount: 150_000, kind: "CUSTOMER_REFUND", approvalId: d.id });
  assert.equal(conLaiCuaKhoan(d.id, [d], [thu, chi]), 250_000);
  assert.equal(ma(kiemHuyDuyet({ conLaiKhoan: 250_000, soTien: 250_001 })), "coc_void_exceeds_unspent");
  const huy = duyetGoc({ amount: 250_000, voidsId: d.id });
  const s = coc0([thu, chi], [d, huy]);
  assert.deepEqual([s.daDuyet, s.daChi, s.choChi, s.conGiu], [150_000, 150_000, 0, 350_000]);
  assert.equal(conLaiCuaKhoan(d.id, [d, huy], [thu, chi]), 0);
});

test("NT-H8/H9 (đ6): chuyển tính như chi — đã chuyển, còn giữ đơn huỷ giảm đúng số (SV-DH-05 nửa đơn huỷ)", () => {
  const thu = rc({ amount: 500_000 });
  const d = duyetGoc({ amount: 500_000, kind: "TRANSFER", targetOrderId: "o-moi" });
  const ra = rc({ amount: 500_000, kind: "CUSTOMER_REFUND", approvalId: d.id });
  const s = coc0([thu, ra], [d]);
  assert.deepEqual([s.daChuyen, s.daChi, s.conGiu, s.choChi], [500_000, 0, 0, 0]);
});

test("NT-N2–N4 (đ16, X-3, X-4, lời chủ (b)): hoàn ngoài chỉ đơn cũ, một dòng đang hiệu lực, ≤ còn giữ; chưa xác nhận không tính; người ghi không tự xác nhận (SV-DH-07)", () => {
  const thu = rc({ amount: 300_000 });
  const s = coc0([thu]);
  assert.equal(ma(kiemGhiHoanNgoai({ legacy: false, coDongHieuLuc: false, coc: s, soTien: 1 })), "coc_outside_not_legacy");
  assert.equal(ma(kiemGhiHoanNgoai({ legacy: true, coDongHieuLuc: true, coc: s, soTien: 1 })), "coc_outside_once");
  assert.equal(ma(kiemGhiHoanNgoai({ legacy: true, coDongHieuLuc: false, coc: s, soTien: 300_001 })), "coc_outside_exceeds");
  assert.deepEqual(kiemGhiHoanNgoai({ legacy: true, coDongHieuLuc: false, coc: s, soTien: 300_000 }), { ok: true });
  const ghiRow: HoanNgoaiRow = { id: "hn1", kind: "RECORD", amount: 300_000, targetId: null, createdBy: "sa" };
  const truoc = coc0([thu], [], [ghiRow]);
  assert.deepEqual([truoc.conGiu, truoc.daDuyet], [300_000, 0], "chưa xác nhận: không tính");
  assert.equal(ma(kiemXacNhanHoanNgoai({ nguoiXacNhan: "sa", nguoiGhi: "sa", xacNhan: true, coc: s, soTien: 300_000 })), "coc_same_person");
  assert.deepEqual(kiemXacNhanHoanNgoai({ nguoiXacNhan: "qt", nguoiGhi: "sa", xacNhan: true, coc: s, soTien: 300_000 }), { ok: true });
  const xn: HoanNgoaiRow = { id: "hn2", kind: "CONFIRM", amount: null, targetId: "hn1", createdBy: "qt" };
  const sau = coc0([thu], [], [ghiRow, xn]);
  assert.deepEqual([sau.daDuyet, sau.daChi, sau.hoanNgoai, sau.conGiu, sau.choChi], [300_000, 300_000, 300_000, 0, 0], "đã xác nhận: tính cả duyệt lẫn chi");
  const tuChoi: HoanNgoaiRow = { id: "hn3", kind: "REJECT", amount: null, targetId: "hn1", createdBy: "qt" };
  assert.equal(coc0([thu], [], [ghiRow, tuChoi]).conGiu, 300_000, "bị từ chối: không tính, ghi lại được");
});

test("NT-B1 (đ15): chi + chuyển ≤ duyệt ≤ còn giữ lúc huỷ trên chuỗi hợp lệ; đảo lần thu làm đã trả < duyệt thì vỡ bất biến (lớp CSDL chặn — SV-DH-08)", () => {
  const thu = rc({ amount: 500_000 });
  const d = duyetGoc({ amount: 400_000 });
  const s = coc0([thu], [d]);
  assert.ok(s.daChi + s.daChuyen <= s.daDuyet && s.daDuyet <= s.conGiuLucHuy);
  const sau = coc0([thu, rc({ amount: 500_000, reversesId: thu.id })], [d]);
  assert.ok(sau.daDuyet > sau.conGiuLucHuy, "đảo lần thu sau khi duyệt làm vỡ đ15 — trigger lần thu phải chặn");
});

test("NT-D5 (đ5): nhắc — khoản duyệt chưa chi quá 7 ngày; còn ≤ 10 ngày tới hạn chỉ khách huỷ còn giữ > 0", () => {
  const s = coc0([rc({ amount: 500_000 })]);
  const k = [{ approvedDate: "2026-11-01", conLai: 100_000 }, { approvedDate: "2026-11-05", conLai: 100_000 }, { approvedDate: "2026-10-01", conLai: 0 }];
  assert.deepEqual(nhacCoc({ nhom: "CONG_TY_HUY", han: "2027-01-09", homNay: "2026-11-09", coc: s, khoanChuaChi: k }), { duyetQua7Ngay: 1, sapHetHan: false });
  assert.equal(nhacCoc({ nhom: "KHACH_HUY", han: "2027-01-09", homNay: "2026-12-30", coc: s, khoanChuaChi: [] }).sapHetHan, true);
  assert.equal(nhacCoc({ nhom: "KHACH_HUY", han: "2027-01-09", homNay: "2026-12-29", coc: s, khoanChuaChi: [] }).sapHetHan, false);
  assert.equal(nhacCoc({ nhom: "LAP_LAI", han: "2027-01-09", homNay: "2026-12-30", coc: s, khoanChuaChi: [] }).sapHetHan, false);
  assert.equal(nhacCoc({ nhom: "KHACH_HUY", han: "2027-01-09", homNay: "2027-01-10", coc: s, khoanChuaChi: [] }).sapHetHan, false, "đã quá hạn: không còn 'sắp'");
});
