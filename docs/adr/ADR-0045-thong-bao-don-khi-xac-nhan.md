# ADR-0045 — Tin về đơn mới chỉ báo khi XÁC NHẬN đơn, không báo lúc lưu nháp (sửa ADR-0034 phần tin "lập đơn")

- **Trạng thái:** **accepted** — chủ dự án nói trong chat 2026-09-28 (sau khi thử bản 1.29: Cộng tác viên lập đơn, iPhone Quản trị hiện thông báo ngay lúc lưu nháp): *"ngay khi lưu đơn nháp thì đã hiện thông báo, là chưa chuẩn. Phải sau khi bấm "Xác nhận đơn" thì mới hiện thông báo lên màn hình chứ"*. AI ghi lại, không tự quyết (tiền lệ ADR-0039). ADR-0034 đã duyệt nên không sửa nội dung; ADR này thay phần tin "lập đơn"/"chờ nhận" của ADR-0034.
- **Ngày:** 2026-09-28   **Loại:** cửa **hai chiều** (luật thuần, không migration).
- **Liên quan:** ADR-0034 (hộp thông báo = hình chiếu `audit_log`), ADR-0036/0039 (màn hình khoá đọc đúng hộp "Của tôi"), ADR-0022 (thông báo nổi Bảng tin).

## Quyết định

1. **Lưu nháp (`created`) không vào ngăn "Của tôi" của ai** — không số đỏ, không gõ cửa màn hình khoá, không thông báo nổi trong app. Dòng lập đơn vẫn còn ở ngăn "Tất cả" cho người xem được mọi đơn (lịch sử).
2. **Xác nhận (`confirmed`) một đơn đang chưa có người phụ trách** = tin "chờ nhận": vào "Của tôi" của người nhận được đơn (`dispatch.claim`), câu *"<Tên> vừa xác nhận đơn <mã>, chưa có người phụ trách"*. Đơn đã có người phụ trách → tin "xác nhận" như cũ (chủ đơn, người phụ trách).
3. "Chưa có người phụ trách" xét theo **người phụ trách hiện tại** (không thêm cột/view): khi có người nhận, tin xác nhận rời "Của tôi" của những người nhận-được-đơn khác (thay vì hiện mờ như trước).
4. Một nguồn luật: `loaiTinDon`/`locHopThongBao` (`src/shared/thong-bao.ts`) — màn hình khoá (`nguoiNhanDay`) và câu hiện trên màn hình khoá (`GET /api/thong-bao/moi-nhat`) tự theo.

## Hệ quả

- Đơn nháp không ai xác nhận thì không ai được báo — đúng ý chủ: nháp chưa là việc của ai.
- Người được chọn phụ trách ngay lúc lập nháp cũng chỉ được báo khi đơn được xác nhận.
- Ngay sau khi triển khai: tin "chờ nhận" cũ sinh từ lúc lập nháp rời "Của tôi" (số đỏ có thể giảm) — không mất dữ liệu, vẫn ở "Tất cả".
