# Kịch bản bấm thử đợt D3 khung gốc (26/11/2026)

Hai bản chép, giữ TÊN tệp cũ vì bảng «sửa tệp nào → chạy kịch bản nào» (`docs/KICH-BAN-CHROME.md`) trỏ tới tên đó. Bản gốc là hồ sơ có ngày, không sửa:

- `danh-muc-giay-to-smoke.mjs` ← `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/danh-muc-giay-to-smoke.mjs`
- `chinh-sach-dieu-phoi-smoke.mjs` ← `docs/evidence/2026-09-29-adr-0049/kich-ban/chinh-sach-dieu-phoi-smoke.mjs`

Chạy từ gốc kho sau `npm run build:web` (tự dựng máy thử riêng, không cần cổng 8891):

```
AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-26-khung-goc-dot-d3/kich-ban/danh-muc-giay-to-smoke.mjs
AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-26-khung-goc-dot-d3/kich-ban/chinh-sach-dieu-phoi-smoke.mjs
```

## Bảng đổi bộ chọn (cũ → mới)

| Trang | Cũ | Mới |
|---|---|---|
| Loại giấy tờ | `.card-list > .card`, `table.items tbody tr` | `.ds-dong > .dong[data-code]`, `table.bang tbody tr[data-code]` — đếm bản đang hiện (khối rộng từ 800 hiện bảng) |
| Loại giấy tờ | `.dm-them`, `.dm-sua` (khung trong khối, h2/h3) | bảng trượt `.sheet`: `#<khối>-them-ma`, `-them-ten`, `-sua-ten`, `-sua-dang-dung`; nút ghi `.sheet-foot button[type=submit]`; tiêu đề `.sheet-title` |
| Loại giấy tờ | lỗi thao tác ở `#error` | dải lỗi của bảng trượt `.sheet .alert[role=alert]` |
| Chính sách | `#cs-form .dp-cs-nums`, `.vc-field > label` | `#cs-form .truong`, `.truong > label` |
| Chính sách | `.dp-chips .chip`, `.dp-cs-note`, `.dp-hist-row` | `.dp-chips .huy-hieu`, `#cs-form .khoi-mo-ta`, `.dong[data-ban]` |
| Điều kiện cho xe chạy | `.dp-reason`; ô thêm trên trang | `.dong[data-rule]`; nút `[data-action="mo-them-dieu-kien"]` mở bảng trượt chứa `#dk-co-xe`, `#dk-loai` |
| Điều kiện cho xe chạy | Quản trị: câu từ chối ở `#error` | trang trạng thái 403 toàn trang (cùng câu) |
| Lý do điều phối | `.dp-group`, `.dp-group-title`, `.dp-count`, `.dp-reason(-label)`, `.dp-head-note` | `.khoi[data-nhom]`, `h2` của khối (số đếm là `.huy-hieu` trong h2), `.dong[data-code]`, `.dau-trang .doan-dan` |
| Lý do điều phối | `.dp-panel` (khung thêm / sửa trong nhóm), `.dp-count-text` | bảng trượt: `#ld-moi-<nhóm>`, `#ld-sua-<mã>`, `.sheet .truong-goi-y` (bộ đếm n/80) |

Đổi có chủ ý (chủ duyệt ảnh 26/11): biểu mẫu thêm/sửa của ba trang danh mục và Lý do nay ở bảng trượt, không mở trong khối.

Dòng đánh dấu `[trước D3]` trong bản chép Chính sách: chữ đã đổi từ trước đợt D3 (gốc nhánh 9daf029c2 đã khác bản 29/9: «Đang áp dụng / Ngừng điều kiện», «Đã ngừng điều kiện»), cập nhật để bước chạy tới phần bộ chọn D3.

Bước thêm `a-d'` (Loại giấy tờ): mở thẳng hai trang ở 390 + 1040 và kiểm phần thân của (a)–(d) — vì (a)–(d) dừng ở phần kiểm trang Tôi / thanh bên trước khi tới thân trang.

## Kết quả chạy 26/11/2026 (máy thử riêng của kịch bản, AXE_JS đặt)

- `danh-muc-giay-to-smoke`: 6 đạt, 5 đỏ. Đạt: `a-d'`, e, f, g, h, i (mọi phần thân trang và bảng trượt). Đỏ không do D3: a, b, c, d, j — đều ở danh sách mục trang Tôi / thanh bên (menu đổi từ trước D3: «Đơn chờ xác nhận» ở trang Tôi, thứ tự nhóm Vận chuyển, nhóm Thiết lập chia nhóm con 3.49, Bán hàng thấy thêm «Đặc điểm dịch vụ», «Luật bán», «Vé điện tử»). Phần cuối của j (Bán hàng mở thẳng hai trang → câu từ chối) không chạy tới.
- `chinh-sach-dieu-phoi-smoke`: 7 đạt, 7 đỏ. Đạt: 2, 3, 4, 6, 7, 9b, 13. Đỏ không do D3: 1, 8, 12 (danh sách mục thanh bên, sau khi mọi kiểm phần thân đã qua), 10 (Quản trị có chế độ hẹp ở Chính sách từ ADR-0128; phần Điều kiện của bước này đã qua), 11 (dòng trang Tôi ở cuối; phần bảng trượt, bộ đếm 11/80, tiêu điểm đã qua).
- **Đỏ thật do D3** (bước 5, 9): axe «color-contrast» mức serious ở dòng đã ngừng `[data-ngung]` của Điều kiện cho xe chạy và Lý do điều phối — luật khung `:is(.dong, tr)[data-ngung] { opacity: .6 }` làm huy hiệu xám, chữ phụ và nút trong dòng mờ dưới ngưỡng tương phản. Bản cũ tô dòng ngừng bằng màu chữ phụ, không làm mờ. Mọi thao tác của hai bước (thêm, ngừng điều kiện qua hộp hỏi, đổi hạng D1, thêm/sửa/ngưng lý do) đã qua trước lần kiểm axe.
