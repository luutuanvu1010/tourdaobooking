# web/CLAUDE.md — luật giao diện

> Chỉ thêm ràng buộc cho `web/` và `public/`, không nới `CLAUDE.md` gốc. Bằng chứng giao diện thật cần trình duyệt (kịch bản Chrome, không nằm trong CI). Công thức: `docs/CHANGE-GUIDE.md`; thiết kế: `docs/SYSTEM-DESIGN.md` §9.

## Hệ thống thiết kế (đọc đúng mục, đừng đọc hết)
- **Token** (màu, chữ, khoảng cách…): đầu `public/app.css` (`:root`), gồm ba nhóm:
  - **Bản sao từ `tourdaovn`** (tên và giá trị chuẩn, không import): không đổi giá trị.
  - **MỚI cho app nội bộ** (màu nguy hiểm, kích thước ô nhập/bộ đếm): do chủ duyệt.
  - **"Riêng của Tour Đảo Booking"** (kích thước điện thoại/PWA): cần kích thước hay giá trị giao diện mới thì **thêm token vào nhóm này**, không viết cứng.
  - Màu/chữ mới (thương hiệu hay chức năng), hoặc đổi giá trị nhóm đầu: **hỏi chủ**.
- **Thiết kế màn hình** (bố cục, trạng thái, nội dung chữ): `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md`; trang nào gọi API nào: `docs/SYSTEM-DESIGN.md` §9; iPhone/PWA: `docs/PWA-IPHONE.md`.
- **Bản thiết kế gốc và ảnh tham chiếu:** `docs/design/a2-mockup/` (trong `refs/`: `tourdaovn-design-brief.md`, `tourdaovn-tokens.css`); ảnh giao diện thật: `docs/evidence/`.

## Luật
- **Không `innerHTML`.** Dựng DOM bằng `h()` ở `web/dom.ts`.
- **Tên nút, nhãn, câu báo:** tra `docs/BANG-THAM-CHIEU.md` trước (ADR-0167); chưa có thì đưa 2–3 tên cho chủ chọn, không tự đặt. Đổi tên nút thì sửa bảng cùng lần lưu; nút ghi mới phải khai dòng, chưa có tên chốt thì `cho-chon` (`docs/CHANGE-GUIDE.md` công thức z34).
- `web/` import `src/shared` **không đuôi**; **không** import `src/modules/`. Luật dùng ở cả server và giao diện là tệp thuần ở `src/shared/`, không chép tay sang đây.
- Giao diện chỉ **ẩn/hiện** theo quyền; máy chủ luôn kiểm lại. Thông báo, nhãn, lỗi: tiếng Việt có dấu, không lộ chữ Anh hay mã thô (vd `cancelled`).
- **Ẩn/hiện phải hỏi bảng quyền:** `can(staff, "<thao tác>")` — cùng bảng với máy chủ. `hasPermission` chỉ để hỏi **danh tính** ("người này là hướng dẫn viên / tài xế / đối tác"), không để hỏi "được làm việc gì" (chủ duyệt 2026-10-01; bài học: trang hỏi "có phải Quản trị" lệch máy chủ từ khi có Toàn quyền — `docs/superpowers/specs/2026-10-01-han-che-quan-tri-hcns/NGUYEN-NHAN-GOC-GIAO-DIEN-HOI-MA-QUYEN.md`). Ép bằng `src/giao-dien-hoi-bang-quyen.test.ts`.
- **CSS:** giá trị đi vào token ở `:root` của `public/app.css`. Khối **sau** dấu mốc `/* ---------- app iPhone (PWA)` chỉ dùng token: không hex, `rgb()`, `hsl()`, `px` ngoài `1px`, `rem`, `em` (`tests/e2e/pwa.mjs` quét). Script **không** bắt tên màu (`red`), `%`, `vw/vh/ch`, `color-mix()` — tự kiểm khi viết CSS mới.
- **Ô gõ 16px** (chống zoom iOS).
- **Trang mới:** làm theo `docs/CHANGE-GUIDE.md` công thức c. Tối thiểu: `public/<trang>.html` (kèm phần `<head>` iOS), khai ở `PAGES` trong `src/shared/sw-policy.ts` (`src/shared/sw-policy.test.ts` đỏ nếu thiếu), thêm tệp vào script `build:web` trong `package.json`, gọi `initShell()`, khai điều hướng ở `src/shared/muc-giao-dien.ts` (thanh tab `THANH_TAB`, thanh bên `THANH_BEN`, bảng `TRANG`), rồi `npm run test:e2e -- pwa`.
- **Service worker:** `/api/*` không bao giờ qua cache (`src/shared/sw-policy.ts`, có test). `CACHE_VERSION` do build **tự chèn** (`__BUILD_ID__`), không ai tăng tay; chi tiết `docs/PWA-IPHONE.md`.

## Thành phần chung v2 (đợt 0, 2026-10-28)
Đặc tả: `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md` mục 8. CSS ở khối "Thành phần chung v2" sau dấu mốc PWA của `public/app.css`: một tên lớp gốc + biến thể bằng thuộc tính (`data-*`), chỉ token; lớp cũ giữ nguyên. Việc MỚI dùng lớp mới, đừng tự dựng lại.
- **Trạng thái hệ thống:** `web/trang-thai-he-thong.ts` (`trangThaiHeThong`, `trangThaiToanTrang` cho 403/404/thiếu mã/mất mạng chưa nạp) dựng `.trang-thai[data-loai]` với vòng hình `.vong`, chữ phụ `.trang-thai-phu`, khung chờ `.trang-thai-xuong` + `.xuong[data-khuon]`. Lỗi máy chủ: `cauLoiMayChu` (ở `src/shared/trang-thai-he-thong-chu.ts`, thuần, dùng chung với bài kiểm).
- **Dải thông báo đầu trang:** `web/dai.ts` (`datDai`, `hienDaiNgoaiMang`, `ganNgoaiMang`, `thanNgoaiMang`, `veThanNgoaiMang`): `.dai[data-tong="bien|cat|do"]`. Mất mạng giữ nội dung đã vẽ, chỉ hiện dải.
- **Toast:** `web/toast.ts` (`hienBaoNgan(câu, { tong, hoanTac })`): `.toast[data-tong="la|do|bien|cat"]`, có nút đóng, nút Hoàn tác `.toast-hoan-tac`. Tông `do` chưa `aria-live="assertive"` (nợ, BACKLOG §53).
- **Hộp xác nhận / bảng trượt:** `web/bang-truot.ts` (`moBangTruot`, `hoiXacNhan({ tieuDe, hauQua, nhanNguyHiem })`) thay `confirm()`/`alert()`; bài `src/ratchet-confirm-alert.test.ts` khoá trần, chỉ được giảm — đừng thêm `confirm(`/`alert(` mới.
- **Nút, ô, chip, huy hiệu, thẻ:** `.nut[data-cap="chinh|phu|loi"][data-co="lon"][data-tong="san-ho|nguy-hiem"]`, `.o[data-loai]` + `.nhan`, `.vien[aria-pressed]`, `.huy-hieu[data-tong="bien|la|cat|do|xam"]` (luôn có hình), `.the`, `.dong`, `.bang`, `.tab-phu[data-kieu="gach|vien"]`, `.bo-qua`, `.chan-dinh`, `.rong`.
- **Khung điều hướng:** tab dưới theo bộ quyền (tối đa 5, "Tạo đơn" ở vị trí 3/5 hoặc 2/4; ngoại lệ: bộ Hành chính nhân sự kèm quyền lập đơn — xem bảng `THANH_TAB`) và thanh bên có khối gập (`nhomGap`) đều khai ở `src/shared/muc-giao-dien.ts`; nút Trợ lý ở thanh trên. Trang 404 là `public/404.html` (Workers Assets trả cho địa chỉ lạ ngoài `/api`); trang mất mạng `public/ngoai-mang.html` (ADR-0150, proposed).

## Bẫy đã cắn thật
- Form: dùng `location.replace` (không `assign`) sau khi lưu để Back/bfcache không đưa về form đã lưu (tránh đơn trùng).
- Enter trong ô tìm danh mục bị chặn **có chủ đích** (ô nằm trong `<form>`).
- Widget Turnstile ở `web/login.ts`: id khung **không được** là `turnstile`; không gọi `turnstile.ready()`; `theme: "light"` (app chỉ có giao diện sáng); phải **hỏi lại** cấu hình sau 403/503 vì `siteKey` từng kẹt `null` — đừng bỏ. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l ("Bẫy widget").

## Sửa tệp nào thì chạy lại kịch bản Chrome nào
Chạy `npm run build:web` trước. Cần Chrome + axe-core **ngoài repo**; cách chạy `tests/e2e/README.md`. Các trang dùng **chung kho cookie**: trang của tài khoản nào phải mở **sau cùng**.
Bảng «sửa tệp nào → chạy kịch bản nào»: `docs/KICH-BAN-CHROME.md` (chuyển nguyên văn từ đây ngày 2026-11-15 vì trần cỡ tệp, ADR-0160). Sửa tệp ở `web/`, `public/` thì mở bảng đó để chọn đúng kịch bản.
