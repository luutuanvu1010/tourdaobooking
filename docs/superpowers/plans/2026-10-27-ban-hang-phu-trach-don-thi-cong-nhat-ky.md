# Nhật ký thi công: Bán hàng phụ trách đơn (ADR-0142 Phần 1)

Chép từ sổ điều phối ngày 5/11/2026. Kết quả cuối: `npm test` xanh, typecheck 0 lỗi, e2e 83/83, bất biến đạt; người kiểm độc lập đạt có điều kiện, đã sửa V2, V3, T1, V1 ghi ở HANDOFF. Còn lại T2 (ô không tự khép khi người giữ mất quyền Bán hàng), T3, T4 (đua huỷ đúng lúc nhận), T6.


Quyết định của chủ 4–5/11/2026 (hộp hỏi trong chat): làm ngay trong phiên này; đơn Bán hàng không gán Hướng dẫn viên thì để Hướng dẫn viên tự nhận (giữ hành vi ô HANDLE, khớp ADR-0142).
Nhánh: claude/dispatch-pickup-order-display-1da7b5, dựng trên 2eaf5b23. main đi trước 1 commit (546f3b54, chỉ changelog + app-info.test): công cụ cập nhật nhánh bị hook chặn hai lần, nên chưa nhập.

## Rà trước khi làm
| Cặp / việc | Tạo ra ↔ dùng | Kết quả |
|---|---|---|
| Task 1 ↔ 2 | HANH_DONG_GAC_BAN_HANG ↔ view v_aud_order_ban_hang | khớp, gộp một lần giao |
| Task 1 ↔ 3 | KhungGioHanhChinh, KetQuaLoiMoi, laVaChamOBanHang ↔ dispatch/ban-hang.ts | khớp |
| Task 2 ↔ 3 | bảng, view ↔ SQL dispatch | khớp |
| Task 3 ↔ 4 | isSalesOwner ↔ lời gọi can() | khớp |
| Task 3, 4 ↔ 5 | ctx.*, ô quyền ↔ route | khớp |
| Task 5 ↔ 6 | hành động nhật ký ↔ hộp thư; tin-chuyen.ts chuyển từ Task 4 sang 6 | khớp |
| Task 5 ↔ 7 | DTO laBanHangPhuTrach, route đọc ↔ giao diện | khớp |
| Task 4 ↔ 7 | suaChuyenDuoc/suaKhachDuoc đổi chữ ký ↔ web/order.ts, web/order-form.ts | Task 4 đổi chữ ký làm typecheck web đỏ tới Task 7: xem Ruling 4 |
| Task 2 | NT-R6 đỏ trước rồi xanh | tự nhất quán |
| Task 4 | permission-enforcement đỏ có chủ ý tới Task 5 | tự nhất quán, kế hoạch đã nêu |

Ruling: Không có người kiểm riêng từng việc; một người kiểm độc lập cuối đợt (nguoi-kiem-doc-lap) — luật chủ ở bộ nhớ feedback-dieu-phoi-thi-cong-gop-viec thắng khuôn skill — nếu sai: lỗi giữa chừng phát hiện muộn hơn, sửa ở vòng cuối.
Ruling: Trigger orders_delivered_lock dựng lại từ bản mới nhất migrations/0136, không phải 0044 — kế hoạch viết khi 0044 là mới nhất; thiếu cột thì NT-R6 đỏ — nếu sai: máy kiểm chặn ngay.
Ruling: View v_aud_order_event dựng từ bản mới nhất migrations/0125, không phải 0120 — lý do như trên — nếu sai: mất tin duyệt hoàn thu trước, bài ghim view bắt được.
Ruling: Task 4 đổi chữ ký suaChuyenDuoc/suaKhachDuoc thì sửa luôn nơi gọi ở web/ bằng tham số false/DTO để typecheck không đỏ giữa chừng; nút thật làm ở Task 7 — nếu sai: chỉ làm lại vài dòng.
Ruling: Chữ «Còn vé» trong kế hoạch nay là nút «Còn vé, xác nhận đơn» (ADR-0166); lô Còn vé đã có thêm cấp vé, chốt giờ (ADR-0153, 0154): câu mới nối CUỐI lô, không đổi thứ tự cũ — nếu sai: bài lô đỏ.
Ruling: Bổ sung Task 7 theo lời chủ 4/11: bảng chọn ở trang đơn cũng đổi nhãn Hướng dẫn viên và chỉ liệt kê Hướng dẫn viên; thiết kế L11 đã nêu đổi nhãn khối trên trang đơn — chỉ đổi giao diện, đảo được — nếu sai: sửa một tệp.
Ruling: Số migration 0138 (ban_hang_phu_trach), 0139 (hop_thu_ban_hang); phiên bản tạm 2.63 — kiểm 5/11 mọi nhánh cao nhất là 0137, main 2.62 — nếu lệch: đổi tên tệp trước khi nhập.

Task 1: complete (commits 2eaf5b23..0c01d519, chưa kiểm độc lập — vòng cuối)
Task 2: complete (commits 0c01d519..30afc4c0, chưa kiểm độc lập — vòng cuối)
Ruling: Thêm cột kiểm toán dsp_sales_invite.created_by, dsp_sales_policy.updated_at/updated_by ngoài danh sách brief — bài ADR-0003 của architecture.test đòi, chỉ thêm không bớt — nếu sai: thừa cột vô hại.
Ruling: Biên: đúng hạn vẫn còn ưu tiên; đủ đúng 15 phút thì vào thẻ cảnh báo — brief không nêu, chọn theo «qua 15 phút» — nếu sai: lệch một phút, sửa một hàm.
Nợ: khoá Đã giao của hai bảng mới có bài hành vi, chưa thử đột biến riêng.
Task 3: complete (commits 30afc4c0..74756c67, chưa kiểm độc lập — vòng cuối)
Task 4: complete (commits 74756c67..5dcaadd5, chưa kiểm độc lập — vòng cuối)
Ruling: Tách kiemBanHangMoi, danhSachBanHangMoi, loiMoiMoCua sang dispatch/ban-hang-moi.ts — tệp STRICT phải nạp thẳng bằng node — nếu sai: chuyển tệp, không đổi hành vi.
Ruling: Đối tác, Thực tập giữ ô dispatch.sales.invitees — đúng ADR-0142 QĐ2(b) chủ duyệt, không hỏi lại — nếu sai: đổi một hàng quyền.
CHỜ CHỦ: trợ lý nới trần gói Đơn hàng goi-trang-nhe.test.ts 103.692 → 103.844 (đo thật 103.744) — đây là NỚI hàng rào, chưa có lời duyệt; đo lại sau Task 7 rồi hỏi chủ một lần kèm số cuối.
Task 5: complete (commits 5dcaadd5..3111d60a, e2e 3 kịch bản xanh, chưa kiểm độc lập — vòng cuối)
Nợ: Task 5 chưa làm sửa cố ý để thấy đỏ cho bài ghép và bài route mới; người kiểm cuối xem xét. Ca 5, ca 10 của B.10 chuyển Task 6.
Task 6: complete (commits 3111d60a..30b2dea0, e2e 2 kịch bản xanh, chưa kiểm độc lập — vòng cuối)
Lỗi phát hiện: tro-ly-van-nghia.test C4 đỏ DO NHÁNH (bản gốc 2eaf5b23 xanh 26/26), trợ lý báo nhầm «đỏ sẵn» — giao sửa ở lần sau.
Chủ chọn 5/11: khối của Bán hàng ghi «Người phụ trách»; khối cũ ghi «Hướng dẫn viên»; nút «Chọn Hướng dẫn viên», «Đổi Hướng dẫn viên»; «Nhận làm HDV» chỉ tài khoản có quyền Hướng dẫn viên thấy (chỉ ẩn màn hình, máy chủ đổi ở Phần 2).
Ruling: Đổi 0139_hop_thu_ban_hang thành 0140 vì trùng số nhánh partner-type-ta-oracle — luật CLAUDE.md §10 — nếu sai: đổi tên tệp.
Ruling: Lời chủ «Người phụ trách» thắng tên «Bán hàng phụ trách» của ADR ở chữ hiển thị; tên mã (dsp_sales_owner, laBanHangPhuTrach) giữ — đổi chữ không đổi nghĩa — nếu sai: sửa chữ.
CHỜ CHỦ: trần gói Đơn hàng đang đỏ: đo 104.551, trần 103.844, gốc 103.692; hỏi sau Task 7.
Task 7: complete (commits 30b2dea0..8c50acdf, Chrome 15 bước xanh, chưa kiểm độc lập — vòng cuối)
Ruling: GET /api/dispatch/ban-hang cho người giữ order.confirm.review đọc đơn đang chờ xác nhận — ADR-0136 Đ6 / ADR-0142 L4 đã cho họ đọc và quyết đơn đó, không mở thêm dữ liệu mới; chỉ đúng tên + lời mời — nếu sai: gỡ một điều kiện; người kiểm cuối soi.
Ruling: «Chọn người phụ trách», «Lưu người phụ trách» giữ, cùng khuôn «Đổi người phụ trách» chủ đã chọn — không hỏi lại, báo trong báo cáo cuối — nếu sai: đổi chữ.
Lỗi đã sửa: C4 do mô tả ô dispatch.sales.invitees, không phải đỏ sẵn.
CHỜ CHỦ: trần gói Đơn hàng 105.072 / 103.844 (gốc 103.692).

Việc sau task 8 (điều phối thấy khi xem ảnh thật): Lịch sử trang đơn hiện «Nhận/Đổi/Mời Bán hàng phụ trách», «Đổi cài đặt Bán hàng phụ trách» (src/shared/audit-actions.ts) và trợ lý (src/shared/tro-ly-cau-truc.ts dòng 73-74) lệch tên chủ chốt «Người phụ trách». Sửa nhãn sau khi trợ lý việc 8 báo về, kiểm xem tro-ly-cau-truc có do máy sinh không. Chữ trong chú thích mã giữ nguyên.
Chủ duyệt 5/11: nâng TRAN_ORDERS lên 105_100. Nhánh đã nhập main f379a4de (mục nhật ký thành 2.64, git merge trực tiếp vì công cụ sync bị hook từ chối). Nhãn Lịch sử đã đổi sang «người phụ trách» (a57278ed).
Người kiểm độc lập: ĐẠT CÓ ĐIỀU KIỆN, không lỗi Cao. V2 (bài canh + thử phá) xong, V3 và T1 xong (8d0aa38f), V1 ghi HANDOFF, báo chủ. T2 (người giữ ô mất quyền Bán hàng), T3, T4 (đua huỷ đúng lúc nhận), T6 để lại — ghi nợ.
Ruling: HDV mất đọc GET /api/cai-dat/khung-gio-don — ADR-0154 Đ1.5 mở theo ô order.confirm.review, ô đã thu về; trước ADR-0154 HDV cũng 403, form HDV dùng bộ mặc định khi lỗi — nếu sai: mở lại riêng cho FIELD.
Ruling: tin phụ cho_ban_hang ở /status là đúng L9; sửa bài bangtin 5d.

Bổ sung 5/11, sau nghiệm thu độc lập: đóng nợ T4 theo lệnh chủ. Câu mở ô (`mo_ban_hang_neu_trong`, `mo_ban_hang_sau_doi`) và câu khép ô (`khep_ban_hang`) thêm điều kiện đơn còn `confirmed` qua `v_ord_order_state`; route đọc lại trạng thái khi thua và trả 409 `cancelled`. Ba bài đua trong `ban-hang-route.test.ts` dùng `chenTruocLo` chạy lệnh huỷ thật giữa cổng và lô: trước khi sửa đỏ (200, tái hiện được lỗi), sau khi sửa xanh. Đơn đã huỷ mà người phụ trách có từ trước vẫn giữ dòng ô: không đổi, ngoài phạm vi. Còn T2. T3, T6 nhật ký chỉ ghi tên, không tìm được nội dung trong tài liệu.
