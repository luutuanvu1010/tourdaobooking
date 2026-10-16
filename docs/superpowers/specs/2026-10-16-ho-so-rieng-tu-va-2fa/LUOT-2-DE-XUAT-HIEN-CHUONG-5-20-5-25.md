# Lượt 2 — đề xuất bộ điều luật dữ liệu cá nhân (Hiến chương 5.20–5.25)

> Hồ sơ có ngày (2026-10-16). Trạng thái: **đề xuất, chưa có hiệu lực**. Chủ dự án duyệt lượt 1 (ADR-G1, lớp hai bắt buộc cho tài khoản bên ngoài) ngày 2026-10-16; lượt này là lượt 2 trong `DE-XUAT-ADR.md`. Theo Hiến chương 6.4 và Hiến pháp N9, chỉ chủ dự án sửa `docs/ARCHITECTURE.md` Phần I; AI không tự chép. Nguồn nội dung: `SUY-RA.md` §3 (nguyên văn sáu điều ở đó, không đổi chữ).

## 1. Quyết định cần chủ

Một quyết định: **"bộ điều luật dữ liệu cá nhân"**. Không chạm trực tiếp dữ liệu hay quyền (chỉ là luật), nên không cần trang ghép. Ba điểm chủ chốt khi duyệt:

1. **Duyệt cả bộ sáu điều, hay tách?** Khuyến nghị: duyệt cả bộ, vì ba điều sau (5.23–5.25) dựa vào ba điều đầu (5.20–5.22).
2. **Điều 5.24 nới điều 5.5** (5.5 là luật "dòng đã khoá không bị ghi đè nội dung"). 5.24 mở đúng một ngoại lệ có tên: khi chủ thể yêu cầu xoá thì nội dung cá nhân được thay bằng dấu ẩn danh, bằng một lệnh duy nhất, một chiều. Khuyến nghị: duyệt, vì không có ngoại lệ này thì luật bảo vệ dữ liệu cá nhân (quyền yêu cầu xoá) không thực hiện được mà vẫn giữ sổ tiền. Nếu chủ không duyệt 5.24 thì ADR-H4 (lượt 4) phải ghi "lệch có chủ ý: điều 5.5".
3. **Đưa cả bộ lên kho luật gốc** (`Master-Project-Framework`) hay chỉ giữ ở Tour Đảo? Khuyến nghị: giữ ở Tour Đảo trước, đưa lên kho gốc sau khi dùng thật một đợt (Gói 2), vì còn chờ luật sư xác nhận thời hạn xoá.

## 2. Chỗ chèn và nguyên văn

Chèn vào `docs/ARCHITECTURE.md` Phần I, **ngay sau điều 5.17**, trước tiêu đề "Điều 6". Nguyên văn sáu điều là đoạn trích dẫn ở `SUY-RA.md` dòng 63–73 (từ "**5.20 Phân loại dữ liệu cá nhân.**" đến hết "**5.25 Lưu giữ.**"). Người chép dùng đúng đoạn đó, không viết lại.

Thêm vào dòng "Trạng thái" đầu tệp (điều 6.4): `5.20–5.25 (2026-MM-DD, chủ duyệt "bộ điều luật dữ liệu cá nhân": lý do — Gói 2 hồ sơ riêng tư thu giấy tờ định danh, cần luật phân loại, đồng ý, xoá và lưu giữ trước khi viết mã; 5.24 nới 5.5 có tên)`.

## 3. Cưỡng chế (bảng thi hành) — nói thẳng điều chưa có

Theo P16, một điều chỉ được coi là cưỡng chế khi đã quan sát nó chặn thật. Bản đề xuất ghi cho từng điều:

| Điều | Cơ chế đề xuất | Hiện trạng khi duyệt |
|---|---|---|
| 5.20 | Bài kiểm: cột chứa dữ liệu người mà chưa có hạng N0–N4 trong sổ dữ liệu thì đỏ; bài nhật ký không chứa trường N3/N4 | **Dựa vào kỷ luật** cho tới khi lát H-0 (kiểm kê hạng) dựng bài; ghi vào `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn |
| 5.21 | Chặn gửi phiếu tự khai khi chưa đồng ý phiên bản hiện hành (máy chủ) | Dựa vào kỷ luật tới lát H-3 |
| 5.22 | Bài kiểm đường tải xuống: nhật ký trước, `no-store`, không đường dẫn công khai | Dựa vào kỷ luật tới lát H-2 |
| 5.23 | Điều kiện nằm trong câu ghi chấp nhận (người xác minh ≠ người khai) | Dựa vào kỷ luật tới lát H-4 |
| 5.24 | Chỉ MỘT lệnh có tên được ghi đè; bài kiểm quét các đường ghi khác | Dựa vào kỷ luật tới lát H-5; **xây trên lỗ đang hở HC-5.19** (chưa diễn tập khôi phục) |
| 5.25 | Danh sách xoá ngay hiện được; không có Cron tự ghi (5.11) | Dựa vào kỷ luật tới lát H-5 |

Hệ quả: duyệt lượt này **không** làm hệ thống an toàn hơn ngay; nó đặt luật để các lát thi công sau có chuẩn mà xây và có bài kiểm phải đỏ-rồi-xanh.

## 4. Điều chưa chắc (nói rõ, không chặn lượt này)

- Số ngày xử lý yêu cầu xoá (đang ghi "không quá 30 ngày" theo lời chủ) chờ luật sư đọc bản gốc Nghị định 356/2025; điều 5.24 và 5.25 **không** chứa con số, nên lượt này không phải chờ.
- Danh sách phần pháp luật bắt giữ (sổ tiền, chứng từ, yêu cầu hoá đơn) chưa kế toán/luật sư xác nhận; nằm ở ADR-H4 (lượt 4), không ở lượt này.

## 5. Sau khi chủ duyệt

AI làm tiếp lượt 3 (ADR-H1 hồ sơ mở rộng và giấy tờ tổ chức, ADR-H2 kho tệp R2). Việc chép 5.20–5.25 vào Hiến chương do chủ hoặc phiên được chủ giao riêng làm bằng công cụ sửa tệp (tệp luật bị chặn sửa bằng dòng lệnh), và chạy `npm test` vì có bài đọc Hiến chương.
