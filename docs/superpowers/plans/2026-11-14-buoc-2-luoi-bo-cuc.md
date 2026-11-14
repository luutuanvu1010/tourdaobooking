# Bước 2 — lưới bố cục chung (14/11/2026)

> Kế hoạch gốc: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 5 bước 2, tiêu chí T7 (và T1, T10). Phát hiện gốc N7, N8:
> `docs/superpowers/specs/2026-11-13-kiem-giao-dien/PHAT-HIEN.md`. Lời chủ: 14/11 «Mở bước 2 và hoàn tất»; 13/11 «Làm ở bước 2» (nợ thanh bên máy tính dựng muộn).
> Nhánh `claude/buoc-2-luoi-bo-cuc-87ca37`. Phiên này làm vai thi công; nghiệm thu do trợ lý kiểm độc lập (chỉ đọc). Không nhập bản chính, không triển khai.
> Ngoài phạm vi: sửa riêng từng họ màn (bước 3), việc lên kho (bước 4), dữ liệu, quyền, tiền, máy chủ, migration.

## Hiện trạng đo lại trên `main` 8b5c45e8d (bản 3.5), 14/11

Bộ đo: `docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/kich-ban/do-luoi.mjs` (dùng khung Chrome và kho dữ liệu thử của bước 0, tệp giao diện công ty giống production).
Năm bộ quyền (Toàn quyền, Bán hàng, Kế toán, Đối tác, Tài xế) × mọi trang có lối vào × bảy khổ = 784 ô, 0 lỗi, 0 trang tràn ngang.

| Điều đo | Hiện trạng |
|---|---|
| Lề trang (đệm hai bên vùng nội dung) | 16 px ở MỌI khổ, kể cả iPad và màn 1920; riêng Trang chủ 12 (điện thoại) và 24 (máy tính) theo bản vẽ riêng |
| Bề rộng nội dung | giãn kín vùng ở mọi trang: 788 (iPad đứng), 1.000 (1280), 1.160 (1440), 1.640 (1920). Biểu mẫu một cột và trang thiết lập giãn theo: ô gõ dài 800–1.600 px ở màn rộng |
| Khoảng cách giữa các khối đầu trang | 8 giá trị: 0, 4, 12, 14, 16, 17, 20, 24. Hai giá trị 14 và 17 (55/112 trang) là lề mặc định của đoạn chữ dẫn, tính theo cỡ chữ |
| Khối «một đầu» (nội dung ≤ 35 % bề rộng khối) | 888 ở iPad đứng, 261 ở 1280, 496 ở 1920 |
| Thanh bên máy tính dựng muộn | mở lại trang ở 1280: 70/78 trang có vùng nội dung nhảy ngang 0 → 248 px (8 trang còn lại là trang vẽ khung sớm) |

## Lưới (chủ duyệt 15/11, nguyên văn: «Duyệt, bám trái»)

> Mục 2 dưới đây ghi «căn giữa» là bản đề xuất 14/11. Chủ chọn **bám trái**: ở máy tính (có thanh bên) vùng nội dung mức hẹp và vừa bám mép trái sát thanh bên —
> đúng luật `body.has-sidebar main` đang có, không thêm luật căn chỉnh. Khổ chưa có thanh bên (dưới 900) giữ căn giữa màn như trước (giả định bề mặt, đảo ngược được).

1. **Một lề trang cho mỗi khổ:** 16 px ở điện thoại (giữ), 24 px từ iPad trở lên (nay 16). Token mới `--luoi-le`, đổi giá trị theo khổ.
2. **Ba mức bề rộng nội dung, mỗi trang đúng một mức** (khai bằng `data-rong` ở `<body>`, không khai = rộng):
   - **hẹp 720** — biểu mẫu một cột và trang đọc (Điều chỉnh công nợ, Chụp bù mức, Báo bận, Thêm / sửa xe, Nhật ký thay đổi…);
   - **vừa 1120** — chi tiết, biểu mẫu hai cột, trang thiết lập (Chi tiết đơn, Tạo đơn, Quản lý tài khoản, Địa điểm, Dịch vụ & giá, Tôi…);
   - **rộng** — danh sách và bảng điều khiển: kín vùng nội dung như nay (quyết định 31/10 của chủ: không để dải trống bên phải).
   Token mới `--luoi-rong-hep`, `--luoi-rong-vua`. Mức hẹp và vừa **căn giữa** vùng nội dung (câu hỏi 1 cho chủ: căn giữa hay bám trái).
3. **Một nhịp giữa các khối:** 16 px (giá trị đang chiếm đa số). Đoạn chữ dẫn đầu trang bỏ lề 14 / 17 px, theo nhịp chung. Token mới `--luoi-nhip`.
4. **Thanh bên máy tính có chỗ từ lần vẽ đầu** khi đã có bản nhớ khung (ADR-0035): tệp đầu trang của bước 1 (`web/giu-cho-dai.ts`) dựng sẵn lưới hai cột trước khi mã
   trang chạy. Không sửa `web/shell.ts` ⇒ không chạm trần gói trang Đơn hàng. Người dùng không thấy gì khác ngoài việc hết cú nhảy ngang.
5. **Hàng rào máy:** bài kiểm mới khoá (a) mọi trang có khung khai mức bề rộng hợp lệ, (b) `main` lấy lề từ token lưới, (c) tệp đầu trang giữ chỗ thanh bên.

Giữ nguyên, có tên: Trang chủ (bản vẽ 1.73 và 1a–1g đã duyệt: lề 12 điện thoại, 24 máy tính, nhịp riêng), Đăng nhập, màn bảo trì, các trang Vận chuyển tự đặt khung
trong thẻ. Khổ 641–899 vẫn dùng bố cục điện thoại (cổng 2b) — N7 chỉ được giảm bằng lề 24 và mức hẹp; thanh bên cho iPad đứng là quyết định khác, không làm ở đây.

## Tiêu chí nghiệm thu (viết trước khi sửa; đo bằng `do-luoi.mjs` trước / sau, cùng kho dữ liệu)

| Mã | Đạt khi | Nay |
|---|---|---|
| L1 lề | Mỗi khổ đúng MỘT lề cho mọi trang dùng khung chung: 16 ở 390 và 844×390; 24 ở 820, 1180, 1280, 1440, 1920. Ngoại lệ có tên: Trang chủ | 16 mọi khổ |
| L2 bề rộng | Ở 1920: bề rộng vùng nội dung chỉ thuộc ba mức (720, 1120, kín vùng); không ô gõ nào trong trang mức hẹp / vừa rộng hơn 1.120 px. Ở 1280: trang mức hẹp 720, các trang khác kín vùng | 5 mức ở 1920, ô gõ tới 1.600 px |
| L3 nhịp | Không còn khoảng 14 và 17 px giữa các khối con trực tiếp của vùng nội dung | 55/112 trang |
| L4 thanh bên | Mở lại trang ở 1280 (đã có bản nhớ khung): 0 trang có vùng nội dung nhảy ngang; CLS trung vị giảm so với nay | 70/78 trang nhảy 0 → 248 |
| L5 không hỏng | 0 trang tràn ngang ở cả bảy khổ; khối «một đầu» không tăng ở khổ nào; điện thoại 390 không đổi số đo nào ngoài L3 | 0 tràn |
| chung | `npm test` thoát 0, `npm run typecheck` 0 lỗi, bài cỡ gói trang xanh với trần cũ; kịch bản Chrome khung chung `dot-0-smoke.mjs` đạt; người kiểm độc lập ĐẠT | — |

## Đề bài lưới 1b

Đề bài 30/10 (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/PROMPT-CLAUDE-DESIGN-1B-LUOI-BO-CUC.md`) là hồ sơ có ngày, không sửa. Bản mới theo lời chủ 13/11
(phong cách Oracle Redwood, không sao chép): `docs/superpowers/specs/2026-11-14-de-bai-luoi-1b-ban-2.md`. Gửi Claude Design là việc của chủ; phần lưới trong mã ở trên
không chờ bản vẽ đó.

## Nhật ký

- 14/11: kiểm không có phiên khác làm cùng việc (không nhánh `luoi` / `buoc-2` nào khác). Dựng kho thử riêng `~/tourdao-ux-2026-11-14-buoc-2/` (chép kho bước 0, áp
  migration tới `0162`), máy chủ thử cổng 8825. Đo hiện trạng (bảng trên). Lớp xem trước `docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/xem-truoc/`.
- 14/11: **L4 xong trước** (không phụ thuộc câu trả lời của chủ, chủ đã lệnh 13/11): `web/giu-cho-dai.ts` gắn sẵn `has-sidebar` khi bản nhớ khung hợp lệ, tự gỡ sau
  8 giây nếu thanh bên không về; bài `src/giu-cho-dai.test.ts` đỏ trước, xanh sau; `web/shell.ts` không đổi, bài cỡ gói trang xanh với trần cũ. Đo mở lại ở 1280
  (Toàn quyền, Bán hàng, Đối tác, 78 trang): nhảy ngang 70 → 0 trang; CLS trung vị 0,051 → 0,002; số trang CLS ≥ 0,1: 26 → 6 (phần còn lại là nhảy dọc của từng
  trang, việc bước 3). Đề bài 1b bản 2 đã soạn. Ảnh trước / sau gửi chủ: `docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/xem-truoc/`. **Chờ chủ duyệt** lề, ba mức bề
  rộng, nhịp và câu «căn giữa hay bám trái» rồi mới thi công mục 1–3, 5.
- 15/11: chủ trả lời «Duyệt, bám trái». Thi công mục 1–3, 5: bốn token `--luoi-*` ở `public/app.css`, luật `main` lấy lề từ token, `body[data-rong]` cho mức hẹp / vừa,
  `main > p` theo nhịp; 57 trang khai `data-rong` (10 hẹp, 26 vừa, 21 rộng); bỏ `style` nội tuyến của trang Dịch vụ và trần riêng 640 của thẻ Thêm xe (`--w-vc-form`).
  Bài `src/luoi-bo-cuc.test.ts` đỏ 5 → xanh 6. Đề bài 1b bản 2 mục 4 đã thêm dòng «bám trái». Công thức thêm trang (`docs/CHANGE-GUIDE.md`) có dòng `data-rong`.
- 15/11, đo lại 784 ô (số gộp: `docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/so-lieu/luoi-truoc-sau-gop.json`), 0 lỗi, 0 tràn ngang:
  - **L1** đạt, với một chỗ SỬA LỜI tiêu chí: điện thoại xoay ngang 844 × 390 nhận lề 24, không phải 16 như bảng trên ghi. Mốc đổi lề là bề rộng 641 (mục 1, đề bài 1b,
    và ảnh số 2 chủ đã duyệt đều vẽ 24); dòng L1 viết nhầm 844 vào nhóm 16. Kết quả: 16 ở 390; 24 ở 844, 820, 1180, 1280, 1440, 1920; Trang chủ giữ 12 / 16 / 24.
  - **L2** đạt theo bề rộng vùng nội dung (`main` trừ lề): ở 1920 chỉ còn 720 (18 ô), 1120 (47), kín vùng 1624 (40) cộng Trang chủ; ở 1280 trang hẹp 720, còn lại 984.
    Cột «rộng» của tệp số gộp đo mép các khối đang hiện nên có vài giá trị lạ (108, 900, trống) ở trang đang tải hoặc trang tự bó khối (Thiết lập 900): không phải mức lưới.
  - **L3** đạt: 14 và 17 từ 55 xuống 0 trang ở mọi khổ; 16 từ 28–31 lên 69–75.
  - **L5** đạt: «một đầu» 54 → 42 (390), 888 → 804 (820), 283 → 256 (1180), 261 → 241 (1280), 306 → 285 (1440), 496 → 402 (1920). Khổ 844 × 390 ghi 919 → 939 vì MỘT ô
    (Kế toán, Đơn hàng) đo 44 thay cho 2; đo riêng lại ba lần đều ra 1 ⇒ nhiễu lần đo (trang đo lúc đang vẽ), trừ ô đó là 897. Điện thoại 390: lề, bề rộng không đổi.
  - Giả định bề mặt đã áp: khổ dưới 900 (chưa có thanh bên) trang hẹp vẫn căn giữa màn như luật `main` cũ; «bám trái» áp ở máy tính có thanh bên.
