# Đặc tả — Tự chọn nút thanh dưới điện thoại (ADR-0187 Đ2.3)

- **Ngày:** 2026-11-09. **Nguồn:** ADR-0187 (accepted 8/11) Đ2.3, Đ4, Trang ghép, bảng «đổi gì kéo gì»; Hiến chương 5.28.
- **Loại:** việc lớn (ô quyền mới, bảng mới). Kiểm độc lập trước khi báo đạt.
- **Không xây trên lỗ đang hở nào** (`docs/quyen-hoan.json` không có mục chạm thanh dưới / trang Tôi).

## 1. Vấn đề
Thanh dưới điện thoại có 5 chỗ, máy tự xếp theo `THANH_TAB` (`src/shared/muc-giao-dien.ts`). Người kiêm Bán hàng + Kế toán mất nút «Sổ công nợ» vì dòng đó có điều kiện `!can(s, "order.create")`. ADR-0187 chốt: người dùng tự chọn nút, lưu ở máy chủ theo tài khoản.

## 2. Quyết định đã chốt (không hỏi lại)
| # | Điều | Nguồn |
|---|---|---|
| 1 | Lưu ở máy chủ, bảng nhỏ của module `staff` (tiền tố `stf_`), đổi máy vẫn còn | ADR Đ2.3 |
| 2 | Tối đa 5 nút; «Tôi» luôn có, đứng cuối, tính trong 5 ⇒ người dùng chọn **tối đa 4** trang | giao việc |
| 3 | Chỉ chọn được trang mình mở được; máy chủ kiểm bằng **cùng một hàm** với giao diện | ADR Trang ghép mục 3 |
| 4 | Quyền đổi làm trang đã chọn không còn mở được ⇒ thanh dưới bỏ nút đó lúc vẽ, không lỗi | giao việc |
| 5 | Chưa chọn gì / bấm «Về mặc định» ⇒ máy xếp như hôm nay (`thanhTab()` giữ nguyên) | ADR Đ2.3, Đ4 |
| 6 | Ô quyền mới `me.favorites.write`, phạm vi `own`, mọi mã quyền trừ `DRIVER_PARTNER`; Toàn quyền `any` (ADR-0014 điều 2) | ADR Trang ghép mục 2; chủ 8/11 |
| 7 | Đang «Xem như vai trò khác»: thanh dưới dùng mặc định của vai đang xem, không đổi được | giao việc |
| 8 | Không thêm trường vào bản nhớ khung tạm (ADR-0035): khung tạm vẽ mặc định, khung thật vẽ nút đã chọn | giao việc |

## 3. Chữ giao diện (chủ chọn 9/11 trong hộp hỏi — có thể là phương án khuyến nghị tự chọn khi hết giờ)
- Tên mục ở trang Tôi: **«Nút thanh dưới»**. Nút lưu: **«Lưu»** (chữ dùng chung đã có trong Bảng tham chiếu). Nút trả về: **«Về mặc định»**.
- Nhãn nhật ký: **«Đổi nút thanh dưới»**.
- Phạm vi: chỉ **các trang đã có dòng ở `THANH_TAB`** (có biểu tượng sẵn): Trang chủ, Đơn hàng, Tạo đơn, Tài khoản, Sổ công nợ, Danh bạ, Thiết lập, Cuốc của tôi, Báo bận, Hỗ trợ (trang Trang chủ của tài xế cùng tên «Trang chủ»). Nhãn và biểu tượng lấy từ dòng `THANH_TAB`; **bỏ qua `chiKhi` của dòng** (chính `chiKhi` làm mất «Sổ công nợ»).
- Câu báo lỗi của máy chủ (AI soạn, bề mặt đổi được — P8, ghi lại): «Bạn không mở được trang này nên không đặt lên thanh dưới được.», «Chọn tối đa 4 trang (nút Tôi luôn có).», «Đang xem như vai trò khác nên không đổi nút thanh dưới được.»

## 4. Thiết kế
- **Hàm chung** `ghimDuoc(k, s)` ở `muc-giao-dien.ts` = `k` có dòng `THANH_TAB`, khác `toi`, `TRANG[k].hien(s) && moTrang(k, s)`. (`moTrang` một mình trả đúng cho mọi trang không khai `moTrang`, nên không đủ.) Máy chủ, danh sách chọn ở trang Tôi và bộ lọc lúc vẽ cùng gọi hàm này.
- **`thanhTab(n, ghim?)`**: `ghim` rỗng/không có ⇒ như cũ. Có ⇒ các trang `ghimDuoc` theo thứ tự đã chọn (tối đa 4) + «Tôi»; lọc xong rỗng ⇒ mặc định.
- **`ghimHieuLuc(staff)`**: `staff.actingRole` có ⇒ null; không có ô `me.favorites.write` ⇒ null; còn lại danh sách đã lưu. Khung (`web/shell.ts`) gọi `thanhTab({ staff }, ghimHieuLuc(staff))`.
- **Bảng** `stf_thanh_duoi` (migration `0153`): `staff_id` khoá chính → `staff(id)`, `trang` TEXT NULL (khoá trang cách nhau dấu phẩy, giữ thứ tự), `updated_at`. Một dòng mỗi tài khoản, ghi đè tại chỗ (đây là sở thích hiển thị, lịch sử nằm ở nhật ký); «Về mặc định» đặt `trang` = NULL, không xoá dòng.
- **Đọc**: thêm một cột con vào câu đọc nhân viên chạy ở mọi request (`find_by_id`), nên `GET /api/auth/me` vẫn đúng 3 câu đọc (bài `nen-moi-yeu-cau.test.ts` không đổi). `currentStaff` bỏ trường khi đang đóng vai.
- **Ghi**: `PUT /api/account/thanh-duoi` (module `accounts`, cổng `staff`, thân `{ trang: string[] }`), thứ tự kiểm: đang đóng vai → 403 → `can(me.favorites.write, own)` → 403 → thân hỏng / quá 4 / trùng → 400 → từng trang `ghimDuoc` → 403. Một lô: nhật ký `bottom_tabs_changed` (detail = các khoá trang, không dữ liệu cá nhân) rồi câu ghi. Trả `{ trang: string[] }`. Mảng rỗng = «Về mặc định».
- **Trang Tôi** (`web/account.ts`, chỉ điện thoại): mục «Nút thanh dưới» hiện khi `can(staff, "me.favorites.write")` và không đóng vai; danh sách ô chọn các trang `ghimDuoc`, đếm tối đa 4; «Lưu», «Về mặc định»; lưu xong tải lại trang để khung vẽ lại.

## 5. Tiêu chí nghiệm thu (kiểm được)
1. Bán hàng + Kế toán chọn «Sổ công nợ» ⇒ `thanhTab` có nút «Sổ công nợ» (bài thuần) và ảnh 375 px thật cho thấy nút đó.
2. Bán hàng gửi `nhatKy` hoặc `soCongNo` (trang không khai `moTrang`) ⇒ 403 câu tiếng Việt; dữ liệu không đổi (e2e).
3. Tài xế đối tác gọi PUT ⇒ 403 (e2e); bản đồ quyền ô `DRIVER_PARTNER` = `none` (bài ghim từng ô).
4. Toàn quyền đang xem như Bán hàng gọi PUT ⇒ 403; `/me` lúc đó không mang nút đã chọn (e2e).
5. Quá 4 trang, trùng trang, khoá lạ, có `toi` ⇒ 400 (e2e + bài thuần).
6. Gửi `[]` ⇒ `/me` không còn nút đã chọn, thanh dưới về như cũ.
7. Đã chọn «Sổ công nợ» rồi bị bỏ Kế toán ⇒ thanh dưới không có nút đó, không lỗi (bài thuần).
8. `GET /api/auth/me` vẫn 3 câu đọc; `npm test`, `npm run typecheck` xanh; trần gói đo lại (`goi-trang-nhe.test.ts`).

## 6. Ngoài phạm vi
Thanh bên máy tính; Trang chủ theo khối (Đ2.2); mở thêm trang chưa có biểu tượng (chủ chọn giữ 11 trang).
