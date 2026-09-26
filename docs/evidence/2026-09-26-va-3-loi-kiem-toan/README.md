# Bằng chứng giao diện: vá DK-T3-02 và DK-T4-02 (2026-09-26)

Kịch bản Chrome cho hai lỗi kiểm toán 24/9 vá trên nhánh `va-3-loi-kiem-toan`. Hiến pháp §8.2: bằng chứng thay cho lời khai.
**Mã được đo: commit `3c7fdb3`** (sau `0245f7d` DK-T3-02 và `f8d290c` DK-T4-02). Người viết + chạy kịch bản là subagent
kiểm giao diện (không phải người thi công hai commit trên).

Đo trên `wrangler dev` cục bộ với D1 tạm, bằng Chrome headless, hai khổ: máy tính 1040×800 (`deviceScaleFactor: 1`) và
điện thoại 390×844 (`deviceScaleFactor: 2`, ảnh 2x). **Không phải** đo trên iPhone thật, mạng thật hay Workers Assets thật.

## Kiểm gì

| Bước | Trang, khổ, tài khoản | Khẳng định |
|---|---|---|
| 1 | `/staff`, máy tính, Quản trị | Bảng hiện. Hàng "(bạn)" (Quản Trị) có "Sửa" nhưng **không** có "Đặt lại PIN"; hàng "Sales Một" (Bán hàng) **vẫn** có "Đặt lại PIN". axe. |
| 2 | `/staff`, điện thoại, Quản trị | Thẻ hiện, bảng ẩn. Cùng khẳng định trên thẻ (`card()`). axe. |
| 3 | `/account` "Việc của tôi", máy tính, HDV (FIELD) | Khối dịch vụ CÓ "Lưu số khách mới" (đơn danh mục). Chạm "Huỷ đơn này" → vùng "Huỷ đơn": 2 nút lý do (`btn-danger`) + "Thôi", nằm trong `.myjob-cancel` là con **trực tiếp** của thẻ đơn, **không** nằm trong `.myjob-service`; "Lưu số khách mới" không nằm trong vùng huỷ; đường ngăn `1px solid`. Mở vùng chưa gọi confirm. axe. "Thôi" đóng vùng, "Huỷ đơn này" hiện lại. |
| 4 | `/account`, điện thoại, HDV | Cùng cấu trúc như bước 3, không tràn ngang. axe. |
| 5a | (tiếp trang bước 4) | `window.confirm` bị thay từ trước khi mã trang chạy, trả `false`. Chạm "Khách yêu cầu huỷ" → confirm gọi **đúng 1 lần**, chữ có mã đơn, tên khách, "không thể hoàn tác"; **không** có `POST …/handler-cancel` (đếm qua CDP `Network.requestWillBeSent`); đơn vẫn `confirmed` (hỏi API bằng Sales); vùng lý do vẫn mở. |
| 5b | (tiếp) | "Thôi" đóng vùng, "Huỷ đơn này" hiện lại, vẫn 0 POST. |
| 5c | (tiếp) | Mở lại vùng, confirm trả `true`, chạm lý do → đúng 1 POST, đơn thành `cancelled` (API), thẻ biến khỏi "Việc của tôi" (còn "Bạn chưa được giao phụ trách đơn nào."). Tổng số lần confirm = 2. |

Mọi bước: không lỗi console.

Dữ liệu tự dựng trong kịch bản: tài khoản HDV `0900000261` quyền FIELD (gieo bằng `scripts/staff-lib.mjs`, như
`v1-nguoi-phu-trach.mjs`), mục danh mục giả `ZVA3` (chỉ người lớn), Sales Một lập đơn ngày đi = hôm nay giờ VN + 3,
xác nhận, giao HDV phụ trách qua `PUT /api/orders/:id/handler`.

## Cách chạy

Từ gốc repo (worktree), sau `npm run build:web`:

```
AXE_JS=/private/tmp/tourdao-axe/package/axe.min.js \
CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh \
  node docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/va3-smoke.mjs
```

`AXE_JS`: axe-core **4.13.0** (ngoài repo, không phải dependency; tải bằng `npm install axe-core@4.13.0 --no-save` vào thư
mục tạm). Thiếu `AXE_JS` thì kịch bản vẫn chạy, bỏ bước axe và in "CHƯA CHẠY AXE". `OUT=<thư mục>` để ghi ảnh chỗ khác.
Không cần mạng ngoài. ~1 phút.

## Kết quả lần chạy ghi bằng chứng này (2026-09-26)

7/7 bước ✓, thoát mã 0, axe chạy ở bước 1–4 (0 vi phạm critical/serious):

```
✓ 1) Quản lý tài khoản (máy tính 1040): hàng “(bạn)” của quản trị KHÔNG có “Đặt lại PIN” (vẫn có “Sửa”), hàng Bán hàng “Sales Một” VẪN có, axe không vi phạm critical/serious
✓ 2) Quản lý tài khoản (điện thoại 390): thẻ “(bạn)” của quản trị KHÔNG có “Đặt lại PIN” (vẫn có “Sửa”), thẻ Bán hàng “Sales Một” VẪN có, axe không vi phạm critical/serious
✓ 3) Việc của tôi (máy tính 1040): chạm “Huỷ đơn này” → hiện vùng “Huỷ đơn” (2 nút lý do + “Thôi”) trong khối .myjob-cancel riêng, KHÔNG nằm trong khối dịch vụ có “Lưu số khách mới”; “Thôi” đóng vùng, hiện lại “Huỷ đơn này”, axe không vi phạm critical/serious
✓ 4) Việc của tôi (điện thoại 390): vùng “Huỷ đơn” mở, cùng cấu trúc (khối .myjob-cancel riêng, ngoài khối dịch vụ có “Lưu số khách mới”), axe không vi phạm critical/serious
✓ 5a) confirm trả false: chạm “Khách yêu cầu huỷ” → confirm gọi ĐÚNG 1 lần, chữ có mã đơn + tên khách + “không thể hoàn tác”; KHÔNG có POST handler-cancel; đơn VẪN “confirmed” (API bằng Sales)
✓ 5b) “Thôi” đóng vùng huỷ, nút “Huỷ đơn này” hiện lại, vẫn không có POST handler-cancel
✓ 5c) confirm trả true: mở lại vùng, chạm “Khách yêu cầu huỷ” → đúng 1 POST handler-cancel, đơn thành “cancelled” (API bằng Sales), thẻ biến khỏi “Việc của tôi”
7 bước ✓, 0 bước ✗
VA3 SMOKE OK
```

Số đo in kèm: hàng/thẻ "(bạn)" chỉ có `["Sửa"]`; hàng/thẻ Sales Một có `["Sửa","Đặt lại PIN","Ngưng"]`. Chữ confirm:
“Huỷ đơn TD-20260926-0001 của Khách Huỷ Thử? Lý do: Khách yêu cầu huỷ. Việc huỷ không thể hoàn tác.” Khoảng cách từ đáy
nút "Lưu số khách mới" tới đỉnh nút lý do đầu tiên: 107px (cả hai khổ).

Kết quả trên là lần chạy thứ hai (sau khi thêm thử lại đăng nhập khi ECONNRESET, xem mục P16); lần chạy đầu (trước khi thêm)
cũng 7/7 ✓. Ảnh trong `anh/` là của lần chạy thứ hai.

## P16 — đã quan sát kịch bản chặn thật trên mã CŨ

Không sửa `web/`/`public/` để làm đỏ: lấy nguyên cây mã **trước hai commit vá** (`823c1b1`) bằng
`git archive 823c1b1 | tar -x -C /tmp/va3-old`, nối `node_modules` bằng liên kết mềm, `npm run build:web` ở đó, rồi chạy
chính kịch bản này với thư mục làm việc là `/tmp/va3-old` (`ROOT` của `startEnv()` lấy từ thư mục làm việc) và
`OUT=/tmp/va3-old-out` (không đè ảnh ở đây). Kết quả **0/7 ✓, 7/7 ✗**, thoát mã 1:

```
✗ 1) … hàng “(bạn)” KHÔNG được có “Đặt lại PIN” — ["Sửa","Đặt lại PIN"]
✗ 2) … thẻ “(bạn)” KHÔNG được có “Đặt lại PIN” — ["Sửa","Đặt lại PIN"]
✗ 3) … hết giờ chờ: vùng huỷ mở            (mã cũ không có .myjob-cancel / nút “Thôi”)
✗ 4) … hết giờ chờ: vùng huỷ mở
✗ 5a) … confirm phải được gọi đúng 1 lần — []   (mã cũ huỷ NGAY khi chạm lý do, không hỏi lại — đúng lỗi DK-T4-02)
✗ 5b) … chạm “Thôi”                          (không có nút “Thôi”)
✗ 5c) … chạm lại “Huỷ đơn này”              (đơn đã bị huỷ ở 5a, thẻ đã biến mất)
0 bước ✓, 7 bước ✗
VA3 SMOKE HỎNG
```

Rồi chạy lại trên mã đã vá (worktree, `3c7fdb3`): 7/7 ✓ như trên. Cơ chế kiểm được coi là hoạt động thật.

Bẫy gặp khi chạy trên `/tmp/va3-old`: lần gọi API đầu tiên sau các lệnh `wrangler d1 execute` dựng dữ liệu hỏng
`fetch failed … ECONNRESET` (3/3 lần), máy chủ không ghi dòng log nào — kết nối giữ-sống của fetch Node từ vòng chờ máy chủ
đã bị đóng trong lúc chờ các lệnh SQL, lần gửi đầu dùng lại kết nối chết. Kịch bản nay **thử lại riêng lời gọi đăng nhập**
(tối đa 2 lần, chỉ khi ECONNRESET); không thử lại POST nào khác. Đây là lỗi môi trường/kịch bản, không phải lỗi mã app.
`a2-cdp.mjs` dùng chung không bị sửa; các kịch bản khác có cùng khuôn "SQL rồi gọi API" có thể gặp cùng bẫy này.

## Bước 6 — thêm bởi NGƯỜI THI CÔNG phần máy chủ DK-T4-02 (2026-09-26)

Chủ dự án chốt (26/9): tour **đã qua ngày đi** (ngày khởi hành lớn nhất < hôm nay giờ VN) thì HDV không huỷ được nữa; ngay trong
ngày đi vẫn huỷ được; sửa số khách giữ như cũ. Máy chủ trả 409 `departed` (e2e `tests/e2e/dispatch.mjs` khối 13b); giao diện "Việc của
tôi" không hiện nút "Huỷ đơn này" với đơn đó mà hiện dòng "Tour đã qua ngày đi — muốn huỷ đơn, nhờ văn phòng." (cùng luật thuần
`tripDeparted`, `src/shared/trip-rules.ts`). Bước 6 người thi công tự thêm và tự chạy — **không phải** lời kiểm của người kiểm giao diện.

| Bước | Trang, khổ, tài khoản | Khẳng định |
|---|---|---|
| 6 | `/account` "Việc của tôi", máy tính, HDV | Đơn thứ hai (ZVA3, xác nhận, giao HDV), ngày đi đẩy về hôm qua bằng SQL trên D1 tạm. Thẻ đơn **không** có nút "Huỷ đơn này"; vẫn có "Lưu số khách mới"; vùng `.myjob-cancel` có dòng nhắc "nhờ văn phòng". axe. Không lỗi console. |

P16: chạy kịch bản với `web/account.ts` của commit trước (`97bb97a`, chép tạm vào chỗ rồi `npm run build:web`, `OUT=/tmp/…` để không đè
ảnh) → bước 6 **✗** (`{"btns":["−","+","Lưu số khách mới","Huỷ đơn này"],"zoneText":"Huỷ đơn này"}`), 7 bước còn lại ✓; trả lại
`web/account.ts` đã vá, build lại → **8/8 ✓**:

```
    nút trên thẻ: ["−","+","Lưu số khách mới"] · vùng huỷ: “Tour đã qua ngày đi — muốn huỷ đơn, nhờ văn phòng.”
✓ 6) Việc của tôi (máy tính 1040): tour đã qua ngày đi → KHÔNG có nút “Huỷ đơn này”, có dòng nhắc “nhờ văn phòng”; “Lưu số khách mới” vẫn còn (sửa số khách giữ như cũ), axe không vi phạm critical/serious
8 bước ✓, 0 bước ✗
VA3 SMOKE OK
```

Lần chạy 8/8 này cũng chụp lại ảnh các bước 1–4; hai ảnh `nhan-vien-*` khác byte nên đã được **trả lại bản cũ** của người kiểm (giữ
bằng chứng gốc); chỉ thêm ảnh mới `tour-da-qua-ngay-di-may-tinh.png`. Chưa đo bước 6 ở khổ điện thoại.

## Ảnh (`anh/`)

| Ảnh | Nội dung | Khổ |
|---|---|---|
| `nhan-vien-ban-may-tinh.png` | Bảng Quản lý tài khoản: hàng "Quản Trị (bạn)" chỉ có "Sửa"; các hàng khác có "Đặt lại PIN" | 1040×800 |
| `nhan-vien-ban-dien-thoai.png` | Thẻ "Quản Trị (bạn)" chỉ có "Sửa"; thẻ khác có "Đặt lại PIN" | 390×844 |
| `huy-don-mo-may-tinh.png` | "Việc của tôi": vùng "Huỷ đơn" đang mở, dưới đường ngăn, tách khỏi "Lưu số khách mới" | 1040×800 |
| `huy-don-mo-dien-thoai.png` | Như trên | 390×844 |
| `tour-da-qua-ngay-di-may-tinh.png` | "Việc của tôi": tour đã qua ngày đi — không có nút huỷ, dòng nhắc nhờ văn phòng (bước 6, người thi công) | 1040×800 |

Ảnh chụp khung nhìn sau khi cuộn phần tử cần xem vào giữa màn hình (không phải toàn trang).

## Ký duyệt thị giác

**Chưa ký.** Chủ dự án xem `anh/` rồi ghi tại đây: ngày, ai ký, điểm cần sửa (nếu có).

## Chưa kiểm

- iPhone thật (chạm thật, hộp confirm thật của Safari) — chưa đo; hộp confirm trong kịch bản là hàm thay, không phải hộp gốc.
- Tài khoản Toàn quyền (SUPER_ADMIN) ở `/staff` — chỉ đo Quản trị (ADMIN); máy chủ chặn cả hai (e2e `admin.mjs`), giao diện dùng cùng `isMe`.
- Lý do "Không liên hệ được với khách" chỉ kiểm có mặt/vị trí, không bấm; luồng confirm chỉ bấm "Khách yêu cầu huỷ".
- Chưa có ai khác xem `anh/` hay chạy lại kịch bản.
