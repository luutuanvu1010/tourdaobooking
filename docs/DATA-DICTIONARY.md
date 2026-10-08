# Sổ dữ liệu

> **Sinh tự động** từ `docs/data-dictionary.json` bằng `npm run dict` — không sửa tay. Bài kiểm `src/architecture.test.ts` báo lỗi nếu tệp này lệch.

## audit

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `audit_log` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `v_aud_order_event` | view công bố | cột: id, order_id, staff_id, action, created_at |
| `v_aud_trip_event` | view công bố | cột: id, trip_id, staff_id, action, created_at |
| `v_aud_account_event` | view công bố | cột: id, account_id, staff_id, action, created_at |

## auth

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `login_attempt` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `aut_passkey` | bảng |  |
| `aut_session` | bảng | sổ phiên đăng nhập (ADR-0075, migration 0065): mỗi lần cấp phiên là một dòng, KHÔNG xoá (kết thúc = ended_at + end_reason đi cặp). single = 1: tài khoản chịu luật một máy, chỉ mục duy nhất aut_session_one_live chặn hai phiên sống cùng lúc. ip và user_agent là DỮ LIỆU CÁ NHÂN, giữ vô hạn, chỉ IT/Toàn quyền và chính chủ tài khoản xem, KHÔNG vào nhật ký |
| `aut_session_policy` | bảng | chính sách đăng nhập (ADR-0085, migration 0067): mỗi quyền app đặt được (9 mã, không SUPER_ADMIN) tối đa một dòng hiện hành; multi = 1 là Nhiều máy; bảng trống = mọi quyền Một máy. Không xoá dòng — đổi = đóng dòng hiện hành (valid_to_at) + chèn dòng mới trong cùng lô; lưu có kiểm phiên bản (id dòng đang xem) |

## billing

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `bil_payment_method` | bảng tra cứu |  |
| `bil_collector_role` | bảng tra cứu |  |
| `bil_receipt_kind` | bảng tra cứu |  |
| `bil_receipt_stage` | bảng tra cứu |  |
| `bil_posting_kind` | bảng tra cứu |  |
| `bil_debt_kind` | bảng tra cứu |  |
| `bil_payment_receipt` | bảng | lần thu (ADR-0026 đ2), CHỈ-THÊM, dòng đảo trỏ reverses_id; migration 0045 chứa câu MỘT LẦN chép cọc cũ (orders.deposit_amount > 0) thành lần thu người thu CHƯA RÕ (ADR-0026 đ9, Q3). 0079 (ADR-0089): approval_id = khoản duyệt hoàn cọc của lần trả lại khách (lần chi hoàn / nửa chi của lệnh chuyển); transfer_of_id (UNIQUE) = nửa thu ở đơn nhận trỏ nửa chi ở đơn huỷ (trigger coc_transfer_mismatch: cùng đơn nhận, số, người giữ). Trigger 0079: đơn huỷ chỉ hoàn qua khoản duyệt; không vượt phần còn lại của khoản; người chi ≠ người duyệt; đảo lần thu không làm đã duyệt vượt tiền còn giữ lúc huỷ (đ15); nửa thu chỉ vào đơn nhận còn hiệu lực, chưa Đã giao (coc_transfer_target_invalid — RAISE huỷ cả lô); không đảo riêng một nửa của lệnh chuyển đã ghép đôi (coc_transfer_locked). Trigger 0082 (ADR-0092): đảo lần thu không làm đã thu ròng < 0 (net_paid_negative); lần trả lại khách do người không phải công ty chủ trả ≤ số người đó đang giữ trên đơn (refund_exceeds_held). 0083 (ADR-0088): cột replacement_id = id phiếu đánh dấu REPLACEMENT của lô "Thay lần thu" (lần thu mới + dòng đảo của lô; NULL = mọi lần thu khác); đơn đã có phiếu Đã giao thì không ghi / đảo lần thu, không ghi lần trả lại khách ngoài lô Thay (receipt_after_delivered) |
| `bil_audit_cutoff` | bảng | mốc của kiểm định kỳ sổ tiền (ADR-0092 đ8, khuôn ADR-0088 đ7 / ADR-0079 đ7a; migration 0080), CHỈ-THÊM: code (vd 'R-BIL-13') → cutoff_at = lúc áp migration. Vi phạm có dòng ghi TỪ mốc = LỖI (audit-invariants); cũ hơn mốc = cảnh báo kèm danh sách. Dòng 'R-BIL-13' cũng là mốc của R-ORD-15 (0081 cùng lần phát hành; orders không ghi bảng này). Không tiền, không dữ liệu cá nhân. Dòng 'R-BIL-D6' (0088) là mốc cắt C1 của mã giao dịch ngân hàng. |
| `bil_deposit_approval` | bảng | khoản duyệt hoàn cọc đơn huỷ (ADR-0089 đ4a, đ6, X-1; migration 0079), CHỈ-THÊM: kind_code REFUND (hoàn) | TRANSFER (chuyển sang target_order_id); dòng HUỶ DUYỆT trỏ khoản gốc bằng voids_id (UNIQUE — một lần), amount = phần huỷ ≤ phần chưa chi. approved_date = ngày VN. Trigger: chỉ đơn huỷ; nhóm chưa kết luận chặn (X-2); khách huỷ quá refund_deadline chặn (đ5); tổng duyệt ≤ tiền còn giữ lúc huỷ (đ15, lời chủ (c)); đơn nhận còn hiệu lực, chưa Đã giao. Người duyệt = created_by (tách với người chi) |
| `bil_outside_refund` | bảng | "đã hoàn ngoài hệ thống" của đơn huỷ CŨ (ADR-0089 đ16, X-3, X-4, lời chủ (b); migration 0079), CHỈ-THÊM: RECORD (Toàn quyền ghi, amount + lý do) → CONFIRM (Quản trị xác nhận) hoặc REJECT (từ chối, có lý do — ghi lại được); target_id UNIQUE (mỗi dòng ghi một quyết định). Trigger: chỉ đơn có dòng lý do legacy = 1; một RECORD đang hiệu lực mỗi đơn; amount ≤ còn giữ; người xác nhận/từ chối ≠ người ghi. Đã xác nhận tính CẢ là duyệt lẫn chi; không đụng số dư người giữ tiền |
| `bil_posting` | bảng | phiếu sổ (ADR-0026 đ3), CHỈ-THÊM; due_snapshot = phải thu chụp lúc Đã giao (Q4); trigger kiểm tiền trong lô Đã giao / Hoàn thành |
| `bil_accounting_entry` | bảng | dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" của một đơn (ADR-0060), CHỈ-THÊM (trigger cấm sửa/xoá); trạng thái hiện tại = dòng rowid lớn nhất của đơn; bỏ dấu bắt buộc lý do (CHECK); không tiền, không trạng thái hoá đơn ADR-0004 |
| `bil_debt_line` | bảng | dòng nợ hai chân (ADR-0026 đ3), CHỈ-THÊM; nguồn = đơn HOẶC chuyến (ADR-0057 T3 — trip_id cột dự trữ, không khoá ngoại, lượt 1 luôn trống). 0080 (ADR-0092 Đ2, Đ2b): trigger bil_debt_line_settlement_no_flip — dòng quyết toán gốc gắn đơn không làm số dư cặp (bên, công ty chủ) đổi dấu; bil_debt_line_held_once — dòng đảo giữ hộ chỉ khi người giữ hộ còn nợ ≥ số dòng gốc (một dòng giữ hộ tất toán MỘT lần: "Công ty đã nhận" HOẶC "Nộp") |
| `bil_receipt_bank_txn` | bảng | nối lần thu ↔ mã giao dịch ngân hàng + số tiền thực chuyển theo sao kê (ADR-0092 Đ6, ADR-0108 đ4 T2; migration 0088), CHỈ-THÊM, receipt_id duy nhất. Chỉ lần thu chuyển khoản – Công ty thu. Ba luật ở trigger (trùng cùng đơn, số thực chuyển lệch, tổng vượt) theo vị từ hieuLuc. Chỉ người có ledger.write thấy mã; nhật ký không chép mã |
| `v_bil_order_paid` | view công bố | cột: order_id, paid_net, unknown_count |
| `v_bil_coc_don` | view công bố | cột: order_id, da_tra, dang_doi_chieu, hoan_truoc_huy, da_duyet, da_chi, da_chuyen, hoan_ngoai, con_giu_luc_huy, con_giu, cho_chi |
| `v_bil_party_balance` | view công bố | cột: party_id, counterparty_id, order_id, balance |

## catalog

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `catalog_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_override` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `catalog_sync` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `ctl_group` | bảng tra cứu | nhóm dịch vụ của danh mục (ADR-0058, 0055): gieo 14 nhóm từ ảnh chụp Sheet 30/9, sau đó Quản trị quản lý trong app. Không xoá (trigger ctl_group_no_delete — tắt bằng active = 0); tên chỉ cấm trùng giữa các nhóm đang dùng (chỉ mục duy nhất một phần ctl_group_name_active) |
| `ctl_service_group` | bảng | LỊCH SỬ gán nhóm cho từng dịch vụ (ADR-0058, 0055): chỉ thêm (trigger cấm sửa/xoá), seq tăng theo từng dịch vụ, dòng seq lớn nhất là nhóm hiện hành, group_code NULL = Chưa phân loại. Gán vào nhóm đang tắt bị trigger ctl_service_group_active_group chặn; service_code phải có trong catalog_item |
| `v_ctl_service_group` | view công bố | cột: catalog_code, group_code |

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

## giao-dien

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `gd_setting` | bảng |  |

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
| `order_item` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); dòng tiền của dịch vụ: line_total = quantity × unit_price (trigger 0007; ở mã MỘT hàm thanhTienDong). 0081 (F-03): đơn hết nháp (đã xác nhận / đã huỷ) không thêm / xoá dòng, không sửa cột tiền (quantity, unit_price, line_total, catalog_price, pax_code, service_id, order_id) — mô tả / chi tiết vẫn sửa được; lúc xác nhận orders.subtotal phải = Σ line_total (kiểm định kỳ R-ORD-15) |
| `order_money_adjustment` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `order_service` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2) |
| `orders` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: deposit_amount, deposit_method, remaining_amount; ba cột cọc KHÔNG DÙNG NỮA — xem ADR-0026 điều 9 (đơn mới ghi 0 / NULL / total để thoả trigger 0007; số đã thu, còn lại lấy từ billing). Cột mốc delivered_at/_by, completed_at/_by từ 0044 (ADR-0024 điều 3) |
| `ord_transfer_leg` | bảng | CAM KẾT CỦA CHẶNG (ADR-0056 VK3-A, migration 0077, Đợt 7): exclusive_vehicle 0/1 (mặc định 0 = không cam kết xe riêng) và min_vehicle_seats NULL hoặc 1..100 (xe tối thiểu N chỗ; NULL = không cam kết). Không mang tiền, không mang tên người, không kể tài xế (không vào DTO tài xế). Ai ghi: theo ô của route chứa chặng (nháp qua order.modify, sau xác nhận qua order.trip.edit) — khoá vắng thì giữ giá trị cũ, không xét mốc 6 giờ. Chặng cũ = 0 / NULL. CHECK ngay ở cột; vận chuyển chỉ đọc qua hàm hẹp lichChungChang / hanhKhachChoChuyen |
| `ord_cancel_reason` | bảng | lý do huỷ đơn (ADR-0089 đ8, X-2, X-3; migration 0078), CHỈ-THÊM (trigger cấm sửa/xoá). Mỗi đơn huỷ đúng một dòng gốc (chỉ mục duy nhất một phần) + tối đa một dòng PHÂN LOẠI trỏ dòng gốc 'chưa kết luận' (reclassifies_id; giữ ngày huỷ và cờ legacy). reason_code / group_code (KHACH_HUY, CONG_TY_HUY, LAP_LAI, CHUA_KET_LUAN) kiểm ở mã (src/shared/ly-do-huy.ts); note = ghi chú 'Khác' / lý do phân loại, không SĐT. cancelled_date = ngày VN. legacy = 1: đơn huỷ trước bản này — gieo MỘT LẦN trong migration 0078 (nhóm chưa kết luận, mã LEGACY, ngày = ngày VN của nhật ký huỷ mới nhất, không có thì của updated_at; người ghi 'he-thong'). Trigger orders_cancel_requires_reason: đơn chỉ chuyển sang huỷ khi đã có dòng lý do. Đọc xuyên module qua v_ord_cancel_state (nhóm hiện hành + hạn hoàn cọc refund_deadline) |
| `ord_passenger` | bảng |  |
| `ord_manual_service_policy` | bảng | công tắc "Dịch vụ nhập tay" (ADR-0061, migration 0052), CHỈ-THÊM; dòng hiệu lực = valid_from_at lớn nhất ≤ bây giờ, bảng rỗng = TẮT; gieo một dòng TẮT; chỉ Toàn quyền thêm dòng mới (settings.ops) |
| `ord_service_terms` | bảng | bản chụp thương mại của từng dòng dịch vụ trong đơn đã xác nhận (ADR-0077 điều 8, ADR-0078 điều 5; migration 0090), CHỈ-THÊM: người hưởng, hoa hồng (trạng thái NONE / SET / MISSING kèm lý do thiếu), mức đã chụp và dòng mức nguồn, người bán / nhà cung cấp / a%. Bản mới trỏ supersedes_id (UNIQUE) tới bản hiện hành. Bản AUTO phải khớp dòng mức và điều khoản còn hiệu lực ở captured_date (trigger terms_rule_stale / terms_term_stale — bảng mức đổi giữa lúc đọc và lúc ghi thì cả lô rơi); MANUAL cần lý do ≥ 10 ký tự. Không chụp cho đơn nháp hay đơn đã Đã giao. Tỷ lệ, a%, nguồn chụp KHÔNG vào DTO của Đối tác |
| `ord_audit_cutoff` | bảng | mốc của kiểm định kỳ R-ORD-T1 (đặc tả sổ đại lý đợt 1 §9; khuôn bil_audit_cutoff; migration 0090), CHỈ-THÊM: code → cutoff_at = lúc áp migration. Đơn xác nhận từ mốc + 60 phút mà thiếu bản chụp = LỖI, trước đó = cảnh báo kèm danh sách. Không tiền, không dữ liệu cá nhân |
| `v_ord_order_label` | view công bố | cột: id, order_code |
| `v_ord_order_owner` | view công bố | cột: id, staff_id |
| `v_ord_order_flag` | view công bố | cột: id, is_confirmed, is_cancelled |
| `v_ord_order_state` | view công bố | cột: id, status, delivered_at, completed_at |
| `v_ord_cancel_state` | view công bố | cột: order_id, group_code, reason_code, cancelled_date, legacy, depart_last_date, refund_deadline |
| `v_ord_leg_key` | view công bố | cột: id, order_id, order_service_id, is_open |
| `v_ord_passenger_key` | view công bố | cột: person_key, order_id, has_current_row |
| `v_ord_passenger_row` | view công bố | cột: id, person_key, order_id, is_current |
| `v_ord_terms_missing` | view công bố | cột: order_id |

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
| `pty_bank` | bảng tra cứu | ngân hàng Việt Nam: mã, BIN 6 số (NAPAS), tên ngắn, tên đầy đủ (ADR-0108 đ2; migration 0087). Nguồn gieo: danh sách công khai VietQR.io, đối chiếu khi gieo. Thêm ngân hàng = migration mới |
| `pty_bank_account` | bảng | tài khoản nhận tiền của CÔNG TY CHỦ (ADR-0108 đ2; migration 0087), chính sách có hiệu lực: tối đa một dòng mở mỗi hồ sơ, chỉ đóng một lần (valid_to), không sửa, không xoá; trigger chỉ cho hồ sơ đang mở vai OWNER_COMPANY. Ghi bằng ô company.legal.write. Số tài khoản KHÔNG vào nhật ký, KHÔNG vào CompanyDto công khai, KHÔNG vào kho tri thức Trợ lý |
| `v_pty_open_role_group` | view công bố | cột: party_id, role_group |
| `v_pty_party_label` | view công bố | cột: id, display_name, party_kind, active, sort_key |
| `v_pty_owner_company` | view công bố | cột: party_id |
| `v_pty_carrier` | view công bố | cột: party_id |
| `v_pty_carrier_driver` | view công bố | cột: carrier_party_id, driver_party_id |
| `v_pty_person_xung_ho` | view công bố | cột: party_id, given_name, gender |
| `v_pty_open_role` | view công bố | cột: party_id, role_type_code, role_group |

## staff

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `staff` | bảng | tên cũ, giữ nguyên (ADR-0002 điều 2); cột chết: role, full_name |
| `stf_permission` | bảng |  |
| `stf_permission_adjustment` | bảng |  |
| `stf_permission_type` | bảng tra cứu |  |
| `v_stf_staff_label` | view công bố | cột: id, label, active, party_id |
| `v_stf_toan_quyen` | view công bố | cột: staff_id |
| `v_stf_quyen_mo` | view công bố | cột: staff_id, permission_code |
| `v_stf_nhieu_may_co_dinh` | view công bố | cột: staff_id |
| `v_stf_staff_xung_ho` | view công bố | cột: id, given_name, gender |

## thongbao

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `ntf_notice` | bảng |  |
| `ntf_notice_target` | bảng |  |
| `ntf_ack` | bảng |  |
| `ntf_read_mark` | bảng |  |
| `ntf_push_sub` | bảng | session_id (0065, ADR-0075 điều 6b): phiên đã đăng ký máy này; NULL = đăng ký trước phát hành. revoke_reason thêm bi-thay: tài khoản một máy đăng nhập máy khác — tắt mọi đăng ký trừ đăng ký của phiên mới; bi-go: IT/Toàn quyền gỡ một phiên — tắt CHỈ đăng ký mang đúng mã phiên đó (đăng ký session_id NULL không đụng). mat-mien (0067, ADR-0085 Q3): Toàn quyền lưu chính sách đăng nhập chuyển quyền sang Một máy — tắt CHỈ đăng ký mang đúng mã các phiên vừa bị kết thúc (máy giữ lại và đăng ký session_id NULL không đụng) |

## van-chuyen

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `vc_vehicle` | bảng |  |
| `vc_vehicle_document` | bảng |  |
| `vc_vehicle_document_type` | bảng |  |
| `vc_expiry_policy` | bảng |  |
| `vc_dispatch_policy` | bảng | duty_day_max_minutes (480, 60–1440) tổng giờ lái một ngày chạy; trip_no_break_max_minutes (240, 30–720) chuyến dài hơn → nhắc nghỉ — chỉ cảnh báo (ADR-0055 VK2-B); thêm bằng ADD COLUMN có DEFAULT ở 0071 (lệch khuôn I43 có ghi — bù bằng bài 'câu chèn liệt kê đủ cột' và thân yêu cầu bắt buộc hai số) |
| `vc_leg_template` | bảng | MẪU ĐƯA ĐÓN theo dịch vụ (ADR-0054 D10.1, 0058): chỉ thêm (trigger cấm sửa/xoá), dòng valid_from_at lớn nhất đã tới là hiện hành, không dòng = không đưa đón. code = mã dịch vụ của Danh mục — tham chiếu LOGIC, KHÔNG khoá ngoại, KHÔNG khai logicalRefs (catalog chưa có view công bố cho mã; ruling 0.5 của nhật ký thi công 2026-10-01-may-chu-o-moi-chang); van-chuyen không đọc bảng catalog. default_dropoff_location_id = nơi trả mặc định (ADR nháp nơi trả mặc định, đã duyệt 1/10) — điểm danh mục, chỉ khi có đưa đón. Chỉ là GỢI Ý ở form (hàm thuần changMacDinh): máy chủ không tự tạo chặng, không tự điền nơi trả |
| `vc_departure_rule` | bảng |  |
| `vc_license_capacity` | bảng |  |
| `vc_reason` | bảng tra cứu |  |
| `vc_route` | bảng tra cứu |  |
| `vc_vehicle_size` | bảng tra cứu |  |
| `vc_rental_rate` | bảng |  |
| `vc_trip_cost_line` | bảng |  |
| `vc_unavailability` | bảng | KHUNG BẬN (ADR-0055 VK2-A; hình dùng chung ADR-0053 D9.1, migration 0071): subject VEHICLE (xe vào xưởng, đăng kiểm…) | DRIVER (Báo bận tài xế đối tác — CHƯA MỞ, trigger chặn tới Đợt 6). Đúng một đối tượng theo subject. start_ms/end_ms nửa mở, phút tròn; start_at/end_at ISO UTC cùng mốc. Chỉ thêm; một kiểu sửa: rút một lần (withdrawn_*, version + 1). Lý do: vc_reason nhóm BAN_XE (xe) / BAN_TAI_XE (tài xế). Trigger hai chiều với vc_trip: chuyến chưa huỷ không chồng khung còn hiệu lực; khung không chồng chuyến PLANNED/RUNNING. Không cột ghi chú tự do. Đọc đợt này luôn lọc subject = 'VEHICLE' |
| `vc_trip` | bảng | DẤU PHÁ LỆ CAM KẾT (ADR-0056 VK3-A A3, migration 0077, Đợt 7): commitment_override_reason_code (FK vc_reason, nhóm PHA_LE) + commitment_override_key (chuỗi nối id và con số, không tên, không tiền — khoá chỉ để so với tình trạng cam kết hiện tại, KHÔNG BAO GIỜ hiển thị / vào DTO / nhật ký). Đi CẶP: có cả hai hoặc không có cả hai (CHECK); key dài 3..4000. Ai ghi: lệnh chuyến của người có ô trip.override (Quản trị, Toàn quyền) — một lô với nhật ký; xoá cả hai khi hết vi phạm. Chuyến đã kết thúc / huỷ không sửa (trigger vc_trip_final_frozen). Luật cấu hình, không có trigger: lớp giữ là máy chủ + câu kiểm định kỳ mức warn |
| `vc_trip_driver` | bảng |  |
| `vc_trip_stop` | bảng | điểm dừng của chuyến. added_while_running (0076, ADR-0052 D5.1/D5.3a): 1 = điểm thêm khi xe đang chạy (lệnh Thêm điểm của văn phòng hoặc Cập nhật điểm theo đơn); bất biến (LC-04); trigger LC-15 chỉ cho chèn điểm vào chuyến RUNNING khi có cờ VÀ sự kiện mang dấu lệnh hiện hành là STOP_ADDED_RUNNING / ALLOCATION_STOP_CHANGED; chuyến chưa chạy không mang cờ |
| `vc_trip_allocation` | bảng | suất một người trên một chuyến. 0076 (ADR-0052 D5): opened_cmd_id / closed_cmd_id = dấu lệnh mở / đóng (máy chủ ghi ở mọi câu mở / đóng từ 1.79; dòng cũ NULL; opened bất biến, closed chỉ khi đã đóng) — câu chốt D5.3a (trigger vc_trip_stop_changed_balance) đếm đóng STOP_CHANGED = mở cùng dấu lệnh theo (chặng, người), cùng chuyến. office_cancel_at/_by/_reason_code (nhóm lý do BAO_HUY_DIEM): văn phòng báo huỷ một suất khi xe đang chạy — ba cột cùng có / cùng vắng, đặt MỘT lần trên suất WAITING đang mở, KHÔNG đóng suất (vẫn chiếm chỗ tới khi tài xế ghi Khách đã huỷ / Đã đón). added_after_departure = 1 chỉ trên chuyến RUNNING (LC-15 mới, ba đường có tên).; tham chiếu logic `leg_id` → `ord_transfer_leg` qua view `v_ord_leg_key`, không khoá ngoại (trigger LC-09 lúc mở suất + kiểm định kỳ R-VC-19 — R-P19); tham chiếu logic `passenger_key` → `ord_passenger` qua view `v_ord_passenger_key`, không khoá ngoại (person_key — trigger LC-10 lúc mở suất / gắn tên + kiểm định kỳ R-VC-19 — R-P19) |
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

## lan-gui

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `lg_lan_gui` | bảng | vé chống ghi trùng (ADR-0094, migration 0074): dữ liệu KỸ THUẬT, không dữ liệu cá nhân — mỗi dòng một Idempotency-Key của một lệnh ghi có đăng nhập, chèn CUỐI lô ghi đầu tiên thành công của lệnh (có vé ⇔ lô đã ghi). Khoá chính (staff_id, khoa), WITHOUT ROWID; van_tay = HMAC (khoá LAN_GUI_SECRET); duong = mẫu route; ket_qua = đường dẫn nội bộ chỉ chứa id. Không xoá ở bản này (đường dọn theo thời hạn: bản sau, A-11) |
| `lg_chinh_sach_giu` | bảng | thời hạn giữ vé (ADR-0094 đ8a, migration 0074): dữ liệu kỹ thuật; dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ; chỉ thêm (trigger cấm sửa/xoá); so_ngay NULL = Không dọn; sàn cứng 90 ngày ở CHECK; gieo 365 ngày |

## pricing

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `prc_beneficiary_role` | bảng | danh sách vai hồ sơ được hưởng hoa hồng (ADR-0077 điều 3, C3 = A; migration 0090): gieo năm vai (Công ty lữ hành, HDV độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên). Không xoá; tắt một vai bằng active = 0 (dòng mức cũ vẫn giữ, R-PRC-2 báo) |
| `prc_commission_rule` | bảng | bảng mức hoa hồng đối tác (ADR-0077 điều 4; migration 0090), chính sách có hiệu lực: áp cho một hồ sơ HOẶC cho một vai; phạm vi dịch vụ / nhóm / mọi dịch vụ; kiểu tỷ lệ (phần vạn) hoặc đ/khách. Không xoá, chỉ đóng hiệu lực một lần, không hai dòng cùng đối tượng + phạm vi chồng khoảng ngày; đối tượng phải mang vai đang bật trong prc_beneficiary_role. Tỷ lệ và đ/khách KHÔNG vào DTO của Đối tác (C9 = A) |
| `prc_supply_term` | bảng | điều khoản cung ứng — người bán của dịch vụ (ADR-0078 điều 2; migration 0090), chính sách có hiệu lực: phạm vi dịch vụ / nhóm / mọi dịch vụ. Người bán = công ty chủ thì không có nhà cung cấp; người bán khác phải đang mang vai SUPPLIER và có tỷ lệ mua lại a% (cost_rate_bp). Không xoá, chỉ đóng một lần, không chồng; dòng ALL chỉ cho công ty chủ; luật X3: không ghi a% cho nhóm Thuê xe (TXE). Gieo một dòng ALL của công ty chủ từ 2025-01-01. a% KHÔNG vào DTO của Đối tác |
| `v_prc_beneficiary_role` | view công bố | cột: role_type_code |
| `v_prc_commission_rule` | view công bố | cột: id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date |
| `v_prc_supply_term` | view công bố | cột: id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date |

## ky-so

| Đối tượng | Loại | Ghi chú |
|---|---|---|
| `ky_period_close` | bảng | tháng đã khoá sổ (ADR-0080 D1; migration 0090), CHỈ-THÊM và KHÔNG có đường mở lại: period 'YYYY-MM' là khoá chính; bảng rỗng thì khoá tháng nào cũng được, sau đó chỉ tháng liền kề sau tháng lớn nhất. Bốn trigger *_period_closed (bil_payment_receipt, bil_posting, bil_outside_refund, vc_trip_cost_line) chặn dòng mới có ngày phát sinh thuộc tháng đã khoá. Khoá nhầm chỉ cứu bằng khôi phục Time Travel |
| `v_ky_closed_period` | view công bố | cột: period |

## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)

- `audit_log` → `staff` — audit_log.staff_id — ADR-0002 điều 6
- `audit_log` → `orders` — audit_log.order_id — ADR-0002 điều 6
- `catalog_override` → `staff` — catalog_override.updated_by — ADR-0002 điều 6
- `company_profile` → `staff` — company_profile.updated_by — ADR-0002 điều 6
