# Sổ thi công — Đợt 0, luồng Q: quyền tiền chỉ Toàn quyền (ADR-0090)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md` §6 (Q0–Q7), §2.3 (Q-T1…Q-T9).
- **Checklist:** `docs/superpowers/plans/2026-10-02-khac-phuc-audit-checklist.md` mục 1, "Luồng Q".
- **Nhánh / worktree:** `worktree-dot-0-luong-q` (`.claude/worktrees/dot-0-luong-q`), tách từ `main` @ `df6bc864` (2026-10-02).
- **Vai phiên:** thi công. Không tự nghiệm thu (N8); Q6 do `nguoi-kiem-doc-lap`.

## Q0 — Kiểm kê (2026-10-02)

**Mốc trước khi sửa:** `npm run typecheck` 0 lỗi; `npm test` 2802 + 1 (bài đo giờ) đạt, 0 đỏ.

**Đối chiếu §3 của kế hoạch:** các dòng trích vẫn đúng ở `df6bc864` (route tài khoản `src/modules/accounts/index.ts`: POST `/api/staff` `:387` (đường vai `:403`, đường cũ `:437`), PUT permissions `:523`/`:528`, PUT roles `:590`/`:605`, reset-pin `:655`, unlock `:700`, cờ `datLaiPinDuoc` của sổ phiên `:735`; `roles.ts:33` `ACCOUNTANT.superAdminOnly: false`; `SUPER_ADMIN_GRANTED` `:56`; `web/staff.ts` nút "Đặt lại PIN" `:93-95`, `:148-150`; `web/role-picker.ts:22-23`, ẩn vai `:74`).

**Bài sẽ đỏ VÌ ĐÚNG LUẬT MỚI (sửa theo luật, ghi từng chỗ):**
| Bài | Vì sao | Sửa thế nào |
|---|---|---|
| `src/shared/roles.test.ts:9` (`VAI_QUAN_LY`) | câu sinh từ `superAdminOnly` nay có "Kế toán" | cập nhật chuỗi |
| `src/shared/roles.test.ts:24` | danh sách vai chỉ-Toàn-quyền thêm `ACCOUNTANT` | cập nhật danh sách |
| `tests/e2e/roles.mjs:33-39` | Quản trị cộng tay `ACCOUNTING` cho K ⇒ nay 403 | đổi người làm sang Toàn quyền, thêm ca Quản trị ⇒ 403 |
| `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs:47-77` | tài khoản chỉ Nhân sự chọn vai Kế toán ở form Thêm — vai Kế toán nay ẩn với Nhân sự | đổi vai thử sang vai không chỉ-Toàn-quyền (Q3) |

**Bài KHÔNG đổi (đã kiểm):**
- `tests/e2e/roles.mjs:13`, `:113` — tạo Kế toán bằng `SUPER`.
- `tests/e2e/admin.mjs:89` — Quản trị PUT permissions đã 403 từ ADR-0083; `:142` Quản trị reset-pin A khi A đã về chỉ `SALES` (`:96`) ⇒ vẫn 200.
- `tests/e2e/phien.mjs:203` — Quản trị reset-pin salesA (chỉ Bán hàng).
- `tests/e2e/chinh-sach-phien.mjs:84,93`, `permissions.mjs:125` (`TAO_TK` — xem lại khi chạy e2e), `thongbao.mjs:403` (Toàn quyền).
- Kịch bản Chrome `va3-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs`, `dot-a-smoke.mjs`: không thao tác Quản trị lên Kế toán (grep `ACCOUNTANT|Kế toán` không ra).

**Không canh trong luồng Q (ngoài ba cửa của ADR-0090, ghi để không hiểu nhầm):**
- `POST /api/staff/:id/passkeys/remove-all` (gỡ Face ID), `PATCH` kích hoạt lại tài khoản Kế toán — ADR không liệt kê.
- (iv) tắt bảo mật hai lớp — chờ ADR-0074 Phần B; chỉ có bài `todo`.
- Quản trị đặt lại PIN Bán hàng/HDV để dùng thay — ADR-0093 (PIN tạm).

## Q1 — hàm "có quyền tiền" (2026-10-02)
- `O_GHI_TIEN`, `MA_QUYEN_TIEN`, `coQuyenTien` ở `src/shared/permissions.ts` (ngay sau `OperationCode`). Đỏ trước: `permissions.test.ts` "does not provide an export named 'MA_QUYEN_TIEN'" → xanh 28/28.

## Q2 — cổng máy chủ ba cửa (2026-10-02)
- **Đỏ trước** (`src/modules/accounts/quyen-tien.test.ts`, router thật trên khung thử): Q-T2 `expected 403, actual 200`; Q-T3 `actual 200`; Q-T4 `actual 201`. Đối chứng (Q-T2 Bán hàng, Q-T5, Q-T6, Q-T8) xanh ngay từ đầu.
- **Xanh:** `ACCOUNTANT.superAdminOnly = true`; `highPermissionProblem` + `roleAssignmentProblem` thêm luật quyền tiền (R-Q1); `TIEN_CHI_TOAN_QUYEN_MESSAGE`, `chamTaiKhoanTienDuoc`, `datLaiPinDuoc` ở `src/shared/roles.ts`; route reset-pin gọi `chamTaiKhoanTienDuoc` sau `mayManage`, TRƯỚC mọi ghi; cờ sổ phiên (`GET /api/sessions`) đổi sang `datLaiPinDuoc`. `SUPER_ADMIN_GRANTED` và `canManageAccount` KHÔNG đổi.
- **Cùng commit (vì cùng tệp route):** cờ theo dòng `datLaiPinDuoc` của `GET /api/staff` (`StaffListRowDto` ở `contracts.ts`) — phần máy chủ của Q3. Bài đỏ trước: "cờ … khớp mã trả của route reset-pin" đỏ (cờ `undefined`) → xanh.
- **Bài sửa theo luật mới:**
  - `src/shared/roles.test.ts`: `VAI_QUAN_LY` thêm "Kế toán"; danh sách vai chỉ-Toàn-quyền thêm `ACCOUNTANT`; hai ca cũ khẳng định `null` (cấp Kế toán bởi Quản trị — `highPermissionProblem`, gán vai `ACCOUNTANT`) đổi thành 403 câu đ1.
  - `src/modules/accounts/hanh-chinh-nhan-su.test.ts` "điều 1b, 1f": ca đường quyền cũ `ACCOUNTING` → `FIELD` (ADR-0090 thay "mọi loại" của ADR-0071 1b).
  - `src/modules/accounts/mat-mien-route.test.ts` AC9: ví dụ Kế toán → Hướng dẫn viên (Quản trị vẫn là người đổi vai — giữ ý bài).
  - `tests/e2e/roles.mjs` bước 2 và bước 3 (dòng 49): Quản trị → 403 câu đ1, rồi Toàn quyền làm.
- **Lệnh:** `node --test` các tệp trên xanh; `npm run typecheck` 0 lỗi; `npm test` 2813 đạt; `npm run test:e2e -- roles admin permissions` EXIT=0.
- **Bài đo giờ của hook** (`claude-guard-thoi-gian.test.ts`) đỏ HAI lần khi chạy cùng bộ (máy có tải trung bình 41 — các phiên khác đang chạy e2e); chạy riêng `--test-concurrency=1` thì đạt (4,4 giây). Không liên quan thay đổi của luồng Q.

## Ruling thi công (tự áp, có khuyến nghị rõ)

- **R-Q1 (thứ tự câu báo):** `highPermissionProblem` kiểm nhóm Quản trị/Toàn quyền/Nhân sự TRƯỚC (giữ câu cũ khi đụng `SUPER_ADMIN`), rồi mới kiểm quyền tiền. `roleAssignmentProblem` kiểm quyền tiền TRƯỚC luật vai `VAI_QUAN_LY` (để câu đúng ADR-0090 đ1). Tập kích hoạt câu tiền ở luật vai / chỉnh tay = `MA_QUYEN_TIEN` trừ `SUPER_ADMIN_GRANTED` (suy ra, không chép tay `ACCOUNTING`) — để gán vai IT / Giám đốc vẫn nhận câu cũ.
