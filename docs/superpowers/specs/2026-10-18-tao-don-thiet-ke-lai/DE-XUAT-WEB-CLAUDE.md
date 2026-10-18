# Đề xuất sửa bảng kịch bản Chrome của `web/CLAUDE.md` (màn Tạo đơn thiết kế lại, 18/10/2026)

**Trạng thái: đề xuất của AI, CHƯA có hiệu lực.** `web/CLAUDE.md` là tệp luật: AI không tự sửa (Hiến pháp N9; `CLAUDE.md` §3). Chủ dự án duyệt thì chép các dòng dưới vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" (hoặc bảo một phiên sửa bằng công cụ sửa tệp để chủ được hỏi). Nguồn: Việc 2–9 của kế hoạch `docs/superpowers/plans/2026-10-18-tao-don-thiet-ke-lai.md`; các kịch bản mới nằm ở `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/` (gọi tắt `…/kich-ban/` dưới đây). Mọi kịch bản cần `npm run build:web` trước, Chrome + `CHROME_BIN`, không cần mạng ngoài; có `AXE_JS` thì chạy thêm axe ở những kịch bản có bước axe.

## 1. Dòng lỗi thời cần THAY

Dòng hiện tại (khoảng dòng 76): "Chip nhóm dịch vụ ở ô chọn dịch vụ của form đơn (ADR-0058 Đ5–Đ7): `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts`, khối `.loc-*` của `public/app.css`, phần chip của `web/order-form.ts`". Chip và khối `.loc-*` của ô chọn dịch vụ đã bỏ từ đợt 1 (13/10) rồi tới hàng nút nhóm chọn một (18/10). Đề xuất thay bằng:

| Sửa | Chạy |
|---|---|
| Ô chọn dịch vụ của form đơn (thiết kế lại 18/10, đề xuất ADR-0130 — hàng nút nhóm CHỌN MỘT, khung danh sách luôn mở, "✓ đã thêm"): `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts`, khối `.catalog-*` và token `--h-danh-sach` / `--mep-mo` của `public/app.css` | `chip-nhom-smoke.mjs` ở `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/` (viết lại có chủ đích ở Việc 2: hàng nhóm, sao, tìm / thu hẹp, đủ 20 dịch vụ, bản nhớ cũ, 1040 phím ← → Home End) + `danh-muc-lap-don-smoke.mjs` ở `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/` + ba `a2-smoke-*.mjs` |

(Tên token thật kiểm lại ở đầu `public/app.css` lúc chép — đặc tả mục 6 gọi là `--h-catalog`, mã đặt theo quy ước nhóm "Riêng của Tour Đảo Booking".)

## 2. Dòng cần THÊM

| Sửa | Chạy |
|---|---|
| Thẻ dịch vụ GẬP của form (một thẻ mở, dòng gập, chip nền cát, thùng rác): phần gập của `web/service-card.ts`, `src/shared/dong-gap-the.ts`, `chiMoMot` / `mount` của `web/order-form.ts`, khối `.svc-mo*` / `.svc-gon-*` / `.svc-dang-gap` / `.svc-remove` của `public/app.css` | `the-gap-smoke.mjs` ở `…/kich-ban/` (390 cảm ứng thật + 1040; gồm bước 10b, 14) + `than-gui.mjs` (`THU_MUC=…/the-gap`, thân POST / PUT giống từng byte bản trước) + ba `a2-smoke-*.mjs` |
| Lưới số khách hai cột, dòng tiền chữ, khối gập "Sửa giá" của thẻ: phần lưới / tiền của `web/service-card.ts`, `chuDongTien` / `nhanSoLuongDong` / `chuLuot` / `coDongThanhTien` của `src/shared/service-form.ts`, khối `.svc-luoi-khach` / `.o-khach*` / `.svc-tien*` / `.dong-tien*` / `.line-*` của `public/app.css` | `luoi-khach-tien-smoke.mjs` ở `…/kich-ban/` (gồm bước 7: Thực tập, nháp cũ lệch giá, khối tự đóng) + `than-gui.mjs` (`THU_MUC=…/luoi-khach-tien`, cả cách gõ cũ và `CACH=luoi`) + `doi-tac-lap-don-smoke.mjs` (Đối tác / Thực tập không có "Sửa giá", bước 2c Lưu bị 400) + ba `a2-smoke-*.mjs` |
| Đưa đón MỘT ô "Nơi đón" / "Nơi trả" có gợi ý: `web/o-noi-goi-y.ts`, `cotNoiMotO` của `web/khoi-dua-don.ts`, `src/shared/goi-y-noi.ts`, khối `.dd-goi-y-*` và token `--h-goi-y-noi` của `public/app.css` | `dua-don-mot-o-smoke.mjs` ở `…/kich-ban/` (cảm ứng thật 390, chuột thật 1040) + `than-gui.mjs` `CACH=noi` và `CACH=goluu` (`THU_MUC=…/dua-don-mot-o`) + `the-gap-smoke.mjs` + `a2-smoke-form.mjs` |
| Công tắc "Đơn của: Khách lẻ \| Qua đối tác" và lớp chặn nhầm "Số này là của đối tác …" (form và bảng "Đổi khách"): `web/dat-qua-doi-tac.ts`, `web/canh-bao-doi-tac.ts`, phần lớp chặn nhầm của `web/booker-picker.ts`, `web/booker-sheet.ts`, `doiTacTrungSo` của `src/shared/booker.ts`, `coODatQuaDoiTac` / `khoiBenDatForm` / `nhanTenKhach` / `nhanSdtKhach` của `src/shared/phan-doi-tac-hien-thi.ts`, khối `.dqdt-*` / `.canh-bao-dt-*` của `public/app.css` | `cong-tac-va-canh-bao-smoke.mjs` ở `…/kich-ban/` (390 + 1040: Bán hàng có công tắc, Thực tập có công tắc, Đối tác thuần và tài khoản lai không; bảng "Đổi khách" cùng công tắc + hai ô nhãn nổi, lưu thật) + `a2-smoke-form.mjs` + `a2-smoke-order.mjs` + `v1-nguoi-phu-trach.mjs` |
| Thanh dính cuối form, bảng chi tiết tiền, ô trả trước chỉ hiện khi có tiền, chỗ đặt lỗi lưu, thang nút ba cấp, vị trí thông báo nổi: `.form-actions` / `#sum-chi-tiet` của `public/order-form.html`, `recompute` / `datMoChiTiet` / `gapChiTietKhiLoi` / `capNhatOTraTruoc` / `cuonToiLoi` / `ganViTriThongBao` của `web/order-form.ts`, `nutDuyetPhu` của `web/dat-gap-ui.ts`, khối `.mobile-sum-*` / `.sum-chi-tiet` / `#save-error`, token `--h-loi-luu`, luật `body:has(.buoc-thanh) .toast-vung` của `public/app.css` | `thanh-dinh-smoke.mjs` ở `…/kich-ban/` (390 cảm ứng thật, 375×667, 1040; cần `AXE_JS`) + `than-gui.mjs` `CACH=tratruoc` và mặc định, so trong THƯ MỤC TẠM (xem dòng việc 8 ở `docs/CHANGE-GUIDE.md` §3) + `chon-hdv-lap-don-smoke.mjs` + ba `a2-smoke-*.mjs` |

## 3. Dòng có sẵn cần BỔ SUNG một kịch bản

- Dòng `web/booker-sheet.ts` (bảng "Đổi khách", hiện chạy `a2-smoke-order.mjs` + `v1-nguoi-phu-trach.mjs`): thêm `cong-tac-va-canh-bao-smoke.mjs` bước 6 và 7 (`…/kich-ban/`). Lưu ý: `a2-smoke-order.mjs` và `v1-nguoi-phu-trach.mjs` hiện không mở bảng "Đổi khách" lần nào (đã `grep`), nên một mình chúng không canh được bảng này.
- Dòng `web/order-form.ts`, `web/service-card.ts` — khoá ô đơn giá / giảm giá cho Đối tác (`doi-tac-lap-don-smoke.mjs`): thêm `luoi-khach-tien-smoke.mjs` bước 7.

## 4. Kịch bản cũ không còn chạy nguyên bản (để chủ biết, không đề xuất sửa vì là hồ sơ có ngày)

- `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs`: khoá chữ cũ của ô "Đặt qua đối tác" (nút rời, "Bỏ chọn", dòng "Đặt qua: …") ở form và bảng "Đổi khách" — từ Việc 3 (form) và Việc 9 (bảng) không còn chữ đó.
- `docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs`: gãy từ Việc 7 (đã ghi ở `docs/CHANGE-GUIDE.md` §3).
