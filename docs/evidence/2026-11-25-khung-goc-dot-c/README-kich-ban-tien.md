# Kịch bản bấm thử nhóm «Tiền» — đợt C khung gốc (25/11/2026)

Hồ sơ có ngày. Mười ba kịch bản Chrome cũ mở mười trang Tiền đã chuyển sang khung gốc (ADR-0222) được chép sang `kich-ban/` (cùng tên); bản gốc KHÔNG sửa, kể cả không thêm dòng «Thay bằng» (việc này chỉ được ghi trong thư mục này). Mã sản phẩm (`web/`, `public/`, `src/`) không sửa. Đầu mỗi bản chép ghi đổi gì; đổi chỉ ở dựng dữ liệu được ghi riêng.

Lọc khỏi danh sách: `2026-11-12-cong-no-dai-ly/kich-ban/cong-no-smoke.mjs` (chỉ mở `/order`, không mở trang nào trong mười trang). Không kịch bản nào trong danh sách đã ghi «ngừng chạy».

## Cách chạy

Từ gốc kho, sau `npm run build:web`:

```
AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh CI=1 OUT=/tmp/khung-goc-dot-c-tien/<tên> node docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/<tên>.mjs
```

Bản chép nạp `./dat-out.mjs` đầu tiên: OUT mặc định `/tmp/khung-goc-dot-c-tien` (ảnh không vào kho). Thư viện dùng chung (qr-chung, dp-lib, lb-chung, a2-cdp, hop-hoi-tu-dong) KHÔNG chép: bản chép cùng độ sâu thư mục nên đường dẫn tương đối `../../<ngày>/kich-ban/…` giữ nguyên.

## Cách so

- **Bản chính**: kịch bản GỐC chạy trên bản xuất `main` 3c3cceeff (cây làm việc tạm ngoài kho, `npm ci` + `npm run build:web`, đã gỡ).
- **Bản chính (chẩn đoán)**: kịch bản gốc chết ở dựng dữ liệu thì chạy bản chép CHỈ có phần sửa dựng dữ liệu (chưa đổi bộ chọn) trên cùng bản chính, để biết bước nào đỏ sẵn.
- **Nhánh**: bản chép (đã sửa) trên `claude/khung-goc-dot-c-9a95ac` (7331e43aa + thay đổi chưa lưu của người điều phối). Chạy lần lượt 25/11/2026 17:40–18:42 (bản chính rồi nhánh, mỗi lúc một kịch bản), axe-core trong `node_modules`.
- **đỏ sẵn** = đỏ trên bản chính ở cùng bước; **đỏ do đợt C** = xanh trên bản chính, đỏ trên nhánh.

## Bảng kết quả

| Kịch bản (bản chép trong `kich-ban/`) | Bản chính | Nhánh, bản chép cuối | Sửa trong bản chép |
|---|---|---|---|
| `cap-dai-ly-smoke` (gốc 2026-11-04-man-cap-dai-ly) | 11 ✓, 1 ✗: 5b (Nhân sự ở `/staff`) | 11 ✓, 1 ✗: 5b, **đỏ sẵn** | dòng hồ sơ lấy bản đang hiện (`#cdl-bang tr` / `#cdl-the .dong`), thẻ `.card` → `.dong`, «bảng ẩn» đo `#cdl-bang-wrap > table` |
| `gioi-han-smoke` (2026-11-03-chiet-khau-bon-truc) | chết ở dựng (insertStaffSql đòi `vai`, ADR-0185); chẩn đoán 10/10 ✓ | 10/10 ✓ | chỉ dựng dữ liệu (`vai`) |
| `phan-dinh-smoke` (2026-11-02-phan-dinh) | 12/12 ✓ | 12/12 ✓ | phiếu `li.dc-the` → `#pd-phieu-ds .dong` |
| `dieu-chinh-smoke` (2026-10-13-dieu-chinh-cong-no) | 34 ✓, 2 ✗: 9, 9b (đếm mục thanh bên) | 34 ✓, 2 ✗: 9, 9b, **đỏ sẵn** | thẻ `li` → `.dong`, `.dc-nut`/`.dc-kq-nut` → `.thanh-nut`/`button`, câu rỗng và câu chặn 403 đọc ở `.trang-thai` |
| `khoan-nop-smoke` (2026-11-13-khoan-nop-dai-ly) | 10/10 ✓ | 10/10 ✓ | không (chỉ OUT) |
| `tra-sau-smoke` (2026-11-05-tra-sau) | 16 ✓, 3 ✗: C1, H1, D1 | 16 ✓, 3 ✗: C1, H1, D1, **đỏ sẵn** | nhãn «Trả sau», «Mức tối đa…» thành cặp `.cap` (bỏ «:»), `#hm-the .card` → `.dong` |
| `kenh-thu-smoke` (2026-11-06-kenh-thu) | chết ở dựng (`vai`); chẩn đoán 10 ✓, 2 ✗: 390-3, 1040-3 (trang đơn) | 10 ✓, 2 ✗: 390-3, 1040-3, **đỏ sẵn** (vì dữ liệu: «Đối tác không hưởng» nay phải mang vai — đóng vai thì máy chủ chặn gửi đơn) | `#kenh-thu-trang-thai > span:last-child`; dựng: `vai` cho hai Đối tác |
| `so-dai-ly-dot-2-smoke` (2026-10-18-so-dai-ly-dot-2) | chết ở dựng (thiếu `pickupChoice`); chẩn đoán 15 ✓, 4 ✗: 1-390b/c, 1-1040b/c (form Nhập khoản thu) | 15 ✓, 4 ✗: cùng bốn bước, **đỏ sẵn**; mọi bước `/chup-bu` xanh | `/chup-bu` bỏ `#error` ⇒ đọc có điều kiện; dựng: `pickupChoice` |
| `so-dai-ly-smoke` (2026-10-08-so-dai-ly-dot-1) | 33 ✓, 18 ✗ (22 lỗi / 51 bước) | 37 ✓, 14 ✗ (18 lỗi / 51 bước); mọi bước đỏ đều đỏ sẵn; bốn bước đỏ sẵn (33-lai-*a, 7-*a) nay xanh nhờ đọc câu 403 mới | câu chặn đọc `#error` HOẶC trạng thái 403 toàn trang; `.ky-khoi` → `.muc-con`. Lần đầu (bộ chọn cũ) đỏ thêm 6-390a/b/c, 6-1040a/b, 36-quan-tri — đều do bộ chọn |
| `cot-cap-smoke` (2026-11-02-dat-ve-luot-2) | chết ở dựng (đã tự ghi đầu tệp); chẩn đoán 5 ✓, 2 ✗: 12 (axe `.bar-avatar`), 13 | 5 ✓, 2 ✗: 12, 13, **đỏ sẵn** | chỉ dựng: gieo kèm vai rồi đóng vai (kiểu `kieuCu`) |
| `bang-nhap-smoke` (2026-11-03-chiet-khau-bon-truc) | chết ở dựng (`vai`); chẩn đoán 25/25 ✓ | 22 ✓, 3 ✗: **V1040, V1440, R1440 — đỏ do đợt C** (xem dưới) | bước D hỏi nút «＋ Thêm cấp độ đại lý» theo chữ (`.hh-cap-dau` nay là cả khối); dựng: `vai` |
| `hoa-hong-smoke` (2026-10-26-hoa-hong-thiet-ke-lai) | 53 ✓, 6 ✗: 1d, K, T (cả 390 và 1040) | 53 ✓, 6 ✗: cùng sáu bước, **đỏ sẵn** (lần đầu với bộ chọn cũ: 20 ✓, 39 ✗) | xem đầu tệp: dòng mức đọc bản đang hiện (`:is(tr, .dong)`), Tra nhanh `hh-tn-form-khung` / `hh-tn-muc`, bảng mức của cấp trong `.khoi[data-kieu=bang]`, huy hiệu `.huy-hieu`, đầu khối `.hh-dt-vung` / `.hh-loai-vung`; nút «＋ Thêm mức riêng cho đối tác» ở chỗ mới (`#hh-them-muc`, `#hh-them-muc-rieng`, `#hh-them-muc-day`) |
| `phi-don-don-smoke` (2026-11-phi-don) | chết ở dựng (khoá cũ `phiDon` ⇒ 400); chẩn đoán đỏ ở bước 1 (dòng «Phí đưa đón» ở Tóm tắt) | đỏ ở bước 1 như bản chính, **đỏ sẵn**; **chưa chạy tới bước 5** (màn Cấp độ đại lý) | chỉ dựng: `phiDon` → `doiPhi` (ADR-0218) |

## Lỗi giao diện có thể là thật (đỏ do đợt C, không sửa mã)

1. **Bảng nhập hoa hồng, căn dọc** (`bang-nhap-smoke` bước V1040, V1440): ở dòng «Tour thử 001», tâm dòng chữ đầu của ô mức thấp hơn tên dịch vụ và giá khoảng 32 px (1040: tên 1626, giá 1631,5, ô 1657,75; 1440: 1457 / 1462,5 / 1488,75). Bản chính đạt (lệch ≤ 3 px). Bước: Kế toán mở `/hoa-hong` ở 1040 hoặc 1440, nhìn hàng đầu bảng nhập.
2. **Bảng nhập hoa hồng ở 1440 không còn đủ sáu cột cấp** (`bang-nhap-smoke` bước R1440): khung 1070 px, bảng 1088 px, chỉ 5/6 đầu cột cấp nằm trọn trong khung. Gần như chắc do `public/hoa-hong.html` đổi `data-rong="rong"` → `"vua"`; tiêu chí cũ của ADR-0161 (Task 9) là «ở 1440 thấy đủ sáu cột cấp không cuộn ngang». Cần người điều phối quyết giữ tiêu chí hay đổi.

## Chưa phủ / cần biết

- **Bước «Sửa» mới của mức giảm phí đưa đón** (Cấp độ đại lý): không kịch bản Chrome nào chạm `#cdl-giam-phi-don` (đã tìm «Mức giảm», «gpd», «giam-phi-don» trong `docs/evidence`, `tests`, `scripts`: chỉ có máy đo `scripts/giao-dien/do-khung-ci.mjs`). Hành vi bấm «Sửa» → mở ô → «Lưu mức giảm» **chưa kiểm** bằng kịch bản.
- `phi-don-don-smoke` chưa chạy tới bước chạm Cấp độ đại lý (đỏ sẵn ở bước 1 trên cả hai bản).
- `web/cap-dang-ky.ts` (khối «Cấp cho đối tác tự đăng ký» ở trang Hoa hồng) chỉ được phủ gián tiếp qua `hoa-hong-smoke`; `dang-ky-smoke.mjs` cần mạng, không chạy.
- Ở 1040 các khối có `data-thay-bang` của nhóm này hẹp hơn 800 nên danh sách dòng hiện; bảng chỉ được so trong DOM (như đợt B). Bảng thật đang hiện chỉ được chấm ở 1440 (`tra-sau`, `bang-nhap`).
- Đỏ sẵn đáng ghi lại cho người sau: `cot-cap` bước 12 axe `label-content-name-mismatch` ở `.bar-avatar` (cùng lỗi đợt B đã ghi); bốn kịch bản chết ở dựng dữ liệu trên bản chính vì luật mới (ADR-0185 `vai`, `pickupChoice`, ADR-0218 `doiPhi`).

Nhật ký chạy và ảnh nằm ngoài kho (thư mục nháp của phiên, `/tmp/khung-goc-dot-c-tien/`); không phải kết quả chính thức.

## Bấm thử lối «Sửa» của mức giảm phí đưa đón (Cấp độ đại lý), 25/11/2026

Chưa kịch bản nào chạm bước này, nên người thi công bấm thử một lần trên máy thử cổng 8881 (tài khoản Kế toán, khổ 1.280; kịch bản dò nằm ngoài kho):

1. Lúc đầu mỗi cấp một dòng chỉ xem («Đại lý bạc 30.000 đ mỗi khách, từ 25/11/2026», nút «Sửa» `aria-expanded="false"`), vùng sửa ẩn.
2. Bấm «Sửa» của Đại lý bạc: vùng sửa hiện, ô tiền ghi đúng số cũ `30000`, ô ngày ghi hôm nay, con trỏ đặt vào ô tiền, `aria-expanded="true"`.
3. Bấm «Sửa» của Đại lý vàng: vùng của Đại lý bạc đóng lại (`aria-expanded` về `false`), vùng của Đại lý vàng mở.
4. Đổi thành 35.000 đồng, giữ ngày hôm nay, bấm «Lưu mức giảm»: máy chủ từ chối, câu báo «Ngày bắt đầu của mức thay thế phải sau ngày bắt đầu của mức cũ.» hiện trong khối (luật máy chủ có sẵn, bản cũ cũng vậy).
5. Đổi ngày thành 26/11/2026 rồi lưu: không lỗi, khối vẽ lại, dòng ghi «Đại lý vàng 35.000 đ mỗi khách, từ 26/11/2026», vùng sửa đóng.

Lưu ý cho lần so mốc tiền: bước 5 ghi thật vào kho thử, nên mọi lần chụp mốc tiền sau giờ này trên máy thử có thêm mức giảm 35.000 đ của Đại lý vàng (khác do dữ liệu, không do mã). Dòng chỉ xem hiện mức có ngày bắt đầu mới nhất (kể cả mức ngày mai), đúng cách chọn có sẵn từ trước (`hienHanh` ở `web/giam-phi-don.ts`, không đổi ở đợt C).

## Sửa sau lượt bấm thử (25/11/2026)

- Bảng nhập hoa hồng lệch dọc (bước V1040, V1440): luật chung của khung `body[data-khung-goc] .bang td` (căn giữa) nặng ngang luật riêng `.bang.hh-ma-tran …` (căn trên) mà đứng sau nên thắng. Thêm `table` vào đầu các bộ chọn riêng của bảng nhập; đo lại trên máy thử: ô mức về cùng đường với tên dịch vụ.
- Sáu cột ở 1.440 (bước R1440): `--w-hh-cot-cap` 7,5rem → 7,25rem, tổng 66,5rem ≈ 1.064 px, vừa khung khối «vừa» 1.070 px, giữ tiêu chí ADR-0161 mà vẫn giữ bề rộng «vừa» chủ đã duyệt.
- Bước V còn đỏ ở câu «chữ khách còn nguyên một dòng» vì kịch bản đọc `div.lastChild`, mà đợt C bọc số tiền trong `span.money-due` (màu tiền). Bản chép đọc chữ bên trong thẻ đó; chạy lại `bang-nhap-smoke` trên nhánh sau hai sửa: **25/25 bước xanh** (25/11/2026).
