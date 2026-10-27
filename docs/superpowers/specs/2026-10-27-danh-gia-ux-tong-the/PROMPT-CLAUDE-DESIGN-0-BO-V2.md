# Đề bài số 0 cho Claude Design: dựng bộ "Island Booking System — Design System v2"

Hồ sơ có ngày (28/10/2026), bước 2b của `QUYET-DINH-2026-10-28-AI-DUNG-BO-V2.md`. Chủ dự án dán phần giữa hai dòng gạch vào Claude Design, đính kèm 6 ảnh ở mục 4 (thư mục `docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/`). Bộ trả về sẽ được phiên Claude Code đối chiếu với `DAU-VAO-BO-V2.md` trước khi chủ duyệt ở cổng 2a.

---

## 1. Vai và nhiệm vụ

Bạn là nhà thiết kế hệ thống cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy dựng một **hệ thống thiết kế** (design system) tên **"Island Booking System — Design System v2"** cho Nền tảng đặt dịch vụ tour nội bộ của Công ty TNHH Tour Đảo (Nha Trang). Đây là bộ nền để mọi màn hình sau này được vẽ lại cho đồng bộ; **chưa vẽ màn hình nào**, chỉ dựng bảng màu chữ (token), từ vựng trạng thái, thành phần dùng chung và sổ tay dùng. Thiết kế điện thoại trước (390×844, dùng một tay), rồi máy tính (1040, kiểm thêm 768 và 1440). **Mọi giá trị gốc lấy đúng từ mục 8 của đề bài này** (chép từ mã đang chạy); không tự đặt màu, phông, cỡ mới. Thiếu thứ gì thì đề xuất, đánh dấu **MỚI** và ghi lý do một dòng.

## 2. Bối cảnh

Nền tảng chạy trên web và cài lên iPhone như ứng dụng ("Tour Đảo Booking"), khoảng 30 nhân viên và gần 1.000 đối tác dùng: nhân viên bán hàng lập đơn tour trên điện thoại khi đang nói chuyện với khách; kế toán đối chiếu công nợ trên máy tính; điều phối xếp xe và tài xế; tài xế bấm "Đã đón / Đã trả" ngoài đường, dưới nắng, bằng ngón cái; đối tác và cộng tác viên gửi đơn từ điện thoại của họ. Giao diện hiện có đã qua nhiều đợt vẽ rời nhau nên không nói cùng một ngôn ngữ: máy đo trên màn hình thấy **86 kiểu nút, 24 kiểu huy hiệu trạng thái (10 chữ cùng nghĩa mà khác hình), 26 kiểu thẻ, 16 kiểu ô nhập**. Bộ v2 này phải chấm dứt điều đó: mỗi thứ **một kiểu**, có tên, có luật khi nào dùng.

## 3. Năm tiêu chí của chủ dự án (theo thứ tự ưu tiên) và nguyên tắc vàng của bộ

1. **Nhanh và mượt**: thành phần nhẹ, chuyển động ngắn (150–200 ms), không hiệu ứng nặng, không nhảy bố cục khi tải (có khung xương).
2. **Dễ nhìn**: chữ nội dung 16 px, tương phản đạt WCAG AA, tiêu điểm bàn phím thấy rõ (vành 3 px), không chỉ dựa vào màu để nói trạng thái.
3. **Gọn mắt**: ít đường viền, ít nền, một bo góc, một bóng nhẹ; thông tin thứ yếu lùi về xám.
4. **Đúng phong cách quản trị**: điềm đạm, dày dạn, kiểu Oracle Redwood / SAP Fiori chứ không phải ứng dụng tiêu dùng; màu nhấn dùng tiết kiệm.
5. **Đơn giản**: ít thành phần, ít biến thể; người mới nhìn là hiểu bấm vào đâu.

Nguyên tắc vàng của bộ: **"một ý nghĩa, một hình"**. Một trạng thái có đúng một chữ, một tông màu, một biểu tượng; một hành động chính có đúng một kiểu nút; mọi ô nhập có nhãn luôn thấy nằm trên ô.

## 4. Hiện trạng (ảnh đính kèm, mỗi ảnh một dòng nói nó sai ở đâu)

1. `nhieu-SUPER_ADMIN-cho-xac-nhan-390.jpg` — hai dải báo chồng ở đầu trang chiếm gần một phần ba màn; huy hiệu "Chờ xác nhận" dùng cùng hình với 11 ý nghĩa khác.
2. `nhieu-SUPER_ADMIN-dieu-phoi-1040.jpg` — ba kiểu nút chính cùng lúc, tab tự chế riêng của trang, nhãn lúc in hoa lúc không.
3. `nhieu-SUPER_ADMIN-account-1040.jpg` — biểu mẫu thêm đứng trước danh sách; bảng cột chật, cột hành động thiếu chỗ.
4. `nhieu-SUPER_ADMIN-chuyen-390.jpg` — thẻ, dòng, huy hiệu mỗi khối một kiểu; nút tắt xám mờ không nói vì sao tắt.
5. `nhieu-DRIVER-cuoc-chuyen-390.jpg` — màn tài xế: nút chưa đủ to cho một tay ngoài nắng, tên khách bị cắt.
6. `nhieu-SALES-404-khong-co-trang-nay-390.jpg` — địa chỉ sai hiện nguyên dòng mã lỗi, không có trang lỗi tử tế.

## 5. Quyết định đã chốt (dựng đúng như vậy; muốn khác thì ghi chú riêng, không đưa vào bộ)

**Cấu trúc token ba tầng**: *gốc* (màu thương hiệu, thang cỡ chữ 14 bậc, khoảng cách 4/8/12/16/24/32/48, bo 8/12/18/999, bóng 3 mức, độ đậm, phông) → *ý nghĩa* (nền, viền, chữ, màu chính, năm tông trạng thái, tiêu điểm, chiều cao điều khiển, lớp xếp, chuyển động) → *thành phần* (chỉ khi thành phần cần giá trị khác ý nghĩa). Tên token tiếng Việt không dấu, kiểu `--c-primary`, `--h-control`, `--nut-chinh-bg`. Mỗi token một dòng công dụng.

**Độ đậm chữ (chủ quyết 27/10)**: ba mức **400 nội dung / 500 nhãn và nút / 600 tiêu đề và số lớn**. Thang cỡ chữ giữ nguyên 14 bậc. Tiêu đề trang dùng bậc 20–24, tiêu đề khối 16–18, nội dung 16, phụ 14, huy hiệu 12.

**Năm tông trạng thái**, mỗi tông một cặp nền nhạt / chữ đậm có sẵn, một biểu tượng, một hình huy hiệu (12/500, bo 999, không viền):

| Tông | Nền / chữ | Biểu tượng | Dùng cho |
|---|---|---|---|
| Cát | `#fbe3b3` / `#5a4109` | đồng hồ | Chờ xác nhận, Chưa xếp, Sắp hết hạn, Chưa ai nhận, Vé mới |
| Biển | `#dcebf6` / `#0c4a6e` | mũi tên vòng | Đang xử lý, Đang chạy, Đã xếp, Đã giao |
| Xanh lá | `#dcfce7` / `#166534` | dấu tích | Đã xác nhận, Hoàn tất, Còn hạn, Đã thu đủ, Vé xong |
| Đỏ | `#fde9ee` / `#8e0e2b` | chấm than | Đã huỷ, Từ chối, Hết hạn, Quá hạn, Giữ lại |
| Xám | `#f2f5f9` / `#475569` | gạch ngang | Nháp, Ngưng dùng, Đã khoá, Không còn trong Sheet |

**Thang nút ba cấp**: *Chính* nền `#0c4a6e` chữ trắng, tối đa một nút mỗi vùng (san hô `#c0392b` chỉ cho "Xác nhận đơn để gửi khách" và "+ Tạo đơn" ở thanh trên); *Phụ* nền trắng viền 1 px `#0c4a6e` chữ cùng màu, biến thể nguy hiểm viền và chữ `#b01235`; *Lối nhỏ* không nền không viền, chữ `#0c4a6e` 500, gạch chân khi rê. Cao 44 (52 ở chân dính điện thoại và Đăng nhập), bo 8, chữ 16/500, biểu tượng 20 trước chữ. Nút tắt: xám phẳng, không mờ, **kèm một dòng nói vì sao tắt** ("Chọn lý do để lưu"). Nút đỏ đặc chỉ xuất hiện trong hộp xác nhận hành động một chiều.

**Ô nhập**: cao 44 (52 ở chân dính), chữ 16, bo 8, viền `#c9d4e0` (rê `#94a3b8`, tiêu điểm vành 3 px `#0891b2`), nhãn **luôn nằm trên ô** 14/500 (không nhãn nổi), "(tuỳ chọn)" ghi sau nhãn, bắt buộc không dùng dấu *, lỗi = viền đỏ + câu dưới ô nói cách sửa. Tiền ghi đủ "1.080.000 ₫" ở mọi khổ; số khách "2 NL · 1 TE"; ngày dd/mm/yyyy.

**Khung chung**: thanh trên 60 cao (logo 30 + tên + biểu tượng Trợ lý, chuông, tài khoản — **không có nút nổi**); thanh tab dưới 4–5 mục trên điện thoại (nền mờ kính `rgba(255,255,255,.86)`); thanh bên trên máy tính theo nhóm gập, chân thanh gồm Của tôi, Hỗ trợ, Hướng dẫn, tên người; dải trên trang **tối đa một**, thu gọn được một dòng; bảng trượt từ đáy trên điện thoại = hộp thoại giữa màn trên máy tính (cùng một khuôn, chân 1 nút chính + 1 phụ, màn mờ `rgba(15,23,42,.45)`); bảng cột chỉ từ bề rộng ≥ 900, dưới đó là thẻ ba dòng; nội dung tối đa 1280 ở khổ 1440.

**Một mật độ** (chủ 27/10: chưa có chế độ gọn/thoáng): dòng danh sách cao ≥ 44, đệm 12×16, kẻ dưới 1 px `#e1e7ef`; bảng máy tính hàng 44.

## 6. Biến thể phải có

- Mỗi thành phần: bình thường, rê chuột (chỉ khi có chuột), tiêu điểm bàn phím, tắt (kèm dòng lý do), lỗi, đang tải (vòng quay trong nút / khung xương), rỗng (nơi áp dụng).
- Hai khổ: 390 và 1040; ghi chú thay đổi ở 768 và 1440.
- Phông: thiết kế trên Be Vietnam Pro, nhưng mỗi thành phần phải vẫn đúng khi công ty đổi sang Nunito, Lexend hoặc Noto Sans (cùng độ đậm 400–700); không dựa vào nét riêng của một phông.
- Vỏ ngoài (thanh trên, thanh trạng thái) mặc định trắng chữ biển; Toàn quyền có thể đổi màu vỏ, nên thành phần bên trong không được phụ thuộc màu vỏ.

## 7. Dữ liệu mẫu cho bản xem trước (giả nhưng đúng cấu trúc thật; không dữ liệu thật)

Khách "Nguyễn Thị Lan Anh", "Trần Quốc Bảo"; mã đơn "TD-2026-10-0412"; dịch vụ "Tour 3 đảo – ca sáng", "Cano riêng Hòn Mun", "Đưa đón sân bay Cam Ranh"; nhóm "Tour đảo", "Đưa đón", "Lặn biển"; tiền "1.080.000 ₫", "410.000 ₫", "còn phải thu 670.000 ₫"; số khách "2 NL · 1 TE"; ngày "28/10/2026", giờ "07:30"; xe "79B-123.45 – 16 chỗ"; tài xế "Lê Văn Hùng"; trạng thái đủ năm tông. Ô tìm: "Tìm theo tên, số điện thoại, mã đơn". Câu rỗng: "Chưa có đơn nào hôm nay" + nút "+ Tạo đơn". Câu lỗi ô: "Số điện thoại cần 10 chữ số, bắt đầu bằng 0". Câu mất mạng: "Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất" + nút "Thử lại".

## 8. Hệ thống thiết kế bắt buộc (giá trị chép từ mã đang chạy; dùng đúng, không đổi)

**Tên và logo**: "Island Booking System"; logo vuông 30×30 cạnh tên (tệp `logo-96.png` đính kèm nếu cần). Chủ: Công ty TNHH Tour Đảo.

**Phông**: Be Vietnam Pro, có sẵn 400, 500, 600, 700, 800; dự phòng `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`; mã đơn và số kỹ thuật dùng `ui-monospace, Menlo, Consolas, monospace`.

**Màu** (hex nguyên văn):

| Nhóm | Giá trị | Dùng cho |
|---|---|---|
| Biển, màu chính | `#0c4a6e` chính · `#082f49` đậm · `#dcebf6` nhạt · `#c9def0` nhạt rê · `#0b5c84` chính rê | nút chính, chữ nhấn, tab và mục đang chọn, huy hiệu "đang diễn ra" |
| San hô, nhấn mạnh | `#c0392b` · `#96271a` rê · `#fef2f0` nhạt | CHỈ "Xác nhận đơn để gửi khách" và "+ Tạo đơn" thanh trên |
| Cát | `#f5a623` · `#fbe3b3` nhạt · `#5a4109` chữ · `#e9d3a4` viền | chờ, cần làm; số nổi trên nền tối |
| Xanh lá | `#dcfce7` nhạt · `#166534` chữ · `#a7e3bc` viền | xong, tốt |
| Đỏ | `#b01235` · `#8e0e2b` chữ · `#fde9ee` nhạt · `#f1c3cf` viền | lỗi, huỷ, quá hạn, nút nguy hiểm |
| Đầm phá | `#0e7490` · `#155e75` đậm · `#e0f2f7` nhạt · `#0891b2` rực = **tiêu điểm** và vạch chỉ báo · quầng `rgba(8,145,178,.2)` | tiêu điểm bàn phím, ô số liệu vận chuyển |
| Nền | `#ffffff` trang và thẻ · `#f2f5f9` nền phụ (thanh bên, khối, huy hiệu xám) · `#f1f5f9` rê dòng | |
| Chữ | `#0f172a` chính · `#475569` phụ, nhãn · `#f8fafc` trên nền tối · `#ffffff` trên nút chính · `#94a3b8` gợi ý trong ô | |
| Viền | `#e1e7ef` thẻ, kẻ dòng · `#c9d4e0` ô nhập · `#94a3b8` ô nhập khi rê | |
| Màn mờ | `rgba(15,23,42,.45)` sau bảng trượt · `rgba(255,255,255,.86)` thanh tab dưới | |
| Điểm lẻ | `#fcd34d` số "còn phải thu" trên nền tối · `#f4f9fd` dòng thông báo chưa đọc · `#fef3c7` ô lịch xe bận · `#fdf1d8` ô "của tôi" · `#eef2f6` ô "tất cả" | giữ, xếp vào tầng thành phần |

**Cỡ chữ** 14 bậc: 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32 px; dòng tiêu đề 1,16; dòng nội dung 18/20/22/24 px. **Độ đậm** 400 / 500 / 600 (mục 5). **Khoảng cách** 4, 8, 12, 16, 24, 32, 48. **Bo góc** 6 (nhỏ), 8 (nút, ô), 12 (thẻ), 14 (ô số liệu), 18 (bảng trượt), 999 (chip, tab, huy hiệu). **Bóng**: thẻ `0 1px 2px rgba(15,23,42,.04), 0 3px 10px rgba(15,23,42,.05)`; thẻ rê `0 2px 6px rgba(15,23,42,.06), 0 12px 28px rgba(15,23,42,.1)`; lớp phủ `0 16px 48px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.06)`; nổi `0 4px 14px rgba(15,23,42,.12), 0 1px 3px rgba(15,23,42,.08)`; nút đặc `0 1px 2px rgba(8,47,73,.22), 0 4px 14px rgba(12,74,110,.24)`. **Chuyển động**: đường cong `cubic-bezier(.22, 1, .36, 1)`; thời lượng 150 ms (nhanh) và 200 ms (vừa); tắt khi người dùng chọn giảm chuyển động. **Chiều cao**: vùng chạm 44, điều khiển 44, điều khiển lớn 52, thanh trên 60. **Lớp xếp**: dính 10, tab 20, bảng trượt 30, phụ 40, trên cùng 50.

**Biểu tượng** (37, nét 2 px, lưới 24, không emoji): home, orders, plus, me, services, staff, back, next, lock, alert, close, check, contact-card, pin, history, chat, palette, doc-check, money, assign, clock, chart, handset, guests, face, help, bell, megaphone, swap, ban, truck, eye, chevron-down, resize, search, grid, trash. Năm biểu tượng trạng thái lấy từ đây: clock (cát), swap (biển), check (xanh lá), alert (đỏ), ban (xám); nếu cần hình khác thì đề xuất và đánh dấu MỚI.

Không có token sẵn cho thứ bạn cần thì **đề xuất token MỚI, đánh dấu MỚI và ghi lý do một dòng**; không viết cứng giá trị vào thành phần.

## 9. Sản phẩm cần giao

1. Bộ hệ thống thiết kế trên Claude tên đúng "Island Booking System — Design System v2", gồm: **sổ tay thương hiệu bằng tiếng Việt** (giọng chữ, nền tảng thị giác, biểu tượng, luật dùng có nêu tên token); **bảng token đủ ba tầng** (mỗi token: tên, giá trị, công dụng một dòng, nguồn "từ mã" hay "MỚI"); **mỗi thành phần** ở mục 10 có trang riêng: khi nào dùng, khi nào không, trạng thái, biến thể, người dùng truyền gì vào, bản xem trước ở 390 và 1040.
2. Hai bảng tổng quan: "Mọi thành phần ở 390" và "Mọi thành phần ở 1040", đặt tên và đánh số rõ.
3. Bảng "**Từ mã / MỚI / BỎ**": giá trị nào chép nguyên, giá trị nào bạn thêm (lý do), giá trị nào trong mục 8 bạn đề nghị bỏ hoặc gộp (lý do).
4. 3–5 dòng giải thích vì sao bộ này giúp nhân viên làm nhanh hơn và đỡ nhầm hơn.

## 10. Thành phần bắt buộc có

Nút ba cấp × hai cỡ · Tab · Ô nhập (chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng) · Ô tích, ô chọn một, công tắc · Bộ đếm − / + · Chip bấm được · Huy hiệu trạng thái năm tông · Thẻ (thường và bấm được) · Dòng danh sách · Bảng máy tính (số canh phải, tiêu đề dính, cột hành động cuối) · Cụm Tìm + Lọc + Sắp xếp + Tải thêm · Bảng trượt / hộp thoại (một khuôn) · Hộp xác nhận hành động một chiều · Dải thông báo ba tông · Báo xong ngắn (toast, 3 giây, có "Hoàn tác") · Dải trên trang (một hình, ba tông, thu gọn được) · Đầu trang · Thanh dính đáy · Thanh trên · Thanh tab dưới · Thanh bên nhóm gập · Khung xương (dòng, số, viên) · Trạng thái rỗng (biểu tượng + câu + một nút) · Phân trang / tải thêm · Trang mất mạng · Trang không quyền / không có trang (một trang chung).

## 11. Đừng làm

Không đổi luật nghiệp vụ; không thêm trường hay tính năng; không màu, phông, cỡ chữ mới ngoài mục 8 (thiếu thì đánh dấu MỚI); **không chế độ tối**; **không nút nổi**; **không nhãn nổi trong ô**; không chữ tiếng Anh trên giao diện (tên token thì tiếng Việt không dấu); không emoji; không dữ liệu thật; không dựa vào màu đơn độc để nói trạng thái; không bỏ thành phần nào ở mục 10. Bản xem trước có thể dựng bằng React theo yêu cầu của loại Design System, nhưng đó chỉ để xem trên Claude, không phải cách Nền tảng được xây.

Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi dựng, tối đa 3 câu.

---

## Bàn giao (cho phiên Claude Code đối chiếu, bước 2c)

Thứ tự ưu tiên khi lệch: quyết định ở mục 5 thắng bộ trả về; giá trị ở mục 8 (chép từ mã) thắng màu trong bộ; chữ thật của máy chủ thắng chữ đề xuất; dữ liệu trong bản xem trước là giả. Việc vượt ra ngoài bề mặt phải ghi vào đặc tả đợt 0: token MỚI cần vào `public/app.css` theo expand–contract; biểu tượng mới cần vào `web/icons.ts`; năm biểu tượng trạng thái và bảng chữ trạng thái chung ở `src/shared/` là việc thi công Chặng 3. Sau đợt 0, bộ chuyển sang đồng bộ từ mã; từ đó mã là nguồn duy nhất.
