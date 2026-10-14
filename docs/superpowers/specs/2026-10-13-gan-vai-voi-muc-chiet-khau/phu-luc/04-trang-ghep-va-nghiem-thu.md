# Phụ lục 4 — Trang ghép, tiêu chí nghiệm thu, migration dự kiến (cho phương án A)

> **Cập nhật 2026-10-13 (sau lời chủ):** chủ đã chọn phương án A và các phương án khuyến nghị của ba câu hỏi (mức TA dùng chung; một đối tác nhiều loại như hôm nay; Kế toán/Quản trị/Toàn quyền dùng ô `partner.commission.write`, Quản trị gắn loại ở Danh bạ, không thêm ô quyền). Khe "Đã giao" được gộp vào lần 1. Phần dưới giữ nguyên làm dấu vết; **bản quyết định đề xuất là `../de-xuat-adr.md`, lệch nhau thì bản đó thắng.**

> **Cập nhật lượt 2 (2026-10-13, sau người kiểm độc lập):** (1) khe "Đã giao" **không** còn gộp vào lần 1: một phiên khác vá riêng và trước; đường tái hiện thật là `PUT /api/staff/:id/roles`, không phải Danh bạ; (2) thêm hàng rào nhân viên nội bộ không mang loại hưởng (điều 5 của ADR); (3) giữ thứ tự chọn mức hiện tại, có cảnh báo, ca vàng SV-TA-04b (300.000đ); (4) migration kế tiếp từ 0095; (5) lần 2 áp ngoại lệ ADR-0003 điều 10 với trình tự đã kiểm; (6) gộp hồ sơ là điểm nghi ngờ cần bài kiểm. Các mục cũ dưới đây có thể lệch; **`../de-xuat-adr.md` thắng.**

> **Cập nhật lượt 3 (2026-10-13, sau người kiểm bản 2):** mục «Migration dự kiến» ở dưới ("một migration rất nhỏ — trigger cấm vai INTERNAL") và các dòng «nếu câu hỏi 2 chọn (a)/(b)» **đã lỗi thời**: câu hỏi 2 đã chọn (nhiều loại như hôm nay); lần 1 nay gồm cột `is_partner_label`, view `v_pty_role_type`, trigger bất biến, trigger hai chiều ở `pty_party_role`, trigger ở `prc_beneficiary_role`, chặn ở gộp hồ sơ, ánh xạ thông báo lỗi; luật «nội bộ» cho hồ sơ vai `STAFF` cũ và ngoại lệ dựng lại bảng đang **chờ chủ chọn**; migration từ 0095. **Chỉ `../de-xuat-adr.md` còn giá trị khi lệch.**



Theo CLAUDE.md §9: mỗi lượt duyệt chạm dữ liệu/quyền phải kèm một trang ghép trả lời ba câu. Đây là bản cho phương án A (khuyến nghị); nếu chủ chọn C thì chỉ dòng tương ứng ở §1 và §3 còn đúng. Văn bản này chưa có người kiểm độc lập đọc; mọi chữ "chưa kiểm" là việc người kiểm phải làm.

## 1. Bảng nào chứa loại thực thể nào (sau khi đề xuất được thi công)

| Bảng (module chủ) | Hôm nay chứa | Sau lần 1 chứa thêm | Sau lần 2 |
|---|---|---|---|
| `pty_role_type` (parties) | vai nội bộ (INTERNAL), vai bên ngoài sinh quyền (EXTERNAL), vai/nhãn hồ sơ không sinh quyền kiểu cũ (OTHER: khách, nhà xe `CARRIER`, `SUPPLIER`, …) | **loại đối tác mới (OTHER, được hưởng hoa hồng)** | không đổi |
| `prc_beneficiary_role` (pricing) | năm vai EXTERNAL gieo sẵn | cả loại OTHER do Kế toán thêm; **không** nhận vai INTERNAL (trigger mới) | không đổi |
| `pty_party_role` (parties) | vai của cá nhân và tổ chức | loại đối tác của **hồ sơ tổ chức** và cá nhân (qua Danh bạ) | không đổi |
| `prc_commission_rule` (pricing) | dòng hoa hồng đích = đối tác hoặc loại | không đổi | thêm đích thứ ba = mức TA (làm lại bảng) |
| `prc_rate_tier`, `prc_role_tier` (pricing) | chưa có | — | mức TA; loại↔mức theo ngày |
| `ord_service_terms` (orders) | bản chụp chỉ-thêm | không đổi | không đổi hình dạng |

Đây đúng là khuôn "một bảng dùng chung nhận thêm một loại thực thể" đã gây lỗ F-01 trước đây (bài học 20/9, CLAUDE.md §9), nên bảng đầu tiên là chỗ người kiểm phải soi kỹ nhất: mọi câu SQL đọc `pty_role_type`/`v_pty_open_role` đều phải chịu được một vai nhóm OTHER mang nghĩa "được hưởng".

## 2. Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào

Không thêm, không sửa ô nào của `MATRIX` (`src/shared/permissions.ts`). Cột theo thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR`.

| Việc | Ô hỏi | Ai được (theo `MATRIX` hôm nay) | Áp cho loại nào |
|---|---|---|---|
| Xem danh sách loại đối tác và mức | `partner.commission.view` (`:130`) | Bán hàng, Kế toán, Quản trị, Toàn quyền; **không** Đối tác (route còn chặn thêm `holdsPartner`) | cả loại cũ lẫn mới |
| Thêm loại, tắt/bật loại, đặt mức, (lần 2) tạo mức TA, gắn loại↔mức | `partner.commission.write` (`:131`) | Kế toán, Quản trị, Toàn quyền | loại mới OTHER và năm loại cũ (chỉ tắt/bật và đặt mức; không đổi quyền của năm loại cũ) |
| Gắn / kết thúc loại cho một hồ sơ (Danh bạ) | `admin.manage` (route `POST /api/parties/:id/roles`, `parties/index.ts:1060`) | Quản trị, Toàn quyền (và luật cấp bậc với hồ sơ gắn tài khoản — bài `ho-so-co-tai-khoan.test.ts`) | chỉ loại nhóm OTHER; loại EXTERNAL vẫn 409 `role_via_account` |
| Ghi mức tay trên đơn | `order.terms.override` | không đổi | không đổi |
| Nhân sự (HR), tài xế, Tài xế đối tác | — | `none` ở mọi ô trên | — |

Hệ quả cần chủ biết: Kế toán đặt mức được nhưng không gắn loại cho hồ sơ được (không giữ `admin.manage`). Muốn khác phải thêm một ô quyền mới — thêm một mã/ô nhân đôi các bài "tập con quyền" và thêm ADR; câu hỏi 3, phương án (c).

## 3. Cổng nào canh cửa nào (kể cả chỗ giao diện ẩn/hiện)

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Route mới thêm/tắt loại, mức TA | cổng `office` + `can(staff, "partner.commission.write")` + `!holdsPartner(staff)` | cùng khuôn mọi route `/api/pricing/*` (`pricing/index.ts:84-141`); `route-write-guard.test.ts` bắt route ghi thiếu kiểm quyền |
| Gắn loại cho hồ sơ | cổng `admin` + `can(admin.manage)`; luật cấp bậc `canManageAccount` với hồ sơ gắn tài khoản | không đổi |
| **"Đã giao" cho đơn của bên đặt có loại được hưởng** | **hai câu SQL phải cùng đổi:** câu ghi của `orders` (`hoan-tat-repo.ts:76`) và cờ đọc `:16`; luật `lyDoChuaGiaoDuoc` của `billing` (`rules.ts:459`) dùng chung cờ đó nên không đổi logic | điều kiện mới = đơn có bản chụp hiện hành với người hưởng khác rỗng, **hoặc** (dự phòng đơn chưa có bản chụp) nhóm EXTERNAL đang mở. Đây là cửa tiền; xem N-5, N-5b |
| Chụp mức lúc Xác nhận / đổi bên đặt | `docBangChoChup` → `nguoiHuongCua` → `chonMuc` | đọc theo loại đang mở, không theo nhóm; phải chứng minh bằng bài chạy thật cho loại OTHER (chưa kiểm) |
| Ô «Đặt qua đối tác», `GET /api/pricing/nguoi-huong` | cổng `orders` + `order.create` + `!holdsPartner` | loại mới tự hiện vì nối `v_pty_open_role` với danh sách được hưởng (`repository.ts:47-50`); Kế toán chưa tra được vì không có `order.create` (BL-SDL-KE-TOAN-TRA, không đổi) |
| Bên đặt máy chủ ép cho tài khoản Đối tác | `benDatChoTaiKhoan` / `nguoiHuongCuaHoSo` (`src/index.ts:179`) | hồ sơ cá nhân của tài khoản mang loại OTHER cũng được ép; cần ca kiểm |
| **Chỗ giao diện ẩn/hiện bị đổi nghĩa** | nhãn «Bên đặt (đối tác)» (`web/order.ts:1201`, cờ `bookerLaDoiTac` của máy chủ, `orders/repository.ts:84`); nạp bên đặt vào ô «Đặt qua đối tác» (`phan-doi-tac-hien-thi.ts:59`); danh sách "Thêm công việc" của Danh bạ (`web/parties.ts:310` liệt kê mọi loại đang bật nhóm OTHER, nên loại mới tự hiện, lẫn với "Khách hàng", "Nhà xe"); mục «Loại đối tác» trong màn Hoa hồng; Trợ giúp và Trợ lý Mai | cờ do máy chủ tính, giao diện không tự suy. Danh bạ cần phân biệt loại đối tác (ví dụ ghi chú hoặc nhóm hiển thị) để người gắn không chọn nhầm; chưa thiết kế giao diện |
| Đối tác (vai Đối tác) | 403 ở mọi route mới; DTO của Đối tác không có tên loại, mức, tỷ lệ | giữ C9 = A (ADR-0077) |

## 4. Tiêu chí nghiệm thu bằng hành vi kiểm được (P20)

Mỗi tiêu chí viết đỏ trước, xanh sau; hàng rào mới phải được quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên) rồi ghi vào `docs/SO-HANG-RAO.md`.

**Lần 1 — loại đối tác là dữ liệu**
- N-1. Kế toán, Quản trị, Toàn quyền thêm loại bằng route → 201, có một dòng `pty_role_type` nhóm OTHER đang bật, một dòng `prc_beneficiary_role`, một dòng nhật ký (không chứa số điện thoại, email, mã số thuế). Bán hàng, HDV, Nhân sự, Đối tác, Tài xế → 403. Tên trùng (kể cả không dấu) → 409.
- N-2. **Loại mới không bao giờ cấp quyền:** sau khi thêm loại, `ROLE_CODES`, `roles-schema.test.ts` không đổi; tập quyền của **mọi** tài khoản (bảng `stf_permission`) trước = sau; `PUT /api/staff/:id/roles` với mã loại mới → 400 (không phải vai tài khoản); gán loại mới cho hồ sơ của một tài khoản Đối tác không làm tài khoản đó đổi quyền.
- N-3. **Tổ chức mang được loại:** Quản trị gán loại mới cho hồ sơ tổ chức qua Danh bạ → 201; hồ sơ đó xuất hiện ở `GET /api/pricing/nguoi-huong` và chọn làm bên đặt được; (đối chứng) gán vai EXTERNAL cũ cho tổ chức vẫn 409.
- N-4. Kế toán đặt mức cho loại mới; đơn của hồ sơ mang loại đó, xác nhận → bản chụp `SET` đúng số; không có mức → `MISSING`/`NO_RULE`, không bao giờ 0.
- **N-5 (cứng, tiền).** Đơn có bên đặt chỉ mang loại mới (nhóm OTHER, không vai EXTERNAL) **không bấm được "Đã giao"**, ở cả hai chỗ đọc (câu ghi của `orders` và cờ cho `billing`), kể cả khi Quản trị/Toàn quyền bấm; câu báo `booker_partner` hiện đúng. Phép phá: gỡ điều kiện mới ở một trong hai chỗ → bài đỏ.
- **N-5b (cứng, tiền).** Sau khi đơn đã xác nhận và chụp hoa hồng: Kế toán tắt loại, hoặc Quản trị kết thúc loại của hồ sơ → đơn **vẫn bị giữ** ở "Đã giao". Cùng bài với vai EXTERNAL (kết thúc vai sau xác nhận → vẫn bị giữ), để khép khe đang có hôm nay. Đơn xác nhận trước đợt 1 (chưa có bản chụp) giữ hành vi cũ nhờ điều kiện dự phòng.
- N-6. Tắt loại: gắn mới bị chặn, dòng mức cũ còn nguyên (`R-PRC-2` báo khi còn hiệu lực), đơn đã chụp không đổi.
- N-7. Thử đưa vai INTERNAL vào `prc_beneficiary_role` → trigger chặn. Thêm loại bằng route luôn ra nhóm OTHER (bài khoá).
- N-8. Bài "số lạ toàn Nền tảng" và DTO Đối tác (hiện có) vẫn xanh, thêm một ca dùng loại mới: đối tác khác không thấy tên loại, tỷ lệ hay mức.
- N-9. Mọi chỗ đọc "người hưởng" liệt kê ở phụ lục 3 (lần 1, mục 8) có một ca chạy thật với loại OTHER: chụp mức, `bookerLaDoiTac`, `GET /api/auth/me`, tìm người hưởng, trigger `prc_commission_rule_target_party`, `R-PRC-5`.
- N-10. Kiểm định kỳ mới (loại nhóm INTERNAL/EXTERNAL đang bật phải thuộc `ROLE_CODES`) có ca đỏ và ca xanh; `audit-invariants --db local` sau e2e sạch.

**Lần 2 — mức TA** (chỉ khi câu hỏi 1 chọn (a) hoặc (b))
- N-11. Tạo mức, thêm dòng hoa hồng cho mức, gắn loại với mức theo ngày; "Thử tra" hiện mức thắng, tên mức và bậc 7–9.
- N-12. **Đơn đã chụp giữ nguyên:** đổi mức của một loại (đóng gắn cũ, mở gắn mới) hoặc đổi số của mức → đơn đã xác nhận trước đó vẫn đúng con số cũ (so bản chụp bằng SQL trước/sau); đơn xác nhận sau dùng mức mới.
- N-13. Mỗi trigger của hai bảng mới thấy chặn thật: xoá, sửa số, chồng ngày, loại không nằm trong danh sách được hưởng, mức đã tắt.
- N-14. Làm lại `prc_commission_rule` trên D1 local tạm: các bản chụp cũ giữ nguyên, mọi `commission_rule_id` vẫn trỏ tới dòng tồn tại, `audit-invariants` (`R-PRC-1…5`, `R-ORD-T1/T2`) sạch; chỉ khi đạt mới viết phần còn lại.
- N-15. `chonMuc` vẫn là một hàm (bài `hoa-hong-mot-nguon.test.ts` xanh); bảng ca đủ chín bậc, ranh ngày, xung đột (nếu câu hỏi 2 chọn (a), nhiều loại cùng lúc).
- N-16. Sổ vàng có ca mới (mức dùng chung chia theo nhóm dịch vụ; đổi mức giữa kỳ), chủ hoặc Kế toán xác nhận từng ca; AI không tự đánh dấu.
- N-17. Quét tập con quyền cho route mới; Đối tác không thấy tên mức.

## 5. Migration dự kiến (chỉ nêu, chưa viết)

- **Lần 1:** một migration rất nhỏ — trigger cấm đưa vai nhóm INTERNAL vào `prc_beneficiary_role`; có thể thêm chỉ mục duy nhất theo tên loại (chưa quyết). Không đổi bảng dữ liệu nào, không dòng dữ liệu nào bị sửa. Loại đối tác là dòng dữ liệu thêm bằng route, không bằng migration.
- **Lần 2:** một migration — hai bảng `prc_rate_tier`, `prc_role_tier` với trigger chỉ-thêm/đóng/không chồng, làm lại `prc_commission_rule` (đích thứ ba), tạo lại trigger và view của bảng đó. Không sửa tệp migration đã áp remote (CLAUDE.md §7).
- **Số tệp:** số lớn nhất hiện trong `migrations/` là `0093`; số kế tiếp = số lớn nhất + 1 sau khi liệt kê migration của mọi nhánh chưa gộp lúc tạo tệp (CLAUDE.md §10). Chưa kiểm các nhánh khác.
- **Expand–contract:** cả hai lần chỉ thêm; làm lại bảng giữ nguyên cột cũ nên Worker cũ vẫn ghi/đọc được bảng mới (chưa kiểm bằng bài); không có bước "co lại" trong đề xuất này (xem "Bước sau" ở phụ lục 3).

## 6. Việc lớn, người kiểm độc lập, mục sổ hoãn, ADR cũ bị ảnh hưởng

- **Việc lớn: cả hai lần** (dữ liệu: migration, làm lại bảng tiền; tiền: chọn mức, chỗ chặn "Đã giao"; quyền: cổng route mới). Mỗi lần xong phải có subagent kiểm độc lập chỉ đọc (CLAUDE.md §3), đọc mã thật và chạy lại lệnh. Trọng tâm người kiểm: (a) N-5 và N-9 (mọi chỗ đọc "người hưởng"); (b) N-2 (không sinh quyền); (c) N-14 (làm lại bảng); (d) hàng rào mới có được quan sát chặn thật không.
- **`docs/quyen-hoan.json`:** đề xuất không thêm mục hoãn nào (không ô `MATRIX` mới, mỗi route hỏi ô có sẵn). Về "xây trên lỗ đang hở": sáu phát hiện HIGH còn mở (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2, hạn 31/10 và 15/11). Lần 1 chạm cửa "Đã giao" của sổ tiền nhưng chỉ **thêm** một điều kiện chặn, không ghi dòng sổ nào — nhận định của người soạn, **chưa rà từng mục**; người soạn đặc tả thi công phải rà và ghi "xây trên lỗ đang hở: <mã>" nếu có. Lần 2 không chạm sổ tiền ngoài bảng mức.
- **`docs/SO-HANG-RAO.md`:** thêm một dòng cho mỗi hàng rào mới (trigger cấm INTERNAL, bài khoá "không sinh quyền", bài hai lớp "Đã giao", kiểm định kỳ mới; lần 2: trigger hai bảng, bài làm lại bảng), mỗi dòng có ngày đã thấy chặn thật.
- **`docs/BACKLOG.md`:** BL-SDL-TO-CHUC (dòng 258) đóng được cho loại mới, còn mở cho năm loại cũ cho tới "Bước sau"; BL-SDL-KE-TOAN-TRA không đổi.
- **ADR cũ bị ảnh hưởng — không sửa tại chỗ, viết ADR đề xuất mới có bảng "Sửa câu" (số do chủ duyệt cấp; số kế tiếp hiện là 0117, 0114 đã giữ cho đề xuất sửa số khách):**

| ADR cũ | Điều | Sửa gì |
|---|---|---|
| ADR-0077 | 2 | "gieo năm mã" → danh sách do Kế toán quản lý trên màn hình; nội bộ vẫn không hưởng |
| ADR-0077 | 3 | "bên đặt mang vai được hưởng" nay gồm loại nhóm OTHER; câu về `BOOKER_NOT_BENEFICIARY` giữ |
| ADR-0077 | 4, 6 (lần 2) | đích dòng mức thêm "mức TA"; sáu bậc → chín bậc |
| ADR-0079 | 5 | chỗ chặn "Đã giao" ở `orders` đổi điều kiện sang theo bản chụp (đợt 2 sẽ đổi tiếp) |
| ADR-0077 | 3 (chỉ nếu câu hỏi 2 chọn (b)) | bỏ ca hai vai cho hai mức khác nhau; đụng phần vai tài khoản |
| ADR-0078 | 1 | không sửa; dẫn làm tiền lệ nhóm OTHER |
| ADR-0018 | 2, 11 | **không sửa** ở phương án A (chỉ sửa nếu làm "Bước sau" hoặc phương án B) |
| ADR-0001 | 2 | không sửa; đề xuất này đưa mã về đúng điều "thêm loại = thêm dòng" |

- **Tài liệu sống phải cập nhật cùng lần phát hành:** `docs/SYSTEM-DESIGN.md` (bảng `prc_beneficiary_role` ở §5 và phần vai), `docs/data-dictionary.json` rồi `npm run dict`, `docs/CHANGE-GUIDE.md` (công thức "thêm loại đối tác" nay là một màn hình, không phải migration), Trợ giúp (hướng dẫn Kế toán), mục nhật ký thay đổi, Trợ lý Mai (sinh lại khi `npm run build:web`).
- **Phần chưa kiểm của cả đề xuất:** (1) hành vi D1 khi làm lại bảng đang bị bảng chỉ-thêm trỏ tới (lần 2); (2) từng chỗ đọc "người hưởng" với loại OTHER bằng bài chạy thật; (3) dữ liệu production có còn chỉ là dữ liệu thử không; (4) giao diện Danh bạ phân biệt loại đối tác thế nào; (5) mọi tệp e2e và kịch bản Chrome nhắc năm mã vai cũ; (6) các nhánh chưa gộp đang giữ số migration.
