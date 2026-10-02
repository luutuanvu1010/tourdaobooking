# ADR-0086 — Bỏ hai ô quyền chưa có route (`task.progress`, `dispatch.guides.view`) khỏi bản đồ quyền; thêm lại cùng route khi làm

- **Trạng thái:** **rejected** 2026-10-01 — chủ dự án, chat: *"giữ lại đi, tiếp"* (sau khi AI báo ADR-0019 điều 5 từng chủ ý giữ hai ô). Hai ô ở lại `MATRIX`; ADR-0019 điều 5 giữ nguyên. Hạn hoãn 2026-11-30 ở `docs/quyen-hoan.json` **không đổi** — gia hạn chỉ khi chủ ra ngày (quá hạn ⇒ `npm test` đỏ).
- **Ngày:** 2026-10-01. **Số:** 0086 (0085 đã dùng ở nhánh `chinh-sach-dang-nhap`; đếm mọi nhánh lúc soạn). **Migration:** không.
- **Mốc mã:** nhánh `worktree-doi-chieu-phieu-giam-doc` @`c2570533` (= `origin/main` 1.62 + bản 1.63 chưa đẩy).
- **Nguồn (lời chủ, chat 2026-10-01):** trả lời câu "Có bỏ ô quyền 'nhiệm vụ đón' chưa dùng không — để nguyên thì từ 30/11 bộ kiểm báo đỏ": *"Bỏ, ghi ADR vì tôi chưa thấy thấu đáo, bỏ nếu bạn khuyến nghị như vậy."*
- **Sửa:** ADR-0019 điều 5 (câu "giữ trong bảng … giữ hoãn tới 2026-11-30"); ADR-0014 bảng cột `PARTNER` (hai dòng) và điều 9, điều 10 (phần ô quyền); bảng đích ADR-0018 điều 6 (dòng `dispatch.guides.view`) — chỉ phần "có ô trong `MATRIX` từ bây giờ", không bỏ ý định nghiệp vụ.

## Tóm tắt (lời thường)

Hai quyền đã được đặt sẵn trên bản đồ quyền từ 20/9 nhưng **chưa có màn hình hay lệnh nào dùng**: "cập nhật tiến độ việc được giao" (cho hướng dẫn viên, đối tác đang phụ trách) và "xem danh sách hướng dẫn viên" (cho đối tác chọn người phụ trách). Bỏ cả hai khỏi bản đồ. Không ai mất việc gì đang làm được. Khi làm thật hai chức năng đó, thêm lại quyền **cùng lúc** với chức năng.

## Bối cảnh

- `src/shared/permissions.ts:94` (`task.progress`) và hàng `dispatch.guides.view`: không route nào hỏi (`src/shared/permissions.ts:58` tự ghi "bốn ô giữ chỗ"). Hàng rào "mỗi ô được máy chủ hỏi" (`src/permission-enforcement.test.ts`) đang cho qua nhờ hai mục hoãn ở `docs/quyen-hoan.json`, hạn **2026-11-30**; quá hạn ⇒ `npm test` đỏ.
- ADR-0019 điều 5 (đã duyệt) **chủ ý giữ** hai ô vì có trong bảng vai đích (ADR-0018 điều 6), sẽ có route ở giai đoạn 5 của mô hình vai; hạn là để buộc xét lại. Lộ trình Vận chuyển 1/10 (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md`) **không** có nhiệm vụ theo dịch vụ (ADR-0006) trước 30/11.
- Bài học 24/9 (`docs/SO-HANG-RAO.md`, CLAUDE.md §3): ô có trong bảng mà máy chủ không hỏi bị đọc nhầm thành "đang được thi hành".
- Hai ô khác cùng loại (`invoice.request`, `invoice.issue`, hạn 2026-12-31) **ngoài phạm vi** ADR này — xét khi tới hạn hoặc khi làm hoá đơn.

## Quyết định

1. **Bỏ `task.progress` khỏi `MATRIX`** (và khỏi kiểu `Op`), mọi cột. Bỏ mục `task.progress` ở `docs/quyen-hoan.json`.
2. **Bỏ `dispatch.guides.view` khỏi `MATRIX`**, mọi cột. Bỏ mục tương ứng ở `docs/quyen-hoan.json`.
3. **Ý định nghiệp vụ giữ nguyên:** nhiệm vụ theo dịch vụ (ADR-0006) và cấp người phụ trách thứ ba của Đối tác (ADR-0014 điều 10) vẫn là hướng đã duyệt. Khi thi công, ô quyền được thêm lại **trong cùng bản phát hành với route hỏi nó**, bằng ADR/kế hoạch của việc đó (luật hiện hành của hàng rào "mỗi ô được máy chủ hỏi"). Giá trị ô lúc đó lấy theo ADR-0014 / bảng đích ADR-0018 trừ khi chủ đổi.
4. Cấp thứ ba của Đối tác (ADR-0014 điều 10) trong lúc chờ: chỉ còn `contact.view` như hiện thi hành — không đổi hành vi nào.
5. Trợ lý Mai: bỏ tên hai thao tác khỏi `src/shared/tro-ly-cau-truc-ten.ts`; bài "trợ lý không được hứa" (`src/shared/tro-ly-cau-truc.test.ts:78-79`) bỏ hai mã khỏi danh sách.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0019 điều 5 | "`task.progress` và `dispatch.guides.view` **giữ** trong bảng (…) và **giữ hoãn tới 2026-11-30** trong `docs/quyen-hoan.json`" | "`task.progress` và `dispatch.guides.view` **bỏ** khỏi bảng (ADR-0086); thêm lại cùng route khi thi công" |
| ADR-0014 bảng cột `PARTNER` | dòng `task.progress` = **assigned**; dòng `dispatch.guides.view` = **any** | (bỏ hai dòng — ADR-0086; thêm lại khi làm điều 9, 10) |
| ADR-0018 điều 6 | "`dispatch.guides.view` cho đối tác kèm SĐT công việc" | giữ là **bảng đích**; ô chỉ vào `MATRIX` cùng route (ADR-0086) |

## Cửa một chiều / hai chiều

**Hai chiều.** Không dữ liệu, không migration; thêm lại ô là một dòng bảng + bài kiểm. Không ai đang dùng (không route).

## Phương án bị loại

- **Gia hạn hai mục hoãn** (ví dụ tới khi lên lịch giai đoạn 5): giữ được chữ ADR-0019, nhưng ô "có mà không chạy" tiếp tục gây hiểu nhầm và lại phải gia hạn khi tới hạn mới; chưa có ngày thi công để đặt hạn có nghĩa.
- **Làm luôn nhiệm vụ theo dịch vụ trước 30/11:** ngoài phạm vi, cần đặc tả + bản vẽ; không đáng để chạy đua với hạn của hàng rào.

## Hệ quả

- Việc lớn (quyền) ⇒ người kiểm độc lập chỉ đọc sau khi thi công.
- Đổi: `src/shared/permissions.ts` (hàng, kiểu `Op`, chú thích dòng 58), `src/shared/permissions.test.ts` (bảng ghim, các ca `can(…, "task.progress")`, ba bài ghim hàng `DRIVER`/`DRIVER_PARTNER`/`HR`), `src/modules/orders/xem-don-theo-quyen.test.ts:279`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.test.ts`, `src/modules/dispatch/rules.ts:48` (chú thích), `docs/quyen-hoan.json`, `docs/SYSTEM-DESIGN.md:804` (bảng quyền) + §17 nếu nhắc, dòng Trạng thái của ADR-0014, ADR-0019 (chỉ dẫn "bị sửa bởi ADR-0086").
- Số bài "tập con quyền" không đổi (không thêm/bớt mã quyền).

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. `grep -rn "task\.progress\|dispatch\.guides\.view" src web` chỉ còn trong chú thích lịch sử (hoặc không còn).
2. `src/permission-enforcement.test.ts` xanh **không** cần mục hoãn cho hai mã; thêm lại một mục hoãn thừa ⇒ bài "hoãn thừa" đỏ (quan sát chặn thật, rồi hoàn nguyên).
3. `npm test`, `npm run typecheck` xanh; e2e đủ bộ xanh (không route nào đổi).
4. Trợ lý Mai: câu hỏi "cập nhật tiến độ việc được giao" không được trả lời như một việc làm được (bài cấu trúc trợ lý xanh).
