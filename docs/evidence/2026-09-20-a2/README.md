# Bằng chứng: A2 — giao diện thông tin chuyến theo dịch vụ (2026-09-20)

Artifact của bước nghiệm thu A2 (đặc tả `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md` §7; Hiến pháp §8.2: bằng chứng thay cho lời khai). **Mã được đo: HEAD `1809ffb`** của nhánh `worktree-thong-tin-chuyen-di` (commit "A2 sửa cuối 5"; commit "A2 sửa cuối 6" kế tiếp chỉ đổi tài liệu và bằng chứng nên không đổi mã được đo). Toàn bộ ảnh, số đo và các kịch bản kiểm hành vi đã được **chạy lại sau đợt sửa cuối** (các commit sau rà soát toàn nhánh: `c49e547` số khách quay về giá đã lưu, `df696be` hết trạng thái kẹt, `ad54b00` ARIA danh sách danh mục + cuộn lỗi ở khổ 641–959 px, `9b5f0fd` dọn CSS chết + bằng chứng, `1809ffb` giữ đơn giá gõ tay khi quay về bản chụp + thay lịch sử sau khi lưu + 409 `incomplete_trip` không thêm nút).

Đo trên `wrangler dev` cục bộ với D1 tạm và bốn tài khoản thử, bằng Chrome headless khổ iPhone 390×844 (ảnh 1x: toàn trang/khung nhìn rộng 390 px; ảnh từng thẻ `1c-*`, `1d-*`, `1e-*` rộng 326 px; riêng `1b-khoi-chuyen-thu-gon.png` chỉ cắt hàng tóm tắt của khối chuyến, 292×46 px) và máy tính 1040×800. **Không phải** đo trên iPhone thật, mạng thật hay Workers Assets thật.

## Ký duyệt thị giác (đặc tả §7.5)

**Chưa ký.** Chủ dự án xem `anh/` cạnh mockup (`docs/design/a2-mockup/output/`) theo bảng đối chiếu dưới đây rồi ghi tại đây: ngày, ai ký, và các điểm cần sửa (nếu có). Chưa ký = chưa triển khai (`docs/HANDOFF-N1.md`).

**Ghi chú 2026-09-21 (trung thực, không phải chữ ký):** chủ dự án đã ra lệnh triển khai và bản này ĐÃ chạy trên production (Worker `a625adc4-43df-4e67-ac8e-f619aa98732b`, `docs/HANDOFF-N1.md` mục "Trạng thái triển khai"), nhưng mục này chưa được chủ dự án ghi ngày, người ký hay điểm cần sửa nên vẫn là **Chưa ký**. Các điểm cần đối chiếu trên iPhone thật (mục "Chưa kiểm") vẫn còn nguyên.

**Lưu ý khi xem ảnh:** ô ngày/giờ và `<select>` trong ảnh là điều khiển kiểu Chrome (vd `1k-bang-sua-chuyen.png` có "dd/mm/yyyy" và biểu tượng lịch), KHÔNG phải điều khiển của iOS; căn cứ ký thị giác cần được đối chiếu lại trên iPhone thật.

## Đối chiếu ảnh ↔ artboard

| Ảnh (`anh/`) | Artboard / trạng thái |
|---|---|
| `1a-form-3-dich-vu.png` | 1a toàn form (3 dịch vụ) |
| `1b-khoi-chuyen-thu-gon.png`, `1c-khoi-chuyen-mo-canh-bao.png` | 1b V1 thu gọn; 1c khối chuyến mở + cảnh báo ngày đã qua |
| `1d-the-theo-nguoi.png`, `1d-the-theo-nhom.png`, `1d-the-nhap-tay.png` | 1d ba biến thể thẻ |
| `1e-the-ban-chup-gia-doi.png`, `1e-the-khoa.png`, `1e-the-loi-50-khach.png` | 1e trạng thái thẻ |
| `1f-banner-kiem-tra.png`, `1f-banner-gia-danh-muc-doi.png`, `1f-banner-don-da-doi.png` | 1f banner lỗi/xung đột |
| `1g-may-tinh-form.png`, `1g-may-tinh-don.png` | 1g bản máy tính |
| `1h-don-nhap.png`, `1i-don-thieu-chuyen.png`, `1j-don-da-xac-nhan.png` | 1h, 1i, 1j trang đơn |
| `1k-bang-sua-chuyen.png`, `1k-bang-sua-loi.png`, `1k-may-tinh-bang-sua.png` | 1k bảng sửa thông tin chuyến |
| `tt-form-trong.png`, `tt-ket-qua-tim.png`, `tt-ket-qua-rong.png`, `tt-don-da-huy.png`, `tt-dang-luu.png` | trạng thái mockup chưa có (REVIEW.md §4) |
| `tt-font-bi-chan.png` | chặn tệp font: chữ vẫn hiện bằng font dự phòng |
| `hq-dang-nhap.png`, `hq-danh-sach-don.png`, `hq-dich-vu.png`, `hq-nhan-vien.png`, `hq-ho-so.png`, `hq-dia-diem.png`, `hq-toi.png`, `hq-nhat-ky.png` | **hồi quy** — trang ngoài phạm vi A2 chịu tác động của CSS dùng chung (ô gõ 16px, `.kv`, `.actions`); chủ dự án xem để chắc chúng không xấu đi |

Tổng cộng 34 ảnh: 26 của A2 và 8 ảnh `hq-*`.

**Ảnh nền để đối chiếu trước/sau (bằng chứng PWA, trước A2):** `docs/evidence/2026-09-19-pwa/anh/` có `01-dang-nhap` (↔ `hq-dang-nhap`), `02-danh-sach-don` (↔ `hq-danh-sach-don`), `06-toi-admin-5-tab` (↔ `hq-toi`, tài khoản admin; `05-toi-nhan-vien` là bản nhân viên), `03-chi-tiet-don-nhap` (↔ `1h-don-nhap`) và `04-lap-don` (↔ `1a-form-3-dich-vu`). Các trang `/catalog`, `/staff`, `/locations`, `/parties`, `/audit` (`hq-dich-vu`, `hq-nhan-vien`, `hq-dia-diem`, `hq-ho-so`, `hq-nhat-ky`) **không có ảnh nền** trước A2, nên không đối chiếu trước/sau bằng ảnh được. `hq-dich-vu.png` chụp trên dữ liệu đã bị kịch bản sửa (`TD101` = 1.400.000, `TTB03` `in_sheet` = 0), không phải dữ liệu gốc của Sheet.

**Ảnh `1i-don-thieu-chuyen.png`:** banner "Chưa đủ thông tin chuyến để xác nhận đơn" chỉ có các liên kết "Sửa" tới từng dịch vụ thiếu, KHÔNG có nút "Tải lại đơn" (ma trận đặc tả §5.2, cột Hành động là "—"; đã kiểm bằng mắt trên ảnh chụp lại và bằng `a2-smoke-order.mjs` nhóm 2). Các lỗi 409 khác ở trang đơn (vd `invalid_transition`: đơn vừa đổi trạng thái ở nơi khác) có nút "Tải lại đơn" (nhóm 5b, 5c).

## Các tệp

| File | Hạng (GOVERNANCE §5.2) | Là gì |
|---|---|---|
| `kiem-tra-may.txt` | E1 | `npm test` (236 đạt), `npm run typecheck` (0 lỗi), `npm run test:e2e` (10/10 kịch bản xanh, gồm `audit-invariants`), gắn HEAD và ngày giờ |
| `ket-qua-do.json` | E1 | axe-core (15 màn hình/trạng thái của A2 — gồm cả danh sách danh mục ĐANG MỞ có kết quả và ở trạng thái rỗng; 0 vi phạm ở cả 15 — không chỉ 0 critical/serious mà không có vi phạm mức nào), hồi quy 8 trang ngoài A2 (khoá `hoiQuy`: không tràn ngang, ô gõ ≥ 16px, 0 lỗi console; axe trên các trang đó chỉ ghi lại — xem mục "Vi phạm axe có sẵn ở trang cũ"), vùng chạm ≥ 44px, ô gõ ≥ 16px, không tràn ngang ở 390 px, 0 lỗi console (khoá `do`: 8 trạng thái khổ điện thoại; hành vi ở 1040 px do `a2-smoke-*.mjs` kiểm), font (khoá `font`: 6 `@font-face` đều `swap`; **4/6** tệp font nạp trên trang đo — các subset còn lại không dùng đến; 1 tệp được dò thấy trong cache service worker; đủ 6 nằm trong `PRECACHE` do e2e `pwa` kiểm; chặn `woff2` vẫn hiện chữ), hiệu năng (khoá `hieuNang`: đơn 20 dịch vụ nhập tay, một lần gõ vào ô đơn giá của thẻ đầu = **0,9 ms** JS đồng bộ, **0,9 ms** nếu ép tính bố cục; Chrome desktop, một lần đo mỗi số (các lần chạy khác nhau cho 0,4–0,9 ms), không gồm vẽ. **iPhone chậm hơn nhiều lần — cần đo trên máy thật**, xem "Chưa kiểm") |
| `anh/` | E2 | ảnh chụp 1x; cần người xem. **Đọc thế nào:** ảnh toàn trang (`1a`, `1h`, `1j`, `tt-…`) chụp bằng khung nhìn nới đúng chiều cao trang nên thanh tiêu đề ở đầu, thanh tab/thanh Lưu ở cuối ảnh — chúng KHÔNG chứng minh thanh Lưu dính đáy màn hình; hành vi đó thấy ở các ảnh khung nhìn (`tt-dang-luu`, `1f-*`). Khi bấm Lưu bị lỗi trên điện thoại, trang cuộn tới BANNER (cuối form), không tới thẻ |
| `kich-ban/` | — | các kịch bản tạo ra các file trên: `a2-cdp.mjs` (môi trường D1 tạm + `wrangler dev` + Chrome qua CDP, không dependency), `a2-smoke-form.mjs` (21 dòng ✓) / `a2-smoke-order.mjs` (10 dòng ✓) / `a2-smoke-sheet.mjs` (13 dòng ✓) (kiểm hành vi), `a2-evidence.mjs` (ảnh + đo + axe + hiệu năng; 7 dòng ✓ A–G); cách chạy ở đầu mỗi file. `axe-core` lấy bằng `npm pack` **ngoài repo**, không thêm vào `package.json` |

Ghi chú về các kịch bản: sau đợt sửa cuối, **cả bốn kịch bản đã được chạy lại trên bản cuối** — `a2-smoke-form.mjs` 21 dòng ✓ (`UI SMOKE FORM OK`), `a2-smoke-order.mjs` 10 (`UI SMOKE ORDER OK`), `a2-smoke-sheet.mjs` 13 (`UI SMOKE SHEET OK`), `a2-evidence.mjs` 7 (`A2 EVIDENCE OK`, ảnh và `ket-qua-do.json` ghi mới; byte ảnh có thể đổi giữa các lần chạy — bình thường). Số dòng ✓ ở bảng trên là số lệnh `ok(…)` trong từng tệp. Đợt sửa cuối thêm các nhóm kiểm: bfcache (`pageshow`), ARIA danh sách danh mục, thẻ đã lưu quay về giá + đơn giá gõ tay qua DOM và lịch sử sau khi lưu (`Page.getNavigationHistory`) (form); đổi trạng thái xong mà tải lại lỗi, 409 ở trang đơn và banner `incomplete_trip` không có nút (order); scrim ở khung hình đầu và hết giờ máy chủ (sheet); mỗi nhóm đã được chạy ĐỎ trên mã cũ trước khi sửa.

## Vi phạm axe có sẵn ở trang cũ (không chặn nghiệm thu A2)

Nguồn: `ket-qua-do.json`, các khoá `axe.hq-*` (axe trên 8 trang ngoài A2 chỉ ghi lại, không chặn). Năm trang không có vi phạm: đăng nhập, danh sách đơn, hồ sơ, tôi, nhật ký. Ba trang có vi phạm:

| Trang | Luật | Mức | Phần tử |
|---|---|---|---|
| `/catalog` (dịch vụ) | `color-contrast` | **serious** (4 phần tử) | huy hiệu `.badge` ("Không còn trong Sheet") và chữ `.row-off > .muted` trong hàng bị làm mờ |
| `/catalog` (dịch vụ) | `empty-table-header` | minor | `th:nth-child(8)` (cột nút thao tác, tiêu đề rỗng) |
| `/staff` (nhân viên) | `empty-table-header` | minor | `th:nth-child(5)` |
| `/locations` (địa điểm) | `empty-table-header` | minor | `th:nth-child(6)` |

Nguyên nhân và lý do chấp nhận:

- `empty-table-header` (minor): cột cuối của bảng là cột nút thao tác nên tiêu đề để trống. Đã có trong bằng chứng PWA (`docs/evidence/2026-09-19-pwa/ket-qua-do.json`) ở `/catalog` và `/staff`; `/locations` chưa được đo ở bằng chứng PWA. Không do A2 gây ra.
- `color-contrast` (serious) ở `/catalog`: nguyên nhân gốc CÓ TỪ TRƯỚC A2 — `.row-off { opacity: .6 }` (`public/app.css`; dùng ở `/catalog`, `/staff`, `/locations`, `/parties`) kéo tương phản chữ và huy hiệu xuống dưới 4,5:1. Phép đo này bắt được vì kịch bản đưa dịch vụ `TTB03` ra khỏi Sheet (`in_sheet = 0`) nên hàng bị làm mờ xuất hiện. Huy hiệu xám "Đã huỷ/Đã ẩn" của Q8 nay ~2,7:1 thay vì ~3,4:1 (chữ đỏ cũ) khi hàng bị mờ. Chấp nhận cho A2 vì các trang này ngoài phạm vi; đề xuất khi làm lại các trang đó: thay `opacity` bằng nền `--c-surface-alt`.

Ngoài axe, ảnh `hq-dich-vu.png` cho thấy ô "Tìm theo mã…" ở hàng lọc hẹp bị cắt placeholder (thẩm mỹ, không phải lỗi chức năng).

## Chưa kiểm (đặc tả §7.6, §8)

- Bàn phím iOS có che nút Lưu dính đáy không (form dài hơn nhiều so với bản cũ) — cần iPhone thật.
- `<input type="date">` / `type="time"` trong PWA đã cài lên Màn hình chính — cần iPhone thật.
- Bảng "Sửa thông tin chuyến" có chui dưới thanh trạng thái/Dynamic Island không (CSS đã trừ `env(safe-area-inset-top)`; Chrome headless có safe-area = 0 nên không tái hiện được) — cần iPhone thật.
- Không có kiểm thử tự động cho `web/` chạy trong CI: kiểm hành vi nằm ở các kịch bản Chrome (`kich-ban/`), chạy tay khi cần; chỉ luật thuần ở `src/shared/` có `node --test`. **`web/trip-sheet.ts`, `web/order-form.ts` và `web/order.ts` KHÔNG có kiểm tự động trong repo — sửa các tệp này thì PHẢI chạy lại ba kịch bản `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`.**
- Hiệu năng ở đơn cỡ tối đa (20 dịch vụ × nhiều dòng) trên iPhone thật: mới đo trên Chrome desktop (`ket-qua-do.json`, khoá `hieuNang`: một lần gõ ở đơn 20 dịch vụ nhập tay = 0,9 ms JS đồng bộ, 0,9 ms kèm ép bố cục; một lần đo mỗi số, không gồm vẽ). iPhone chậm hơn nhiều lần nên phải đo trên máy thật; trần 50 dòng/đơn kiểm ở tầng hành vi (`a2-smoke-form.mjs` nhóm 10c).
- Thuộc tính `inert` (khoá nền khi bảng trượt mở, khoá form khi đang lưu) cần iOS Safari ≥ 15.5, và `100dvh` (chiều cao tối đa của bảng trượt, có `100vh` dự phòng) cần ≥ 15.4 — chưa thử trên iPhone thật.
- Khoá cuộn nền bằng `body.sheet-open { overflow: hidden }` chưa thử trên iPhone thật.
- Vuốt Back từ `/order` sau khi lưu (bộ nhớ đệm bfcache của iOS): form nay được THAY khỏi lịch sử bằng `location.replace` (kiểm bằng `Page.getNavigationHistory`: không còn mục `/order-form`) nên Back không tới được form đã lưu; listener `pageshow` chỉ còn là đai an toàn và mới được kiểm bằng sự kiện GIẢ LẬP `persisted: true` (`a2-smoke-form.mjs` nhóm bfcache). Chưa thử trên iPhone thật.
- IME tiếng Việt (Telex/VNI) và bàn phím số iOS trong ô tên, đơn giá, bộ đếm — kịch bản chỉ gán `el.value` rồi bắn sự kiện `input`/`change` (`setInput` trong `a2-cdp.mjs`); chỉ đúng một lần Enter (nhóm 2b của `a2-smoke-form.mjs`) là phím thật; chưa gõ phím thật/composition. Riêng bộ xử lý chặn Enter ở ô tìm danh mục không kiểm `isComposing`: chưa biết trên iPhone, lúc đang gõ tiếng Việt có dấu, nó có ảnh hưởng tới việc chốt chữ hay không.
- Mockup vòng 2 (sửa 7 lỗi mockup) chưa làm: kế hoạch đã quy định đúng hành vi (nhãn lệch giá chỉ ở dịch vụ danh mục, chữ "7 khách ÷ 5 = 2 lượt (làm tròn lên)", địa điểm rộng hết hàng, chữ nhắc ô check-in) — ảnh ở đây là **bản dựng thật**, không phải mockup.

## Tồn đọng nhỏ (đã hoãn, để đợt sau xử lý; không chặn nghiệm thu)

- `ket-qua-do.json` chưa đóng dấu HEAD/ngày đo của chính nó (HEAD hiện chỉ ghi ở `kiem-tra-may.txt` và tài liệu này).
- `startEnv()` trong `a2-cdp.mjs`: nếu lỗi ném ra GIỮA lúc khởi động (sau khi đã chạy `wrangler dev`/Chrome), `stop()` chưa tới được nên có thể mồ côi tiến trình.
- Kịch bản chưa đếm các lỗi mạng `net::ERR_*` (tải tài nguyên hỏng) — chỉ đếm lỗi console và ngoại lệ.
- Các ảnh `tt-*` là ảnh KHUNG NHÌN (trừ `tt-form-trong`, `tt-don-da-huy` chụp cả trang), không phải toàn trang.
- `docs/PWA-IPHONE.md` còn ghi "8 trang" ở ba chỗ khác (mục cách hoạt động, danh sách kiểm tự động, mục tên hiển thị): `PAGES` và số file HTML đã là 10, còn `tests/e2e/pwa.mjs` chỉ kiểm thẻ meta iOS trên 8 trong 10 trang.
- Scrim của bảng trượt chỉ chặn chạm ở ~1–2 khung hình đầu (`.open` được thêm sau hai `requestAnimationFrame`, bảng trượt 300 ms), nên bấm đúp thật vẫn có thể đóng bảng; nhóm kiểm scrim chỉ chứng minh trạng thái `pointer-events`.
- Thông báo `invalid_transition` của máy chủ chứa mã trạng thái tiếng Anh ("cancelled") — sửa ở `src/modules/orders/index.ts:113` hoặc trong `classifyOrderError`.
- Nhóm "hết giờ" của `a2-smoke-sheet.mjs` phụ thuộc chuỗi `ms === 45000`: đổi `REQUEST_TIMEOUT_MS` thì nhóm chỉ treo chứ không báo lỗi rõ.
- `POST /api/orders` không có khoá idempotent: hết giờ 45 s hiện "bấm Lưu lại" cho yêu cầu tạo đơn mà máy chủ có thể đã xử lý xong (nguy cơ đơn trùng).
