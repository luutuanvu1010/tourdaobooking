# Vé điện tử: kho vé và tự cấp vé cho đơn (thiết kế, bản nháp)

Trạng thái: **bản nháp chờ chủ dự án duyệt**. Chưa có mã. Việc này đụng dữ liệu, quyền, kho tệp và cần ADR mới nên là việc lớn (CLAUDE.md §3).

## 1. Vì sao làm

Hôm nay nhân viên đặt khoảng 50 vé một lần trên trang nhà cung cấp (VinWonders), tải 50 ảnh về, lưu từng ảnh vào Zalo, rồi nhìn từng đơn để lấy vé gửi khách và bấm "like" vào vé đã gửi. Cách này tốn thời gian và dễ sai: gửi thiếu hoặc thừa, gửi trùng một vé cho hai khách, gửi vé đã hết hạn, nhiều người cùng lấy từ một kho chung nên không ai chắc vé nào đã dùng.

Mục tiêu: một **kho vé** trong Nền tảng; vé được **tự cấp** đúng loại, đúng nhóm khách, còn hạn vào ngày khách đi, mỗi vé **chỉ cấp một lần**, có ghi ai/lúc nào/cho đơn nào; giao cho khách qua hai đường (nhân viên gửi Zalo, khách tự mở đường dẫn).

Điều làm hỏng dù "chạy được": một vé cấp cho hai đơn; một đơn xác nhận bị kẹt chỉ vì kho thiếu vé; ảnh vé hoặc mã vé lọt vào nhật ký hay đường dẫn đoán được.

## 2. Sự thật về vé (chủ cung cấp 31/10, từ 7 ảnh vé mẫu)

- Vé là ảnh, không in tên khách, mã QR dùng soát cổng; **ai cầm cũng dùng được** (khác vé máy bay).
- Mỗi vé có: mã vé riêng (dạng `TA.` + 12 chữ số, trùng với dãy S/N), tên sản phẩm của nhà cung cấp, nhóm khách (người lớn / cao tuổi / trẻ em), khoảng ngày dùng được.
- **Hạn dùng không cố định 30 ngày.** Vé "tiêu chuẩn", "chiều tà 16h": khoảng 30 ngày. "Multiday 2 lần": 14 ngày. "3 ngày liên tiếp": 3 ngày. Gói có ăn (buffet 350K, 500K + Fastpass): **một ngày cố định, có giờ** (ví dụ 24/10 lúc 12:00), xuất đúng ngày dùng.
- Em bé miễn phí **không có vé**. Combo cũng chỉ **một** ảnh vé.
- Tên in trên vé **không trùng** tên trong Sheet (ví dụ "VVC Multiday 2 lần 14 ngày" không giống V2D). Loại vé trong Sheet được xác định **theo lô**: nhân viên chọn dịch vụ cho cả lô khi nhập (tên tệp từ nhà cung cấp ngẫu nhiên, không dùng được).
- Có ảnh là ảnh chụp màn hình điện thoại (có thanh trạng thái), cỡ và tỷ lệ khác ảnh gốc.
- Sheet danh mục (nguồn chỉ đọc, dùng chung với website công khai) **không cần thêm cột**; cấu hình kho vé nằm trong cơ sở dữ liệu của Nền tảng, không sửa Sheet.

## 3. Phạm vi

**Làm (lượt này):** kho vé; nhập lô ảnh; tự cấp sau xác nhận; nút Cấp vé thủ công; trả vé khi huỷ; chỉnh vé khi sửa số khách; giao vé qua nút gửi Zalo và qua đường dẫn của khách.

**Không làm:** tự gửi Zalo cho khách (Zalo cá nhân không có cổng gửi tự động; ZNS chỉ cho OTP); mua vé tự động trên trang VinWonders; vé của nhà cung cấp khác ngoài nhóm VinWonders/Vinpearl (để lượt sau, khung chung giữ chỗ cho việc đó); đối soát tiền mua vé.

**Điều phải tránh (anti-goal):** cấp vé làm xác nhận đơn thất bại; mã vé / nội dung QR vào nhật ký, câu báo lỗi hay phản hồi lệnh ghi; đường dẫn khách đoán được hoặc không hết hạn; sửa Google Sheet.

## 4. Chủ đã quyết

1. Tự cấp là cách chính; vẫn có nút **Cấp vé** để bấm khi tự cấp không chạy được.
2. Xác nhận đơn **không bị chặn** khi thiếu vé; đơn hiện nhãn "thiếu vé".
3. Giao vé có **cả hai đường**: nhân viên bấm gửi sang Zalo; khách mở đường dẫn riêng của đơn.
4. **Một lô tải từ nhà cung cấp chỉ có một loại vé và một nhóm khách** (một dịch vụ trong Sheet, một nhóm: người lớn, hoặc trẻ em, hoặc cao tuổi; ví dụ 50 vé Vinwonders tiêu chuẩn dành cho người lớn). Nhân viên chọn **dịch vụ và nhóm khách một lần cho cả lô**; chữ trên ảnh chỉ để **đối chiếu** nhóm khách đã chọn (ảnh nào ghi nhóm khác thì cảnh báo), cùng khoảng ngày và mã vé. Tên tệp là ngẫu nhiên hoặc theo quy ước của nhà cung cấp, **không mang thông tin loại vé**. Nhân viên chọn dịch vụ trong Sheet **một lần cho cả lô** khi nhập; chữ trên ảnh dùng đọc nhóm khách, khoảng ngày, mã vé. (Đã sửa ngày 31/10: bản đầu hiểu nhầm tên tệp là số thứ tự dòng bảng giá.)
5. Em bé không cấp vé; combo một vé.
6. **Vé chỉ được xem / giao sau khi đơn đã thanh toán xong.** Đơn chỉ huỷ được khi chưa thanh toán, và lúc đó vé chưa hề lộ ra ngoài. Hệ quả: không có ca "huỷ đơn mà vé đã giao cho khách" trong lượt này.
7. **Quyền quản kho vé** (nhập lô, xem kho, thu hồi vé): Toàn quyền, Quản trị và Bán hàng.
8. Khi kho cạn hoặc đơn thiếu vé: **nhãn trên đơn + thông báo cho người giữ quyền kho vé**.
9. **Giờ in trên vé chỉ để hiển thị** (là giờ ăn buffet trưa của vé có buffet); chỉ khớp theo ngày.

## 5. Thiết kế đề xuất (lựa chọn của người viết, chủ có thể đổi)

### 5.1 Mô hình dữ liệu

Module mới `ve-dien-tu` (tiền tố bảng `vdt_`, tên khác `feedback` vốn dùng chữ "vé" cho vé hỗ trợ). Nghiêm theo `src/architecture.test.ts` (chỉ import qua `index.ts`, chỉ module chủ ghi bảng, đọc xuyên module qua view `v_<tiền tố>_*`).

- `vdt_ticket` (kho vé, **chỉ-thêm về nghĩa, không xoá**): id, mã tour của Sheet (`catalog_code`), nhóm khách (`ADULT|CHILD|SENIOR`), `valid_from`/`valid_to` (ngày VN `YYYY-MM-DD`), `slot_time` (giờ nếu có, chỉ để hiển thị), mã vé nhà cung cấp (khoá duy nhất, **không bao giờ vào nhật ký**), khoá kho tệp ngẫu nhiên, loại tệp, cỡ, băm SHA-256, người nhập, lô nhập, `status` (`AVAILABLE → ALLOCATED → VOID` một chiều có trigger; `EXPIRED` suy ra từ ngày, không ghi).
- `vdt_allocation` (**chỉ-thêm**): vé nào, cho dòng dịch vụ nào của đơn nào, vị trí vé (nhóm khách + thứ tự), người/hệ thống cấp, giờ cấp, `released_at` + lý do khi trả. Chỉ mục duy nhất một phần `(order_service_id, nhóm khách, thứ tự) WHERE released_at IS NULL` và một phần `(ticket_id) WHERE released_at IS NULL` để một vé chỉ thuộc một chỗ.
- `vdt_batch` (lô nhập): người nhập, giờ, số vé đọc được / bị loại; `vdt_delivery` (lần giao: vé nào, đường nào Zalo/đường dẫn khách, ai, giờ) thay cho dấu "like".
- `vdt_guest_link`: đường dẫn khách, chỉ lưu băm của mã ngẫu nhiên, hạn, thu hồi được, đếm lượt mở.
- Bảng hỗ trợ cấu hình: `vdt_product_map` (số thứ tự dòng Sheet → mã tour; lưu **mã tour**, không lưu số thứ tự vì số dòng lệch khi ai đó chèn/xoá dòng Sheet), có người sửa/giờ sửa.

Đọc dịch vụ trong đơn qua view mới `v_ord_*` do module orders công bố (mã dịch vụ `catalog_code`, `depart_date`, `depart_time`, **số khách hiệu lực theo nhóm** — nằm ở dòng điều chỉnh chứ không ở `order_service`, hàm `soKhachHieuLuc`).

### 5.2 Nhập lô

Nhân viên có quyền kho vé tải nhiều ảnh một lần và **chọn một dịch vụ trong Sheet cùng một nhóm khách cho cả lô** (mã tour và nhóm lưu theo lô; tên tệp bỏ qua). Mỗi ảnh: đọc chữ lấy khoảng ngày, mã vé, tên sản phẩm in trên vé, và nhóm khách in trên vé để đối chiếu với nhóm đã chọn (cách đọc: lựa chọn của người viết, xem §7). **Kiểm an toàn:** nếu tên sản phẩm in trên các ảnh trong lô không giống nhau (lô lẫn loại), hệ thống cảnh báo và không cho vào kho cho đến khi nhân viên tách lô hoặc xác nhận. Màn **xem lại** liệt kê từng vé đã đọc để nhân viên sửa trước khi vào kho (đọc chữ có thể sai, nhất là ảnh chụp màn hình). Trùng mã vé: loại ngay, không vào kho hai lần. Tệp phải qua kiểm chữ ký loại tệp, cỡ, băm (dùng lại `src/shared/tep-dinh-kem.ts`); thêm tiền tố khoá kho mới.

### 5.3 Lấy vé khỏi kho (tự động)

Hạt nhân của tính năng, và là điểm cần người kiểm độc lập đọc kỹ.

- **Thời điểm:** ngay sau khi đơn được xác nhận (ba đường vào cùng một lô xác nhận: `POST /api/orders/:id/status`, `…/quyet-dinh` CON_VE, `…/gui-don` nhánh Đối tác tự xác nhận). Cấp vé là **bước riêng sau lô xác nhận**, không nằm trong lô đó, nên thiếu kho không làm xác nhận thất bại. Không dùng `ctx.baoThayDoi` (bắn-và-quên, mất khi lỗi); thay bằng một bước có kiểm chứng ngay sau lô, và nếu bước này không chạy tới thì đơn vẫn ở trạng thái "chưa đủ vé" thấy được và nút Cấp vé cấp lại được (**chạy lại được = không cấp thừa**).
- **Cần bao nhiêu:** theo số khách hiệu lực từng nhóm (người lớn, trẻ em, cao tuổi); **em bé = 0 vé**.
- **Chọn vé nào:** mỗi nhóm lấy vé cùng mã tour, cùng nhóm khách, còn `AVAILABLE`, và khoảng ngày bao trùm `depart_date` của dịch vụ; ưu tiên vé **hết hạn sớm nhất** (vé một ngày cố định phải đúng ngày). Giờ trên vé chỉ hiển thị, không dùng để chọn (suy đoán, chờ chủ xác nhận).
- **Nguyên tử:** một câu `UPDATE … WHERE id IN (SELECT … LIMIT n)` đổi `AVAILABLE→ALLOCATED` và chèn `vdt_allocation`, cùng một lô với dòng nhật ký (nhật ký ghi số lượng và mã nội bộ, không ghi mã vé). Chỉ mục duy nhất một phần chặn hai người cùng lấy một vé; bài kiểm cạnh tranh bắt buộc (hai lô giữ cùng vé, chỉ một thắng).
- **Đủ hay thiếu:** cấp được bao nhiêu thì cấp bấy nhiêu; còn thiếu thì đơn/dịch vụ hiện nhãn **"thiếu vé"** kèm số thiếu theo nhóm, có nút **Cấp vé** (cùng đường, gọi lại được) và báo cho người có quyền kho khi kho cạn (chỗ báo: xem §7).
- **Giữ chỗ và lộ vé tách làm hai việc:** vé được **giữ chỗ cho đơn ngay khi xác nhận** (để biết sớm đơn có thiếu vé, và không bán trùng), nhưng **ảnh vé chỉ xem / giao được sau khi đơn thanh toán xong** (chủ quyết). Trước đó người dùng chỉ thấy "đã giữ vé" và số lượng, không thấy ảnh hay mã. Dùng hàm "đơn đã thu đủ" sẵn có do gốc lắp ráp tiêm (`ctx.daThuCuaDon`), người xây xác nhận ý nghĩa "thanh toán xong" = thu đủ 100% (suy đoán của người viết, xem §7). Thanh toán xong sau xác nhận thì không cần cấp lại, chỉ mở khoá xem/giao.
- **Huỷ đơn:** theo luật chủ, đơn chỉ huỷ được khi chưa thanh toán nên vé mới chỉ **giữ chỗ**, chưa lộ. Huỷ có ba điểm vào trong main (`/status`, `quyet-dinh` HET_VE/HUY, `cancelOrderByHandler`; thêm nhánh chưa gộp "super-admin-delete-order" nếu về main), phải nối **cùng một hàm soạn câu trả vé** vào cả ba. Trả vé: `released_at` + lý do, vé về `AVAILABLE` nếu còn hạn, `VOID` nếu hết hạn. **Chốt chặn dự phòng:** nếu mã hiện tại vẫn cho huỷ đơn đã thanh toán (hiện có luồng hoàn cọc, `refund_deadline`), vé đã mở khoá thì **không** trả về kho mà đánh `VOID` kèm cảnh báo trên đơn, vì khách có thể còn giữ ảnh; người xây báo lại nếu luật "chỉ huỷ khi chưa thanh toán" chưa được máy chủ thi hành.
- **Sửa số khách sau xác nhận** (`POST /api/orders/:id/money-edit`, `soanSuaSoKhach`): tăng thì cấp thêm, giảm thì trả bớt theo cùng hàm; dịch vụ không gỡ được sau xác nhận (trigger `order_service_frozen_*`).

### 5.4 Giao vé cho khách

- **Đường 1, nhân viên:** màn đơn có nút gửi vé; dùng chia sẻ của thiết bị (iPhone/Zalo) với các ảnh của đúng đơn đó; mỗi lần bấm ghi `vdt_delivery` (thay "like"), hiện "đã gửi lúc nào, bởi ai", không cho gửi nhầm vé đơn khác vì chỉ liệt kê vé của đơn đang mở.
- **Đường 2, khách:** đường dẫn riêng của đơn: mã ngẫu nhiên dài, **chỉ lưu băm**, có hạn, thu hồi được; route công khai không đăng nhập, ảnh trả qua Worker (không URL ký của kho), đầu phản hồi như `dauPhanHoiTepChung` (nosniff, CSP sandbox, no-store). Không mã đơn hay tên khách trong đường dẫn. **Cần ADR mới** vì ADR-0123 đ3 và ADR-0144 đ4 đang cấm đường dẫn công khai cho tệp; nó cũng chạm vùng "không có đường dẫn công khai nào ghi hay lộ dữ liệu" của Nền tảng.

### 5.5 Quyền

Hai ô quyền mới trong `MATRIX` của `src/shared/permissions.ts`: quản kho vé (nhập lô, xem kho, thu hồi vé) — chủ chốt: **Toàn quyền, Quản trị, Bán hàng**; và cấp/gửi vé (nút Cấp vé, gửi Zalo) — người xây đề xuất cho những vai đang được xem/sửa đơn đó (Bán hàng theo đơn của mình hoặc được giao, Quản trị, Toàn quyền, Kế toán chỉ xem) và đặt ở danh sách chờ duyệt cùng ADR. Vì kho vé gồm vật có giá trị tiền mà Bán hàng được nhập lô, bài khoá hàng quyền và nhật ký nhập/thu hồi là bắt buộc. Thêm ô thì phải sửa bài ghim cả hàng ở `permissions.test.ts`; khai `access` cho mọi route mới (mặc định từ chối).

### 5.6 Kho tệp

Kho R2 **mới, riêng** cho chức năng (Hiến chương 5.22), binding mới (ví dụ `VE_DIEN_TU`), chủ chạy `wrangler r2 bucket create` một lần (lưu ý: lệnh có thể tự sửa `wrangler.jsonc`, xem ghi nhớ dự án), cổng 1e của `npm run trien-khai` tự kiểm. Khoá kho ngẫu nhiên, không tên tệp gốc; hàng rào tĩnh như `src/kho-tep-ho-tro.test.ts`: binding chỉ nhắc trong module chủ, đọc kho sau khi hỏi quyền + ghi nhật ký, lô cơ sở dữ liệu **trước** khi đặt tệp vào kho; hỏng giữa chừng thì dòng "dở dang" chạy lại được.

## 6. Ràng buộc

- Migration chỉ thêm mới; số kế tiếp **0131** (kiểm lại `ls migrations` và các nhánh chưa gộp trước khi đặt). Bảng mới: cập nhật `docs/data-dictionary.json` rồi `npm run dict`.
- Tiền, ngày giờ, nhật ký, giao diện, tiếng Việt có dấu theo CLAUDE.md §7: không `innerHTML`, ngày giờ giờ Việt Nam, nhật ký **không ghi** mã vé / nội dung QR.
- Giấy tờ, tên khách: ảnh vé không in tên khách nhưng vẫn là dữ liệu có giá trị tiền; trong bài `giay-to-khong-lo-so` tương tự, thêm bài khoá "mã vé không lọt vào nhật ký, DTO ghi, câu lỗi".
- ADR cần theo/đối chiếu: ADR-0136 (xác nhận), 0123 + 0144 (kho tệp), 0094 (vé lần gửi), 0126 (xoá dữ liệu cá nhân), 0104 (đồng bộ chuyến trong lô huỷ/sửa), 0063 (sửa số khách), 0146/0152 (luật bán theo đặc điểm dịch vụ). Cần ADR mới: kho vé + cấp vé; đường dẫn công khai cho khách; quyền kho vé.

## 7. Điểm mở: việc của người xây hoặc chờ chủ

Người xây tự quyết: tên bảng/cột cụ thể; cách đọc chữ trên ảnh (đọc chữ tại máy chủ hay mô hình thị giác, miễn có bước xem lại và không đưa ảnh ra dịch vụ ngoài khi chưa được duyệt); bố cục màn hình.

Đã chốt ngày 31/10 (xem §4): quyền kho vé, báo thiếu vé, vé sau thanh toán, giờ chỉ để hiển thị.

Chủ chốt thêm (31/10): **vé mở khoá khi thu đủ đơn**, kể cả đơn của đại lý / đối tác ghi công nợ (trả sau): chưa thu đủ thì chưa xem được vé. Người viết hiểu "thu đủ" = thu đủ 100% số phải thu của đơn (chưa có mức cọc nào mở khoá); người xây xác nhận hàm "đơn đã thu đủ" của sổ tiền khớp nghĩa này, nếu lệch thì báo lại.

Còn chờ chủ quyết:
- Thời hạn của đường dẫn khách và việc thu hồi (đề xuất mặc định: hết hạn sau ngày dùng cuối của vé 7 ngày; thu hồi được).
- Có làm cả Vinpearl Harbour (VHB…) ở lượt này không (đề xuất mặc định: có, vì cùng cách quản lý).

## 7b. Các quyết định của người viết sau vòng soát độc lập (chủ kiểm khi đọc)

1. **"Thiếu vé" là suy ra lúc đọc, không lưu cờ.** Số cần (số khách hiệu lực từng nhóm, em bé = 0) trừ số vé đang giữ (`vdt_allocation` chưa trả) qua một view `v_vdt_*`. Không ghi cờ trong lô xác nhận (giữ nguyên luật: cấp vé không nằm trong lô). Có thêm bước **cấp bù tự động** sau mỗi lần nhập lô mới: quét các đơn còn thiếu theo thứ tự ngày đi gần trước, đơn xác nhận sớm trước. Danh sách đơn chỉ tính view cho các đơn đã xác nhận, ngày đi từ hôm nay trở đi, để không nặng.
2. **Loại vé theo lô, không theo tên tệp:** nhân viên chọn dịch vụ cho cả lô từ danh mục hiệu lực của Nền tảng (nguồn Sheet, chỉ đọc). Mỗi dòng Sheet có một mã tour duy nhất (đã kiểm: VTC, VB350, VB500, V16, V2D, V3D, VB16, VHB, VHBT, VHBTB…), nên "cùng mã tour" đủ để chọn loại vé. Khoá lưu trên vé là **mã tour**, không phải số dòng, nên chèn/xoá dòng Sheet sau này không làm lệch vé đã nhập. Không cần bảng `vdt_product_map`. Chọn nhầm dịch vụ cho cả lô là rủi ro chính: màn xem lại hiện tên dịch vụ đã chọn cạnh **tên sản phẩm in trên vé** để nhân viên đối chiếu, và lô đã vào kho có thể sửa mã tour khi **chưa vé nào được giữ chỗ** (sau đó chỉ thu hồi lô).
3. **Ngày bao trùm chỉ so với `depart_date` của dòng dịch vụ.** Vé nhiều ngày hợp lệ khi khoảng ngày của vé chứa `depart_date` (không đòi phủ cả kỳ lưu trú).
4. **Nhóm khách:** `order_service` đã có `pax_adult / pax_child / pax_senior / pax_infant` khớp với ba nhóm vé + em bé; số hiệu lực lấy qua `soKhachHieuLuc` (người xây xác nhận hàm trả đúng bốn nhóm này; nếu khác thì thêm phép đổi và báo lại).
5. **Nhiều dòng dịch vụ cùng mã tour trong một đơn:** cấp **theo từng dòng**, xử lý các dòng theo ngày đi tăng dần; trong mỗi dòng lấy vé hết hạn sớm nhất còn bao trùm ngày đi của dòng đó. Không có quy tắc ưu tiên chéo thêm.
6. **Gửi Zalo từ iPhone:** dùng chia sẻ tệp của thiết bị (Web Share có tệp) khi máy hỗ trợ; nếu không hỗ trợ thì dự phòng là nút "Tải ảnh về" cho từng vé của đơn đó (nhân viên vẫn gửi từ máy) và nút "Sao chép đường dẫn khách". Kiểm trên iPhone thật trước khi coi là xong.
7. **Trang đường dẫn của khách chỉ hiện ảnh vé, nhãn nhóm khách và khoảng ngày dùng.** Không tên khách, mã đơn, giá, dịch vụ khác.
8. **Giảm số khách khi vé đã giao:** trả **vé chưa giao trước**; hết vé chưa giao mà vẫn phải trả thêm thì đơn hiện cảnh báo "vé đã giao còn thừa" để nhân viên xử lý tay (không tự thu hồi vé khách đang giữ).
9. Số migration 0131 và số ADR mới là **tạm**, người xây kiểm lại trước khi đặt.

## 8. Cách kiểm (viết trước khi làm)

- Cấp vé: đơn 2 người lớn + 1 trẻ em + 1 em bé lấy đúng 2 + 1 vé, em bé 0; kho thiếu thì cấp phần có, nhãn thiếu đúng số; chạy lại không cấp thừa.
- Cạnh tranh: hai lô cùng giữ một vé thì đúng một thắng (chỉ mục duy nhất chặn; quan sát đỏ rồi xanh).
- Hạn dùng: vé hết hạn / chưa tới hạn / không bao trùm ngày đi không bao giờ được chọn; vé một ngày chỉ khớp đúng ngày.
- Huỷ: cả ba đường huỷ trả vé; huỷ lặp không trả hai lần.
- Thanh toán: chưa thu đủ thì không xem được ảnh, không có mã vé trong phản hồi; thu đủ thì mở; đơn thu đủ rồi mới sửa giảm số khách thì xử lý theo §7b mục 8.
- Sửa số khách tăng/giảm cấp thêm/trả bớt đúng.
- Nhập lô: trùng mã vé bị loại; tên tệp lạ bị từ chối rõ ràng; ảnh chụp màn hình đọc được hoặc báo cần sửa tay.
- Bảo mật: mã vé không có trong nhật ký, phản hồi ghi, câu lỗi; đường dẫn khách chỉ lưu băm, hết hạn thì từ chối, thu hồi thì từ chối.
- Quyền: mọi route mới khai `access`; vai không có quyền nhận 403; bài ghim hàng quyền.
- Kiểm độc lập (chỉ đọc) trước khi nói xong; e2e vì chạm API/migration.
