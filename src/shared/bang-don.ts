// Bảng Đơn hàng (khuôn Danh sách của khung gốc giao diện, ADR-0222): khuôn cột của dòng đơn, khai bằng TÊN cột của thang (ngan 96, vua 128, dai 200; `gian` là cột
// co giãn, không hẹp hơn 180). Tệp thuần, không nhập gì: web/order-card.ts (dựng ô) và web/orders.ts (đặt khuôn lên khối bảng) cùng đọc, bài src/khung-web.test.ts
// cộng lại để chắc cột tên khách không bao giờ bị bóp ở đúng mốc bật bảng (lỗi 21/11/2026: cột tên co về 0 khi cửa sổ rộng 1.100 tới 1.199).

/** Tên vùng của từng ô trong dòng đơn. */
export const VUNG_O_DON = { ngay: "ngay", ten: "ten", sdt: "sdt", khach: "khach", tien: "tien", trangThai: "tt", noiDon: "dia" } as const;

export const BANG_DON = {
  /** Vùng nội dung từ 800: năm cột, số điện thoại nằm dưới tên khách. */
  vua: { cot: ["vua", "gian", "ngan", "vua", "vua"], vung: ["ngay ten khach tien tt", ". sdt . . .", ". dia dia dia ."] },
  /** Vùng nội dung từ 1040: sáu cột, số điện thoại có cột riêng. */
  rong: { cot: ["vua", "gian", "vua", "ngan", "vua", "vua"], vung: ["ngay ten sdt khach tien tt", ". dia dia dia dia ."] },
} as const;
