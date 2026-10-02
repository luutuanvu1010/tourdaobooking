// LỚP CHỐNG GHI TRÙNG (ADR-0094 đ3, H5; Hiến chương 1.2 "một lô ghi nguyên khối") — NỢ CÓ TÊN.
// (1) `NGOAI_VE`: nơi được dùng `dbNgoaiVe` (src/shared/lan-gui-boc.ts) — câu ghi phụ TRƯỚC lô chính, đi thẳng D1 gốc, không mang vé. Bài
//     src/lan-gui-no.test.ts ép: mọi lời gọi `dbNgoaiVe(` trong src/ nằm trong hàm có tên ở đây; mục thừa ⇒ đỏ.
// (2) `GHI_NHIEU_LAN`: route ghi > 1 lần mỗi lệnh (đo ở giai đoạn 1 bằng log `lan_gui_ghi_nhieu_lan`). Vé đi ở lô đầu; lô sau hỏng thì người dùng nhận
//     "đã ghi" mà phần sau chưa ghi. Chấp nhận ở giai đoạn 1, trả trước bản siết. e2e đối chiếu log với danh sách này (L12).

export interface MucNgoaiVe {
  /** `<tệp>#<hàm>` gọi `dbNgoaiVe`. */
  readonly noi: string;
  readonly lyDo: string;
}
export const NGOAI_VE: readonly MucNgoaiVe[] = [
  {
    noi: "src/modules/orders/repository.ts#demThanCu",
    lyDo:
      "Dòng nhật ký đếm máy còn gửi thân kiểu cũ (ADR-0047 §6), ghi TRƯỚC lô lập đơn / lưu nháp / sửa chuyến và tự nuốt lỗi. Mang vé thì lô chính hỏng sau đó vẫn để lại vé ⇒ gửi lại bị báo nhầm 'đã ghi' (T17). Chọn 'ngoài vé' thay vì nối vào lô chính: câu đếm phải ghi cả khi lệnh bị từ chối 400 (đếm máy cũ), nên không thuộc lô chính.",
  },
];

export interface MucGhiNhieuLan {
  /** Mẫu route `METHOD /api/...` đúng như khai. */
  readonly duong: string;
  readonly lyDo: string;
}
export const GHI_NHIEU_LAN: readonly MucGhiNhieuLan[] = [];
