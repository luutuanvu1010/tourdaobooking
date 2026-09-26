# Bằng chứng: Bảng tin, hai tài khoản mở cùng lúc (ADR-0022, Task 10, 2026-09-26)

Kịch bản Chrome chính thức cho tiêu chí TD-3, TD-4, TD-6 (và TD-1 về "mỗi trang một kết nối") của Bảng tin: một người thao tác ở tab của mình, người kia thấy
ngay ở tab của họ, **không bấm tải lại**. Đây là bằng chứng hành vi trình duyệt thật (Chrome headless qua CDP) trên `wrangler dev` cục bộ với D1 tạm; `npm test`
và e2e chỉ phủ luật thuần và máy chủ, không phủ DOM.

## Cách kịch bản tránh bẫy "cookie dùng chung"

Các kịch bản Chrome cũ dùng chung một kho cookie nên chỉ mở tài khoản này rồi tài khoản kia lần lượt. Ở đây hai người mở **cùng lúc**: mỗi tài khoản một
**ngữ cảnh trình duyệt riêng** (`Target.createBrowserContext`, kho cookie tách biệt) trong cùng một Chrome. Khẳng định đầu tiên (a0): `/api/auth/me` ở hai ngữ
cảnh trả hai người khác nhau (A = Sales Một, B = Sales Hai, cùng quyền Bán hàng), và đọc lại A sau khi B đã có cookie vẫn ra A.

## Chạy

Từ gốc repo, sau `npm run build:web`, khi không còn `wrangler dev` nào khác đang chạy (mỗi `wrangler dev` mồ côi gây "database is locked"):

```
CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh \
AXE_JS=/private/tmp/tourdao-axe/package/axe.min.js \
ANH_DIR=docs/evidence/2026-09-25-bang-tin/anh \
node docs/evidence/2026-09-25-bang-tin/kich-ban/bang-tin-smoke.mjs
```

- `ANH_DIR`: nơi ghi ảnh (mặc định một thư mục tạm). `AXE_JS`: đường dẫn `axe.min.js` (mặc định `/private/tmp/tourdao-axe/package/axe.min.js`, hoặc bản mới nhất trong `~/.claude/jobs/*/tmp/axe`).
- `KHO=390` hoặc `KHO=1040`: chỉ chạy một khổ (dùng khi thử đột biến); bản chính thức chạy cả hai.
- Thoát 0 khi không có dòng `✗`, thoát 1 nếu có. Không cần mạng (Turnstile tắt như các kịch bản A2 khác). Máy chủ và D1 dựng bởi `startEnv()` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`; kịch bản tự bật một Chrome riêng và tự dọn.

## Kết quả lần chạy chính thức: 36 dòng ✓, 0 dòng ✗ (18 mỗi khổ, hai khổ 390 và 1040)

Mỗi khổ chạy trọn kịch bản với ngữ cảnh và đơn mới. Số đo là của lần chạy chính thức (khoảng cách đo từ lúc máy chủ trả lời thao tác tới lúc thấy kết quả ở tab kia).

| Bước | Chứng minh | Số đo (390 / 1040) |
|---|---|---|
| a0, a1 | Hai ngữ cảnh, hai người khác nhau; A ở `/orders`, B ở `/` | có |
| f1 | Mỗi trang sau đăng nhập mở đúng **một** WebSocket tới `/api/bang-tin` (đếm bằng bọc `WebSocket` chèn trước mã trang), ở 5 trang: A `/orders`, A `/order?id=X`, A `/order?id=Y`, B `/`, B `/order?id=Y` (trang B `/order?id=X` chỉ được kiểm ở `f2`/`f3` chứ không có dòng `f1` riêng) | 1 socket mỗi trang |
| b | B lập đơn X bằng `fetch` trong ngữ cảnh B; dòng mới hiện ở `/orders` của A **dưới 2 giây**, và **không** có thông báo nổi (tin `tao` chỉ làm mới); A nhận đúng tin `thayDoi=tao` | 1030 ms / 1018 ms |
| c0 | A lập đơn Y; đóng dòng `HANDLE` của Y bằng SQL (như `tests/e2e/dispatch.mjs`) → đơn chưa có người; danh sách A đang ghi "Phụ trách: Sales Một" | có |
| c | B bấm **"Nhận phụ trách"** trên `/order?id=Y` → A thấy thông báo nổi "Đơn TD-… vừa có người nhận" (`aria-live=polite`, liên kết `/order?id=Y`) và dòng Y đổi từ "Phụ trách: Sales Một" sang "Phụ trách: Sales Hai", cả hai **dưới 2 giây** | thông báo 559 / 554 ms; danh sách 1072 / 1069 ms |
| c' | B **không** thấy thông báo nổi cho chính việc mình vừa làm (dấu "tab này vừa làm"), trong khi tin `nhan` về Y vẫn tới B (đối chứng: không phải vì tin không tới) | 0 thông báo |
| e0 | Đối chứng axe: chèn cố ý `<img>` không `alt` vào `.toast-vung` → axe thấy `image-alt` và cách so với nền báo là "vi phạm mới trong vùng"; nhờ vậy các dòng axe xanh có giá trị | thấy |
| c2, e1 | B bấm "Xác nhận đơn" Y → A thấy thông báo "đã được xác nhận", huy hiệu Y đổi "Đã xác nhận"; B không thấy thông báo; axe: vùng thông báo nổi không thêm vi phạm | thông báo 509 / 513 ms; huy hiệu 1017 / 1025 ms |
| d1 | A mở hộp "Xem biên nhận" (`.sheet[role=dialog]`) trên đơn nháp X; B xác nhận X → A thấy dải **"Đơn vừa được cập nhật — Tải lại"**, hộp **vẫn mở**, có nút Tải lại, kèm thông báo nổi "đã được xác nhận" | dải 1028 / 1029 ms |
| d2 | A mở bảng "Sửa thông tin chuyến" của Y (đã xác nhận) và **gõ dở** "GHI CHÚ A ĐANG GÕ DỞ 123"; B đổi điểm đón → A thấy dải, bảng **không đóng**, chữ đang gõ **còn nguyên**, **không** thông báo nổi (tin `chuyen`) | dải 1028 / 1031 ms |
| d3 | A đóng bảng, bấm "Tải lại đơn" → dải mất, thấy điểm đón mới "Điểm đón do B đổi" (không tải trang) | có |
| e | axe-core: nền 0 vi phạm sẵn có ở mọi ảnh chụp; khi có thông báo/dải: **0 vi phạm mới**, chạy riêng trên `.toast-vung` và `#error`: 0 vi phạm | 0 / 0 |
| f2, f3 | Cuối kịch bản mỗi trang vẫn đúng 1 socket đang mở, không phát `can-tai-lai` (không nối lại thừa); console không lỗi; không dòng CSP nào bị chặn (kể cả `wss`) | sạch |

Hai lựa chọn dựng kịch bản khác chữ trong phiếu việc, và vì sao:
- **Đơn nhận việc (c) là đơn Y do A lập, không phải đơn X của B.** Người lập cũng là người nhận nên ở đơn X chữ "Phụ trách" trong danh sách không đổi trước/sau — không phân biệt được "đã làm mới" với "chưa làm mới". Ở Y, SQL không phát tin nên A vẫn thấy "Phụ trách: Sales Một" cho tới khi B nhận, rồi chuyển thành "Sales Hai": đổi nhìn thấy được.
- **Bước (d) chia hai (d1 và d2).** Đơn nháp không có bảng sửa chuyến (chỉ đơn đã xác nhận mới có nút "Sửa thông tin chuyến"), mà bảng đó mới có ô để gõ chữ. Nên cú "B xác nhận" kiểm với hộp biên nhận (cùng khuôn `.sheet[role=dialog]`, đơn nháp mở được), còn "chữ đang gõ còn nguyên" kiểm với bảng sửa chuyến trên đơn đã xác nhận, B đổi điểm đón bằng `PUT /api/orders/:id/trip`.

## Đột biến chứng minh kịch bản có thể đỏ (P16)

Viết sau mã, nên chứng minh đỏ bằng sửa cố ý rồi hoàn nguyên (hoàn nguyên bằng `git checkout -- <tệp>`, `git status` sạch, chạy lại xanh):
Cả hai lần chỉ chạy khổ 390 (`KHO=390`):
1. `web/bangtin-logic.ts`: bỏ kiểm `vuaLamBoiTabNay` (`hien(tb)` thẳng) → đỏ đúng hai dòng `(c')` "B thấy thông báo nổi cho việc chính mình làm" và `(c2+e1)` cùng lỗi (16 ✓, 2 ✗), chạy trên kịch bản cuối cùng. (Lần đột biến đầu, trước khi sửa cách nhận diện "trong vùng" của axe, đỏ thêm `(e0)` do lỗi của chính kịch bản lúc mới viết — đối chứng `(e0)` bắt được; đã sửa sang đo bằng DOM `closest('.toast-vung, #error')` và chạy lại đột biến này cho ra kết quả sạch ở trên.)
2. `web/order.ts`: `if (false && sheetOpen())` (làm mới cả khi có bảng mở) → đỏ `(d1)` và `(d2)` (dải không hiện, "hết giờ chờ") và `(d3)` (15 ✓, 3 ✗).

## Ảnh (`anh/`, 12 ảnh, mỗi loại hai khổ 390 và 1040)

| Ảnh | Cho thấy |
|---|---|
| `bang-tin-b-don-moi-hien-ngay-{390,1040}.png` | `/orders` của A ngay sau khi B lập đơn: dòng mới đã hiện, không có thông báo nổi |
| `bang-tin-c-thong-bao-co-nguoi-nhan-{390,1040}.png` | `/orders` của A: thông báo "Đơn … vừa có người nhận" (trên thanh tab ở 390, góc phải trên ở 1040), dòng Y đã xổ ra ghi "Phụ trách: Sales Hai" |
| `bang-tin-c-nguoi-nhan-khong-thay-thong-bao-{390,1040}.png` | màn hình của B sau khi tự nhận: không có thông báo nổi |
| `bang-tin-d-dai-cap-nhat-hop-bien-nhan-{390,1040}.png` | A đang mở hộp biên nhận, hộp còn nguyên khi đơn được B xác nhận (dải nằm sau hộp) |
| `bang-tin-d-dai-cap-nhat-bang-sua-chuyen-{390,1040}.png` | A đang mở bảng sửa chuyến, ô ghi chú còn chữ "GHI CHÚ A ĐANG GÕ DỞ 123" sau khi B đổi đơn |
| `bang-tin-d-dai-hien-sau-khi-dong-bang-{390,1040}.png` | dải "Đơn vừa được cập nhật — Tải lại" nhìn thấy rõ sau khi A đóng bảng (lúc bảng mở, dải nằm sau bảng nên bị che) |

## Điều quan sát khi xem ảnh (không phải lỗi của kịch bản)

- Khi bảng sửa chuyến hoặc hộp biên nhận đang mở, dải "Đơn vừa được cập nhật — Tải lại" nằm **sau** bảng (ở 390 bảng phủ gần kín màn hình), người dùng chỉ thấy dải sau khi đóng bảng. Đặc tả TD-3 chỉ nói "chỉ hiện dải" và không nói vị trí; kịch bản khẳng định đúng điều TD-3 nói (bảng không đóng, chữ còn nguyên) nhưng KHÔNG phán đây có phải khiếm khuyết hay không: mục đích của dải là báo cho A mà không phá bảng, và một dải A không thấy được thì chưa đạt mục đích đó. Chủ/điều phối quyết có cần báo trên chính bảng hoặc thông báo nổi khi có bảng mở. Dải có `role="alert"` nhưng nằm trong phần nền `inert` của bảng: chưa kiểm trình đọc màn hình có đọc dải đó không.

## Chưa kiểm

- **iPhone Safari thật** (kể cả qua mạng LAN hoặc production, khoá màn hình rồi mở lại TD-7, chạy nền của PWA): Task 13. Chrome headless không thay được hành vi WebSocket của Safari iOS.
- **Mất mạng thật** (rớt Wi-Fi, chuyển 4G, máy ngủ): kịch bản không cắt mạng; nối lại và `can-tai-lai` chỉ kiểm ở mức đơn vị và ở smoke tạm Task 8 (`visibilitychange`), không có trong kịch bản chính thức này (`f2` chỉ khẳng định KHÔNG nối lại thừa khi mạng ổn).
- **Không đo** production / Cloudflare thật (Durable Object thật, độ trễ thật): chỉ `wrangler dev` cục bộ; số mili giây ở trên là trên máy cục bộ, không phải số thật của production. Độ trễ ~1 giây chủ yếu là bộ gộp 1 giây của client (GOP_MS) và hoãn 500 ms của thông báo nổi.
- Chỉ thử hai tài khoản Bán hàng; Trang chủ của B chỉ mở chứ không đọc số liệu (làm mới Trang chủ đã có ở smoke tạm Task 9 và kịch bản Trang chủ, không lặp ở đây). Các loại tin `giao`, `huy`, `tao_cho_nhan` chưa có ca Chrome riêng ở đây (đã có e2e phía máy chủ và test thuần).
- axe chỉ kiểm khi vùng thông báo/dải đang hiện trên các trang này, khổ 390 và 1040, không thay cho rà soát trình đọc màn hình thật.
- Kịch bản `v1-dang-nhap.mjs` (TD-5, CSP) không chạy lại trong task này; ở đây chỉ khẳng định không có lỗi CSP/`wss` trong console của các trang đã mở.
