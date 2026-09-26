# Bằng chứng giao diện: Đối tác lập đơn từ danh mục (2026-09-26)

Kịch bản Chrome cho commit `c8d3349` (nhánh `mo-danh-muc-doi-tac`): Đối tác và Thực tập xem danh mục chỉ-đọc để lập đơn; form khoá ô
đơn giá, ô giảm giá cho Đối tác. **Mã được đo: `c8d3349`.** Người viết + chạy kịch bản là subagent kiểm giao diện (không phải người thi công).

Đo trên `wrangler dev` cục bộ với D1 tạm, danh mục GIẢ của `a2-cdp.mjs` (TD101 "Tour 4 đảo Nha Trang", người lớn 1.350.000), Chrome
headless, hai khổ: máy tính 1040×800 (`deviceScaleFactor: 1`) và điện thoại 390×844 (`deviceScaleFactor: 2`). **Không phải** đo trên
iPhone thật, Sheet thật hay production.

Tài khoản Đối tác `0900000271` tạo qua API quản trị thật (`POST /api/staff {fullName, phone, roles:["COLLABORATOR"]}` bằng tài khoản
Quản trị → quyền `["PARTNER"]`), đăng nhập bằng PIN trả về. Đối chứng: Bán hàng "Sales Một" của `a2-cdp.mjs`. Kho cookie chung: trang
Bán hàng mở và đóng TRƯỚC, sau đó chỉ mở trang của Đối tác. `confirm`/`alert` gốc bị thay trước khi mã trang chạy (ghi lại, không bật hộp).

## Kiểm gì

| Bước | Trang, khổ, tài khoản | Khẳng định |
|---|---|---|
| 4 | `/order-form`, máy tính, Bán hàng | Chọn TD101, 2 người lớn: ô đơn giá `readOnly = false` (1.350.000), `#discount.readOnly = false`, không có "Tài khoản đối tác…", không có "Không tải được danh mục". |
| 1 | `/order-form`, máy tính, Đối tác | Ô tìm dịch vụ hiện 3 dịch vụ danh mục (có TD101); không có "Không tải được danh mục"; vẫn ở `/order-form`, nút Lưu dùng được. |
| 2 | (tiếp) | Chọn TD101, 2 người lớn: mọi ô đơn giá đang hiện `readOnly = true`, giá 1.350.000, không nhãn "Khác giá danh mục"; `#discount.readOnly = true`, phần tử NGAY SAU `#discount` là "Tài khoản đối tác tạm chưa được giảm giá."; tạm tính 2.700.000. Ảnh máy tính. |
| 2m | `/order-form`, điện thoại, Đối tác | Như bước 2, không tràn ngang. Ảnh điện thoại. |
| 3 | (tiếp trang 2m) | Điền tên/SĐT khách, ngày = hôm nay giờ VN + 3, bấm "Lưu đơn nháp" → `/order?id=…`; đơn đọc lại qua API (bằng Đối tác): tạm tính = tổng = 2 × 1.350.000 = 2.700.000, giảm giá 0, dòng `[adult, 2, 1350000, 1350000]`, ngày đi đúng; không hộp thoại nào bật. |
| 5 | `/order-form`, máy tính, Đối tác | (chỉ khi có `AXE_JS`) axe: 0 vi phạm critical/serious. |

Mọi bước 1–4: không lỗi console.

## Cách chạy

Từ gốc repo (worktree), sau `npm run build:web`:

```
AXE_JS=/private/tmp/tourdao-axe/package/axe.min.js \
CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh \
  node docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs
```

`AXE_JS` tuỳ chọn (axe-core 4.13.0, ngoài repo). `OUT=<thư mục>` để ghi ảnh chỗ khác. Không cần mạng ngoài. ~1 phút.

## Kết quả lần chạy ghi bằng chứng này (2026-09-26)

6/6 bước ✓ (có axe):

```
  (dữ liệu: tài khoản Đối tác 0900000271 tạo qua POST /api/staff roles=["COLLABORATOR"] → quyền ["PARTNER"])
  (GET /api/catalog bằng Đối tác → 200, 3 mục)
✓ 4) Đối chứng Bán hàng (máy tính 1040): chọn TD101 + 2 người lớn → ô đơn giá và ô giảm giá KHÔNG readOnly, không có dòng “Tài khoản đối tác…”
✓ 1) Đối tác (máy tính 1040): /order-form — ô tìm dịch vụ CÓ dịch vụ để chọn (3 mục danh mục, có TD101), KHÔNG có chữ “Không tải được danh mục”
✓ 2) Đối tác (máy tính 1040): chọn TD101, 2 người lớn → ô đơn giá readOnly = true, hiện đúng giá danh mục 1.350.000; ô “Giảm giá” readOnly = true, ngay sau nó dòng “Tài khoản đối tác tạm chưa được giảm giá.”
✓ 2m) Đối tác (điện thoại 390): chọn TD101, 2 người lớn → ô đơn giá readOnly, giá 1.350.000; ô “Giảm giá” readOnly + dòng “Tài khoản đối tác tạm chưa được giảm giá.”; không có “Không tải được danh mục”; không tràn ngang
✓ 3) Đối tác (điện thoại 390): điền tên/SĐT khách, chọn ngày, bấm Lưu → chuyển sang /order?id=…; đơn (API) tổng = 2 × 1.350.000 = 2.700.000, giảm giá 0, đơn giá = giá danh mục
✓ 5) axe (Đối tác, /order-form máy tính, sau khi chọn TD101): 0 vi phạm critical/serious
6 bước ✓, 0 bước ✗
ĐỐI TÁC LẬP ĐƠN SMOKE OK
```

Số đo in kèm: Bán hàng — đơn giá `readOnly=false` ("1.350.000"), giảm giá `readOnly=false`, sau `#discount` không có phần tử. Đối tác —
dòng tiền `{"name":"Người lớn","readOnly":true,"value":"1.350.000","qty":"2 ×","total":"2.700.000 ₫"}`, sau `#discount`:
`<span class="muted">Tài khoản đối tác tạm chưa được giảm giá.</span>`. Đơn lưu: `TD-20260926-0001` (nháp), tạm tính 2700000, giảm giá 0,
tổng 2700000, ngày đi 2026-09-29.

Ảnh (chụp cả trang, `captureBeyondViewport`): `anh/doi-tac-form-may-tinh.png`, `anh/doi-tac-form-dien-thoai.png`. Các thanh CỐ ĐỊNH
(menu dọc máy tính; thanh tiêu đề và thanh "Tổng cộng / Lưu đơn nháp" ở điện thoại) hiện ở giữa ảnh là hiện tượng của cách chụp cả
trang, không phải lỗi bố cục.

## Điều bất thường (không làm hỏng bước nào, ngoài phạm vi c8d3349)

- Sau khi lưu, trang `/order` của Đối tác gọi `GET /api/dispatch/handlers?orderIds=…` và nhận **403** (2 lần, ghi ở nhật ký mạng của
  trình duyệt, không phải lỗi console). `web/order.ts` `loadHandler()` nuốt lỗi và coi là "chưa biết" nên đơn vẫn hiện. Chưa kiểm khối
  người phụ trách hiện chữ gì với Đối tác.
- Máy tính: dòng "Tài khoản đối tác tạm chưa được giảm giá." nằm trong cột hẹp của ô Giảm giá nên xuống 3 dòng, lệch hàng so với hai
  ô bên cạnh. Ô Giảm giá khi khoá trông giống ô sửa được (không có dấu hiệu khoá ngoài dòng chữ). Chỉ là quan sát bề mặt.

## Chạy lại 2026-09-26 — bản 1.17 (dòng báo giảm giá xuống 3 hàng)

Lỗi: ở máy tính, dòng "Tài khoản đối tác tạm chưa được giảm giá." nằm trong cột hẹp của hàng ba ô Thanh toán nên xuống 3 hàng. Sửa
(`web/order-form.ts`): dòng báo thành `<p class="muted" id="discount-hint">` đặt SAU cả hàng ba ô (`.grid`), ô `#discount` có
`aria-describedby="discount-hint"`. Kịch bản bước 2/2m nay tìm dòng báo theo NỘI DUNG và đếm số hàng hiển thị (`Range.getClientRects`):
máy tính phải 1 hàng, điện thoại ≤ 2; bước 2 kiểm thêm `aria-describedby`.

- Mã chưa sửa (gốc `9e0fb88`): **đỏ** đúng bước 2 — `dòng báo ở máy tính phải nằm gọn 1 hàng — {"tag":"SPAN","id":"","cls":"muted",…,"rows":3}`;
  4 bước ✓, 1 bước ✗ (không axe). Ảnh của lần đỏ ghi ra thư mục tạm, không đè ảnh ở đây.
- Mã đã sửa: **6/6 ✓ (có axe, 0 vi phạm critical/serious)**; dòng báo `{"tag":"P","id":"discount-hint","rows":1,"visible":true}`. Hai ảnh
  `anh/doi-tac-form-may-tinh.png`, `anh/doi-tac-form-dien-thoai.png` được chụp lại từ lần này.
- Ba kịch bản gốc cho `web/order-form.ts` (`a2-smoke-form`, `a2-smoke-order`, `a2-smoke-sheet`): cả ba OK.
- Kịch bản vẫn gọi `GET /api/catalog` bằng Đối tác (cổng `orders` của 1.15): khi nhánh A0 đưa route về `office` thì phải đổi sang
  `/api/catalog/for-order` (ghi ở `docs/HANDOFF-N1.md` "Việc còn treo").
