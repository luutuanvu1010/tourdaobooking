# ADR-0117 lần 1 — Nhật ký thi công

Kế hoạch: `2026-10-14-adr-0117-lan-1-ke-hoach.md`. Nhánh: `claude/adr-0117-lan-1`. Điều phối: phiên `friendly-franklin`; người thi công: các phiên con (mỗi việc một phiên); người kiểm: `nguoi-kiem-doc-lap` (chỉ đọc).

## Điều kiện (Task 0) — 2026-10-14
- Chủ ra lệnh thi công trong chat 2026-10-14 ("thi công ADR-0117 lần 1 đi trong subagent"). Q1 = **A** (chủ chọn): đơn mới của khách mang loại đã tắt bị giữ, giống năm loại cũ.
- Số migration: `0095` trống trên mọi nhánh cục bộ và remote (kiểm bằng `git ls-tree`).
- Xây trên lỗ đang hở: **không có mã nào** (TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19, HC-5.11 — bảng và lý do ở kế hoạch). Căn cứ TNV-G3 cần người kiểm xác nhận bằng diff: `src/modules/orders/hoan-tat-repo.ts` và `src/modules/billing/*` không bị sửa.
- Hạn 2026-10-31 của năm mục sổ hoãn: chủ đã được báo; người thi công không sửa `docs/quyen-hoan.json`.

## Rulings của điều phối
1. Q1 = A (chủ chọn). Hoàn tác: bỏ vế `nhanDoiTac` ở `nguoiHuongCua`.
2. N-6 kiểm lệch cờ bằng DTO `dangBat` (hai cờ cùng bật), không đổi `R-PRC-6`.
3. `/tat` `/bat`: mã không phải loại nhãn → 404; đã ở trạng thái đó → 409 `stale`.

## Tiến độ
(điều phối ghi theo từng task)

### Task 1 — migration `0095_loai_doi_tac_la_du_lieu.sql` (người thi công, 2026-10-14)
- Bài `src/migrations-loai-doi-tac.test.ts` viết trước: 8/8 đỏ khi chưa có migration; sau migration 8/8 xanh. `R-PRC-6` thêm ở `scripts/audit-checks.mjs`, ca xanh/đỏ ở `src/audit-invariants.test.ts`.
- **Quan sát chặn thật (bước 6)**, bằng cách gỡ MỘT trigger trong CSDL thử của bản sao bài (không sửa migration đã commit), chạy lại 8 ca, rồi tạo lại (CSDL tạm bỏ đi): gỡ `pty_role_type_partner_label_other` → ca (f) đỏ; gỡ `pty_role_type_partner_label_immutable` → ca (f) đỏ; gỡ `pty_party_role_partner_label_conflict_ins` → ca (c) hai chiều đỏ (2 ca); gỡ `pty_party_role_partner_label_conflict_upd` → ca mở lại vai đỏ; gỡ `prc_beneficiary_role_kind` → ca (d) đỏ; gỡ `adr0117_permission_partner_label_internal` → ca `stf_permission` đỏ. Không gỡ gì → 8/8 xanh. `R-PRC-6`: ca đỏ trong `audit-invariants.test.ts` dựng bằng cách gỡ đúng trigger chặn rồi chèn lậu (đếm 1/1/1/2 theo từng nhánh).
- Hai bài cũ phải sửa vì chính migration mới làm chúng đỏ (nằm trong ý của ADR): `src/da-giao-khe-hoa-hong.test.ts` ca 4 (loại OTHER «NHAN_VIEN_SPA» nay phải mang cờ loại đối tác mới vào được danh sách hưởng) và `src/migrations-ten-vai-tai-xe-taxi.test.ts` (b) (chỉ so các cột đã có trước tệp đó).


### Task 2 — luật «nội bộ» ở máy chủ, hai chiều (người thi công, 2026-10-14)
- Bài thuần (`parties/rules.test.ts`, `staff/rules.test.ts`) đỏ trước (chưa có hàm), xanh sau; thêm bài ghim `VAI_CU_NOI_BO` = đúng danh sách mã vai cũ trong trigger 0095. Hai bài route mới (`parties/loai-doi-tac-noi-bo.test.ts`, `accounts/loai-doi-tac-noi-bo.test.ts`, 14 ca) chạy trên mã CHƯA sửa (bỏ tạm phần nguồn bằng `git apply -R`, rồi áp lại): 13 đỏ, 1 đối chứng xanh — vế 3 ở Danh bạ trả **201** (lỗ chỉ máy chủ canh), gộp phụ mang loại vào chính chỉ có tài khoản Bán hàng trả **200** (gộp thành công), các ca có trigger trả **500** (lỗi CSDL không ánh xạ) hoặc `merge_stale`. Sau khi sửa: 14/14 xanh.
- **Quan sát chặn thật:** gỡ tạm kiểm thuần ở `POST /api/parties/:id/roles` → ca vế 3 đỏ (201); gỡ tạm kiểm thuần ở `PUT /api/staff/:id/roles` → ca (i) đỏ: vẫn 409 (lưới `ruleViolation` ở lô hai) nhưng dòng quyền Quản trị ĐÃ đóng — đúng bẫy hai lô. Hoàn nguyên → xanh.
- Điều lệch/ghi chú: «vai đang mở» ở Danh bạ = `valid_to_date IS NULL`, mọi nơi (đúng định nghĩa trigger; bản đầu dùng «chưa hết hôm nay» chặn nhầm việc đổi phía trong ngày). Ở gộp hồ sơ dùng nghĩa «còn mở» của `gop.ts`. Bốn bài cũ thích ứng tối thiểu: `tai-xe-dieu-phoi.test.ts` (hợp đồng công bố thêm `hoSoMangNhanDoiTac`), `account-roles.test.ts` (`roleTypeOf` thêm `partnerLabel`), `gop.test.ts` và `gop-lo.test.ts` (khuôn `HoSoGop` thêm hai cờ).
- Lưới ánh xạ lỗi ở parties (`constraintProblem` khớp `partner_label_conflict` ⇒ 409 `role_partner_label_conflict`): mới quan sát bằng cách gỡ kiểm ở route mà giữ ánh xạ (ca có trigger ra 409 thay vì 500); chưa có bài cố định nào khoá riêng lưới này.
- Kiểm thuần ở `createAccountWithRolesStatements` (tạo tài khoản trên hồ sơ có sẵn): gỡ nó thì chưa bài nào đỏ, vì trigger + `ruleViolation` cho cùng 409 cùng câu — lớp này dựa vào lưới CSDL.
- **Ruling 7 (sau kiểm độc lập):** loại đối tác gắn kèm ngày kết thúc lọt chiều 2 (view / trigger / `hoSoMangNhanDoiTac` chỉ đếm `valid_to_date IS NULL`). Sửa ở cửa vào: `POST /api/parties/:id/roles` trả 400 `invalid_input` khi loại nhãn có `validTo` — không migration, giữ view/trigger. Bài mới đỏ trên mã trước sửa (201), xanh sau; quan sát chặn thật: gỡ vế chặn → đỏ (201) → hoàn nguyên. Đối chứng: loại nhãn không ngày → 201; `CUSTOMER` kèm ngày → 201. Thêm ca thuần `merge_partner_label_internal` hai hướng ở `gop.test.ts` (gỡ dòng chặn ở `keHoachGop` → đỏ → hoàn nguyên).
- **Ruling 8 (kiểm độc lập lượt 2, cùng gốc Ruling 7):** nút «Kết thúc» (`POST /api/parties/:id/roles/:rid/end`) nhận ngày tương lai. Dòng loại có hạn không còn `valid_to_date IS NULL` nên view, trigger và `hoSoMangNhanDoiTac` coi như hết nhãn. Thăm dò trên mã trước sửa cho thấy: gắn 201, kết thúc ngày 2027-06-30 được 200, rồi Nhân sự `PUT roles` sang SALES_STAFF cũng được 200 và tài khoản nhận quyền Bán hàng. Cách sửa không cần migration: route `/end` trả 400 `invalid_input` khi dòng thuộc loại nhãn mà ngày kết thúc sau hôm nay (giờ VN). Kết thúc hôm nay hay ngày đã qua vẫn 200; loại không phải nhãn vẫn nhận ngày tương lai như cũ. Bài mới đỏ trước (200) rồi xanh. Quan sát chặn thật: gỡ vế chặn thì đỏ, đã hoàn nguyên.
  - Đã rà các đường khác có thể đặt ngày kết thúc lên dòng vai:
    - Đường tài khoản (`closeAccountRoleStatement`) chỉ đóng vào hôm qua hoặc hôm nay.
    - Câu `END_ROLE` chỉ sửa dòng đang `valid_to_date IS NULL`, nên không đẩy được hạn của dòng đã đóng.
    - Gộp hồ sơ có chép `validTo` của dòng phụ sang hồ sơ chính (`gopMoVaiStatement`). Tuy vậy, sau Ruling 7 và 8 không còn đường nào trên giao diện hay API tạo ra dòng nhãn có hạn tương lai, chỉ còn SQL thẳng. Dòng nhãn bắt đầu sau hôm nay ở hồ sơ phụ thì đã bị `merge_source_future_row` chặn. Thêm vào đó, cờ của gộp đếm cả dòng có hạn tương lai (`conMo`), nên vẫn chặn được khi hồ sơ chính là nội bộ. Vì vậy không thêm mã ở đường gộp.

### Task 3 — route loại đối tác ở `pricing` + «người hưởng» với loại OTHER (người thi công, 2026-10-14)
- Bài `pricing/loai-doi-tac.test.ts` (22 ca: N-1…N-6, N-9, Q1) viết trước: 21/22 đỏ khi chưa có route (ca còn lại xanh vì 404 trùng kết quả mong đợi); sau khi cài 22/22 xanh. Thêm bài thuần `kiemTenLoaiDoiTac` / `maLoaiDoiTac` (`parties/rules.test.ts`), ca Q1 ở `pricing/rules.test.ts` (đỏ khi bỏ vế `nhanDoiTac`), `src/loai-doi-tac-cau-sql.test.ts` (lớp SQL của câu tắt / bật).
- N-5 / N-5b chạy xanh ngay trên mã «Đã giao» hiện có (không sửa `orders/hoan-tat-repo.ts`, không đụng `billing/`): căn cứ «không xây trên lỗ TNV-G3» giữ nguyên.
- **Quan sát chặn thật:** bỏ vế `AND is_partner_label = 1` ở câu tắt / bật → CHỈ bài lớp SQL đỏ (bài mức route vẫn xanh vì route đã tự trả 404 trước — nên phải có bài lớp SQL); bỏ vế `nhanDoiTac` ở `nguoiHuongCua` → ba bài đỏ (thuần, N-9, Q1); bỏ `changes() > 0` ở câu cờ danh sách được hưởng → bốn bài đỏ; bỏ `holdsPartner` ở `POST` → ca tài khoản lai Kế toán + Đối tác đỏ. Đều đã hoàn nguyên.
- Điều lệch / quyết định nhỏ: (1) câu cờ danh sách được hưởng có `AND changes() > 0` (chuỗi theo câu loại vai đứng trước) để bên thua không ghi lại cờ hay nhật ký; hệ quả: loại lệch cờ do SQL tay chỉ kéo được về đủ hai cờ bằng `/bat` khi cờ loại vai đang tắt, còn `/tat` khi cờ loại vai đã tắt trả 409 mà không động cờ kia; (2) tên loại bị từ chối nếu chứa dãy ≥ 8 chữ số hoặc `@` (nhật ký ghi tên); (3) hợp đồng công bố của `parties` thêm năm tên (`loaiVaiChiTiet`, `kiemTenLoaiDoiTac`, `maLoaiDoiTac`, `themLoaiDoiTacStatement`, `datHoatDongLoaiDoiTacStatement`) — sửa bài TC-3; (4) bốn route mới vào ảnh chụp `route-access` (296) và số route ghi của lớp vé (179, đi qua lớp vé); (5) `lich-su-doi-tac` phân loại ba hành động mới vào danh sách ẩn với Đối tác; (6) chưa có khoá duy nhất cho tên loại ở CSDL — hai lệnh thêm cùng tên đồng thời có thể cùng lọt (chỉ Kế toán / Quản trị / Toàn quyền bấm, không gây sai tiền).
