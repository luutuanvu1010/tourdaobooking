# Nhật ký thi công Đợt 1 — sửa nhỏ sau rà soát lần 2

Kế hoạch: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt 2026-11-09), Phần IV. Nhánh `claude/dot-1-sua-nho-498d1f`, cắt từ nhánh tài liệu chứa kế hoạch (đã chứa `main` `fa3fd859a`). Không migration; số phiên bản tạm **2.83** (main đã có 2.81 vé Tour Đảo và 2.82 nút thanh dưới; đánh lại ngày 9/11 khi gộp main lần hai).

## Các task và commit

| Task | Việc | Ghi chú thi công |
|---|---|---|
| 1.1 | V-01 câu lỗi hệ thống kèm mã | `cauLoiHeThong(ma)` ở `trang-thai-he-thong-chu.ts`; bài router đỏ → xanh |
| 1.2 | G-02 chặn Gửi đơn khi chưa chọn Đón/Không đón | Giao diện thật của mã khác bản kế hoạch ở hai chỗ: luật thuần là `dichVuThieuChonDon` (dùng `thieuChonDon` + `chonDonTheoNhom` đã có, kiểu `"DON" \| "KHONG_DON"`); `nhanDuaDonTrangDon` đặt ở `dong-gap-the.ts` như kế hoạch. Thêm `danhDauThieuChon` cho khối Đưa đón (viền lỗi, `aria-invalid`, dòng lỗi nối `aria-describedby`). Kịch bản Đối tác lập đơn: bước mới `2b2`, các bước 2c và 3 bấm «Không đón» trước khi gửi |
| 1.3 | G-04 Quản lý bán hàng có ô Dịch vụ & giá trên điện thoại | `khoaCoTab(who)` thay `KHOA_CO_TAB` (đổi tên thành danh sách ứng viên, không export); hỏi đúng `thanhTab` + nhóm THIẾT LẬP. Bài bất biến «mọi ô chạm được» trên 2^11 tập quyền |
| 1.4 | G-06(h) hướng dẫn khớp menu | Bài `huong-dan-menu.test.ts` so tab, Đầu menu, Chân menu với bộ quyền đại diện tám nhóm. Sửa chữ bảy nhóm. Hai nhóm (Đối tác, Quản trị) sát trần 30 phút đọc của bài A4: đã cắt chữ thừa cho vừa, **không nới trần**; thêm chữ vào hai bài này phải cắt chỗ khác |
| 1.5 | N7a ẩn ô ghi chú gọn | Hai chỗ đặt `dongGhiChuGon.hidden` theo `coDuaDon() === false`; bài nối dây đếm đúng hai chỗ |
| 1.6 | N5 nút «Điền thông tin đối tác» | `hienNutDienDoiTac` theo công thức kế hoạch; hai nút bọc trong `.khach-dau-nut` để xuống dòng ở khổ hẹp; hai hàng mới ở bảng tham chiếu (việc quan trọng) |
| 1.7 | N4 Nhập lô vé dùng khung chọn dịch vụ | `createCatalogPicker` thêm `cheDo: "chon-mot"`, `khongYeuCauGia`, `khoaNho`, `onDoi`, `xoaChon`; luật thuần `chonDuocDichVu`, `timDichVuDaChon` ở `loc-danh-muc.ts` |
| 1.8 | «Trả trước» → «Thanh toán ngay» | Radio nhận chữ từ `NHAN_HINH_THUC` qua `data-nhan-hinh-thuc`; bài khoá cả hai phía (`doi-chu-thanh-toan-ngay.test.ts`); bảng tham chiếu thêm «Thanh toán ngay» và «Trả sau» (khái niệm) |
| 1.9 | Ba kịch bản Chrome đỏ sẵn | «Xem biên nhận» → «Xem ảnh gửi khách» (commit đổi tên 1c1e71603, 5/11); «Lưu đơn (chưa xác nhận)» → «Gửi đơn» cho Đối tác (ADR-0136) |
| mục nhật ký | `changelog.ts` 2.83 | Số tạm; bước A.0 đặt lại nếu nhánh khác nhập trước |

## Điều lệch hoặc đáng ghi

- Bài tự quét chữ nút trong kịch bản Chrome KHÔNG làm theo kế hoạch; ghi `docs/BACKLOG.md` (chủ xin việc đó thì mới làm).
- Trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`) không đổi và vẫn xanh.
- Tài khoản lai Bán hàng + Đối tác: luật nút «Điền thông tin đối tác» (theo kế hoạch) chỉ hỏi văn phòng + `party.view`, nhưng tài khoản này không có ô «Đặt qua đối tác» nên không bao giờ có đối tác đã chọn; nút không tới được. Bài ghi rõ.
- Nhóm hướng dẫn «Quản lý bán hàng» là nhóm kế thừa («giống Bán hàng»), không có dòng tab/menu riêng nên bài không đòi.

## Kiểm cuối

Xem mục «Kiểm cuối» ở cuối tệp (điền sau khi chạy `npm test`, `typecheck`, e2e, kịch bản Chrome).

## Kiểm cuối (mục điền sau khi chạy)

- `npm test`: thoát 0 (cả hai bước). `npm run typecheck`: 0 lỗi. e2e: 88/88.
- Soát độc lập (trợ lý chỉ đọc, đọc diff cả nhánh): ĐẠT, hai điểm thấp; điểm 1 (tiêu điểm nhóm Đón/Không đón) đã sửa.
- Kịch bản Chrome 390/1280 xanh trên phần đổi: doi-tac-lap-don (bước 2b2 và các bước gửi đơn), ql-ban-hang, ve-qr. Ảnh ở `docs/evidence/2026-11-09-dot-1/anh/`.
- Kịch bản còn đỏ sẵn đã đối chiếu bằng bản gốc (không do Đợt 1): ghi ở `docs/BACKLOG.md` mục 67.
- Chưa có ảnh riêng cho nút «Điền thông tin đối tác», ô ghi chú ẩn và lưới Trang chủ điện thoại của Quản lý bán hàng; ba chỗ này được khoá bằng bài máy.
- Chưa thử iPhone thật. Số phiên bản 2.83 là tạm.

## Gộp main lần hai (9/11, main 9445ac80d)

Main đã lên vé Tour Đảo 2.81 và nút thanh dưới 2.82 nên mục nhật ký của Đợt 1 đánh lại thành **2.83**. Xung đột chỉ ở `changelog.ts`, `app-info.test.ts`, `huong-dan-dau-van.ts` và `BANG-THAM-CHIEU.md` (sinh lại). Hai bài hướng dẫn «Kho vé điện tử» và «Cấp hạn mức trả sau» đọc lại, nội dung vẫn đúng, ghi dấu vân bản 2.83. Bộ kiểm đầy đủ chạy lại sau gộp (xem dòng dưới).
