# Đăng ký và duyệt tài khoản đối tác — bản thiết kế khung (15/11/2026)

> **Hồ sơ có ngày; viết xong là đóng băng.** Trạng thái: **đề xuất, chờ chủ duyệt khung**. Chưa có ADR, chưa có kế hoạch thi công, chưa có mã. Đã qua một lượt đọc soát độc lập (chỉ đọc) ngày 15/11.
> Trang cho chủ đọc: `README.md` cùng thư mục. Phiên soạn giữ vai **lập kế hoạch** (P15): không thi công, không tự nghiệm thu.
> Nguồn yêu cầu: chat của chủ 15/11/2026. Chủ chốt cùng ngày (nút trả lời, nguyên văn): «Ghi cho công ty» — công ty đăng ký thì đơn, hoa hồng, công nợ ghi cho công ty.
> `ĐK-1…ĐK-6`, tên bảng `dk_*`, tên trạng thái, tên nút trong tệp này là **tên giữ chỗ**. Tên hiện cho người dùng do chủ chọn theo công thức z34 trước khi làm giao diện (Hiến chương 5.27).

## 1. Mục đích và phạm vi

**Chủ muốn:** đối tác **tự đăng ký** tài khoản, cá nhân hoặc tổ chức; tự cung cấp thông tin và giấy tờ (tuỳ thân, doanh nghiệp) để công ty **xác minh**; thông tin đã xác minh dùng luôn cho **hoá đơn VAT**; tệp đính kèm nằm ở kho R2 và Toàn quyền **xem lại, ẩn, xoá** được; đăng ký được bằng **Google, Apple** cho nhanh trên iPhone; **sẵn cho mở rộng** như Affiliates.

**Làm, chia bốn đợt (mục 6):** (1) phiếu đăng ký, xác minh, duyệt mở tài khoản cho cá nhân; (2) phiếu đăng ký cho tổ chức; (3) màn quản lý tệp hồ sơ của Toàn quyền; (4) đăng ký và đăng nhập bằng Google, Apple.

**Không làm trong khung này:** khách lẻ tự đăng ký; chương trình Affiliates có tính tiền; nhiều nhân viên của một tổ chức cùng đăng nhập và thấy chung đơn (`BL-DAI-LY-TO-CHUC`, chủ gác 24/10); xác nhận số điện thoại bằng SMS hay Zalo; máy tự đọc giấy tờ; hoá đơn điện tử (ADR-0004 đã loại).

**Coi là hỏng, dù chạy được, nếu:** người chưa được duyệt đọc được bất kỳ dữ liệu nào của Nền tảng; một người hay một công ty thành hai hồ sơ; ảnh giấy tờ của phiếu bị từ chối, bị rút, hết hạn còn nằm lại trong kho; số giấy tờ, số điện thoại, email lọt vào nhật ký; một người tự đăng ký rồi tự duyệt cho mình.

## 2. Hiện trạng (đọc mã và tài liệu ngày 15/11)

| Mảng | Đã có | Còn thiếu |
|---|---|---|
| Tài khoản | Nhân sự hoặc Toàn quyền tạo (`account.create`), theo vai trò. Đăng nhập bằng số điện thoại và PIN, Face ID, lớp hai (ứng dụng xác thực, mã email) | Không có lối tự đăng ký. Đường tạo tài khoản chỉ nhận **hồ sơ cá nhân**: gặp hồ sơ tổ chức thì từ chối bằng câu «Tài khoản chung cho công ty làm ở giai đoạn sau» (`createAccountWithRolesStatements`), dù ADR-0018 điều 9 đã định «công ty lữ hành dùng một tài khoản chung gắn hồ sơ công ty» |
| Tự khai và xác minh | Người đã có tài khoản tự khai ngày sinh, địa chỉ, giấy tờ (`pty_self_submission`). Quản trị và Nhân sự xác minh, có tách nhiệm vụ (ADR-0124, ADR-0125) | Phiếu giấy tờ hôm nay **chỉ từ chối được, chưa chấp nhận được**, vì phiếu chưa mang ảnh (`BL-TK-ANH`, `BL-XM-ANH`). Phiếu chỉ nhận hồ sơ cá nhân (`BL-TK-TO-CHUC`). Người khai không thấy lý do bị từ chối và không nhận tin báo nào |
| Tệp | Kho R2 riêng `HO_SO`: tải qua máy chủ, nhật ký ghi trước, không lưu đệm (ADR-0123). Có đường tải lên, mở xem, liệt kê theo từng dòng giấy tờ; có danh sách ảnh hết lý do giữ và hàng chờ xoá kho | Các đường tải lên và mở xem **chỉ Toàn quyền dùng được** và **chưa có màn hình nào gọi** (`BL-TEP-GIAO-DIEN`). Chưa có một màn thấy mọi tệp, chưa có «ẩn» tệp, chưa có lệnh gỡ một tệp theo ý người. Mỗi dòng tệp **bắt buộc thuộc một hồ sơ có thật và không đổi được hồ sơ**, nên ảnh của người chưa có hồ sơ chưa có chỗ nằm. Việc treo `BL-TEP-EXIF` (chưa bỏ được toạ độ chụp ở máy chủ) |
| Hồ sơ tổ chức | `pty_organization` giữ tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn. Bảng giấy tờ tổ chức gieo sẵn năm loại (đăng ký kinh doanh, lữ hành nội địa, lữ hành quốc tế, lưu trú, vận tải). Hồ sơ tổ chức mang vai trò đối tác **đã làm bên đặt, người hưởng hoa hồng, chủ công nợ, chủ hạn mức được** khi văn phòng lập đơn hộ (ADR-0155) | Giấy tờ tổ chức mới có bảng, chưa có đường ghi nào. Mã số thuế chưa là khoá duy nhất (`BL-MST-UNIQUE`); chưa gộp được hồ sơ tổ chức. Tổ chức chưa tự khai được |
| Hoá đơn | Người giữ quyền xem Danh bạ (trong đó có Kế toán) đọc được bốn trường hoá đơn của hồ sơ tổ chức | Chưa có chức năng «yêu cầu hoá đơn» (hai ô quyền `invoice.*` mới là ô giữ chỗ). Kết quả xác minh chưa hiện ở đâu, nên Kế toán chưa phân biệt được thông tin đã xác minh với chưa |
| Riêng tư | Chính sách có phiên bản, dòng đồng ý, phiếu xin xoá, ẩn danh hoá (ADR-0126) | Theo `docs/HANDOFF-N1.md`, bản chính thức **chưa đăng chính sách riêng tư** (chờ luật sư duyệt chữ), nên phần tự khai đang nằm chờ. Chưa có đường công khai nào để đọc chính sách |
| Google, Apple | ADR-0016 (23/9) đã duyệt Google làm chìa khoá phụ, kèm câu «không tự tạo tài khoản, không ghép theo email» | Chưa có dòng mã nào cho Google. Apple chưa có quyết định |
| Xác nhận liên hệ | Gửi mã qua email đã có trong mã và đã phát hành (cho lớp hai) | Theo `docs/HANDOFF-N1.md`, **chưa ai thử gửi thư thật** trên bản chính thức. Không có SMS hay Zalo, nên chưa xác nhận được số điện thoại bằng mã |
| Lớp hai của đối tác | Tài khoản đối tác tự bật được lớp hai (ADR-0074) | ADR-0121 «bắt buộc lớp hai cho tài khoản bên ngoài» đã duyệt nhưng **chưa thi công**: hôm nay đối tác đăng nhập chỉ bằng số điện thoại và PIN |
| Hoa hồng, giới thiệu | Vai trò bên ngoài, loại đối tác, cấp độ đại lý, sổ công nợ | Quan hệ giữa hai hồ sơ mới có hai loại («Người liên hệ của», «Tài xế của»); chưa có «người giới thiệu», chưa có «người đại diện» |

## 3. Hai luật xuyên suốt (khuôn trước, việc sau)

**Luật 1 — Người chưa được duyệt không có phiên của Nền tảng.** Phiên đăng nhập của Nền tảng chỉ cấp cho tài khoản đã được một người có trách nhiệm tạo hoặc duyệt. Người đang đăng ký chỉ có **phiên đăng ký**: một cookie khác, ký bằng khoá và tiền tố riêng, chỉ mở được **đúng phiếu của mình** qua một tập route đóng. Hệ quả: route khai `staff` trở lên không bao giờ phải tính tới người lạ; món nợ «đường đọc sau cổng `staff` chưa canh» (DK-T3-04, tờ khai Kernel 18 dòng 4) không bị người lạ chạm tới.

**Luật 2 — Phiếu trước, hồ sơ và tài khoản sau.** Mọi thứ người đăng ký khai là **đề xuất nằm trong phiếu**: mở rộng Hiến chương 5.23 từ «từng dòng dữ liệu» sang «cả một bộ hồ sơ kèm tài khoản». Chỉ **lệnh duyệt** mới ghi vào bảng hồ sơ và bảng tài khoản. Trước lệnh đó, một người **xem được Danh bạ** phải chọn rõ «gắn vào hồ sơ có sẵn» hay «tạo hồ sơ mới», sau khi máy đưa ra các hồ sơ có thể trùng (Hiến chương 2.1: một người, một tổ chức chỉ một hồ sơ).

**Rào máy đi kèm** (đợt 1 dựng; ghi `docs/SO-HANG-RAO.md` sau khi thấy chặn thật một lần):

- cookie phiên đăng ký bị hàm kiểm phiên của Nền tảng từ chối, và ngược lại (khuôn «tách khoá ký» của ADR-0016 Đ8);
- route nhận phiên đăng ký là một danh sách đóng trong bài ảnh chụp cổng (`src/route-access.test.ts`); thêm route mà chưa khai thì bài đỏ;
- đợt 1 **không thêm cửa cấp phiên nào**: kích hoạt chỉ đặt PIN, rồi người dùng đăng nhập bằng cửa PIN sẵn có, nên bài «bốn cửa cấp phiên» (`src/modules/auth/cap-phien-bon-cua.test.ts`) giữ nguyên;
- bài quét: chỉ lệnh duyệt gọi các hàm sinh hồ sơ và tài khoản từ dữ liệu phiếu; bảng `dk_*` không có view công bố mang nội dung khai, không được nối vào đường đọc nghiệp vụ nào.

Người soạn đề xuất đưa hai luật thành **một điều Hiến chương mới** (diff riêng, chủ duyệt theo điều 6.4), trình cùng lượt ADR đợt 1.

## 4. Phương án đã cân nhắc

| | Phương án | Được | Mất |
|---|---|---|---|
| A | **Tài khoản chờ duyệt:** tạo ngay hồ sơ và tài khoản không quyền; người đăng ký khai trong «Hồ sơ của tôi» | Dùng lại gần hết phần tự khai; một lối cho cả người mới lẫn người cũ | Người lạ có phiên thật của Nền tảng. Hồ sơ sinh ra **trước** khi đối chiếu Danh bạ nên chắc chắn có trùng, phải gộp về sau. Đăng ký bỏ dở để lại dòng tài khoản và dòng hồ sơ không xoá được. Số điện thoại bị giữ chỗ |
| **B (chọn)** | **Phiếu đăng ký riêng; duyệt xong mới sinh hồ sơ và tài khoản** | Ranh giới tin cậy rõ (Luật 1). Không trùng hồ sơ (Luật 2). Bảng lõi sạch. Google, Apple chỉ là một cách chứng minh danh tính ở bước phiếu; tài khoản vẫn do người duyệt sinh ra, nên đảo ADR-0016 Đ3 ở mức hẹp nhất | Thêm một lối riêng cho người đăng ký (phiên đăng ký, biểu mẫu, trang trạng thái). Người đã có tài khoản muốn bổ sung giấy tờ vẫn đi «Hồ sơ của tôi»: hai lối, dùng chung luật kiểm đầu vào và kho tệp |
| C | Chỉ đăng ký theo lời mời do văn phòng gửi | An toàn nhất, ít rác | Không còn là «tự đăng ký»; văn phòng vẫn phải khởi động từng người |
| D | Dịch vụ danh tính ngoài (Auth0, Clerk, Cloudflare Access) | Có sẵn Google, Apple | ADR-0016 đã loại: phí theo người, thêm một nơi giữ dữ liệu cá nhân, thêm phụ thuộc |

Chủ giao phần «làm thế nào» cho người soạn; người soạn chọn **B**. Lý do quyết định: với cửa đăng ký mở cho cả internet, hai rủi ro lớn nhất là người lạ lọt vào trong và hồ sơ trùng; B chặn cả hai bằng cấu trúc, A chỉ chặn bằng việc rà từng route và gộp hồ sơ về sau.

**Bằng chứng từ mã cho việc loại A** (đọc 15/11, chưa đăng nhập thử):

- Tài khoản không có mã quyền nào vẫn gọi được 32 đường sau cổng `staff`, trong đó có danh sách mọi địa điểm, danh sách nhóm hỗ trợ, và đường gửi thư mã tới một địa chỉ bất kỳ. Ngược lại «Hồ sơ của tôi» lại **đóng** với họ, vì các ô tự phục vụ xét theo mã quyền. Phương án A vì thế phải vừa đóng bớt vừa mở thêm.
- Số điện thoại đăng nhập là khoá duy nhất và dòng tài khoản không xoá được: mỗi lượt đăng ký, kể cả bị từ chối, giữ một số mãi.
- Hồ sơ mới hiện ngay ở Danh bạ, và văn phòng chọn được một hồ sơ cá nhân chưa có vai trò làm bên đặt.
- Bất biến «tài khoản đang hoạt động không có quyền nào» làm bộ e2e (chạy mức nghiêm) đỏ.

## 5. Mô hình

### 5.1 Ba thứ tách nhau

- **Phiếu đăng ký** (mới): đối tượng có vòng đời (K5, K9); là đơn vị được xác minh và duyệt. Mã do máy cấp theo Hiến chương 5.26, tiền tố đề xuất `DK` (chưa dùng trong `src/shared/ma-dinh-danh.ts`).
- **Hồ sơ** (đã có): người hoặc tổ chức. Chỉ được sinh, hoặc được gắn, lúc duyệt.
- **Tài khoản** (đã có): chỗ đăng nhập. Chỉ sinh lúc duyệt; vai trò đối tác gán trong cùng lô.

### 5.2 Vòng đời của phiếu (tên giữ chỗ)

```
Xác nhận danh tính (mã gửi email; đợt 4 thêm Google, Apple)
        │
        ▼
   ĐANG ĐIỀN ──gửi──▶ CHỜ XÁC MINH ──đạt──▶ CHỜ DUYỆT ──duyệt──▶ ĐÃ DUYỆT ──▶ kích hoạt: tự đặt PIN
        ▲                  │                                        (sinh hồ sơ + tài khoản + vai trò)
        └──sửa, gửi lại── CẦN BỔ SUNG

Từ mọi trạng thái chưa kết thúc:  TỪ CHỐI (người của công ty) · ĐÃ RÚT (người đăng ký) · HẾT HẠN (máy)
```

- Trạng thái kết thúc không đổi nữa. Trước đó phiếu chỉ quay lại ĐANG ĐIỀN qua đúng một đường là CẦN BỔ SUNG. Nội dung mỗi lần gửi là một bản bất biến (lần gửi lại là bản mới), để người xác minh và người duyệt cùng nhìn một bản.
- **Gửi** đòi: đã đồng ý đúng phiên bản chính sách riêng tư đang hiệu lực (Hiến chương 5.21) và đủ mục bắt buộc của loại phiếu.
- **Cần bổ sung** và **từ chối** dùng lý do thuộc **danh sách đóng**, không ô chữ tự do (khuôn ADR-0125 đ6).
- Phiếu kết thúc bằng từ chối, rút hoặc hết hạn: ảnh vào hàng xoá ngay, nội dung cá nhân trong phiếu được ẩn danh (mục 8).

### 5.3 Ai làm gì

| Bước | Ai | Điều kiện |
|---|---|---|
| Điền, gửi, sửa theo yêu cầu, rút phiếu | Người đăng ký (phiên đăng ký) | Chỉ phiếu của mình |
| **Xác minh và đối chiếu Danh bạ**: mở ảnh và số đủ của phiếu đang chờ, đánh dấu từng mục đạt hay không đạt, gọi số điện thoại để xác nhận, rồi chọn «gắn vào hồ sơ có sẵn» hay «hồ sơ mới» | **Quản trị, Toàn quyền**: giữ hai ô xác minh sẵn có (`party.verify`, `party.verify.attachment`) và xem được Danh bạ | Mỗi lần mở ảnh ghi nhật ký **trước** (ADR-0125 đ1). Xử lý xong thì không xem lại được nội dung khai. Nhân sự cũng giữ hai ô xác minh nhưng không xem Danh bạ (ADR-0071), nên không làm trọn bước này |
| **Duyệt mở tài khoản**: chọn vai trò, bấm duyệt hoặc từ chối | **Nhân sự, Toàn quyền**: dùng lại ô tạo tài khoản sẵn có (`account.create`), không thêm ô mới | **Khác người đã xác minh phiếu đó** (áp ADR-0125 đ5 vào ca mới: người xác minh khác người tạo tài khoản). «Người xác minh» ở đây là người đã bấm «đạt» cho bản được duyệt. Ngoại lệ duy nhất: không còn ai hợp lệ thì **Toàn quyền** được làm cả hai bước, và dòng duyệt mang cờ (khuôn «chốt cuối» của ADR-0125 đ5). Người duyệt thấy họ tên, số điện thoại, loại đối tác xin đăng ký, kết luận xác minh và kết luận «gắn hồ sơ có sẵn» hay «hồ sơ mới»; **không** thấy ảnh, số giấy tờ, ngày sinh, địa chỉ, không thấy Danh bạ |
| Mở hay đóng việc đăng ký; đặt hạn ngày; danh sách mục bắt buộc | Toàn quyền | Dữ liệu chính sách có ngày hiệu lực, chỉ thêm dòng (khuôn `ord_pickup_time_policy`) |
| Cho phiếu hết hạn; đưa ảnh của phiếu đã kết thúc vào hàng xoá | Tác nhân tự động có định danh riêng | Khuôn ADR-0186: một ô quyền riêng, có dòng nhật ký |

Không thêm **mã quyền** nào (thêm một mã là nhân đôi mọi bài «tập con quyền»). Chỉ thêm **hàng** vào bản đồ quyền cho ba việc mới: xem hàng chờ phiếu, đặt chính sách đăng ký, và việc của tác nhân tự động.

Hai điểm ADR `ĐK-2` phải viết rõ, vì chúng chạm quyết định cũ:

- Đường xác minh phiếu đăng ký hỏi cả hai ô xác minh **và** quyền xem Danh bạ. Nhân sự giữ hai ô xác minh (ADR-0125) nhưng không mở được ảnh hay số giấy tờ của phiếu đăng ký.
- Duyệt «gắn vào hồ sơ có sẵn» dùng hồ sơ do người xác minh chọn, kể cả khi Nhân sự không được thấy hồ sơ đó. Đường tạo tài khoản hôm nay chặn việc này (ADR-0071 điều 3b), nên lệnh duyệt là một ngoại lệ có tên của điều đó.

### 5.4 Lệnh duyệt là một lô

Một lần bấm duyệt là **một `db.batch()`** (K8), câu đầu mang điều kiện «phiếu còn ở CHỜ DUYỆT, đúng bản đã xác minh, đã có kết luận đối chiếu Danh bạ, người duyệt khác người xác minh (hoặc là Toàn quyền, khi đó gắn cờ)»; mọi câu sau chỉ chạy khi câu đầu thắng:

1. hồ sơ: tạo mới hoặc gắn hồ sơ có sẵn; ghi các giá trị đã xác minh (ngày sinh, địa chỉ, giấy tờ, liên hệ) và một dòng xác minh cho từng mục (`pty_verification`: ai xác minh, lúc nào);
2. dòng đồng ý chính sách riêng tư (`pty_consent`) chép từ phiếu;
3. tệp chờ của phiếu thành tệp của hồ sơ, nối với dòng giấy tờ vừa tạo (xem «Dữ liệu mới» của đợt 1);
4. tài khoản: số điện thoại đăng nhập, vai trò đối tác và bộ quyền sinh từ vai trò (đường tạo theo vai trò sẵn có của `staff`). PIN do máy sinh **không hiện cho ai**, nên chưa ai đăng nhập được cho tới bước kích hoạt;
5. email liên lạc đã xác nhận ghi thành liên hệ của hồ sơ. Lệnh duyệt **không** tự bật lớp hai (xem câu còn chờ chủ ở mục 11). Đợt 4 thêm: danh tính Google, Apple đã chứng minh ở bước phiếu thành chìa khoá đăng nhập của tài khoản;
6. nếu người xác minh đã chọn được hồ sơ của người giới thiệu: một dòng quan hệ giữa hai hồ sơ (mục 9);
7. phiếu sang ĐÃ DUYỆT, ghi mã hồ sơ và tài khoản kết quả; nhật ký chỉ mang mã và tên vai trò.

Mỗi module chỉ ghi bảng của mình và cấp **câu lệnh chưa chạy** cho gốc lắp ráp ghép lô (Hiến chương 5.3). Thư báo «đã duyệt» gửi **sau** lô, có trạng thái chờ gửi lại (5.16).

Dòng nhật ký của lệnh duyệt được xếp vào tầng «người tạo tài khoản» của lính gác tách nhiệm vụ (ADR-0125 đ5b; danh sách hằng ở `src/modules/audit/cham-tai-khoan.ts`), để người duyệt không xác minh được các phiếu tự khai về sau của chính tài khoản đó.

### 5.5 Kích hoạt

Người được duyệt mở lại trang trạng thái bằng **đúng danh tính đã dùng để đăng ký**, rồi **tự đặt PIN** theo luật PIN sẵn có. Không ai trong công ty biết PIN, và không gửi PIN qua thư.

Kích hoạt **chỉ đặt PIN, không cấp phiên**. Đặt xong, người dùng đăng nhập ở màn Đăng nhập như mọi người, rồi được mời bật Face ID (ADR-0016). Nhờ vậy không phải thêm cửa cấp phiên, và không vướng luật «`auth` không gọi `audit`». Đây vẫn là một **đường đặt PIN mới**, phải khai vào các bài rào về bí mật đăng nhập của `staff`. Đường này đóng khi tài khoản đã đặt PIN. Quá hạn kích hoạt thì người duyệt bấm gửi lại lời mời.

## 6. Bốn đợt

Mỗi đợt tự dùng được khi xong. Kế hoạch thi công từng đợt soạn **sát lúc làm**, sau khi nhập bản chính mới nhất, để khỏi cũ.

### Đợt 1 — Phiếu đăng ký, xác minh, duyệt, cho cá nhân

**Người dùng nhận được:** đối tác cá nhân tự đăng ký trên điện thoại; công ty xác minh rồi duyệt; người được duyệt tự đặt PIN và dùng ngay.

**Dữ liệu mới** — module mới `dang-ky`, tiền tố bảng `dk_`, xếp hạng «nghiêm» ngay từ đầu:

- phiếu; **danh tính đã chứng minh** của phiếu, tách khỏi **email liên lạc đã xác nhận** (đợt 1 hai thứ trùng nhau; đợt 4 thì khác, vì Apple có thể không cho email); nội dung khai theo **từng lần gửi** (cột có kiểu, soi theo cột của bảng hồ sơ để chép một–một lúc duyệt; không JSON tự do — Hiến chương 5.2); kết luận từng mục (chỉ thêm); chính sách đăng ký (chỉ thêm, có ngày hiệu lực); mã gửi email (chỉ lưu bản băm, có hạn, có đếm lần thử);
- **ảnh của phiếu nằm ở một bảng «tệp chờ» riêng do `parties` giữ**, cùng kho `HO_SO` (chỉ `parties` chạm kho này), khoá theo mã phiếu. Không dùng được bảng tệp hôm nay, vì mỗi dòng `pty_attachment` bắt buộc thuộc một hồ sơ có thật và không đổi được hồ sơ, mà Luật 2 cấm sinh hồ sơ trước khi duyệt. Lúc duyệt, lệnh duyệt sinh dòng `pty_attachment` cho hồ sơ vừa có, trỏ đúng tệp đã nằm trong kho (không chép tệp), rồi nối với dòng giấy tờ; dòng tệp chờ ghi mốc «đã chuyển». Phương án bị loại: dựng lại bảng tệp cho phép chưa có hồ sơ (bảng chỉ-thêm đang có trigger khoá, dựng lại là việc lớn và rủi ro hơn);
- **lịch sử các lệnh của người đăng ký** (gửi, gửi lại, rút, tải ảnh) nằm ở bảng sự kiện chỉ-thêm của chính phiếu, **không** vào nhật ký chung. Người đăng ký không phải tài khoản, cũng không phải tác nhân, mà nhật ký chung chỉ nhận một trong hai. Lệnh của người trong công ty và của tác nhân vẫn vào nhật ký chung như mọi lệnh khác.

**Quyền:** thêm hàng cho «xem hàng chờ phiếu đăng ký», «đặt chính sách đăng ký», và một hàng cho tác nhân «cho phiếu hết hạn». Duyệt mở tài khoản dùng lại ô `account.create`. Việc xác minh dùng lại hai ô `party.verify`, `party.verify.attachment`, kèm quyền xem Danh bạ: hai ô này từ nay chạm thêm một loại «phiếu đang chờ», nên trang ghép của lượt duyệt phải nêu rõ.

**Nội dung phiếu cá nhân** (mặc định; danh sách mục bắt buộc là dữ liệu chính sách): họ tên; số điện thoại; loại đối tác muốn đăng ký; ngày sinh; địa chỉ; giấy tờ tuỳ thân (loại, số, ngày cấp, nơi cấp, ảnh hai mặt); người giới thiệu (tuỳ chọn). Email liên lạc đã xác nhận cũng là nơi nhận hoá đơn của cá nhân; trường hoá đơn khác (ví dụ mã số thuế cá nhân) chờ Kế toán xác nhận, nếu cần thì thêm một loại giấy tờ chứ không thêm cột.

**Loại đối tác cho phiếu cá nhân:** bốn vai trò của cá nhân (Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên). **«Công ty lữ hành» chỉ đăng ký được bằng phiếu tổ chức của đợt 2.** Nếu cho chọn ở phiếu cá nhân thì công ty sẽ đứng tên một người, trái điều chủ đã chốt, và đợt 2 phải chuyển cả tài khoản lẫn sổ.

**Màn hình:** người đăng ký có trang đăng ký công khai nhiều bước và trang trạng thái (nơi thấy lý do cần bổ sung, và nơi đặt PIN khi được duyệt). Công ty có hàng chờ phiếu trong khu Quản lý tài khoản, cạnh hàng chờ xác minh sẵn có; màn một phiếu cho người xác minh (từng mục, ảnh, kết luận, hồ sơ có thể trùng); bước duyệt cho Nhân sự (chọn vai trò). Toàn quyền có công tắc và chính sách. Màn Đăng nhập thêm lối vào đăng ký, đặt cùng chỗ với ba liên kết công khai của ADR-0200 Đ3.

**Dùng lại, không làm mới:** luật kiểm ngày sinh, địa chỉ, giấy tờ của phiếu tự khai; hàm nhận loại tệp theo chữ ký và hàm thu nhỏ ảnh ở trình duyệt; danh sách lý do từ chối sẵn có (tám mã) làm gốc cho danh sách của phiếu; đường tạo tài khoản theo vai trò; luật đặt PIN; bộ đếm chống dò; Turnstile; hàm tìm hồ sơ có thể trùng (theo số điện thoại liên hệ và tên; thêm số giấy tờ).

**Điều mới mà người ngoài nhìn thấy:** người đăng ký thấy **lý do** cần bổ sung hay bị từ chối. Hôm nay người tự khai không thấy lý do. Câu chữ của từng lý do vì thế phải viết cho người ngoài đọc và do chủ chọn.

**Thư gửi cho người đăng ký:** mã xác nhận; «cần bổ sung»; «đã duyệt»; «bị từ chối». Không gửi thư «sắp hết hạn» ở đợt 1; hạn hiện trên trang trạng thái. Mỗi thư gửi sau lô ghi và có trạng thái chờ gửi lại (5.16).

**Phải giải ngay trong lượt ADR đợt 1:**

- Đường công khai để đọc chính sách riêng tư (ADR-0200 Đ3 đã duyệt, chưa làm) đi cùng đợt này, vì biểu mẫu phải dẫn tới đúng phiên bản đang hiệu lực.
- Các route ghi của người đăng ký **không đi qua lớp chống ghi trùng** (lớp đó chỉ chạy cho route có tài khoản đăng nhập — ADR-0094). Mỗi route phải khai một mục miễn và mục miễn cần chủ duyệt; đợt 1 vì thế phải **tự chống bấm hai lần** cho gửi phiếu, tải ảnh, đặt PIN. Hệ quả: việc treo `BL-TEP-PHAT-LAI-500` không chặn đợt 1; nó chỉ chặn ngày mở tải ảnh cho người đã đăng nhập.
- Trần dung lượng cho cửa công khai, đề xuất thấp hơn 10 MB, vì chưa ai đo bộ nhớ của máy chủ với một thân yêu cầu khoảng 14 MB.

**Tiêu chí nghiệm thu (P20), bằng hành vi kiểm được:**

1. Phiên đăng ký gọi bất kỳ route nào ngoài nhóm đăng ký thì bị từ chối; cookie đăng ký không qua được hàm kiểm phiên của Nền tảng.
2. Chưa có chính sách riêng tư đang hiệu lực, hoặc chưa đồng ý đúng phiên bản: không gửi được phiếu, câu báo tiếng Việt.
3. Công tắc đóng: **không mở được phiếu mới**. Phiếu đã có vẫn đi tiếp: vào lại bằng mã, xem trạng thái, sửa và gửi lại, rút, đặt PIN. Muốn dừng hẳn mọi thứ thì dùng chế độ bảo trì sẵn có.
4. Gửi phiếu, tải ảnh không sinh dòng nào ở các bảng hồ sơ, bảng tệp của hồ sơ và bảng tài khoản.
5. Người xác minh mở ảnh: có dòng nhật ký ghi trước; không ghi được nhật ký thì không trả tệp; nhật ký không chứa số giấy tờ, số điện thoại, email. Nhân sự gọi đường mở ảnh của phiếu thì bị từ chối.
6. Người đã xác minh một phiếu bấm duyệt chính phiếu đó: bị từ chối ngay ở câu ghi, kể cả khi hai người bấm cùng lúc. Riêng Toàn quyền duyệt được, và dòng duyệt mang cờ.
7. Duyệt là đúng một lô: hồ sơ, tài khoản, vai trò, dòng xác minh, dòng đồng ý, tệp của hồ sơ cùng xuất hiện hoặc không gì cả. Số điện thoại đã có tài khoản thì lô không ghi gì và người duyệt nhận câu báo.
8. Duyệt «gắn vào hồ sơ có sẵn» không sinh hồ sơ mới; hồ sơ đã có tài khoản thì bị từ chối.
9. Kích hoạt chỉ nhận đúng danh tính của phiếu, chỉ khi tài khoản chưa đặt PIN; đặt xong thì cửa đóng.
10. Từ chối, rút, hết hạn: ảnh vào hàng xoá; nội dung phiếu ẩn danh sau hạn; lỗi kho thì còn dòng chờ để chạy lại.
11. `audit-invariants` có bất biến mới: phiếu ĐÃ DUYỆT khi và chỉ khi có tài khoản kết quả; không phiếu đã kết thúc nào còn ảnh ngoài hàng xoá.

**Việc lớn** (dữ liệu, quyền, luật): thi công xong phải có người kiểm độc lập, e2e, kịch bản Chrome, và thử iPhone thật (máy ảnh chụp giấy tờ, ảnh HEIC).

**Cần chủ duyệt, một lượt, ba quyết định, kèm trang ghép:** `ĐK-1` phiếu đăng ký và phiên đăng ký (kèm diff điều Hiến chương của mục 3); `ĐK-2` xác minh, duyệt mở tài khoản, kích hoạt; `ĐK-3` tệp của phiếu và việc máy tự dọn phiếu đã kết thúc.

### Đợt 2 — Phiếu đăng ký cho tổ chức

**Người dùng nhận được:** công ty tự đăng ký; tài khoản gắn thẳng hồ sơ công ty, nên đơn, hoa hồng, công nợ, hạn mức Trả sau ghi cho công ty; Kế toán thấy thông tin hoá đơn nào đã xác minh.

**Căn cứ:** không cần nguyên tắc mới. ADR-0018 điều 9 (chủ duyệt 24/9) đã định «công ty lữ hành dùng một tài khoản chung gắn hồ sơ công ty»; ADR-0077 điều 3 và ADR-0081 điều 1 viết theo đúng giả định đó; ADR-0155 ghi phần này «chưa thi hành». Đợt 2 là lần đầu thi hành. Lựa chọn «Ghi cho công ty» của chủ ngày 15/11 trùng với căn cứ này.

**Vì sao nhẹ hơn tưởng:** hồ sơ tổ chức mang vai trò đối tác hôm nay đã làm bên đặt, người hưởng, chủ công nợ, chủ hạn mức được. Khoảng mười hai chỗ trong mã tiền đang so «hồ sơ của tài khoản» với bên đặt; gắn tài khoản thẳng vào hồ sơ công ty thì các phép so ấy tự đúng, **không phải sửa luật tiền nào**. Cơ sở dữ liệu không cấm tài khoản trỏ hồ sơ tổ chức; chỉ một chốt trong mã đang chặn (`createAccountWithRolesStatements`).

**Hướng đã cân nhắc và không chọn:** tài khoản gắn hồ sơ riêng của người đại diện rồi «hành động thay» công ty. Hướng này sửa khoảng mười chín chỗ, có cả một trigger và một bất biến về tiền, và phải thay câu chữ của ADR-0178; đó chính là việc đã gác (`BL-DAI-LY-TO-CHUC`).

**Phải làm:**

- Phiếu loại tổ chức: tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn; giấy chứng nhận đăng ký kinh doanh (số, ngày cấp, nơi cấp, ảnh) và giấy phép theo ngành nếu có; họ tên, số điện thoại, căn cước của **người đại diện**.
- Bước xác minh đối chiếu Danh bạ **theo mã số thuế** (hôm nay hàm tìm trùng chỉ xét hồ sơ cá nhân). Lệnh duyệt cho tổ chức gắn hoặc tạo hồ sơ tổ chức theo kết luận đó; gắn vai trò đối tác cho hồ sơ tổ chức; tạo tài khoản trỏ hồ sơ tổ chức. Người đại diện là một **hồ sơ người** nối với tổ chức bằng một loại quan hệ mới («Người đại diện của»), giấy tờ của họ nằm ở hồ sơ người. Ngày công ty cần thêm nhân viên, người đại diện đã có sẵn hồ sơ.
- Dựng đường ghi cho giấy tờ tổ chức (hôm nay mới có bảng).
- Gỡ chốt «chỉ hồ sơ cá nhân» ở đường tạo tài khoản, **chỉ cho lệnh duyệt phiếu tổ chức**. Rà các đường đang giả định hồ sơ của tài khoản là người: đổi tên tài khoản, «Hồ sơ của tôi», phiếu xin xoá.
- Danh bạ hiện dấu «đã xác minh» cạnh bốn trường hoá đơn, để Kế toán biết thông tin nào dùng được.

**Biết trước:**

- Một hồ sơ chỉ có một tài khoản (chỉ mục `staff_party_uq`), nên mỗi công ty một tài khoản dùng chung. Cho từng nhân viên một tài khoản riêng vẫn là việc đã gác; khi mở cần quyết định mới thay câu «tài khoản chung». Sổ thì không phải chuyển, vì đã đứng tên công ty từ đầu.
- Tài khoản công ty chưa tự khai bổ sung và chưa tự xin xoá được (`BL-TK-TO-CHUC`, `BL-XOA-TO-CHUC`); trong lúc đó Quản trị sửa hộ. Hai kho ứng dụng đòi mọi tài khoản tự đăng ký đều xin xoá được, nên lối xin xoá (ADR-0200 Đ4) phải nhận cả tài khoản công ty trước khi bản có đăng ký lên kho.
- Chìa khoá Google, Apple (đợt 4) của tài khoản công ty thực chất thuộc về người đại diện. Người đó nghỉ thì Quản trị gỡ chìa khoá, người mới gắn lại (luật gỡ đã có ở ADR-0016 Đ6).

**Tiêu chí nghiệm thu:** tài khoản công ty lập đơn thì bên đặt, người hưởng, dòng sổ, hạn mức đều là hồ sơ công ty (bài e2e mới; sổ vàng hiện có xanh nguyên, không sửa đáp án); hai phiếu cùng mã số thuế thì người duyệt thấy cảnh báo trùng; Kế toán thấy dấu đã xác minh; hồ sơ người đại diện có giấy tờ đã xác minh và có quan hệ với công ty.

**Việc lớn** (dữ liệu, quyền, chạm vùng tiền dù không đổi luật): người kiểm độc lập bắt buộc.

**Cần chủ duyệt:** `ĐK-4` thi hành ADR-0018 điều 9 qua đường đăng ký: tài khoản gắn hồ sơ tổ chức; quan hệ người đại diện; và mã số thuế có thành khoá duy nhất không (câu `BL-MST-UNIQUE` chủ gác ngày 21/9).

### Đợt 3 — Màn quản lý tệp hồ sơ của Toàn quyền

- Một màn liệt kê mọi tệp trong kho hồ sơ: tệp của hồ sơ, tệp của phiếu đang chờ, tệp đang chờ xoá, tệp đã xoá; lọc theo trạng thái và loại. Màn này đọc hai nguồn: bảng tệp của hồ sơ và bảng tệp chờ của phiếu (đợt 1). Danh sách không hiện số giấy tờ. Hôm nay chưa có đường nào liệt kê cả kho; chỉ có ba cách xem hẹp (theo từng dòng giấy tờ, danh sách ảnh hết lý do giữ, hàng chờ xoá kho), và hàng chờ xoá kho chưa có màn hình.
- Ba việc trên một tệp:
  - **Mở xem:** nhật ký ghi trước; dùng ô `party.attachment.view` sẵn có, chỉ Toàn quyền.
  - **Ẩn, hiện lại** (mới, đảo ngược được): tệp đang ẩn thì người xác minh không mở được, Toàn quyền vẫn thấy và hiện lại được. Bảng tệp hôm nay chỉ có các mốc lưu và xoá, nên «ẩn» cần dữ liệu mới.
  - **Xoá** (mới): gỡ hẳn một tệp khỏi kho theo ý Toàn quyền, phải ghi lý do, không lấy lại được; dòng dữ liệu ở lại kèm mốc xoá. Hôm nay muốn bỏ một ảnh tải nhầm phải huỷ cả dòng giấy tờ rồi chờ nó vào danh sách hết lý do giữ.
- Phạm vi là kho hồ sơ `HO_SO`. Các kho khác (vé hỗ trợ, biên lai, ảnh vé, ảnh dịch vụ, tin thông báo) do module của chúng giữ; gom về một màn cần mỗi module công bố một hàm liệt kê, để sau.
- **Tiêu chí nghiệm thu:** Toàn quyền ẩn một tệp thì người xác minh mở tệp đó bị từ chối, hiện lại thì mở được; xoá thì tệp rời kho, dòng còn với mốc và lý do, lỗi kho thì còn dòng chờ để chạy lại; mỗi lần mở, ẩn, hiện, xoá có một dòng nhật ký chỉ mang mã.
- **Cần chủ duyệt:** `ĐK-5` nghĩa của «ẩn», ô quyền mới, và việc xoá tay ngoài danh sách «hết lý do giữ» của ADR-0126 đ6.

### Đợt 4 — Đăng ký và đăng nhập bằng Google, Apple

**Người dùng nhận được:** ở bước đầu của phiếu, bấm «Tiếp tục với Google» hoặc «Tiếp tục với Apple» thay cho nhập mã email; sau khi được duyệt, đăng nhập lại cũng bằng nút đó.

**Khớp với mô hình:** Google, Apple chỉ là một cách **chứng minh danh tính** của phiếu; tài khoản vẫn do người duyệt sinh ra. Lúc duyệt, cặp (nhà cấp, mã người dùng do nhà cấp phát) được gắn với tài khoản, không ghép theo email. So với ADR-0016 Đ3, chỉ một câu bị thay: «liên kết chỉ khi đang đăng nhập và đã nhập lại PIN» có thêm một đường thứ hai là lệnh duyệt. Hai câu «không tự tạo tài khoản» và «không ghép theo email» giữ nguyên.

**Ràng buộc đã tra ngày 15/11** (tài liệu chính thức của hai hãng, đường dẫn ở mục 13; mức chắc ghi kèm):

1. Google **cấm** mở trang đăng nhập của họ trong khung web nhúng (chắc). Vỏ iPhone của ADR-0200 là khung web nhúng nên **bị chặn**: muốn có Google trong ứng dụng iPhone phải mở bằng cửa sổ xác thực của hệ điều hành rồi trao phiên về bằng mã dùng một lần, tức thêm mã gốc trong vỏ. Vỏ Android chạy bằng Chrome nên không thuộc diện chặn (khá chắc).
2. Luật kho của Apple, điều 4.8 (chắc): ứng dụng iPhone dùng đăng nhập bên thứ ba thì phải kèm một lựa chọn tương đương bảo vệ quyền riêng tư; Sign in with Apple là cách chắc nhất. Ứng dụng chỉ dùng hệ tài khoản riêng của công ty thì được miễn.
3. Apple: hễ xin tên hoặc email thì Apple trả kết quả bằng một lệnh POST từ trang của Apple về máy chủ (chắc). Điều đó trái luật «lệnh ghi phải cùng site», hiện không có ngoại lệ nào. Đường né: không xin gì, chỉ nhận mã người dùng; tên, số điện thoại, email do người đăng ký tự khai trong phiếu.
4. Apple chỉ trả tên ở lần cấp quyền đầu tiên; email có thể là địa chỉ chuyển tiếp, muốn gửi thư tới đó phải đăng ký tên miền gửi thư với Apple (chắc).
5. Sign in with Apple cho web cần chương trình nhà phát triển trả phí (chắc) và, theo câu chữ tài liệu, cần sẵn một ứng dụng trên App Store đã bật tính năng này (khá chắc).
6. Cả hai kho: ứng dụng cho tạo tài khoản thì phải cho xin xoá tài khoản ngay trong ứng dụng, chỉ ngưng là không đủ; Google đòi thêm một đường dẫn web (chắc). Có Sign in with Apple thì khi xoá phải thu hồi quyền phía Apple.
7. Sổ phiên chỉ nhận bốn cách đăng nhập (ràng buộc đóng ở cột `method` của `aut_session`): thêm Google, Apple là dựng lại bảng và thêm cửa cấp phiên, tức việc lớn.
8. Chưa nguồn nào xác nhận Google, Apple chuyển hướng xong có quay về đúng ứng dụng đã cài từ màn hình chính của iPhone hay không (chưa xác minh).

**Vì vậy chia ba nấc:**

- **Nấc 0 — thử trên máy thật trước khi quyết**, như ADR-0016 Đ9 đã làm cho Face ID: iPhone với ứng dụng cài từ màn hình chính, Android, máy tính. Không đạt thì chỉ làm cho trình duyệt.
- **Nấc 1 — trình duyệt, Android, ứng dụng cài từ màn hình chính:** Google theo luồng chuyển hướng, không cần ngoại lệ nào; Apple theo đường «không xin gì». Đi đường này thì Apple không cho email, nên người đăng ký vẫn phải xác nhận một email liên lạc bằng mã; mô hình phiếu của đợt 1 đã tách sẵn «danh tính» khỏi «email liên lạc» cho việc đó.
- **Nấc 2 — trong vỏ iPhone trên App Store:** phần mã gốc cho cả hai nút, làm cùng phiên lo ADR-0200.

**Cần chủ duyệt, sau nấc 0:** `ĐK-6` danh tính ngoài: bảng liên kết (ADR-0016 Đ5 đã dự kiến), câu bị thay ở ADR-0016 Đ3, cửa cấp phiên mới, và lựa chọn cho Apple (không xin gì, hay xin tên và email kèm một ngoại lệ hẹp cho luật cùng site).

**Chuyển cho phiên lo ADR-0200, không thuộc khung này:** tài liệu của Capacitor ghi cách «nạp trang từ xa» không nhằm cho bản chính thức; và khi có tự đăng ký thì câu «mọi tài khoản do công ty tạo» ở phần bối cảnh của ADR-0200 không còn đúng.

## 7. Chống lạm dụng

Đây là **cửa ghi công khai đầu tiên** của Nền tảng (ADR-0200 từng từ chối mở một biểu mẫu công khai vì lý do này), nên mỗi mối nguy có một lớp chặn có tên:

| Mối nguy | Lớp chặn |
|---|---|
| Máy gửi phiếu hàng loạt | Turnstile ở bước đầu (đang dùng ở Đăng nhập). Khác Đăng nhập, nơi thiếu khoá Turnstile thì bỏ qua kiểm: ở đây **thiếu khoá thì cửa đăng ký đóng**. Giới hạn theo địa chỉ mạng và theo email cho việc xin mã và gửi phiếu (dùng lại bộ đếm của đăng nhập, khoá đặt tên riêng). **Công tắc mở / đóng đăng ký** của Toàn quyền, mặc định đóng. Route công khai không tự qua cổng bảo trì, nên từng route đăng ký phải gọi cổng đó |
| Mượn cửa đăng ký để gửi thư mã tới địa chỉ của người khác | Giới hạn theo địa chỉ mạng và theo **tổng số thư mỗi giờ của cả Nền tảng**, không chỉ theo từng email; câu chữ thư riêng cho đăng ký, không dùng lại thư «mã xác minh đăng nhập» |
| Dò xem số điện thoại, email nào đã có tài khoản | Biểu mẫu không bao giờ trả lời «số này đã có tài khoản»; mọi trường hợp nhận cùng một câu. Trùng số do người duyệt xử lý |
| Đổ tệp rác, tệp độc vào kho | Chỉ tải lên sau khi đã xác nhận danh tính; chỉ JPG, PNG, HEIC, PDF theo chữ ký thật; trần dung lượng riêng cho cửa công khai, không quá 10 MB của ADR-0123 đ2; có trần số tệp mỗi phiếu |
| Cướp phiên đăng ký để lấy ảnh giấy tờ | Người đăng ký **không tải lại được** tệp đã gửi, chỉ thấy «đã gửi»; phiên đăng ký hạn ngắn, gắn với đúng một phiếu |
| Giả phiên của Nền tảng | Tách khoá, tách tiền tố; không route nào ngoài nhóm đăng ký nhận cookie đăng ký (Luật 1) |
| Lệnh ghi từ trang khác | Kiểm `Origin` cùng site giữ nguyên cho mọi lệnh ghi |
| Người trong công ty tự đăng ký rồi tự duyệt | Hai bước, hai người (5.3); điều kiện nằm **trong câu ghi** của lệnh duyệt; nhật ký |
| Phiếu bỏ dở chất đống | Máy cho hết hạn theo số ngày trong chính sách; ảnh vào hàng xoá ngay |
| Một người mở nhiều phiếu | Mỗi danh tính (email; đợt 4: tài khoản Google, Apple) chỉ có một phiếu đang mở |

Các con số (số lần xin mã mỗi giờ, hạn ngày của từng trạng thái, trần số tệp) là **dữ liệu chính sách có ngày hiệu lực**, giá trị mặc định đề xuất ở ADR đợt 1; mã không viết cứng (Hiến chương 5.2).

## 8. Dữ liệu cá nhân và pháp lý

- **Hạng dữ liệu (5.20):** email, số điện thoại, họ tên, ngày sinh, địa chỉ là N2; số giấy tờ và ảnh giấy tờ là N3; mã gửi email và PIN là N4. Mọi cột mới khai hạng trong sổ dữ liệu. Nhật ký của mọi lệnh ở đây chỉ mang mã phiếu, loại, mã lý do, tên vai trò.
- **Mục đích và đồng ý (5.21):** trước khi mở đăng ký, chính sách riêng tư phải nêu hai mục đích «xác minh đối tác» và «xuất hoá đơn». Phiếu ghi đúng phiên bản người đăng ký đã đồng ý; lúc duyệt, dòng đồng ý được chép sang hồ sơ.
- **Tệp (5.22):** dùng chính kho `HO_SO` (ADR-0123): khoá ngẫu nhiên, chỉ phục vụ qua máy chủ sau khi kiểm quyền và ghi nhật ký trước, không lưu đệm. Tệp của phiếu nằm ở bảng tệp chờ cho tới lúc duyệt (đợt 1). Màn quản lý tệp của Toàn quyền (đợt 3) thấy cả hai loại ở một chỗ.
- **Toạ độ chụp trong ảnh:** ảnh được thu nhỏ ngay trên máy người đăng ký trước khi gửi (hàm sẵn có `web/thu-nho-anh.ts`), nhờ đó bỏ luôn dữ liệu kèm ảnh. Máy chủ chưa tự bỏ được (`BL-TEP-EXIF`), nên tệp PDF và tệp gửi không qua giao diện vẫn có thể còn; phải nói rõ điều này trong ADR `ĐK-3`.
- **Mỗi sự thật một nơi:** duyệt xong, số giấy tờ và các giá trị cá nhân sống ở bảng hồ sơ; bản trong phiếu được ẩn danh, chỉ giữ mã, loại, trạng thái, mốc giờ, người xử lý, mã lý do.
- **Lưu giữ (5.25):** phiếu bị từ chối, bị rút, hết hạn thì ảnh vào hàng xoá ngay (ADR-0126 đ6 đã định cho phiếu tự khai), nội dung cá nhân được ẩn danh sau số ngày ghi trong chính sách. Người soạn đề xuất cho **tác nhân tự động** làm việc này; đây là một ngoại lệ có tên của câu «máy không tự ghi», theo khuôn ADR-0186 đã áp cho ảnh vé, và là một quyết định trong ADR đợt 1.
- **Quyền của người đăng ký:** «Rút phiếu» là rút kèm xoá ảnh, làm được bằng phiên đăng ký, không cần tài khoản.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu; hạn trong `docs/quyen-hoan.json` là 31/12/2026; lời chủ 5/11: quyết định cuối, không hỏi lại; `docs/HANDOFF-N1.md` ghi buổi diễn tập dời sang 25/11/2026). ADR nào của khung này thu thêm dữ liệu cá nhân đều ghi dòng này và chỉ duyệt được khi chủ ghi «cho phép, có lý do». Nếu buổi diễn tập xong trước lúc trình ADR thì điều kiện này tự hết.
- **Chưa có luật sư xác nhận** thời hạn và căn cứ giữ dữ liệu (Luật 91/2025/QH15, Nghị định 356/2025; người soạn chưa đọc bản gốc).

## 9. Sẵn cho Affiliates và kết nối

- **Người giới thiệu (làm trong đợt 1):** phiếu có một ô tuỳ chọn. Ở bước xác minh, người xác minh (xem được Danh bạ) chọn hồ sơ của người giới thiệu nếu tìm thấy; lệnh duyệt ghi thành **quan hệ giữa hai hồ sơ** (một loại quan hệ mới, thêm bằng migration). Không tìm thấy thì chữ nằm lại trong phiếu và được ẩn danh cùng phiếu. Chỉ ghi nhận, không sinh tiền.
- **Điều khoản thương mại gắn vào hồ sơ và vai trò, không gắn vào tài khoản** (Hiến chương 2.3). Chương trình Affiliates sau này là thêm vai trò và mức, không phải sửa việc đăng ký.
- **Địa chỉ đăng ký ổn định, nhận tham số** (loại đối tác, mã người giới thiệu): dùng được cho liên kết, mã QR, hoặc trang web công khai dẫn sang.
- **Mã định danh do máy cấp, không mang nghĩa** (5.26): mỗi hồ sơ đối tác đã có mã ổn định. Khi cần một mã ngắn để in lên liên kết giới thiệu thì cấp thêm theo khuôn 5.26, không đổi mã cũ.
- **Ranh giới:** tính hoa hồng cho người giới thiệu là việc tiền, cần ADR riêng và sổ vàng. Giới thiệu nhiều tầng có thể chạm luật kinh doanh đa cấp, phải hỏi luật sư trước. Cả hai nằm ngoài khung này.

## 10. Điều kiện trước và việc chờ người ngoài

| # | Điều kiện | Ai làm | Chặn việc gì |
|---|---|---|---|
| 1 | Chính sách riêng tư được luật sư duyệt chữ, được đăng, và có trang công khai để người đăng ký đọc (ADR-0200 Đ3) | Chủ, luật sư | **Mở** đăng ký. Đợt 1 vẫn thi công và phát hành được với công tắc đóng |
| 2 | Cho phép xây trên lỗ HC-5.19 có ghi lý do, hoặc diễn tập khôi phục xong (đang hẹn 25/11/2026) | Chủ | Duyệt ADR đợt 1 và đợt 2 |
| 3 | Kế toán xác nhận các trường hoá đơn cần, cho cá nhân và cho tổ chức | Kế toán | Chốt nội dung phiếu |
| 4 | Thử gửi mã qua email tới một địa chỉ bất kỳ trên bản chính thức. Sổ bàn giao ghi chưa ai thử, mà mã email là cách xác nhận danh tính duy nhất của đợt 1 | Chủ | **Lập kế hoạch đợt 1**: thư không tới thì phải đổi cách xác nhận danh tính, tức đổi nền của đợt |
| 5 | Duyệt các mục miễn lớp chống ghi trùng cho những route ghi của người đăng ký (ADR-0094 điều 1 đòi chủ duyệt từng mục) | Chủ, trong ADR `ĐK-1` | Thi công đợt 1 |
| 6 | Mã số thuế có thành khoá duy nhất không (`BL-MST-UNIQUE`) | Chủ, trong ADR `ĐK-4` | Đợt 2 |
| 7 | Tài khoản nhà phát triển Apple (dùng chung với ADR-0200), khoá ứng dụng của Google ở trạng thái chính thức; thử trên máy thật (nấc 0) | Chủ | Đợt 4 |
| 8 | Lối xin xoá tài khoản trong Nền tảng (ADR-0200 Đ4, đang chờ HC-5.19), nhận cả tài khoản công ty | Chủ duyệt | Đưa bản có đăng ký lên kho ứng dụng |

## 11. Lựa chọn người soạn đã tự áp (chủ bác điều nào thì nói)

1. Phương án B: phiếu trước, hồ sơ và tài khoản sau (mục 4).
2. Xác nhận danh tính bằng mã gửi email. Số điện thoại do người xác minh **gọi** để xác nhận, vì chưa có SMS hay Zalo.
3. Hai bước, hai người: Quản trị xác minh và đối chiếu Danh bạ, Nhân sự duyệt mở tài khoản; người xác minh khác người duyệt (5.3). Khác với phiếu tự khai, nơi Nhân sự cũng xác minh: ở đây bước xác minh cần xem Danh bạ, mà Nhân sự không xem Danh bạ.
4. Người được duyệt tự đặt PIN rồi đăng nhập như mọi người; kích hoạt không cấp phiên.
5. Mục bắt buộc mặc định của phiếu cá nhân (đợt 1) và phiếu tổ chức (đợt 2), sửa được vì là dữ liệu chính sách.
6. Máy tự cho phiếu hết hạn và dọn phiếu đã kết thúc.
7. Có công tắc mở / đóng đăng ký của Toàn quyền, mặc định đóng. Đóng là không nhận phiếu mới; phiếu đã có vẫn đi tiếp.
8. Người giới thiệu chỉ được ghi nhận, chưa tính tiền; người xác minh là người nối hồ sơ người giới thiệu.
9. Đợt 2 thi hành đúng ADR-0018 điều 9: tài khoản gắn thẳng hồ sơ công ty; người đại diện là một hồ sơ người nối quan hệ với công ty.
10. Đợt 4 đi sau một lần thử trên máy thật, và Apple bắt đầu bằng đường «không xin gì».
11. Phiếu cá nhân không cho chọn «Công ty lữ hành»; loại đó chỉ đi phiếu tổ chức.
12. Ảnh của phiếu nằm ở bảng tệp chờ riêng cho tới lúc duyệt; không dựng lại bảng tệp của hồ sơ.
13. Toàn quyền được làm cả hai bước khi không còn ai hợp lệ, có gắn cờ.
14. Lệnh của người đăng ký ghi vào lịch sử của chính phiếu, không vào nhật ký chung.
15. Người đã có tài khoản muốn tự nộp ảnh giấy tờ (`BL-TK-ANH`, `BL-XM-ANH`) **không thuộc bốn đợt này**. Màn xác minh của đợt 1 nên dựng sao cho sau này hiện được cả ảnh của phiếu tự khai, nhưng mở việc đó là một việc thêm, phải hỏi chủ.

**Một câu còn chờ chủ, hỏi cùng lúc duyệt khung:** tài khoản tự đăng ký có **bắt buộc lớp hai ngay** không?

- (a) **Chưa bắt buộc, khuyến nghị.** Người tự đăng ký đăng nhập bằng số điện thoại và PIN như mọi đối tác hôm nay, được mời bật lớp hai sau lần đăng nhập đầu. Việc bắt buộc đi cùng lát ADR-0121 cho mọi đối tác, làm riêng. Đợt 1 giữ nguyên cỡ.
- (b) Bắt buộc ngay. Bước kích hoạt phải bật luôn yếu tố email (kèm mã dự phòng và màn riêng), hoặc đợt 1 phải gồm cả lát ADR-0121. Đợt 1 lớn hơn rõ rệt.

## 12. Nói thẳng

- Người soạn **chưa kiểm trên bản chính thức**: chính sách riêng tư đã đăng chưa, thư mã có tới được địa chỉ bất kỳ không, kho `HO_SO` đang có bao nhiêu tệp, có công ty nào đang đứng tên một hồ sơ cá nhân mang vai trò «Công ty lữ hành» không. Các điều này lấy từ tài liệu trong kho, không phải từ máy đang chạy.
- Phần hiện trạng dựa trên **đọc mã**, không chạy thử: chưa ai đăng nhập bằng một tài khoản không quyền để đếm lại 32 đường; phần «hồ sơ tổ chức đã làm bên đặt được» dựa trên mã và các bài kiểm có sẵn.
- Mọi điều pháp lý ở đây chưa có luật sư hay kế toán xác nhận. Cách Apple xét một ứng dụng mà tài khoản phải chờ duyệt không có điều luật thành văn nào; chỉ có lời kể trên diễn đàn.
- Các con số (hạn ngày, trần tệp, số lần xin mã) mới là đề xuất, chốt ở ADR đợt 1.
- Chưa thử gì trên iPhone thật: máy ảnh chụp giấy tờ, ảnh HEIC, Google và Apple trong ứng dụng cài từ màn hình chính.
- Tên trạng thái, tên nút, tên bảng đều là tên giữ chỗ.
- Bản này đã qua **một** lượt đọc soát độc lập ngày 15/11 (chỉ đọc, không chạy thử): khoảng bảy mươi khẳng định được đối chiếu với mã, năm chỗ sai hoặc nói quá đã sửa, bảy chỗ tự mâu thuẫn đã gỡ. Con số «32 đường» người soát không đếm lại từng đường, chỉ ước lượng ra cùng cỡ.
- Nhánh viết bản này đi sau bản chính vài lần lưu; kế hoạch thi công phải soạn sau khi nhập bản chính mới nhất.

## 13. Nguồn

**Trong kho:** `docs/ARCHITECTURE.md` Phần I; ADR-0014, 0016, 0018, 0071, 0077, 0081, 0121 đến 0126, 0155, 0164, 0178, 0185, 0186, 0200; `docs/BACKLOG.md` (các mã `BL-…` nêu trên); `docs/quyen-hoan.json` (mục HC-5.19); `docs/HANDOFF-N1.md`; mã ở `src/shared/router.ts`, `src/shared/permissions.ts`, `src/shared/booker.ts`, `src/modules/parties`, `src/modules/staff`, `src/modules/auth`, `src/modules/orders`, `src/modules/billing`; migration `0011`, `0012`, `0065`, `0101` đến `0108`, `0149`.

**Bên ngoài** (đọc ngày 15/11/2026; trước khi chép câu chữ vào ADR phải mở lại để đối chiếu):

- Apple, Sign in with Apple cho web và REST API: `https://developer.apple.com/documentation/signinwithapplerestapi`, `https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/`
- Apple, xoá tài khoản và thu hồi quyền: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`, `https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple`
- Apple, luật kho: `https://developer.apple.com/app-store/review/guidelines/`
- Google, chính sách OAuth và luồng cho máy chủ web: `https://developers.google.com/identity/protocols/oauth2/policies`, `https://developers.google.com/identity/protocols/oauth2/web-server`
- Google Play, yêu cầu xoá tài khoản và mục An toàn dữ liệu: `https://support.google.com/googleplay/android-developer/answer/13327111`, `https://support.google.com/googleplay/android-developer/answer/10787469`
- Android, Trusted Web Activity: `https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities`
