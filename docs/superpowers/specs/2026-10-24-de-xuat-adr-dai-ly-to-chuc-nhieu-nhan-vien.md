# Đề xuất ADR (số tạm 0140) — Đại lý là tổ chức, nhiều nhân viên cùng lập và xem đơn của tổ chức

> **Bản nháp — LƯỢT DUYỆT 2** (không chung lượt với 0138, 0139 vì trần 3 quyết định chạm quyền/dữ liệu một lượt). Chưa chuyển vào `docs/adr/`.
> Nguồn: góp ý YC-0017 (20/10) «Đại lý thuộc tổ chức: nhiều nhân viên nhập đơn cho tổ chức». Kế hoạch `2026-10-24-phan-tich-gop-y-ho-tro-ke-hoach.md` mục 8 (Q4).
> **Đây đúng là ADR mà ADR-0014 điều 5 đã hẹn:** «ngưỡng để thêm phạm vi theo tổ chức = khi có ≥ 2 tài khoản cùng một tổ chức đối tác cần thấy chung một tập đơn … viết ADR kế tiếp quyết cả mô hình tổ chức lẫn cơ chế bật/tắt». Góp ý YC-0017 là dấu hiệu ngưỡng đã tới — **chủ xác nhận có ca dùng thật** (đại lý nào, mấy người) trước khi duyệt.
> Việc lớn (quyền, dữ liệu, tiền gián tiếp qua hoa hồng/công nợ đại lý). Xây trên lỗ đang hở: chưa rà.

## 1. Hiện trạng (đọc mã 24/10)

- Tài khoản Đối tác (`PARTNER`) thấy đơn theo phạm vi **cá nhân**: `order.view` = `own`, `contact.view` = `ownOrAssigned` (`src/shared/permissions.ts`). Không có phạm vi theo tổ chức (`Scope` có năm giá trị `none/own/assigned/ownOrAssigned/any`).
- Bên đặt của đơn đối tác bị máy chủ ép là hồ sơ người hưởng của chính tài khoản (`nguoiHuongCuaHoSo`, Task 11 sổ đại lý); hoa hồng và công nợ ghi theo **hồ sơ người hưởng**.
- Quan hệ người–tổ chức đã có dạng dữ liệu (quan hệ «người liên hệ» giữa hồ sơ cá nhân và hồ sơ tổ chức, ADR-0001/0010) nhưng **không** là điều kiện cho phép (luật `src/CLAUDE.md`: vai hồ sơ không bao giờ là điều kiện cho phép).

## 2. Quyết định đề xuất

**D1 — Mô hình.** Mỗi nhân viên của đại lý có **tài khoản riêng** (khuyến nghị đã chốt Q4), gắn vào **một** hồ sơ tổ chức đại lý qua một bảng thành viên có hiệu lực theo ngày (khuôn `fbk_team_member`: mở/đóng, không xoá cứng), do Quản trị/Toàn quyền quản lý. Tư cách thành viên là **dữ liệu cho phép** mới — phải nói thẳng đây là lần đầu một quan hệ tổ chức mở quyền xem đơn, nên cần hàng rào riêng.

**D2 — Phạm vi xem.** Thêm giá trị phạm vi `org` («đơn của tổ chức mình») cho `order.view`, `contact.view` của cột `PARTNER`; đơn thuộc tổ chức = đơn có bên đặt là hồ sơ tổ chức đó. Lọc bằng SQL ở máy chủ (ADR-0014 điều 3). Hai đại lý khác nhau **không bao giờ** thấy đơn của nhau (bài «số lạ» kiểu toàn Nền tảng với hai tổ chức).

**D2b — Các ô quyền khác cùng bảng `orders` của cột `PARTNER`** (bài học F-01 «bảng này nay chứa ai»): trang ghép lượt 2 phải có bảng từng ô — `order.view` (own → own hoặc org), `contact.view` (ownOrAssigned: vế `assigned` giữ hay mở?), `order.create` (any, bên đặt bị ép), các ô sửa / huỷ / thu tiền của Đối tác (giữ `own` hay mở theo tổ chức?), `money.view`. Khuyến nghị: chỉ mở **xem**; sửa / huỷ / thu tiền giữ `own`.

**D2c — Bật / tắt lúc chạy.** ADR-0014 điều 5 (và dòng chốt kèm) đã hẹn ADR kế tiếp quyết **cả mô hình tổ chức lẫn cơ chế bật/tắt lúc chạy kèm nút bấm tuỳ chọn của Toàn quyền**. Khuyến nghị: bật theo **từng tổ chức** (mặc định tắt), Toàn quyền bật, có ngày hiệu lực.

**D3 — Hoa hồng và công nợ.** Hoa hồng/công nợ ghi cho **hồ sơ tổ chức** (bên đặt), không cho từng nhân viên; nhân viên chỉ là người lập. Màn đối tác tự xem sổ (ADR-0081, đã duyệt chưa dựng) phải đọc theo tổ chức khi có — thứ tự thi công: ADR này **sau** ADR-0081.

## 3. Câu cho chủ (gom một lần)

1. Đại lý nào cần, khoảng mấy người? (để xác nhận ngưỡng ADR-0014 điều 5)
2. Nhân viên đại lý A có thấy **tiền hoa hồng** của tổ chức không, hay chỉ người đứng đầu đại lý?
3. Ai quản lý danh sách nhân viên của đại lý: chỉ Quản trị/Toàn quyền, hay người đứng đầu đại lý tự thêm?

## 4. Tiêu chí nghiệm thu (sơ bộ)

Hai tài khoản cùng tổ chức thấy đơn của nhau; tài khoản tổ chức khác 404; rời tổ chức (đóng dòng thành viên) thì mất quyền xem ngay ở lần gọi sau; tài khoản lai (nội bộ + Đối tác) không được làm thành viên; nhật ký thêm/bớt thành viên không ghi SĐT.

## 5. Chưa kiểm

ADR-0010 điều 1 đã bị ADR-0014 điều 5 thay (ngưỡng nêu ở đầu); điều 5 còn bị ADR-0098 sửa (tra trùng hồ sơ theo SĐT) — người soạn bản chính đọc lại cả ba. Chưa đọc toàn văn ADR-0081; chưa đếm production có tổ chức nào nhiều tài khoản; chưa rà `quyen-hoan.json`.
