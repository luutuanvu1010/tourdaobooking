# Nhật ký thi công ADR-0219 (18/11/2026)

> Hồ sơ có ngày. Chủ dự án duyệt ADR-0219 cùng ngày (chat, nguyên văn «Duyệt ADR-0219, thi công luôn đi»); câu cho phép xây trên HC-5.19 người chép hiểu là gồm trong lời duyệt (ghi ở ADR và `docs/quyen-hoan.json` mục `xay_tren_cho_phep_adr_0219`).

## Đã làm

- **Bản đồ quyền** (`src/shared/permissions.ts`): ba ô mới `registration.verify`, `registration.verify.attachment` (Quản lý bán hàng, Toàn quyền — hàm `xacMinhDangKy`, không dùng `quanLyBanHang()`), `registration.approve` (Quản trị, Nhân sự, Toàn quyền — `quanTriNhanSu()`); `registration.queue.view` thêm Quản lý bán hàng. `party.verify*`, `account.create` giữ nguyên giá trị. Tên cho Trợ lý ở `tro-ly-cau-truc-ten.ts`.
- **Route** (`src/modules/dang-ky/index.ts`): bảy route xác minh sang cổng `office` + `registration.verify` VÀ `party.view` (+ `registration.verify.attachment` cho xem số, mở ảnh); năm route duyệt giữ cổng `accounts`, hỏi `registration.approve`; hàng chờ và gửi lại thư sang cổng `staff` + `registration.queue.view`. Lọc hàng chờ (`xemHangCho`) và ô theo bước của gửi lại thư (`thu-bao.ts`) theo ô mới. Lô duyệt không đổi.
- **Giao diện**: trang mới `/phieu-dang-ky` (`public/phieu-dang-ky.html`, `web/phieu-dang-ky.ts`; khai `PAGES`, `build:web`, `TRANG`/`THANH_BEN`/`TRANG_TOI`, đường gọi chính) dựng khối chỗ mở, đóng đăng ký (Toàn quyền) và hàng chờ. Trang Quản lý tài khoản bỏ hai khối, giữ lối sang. `web/dang-ky-hang-cho.ts` hỏi ô mới. Bản sửa nút Duyệt 18/11 (lần lưu 9e08a1614) đi cùng lần phát hành.
- **Giả định bề mặt (đảo ngược được)**: khối «Nhận đăng ký mới» của Toàn quyền chuyển cùng hàng chờ sang trang mới (hai khối vốn đặt liền nhau); tên trang và tên mục điều hướng «Phiếu đăng ký đối tác» lấy theo mục «Người dùng sẽ thấy» của ADR.
- **Hàng rào** (Hiến pháp 9.4, đổi theo ADR): `src/route-write-guard.test.ts` — `ACCOUNTS_OPS` bỏ `registration.queue.view`, thêm `registration.approve`; bài mới «ADR-0219» với danh sách có tên `DK_XAC_MINH`, `DK_STAFF`. Quan sát chặn thật 18/11: ba lần phá (bỏ `party.view` ở `dat`; đổi ô hàng chờ; trả `bo-sung` về cổng accounts) đều đỏ, đã hoàn nguyên. Dòng ở `docs/SO-HANG-RAO.md` ghi lại. `src/route-access.test.ts` cập nhật ảnh chụp cổng.
- **Nới có ghi lý do**: trần gói trang Đơn hàng (`src/goi-trang-nhe.test.ts`) 115.064 → 115.538 (đo 115.438, +374: ba ô quyền + trang mới trong điều hướng). Đây là nới hàng rào, cần chủ biết.
- **Bài kiểm**: ghim từng ô và bài trên 2048 tập con quyền (`permissions.test.ts`); cột Quản lý bán hàng (`quan-ly-ban-hang.test.ts`), Nhân sự, Tài xế, Tài xế đối tác, Đối tác. Bài route của dang-ky đổi người xác minh sang Quản lý bán hàng; thêm ca Quản trị duyệt được nhưng vẫn không tạo tài khoản, ca Nhân sự + Bán hàng không xác minh được, ca Quản lý bán hàng kiêm Quản trị bị trigger chặn tự duyệt, ca lính gác đ5 áp cho Quản trị đã duyệt (`duyet-route.test.ts` (12b)). E2E `tests/e2e/dang-ky.mjs` và ba kịch bản Chrome đăng ký sửa theo vai và trang mới (`dang-ky-smoke.mjs` sửa luôn chỗ đỏ sẵn ở bước 0b).
- **Tài liệu mô tả**: `docs/SYSTEM-DESIGN.md` (route nội bộ dang-ky), `docs/CHANGE-GUIDE.md` (công thức đăng ký), bảng tham chiếu (tên màn hình, câu ai bấm) sinh lại. Nhật ký thay đổi 3.18 (số tạm).

- **Sau lần chạy trọn bộ đầu tiên** (6 bài đỏ, đều do việc này): khai hai route cổng staff mới ở `BANG_STAFF` (`src/tai-xe-cong.test.ts`, cả hai mã tài xế ⇒ 403); thêm `phieuDangKy` vào danh sách trang của `src/muc-giao-dien-menu-moi.test.ts`; nhãn «Phiếu đăng ký đối tác» vào hướng dẫn Nhân sự và Quản lý bán hàng (hướng dẫn Quản trị đã sát trần 30 phút đọc nên không thêm); mô tả ô `registration.approve` cho Trợ lý bỏ chữ «mã PIN» để số đo khớp mạnh của bài `tro-ly-van-nghia.test.ts` không đổi (không sửa số của bài).

## Chưa làm / để chủ quyết

- `web/CLAUDE.md` (tệp luật, AI không tự sửa): bảng «sửa tệp nào chạy kịch bản nào» chưa có dòng cho `web/phieu-dang-ky.ts`; đề xuất thêm vào dòng «Đăng ký đối tác».
