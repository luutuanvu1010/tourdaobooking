# Bằng chứng giao diện — ADR-0048 Phần B (nhà xe đối tác, tài xế đối tác)

- **Không có bản vẽ mới:** chủ dự án chọn Q2 = (a) ngày 29/9 ("không làm màn riêng Nhà xe — tìm nhà xe ở Danh bạ bằng ô lọc, danh sách xe lọc theo chủ xe; các chỗ nhỏ làm theo kiểu có sẵn, không cần vẽ"). Mọi thay đổi dùng **khuôn sẵn** của màn có sẵn: ô tick + dòng xem trước của khối "Vai và quyền", ô chọn "Loại" quan hệ ở Danh bạ, ô chọn `.vc-input` và dòng phụ của thẻ xe (bản vẽ Vận chuyển 1a màn 00–03), dòng phụ của màn 06, trang đầu tài xế (màn 07) và "Giấy tờ của tôi" (màn 05).
- **Người chụp:** người thi công Phần B (chưa phải kiểm độc lập). Mọi số giấy tờ, SĐT, biển số là **số GIẢ**.
- **Giới hạn:** Chrome headless trên máy phát triển (390×844 giả lập cảm ứng, 1040×820), D1 tạm, không mạng ngoài. **Chưa thử iPhone thật**, chưa thử dữ liệu thật trên production.
- **Nhật ký thi công** (đỏ trước, xanh sau, phép đột biến P16 từng task): `docs/superpowers/plans/2026-09-29-adr-0048-thi-cong-nhat-ky.md`, mục 3 (dòng B1–B5).

## Cách chạy

Từ **gốc repo**, sau `npm run build:web`; cần Chrome và một bản `axe-core` NGOÀI repo (`tests/e2e/README.md`, mục "Kiểm giao diện bằng Chrome thật"):

```
AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-29-adr-0048/kich-ban/<kịch bản>.mjs
```

`OUT=<thư mục>` để ghi ảnh ra chỗ khác (không làm bẩn repo). Ba kịch bản dựng trên `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs` (D1 tạm + wrangler dev riêng, cổng trống — chạy song song với phiên khác được).

## Kịch bản

| Kịch bản | Task | Số bước | Kiểm gì |
|---|---|---|---|
| `nha-xe-danh-ba-smoke.mjs` | B2 | 5 | Danh bạ: gán "Nhà xe đối tác" cho hồ sơ tổ chức; mục "Người liên hệ, tài xế" (G3); ô "Loại" có hai lựa chọn tài xế, nút đổi chữ; thêm "Tài xế của" → dòng "<tài xế> — Tài xế của — <nhà xe>"; chọn hồ sơ tổ chức làm tài xế → câu của máy chủ "phải đi từ hồ sơ cá nhân"; hồ sơ người chọn hồ sơ không phải nhà xe → "phải trỏ tới hồ sơ đang là nhà xe đối tác"; ô lọc "Nhà xe đối tác" chỉ còn nhà xe; 390 không tràn ngang, axe |
| `xe-chu-xe-smoke.mjs` | B3 | 5 | chưa có nhà xe → không ô "Chủ xe" (giữ bản vẽ 01–02); `/xe-sua` ô "Chủ xe" dưới "Tên / đời xe", mặc định công ty chủ, chọn nhà xe → chi tiết "Chủ xe: …"; `/xe` dòng phụ "Nhà xe: …" (bảng 1040, thẻ 390), ô lọc gọi `?chu=`; sửa chủ xe (Q1 = (a)) → chi tiết đổi, nhật ký "chủ xe A → B"; axe |
| `tai-xe-doi-tac-smoke.mjs` | B5, B4 | 4 | tài khoản chỉ Tài xế đối tác: "/" → `/tai-xe`, KHÔNG gọi `/api/orders*`, đúng hai tab, giấy của mình, số đủ không trong DOM (390, axe); trang Tôi "Giấy tờ của tôi" số che, không nút, menu không mục văn phòng (1040); Quản trị: danh sách sắp hết hạn có nhãn "Nhà xe: …" cho xe của nhà xe và tài xế đối tác, xe công ty không, không số (1040 + 390, axe). Trang của Tài xế đối tác mở TRƯỚC: kịch bản đăng nhập bằng cookie (`env.as`), không qua `/login` — chỗ xoá bản nhớ khung ADR-0035 — nên mở sau trang Quản trị sẽ thấy lời gọi sớm giả tạo |

Kịch bản 1a / mô hình vai đã sửa theo Phần B: `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` (bước B2 — Task B1: khoá chéo "Tài xế đối tác", đổi "Tài xế taxi" → "Tài xế đối tác" lưu được; ảnh `vai-tai-xe-doi-tac-may-tinh.png` ghi ở thư mục ảnh của kịch bản đó), `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/giay-to-nguoi-smoke.mjs` (tiêu đề "Người liên hệ, tài xế").

## Ảnh (`anh/`)

Chụp 2026-09-29 bằng ba kịch bản trên (tên ảnh = màn + khổ): `nha-xe-danh-ba-1040.png`, `nha-xe-danh-ba-390.png`, `xe-sua-chu-xe-1040.png`, `xe-chi-tiet-chu-xe-1040.png`, `xe-danh-sach-chu-xe-1040.png`, `xe-danh-sach-chu-xe-390.png`, `tai-xe-doi-tac-trang-dau-390.png`, `tai-xe-doi-tac-toi-1040.png`, `sap-het-han-nha-xe-1040.png`, `sap-het-han-nha-xe-390.png`.
