# Phụ lục C — Tiền, hoa hồng, sổ

> Mốc `483b3aa0`. Đọc mã + bài thử trên khung thử từ thư mục tạm. **Sổ đại lý đợt 1 hiện chỉ HIỂN THỊ hoa hồng, chưa ghi sổ tiền nào**; các lỗi hoa hồng dưới đây chưa thành tiền thật, sẽ thành tiền khi đợt 2 ghi hoa hồng vào sổ.

## Phát hiện

| Mã | Mức | Chuyện gì | Tái hiện (đã chạy trên khung thử) | Tệp | Xử lý |
|---|---|---|---|---|---|
| C-1 | Medium | Mức hoa hồng "đ/khách" lớn hơn giá dòng vẫn được nhận; hoa hồng vượt thành tiền, "giá đại lý" âm. Trần chỉ là 100.000.000đ/khách. Mức theo phần trăm đã kẹp 0–100% nên không bị. | Kế toán `POST /api/pricing/hoa-hong` {vai TRAVEL_AGENCY, ALL, PER_PAX, moiKhach 300000} → 201. Đơn đại lý 1 khách, dịch vụ 200.000, Bán hàng xác nhận → `GET /api/orders/:id/thuong-mai` trả hoaHong 300000, giaDaiLy −100000. | `src/shared/so-dai-ly-nhap.ts:15`; `pricing/rules.ts` (`kiemThanMuc`); `shared/hoa-hong-dong.ts:12` | Chặn/cảnh báo khi đ/khách > đơn giá danh mục, hoặc kẹp hoa hồng ≤ thành tiền (cần chủ quyết). Trước đợt 2. |
| C-2 | Medium | Trần điều chỉnh sổ (ADR-0092 Đ5b) chỉ tính từng lệnh, không cộng dồn. Cùng phiên, một lệnh điều chỉnh 300.000 xoá sạch nợ giữ hộ của nhân viên mà không nhận tiền; không người duyệt thứ hai (HC-4.2 đã biết). | Đơn phải thu 500.000, đã thu 300.000. Kế toán gửi hai lần `POST /api/ledger/adjustments` {tăng nợ 500.000} → 201, 201; số dư nhân viên với công ty = 1.000.000. | `billing/rules.ts` (`kiemDieuChinh`); `billing/service.ts` nhánh `dieu_chinh` | Cộng dồn điều chỉnh cùng chiều trong phép so trần. Nhỏ. |
| C-3 | Low | Chữ "CHƯA lên production" trong sổ hoãn đã cũ; TNV-G1/G3/G4/HC-4.2 hạn 31/10 nhưng mã vá đã có. | Đọc `docs/quyen-hoan.json` với migration 0078–0088. | `docs/quyen-hoan.json` | Cập nhật chữ; quyết xoá hay gia hạn. |

## Trạng thái mục đã biết (vùng C)

- K-A-1 **đã vá** (`architecture.test.ts:79-80` có `coc-repo.ts`, `thay-lan-thu-repo.ts`). K-A-3 **đã vá** (`src/hoa-hong-mot-nguon.test.ts`; tệp ghi rõ các khe còn hở: `/100`, bí danh, hằng đặt tên khác). K-C-01 phần phải thu **đã vào mã** (`effectiveMoney` kẹp ≥ 0, `money-adjustment.ts:246`; CHECK `due_snapshot >= 0` ở `0045:103`); phần đại lý đợt 2 chưa làm. K-C-03 **còn hở** (`ky_period_close` chỉ-thêm, không có route mở khoá, chưa diễn tập khôi phục).
- **K-A-2 còn hở** — đếm từ JSON ca vàng: don-huy-coc 13/13 chờ xác nhận; so-cong-no-luot-1 6/6 chờ; so-cong-no-luot-2 6/6 chờ (cộng 25 ca, trùng con số kiểm toán 12/10); hoan-tat 5 chờ/2 xác nhận; sua-so-khach 6 chờ/5 xác nhận; van-chuyen-chi-phi 22/22 xác nhận (chỉ đọc trường JSON, không kiểm được người thật). Bài so-vang lớp 2 chỉ chạy ca đã xác nhận; ca chờ → `todo` (không tính đạt); `npm test` hôm nay báo 9 bài ở trạng thái chờ, tôi chưa đối chiếu từng bài với ca vàng. README thư mục golden còn ghi CPX/SK "chờ" trong khi JSON đã xác nhận: Low, tài liệu lệch.
- TNV-G1: mã đã vá (còn lại = 0 cho đơn huỷ, cọc mặc định giữ, duyệt/chi khác người; migration 0078–0079). Còn mở: 13 ca vàng, dữ liệu cũ QH5, tin báo.
- TNV-G3: mã đã vá (Thay lần thu, trigger `bil_receipt_after_delivered`, I1 chặn Hoàn thành; 0083). Còn mở: ADR-0088 đ9 — hoàn tiền sau Đã giao hiện **bị chặn hoàn toàn** ("chưa có mã"), chưa có đường nào trong hệ thống.
- TNV-G4: mã đã vá (`kiemQuyetToan`, `kiemHoanNguoiGiu`, `kiemDaoLanThu`, mã giao dịch 0088). Còn mở: tin báo Đ5d, cảnh báo trùng Đ6a.
- HC-4.2: **còn hở** (xem C-2).

## Đã kiểm, sạch (kèm cách kiểm)

- **Một công thức tiền**: phải thu một hàm (`money-adjustment.ts`, `hoan-tat.ts`, `phai-thu-mot-ham.test.ts`); web chỉ xem trước (`service-form.ts:411` nằm trong danh sách cho phép). Hoa hồng/giá vốn một tệp `hoa-hong-dong.ts`, làm tròn nửa lên bằng số nguyên; tối đa 2·10000·1e10 = 2e14 < `MAX_SAFE_INTEGER`.
- **Khoá tháng**: ép ở 4 bảng có `occurred_date` (trigger 0090) và ở mã (`ngayPhatSinh`, `layKyDaKhoa`); Cron chỉ đồng bộ danh mục (`src/index.ts:219`), không ghi tiền. Theo ADR-0080 đ3, phía đơn (sửa số khách, ghi mức tay) không bị khoá tháng — thiết kế.
- **Đối tác thấy hoa hồng của chính mình**: `cheDoThuongMai` 404 với đơn người khác; DTO hẹp dựng bằng danh sách trắng, không giá vốn/tỷ lệ/nhà cung cấp.
- **Biên nhận/QR**: `order.view` → `money.view` → mới đọc tiền; QR kiểm số tiền ≤ còn lại.
- **Sổ billing chỉ thêm** (xem phụ lục B).
