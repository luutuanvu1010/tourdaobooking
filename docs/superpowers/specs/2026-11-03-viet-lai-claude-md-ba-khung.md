# Viết lại CLAUDE.md, đưa Oracle, Kernel 18, MWG thành ràng buộc (2026-11-03)

> **Trạng thái:** đã thi công trên nhánh riêng, chờ chủ dự án đọc và nhập. Quyết định: ADR-0160. Hồ sơ có ngày: viết xong là đóng băng. Bản này đi sau và trỏ về `docs/superpowers/specs/2026-11-03-rut-gon-claude-md.md`; bản đó giữ nguyên, kể cả thư mục bản nháp của nó (bản nháp `.claude/rules/` không dùng nữa, lý do ở ADR-0160 Đ5).
>
> **Lệnh của chủ, nguyên văn:** «Hãy dùng triết lý Oracle, 18 kernel, 5 trụ cột của MWG trở thành các ràng buộc và tham chiếu cụ thể được chỉ dẫn trong CLAUDE.md , sau đó bắt đầu tiến hành tái cấu trúc và viết lại CLAUDE.md».

## 1. Tiêu chí nghiệm thu (viết trước khi làm, P20)

| Mã | Hành vi kiểm được | Cách kiểm |
|---|---|---|
| B1 | Giữ nguyên số mục §1–§10 và chủ đề từng mục. Mọi chỗ trích `CLAUDE.md §N` ở hook, trợ lý con, kịch bản, hai tệp `CLAUDE.md` thư mục, Hiến chương vẫn trỏ được; các cụm chữ hook trích vẫn còn đúng mục | `src/claude-md-gioi-han.test.ts`, đã thấy đỏ |
| B2 | Không mất luật: mỗi dòng của `CLAUDE.md` cũ có nguyên văn ở bản mới hoặc ở tệp con, hoặc có tên trong bảng mục 3 dưới đây | Một lệnh so chữ chạy một lần, kết quả ghi ở mục 4; người kiểm độc lập chạy lại |
| B3 | §2 có khối ba khung, mỗi ràng buộc có nguồn. Điều luật, ADR, trụ cột được trích đều có thật. `docs/kernel-18.md` nhắc đúng một lần ở `CLAUDE.md` gốc (KERNEL-18: «chỉ thêm một dòng chỉ đường», không chép nội dung) | Cùng bài kiểm, đã thấy đỏ |
| B4 | `CLAUDE.md` gốc không vượt trần mới, trần sát cỡ thật; mỗi `CLAUDE.md` con không quá 4 KB | Cùng bài kiểm, đã thấy đỏ |
| B5 | `CLAUDE.md` con tự nạp trong một phiên mới khi đọc tệp ở thư mục đó; không nạp khi đọc tệp thư mục khác | Chạy phiên mới một lần, tìm câu đánh dấu trong nhật ký phiên, kết quả ghi ở mục 4 |
| B6 | Mọi `CLAUDE.md` con nằm trong gói gửi trợ lý trên mây (ADR-0145 Đ3) và được §10 gốc trỏ tới | Cùng bài kiểm, đã thấy đỏ |
| B7 | `npm test`, `npm run typecheck` xanh; người kiểm độc lập đã đọc | Lệnh và báo cáo người kiểm |

## 2. Các câu của đề xuất trước: tôi tự áp khuyến nghị, chủ đã ra lệnh viết lại

| Câu | Đã chọn | Lý do | Hoàn tác |
|---|---|---|---|
| Q1 ngưỡng cỡ | Làm đợt này, không ép 19 KB; đo thật ở mục 4; ghi ngoại lệ có hạn với mức 4 KB của Framework | Giữ nguyên chữ luật an toàn hơn nén gấp | Hạ trần ở đợt sau |
| Q2 dời bẫy | **Đổi so với khuyến nghị:** `CLAUDE.md` con cạnh mã thay cho `.claude/rules/` | Gói trợ lý trên mây không chứa `.claude/` (ADR-0145 Đ3), bẫy dời vào đó sẽ biến mất với trợ lý đó; tệp con trong `src/` vẫn được gửi. Đây là phương án dự phòng đã nêu ở Q2, đổi vì lý do mới | Chuyển chữ về `CLAUDE.md` gốc hoặc sang `.claude/rules/` |
| Q3 hai dòng trỏ | Thêm Governance, Framework vào §2, không thêm tầng mới | Chuỗi ưu tiên phải khớp Hiến pháp đang ghim 2.3.0 | Xoá dòng |

## 3. Bảng dòng không còn nguyên văn (B2)

Dòng nào không có ở đây thì giữ nguyên văn ở bản mới hoặc tệp con.

| Mục cũ | Đổi thế nào | Chữ đầy đủ còn ở đâu |
|---|---|---|
| Đầu tệp | Thêm chỉ mục hai nửa theo Framework và câu về `CLAUDE.md` con | không mất gì |
| §3 câu hỏi gom một lần | Bỏ phần «Bài học Trang chủ mới 2026-09-23» | Quy tắc giữ nguyên; bài học là ví dụ |
| §3 Sổ hàng rào | Bỏ phần «Bài học 24/9» | Đầu `docs/SO-HANG-RAO.md` |
| §6 hàng Kernel 18 | Hàng còn đối chiếu và nâng ghim; dòng chỉ đường Kernel 18 chuyển lên §2 | §2, `docs/kernel-18.md` |
| §6 hàng Thiết kế mới | Thêm lời trỏ tới ba khung ở §2 | không mất gì |
| §7 Bảo mật | Bỏ chi tiết `staff_updated` lặp lại | `src/CLAUDE.md` mục Quyền và bảo mật |
| §8 hai dòng hàng rào | Gộp một dòng; bỏ lời trỏ đặc tả, ví dụ lệnh, lịch sử gỡ cổng xanh; giữ kết luận và trỏ sổ | `docs/SO-HANG-RAO.md`, các dòng Cổng xanh, Tệp cấm sửa, Không sửa tệp luật bằng dòng lệnh |
| §8 chuỗi triển khai | Rút còn bước A.0, `npm run trien-khai` và lời trỏ | `docs/HANDOFF-N1.md` mục «HAI LỆNH», `docs/QUY-TRINH-PHAT-HANH.md`, `scripts/trien-khai.mjs` |
| §9 Bước ghép | Giữ điều kiện và trần 3 quyết định; nội dung trang ghép và «Bài học 20/9» sang mục lục ADR | `docs/adr/README.md` |
| §10 Lỗi 7403 | Rút còn điều AI phải làm và không được làm; bỏ ngày gặp, giả thuyết, cách phòng ngừa | `docs/QUY-TRINH-PHAT-HANH.md` mục cùng tên |
| §10 Cột chết | Bỏ khỏi gốc vì trùng; thêm hai giá trị hằng vào `src/CLAUDE.md` | `src/CLAUDE.md` mục Dữ liệu |
| §10 `orders` không import | Bỏ khỏi gốc vì trùng | `src/CLAUDE.md` mục Ranh giới module, đầy đủ hơn |
| §10 Turnstile, Face ID | Dời nguyên văn | `src/modules/auth/CLAUDE.md` |
| §10 Chế độ bảo trì | Dời nguyên văn | `src/modules/maintenance/CLAUDE.md` |
| §10 Hồ sơ công ty chủ, Giấy tờ + `DRIVER` | Dời nguyên văn | `src/modules/parties/CLAUDE.md` |
| §10 Điều phối xe | Dời nguyên văn | `src/modules/van-chuyen/CLAUDE.md` |
| §10 Giờ đón, điểm đón | Dời nguyên văn | `src/modules/orders/CLAUDE.md` |

## 4. Kết quả đo

Đo ngày 2026-11-03, người thi công; người kiểm độc lập chạy lại riêng.

- **Cỡ `CLAUDE.md` gốc:** từ 30.638 byte, 4.571 từ xuống 27.435 byte, 3.970 từ, 137 dòng. Đã bỏ khỏi gốc khoảng 6 KB bẫy theo vùng; đã thêm 2,7 KB khối ba khung và 0,7 KB câu trỏ, luật phiên, chỉ mục. Con số 24 KB ở đề xuất trước chưa tính khối ba khung. Trần mới 27.800 byte.
- **B2:** 118 dòng cũ có chữ, 105 dòng còn nguyên văn (98 ở gốc, 7 ở năm tệp con), 13 dòng khác, cả 13 có tên ở bảng mục 3.
- **B5:** bốn phiên mới `claude -p` trên kho này, đọc mục `nested_memory` trong nhật ký phiên. Đọc tệp ở `src/modules/maintenance` bằng công cụ đọc: có tệp con. Đọc tệp ở `src/modules/feedback`: chỉ có `src/CLAUDE.md`. Chạy `head -3` một tệp ở `src/modules/maintenance`: có tệp con. Chạy `grep -rlc` trên `src/modules`: không có mục `nested_memory` nào. Ghi ở `RANG_BUOC_NGOAI.md` A4. Chưa thử phiên trên web.
- **B1, B3, B4, B6:** 24 phép phá trên bản sao tạm, cả 24 đỏ đúng bài, hoàn nguyên xanh. Danh sách ở `docs/SO-HANG-RAO.md`.
- **Máy kiểm Kernel 18 của kho luật gốc:** trước khi sửa KHÔNG ĐẠT 2 lỗi (dòng 12, 13 quá hạn 31/10). Dòng 13 chép lệch `docs/quyen-hoan.json`, đã bỏ ngày chép lại. Sau khi sửa KHÔNG ĐẠT 1 lỗi: dòng 12 (`PH-TDS-01`), chờ chủ quyết.
