# Thị giác toàn Nền tảng: "Năng động – Tin cậy – Tinh tế" (bản 1.69)

- **Ngày:** 2026-10-02. **Trạng thái:** chờ chủ dự án duyệt đặc tả (hướng thiết kế ĐÃ chọn, xem dưới).
- **Lời giao việc (chủ dự án, 2/10):** "xử lý bề mặt, thị giác dành cho toàn bộ Nền tảng… nhìn chưa được bắt mắt và tối ưu, cảm giác kém thu hút… phương châm: Năng động, tin cậy và Tinh tế. Giữ lại bố cục chung."
- **Bản xem trước đã cho chủ xem:** artifact "Thị giác Island Booking" (https://claude.ai/artifact/KohvwKX2j75JS8DTYqssE9) — ảnh chụp THẬT của Nền tảng trên D1 tạm, ba bản "Hiện tại / B Nhẹ nhàng / A Năng động", 12 màn (6 điện thoại 390, 6 máy tính 1280). Nguồn ảnh và lớp CSS đề xuất: `docs/evidence/2026-10-02-thi-giac/` (`de-xuat/chung.css` = B, `chung.css` + `huong-a.css` = A, kịch bản `kich-ban/chup-man.mjs`).
- **Chủ đã chốt (4 câu, 2/10, đều chọn khuyến nghị) = hướng A đầy đủ:**
  1. Điểm nhấn đậm: nút lưu/xác nhận chính đặc màu biển đậm; dải tóm tắt đầu trang chi tiết đơn đậm; nút tròn "+" ở thanh dưới điện thoại đặc san hô. (Đổi lại MỘT PHẦN quyết định "nền sáng" 2/10 — đã nói rõ với chủ trước khi hỏi, P18.)
  2. Thêm màu nhấn **xanh ngọc** (đang chọn, vòng tiêu điểm, nhóm Vận chuyển, ô chức năng theo nhóm).
  3. Nền trang **xám xanh rất nhạt**.
  4. **Chuyển động nhẹ**, tự tắt khi máy đặt "Giảm chuyển động".
- **Đã tra:** Hiến chương (`docs/ARCHITECTURE.md` Phần I) không có điều về thị giác. ADR-0087 (Giao diện công ty) quy định: mặc định giao diện = `app.css`; núm là danh sách đóng trong `src/shared/giao-dien.ts`; production đang KHÔNG ghi đè gì (`GET /api/giao-dien.css` = `:root{}`, kiểm 2/10) ⇒ đổi mặc định ở `app.css` là đổi thứ mọi người thấy.

## 1. Giữ nguyên (quyết định cũ của chủ — không hỏi lại)
Bố cục mọi màn; cỡ chữ; độ đậm chữ (chữ mảnh: `--fw-*` không đổi, `--fw-home-stat` không đổi); không thêm chữ viết HOA; thanh trên + thanh bên nền trắng; dải chào Trang chủ máy tính nền trắng; dải đầu Trang chủ điện thoại theo màu thanh trên (trắng); `--c-status-bar` `#ffffff` (thẻ meta + manifest); `--bar-h` 60px, `--w-sidebar` 236px; ảnh biên nhận PNG gửi khách; biểu tượng app.

## 2. Bảng màu (theo hình ảnh đảo)
| Vai | Màu | Dùng cho | Tương phản |
|---|---|---|---|
| Biển đậm (có sẵn `--c-primary`) | `#0c4a6e` | khung, tiêu đề, nút lưu/xác nhận | chữ trắng trên nền này 9,46:1 |
| Xanh ngọc (MỚI `--c-lagoon`) | `#0e7490` | chữ/biểu tượng nhấn | trên trắng 5,36:1 |
| Ngọc tươi (MỚI `--c-lagoon-vivid`) | `#0891b2` | vạch chỉ báo, vòng tiêu điểm — KHÔNG làm chữ | trên trắng 3,68:1 (≥ 3:1 cho thành phần) |
| Ngọc nhạt (MỚI) | `#e0f2f7` | nền ô nhóm Vận chuyển | chữ `#155e75` trên nền này 6,30:1 |
| San hô (có sẵn) | `#c0392b` | hành động chốt, nút "+" thanh dưới | chữ trắng 5,44:1 |
| Cát (có sẵn) | `#f5a623` | nhắc nhở | — |
| Nền trang (ĐỔI `--c-surface-alt`) | `#eaf2f8` → `#f2f5f9` | nền sau thẻ | chữ phụ `#475569` 6,93:1 |
| Viền (ĐỔI `--c-border`) | `#d3e1ec` → `#e1e7ef` | viền thẻ, đường kẻ | — |
| Viền ô nhập (MỚI) | `#c9d4e0`, rê chuột `#94a3b8` | ô gõ | — |
| "Còn lại" trên dải tóm tắt đậm (MỚI) | `#fcd34d` | số tiền còn thiếu | trên biển đậm 6,56:1 |

Lệch website tourdao.vn (ghi ở chú thích token): nền trang, viền, bóng đổ, màu ngọc — cùng tiền lệ đổi phông 30/9.

## 3. Thay đổi theo thành phần (giữ bố cục)
1. **Thẻ** (`.card`, thẻ đơn): viền bằng bóng 1px rất nhạt + bóng mềm hai lớp; thẻ đơn rê chuột (máy tính) nhấc 2px, bóng đậm lên; bỏ khung xanh 2px khi rê (giữ khung khi dùng bàn phím).
2. **Nút:** chuyển màu mượt; bấm lún nhẹ (97%); rê chuột có nền. **Nút chính đặc** = nút gửi form (`.btn-primary[type="submit"]`), nút chính ở chân bảng trượt (`.sheet-foot .btn-primary`), nút Đăng nhập — nền biển đậm, chữ trắng, có bóng; khi bị khoá trở về kiểu nhạt. Các `.btn-primary` khác giữ nền nhạt. Nút san hô có bóng cùng màu.
3. **Ô nhập:** viền đậm hơn một bậc; rê chuột đậm lên; đang gõ: viền ngọc + vành ngọc nhạt 3px (thay khung xanh 2px).
4. **Thanh bên máy tính:** rê chuột có nền; mục đang chọn thêm vạch ngọc 3px bên trái.
5. **Thanh tab điện thoại:** nền trắng mờ kính (nội dung lướt phía sau); nút tròn "Tạo đơn" đặc san hô, dấu cộng trắng, có bóng.
6. **Trang chủ:** ô chức năng tô màu theo nhóm (Bán hàng/Quản lý: biển; Vận chuyển: ngọc; Của tôi: cát; "Tất cả": xám; "Tạo đơn": san hô) + độ bóng nhẹ; viên ngày đang chọn và cột biểu đồ hôm nay tô dải biển → ngọc.
7. **Trang chi tiết đơn:** dải tóm tắt đầu trang nền dải biển đậm → ngọc, chữ trắng; "Còn lại" vàng nhạt. **Sửa lỗi có sẵn:** hôm nay "Còn lại" màu cát trên nền xanh nhạt chỉ 1,67:1. Dải này dùng token riêng (`--c-summary-*`); đầu bảng thông báo ở điện thoại (đang dùng chung `--c-band-*`) GIỮ nền nhạt như nay — bản xem trước không vẽ nó.
8. **Nút nổi "Hỗ trợ", bảng trượt:** bóng nổi rõ hơn; bảng trượt trượt mượt.
9. **Chữ:** tiêu đề trang, số lớn ở dải tóm tắt, lời chào máy tính siết khoảng chữ −0,01em (độ đậm giữ nguyên).
10. **Chuyển động:** chỉ khi rê/bấm/mở bảng; không có hiệu ứng khi tải trang. `prefers-reduced-motion: reduce` tắt hết chuyển tiếp và độ nhấc/lún.

## 4. Bảng "Giao diện" của Toàn quyền (ADR-0087) — điểm cần chủ duyệt
- Hai núm **"Nền nút chính" / "Chữ nút chính"** sẽ điều khiển **nút chính đặc** (mặc định = Màu chính / trắng) và đổi nhãn thành "Nền nút lưu, xác nhận" / "Chữ nút lưu, xác nhận". Nút nhạt còn lại đi theo "Màu chính nhạt" + "Màu chính" (mô tả núm "Màu chính nhạt" đổi thành "nền mục đang chọn, nút phụ"). Production chưa lưu giá trị nào ⇒ không ai mất cài đặt.
- Mặc định "Nền trang" `#eaf2f8` → `#f2f5f9`, "Viền" `#d3e1ec` → `#e1e7ef` (cập nhật `MAC_DINH`; bấm "Về mặc định" sẽ về bộ mới).
- Màu ngọc **chưa** có núm riêng (đổi "Màu chính" không kéo theo ngọc) — ghi `docs/BACKLOG.md`, làm khi chủ cần.

## 5. Ngoài phạm vi
Ba tông theo người (hoãn từ 1/10); đổi phông/cỡ/độ đậm; đổi bố cục bất kỳ màn nào; ảnh biên nhận PNG; icon app; núm cho màu ngọc.

## 6. Tiêu chí nghiệm thu (kiểm được)
1. `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run build:web` chạy được.
2. Bài token (`src/token-giao-dien.test.ts`) thêm các cặp mới (nút chính đặc + khi rê, nút nhạt, nút "+" thanh dưới, dải tóm tắt + "Còn lại", ô nhóm Vận chuyển / Của tôi / Tất cả) ≥ 4,5:1 — **viết đỏ trước** (token chưa có) rồi xanh.
3. Bài `src/giao-dien-mac-dinh.test.ts` xanh với `MAC_DINH` / `CHA` mới.
4. Ảnh "sau" chụp bằng `chup-man.mjs` (không tiêm lớp đề xuất) khớp ảnh hướng A của bản xem trước ở cả 12 màn — so bằng mắt từng màn (bài học Đợt D).
5. Kịch bản Chrome: `giao-dien-smoke.mjs`, `trang-chu-smoke.mjs`, `dot-c-smoke.mjs`, `a2-smoke-form.mjs` — không đỏ mới so với `main` (đỏ sẵn trên `main` ghi rõ); axe không vi phạm mức serious/critical ở các màn đó.
6. Quét khối PWA (`tests/e2e/pwa.mjs`): sau dấu mốc PWA không hex/rgb/px ngoài 1px.
7. Nhật ký phiên bản 1.69 (`src/shared/changelog.ts`) — số = main + 1, kiểm lại lúc gộp (một nhánh khác đang giữ "1.69").

## 7. Kế hoạch thi công (một phiên, mỗi bước đỏ → xanh khi có bài)
1. Bài token mới (đỏ) → token `:root` (`public/app.css`) + `MAC_DINH`/`CHA`/nhãn núm (`src/shared/giao-dien.ts`) → xanh.
2. Gộp `chung.css` + `huong-a.css` vào ĐÚNG luật gốc của `app.css` (không thêm khối đè cuối tệp); chọn bộ chọn theo ngữ cảnh cho nút chính đặc.
3. Ô chức năng theo nhóm: `web/home.ts` gắn lớp theo `nhom` của `src/shared/trang-chu-o.ts` (thay bộ chọn theo đường dẫn của bản xem trước).
4. Chụp ảnh "sau", so 12 màn với bản xem trước; chạy 4 kịch bản Chrome.
5. Nhật ký phiên bản 1.69, cập nhật chú thích token / `web/CLAUDE.md` (nhóm token), `docs/BACKLOG.md`; commit.
6. Một vòng kiểm độc lập chỉ đọc cuối (nhìn ảnh đối chiếu bản xem trước + đọc diff `giao-dien.ts`), vì `giao-dien.ts` là luật kiểm hợp lệ dùng chung với máy chủ.

## 8. Rủi ro
- Trình duyệt cũ: `backdrop-filter` (iOS 9+ có tiền tố), `:is()` (iOS 14+); không dùng `color-mix()`. Thiếu hỗ trợ ⇒ thanh tab nền trắng đục như nay, không vỡ.
- Màn từng làm đúng bản vẽ Claude Design (Đăng nhập, Trang chủ điện thoại/máy tính, Vận chuyển, Điều phối, Việc của tôi) đổi màu theo token chung — chủ đã được báo trong bản xem trước; bố cục không đổi.
- Chưa thử iPhone thật (mờ kính, bóng) — xin chủ xem trên máy sau khi triển khai.
