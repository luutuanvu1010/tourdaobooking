# Bằng chứng: A2 — giao diện thông tin chuyến theo dịch vụ (2026-09-20)

Artifact của bước nghiệm thu A2 (đặc tả `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md` §7; Hiến pháp §8.2: bằng chứng thay cho lời khai). **Mã được đo: HEAD `b67f4bf`** của nhánh `worktree-thong-tin-chuyen-di` (từ đó đến khi ghi tài liệu này chỉ đổi tài liệu và bằng chứng).

Đo trên `wrangler dev` cục bộ với D1 tạm và bốn tài khoản thử, bằng Chrome headless khổ iPhone 390×844 (ảnh 1x: toàn trang/khung nhìn rộng 390 px, ảnh từng thẻ rộng 326 px) và máy tính 1040×800. **Không phải** đo trên iPhone thật, mạng thật hay Workers Assets thật.

## Ký duyệt thị giác (đặc tả §7.5)

**Chưa ký.** Chủ dự án xem `anh/` cạnh mockup (`docs/design/a2-mockup/output/`) theo bảng đối chiếu dưới đây rồi ghi tại đây: ngày, ai ký, và các điểm cần sửa (nếu có). Chưa ký = chưa triển khai (`docs/HANDOFF-N1.md`).

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

## Các tệp

| File | Hạng (GOVERNANCE §5.2) | Là gì |
|---|---|---|
| `kiem-tra-may.txt` | E1 | `npm test`, `npm run typecheck`, `npm run test:e2e`, gắn HEAD |
| `ket-qua-do.json` | E1 | axe-core (13 màn hình/trạng thái của A2; 0 vi phạm ở cả 13 — không chỉ 0 critical/serious mà không có vi phạm mức nào), hồi quy 8 trang ngoài A2 (khoá `hoiQuy`: không tràn ngang, ô gõ ≥ 16px, 0 lỗi console; axe trên các trang đó chỉ ghi lại — xem mục "Vi phạm axe có sẵn ở trang cũ"), vùng chạm ≥ 44px, ô gõ ≥ 16px, không tràn ngang ở 390 px, 0 lỗi console (khoá `do`: 8 trạng thái khổ điện thoại; hành vi ở 1040 px do `a2-smoke-*.mjs` kiểm), font (6 `@font-face` đều `swap`, nạp thật, nằm trong cache service worker, chặn `woff2` vẫn hiện chữ) |
| `anh/` | E2 | ảnh chụp 1x; cần người xem. **Đọc thế nào:** ảnh toàn trang (`1a`, `1h`, `1j`, `tt-…`) chụp bằng khung nhìn nới đúng chiều cao trang nên thanh tiêu đề ở đầu, thanh tab/thanh Lưu ở cuối ảnh — chúng KHÔNG chứng minh thanh Lưu dính đáy màn hình; hành vi đó thấy ở các ảnh khung nhìn (`tt-dang-luu`, `1f-*`). Khi bấm Lưu bị lỗi trên điện thoại, trang cuộn tới BANNER (cuối form), không tới thẻ |
| `kich-ban/` | — | các kịch bản tạo ra các file trên: `a2-cdp.mjs` (môi trường D1 tạm + `wrangler dev` + Chrome qua CDP, không dependency), `a2-smoke-form.mjs` (17 dòng ✓) / `a2-smoke-order.mjs` (8 dòng ✓) / `a2-smoke-sheet.mjs` (11 dòng ✓) (kiểm hành vi), `a2-evidence.mjs` (ảnh + đo + axe; 6 dòng ✓ A–F); cách chạy ở đầu mỗi file. `axe-core` lấy bằng `npm pack` **ngoài repo**, không thêm vào `package.json` |

Ghi chú về ba kịch bản `a2-smoke-*.mjs`: chúng đã chạy xanh ở Task 7–9 (theo báo cáo của từng task); ở lần đóng gói bằng chứng này (Task 10) chỉ chạy `a2-evidence.mjs` (kết quả `A2 EVIDENCE OK`, 34 ảnh), KHÔNG chạy lại ba kịch bản kiểm hành vi trên bản cuối `b67f4bf` — muốn chắc thì chạy tay theo dòng chú thích ở đầu mỗi tệp. Số dòng ✓ ở bảng trên là số lệnh `ok(…)` trong từng tệp.

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
- Không có kiểm thử tự động cho `web/` chạy trong CI: kiểm hành vi nằm ở các kịch bản Chrome (`kich-ban/`), chạy tay khi cần; chỉ luật thuần ở `src/shared/` có `node --test`.
- Hiệu năng ở đơn cỡ tối đa (20 dịch vụ × nhiều dòng) trên điện thoại thật; chỉ kiểm được trần 50 dòng/đơn ở tầng hành vi (`a2-smoke-form.mjs` nhóm 10c).
- Mockup vòng 2 (sửa 7 lỗi mockup) chưa làm: kế hoạch đã quy định đúng hành vi (nhãn lệch giá chỉ ở dịch vụ danh mục, chữ "7 khách ÷ 5 = 2 lượt (làm tròn lên)", địa điểm rộng hết hàng, chữ nhắc ô check-in) — ảnh ở đây là **bản dựng thật**, không phải mockup.
