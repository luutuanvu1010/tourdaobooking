# Thiết kế lại giao diện Tour Đảo Booking — đặc tả

- **Ngày:** 2026-09-22
- **Chủ dự án đã duyệt:** hướng đi tổng thể (3 bước) và các quyết định trong tài liệu bàn giao đi kèm bản thiết kế — xem §3; và 4 điểm phát sinh lúc kiểm đặc tả (dữ liệu danh sách đơn, thẻ/bảng, số đo khung trang, kiểu thẻ đơn) — xem §16.
- **Nguồn thiết kế:** `docs/design/mockup-by-ClaudeDesign/` (16 tệp `.dc.html`, sao chép từ dự án Claude Design của chủ dự án ngày 2026-09-21/22; xem §3 về mức độ tin cậy). Gồm 11 trang restyle + 1 khuôn lớp phủ/trạng thái + 1 tài liệu bàn giao + 2 phương án Trang chủ (§10) + 1 tệp thăm dò kiểu thẻ đơn ("Order Card - 3 Phong Cach.dc.html", không nằm trong bảng ánh xạ §4 — xem quyết định ở §16 mục 4).
- **Trạng thái:** đặc tả, CHƯA thi công. Bước tiếp theo sau khi chủ duyệt tài liệu này: lập kế hoạch thi công (`writing-plans`).

## 1. Bối cảnh

Ứng dụng CRM `tourdao-sales` (11 trang, xem `docs/SYSTEM-DESIGN.md` §9) đã chạy production từ nhiều vòng thiết kế trước (A1, A2). Chủ dự án đã tự thiết kế lại toàn bộ giao diện bằng công cụ Claude Design, tạo ra 15 tệp mockup tĩnh (`.dc.html`) cho 11 trang hiện có + 1 khuôn lớp phủ/trạng thái dùng chung + 1 trang "Trang chủ" hoàn toàn mới, cùng một tài liệu bàn giao dev (`13 Tai lieu ban giao.dc.html`) ghi rất chi tiết: phong cách đã chọn, bảng token, quy tắc bố cục, thứ tự thông tin trên mỗi đơn, khuôn lớp phủ, bảng trạng thái/thông báo, ràng buộc kỹ thuật, và bảng ánh xạ mockup ↔ file nguồn thật.

Việc của đặc tả này là: xác nhận lại những gì tài liệu bàn giao đã ghi (đối chiếu với mã thật, vì đây là tài liệu do một phiên thiết kế khác tạo ra, không tự động đúng 100%), xử lý những chỗ nó sai hoặc chưa quyết, và định ra thứ tự thi công an toàn cho một việc chạm gần như toàn bộ giao diện ứng dụng.

## 2. Mục tiêu / Không phải mục tiêu

**Mục tiêu:**
- 11 trang hiện có mang phong cách thị giác mới (nền xám rất nhạt, thẻ trắng viền mảnh, một dải màu đậm cho khối quan trọng, bảng cho máy tính/thẻ cho điện thoại — riêng Đơn hàng giữ dạng thẻ ở mọi khổ màn hình, xem §16 mục 2) mà không đổi luồng nghiệp vụ, không đổi ma trận quyền; hợp đồng API giữ nguyên trừ danh sách đơn (chủ đã duyệt đổi để đủ dữ liệu hiển thị, xem §16 mục 1).
- Một trang "Trang chủ" mới dạng bảng điều khiển (sidebar + số liệu) — việc này có kèm một thay đổi hợp đồng API nhỏ (xem §10), tách hẳn khỏi 11 trang restyle.
- Một khuôn lớp phủ/trạng thái dùng chung, áp cho cả 11 trang, giảm lặp mã.

**Không phải mục tiêu (ngoài phạm vi — xem thêm §13):**
- Không đổi quyền, không đổi bảng dữ liệu/migration, không đổi API của 11 trang restyle.
- Không đổi giá trị token màu thuộc nhóm "bản sao tourdaovn" trong `app.css` (`--c-primary*`, `--c-accent*`, `--c-sand*`...).
- Không thêm framework/thư viện chạy thời gian thực (dependency runtime vẫn bằng 0).
- Không làm lại icon ngoài phạm vi Trang chủ mới.

## 3. Nguồn thiết kế & mức độ tin cậy của nó

Tài liệu bàn giao (`13 Tai lieu ban giao.dc.html`) tham chiếu rất nhiều chi tiết kỹ thuật thật của repo (tên API, tên hàm, ADR). Đã đối chiếu trực tiếp với mã và tài liệu hiện có, khớp hoàn toàn:

| Điều tài liệu bàn giao ghi | Đối chiếu mã thật |
|---|---|
| Ma trận banner lỗi 4 hành động `none/reload_order/reload_page/lock_form`, dẫn "đặc tả A2 §5.2" | Đúng với `src/shared/order-errors.ts` (`BannerAction`) và `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md` §5.2 |
| Chỉ 10 icon: orders, plus, me, services, staff, back, next, lock, alert, close | Đúng với `web/icons.ts` — không thừa, không thiếu |
| `GET /api/dispatch/handlers` (tối đa 100 id), `PAX_ORDER` | Đúng với `src/modules/dispatch/*`, `src/shared/order-lines.ts` |
| Đơn hàng hiện sắp theo `createdAt` | Đúng: `ORDER BY o.created_at DESC, o.rowid DESC` (`src/modules/orders/repository.ts`) |
| 11 trang, tên file trùng khớp `PAGES` | Đúng với `src/shared/sw-policy.ts` |

**Chỗ tài liệu bàn giao SAI, đã xác minh:** bảng token ở mục 2 (`--c-primary-soft #F0F7FC`, nền `#F8FAFC`, viền `#E2E8F0`, `--fs-base` 17px) là **lỗi lấy nhầm bản token cũ của trang tourdaovn** — công cụ Claude Design tự nạp "Design System" từ một bản GitHub cũ hơn bản đang chạy thật. Đây là *đúng lỗi* đã bị phát hiện và ghi lại ở vòng thiết kế A2 trước (`docs/design/a2-mockup/REVIEW.md` dòng 24, 47): giá trị đúng là `--c-primary-soft #DCEBF6`, `--c-surface-alt #EAF2F8`, `--c-border #D3E1EC` — đúng bằng giá trị đang chạy thật trong `public/app.css`. Vì vậy: **không sao chép bất kỳ mã màu (hex) nào từ tệp thiết kế hay từ `_ds/.../tokens/colors.css`. Dùng đúng token màu đã có trong `public/app.css`.** Bảng ánh xạ cụ thể ở §5.

Ngoài ra, thang cỡ chữ và một giá trị bo góc trong tài liệu bàn giao (`11·12·13·14·15·17·19·21·26·32`, bo góc "14 khung app") không khớp hết với `tokens/typography.css`/`tokens/effects.css` của design system lẫn với `app.css` thật — xem §5 cách xử lý.

Kết luận: **bố cục, cấu trúc, và các quyết định nghiệp vụ/nội dung trong tài liệu bàn giao và 15 mockup là đáng tin và đã được chủ dự án duyệt; các mã màu/kích thước cụ thể (hex, px) trong tệp thiết kế thì KHÔNG đáng tin — luôn ánh xạ về token thật đang chạy.**

## 4. Phạm vi

11 trang restyle (đúng bảng ánh xạ mục 8 của tài liệu bàn giao, không đổi):

| # | Trang | HTML | Bundle web | Mockup nguồn |
|---|---|---|---|---|
| 1 | Đăng nhập | `public/login.html` | `web/login.ts` | `01 Dang nhap.dc.html` |
| 2 | Đơn hàng (trang chủ hiện tại) | `public/index.html` | `web/orders.ts` | `02 Don hang.dc.html` |
| 3 | Chi tiết đơn | `public/order.html` | `web/order.ts` | `03 Chi tiet don.dc.html` |
| 4 | Lập đơn | `public/order-form.html` | `web/order-form.ts` | `04 Lap don.dc.html` |
| 5 | Nhân viên | `public/staff.html` | `web/staff.ts` | `05 Nhan vien.dc.html` |
| 6 | Hồ sơ | `public/parties.html` | `web/parties.ts` | `06 Ho so.dc.html` |
| 7 | Dịch vụ & giá | `public/catalog.html` | `web/catalog.ts` | `07 Dich vu va gia.dc.html` |
| 8 | Địa điểm | `public/locations.html` | `web/locations.ts` | `08 Dia diem.dc.html` |
| 9 | Tôi | `public/account.html` | `web/account.ts` | `09 Toi.dc.html` |
| 10 | Nhật ký | `public/audit.html` | `web/audit.ts` | `10 Nhat ky.dc.html` |
| 11 | Góp ý | `public/feedback.html` | `web/feedback.ts` | `11 Gop y.dc.html` |

Dùng chung: `12 Lop phu va trang thai.dc.html` (khuôn hộp thoại/sheet/trạng thái, áp cho `web/confirmation-dialog.ts`, `web/trip-sheet.ts`, `web/catalog-picker.ts`, `web/banner.ts`, `web/maintenance-screen.ts`).

Việc riêng, ngoài 11 trang trên: **Trang chủ mới** — xem §10.

## 5. Token & thị giác — quy tắc dịch từ thiết kế sang mã

Nguyên tắc chung: mockup cho biết **vai trò** của màu/kích thước ở đâu; mã dùng **token đã có**, không copy số. Nhóm token trong `app.css` giữ nguyên đúng luật ở `web/CLAUDE.md` (đổi giá trị nhóm "bản sao tourdaovn" phải hỏi chủ — không có nhu cầu này ở đây).

| Vai trò (theo tài liệu bàn giao) | Token thật dùng (đã có, không đổi giá trị) |
|---|---|
| Xanh biển sâu — thanh đầu trang, nút chính, tab đang chọn | `--c-primary` |
| Dải thương hiệu trang đăng nhập | `--c-primary-strong` |
| Nền viên lọc, nút phụ, hàng đang chọn, huy hiệu "Đã xác nhận" | `--c-primary-soft` |
| San hô — số tiền còn thiếu, "+ Đơn mới", "Xác nhận gửi khách", hành động huỷ | `--c-accent` / `--c-accent-strong` |
| Cát — trạng thái Nháp, dải bảo trì, cảnh báo | `--c-sand` / `--c-sand-soft`, chữ luôn `--c-sand-text` (không bao giờ chữ trắng trên nền cát) |
| Xanh lá — đã thanh toán đủ / thành công | `--c-green-soft` / `--c-green-text` |
| Nền app xen kẽ | `--c-surface-alt` (không phải `#F8FAFC`) |
| Thẻ trắng | `--c-surface` |
| Viền 1px | `--c-border` (không phải `#E2E8F0`) |
| Chữ nội dung / chữ phụ | `--c-text` / `--c-text-muted` |
| Tiêu đề / nội dung | `--font-display` / `--font` |

Kích thước không khớp token hiện có (bo góc "14 khung app", vài cỡ chữ 13/15/19/21/26/32px trong mockup): **ánh xạ về token gần nhất đã có** khi thi công (ví dụ bo góc snap về `--radius-md`/`--radius-lg` đã có, cỡ chữ về `--fs-*` gần nhất). Chỉ thêm token mới khi thật sự cần một kích thước mà không token nào gần đúng — token mới luôn vào nhóm "Riêng của Tour Đảo Booking" (`web/CLAUDE.md` cho phép nhóm này tự thêm, không cần hỏi chủ vì không phải màu/chữ thương hiệu). Việc ánh xạ cụ thể từng con số làm ở bước lập kế hoạch/thi công, không chốt hết trong đặc tả này.

Khối CSS sau mốc `/* ---------- app iPhone (PWA)` trong `app.css` tiếp tục theo luật hiện có: chỉ token, không hex/px viết cứng (trừ đúng `1px`) — mockup dùng style nội tuyến (không class, không biến) nên **không được copy mã HTML/CSS của mockup**, chỉ dùng làm tham chiếu hình ảnh; DOM vẫn dựng bằng `h()`.

## 6. Khung trang dùng chung (áp cho cả 11 trang)

Theo mục 3 tài liệu bàn giao, xác nhận không mâu thuẫn với `docs/SYSTEM-DESIGN.md` §9 hiện có:

- Thanh đầu trang (`web/shell.ts`): cao 60px (số hiện tại `--bar-h` đang là 52px — chủ đã duyệt đổi lên 60px theo bản thiết kế mới, xem §16 mục 3), nền trắng, viền dưới 1px. Thứ tự/điều kiện hiện link giữ nguyên đúng ma trận quyền hiện tại (không đổi ai thấy gì).
- Tab bar điện thoại: giữ đúng số tab theo quyền đã có (3 SALES / 5 ADMIN / 2 kế toán / 1 FIELD-only), vùng chạm ≥44px, safe-area đáy.
- Bề rộng nội dung tối đa 1200px (hiện tại 960px — đổi theo §16 mục 3); cột phụ (thanh toán/tóm tắt) 340px (khớp số hiện tại, không đổi), dính khi cuộn.
- Dưới 900px (hiện tại mốc 960px — đổi theo §16 mục 3): mỗi hàng bảng chuyển thành một thẻ, nhãn cột chuyển thành nhãn trong thẻ, không cuộn ngang. Áp dụng cho các trang thật sự có bảng (Nhân viên, Dịch vụ, Địa điểm, Hồ sơ, Nhật ký). Đơn hàng là NGOẠI LỆ: không có bảng, giữ dạng thẻ (`.order-row`) sẵn có ở mọi khổ màn hình — xem §16 mục 2.

## 7. Thông tin cốt lõi của đơn — thứ tự hiển thị mới

Áp dụng cho thẻ đơn (danh sách, MỌI khổ màn hình — không có "dòng bảng" riêng cho máy tính, xem §16 mục 2). Danh sách các trường dưới đây rộng hơn dữ liệu `GET /api/orders` đang trả về hiện nay (DTO danh sách hiện chỉ có mã đơn/tên khách/SĐT/tổng/còn lại/trạng thái/tên nhân viên/ngày tạo) — **chủ đã duyệt đổi hợp đồng API danh sách đơn để trả đủ các trường dưới đây; hình dạng cụ thể chốt lúc lập kế hoạch bước 1** (xem §16 mục 1). Trừ điểm đó ra, **không đổi nguồn dữ liệu hay logic**, chỉ đổi thứ tự/cách hiển thị:

1. Ngày + giờ đón (từ dịch vụ + trường chuyến)
2. Tên khách + số điện thoại (bấm gọi được trên điện thoại)
3. Gói tour/dịch vụ (nhiều dịch vụ: hiện dịch vụ đầu + "+N dịch vụ" — **cách rút gọn chính xác chốt lúc thi công trang mẫu, xem §12**)
4. Số khách theo `PAX_ORDER`, ẩn loại có 0 khách
5. Tổng · Đã trả · Còn lại (còn lại = 0 thì màu xanh lá, còn lại > 0 màu san hô)
6. Trạng thái (theo `STATUS_LABEL` đã có)
7. Nơi đón (dòng phụ)
8. Ghi chú đặc biệt — có thì hiện màu san hô đậm, không có thì ẩn hẳn dòng (không hiện dòng trống)
9. Người phụ trách — giữ nguyên đúng 3 trạng thái hiện có (`ctx.isAssigned`/`ownOrAssigned`, xem bẫy đã ghi ở `CLAUDE.md` §10): chưa biết (ẩn dòng) / `null` (chip "Chưa có người phụ trách") / có tên

## 8. Lớp phủ & trạng thái dùng chung

Khuôn dùng chung cho mọi hộp thoại/sheet (đã có phần lớn ở `web/confirmation-dialog.ts`, `web/trip-sheet.ts`, `web/catalog-picker.ts` — việc là RÀ SOÁT lại cho khớp, không viết lại từ đầu nếu đã đúng):

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; các con trực tiếp của `body` nhận `inert` khi mở, gỡ khi đóng.
- Đóng bằng Esc / ✕ / chạm nền; trả focus đúng nút đã mở.
- ≤640px: trượt từ đáy, bo góc trên. >640px: hộp giữa màn hình.
- Hai khung `requestAnimationFrame` trước khi thêm class mở (trạng thái đầu vẽ xong trước khi chạy chuyển động) — chỉ áp dụng nếu mã hiện tại chưa làm vậy, kiểm lại trước khi sửa.

Bảng trạng thái/thông báo (đối chiếu, không đổi hành vi lỗi hiện có — chỉ đổi cách trình bày):

| Trạng thái | Thể hiện | Giữ nguyên |
|---|---|---|
| Đang tải danh sách | Khung xương 2-3 thẻ | Không nhảy bố cục khi dữ liệu về |
| Rỗng | Icon + câu giải thích + hành động | Giữ nguyên chữ hiện tại ("Chưa có đơn nào khớp."...) |
| Lỗi máy chủ | Banner san hô, đúng ma trận đã có | `src/shared/order-errors.ts` — không đổi |
| Thiếu thông tin chuyến | Banner cát + liên kết "Sửa" | Không đổi logic |
| Khoá lạc quan / mất mạng / bảo trì | Đúng hành vi đã có | Không đổi logic, chỉ đổi trình bày |

## 9. Bản đồ mockup ↔ trang thật

Xem bảng §4 (đã xác nhận khớp tài liệu bàn giao mục 8, không cần lặp lại).

## 10. Trang chủ mới (Dashboard) — việc riêng

Chủ dự án chọn phương án "Bảng điều khiển có thanh bên + số liệu" (`00 Trang chu v2.dc.html`), KHÔNG phải phương án lưới icon (`00 Trang chu.dc.html`). Trang này KHÔNG nằm trong phạm vi 11 trang mà tài liệu bàn giao mô tả — tự bản thiết kế cũng ghi hai việc kỹ thuật còn mở:

1. **Đổi hợp đồng API**: danh sách "Chuyến đón hôm nay" cần sắp theo `departDate` (ngày đón khách); API `GET /api/orders` hiện sắp theo `created_at` (§3). Đây là thay đổi chạm hợp đồng giữa các phần — theo đúng luật ở `CLAUDE.md` §3, **phải chốt chính xác cách đổi (tham số mới, cách xử lý đơn không có `departDate`, có đổi mặc định hay chỉ thêm tuỳ chọn) với chủ dự án trước khi viết mã**, không tự quyết ở bước lập kế hoạch. Đặc tả này KHÔNG chốt sẵn hình dạng API — để ngỏ, ghi ở §12.
2. **Icon mới**: cần thêm icon cho các mục trên Trang chủ (ví dụ nhóm quyền/khối chức năng) — thêm vào `web/icons.ts` theo đúng lưới 24×24 đã có, không thêm bộ icon ngoài hay icon font (đúng ràng buộc ở tài liệu bàn giao mục 7, ràng buộc này áp cho 11 trang restyle; Trang chủ được phép thêm icon mới vì nó vốn không nằm trong 11 trang đó).

Việc này là trang hoàn toàn mới, đi theo công thức "thêm trang mới" ở `docs/CHANGE-GUIDE.md` (tạo HTML + `web/dashboard.ts` (tên tạm) + khai `PAGES` + thêm vào `build:web` + điều hướng ở `shell.ts` + `test:e2e -- pwa`), làm SAU khi 11 trang restyle xong (thứ tự ở §11), có kế hoạch thi công riêng.

## 11. Thứ tự thi công & tiêu chí nghiệm thu

**Bước 1 — Khung dùng chung + trang mẫu "Đơn hàng":**
- Rà soát/cập nhật `web/shell.ts`, khuôn lớp phủ (§8), token nếu cần thêm (§5).
- Restyle `public/index.html` + `web/orders.ts` theo `02 Don hang.dc.html` + thứ tự thông tin đơn (§7).
- Tiêu chí xong: `npm test`, `npm run typecheck` (0 lỗi), kịch bản Chrome liên quan (tra bảng cuối `web/CLAUDE.md`), `npm run test:e2e -- pwa` xanh; có đủ trạng thái rỗng/đang tải/lỗi/có dữ liệu trên cả khung điện thoại và máy tính; chủ dự án tự xem trên điện thoại thật và duyệt hình ảnh trước khi sang bước 2.

**Bước 2 — 10 trang còn lại:** theo đúng khung đã duyệt ở bước 1, mỗi trang theo mockup tương ứng (§4). Có thể chia lô nhỏ (chi tiết ở kế hoạch thi công, không chốt số lượng lô trong đặc tả này). Mỗi trang xong: cùng bộ tiêu chí như bước 1 (test, typecheck, kịch bản Chrome tương ứng, đủ trạng thái).

**Bước 3 — Trang chủ mới:** chỉ bắt đầu sau khi đã chốt hình dạng API (§10 mục 1) với chủ dự án. Theo công thức "thêm trang mới" + `test:e2e -- pwa`.

Mỗi bước là việc lớn (đụng giao diện nhiều trang, bước 3 đụng cả API) theo `CLAUDE.md` §3 → bắt buộc có người kiểm độc lập, chỉ đọc, sau khi thi công xong mỗi bước; không tự nghiệm thu.

## 12. Việc còn mở — cần chốt thêm trước/trong khi thi công

1. **Hình dạng API sắp xếp cho Trang chủ** (§10) — chốt với chủ trước khi viết mã bước 3. Khác với việc đổi API danh sách đơn ở §16 mục 1 (việc đó đã chốt hướng, còn việc này thì chưa).
2. **Hình dạng cụ thể của API danh sách đơn** (§16 mục 1) — đã chốt HƯỚNG (được đổi), còn chốt CHI TIẾT (thêm trường nào, cách gọi) lúc lập kế hoạch bước 1.
3. **Cách rút gọn khi đơn có nhiều dịch vụ** ("+N dịch vụ" hay liệt kê hết) — chốt lúc làm trang mẫu (bước 1), việc nhỏ, không cần dừng cả kế hoạch.
4. **Trang Hồ sơ dùng panel bên phải** thay vì khối đẩy xuống — kiểm tương thích với luồng "+ Hồ sơ mới" hiện tại lúc thi công trang này (bước 2), việc kỹ thuật, không phải quyết định nghiệp vụ.
5. **Ánh xạ số đo cụ thể** (bo góc, cỡ chữ không khớp token — §5) — làm lúc thi công từng trang, không hỏi chủ trừ khi cần thêm màu/chữ thương hiệu mới (không dự kiến có).

## 13. Ngoài phạm vi

- Đổi bảng dữ liệu, migration, quyền của 11 trang restyle; hợp đồng API giữ nguyên trừ danh sách đơn (đổi có chủ đích, đã duyệt — xem §16 mục 1).
- Đổi giá trị token màu nhóm "bản sao tourdaovn".
- Sửa nợ kỹ thuật không liên quan đã biết từ trước (ví dụ tương phản `.row-off { opacity:.6 }` ở CHANGE-GUIDE — có thể tiện tay sửa nếu chạm đúng trang đó, không bắt buộc, không mở rộng phạm vi để đi sửa các trang khác).
- Offline thật, đổi kiến trúc, thêm framework/dependency.

## 14. Kiểm & nghiệm thu

Theo `CLAUDE.md` §3: đây là việc lớn (giao diện + có API ở bước 3) → mỗi bước xong phải có subagent kiểm độc lập, chỉ đọc mã thật + chạy lại lệnh (không tự khai "đạt"). Báo cáo cuối mỗi bước cho chủ dự án theo đúng khuôn 4 mục ở `CLAUDE.md` §4 (Đã làm — Đã kiểm — Chưa làm/chưa kiểm — Cần bạn quyết).

## 15. Rủi ro & bài học áp dụng từ vòng A2 trước

- Luôn đối chiếu token thiết kế với `app.css` thật trước khi dùng — không tin số trong tệp thiết kế (đã áp dụng ở §5).
- Kiểm nhãn/badge chỉ hiện đúng điều kiện nghiệp vụ (ví dụ ghi chú đặc biệt, "Chưa có người phụ trách") — không hiện tràn lan.
- Cần artboard/kịch bản Chrome đủ MỌI trạng thái (rỗng, đang lưu, đã huỷ...) trước khi coi một trang là xong, không chỉ trạng thái "đẹp" có dữ liệu mẫu.

## 16. Quyết định của chủ dự án — bổ sung sau vòng kiểm đặc tả (2026-09-22)

Vòng kiểm độc lập (đối chiếu đặc tả với mã thật, không sửa mã) phát hiện 4 điểm chưa khớp hoặc chưa chốt; chủ dự án đã trả lời trực tiếp trong buổi trao đổi này. Ghi lại ở đây để không mất khi lập kế hoạch.

1. **Dữ liệu danh sách đơn (mâu thuẫn giữa §7 và §2/§13 bản gốc).** §7 đòi thẻ đơn hiện giờ đón, gói dịch vụ, số khách, nơi đón, ghi chú, số tiền đã trả — các trường này KHÔNG có trong `GET /api/orders` hiện nay (`OrderSummaryDto` ở `src/shared/contracts.ts` chỉ có: mã đơn, tên khách, SĐT, tổng, còn lại, trạng thái, tên nhân viên, ngày tạo). Bản gốc đặc tả lại ghi "không đổi hợp đồng API của 11 trang restyle" — hai điều chỏi nhau.
   **Chốt: được đổi hợp đồng API danh sách đơn để trả đủ các trường ở §7.** Hình dạng cụ thể (thêm trường nào, có cần đổi cách gọi hay không) chốt lúc lập kế hoạch bước 1, không tự quyết lúc thi công — đây vẫn là việc chạm hợp đồng giữa các phần (CLAUDE.md §3).

2. **Thẻ hay bảng cho danh sách đơn trên máy tính.** Mã thật hiện chỉ có MỘT dạng thẻ (`.order-row`, `web/orders.ts`) ở mọi khổ màn hình, không có bảng riêng cho máy tính — sự thật này đã ghi ở `docs/SYSTEM-DESIGN.md` §16 ("Danh sách đơn chỉ có MỘT dạng thẻ... không có bảng máy tính riêng", có bằng chứng đo Chrome). Bản thiết kế mới (`02 Don hang.dc.html`) vẽ dạng bảng cho máy tính.
   **Chốt: GIỮ dạng thẻ như hiện tại** cho danh sách đơn ở mọi khổ màn hình, chỉ đổi màu sắc/khoảng cách theo phong cách mới (§16 mục 4) — không chuyển sang bảng. Mốc "dưới 900px: bảng chuyển thành thẻ" ở §6 chỉ áp dụng cho các trang thật sự có bảng (Nhân viên, Dịch vụ, Địa điểm, Hồ sơ, Nhật ký); khối "Người phụ trách" trong thẻ đơn vẫn giữ đúng cách nạp không đồng bộ, có sẵn chỗ một dòng để không nhảy bố cục (§9 SYSTEM-DESIGN.md dòng 502) — áp dụng cả khi thẻ có thêm trường mới theo mục 1.

3. **Số đo khung trang chung (§6).** Số trong bản thiết kế mới lớn hơn số đang chạy thật: thanh đầu trang 60px (thật: `--bar-h` 52px), nội dung rộng tối đa 1200px (thật: `main { max-width: 960px }`), mốc chuyển bố cục 900px (thật: `@media (min-width: 960px)`). Chỉ cột phụ 340px khớp sẵn (`--w-side`).
   **Chốt: đổi theo số trong bản thiết kế mới (60px / 1200px / 900px).** Ba số này đã có token/hằng số riêng trong mã — lúc thi công sửa giá trị của đúng token/hằng số đó (`--bar-h`, `max-width` của `main`, mốc `@media`), không viết số cứng mới ở nơi khác.

4. **Kiểu trình bày thẻ đơn.** Tệp mẫu "Order Card - 3 Phong Cach.dc.html" (không nằm trong bảng ánh xạ §4, thăm dò riêng) đưa ra 3 kiểu trình bày cùng một thẻ đơn để chủ chọn 1 kiểu áp dụng chung: **1a "Tiêu chuẩn"** (viền mảnh, nền trắng, không dải màu ở đầu thẻ, gần với phong cách app hiện có), 1b "Năng động" (dải màu xanh đậm ở đầu thẻ, số tiền còn nợ nổi khối riêng), 1c "Dễ thương" (bo góc rất lớn, dùng emoji làm icon).
   **Chốt: chọn kiểu 1a "Tiêu chuẩn"**, áp dụng cho khuôn thẻ đơn dùng chung ở §7 (và mọi khuôn thẻ tương tự nếu có ở trang khác).
