Chip là lựa chọn **bấm được**: lọc nhanh, chọn nhóm dịch vụ, viên ngày; cao `h-control` 44, bo `radius-pill`, chữ 14/500. Khác huy hiệu (không bấm được). Gộp 7 họ chip của mã (H-CHIP).

## Khi nào dùng
- **Chọn một trong một hàng** (`aria-pressed`): hàng nhóm dịch vụ cuộn ngang «Tất cả · Tour · Vé Hòn Tằm…», viên «Hôm nay · Ngày mai». Hàng dài dùng `.hang-chip[data-mo-mep="true"]`: mép phải mờ dần (`s7`) báo còn mục phía sau; chip đang chọn luôn được cuộn vào tầm nhìn.
- **Chip đang lọc** (có nút ✕ `.xoa`): hiện dưới ô tìm sau khi áp bộ lọc («Chờ xác nhận ✕», «Tháng 10 ✕») trong `.dang-loc`, kèm chip «Xoá lọc».

## Trạng thái
Bình thường nền `c-surface` viền `c-border` · rê chuột `c-soft-hover` · **đang chọn** nền `c-selected-bg` chữ `c-selected-text` viền `c-selected-border` · tiêu điểm `c-focus` · tắt nền `c-surface-alt` chữ `c-text-muted`.

## Người dùng truyền gì
Nhãn ngắn (1–3 từ), `aria-pressed` hay `data-chon`; chip xoá cần `aria-label` «Bỏ lọc Chờ xác nhận». Không số đếm trên chip nhóm (quyết định Tạo đơn 17/10).

## Đừng
Không dùng chip để hiện trạng thái (đó là HuyHieu); không chip thấp hơn 44 ở điện thoại; không mở bảng tick thay cho hàng chip.
