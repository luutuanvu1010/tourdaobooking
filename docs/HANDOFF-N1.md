# HANDOFF — N1 (nền danh tính: hồ sơ, địa điểm, quyền app)

Đặc tả: `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20). ADR: `docs/adr/ADR-0001…0008`. Kế hoạch: `docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md` và `…-n1-b-chuyen-quyen.md`.

## Đã có sau N1 (lần phát hành 1)
- Migration `0009…0012` (chỉ thêm — mã cũ vẫn chạy): `v_ord_order_label`, `loc_*` (8 địa điểm), `pty_*` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ), `stf_*` + `staff.party_id` + backfill hồ sơ/quyền cho tài khoản có sẵn.
- API: `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`; `POST /api/staff` nhận `permissions[]` (thay `role`).
- Quyền theo bản đồ ADR-0007 ở `src/shared/permissions.ts`; router có `access: "office"`. Tài khoản chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ (màn hình "việc của tôi" của họ thuộc N2 — hiện họ đăng nhập được nhưng không có mục nào).
- Trang web: `/parties` (Hồ sơ), `/locations` (Địa điểm), `/staff` (chọn quyền thay vai trò). Vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại); chưa có thiết kế điện thoại riêng cho hai trang mới (thuộc A2/N2). Hai trang mới đã khai trong `PAGES` của `src/shared/sw-policy.ts` (service worker chỉ cache khung tĩnh, không bao giờ cache `/api`).
- Kiểm máy: `src/architecture.test.ts`, `docs/data-dictionary.json`, `scripts/audit-invariants.mjs` (xem `docs/ARCHITECTURE.md`).

## Điều kiện TRƯỚC khi triển khai
- **Không triển khai khi A2 chưa xong.** Nhánh chứa A1 (đơn có `services[]`) — `tsc -p web` còn đúng 4 lỗi ở `web/order-form.ts`, `web/order.ts`; giao diện đơn sẽ hỏng trên production nếu chỉ triển khai N1.
- Chủ dự án chạy (chỉ đọc) và ghi lại kết quả: `npx wrangler d1 migrations list tourdao-sales-db --remote` (xem `0008` đã áp chưa) và `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
- Ghi điểm khôi phục D1 Time Travel trước khi áp: `npx wrangler d1 time-travel info tourdao-sales-db`.

## Triển khai — HAI lần phát hành (expand–contract)
`wrangler d1 migrations apply` áp MỌI migration chưa áp, nên migration siết `0013` KHÔNG được nằm trong `migrations/` ở lần 1.

**Lần 1 (mở rộng):**
1. Chạy BA lệnh riêng, ghi lại kết quả của từng lệnh (đừng nối bằng `&&`: `npm run typecheck` thoát khác 0 khi còn 4 lỗi A2 nên sẽ cắt chuỗi và `test:e2e` không được chạy): (a) `npm test` — kỳ vọng toàn bộ đạt; (b) `npm run typecheck` — kỳ vọng ĐÚNG 4 lỗi A2 (`web/order-form.ts` hai lỗi, `web/order.ts` hai lỗi) cho tới khi A2 xong, sau đó sạch (xem điều kiện trên); (c) `npm run test:e2e` — kỳ vọng `E2E: 10/10 kịch bản xanh` và bước cuối `audit-invariants` xanh.
2. `npm run db:migrate:remote` (áp `0008` nếu chưa, rồi `0009…0012`), **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc (khoảng giữa chỉ tính bằng phút: tài khoản do mã cũ tạo lúc đó chưa có hồ sơ/quyền — hiện nhãn "(chưa có hồ sơ)", đơn của họ không biến mất, họ bị từ chối theo mặc định cho tới khi `0013` backfill).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`: còn cảnh báo "chưa có hồ sơ" là đúng nếu có tài khoản khoảng giữa). Mọi dòng `✗` là vi phạm thật. Lệnh này chỉ chạy được SAU khi đã áp `0009…0012` (trước đó thiếu bảng `pty_*`/`stf_*` nên script thoát mã 2): dùng nó ở bước kiểm sau khi áp, không phải để kiểm "hiện trạng trước".
4. Thử tay: đăng nhập bằng tài khoản admin; `/staff` hiện cột Quyền; `/parties`, `/locations` mở được; tạo thử một hồ sơ.

**Lần 2 (siết) — chỉ sau khi lần 1 chạy ổn:** làm Task B5 của kế hoạch N1-B (thêm `0013_staff_party_required.sql` + test), rồi `npm run db:migrate:remote`, `node scripts/audit-invariants.mjs --db remote --strict`, và kiểm `SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'` = 2.

**Hoàn tác:** mã — triển khai lại phiên bản Worker trước (migration lần 1 chỉ thêm nên mã cũ vẫn chạy). Dữ liệu — D1 Time Travel về điểm đã ghi (quyết định của chủ dự án; mất mọi thay đổi sau điểm đó). Migration không có `down`.

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

**(a) Liên hệ chính ĐÃ ĐÓNG có thể chồng lấn.** `pty_contact_point` chỉ có chỉ mục duy nhất một phần `pty_contact_primary_uq` (tối đa một liên hệ chính ĐANG MỞ mỗi hồ sơ mỗi loại) — đúng như đặc tả đòi. Nhưng ADR-0003 điều 7 nói chống chồng lấn khoảng đã đóng bắt buộc dùng trigger (đã làm cho `pty_party_role`, `pty_party_relationship`), còn liên hệ thì chưa. Hai hướng: (i) thêm 2 trigger `pty_contact_primary_no_overlap_{ins,upd}` vào DDL tham chiếu (`docs/superpowers/specs/2026-09-20-n1-schema-reference.sql`) và tái sinh `0011` — rẻ vì `0011` chưa áp remote (sau khi áp thì phải thêm một migration mới); (ii) thêm một kiểm chồng lấn liên hệ chính vào `audit-invariants` — không đổi schema, nhưng chỉ phát hiện sau khi đã xảy ra chứ không chặn. Phải quyết TRƯỚC khi áp `0011`.

**(b) Nhật ký `staff_updated` đang ghi SĐT.** `src/modules/accounts/index.ts` (route `PATCH /api/staff/:id`) ghi `SĐT ${t.phone} → ${patch.phone}` vào nhật ký, trái ràng buộc "nhật ký không ghi SĐT, email, MST". Lỗi có từ trước N1. Sửa (chỉ ghi "đổi SĐT đăng nhập", không ghi số; một dòng mã, không test nào đang kiểm chuỗi này) hay giữ (nhật ký chỉ admin xem, SĐT đăng nhập của nhân viên nội bộ)? Nếu giữ, cần ghi rõ ngoại lệ trong đặc tả.

**(c) ADR-0005 mục Quyết định 2 lệch DDL đã duyệt — ghi errata.** ADR viết `stf_permission(staff_id, permission_type_code, created_at, created_by)`, khoá duy nhất `(staff_id, permission_type_code)`; DDL đã duyệt và `0012` thực tế có `id`, `valid_from_at`/`valid_to_at`, đủ bốn cột kiểm toán và chỉ mục duy nhất MỘT PHẦN `stf_permission_open_uq … WHERE valid_to_at IS NULL` (đóng/mở lại quyền giữ lịch sử, đúng "không xoá cứng" của ADR-0003 điều 8). Mã theo DDL; chỉ cần chủ dự án đồng ý ghi errata vào ADR-0005 (chi phí: chỉ tài liệu).

## Việc còn treo / nợ
- `staff.role` (ghi hằng `'sales'`) và `staff.full_name` (ghi `''`) là cột chết có chủ đích; gỡ khi lần đầu phải dựng lại `staff` (ADR-0003 điều 10). `docs/data-dictionary.json` ghi `deprecatedColumns`.
- Module `accounts`, `audit`, `auth`, `catalog`, `orders` còn ở `LEGACY` của `src/architecture.test.ts` (SQL chưa đăng ký); `wonGuard` của `orders` đọc `audit_log` (ngoại lệ tới N2).
- Sắp xếp danh sách nhân sự/hồ sơ theo `sort_key` dùng `COLLATE NOCASE` — chữ có dấu chưa theo chuẩn tiếng Việt (danh sách chỉ vài chục dòng; nếu cần sắp lại ở mã bằng `Intl.Collator('vi')`).
- `PRAGMA foreign_key_check` trong `audit-invariants` chưa kiểm được trên D1 remote từ máy này; nếu lệnh lỗi trên remote thì chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`.
- Tiếp theo: N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
