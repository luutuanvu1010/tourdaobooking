# Đề xuất «Sửa đổi» cho văn bản đã duyệt — Đợt 3 (chữ do chủ chọn)

> Ngày: 2026-11-09. Trạng thái: **ĐỀ XUẤT, CHỜ CHỦ DUYỆT.** Soạn bởi phiên thi công Đợt 3 (kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md`, Phần VI). Phiên thi công không sửa ADR hay đặc tả đã duyệt (Hiến pháp N9); chủ duyệt thì một phiên khác chép từng dòng dưới đây vào đúng văn bản.
> Mã trên nhánh đã dùng chữ mới; nếu chủ không duyệt dòng nào, chữ trên giao diện vẫn là chữ phiếu Phụ lục B mà chủ đã cho dùng ngày 9/11, chỉ có văn bản gốc còn ghi câu cũ.

## 1. ADR-0170, Điều 2 mục 5 (câu khoá vé cho Đối tác) — Task 3.2

**Câu hiện hành** (`docs/adr/ADR-0170-doi-tac-xem-va-gui-ve-cua-don-minh.md`, Đ2 mục 5): «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.»

**Điều đã xảy ra khi làm:** kế hoạch bắt dò trước một ca: đơn có công tắc thu tiền đối tác Bật, khoản đặt cọc do người khác (không phải đối tác lập đơn) cầm. Bài dò chạy thật cho thấy số «chờ nộp» của đơn vẫn gộp cả khoản cọc người khác cầm. Vì vậy câu chủ chọn ngày 8/11, «Tiền khách ở tay bạn. Hãy nộp về Công ty để mở vé.», có thể nói sai người cầm tiền; theo kế hoạch, mã dùng **câu dự phòng B-2**.

**Dòng «Sửa đổi» đề xuất** (thêm ngay dưới mục 5):

> Sửa đổi (Q-07, 2026-11-09, chủ duyệt …): đối tác là người lập đơn và đơn còn tiền chờ nộp về Công ty (đơn chưa huỷ) đọc «Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.»; câu «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.» chỉ còn cho các ca đối tác khác. Không dùng câu «Tiền khách ở tay bạn…» vì số chờ nộp gộp cả khoản đặt cọc người khác cầm.

**Điều chủ nên biết:** câu dự phòng ít sai hơn nhưng vẫn chưa thật đúng ở chính ca đã dò (khi nhân viên khác cầm cọc, người cần nộp là nhân viên đó, không phải đối tác). Muốn câu đúng hẳn thì máy phải tách riêng phần tiền người lập đang cầm — việc đó chạm phân hệ tiền, cần chủ quyết riêng; Đợt 3 chưa làm.

## 2. Đặc tả 31/10 «Luật mã định danh + nút Sửa», mục Loại đối tác — Task 3.4(f)

**Câu hiện hành** (`docs/superpowers/specs/2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac-design.md`, mục «Loại đối tác»): loại tạo trước bản này hiện «Tạo trước 31/10/2026 — chưa có dấu vết». (Cùng câu còn ở kế hoạch `docs/superpowers/plans/2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac.md` — kế hoạch là hồ sơ có ngày, không cần sửa.)

**Dòng «Sửa đổi» đề xuất** (thêm cuối mục đó):

> Sửa đổi (G-06(f), 2026-11-09, chủ duyệt …): chữ hiện cho loại tạo trước bản này đổi thành «Tạo trước 31/10/2026 — không rõ người tạo» (phiếu chữ B-13 phương án (1)), vì «chưa có dấu vết» khó hiểu với người dùng.

## 3. Chữ AI phải tự viết — chờ chủ chọn (mã đang dùng phương án đầu)

Luật dự án: chữ chưa có thì đưa 2–3 tên cho chủ chọn, không tự đặt. Ba chỗ dưới đây phiếu Phụ lục B không có chữ dùng được, nên mã tạm dùng phương án (1); chủ trả lời một dòng, ví dụ «C-1: 2, còn lại giữ».

- **C-1 (thay B-7, trang đăng nhập khi hết hạn đăng nhập):** cả ba phương án B-7 đều có chữ «phiên», mà bảng từ đã duyệt (ADR-0130) cấm trên giao diện (máy kiểm `src/bang-tu-giao-dien.test.ts` đỏ). (1) «Máy này đã bị đăng xuất. Đăng nhập lại để tiếp tục.» — đang dùng, cùng khuôn câu «Máy này đã bị đăng xuất. Lý do: …» đã có. (2) «Đã hết hạn đăng nhập. Đăng nhập lại để tiếp tục.» (3) «Bạn đã bị đăng xuất vì lâu không dùng. Đăng nhập lại để làm tiếp.» (lưu ý: (3) có thể nói sai khi bị đăng xuất vì lý do khác).
- **C-2 (màn Dịch vụ cần kiểm vé, câu đếm khi nhóm không có vé nào cần kiểm):** (1) «Không có vé cần kiểm (N vé)» — đang dùng. (2) «0/N vé cần kiểm» (cùng khuôn câu khi có vé cần kiểm). (3) «N vé, chưa vé nào cần kiểm».
- **C-3 (màn đủ «Dịch vụ & giá», chữ nguồn của công tắc vé):** trước ghi «Đặt riêng», nay dùng chung chữ màn hẹp. (1) «Đặt riêng cho vé này» — đang dùng (một khái niệm một tên ở hai màn). (2) giữ «Đặt riêng» ở cả hai màn.

## 4. `web/CLAUDE.md` — tên nút cũ (đề xuất kèm, không phải ADR)

Bảng «đổi gì → chạy kịch bản nào» của `web/CLAUDE.md` (dòng «Mốc 6 giờ + đặt gấp») còn ghi tên nút cũ «Duyệt đặt gấp». Tên nút nay là «Ghi đặt gấp» (phiếu chữ B-11 phương án (1)). Đây là tệp luật nên phiên thi công không tự sửa; đề xuất thay đúng hai chữ đó.
