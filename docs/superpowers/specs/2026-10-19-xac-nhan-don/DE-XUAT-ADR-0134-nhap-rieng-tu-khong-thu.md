# Đề xuất ADR-0134 — Đơn nháp chỉ người tạo thấy; nháp không ghi thu, không có QR; bỏ ô Thanh toán trước; hàng chờ nhận chỉ đơn đã xác nhận

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (N3). Số 0134 đã kiểm còn trống ngày 19/10.

- **Ngày:** 2026-10-19. **Lượt duyệt:** 1 (cùng ADR-0133; trang ghép `TRANG-GHEP-LUOT-1.md`). Mở Đợt 2 của kế hoạch.
- **Loại:** việc lớn (quyền xem đơn, tiền). **Cửa:** hai chiều — chỉ đổi mã, không migration, không đổi giá trị ô nào của bản đồ quyền.
- **Đứng một mình:** ADR này KHÔNG mở nhánh "người xét duyệt đọc đơn đang chờ" và nhãn tin `xet-duyet` — hai thứ đó thuộc ADR-0135 (lượt 2). Duyệt ADR này không kéo theo duyệt ADR-0135.
- **Quan hệ với ADR cũ** (chi tiết tệp:dòng ở trang ghép mục 2–3):
  - **ngoại lệ có tên** của ADR-0014 đ2 ("Toàn quyền `any` ở mọi ô") và ADR-0007 đ1 (Quản trị mọi đơn): với đơn **nháp**, chỉ người lập đọc được; giá trị ô `order.view` không đổi;
  - **thay một phần** ADR-0023 đ1 và ADR-0030 S23-1, S23-2: hàng chờ nhận chỉ gồm đơn **đã xác nhận**; người phụ trách chọn sẵn không xem được đơn khi đơn còn nháp;
  - **thay một phần** ADR-0022 và ADR-0034 đ3: sự kiện / tin của đơn nháp chỉ tới người lập;
  - **thay một phần** ADR-0026 đ9 (gạch "Form lập đơn": ghi trả trước sau khi lưu) và đ10 (ô `payment.receive` trước "Đã giao"): không áp cho đơn nháp;
  - **thay một phần** ADR-0108 đ3(b): đơn chưa xác nhận ⇒ 409;
  - **thay** ADR-0049 dòng "Đơn nháp chỉ hiện thành một con số trên đầu màn" (`:75`): theo Đ9.
- **Xây trên lỗ đang hở:** **không**, kèm một điều kiện — xem trang ghép mục 4 (TNV-G1: né nhờ "nháp không ghi thu", TRỪ nháp cũ đã có khoản thu; chủ đếm trước khi phát hành).

## Bối cảnh
Chủ dự án 19/10, lượt 4 (đặc tả mục 5b.1, 5b.2): *"Đơn nháp chỉ người tạo đơn đọc được; nháp chưa vào luồng đơn chung; danh sách đơn chờ nhận không tính đơn nháp."* — *"Đơn nháp không ghi thu tiền được."* Lượt 5 (5c.1): *bỏ ô "Trả trước" khỏi màn Tạo đơn; tiền chỉ ghi được sau khi đơn đã xác nhận.* Lượt 6 (đặc tả mục 5d.1, 19/10, nguyên văn *"theo khuyến nghị của bạn"*): lịch chung điều phối xe **chỉ hiện chặng của đơn nháp đã gửi xác nhận**, bỏ nháp chưa gửi. Hôm nay mã làm ngược cả bốn điều: Bán hàng, Kế toán, Quản trị, Toàn quyền xem nháp của mọi người; hàng chờ nhận có cả nháp; ghi thu lên nháp được; màn Tạo đơn ghi khoản thu ngay sau khi lưu nháp.

## Quyết định
1. **Đ1 — Đọc.** Đơn `draft` chỉ người lập đọc được (người lập vẫn phải qua ô `order.view` như hôm nay). Mọi đường đọc — danh sách, tìm theo mã, chi tiết, hành khách, thương mại, biên nhận, QR, khoản thu, nhập kế toán, số dư sổ — trả **404** cho người khác, kể cả Toàn quyền và người phụ trách chọn sẵn. Luật nằm ở **một** hàm thuần dùng chung, thay cho câu `can(order.view)` của các route đọc. Ngoại lệ có tên: trang Nhật ký của Toàn quyền (ADR-0038 đ6) vẫn liệt kê dòng nhật ký của đơn nháp. [người soạn]
2. **Đ2 — Ghi.** Mọi route ghi lên đơn nháp (sửa, xác nhận, huỷ, thông tin chuyến, chặng, hành khách, đổi người đặt, thương mại theo dịch vụ, giao người phụ trách) chỉ người lập; người khác nhận 404. Huỷ và sửa tiền của HDV đã chặn nháp sẵn (`NOT_CONFIRMED`). [người soạn — chờ chủ xác nhận, xem câu hỏi Q2]
3. **Đ3 — Đếm.** Số "Đơn nháp" (thẻ Việc của bạn, ô "Chờ xác nhận" trên điện thoại, huy hiệu "Đơn hàng" thanh bên) = nháp **của chính người xem**. Số "Chưa phụ trách" chỉ đếm đơn đã xác nhận. [người soạn]
4. **Đ4 — Hàng chờ nhận.** Chỉ đơn `confirmed`. Bấm Nhận đơn nháp ⇒ 409 `order_not_confirmed` ("Đơn chưa xác nhận, chưa nhận được.").
5. **Đ5 — Người phụ trách chọn sẵn.** Dòng phụ trách vẫn ghi lúc lập như hôm nay, nhưng khi đơn còn nháp người đó không đọc (kể cả màn "Việc của tôi" và mọi tập "đơn tôi phụ trách" dùng chung), không ghi, không nhận tin về đơn; đơn chuyển sang đã xác nhận thì có hiệu lực như hôm nay. [người soạn, theo "như cũ" của chủ ở Phần A mục 12]
6. **Đ6 — Tin.** Sự kiện Bảng tin và tin hộp thông báo của đơn nháp chỉ gắn người lập (bỏ nhãn `tat-ca`, `cho-nhan`, nhãn người phụ trách). [người soạn: suy từ "nháp chỉ người tạo đọc"]
7. **Đ7 — Nháp không ghi thu.** Ghi khoản thu lên đơn nháp ⇒ 409 `order_draft_no_payment` ("Đơn chưa xác nhận, chưa ghi thu được."); nút ghi thu ẩn. Cùng luật cho lệnh chuyển cọc từ đơn huỷ sang đơn mới: đơn nhận là nháp ⇒ 409 [người soạn]. Áp cả đơn đang chờ xác nhận (vẫn là nháp).
8. **Đ8 — QR và ô Thanh toán trước.** QR chỉ cho đơn `confirmed` (máy chủ 409 `qr_requires_confirmed`, nút ẩn) — áp cho **mọi** đơn, kể cả đơn không cần bước xác nhận. [người soạn, đặc tả Phần C mục 1; chủ có thể bác] Bỏ ô "Thanh toán trước", "Hình thức", "Người thu tiền" và bước ghi thu sau khi lưu khỏi màn Tạo đơn.
9. **Đ9 — Lịch chung điều phối.** Phần "nháp" của lịch chung (ô "ĐƠN NHÁP" trên bảng điều phối) chỉ gồm chặng của nháp có yêu cầu xác nhận còn mở (nguồn: đặc tả mục 5d.1). Trước khi ADR-0135 có hiệu lực, tập này rỗng.

## Phương án bị bác
- **Thêm ô quyền mới "xem nháp":** chủ nói "chỉ người tạo", không cần ô; mỗi ô mới là một dòng phải ghim ở mọi bài bản đồ.
- **Chỉ ẩn ở giao diện:** máy chủ vẫn trả nháp; trái lời chủ.
- **Cho Quản trị / Toàn quyền vẫn xem nháp:** trái chữ "chỉ người tạo"; muốn thì chủ nói, mở ngoại lệ có tên.
- **Chỉ chặn ghi thu khi đang chờ:** nháp thường vẫn thu được rồi bị huỷ ⇒ rơi vào TNV-G1.
- **Giữ ô Thanh toán trước, ghi sau xác nhận:** màn Tạo đơn chưa có đơn đã xác nhận, người lập dễ hiểu nhầm là đã ghi.

## Hệ quả
Không migration, không đổi giá trị ô. Danh sách route và chỗ giao diện bị đổi: trang ghép lượt 1 mục 3 và 3b (một nơi, không chép lại ở đây) — gồm cả hai đường kế hoạch chưa nêu: xe của đơn ở phân hệ Vận chuyển (`GET /api/van-chuyen/xe-cua-don/:orderId`, hôm nay trả 200 cho nháp người khác) và màn "Việc của tôi" của HDV (`GET /api/dispatch/mine`, tính cả nháp). Chữ hướng dẫn nhắc trả trước phải sửa.

## Điều chưa chắc — câu hỏi cho chủ
- **Q1. Đặt gấp cho nháp của người khác (cao).** Hôm nay ô Đặt gấp chỉ Quản trị, Toàn quyền có (`src/shared/permissions.ts:97`). Bán hàng / Đối tác lưu nháp sát giờ rồi nhờ Quản trị mở đơn bấm Đặt gấp (ADR-0049 Đ5); Quản trị tìm đơn qua trang đơn hoặc ô "ĐƠN NHÁP … chờ duyệt đặt gấp" của bảng điều phối. Sau Đ1 và Đ9, đơn không có dịch vụ "cần xác nhận" hết đường này. Phương án: **(A, khuyến nghị [người soạn])** nháp có chặng dưới mốc chưa đặt gấp cũng phải "Gửi xác nhận" (ADR-0135 mở rộng điều kiện), Quản trị / Toàn quyền đặt gấp ngay trong bảng xác nhận; Đợt 2 không phát hành trước Đợt 3. (B) Ngoại lệ đọc hẹp: người giữ ô Đặt gấp thấy phần hẹp của nháp có chặng dưới mốc chưa đặt gấp. (C) Mở ô Đặt gấp cho Bán hàng (chữ ADR-0107 Đ1 ghi SALES `any`, mã hôm nay chỉ Quản trị / Toàn quyền — chưa kiểm vì sao lệch) — không giải được Đối tác, Thực tập.
- **Q2. Đ2 "chỉ người tạo ghi".** Khuyến nghị: đồng ý, để không có đường ghi "mù" lên đơn không ai khác thấy. Hệ quả: Quản trị không còn sửa / huỷ hộ nháp của người khác (nháp không vào luồng chung nên vô hại).
- **Q3. Nháp cũ đã có khoản thu** (sinh từ ô Thanh toán trước): chủ đếm bằng lệnh ở Task 2.2 Step 0 của kế hoạch trước khi phát hành; > 0 thì chủ quyết cách xử lý.
- Danh sách "Người lập" của bộ lọc (`nguoiDaLapDon`) vẫn tính cả người chỉ có nháp (chỉ lộ tên). Đề xuất để nguyên. [người soạn]
