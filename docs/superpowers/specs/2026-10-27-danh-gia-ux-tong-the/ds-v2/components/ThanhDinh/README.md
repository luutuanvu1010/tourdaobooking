Chân dính `.chan-dinh`: thanh **duy nhất** dính đáy trang con (biểu mẫu, chi tiết có việc), nền `c-surface`, kẻ trên `c-border`, đệm `le-trang` + vùng an toàn đáy, nút cao `h-control-lon` 52, `z-dinh`. Khi nó hiện, thanh tab dưới tự ẩn.

**Trong mã:** khối «Thành phần chung v2» của `public/app.css`; `web/shell.ts` `theoDoiThanhDinh` theo dõi `.chan-dinh, .form-actions, .vc-bottom-bar…` và gắn `body.tabbar-dinh` (ẩn `#tabbar`). Lớp cũ `.form-actions`, `.vc-bottom-bar`, `.vc-form-actions` nhận chung kiểu nhìn; chuyển hẳn sang `.chan-dinh` ở Chặng 3.

## Khi nào dùng
Một nút chính (Lưu chuyến) + một nút phụ (Quay lại) hoặc một việc kế. Đầu trang là thanh trên (ThanhTren, kiểu A — tiêu đề trên thanh).

## Đừng
Không thanh dính thứ hai; không để toast, khung Trợ lý nằm dưới chân dính.
