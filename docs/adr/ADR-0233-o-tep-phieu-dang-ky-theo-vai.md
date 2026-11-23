# ADR-0233 — Ô tệp của phiếu đăng ký theo vai; «Tệp khác»; 12 tệp mỗi phiếu

- **Trạng thái:** **accepted** 2026-11-22 — chủ dự án duyệt (chat, qua phiên điều phối kế hoạch 16 việc; hồ sơ `docs/superpowers/plans/2026-11-22-quyet-dinh-chu-ke-hoach-16-viec.md` trên nhánh `claude/partner-features-detailed-plan-f32f89`), câu 2 nguyên văn: «2- Duyệt đề xuất» — gồm ADR-0233 trong lượt các ADR 0223–0233. Câu 1 nguyên văn về diễn tập khôi phục: «1- Đồng ý khuyến nghị, và bỏ qua việc diễn tập khôi phục dữ liệu - ghi quyết định.» Lịch sử: **đề xuất** 2026-11-21 — AI (phiên thi công Việc 14 của kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md`).
- **Số:** 0233, migration 0191 — do phiên điều phối giữ trước cho Việc 14 (21/11).
- **Nguồn:** chủ dự án 21/11 giao Việc 14 «thêm ảnh, tệp khi đăng ký tài khoản»; kế hoạch mục 5 «Việc 14».
- **Loại:** việc lớn — dữ liệu cá nhân (loại tệp được thu), migration, luật thu thập (Hiến chương 5.21). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều. Bảng mới chỉ thêm dòng; tắt một ô = thêm dòng «ẩn» có ngày hiệu lực. Tệp đã thu giữ theo luật cũ (ADR-0208).
- **Quan hệ ADR cũ:** **thay** hằng ô tệp ghi cứng của ADR-0208 Đ2 và ADR-0212 Đ4 bằng bảng Đ1 (bốn ô cũ giữ nguyên tên, nghĩa, nơi lưu lúc duyệt). ADR-0208 Đ2 (trần cỡ, chữ ký tệp, bốn loại JPG/PNG/HEIC/PDF), Đ3 (không route đọc tệp bằng cookie đăng ký), Đ5 (chuyển tệp lúc duyệt): giữ. ADR-0212 Đ7 (phần tổ chức chỉ mở khi chính sách riêng tư có dấu): giữ, và Đ3 dưới đây chép khuôn đó.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục). Migration chỉ thêm một bảng `dk_`, một cột có mặc định 0 ở `pty_privacy_policy`, dựng lại hai view công bố của chính sách riêng tư, và một dòng `dk_policy` mới; không đổi dòng dữ liệu nào đang có, không chạm sổ tiền. Khoá cho phép: `xay_tren_cho_phep_adr_0233` ở `docs/quyen-hoan.json` (ghi 2026-11-22 sau lời duyệt; chủ bỏ qua diễn tập khôi phục).
- **Số quyết định chạm dữ liệu:** 3 (Đ1, Đ3, Đ4) — đúng trần một lượt duyệt.

## Bối cảnh (đọc mã 21/11)

Phiếu có bốn ô tệp ghi cứng (`O_TEP_PHIEU`, `src/modules/dang-ky/rules.ts`): căn cước mặt trước, mặt sau (luôn hiện), ảnh GPKD và giấy phép thêm (chỉ khi phiếu có phần tổ chức). Máy chủ chỉ đòi ảnh GPKD lúc gửi; ảnh căn cước không bắt buộc. Mỗi ô giữ một tệp (gửi tệp mới thay tệp cũ), trần 8 tệp mỗi phiếu tính cả tệp đã thay (`dk_policy.photo_max_count`). Lúc duyệt, mọi tệp không phải ô tổ chức nối vào dòng căn cước của hồ sơ người; ô tổ chức nối vào dòng GPKD / giấy phép thêm của hồ sơ tổ chức.

## Quyết định

**Đ1 — Bảng «vai ↔ ô tệp ↔ bắt buộc / tuỳ chọn / ẩn», có ngày hiệu lực.** Bảng mới `dk_role_slot` (module `dang-ky`, chỉ thêm dòng; dòng hết hiệu lực bằng `valid_to_at`). Mỗi dòng: phần của phiếu (`CA_NHAN` hoặc `TO_CHUC`), mã vai (rỗng = mọi vai của phần đó), mã ô, cách hiện (`BAT_BUOC`, `TUY_CHON`, `AN`), thứ tự, `valid_from_at`/`valid_to_at`. Ô hiện ra của một phiếu = các dòng đang hiệu lực của phần đó; dòng có mã vai đúng vai của phiếu thắng dòng «mọi vai» cùng ô. Vai do Kế toán thêm (`LD_…`) không cần dòng riêng: tự nhận dòng «mọi vai».
- *Nghĩa* của từng ô (tên hiện, phần, nơi nối lúc duyệt) là MÃ, ở một tệp thuần dùng chung (`src/shared/dang-ky-o-tep.ts`). *Vai nào thấy ô nào, bắt buộc hay không* là DỮ LIỆU. Ô mới có nghĩa mới (vd thẻ hướng dẫn viên) cần sửa mã + dòng mới; đổi vai thấy ô cũ chỉ cần dòng mới.
- Gieo giữ đúng hành vi hôm nay: căn cước hai mặt `TUY_CHON` cho mọi vai cá nhân; GPKD `BAT_BUOC`, giấy phép thêm `TUY_CHON` cho mọi vai tổ chức; thêm hai ô «Tệp khác» `TUY_CHON` (Đ2). **Không** đổi ảnh căn cước thành bắt buộc trong ADR này (đổi là một dòng dữ liệu, chủ quyết riêng).
- Máy chủ là cổng: tải tệp vào ô không thuộc phiếu ⇒ 400; gửi phiếu thiếu ô `BAT_BUOC` ⇒ 400 (giữ mã lỗi cũ `org_photo_missing` cho GPKD); còn tệp ở ô không thuộc phiếu (vd đổi vai trước lần gửi đầu) ⇒ 400 kèm lối gỡ tệp đó. Gỡ tệp luôn được với mọi ô đang có tệp.
- Trình duyệt nhận danh sách ô theo từng vai trong cấu hình công khai, tính cùng thời điểm với máy chủ, và chỉ vẽ.

**Đ2 — Ô «Tệp khác».** Hai ô mới: `TEP_KHAC` (phần cá nhân) và `TEP_KHAC_TO_CHUC` (phần tổ chức), mỗi ô một tệp như ô cũ. Lúc duyệt: `TEP_KHAC` nối vào dòng căn cước của hồ sơ người; `TEP_KHAC_TO_CHUC` nối vào dòng GPKD của hồ sơ tổ chức — vì `pty_attachment_link` hôm nay chỉ mở hai loại nối (dòng giấy tờ người, dòng giấy tờ tổ chức), mở loại nối mới là việc riêng. Trước khi duyệt, người xác minh thấy tệp dưới nhãn «Tệp khác». *Điều phải biết:* sau khi duyệt, bảng tệp hồ sơ không giữ tên ô, nên tệp khác hiện như một tệp nữa của dòng căn cước (hoặc GPKD), không có nhãn riêng; muốn có chỗ riêng thì cần ADR mở loại nối mới.

**Đ3 — «Tệp khác» chỉ mở khi chính sách riêng tư đã nêu (Hiến chương 5.21).** Thu một tệp tuỳ ý là thu loại dữ liệu chưa khai mục đích. Thêm cột `covers_other_files` (0/1, mặc định 0) cho `pty_privacy_policy`, cùng khuôn `covers_org_data` (ADR-0212 Đ7): Toàn quyền tích ô này khi đăng phiên bản chính sách mới. Bản đang hiệu lực chưa có dấu ⇒ hai ô «Tệp khác» không hiện và máy chủ từ chối tệp vào đó. Hệ quả: **ô «Tệp khác» chưa hiện trên bản chạy thật cho tới khi chủ đăng chính sách riêng tư mới có nêu việc này** (bản v2 đang chờ luật sư).

**Đ4 — 12 tệp mỗi phiếu.** Migration chèn MỘT dòng `dk_policy` chép từ dòng đang hiệu lực, chỉ đổi `photo_max_count` 8 → 12 (không chép lại số gieo của 0170, để không mở lại / đóng lại đăng ký hay đổi loại mở). Toàn quyền đổi lại được theo cách chèn dòng như hôm nay.

**Ngoài ADR này — tệp Word (.doc/.docx): KHÔNG nhận.** Chủ dự án 21/11 (qua phiên điều phối kế hoạch 16 việc), nguyên văn: «còn lại áp dụng như khuyến nghị». Máy chủ và trang đăng ký nhận ra đầu tệp Word (khuôn OLE hoặc ZIP) để báo «Tệp Word: hãy lưu thành PDF rồi gửi.»; tệp vẫn bị từ chối như mọi loại ngoài bốn loại (ADR-0208 Đ2 giữ nguyên). Muốn nhận về sau thì cần ADR khác (bảng tệp mới, kiểm macro).

## Hệ quả

Được: thêm / bớt / đổi bắt buộc ô theo vai không cần sửa mã; vai mới tự có ô; người đăng ký có chỗ gửi giấy tờ ngoài danh sách. Mất: một bảng nữa phải đọc khi tải tệp và gửi phiếu; «Tệp khác» chờ chính sách riêng tư mới. Kiểm: bài thuần cho phép chọn ô; bài route (tải, gửi, gỡ); bài lô duyệt (tệp khác về đúng hồ sơ); e2e đăng ký.
