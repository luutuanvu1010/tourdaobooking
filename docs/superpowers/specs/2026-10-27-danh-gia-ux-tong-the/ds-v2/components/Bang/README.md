Bảng cột cho khổ ≥ 900: tiêu đề dính, số canh phải và đều cột, hành động theo dòng ở cột cuối, mỗi dòng cao `h-control` 44 (một mật độ — phụ A cổng 1). Thay thẻ ở máy tính cho mọi danh sách (H-DANH-SACH-BANG); ≤ 899 dùng DongDanhSach.

## Khi nào dùng
Đơn hàng, Danh bạ, Xe, Quản lý tài khoản, Nhật ký, Bảng kê… khi màn ≥ 900. Bọc trong `.cuon-ngang` để bảng rộng cuộn ngang **trong thẻ**, không tràn trang (C-AUDIT-TRAN). Chọn một dòng mở ngăn chi tiết bên phải (mẫu Sổ công nợ) cho Danh bạ, Hỗ trợ, Quản lý tài khoản.

## Cột
`th` chữ 13/600 `c-text-muted`, viết thường, dính đầu (`z-dinh`). `data-kieu="ma"` (mã đơn, không bẻ dòng), `data-kieu="so"` canh phải + chữ số đều cột cho tiền, số khách, ngày. `data-kieu="hanh-dong"` cột cuối, nút lối nhỏ 36 px, không tràn. Dòng phụ `.phu` 13 px dưới tên (mã, SĐT).

## Trạng thái
Bình thường · rê chuột dòng `c-soft-hover` · dòng đang chọn `c-selected-bg` · tiêu điểm vành trong dòng · đang tải 3 dòng khung xương cùng cột · rỗng: câu + một nút (TrangThaiRong trong thân bảng) · 50 dòng rồi «Tải thêm 50» (TaiThem).

## Người dùng truyền gì
Danh sách cột với kiểu; dữ liệu đã định dạng (tiền có dấu chấm, ngày dd/mm/yyyy, trạng thái là HuyHieu); hành động theo dòng tối đa 2 nút + «⋯».

## Đừng
Không bảng ở điện thoại; không kẻ dọc; không cột hành động bị cắt chữ (C-STAFF-BANG-1040); không in hoa tiêu đề cột.
