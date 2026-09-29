# ADR-0048 (nhà xe đối tác, tài xế đối tác) — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-29.
- **Người soạn:** phiên lập kế hoạch ADR-0048 (nhánh `worktree-agent-a41aedf108f7e51a8`). Người thi công điền số dòng thật ở Task A14 (mục 1–4, 6) và bước B-kết ở mục 7 (mục 5 của tệp này) của kế hoạch `docs/superpowers/plans/2026-09-29-adr-0048-thi-cong.md`.
- **Vì sao có tệp này:**
  - Hiến pháp N9: AI không tự sửa luật chi phối chính mình.
  - Điều 9.4: hàng rào đã duyệt chỉ được SIẾT; NỚI phải có chủ duyệt.
  - Tiền lệ T2b (`docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` mục 1) và Vận chuyển 1a (`docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md`): **ADR đã có chữ, nhưng sửa hàng rào không tự thành được phép**.
- **Căn cứ:** ADR-0048 (accepted 2026-09-28). D2 B2.1: "migration mới: **bỏ** trigger `lc1_stf_permission_external_partner_only` và **tạo lại** với tập mới"; "Tập này là một hằng dùng chung, thay `EXTERNAL_ALLOWED`".
- **Trạng thái:** **CHỜ CHỦ DUYỆT.** Duyệt xong mới gộp. Mỗi tệp luật một commit, sửa đúng diff dưới đây (Task K3).
- **Số dòng thật** (người thi công Phần A điền 2026-09-29, nhánh `worktree-agent-ae0f600ceaab6d8b4`, đo sau Task A13): mục 3 `docs/ARCHITECTURE.md:175`, mục 4 `src/CLAUDE.md:20`, mục 6a `CLAUDE.md:10`, mục 6b `CLAUDE.md:122` — **khớp** số dòng người lập kế hoạch ghi (tệp luật không đổi trên nhánh). Mục 5 điền ở Phần B (B-kết).
- **Người thi công đã làm gì với phần NỚI (mục 1)** — diễn giải R-TC1 ở nhật ký thi công mục 4 (điều phối sửa nếu sai): đã THI CÔNG trong mã 1a, 1b, 1c (để có P16 cho "LC-1 mới"), vì đó là nội dung ADR-0048 đã duyệt; KHÔNG sửa tệp luật thật (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/`). Mục 1d: chỉ THÊM một câu trỏ ở cột Ghi chú của dòng cũ và thêm dòng MỚI cho trigger tạo lại — chưa viết lại mô tả dòng cũ (diff đề xuất ở mục 1d dưới). Chủ KHÔNG duyệt mục 1 ⇒ hoàn nguyên đoạn LC-1 của 0037, hằng, `R-LC-1` (khi đó không cấp được tài khoản Tài xế đối tác).

## Mục 1 — NỚI hàng rào LC-1 (nội dung ADR-0048 đã duyệt; xin chủ xác nhận nới)

Luật cũ: "tài khoản có vai bên ngoài chỉ giữ quyền **Đối tác**". Luật mới: "… chỉ giữ quyền **bên ngoài** = Đối tác **hoặc** Tài xế đối tác". Kèm một luật **siết** mới (LC-1b: Tài xế đối tác không giữ quyền nào khác), nên tổng thể người ngoài không được thêm quyền nội bộ nào.

| # | Hàng rào | Chỗ sửa | Đổi | Nếu chủ KHÔNG duyệt |
|---|---|---|---|---|
| 1a | Trigger `lc1_stf_permission_external_partner_only` (CSDL) | migration mới `0037_tai_xe_doi_tac.sql` (không sửa `0024`) — **đã thi công** ở `migrations/0037_tai_xe_doi_tac.sql:10-15` (`DROP` dòng 10, `CREATE` dòng 11) | `NEW.permission_type_code <> 'PARTNER'` → `NEW.permission_type_code NOT IN ('PARTNER', 'DRIVER_PARTNER')`; câu báo "… chỉ giữ quyền bên ngoài (Đối tác hoặc Tài xế đối tác)"; **giữ tên** (ADR ghi "tạo lại") | Không cấp được tài khoản Tài xế đối tác (vai bên ngoài). Cả ADR-0048 D2 dừng |
| 1b | Hằng `EXTERNAL_ALLOWED = ["PARTNER"]` (`src/shared/roles.ts:49`) — lọc LC-1 ở `effectivePermissions`, chốt cộng tay ở `roleAssignmentProblem`, ô tick ở `web/role-picker.ts:36` | thay bằng `EXTERNAL_PERMISSIONS = ["PARTNER", "DRIVER_PARTNER"]` ở `src/shared/permissions.ts` (một hằng cho LC-1 và nghĩa "Toàn công ty") — **đã thi công**: hằng ở `src/shared/permissions.ts:29`, hàm đọc hằng `isExternalPermission` ở `:31` (`.includes` của bộ `as const` không nhận `PermissionCode` ở tsc); `EXTERNAL_ALLOWED` đã bỏ khỏi `src/shared/roles.ts`; `web/role-picker.ts:4,36` đổi sang `isExternalPermission` | thêm một mã | Như trên |
| 1c | Kiểm dữ liệu `R-LC-1` (`scripts/audit-checks.mjs:78-85` lúc lập kế hoạch; **đã thi công** ở `scripts/audit-checks.mjs:78-87`, kèm `R-LC-1b` mới ở `:88-97`) | `p.permission_type_code <> 'PARTNER'` → `NOT IN ('PARTNER', 'DRIVER_PARTNER')`; câu `what` theo luật mới | thêm một mã | Mọi lần triển khai sau khi có tài khoản Tài xế đối tác sẽ đỏ |
| 1d | Dòng sổ hàng rào `docs/SO-HANG-RAO.md:38` (LC-1, 0024) | sửa cột "Chặn cái gì" / "Ghi chú" theo nghĩa mới + ngày thấy chặn thật của trigger tạo lại. **Người thi công mới THÊM** câu trỏ ở cuối cột Ghi chú dòng 38 và dòng MỚI "Trigger `lc1_stf_permission_external_partner_only` (0037, tạo lại)" ở `docs/SO-HANG-RAO.md:133` (có ngày thấy chặn thật 2026-09-29). Diff đề xuất cho dòng 38, áp khi chủ duyệt: cột "Chặn cái gì" `Chèn quyền khác Đối tác vào tài khoản đang giữ vai bên ngoài (EXTERNAL)` → `Chèn quyền KHÔNG phải quyền bên ngoài vào tài khoản đang giữ vai bên ngoài (EXTERNAL) — từ 0037: quyền bên ngoài = Đối tác hoặc Tài xế đối tác (ADR-0048)`; bỏ câu trỏ "chờ chủ duyệt" ở Ghi chú | mô tả | — |

**Bù lại (siết, không cần duyệt riêng — ghi để chủ thấy đủ):**
- trigger mới `lc1b_stf_permission_driver_partner_alone`;
- câu kiểm mới `R-LC-1b`;
- lời kiểm LC-1b ở cả năm đường ghi quyền;
- bài ghim cả hàng `DRIVER_PARTNER` (mọi ô tiền = none);
- bài "DRIVER_PARTNER không ở cổng nào";
- bài cổng toàn tuyến chạy cho mã mới;
- `laNoiBo` hẹp hơn công thức cũ đối với mã mới (tài xế đối tác không nhận "Toàn công ty").

## Mục 2 — `src/architecture.test.ts`: KHÔNG đổi

- ADR-0048 không thêm module, cạnh hay tiền tố.
- `van-chuyen → parties` đã có (duyệt 2026-09-28). Trigger chủ xe của `van-chuyen` đọc **view công bố** `v_pty_owner_company`, `v_pty_carrier` (tiền tố `pty` đã có).
- Bài "view công bố" tự kiểm tên + cột của ba view mới qua `docs/data-dictionary.json`.
- Nếu người thi công thấy phải sửa tệp này, đó là **nới** chưa được duyệt → dừng, báo điều phối.

## Mục 3 — `docs/ARCHITECTURE.md` (tài liệu chuẩn tắc — AI không tự sửa)

**Phần II, sơ đồ tầng, dòng 175**: mô tả hai module đổi hợp đồng công bố. Chỉ sửa hai đoạn trong ngoặc; phần còn lại của dòng giữ nguyên.

```diff
-… parties (kể cả HỒ SƠ CÔNG TY CHỦ — Tour Đảo, vai `OWNER_COMPANY`, hàm công bố `ownerCompany`; nằm DƯỚI `auth`, `staff`, `company` trong đồ thị) …
+… parties (kể cả HỒ SƠ CÔNG TY CHỦ — Tour Đảo, vai `OWNER_COMPANY`, hàm công bố `ownerCompany`; nhà xe đối tác — vai `CARRIER`, quan hệ `DRIVES_FOR`, luật "tài xế thuộc nhà xe" công bố một lần ở view `v_pty_carrier_driver` và hàm `nhaXeDangHopTac` (ADR-0048); nằm DƯỚI `auth`, `staff`, `company` trong đồ thị) …
-… van-chuyen (Vận chuyển lượt 1a, ADR-0040 — bảng `vc_*` (xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng sắp hết hạn), route `/api/van-chuyen/*`; đọc `parties` qua hàm công bố `ownerCompany`, `expiringDriverDocuments`; không module nào import nó)
+… van-chuyen (Vận chuyển lượt 1a, ADR-0040; nhà xe đối tác, ADR-0048 — bảng `vc_*` (xe của công ty hoặc của nhà xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng sắp hết hạn), route `/api/van-chuyen/*`; đọc `parties` qua hàm công bố `ownerCompany`, `expiringDriverDocuments`, `nhaXeDangHopTac` và view `v_pty_party_label`, `v_pty_owner_company`, `v_pty_carrier` (trigger chủ xe); không module nào import nó)
```

Lý do: tài liệu luật phải khớp hợp đồng công bố mà mã dùng.

## Mục 4 — `src/CLAUDE.md` dòng 20 (luật theo thư mục)

Thêm **một câu** cuối dòng (giữ nguyên phần trước):

```diff
 … Danh sách giấy tờ sắp hết hạn lọc theo vai `DRIVER_INTERNAL` NGAY TRONG `parties` (lọc báo cáo, không phải điều kiện cho phép).
+ ADR-0048: vai hồ sơ `CARRIER` ("Nhà xe đối tác") là điều kiện DỮ LIỆU (chủ xe, đầu tới của quan hệ "Tài xế của" — trigger đọc view `v_pty_carrier`), KHÔNG phải điều kiện cho phép; mã QUYỀN `DRIVER_PARTNER` ("Tài xế đối tác") khác mã VAI `DRIVER_EXTERNAL` và khác quyền `DRIVER` (tài xế công ty); tài khoản giữ `DRIVER_PARTNER` không giữ quyền nào khác (LC-1b, hai lớp).
```

## Mục 5 — `web/CLAUDE.md` bảng "sửa giao diện → chạy kịch bản Chrome" (điền ở Task B-kết)

Dòng dự kiến (người thi công điền tên kịch bản và số bước thật):

| Phần giao diện | Kịch bản |
|---|---|
| Khoá chéo vai "Tài xế đối tác" ở khối "Vai và quyền" (`web/role-picker.ts`) | `vai-smoke.mjs` (bước khoá chéo + đổi "Tài xế taxi" → "Tài xế đối tác") |
| Quan hệ "Tài xế của" và vai "Nhà xe đối tác" ở Danh bạ (`web/parties.ts`) | _(điền)_ |
| Chủ xe ở `/xe`, `/xe-sua`, `/xe-chi-tiet` | `xe-smoke.mjs`, `xe-chi-tiet-smoke.mjs` (bước chủ xe) |
| Trang đầu tài xế với tài khoản Tài xế đối tác | `tai-xe-trang-dau-smoke.mjs` (chạy thêm với tài khoản `DRIVER_PARTNER`) |

## Mục 6 — `CLAUDE.md` gốc

**6a. §1 dòng 10.** Đếm và danh sách quyền. `CLAUDE.md` §3 cho AI tự sửa số đếm, nhưng dòng này thêm cả **nghĩa** của mã mới, nên đưa chủ duyệt.

```diff
-- Tám quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN`, `DRIVER` (Tài xế — ADR-0040). Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
+- Chín quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN`, `DRIVER` (Tài xế công ty — ADR-0040), `DRIVER_PARTNER` (Tài xế đối tác — ADR-0048; đứng một mình, không kèm quyền nào khác). Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
```

**6b. §10 dòng 122** (bẫy "Giấy tờ của người + chữ `DRIVER`"). Chỉ đổi câu cuối:

```diff
-… Mã QUYỀN `DRIVER` khác mã VAI hồ sơ cũ `DRIVER` (đã ngưng); vai tài xế công ty là `DRIVER_INTERNAL`. Thêm một mã quyền là nhân đôi mọi bài "tập con quyền" (256 hôm nay). Chi tiết: `docs/CHANGE-GUIDE.md` công thức y.
+… Mã QUYỀN `DRIVER` khác mã VAI hồ sơ cũ `DRIVER` (đã ngưng); vai tài xế công ty là `DRIVER_INTERNAL`; tài xế đối tác: vai `DRIVER_EXTERNAL`, quyền `DRIVER_PARTNER` (ADR-0048). Thêm một mã quyền là nhân đôi mọi bài "tập con quyền" (512 hôm nay); thêm mã quyền BÊN NGOÀI thì sửa cả `EXTERNAL_PERMISSIONS` lẫn trigger LC-1 (migration mới). Chi tiết: `docs/CHANGE-GUIDE.md` công thức y.
```

## Không đổi

- `LEGACY`, `KHONG_DB`, `STRICT`, `ALLOWED_EDGES`, `TABLE_PREFIX`, `VIEW_PREFIX` (`src/architecture.test.ts`).
- `GUARDS`, `ADMIN_OPS` (`src/route-write-guard.test.ts`).
- `docs/quyen-hoan.json`.
- Danh sách cổng (`src/shared/permissions.ts:158-168`).
