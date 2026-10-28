# Quyết định của chủ dự án tại cổng 2b — duyệt bản vẽ khung chung (28/10/2026, chiều)

Hồ sơ có ngày. Ghi câu trả lời của chủ dự án cho tờ `TO-CONG-2B-2026-10-28.md` (trang duyệt lời thường <https://claude.ai/artifact/Ray4S6cV8aT32rZEGo7Cdx>, ba câu có đề xuất sẵn và ảnh so sánh cắt từ bản vẽ). Đối chiếu trước cổng: `DOI-CHIEU-KHUNG-CHUNG-2026-10-28.md` (25 đạt / 3 lệch / 0 thiếu). Bản vẽ: Claude Design <https://claude.ai/design/p/0878b4cd-ee41-4598-9aa4-13021df2dd1c>, bản xuất chép ở `docs/evidence/2026-10-28-claude-design-khung-chung/`.

**Câu trả lời nguyên văn của chủ** (Main session nhận chiều 28/10/2026): "**ok duyệt, nhưng cho tôi xem bản trên local trước khi deploy lên production nhé, vì cần 1 đánh giá chuẩn mực và đầy đủ giữa bản hiện tại và bản mới**". Chủ không ghi điểm sửa nào cho bản vẽ; theo quy ước của tờ, một chữ "duyệt" là theo cả ba đề xuất.

## A. Ba quyết định (tờ mục 2)

| # | Câu | Chủ chọn | Thi hành |
|---|---|---|---|
| 1 | Khổ 641–899 (iPad dọc): A thanh bên thu gọn 56 chỉ biểu tượng (K2·A) hay B giữ thanh tab dưới như điện thoại (K2·B) | **B** (theo đề xuất) | Bố cục điện thoại dùng tới 899; thanh bên chỉ từ 900. Không thi công thanh bên gọn; token `--w-sidebar-gon` trong bộ v2 bản 8 giữ lại nhưng ghi "chưa dùng" (bộ sửa ở 7c). Điểm E3 của cổng 2a khép lại: đã nhìn thật, chọn B. Hộp thoại giữa màn vẫn từ 641 (mục C). |
| 2 | Tiêu đề trang ở máy tính: A trên thanh trên (18) hay B tách dòng riêng (24, K3·11) | **A** (theo đề xuất) | Mọi trang máy tính: tiêu đề 18/600 trên thanh trên, cắt một dòng bằng "…"; không dựng biến thể B. Thành phần "đầu trang tách khỏi thanh trên" trong bộ v2 ghi "không dùng" (7c). |
| 3 | Duyệt bản vẽ làm khung chung cho mọi màn hình | **Duyệt** — **cổng 2b QUA** | Khung chung (K1–K6, T1–T5, token) là đầu vào của đặc tả đợt 0 và nền cho năm đề bài họ màn (Chặng 3). Thứ tự ưu tiên khi lệch giữ như Bàn giao của đề bài: quyết định mục 5 thắng bản vẽ; token thật trong bộ v2 thắng số trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất. |

## B. Điều kiện chủ thêm tại cổng này — "cổng phát hành đợt 0" (mới, ràng buộc cho đợt 0 và mọi đợt sau của chương trình)

Chủ yêu cầu **xem bản mới chạy trên máy (local) trước khi đưa lên production**, kèm **một bản đánh giá chuẩn mực và đầy đủ giữa bản hiện tại và bản mới**. Main session ghi thành cổng riêng, đặt sau kiểm độc lập (QA2) và trước lệnh phát hành:

1. **Bản chạy trên máy:** đợt 0 kết thúc bằng bản dựng chạy local với dữ liệu tạm (`node scripts/dev-iphone.mjs`, theo quyết định 2 cổng 1: không chạm production), chủ tự mở ở điện thoại (390) và máy tính (1040) với ít nhất ba bộ quyền (Toàn quyền, Bán hàng, Tài xế); phiên thi công đưa đường dẫn và tài khoản tạm. Chủ có thể yêu cầu sửa trước khi qua cổng.
2. **Đánh giá chuẩn mực và đầy đủ = đo lại đúng bộ đo của Chặng 1** trên bản mới rồi đặt cạnh số đo của bản hiện tại: cùng 11 mặt chấm (kể cả ngân sách tốc độ: mở trang ≤ 1 s 4G, chuyển trang ≤ 300 ms, chạm ≤ 100 ms), cùng 10 bộ quyền, cùng các trang đại diện, ảnh cặp trước/sau ở 390 và 1040 (bản hiện tại lấy từ `docs/evidence/2026-10-27-danh-gia-ux-tong-the/`, không chụp lại production). Kết quả là **một tờ so sánh có ngày** (bảng từng mặt, từng bộ quyền; chỗ tốt lên, chỗ chưa đổi, chỗ xấu đi) do phiên kiểm độc lập lập, Main session đọc duyệt trước khi đưa chủ bằng lời thường (≤ 3 câu hỏi).
3. **Thứ tự phát hành:** thi công trên nhánh → kiểm độc lập (QA2) → bản local + tờ so sánh → **chủ duyệt cổng phát hành** → chủ gộp bằng `npm run day-len -- <nhánh>` → chủ phát hành bằng `npm run trien-khai` (kho này không tự phát hành khi gộp main; `trien-khai` là lệnh riêng của chủ). Chưa qua cổng thì không gộp mã đợt 0 vào main, để main luôn ở trạng thái phát hành được.
4. Áp cho **mọi đợt** thi công của chương trình thiết kế lại (đợt 0 và các đợt của Chặng 3), không chỉ đợt 0.

## C. Ba điểm lệch của bản vẽ — xử lý ở đặc tả, như tờ mục 4

- Hộp thoại giữa màn từ **641** (mốc điện thoại 640 đã chốt), không phải 768 như bản vẽ; bảng trượt từ đáy ở ≤ 640.
- Cột phải khuôn Chi tiết ở máy tính **dính khi cuộn**.
- Huy hiệu trạng thái ở điện thoại nằm trong thẻ tóm tắt đầu thân (theo bản vẽ); máy tính giữ cạnh mã đơn trên thanh. Chủ không phản đối.

## D. Điểm Main session tự quyết (tờ mục 5) — chủ không phản đối, đảo được

Lớp phủ bảo trì có "Thử lại"; biểu mẫu máy tính có "Huỷ bỏ" + "Lưu chuyến" ở góc phải thanh trên; thanh bên ở khổ cao 800 thêm mờ mép hoặc nhịp dòng gọn hơn; màn Đăng nhập dùng `APP_NAME` ("Island Booking System"), thông tin công ty giữ; 9 token MỚI đổi tên theo quy ước mã khi viết đặc tả; "Email", "Wi-Fi", "4G", "PIN", "Google Sheet" giữ.

## E. Hệ quả và việc kế

- **Cổng 2b đã qua.** Hồ sơ cổng (đối chiếu, tờ, biên bản này, bằng chứng) nằm trên nhánh `cong-2b-khung-chung`; chủ gộp bằng `npm run day-len -- cong-2b-khung-chung` (chỉ tài liệu, không phát hành).
- **Đặc tả đợt 0** (Main session soạn, tách nhánh từ main sau khi gộp): đưa khung chung vào mã theo Bàn giao của đề bài — thanh trên một kiểu (logo / quay lại / đường dẫn một cấp; ô Tìm đơn 4 bộ; nút chính; chuông; Trợ lý lên thanh trên); thanh tab theo bộ quyền 4–5 mục + trang mục lục Thiết lập (đường dẫn mới: `PAGES`, `sw-policy.ts`, `muc-giao-dien.ts` `THANH_TAB`); thanh bên 5 nhóm, "Đề nghị chuyển khách" vào nhóm Điều phối (`THANH_BEN`), bỏ "Tạo đơn" khỏi thanh bên, phần giữa cuộn, chân menu dính; chân dính thay thanh tab ở trang con (`shell.ts`); dải trên trang một dòng, nhớ theo phiên; lớp phủ bảo trì; trạng thái hệ thống (mất mạng hai trường hợp, 403, 404, thiếu mã, khung xương, rỗng, lỗi máy chủ — câu lỗi chủ duyệt danh sách trước, câu 9 cổng 1; 404 Worker chỉ bản thử, câu 10); bảng trượt / hộp thoại / hộp xác nhận / thông báo ngắn một khuôn; năm tông kèm `alertCircle`, `minus` vào `web/icons.ts`; token MỚI và ba lệch mục C; viền ô chọn (B-VIEN-O-CHON-TUONG-PHAN); lối "Bỏ qua tới nội dung chính" và `aria-current`; phím `/`, `Esc`. Đặc tả nêu riêng phần ngoài bề mặt và phần chạm API; qua QA1 rồi mới lập kế hoạch và thi công.
- **Cổng phát hành đợt 0** theo mục B: tờ so sánh trước/sau theo bộ đo Chặng 1 + bản local cho chủ xem.
- **Chặng 3** (năm đề bài họ màn) soạn trên khung đã duyệt, có thể song song với đặc tả đợt 0; mỗi đợt thi công của Chặng 3 cũng qua cổng phát hành như mục B.
- **7c** đồng bộ bộ v2 từ mã sau đợt 0 (ghi "chưa dùng" cho thanh bên gọn và đầu trang tách). **ADR-0143** (khung tải) vẫn chờ chủ duyệt riêng, chưa thi công.
