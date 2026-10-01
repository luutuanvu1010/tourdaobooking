# Nhật ký thi công — Người 1 (trang đơn): Đưa đón + Hành khách M1–M6 + cảnh báo lúc xác nhận (2026-10-01)

> Kế hoạch: `docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md`. Bản vẽ: `docs/design/2026-10-01-dua-don-hanh-khach/`. Vai: NGƯỜI THI CÔNG — chưa có người kiểm độc lập (N8).
> Nhánh `worktree-agent-ae613874d2a1d717c`, gộp từ `worktree-doi-chieu-phieu-giam-doc` @34db1b5c; đã gộp nhánh Người 2 `worktree-agent-a0b4e92769db45529` @c953c426 theo lời điều phối.

## Đã làm (theo tệp)

| Phần | Tệp |
|---|---|
| Luật thuần cảnh báo lúc xác nhận (gọi `lyDoNoiTra` / `lyDoThieuTen` / `soTenThieu` của Người 2) | `src/shared/canh-bao-xac-nhan.ts` + test |
| Mô hình khối Đưa đón (chặng: ô, gợi ý, lỗi, chiều về đi theo chiều đi, dời ngày, thân `LegInput`, giữ dấu đặt gấp) | `src/shared/chang-form.ts` + test |
| Mô hình khối Hành khách (lỗi dòng, "N/M", câu thiếu / quá, thân nháp, thân them/sua/huy) | `src/shared/hanh-khach-form.ts` + test |
| Bản nháp dịch vụ có `legs`; `toServiceInput` luôn gửi `legs`, bỏ `pickupTime/pickupPlace`; `tripPayload` bỏ hai khoá | `src/shared/service-form.ts`, `src/shared/trip-form.ts`, `src/shared/contracts.ts` (chỉ nới hai khoá cũ thành tuỳ chọn) |
| Ô quyền "Sửa danh sách" (`suaKhachDuoc`) + câu khoá D5 (`cauKhoaXacNhan`) | `src/shared/order-view.ts` + test thử MỌI tổ hợp quyền |
| Khối Đưa đón (form / bảng) | `web/khoi-dua-don.ts` (mới), `web/service-card.ts`, `web/trip-fields.ts` (bỏ Giờ đón / Điểm đón) |
| Khối Hành khách (bảng máy tính / thẻ điện thoại) | `web/khoi-hanh-khach.ts` (mới) |
| Form đơn: tải điểm + mẫu chặng, tạo sẵn chặng (M6), dời ngày, mốc 6 giờ / đặt gấp theo TỪNG chặng, gửi `passengers` | `web/order-form.ts`, `public/order-form.html` (bọc `.form-cols`, `#hk-card`, `#orderDate-moved`) |
| Trang đơn M3 + nút M4 / M5 + cảnh báo lúc xác nhận | `web/order.ts`, `web/sheet-dua-don.ts` (mới), `web/sheet-hanh-khach.ts` (mới) |
| CSS (token mới ở nhóm "Riêng", khối có chú thích "đưa đón / hành khách — trang đơn") | `public/app.css` |
| Hướng dẫn Bán hàng theo nút mới (bài `huong-dan.test.ts` đòi tên nút còn trong mã) | `src/shared/huong-dan-ban-hang.ts` |
| Kịch bản Chrome mới (12 bước, 390 + 1040, axe) + ảnh | `docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/dua-don-smoke.mjs`, `anh/` |
| E2E đầu-cuối tiêu chí 5 | `tests/e2e/dua-don-dau-cuoi.mjs`, `tests/e2e/run.mjs` |
| Sửa kịch bản cũ theo giao diện mới | `a2-smoke-form/order/sheet.mjs`, `dat-gap-smoke.mjs`, `doi-tac-lap-don-smoke.mjs`, `v1-xac-nhan-png.mjs` |
| Sửa nhỏ trong tệp của Người 2 (cùng luật, không đổi nghĩa) | `src/shared/dieu-phoi-kiem.ts`: `lyDoNoiTra` / `lyDoThieuTen` nhận `Pick<ChangVao,…>`; tách `soTenThieu` (lyDoThieuTen gọi nó) |

## Ruling / quyết định bề mặt của người thi công (chủ bác được)

- **R1 — Form đơn KHÔNG có nút "Xác nhận đơn"** (app thật chỉ có "Lưu, chờ xác nhận"; 07 / form-don vẽ hai nút). Không thêm (đổi luồng). Cảnh báo lúc xác nhận chỉ ở trang đơn: dòng cát dưới nút "Xác nhận đơn" (trước), câu thêm vào hộp hỏi `confirm()`, và dải vàng "Đã xác nhận đơn." liệt kê câu cảnh báo (sau). Chữ "Đã xác nhận đơn." là chữ MỚI (không có trong danh sách câu chữ).
- **R2 — Vị trí khối Hành khách:** máy tính (≥ 960px) trải ngang SAU lưới 2 cột (như bản vẽ M2); vì form thật còn khối Thanh toán + Thông tin khách hàng ở cột chính, khối nằm dưới cả hai. Phải bọc lưới trong `.form-cols` (dưới 960px `display: contents`) để cột Tóm tắt dính không trượt đè khối (kịch bản đỏ lần đầu chỉ ra lỗi này). Điện thoại / iPad dọc: ngay sau thẻ "Dịch vụ" (JS dời nút, không dựng lại).
- **R3 — Mẫu số "N/M khách đã có tên"** = `soKhachDoan` (số khách dịch vụ đông nhất — cùng luật máy chủ R9); Tweaks "Số khách đi xe" TẮT (D2). Dải đầu trang giữ số cộng dồn như cũ.
- **R4 — Chiều về đi theo chiều đi cả khi chiều đi là "Gõ tự do…"**: chép luôn chữ (bản vẽ đặt ""); khớp `changMacDinh` (ADR-0054 D10.2 đã duyệt).
- **R5 — Cảnh báo thiếu tên ở trang đơn coi `requireManifest` là BẬT**: trang đơn không đọc được chính sách điều phối (route chỉ văn phòng). Chỉ là lời nhắc; xuất bến vẫn theo chính sách thật.
- **R6 — Không tải được `GET /passengers`**: trang đơn ẩn khối Hành khách và bỏ cảnh báo tên; form sửa nháp không dựng khối và KHÔNG gửi khoá `passengers` (máy chủ giữ danh sách — không bao giờ gửi `[]` khi chưa biết danh sách).
- **R7 — Bảng "Sửa đưa đón" (M4) không có lệnh gộp**: gửi lần lượt bỏ → sửa → thêm (mốc chặng / mốc đơn mới nhất). Hỏng giữa chừng: dừng, báo lỗi, khoá nút Lưu (phải "Tải lại đơn"); 409 `short_notice_required` → Quản trị / Toàn quyền duyệt đặt gấp trong bảng rồi gửi lại đúng lệnh đó và tiếp các lệnh còn lại.
- **R8 — "Số người chiều về"**: chỉ người có `order.trip.edit` mới thấy ô sửa và mới gửi khoá `paxOverride` (Đối tác / Thực tập gửi khoá này khác bản lưu → 403); người khác thấy ô chỉ xem "Cả đoàn / N người" + "Văn phòng điều chỉnh số người về".
- **R9 — Ô "Số hiệu chuyến bay"** hiện khi nơi đón / nơi trả là điểm loại AIRPORT, HOẶC chặng đã có số hiệu (không giấu dữ liệu đã lưu).
- **R10 — Lựa chọn ô nơi**: "<tên> · <loại viết thường>" (khuôn bản vẽ); điểm đã ngưng mà chặng đang trỏ vẫn hiện với nhãn đã lưu. Chữ tạm "(chưa ghi nơi đón)" (dữ liệu cũ) hiện như CHƯA CHỌN.
- **R11 — Trang đơn**: khối Đưa đón khi đơn không có chặng ghi "Không đưa đón" (chữ có trong danh sách); dòng nhắc "Cần giờ đón / nơi trả trước khi xếp xe" chỉ cho người có `order.trip.edit` (bản vẽ: văn phòng). Đơn nháp: "Sửa đưa đón" / "Sửa danh sách" là liên kết về form.
- **R12 — Lớp CSS `.dd-ghi` trùng với Người 2** (kiểu khác) → lớp của trang đơn đổi tên `.dd-ghi-tao`. `.dd-nhan` hai bên cùng giá trị — giữ.
- **R13 — Ô giờ**: ô giờ của máy + chữ mờ "Chưa chốt giờ" đặt chồng khi trống (bản vẽ); ở cột chính hẹp (~180px ô) chữ bị cắt "Chưa chốt g…".

## Lệch bản vẽ (ghi để chủ xem)

1. Form không có "Xác nhận đơn" / "Còn thu" / "Lưu đơn nháp" theo khuôn 07 — giữ "Lưu, chờ xác nhận" và Tóm tắt của app (R1).
2. Thẻ dịch vụ trên form giữ phần số khách / dòng tiền của app; khối Đưa đón đặt sau "Tổng dịch vụ", trước "Thông tin chuyến"; dải mốc 6 giờ cuối thẻ, mỗi chặng một khối "Chiều đi · Chặng N".
3. Danh sách hành khách ở trang đơn theo thứ tự máy chủ trả (không theo thứ tự nhập) — xem "Phát hiện máy chủ".
4. Không làm (theo kế hoạch): M7, cảnh báo lúc xếp (Người 2), "Số khách đi xe" (D2), D6 (thẻ danh sách đơn / biên nhận / điều phối).

## Phát hiện máy chủ (báo, không sửa)

- **PM-1**: `PUT /api/orders/:id` (nháp) kiểm thân (`validateOrder` — "chặng không thuộc dịch vụ này") TRƯỚC khoá lạc quan: khi phiên khác vừa bỏ chặng, form nhận 400 "…hãy tải lại trang rồi thử lại" thay vì 409 `stale`. Câu vẫn hướng dẫn đúng; ghi lại để điều phối cân nhắc.
- **PM-2**: `GET /passengers` trả người theo thứ tự không phải thứ tự nhập (lần chạy thấy "Khôi, Bình, An" sau khi nhập "An, Bình, Khôi").

## Số liệu kiểm thật (người thi công tự chạy — CHƯA có người kiểm độc lập)

- `npm run typecheck`: 0 lỗi.
- `npm test`: bước 1 **2460/2460**, bước 2 **1/1** (lần cuối, sau khi gộp nhánh Người 2).
- `npm run build:web`: xong, không lỗi.
- `npm run test:e2e -- pwa orders chang-hanh-khach dieu-phoi dua-don-dau-cuoi`: **6/6 kịch bản xanh** (gồm bước kiểm "không có day_loi"), 143 giây, 3 nhóm.
- Kịch bản Chrome (`AXE_JS=/private/tmp/axe-xe-don/package/axe.min.js`, `CHROME_BIN=…/chrome-wrap.sh`):
  - `dua-don-smoke.mjs` (mới): **12/12** (lần chạy đầu sau khi viết: 6/12 — 3 lỗi của chính kịch bản, 1 lỗi bố cục thật R2; sau sửa 12/12, chạy lại 3 lần xanh).
  - `a2-smoke-form.mjs` 25 ✓ OK; `a2-smoke-order.mjs` 11 ✓ OK; `a2-smoke-sheet.mjs` 14 ✓ OK; `dat-gap-smoke.mjs` 12/12 OK; `doi-tac-lap-don-smoke.mjs` 8/8 OK.
  - `v1-xac-nhan-png.mjs` 11 ✓ / 2 ✗ (b: "hai họ phông phải đã nạp", j: axe `meta-viewport`) — **đỏ y hệt trên commit gốc 34db1b5c** (đã chạy bản gốc ở `/tmp/base-dd`: cùng 2 ✗).
  - `v1-nguoi-phu-trach.mjs` 14 ✓ / 3 ✗ (h, j: axe `meta-viewport`; l: 403 `/api/dispatch/handlers` ở /orders) — **đỏ y hệt trên commit gốc** (bản gốc: cùng h, j, l). Một lần chạy riêng có thêm k ✗ do lệnh `wrangler d1 execute` lỗi (máy bận), chạy lại thì hết.
- Kịch bản Chrome của Người 2 chạy lại SAU KHI GỘP (đã sửa `dieu-phoi-kiem.ts`, `app.css`): `danh-muc-dua-don-smoke.mjs` 9/9, `canh-bao-xep-smoke.mjs` 2/2 (ảnh của họ giữ bản gốc).
- Chưa chạy: e2e đủ bộ; `trang-chu-smoke.mjs`, `chip-nhom-smoke.mjs` và các kịch bản khác không chạm.

## Đề xuất luật (không tự sửa — `web/CLAUDE.md` là tệp luật)

Thêm dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào":
`web/khoi-dua-don.ts`, `web/khoi-hanh-khach.ts`, `web/sheet-dua-don.ts`, `web/sheet-hanh-khach.ts`, phần Đưa đón / Hành khách của `web/order-form.ts`, `web/order.ts`, `web/service-card.ts`, `src/shared/chang-form.ts`, `src/shared/hanh-khach-form.ts`, `src/shared/canh-bao-xac-nhan.ts`, khối "đưa đón / hành khách — trang đơn" của `public/app.css` → `dua-don-smoke.mjs` ở `docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/` (12 bước, 1040 + 390, không cần mạng ngoài; Bán hàng → Kế toán → Đối tác) + ba `a2-smoke-*.mjs` + `dat-gap-smoke.mjs`.
