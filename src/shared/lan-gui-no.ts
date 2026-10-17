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
  {
    noi: "src/modules/auth/index.ts#verifyPinThrottled",
    lyDo:
      "Sổ đếm lần thử PIN (bảng login_attempt — đặt chỗ, xoá khi đúng) dùng chung cho đăng nhập, Đổi PIN, Bật Face ID; ghi TRƯỚC lô chính và phải ghi cả khi lệnh bị từ chối. Mang vé thì lô Đổi PIN hỏng vẫn để lại vé ⇒ gửi lại bị báo nhầm 'đã ghi' mà PIN chưa đổi (bài lan-gui-hanh-vi ca k).",
  },
  {
    noi: "src/modules/auth/index.ts#kiemMaHienCoNoi",
    lyDo:
      "Lõi của kiemMaHienCo — kiểm mã của yếu tố hiện có khi tự đổi khoá / gỡ yếu tố / tạo lại mã dự phòng / đổi email (ADR-0074 điều 5): đặt chỗ lượt thử (login_attempt, khoá mfa:<id>), tiêu bước TOTP hoặc một mã dự phòng (bước 1 đổi email: mã dự phòng chỉ kiểm, tiêu sau ở guiMaBatEmail), xoá bộ đếm — ghi TRƯỚC lô chính và phải ghi cả khi lệnh bị từ chối hay lô chính hỏng (đếm lần sai, chống dùng lại mã). Cùng lý do với verifyPinThrottled.",
  },
  {
    noi: "src/modules/auth/index.ts#guiMaBatEmail",
    lyDo:
      "Bước 1 tự bật yếu tố email (ADR-0074 điều 4, Phần C Task 3): bộ đếm gửi thư (login_attempt, khoá mfa-mail:<id>) và dòng mã bật (aut_mfa_email_code) ghi TRƯỚC khi gửi thư (Hiến chương 5.16). Gửi hỏng trả 502 và máy khách GIỮ vé: nếu dòng mã mang vé thì bấm gửi lại cùng thân bị báo 'đã ghi' mà không thư nào đi. Vòng sửa 2: mã dự phòng (nếu dùng) chỉ bị tiêu SAU khi thư đã đi, cũng ngoài vé — mang vé thì 502 rồi gửi lại cùng thân sẽ bị báo 'đã ghi'. Tiêu thua → huỷ mã bật vừa phát. Lệnh không có lô ghi nào khác.",
  },
  {
    noi: "src/modules/auth/index.ts#kiemMaBatEmail",
    lyDo:
      "Bước 2 tự bật yếu tố email: đặt chỗ lượt thử (login_attempt, khoá mfa:<id>), tiêu hoặc đếm sai mã bật, xoá bộ đếm — ghi TRƯỚC lô chính (chèn yếu tố + nhật ký) và phải ghi cả khi lệnh bị từ chối hay lô chính hỏng (đếm lần sai, chống dùng lại mã). Cùng lý do với kiemMaHienCo.",
  },
  {
    noi: "src/modules/auth/passkey.ts#limitChallenge",
    lyDo:
      "Sổ đếm thách thức Face ID theo IP (login_attempt, khoá webauthn:<ip>) ghi TRƯỚC lô chính của Bật Face ID / Đặt PIN bằng Face ID và phải ghi cả khi bị từ chối — cùng lý do với verifyPinThrottled. Không mang vé thì bước 'xin thách thức' (chỉ ghi sổ đếm) cũng không bị phát lại thành 'đã ghi'.",
  },
  {
    noi: "src/modules/auth/passkey.ts#checkPasskeyAssertion",
    lyDo:
      "Tiêu thách thức + cập nhật bộ đếm chữ ký Face ID (markPasskeyUsed) ghi TRƯỚC lô chính của Đặt PIN bằng Face ID và phải ghi dù lô chính hỏng (chống dùng lại chữ ký). Mang vé thì lô chính hỏng mà gửi lại bị báo nhầm 'đã ghi'.",
  },
];

export interface MucGhiNhieuLan {
  /** Mẫu route `METHOD /api/...` đúng như khai. */
  readonly duong: string;
  readonly lyDo: string;
}
// Đo 2026-10-02 bằng e2e đủ bộ (log `lan_gui_ghi_nhieu_lan`, run.mjs). Không route tiền / đơn nào (lập đơn, lần thu, Đã giao, hoàn, nộp, điều chỉnh) trong
// danh sách. Trả nợ trước bản siết: gộp về một lô, hoặc chuyển phần phụ sang "ngoài vé" có tên.
export const GHI_NHIEU_LAN: readonly MucGhiNhieuLan[] = [
  { duong: "POST /api/staff/:id/reset-pin", lyDo: "Lô đặt lại PIN (+ gỡ Face ID, kết thúc phiên) rồi mở khoá 'sai PIN quá nhiều' (unlockPhone của auth) ở lần ghi thứ hai. Lần hai hỏng ⇒ gửi lại nhận 'đã ghi' dù chưa mở khoá — Quản trị bấm Mở khoá được." },
  { duong: "POST /api/account/pin-by-passkey", lyDo: "Lô đặt PIN bằng Face ID rồi unlockPhone ở lần ghi thứ hai (cùng khuôn reset-pin)." },
  { duong: "POST /api/catalog/sync", lyDo: "Đồng bộ danh mục từ Google Sheet ghi nhiều lô theo bản chất; tự nó đã lặp lại an toàn (đồng bộ lại cùng dữ liệu không đổi gì)." },
  { duong: "POST /api/tro-ly/hoi", lyDo: "Bộ nhớ đệm tìm theo nghĩa / trạng thái trần rồi dòng lượt hỏi. Không chạm dữ liệu nghiệp vụ; gửi lặp chỉ thấy 'đã ghi' và tải lại (lượt hỏi đã lưu trong lịch sử)." },
  { duong: "POST /api/feedback", lyDo: "Lô tạo yêu cầu, rồi dấu 'đã gửi email báo' (setNotified) trong waitUntil SAU lô chính. Vé đi ở lô chính — đúng; lần ghi thứ hai chỉ là dấu email. Còn cơ chế clientRequestId cũ (ADR-0094 đ10)." },
  { duong: "POST /api/feedback/:id/messages", lyDo: "Lô thêm trả lời, rồi dấu 'đã gửi email báo' trong waitUntil SAU lô chính (cùng khuôn POST /api/feedback)." },
  { duong: "POST /api/parties/:id/documents/:did/tep", lyDo: "ADR-0123, ruling Q2/Q6 kế hoạch H-2 kho tệp: lô D1 (dòng tệp + dòng nối + nhật ký, mang vé) → đặt kho R2 → đánh dấu đã lưu ở lần ghi thứ hai; đặt kho nằm giữa nên không gộp được một lô. Lần hai hỏng (hoặc không đổi được dòng) ⇒ route trả 500, dòng thành 'tải dở dang' / 'chờ xoá' và POST /api/parties/tep-cho-xoa/chay-lai dọn; kho hỏng ⇒ thêm lô quyết xoá rồi đánh dấu đã-xoá-khỏi-kho. HẠN CHẾ ĐÃ BIẾT (vòng sửa nhóm C, I-1): vé đã ghi ở lô đầu, nên sau 500 mà bấm lại CÙNG vé thì nhận phát lại 200 { da_ghi_truoc_do: true, ket_qua: null } — ảnh KHÔNG được lưu, câu báo 'đã ghi' là sai; không mất dữ liệu đã lưu (vé BI_MAT chỉ sống trong bộ nhớ trang, lần bấm sau tạo vé mới). Nợ BL-TEP-PHAT-LAI-500 (docs/BACKLOG.md) — phải giải trước lát giao diện tải ảnh." },
  { duong: "POST /api/parties/tep-cho-xoa/chay-lai", lyDo: "ADR-0123 đ6, Hiến chương 5.16: lô quyết xoá tệp tải dở dang → xoá từng đối tượng kho rồi đánh dấu đã-xoá-khỏi-kho (mỗi tệp một lần ghi, kho nằm giữa) → dòng nhật ký tổng. Tự nó lặp lại an toàn: chạy lại chỉ xử lý dòng còn trong hàng chờ." },
  { duong: "POST /api/parties/phieu-xoa/:pid/thuc-hien", lyDo: "ADR-0126 đ3, đ7; Hiến chương 5.16: lô ẩn danh hoá (mang vé) → xoá từng đối tượng kho R2 rồi đánh dấu đã-xoá-khỏi-kho → chép bản ngoài D1 rồi đánh dấu; kho nằm giữa nên không gộp được một lô. Lần sau hỏng thì phiếu vẫn 'Đã thực hiện', tệp còn 'chờ xoá' và bản ngoài còn cờ — chạy lại ở POST /api/parties/phieu-xoa/chay-lai." },
  { duong: "POST /api/parties/phieu-xoa/chay-lai", lyDo: "ADR-0126 đ7: chép bản ngoài D1 còn thiếu (mỗi phiếu một lần ghi sau khi đặt kho) và xoá kho tệp lý do PHIEU_XOA / HET_LY_DO_GIU còn chờ (mỗi tệp một lần ghi), rồi dòng nhật ký tổng; tự lặp lại an toàn (xoá kho đã mất không lỗi; bản ngoài ghi đè cùng nội dung)." },
];
