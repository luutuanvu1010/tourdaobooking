# ADR-0013 — Hồ sơ gắn tài khoản chỉ quản trị viên cấp trên sửa; "đang hoạt động" của người có tài khoản do tài khoản quyết

- **Trạng thái:** **proposed**. Bản đầu do AI soạn 2026-09-22; **bản sửa 2 do AI soạn 2026-09-24** theo quyết định của chủ dự án cùng ngày (kế hoạch `docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md` §5: Q1 = B, Q2 = đồng ý) và theo ADR-0014 điều 8 (đã accepted 2026-09-22, yêu cầu ADR này thêm điều kiện "cấp dưới"). Chờ chủ dự án chuyển sang **accepted**. Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-22 (bản đầu), 2026-09-24 (bản sửa 2)   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều**: thêm một thao tác vào bản đồ quyền (`src/shared/permissions.ts`), một hàm tiêm vào `ctx`, hai trường chỉ-đọc vào hồ sơ trả về; không đổi cấu trúc dữ liệu, không migration; gỡ được bằng một commit.
- **Liên quan:** ADR-0007 (dòng "Tạo/sửa hồ sơ khách, đại lý (danh bạ)"), ADR-0001 (một danh tính nhiều vai; tài khoản trỏ hồ sơ), ADR-0005 (tên tài khoản đọc từ hồ sơ), ADR-0002 (ranh giới module), ADR-0014 điều 2 và điều 8 (Super Admin; quản lý tài khoản theo cấp bậc); kiểm toán `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-01, F-07; red team `tests/audit/redteam.test.mjs` R3, R3b, R3c; bằng chứng `docs/evidence/2026-09-24-lo-hong-ho-so/`; đặc tả `docs/superpowers/specs/2026-09-22-ho-so-nhan-vien-chi-quan-tri-sua.md`.
- **Vá lỗ đang hở:** F-01 (mục `party.view`, `party.write` và 4 đường ghi `/api/parties*` trong `docs/quyen-hoan.json`, hạn **2026-10-08**).

## Bối cảnh

ADR-0007 cấp thao tác "tạo/sửa hồ sơ **khách, đại lý** (danh bạ)" cho SALES, ACCOUNTING và ADMIN (mã: `party.write`). Cùng ngày 20/9, ADR-0001 điều 6 đưa nhân sự vào chung bảng hồ sơ và ADR-0005 đặt tên tài khoản bằng tên hồ sơ. Ba quyết định đúng riêng lẻ, ghép lại thành lỗ: các route `/api/parties*` không hỏi bảng quyền (chỉ có cổng thô `office`) nên áp `party.write` cho **mọi** hồ sơ, kể cả hồ sơ của nhân viên.

Hệ quả đã chứng minh: một tài khoản chỉ có quyền Bán hàng đổi được tên, ngưng được và thêm số điện thoại được vào hồ sơ của quản trị viên (R3, R3c). Tên giả hiện ở "người lập", "người phụ trách" và trên ảnh xác nhận gửi khách (R3b). Không leo quyền được (quyền nằm ở `stf_permission`), nhưng là mạo danh nội bộ lộ ra ngoài.

Kèm theo là hai cờ "đang hoạt động" độc lập: `staff.active` (đăng nhập, giao phụ trách) và `pty_party.active` (danh sách hồ sơ, chọn làm người đặt). Chưa có luật nói cái nào đúng khi chúng khác nhau.

Tiền đề đã kiểm trên mã 2026-09-24 (điều 5 dựa vào nó): mọi đường tạo tài khoản (`staff/index.ts:createAccountStatements`, gọi từ `POST /api/staff` và `POST /api/staff/sheet/apply`) đều tạo **hồ sơ mới**; không có đường nào gắn tài khoản vào hồ sơ đã có. Một hồ sơ tối đa một tài khoản (chỉ mục `staff_party_uq`). Truy vấn chỉ đọc trên production 2026-09-24: 0 tài khoản đang hoạt động có hồ sơ bị ngưng.

## Quyết định

1. **Thao tác mới `party.staff.write`** = SALES none, ACCOUNTING none, ADMIN any, FIELD none, PARTNER none, SUPER_ADMIN any (ADR-0014 điều 2): "sửa hồ sơ **gắn một tài khoản** (tên, liên hệ)". `party.write` giữ nguyên ô và từ nay chỉ còn nghĩa là "hồ sơ **không** gắn tài khoản" (khách, đại lý, HDV/tài xế chưa có tài khoản), đúng chữ của ADR-0007.
   - **"Gắn tài khoản"** = có một dòng `staff` trỏ tới hồ sơ (`staff.party_id`), **kể cả tài khoản đang ngưng**. Luật đi theo hồ sơ có tài khoản bất kể quyền của tài khoản đó, nên ôm cả hồ sơ của tài khoản Đối tác (`PARTNER`), kể cả khi sau này một công ty lữ hành có tài khoản (chủ dự án đồng ý 2026-09-24, Q2): khi đó SALES không sửa được tên, địa chỉ, MST hay liên hệ của hồ sơ đó nữa.
2. **Cấp bậc (ADR-0014 điều 8).** Có ô `party.staff.write` chưa đủ: người gọi còn phải **quản lý được tài khoản gắn hồ sơ đó**, đúng luật đang dùng ở màn Nhân viên: là chính tài khoản đó, **hoặc** `canManageAccount` (Super Admin quản mọi tài khoản; Quản trị chỉ quản tài khoản không giữ `ADMIN`/`SUPER_ADMIN`). Quản trị viên sửa được hồ sơ của **chính mình** (như `PATCH /api/staff/:id` đã cho đổi tên chính mình; điều 8 chỉ chặn "Admin/Super Admin **khác**"). Nhân viên không phải quản trị **không** tự sửa hồ sơ của mình (ô của họ là `none`; lý do ở "Phương án bị loại").
3. **Nơi thi hành:** trong thân handler, bằng lời gọi `can()` viết thẳng (để hàng rào máy `src/route-write-guard.test.ts` và `src/permission-enforcement.test.ts` thấy được):
   - Ba route ghi chạm hồ sơ có sẵn (`PUT /api/parties/:id`, `POST /api/parties/:id/contacts`, `POST /api/parties/:id/contacts/:cid/end`): hồ sơ gắn tài khoản → cần `can(staff, "party.staff.write")` **và** điều kiện cấp bậc ở điều 2; không gắn → cần `can(staff, "party.write")`. Không đạt → **403**, không ghi gì.
   - `POST /api/parties` (tạo mới — hồ sơ mới chưa thể gắn tài khoản) → `can(staff, "party.write")`.
   - Bốn route đọc (`GET /api/parties`, `/meta`, `/lookup`, `/:id`) → `can(staff, "party.view")`.
   - Route vai trò và quan hệ (`access: "admin"`) **không đổi** ở ADR này (xem "Hệ quả").
   - **Mức truy cập route (`office`) không đổi**; tách cổng `office` khỏi `order.view` là việc của ADR tiếp theo (GĐ2, số ADR lấy lúc soạn), là điều kiện tiên quyết của ADR-0017 (Q3).
4. **Cách `parties` biết hồ sơ gắn tài khoản nào:** gốc lắp ráp (`src/index.ts`) **tiêm** một hàm của module `staff` vào `ctx`, cùng cơ chế ADR-0007 điều 4(b) đang dùng cho `ctx.isAssigned`:
   `ctx.partyAccount(partyId) → Promise<{ linked: false } | { linked: true; manageable: boolean }>`, trong đó `manageable` = người đang đăng nhập quản lý được tài khoản gắn hồ sơ (điều 2), do module `staff` tính bằng `canManageAccount` của nó. `parties` **không** import `staff` và không đọc bảng `staff` (`staff → parties` là chiều đã có; chiều ngược lại thành vòng, `src/architecture.test.ts` chặn). Luật cấp bậc ở lại module `staff` như ADR-0014 điều 8 định; hàm tiêm chỉ trả kết luận, không trả id hay quyền của tài khoản.
5. **"Đang hoạt động" của người có tài khoản do tài khoản quyết** (thay điều 4 của bản đầu — chủ dự án chọn B, 2026-09-24):
   - Ngưng/kích hoạt tài khoản (`PATCH /api/staff/:id`) **không** ghi theo sang `pty_party.active` (bỏ ý "ngưng tài khoản ⇒ tự ngưng hồ sơ" của bản đầu).
   - Route của `parties` **từ chối đổi `active`** của hồ sơ gắn tài khoản, kể cả với Quản trị/Super Admin: **409** "Người này có tài khoản: tạm khoá hoặc cho nghỉ việc ở màn Nhân viên." Chỉ từ chối khi giá trị gửi lên **khác** giá trị hiện tại (giao diện luôn gửi kèm `active` khi sửa tên).
   - **Luật nghiệp vụ:** *tạm khoá* = chỉ ngưng tài khoản (hồ sơ giữ nguyên, lịch sử đơn vẫn mang tên người đó). *Nghỉ việc* = ngưng tài khoản **và** kết thúc vai Nhân sự (`STAFF`) của hồ sơ, có ngày. Hai bước làm ở hai màn như hiện nay (màn Nhân viên, màn Hồ sơ); nút gộp một bước để lại cho mô hình 11 vai.
   - **Bất biến một chiều**, kiểm ở `scripts/audit-invariants.mjs` mức **fail**: tài khoản đang hoạt động ⇒ hồ sơ của nó đang hoạt động. Không kiểm chiều ngược lại (tài khoản ngưng mà hồ sơ vẫn hoạt động là trạng thái bình thường của "tạm khoá").
   - **Tiền đề** (Bối cảnh): mọi tài khoản mới đều tạo hồ sơ mới, và sau ADR này không còn đường nào ngưng được hồ sơ gắn tài khoản ⇒ bất biến được giữ. **Nếu sau này có đường gắn tài khoản vào hồ sơ đã có** (ví dụ mô hình 11 vai cấp tài khoản cho một HDV/đối tác đã có hồ sơ), đường đó phải kiểm hồ sơ đang hoạt động, và điều 5 phải được xét lại trong ADR của đường đó.
6. **Giao diện biết trước để ẩn nút** (không lộ tài khoản): `GET /api/parties/:id` (và mọi phản hồi trả một hồ sơ đầy đủ) thêm hai trường chỉ-đọc do máy chủ tính cho **người đang xem**: `accountLinked: boolean` (hồ sơ gắn tài khoản) và `editable: boolean` (người đang xem sửa được tên/liên hệ của hồ sơ này theo điều 1–3). Không trả id tài khoản, quyền hay SĐT đăng nhập (giữ đúng đặc tả N1 §7.2 "`parties` không trả `accountId`"). Màn Hồ sơ: `editable = false` → ẩn nút lưu, thêm liên hệ, đóng liên hệ; `accountLinked = true` → ô "Đang dùng" bị khoá, kèm dòng chữ chỉ sang màn Nhân viên. Giao diện chỉ để tiện; máy chủ vẫn là nơi chặn.

## Lý do
- Sửa đúng chỗ trôi: đưa bản đồ quyền về đúng chữ của ADR-0007 thay vì thêm ngoại lệ không tên trong route (P6: bản đồ quyền một nơi).
- Tiêm hàm là cơ chế đã được duyệt và đã có test; không thêm cạnh phụ thuộc, không tạo vòng. Hàm tiêm trả kết luận (không trả quyền của tài khoản) nên luật cấp bậc vẫn ở một nơi (module `staff`).
- Một nguồn cho "đang hoạt động" (tài khoản) mà không ghi chéo sang bảng của module khác: đơn giản hơn bản đầu, không có batch hai module, và "tạm khoá" không làm biến mất người đó khỏi danh bạ.

## Phương án bị loại
- **Ngưng tài khoản ⇒ tự ngưng hồ sơ trong cùng batch** (bản đầu, điều 4): chủ dự án chọn B. Ghi chéo sang bảng module khác, và làm "tạm khoá" có tác dụng phụ trên danh bạ.
- **Chuyển mọi sửa hồ sơ nhân viên sang màn Nhân viên, cấm hẳn ở `/api/parties`, kể cả với Quản trị:** an toàn tương đương nhưng Quản trị mất đường sửa liên hệ của nhân viên ở màn Hồ sơ.
- **Để `parties` đọc view `v_stf_staff_label` hoặc bảng `staff`:** tạo vòng `parties ↔ staff`, bị test kiến trúc chặn.
- **Chuyển `canManageAccount` sang `src/shared/`:** trái ADR-0014 điều 8 (luật cấp bậc thuộc module quản tài khoản); hàm tiêm trả kết luận là đủ.
- **Trigger CSDL chặn sửa hồ sơ nhân viên:** trigger không biết ai đang gọi.
- **Cho nhân viên tự sửa hồ sơ của chính mình:** chủ chưa yêu cầu; tên của mình cũng in lên ảnh gửi khách. Để chủ quyết riêng nếu cần.
- **"Gắn tài khoản" chỉ tính tài khoản đang hoạt động:** mở lại lỗ cho hồ sơ của người đang bị tạm khoá (đổi tên rồi được kích hoạt lại).

## Hệ quả
- `src/shared/permissions.ts` thêm một dòng (26 thao tác), kèm test khoá bản đồ. `AppOptions.injected` và `Ctx` thêm `partyAccount` (thiếu hàm = lỗi typecheck). `PartyDto` thêm `accountLinked`, `editable`.
- Hai hàng rào máy: gỡ mục hoãn `party.view`, `party.write` và 4 đường ghi `/api/parties*` (`POST /api/parties`, `PUT /api/parties/:id`, `POST …/contacts`, `POST …/contacts/:cid/end`) khỏi `docs/quyen-hoan.json`; ô mới `party.staff.write` phải được máy chủ hỏi ngay từ commit thêm nó.
- Red team R3, R3b, R3c đổi thành PASS và có test hồi quy trong `npm test`. R3d (SALES ngưng hồ sơ **khách** làm hỏng đơn nháp của đồng nghiệp) **không** thuộc ADR này — vẫn là FINDING.
- **Hệ quả chéo cần biết (trang ghép, kế hoạch GĐ1 §3):** route vai trò hồ sơ vẫn là cổng thô `admin`, và ADR-0014 điều 8 miễn "vai trò hồ sơ" khỏi luật cấp bậc — nên một Quản trị vẫn kết thúc được vai `STAFF` trên hồ sơ của một Quản trị **khác**. Không mạo danh được (không đổi tên/liên hệ/đăng nhập), nhưng là chỗ lệch với tinh thần điều 2. Để GĐ2 (ADR tách cổng) quyết.
- Nhật ký `party_updated` giữ như cũ; không ghi SĐT/email/MST.
- Không migration, không đổi dữ liệu production.
