# Sổ dữ liệu

> **Sinh tự động** từ `docs/data-dictionary.json` bằng `npm run dict` — không sửa tay. Bài kiểm `src/architecture.test.ts` báo lỗi nếu tệp này lệch.

## audit

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `audit_log` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## auth

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `login_attempt` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## catalog

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `catalog_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_override` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_sync` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## company

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `company_profile` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## locations

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `loc_location` | bảng |  |
| `loc_location_type` | bảng tra cứu |  |
| `v_loc_location_label` | view công bố | cột: id, code, name, location_type_code, active |

## orders

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `order_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `order_service` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `orders` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `v_ord_order_label` | view công bố | cột: id, order_code |

## staff

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `staff` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)

- `audit_log` → `staff` — audit_log.staff_id — ADR-0002 điều 6
- `audit_log` → `orders` — audit_log.order_id — ADR-0002 điều 6
- `catalog_override` → `staff` — catalog_override.updated_by — ADR-0002 điều 6
- `company_profile` → `staff` — company_profile.updated_by — ADR-0002 điều 6
