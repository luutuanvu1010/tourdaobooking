# Phiếu sự thật từng thành phần — bộ Design System v2 của Claude Design

Nguồn đọc: `docs/evidence/2026-10-28-claude-design-bo-v2/` (readme.md, 6 tệp `components/<nhóm>/<nhóm>.css`, 29 tệp `*.prompt.md`, 29 tệp `*.d.ts`, 29 tệp `*.jsx` chỉ đọc, 4 tệp `tokens/*.css`, `guidelines/tu-ma-moi-bo.html`). Ngày đọc: 2026-10-28. Chỉ trích sự thật, không đánh giá.

Quy ước ghi: giá trị số kèm tên token trong ngoặc khi CSS dùng token, ví dụ "cao 44 (`--nut-h`)". Giá trị ghi thẳng trong CSS (không qua token) được đánh dấu "(cứng)". "Khổ" = container `ib` (`.ib-khung`), ngưỡng CSS dùng chỉ có hai: `@container ib (min-width:768px)` và `@container ib (min-width:900px)`; không thành phần nào có quy tắc riêng cho khoảng 768–899 ngoài việc "đã qua 768 nhưng chưa qua 900".

Bảng tra nhanh giá trị token hay gặp (từ `tokens/goc.css`, `y-nghia.css`, `thanh-phan.css`):
- Màu: `--c-chinh` #0c4a6e · `--c-chinh-re` #0b5c84 · `--c-chinh-dam` #082f49 · `--c-chinh-nhat` #dcebf6 · `--c-chinh-nhat-re` #c9def0 · `--c-nhan` #c0392b · `--c-nhan-re` #96271a · `--c-nguy-hiem` #b01235 · `--c-nguy-hiem-re` #8e0e2b · `--c-tieu-diem` #0891b2 · `--c-nen` #ffffff · `--c-nen-phu` #f2f5f9 · `--c-nen-re` #f1f5f9 · `--c-nen-toi` #082f49 · `--c-chu` #0f172a · `--c-chu-phu` #475569 · `--c-chu-goi-y` #94a3b8 · `--c-chu-tren-toi` #f8fafc · `--c-chu-tren-chinh` #ffffff · `--c-vien` #e1e7ef · `--c-vien-o` #c9d4e0 · `--c-vien-o-re` #94a3b8.
- Năm tông: cát `--tt-cat-bg` #fbe3b3 / `--tt-cat-chu` #5a4109 · biển `--tt-bien-bg` #dcebf6 / `--tt-bien-chu` #0c4a6e · lá `--tt-la-bg` #dcfce7 / `--tt-la-chu` #166534 · đỏ `--tt-do-bg` #fde9ee / `--tt-do-chu` #8e0e2b · xám `--tt-xam-bg` #f2f5f9 / `--tt-xam-chu` #475569.
- Chữ: `--fs-noi-dung` 16 · `--fs-phu` 14 · `--fs-huy-hieu` 12 · `--fs-tieu-de-khoi` 16 · `--fs-tieu-de-khoi-rong` 18 · `--fs-tieu-de-trang` 20 · `--fs-tieu-de-trang-rong` 24 · `--fs-so-lon` 26 · `--lh-noi-dung` 24px · `--lh-phu` 20px · `--lh-huy-hieu` 18px · `--lh-tieu-de` 1.16 · `--fw-noi-dung` 400 · `--fw-nhan` 500 · `--fw-tieu-de` 600.
- Khoảng cách: `--kc-1` 4 · `--kc-2` 8 · `--kc-3` 12 · `--kc-4` 16 · `--kc-5` 24 · `--kc-6` 32 · `--kc-7` 48 · `--pad-dong` 12 16 · `--pad-the` 16 · `--pad-the-rong` 24 · `--le-trang` 16 · `--le-trang-rong` 32.
- Hình khối: `--r-dieu-khien` 8 · `--r-the` 12 · `--r-bang-truot` 18 · `--r-tron` 999 · `--sh-the` = `--bong-1` · `--sh-noi` = `--bong-2` · `--sh-lop-phu` = `--bong-3`.
- Cao / rộng: `--h-cham` 44 · `--h-dieu-khien` 44 · `--h-dieu-khien-lon` 52 · `--h-thanh-tren` 60 · `--h-thanh-tab` 56 · `--h-dong` 44 · `--w-noi-dung` 1280 · `--w-thanh-ben` 248 · `--w-bang-truot` 520 · `--w-bao-xong` 360.
- Chuyển động: `--cd-nhanh` 150ms · `--cd-vua` 200ms · `--cd-cong` cubic-bezier(.22,1,.36,1) · `--cd-quay` 700ms · `--cd-xuong` 1.2s · `--vanh-tieu-diem` 3px · `--vanh-cach` 2px · `--bt-net` 2.

---

### 00 Biểu tượng (`hien-thi/bieu-tuong`)
- Biến thể / props chính: `ten` (38 tên: 37 từ mã + `minus` MỚI), `co` (số px, mặc định 20), `nhan` (có thì `role="img"` + `aria-label`; không có thì `aria-hidden="true"`), `className`, `style`. Xuất kèm `HINH` (bảng path) và `TEN_BIEU_TUONG` (= `Object.keys(HINH)`).
- Kích thước: `width`/`height` = `co`, mặc định 20 ghi cứng trong JSX (`co ?? 20`), không đọc `--bt-co`; `viewBox 0 0 24 24`; nét `stroke-width: var(--bt-net)` = 2 qua CSS `.ib-bt`; `stroke-linecap`/`linejoin` round; `fill: none`.
- Màu / token: `stroke: currentColor` (theo màu chữ bao quanh); không có màu riêng.
- Trạng thái và hành vi: tên không có trong `HINH` → trả `null` (không vẽ gì); `focusable="false"`; CSS `.ib-bt`: `display:inline-block; flex:none; vertical-align:middle`.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `minus` MỚI, path `M5 12h14` (nửa ngang của `plus`). Hai token `--bt-co` (20) và `--bt-co-lon` (24) được khai ở `y-nghia.css` nhưng không tệp CSS nhóm hay JSX nào đọc; các cỡ 14/16/18/20/24 đều truyền số thẳng qua prop `co`. Các JSX gọi `co={18}` ở nút xoá ô tìm, mũi sắp xếp, mũi gập thanh bên, nút đóng Báo xong — readme chỉ liệt kê bốn cỡ 14/16/20/24.

### 01 Nút ba cấp × hai cỡ (`hanh-dong/nut`)
- Biến thể / props chính: `cap` = `chinh` (mặc định) | `san-ho` | `phu` | `phu-nguy-hiem` | `loi-nho` | `do-dac`; `co` = `thuong` (44) | `lon` (52); `bieuTuong` (20 px trước chữ); `dangTai`; `tat` + `lyDoTat`; `rong`; `nhan` (nút chỉ hình khi không có children); `href` (→ thẻ `a` nếu không tắt); `type` (mặc định `button`); `onClick`.
- Kích thước: min-height 44 (`--nut-h`), lớn 52 (`--nut-h-lon`); min-width 44 (`--h-cham`); đệm 0 16 (`--nut-pad`); lối nhỏ đệm 0 8 (`--kc-2`), min-width 0; chỉ hình: width = min-width = 44 (`--nut-h`), đệm 0; bo 8 (`--r-dieu-khien`); chữ 16 (`--fs-noi-dung`) / dòng 20 (`--lh-phu`) / đậm 500 (`--fw-nhan`); gap biểu tượng–chữ 8 (`--kc-2`); viền 1px trong suốt ở mọi cấp; dòng lý do tắt 14 (`--fs-phu`) / 20, cách nút 4 (`--kc-1`).
- Màu / token:
  - Mặc định `.ib-nut` (= lối nhỏ): nền trong suốt, chữ `--c-chinh`; rê: gạch chân chữ, `text-underline-offset: 3px` (cứng); chỉ-hình lối nhỏ rê: nền `--c-nen-re`.
  - Chính: nền `--nut-chinh-bg` (= `--c-chinh`), chữ `--c-chu-tren-chinh`; rê `--nut-chinh-bg-re` (#0b5c84); bấm giữ `--c-chinh-dam` (#082f49).
  - San hô: nền `--nut-san-ho-bg` (= `--c-nhan` #c0392b); rê `--nut-san-ho-bg-re` (#96271a).
  - Phụ: nền `--c-nen`, viền + chữ `--nut-phu-vien` (= `--c-chinh`); rê nền `--nut-phu-bg-re` (= `--c-nen-re`).
  - Phụ nguy hiểm: nền `--c-nen`, viền + chữ `--nut-nguy-hiem` (#b01235); rê nền `--tt-do-bg`.
  - Đỏ đặc: nền `--nut-nguy-hiem`, chữ trắng; rê `--c-nguy-hiem-re` (#8e0e2b).
  - Tắt (`aria-disabled="true"`): nền `--nut-tat-bg` (= `--c-nen-phu`), chữ `--nut-tat-chu` (= `--c-chu-phu`), viền trong suốt, `cursor: not-allowed`; lối nhỏ tắt: nền trong suốt.
  - Vòng quay: 16 (`--nut-quay`), nét 2 (`--nut-quay-net`), margin 2px (cứng), quay 700ms (`--cd-quay`); vòng mờ `--c-chinh-nhat`; trên nút đặc: `--nut-quay-mo` rgba(255,255,255,.3); phụ nguy hiểm: `--tt-do-bg`.
- Trạng thái và hành vi: bấm: `transform: scale(.98)` khi không tắt; chuyển 150ms (`--cd-nhanh`). Tắt dùng `aria-disabled` (không dùng thuộc tính `disabled`) nên vẫn nhận tiêu điểm; `aria-describedby` trỏ tới dòng lý do; JSX bọc nút + lý do trong `.ib-nut-boc` chỉ khi `tat && lyDoTat`. Đang tải: `aria-busy`, vòng quay thế chỗ biểu tượng, chữ giữ nguyên, chặn `onClick`, `cursor: progress`. `href` + tắt → vẫn vẽ `button`.
- Đổi theo khổ: không có quy tắc trong CSS nhóm (cỡ 52 ↔ 44 ở chân dính do `ThanhDinhDay`/`BangTruot` ép).
- Điểm khác thường hoặc tự quyết đáng chú ý: `line-height` nút là `--lh-phu` (20px) với chữ 16. Giá trị cứng: `text-underline-offset: 3px`, `margin: 2px` vòng quay. Prompt: san hô CHỈ hai chỗ; đỏ đặc CHỈ trong Hộp xác nhận (CSS không chặn, dựa vào quy ước).

### 02 Tab (`hanh-dong/tab`)
- Biến thể / props chính: `muc[]` ({id, nhan, dem?}), `chon`, `onChon`, `nhan` (aria-label nhóm), `rong` (chia đều, ≤ 3 mục). Một kiểu duy nhất.
- Kích thước: rãnh: đệm 4 (`--kc-1`), gap 2px (cứng), bo 999 (`--r-tron`), `max-width: 100%`, trượt ngang `overflow-x: auto`, giấu thanh cuộn; mục: min-height calc(44 − 2×4) = 36 (`--h-dieu-khien` − `--kc-1`), đệm 0 16 (`--tab-pad`), gap 6px (cứng), bo 999, chữ 16/20/500, `white-space: nowrap`; `::after` mở rộng vùng chạm `inset: -4px 0` (lên 44); đếm: min-width 20px, đệm 0 6px (cứng), chữ 12/18 (`--fs-huy-hieu`/`--lh-huy-hieu`), số đều.
- Màu / token: rãnh nền `--c-nen-phu`; mục thường chữ `--c-chu-phu`, nền trong suốt; đang chọn: nền `--c-nen`, chữ `--c-chinh`, bóng `--sh-the`; rê (chưa chọn): chữ `--c-chu`, nền `--c-nen-re`; đếm nền `--c-nen`, khi chọn `--c-chinh-nhat`; chuyển 150ms.
- Trạng thái và hành vi: `role="tablist"`/`role="tab"`, `aria-selected`, `tabIndex` 0 cho mục chọn, −1 còn lại; JSX chỉ xử lý click, không có phím mũi tên; không có trạng thái tắt.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--tab-pad` MỚI (0 16). Mục chấp nhận trường `xem` (lớp xem trước) ngoài d.ts.

### 03 Ô nhập (`nhap/o-nhap`)
- Biến thể / props chính: `kieu` = `chu` (text) | `so` (text, inputMode numeric) | `tien` (text, numeric, hậu tố "₫") | `sdt` (type tel, inputMode tel, autoComplete tel) | `ngay` (text, numeric, gợi ý mặc định "dd/mm/yyyy") | `gio` (text, numeric, gợi ý "hh:mm") | `chon` (`select`) | `nhieu-dong` (`textarea rows=4`); `nhan` (bắt buộc), `tuyChon` (thêm " (tuỳ chọn)"), `goiY`, `giaTri`/`macDinh`/`onDoi`, `loi`, `huongDan`, `tat` + `lyDoTat`, `dangTai`, `luaChon[]`, `co` = `thuong` | `lon`, `id`, `ten`. Xuất thêm `ghiTien()`.
- Kích thước: nhãn 14/20/500 (`--fs-phu`/`--lh-phu`/`--fw-nhan`), "(tuỳ chọn)" đậm 400; nhãn ↔ ô 6 (`--o-nhan-cach`); ô min-height 44 (`--o-h`), lớn 52 (`--o-h-lon`); đệm 0 12 (`--o-pad`); viền 1px; bo 8 (`--r-dieu-khien`); chữ 16/24/400; tiền: đệm phải 12 + 20px (cứng), hậu tố cách phải 12 (`--kc-3`); đang tải: đệm phải 12 + 24px (cứng); chọn: đệm phải 12 + 28px (cứng); nhiều dòng: min-height 96 (`--o-nhieu-dong-h`), đệm trên/dưới 10px (cứng), `resize: vertical`; câu lỗi 14/20, gap 6px (cứng), biểu tượng `alert` 16 margin-top 2px (cứng); hướng dẫn 14/20.
- Màu / token: thường: nền `--c-nen`, viền `--o-vien` (= `--c-vien-o` #c9d4e0), chữ `--c-chu`, gợi ý `--c-chu-goi-y` (#94a3b8, opacity 1); rê (không tắt, không lỗi): viền `--o-vien-re` (#94a3b8); tiêu điểm: `outline 3px --c-tieu-diem` cách 2 (`--vanh-tieu-diem`/`--vanh-cach`), áp cả `:focus` lẫn `:focus-visible`; lỗi: viền `--o-vien-loi` (= `--c-nguy-hiem`) + `box-shadow: inset 0 0 0 1px` cùng màu (đậm 2 không nhảy); tắt: nền `--c-nen-phu`, viền trong suốt, chữ `--c-chu-phu` (kèm `-webkit-text-fill-color`), opacity 1; câu lỗi màu `--tt-do-chu` (#8e0e2b); hậu tố "₫", mũi chọn, hướng dẫn: `--c-chu-phu`; vòng quay `--c-chinh-nhat` / `--c-chinh`.
- Trạng thái và hành vi: tắt dùng thuộc tính `disabled` thật (khác Nút: ô tắt không nhận tiêu điểm); `aria-invalid` khi lỗi; `aria-describedby` trỏ một dòng mô tả duy nhất: lỗi thắng; nếu không lỗi thì (tắt + lyDoTat) thay hướng dẫn. `select` kiểu chọn: `goiY` thành `<option value="">` đầu. `ghiTien(so)`: `Math.round(Number(so) || 0)` → `toLocaleString("vi-VN")` → thay mọi "," bằng "." → nối " ₫".
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--o-pad` MỚI (0 12), `--o-nhieu-dong-h` MỚI (96; mã 72). `ngay`/`gio` là `type="text"` + inputMode numeric, không phải `type="date"`/`"time"`. Tiền canh phải + `tabular-nums`. Không có kiểu mật khẩu/PIN trong tám kiểu.

### 04 Ô tích, ô chọn một, công tắc (`nhap/o-chon`)
- Biến thể / props chính: ba thành phần cùng khuôn dòng `.ib-chon`:
  - `OTich`: `nhan`, `moTa`, `chon`/`macDinh`/`onDoi(boolean)`, `tat` + `lyDoTat`, `loi` (chuỗi), `ten`, `giaTri`.
  - `OChonMot`: như trên + `ten` (bắt buộc, tên nhóm), `giaTri` (bắt buộc), `onDoi(giaTri)`, `loi` = boolean | string (chỉ string mới in câu). Bọc nhóm bằng `fieldset` + `legend` do người gọi.
  - `CongTac`: `nhan`, `moTa`, `bat`/`macDinh`/`onDoi(boolean)`, `tat` + `lyDoTat`, `ten`; `role="switch"`.
- Kích thước: dòng min-height 44 (`--h-cham`), đệm 10px 0 (cứng), gap 12 (`--kc-3`), `align-items: flex-start`; input gốc ẩn 1×1 px, opacity 0 (cứng). Ô tích 22×22 (`--tich-co`), viền 2px (cứng), bo 6px (cứng), margin-top 1px (cứng), dấu `check` 16. Ô chọn một 20×20 (`--chon-mot-co`), viền 2px (cứng), tròn, margin-top 2px (cứng); khi chọn viền 6 (`--chon-mot-vanh`). Công tắc 44×26 (`--cong-tac-w`/`--cong-tac-h`), bo 999, núm 20 (`--cong-tac-num`) cách mép 3 (`--cong-tac-cach`), khi bật dịch calc(44 − 20 − 2×3) = 18px; dòng công tắc `row-reverse`, `space-between`, `align-items: center`, gap 16 (`--kc-4`). Nhãn 16/24 (`--fs-noi-dung`/`--lh-noi-dung`); mô tả 14/20; chữ gap 2px (cứng); câu lỗi thụt trái calc(22 + 12).
- Màu / token: chưa chọn: hộp nền `--c-nen`, viền `--tich-vien` (= `--c-chu-phu` #475569, MỚI); chọn: ô tích nền + viền `--c-chinh`, dấu `--c-chu-tren-chinh`; ô chọn một viền 6px `--c-chinh`; công tắc nền tắt `--cong-tac-tat-bg` (= `--c-vien-o-re` #94a3b8, MỚI), bật `--c-chinh`, núm `--c-nen` + bóng `--sh-noi`, chuyển 200ms (`--cd-vua`); rê (chưa chọn, không tắt, không phải công tắc): nền `--c-nen-re`; tiêu điểm: vành 3/2 `--c-tieu-diem` trên hộp khi input gốc `:focus-visible`; lỗi: viền `--c-nguy-hiem` (ô tích, ô chọn một), câu lỗi `.ib-o__loi` màu `--tt-do-chu`; tắt: hộp nền `--c-nen-phu`, viền `--c-vien-o`; tắt + chọn: ô tích nền + viền `--c-vien-o`, dấu `--c-chu-phu`; ô chọn một viền `--c-vien-o`; công tắc nền `--c-vien-o`; nhãn `--c-chu-phu`; `cursor: not-allowed`.
- Trạng thái và hành vi: cả ba dùng `disabled` thật khi tắt (không nhận tiêu điểm); `aria-describedby` → lỗi hoặc (tắt + lý do) hoặc mô tả; OTich: khi có lỗi thì mô tả bị ẩn và `aria-invalid`; OChonMot: `aria-invalid` khi `loi` truthy; CongTac không có lỗi. Hover công tắc: không đổi màu (bị loại khỏi bộ chọn rê).
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: ô tích bo 6px ghi cứng, trong khi readme ghi "Bốn bậc bo: 8 nút, ô, ô tích (`--r-dieu-khien`)" và bảng BỎ ghi "Bo 6 (nhỏ) → 8". `--tich-vien` và `--cong-tac-tat-bg` MỚI với lý do tương phản (ghi trong `thanh-phan.css`). CSS không có `--chon-mot-*` cho nền tâm (tâm trắng là nền hộp hiện qua viền 6px).

### 05 Bộ đếm − / + (`nhap/bo-dem`)
- Biến thể / props chính: `nhan` (bắt buộc), `giaTri` (mặc định 0), `min` (mặc định 0), `max` (mặc định 99), `onDoi`, `huongDan`, `tat` + `lyDoTat`.
- Kích thước: nhãn dùng `.ib-o__nhan` 14/20/500; nhãn ↔ hàng 6 (`--o-nhan-cach`); hàng gap 4 (`--kc-1`); nút 44×44 (`--dem-nut`), viền 1px, bo 8 (`--r-dieu-khien`), biểu tượng `minus`/`plus` 20; ô số rộng 48 (`--dem-o`), chữ 20 (`--dem-fs` = `--co-9`) / 24 (`--lh-noi-dung`) / 600 (`--fw-tieu-de`), số đều, canh giữa.
- Màu / token: nút nền `--c-nen`, viền `--c-vien-o`, biểu tượng `--c-chinh`; rê: nền `--c-nen-re`, viền `--c-vien-o-re`; bấm: `scale(.96)`; tắt (`aria-disabled`): nền `--nut-tat-bg`, chữ `--nut-tat-chu`, viền trong suốt; ô số `--c-chu`, khi tắt `--c-chu-phu`.
- Trạng thái và hành vi: ở biên (`giaTri <= min` / `>= max`) nút tương ứng tự `aria-disabled` (vẫn nhận tiêu điểm); `<output aria-live="polite">`; hàng `role="group"` có `aria-labelledby` nhãn và `aria-describedby` dòng dưới; nút có `aria-label` "Bớt một <nhãn>" / "Thêm một <nhãn>"; dòng dưới = `lyDoTat` (khi tắt) hoặc `huongDan`, dùng lớp `.ib-o__huong-dan`.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: d.ts ghi "số nhỏ (0–20)", JSX mặc định `max = 99`. Biểu tượng `minus` MỚI chỉ dùng ở đây.

### 06 Chip bấm được (`hanh-dong/chip`)
- Biến thể / props chính: `chon`, `tat`, `dem`, `bieuTuong` (16, chỉ khi chưa chọn; khi chọn luôn là `check` 16), `onClick`, `children`.
- Kích thước: cao 36 (`--chip-h`), đệm 0 12 (`--chip-pad`), viền 1px, bo 999 (`--r-tron`), gap 6px (cứng), chữ 14/20/500 (`--fs-phu`/`--lh-phu`/`--fw-nhan`), nowrap; `::after` mở vùng chạm `inset: calc((36 − 44)/2) 0` = −4px (lên 44, `--h-cham`); số đếm đậm 400 (`--fw-noi-dung`), số đều.
- Màu / token: thường: nền `--c-nen`, viền `--c-vien-o`, chữ `--c-chu`, đếm `--c-chu-phu`; chọn: nền `--c-chinh-nhat`, viền trong suốt, chữ `--c-chinh`, đếm `inherit`; rê chưa chọn: nền `--c-nen-re`, viền `--c-vien-o-re`; rê đã chọn: `--c-chinh-nhat-re`; tắt: nền `--nut-tat-bg`, chữ `--nut-tat-chu`, viền trong suốt, `not-allowed`; chuyển 150ms.
- Trạng thái và hành vi: `button` với `aria-pressed`; tắt dùng `aria-disabled` + chặn `onClick`; không có trạng thái lỗi/tải.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--chip-h` 36 MỚI ("lấy từ `--h-muc-nho` 36 của mã"), `--chip-pad` MỚI. Prompt: lý do tắt không ghi ở chip mà ở dòng kết quả của CumTimLoc.

### 07 Huy hiệu trạng thái năm tông (`hien-thi/huy-hieu`)
- Biến thể / props chính: `trangThai` (một trong 23 khoá) được ưu tiên; `ton` = `cat` | `bien` | `la` | `do` | `xam` + `children` chỉ khi khoá chưa có; không `trangThai` hợp lệ và không `ton` → mặc định `xam`. Xuất `TU_VUNG_TRANG_THAI` và `BIEU_TUONG_TONG` ({cat: clock, bien: swap, la: check, do: alert, xam: ban}).
- Từ vựng 23 khoá (tông · chữ): cát: `cho-xac-nhan` Chờ xác nhận · `chua-xep` Chưa xếp · `sap-het-han` Sắp hết hạn · `chua-ai-nhan` Chưa ai nhận · `ve-moi` Vé mới; biển: `dang-xu-ly` Đang xử lý · `dang-chay` Đang chạy · `da-xep` Đã xếp · `da-giao` Đã giao; lá: `da-xac-nhan` Đã xác nhận · `hoan-tat` Hoàn tất · `con-han` Còn hạn · `da-thu-du` Đã thu đủ · `ve-xong` Vé xong; đỏ: `da-huy` Đã huỷ · `tu-choi` Từ chối · `het-han` Hết hạn · `qua-han` Quá hạn · `giu-lai` Giữ lại; xám: `nhap` Nháp · `ngung-dung` Ngưng dùng · `da-khoa` Đã khoá · `khong-con-trong-sheet` Không còn trong Sheet.
- Kích thước: đệm 3 8 3 6 (`--huy-hieu-pad`), bo 999, chữ 12/18/500 (`--fs-huy-hieu`/`--lh-huy-hieu`/`--fw-nhan`) → cao 24; gap 4px (cứng); biểu tượng 14 (`--huy-hieu-bt`); nowrap; `vertical-align: middle`.
- Màu / token: cặp nền/chữ theo tông `--tt-<tông>-bg` / `--tt-<tông>-chu` (giá trị ở bảng tra đầu phiếu).
- Trạng thái và hành vi: không bấm được, không rê, không tắt; `span` thuần, không aria.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--huy-hieu-pad`, `--huy-hieu-bt` MỚI. Từ vựng 23 trạng thái MỚI (prompt: "Trạng thái mới: thêm vào từ vựng, không tự chế").

### 08 Thẻ (`hien-thi/the`)
- Biến thể / props chính: `tieuDe`, `phu`, `sau`, `chan` (không dùng cùng `bamDuoc`), `bamDuoc`, `href`, `onClick`, `dangTai`, `children`. Phần tử: `section` (thường) · `a` (bấm được có href) · `button` (bấm được không href).
- Kích thước: đệm 16 (`--pad-the`), gap 12 (`--kc-3`), bo 12 (`--r-the`), viền 0, `width: 100%`; ≥ 900: đệm 24 (`--pad-the-rong`), gap 16 (`--kc-4`); tiêu đề `h3` 16 (`--fs-tieu-de-khoi`) / 24 (`--lh-noi-dung`) / 600, ≥ 900: 18 (`--fs-tieu-de-khoi-rong`), `text-wrap: pretty`; phụ 14/20; đầu gap 12, chữ đầu gap 2px (cứng); `sau` gap 8; thân gap 8; chân: padding-top 12, kẻ trên 1px, nút canh phải, `flex-wrap`, gap 8.
- Màu / token: nền `--c-nen`, bóng `--sh-the`, chữ `--c-chu`, phụ và mũi `--c-chu-phu`, kẻ chân `--c-vien`; bấm được: rê nền `--c-nen-re` (không nổi bóng), bấm `scale(.99)` + nền `--c-nen-phu`, chuyển 150ms.
- Trạng thái và hành vi: `bamDuoc` → thêm mũi `next` 20 bên phải (`.ib-the__mui`, `align-self: center`); `dangTai` → thân có `aria-busy="true"` nhưng JSX không tự chèn `KhungXuong` (children do người gọi truyền).
- Đổi theo khổ: ≥ 900 (`@container ib (min-width:900px)`): đệm 24, gap 16, tiêu đề 18.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--pad-the`/`--pad-the-rong` MỚI ("mã có 26 kiểu thẻ"). Prompt nói "dangTai: ruột là KhungXuong" — JSX chỉ đặt `aria-busy`. Không có biến thể viền hay thẻ nổi.

### 09 Dòng danh sách (`hien-thi/dong-danh-sach`)
- Biến thể / props chính: `tieuDe` (bắt buộc), `phu`, `dong3`, `truoc`, `sau`, `bamDuoc`, `href`, `onClick`, `chuaDoc`. Phần tử: `div` · `a` · `button`.
- Kích thước: min-height 44 (`--h-dong`), đệm 12 16 (`--pad-dong`), gap 12 (`--kc-3`), kẻ dưới 1px, `width: 100%`; tiêu đề 16/24/500 (`--fw-nhan`), `overflow-wrap: anywhere`, `text-wrap: pretty`, gap trong tiêu đề 8 (`--kc-2`), `align-items: baseline`; phụ và dòng 3: 14/20, `overflow-wrap: anywhere`; chữ gap 2px (cứng); `sau`: cột canh phải, gap 4, số đều; chấm chưa đọc 8×8 (cứng), dịch lên 2px.
- Màu / token: nền trong suốt, chữ `--c-chu`, `truoc`/phụ/mũi `--c-chu-phu`, kẻ `--c-vien`; bấm được: rê `--c-nen-re`, bấm `--c-nen-phu`, chuyển 150ms; chưa đọc: nền `--thong-bao-chua-doc-bg` (#f4f9fd), chấm `--c-chinh`.
- Trạng thái và hành vi: chấm chưa đọc có `role="img"` `aria-label="Chưa đọc"`; mũi `next` khi bấm được; không có trạng thái tắt/chọn.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `dong3` dùng lớp `.ib-dong__phu .ib-dong__dong3` — lớp `ib-dong__dong3` không có trong CSS. Prompt: "tối đa ba dòng chữ, tên dài xuống dòng không cắt".

### 10 Bảng máy tính (`hien-thi/bang-du-lieu`)
- Biến thể / props chính: `cot[]` ({khoa, nhan, can: trai|phai, gon, rong, hien(dong)}), `dong[]`, `khoa` (mặc định "id"), `hanhDong(dong)`, `nhanHanhDong` (mặc định "Thao tác", ẩn bằng `.ib-an`), `theBaDong(dong)` → {dong1, sau1, dong2, dong3}, `dangTai`, `soDongXuong` (mặc định 4), `rong` (node khi rỗng), `caoToiDa` (cuộn trong), `nhan` (aria-label).
- Kích thước (≥ 900, `.ib-bang__cuon` + `table`): khung bo 12 (`--r-the`), `overflow: auto`, `max-height` = `caoToiDa`; `th` dính `top: 0`, z 10 (`--z-dinh`), cao 44 (`--bang-hang-h`), đệm 0 12, chữ 14/20/500, nowrap, kẻ dưới 1px; `td` cao 44, đệm 8 12 (`--kc-2 --kc-3`), kẻ dưới 1px, hàng cuối không kẻ; cột đầu đệm trái 16 (`--kc-4`); `.is-phai` canh phải + số đều + nowrap; `.is-gon` nowrap; cột hành động `width: 1%`, canh phải, đệm phải 8, nút bên trong min-height 36px (cứng); ô rỗng đệm 32 16 (`--kc-6 --kc-4`) canh giữa. Kích thước (< 900, `.ib-bang__the`): khung bo 12, `overflow: hidden`; mục đệm 12 16 (`--pad-dong`), gap 2px (cứng), kẻ dưới; dòng 1 đậm 500, `space-between`, gap 12; dòng 2: 14/20; dòng 3 `space-between`, số đều, cụm hành động `margin-right: −8`, nút min-height 36px (cứng), gap 4.
- Màu / token: nền `--c-nen`, bóng `--sh-the`; `th` nền `--c-nen-phu` chữ `--c-chu-phu`; `td` chữ `--c-chu`; kẻ `--c-vien`; rê hàng: `td` nền `--c-nen-re`; dòng 2 thẻ `--c-chu-phu`.
- Trạng thái và hành vi: `dangTai` → bảng: `soDongXuong` hàng, mỗi ô một `KhungXuong` dòng rộng 80% (70% nếu cột phải); thẻ: mỗi mục `KhungXuong` 3 dòng; `aria-busy`. Rỗng → `rong` trong một `td colSpan` / một `div`. Không có sắp xếp cột, chọn hàng, hay nhóm trong JSX. Cả hai khối (bảng và thẻ) đều được vẽ, CSS ẩn/hiện bằng container.
- Đổi theo khổ: < 900: chỉ `.ib-bang__the` hiện (bảng và `.ib-bang__cuon` `display: none`); ≥ 900: `.ib-bang__cuon` `display: block`, `table` `display: table`, thẻ ẩn. Không có mức riêng cho 768.
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt "Cần khung ứng dụng `.ib-khung`"; không có khung = thẻ ba dòng. Nút trong bảng 36 (cứng) thấp hơn `--nut-h` 44.

### 11 Cụm Tìm + Lọc + Sắp xếp + Tải thêm (`dieu-huong/cum-tim-loc`)
- Biến thể / props chính: `nhanTim` (mặc định "Tìm đơn"), `tuKhoa`/`onTim`, `goiY` (mặc định "Tìm theo tên, số điện thoại, mã đơn"), `loc[]` ({id, nhan, dem}) + `locChon[]` + `onLoc(id)`, `sapXep` + `luaChonSapXep[]` ({giaTri, nhan}) + `onSapXep`, `ketQua` (node), `onXoaLoc`, `dangTim`. "Tải thêm" là thành phần 24 `PhanTrang` đặt cuối danh sách, không nằm trong JSX này.
- Kích thước: cụm cột gap 12; hàng `flex-wrap`, `align-items: flex-end`, gap 12; ô tìm dùng khuôn Ô nhập (`.ib-o`, nhãn 14/20/500, ô 44, bo 8), `flex: 1 1 100%`; kính `search` 20 cách trái 12 (`--kc-3`); ô đệm trái 12 + 28px (cứng), đệm phải 44 (`--h-cham`); nút xoá 44×44, `close` 18; sắp xếp: nhãn "Sắp xếp" 14/20/500, `select` min-height 44, đệm 0 (8 + 22px cứng) 0 8, viền 0, bo 8, chữ 16/500, mũi `chevron-down` 18 cách phải 8, `margin-left: auto`; hàng chip gap 8, đệm 4px 0 / margin −4px 0 (cứng), cuộn ngang giấu thanh cuộn; dòng kết quả min-height 44, chữ 14, gap 8, nút "Xoá bộ lọc" lối nhỏ chữ 14.
- Màu / token: kính, nút xoá, nhãn sắp xếp, dòng kết quả: `--c-chu-phu`; `select` và mũi sắp xếp: `--c-chinh`, nền trong suốt, rê `--c-nen-re`; ô tìm theo Ô nhập.
- Trạng thái và hành vi: `input type="search"`, `enterKeyHint="search"`, bỏ nút cancel mặc định WebKit; có chữ → nút xoá (`aria-label="Xoá chữ tìm"`, gọi `onTim("")`); `dangTim` → vòng quay `.ib-o__quay` thay nút xoá; khối sắp xếp chỉ hiện khi `luaChonSapXep.length`; hàng chip `role="group" aria-label="Lọc"`; dòng kết quả `aria-live="polite"`; "Xoá bộ lọc" chỉ khi `locChon.length && onXoaLoc`.
- Đổi theo khổ: ≥ 900: ô tìm `flex: 0 1 420px` (cứng), hàng chip `flex-wrap` và `overflow: visible`.
- Điểm khác thường hoặc tự quyết đáng chú ý: không có bảng lọc nâng cao / ngày; mọi bộ lọc là chip. Ô tìm có nhãn hiện "Tìm đơn" (readme chỉ nêu gợi ý trong ô).

### 12 Bảng trượt / hộp thoại (`phan-hoi/bang-truot`)
- Biến thể / props chính: `mo` (mặc định true), `tieuDe` (bắt buộc), `moTa`, `chinh`/`phu` ({nhan, ...NutProps}; `cap` ghi đè được), `onDong`, `nhanDong` (mặc định "Đóng"), `trongKhung` (bản xem trước: `position: absolute`), `children`.
- Kích thước (< 768): lớp `.ib-lop` `position: fixed; inset: 0`, z 30 (`--z-bang-truot`), tự là `container: ib/inline-size`; tấm `width: 100%`, `max-height: 92%` (cứng), dính đáy (`margin-top: auto`), bo 18 18 0 0 (`--r-bang-truot`), đệm dưới `env(safe-area-inset-bottom)`; tay cầm 36×5 (cứng), margin-top 8, bo 999; đầu đệm 12 8 8 16, gap 12, chữ đầu đệm trên 10px (cứng), gap 4; tiêu đề `h2` 18 (`--fs-tieu-de-khoi-rong`) / 24 / 600, `text-wrap: balance`; mô tả 14/20; thân đệm 8 16 16, gap 16, `overflow: auto`, `overscroll-behavior: contain`; chân đệm 12 16, kẻ trên, mỗi nút `flex: 1 1 0`, cao 52 (`--nut-h-lon`).
- Màu / token: màn `--bang-man` (rgba(15,23,42,.45)); tấm nền `--c-nen`, bóng `--sh-lop-phu`; tay cầm `--c-vien-o`; mô tả, nút đóng `--c-chu-phu`; kẻ chân `--c-vien`.
- Trạng thái và hành vi: màn hiện dần `ib-mo` 200ms; tấm trượt lên `ib-len` 200ms (`--cd-vua` `--cd-cong`); `role="dialog" aria-modal="true"`, `aria-labelledby` tiêu đề, `aria-describedby` mô tả; Esc → `onDong` (listener trên `document`); bấm màn → `onDong`; khi mở focus vào tấm (`tabIndex=-1`), trừ khi `trongKhung`; không có bẫy tiêu điểm và không trả tiêu điểm về phần tử mở (JSX không làm); nút ✕ là Nút lối nhỏ chỉ hình `close`, chỉ hiện khi có `onDong`; chân: Phụ trước, Chính sau; `mo=false` → không vẽ gì.
- Đổi theo khổ: ≥ 768: `margin: auto` (giữa màn), `width: min(520px, 100% − 64)` (`--w-bang-truot`, `--kc-6`), `max-height: calc(100% − 96)` (`--kc-7`), bo 18 bốn góc, đệm dưới 0, hoạt ảnh `ib-hien` (hiện dần + trượt 8px + scale .98); tay cầm ẩn; đầu đệm 12 12 8 24; thân đệm 8 24 24; chân đệm 16 24, `justify-content: flex-end`, nút `flex: none`, cao 44 (`--nut-h`).
- Điểm khác thường hoặc tự quyết đáng chú ý: token `--bang-tay-cam: 36px 5px` được khai (MỚI) nhưng CSS ghi cứng 36px/5px. Ngưỡng 768 MỚI ("bảng trượt → hộp thoại"). Readme ghi chú: sản phẩm thật nên dựng ở gốc lớp phủ ngoài vùng cuộn.

### 13 Hộp xác nhận hành động một chiều (`phan-hoi/hop-xac-nhan`)
- Biến thể / props chính: dùng `BangTruot`; `tieuDe` (câu hỏi), `noiDung`, `hauQua` (mặc định "Việc này không hoàn tác được."), `nhanXacNhan` (bắt buộc), `nhanHuy` (mặc định "Không, quay lại"), `onXacNhan`, `onHuy` (đồng thời là `onDong`: Esc, màn, ✕), `dangTai`, `tatXacNhan` + `lyDoTat`, `trongKhung`, `children` (vd chọn lý do).
- Kích thước: ruột `.ib-xac-nhan` gap 12; vòng biểu tượng 44×44 (`--h-cham`) tròn, `alert` 24; chữ gap 4, đệm trên 2px (cứng); nội dung 16/24; hậu quả 14/20/500; phần còn lại theo Bảng trượt (chân 52 < 768, 44 ≥ 768).
- Màu / token: vòng biểu tượng nền `--tt-do-bg`, chữ `--tt-do-chu`; hậu quả chữ `--tt-do-chu`; nút xác nhận cap `do-dac` (nền `--nut-nguy-hiem` #b01235, chữ trắng, rê #8e0e2b); nút huỷ cap `phu`.
- Trạng thái và hành vi: nút xác nhận nhận `dangTai`, `tat`, `lyDoTat` (dòng lý do dưới nút); thứ tự chân: "Không, quay lại" (Phụ) rồi nút đỏ đặc (Chính).
- Đổi theo khổ: theo Bảng trượt (768).
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt ví dụ `hauQua="Không hoàn tác được."`, mặc định JSX "Việc này không hoàn tác được." Đây là chỗ duy nhất prompt cho phép `do-dac`.

### 14 Dải thông báo ba tông (`phan-hoi/dai-thong-bao`)
- Biến thể / props chính: `ton` = `bien` (mặc định) | `cat` | `do`; `tieuDe`; `hanhDong` ({nhan, onClick, bieuTuong, dangTai}); `onDong` (cho phép ẩn); `children` (nội dung).
- Kích thước: đệm 12 16 (`--kc-3 --kc-4`), gap 12, bo 12 (`--r-the`), viền 0, `align-items: flex-start`; biểu tượng 20 (mặc định BieuTuong) margin-top 2px (cứng); chữ gap 2px (cứng); tiêu đề 16/24/600; nội dung 14/20 — nếu nội dung là con đầu (không tiêu đề) thì 16/24; hành động: Nút lối nhỏ, margin 2px 0 −10px −8 (cứng + `--kc-2`), chữ gạch chân offset 3px; nút đóng lối nhỏ `close`, margin −10px −12px −10px 0 (cứng).
- Màu / token: biển `--tt-bien-bg`/`--tt-bien-chu`; cát `--tt-cat-bg`/`--tt-cat-chu`; đỏ `--tt-do-bg`/`--tt-do-chu`; nút lối nhỏ bên trong `color: inherit`.
- Trạng thái và hành vi: biểu tượng theo `BIEU_TUONG_TONG[ton]` (swap / clock / alert); `role="alert"` khi đỏ, `role="status"` còn lại; không tự đóng; nút đóng `aria-label="Ẩn thông báo"`.
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: chỉ ba tông (không có Xanh lá, Xám) — prompt: "Đã xong" dùng BaoXong.

### 15 Báo xong ngắn (`phan-hoi/bao-xong`)
- Biến thể / props chính: `mo` (mặc định true), `hoanTac` (có → nút "Hoàn tác"), `onDong`, `thoiGian` (ms, mặc định 3000), `giuNguyen` (xem trước: không tự đóng), `trongKhung`, `children` (câu "Đã …").
- Kích thước: lớp `.ib-bao-xong-lop` `fixed` trái/phải/đáy 0, z 40 (`--z-phu`), đệm 0 16, `pointer-events: none`, `container: ib/inline-size`; hộp `width: 100%`, `max-width: 360` (`--w-bao-xong`), min-height 52px (cứng), margin-bottom calc(56 + 12 + safe-area) (`--h-thanh-tab` + `--kc-3`), đệm 4 4 4 16, bo 12 (`--r-the`), gap 12; chữ 16/20 (`--lh-phu`), đệm 8 0; "Hoàn tác" min-height 44, đệm 0 12, chữ 16/500 gạch chân offset 3px (cứng); nút đóng 44×44, `close` 18; biểu tượng `check` 20.
- Màu / token: nền `--c-nen-toi` (#082f49), chữ `--c-chu-tren-toi` (#f8fafc), bóng `--sh-noi`; biểu tượng `--tt-la-bg` (#dcfce7); "Hoàn tác" chữ `--c-chinh-nhat` (#dcebf6); rê hai nút: `rgba(255,255,255,.1)` (cứng).
- Trạng thái và hành vi: hoạt ảnh `ib-hien` 200ms; tự gọi `onDong` sau `thoiGian` (3000 ms cứng trong JSX); dừng đếm khi rê chuột hoặc có tiêu điểm trong hộp; không tự đóng khi `giuNguyen` hoặc thiếu `onDong`; `role="status" aria-live="polite"`; `mo=false` → không vẽ.
- Đổi theo khổ: ≥ 900: margin-bottom 24 (`--kc-5`) (không còn chừa thanh tab).
- Điểm khác thường hoặc tự quyết đáng chú ý: token `--bao-xong-tg: 3s` được khai ("chốt §10") nhưng không CSS/JSX nào đọc; JSX dùng số 3000. Prompt: "Báo mới thay báo cũ", "không dùng để báo lỗi" (JSX không ép).

### 16 Dải trên trang (`phan-hoi/dai-tren-trang`)
- Biến thể / props chính: `ton` = `cat` (mặc định) | `bien` | `do`; `chiTiet`; `hanhDong` ({nhan, onClick, dangTai}); `thuGon` (điều khiển ngoài) / `macDinhThuGon` (mặc định false) / `onThuGon`; `children` (câu chính, bắt buộc).
- Kích thước: `position: relative`, z 10 (`--z-dinh`); ruột `max-width: 1280` (`--w-noi-dung`) giữa, min-height 44 (`--dai-tren-h` = `--h-cham`), đệm 0 4 0 16 (`--kc-1`, `--le-trang`), gap 8, `align-items: flex-start`; biểu tượng 20 margin-top 12px (cứng); chữ đệm 10px 0 (cứng), gap 2px (cứng); câu 14 (`--fs-phu`) / 24 (`--lh-noi-dung`) / 500; chi tiết 14/20; nút hành động lối nhỏ chữ 14 gạch chân offset 3px; nút gập lối nhỏ chỉ hình `chevron-down`, xoay 180° khi mở, 200ms.
- Màu / token: biển/cát/đỏ như Dải thông báo (`--tt-*-bg`/`--tt-*-chu`); nút lối nhỏ `color: inherit`.
- Trạng thái và hành vi: thu gọn (`is-gon`): câu một dòng cắt "…" (`nowrap; overflow hidden; text-overflow ellipsis`), chi tiết ẩn; nút gập chỉ hiện khi có `chiTiet`, `aria-expanded`, `aria-label` "Mở thông báo" / "Thu gọn thông báo"; `role="alert"` khi đỏ, `status` còn lại; biểu tượng theo tông.
- Đổi theo khổ: ≥ 768: đệm trái 32 (`--le-trang-rong`).
- Điểm khác thường hoặc tự quyết đáng chú ý: z dùng `--z-dinh` (10); token `--z-tren-cung` (50, "dải trên trang khi khẩn, bảo trì") được khai nhưng không dùng. Không `position: sticky` — chỉ `relative`.

### 17 Đầu trang (`dieu-huong/dau-trang`)
- Biến thể / props chính: `tieuDe` (bắt buộc, `h1`), `phu`, `quayLai` ({nhan, href?, onClick?} → `a` hoặc `button`), `huyHieu` (đặt trong `h1`), `hanhDong` (tối đa 1 Chính + 1 Phụ; điện thoại thì để ở ThanhDinhDay — quy ước, CSS không ẩn).
- Kích thước: `header` cột gap 8; lối lùi: min-height 44, margin −8 0 −8 −4, đệm 0 8 0 4 (`--kc-*`), bo 8, chữ 16/500, `back` 20, gap 4; hàng `flex-wrap`, `align-items: flex-end`, `space-between`, gap 12; khối chữ `flex: 1 1 240px` (cứng), gap 4; tiêu đề 20 (`--fs-tieu-de-trang`) / 1.16 (`--lh-tieu-de`) / 600, `text-wrap: balance`, `flex-wrap`, gap 8 với huy hiệu; phụ 14/20; hành động `flex-wrap` gap 8.
- Màu / token: lối lùi `--c-chinh`, rê gạch chân offset 3px (cứng); tiêu đề `--c-chu`; phụ `--c-chu-phu`.
- Trạng thái và hành vi: không có trạng thái; `h1` chứa cả huy hiệu (bọc `.ib-dau-trang__hh`).
- Đổi theo khổ: ≥ 900: tiêu đề 24 (`--fs-tieu-de-trang-rong`).
- Điểm khác thường hoặc tự quyết đáng chú ý: lớp `.ib-dau-trang__hh` không có trong CSS. Tiêu đề đổi cỡ ở 900, trong khi `trang.css` (25/26) đổi cùng token ở 768.

### 18 Thanh dính đáy (`dieu-huong/thanh-dinh-day`)
- Biến thể / props chính: `tomTat` (node, vd tiền), `children` (1–2 Nút: Phụ trước, Chính sau).
- Kích thước: `position: sticky; bottom: 0`, z 10 (`--z-dinh`), kẻ trên 1px, đệm 12 16 calc(12 + safe-area) (`--kc-3`, `--le-trang`); ruột cột gap 8, `max-width: 1280` giữa; tóm tắt 14/20, `align-items: baseline`, `space-between`, gap 12; hàng nút gap 12, mỗi con `flex: 1 1 0`, nút cao 52 (`--nut-h-lon`), nút trong `.ib-nut-boc` rộng 100%.
- Màu / token: nền `--c-nen`, kẻ `--c-vien`, tóm tắt `--c-chu-phu`.
- Trạng thái và hành vi: chỉ bọc bố cục; không tự ẩn thanh tab dưới (prompt: "Trang có thanh dính đáy thì ẩn thanh tab dưới" — do trang làm).
- Đổi theo khổ: ≥ 768: đệm 12 32 (`--le-trang-rong`), không cộng safe-area; ruột thành hàng, `align-items: center`, `space-between`, gap 24 (`--kc-5`); cụm nút `margin-left: auto`, mỗi nút `flex: none`, cao 44 (`--nut-h`).
- Điểm khác thường hoặc tự quyết đáng chú ý: ngưỡng 768 (không phải 900).

### 19 Thanh trên (`dieu-huong/thanh-tren`)
- Biến thể / props chính: `ten` (mặc định "Island Booking System"), `logo` (đường dẫn, `img` 30×30 `alt=""`), `onTaoDon` (có → nút San hô "Tạo đơn" với `plus`, chỉ hiện ≥ 768), `soThongBao` (mặc định 0; > 99 hiện "99+"), `chuTat` (có → vòng chữ tắt; không → biểu tượng `me`), `onTroLy`, `onChuong`, `onTaiKhoan`.
- Kích thước: `position: sticky; top: 0`, z 10, cao 60 (`--h-thanh-tren`), đệm 0 4 0 16, gap 8, kẻ dưới 1px; hiệu: gap 8, bo 8; logo 30×30 (cứng) bo 8; tên 16 (`--co-5`) / 24 / 600, cắt "…"; cụm phải gap 0; nút tròn 44×44 (`--h-cham`) bo 999, biểu tượng 24; số thông báo: `top: 4px; right: 2px`, min-width 18, cao 18, đệm 0 5, line-height 18 (cứng), chữ 12/500, vòng ngoài `box-shadow: 0 0 0 2px`; chữ tắt 32×32 (cứng) tròn, viền 1.5px (cứng) `currentColor`, chữ 14/600, line-height 1; nút Tạo đơn margin-right 8.
- Màu / token: nền `--vo-bg` (trắng), chữ `--vo-chu` (#0c4a6e), kẻ `--vo-vien` (#e1e7ef); mọi thứ trong thanh `color: inherit` / `currentColor`; rê nút tròn: `color-mix(in srgb, currentColor 10%, transparent)` (cứng); số thông báo nền `--c-nguy-hiem`, chữ `--c-chu-tren-chinh`, vòng ngoài màu `--vo-bg`.
- Trạng thái và hành vi: thứ tự bên phải: Tạo đơn (≥ 768) → Trợ lý (`chat`, `aria-label="Trợ lý"`) → Chuông (`bell`, `aria-label` "Thông báo, N tin chưa đọc" / "Thông báo") → Tài khoản (`aria-label="Tài khoản"`); hiệu là `a href="#"` với `aria-label` "<tên> — Trang chủ"; số thông báo `aria-hidden`.
- Đổi theo khổ: ≥ 768: đệm 0 16 0 24 (`--kc-4`, `--kc-5`), tên 17 (`--co-6`), cụm phải gap 4, nút "Tạo đơn" hiện (`display: inline-flex`).
- Điểm khác thường hoặc tự quyết đáng chú ý: tên dùng trực tiếp token gốc `--co-5`/`--co-6` (tầng 1), trái quy ước ghi ở `goc.css` "thành phần KHÔNG dùng trực tiếp tầng này". Prompt: không ô tìm, không tab, không nút nổi trên thanh.

### 20 Thanh tab dưới (`dieu-huong/thanh-tab-duoi`)
- Biến thể / props chính: `muc[]` ({id, nhan, bieuTuong, dem?, href?}; 4–5 mục), `chon` (bắt buộc), `onChon`.
- Kích thước: `position: sticky; bottom: 0`, z 20 (`--z-tab`), min-height calc(56 + safe-area) (`--h-thanh-tab`), đệm 0 4 safe-area, kẻ trên 1px, `align-items: stretch`; mục `flex: 1 1 0`, cột, gap 2px (cứng), đệm 4px 0 6px (cứng); viên 56×32 (cứng) bo 999, biểu tượng 24; nhãn 12/18/500 nowrap; đếm: `top: 0; left: 32px`, min-width 18, cao 18, đệm 0 5, line-height 18 (cứng), vòng ngoài 2px.
- Màu / token: nền `--thanh-tab-bg` (rgba(255,255,255,.86)), `backdrop-filter: blur(16px) saturate(1.4)` (`--thanh-tab-mo`; 1.4 cứng), kẻ `--c-vien`; mục chữ `--c-chu-phu`; chọn: chữ `--c-chinh`, viên nền `--c-chinh-nhat`; đếm nền `--c-nguy-hiem`, chữ trắng, vòng ngoài `--c-nen`; chuyển viên 150ms.
- Trạng thái và hành vi: `nav aria-label="Điều hướng chính"`; mục là `a` (href hoặc "#"), `aria-current="page"` khi chọn; có `onChon` → `preventDefault`; đếm > 99 hiện "99+", `aria-label` "N mục mới"; không có rê.
- Đổi theo khổ: không có quy tắc CSS (readme: dùng ở điện thoại và 768; ≥ 900 dùng ThanhBen — do trang quyết).
- Điểm khác thường hoặc tự quyết đáng chú ý: token `--thanh-tab-den: 56px 32px` (MỚI) được khai nhưng CSS ghi cứng 56px/32px. `--thanh-tab-mo` 16px MỚI.

### 21 Thanh bên nhóm gập (`dieu-huong/thanh-ben`)
- Biến thể / props chính: `nhom[]` ({id, nhan?, muc[]}; nhóm không `nhan` = không tiêu đề, không gập), `chon`, `onChon`, `moSan[]` (mặc định: nhóm chứa mục đang chọn), `chan[]` (mặc định: Của tôi `me` · Hỗ trợ `handset` · Hướng dẫn `help`), `nguoi` ({ten, vaiTro, chuTat}).
- Kích thước: rộng 248 (`--w-thanh-ben`), cao 100%, cột; vùng cuộn đệm 12 12 8; danh sách gap 2px (cứng); nhóm margin-top 12; đầu nhóm: cao 36px (cứng), đệm 0 12, bo 8, chữ 14/500, gap 8, mũi `chevron-down` 18 xoay −90° khi đóng (200ms), chấm 6×6 (cứng); mục: min-height 40 (`--thanh-ben-muc-h`), đệm 0 12, bo 8, gap 12, chữ 16/20/500, biểu tượng 20, ô thụt 20px (cứng) khi không biểu tượng; vạch chọn rộng 3 (`--thanh-ben-vach`), `top: 10px; bottom: 10px` (cứng), bo 999; đếm min-width 22, đệm 0 6 (cứng), chữ 12/18/500; chân đệm 8 12 12, kẻ trên; người: gap 12, margin-top 8, đệm 8 12; chữ tắt 32×32 (cứng) tròn, 14/600; tên 14/20/500; vai 400.
- Màu / token: nền `--c-nen-phu`, chữ `--c-chu`; đầu nhóm chữ `--c-chu-phu`, rê nền `--c-nen` (trắng); mục biểu tượng `--c-chu-phu`, rê (chưa chọn) nền `--c-nen`; chọn: nền `--c-chinh-nhat`, chữ + biểu tượng `--c-chinh`, rê `--c-chinh-nhat-re`, vạch `--c-tieu-diem` (#0891b2); chấm `--c-chinh`; đếm tông Cát (`--tt-cat-bg`/`--tt-cat-chu`); kẻ chân `--c-vien`; chữ tắt nền `--c-chinh-nhat` chữ `--c-chinh`; vai `--c-chu-phu`.
- Trạng thái và hành vi: `nav aria-label="Điều hướng"`; đầu nhóm `button aria-expanded`; nhóm đóng mà chứa mục đang chọn → chấm (`role="img" aria-label="Có mục đang mở"`); mục là `a` với `aria-current="page"`; trạng thái mở giữ trong `useState` (khởi tạo từ `moSan` hoặc nhóm chứa `chon`).
- Đổi theo khổ: không có quy tắc CSS (readme: ≥ 900).
- Điểm khác thường hoặc tự quyết đáng chú ý: rê mục dùng nền trắng `--c-nen` (vì nền thanh đã là `--c-nen-phu`), khác các thành phần khác dùng `--c-nen-re`. Prompt: tên nhóm viết thường đầu câu (BỎ `--ls-eyebrow` + IN HOA).

### 22 Khung xương (`hien-thi/khung-xuong`)
- Biến thể / props chính: `kieu` = `dong` (mặc định) | `so` | `vien`; `soDong` (mặc định 3); `rong` (số/chuỗi); `nhan` (mặc định "Đang tải").
- Kích thước: bọc cột gap 8, `width: 100%`; `vien` bọc `inline-flex`, width auto; khối bo 999 (`--r-tron`); dòng cao 12px, margin 6px 0 (cứng; nhịp 24), rộng theo chu kỳ 100% / 88% / 56% / 94% / 72% (JSX; `soDong = 1` → `rong` hoặc 100%; dòng đầu nhận `rong` nếu có); số: cao 26 (`--fs-so-lon`), rộng 7.5em (cứng), bo 8 (`--r-dieu-khien`) + một dòng 60% (JSX); viên: cao 24, rộng 96 (cứng).
- Màu / token: nền `--c-nen-phu`; hoạt ảnh `ib-nhip` 1.2s (`--cd-xuong`) `ease-in-out` lặp, opacity 1 → .55 → 1 (không quét sáng).
- Trạng thái và hành vi: `role="status" aria-label="Đang tải"`; `prefers-reduced-motion` → mọi animation 0ms (nen-tang.css, `!important`).
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: `--cd-xuong` MỚI (1,2 s). Prompt: không dùng cho tải < 300 ms (không ép bằng mã).

### 23 Trạng thái rỗng (`phan-hoi/trang-rong`)
- Biến thể / props chính: `bieuTuong` (mặc định `orders`), `cau` (bắt buộc), `phu`, `hanhDong` ({nhan, bieuTuong, onClick, cap: chinh (mặc định) | phu}).
- Kích thước: cột giữa, gap 8, đệm 32 16 (`--kc-6 --kc-4`), canh giữa; vòng 56×56 (cứng) tròn, margin-bottom 4, biểu tượng 24; câu 16/24/500, `text-wrap: balance`; phụ 14/20, `max-width: 36ch` (cứng), `text-wrap: pretty`; nút margin-top 8.
- Màu / token: vòng nền `--c-nen-phu`, biểu tượng `--c-chu-phu`; câu `--c-chu`; phụ `--c-chu-phu`.
- Trạng thái và hành vi: không có; một nút (Chính hoặc Phụ).
- Đổi theo khổ: không.
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt: lọc không khớp → `search` + nút Phụ "Xoá bộ lọc". Vòng 56 ở đây, 64 ở trang báo (25/26), 44 ở hộp xác nhận (13) — ba cỡ vòng biểu tượng, đều cứng.

### 24 Phân trang / tải thêm (`dieu-huong/phan-trang`)
- Biến thể / props chính: `kieu` = `tai-them` (mặc định) | `so-trang`; `daHien`, `tong` (bắt buộc), `donVi` (mặc định "đơn"), `dangTai`, `onTaiThem`; `trang` (mặc định 1), `coTrang` (mặc định 20), `onTrang`.
- Kích thước: `tai-them`: cột giữa, gap 8, đệm 16 0; đếm 14/20 số đều; nút Phụ `rong` `max-width: 360px` (cứng); dòng hết: `check` 16, gap 6px (cứng), min-height 44. `so-trang`: `nav` `flex-wrap`, `space-between`, gap 12, đệm 8 0; đếm 14/20; cụm số gap 2px (cứng); nút số min-width 44, cao 44 (`--h-cham`), đệm 0 8, bo 8, chữ 16/500, số đều; dấu "…" min-width 24px (cứng); nút trước/sau = Nút lối nhỏ chỉ hình `back`/`next` 44×44.
- Màu / token: đếm `--c-chu-phu`; nút số chữ `--c-chu`, rê `--c-nen-re`; chọn: nền `--c-chinh-nhat`, chữ `--c-chinh`, `box-shadow: inset 0 −2px 0 --c-chinh` (gạch dưới trong); "…" `--c-chu-phu`.
- Trạng thái và hành vi: `tai-them`: chữ "Đang hiện {daHien} / {tong} {donVi}" `aria-live="polite"`; `daHien >= tong` → "Đã hiện hết"; nút "Tải thêm" / "Đang tải…" với `dangTai`. `so-trang`: `aria-label="Phân trang"`; chữ "{từ}–{đến} / {tổng} {donVi}"; nút số `aria-current="page"`, `aria-label` "Trang N"; trước/sau tắt ở biên; thuật toán `trangHien`: ≤ 7 trang hiện hết; ngược lại {1, cuối, trang−1, trang, trang+1} chèn "…" khi cách > 1.
- Đổi theo khổ: không có quy tắc CSS (prompt: `tai-them` cho điện thoại, `so-trang` cho bảng máy tính — do trang chọn).
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt "Không cuộn vô tận tự tải". Tiêu đề thành phần 11 trong readme gộp "Tải thêm" nhưng mã nằm ở 24.

### 25 Trang mất mạng (`trang/trang-mat-mang`)
- Biến thể / props chính: `lanXemCuoi` (chuỗi), `dangThu`, `onThuLai`. Phần tử `main.ib-trang-bao`.
- Kích thước (khuôn `.ib-trang-bao` chung với 26): cột giữa, gap 12, `max-width: 440px` (cứng), `margin: 0 auto`, đệm 48 16 (`--kc-7`, `--le-trang`), canh giữa; vòng 64×64 (cứng) tròn, margin-bottom 8, biểu tượng 24; tiêu đề `h1` 20 (`--fs-tieu-de-trang`) / 1.16 / 600, `text-wrap: balance`; câu 16/24, `text-wrap: pretty`; phụ 14/20; cụm nút cột `stretch`, gap 8, `max-width: 320px` (cứng), margin-top 12; dòng mã margin-top 16, 14/20.
- Màu / token: vòng tông Cát (`--tt-cat-bg`/`--tt-cat-chu`) với `history`; tiêu đề `--c-chu`; câu và phụ `--c-chu-phu`.
- Trạng thái và hành vi: chữ cố định: tiêu đề "Đang ngoài mạng"; câu "Máy chưa lưu trang này từ lần xem trước. Kiểm tra kết nối mạng rồi bấm Thử lại."; có `lanXemCuoi` → "Lần đồng bộ gần nhất: …"; một nút Chính `swap` "Thử lại" / "Đang thử lại…" với `dangTai`.
- Đổi theo khổ: ≥ 768: `padding-top: 96px` (cứng), tiêu đề 24 (`--fs-tieu-de-trang-rong`), cụm nút thành hàng giữa, `max-width: none`.
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt: chỉ dùng khi chưa có bản lưu; có bản lưu → dữ liệu cũ + Dải trên trang Cát. Không hiện chữ kỹ thuật.

### 26 Trang không quyền / không có trang (`trang/trang-loi`)
- Biến thể / props chính: `loai` = `khong-co-trang` (mặc định) | `khong-quyen`; `duongDan` (hiện chữ máy `.ib-so`); `onVeTrangChu`; `onPhu`. Cùng khuôn `.ib-trang-bao` với 25.
- Kích thước: như 25; vòng 64 nền xám (không tông Cát); hai nút: Chính `home` "Về Trang chủ" + lối nhỏ; dòng mã 14/20 margin-top 16.
- Màu / token: vòng `--c-nen-phu` / `--c-chu-phu`; còn lại như 25.
- Trạng thái và hành vi: chữ cố định theo `LOAI`: `khong-quyen`: `lock`, "Bạn chưa có quyền xem trang này", "Trang này dành cho vai trò khác. Nếu công việc cần, nhờ quản trị cấp thêm quyền.", lối nhỏ "Nhờ cấp quyền", mã "403"; `khong-co-trang`: `search`, "Không có trang này", "Địa chỉ có thể gõ sai, hoặc trang đã chuyển chỗ. Dữ liệu của bạn vẫn còn nguyên.", lối nhỏ "Báo địa chỉ sai", mã "404"; dòng cuối "Mã 403/404 · <đường dẫn chữ máy>" (đường dẫn chỉ khi có `duongDan`); `loai` lạ → rơi về `khong-co-trang`.
- Đổi theo khổ: ≥ 768 như 25.
- Điểm khác thường hoặc tự quyết đáng chú ý: prompt "mã lỗi chỉ là dòng nhỏ", "Không in dòng mã lỗi thô; giữ thanh trên và điều hướng" — JSX in "Mã 404 · /đường-dẫn" ở dòng nhỏ 14; thanh trên/điều hướng do trang bọc ngoài.

---

## Bảng Từ mã / MỚI / BỎ (từ `guidelines/tu-ma-moi-bo.html`)

Dòng mở đầu trang: "9 nhóm chép nguyên · 15 mục thêm · 13 mục đề nghị bỏ hoặc gộp."

| Loại | Nội dung | Lý do (nguyên văn) |
|---|---|---|
| Từ mã | 40 màu mục 8 (Biển, San hô, Cát, Xanh lá, Đỏ, Đầm phá, Nền, Chữ, Viền, Màn mờ, Điểm lẻ) | Chép nguyên hex. Điểm lẻ xếp vào tầng Thành phần. |
| Từ mã | Thang cỡ 14 bậc 12→32, dòng 1,16 / 18 / 20 / 22 / 24 | Giữ nguyên. Thành phần v2 dùng 12 · 14 · 16 · 17 · 18 · 20 · 24 · 26. |
| Từ mã | Khoảng cách 4 · 8 · 12 · 16 · 24 · 32 · 48 | --kc-1 … --kc-7 (mã cũ --s1 … --s7). |
| Từ mã | Bo 8 · 12 · 18 · 999 | Bốn bậc của tầng gốc (§5). |
| Từ mã | Bóng thẻ · nổi · lớp phủ | Ba mức của tầng gốc (§5). |
| Từ mã | Đường cong cubic-bezier(.22,1,.36,1); chiều cao 44 / 52 / 60; lớp xếp 10–50 | Chép nguyên. |
| Từ mã | Phông Be Vietnam Pro + dự phòng; chữ máy ui-monospace, Menlo, Consolas | Tệp woff2 chép từ public/fonts. |
| Từ mã | 37 biểu tượng (web/icons.ts) | Chép đúng path; tệp SVG rời ở assets/icons. |
| Từ mã | Giá trị trong app.css ngoài mục 8: thanh tab 56, thanh bên 248, mục thanh bên 40, hộp thoại 520, báo xong 360, bộ đếm 44/48, công tắc 44×26 núm 20 cách 3, ô tích 22, ô chọn một 20 / vành 6, vòng quay 16/2/700 ms, nhãn↔ô 6 | Có sẵn trong mã đang chạy; ghi nguồn "từ mã". |
| MỚI | --vanh-cach 2px | Vành tiêu điểm không đè lên viền ô và nút. |
| MỚI | --pad-the 16 / --pad-the-rong 24 · --le-trang 16 / 32 · --gap-khoi 24 | Mã có 26 kiểu thẻ với đệm khác nhau; cần một đệm, một lề, một nhịp. |
| MỚI | --nut-pad 0 16 · --o-pad 0 12 · --chip-pad · --tab-pad | Một đệm ngang cho mỗi loại điều khiển (86 kiểu nút cũ). |
| MỚI | --chip-h 36 (vùng chạm vẫn 44) | Chip gọn hơn ô để hàng lọc không chiếm chỗ; lấy 36 từ --h-muc-nho. |
| MỚI | --huy-hieu-pad 3/8/3/6 (cao 24) · --huy-hieu-bt 14 | Một hình huy hiệu thay 24 kiểu; cao 24 nằm gọn trong dòng 44. |
| MỚI | --tich-vien → #475569 | Viền #c9d4e0 chỉ 1,5:1 trên trắng; ô tích/chọn một cần 3:1 để thấy ngoài nắng. |
| MỚI | --cong-tac-tat-bg → #94a3b8 | Núm trắng trên nền #c9d4e0 gần như mất. |
| MỚI | --o-nhieu-dong-h 96 | Ô ghi chú 4 dòng; mã có 72 cho 3 dòng. |
| MỚI | --thanh-tab-mo 16px · --thanh-tab-den 56×32 | Kính mờ một lớp; viên chỉ báo để tab đang chọn không chỉ khác màu. |
| MỚI | --bang-tay-cam 36×5 | Tay cầm báo bảng trượt kéo được (chuẩn iOS). |
| MỚI | --cd-xuong 1,2 s | Khung xương là vòng lặp, không theo 150/200. |
| MỚI | Biểu tượng minus | Bộ đếm cần nút "−"; bộ cũ không có. Vẽ bằng nửa ngang của plus. |
| MỚI | Ngưỡng 768 (bảng trượt → hộp thoại; "+ Tạo đơn" lên thanh trên) | Ngưỡng 900 đã chốt cho bảng/thanh bên; 768 là khổ máy tính bảng phải kiểm. |
| MỚI | Khung ứng dụng .ib-khung (container "ib") | Thành phần đổi khổ theo bề rộng khung, không theo cửa sổ — bản xem trước 390 và 1040 đúng như thật. |
| MỚI | Từ vựng 23 trạng thái (TU_VUNG_TRANG_THAI) | Một chữ, một tông, một hình cho mỗi trạng thái — chặn "10 chữ cùng nghĩa". |
| BỎ · gộp | Bo 6 (nhỏ) → 8 | "Một bo góc": 6 chỉ còn ở nút Hiện/Ẩn PIN, đổi 8 không ai thấy khác. |
| BỎ · gộp | Bo 14 (ô số liệu) → 12 | Ô số liệu là một thẻ; hai bo gần nhau đọc như lỗi. |
| BỎ | Bóng thẻ rê 0 2px 6px … 0 12px 28px | Thẻ bấm được đổi nền khi rê thay vì nổi — nhẹ hơn, không có ở điện thoại, đúng "bóng 3 mức". |
| BỎ | Bóng nút đặc 0 1px 2px … 0 4px 14px rgba(12,74,110,.24) | Nút phẳng như Apple/Google; bóng màu làm nặng và chồng lên vành tiêu điểm. |
| BỎ | Quầng đầm phá rgba(8,145,178,.2) | Trùng ý với vành tiêu điểm 3 px — hai hình cho một ý nghĩa. |
| BỎ · gộp (đề nghị) | #f1f5f9 rê dòng ≈ #f2f5f9 nền phụ | Lệch 1 đơn vị kênh đỏ, mắt không phân biệt. Giữ tạm cả hai vì mục 8 ghi riêng; đề nghị dùng một. |
| BỎ | Độ đậm 700 và 800 (không nạp) | Ba mức 400/500/600 đã chốt; bớt hai tệp phông (~57 KB) cho nhanh. |
| BỎ | Nét biểu tượng 1,8 và 2,2 (mã) → 2 | Một nét cho cả bộ (mục 8). |
| BỎ | Thời lượng 180 / 300 ms (mã) → 150 / 200 | Tiêu chí 1: chuyển động ngắn. |
| BỎ | Vành tiêu điểm 2 px (mã) → 3 px | Tiêu chí 2: thấy rõ. |
| BỎ | --ls-eyebrow .08em + tiêu đề nhóm IN HOA; --ls-chip .04em | Nhãn lúc in hoa lúc không (ảnh điều phối). v2 viết thường đầu câu, không giãn chữ. |
| BỎ | Cỡ rem cũ (--fs-h1 1.5rem, --fs-h2 1.1rem, --fs-old-* .8–.9rem) | Nằm ngoài thang 14 bậc. |
| BỎ | userPlus, checkCircle, filePlus trong icons.ts | Ngoài danh sách 37; trùng ý assign / check / plus. |

Đếm: **Từ mã 9 dòng · MỚI 15 dòng · BỎ 13 dòng** (trong đó 3 dòng ghi "BỎ · gộp", 1 dòng ghi "gộp (đề nghị)") — tổng 37 dòng, khớp dòng mở đầu trang.

---

## Token CSS mà thành phần dùng nhưng KHÔNG khai ở `tokens/*.css`

Cách kiểm: liệt kê mọi `var(--…)` trong 6 tệp CSS nhóm và 29 tệp `.jsx` (138 tên khác nhau trong CSS; 0 trong JSX — JSX không dùng `var(--…)` ở đâu cả), so với 219 tên khai trong `tokens/goc.css`, `y-nghia.css`, `thanh-phan.css`, `nen-tang.css`.

Kết quả: **không có** — mọi token thành phần dùng đều đã được khai.

Ghi chú thêm (chiều ngược lại, chỉ là sự thật đếm được): các token tầng Ý nghĩa / Thành phần được khai nhưng **không** tệp CSS nhóm nào đọc: `--bang-tay-cam`, `--bao-xong-tg`, `--thanh-tab-den`, `--bt-co`, `--bt-co-lon`, `--gap-khoi`, `--z-tren-cung`, `--h-dieu-khien-lon` (đi qua `--nut-h-lon`/`--o-h-lon`), `--c-chinh-re` (qua `--nut-chinh-bg-re`), `--c-nhan`, `--c-nhan-re` (qua `--nut-san-ho-bg*`), `--f-so` (dùng ở `nen-tang.css` `.ib-so`), và bảy "điểm lẻ" `--so-con-thu-tren-toi`, `--lich-xe-ban-bg`, `--o-cua-toi-bg`, `--o-tat-ca-bg`, `--o-so-lieu-bg`, `--o-so-lieu-chu` (chưa có thành phần dùng). Mọi token tầng Gốc (`--mau-*`, `--co-*`, `--dong-*`, `--dam-*`, `--bo-*`, `--bong-*`, `--phong-*`) chỉ được tầng Ý nghĩa trỏ tới, trừ hai chỗ thành phần đọc thẳng tầng Gốc: `.ib-thanh-tren__ten` dùng `--co-5` và `--co-6` (dieu-huong.css dòng 57, 64).

---

## Giá trị cứng (không qua token) trong 6 tệp CSS nhóm

Bỏ qua: `0`, viền `1px` (`border: 1px solid …`, `border-top/bottom: 1px solid …`), `100%`, số trong `transform`/`scale`, hệ số `calc(-1 * …)`, `line-height: 1`, và `inset: 0`. Ghi riêng ở cuối: `border-radius: 50%` và các ngưỡng container.

| # | Tệp | Bộ chọn (dòng) | Giá trị cứng |
|---|---|---|---|
| 1 | hanh-dong.css | `.ib-nut--loi-nho:hover .ib-nut__chu` (18), `.ib-nut--loi-nho.ib-xem-re .ib-nut__chu` (25) | `text-underline-offset: 3px` |
| 2 | hanh-dong.css | `.ib-nut__quay` (32) | `margin: 2px` |
| 3 | hanh-dong.css | `.ib-tab` (40) | `gap: 2px` |
| 4 | hanh-dong.css | `.ib-tab__muc` (44) | `gap: 6px` |
| 5 | hanh-dong.css | `.ib-tab__dem` (49) | `min-width: 20px; padding: 0 6px` |
| 6 | hanh-dong.css | `.ib-chip` (53) | `gap: 6px` |
| 7 | nhap.css | `.ib-o.is-loi .ib-o__dieu-khien` (11) | `box-shadow: inset 0 0 0 1px …` (bóng trong 1px, không phải viền) |
| 8 | nhap.css | `.ib-o__tien` (14) | `padding-right: calc(var(--kc-3) + 20px)` |
| 9 | nhap.css | `.ib-o__co-quay` (16) | `padding-right: calc(var(--kc-3) + 24px)` |
| 10 | nhap.css | `.ib-o__chon` (18) | `padding-right: calc(var(--kc-3) + 28px)` |
| 11 | nhap.css | `.ib-o__nhieu-dong` (20) | `padding-top: 10px; padding-bottom: 10px` |
| 12 | nhap.css | `.ib-o__loi` (21) | `gap: 6px` |
| 13 | nhap.css | `.ib-o__loi .ib-bt` (22) | `margin-top: 2px` |
| 14 | nhap.css | `.ib-chon` (27) | `padding: 10px 0` |
| 15 | nhap.css | `.ib-chon__goc` (28) | `width: 1px; height: 1px` (ẩn trực quan) |
| 16 | nhap.css | `.ib-chon__hop--tich` (30) | `margin-top: 1px; border: 2px solid …; border-radius: 6px` |
| 17 | nhap.css | `.ib-chon__hop--mot` (31) | `margin-top: 2px; border: 2px solid …` |
| 18 | nhap.css | `.ib-chon__chu` (48) | `gap: 2px` |
| 19 | hien-thi.css | `.ib-hh` (5) | `gap: 4px` |
| 20 | hien-thi.css | `.ib-the__dau-chu` (20) | `gap: 2px` |
| 21 | hien-thi.css | `.ib-dong__chu` (37) | `gap: 2px` |
| 22 | hien-thi.css | `.ib-dong__cham` (39) | `width: 8px; height: 8px` |
| 23 | hien-thi.css | `.ib-bang__hd .ib-nut` (55), `.ib-bang__d3-hd .ib-nut` (67) | `min-height: 36px` |
| 24 | hien-thi.css | `.ib-bang__muc` (60) | `gap: 2px` |
| 25 | hien-thi.css | `.ib-xuong__dong` (74) | `height: 12px; margin: 6px 0` |
| 26 | hien-thi.css | `.ib-xuong__so` (75) | `width: 7.5em` |
| 27 | hien-thi.css | `.ib-xuong__vien` (76) | `height: 24px; width: 96px` |
| 28 | dieu-huong.css | `.ib-tim__o` (6) | `padding-left: calc(var(--kc-3) + 28px)` |
| 29 | dieu-huong.css | `.ib-sap__chon` (11) | `padding: 0 calc(var(--kc-2) + 22px) 0 var(--kc-2)` |
| 30 | dieu-huong.css | `.ib-tim-loc__chip` (14) | `padding: 4px 0; margin: -4px 0` |
| 31 | dieu-huong.css | `@container ≥900 .ib-tim` (18) | `flex: 0 1 420px` |
| 32 | dieu-huong.css | `.ib-tai-them .ib-nut` (22) | `max-width: 360px` |
| 33 | dieu-huong.css | `.ib-tai-them__het` (23) | `gap: 6px` |
| 34 | dieu-huong.css | `.ib-phan-trang__so` (26) | `gap: 2px` |
| 35 | dieu-huong.css | `.ib-phan-trang__nut.is-chon` (29) | `box-shadow: inset 0 -2px 0 …` |
| 36 | dieu-huong.css | `.ib-phan-trang__cach` (30) | `min-width: 24px` |
| 37 | dieu-huong.css | `.ib-dau-trang__lui:hover` (35) | `text-underline-offset: 3px` |
| 38 | dieu-huong.css | `.ib-dau-trang__chu` (37) | `flex: 1 1 240px` |
| 39 | dieu-huong.css | `.ib-thanh-tren__logo` (56) | `width: 30px; height: 30px` |
| 40 | dieu-huong.css | `.ib-thanh-tren__nut:hover` (61) | `color-mix(in srgb, currentColor 10%, transparent)` |
| 41 | dieu-huong.css | `.ib-thanh-tren__so` (62) | `top: 4px; right: 2px; min-width: 18px; height: 18px; padding: 0 5px; line-height: 18px; box-shadow: 0 0 0 2px …` |
| 42 | dieu-huong.css | `.ib-thanh-tren__nguoi` (63) | `width: 32px; height: 32px; border: 1.5px solid currentColor` |
| 43 | dieu-huong.css | `.ib-thanh-tab` (67) | `saturate(1.4)` |
| 44 | dieu-huong.css | `.ib-thanh-tab__muc` (68) | `gap: 2px; padding: 4px 0 6px` |
| 45 | dieu-huong.css | `.ib-thanh-tab__vien` (69) | `width: 56px; height: 32px` (token `--thanh-tab-den` có khai, không dùng) |
| 46 | dieu-huong.css | `.ib-thanh-tab__dem` (73) | `left: 32px; min-width: 18px; height: 18px; padding: 0 5px; line-height: 18px; box-shadow: 0 0 0 2px …` |
| 47 | dieu-huong.css | `.ib-thanh-ben__ds` (78) | `gap: 2px` |
| 48 | dieu-huong.css | `.ib-thanh-ben__dau-nhom` (80) | `height: 36px` |
| 49 | dieu-huong.css | `.ib-thanh-ben__cham` (84) | `width: 6px; height: 6px` |
| 50 | dieu-huong.css | `.ib-thanh-ben__thut` (87) | `width: 20px` |
| 51 | dieu-huong.css | `.ib-thanh-ben__muc.is-chon::before` (93) | `top: 10px; bottom: 10px` |
| 52 | dieu-huong.css | `.ib-thanh-ben__dem` (94) | `min-width: 22px; padding: 0 6px` |
| 53 | dieu-huong.css | `.ib-thanh-ben__chu-tat` (97) | `width: 32px; height: 32px` |
| 54 | phan-hoi.css | `.ib-bang-truot` (5) | `max-height: 92%` |
| 55 | phan-hoi.css | `.ib-bang-truot__tay` (6) | `width: 36px; height: 5px` (token `--bang-tay-cam` có khai, không dùng) |
| 56 | phan-hoi.css | `.ib-bang-truot__dau-chu` (8) | `padding-top: 10px` |
| 57 | phan-hoi.css | `.ib-xac-nhan__chu` (29) | `padding-top: 2px` |
| 58 | phan-hoi.css | `.ib-dai__bt` (38) | `margin-top: 2px` |
| 59 | phan-hoi.css | `.ib-dai__chu` (39) | `gap: 2px` |
| 60 | phan-hoi.css | `.ib-dai__hd` (43) | `margin: 2px 0 -10px calc(-1 * var(--kc-2))` |
| 61 | phan-hoi.css | `.ib-dai__hd .ib-nut__chu` (45) | `text-underline-offset: 3px` |
| 62 | phan-hoi.css | `.ib-dai__dong` (46) | `margin: -10px -12px -10px 0` |
| 63 | phan-hoi.css | `.ib-bao-xong` (51) | `min-height: 52px` |
| 64 | phan-hoi.css | `.ib-bao-xong__hoan-tac` (54) | `text-underline-offset: 3px` |
| 65 | phan-hoi.css | `.ib-bao-xong__hoan-tac:hover, .ib-bao-xong__dong:hover` (56) | `background: rgba(255,255,255,.1)` |
| 66 | phan-hoi.css | `.ib-dai-tren__bt` (65) | `margin-top: 12px` |
| 67 | phan-hoi.css | `.ib-dai-tren__chu` (66) | `gap: 2px; padding: 10px 0` |
| 68 | phan-hoi.css | `.ib-dai-tren__hd .ib-nut__chu` (71) | `text-underline-offset: 3px` |
| 69 | phan-hoi.css | `.ib-rong__bt` (78) | `width: 56px; height: 56px` |
| 70 | phan-hoi.css | `.ib-rong__phu` (80) | `max-width: 36ch` |
| 71 | trang.css | `.ib-trang-bao` (2) | `max-width: 440px` |
| 72 | trang.css | `.ib-trang-bao__bt` (3) | `width: 64px; height: 64px` |
| 73 | trang.css | `.ib-trang-bao__nut` (8) | `max-width: 320px` |
| 74 | trang.css | `@container ≥768 .ib-trang-bao` (10) | `padding-top: 96px` |

Đếm: **74 bộ chọn có giá trị cứng** (nhiều bộ chọn mang vài giá trị). Không có mã màu hex và không có `ms`/`s` ghi thẳng trong 6 tệp CSS nhóm (mọi thời lượng đi qua `--cd-*`); giá trị màu cứng duy nhất là `rgba(255,255,255,.1)` (#65) và `color-mix(…)` (#40).

Ghi riêng, không tính vào 74:
- `border-radius: 50%` (vòng tròn) ở 11 chỗ: `.ib-nut__quay`, `.ib-o__quay`, `.ib-chon__hop--mot`, `.ib-chon__hop--cong-tac::after`, `.ib-dong__cham`, `.ib-thanh-tren__nguoi`, `.ib-thanh-ben__cham`, `.ib-thanh-ben__chu-tat`, `.ib-xac-nhan__bt`, `.ib-rong__bt`, `.ib-trang-bao__bt`.
- Ngưỡng container ghi thẳng, không có token: `@container ib (min-width:768px)` ở 5 chỗ (dieu-huong.css ×2, phan-hoi.css ×2, trang.css ×1) và `@container ib (min-width:900px)` ở 5 chỗ (hien-thi.css ×2, dieu-huong.css ×2, phan-hoi.css ×1).
- Trong JSX (không phải CSS): cỡ biểu tượng 14/16/18/20/24 truyền số; `BoDem` `max = 99`; `BaoXong` `thoiGian = 3000`; `BangDuLieu` `soDongXuong = 4`, khung xương 70%/80%; `KhungXuong` chu kỳ 100/88/56/94/72% và dòng số 60%; `PhanTrang` `coTrang = 20`, ngưỡng 7 trang; `ThanhTren`/`ThanhTabDuoi` "99+".
