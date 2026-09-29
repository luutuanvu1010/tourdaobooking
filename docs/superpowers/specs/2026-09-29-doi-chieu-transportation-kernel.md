# Đối chiếu tài liệu tham khảo "Transportation Kernel" với thiết kế Vận chuyển đã duyệt (2026-09-29)

- **Trạng thái:** tài liệu MÔ TẢ (không chuẩn tắc). Chủ yêu cầu 29/9 ("Có, đối chiếu và báo"). Một trợ lý chỉ đọc so sánh; điều phối tóm lại. **Chưa có ý nào ở đây được duyệt** — ý chạm dữ liệu/quyền phải qua ADR mới do chủ duyệt.
- **Nguồn:** [REF] `docs/Ref/transportation-kernel-travel-erp.md` (tài liệu chủ đặt, 338 dòng); [0040] [0047] [0048] [0049] = `docs/adr/ADR-00xx-…md`; [TK] `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md`; [HĐ] `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`; [HC] `docs/ARCHITECTURE.md`; [KH] `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md`; [L2], [L3$] = `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md`, `…-luot-3.md` (chưa duyệt).

## Kết luận

Phần lớn khung của [REF] đã có tương đương trong thiết kế đã duyệt, thường theo cách gọn hơn và hợp nền D1/SQLite + một Worker. Thiếu thật năm chỗ (mục "Ý đáng học"). Sáu chỗ [REF] mâu thuẫn với Hiến chương, ADR đã duyệt hoặc ràng buộc dự án, cộng một chỗ chưa chắc — văn bản đã duyệt là chuẩn tắc (CLAUDE.md §2).

## Đối chiếu từng khái niệm

| Khái niệm [REF] | Chỗ tương ứng đã duyệt | Xếp loại |
|---|---|---|
| Tách 3 sổ Nhu cầu / Năng lực / Sự thật (:35) | Nhu cầu = `ord_transfer_leg` + `ord_passenger` ([0047]); Thực thi = `vc_trip*` ([0049]); Năng lực suy ra từ chính chuyến | có, khác cách |
| Không cờ BUSY, chặn trùng ở CSDL (:36) | LC-03 trigger + chỉ mục một chuyến RUNNING mỗi xe ([0049]:125) | đã có (trigger thay EXCLUDE; giả định D1 chạy lô lần lượt chưa kiểm) |
| Command Gateway, khoá lặp, command_log (:37, :101) | Khuôn lệnh [HC] 1.2; câu cổng `version` + dấu lệnh ([0049]:98–108); `request_id` UNIQUE; nhật ký nối 1-1 | đã có, khác nhẹ |
| Requirement có phiên bản (:78) | Chặng; sửa sau xác nhận = cập nhật + nhật ký trước→sau ([0047]) | có, khác cách |
| Movement Unit (:79) | Chặng = nhóm khách một dịch vụ, một chiều; hành lý / nhu cầu đặc biệt chưa có | có, khác cách |
| Commitment — hạng xe / xe riêng hứa với khách (:80) | Không có; máy không cấm ghép ([TK]:166) | **chưa có, chưa ai lên kế hoạch** |
| Time Window neo sự kiện ngoài (giờ hạ cánh + 30') (:81) | Giờ hẹn cố định trên chặng | **chưa có** |
| Resource xe + tài xế chung bảng (:85) | Xe là tài sản `vc_vehicle`; tài xế là hồ sơ người (Hiến chương 2.1) | có, khác cách — cách đã duyệt hợp hơn |
| Qualification tại giờ chạy (:86) | Giấy tờ, hạng bằng, LC-12, cổng xuất bến ([0049]:174, :189) | đã có |
| Duty Period / ca (:87) | Khoảng nghỉ ([0049]); báo bận tài xế D9 (lượt 3, chưa duyệt); giờ lái tối đa "để sau" | một phần |
| Reservation: giữ chỗ, đệm, bảo dưỡng (:88) | Giờ dự kiến trên `vc_trip` + LC-03 + khoảng nghỉ; khung bận **của xe** chưa có ([L2]:347 "để sau") | có, khác cách; thiếu khung bận xe |
| Trip (:92) | `vc_trip` kế hoạch + thực thi một thực thể | đã có |
| Stop & Activity (:93) | `vc_trip_stop` + suất có điểm lên/xuống; cột có kiểu thay JSON | có, khác cách |
| Allocation nhiều–nhiều (:94) | `vc_trip_allocation` mỗi người một suất (danh sách hành khách theo xe là chứng cứ pháp lý) | có, khác cách — cách đã duyệt hợp hơn |
| Fulfillment / nhà xe / gửi thầu (:95) | `carrier_party_id` chụp lúc xếp; nhà xe chưa có tài khoản ([0048]); hợp đồng để sau | một phần — đủ ở quy mô này |
| Assignment xe/tài xế hai dòng, supersedes (:96) | Tài xế: `vc_trip_driver` có hiệu lực; xe: cột trên chuyến, chỉ đổi khi chưa chạy | có, khác cách (phần xe) |
| Operational Event hai mốc thời gian (:97) | `vc_trip_event`; giờ do máy chủ ghi (LC-11); thiếu "giờ xảy ra thật" khi văn phòng bấm thay | có, thiếu một mốc |
| Incident (:98) | "Kết thúc gián đoạn"; sự cố không dừng chuyến chưa có bản ghi | một phần |
| Policy Engine có phiên bản (:102) | `vc_dispatch_policy`, `vc_departure_rule`, `vc_license_capacity`, `vc_reason`; chụp tại mốc | đã có |
| Transactional Outbox (:103) | Hiến chương 5.16; không Zalo/SMS; máy không liên lạc khách (LC-17) | đã có (nguyên tắc) |
| SDR đóng băng khi xong chuyến (:106) | Bản chụp lúc xuất bến đã có; lúc kết thúc chưa; chi phí nhà xe ở [L3$] (chưa duyệt) | một phần |
| Tự xếp xe hai bước (:303) | Gợi ý xếp MQ-01 (lượt sau, chưa duyệt), không tự ghi | chưa có, đã lên kế hoạch |
| Party & Role, Place, Time Engine (:46–48) | ADR-0001, [0048] (CARRIER, DRIVES_FOR), `loc_location` | đã có / một phần |

## Chỗ [REF] mâu thuẫn với điều đã duyệt (chỉ nêu, không phán)

- **M1 — JSON tự do** ([REF]:129, :152, :203, :244, :271 `…JSONB`) ↔ Hiến chương 5.2 ([HC]:93) "không dùng trường mở rộng tự do (JSON không lược đồ) cho dữ liệu nghiệp vụ"; [0049]:184 "không JSON".
- **M2 — "Không UPDATE", mọi thứ là sự kiện** ([REF]:37) ↔ [HC] 4.1 (:79) "không dựng event sourcing; trạng thái hiện hành nằm trong bảng, chuyển trạng thái ghi nhật ký cùng lô"; [0049]:96. (Chưa chắc: lược đồ của chính [REF] có `status`, `updated_at`.)
- **M3 — Tính tiền thu khách từ hồ sơ chuyến** ([REF]:107, :318) ↔ [0047]:69 "chặng không mang tiền; giá đưa đón do danh mục quyết".
- **M4 — Đổi xe/tài xế khi xe đang chạy** ([REF]:310) ↔ [0049] LC-15 (:133) "chuyến đang chạy khoá hẳn kế hoạch"; xe hỏng → "Kết thúc gián đoạn" + chuyến cứu hộ.
- **M5 — PostgreSQL + btree_gist** ([REF]:113, :293) ↔ ràng buộc dự án CLAUDE.md §1 (Cloudflare Worker + D1/SQLite, không dependency runtime).
- **M6 — Sổ kế toán VAS/IFRS tự động** ([REF]:319) ↔ [HC] 4.3 (:83) "sổ thuế / chuẩn mực kế toán nhà nước: chưa làm".
- **M7 (chưa chắc) — Tự xếp xe** ([REF]:287, :299): nếu máy tự ghi việc xếp thì chạm Hiến chương 5.11 (tác nhân tự động phải có tài khoản riêng) và K1; [TK]:552 đã ghi cần ADR riêng.

## Ý đáng học (hợp quy mô; CHƯA duyệt — mỗi ý chạm dữ liệu/quyền phải qua ADR mới)

1. **Cam kết "xe riêng / không ghép" + hạng xe tối thiểu** trên dịch vụ hoặc chặng → máy chặn hoặc cảnh báo khi xếp ghép / xếp xe nhỏ hơn. Gắn luôn câu pháp lý còn treo (NĐ 158/2024 về xe hợp đồng thuê cả xe — chưa có người chuyên môn kiểm). Gợi ý gộp lượt 4 (D10). Chủ cần chọn: chặn cứng hay cảnh báo.
2. **Khung bận của xe** (đăng kiểm, bảo dưỡng đặt trước) — mở rộng bảng báo bận D9 cho xe; LC-03 xét thêm. Gợi ý gộp lượt 3.
3. **Giờ lái tối đa của tài xế** — bản nhẹ: cộng giờ dự kiến các chuyến trong ngày, cảnh báo hoặc "giữ"; con số là cột chính sách (số liệu pháp lý tra 27/9 chưa có người chuyên môn kiểm).
4. **"Giờ xảy ra thật" khi văn phòng bấm thay** (tài xế gọi báo đón lúc 7:31, văn phòng bấm lúc 7:45): thêm ô "xảy ra lúc" có kẹp (không tương lai, không trước xuất bến). **Chạm câu chủ đã chọn "giờ theo máy chủ"** ([HĐ] Q2, LC-11) → ADR mới. **Nên quyết trước khi migration chuyến xe (`0042`, `vc_trip_event`) được áp**; thêm sau vẫn được nhưng dòng cũ không có giá trị.
5. **Số hiệu chuyến bay trên chặng sân bay** (chỉ ô chữ + giờ hạ cánh dự kiến; không tự tra) — tài xế tự tra khi máy bay trễ. Gợi ý gộp lượt 4. Nhu cầu thật chưa chắc.

## Không nên theo ở quy mô này

1. PostgreSQL / btree_gist / EXCLUDE — trái nền D1, trigger + lô lần lượt làm cùng việc.
2. Command Gateway trung tâm + bảng command_log, "không UPDATE" — trùng khuôn lệnh + nhật ký 1-1 + `request_id`, ghi "ai làm gì" hai chỗ, trái [HC] 4.1.
3. Sổ Reservation riêng (giữ tạm, khoá dài hạn) — chép giờ chuyến sang bảng thứ hai, trái "một nguồn"; vài xe, chuyến ≤ 24 giờ.
4. Tự xếp xe có chấm điểm, GPS, tin Zalo/SMS tự động — tác nhân tự động cần ADR + tài khoản riêng; vài chục chặng/ngày người xếp nhanh hơn; máy không nhắn khách (LC-17).
5. Tính tiền khách từ hồ sơ chuyến + sổ phụ VAS/IFRS — giá khách theo danh mục trên đơn; dự án giữ một sổ quản trị.

## Chưa kiểm
- `loc_location` có ô "hướng dẫn điểm đón" (cổng, sảnh) hay không.
- Nhu cầu thật: tour nhiều ngày cần giữ xe, khách mua xe riêng, tỉ lệ đưa đón sân bay.
- Số liệu pháp lý về giờ lái, ghép khách.
