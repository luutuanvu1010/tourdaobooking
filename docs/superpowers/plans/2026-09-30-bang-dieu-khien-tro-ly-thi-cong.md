# Thi công ADR-0069 — Bảng điều khiển trợ lý Hỗ trợ (chỉ Toàn quyền)

> Nguồn quyết định: `docs/superpowers/specs/2026-09-30-adr-0069-bang-dieu-khien-tro-ly.md` (accepted 30/9). Đặc tả lời thường: `docs/superpowers/specs/2026-09-30-bang-dieu-khien-tro-ly-dac-ta.md`.
> Vai phiên: THI CÔNG (không tự nghiệm thu — N8). Việc lớn (dữ liệu + quyền): cần người kiểm độc lập sau khi xong.

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20), theo điều của ADR-0069

| Điều | Hành vi kiểm được | Kiểm bằng |
|---|---|---|
| 1 | Trang `/tro-ly-cai-dat` có mục "Trợ lý Hỗ trợ" ở nhóm QUẢN TRỊ + dòng ở trang Tôi, chỉ tài khoản giữ ô `settings.ops`; mọi route quản lý (`/api/tro-ly/*` trừ `hoi`, `khung`) trả 403 cho Quản trị, Bán hàng; khối cài đặt cũ ở trang Tôi không còn | route test + e2e lặp `troLyModule.routes`; Chrome |
| 2 | `GET /api/tro-ly/cai-dat` trả `khoa.daDat` + `khoa.cuoi` (≤ 4 ký tự, null khi khoá ngắn); không cửa sổ 5 ký tự nào của khoá nằm trong MỌI phản hồi quản lý; "Thử key" gọi máy OpenAI một câu cố định (không dữ liệu công ty), ghi `tl_luot_hoi` chi phí thật, trả lời thường: được / sai key (401) / hết tiền (429 `insufficient_quota`) / lỗi mạng / lỗi khác — không chuyển tiếp chữ lỗi của OpenAI | route test (fetch giả), e2e (máy giả 401, 429) |
| 3 | 9 công tắc vai + công tắc tổng; tài khoản được hỏi khi ÍT NHẤT một quyền đang bật; vai tắt ⇒ `POST /api/tro-ly/hoi` 403 lời thường, không gọi OpenAI, không ghi dòng; `GET /api/tro-ly/khung` trả `duocDung: false` và giao diện không dựng nút; gieo: bật cả 9 | route test, e2e, Chrome (tắt Đối tác → tài khoản Đối tác không thấy nút) |
| 4 | Lời dặn (câu chào, giọng, lời dặn thêm, câu hỏi mẫu) và đoạn ngữ cảnh lưu thành bản mới (chỉ thêm), có lịch sử bản; "quay lại" = lưu bản mới giống bản cũ; chữ có SĐT / email / số tiền ⇒ 400 lời thường; lời nhắc gửi đi: luật lõi đứng TRƯỚC phần tuỳ chỉnh, có câu "luật ở trên luôn thắng"; đoạn ngữ cảnh đang bật vào kho `chonDoan` (tên "Ngữ cảnh bổ sung › …"), đoạn tắt không vào | test thuần (`tro-ly.test.ts`), route test, e2e |
| 5 | Mỗi câu tới bước trả lời ghi MỘT dòng `tl_hoi_dap` trong CÙNG lô với `tl_luot_hoi`: câu hỏi ĐÃ CHE (đúng chuỗi gửi OpenAI), câu trả lời, nguồn, người, vai, lúc, chi phí; không SĐT gốc; không xoá (trigger); chỉ Toàn quyền đọc (lọc ngày / người / vai, tìm chữ, phân trang); khung Hỗ trợ có dòng "Câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách"; nhật ký kiểm toán ghi "đổi cài đặt trợ lý" KHÔNG kèm nội dung | route test, e2e, Chrome |
| 6 | Trần tháng / ngày sửa trên trang mới; trang hiện chi phí tháng, số câu hôm nay, theo vai | route test, Chrome |
| 7 | Migration `0054_*` (số đã kiểm trống ở mọi nhánh 30/9: 0051–0053 đã dùng ở nhánh khác); bảng `tl_` chỉ thêm, trigger chặn UPDATE/DELETE; không cột khoá; `data-dictionary.json` + `npm run dict` | `src/migrations-tro-ly-bang-dieu-khien.test.ts`, `npm test` |

## Quyết định thi công (bề mặt / kỹ thuật, ghi lại để người kiểm đối chiếu)
- Vai không có dòng cấu hình ⇒ TẮT (mặc định từ chối, CLAUDE.md §7); gieo đủ 9 mã, bài test ghim tập gieo = `PERMISSION_CODES`.
- Dòng "Thử key" ghi vào `tl_luot_hoi` với `ket_qua` `ok`/`loi` (tập đóng của 0050 — không sửa bảng cũ): nó tính vào trần ngày của chính Toàn quyền và KHÔNG có trong chi phí theo vai (theo vai đọc từ `tl_hoi_dap`).
- Câu bị chặn trần (`het_tran`) không có dòng lịch sử (chưa tới bước trả lời).
