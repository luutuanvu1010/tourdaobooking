# Đề xuất ADR — Kế toán tìm được đối tác theo tên ở trang Hoa hồng (nới cổng `GET /api/pricing/nguoi-huong`)

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (N3). **Số ADR cấp lúc duyệt**: ngày 25/10 số lớn nhất ở mọi nhánh là 0139, còn nhãn tạm 0140/0141 đã có bản nháp khác dùng (`2026-10-24-de-xuat-adr-dai-ly-to-chuc-nhieu-nhan-vien.md`), nên bản này không mang nhãn số.

- **Ngày:** 2026-10-25. **Nguồn lời chủ:** `BAN-GIAO.md` mục 3 dòng ba — chủ bấm chọn «mở đường tìm đối tác theo tên cho người có quyền đặt mức» (25/10), rồi «ok duyệt» cả bản bàn giao trong đó có lựa chọn (a) «nới chứ không thay».
- **Loại:** việc lớn (quyền). **Cửa:** hai chiều — chỉ đổi mã, không dữ liệu; hoàn tác bằng `wrangler rollback` hoặc một commit đảo.
- **Quan hệ với ADR cũ:** bổ sung ADR-0077 (sổ đại lý đợt 1; bảng mức hoa hồng) ở chỗ ai tra được người hưởng; thay «Ruling 26» của sổ thi công sổ đại lý đợt 1 (Kế toán chỉ chọn «Loại đối tác» vì không có `order.create`). Không đổi `src/shared/permissions.ts`, không thêm ô quyền.
- **Xây cạnh lỗ đang hở:** `docs/quyen-hoan.json` 25/10 có sáu mục HIGH đang mở, không mục nào ở bảng mức hoa hồng hay đường tìm người hưởng. HC-4.2 và TNV-G4 ở vùng sổ tiền — đề xuất này không chạm đường ghi sổ.

## 1. Vấn đề

Ô «Một đối tác» và ô «Tra nhanh» ở trang Hoa hồng gọi `GET /api/pricing/nguoi-huong?q=` để tìm tên. Route gác bằng `can(staff, "order.create") && !holdsPartner(staff)`. Kế toán giữ `partner.commission.write` (đặt mức) nhưng **không** giữ `order.create`, nên người đặt mức lại không tìm được đối tác để đặt mức riêng hoặc tra mức. Route này cũng nuôi ô «Đặt qua đối tác» của form lập đơn (Bán hàng, Thực tập, Quản trị, Toàn quyền), nên không thể *thay* cổng sang quyền đặt mức mà không làm Bán hàng và Thực tập mất ô đó.

## 2. Quyết định đề xuất

**Đ1 — Cổng mới của route (nới):** `(can(order.create) || can(partner.commission.write)) && !holdsPartner`. Viết thành **một** hàm dùng chung ở `src/shared/` (tên gợi ý `coTraNguoiHuong`), máy chủ và trang Hoa hồng cùng gọi, để hai bên không lệch.

| Quyền | Hôm nay | Sau |
|---|---|---|
| Bán hàng, Thực tập, Quản trị, Toàn quyền | tìm được | tìm được (không đổi) |
| **Kế toán** | 403 | **tìm được** |
| Đối tác, tài khoản lai có quyền Đối tác | 403 | 403 (không đổi) |
| HDV, Tài xế, Tài xế đối tác, Nhân sự | 403 | 403 (không đổi) |

`access` của route giữ `"orders"` — cổng đó đã gồm Kế toán.

**Đ2 — Ô «Đặt qua đối tác» của form đơn KHÔNG đổi.** `coODatQuaDoiTac` (`src/shared/phan-doi-tac-hien-thi.ts`) giữ nguyên `order.create && !holdsPartner`. Hàm này quyết định ô có hiện trên form lập đơn **và trang chi tiết đơn** (`web/order.ts`) hay không; Kế toán mở được trang đơn, nên nếu gộp hàm với cổng mới thì Kế toán sẽ thấy ô đổi bên đặt trên đơn — ngoài ý chủ. **Lệch có lý do so với bàn giao 5.1** (bàn giao bảo gom hai bản sao về một hàm): bản sao *của cổng route* là `coTheTimDoiTac` (trang Hoa hồng) — hàm này gọi hàm dùng chung ở Đ1; còn `coODatQuaDoiTac` là cổng *của một ô trên form*, nghĩa khác, giữ riêng.

## 3. Kế toán thấy thêm gì

Tên hiển thị và loại hồ sơ (cá nhân / tổ chức) của bên được hưởng hoa hồng khớp chữ gõ, tối đa 20 dòng mỗi lần. Kế toán **đã** xem được mọi hồ sơ khách/đại lý qua `party.view` (ô `any`), nên không lộ thêm dữ liệu; chỉ thêm một lối tra gọn. Không trả SĐT, email, MST.

## 4. Trang ghép

Xem `TRANG-GHEP.md` cùng thư mục (lượt duyệt này có ba quyết định).

## 5. Tiêu chí nghiệm thu (viết trước khi làm)

1. Kế toán gọi `GET /api/pricing/nguoi-huong?q=<tên>` → 200 kèm kết quả; tài khoản Đối tác và tài khoản lai → 403; HDV, Tài xế, Nhân sự → 403 (bài hành vi trong `src/so-dai-ly-quyen-route.test.ts` hoặc e2e).
2. Bán hàng và Thực tập vẫn dùng được ô «Đặt qua đối tác» trên form đơn (kịch bản form đơn xanh).
3. Kế toán mở trang chi tiết đơn và form sửa đơn: **không** thấy ô «Đặt qua đối tác» (bài thuần cho `coODatQuaDoiTac` với quyền ACCOUNTING = false).
4. Máy chủ và trang Hoa hồng dùng cùng một hàm cổng (bài thuần: `coTheTimDoiTac` cho đúng bảng ở Đ1 với cả mười quyền đứng một mình và các tổ hợp lai có PARTNER).
5. Sửa cố ý hàm cổng (bỏ vế `partner.commission.write`) → bài 1 và bài 4 đỏ → hoàn nguyên (P16).
6. Sửa `docs/SYSTEM-DESIGN.md` §9 dòng /hoa-hong (bỏ câu «route đó hỏi `order.create`, Kế toán chưa có… Ruling 26») và dòng route `nguoi-huong` ở §7.
