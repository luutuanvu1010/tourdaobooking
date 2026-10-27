---- BẮT ĐẦU ----

# Đề bài: đánh giá toàn bộ trải nghiệm và thiết kế lại giao diện Nền tảng Island Booking System

Ngày lập: 27/10/2026. Người quyết định cuối: chủ dự án. Phiên này mở trong thư mục `tourdao-sales`.

## 1. Vai của bạn

Bạn là chuyên gia hàng đầu về trải nghiệm và giao diện người dùng (UX/UI) cho phần mềm quản trị doanh nghiệp dạng SaaS/ERP, từng dẫn dắt thiết kế ở cấp độ Oracle Fusion (Redwood), SAP Fiori, NetSuite. Bạn đánh giá bằng tiêu chuẩn của phần mềm mà hàng trăm người dùng mỗi ngày phải tin được: nhất quán, đoán trước được, ít lỗi vặt, dùng được bằng ngón cái lẫn bằng chuột và bàn phím.

Trong phiên này bạn giữ vai **lập kế hoạch và đặc tả** (một phiên một vai, luật P15 ở `CLAUDE.md` §3; người đánh giá không thi công): đọc, chạy thử, đo, đánh giá, viết báo cáo và viết đề bài cho Claude Design. **Không viết hay sửa mã sản phẩm**, không sửa `public/app.css`, không đổi luật. Thi công là việc của phiên khác, sau khi chủ dự án duyệt.

## 2. Sản phẩm và vì sao làm việc này

- Nền tảng **"Island Booking System"** (tên chính thức, chủ chốt 27/10/2026; tên gọi quen là "Tour Đảo Booking", kho mã `tourdao-sales`) là CRM nội bộ của Công ty TNHH Tour Đảo (Nha Trang): lập đơn dịch vụ tour, xác nhận đơn, điều phối xe, công nợ, hoa hồng đối tác, hồ sơ khách và đại lý, tài khoản, hỗ trợ. Chạy thật tại `https://booking.tourdao.vn` trên Cloudflare Worker + D1. Là trang web nên dùng được trên mọi thiết bị, và cài lên iPhone như một ứng dụng (PWA). Gọi nó là "Nền tảng" hoặc "Island Booking System", không gọi "App".
- Khoảng 45 trang (danh sách chuẩn: `PAGES` ở `src/shared/sw-policy.ts`), 15 vai trên 10 quyền (`src/shared/roles.ts`, `src/shared/permissions.ts`), một khung điều hướng chung (`web/shell.ts`; mục khai một nơi ở `src/shared/muc-giao-dien.ts`). Giao diện là HTML tĩnh + TypeScript thuần, không framework. Mọi giá trị thiết kế nằm trong một tệp `public/app.css` (gần 470 token trong `:root`), chỉ có giao diện sáng. Chữ mặc định là Be Vietnam Pro, nhưng chủ có thể đổi sang Nunito, Lexend hay Noto Sans qua màn Giao diện công ty (ADR-0087), nên thiết kế phải chịu được cả bốn phông.
- Quy mô: khoảng 30 nhân viên và tới khoảng 1.000 tài khoản ngoài (cộng tác viên, hướng dẫn viên, công ty du lịch), thí điểm 5 cộng tác viên trước (`docs/AUDIT-2026-09-22-DOI-TAC.md`). Chủ dự án **chuẩn bị ra mắt cho hàng trăm người**: giao diện phải chuẩn mực trên cả trình duyệt máy tính lẫn điện thoại (trình duyệt và bản cài).
- **Mọi vai quan trọng như nhau.** Không ưu tiên vai nào khi chấm; thứ tự ở mục 6.3 chỉ là thứ tự làm.
- Từ tháng 9/2026, giao diện được vẽ **từng màn qua hơn mười đợt Claude Design riêng lẻ** (xem `docs/design/` và `docs/superpowers/specs/`), mỗi đợt mang theo một bộ "hệ thống thiết kế" xuất riêng. Giả thuyết cần kiểm chứng, không được mặc định đúng: từng màn có thể ổn, nhưng cả Nền tảng chưa nói cùng một ngôn ngữ thiết kế, rõ nhất ở máy tính.
- Chủ dự án đã chốt ngày 27/10/2026: (1) **mở hết**: ba màn vừa vẽ lại trong tháng 10 (Tạo đơn, Hoa hồng + Hỗ trợ, Sổ công nợ) cũng được đánh giá và đề xuất lại như mọi trang khác; nhưng "đề xuất lại" không có nghĩa "phải vẽ lại": trang nào đạt chuẩn thì giữ và nói rõ vì sao; (2) chạy thử **trên máy với dữ liệu tạm**, không chạm dữ liệu thật; (3) đề bài cho Claude Design chia thành **một đề bài khung chung cộng mỗi họ màn một đề bài**, không vẽ từng trang, không gộp một đề bài cho tất cả; (4) khi chạy thử trên máy, **được đọc Google Sheet dịch vụ thật ở chế độ chỉ đọc** (tên và giá dịch vụ đã công khai trên tourdao.vn), còn khách, đối tác, nhân viên, đơn, công nợ vẫn phải là dữ liệu giả; (5) **"Island Booking System" là tên riêng chính thức** của Nền tảng: không chấm nó là chữ Anh lộ ra, không đề xuất đổi tên; (6) chấm và vẽ biến thể **theo 10 bộ quyền**, không theo 15 vai, vì giao diện chỉ đổi theo quyền; `KIEM-KE.md` phải có bảng "vai nào gộp vào bộ nào" và chỉ kiểm thêm những chỗ hiện tên vai.

## 3. Bốn tiêu chí của chủ dự án (thứ tự ưu tiên)

1. Dễ nhìn. 2. Gọn mắt. 3. Đúng phong cách phần mềm quản trị chuyên nghiệp. 4. Đơn giản, nhìn là hiểu ngay.

Mọi phát hiện và đề xuất đều phải chỉ ra nó phục vụ tiêu chí nào.

## 4. Thước đo "chuẩn mực"

Lấy **Oracle Redwood** (hệ thống thiết kế của Oracle Fusion Cloud) làm thước đo về **mẫu và kỷ luật**, không phải về màu hay phông. Thương hiệu, màu, chữ của Tour Đảo giữ nguyên theo token. Mười mặt phải chấm, mặt nào cũng chấm cho cả điện thoại lẫn máy tính:

1. **Mô hình điều hướng và kiến trúc thông tin**: một cách đi lại duy nhất; người dùng luôn biết mình đang ở đâu và về đâu; mục hiện đúng theo vai; đường vào việc hằng ngày không quá 2 chạm.
2. **Mẫu trang**: mỗi họ màn (danh sách, chi tiết, biểu mẫu, bảng điều khiển, thiết lập) có đúng một khuôn: đầu trang, vùng hành động chính, thân, chân dính. Hành động chính luôn ở cùng một chỗ.
3. **Danh sách và bảng**: mật độ hợp lý cho người làm việc cả ngày; số canh phải và đều cột; lọc, tìm, sắp xếp, phân trang cùng một kiểu; hành động theo dòng ở cùng một chỗ; trạng thái rỗng có hướng dẫn.
4. **Biểu mẫu**: nhóm trường có tiêu đề; nhãn luôn thấy; bắt buộc và tuỳ chọn rõ; báo lỗi ngay tại ô kèm cách sửa; một nút chính duy nhất; không mất dữ liệu khi lỗi mạng.
5. **Từ vựng trạng thái**: cùng một trạng thái (chờ xác nhận, đã xác nhận, đã huỷ, quá hạn...) hiện cùng một chữ, màu, hình ở mọi trang; không chỉ dựa vào màu.
6. **Phản hồi hành động**: xác nhận trước hành động một chiều; báo xong ngắn, không che việc; lỗi nói chuyện gì xảy ra và làm gì tiếp; có đường lui.
7. **Thang nút và thứ bậc thị giác**: ba cấp nút (chính, phụ, lối nhỏ) dùng nhất quán; không quá một nút chính mỗi vùng; cỡ chữ, độ đậm, khoảng cách theo thang token.
8. **Đáp ứng theo thiết bị**: cùng một việc làm được trên 390 và 1040 với cùng từ vựng; điện thoại dùng ngón cái (vùng chạm từ 44px, thanh dính, bảng trượt), máy tính dùng được bàn phím và chuột (Tab, phím tắt; rê chuột không bắt buộc); không tràn ngang, không cắt chữ.
9. **Tiếp cận**: tương phản WCAG AA, focus thấy rõ, trình đọc màn hình đọc được nhãn và trạng thái, axe không lỗi nghiêm trọng.
10. **Ngôn ngữ**: tiếng Việt có dấu, một thuật ngữ cho một khái niệm (`docs/SYSTEM-DESIGN.md` §15), không lộ mã, không chữ Anh ngoài tên riêng ("Island Booking System", "Harbour", "Vinwonders"...).

Thêm hai câu hỏi xuyên suốt: *người mới (cộng tác viên ngoài, chưa ai hướng dẫn) mở lần đầu có tự làm được việc chính của vai mình không?* và *người làm cả ngày (bán hàng, kế toán) có bị tốn chạm, tốn cuộn thừa không?*

## 5. Ràng buộc cứng: không vi phạm, không đề xuất vượt

Đề xuất nào cần vượt một dòng dưới đây thì ghi riêng thành "cần ADR hoặc chủ quyết", không đưa vào thiết kế mặc định.

- **Không React, không framework, không dependency runtime** (`CLAUDE.md`, `docs/SPEC-tourdao-sales.md`). Thiết kế phải thi công được bằng HTML + CSS + TypeScript thuần; DOM dựng bằng `h()` ở `web/dom.ts`, không `innerHTML`.
- **Token là nguồn sự thật**: mọi giá trị thiết kế phải là token trong `:root` của `public/app.css`; cả nhóm "Bản sao từ `tourdaovn`" ở đầu `:root` (màu `--c-*`, khoảng cách, bo góc, bóng, phông) **không đổi giá trị**; màu, phông, cỡ mới phải đánh dấu MỚI và chờ chủ duyệt (`web/CLAUDE.md`). Màn "Giao diện công ty" (ADR-0087) cho chủ đổi màu và phông qua biến CSS, nên thiết kế không được viết cứng màu ở bất kỳ đâu.
- **Chỉ giao diện sáng.** Không đề xuất chế độ tối.
- **Quyền**: giao diện chỉ ẩn hoặc hiện theo `can(staff, "<thao tác>")`; không thay đổi ai được làm gì; mục điều hướng hiện khi và chỉ khi trang mở được. Thanh bên có trần 10 mục hiện sẵn.
- **Không đổi luật nghiệp vụ, hợp đồng API, dữ liệu, cách tính tiền.** Phát hiện nào kéo theo đổi dữ liệu, quyền, tiền hay hợp đồng thì DỪNG phần đó và gom vào câu hỏi cho chủ (`CLAUDE.md` §3).
- **Ô gõ 16px**; `theme_color` của manifest bằng `--c-status-bar`; `/api/*` không vào cache; gói `web/orders.ts` không quá 96.000 byte; trang mới phải "đủ bộ" theo `docs/CHANGE-GUIDE.md` công thức c.
- **Hiến chương** (`docs/ARCHITECTURE.md` Phần I) và ADR đã duyệt đứng trên mọi đề xuất bề mặt. Đề xuất đổi mô hình điều hướng hay mẫu trang đã có ADR thì phải trỏ tới ADR đó và ghi "cần ADR mới".
- **Hồ sơ có ngày không sửa** (`docs/design/*`, `docs/evidence/*`, đặc tả đã duyệt): có gì mới thì viết bản mới trỏ về bản cũ.

## 6. Chặng 1: Đánh giá (phiên này làm)

### 6.1 Đọc trước (đúng mục, không nạp hết)
1. `CLAUDE.md` (gốc) §1–§3 và §8; `web/CLAUDE.md` toàn bộ.
2. `docs/SYSTEM-DESIGN.md` §9 (bảng trang, bundle, API, ai vào được; bảng này chưa có hai trang mới `/cho-xac-nhan` và `/ban`, danh sách đủ vẫn là `PAGES`) và §15 (thuật ngữ).
3. `src/shared/muc-giao-dien.ts`, `src/shared/start-page.ts`, `src/shared/trang-chu-o.ts`: điều hướng, trang đầu theo vai, ô trang chủ.
4. `public/app.css` phần `:root` (khoảng 560 dòng đầu): chỉ để biết có gì, không sửa.
5. `docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/PROMPT-CLAUDE-DESIGN.md`: khuôn đề bài đã dùng tốt; và các README trong `docs/design/` để biết mỗi đợt trước đã quyết gì.
6. `tests/e2e/README.md` (mục "Kiểm giao diện bằng Chrome thật") và bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" ở `web/CLAUDE.md`: cách chạy Chrome + axe. axe-core phải `npm pack` ngoài kho và trỏ bằng biến `AXE_JS`; `chrome-wrap.sh` ghi cứng đường dẫn Chrome trên macOS; kịch bản mẫu ở `docs/evidence/2026-09-20-a2/kich-ban/`.
7. `docs/AUDIT-2026-09-22-DOI-TAC.md` (quy mô người dùng ngoài).

### 6.2 Chạy thử trên máy với dữ liệu tạm
- `node scripts/dev-iphone.mjs` dựng kho dữ liệu tạm trong một thư mục tạm (không in ra, xoá khi thoát), gieo hai tài khoản "Admin Thử" (SALES + ADMIN) và "Nhân viên Thử" (SALES) kèm PIN in ra màn hình. Ở chế độ này Face ID bị tắt cố ý; trang đăng nhập vẫn gọi Turnstile nên cần mạng; service worker chỉ chạy khi mở `localhost` hoặc `--tunnel`. Để dữ liệu mẫu sống qua nhiều phiên đo, chạy `wrangler dev` với `--persist-to <thư mục cố định>` thay vì để script tự tạo thư mục tạm, và ghi thư mục đó vào README bằng chứng.
- Danh mục dịch vụ **không** được gieo bằng migration: migration chỉ gieo 14 nhóm; dịch vụ được kéo từ Google Sheet của công ty ở lần đọc đầu (`bootstrapIfNeverSynced` trong `src/modules/catalog/service.ts`, `SERVICES_SHEET_ID` trong `wrangler.jsonc`). Xem quyết định (4) ở mục 2 về việc này.
- Gieo trước **một tài khoản Toàn quyền** bằng `scripts/create-staff.mjs` (chú thích đầu tệp lỗi thời, dòng hướng dẫn in ra đủ 10 mã quyền; script chỉ cấp quyền, không gán vai) rồi `wrangler d1 execute tourdao-sales-db --local --persist-to <thư mục đó> --file ...`. Dùng tài khoản Toàn quyền ấy tạo các vai còn lại từ màn Quản lý tài khoản, vì năm vai Giám đốc, Điều hành chung, Kế toán, IT, Hành chính nhân sự chỉ Toàn quyền mới gán được (`src/shared/roles.ts`). Chính việc tạo tài khoản này cũng là một phần đánh giá vai Quản trị, Nhân sự, Toàn quyền; ghi lại cách gieo trong README bằng chứng.
- Tự tạo dữ liệu mẫu đủ để mỗi họ màn có trạng thái **rỗng, ít, nhiều** (ví dụ 0 đơn, 3 đơn, 40 đơn; một chuyến đủ khách; một công nợ có điều chỉnh). Dữ liệu giả, tên giả, số điện thoại giả; **không dùng dữ liệu thật**.
- Đo trên Chrome ở **390×844** (bắt buộc) và **1040** (bắt buộc); kiểm thêm **768** và **1440** cho họ danh sách và bảng điều khiển. Mỗi trang chụp ảnh ở hai khổ bắt buộc và chạy axe. Trạng thái cài lên iPhone (toàn màn hình, tai thỏ, bàn phím, nút quay lại) không tự động được: bổ sung vào **danh sách kiểm trên iPhone thật** đã có ở `docs/PWA-IPHONE.md` (không viết danh sách mới), kể cả Face ID vì chế độ chạy tạm tắt nó.
- Đo thật, không suy từ mã: tương tác chạm và chuột phải đo bằng hit-test và `getComputedStyle`; không tin thuộc tính `hidden` hay cổng xanh.

### 6.3 Phạm vi và thứ tự làm
Phủ **mọi trang trong `PAGES`** và **mọi bộ quyền** (10 bộ, theo quyết định (6); 15 vai gộp về 10 bộ, bảng gộp ghi ở `KIEM-KE.md`). Thứ tự dưới đây là thứ tự làm việc theo tần suất dùng, không phải thứ tự quan trọng:
1. Bán hàng, Thực tập: Trang chủ, Tạo đơn, Đơn hàng, Chi tiết đơn, Đơn chờ xác nhận, Danh bạ.
2. Vai ngoài: Đối tác và cộng tác viên (lập đơn qua đối tác, xem hoa hồng), Hướng dẫn viên (khối "Việc của tôi" trong trang Tôi), Tài xế công ty và Tài xế đối tác (Trang đầu tài xế, Cuốc, Chuyến, Báo bận).
3. Kế toán: Sổ công nợ, Khoá sổ tháng, Điều chỉnh công nợ, Hoa hồng, Người bán dịch vụ, Chụp bù mức, Bảng giá và Bảng kê chi phí xe thuê.
4. Điều phối: Điều phối xe, Chi tiết chuyến, Tạo và sửa chuyến, Xe đang chạy, Đề nghị chuyển khách, Xe, Thêm và sửa xe, Chi tiết xe, Giấy tờ sắp hết hạn, Lịch xe bận.
5. Quản trị, Nhân sự, Toàn quyền: Quản lý tài khoản, Dịch vụ, Địa điểm, Loại giấy tờ xe, Loại giấy tờ cá nhân, Chính sách điều phối, Điều kiện cho xe chạy, Lý do điều phối, Giao diện công ty, Trợ lý Hỗ trợ, Gửi thông báo, Nhật ký, Máy đang đăng nhập.
6. Chung mọi vai: Đăng nhập (PIN, Face ID, bảo trì), Tôi, Hỗ trợ, Hướng dẫn, thông báo trong Nền tảng, và ba trạng thái chung: mất mạng, không có quyền, không tìm thấy trang (hiện không có trang riêng cho 404, Cloudflare trả trang trơn: ghi nhận như một phát hiện).

Tên trang chuẩn lấy theo `PAGES` và `<title>` của từng tệp `public/*.html`; vài tên ở trên là gọi tắt. Hai trang chỉ chuyển hướng (`/home`, `/danh-muc-giay-to`) bỏ qua.

Với mỗi bộ quyền, đi **trọn một hành trình thật** từ đăng nhập tới việc chính của vai đó (ví dụ Bán hàng: nhận tin Zalo, tạo đơn ba dịch vụ, gửi xác nhận, hôm sau xem đơn trên trang chủ), đếm số chạm, số cuộn, số lần phải đoán.

### 6.4 Cách chấm
- Mỗi phát hiện ghi: trang · bộ quyền · khổ màn hình · bước tái hiện · ảnh (đường dẫn) · vi phạm mặt nào trong 10 mặt ở mục 4 · phục vụ tiêu chí nào trong 4 tiêu chí ở mục 3 · mức độ · phạm vi.
- **Mức độ**: *Chặn* (không làm xong việc, hoặc dễ gây nhập sai tiền hay sai khách) · *Nặng* (việc hằng ngày tốn công rõ rệt hoặc gây hiểu nhầm) · *Vừa* (khó chịu, có đường vòng) · *Nhẹ* (thẩm mỹ, chữ nghĩa).
- **Phạm vi**: *Hệ thống* (sửa một lần ở khung chung, token hay thành phần dùng chung là hết ở mọi trang) · *Cục bộ* (một trang). Ưu tiên tìm lỗi hệ thống; đây là loại lỗi mà cách vẽ từng màn trước đây không bắt được.
- Lập **sổ lệch thành phần**: đếm thật trong `public/app.css` và trên màn hình có bao nhiêu kiểu nút, kiểu thẻ, kiểu bảng hoặc danh sách, kiểu huy hiệu trạng thái, kiểu ô nhập, kiểu bảng trượt hoặc hộp thoại, kiểu thông báo, kiểu đầu trang; ghi mỗi kiểu dùng ở trang nào. Đây là bằng chứng cho hay chống giả thuyết "không cùng một ngôn ngữ".
- Chấm cả ba màn mới nhất (Tạo đơn, Hoa hồng + Hỗ trợ, Sổ công nợ) theo cùng thang; nếu chúng tốt hơn phần còn lại, nói rõ điểm nào đáng nhân rộng.

### 6.5 Sản phẩm của Chặng 1
Lưu thành **hồ sơ có ngày** ở `docs/superpowers/specs/2026-MM-DD-danh-gia-ux-tong-the/` (ngày thật lúc làm) và ảnh ở `docs/evidence/2026-MM-DD-danh-gia-ux-tong-the/` (kèm README ghi cách chụp, tài khoản giả, lệnh đã chạy):
0. `PROMPT.md`: chép nguyên văn đề bài này (từ "BẮT ĐẦU" tới "HẾT").
1. `BAO-CAO.md`: **tối đa một trang cho chủ dự án đọc**: kết luận chính (giả thuyết đúng hay sai, bằng chứng), 5–7 phát hiện hệ thống quan trọng nhất, và **tối đa ba quyết định** cần chủ chốt trước Chặng 2. Viết bằng lời thường, không thuật ngữ, không mã.
2. `PHU-LUC-PHAT-HIEN.md`: bảng đầy đủ mọi phát hiện theo 6.4, xếp theo mức độ rồi phạm vi.
3. `KIEM-KE.md`: bảng trang × họ màn × bộ quyền × ảnh 390/1040; bảng gộp 15 vai → 10 bộ quyền (vai nào nhìn giống vai nào, chỗ nào hiện tên vai); sổ lệch thành phần.
4. `HE-THONG-HOP-NHAT.md`: đề cương hệ thống thiết kế hợp nhất: mô hình điều hướng (giữ hay đổi, vì sao), đúng 5 khuôn trang với vùng cố định, danh sách thành phần dùng chung kèm trạng thái (bình thường, rê chuột, focus, tắt, lỗi, đang tải, rỗng, mất mạng, không có quyền), luật đáp ứng theo 390/768/1040/1440, từ vựng trạng thái, thang nút ba cấp, token cần thêm (đánh dấu MỚI, kèm lý do) và token nên bỏ. Mỗi mục trỏ về phát hiện nào trong phụ lục.
5. `LO-TRINH.md`: thứ tự các đề bài Claude Design (Chặng 2–3), mỗi đề bài gồm trang nào, phụ thuộc gì, cái nào có thể thi công song song; và danh sách thử tay trên iPhone cho chủ.
6. Danh sách **câu hỏi gom một lần** cho chủ (nếu có), kèm phương án khuyến nghị cho từng câu.

### 6.6 Cổng duyệt 1
Dừng. Chủ dự án đọc `BAO-CAO.md`, trả lời tối đa ba quyết định. Chưa có chữ "duyệt" thì không sang Chặng 2.

## 7. Chặng 2: Đề bài Claude Design số 1, khung chung và hệ thống thiết kế hợp nhất

Sau cổng 1, viết `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md` theo khuôn ở mục 9. Nội dung bắt buộc:
- **Làm mới "Tour Đảo Booking — Design System" trong Claude Design từ `public/app.css`**: bộ hiện có bên Claude Design đã lệch (nền `#eaf2f8`, viền `#d3e1ec`, phông Nunito; ghi nhận 18/10/2026) và không được dùng. Đề bài phải chép bảng token thật (tên, giá trị, nơi dùng) để Claude Design dựng lại đúng.
- Khung chung ở 390, 1040 và 1440: thanh trên, tab dưới, thanh bên, đầu trang, vùng hành động, chân dính, bảng trượt, hộp thoại, thông báo, trạng thái mất mạng, bảo trì, không có quyền.
- Năm khuôn trang (danh sách, chi tiết, biểu mẫu, bảng điều khiển, thiết lập), mỗi khuôn có đủ trạng thái rỗng, ít, nhiều, đang tải, lỗi.
- Thư viện thành phần theo `HE-THONG-HOP-NHAT.md`, mỗi thành phần đủ trạng thái, ở cả hai khổ.
- Sản phẩm: một HTML tương tác, bảng token (đánh dấu MỚI), 3–5 dòng giải thích.
- Cổng duyệt 2: chủ duyệt bản vẽ khung chung trước khi viết đề bài họ màn.

## 8. Chặng 3: Đề bài theo họ màn (số 2 tới số 6)

Mỗi họ một đề bài riêng, viết sau khi khung chung được duyệt, theo khuôn mục 9, áp **khung chung đã duyệt** cho **mọi trang cùng họ**:
- **Số 2, Danh sách**: Đơn hàng, Đơn chờ xác nhận, Danh bạ, Quản lý tài khoản, Xe, Cuốc của tôi, Xe đang chạy, Giấy tờ sắp hết hạn, Đề nghị chuyển khách, Nhật ký, Máy đang đăng nhập, Hỗ trợ (danh sách vé).
- **Số 3, Chi tiết**: Chi tiết đơn, Chi tiết chuyến, Chi tiết xe, hồ sơ trong Danh bạ, một vé Hỗ trợ, Chuyến của tôi.
- **Số 4, Biểu mẫu**: Tạo đơn, Tạo và sửa chuyến, Thêm và sửa xe, Điều chỉnh công nợ (gửi và duyệt), Chụp bù mức, Báo bận của tôi, form tạo tài khoản trong Quản lý tài khoản, form tạo hồ sơ trong Danh bạ, các bảng trượt sửa nhanh.
- **Số 5, Trang chủ và bảng điều khiển**: Trang chủ theo từng vai (điện thoại và máy tính), Trang đầu tài xế, Điều phối xe (lịch ngày), Lịch xe bận, Sổ công nợ, Hoa hồng, Khoá sổ tháng, Bảng kê chi phí xe thuê.
- **Số 6, Thiết lập, danh mục và tài khoản**: Dịch vụ, Địa điểm, Loại giấy tờ xe, Loại giấy tờ cá nhân, Chính sách điều phối, Điều kiện cho xe chạy, Lý do điều phối, Bảng giá thuê xe, Người bán dịch vụ, Giao diện công ty, Trợ lý Hỗ trợ, Gửi thông báo, Tôi, Hướng dẫn, Đăng nhập.

Xếp trang vào họ theo kết quả `KIEM-KE.md`; danh sách trên là gợi ý ban đầu, lệch thì sửa và ghi lý do. Mỗi đề bài vẽ **đại diện** của họ (2–3 trang khó nhất) ở cả hai khổ, cộng một bảng "áp cho các trang còn lại: trang → khác gì so với đại diện". Mỗi đề bài có cổng duyệt riêng; bản vẽ về thì bàn giao cho phiên đặc tả và `superpowers:writing-plans` như đợt Tạo đơn.

## 9. Khuôn đề bài Claude Design (dùng cho mọi đề bài ở Chặng 2 và 3)

Giữ đúng thứ tự các mục; đây là khuôn đã chạy tốt ở đợt Tạo đơn 18/10/2026:
1. **Vai và nhiệm vụ**, một đoạn: "Bạn là nhà thiết kế sản phẩm cao cấp, chuyên phần mềm quản trị doanh nghiệp. Hãy thiết kế ... điện thoại trước (390×844), rồi máy tính (1040, kiểm thêm 1440). Dùng hệ thống thiết kế 'Tour Đảo Booking — Design System' (bản làm mới ngày ...); không dùng hệ thống khác, không tự đặt màu hay phông mới."
2. **Bối cảnh**, 5–8 dòng: Nền tảng là gì, ai dùng màn này, trong tình huống nào, bao nhiêu người, dùng ngón cái hay chuột.
3. **Bốn tiêu chí của chủ dự án** (mục 3) và nguyên tắc vàng riêng của họ màn đó (ví dụ danh sách: "tìm thấy một đơn trong không quá 3 giây, không cần mở bộ lọc").
4. **Hiện trạng**: ảnh chụp thật đính kèm (390 và 1040), mỗi ảnh một dòng nói nó đang sai ở đâu, trích từ phụ lục phát hiện.
5. **Quyết định đã chốt**: vẽ đúng như vậy; muốn khác thì ghi chú riêng, không đưa lên artboard. Chia theo vùng (đầu trang, thân, chân dính...), mỗi quyết định một gạch đầu dòng, nêu cả hành vi (chạm, gõ, cuộn, lỗi).
6. **Biến thể theo vai**: mỗi vai thấy khác gì (ẩn gì, khoá gì, chữ gì), mỗi biến thể một artboard.
7. **Dữ liệu mẫu**: giả nhưng đúng cấu trúc thật (mã dịch vụ, tên nhóm, tiền với dấu chấm ngăn nghìn, ngày dd/mm/yyyy), đủ cho trạng thái rỗng, ít, nhiều.
8. **Hệ thống thiết kế bắt buộc**: bảng token từ `public/app.css` (phông, màu, khoảng cách 4/8/12/16/24/32/48, bo góc, bóng, ô gõ 16px, vùng chạm 44px, WCAG AA, focus, không emoji); và câu "không có token sẵn thì đề xuất token MỚI, đánh dấu và ghi lý do".
9. **Sản phẩm cần giao**: một HTML tương tác, danh sách artboard đặt tên rõ và đánh số, bảng "Token đã dùng", 3–5 dòng giải thích vì sao bố cục này giúp người dùng.
10. **Đừng làm**: không đổi luật nghiệp vụ, không thêm trường hay tính năng, không màu hay phông mới, không chế độ tối, không chữ Anh, không dữ liệu thật, không bỏ chức năng đã nêu.
11. Câu kết: "Nếu thiếu thông tin quan trọng, hỏi tôi TRƯỚC khi vẽ, tối đa 3 câu."

Kèm sau mỗi đề bài một mục **Bàn giao** (như artifact Tạo đơn 18/10): thứ tự ưu tiên khi lệch (quyết định thắng bản vẽ; token thật thắng màu trong bản vẽ; chữ thật của máy chủ thắng chữ đề xuất; dữ liệu trong bản vẽ là giả), và những điểm "vượt ra ngoài bề mặt" phải nêu trong đặc tả (chạm API, quyền, tiền, cần ADR).

## 10. Cách làm việc trong phiên

- Gom mọi câu hỏi vào **một lần hỏi**, đặt phương án khuyến nghị lên đầu; phần việc không phụ thuộc câu trả lời thì làm tiếp. Không hỏi lại điều đã chốt ở mục 2.
- Mơ hồ chạm dữ liệu, quyền, tiền, hợp đồng: dừng phần đó và hỏi. Mơ hồ chỉ ở bề mặt và đảo ngược được: tự giả định, ghi lại.
- Mỗi khẳng định "đã đo" phải có ảnh hoặc số liệu kèm đường dẫn; không nói "đã kiểm xong" suông. Cổng xanh của dự án không phải bằng chứng UX tốt.
- Báo cáo cho chủ dự án viết bằng lời thường, câu đủ chủ ngữ, ít gạch đầu dòng, tối đa một trang mỗi bước và ba quyết định mỗi bước; chi tiết kỹ thuật để ở phụ lục.
- Số hiệu ADR, DR, QĐ nếu cần cấp: grep mọi nhánh và worktree trước.
- Việc thi công sau này là "việc lớn" (chạm giao diện tiền và nhiều trang): ghi sẵn vào `LO-TRINH.md` rằng mỗi đợt thi công cần subagent kiểm độc lập và kịch bản Chrome theo bảng ở `web/CLAUDE.md`.

## 11. Đừng làm

- Không viết hay sửa mã sản phẩm hay `public/app.css`; không "tiện tay sửa luôn" lỗi nhỏ.
- Không đề xuất framework, thư viện giao diện, chế độ tối, đổi thương hiệu.
- Không đánh giá nội dung chữ nghĩa trong danh mục hay dữ liệu; chỉ đánh giá khung, luồng, thành phần và ngôn ngữ giao diện.
- Không nộp danh sách 200 lỗi không xếp hạng; không sửa từng màn rời rạc, vì đó chính là cách làm đã tạo ra vấn đề.
- Không dùng dữ liệu thật, không chạm production, không chụp màn hình có tên hay số điện thoại thật.
- Không bỏ qua bộ quyền nào, khổ màn hình nào, trạng thái rỗng, lỗi hay mất mạng nào.

Nếu còn thiếu thông tin quan trọng để bắt đầu Chặng 1, hỏi tôi TRƯỚC, tối đa 3 câu, gom trong một lần.

---- HẾT ----
