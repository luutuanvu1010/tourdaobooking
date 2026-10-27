# Tóm tắt cổng 2a — bộ «Island Booking System — Design System v2» (28/10/2026)

Hồ sơ có ngày: viết xong là đóng băng. Thuộc Chặng 2 của đợt đánh giá UX tổng thể (`PROMPT.md` mục 7a); dựng theo đề cương `HE-THONG-HOP-NHAT.md`, quyết định cổng 1 `QUYET-DINH-CONG-1.md` và bảng lệch `SO-LECH-TU-MA.md`. Chờ chủ dự án viết chữ **«duyệt»** rồi mới sang 7b (đề bài khung chung cho Claude Design).

## Địa chỉ

- **Bộ v2** (riêng tư, chỉ chủ mở được): <https://claude.ai/artifact/R7vYe6PdU85WCSYkanWNP5> — sổ tay 12 mục, 189 token + 28 kiểu chữ, 42 biểu tượng, 4 logo, 17 tệp phông, 20 thành phần có xem trước, bìa.
- **Hai bộ cũ** đã đổi tên thêm «(cũ, không dùng để vẽ)», nội dung bên trong không đổi: <https://claude.ai/artifact/NEJeJjdMa2MrY2czD6yCJy> (Tour Đảo Booking) và <https://claude.ai/artifact/RFm5ghbS7UMjgKdd1d2dXW> (Tour Dao Travel ERP).
- **Bản chụp trong kho** (chỉ để tra): `ds-v2/` cạnh tờ này. **Ảnh 21 bản xem trước:** `docs/evidence/2026-10-28-ds-v2/anh-kiem/`.
- **Việc A, độc lập với cổng này:** nháp ADR-0143 khung tải (tách gói chung, nạp sẵn theo vai, cách đo ở cả 390 lẫn 1040), trạng thái *đề xuất*: `docs/adr/ADR-0143-khung-tai-tach-goi-chung-nap-san-theo-vai.md`. Chủ duyệt riêng; chưa thi công.

## Giữ gì từ mã (chép nguyên, không đổi giá trị)

Bảng màu tourdaovn 1.70 (97 token `c-*`: biển đậm, ngọc, san hô, cát, nền xám xanh, năm tông trạng thái), thang cỡ chữ 14 bậc, khoảng cách `s1`–`s7`, bo `radius-sm/md/lg/pill`, 9 bóng, phông Be Vietnam Pro tự lưu cùng ba họ tuỳ chọn, 40 biểu tượng nét của `web/icons.ts`, bốn tệp logo, đường cong `ease-out` và ba thời lượng có sẵn. **Tên token giữ nguyên** (`--c-*`, `--fw-*`, `--s*`…) để đợt 0 không phải đổi tên hàng loạt.

## Đổi gì, vì sao

- **ĐỔI độ đậm** `fw-bold`, `fw-heavy`, `fw-heading` 500 → 600, theo quyết định 2 cổng 1 (ba mức 400/500/600) để tiêu đề và số lớn tách khỏi nhãn. *Lưu ý thi công:* `KEO_THEO` trong `src/shared/giao-dien.ts` đang kéo `fw-bold`/`fw-heavy` theo núm «Độ đậm nhãn», nên đợt 0 phải tách, kẻo núm kéo tiêu đề về 500.
- **ĐỔI** vành tiêu điểm 2 → 3 px (nhìn rõ khi dùng bàn phím); ô gõ Đăng nhập 17 → 16 px (một cỡ ô gõ); cỡ chữ lẻ về bậc gần nhất của thang.
- **MỚI 19 token** chưa có trong mã: `h-control` 44 / `h-control-lon` 52 thay 9 token chiều cao; `z-dinh`…`z-tren-cung` (5) thay 13 z-index rời; `bo-control` 8; `t-nhanh` 150 và `t-vua` 200; `w-noi-dung-max` 1280; `w-sidebar-gon` 56; `c-mat-mang-bg`; ba token khung xương thay 14; ba mốc đáp ứng 640/900/1200. Thêm hai biểu tượng `alertCircle`, `minus` để tông Đỏ và Xám có hình riêng.
- **BỎ** (chỉ làm ở đợt 0, theo expand–contract): 92 bí danh, 126 số đo riêng một màn, `c-fab-*` (Trợ lý lên thanh trên), 14 token khung xương cũ, bo 6/4. Danh sách đủ ở `SO-LECH-TU-MA.md`.
- **Chưa đưa vào bộ** (README mục 12): thanh trên, thanh tab, thanh bên, bốn trang hệ thống, năm khuôn trang đầy đủ — vẽ ở 7b.

## Ba quyết định xin chủ

1. **Duyệt bộ v2 làm nguồn duy nhất để vẽ** từ 7b trở đi, gồm các ĐỔI và MỚI ở trên. *Khuyến nghị: duyệt.* Chưa có chữ «duyệt» thì 7b không bắt đầu.
2. **Phím tắt máy tính** `/` (vào ô tìm), `Esc` (đóng bảng trượt), `N` (tạo mới ở trang danh sách): giữ trong bộ ở trạng thái MỚI, thi công sau đợt 0? *Khuyến nghị: giữ.* Bỏ thì xoá một dòng ở README mục 7.
3. **Đường cong chuyển động:** giữ `ease-out` đã có trong mã thay vì thêm đường cong mới như đề cương? *Khuyến nghị: giữ* — một đường cong cho mọi thứ, ít token hơn, mắt thường không phân biệt được.

## Lựa chọn tự quyết (đảo được; nói để chủ biết)

Toast nền `c-primary-strong` chữ trắng, nút «Hoàn tác» màu cát · toast nằm trên bảng trượt (`z-tren-cung`) · `w-noi-dung-max` 1280 thay `w-main` 1200 · tên lớp thành phần tiếng Việt không dấu (`.nut`, `.o-nhap`, `.huy-hieu`, `.bang-truot`) làm hợp đồng tên lớp cho đợt 0 · bản xem trước là HTML tĩnh (đường «chỉ đọc» của quy trình dựng từ mã, vì app không có thư viện thành phần) · không đưa `tokens.css` tự biên dịch vào bộ vì trang Claude tự sinh từ `tokens.json` · ghi 42 biểu tượng (tài liệu cũ ghi 24 và 37 là đếm sót) · mọi tên token mới bằng tiếng Việt không dấu. Hoàn tác mục nào: sửa trên bộ Claude rồi chụp lại vào `ds-v2/`.

## Đưa vào bản chính

Nhánh `chang-2-ds-v2` (dựng từ `origin/main` 2847b6c2) đã có bản lưu trong worktree; móc an toàn của kho không cho phiên tự đẩy lên GitHub, nên chủ chạy hai lệnh đẩy nhánh và mở PR dạng thường (ghi ở báo cáo cuối phiên), rồi tự quyết lúc gộp:

```
npm run day-len -- chang-2-ds-v2
```

và kiểm bằng `git reflog show main -2`. Hai worktree `danh-gia-ux-tong-the` và `danh-gia-ux-tong-the-v2` đã nằm trọn trong `main`: xin chủ cho dọn, phiên không tự dọn.
