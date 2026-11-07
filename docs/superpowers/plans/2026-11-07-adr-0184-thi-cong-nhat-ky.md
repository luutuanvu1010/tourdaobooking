# Nhật ký thi công ADR-0184 — kế hoạch: docs/superpowers/plans/2026-11-07-adr-0184-thi-cong.md

Nhánh `claude/adr-0184-thi-cong`, tách từ `main` 5f641781 (đã có ADR-0184 và ADR-0180 «Xem như vai khác»). Trạng thái sống ở bảng việc của kế hoạch; tệp này ghi phán quyết, câu trả lời của chủ, mốc từng việc, nợ.

## Câu trả lời của chủ (chat 2026-11-07)

- «thi công ADR-0184».
- Ba câu hỏi chữ giao diện, chủ chọn cả ba phương án khuyến nghị: nút «Cho chạy dù thiếu giấy tờ»; nhãn vàng «Xe thiếu <giấy> — đã cho chạy»; lý do «Giấy đang gia hạn / Xe thay thế khẩn cấp / Khác (gõ rõ ít nhất 10 chữ cái)».
- Ba câu hỏi hành vi người dùng thấy (hỏi trước khi giao việc 3–5), chủ chọn cả ba phương án khuyến nghị: cho chạy **từng loại giấy** (P4); ghi chú «Khác» **chỉ lưu ở chuyến**, không vào nhật ký hệ thống (P5); **chưa cần** nút rút lại sự cho phép — ghi `docs/BACKLOG.md` ở việc 6.

## Phán quyết

P1–P8 ghi ở mục «Phán quyết của điều phối» của kế hoạch (một nơi). Cái giá nếu sai:
- P1 (bảng cho phép riêng thay giá trị `DAT_PHA_LE`): nếu chủ muốn đúng chữ ADR thì phải thêm một migration dựng lại bảng bản chụp — tốn, rủi ro trên CSDL thật; dữ liệu đã ghi theo P1 vẫn đọc được.
- P2 (ô `trip.override.giay_to_cung`): nếu chủ muốn dùng chung `trip.override` thì không thực hiện được lựa chọn D2 của chủ.
- P4 (cho phép từng loại): nếu chủ muốn «một lần cho tất cả» thì giao diện chỉ cần chọn sẵn mọi loại; máy chủ giữ nguyên.
- P5 (ghi chú không vào nhật ký): nếu chủ muốn thấy ghi chú trong nhật ký, thêm vào chi tiết nhật ký sau — chiều ngược lại (gỡ chữ đã ghi) không làm được.

## Mốc

- Việc 1 — xong `0bb96c3d` (≈ 10 phút). Migration 0147 đúng kế hoạch; 15 bài CSDL xanh; năm phép phá mỗi phép làm đúng một bài đỏ rồi hoàn nguyên (2026-11-07). Khác kế hoạch: `created_by` để NULL được (bài ADR-0003 cấm cột WHO NOT NULL), trigger dùng `NOT EXISTS` nên người ghi NULL không lọt — chấp nhận.
  - **Chờ chủ duyệt (gộp vào báo cáo cuối):** `src/architecture.test.ts` thêm cạnh `van-chuyen → staff` và view `v_stf_toan_quyen` vào danh sách view trigger Vận chuyển được đọc. Đây là nới hàng rào (Điều 9.4) dù đi đúng lối «đọc xuyên module qua view công bố». Không duyệt thì đổi sang: máy chủ chặn + R-VC-17 bắt sau (trigger không còn biết ai là Toàn quyền).

- Việc 2 — xong `699e9901` (≈ 9 phút). Chữ ký cuối: `docChung` đọc một lần mọi dòng cho phép chưa dùng của chuyến `PLANNED` (dòng hiếm), `choPhepCuaChuyen(chung, tripId)` lọc; `LichChungVao.choPhepThieu` bắt buộc. Mẫu vàng B23 (thiếu Bảo hiểm) và VC-12 (Kiểm định hết hạn) đổi kỳ vọng sang mã giữ `DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN` — đúng P3, người kiểm xem lại.
  - **P9 (điều phối, 7/11):** luật chuyển khách giữa hai xe (`src/shared/chuyen-khach.ts`, dòng kiểm `GIAY_TO_DICH`) KHÔNG nối dòng cho phép: chuyển khách sang xe thiếu giấy tờ vẫn bị chặn như cũ, kể cả xe đang chạy nhờ «Cho chạy dù thiếu giấy tờ». Lý do: ADR ghi hiệu lực «một chuyến, một lần xuất bến — không "xe này được miễn"»; nhận thêm khách là rủi ro mới. Hành vi người dùng không đổi so với hôm nay. Cái giá nếu sai: một lệnh nhỏ nối thêm sau.

## Nợ (không chặn phát hành)

- Chưa có nút «bỏ cho phép» trước giờ chạy.
- Đổi xe rồi đổi về xe cũ: dòng cho phép cũ áp lại (Trọng tâm 3).
- Rủi ro pháp lý Kiểm định / Bảo hiểm: ADR ghi «cần luật sư xác nhận»; chủ đã nghe và chọn D1=b.
