# HANDOFF — N1 (nền danh tính: hồ sơ, địa điểm, quyền app)

Đặc tả: `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20). ADR: `docs/adr/ADR-0001…0008`. Kế hoạch: `docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md` và `…-n1-b-chuyen-quyen.md`.

## Đã có sau N1 (lần phát hành 1)
- Migration `0009…0012` (chỉ thêm — mã cũ vẫn chạy): `v_ord_order_label`, `loc_*` (8 địa điểm), `pty_*` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ), `stf_*` + `staff.party_id` + backfill hồ sơ/quyền cho tài khoản có sẵn.
- API: `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`; `POST /api/staff` nhận `permissions[]` (thay `role`).
- Quyền theo bản đồ ADR-0007 ở `src/shared/permissions.ts`; router có `access: "office"`. Tài khoản chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ (màn hình "việc của tôi" của họ thuộc N2 — hiện họ đăng nhập được nhưng không có mục nào).
- Trang web: `/parties` (Hồ sơ), `/locations` (Địa điểm), `/staff` (chọn quyền thay vai trò). Vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại); chưa có thiết kế điện thoại riêng cho hai trang mới (thuộc A2/N2). Hai trang mới đã khai trong `PAGES` của `src/shared/sw-policy.ts` (service worker chỉ cache khung tĩnh, không bao giờ cache `/api`).
- Kiểm máy: `src/architecture.test.ts`, `docs/data-dictionary.json`, `scripts/audit-invariants.mjs` (xem `docs/ARCHITECTURE.md`).

## Điều kiện TRƯỚC khi triển khai
- **A2 (giao diện đơn) đã xong về mã (2026-09-20): `tsc -p web` = 0 lỗi; bằng chứng ở `docs/evidence/2026-09-20-a2/`.** Còn MỘT cổng: chủ dự án ký duyệt thị giác (mục "Ký duyệt thị giác" trong `docs/evidence/2026-09-20-a2/README.md`) — **chưa ký thì chưa triển khai**. Nhánh chứa A1 (đơn có `services[]`): triển khai chỉ N1 mà thiếu A2 thì giao diện đơn hỏng trên production, nên A1, N1 và A2 đi cùng một lần phát hành. `web/trip-sheet.ts`, `web/order-form.ts` và `web/order.ts` KHÔNG có kiểm tự động trong repo — sửa các tệp này thì PHẢI chạy lại ba kịch bản `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`.
- Chủ dự án chạy (chỉ đọc) và ghi lại kết quả: `npx wrangler d1 migrations list tourdao-sales-db --remote` (xem `0008` đã áp chưa) và `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
- Ghi điểm khôi phục D1 Time Travel trước khi áp: `npx wrangler d1 time-travel info tourdao-sales-db`.

## Triển khai — HAI lần phát hành (expand–contract)
`wrangler d1 migrations apply` áp MỌI migration chưa áp, nên migration siết `0013` KHÔNG được nằm trong `migrations/` ở lần 1.

**Lần 1 (mở rộng):**
1. Chạy BA lệnh riêng, ghi lại kết quả của từng lệnh (không nối bằng `&&`): (a) `npm test` — kỳ vọng toàn bộ đạt; (b) `npm run typecheck` — **phải là 0 lỗi lúc triển khai** (A2 đã đưa lỗi của `tsc -p web` về 0); (c) `npm run test:e2e` — kỳ vọng `E2E: 10/10 kịch bản xanh` và bước cuối `audit-invariants` xanh.
2. `npm run db:migrate:remote` (áp `0008` nếu chưa, rồi `0009…0012`), **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc (khoảng giữa chỉ tính bằng phút: tài khoản do mã cũ tạo lúc đó chưa có hồ sơ/quyền — hiện nhãn "(chưa có hồ sơ)", đơn của họ không biến mất, họ bị từ chối theo mặc định cho tới khi `0013` backfill). Trong khoảng giữa này — **và tiếp tục sau khi triển khai, cho tới khi chắc chắn không hoàn tác nữa** — KHÔNG tạo tài khoản, KHÔNG đổi tên / SĐT đăng nhập / ngưng / kích hoạt tài khoản, KHÔNG đổi quyền, KHÔNG tạo-sửa hồ sơ (lý do và hệ quả: mục "Hoàn tác" ngay dưới).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`: còn cảnh báo "chưa có hồ sơ" là đúng nếu có tài khoản khoảng giữa). Mọi dòng `✗` là vi phạm thật. Lệnh này chỉ chạy được SAU khi đã áp `0009…0012` (trước đó thiếu bảng `pty_*`/`stf_*` nên script thoát mã 2): dùng nó ở bước kiểm sau khi áp, không phải để kiểm "hiện trạng trước".
4. Thử tay: đăng nhập bằng tài khoản admin; `/staff` hiện cột Quyền; `/parties`, `/locations` mở được; tạo thử một hồ sơ.

**Lần 2 (siết) — chỉ sau khi lần 1 chạy ổn:** làm Task B5 của kế hoạch N1-B (thêm `0013_staff_party_required.sql` + test), rồi `npm run db:migrate:remote`, `node scripts/audit-invariants.mjs --db remote --strict`, và kiểm `SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'` = 2.

**Hoàn tác:** migration không có `down`, và "triển khai lại Worker cũ" CHỈ an toàn trong một cửa sổ hẹp — đọc hết ba gạch đầu dòng trước khi dùng.
- **Chưa tạo/sửa tài khoản, quyền hay hồ sơ nào dưới mã mới** → triển khai lại phiên bản Worker trước là đủ: `0009…0012` chỉ thêm nên mã cũ vẫn đọc/ghi bình thường (đã kiểm trên SQLite: mã cũ vẫn `INSERT staff` không `party_id`, vẫn `UPDATE role`/`full_name`, vẫn đếm quản trị viên theo `role`).
- **Đã có dù chỉ một thay đổi dưới mã mới** → hoàn tác CHỈ Worker sẽ sai LẶNG LẼ (không sập, nên càng khó thấy): mã mới ghi hằng `staff.role = 'sales'` và `staff.full_name = ''`, đặt tên ở hồ sơ (`pty_*`) và quyền ở `stf_permission`; mã cũ chỉ đọc `staff.role`/`staff.full_name`. Hệ quả (đã chứng minh bằng SQLite): (i) tài khoản tạo dưới mã mới — kể cả ADMIN — sau khi hoàn tác thành `sales` và TÊN TRỐNG trên mọi màn hình, kể cả cột người lập đơn; (ii) mọi lần cấp/thu hồi quyền và mọi lần đổi tên dưới mã mới biến mất; (iii) ngược lại, quản trị viên đã bị THU HỒI quyền dưới mã mới lại "sống dậy" vì `staff.role` vẫn là `'admin'`. Hoàn tác đúng trong trường hợp này = khôi phục **D1 Time Travel về điểm đã ghi trước khi áp** + triển khai lại Worker cũ; đánh đổi phải nói rõ với chủ dự án: **mất MỌI dữ liệu ghi sau điểm đó** — đơn mới, sửa đơn, thu tiền, tài khoản mới. Chủ dự án quyết, và nên quyết trước khi áp chứ không phải lúc đang sự cố.
- **Vì vậy — cửa sổ đóng băng thao tác tài khoản:** từ lúc chạy `npm run db:migrate:remote`, qua khoảng giữa tới `npx wrangler deploy`, và tiếp tục **cho tới khi chắc chắn không hoàn tác nữa**: KHÔNG tạo tài khoản, KHÔNG sửa tài khoản (tên, SĐT đăng nhập, ngưng/kích hoạt), KHÔNG đổi quyền, KHÔNG tạo/sửa hồ sơ. Mỗi thao tác như vậy loại bỏ dần phương án hoàn tác rẻ (chỉ Worker) và đẩy về phương án Time Travel (mất dữ liệu).

## Cổng bổ sung trước/sau khi áp lần phát hành 1 (rà soát độc lập, 2026-09-20)

Mục này được THÊM sau một lần rà soát độc lập; nó bổ sung chứ không thay bước nào của mục "Triển khai" ở trên.

### 1. Cổng chỉ-đọc TRƯỚC khi áp `0009…0012` lên remote — kỳ vọng 0 dòng
Chạy (chỉ đọc), ghi lại kết quả cùng điểm khôi phục Time Travel (`npx wrangler d1 time-travel info tourdao-sales-db`) TRƯỚC khi áp:

```
npx wrangler d1 execute tourdao-sales-db --remote --command "<câu dưới>"
```

```sql
SELECT id, length(trim(full_name)) AS len, instr(trim(full_name), '  ') AS double_space, date(created_at, '+7 hours') AS vn_date,
       length(given) AS given_len,
       CASE WHEN instr(head, ' ') > 0 THEN instr(head, ' ') - 1 ELSE length(head) END AS family_len,
       CASE WHEN instr(head, ' ') > 0 THEN length(trim(substr(head, instr(head, ' ') + 1))) ELSE 0 END AS middle_len
FROM (SELECT id, full_name, created_at,
             trim(substr(trim(full_name), length(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) AS head
      FROM staff)
WHERE trim(full_name) = '' OR length(trim(full_name)) > 200 OR date(created_at, '+7 hours') IS NULL
   OR instr(trim(full_name), '  ') > 0 OR instr(full_name, char(9)) > 0 OR instr(full_name, char(10)) > 0 OR instr(full_name, char(13)) > 0 OR instr(full_name, char(160)) > 0
   OR given_len > 60 OR family_len > 60 OR middle_len > 100;
```

Giải thích: mỗi dòng ra là một tài khoản mà bước backfill hồ sơ của `0012` sẽ (a) làm migration ABORT giữa chừng, hoặc (b) chạy xong nhưng tách/ghép tên sai. Truy vấn con `given`/`head` sao chép ĐÚNG cách `0012` (mục 4.2) tách tên: tên (`given`) = từ cuối; `head` = phần còn lại; họ = từ đầu của `head` (nếu `head` có dấu cách, nếu không họ = cả `head`); đệm = phần sau từ đầu của `head`. Ba cột `given_len`, `family_len`, `middle_len` in độ dài từng phần để tự nhìn.
- **(a) ABORT (vi phạm `CHECK`):** `full_name` rỗng/toàn khoảng trắng hoặc dài hơn 200 ký tự (`display_name`); họ dài hơn 60, tên đệm dài hơn 100, tên (từ cuối) dài hơn 60 ký tự (`CHECK` từng phần của `pty_person` — vd một từ 70 ký tự, hoặc họ 70 ký tự, dù tổng còn dưới 200); hoặc `created_at` không phải ISO (`date(...)` trả NULL → cột `valid_from_date` NOT NULL bị vi phạm).
- **(b) SAI LẶNG LẼ:** khoảng trắng đôi, TAB, xuống dòng, NBSP bên trong `full_name`. Backfill bằng SQL chỉ tách theo dấu cách ASCII đơn. Chỉ khoảng trắng ĐÔI làm R-N1-3 của `audit-invariants` đỏ (`display_name` giữ nguyên còn ba phần đã gộp khoảng trắng). Với TAB / xuống dòng / NBSP, `display_name` vẫn khớp tên ghép nên R-N1-3 VẪN XANH, nhưng họ/đệm/tên bị tách sai lặng lẽ (vd `"Nguyễn<TAB>Văn An"` → họ `"Nguyễn<TAB>Văn"`, đệm NULL, tên `"An"`) và không công cụ nào bắt được sau khi áp — vì vậy cổng TRƯỚC KHI ÁP là cơ hội duy nhất.

Cách xử lý dòng ra: sửa `staff.full_name` cho sạch TRƯỚC khi áp (chủ dự án quyết; đây là một `UPDATE` trên remote), hoặc — chỉ với nhóm (b) — chấp nhận và sửa tay hồ sơ ở trang Hồ sơ. Nhóm (a) không thể "chấp nhận": không sửa trước thì migration dừng giữa chừng (khi đó kiểm `npx wrangler d1 migrations list tourdao-sales-db --remote` và dữ liệu trước khi thử lại; khôi phục bằng điểm Time Travel đã ghi nếu cần).

### 2. Số câu trong một `db.batch()` — kiểm TRƯỚC lần nạp nhân viên đầu tiên qua Sheet
- Tạo một tài khoản = **6 câu** trong một batch: hồ sơ (`pty_party`), cá nhân (`pty_person`), vai trò STAFF (`pty_party_role`), tài khoản (`staff`), quyền (`stf_permission`), nhật ký (`audit_log`) — với một quyền (SALES); mỗi quyền thêm là thêm một câu.
- `POST /api/staff/sheet/apply` gộp TẤT CẢ ứng viên vào MỘT `db.batch()`: **6N + 1 câu** (N tài khoản + một dòng nhật ký `staff_synced`); 9 nhân viên ≈ 55 câu. Cùng request còn thêm khoảng N câu tra SĐT trùng và các truy vấn xác thực nằm NGOÀI batch.
- Đối chiếu con số 6N + 1 này với giới hạn HIỆN HÀNH của D1 và của gói Workers đang dùng (số truy vấn D1 mỗi lần gọi Worker; kích thước/số tham số của một câu và một batch) trên trang giới hạn D1 của Cloudflare TRƯỚC lần nạp đầu tiên — các con số đổi theo gói và theo thời gian, và tài liệu này không chép lại con số nào để tránh tin nhầm. Nếu vượt: nạp từng phần (API nhận danh sách `phones`, chọn một phần ứng viên mỗi lần) hoặc dùng `scripts/import-staff.mjs`.

### 3. Sau khi áp lần 1 trên remote — kiểm nhanh bằng một lượt gọi API thật
Các câu SQL của module `parties` dùng tham số đánh số `?NNN` và mới chỉ được kiểm trên D1 cục bộ; cần một lượt gọi thật trên remote:
1. Đăng nhập bằng tài khoản ADMIN.
2. `GET /api/locations` (8 địa điểm).
3. `POST /api/parties` (tạo một hồ sơ thử, kèm một liên hệ), rồi `GET /api/parties` và `GET /api/parties/:id`.
4. Đóng liên hệ thử vừa tạo: `POST /api/parties/:id/contacts/:cid/end`.
5. `node scripts/audit-invariants.mjs --db remote` (không `--strict` ở lần 1). Nếu `PRAGMA foreign_key_check` lỗi trên remote thì script thoát mã 2: chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`, tạm bỏ dòng kiểm `R-N1-10` khỏi mảng `CHECKS` (chỉ sửa cục bộ, không commit) rồi chạy lại các kiểm còn lại — như mục "Việc còn treo / nợ" bên dưới đã nêu. Nếu remote từ chối cả lệnh NHIỀU CÂU trong một `--command` (thiết kế "một lần gọi wrangler cho mọi kiểm" hỏng theo cả hai cách), chạy từng câu bất biến một bằng `npx wrangler d1 execute tourdao-sales-db --remote --command "<một câu>"` và đọc kết quả bằng mắt (mỗi câu kỳ vọng 0 dòng / đếm 0).

### 4. Ba quyết định cần chủ dự án
Ghi ngắn, kèm chi phí; chưa sửa gì (không sửa ADR/đặc tả đã duyệt trong bước này).

**(a) Liên hệ chính có thể chồng lấn — và có ĐƯỜNG THẬT qua API hôm nay. CHỐT TRƯỚC KHI ÁP `0011` lên remote.**
`pty_contact_point` chỉ có chỉ mục duy nhất một phần `pty_contact_primary_uq` (`WHERE is_primary = 1 AND valid_to_date IS NULL`: tối đa một liên hệ chính ĐANG MỞ mỗi hồ sơ mỗi loại) — đặc tả đã duyệt chỉ đòi tối đa một liên hệ chính ĐANG MỞ mỗi loại; đặc tả im lặng về ngày kết thúc tương lai. Nhưng ADR-0003 điều 7 nói chống chồng lấn khoảng đã đóng bắt buộc dùng trigger (đã làm cho `pty_party_role`, `pty_party_relationship`), còn liên hệ thì chưa — và đây không phải chuyện giả định: `POST /api/parties/:id/contacts/:cid/end` với `{"validTo":"2099-12-31"}` (mọi ngày tương lai ≥ `valid_from_date` đều được: `validateEndDate` chỉ kiểm định dạng, câu `END_CONTACT` chỉ kiểm `validTo >= valid_from_date`) đóng liên hệ chính bằng một ngày TƯƠNG LAI → dòng rời khỏi chỉ mục một phần NGAY → thêm liên hệ chính mới → hai liên hệ chính cùng hiệu lực hôm nay. Hiển thị không sai (mọi chỗ đọc chỉ lấy dòng `valid_to_date IS NULL`), nhưng lịch sử vi phạm ADR-0003 điều 7 và không kiểm nào bắt.
Lưu ý khi chọn: từ đợt sửa sau rà soát toàn nhánh, khi hồ sơ không còn liên hệ chính ĐANG MỞ (kể cả vì liên hệ chính đã đóng bằng ngày TƯƠNG LAI — dòng đó có `valid_to_date` khác NULL nên bị coi là không còn chính), thêm một liên hệ mới cùng loại sẽ TỰ ĐỘNG thành liên hệ chính (mã ghi đè cả `isPrimary: false`). Vì vậy kịch bản chồng lấn ở trên nay xảy ra chỉ với hai thao tác (đóng bằng ngày tương lai rồi thêm số mới), không cần client yêu cầu `isPrimary: true`.

Ba phương án, chủ dự án chọn một (chưa chọn thay):
- **(i) Chặn ở mã:** từ chối `validTo > hôm nay (giờ Việt Nam)` ở route đóng liên hệ. Chi phí thấp nhất, làm ngay được, không đụng DDL và không cần duyệt lại gì; đổi hành vi nhỏ (không còn hẹn trước ngày kết thúc trong tương lai cho liên hệ).
- **(ii) Trigger, đúng ADR-0003 điều 7 nhất:** thêm 2 trigger `pty_contact_primary_no_overlap_{ins,upd}` vào DDL tham chiếu (`docs/superpowers/specs/2026-09-20-n1-schema-reference.sql`) và TÁI SINH `0011`. Rẻ nếu làm TRƯỚC khi áp `0011` lên remote (sau khi áp thì phải thêm một migration mới); cần chủ dự án duyệt lại DDL đã duyệt.
- **(iii) Chấp nhận, chỉ giám sát:** thêm một kiểm "hai liên hệ chính chồng lấn" vào `scripts/audit-invariants.mjs`. Không đổi schema, không đổi hành vi; chỉ phát hiện SAU khi đã xảy ra chứ không chặn.

**(b) Nhật ký `staff_updated` đang ghi SĐT.** `src/modules/accounts/index.ts` (route `PATCH /api/staff/:id`) ghi `SĐT ${t.phone} → ${patch.phone}` vào nhật ký, trái ràng buộc "nhật ký không ghi SĐT, email, MST". Lỗi có từ trước N1. Sửa (chỉ ghi "đổi SĐT đăng nhập", không ghi số; một dòng mã, không test nào đang kiểm chuỗi này) hay giữ (nhật ký chỉ admin xem, SĐT đăng nhập của nhân viên nội bộ)? Nếu giữ, cần ghi rõ ngoại lệ trong đặc tả.

**(c) ADR-0005 mục Quyết định 2 lệch DDL đã duyệt — ghi errata.** ADR viết `stf_permission(staff_id, permission_type_code, created_at, created_by)`, khoá duy nhất `(staff_id, permission_type_code)`; DDL đã duyệt và `0012` thực tế có `id`, `valid_from_at`/`valid_to_at`, đủ bốn cột kiểm toán và chỉ mục duy nhất MỘT PHẦN `stf_permission_open_uq … WHERE valid_to_at IS NULL` (đóng/mở lại quyền giữ lịch sử, đúng "không xoá cứng" của ADR-0003 điều 8). Mã theo DDL; chỉ cần chủ dự án đồng ý ghi errata vào ADR-0005 (chi phí: chỉ tài liệu).

## Việc còn treo / nợ
- `staff.role` (ghi hằng `'sales'`) và `staff.full_name` (ghi `''`) là cột chết có chủ đích; gỡ khi lần đầu phải dựng lại `staff` (ADR-0003 điều 10). `docs/data-dictionary.json` ghi `deprecatedColumns`.
- Module `accounts`, `audit`, `auth`, `catalog`, `orders` còn ở `LEGACY` của `src/architecture.test.ts` (SQL chưa đăng ký); `wonGuard` của `orders` đọc `audit_log` (ngoại lệ tới N2).
- Sắp xếp danh sách nhân sự/hồ sơ theo `sort_key` dùng `COLLATE NOCASE` — chữ có dấu chưa theo chuẩn tiếng Việt (danh sách chỉ vài chục dòng; nếu cần sắp lại ở mã bằng `Intl.Collator('vi')`).
- `PRAGMA foreign_key_check` trong `audit-invariants` chưa kiểm được trên D1 remote từ máy này; nếu lệnh lỗi trên remote thì chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`.
- Tiếp theo: N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
