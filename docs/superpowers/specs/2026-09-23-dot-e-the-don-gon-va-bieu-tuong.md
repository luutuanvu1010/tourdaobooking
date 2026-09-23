# Đợt E — thẻ đơn rút gọn 2 dòng + biểu tượng cho Trang chủ

**Ngày:** 2026-09-23 · **Nguồn:** yêu cầu trực tiếp của chủ dự án sau khi Đợt D lên production và thử trên iPhone thật.
**Loại:** chỉ giao diện. **KHÔNG đụng** máy chủ, API, dữ liệu, quyền, migration — mọi trường cần hiển thị đã có sẵn
trong `OrderSummaryDto` (đã kiểm: có `staffName`, `createdAt`, `customerPhone`, `pax`, `depositAmount`,
`remainingAmount`, `serviceNames`, `customerNote`, `trip.pickupPlace`).

## Vấn đề chủ dự án nêu (nguyên văn ý)
1. Trang chủ **"đơn điệu và dường như thiếu tính trực quan, nhìn toàn chữ"** — cần thêm biểu tượng, *"giống như cách
   iPhone dùng"*.
2. Mỗi đơn đang cần **7 dòng liên tiếp** → quá tốn diện tích. Yêu cầu: **tối đa 2 dòng hiện ngay + nút xổ xuống**.

## Quyết định của chủ dự án (chốt trong phiên chat 2026-09-23, qua `AskUserQuestion`)
- **Q1 — áp cho màn nào:** **CẢ HAI** — trang Đơn hàng (`/orders`) **và** màn "Việc của tôi" của hướng dẫn viên
  (trong `/account`). ⇒ dựng **một thành phần dùng chung**, không chép mã hai nơi.
- **Q2 — hai dòng hiện ngay:** **GIỮ ngày giờ đón + trạng thái** (không bỏ như bản liệt kê đầu). Lý do chủ đã xem
  và chọn: danh sách sắp theo ngày đón, bỏ ngày đi thì không biết đơn nào của hôm nay.

## A. Thẻ đơn rút gọn

### Hai dòng hiện ngay (đúng bố cục chủ dự án đã chọn)
```
┌──────────────────────────────────────────┐
│ 24/09 · 07:30        [Đã xác nhận]       │
│ ☎ 0912345678  ⚇ 2NL 1TE  ✓1.5tr ⚠còn 2tr │
│                                      ⌄   │
└──────────────────────────────────────────┘
```
- **Dòng 1:** ngày đón · giờ đón (dùng lại `dayMonth()`), huy hiệu trạng thái bên phải (giữ nguyên `badge badge-*`).
  Chưa có ngày → giữ chữ hiện tại "Chưa có ngày đón".
- **Dòng 2:** số điện thoại (bấm được — gọi luôn, giữ `tel:` và `stopPropagation` như hiện tại) · số khách · đã trả · còn thu.
- **Số khách:** dùng `paxCounts()` ở `web/format.ts` — hàm này **đã tự lọc loại có số > 0**, không phải viết lại.
- **Tiền:** "đã trả" = `depositAmount`, "còn thu" = `remainingAmount`; giữ `money-ok`/`money-due` (xanh khi đã đủ).
- Ở khổ hẹp cho phép dòng 2 **xuống dòng** thành 2 hàng — "tối đa 2 dòng" là mục tiêu ở khổ thường, không phải
  ràng buộc cứng làm chữ bị cắt. **Không được cắt mất số tiền hay số điện thoại.**

### Phần xổ xuống
Tên gói (`serviceNames`) · Người lập (`staffName`) · Ngày giờ lập (`createdAt`, **giờ Việt Nam**) · Ghi chú
(`customerNote`) · Nơi đón (`trip.pickupPlace`) · Người phụ trách (ô `slot` đang có ở `/orders`).
Trường nào rỗng thì **không dựng dòng đó**, không hiện "—".

### Ràng buộc hành vi
- **Nút xổ là `<button>` thật**, `aria-expanded` đổi theo trạng thái, vùng chạm ≥ `--tap-min` (44px).
- Cả thẻ vẫn là liên kết mở chi tiết đơn như hiện nay; **bấm nút xổ hoặc số điện thoại KHÔNG được mở trang chi tiết**
  (`preventDefault` + `stopPropagation`, mẫu đã có ở số điện thoại).
- Mặc định **đóng**. Không nhớ trạng thái giữa các lần tải (đơn giản, không cần lưu).
- Bàn phím: Tab tới được nút xổ, Enter/Space mở được.
- **Không `innerHTML`** — dựng bằng `h()`.

## B. Biểu tượng cho Trang chủ
Hệ biểu tượng có sẵn ở `web/icons.ts` (14 cái: `home orders plus me services staff back next lock alert close pin
history chat`) — **SVG nội tuyến, nét mảnh, cùng phong cách iPhone**. Thêm biểu tượng mới **vào đúng tệp đó, cùng
phong cách** (nét, không tô đặc; `stroke-width` giống các cái đang có). Không nhúng bộ icon ngoài, không tải CDN.

| Chỗ | Biểu tượng |
|---|---|
| Ô "Cần xác nhận đơn" | mới — kiểu tài liệu/dấu tích |
| Ô "Còn thiếu tiền" | mới — kiểu tiền |
| Ô "Cần gán" | mới — kiểu người + dấu |
| "Chuyến đón hôm nay" (tiêu đề) | mới — kiểu xe/đồng hồ |
| "Doanh thu của tôi" (tiêu đề) | mới — kiểu biểu đồ cột |
| "Cần xem lại" (tiêu đề) | dùng lại `alert` |
| Dòng chuyến: nơi đón | dùng lại `pin` |
| Dòng chuyến / thẻ đơn: số điện thoại | mới — kiểu ống nghe |
| Thẻ đơn: số khách | mới — kiểu người |

**Luật:** biểu tượng là **trang trí** — mọi biểu tượng phải `aria-hidden="true"` và **luôn đi kèm chữ**; không có
biểu tượng nào đứng một mình mang nghĩa. Màu và kích thước đi vào token ở `:root` của `public/app.css`, không viết cứng.

## Không làm trong đợt này
- Không đổi quyền: hướng dẫn viên **vẫn không vào** `/orders` (chủ dự án chọn "cả hai màn", không chọn mở quyền).
- Không đổi API, không thêm trường, không migration.
- Không đụng thanh điều hướng dọc (vừa phát hành).

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)
1. Trên `/orders` và trong "Việc của tôi": mỗi đơn hiện **đúng 2 dòng** ở khổ 390px và 1040px khi đóng; đo bằng
   chiều cao thật của thẻ, **không phải đếm phần tử**.
2. Bấm nút xổ → phần chi tiết hiện, `aria-expanded` thành `true`, **và KHÔNG điều hướng sang trang chi tiết**.
3. Bấm số điện thoại → gọi điện, **không** mở trang chi tiết.
4. Đơn không có ghi chú / không có nơi đón / chưa có người phụ trách → phần xổ **không có dòng rỗng**.
5. Đơn có đủ 4 loại khách → hiện đủ 4; đơn chỉ có người lớn → **chỉ hiện người lớn**.
6. Trang chủ: mỗi khối nêu ở bảng trên có biểu tượng, tất cả `aria-hidden="true"`, và axe **không thêm lỗi mới**.
7. Không trang nào tràn ngang ở 390 / 640 / 768 / 1040 / 1440px.
8. Tiền hiển thị vẫn là **số hiện hành sau điều chỉnh** (bẫy đã cắn ở Đợt B) — thẻ mới không được đọc số gốc.

## Kịch bản kiểm
`trang-chu-smoke.mjs` (Trang chủ + biểu tượng), `v1-nguoi-phu-trach.mjs` (thẻ đơn ở `/orders`),
`dot-c-smoke.mjs` ("Việc của tôi" trong `/account`). Mỗi tiêu chí trên phải có một khẳng định **chứng minh được là đỏ**
(P16) — khẳng định không chứng minh được thì xoá, đừng để lưới giả.
