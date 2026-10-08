# Nhật ký thi công — Vận chuyển & Bán hàng, Gói A và Gói C (mở 2026-10-08)

Sổ điều phối (CLAUDE.md §9, P19). Trạng thái sống ở đây, không trong trí nhớ phiên. Nguồn phát hiện: báo cáo `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md` (mã `Cxx`, `Nx`) và `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/du-lieu/verify.json`.

## Lời chủ (nguyên văn phần quyết định, chat 2026-10-08)

- **Nhiệm vụ gốc:** chủ dán một bản nhiệm vụ "Thi công và nâng cấp phân hệ ERP Vận chuyển & Bán hàng (Gói A & Gói C)". Bốn giai đoạn: (1) C55, C60, C14, C27, C38 + N3; (2) A1, A2, A3; (3) A4, A5; (4) C2, C3, C4. Kèm bốn nguyên tắc: sức chứa C+2 giữ nguyên (`passenger_capacity`, `soNguoiChang`); "Điều chỉnh khẩn cấp" thay "Xin phá lệ" (Điều phối viên + Quản trị, bắt buộc lý do, ghi nhật ký) và lệnh máy "Đồng bộ chuyến theo đơn"; mở lại Tài xế đối tác (ADR-0053) và Chuyển khách / Cứu hộ (ADR-0052); nút "Chỉ đường" + theo dõi vị trí.
- **Ba câu hỏi một lần (AskUserQuestion), chủ chọn cả ba phương án khuyến nghị:**
  1. A2 dựa trên ADR-0063 còn **proposed** → *"Gửi bản tóm để duyệt"*: soạn một trang phần sửa số khách; duyệt xong mới viết mã.
  2. "Điều phối viên" là ai → *"Bán hàng và Quản trị"*: soạn ADR mới (điều chỉnh khẩn cấp + đồng bộ chuyến theo đơn), chủ duyệt rồi làm.
  3. Bản đồ / GPS → *"Nút Chỉ đường trước"*: soạn ADR cho nút Chỉ đường; theo dõi vị trí để văn bản riêng sau.
- **Mở lại phân hệ:** nhiệm vụ gốc là lời chủ mở lại BL-VC-D6 (chỉ phần tài xế đối tác dùng Nền tảng + báo bận — ADR-0053 D7.1, D8, D9; phần chia doanh thu taxi vẫn hoãn) và BL-VC-D4 (ADR-0052 D4, D5c). Ghi vào `docs/BACKLOG.md` mục 22 khi bắt đầu Giai đoạn 3.

## Giả định tự áp (bề mặt hoặc đã có nguyên tắc — ghi lại, không hỏi)

- **G1 — Không có migration "Down".** D1 / wrangler không có bước lùi; luật dự án là chỉ thêm tệp, đổi phá vỡ theo expand–contract hai lần phát hành, hoàn tác bằng điểm khôi phục Time Travel (`docs/HANDOFF-N1.md`). Mỗi migration mới ghi rõ cách hoàn tác trong chú thích đầu tệp, không tạo tệp down.
- **G2 — C+2 và cảnh báo pháp lý** đã nói một lần trong báo cáo 7/10 (P18); chủ giữ nguyên → thi hành, không nhắc lại.
- **G3 — C14 (sửa 8/10 sau báo cáo thi công lần 1):** route "thay chặng" xét mốc theo giờ SỚM HƠN giữa chặng cũ và chặng mới, giống `PUT …/legs/:legId` — vì ADR-0049 D2 (dòng 161) chặn sửa giờ/nơi của chặng dưới mốc và thay chặng thực chất là sửa chặng đó; lời chủ cũng ghi "kiểm tra mốc khóa cho toàn bộ lệnh". Bị chặn thì không đóng chặng cũ. Lệnh **bỏ chặng đứng riêng** không thêm luật mốc (D2 không có; lời chủ về điều chỉnh khẩn cấp đi hướng nới). Lần 1 chỉ xét chặng mới (theo chỉ dẫn hẹp của người điều phối) → Bán hàng dời được chặng đang dưới mốc sang giờ trên mốc không cần duyệt; đã giao sửa.
- **G4 — C27:** không sửa mã (xem dưới). Gợi ý ngoài phạm vi: `PUT /api/van-chuyen/xe/:id` không báo khi đặt Bảo dưỡng cho xe còn chuyến sắp chạy — ghi nợ.
- **G5 — C38:** so cả suất / điểm (vượt tiêu chí "chuyến + loại") để bắt ca văn phòng; không thêm khoá phiên bản cho lệnh đổi thứ tự (đổi ADR-0049 dòng 108 cần ADR).
- **G6 — A1:** làm ADR-0097 + ADR-0096 Đ1 (LC-19), Đ2 (LC-20). Đ3 (LC-21) không có trong nhiệm vụ gốc và chủ chưa đọc chữ Đ3 → để sau, nhắc trong báo cáo Giai đoạn 2.

## Giai đoạn 1 — tiêu chí nghiệm thu và trạng thái

| Mã | Tiêu chí (hành vi kiểm được) | Trạng thái |
|---|---|---|
| C55 | Lần tải nền lỗi: 403/404 ẩn trang; mất mạng / 5xx giữ danh sách điểm, tên, số liên hệ, nút; dải "Mất mạng — dữ liệu lúc HH:MM" + "Tải lại"; không ghi xuống trình duyệt | **Xong** `f68cd3a3`. Bài thuần đỏ → xanh; Chrome bước 5b đỏ trên mã cũ, xanh sau sửa |
| C60 | `cuoc-smoke.mjs` xanh toàn bộ trên mã hiện tại | **Xong** `f68cd3a3` — "CUOC SMOKE OK (16 bước)"; log trước/sau ở `docs/evidence/2026-10-08-goi-c-giai-doan-1/log/`. Chạy lại cuối Giai đoạn 1 trên `711322ab` (sau `build:web`): "CUOC SMOKE OK (16 bước)" |
| N3 | Sửa chuyến đổi giờ / xe / tài xế → `rest_minutes_snapshot` = chính sách hiện hành; sửa khác giữ số cũ; `kiemXuatBen` không đổi | **Đã thi công** `8a9e8d73`. Kiểm độc lập vòng 1 ĐẠT CÓ ĐIỀU KIỆN, vòng 2 ĐẠT phần bài giữ (đổi xe, đổi tài xế; điều phối thêm bài "chỉ đổi giờ bắt đầu" `c8cb9248`). **Mốc chụp chưa có ADR** (Hiến chương 5.6) → hỏi chủ ở lượt duyệt kế |
| C38 | `requestId` dùng lại cho lệnh khác (khác chuyến / loại / suất / điểm) → 409 `request_id_reused`, không ghi; lặp đúng lệnh vẫn 200 | **Đã thi công** `809918d5` (29 route + bài quét). Vòng 2 (`2c3a727e`…`2bebb87f`): lệnh dời so cặp đích–nguồn, bài quét bảng 29 route, khoá `suKien`, tài liệu. Kiểm độc lập vòng 2: V1, V2b, V2c ĐẠT; V2a ĐẠT CÓ ĐIỀU KIỆN (dòng trả 409 chỉ giữ ở 8/29 route) → điều phối thêm kiểm cấu trúc `c8cb9248`, thấy đỏ khi xoá dòng ở route thu-tu. **Đạt.** Sổ hàng rào: 4 dòng mới |
| C27 | Có khoảng trống người dùng gặp được thì cảnh báo không chặn; không có thì ghi "không cần sửa" | **Không cần sửa**: màn tạo/sửa tắt xe không `active`; xe đổi sang Bảo dưỡng sau khi có chuyến thì chi tiết và bảng điều phối hiện lý do giữ ngay (bài nháp của trợ lý, không commit) |
| C14 | Route "thay chặng" một `db.batch`: chặng cũ hoặc mới dưới mốc → 409, chặng cũ còn mở; Quản trị + `datGap` qua; ba route cũ giữ nguyên; bảng "Sửa đưa đón" dùng route mới cho "Đổi sang chặng khác" / "Nhập nhầm" | **Đạt** sau kiểm độc lập (ĐẠT CÓ ĐIỀU KIỆN → đã đóng V1 sổ hàng rào, V2 bài ghi kép, V3 e2e khối (10), L2–L5). Gộp `6dc57a3f`…`c2dfc1ad`. e2e `chang-hanh-khach` xanh; Chrome `dua-don-smoke` 16/16 (bỏ dòng "Nhiều máy", dùng phiên của trang). Hở còn lại: `BL-VC-THAY-CHANG` (ba route cũ gọi rời; Quản trị đóng hộp duyệt giữa chừng; mốc null; đồng hồ máy khách). Chưa chạy các kịch bản Chrome gắn `web/order.ts` (`a2-smoke-*`, `dat-gap-smoke` đỏ sẵn từ 1.80 — `BL-VC-SMOKE-CU`; `v1-nguoi-phu-trach`) — `order.ts` chỉ thêm một tham số |

## Giai đoạn 2 — bắt đầu 8/10 (phần đã duyệt, không chờ câu trả lời)

- **Số migration giữ chỗ** (đo 8/10 trên mọi nhánh: lớn nhất `0083`): A1 = `0084` (+ `0085` nếu tách); A3 = `0086`. Đo lại trước khi gộp `main`.
- **A1** (ADR-0097 Đ1–Đ5; ADR-0096 Đ1 LC-19, Đ2 LC-20; nút ↑/↓ cho chuyến PLANNED — C30; HT-02, HT-16, C50, C58): trợ lý thi công, nhánh `a1-luat-loi-chuyen`. Theo lộ trình `2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §5 V3.1–V3.8; ADR thắng kế hoạch khi lệch.
- **A3** (ADR-0062 tin "đơn đổi" qua view `v_aud_order_change`; ADR-0052 D6.2 MQ-07 tin giờ hẹn đổi cho tài xế): trợ lý thi công, nhánh `a3-tin-don-doi`. Không làm đếm lượt đổi giờ (thuộc ADR-0063, chờ duyệt), không làm ma trận V5.
- **A2** chờ chủ duyệt bản tóm ADR-0063 (tệp 01 của lượt duyệt 8/10).

## Việc song song

- Lượt duyệt kế đã soạn: `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/`. Kiểm độc lập lần 1: tệp 02 KHÔNG ĐẠT (C1: nhánh "xe đang chạy" của đồng bộ chuyến vấp trigger `0076` — chỉ cho cờ báo huỷ sau sự kiện `ALLOCATION_OFFICE_CANCELLED`; C2: số 0103 trùng đề xuất VietQR ở nhánh `claude/ticket-sales-qr-payment-cf8e18`), tệp 00, 01, 03 ĐẠT CÓ ĐIỀU KIỆN. **Điều phối chốt:** bỏ nhánh xe đang chạy (máy chỉ báo tin, văn phòng bấm "Báo huỷ"); đổi số thành 0104 (điều chỉnh khẩn cấp + đồng bộ) và 0105 (Chỉ đường); cơ chế "cổng đơn đã thắng" chọn phương án (a) — van-chuyen kiểm qua view audit hẹp (khoá + nhãn); chia lượt **8a** = tệp 01 + 02 Đ1 + 02 Đ2 (3 quyết định), **8b** = Q-3 (Bán hàng tự xác nhận đơn sát giờ) + tệp 03 + mốc chụp khoảng nghỉ N3. Người soạn đang sửa.

## Nợ / để sau

- **Nhật ký thay đổi** (`src/shared/changelog.ts`, công thức j): thêm MỘT mục cho cả nhánh ngay trước khi đưa lệnh gộp cho chủ (mục đầu quyết số phiên bản) — chưa thêm vì nhánh còn đi tiếp Giai đoạn 2–4.
- Đề xuất cho chủ duyệt (tệp luật `web/CLAUDE.md`): bảng kịch bản Chrome thêm dòng `web/sheet-dua-don.ts`, `web/khoi-dua-don.ts` → `dua-don-smoke.mjs`; sửa số bước `cuoc-smoke.mjs` (11 → 16).

- Cùng họ C38, ngoài 29 route (phiếu kiểm 8/10, THẤP): lệnh nhắm nhiều đối tượng (rút / xếp / thêm điểm / cập nhật) chỉ so chuyến + loại — rút suất 2 bằng mã của lần rút suất 1 trả 200 không làm gì; `mocByRequest` ("Đã gọi báo" / "Bỏ đánh dấu") không so chặng; `findRate(requestId)` của bảng giá xe thuê trả dòng cũ khi thân khác. Ghi BACKLOG khi đóng giai đoạn.
- Nhật ký sửa chuyến không ghi số nghỉ cũ → mới khi chụp lại (truy vết qua `policy_id` của sự kiện).

- Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md` (sau khi kiểm độc lập ĐẠT): bài quét cuối `src/modules/van-chuyen/ma-lenh-dung-lai.test.ts` — chặn route lệnh chuyến tự tra `eventByRequest` bỏ qua `traLenhLap`; quan sát chặn thật 2026-10-08 (người thi công báo; người kiểm xác nhận).
- `web/CLAUDE.md` bảng kịch bản ghi `cuoc-smoke.mjs` "11 bước" — nay 16 (số đếm lạc hậu từ trước).
- Đặc tả `docs/superpowers/specs/2026-09-29-*` tự mâu thuẫn về lúc chụp khoảng nghỉ (dòng 159 "lúc tạo" vs dòng 373 "tạo/sửa") — mã theo dòng 373.
- N3 còn ca: dời chuyến hàng xóm A sát B thì B không chụp lại → thuộc B4 (cần ADR).
- C38 chưa xét hai route `chang/:legId/da-goi-bao`, `bo-danh-dau-goi-bao` (tự xử lý `request_id` trên bảng mốc).
- e2e Giai đoạn 1 trên nhánh đã gộp (`a4488bf9`): `npm run test:e2e -- dieu-phoi dieu-phoi-chay-dua tai-xe-cuoc xe-dang-chay tin-chuyen chong-ghi-trung van-chuyen cam-ket-xe dua-don-dau-cuoi chang-hanh-khach` → "E2E: 13/13 kịch bản xanh" (195 giây). Không có kịch bản e2e nào gọi route thay chặng (phủ bằng bài khung thử + Chrome `dua-don-smoke` bước 7b).
- e2e ĐẦY ĐỦ cuối Giai đoạn 1 trên `711322ab` (`npm run test:e2e`, không kèm tên): "E2E: 51/51 kịch bản xanh" (551 giây, 3 nhóm), gồm `audit-invariants` và bốn kiểm log cuối (không `day_loi`, H5 ghi nhiều lần, không lỗi lạ bảng vé, không lộ câu hỏi trợ lý).
