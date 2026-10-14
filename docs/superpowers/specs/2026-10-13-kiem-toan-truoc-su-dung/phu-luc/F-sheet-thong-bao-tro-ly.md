# Phụ lục F — Đồng bộ Google Sheet, nạp nhân viên, thông báo, Trợ lý AI

> Mốc `483b3aa0`. Người kiểm chỉ đọc mã; F-1 và F-2 được chạy bằng hàm thuần (`planSync`, `syncGuard`) từ thư mục tạm; không đụng Google Sheet, Cloudflare, OpenAI hay Web Push thật.

## Phát hiện

| Mã | Mức | Chuyện gì | Tái hiện | Tệp:dòng | Xử lý |
|---|---|---|---|---|---|
| F-1 | Medium (đã chạy) | Một ô giá gõ sai làm dịch vụ biến mất khỏi bán hàng sau tối đa 15 phút, không ai được báo. | Người sửa được Sheet gõ "1.200.000", "1,2tr", "#REF!" hoặc số âm vào ô Giá người lớn của một dòng đang bán. Cron `*/15` chạy; dòng lỗi vào danh sách `problems`, nên `planSync` coi mã đó đã rời Sheet và đặt `in_sheet=0`. `syncGuard` chỉ chặn khi ẩn quá một nửa. Với 5 dịch vụ cũ + 1 dòng lỗi giá: `missing=['T1']`, `guard=null`. Đơn đã xác nhận **không đổi tiền** (chụp đơn giá ở `order_item.unit_price`). Nháp cùng số khách vẫn sửa được; nháp đổi số khách báo "không còn trong danh mục". | `catalog/sheet.ts:73-88`; `catalog/rules.ts:41-44, 63-69`; `catalog/service.ts:34-35`; `service-rules.ts:203-204` | Mã có dòng trong `problems` thì giữ nguyên bản cũ, hoặc coi "có dòng lỗi" là lý do chặn lần đồng bộ. Nhỏ (đỏ trước, xanh sau). |
| F-2 | Low (đã chạy) | Giá 0 được nhận. Đơn mới của Thực tập/Đối tác chỉ được bán đúng giá danh mục, tức 0. | `adult:0` qua `price()`; chỉ `adult.value===null` bị loại. Đồng bộ áp thẳng, không có bước xem trước. | `catalog/sheet.ts:31-36, 74-78` | Giá người lớn ≤ 0 là lỗi dòng; cảnh báo khi giá đổi quá 50%. Nhỏ. |
| F-3 | Low (chỉ đọc) | Chỉ đọc tab đầu của Sheet (`fetchSheetCsv` không truyền `gid`). Thêm/đổi thứ tự tab thì đọc nhầm tab. Thiếu cột thì lỗi và không đổi gì (an toàn); đủ cột nhưng khác nội dung thì chỉ `syncGuard` chặn. | Đọc mã. | `catalog/service.ts:20`; `shared/sheets.ts:17-20` | Ghim `gid` bằng biến cấu hình. Nhỏ. |
| F-4 | Low | Đồng bộ ghi từng lô 40 câu, không nguyên khối; Cron và nút Admin đọc `stored` riêng. Lỗi giữa chừng hoặc hai lượt cùng lúc cho kết quả cũ chép đè một lúc, tự lành ở lượt Cron sau. Mã đã ghi chú. | Đọc mã. | `catalog/repository.ts:101-134`; `service.ts:27-39` | Chấp nhận; ghi lại. |
| F-5 | Low (trong phạm vi đã duyệt) | Trợ lý AI gửi câu hỏi (đã che SĐT, email, số giấy tờ) sang OpenAI và lưu **không hạn** trong `tl_hoi_dap` (chỉ-thêm, không cách xoá). Tên khách **không** bị che ("Nguyen Van An sinh 1980" lọt); mỗi câu kèm tên gọi (không họ) người hỏi. ADR-0084 Đ4 đã duyệt. | Bài `che.mts` trong thư mục tạm: các biến thể "0901 234 567", "+84…", "090.123.4567", "CCCD 079…" đều che. | `shared/tro-ly.ts:56-74`; `tro-ly/goi-mau.ts:15-40`; `migrations/0050_tro_ly.sql` | Chủ quyết hạn lưu và có che thêm tên không. |
| F-6 | Low (tài liệu) | `docs/BACKLOG.md` mục 10 vẫn mô tả "đồng bộ nhân viên từ Sheet" như còn chạy; đã gỡ từ ADR-0071 đ2 (bản 1.52). `CHANGE-GUIDE.md:397`, `SYSTEM-DESIGN.md:595` ghi đúng. | — | `docs/BACKLOG.md:85-90` | Sửa BACKLOG. |

## Điều nghi ngờ

Ai có quyền sửa Sheet danh mục: kho không cho biết (nằm bên Google). Nếu người ngoài sửa được thì F-1/F-2 thành đường phá hoại có chủ ý. Cần chủ trả lời (README bước 6).

## Đã kiểm, sạch

- **Nạp nhân viên**: không còn từ Sheet (route `/api/staff/sheet*` đã gỡ). `POST /api/staff` kiểm cấp quyền cao (`highPermissionProblem`, `roleAssignmentProblem`); `normalizePhone` + `findStaffByPhone` + UNIQUE CSDL chống trùng; PIN sinh bằng `crypto.getRandomValues`.
- **Web Push**: thân rỗng, câu hiển thị do `/api/thong-bao/moi-nhat` dựng; không có tên khách, SĐT hay tiền (chỉ mã chuyến, mã đơn, tên nhân viên làm). Chỉ gửi cho tài khoản `active`. Địa chỉ nhận qua `kiemDiaChi` (chỉ Apple, FCM, Mozilla, Windows; chặn SSRF). Máy đổi người thì `THU_HOI_MAY_NGUOI_KHAC`. Khoá bí mật VAPID chỉ qua `wrangler secret`; lệch cặp khoá thì tự tắt. 410 được dọn (404 chưa — Low). Tin thủ công là chữ Quản trị tự gõ, dựa vào kỷ luật.
- **Đích mạng ra ngoài** (`fetch(` trong `src/`): Google Sheet CSV (hạn giờ 8 giây, `sheets.ts:21`); Cloudflare Turnstile siteverify (5 giây, `turnstile.ts:12`; đóng khi lỗi, 503 khi Cloudflare không trả lời); OpenAI Responses (20 giây, `tro-ly.ts:22`); OpenAI Embeddings (8 giây, `tro-ly-van-nghia.ts:18`); dịch vụ Web Push (10 giây mỗi địa chỉ); Email Service Cloudflare (binding `EMAIL`, thông báo Góp ý). Không có đích QR/ngân hàng. Không đích nào thiếu hạn giờ.
- **HC-5.11**: còn hở (xem phụ lục D — hai chỗ gọi).
- **Chưa kiểm**: hành vi mạng thật; quyền sửa Sheet; bảng `tien-xe-*` chỉ liếc thứ tự lô, không rà số tiền.
