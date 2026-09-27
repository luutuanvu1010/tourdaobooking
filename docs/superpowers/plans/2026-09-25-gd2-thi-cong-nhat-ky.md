# Nhật ký thi công GĐ2 — Phần B (ADR-0019): cổng khai bằng danh sách, route hỏi bảng quyền

- **Kế hoạch:** `docs/superpowers/plans/2026-09-25-gd2-thi-cong.md` (chỉ **Phần B**; A0 và Phần A bỏ — xem R1; Phần C chưa làm).
- **Nhánh:** `gd2-cong-va-bang`, worktree `bang-tin`, base `main` 86b2a60 (bản 1.17). Chưa push, chưa gộp, chưa lên production.
- **Cách thi công:** subagent-driven-development — mỗi task một subagent thi công (sonnet hoặc opus), người điều phối đọc diff lõi; **chưa có người kiểm độc lập nào chạy** (B9 còn treo, xem "Chưa kiểm").
- **Nguồn của nhật ký này:** sổ điều phối `.superpowers/sdd/2026-09-25-gd2-thi-cong/progress.md` và báo cáo `task-B*-report.md` cùng thư mục (ngoài git, có thể mất); người viết không tự thi công task nào.

## 1. Mục tiêu, phạm vi, mốc

- **Mục tiêu (ADR-0019 phần B):** cổng `office`/`orders`/`admin` của router không còn suy ra từ ô `order.view`; khai bằng ba danh sách mã quyền viết thẳng (`ADMIN_GATE`, `OFFICE_GATE`, `ORDERS_GATE` ở `src/shared/permissions.ts`); mọi route sau các cổng đó — đọc lẫn ghi — hỏi bảng quyền `can()` trong thân handler; hai hàng rào mới canh việc quên.
- **Ngoài phạm vi:** Phần A (giao diện, không thuộc ADR-0019), A0 (route `GET /api/catalog/for-order`), Phần C (FIELD vào cổng `orders`), Phần D.
- **Mốc ban đầu (trước khi sửa gì):** `npm test` 909/909; `npm run typecheck` 0 lỗi. `tests/audit/*.test.mjs` 35/36 (ca `P4 FINDING HDV` đỏ sẵn, xem §5).
- **Mốc cuối (a44df0a):** `npm test` 937/937 (chạy lại khi viết nhật ký này); `typecheck` 0 lỗi theo báo cáo B7b (không chạy lại ở phiên viết nhật ký).

## 2. Bảng từng task

Cột "Đột biến": sửa cố ý → đỏ → hoàn nguyên (P16), làm sau commit trên cây sạch. Lệnh hoàn nguyên nêu ở báo cáo từng task.

| Task | Việc | Commit | Test sau | Dòng ĐỎ trước đã thấy | Đột biến "thấy chặn thật" |
|---|---|---|---|---|---|
| B1 | Ba danh sách cổng + `passesAdminGate`/`isOffice`/`canAccessOrders`/`seesAllOrders`; bỏ dòng `dispatch.request`; gỡ mục hoãn tương ứng | `1d72d9f` | 913 | `src/shared/cong-quyen.test.ts`: `does not provide an export named 'ADMIN_GATE'` | Thêm `FIELD` vào `OFFICE_GATE` → 3/4 ca `cong-quyen.test.ts` đỏ (khoá giá trị, đối chiếu bảng, tương đương 128 tổ hợp) |
| B2 | Router, `start-page`, `web/shell.ts` đọc danh sách cổng (giữ hành vi) | `5d51855` | 914 | Không có (tái cấu trúc; không dựng đỏ giả). Bằng chứng giữ hành vi: bài tương đương 128 tổ hợp của B1 + Chrome `trang-chu-smoke` "TRANG CHU SMOKE OK" | Dùng chung đột biến B1 |
| B3 | 11 route `/api/staff*` hỏi `admin.manage`; ba route cấp quyền/vai hỏi `admin.manage.superadmin`; `roles.ts` nhận `actorIsSuper` | `a77c8ee` | 919 | `roles.test.ts` 9 fail (đổi chữ ký); hàng rào 1 "HOÃN THỪA" `admin.manage`, `admin.manage.superadmin`; hàng rào 2 "HOÃN THỪA" `POST /api/staff`, `POST /api/staff/sheet/apply` | Đổi ba `can(admin,"admin.manage.superadmin")` thành `true` → e2e `roles.mjs:52` `200 !== 403`; chỉ route `PUT …/permissions` → `roles.mjs:71` đỏ |
| B6 | Vai và quan hệ của hồ sơ gắn tài khoản theo luật cấp bậc (Q11, chủ quyết 25/9): 4 route `roles`/`relationships` | `89bddd7` | 924 | `ho-so-co-tai-khoan.test.ts` ca Q11 (a)–(d): `expected 403 actual 201/200`; (e) đối chứng dương xanh ngay | Bỏ điều kiện `acc.manageable` ở route thêm vai → ca (a) đỏ; ở route thêm quan hệ (đầu kia) → ca (c) đỏ |
| B4 | Trang chủ, danh sách/chi tiết đơn, `handlers`, `assignees`, `mine`, `GET /api/catalog` hỏi `order.view`/`money.view`/`contact.view`; ba route chuyển cổng `office` → `orders` | `33ad5e4` | 933 | `xem-don-theo-quyen.test.ts`: lần 1 ca 7, 8 (`200 !== 403`, hai lần siết); lần 2 (mới đổi cổng, chưa `can()`): Đối tác đọc được số toàn công ty (ca 1–3 đỏ); lần 3 hàng rào 1 "HOÃN THỪA" `money.view`, `contact.view` | (A) `money.view` cột PARTNER `own` → `none`: 7 đỏ. (B) `contact.view` PARTNER `ownOrAssigned` → `none`: 4 đỏ |
| B5 | `admin.manage` cho danh mục (5 route), địa điểm (2), nhật ký hệ thống; `feedback.triage` cho Góp ý (2); ô mới `settings.ops` (chỉ SUPER_ADMIN) cho `PUT`/`GET /api/maintenance` | `da5172f` | 933 | `e2e/maintenance.mjs:77`: `Quản trị không Toàn quyền dù SĐT trong danh sách → 403 … 200 !== 403` | 4 đột biến: `feedback.triage` của ADMIN = none → `feedback.mjs:54` `403 !== 200`; PATCH đổi sang `settings.ops` → `feedback.mjs:77`; bỏ `can(settings.ops)` ở PUT → `maintenance.mjs:77`; `admin.manage` của ADMIN = none → `locations.mjs:26`, `catalog.mjs:43` |
| B7 | Hàng rào 2 luật (1b): route đọc sau cổng `office`/`orders`/`admin` phải hỏi bảng quyền, không có mục hoãn | `c9f5276` | 934 | Trên bản sao 86b2a60: 11 route đọc bị nêu tên | Bỏ dòng `can(…)` ở `GET /api/orders/dashboard` → hàng rào 2 ca 5 đỏ (+ harness 7/8); hoàn nguyên → 6/6 |
| B7b | Hàng rào 2 luật (4): route cổng `admin` phải hỏi ô quản trị bằng chữ viết thẳng (hàm thuần `hasAdminDenial`, 17 ca tự kiểm) | `6d8f2f4` | 937 | Trên bản sao 86b2a60: đủ 27 route cổng admin bị nêu tên (6 chỉ có `mayManage`, `PUT /api/maintenance` chỉ kiểm SĐT, 20 không hỏi gì) | Xoá `if (!can(admin,"admin.manage"))` ở `PATCH /api/staff/:id`: chỉ hàng rào luật (4) đỏ; hàng rào 1 (3/3) và hàng rào 2 (6/6) **vẫn xanh** |
| B8 | Thí nghiệm B-11 + ca e2e Trang chủ 403; dòng sổ hàng rào; tài liệu mô tả | `3c110a5`, `e5e9c84`, `da7d05b` | 937 | — (tài liệu/e2e) | Thí nghiệm B-11 (§4) |
| Nhật ký đổi | Mục 1.18 vào `src/shared/changelog.ts` (bước A.0), sửa `app-info.test.ts` | `a44df0a` | 937 | — | — |

Ghi chú: số test 933 → 934 (B7, +1 ca) → 937 (B7b, +3 ca). Chi tiết dòng ĐỎ/đột biến nguyên văn nằm ở báo cáo từng task (ngoài git); các dòng đột biến đã chép vào `docs/SO-HANG-RAO.md` (`e5e9c84`).

## 3. Phán quyết của điều phối (R1–R9, nguyên ý)

| # | Phán quyết | Nếu sai thì tốn gì |
|---|---|---|
| R1 | Phạm vi = **Phần B**. Bỏ A0 (bị ADR-0028/bản 1.15 thay: `GET /api/catalog` đã ở cổng `orders`; nhánh `a0-danh-muc-cho-lap-don` chưa gộp, chỉ trùng `src/modules/catalog/index.ts`, KHÔNG dùng) và Phần A (Q8, giao diện, không thuộc ADR-0019) | Thêm A ở lần phát hành riêng |
| R2 | Số dòng trong kế hoạch lấy từ mã `10081e9` — đã cũ (1.14–1.17, Bảng tin, ADR-0027). Tìm route bằng `grep 'route("'`, không tin số dòng | Không tốn: chỉ là cách tìm |
| R3 | **Danh mục (B4):** kế hoạch ghi `can(staff,"money.view")` không ngữ cảnh — sẽ 403 cho Đối tác/Thực tập (`money.view = own`) và phá ADR-0028. Dùng `can(staff, "money.view", { ownerId: staff.id })` (trung tính hành vi với mọi mã trong `ORDERS_GATE`; bài kiểm khoá điều này). Không có `/api/catalog/for-order` trên `main` | Đổi một dòng |
| R4 | B5 phần **bảo trì** cần kết quả truy vấn P2 của chủ (Task 0 bước 3). Vẫn làm mã trên nhánh (đảo được, chưa lên production); **không phát hành R1 khi chưa có kết quả P2** | Nếu phát hành mà chủ chưa giữ Toàn quyền: chủ mất nút bảo trì (tắt bằng SQL ở `docs/HANDOFF-N1.md`) |
| R5 | Phiên bản phát hành = **1.18** (main đang 1.17); kiểm lại `origin/main` lúc phát hành | Đổi số ở `changelog.ts` + `app-info.test.ts` |
| R6 | Dòng đồng tác giả commit theo môi trường (Sonnet 5), không theo kế hoạch (Opus 5.5) | Không tốn (chỉ nhãn commit) |
| R7 | `tests/audit/*.test.mjs` KHÔNG nằm trong `npm test`: mọi người thi công/kiểm phải tự chạy `node --test "tests/audit/*.test.mjs"` | Lỗ ở bài đỏ đo sau này không ai thấy |
| R8 | B7, B7b làm CUỐI (đỏ tới khi mọi route có kiểm quyền). Người kiểm độc lập B9 chạy model mạnh nhất | Hàng rào đỏ sớm, gây nhiễu từng task |
| R9 | Tập lệnh `task-brief` chỉ nhận số; brief tự cắt bằng `sed -n` từ kế hoạch vào `briefs/` | Chỉ mất công cắt tay |

## 4. Bài kiểm đảo có chủ đích (B-11)

Bằng chứng: `docs/evidence/2026-09-24-lo-hong-ho-so/ghi-chu-2026-09-26-phan-b-adr-0019.md` (commit `3c110a5`). Trên **bản sao** cây (`git archive`, không đụng worktree), đổi đúng một ô `order.view` của FIELD từ `none` thành `any` (điều ADR-0017 sẽ cần ở Phần C) rồi chạy `kich-ban/lo-hong.mjs` không sửa: hướng dẫn viên vẫn nhận 403 ở **cổng** `office` cho mọi `/api/parties*` (lời báo của cổng, không phải của thân handler). Khác lần đo sau GĐ1 (24/9): khi đó FIELD qua cổng và dừng ở `can(party.*)` trong thân; nay cổng không suy từ `order.view` nữa. Giới hạn: chỉ SQLite trong bộ nhớ, không e2e D1, và FIELD chưa vào cổng `orders` thật (Phần C).

## 5. Nợ và ghi chú cho người sau

- **⚠ Xung đột ADR-0019 điều 3 ↔ ADR-0028 (chỉ nổ ở Phần C):** khi FIELD vào cổng `orders` (ADR-0017), hướng dẫn viên đọc được `GET /api/catalog` (giá) — điều ADR-0019 điều 3 cấm; ADR-0028 lại đã đổi cổng đó sang `orders`. **Phần C KHÔNG được bắt đầu khi chủ chưa quyết** (cách A0: nhánh chưa gộp `a0-danh-muc-cho-lap-don` có route `/api/catalog/for-order`, hoặc sửa ADR-0028). Bài B-2 của `xem-don-theo-quyen.test.ts` sẽ đỏ trước để nhắc (FIELD `money.view` phải là `any` theo ADR-0017 nếu không danh sách 403).
- **Ca `P4 FINDING HDV`** (`tests/audit/doi-tac.test.mjs:85`, `200 !== 400` khi gán hướng dẫn viên làm người phụ trách) **đã đỏ sẵn từ trước** trên 86b2a60 (điều phối đo lại trên `git archive 86b2a60`), không do nhánh này; thuộc phần D. `tests/audit` = 35/36 sau mọi task.
- **Nút bảo trì chỉ Toàn quyền (siết có chủ ý, `settings.ops`):** phải có kết quả truy vấn P2 của chủ trước khi phát hành R1 (R4). Ngoài ra `web/account.ts` `initMaintenance()` chỉ chạy khi có quyền `ADMIN` ⇒ tài khoản chủ phải giữ **cả ADMIN và SUPER_ADMIN**, nếu chỉ SUPER_ADMIN thì mục bảo trì không hiện dù `canToggle=true` (hành vi có từ trước, chưa đổi).
- **e2e phải đổi vai:** `tests/e2e/maintenance.mjs` và `tests/e2e/bangtin.mjs` ca 10 chuyển vai "chủ" từ ADMIN sang tài khoản Toàn quyền test (`ACCOUNTS.superAdmin`) — bắt buộc, không thì 403.
- **Chỉ-FIELD ở Trang chủ:** banner lỗi đổi chữ, từ lời báo cổng văn phòng ("Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.") sang lời cổng màn đơn ("Tài khoản này không dùng được màn hình đơn."). `trang-chu-smoke.mjs` bước C chỉ khẳng định có chữ nên vẫn xanh — **B9 xác nhận bằng Chrome** (B-12). Hết hiện tượng ở Phần C khi FIELD vào cổng `orders`.
- **Hai lần siết hành vi (ADR-0019 điều 2), giao diện không gọi hai route này:** Kế toán `GET /api/dispatch/assignees` → 403; Thực tập `GET /api/dispatch/mine` → 403.
- **Lỗ đã biết của luật (4):** canh QUÊN, không canh CỐ Ý (không biết ô có đúng route không, không biết biến có phải người gọi không, không canh thứ tự "trước đọc thân/ghi"); ghi ở `docs/SO-HANG-RAO.md` (`e5e9c84`). Luật cấp bậc trên tài khoản mục tiêu do test hành vi/e2e canh.
- **Tài liệu:** `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` đã sửa (`da7d05b`: cổng khai bằng danh sách, route hỏi bảng quyền). Không đổi schema ⇒ không đụng `docs/data-dictionary.json`.
- **Sự cố xử lý (subagent B8):** từng bị ngắt do máy ngủ/treo. Cách xử lý: kiểm cây sạch trước khi làm lại, rồi chia nhỏ việc (thí nghiệm B-11 + e2e; sổ hàng rào; tài liệu mô tả); kết quả B8 là ba commit.

## 6. Chưa kiểm (lúc viết nhật ký này)

- **Người kiểm độc lập B9 chưa chạy** — theo CLAUDE.md §3 đây là việc lớn (quyền), chưa được coi là "đạt" cho tới khi có báo cáo đó (N8).
- **Chrome/iPhone:** chỉ có kịch bản `trang-chu-smoke.mjs` (chạy sau B2, xanh); chưa chạy lại sau B4–B6, chưa chạy `v1-nguoi-phu-trach.mjs`, chưa thử iPhone thật.
- **Production:** chưa deploy, chưa áp gì lên remote; chưa chạy `audit-invariants --db remote`. Phát hành bản 1.18 theo `docs/QUY-TRINH-PHAT-HANH.md` sau khi B9 đạt, chủ có kết quả P2 và chủ quyết gộp.
- e2e đủ bộ chỉ chạy ở B5 (21/21, có mạng) và B3/B6/B4; chưa chạy một lần cuối trên `a44df0a`.
