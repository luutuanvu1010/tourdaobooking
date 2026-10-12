# Sổ đại lý đợt 1 — kịch bản Chrome và ảnh thật (Task 13, 12/10/2026)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Nền: nhánh `claude/sdl-t13-thu-dau-cuoi` dựng trên `6a02cd1f` (đã gộp Task 1–12, K-a, K-c). Đặc tả: `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md`; kế hoạch Task 13 Step 4; ghi chú điều phối §3.

**Kết quả:** `kich-ban/so-dai-ly-smoke.mjs` — **SMOKE OK, 80/80 bước**, `AXE_JS` = axe-core 4.13.0 (lấy bằng `npm pack` ngoài kho). axe: 0 vi phạm critical/serious ở mọi trang đã chạy; 4 vi phạm **minor** `empty-table-header` (cột nút cuối bảng ở `/hoa-hong` và `/nguoi-ban` khổ 1040 không có chữ tiêu đề) — ghi lại, không sửa mã sản phẩm. **Chờ chủ duyệt ảnh** (nhãn «Hoa hồng», «Giá đại lý», «Khách tính», «Mức», «Người bán», bố cục) — điều A3.

## Cách chạy

Từ gốc repo (worktree), sau `npm run build:web`. D1 local TẠM của `a2-cdp.mjs` (Turnstile tắt, không `--remote`, không gọi production); dữ liệu thử là danh mục giả + số điện thoại giả khuôn `09000002xx`.

```
AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs
```

Thiếu `AXE_JS` thì kịch bản dừng ngay (không có "xanh giả một phần"). Mỗi bước chạy riêng; cuối cùng in các dòng `ℹ` (quan sát), mục «axe nhẹ», rồi `SMOKE OK` hoặc danh sách bước đỏ (thoát 1). `OUT=<thư mục>` để ghi ảnh chỗ khác.

**Phá thử (P16, không sửa mã sản phẩm):** `SDL_PHA=404,tien OUT=<thư mục tạm>` gắn vào trang một lớp bọc `fetch` giả hai lỗi giao diện mà `npm test` không bắt — (404) trang coi 404 của `…/thuong-mai` là lỗi, (tien) giao diện hiện số khác DTO. Quan sát ngày 12/10/2026: `SDL_PHA=404,tien` ⇒ **SMOKE ĐỎ 11/80** đúng các bước so DTO (4a, 5a, 5-mang, 7c, 33c ở hai khổ) và bước (i) 35i ở hai khổ; `SDL_PHA=404` riêng ⇒ 35i đỏ ở khẳng định DOM (khối hiện / có `.alert`). Bỏ biến ⇒ xanh lại.

Quy tắc của kịch bản: một lúc chỉ một trang mở; dữ liệu của một tài khoản dựng bằng API TRƯỚC khi mở trang của tài khoản đó (ADR-0074/0075: đăng nhập lại cùng tài khoản thay phiên của trang đang mở); "người khác vừa đổi" giả bằng tài khoản khác gọi từ Node hoặc `fetch` trong trang; trang tài khoản Đối tác mở sau cùng (kho cookie Chrome dùng chung). Bước `/khoa-thang` chạy ĐẦU vì D1 mới chỉ còn tháng trước để khoá.

## Bước → ảnh → kết quả

Mọi ảnh ở `anh/`, hai khổ `-390` (điện thoại) và `-1040` (máy tính) trừ khi ghi một khổ. Ảnh «cả trang» chụp bằng cách kéo cao khung nhìn tới hết trang.

| Bước | Ảnh | Kết quả |
|---|---|---|
| 6. Kế toán `/khoa-thang`: bảng kiểm, hộp xác nhận | `6-khoa-thang-*`, `6-khoa-thang-hop-xac-nhan-*` | ✓ tháng khoá được là 09/2026; ba khối bảng kiểm; nút mở hộp trong trang, tiêu điểm vào hộp |
| 6. Ghi chú «Đối chiếu ngày 30.09.2026» (nợ M-1 Task 12) | `6-khoa-thang-ghi-chu-ngay-cham-*` | máy chủ TỪ CHỐI: «Ghi chú không được chứa số điện thoại / số tài khoản.» — hộp và chữ đã gõ giữ nguyên, chưa khoá tháng nào. Luật bỏ dấu chấm rồi thấy 8 chữ số liền. Ghi lại, không sửa luật |
| 6. 409 + cuộn (E-1 Task 12): tháng vừa được khoá ở chỗ khác | `6-khoa-thang-409-cuon-390` | ✓ «Tháng 09/2026 đã khoá rồi.» nằm trọn trong khung nhìn sau khi cuộn từ đáy; hộp đóng; trang tải lại, không còn tháng khoá được |
| 1. Kế toán `/hoa-hong`: danh sách, «12,555», thêm 12,5% «Công ty lữ hành» · nhóm Du thuyền (390) / «Cộng tác viên» (1040) | `1-hoa-hong-ke-toan-*`, `1-hoa-hong-ty-le-sai-*` | ✓ «12,555» ⇒ dưới ô: «Tỷ lệ là số từ 0 tới 100, tối đa hai chữ số sau dấu phẩy (vd 12,5).», không gửi; thêm ⇒ «Đã thêm mức.» |
| 1. Kế toán: ô «Một đối tác», «Tra mức» | `1-hoa-hong-thu-tra-khoa-*` | ✓ `#muc-doi-tac[data-khong-tim-duoc]` «…nhờ Quản trị hoặc Toàn quyền.»; «Tra mức» khoá (Ruling 26) |
| 1. Hộp «Đóng mức» | `1-hoa-hong-hop-dong-*` | ✓ hộp có ngày kết thúc + xác nhận; «Thôi» đóng hộp |
| 1. Quản trị / Toàn quyền: tra đối tác, Thử tra «Lê Thu Hà» · Du thuyền Emperor | `1-hoa-hong-thu-tra-quan-tri-*` | ✓ «Áp mức 12,5% — mức của loại đối tác cho nhóm» (bậc 5). Quản trị cũng có ô «Thêm mức» và nút «Đóng mức» |
| 2. Kế toán `/nguoi-ban`: thêm «I Resort Nha Trang» mua lại 80% cho một dịch vụ; nhóm Thuê xe | `2-nguoi-ban-*`, `2-nguoi-ban-thue-xe-409-*` | ✓ «Đã thêm điều khoản.»; nhóm Thuê xe ⇒ «Dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (để khỏi tính tiền xe hai lần).» trong khung nhìn |
| 3.1 Bán hàng `/hoa-hong` chỉ xem; `/nguoi-ban` | `31-hoa-hong-ban-hang-*`, `31-nguoi-ban-ban-hang-tu-choi-390` | ✓ có dòng mức (chính dòng Kế toán thấy nút Đóng) nhưng không ô thêm, không `[data-dong]`; thanh bên 11 mục có «Hoa hồng đối tác», không «Người bán dịch vụ»; mở thẳng `/nguoi-ban` ⇒ «Bạn không có quyền xem trang này.» |
| 3. Bán hàng form: «Đặt qua đối tác» → chọn đại lý; lưu nháp; mở lại | `3-form-dat-qua-truoc-*`, `3-form-dat-qua-tim-*`, `3-form-ban-hang-*`, `3-form-mo-lai-nhap-*` | ✓ chọn ⇒ «Đặt qua: Lê Thu Hà», ô tra SĐT ẩn, ô Tên + SĐT khách còn; lưu ⇒ trang đơn; mở form sửa ⇒ đại lý nạp lại vào ô «Đặt qua đối tác» |
| 4. Bán hàng trang đơn nháp → Xác nhận | `4-don-nhap-du-kien-*`, `4-don-da-xac-nhan-*` | ✓ chip «Dự kiến — tính theo bảng mức hôm nay, chưa lưu»; sau xác nhận hết chip, dòng «Bên đặt (đối tác)»; mọi số trong khối khớp chữ DTO `GET …/thuong-mai` |
| 4. Bảng «Đổi khách» + quan sát nháy | `4-doi-khach-bang-*`, `4-doi-khach-ngay-sau-luu-*`, `4-doi-khach-sau-*` | ✓ bảng nạp sẵn đại lý ở ô «Đặt qua đối tác»; lưu ⇒ khối đi qua hiện → ẩn → hiện (máy local: 9–16 ms mất khỏi màn qua ba lần chạy), mỗi lần vẽ trang đơn 1 lời gọi `…/thuong-mai`; Bán hàng 0 lời gọi `/api/pricing/cung-ung`, Kế toán 1 lời gọi mỗi lần vẽ (bước 5). Ảnh ngay sau khi lưu không bắt được lúc khối ẩn — trên mạng điện thoại thật khoảng trống kéo dài cỡ một lượt mạng (chưa đo) |
| 5. Kế toán: dòng thiếu mức → «Ghi mức tay» 15% có lý do | `5-ke-toan-dong-thieu-muc-*`, `5-ghi-tay-bang-*`, `5-ghi-tay-sau-*` | ✓ bảng `#ghi-tay-sheet` đủ ô; ghi ⇒ khối vẽ lại, dòng có chip «ghi tay», hết cảnh báo thiếu mức; số khớp DTO |
| 5. Nhánh 409 của bảng (Quản trị huỷ đơn giữa chừng) | `5-ghi-tay-409-390` | ✓ «Chỉ ghi mức tay cho đơn đã xác nhận.» hiện TRONG bảng, bảng giữ mở, khối nạp lại phía sau |
| 5. Lỗi mạng ở `…/thuong-mai` | `5-phan-doi-tac-loi-mang-1040` | ✓ «Không tải được phần đối tác — kiểm tra mạng rồi thử lại.» + nút «Tải lại»; mở mạng, bấm ⇒ khối dựng đủ |
| 3.6 Quản trị form; `/khoa-thang` | — | ✓ có ô «Đặt qua đối tác»; `/khoa-thang` ⇒ «Trang Khoá sổ tháng chỉ Kế toán và Toàn quyền xem được.» |
| 3.3 Tài khoản lai (Bán hàng + Đối tác): menu, URL thẳng, form | `33-hoa-hong-tai-khoan-lai-tu-choi-390` | ✓ không liên kết `/hoa-hong`, `/nguoi-ban`, `/khoa-thang`; mở thẳng ⇒ «Bạn không có quyền xem trang này.»; form không có ô «Đặt qua đối tác» |
| 3.3 Tài khoản lai gửi bên đặt là hồ sơ đại lý | `33-tai-khoan-lai-403-1040` | ✓ form hiện NGUYÊN câu 403 «Đơn qua đại lý hoặc cộng tác viên do văn phòng lập hộ — tài khoản đối tác không chọn được bên đặt này.» (ô tra SĐT không thấy hồ sơ đại lý — tra theo số tài khoản trả 0 hồ sơ — nên kịch bản sửa thân gửi ngay trong trang) |
| 3.5 (i) Tài khoản lai mở đơn của người khác có người hưởng | `35i-tai-khoan-lai-don-nguoi-khac-*` | ✓ trang gọi `…/thuong-mai` 1 lần, máy chủ 404; `#phan-doi-tac` có trong DOM, `hidden`, rỗng, không `.alert` |
| 3.3 Tài khoản lai mở đơn khách lẻ của mình | `33-tai-khoan-lai-don-cua-minh-390` | ✓ «Hoa hồng của bạn» (dạng Đối tác); DOM (kể cả phần ẩn, thuộc tính) không có tỷ lệ %, «Người bán», «Mua lại», «giá vốn», tên nhà cung cấp, ô «Mức»; DTO không có khoá `muc`/`tyLe*`/`nguoiBan`/`nhaCungCap` |
| 7. Đối tác thuần: menu, URL thẳng | `7-doi-tac-nguoi-ban-tu-choi-390` | ✓ không liên kết ba trang; `/hoa-hong`, `/nguoi-ban` ⇒ «Bạn không có quyền xem trang này.»; `/khoa-thang` ⇒ câu của trang |
| 7. Đối tác thuần form: «Bên đặt: …» | `7-form-ben-dat-chi-doc-*`, `7-form-doi-tac-*` | ✓ `#ben-dat-chi-doc[data-party-id]` «Bên đặt: Lê Thu Hà», không ô «Đặt qua đối tác», không ô tra SĐT; `/api/auth/me` trả `benDatCuaToi` đúng tên. Đối tác ĐƯỢC HƯỞNG gửi bên đặt khác ⇒ máy chủ ÉP về chính mình (201), không 403 |
| 7. Đối tác thuần trang đơn của mình | `7-doi-tac-don-cua-minh-*` | ✓ «Hoa hồng của bạn», ô của dòng chỉ «Thành tiền / Hoa hồng / Giá đại lý»; số khớp DTO hẹp (1.800.000 · 225.000 · 1.575.000); DOM không tỷ lệ / người bán / giá vốn |

Ghi thêm cho chủ khi duyệt ảnh: ở `/hoa-hong` khổ 1040 huy hiệu «Đang áp» xuống hai dòng trong cột Trạng thái hẹp; dòng kết quả Thử tra nói «cho nhóm» mà không nêu tên nhóm.

## Kịch bản Chrome cũ chạy lại (12/10/2026, cùng `AXE_JS`, ảnh vào thư mục tạm)

Xem mục "Task 13" cuối `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`.
