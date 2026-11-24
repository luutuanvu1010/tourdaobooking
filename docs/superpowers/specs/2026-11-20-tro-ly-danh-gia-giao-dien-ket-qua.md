# Báo cáo kết quả: trợ lý đánh giá giao diện

> Ngày 2026-11-20. Đặc tả: `2026-11-20-tro-ly-danh-gia-giao-dien.md` (cùng thư mục). Soạn theo `MAU-BAO-CAO-KET-QUA.md`. Chủ trả lời «phát hành» hoặc «sửa: …».

## 1. Kết quả
Kho có thêm trợ lý `nguoi-danh-gia-giao-dien`, không có công cụ sửa tệp. Giao nó một màn theo một bộ quyền, nó tự chụp màn hình thật ở khổ 390 và 1280, chạy 12 phép đo, chấm 10 tiêu chí về mạch lạc và logic, rồi báo từng phát hiện kèm tên ảnh, chỗ trên màn và mức nặng nhẹ. Người dùng Nền tảng không thấy gì khác: thay đổi nằm ở cách AI kiểm giao diện trước khi ảnh tới tay chủ.

## 2. Xem tận mắt
- Phiên làm việc đã gửi chủ hai ảnh và hai báo cáo mẫu của trợ lý (màn Chi tiết đơn và màn Đơn hàng hiện nay). Ảnh không vào kho.
- Tự chạy lệnh đo: `node scripts/giao-dien/do-man.mjs --o SALES:/order-form` (khoảng 40 giây), rồi mở thư mục tạm lệnh in ra.

## 3. Máy đã kiểm
| Ví dụ «xong khi» | Cách kiểm | Kết quả |
|---|---|---|
| 1. Lệnh đo ra ảnh, tóm tắt, mã thoát | Chạy thật bởi ba bên: trợ lý thi công, phiên điều phối, người kiểm độc lập | đạt |
| 2. Thiếu công cụ kiểm tương phản thì dừng, mã 2 | `AXE_JS` trỏ tệp không có ⇒ mã 2 trước khi dựng môi trường; `--khong-axe` ⇒ dòng đầu «ĐO THIẾU» | đạt |
| 3. Cấy lỗi thì «không đạt», gỡ thì «đạt» | T8: hai bên lặp lại. T4: trợ lý thi công. Hai phép phá bài kiểm của người kiểm độc lập đều đỏ rồi hoàn nguyên | đạt |
| 4. Bắt «tên khách hỏi hai lần» là S1, mức Nặng | Ví dụ ca-01 của bộ thử | đạt |
| 5. Màn không cấy: phát hiện Nặng phải chỉ được trên ảnh | Bốn màn, 0 phát hiện Nặng. Người kiểm độc lập đối chiếu ảnh hai màn | đạt |
| 6. Ngưỡng của bộ 20 ví dụ | Bắt 15/16 ví dụ có đáp án (ngưỡng 13). 0 báo nhầm mức Nặng trên màn không cấy (ngưỡng tối đa 2) | đạt |
| 7. Trợ lý không có công cụ sửa tệp | Dòng `tools` của tệp trợ lý; bài `src/claude-guard.test.ts` ép dòng đó (đã thấy đỏ khi thiếu tệp) | đạt |

- `npm test` đủ bộ: 9.992 bài, 0 đỏ, chạy ở lần lưu `e6885cd1a`. Sau lần chạy đó kho chỉ thêm tài liệu, hai tệp luật và hai điểm sửa nhỏ; đã chạy lại 16 bài có đọc các tệp ấy (546 ca, 0 đỏ) và `npm run typecheck` (0 lỗi).
- Người kiểm độc lập (chỉ đọc, soát lần lưu `04216629d` và bản nháp hai tệp luật): «Sẵn sàng trình chủ: có. Không có phát hiện mức nặng hay vừa», kèm bốn điểm nhỏ. Hai điểm đã sửa sau đó (số đo thiếu ra «chưa đo»; bài kiểm ép quyền công cụ). Hai điểm còn lại ghi ở mục 5.

## 4. Chưa kiểm
- Chưa gọi được trợ lý bằng đúng tên: ứng dụng chỉ nạp trợ lý lúc mở phiên và từ bản chính. Hai mươi mốt lượt thử dùng trợ lý đa dụng đọc bản nháp hướng dẫn; trong đó một lượt tự chạy lệnh đo rồi chấm, chạy được.
- Mỗi ví dụ mới chấm một lượt. Cùng một màn, hai lượt đã xếp một điểm ở hai mức khác nhau.
- Tiêu chí và hướng dẫn đã được sửa dựa trên chính bộ ví dụ này, nên 15/16 là con số lạc quan.
- Chủ dự án chưa đối chiếu phát hiện của trợ lý với mắt mình.
- Lệnh đo chỉ chụp màn ngay sau khi tải; dữ liệu thử chỉ có đơn hàng; chưa có iPhone thật.
- Trợ lý không phải cổng máy: phiên điều phối quên gọi thì không gì chặn.

## 5. Phát hành
- Không cần triển khai lên bản chạy thật, không có migration. Chỉ nhập bản chính.
- `package.json` và `package-lock.json` có thêm `axe-core`, nên lệnh nhập bản chính sẽ hỏi lý do.
- Việc nối: khi dây chuyền `giao-viec` vào bản chính, thêm một dòng ở chặng kiểm để gọi trợ lý này cho việc đổi giao diện.
- Nợ nhỏ còn lại: tệp đáp án của bộ ví dụ nằm trong kho (người chấm chỉ bị cấm đọc bằng lời); một lượt chấm đã xếp chữ xám nhạt trên nền trắng ở mức Nhỏ.
- Lỗi có thật trên màn hiện nay mà các lượt thử chỉ ra, chưa sửa trong việc này: Chi tiết đơn tô đỏ cả «Tổng cộng» lẫn «Còn lại» và lặp một số tiền nhiều lần; Đơn hàng viết tiền hai kiểu ở hai khổ («450k ₫» và «450.000 ₫»); số khách viết tắt «2NL 1TE».
