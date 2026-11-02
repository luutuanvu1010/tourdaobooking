# Sổ điều phối thi công: đặt vé của đối tác, lượt 1 (2026-11-02)

Hồ sơ có ngày. Kế hoạch: `2026-11-02-dat-ve-doi-tac-luot-1.md`. Đặc tả: `../specs/2026-11-01-dat-ve-doi-tac-design.md`. Bằng chứng ảnh: `docs/evidence/2026-11-02-dat-ve-luot-1/`.

## Kiểm

- Người kiểm từng đợt (T1+T4, T2+T3, T5) và người kiểm độc lập cả nhánh (Base `e88ded41`, Head `e0268ee8`): «Đạt sau khi sửa Q-1 và dòng BACKLOG N-1». Đợt sửa cuối (`1298dc14`..`daf63b93`) có người kiểm lại riêng: đủ 8/8, không hỏng mới mức Nghiêm trọng hoặc Quan trọng.
- `npm test` đầy đủ chạy trên `9f43b95e`: 7083 bài, 7079 qua, 0 đỏ, 4 todo. Hai commit sau đó: `daf63b93` chạy lại mọi tệp phủ; `93479b56` chỉ đổi kịch bản chụp, ảnh, một câu BACKLOG.
- `npm run test:e2e` đủ bộ chạy một lần trước các sửa CSS và chữ của đợt cuối (báo cáo không ghi commit; người kiểm độc lập suy ra `21bfe600`): 79/80, đỏ `H5`. Không chạy lại đủ bộ; `luat-ban` chạy lại riêng vì đổi câu máy chủ.
- Kịch bản Chrome: `a2-smoke-form`, `a2-smoke-order`, `doi-tac-lap-don-smoke`, `hoa-hong-smoke`, `va3-smoke`, `luat-ban-smoke`, `dac-diem-smoke`, `ten-vai-tai-khoan-smoke` đạt. `dot-a-smoke` đỏ sẵn ở trang Nhật ký (`web/CLAUDE.md`), `so-dai-ly-smoke` đỏ y như bản xuất `origin/main`. Chưa chạy: `a2-smoke-sheet`, `vai-smoke`, `quyen-thieu-quan-tri-smoke`, `t2b-danh-ba-smoke`, `passkey-smoke`; người kiểm độc lập đánh giá rủi ro thấp vì chỉ đổi chữ hoặc cách vẽ.

## Ruling của điều phối

- Gộp giao ba đợt, mỗi đợt một người kiểm: lời chủ «Gộp việc, giữ kiểm», tránh bảng từ đỏ giữa T2 và T3. Sai chỉ tốn thêm một vòng sửa.
- Đối tác không được hưởng có ô giảm giá khoá vẫn hiện chữ gợi ý mới cùng dòng báo sẵn có: đúng lời chủ, luật khoá không đổi. Sai chỉ đổi chữ.
- Giữ «vai trò» cho dạng ngắn trong trang Hoa hồng dù tên thẻ là «Vai người dùng», kể cả «Chưa gán vai trò» (đặc tả ghi «Chưa gán vai»): bảng từ dành «vai» đơn lẻ cho «vai trò», câu dài trong ô hẹp. Sai chỉ đổi chữ một lượt. Nói với chủ trong báo cáo cuối lượt 1 (2/11).
- Nhập `origin/main` (27 commit kho vé điện tử) trước bộ kiểm dài, `39bfa6cf`: để kiểm đúng mã sẽ nhập và `day-len` tiến thẳng được.
- Gộp người kiểm cả nhánh và người kiểm độc lập thành một ghế: «Gộp việc, giữ kiểm».
- Gom một đợt sửa cuối gồm mọi điểm rẻ, đảo ngược được.
- Bỏ ngoại lệ «vai nguoi dung» người sửa đã thêm vào bài bảng từ, dẫn xuất bằng `boDau("vai người dùng")`: không nới hàng rào khi không cần (Điều 9.4).
- Sửa hướng dẫn đối tác để lượt 1 vẫn dặn chọn giờ ở Đưa đón khi có đón: khung giờ còn nguyên tới QĐ-B1, tránh tự mở rộng lỗ Đón không giờ.
- Kịch bản chụp ảnh: chỉ ẩn thanh bám đáy, không ẩn `.bang th`; điều phối phát hiện khi xem ảnh ma trận cấp.

## Còn mở, không do nhánh

- **Đỏ `H5` e2e:** bốn route ghi hai lần vì kho vé (`gui-don`, `quyet-dinh`, `handler-money-edit`, `money-edit`) chưa có tên ở `src/shared/lan-gui-no.ts`. Nguồn `4c4bad60`, `e1ae414e` trên `main`; suy từ mã, chưa chạy e2e trên `main`. `npm run trien-khai` sẽ dừng hỏi. Đã đề xuất thành việc riêng cho chủ.
- **Đối tác gặp 403 ở `GET /api/ve/don/<id>`:** `web/ve-don.ts` nuốt 403 nên khối vé ẩn; chỉ tốn một lời gọi thừa.

## Còn mở, thuộc lượt sau hoặc chờ chủ

- **Đón không giờ (Q-2 của người kiểm độc lập):** gợi ý «Thời gian đón» cộng đường có sẵn: chặng không giờ coi là không dưới mốc (`src/shared/moc-toi-thieu.ts`), form không đòi giờ (`src/shared/chang-form.ts`), nên đơn có thể xác nhận thẳng nếu dịch vụ không có cờ cần xác nhận. Đặc tả §1 gọi đây là thất bại; luật chặn là ADR-0154 Đ1. **Chủ trả lời 2/11:** gợi ý «Thời gian đón» đúng ý, khung giờ bỏ trống là chủ ý thiết kế, để bước đầu đơn giản cho người mới; lời đầy đủ ở ADR-0154. Vì vậy bỏ ruling sửa hướng dẫn nói ở trên: hướng dẫn đối tác nay dặn khung giờ có thể để trống, giờ gõ vào Ghi chú. Không còn lý do giữ lượt 1 vì chuyện này. Câu chủ chưa trả lời: nhập lúc nào, duyệt hai ADR.
- **Chữ cũ trong tệp luật, chờ chủ:** `src/CLAUDE.md` dòng về luật bán, ADR-0146, ADR-0152. Hai kịch bản đã ngừng chạy (`loai-doi-tac-smoke`, `muc-ta-smoke`) giữ nguyên vì là hồ sơ có ngày.
- **Nợ nhỏ đã ghi ở `docs/BACKLOG.md` §58:** `BL-DV-LOC-VAI-TU-THEM`, `BL-DV-SUA-CHUYEN-TRANG-DON`, `BL-DV-NHAP-CU-GIA-TRI-AN`.

## Ghi nhận, không sửa

Bảng từ có sai dương «phân loại», «loại trừ», «nhiều loại» trong ba nhóm tệp, sót «Loại Đối Tác», «LOẠI»; không có bài mẫu ghim biểu thức (thói quen có từ trước). Trần C4b đúng bằng 20, «Thêm vai trò» đứng hạng 5 với Bán hàng và Quản trị, sát mép `slice(0,5)` của C4e: thêm đoạn kho có thể đỏ. Trợ giúp Kế toán 3148/3150. `ghiChuMotDong("a,\nb")` ra «a,, b», chỉ thẩm mỹ. Chưa có ca Chrome nạp nháp cũ nhiều dòng. Chú thích `src/shared/form-dat-ve.ts` còn nói nhắc gõ giờ đón vào ô, đúng với lượt 2. Dòng đồng tác giả commit lẫn Opus và Sonnet do hệ thống đổi giữa chừng.
