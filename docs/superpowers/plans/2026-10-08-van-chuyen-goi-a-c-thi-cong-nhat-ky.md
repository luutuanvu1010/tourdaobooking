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
- **G3 — C14:** route "thay chặng" xét mốc cho chặng MỚI trước khi ghi; bị chặn thì không đóng chặng cũ. Lệnh **bỏ chặng đứng riêng** không thêm luật mốc (ADR-0049 D2 không có; lời chủ về điều chỉnh khẩn cấp đi hướng nới, không siết).
- **G4 — C27:** không sửa mã (xem dưới). Gợi ý ngoài phạm vi: `PUT /api/van-chuyen/xe/:id` không báo khi đặt Bảo dưỡng cho xe còn chuyến sắp chạy — ghi nợ.
- **G5 — C38:** so cả suất / điểm (vượt tiêu chí "chuyến + loại") để bắt ca văn phòng; không thêm khoá phiên bản cho lệnh đổi thứ tự (đổi ADR-0049 dòng 108 cần ADR).
- **G6 — A1:** làm ADR-0097 + ADR-0096 Đ1 (LC-19), Đ2 (LC-20). Đ3 (LC-21) không có trong nhiệm vụ gốc và chủ chưa đọc chữ Đ3 → để sau, nhắc trong báo cáo Giai đoạn 2.

## Giai đoạn 1 — tiêu chí nghiệm thu và trạng thái

| Mã | Tiêu chí (hành vi kiểm được) | Trạng thái |
|---|---|---|
| C55 | Lần tải nền lỗi: 403/404 ẩn trang; mất mạng / 5xx giữ danh sách điểm, tên, số liên hệ, nút; dải "Mất mạng — dữ liệu lúc HH:MM" + "Tải lại"; không ghi xuống trình duyệt | **Xong** `f68cd3a3`. Bài thuần đỏ → xanh; Chrome bước 5b đỏ trên mã cũ, xanh sau sửa |
| C60 | `cuoc-smoke.mjs` xanh toàn bộ trên mã hiện tại | **Xong** `f68cd3a3` — "CUOC SMOKE OK (16 bước)"; log trước/sau ở `docs/evidence/2026-10-08-goi-c-giai-doan-1/log/` |
| N3 | Sửa chuyến đổi giờ / xe / tài xế → `rest_minutes_snapshot` = chính sách hiện hành; sửa khác giữ số cũ; `kiemXuatBen` không đổi | **Đã thi công** `8a9e8d73`. Kiểm độc lập: ĐẠT CÓ ĐIỀU KIỆN — **mốc chụp chưa có ADR** (Hiến chương 5.6 đòi ADR quy định mốc; đặc tả 2026-09-29 chưa duyệt, tự mâu thuẫn) → hỏi chủ ở lượt duyệt kế; nhánh "đổi xe / tài xế" chưa có bài giữ → đang bổ sung |
| C38 | `requestId` dùng lại cho lệnh khác (khác chuyến / loại / suất / điểm) → 409 `request_id_reused`, không ghi; lặp đúng lệnh vẫn 200 | **Đã thi công** `809918d5` (29 route + bài quét). Kiểm độc lập: ĐẠT CÓ ĐIỀU KIỆN — lệnh dời còn lọt "khác chuyến" (V1); danh sách loại sự kiện từng route và thuộc tính `suKien` chưa có bài giữ (V2); tài liệu mô tả chưa sửa (V4) → trợ lý đang sửa |
| C27 | Có khoảng trống người dùng gặp được thì cảnh báo không chặn; không có thì ghi "không cần sửa" | **Không cần sửa**: màn tạo/sửa tắt xe không `active`; xe đổi sang Bảo dưỡng sau khi có chuyến thì chi tiết và bảng điều phối hiện lý do giữ ngay (bài nháp của trợ lý, không commit) |
| C14 | Route "thay chặng" một `db.batch`: chặng mới dưới mốc → 409, chặng cũ còn mở; Quản trị + `datGap` qua; ba route cũ giữ nguyên; bảng "Sửa đưa đón" dùng route mới cho "Đổi sang chặng khác" | Đang thi công (trợ lý, worktree riêng) |

## Việc song song

- Soạn ba văn bản cho lượt duyệt kế: `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/` (tóm ADR-0063 phần số khách; ADR mới điều chỉnh khẩn cấp + đồng bộ chuyến; ADR mới nút Chỉ đường; trang ghép). Chưa có người kiểm độc lập.

## Nợ / để sau

- Cùng họ C38, ngoài 29 route (phiếu kiểm 8/10, THẤP): lệnh nhắm nhiều đối tượng (rút / xếp / thêm điểm / cập nhật) chỉ so chuyến + loại — rút suất 2 bằng mã của lần rút suất 1 trả 200 không làm gì; `mocByRequest` ("Đã gọi báo" / "Bỏ đánh dấu") không so chặng; `findRate(requestId)` của bảng giá xe thuê trả dòng cũ khi thân khác. Ghi BACKLOG khi đóng giai đoạn.
- Nhật ký sửa chuyến không ghi số nghỉ cũ → mới khi chụp lại (truy vết qua `policy_id` của sự kiện).

- Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md` (sau khi kiểm độc lập ĐẠT): bài quét cuối `src/modules/van-chuyen/ma-lenh-dung-lai.test.ts` — chặn route lệnh chuyến tự tra `eventByRequest` bỏ qua `traLenhLap`; quan sát chặn thật 2026-10-08 (người thi công báo; người kiểm xác nhận).
- `web/CLAUDE.md` bảng kịch bản ghi `cuoc-smoke.mjs` "11 bước" — nay 16 (số đếm lạc hậu từ trước).
- Đặc tả `docs/superpowers/specs/2026-09-29-*` tự mâu thuẫn về lúc chụp khoảng nghỉ (dòng 159 "lúc tạo" vs dòng 373 "tạo/sửa") — mã theo dòng 373.
- N3 còn ca: dời chuyến hàng xóm A sát B thì B không chụp lại → thuộc B4 (cần ADR).
- C38 chưa xét hai route `chang/:legId/da-goi-bao`, `bo-danh-dau-goi-bao` (tự xử lý `request_id` trên bảng mốc).
- e2e chưa chạy cho Giai đoạn 1 (cần mạng).
