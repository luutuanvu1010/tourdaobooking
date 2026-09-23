# Trang chủ mới (Dashboard) — đặc tả

> Đặc tả con của `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` §10/§11/§12 mục 1 (thẩm quyền cao hơn nếu lệch) + `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` (quyết định chủ dự án, BẮT BUỘC dùng đúng). Trang thứ 12 và cuối cùng, việc riêng, làm SAU 11 trang restyle (đã xong, đã lên production 2026-09-23).

## 1. Phạm vi

Trang mới `/home` (`public/home.html` + `web/home.ts`), theo mockup `docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html`. KHÔNG thay route `/` (trang Đơn hàng giữ nguyên y hệt). Chỉ nhân sự văn phòng (SALES/ACCOUNTING/ADMIN/SUPER_ADMIN — access `"office"`) dùng được; PARTNER/FIELD không có mục này trong điều hướng.

## 2. ĐIỂM MƠ HỒ LỚN NHẤT — CẦN CHỦ DỰ ÁN XÁC NHẬN TRƯỚC KHI THI CÔNG

Mockup vẽ khung "app SaaS" hoàn toàn khác app hiện tại: **thanh điều hướng dọc cố định bên trái** (236px, chia 3 nhóm BÁN HÀNG/QUẢN TRỊ/TÔI, avatar+tên ở chân) thay cho **thanh ngang trên cùng `#topbar` + tab bar dưới đáy ở điện thoại** mà 11 trang kia đang dùng (`web/shell.ts`, `initShell()`). Đây KHÔNG phải khác biệt màu sắc — là khác **kiến trúc điều hướng toàn app**.

Đặc tả gốc §6 "Khung trang dùng chung" chỉ áp cho 11 trang restyle và Trang chủ mới đi theo công thức "thêm trang mới" (dùng `initShell()` có sẵn) — cộng với tiền lệ đã có nhiều lần trong dự án này (đặc tả gốc §16 mục 2: mockup vẽ bảng cho danh sách đơn nhưng chủ đã quyết GIỮ dạng thẻ hiện có, không đổi cấu trúc điều hướng/hiển thị nền tảng chỉ vì 1 mockup vẽ khác): **đặc tả này TỰ QUYẾT theo hướng AN TOÀN — dùng ĐÚNG khung `#topbar` + tab bar hiện có (`initShell()`, không sửa `web/shell.ts`), KHÔNG dựng thanh bên dọc mới.** Nội dung trang (dòng chào, 3 ô số liệu, "Chuyến đón hôm nay", "Doanh thu của tôi", "Cần xem lại") lấy đúng từ mockup, xếp trong khung hiện có.

**Đây là giả định lớn nhất của đặc tả này — nếu SAI Ý CHỦ DỰ ÁN (chủ muốn đổi cả điều hướng toàn app sang thanh bên), phải DỪNG lập kế hoạch thi công và hỏi lại trước khi viết mã**, vì đổi điều hướng toàn app là việc lớn hơn hẳn phạm vi "thêm 1 trang" (đụng `web/shell.ts`, mọi trang, PWA, không thể coi là bề mặt/đảo ngược rẻ).

## 3. Đối chiếu mockup — nội dung trang (dùng khung hiện có, không dùng sidebar)

**Thanh trên** (`#topbar` có sẵn): giữ nguyên logo/điều hướng/tên/đăng xuất hiện có — KHÔNG thêm ô tìm kiếm riêng cho trang này (mockup có ô tìm ở thanh trên, nhưng đó là đặc thù layout sidebar; trang Đơn hàng đã có ô tìm riêng của nó — không trùng lặp việc).

**Nội dung `<main>`** (đúng thứ tự DOM, giữ nguyên ở mọi khổ màn hình — bài học Đợt C: KHÔNG lồng div bọc theo thứ tự khác thứ tự đọc tự nhiên trên điện thoại; dùng `grid-column` để tạo 2 cột ở máy tính mà không đổi thứ tự DOM):

1. Dòng chào: "Chào {tên đầu}" + "{Thứ, ngày}/{tháng} · N chuyến đón hôm nay" + chip "Đang ở chế độ bảo trì" (chỉ hiện nếu `me.maintenance?.on`, dùng lại đúng dữ liệu `initShell()` đã có, không gọi API riêng).
2. Lưới 3 ô số liệu: "CÒN THIẾU TIỀN" (tổng tiền còn lại + số đơn + ngày đón sớm nhất trong nhóm này), "ĐƠN NHÁP CHƯA XÁC NHẬN" (số lượng), "CHƯA CÓ NGƯỜI PHỤ TRÁCH" (số lượng) — mỗi ô là link, bấm vào đi tới trang Đơn hàng lọc sẵn (ví dụ `/?status=confirmed` cho ô còn thiếu tiền — lọc phía client bằng query hiện có của trang Đơn hàng, KHÔNG cần đổi API trang đó; nếu trang Đơn hàng chưa hỗ trợ lọc "còn thiếu tiền"/"chưa phụ trách" thì bấm vào chỉ dẫn tới `/` không lọc, ghi rõ trong kế hoạch, KHÔNG đổi API `GET /api/orders` để thêm bộ lọc mới — ngoài phạm vi, đã chốt ở quyết định mục 1).
3. "Chuyến đón hôm nay": danh sách đơn CONFIRMED có ngày đón (sớm nhất trong các dịch vụ có ngày) = hôm nay, sắp theo giờ đón. Mỗi dòng: giờ đón, tên khách + số khách, SĐT (bấm gọi) + tên dịch vụ/tour + nơi đón, số tiền còn lại (màu san hô) hoặc "đã trả đủ" (màu xanh) — ĐÚNG quy ước màu `.money-due`/`.money-ok` đã dùng ở Bước 1, không bịa màu mới.
4. "Doanh thu của tôi": theo quyết định #4 (làm gọn) — CHỈ hiện số tổng tuần + số đơn, KHÔNG vẽ biểu đồ cột 7 ngày của mockup (bỏ hẳn phần `<div>` biểu đồ, giữ phần số liệu). Phạm vi tuần: thứ Hai → Chủ nhật theo giờ Việt Nam (khớp nhãn T2...CN của mockup dù không vẽ biểu đồ, dùng để tính đúng khoảng ngày).
5. "Cần xem lại": HOÃN ở đợt này — mockup cần 2 nguồn dữ liệu (Sheet đổi giá, Góp ý chưa trả lời) CHƯA có API tổng hợp sẵn, và không có trong "quyết định đã chốt". Ghi vào §8 Ngoài phạm vi, không dựng khối này (hoặc dựng khung rỗng ẩn, tuỳ người thi công — không bắt buộc).

**Khổ điện thoại**: đúng mockup — dòng chào 1 dòng, lưới số liệu 2×2 (mockup mobile gộp cả "Doanh thu của tôi" vào lưới 2×2 luôn — dùng đúng cách này, không tách riêng), danh sách "chuyến đón hôm nay" 1 cột, dùng tab bar có sẵn (không thêm gì, `web/shell.ts` không đổi).

## 4. API mới (tự quyết hướng "an toàn": chỉ THÊM route, không đổi route cũ, đặt trong module `orders` có sẵn — không tạo module mới)

Gộp 1 route duy nhất để trang gọi 1 lần, giảm số request:

```
GET /api/orders/dashboard
access: "office"
```

Response (`DashboardResponse`, thêm vào `src/shared/contracts.ts`):
```ts
export interface DashboardResponse {
  today: OrderSummaryDto[]; // đơn confirmed, ngày đón sớm nhất = hôm nay, sắp theo giờ đón
  unpaid: { total: number; count: number; earliestDate: string | null }; // confirmed, remaining_amount > 0
  draftCount: number; // status = draft
  unassignedCount: number; // confirmed, không có dòng HANDLE đang mở (qua v_dsp_order_handler)
  revenueWeek: { total: number; count: number; from: string; to: string }; // confirmed, staff_id = người đăng nhập, created_at trong tuần (T2→CN giờ VN)
}
```

`today` tái dùng `OrderSummaryDto` đã có (Bước 1) — KHÔNG tạo DTO rút gọn riêng, đơn giản hơn, đủ trường cần hiển thị (`customerName`, `customerPhone`, `trip`, `pax`, `remainingAmount`...).

Hàm mới trong `src/modules/orders/repository.ts`: `getDashboard(db, staffId, today)` — SQL cụ thể + đối chiếu tên cột thật viết ở kế hoạch thi công (bước lập kế hoạch phải tự đọc `migrations/0003_orders.sql`, `migrations/0008_order_service.sql`, `migrations/0014_dispatch.sql` để xác nhận đúng tên cột, không đoán lại lần nữa).

**"Chưa có người phụ trách" đọc qua `v_dsp_order_handler`** (view công bố của module `dispatch`) — hợp lệ theo `src/CLAUDE.md` ("đọc xuyên module CHỈ qua view công bố"), KHÔNG import `src/modules/dispatch`.

## 5. Icon mới

5 icon: `home`, `contact-card`, `pin`, `history`, `chat` — thêm vào `web/icons.ts` theo đúng lưới 24×24, nét 1.8, `stroke-linecap: round`, `fill: none` (đúng SVG có sẵn trong mockup, copy `path`/`circle`/`rect` y hệt). Chỉ CẦN icon `home` cho mục điều hướng "Trang chủ" trong `tabsFor()`/`nav` của `web/shell.ts` (KHÔNG đổi cấu trúc `web/shell.ts`, chỉ thêm 1 mục điều hướng mới trỏ `/home`, dùng icon `home`). 4 icon còn lại (`contact-card`/`pin`/`history`/`chat`) KHÔNG cần dùng ngay ở đợt này (chúng thuộc ý tưởng thanh bên dọc, đã bị bỏ theo §2) — vẫn thêm vào `web/icons.ts` cho đủ bộ theo mockup (tài sản thiết kế, không hại gì khi thêm), nhưng không bắt buộc dùng ở trang nào.

## 6. Quyền / điều hướng

Thêm mục "Trang chủ" vào `nav` (thanh trên) và `tabsFor()` (tab bar điện thoại) trong `web/shell.ts`, TRƯỚC mục "Đơn hàng" — chỉ hiện với `office` (giống điều kiện mục "Đơn hàng" hiện có). Route `/home` thêm vào `PAGES` (`src/shared/sw-policy.ts`) và `PRECACHE` (không bắt buộc precache, tuỳ người thi công).

## 7. Điều chưa chắc còn lại (tự quyết theo hướng đơn giản, ghi lại — không cần hỏi thêm)

- "2 đơn đón trong 24 giờ tới" (dòng phụ của ô "Đơn nháp") — bỏ dòng phụ này, chỉ hiện số lượng, vì cần thêm logic lọc theo giờ trên đơn NHÁP (thường chưa có ngày đón chắc chắn) — phức tạp không cân xứng với lợi ích, ghi vào Ngoài phạm vi.
- Bấm vào ô số liệu dẫn đi đâu — theo mục 3.2 ở trên, dẫn `/` (không lọc) nếu trang Đơn hàng chưa hỗ trợ đúng bộ lọc cần thiết.
- "Cần xem lại" — hoãn hẳn (mục 3.5).

## 8. Ngoài phạm vi

Biểu đồ cột 7 ngày, khối "Cần xem lại", đổi điều hướng toàn app sang thanh bên dọc (trừ khi chủ dự án xác nhận muốn — xem §2), đổi `GET /api/orders`, đổi bộ lọc trang Đơn hàng, dòng phụ "N đón trong 24h" của ô đơn nháp.

## 9. Kiểm & nghiệm thu

Việc lớn theo `CLAUDE.md` §3 (đụng API + có thể đụng module `dispatch` qua view) — bắt buộc kiểm độc lập sau khi thi công, không tự nghiệm thu. Test thuần cho `getDashboard()` (`src/modules/orders/repository.test.ts` hoặc tệp mới cạnh module), route mới cần smoke qua e2e nếu có kịch bản `orders`/`dispatch` liên quan, kịch bản Chrome mới cho trang `/home` (theo mẫu `dot-c-smoke.mjs`).
