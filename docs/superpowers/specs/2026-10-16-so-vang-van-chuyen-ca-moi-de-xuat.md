# Sổ vàng vận chuyển: các ca mới đề xuất cho chủ duyệt

Ngày 2026-10-16. Hồ sơ có ngày. Đây là đề xuất của AI, **chưa có ca nào vào `golden/`**. Mỗi ca ghi đáp án theo quyết định của chủ đã có trong ADR (không theo mã), kèm nguồn. Chủ sửa chữ nào, tôi chép nguyên sang tệp rồi mới viết bài chạy. Khi viết bài chạy, nếu mã làm khác đáp án đã duyệt thì tôi báo, không sửa đáp án cho khớp mã.

**Phần lượt 1 (24 bước) đã có bản đọc riêng:** `2026-10-16-so-vang-dieu-phoi-luot-1-ban-doc.md`.

**Bối cảnh chung:** dùng lại xe A (15 chỗ), xe B (29 chỗ), xe Minh Phát, chuyến sáng 30/09, mốc 6 giờ, nghỉ giữa hai chuyến 30 phút, như ở lượt 1.

## Nhóm 1. Điều chỉnh khẩn cấp (ADR-0104, chủ chọn «Bán hàng cũng được», 8/10)
- **K1** Chuyến xuất bến 05:50, bây giờ 03:00 (còn dưới 6 giờ). Bán hàng đổi xe, chưa nêu lý do. Kết quả: bị chặn, máy hỏi lý do. Chọn lý do rồi gửi lại: được, chuyến mang nhãn «khẩn cấp» ở chi tiết và lịch, ghi nhật ký.
- **K2** Chuyến xuất bến 05:50, bây giờ 22:00 hôm trước (còn hơn 6 giờ). Bán hàng đổi xe. Kết quả: vẫn chỉ Quản trị hoặc Toàn quyền làm được, Bán hàng bị chặn; Quản trị làm được và chuyến không mang nhãn khẩn cấp.
- **K3** Kế toán hoặc Hướng dẫn viên thử điều chỉnh khẩn cấp. Kết quả: từ chối, không ghi gì.
- **K4** Chuyến còn hơn 6 giờ. Trong **cùng một lệnh** sửa chuyến, Bán hàng dời giờ vào trong 6 giờ và vượt khoảng nghỉ 30 phút. Kết quả: tính là sát giờ, Bán hàng làm được kèm lý do (ADR-0104 Đ1 mục 0).
- **K5** Chuyến dưới 6 giờ, xe riêng theo cam kết của khách, Bán hàng xếp đơn thường vào. Kết quả: kèm lý do thì được, ghi cờ «trái cam kết»; thiếu lý do thì chặn. Tài xế đang lái nhận đúng một tin, câu trung tính, không chữ «khẩn cấp».
- **K6** Điều chỉnh khẩn cấp nào cũng ghi lại ai làm, lý do gì, lúc nào. Nhật ký không có tên khách hay số điện thoại.

## Nhóm 2. Đồng bộ chuyến theo đơn (ADR-0104 Đ2, chủ chọn «máy tự thêm ghế khi còn chỗ»)
- **K7** Bán hàng bớt 2 khách trên đơn đang xếp xe, lúc chuyến đã sát giờ. Kết quả: máy tự trả 2 ghế, không bị vướng khoá giờ.
- **K8** Bán hàng huỷ cả đơn. Kết quả: máy tự trả mọi ghế của đơn trên các chuyến, không bị vướng khoá giờ. (Trạng thái chặng sau khi trả ghế tôi chưa đối chiếu với ADR, sẽ ghi khi soạn tệp.)
- **K9** Đơn thêm 2 khách, xe còn 5 chỗ trống. Kết quả: máy tự thêm đúng 2 ghế, trên đúng xe đó, cùng điểm đón.
- **K10** Đơn thêm 2 khách, xe chỉ còn 1 chỗ. Kết quả: máy không tự thêm, giữ xe cũ, báo người xếp xe xử lý.
- **K11** Đơn thêm khách làm vi phạm cam kết xe riêng. Kết quả: như K10, máy không tự thêm.

## Nhóm 3. Tài xế đối tác từ chối và báo bận (kịch bản e2e `tu-choi-bao-ban`, đã chạy xanh)
- **K12** Tài xế đối tác từ chối chuyến trong hạn, chọn lý do trong danh sách. Kết quả: chuyến về «chưa có tài xế». Quản trị và Toàn quyền nhận tin «đã từ chối, cần xếp người khác» (không tên, không lý do). Kế toán và tài xế khác không nhận tin.
- **K13** Tài xế đối tác từ chối quá hạn. Kết quả: bị từ chối, nói rõ quá hạn.
- **K14** Tài xế báo bận một khung giờ chồng chuyến của chính mình. Kết quả: chặn, liệt kê chuyến đang chồng.
- **K15** Văn phòng xếp tài xế vào khung bận. Kết quả: chặn, câu thông báo không nêu lý do bận của tài xế.
- **K16** Tài xế rút khung bận, rồi văn phòng xếp lại. Kết quả: xếp được.

## Nhóm 4. Giờ lái và nghỉ (chính sách mặc định: 8 giờ lái mỗi ngày, nghỉ 30 phút)
- **K17** Tài xế đã có hai chuyến 4 giờ + 3 giờ trong ngày, văn phòng thêm chuyến thứ ba 2 giờ (tổng 9 giờ). Kết quả: vẫn tạo được nhưng có dòng nhắc «lái quá giờ tối đa trong ngày», cả ở lúc tạo lẫn chi tiết chuyến.
- **K18** Chuyến liên tục 4 giờ 30 không nghỉ. Kết quả: có dòng nhắc «chuyến dài cần nghỉ».
- **K19** Hai chuyến cùng xe, nghỉ giữa hai chuyến 20 phút tính theo giờ thật, đã có ở lượt 1 (B21, B22), nên không lặp.

## Nhóm 5. Xuất bến, huỷ chuyến, cứu hộ
- **K20** Bấm Xuất bến sớm trước ngày chạy: được, nhưng tài xế vẫn không thấy tên và số liên hệ khách (chỉ thấy trong ngày chạy). Kết quả theo luật Q-L3-B.
- **K21** Chuyến chạy ba ngày sau, tài xế bấm Xuất bến. Kết quả: chặn, báo «ngoài cửa sổ xuất bến», văn phòng xử lý, chuyến vẫn ở kế hoạch (ADR-0096 Đ2).
- **K22** Huỷ chuyến còn khách, Bán hàng kèm lý do khi chuyến dưới 6 giờ. Kết quả: được, ghi nhật ký; tài xế đang lái nhận tin «đã bị huỷ», tài xế đã bị đổi ra không nhận. (Số phận các chặng sau huỷ tôi chưa đối chiếu ADR, sẽ ghi khi soạn tệp.)
- **K23** Xe hỏng giữa đường, văn phòng bấm «Kết thúc gián đoạn», rồi lập chuyến cứu hộ: đã có ở lượt 1 (B13 đến B16), nên không lặp.

## Nhóm 6. Đứng sau chuyển khách giữa hai xe
Mười tình huống đã duyệt từ 8/10 (`golden/dieu-phoi-luot-2/…`) và đang có bài chạy; không lặp.

## Điều tôi cần bạn quyết (tối đa ba)
1. **Số lượng:** 22 ca mới là nhiều. Tôi đề xuất bạn duyệt **nhóm 1 và 2 trước (K1 đến K11)** vì chúng đụng tiền gián tiếp (gắn nhãn khẩn cấp, trả ghế), các nhóm sau duyệt sau. Hay bạn muốn duyệt hết một lượt?
2. **K17 và K18:** bạn nêu số giờ lái tối đa mỗi ngày và mốc nghỉ liên tục bạn muốn dùng, vì mặc định hiện là 8 giờ và chưa có người nào chốt con số này (quy định pháp lý tôi tra ngày 27/9 chỉ ở mức trung bình tin cậy).
3. **K20, K21:** hai ca này lấy từ quy tắc đã duyệt nhưng chữ ADR chưa rõ có «sớm bao nhiêu thì được»; bạn nói «sớm tối đa mấy giờ trước ngày chạy» hoặc để tôi bỏ hai ca này.
