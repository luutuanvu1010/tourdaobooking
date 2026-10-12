# Dòng mới cho `docs/adr/README.md` (bản chép lượt 8d, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Không sửa `docs/adr/` ở đây. Dòng "cũ" chép nguyên văn từ `docs/adr/README.md` @ `9434c9b2` (nhánh `claude/van-chuyen-goi-a-c`) để dùng làm chuỗi tìm khi thay. Dòng mới theo khuôn cột của dòng 0109, 0110 (`:116-117`): liên kết | quyết định | cửa | trạng thái. README không có cột "bị thay": các dòng của ADR bị sửa (0049 `:53`, 0052 `:56`, 0097 `:106`, 0104 `:112`) không cần đổi — dòng 0052 "thiếu nghỉ / trong 6 giờ khi xe nhận chưa chạy thì Quản trị/Toàn quyền duyệt" và dòng 0097 "thu hồi xuất bến khi chưa có tiến độ" vẫn đúng sau ADR-0111.

## 1. Thêm dòng 0111 (ngay sau dòng 0110, `:117`)

Chèn sau dòng này (không đổi nó):

```
| [0110](ADR-0110-doi-thu-tu-diem-chi-chan-dao-moi.md) | **Đổi thứ tự điểm dừng — giữ cách đang làm:** lệnh đổi thứ tự chỉ bị từ chối 409 khi làm một suất chờ lên bị đảo **mới** (đảo cũ sửa dần được bằng ↑ ↓; chuyến kế hoạch vẫn không xuất bến khi còn đảo); nút ↑ ↓ của chuyến kế hoạch đi qua lệnh sửa chuyến sẵn có `PUT /api/van-chuyen/chuyen/:id`, không route riêng. Sửa ADR-0096 Đ1.3b (thay đổi thật), Đ1.3c (sửa chữ, đọc hẹp), `:84` | hai chiều; không đổi mã | **accepted** 2026-10-08 (chủ, lượt 8c câu 2: "Giữ cách đang làm (Recommended)") |
```

Dòng thêm:

```
| [0111](ADR-0111-chuyen-khach-giua-xe.md) | **Chuyển khách giữa hai xe (thi hành ADR-0052 D4, D5c):** điều kiện chuyển là danh mục `vc_transfer_rule` (11 dòng; thêm `CAM_KET_DICH` — làm sai cam kết xe riêng / số chỗ tối thiểu thì chờ Quản trị duyệt, và `CHANG_KHACH_HIEU_LUC` — khách của đơn đã huỷ / chặng không còn hiệu lực thì chỉ bác được); dấu vết: suất mang `transfer_id` (đề nghị mở) và `closed_transfer_id` (đề nghị đóng), cột quyết định ghi lại đúng một lần khi Quản trị duyệt / bác, trigger duyệt đọc mọi dòng kiểm của đề nghị; công tắc tự đồng ý đọc lúc tài xế đích bấm Nhận; tin "không nhận" tới tài xế nguồn, qua đường tin chuyến sẵn có; cứu hộ `ONBOARD` chỉ sang xe đang chạy, người đi kèm sang cùng khách; thu hồi xuất bến: chuyến đã giao khách cho xe khác thì không thu hồi được, đề nghị chưa thành không chặn xe nhận, thu hồi làm đề nghị đang chờ liên quan thành `VOID`; chặng đặt gấp chuyển sang xe chưa chạy dưới mốc vẫn chờ Quản trị. Nới có tên N2 (bài NT-3(b)), N3 (R-VC-16). Sửa ADR-0052 (D4, D5c, D6, câu thay LC-15, tiêu chí 1), ADR-0097 Đ3.2, ADR-0049 dòng Xếp; ADR-0104 bài kiểm 3 (`:277`) | một chiều (bảng danh mục và khoá ngoại, hai cột suất, bốn cột đề nghị, tên việc nhật ký, việc "không nhận" vào danh sách tin); còn lại hai chiều | **accepted** 2026-10-08 (chủ, lượt 8d-1 và 8d-2, bảy hộp đều chọn "(Recommended)"; Đ6 "Vẫn chờ Quản trị (Recommended)") |
```

## 2. Thay dòng "số ADR mới kế tiếp" (`:118`)

Cũ:

```
| — | (số ADR mới kế tiếp là **0111** — 0110 đổi thứ tự điểm dừng: giữ cách đang làm; 0109 phải thu không âm; 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0107 Bán hàng tự đóng dấu đặt gấp; 0106 mốc chụp khoảng nghỉ; 0105 hai nút Chỉ đường; 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 bỏ trống (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ; điều phối chốt bỏ trống — sổ thi công, mục "Lượt duyệt 8b"); 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Mới:

```
| — | (số ADR mới kế tiếp là **0112** — 0111 chuyển khách giữa hai xe; 0110 đổi thứ tự điểm dừng: giữ cách đang làm; 0109 phải thu không âm; 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0107 Bán hàng tự đóng dấu đặt gấp; 0106 mốc chụp khoảng nghỉ; 0105 hai nút Chỉ đường; 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 bỏ trống (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ; điều phối chốt bỏ trống — sổ thi công, mục "Lượt duyệt 8b"); 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Khác nhau đúng một chỗ: "kế tiếp là **0111** — 0110 …" thành "kế tiếp là **0112** — 0111 chuyển khách giữa hai xe; 0110 …"; phần sau giữ nguyên.

**Đo số (2026-10-08):**
- `git log --all --oneline -- 'docs/adr/ADR-0111*' 'docs/adr/ADR-0112*'`: rỗng — không nhánh nào có tệp mang hai số này.
- `git log --all --oneline -S "ADR-0112"` (đo trước commit của bản chép này): chỉ `42c2448d` (bản thảo tệp 01 của lượt này, câu "`git log --all -S"ADR-0112"`: rỗng" ở mục "Cách chốt số ADR"). Không trùng.
- `main` (`43857d7a`) chưa có dòng 0108 và dòng "số kế tiếp" vẫn ghi **0103** (`:113`). Nhánh `claude/ticket-sales-qr-payment-cf8e18` (`6de7450e`) có dòng 0108 (`:112`) và dòng "số kế tiếp" vẫn ghi **0103** (`:113`). Như lượt 8b, 8c: hai nhánh cùng sửa dòng này, ai gộp sau phải ghép tay (giữ **0112**, giữ dòng 0108).

## 3. Không có đề xuất cho `docs/SYSTEM-DESIGN.md` §16

Lượt này không đóng hay mở dòng "lệch có chủ ý" nào. Việc ghi N2, N3 vào `docs/SO-HANG-RAO.md` là của người thi công (sổ thi công `:92`), không thuộc bản chép.
