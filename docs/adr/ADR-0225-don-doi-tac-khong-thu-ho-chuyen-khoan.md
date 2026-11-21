# ADR-0225 — Đơn đối tác: bỏ ô đặt cọc trên form Đối tác; (đề xuất) chỉ thu hộ tiền mặt

- **Trạng thái:** **proposed** 2026-11-21 — chờ chủ dự án duyệt qua phiên điều phối. Đ1 đã thi công trên nhánh (đảo được bằng một hằng); Đ2 **chưa thi công**, chờ chủ trả lời câu 1(b2) của kế hoạch.
- **Ngày:** 2026-11-21. **Số:** 0225 (giữ trước trong brief của phiên điều phối).
- **Nguồn:** kế hoạch 16 việc 21/11/2026 (nhánh `claude/partner-features-detailed-plan-f32f89`, `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md`), mục 4 câu 1 (b1)(b2)(c), mục 5 «Việc 5», Phụ lục «Việc 5». Lời chủ gốc (việc 5): ẩn ô «Khách đặt cọc cho đối tác» và câu «nội dung chuyển khoản» trên form tạo đơn của đối tác.
- **Loại:** Đ1 nhỏ (giao diện, không đổi máy chủ, không đổi dữ liệu). Đ2 lớn (tiền, một migration dấu trên đơn — số giữ trước 0184), người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** Đ1 hai chiều (đổi `HIEN_O_DAT_COC_DOI_TAC` về `true` là ô hiện lại). Đ2 một chiều mềm (dấu chụp lúc lập đơn; đơn cũ giữ nguyên).
- **Quan hệ với ADR cũ:**
  - **Sửa ADR-0197 Đ1** (chủ duyệt 11/11, lời chủ 8/11: «Luôn có chức năng Đặt cọc trên hóa đơn được tạo bởi đối tác…») và **ADR-0159 Đ1 mục 1** ở mức giao diện: form Tạo đơn của tài khoản Đối tác không còn ô đặt cọc. Đây là **đảo ngược** một yêu cầu chủ đã duyệt mười ngày trước — chủ cần xác nhận đúng ý.
  - **Giữ** mọi luật máy chủ của ADR-0159/ADR-0197 (lời khai cũ trong nháp, thành khoản thu tiền mặt khi xác nhận, chặn vượt tổng, Đ2 chặn khai lại). Máy chủ vẫn nhận `declaredDeposit` từ tài khoản Đối tác (gửi thẳng lệnh vẫn qua) — bỏ hẳn ở máy chủ là việc của Đ2 hoặc một ADR sau.
  - **Ngược với nhánh chưa nhập `worktree-adr-0199-van-phong-nhap-coc`** (ADR-0199, migration 0163: văn phòng nhập cọc lúc tạo đơn, có lựa chọn «Chuyển khoản vào tài khoản Công ty»). Nếu chủ duyệt Đ2, nhánh đó phải sửa trước khi nhập (không sửa ở đây).

## Đ1 — Form Đối tác không còn ô đặt cọc, không còn gợi ý «nội dung chuyển khoản» (đã thi công)

1. Form Tạo đơn của tài khoản giữ quyền Đối tác (kể cả tài khoản lai): ô «Khách đặt cọc cho đối tác», câu giải thích của ô, câu nhắc cọc ở đơn Trả sau và hai dòng Tóm tắt «Khách đặt cọc cho đối tác» / «Khách còn phải trả» không hiện. Phần tử vẫn nằm trong trang, chỉ ẩn.
2. Ô «Ghi chú thanh toán» của form Đối tác bỏ chữ mờ «vd: nội dung chuyển khoản». Form văn phòng giữ nguyên chữ này.
3. Nút gập các câu giải thích về tiền của form Đối tác đổi nhãn «Giải thích giảm giá, đặt cọc» → «Giải thích giảm giá»; nút ẩn khi khối gập không còn câu nào (ô giảm giá đang khoá thì câu lý do nằm ngay dưới ô).
4. Trang hướng dẫn Đối tác (bước 6 «Tạo đơn») bỏ phần chỉ cách khai cọc.
5. **Chuyển tiếp:** nháp cũ đã có lời khai giữ nguyên số (form không gửi khoá `declaredDeposit` ⇒ máy chủ giữ số đang lưu); trang đơn nháp vẫn hiện dòng «Khách đặt cọc cho đối tác (chờ xác nhận)», và khi xác nhận vẫn sinh khoản thu tiền mặt như ADR-0159. Đối tác không sửa được số đó trên form nữa — nhờ văn phòng nếu cần.

## Đ2 — Đơn đối tác chỉ thu hộ tiền mặt (CHƯA thi công, chờ câu 1(b2))

Nếu chủ đồng ý câu 1(b2): với mọi đơn đối tác **lập sau ngày áp** — đơn Đối tác tự lập và đơn văn phòng lập «Qua đối tác» — máy chủ không nhận ghi thu «Chuyển khoản» và không hiện mã QR; khối tiền chỉ còn «Tiền mặt»; luật là một hàm thuần dùng chung giao diện và máy chủ; dấu chụp trên đơn lúc lập (khuôn công tắc ADR-0178, migration 0184), vì hôm nay đơn văn phòng «Qua đối tác» mang `kenhThu = null`. Giữ nguyên «Khoản nộp» (đối tác trả nợ Tour Đảo — không phải thu hộ). Người thu hộ tiền mặt theo câu 1(c). Đơn cũ không đổi.

## Hệ quả

- Đối tác không còn đường khai cọc trên form; tiền khách đưa đối tác không còn hiện trên Nền tảng trước khi xác nhận. Sau xác nhận đối tác vẫn ghi được «Tôi thu» ở trang đơn như hôm nay (Đ2 sẽ siết phần chuyển khoản).
- Kịch bản Chrome `docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs` (đòi ô cọc hiện với Đối tác) hết đúng; e2e `tests/e2e/dat-coc.mjs` (gửi thẳng API) vẫn đúng vì máy chủ không đổi.
- Hàng rào: `src/an-o-coc-doi-tac.test.ts` (luật thuần + nối dây).
