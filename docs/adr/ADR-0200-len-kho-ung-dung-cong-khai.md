# ADR-0200 — Đưa Nền tảng lên App Store và CH Play ở dạng công khai

- **Trạng thái:** **proposed** — AI soạn 13/11/2026, chờ chủ dự án duyệt (Hiến pháp N3). Không tự duyệt.
  - 13/11: chủ **chốt hai lựa chọn** Đ5 = (a) và Đ6 = (a), nguyên văn «Theo khuyến nghị» (chuyển qua phiên điều phối «Audit giao diện»).
    Đây **chưa** phải lời duyệt toàn bộ ADR. Đ4 vẫn bị chặn bởi HC-5.19 (chủ chưa gia hạn).
- **Số:** 0200 kiểm 13/11 trên mọi nhánh cục bộ (`main` dừng ở 0198): số lớn nhất đang dùng là 0199 (hai ADR khác nhau cùng mang 0199 ở hai nhánh chưa
  gộp: «chi tiết dịch vụ» và «văn phòng nhập tiền cọc»). Ai gộp sau mà trùng thì đổi số.
- **Ngày:** 2026-11-13.
- **Loại:** việc lớn (quyền, dữ liệu, triển khai, pháp lý). **Cửa một chiều** ở phần tài khoản nhà phát triển, tên trên kho và cam kết với hai kho;
  **hai chiều** ở phần mã (vỏ mỏng, gỡ được).
- **Lời chủ đã có:** «Công khai» (13/11, kế hoạch `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 8);
  «Làm cả hai» (13/11, cho soạn ADR này song song bước 1 sửa khung chung).
- **Đầu vào:** tờ phương án `docs/superpowers/specs/2026-11-13-len-kho-ung-dung-phuong-an.md`; báo cáo bước 0
  `docs/superpowers/specs/2026-11-13-kiem-giao-dien/BAO-CAO.md` và `PHAT-HIEN.md` (nhánh `claude/reverent-kilby-7333f6`): năm điểm chặn kho K1–K5.
- **Quan hệ với ADR cũ:** xây trên ADR-0126 (chính sách quyền riêng tư có phiên bản, phiếu yêu cầu xoá, ẩn danh hoá) — **không sửa** điều nào của
  ADR-0126; ADR-0035 (khung nằm sẵn trên máy) và ADR-0016 (Face ID) giữ nguyên.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu; mục HIGH trong `docs/quyen-hoan.json`, hạn hiện ghi 2026-12-31). Đ4 thêm một đường
  kích hoạt ẩn danh hoá (cửa một chiều trên D1) lên đúng lỗ này, như ADR-0126 đã ghi. **Không được duyệt Đ4** trước khi HC-5.19 được đóng hoặc chủ ghi
  lời gia hạn / cho phép xây trên lỗ cho riêng ADR này. `TNV-G1` (tiền đơn huỷ) chỉ chạm sát (Đ4 giữ đơn và sổ tiền); `HC-4.2` không chạm.

## Bối cảnh

Nền tảng là PWA (Worker Cloudflare, giao diện TypeScript thuần), cài từ trình duyệt. Chủ muốn có mặt trên hai kho, **công khai**. Người dùng là
khoảng 30 nhân viên và khoảng 1.000 đối tác; mọi tài khoản do công ty tạo, không có tự đăng ký; phải đăng nhập mới dùng được.
Bước 0 thấy năm điểm chặn: K1 thiếu trang chính sách quyền riêng tư và trang hỗ trợ công khai; K2 màn Đăng nhập không giới thiệu, chưa có tài khoản
thử cho người duyệt; K3 tên có ba kiểu; K4 thiếu biểu tượng Android cắt tròn, thiếu `id` trong tệp khai báo, không có màn chờ; K5 chưa có lối xin xoá
tài khoản và địa chỉ web cho việc này.

**Rủi ro đã nói với chủ một lần (P18):** Apple hay từ chối ứng dụng công khai mà chỉ người có tài khoản do công ty cấp dùng được (điều 3.2), và
từ chối ứng dụng chỉ là trang web bọc lại (điều 4.2). Chủ đã nghe và chọn công khai; ADR này giảm rủi ro và giữ đường lùi.

## Quyết định

Bảy điều. Điều 3, 4, 5 **chạm quyền / dữ liệu** (đúng trần 3 mỗi lượt duyệt, CLAUDE.md §9); trang ghép ở cuối tệp.

**Đ1 — Cách đóng gói: một Nền tảng web, hai vỏ mỏng nạp từ `https://booking.tourdao.vn`.**
- Android: **TWA** (đóng PWA thành ứng dụng Android, chạy bằng Chrome của máy), dựng bằng công cụ Bubblewrap; chứng minh tên miền bằng tệp
  `/.well-known/assetlinks.json`.
- iPhone: **vỏ Capacitor** nạp trang từ xa (cấu hình địa chỉ máy chủ), **không** chép trang vào máy. Lý do: chép vào máy thì địa chỉ gốc thành
  `capacitor://…`, máy chủ chặn mọi lệnh ghi (kiểm `Origin` cùng site) và cookie phiên hỏng.
- Mỗi lần triển khai web là hai ứng dụng tự có bản mới; chỉ khi đổi phần vỏ mới nộp duyệt lại.
- Mã vỏ nằm ở thư mục riêng `native/` với `package.json` riêng; **không** vào gói Worker hay `public/`. Ràng buộc «không có dependency runtime» của
  Worker giữ nguyên; thư viện của vỏ chỉ dùng lúc dựng vỏ. Khoá ký Android, chứng chỉ Apple **chủ giữ**, không vào kho (N10).

**Đ2 — Thứ tự phát hành và đường lùi.** CH Play trước (rủi ro duyệt thấp). App Store sau khi thử xong sáu rủi ro ở mục «Hệ quả». Nộp App Store
công khai; nếu Apple từ chối theo 3.2 thì **chuyển App Store sang phát hành không công khai** (Unlisted), CH Play vẫn công khai — đổi bằng một yêu cầu
với Apple, không đổi mã. Để giảm rủi ro 4.2, vỏ iPhone có ba chức năng gốc: màn chờ và biểu tượng gốc; **bảng chia sẻ gốc** cho ảnh biên nhận;
**máy ảnh** quét vé xin quyền theo cách của iOS. Thông báo đẩy **không** thuộc ADR này (cần máy chủ gửi, chạm dữ liệu ⇒ ADR riêng nếu Apple đòi).

**Đ3 (chạm quyền) — Ba trang công khai, không cần đăng nhập.**
- **Chính sách quyền riêng tư:** hiện **đúng phiên bản đang hiệu lực** trong `pty_privacy_policy` (ADR-0126 điều 1) — một nguồn, không chép tay ra tệp
  tĩnh. Cần **một route đọc mới** khai `access: "public"`, chỉ trả phiên bản, ngày hiệu lực, thân chính sách; không trả `created_by`, không dữ liệu cá nhân.
  Chưa có phiên bản nào thì trang ghi «đang cập nhật» (không lỗi).
- **Hỗ trợ:** trang tĩnh: Nền tảng là gì, dành cho ai, cách xin tài khoản, số hotline và email hỗ trợ công khai (lấy từ hồ sơ công ty chủ như chân
  trang Đăng nhập — đã là dữ liệu công khai).
- **Xin xoá tài khoản (bản web):** trang tĩnh hướng dẫn hai đường: trong Nền tảng (Đ4) hoặc gọi / gửi email hỗ trợ. **Không** có biểu mẫu gửi khi chưa
  đăng nhập (tránh mở lệnh ghi công khai).
- Màn Đăng nhập thêm một câu giới thiệu, liên kết ba trang này và «Chưa có tài khoản? Liên hệ…» (giải K1, K2 phần giới thiệu).

**Đ4 (chạm dữ liệu) — Xin xoá tài khoản trong Nền tảng, dựng trên phiếu của ADR-0126.**
- Trang Tôi thêm lối «Xin xoá tài khoản» (chữ nút chờ chủ chọn theo bảng tham chiếu — z34, `cho-chon`). Bấm thì tạo một phiếu `pty_erasure_request`
  loại **xoá tài khoản**, bằng đúng quyền `party.erasure.request` sẵn có (ô «của mình»).
- Người xử lý như ADR-0126 điều 2 (`party.erasure.process`: Quản trị theo cấp bậc, Toàn quyền), trong thời hạn chính sách, cùng các chặn tách nhiệm sẵn
  có của `xetXuLyPhieuXoa` (người gửi không tự xử lý phiếu của mình, cấp bậc, hồ sơ công ty chủ, phiếu đang bận).
- Thực hiện phiếu xoá tài khoản là **một lệnh MỚI**: ngưng tài khoản + đăng xuất mọi máy + ẩn danh hoá (ADR-0126 điều 3) **trong một lô**. Route thực hiện
  phiếu hiện có chỉ ẩn danh, không ngưng tài khoản; đường ngưng tài khoản hiện có là route khác. **Không xoá cứng**; phần phải giữ theo luật (đơn, sổ
  tiền, nhật ký) giữ đúng ADR-0126 điều 4 và phiếu trả lời liệt kê.
- **Luật phải thêm (chưa có trong mã):** từ chối khi tài khoản là **Quản trị đang hoạt động cuối cùng** hoặc **Toàn quyền đang hoạt động cuối cùng**
  (luật sẵn có chỉ chặn Quản trị cuối cùng, và chỉ ở route sửa tài khoản); hồ sơ công ty chủ vẫn bị chặn như nay.
- **Đối tác còn nợ Trả sau:** đường ngưng hiện chặn bằng `con_no_tra_sau`. Đề xuất: phiếu xoá tài khoản cũng bị chặn tới khi hết nợ, phiếu trả lời
  ghi lý do bằng tiếng Việt (chủ chọn khác thì sửa ở đặc tả lát 3).
- **Số điện thoại đăng nhập** (`staff.phone`) của tài khoản đã ngưng **vẫn giữ** theo ADR-0126 điều 9. Hai kho thường hiểu «xoá tài khoản» là xoá cả dữ liệu
  định danh; nếu chủ muốn bỏ số này thì cần **ADR mới** (không sửa ADR-0126). Đưa điểm này vào danh sách luật sư xem, trước khi khai nhãn quyền riêng tư.
- Thay đổi dữ liệu cần thiết: **thêm một cột loại phiếu** vào `pty_erasure_request` (bảng hiện không có cột loại; migration mới, expand), rà các trigger
  khoá nội dung và một chiều của bảng (`erasure_content`, `erasure_status_one_way`); chi tiết ở đặc tả lát 3.

**Đ5 (chạm quyền / tài khoản) — Tài khoản thử cho người duyệt của kho.**
- **Một** tài khoản trên **bản chính thức**, mang quyền **Đối tác**, gắn một hồ sơ đối tác giả «Đối tác thử nghiệm của kho ứng dụng» (theo lựa chọn (a)
  dưới đây; bản soạn đầu đề xuất thêm một tài khoản Bán hàng). Không cấp Bán hàng, Kế toán, Quản trị, Toàn quyền, Nhân sự.
- Tài khoản **ngưng sẵn**; chỉ mở trong lúc một bản đang chờ duyệt, ngưng lại ngay khi kho trả kết quả. Mỗi lần mở / ngưng có dòng nhật ký.
- Tài khoản Bán hàng thử **thấy được đơn thật** (Bán hàng xem mọi đơn theo bảng quyền hiện hành). ⇒ **Chủ phải chọn** một trong hai: (a) chỉ cấp tài
  khoản Đối tác thử (an toàn, người duyệt chỉ thấy đơn của chính nó); (b) cấp cả Bán hàng thử và chấp nhận người duyệt thấy đơn thật trong vài ngày.
  **Chủ chọn (a) ngày 13/11** («Theo khuyến nghị»): chỉ cấp tài khoản Đối tác thử; không có tài khoản Bán hàng thử. Người duyệt vẫn lập được đơn, và đơn đó là đơn thật trong sổ của bản chính thức (không xoá cứng): runbook lát 4 ghi cách nhận ra
  (hồ sơ đối tác giả) và huỷ các đơn đó sau mỗi lần duyệt. Không dùng bản Development (ADR-0162) cho người duyệt: vỏ ứng dụng nạp bản chính thức.
- PIN của tài khoản thử: chủ tự đặt và tự điền vào khai báo nộp kho; AI không đặt, không biết.

**Đ6 — Một tên.** Tên trên kho, tên dưới biểu tượng, tên ở thanh trên và màn Đăng nhập là **một**. Chủ chọn:
(a) **«Island Booking System»**, tên ngắn «Island Booking» — giữ quyết định đổi tên 24/9; trên kho, dòng «nhà phát triển» tự hiện «Công ty TNHH Tour Đảo»;
(b) «Tour Đảo Booking». **Chủ chọn (a) ngày 13/11** («Theo khuyến nghị»): «Island Booking System», tên ngắn «Island Booking». Màn Đăng nhập đổi tiêu đề theo tên chọn; tên Worker / D1 `tourdao-sales` không đổi.

**Đ7 — Bề mặt ứng dụng.** Tệp khai báo thêm `id`, biểu tượng loại «maskable» (vùng an toàn của Android), màn chờ khi mở cho iPhone (khổ theo máy) và
màn chờ của TWA; nguồn biểu tượng vẫn là logo hiện có (`docs/PWA-IPHONE.md` mục «Dựng lại icon»). Không làm chế độ tối.

## Lý do

Một mã nguồn web giữ nguyên cách làm và hàng rào hiện có; hai vỏ mỏng gỡ được. TWA là cách Google chấp nhận cho PWA. Capacitor nạp từ xa giữ cùng địa chỉ
gốc nên đăng nhập, Face ID, kiểm `Origin` không đổi. Ba trang công khai và tài khoản thử là điều kiện của cả hai kho; dựng trên dữ liệu và quyền sẵn có
(ADR-0126) để không đẻ luồng song song.

## Phương án bị loại

- **Chưa lên kho, giữ PWA** (phương án A của tờ phương án): chủ đã chọn công khai.
- **Chỉ CH Play** (B): thiếu iPhone, mà đa số nhân viên dùng iPhone.
- **App Store không công khai ngay từ đầu:** chủ chọn công khai; giữ làm đường lùi (Đ2).
- **Viết lại thành ứng dụng gốc (React Native, Flutter):** trái ràng buộc không thư viện chạy, viết lại hơn 120 tệp giao diện.
- **Vỏ iOS chép trang vào máy:** hỏng kiểm `Origin` và cookie (Đ1).
- **Biểu mẫu xin xoá tài khoản không cần đăng nhập:** mở lệnh ghi công khai, dễ bị phá; dùng hướng dẫn + liên hệ thay.

## Hệ quả

**Sáu rủi ro phải thử trên máy thật trước khi nộp App Store (chưa thử cái nào):**
1. Face ID (passkey) trong vỏ iOS cần khai «associated domains» và tệp `/.well-known/apple-app-site-association`; `PASSKEY_RP_ID` giữ nguyên.
2. Turnstile ở Đăng nhập chạy trong WKWebView.
3. Service worker trong WKWebView chỉ chạy khi khai «App-Bound Domains»; không chạy thì khung không nằm sẵn trên máy (ADR-0035 kém hiệu lực trong vỏ iOS).
4. Máy ảnh quét vé trong vỏ.
5. Workers Assets có tải lên và phục vụ thư mục `/.well-known/` không, với đúng kiểu `application/json` cho cả `assetlinks.json` lẫn
   `apple-app-site-association` (tệp Apple không có đuôi `.json` nên có lẽ phải khai kiểu trong `public/_headers`; hiện tệp này chưa có dòng nào cho
   `/.well-known/`). `run_worker_first` của `wrangler.jsonc` không gồm `/.well-known/*`, nên hai tệp do Assets phục vụ.
6. Cookie phiên trong vỏ tách khỏi Safari: người dùng đăng nhập lại một lần khi cài.

**Lát thi công (mỗi lát một nhánh, việc lớn có người kiểm độc lập):** L1 Đ6 + Đ7 + trang Hỗ trợ và trang hướng dẫn xoá (không chạm dữ liệu) →
L2 trang chính sách công khai (Đ3, route mới) → L3 xin xoá tài khoản (Đ4, migration) → L4 tài khoản thử (Đ5, chủ tự tạo trên bản chính thức theo runbook)
→ L5 TWA, thử kín trên CH Play → L6 vỏ iPhone, thử sáu rủi ro, nộp App Store.

**Việc của chủ (AI không làm):** tra / xin số D-U-N-S cho Công ty TNHH Tour Đảo; đăng ký Apple Developer Program dạng tổ chức (99 USD/năm) và tài khoản
Google Play dạng tổ chức (phí một lần, chưa kiểm lại con số); chọn tên (Đ6) và chữ nút «Xin xoá tài khoản»; **luật sư xem** chính sách quyền riêng tư,
thời hạn xử lý phiếu xoá (đã là điều kiện chặn của ADR-0126) và phần khai «nhãn quyền riêng tư» (App Store) / «An toàn dữ liệu» (Google Play); chọn
email hỗ trợ công khai; tạo và đặt PIN tài khoản thử; có một máy Android để thử; duyệt ảnh giới thiệu trên kho.

**Nợ mở:** thông báo đẩy (ADR riêng nếu cần); iPad (ứng dụng iPhone chạy trên iPad ở khổ điện thoại tới khi bước 2 làm bố cục iPad); khoá phóng to
(bước 0 N1, chủ quyết riêng) có thể bị người duyệt chấm trợ năng.

## Tiêu chí nghiệm thu (P20)

1. Mở `/chinh-sach-rieng-tu` (tên đường dẫn chốt ở đặc tả) khi chưa đăng nhập: thấy đúng phiên bản đang hiệu lực; đăng phiên bản mới thì trang đổi theo;
   phản hồi không chứa mã người đăng hay dữ liệu cá nhân (bài kiểm khoá danh sách trường).
2. Route GET công khai mới được khoá trong `src/route-access.test.ts`; tập route GHI công khai không đổi (`src/lan-gui-phu-route.test.ts`).
3. Tài khoản Bán hàng bấm «Xin xoá tài khoản» → có phiếu; người không có `party.erasure.process` không xử lý được; thực hiện xong thì tài khoản bị ngưng,
   đăng nhập lại bị từ chối, hồ sơ ẩn danh theo ADR-0126, đơn và sổ tiền vẫn còn. Quản trị / Toàn quyền đang hoạt động cuối cùng và đối tác còn nợ
   Trả sau: bị từ chối bằng câu tiếng Việt. Phiên đang «Xem như vai trò khác» gửi phiếu xoá tài khoản: máy chủ từ chối (bài chặn, đã thấy đỏ khi bỏ chặn — P16).
4. Tài khoản Đối tác thử chỉ thấy đơn của chính nó (bài quyền sẵn có chạy với tài khoản này); khi ngưng thì không đăng nhập được.
5. Một tên ở mọi chỗ: bài `pwa.mjs` đối chiếu tên trong tệp khai báo, thẻ meta, thanh trên, màn Đăng nhập.
6. Tệp khai báo có `id` và biểu tượng «maskable»; mở từ màn hình chính iPhone không còn màn trắng.
7. `/.well-known/assetlinks.json` và `/.well-known/apple-app-site-association` trả `application/json`, không qua service worker; TWA mở không hiện
   thanh địa chỉ.

---

## Trang ghép (CLAUDE.md §9 — lượt duyệt có Đ3, Đ4, Đ5 chạm quyền / dữ liệu)

**(1) Bảng chạm tới chứa loại thực thể nào**

| Bảng | Loại thực thể hôm nay | Thêm gì |
|---|---|---|
| `pty_privacy_policy` | Phiên bản chính sách (văn bản của công ty, không dữ liệu cá nhân trừ `created_by`) | Không thêm dòng mới; thêm **một đường đọc công khai** |
| `pty_erasure_request` | Phiếu yêu cầu xoá dữ liệu cá nhân của nhân viên, đối tác (ADR-0126) | Thêm loại phiếu **xoá tài khoản** |
| `staff`, `stf_permission` | Tài khoản nhân viên và đối tác, quyền | Một tài khoản Đối tác thử (Đ5, chủ chọn (a)), ở trạng thái ngưng phần lớn thời gian |
| `pty_party`, `pty_party_role` | Hồ sơ người, tổ chức, vai | Một hồ sơ đối tác giả cho tài khoản thử; hồ sơ bị ẩn danh khi phiếu xoá tài khoản thực hiện |

**(2) Dòng bản đồ quyền chạm các bảng này áp cho loại nào**

| Thao tác | Ai (hiện hành, không đổi) | Áp cho loại mới thế nào |
|---|---|---|
| `party.privacy.policy` | Toàn quyền đăng phiên bản | Không đổi; trang công khai chỉ đọc |
| `party.erasure.request` | Mọi tài khoản, «của mình» | Cũng tạo được phiếu xoá tài khoản — **chỉ cho chính mình** |
| `party.erasure.process` | Quản trị (theo cấp bậc), Toàn quyền | Xử lý cả phiếu xoá tài khoản; luật cấp bậc giữ nguyên (Quản trị không xử lý phiếu của cấp trên) |
| Ngưng / mở tài khoản | Người quản lý tài khoản hiện hành (Nhân sự, Quản trị theo cấp bậc, Toàn quyền) | Dùng cho tài khoản thử; không thêm quyền mới |
| Bảng quyền Đối tác | Như hiện hành | Tài khoản thử nhận đúng bộ quyền Đối tác, không ngoại lệ |

**(3) Cổng nào canh cửa nào (kể cả chỗ giao diện ẩn / hiện)**

| Cửa | Cổng máy chủ | Chỗ giao diện ẩn / hiện bị đổi nghĩa |
|---|---|---|
| Đọc chính sách công khai | Route mới `access: "public"`, chỉ GET, danh sách trường khoá bằng bài kiểm | Liên kết trên màn Đăng nhập luôn hiện (không theo quyền) |
| Tạo phiếu xoá tài khoản | `can(staff, "party.erasure.request")` ngữ cảnh «của mình»; máy chủ lấy người xin từ phiên, không tin mã gửi lên | Lối «Xin xoá tài khoản» ở trang Tôi hiện cho mọi tài khoản đã đăng nhập; **ẩn** khi đang «Xem như vai trò khác» (ADR-0180), và **máy chủ từ chối** phiếu xoá tài khoản khi phiên đang đóng vai — ADR-0180 cho ghi lúc đóng vai và dữ liệu ghi gắn tài khoản Toàn quyền thật, nên không chặn thì Toàn quyền tự xin xoá chính mình nhầm |
| Thực hiện phiếu xoá tài khoản | `can(staff, "party.erasure.process")` + luật cấp bậc + chặn Toàn quyền cuối cùng / hồ sơ công ty chủ | Nút xử lý chỉ hiện với người có quyền, qua `can()` (không hỏi mã quyền thô) |
| Đăng nhập tài khoản thử | Cổng đăng nhập hiện hành (tài khoản ngưng thì từ chối) | Không có chỗ giao diện riêng |

**Chỗ dễ thành lỗ khi ghép:** phiếu xoá tài khoản + «Xem như vai trò khác» (ADR-0180 đã cho ghi ⇒ chặn ở cả giao diện lẫn máy chủ, như bảng trên);
lệnh thực hiện mới (ngưng + ẩn danh) đi vòng qua luật «Quản trị cuối cùng» vốn chỉ nằm ở route sửa tài khoản ⇒ phải thêm luật vào lệnh mới;
tài khoản Bán hàng thử sẽ thấy đơn thật (đã tránh: chủ chọn Đ5(a), chỉ Đối tác thử); route công khai mới thêm vào nhóm route `public` đang đọc D1 (`GET /api/company`, `GET /ve/:token`,
cấu hình đăng nhập, tệp giao diện) — người kiểm phải đọc danh sách trường trả về.
