# ADR-0040 — Phân hệ Vận chuyển, lượt 1a: hồ sơ xe, giấy tờ (xe và người), tài xế là nhân viên có tài khoản, danh sách sắp hết hạn

- **Trạng thái:** **accepted** — chủ dự án duyệt 2026-09-28 trong phiên điều phối. Nguyên văn: *"Duyệt nhưng có điều chỉnh, ở mục 3, tài xế là người lao động trong công ty, giống như bán hàng hay hướng dẫn viên, vẫn có tài khoản đăng nhập để xem cuốc xe của mình. Về giao diện, vẽ trên Claude Design"*.
  - D1 và D2 duyệt như đề xuất `docs/superpowers/specs/2026-09-27-de-xuat-adr-0040-van-chuyen-luot-1a.md`. Người kiểm độc lập đề xuất đó: ĐẠT CÓ ĐIỀU KIỆN, đã sửa.
  - D3 viết lại theo điều chỉnh của chủ. Phần quyền cụ thể của tài xế ở lượt 1a là điều phối áp nguyên tắc "mặc định từ chối" (Hiến pháp 8.2, 8.5) vào mục đích chủ nêu: chỉ mở đúng phần phục vụ "xem của mình", không mở gì khác.
- **Ngày:** 2026-09-28   **Loại:** **một chiều** cho tiền tố bảng `vc_` và chủ sở hữu bảng (khó đổi sau khi có dữ liệu); **hai chiều** cho ô quyền và danh mục.
- **Liên quan:**
  - **ADR-0002** (tiền tố, đồ thị): **bổ sung** module `van-chuyen` (`vc_`), cạnh `van-chuyen → parties`, `van-chuyen → audit`.
  - **ADR-0018** (mô hình người–vai–quyền): **bổ sung** một vai nội bộ "Tài xế" và một quyền app "Tài xế" (điều D3). Không đổi các vai khác.
  - **ADR-0019** (bản đồ quyền là nguồn duy nhất): **bổ sung** cột quyền app `DRIVER` và các ô mới của D2. Mọi ô mới có máy chủ hỏi từ ngày đầu.
  - **ADR-0013:21** (`party.staff.write`): giấy tờ của người đi theo ô mới của D2, không theo ô cũ.
  - **ADR-0024 điều 6 + ADR-0043** (Tour Đảo là hồ sơ "công ty chủ"): chủ xe công ty là hồ sơ đó, đọc qua hàm `ownerCompany` của `parties`.
  - **ADR-0038 điều 6** (Quản trị giữ việc kinh doanh + nhân sự; việc kỹ thuật chỉ Toàn quyền): khớp cách chia ô ở D1, D2.
  - **Hiến chương** (`docs/ARCHITECTURE.md` Phần I): 2.1 (Bên trước vai), 2.2 (bốn loại dữ liệu), 5.1 (bất biến hai lớp), 5.2 (có kiểu, có ngày hiệu lực), 5.5 (không xoá cứng), 5.12 (dấu vết; siết thêm theo 9.7: nhật ký không chứa số giấy tờ), 5.13 (nền trước).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` **rỗng** (kiểm 2026-09-28 trên main c276848). Mục `thao_tac` còn 6 dòng, hạn 30/11 và 31/12, không dòng nào thuộc bảng hay ô của ADR này.

## Bối cảnh

Chủ yêu cầu phân hệ quản lý xe đúng Hiến chương và cách tổ chức dữ liệu theo Oracle. Ba người rà độc lập thấy phần **điều xe và chuyến xe (lượt 1b)** đứng trên ba nền chưa có: số khách hiệu lực một nguồn; chặng đưa đón + danh sách hành khách ở `orders`; tiền tố `ord_`. Chủ chọn làm trước **lượt 1a**, phần không cần Đơn hàng (`docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md` §6, "1b, 2i"). T2b (Tour Đảo là hồ sơ) đã lên production ở bản 1.34.

## Quyết định

### D1. Module `van-chuyen`: xe, giấy tờ xe, danh mục, danh sách sắp hết hạn

- **Module mới `van-chuyen`**, hạng STRICT, tiền tố bảng `vc_`, tiền tố view `vc`. Phụ thuộc `parties` (hàm công bố) và `audit` (`auditStatement`). Không module nào import `van-chuyen`.
- **Xe** (thực thể có vòng đời; Hiến chương 2.2):
  - biển số: duy nhất trong các xe **chưa ngừng** (đang dùng + bảo dưỡng; xe bảo dưỡng vẫn giữ biển); số khung (định danh bền); tên, đời xe;
  - **số người được chở, không kể tài xế**: tham số từng xe, INTEGER > 0 (giấy cũ ghi 16 chỗ thì nhập 15);
  - **chủ xe** = khoá tới hồ sơ. Lượt 1a: hồ sơ công ty chủ, đọc qua `ownerCompany`. Nếu sau này đổi công ty chủ (ADR-0043), xe KHÔNG tự đổi chủ; chuyển chủ xe là việc riêng.
  - trạng thái: *đang dùng / bảo dưỡng / ngừng*, tập đóng `CHECK`, đổi bằng ADR;
  - có ngày hiệu lực; không xoá cứng; cột dấu vết; khoá lạc quan.
- **Giấy tờ xe** (do bên ngoài cấp, thuộc xe):
  - loại (danh mục), số, ngày cấp, ngày hết hạn (rỗng = không hạn);
  - **gia hạn = thêm dòng mới, không sửa đè**. Sửa sai phải có lý do (danh sách đóng), nhật ký trước→sau.
- **Danh mục sửa được trong app** (khuôn `loc_location`: dấu vết, `active`, khoá lạc quan, nhật ký cùng lô): "loại giấy tờ xe" (mã, tên, có hạn hay không, thứ tự). Giá trị gieo mặc định (dữ liệu tra 27/9, sửa được trong app): Đăng ký (không hạn); Kiểm định; Bảo hiểm trách nhiệm dân sự; Phù hiệu xe hợp đồng; Giám sát hành trình; Camera người lái.
- **Danh sách "giấy tờ sắp hết hạn"** (xe + người lái) trong phân hệ Vận chuyển:
  - giấy tờ của người đọc qua **một hàm công bố** của `parties`, chỉ trả loại, hạng, hạn, tên hiển thị, **không số**. Không qua view (Phần II quy tắc 4: view chỉ khoá + nhãn + cờ tối thiểu);
  - ngưỡng "sắp hết hạn" (số ngày) là chính sách có ngày hiệu lực, chỉ Toàn quyền sửa (`settings.ops`), mặc định 30 ngày;
  - chưa lên chuông (nhắc theo thời gian là cơ chế mới, để sau).
- **Ô quyền quản lý xe:** Quản trị + Toàn quyền (việc kinh doanh, ADR-0038 điều 6). Các vai khác: không.

### D2. Giấy tờ của người ở hồ sơ người (`parties`), bảo vệ số CCCD và số bằng lái

- **Một chỗ cho mọi giấy tờ của một người** ("dữ liệu thuộc về người"):
  - loại (danh mục "loại giấy tờ của người": CCCD, Giấy phép lái xe, Khám sức khoẻ, Tập huấn nghiệp vụ vận tải; sau này thêm thẻ hướng dẫn viên, bằng thuyền trưởng);
  - số, ngày cấp, nơi cấp, ngày hết hạn;
  - **hạng** (cột có kiểu, chỉ dùng với Giấy phép lái xe; danh mục hạng B, D1, D2, D và hạng cũ B2, C, D, E).
  - Gia hạn = thêm dòng mới. Sửa sai có lý do.
  - Một số CCCD thuộc đúng một người: giữ bằng **trigger** so `party_id` khác nhau (khuôn `pty_party_role_group_conflict_ins`, `migrations/0024`). Không dùng `UNIQUE(loại, số)` phẳng vì sẽ chặn nhầm lần cấp lại của chính người đó.
- **Nghĩa của hạng** (chở tối đa bao nhiêu khách) là luật của Vận chuyển, làm ở lượt 1b, không nằm ở `parties`.
- **Bảo vệ dữ liệu cá nhân:**
  - số CCCD và số bằng lái **che** trong mọi danh sách và mọi DTO mặc định;
  - "xem đủ số" cần ô quyền riêng; mỗi lần xem ghi nhật ký **không kèm số**;
  - nhật ký, Bảng tin, thông báo **không bao giờ** chứa số giấy tờ, tên kèm năm sinh, hay chữ tự do của giấy tờ;
  - có hàng rào kiểm và dòng sổ hàng rào (P16).
- **Ô quyền mới:**
  - "ghi giấy tờ của người": Quản trị + Toàn quyền;
  - "xem đủ số giấy tờ": Quản trị + Toàn quyền;
  - "xem giấy tờ của chính mình (số che)": **mọi tài khoản nội bộ, phạm vi của mình** (để tài xế, hướng dẫn viên tự xem hạn giấy tờ của mình);
  - danh mục "loại giấy tờ của người" và "hạng": Quản trị sửa.

### D3. Tài xế là nhân viên của công ty, có tài khoản đăng nhập (theo điều chỉnh của chủ)

- **Vai tài khoản nội bộ mới "Tài xế"** (nhóm Nội bộ), đứng cạnh "Nhân viên kinh doanh", "Hướng dẫn viên nội bộ". Tạo tài khoản ở màn Quản lý tài khoản như các nhân viên khác. Vai này không nhận đơn (không phải người phụ trách đơn).
- **Quyền app mới "Tài xế"** (`DRIVER`), thêm CUỐI bản đồ quyền (như cột Thực tập) để thứ tự cột cũ không đổi.
  - **Lượt 1a:** mọi ô nghiệp vụ = **không** (không thấy đơn, tiền, khách, danh mục giá, hồ sơ người khác). Tài xế chỉ: đăng nhập, dùng trang Tài khoản của mình, nhận thông báo gửi cho mình, và xem giấy tờ + hạn giấy tờ **của chính mình** (số che, D2).
  - **Lượt 1b:** mở ô "xem cuốc xe của mình". Trang đầu của tài xế hiện các cuốc được giao.
  - Không vào cổng văn phòng, không vào cổng đơn hàng.
- **Được lái hay không** xét bằng giấy tờ (bằng lái còn hạn, đúng hạng), **không** xét bằng vai (ADR-0001). Áp ở lượt 1b khi có chuyến.
- Mã vai hồ sơ cũ `DRIVER` "Tài xế (đưa đón ≠ taxi)" (nhóm không sinh quyền, `migrations/0011`) **không dùng cho tài xế công ty**. Giữ để lượt 2 (tài xế đối tác) quyết; không gán mới.
- **Lượt 2:** "Tài xế đối tác" (nhóm bên ngoài) + sửa LC-1 (ADR-0018) để người ngoài không bị ép thành bên đặt.

### Giao diện

- **Chủ vẽ trên Claude Design**, rồi làm đúng bản vẽ (tiền lệ trang Đăng nhập). Phần dữ liệu và máy chủ làm trước trong lúc chờ bản vẽ; giao diện làm sau khi có bản vẽ.
- Danh sách màn cần vẽ nằm ở `docs/superpowers/specs/2026-09-28-van-chuyen-1a-man-hinh-can-ve.md`.

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng nào nhận loại dữ liệu mới? | `vc_*`: bảng mới (xe, giấy tờ xe, danh mục loại giấy tờ xe, chính sách ngưỡng). `pty_*`: nhận **giấy tờ của người** (có số CCCD, dữ liệu cá nhân nhạy cảm) và danh mục loại giấy tờ, hạng. `pty_party_role`: nhận mã vai nội bộ mới "Tài xế". Bảng quyền tài khoản: nhận mã quyền app mới `DRIVER`. `audit_log`: hành động mới của xe và giấy tờ, không số. |
| Dòng bản đồ quyền chạm các bảng đó áp cho loại nào? | Ô quản lý xe: Quản trị + Toàn quyền. Ghi giấy tờ người, xem đủ số: Quản trị + Toàn quyền. Xem giấy tờ của mình (số che): mọi tài khoản nội bộ, phạm vi của mình. `party.view` / `party.write` hiện có **không** mở giấy tờ. Cột `DRIVER`: mọi ô nghiệp vụ = không (lượt 1a). Ngưỡng sắp hết hạn: `settings.ops`. |
| Cổng nào canh? | Route Vận chuyển sau cổng văn phòng (danh sách mã cổng chốt ở kế hoạch, khớp ADR-0019); `DRIVER` không vào cổng văn phòng, không vào cổng đơn hàng. Route giấy tờ ở `parties` hỏi ô D2 trong thân route. DTO che số. Hàm `parties` cho Vận chuyển không trả số. |

## Hệ quả

- **Dữ liệu:** migration chỉ-thêm, bắt đầu từ **0031** (0028 vai IT, 0029 giữ cho Thông báo đính kèm, 0030 T2b; kiểm lại mọi nhánh lúc thi công). `docs/data-dictionary.json` + `npm run dict`.
- **Hàng rào mới** (mỗi cái một dòng sổ hàng rào, kèm ngày thấy chặn): trigger cấm sửa đè giấy tờ đã có dòng mới; trigger không xoá; trigger CCCD một người; bài "nhật ký không chứa số giấy tờ"; che số trong DTO; kiểm ô "xem đủ số"; cột `DRIVER` mọi ô nghiệp vụ = không (bài ghim cả hàng, như hàng Đối tác).
- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ người kiểm độc lập ở cuối.
- **Thứ tự:** kế hoạch → thi công phần dữ liệu và máy chủ → chủ vẽ giao diện trên Claude Design → thi công giao diện theo bản vẽ → người kiểm độc lập → phát hành.

## Phương án bị loại

- **Gắn giấy tờ tài xế ở Vận chuyển:** chủ bác, vì CCCD và bằng lái của cùng một người thì phải ở một chỗ.
- **Tài xế là nhãn hồ sơ không tài khoản (đề xuất gốc D3):** chủ điều chỉnh, vì tài xế là người lao động, cần đăng nhập để xem cuốc xe của mình.
- **Dùng quyền app "Hướng dẫn viên" (`FIELD`) cho tài xế:** `FIELD` xem được mọi đơn kể cả tiền (ADR-0017); tài xế không cần và không được thấy.
- **Nhắc hạn trên chuông ở 1a:** cần cơ chế nhắc theo thời gian mới; danh sách trong phân hệ là đủ cho 1a.
