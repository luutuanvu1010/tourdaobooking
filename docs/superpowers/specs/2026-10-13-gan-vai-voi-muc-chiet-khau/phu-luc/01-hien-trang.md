# Phụ lục 1 — Hiện trạng (đọc từ mã thật; mốc nhánh `worktree-agent-a455127a0bb5509fe`, dựng từ `main` @`f9cb4ce3`)

Mọi dẫn chiếu dạng `tệp:dòng` đọc ngày 2026-10-13. Chỗ nào chỉ dựa vào tài liệu, chưa đối chiếu mã, có ghi "chưa kiểm".

## 1. "Vai" bên ngoài hiện có và định nghĩa ở đâu

**Hai thứ khác nhau cùng mang chữ "vai".** (i) Vai hồ sơ: bảng tra `pty_role_type` (`migrations/0011_parties.sql:68-73`, thêm cột nhóm `role_group` ∈ INTERNAL/EXTERNAL/OTHER ở `migrations/0024_vai_quyen_mac_dinh.sql:8`), gán cho hồ sơ qua `pty_party_role` (có ngày hiệu lực). (ii) Vai tài khoản: 15 mã trong mã nguồn `src/shared/roles.ts:7-10` (`ROLE_CODES`) và bộ quyền mặc định của từng vai `src/shared/roles.ts:25-52` (`ROLES`). Mã vai là dữ liệu ở bảng tra, nhưng bộ quyền sinh ra là mã (ADR-0018 điều 2); `src/roles-schema.test.ts:14-24` bắt hai nơi lệch nhau.

**Sáu vai nhóm EXTERNAL** (`src/shared/roles.ts:44-51`): Công ty lữ hành `TRAVEL_AGENCY`, Hướng dẫn viên độc lập `GUIDE_FREELANCE`, Lễ tân khách sạn `HOTEL_RECEPTION`, Tài xế taxi (giới thiệu khách) `TAXI_DRIVER`, Cộng tác viên `COLLABORATOR` — năm vai này sinh quyền `PARTNER`; thứ sáu là Tài xế đối tác `DRIVER_EXTERNAL` sinh `DRIVER_PARTNER` (không phải bên đặt, không hưởng hoa hồng). Hằng quyền bên ngoài: `src/shared/permissions.ts:30` (`EXTERNAL_PERMISSIONS = ["PARTNER","DRIVER_PARTNER"]`).

**Nhóm "được hưởng hoa hồng" hiện là một danh sách dữ liệu, nhưng chỉ sửa được bằng migration.** Bảng `prc_beneficiary_role` (`migrations/0090_so_dai_ly_dot_1.sql:19-36`) gieo đúng năm mã trên (`:27-29`), trigger chặn xoá (`:30-31`) và chỉ cho đổi cột `active` (`:33-35`). Tôi tìm trong `src/`, `web/`, `scripts/` (trừ bài kiểm) không có câu `INSERT INTO pty_role_type` hay `INSERT INTO prc_beneficiary_role` nào; đọc danh sách ở `src/modules/pricing/repository.ts:37` và `src/modules/parties/repository.ts:120`. Nghĩa là muốn thêm một loại đối tác hôm nay chỉ có đường viết migration. Đây là chỗ "khoá cứng" thứ nhất.

**Tiền lệ nhãn không sinh quyền đã có:** vai `SUPPLIER` "Nhà cung cấp" nhóm OTHER (`migrations/0090_so_dai_ly_dot_1.sql:5`, ADR-0078 điều 1) và `CARRIER` (nhà xe). Nhóm OTHER không sinh quyền, gán qua Danh bạ ở ô `admin.manage`. Bài `src/roles-schema.test.ts:22-23` chỉ ép hai nhóm INTERNAL/EXTERNAL phải trùng `ROLE_CODES`, không ép nhóm OTHER.

## 2. "TA1/TA2/TA3" là gì trong mã và tài liệu

**Không tìm thấy.** Tôi tìm `TA1`, `TA2`, `TA3`, `TA-`, "Travel Agent", "hạng đại lý", "tier" trong `src/`, `web/`, `migrations/`, `scripts/`, `docs/` (trừ một tệp thiết kế HTML cũ về chặng đưa đón không liên quan). Không có bảng, cột, hằng nào mang tên đó, và không có trong sổ ghi nhớ làm việc. Vì vậy phần "mức" dưới đây là mức hoa hồng theo bảng đã duyệt, còn TA là khái niệm mới chủ nêu hôm nay.

**Mức hoa hồng hiện nay gắn theo gì** (ADR-0077 điều 4-6; đặc tả `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md` §3-4):
- Bảng `prc_commission_rule` (`migrations/0090:39-60`): mỗi dòng áp cho đúng một trong (một hồ sơ đối tác) hoặc (một vai trong `prc_beneficiary_role`) — `CHECK` ở `:56`; phạm vi là một dịch vụ, một nhóm dịch vụ hoặc mọi dịch vụ — `:57-58`; kiểu là phần trăm hoặc số tiền mỗi khách — `:59`; có `valid_from/valid_to`.
- Hàm duy nhất chọn mức: `chonMuc` ở `src/modules/pricing/rules.ts:71`, sáu bậc, ô cụ thể nhất thắng: (1-3) đối tác × dịch vụ / nhóm / mọi dịch vụ, rồi (4-6) vai × dịch vụ / nhóm / mọi dịch vụ. Hai vai cho hai mức khác nhau ở cùng bậc 4-6 thì dòng đó "thiếu mức (xung đột)" (`rules.ts:85`).
- Kế toán, Quản trị, Toàn quyền sửa bảng (`partner.commission.write`, `src/shared/permissions.ts:131`); Kế toán, Quản trị, Toàn quyền, Bán hàng xem (`:130`). Đổi mức = đóng dòng cũ, thêm dòng mới (trigger `prc_commission_rule_close_only`, `0090:65-70`). Nhật ký ghi `prc_commission_rule_added/closed` (`src/modules/pricing/index.ts:101,118`).
- Màn "Hoa hồng đối tác" (`web/hoa-hong.ts`) đã lấy danh sách loại từ máy chủ (`GET /api/pricing/hoa-hong` trả `vai`, `index.ts:84-89`), tức phần giao diện không khoá cứng danh sách.
- **Không có khái niệm "mức có tên dùng chung".** Mỗi loại tự có dòng riêng; muốn hai loại cùng số phải nhập hai lần. Ngày 8/10 chủ đã nói "mức" là như bảng đã duyệt, không hạng đại lý, không bậc doanh số, không giá net (sổ ghi nhớ làm việc; ADR-0077). Tên "bậc 1" trong ví dụ ADR-0080 (`ADR-0080:115`) là bậc của sáu bậc chọn mức ở trên, không phải TA1.

## 3. Thêm một vai mới hôm nay đòi sửa những gì ("khoá cứng")

Ví dụ thêm loại "Nhân viên spa giới thiệu khách" như một vai EXTERNAL giống Lễ tân khách sạn:

1. Một migration mới: dòng `pty_role_type` (nhóm EXTERNAL, `code` viết hoa — `0011:69`) và dòng `prc_beneficiary_role` (`0090:27-29` là mẫu). Bắt buộc có số migration mới (CLAUDE.md §10).
2. Mã: `src/shared/roles.ts:7-10` thêm vào `ROLE_CODES` và `:44-48` thêm một dòng `ROLES` (tên, nhóm, quyền mặc định `PARTNER`).
3. Bài kiểm đang ghi cứng năm vai: `src/migrations-so-dai-ly.test.ts:72` và `:128` (so sánh đúng danh sách), `src/shared/roles.test.ts:264` (vòng lặp năm vai), `src/migrations-0024.test.ts:52`; bài `roles-schema.test.ts` tự khớp nếu đã sửa cả hai nơi.
4. Tài liệu mô tả đếm số vai: `docs/SYSTEM-DESIGN.md:1072` ("15 vai (9 INTERNAL, 6 EXTERNAL)") và dòng bảng `prc_beneficiary_role` ở `:325`; Trợ giúp `src/shared/huong-dan-nhan-su.ts:24` liệt kê vai; một mục nhật ký thay đổi (`src/shared/changelog.ts`) cho lần phát hành; `docs/data-dictionary.json` nếu đổi bảng.
5. Phát hành: vai là dữ liệu cộng bộ quyền cố định trong mã nên đổi bảng này phải qua chủ duyệt và phát hành (ADR-0018 điều 2; `src/shared/roles.ts:4`); quy trình phát hành thường có người kiểm độc lập vì chạm dữ liệu và quyền.
6. Giao diện chọn vai trên trang Nhân viên (`web/role-picker.ts:44,69`) tự lấy từ `ROLES` nên không phải sửa tay.

Tức là một dòng nghiệp vụ ("thêm loại đối tác") kéo theo khoảng 8-10 tệp và một lần phát hành. Đó là "khoá cứng" chủ nói. Chưa kiểm: danh sách tệp có thể thiếu một vài chỗ liệt kê vai trong kịch bản e2e (`tests/e2e/roles.mjs`, `parties.mjs` có nhắc các mã này).

## 4. Quan hệ với quyền, luật cứng LC-1…LC-8, ADR-0014/0018

- Vai tài khoản sinh quyền: `effectivePermissions` (`src/shared/roles.ts:133-139`) lấy hợp quyền mặc định của các vai trong `ROLE_CODES`, rồi nếu nhóm là EXTERNAL thì lọc chỉ còn `PARTNER`/`DRIVER_PARTNER`. Vai không nằm trong `ROLE_CODES` (như `SUPPLIER`) không bao giờ sinh quyền: danh sách vai tài khoản đọc qua `ROLE_CODES.filter(...)` (`src/modules/staff/index.ts:234`) và `isRoleCode` (`roles.ts:55`).
- **LC-1** (tài khoản bên ngoài chỉ giữ quyền bên ngoài): trigger `lc1_stf_permission_external_partner_only` (`migrations/0024:75`, tạo lại ở `migrations/0037_tai_xe_doi_tac.sql:10-11`), canh theo **nhóm** EXTERNAL của vai đang mở chứ không theo từng mã; kiểm định kỳ `R-LC-1` (`scripts/audit-checks.mjs:162-168`).
- **LC-3** (không vừa nội bộ vừa bên ngoài): hai trigger `pty_party_role_group_conflict_ins/_upd` (`0024:33-`), canh theo nhóm; kiểm định kỳ `R-LC-3` (`audit-checks.mjs:180-185`). Vai nhóm OTHER không bị LC-1/LC-3 chạm.
- **LC-1b** (Tài xế đối tác đứng riêng) và `vaiTaiXeDoiTacXungDot` (`roles.ts:108-109`): chỉ liên quan `DRIVER_EXTERNAL`.
- **LC-4** (chỉ Toàn quyền gán/gỡ vai hoặc quyền cấp cao): `superAdminOnly` và `highPermissionProblem` (`roles.ts:21,187`); năm vai đối tác đều `superAdminOnly: false`, Quản trị gán được. **LC-5** (tỷ lệ chốt vào đơn) chính là bản chụp `ord_service_terms`. **LC-6** (nhật ký mọi thay đổi vai, quyền, chiết khấu) là `auditStatement` ở các route. LC-2 và LC-8 là luật người nhận đơn, không liên quan.
- ADR-0014 điều 1: một mã quyền `PARTNER` cho mọi đối tác (giữ). ADR-0018 điều 2: mã vai là dữ liệu, bộ quyền mặc định cố định trong mã; điều 3: vai chỉ đi vào hàm sinh quyền, không bao giờ là cổng; điều 11: chiết khấu là bảng cấu hình, ô cụ thể nhất thắng (đã thay một phần bởi ADR-0077).
- **Vai được hưởng và quyền đang dính nhau ở năm vai cũ:** vì năm loại đối tác là vai EXTERNAL, mỗi khi gán loại cho một người thì tài khoản của người đó đồng thời nhận quyền `PARTNER`. Và vì loại EXTERNAL chỉ gán qua màn Tài khoản (`src/modules/parties/index.ts:197,200,1077,1129` trả 409 `role_via_account`) và tài khoản chỉ gắn hồ sơ cá nhân, **hồ sơ tổ chức không mang được loại nào** — lỗ đã ghi ở `docs/BACKLOG.md:258` (BL-SDL-TO-CHUC) và ở `tests/e2e/so-dai-ly.mjs:32`.

## 5. Quan hệ với đơn đã chụp mức, khoá tháng, đối soát đợt 2

- **Đơn đã xác nhận giữ mức đã chụp.** Bản chụp `ord_service_terms` (`migrations/0090:146-217`) chỉ-thêm (trigger `:188-191`), chép `commission_kind/rate_bp/per_pax` và `commission_rule_id` (`:156`); trigger `ord_service_terms_rule_valid` (`:208-212`) chỉ kiểm lúc chụp. Đổi bảng mức, đổi loại của đối tác hay đóng một loại sau đó không đổi đơn đã chụp (ADR-0077 điều 8, ví dụ A-3).
- **Chụp lúc Xác nhận và lúc đổi bên đặt** gọi `docBangChoChup` (`src/modules/pricing/index.ts:26-32`), đọc vai mở của bên đặt rồi `nguoiHuongCua` (`rules.ts:46-58`) và `chonMuc`. Người hưởng và bậc đều suy từ vai hồ sơ đang mở, không phân biệt nhóm vai (trừ ca `KHONG_HUONG` ở `rules.ts:55`, cần nhóm EXTERNAL).
- **Khoá tháng** (`ky_period_close`, đợt 1) chặn ghi tiền có ngày thuộc tháng đã khoá; không đọc loại đối tác, nên không bị ảnh hưởng.
- **Đối soát/sổ hoa hồng đợt 2** (ADR-0078 B2, ADR-0079) **chưa làm**. Nó sẽ sửa đúng chỗ chặn "Đã giao" dưới đây (hai câu SQL ở `hoan-tat-repo.ts`, kèm trigger mới của `billing`) (ADR-0079 điều 5), nên thứ tự thi công hai việc phải phối hợp.
- **Điểm nguy hiểm đã kiểm bằng mã: chỗ chặn "Đã giao" khoá theo NHÓM EXTERNAL chứ không theo "được hưởng".** Câu ghi "Đã giao" của `orders` (`src/modules/orders/hoan-tat-repo.ts:76`) và cờ `co_nguoi_huong` đọc ở `:16` chỉ chặn khi bên đặt **đang** mang vai nhóm EXTERNAL (qua view `v_pty_open_role_group`, vốn chỉ trả INTERNAL/EXTERNAL và chỉ vai còn mở — `migrations/0024:26-30`). Luật `lyDoChuaGiaoDuoc` của `billing` (`src/modules/billing/rules.ts:459-460`, mã `booker_partner`) không tự đọc dữ liệu: cờ `coNguoiHuong` của nó đi từ `orders` (`hoan-tat.ts:47` → `billing/service.ts:250, 373`), nên chỗ phải sửa trong mã là hai câu SQL ở `hoan-tat-repo.ts`, còn `billing/rules.ts` chỉ đổi chữ câu báo khi cần. Nếu một loại đối tác mới thuộc nhóm OTHER thì đơn của đối tác đó **được chụp hoa hồng, nhưng bấm "Đã giao" được, rồi "Hoàn thành" được mà sổ không có dòng hoa hồng**; sau đó trigger "đã giao không chụp thêm" (`0090:195-197`) chặn sửa. Đây là lỗ về tiền mà phương án A bắt buộc phải vá cùng lúc.
- **Lỗ cùng loại đã có từ hôm nay (đọc mã, chưa chạy thử):** vì điều kiện đọc vai **đang mở**, nếu Quản trị kết thúc vai EXTERNAL của bên đặt (hoặc hồ sơ thôi vai) **sau khi** đơn đã xác nhận và chụp hoa hồng thì chỗ chặn tự gỡ, đơn qua "Đã giao" mà không có dòng hoa hồng nào (đợt 2 chưa làm), rồi trigger `ord_service_terms_delivered` (`0090:195-197`) chặn chụp lại. Trái nguyên tắc chụp tại mốc (Hiến chương 5.6). Đây là một khe tiền đang tồn tại, báo để chủ biết; đề xuất này sửa luôn khe ấy bằng cách ghim điều kiện vào bản chụp của chính đơn (phụ lục 3, lần 1 mục 6). Không thêm mục vào `docs/quyen-hoan.json`.

## 6. Bài kiểm và hàng rào đã có máy canh, liên quan trực tiếp

| Canh gì | Bằng gì |
|---|---|
| Danh mục vai trong mã khớp bảng tra; không vai nội bộ/bên ngoài ngoài `ROLE_CODES` | `src/roles-schema.test.ts:14-24` |
| Năm vai được hưởng gieo đúng; trigger chặn xoá/đổi khoá vai được hưởng; mức không chồng; mức riêng chỉ cho hồ sơ có vai được hưởng | `src/migrations-so-dai-ly.test.ts` |
| LC-1, LC-3 ở tầng dữ liệu | trigger `0024`/`0037`; `src/migrations-0024.test.ts`, `src/migrations-tai-xe-doi-tac.test.ts`; kiểm định kỳ `R-LC-1`, `R-LC-1b`, `R-LC-3` |
| Mức không chồng, vai tắt thì báo, hồ sơ thôi vai thì cảnh báo | `R-PRC-1`, `R-PRC-2`, `R-PRC-5` (`scripts/audit-checks.mjs:1380-1432`) |
| Một công thức hoa hồng duy nhất | `src/hoa-hong-mot-nguon.test.ts` (K-A-3) |
| Đại lý (người hưởng) không lộ tỷ lệ cho đối tác khác; số lạ toàn Nền tảng | `src/so-la-doi-tac.test.ts`, `src/so-la-thuong-mai-toan-nen-tang.test.ts`, `src/so-dai-ly-quyen-route.test.ts` |
| Bên đặt do máy chủ ép; Đối tác không chọn đại lý khác | `src/modules/orders/ben-dat-doi-tac.test.ts`, `src/shared/booker.ts:21-30` |
| Bản chụp chỉ-thêm, giữ mức sau khi đổi bảng | `src/modules/orders/chup-xac-nhan.test.ts`, trigger `0090:188-217` |
| Mỗi ô quyền mới phải được máy chủ hỏi | `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts` |

**Chưa có máy canh:** (a) "mọi loại đối tác nhóm OTHER mà được hưởng thì phải bị chặn ở Đã giao" — hôm nay chỉ nhóm EXTERNAL được canh; (b) "một dòng `pty_role_type` nhóm INTERNAL/EXTERNAL thêm lúc chạy phải nằm trong `ROLE_CODES`" — bài `roles-schema` chỉ chạy trên migration, không chạy trên dữ liệu thật. (c) "kết thúc vai của bên đặt sau khi đơn đã chụp hoa hồng thì đơn vẫn bị giữ ở Đã giao" — chưa có bài nào, và đọc mã thì khe này đang hở với vai EXTERNAL.
