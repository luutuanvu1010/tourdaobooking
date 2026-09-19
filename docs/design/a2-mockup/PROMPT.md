# Prompt dán vào Claude Design — mockup A2 (Form lập đơn + Trang đơn)

**Cách dùng:** mở Claude Design, tạo thiết kế mới, **đính kèm các tệp trong `refs/`** (danh sách ở mục 2), rồi dán nguyên phần trong khung dưới đây. Prompt tự đủ ý — nếu công cụ không nhận tệp đính kèm thì vẫn làm được, chỉ thiếu ảnh hiện trạng.

---

````
Bạn là nhà thiết kế sản phẩm. Hãy thiết kế MOCKUP cho hai màn hình của một app nội bộ — "Tour Đảo Booking" của Công ty TNHH Tour Đảo (Nha Trang): (A) Form lập/sửa đơn với THẺ DỊCH VỤ, và (B) Trang chi tiết đơn. Đây là công cụ làm việc cho nhân viên bán tour, dùng chủ yếu trên iPhone; ưu tiên mật độ thông tin, tốc độ nhập, chạm bằng ngón cái. Toàn bộ chữ trên giao diện là TIẾNG VIỆT đầy đủ dấu.

## 1. Việc cần làm
Mỗi đơn có nhiều dịch vụ; mỗi dịch vụ có số khách theo loại (Người lớn / Trẻ em / Người cao tuổi / Em bé) và thông tin chuyến riêng (ngày+giờ khởi hành, giờ+điểm đón, ngày+giờ+nơi check-in, ghi chú). Tiền của từng dịch vụ do hệ thống tính. Hiện form chỉ có các dòng phẳng "Dịch vụ / Chi tiết / SL / Đơn giá" (xem ảnh hiện trạng) — hãy thiết kế lại thành THẺ DỊCH VỤ.

Làm các artboard sau (iPhone 390×844, có vỏ PWA đã duyệt: thanh đầu navy có nút "‹" và tiêu đề, safe-area, thanh tab dưới đáy ở các trang; ở form lập đơn thanh tab ẨN và nút "Lưu đơn nháp" dính đáy; khoảng chạm ≥ 44px):

A. FORM LẬP ĐƠN
 A1. Toàn form, trạng thái bình thường: Khách hàng → Dịch vụ (ô tìm "Chọn từ danh mục" + nút "+ Dịch vụ nhập tay" + 3 thẻ dịch vụ mẫu) → Thanh toán → tóm tắt tiền → thanh dính đáy.
 A2. THẺ DỊCH VỤ theo người (chi tiết): tên + chip đơn vị + nút xoá; bộ đếm −/+ cho từng loại khách có giá, ghi chú loại khách ngay cạnh ô nhập; xem trước dòng tiền (SL × đơn giá = thành tiền, đơn giá sửa được); khối "Thông tin chuyến"; tổng của dịch vụ.
 A3. Ba biến thể thẻ: (a) theo NHÓM (chỉ một ô "Số khách", số lượt = ⌈khách/5⌉), (b) NHẬP TAY (tên, số khách chỉ để vận hành, các dòng tiền tự nhập), (c) thẻ đang MỞ đầy đủ thông tin chuyến.
 A4. Các trạng thái của thẻ: "Khác giá danh mục" (giá danh mục gạch ngang), "Giá danh mục đã đổi" (vàng), "Dịch vụ đã ẩn khỏi danh mục" (xám), cảnh báo ngày khởi hành đã qua/quá 365 ngày (vàng), cảnh báo giờ đón sau giờ khởi hành, lỗi nhập ("Tối đa 50 khách.").
 A5. Ba banner lỗi/xung đột: giá danh mục vừa đổi (kèm danh sách "Người lớn: 1.350.000 → 1.400.000 ₫"), đơn vừa bị người khác sửa (nút "Tải lại đơn"), trang đã cũ.
 A6. Bản MÁY TÍNH ≥ 960px của form: hai cột, cột phải là tóm tắt tiền dính + nút Lưu.
 → Với thông tin chuyến hãy ĐƯA 2 PHƯƠNG ÁN bố cục để tôi chọn: (V1) khối thu gọn kiểu accordion, mặc định hiện một dòng tóm tắt "20/09 · 07:30 · đón 07:00 · Khách sạn Sunrise"; (V2) luôn mở, lưới 2 cột (ngày|giờ). Nêu ngắn ưu/nhược mỗi phương án.

B. TRANG ĐƠN
 B1. Đơn NHÁP: đầu trang (mã đơn, huy hiệu "Nháp", "Lập 16:45 19/09/2026 bởi Nguyễn Thị Mai"), nút Sửa / Xác nhận đơn / Huỷ đơn, khối Khách hàng, MỖI DỊCH VỤ MỘT KHỐI (số khách theo loại, ngày giờ khởi hành, đón, check-in, ghi chú, các dòng tiền, nhãn lệch giá), Thanh toán, Lịch sử.
 B2. Bấm "Xác nhận đơn" khi thiếu thông tin: banner đỏ "Chưa đủ thông tin chuyến để xác nhận đơn." + danh sách theo dịch vụ ("… — chưa có ngày khởi hành" / "ngày khởi hành đã qua" / "quá xa (trên 365 ngày)" / "chưa có khách"), mỗi dòng có liên kết "Sửa".
 B3. Đơn ĐÃ XÁC NHẬN: huy hiệu xanh lá; nút "Sửa thông tin chuyến" + "Huỷ đơn"; dòng nhắc "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến."; số khách và tiền hiện kiểu chỉ-đọc có biểu tượng khoá.
 B4. Bảng "Sửa thông tin chuyến" (bottom sheet): mỗi dịch vụ một nhóm trường (ngày khởi hành — không được xoá, giờ khởi hành, giờ đón, điểm đón, ngày/giờ/nơi check-in, ghi chú) + "Lưu thông tin chuyến" + lưu ý "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."

Dùng ĐÚNG dữ liệu mẫu và lời chữ trong tệp `noi-dung-man-hinh.md` (khách Trần Văn Bình; dịch vụ "Tour 4 đảo Nha Trang" 2 người lớn + 1 trẻ em, "Phao chuối" 7 khách = 2 lượt, "Xe đưa đón riêng" nhập tay; tổng 7.450.000 ₫, cọc 1.000.000 ₫, còn lại 6.450.000 ₫). Tiền định dạng "1.350.000 ₫", canh phải, không xuống dòng.

## 2. Tài liệu đính kèm (đọc trước khi vẽ)
- tourdaovn-tokens.css — NGUỒN TOKEN DUY NHẤT của thương hiệu (bảng màu biển đảo, font, spacing, bo góc, bóng).
- tourdaovn-design-brief.md — triết lý thiết kế và quy tắc dùng token của tourdaovn, đã cô đọng; phần "Không mang nguyên sang app nội bộ" là bắt buộc.
- noi-dung-man-hinh.md — dữ liệu mẫu, trạng thái, lời chữ, ràng buộc cho từng màn.
- hien-trang-lap-don-mobile.png, hien-trang-trang-don-mobile.png — giao diện hiện tại trong vỏ PWA (giữ đúng vỏ này: thanh đầu navy, nút "‹", thanh tab, nút dính đáy).
- sales-app-pwa.css — CSS hiện tại (đã có token vỏ PWA: --tap-min, --bar-h, --tabbar-h…). pwa-shell-spec.md — các quyết định vỏ PWA. logo-tour-dao-96.png — logo.

## 3. Ràng buộc thiết kế (theo tourdaovn)
- Dùng CSS custom properties ĐÚNG TÊN token của tourdaovn (--c-primary, --c-accent, --c-surface-alt, --s1…--s9, --radius-sm/md/lg/pill, --shadow-card…). KHÔNG viết cứng màu/khoảng cách/bo góc ngoài khối :root (nguyên tắc P6/N7). Cần token mới thì khai riêng ở :root của app nội bộ, gắn nhãn MỚI + lý do (tourdaovn KHÔNG có ngôn ngữ form: ô nhập, cảnh báo, bộ đếm, bảng đều "không nêu" — app phải tự thêm).
- Màu (bộ mặc định "bien-sau"): navy --c-primary #0C4A6E (thanh đầu, tiêu đề, link, viền focus, nút Lưu), san hô --c-accent #C0392B (CHỈ hành động "chốt" như Xác nhận đơn và NHÃN GIÁ; chữ trắng trên nó 5.44 đạt AA; nền nhãn giá --c-accent-soft #FEF2F0, chữ --c-accent-strong #96271A), cát --c-sand #F5A623 chỉ cho nội dung/nhấn — TUYỆT ĐỐI KHÔNG làm nền nút (kèm --c-sand-soft #FBE3B3, --c-sand-text #5a4109, --c-sand-border #e9d3a4 cho cảnh báo nhẹ), ngọc lam --c-sea #0E7490, nền trang --c-surface-alt #EAF2F8 + thẻ trắng --c-surface, viền --c-border #D3E1EC, chữ --c-text #0F172A / --c-text-muted #475569, "Đã xác nhận" xanh lá (--c-green-soft #DCFCE7 / --c-green-text #166534). Không dark mode.
- MÀU TRẠNG THÁI: tourdaovn chưa có token lỗi/nguy hiểm/thành công/cảnh báo/thông tin cho app. Hãy ĐỀ XUẤT tối đa 4 token trạng thái (danger, warning, success, info — mỗi cái gồm nền nhạt + chữ + viền), tái dùng sắc sẵn có khi được, đánh dấu MỚI, kiểm AA. ĐỪNG dùng san hô --c-accent cho hành động phá huỷ ("Huỷ đơn") hay cho lỗi: san hô là màu "thấy ấm là có hành động thật". Cảnh báo vàng dùng nhóm --c-sand-*.
- Nút: nút chính "Lưu đơn nháp" navy nền --c-primary chữ trắng; "Xác nhận đơn" san hô --c-accent chữ --c-text-inverse; nút phụ viền 1px --c-border chữ --c-text; "Huỷ đơn" dạng viền với màu nguy hiểm đề xuất ở trên. Bo góc nút --radius-sm 8px (tài liệu tourdaovn tự mâu thuẫn pill/8px; app nội bộ giữ 8px như bản PWA đã duyệt). Thanh dính đáy: nền --c-card, viền trên 1px --c-border, nút rộng 100%. iPhone không có hover: thiết kế trạng thái :active và :focus-visible cho MỌI phần tử tương tác (vòng focus 2px --c-primary, không outline:none).
- Thẻ: nền --c-card, viền 1px --c-border, bo --radius-md 12px (app dày thông tin; tourdaovn dùng --radius-lg 18 cho thẻ nội dung), --shadow-card, padding --s4. Nhãn "Khác giá danh mục" dùng kiểu NHÃN GIÁ (nền --c-accent-soft, chữ --c-accent-strong, --radius-sm). Huy hiệu trạng thái đơn dạng pill (--radius-pill, padding --s1 --s3, chữ 12px, đậm 600): Nháp = kiểu sand (--c-sand-soft/--c-sand-text), Đã xác nhận = xanh lá, Đã huỷ = kiểu "past" xám (--c-surface-alt/--c-text-muted) — đề xuất, nêu lý do nếu bạn chọn khác.
- Chữ: tiêu đề Be Vietnam Pro (700–800), nội dung/nhãn/nút Nunito (500–800). App nội bộ dày thông tin nên ĐƯỢC thu nhỏ thang chữ so với site công khai (thân 19px của tourdaovn là TRẦN, không phải mức dùng cho form): nội dung 16px, nhãn 14px, huy hiệu 12px, ô nhập và mọi phần tử có thể gõ ≥ 16px (nhỏ hơn thì iOS tự phóng to). GIỮ line-height thân 1.68 / tiêu đề 1.16 để dấu tiếng Việt không bị cắt; letter-spacing luôn 0 (cấm âm); chỉ nhãn CHỮ HOA mới giãn 0.08em kèm line-height 1.5.
- Khoảng cách 4/8/12/16/24/32/48 (--s1…--s7); chuyển động --m-fast 180ms / --m-base 300ms, tôn trọng prefers-reduced-motion, không animation tự chạy.
- Nền trang xanh nhạt --c-surface-alt để thẻ trắng nổi (đúng nguyên tắc "thiếu DIỆN TÍCH màu, không thiếu màu": thanh navy trên + nền xen kẽ), KHÔNG hoạ tiết, hero, ảnh trang trí, gradient phủ trang. Phân cấp bằng cỡ/độ đậm chữ và diện tích màu; không thêm sắc ngoài bảng.
- Truy cập: chữ thường ≥ 4.5:1 (AA); thành phần UI/chữ lớn ≥ 3:1 (tourdaovn không nêu — đây là quyết định của app); khoảng chạm ≥ 44px; trạng thái không chỉ dựa vào màu (kèm chữ/biểu tượng).

## 4. Cách trình bày kết quả
- Mỗi artboard đặt tên rõ (vd "A2 · Thẻ dịch vụ theo người · 390"), xếp theo luồng A → B trên canvas; các trạng thái cạnh nhau để so.
- Dựng bằng HTML/CSS thật (không ảnh phẳng) để nhà phát triển lấy được cấu trúc.
- Có một artboard "Token đã dùng": liệt kê token → nơi dùng → giá trị; đánh dấu token nào là MỚI so với tourdaovn (đặc biệt bốn token trạng thái và các kích thước bộ đếm/thanh).
- Với mỗi quyết định thiết kế không hiển nhiên (bộ đếm, thu gọn thông tin chuyến, bảng sửa sau xác nhận) ghi 1–2 dòng lý do.

## 5. Không làm
- Không đổi luật nghiệp vụ, không thêm trường ngoài danh sách; không thêm tính năng (khuyến mãi, mùa vụ, thanh toán trực tuyến).
- Không dùng chữ tiếng Anh trên giao diện (trừ tên riêng), không dùng dữ liệu khách thật.
- Không thay vỏ PWA đã duyệt (thanh đầu navy, thanh tab, nút dính đáy).
- Không dùng hover làm điều kiện duy nhất để lộ hành động; không dark mode; không font mono; không tracking âm.
- Không dùng san hô cho lỗi/nguy hiểm; không dùng cát làm nền nút.

Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu.
````

---

## 2. Danh sách tệp đính kèm (thư mục `refs/`)

| Tệp | Dùng để |
|---|---|
| `tourdaovn-tokens.css` | nguồn token gốc (sao chép từ `tourdaovn/src/styles/tokens.css`) |
| `tourdaovn-design-brief.md` | triết lý + quy tắc token đã cô đọng, phần "không mang nguyên sang app nội bộ" |
| `noi-dung-man-hinh.md` | dữ liệu mẫu, trạng thái, lời chữ, ràng buộc từng màn |
| `hien-trang-lap-don-mobile.png`, `hien-trang-trang-don-mobile.png` | giao diện hiện tại trong vỏ PWA |
| `sales-app-pwa.css`, `pwa-shell-spec.md` | CSS hiện tại + quyết định vỏ PWA iPhone |
| `logo-tour-dao-96.png` | logo công ty |

> Lưu ý: hai ảnh hiện trạng và `sales-app-pwa.css` lấy từ nhánh `worktree-pwa-iphone` (chưa merge vào `main`), vì vỏ PWA nằm ở đó.
