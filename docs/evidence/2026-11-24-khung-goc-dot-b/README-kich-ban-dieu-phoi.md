# Kịch bản bấm thử nhóm Điều phối — đợt B khung gốc (24/11/2026)

Hồ sơ có ngày. Nhóm «dieu-phoi» chạy lại 11 kịch bản Chrome của Điều phối xe, Chi tiết / Sửa chuyến, Xe đang chạy, Báo bận, Cuốc của tài xế, Chi phí chuyến trên mã đợt B
(mã sản phẩm không sửa). Bản chép ở `kich-ban/` cạnh tệp này; tệp cũ chỉ thêm MỘT dòng «Thay bằng …» ở đầu.

## Cách chạy

Từ gốc kho, sau `npm run build:web` (lần này dùng bản dựng sẵn):

```
AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=/tmp/<thư-mục-ảnh> node docs/evidence/2026-11-24-khung-goc-dot-b/kich-ban/<tên>.mjs
```

`dp-lib.mjs` (bản chép) mặc định `OUT=/tmp/khung-goc-dot-b-dp` — ảnh không vào kho. Nhóm Xe / Giấy tờ / Giá dùng bản chép riêng có hậu tố `-xe`.

## Cách phân loại đỏ

- **Đỏ sẵn**: đã đỏ trên mã TRƯỚC đợt B. Kiểm bằng cách chạy chính kịch bản CŨ trên bản xuất của lần lưu `e984cb74f` (gốc trước đợt B; xuất ra thư mục tạm,
  dựng `build:web` riêng) cho `dieu-phoi`, `chuyen`, `chuyen-sua`, `goi-bao`, `xe-dang-chay` (bản cũ chết ở dựng dữ liệu nên chạy bản cũ có sửa đúng dòng
  xác nhận O6). Chỗ ghi «suy ra» là chưa chạy bản cũ cho kịch bản đó, nhưng cùng một lỗi (cùng luật axe, cùng phần tử ngoài đợt B) đã đỏ ở bản cũ của kịch bản khác.
- **Hoãn**: phép so đỏ sẵn nằm giữa bước được dời tới cuối bước (`hoan` / `san…`), KHÔNG bỏ: bước vẫn ✗ nếu nó đỏ, nhưng các phép so sau nó vẫn chạy trên mã mới.
- **Khác bản cũ / đỏ do trang mới**: chỉ có trên mã đợt B — cần người điều phối xử lý (không sửa mã sản phẩm ở đây).

## Bảng

| Kịch bản cũ | Bản chép (`kich-ban/`) | Bộ chọn / chữ đã đổi | Kết quả trên mã đợt B | Thời gian một lần chạy |
|---|---|---|---|---|
| `2026-09-29-adr-0049/kich-ban/dp-lib.mjs` | `dp-lib.mjs` | `vcSub`: thanh bên không còn `.sidebar-sub` (đổi 15/10 + đợt 0) → `.sidebar-item` trong nhóm «VẬN CHUYỂN»; `OUT` mặc định `/tmp` | — | — |
| `2026-09-29-adr-0049/kich-ban/dieu-phoi-smoke.mjs` | `dieu-phoi-smoke.mjs` | dải số `#dp-so .dp-stat` → `#dp-so > div` (dt/dd; ghép từng phần bằng một dấu cách), nhãn viết thường «Lượt đưa đón 4 …»; loại việc Cần xử lý viết thường («Chuyến bị giữ», «Lượt đưa đón quá hạn chốt»); nút `.vc-btn` → `.nut` / `.dp-cxl-btn`; rỗng `.dp-col-empty` → `.rong`; điện thoại: dải số riêng `#dp-so-m` (4 ô) + `#dp-so-phu` bỏ có chủ ý → `#dp-so` hiện, 6 ô, câu «1 quá hạn chốt» ở ô Chưa xếp | 4 ✓ (2, 4, 5, 6a) / 7 ✗. Đỏ sẵn (bản cũ cũng đỏ): 1, 3, 6, 7, 8 — menu, thứ tự hộp «Xếp vào chuyến» (C3 12/10: chuyến hợp lên đầu), axe `label-content-name-mismatch` ở `.dp-leg` / `.dp-khoi` (bước 1: 5 phần tử, gồm `.is-tai-trong` — bản cũ không tới phép so này nên không có số để so), lớp `is-tai-*`; mọi phép so khác trong các bước này đạt (bản cũ 4, 5 đỏ — suy ra do bước 3 đỏ để hộp còn mở). **Đỏ do trang mới: 7b, 9** (xem dưới); phép so «không gọi /api/van-chuyen» của 7b chưa chạy | ~85 giây |
| `2026-09-29-adr-0049/kich-ban/chuyen-smoke.mjs` | `chuyen-smoke.mjs` | nút `main a.vc-btn` → `main a.nut:not(#ct-back)`; việc đầu trang `.dp-ct-actions` → `#ct-viec`; giờ `.dp-ct-when` → `.dp-ct-head .o-phu`; dải bốn ô `.dp-kv` → `[data-khoi="tom-tat"] .cap` (nhãn viết thường); `.dp-card-head` → `.khoi-dau`; thứ tự nút: dải báo («Cập nhật điểm theo đơn») nay đứng trước thanh việc trong mã; điện thoại: bỏ dòng tóm tắt riêng `.dp-ct-line` (khối tóm tắt chung hiện, vẫn kiểm biển số / chỗ / tài xế / tải), «Sửa chuyến» + «Cho xe chạy thay tài xế» lên `#ct-viec`, «Huỷ chuyến» ở `#ct-bottom`; lý do cho chạy thiếu giấy `.dp-ct-cho-chay-lo > div` → `[data-khoi=…] > div > div` | 15 ✓ / 1 ✗: 9e **đỏ sẵn, nặng thêm** — cùng luật axe `label-content-name-mismatch` ở Điều phối xe, cùng dữ liệu: bản cũ 4 phần tử vi phạm, mã đợt B 6 | ~100 giây |
| `2026-09-29-adr-0049/kich-ban/chuyen-sua-smoke.mjs` | `chuyen-sua-smoke.mjs` | `#cx-layout` (đã bỏ) → `#cx-form`; `.vc-field > label` → `.truong > label`; `.dp-hist-row` → `.dong`; `.dp-cx-bottom` → `#cx-bottom`; `.dp-cx-actions` → `#cx-nut`; nút `.nut` | 12 ✓ / 1 ✗: bước 8 — **khác bản cũ**: khối «Xe trong ngày» `#cx-ngay` nay HIỆN ở 390 (bản cũ ẩn ở điện thoại); thêm phép so cỡ chữ ô gõ 17px đỏ sẵn (bản cũ 16px). Các phép so khác của bước 8 đạt | ~60 giây |
| `2026-09-29-adr-0049/kich-ban/xe-dang-chay-smoke.mjs` | `xe-dang-chay-smoke.mjs` | `.dp-khach-cho-the` → `[aria-labelledby="ct-cho-title"]`; `.dp-viec-vp` → `[aria-labelledby=ct-viec-title]`. **Sửa dựng dữ liệu (không phải bộ chọn)**: đơn O6 do Bán hàng (người lập) xác nhận thay vì Quản trị — bản cũ chết trước mọi bước từ ADR-0135 (2/11), cùng cách sửa dp-lib 2/11 | 9 ✓ / 1 ✗: 7 đỏ sẵn (axe `.bar-avatar` ở thanh trên, bản cũ cũng đỏ) | ~75 giây |
| `2026-09-29-adr-0049/kich-ban/ban-smoke.mjs` | `ban-smoke.mjs` | `.dp-cuoc-day` → `[data-ngay-cuoc]`; `.bb-form .vc-reason` → `#bb-form .chon-doan [role=radio]`; `.bb-khung` → `#bb-ds .dong[data-khung]` | 5 ✓ / 2 ✗, cả hai đỏ sẵn (suy ra): 1 — nhãn thanh tab «Báo bận» (đợt 0, hoãn) + axe `.bar-avatar`; 4 — axe `.bar-avatar` (phép so cuối bước) | ~70 giây |
| `2026-09-29-adr-0049/kich-ban/rut-doi-smoke.mjs` | (không chép) | không cần đổi bộ chọn | **8/8 ✓** (chạy tệp cũ, `OUT=/tmp`) | ~60 giây |
| `2026-09-29-adr-0049/kich-ban/cap-nhat-khach-smoke.mjs` | `cap-nhat-khach-smoke.mjs` | `.dp-chon .vc-btn` → `.dp-chon .nut`; `.dp-cxl-actions .vc-btn` → `.dp-cxl-actions .dp-cxl-btn` | 6 ✓ / 1 ✗: 1 đỏ sẵn (suy ra; axe `.dp-leg` / `.dp-khoi`, phép so cuối bước) | ~70 giây |
| `2026-09-29-adr-0049/kich-ban/goi-bao-smoke.mjs` | `goi-bao-smoke.mjs` | `.dp-card-head` → `.khoi-dau`; `.dp-cxl-actions .vc-btn` → `.dp-cxl-btn`; nhãn loại việc viết thường «Giờ hẹn đổi — gọi báo khách» | 4 ✓ / 3 ✗, cả ba đỏ sẵn (bản cũ đỏ y hệt): 1 axe `.dp-leg` / `.dp-khoi` (phép so cuối bước); 4 lời gọi API của Bán hàng bị đá phiên (401, ADR-0075) — phần sau của bước 4 (409, câu hằng, «Tải lại») **chưa chạy trên mã mới**; 6 chỉ đỏ vì 4 (giờ vẫn 08:30) — phép so đó được HOÃN ở lần chạy 2, các phép so «Kế toán không nút» ở Cần xử lý và Chi tiết chuyến, không lệnh ghi, đều ĐẠT | ~70 giây (2 lần) |
| `2026-10-02-tien-xe-thue/kich-ban/chi-phi-chuyen-smoke.mjs` | `chi-phi-chuyen-smoke.mjs` | tóm tắt `.cp-o` → `[data-khoi="chi-phi"] > .cap` (nhãn viết thường); nút `.cp-nut` → `.khoi-viec`; `.cp-chip-ai` → `.khoi-dau .chip`; `.cp-trong` → `.rong`; form `.tx-form` → `[data-khoi=form-chi-phi]:not([hidden])`; `+ .vc-hint` → `~ .truong-goi-y`; vị trí: khối nay ngay trước «Nhật ký chuyến» ở cột chính (bản cũ: cuối cột chính) | **11/11 ✓** | ~75 giây |
| `2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` | `cuoc-smoke.mjs` | `.dp-cuoc-day` → `[data-ngay-cuoc]` (`.khoi-dau h2`, `.rong`); `.dp-cuoc-the` → `.dong[data-chuyen]`; `.dp-cc-foot` → `[data-cau="nut-xuat-ben"]`; `#cc-day .vc-btn` → `.nut`; `.dp-run-end .vc-btn` → `[data-action="ket-thuc-gian-doan"]`; `.vc-btn-stop` → `.nut[data-cap="nguy-hiem"]`; `.dp-dieu-chinh-link` → `[data-action="dieu-chinh"]`; `.dp-ct-actions` → `#ct-viec`; hai nút cuối lấy bản đang hiện | 17 ✓ / 2 ✗: 1 đỏ sẵn — nhãn thanh tab tài xế có thêm «Quét vé» (9/11, hoãn) + axe `.bar-avatar` (suy ra); **3b khác bản cũ** (xem dưới), các phép so khác của 3b đạt. Bước 1: axe ném lỗi trước phép so «thẻ cuối không bị thanh tab che» → phép so đó **chưa chạy trên mã mới**. Lần chạy 1 đỏ thêm 7–9 do sót một bộ chọn `.dp-ct-actions`, đã sửa ở lần 2 | ~3,5 phút |
| `2026-10-25-tai-xe-thay-khach/kich-ban/tai-xe-thay-khach-smoke.mjs` | `tai-xe-thay-khach-smoke.mjs` | `.dp-suat-khach .dp-kc` → `[data-khoi="suat-khach"] .dp-kc`; `.dp-run-end .vc-btn` → `[data-action="ket-thuc-gian-doan"]`. Phép so về tên khách giữ nguyên | **10/10 ✓** (chạy 20:28 giờ VN, trước hạn 21:10) | ~95 giây |

## Sửa không phải bộ chọn (khai đủ)

- `xe-dang-chay-smoke`: đơn O6 do Bán hàng (người lập) xác nhận thay Quản trị — dựng dữ liệu, theo tiền lệ dp-lib 2/11.
- Khung «hoãn» (`hoan`, `san1`, `san3`, `san3b`, `san6`, `san7`, `san8`): dời phép so đỏ sẵn tới cuối bước, bước vẫn ✗. Ở `dieu-phoi` (1, 3, 6, 7, 8), `chuyen-sua` 8,
  `ban` 1, `cuoc` 1 và 3b, `goi-bao` 6.
- Hàm đọc chữ ghép từng phần bằng một dấu cách (`soLieu` ở dieu-phoi, `kv` ở chuyen, `tomTat` ở chi-phi-chuyen) vì `innerText` của khung mới dính số với phần phụ
  («42 bị giữ»); giá trị mong đợi chỉ đổi chữ hoa → chữ thường.

## Phép so đã đổi giá trị mong đợi theo bố cục mới — chưa đối chiếu ảnh đã duyệt

Ngoài hai thay đổi có chủ ý mà tờ giao việc nêu (nút hai bản rộng / hẹp; chữ viết thường + `.huy-hieu`), các phép so sau được đổi theo bố cục khung gốc. Người
điều phối cần đối chiếu ảnh chủ đã duyệt; nếu không khớp thì đây là đỏ do trang mới:

- `dieu-phoi` 390: dải số `#dp-so` nay HIỆN (6 ô) thay dải 4 ô riêng `#dp-so-m` + câu `#dp-so-phu` (câu «1 quá hạn chốt» nay ở ô Chưa xếp).
- `chuyen` 390: khối tóm tắt chung hiện thay dòng `.dp-ct-line`; «Sửa chuyến», «Cho xe chạy thay tài xế» ở thanh việc `#ct-viec`, chỉ «Huỷ chuyến» ở `#ct-bottom`.
  1040: thứ tự nút trong mã — «Cập nhật điểm theo đơn» (dải báo) trước thanh việc. ADR-0184 390: nút «Cho chạy dù thiếu giấy tờ» ở `#ct-viec`, không còn ở cuối trang.
- `chi-phi-chuyen`: khối Chi phí chuyến nay đứng ngay trước «Nhật ký chuyến» ở cột chính (bản cũ: cuối cột chính).

## Đỏ do trang mới / khác bản cũ (cần người điều phối xử lý)

Ảnh (ngoài kho): `/tmp/dp-dotb/csu/anh/b3-sua-chuyen-dien-thoai.png` (chuyen-sua bước 8), `/tmp/dp-dotb/cuoc/anh/b5-chuyen-dang-chay-dien-thoai.png`
(cuoc bước 3b); `dieu-phoi` 7b không chụp ảnh. Nhật ký chạy: `/tmp/dp-dotb/*.log` (dp3, cs2, csu2, xdc2, ban2, rd2, cnk1, gb2, cp2, cuoc2; bản cũ: goc-*.log).

1. **`/dieu-phoi` với tài khoản không xem được lịch xe (tài xế gõ thẳng địa chỉ)** — `dieu-phoi-smoke` bước 7b, 9. Bản cũ đạt cả hai. Trang mới ném lỗi
   `TypeError: Cannot set properties of null (setting 'hidden')` ở `main()` của `web/dieu-phoi.ts`: `byId("dp-truoc").closest(".dp-date")!.hidden = true` — khung gốc
   bỏ lớp bọc `.dp-date` (nay `.dau-trang .hang`). Hậu quả (kịch bản đo): câu «Tài khoản này không xem được lịch xe.» KHÔNG hiện, và có lỗi console; theo mã, ô ngày và nút đổi ngày cũng không bị ẩn.
   Theo mã (chưa kiểm bằng ảnh): lỗi xảy ra trước khi gọi lịch xe nên không lộ dữ liệu, nhưng người dùng thấy trang không lời giải thích.
2. **`/chuyen-sua` ở 390: khối «Xe trong ngày» nay hiện** (`chuyen-sua-smoke` bước 8; bản cũ ẩn ở điện thoại). Có thể là đổi có chủ ý của khuôn Biểu mẫu — cần
   đối chiếu ảnh đã duyệt.
3. **`/cuoc-chuyen` ở 390: «Kết thúc gián đoạn» cùng cỡ «Kết thúc chuyến»** (`cuoc-smoke` bước 3b; bản 1.39 đòi nút gián đoạn nhỏ hơn). Có thể là đổi có chủ ý
   (hai nút cuối trang theo thanh việc của khung) — cần đối chiếu ảnh đã duyệt.

## Sổ hàng rào

Dòng ở `docs/SO-HANG-RAO.md` canh luật «ai thấy tên khách» còn trỏ tới `2026-10-25-tai-xe-thay-khach/kich-ban/tai-xe-thay-khach-smoke.mjs` — tệp cũ nay đỏ 2 bước
(bộ chọn) trên mã đợt B. Bản chép đạt 10/10, phép so về tên khách giữ nguyên từng chữ; bản chép CHƯA có lần quan sát chặn thật riêng (sửa cố ý → đỏ → hoàn nguyên).
Nhóm này không được sửa sổ: người điều phối trỏ lại dòng đó.

## Không làm

Không sửa `web/`, `public/`, `src/`, `scripts/`; không đăng nhập máy chủ thử cổng 8871; không git. Tiến trình `wrangler dev` + Chrome mồ côi của một lần chạy hỏng
(xe-dang-chay lần 1, chết ở dựng dữ liệu) đã dừng theo đúng số tiến trình của mình.
