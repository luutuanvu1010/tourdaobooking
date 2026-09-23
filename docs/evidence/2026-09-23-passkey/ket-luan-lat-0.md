# Kết luận lát 0 (ADR-0016 điều 9): thử Face ID trên iPhone thật

Ngày thử: 2026-09-23 (chủ dự án tự chạy theo `thu-iphone/HUONG-DAN.md`). Dữ liệu gốc: `thu-iphone/ket-qua.jsonl` (2 dòng, chỉ User-Agent và cờ, không có SĐT hay khoá).

## Kết luận: **ĐI** cho passkey (Task 1–12)

## Máy thử

- iPhone chạy iOS 18.7.1.
- Lượt 1 chạy trong **Chrome cho iOS** (UA `CriOS/149`), không phải Safari như hướng dẫn. Trên iOS, Chrome dùng WebKit và Chuỗi khoá iCloud, nên kết quả vẫn dùng được.
- Lượt 2 chạy trong **cửa sổ app cài** (`standalone: true`, UA Safari `Version/18.7`).

## Kết quả đối chiếu tiêu chí

| Tiêu chí (kế hoạch, Task 0) | Kết quả | Đạt |
|---|---|---|
| Trong cửa sổ app cài, `create` với `uv: true` | Kiểu "lấy sẵn" ok, kiểu "chạm rồi xin" ok | Có |
| Trong cửa sổ app cài, `get` với `uv: true` | Kiểu "lấy sẵn" ok (2 lần), kiểu "chạm rồi xin" ok | Có |
| Passkey tạo ở trình duyệt dùng được trong cửa sổ app cài | Thao tác đầu tiên trong app (05:06:52Z) là `get` thành công. Lúc đó app chưa tạo passkey nào, nên khoá được dùng phải là khoá tạo ở tab trình duyệt (05:05Z). | Có |
| Tab trình duyệt: `create` và `get` | Cả 4 thao tác ok, `uv: true` | Có |

- Cả hai kiểu đều chạy, nên theo kế hoạch giữ nguyên thiết kế hai bước ở đặc tả §2.7, không đổi thiết kế.

## Số đo ghi thêm

- `userHandleBytes`: 16 ở mọi lần `get`, đúng như kỳ vọng.
- `signCount`: luôn 0 (passkey đồng bộ iCloud). Máy chủ không được coi 0 là dấu hiệu nhân bản khoá.
- `hasGetPublicKey`: có. `alg`: -7 (ES256).
- `attachment`: `platform`.
- `backupEligible` và `backedUp`: cả hai `true`, tức khoá được đồng bộ qua iCloud.

## Mô phỏng Google (chỉ ghi nhận cho lát 2, không chặn lát 1)

- **Chưa có kết quả.** Tệp không có dòng `bounce`: trang `/bounce/back` chưa từng được gọi. Chủ dự án không nhớ đã thấy gì ở bước 5.
- Có thể nút 5 chưa được bấm, hoặc chuyển hướng qua `httpbin.org` không quay về được. Chưa phân biệt được hai khả năng này.
- **Rủi ro cho lát 2:** chưa biết cửa sổ app cài có giữ cookie và quay về đúng cửa sổ sau khi chuyển sang tên miền khác hay không. Phải thử lại bước 5 trước khi lập kế hoạch lát 2 (đăng nhập Google).
