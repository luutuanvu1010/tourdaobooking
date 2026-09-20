# ADR-0008 — Bổ sung cạnh phụ thuộc `parties → locations`

- **Trạng thái:** proposed
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (chờ duyệt)
- **Loại quyết định:** **cửa một chiều** (một khoá ngoại xuyên module khó gỡ sau khi có dữ liệu)
- **Liên quan:** bổ sung (không thay thế) ADR-0001, ADR-0002. ADR-0002 đã accepted nên không sửa được: đồ thị của nó được bổ sung bằng ADR này.

## Bối cảnh
ADR-0001 mục 2 định nghĩa vai trò hồ sơ **gắn với địa điểm** (`pty_party_role(hồ sơ, loại vai trò, địa điểm?, …)` — đúng ví dụ Nguyễn Tuyên Phong là HDV ở Bến cảng Vinpearl). Khi thiết kế bảng cho N1 thấy: cột `pty_party_role.location_id` cần khoá ngoại tới `loc_location.id` (ADR-0003: toàn vẹn ở CSDL; không cột trỏ mà không có khoá ngoại). Nhưng đồ thị ADR-0002 xếp `parties` và `locations` ngang hàng ở đáy, **không có cạnh giữa chúng**. Hai ADR không thể cùng đúng nếu không bổ sung cạnh này.

## Quyết định
1. Thêm cạnh **`parties → locations`** vào đồ thị phụ thuộc của ADR-0002. `locations` vẫn là **lá**: không phụ thuộc module nào.
2. Khoá ngoại `pty_party_role.location_id → loc_location.id`, `NO ACTION` (ADR-0002 điều 5). Địa điểm không bị xoá cứng (`active = 0` — ADR-0003 điều 8).
3. Khi `parties` cần **nhãn** địa điểm (vd trả về "HDV ở Bến cảng Vinpearl"), đọc qua view công bố `v_loc_location_label` của `locations` (ADR-0002 điều 3), không JOIN thẳng `loc_location`.
4. Đồ thị mục tiêu sau bổ sung: đáy = `locations`, `audit` (sink), `shared`; `parties → locations`; `staff → parties`; các module còn lại như ADR-0002. Không tạo vòng.

## Lý do
Vai trò gắn với nơi là yêu cầu cốt lõi của chủ dự án (ADR-0001); khoá ngoại là cách duy nhất giữ toàn vẹn cột đó theo ADR-0003. Cạnh `parties → locations` là chiều tự nhiên (hồ sơ tham chiếu nơi; nơi không cần biết hồ sơ).

## Phương án bị loại
- **Bỏ địa điểm khỏi `pty_party_role`:** mất khả năng truy vấn "ai là HDV ở Bến cảng Vinpearl" — trái ADR-0001.
- **Cột `location_id` không có khoá ngoại:** trái ADR-0003 (toàn vẹn ở CSDL).
- **`locations → parties`:** đảo chiều không có lý do và tạo vòng khi `dsp`, `orders` tham chiếu cả hai.
- **Gộp `locations` vào `parties`:** trộn hai miền; địa điểm không phải bên có tên.

## Hệ quả
- Sổ dữ liệu (`docs/data-dictionary.json`) ghi khoá ngoại này; bài kiểm hướng khoá ngoại (ADR-0002 điều 8c) dùng đồ thị đã bổ sung.
- `ARCHITECTURE.md` cập nhật đồ thị khi N1 triển khai.
