# Kịch bản bấm thử đợt D1 khung gốc (27/11/2026)

Sáu bản chép, giữ TÊN tệp cũ vì bảng «sửa tệp nào → chạy kịch bản nào» (`docs/KICH-BAN-CHROME.md`) trỏ tới tên đó. Bản gốc là hồ sơ có ngày, không sửa:

- `dot-a-smoke.mjs` ← `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`
- `passkey-smoke.mjs` ← `docs/evidence/2026-09-23-passkey/kich-ban/passkey-smoke.mjs`
- `vai-smoke.mjs` ← `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`
- `quyen-thieu-quan-tri-smoke.mjs` ← `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/quyen-thieu-quan-tri-smoke.mjs` (bản 29/10 thay bản 2026-10-01 cùng tên mà bảng còn trỏ)
- `hai-lop.mjs` ← `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/hai-lop.mjs`
- `t2b-danh-ba-smoke.mjs` ← `docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs` (Danh bạ)

Không có kịch bản Chrome riêng cho Máy đang đăng nhập, Phiếu đăng ký, Nhật ký, Gửi thông báo ngoài các phần đã nằm trong sáu bản trên (Nhật ký ở `dot-a-smoke`, `quyen-thieu-quan-tri-smoke`; Gửi thông báo ở `quyen-thieu-quan-tri-smoke`). Chưa chép: `nhan-tai-xe-smoke.mjs` (Gửi thông báo, chỉ đọc danh sách vai), `giay-to-nguoi-smoke.mjs`, `nha-xe-danh-ba-smoke.mjs`, `gop-ho-so-smoke.mjs`, `xac-minh-smoke.mjs`, `va3-smoke.mjs` (Danh bạ / Quản lý tài khoản, bảng còn trỏ).

Chạy từ gốc kho sau `npm run build:web` (mỗi kịch bản tự dựng máy thử riêng, không cần cổng 8891):

```
AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-26-khung-goc-dot-d1/kich-ban/<tên>.mjs
```

## Bảng đổi bộ chọn (cũ → mới)

| Trang | Cũ | Mới |
|---|---|---|
| Quản lý tài khoản | `table.items`, `.card-list .card`, `#list-cards > .card` | `table.bang` (khối từ 800 hiện bảng), `#list-cards > .dong` |
| Quản lý tài khoản | nút lọc vai `.loc-nut` | chip `.vien[data-loc]` (giữ `#loc-vai`, `aria-pressed`) |
| Quản lý tài khoản | khối `#add-card` chứa `#add-form`, nút `#add-form button[type=submit]` | nút `#add-card` mở bảng trượt chứa `#add-form`; nút gửi `#add-tao` (ngoài form, thuộc tính `form=`). Bảng đóng thì biểu mẫu rời trang theo bảng — bước sau phải mở lại |
| Quản lý tài khoản | hộp sửa `#edit` (`h2`), hộp tắt hai lớp trong `#edit` | bảng trượt `.sheet` (`.sheet-title`), `#mfa-reset-confirm` trong `.sheet` |
| Quản lý tài khoản | thẻ Hàng chờ xác minh `.btn.xm-tab` | `.vien` (giữ `#xm-tab-cho`, `#xm-tab-xong`) |
| Danh bạ | dòng vai `#detail table.items tr`, dòng ngừng `.row-off` | `#detail .dong`, dòng ngừng `[data-ngung]` |
| Danh bạ | ô chọn công việc: `h3.nextElementSibling.nextElementSibling` | `h3.closest('.khoi').querySelector('select')` |
| Danh bạ | lưới `.grid`, nhãn bọc ô `label > select` | `.luoi`, `.truong > label[for]` + ô |
| Mọi trang | khổ máy tính 1040 | 1280 ở bước cần BẢNG (ở 1040 khối của khung hẹp hơn 800 nên hiện danh sách dòng — đúng khuôn) |

Dòng `[trước D1]` trong bản chép: chỗ đổi để bước chạy tới phần D1, lý do không do D1 — (1) axe bỏ qua thanh trên `#topbar`: nút ảnh đại diện và chuông có `aria-label` khác chữ hiện (`label-content-name-mismatch`, serious) ở MỌI trang, kể cả `/orders`; (2) ADR-0191: tài khoản xem mọi khách do Nhân sự tạo không có PIN, khối «Tài khoản mới» chỉ có nút «Đóng» / câu chờ Quản trị cấp PIN. `quyen-thieu-quan-tri-smoke` thêm: mỗi phần C, C2, câu từ chối từng trang, D chạy trong `try` riêng (vẫn thoát 1 khi có phần đỏ); `dot-a-smoke`: vòng năm trang chạy từng trang riêng.

## Kết quả chạy 27/11/2026 (máy thử riêng của kịch bản, AXE_JS đặt, sau lần lưu 2634d91fe)

- `dot-a-smoke`: bộ lọc vai máy tính + điện thoại ĐẠT; Quản lý tài khoản, Dịch vụ, Địa điểm, Danh bạ (1280 + 390) ĐẠT. Đỏ không do D1: Nhật ký — tài khoản Quản trị bị 403 (Nhật ký chỉ Toàn quyền từ ADR-0038; đã ghi «đỏ sẵn» trong bản gốc).
- `passkey-smoke`: **9/9 bước đạt** (bước staff-admin: nút «Gỡ Face ID (1)» ở đúng dòng, một nút trên trang).
- `vai-smoke`: **10/10 phần đạt** (thêm theo vai, sửa vai qua bảng trượt, 1e, B1 Tài xế đối tác, R26 hồ sơ có sẵn, điện thoại + axe, Danh bạ R18, Thực tập sinh).
- `quyen-thieu-quan-tri-smoke`: 18 đạt, 2 đỏ. Đạt mọi phần chạm D1: Toàn quyền vào /staff, /audit, /gui-thong-bao; Nhân sự vào /staff; C2 (hồ sơ khớp, 409, tạo được); /audit 403; câu từ chối /gui-thong-bao; D (khối «Quyền cũ» ở bảng trượt Sửa, Quản trị không thấy, Toàn quyền thấy 9 ô). Đỏ không do D1: thanh bên của tài khoản chỉ Nhân sự (menu đổi từ trước D1), câu từ chối /catalog nay «Tài khoản này không vào được trang này.» (trang Dịch vụ, ngoài D1).
- `hai-lop`: 7/9 đạt, gồm bước 6 (Quản lý tài khoản 1280: nhãn «Hai lớp», nút theo cờ máy chủ, bảng trượt xác nhận → tắt, axe). Đỏ không do D1: bước 1 (không thấy dải nhắc `#mfa-strip` ở Trang chủ) và bước 2 (axe ở trang Tôi: `.bar-avatar` của thanh trên).
- `t2b-danh-ba-smoke`: **3/3 phần đạt** (A Quản trị, A2 Giới tính 1040 + 390, B Toàn quyền đổi công ty chủ 1040 + 390).
