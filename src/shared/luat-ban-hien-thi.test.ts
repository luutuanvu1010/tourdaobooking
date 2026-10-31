// Chữ màn «Luật bán» (ADR-0146 Đ5; ADR-0152 Đ2, trang ghép 3b; kế hoạch 2026-10-30 R-1, T11). Hàm thuần — giao diện chỉ vẽ.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { LuatBanDto } from "./contracts.ts";
import {
  CAU_KET_THUC_NGAY, DONG_PHU_DEN_NGAY, NHAN_PHAM_VI, NHAN_THE_LUAT, NUT_KET_THUC_NGAY, dongPhuDaKetThuc, dongPhuDenNgay, hauQuaKetThucNgay, locTheThe, moTaHieuLuc,
  moTaPhamVi, ngayHenNhoNhat, tongTrangThai,
} from "./luat-ban-hien-thi.ts";

const HOM_NAY = "2026-10-30";
const luat = (o: Partial<LuatBanDto> = {}): LuatBanDto => ({
  id: "l1", loai: "LD_ABCDEFGH", tenLoai: "Hướng dẫn viên tự do", phamVi: "SERVICE", catalogCode: "ZA1", tenDichVu: "Tour 4 đảo", groupCode: null, tenNhom: null,
  attributeCode: null, valueCode: null, tenDacDiem: null, tenGiaTri: null, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, trangThai: "DANG_AP_DUNG", khongPhu: false, ...o,
});

test("ba thẻ đúng chữ ADR-0146 «kết thúc»; ba kiểu phạm vi đúng chữ kế hoạch T11", () => {
  assert.deepEqual(NHAN_THE_LUAT, { DANG_AP_DUNG: "Đang áp dụng", SAP_AP_DUNG: "Sắp áp dụng", DA_KET_THUC: "Đã kết thúc" });
  assert.deepEqual(NHAN_PHAM_VI, { SERVICE: "Một dịch vụ", GROUP: "Cả nhóm", ATTRIBUTE: "Theo đặc điểm" });
  assert.deepEqual([tongTrangThai("DANG_AP_DUNG"), tongTrangThai("SAP_AP_DUNG"), tongTrangThai("DA_KET_THUC")], ["la", "bien", "xam"]);
});

test("mô tả phạm vi hiện TÊN, không mã; theo đặc điểm kèm nhóm tuỳ chọn; trỏ giá trị tắt ⇒ «Không phủ dịch vụ nào» (trang ghép 3b)", () => {
  assert.equal(moTaPhamVi(luat()), "Dịch vụ: Tour 4 đảo");
  assert.equal(moTaPhamVi(luat({ phamVi: "GROUP", catalogCode: null, tenDichVu: null, groupCode: "g1", tenNhom: "Tour đảo" })), "Nhóm: Tour đảo");
  const dd = luat({ phamVi: "ATTRIBUTE", catalogCode: null, tenDichVu: null, attributeCode: "a1", valueCode: "v1", tenDacDiem: "Vận chuyển cảng–đảo", tenGiaTri: "Không gồm" });
  assert.equal(moTaPhamVi(dd), "Vận chuyển cảng–đảo: Không gồm");
  assert.equal(moTaPhamVi({ ...dd, groupCode: "g1", tenNhom: "Tour đảo" }), "Vận chuyển cảng–đảo: Không gồm · trong nhóm Tour đảo");
  assert.equal(moTaPhamVi({ ...dd, khongPhu: true }), "Vận chuyển cảng–đảo: Không gồm · Không phủ dịch vụ nào (giá trị hoặc đặc điểm đang tắt)");
  // Thiếu tên (dịch vụ rời danh mục): không lộ mã thô.
  const thieu = moTaPhamVi(luat({ tenDichVu: null }));
  assert.ok(!thieu.includes("ZA1"), thieu);
  assert.ok(!/SERVICE|GROUP|ATTRIBUTE|LD_/.test(moTaPhamVi({ ...dd, tenDacDiem: null, tenGiaTri: null })));
});

test("R-1: hiệu lực ghi ngày tính trọn; khoảng rỗng nói «không chặn ngày nào»", () => {
  assert.equal(moTaHieuLuc(luat()), "Từ 01/10/2026 · chưa hẹn ngày kết thúc");
  assert.equal(moTaHieuLuc(luat({ denNgay: "2026-11-05" })), "Từ 01/10/2026 đến hết 05/11/2026");
  assert.equal(moTaHieuLuc(luat({ tuNgay: "2026-11-02", denNgay: "2026-11-01" })), "Từ 02/11/2026 · đã kết thúc, không còn chặn");
  // Bắt đầu hôm nay rồi «Kết thúc ngay» hôm nay ⇒ ngày kết thúc = hôm qua < ngày bắt đầu: KHÔNG được nói «không chặn ngày nào» (sáng nay đã chặn).
  const homNayKetThuc = moTaHieuLuc(luat({ tuNgay: HOM_NAY, denNgay: "2026-10-29" }));
  assert.ok(!/không chặn ngày nào/.test(homNayKetThuc), homNayKetThuc);
});

test("R-1 (K-7): «Kết thúc ngay» = luật thôi chặn từ bây giờ; ô «Đến ngày» nói luật vẫn chặn tới hết ngày đó (hẹn hôm nay ⇒ vẫn chặn hết hôm nay)", () => {
  assert.equal(NUT_KET_THUC_NGAY, "Kết thúc ngay");
  assert.equal(CAU_KET_THUC_NGAY, "Luật thôi chặn từ bây giờ.");
  assert.equal(DONG_PHU_DEN_NGAY, "Luật vẫn chặn tới hết ngày này.");
  assert.equal(dongPhuDenNgay("", HOM_NAY), DONG_PHU_DEN_NGAY);
  assert.equal(dongPhuDenNgay("2026-11-05", HOM_NAY), "Luật vẫn chặn tới hết ngày này (05/11/2026), thôi chặn từ 06/11/2026.");
  const hn = dongPhuDenNgay(HOM_NAY, HOM_NAY);
  assert.match(hn, /vẫn chặn tới hết hôm nay/);
  assert.match(hn, /Kết thúc ngay/);
  // Hộp xác nhận: luật đang áp dụng ⇒ nói ngày ghi là hôm qua; luật sắp áp dụng ⇒ không chặn ngày nào.
  const dang = hauQuaKetThucNgay(luat(), HOM_NAY);
  assert.match(dang, /^Luật thôi chặn từ bây giờ\./);
  assert.match(dang, /Hướng dẫn viên tự do đặt lại được Dịch vụ: Tour 4 đảo/);
  assert.match(dang, /ghi ngày kết thúc 29\/10\/2026 \(hôm qua\)/);
  // Bắt đầu hôm nay: đang chặn ⇒ cùng câu «thôi chặn từ bây giờ», ngày ghi hôm qua.
  assert.match(hauQuaKetThucNgay(luat({ tuNgay: HOM_NAY }), HOM_NAY), /^Luật thôi chặn từ bây giờ\. Hướng dẫn viên tự do đặt lại được/);
  const sap = hauQuaKetThucNgay(luat({ tuNgay: "2026-11-10", trangThai: "SAP_AP_DUNG" }), HOM_NAY);
  assert.match(sap, /chưa bắt đầu nên sẽ không chặn ngày nào/);
});

test("R-1: luật vừa «Kết thúc ngay» (ngày kết thúc = hôm qua) có dòng phụ chỉ chỗ tra đơn sáng nay; luật khác không", () => {
  const vua = dongPhuDaKetThuc(luat({ denNgay: "2026-10-29", trangThai: "DA_KET_THUC" }), HOM_NAY);
  assert.ok(vua && /sáng nay|trong hôm nay/.test(vua) && /Nhật ký/.test(vua), String(vua));
  // Luật bắt đầu hôm nay rồi «Kết thúc ngay» hôm nay (khoảng rỗng) VẪN có dòng phụ — đúng ca K-7.
  assert.ok(dongPhuDaKetThuc(luat({ tuNgay: HOM_NAY, denNgay: "2026-10-29", trangThai: "DA_KET_THUC" }), HOM_NAY));
  // Luật sắp áp dụng «Kết thúc ngay» (chưa chặn lần nào) ⇒ không.
  assert.equal(dongPhuDaKetThuc(luat({ tuNgay: "2026-11-02", denNgay: "2026-11-01", trangThai: "DA_KET_THUC" }), HOM_NAY), null);
  assert.equal(dongPhuDaKetThuc(luat({ denNgay: "2026-10-20", trangThai: "DA_KET_THUC" }), HOM_NAY), null);
  assert.equal(dongPhuDaKetThuc(luat(), HOM_NAY), null);
});

test("lọc theo thẻ, sắp theo tên loại rồi ngày bắt đầu (R-10: thấy luật trùng cạnh nhau)", () => {
  const a = luat({ id: "a", tenLoai: "Tài xế taxi", tuNgay: "2026-10-05" });
  const b = luat({ id: "b", tenLoai: "Hướng dẫn viên tự do", tuNgay: "2026-10-09" });
  const c = luat({ id: "c", tenLoai: "Hướng dẫn viên tự do", tuNgay: "2026-10-02" });
  const d = luat({ id: "d", trangThai: "DA_KET_THUC", denNgay: "2026-10-10" });
  assert.deepEqual(locTheThe([a, b, c, d], "DANG_AP_DUNG").map((x) => x.id), ["c", "b", "a"]);
  assert.deepEqual(locTheThe([a, b, c, d], "DA_KET_THUC").map((x) => x.id), ["d"]);
});

test("hẹn kết thúc: ngày nhỏ nhất chọn được = hôm nay (luật đã bắt đầu) hoặc ngày bắt đầu (luật sắp áp dụng)", () => {
  assert.equal(ngayHenNhoNhat(luat(), HOM_NAY), HOM_NAY);
  assert.equal(ngayHenNhoNhat(luat({ tuNgay: "2026-11-10" }), HOM_NAY), "2026-11-10");
});
