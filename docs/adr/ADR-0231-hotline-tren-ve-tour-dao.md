# ADR-0231 — Hotline trên vé Tour Đảo theo dịch vụ, sửa được cho từng lô

- **Trạng thái:** proposed 2026-11-21 — chờ chủ dự án duyệt (gửi qua phiên điều phối kế hoạch 16 việc).
- **Ngày:** 2026-11-21.
- **Nguồn:** Việc 12 của kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` (nhánh `claude/partner-features-detailed-plan-f32f89`), mục 5 và phụ lục; mục 8 «Điều AI tự quyết» (số dịch vụ THAY hotline công ty; không tạo lại vé cũ).
- **Loại:** vừa (một bảng chỉ thêm nhỏ, một cột cho phép NULL ở lô vé ⇒ migration `0185`). **Cửa:** hai chiều với hành vi (để trống số là về như cũ); một chiều mềm với dữ liệu (bảng chỉ thêm và cột bản chụp ở lại).
- **Quan hệ với ADR cũ:** **sửa** ADR-0175 Đ1 mục 7 (nội dung vé): số in ở chân vé nay là «Hotline trên vé» của lô thay vì luôn là Hotline công ty chủ. **Giữ** ADR-0175 Đ1 mục 2 (ô theo từng dịch vụ, dùng chung ô quyền `catalog.ticket_flag.write` của ADR-0174 Đ4), Đ1 mục 3 (ô `ve.phat-hanh` tạo lô), ADR-0217 (số sê-ri), ADR-0024 6.4 (hotline công ty vẫn đọc qua `ownerCompany`, dùng khi dịch vụ chưa có số).
- **Xây trên lỗ đang hở:** HC-5.19 (có migration mới; tiền lệ ADR-0193, ADR-0221).

## Bối cảnh
Vé Tour Đảo là ảnh vẽ ở trình duyệt lúc tạo lô; chân vé in «Hotline <số công ty chủ>». Số nằm cứng trong ảnh, không lưu ở đâu. Chủ muốn mỗi dịch vụ có số hỗ trợ riêng (người lo dịch vụ đó), vì khách gọi số chung thì văn phòng phải chuyển máy. Số hỗ trợ có thể là tổng đài 1900/1800 hay số bàn, nên luật số điện thoại đăng nhập (`normalizePhone`, chỉ di động) không dùng được.

## Quyết định
1. **Đ1 — Ô «Hotline trên vé» theo từng dịch vụ.** Bảng chỉ thêm `ctl_service_support_phone` theo khuôn `ctl_service_ticket_source` (0151): dòng hiệu lực = `valid_from_at` lớn nhất; `phone` NULL = đã xoá số. Không có dòng hoặc NULL thì vé in hotline công ty như cũ. Không có ô theo nhóm. Ô hiện ở màn Dịch vụ & giá, dưới «Vé do ai phát», **chỉ khi** dịch vụ đang «Vé Tour Đảo». Ghi: ô `catalog.ticket_flag.write` (Quản trị, Toàn quyền), chặn Đối tác. Đọc: thêm người giữ `ve.phat-hanh` (để form Tạo vé điền sẵn), vẫn chặn Đối tác. Không thêm ô quyền.
2. **Đ2 — Luật kiểm số riêng** (`src/shared/so-ho-tro.ts`, dùng chung máy chủ và giao diện): nhận di động `0` + 9 số, số bàn `02` + 9 số, tổng đài `1900`/`1800` + 4 hoặc 6 số; bỏ khoảng trắng, chấm, gạch, ngoặc; `+84` thành `0`. Lưu dạng chuẩn chỉ chữ số; in trên vé có khoảng trắng cho dễ đọc. Câu lỗi không nhắc lại số.
3. **Đ3 — Form Tạo vé.** Ô «Hotline trên vé» điền sẵn số của dịch vụ đang chọn, dịch vụ chưa có số thì hotline công ty; người tạo sửa được cho lô này (không đổi ô của dịch vụ). Số này in **thay** hotline công ty ở chân vé, ở cả «Xem vé mẫu» lẫn vé thật. Nhãn trước số giữ chữ «Hotline» (hằng `NHAN_HOTLINE_VE`) — chờ chủ chọn tên (mục dưới).
4. **Đ4 — Lô chụp số.** `POST /api/ve/lo` nhận `soHoTro` (chỉ lô Tour Đảo; lô hãng ngoài gửi số thì 400); máy chủ kiểm lại bằng luật Đ2 và lưu vào cột mới `vdt_batch.support_phone` (cho phép NULL), khoá sau khi tạo bằng trigger `vdt_batch_support_phone_locked`. Trình duyệt cũ không gửi số thì lô vẫn tạo được, cột NULL. Lô cũ NULL; **vé đã tạo không đổi, không tạo lại.** Máy chủ không tự vẽ lại ảnh: số trong ảnh là số người tạo thấy ở vé mẫu.
5. **Đ5 — Không ghi số vào nhật ký.** Nhật ký `ticket_support_phone_changed` chỉ ghi mã dịch vụ và «đặt hotline riêng» / «dùng hotline công ty»; nhật ký mở lô `ve_nhap_lo` giữ như cũ, không có số.

## Trang ghép
- **Bảng `ctl_service_support_phone` chứa:** một loại thực thể — số hỗ trợ của một dịch vụ danh mục (mã dịch vụ). Không chứa người, không chứa khách.
- **Bảng `vdt_batch` nay chứa thêm:** bản chụp số của lô Tour Đảo (lô hãng ngoài luôn NULL).
- **Dòng bản đồ quyền chạm:** `catalog.ticket_flag.write` (ghi ô; Quản trị, Toàn quyền) — áp cho ô mới như cho «Có vé», «Vé do ai phát». `ve.phat-hanh` (đọc ô; Toàn quyền, Kế toán, Quản lý bán hàng, Quản trị) — chỉ đọc, không ghi ô dịch vụ. Không đổi bản đồ quyền.
- **Cổng nào canh cửa nào:** máy chủ: thân hai route `/api/catalog/so-ho-tro` (hỏi ô + chặn Đối tác); `coQuyenLo` của `POST /api/ve/lo` như cũ. Giao diện: ô ở màn Dịch vụ & giá chỉ dựng khi trang có quyền ô «Có vé» (cùng biến `coQuyen` của `web/catalog-co-ve.ts`) và dịch vụ đang «Vé Tour Đảo»; form Tạo vé đọc lỗi thì coi như chưa có số dịch vụ nào (điền hotline công ty).

## Hệ quả
- Đổi số của dịch vụ không đổi vé đã phát; muốn vé mang số mới thì tạo lô mới.
- Hotline công ty chủ không theo luật Đ2 (dữ liệu cũ tự do): khi điền sẵn mà không chuẩn hoá được thì form giữ nguyên chữ và báo lỗi khi tạo, người tạo sửa lại.
- Thêm hai route (572), một mã nhật ký, một nút «Lưu hotline» (bảng tham chiếu, trạng thái «cho-chon»).

## Điều chủ duyệt khi đọc
1. Duyệt Đ1–Đ5 như trên.
2. **Tên** (Hiến chương 5.27): chữ trước số trên vé và tên ô. Khuyến nghị A: vé giữ «Hotline <số>», ô tên «Hotline trên vé». Phương án B: «Hotline dịch vụ» cho cả hai. Không dùng «Hỗ trợ» vì trùng tên màn Hỗ trợ. **Đã chốt 2026-11-21:** chủ chọn A qua phiên điều phối kế hoạch 16 việc (lời chủ: «còn lại áp dụng như khuyến nghị»). Đ1–Đ5 vẫn chờ chủ duyệt.
