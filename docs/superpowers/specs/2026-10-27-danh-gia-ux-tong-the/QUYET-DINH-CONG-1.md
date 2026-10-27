# Quyết định của chủ dự án tại cổng 1 — đánh giá UX tổng thể (27/10/2026, tối)

Hồ sơ có ngày. Ghi lại câu trả lời của chủ dự án cho ba quyết định ở `BAO-CAO.md` và các câu hỏi gom ở `LO-TRINH.md` mục 5. Cách hỏi: trong phiên, từng câu qua hộp chọn, phương án khuyến nghị đứng đầu; chủ trả lời trực tiếp (không câu nào hết giờ). Trước khi hỏi, một trợ lý chỉ đọc đã soạn tờ tóm tắt từng quyết định (được gì, mất gì, chạm gì, đảo được không) và phiên viết đề bài (`ux-ui-saas-erp-review`) đã kiểm độc lập bộ hồ sơ: ĐẠT, kèm lưu ý câu 9, 10, 12 không được có mặc định.

## A. Ba quyết định (BAO-CAO.md)

| # | Quyết định | Chủ chọn | Ghi chú thi hành |
|---|---|---|---|
| 1 | Duyệt đề cương `HE-THONG-HOP-NHAT.md` để dựng Design System v2 ở Chặng 2 | **Duyệt cả gói** | Chủ không ghi điểm giữ lại. Các điểm đề cương lật lại (nhãn nổi Tạo đơn, nút đỏ đặc, mốc riêng Trang chủ, một thanh trên) coi như đã được chủ đồng ý đổi. |
| 2 | Độ đậm chữ mặc định | **Mở ba mức 400 / 500 / 600** (nội dung / nhãn, nút / tiêu đề, số lớn) | Đổi bằng token trong tệp chữ chung, không chạm mã trang. Ba núm "Độ đậm …" ở Giao diện công ty (`src/shared/giao-dien.ts`) giữ nguyên để chủ tinh chỉnh. Sửa lại dòng ở PHU-LUC H-DO-DAM: "chữ mảnh" chốt ở bản 1.65 (2/10), không phải 1.70. |
| 3 | Khung tải: đợt thi công đầu sửa đóng gói và tải sẵn qua một ADR nhỏ sửa ADR-0035, đo trước/sau | **Đồng ý cả gói, đo trước/sau** | **Chỉ là cho phép SOẠN ADR và đo**, chưa phải cho phép thi công; thi công sau khi chủ duyệt ADR đó. Gộp lời gọi dữ liệu (chạm API) KHÔNG nằm trong quyết định này. Chủ đã nghe điểm "nạp sẵn theo vai" đổi hành vi khi mất mạng (trang chưa nạp hiện trang ngoài mạng thay vì bản cũ) và vẫn chọn cả gói; ADR phải nêu rõ điểm này. |

## B. Câu hỏi gom (LO-TRINH.md mục 5) và hai câu phụ

| # | Câu | Chủ chọn |
|---|---|---|
| 4 | Nút nổi "Trợ lý" (H-FAB) | Chuyển lên thanh trên |
| 5 | Nhãn nổi ở Tạo đơn (H-O-NHAP) | Đổi về nhãn nằm trên ô, ở đợt Biểu mẫu |
| 6 | Cách đếm "thanh bên trần 10 mục" | Đếm nhóm gập là một; trần áp cho mục hiện sẵn (Toàn quyền hiện 14, Chặng 2 vẫn phải gộp thêm) |
| 7 | Tiền ở danh sách điện thoại (H-TIEN-KHO) | Ghi đủ "1.080.000 ₫" ở mọi khổ |
| 8 | Dải nhắc bảo mật hai lớp + thông báo quan trọng (H-DAI-TREN) | Thu gọn một dòng, nhớ "đã đọc" theo phiên; thông báo quan trọng vẫn bắt "Đã hiểu" |
| 9 | Câu lỗi máy chủ nói sai lý do (H-CAU-LOI) | **Chỉ sửa câu cho đúng lý do, giữ nguyên luật; chủ duyệt danh sách câu sẽ đổi TRƯỚC khi làm** (chạm API) |
| 10 | Trang 404 chung cần Worker trả HTML (H-404) | **Chuẩn bị trên bản thử kèm kiểm tự động (địa chỉ lạ và địa chỉ API); lên production chỉ qua lần triển khai chủ duyệt** |
| 11 | Nhật ký thay đổi trên Hướng dẫn (C-HUONG-DAN) | Giữ 5 phiên bản gần nhất, còn lại tách trang riêng |
| 12 | Tổng hoa hồng theo tháng cho Đối tác (B-TONG-HOA-HONG-DOI-TAC, từ tờ bổ sung) | **Chưa thêm; ghi `docs/BACKLOG.md`, chỉ làm khi có ADR riêng** (chạm tiền và quyền) |
| phụ A | Núm "mật độ bảng gọn / thoáng" ở Giao diện công ty (HE-THONG-HOP-NHAT mục 9) | Chưa thêm; dùng một mật độ |
| phụ B | Đổi tên hai bộ thiết kế cũ trên claude.ai thêm "(cũ, không dùng để vẽ)" (LO-TRINH bước 3) | Đồng ý đổi tên |

## C. Hệ quả cho Chặng 2

- Cổng 1 **đã qua**. Chặng 2 (dựng Design System v2 theo `HE-THONG-HOP-NHAT.md`, sáu đề bài họ màn) được mở; bước đầu là bước 2–3 ở `LO-TRINH.md` mục 1.
- Việc cần chủ duyệt thêm trước khi chạm mã: ADR nhỏ sửa ADR-0035 (quyết định 3); danh sách câu lỗi sẽ đổi (câu 9); lần triển khai có cấu hình 404 (câu 10).
- Không thi công gì từ tờ này; mọi đổi mã vẫn theo quy trình đặc tả → kế hoạch → thi công → kiểm độc lập.
