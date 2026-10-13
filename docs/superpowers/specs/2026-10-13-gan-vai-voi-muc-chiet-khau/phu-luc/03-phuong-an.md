# Phụ lục 3 — Ba phương án và thiết kế đề xuất

> **Cập nhật 2026-10-13 (sau lời chủ):** chủ đã chọn phương án A và các phương án khuyến nghị của ba câu hỏi (mức TA dùng chung; một đối tác nhiều loại như hôm nay; Kế toán/Quản trị/Toàn quyền dùng ô `partner.commission.write`, Quản trị gắn loại ở Danh bạ, không thêm ô quyền). Khe "Đã giao" được gộp vào lần 1. Phần dưới giữ nguyên làm dấu vết; **bản quyết định đề xuất là `../de-xuat-adr.md`, lệch nhau thì bản đó thắng.**

> **Cập nhật lượt 2 (2026-10-13, sau người kiểm độc lập):** (1) khe "Đã giao" **không** còn gộp vào lần 1: một phiên khác vá riêng và trước; đường tái hiện thật là `PUT /api/staff/:id/roles`, không phải Danh bạ; (2) thêm hàng rào nhân viên nội bộ không mang loại hưởng (điều 5 của ADR); (3) giữ thứ tự chọn mức hiện tại, có cảnh báo, ca vàng SV-TA-04b (300.000đ); (4) migration kế tiếp từ 0095; (5) lần 2 áp ngoại lệ ADR-0003 điều 10 với trình tự đã kiểm; (6) gộp hồ sơ là điểm nghi ngờ cần bài kiểm. Các mục cũ dưới đây có thể lệch; **`../de-xuat-adr.md` thắng.**

> **Cập nhật lượt 3 (2026-10-13, sau người kiểm bản 2):** mục «Migration dự kiến» ở dưới ("một migration rất nhỏ — trigger cấm vai INTERNAL") và các dòng «nếu câu hỏi 2 chọn (a)/(b)» **đã lỗi thời**: câu hỏi 2 đã chọn (nhiều loại như hôm nay); lần 1 nay gồm cột `is_partner_label`, view `v_pty_role_type`, trigger bất biến, trigger hai chiều ở `pty_party_role`, trigger ở `prc_beneficiary_role`, chặn ở gộp hồ sơ, ánh xạ thông báo lỗi; luật «nội bộ» cho hồ sơ vai `STAFF` cũ và ngoại lệ dựng lại bảng đang **chờ chủ chọn**; migration từ 0095. **Chỉ `../de-xuat-adr.md` còn giá trị khi lệch.**



Từ dùng trong phụ lục này: **loại đối tác** là cách gọi của chủ cho "nhãn kinh doanh" (Lễ tân khách sạn, Tài xế taxi, Cộng tác viên…); **mức TA** là cách chủ gọi TA1, TA2, TA3 (nghĩa chính xác chờ câu hỏi 1). **Vai tài khoản** là 15 vai trong `src/shared/roles.ts`, sinh quyền đăng nhập. Nguyên tắc xuyên suốt: loại đối tác mới **không bao giờ tự cấp quyền**, và đổi loại hay đổi mức **không đổi đơn đã chụp**.

## Bảng so sánh

| | A: loại và mức là dữ liệu (khuyến nghị) | B: biến chính vai tài khoản thành dữ liệu | C: thêm vai cứng |
|---|---|---|---|
| Giải đúng điều chủ muốn? | Có: thêm loại trên màn hình, gắn loại với mức TA, đổi không sửa mã | Có, và hơn mức cần | Không: mỗi loại mới vẫn là một lần sửa mã; không có mức TA |
| Hợp tinh thần (phụ lục 2) | Có (sửa L1–L6) | Có nhất, nhưng đi quá xa | Không sửa L1–L6, chỉ kéo dài |
| Đụng quyền | Không: không ô quyền mới, không đổi `ROLE_CODES`, LC-1/LC-3 không đổi | Có: bộ quyền mặc định của vai, LC-1, LC-3, LC-4 phải đọc từ dữ liệu | Có thêm 1 vai EXTERNAL mỗi lần (sinh quyền Đối tác) |
| Đụng dữ liệu tiền | Có: chỗ chặn "Đã giao", bảng mức (lần 2) | Gián tiếp | Rất ít |
| ADR cũ phải sửa bằng ADR mới | ADR-0077 (điều 2, 3, 4, 6), ADR-0079 điều 5; không đụng ADR-0018 điều 2 | ADR-0018 điều 2 và 5, ADR-0014, nhiều điều ADR-0071/0072/0090 | Không |
| Cỡ việc (tương đối, chưa ước giờ) | Lần 1 vừa; lần 2 lớn | Rất lớn | Nhỏ mỗi lần |
| Rủi ro lớn nhất | Quên vá chỗ chặn "Đã giao" (lỗ tiền); làm lại bảng mức trên D1 (lần 2) | Sinh nhầm quyền cho hàng loạt tài khoản; đảo lại lựa chọn chủ đã loại ở ADR-0018 | Nợ tăng dần; hồ sơ tổ chức vẫn không mang được loại |
| Phát hành | Hai lần, chỉ thêm | Nhiều lần, có phá vỡ | Mỗi lần thêm là một lần |

## Phương án C — thêm vai cứng (để so sánh, không khuyến nghị)

Làm đúng như phụ lục 1 mục 3: một migration hai dòng, hai chỗ trong `roles.ts`, bốn bài kiểm ghi cứng năm vai, hai chỗ tài liệu, một mục nhật ký, một lần phát hành. Nhỏ và an toàn, vì nó chỉ lặp lại cách đã làm năm lần. Nhược điểm: không có mức TA dùng chung (vẫn phải nhập số cho từng loại), loại mới vẫn sinh quyền Đối tác và vẫn chỉ gán qua màn Tài khoản (nên vẫn không dùng được cho tổ chức), mỗi loại mới cần lập trình viên. Chỉ hợp lý nếu chủ chỉ cần thêm một hai loại trong vài tháng tới.

## Phương án B — biến chính vai tài khoản thành dữ liệu (không khuyến nghị)

Phải đưa `ROLES` (tên, nhóm, quyền mặc định, có nhận đơn không, chỉ Toàn quyền gán) từ mã vào bảng, cho Toàn quyền sửa. `src/shared/roles.ts` là tệp thuần dùng chung máy chủ và trình duyệt (`roles.ts:1-5`), nên cả hai phía phải nhận định nghĩa vai qua API thay vì import. Mọi hàm sinh quyền (`effectivePermissions`, `roleAssignmentProblem`, `highPermissionProblem`) và các bài quét tập con quyền phải đổi. Khó nhất là an ninh: người sửa được bảng "vai → quyền" tự cấp được quyền, nên phải thêm một lớp luật mới. ADR-0018 điều 2 và mục "Phương án bị loại" đã chủ động loại đúng điều này ("Toàn quyền sửa bảng vai → quyền ngay trong app"). Mục tiêu của chủ là phân loại để tính hoa hồng, không phải sửa quyền, nên B giải quyết thừa. Chỉ nên nghĩ đến B sau khi A chạy ổn và chủ muốn gom năm vai đối tác thành một vai "Đối tác" (xem "Bước sau" cuối phụ lục).

## Phương án A — thiết kế

### Lần 1 — Loại đối tác là dữ liệu (chỉ thêm)

1. **Lưu ở đâu.** Mỗi loại mới là một dòng `pty_role_type` nhóm `OTHER` (cùng khuôn `SUPPLIER` ở ADR-0078 điều 1 và `CARRIER`) cộng một dòng trong `prc_beneficiary_role` (danh sách loại được hưởng hoa hồng). Không tạo bảng "loại" thứ hai: tái dùng bảng tra ADR-0001 điều 2 đã định cho việc này, và tái dùng luôn bảng gán vai có hiệu lực theo ngày, chống chồng lấn, nhật ký (`pty_party_role`). Mã do máy chủ sinh (chữ hoa, không do người gõ; bảng đòi mã viết hoa — `migrations/0011:69`); tên do Kế toán gõ, không trùng tên loại nào đang có.
2. **Vì sao nhóm OTHER làm loại mới không bao giờ cấp quyền.** Hai lớp, đã đọc ở mã: (a) hàm sinh quyền chỉ lấy vai thuộc `ROLE_CODES` (`src/modules/staff/index.ts:234`; `roles.ts:55`), mã lạ bị bỏ qua và `parseRoleAssignment` từ chối; (b) LC-1 và LC-3 chỉ canh nhóm INTERNAL/EXTERNAL (`migrations/0024:26-30, 33-`; `audit-checks.mjs:166, 183`), nhóm OTHER đứng ngoài. Cần một bài khoá rõ: thêm loại bằng route thì `ROLE_CODES`, `roles-schema.test.ts` và quyền của mọi tài khoản **không đổi**.
3. **Ghi vào bảng của module khác.** `pty_role_type` thuộc `parties`, `prc_beneficiary_role` thuộc `pricing`; theo Hiến chương 5.3, `parties` công bố một hàm trả câu `INSERT` chưa chạy, `pricing` gộp hai câu và dòng nhật ký vào một `db.batch` (khuôn đã dùng ở `pricing/index.ts:99-102`). Route mới trong `pricing`: thêm loại, tắt/bật loại; ô hỏi là `partner.commission.write` (đã có, `permissions.ts:131`), không thêm ô.
4. **Màn hình.** Mục "Loại đối tác" trong màn Hoa hồng đối tác (`web/hoa-hong.ts`, lấy sẵn danh sách `vai` từ máy chủ): hiện cả năm loại cũ (ghi chú "cấp quyền Đối tác") và loại mới; thêm; tắt. Giao diện chỉ ẩn/hiện nút theo cờ máy chủ trả, không tự suy từ quyền.
5. **Gắn loại cho hồ sơ.** Dùng sẵn route Danh bạ `POST /api/parties/:id/roles` (ô `admin.manage`): vì nhóm OTHER nên không dính `role_via_account` (`parties/index.ts:1077`), **dùng được cho hồ sơ tổ chức** — đóng được BL-SDL-TO-CHUC cho các loại mới. Hệ quả cần nói rõ: Kế toán không giữ `admin.manage` (e2e `tests/e2e/so-dai-ly.mjs:41` xác nhận 403), nên Kế toán đặt mức còn Quản trị gắn loại cho hồ sơ; muốn Kế toán tự gắn thì cần thêm ô quyền mới (câu hỏi 3, phương án c).
6. **Vá chỗ chặn "Đã giao" trong cùng lần phát hành (bắt buộc).** Hai câu SQL ở `hoan-tat-repo.ts:16` (cờ) và `:76` (điều kiện ghi) hôm nay hỏi "bên đặt **đang** mang vai nhóm EXTERNAL". Đọc thẳng "loại đang bật" thì vẫn hở: Kế toán tắt loại, hoặc Quản trị kết thúc loại của hồ sơ, **sau khi** đơn đã chụp hoa hồng, chỗ chặn gỡ ra, đơn qua "Đã giao" không có dòng hoa hồng, rồi bản chụp bị khoá (phụ lục 1 mục 5) — đúng khe này cũng đang có với vai EXTERNAL hôm nay. Vì vậy điều kiện đề xuất là: **đơn có bản chụp hiện hành (không bị bản nào thay thế) với `beneficiary_party_id` khác rỗng**, đọc ngay trong bảng `ord_service_terms` của chính `orders` (không đọc chéo module); **cộng** điều kiện cũ (nhóm EXTERNAL đang mở) làm dự phòng cho đơn xác nhận trước đợt 1 chưa có bản chụp. Cờ `coNguoiHuong` của `billing` lấy từ cùng cột nên `billing/rules.ts` không phải sửa logic. Không vá thì loại nhóm OTHER cho đơn qua "Đã giao" mà không có dòng hoa hồng. Đợt 2 của sổ đại lý (ADR-0079 điều 5) sẽ sửa lại đúng chỗ này; làm lần 1 trước đợt 2 thì đợt 2 chỉ thay điều kiện giữ mới, không phải gỡ lỗi.
7. **Hàng rào dữ liệu thêm.** Trigger chặn đưa vai nhóm INTERNAL vào `prc_beneficiary_role` (nội bộ không hưởng hoa hồng — ADR-0077 nguồn, Q4); bài khoá "loại thêm bằng route luôn là OTHER"; kiểm định kỳ mới cho "loại nhóm INTERNAL/EXTERNAL đang bật đều nằm trong `ROLE_CODES`" (cách script đọc danh sách mã chưa quyết, để ở kế hoạch). Đây là trường hợp "máy canh nay chưa có" ở phụ lục 1 mục 6.
8. **Những chỗ đọc "người hưởng" đã không phụ thuộc nhóm** (nên không phải sửa): `nguoiHuongCua` (`rules.ts:46`), `docBangChoChup` (`index.ts:26`), `isBeneficiary`/`huongCuaHoSo`/`findBeneficiaries` (`pricing/repository.ts:39-50`), trigger `prc_commission_rule_target_party` (`0090:77-80`), `R-PRC-5` — tất cả nối `v_pty_open_role` (mọi nhóm) với danh sách được hưởng. **Chưa kiểm** bằng bài chạy thật; tiêu chí nghiệm thu ở phụ lục 4 đòi chứng minh từng chỗ.
9. **Tên trùng.** Loại mới tên "Công ty lữ hành" sẽ trùng chữ với vai cũ. Quy ước ở kế hoạch: không cho tên trùng (kể cả không dấu); loại mới nên có tên khác, hoặc để năm loại cũ giữ nguyên và chỉ thêm loại thật sự mới, đến "Bước sau" mới dọn.

### Lần 2 — Mức TA1/TA2/TA3 (chỉ làm nếu câu hỏi 1 chọn (a) hoặc (b))

1. **Hai bảng mới.** `prc_rate_tier` (mã viết hoa, tên, đang dùng) và `prc_role_tier` (loại → mức, có `valid_from/valid_to`; chỉ-thêm và đóng, không xoá, không chồng; một loại một mức tại một ngày; loại phải thuộc danh sách được hưởng) theo khuôn trigger của `prc_commission_rule` (`0090:63-76`).
2. **Dòng hoa hồng của mức.** Mức TA mang dòng hoa hồng theo dịch vụ / nhóm / mọi dịch vụ, % hoặc đ/khách, có ngày hiệu lực, giống hệt dòng của loại. Cách lưu — đây là rủi ro kỹ thuật lớn nhất của cả đề xuất, nên nêu rõ ba đường:
   - **(i) Làm lại bảng `prc_commission_rule`** để cho phép đích thứ ba (mức), giữ nguyên mã dòng. Cần thiết vì `CHECK` "đúng một trong đối tác/loại" ở `0090:56` và khoá ngoại `target_role_code → prc_beneficiary_role` không sửa tại chỗ được trong SQLite. Khó ở chỗ bảng này được bảng chụp `ord_service_terms` trỏ tới bằng khoá ngoại (`0090:156`) và bản chụp là chỉ-thêm. Tiền lệ làm lại bảng trong repo có: `migrations/0007` làm lại `audit_log` bằng bảng `_new` rồi `RENAME` (`:6-19`); **không có tiền lệ làm lại bảng đang bị một bảng chỉ-thêm khác trỏ tới**, và **chưa kiểm** hành vi của D1 với `PRAGMA defer_foreign_keys` ở trường hợp đó. Phải tạo lại sáu trigger, một view, hai chỉ mục của bảng. Dữ liệu hôm nay là dữ liệu thử (lời chủ 8/10; **chưa kiểm lại** trước khi dựa vào).
   - **(ii) Bảng dòng riêng cho mức** cộng cột chụp mới: phải làm lại luôn bảng chụp (vì `CHECK` ở `0090:182`), nặng hơn (i). Loại.
   - **(iii) Sao chép dòng khi gắn mức**: không đổi bảng nào, nhưng cùng một con số nằm hai nơi, sửa mức TA phải chạy lệnh đồng bộ, dễ lệch, trái tinh thần Hiến chương 5.4 (một con số có đúng một nơi giữ). Chỉ là đường lui nếu (i) thất bại khi thử.
   - Khuyến nghị (i), với **việc đầu tiên của kế hoạch lần 2 là thử làm lại bảng trên D1 local tạm** (có `audit-invariants` sau đó) trước khi viết gì khác.
3. **Chọn mức mở rộng từ sáu bậc lên chín.** Bậc 1–3 đối tác riêng; 4–6 loại riêng (như hôm nay); **7–9 mức TA của loại** × dịch vụ / nhóm / mọi dịch vụ. Loại riêng vẫn thắng mức dùng chung vì cụ thể hơn. Nếu câu hỏi 2 chọn (a) (khuyến nghị: nhiều loại cùng lúc như hôm nay) thì ca "hai loại, hai mức khác nhau → thiếu mức" giữ như `rules.ts:85`, mở rộng cho bậc 7–9; chọn (b) (một loại tại một thời điểm) thì ca đó biến mất, nhưng phải sửa `roleAssignmentProblem` và bảng chọn vai (năm vai đối tác hiện đi cùng nhau được — `src/shared/roles.test.ts:263`) và câu hai-vai của ADR-0077 điều 3, tức là đụng đúng phần vai tài khoản mà phương án A hứa để yên. Vẫn một hàm `chonMuc` duy nhất (Hiến chương 5.4, bài `hoa-hong-mot-nguon.test.ts`).
4. **Bản chụp không đổi hình dạng:** vẫn chép loại/số/mã dòng nguồn vào `ord_service_terms`; đổi mức TA, đổi loại của một mức, đóng một mức sau đó không đổi đơn đã chụp (ADR-0077 điều 8; Hiến chương 5.6).
5. **Giao diện:** mục "Mức TA" trong màn Hoa hồng đối tác (thêm mức, thêm dòng hoa hồng cho mức, gắn loại vào mức theo ngày); khung "Thử tra" hiện thêm mức và bậc 7–9; đối tác (vai Đối tác) **không** thấy tên mức hay tỷ lệ (C9 = A, đặc tả sổ đại lý §6). Phần nhãn mới ở màn đơn không đổi.
6. **Chuyển từ hôm nay:** không cần migration dữ liệu. Năm loại cũ giữ dòng riêng của chúng; Kế toán tự quyết dần dần chuyển sang mức TA bằng màn hình (tạo mức, gắn loại, đóng dòng riêng). Đơn đã chụp không ảnh hưởng.

## Thứ tự thi công đề xuất

1. Chủ trả lời ba câu; AI soạn ADR đề xuất (số do chủ cấp) kèm trang ghép (phụ lục 4), **một lượt duyệt tối đa ba quyết định chạm dữ liệu/quyền** (CLAUDE.md §9): (1) loại đối tác là dữ liệu + vá chỗ chặn "Đã giao"; (2) mức TA; (3) Kế toán/Quản trị làm gì.
2. Lần 1: bài đỏ trước cho chỗ chặn "Đã giao" → vá → route và màn Loại đối tác → trigger/kiểm định kỳ → e2e → kiểm độc lập chỉ đọc → phát hành.
3. Hỏi chủ lại trước khi làm đợt 2 sổ đại lý; nếu đợt 2 chưa bắt đầu thì lần 1 xong trước nó.
4. Lần 2: thử làm lại bảng trên D1 tạm trước hết; sau đó bảng mức, bảng gắn, `chonMuc` chín bậc, màn, bài "số lạ", sổ vàng; kiểm độc lập; phát hành.

## Bước sau (không đề xuất làm bây giờ)

Gom năm vai tài khoản đối tác thành một vai kỹ thuật "Đối tác" cộng loại đối tác thuần dữ liệu, rồi chuyển năm loại cũ thành loại thuần dữ liệu. Làm ở "vòng thu hẹp" sau (expand–contract): phải sửa `ROLE_CODES`, LC-1b, nhiều bài kiểm, và chuyển dữ liệu vai đang mở của các tài khoản đối tác. Cần ADR riêng, không nằm trong đề xuất này.
