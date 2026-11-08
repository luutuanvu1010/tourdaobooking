# ADR-0190 — Chỉ Quản trị, Toàn quyền ngừng dùng hoặc dùng lại hồ sơ không gắn tài khoản; nhật ký ghi rõ (phát hiện R3d)

- **Trạng thái:** proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần V mục 2.3), thuộc **ADR lượt A** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-a.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp: ĐẠT. Chưa có mã.
- **Số:** 0190 (soát như ADR-0188).
- **Nguồn:** hồ sơ rà soát `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/phu-luc/02-quyen-doi-tac-ve-xe.md` (R3d: Bán hàng khác ngưng hồ sơ khách đang là người đặt đơn nháp của đồng nghiệp ⇒ đồng nghiệp sửa đơn bị 400; nhật ký chỉ ghi «cá nhân»). Lời chủ lượt 1 ngày 8/11, phương án chọn: «ADR: Quản trị ngưng». Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (quyền) — người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều (thêm một ô quyền và một điều kiện ở route; không migration, không đổi dữ liệu).
- **Sửa:** ADR-0007 mục 1, dòng «Tạo/sửa hồ sơ khách, đại lý (danh bạ) — SALES ✓, ACCOUNTING ✓, ADMIN ✓» (tách riêng việc ngừng dùng / dùng lại). Không sửa nguyên văn ADR-0007.
- **Liên quan:** ADR-0013 (hồ sơ gắn tài khoản do màn tài khoản ngưng), ADR-0014 điều 2 (Toàn quyền có mọi ô), ADR-0024 6.4 / Ruling D17 (hồ sơ công ty chủ không ngưng được), ADR-0068 (gộp hồ sơ), ADR-0166 câu 9 và ADR-0167 (tên «Ngừng dùng»).
- **Xây trên lỗ đang hở:** không (không chạm sổ tiền, khôi phục, bút toán, hai ô hoãn).
- **Số quyết định chạm quyền/dữ liệu:** 1.

## Bối cảnh

`PUT /api/parties/:id` (`src/modules/parties/index.ts`) là đường duy nhất đặt cờ «Đang dùng» (`active`) của hồ sơ, ngoài lệnh gộp hồ sơ (chỉ Quản trị, Toàn quyền; lật hồ sơ phụ). Với hồ sơ không gắn tài khoản, route chỉ hỏi ô `party.write` = Bán hàng (kèm Quản lý bán hàng), Kế toán, Quản trị, Toàn quyền. Hồ sơ gắn tài khoản bị chặn đổi cờ (409, «bấm Ngưng ở màn Quản lý tài khoản»); hồ sơ công ty chủ không ngưng được. Hồ sơ khách dùng chung giữa nhiều người bán: một người ngưng thì đơn nháp của người khác đang trỏ hồ sơ đó không lưu được nữa (`resolveBooker` từ chối hồ sơ đã ngưng), và nhật ký `party_updated` chỉ ghi loại hồ sơ («cá nhân»), không nói đã ngưng.

## Quyết định

1. **Ô quyền mới `party.deactivate`** — ngừng dùng hoặc dùng lại hồ sơ không gắn tài khoản: Quản trị, Toàn quyền (`quanTri()`). Không thêm mã quyền (mã vai), nên không nhân đôi các bài «mọi tập con quyền».
   - **Dự phòng trần gói:** gói trang Đơn hàng (`web/orders.ts`) nhúng cả bản đồ quyền, mỗi dòng ô mới tốn khoảng 50–100 byte, trần hôm dò còn dư khoảng 68 byte và Đợt 1, Đợt 3 cũng dùng chỗ này. Nếu lúc thi công đo thấy vượt trần, dùng ô có sẵn `admin.manage` (cùng hai vai, 0 byte) thay cho ô mới, ghi lý do ở commit; **không nới trần** cho việc này.
2. **Route `PUT /api/parties/:id`:** khi cờ «Đang dùng» gửi lên khác cờ đang lưu (cả hai chiều: ngừng dùng và dùng lại) mà người gọi không giữ ô ở mục 1 ⇒ 403 với câu «Chỉ Quản trị hoặc Toàn quyền ngừng dùng hoặc dùng lại hồ sơ.» (một hằng). Hỏi sau luật hồ sơ gắn tài khoản và luật công ty chủ đang có (hai luật đó giữ nguyên câu và mã). Cờ không đổi thì không hỏi ô — người bán vẫn sửa tên, liên hệ như hôm nay.
3. **Nhật ký:** dòng `party_updated` thêm hậu tố «— ngừng dùng» hoặc «— dùng lại» khi cờ đổi, theo khuôn hậu tố «— đổi giới tính», «— đổi ngày sinh» đang có. Không ghi SĐT, email, MST.
4. **DTO chi tiết hồ sơ** thêm một cờ cho giao diện biết người xem đổi được «Đang dùng» hay không (máy chủ tính bằng đúng ô ở mục 1). **Giao diện** (`web/parties.ts`, ô «Đang dùng» ở form sửa hồ sơ): hôm nay chỉ khoá khi hồ sơ gắn tài khoản; nay khoá thêm khi cờ nói không đổi được. Máy chủ vẫn kiểm lại.
5. **Không đổi:** ai tạo/sửa hồ sơ (tên, liên hệ, giấy tờ); luật hồ sơ gắn tài khoản; luật công ty chủ; gộp hồ sơ; danh sách «Ngưng» và bộ lọc «gồm hồ sơ đã ngưng».
6. **Ngoài phạm vi, ghi `docs/BACKLOG.md`** (hai phát hiện phụ của lần dò 8/11): xác nhận đơn nháp có bên đặt đã ngưng vẫn qua; đơn mới cùng SĐT tạo hồ sơ trùng.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0007 mục 1, bảng | «Tạo/sửa hồ sơ khách, đại lý (danh bạ) \| ✓ \| ✓ \| ✓ \| —» | giữ dòng đó cho tạo/sửa; thêm dòng «**Ngừng dùng / dùng lại hồ sơ khách, đại lý** \| — \| — \| ✓ \| — (Toàn quyền có theo ADR-0014 điều 2; ADR-0190)» |

## Lý do

Hồ sơ khách là dữ liệu dùng chung; ngừng dùng ảnh hưởng đơn của người khác, nên thuộc người quản lý danh bạ (Quản trị đã giữ gộp hồ sơ, việc gần nhất). Người bán vẫn sửa được thông tin, chỉ không tắt hồ sơ của cả công ty.

## Phương án bị loại

- **Giữ cho Bán hàng ngưng, chỉ thêm nhật ký:** vẫn để một người làm hỏng đơn nháp của đồng nghiệp.
- **Cho người lập hồ sơ tự ngưng:** hồ sơ khách không có «chủ» rõ ràng (người lập đầu tiên có thể đã nghỉ); thêm luật «của mình» cho hồ sơ là việc lớn hơn.
- **Chặn ngưng khi hồ sơ đang là bên đặt của đơn nháp:** đúng triệu chứng nhưng để nguyên câu hỏi «ai được ngưng»; có thể thêm sau.

## Bài kiểm (đỏ trước, xanh sau)

- `src/modules/parties/ngung-ho-so.test.ts` (mới): Bán hàng, Quản lý bán hàng, Kế toán đổi cờ → 403, hồ sơ giữ nguyên; Quản trị, Toàn quyền → 200; dùng lại cũng vậy; Bán hàng sửa tên mà không đổi cờ → 200; nhật ký có «— ngừng dùng» / «— dùng lại»; cờ DTO đúng theo người xem.
- Đảo bài cũ: `src/modules/parties/ho-so-co-tai-khoan.test.ts` (ca «ngưng hồ sơ khách vẫn được (R3d ngoài phạm vi)» với Bán hàng → nay 403); ca R3d của `tests/audit/redteam.test.mjs` thành bài hồi quy (Bán hàng khác bị từ chối, đơn nháp của đồng nghiệp sửa được).
- Bài bảng quyền (`src/shared/permissions.test.ts`, ô mới; hoặc ghi chú dùng `admin.manage`), `src/permission-enforcement.test.ts` nếu bài đòi mọi ô có route hỏi.
- Kịch bản Chrome màn Danh bạ (form sửa hồ sơ) với tài khoản Bán hàng và Quản trị, ảnh 390 và 1280.

## Người dùng sẽ thấy

Nhân viên Bán hàng, Kế toán mở sửa hồ sơ khách hoặc đại lý: ô «Đang dùng» bị khoá (vẫn sửa được tên, liên hệ). Chỉ Quản trị, Toàn quyền tắt hoặc bật lại ô này. Nhật ký thay đổi hồ sơ ghi rõ «ngừng dùng» hoặc «dùng lại».

## Hệ quả

- Khi duyệt: dòng Trạng thái ADR-0007 thêm trỏ về ADR này. Bảng tham chiếu: câu báo mới vào `src/shared/bang-tham-chieu*.ts` nếu bảng có mục câu báo của hồ sơ.
- Trần gói trang Đơn hàng: +1 dòng bản đồ quyền nếu dùng ô mới (chưa đo); dự phòng ở mục 1.
