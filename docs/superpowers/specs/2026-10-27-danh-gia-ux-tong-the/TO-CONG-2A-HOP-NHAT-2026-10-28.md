# Cổng 2a — tờ hợp nhất cho chủ dự án: duyệt bộ "Island Booking System — Design System v2" (28/10/2026)

Hồ sơ có ngày, một trang. Người soạn: phiên kiểm (island-booking-ux-redesign); người đọc duyệt trước khi đưa chủ: Main session; người dựng bộ: phiên Design System v2. Gom ba nguồn: `TOM-TAT-CONG-2A.md` (phiên dựng bộ, nhánh `chang-2-ds-v2`), `DOI-CHIEU-BO-V2-2026-10-28.md` (bảng lệch 52 dòng), bảng "gộp gì" từ Claude Design (mục 5, điền khi có). Chủ chỉ cần đọc tờ này và trả lời **một lần** cho mục 3 và 4.

## 1. Bộ ở đâu, ai dựng, kiểm thế nào

Bộ v2 trên Claude: <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5> (riêng tư, chỉ chủ mở được). Phiên Claude Code "Design System v2" dựng từ mã đang chạy (main 2847b6c2) theo đề cương đã duyệt ở cổng 1: sổ tay 12 mục bằng tiếng Việt, bảng token ba tầng (số đếm ghi cạnh phiên bản sau sửa ở dưới), 14 vai chữ, 42 biểu tượng, 4 logo, phông Be Vietnam Pro và ba phông tuỳ chọn, 20 thành phần dùng chung có bản xem trước. Hai bộ cũ đã đổi tên thêm "(cũ, không dùng để vẽ)" như chủ đồng ý 27/10.

Kết quả kiểm độc lập (bước 2c, bằng kịch bản so với giá trị chép từ mã): **52 dòng — đạt 35, lệch 7, thiếu 3, tự quyết 7; 40/40 mã màu đúng; không dòng nào trái quyết định cổng 1.** Bảy chỗ lệch nhỏ (thang cỡ chữ chưa khai thành token, một chiều cao dòng đổi không ghi, tên mục ở 5 trang thành phần, phạm vi đổi cỡ ô gõ, thiếu một độ đậm số lớn, dấu MỚI cho ba mốc, phông mono) phiên dựng bộ đã nhận sửa và xuất bản lại; **phiên bản sau sửa: bản 5, mã `1793143219-823e` (28/10), 204 token trong đó 19 MỚI; kiểm lại bằng cùng kịch bản: 86/88 giá trị khớp, hai giá trị còn lại là bỏ có lý do, bảy chỗ đã nhận sửa đều đạt** (ghi ở cuối `DOI-CHIEU-BO-V2-2026-10-28.md`). Ba phần cố ý chưa đưa vào bộ (thanh trên, thanh tab, thanh bên; trang mất mạng, không quyền, không có trang; năm khuôn trang đầy đủ) sẽ vẽ ở đề bài khung chung ngay sau cổng này.

## 2. Bốn điều "mất gì" chủ nên biết trước khi duyệt (ba điều đầu đảo được bằng đổi một con số)

- **Chữ đậm hơn ở tiêu đề và số lớn** (500 → 600, đúng quyết định 2 cổng 1): mất cảm giác "chữ mảnh" chủ chọn ở bản 1.65; ba núm độ đậm ở Giao diện công ty vẫn chỉnh được.
- **Vành tiêu điểm bàn phím dày 3 px** thay 2 px: rõ hơn, nhưng ở lưới ô sát nhau có thể chạm viền ô kế bên. **Chữ trong ô gõ 16 px** thay 17 px ở 8 chỗ (ô tìm, ô chọn Điều phối, thêm hành khách…): nhỏ đi 1 px, vẫn đủ để iPhone không tự phóng.
- **Bề rộng nội dung tối đa 1280** thay 1200: trên màn ≥ 1440 nội dung rộng thêm 80 px, Trang chủ bỏ mốc 1400 riêng; bảng nhiều cột hơn nhưng dòng chữ dài hơn.
- **42 hình biểu tượng** được sinh tự động từ mã, chưa ai soi từng cái bằng mắt: chủ lướt bảng biểu tượng trong bộ một lượt khi duyệt.

## 3. Quyết định xin chủ (trả lời "duyệt" hoặc ghi điểm sửa)

1. **Duyệt bộ v2 làm nguồn duy nhất để vẽ** từ đề bài khung chung trở đi, gồm các MỚI (19 token, 2 biểu tượng) và ĐỔI ở mục 2. *Khuyến nghị: duyệt.* Chưa có chữ "duyệt" thì chưa viết đề bài khung chung.
2. **Phím tắt máy tính** `/` vào ô tìm, `Esc` đóng bảng trượt, `N` tạo mới: giữ trong bộ, thi công sau đợt 0? **Hai tờ khuyến nghị khác nhau:** tờ tóm tắt của phiên dựng bộ khuyến nghị *giữ cả ba*; tờ này đề nghị *giữ `/` và `Esc`, để `N` sau*, vì phím một chữ không kèm phím bổ trợ dễ bấm nhầm khi đang gõ, và bỏ `N` chỉ là xoá một dòng ở sổ tay. Chủ chọn một trong hai.
3. **Đường cong chuyển động:** giữ đường cong đã có trong mã thay vì thêm đường cong mới như đề cương? *Khuyến nghị: giữ* (một đường cong cho mọi thứ, mắt thường không phân biệt).

## 4. Ba điểm lệch cần chủ chốt (mỗi điểm có đề xuất; không trả lời thì làm theo đề xuất)

| # | Điểm | Đề xuất | Nếu theo đề xuất thì mất gì |
|---|---|---|---|
| E1 | Màu san hô: bộ cho nút tròn "+ Tạo đơn" ở **thanh tab** (như mã hiện nay) và nhãn giá "Khác giá danh mục"; đề cương ghi "thanh trên" | Theo mã: giữ nút + ở thanh tab, sửa chữ đề cương; nhãn giá tông san hô nhạt chấp nhận vì không phải hành động | San hô mang hai nghĩa (hành động chốt và nhãn giá khác danh mục); mắt phải phân biệt bằng hình dạng (nút đặc với huy hiệu nhạt) |
| E2 | Biểu tượng năm tông: Biển dùng mũi tên vòng (`history`), Đỏ chấm than tròn (`alertCircle`, mới vẽ), Xám gạch ngang (`minus`, mới vẽ) | Theo bộ | Đợt 0 phải vẽ thêm hai hình vào `web/icons.ts` (việc nhỏ, có kiểm) |
| E3 | Khổ 641–899 (iPad dọc): thanh bên thu gọn 56 px chỉ còn biểu tượng | Giữ; nhìn thật ở đề bài khung chung với khổ 768 trước khi thi công | Thêm một trạng thái bố cục phải thi công và kiểm riêng ở khổ 768 |

## 5. Gộp gì từ Claude Design vào bộ v2

_(Điền 28/10, sau khi bản xuất Claude Design về máy lúc 09:08.)_ Bảng đầy đủ: `GOP-CLAUDE-DESIGN-VAO-BO-V2-2026-10-28.md`; bản xuất ở `docs/evidence/2026-10-28-claude-design-bo-v2/`. Tóm tắt:

- Claude Design dựng đủ bộ (219 token, 27 thành phần, 38 hình), đọc đúng mã: giữ 85/88 giá trị chép từ mã; ba giá trị nó bỏ (vành mờ ô gõ, bóng thẻ khi rê, bóng nút chính) **giữ theo mã**. Kết luận không đổi: **một bộ duy nhất** trên Claude; mã React của Design **không** mang vào bộ hay mã.
- 27 thành phần: **lấy diện mạo Design 4** (ô tích/ô chọn một/công tắc; hộp xác nhận một chiều; báo xong nền tối; trạng thái rỗng) · **giữ theo mã 17** · **mới, bộ chưa có 6** (đầu trang tách khỏi thanh trên, thanh trên, thanh tab dưới, thanh bên, trang mất mạng, trang 403/404 — đánh dấu "từ Claude Design, 7b có thể sửa").
- Hai chỗ để dành: **đệm và bố cục bên trong** lấy gói 10 giá trị đệm của Design (nút, ô, chip, tab, huy hiệu, thẻ, lề trang, nhịp khối) + ô nhiều dòng 96; **báo xong ngắn** lấy nền tối, ghi là ĐỔI so với mã.
- Không lấy: tên token tiếng Việt, chip thấp 36, kiểu tab "rãnh", số trang 1…n, nút phẳng, bỏ in hoa (để 7b), mốc 768 (giữ 640), ba hình tông khác. Một lỗi thật tìm ra theo mã: viền vòng chọn một chỉ ≈ 1,25:1 (B-VIEN-O-CHON-TUONG-PHAN), sửa ở đợt 0.

_(Đoạn dưới đã hết nghĩa vì bản xuất về trước khi chủ duyệt; giữ để truy vết.)_ Nếu tới lúc duyệt mà tấm vẽ chưa có, **chủ chọn một trong hai đường**: **(a) duyệt ngay với bộ hiện tại**, bảng gộp làm thành tờ bổ sung sau — *khuyến nghị*, vì đề bài khung chung chỉ cần bảng token và danh sách thành phần, diện mạo gộp sau không làm đề bài đó phải viết lại; **(b) chờ tấm vẽ rồi duyệt một lần** — chắc hơn nhưng Chặng 2 đứng chờ Claude Design.

## 6. Sau cổng 2a

- Đề bài số 1 "Khung chung" cho Claude Design (7b) → cổng 2b → đặc tả và kế hoạch đợt 0.
- ADR-0143 khung tải (tách gói chung, nạp sẵn theo vai, đo trước/sau) đã soạn ở trạng thái đề xuất trên nhánh `chang-2-ds-v2`: chủ duyệt **riêng**, không gộp vào cổng này; chưa thi công.
- **Việc chính chủ phải tự làm về mã sau chữ "duyệt"** (phiên không tự làm được vì luật dự án): gộp hai nhánh lên bản chính và GitHub bằng `npm run day-len -- <tên nhánh>` theo thứ tự `chang-2-ds-v2` trước, rồi `worktree-danh-gia-ux-tong-the-v2` (nhánh này sẽ nhập bản chính mới trước khi chủ gộp); Main session nhắc đúng lúc và đưa nguyên lệnh. Không cần triển khai (chỉ tài liệu). Hai worktree đánh giá cũ chờ chủ cho dọn.
