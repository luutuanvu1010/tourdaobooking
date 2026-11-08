# ADR-0187 — Một người nhiều vai trò: quyền cộng gộp, màn hình theo mảng việc, tách nhiệm vụ ở máy chủ

- **Trạng thái:** **accepted** 2026-11-08 — chủ dự án, nguyên văn: *«Duyệt, mức a»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt ADR-0187 và chọn mức tách nhiệm vụ nào?»). Đ3 chọn **mức (a) đánh dấu, không chặn**. Câu 2 và 3 ở cuối chủ không trả lời riêng → AI áp khuyến nghị và ghi lại (Hiến pháp P8, bề mặt đảo ngược được): tài xế đối tác **không** ghim thanh dưới; nguyên tắc Đ1 đưa vào Hiến chương **sau khi Đ3 xong** (để điều mới ghi được cả luật tách nhiệm vụ). Lịch sử: proposed — AI soạn 2026-11-08 theo lời chốt của chủ (*«Chốt, soạn ADR và với 1 cách dễ hiểu nhé, thể hiện rõ tinh thần của MWG và Oracle…»*). Chưa có mã.
- **Nguồn:** phân tích trong phiên chat 2026-11-08 (đo thanh bên và thanh tab cho bảy bộ vai trò bằng `src/shared/muc-giao-dien.ts`; đọc bản đồ quyền `src/shared/permissions.ts`); Hiến chương `docs/ARCHITECTURE.md` điều 4.5, 5.1, 5.8; ADR-0014 (Toàn quyền `any`), ADR-0018 (người–vai–quyền), ADR-0025 (hai bước «Khách đã trả đủ» và «Hoàn thành»), ADR-0071 (Nhân sự), ADR-0169 (Quản lý bán hàng), ADR-0180 (Toàn quyền xem như vai trò khác).
- **Loại:** việc lớn (quyền, tiền, giao diện khung). **Cửa:** Đ1, Đ2, Đ4 hai chiều; Đ3 là luật tiền, đổi lại được nhưng phải qua ADR.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 3** (Đ1, Đ3, Đ4). Đ2 chỉ là cách trình bày.

## Câu hỏi
Một người ở Tour Đảo thường giữ nhiều vai trò cùng lúc (ví dụ Bán hàng + Quản lý bán hàng + Nhân sự + Kế toán). Giao diện và quyền phải xử lý thế nào để **đúng, dễ dùng, và khi thêm vai trò mới sau này thì mọi thứ tự theo**, không phải đập đi làm lại?

## Bối cảnh, nói bằng lời thường
Hai cách mà các hệ thống lớn đã đi:

1. **Chọn một «trách nhiệm» mỗi lần** (Oracle E-Business Suite đời cũ): đăng nhập xong phải chọn mình đang làm Bán hàng hay Kế toán, muốn đổi việc thì đổi trách nhiệm. Gọn mắt, nhưng người kiêm nhiệm kêu phiền vì trong một buổi họ đổi việc hàng chục lần, và thông báo của vai trò kia dễ bị bỏ lỡ.
2. **Cộng gộp, xếp theo mảng việc** (Oracle Fusion, và cách MWG làm với nhân viên kiêm nhiệm): một người thấy **tất cả** việc của mọi vai trò mình giữ trên một màn hình; màn hình chia theo **mảng việc** (Bán hàng, Tiền, Nhân sự, Vận chuyển…) chứ không chia theo tên vai trò. Việc «ai không được tự làm tự duyệt» (tách nhiệm vụ) **không** giải quyết bằng menu, mà bằng **luật ở máy chủ trên từng giao dịch** — ở MWG là thu ngân và người bán phải là hai người, ở Oracle là chính sách kiểm soát tách nhiệm vụ.

Oracle đã bỏ cách 1 sang cách 2 ở thế hệ mới. Nền tảng Tour Đảo hiện đã đi hơn nửa đường theo cách 2 (xem «Hiện trạng»). ADR này **chốt cách 2 thành luật** để không ai hỏi lại, và ghi rõ các chỗ còn thiếu.

### Hiện trạng đã đo (2026-11-08)
| Bộ vai trò | Menu trái (máy tính) | 5 nút thanh dưới (điện thoại) |
|---|---|---|
| Bán hàng | 12 mục | Trang chủ · Đơn hàng · Tạo đơn · Danh bạ · Tôi |
| Kế toán | 16 mục | Trang chủ · Đơn hàng · Sổ công nợ · Tôi |
| Bán hàng + Kế toán | 19 mục | Trang chủ · Đơn hàng · Tạo đơn · Danh bạ · Tôi — **mất «Sổ công nợ»** |
| Bán hàng + QL bán hàng + Nhân sự + Kế toán | 21 mục | Trang chủ · Đơn hàng · Tạo đơn · Tài khoản · Tôi — **mất «Sổ công nợ»** |
| Quản trị + Bán hàng | 27 mục | Trang chủ · Đơn hàng · Tạo đơn · Thiết lập · Tôi |

Kết luận: **quyền đang đúng** (giao diện và máy chủ hỏi cùng một bảng, nên người thêm vai trò thì tự thấy thêm việc). Chỗ đau là **thanh dưới điện thoại chỉ có 5 chỗ**, máy chọn theo một luật chung nên bỏ sót việc chính của vai trò thứ hai. Chỗ hở là **tách nhiệm vụ**: bản đồ quyền cho Kế toán ghi sổ tiền (`ledger.write` = `any`) **mọi** đơn, không loại trừ đơn do chính người đó lập khi họ kiêm Bán hàng. Route ghi sổ có kiểm thêm theo đơn hay không: **chưa kiểm** (xem Đ3).

## Quyết định

**Đ1. Quyền cộng gộp, hai lớp, một bảng.**
1. Một tài khoản giữ nhiều mã quyền thì được **hợp** của mọi ô quyền; không có «vai trò đang làm» cho người thường. Đây là hiện trạng (ADR-0018), nay thành luật.
2. Quyền có **hai lớp tách rời**, giống Oracle tách *function security* và *data security*: lớp **được làm việc gì** (ô trong bản đồ `src/shared/permissions.ts`) và lớp **trên dữ liệu nào** (`own` / `assigned` / `any`). Thêm vai trò mới = thêm **một cột** vào bản đồ; thêm việc mới = thêm **một hàng**. Không viết điều kiện quyền ở nơi khác.
3. Các cặp vai trò **không được cùng tồn tại** khai ở **một** chỗ (`src/shared/roles.ts`, hiện có: Kế toán + Đối tác; Tài xế đối tác đứng một mình) và máy chủ chặn lúc tạo/sửa tài khoản. Muốn cấm thêm cặp nào thì thêm dòng ở đó, không rải ra giao diện.
4. «Xem như vai trò khác» (ADR-0180) **chỉ dành cho Toàn quyền** để kiểm tra và hỗ trợ, giống chức năng «đóng vai người dùng» của quản trị viên Oracle. **Không** mở cho người thường làm cách chuyển vai trò hằng ngày.

**Đ2. Màn hình xếp theo mảng việc, không theo vai trò.**
1. Menu trái giữ khuôn hiện nay: HẰNG NGÀY · VẬN CHUYỂN · TIỀN · THIẾT LẬP · CHÂN MENU (`NHOM_THANH_BEN`), mỗi mục hỏi bảng quyền để ẩn/hiện. Không thêm nhóm theo tên vai trò.
2. Trang chủ theo cùng khuôn: **mỗi mảng việc một khối**, khối đang có việc cần làm nổi lên trên; không có khối nào thì không vẽ. Khối «Việc của bạn» hiện có đã là mầm của việc này.
3. **Thanh dưới điện thoại (5 nút) là «mục ưa thích»**: máy xếp mặc định theo thứ tự ưu tiên hiện nay; người dùng **tự ghim lại** ở trang Tôi, chọn trong các trang mình được mở. Lưu ở máy chủ theo tài khoản (một bảng nhỏ của module `staff`, không phải bản nhớ trình duyệt — đổi máy vẫn còn). Ghim một trang mình không có quyền thì máy chủ từ chối. Đây là cách Oracle (Favorites) và ứng dụng nội bộ của MWG cho nhân viên tự ghim.

**Đ3. Tách nhiệm vụ nằm ở máy chủ, theo vai trò của người đó trên chính đơn (Hiến chương 5.8).**
1. Nguyên tắc: **một người không tự xác nhận tiền cho đơn mình lập**. Áp cho các việc trong nhóm ghi tiền `O_GHI_TIEN` (`ledger.write`, `payment.refund`, `order.complete`, `accounting.entry.mark`) khi `created_by` của đơn là chính người gọi.
2. Hai mức để chủ chọn khi duyệt (khuyến nghị **mức a**):
   - **(a) Đánh dấu, không chặn:** máy chủ vẫn cho ghi nhưng gắn dấu «tự ghi đơn mình lập» vào dòng sổ và nhật ký; Sổ công nợ có bộ lọc «cần người thứ hai soát»; một Kế toán khác hoặc Toàn quyền bấm «Đã soát». Công ty nhỏ, có lúc chỉ một Kế toán có mặt, nên không chặn cứng.
   - **(b) Chặn:** máy chủ trả 409 với câu tiếng Việt, đòi người khác ghi. Toàn quyền vẫn ghi được (ADR-0014) nhưng có dấu.
3. Việc kiểm **trước** khi thi công: đọc route ghi sổ và route «Hoàn thành» xem hiện có kiểm `created_by` chưa. **Kết quả kiểm 2026-11-08 (AI đọc mã, chỉ đọc):** mọi route ghi tiền của `src/modules/billing/index.ts` (ghi khoản, chuyển, chi hoàn, đánh dấu nhập kế toán, ghi theo phân định) chỉ hỏi `can(staff, "ledger.write")` / `payment.refund` / `accounting.entry.mark` với phạm vi `any`, **không** so `ownerId` của đơn với người gọi. Tức là **đang hở**: tài khoản kiêm Bán hàng + Kế toán tự ghi được tiền cho đơn mình lập. Chưa có tài khoản như vậy trên production (chưa kiểm bằng lệnh — ghi để người thi công kiểm). Mức nghiêm trọng: kiểm soát nội bộ, không phải lộ dữ liệu; chủ đặt hạn khi giao thi công.
4. Luật này là **luật tiền** nên phải nằm ở **cả** máy chủ lẫn ràng buộc dữ liệu nếu làm được (Hiến chương 5.1), không bao giờ chỉ ở giao diện.

**Đ4. Vai trò chính không phải dữ liệu mới.** Không thêm cột «vai trò chính» cho tài khoản. Mọi chỗ cần «ưu tiên» (nút mặc định thanh dưới, trang đầu sau đăng nhập) dùng **thứ tự ưu tiên khai trong bảng mục** (`src/shared/muc-giao-dien.ts`, `start-page.ts`), cộng với mục ưa thích do người dùng ghim (Đ2.3). Lý do: «vai trò chính» là một nguồn sự thật thứ hai về quyền, dễ lệch với bảng quyền khi Nhân sự đổi vai trò mà quên đổi vai trò chính.

## Vì sao đổi một thứ thì các thứ khác tự theo (mở rộng sau này)
Bảng dưới là **hợp đồng mở rộng**: ai thêm/đổi ở cột trái thì **phải** làm đủ cột phải, bài kiểm máy canh từng dòng.

| Đổi gì | Kéo theo gì (bắt buộc) | Máy canh |
|---|---|---|
| Thêm **mã quyền** (vai trò) mới | một cột trong `row()` của bản đồ quyền; nhãn `PERMISSION_LABEL`; vai mặc định `roles.ts`; danh sách chọn của «Xem như vai trò khác» (`VAI_CHON_DUOC`); nếu là vai bên ngoài: `EXTERNAL_PERMISSIONS` + trigger LC-1 (migration mới); dòng Bảng tham chiếu | `permissions.test.ts` (tập con quyền), `xem-nhu-vai.test.ts`, `route-access.test.ts` SNAPSHOT, `bang-tham-chieu.test.ts`, bài trần gói `goi-trang-nhe.test.ts` |
| Thêm **việc** (thao tác) mới | một hàng trong bản đồ quyền; route khai `access` + `can()`; nếu ghi tiền → thêm vào `O_GHI_TIEN` (tự chịu luật Đ3); nút giao diện hỏi `can()` cùng ô | `giao-dien-hoi-bang-quyen.test.ts`, `route-access.test.ts`, bài Đ3 mới |
| Thêm **trang** mới | khai `TRANG` + nhóm thanh bên + (tuỳ) `THANH_TAB` + `TRANG_TOI` trong `muc-giao-dien.ts`; `PAGES` của `sw-policy.ts`; script `build:web` | `sw-policy.test.ts`, bài đếm mục thanh bên, kịch bản Chrome `trang-chu-smoke` |
| Thêm **cặp vai trò cấm** | một dòng ở `roles.ts` | bài `roles.test.ts` + e2e tạo tài khoản |
| Thêm **mảng việc** mới ở Trang chủ / menu | một tên trong `NHOM_THANH_BEN` và khối Trang chủ cùng tên | bài kiểm `muc-giao-dien` (mọi mục thuộc một nhóm có tên) |
| Đổi luật **tách nhiệm vụ** | sửa **một** hàm kiểm chung của `O_GHI_TIEN` (không sửa từng route) + ADR mới | bài Đ3 quét mọi route của `O_GHI_TIEN` đều gọi hàm đó |

Điều **không** được làm (sẽ phá hợp đồng trên): viết `if (permissions.includes("ACCOUNTING"))` ở giao diện hay route thay vì hỏi `can()`; thêm trường «vai trò chính»; dựng menu theo tên vai trò; cho người thường chuyển vai trò.

## Trang ghép (CLAUDE.md §9)
1. **Bảng chạm:** bảng mới «mục ưa thích thanh dưới» (module `staff`, khoá: tài khoản; giá trị: tối đa 5 khoá trang) — chỉ chứa sở thích hiển thị, không phải quyền. Đ3 mức (a) thêm **một cột dấu** trên dòng sổ tiền / nhật ký (nullable); mức (b) không thêm cột.
2. **Dòng bản đồ quyền chạm:** không đổi ô nào. Đ3 thêm **điều kiện phụ theo đối tượng** (`created_by` ≠ người gọi) đặt **sau** `can()`, trong một hàm dùng chung cho cả nhóm `O_GHI_TIEN`. Ghim mục ưa thích: ô mới `me.favorites.write` phạm vi `own` cho mọi vai trò có khung (không cho `DRIVER_PARTNER`? — chờ chủ: tài xế đối tác chỉ có hai trang, đề nghị **không**).
3. **Cổng canh cửa:** máy chủ từ chối ghim trang người gọi không mở được (`moTrang(k, staff)` cùng hàm với giao diện); giao diện **ẩn/hiện theo cùng bảng**, chỗ đổi nghĩa duy nhất là thanh dưới điện thoại (từ «máy xếp» sang «người ghim, máy xếp khi chưa ghim»). Đ3: cổng ở route ghi tiền, giao diện chỉ hiện dấu/bộ lọc.

## Thứ tự thi công đề nghị (mỗi bước một phiên, kiểm độc lập vì chạm tiền/quyền)
1. **Kiểm Đ3.3** (chỉ đọc, nửa ngày): hiện có ai tự ghi tiền đơn mình lập được không. Ra kết quả rồi chủ chọn mức (a) hay (b).
2. **Đ3** theo mức chủ chọn.
3. **Đ2.3** ghim nút thanh dưới.
4. **Đ2.2** Trang chủ theo khối mảng việc.
5. Đưa Đ1 thành một điều mới của Hiến chương Phần I (AI đề xuất diff, chủ duyệt — Hiến pháp N9).

## Hệ quả
- **Được:** không ai hỏi lại «một người nhiều vai trò thì sao»; thêm vai trò/việc/trang mới có đường đi rõ, máy canh; tách nhiệm vụ không còn phụ thuộc vào việc ai được cấp vai trò gì.
- **Mất / chấp nhận:** menu của người kiêm nhiều vai trò vẫn dài (21–27 mục) — chấp nhận vì máy tính đủ chỗ và chủ chọn không bắt chuyển vai trò; gói mọi trang nặng thêm vì ghim nút (đo lại trần `goi-trang-nhe.test.ts` khi thi công).
- **Rủi ro:** Đ3 mức (a) dựa vào người soát; nếu không ai soát thì dấu chỉ là dấu. Khuyến nghị kèm một ô trên Trang chủ của Kế toán/Toàn quyền «N dòng cần người thứ hai soát» để không bị quên.

## Câu hỏi còn chờ chủ dự án (trả lời khi duyệt)
1. Đ3: chọn mức **(a) đánh dấu** hay **(b) chặn**? (khuyến nghị a)
2. Đ2.3: tài xế đối tác có được ghim thanh dưới không? (khuyến nghị không — chỉ có hai trang)
3. Có đưa Đ1 vào Hiến chương ngay lượt này không, hay đợi Đ3 xong?
