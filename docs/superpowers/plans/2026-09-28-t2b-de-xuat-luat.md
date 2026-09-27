# T2b — đề xuất sửa luật (CHỜ CHỦ DUYỆT — không tự có hiệu lực)

- **Ngày:** 2026-09-28. **Người soạn:** phiên thi công T2b (vai thi công, nhánh `worktree-agent-adbf65d3e8d68a3f9`).
- **Vì sao có tệp này:** Hiến pháp N9 — AI không tự sửa luật chi phối chính mình; Điều 9.4 — hàng rào đã duyệt chỉ được SIẾT, muốn NỚI phải có chủ duyệt. Chỉ đạo D6 của điều phối (nhật ký thi công `docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md`).
- **Trạng thái:** CHỜ CHỦ DUYỆT. Chủ phải duyệt tệp này **trước** `npm run day-len`. Chưa duyệt thì nhánh không được gộp.

## Mục 1 — NỚI hàng rào đồ thị module: hai cạnh mới trong `ALLOWED_EDGES` (`src/architecture.test.ts`)

Hai cạnh này ĐÃ nằm trong mã của nhánh (để test chạy được), nhưng việc sửa test **không tự thành được phép**. Không vòng: bài "đồ thị phụ thuộc module không có vòng" (`src/architecture.test.ts`) xanh; lập luận ở kế hoạch `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md` mục 1.2 (tập tới được từ `parties` chỉ gồm `locations`, `audit`).

```diff
-  auth: ["staff", "maintenance"], // maintenance: …
+  auth: ["staff", "maintenance", "parties"],
-  company: [], // chỉ đọc hồ sơ công ty của chính mình; không import module nào
+  company: ["parties"],
```

| Cạnh | Nguồn | Dùng để làm gì | Nếu chủ KHÔNG duyệt |
|---|---|---|---|
| `company → parties` | Có nguyên chữ trong đề xuất đã duyệt `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md` §5 mục "Module" ("`company` đọc qua `parties` ⇒ `ALLOWED_EDGES` thêm `company → parties`") | `GET /api/company` (biên nhận) đọc định danh Tour Đảo qua hàm công bố `ownerCompany` | Phương án còn lại của §5: chuyển route `GET /api/company` vào `parties` (module `company` còn lại không route) |
| `auth → parties` | **Suy ra** từ ADR-0024 bổ sung 6.2 (chủ duyệt 28/9): trang đăng nhập lấy tên + MST từ `GET /api/auth/config` "qua một hàm công bố của `parties`" — route đó ở module `auth` nên `auth` phải import `parties/index.ts`. Không có nguyên chữ trong văn bản đã duyệt | Hai trường `companyName`, `companyTaxCode` của `GET /api/auth/config` | Tiêm hàm qua gốc lắp ráp (`src/index.ts`) — nhưng tiêm chỉ dành cho gọi NGƯỢC chiều phụ thuộc (`docs/CHANGE-GUIDE.md` công thức b); hoặc đi `auth → company` (thêm một bước trung gian, cũng là cạnh mới) |

Ghi chú: hôm nay `auth` đã tới `parties` **bắc cầu** (`auth → staff → parties`), nên cạnh thứ hai không đổi tập phụ thuộc của `auth`, chỉ làm thẳng đường.

## Mục 2 — `docs/ARCHITECTURE.md` (Hiến chương + luật; tài liệu chuẩn tắc — AI không tự sửa)

**2a. Bảng thi hành, dòng "2.1" (dòng 141)** — lệch "Tour Đảo chưa có hồ sơ" nay đã gỡ; ghi cưỡng chế thật. Lý do: bảng thi hành phải nói đúng hiện trạng mã.

```diff
-| 2.1 Bên trước vai; Tour Đảo là hồ sơ | `architecture.test.ts` (tiền tố, khoá ngoại) | **Tour Đảo chưa có hồ sơ** (`company_profile` một dòng, không `party_id`) | ADR-0001 |
+| 2.1 Bên trước vai; Tour Đảo là hồ sơ | `architecture.test.ts` (tiền tố, khoá ngoại); hồ sơ công ty chủ (vai `OWNER_COMPANY`, migration 0030): ba trigger "đúng một, không lúc nào trống, đổi được" + kiểm `R-PTY-1` + hàm công bố `ownerCompany` + test route `src/modules/parties/cong-ty-chu.test.ts` | địa chỉ ở chân trang đăng nhập vẫn là chữ tĩnh (6.2 duyệt hai trường); `company_profile` chưa thu hồi (cột pháp lý đã chết, còn câu giữ chỗ `find_logo` — nợ R1/D4); lớp CSDL KHÔNG canh "ai được đổi công ty chủ" (chỉ route) | ADR-0001, ADR-0024 điều 6 (+ ADR-0043) |
```

**2b. Phần II, sơ đồ tầng (dòng 175 và 177)** — mô tả đúng module `company` và việc `parties` nằm DƯỚI `auth`/`staff`/`company` như `ALLOWED_EDGES` thật (sơ đồ đã lỏng từ khi có `staff → parties`). Lý do: tài liệu luật phải khớp đồ thị mà test ép.

```diff
-src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties, company (chỉ đọc bảng `company_profile`, route `GET /api/company`; sửa hồ sơ công ty là M5, chưa làm), dispatch (…
+src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties (kể cả HỒ SƠ CÔNG TY CHỦ — Tour Đảo, vai `OWNER_COMPANY`, hàm công bố `ownerCompany`; nằm DƯỚI `auth`, `staff`, `company` trong đồ thị), company (route `GET /api/company` = danh sách trắng năm trường cho biên nhận, đọc định danh qua `parties.ownerCompany`; bảng `company_profile` chỉ còn `logo_url`, chờ thu hồi), dispatch (…
-src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route
+src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route. Cả hai đọc `parties` (staff: hồ sơ của tài khoản; auth: tên + MST công ty chủ cho `GET /api/auth/config`)
```

## Mục 3 — `src/CLAUDE.md` dòng 20 (luật máy chủ)

Lý do: câu "vai trò hồ sơ không bao giờ là điều kiện cho phép" vẫn đúng, nhưng T2b dùng mã vai `OWNER_COMPANY` để đánh dấu hồ sơ ĐÍCH phải hỏi thêm ô — ghi rõ để người sau không đọc nhầm thành ngoại lệ "cho phép".

```diff
-- Vai trò hồ sơ (HDV, tài xế…) **không bao giờ** là điều kiện cho phép (`architecture.test.ts` bắt mọi tệp ngoài `parties` nhắc `pty_party_role`).
+- Vai trò hồ sơ (HDV, tài xế…) **không bao giờ** là điều kiện cho phép (`architecture.test.ts` bắt mọi tệp ngoài `parties` nhắc `pty_party_role`). Riêng mã vai `OWNER_COMPANY` ("Công ty chủ", ADR-0024 6.4) chỉ đánh dấu hồ sơ ĐÍCH phải hỏi thêm ô `company.legal.write` — chỉ SIẾT, không bao giờ cho thêm quyền; câu tra nằm trong `parties` (`isOwnerCompanyParty`, không xuất ra ngoài).
```

## Mục 4 — `web/CLAUDE.md`, bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào"

Lý do: T2b thêm một kịch bản Chrome mới và đổi số bước của `v1-dang-nhap.mjs` (15 → 16).

```diff
-| `web/login.ts`, `public/login.html`, CSP ở `public/_headers` | `v1-dang-nhap.mjs` ở `docs/evidence/2026-09-21-v1-0/kich-ban/` (15 bước, ước ~9 phút, cần mạng) + `dot-c-smoke.mjs` (cột thương hiệu máy tính, xem hàng cuối bảng) |
+| `web/login.ts`, `public/login.html`, CSP ở `public/_headers` | `v1-dang-nhap.mjs` ở `docs/evidence/2026-09-21-v1-0/kich-ban/` (16 bước, ước ~9 phút, cần mạng; bước a2 = chân trang đi theo hồ sơ công ty chủ) + `dot-c-smoke.mjs` (cột thương hiệu máy tính, xem hàng cuối bảng); chân trang còn có `src/chan-trang-dang-nhap.test.ts` (chữ tĩnh dự phòng khớp dữ liệu gieo) |
+| `web/parties.ts` — phần hồ sơ công ty chủ (lựa chọn "Công ty chủ" chỉ cho người giữ `company.legal.write`, câu xác nhận đổi, khối công việc theo `admin.manage`) | `t2b-danh-ba-smoke.mjs` ở `docs/evidence/2026-09-28-t2b/kich-ban/` (Quản trị bị từ chối bằng câu tiếng Việt; tài khoản chỉ Toàn quyền đổi công ty chủ thật trên D1 tạm) + `vai-smoke.mjs` + `dot-a-smoke.mjs` |
```

## Mục 5 — `CLAUDE.md` gốc §10 (bẫy hay dính) — thêm một gạch

Lý do: hai bẫy dễ làm hỏng biên nhận/production mà người sau khó đoán.

```diff
+- **Hồ sơ công ty chủ** (Tour Đảo, vai `OWNER_COMPANY`, migration `0030`): tên/MST/địa chỉ/hotline/email chỉ đọc qua `ownerCompany` của `parties` — `company_profile` đã chết cột pháp lý, đừng đọc lại. Vai này KHÔNG kết thúc được (409); đổi công ty chủ = người giữ `company.legal.write` gán vai cho hồ sơ tổ chức khác. Đóng liên hệ "Hotline" cuối cùng (hoặc đổi sang hồ sơ thiếu tên pháp lý/MST/địa chỉ/Hotline) làm `GET /api/company` 404 → biên nhận báo lỗi. e2e trên D1 chung đừng đổi công ty chủ (không đổi lại được trong ngày). Chi tiết: `docs/CHANGE-GUIDE.md` công thức j, bẫy 46.
```

## Tóm tắt để chủ duyệt

| Mục | Loại | Cần chủ |
|---|---|---|
| 1 — hai cạnh `company → parties`, `auth → parties` | NỚI hàng rào đã duyệt (đã ở trong mã nhánh) | Duyệt, hoặc chọn phương án thay (cột "Nếu chủ KHÔNG duyệt") |
| 2a, 2b — `docs/ARCHITECTURE.md` | sửa tài liệu chuẩn tắc cho khớp mã | Duyệt |
| 3 — `src/CLAUDE.md` | làm rõ luật (không đổi nghĩa) | Duyệt |
| 4 — `web/CLAUDE.md` | thêm dòng bảng kịch bản | Duyệt |
| 5 — `CLAUDE.md` §10 | thêm một bẫy | Duyệt |

Khi chủ duyệt: phiên sau sửa đúng các diff trên thành commit riêng trên nhánh (kế hoạch Task 17), TRƯỚC `npm run day-len`.
