# Thử Face ID trên iPhone (lát 0) — việc của chủ dự án

Cần: máy Mac này, iPhone thật đã bật Face ID, hai cửa sổ Terminal. Mất khoảng 10 phút. Không đụng tới app thật.
Lưu ý: bước 2 mở một địa chỉ web công khai TẠM THỜI trỏ vào máy Mac (chỉ phục vụ trang thử này); tắt bằng Ctrl+C là mất.

1. Cửa sổ Terminal thứ nhất, đứng ở thư mục repo `tourdao-sales`:
   ```
   node docs/evidence/2026-09-23-passkey/thu-iphone/server.mjs
   ```
2. Cửa sổ Terminal thứ hai:
   ```
   cloudflared tunnel --url http://localhost:8799
   ```
   Chép địa chỉ dạng `https://….trycloudflare.com` nó in ra. GIỮ NGUYÊN hai cửa sổ tới hết bước 6 (tắt đi là passkey vừa tạo vô dụng).
3. Trên iPhone, mở địa chỉ đó bằng Safari. Bấm lần lượt nút 1, 2, 3, 4 (mỗi lần iPhone hỏi Face ID thì đồng ý). Bấm nút 6.
4. Trong Safari: nút Chia sẻ → "Thêm vào MH chính" → mở biểu tượng "Thử Face ID" vừa thêm (dòng trên cùng phải ghi "CỬA SỔ APP CÀI").
5. Trong cửa sổ app cài: bấm nút 2 trước (dùng passkey đã tạo ở Safari), rồi 1, 2, 3, 4. Bấm nút 5: ghi lại bằng mắt — sau khi chuyển hướng, trang "Đã quay về" hiện TRONG cửa sổ app hay trong một khung Safari có nút "Xong"? Về lại trang thử, bấm nút 6.
6. Ctrl+C ở cả hai cửa sổ Terminal. Báo AI: "đã thử xong" kèm điều bạn thấy ở bước 5.
7. (Tuỳ chọn) Xoá passkey thử: Cài đặt → Mật khẩu → tìm "trycloudflare" → xoá.
