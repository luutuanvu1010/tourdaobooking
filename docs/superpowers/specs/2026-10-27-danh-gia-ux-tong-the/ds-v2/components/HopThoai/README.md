Hộp xác nhận **một chiều** thay `confirm()`: cùng khuôn `.sheet` với `role="alertdialog"`, không nút đóng; thân là vòng cảnh báo `.sheet-canh-bao` (44, `alertCircle` 24, `c-danger-text` trên `c-danger-soft`) + một câu hậu quả; chân `.sheet-foot-xac-nhan` — nút giữ nguyên + nút nguy hiểm (điện thoại xếp dọc, nút giữ dưới cùng; từ 641 hai đầu).

**Trong mã:** `web/bang-truot.ts` `hoiXacNhan({ tieuDe, hauQua, nhanNguyHiem, nhanGiu })` → `Promise<boolean>`; Esc / chạm nền / nút giữ → false.

## Khi nào dùng
Việc không hoàn tác được (huỷ đơn, xoá, khoá sổ). Việc hoàn tác được thì làm ngay và cho «Hoàn tác» trong toast.

## Lệch đã biết (nợ trong mã, chưa sửa)
Hai nút trong mã còn lớp cũ `btn` / `btn btn-danger` (không phải `.nut`); bản xem trước vẽ bằng `.nut[data-cap=phu]` và `.nut[data-cap=chinh][data-tong=nguy-hiem]` — BACKLOG `B-HOP-XAC-NHAN-NUT-CU`.
