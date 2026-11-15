# ADR-0194 — Bảng điều khiển giao diện của Toàn quyền: quyết định trường nào hiện, ẩn, bắt buộc; nhãn, chữ gợi ý, bố cục, màu

- **Trạng thái:** **accepted** 2026-11-09 (bản 2, sau kiểm độc lập lần 1) — chủ dự án trong chat, nguyên văn: *«Duyệt, mở đợt 1»* (nút trả lời câu «Bạn duyệt ADR-0194 bản 2 và mở đợt 1 chứ?»). Duyệt hướng chung, ba câu ở mục «Ba điều chủ quyết» theo khuyến nghị, và CHỈ mở thi công đợt 1; đợt 2–4 cần lượt duyệt riêng. AI soạn, không tự duyệt. Ý chủ trong chat 9/11: chỉ Toàn quyền chỉnh; áp cho mọi loại tài khoản và mọi màn hình; quyết định hiển thị dữ liệu gì, nhãn, chữ gợi ý, bố cục, màu — «với sự chặt chẽ, chính xác ở tất cả các màn hình».
- **Loại:** việc lớn (dữ liệu, quyền, giao diện khung). **Cửa:** hai chiều. Mở rộng ADR-0154 Đ2 và gom ADR-0193 (cùng loại việc).

## Ba ranh giới (AI nói một lần, chủ quyết)
1. **Chính sách giao diện chỉ NỚI hoặc THU phần hiển thị, không nới luật nền.** Quyền xem dữ liệu vẫn do `permissions.ts`; ràng buộc CSDL (trigger, CHECK), cổng xuất bến, tiền (`buildLines`) không đổi. «Bỏ bắt buộc» chỉ áp cho trường mà luật nền KHÔNG cần. Trường ẩn: máy chủ bỏ dữ liệu gửi lên (như ADR-0154 Đ2.3); trường bắt buộc: máy chủ tự kiểm khi nhận.
2. **Danh sách cho phép, không phải danh sách cấm (hợp đồng hiển thị).** Chỉ trường được khai trong danh mục kèm cờ «ẩn được» / «bỏ bắt buộc được» mới chỉnh được; mặc định KHÔNG cho. Bài kiểm ép: (a) mọi trường trong danh mục có thật trong `contracts.ts`; (b) mọi trường nhập mà máy chủ bắt buộc phải có mặt trong danh mục với cờ «không được ẩn».
3. **Nhãn, màu không tự do hoàn toàn** (5.27, ADR-0167, token CSS): chọn trong khuôn có sẵn; nhãn ghi đè không được lộ mã thô hay chữ Anh.

## Đề xuất — bốn đợt, mỗi đợt một lượt duyệt riêng
- **Đợt 1 — Hiện / ẩn / bắt buộc.** Danh mục khai trong mã (màn, mã trường, hai cờ). Bảng chỉ-thêm `ui_field_policy` theo khuôn `ord_confirm_policy`, khoá **màn × trường × mã quyền**; bảng rỗng = giữ nguyên hành vi hiện tại. Ghi chỉ ô `settings.ops` (Toàn quyền). Nhật ký chỉ ghi mã màn, mã trường, cờ — không ghi giá trị. Giao diện đọc chung một hàm; `GET` cấu hình trả `no-store`; lỗi tải cấu hình thì rơi về **mặc định đầy đủ** (không ẩn hết). **Tài khoản nhiều quyền (hợp của mọi ô, 5.28):** trường chỉ bị ẩn khi MỌI quyền của người đó đều ẩn nó; chỉ được bỏ bắt buộc khi mọi quyền đều bỏ. Trang chỉnh: mục mới trong khu «Thiết lập» của Toàn quyền, có «Khôi phục mặc định» từng màn và xem trước bằng «Xem như vai trò khác» (ADR-0180) trước khi lưu. Giới hạn đợt 1 ở bốn màn: Tạo đơn, Danh sách dịch vụ, Danh sách tài khoản, Quản lý đối tác. Việc chuyển công tắc ADR-0154 và ADR-0193 vào bảng mới làm ở **phát hành sau** (expand–contract); trong lúc chuyển, chỉ một nơi quyết mỗi trường.
- **Đợt 2 — Nhãn và chữ gợi ý:** bảng ghi đè gắn khái niệm trong `docs/BANG-THAM-CHIEU.md`; phải sửa ADR-0167 / 5.27 và các bài canh nhãn (`bang-tham-chieu.test.ts`, `tu-khai-khong-len-nhan.test.ts`) qua điều sửa đổi, chủ duyệt riêng.
- **Đợt 3 — Bố cục:** thứ tự, nhóm trường trong khối có sẵn; cập nhật kịch bản Chrome / e2e theo thứ tự ô.
- **Đợt 4 — Màu:** chọn chủ đề (đổi `data-theme`) trong token đã kiểm tương phản; không giá trị CSS lẻ (`token-giao-dien.test.ts` và các bài cùng loại).

## Danh mục «không được ẩn / không được bỏ bắt buộc» (khởi đầu, soát đủ trước khi thi công đợt 1)
Tiền và giá do `buildLines`; nơi trả, tên khách khi xuất bến, mốc giờ hẹn suất, giờ đón (ADR-0193 đang tranh điều này); giấy tờ xe và tài xế, lý do sửa giấy tờ; số căn cước / bằng lái (chính sách «hiện» không mở thêm chỗ lộ số); người lập, người phụ trách, dấu người thứ hai soát tiền (ADR-0187 Đ3); ô chặn trùng khách; mã định danh (5.26) và mọi trường chỉ máy chủ ghi.

## Ba điều chủ quyết khi duyệt (khuyến nghị đứng đầu)
1. Duyệt chia đợt, **chỉ mở thi công đợt 1** (bốn màn trên).
2. Gộp ADR-0193 vào bảng mới theo cách «chuyển ở phát hành sau» (thay vì để hai nơi quyết giờ đón).
3. Đợt 2 (đổi nhãn) cần ADR sửa riêng cho ADR-0167 / 5.27 trước khi làm.

## Trang ghép (CLAUDE.md §9)
Bảng mới chứa: dòng chính sách theo màn × trường × mã quyền (không chứa dữ liệu khách). Chạm: bản đồ quyền (một ô ghi `settings.ops`; đọc ai cũng được phần của mình), giao diện ẩn/hiện, máy chủ bỏ dữ liệu trường ẩn. Rủi ro đã biết: ẩn nhầm làm không lập được đơn → whitelist + khôi phục mặc định + xem trước.

## Kiểm
Người kiểm độc lập lần 1 (9/11): 3 mục chặn (ADR-0193, whitelist, tài khoản nhiều quyền) và 8 mục nên sửa đã đưa vào bản này; cần kiểm lần 2 sau khi chủ duyệt hướng. Hàng rào mới ghi `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
