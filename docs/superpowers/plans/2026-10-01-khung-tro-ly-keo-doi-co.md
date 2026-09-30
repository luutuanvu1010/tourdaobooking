# Khung trợ lý "Hỗ trợ": kéo, đổi cỡ, mặc định góc phải dưới (1/10)

Yêu cầu nguyên văn của chủ dự án (1/10): "cách hiển thị đang quá tốn diện tích, hãy cho phép kéo, thay đổi kích thước khung chat, đồng thời mặc định
là ở góc phải phía dưới màn hình với tất cả các thiết bị".

Phạm vi: chỉ giao diện khung "Hỗ trợ" (`web/tro-ly.ts`, lớp `.tl-*` của `public/app.css`, tệp thuần mới `src/shared/tro-ly-khung.ts`). Không đụng máy
chủ, API, luật trợ lý. Việc nhỏ (giao diện, đảo ngược được): test xanh + tóm tắt, chủ duyệt.

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm)

1. **Mặc định**
   - Khung mở ra nằm góc phải dưới ở mọi khổ (320, 390, 768, 1040, 1440), kể cả điện thoại; không còn tấm phủ toàn màn / tấm trượt từ đáy / nền tối.
   - Cỡ mặc định gọn: ở 390×844 cao ≤ 422px (nửa chiều cao) và diện tích < nửa màn hình.
   - Không che nút nổi "Hỗ trợ" (đáy khung ở trên đỉnh nút); chừa vùng an toàn iPhone (`env(safe-area-inset-*)`, đo lúc chạy).
2. **Kéo được**: kéo bằng thanh tiêu đề (Pointer Events — chuột + cảm ứng); thanh kéo `touch-action: none`; không kéo ra ngoài khung nhìn (kẹp, chừa lề
   tối thiểu 8px).
3. **Đổi cỡ**: tay nắm góc TRÊN-TRÁI (khung neo góc phải dưới), Pointer Events; có cỡ nhỏ nhất (vẫn đọc được một câu trả lời và ô gõ) và lớn nhất (không
   vượt khung nhìn — khi khung nhìn nhỏ hơn cỡ nhỏ nhất thì cỡ lớn nhất thắng); vùng chạm tay nắm ≥ 44px (`--tap-min`), `touch-action: none`.
4. **Nhớ theo từng máy**: `localStorage` (khoá `td_tro_ly_khung`), bọc try/catch, ghi chỉ khi thả tay và khi bấm "Về góc"; giá trị hỏng ⇒ mặc định; nút
   "Về góc" trả về mặc định; xoay máy / đổi cỡ cửa sổ / bàn phím ảo (`visualViewport`) ⇒ kẹp lại (không ghi). Vị trí lưu theo khoảng cách tới mép PHẢI và
   mép DƯỚI (xoay máy vẫn ở góc).
5. **Không hỏng cái cũ**: ô gõ 16px; câu chào; câu hỏi mẫu; dòng "Trả lời do AI…" và "Câu hỏi được lưu…"; đóng bằng ✕ và Esc (khi tiêu điểm trong
   khung); tiêu điểm vào ô gõ khi mở, về nút khi đóng; nút nổi bấm lần nữa = đóng (`aria-expanded`); bàn phím ảo không đẩy khung khuất ô gõ (kẹp theo
   `visualViewport` — CHƯA kiểm được trên iPhone thật, ghi lại); ARIA: `role="dialog"` không modal, `aria-labelledby`; thanh kéo và tay nắm có nhãn tiếng
   Việt, dùng được bằng phím mũi tên.
6. **Luật giao diện**: không `innerHTML`; CSS sau dấu PWA chỉ token (`npm run test:e2e -- pwa`); chữ tiếng Việt có dấu; toạ độ lúc chạy qua
   `style.setProperty` biến `--tl-x/--tl-y/--tl-w/--tl-h`.
7. **Logic thuần** `src/shared/tro-ly-khung.ts` + `tro-ly-khung.test.ts` (đỏ trước, xanh sau): kẹp trong khung nhìn; cỡ nhỏ nhất / lớn nhất; mặc định góc
   phải dưới ở 5 khổ; bàn phím (khung nhìn co) giữ đáy khung trong khung nhìn; giá trị lưu hỏng ⇒ mặc định.

## Kiểm
- `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- tro-ly pwa`.
- Kịch bản Chrome mới `docs/evidence/2026-10-01-khung-tro-ly/kich-ban/khung-tro-ly-smoke.mjs`: mặc định 390 + 1040 (không che nút, ≤ nửa màn), kéo bằng
  chuột thật qua CDP (`Input.dispatchMouseEvent`), kéo quá mép bị kẹp, đổi cỡ, tải lại giữ vị trí, "Về góc", 320 không tràn, Esc, console sạch; ảnh 390 + 1040.
- Chạy lại `tro-ly-smoke.mjs`, `bang-dieu-khien-tro-ly-smoke.mjs` (sửa bộ chọn `.sheet-root .tl-khung`), `help-smoke.mjs` (đổi nhật ký thay đổi).

## Giả định bề mặt (đảo ngược được)
- Cỡ: nhỏ nhất 260×300, mặc định rộng 360 / cao min(460, nửa chiều cao khung nhìn), lề 8px.
- Khung không modal: trang phía sau vẫn dùng được; bảng trượt khác mở thì phủ lên khung (z-index `--z-tl-khung` 36, dưới toast/bảng trượt).
- Hướng dẫn trong app (`huong-dan-chung.ts`) giữ nguyên ("góc dưới bên phải" vẫn đúng).
