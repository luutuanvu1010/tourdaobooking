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

## dispatch

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `dsp_assignment` | bảng |  |
| `dsp_assignment_status` | bảng tra cứu |  |
| `dsp_task_kind` | bảng tra cứu |  |
| `v_dsp_order_handler` | view công bố | cột: order_id, party_id, staff_id, label, since |

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

## parties

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `pty_contact_kind` | bảng tra cứu |  |
| `pty_contact_point` | bảng |  |
| `pty_organization` | bảng |  |
| `pty_party` | bảng |  |
| `pty_party_relationship` | bảng |  |
| `pty_party_role` | bảng |  |
| `pty_person` | bảng |  |
| `pty_relationship_type` | bảng tra cứu |  |
| `pty_role_type` | bảng tra cứu |  |
| `v_pty_party_label` | view công bố | cột: id, display_name, party_kind, active, sort_key |

## staff

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `staff` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: role, full_name |
| `stf_permission` | bảng |  |
| `stf_permission_type` | bảng tra cứu |  |
| `v_stf_staff_label` | view công bố | cột: id, label, active, party_id |

## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)

- `audit_log` → `staff` — audit_log.staff_id — ADR-0002 điều 6
- `audit_log` → `orders` — audit_log.order_id — ADR-0002 điều 6
- `catalog_override` → `staff` — catalog_override.updated_by — ADR-0002 điều 6
- `company_profile` → `staff` — company_profile.updated_by — ADR-0002 điều 6
