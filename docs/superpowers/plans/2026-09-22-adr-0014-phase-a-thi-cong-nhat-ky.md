# ADR-0014 Phase A — nhật ký thi công

Viết 2026-09-22 khi khép Phase A (nền tảng quyền: D-01, D-02, điều 8). Kế hoạch: `docs/superpowers/plans/2026-09-22-adr-0014-phase-a-nen-tang-quyen.md`. Cùng phiên soạn ADR-0014 và lập kế hoạch, sau đó thi công luôn (không phải hai phiên khác vai như CLAUDE.md §3 khuyến nghị cho việc lớn — **cần kiểm độc lập bù lại**, chưa làm ở phiên này).

## 1. Trạng thái tại HEAD (nhánh `kiem-toan-doi-tac`)

| Hạng mục | Kết quả |
|---|---|
| Migration mới | `0020_partner_super_admin_permission_types.sql` (data-only: 2 dòng `stf_permission_type`) |
| `npm test` | 451/451 |
| `npm run typecheck` | 0 lỗi |
| `npm run test:e2e` | 16/16 kịch bản, kèm `audit-invariants --strict` xanh |
| `npx wrangler d1 migrations apply --local` | áp sạch (đã thử) |
| Kiểm độc lập | **CHƯA** — việc lớn theo CLAUDE.md §3, không tự báo "đạt" |
| Đã merge `main` / đã push | **CHƯA** |

## 2. Việc đã làm, đúng 9 task của kế hoạch (1 commit/task, TDD đỏ→xanh)

1. Migration `0020` + `src/migrations-0020.test.ts`.
2. `permissions.ts`: `PERMISSION_CODES` 4→6 (`PARTNER`, `SUPER_ADMIN`); `MATRIX` 21→25 thao tác (thêm `order.cancel`, `dispatch.guides.view`, `dispatch.request`, `admin.manage.superadmin`); `canAccessOrders()`. `permissions.test.ts` viết lại bảng đối chiếu tay theo đúng ADR-0014 điều 2.
3. Router: access mới `"orders"` (văn phòng HOẶC PARTNER).
4–6. D-01: `listOrders` nhận `ownerId`; `GET /api/orders` lọc theo phạm vi; `GET /api/orders/:id` thêm kiểm `order.view`; xác nhận `/api/parties*` đã tự chặn PARTNER (không cần sửa mã, chỉ thêm test).
7. D-02: `POST /api/staff` — trường `permissions` **vắng mặt** → `[]` (khác gửi `[]` tường minh, vẫn bị từ chối như cũ).
8–9. Điều 8: `canManageAccount` (luật thuần) + `mayManage` (bọc thêm "tự sửa mình luôn qua được, không bị luật cấp bậc che mất luật tự-sửa-mình cũ") gắn vào bốn route quản lý một tài khoản; `admin.manage.superadmin` gắn vào `PUT .../permissions` (đổi thành/khỏi SUPER_ADMIN cần chính SUPER_ADMIN); router "admin" mở thêm cho tài khoản chỉ giữ SUPER_ADMIN.
10. Runbook: câu SQL gán Super Admin đầu tiên (SĐT không gieo trong migration), ghi vào `docs/HANDOFF-N1.md` mục "CHỜ TRIỂN KHAI".

## 3. Chỗ MÃ THẬT khác KẾ HOẠCH (phát sinh lúc thi công, không sửa lại tệp kế hoạch)

Đây là phần đáng đọc nhất của nhật ký: kế hoạch không lường hết được **hệ quả dây chuyền** của điều 8 lên dữ liệu/kịch bản e2e đã có từ trước.

- **`router.ts` access `"admin"`** phải mở thêm cho tài khoản CHỈ giữ `SUPER_ADMIN` (không giữ `ADMIN`) — nếu không, `SUPER_ADMIN` "any ở mọi thao tác" đúng trên `MATRIX` nhưng bị cổng thô của router chặn trước khi chạm tới `MATRIX`. Không có trong kế hoạch gốc, phát hiện khi viết test cho Task 9.
- **`mayManage` (không chỉ `canManageAccount` trần)**: tự sửa chính mình (đổi tên/SĐT/ngưng — luật cũ `checkAccountChange` đã cấm) bị luật cấp bậc mới CHE MẤT nếu áp thẳng `canManageAccount(actor, actor)` — actor giữ ADMIN, target (chính actor) cũng giữ ADMIN → bị tính là "một ADMIN khác" một cách sai. Phải loại trừ tường minh `actor.id === target.id` trước khi hỏi `canManageAccount`, để lỗi 409 "không tự ngưng chính mình" (đặc tả rõ hơn) không bị 403 "không quản lý được" che mất. Việc này KHÔNG có trong kế hoạch, phát hiện khi chạy e2e `admin.mjs` (dòng tự-ngưng-chính-mình kỳ vọng 409, ra 403).
- **`checkAssignee`/`eligible` của `dispatch/rules.test.ts`**: một test tripwire có sẵn ("mọi quyền hiện có được xếp vào đúng nhóm được giao/không được giao") tự động bắt `SUPER_ADMIN` đủ điều kiện làm người phụ trách (vì `order.modify = any`) — đúng ý ADR-0014 điều 2, chỉ cần cập nhật danh sách kỳ vọng, không phải lỗi.
- **`tests/e2e/admin-race.mjs`** phải viết lại phần lõi: kịch bản gốc ("hai admin cuối tự bỏ quyền ADMIN của NHAU") không còn thực hiện được nữa — sau điều 8, một ADMIN không bao giờ tự bỏ được quyền của MỘT ADMIN KHÁC, kể cả "đối thủ" của chính cuộc đua. Đổi người gọi hai lệnh song song từ X/Y (hai admin đang đua) sang một tài khoản `SUPER_ADMIN` cố định (thêm `ACCOUNTS.superAdmin` vào `tests/e2e/lib.mjs`) — lưới bảo vệ CSDL (`OTHER_ADMIN`, không phân biệt ai gọi) vẫn được kiểm y hệt.
- **`tests/e2e/admin.mjs`, `turnstile.mjs`**: ba chỗ tạo tài khoản test không kèm `permissions` (dựa vào mặc định SALES cũ) phải gán tường minh — nếu không, `audit-invariants --strict` cuối chuỗi e2e báo "tài khoản đang hoạt động không có quyền nào" (kiểm đã có từ trước D-02, trước đây không bao giờ bắt được gì vì trạng thái đó vốn không thể xảy ra qua API).
- **`createPartner`/"P1 FINDING" của `tests/audit/doi-tac.test.mjs`**: P1 (kiểm hành vi mặc định SALES) đổi thành ca hồi quy D-02; `createPartner` (dùng cho P2/P3/P5/P6, mô phỏng "lỡ gán Bán hàng cho người ngoài") phải gán tường minh `permissions: ["SALES"]` để giữ đúng kịch bản gốc thay vì vô tình tạo tài khoản không quyền.

## 4. Việc CHỦ DỰ ÁN quyết/làm

1. **Kiểm độc lập trước** (CLAUDE.md §3, việc lớn) — chưa làm ở phiên này. Đọc mã thật + chạy lại `npm test`/`typecheck`/`test:e2e`, đối chiếu ADR-0014 điều 1–3, 7, 8; báo "đạt"/"không đạt", không tự AI khai.
2. Sau kiểm độc lập đạt: chủ dự án quyết merge `main` (AI không tự `git push`/merge — `CLAUDE.md` §8).
3. Triển khai (nếu chủ dự án quyết làm ngay): theo mục "CHỜ TRIỂN KHAI — ADR-0014 Phase A" mới thêm vào `docs/HANDOFF-N1.md` — áp `0020` (chỉ `INSERT`, không cần `wrangler deploy` đi kèm nếu tách hai bước như `0017`, NHƯNG mã Worker cũng đổi ở đợt này — quyền `PARTNER`/`SUPER_ADMIN`, route `access: "orders"` — nên vẫn cần deploy cùng lúc, khác `0017`; kiểm lại kỹ trước khi viết runbook chi tiết, đây chỉ là điểm cần lưu ý, chưa phải kết luận). Sau khi áp remote: chạy câu SQL gán `SUPER_ADMIN` một lần cho SĐT của chủ.
4. **Chưa cấp tài khoản `PARTNER` thật nào** cho tới khi merge + (nếu chủ dự án chọn) triển khai xong — đúng thứ tự đề xuất §5 của `docs/AUDIT-2026-09-22-DOI-TAC.md`.

## 5. Việc kế tiếp (Phase B/C/D — chưa thi công, viết kế hoạch riêng ở phiên sau)

- **Phase B** (ADR-0014 điều 6/11): `order.money.edit`/`order.cancel` cho `FIELD` đang phụ trách — cần bảng "dòng điều chỉnh" mới (migration), route riêng ở module `dispatch`, cơ chế "tiền tự tính lại + đánh dấu chênh lệch cho ACCOUNTING", lý do huỷ từ danh sách đóng.
- **Phase C** (điều 9/10): CTV chọn hướng dẫn viên nội bộ lúc lập đơn (`dispatch.guides.view`); đối tác ngoài "xin nhận, nhân viên duyệt" (`dispatch.request`, bảng lưu yêu cầu, luật nghiệp vụ "chỉ gán PARTNER qua duyệt yêu cầu đang chờ" trong `mayChangeHandler`).
- **Phase D** (điều 12): chấm đếm báo CTV khi đơn bị sửa/huỷ.
- Hai điều còn mở, chưa hỏi/chưa chốt (ghi ở đặc tả ngắn §6): loại sửa nào `FIELD` không được làm (vd giảm giá); tiêu chí mở rộng thí điểm sau 2 tuần.
