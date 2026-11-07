# Phụ lục 00 — Phạm vi, bản được rà, kết quả kiểm bằng máy

> Người viết: phiên điều phối (vai Giám đốc dự án), tự chạy mọi lệnh dưới đây. Hồ sơ có ngày 7/11/2026, đóng băng khi xong.

## 1. Bản được rà

| Mục | Giá trị | Cách kiểm |
|---|---|---|
| Giờ bắt đầu | 21:56 giờ Việt Nam, 7/11/2026 | `TZ=Asia/Ho_Chi_Minh date` |
| Bản đang chạy lúc bắt đầu | `version` 2.73 | GET công khai `https://booking.tourdao.vn/api/auth/config` (21:57, khoảng 22:12 và 22:54, cả ba lần 2.73, `maintenance.on` false; lần 22:54 còn thấy có khoá site Turnstile, có tên công ty và MST của công ty chủ — không chép số vào đây) |
| Commit của 2.73 | `41f63f04` | mục trạng thái của `docs/HANDOFF-N1.md`; `git show 41f63f04:src/shared/changelog.ts` mục đầu là 2.73; `41f63f04` là tổ tiên của `origin/main` |
| Bản được rà | `origin/main` ghim ở `5f641781` (đẩy lên 21:53) | `git fetch origin` rồi `git rev-parse origin/main` (22:00 và lại khoảng 22:12: không đổi) |
| Phần chênh `41f63f04..5f641781` trong `src web migrations` | chỉ «Xem như vai trò khác» (ADR-0180) + migration `0145_xem_nhu_vai.sql`, 34 tệp | `git log --stat 41f63f04..origin/main -- src web migrations` |

**Thay đổi giữa lúc rà:** lúc 22:04 chủ dự án đã triển khai đúng commit `5f641781` lên bản thật (Worker `0b880fc7…`, migration `0145` đã áp, điểm khôi phục Time Travel có ghi, điểm quay lại Worker `9a8d9923` = 2.73). Số bản vẫn hiện 2.73 vì quên mục nhật ký thay đổi (bước A.0); cổng phiên bản trước triển khai báo không đạt và chủ chọn tiếp tục. Nguồn: lần lưu `984bee7d` («Sổ phát hành: ghi lần triển khai 22:04 của ADR-0180…») trên `main` của máy, chưa có trên `origin/main` lúc khoảng 22:12; GET công khai sau đó vẫn `version` 2.73. Hệ quả cho đợt rà: **mã được rà chính là mã đang chạy trên bản thật**, nên không còn nhóm «đã nhập bản chính, chưa triển khai»; phát hiện ở phần ADR-0180 ghi «đang chạy từ 22:04 7/11». Đề bài coi «Xem như vai trò khác» là nhánh chưa nhập — giả định đó đã cũ từ 21:40.

**Thứ tự hai migration mới:** `0146` (tạo lại trigger `orders_delivered_lock`) áp trên bản thật lúc 19:38, `0145` (thêm cột `acting_role` cho `aut_session` và `audit_log`) áp sau lúc 22:04. Hai tệp chạm hai nhóm bảng khác nhau và không tham chiếu nhau, nên áp ngược thứ tự số không gây hỏng. Đã đọc cả hai tệp.

## 2. Phiên trùng việc

`git branch -a | grep -i -E "ra-soat|launch|giam-doc|danh-gia"`, `git worktree list`, danh sách phiên đang chạy: không có phiên nào khác đang rà trước ngày dùng thật. Các phiên đang chạy lúc 22:00: «Màn hình đa vai trò quản trị» (ADR-0180, chính là phần vừa triển khai), «Tùy chọn thanh toán Super Admin cho đối tác», «Tự động gán vé cho đơn hàng». Nhánh `claude/ra-soat-nut-bam-va-tu-ngu-8a4adb` (4/11) là đợt rà chữ đã xong.

## 3. Nhánh chưa nhập bản chính (ngoài phạm vi, chỉ liệt kê)

Có lần lưu chưa vào `origin/main` lúc khoảng 22:12: `claude/interesting-hodgkin-cde2fd` («Có vé», ADR-0174, migration `0142`, 10 lần lưu), `claude/ve-tour-dao-nghien-cuu` (đề xuất ADR-0175, 8), `claude/adr-0184-thi-cong` (kế hoạch thi công cho xe thiếu giấy tờ xuất bến, 1), `dot-0b-khung-tai` (17), `worktree-rut-gon-claude-md` (5), `claude/adr-luot-b-ed348e` (3), `claude/tour-account-qr-scan-setup-533817` (4), hai nhánh thử `claude/adr-0176-thu-*` (cố ý không nhập), và hai lần lưu sổ phát hành/nhật ký 2.74 trên `main` của máy (`4f29f927`, `984bee7d`).

## 4. Bộ kiểm chạy một lần cho cả đợt (do phiên điều phối chạy)

| Lệnh | Kết quả | Giờ |
|---|---|---|
| `npm run typecheck` | thoát 0, không lỗi (server, `web/`, `web/sw/`); chạy hết khoảng 1 giây vì dự án dùng TypeScript 7.0.2 (trình kiểm viết lại bằng Go) — đo lại riêng `tsc --noEmit -p web/sw` mất 0,17 giây | 22:03:05–22:03:06 |
| `npm test` (`scripts/chay-test.mjs`) | bước 1: 8.319 bài, **8.315 đạt, 0 đỏ**, 0 huỷ, 0 bỏ qua, 4 `todo`; bước 2 (bài đo giờ của hook, chạy một mình): 1/1 đạt; thoát 0 | 22:03:06–22:12:33 |
| `npm run test:e2e` (kèm `audit-invariants --strict` trên D1 tạm của từng nhóm) | **85/85 kịch bản xanh**, 3 nhóm, 763 giây; bốn lần `audit-invariants --db local --strict`: «Mọi bất biến đạt» với 2, 7, 2, 8 cảnh báo (của dữ liệu thử, ví dụ R-CTL-1, R-ORD-8, R-ORD-12, R-VC-30); các phép soi log cuối cùng đều đạt (không `day_loi`, không lỗi lạ chạm bảng vé, không nội dung câu hỏi trợ lý trong log Worker); thoát 0. Chạy sau khi trợ lý giao diện đã tắt máy chủ của mình (đếm lại: không còn `workerd`, không còn `wrangler`), để hai việc không giành máy | 22:39:41–22:52:24 |
| 14 tệp bài kiểm có quét thư mục tài liệu (`standards`, `bang-tham-chieu`, `bang-tu-giao-dien`, `huong-dan-may-canh`, `bo-v2-khop-ma`, `so-do-kien-truc`, `don-may`, `khoi-gap-noi-day`, `chup-bu`, `dac-diem-khong-lo-ma`, `dung-tai-san-dev`, `goi-ma-tro-ly-may`, `tat-thong-bao-dung-may`, `bang-su-kien-van-chuyen`) | chạy lại SAU khi đã lưu hồ sơ và ảnh của đợt này, để chắc tệp mới không làm bộ kiểm của lệnh nhập bản chính đỏ: 165/165 đạt, thoát 0 | 22:48 |

Đầu ra đầy đủ lưu ngoài kho (thư mục tạm của phiên), không đưa vào kho vì dài (riêng `npm test` 71.000 dòng).

## 5. Điều phiên điều phối tự xác nhận trong mã (không qua trợ lý)

- **Bảo mật hai lớp chặn đăng nhập sau hạn ân hạn (ĐÃ XÁC NHẬN, theo thiết kế ADR-0074).** `src/modules/auth/mfa-rules.ts` hàm `loginStep`: tài khoản nội bộ không có yếu tố thứ hai, hết `mfa_grace_until` và không có cửa sổ `mfa_enroll_until` thì nhận `blocked_no_factor`. Tài khoản mới tạo được ghi hạn ân hạn ngay lúc tạo (`src/modules/staff/repository.ts`, câu `INSERT INTO staff … mfa_grace_until`). Ân hạn chung của migration `0101` là 14 ngày từ lúc áp (đợt rà 17/10 ước hết khoảng 30/10). Hệ quả cho ngày dùng thật: người nội bộ nào chưa bật hai lớp và không còn ân hạn thì không đăng nhập được cho tới khi Quản trị/Toàn quyền mở cửa sổ 24 giờ. Không kiểm được dữ liệu thật (ai đã bật) vì không đăng nhập bản thật.
- **Quyết định cho xe thiếu giấy tờ vẫn xuất bến (ADR-0184) đã duyệt 7/11 nhưng chưa có mã (ĐÃ XÁC NHẬN).** Dòng Trạng thái của ADR ghi «Chưa thi công, chưa có mã; luật chặn cứng hiện hành vẫn áp tới khi mã mới qua tiêu chí nghiệm thu»; nhánh `claude/adr-0184-thi-cong` mới có kế hoạch. Hệ quả: 7 xe mà cảnh báo `R-VC-14` nêu trên bản thật vẫn bị chặn ở cổng xuất bến cho tới khi nhập đủ giấy tờ.
- **Trợ lý AI «Hỗ trợ» không đọc đơn, khách, tiền (đọc thiết kế, SUY LUẬN).** Đầu `src/modules/tro-ly/index.ts`: chỉ đọc kho tri thức thuần và đoạn ngữ cảnh do Toàn quyền đặt; câu hỏi được che trước khi gửi ra ngoài (`cheCauHoi`); không ghi nội dung hỏi/đáp ra nhật ký. Chưa thử gửi câu có SĐT để xem bộ che có bắt hết không.
- **Sổ hàng rào còn khoẻ (ĐÃ XÁC NHẬN bằng đếm).** `docs/SO-HANG-RAO.md` có 915 dòng hàng rào; 893 dòng có ngày quan sát chặn thật, 7 dòng «Chưa ghi nhận», 15 dòng ghi kiểu khác (đếm bằng một đoạn `node` đọc cột «Đã thấy chặn thật»).
- **Không có «quả bom hẹn giờ» nào khác trong bộ kiểm ngoài sổ hạn.** Tìm mọi ngày dạng `"2026-11…"`, `"2026-12…"`, `"2027-0…"` gắn với chữ «hạn» trong `src/`, `scripts/`, `docs/*.json`: ngoài `docs/quyen-hoan.json` (15/11, 30/11, 31/12) và hạn LEGACY 31/3/2027 của `src/architecture.test.ts`, các ngày còn lại là dữ liệu mẫu trong bài kiểm (`thu-truoc-hien-thi.test.ts`, `tra-sau-gio.test.ts`, `dieu-phoi-man.test.ts`…), không so với ngày hôm nay.

## 6. Lệnh bị bộ chặn từ chối

- Khoảng 22:10: một lệnh gộp gồm GET công khai `/api/auth/config` cùng các lệnh `git log/fetch/show` bị hook `guard-remote` chặn với lý do «yêu cầu ghi (POST/PUT/PATCH/DELETE/dữ liệu) tới booking.tourdao.vn». Lệnh không ghi gì; có vẻ hook đọc nhầm một cờ của `git` trong cùng dòng. Phiên tách phần `git` ra chạy riêng; GET công khai chạy lại đúng như lần đầu (21:57) và đi qua. Ghi lại để chủ biết hook có thể chặn nhầm lệnh gộp; không có lệnh cấm nào bị lách.
- Khoảng 23:00: lệnh dọn các thư mục tạm `tourdao-dev-*` trong thư mục tạm chung của máy (chỉ những thư mục sinh ra trong giờ phiên này chạy bộ kiểm) bị bộ phân loại của chế độ tự động từ chối với lý do «quét thư mục tạm dùng chung». Phiên không thử lại bằng cách khác. Các thư mục đó vẫn còn; chúng do bài `src/dung-tai-san-dev.test.ts` tạo bằng `mkdtempSync` mà không xoá sau khi chạy, nên mỗi lần chạy bộ kiểm thường để lại khoảng mười thư mục (đếm lúc 22:58: 360 thư mục từ 06:05 cùng ngày, của mọi phiên). Đây là việc dọn nhỏ cho bài kiểm, ngoài phạm vi đợt rà; chủ có thể tự xoá `$TMPDIR/tourdao-dev-*` khi không phiên nào đang chạy bộ kiểm.

## 7. Dọn dẹp

Đã tắt và đếm lại: không còn `workerd`, không còn tiến trình `wrangler`, không còn Chrome không màn hình của đợt rà (22:39 và 22:58). Bản chép mã dùng cho phép thử phá cổng phiên bản Trả sau (trong thư mục tạm riêng của phiên) đã xoá. Kịch bản dò, nhật ký đầu ra và báo cáo gốc của trợ lý còn trong thư mục tạm riêng của phiên, ngoài kho.
