# Quyết định của chủ dự án sau QA1 lần 1 (2026-10-30, lần 2)

Hồ sơ có ngày. Nó tiếp nối `QUYET-DINH-CHU-2026-10-30.md` và trả lời hai điểm chặn số 2 và số 4 trong `QA1-LAN-1.md`. Chủ dự án chọn phương án được khuyến nghị cho cả hai.

5. **Chuyển cấp đại lý cho từng đối tác: soạn ADR, chủ duyệt rồi mới làm.** Máy chủ sẽ có một đường «Đổi» chạy trọn một lô: cấp riêng cũ kết thúc và cấp mới bắt đầu từ ngày được chọn, trong cùng một lô. Không dùng đường «Sửa» (đó là đường sửa sai của ADR-0148 Đ1), cũng không làm hai bước rời. Việc này thuộc loại B. Chưa viết mã trước khi chủ duyệt ADR.
6. **Chữ trong câu báo lỗi của máy chủ: đổi ở máy chủ.** Chỉ thay chữ («chính sách riêng» → «cấp riêng», «chính sách» → «cấp đại lý» đúng nghĩa) trong các câu báo lỗi và phần hướng dẫn. Không đổi cách tính tiền và không đổi quyền. Tiêu chí 9 được nới đúng cho các chuỗi chữ này.

Ghi thêm: quyết định 1 (giữ nghĩa «Tắt cấp») là lần đầu chủ dự án chốt N-23. Trước đó N-23 chỉ là giả định trong kế hoạch, chưa phải luật đã duyệt (QA1 điểm 6).
