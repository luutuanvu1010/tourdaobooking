# Loại đối tác là dữ liệu — giao diện (14/10/2026)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Luật: ADR-0117 lần 1 (migration 0095). Màn: mục «Loại đối tác» ở `/hoa-hong` (`web/hoa-hong.ts`, `public/hoa-hong.html`) và ô chọn «Thêm công việc» ở Danh bạ (`web/parties.ts`).

**Hai quyết định bề mặt (đảo ngược được, chờ chủ xem ảnh):** (i) mục «Loại đối tác» đặt ngay trên «Các mức hiện có», dạng danh sách (không bảng, khỏi tràn ngang ở 390px): tên, «Có sẵn» hoặc «Do Kế toán thêm», «Đang dùng» hoặc «Đã tắt», nút «Tắt» / «Bật» chỉ ở loại do Kế toán thêm; ô «Tên loại mới» + nút «Thêm loại» chỉ hiện cho người có quyền ghi. (ii) Ở Danh bạ, ô chọn «Thêm công việc» ghi thêm « (đối tác)» sau tên loại mới (theo cờ của máy chủ). Muốn tên khác thì đổi chữ, không đổi mã.

**Kết quả:** `kich-ban/loai-doi-tac-smoke.mjs` — 10 bước (5 bước × 2 khổ 390 / 1040), chạy đủ với axe-core 4.13.0 (`AXE_JS`): xanh (kèm mục «Đã biết» bên dưới). Ảnh chụp ẩn tạm thanh tab dưới và nút nổi Hỗ trợ (chỉ lúc chụp) để không đè lên ảnh dài. axe nhẹ (không đỏ): `empty-table-header` ở cột cuối của bảng mức có sẵn từ trước (khổ 1040).

## Cách chạy
Từ gốc repo, sau `npm run build:web`; D1 local TẠM (Turnstile tắt, không `--remote`); cần axe-core lấy ngoài repo (`npm pack axe-core`).
```
AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-14-loai-doi-tac/kich-ban/loai-doi-tac-smoke.mjs
```
Thiếu `AXE_JS` thì dừng ngay. Phá thử: `LD_PHA=co-san` (máy chủ giả coi mọi loại là do Kế toán thêm) ⇒ bước 1 đỏ; `LD_PHA=lo-ma` (tên loại mới thành mã thô) ⇒ bước 1 đỏ; dùng kèm `LD_KHO=390`, `LD_DUNG=<mã bước>`, `OUT=<thư mục tạm>`.

## Bước → ảnh
| Bước | Ảnh |
|---|---|
| 1 Kế toán mở mục «Loại đối tác» (loại có sẵn không nút) | `anh/01-ke-toan-loai-doi-tac-390.png`, `-1040.png` |
| 2 Thêm loại bằng biểu mẫu thật; ô «Loại đối tác» của «Thêm mức» thấy loại mới ngay | `anh/02-da-them-loai-390.png`, `-1040.png` |
| 3 Tắt / Bật; nút cũ gặp 409 | `anh/03-da-tat-loai-390.png`, `-1040.png` |
| 4 Bán hàng chỉ xem | `anh/04-ban-hang-chi-xem-390.png` |
| 6 Danh bạ: ô chọn « (đối tác)» và dòng công việc sau khi thêm | `anh/05-danh-ba-o-chon-*.png`, `anh/06-danh-ba-da-gan-*.png` |

## Đã biết (ghi nguyên văn, không sửa CSS chung)
axe-core ở bước 3, NGAY khi một loại ở trạng thái «Đã tắt» (dòng mờ bằng `.row-off { opacity: .6 }`, khuôn sẵn của dự án — cùng khuôn dòng mức đã đóng của trang này), báo `serious color-contrast` ở cả hai khổ 390 và 1040:
`Kế toán, loại ở trạng thái Đã tắt [390]: serious color-contrast — .row-off > .hh-loai-ten > .hh-loai-nhan > .muted | .badge-cancelled | button[data-loai-act="bat"]` (cùng dòng cho `[1040]`).
Kịch bản chỉ GHI lỗi tương phản ở đúng trạng thái này (không đỏ); mọi lỗi axe khác và mọi trạng thái khác (đang dùng, Bán hàng xem) vẫn phải sạch critical / serious. Đáng để chủ cân nhắc: nút «Bật» cũng nằm trong dòng mờ nên chữ nút nhạt; muốn sửa thì một việc riêng cho khuôn `.row-off` dùng chung (hoặc dòng loại tắt không dùng `opacity`), không sửa riêng ở đây.

## Chưa kiểm
iPhone thật; khổ 1280; menu thả xuống của ô chọn (ảnh headless không vẽ danh sách thả, chỉ kiểm chữ các lựa chọn bằng mã); tài khoản không có quyền xem (trang chặn bằng câu tiếng Việt — canh ở `so-dai-ly-smoke.mjs`).

## Đề xuất cho chủ (không có hiệu lực tới khi chủ duyệt)
Thêm một dòng vào bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» ở `web/CLAUDE.md`: sửa `web/hoa-hong.ts`, `public/hoa-hong.html`, khối `.hh-loai*` của `public/app.css`, hàm `nhanLoaiDoiTac` của `src/shared/hoa-hong-hien-thi.ts`, hoặc ô chọn «Thêm công việc» của `web/parties.ts` ⇒ chạy `loai-doi-tac-smoke.mjs` ở thư mục này (10 bước, 390 + 1040, cần D1 tạm, thêm `so-dai-ly-smoke.mjs` vì trang `/hoa-hong` dùng chung).
