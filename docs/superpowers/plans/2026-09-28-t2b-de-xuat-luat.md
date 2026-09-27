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

_(Các mục đề xuất sửa `docs/ARCHITECTURE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `CLAUDE.md` gốc: thêm ở Task 13.)_
