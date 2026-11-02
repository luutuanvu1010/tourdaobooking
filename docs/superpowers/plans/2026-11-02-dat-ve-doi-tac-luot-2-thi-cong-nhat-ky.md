# Sổ điều phối: đặt vé của đối tác, lượt 2

Kế hoạch: `docs/superpowers/plans/2026-11-02-dat-ve-doi-tac-luot-2.md`. Nhánh `claude/dat-ve-luot-2`, thư mục `.claude/worktrees/dat-ve-luot-2`, cắt từ `7ed7b18c` (đầu nhánh lượt 1), để lượt 1 nhập vào bản chính độc lập.

## Ruling của điều phối

- **R1 (2026-11-02):** áp bảy câu của kế hoạch theo khuyến nghị (lời chủ 2026-10-02). Sai thì sửa đúng task nêu ở cuối câu. Báo chủ trong báo cáo.
- **R2 (2026-11-02):** thi công theo từng đợt, mỗi đợt một trợ lý tầm trung làm hết các task của đợt, rồi một người kiểm đợt chỉ đọc (lời chủ về điều phối: gộp việc, giữ kiểm). Lỗi nhỏ gom sửa một lần ở cuối đợt.
- **R3 (2026-11-02):** không hỏi chủ giữa chừng trừ bốn trường hợp: thao tác không đảo ngược, an ninh, tác động ra ngoài thư mục này, kế hoạch hỏng tới mức mọi đường đều là đoán. Câu phát sinh chạm dữ liệu hoặc quyền mà ADR đã trả lời nguyên tắc thì áp và ghi ở đây; ADR chưa trả lời thì dừng đúng phần đó, làm tiếp phần khác, gom hỏi một lần (`CLAUDE.md` §3).

## Rà mâu thuẫn trước khi giao

| Hai task | Chạm chung | Kết quả |
|---|---|---|
| 1.1 → 1.2 | `cauMoYeuCau`, `YeuCauRow.pickup_time_required` | Khớp |
| 1.2 → 1.3 | `thieuGioChangDau(dichVu: { id, legs }[])` nhận dịch vụ có lượt, còn `legsMoi` ở Còn vé là danh sách phẳng | **Ruling R4:** nhóm `legsMoi` theo dịch vụ trước khi gọi, không đổi chữ ký hàm |
| 1.1 → 1.3 | `CON_MO` phải thêm `export` | Khớp, Task 1.1 khai |
| 1.1 → 1.4 | `R-ORD-17w` đọc `MIN(created_at)` của bảng chính sách; dòng gieo dùng `strftime('now')` theo khuôn 0119 | Khớp: mốc là lúc áp migration trên từng nơi |
| 1.2 → 3.1 | `changDauCuaDichVu` dùng ở máy chủ và form | Khớp, form chuẩn hoá ngày và id trước khi xếp |
| 2.1 → 2.2 | `orders.manifest_exempt`, `OrderDetailDto.manifestExempt`, `anKhachBat` | Khớp |
| 2.1 → 3.1 | `AnThongTinKhachResponse` | Khớp |
| 2.2 → 3.4 | `dieuKienXuatBen`, `nhacDieuKien`, `khongCan` | Khớp. Sau Đợt 2 và trước Task 3.4, màn chi tiết chuyến đếm dòng `khongCan` là chưa đạt; không phát hành giữa chừng nên chấp nhận |
| 1.x, 2.1 → 2.2 | Bước P16 sửa cố ý các bài (a2), (c), (g), (h6) | Khớp, các bài đã có trước Task 2.2 |
| 4.1 → 4.2 | `CapHienHanhDto` | Khớp |

Mỗi task tự khớp với bài của mình ở mức đọc kế hoạch. `v_stf_quyen_mo` đã có từ migration `0067`, cột `staff_id`, `permission_code`, chỉ quyền còn mở, nên đúng ý câu 3. Còn chưa chạy thử: tên khoá kết quả của khung thử với đơn đối tác, cách bọc `prepare` để đếm câu (kế hoạch mục «Chưa kiểm»).

## Tiến độ

| Đợt | Trạng thái | Người thi công | Người kiểm | Commit |
|---|---|---|---|---|
| 1. Dữ liệu và máy chủ giờ đón | đang làm | | | |
| 2. Công tắc, miễn thiếu tên | chưa | | | |
| 3. Giao diện ADR-0154 | chưa | | | |
| 4. Cột Cấp độ đại lý | chưa | | | |
| 5. Tài liệu, bộ kiểm dài, ảnh thật, kiểm độc lập | chưa | | | |

## Nợ và lỗi nhỏ gom lại

## Sửa cố ý đã thấy đỏ (P16)
