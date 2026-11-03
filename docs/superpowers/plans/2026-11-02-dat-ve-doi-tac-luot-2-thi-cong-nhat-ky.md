# Sổ điều phối: đặt vé của đối tác, lượt 2

Kế hoạch: `docs/superpowers/plans/2026-11-02-dat-ve-doi-tac-luot-2.md`. Nhánh `claude/dat-ve-luot-2`, thư mục `.claude/worktrees/dat-ve-luot-2`, cắt từ `7ed7b18c` (đầu nhánh lượt 1), để lượt 1 nhập vào bản chính độc lập.

## Ruling của điều phối

- **R1 (2026-11-02):** áp bảy câu của kế hoạch theo khuyến nghị (lời chủ 2026-10-02). Sai thì sửa đúng task nêu ở cuối câu. Báo chủ trong báo cáo.
- **R2 (2026-11-02):** thi công theo từng đợt, mỗi đợt một trợ lý tầm trung làm hết các task của đợt, rồi một người kiểm đợt chỉ đọc (lời chủ về điều phối: gộp việc, giữ kiểm). Lỗi nhỏ gom sửa một lần ở cuối đợt.
- **R3 (2026-11-02):** không hỏi chủ giữa chừng trừ bốn trường hợp: thao tác không đảo ngược, an ninh, tác động ra ngoài thư mục này, kế hoạch hỏng tới mức mọi đường đều là đoán. Câu phát sinh chạm dữ liệu hoặc quyền mà ADR đã trả lời nguyên tắc thì áp và ghi ở đây; ADR chưa trả lời thì dừng đúng phần đó, làm tiếp phần khác, gom hỏi một lần (`CLAUDE.md` §3).

- **R6 (2026-11-02, người kiểm N-1, mức Chặn):** lô `db.batch` không lui khi câu xác nhận đổi 0 dòng, nên Còn vé có thể ghi giờ và dấu đặt gấp rồi thua (đơn quá ngày đi); dấu còn lại cho Kế toán xác nhận dưới hạn chốt, trái ADR-0154 Đ1.4. Sửa: chặn trước lô mọi vế của `ORDER_CONFIRM` mà `CON_MO` không phủ, trả đúng câu `chanDoanXacNhan`; không đổi SQL. Sai thì chỉ sửa một chỗ trong route.
- **R7 (2026-11-02, người kiểm N-3): DIỄN GIẢI TẠM, CHỜ CHỦ (người kiểm lần 2, N-4).** «Lượt đầu» xếp chiều đi trước chiều về, rồi mới tới ngày; dịch vụ chỉ có chiều về thì xét chiều về. Đây là cách đọc giữa chừng, không phải đúng chữ: ADR-0154 dòng 5 ghi «không xét chiều đi», Đ1.2 ghi «không phân biệt chiều», chủ đã duyệt chữ đó. Đổi cùng lúc ở `changDauCuaDichVu`, câu con `R-ORD-17w`, bài và kế hoạch câu 1, nên nếu chủ chọn đúng chữ thì sửa lại đúng các chỗ đó, có bài đối chiếu hai phía canh, và phải thêm một chốt riêng cho ca đổi ngày đi (xác định lượt đầu theo ngày đang lưu). Dù chủ chọn gì, Đợt 5 đề xuất một dòng làm rõ ADR qua công cụ sửa tệp để chủ được hỏi.
- **R9 (2026-11-02):** N-4 chặn việc nhập nhánh và chặn Đợt 3 (Task 3.1, 3.3 gọi `changDauCuaDichVu`, có bài phụ thuộc thứ tự); không chặn Đợt 2, Đợt 4. Chủ chưa trả lời khi Đợt 2 đạt thì làm Đợt 4 trước, giữ Đợt 3.
- **R8 (2026-11-02, người kiểm N-2):** thêm bài khoá hai hàng rào chưa ai canh, rồi làm lại sửa cố ý để thấy đỏ.

- **R10 (2026-11-02):** chủ chưa trả lời câu thứ tự lượt đầu, nên làm Đợt 4 trước Đợt 3. Task 4.2 không có `luot-2-smoke.mjs` để thêm bước vì tệp đó thuộc Task 3.4, nên viết riêng `docs/evidence/2026-11-02-dat-ve-luot-2/kich-ban/cot-cap-smoke.mjs`; Task 5.2 chạy thêm tệp này. Sai thì gộp lại, không mất gì.
- **R11 (2026-11-02):** bề mặt, ghi lại: `nhacDieuKien` có trong mọi phản hồi của văn phòng vì màn vẽ lại từ các phản hồi đó (người kiểm Đợt 2, N-3). Không ghi thêm dấu vết vào nhật ký lúc cho xe chạy vì ADR Đ3 không đòi (N-4); truy ngược bằng `orders.manifest_exempt`, báo chủ một dòng ở báo cáo cuối.

- **R12 (2026-11-02, người kiểm Đợt 4, N-1):** «Dùng cấp theo vai trò» không có ô ngày để người dùng thấy, nên giao diện đọc lại ngày máy chủ ngay lúc bấm rồi mới gửi; trang mở qua nửa đêm không được làm cấp riêng hết hiệu lực từ hôm qua. Các ô có ngày hiện ra thì lấy ngày máy chủ lúc mở bảng.
- **R13 (2026-11-02, bề mặt, ghi lại):** «Dùng cấp theo vai trò» kèm một câu cố định báo hệ quả nếu vai trò chưa có cấp; không thêm khoá vào DTO, nên không đổi hợp đồng đã ghim. Sự thật do người kiểm đo: đơn của đại lý «Chưa có cấp» vẫn tạo và xác nhận được, dòng dịch vụ chụp `MISSING`, tới «Đã giao» thì 409 cho tới khi Kế toán ghi mức tay. Nút «Thôi theo cấp này» ở trang Hoa hồng có cùng hệ quả, cũng không cảnh báo: không sửa ở lượt này. Chữ chờ chủ xem ảnh.

- **R14 (2026-11-02, chủ: «không thể lâu như thế được, có gì sai ở đây rồi»):** đo thật 5 giờ 15 phút, máy không nghẽn, gốc là cách điều phối. Bỏ chữ «mỗi đợt có người kiểm riêng» của kế hoạch, vốn do người soạn thêm, `CLAUDE.md` §3 chỉ đòi người kiểm độc lập cho việc lớn. Từ đây: một vòng kiểm độc lập ở cuối (Task 5.4), tập trung phần chưa ai đọc (Đợt 3, bản sửa `431a9184`, `c4a0ab6c` của Đợt 4), chạy song song bộ kiểm dài. Sửa cố ý chỉ làm đúng danh sách kế hoạch ghi. Đợt 3 làm tạm theo R7, không nhập nhánh khi chủ chưa chọn.

- **R15 (2026-11-02, chủ: «tìm hiểu nguyên nhân khiến phiên quá lâu»):** đo bản ghi phiên: toàn phiên 15,3 giờ, 21 trợ lý, 3175 thao tác, gồm đọc 2320 (73%, trung vị 18 dòng mỗi lần), chạy kiểm 433 (14%), sửa 186 (6%); 1,2 thao tác mỗi lượt sinh, khoảng 10 giây mỗi lượt. Máy và bài kiểm không phải nút thắt. Từ đây: đề giao ghi sẵn tệp và tên hàm, dặn gom nhiều lệnh đọc trong một lượt và lấy cả khối; Đợt 5 giao một người làm cả 5.1, 5.2, 5.3, người kiểm cuối chạy song song trên bản chép riêng để sửa cố ý không làm đỏ giả bộ kiểm dài, có trần thao tác. Hai việc người thi công Đợt 3 nêu, người kiểm cuối phải đọc: sửa nháp khi khối khách ẩn (danh sách hành khách không được gửi lên, có mất dữ liệu nháp không), nháp cũ vào form gọn mất dấu đặt gấp lượt đầu.

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
| 2.2 → 3.4 | `dieuKienXuatBen`, `nhacDieuKien`, `khongCan` | Khớp. **Đính chính sau người kiểm Đợt 2 (NS-1):** trước Task 3.4, `web/chuyen.ts` không truyền `nhacDieuKien` nên dòng «Đủ tên khách» của đơn có dấu hiện ĐẠT, đúng loại đạt giả ADR Đ3.3 cấm, không phải «chưa đạt» như dòng này từng ghi. Điều kiện: không nhập, không phát hành trước khi Task 3.4 xong |
| 1.x, 2.1 → 2.2 | Bước P16 sửa cố ý các bài (a2), (c), (g), (h6) | Khớp, các bài đã có trước Task 2.2 |
| 4.1 → 4.2 | `CapHienHanhDto` | Khớp |

Mỗi task tự khớp với bài của mình ở mức đọc kế hoạch. `v_stf_quyen_mo` đã có từ migration `0067`, cột `staff_id`, `permission_code`, chỉ quyền còn mở, nên đúng ý câu 3. Còn chưa chạy thử: tên khoá kết quả của khung thử với đơn đối tác, cách bọc `prepare` để đếm câu (kế hoạch mục «Chưa kiểm»).

## Tiến độ

| Đợt | Trạng thái | Người thi công | Người kiểm | Commit |
|---|---|---|---|---|
| 1. Dữ liệu và máy chủ giờ đón | đạt có điều kiện sau hai vòng kiểm: N-4 chờ chủ (R7) | trợ lý tầm trung | `nguoi-kiem-doc-lap` | `274f1f01`, `949be7ab`, `1f8791b9`, `34c457ae`; sửa: `6f91a051`, `b9ed1664`, `2d35f32f` |
| 2. Công tắc, miễn thiếu tên | đạt có điều kiện: đi cùng Task 3.4 (NS-1) | trợ lý tầm trung | `nguoi-kiem-doc-lap` | `a501f077`, `f12b8fa0` |
| 3. Giao diện ADR-0154 | xong, tạm theo R7, chưa chạy `luot-2-smoke.mjs`; kiểm ở vòng cuối (R14) | trợ lý tầm trung | vòng cuối (R14) | `f1a09e6f`, `ce41a0b4`, `58552dd1`, `bb1ba4cb`, `96726bc4`, `0e959157` |
| 4. Cột Cấp độ đại lý | đã sửa N-1; bản sửa kiểm ở vòng cuối (R14) | trợ lý tầm trung | `nguoi-kiem-doc-lap` | `3af9c08d`, `962c76f3`, `6dca962d`; sửa: `431a9184`, `c4a0ab6c` |
| 5. Tài liệu, bộ kiểm, ảnh thật, kiểm độc lập | rút gọn theo lệnh chủ (R16), CHƯA ĐẠT: xem R16 | trợ lý tầm trung | `nguoi-kiem-doc-lap`, kiểm một phần | `d62b9128`, `921c6f37`, `8006dca6` |

**R16 (2026-11-02, chủ: «hoàn tất với cách nhanh nhất, 15 phút»):** rút Đợt 5, hạn 15:05. Kết quả: typecheck 0 lỗi; `npm test` lần duy nhất 7258 bài, 2 đỏ (`app-info`, C4 `tro-ly-van-nghia`), đã sửa hai bài và chạy riêng 32 xanh, CHƯA chạy lại toàn bộ. `cot-cap-smoke` 2 xanh, 5 đỏ: 11b do axe color-contrast ở bảng đặt cấp (`label[for=cap-tu-ngay]`, `#cap-tu-ngay`, `.btn-block`), nghi axe chạy lúc bảng đang mở dần, CHƯA xác minh; 11c, 11d, 11e, 12 chưa kiểm riêng. `luot-2-smoke` xanh bước 1–5, dừng ở dựng đơn: đơn gửi kèm giờ 13:30 nên Gửi đơn trả 200 nhánh B, kịch bản chờ 201; nghi lỗi kịch bản theo ADR-0154 Đ1.7, CHƯA xác minh; bước 6–10 chưa chạy. Người kiểm: không có lỗi Chặn, đơn nháp khi công tắc bật không mất dữ liệu (đã chạy bài); nháp cũ của tài khoản lai mất dấu đặt gấp lượt đầu, máy chủ vẫn chặn (đọc mã), ghi nợ. Chưa kiểm: ba nơi gọi `soanXacNhan`, `role_via_account`, quyền route `…/sua`, sửa cố ý. Chưa chạy: e2e, khối e2e mới, Chrome cũ, khổ 1280. Không nhập nhánh khi chưa xử lý các đỏ trên và chủ chưa chọn cách cho R7.

**R17 (2026-11-02, chủ: «Chạy thêm 20 phút»):** đã xử lý các đỏ của R16, đều do kịch bản, không đổi mã Nền tảng. `cot-cap-smoke`: chờ `.sheet` opacity 1 trước axe ở bảng khổ máy tính, 7/7 xanh. `luot-2-smoke`: đơn dựng có giờ nên chờ 200 nhánh B (Đ1.7), 11/11 xanh, có axe. `npm test` toàn bộ: 7258 bài, 7254 đạt, 0 đỏ, 0 bỏ qua (chưa xem vì sao chênh 4 giữa tổng và đạt). Vẫn chưa chạy: e2e, khối e2e mới, Chrome cũ, khổ 1280 của bộ `chup-anh`, sửa cố ý. Người kiểm vẫn chưa đọc phần còn lại ở R16, chưa đọc hai kịch bản đã sửa. Còn chặn nhập: chủ chọn cách cho R7.

**R18 (2026-11-02, chủ, nguyên văn «Cách 1: lượt đi»):** R7 hết tạm, N-4 đóng; thứ tự lượt đầu giữ như mã, ghi dòng làm rõ ở ADR-0154.

**R19 (2026-11-02, chủ: «xog rồi, kiêm tra và nghiệm thu nhé»):** chủ đã nhập và triển khai bản 2.57 lúc 17:46, số liệu ở `docs/HANDOFF-N1.md`. e2e chạy trong `trien-khai` 79/80, chỉ đỏ H5 (danh sách, phiên vé đã sửa ở `main` máy, chưa lên GitHub). Kiểm dữ liệu KHÔNG ĐẠT `R-PRC-2` 98: cùng con số từ bản 2.54, nguồn đã tra 31/10 là bốn loại thử chủ đã tắt, lần này chưa đối chiếu từng dòng. Sửa cố ý: bỏ vế `holdsPartner` ở route cấp ⇒ (e), (e3) đỏ; hoàn nguyên ⇒ 12/12 xanh, đã ghi `docs/SO-HANG-RAO.md`. Người kiểm độc lập (chỉ đọc mã, không chạy): không có lỗi Chặn; ba nơi gọi `soanXacNhan` đúng luồng; `role_via_account` là mã lỗi có từ trước, không thuộc Đ2; quyền route `…/sua` khớp `suaDuocCot`; hai kịch bản đã sửa không bỏ kiểm, nhưng `luot-2-smoke` nay không còn khẳng định thẳng `status === "confirmed"` và không có ca đơn đối tác không giờ đi nhánh A rồi Còn vé (ca này do bài máy chủ phủ) — mức Nhỏ. Chưa kiểm: hiển thị khi đơn đối tác không có giờ trên giao diện, Chrome cũ, khổ 1280, thao tác đăng nhập thật trên production. Kết luận: chưa ghi «đạt nghiệm thu đầy đủ»; chờ chủ thử trên điện thoại và quyết 98 dòng mức.

**R20 (2026-11-02, chủ: «Đóng tất cả dữ liệu cũ gồm đơn hàng, chính sách giá , cấp độ đại lý», rồi «Duyệt» ADR-0158):** chủ tự chạy phần xoá trên production; số liệu ở `docs/HANDOFF-N1.md`. Bài học: lần thử trên dữ liệu mẫu bắt được `R-VC-6`, người kiểm độc lập bắt được tệp xoá làm đỏ 19 bài và vé nhập lại được; bài trên cơ sở dữ liệu rỗng không thấy cả ba. Nghiệm thu lượt 2 vẫn chưa đủ: chủ chưa thử trên điện thoại, và thao tác gán cấp cần Kế toán nhập cấp mới trước.

## Lệch kế hoạch đã có lý do (Đợt 1)

- **Migration tạo lại trigger `orders_delivered_lock`:** kế hoạch nói chỉ thêm, nhưng bài NT-R6 (`src/migrations-orders-da-giao.test.ts`) buộc mọi cột của `orders` nằm trong khoá «Đã giao». Chỉ siết, không sửa tệp cũ. **Ruling R5:** chấp nhận, với điều kiện người kiểm so định nghĩa trigger trước và sau `0133` chỉ khác đúng một vế.
- **Bài (d):** đơn đã vào nhánh A thì `/status` trả 409 `confirm_pending_locked` chứ không phải `partner_submit_required`, vì khoá khi chờ đứng trước cổng Gửi đơn. Tách thành (d1), (d2). Hành vi không đổi.
- **Che ghi chú và `R-ORD-17w` dùng hai nghĩa khác nhau có chủ ý:** che ghi chú xét «hiện giữ» quyền Đối tác (câu 3), kiểm định kỳ xét «từng giữ» (câu 4).

## Bài cũ đổi có chủ đích (Đợt 1)

- `src/modules/orders/chon-don-route.test.ts`: `FIELD` đọc khung giờ từ 403 thành 200 (ADR-0154 Đ1.5), thêm Tài xế công ty 403.
- `tests/e2e/chon-don.mjs`: cùng dòng đó, chưa chạy, chờ Đợt 5.
- `src/modules/orders/dat-gap-sat-gio.test.ts`: siết thêm một dòng.

## Nợ và lỗi nhỏ gom lại

- **Đợt 3 phải xét:** `canXacNhan` trong khối `xacNhan` của `GET /api/orders/:id` chưa biết cờ `CHOT_GIO`. Trước khi dựng form, xem chữ gợi ý cho đối tác có đọc trường này không, tránh báo «xác nhận ngay» rồi đơn lại chờ.
- Nhật ký `confirmed` chỉ ghi lý do đặt gấp đầu tiên; đủ chi tiết ở các dòng `order_leg_short_notice`.
- Che ghi chú chỉ phủ `services[].note`, đúng phạm vi ADR Đ1.6; chưa che `pickupPlace`, `checkinPlace`.
- `tests/audit/redteam.test.mjs`: 8 bài đỏ giống hệt nhau trên `8cb58ae4` và `34c457ae` (người kiểm đã đối chứng), nằm ngoài `npm test`. Nguyên nhân đã truy ở R3b, R4, R8: bài dựng đơn nháp lỗi thời so với ADR-0135 Đ6 (`order_not_confirmed`). Không do lượt này; báo chủ như việc riêng.
- **Giao trợ lý Đợt 4 làm kèm (lỗi nhỏ của Đợt 2):** bài canh vế `valid_from_at <= ?1` của `AN_KHACH_HIEN_HANH` (N-1); bài canh gộp mã đơn của `nhacDieuKien` (N-2); thêm `mienDanhSach: false` vào các hàm dựng `ChangVao` trong bài (N-6).
- **Đợt 5, Task 5.2:** chạy thêm `docs/evidence/2026-11-02-dat-ve-luot-2/kich-ban/cot-cap-smoke.mjs` (chưa từng chạy); chủ xem ảnh hai nhãn gần nhau «(cấp riêng)», «có mức riêng» (người kiểm Đợt 4, m-6); đề xuất `web/CLAUDE.md` thêm dòng cho `web/cot-cap-dai-ly.ts`, `src/shared/cap-hien-hanh-hien-thi.ts` (m-7). Bảng phá thử của người kiểm Đợt 4 là tư liệu cho `docs/SO-HANG-RAO.md`.
- m-3 (người kiểm Đợt 4): câu đọc vai quét cả bảng, đo 0,5 ms ở 1.000 vai trên SQLite cục bộ, chưa đo trên D1; đủ dùng với quy mô thật, không sửa.
- N-5 (người kiểm Đợt 2): chưa có kiểm định kỳ cho «đơn mang dấu mà người lập chưa từng giữ quyền Đối tác»; chỉ là lưới thứ hai, dấu chỉ có một nơi đặt. Không làm ở lượt này.
- `tests/audit/doi-tac.test.mjs`: 7 bài đỏ giống hệt trên `f8c111ed` và `f12b8fa0`, ngoài `npm test`, cùng loại với `redteam.test.mjs`. Báo chủ như việc riêng.
- m-6 (người kiểm lần 2): vế `order.services.length === 0` của cổng mới là phòng thủ thừa; `chanDoanXacNhan` đọc ngày đã lưu nên danh sách `missing` có thể nêu lỗi mà `ngayDi` sẽ sửa. Không sai trạng thái, không sửa.
- C5b (người kiểm lần 2, có từ trước, chưa kiểm có tới được qua API không): dịch vụ trống ngày đi mà chặng có ngày, sau Còn vé kèm `ngayDi` thì chặng ở lại, sớm hơn ngày đi quá mức cho phép. Đợt 5 ghi `docs/BACKLOG.md`.
- `audit-invariants --db remote` chạy TRƯỚC khi áp `0133` sẽ thoát 2 vì thiếu bảng mới; đúng khuôn các kiểm trước, `npm run trien-khai` chạy nó sau migration nên không chặn phát hành (người kiểm đã đọc trình tự).

## Sửa cố ý đã thấy đỏ (P16)

- 2026-11-02, Đợt 2, bốn sửa cố ý của Task 2.2 Step 5, người thi công làm rồi người kiểm tự làm lại trên bản chép, đều đỏ đúng bài, đã hoàn nguyên: (i) `lichChungChang` đọc công tắc hiện hành thay `manifest_exempt` ⇒ `(h6)`; (ii) `thieuGioChangDau` dùng `legs[0]` ⇒ `(a2)`; (iii) bỏ cổng `pickup_time_required` ⇒ `(c)`; (iv) `POST /api/orders` bỏ `thanLapDonKhiAn` ⇒ `(g)`. Task 5.2 đưa bốn dòng này vào sổ hàng rào.
- 2026-11-02, Đợt 1, sau sửa: vô hiệu `CON_MO` của câu đóng dấu ⇒ bài `(N-2) ĐUA ca giờ KHÔNG đổi`; bỏ `holdsPartner` ở `canChot` ⇒ bài `(N-2) Toàn quyền Gửi đơn`.
- 2026-11-02, `R-ORD-17w`: bỏ vế `PARTNER` trong SQL thì bài ca tay đỏ ở đơn văn phòng; bỏ `(l2.direction <> 'OUT')` thì cả hai bài đỏ. Đã hoàn nguyên. Task 5.2 đưa vào sổ hàng rào, không cần làm lại.
