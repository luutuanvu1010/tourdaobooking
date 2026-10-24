// Luật thuần của sổ công nợ lượt 1 (src/modules/billing/rules.ts — kế hoạch Task 5; NT-S1, NT-S4, NT-S8, NT-F1 phần lý do, NT-R9 phần "một hàm").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  HAN_YEU_CAU_NGAY, LOAI_DONG_GIU_HO, VAI_DOI_CHIEU, benDatHuong, canDoiChieu, cauLoiCsdlThuongMai, conLai, cumDoiChieu, dong, laLoiKhaiBenKia, nhaCungCapCuaDon, phanChuaThuNhaCungCap, soDuGiuHo, dongThuongMaiTu, hetHanYeuCau, hieuLuc, khoanChoXacNhan, khoanMoiDoiChieu, kiemDieuChinh, lyDoChuaGiaoDuoc, lyDoChuaHoanThanh, lyDoGiuThuongMai,
  ngayPhatSinh, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan, sinhDongXacNhanCongTy, sinhPhieuDaGiao, soDuTheoBen, tinhTrangThuongMai, type DongThuongMai, type LineDraft, type LineRow,
  type ReceiptRow, type TinhTrangThuongMai,
} from "./rules.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";

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
  // ĐẢO CÓ CHỦ ĐÍCH (sổ đại lý đợt 2 Task 5, ADR-0132 điều 1): «đang đối chiếu» nay gồm lần thu vai Công ty, bên đặt, quầy nhà cung cấp (VAI_DOI_CHIEU) —
  // trước đây chỉ vai Công ty. Nhân viên (STAFF) vẫn KHÔNG bao giờ đang đối chiếu (người thu cầm tiền thật ⇒ giữ hộ).
  assert.deepEqual([...khoanMoiDoiChieu(rc, [{ receiptId: "x", kind: "DECLARED" }])], [], "vai nhân viên không đang đối chiếu");
  const benKia = [{ id: "b", collectorRole: "BOOKER" as const }, { id: "s", collectorRole: "SUPPLIER" as const }];
  assert.deepEqual([...khoanMoiDoiChieu(benKia, [{ receiptId: "b", kind: "DECLARED" }, { receiptId: "s", kind: "DECLARED" }])].sort(), ["b", "s"], "vai bên đặt / quầy nhà cung cấp đang đối chiếu");
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

// ĐẢO CÓ CHỦ ĐÍCH (sổ đại lý đợt 2, Task 3): bài cũ «phiếu Đã giao lượt 1 không có dòng thương mại — sinhPhieuDaGiao() == []» nay chỉ còn đúng cho đơn KHÔNG người
// hưởng, KHÔNG giá vốn (khách lẻ, Tour Đảo bán) — ADR-0079 điều 2 mở dòng thương mại cho đơn có người hưởng / dòng làm đại lý.
test("phiếu Đã giao: đơn không người hưởng, không giá vốn ⇒ không dòng thương mại; số dư: công ty còn nợ một bên = âm (không chặn Hoàn thành)", () => {
  const khachLe: DongThuongMai[] = [{ orderServiceId: "s1", tenDichVu: "Vé Hòn Tằm", thanhTien: 1_000_000, hoaHong: 0, giaVon: null, nhaCungCapPartyId: null }];
  assert.deepEqual(sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: null, giamGiaBenDat: 50_000, dong: khachLe }), [], "giảm giá đơn khách lẻ do Tour Đảo chịu — không dòng");
  const lines = ghi(sinhDongHoanKhach({ nguoiTraPartyId: HDV, congTyId: CT, so: 20_000 }));
  assert.equal(soDuTheoBen(lines, CT).get(HDV), -20_000);
});

// ---- Sổ đại lý đợt 2 (ADR-0079 điều 1–4; đặc tả P1, P2; kế hoạch Task 3): dòng thương mại của phiếu «Đã giao», tình trạng bản chụp, lý do giữ mới ----
const DAI_LY = "dai-ly-a";
const HUONG = "le-tan-huong";
const IRESORT = "i-resort";
/** Bản chụp của một dòng (dạng `BanChup` của src/shared/hoa-hong-dong.ts). */
const chupSet = (serviceId: string, ben: string, muc: { rateBp?: number; perPax?: number }, nguoiBan: { ncc?: string; aBp?: number } = {}): BanChup => ({
  serviceId, beneficiaryPartyId: ben,
  hoaHong: muc.perPax !== undefined ? { status: "SET", kind: "PER_PAX", rateBp: null, perPax: muc.perPax, ruleId: "r" } : { status: "SET", kind: "RATE", rateBp: muc.rateBp!, perPax: null, ruleId: "r" },
  cungUng: nguoiBan.ncc
    ? { status: "SET", termId: "t", sellerPartyId: nguoiBan.ncc, supplierPartyId: nguoiBan.ncc, costRateBp: nguoiBan.aBp! }
    : { status: "SET", termId: "t", sellerPartyId: CT, supplierPartyId: null, costRateBp: null },
});
const chupNone = (serviceId: string, nguoiBan: { ncc?: string; aBp?: number } = {}): BanChup => ({ ...chupSet(serviceId, "x", { rateBp: 0 }, nguoiBan), beneficiaryPartyId: null, hoaHong: { status: "NONE" } });
const chupThieu = (serviceId: string, reason: "NO_RULE" | "RULE_CONFLICT" | "MANUAL_LINE" | "BOOKER_NOT_BENEFICIARY" | "NOT_CAPTURED", ben: string | null = DAI_LY): BanChup => ({
  serviceId, beneficiaryPartyId: reason === "NOT_CAPTURED" ? null : ben, hoaHong: { status: "MISSING", reason },
  cungUng: reason === "NOT_CAPTURED" || reason === "MANUAL_LINE" ? { status: "MISSING" } : { status: "SET", termId: "t", sellerPartyId: CT, supplierPartyId: null, costRateBp: null },
});
const dv = (id: string, name: string, thanhTien: number, soKhachTinh = 1) => ({ id, name, thanhTien, soKhachTinh });

test("sinhPhieuDaGiao C-1 (ADR-0079): tour 5.000.000, hoa hồng 500.000, giảm giá bên đặt chịu 250.000 ⇒ ĐÚNG hai dòng; cùng dòng giữ hộ 3.000.000 ⇒ đại lý nợ 2.750.000", () => {
  const dongC1 = dongThuongMaiTu({ chup: [chupSet("s1", DAI_LY, { rateBp: 1000 })], dichVu: [dv("s1", "Tour đảo", 5_000_000)] });
  assert.deepEqual(dongC1, [{ orderServiceId: "s1", tenDichVu: "Tour đảo", thanhTien: 5_000_000, hoaHong: 500_000, giaVon: null, nhaCungCapPartyId: null }]);
  const ds = sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: DAI_LY, giamGiaBenDat: 250_000, dong: dongC1 });
  assert.deepEqual(ds, [
    { debtorPartyId: CT, creditorPartyId: DAI_LY, amount: 500_000, kind: "HOA_HONG", reversesLineId: null, orderServiceId: "s1" },
    { debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", reversesLineId: null, orderServiceId: null },
  ]);
  const giu: LineDraft[] = [
    { debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 3_000_000, kind: "HELD", reversesLineId: null },
    { debtorPartyId: HDV, creditorPartyId: CT, amount: 1_750_000, kind: "HELD", reversesLineId: null },
  ];
  const so = soDuTheoBen(ghi([...giu, ...ds]), CT);
  assert.deepEqual([so.get(DAI_LY), so.get(HDV)], [2_750_000, 1_750_000]);
});

test("sinhPhieuDaGiao C-4 (ADR-0079): vé Hòn Tằm 10% + 2 vé i-resort (50.000/khách, a = 80%) ⇒ HOA_HONG 100.000 × 2 (cty → Hương) và GIA_VON 480.000 (cty → i-resort)", () => {
  const chup = [chupSet("s1", HUONG, { rateBp: 1000 }), chupSet("s2", HUONG, { perPax: 50_000 }, { ncc: IRESORT, aBp: 8000 })];
  const dong = dongThuongMaiTu({ chup, dichVu: [dv("s1", "Vé Hòn Tằm", 1_000_000), dv("s2", "Vé i-resort", 600_000, 2)] });
  const tt = tinhTrangThuongMai({ chup, dong });
  assert.deepEqual(tt, { trangThai: "DU", nguoiHuongPartyId: HUONG });
  assert.deepEqual(sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: HUONG, giamGiaBenDat: 0, dong }), [
    { debtorPartyId: CT, creditorPartyId: HUONG, amount: 100_000, kind: "HOA_HONG", reversesLineId: null, orderServiceId: "s1" },
    { debtorPartyId: CT, creditorPartyId: HUONG, amount: 100_000, kind: "HOA_HONG", reversesLineId: null, orderServiceId: "s2" },
    { debtorPartyId: CT, creditorPartyId: IRESORT, amount: 480_000, kind: "GIA_VON", reversesLineId: null, orderServiceId: "s2" },
  ]);
});

test("sinhPhieuDaGiao B-5 (ADR-0078): 600.000, hoa hồng 100.000, giá vốn 480.000, giảm giá bên đặt 20.000 ⇒ HOA_HONG 100.000, GIA_VON 480.000, GIAM_GIA_BEN_DAT 20.000", () => {
  const dong: DongThuongMai[] = [{ orderServiceId: "s1", tenDichVu: "Vé i-resort", thanhTien: 600_000, hoaHong: 100_000, giaVon: 480_000, nhaCungCapPartyId: IRESORT }];
  assert.deepEqual(sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: HUONG, giamGiaBenDat: 20_000, dong }), [
    { debtorPartyId: CT, creditorPartyId: HUONG, amount: 100_000, kind: "HOA_HONG", reversesLineId: null, orderServiceId: "s1" },
    { debtorPartyId: CT, creditorPartyId: IRESORT, amount: 480_000, kind: "GIA_VON", reversesLineId: null, orderServiceId: "s1" },
    { debtorPartyId: HUONG, creditorPartyId: CT, amount: 20_000, kind: "GIAM_GIA_BEN_DAT", reversesLineId: null, orderServiceId: null },
  ]);
});

test("sinhPhieuDaGiao: hoa hồng 0 ⇒ không dòng; giảm giá 0 ⇒ không dòng giảm giá; không người hưởng ⇒ chỉ GIA_VON (giảm giá Tour Đảo chịu)", () => {
  const dong: DongThuongMai[] = [
    { orderServiceId: "s1", tenDichVu: "A", thanhTien: 1_000_000, hoaHong: 0, giaVon: null, nhaCungCapPartyId: null },
    { orderServiceId: "s2", tenDichVu: "B", thanhTien: 600_000, hoaHong: 0, giaVon: 480_000, nhaCungCapPartyId: IRESORT },
  ];
  assert.deepEqual(sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: DAI_LY, giamGiaBenDat: 0, dong }), [
    { debtorPartyId: CT, creditorPartyId: IRESORT, amount: 480_000, kind: "GIA_VON", reversesLineId: null, orderServiceId: "s2" },
  ], "hoa hồng 0 và giảm giá 0: không dòng nào ngoài giá vốn");
  assert.deepEqual(sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: null, giamGiaBenDat: 100_000, dong }), [
    { debtorPartyId: CT, creditorPartyId: IRESORT, amount: 480_000, kind: "GIA_VON", reversesLineId: null, orderServiceId: "s2" },
  ], "khách lẻ: chỉ giá vốn, giảm giá không thành dòng");
});

test("sinhPhieuDaGiao KHÔNG BAO GIỜ tự lấy 0: có người hưởng mà một dòng thiếu hoa hồng (null) ⇒ ném lỗi; không người hưởng mà có hoa hồng > 0 ⇒ ném lỗi", () => {
  const thieu: DongThuongMai[] = [{ orderServiceId: "s1", tenDichVu: "A", thanhTien: 1_000_000, hoaHong: null, giaVon: null, nhaCungCapPartyId: null }];
  assert.throws(() => sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: DAI_LY, giamGiaBenDat: 0, dong: thieu }), /thiếu mức/);
  const lech: DongThuongMai[] = [{ orderServiceId: "s1", tenDichVu: "A", thanhTien: 1_000_000, hoaHong: 100_000, giaVon: null, nhaCungCapPartyId: null }];
  assert.throws(() => sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: null, giamGiaBenDat: 0, dong: lech }), /không có người hưởng/);
  const giaVonKhongNcc: DongThuongMai[] = [{ orderServiceId: "s1", tenDichVu: "A", thanhTien: 1_000_000, hoaHong: 0, giaVon: 500_000, nhaCungCapPartyId: null }];
  assert.throws(() => sinhPhieuDaGiao({ congTyId: CT, nguoiHuongPartyId: null, giamGiaBenDat: 0, dong: giaVonKhongNcc }), /nhà cung cấp/);
});

const thuongMaiCua = (chup: BanChup[], dichVu: ReturnType<typeof dv>[]): TinhTrangThuongMai => tinhTrangThuongMai({ chup, dong: dongThuongMaiTu({ chup, dichVu }) });

test("tinhTrangThuongMai: mọi dòng NOT_CAPTURED (đơn chưa có bản chụp nào) ⇒ THIEU / terms_missing / canChupBu; dòng VẮNG khỏi bản chụp cũng là chưa chụp", () => {
  const hai = [dv("s1", "Vé Hòn Tằm", 500_000), dv("s2", "Tour đảo", 700_000)];
  assert.deepEqual(thuongMaiCua([chupThieu("s1", "NOT_CAPTURED"), chupThieu("s2", "NOT_CAPTURED")], hai),
    { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Vé Hòn Tằm", "Tour đảo"], canChupBu: true });
  assert.deepEqual(thuongMaiCua([], hai), { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Vé Hòn Tằm", "Tour đảo"], canChupBu: true }, "không bản chụp nào (mảng rỗng)");
  // Ruling (sổ thi công): «Chụp bù» chỉ nhận đơn CHƯA có bản chụp nào ⇒ đơn trộn (một dòng đã chụp, một dòng chưa) KHÔNG chỉ sang «Chụp bù».
  assert.deepEqual(thuongMaiCua([chupNone("s1")], hai), { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Tour đảo"], canChupBu: false }, "đơn trộn: dòng s2 vắng bản chụp");
});

test("tinhTrangThuongMai: một dòng NO_RULE / RULE_CONFLICT / MANUAL_LINE, hoặc người bán MISSING ⇒ THIEU / terms_missing / canChupBu = false, nêu đúng tên dòng", () => {
  const hai = [dv("s1", "Vé Hòn Tằm", 500_000), dv("s2", "Dịch vụ nhập tay", 700_000)];
  for (const reason of ["NO_RULE", "RULE_CONFLICT", "MANUAL_LINE"] as const) {
    assert.deepEqual(thuongMaiCua([chupSet("s1", DAI_LY, { rateBp: 1000 }), chupThieu("s2", reason)], hai),
      { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Dịch vụ nhập tay"], canChupBu: false }, reason);
  }
  // Khách lẻ, dòng nhập tay chưa ai ghi tay người bán (A-14): hoa hồng NONE nhưng người bán MISSING.
  const nhapTayKhachLe: BanChup = { ...chupNone("s2"), cungUng: { status: "MISSING" } };
  assert.deepEqual(thuongMaiCua([chupNone("s1"), nhapTayKhachLe], hai), { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Dịch vụ nhập tay"], canChupBu: false });
});

test("tinhTrangThuongMai: BOOKER_NOT_BENEFICIARY ⇒ THIEU / booker_not_beneficiary (đứng trước terms_missing khi đơn có cả hai)", () => {
  const hai = [dv("s1", "Vé Hòn Tằm", 500_000), dv("s2", "Dịch vụ nhập tay", 700_000)];
  assert.deepEqual(thuongMaiCua([chupThieu("s1", "BOOKER_NOT_BENEFICIARY"), chupThieu("s2", "BOOKER_NOT_BENEFICIARY")], hai),
    { trangThai: "THIEU", ma: "booker_not_beneficiary", dichVu: ["Vé Hòn Tằm", "Dịch vụ nhập tay"], canChupBu: false });
  assert.deepEqual(thuongMaiCua([chupThieu("s1", "BOOKER_NOT_BENEFICIARY"), chupThieu("s2", "MANUAL_LINE")], hai),
    { trangThai: "THIEU", ma: "booker_not_beneficiary", dichVu: ["Vé Hòn Tằm"], canChupBu: false }, "sửa bên đặt (chụp lại) trước, rồi mới tới mức tay");
});

test("tinhTrangThuongMai: hoa hồng + giá vốn của MỘT dòng > thành tiền dòng ⇒ VUOT kèm tên (BL-SDL-GIA-DAI-LY-AM ở bước Đã giao); bằng đúng thì qua", () => {
  const chup = [chupSet("s1", HUONG, { rateBp: 1000 }), chupSet("s2", HUONG, { perPax: 100_000 }, { ncc: IRESORT, aBp: 8000 })];
  assert.deepEqual(thuongMaiCua(chup, [dv("s1", "Vé Hòn Tằm", 1_000_000), dv("s2", "Vé i-resort", 600_000, 2)]),
    { trangThai: "VUOT", dichVu: ["Vé i-resort"] }, "200.000 + 480.000 > 600.000");
  assert.deepEqual(thuongMaiCua(chup, [dv("s1", "Vé Hòn Tằm", 1_000_000), dv("s2", "Vé i-resort", 1_200_000, 2)]).trangThai, "DU", "200.000 + 960.000 ≤ 1.200.000");
  const vua = [chupSet("s1", HUONG, { perPax: 120_000 }, { ncc: IRESORT, aBp: 8000 })];
  assert.equal(thuongMaiCua(vua, [dv("s1", "Vé", 600_000)]).trangThai, "DU", "120.000 + 480.000 = 600.000 đúng bằng ⇒ qua");
});

test("tinhTrangThuongMai: mọi bản NONE + người bán SET ⇒ KHONG_NGUOI_HUONG; có người hưởng đủ mức ⇒ DU; hai người hưởng khác nhau (không thể theo bản chụp) ⇒ giữ, không đoán", () => {
  assert.deepEqual(thuongMaiCua([chupNone("s1"), chupNone("s2", { ncc: IRESORT, aBp: 8000 })], [dv("s1", "A", 500_000), dv("s2", "B", 600_000)]), { trangThai: "KHONG_NGUOI_HUONG" });
  assert.deepEqual(thuongMaiCua([chupSet("s1", DAI_LY, { rateBp: 0 })], [dv("s1", "A", 500_000)]), { trangThai: "DU", nguoiHuongPartyId: DAI_LY }, "mức 0% vẫn là có người hưởng");
  assert.deepEqual(thuongMaiCua([chupSet("s1", DAI_LY, { rateBp: 1000 }), chupSet("s2", HUONG, { rateBp: 1000 })], [dv("s1", "A", 500_000), dv("s2", "B", 600_000)]),
    { trangThai: "THIEU", ma: "terms_missing", dichVu: ["A", "B"], canChupBu: false });
  assert.deepEqual(tinhTrangThuongMai({ chup: [chupSet("s1", DAI_LY, { rateBp: 1000 })], dong: [{ orderServiceId: "s1", tenDichVu: "A", thanhTien: 1, hoaHong: null, giaVon: null, nhaCungCapPartyId: null }] }),
    { trangThai: "THIEU", ma: "terms_missing", dichVu: ["A"], canChupBu: false }, "dòng mang hoa hồng null dù bản chụp SET ⇒ giữ (không bao giờ tự lấy 0)");
});

test("lyDoGiuThuongMai: bốn câu lời thường cố định (task-3-brief) + ai xử lý", () => {
  const c = (t: TinhTrangThuongMai) => { const l = lyDoGiuThuongMai(t)!; return [l.ma, l.cau, l.aiXuLy]; };
  assert.deepEqual(c({ trangThai: "THIEU", ma: "terms_missing", dichVu: ["Tour đảo"], canChupBu: true }),
    ["terms_missing", "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù.", "Kế toán"]);
  assert.deepEqual(c({ trangThai: "THIEU", ma: "terms_missing", dichVu: ["Dịch vụ nhập tay"], canChupBu: false }),
    ["terms_missing", "Thiếu mức hoa hồng / người bán cho Dịch vụ nhập tay — Kế toán ghi mức tay cho dòng này.", "Kế toán"]);
  assert.deepEqual(c({ trangThai: "THIEU", ma: "booker_not_beneficiary", dichVu: ["Tour đảo"], canChupBu: false }),
    ["booker_not_beneficiary", "Bên đặt của đơn không thuộc danh sách được hưởng hoa hồng — Văn phòng sửa bên đặt hoặc Kế toán ghi mức tay.", "Văn phòng hoặc Kế toán"]);
  assert.deepEqual(c({ trangThai: "VUOT", dichVu: ["Vé i-resort"] }), ["terms_exceed_price", "Mức hoa hồng / giá vốn cài cho Vé i-resort vượt giá bán — Kế toán xem lại.", "Kế toán"]);
  assert.equal(lyDoGiuThuongMai({ trangThai: "DU", nguoiHuongPartyId: DAI_LY }), null);
  assert.equal(lyDoGiuThuongMai({ trangThai: "KHONG_NGUOI_HUONG" }), null);
});

test("cauLoiCsdlThuongMai: dịch lỗi lớp CSDL (0112) ra lời thường — không lộ mã thô; lỗi khác ⇒ null", () => {
  assert.equal(cauLoiCsdlThuongMai(new Error("D1_ERROR: delivered_terms: đơn còn dịch vụ chưa chụp mức hoặc thiếu mức hoa hồng / người bán — Kế toán xử lý: SQLITE_CONSTRAINT")),
    "Thiếu mức hoa hồng / người bán cho một dịch vụ của đơn — Kế toán ghi mức tay cho dòng này.");
  assert.equal(cauLoiCsdlThuongMai(new Error("commercial_exceeds_gross: tổng hoa hồng và giá vốn vượt thành tiền trước giảm của đơn")),
    "Mức hoa hồng / giá vốn cài cho đơn này vượt giá bán — Kế toán xem lại.", "câu của ADR-0079 điều 6 («cho đơn này»)");
  const LOI_MA = "Số hoa hồng / giảm giá bên đặt chịu / giá vốn tính ra không khớp sổ — chưa ghi gì; báo người phụ trách hệ thống.";
  for (const m of [
    "commercial_service_required: dòng hoa hồng / giá vốn của phiếu Đã giao phải gắn một dòng dịch vụ",
    "commercial_wrong_direction: hoa hồng / giá vốn do Tour Đảo nợ, giảm giá bên đặt chịu là khoản nợ Tour Đảo",
    "commercial_discount_mismatch: giảm giá bên đặt chịu phải bằng thành tiền trước giảm trừ phải thu đã chụp",
    "UNIQUE constraint failed: bil_debt_line.posting_id, bil_debt_line.order_service_id, bil_debt_line.kind_code",
  ]) {
    const cau = cauLoiCsdlThuongMai(new Error(m))!;
    assert.equal(cau, LOI_MA, m);
    assert.doesNotMatch(cau, /commercial_|UNIQUE|bil_/, "không lộ mã thô");
  }
  assert.equal(cauLoiCsdlThuongMai(new Error("delivered_not_paid: …")), null);
  assert.equal(cauLoiCsdlThuongMai("chuỗi lạ"), null);
});

const KHONG_HUONG = { trangThai: "KHONG_NGUOI_HUONG" } as const;
const base = { status: "confirmed" as const, deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-09", "2026-10-10"], dichVuThieuNgay: [], thuongMai: KHONG_HUONG as TinhTrangThuongMai, soKhoanDoiChieu: 0 };
const du = (daThu: number, phaiThu: number, chuaRo = 0) => ({ ...conLai([], phaiThu, "confirmed"), daThu, conLai: Math.max(0, phaiThu - daThu), du: Math.max(0, daThu - phaiThu), chuaRo });

test("lyDoChuaGiaoDuoc (đợt 2): lý do thương mại đứng SAU «chưa tới ngày đi», TRƯỚC «đang đối chiếu» và mọi lý do tiền; terms_missing ⇒ Kế toán", () => {
  const thieu: TinhTrangThuongMai = { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Tour đảo"], canChupBu: false };
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: thieu, homNay: "2026-10-09", so: du(1, 1) })!.ma, "before_departure", "chưa tới ngày đi đứng trước");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: thieu, ngayDi: ["2026-10-09", null], dichVuThieuNgay: ["Tour đảo"], so: du(1, 1) })!.ma, "missing_date");
  const t = lyDoChuaGiaoDuoc({ ...base, thuongMai: thieu, soKhoanDoiChieu: 1, so: du(0, 1_000_000, 1) })!;
  assert.deepEqual([t.ma, t.aiXuLy], ["terms_missing", "Kế toán"], "đứng trước reconciling / unknown_collector / underpaid");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "VUOT", dichVu: ["Vé"] }, soKhoanDoiChieu: 1, so: du(1, 1) })!.ma, "terms_exceed_price");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "THIEU", ma: "booker_not_beneficiary", dichVu: ["Vé"], canChupBu: false }, so: du(1, 1) })!.ma, "booker_not_beneficiary");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "DU", nguoiHuongPartyId: DAI_LY }, so: du(1_000_000, 1_000_000) }), null, "đơn có người hưởng đủ mức, đã thu đủ ⇒ Đã giao được");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "DU", nguoiHuongPartyId: DAI_LY }, soKhoanDoiChieu: 1, so: du(1, 1) })!.ma, "reconciling");
});

test("lyDoChuaGiaoDuoc (NT-F1, NT-F6c, M1 = A): thứ tự lý do cố định, câu tiếng Việt + ai xử lý; đủ điều kiện → null", () => {
  assert.equal(lyDoChuaGiaoDuoc({ ...base, so: du(1_000_000, 1_000_000) }), null);
  assert.equal(lyDoChuaGiaoDuoc({ ...base, status: "draft", so: du(0, 1) })!.ma, "not_confirmed");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, status: "cancelled", so: du(0, 1) })!.ma, "cancelled");
  assert.equal(lyDoChuaGiaoDuoc({ ...base, deliveredAt: "x", so: du(0, 1) })!.ma, "already_delivered");
  const thieuNgay = lyDoChuaGiaoDuoc({ ...base, ngayDi: ["2026-10-09", null], dichVuThieuNgay: ["Vé Hòn Tằm"], so: du(1, 1) })!;
  assert.deepEqual([thieuNgay.ma, thieuNgay.cau, thieuNgay.aiXuLy], ["missing_date", "Dịch vụ Vé Hòn Tằm chưa có ngày đi — sửa đơn trước.", "Người lập đơn"]);
  const som = lyDoChuaGiaoDuoc({ ...base, homNay: "2026-10-09", so: du(1, 1) })!;
  assert.deepEqual([som.ma, som.cau], ["before_departure", "Chưa tới ngày đi (10/10/2026) — bấm từ ngày đi trở đi."], "ngày đi MUỘN NHẤT");
  // ĐẢO CÓ CHỦ ĐÍCH (sổ đại lý đợt 2, Task 3 — ADR-0079 điều 1): lý do `booker_partner` («đơn của đối tác — chưa bấm Đã giao được») BỎ; ở chỗ của nó là
  // lý do thương mại (`terms_missing` / `booker_not_beneficiary` / `terms_exceed_price`). Đơn có người hưởng đủ mức nay KHÔNG bị giữ.
  const doiTac = lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "THIEU", ma: "terms_missing", dichVu: ["Tour đảo"], canChupBu: true }, so: du(1, 1) })!;
  assert.deepEqual([doiTac.ma, doiTac.cau, doiTac.aiXuLy], ["terms_missing", "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù.", "Kế toán"]);
  assert.equal(lyDoChuaGiaoDuoc({ ...base, thuongMai: { trangThai: "DU", nguoiHuongPartyId: DAI_LY }, so: du(1, 1) }), null, "đơn có người hưởng đủ mức: không còn lý do booker_partner");
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
  assert.equal(r.cau, "Còn người chưa nộp tiền về công ty: HDV Nam còn 400.000 ₫ chưa nộp — ghi nộp tiền / xác nhận công ty đã nhận trước.");
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

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Sổ đại lý đợt 2 Task 5 — người thu bên đặt / quầy nhà cung cấp (ADR-0132; đặc tả P4, P10)
// ---------------------------------------------------------------------------------------------------------------------------------------------------
test("laLoiKhaiBenKia / canDoiChieu / sinhDongLanThu (ADR-0132 điều 1, 3): người khác khai ⇒ không dòng, có dấu; người thu tự ghi hoặc Kế toán ghi ⇒ giữ hộ ngay", () => {
  const khai = { kind: "CUSTOMER_PAYMENT", amount: 300_000, collectorRole: "BOOKER", collectorPartyId: DAI_LY, method: "CASH", nguoiGhiPartyId: HDV, nguoiGhiLaKeToan: false, congTyId: CT } as const;
  for (const vai of ["BOOKER", "SUPPLIER"] as const) {
    const x = { ...khai, collectorRole: vai };
    assert.equal(laLoiKhaiBenKia(x), true, vai);
    assert.equal(canDoiChieu(x), true, `${vai}: phải ghi dấu DECLARED`);
    assert.deepEqual(sinhDongLanThu(x), [], `${vai}: người khai không cầm đồng nào`);
    assert.equal(canDoiChieu({ ...x, method: "BANK_TRANSFER" }), true, `${vai}: mọi hình thức`);
    const tuGhi = { ...x, nguoiGhiPartyId: DAI_LY };
    assert.equal(canDoiChieu(tuGhi), false, `${vai}: người thu tự ghi chính mình ⇒ không lời khai`);
    assert.deepEqual(sinhDongLanThu(tuGhi), [{ debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 300_000, kind: "HELD", reversesLineId: null }]);
    const keToan = { ...x, nguoiGhiPartyId: "ke-toan", nguoiGhiLaKeToan: true };
    assert.equal(canDoiChieu(keToan), false, `${vai}: Kế toán ghi thẳng`);
    assert.deepEqual(sinhDongLanThu(keToan), [{ debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 300_000, kind: "HELD", reversesLineId: null }]);
    assert.equal(canDoiChieu({ ...x, nguoiGhiPartyId: CT }), false, "hồ sơ công ty ghi ⇒ không lời khai");
    assert.equal(canDoiChieu({ ...x, kind: "CUSTOMER_REFUND" }), false);
  }
  assert.equal(laLoiKhaiBenKia({ ...khai, collectorRole: "STAFF" }), false, "nhân viên không bao giờ là lời khai");
  assert.equal(laLoiKhaiBenKia({ ...khai, collectorRole: "COMPANY" }), false, "Công ty thu đi đường ADR-0120 riêng");
});

test("soDuGiuHo (P10): chỉ cộng HELD / SETTLEMENT / REFUND — dòng thương mại không làm khoản cũ «Công ty thu» hết chờ; KT04 (đã nộp) vẫn hết chờ", () => {
  assert.deepEqual([...LOAI_DONG_GIU_HO].sort(), ["HELD", "REFUND", "SETTLEMENT"]);
  assert.deepEqual([...VAI_DOI_CHIEU].sort(), ["BOOKER", "COMPANY", "SUPPLIER"]);
  const rcCt = [{ id: "c", collectorRole: "COMPANY" as const }];
  const held = { id: "h", kind: "HELD" as const, receiptId: "c", reversesLineId: null, debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 3_000_000 };
  const tm = [
    { id: "t1", kind: "HOA_HONG" as const, receiptId: null, reversesLineId: null, debtorPartyId: CT, creditorPartyId: DAI_LY, amount: 500_000 },
    { id: "t2", kind: "GIAM_GIA_BEN_DAT" as const, receiptId: null, reversesLineId: null, debtorPartyId: DAI_LY, creditorPartyId: CT, amount: 250_000 },
  ];
  assert.equal(soDuGiuHo([held, ...tm], DAI_LY, CT), 3_000_000);
  assert.deepEqual([...khoanChoXacNhan(rcCt, [held, ...tm])], ["c"], "đại lý còn giữ đủ 3.000.000 tiền mặt ⇒ vẫn chờ «Công ty đã nhận»");
  const nop = { id: "s", kind: "SETTLEMENT" as const, receiptId: null, reversesLineId: null, debtorPartyId: CT, creditorPartyId: DAI_LY, amount: 2_750_000 };
  assert.deepEqual([...khoanChoXacNhan(rcCt, [held, ...tm, nop])], [], "đã nộp phần ròng ⇒ còn dưới số dòng giữ hộ ⇒ hết chờ (KT04)");
});

const chup = (serviceId: string, o: { huong?: string | null; lyDo?: "BOOKER_NOT_BENEFICIARY" | "NO_RULE"; ncc?: string | null } = {}): BanChup => ({
  serviceId, beneficiaryPartyId: o.huong === undefined ? DAI_LY : o.huong,
  hoaHong: o.lyDo ? { status: "MISSING", reason: o.lyDo } : o.huong === null ? { status: "NONE" } : { status: "SET", kind: "RATE", rateBp: 1000, perPax: null, ruleId: "m1" },
  cungUng: o.ncc ? { status: "SET", termId: "t", sellerPartyId: o.ncc, supplierPartyId: o.ncc, costRateBp: 8000 } : { status: "MISSING" },
} as BanChup);
const phan = (cs: BanChup[], o: { duKien?: boolean; chuaChup?: boolean; giamGiaHieuLuc?: number } = {}) => ({ duKien: false, chuaChup: false, congTyChuId: CT, giamGiaHieuLuc: 0, ...o, chup: cs, dichVu: cs.map((c, i) => ({ id: c.serviceId, thanhTien: (i + 1) * 100_000 })) });

test("benDatHuong / nhaCungCapCuaDon (đặc tả P4): đọc từ bản chụp; nháp, chưa chụp, khách lẻ, «không thuộc loại được hưởng», hai bên khác nhau ⇒ không có", () => {
  assert.equal(benDatHuong(phan([chup("a"), chup("b", { lyDo: "NO_RULE" })])), DAI_LY, "thiếu mức vẫn là bên đặt được hưởng");
  assert.equal(benDatHuong(null), null);
  assert.equal(benDatHuong(phan([chup("a")], { duKien: true })), null, "đơn nháp: chưa chốt");
  assert.equal(benDatHuong(phan([chup("a")], { chuaChup: true })), null);
  assert.equal(benDatHuong(phan([chup("a", { huong: null })])), null, "khách lẻ");
  assert.equal(benDatHuong(phan([chup("a", { lyDo: "BOOKER_NOT_BENEFICIARY" })])), null);
  assert.equal(benDatHuong(phan([chup("a"), chup("b", { huong: "khac" })])), null, "hai bên khác nhau: không đoán");
  assert.deepEqual([...nhaCungCapCuaDon(phan([chup("a", { ncc: "ncc" }), chup("b"), chup("c", { ncc: "ncc" })]))], [["ncc", 400_000]], "Σ thành tiền các dòng họ bán");
  assert.deepEqual([...nhaCungCapCuaDon(phan([chup("a", { ncc: "ncc" })], { duKien: true }))], []);
  const tuBan = { ...chup("a"), cungUng: { status: "SET", termId: null, sellerPartyId: CT, supplierPartyId: null, costRateBp: null } } as BanChup;
  assert.deepEqual([...nhaCungCapCuaDon(phan([tuBan]))], [], "Tour Đảo tự bán: không phải nhà cung cấp");
  // Ruling R-154 (B-5): phần của quầy SAU giảm giá — trừ phần Tour Đảo trước (dòng b 200.000), vượt mới trừ quầy; giảm ăn hết phần quầy ⇒ vẫn có mặt với số 0.
  const ba = [chup("a", { ncc: "ncc" }), chup("b"), chup("c", { ncc: "ncc" })];
  assert.deepEqual([...nhaCungCapCuaDon(phan(ba, { giamGiaHieuLuc: 150_000 }))], [["ncc", 400_000]], "giảm nằm gọn trong phần Tour Đảo");
  assert.deepEqual([...nhaCungCapCuaDon(phan(ba, { giamGiaHieuLuc: 250_000 }))], [["ncc", 350_000]], "phần dư 50.000 trừ vào quầy");
  assert.deepEqual([...nhaCungCapCuaDon(phan(ba, { giamGiaHieuLuc: 900_000 }))], [["ncc", 0]]);
  assert.deepEqual([...nhaCungCapCuaDon({ ...phan(ba), congTyChuId: null })], [], "không đọc được công ty chủ ⇒ như biên nhận: mọi dòng vào phần Tour Đảo");
});

test("phanChuaThuNhaCungCap (đặc tả P4): trừ lần thu còn hiệu lực «thu cho» nhà cung cấp, kể cả lời khai đang chờ; bỏ lần thu đang bị thay", () => {
  const a = rc({ amount: 200_000, collectedForPartyId: "ncc" });
  const b = rc({ amount: 100_000, collectedForPartyId: CT });
  const c = rc({ amount: 50_000, collectedForPartyId: "ncc" });
  const cd = rc({ amount: 50_000, collectedForPartyId: "ncc", reversesId: c.id });
  const tra = rc({ amount: 30_000, collectedForPartyId: "ncc", kind: "CUSTOMER_REFUND" });
  assert.equal(phanChuaThuNhaCungCap({ tong: 600_000, ncc: "ncc", receipts: [a, b, c, cd, tra] }), 400_000);
  assert.equal(phanChuaThuNhaCungCap({ tong: 600_000, ncc: "ncc", receipts: [a, b], boQua: new Set([a.id]) }), 600_000, "lần thu đang bị thay không tính");
});

test("cumDoiChieu + lyDoChuaGiaoDuoc (ADR-0132 Hệ quả): câu nói khoản bên kia, có tên cho nội bộ, cụm chung cho Đối tác; chỉ «Công ty thu» ⇒ câu cũ", () => {
  assert.equal(cumDoiChieu({ collectorRole: "BOOKER", ten: "Đại Lý A", anTen: false }), "khách trả cho Đại Lý A");
  assert.equal(cumDoiChieu({ collectorRole: "SUPPLIER", ten: "i-resort", anTen: false }), "khách trả tại quầy i-resort");
  assert.equal(cumDoiChieu({ collectorRole: "BOOKER", ten: "Đại Lý A", anTen: true }), "khách trả cho bên đặt");
  assert.equal(cumDoiChieu({ collectorRole: "SUPPLIER", ten: "i-resort", anTen: true }), "khách trả tại quầy nhà cung cấp");
  const ct = cumDoiChieu({ collectorRole: "COMPANY", ten: null, anTen: false });
  const cu = lyDoChuaGiaoDuoc({ ...base, soKhoanDoiChieu: 1, so: du(1, 1) })!;
  assert.equal(lyDoChuaGiaoDuoc({ ...base, soKhoanDoiChieu: 1, cumDoiChieu: [ct], so: du(1, 1) })!.cau, cu.cau, "chỉ Công ty thu: giữ nguyên câu ADR-0120");
  const moi = lyDoChuaGiaoDuoc({ ...base, soKhoanDoiChieu: 2, cumDoiChieu: ["khách trả cho Đại Lý A", ct], so: du(1, 1) })!;
  assert.deepEqual([moi.ma, moi.aiXuLy], ["reconciling", "Kế toán"]);
  assert.equal(moi.cau, "Còn khoản khách trả cho Đại Lý A, chuyển khoản “Công ty thu” đang chờ Kế toán xác nhận — Kế toán xác nhận xong mới bấm Đã giao được.");
});
