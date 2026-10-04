// Luật thuần HIỂN THỊ của hai màn V13 (Chính sách điều phối — Toàn quyền; Lý do điều phối — Quản trị) và trang điều kiện xuất bến / hạng bằng
// (ADR-0049 D2, ADR-0050 VK1-A/VK1-C; bản vẽ docs/design/van-chuyen-dieu-phoi/project/08 Chinh sach dieu phoi.dc.html) — src/shared/chinh-sach-hien-thi.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NHOM_LY_DO_HIEN, docDieuKienMoi, docFormChinhSach, docSoKhachHang, nhanSoKhachHang, nutBatTatLyDo, dongLichSuChinhSach, formTuChinhSach, gioTuPhut, maLyDoMoi, nhanDieuKien, nhanThoiLuong, nhomLyDoHien, thayDoiChinhSach,
  thuTuLyDoMoi, tomTatChinhSach,
} from "./chinh-sach-hien-thi.ts";
import { kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, MA_LY_DO_RE } from "../modules/van-chuyen/chinh-sach.ts";
import type { DepartureRuleDto, DispatchPolicyDto, TripReasonDto } from "./contracts.ts";

const chinhSach = (o: Partial<DispatchPolicyDto> = {}): DispatchPolicyDto => ({
  id: "p1", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false, proxyBackdateMaxMinutes: 180,
  dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, validFrom: "2026-09-01T00:00:00.000Z", current: true, nguoiLuu: null, ...o,
});
const form = (o: Partial<Parameters<typeof docFormChinhSach>[0]> = {}) => ({ mocGio: "6", satMocGio: "2", nghiPhut: "30", khaiLuiPhut: "180", gioLaiGio: "8", chuyenDaiGio: "4", duDanhSach: true, ...o });

test("nhanThoiLuong: số phút → lời thường (giờ tròn, giờ + phút, phút)", () => {
  assert.equal(nhanThoiLuong(360), "6 giờ");
  assert.equal(nhanThoiLuong(90), "1 giờ 30 phút");
  assert.equal(nhanThoiLuong(30), "30 phút");
  assert.equal(nhanThoiLuong(0), "0 phút");
  assert.equal(nhanThoiLuong(60), "1 giờ");
});

test("gioTuPhut: giá trị ô giờ — tròn thì số nguyên, lẻ thì thập phân đủ để khứ hồi đúng số phút", () => {
  assert.equal(gioTuPhut(360), "6");
  assert.equal(gioTuPhut(90), "1.5");
  for (const phut of [1, 7, 100, 359, 361, 2879, 2880]) {
    const r = docFormChinhSach(form({ mocGio: gioTuPhut(phut) }));
    assert.ok(r.ok, `khứ hồi ${phut}`);
    assert.equal(r.value.minLeadMinutes, phut, `khứ hồi ${phut}`);
  }
});

test("docFormChinhSach: hợp lệ → thân POST đúng bảy khoá (không ngày hiệu lực, không hợp đồng; hai con số giờ lái ADR-0055 VK2-B — K2: ô theo GIỜ) và máy chủ nhận", () => {
  const r = docFormChinhSach(form({ mocGio: "5", satMocGio: "1,5", nghiPhut: "45", khaiLuiPhut: "240", gioLaiGio: "9", chuyenDaiGio: "4,5", duDanhSach: false }));
  assert.ok(r.ok);
  assert.deepEqual(r.value, { minLeadMinutes: 300, warnLeadMinutes: 90, restMinutes: 45, requireManifest: false, proxyBackdateMaxMinutes: 240, dutyDayMaxMinutes: 540, tripNoBreakMaxMinutes: 270 });
  assert.deepEqual(Object.keys(r.value).sort(), ["dutyDayMaxMinutes", "minLeadMinutes", "proxyBackdateMaxMinutes", "requireManifest", "restMinutes", "tripNoBreakMaxMinutes", "warnLeadMinutes"]);
  assert.ok(kiemChinhSachMoi({ ...r.value }).ok, "luật máy chủ nhận đúng thân này");
});

test("docFormChinhSach: mỗi ô sai một câu lời thường theo đơn vị của ô (giờ / phút) — F: khai lùi ngoài 1–1440", () => {
  const loi = (o: Partial<Parameters<typeof docFormChinhSach>[0]>) => {
    const r = docFormChinhSach(form(o));
    assert.equal(r.ok, false);
    return r.ok ? {} : r.loi;
  };
  assert.match(loi({ mocGio: "" }).mocGio ?? "", /Nhập mốc tối thiểu/);
  assert.match(loi({ mocGio: "0" }).mocGio ?? "", /giờ.*không tắt được/);
  assert.match(loi({ mocGio: "49" }).mocGio ?? "", /tối đa 48/);
  assert.match(loi({ mocGio: "abc" }).mocGio ?? "", /giờ/);
  assert.match(loi({ satMocGio: "25" }).satMocGio ?? "", /từ 0 đến 24 giờ/);
  assert.match(loi({ satMocGio: "-1" }).satMocGio ?? "", /từ 0 đến 24 giờ/);
  assert.match(loi({ nghiPhut: "30.5" }).nghiPhut ?? "", /số phút nguyên từ 0 đến 480/);
  assert.match(loi({ nghiPhut: "481" }).nghiPhut ?? "", /số phút nguyên từ 0 đến 480/);
  assert.match(loi({ khaiLuiPhut: "0" }).khaiLuiPhut ?? "", /số phút nguyên từ 1 đến 1440/);
  assert.match(loi({ khaiLuiPhut: "1441" }).khaiLuiPhut ?? "", /số phút nguyên từ 1 đến 1440/);
  assert.match(loi({ khaiLuiPhut: "" }).khaiLuiPhut ?? "", /Nhập/);
  // Hai ô cùng sai → cả hai câu (không dừng ở ô đầu).
  const hai = loi({ mocGio: "0", khaiLuiPhut: "2000" });
  assert.ok(hai.mocGio && hai.khaiLuiPhut);
  // Biên hợp lệ.
  assert.ok(docFormChinhSach(form({ khaiLuiPhut: "1" })).ok);
  assert.ok(docFormChinhSach(form({ khaiLuiPhut: "1440" })).ok);
  assert.ok(docFormChinhSach(form({ satMocGio: "0", nghiPhut: "0" })).ok);
  assert.ok(docFormChinhSach(form({ mocGio: "48" })).ok);
  // ADR-0055 VK2-B: hai ô giờ lái (đơn vị giờ — K2).
  assert.match(loi({ gioLaiGio: "0,5" }).gioLaiGio ?? "", /Giờ lái tối đa một ngày là số giờ từ 1 đến 24/);
  assert.match(loi({ gioLaiGio: "25" }).gioLaiGio ?? "", /từ 1 đến 24/);
  assert.match(loi({ gioLaiGio: "" }).gioLaiGio ?? "", /Nhập/);
  assert.match(loi({ chuyenDaiGio: "13" }).chuyenDaiGio ?? "", /từ 0,5 đến 12/);
  assert.match(loi({ chuyenDaiGio: "0,25" }).chuyenDaiGio ?? "", /từ 0,5 đến 12/);
  assert.ok(docFormChinhSach(form({ gioLaiGio: "1", chuyenDaiGio: "0,5" })).ok);
  assert.ok(docFormChinhSach(form({ gioLaiGio: "24", chuyenDaiGio: "12" })).ok);
});

test("formTuChinhSach: điền sẵn từ bản đang dùng; chưa có bản → ô trống, bật đủ danh sách", () => {
  assert.deepEqual(formTuChinhSach(chinhSach()), form());
  assert.deepEqual(formTuChinhSach(null), { mocGio: "", satMocGio: "", nghiPhut: "", khaiLuiPhut: "", gioLaiGio: "", chuyenDaiGio: "", duDanhSach: true });
});

test("tomTatChinhSach + thayDoiChinhSach: tóm tắt một bản; liệt kê đúng ô đã đổi so với bản đang dùng", () => {
  assert.equal(tomTatChinhSach(chinhSach()), "Mốc 6 giờ · sát mốc 2 giờ · nghỉ 30 phút · khai lùi 180 phút · lái tối đa 8 giờ/ngày · nhắc nghỉ chuyến trên 4 giờ · phải đủ danh sách khách");
  assert.equal(tomTatChinhSach(chinhSach({ requireManifest: false, warnLeadMinutes: 90, dutyDayMaxMinutes: 540 })), "Mốc 6 giờ · sát mốc 1 giờ 30 phút · nghỉ 30 phút · khai lùi 180 phút · lái tối đa 9 giờ/ngày · nhắc nghỉ chuyến trên 4 giờ");
  const cu = chinhSach();
  const giu = docFormChinhSach(form());
  assert.ok(giu.ok);
  assert.deepEqual(thayDoiChinhSach(cu, giu.value), []);
  const doi = docFormChinhSach(form({ khaiLuiPhut: "240", mocGio: "5", duDanhSach: false }));
  assert.ok(doi.ok);
  assert.deepEqual(thayDoiChinhSach(cu, doi.value), ["Mốc tối thiểu 6 giờ → 5 giờ", "Khai lùi tối đa 180 → 240 phút", "Không bắt đủ danh sách khách"]);
  assert.deepEqual(thayDoiChinhSach(null, doi.value), ["Bản đầu tiên"]);
  const gl = docFormChinhSach(form({ gioLaiGio: "9", chuyenDaiGio: "5" }));
  assert.ok(gl.ok);
  assert.deepEqual(thayDoiChinhSach(cu, gl.value), ["Giờ lái tối đa một ngày 8 giờ → 9 giờ", "Nhắc nghỉ chuyến trên 4 giờ → 5 giờ"]);
});

test("dongLichSuChinhSach: đánh số từ bản cũ nhất; bản đang dùng / hết hiệu lực; khoảng hiệu lực theo ngày VN; không có người lưu (DTO không có)", () => {
  const history = [
    chinhSach({ id: "c", validFrom: "2026-09-29T09:20:00.000Z", current: true, proxyBackdateMaxMinutes: 240 }),
    chinhSach({ id: "b", validFrom: "2026-09-24T17:30:00.000Z", current: false }), // 00:30 ngày 25/09 giờ VN
    chinhSach({ id: "a", validFrom: "2026-09-01T00:00:00.000Z", current: false, minLeadMinutes: 240 }),
  ];
  const dong = dongLichSuChinhSach(history);
  assert.deepEqual(dong.map((d) => [d.id, d.ten, d.trangThai, d.tone, d.hieuLuc]), [
    ["c", "Bản 3", "Đang dùng", "unit", "Hiệu lực từ 29/09/2026"],
    ["b", "Bản 2", "Hết hiệu lực", "muted", "Hiệu lực 25/09 – 29/09/2026"],
    ["a", "Bản 1", "Hết hiệu lực", "muted", "Hiệu lực 01/09 – 25/09/2026"],
  ]);
  assert.equal(dong[2]!.tomTat, "Mốc 4 giờ · sát mốc 2 giờ · nghỉ 30 phút · khai lùi 180 phút · lái tối đa 8 giờ/ngày · nhắc nghỉ chuyến trên 4 giờ · phải đủ danh sách khách");
  // R-P23 (điều phối trả lời Q-B-1): "ai lưu" — "<tên> lưu dd/mm HH:MM" (giờ VN của lúc lưu = lúc hiệu lực); null (bản gieo) → không có dòng.
  assert.deepEqual(dong.map((d) => d.nguoiLuu), [null, null, null]);
  const coTen = dongLichSuChinhSach([chinhSach({ validFrom: "2026-09-24T09:20:00.000Z", nguoiLuu: "Lưu Tuấn Vũ" }), chinhSach({ id: "g", validFrom: "2026-09-01T00:00:00.000Z", current: false })]);
  assert.equal(coTen[0]!.nguoiLuu, "Lưu Tuấn Vũ lưu 24/09 16:20");
  assert.equal(coTen[1]!.nguoiLuu, null);
  // Tên lỡ lẫn dãy số (DTO sai) → che (lưới an toàn R-P11).
  assert.equal(dongLichSuChinhSach([chinhSach({ validFrom: "2026-09-24T09:20:00.000Z", nguoiLuu: "Hoa 0913552108" })])[0]!.nguoiLuu, "Hoa •••••••••• lưu 24/09 16:20");
  assert.deepEqual(dongLichSuChinhSach([]), []);
  // Khác năm: ghi đủ năm ở cả hai đầu.
  const namKhac = dongLichSuChinhSach([chinhSach({ id: "y", validFrom: "2027-01-02T01:00:00.000Z" }), chinhSach({ id: "x", validFrom: "2026-12-20T01:00:00.000Z", current: false })]);
  assert.equal(namKhac[1]!.hieuLuc, "Hiệu lực 20/12/2026 – 02/01/2027");
});

test("nhanDieuKien: tên loại + cỡ xe bằng lời, không lộ mã; giấy tờ tài xế tra tên qua hàm; không có tên → chữ chung", () => {
  const r = (o: Partial<DepartureRuleDto>): DepartureRuleDto => ({
    id: "r", minCapacity: 1, subject: "VEHICLE", documentTypeCode: "INSPECTION", documentTypeName: "Kiểm định", validFrom: "2026-09-01T00:00:00.000Z", validTo: null, active: true, ...o,
  });
  assert.equal(nhanDieuKien(r({})), "Kiểm định — mọi xe");
  assert.equal(nhanDieuKien(r({ documentTypeName: "Bảo hiểm trách nhiệm dân sự" })), "Bảo hiểm trách nhiệm dân sự — mọi xe");
  assert.equal(nhanDieuKien(r({ minCapacity: 9, documentTypeName: "Phù hiệu" })), "Phù hiệu — xe chở từ 9 người");
  assert.equal(nhanDieuKien(r({ subject: "DRIVER", documentTypeCode: "THE_HDV", documentTypeName: null, minCapacity: 30 }), (c) => (c === "THE_HDV" ? "Thẻ hướng dẫn viên" : undefined)),
    "Thẻ hướng dẫn viên của tài xế — xe chở từ 30 người");
  const khong = nhanDieuKien(r({ subject: "DRIVER", documentTypeCode: "MA_LA", documentTypeName: null }));
  assert.equal(khong, "Giấy tờ khác của tài xế — mọi xe");
  assert.doesNotMatch(khong, /MA_LA/);
});

test("nhomLyDoHien: năm nhóm lượt 1 theo thứ tự bản vẽ (kể cả nhóm rỗng), nhãn từ NHAN_NHOM_LY_DO, lý do trong nhóm giữ thứ tự máy chủ; nhóm ngoài danh sách có dữ liệu thì thêm cuối", () => {
  assert.deepEqual(NHOM_LY_DO_HIEN, ["PHA_LE", "HUY_CHUYEN", "KET_THUC_GIAN_DOAN", "BO_QUA_DIEM", "DOI_GIO_XE"]);
  const ly = (code: string, group: TripReasonDto["group"], sortOrder: number, active = true): TripReasonDto => ({ code, group, groupLabel: "x", label: code, active, sortOrder, updatedAt: "t" });
  const nhom = nhomLyDoHien([ly("HUY_B", "HUY_CHUYEN", 2), ly("HUY_A", "HUY_CHUYEN", 1), ly("PHA_LE_KHAC", "PHA_LE", 99, false), ly("BAO_A", "BAO_HUY_DIEM", 1)]);
  assert.deepEqual(nhom.map((n) => [n.nhom, n.tieuDe, n.lyDo.map((l) => l.code)]), [
    ["PHA_LE", "Phá lệ", ["PHA_LE_KHAC"]],
    ["HUY_CHUYEN", "Huỷ chuyến", ["HUY_B", "HUY_A"]],
    ["KET_THUC_GIAN_DOAN", "Kết thúc gián đoạn", []],
    ["BO_QUA_DIEM", "Bỏ qua điểm", []],
    ["DOI_GIO_XE", "Đổi giờ xe tới", []],
    ["BAO_HUY_DIEM", "Báo huỷ điểm đón", ["BAO_A"]],
  ]);
});

test("maLyDoMoi: mã sinh từ nhãn (không dấu, đ → D), tiền tố theo nhóm như mã gieo, luôn khớp luật máy chủ, ≤ 40 ký tự, lần thử sau thêm hậu tố", () => {
  assert.equal(maLyDoMoi("PHA_LE", "Xe hỏng — đổi xe"), "PHA_LE_XE_HONG_DOI_XE");
  assert.equal(maLyDoMoi("HUY_CHUYEN", "Khách huỷ cả đoàn"), "HUY_KHACH_HUY_CA_DOAN");
  assert.equal(maLyDoMoi("KET_THUC_GIAN_DOAN", "Đường ngập"), "GIAN_DOAN_DUONG_NGAP");
  assert.equal(maLyDoMoi("BO_QUA_DIEM", "Khách tự đi"), "BO_QUA_KHACH_TU_DI");
  assert.equal(maLyDoMoi("DOI_GIO_XE", "Kẹt xe"), "DOI_GIO_XE_KET_XE");
  assert.equal(maLyDoMoi("HUY_CHUYEN", "Khách huỷ cả đoàn", 2), "HUY_KHACH_HUY_CA_DOAN_2");
  assert.equal(maLyDoMoi("PHA_LE", "!!!"), "PHA_LE_LY_DO");
  const dai = maLyDoMoi("KET_THUC_GIAN_DOAN", "Một lý do rất rất dài vượt quá bốn mươi ký tự cho phép của mã", 12);
  assert.ok(dai.length <= 40, dai);
  assert.ok(dai.endsWith("_12"), dai);
  for (const m of [dai, maLyDoMoi("BAO_HUY_DIEM", "Khác"), maLyDoMoi("TU_CHOI_NHAN", "Ừ ờ Ư ơ"), maLyDoMoi("PHA_LE", "a".repeat(80), 3)]) {
    assert.match(m, MA_LY_DO_RE, m);
    assert.ok(!m.includes("__") && !m.endsWith("_"), m);
  }
});

test("thuTuLyDoMoi: thêm vào sau lý do thường, trước 'Khác' (99); nhóm rỗng → 1", () => {
  const ly = (sortOrder: number) => ({ sortOrder });
  assert.equal(thuTuLyDoMoi([ly(1), ly(2), ly(99)]), 3);
  assert.equal(thuTuLyDoMoi([ly(99)]), 1);
  assert.equal(thuTuLyDoMoi([]), 1);
  assert.equal(thuTuLyDoMoi([ly(98)]), 98);
});

test("docDieuKienMoi: cỡ xe 1–100 người, chọn đối tượng + loại giấy tờ; thân khớp luật máy chủ; không ngày hiệu lực", () => {
  const r = docDieuKienMoi({ coXe: "9", doiTuong: "VEHICLE", loai: "PHU_HIEU" });
  assert.ok(r.ok);
  assert.deepEqual(r.value, { minCapacity: 9, subject: "VEHICLE", documentTypeCode: "PHU_HIEU" });
  assert.ok(kiemDieuKienMoi({ ...r.value }).ok);
  for (const coXe of ["0", "101", "", "2.5", "x"]) {
    const x = docDieuKienMoi({ coXe, doiTuong: "DRIVER", loai: "THE_HDV" });
    assert.equal(x.ok, false);
    assert.equal(x.ok ? "" : x.loi, "Cỡ xe là số người nguyên từ 1 đến 100 (1 = mọi xe).");
  }
  const khongLoai = docDieuKienMoi({ coXe: "1", doiTuong: "VEHICLE", loai: "" });
  assert.equal(khongLoai.ok ? "" : khongLoai.loi, "Chọn loại giấy tờ bắt buộc.");
});

test("nhanSoKhachHang + docSoKhachHang: lời thường của bảng hạng bằng; ô trống = không giới hạn; thân khớp luật máy chủ", () => {
  assert.equal(nhanSoKhachHang(8), "Tối đa 8 khách");
  assert.equal(nhanSoKhachHang(null), "Không giới hạn");
  assert.equal(nhanSoKhachHang(undefined), "Chưa đặt — tài xế hạng này chưa được xếp chuyến");
  const r = docSoKhachHang("D1", " 16 ");
  assert.ok(r.ok);
  assert.deepEqual(r.value, { classCode: "D1", maxPassengers: 16 });
  assert.ok(kiemHangBangMoi({ ...r.value }).ok);
  const trong = docSoKhachHang("D", "");
  assert.ok(trong.ok);
  assert.deepEqual(trong.value, { classCode: "D", maxPassengers: null });
  assert.ok(kiemHangBangMoi({ ...trong.value }).ok);
  for (const v of ["0", "101", "abc", "1.5"]) {
    const x = docSoKhachHang("B", v);
    assert.equal(x.ok ? "" : x.loi, "Số khách tối đa là số nguyên từ 1 đến 100, hoặc để trống = không giới hạn.");
  }
});

test("nutBatTatLyDo (R-P22): lý do hệ thống đang dùng → KHÔNG có nút Ngưng (chỉ ghi chú); đang ngưng thì luôn có 'Dùng lại'; lý do thường như cũ", () => {
  assert.deepEqual(nutBatTatLyDo({ active: true, heThong: false }), { nut: "Ngưng", ghiChu: null });
  assert.deepEqual(nutBatTatLyDo({ active: false, heThong: false }), { nut: "Dùng lại", ghiChu: null });
  assert.deepEqual(nutBatTatLyDo({ active: true, heThong: true }), { nut: null, ghiChu: "Hệ thống tự dùng — không ngưng được" });
  assert.deepEqual(nutBatTatLyDo({ active: false, heThong: true }), { nut: "Dùng lại", ghiChu: null });
});
