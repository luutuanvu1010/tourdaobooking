# Đề xuất T2b — Tour Đảo là hồ sơ tổ chức, một nguồn cho tên / MST / địa chỉ

- **Ngày:** 2026-09-27.
- **Người soạn:** phiên điều phối.
- **Trạng thái:** **ĐÃ DUYỆT 2026-09-28** — chủ dự án trả lời nguyên văn "duyệt T2b" trong phiên điều phối. Đã chép vào ADR-0024: **accepted phần điều 6**, kèm bổ sung 6.1–6.6 rút từ §3 dưới đây. Từ nay sửa nội dung = ADR mới. (Trước khi duyệt, nháp đặt ngoài `docs/adr/` để tránh hỏi quyền từng lần sửa.)
- **Người kiểm độc lập** (2026-09-28, trên 96c7024): ĐẠT CÓ ĐIỀU KIỆN. Đã sửa cả ba điểm:
  - Nghiêm trọng: lỗ gán/kết thúc vai "công ty chủ" (mục 3.5);
  - Quan trọng: ô quyền trỏ đúng ADR-0038 điều 7 (mục 3.4);
  - Quan trọng: chân trang đăng nhập mô tả đúng hiện trạng (mục 3.2).
- **Hình thức:** ADR-0024 **"accepted phần điều 6"**, kèm câu bổ sung theo quyết định (a) của chủ. Không cần số ADR mới. Tiền lệ duyệt từng phần: ADR-0020 (điều 1, 2, 3, 7), ADR-0023 (điều 1, 2, 4).
- **Nguồn quyết định, kiểm được:**
  - Chủ chọn "2i" (làm T2b trước phân hệ Vận chuyển lượt 1a) và "T2b chọn a", trong phiên điều phối 2026-09-27. Ghi ở `docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md` §6 (commit 85b677a, 9690e05).
  - T2b là mục của gói "dọn nền" (`docs/superpowers/specs/2026-09-27-ra-soat-cau-truc-du-an-theo-oracle.md` §3), chủ đã duyệt gói 27/9.

## 1. Vấn đề (H5 của báo cáo rà cấu trúc)

Định danh Tour Đảo nằm ở ba chỗ:
- `company_profile`: bảng một dòng, không phải hồ sơ Bên (`migrations/0002`), đọc qua `GET /api/company`, dùng cho biên nhận ở `web/confirmation-dialog.ts`:27.
- `pty_organization`: cột pháp lý, nhưng chưa có dòng nào cho Tour Đảo.
- `public/login.html`:44: chữ tĩnh "Công ty TNHH Tour Đảo · MST 4201969169".

Việc này trái Hiến chương 2.1: "Chính Tour Đảo cũng là một hồ sơ tổ chức; không viết cứng định danh công ty trong mã — tra qua **một** hàm công bố".

## 2. Điều 6 của ADR-0024 (nguyên văn, đang proposed)

> 6. **Tour Đảo là một hồ sơ** — hôm nay `company_profile` là bảng một dòng không có `party_id` (`migrations/0002`). Tạo **hồ sơ tổ chức Tour Đảo** trong `parties`, đánh dấu bằng **một mã vai** (dữ liệu, `pty_role_type`; tên mã chốt ở kế hoạch), và `parties/index.ts` công bố **một** hàm trả id hồ sơ đó. Không viết cứng id trong mã; không thêm cột vào `company_profile`. Bài kiểm dữ liệu: đúng một hồ sơ đang mở vai đó (vào `audit-invariants`).
>    - **Bảng hồ sơ nhận thêm một loại thực thể** ("công ty chủ") — […] hồ sơ công ty chủ **chỉ** sửa/kết thúc vai/gộp qua `admin.manage` […]; route `party.write` và gộp hồ sơ từ chối nó; test hồi quy "Bán hàng sửa hồ sơ công ty chủ → 403".

## 3. Nội dung đề xuất chủ duyệt

**D-T2b (một quyết định):** duyệt điều 6 ADR-0024 như trên, bổ sung:
1. **Một nguồn thật = hồ sơ tổ chức Tour Đảo** (chủ chọn (a)).
   - Tên pháp lý, MST, địa chỉ lưu ở `pty_organization` của hồ sơ đó.
   - Hotline và số Zalo là điểm liên hệ loại `PHONE`, dùng cột `label` có sẵn ("Hotline", "Zalo") — `migrations/0011`:48-58, **không** cần thêm loại liên hệ.
   - Email là điểm liên hệ loại `EMAIL`.
2. **Mọi nơi đọc qua MỘT hàm công bố của `parties`** (tên hàm chốt ở kế hoạch):
   - `GET /api/company`: giữ đường dẫn, đổi nguồn đọc. Biên nhận không phải sửa.
   - **Trang đăng nhập** (nói rõ vì chạm màn hình chủ đã duyệt):
     - Hôm nay chân trang là chữ tĩnh, theo bản thiết kế Claude Design (`web/login.ts`:386-388, commit ec83521; trang KHÔNG gọi `/api/company`). Chủ đã chọn "(a) … trang đăng nhập … đọc qua một hàm" ở câu T2b.
     - Đề xuất: **hình thức chân trang giữ y bản thiết kế**, chỉ đổi NGUỒN chữ. Tên + MST lấy từ `GET /api/auth/config` — route công khai trang vốn đã gọi (`src/modules/auth/index.ts`:103-104). Thêm 2 trường, **không** thêm request.
     - Chữ tĩnh hiện có là nội dung hiện trước khi cấu hình tải xong, hoặc khi lỗi mạng.
     - Chữ tĩnh hôm nay đã lệch dữ liệu gieo một chữ hoa ("tỉnh" ở `login.html`:45 so với "Tỉnh" ở `migrations/0002`:20). Khi làm thì sửa theo dữ liệu hồ sơ. Bài so khớp dùng chuỗi đã chuẩn hoá, không so từng ký tự.
3. **Giới hạn phạm vi (nói rõ):**
   - `company_profile` **không bị xoá** ở lượt này. Các cột pháp lý thôi được đọc; `logo_url` (thương hiệu, không phải định danh) còn ở lại.
   - Việc thu hồi hẳn làm theo expand–contract ở một lần phát hành sau (CLAUDE.md §7).
4. **Ai được sửa hồ sơ công ty chủ:** ô **`company.legal.write`, chỉ SUPER_ADMIN**, theo **ADR-0038 điều 7** (nhánh `worktree-an-nhat-ky-toan-quyen`, commit d8165e3, chủ chọn 27/9, CHƯA gộp main). Ô này thay cho `admin.manage` trong câu gốc của điều 6.
   - Mọi route ghi hồ sơ công ty chủ (định danh, điểm liên hệ, **vai**) hỏi ô này trong thân route.
   - Nếu T2b lên main trước ADR-0038, T2b tự thêm ô vào MATRIX; nhánh gộp sau gộp main và không khai lặp.
   - `party.write` từ chối hồ sơ công ty chủ.
   - **Tính năng gộp hồ sơ chưa có trong mã** (N2). Khi xây, nó phải từ chối hồ sơ này; ghi thành yêu cầu cho tính năng đó.
5. **Chặn lỗ gán / kết thúc vai "công ty chủ"** (người kiểm độc lập phát hiện, Nghiêm trọng).
   - `POST /api/parties/:id/roles` và `POST /api/parties/:id/roles/:rid/end` (`src/modules/parties/index.ts`:291-297, 316-324) hôm nay chỉ đòi `can(admin.manage)` và chỉ chặn vai nhóm nội bộ/ngoài. Vai nhóm OTHER như "công ty chủ" lọt qua, nên bất kỳ Quản trị nào cũng kết thúc được vai (làm hỏng `/api/company`) hoặc gán thêm một "công ty chủ" thứ hai.
   - **Hai lớp (Hiến chương 5.1):**
     - (i) hai route trên từ chối mã vai "công ty chủ" trừ khi người gọi có `company.legal.write`;
     - (ii) ở CSDL: chỉ mục duy nhất một phần `pty_party_role(role_type_code) WHERE role_type_code = '<mã công ty chủ>' AND valid_to_date IS NULL` — người kiểm đã thử trên SQLite tạm: dòng mở thứ hai bị chặn, dòng đã đóng vẫn chèn được;
     - cộng trigger cấm đóng vai này khi không có dòng mở thay thế trong cùng lô.
   - Có dòng sổ hàng rào và ngày thấy chặn (P16).
6. **Tách riêng khỏi phần còn lại của ADR-0024.** Dòng "Dữ liệu" của ADR-0024 (`:81`) gộp hồ sơ Tour Đảo với cột mốc trên `orders` (điều 3) và `v_ord_order_state`. Đề xuất này chỉ phát hành phần điều 6. Điều 1–5, 7… vẫn là proposed.

## 4. Điều kiện "không xây trên lỗ đang hở" (dòng 7 của ADR-0024) — kiểm lại 2026-09-27

| Chặn ghi ở ADR-0024 | Tình trạng |
|---|---|
| `money.view`, `contact.view` phải đã được máy chủ hỏi | ADR-0019 Phần B **đã lên production bản 1.18** (2026-09-27) |
| `DK-T3-01` (HIGH) | **đã vá**, lên production bản 1.14 (2026-09-26) |
| Sổ phát hiện mở | `docs/quyen-hoan.json` mục `phat_hien` **rỗng** (kiểm 2026-09-27) |

⇒ Không còn lỗ hở nào chặn điều 6.

## 5. Dữ liệu và thi công (cho phiên thi công; kế hoạch chốt chi tiết)

- **Migration chỉ-thêm** (số trống kế tiếp, kiểm mọi nhánh lúc thi công; ngày 27/9: 0025 và 0026 của nhánh Thông báo, 0027 của nhánh siết quyền ⇒ số trống là **0028**):
  - thêm mã vai "công ty chủ" vào `pty_role_type`, nhóm `OTHER`, không sinh quyền;
  - thêm hồ sơ Tour Đảo + `pty_organization` + điểm liên hệ, chép từ `company_profile`.
- **Luật "không gieo tên thật / SĐT bằng migration"** (`migrations/0020`:3, `0024`:4) nhắm dữ liệu cá nhân. Hotline công ty là thông tin công khai (đã in trên trang đăng nhập). Nếu người kiểm độc lập thấy luật vẫn áp, dùng runbook gieo — ADR-0024 `:81` đã cho phép.
- **`audit-invariants`:** đúng một hồ sơ mở vai "công ty chủ"; `GET /api/company` trả đúng dữ liệu hồ sơ đó.
- **Test hồi quy:**
  - Bán hàng sửa hồ sơ công ty chủ → 403;
  - Quản trị (không có `company.legal.write`) gán hoặc kết thúc vai "công ty chủ" → 403;
  - gán vai "công ty chủ" thứ hai → CSDL chặn;
  - `/api/auth/config` có tên + MST;
  - biên nhận vẫn in đúng.
- **Module:** `company` đọc qua `parties` ⇒ `ALLOWED_EDGES` thêm `company → parties`. Hoặc chuyển route `/api/company` vào `parties` — kế hoạch chọn, người kiểm độc lập xác nhận không vòng.
- **Việc lớn** (dữ liệu + quyền) ⇒ có người kiểm độc lập ở cuối.

## 6. Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng `pty_party` chứa những loại thực thể nào sau khi áp? | người, tổ chức (khách, đại lý, nhân sự…) **+ đúng một "công ty chủ"** (mới) |
| Dòng bản đồ quyền nào chạm bảng này áp cho loại mới? | `party.write` (Bán hàng, Kế toán `any` với hồ sơ không gắn tài khoản) — **loại trừ** công ty chủ. `admin.manage` (gán/kết thúc vai nhóm OTHER) — **loại trừ** vai "công ty chủ". Sửa định danh, điểm liên hệ, vai của công ty chủ — **`company.legal.write`, chỉ SUPER_ADMIN** (ADR-0038 điều 7). Gộp hồ sơ (chưa có mã) — phải loại trừ khi xây. |
| Cổng nào canh? | Route `party.write`, `POST /api/parties/:id/roles`, `POST /api/parties/:id/roles/:rid/end`: kiểm vai "công ty chủ" trong thân route → 403 nếu thiếu `company.legal.write`. CSDL: chỉ mục duy nhất một phần (một vai mở) + trigger cấm đóng khi không có dòng thay. `GET /api/company`, `/api/auth/config`: công khai, chỉ đọc tên/MST/địa chỉ/hotline/email — **không** đọc gì khác của `parties`. |

## 7. Bị loại
- **(b)** Giữ `company_profile` làm nguồn, hồ sơ chỉ là khung: vẫn hai nơi ghi (H5). Chủ không chọn.
- **Xoá `company_profile` ngay:** trái expand–contract; `logo_url` chưa có chỗ.
