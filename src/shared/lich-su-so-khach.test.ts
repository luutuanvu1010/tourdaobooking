// ADR-0114 D2 — `dungLichSuSoKhach`: dựng khối "Lịch sử số khách" đủ dòng từ lúc xác nhận tới hiện hành. Luật thuần: nguồn là số khách ĐÃ LƯU lúc xác nhận + các
// lần sửa theo `seq` (số khách sau mỗi lần + tạm tính sau mỗi lần do máy chủ tính bằng một nguồn `effectiveSubtotal`); KHÔNG đọc chữ nhật ký.
// HÌNH DÁNG ĐÃ CHỌN (ba dòng cho SV-SK-07, đúng ADR): `khoi_tao` (lúc xác nhận) → `dieu_chinh` (mọi lần sửa TRỪ lần cuối, `lanSua` = seq) → `hien_hanh`
// (trạng thái hiện hành = kết quả lần sửa CUỐI; mang `lanSua` của lần đó, hoặc null khi đơn chưa sửa lần nào và trùng số với `khoi_tao`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dungLichSuSoKhach } from "./lich-su-so-khach.ts";
import type { PaxCounts } from "./order-lines.ts";

const khach = (adult: number, child = 0, senior = 0, infant = 0): PaxCounts => ({ adult, child, senior, infant });
const TOUR = { id: "dv-tour", catalogCode: "TD101", name: "Tour đảo", pax: khach(4) };
const XE = { id: "dv-xe", catalogCode: null, name: "Xe riêng của anh Nam", pax: khach(2) };

test("SV-SK-07: gốc 4 người lớn (2.000.000), lần 1 còn 3 (1.500.000), lần 2 thêm 5 (2.500.000) ⇒ BA dòng: khởi tạo, điều chỉnh lần 1, hiện hành (lần 2)", () => {
  const ls = dungLichSuSoKhach({
    dichVu: [TOUR], tamTinhKhoiTao: 2_000_000,
    lanSua: [
      { seq: 1, sau: [{ serviceId: "dv-tour", pax: khach(3) }], tamTinhSau: 1_500_000 },
      { seq: 2, sau: [{ serviceId: "dv-tour", pax: khach(5) }], tamTinhSau: 2_500_000 },
    ],
  });
  assert.deepEqual(ls, [
    { buoc: "khoi_tao", lanSua: null, soKhach: [{ tenDichVu: "Tour đảo", pax: khach(4) }], tamTinh: 2_000_000 },
    { buoc: "dieu_chinh", lanSua: 1, soKhach: [{ tenDichVu: "Tour đảo", pax: khach(3) }], tamTinh: 1_500_000 },
    { buoc: "hien_hanh", lanSua: 2, soKhach: [{ tenDichVu: "Tour đảo", pax: khach(5) }], tamTinh: 2_500_000 },
  ]);
});

test("đơn chưa sửa lần nào: khởi tạo + hiện hành TRÙNG số (lanSua null cả hai)", () => {
  const ls = dungLichSuSoKhach({ dichVu: [TOUR], tamTinhKhoiTao: 2_000_000, lanSua: [] });
  assert.equal(ls.length, 2);
  assert.deepEqual(ls.map((d) => d.buoc), ["khoi_tao", "hien_hanh"]);
  assert.deepEqual(ls[0], { buoc: "khoi_tao", lanSua: null, soKhach: [{ tenDichVu: "Tour đảo", pax: khach(4) }], tamTinh: 2_000_000 });
  assert.deepEqual({ ...ls[1]!, buoc: "khoi_tao" }, ls[0], "hiện hành giống hệt khởi tạo ngoài trường bước");
});

test("một lần sửa: khởi tạo + hiện hành (mang lanSua 1); không có dòng điều chỉnh thừa", () => {
  const ls = dungLichSuSoKhach({ dichVu: [TOUR], tamTinhKhoiTao: 2_000_000, lanSua: [{ seq: 1, sau: [{ serviceId: "dv-tour", pax: khach(2) }], tamTinhSau: 1_000_000 }] });
  assert.deepEqual(ls.map((d) => [d.buoc, d.lanSua, d.tamTinh]), [["khoi_tao", null, 2_000_000], ["hien_hanh", 1, 1_000_000]]);
});

test("ba lần sửa: khởi tạo, điều chỉnh 1, điều chỉnh 2, hiện hành (lần 3); lần sửa đưa vào lộn thứ tự vẫn ra đúng thứ tự seq", () => {
  const ls = dungLichSuSoKhach({
    dichVu: [TOUR], tamTinhKhoiTao: 2_000_000,
    lanSua: [
      { seq: 3, sau: [{ serviceId: "dv-tour", pax: khach(10) }], tamTinhSau: 5_000_000 },
      { seq: 1, sau: [{ serviceId: "dv-tour", pax: khach(2) }], tamTinhSau: 1_000_000 },
      { seq: 2, sau: [{ serviceId: "dv-tour", pax: khach(3) }], tamTinhSau: 1_500_000 },
    ],
  });
  assert.deepEqual(ls.map((d) => [d.buoc, d.lanSua, d.soKhach[0]!.pax.adult]), [["khoi_tao", null, 4], ["dieu_chinh", 1, 2], ["dieu_chinh", 2, 3], ["hien_hanh", 3, 10]]);
});

test("dịch vụ nhập tay dùng NHÃN 'dịch vụ nhập tay', không bao giờ chữ gõ tay; dịch vụ không có trong lần sửa giữ số đã lưu ở MỌI dòng", () => {
  const ls = dungLichSuSoKhach({
    dichVu: [TOUR, XE], tamTinhKhoiTao: 2_200_000,
    lanSua: [{ seq: 1, sau: [{ serviceId: "dv-tour", pax: khach(3) }], tamTinhSau: 1_700_000 }],
  });
  for (const d of ls) {
    assert.deepEqual(d.soKhach.map((s) => s.tenDichVu), ["Tour đảo", "dịch vụ nhập tay"]);
    assert.deepEqual(d.soKhach[1]!.pax, khach(2), "nhập tay giữ số đã lưu");
    assert.doesNotMatch(JSON.stringify(d), /anh Nam/);
  }
  assert.equal(ls[1]!.soKhach[0]!.pax.adult, 3);
});

test("dòng điều chỉnh KHÔNG cộng dồn từ lần trước: số của mỗi dòng = phần `sau` của chính lần đó, dịch vụ vắng thì về số đã lưu (cùng cách đơn tính số hiện hành)", () => {
  const ls = dungLichSuSoKhach({
    dichVu: [TOUR, { id: "dv-hai", catalogCode: "TD202", name: "Lặn biển", pax: khach(4) }], tamTinhKhoiTao: 3_000_000,
    lanSua: [
      { seq: 1, sau: [{ serviceId: "dv-tour", pax: khach(3) }, { serviceId: "dv-hai", pax: khach(2) }], tamTinhSau: 2_000_000 },
      { seq: 2, sau: [{ serviceId: "dv-tour", pax: khach(1) }], tamTinhSau: 1_700_000 },
    ],
  });
  assert.deepEqual(ls[2]!.soKhach.map((s) => s.pax.adult), [1, 4], "dv-hai vắng ở lần 2 ⇒ số đã lưu (4), đúng như đơn hiện hành");
});

test("hình dáng DTO: chỉ bốn khoá (buoc, lanSua, soKhach, tamTinh); mỗi số khách chỉ hai khoá (tenDichVu, pax); kết quả là bản sao, không chung tham chiếu với đầu vào", () => {
  const dv = { ...TOUR, pax: khach(4) };
  const ls = dungLichSuSoKhach({ dichVu: [dv], tamTinhKhoiTao: 1, lanSua: [] });
  assert.deepEqual(Object.keys(ls[0]!).sort(), ["buoc", "lanSua", "soKhach", "tamTinh"]);
  assert.deepEqual(Object.keys(ls[0]!.soKhach[0]!).sort(), ["pax", "tenDichVu"]);
  ls[0]!.soKhach[0]!.pax.adult = 99;
  assert.equal(dv.pax.adult, 4, "đầu vào không bị sửa");
  assert.equal(ls[1]!.soKhach[0]!.pax.adult, 4, "hai dòng không dùng chung một đối tượng");
});
