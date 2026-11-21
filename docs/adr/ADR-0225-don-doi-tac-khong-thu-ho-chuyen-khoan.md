# ADR-0225 — Đơn đối tác: bỏ ô đặt cọc trên form Đối tác; chỉ thu hộ tiền mặt

- **Trạng thái:** **proposed** 2026-11-21 — chờ chủ dự án duyệt văn bản này qua phiên điều phối. Chủ đã đồng ý nguyên tắc câu 1 (b1)(b2)(c) của kế hoạch ngày 21/11 (lời chủ do phiên điều phối chuyển, nguyên văn: «còn lại áp dụng như khuyến nghị»). Đ1 và Đ2 đã thi công trên nhánh; **Đ2 mục 2 (lúc gắn dấu) chờ chủ xác nhận** vì khác chữ «lúc lập» của kế hoạch.
- **Ngày:** 2026-11-21. **Số:** 0225 (giữ trước trong brief của phiên điều phối).
- **Nguồn:** kế hoạch 16 việc 21/11/2026 (nhánh `claude/partner-features-detailed-plan-f32f89`, `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md`), mục 4 câu 1 (b1)(b2)(c), mục 5 «Việc 5», Phụ lục «Việc 5». Lời chủ gốc (việc 5): ẩn ô «Khách đặt cọc cho đối tác» và câu «nội dung chuyển khoản» trên form tạo đơn của đối tác.
- **Loại:** Đ1 nhỏ (giao diện, không đổi máy chủ, không đổi dữ liệu). Đ2 lớn (tiền, migration 0184), người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** Đ1 hai chiều (đổi `HIEN_O_DAT_COC_DOI_TAC` về `true` là ô hiện lại). Đ2 một chiều mềm (dấu chụp trên đơn; đơn đã xác nhận trước ngày áp giữ nguyên; gỡ luật = sửa mã, dấu còn lại vô hại).
- **Xây trên lỗ đang hở:** HC-5.19 (chưa diễn tập khôi phục; Đ2 có migration mới). Cần chủ cho phép như ADR-0178, ADR-0221; dòng `xay_tren_cho_phep_adr_0225` ở `docs/quyen-hoan.json` chỉ thêm sau khi chủ nói.
- **Quan hệ với ADR cũ:**
  - **Sửa ADR-0197 Đ1** (chủ duyệt 11/11, lời chủ 8/11: «Luôn có chức năng Đặt cọc trên hóa đơn được tạo bởi đối tác…») và **ADR-0159 Đ1 mục 1** ở mức giao diện: form Tạo đơn của tài khoản Đối tác không còn ô đặt cọc. Đây là **đảo ngược** một yêu cầu chủ đã duyệt mười ngày trước.
  - **Giữ** mọi luật máy chủ của ADR-0159/ADR-0197 (lời khai cũ trong nháp, thành khoản thu tiền mặt khi xác nhận, chặn vượt tổng, Đ2 chặn khai lại). Máy chủ vẫn nhận `declaredDeposit` từ tài khoản Đối tác (gửi thẳng lệnh vẫn qua); bỏ hẳn ở máy chủ là việc của một ADR sau.
  - **Thêm luật thứ hai vào cổng người thu của ADR-0178 Đ1 mục 2** (`kiemNguoiThuKenh`): giữ nguyên luật dấu Tắt; công tắc «Khách của đối tác trả cho Công ty» để Bật nhưng ở đơn mang dấu Đ2 chỉ còn tiền mặt (câu 1(c)).
  - **Giữ** ADR-0182 (Khoản nộp, phiếu công nợ và QR của phiếu: tiền đối tác trả nợ Tour Đảo, không phải thu hộ), ADR-0159 Đ1 mục 3 (khoản lời khai sinh khi xác nhận vốn là tiền mặt), ADR-0089 (lệnh chuyển cọc).
  - **Ngược với nhánh chưa nhập `worktree-adr-0199-van-phong-nhap-coc`** (ADR-0199, migration 0163: văn phòng nhập cọc lúc tạo đơn, có lựa chọn «Chuyển khoản vào tài khoản Công ty»). Nhánh đó phải sửa trước khi nhập, để đơn «Qua đối tác» không nhận cọc chuyển khoản vào tài khoản Công ty (không sửa ở đây).

## Đ1 — Form Đối tác không còn ô đặt cọc, không còn gợi ý «nội dung chuyển khoản» (đã thi công)

1. Form Tạo đơn của tài khoản giữ quyền Đối tác (kể cả tài khoản lai): ô «Khách đặt cọc cho đối tác», câu giải thích của ô, câu nhắc cọc ở đơn Trả sau và hai dòng Tóm tắt «Khách đặt cọc cho đối tác» / «Khách còn phải trả» không hiện. Phần tử vẫn nằm trong trang, chỉ ẩn.
2. Ô «Ghi chú thanh toán» của form Đối tác bỏ chữ mờ «vd: nội dung chuyển khoản». Form văn phòng giữ nguyên chữ này.
3. Nút gập các câu giải thích về tiền của form Đối tác đổi nhãn «Giải thích giảm giá, đặt cọc» → «Giải thích giảm giá»; nút ẩn khi khối gập không còn câu nào (ô giảm giá đang khoá thì câu lý do nằm ngay dưới ô).
4. Trang hướng dẫn Đối tác (bước 6 «Tạo đơn») bỏ phần chỉ cách khai cọc.
5. **Chuyển tiếp:** nháp cũ đã có lời khai giữ nguyên số (form không gửi khoá `declaredDeposit` ⇒ máy chủ giữ số đang lưu); trang đơn nháp vẫn hiện dòng «Khách đặt cọc cho đối tác (chờ xác nhận)», và khi xác nhận vẫn sinh khoản thu tiền mặt như ADR-0159. Đối tác không sửa được số đó trên form nữa — nhờ văn phòng nếu cần.

## Đ2 — Đơn đối tác chỉ thu hộ tiền mặt (đã thi công trên nhánh)

1. **Đơn đối tác** = đơn do tài khoản giữ quyền Đối tác lập (dấu kênh thu ADR-0178 khác NULL), HOẶC đơn có bên đặt đang mang vai được hưởng hoa hồng (cùng vế với cờ `bookerLaDoiTac` của chi tiết đơn và phiếu công nợ). Khác luật `laDonDaiLy` của phiếu công nợ ở một ca: tài khoản lai (Bán hàng + Đối tác) lập đơn khách lẻ thì ở đây vẫn là đơn đối tác. Việc 6 nên dùng cùng định nghĩa này hoặc ghi rõ chỗ khác.
2. **Lúc gắn dấu** (chờ chủ xác nhận): cột `orders.partner_cash_only` chụp ở **câu xác nhận** (1 = đơn đối tác, 0 = không), không phải lúc lập, vì văn phòng đổi được «Khách lẻ» ↔ «Qua đối tác» trên nháp và nháp chưa có khoản thu nào. Sau xác nhận, mỗi lần «Đổi khách» máy chủ chụp lại theo bên đặt mới. Đơn xác nhận trước ngày áp mang NULL và không bao giờ được gắn dấu (trigger `orders_partner_cash_only_guard`); dấu không gỡ về NULL được. Hệ quả: nháp cũ được xác nhận sau ngày áp cũng theo luật mới.
3. **Luật:** ở đơn mang dấu 1, khoản khách trả MỚI mà người thu là phía Tour Đảo (Công ty, nhân viên / hướng dẫn viên) chỉ được là **tiền mặt**; «Chuyển khoản» và «Khác» bị từ chối (409 `don_doi_tac_chi_tien_mat`, câu «Đơn của đối tác chỉ nhận khoản thu hộ bằng tiền mặt. Công ty không nhận chuyển khoản cho đơn này.»). Không đổi: khách trả thẳng đối tác (đối tác «Tôi thu», văn phòng chọn «Khách trả cho đại lý»), trả tại quầy nhà cung cấp, tiền trả lại khách, dòng đảo. Đối tác không hưởng hoa hồng tự ghi «Tôi thu» (vai nhân viên) cũng không đổi, vì tiền vào tay đối tác. **Lệnh chuyển cọc** từ đơn huỷ sang đơn mang dấu không bị chặn: là tiền cũ đổi chỗ, không phải thu mới.
4. **Nơi chặn:** luật thuần `thuHoChiTienMat` (`src/shared/kenh-thu-doi-tac.ts`) chạy trong cổng `kiemNguoiThuKenh` mà cả sáu đường ghi khoản khách trả đã gọi (bài quét `src/kenh-thu-noi-goi.test.ts`); lớp CSDL `bil_receipt_partner_cash_only` (migration 0184).
5. **Mã QR** vào tài khoản công ty: đơn mang dấu ⇒ «không có QR» (cả văn phòng). QR của phiếu công nợ giữ nguyên.
6. **Trang đơn:** đơn mang dấu không có nút QR, không có lựa chọn «Công ty (vào tài khoản công ty)», ô «Hình thức» chỉ có «Tiền mặt» khi người thu là phía Tour Đảo (luật thuần `hinhThucChoPhep`); «Sửa khoản thu đã ghi», «Ghi bù khoản thu» của Kế toán và form «Ghi khoản thu đòi được» của phân định KHÔNG lọc hình thức ở giao diện (ô người thu chỉ mang id hồ sơ, giao diện không biết là đại lý hay nhân viên; lọc sẽ đổi âm thầm hình thức khoản đại lý chuyển khoản — kiểm độc lập 21/11); máy chủ chặn đúng ca với câu lời thường. Lỗi từ lớp CSDL (chỉ xảy ra khi hai lệnh chen nhau) chưa dịch sang câu riêng, như trigger 0144 của ADR-0178.
7. **Người thu hộ tiền mặt** (câu 1(c)): hướng dẫn viên hoặc nhân viên Tour Đảo tại nơi đón, ghi «Tôi thu» tiền mặt như hôm nay; số đã thu hộ trừ vào nợ của đối tác theo luật sổ hiện có. Công tắc «Khách của đối tác trả cho Công ty» để Bật (chưa kiểm trên bản chạy thật hôm nay).

## Hệ quả

- Đối tác không còn đường khai cọc trên form; tiền khách đưa đối tác không còn hiện trên Nền tảng trước khi xác nhận. Sau xác nhận đối tác vẫn ghi được «Tôi thu» ở trang đơn như hôm nay.
- **Thu hẹp ADR-0196** (ảnh biên lai chuyển khoản bắt buộc khi Đối tác ghi «Công ty, chuyển khoản»): ở đơn đối tác mới khoản đó bị chặn 409 trước khi xét ảnh, nên ảnh biên lai chỉ còn dùng ở đơn xác nhận trước ngày áp. Mã ADR-0196 giữ nguyên (e2e `tests/e2e/bien-lai.mjs` kiểm cả hai ca).
- Kế toán không còn ghi được «Công ty thu, chuyển khoản» ở đơn đối tác mới; khách lỡ chuyển khoản vào tài khoản công ty thì hôm nay chưa có đường riêng để ghi — cần chủ quyết cách xử lý nếu xảy ra.
- Kịch bản Chrome `docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs` đã sửa theo Đ1. Bảy bài kiểm cũ dùng «Công ty thu, chuyển khoản» ở đơn đối tác nay đưa đơn về tình huống trước ngày áp (`tests/audit/chi-tien-mat.mjs`).
- Hàng rào: `src/an-o-coc-doi-tac.test.ts` (Đ1); `src/modules/billing/thu-ho-tien-mat.test.ts`, `src/shared/kenh-thu-doi-tac.test.ts`, `src/shared/ben-kia-hien-thi.test.ts` (Đ2) — hai dòng ở `docs/SO-HANG-RAO.md`.
