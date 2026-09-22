# Hồ sơ nhân viên chỉ quản trị viên sửa; một nguồn cho "đang hoạt động"

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt**, cùng **ADR-0013 (proposed)**; câu hỏi ở §6. Chưa có mã. Chưa qua kiểm độc lập.
> Nguồn: kiểm toán kiến trúc `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-01, F-07 (việc sửa số 3 của §22); chủ dự án đồng ý thứ tự ba việc sửa ngày 2026-09-22.
> Bằng chứng: `tests/audit/redteam.test.mjs` R3 (SALES đổi tên và ngưng hồ sơ quản trị viên → 200), R3b (tên giả hiện ở người lập và người phụ trách), D4 (hồ sơ bị ngưng nhưng tài khoản vẫn chạy).
> Loại việc: **việc lớn** (quyền: `permissions.ts`; luật: ADR mới) → ADR-0013 phải được duyệt trước khi thi công; thi công xong phải có người kiểm độc lập chỉ-đọc.

## 1. Vấn đề

Tên nhân viên hiện trong app (người lập đơn, người phụ trách, dòng "Nhân viên phụ trách" trên ảnh xác nhận gửi khách) lấy từ **hồ sơ** của họ. Màn Hồ sơ cho **mọi nhân viên văn phòng** sửa **mọi hồ sơ**, vì quyền "sửa hồ sơ" được thiết kế cho khách và đại lý. Khi hồ sơ nhân viên được gộp chung bảng với khách (đợt N1), quyền này không được xét lại. Hệ quả:

- Một nhân viên bán hàng đổi được tên quản trị viên hay đồng nghiệp. Khách nhận ảnh xác nhận ghi tên giả.
- Họ cũng ngưng được hồ sơ của người khác. Việc này không khoá được đăng nhập (đăng nhập đọc trạng thái **tài khoản**), nhưng sinh ra hai trạng thái "đang hoạt động" nói ngược nhau.
- Nhật ký chỉ ghi "cá nhân", không ghi tên cũ → mới, nên sau đó không biết đã bị đổi từ gì.

## 2. Hành vi mong muốn (lời thường)

- Hồ sơ **gắn với tài khoản nhân viên**: chỉ **quản trị viên** sửa được tên và thêm, đóng liên hệ. Người khác vẫn **xem** được như hôm nay, nhưng không thấy nút sửa; nếu gọi thẳng API thì bị từ chối (403).
- Hồ sơ **khách, đại lý** và người chưa có tài khoản: **không đổi gì**. Bán hàng và kế toán vẫn tạo và sửa như hôm nay.
- **Ngưng hoặc kích hoạt nhân viên** chỉ làm ở màn **Nhân sự**. Làm ở đó thì hồ sơ của họ tự ngưng hoặc kích hoạt theo. Màn Hồ sơ không đổi được trạng thái của hồ sơ nhân viên, kể cả với quản trị viên (có câu nhắc sang màn Nhân sự).
- Nhật ký khi quản trị viên đổi tên hồ sơ nhân viên ghi **tên cũ → tên mới**.

## 3. Thiết kế kỹ thuật (quyết định của người soạn, theo ADR-0013)

1. **Bản đồ quyền** `src/shared/permissions.ts`: thêm `"party.staff.write": row("none", "none", "any", "none")`, đồng thời sửa chú thích `party.write` thành "hồ sơ **không** gắn tài khoản". Cập nhật test khoá bản đồ và `docs/SYSTEM-DESIGN.md` §8.
2. **Hàm tiêm** (khuôn `isAssigned`):
   - Module `staff` công bố `isStaffParty(db, partyId): Promise<boolean>` (một câu `defineSql`: `SELECT 1 FROM staff WHERE party_id = ?1`; có chỉ mục `staff_party_uq`).
   - `src/shared/router.ts` thêm `injected.partyHasAccount` và `ctx.partyHasAccount(partyId)`.
   - `src/index.ts` nối hai phần. `parties` **không** import `staff` (ADR-0013 điều 3).
3. **Route của `parties`**: `PUT /api/parties/:id`, `POST /api/parties/:id/contacts` và `POST /api/parties/:id/contacts/:cid/end` gọi `ctx.partyHasAccount(id)` **song song** với việc đọc hồ sơ (`Promise.all`, như bốn route của `orders`), rồi `can(staff, has ? "party.staff.write" : "party.write")`. Sai → 403 `forbidden` "Hồ sơ nhân viên chỉ quản trị viên sửa được." Với `PUT`: nếu `has` và `active` gửi lên khác trạng thái hiện tại → 409 `account_rule` "Ngưng/kích hoạt nhân viên ở màn Nhân sự."
4. **Đồng bộ trạng thái** (ADR-0013 điều 4):
   - `parties` công bố `setPartyActiveStatement(db, partyId, active, actorId, at, onlyIfPrevApplied)`, cùng khuôn `renamePersonStatements` (`… AND (?N = 0 OR changes() > 0)`).
   - `patchStaffStatements` (module `accounts`) thêm câu này **ngay sau** nhật ký `staff_suspended`/`staff_reactivated`, mang cùng điều kiện thắng. Giữ đúng hai điều mà chú thích của hàm đòi: mỗi mắt xích đổi ≥ 1 dòng ở đường thắng, và thứ tự liền nhau.
   - Thêm test SQLite vào `src/modules/accounts/patch-staff.test.ts`.
5. **Nhật ký**: `party_updated` của hồ sơ gắn tài khoản ghi `tên "A" → "B"` khi tên đổi.
6. **DTO + giao diện**: `PartyDetailDto` thêm `hasAccount: boolean` (`src/shared/contracts.ts`). `web/parties.ts` ẩn nút Sửa, Thêm liên hệ, Đóng liên hệ khi `hasAccount && !ADMIN`, và hiện dòng "Hồ sơ nhân viên — quản trị viên sửa ở màn Nhân sự". Chạy lại kịch bản Chrome của màn Hồ sơ.
7. **Kiểm dữ liệu** (`scripts/audit-checks.mjs`): `R-N1-15` "hồ sơ của tài khoản đang hoạt động phải đang hoạt động": `SELECT count(*) FROM staff s JOIN pty_party p ON p.id = s.party_id WHERE s.active = 1 AND p.active = 0`. Mức ban đầu `warn-unless-strict`; chủ chạy một lần trên production (chỉ đọc) trước khi nâng lên `fail` (xem §6 câu 2).
8. **Kiến trúc**: không thêm cạnh phụ thuộc. `ALLOWED_EDGES` giữ nguyên, trừ việc `accounts` gọi thêm hàm của `parties` qua `staff` (nếu `staff` bọc lại) hoặc trực tiếp (thêm cạnh `accounts → parties` vào `ALLOWED_EDGES`). Quyết định lúc lập kế hoạch; ưu tiên bọc trong `staff`, như `renameAccountStatements`.

## 4. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

1. SALES và ACCOUNTING gọi `PUT /api/parties/pty-<quản trị viên>` (đổi tên), `POST …/contacts`, `POST …/contacts/:cid/end` → **403**; hồ sơ, liên hệ và nhật ký không đổi.
2. Như (1) với hồ sơ của một nhân viên SALES khác, và với **hồ sơ của chính mình** → 403 (trừ khi chủ chọn khác ở §6 câu 1).
3. ADMIN đổi tên hồ sơ nhân viên qua `/api/parties/:id` → 200; nhật ký `party_updated` có `tên "cũ" → "mới"`, không có SĐT.
4. ADMIN đổi `active` của hồ sơ nhân viên qua `/api/parties/:id` → 409, không đổi gì.
5. Hồ sơ khách: SALES và ACCOUNTING tạo, sửa, thêm và đóng liên hệ như hôm nay (ca e2e `parties.mjs` hiện có vẫn xanh).
6. ADMIN ngưng tài khoản ở `PATCH /api/staff/:id` → `staff.active = 0` **và** `pty_party.active = 0` trong cùng một lần; kích hoạt lại → cả hai = 1. Khi thua tranh chấp (câu chốt "còn quản trị viên khác" không áp dụng) → không cái nào đổi.
7. `GET /api/parties/:id` trả `hasAccount` đúng cho cả hai loại hồ sơ. Giao diện: SALES không thấy nút sửa trên hồ sơ nhân viên (kịch bản Chrome).
8. Ca R3, R3b, D4 của `tests/audit/` **đổi sang đỏ**. Chuyển chúng thành test hồi quy thật (e2e `permissions.mjs` hoặc `parties.mjs`) rồi xoá khỏi `tests/audit/`.
9. Thiếu `injected.partyHasAccount` ở `createApp` → `npm run typecheck` báo lỗi (quan sát một lần: xoá dòng tiêm → đỏ → hoàn nguyên, P16).
10. `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --strict` xanh.

## 5. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. **Hồ sơ gắn tài khoản** = có một dòng `staff` trỏ tới (mọi trạng thái, kể cả tài khoản đã ngưng: hồ sơ của người đã nghỉ việc cũng chỉ quản trị viên sửa).
2. Ai cũng vẫn **xem** được hồ sơ nhân viên (tên, SĐT liên hệ) như hôm nay; việc này không siết quyền xem.
3. Vai trò hồ sơ (HDV, tài xế…) và quan hệ vốn đã chỉ quản trị viên sửa; không đổi.
4. Kẽ hở tranh chấp: nếu hồ sơ được gắn vào một tài khoản **đúng lúc** đang bị sửa thì lần sửa đó đi qua. Hiện không có đường gắn hồ sơ có sẵn vào tài khoản (tạo tài khoản luôn tạo hồ sơ mới), nên kẽ hở này không mở.
5. Tên đã bị đổi trước khi sửa (nếu có) **không** tự khôi phục. Nhật ký cũ không có tên cũ; quản trị viên xem màn Nhân sự và sửa tay.

## 6. Câu hỏi cho chủ dự án

1. **Nhân viên có được tự sửa hồ sơ của chính mình không** (ví dụ thêm số Zalo, sửa tên gõ sai)? (a) **Không — khuyến nghị**: tên của mình cũng in lên ảnh gửi khách, và sửa tên là việc hiếm, nhờ quản trị viên là đủ. (b) Được thêm và đóng **liên hệ** của mình nhưng không đổi tên. (c) Được sửa cả tên.
2. **Đồng ý bạn chạy một lần lệnh kiểm chỉ-đọc trên production** để xem hiện có nhân viên nào đang hoạt động mà hồ sơ đã bị ngưng không? Nếu có, việc sửa dữ liệu thật do bạn quyết riêng.
3. **Duyệt ADR-0013?** Duyệt, sửa kèm lý do, hoặc huỷ.

## 7. Ngoài phạm vi

Siết quyền **xem** hồ sơ; phạm vi hồ sơ theo chi nhánh (ADR-0010 điều 1); gộp hồ sơ trùng; cho nhân viên tự sửa hồ sơ (trừ khi chủ chọn 1b/1c); B5 (`staff_party_required`).
