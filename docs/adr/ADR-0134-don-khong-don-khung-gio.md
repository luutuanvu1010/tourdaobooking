# ADR-0134 — Mỗi dịch vụ bắt buộc chọn Đón / Không đón; khung giờ đón trên chặng, giờ đầu khung là giờ hẹn

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-19: *«duyệt lượt 1»* (lượt 1 = ADR này + ADR-0135, trang ghép `docs/superpowers/specs/2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-1.md`). Trước đó cùng ngày chủ đã trả lời hai câu của lượt: *«câu 2- đồng ý»* và chọn *«a»* cho đặt gấp nháp sát giờ (đặc tả `docs/superpowers/specs/2026-10-19-xac-nhan-don-design.md` mục 5e, 5f).
- **Số:** bản đề xuất mang số tạm 0133 (`docs/superpowers/specs/2026-10-19-xac-nhan-don/DE-XUAT-ADR-0134-don-khong-don-khung-gio.md`). Ngay trước khi cấp, số 0133 đã bị nhánh chiết khấu theo loại khách (chưa gộp) giữ, nên đổi sang **0134**. Các mục từ «Bối cảnh» trở xuống giữ nguyên từng chữ của bản chủ duyệt; migration số tạm 0112 cũng đã bị giữ, nay là **0114**.
- **Ngày:** 2026-10-19. Mở Đợt 1 của kế hoạch `docs/superpowers/plans/2026-10-19-xac-nhan-don.md`.
- **Loại:** việc lớn (dữ liệu: hai cột mới + một bảng chính sách; hợp đồng API). **Cửa:** hai chiều về hành vi (ngừng bắt buộc bằng một commit); cột và bảng thêm theo expand, ở lại.
- **Quan hệ với ADR cũ:** **bổ sung** ADR-0047 (thêm cột cho `ord_transfer_leg`, nghĩa `pickup_time` = giờ hẹn giữ nguyên); **bổ sung** ADR-0054 (mẫu chặng theo dịch vụ chỉ còn là lựa chọn gợi ý sẵn); ADR-0049 (mốc tối thiểu, đặt gấp) **không đổi**, chỉ nói rõ mốc tính theo giờ đầu khung. Không đổi ô quyền nào.
- **Xây trên lỗ đang hở:** không (không chạm tiền, sổ, khôi phục — xem trang ghép mục 4).

## Bối cảnh
Chủ dự án 19/10 (đặc tả `2026-10-19-xac-nhan-don-design.md` Phần B, lượt 3): *mỗi dịch vụ bắt buộc chọn "Đón" hoặc "Không đón"; chưa chọn thì không gửi/xác nhận được; mẫu chặng chỉ quyết lựa chọn gợi ý sẵn*; người lập chọn một khung trong danh sách **hoặc "Giờ khác"** để gõ giờ chính xác; khung mặc định 07:30–08:00, 08:00–08:30, 08:30–09:00, 09:00–09:30, 09:30–10:00 (24 giờ), kèm câu *"Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động."* Hôm nay khối đưa đón chỉ tự mở với mẫu một chiều / khứ hồi; dịch vụ khác chỉ có dòng chữ nhỏ "Không đưa đón" (`web/khoi-dua-don.ts:489`), người lập dễ bỏ sót.

## Quyết định
1. **Đ1 — Lựa chọn đón theo dịch vụ.** Cột mới `order_service.pickup_choice` (mã `DON` | `KHONG_DON`, kiểm ở mã, không `CHECK` liệt kê); NULL = chưa chọn hoặc đơn cũ.
2. **Đ2 — Bắt buộc ở cửa xác nhận, không ở lưu nháp.** Cửa "Xác nhận" hiện có (và cửa "Gửi xác nhận" khi ADR-0136 có hiệu lực) trả 409 `pickup_choice_required` ("Dịch vụ thứ {n} chưa chọn Đón hay Không đón.") khi: NULL; hoặc `DON` mà 0 chặng mở; hoặc `KHONG_DON` mà còn chặng mở. Lưu nháp vẫn cho bỏ trống. Đơn đã xác nhận / đã huỷ không bao giờ bị đòi chọn lại (sửa chuyến, huỷ, đổi khách chạy như hôm nay). [người soạn: điểm bắt buộc là lúc xác nhận/gửi]
3. **Đ3 — Khung giờ lưu trên chặng.** Cột mới `ord_transfer_leg.pickup_slot_end` (HH:MM, NULL = "Giờ khác" hoặc chưa chọn). Chọn khung ⇒ `pickup_time` = giờ đầu khung, `pickup_slot_end` = giờ cuối khung; `CHECK pickup_slot_end IS NULL OR (pickup_time IS NOT NULL AND pickup_slot_end > pickup_time)`. Lưu **giá trị chụp**, không lưu mã khung. [người soạn]
4. **Đ4 — Giờ đầu khung là giờ hẹn.** Phân hệ Vận chuyển, mốc tối thiểu, đặt gấp, mốc giờ hẹn bắt buộc của suất khách (`0043`) đều đọc `pickup_time` như hôm nay. Khung là lời hẹn mềm với khách; giờ đón thật do điều phối ghi. [người soạn]
5. **Đ5 — Một bộ khung dùng chung.** Bảng chính sách mới `ord_pickup_slot_policy` (chỉ thêm dòng, trigger chặn UPDATE/DELETE, hiệu lực theo `valid_from_at`): danh sách 1–12 khung HH:MM, `tu < den`, không chồng nhau, sắp tăng + câu lưu ý 1–200 ký tự. Gieo một dòng đúng 5 khung và câu ở Bối cảnh. Một bộ cho mọi dịch vụ. [người soạn]
6. **Đ6 — Ai đọc, ai đổi.** Đọc khung: người qua ô `order.create`. Đổi khung / câu lưu ý: chỉ ô `settings.ops` (hôm nay chỉ Toàn quyền), theo khuôn chính sách nhập tay (chèn dòng, một lô kèm nhật ký `pickup_slot_policy_changed`, va → 409). Không thêm ô mới.
7. **Đ7 — Giao diện gợi ý, không mặc định "Không đón".** Mẫu chặng một chiều / khứ hồi ⇒ "Đón" được chọn sẵn (người lập đổi được); mẫu "không đưa đón" ⇒ **chưa chọn**. Câu lưu ý hiện ngay dưới hàng khung. Client cũ không gửi khoá `pickupChoice` ở mọi dịch vụ ⇒ máy chủ giữ NULL, không lỗi (khuôn `withLegs`). [người soạn]

## Phương án bị bác
- **Mặc định "Không đón" khi không có mẫu chặng:** đúng là chỗ dễ bỏ sót mà chủ muốn sửa.
- **Bắt chọn ngay khi lưu nháp:** chặn nháp dở; chủ chỉ yêu cầu chặn ở gửi/xác nhận.
- **Lưu mã khung (khoá tới bảng khung):** Toàn quyền đổi khung thì đơn cũ đổi nghĩa; lưu giá trị chụp bền hơn.
- **Khung riêng theo từng dịch vụ:** chủ không yêu cầu, thêm một lớp cấu hình; mở sau nếu cần.

## Hệ quả
- Migration mới (số tạm 0114): hai cột + một bảng + hai trigger + dòng gieo; cập nhật `docs/data-dictionary.json`.
- Hợp đồng: `ServiceInput`/`OrderServiceDto.pickupChoice`, `LegInput`/`LegDto.pickupSlotEnd`; route mới `GET/POST /api/cai-dat/khung-gio-don`; hành động nhật ký mới (ẩn với Đối tác).
- Cửa xác nhận `POST /api/orders/:id/status` (`src/modules/orders/index.ts:1386`) thêm một cổng; giao diện `web/khoi-dua-don.ts`, `web/order-form.ts`.

## Điều chưa chắc
- Chặng **chiều về** có dùng khung không: đề xuất cho chọn khung ở mọi chặng, thường sẽ chọn "Giờ khác". [người soạn]
- Khung đầu ngày (07:30) với đơn lập tối hôm trước có thể rơi dưới mốc tối thiểu ngay khi chủ đổi mốc về 30 phút — không đổi luật, chỉ cần báo nhân viên.
- Dịch vụ nhập tay (không mã danh mục): vẫn bắt chọn như dịch vụ danh mục. [người soạn]
