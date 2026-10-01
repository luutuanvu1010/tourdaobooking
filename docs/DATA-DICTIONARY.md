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

## billing

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `bil_payment_method` | bảng tra cứu |  |
| `bil_collector_role` | bảng tra cứu |  |
| `bil_receipt_kind` | bảng tra cứu |  |
| `bil_receipt_stage` | bảng tra cứu |  |
| `bil_posting_kind` | bảng tra cứu |  |
| `bil_debt_kind` | bảng tra cứu |  |
| `bil_payment_receipt` | bảng | lần thu (ADR-0026 đ2), CHỈ-THÊM, dòng đảo trỏ reverses_id; migration 0045 chứa câu MỘT LẦN chép cọc cũ (orders.deposit_amount > 0) thành lần thu người thu CHƯA RÕ (ADR-0026 đ9, Q3) |
| `bil_posting` | bảng | phiếu sổ (ADR-0026 đ3), CHỈ-THÊM; due_snapshot = phải thu chụp lúc Đã giao (Q4); trigger kiểm tiền trong lô Đã giao / Hoàn thành |
| `bil_accounting_entry` | bảng | dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" của một đơn (ADR-0060), CHỈ-THÊM (trigger cấm sửa/xoá); trạng thái hiện tại = dòng rowid lớn nhất của đơn; bỏ dấu bắt buộc lý do (CHECK); không tiền, không trạng thái hoá đơn ADR-0004 |
| `bil_debt_line` | bảng | dòng nợ hai chân (ADR-0026 đ3), CHỈ-THÊM; nguồn = đơn HOẶC chuyến (ADR-0057 T3 — trip_id cột dự trữ, không khoá ngoại, lượt 1 luôn trống) |
| `v_bil_order_paid` | view công bố | cột: order_id, paid_net, unknown_count |
| `v_bil_party_balance` | view công bố | cột: party_id, counterparty_id, order_id, balance |

## catalog

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `catalog_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_override` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_sync` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `ctl_group` | bảng tra cứu | nhóm dịch vụ của danh mục (ADR-0058, 0055): gieo 14 nhóm từ ảnh chụp Sheet 30/9, sau đó Quản trị quản lý trong app. Không xoá (trigger ctl_group_no_delete — tắt bằng active = 0); tên chỉ cấm trùng giữa các nhóm đang dùng (chỉ mục duy nhất một phần ctl_group_name_active) |
| `ctl_service_group` | bảng | LỊCH SỬ gán nhóm cho từng dịch vụ (ADR-0058, 0055): chỉ thêm (trigger cấm sửa/xoá), seq tăng theo từng dịch vụ, dòng seq lớn nhất là nhóm hiện hành, group_code NULL = Chưa phân loại. Gán vào nhóm đang tắt bị trigger ctl_service_group_active_group chặn; service_code phải có trong catalog_item |

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
| `orders` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: deposit_amount, deposit_method, remaining_amount; ba cột cọc KHÔNG DÙNG NỮA — xem ADR-0026 điều 9 (đơn mới ghi 0 / NULL / total để thoả trigger 0007; số đã thu, còn lại lấy từ billing). Cột mốc delivered_at/_by, completed_at/_by từ 0044 (ADR-0024 điều 3) |
| `ord_transfer_leg` | bảng |  |
| `ord_passenger` | bảng |  |
| `ord_manual_service_policy` | bảng | công tắc "Dịch vụ nhập tay" (ADR-0061, migration 0052), CHỈ-THÊM; dòng hiệu lực = valid_from_at lớn nhất ≤ bây giờ, bảng rỗng = TẮT; gieo một dòng TẮT; chỉ Toàn quyền thêm dòng mới (settings.ops) |
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
| `pty_party` | bảng | merged_into_id (NULL = chưa gộp) + merged_at (ISO UTC): hồ sơ phụ đã gộp vào hồ sơ chính (ADR-0068) — đặt MỘT lần cùng active = 0, không chuỗi, không mở lại (trigger pty_party_merge_*); tham chiếu sổ sách cũ vẫn trỏ hồ sơ phụ, gom theo người thì đi theo merged_into_id một bước |
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
| `vc_leg_template` | bảng | MẪU ĐƯA ĐÓN theo dịch vụ (ADR-0054 D10.1, 0058): chỉ thêm (trigger cấm sửa/xoá), dòng valid_from_at lớn nhất đã tới là hiện hành, không dòng = không đưa đón. code = mã dịch vụ của Danh mục — tham chiếu LOGIC, KHÔNG khoá ngoại, KHÔNG khai logicalRefs (catalog chưa có view công bố cho mã; ruling 0.5 của nhật ký thi công 2026-10-01-may-chu-o-moi-chang); van-chuyen không đọc bảng catalog. default_dropoff_location_id = nơi trả mặc định (ADR nháp nơi trả mặc định, đã duyệt 1/10) — điểm danh mục, chỉ khi có đưa đón. Chỉ là GỢI Ý ở form (hàm thuần changMacDinh): máy chủ không tự tạo chặng, không tự điền nơi trả |
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

## tro-ly

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `tl_luot_hoi` | bảng | một dòng / câu hỏi trợ lý Hỗ trợ (ADR-0066 điều 7), CHỈ-THÊM; KHÔNG cột nội dung hỏi/đáp; staff_id không khoá ngoại (tro-ly là lá); chi phí micro-USD (ngoại lệ có tên với luật tiền VNĐ); cột mau (mã mẫu của lượt, NULL = lượt cũ hiểu là gpt-5-nano) và la_thu (1 = Thử key / ô thử: tính trần tiền tháng, không tính trần ngày, không vào số câu — ADR-0073); từ ADR-0082: chi_phi_micro_usd = tiền mẫu trả lời + tiền embedding của lượt (câu hỏi + lô tính bù đoạn nếu có), token_vao / token_ra vẫn CHỈ của mẫu trả lời |
| `tl_cai_dat` | bảng | bật/tắt + trần tháng (micro-USD) + trần ngày của trợ lý (ADR-0066), bản có hiệu lực CHỈ-THÊM (bản hiện hành = valid_from_at lớn nhất); chỉ Toàn quyền thêm bản mới (settings.ops) |
| `tl_vai` | bảng | công tắc trợ lý theo MÃ QUYỀN (ADR-0069 điều 3), bản có hiệu lực CHỈ-THÊM theo từng mã; mã không có dòng = tắt; người hỏi được dùng khi ít nhất một quyền đang bật; chỉ Toàn quyền thêm bản (settings.ops) |
| `tl_loi_dan` | bảng | lời dặn của Toàn quyền (câu chào, giọng, lời dặn thêm, câu hỏi mẫu — ADR-0069 điều 4), bản có hiệu lực CHỈ-THÊM; mọi bản là lịch sử bản; chữ đã qua luật nội dung trước khi ghi; giọng / lời dặn thêm thôi dùng từ ADR-0073 (giữ dữ liệu; chỉ nối vào lời nhắc mặc định khi chưa có bản tl_bo_nao nào) |
| `tl_ngu_canh` | bảng | đoạn ngữ cảnh bổ sung cho kho tìm đoạn của trợ lý (ADR-0069 điều 4), bản có hiệu lực CHỈ-THÊM theo doan_id; sửa / bật / tắt = bản mới |
| `tl_hoi_dap` | bảng | lịch sử hỏi đáp (ADR-0069 điều 5, sửa ADR-0066 điều 7), CHỈ-THÊM, ghi cùng lô với tl_luot_hoi (luot_id); câu hỏi ĐÃ CHE (CHECK chặn dãy 8 chữ số); chỉ Toàn quyền đọc (settings.ops); không xoá; cuoc_tro_chuyen = mã cuộc trò chuyện để máy chủ lấy ≤ 3 lượt trước của CHÍNH người hỏi (ADR-0073 Đ4); câu trả lời lưu SAU khi đã ẩn số tiền |
| `tl_bo_nao` | bảng | bộ não trợ lý Hỗ trợ (ADR-0073 Đ1, Đ2): mẫu AI (danh sách đóng trong mã), mức suy nghĩ, độ dài, token ra 800–4000, TOÀN BỘ lời nhắc 1–12.000 ký tự; bản có hiệu lực CHỈ-THÊM (bản hiện hành = valid_from_at lớn nhất); không gieo — chưa có bản thì dùng bản mặc định trong mã; chỉ Toàn quyền thêm bản (settings.ops) |
| `tl_van_nghia` | bảng | dấu vân nghĩa (embedding OpenAI, ADR-0082 Đ2) của đoạn kho tri thức trợ lý — CHỈ nội dung kho (hướng dẫn, kiến trúc, sơ đồ trang, ngữ cảnh bổ sung đã lọc), KHÔNG câu hỏi / người hỏi; khoá = SHA-256 của đoạn đã định dạng + mẫu + số chiều; vec = BLOB float32 dài so_chieu × 4 (CHECK); CHỈ-THÊM, ghi bằng ON CONFLICT(khoa) DO NOTHING khi máy chủ tính bù; không route nào đọc / ghi trực tiếp |

## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)

- `audit_log` → `staff` — audit_log.staff_id — ADR-0002 điều 6
- `audit_log` → `orders` — audit_log.order_id — ADR-0002 điều 6
- `catalog_override` → `staff` — catalog_override.updated_by — ADR-0002 điều 6
- `company_profile` → `staff` — company_profile.updated_by — ADR-0002 điều 6
