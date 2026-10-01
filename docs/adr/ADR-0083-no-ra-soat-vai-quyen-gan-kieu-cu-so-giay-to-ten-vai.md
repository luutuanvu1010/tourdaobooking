# ADR-0083 — Nợ rà soát vai ↔ quyền: gán quyền kiểu cũ chỉ Toàn quyền và chặn tài khoản lai; số giấy tờ đầy đủ chỉ Toàn quyền; đổi tên vai "Tài xế taxi"

- **Trạng thái:** **accepted** — chủ dự án trả lời ba câu hỏi trong chat ngày 2026-10-01, sau khi giao *"làm tiếp các nợ còn lại trong rà soát"*:
  - "Chỉ Toàn quyền + chặn lai";
  - "Chỉ Toàn quyền";
  - "Đổi tên".

  AI ghi lại lời chủ, không tự quyết.
- **Ngày:** 2026-10-01   **Loại:** **hai chiều**. Có migration chỉ đổi một chữ (UPDATE tên vai), đảo ngược được bằng một UPDATE khác.
- **Số hiệu:** 0083. Đã soát mọi nhánh cục bộ ngày 2026-10-01: số đã dùng lớn nhất là 0082 (nhánh `tro-ly-tim-theo-nghia`).
- **Nguồn:** `docs/superpowers/specs/2026-10-01-han-che-quan-tri-hcns/RA-SOAT-VAI-QUYEN.md`, các mục A5, C5, A4.
- **Sửa:**
  - ADR-0048 B2.2 (LC-1b): mở rộng chặn lai ở đường cũ.
  - ADR-0040 (ô `party.document.reveal`): cột ADMIN đổi thành `none`.
  - ADR-0018 điều 2 (tên vai): đổi tên một vai.

## Quyết định

1. **Đường gán quyền kiểu cũ `PUT /api/staff/:id/permissions`** — dùng cho tài khoản **chưa gán vai**.
   - a. Chỉ người hỏi được `admin.manage.superadmin` (Toàn quyền) mới dùng. Quản trị và HCNS nhận 403. Họ đổi quyền bằng cách gán vai.
   - b. **Chặn lai:**
     - Tập quyền mới không được vừa có quyền bên ngoài (`isExternalPermission`: Đối tác, Tài xế đối tác) vừa có quyền nội bộ. Vi phạm thì trả 400 với câu dễ hiểu.
     - Luật LC-1b có sẵn (Tài xế đối tác đứng một mình) giữ nguyên.
     - Luật mới là một hàm thuần ở `src/shared/roles.ts`, dùng chung cho mọi đường ghi quyền không qua vai.
   - c. Không sửa dữ liệu đã có. Tài khoản lai cũ (nếu có) do chủ rà bằng lệnh chỉ đọc rồi xử lý từng tài khoản.
   - d. Giao diện: khối "Quyền cũ" ở màn Sửa tài khoản chỉ hiện với Toàn quyền, theo `can(admin.manage.superadmin)`.
2. **Xem đủ số giấy tờ** (CCCD, bằng lái…):
   - Ô `party.document.reveal` cột ADMIN đổi từ `any` thành `none`, nên chỉ Toàn quyền xem được.
   - Quản trị vẫn thấy số đã che ("••••6789"), vẫn ghi và sửa giấy tờ (`party.document.write` giữ nguyên).
   - Nút "Xem đủ số" ẩn theo `can()`.
   - Nhật ký xem số giữ nguyên.
3. **Đổi tên vai** `TAXI_DRIVER`: "Tài xế taxi" thành **"Tài xế taxi (giới thiệu khách)"**.
   - Chỉ đổi chữ: mã vai và quyền giữ nguyên.
   - Hai nguồn phải khớp nhau (`src/roles-schema.test.ts`):
     - `ROLES` ở `src/shared/roles.ts`;
     - `pty_role_type.name`, qua migration mới: một câu UPDATE, số tạm 0063, vì 0061 và 0062 đã có nhánh khác giữ.
   - Sửa các hướng dẫn trong app có nhắc tên cũ.

## Trang ghép (CLAUDE.md §9)

1. **Bảng:**
   - `stf_permission` (quyền của tài khoản): đường ghi cũ nay chỉ Toàn quyền và thêm luật lai. Bảng này chứa quyền của mọi loại tài khoản: nội bộ, đối tác, tài xế đối tác.
   - `pty_party_document` (giấy tờ của người — chỉ đổi người được đọc số đầy đủ): chứa giấy tờ của nhân viên, tài xế công ty, tài xế đối tác, HDV.
   - `pty_role_type`: chỉ đổi chữ một dòng.
2. **Dòng bản đồ quyền:**
   - `party.document.reveal`: cột ADMIN đổi thành `none`, áp cho mọi loại hồ sơ có giấy tờ.
   - `admin.manage.superadmin`: thêm một route dùng.
   - `account.edit`: không còn đủ cho `PUT …/permissions`.
3. **Cổng canh cửa:**
   - `PUT /api/staff/:id/permissions`: cổng `accounts` → `can(account.edit)` → `can(admin.manage.superadmin)` → `mayManage` → LC-4 → luật lai.
   - `POST /api/parties/:id/documents/:did/reveal` (route hiện có, cổng `office`): `can(party.document.reveal)`.
   - **Giao diện** (luật mới CLAUDE.md §9): khối "Quyền cũ" của `web/staff.ts`; nút "Xem đủ số" của `web/parties.ts`. Cả hai hỏi `can()`.

## Hệ quả

- Quản trị không xem đủ số giấy tờ nữa. Cần kiểm bằng lái thật thì nhờ Toàn quyền, hoặc xem bản giấy.
- Kiểm, theo thứ tự đỏ trước, xanh sau:
  - bài khoá ô MATRIX;
  - route: Quản trị và HCNS gọi `PUT …/permissions` → 403; Toàn quyền gán `["PARTNER","SALES"]` → 400; Quản trị gọi reveal → 403;
  - test đồng bộ tên vai;
  - kịch bản Chrome theo bảng `web/CLAUDE.md`: `giay-to-nguoi-smoke`, `vai-smoke`, `quyen-thieu-quan-tri-smoke`.
