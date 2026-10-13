// ADR-0114 D1 + D2 — phần HIỂN THỊ ở trang đơn (web/order.ts): ghép các câu nhắc về số khách / giảm giá và dựng dòng "Số khách qua các lần sửa".
// Luật nghiệp vụ nằm ở máy chủ (`canhBaoKhuyenMai`, `dungLichSuSoKhach`); ở đây chỉ kiểm cách ghép chữ và thứ tự, thuần, không DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauNhacSoKhach, daiSauSuaSoKhach, dongLichSuHienThi } from "./so-khach-hien-thi.ts";
import { CAU_GIAM_GIA_VUOT, CAU_KHUYEN_MAI_KHI_BOT_KHACH } from "./so-khach-van-phong.ts";
import type { DongLichSuSoKhachDto } from "./contracts.ts";

const tien = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;
const pax = (adult: number, child = 0): { adult: number; child: number; senior: number; infant: number } => ({ adult, child, senior: 0, infant: 0 });

// ---- D1: câu nhắc ----------------------------------------------------------------------------------------------------

test("cauNhacSoKhach: không câu nào ⇒ rỗng; chỉ câu giảm giá vượt ⇒ một dòng VÀNG như cũ (khoá tong-am)", () => {
  assert.deepEqual(cauNhacSoKhach({ tongAm: null, khuyenMai: null }), []);
  assert.deepEqual(cauNhacSoKhach({ tongAm: CAU_GIAM_GIA_VUOT, khuyenMai: null }), [{ khoa: "tong-am", muc: "vang", cau: CAU_GIAM_GIA_VUOT }]);
});

test("cauNhacSoKhach: câu khuyến mại là MỨC ĐỎ, khoá khuyen-mai, nguyên chữ máy chủ gửi; hai câu cùng hiện thì đỏ trước, vàng sau", () => {
  assert.deepEqual(cauNhacSoKhach({ tongAm: null, khuyenMai: CAU_KHUYEN_MAI_KHI_BOT_KHACH }), [{ khoa: "khuyen-mai", muc: "do", cau: CAU_KHUYEN_MAI_KHI_BOT_KHACH }]);
  assert.deepEqual(
    cauNhacSoKhach({ tongAm: CAU_GIAM_GIA_VUOT, khuyenMai: CAU_KHUYEN_MAI_KHI_BOT_KHACH }).map((c) => [c.khoa, c.muc]),
    [["khuyen-mai", "do"], ["tong-am", "vang"]],
  );
});

test("cauNhacSoKhach: chữ đi qua NGUYÊN VĂN (không chép tay, không cắt) — chuỗi lạ của máy chủ vẫn ra đúng chuỗi đó", () => {
  assert.equal(cauNhacSoKhach({ tongAm: null, khuyenMai: "câu do máy chủ gửi" })[0]?.cau, "câu do máy chủ gửi");
  assert.deepEqual(cauNhacSoKhach({ tongAm: null, khuyenMai: "" }), [], "chuỗi rỗng coi như không có");
});

// ---- D1: dải báo sau lệnh sửa số khách -----------------------------------------------------------------------------------

test("daiSauSuaSoKhach: không câu nhắc ⇒ chữ và mức y như trước ADR-0114 (dải xanh; ghi hay không ghi)", () => {
  const ghi = daiSauSuaSoKhach({ daGhi: true, canhBaoTongAm: null, canhBaoKhuyenMai: null });
  assert.deepEqual(ghi, { xong: "Đã lưu số khách mới, Nền tảng đã tính lại tiền.", xanh: "Đã lưu số khách mới, Nền tảng đã tính lại tiền.", them: [], tone: "warning" });
  const khongGhi = daiSauSuaSoKhach({ daGhi: false, canhBaoTongAm: null, canhBaoKhuyenMai: null });
  assert.equal(khongGhi.xanh, "Số khách không đổi nên không ghi gì.");
  assert.equal(khongGhi.xong, khongGhi.xanh);
});

test("daiSauSuaSoKhach: chỉ giảm giá vượt ⇒ dải VÀNG, tiêu đề và câu y như trước (kịch bản Chrome cũ khớp chữ này)", () => {
  const d = daiSauSuaSoKhach({ daGhi: true, canhBaoTongAm: CAU_GIAM_GIA_VUOT, canhBaoKhuyenMai: null });
  assert.equal(d.tone, "warning");
  assert.equal(d.xong, "Đã lưu số khách mới — giảm giá đang lớn hơn tiền dịch vụ.");
  assert.deepEqual(d.them, [CAU_GIAM_GIA_VUOT]);
  assert.equal(d.xanh, "Đã lưu số khách mới, Nền tảng đã tính lại tiền.");
});

test("daiSauSuaSoKhach: có câu khuyến mại ⇒ dải ĐỎ, câu đỏ đứng đầu; nếu cả giảm giá vượt thì câu vàng đi sau trong cùng dải", () => {
  const rieng = daiSauSuaSoKhach({ daGhi: true, canhBaoTongAm: null, canhBaoKhuyenMai: CAU_KHUYEN_MAI_KHI_BOT_KHACH });
  assert.equal(rieng.tone, "danger");
  assert.deepEqual(rieng.them, [CAU_KHUYEN_MAI_KHI_BOT_KHACH]);
  assert.match(rieng.xong, /^Đã lưu số khách mới/);
  const ca = daiSauSuaSoKhach({ daGhi: true, canhBaoTongAm: CAU_GIAM_GIA_VUOT, canhBaoKhuyenMai: CAU_KHUYEN_MAI_KHI_BOT_KHACH });
  assert.equal(ca.tone, "danger");
  assert.deepEqual(ca.them, [CAU_KHUYEN_MAI_KHI_BOT_KHACH, CAU_GIAM_GIA_VUOT]);
});

test("daiSauSuaSoKhach: số khách y nguyên (daGhi false) mà đơn vẫn đang thiếu khách so với lúc xác nhận ⇒ dải đỏ, tiêu đề KHÔNG nói \"Đã lưu\" (không ghi gì)", () => {
  const d = daiSauSuaSoKhach({ daGhi: false, canhBaoTongAm: null, canhBaoKhuyenMai: CAU_KHUYEN_MAI_KHI_BOT_KHACH });
  assert.equal(d.tone, "danger");
  assert.equal(d.xong, "Số khách không đổi nên không ghi gì.");
  assert.doesNotMatch(d.xong, /Đã lưu/);
  assert.deepEqual(d.them, [CAU_KHUYEN_MAI_KHI_BOT_KHACH]);
});

// ---- D2: dòng lịch sử số khách ------------------------------------------------------------------------------------------

const DV = "Tour 4 đảo";
const dong = (buoc: DongLichSuSoKhachDto["buoc"], lanSua: number | null, p: ReturnType<typeof pax>, tamTinh: number): DongLichSuSoKhachDto => ({ buoc, lanSua, soKhach: [{ tenDichVu: DV, pax: p }], tamTinh });

test("dongLichSuHienThi: ca mẫu SV-SK-07 — 4 người lớn (2.000.000) → 3 (1.500.000) → 5 (2.500.000) ra ĐÚNG ba dòng, nhãn và số khách bằng chữ thường", () => {
  const r = dongLichSuHienThi([dong("khoi_tao", null, pax(4), 2_000_000), dong("dieu_chinh", 1, pax(3), 1_500_000), dong("hien_hanh", 2, pax(5), 2_500_000)], tien);
  assert.ok(r);
  assert.equal(r.length, 3);
  assert.deepEqual(r.map((x) => x.nhan), ["Lúc xác nhận", "Lần sửa 1", "Hiện tại · sau lần sửa 2"]);
  assert.deepEqual(r.map((x) => x.dichVu), [[{ ten: DV, khach: "4 người lớn" }], [{ ten: DV, khach: "3 người lớn" }], [{ ten: DV, khach: "5 người lớn" }]]);
  assert.deepEqual(r.map((x) => x.tamTinh), [tien(2_000_000), tien(1_500_000), tien(2_500_000)]);
  assert.deepEqual(r.map((x) => x.buoc), ["khoi_tao", "dieu_chinh", "hien_hanh"]);
});

test("dongLichSuHienThi: nhãn \"Lần sửa n\" đếm theo THỨ TỰ dòng, không theo số thứ tự thô của bảng điều chỉnh (thủng số không làm nhãn nhảy)", () => {
  const r = dongLichSuHienThi([dong("khoi_tao", null, pax(4), 1), dong("dieu_chinh", 3, pax(3), 1), dong("dieu_chinh", 7, pax(2), 1), dong("hien_hanh", 9, pax(5), 1)], tien);
  assert.deepEqual(r?.map((x) => x.nhan), ["Lúc xác nhận", "Lần sửa 1", "Lần sửa 2", "Hiện tại · sau lần sửa 3"]);
});

test("dongLichSuHienThi: ĐƠN CHƯA SỬA LẦN NÀO (hai dòng đều lanSua null) ⇒ null, giao diện ẩn cả khối", () => {
  assert.equal(dongLichSuHienThi([dong("khoi_tao", null, pax(4), 2_000_000), dong("hien_hanh", null, pax(4), 2_000_000)], tien), null);
});

test("dongLichSuHienThi: không có dữ liệu (null — người xem không có quyền xem lịch sử) hoặc mảng rỗng ⇒ null", () => {
  assert.equal(dongLichSuHienThi(null, tien), null);
  assert.equal(dongLichSuHienThi([], tien), null);
});

test("dongLichSuHienThi: một lần sửa duy nhất ⇒ hai dòng (khởi tạo + hiện tại), khối HIỆN vì dòng hiện tại có lanSua", () => {
  const r = dongLichSuHienThi([dong("khoi_tao", null, pax(4), 2_000_000), dong("hien_hanh", 1, pax(3), 1_500_000)], tien);
  assert.deepEqual(r?.map((x) => x.nhan), ["Lúc xác nhận", "Hiện tại · sau lần sửa 1"]);
});

test("dongLichSuHienThi: nhiều dịch vụ ⇒ mỗi dịch vụ một mục, loại khách 0 bị bỏ, không khách nào ⇒ \"không có khách\"; dịch vụ nhập tay mang tên do máy chủ gửi", () => {
  const nhieu: DongLichSuSoKhachDto[] = [
    { buoc: "khoi_tao", lanSua: null, tamTinh: 3_000_000, soKhach: [{ tenDichVu: DV, pax: { adult: 2, child: 1, senior: 0, infant: 1 } }, { tenDichVu: "dịch vụ nhập tay", pax: pax(2) }] },
    { buoc: "hien_hanh", lanSua: 1, tamTinh: 1_000_000, soKhach: [{ tenDichVu: DV, pax: { adult: 0, child: 0, senior: 0, infant: 0 } }, { tenDichVu: "dịch vụ nhập tay", pax: pax(2) }] },
  ];
  const r = dongLichSuHienThi(nhieu, tien);
  assert.deepEqual(r?.[0]?.dichVu, [{ ten: DV, khach: "2 người lớn, 1 trẻ em, 1 em bé" }, { ten: "dịch vụ nhập tay", khach: "2 người lớn" }]);
  assert.deepEqual(r?.[1]?.dichVu, [{ ten: DV, khach: "không có khách" }, { ten: "dịch vụ nhập tay", khach: "2 người lớn" }]);
});

test("dongLichSuHienThi: định dạng tiền do nơi gọi truyền vào (web dùng vnd) — hàm thuần không tự định dạng", () => {
  const r = dongLichSuHienThi([dong("khoi_tao", null, pax(1), 10), dong("hien_hanh", 1, pax(2), 20)], (n) => `<${n}>`);
  assert.deepEqual(r?.map((x) => x.tamTinh), ["<10>", "<20>"]);
});
