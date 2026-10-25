# Đặc tả giao diện — trang «Hoa hồng đối tác» và trang «Hỗ trợ» (thiết kế lại 25/10/2026)

**Trạng thái: đã duyệt 2026-10-25** (chủ, chat: «duyệt luôn hai đặc tả»; sau QA1). Nguồn chính về bố cục và chữ: `BAN-GIAO.md` mục 4, 6, 7 (chủ duyệt 25/10) và ba bản vẽ ở `docs/design/hoa-hong-ho-tro-2026-10-25/`. Tệp này **không chép lại** bàn giao; chỉ ghi điều bàn giao để ngỏ (mục 11 của bàn giao), chỗ phải chính xác hơn, và chỗ lệch có lý do. Máy chủ: `DAC-TA-MAY-CHU.md` (phát hành trước).

- Thứ tự thắng khi mâu thuẫn: ADR → bàn giao → đặc tả này → bản vẽ. Bản vẽ có nút «Lịch sử» / «Lịch sử áp dụng»: **không làm** (bàn giao 5.5).
- Luật chung (`web/CLAUDE.md`): `h()`, không `innerHTML`; ẩn/hiện bằng `can()` / `perms` máy chủ trả; giá trị mới thành token ở `:root` của `public/app.css`; vùng chạm 44px; ô gõ 16px; huy hiệu đếm / chấm chưa đọc dùng `--c-danger`, không `--c-accent`; hộp trượt bằng `moBangTruot` (`web/bang-truot.ts`, khuôn `.sheet`); phông tự chứa.
- Giao diện **không** tính tiền, **không** chọn mức: mọi câu «mức nào áp» lấy từ `cauThuTra` dịch kết quả máy chủ.

## A. Hoa hồng đối tác (`web/hoa-hong.ts`, `public/hoa-hong.html`)

### A1. Quyết định để ngỏ — người soạn chọn (đảo ngược được)

| Việc | Chọn |
|---|---|
| Thứ tự loại trong «Theo loại đối tác» | loại «Chưa có mức» lên đầu, rồi theo tên (so sánh tiếng Việt `localeCompare("vi")`) |
| Danh sách dài | cuộn thường, không dòng «còn N loại» (bàn giao đã bỏ) |
| Tra theo loại | gọi `thu-tra?loai=` (máy chủ A2); giao diện in dòng nhắc khi phản hồi có `theoLoai` |
| Mục «Đối tác có mức riêng hoặc chính sách riêng» | ghép hai nguồn trên máy: mức riêng = dòng `doiTuong.loai = "DOI_TAC"` của `GET /hoa-hong`; chính sách riêng = `ganRieng` của `GET /muc-ta`; mỗi đối tác một dòng, có cả hai thì hai huy hiệu |
| «N đối tác dùng riêng» ở thẻ chính sách | đếm `ganRieng` theo mã mức |
| Hộp ở điện thoại khi chạm một dòng mức riêng | **hai** việc: Đổi, Ngừng (bàn giao ghi ba, «Lịch sử» không làm đợt này) |

### A2. Khi nào có «Đổi» và «Ngừng» (chính xác hơn bàn giao)

Chỉ ở dòng **đang áp dụng**, **bắt đầu trước hôm nay** và **chưa có ngày ngừng**. Vế cuối bàn giao chưa nêu: CSDL chỉ cho đóng một dòng một lần, dòng đã có ngày ngừng (kể cả ngày trong tương lai) không đóng lại hay đổi được — dòng đó ghi chữ xám «ngừng sau <ngày>». Dòng sắp áp dụng ghi «chưa tới ngày». Người không có `partner.commission.write` không thấy cả hai nút.

### A3. Hộp «Đổi»

Dùng khuôn hộp «Thêm mức», nhưng **khoá** «Ai được hưởng» và «Dịch vụ» (hiện chữ, không sửa được — máy chủ chép từ dòng cũ); sửa được Cách tính, mức, tách theo loại khách, Đến, Ghi chú. Ô «Từ» mặc định hôm nay, không nhận ngày trước hôm nay (`min`), kèm dòng «Mức cũ <mức> sẽ ngừng, **đến hết** <ngày liền trước ngày Từ>.» Gửi `POST /api/pricing/hoa-hong/:id/doi`; 400 / 409 hiện nguyên câu máy chủ. «Đổi chính sách» của một loại: hộp chọn chính sách + ngày Từ → `POST /api/pricing/muc-ta/gan/:id/doi`; khung vàng `dongRieng` giữ như nay.

### A4. Điện thoại

Thanh «＋ Thêm mức» dính đáy mang lớp `thanh-hanh-dong-cuoi` để nút Trợ lý tự nâng (`nangTheoThanhDay`, bài `src/thanh-hanh-dong-cuoi.test.ts`); hộp trượt mở thì nút Trợ lý ẩn (`body.sheet-open`, có sẵn). «Tra nhanh» ở điện thoại là nút mở hộp trượt.

## B. Hỗ trợ (`web/feedback.ts`, `public/feedback.html`)

### B1. Quyết định để ngỏ — người soạn chọn

| Việc | Chọn |
|---|---|
| Gom tin | tin liền nhau của cùng một người, cùng loại (công khai / nội bộ), cách nhau ≤ 5 phút ⇒ một cụm, tên + giờ một lần |
| Thời gian tương đối | **một** hàm thuần mới ở `src/shared/` có bài kiểm: < 1 phút «vừa xong»; < 60 phút «N phút trước»; hôm nay «HH:mm»; hôm qua «hôm qua»; cùng năm «dd/mm»; khác năm «dd/mm/yyyy»; theo giờ Việt Nam. `web/thong-bao-logic.ts` (`thoiGian`) giữ nguyên, không ép dùng chung đợt này |
| Tóm tắt thiết bị | hàm thuần nhận chuỗi `userAgent` → «iPhone · Safari», «iPad · Safari», «Android · Chrome», «Mac · Chrome/Safari/Firefox», «Windows · Edge/Chrome/Firefox»; không nhận ra → «Thiết bị khác»; nút «chuỗi gốc» mở chuỗi đầy đủ |
| Ô tìm ở «Việc của nhóm» | gửi `q` lên máy chủ (máy chủ B2), trễ 300 ms |
| Ba nút lọc | số lấy từ `dem` của máy chủ, theo trạng thái và chữ tìm đang chọn |
| «Tuần này» | lấy tuần hiện tại (thứ Hai – Chủ nhật, giờ Việt Nam) từ `stats` có sẵn, cộng mọi `kind`/`status` |
| Đơn điền sẵn ở «Gửi yêu cầu» | khi `from` có dạng `/order?id=<id>` **và** `<id>` nằm trong `GET /api/feedback/my-orders`; không thì để «Không gắn đơn» |
| Token mới | `--w-fb-cot-trai: 320px` và các khoảng của luồng (bóng tin, màu cát ghi chú nội bộ đã có token thì dùng lại); tên cụ thể do người lập kế hoạch đặt theo khuôn hiện có |

### B2. Dòng hệ thống

Chỉ ba loại, lấy từ `suKien` (máy chủ B1), xen vào luồng theo `at`: «<nguoi> đã nhận việc», «<nguoi> giao cho <den>», «Chuyển sang nhóm <den>». Luồng tự làm mới thêm `suKien` mới cùng tin mới. Không hiện lý do chuyển nhóm ở dòng hệ thống (lý do là ghi chú nội bộ, máy chủ đã lọc). Người gửi không xử lý phiếu **không** có dòng hệ thống (máy chủ trả `suKien` rỗng — mặc định an toàn, chờ chủ ở Q2); họ thấy «ai đang xử lý» ở đầu phiếu như bàn giao.

### B3. Từ chối phải có lý do (hai lệnh gọi, có thứ tự)

Người xử lý chọn «Từ chối» ở chip trạng thái ⇒ hộp trượt hỏi lý do (bắt buộc, cùng giới hạn độ dài của tin trả lời). Bấm xác nhận: **(1)** gửi lý do thành tin trả lời công khai (`POST /api/feedback/:id/messages`) → **(2)** đổi trạng thái `DECLINED` (`PATCH /api/feedback/:id/xu-ly`). Bước 1 lỗi ⇒ không làm bước 2, hiện câu máy chủ. Bước 2 lỗi ⇒ báo «Đã gửi lý do nhưng chưa đổi được trạng thái. Bấm Từ chối lại.»; giao diện nhớ (trong bộ nhớ trang, theo mã yêu cầu) là lý do đã gửi, lần bấm lại chỉ làm bước 2 — không gửi lý do hai lần. Người gửi thấy dòng «Đã từ chối» và lý do là tin cuối của luồng.

### B4. Chữ «phiếu»

Ba chuỗi người dùng thấy đổi sang «yêu cầu»: «Yêu cầu vừa được chuyển sang nhóm khác.», «Tải lại yêu cầu», «Yêu cầu này không còn trong nhóm của bạn.» Không thêm «phiếu» vào bảng từ (ADR-0130 tối đa ba tên mỗi lượt; chủ chưa chọn tên này) — kiểm bằng kịch bản Chrome.

### B5. Điện thoại

Mở một yêu cầu ⇒ thanh tab tắt. **Lưu ý cho người thi công:** hôm nay `data-tabbar="off"` chỉ đọc lúc dựng khung trang (`web/shell.ts`) từ tệp HTML; trang Hỗ trợ cần tắt/bật **trong lúc chạy** (mở / đóng một yêu cầu), nên phải thêm một cách bật tắt có kiểm thử (không sửa `public/feedback.html` thành tắt hẳn). Ô trả lời dính đáy mang lớp `thanh-hanh-dong-cuoi`. Bản nháp ô trả lời giữ trong bộ nhớ như nay.

## C. Bảng từ (ADR-0130) — hai lượt

Thêm vào `TU_DA_LOAI` (`src/shared/bang-tu-giao-dien.ts`), mỗi lượt một khối chú thích trỏ về tệp này. Mẫu chặn **hẹp theo đúng nghĩa đã đổi**; người lập kế hoạch chạy thử mẫu trên toàn kho trước, liệt kê chỗ khớp ngoài ý.

- **Lượt 1 (hoa hồng, đi cùng PR giao diện Hoa hồng):**
  1. «Mức TA» → «Chính sách hoa hồng».
  2. «dòng riêng» (theo nghĩa mức hoa hồng) → «Mức riêng». Đụng nghĩa khác: chú thích ở `web/tien-do-ui.ts` (chú thích không bị quét) — nếu có chuỗi cùng chữ khác nghĩa thì giữ bằng `CHUOI_GIU_NGUYEN`.
  3. Họ từ hiệu lực: «Đóng mức · Đóng dòng · Kết thúc gắn · Gắn mức · Đang áp · Sắp áp · Đã đóng» → «Ngừng / Áp dụng chính sách cho loại / Ngừng áp dụng / Đang áp dụng / Sắp áp dụng / Đã ngừng». Không chặn «đóng sổ», «khoá sổ tháng», «gắn loại cho hồ sơ». **Phạm vi chờ chủ — câu Q1.**
  Cùng lượt: câu báo máy chủ ở `src/modules/pricing`, nhãn nhật ký ở `src/shared/audit-actions.ts`, chữ phần chính sách riêng ở `web/parties.ts`, `huong-dan-ke-toan.ts`. Chữ nhỏ «Có sẵn» / «Do Kế toán thêm» → «Loại gốc» (không vào bảng từ; kiểm bằng kịch bản).
- **Lượt 2 (hỗ trợ, đi cùng PR giao diện Hỗ trợ):** «Hàng đợi nhóm» → «Việc của nhóm»; «Trợ giúp» → «Hướng dẫn» (`changelog.ts` miễn sẵn). Danh sách tệp: bàn giao mục 7; cùng PR sửa bài `trang-chu-o`, `huong-dan`, `tro-ly`, `tro-ly-van-nghia`, bộ sinh sơ đồ trang. Trùng tên «Hỗ trợ»: trỏ `BACKLOG BL-VE-TRUNG-TEN`, không xử lý ở đây.

## D. Chia việc và PR

Ba PR dạng thường, chủ tự gộp theo thứ tự: (1) máy chủ — `DAC-TA-MAY-CHU.md`, phát hành riêng; (2) giao diện Hoa hồng + bảng từ lượt 1; (3) giao diện Hỗ trợ + bảng từ lượt 2. (2) và (3) độc lập nhau, cùng cần (1) đã lên production.

## E. Tiêu chí nghiệm thu

Bàn giao mục 9 (bảy tiêu chí) là tiêu chí nghiệm thu của đặc tả này, đo bằng ảnh thật 390 + 1040 và hit-test tại tâm nút; thêm:

8. Hoa hồng: dòng đã có ngày ngừng (kể cả tương lai) không có Đổi/Ngừng; hộp Đổi không sửa được «Ai được hưởng» và «Dịch vụ».
9. Hỗ trợ: từ chối khi bước đổi trạng thái lỗi rồi bấm lại ⇒ luồng có **đúng một** tin lý do.
10. Hỗ trợ: đóng yêu cầu đang mở ở điện thoại ⇒ thanh tab hiện lại.
11. Mọi bài và kịch bản ở bàn giao mục 8 được sửa có chủ đích và xanh — kế hoạch chép đủ danh sách tên, không viết chung «sửa có chủ đích»: kịch bản Chrome `so-dai-ly-smoke`, `loai-doi-tac-smoke`, `muc-ta-smoke`, `dot-c-smoke`, `v1-bao-tri`, `ve-ho-tro-smoke`, `ve-ho-tro-2a-smoke`, `help-smoke`, `trang-chu-smoke`, `quyen-thieu-quan-tri-smoke`; bài `hoa-hong-hien-thi`, `so-dai-ly-nhap`, `bang-tu-giao-dien`, `trang-chu-o`, `huong-dan`, `tro-ly`, `tro-ly-van-nghia`, `tests/e2e/pwa.mjs`, bộ sinh sơ đồ trang. (Bàn giao ghi `an-toan-quyen.test.ts` ở gốc `src/` — tệp không có ở đó; bài cùng tên ở `src/modules/audit/` không chạm pricing, QA1 25/10.) Kịch bản chạy có `AXE_JS` (thiếu biến là xanh giả một phần).

## F. Câu hỏi cho chủ (gom một lần)

**Chủ trả lời 25/10 (hộp hỏi gom):** Q1 = **A** «Mọi màn cùng nghĩa»; Q2 = **A** «Người gửi không thấy»; Duyệt = **«Chưa duyệt, để tôi đọc»** — chưa lập kế hoạch, chưa cấp số ADR. Nội dung Q1, Q2 dưới đây giữ để đọc lại; chỗ ghi «chờ chủ ở Q1/Q2» trong bộ đặc tả nay hiểu là đã chốt theo A. Với Q1 = A: mẫu chặn họ từ hiệu lực áp toàn Nền tảng, PR (2) đổi thêm chữ ở `src/shared/tien-xe-hien-thi.ts`, `web/dieu-kien-xuat-ben.ts`, `web/han-muc-tu-choi-the.ts`, `web/nguoi-ban.ts`, `public/nguoi-ban.html` (chỉ chữ, cùng nghĩa hiệu lực theo ngày; «Đã kết thúc» của bảng giá xe đổi thành «Đã ngừng» cho thống nhất — điểm này người soạn đề xuất kèm, chủ chưa chọn riêng; chủ có thể gạt khi duyệt).

- **Q1 — Phạm vi đổi họ từ hiệu lực.** Chữ «Đang áp / Sắp áp / Đã đóng» còn ở bốn màn ngoài trang Hoa hồng, cùng nghĩa «hiệu lực theo ngày»: bảng giá xe, điều kiện cho xe chạy, hạn mức từ chối, người bán dịch vụ. (A, khuyến nghị) đổi chữ ở mọi màn cùng nghĩa — một nghĩa một chữ, bảng từ chặn toàn Nền tảng; chỉ đổi chữ, thêm khoảng bốn tệp vào PR (2). (B) chỉ đổi ở trang Hoa hồng và Danh bạ, mẫu chặn khớp riêng chữ của hoa hồng — gọn hơn nhưng hai trang dùng hai chữ cho cùng một việc.
- **Q2 — Người gửi có thấy dòng «X đã nhận việc / giao cho / chuyển nhóm» không.** Dòng hệ thống mang cả người và nhóm **trước đó**; người gửi hôm nay chỉ thấy người và nhóm hiện tại, và đối tác bên ngoài chưa từng thấy tên nhóm nội bộ. (A, khuyến nghị — an toàn) người gửi không thấy dòng hệ thống, chỉ thấy «ai đang xử lý» ở đầu yêu cầu. (B) người gửi nội bộ thấy đủ, tài khoản bên ngoài không thấy. (C) mọi người gửi thấy đủ.
- **Duyệt:** đặc tả giao diện, đặc tả máy chủ, đề xuất ADR (một lượt, ba quyết định — xem `TRANG-GHEP.md`).
