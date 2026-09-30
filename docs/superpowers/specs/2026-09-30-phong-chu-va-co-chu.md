# Rà soát phông chữ và cỡ chữ (hệ thống thiết kế) — 2026-09-30

**Trạng thái:** đã thi công trên nhánh `worktree-phong-chu-tieng-viet` (chưa gộp). Mục §5 là **đề xuất chờ chủ dự án quyết**, chưa làm.
**Yêu cầu của chủ (30/9):** "rà soát lại Design system / token, chủ yếu là cỡ chữ và phông chữ. Hãy chọn phông chữ tiếng Việt chuẩn, hiển thị đúng và hợp thị giác ở mọi thiết bị. Hiện tại trên máy tính Windows chạy bị lỗi phông nhẹ."
Chủ giao **chọn** phông ⇒ coi là chủ duyệt đổi giá trị `--font` / `--font-display` (nhóm "bản sao từ tourdaovn" của `web/CLAUDE.md`, vốn phải hỏi chủ).

## 1. Chẩn đoán (đo bằng máy, không đoán)

Chưa có ảnh chụp lỗi từ máy Windows thật. Gốc dưới đây đo trên Chrome macOS bằng CDP `CSS.getPlatformFontsForNode` (Chrome dựng chữ bằng cùng một bộ máy HarfBuzz trên mọi hệ điều hành; phần khác nhau giữa các máy chỉ là phông hệ thống dùng làm dự phòng).

| # | Gốc | Bằng chứng | Trên Windows thấy gì |
|---|---|---|---|
| G1 | Mỗi phông bị tách **hai tệp theo `unicode-range`** (kiểu Google Fonts): tệp "latin" có a, e, o…; tệp "vietnamese" có ơ, ư, ạ… và **các dấu tổ hợp** U+0300/0301/0303/0309/0323 | Câu tiếng Việt dạng tổ hợp (NFD): bản cũ vẽ bằng `Nunito ×71 + .SF NS (hệ thống) ×2`; bản mới `Be Vietnam Pro ×73` (một phông) | Chữ gõ bằng Unikey chế độ "Unicode tổ hợp" (phổ biến trên Windows) hoặc dán từ Sheet: chữ gốc và dấu ở hai phông khác nhau → dấu lệch, rời, sai cỡ |
| G2 | `<button>` của trình duyệt **không kế thừa phông**; chỉ vài nút có `font: inherit` | Nút trần và `.pill-btn`: bản cũ `Arial` | Nút hiện Arial giữa trang Nunito |
| G3 | Phông không có `→ ✓ ✕ ↑ ↓ ▾` (cả Nunito lẫn Be Vietnam Pro bản đầy đủ đều không có — đã kiểm bảng ký tự) | Dòng ký hiệu: `.SF NS` + `Zapf Dingbats` (macOS) | Rơi về Segoe UI / Segoe UI Symbol — chấp nhận, nay khai rõ trong chồng phông |
| G4 | Be Vietnam Pro chỉ có 700/800; mã dùng cả 400/500/600 cho vài chỗ chữ tiêu đề | `grep font-weight` | Trình duyệt tự tô đậm/nhạt giả |
| G5 | Mã PIN tạm dùng `ui-monospace, Menlo, monospace` | — | Windows rơi về Courier New (xấu); nay thêm Consolas |

## 2. Quyết định phông: Be Vietnam Pro cho MỌI chữ

- Phông do người Việt thiết kế riêng cho tiếng Việt (dấu chồng hai tầng ấ, ở, ễ cân đối), giấy phép OFL, **đã là phông tiêu đề** của thương hiệu → không thêm họ phông mới.
- Năm độ đậm 400/500/600/700/800, mỗi độ đậm **một tệp đủ chữ** (không tách `unicode-range`), giữ hinting cho Windows. Tổng ~142 KB (trước ~89 KB); service worker nạp một lần.
- **Được/mất:** chữ Be Vietnam Pro rộng hơn Nunito ~6,5% (đo bề rộng một câu mẫu ở 5 độ đậm: 1,057–1,072 lần) và dáng vuông, sắc hơn (Nunito tròn). Đã chạy lại kịch bản Chrome có đo tràn chữ (mục 4).
- **Lệch tourdaovn:** website công khai vẫn dùng Nunito cho chữ nội dung. App và website nay khác phông nội dung (tiêu đề vẫn giống). Nếu muốn giống, đổi ở tourdaovn là việc của repo kia.
- Phương án đã cân nhắc, không chọn: giữ Nunito, chỉ gộp tệp + sửa nút (sửa được G1, G2, không đổi dáng chữ) — hoàn tác về phương án này = đổi hai token `--font`/`--font-display` và thay 5 tệp.

## 3. Thang cỡ chữ

Trước: 32 token cỡ chữ rải rác (`--fs-ui`, `--fs-hdv-*`, `--fs-vc-*`, `--fs-dp-*`…) mỗi token một số px riêng, cộng 11 chỗ viết cứng `rem` trong luật. Thực tế chúng chỉ dùng **14 giá trị**: 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32 px (và 11px ở một chỗ).

Đã làm (giá trị KHÔNG đổi, trừ một chỗ):
- Thang `--fs-step-1…14` ở `:root`; mọi token theo vai trỏ `var(--fs-step-N)`; chỗ `rem` cũ gom vào `--fs-h1`, `--fs-h2`, `--fs-old-*`, `--fs-pin` (giữ nguyên giá trị).
- **`--fs-dp-tiny` 11px → 12px** (bảng điều phối: nhãn số liệu điện thoại, tải trên khối chuyến, nhãn vạch "bây giờ"): dưới 12px dấu chồng hai tầng nhoè trên màn Windows tỉ lệ 100%.
- `src/phong-chu.test.ts` khoá: bậc nhỏ nhất ≥ 12px, token theo vai chỉ trỏ bậc, không cỡ chữ viết cứng ngoài `:root`.

## 4. Kiểm

- Tiêu chí viết trước: mọi đoạn chữ Việt (dựng sẵn, tổ hợp, nút trần, ô gõ, chữ nhỏ nhất) chỉ được vẽ bằng một phông `Be Vietnam Pro [tệp web]`; dòng ký hiệu được thêm một phông hệ thống. **Đạt** (bảng đo ở §1).
- `src/phong-chu.test.ts`: 6/6 đỏ trên `app.css` cũ, 6/6 xanh trên bản mới (quan sát 30/9).
- `npm test`, `npm run typecheck`, `npm run build:web`; kịch bản Chrome `a2-smoke-form/order/sheet` + `trang-chu-smoke` (đo không tràn ngang 390px, xuống dòng ô số liệu); `npm run test:e2e -- pwa`. Kết quả cụ thể ở commit / báo cáo phiên.
- **Chưa kiểm:** máy Windows thật (chưa có ảnh chụp lỗi gốc), iPhone thật.

## 5. Đề xuất chờ chủ quyết (chưa làm)

1. **Rút thang 14 bậc xuống ~8 bậc** (12 · 14 · 16 · 18 · 20 · 24 · 28 · 32). Các bậc lẻ 13, 15, 17, 19, 22, 26 đến từ bản vẽ Claude Design từng màn (Việc của tôi, Vận chuyển, Điều phối, Đăng nhập) mà chủ đã duyệt "làm đúng bản vẽ", nên gộp = đổi cỡ chữ nhìn thấy được ở các màn đó (chênh 1–2px). Được: nhất quán, dễ giữ. Mất: lệch bản vẽ đã duyệt.
2. **Bốn cỡ `rem` cũ lệch thang** (17,6 / 14,4 / 13,6 / 12,8 px ở tiêu đề h2, chữ mờ, nhãn ô, huy hiệu của các trang cũ) → về bậc gần nhất (18 / 14 / 14 / 12).
3. Nếu muốn website tourdaovn cùng phông nội dung với app: đổi ở repo tourdaovn (ngoài phạm vi repo này).
