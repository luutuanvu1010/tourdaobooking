---
name: dac-ta-ngan
description: Dùng khi chủ dự án giao một việc mới (tính năng, sửa hành vi, đổi giao diện) cho tourdao-sales và chưa có đặc tả đã duyệt — đọc mã trước, hỏi chủ một lần tối đa ba câu, rồi viết đặc tả ngắn một trang có ví dụ «xong khi» để chủ duyệt trước khi làm.
---

# Đặc tả ngắn trước khi làm

Lần duyệt thứ nhất trong vòng «mỗi việc chủ duyệt hai lần» (ADR-0211, đang đề xuất; đặc tả `docs/superpowers/specs/2026-11-15-kiem-toan-harness-va-cach-thi-cong-mot-nguoi.md` mục I.4).

1. **Đọc trước khi hỏi.** Đọc mã, đặc tả, ADR liên quan (Hiến chương `docs/ARCHITECTURE.md` Phần I cho câu hỏi thiết kế). Không hỏi điều tài liệu đã trả lời hoặc chủ đã chốt.
2. **Hỏi một lần, tối đa ba câu**, chỉ câu chủ thật sự phải quyết (tiền, quyền, dữ liệu, chữ người dùng thấy chưa có trong `docs/BANG-THAM-CHIEU.md`). Mỗi câu kèm khuyến nghị và lý do. Câu có khuyến nghị rõ thì tự áp và ghi ở mục «Điều AI tự quyết».
3. **Viết** theo `docs/superpowers/specs/MAU-DAC-TA-NGAN.md` vào `docs/superpowers/specs/<YYYY-MM-DD>-<tên-việc>.md`. Một trang. «Xong khi» là ví dụ bấm gì thấy gì; chạm tiền thì có con số.
4. **Trình chủ** bằng lời thường, kết luận trước. Chủ duyệt rồi mới làm. Sau khi làm: báo cáo theo `docs/superpowers/specs/MAU-BAO-CAO-KET-QUA.md`.
5. Việc khó quay lại (dữ liệu, quyền, tiền, hợp đồng, luật của AI) vẫn cần ADR riêng do chủ duyệt.
