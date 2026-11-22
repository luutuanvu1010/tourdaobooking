// Lệnh đo khung gốc trên trang thật (ADR-0222 Đ7b, `npm run do-khung`): bài này chấm thử các ô đo dựng tay để biết MÁY CHẤM bắt đúng từng loại lỗi,
// và ô sạch thì qua. Phép đo trong trình duyệt (DO_TRONG_TRANG) chỉ kiểm được trên trang thật: xem dòng «Lệnh đo khung gốc» ở docs/SO-HANG-RAO.md.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DIEU_DO, DO_TRONG_TRANG, THANG, chamO, dayBeRong, trangDoThieu } from "../scripts/giao-dien/cham-khung-goc.mjs";

const sach = { khuon: "chi-tiet", noiDung: 834, tranNgang: false, bop: 0, vd: [], lech: 0, tho: 0, vdTho: [], vo: ["24px/24px/12px/bong"], nhip: [16], soKhoi: 6, coDinh: 0, loiNut: [] };

test("ô đo sạch thì đạt; khối bảng không đệm không tính là kiểu vỏ thứ hai", () => {
  assert.deepEqual(chamO(sach, "chi-tiet"), []);
  assert.deepEqual(chamO({ ...sach, vo: ["24px/24px/12px/bong", "bang/12px/bong"] }, "chi-tiet"), []);
});

test("mỗi điều của Đ7(b) vi phạm thì máy chấm báo đúng tên", () => {
  const ca: Array<[Record<string, unknown>, RegExp]> = [
    [{ tranNgang: true }, /tràn ngang/],
    [{ bop: 3, vd: ["Khách Thử"] }, /chữ bị bóp 3 đoạn \(Khách Thử\)/],
    [{ lech: 1 }, /khối lệch mép vùng nội dung: 1/],
    [{ tho: 2, vdTho: ["span.badge"] }, /thò ra ngoài khối: 2 \(span\.badge\)/],
    [{ vo: ["24px/24px/12px/bong", "16px/16px/8px/khong-bong"] }, /nhiều kiểu vỏ khối/],
    [{ nhip: [16, 30] }, /khoảng cách ngoài thang: 30/],
    [{ coDinh: 1 }, /fixed trong vùng nội dung: 1/],
    [{ loiNut: ["nút chính không ở mép trái thanh việc"] }, /nút chính sai chỗ: nút chính không ở mép trái thanh việc/],
  ];
  assert.equal(ca.length, DIEU_DO.length, "mỗi điều đo có một ca thử");
  for (const [sua, mau] of ca) assert.match(chamO({ ...sach, ...sua }, "chi-tiet").join(" | "), mau);
});

test("không bao giờ ghi là đạt khi không đo được, khi máy thử chạy bản cũ, hay khi trang chưa có khối nào", () => {
  assert.deepEqual(chamO({ loi: "hết giờ" }, "chi-tiet"), ["không đo được: hết giờ"]);
  assert.match(chamO({ ...sach, khuon: null }, "chi-tiet").join(" | "), /máy thử đang chạy bản cũ/);
  assert.match(chamO({ ...sach, soKhoi: 0 }, "chi-tiet").join(" | "), /không thấy khối nào của khung/);
});

test("dãy bề rộng: 360 tới 1.920 bước 20 là 79 bề rộng; khoảng sai thì báo", () => {
  const d = dayBeRong();
  assert.equal(d.length, 79);
  assert.deepEqual([d[0], d[1], d.at(-1)], [360, 380, 1920]);
  assert.throws(() => dayBeRong(500, 400, 20));
});

test("trang đã chuyển khuôn mà bảng màn không có là ĐO THIẾU", () => {
  assert.deepEqual(trangDoThieu(["/orders", "/order", "/xe-sua"], [{ khoa: "a", tk: "sales", trang: "/orders" }, { khoa: "b", tk: "sales", trang: "/order?id=1" }]), ["/xe-sua"]);
  assert.deepEqual(trangDoThieu(["/orders"], [{ khoa: "a", tk: "sales", trang: "/orders" }]), []);
});

test("đoạn đo trong trang là một biểu thức hợp lệ, đọc khuôn từ data-khung-goc, bỏ qua vùng tự do, và thang là bảy bậc cộng 0", () => {
  assert.doesNotThrow(() => new Function(`return ${DO_TRONG_TRANG};`));
  assert.match(DO_TRONG_TRANG, /document\.body\.dataset\.khungGoc/);
  assert.match(DO_TRONG_TRANG, /\.vung-tu-do/);
  assert.deepEqual(THANG, [0, 4, 8, 12, 16, 24, 32, 48]);
});
