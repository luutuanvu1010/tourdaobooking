# ADR-0206 — Phiếu đăng ký đối tác và phiên đăng ký: cửa ghi công khai đầu tiên của Nền tảng

- **Trạng thái:** **accepted** 2026-11-15 — chủ dự án, nút trả lời «Duyệt theo câu mẫu», ngay sau trang trình `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/TRINH-CHU.md`. Câu mẫu nguyên văn: «Duyệt ADR-0206, ADR-0207, ADR-0208 và điều Hiến chương mới; chữ và con số theo khuyến nghị. Cho phép bốn điều: xây trên lỗi HC-5.19 vì chỉ thêm bảng mới và công tắc để đóng; miễn lớp chống bấm trùng cho bảy đường của người đăng ký; máy tự xoá dữ liệu của phiếu không được duyệt; Nhân sự duyệt vào hồ sơ có sẵn do Quản trị chọn.» Khoá cho phép ở `docs/quyen-hoan.json`: `xay_tren_cho_phep_adr_0206_0208`. Lịch sử: **proposed** 2026-11-15 — AI soạn theo khung đã được chủ duyệt **hướng** ngày 15/11 (`docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/`, nút trả lời «Duyệt theo khuyến nghị»). Lời duyệt đó chưa phải lời duyệt ADR này. AI không tự duyệt (Hiến pháp N3). Trang trình chủ: `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/TRINH-CHU.md`.
- **Số:** 0206 (số lớn nhất trên mọi nhánh và worktree lúc cấp là 0205; 0203–0205 đang do ba nhánh khác giữ). Trong khung, ADR này mang tên giữ chỗ `ĐK-1`.
- **Nguồn:** lời chủ 15/11 (nguyên văn, phần liên quan): «lên kế hoạch chuẩn mực cho việc đăng ký - phê duyệt tài khoản … Mục đích là để cho đối tác tự đăng ký tài khoản, cung cấp các thông tin và hồ sơ cần thiết (tùy thân, doanh nghiệp) để phục vụ cho việc xác minh thông tin».
- **Ngày:** 2026-11-15. **Loại:** việc lớn — dữ liệu (module và bảng mới), quyền (một cổng mới cho người chưa có tài khoản, hai hàng quyền mới), luật (kèm đề xuất một điều Hiến chương), triển khai (route công khai mới). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về hành vi (đóng công tắc là thôi nhận phiếu mới); một chiều mềm về dữ liệu (bảng chỉ thêm, phiếu đã gửi ở lại dưới dạng đã ẩn danh).
- **Sửa sau lượt soát độc lập 15/11** (chỉ đọc): bỏ cổng router mới, dùng route công khai kèm cookie đã ký (tiền lệ hai lớp); thêm hàm bảo trì cho người không có tài khoản; tách không gian khoá của bộ đếm.
- **Quan hệ với ADR cũ:**
  - **ADR-0200:** phần Bối cảnh của ADR-0200 lấy tiền đề «mọi tài khoản do công ty tạo, không có tự đăng ký». Khi ADR này được thi công thì tiền đề đó hết đúng. ADR này **không** sửa ADR-0200; hệ quả với hai kho ứng dụng ghi ở mục Hệ quả. ADR này **thi hành** một phần ADR-0200 Đ3: đường công khai đọc chính sách riêng tư.
  - **ADR-0016 Đ8:** dùng lại luật «tách khoá ký» cho cookie phiên đăng ký.
  - **ADR-0094 điều 1:** thêm mục miễn lớp chống ghi trùng cho các route ghi của người đăng ký (danh sách ở Đ7); mỗi mục miễn do chủ duyệt, lời duyệt ADR này gồm các mục đó.
  - **ADR-0126 điều 1:** dùng lại chính sách riêng tư có phiên bản; đồng ý của người chưa có hồ sơ ghi tại phiếu.
  - **ADR-0155:** loại đối tác mở cho phiếu lấy trong các vai trò bên ngoài được hưởng.
  - **Không đổi:** bốn cửa cấp phiên, bản đồ mã quyền (không thêm mã quyền), luật tiền, ADR-0125.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu; hạn trong `docs/quyen-hoan.json` là 31/12/2026; `docs/HANDOFF-N1.md` ghi buổi diễn tập dời sang 25/11/2026). **Lý do xin phép:** chỉ thêm bảng mới, không đổi dòng dữ liệu nào đang có; phiếu không sinh hồ sơ, không sinh tài khoản; khôi phục D1 về trước một mốc thì các phiếu gửi sau mốc mất và người đăng ký phải gửi lại, không dòng nào của sổ tiền hay đơn bị ảnh hưởng. Nếu buổi diễn tập xong trước lúc duyệt thì dòng này tự hết.
- **Hiến chương áp:** 1.2, 2.1, 2.2, 5.1, 5.2, 5.3, 5.5, 5.12, 5.16, 5.20, 5.21, 5.23, 5.26; và điều mới đề xuất (`DE-XUAT-HIEN-CHUONG.md` cùng thư mục trang trình). **Lệch có chủ ý:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0207, ADR-0208 — tổng 3, đúng trần).

## Bối cảnh

Hôm nay mọi tài khoản do Nhân sự hoặc Toàn quyền tạo (`account.create`). Chủ dự tính khoảng 1.000 đối tác (ADR-0014) và muốn họ tự đăng ký. Nền tảng chưa có cửa ghi công khai nào ngoài đăng nhập.

Đọc mã ngày 15/11 cho ba điều chi phối thiết kế:

- Một tài khoản đã đăng nhập mà **không có mã quyền nào** vẫn gọi được khoảng 32 đường sau cổng `staff` (trong đó có `GET /api/locations` trả mọi địa điểm, `GET /api/feedback/teams`, và đường gửi thư mã tới địa chỉ bất kỳ), còn «Hồ sơ của tôi» lại đóng với họ vì các ô tự phục vụ xét theo mã quyền. Tờ khai Kernel 18 dòng 4 đã ghi nợ «đường đọc sau cổng `staff` chưa canh» (DK-T3-04).
- Hồ sơ mới sinh ra là hiện ngay ở Danh bạ, và văn phòng chọn được một hồ sơ cá nhân chưa có vai trò làm bên đặt.
- Số điện thoại đăng nhập là khoá duy nhất và dòng tài khoản không xoá được.

Vì vậy không thể cho người lạ một tài khoản «chờ duyệt» rồi mới lọc quyền: phải giữ họ ở ngoài cho tới khi có người duyệt.

## Quyết định

**Đ1 — Hai luật xuyên suốt** (đề xuất thành một điều Hiến chương; diff ở `DE-XUAT-HIEN-CHUONG.md`):

1. **Người chưa được duyệt không có phiên của Nền tảng.** Họ chỉ có phiên đăng ký (Đ5), mở được đúng phiếu của mình qua một tập route đóng (Đ6).
2. **Phiếu trước, hồ sơ và tài khoản sau.** Mọi điều người đăng ký khai là đề xuất nằm trong phiếu. Gửi phiếu không sinh dòng nào ở bảng hồ sơ, bảng tệp của hồ sơ, bảng tài khoản. Chỉ lệnh duyệt (ADR-0207) mới ghi các bảng đó.

**Đ2 — Module mới `dang-ky`**, tiền tố bảng `dk_`, xếp hạng «nghiêm» ngay từ đầu (SQL qua `defineSql`). Module này là chủ duy nhất của các bảng phiếu. Cạnh phụ thuộc khai ở `ALLOWED_EDGES`: tới `parties` (tệp, hồ sơ), `staff` (tài khoản), `auth` (Turnstile, bộ đếm chống dò), `audit` (nhật ký của lệnh do người trong công ty và tác nhân phát). Lô ghi chung do gốc lắp ráp ghép từ các câu lệnh chưa chạy (Hiến chương 5.3).

**Đ3 — Bảng** (tên giữ chỗ; mọi cột chứa dữ liệu về người khai hạng N0–N4 trong sổ dữ liệu):

- **Phiếu:** mã do máy cấp theo Hiến chương 5.26, tiền tố `DK` (thêm vào bảng tiền tố ở `src/shared/ma-dinh-danh.ts`); loại phiếu (đợt 1 chỉ mở «cá nhân»; «tổ chức» mở ở đợt 2 bằng cách tạo lại trigger loại, khuôn `pty_self_submission_kind_ins`); trạng thái (tập đóng, Đ4); loại đối tác xin đăng ký; phiên bản bản khai hiện hành; các mốc giờ; mã lý do khi cần bổ sung hay bị từ chối; mã hồ sơ và tài khoản kết quả (chỉ có sau khi duyệt).
- **Danh tính đã chứng minh** của phiếu, tách khỏi **email liên lạc đã xác nhận**: đợt 1 chỉ có loại «email» và hai thứ trùng nhau; đợt 4 thêm loại Google, Apple, khi đó danh tính có thể không kèm email. Mỗi danh tính chỉ có **một** phiếu đang mở (chỉ mục duy nhất có điều kiện).
- **Bản khai:** mỗi lần gửi là một dòng **bất biến**. Cột có kiểu, soi theo cột của `pty_person`, `pty_contact_point`, `pty_person_document` để lệnh duyệt chép một–một; không JSON tự do (Hiến chương 5.2). Kèm mã phiên bản chính sách riêng tư đã đồng ý và giờ đồng ý.
- **Lịch sử lệnh của phiếu** (chỉ thêm): ai phát lệnh (người đăng ký, mã tài khoản nhân viên, hoặc mã tác nhân), lệnh gì, lúc nào, mã lý do.
- **Mã gửi email:** chỉ lưu bản băm, có hạn, có đếm lần nhập. Đây là bảng kỹ thuật như `login_attempt`: dòng hết hạn được xoá.
- **Chính sách đăng ký:** chỉ thêm dòng, có ngày hiệu lực (khuôn `ord_pickup_time_policy`): công tắc mở / đóng; hạn ngày của từng trạng thái; hạn phiên đăng ký (Đ5); hạn kích hoạt (ADR-0207); các trần của Đ8; thời hạn ẩn danh (ADR-0208); danh sách loại đối tác mở cho phiếu; danh sách mục bắt buộc theo loại phiếu.

**Đ4 — Vòng đời** (tên giữ chỗ; tập đóng bằng `CHECK`, chuyển trạng thái canh bằng trigger và bằng điều kiện trong câu ghi):

`ĐANG ĐIỀN → CHỜ XÁC MINH → CHỜ DUYỆT → ĐÃ DUYỆT`. Từ `CHỜ XÁC MINH`, người xác minh có thể trả phiếu về `CẦN BỔ SUNG`; ở trạng thái này người đăng ký sửa được như lúc `ĐANG ĐIỀN`, và «gửi lại» đưa phiếu về `CHỜ XÁC MINH` với một bản khai mới. Từ mọi trạng thái chưa kết thúc có thể sang `TỪ CHỐI` (người của công ty), `ĐÃ RÚT` (người đăng ký), `HẾT HẠN` (tác nhân, ADR-0208). Bốn trạng thái `ĐÃ DUYỆT`, `TỪ CHỐI`, `ĐÃ RÚT`, `HẾT HẠN` là kết thúc, không đổi nữa. Sơ đồ ở bản khung vẽ đường quay lại qua `ĐANG ĐIỀN`; ADR này nói rõ hơn và thắng bản khung ở điểm đó.

**Đ5 — Phiên đăng ký.** Một cookie riêng (tên giữ chỗ `td_dang_ky`), `HttpOnly`, `Secure`, ký HMAC bằng khoá dẫn xuất hoặc tiền tố mục đích **khác** `td_session` (ADR-0016 Đ8), gắn với đúng một phiếu và một danh tính, hạn ngắn (dữ liệu chính sách; đề xuất: hết sau 30 phút không thao tác, tối đa 12 giờ). **Không thêm cổng router mới.** Route của người đăng ký khai `access: "public"` và **tự kiểm cookie đăng ký trong thân route** bằng một hàm dùng chung của `dang-ky`, theo đúng tiền lệ bước hai của đăng nhập hai lớp (`POST /api/auth/mfa/verify`: route công khai, cổng là cookie chờ đã ký). Router và kiểu `Ctx` không đổi. Mọi cổng có tài khoản (`staff`, `office`, `orders`, `accounts`, `admin`) không bao giờ đọc cookie này. Vào lại phiếu = xin mã mới cho đúng email. Không cửa cấp phiên `td_session` nào được thêm.

**Đ6 — Route là một tập đóng** (đường dẫn giữ chỗ). Mọi route dưới đây khai `public`; cột «Đòi cookie đăng ký» là phần thân route tự kiểm. Một bài kiểm mới liệt kê đúng các route gọi hàm kiểm cookie đăng ký; thêm route mà chưa khai vào bài đó thì đỏ.

| Đòi cookie đăng ký | Route | Việc |
|---|---|---|
| không | `GET /api/dang-ky/cau-hinh` | công tắc, loại đối tác đang mở, mục bắt buộc, phiên bản chính sách riêng tư đang hiệu lực |
| không | `GET /api/chinh-sach-rieng-tu` | thân chính sách đang hiệu lực, phiên bản, ngày hiệu lực (ADR-0200 Đ3); chưa có phiên bản nào thì trả «đang cập nhật» |
| không | `POST /api/dang-ky/ma` | xin mã gửi email (Đ8); mọi trường hợp trả cùng một câu |
| không | `POST /api/dang-ky/xac-nhan` | nhập mã; đúng thì cấp phiên đăng ký, và mở phiếu `ĐANG ĐIỀN` nếu danh tính chưa có phiếu đang mở và công tắc đang mở |
| có | `GET /api/dang-ky/phieu` | trạng thái, nội dung đang điền, lý do cần bổ sung hay bị từ chối, hạn |
| có | `PUT /api/dang-ky/phieu` | lưu nháp khi `ĐANG ĐIỀN` hoặc `CẦN BỔ SUNG` |
| có | `POST /api/dang-ky/phieu/gui` | gửi, hoặc gửi lại; sinh một dòng bản khai bất biến |
| có | `POST /api/dang-ky/phieu/rut` | rút phiếu (ADR-0208 lo phần tệp) |

Route tải ảnh thuộc ADR-0208; route đặt PIN và các route của người trong công ty thuộc ADR-0207.

**Đ7 — Lớp chống ghi trùng không chạy cho các route trên** (lớp đó chỉ chạy cho route có tài khoản đăng nhập — ADR-0094). Năm route ghi ở Đ6 (xin mã, xác nhận mã, lưu nháp, gửi, rút), cùng route tải ảnh (ADR-0208) và route đặt PIN (ADR-0207) — bảy route, đều `public` — phải có mục `congKhai` trong `src/shared/lan-gui-mien.ts` (bài `src/lan-gui-phu-route.test.ts` đòi mọi route ghi `public` ngoài danh sách đã biết phải có mục đó); **lời duyệt ADR này là lời duyệt các mục miễn đó**. Bù lại, từng lệnh tự chống bấm hai lần: câu ghi mang điều kiện «đúng trạng thái và đúng phiên bản bản khai», lần bấm thứ hai khớp 0 dòng và nhận lại kết quả của lần đầu.

**Đ8 — Chống lạm dụng.** Con số là dữ liệu chính sách (Đ3); mã không viết cứng. Mặc định đề xuất:

| Mối nguy | Lớp chặn |
|---|---|
| Máy xin mã, mở phiếu hàng loạt | Turnstile ở `POST …/ma`; **thiếu khoá Turnstile thì route trả 503 «tạm ngừng nhận đăng ký»** (khác đăng nhập, nơi thiếu khoá thì bỏ qua kiểm). Bộ đếm của đăng nhập dùng lại với **không gian khoá riêng** `dk:` cho cả email lẫn địa chỉ mạng (không dùng `phone:`, `mfa:`, và **không dùng chung `ip:`** của đăng nhập, để đăng ký dồn dập từ một mạng khách sạn không khoá đăng nhập của nhân viên cùng mạng): 3 lần / 15 phút / email; 10 lần / 15 phút / địa chỉ mạng |
| Mượn Nền tảng để gửi thư tới người khác | Thêm trần tổng: 60 thư mã / giờ cho cả Nền tảng; vượt thì trả cùng câu như thường và không gửi. Thư đăng ký có câu chữ riêng, không dùng lại thư «mã xác minh đăng nhập» |
| Dò mã | Mã 6 số, sống 10 phút, 5 lần nhập, băm khi lưu (khuôn lớp hai) |
| Dò xem số điện thoại, email nào đã có tài khoản | Không route nào của người đăng ký trả lời «đã có tài khoản». Trùng số do người xác minh và người duyệt xử lý (ADR-0207) |
| Phiếu bỏ dở chất đống | `ĐANG ĐIỀN` quá 7 ngày không thao tác, `CẦN BỔ SUNG` quá 14 ngày: tác nhân cho hết hạn (ADR-0208) |
| Giả phiên Nền tảng | Đ5; bài kiểm: hàm kiểm phiên của Nền tảng từ chối cookie đăng ký và ngược lại |
| Lệnh ghi từ trang khác | Kiểm `Origin` cùng site giữ nguyên, không ngoại lệ |
| Chế độ bảo trì | Route công khai không tự qua cổng bảo trì, và cổng bảo trì của đăng nhập xét theo quyền và số điện thoại của một tài khoản nên không dùng được cho người chưa có tài khoản. Thêm **một hàm bảo trì nhỏ cho người không có tài khoản**: đang bảo trì thì mọi lệnh ghi của người đăng ký bị chặn; mỗi route ghi ở Đ6 gọi hàm đó |

**Đ9 — Công tắc và chính sách.** Hai hàng quyền mới: «xem hàng chờ phiếu đăng ký» (Quản trị, Nhân sự, Toàn quyền) và «đặt chính sách đăng ký» (chỉ Toàn quyền). Công tắc **mặc định đóng** lúc phát hành. Đóng nghĩa là **không mở được phiếu mới**; phiếu đã có vẫn đi tiếp (vào lại, xem, sửa, gửi lại, rút, đặt PIN). Muốn dừng hẳn thì dùng chế độ bảo trì.

**Đ10 — Đồng ý chính sách riêng tư** (Hiến chương 5.21). Gửi phiếu đòi đúng phiên bản đang hiệu lực; chưa có phiên bản nào thì không gửi được. Phiên bản và giờ đồng ý nằm trong bản khai; lệnh duyệt chép thành dòng `pty_consent` của hồ sơ (ADR-0207).

**Đ11 — Nội dung phiếu cá nhân và loại đối tác** (mặc định; danh sách là dữ liệu chính sách). Mục: họ tên; số điện thoại; loại đối tác; ngày sinh; địa chỉ; giấy tờ tuỳ thân (loại, số, ngày cấp, nơi cấp, ảnh hai mặt); người giới thiệu (tuỳ chọn). Loại đối tác mở cho phiếu cá nhân: Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên. **«Công ty lữ hành» không mở cho phiếu cá nhân**; loại đó chỉ đi phiếu tổ chức của đợt 2, để công ty không đứng tên một người.

**Đ12 — Nhật ký và lịch sử.** Lệnh của người đăng ký ghi vào lịch sử của chính phiếu (Đ3), **không** vào `audit_log`: họ không phải tài khoản, cũng không phải tác nhân, và ADR-0186 Đ8 sẽ từ chối dòng nhật ký thiếu cả hai. Lệnh của người trong công ty và của tác nhân ghi `audit_log` như mọi lệnh khác. Không dòng nào ở hai nơi mang số điện thoại, email, số giấy tờ, ngày sinh, địa chỉ.

**Đ13 — Thư gửi người đăng ký:** mã xác nhận; «cần bổ sung»; «đã duyệt»; «bị từ chối». Gửi **sau** lô ghi; mỗi thư có trạng thái chờ để thấy được và gửi lại được (Hiến chương 5.16). Thân thư không chứa dữ liệu của phiếu ngoài mã phiếu.

**Đ14 — Giao diện.** Một trang đăng ký công khai (nhiều bước) và một trang trạng thái, khai ở `PAGES` (`src/shared/sw-policy.ts`) và script `build:web`; service worker không đệm dữ liệu của phiếu. Màn Đăng nhập thêm lối vào đăng ký, đặt cùng chỗ với ba liên kết công khai của ADR-0200 Đ3. Tên hiện cho người dùng nằm ở bảng «Chữ chờ chủ chọn» của trang trình.

## Phương án bị loại

- **Tài khoản chờ duyệt** (tạo ngay hồ sơ và tài khoản không quyền): người lạ có phiên thật của Nền tảng; 32 đường đang mở phải rà từng cái và «Hồ sơ của tôi» lại phải mở thêm; hồ sơ sinh trước khi đối chiếu Danh bạ nên chắc chắn trùng; đăng ký bỏ dở để lại dòng tài khoản không xoá được và giữ số điện thoại mãi; bất biến «tài khoản đang hoạt động không có quyền nào» làm bộ e2e đỏ.
- **Chỉ đăng ký theo lời mời:** không còn là «tự đăng ký» như chủ yêu cầu.
- **Dịch vụ danh tính ngoài:** ADR-0016 đã loại.
- **Một mã quyền «chờ duyệt»:** thêm một mã quyền nhân đôi mọi bài «tập con quyền» và vẫn cho người lạ phiên của Nền tảng.

## Bài kiểm (đỏ trước, xanh sau)

- Cookie đăng ký bị hàm kiểm phiên của Nền tảng từ chối; cookie `td_session` bị hàm kiểm cookie đăng ký từ chối. Phiên đăng ký gọi một route cổng `staff` bất kỳ: 401.
- Bài mới: các route gọi hàm kiểm cookie đăng ký là đúng danh sách ở Đ6 cộng hai route của ADR-0207, ADR-0208; thêm route chưa khai thì đỏ. Ảnh chụp cổng (`src/route-access.test.ts`) cập nhật cho các route `public` mới. Bài «bốn cửa cấp phiên» giữ nguyên bốn.
- Đang bảo trì: mọi lệnh ghi của người đăng ký bị chặn. Đăng ký dồn dập từ một địa chỉ mạng không làm khoá đăng nhập của tài khoản dùng cùng địa chỉ đó.
- Gửi phiếu: không dòng nào mới ở `pty_party`, `pty_person`, `pty_attachment`, `staff` (đếm trước và sau).
- Chưa có chính sách riêng tư hoặc chưa đồng ý đúng phiên bản: gửi bị từ chối bằng câu tiếng Việt.
- Công tắc đóng: xin mã cho email chưa có phiếu không mở được phiếu; phiếu đã có vẫn vào lại, sửa, gửi lại, rút được.
- Thiếu khoá Turnstile: 503. Vượt từng trần của Đ8: không gửi thư, câu trả lời y như lúc thường.
- Số điện thoại đã có tài khoản, email đã có phiếu: câu trả lời của route không khác trường hợp thường.
- Bấm «Gửi» hai lần: đúng một dòng bản khai.
- Trigger: bản khai không sửa được; trạng thái kết thúc không đổi được; danh tính thứ hai cho phiếu đang mở của cùng email bị chặn.
- Lịch sử phiếu và `audit_log` không chứa số điện thoại, email, số giấy tờ (quét sau khi chạy mọi route, khuôn `giay-to-khong-lo-so`).
- Bài kiến trúc: chỉ `dang-ky` ghi bảng `dk_*`; không view công bố nào mang nội dung bản khai. e2e cho chuỗi xin mã → điền → gửi → rút. Kịch bản Chrome cho trang đăng ký ở 390 và 1280.

## Người dùng sẽ thấy

Ở màn Đăng nhập có thêm một lối vào đăng ký. Người đăng ký nhập email, nhận một mã 6 số qua thư, rồi điền phiếu trên điện thoại; có thể thoát ra và quay lại bằng cách xin mã mới. Sau khi gửi, họ thấy trang trạng thái. Khi công tắc đóng, người mới thấy câu «tạm ngừng nhận đăng ký». Trong công ty, Quản trị, Nhân sự, Toàn quyền thấy một hàng chờ phiếu trong khu Quản lý tài khoản; Toàn quyền có thêm chỗ mở, đóng đăng ký.

## Hệ quả

- Migration số kế tiếp lúc thi công (liệt kê mọi nhánh trước khi đặt số); `docs/data-dictionary.json` + `npm run dict`; cột mới vào tập ghim của `src/hang-du-lieu.test.ts`.
- Sửa có chủ đích các hàng rào: ảnh chụp cổng, `src/lan-gui-phu-route.test.ts` (mục `congKhai`), `src/architecture.test.ts` (module và cạnh mới), bảng tiền tố mã. Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Chữ mới trên giao diện tra `docs/BANG-THAM-CHIEU.md`; chưa có thì khai «chờ chọn» để không chặn việc (Hiến chương 5.27).
- **Phải nói thẳng:**
  - Đây là lần đầu Nền tảng gửi thư cho người lạ. Theo `docs/HANDOFF-N1.md`, **chưa ai thử gửi thư thật** trên bản chính thức. Thư không tới thì cách xác nhận danh tính của cả đợt phải đổi; việc thử phải làm **trước** khi lập kế hoạch thi công.
  - Bản chính thức chưa đăng chính sách riêng tư (chờ luật sư duyệt chữ). Thi công và phát hành được với công tắc đóng, nhưng **không mở đăng ký được** trước khi có chính sách.
  - Khi ứng dụng cho tự đăng ký, hai kho ứng dụng đòi lối xin xoá tài khoản ngay trong ứng dụng (ADR-0200 Đ4, đang chờ HC-5.19). Người đăng ký chưa được duyệt đã có «Rút phiếu»; tài khoản đã duyệt thì cần Đ4.
  - Số điện thoại **không** được xác nhận bằng mã (chưa có SMS, Zalo); người xác minh gọi điện (ADR-0207).
  - Các con số ở Đ5, Đ8 là đề xuất của người soạn, chưa có số đo thật. Chưa có luật sư xác nhận thời hạn giữ dữ liệu của phiếu.
