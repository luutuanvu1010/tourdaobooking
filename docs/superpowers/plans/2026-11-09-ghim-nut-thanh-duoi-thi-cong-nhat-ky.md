# Nhật ký thi công — Tự chọn nút thanh dưới (ADR-0187 Đ2.3)

- Nhánh `claude/adr-0187-ghim-nut-9c2e31` (worktree `admin-delete-data-decision-31f0fc`). Đặc tả `docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md`, kế hoạch `docs/superpowers/plans/2026-11-09-ghim-nut-thanh-duoi.md`.
- Có migration `0153_thanh_duoi_ghim.sql` ⇒ sau `npm run day-len` cần `npm run trien-khai`. Bản tạm 2.81.

## Ruling (AI quyết, bề mặt hoặc đã có nguyên tắc — ghi lại theo P8)
- **R1 — Chữ giao diện.** Hỏi chủ một lần (hộp hỏi 9/11, có thể là phương án khuyến nghị tự chọn khi hết 60 giây); sau đó chủ nhắn qua phiên điều phối «không cần hỏi, làm theo phương án tốt nhất» ⇒ hai dòng Bảng tham chiếu để «chờ chọn», nguồn ghi lời đó. Các tên: tên mục «Nút thanh dưới», nút «Về mặc định», nhãn nhật ký «Đổi nút thanh dưới», phạm vi 11 trang có biểu tượng. Nút lưu dùng chữ dùng chung «Lưu». «Về mặc định» thành chữ dùng chung (màn Giao diện đã có nút cùng tên). Ba câu báo lỗi của máy chủ và dòng hướng dẫn «Chọn tối đa 4 trang. Nút Tôi luôn có.» do AI soạn — chủ đổi được.
- **R2 — Cổng là `ghimDuoc` = `hien` VÀ `moTrang`**, không phải `moTrang` một mình (giao việc ghi `moTrang`, nhưng hàm đó trả đúng cho mọi trang không khai nó, nên Bán hàng sẽ chọn được Sổ công nợ). Cùng một hàm ở máy chủ, danh sách chọn, lúc vẽ.
- **R3 — Đọc đi kèm `/api/auth/me` bằng cột con trong câu `find_by_id`**, không thêm câu đọc thứ tư (hàng rào `nen-moi-yeu-cau.test.ts` giữ nguyên 3 câu), không lưu ở trình duyệt.
- **R4 — Bảng một dòng mỗi tài khoản, ghi đè tại chỗ**; «Về mặc định» đặt cột NULL, không xoá dòng. Lịch sử ở nhật ký. Lý do: sở thích hiển thị, không phải dữ liệu nghiệp vụ; `group_concat` không giữ thứ tự nên không tách mỗi trang một dòng.
- **R5 — Thứ tự nút** = thứ tự trong danh sách chọn (thứ tự `THANH_TAB`), không cho kéo đổi chỗ (phạm vi nhỏ nhất). Máy chủ vẫn lưu đúng thứ tự gửi lên.
- **R6 — Chưa chọn gì thì trang Tôi đánh dấu sẵn các nút máy đang xếp**, người dùng chỉ việc đổi. Đủ 4 ô thì các ô còn lại bị khoá (phải bỏ một ô trước).
- **R7 — Đang «xem như vai trò khác»**: `currentStaff` bỏ trường; `ghimHieuLuc` trả null; route 403 `acting_role`, miễn có tên ở `xem-nhu-vai-khong-lo-toan-quyen.test.ts`.
- **R8 — Trần gói Đơn hàng** nới 109.777 → 110.358 (gốc 109.750, đo 110.258 + 100): phần vẽ nút đã chọn nằm ở khung mọi trang. Đã thu gọn (phần dựng danh sách, đọc cột, kiểm thân ở ngoài gói khung).
- **R9 — Ảnh mục ở trang Tôi**: dùng lại kiểu ô tích chung `label.check` + `o-tick` (lần chụp đầu bố cục vỡ vì kiểu ô nhập chung chiếm hết ngang — đã sửa trước khi gửi ảnh).

## Kiểm
- `src/thanh-duoi-ghim.test.ts` (9 bài, có bài trên mọi 2048 tập quyền); `permissions.test.ts` (ô mới ở mọi bài ghim dòng + bài 2048 tập con); SNAPSHOT 474 route.
- Hàng rào mới: dòng ở `docs/SO-HANG-RAO.md`, đã phá cố ý → đỏ 4 bài → hoàn nguyên → xanh (9/11).
- E2E `npm run test:e2e -- thanh-duoi-ghim xem-nhu-vai`: 5/5 xanh.
- Kịch bản Chrome `docs/evidence/2026-11-09-ghim-nut-thanh-duoi/kich-ban/thanh-duoi-smoke.mjs`: 5/5 bước, ảnh ở `…/anh/`.
- `npm test`, `npm run typecheck`, kịch bản `dot-0-smoke`, `mat-mang-smoke`, `dot-c-smoke`, kiểm độc lập: xem mục «Kết quả cuối» dưới.

## Việc chờ chủ
1. Xem ảnh trước / sau (375) và chữ R1; đổi câu báo nếu muốn.
2. Duyệt con số trần gói 110.358 (R8) — các lần nới trước chủ có lúc duyệt riêng.
3. Số bản 2.81 trùng được với nhánh `claude/ve-tour-dao-thi-cong` chưa nhập — nhánh nào nhập sau đánh lại số ở bước A.0.
4. Chạy `npm run day-len -- claude/adr-0187-ghim-nut-9c2e31` rồi `npm run trien-khai` (có migration 0153).

## Kết quả cuối
- `npm run typecheck`: 0 lỗi (9/11).
- `npm test` lần 1: 8478 bài, 8 đỏ — toàn bài ghim danh sách chưa cập nhật (số route ghi 268→269 ở `lan-gui-phu-route.test.ts`; `bottom_tabs_changed` chưa xếp tầng ở `cham-tai-khoan.ts`; ô mới chưa ghim ở dòng Đối tác `xem-don-theo-quyen.test.ts` và cột Quản lý bán hàng `quan-ly-ban-hang.test.ts`; route mới thiếu dòng ở `BANG_STAFF` của `tai-xe-cong.test.ts` (3 bài); bản sao CSS bộ v2 chưa sinh lại). Đã sửa, 6 tệp chạy lại 50/50 xanh. `npm test` lần 2: **8478 bài, 8474 đạt, 0 đỏ** (bước đo giờ 1/1), sau lần lưu 5a6b8801c.
- Kịch bản Chrome bắt buộc: `mat-mang-smoke` ĐẠT (có axe). `dot-0-smoke` đỏ bước 20 («900: Đăng xuất ở chân thanh bên») và `dot-c-smoke` đỏ («.account-layout phải display:grid») — **cả hai đỏ sẵn trên mã gốc fa3fd859a**: bước 20 chạy riêng trên bản sao tạm của gốc đỏ y hệt; `dot-c` đỏ vì `public/app.css` [10] (30/10, 67a4a0dc9) đổi trang Tôi máy tính sang kiểu chia cột mà kịch bản chưa sửa. Không do việc này; nợ kịch bản, ghi để phiên khác dọn.
- Kiểm độc lập (`nguoi-kiem-doc-lap`, 9/11): **ĐẠT**, không phát hiện mức cao; tự chạy typecheck + 187 bài + phép phá `ghimDuoc` (đỏ 4 bài). Mức vừa: trần gói +581 byte chưa có lời chủ duyệt (= việc chờ chủ 2). Mức thấp: bấm «Lưu» không đổi gì vẫn ghi một dòng nhật ký — chấp nhận (nhật ký chỉ thừa dòng, không sai quyền/dữ liệu).
