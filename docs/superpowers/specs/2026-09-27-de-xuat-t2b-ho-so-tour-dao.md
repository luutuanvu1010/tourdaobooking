# Đề xuất T2b — Tour Đảo là hồ sơ tổ chức, một nguồn cho tên / MST / địa chỉ

- **Ngày:** 2026-09-27.
- **Người soạn:** phiên điều phối.
- **Trạng thái:** **ĐỀ XUẤT — CHỜ CHỦ DUYỆT.** Nháp đặt ngoài `docs/adr/` để tránh hỏi quyền từng lần sửa. Chủ duyệt xong mới chép vào ADR-0024.
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
   - Trang đăng nhập: chân trang lấy tên + MST từ `GET /api/auth/config`, route công khai mà trang đã gọi sẵn. Thêm 2 trường vào đó, **không** thêm request. Chữ tĩnh trong `login.html` chỉ là lớp dự phòng khi mạng lỗi, và có bài kiểm so khớp với dữ liệu gieo.
3. **Giới hạn phạm vi (nói rõ):**
   - `company_profile` **không bị xoá** ở lượt này. Các cột pháp lý thôi được đọc; `logo_url` (thương hiệu, không phải định danh) còn ở lại.
   - Việc thu hồi hẳn làm theo expand–contract ở một lần phát hành sau (CLAUDE.md §7).
4. **Ai được sửa hồ sơ công ty chủ:** trỏ tới ô quyền mà **ADR-0038** (phiên siết quyền Quản trị, đang soạn) định cho "sửa định danh pháp lý Tour Đảo".
   - Khuyến nghị: **chỉ Toàn quyền**.
   - Nếu ADR-0038 chưa duyệt khi T2b phát hành: tạm "chỉ SUPER_ADMIN, chờ ADR-0038".
   - Mọi route ghi hồ sơ khác (`party.write`, gộp hồ sơ) từ chối hồ sơ này.
5. **Tách riêng khỏi phần còn lại của ADR-0024.** Dòng "Dữ liệu" của ADR-0024 (`:81`) gộp hồ sơ Tour Đảo với cột mốc trên `orders` (điều 3) và `v_ord_order_state`. Đề xuất này chỉ phát hành phần điều 6. Điều 1–5, 7… vẫn là proposed.

## 4. Điều kiện "không xây trên lỗ đang hở" (dòng 7 của ADR-0024) — kiểm lại 2026-09-27

| Chặn ghi ở ADR-0024 | Tình trạng |
|---|---|
| `money.view`, `contact.view` phải đã được máy chủ hỏi | ADR-0019 Phần B **đã lên production bản 1.18** (2026-09-27) |
| `DK-T3-01` (HIGH) | **đã vá**, lên production bản 1.14 (2026-09-26) |
| Sổ phát hiện mở | `docs/quyen-hoan.json` mục `phat_hien` **rỗng** (kiểm 2026-09-27) |

⇒ Không còn lỗ hở nào chặn điều 6.

## 5. Dữ liệu và thi công (cho phiên thi công; kế hoạch chốt chi tiết)

- **Migration chỉ-thêm (số trống kế tiếp, kiểm mọi nhánh; 0026 đã có chủ):**
  - thêm mã vai "công ty chủ" vào `pty_role_type`, nhóm `OTHER`, không sinh quyền;
  - thêm hồ sơ Tour Đảo + `pty_organization` + điểm liên hệ, chép từ `company_profile`.
- **Luật "không gieo tên thật / SĐT bằng migration"** (`migrations/0020`:3, `0024`:4) nhắm dữ liệu cá nhân. Hotline công ty là thông tin công khai (đã in trên trang đăng nhập). Nếu người kiểm độc lập thấy luật vẫn áp, dùng runbook gieo — ADR-0024 `:81` đã cho phép.
- **`audit-invariants`:** đúng một hồ sơ mở vai "công ty chủ"; `GET /api/company` trả đúng dữ liệu hồ sơ đó.
- **Test hồi quy:**
  - Bán hàng sửa hoặc gộp hồ sơ công ty chủ → 403;
  - `/api/auth/config` có tên + MST;
  - biên nhận vẫn in đúng.
- **Module:** `company` đọc qua `parties` ⇒ `ALLOWED_EDGES` thêm `company → parties`. Hoặc chuyển route `/api/company` vào `parties` — kế hoạch chọn, người kiểm độc lập xác nhận không vòng.
- **Việc lớn** (dữ liệu + quyền) ⇒ có người kiểm độc lập ở cuối.

## 6. Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng `pty_party` chứa những loại thực thể nào sau khi áp? | người, tổ chức (khách, đại lý, nhân sự…) **+ đúng một "công ty chủ"** (mới) |
| Dòng bản đồ quyền nào chạm bảng này áp cho loại mới? | `party.write` (Bán hàng, Kế toán `any` với hồ sơ không gắn tài khoản) — **loại trừ** công ty chủ; gộp hồ sơ — loại trừ; sửa công ty chủ — ô của ADR-0038 (tạm chỉ SUPER_ADMIN) |
| Cổng nào canh? | route `party.write`, gộp hồ sơ: kiểm vai "công ty chủ" trong thân route → 403; `GET /api/company`, `/api/auth/config`: công khai, chỉ đọc tên/MST/địa chỉ/hotline/email — **không** đọc gì khác của `parties` |

## 7. Bị loại
- **(b)** Giữ `company_profile` làm nguồn, hồ sơ chỉ là khung: vẫn hai nơi ghi (H5). Chủ không chọn.
- **Xoá `company_profile` ngay:** trái expand–contract; `logo_url` chưa có chỗ.
