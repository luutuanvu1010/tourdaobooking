# Sổ dữ liệu

> **Sinh tự động** từ `docs/data-dictionary.json` bằng `npm run dict` — không sửa tay. Bài kiểm `src/architecture.test.ts` báo lỗi nếu tệp này lệch.

## audit

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `audit_log` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `v_aud_order_event` | view công bố | cột: id, order_id, staff_id, action, created_at |

## auth

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `login_attempt` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `aut_passkey` | bảng |  |

## catalog

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `catalog_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_override` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_sync` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |

## company

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `company_profile` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: company_name, tax_code, address, hotline, zalo_number, email |

## dispatch

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `dsp_assignment` | bảng |  |
| `dsp_assignment_status` | bảng tra cứu |  |
| `dsp_task_kind` | bảng tra cứu |  |
| `v_dsp_order_handler` | view công bố | cột: order_id, party_id, staff_id, label, since |
| `v_dsp_first_handler` | view công bố | cột: order_id, first_at |

## feedback

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `fbk_kind` | bảng tra cứu |  |
| `fbk_message` | bảng |  |
| `fbk_status` | bảng tra cứu |  |
| `fbk_ticket` | bảng |  |

## locations

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `loc_location` | bảng |  |
| `loc_location_type` | bảng tra cứu |  |
| `v_loc_location_label` | view công bố | cột: id, code, name, location_type_code, active |

## maintenance

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `mnt_setting` | bảng |  |

## orders

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `order_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `order_money_adjustment` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `order_service` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `orders` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `ord_transfer_leg` | bảng |  |
| `ord_passenger` | bảng |  |
| `v_ord_order_label` | view công bố | cột: id, order_code |
| `v_ord_order_owner` | view công bố | cột: id, staff_id |
| `v_ord_order_flag` | view công bố | cột: id, is_confirmed, is_cancelled |
| `v_ord_order_state` | view công bố | cột: id, status, delivered_at, completed_at |
| `v_ord_leg_key` | view công bố | cột: id, order_id, order_service_id, is_open |
| `v_ord_passenger_key` | view công bố | cột: person_key, order_id, has_current_row |
| `v_ord_passenger_row` | view công bố | cột: id, person_key, order_id, is_current |

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
| `pty_person_document_type` | bảng |  |
| `pty_license_class` | bảng |  |
| `pty_person_document` | bảng |  |
| `v_pty_open_role_group` | view công bố | cột: party_id, role_group |
| `v_pty_party_label` | view công bố | cột: id, display_name, party_kind, active, sort_key |
| `v_pty_owner_company` | view công bố | cột: party_id |
| `v_pty_carrier` | view công bố | cột: party_id |
| `v_pty_carrier_driver` | view công bố | cột: carrier_party_id, driver_party_id |

## staff

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `staff` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: role, full_name |
| `stf_permission` | bảng |  |
| `stf_permission_adjustment` | bảng |  |
| `stf_permission_type` | bảng tra cứu |  |
| `v_stf_staff_label` | view công bố | cột: id, label, active, party_id |
| `v_stf_toan_quyen` | view công bố | cột: staff_id |

## thongbao

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `ntf_notice` | bảng |  |
| `ntf_notice_target` | bảng |  |
| `ntf_ack` | bảng |  |
| `ntf_read_mark` | bảng |  |
| `ntf_push_sub` | bảng |  |

## van-chuyen

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `vc_vehicle` | bảng |  |
| `vc_vehicle_document` | bảng |  |
| `vc_vehicle_document_type` | bảng |  |
| `vc_expiry_policy` | bảng |  |
| `vc_dispatch_policy` | bảng |  |
| `vc_departure_rule` | bảng |  |
| `vc_license_capacity` | bảng |  |
| `vc_reason` | bảng tra cứu |  |
| `vc_trip` | bảng |  |
| `vc_trip_driver` | bảng |  |
| `vc_trip_stop` | bảng |  |
| `vc_trip_allocation` | bảng | tham chiếu logic `leg_id` → `ord_transfer_leg` qua view `v_ord_leg_key`, không khoá ngoại (trigger LC-09 lúc mở suất + kiểm định kỳ R-VC-19 — R-P19); tham chiếu logic `passenger_key` → `ord_passenger` qua view `v_ord_passenger_key`, không khoá ngoại (person_key — trigger LC-10 lúc mở suất / gắn tên + kiểm định kỳ R-VC-19 — R-P19) |
| `vc_trip_event` | bảng |  |
| `vc_trip_departure_check` | bảng |  |
| `vc_trip_departure_check_item` | bảng |  |
| `vc_trip_manifest` | bảng | tham chiếu logic `passenger_row_id` → `ord_passenger` qua view `v_ord_passenger_row`, không khoá ngoại (id dòng đã dùng — trigger vc_trip_manifest_scope lúc chốt + kiểm định kỳ R-VC-10 — R-P19) |
| `vc_leg_appt_ack` | bảng | tham chiếu logic `leg_id` → `ord_transfer_leg` qua view `v_ord_leg_key`, không khoá ngoại (mốc giờ hẹn của chặng (ADR-0051, 0043) — dòng XEP chỉ sinh trong lô mở suất (đã qua LC-09); dòng người bấm đòi chặng còn suất khách chờ đón + kiểm định kỳ R-VC-19 — R-P19) |

## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)

- `audit_log` → `staff` — audit_log.staff_id — ADR-0002 điều 6
- `audit_log` → `orders` — audit_log.order_id — ADR-0002 điều 6
- `catalog_override` → `staff` — catalog_override.updated_by — ADR-0002 điều 6
- `company_profile` → `staff` — company_profile.updated_by — ADR-0002 điều 6
