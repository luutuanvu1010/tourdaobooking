# Mức TA dùng chung — giao diện (15/10/2026)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Luật: ADR-0117 lần 2 (migration 0096 + 0097). Màn: mục «Mức TA» ở `/hoa-hong` (`web/hoa-hong.ts`, `public/hoa-hong.html`, khối `.hh-mucta*` của `public/app.css`, chữ ở `src/shared/hoa-hong-hien-thi.ts`). Thư mục này đặt tên ngày 15/10 (ngày chạy thật); kế hoạch ghi `2026-10-14-muc-ta` — lệch có chủ ý theo lệnh điều phối.

**Hai quyết định bề mặt (đảo ngược được, chờ chủ xem ảnh):** (i) mục «Mức TA» đặt ngay dưới «Loại đối tác», trên «Các mức hiện có»; mỗi mức một khối: tên, «Đang dùng» / «Đã tắt», nút «Tắt» / «Bật», rồi hai danh sách «Dòng của mức» và «Loại đang gắn» (không bảng, khỏi tràn ngang ở 390px); ba biểu mẫu «Thêm mức TA», «Thêm dòng cho mức TA», «Gắn loại đối tác vào mức TA» chỉ hiện cho người có quyền ghi. (ii) Dòng của mức TA CHỈ hiện dưới tên mức, không lặp ở bảng «Các mức hiện có» (bảng đó chỉ còn mức riêng theo loại / theo đối tác). Chữ trên màn: «Mức TA», ví dụ «Đại lý cấp 1»; câu luật «Mỗi loại chỉ gắn một mức TA trong một ngày. Muốn đổi sang mức khác từ hôm nay: kết thúc gắn cũ tới hôm qua, rồi gắn mức mới từ hôm nay. Gắn bắt đầu từ hôm nay thì không đổi được trong cùng ngày.» luôn hiện.

**Kết quả (2026-10-15):** `kich-ban/muc-ta-smoke.mjs` — 14 bước (7 bước × 2 khổ 390 / 1040), chạy đủ với axe-core 4.13.0 (`AXE_JS`): **MUC TA SMOKE OK** (kèm mục «Đã biết»). axe nhẹ (không đỏ): `empty-table-header` ở cột cuối bảng mức có sẵn (khổ 1040), có từ trước.

**Phá thử (P16, không sửa mã sản phẩm, 2026-10-15):** `MT_PHA=mat-canh-bao` (lớp bọc `fetch` xoá `dongRieng` khỏi phản hồi 201 của «Gắn mức») ⇒ bước 4[390] ĐỎ «loại còn dòng riêng: khung vàng hiện»; `MT_PHA=lo-ma` (tên mức thay bằng mã máy) ⇒ bước 2[390] ĐỎ «lộ chữ Anh / mã thô: MT_QIRUPRCP». Bỏ biến ⇒ xanh lại.

## Cách chạy
Từ gốc repo, sau `npm run build:web`; D1 local TẠM (Turnstile tắt, không `--remote`); cần axe-core lấy ngoài repo.
```
AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-15-muc-ta/kich-ban/muc-ta-smoke.mjs
```
Thiếu `AXE_JS` thì dừng ngay. Kèm `MT_KHO=390`, `MT_DUNG=<mã bước>`, `MT_PHA=mat-canh-bao|lo-ma`, `OUT=<thư mục tạm>`.

## Bước → ảnh
| Bước | Ảnh |
|---|---|
| 1 Kế toán mở mục «Mức TA» (câu luật, ba biểu mẫu) | `anh/01-ke-toan-muc-ta-390.png`, `-1040.png` |
| 2–3 Thêm mức bằng biểu mẫu thật, thêm dòng «Dịch vụ … · 15%» | `anh/02-them-dong-*.png` |
| 4 Khung vàng sau khi gắn loại còn dòng riêng (không chặn) | `anh/03-canh-bao-vang-*.png` |
| 5 Mức đã tắt; hộp «Kết thúc gắn» | `anh/04-da-tat-muc-*.png`, `anh/05-hop-ket-thuc-gan-*.png` |
| 6 Bán hàng chỉ xem | `anh/06-ban-hang-chi-xem-390.png` |
| 7 Quản trị «Thử tra» ra mức TA kèm tên | `anh/07-quan-tri-thu-tra-*.png` |

## Đã biết (ghi nguyên văn, không sửa CSS chung)
axe-core ở bước 5 khi một mức ở trạng thái «Đã tắt» (khối mờ bằng `.row-off { opacity: .6 }`, khuôn sẵn của dự án, cùng khuôn loại đã tắt của lần 1) báo `serious color-contrast`: `Kế toán, mức ở trạng thái Đã tắt [390]: serious color-contrast — .hh-loai-ten > h3 | .badge-cancelled | button[data-mucta-act="bat"] | h4:nth-child(2)`. Kịch bản chỉ ghi lỗi tương phản ở đúng trạng thái này; mọi trạng thái khác phải sạch. Nút «Bật» nằm trong khối mờ nên chữ nhạt — cùng việc riêng đã nêu ở lần 1 cho khuôn `.row-off`.

**Giới hạn của cảnh báo vàng:** danh sách dòng riêng do máy chủ trả trong phản hồi của lần gắn (gồm cả loại khác mà cùng đối tác đang mang — trình duyệt không tự suy được), nên khung vàng chỉ có ngay sau lần gắn; tải lại trang thì mất. Muốn xem lại thì nhìn bảng «Các mức hiện có».

## Chưa kiểm
iPhone thật; khổ 1280; menu thả của ô chọn (ảnh headless không vẽ); tài khoản Đối tác (trang chặn bằng câu tiếng Việt — canh ở `so-dai-ly-smoke.mjs`; máy chủ chặn ở bài «số lạ»).

## Đề xuất cho chủ (không có hiệu lực tới khi chủ duyệt)
Thêm một dòng vào bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» ở `web/CLAUDE.md`: sửa `web/hoa-hong.ts`, `public/hoa-hong.html`, khối `.hh-mucta*` / `.hh-loai*` của `public/app.css`, hàm `nhanMucTa` / `cauCanhBaoDongRieng` / `boDongMucTa` / `cauThuTra` của `src/shared/hoa-hong-hien-thi.ts`, `docThanDongMucTa` / `docThanGan` của `src/shared/so-dai-ly-nhap.ts` ⇒ chạy `muc-ta-smoke.mjs` ở thư mục này (14 bước, 390 + 1040, D1 tạm) + `loai-doi-tac-smoke.mjs` + `so-dai-ly-smoke.mjs` (cùng trang `/hoa-hong`).
