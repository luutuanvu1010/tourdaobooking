# ADR-0048 — Vận chuyển lượt 2, lượt duyệt I: nhà xe đối tác, xe đối tác, tài xế thuộc nhà xe; vai và quyền "Tài xế đối tác" (`DRIVER_PARTNER`), LC-1 mới, chặn tài khoản lai, nghĩa mới của "Toàn công ty"

- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, khuya 2026-09-28, về lượt duyệt I của đề xuất `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md` (D1, D2). Nguyên văn: **"Duyệt kèm 3 khuyến nghị"**, gồm:
  - Q4 = (a): một người không giữ cùng lúc "đối tác đặt đơn" và "tài xế đối tác";
  - Q5 = (a): nhà xe chưa có tài khoản đăng nhập ở lượt 2;
  - Q6 = (a): không chéo xe và tài xế.

  Lời duyệt do điều phối chuyển lại; người soạn tệp này không trực tiếp thấy tin nhắn của chủ. AI soạn tệp (vai lập kế hoạch), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-28.
- **Loại:**
  - **Một chiều:** mã quyền `DRIVER_PARTNER` và mã vai `DRIVER_EXTERNAL`, **khi đã có tài khoản mang chúng** (đổi tên hay gộp phải di trú dữ liệu quyền).
  - **Hai chiều:** mã vai `CARRIER` và loại quan hệ `DRIVES_FOR` (dòng danh mục, ngưng được); từng ô của cột `DRIVER_PARTNER`; luật "tài xế thuộc nhà xe"; LC-1b (nới được sau); nghĩa "Toàn công ty".
- **Ngoài phạm vi ADR này — lượt duyệt II, chưa duyệt:** Từ chối chuyến (D3), Báo bận (D4), Thông báo chuyến (D5), và các câu Q1, Q2, Q3, Q7 của đề xuất. Lượt II trình sau khi ADR-0047 (lượt 1b, chuyến xe) được duyệt.
- **Liên quan:**
  - ADR-0040 (lượt 1a): **bổ sung** D1, D2, D3 (xem mục "Sửa câu của ADR đã duyệt").
  - ADR-0018: **thay** điều 2, điều 5 (LC-1), điều 9.
  - ADR-0034: **thay** nghĩa `noi-bo` ở điều 6.
  - ADR-0019: dùng bảng cổng; **không** đổi danh sách cổng nào.
  - ADR-0030: khuôn chặn tài khoản lai.
  - ADR-0047 (lượt 1b): các điểm ghi "áp khi có chuyến" chỉ thi công sau khi 1b có dòng phân công xe và tài xế.
  - Hiến chương (`docs/ARCHITECTURE.md` Phần I) áp: 2.1 (Bên trước vai), 2.2, 2.3, K4, 4.4, 5.1, 5.3, 5.5, 5.12.
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (kiểm 2026-09-28 trên main `3bb73f0`). Sáu ô hoãn ở mục `thao_tac` không thuộc bảng hay ô nào của ADR này.

## Bối cảnh

Chủ dự án đã chốt phạm vi lượt 2: nhà xe đối tác, tài xế đối tác, báo bận, từ chối chuyến, thông báo. Xe đối tác thuê theo chuyến; giá để lượt 3.

Tối 2026-09-28, chủ nói thêm (điều phối chuyển lời). Yêu cầu: đúng Hiến pháp và triết lý Oracle (TCA: Bên / vai / tài sản tách bạch).
1. Vận chuyển vừa là dịch vụ độc lập, vừa là thành phần trong chuỗi dịch vụ.
2. **Phương tiện là thực thể độc lập, là tài sản của công ty HOẶC của đối tác (nhà xe).** Xe của nhà xe có hồ sơ xe riêng như xe công ty. Chủ xe là hồ sơ nhà xe mang vai phù hợp.
3. **Xe và tài xế đều có hồ sơ riêng.** Tài xế đối tác là hồ sơ người; giấy tờ ở hồ sơ người; gắn với nhà xe qua quan hệ và vai.

Hiện trạng mã (main `3bb73f0`) buộc phải quyết:
- **LC-1 cho tài khoản bên ngoài chỉ giữ `PARTNER`:** mã ở `src/shared/roles.ts:49`, CSDL ở trigger `lc1_stf_permission_external_partner_only` (`migrations/0024:75-79`). Tài xế đối tác sẽ bị ép thành bên đặt, đúng vấn đề ADR-0040 D3 đã hẹn giải ở lượt 2.
- **`laNoiBo`** (`src/shared/thong-bao.ts:46`) coi mọi tài khoản có quyền khác `PARTNER` là "Toàn công ty". Nếu tài xế đối tác mang `DRIVER` thì họ nhận tin nội bộ.
- **`can()` chỉ đọc mã quyền, không đọc vai** (ADR-0018 điều 3, R-N1-12). Vì vậy tài xế công ty và tài xế đối tác muốn khác quyền thì phải khác mã quyền.

## Quyết định

### 1 (D1). Nhà xe đối tác, xe đối tác, tài xế thuộc nhà xe

**Dữ liệu**
- **Vai hồ sơ mới "Nhà xe đối tác"** (`CARRIER`) trong `pty_role_type`, nhóm `OTHER` (không sinh quyền). Gắn cho hồ sơ tổ chức **hoặc** hồ sơ người (nhà xe cá nhân). **Nhà xe không có tài khoản đăng nhập ở lượt 2** (Q5 = (a)): văn phòng nhập xe và tài xế thay nhà xe. Xét lại ở lượt 3.
- **Loại quan hệ mới "Tài xế của"** (`DRIVES_FOR`) trong `pty_relationship_type`:
  - từ hồ sơ **người** (tài xế) tới hồ sơ **nhà xe**, có ngày bắt đầu và kết thúc;
  - dùng bảng `pty_party_relationship` sẵn có, sẵn luật cấm chồng lấn;
  - một tài xế thuộc được nhiều nhà xe.
- **Luật "tài xế T thuộc nhà xe X"**, công bố **một lần** ở `parties` (hàm công bố + view `v_pty_carrier_driver`: khoá nhà xe, khoá tài xế). T thuộc X khi:
  - **T = X**: nhà xe cá nhân tự lái; bảng quan hệ cấm nối hồ sơ với chính nó; **hoặc**
  - T có quan hệ "Tài xế của" đang mở tới X.
- **Xe đối tác là thực thể độc lập** (lời chủ 28/9):
  - mỗi xe có hồ sơ riêng trong cùng `vc_vehicle`, cùng giấy tờ `vc_vehicle_document`, cùng luật biển số, số khung, số người chở;
  - `owner_party_id` trỏ tới **công ty chủ** hoặc **hồ sơ đang mở vai Nhà xe**; không thêm cột.
- **Tài xế đối tác là hồ sơ người**, không có bảng tài xế riêng. Giấy tờ ở `pty_person_document` (ADR-0040 D2), cùng luật che số và nhật ký không số.
- **Không làm ở lượt 2:** chuyển chủ xe (ADR-0040 D1: "việc riêng"); cột tiền; danh mục "loại xe"; "tuyến" (lượt 3).
- **Nhà xe thôi hợp tác** = đóng vai Nhà xe. Không tự đóng quan hệ, không tự đổi trạng thái xe.
- **Danh sách giấy tờ sắp hết hạn:** hàm công bố `expiringDriverDocuments` mở rộng sang hồ sơ đang mở vai "Tài xế đối tác", vẫn **không số**. Đây là đổi hợp đồng công bố của `parties`: đổi hàm và test trong cùng commit. Mỗi dòng có nhãn chủ xe hoặc nhà xe.
- **Mã vai hồ sơ cũ `DRIVER` "Tài xế"** (nhóm OTHER, đã ngưng ở 0031):
  - giữ ngưng vĩnh viễn, không dùng lại cho nghĩa nào; không migration đổi dòng cũ;
  - dòng còn mở trên production (chưa kiểm) do Quản trị gán lại vai đúng bằng tay.

**Không chéo xe và tài xế (Q6 = (a))**
- Xe của nhà xe X chỉ do tài xế thuộc X lái.
- Tài xế đối tác chỉ lái xe của nhà xe mình đang thuộc; không lái xe công ty.
- Tài xế công ty chỉ lái xe công ty.
- Nới sau phải bằng ADR mới.

**Ô quyền:** không thêm ô.
- Xe và giấy tờ xe đối tác: `vehicle.manage` (Quản trị + Toàn quyền).
- Tạo hồ sơ nhà xe: `party.write`.
- Gán vai Nhà xe, mở/đóng quan hệ "Tài xế của": route vai/quan hệ của hồ sơ, cổng `admin` + `admin.manage`.
- Giấy tờ của tài xế đối tác: `party.document.write` / `party.document.reveal`. Quản trị còn theo luật cấp bậc với hồ sơ gắn tài khoản.

**Bất biến hai lớp**

| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B1.1 | Chủ xe ∈ {công ty chủ, hồ sơ đang mở vai Nhà xe}, lúc thêm xe và lúc đổi `owner_party_id` | trigger `BEFORE INSERT` / `BEFORE UPDATE OF owner_party_id` trên `vc_vehicle`, đọc view công bố của `parties` (cạnh `van-chuyen → parties` đã có) | route xe trả 409 mã riêng (vd `vehicle_owner_not_carrier`), khác mã lỗi của lớp CSDL |
| B1.2 | Quan hệ "Tài xế của": đầu *từ* là hồ sơ người; đầu *tới* đang mở vai Nhà xe lúc mở quan hệ | trigger `BEFORE INSERT` trên `pty_party_relationship` khi loại là `DRIVES_FOR` | route quan hệ trả 409 |
| B1.3 | Không xoá cứng xe, quan hệ, vai | sẵn có | sẵn có |
| B1.4 | **Áp khi có chuyến (ADR-0047):** xe đối tác chỉ lên chuyến khi chủ xe còn mở vai Nhà xe vào ngày chạy; tổ hợp xe–tài xế đúng luật "không chéo" ở trên | trigger trên dòng phân công xe/tài xế của 1b, đọc `v_pty_carrier_driver` | hàm thuần kiểm chuyến của 1b |
| B1.5 | (phát hiện) Chuyến tương lai còn dùng xe hoặc tài xế của nhà xe đã thôi | — | câu kiểm mới ở `audit-invariants` (báo, không chặn) |

**Route**
- `POST /api/van-chuyen/xe`, `PUT /api/van-chuyen/xe/:id` nhận thêm `ownerPartyId`, mặc định là công ty chủ.
- `GET /api/van-chuyen/xe` thêm lọc theo chủ xe.
- **Mới:** `GET /api/van-chuyen/nha-xe` (cổng `office` + `can(vehicle.manage)`). Dữ liệu nhà xe lấy qua hàm công bố của `parties`.
- Vai và quan hệ: route sẵn có `POST /api/parties/:id/roles`, `POST /api/parties/:id/relationships` (cổng `admin`).

**Thông báo:** không có.

### 2 (D2). Tài xế đối tác: vai, quyền app riêng, LC-1 mới, chặn tài khoản lai, nghĩa mới của "Toàn công ty"

**Dữ liệu**
- **Vai tài khoản mới "Tài xế đối tác"** (`DRIVER_EXTERNAL`), nhóm `EXTERNAL`, `handles: "never"`, `superAdminOnly: false`, bộ quyền mặc định `["DRIVER_PARTNER"]`. Quản trị gán ở màn Quản lý tài khoản.
- **Quyền app mới "Tài xế đối tác"** (`DRIVER_PARTNER`), thêm **cuối** bản đồ quyền (cột thứ 9), cùng một dòng trong `stf_permission_type`.
- **Không dùng lại `DRIVER`**, vì bốn lý do:
  1. `laNoiBo` sẽ gửi tin nội bộ cho người ngoài.
  2. Ô `party.document.view` của `DRIVER` chủ duyệt cho "mọi nhân viên".
  3. `can()` không đọc vai.
  4. Lớp CSDL của LC-1 chỉ thấy mã quyền.
- **Không dùng lại `PARTNER`:** `PARTNER` là bên đặt, lập đơn và xem tiền đơn của mình.

**Ô quyền (cột `DRIVER_PARTNER`)**
- Mọi ô nghiệp vụ hiện có = **`none`**, trừ các ngoại lệ có tên:
  - `feedback.submit = any`, `feedback.view = own`;
  - `party.document.view = own`: giấy tờ của chính mình, số che.
- Ô xem chuyến, Từ chối, Báo bận: thuộc ADR-0047 và lượt duyệt II; tới lúc đó vẫn `none`.
- **Bài ghim cả hàng** (như hàng `PARTNER`, `DRIVER`): ô mới sau này mặc định `none`.
- **Cổng:** `DRIVER_PARTNER` **không** vào `office`, `orders`, `admin`. Chỉ vào `staff`. Bài khoá cổng thêm khẳng định này.
- **Tài xế đối tác không thấy:**
  - mọi con số tiền, kể cả giá thuê xe ở lượt 3;
  - đơn hàng, Trang chủ, danh mục giá;
  - hồ sơ người khác;
  - số giấy tờ đầy đủ, kể cả của mình;
  - tin "Toàn công ty".

**LC-1 mới và LC-1b (tài khoản lai; Q4 = (a))**
- **LC-1:** tài khoản mang vai bên ngoài chỉ giữ **quyền bên ngoài** = `{PARTNER, DRIVER_PARTNER}`. Tập này là một hằng dùng chung, thay `EXTERNAL_ALLOWED`. Vai "Tài xế đối tác" sinh `DRIVER_PARTNER`; mọi vai bên ngoài khác vẫn sinh `PARTNER`.
- **LC-1b:** tài khoản giữ `DRIVER_PARTNER` thì **không giữ quyền nào khác**, cả `PARTNER` lẫn quyền nội bộ.
  - Một người chọn **một**: đối tác đặt đơn **hoặc** tài xế đối tác.
  - Không có cách lách: vai gắn với hồ sơ, mỗi người một hồ sơ (Hiến chương 2.1).
  - Tiền lệ: ADR-0030 chặn tài khoản lai Đối tác.

| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B2.1 | LC-1 mới | migration mới: **bỏ** trigger `lc1_stf_permission_external_partner_only` và **tạo lại** với tập mới. Không sửa tệp 0024 | `effectivePermissions`, `roleAssignmentProblem` |
| B2.2 | LC-1b | trigger mới `BEFORE INSERT ON stf_permission`, hai chiều, **chỉ đếm dòng đang mở** (`valid_to_at IS NULL`). Lô đổi quyền phải đóng dòng cũ **trước**, mở dòng mới **sau** | một hàm thuần cho **mọi** đường ghi quyền: gán vai, `POST /api/staff` không vai, `PUT /api/staff/:id/permissions`. `roleAssignmentProblem` từ chối (400, câu dễ hiểu) **trước** trigger khi gán cùng lúc "Tài xế đối tác" với một vai bên ngoài khác |
| B2.3 | (phát hiện) Không có tài khoản vi phạm B2.1, B2.2 | — | câu kiểm mới ở `audit-invariants` |

**Nghĩa mới của "Toàn công ty"**
- `laNoiBo` = có ít nhất một quyền **không thuộc** tập quyền bên ngoài (cùng hằng với LC-1). Tài xế công ty vẫn nhận tin; tài xế đối tác không nhận.
- Gửi riêng cho mọi tài xế đối tác được, bằng nhóm `quyen:DRIVER_PARTNER`.
- **Bảng tin:** không đổi luật. Tài khoản chỉ-`DRIVER_PARTNER` chỉ mang nhãn `nguoi:<id>`.
- **Thông báo màn hình khoá (ADR-0036):** bật được như mọi tài khoản.

**Route:** không route mới. `GET /api/parties/documents/mine` (cổng `staff`) mở cho `DRIVER_PARTNER` nhờ ô `party.document.view = own`.

**Thứ tự phát hành:** migration (nới LC-1, thêm hai trigger, danh mục) và mã lên **cùng** lần phát hành, migration trước.

## Sửa câu của ADR đã duyệt (nguyên văn → mới)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0018 điều 2 | "**Mười một vai, hai nhóm.** Nội bộ: Giám đốc, Điều hành chung, Hướng dẫn viên nội bộ, Nhân viên kinh doanh, Thực tập sinh, Kế toán. Bên ngoài: Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên." | Thêm vai bên ngoài **"Tài xế đối tác"** (`DRIVER_EXTERNAL`, sinh `DRIVER_PARTNER`). Các vai "IT" (ADR-0044) và "Tài xế công ty" (ADR-0040) đã thêm trước đó giữ nguyên. |
| ADR-0018 điều 5, LC-1 | "LC-1 tài khoản bên ngoài chỉ giữ quyền Đối tác" | "LC-1 tài khoản bên ngoài chỉ giữ **quyền bên ngoài** (Đối tác **hoặc** Tài xế đối tác). **LC-1b** tài khoản giữ Tài xế đối tác không giữ quyền nào khác." |
| ADR-0018 điều 9 | "**Đối tác là bên đặt.** Mọi thực thể bên ngoài là **bên đặt**, …" | "… Mọi thực thể bên ngoài là bên đặt, **trừ Tài xế đối tác** (người lái chuyến, không đặt đơn, không có quyền Đối tác)." Phần còn lại của điều 9 giữ nguyên. |
| ADR-0034 điều 6 | "`noi-bo` (= "Toàn công ty": tài khoản có ít nhất một quyền khác `PARTNER`; không tới tài khoản chỉ-Đối-tác — chủ chọn 2026-09-27)" | "`noi-bo` (= "Toàn công ty": tài khoản có ít nhất một quyền **không thuộc tập quyền bên ngoài** {`PARTNER`, `DRIVER_PARTNER`}; không tới tài khoản chỉ-Đối-tác hay chỉ-Tài-xế-đối-tác)" |
| ADR-0040 D1, gạch "chủ xe" | "**chủ xe** = khoá tới hồ sơ. Lượt 1a: hồ sơ công ty chủ, đọc qua `ownerCompany`." | "… Lượt 1a: hồ sơ công ty chủ. **Từ ADR-0048: hoặc hồ sơ đang mở vai Nhà xe đối tác** (xe của nhà xe là thực thể độc lập, có hồ sơ xe riêng)." Câu "chuyển chủ xe là việc riêng" giữ nguyên. |
| ADR-0040 D1, danh sách "sắp hết hạn" | "giấy tờ của người đọc qua **một hàm công bố** của `parties`, chỉ trả loại, hạng, hạn, tên hiển thị, **không số**" | Giữ nguyên; hàm đó **mở rộng** phạm vi sang tài xế đối tác, vẫn không số. |
| ADR-0040 D2, ô quyền | "xem giấy tờ của chính mình (số che)": **mọi tài khoản nội bộ, phạm vi của mình**" | "… mọi tài khoản nội bộ **và tài khoản Tài xế đối tác**, phạm vi của mình" |
| ADR-0040 D3, mã vai cũ | "Mã vai hồ sơ cũ `DRIVER` … **không dùng cho tài xế công ty**. Giữ để lượt 2 (tài xế đối tác) quyết; không gán mới." | "… **Ngưng vĩnh viễn**, không dùng lại cho nghĩa nào (tài xế đối tác dùng vai mới `DRIVER_EXTERNAL`)." |
| ADR-0040 D3, gạch "Lượt 2" | "'Tài xế đối tác' (nhóm bên ngoài) + sửa LC-1 (ADR-0018) để người ngoài không bị ép thành bên đặt." | Thi hành bằng điều 2 của ADR này. |

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa những loại thực thể nào**

| Bảng | Sau ADR này |
|---|---|
| `pty_role_type` | + **Nhà xe đối tác** (OTHER) + **Tài xế đối tác** (EXTERNAL) |
| `pty_party_role` | + hồ sơ nhà xe (tổ chức hoặc người) mang vai Nhà xe; hồ sơ người mang vai Tài xế đối tác. Nhà xe cá nhân tự lái mang cả hai (OTHER + EXTERNAL, không vướng LC-3) |
| `pty_relationship_type` / `pty_party_relationship` | + **"Tài xế của"** (người → nhà xe) |
| `pty_person_document` | + giấy tờ của **người ngoài** (tài xế đối tác), cùng luật che số |
| `stf_permission_type` / `stf_permission` | + `DRIVER_PARTNER`. Tài khoản bên ngoài giữ `PARTNER` **hoặc** `DRIVER_PARTNER`, không cả hai, không kèm quyền nội bộ |
| `vc_vehicle` / `vc_vehicle_document` | + **xe của nhà xe** (`owner_party_id` = hồ sơ nhà xe) |
| `audit_log` | chỉ hành động sẵn có (gán vai/quan hệ, thêm/sửa xe); không số giấy tờ |

**(2) Từng dòng bản đồ quyền chạm các bảng đó áp cho loại nào**

| Ô | Áp cho | `DRIVER_PARTNER` |
|---|---|---|
| `vehicle.manage` (Quản trị + Toàn quyền) | **mọi xe**, công ty và nhà xe; giấy tờ xe; danh sách sắp hết hạn | none |
| `party.view` / `party.write` (văn phòng) | mọi hồ sơ, kể cả nhà xe và tài xế đối tác chưa gắn tài khoản; không mở giấy tờ | none |
| `party.staff.write` | hồ sơ gắn tài khoản, gồm tài xế đối tác đã có tài khoản | none |
| `admin.manage` (cổng `admin`) | gán vai Nhà xe, Tài xế đối tác, quan hệ "Tài xế của"; tạo tài khoản tài xế đối tác | none |
| `party.document.view` | của chính mình, số che: mọi nhân viên + **tài xế đối tác** | **own** |
| `party.document.write` / `.reveal` | giấy tờ mọi người, kể cả tài xế đối tác | none |
| mọi ô `order.*`, `money.view`, `contact.view`, `dispatch.*`, `payment.*`, `invoice.*`, `settings.ops`, `notice.send`, `company.legal.write`, `audit.view`, `staff.sheet.sync`, `account.access.manage` | không đổi | **none** (bài ghim cả hàng) |
| `feedback.submit` / `feedback.view` | mọi tài khoản | any / own |
| tin "Toàn công ty" | có ≥ 1 quyền ngoài `{PARTNER, DRIVER_PARTNER}` | không nhận |

**(3) Cổng nào canh cửa nào**

| Cổng | Danh sách mã (không đổi) | Cửa liên quan | `DRIVER_PARTNER` |
|---|---|---|---|
| `admin` | `ADMIN`, `SUPER_ADMIN` | vai, quan hệ hồ sơ; tài khoản; danh mục | không |
| `office` | `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN` | `/api/van-chuyen/*` (xe, nhà xe, sắp hết hạn); `/api/parties*` | không |
| `orders` | `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN` | đơn, Trang chủ | **không** (bài khoá cổng) |
| `staff` | mọi tài khoản hoạt động | tự phục vụ; `GET /api/parties/documents/mine`; hộp thông báo | có; thân route hỏi `can()` |

Lớp CSDL canh thêm: trigger LC-1 mới, trigger LC-1b, trigger chủ xe (B1.1), trigger quan hệ "Tài xế của" (B1.2).

## Hệ quả

- **Dữ liệu:**
  - migration chỉ-thêm, số đặt lúc thi công sau khi kiểm mọi nhánh chưa gộp (ADR-0047 cũng lấy số);
  - cập nhật `docs/data-dictionary.json` + `npm run dict`.
- **Việc lớn** (dữ liệu + quyền): người kiểm độc lập ở cuối.
- **Hàng rào mới** (mỗi cái một dòng ở `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật):
  - ghim cả hàng `DRIVER_PARTNER`;
  - bài khoá cổng;
  - trigger LC-1 mới, LC-1b, chủ xe, quan hệ;
  - `laNoiBo`;
  - câu kiểm `audit-invariants` mới.
- **Tiêu chí nghiệm thu kiểm bằng máy** (đề xuất, mục 10 "Lượt I", các mục 1–12 và 5b). Có hai ca bắt buộc:
  - đổi vai "Tài xế taxi" → "Tài xế đối tác" qua màn Quản lý tài khoản phải **thành công**, không bị LC-1b chặn nhầm;
  - chèn thẳng SQL tổ hợp lai phải ABORT.
- **Thứ tự:** kế hoạch → thi công máy chủ + CSDL (lát 1) → giao diện theo bản vẽ Claude Design (lát 2) → người kiểm độc lập → phát hành. Không chờ ADR-0047, trừ B1.4.

## Phương án bị loại

- **Dùng lại `DRIVER` cho tài xế đối tác, phân biệt bằng vai:** trái ADR-0018 điều 3; tài xế đối tác sẽ nhận tin "Toàn công ty".
- **Dùng `PARTNER` cho tài xế đối tác:** sai nghĩa (bên đặt), mở lập đơn và xem tiền.
- **Cho phép tài khoản lai** (Q4 (b)): chủ chọn (a).
- **Nhà xe có tài khoản** (Q5 (b)): chủ chọn (a); xét lại ở lượt 3.
- **Cho chéo xe và tài xế** (Q6 (b)): chủ chọn (a).
- **Bảng "danh sách nhà xe" hay "danh sách tài xế đối tác" riêng:** trái Hiến chương 2.1.
