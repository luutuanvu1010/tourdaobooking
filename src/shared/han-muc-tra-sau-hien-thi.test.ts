// Luật hiển thị của màn «Hạn mức trả sau» và khối Thanh toán trên đơn (ADR-0168; kế hoạch Task 6). Thay R-CRD-3 (bộ kiểm dữ liệu không tính được phải thu).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_VE_TRA_TRUOC, NHAN_TRANG_THAI_HAN, cauChonTraSau, cauDonNo, cauGoiYDienSan, cauMucToiDa, cauGio, cauHanMuc, canhBaoVuotHanMuc, goiYCuaCap, giaTriOGioVn, locHoSoTraSau, docGio, docHanMuc, docHanMoi, nhanAnHan, nhanHinhThucDon, nhanQuaHan, quyetHinhThuc } from "./han-muc-tra-sau-hien-thi.ts";

test("cảnh báo khi nợ vượt hạn mức hiện hành; vừa bằng thì chưa cảnh báo", () => {
  assert.equal(canhBaoVuotHanMuc({ hanMuc: 50_000_000, dangNo: 50_000_000 }), null);
  assert.equal(canhBaoVuotHanMuc({ hanMuc: 50_000_000, dangNo: 0 }), null);
  const c = canhBaoVuotHanMuc({ hanMuc: 30_000_000, dangNo: 45_000_000 });
  assert.ok(c && c.includes("45.000.000") && c.includes("30.000.000") && c.includes("vượt"), String(c));
});

test("hết hạn mức mà còn nợ cũng cảnh báo; không hạn mức và không nợ thì im", () => {
  assert.equal(canhBaoVuotHanMuc({ hanMuc: null, dangNo: 0 }), null);
  const c = canhBaoVuotHanMuc({ hanMuc: null, dangNo: 7_000_000 });
  assert.ok(c && c.includes("7.000.000") && c.includes("không còn hạn mức"), String(c));
});

test("nhãn hạn mức và nhãn quá hạn", () => {
  // ADR-0172 Đ3: thời hạn trả và ân hạn tính bằng GIỜ.
  assert.equal(cauHanMuc({ hanMuc: 50_000_000, gioTra: 36, gioAnHan: 12 }), "50.000.000 ₫ · trả trong 36 giờ · ân hạn 12 giờ");
  assert.equal(cauHanMuc({ hanMuc: 50_000_000, gioTra: 48, gioAnHan: 0 }), "50.000.000 ₫ · trả trong 48 giờ (2 ngày) · không ân hạn");
  assert.equal(cauHanMuc({ hanMuc: null, gioTra: null, gioAnHan: null }), "Chưa cấp");
  assert.equal(cauGio(1), "1 giờ");
  assert.equal(cauGio(720), "720 giờ (30 ngày)");
  assert.equal(nhanQuaHan(0), null);
  assert.equal(nhanQuaHan(2), "2 đơn quá hạn");
  assert.equal(nhanAnHan(0), null);
  assert.equal(nhanAnHan(1), "1 đơn đang trong ân hạn");
});

test("nhãn hình thức trên chi tiết đơn: Trả sau kèm giờ và ngày hạn trả theo giờ Việt Nam (ADR-0172 Đ3 mục 4); Trả trước không kèm gì", () => {
  assert.equal(nhanHinhThucDon("PREPAID", null), "Thanh toán ngay");
  assert.equal(nhanHinhThucDon("CREDIT", "2026-11-10T09:00:00.000Z"), "Trả sau · hạn trả 16:00 10/11/2026");
  assert.equal(nhanHinhThucDon("CREDIT", "2026-11-10T20:30:00.000Z"), "Trả sau · hạn trả 03:30 11/11/2026", "qua nửa đêm giờ Việt Nam thì sang ngày sau");
  assert.equal(nhanHinhThucDon("CREDIT", null), "Trả sau");
});

test("ba trạng thái hạn có nhãn riêng; dòng đơn nợ hiện giờ Việt Nam và trạng thái", () => {
  assert.deepEqual(NHAN_TRANG_THAI_HAN, { trong_han: "Trong hạn", an_han: "Quá hạn, đang trong ân hạn", qua_han: "Quá hạn" });
  const d = { orderId: "x", maDon: "TD-1", hanTra: "2026-11-10T09:00:00.000Z", hetAnHan: "2026-11-10T21:00:00.000Z", no: 6_000_000, trangThai: "an_han" as const };
  assert.equal(cauDonNo(d), "nợ 6.000.000 ₫ · hạn trả 16:00 10/11/2026 · Quá hạn, đang trong ân hạn tới 04:00 11/11/2026");
  assert.equal(cauDonNo({ ...d, trangThai: "trong_han" }), "nợ 6.000.000 ₫ · hạn trả 16:00 10/11/2026");
  assert.equal(cauDonNo({ ...d, trangThai: "qua_han" }), "nợ 6.000.000 ₫ · hạn trả 16:00 10/11/2026 · Quá hạn");
});

test("ô hạn mới của «Ân hạn»: giá trị ô ngày giờ hiểu là giờ Việt Nam dù máy đặt múi giờ nào; giá trị mặc định là hạn cũ theo giờ Việt Nam", () => {
  assert.deepEqual(docHanMoi("2026-11-12T16:00"), { ok: true, iso: "2026-11-12T09:00:00.000Z" });
  for (const sai of ["", "2026-02-30T10:00", "12/11/2026 16:00"]) assert.equal(docHanMoi(sai).ok, false, sai);
  assert.equal(giaTriOGioVn("2026-11-10T20:30:00.000Z"), "2026-11-11T03:30");
});

test("ô giờ: thời hạn trả từ 1, ân hạn từ 0, tối đa 8760 giờ (365 ngày)", () => {
  assert.deepEqual(docGio("36", 1, "Thời hạn trả"), { ok: true, gio: 36 });
  assert.deepEqual(docGio("0", 0, "Ân hạn"), { ok: true, gio: 0 });
  for (const sai of ["", "0", "8761", "1,5", "abc"]) assert.equal(docGio(sai, 1, "Thời hạn trả").ok, false, sai);
  const r = docGio("0", 1, "Thời hạn trả");
  assert.ok(!r.ok && r.message.includes("Thời hạn trả") && r.message.includes("8760"), JSON.stringify(r));
});

test("số gợi ý của cấp (ADR-0172 Đ2): chỉ lấy đúng cấp hiện hành của hồ sơ; không cấp hoặc cấp chưa có số thì không gợi ý", () => {
  const goiY = [{ cap: "TA1", hanMuc: 50_000_000, gioTra: 36, gioAnHan: 12 }, { cap: "TA2", hanMuc: 20_000_000, gioTra: 24, gioAnHan: 0 }];
  assert.deepEqual(goiYCuaCap(goiY, "TA1"), goiY[0]);
  assert.equal(goiYCuaCap(goiY, "TA3"), null);
  assert.equal(goiYCuaCap(goiY, null), null);
});

test("khối chọn hình thức: không hạn mức thì ẩn; có hạn mức hiện «Hạn mức khả dụng»; quá hạn thì khoá kèm lý do", () => {
  assert.deepEqual(cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false }), { hien: false, khoa: null, cau: "" });
  assert.deepEqual(cauChonTraSau({ coHanMuc: true, conDuocDung: 12_000_000, coDonQuaHan: false }), { hien: true, khoa: null, cau: "Hạn mức khả dụng 12.000.000 ₫" });
  const q = cauChonTraSau({ coHanMuc: true, conDuocDung: 12_000_000, coDonQuaHan: true });
  assert.equal(q.hien, true);
  assert.ok(q.khoa && q.khoa.includes("quá hạn"), String(q.khoa));
});

test("ô nhập hạn mức: số nguyên đồng dương, bỏ dấu chấm nghìn, trần 10 tỷ", () => {
  assert.deepEqual(docHanMuc("50.000.000"), { ok: true, dong: 50_000_000 });
  assert.equal(docHanMuc("").ok, false);
  assert.equal(docHanMuc("0").ok, false);
  assert.equal(docHanMuc("12,5").ok, false);
  assert.equal(docHanMuc("10.000.000.001").ok, false);
});

test("quyết hình thức sau khi biết hạn mức của bên đặt: giữ lựa chọn khi dùng được; về Trả trước KÈM câu báo khi không dùng được (không đổi âm thầm)", () => {
  const co = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: false });
  const khong = cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false });
  const quaHan = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: true });
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: co }), { chon: "CREDIT", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: co }), { chon: "PREPAID", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: khong }), { chon: "PREPAID", bao: null }, "đang Trả trước thì không có gì để báo");
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: khong }), { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC });
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: quaHan }), { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC });
  assert.ok(CAU_VE_TRA_TRUOC.includes("Thanh toán ngay") && CAU_VE_TRA_TRUOC.includes("hạn mức"));
});

test("bên đặt CHƯA nạp xong (đang mở nháp): không đổi lựa chọn, không báo — tránh đổi âm thầm Trả sau về Trả trước", () => {
  const chuaCo = cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false });
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: chuaCo, benDatChuaNap: true }), { chon: "CREDIT", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: chuaCo, benDatChuaNap: true }), { chon: "PREPAID", bao: null });
  // đã nạp xong mà không có bên đặt / không hạn mức: về Trả trước kèm câu báo
  assert.deepEqual(quyetHinhThuc({ dangChon: "CREDIT", c: chuaCo, benDatChuaNap: false }), { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC });
});

test("chọn hồ sơ ở màn hạn mức: lọc không phân biệt dấu và hoa thường, xếp theo tên, giới hạn số dòng", () => {
  const ds = [
    { partyId: "p3", ten: "Đại Lý Biển Xanh" },
    { partyId: "p1", ten: "Công Ty Mới Thử" },
    { partyId: "p2", ten: "Ánh Dương Travel" },
  ];
  // Ô tìm cũ của Danh bạ không ra «Đại Lý» khi gõ «đại lý» hay «dai ly» (chữ hoa có dấu): danh sách mới phải ra.
  assert.deepEqual(locHoSoTraSau(ds, "đại lý").hien.map((x) => x.partyId), ["p3"]);
  assert.deepEqual(locHoSoTraSau(ds, "dai ly").hien.map((x) => x.partyId), ["p3"]);
  assert.deepEqual(locHoSoTraSau(ds, "anh duong").hien.map((x) => x.partyId), ["p2"]);
  assert.deepEqual(locHoSoTraSau(ds, "  CÔNG ty ").hien.map((x) => x.partyId), ["p1"]);
  // Chưa gõ gì: hiện cả danh sách theo tên (không chờ gõ đủ hai chữ).
  assert.deepEqual(locHoSoTraSau(ds, "").hien.map((x) => x.ten), ["Ánh Dương Travel", "Công Ty Mới Thử", "Đại Lý Biển Xanh"]);
  assert.equal(locHoSoTraSau(ds, "").conLai, 0);
  assert.deepEqual(locHoSoTraSau(ds, "không có").hien, []);
  const nhieu = Array.from({ length: 25 }, (_, i) => ({ partyId: `x${i}`, ten: `Đối tác ${String(i).padStart(2, "0")}` }));
  const r = locHoSoTraSau(nhieu, "", 20);
  assert.equal(r.hien.length, 20);
  assert.equal(r.conLai, 5);
});

test("câu nhắc trong bảng bật Trả sau: số gợi ý chỉ điền sẵn; Quản trị thấy mức tối đa của mình, Toàn quyền không bị giới hạn", () => {
  assert.equal(cauGoiYDienSan(true, "TA1"), null, "đang bật thì hiện số đang bật, không nhắc gợi ý");
  assert.equal(cauGoiYDienSan(false, "TA1"), "Đã điền sẵn số gợi ý của cấp TA1. Đổi được trước khi lưu.");
  assert.equal(cauGoiYDienSan(false, null), null);
  assert.equal(cauMucToiDa(null, true), null);
  assert.equal(cauMucToiDa(30_000_000, true), null);
  assert.equal(cauMucToiDa(30_000_000, false), "Quản trị đặt được hạn mức tới 30.000.000 ₫.");
  assert.ok(String(cauMucToiDa(null, false)).includes("Toàn quyền chưa đặt"));
});
