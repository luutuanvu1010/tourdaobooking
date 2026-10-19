import { test } from "node:test";
import assert from "node:assert/strict";
import { apGhiTay, banChupTuDb, cheDoThuongMai, dongGhiTuChup, dungThuongMai, kiemGhiTayVoiBanChup, kiemThanGhiTay, moTaChup, moTaGhiTay, type CheDoThuongMai } from "./thuong-mai.ts";
import { PERMISSION_CODES, can, holdsPartner, seesOnlyAssignedOrders, type PermissionCode } from "../../shared/permissions.ts";

const set = { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1000, perPax: null, ruleId: "m1" },
  cungUng: { status: "SET" as const, termId: "d1", sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } };
const thieu = { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "MISSING" as const, reason: "MANUAL_LINE" as const }, cungUng: { status: "MISSING" as const } };

test("dongGhiTuChup ↔ banChupTuDb: đi rồi về giữ nguyên bản chụp", () => {
  const v = { id: "t1", orderId: "o1", ngay: "2026-10-10", at: "2026-10-10T01:00:00.000Z", by: "kt", source: "AUTO" as const, reason: null, supersedesId: null };
  // ADR-0133: bản chụp có ba số theo loại đi rồi về vẫn đủ ba số (qua cột nối từ ord_service_terms_pax); bản không có ba số về `theoLoai: null`.
  const baSo = { adult: 50_000, child: 30_000, senior: 40_000 };
  const setBaSo = { ...set, hoaHong: { status: "SET" as const, kind: "PER_PAX" as const, rateBp: null, perPax: 50_000, ruleId: "m9", theoLoai: baSo } };
  for (const c of [set, thieu, setBaSo]) {
    const d = dongGhiTuChup(c, v);
    assert.deepEqual(d.theoLoai, c.hoaHong.status === "SET" ? (("theoLoai" in c.hoaHong ? c.hoaHong.theoLoai : null) ?? null) : null);
    const db = { pax_adult: d.theoLoai?.adult ?? null, pax_child: d.theoLoai?.child ?? null, pax_senior: d.theoLoai?.senior ?? null, id: d.id, order_service_id: d.serviceId, beneficiary_party_id: d.beneficiaryPartyId, commission_status: d.commissionStatus, missing_reason: d.missingReason,
      commission_kind: d.commissionKind, commission_rate_bp: d.rateBp, commission_per_pax: d.perPax, commission_rule_id: d.ruleId, supply_status: d.supplyStatus,
      seller_party_id: d.sellerPartyId, supplier_party_id: d.supplierPartyId, cost_rate_bp: d.costRateBp, supply_term_id: d.termId, source: d.source, captured_date: d.capturedDate };
    const ve = banChupTuDb(db);
    const mong = c.hoaHong.status === "SET" ? { ...c, hoaHong: { ...c.hoaHong, theoLoai: ("theoLoai" in c.hoaHong ? c.hoaHong.theoLoai : null) ?? null } } : c;
    assert.deepEqual(ve, mong);
  }
});

test("moTaChup: đếm dòng, không tỷ lệ, không tiền", () => {
  assert.equal(moTaChup([set, thieu]), "2 dòng: 1 có mức, 1 thiếu mức");
  assert.equal(moTaChup([{ ...set, hoaHong: { status: "NONE" as const } }]), "không người hưởng");
  assert.doesNotMatch(moTaChup([set, thieu]), /%|đ/);
});

// ===== Task 5: hai DTO (văn phòng / Đối tác), kiểm thân ghi tay, áp ghi tay, mô tả nhật ký =====

const chupHai = [
  { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1200, perPax: null, ruleId: "m1" },
    cungUng: { status: "SET" as const, termId: "d1", sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } },
  { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "MISSING" as const, reason: "NO_RULE" as const },
    cungUng: { status: "SET" as const, termId: "d2", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 } },
];
const dichVu = [{ id: "s1", name: "Vé Hòn Tằm", thanhTien: 2_000_000, soKhachTinh: 2 }, { id: "s2", name: "Tắm bùn", thanhTien: 300_000, soKhachTinh: 1 }];
const ten = new Map([["dla", "Đại lý A"], ["ct", "Tour Đảo"], ["ncc", "i-resort"]]);
const phan = { duKien: false, chuaChup: false, chup: chupHai, dichVu, ten, congTyChuId: "ct" };

/** Mọi tên khoá (đệ quy) của một giá trị JSON. */
function khoaCua(x: unknown): string[] {
  if (Array.isArray(x)) return x.flatMap(khoaCua);
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => [k, ...khoaCua(v)]);
  return [];
}

test("DTO văn phòng: mức, hoa hồng, giá đại lý, cờ thiếu; khối nhà cung cấp chỉ khi xemNguoiBan; tổng null khi còn dòng thiếu", () => {
  const a = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan });
  assert.ok("vanPhong" in a);
  const vp = a.vanPhong;
  assert.equal(vp.dong[0]!.hoaHong, 240_000);
  assert.equal(vp.dong[0]!.giaDaiLy, 1_760_000);
  assert.equal(vp.dong[0]!.muc, "12%");
  assert.equal(vp.dong[0]!.thieu, null);
  assert.deepEqual(vp.dong[0]!.nguoiBan, { ten: "Tour Đảo", laCongTy: true });
  assert.equal(vp.dong[0]!.nhaCungCap, undefined, "người bán là công ty ⇒ không có khối nhà cung cấp");
  assert.equal(vp.dong[1]!.thieu, "Chưa có mức cho dịch vụ này");
  assert.equal(vp.dong[1]!.muc, null);
  assert.equal(vp.dong[1]!.hoaHong, null);
  assert.equal(vp.dong[1]!.giaDaiLy, null);
  assert.deepEqual(vp.dong[1]!.nguoiBan, { ten: "i-resort", laCongTy: false });
  assert.equal(vp.dong[1]!.nhaCungCap?.giaVon, 240_000);
  assert.equal(vp.dong[1]!.nhaCungCap?.tyLeMua, "80%");
  assert.equal(vp.tong.hoaHong, null);
  assert.equal(vp.tong.giaDaiLy, null);
  assert.equal(vp.tong.thanhTien, 2_300_000);
  assert.deepEqual(vp.nguoiHuong, { ten: "Đại lý A" });
  const b = dungThuongMai({ laDoiTac: false, xemNguoiBan: false, ...phan });
  assert.ok("vanPhong" in b && b.vanPhong.dong[1]!.nhaCungCap === undefined);
  assert.equal(b.vanPhong.dong[1]!.nguoiBan?.ten, "i-resort", "xemNguoiBan chỉ che khối tỷ lệ mua lại và giá vốn, không che tên người bán");
});

test("DTO văn phòng: đủ mức ⇒ tổng cộng; PER_PAX ghi 'đ/khách' theo SỐ KHÁCH; ghiTay lấy từ tập mã dịch vụ; không người hưởng ⇒ hoa hồng 0, người hưởng null", () => {
  const chup = [
    { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "PER_PAX" as const, rateBp: null, perPax: 50_000, ruleId: null },
      cungUng: { status: "SET" as const, termId: null, sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } },
    { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1250, perPax: null, ruleId: "m1" },
      cungUng: { status: "MISSING" as const } },
  ];
  const a = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan, chup, ghiTay: new Set(["s1"]) });
  assert.ok("vanPhong" in a);
  assert.equal(a.vanPhong.dong[0]!.muc, "50.000đ/khách");
  assert.equal(a.vanPhong.dong[0]!.hoaHong, 100_000, "50.000 × 2 khách tính hoa hồng");
  assert.equal(a.vanPhong.dong[0]!.ghiTay, true);
  assert.equal(a.vanPhong.dong[1]!.ghiTay, false);
  assert.equal(a.vanPhong.dong[1]!.muc, "12,5%");
  assert.equal(a.vanPhong.dong[1]!.hoaHong, 37_500, "12,5% × 300.000");
  assert.equal(a.vanPhong.dong[1]!.nguoiBan, null, "cung ứng thiếu ⇒ không có người bán");
  assert.deepEqual(a.vanPhong.tong, { thanhTien: 2_300_000, hoaHong: 137_500, giaDaiLy: 2_162_500 });
  const khong = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan, chup: chup.map((c) => ({ ...c, beneficiaryPartyId: null, hoaHong: { status: "NONE" as const } })) });
  assert.ok("vanPhong" in khong);
  assert.equal(khong.vanPhong.nguoiHuong, null);
  assert.equal(khong.vanPhong.dong[0]!.hoaHong, 0);
  assert.equal(khong.vanPhong.dong[0]!.muc, null);
  assert.equal(khong.vanPhong.dong[0]!.thieu, null);
});

test("DTO văn phòng: đơn xác nhận trước đợt 1 (chuaChup) ⇒ mọi dòng 'Đơn xác nhận trước khi có bảng mức'; dòng thiếu bản chụp cũng vậy; không có tổng hoa hồng", () => {
  const a = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan, chuaChup: true, chup: [] });
  assert.ok("vanPhong" in a);
  assert.equal(a.vanPhong.chuaChup, true);
  for (const d of a.vanPhong.dong) {
    assert.equal(d.thieu, "Đơn xác nhận trước khi có bảng mức");
    assert.equal(d.hoaHong, null);
    assert.equal(d.nguoiBan, null);
  }
  assert.equal(a.vanPhong.tong.hoaHong, null);
  const thieuMotDong = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan, chup: [chupHai[0]!] });
  assert.ok("vanPhong" in thieuMotDong);
  assert.equal(thieuMotDong.vanPhong.dong[1]!.thieu, "Đơn xác nhận trước khi có bảng mức", "dòng dịch vụ không có bản chụp ⇒ NOT_CAPTURED, không lặng lẽ 0");
});

test("DTO Đối tác: chỉ số tiền hoa hồng của mình; không khoá rate/perPax/cost/ruleId/termId/source/supplier/muc, không nhãn mức, không số lạ", () => {
  const a = dungThuongMai({ laDoiTac: true, xemNguoiBan: false, ...phan });
  assert.ok("doiTac" in a);
  const s = JSON.stringify(a);
  for (const k of ["rate", "perPax", "cost", "ruleId", "termId", "source", "supplier", "nhaCungCap", "1200", "8000"]) assert.doesNotMatch(s, new RegExp(k, "i"), k);
  // Brief gốc dò chuỗi con "muc" (i), nhưng khoá HỢP ĐỒNG `choCongTyCaiMuc` chứa "Muc" ⇒ bài không thể xanh. Giữ NGUYÊN tên khoá (Task 10 dùng) và dò "muc" như TÊN KHOÁ ĐỦ,
  // cộng dò nhãn mức ở GIÁ TRỊ ("%" của tỷ lệ, "đ/khách" của mức mỗi khách) — chặt không kém bản gốc (xem Ruling Task 5 ở sổ thi công).
  assert.ok(!khoaCua(a).some((k) => /^muc$/i.test(k)), "không có khoá tên muc");
  assert.doesNotMatch(s, /%/, "không nhãn tỷ lệ");
  assert.doesNotMatch(s, /đ\/khách/, "không nhãn mức mỗi khách");
  assert.equal(a.doiTac.dong[0]!.hoaHong, 240_000);
  assert.equal(a.doiTac.dong[0]!.giaDaiLy, 1_760_000);
  assert.equal(a.doiTac.dong[1]!.hoaHong, null);
  assert.equal(a.doiTac.dong[1]!.giaDaiLy, null);
  assert.equal(a.doiTac.choCongTyCaiMuc, true);
  assert.deepEqual(a.doiTac.tong, { thanhTien: 2_300_000, hoaHong: null, giaDaiLy: null });
  assert.deepEqual(Object.keys(a.doiTac).sort(), ["choCongTyCaiMuc", "dong", "duKien", "tong"], "danh sách trắng khoá cấp trên");
  assert.deepEqual(Object.keys(a.doiTac.dong[0]!).sort(), ["giaDaiLy", "hoaHong", "serviceId", "ten", "thanhTien"], "danh sách trắng khoá của dòng");
});

test("DTO Đối tác: dù xemNguoiBan = true (tài khoản lai) vẫn là DTO hẹp; đủ mức ⇒ choCongTyCaiMuc false và có tổng; đơn chưa chụp ⇒ chờ công ty", () => {
  const du = dungThuongMai({ laDoiTac: true, xemNguoiBan: true, ...phan, chup: [chupHai[0]!, { ...chupHai[1]!, hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 500, perPax: null, ruleId: "m2" } }] });
  assert.ok("doiTac" in du);
  assert.equal(du.doiTac.choCongTyCaiMuc, false);
  assert.deepEqual(du.doiTac.tong, { thanhTien: 2_300_000, hoaHong: 255_000, giaDaiLy: 2_045_000 });
  assert.doesNotMatch(JSON.stringify(du), /nhaCungCap|giaVon|tyLeMua|i-resort/);
  const chua = dungThuongMai({ laDoiTac: true, xemNguoiBan: false, ...phan, chuaChup: true, chup: [] });
  assert.ok("doiTac" in chua);
  assert.equal(chua.doiTac.choCongTyCaiMuc, true);
  assert.equal(chua.doiTac.dong[0]!.hoaHong, null);
  const nhap = dungThuongMai({ laDoiTac: true, xemNguoiBan: false, ...phan, duKien: true });
  assert.ok("doiTac" in nhap && nhap.doiTac.duKien === true);
});

test("kiemThanGhiTay: lý do ≥ 10 ký tự; ít nhất một phần; số hợp lệ; không dãy số dài", () => {
  assert.equal(kiemThanGhiTay({ lyDo: "ngắn", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok, false);
  assert.equal(kiemThanGhiTay({ lyDo: "thoả thuận miệng với CTV Lan" }).ok, false, "không gửi phần nào");
  assert.ok(kiemThanGhiTay({ lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok);
  assert.ok(kiemThanGhiTay({ lyDo: "nhà cung cấp mới cho vé này", nguoiBan: { partyId: "ncc", tyLeMuaBp: 7500 } }).ok);
  assert.equal(kiemThanGhiTay({ lyDo: "gọi 0905123456 xác nhận", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok, false);
});

test("kiemThanGhiTay: trường khớp kiểu bắt buộc (RATE có tỷ lệ, PER_PAX có đ/khách), số trong khoảng, lý do cắt khoảng trắng và tối đa 300", () => {
  const ly = "thoả thuận miệng với CTV Lan";
  const sai = (b: unknown) => kiemThanGhiTay(b);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE" } }).ok, false, "RATE thiếu tyLeBp");
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "PER_PAX" } }).ok, false, "PER_PAX thiếu moiKhach");
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "PER_PAX", tyLeBp: 1500 } }).ok, false, "PER_PAX mang tyLeBp thay vì moiKhach");
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", moiKhach: 50_000 } }).ok, false, "RATE mang moiKhach thay vì tyLeBp");
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: 1500, moiKhach: 50_000 } }).ok, false, "mang cả hai số");
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: 10_001 } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: -1 } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: 12.5 } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: "1500" } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "PER_PAX", moiKhach: -5 } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "PER_PAX", moiKhach: 100_000_001 } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: { kieu: "GIAM" } }).ok, false);
  assert.equal(sai({ lyDo: ly, hoaHong: [] }).ok, false);
  assert.equal(sai({ lyDo: ly, nguoiBan: { partyId: "x y" } }).ok, false, "mã hồ sơ lạ");
  assert.equal(sai({ lyDo: ly, nguoiBan: {} }).ok, false);
  assert.equal(sai({ lyDo: ly, nguoiBan: { partyId: "ncc", tyLeMuaBp: 10_001 } }).ok, false);
  assert.equal(sai({ lyDo: ly.padEnd(301, "x"), hoaHong: { kieu: "RATE", tyLeBp: 1 } }).ok, false, "lý do dài quá 300");
  assert.equal(sai({ lyDo: "         ngắn      ", hoaHong: { kieu: "RATE", tyLeBp: 1 } }).ok, false, "cắt khoảng trắng rồi mới đếm 10 ký tự");
  assert.equal(sai({ hoaHong: { kieu: "RATE", tyLeBp: 1 } }).ok, false, "thiếu lý do");
  assert.equal(sai(null).ok, false);
  assert.equal(sai([]).ok, false);
  const tot = sai({ lyDo: `  ${ly}  `, hoaHong: { kieu: "PER_PAX", moiKhach: 0 }, nguoiBan: { partyId: "ncc" } });
  assert.ok(tot.ok);
  assert.equal(tot.value.lyDo, ly, "lý do đã cắt khoảng trắng");
  assert.deepEqual(tot.value.hoaHong, { kieu: "PER_PAX", moiKhach: 0 }, "0đ/khách hợp lệ (mức 0 do Kế toán chủ động ghi)");
  assert.deepEqual(tot.value.nguoiBan, { partyId: "ncc" });
  for (const m of [sai({ lyDo: "ngắn", hoaHong: { kieu: "RATE", tyLeBp: 1 } }), sai({ lyDo: ly, hoaHong: { kieu: "RATE" } })]) {
    assert.ok(!m.ok);
    assert.match(m.message, /[ăâêôơưđáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i, "câu báo có dấu tiếng Việt");
  }
});

const truocTay = chupHai[1]!; // thiếu mức, người bán = nhà cung cấp 80%

test("apGhiTay: phần không gửi chép từ bản cũ; hoa hồng gửi lên ⇒ SET với ruleId null; người bán là công ty ⇒ không nhà cung cấp, không a%, không mã điều khoản", () => {
  const a = apGhiTay(truocTay, { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }, "ct");
  assert.deepEqual(a.hoaHong, { status: "SET", kind: "RATE", rateBp: 1500, perPax: null, ruleId: null });
  assert.deepEqual(a.cungUng, truocTay.cungUng, "người bán không gửi ⇒ chép nguyên");
  assert.equal(a.serviceId, "s2");
  assert.equal(a.beneficiaryPartyId, "dla");
  const b = apGhiTay(truocTay, { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "PER_PAX", moiKhach: 50_000 } }, "ct");
  assert.deepEqual(b.hoaHong, { status: "SET", kind: "PER_PAX", rateBp: null, perPax: 50_000, ruleId: null });
  const c = apGhiTay(truocTay, { lyDo: "Tour Đảo tự bán dịch vụ này", nguoiBan: { partyId: "ct" } }, "ct");
  assert.deepEqual(c.cungUng, { status: "SET", termId: null, sellerPartyId: "ct", supplierPartyId: null, costRateBp: null });
  assert.deepEqual(c.hoaHong, truocTay.hoaHong, "hoa hồng không gửi ⇒ chép nguyên");
  const d = apGhiTay(chupHai[0]!, { lyDo: "nhà cung cấp mới cho vé này", nguoiBan: { partyId: "ncc", tyLeMuaBp: 7500 } }, "ct");
  assert.deepEqual(d.cungUng, { status: "SET", termId: null, sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 7500 });
  assert.throws(() => apGhiTay(chupHai[0]!, { lyDo: "nhà cung cấp mới cho vé này", nguoiBan: { partyId: "ncc" } }, "ct"), /tyLeMuaBp/, "không bao giờ tự lấy a% = 0");
});

test("kiemGhiTayVoiBanChup: hoa hồng cho đơn không người hưởng ⇒ 409; nhà cung cấp phải có a%; công ty không a%; hợp lệ ⇒ ok", () => {
  const ly = "thoả thuận miệng với CTV Lan";
  const khongHuong = { serviceId: "s1", beneficiaryPartyId: null, hoaHong: { status: "NONE" as const }, cungUng: chupHai[0]!.cungUng };
  const a = kiemGhiTayVoiBanChup(khongHuong, { lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: 1500 } }, "ct");
  assert.ok(!a.ok);
  assert.equal(a.status, 409);
  assert.match(a.message, /không có người hưởng/);
  assert.ok(kiemGhiTayVoiBanChup(khongHuong, { lyDo: ly, nguoiBan: { partyId: "ncc", tyLeMuaBp: 7000 } }, "ct").ok, "đơn không người hưởng vẫn đổi được người bán");
  const b = kiemGhiTayVoiBanChup(truocTay, { lyDo: ly, nguoiBan: { partyId: "ncc" } }, "ct");
  assert.ok(!b.ok);
  assert.equal(b.status, 400);
  assert.match(b.message, /tỷ lệ mua lại/);
  const c = kiemGhiTayVoiBanChup(truocTay, { lyDo: ly, nguoiBan: { partyId: "ct", tyLeMuaBp: 7000 } }, "ct");
  assert.ok(!c.ok);
  assert.equal(c.status, 400);
  assert.ok(kiemGhiTayVoiBanChup(truocTay, { lyDo: ly, nguoiBan: { partyId: "ct" } }, "ct").ok);
  assert.ok(kiemGhiTayVoiBanChup(truocTay, { lyDo: ly, hoaHong: { kieu: "RATE", tyLeBp: 1500 } }, "ct").ok);
});

test("moTaGhiTay: một dòng, mức trước → sau, người bán chỉ TÊN (không a%), không tiền khách, không lý do", () => {
  const ten2 = new Map([["ct", "Tour Đảo"], ["ncc", "i-resort"]]);
  const thieuMuc = { ...chupHai[1]!, cungUng: chupHai[0]!.cungUng };
  const muoiLam = apGhiTay(thieuMuc, { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }, "ct");
  assert.equal(moTaGhiTay(thieuMuc, muoiLam, "Vé Hòn Tằm", ten2), "Vé Hòn Tằm: thiếu mức → 15%");
  const muoi = chupHai[0]!;
  const muoiLamHai = apGhiTay(muoi, { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }, "ct");
  assert.equal(moTaGhiTay(muoi, muoiLamHai, "Vé Hòn Tằm", ten2), "Vé Hòn Tằm: 12% → 15%");
  const doiBan = apGhiTay(muoi, { lyDo: "nhà cung cấp mới cho vé này", nguoiBan: { partyId: "ncc", tyLeMuaBp: 7500 } }, "ct");
  const cau = moTaGhiTay(muoi, doiBan, "Vé Hòn Tằm", ten2);
  assert.equal(cau, "Vé Hòn Tằm: người bán Tour Đảo → i-resort");
  assert.doesNotMatch(cau, /75|%/, "tỷ lệ mua lại (a%) chỉ người có supply.terms.view xem — không vào nhật ký");
  const caHai = apGhiTay(thieuMuc, { lyDo: "nhà cung cấp mới cho vé này", hoaHong: { kieu: "PER_PAX", moiKhach: 50_000 }, nguoiBan: { partyId: "ncc", tyLeMuaBp: 7500 } }, "ct");
  assert.equal(moTaGhiTay(thieuMuc, caHai, "Vé Hòn Tằm", ten2), "Vé Hòn Tằm: thiếu mức → 50.000đ/khách; người bán Tour Đảo → i-resort");
  const doiTyLe = apGhiTay(chupHai[1]!, { lyDo: "nhà cung cấp đổi tỷ lệ mua lại", nguoiBan: { partyId: "ncc", tyLeMuaBp: 7000 } }, "ct");
  const cauTyLe = moTaGhiTay(chupHai[1]!, doiTyLe, "Tắm bùn", ten2);
  assert.equal(cauTyLe, "Tắm bùn: đổi tỷ lệ mua lại của i-resort");
  assert.doesNotMatch(cauTyLe, /\d/, "không số");
  const giuNguyen = apGhiTay(muoi, { lyDo: "ghi lại cho chắc, mức giữ nguyên", hoaHong: { kieu: "RATE", tyLeBp: 1200 } }, "ct");
  assert.equal(moTaGhiTay(muoi, giuNguyen, "Vé Hòn Tằm", ten2), "Vé Hòn Tằm: 12% (đánh dấu ghi tay)");
  assert.doesNotMatch(moTaGhiTay(thieuMuc, muoiLam, "Vé Hòn Tằm", ten2), /thoả thuận|CTV/, "lý do không vào nhật ký (nằm ở bản chụp)");
});

// ===== Vòng sửa 1 của Task 5: luật "của mình" của GET /api/orders/:id/thuong-mai (Ruling 18) — một hàm thuần quyết 404 / 403 / DTO Đối tác / DTO văn phòng =====

const dauVao = { laDoiTac: false, laDonCuaMinh: true, coXemDon: true, coXemThuongMai: true, chiXemDonDuocGiao: false, partyId: "pty-me" as string | null, nguoiHuong: [] as (string | null)[] };
const che = (v: Partial<typeof dauVao>): CheDoThuongMai => cheDoThuongMai({ ...dauVao, ...v });

test("cheDoThuongMai: thứ tự luật — Đối tác & đơn người khác ⇒ 404 TRƯỚC mọi câu hỏi ô quyền; rồi xem đơn; rồi xem phần đối tác; rồi người hưởng khác ⇒ 404", () => {
  // Văn phòng (không giữ quyền Đối tác): không dính luật "của mình".
  assert.equal(che({}), "vanPhong");
  assert.equal(che({ laDonCuaMinh: false }), "vanPhong", "Kế toán / Bán hàng xem đơn người khác");
  assert.equal(che({ coXemDon: false }), "403");
  assert.equal(che({ coXemDon: false, chiXemDonDuocGiao: true }), "404", "chỉ-HDV không phụ trách: như đơn không tồn tại");
  assert.equal(che({ coXemThuongMai: false }), "403");
  assert.equal(che({ nguoiHuong: ["pty-khac"] }), "vanPhong", "văn phòng thấy mọi người hưởng");
  // Đối tác (kể cả tài khoản lai): luật "của mình".
  assert.equal(che({ laDoiTac: true }), "doiTac", "đơn của mình, chưa biết người hưởng");
  assert.equal(che({ laDoiTac: true, laDonCuaMinh: false }), "404", "(a) đơn người khác");
  assert.equal(che({ laDoiTac: true, laDonCuaMinh: false, coXemDon: false }), "404", "(a) đứng TRƯỚC câu hỏi xem đơn: không 403 dò được");
  assert.equal(che({ laDoiTac: true, laDonCuaMinh: false, coXemDon: true, coXemThuongMai: false }), "404");
  assert.equal(che({ laDoiTac: true, coXemThuongMai: false }), "403");
  assert.equal(che({ laDoiTac: true, nguoiHuong: [null] }), "doiTac", "khách lẻ / không người hưởng: DTO Đối tác như cũ");
  assert.equal(che({ laDoiTac: true, nguoiHuong: ["pty-me"] }), "doiTac", "(b2) người hưởng là hồ sơ của mình");
  assert.equal(che({ laDoiTac: true, nguoiHuong: ["pty-khac"] }), "404", "(b2) người hưởng là người khác");
  assert.equal(che({ laDoiTac: true, nguoiHuong: [null, "pty-khac"] }), "404", "(b2) một dòng của người khác là đủ — cả đơn 404");
  assert.equal(che({ laDoiTac: true, nguoiHuong: ["pty-me", "pty-khac"] }), "404");
  assert.equal(che({ laDoiTac: true, nguoiHuong: ["pty-me", null, "pty-me"] }), "doiTac");
  assert.equal(che({ laDoiTac: true, partyId: null, nguoiHuong: ["pty-khac"] }), "404", "chưa gắn hồ sơ: không có gì là 'của mình'");
  assert.equal(che({ laDoiTac: true, partyId: null, nguoiHuong: [null] }), "doiTac");
});

// Tiêu chí 7 của đặc tả (kế hoạch bỏ sót; người kiểm Task 5 xác nhận hai bài 1024 cũ không chạm ô mới): duyệt MỌI tập con của 10 mã quyền, dùng can() / holdsPartner() /
// seesOnlyAssignedOrders() THẬT của permissions.ts để dựng đầu vào — nên đổi một ô order.view / order.terms.view của cột nào làm lệch kết quả là bài này đỏ.
test("cheDoThuongMai trên cả 1024 tập quyền × {đơn của mình, đơn người khác} × {được giao, không} × {hồ sơ có, không} × sáu dạng người hưởng: có PARTNER thì không bao giờ ra DTO văn phòng", () => {
  const DANG_NGUOI_HUONG: { ten: string; ds: (string | null)[]; khac: boolean }[] = [
    { ten: "không dòng nào (chưa đọc)", ds: [], khac: false },
    { ten: "khách lẻ (null)", ds: [null], khac: false },
    { ten: "chính hồ sơ mình", ds: ["pty-me"], khac: false },
    { ten: "hồ sơ người khác", ds: ["pty-khac"], khac: true },
    { ten: "null rồi người khác", ds: [null, "pty-khac"], khac: true },
    { ten: "mình rồi người khác", ds: ["pty-me", "pty-khac"], khac: true },
  ];
  const thay = new Set<CheDoThuongMai>();
  let tapCon = 0;
  let caKiem = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions: PermissionCode[] = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    tapCon++;
    const coPartner = permissions.includes("PARTNER");
    for (const donCuaMinh of [true, false]) for (const assigned of [true, false]) for (const partyId of ["pty-me", null] as (string | null)[]) for (const dang of DANG_NGUOI_HUONG) {
      if (partyId === null && dang.ds.includes("pty-me")) continue; // tài khoản chưa gắn hồ sơ thì không thể là người hưởng "pty-me"
      const staff = { id: "nv", permissions, partyId };
      const scope = { ownerId: donCuaMinh ? "nv" : "nguoi-khac", assigned };
      const coXemDon = can(staff, "order.view", scope);
      const coXemThuongMai = can(staff, "order.terms.view", scope);
      const kq = cheDoThuongMai({ laDoiTac: holdsPartner(staff), laDonCuaMinh: donCuaMinh, coXemDon, coXemThuongMai, chiXemDonDuocGiao: seesOnlyAssignedOrders(staff), partyId, nguoiHuong: dang.ds });
      const nhan = `${permissions.join("+") || "(không quyền)"} · ${donCuaMinh ? "đơn của mình" : "đơn người khác"} · ${assigned ? "được giao" : "không giao"} · hồ sơ ${partyId ?? "null"} · ${dang.ten}`;
      thay.add(kq);
      caKiem++;
      if (coPartner) {
        assert.notEqual(kq, "vanPhong", `(i) có PARTNER không bao giờ ra DTO văn phòng: ${nhan}`);
        if (!donCuaMinh) assert.equal(kq, "404", `(ii) có PARTNER + đơn người khác ⇒ 404: ${nhan}`);
        else if (dang.khac) assert.equal(kq, "404", `(iii) có PARTNER + người hưởng người khác ⇒ 404: ${nhan}`);
        else assert.equal(kq, "doiTac", `đơn của mình, người hưởng là mình / null ⇒ DTO Đối tác: ${nhan}`);
      } else {
        // (iv) không PARTNER: người hưởng nào cũng không đổi kết quả; vanPhong ⇔ xem được đơn VÀ xem được phần đối tác theo phạm vi.
        assert.notEqual(kq, "doiTac", `chỉ tài khoản giữ PARTNER mới ra DTO Đối tác: ${nhan}`);
        if (coXemDon && coXemThuongMai) assert.equal(kq, "vanPhong", `(iv) ${nhan}`);
        else assert.equal(kq, !coXemDon && seesOnlyAssignedOrders(staff) ? "404" : "403", `từ chối đúng mã: ${nhan}`);
      }
    }
  }
  assert.equal(tapCon, 1024);
  assert.ok(caKiem > 40_000, `số ca ${caKiem}`);
  assert.deepEqual([...thay].sort(), ["403", "404", "doiTac", "vanPhong"], "bài có đủ bốn kết quả (không kiểm rỗng)");
});

// ===== Sổ đại lý đợt 2, Task 7: tổng hoa hồng cho trần giảm giá / cảnh báo (cùng phép tính dòng `tinhDongDoiTac` với DTO) =====
import { benDatKhongHuongDon, coNguoiHuongDon, nguoiHuongCuaDon, tongHoaHongDon } from "./thuong-mai.ts";

test("Task 7 tongHoaHongDon: cộng hoa hồng các dòng theo bản chụp; dòng thiếu mức ⇒ 0 (trần nháp / xác nhận) hoặc null (cảnh báo); dòng không có bản chụp ⇒ thiếu mức", () => {
  const dv = [{ id: "s1", thanhTien: 7_900_000, soKhachTinh: 10 }, { id: "s2", thanhTien: 300_000, soKhachTinh: 1 }];
  assert.equal(tongHoaHongDon([set], [dv[0]!], "tinh0"), 790_000, "C-5: 10% của 7.900.000");
  assert.equal(tongHoaHongDon([set, thieu], dv, "tinh0"), 790_000, "dòng nhập tay thiếu mức tính 0");
  assert.equal(tongHoaHongDon([set, thieu], dv, "null"), null, "cảnh báo: còn dòng thiếu mức thì không đoán");
  assert.equal(tongHoaHongDon([set], dv, "tinh0"), 790_000, "dòng s2 không có bản chụp ⇒ thiếu mức ⇒ 0");
  assert.equal(tongHoaHongDon([set], dv, "null"), null);
  assert.equal(tongHoaHongDon([{ ...set, beneficiaryPartyId: null, hoaHong: { status: "NONE" as const } }], [dv[0]!], "null"), 0, "khách lẻ: hoa hồng 0");
  // cùng số với DTO phần thương mại (một phép tính dòng)
  const dto = dungThuongMai({ laDoiTac: false, xemNguoiBan: false, duKien: false, chuaChup: false, chup: [set], dichVu: [{ ...dv[0]!, name: "Tour" }], ten: new Map(), congTyChuId: null });
  assert.equal(tongHoaHongDon([set], [dv[0]!], "null"), dto.vanPhong!.tong.hoaHong);
});

test("Task 7 coNguoiHuongDon: có dòng bản chụp mang người hưởng (kể cả bên đặt không còn được hưởng — dòng thiếu mức)", () => {
  assert.equal(coNguoiHuongDon([set]), true);
  assert.equal(coNguoiHuongDon([thieu]), true);
  assert.equal(coNguoiHuongDon([{ ...set, beneficiaryPartyId: null, hoaHong: { status: "NONE" as const } }]), false);
  assert.equal(coNguoiHuongDon([]), false);
});

test("Task 7 vòng sửa: nguoiHuongCuaDon / benDatKhongHuongDon đọc từ bản chụp", () => {
  assert.equal(nguoiHuongCuaDon([set]), "dla");
  assert.equal(nguoiHuongCuaDon([{ ...set, beneficiaryPartyId: null, hoaHong: { status: "NONE" as const } }]), null);
  assert.equal(benDatKhongHuongDon([set]), false);
  assert.equal(benDatKhongHuongDon([{ ...thieu, hoaHong: { status: "MISSING" as const, reason: "BOOKER_NOT_BENEFICIARY" as const } }]), true);
  assert.equal(benDatKhongHuongDon([thieu]), false, "dòng nhập tay thiếu mức không phải lý do bên đặt");
});
