// Luật hiển thị của màn «Hạn mức trả sau» và khối Thanh toán trên đơn (ADR-0168; kế hoạch Task 6). Thay R-CRD-3 (bộ kiểm dữ liệu không tính được phải thu).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CAU_TRA_SAU_DOI_TAC, CAU_VE_TRA_TRUOC, NHAN_TRANG_THAI_HAN, cauChonTraSau, dongTraSauCuaToi, duocChonSanTraSau, cauDonNo, cauGoiYDienSan, cauMucToiDa, cauGio, cauHanMuc, canhBaoVuotHanMuc, goiYCuaCap, giaTriOGioVn, locHoSoTraSau, docGio, docHanMuc, docHanMoi, nhanAnHan, nhanHinhThucDon, nhanQuaHan, quyetHinhThuc } from "./han-muc-tra-sau-hien-thi.ts";
import { cauKhongTraSauChoNguoiGui, dongTien, laDoiTacTraSau, lyDoKhongTraSau } from "./tra-sau.ts";

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

// ---- ADR-0198: đối tác thấy Trả sau ở dạng gọn, không số hạn mức; đơn mới của đối tác chọn sẵn «Trả sau» ------------------------------------------------
// Số canh: ba số khác hẳn nhau để biết chữ nào lộ số nào. Hạn mức và còn-được-dùng KHÔNG BAO GIỜ được hiện cho đối tác; số đang nợ thì vẫn hiện (Đ1 mục 5: «dòng sau chỉ còn "Đang nợ …"»).
const HAN_MUC_CANH = 73_100_000;
const CON_DUOC_DUNG_CANH = 41_900_000;
const DANG_NO_CANH = 31_200_000;
const coSoTien = (s: string): boolean => /₫/.test(s) || /\d{1,3}(\.\d{3})+/.test(s) || /\d{4,}/.test(s);

test("ADR-0198 Đ1.2: đối tác thấy câu gọn ở ô lập đơn, không số; văn phòng giữ «Hạn mức khả dụng»", () => {
  const dt = cauChonTraSau({ coHanMuc: true, conDuocDung: CON_DUOC_DUNG_CANH, coDonQuaHan: false, laDoiTac: true });
  assert.deepEqual(dt, { hien: true, khoa: null, cau: CAU_TRA_SAU_DOI_TAC });
  assert.equal(CAU_TRA_SAU_DOI_TAC, "Bạn được trả sau. Nhận vé trước, chuyển tiền cho Tour Đảo trong hạn trả.");
  const vp = cauChonTraSau({ coHanMuc: true, conDuocDung: CON_DUOC_DUNG_CANH, coDonQuaHan: false, laDoiTac: false });
  assert.equal(vp.cau, `Hạn mức khả dụng ${dongTien(CON_DUOC_DUNG_CANH)}`);
  // Đ1.3: bị khoá vì quá hạn thì giữ câu khoá cũ (không số)
  const khoa = cauChonTraSau({ coHanMuc: true, conDuocDung: CON_DUOC_DUNG_CANH, coDonQuaHan: true, laDoiTac: true });
  assert.ok(khoa.khoa && !coSoTien(khoa.khoa));
});

test("ADR-0198 Đ1.5: «Trả sau của tôi» của đối tác: dòng một không số tiền (giữ số giờ), dòng hai chỉ còn «Đang nợ …»", () => {
  const r = { coHanMuc: true, hanMuc: HAN_MUC_CANH, gioTra: 36, gioAnHan: 12, dangNo: DANG_NO_CANH, conDuocDung: CON_DUOC_DUNG_CANH };
  const dt = dongTraSauCuaToi(r, true);
  assert.equal(dt.dong1, "Bạn được trả sau, trả trong 36 giờ kể từ khi đơn được xác nhận, sau đó còn 12 giờ ân hạn.");
  assert.equal(dt.dong2, `Đang nợ ${dongTien(DANG_NO_CANH)}`);
  assert.equal(dongTraSauCuaToi({ ...r, gioTra: 48, gioAnHan: 0 }, true).dong1, "Bạn được trả sau, trả trong 48 giờ (2 ngày) kể từ khi đơn được xác nhận.");
  assert.equal(dongTraSauCuaToi({ ...r, coHanMuc: false, hanMuc: null, gioTra: null, gioAnHan: null, conDuocDung: null }, true).dong1, "Chưa cấp");
  // văn phòng (không phải đối tác): giữ nguyên như trước
  const vp = dongTraSauCuaToi(r, false);
  assert.equal(vp.dong1, cauHanMuc(r));
  assert.equal(vp.dong2, `Đang nợ ${dongTien(DANG_NO_CANH)} · Hạn mức khả dụng ${dongTien(CON_DUOC_DUNG_CANH)}`);
});

test("ADR-0198 Đ1.7: mọi chữ trả cho đối tác không lộ hạn mức hay còn-được-dùng; ba câu mới không có «₫» hay số tiền", () => {
  const lo = (s: string): boolean => s.includes(dongTien(HAN_MUC_CANH)) || s.includes(dongTien(CON_DUOC_DUNG_CANH)) || /73\.?100\.?000|41\.?900\.?000/.test(s);
  const chu: string[] = [];
  for (const coDonQuaHan of [false, true]) {
    const c = cauChonTraSau({ coHanMuc: true, conDuocDung: CON_DUOC_DUNG_CANH, coDonQuaHan, laDoiTac: true });
    chu.push(c.cau, c.khoa ?? "");
  }
  for (const gioAnHan of [0, 12, 48]) {
    const d = dongTraSauCuaToi({ coHanMuc: true, hanMuc: HAN_MUC_CANH, gioTra: 24, gioAnHan, dangNo: DANG_NO_CANH, conDuocDung: CON_DUOC_DUNG_CANH }, true);
    chu.push(d.dong1, d.dong2);
    assert.ok(!coSoTien(d.dong1), d.dong1);
  }
  const quaMuc = cauKhongTraSauChoNguoiGui({ ma: "vuot_han_muc", cau: lyDoKhongTraSau({ hanMuc: { hanMuc: HAN_MUC_CANH, gioTra: 24, gioAnHan: 0 }, noHienTai: DANG_NO_CANH, soTienDon: 99_000_000, coDonQuaHan: false })!.cau }, true);
  chu.push(quaMuc);
  for (const s of chu) assert.ok(!lo(s), `lộ số hạn mức: ${s}`);
  for (const s of [CAU_TRA_SAU_DOI_TAC, quaMuc]) assert.ok(!coSoTien(s), s);
});

test("ADR-0198 Đ2 mục 6: chọn sẵn hình thức — bốn ca", () => {
  const co = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: false, laDoiTac: true });
  const khong = cauChonTraSau({ coHanMuc: false, conDuocDung: 0, coDonQuaHan: false, laDoiTac: true });
  const quaHan = cauChonTraSau({ coHanMuc: true, conDuocDung: 1_000_000, coDonQuaHan: true, laDoiTac: true });
  const chonSan = (laDoiTac: boolean, donMoi: boolean, daChon: boolean) => duocChonSanTraSau({ laDoiTac, donMoi, daChon });
  // 1. đơn mới của đối tác + dùng được → Trả sau
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: co, chonSan: chonSan(true, true, false) }), { chon: "CREDIT", bao: null });
  // 2. đơn mới của đối tác + không dùng được → Thanh toán ngay, KHÔNG câu báo
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: khong, chonSan: chonSan(true, true, false) }), { chon: "PREPAID", bao: null });
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: quaHan, chonSan: chonSan(true, true, false) }), { chon: "PREPAID", bao: null });
  // 3. nháp đã lưu «Thanh toán ngay» → giữ
  assert.equal(chonSan(true, false, true), false);
  assert.equal(chonSan(true, true, true), false, "đã chọn (hoặc nạp lại bản đang gõ dở) thì không chọn sẵn đè lên");
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: co, chonSan: chonSan(true, false, true) }), { chon: "PREPAID", bao: null });
  // 4. văn phòng lập → Thanh toán ngay
  assert.equal(chonSan(false, true, false), false);
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: co, chonSan: chonSan(false, true, false) }), { chon: "PREPAID", bao: null });
  // bên đặt chưa nạp xong: chưa chọn sẵn
  assert.deepEqual(quyetHinhThuc({ dangChon: "PREPAID", c: khong, benDatChuaNap: true, chonSan: true }), { chon: "PREPAID", bao: null });
});

test("ADR-0198 Đ1.4 và Đ1 mục 1: câu vượt hạn mức đổi chữ chỉ khi người gửi là đối tác (giữ Đối tác, không giữ Kế toán); mã khác giữ nguyên câu", () => {
  const vuot = { ma: "vuot_han_muc" as const, cau: "Đơn trả sau 5.000.000 ₫ vượt hạn mức khả dụng…" };
  assert.equal(cauKhongTraSauChoNguoiGui(vuot, true), "Đơn này vượt mức được trả sau. Chọn Thanh toán ngay, hoặc liên hệ Tour Đảo.");
  assert.equal(cauKhongTraSauChoNguoiGui(vuot, false), vuot.cau);
  const quaHan = { ma: "co_don_qua_han" as const, cau: "Bên đặt còn đơn trả sau quá hạn chưa thanh toán." };
  assert.equal(cauKhongTraSauChoNguoiGui(quaHan, true), quaHan.cau);
  assert.equal(laDoiTacTraSau({ permissions: ["PARTNER"] }), true);
  assert.equal(laDoiTacTraSau({ permissions: ["PARTNER", "ACCOUNTING"] }), false);
  assert.equal(laDoiTacTraSau({ permissions: ["SALES"] }), false);
  assert.equal(laDoiTacTraSau({ permissions: ["ADMIN", "PARTNER"] }), true, "giữ Đối tác mà không giữ Kế toán thì vẫn là đối tác (ADR-0196 mục 1)");
});
