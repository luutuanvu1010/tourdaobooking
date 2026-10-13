# Đề xuất ADR-0114 — Sửa số khách: nhắc giảm giá khi bớt khách, lịch sử đủ dòng, mỗi đơn có người lớn

> Văn bản trình duyệt (hồ sơ có ngày, theo khuôn ADR-0109). **Chưa phải ADR**: chủ duyệt xong mới tạo `docs/adr/ADR-0114-…md`. Chưa sửa mã nào. Trang ghép: `00-trang-ghep.md`. Kế hoạch thi công: `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-ke-hoach.md`.

- **Ngày:** 2026-10-13. **Người soạn:** AI (phiên sổ tiền lượt 2). **Người quyết:** chủ dự án.
- **Nguồn:** lời chủ ngày 13/10 về sổ vàng `golden/sua-so-khach-van-phong.json` (11 ca, đều chờ xác nhận): "nếu giảm số lượng thì nhớ hiện nhắc nhở phần khuyến mại … 10 người giá 50, nhưng giảm chỉ còn 2 người mà cũng giá 50 là phải báo đỏ"; "SV-SK-07 cần thể hiện đầy đủ tất cả các số dòng trước-trong-sau điều chỉnh (đang thiếu dòng lúc khởi tạo)"; "SV-SK-10: số người lớn luôn phải lớn hơn 1 trong bất kỳ đơn nào, lý do là trẻ em phải đi kèm với người lớn". Bốn lựa chọn chủ đã trả lời trong chat: nhắc mỗi lần bớt khách trên đơn có giảm giá; sửa cả sổ vàng lẫn màn hình lịch sử đơn; ít nhất 1 người lớn tính trên cả đơn; soạn ADR và kế hoạch, chưa sửa mã.
- **Xây trên lỗ đang hở:** không. Đề xuất không đổi cách tính phải thu (giữ ADR-0109) nên không dựa vào TNV-G1/G3/G4 trong `docs/quyen-hoan.json`; người kiểm đối chiếu lại bước này.
- **Cửa:** hai chiều. Chỉ thêm cảnh báo, thêm dòng lịch sử, thêm một điều kiện từ chối; không đổi bảng, không migration.

## Ba quyết định xin chủ duyệt

**D1 — Bớt khách trên đơn có giảm giá thì nhắc màu đỏ.** Điều kiện (tính từ trạng thái hiện hành, không lưu cờ): giảm giá > 0 **và** số khách trả tiền (người lớn + trẻ em + người cao tuổi) hiện hành nhỏ hơn lúc xác nhận. Câu nhắc (không có chữ số, như câu cảnh báo cũ): "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại." Chỉ là cảnh báo: **không đổi số tiền, không chặn**. Nó **không** thay cảnh báo cũ "giảm giá lớn hơn tiền dịch vụ" (hai cảnh báo chạy độc lập, có thể cùng hiện). Cùng một hàm thuần ở `src/shared/so-khach-van-phong.ts`; máy chủ gửi qua cả hai đường sửa số khách (văn phòng và hướng dẫn viên) và qua chi tiết đơn; giao diện đổi sang màu nguy hiểm (cảnh báo cũ đang màu vàng). Không phải "giảm giá theo số khách": chủ đã **không chọn** phương án đó ở ADR-0109, nên số tiền giữ nguyên.

**D2 — Lịch sử số khách hiện đủ dòng, kể cả dòng lúc khởi tạo.** Trong khối "Lịch sử" của trang đơn (cùng cổng `order.history.view`, không đổi ai được xem gì) hiện: lúc xác nhận (số khách và tạm tính), từng lần sửa (trước → sau), kết quả hiện hành. Dòng lúc khởi tạo suy ra từ số khách đã chụp khi xác nhận (hoặc `before_json` của lần sửa đầu), **không migration, không đọc chữ nhật ký**. Ví dụ SV-SK-07: 4 người lớn (2.000.000) → 3 (1.500.000, lần sửa trước) → 5 (2.500.000, lần này).

**D3 — Mỗi đơn có ít nhất 1 người lớn, tính trên cả đơn.** Máy chủ từ chối ở lập đơn, lưu nháp, xác nhận và sửa số khách (cả hai đường dùng chung `planMoneyEdit`). Ca SV-SK-10 (bớt còn 0 người lớn) thành ca **bị từ chối**. Ba điều khoản kèm theo, cần chủ xác nhận cùng ADR:
1. *Người cao tuổi tính là người đi kèm* (khuyến nghị): đơn gồm toàn người cao tuổi vẫn lập được, vì lý do chủ nêu là "trẻ em phải đi kèm người lớn", không nói ông bà đi một mình. Nếu chủ muốn đúng chữ "người lớn" thì đổi một hằng số.
2. *Dịch vụ tính theo nhóm hoặc nhập tay* chỉ có ô "số khách" (lưu ở `adult`, không phân tuổi) nên được tính là người lớn; hệ thống không phân biệt được trẻ em ở đó. Đây là giới hạn đã biết.
3. *Đơn cũ không có người lớn* (nếu production có): không chặn thêm. Lần sửa số khách chỉ bị từ chối khi nó đưa số người lớn từ ≥ 1 xuống 0, để không khoá đơn đang chạy. Bất biến dữ liệu mới chỉ là **cảnh báo** (thoát 1 sẽ dừng `trien-khai`). Tôi không đọc được dữ liệu production, nên số đơn như vậy là **chưa kiểm**.

## Câu bị thay (ghi rõ, không xoá lặng lẽ)

- Phiếu kiểm 5b của ADR-0109 đòi sổ vàng có ca "tạm tính về 0" (cờ bắt buộc `tamTinh0` ở `src/so-vang-sua-so-khach.test.ts`). Ca đó chính là SV-SK-10, nay bị D3 cấm. Đề xuất **thay cờ `tamTinh0` bằng cờ "bị từ chối vì không còn người lớn"**; không bỏ cờ. Đây là đổi hàng rào nên cần chủ duyệt (Hiến pháp 9.4). Tạm tính về 0 chỉ còn khi giá người lớn bằng 0.
- ADR-0063 D1.12 / ADR-0109 nói "cảnh báo không chặn": giữ nguyên cho cảnh báo giảm giá; D3 là **chặn** riêng cho người lớn, không phải cảnh báo.

## Sổ vàng (không đánh dấu xác nhận nào)

"Đồng ý phần lớn" chưa phải xác nhận từng ca. D1 thêm khoá `canh_bao_khuyen_mai` và D2 thêm khoá `lich_su_so_khach` vào đáp án, nên xác nhận ngay bây giờ sẽ buộc sửa đáp án đã xác nhận về sau. Sau khi mã khớp, xin chủ (hoặc Kế toán) trả lời **từng mã**: SV-SK-01, 02, 03, 04, 05, 06, 08, 09, 11 (đáp án cũ, thêm hai khoá mới) — SV-SK-07 (thêm dòng khởi tạo) — SV-SK-10 (đổi thành bị từ chối) — SV-SK-12 (mới, đúng ví dụ chủ: 10 người lớn × 500.000, giảm giá 50.000, bớt còn 2: tạm tính 1.000.000, phải thu 950.000, **nhắc đỏ khuyến mại, không có cảnh báo giảm giá vượt**; đơn vị đồng do tôi chọn cho tròn số).

## Việc cần chủ làm

Trả lời một câu: **duyệt ADR-0114 (D1, D2, D3 kèm ba điều khoản)**, hoặc nói điều khoản nào đổi. Chưa duyệt thì không thi công.
